// components/admin/layout/AdminSidebar.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutWithLog } from "@/lib/activities/use-auth-activity";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Ticket,
  Settings as SettingsIcon,
  Shield,
  BarChart3,
  FileText,
  Coins,
  LogOut,
  X,
  Lock,
  Server,
  Activity,
  Menu,
  Bell,
  Database,
  Mail,
  Key,
  Headset,
  Globe,
  SquareActivityIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import NavItemRenderer, { NavItem } from "./NavItemRender";
import { PERMISSIONS, hasPermission, isAdmin, isSuperAdmin } from "@/lib/auth/permissions";

// Base admin navigation items with permission requirements
const adminNavItems: NavItem[] = [
  { 
    href: "/admin/dashboard", 
    label: "Dashboard", 
    icon: LayoutDashboard, 
    description: "Admin overview",
    requiredPermissions: [PERMISSIONS.ADMIN.VIEW_ADMIN_DASHBOARD]
  },
  { 
    href: "/admin/users", 
    label: "User Management", 
    icon: Users, 
    description: "Manage users", 
    badge: "CRUD",
    badgeColor: "bg-green-500/20 text-green-400",
    requiredPermissions: [PERMISSIONS.ADMIN.VIEW_USERS],
    children: [
      { 
        href: "/admin/users/all", 
        label: "All Users", 
        icon: Users, 
        description: "View all users",
        requiredPermissions: [PERMISSIONS.ADMIN.VIEW_USERS]
      },
      { 
        href: "/admin/users/roles", 
        label: "Role Assignment", 
        icon: Shield, 
        description: "Manage roles",
        requiredPermissions: [PERMISSIONS.ADMIN.MANAGE_USERS]
      },
      { 
        href: "/admin/users/permissions", 
        label: "Permissions", 
        icon: Key, 
        description: "Set permissions",
        requiredPermissions: [PERMISSIONS.SUPER_ADMIN.MANAGE_PERMISSIONS]
      },
      { 
        href: "/admin/users/activity", 
        label: "User Activity", 
        icon: Activity, 
        description: "Track activity",
        requiredPermissions: [PERMISSIONS.ADMIN.VIEW_LOGS]
      },
    ]
  },
  { 
    href: "/admin/tickets", 
    label: "Support Management", 
    icon: Globe, 
    description: "Handle tickets", 
    badgeColor: "bg-yellow-500/20 text-yellow-400",
    requiredPermissions: [PERMISSIONS.ADMIN.MANAGE_TICKETS],
    children: [
      { 
        href: "/admin/tickets", 
        label: "Tickets", 
        icon: Ticket, 
        description: "General tickets", 
        badge: "12",
        requiredPermissions: [PERMISSIONS.ADMIN.MANAGE_TICKETS]
      },
      { 
        href: "/admin/agents", 
        label: "Agents", 
        icon: Headset, 
        description: "Support agents",
        requiredPermissions: [PERMISSIONS.ADMIN.MANAGE_USERS]
      },
    ]
  },
  { 
    href: "/admin/templates", 
    label: "Templates", 
    icon: FileText, 
    description: "Manage templates",
    requiredPermissions: [PERMISSIONS.ADMIN.MANAGE_TEMPLATES]
  },
  { 
    href: "/admin/pricing", 
    label: "Pricing Rules", 
    icon: Coins, 
    description: "Credit costs",
    requiredPermissions: [PERMISSIONS.ADMIN.MANAGE_PRICING]
  },
  { 
    href: "/admin/analytics", 
    label: "Analytics", 
    icon: BarChart3, 
    description: "Platform stats",
    requiredPermissions: [PERMISSIONS.ADMIN.VIEW_ADMIN_ANALYTICS]
  },
  { 
    href: "/admin/notifications", 
    label: "Notifications", 
    icon: Bell, 
    description: "Send updates",
    requiredPermissions: [PERMISSIONS.ADMIN.SEND_NOTIFICATIONS]
  },
  { 
    href: "/admin/email-templates", 
    label: "Email Templates", 
    icon: Mail, 
    description: "Email settings",
    requiredPermissions: [PERMISSIONS.ADMIN.MANAGE_EMAIL_TEMPLATES]
  },
  { 
    href: "/admin/system", 
    label: "System Settings", 
    icon: SettingsIcon, 
    description: "Configure system",
    requiredPermissions: [PERMISSIONS.ADMIN.MANAGE_SYSTEM]
  },
];

// Super admin navigation items with permission requirements
const superAdminNavItems: NavItem[] = [
  { 
    href: "/admin/audit-logs", 
    label: "Audit Logs", 
    icon: Activity, 
    description: "View all actions",
    requiredPermissions: [PERMISSIONS.ADMIN.VIEW_AUDIT_LOGS],
    children: [
      {
        href: "/admin/audit-logs/all", 
        label: "All Logs", 
        icon: SquareActivityIcon, 
        description: "View all audit logs",
        requiredPermissions: [PERMISSIONS.SUPER_ADMIN.VIEW_AUDIT_LOGS]
      },
      { 
        href: "/admin/audit-logs/users", 
        label: "User Actions", 
        icon: Users, 
        description: "User activity",
        requiredPermissions: [PERMISSIONS.SUPER_ADMIN.VIEW_AUDIT_LOGS]
      },
      { 
        href: "/admin/audit-logs/system", 
        label: "System Actions", 
        icon: Server, 
        description: "System changes",
        requiredPermissions: [PERMISSIONS.SUPER_ADMIN.VIEW_AUDIT_LOGS]
      },
      { 
        href: "/admin/audit-logs/security", 
        label: "Security Events", 
        icon: Lock, 
        description: "Security logs",
        requiredPermissions: [PERMISSIONS.SUPER_ADMIN.VIEW_SECURITY_LOGS]
      },
    ]
  },
  { 
    href: "/admin/roles", 
    label: "Role Management", 
    icon: Shield, 
    description: "Manage roles",
    requiredPermissions: [PERMISSIONS.SUPER_ADMIN.MANAGE_ROLES],
    children: [
      { 
        href: "/admin/roles", 
        label: "Roles List", 
        icon: Shield, 
        description: "View all roles",
        requiredPermissions: [PERMISSIONS.SUPER_ADMIN.MANAGE_ROLES]
      },
      { 
        href: "/admin/roles/permissions", 
        label: "Permissions Matrix", 
        icon: Key, 
        description: "Permission mapping",
        requiredPermissions: [PERMISSIONS.SUPER_ADMIN.MANAGE_PERMISSIONS]
      },
      { 
        href: "/admin/roles/assignments", 
        label: "Assignments", 
        icon: Users, 
        description: "Role assignments",
        requiredPermissions: [PERMISSIONS.SUPER_ADMIN.MANAGE_ROLES]
      },
    ]
  },
  { 
    href: "/admin/backup", 
    label: "Backup", 
    icon: Database, 
    description: "Database backup",
    requiredPermissions: [PERMISSIONS.SUPER_ADMIN.MANAGE_BACKUPS]
  },
  { 
    href: "/admin/security", 
    label: "Security", 
    icon: Lock, 
    description: "Security settings",
    requiredPermissions: [PERMISSIONS.SUPER_ADMIN.VIEW_SECURITY_LOGS]
  },
  { 
    href: "/admin/monitoring", 
    label: "Monitoring", 
    icon: Server, 
    description: "System health",
    requiredPermissions: [PERMISSIONS.ADMIN.VIEW_MONITORING_DATA]
  },
];

/**
 * Filter navigation items based on user permissions
 */
function filterNavItemsByPermissions(
  items: NavItem[],
  userRole: string | null | undefined,
  userPermissions?: string[]
): NavItem[] {
  return items.filter(item => {
    // Check if user has required permissions for this item
    if (item.requiredPermissions && item.requiredPermissions.length > 0) {
      const hasRequiredPermissions = item.requiredPermissions.some(permission =>
        hasPermission(userRole as any, permission)
      );
      if (!hasRequiredPermissions) return false;
    }
    
    // Filter children recursively
    if (item.children && item.children.length > 0) {
      item.children = filterNavItemsByPermissions(item.children, userRole, userPermissions);
      // If children exist but all are filtered out, only show parent if it has no required permissions
      if (item.children.length === 0 && item.requiredPermissions?.length === 0) {
        return false;
      }
    }
    
    return true;
  });
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const userRole = session?.user?.role as string | null;
  const userPermissions = session?.user?.permissions as string[] | undefined;

  // Filter navigation items based on user role and permissions
  const visibleAdminItems = useMemo(() => {
    // Super admins see all admin items
    if (isAdmin(userRole as any)) {
      return adminNavItems;
    }
    // Regular admins see filtered items
    return filterNavItemsByPermissions(adminNavItems, userRole, userPermissions);
  }, [userRole, userPermissions]);

  const visibleSuperAdminItems = useMemo(() => {
    if (!isSuperAdmin(userRole as any)) return [];
    return filterNavItemsByPermissions(superAdminNavItems, userRole, userPermissions);
  }, [userRole, userPermissions]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    }
  }, [pathname, isMobile]);

  const getInitials = (name?: string | null) => {
    if (!name) return "A";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <TooltipProvider>
      {/* Mobile toggle */}
      {isMobile && (
        <Button
          variant="outline"
          size="icon"
          className="fixed top-4 left-4 z-50 bg-primary text-white hover:bg-primary/90"
          onClick={() => setIsOpen(true)}
          aria-label="Open admin menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Overlay */}
      {isOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-full w-80 bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 text-white shadow-xl flex flex-col transition-transform duration-300 ease-in-out",
          isMobile ? (isOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0"
        )}
      >
        {/* Close button for mobile */}
        {isMobile && (
          <button
            onClick={() => setIsOpen(false)}
            className="absolute right-4 top-4 p-2 rounded-lg hover:bg-white/10 transition-colors text-white z-50"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Logo Section */}
        <div className="p-6 border-b border-white/10">
          <Link href="/admin/dashboard" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl group-hover:blur-2xl transition-all" />
              <Shield className="relative h-8 w-8 text-primary" />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Admin Panel
              </span>
              <p className="text-xs text-white/60">Mvalex Business Suite</p>
            </div>
          </Link>
        </div>

        {/* Admin Profile Section */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-primary/30">
              <AvatarImage src={session?.user?.image || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary">
                {getInitials(session?.user?.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold truncate">
                  {session?.user?.name || "Admin"}
                </p>
                <span className={cn(
                  "text-[8px] px-2 py-0.5 rounded-md",
                  session?.user?.role === "SUPER_ADMIN" 
                    ? "bg-amber-500/20 text-amber-400" 
                    : "bg-primary/20 text-primary"
                )}>
                  {session?.user?.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
                </span>
              </div>
              <p className="text-xs text-white/60 truncate">
                {session?.user?.email}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Main Admin Section */}
          {visibleAdminItems.length > 0 && (
            <div className="space-y-1">
              <p className="px-3 text-xs font-semibold text-white/40 uppercase tracking-wider">
                Administration
              </p>
              {visibleAdminItems.map((item, index) => (
                <NavItemRenderer
                  key={item.href + index}
                  item={item}
                  pathname={pathname || ""}
                  isMobile={isMobile}
                  onClose={() => setIsOpen(false)}
                  level={0}
                />
              ))}
            </div>
          )}

          {/* Super Admin Section */}
          {visibleSuperAdminItems.length > 0 && (
            <div className="space-y-1">
              <p className="px-3 text-xs font-semibold text-white/40 uppercase tracking-wider">
                System Administration
              </p>
              {visibleSuperAdminItems.map((item, index) => (
                <NavItemRenderer
                  key={item.href + index}
                  item={item}
                  pathname={pathname || ""}
                  isMobile={isMobile}
                  onClose={() => setIsOpen(false)}
                  level={0}
                />
              ))}
            </div>
          )}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-white/10 space-y-2">
          {/* System Status */}
          <div className="p-3 rounded-lg bg-white/5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60">System Status</span>
              <Badge className="bg-green-500/20 text-green-400">
                <Activity className="h-3 w-3 mr-1" />
                Operational
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs mt-2">
              <span className="text-white/60">API Response</span>
              <span className="text-green-400">~45ms</span>
            </div>
          </div>
          
          {/* Sign Out */}
          <Button
            variant="ghost"
            className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => signOutWithLog("/")}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}