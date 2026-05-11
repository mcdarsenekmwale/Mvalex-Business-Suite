// app/api/user/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Types
interface UserUpdateData {
  name?: string;
  email?: string;
  theme?: string;
  language?: string;
  timezone?: string;
  avatarUrl?: string;
}

// Confirm if the user is the account holder
const confirmItsMyAccount = async (userId: string): Promise<boolean> => {
  try {
    const session = await auth();
    const accountId = session?.user?.id;
    
    if (!accountId) {
      return false;
    }
    
    return userId === accountId;
  } catch (error) {
    console.error("Error confirming account ownership:", error);
    return false;
  }
};

// GET /api/user/[id]
// Get user account details with role information
// Requires authentication
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validate ID
    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }
    
    // Verify ownership
    const isOwner = await confirmItsMyAccount(id);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Unauthorized: You can only access your own account" },
        { status: 401 }
      );
    }

    // Fetch user with role information
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        theme: true,
        creditsBalance: true,
        status: true,
        avatarUrl: true,
        language: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
        emailVerified: true,
        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                type: true,
                description: true,
              }
            }
          }
        },
        // Exclude sensitive fields like passwordHash
      }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    
    // Extract role information
    const roles = user.roles.map(ur => ({
      id: ur.role.id,
      name: ur.role.name,
      type: ur.role.type,
      description: ur.role.description,
    }));
    
    const primaryRole = roles.length > 0 ? roles[0] : null;
    const isAdmin = roles.some(r => r.type === "ADMIN" || r.type === "SUPER_ADMIN");
    const isSuperAdmin = roles.some(r => r.type === "SUPER_ADMIN");
    
    // Get additional stats
    const [businessCardsCount, invoicesCount, logosCount, exportsCount] = await Promise.all([
      prisma.businessCard.count({ where: { userId: id } }),
      prisma.invoice.count({ where: { userId: id } }),
      prisma.logo.count({ where: { userId: id } }),
      prisma.export.count({ where: { userId: id } }),
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        theme: user.theme,
        creditsBalance: user.creditsBalance,
        status: user.status,
        avatarUrl: user.avatarUrl,
        language: user.language,
        timezone: user.timezone,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        emailVerified: user.emailVerified,
        // Role information
        roles,
        primaryRole,
        isAdmin,
        isSuperAdmin,
        // Statistics
        stats: {
          businessCards: businessCardsCount,
          invoices: invoicesCount,
          logos: logosCount,
          exports: exportsCount,
        }
      }
    });
    
  } catch (error) {
    console.error("Error fetching user account:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// PATCH /api/user/[id]
// Update user account details
// Requires authentication
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validate ID
    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }
    
    // Verify ownership
    const isOwner = await confirmItsMyAccount(id);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Unauthorized: You can only update your own account" },
        { status: 401 }
      );
    }
    
    // Parse and validate request body
    const body = await req.json();
    
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: "At least one field is required for update" },
        { status: 400 }
      );
    }
    
    // Allowed fields for update
    const allowedFields = ['name', 'email', 'theme', 'language', 'timezone', 'avatarUrl'];
    const updateData: UserUpdateData = {};
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field as keyof UserUpdateData] = body[field];
      }
    }
    
    // If email is being updated, check if it's already taken
    if (updateData.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: updateData.email,
          NOT: { id }
        }
      });
      
      if (existingUser) {
        return NextResponse.json(
          { error: "Email already in use by another account" },
          { status: 409 }
        );
      }
    }
    
    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        theme: true,
        creditsBalance: true,
        status: true,
        avatarUrl: true,
        language: true,
        timezone: true,
        updatedAt: true,
      }
    });
    
    if (!updatedUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: "Profile updated successfully"
    });
    
  } catch (error) {
    console.error("Error updating user account:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// PUT /api/user/[id]
// Update user account details (alias for PATCH)
// Requires authentication
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Reuse the same logic as PATCH
  return PATCH(req, { params });
}

// DELETE /api/user/[id]
// Delete user account (self-deletion)
// Requires authentication
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validate ID
    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }
    
    // Verify ownership
    const isOwner = await confirmItsMyAccount(id);
    if (!isOwner) {
      return NextResponse.json(
        { error: "Unauthorized: You can only delete your own account" },
        { status: 401 }
      );
    }
    
    // Optional: Check if user has active subscriptions before deletion
    // Optional: Soft delete instead of hard delete
    const deletedUser = await prisma.user.delete({
      where: { id },
      select: {
        id: true,
        email: true,
      }
    });
    
    // Log the deletion for audit purposes
    console.log(`User ${deletedUser.email} (${deletedUser.id}) deleted their account`);
    
    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
      data: { id: deletedUser.id }
    });
    
  } catch (error) {
    console.error("Error deleting user account:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}