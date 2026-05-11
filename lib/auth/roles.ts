/**
 * Role definitions and helpers for Mvalex Business Suite
 */

export const ROLES = {
  USER: "USER",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;

export type RoleType = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<RoleType, string> = {
  USER: "User",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
};

export const ROLE_DESCRIPTIONS: Record<RoleType, string> = {
  USER: "Standard user with access to business tools",
  ADMIN: "Administrator with platform management access",
  SUPER_ADMIN: "Full system access including security and configuration",
};

export const ROLE_COLORS: Record<RoleType, string> = {
  USER: "bg-blue-500/10 text-blue-500",
  ADMIN: "bg-purple-500/10 text-purple-500",
  SUPER_ADMIN: "bg-amber-500/10 text-amber-500",
};

/**
 * Validate that a string is a valid role
 */
export function isValidRole(role: string): role is RoleType {
  return Object.values(ROLES).includes(role as RoleType);
}

/**
 * Get all available roles as options for forms
 */
export function getRoleOptions(): { value: RoleType; label: string; description: string }[] {
  return Object.values(ROLES).map((role: RoleType) => ({
    value: role,
    label: ROLE_LABELS[role],
    description: ROLE_DESCRIPTIONS[role],
  }));
}
