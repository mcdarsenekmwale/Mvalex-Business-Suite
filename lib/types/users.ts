export interface User {
  id: string;
  name: string | null;
  email: string;
  status: string;
  creditsBalance: number;
  roles: { id: string; type: string; name: string }[];
  _count: { businessCards: number; invoices: number; logos: number, exports: any };
  createdAt: string;
  lastLoginAt?: string;
  emailVerified?: string;
}

export interface Role {
  id: string;
  name: string;
  type: string;
  description: string;
  permissionCount: number;

}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string;
}

export const statusOptions = ["ALL", "ACTIVE", "SUSPENDED", "PENDING_VERIFICATION", "INACTIVE"];