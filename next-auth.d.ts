// types/next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User extends DefaultUser {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    role: string;
    roleSubtype: string;
    creditsBalance: number;
    status?: "ACTIVE" | "SUSPENDED" | "PENDING";
    emailVerified?: Date | null;
    createdAt?: Date;
    mfaRequired?: boolean;
    mfaVerifiedAt?: number;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: string;
      roleSubtype: string;
      creditsBalance: number;
      status?: "ACTIVE" | "SUSPENDED" | "PENDING";
      permissions?: string[];
      mfaRequired?: boolean;
      mfaVerifiedAt?: number;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    email: string;
    name?: string | null;
    picture?: string | null;
    role: string;
    roleSubtype: string;
    creditsBalance: number;
    accessToken?: string;
    status?: "ACTIVE" | "SUSPENDED" | "PENDING";
    emailVerified?: Date | null;
    createdAt?: Date;
    lastRefreshed?: number;
    permissions?: string[];
    mfaRequired?: boolean;
    mfaVerifiedAt?: number;
  }
}