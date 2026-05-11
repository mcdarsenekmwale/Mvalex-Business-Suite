// lib/auth/permissions.ts
/**
 * Centralized permission system for Mvalex Business Suite
 * Supports hierarchical role-based access control
 */

// ============================================================================
// PERMISSION DEFINITIONS
// ============================================================================

export const PERMISSIONS = {
  // Viewer permissions (Read-only)
  VIEWER: {
    // Dashboard & Overview
    VIEW_DASHBOARD: "dashboard:view",
    VIEW_STATS: "stats:view",
    // Exports
    EXPORT_VIEW: "exports:view",
    VIEW_INVOICES: "invoices:view",

    VIEW_BUSINESS_CARDS: "business_cards:view",
    
  },
  // User permissions (Base level)
  USER: {
    // Dashboard & Overview
    VIEW_DASHBOARD: "dashboard:view",
    VIEW_STATS: "stats:view",
    
    // Business Cards
    CREATE_BUSINESS_CARD: "business_cards:create",
    EDIT_BUSINESS_CARD: "business_cards:edit",
    DELETE_BUSINESS_CARD: "business_cards:delete",
    VIEW_BUSINESS_CARDS: "business_cards:view",
    EXPORT_BUSINESS_CARD: "exports:view",
    
    // Invoices
    CREATE_INVOICE: "invoices:create",
    EDIT_INVOICE: "invoices:edit",
    DELETE_INVOICE: "invoices:delete",
    VIEW_INVOICES: "invoices:view",
    EXPORT_INVOICE: "exports:view",
    SEND_INVOICE: "invoices:send",
    
    // AI Logo Generation
    GENERATE_LOGO: "logos:generate",
    GENERATE_LOGO_VARIATIONS: "logos:generate:variations",
    VIEW_LOGOS: "logos:view",
    EXPORT_LOGO: "exports:view",
    
    // AI Assistant
    USE_AI_ASSISTANT: "ai_assistant:use",
    AI_DESIGN_SUGGESTIONS: "ai:design-suggestions",
    
    // Analytics
    VIEW_PERSONAL_ANALYTICS: "analytics:view:personal",
    
    // Support Tickets
    VIEW_SUPPORT: "support:view",
    CREATE_TICKET: "support:create:ticket",
    VIEW_MY_TICKETS: "support:view:my-tickets",
    RESPOND_TO_TICKET: "support:respond:ticket",
    
    // Account Management
    MANAGE_SETTINGS: "users:manage:settings",
    CHANGE_PASSWORD: "users:change:password",
    VIEW_PROFILE: "users:view:profile",
    EDIT_PROFILE: "users:edit:profile",
    VIEW_MY_PROFILE: "users:view:my-profile",
    EDIT_MY_PROFILE: "users:edit:my-profile",
    
    // Credits & Billing
    VIEW_CREDITS: "credits:view",
    PURCHASE_CREDITS: "credits:purchase",
    VIEW_CREDIT_HISTORY: "credits:view:history",
    
    // Exports
    EXPORT_ASSETS: "exports:view",
    VIEW_EXPORT_HISTORY: "exports:view:history",

    // Users
    VIEW_USERS: "users:view",
    CREATE_USER: "users:create",
    EDIT_USER: "users:edit",
    DELETE_USER: "users:delete",
  },

  // Support Agent permissions
  SUPPORT_AGENT: {
    // Ticket Management
    VIEW_ALL_TICKETS: "tickets:view:all",
    VIEW_ASSIGNED_TICKETS: "tickets:view:assigned",
    RESPOND_TO_ANY_TICKET: "tickets:respond",
    RESOLVE_TICKETS: "tickets:resolve",
    CLOSE_TICKETS: "tickets:close",
    ESCALATE_TICKETS: "tickets:escalate",
    REASSIGN_TICKETS: "tickets:reassign",
    
    // Customer Management
    VIEW_CUSTOMER_DETAILS: "customers:view",
    SEARCH_CUSTOMERS: "customers:search",
    
    // Ticket Analytics
    VIEW_TICKET_ANALYTICS: "analytics:view:tickets",
    VIEW_MY_PERFORMANCE: "analytics:view:performance",
    
    // Knowledge Base
    VIEW_KB_ARTICLES: "kb:view",
    SEARCH_KB_ARTICLES: "kb:search",
  },

  // Support Manager permissions
  SUPPORT_MANAGER: {
    // Team Management
    MANAGE_SUPPORT_TEAM: "team:manage",
    VIEW_AGENT_PERFORMANCE: "team:view:performance",
    ASSIGN_TICKETS_TO_AGENTS: "team:assign:tickets",
    
    // Ticket Management
    VIEW_ESCALATED_TICKETS: "tickets:view:escalted",
    MANAGE_ESCALATIONS: "tickets:manage:escalations",
    VIEW_TICKET_QUEUES: "tickets:view:queues",
    MANAGE_TICKET_PRIORITIES: "tickets:manage:priorities",
    
    // Analytics & Reports
    VIEW_SUPPORT_ANALYTICS: "analytics:view:support",
    EXPORT_SUPPORT_REPORTS: "exports:view:support",
    VIEW_SLA_REPORTS: "exports:view:sla",
    
    // Knowledge Base Management
    CREATE_KB_ARTICLES: "kb:create",
    EDIT_KB_ARTICLES: "kb:edit",
    DELETE_KB_ARTICLES: "kb:delete",
    
    // Templates & Macros
    CREATE_RESPONSE_TEMPLATES: "templates:create:responses",
    EDIT_RESPONSE_TEMPLATES: "templates:edit:responses",
    DELETE_RESPONSE_TEMPLATES: "templates:delete:responses",
  },

  // User Admin permissions
  USER_ADMIN: {
    // User Management
    VIEW_ALL_USERS: "users:view:all",
    CREATE_USER: "users:create",
    EDIT_USER: "users:edit",
    DELETE_USER: "users:delete",
    SUSPEND_USER: "users:suspend",
    ACTIVATE_USER: "users:activate",
    RESET_USER_PASSWORD: "users:reset:password",
    
    // Role Management
    ASSIGN_USER_ROLES: "users:assign:roles",
    VIEW_USER_ROLES: "users:view:roles",
    
    // Credit Management
    MANAGE_USER_CREDITS: "credits:manage",
    VIEW_USER_CREDITS: "credits:view:users",
    ADJUST_USER_CREDITS: "credits:adjust",
    
    // User Activity & Audit
    VIEW_USER_ACTIVITY: "audit:view:users",
    EXPORT_USER_DATA: "exports:view:users",
    VIEW_AUDIT_LOGS: "audit:view:logs",
    
    // User Assets
    VIEW_USER_ASSETS: "exports:view:assets",
    DELETE_USER_ASSETS: "exports:delete:assets",
  },

  // Audit Manager permissions
  AUDIT_MANAGER: {
    // Audit Logs
    VIEW_AUDIT_LOGS: "audit:view:logs",
    SEARCH_AUDIT_LOGS: "audit:search:logs",
    EXPORT_AUDIT_LOGS: "audit:export:logs",
    VIEW_AUDIT_REPORTS: "audit:view:reports",
    
    // Security Logs
    VIEW_SECURITY_LOGS: "audit:view:security",
    VIEW_LOGIN_LOGS: "audit:view:login",
    VIEW_API_LOGS: "audit:view:api",
    
    // Compliance Reports
    GENERATE_COMPLIANCE_REPORTS: "audit:generate:compliance",
    VIEW_COMPLIANCE_REPORTS: "audit:view:compliance",
    
    // Data Retention
    MANAGE_AUDIT_RETENTION: "audit:manage:retention",
    ARCHIVE_AUDIT_LOGS: "audit:archive:logs",
  },

  // Global Reader permissions
  GLOBAL_READER: {
    // Read-only access
    READ_ALL_USERS: "global:read:users",
    READ_ALL_TICKETS: "global:read:tickets",
    READ_ALL_TEMPLATES: "global:read:templates",
    READ_ALL_ANALYTICS: "global:read:analytics",
    READ_ALL_AUDIT_LOGS: "global:read:audit",
    READ_SYSTEM_SETTINGS: "global:read:settings",
    
    // View only
    VIEW_DASHBOARDS: "global:view:dashboards",
    VIEW_REPORTS: "global:view:reports",
  },

  // Admin permissions
  ADMIN: {
    // Dashboard
    VIEW_ADMIN_DASHBOARD: "dashboard:view:admin",
    VIEW_SYSTEM_HEALTH: "system:view:health",
    
    // User Management
    MANAGE_USERS: "admin:manage:users",
    VIEW_USERS: "admin:view:users",
    EDIT_USERS: "admin:edit:users",
    DELETE_USERS: "admin:delete:users",
    SUSPEND_USERS: "admin:suspend:users",
    
    // Ticket Management
    MANAGE_TICKETS: "admin:manage:tickets",
    RESOLVE_TICKETS: "admin:resolve:tickets",
    ASSIGN_TICKETS: "admin:assign:tickets",
    
    // Template Management
    MANAGE_TEMPLATES: "templates:manage",
    CREATE_TEMPLATES: "templates:create",
    EDIT_TEMPLATES: "templates:edit",
    DELETE_TEMPLATES: "templates:delete",
    
    // Pricing Management
    MANAGE_PRICING: "pricing:manage",
    VIEW_PRICING: "pricing:view",
    EDIT_PRICING_RULES: "pricing:edit",
    
    // Analytics
    VIEW_ADMIN_ANALYTICS: "analytics:view:admin",
    VIEW_REVENUE_ANALYTICS: "analytics:view:revenue",
    VIEW_USAGE_ANALYTICS: "analytics:view:usage",
    
    // System Management
    MANAGE_SYSTEM: "system:manage",
    VIEW_SYSTEM_SETTINGS: "system:view:settings",
    EDIT_SYSTEM_SETTINGS: "system:edit:settings",
    
    // Logs & Monitoring
    VIEW_SYSTEM_LOGS: "system:view:logs",
    VIEW_MONITORING_DATA: "monitoring:view",
    
    // Notifications
    SEND_NOTIFICATIONS: "notifications:send",
    MANAGE_NOTIFICATIONS: "notifications:manage",
    
    // Email Management
    MANAGE_EMAIL_TEMPLATES: "email:templates:manage",
    SEND_BULK_EMAILS: "email:send:bulk",
    
    // Content Management
    MANAGE_CONTENT: "admin:manage:content",
    PUBLISH_CONTENT: "admin:publish:content",

    // Security
    VIEW_LOGS: "logs:view",
    VIEW_SECURITY_LOGS: "security:view",
    VIEW_LOGIN_LOGS: "login:view",
    VIEW_API_LOGS: "api:view",
    VIEW_AUDIT_LOGS: "audit:view",
    VIEW_COMPLIANCE_REPORTS: "compliance:view",
  },

  // Super Admin permissions
  SUPER_ADMIN: {
    // Role & Permission Management
    MANAGE_ROLES: "roles:manage",
    MANAGE_PERMISSIONS: "permissions:manage",
    ASSIGN_ADMIN_ROLES: "roles:assign:admin",
    CREATE_CUSTOM_ROLES: "roles:create:custom",
    
    // System Administration
    MANAGE_BACKUPS: "backups:manage",
    SYSTEM_RESTORE: "system:restore",
    MANAGE_ADMINS: "admins:manage",
    MANAGE_SUPER_ADMINS: "admins:super:manage",
    VIEW_AUDIT_LOGS: "audit:view:all",
    
    // Security
    VIEW_SECURITY_LOGS: "security:view:all",
    MANAGE_FIREWALL: "firewall:manage",
    MANAGE_API_KEYS: "api:keys:manage",
    IMPERSONATE_USER: "user:impersonate",
    FORCE_PASSWORD_RESET: "user:force:reset",
    
    // Advanced Features
    MANAGE_SYSTEM_WIDE_SETTINGS: "system:wide:manage",
    VIEW_ALL_DATA: "data:view:all",
    EXPORT_ALL_DATA: "data:export:all",
    MANAGE_INTEGRATIONS: "integrations:manage",
    MANAGE_WEBHOOKS: "webhooks:manage",
    EXPORT_CREATE: "exports:create",
    
    // Maintenance
    PERFORM_SYSTEM_MAINTENANCE: "system:maintenance",
    CLEAR_CACHES: "system:cache:clear",
    RUN_DATABASE_MIGRATIONS: "database:migrate",
    
    // Compliance
    MANAGE_COMPLIANCE: "compliance:manage",
    VIEW_COMPLIANCE_REPORTS: "compliance:view:all",
    GENERATE_AUDIT_REPORTS: "audit:generate:reports",
  },
} as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type Permission = 
  | typeof PERMISSIONS.USER[keyof typeof PERMISSIONS.USER]
  | typeof PERMISSIONS.SUPPORT_AGENT[keyof typeof PERMISSIONS.SUPPORT_AGENT]
  | typeof PERMISSIONS.SUPPORT_MANAGER[keyof typeof PERMISSIONS.SUPPORT_MANAGER]
  | typeof PERMISSIONS.USER_ADMIN[keyof typeof PERMISSIONS.USER_ADMIN]
  | typeof PERMISSIONS.AUDIT_MANAGER[keyof typeof PERMISSIONS.AUDIT_MANAGER]
  | typeof PERMISSIONS.GLOBAL_READER[keyof typeof PERMISSIONS.GLOBAL_READER]
  | typeof PERMISSIONS.ADMIN[keyof typeof PERMISSIONS.ADMIN]
  | typeof PERMISSIONS.SUPER_ADMIN[keyof typeof PERMISSIONS.SUPER_ADMIN];

export type UserRole = 
  | "USER"
  | "SUPPORT_AGENT"
  | "SUPPORT_MANAGER"
  | "USER_ADMIN"
  | "AUDIT_MANAGER"
  | "GLOBAL_READER"
  | "ADMIN"
  | "SUPER_ADMIN"
  | "VIEWER" ;

// ============================================================================
// ROLE HIERARCHY & PERMISSION MAPS
// ============================================================================

/** Role hierarchy: higher index = higher privileges */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  USER: 0,
  VIEWER: 0, // Read-only, same level as USER
  GLOBAL_READER: 0, // Read-only, same level as USER
  SUPPORT_AGENT: 1,
  SUPPORT_MANAGER: 2,
  USER_ADMIN: 2,
  AUDIT_MANAGER: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,

};

/** Complete permission map for each role */
export const ROLE_PERMISSION_MAP: Record<UserRole, string[]> = {
  USER: Object.values(PERMISSIONS.USER),
  VIEWER: Object.values(PERMISSIONS.VIEWER),
  SUPPORT_AGENT: [
    ...Object.values(PERMISSIONS.USER),
    ...Object.values(PERMISSIONS.SUPPORT_AGENT),
  ],
  
  SUPPORT_MANAGER: [
    ...Object.values(PERMISSIONS.USER),
    ...Object.values(PERMISSIONS.SUPPORT_AGENT),
    ...Object.values(PERMISSIONS.SUPPORT_MANAGER),
  ],
  
  USER_ADMIN: [
    ...Object.values(PERMISSIONS.USER),
    ...Object.values(PERMISSIONS.USER_ADMIN),
  ],
  
  AUDIT_MANAGER: [
    ...Object.values(PERMISSIONS.USER),
    ...Object.values(PERMISSIONS.AUDIT_MANAGER),
  ],
  
  GLOBAL_READER: [
    ...Object.values(PERMISSIONS.GLOBAL_READER),
  ],
  
  ADMIN: [
    ...Object.values(PERMISSIONS.USER),
    ...Object.values(PERMISSIONS.SUPPORT_AGENT),
    ...Object.values(PERMISSIONS.SUPPORT_MANAGER),
    ...Object.values(PERMISSIONS.USER_ADMIN),
    ...Object.values(PERMISSIONS.AUDIT_MANAGER),
    ...Object.values(PERMISSIONS.ADMIN),
  ],
  
  SUPER_ADMIN: [
    ...Object.values(PERMISSIONS.USER),
    ...Object.values(PERMISSIONS.SUPPORT_AGENT),
    ...Object.values(PERMISSIONS.SUPPORT_MANAGER),
    ...Object.values(PERMISSIONS.USER_ADMIN),
    ...Object.values(PERMISSIONS.AUDIT_MANAGER),
    ...Object.values(PERMISSIONS.ADMIN),
    ...Object.values(PERMISSIONS.SUPER_ADMIN),
  ],
};

/** Flattened set of all permission strings for validation */
export const ALL_PERMISSIONS = new Set<string>(
  Object.values(ROLE_PERMISSION_MAP).flat()
);

// ============================================================================
// ROLE INHERITANCE & CHECK FUNCTIONS
// ============================================================================

/**
 * Check if a role has a specific permission
 * Supports role hierarchy (SUPER_ADMIN inherits all lower role permissions)
 */
export function hasPermission(userRole: UserRole | null | undefined, permission: string): boolean {
  if (!userRole) return false;
  const normalizedRole = userRole.toUpperCase() as UserRole;
  
  const permissions = ROLE_PERMISSION_MAP[normalizedRole];
  
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * Check if a role has any of the given permissions
 */
export function hasAnyPermission(
  userRole: UserRole | null | undefined,
  permissions: string[]
): boolean {
  if (!userRole) return false;
  return permissions.some((p) => hasPermission(userRole, p));
}

/**
 * Check if a role has all of the given permissions
 */
export function hasAllPermissions(
  userRole: UserRole | null | undefined,
  permissions: string[]
): boolean {
  if (!userRole) return false;
  return permissions.every((p) => hasPermission(userRole, p));
}

/**
 * Check if a user role meets a minimum role level
 */
export function requireRole(
  userRole: UserRole | null | undefined,
  minimumRole: UserRole
): boolean {
  if (!userRole) return false;
  const userLevel = ROLE_HIERARCHY[userRole] ?? -1;
  const minLevel = ROLE_HIERARCHY[minimumRole] ?? Infinity;
  return userLevel >= minLevel;
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): string[] {
  return ROLE_PERMISSION_MAP[role] ?? [];
}

/**
 * Get all available roles
 */
export function getAllRoles(): UserRole[] {
  return Object.keys(ROLE_HIERARCHY) as UserRole[];
}

/**
 * Get role hierarchy level
 */
export function getRoleLevel(role: UserRole): number {
  return ROLE_HIERARCHY[role] ?? -1;
}

// ============================================================================
// ROLE TYPE CHECK FUNCTIONS
// ============================================================================

/**
 * Check if user is an admin (ADMIN or SUPER_ADMIN)
 */
export function isAdmin(userRole: UserRole | null | undefined): boolean {
  return requireRole(userRole, "ADMIN");
}

/**
 * Check if user is a super admin
 */
export function isSuperAdmin(userRole: UserRole | null | undefined): boolean {
  return requireRole(userRole, "SUPER_ADMIN");
}

/**
 * Check if user is a support agent or higher
 */
export function isSupportStaff(userRole: UserRole | null | undefined): boolean {
  return requireRole(userRole, "SUPPORT_AGENT");
}

/**
 * Check if user is a support manager or higher
 */
export function isSupportManager(userRole: UserRole | null | undefined): boolean {
  return requireRole(userRole, "SUPPORT_MANAGER");
}

/**
 * Check if user is a user admin or higher
 */
export function isUserAdmin(userRole: UserRole | null | undefined): boolean {
  return requireRole(userRole, "USER_ADMIN");
}

/**
 * Check if user is an audit manager or higher
 */
export function isAuditManager(userRole: UserRole | null | undefined): boolean {
  return requireRole(userRole, "AUDIT_MANAGER");
}

/**
 * Check if user is a global reader (read-only)
 */
export function isGlobalReader(userRole: UserRole | null | undefined): boolean {
  return userRole === "GLOBAL_READER";
}

/**
 * Check if user can access the admin portal
 */
export function canAccessAdminPortal(userRole: UserRole | null | undefined): boolean {
  return requireRole(userRole, "ADMIN") || userRole === "SUPPORT_MANAGER" || userRole === "USER_ADMIN" || userRole === "AUDIT_MANAGER";
}

/**
 * Check if user can modify data (not a read-only role)
 */
export function canModifyData(userRole: UserRole | null | undefined): boolean {
  return !isGlobalReader(userRole) && !!userRole && userRole !== "GLOBAL_READER";
}

// ============================================================================
// REACT HOOK (for client components)
// ============================================================================

/**
 * React hook for using permissions in components
 * Usage: const { hasPermission, isAdmin } = usePermissions();
 */
export function createPermissionsHook(useSession: any) {
  return function usePermissions() {
    const { data: session } = useSession();
    const userRole = session?.user?.role as UserRole | null;
    const userRoleSubtype = session?.user?.roleSubtype as UserRole | null;

    
    return {
      userRole,
      hasPermission: (permission: string) => hasPermission(userRole, permission) || hasPermission(userRoleSubtype, permission),
      hasAnyPermission: (permissions: string[]) => hasAnyPermission(userRole, permissions) || hasAnyPermission(userRoleSubtype, permissions),
      hasAllPermissions: (permissions: string[]) => hasAllPermissions(userRole, permissions) || hasAllPermissions(userRoleSubtype, permissions),
      requireRole: (minimumRole: UserRole) => requireRole(userRole, minimumRole) || requireRole(userRoleSubtype, minimumRole),

      hasRole: (role: UserRole) => requireRole(userRole, role) || requireRole(userRoleSubtype, role),

      isAdmin: isAdmin(userRole),
      isSuperAdmin: isSuperAdmin(userRole),
      isSupportStaff: isSupportStaff(userRole),
      isSupportManager: isSupportManager(userRole),
      isUserAdmin: isUserAdmin(userRole),
      isAuditManager: isAuditManager(userRole),
      isGlobalReader: isGlobalReader(userRole),
      canModifyData: canModifyData(userRole),
      canAccessAdminPortal: canAccessAdminPortal(userRole),
    };
  };
}