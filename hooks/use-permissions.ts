
// lib/hooks/use-permissions.ts
"use client";

import { useSession } from "next-auth/react";
import { createPermissionsHook } from "@/lib/auth/permissions";

export const usePermissions = createPermissionsHook(useSession);