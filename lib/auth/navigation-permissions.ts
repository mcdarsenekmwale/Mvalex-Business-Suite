// lib/auth/navigation-permissions.ts
import { LayoutDashboard, CreditCard, FileText, Palette, HelpCircle, Settings, Ticket, Users, BarChart3, Coins, Shield, CheckCircle, Key, Database, LockIcon } from "lucide-react";
import { Activity } from "react";
import { UserRole, PERMISSIONS } from "./permissions";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  description?: string;
  requiredRole?: UserRole;
  requiredPermissions?: string[];
  children?: NavItem[];
  badge?: string;
}

export const navigationByRole: Record<UserRole, NavItem[]> = {
  VIEWER: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, requiredPermissions: [PERMISSIONS.VIEWER.VIEW_DASHBOARD] },
    { href: "/business-cards", label: "Business Cards", icon: CreditCard, requiredPermissions: [PERMISSIONS.VIEWER.VIEW_BUSINESS_CARDS] },
    { href: "/invoices", label: "Invoices", icon: FileText, requiredPermissions: [PERMISSIONS.VIEWER.VIEW_INVOICES] },
  ],
  USER: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, requiredPermissions: [PERMISSIONS.USER.VIEW_DASHBOARD] },
    { href: "/business-cards", label: "Business Cards", icon: CreditCard, requiredPermissions: [PERMISSIONS.USER.VIEW_BUSINESS_CARDS] },
    { href: "/invoices", label: "Invoices", icon: FileText, requiredPermissions: [PERMISSIONS.USER.VIEW_INVOICES] },
    { href: "/logos", label: "AI Logos", icon: Palette, requiredPermissions: [PERMISSIONS.USER.VIEW_LOGOS] },
    { href: "/support", label: "Support", icon: HelpCircle, requiredPermissions: [PERMISSIONS.USER.VIEW_SUPPORT] },
    { href: "/settings", label: "Settings", icon: Settings, requiredPermissions: [PERMISSIONS.USER.MANAGE_SETTINGS] },
  ],
  
  SUPPORT_AGENT: [
    { href: "/support/dashboard", label: "Support Dashboard", icon: LayoutDashboard },
    { href: "/support/tickets", label: "My Tickets", icon: Ticket, requiredPermissions: [PERMISSIONS.SUPPORT_AGENT.VIEW_ASSIGNED_TICKETS] },
    { href: "/support/all-tickets", label: "All Tickets", icon: Ticket, requiredPermissions: [PERMISSIONS.SUPPORT_AGENT.VIEW_ALL_TICKETS] },
    { href: "/support/knowledge-base", label: "Knowledge Base", icon: FileText, requiredPermissions: [PERMISSIONS.SUPPORT_AGENT.VIEW_KB_ARTICLES] },
  ],
  
  SUPPORT_MANAGER: [
    { href: "/support/dashboard", label: "Support Dashboard", icon: LayoutDashboard },
    { href: "/support/tickets", label: "Ticket Management", icon: Ticket },
    { href: "/support/team", label: "Team Management", icon: Users, requiredPermissions: [PERMISSIONS.SUPPORT_MANAGER.MANAGE_SUPPORT_TEAM] },
    { href: "/support/analytics", label: "Support Analytics", icon: BarChart3, requiredPermissions: [PERMISSIONS.SUPPORT_MANAGER.VIEW_SUPPORT_ANALYTICS] },
    { href: "/support/templates", label: "Response Templates", icon: FileText, requiredPermissions: [PERMISSIONS.SUPPORT_MANAGER.CREATE_RESPONSE_TEMPLATES] },
  ],
  
  USER_ADMIN: [
    { href: "/admin/users", label: "User Management", icon: Users, requiredPermissions: [PERMISSIONS.USER_ADMIN.VIEW_ALL_USERS] },
    { href: "/admin/users/activity", label: "User Activity", icon: Activity, requiredPermissions: [PERMISSIONS.USER_ADMIN.VIEW_USER_ACTIVITY] },
    { href: "/admin/audit", label: "Audit Logs", icon: FileText, requiredPermissions: [PERMISSIONS.USER_ADMIN.VIEW_AUDIT_LOGS] },
    { href: "/admin/credits", label: "Credit Management", icon: Coins, requiredPermissions: [PERMISSIONS.USER_ADMIN.MANAGE_USER_CREDITS] },
  ],
  
  AUDIT_MANAGER: [
    { href: "/admin/audit/logs", label: "Audit Logs", icon: FileText, requiredPermissions: [PERMISSIONS.AUDIT_MANAGER.VIEW_AUDIT_LOGS] },
    { href: "/admin/audit/security", label: "Security Logs", icon: Shield, requiredPermissions: [PERMISSIONS.AUDIT_MANAGER.VIEW_SECURITY_LOGS] },
    { href: "/admin/audit/compliance", label: "Compliance", icon: CheckCircle, requiredPermissions: [PERMISSIONS.AUDIT_MANAGER.VIEW_COMPLIANCE_REPORTS] },
  ],
  
  GLOBAL_READER: [
    { href: "/reader/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/reader/users", label: "Users", icon: Users, requiredPermissions: [PERMISSIONS.GLOBAL_READER.READ_ALL_USERS] },
    { href: "/reader/tickets", label: "Tickets", icon: Ticket, requiredPermissions: [PERMISSIONS.GLOBAL_READER.READ_ALL_TICKETS] },
    { href: "/reader/analytics", label: "Analytics", icon: BarChart3, requiredPermissions: [PERMISSIONS.GLOBAL_READER.READ_ALL_ANALYTICS] },
  ],
  
  ADMIN: [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, requiredPermissions: [PERMISSIONS.ADMIN.VIEW_ADMIN_DASHBOARD] },
    { href: "/admin/users", label: "User Management", icon: Users, requiredPermissions: [PERMISSIONS.ADMIN.VIEW_USERS] },
    { href: "/admin/tickets", label: "Support Tickets", icon: Ticket, requiredPermissions: [PERMISSIONS.ADMIN.MANAGE_TICKETS] },
    { href: "/admin/templates", label: "Templates", icon: FileText, requiredPermissions: [PERMISSIONS.ADMIN.MANAGE_TEMPLATES] },
    { href: "/admin/pricing", label: "Pricing", icon: Coins, requiredPermissions: [PERMISSIONS.ADMIN.MANAGE_PRICING] },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3, requiredPermissions: [PERMISSIONS.ADMIN.VIEW_ADMIN_ANALYTICS] },
    { href: "/admin/system", label: "System", icon: Settings, requiredPermissions: [PERMISSIONS.ADMIN.MANAGE_SYSTEM] },
  ],
  
  SUPER_ADMIN: [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/users", label: "User Management", icon: Users },
    { href: "/admin/roles", label: "Role Management", icon: Shield, requiredPermissions: [PERMISSIONS.SUPER_ADMIN.MANAGE_ROLES] },
    { href: "/admin/permissions", label: "Permissions", icon: Key, requiredPermissions: [PERMISSIONS.SUPER_ADMIN.MANAGE_PERMISSIONS] },
    { href: "/admin/audit", label: "Audit Logs", icon: FileText, requiredPermissions: [PERMISSIONS.SUPER_ADMIN.VIEW_AUDIT_LOGS] },
    { href: "/admin/backup", label: "Backup", icon: Database, requiredPermissions: [PERMISSIONS.SUPER_ADMIN.MANAGE_BACKUPS] },
    { href: "/admin/security", label: "Security", icon: LockIcon, requiredPermissions: [PERMISSIONS.SUPER_ADMIN.VIEW_SECURITY_LOGS] },
    { href: "/admin/monitoring", label: "Monitoring", icon: Activity, requiredPermissions: [PERMISSIONS.ADMIN.VIEW_MONITORING_DATA] },
    { href: "/admin/settings", label: "System Settings", icon: Settings, requiredPermissions: [PERMISSIONS.SUPER_ADMIN.MANAGE_SYSTEM_WIDE_SETTINGS] },
  ],
};

export function getNavigationForRole(role: UserRole): NavItem[] {
  return navigationByRole[role] || navigationByRole.USER;
}