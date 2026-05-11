// app/api/auth/session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ActivityLogger } from "@/lib/activities/activity-logger.service";
import { MFAService } from "@/lib/mfa/mfa.service";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";

// GET /api/auth/session - Get current session data
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No active session" }, { status: 401 });
    }

    // Get additional MFA status from database
    const mfaStatus = await MFAService.getMFAStatus(session.user.id);
    const requiresMFA = await MFAService.requiresMFA(session.user.id, session.user.role || "USER");
    
    // Get cookies for MFA verification
    const cookieStore = await cookies();
    const mfaVerifiedCookie = cookieStore.get(`mfa_verified_${session.user.id}`)?.value === "true";
    const deviceId = cookieStore.get("mfa_device_id")?.value;
    let deviceTrusted = false;
    
    if (deviceId) {
      deviceTrusted = await MFAService.isDeviceTrusted(session.user.id, deviceId);
    }
    
    const isVerified = mfaVerifiedCookie || deviceTrusted || (session.user as any).mfaVerifiedAt !== undefined;
    
    // Get user permissions
    const permissions = (session.user as any).permissions || [];
    
    return NextResponse.json({
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role: session.user.role,
        roleSubtype: (session.user as any).roleSubtype,
        creditsBalance: (session.user as any).creditsBalance,
        status: (session.user as any).status,
        mfaEnabled: mfaStatus.enabled,
        mfaRequired: requiresMFA,
        mfaVerified: isVerified,
        mfaVerifiedAt: (session.user as any).mfaVerifiedAt,
        permissions,
      },
      expires: session.expires,
    });
    
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/auth/session - Update session data (e.g., MFA verification)
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No active session" }, { status: 401 });
    }

    const body = await req.json();
    const { mfaVerified, mfaVerifiedAt, mfaSetupComplete, ...rest } = body;
    
    // Create response with updated session data
    const response = NextResponse.json({ 
      success: true,
      message: "Session updated successfully",
      updates: { mfaVerified, mfaVerifiedAt, mfaSetupComplete }
    });
    
    // If MFA verification is being set, update cookies
    if (mfaVerified === true) {
      response.cookies.set(`mfa_verified_${session.user.id}`, "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60, // 1 hour
      });
      
      // Log activity
      await ActivityLogger.log({
        userId: session.user.id,
        action: "MFA_VERIFIED",
        actionType: "UPDATE",
        entityType: "USER",
        description: "MFA verification completed",
        metadata: { verifiedAt: mfaVerifiedAt || Date.now() },
      });
    }
    
    // If MFA setup is complete, update MFA enabled status
    if (mfaSetupComplete === true) {
      response.cookies.set(`mfa_enabled_${session.user.id}`, "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      
      // Log activity
      await ActivityLogger.log({
        userId: session.user.id,
        action: "MFA_SETUP_COMPLETE",
        actionType: "CREATE",
        entityType: "USER",
        description: "MFA setup completed",
      });
    }
    
    return response;
    
  } catch (error) {
    console.error("Error updating session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/auth/session - Clear session (logout)
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    
    if (session?.user?.id) {
      // Clear MFA cookies
      const cookieStore = await cookies();
      const mfaVerifiedCookie = cookieStore.get(`mfa_verified_${session.user.id}`);
      
      const response = NextResponse.json({ success: true, message: "Logged out successfully" });
      
      if (mfaVerifiedCookie) {
        response.cookies.set(`mfa_verified_${session.user.id}`, "", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 0,
        });
      }
      
      // Clear device ID cookie
      const deviceId = cookieStore.get("mfa_device_id");
      if (deviceId) {
        response.cookies.set("mfa_device_id", "", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 0,
        });
        response.cookies.set(`mfa_device_trusted_${deviceId.value}`, "", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 0,
        });
      }
      
      // Log logout activity
      await ActivityLogger.log({
        userId: session.user.id,
        action: "LOGOUT",
        actionType: "LOGOUT",
        entityType: "USER",
        description: "User logged out",
      });
      
      return response;
    }
    
    return NextResponse.json({ success: true, message: "No active session" });
    
  } catch (error) {
    console.error("Error clearing session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}