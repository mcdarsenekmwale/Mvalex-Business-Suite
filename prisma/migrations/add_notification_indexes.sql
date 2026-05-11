-- Migration: Add performance indexes for Notification & Agent Management System
-- Run with: psql $DATABASE_URL -f prisma/migrations/add_notification_indexes.sql
-- Or apply via Prisma: npx prisma migrate dev

-- Notification table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Notification_userId_createdAt_idx"
ON "Notification" ("userId", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Notification_type_status_idx"
ON "Notification" ("type", "status");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Notification_unread_idx"
ON "Notification" ("userId", "isRead") WHERE "isRead" = false;

-- AgentAvailability indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "AgentAvailability_status_load_idx"
ON "AgentAvailability" ("status", "currentLoad");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "AgentAvailability_lastActive_idx"
ON "AgentAvailability" ("lastActiveAt" DESC);

-- TicketAssignment indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "TicketAssignment_agentId_assignedAt_idx"
ON "TicketAssignment" ("agentId", "assignedAt" DESC);
