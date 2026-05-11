import { NextRequest, NextResponse } from 'next/server';
import { hasPermission, type UserRole } from './permissions';

/**
 * Basic server-side helper to enforce permission checks in API route handlers.
 *
 * Usage (example):
 * export default withPermission(async (req, res) => { ... }, 'admin:manage:users')
 */
export function withPermission(handler: (req: NextRequest) => Promise<NextResponse>, permission: string) {
  return async (req: NextRequest) => {
    // Expect authentication middleware to have set `req.headers.get('x-user-role')`
    const role = (req.headers.get('x-user-role') || '').toString() as UserRole;
    if (!role || !hasPermission(role, permission)) {
      return new NextResponse(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }
    return handler(req);
  };
}

/**
 * Use in non-Next handlers: checks a user object for permission.
 */
export function enforcePermission(user: { role?: string; permissions?: string[] } | null | undefined, permission: string): boolean {
  if (!user) return false;
  if (Array.isArray(user.permissions) && user.permissions.includes(permission)) return true;
  if (user.role) return hasPermission(user.role as UserRole, permission);
  return false;
}

export default { withPermission, enforcePermission };
