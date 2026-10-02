// lib/auth.ts
import NextAuth, { NextAuthConfig, User as AuthUser } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { PrismaClient } from "@/generated/prisma/client";
import { ActivityLogger } from "@/lib/activities/activity-logger.service";
import { ROLE_PERMISSION_MAP, UserRole } from "@/lib/auth/permissions";

// User status enum type
type UserStatus = "ACTIVE" | "SUSPENDED" | "PENDING";

// Auth configuration
export const authOptions: NextAuthConfig = {
  adapter: PrismaAdapter(prisma as PrismaClient),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { roles: { include: { role: true } } },
        });

        if (!user) {
          throw new Error("User not found");
        }

        if (!user.passwordHash) {
          throw new Error("Please sign in with your social account");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isPasswordValid) {
          throw new Error("Invalid password");
        }

        // Check if user has a role assigned
        const userRole = user.roles && user.roles.length > 0 
          ? user.roles[0]?.role?.type || "USER"
          : "USER";
        const userRoleType = user.roles[0]?.role?.name || "USER";
        
        // Check user status
        const status = (user as any).status as UserStatus || "ACTIVE";
        
        if (status === "SUSPENDED") {
          throw new Error("Your account has been suspended. Please contact support.");
        }

        // Check MFA status (dynamic import to avoid client bundling)
        let mfaEnabled = false;
        let mfaRequired = false;
        try {
          const { MFAService } = await import("@/lib/mfa/mfa.service");
          mfaEnabled = await MFAService.isMFAEnabled(user.id);
          mfaRequired = await MFAService.requiresMFA(user.id, userRole);
        } catch {
          mfaEnabled = false;
          mfaRequired = false;
        }

        // Return user with MFA status
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
          roleSubtype: userRoleType,
          role: userRole,
          creditsBalance: (user as any).creditsBalance || 0,
          status: status,
          mfaRequired: mfaRequired && !mfaEnabled,
          mfaEnabled: mfaEnabled,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      // Handle session updates from client
      if (trigger === "update" && session) {
        if ((session as any).mfaVerified) {
          token.mfaVerifiedAt = Date.now();
        }
        if ((session as any).mfaSetupComplete) {
          token.mfaEnabled = true;
        }
        return { ...token, ...session };
      }

      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        token.role = user.role || "USER";
        token.roleSubtype = (user as any).roleSubtype || "USER";
        token.creditsBalance = (user as any).creditsBalance || 0;
        token.status = (user as any).status || "ACTIVE";
        token.mfaRequired = (user as any).mfaRequired || false;
        token.mfaEnabled = (user as any).mfaEnabled || false;
        
        // Set mfaVerifiedAt only if MFA is not required or already verified
        if (!token.mfaRequired) {
          token.mfaVerifiedAt = Date.now();
        }
        
        // Check MFA status for this user (dynamic import to avoid client bundling)
        try {
          const { MFAService } = await import("@/lib/mfa/mfa.service");
          const mfaEnabled = await MFAService.isMFAEnabled(user.id);
          token.mfaEnabled = mfaEnabled;
          
          // Check if MFA is required for this user's role
          const mfaRequired = await MFAService.requiresMFA(user.id, token.role as string);
          token.mfaRequired = mfaRequired;
          
          // If MFA is enabled but not verified, don't set verified timestamp
          if (mfaEnabled) {
            token.mfaVerifiedAt = undefined;
          } else {
            token.mfaVerifiedAt = Date.now();
          }
        } catch (error) {
          console.error("Failed to check MFA status:", error);
          token.mfaEnabled = false;
          token.mfaRequired = false;
          token.mfaVerifiedAt = Date.now();
        }
        
        // Attach role-based permissions
        try {
          token.permissions = ROLE_PERMISSION_MAP[(token.role as UserRole) || "USER"] || [];
        } catch {
          token.permissions = [];
        }
      }

      // Add access token for OAuth providers
      if (account) {
        token.accessToken = account.access_token;
      }

      // Refresh user data periodically
      if (token.id && (!token.lastRefreshed || Date.now() - token.lastRefreshed > 3600000)) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              creditsBalance: true,
              status: true,
              roles: { include: { role: true } },
            },
          });

          if (dbUser) {
            token.creditsBalance = (dbUser as any).creditsBalance ?? token.creditsBalance;
            token.role = dbUser.roles[0]?.role?.type || token.role;
            token.roleSubtype = dbUser.roles[0]?.role?.name || token.roleSubtype || token.role;
            token.status = (dbUser as any).status || token.status;
            
            // Refresh MFA status (dynamic import to avoid client bundling)
            try {
              const { MFAService } = await import("@/lib/mfa/mfa.service");
              const mfaEnabled = await MFAService.isMFAEnabled(token.id as string);
              token.mfaEnabled = mfaEnabled;
            } catch {
              token.mfaEnabled = false;
            }
          }
          token.lastRefreshed = Date.now();
        } catch (error) {
          console.error("Failed to refresh user data:", error);
        }
      }

      return token;
    },
    
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string | null;
        session.user.image = token.picture as string | null;
        session.user.roleSubtype = token.roleSubtype as string;
        session.user.role = token.role as string;
        session.user.creditsBalance = token.creditsBalance as number;
        session.user.status = token.status as "ACTIVE" | "SUSPENDED" | "PENDING" | undefined;
        
        (session.user as any).mfaEnabled = token.mfaEnabled as boolean | undefined;
        (session.user as any).mfaRequired = token.mfaRequired as boolean | undefined;
        (session.user as any).mfaVerifiedAt = token.mfaVerifiedAt as number | undefined;
        (session.user as any).permissions = token.permissions || ROLE_PERMISSION_MAP[(token.role as UserRole) || "USER"] || [];
      }
      return session;
    },
    
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: "/auth/login",
    newUser: "/auth/register",
    error: "/auth/error",
  },
  events: {
    async signIn({ user, account }) {
      if (user?.id) {
        // Log sign in activity
        await ActivityLogger.log({
          userId: user.id,
          action: "LOGIN",
          actionType: "LOGIN",
          entityType: "USER",
          description: `User logged in via ${account?.provider || "credentials"}`,
          metadata: { provider: account?.provider },
        });
      }
    },
    async signOut({token }: any) {
      if (token?.id) {
        await ActivityLogger.log({
          userId: token.id as string,
          action: "LOGOUT",
          actionType: "LOGOUT",
          entityType: "USER",
          description: "User logged out",
        });
      }
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" 
        ? "__Secure-next-auth.session-token" 
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

// Helper function to set MFA cookies after authentication
export async function setMFACookies(userId: string, response: Response) {
  try {
    const { MFAService } = await import("@/lib/mfa/mfa.service");
    const mfaRequired = await MFAService.requiresMFA(userId, "USER");
    const mfaEnabled = await MFAService.isMFAEnabled(userId);
    
    // Set cookies
    (response.headers as Headers).append(
      "Set-Cookie",
      `mfa_required_${userId}=${mfaRequired}; Path=/; HttpOnly; ${process.env.NODE_ENV === "production" ? "Secure; " : ""}SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`
    );
    (response.headers as Headers).append(
      "Set-Cookie",
      `mfa_enabled_${userId}=${mfaEnabled}; Path=/; HttpOnly; ${process.env.NODE_ENV === "production" ? "Secure; " : ""}SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`
    );
  } catch (error) {
    console.error("Failed to set MFA cookies:", error);
  }
}

// Helper function to clear MFA cookies
export async function clearMFACookies(userId: string, response: Response) {
  (response.headers as Headers).append(
    "Set-Cookie",
    `mfa_required_${userId}=; Path=/; HttpOnly; ${process.env.NODE_ENV === "production" ? "Secure; " : ""}SameSite=Lax; Max-Age=0`
  );
  (response.headers as Headers).append(
    "Set-Cookie",
    `mfa_enabled_${userId}=; Path=/; HttpOnly; ${process.env.NODE_ENV === "production" ? "Secure; " : ""}SameSite=Lax; Max-Age=0`
  );
  (response.headers as Headers).append(
    "Set-Cookie",
    `mfa_verified_${userId}=; Path=/; HttpOnly; ${process.env.NODE_ENV === "production" ? "Secure; " : ""}SameSite=Lax; Max-Age=0`
  );
}

// Create handlers for Next.js App Router
const { handlers, signIn, signOut, auth } = NextAuth(authOptions);

export { handlers, signIn, signOut, auth };