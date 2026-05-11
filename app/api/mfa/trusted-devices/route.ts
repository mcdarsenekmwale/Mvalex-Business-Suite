import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MFAService } from "@/lib/mfa/mfa.service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const devices = await MFAService.listTrustedDevices(session.user.id);
    return NextResponse.json({ devices });
  } catch (error) {
    console.error("Error fetching trusted devices:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get("deviceId");

    if (deviceId) {
      await MFAService.removeTrustedDevice(session.user.id, deviceId);
    } else {
      // Remove all trusted devices
      const devices = await MFAService.listTrustedDevices(session.user.id);
      await Promise.all(
        devices.map((d) => MFAService.removeTrustedDevice(session.user.id, d.deviceId))
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing trusted device:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
