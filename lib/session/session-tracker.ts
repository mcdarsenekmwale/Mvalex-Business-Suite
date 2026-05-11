import { UAParser } from "ua-parser-js";
import { SessionStore } from "./session-store";

export interface ParsedDeviceInfo {
  deviceType: "mobile" | "tablet" | "desktop" | "bot" | "unknown";
  browser: string;
  os: string;
}

export function parseDeviceInfo(userAgent: string): ParsedDeviceInfo {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  let deviceType: ParsedDeviceInfo["deviceType"] = "desktop";
  if (result.device.type === "mobile") deviceType = "mobile";
  else if (result.device.type === "tablet") deviceType = "tablet";
  else if (/bot|crawler|spider|curl|wget/i.test(userAgent)) deviceType = "bot";

  return {
    deviceType,
    browser: result.browser.name || "Unknown",
    os: result.os.name || "Unknown",
  };
}

export async function captureSessionMetadata(
  sessionToken: string,
  userId: string,
  request: {
    headers: {
      get(name: string): string | null;
    };
  }
): Promise<void> {
  const userAgent = request.headers.get("user-agent") || "";
  const ipAddress =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const deviceInfo = parseDeviceInfo(userAgent);

  await SessionStore.storeSessionMetadata(sessionToken, userId, {
    userAgent,
    ipAddress,
    deviceType: deviceInfo.deviceType,
    browser: deviceInfo.browser,
    os: deviceInfo.os,
    lastActivityAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active",
  });
}
