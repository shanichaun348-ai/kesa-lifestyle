import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { appAll, id, timestamps } from "./_common";
import { outboxStatusEnum } from "./enums";

/** Non-secret store configuration. Secrets stay in environment variables. */
export const settings = pgTable(
  "settings",
  {
    key: text("key").primaryKey(),
    value: jsonb("value").notNull(),
    updatedBy: uuid("updated_by"),
    updatedAt: timestamps.updatedAt,
  },
  () => [appAll()],
).enableRLS();

/** Transactional outbox (ADR-13). */
export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: id(),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull(),
    status: outboxStatusEnum("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    lastError: text("last_error"),
    createdAt: timestamps.createdAt,
    processedAt: timestamp("processed_at", { withTimezone: true, mode: "string" }),
  },
  (t) => [
    index("outbox_events_pending_idx")
      .on(t.nextAttemptAt)
      .where(sql`${t.status} = 'pending'`),
    appAll(),
  ],
).enableRLS();

/** Raw inbound webhooks for idempotency and forensics (all providers). */
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: id(),
    provider: text("provider").notNull(),
    providerEventId: text("provider_event_id").notNull(),
    signatureValid: boolean("signature_valid").notNull(),
    payload: jsonb("payload").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true, mode: "string" }),
    error: text("error"),
  },
  (t) => [uniqueIndex("webhook_events_provider_event_idx").on(t.provider, t.providerEventId), appAll()],
).enableRLS();

/** Every admin mutation, before/after (docs/11). Append-only. */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    actorId: uuid("actor_id"),
    actorRole: text("actor_role"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    ipHash: text("ip_hash"),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("audit_logs_entity_idx").on(t.entityType, t.entityId, t.createdAt), index("audit_logs_created_idx").on(t.createdAt), appAll()],
).enableRLS();
