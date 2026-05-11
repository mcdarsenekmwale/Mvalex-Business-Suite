/**
 * Admin input validation schemas using Zod
 */

import { z } from "zod";

export const userStatusSchema = z.enum([
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
  "PENDING_VERIFICATION",
]);

export const updateUserSchema = z.object({
  userId: z.string().min(1),
  status: userStatusSchema.optional(),
  role: z.enum(["USER", "ADMIN", "SUPER_ADMIN"]).optional(),
  credits: z.number().int().min(0).optional(),
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
});

export const bulkUserActionSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1),
  action: z.enum(["suspend", "activate", "delete", "add_credits"]),
  creditsAmount: z.number().int().min(1).optional(),
});

export const respondToTicketSchema = z.object({
  ticketId: z.string().min(1),
  message: z.string().min(1).max(5000),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
});

export const assignTicketSchema = z.object({
  ticketId: z.string().min(1),
  assignedTo: z.string().min(1),
});

export const updatePricingSchema = z.object({
  rules: z.array(
    z.object({
      action: z.string().min(1),
      cost: z.number().int().min(0),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
    })
  ),
});

export const createTemplateSchema = z.object({
  type: z.enum(["businessCard", "invoice", "email"]),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.string().optional(),
  config: z.record(z.any()).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const systemSettingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.any(),
  description: z.string().optional(),
});

export const userFilterSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  role: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sortBy: z.string().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const ticketFilterSchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  assignedTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  dateRange: z.string().optional(),
});
