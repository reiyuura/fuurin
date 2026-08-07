/**
 * AuditService — write-only audit log.
 *
 * Every successful mutation (create/update/delete) calls `log()` AFTER
 * the transaction commits. Failed transactions never produce audit rows.
 *
 * The service depends on Prisma directly for the AuditLog table — it's
 * a cross-cutting concern, not a domain repository.
 */

import type { PrismaClient, Prisma } from '@prisma/client'
import { safe } from '../repositories/queries/prisma-error'
import { ok, type Result } from '../shared/result'

export type AuditAction = 'create' | 'update' | 'delete'
export type AuditEntity = 'Album' | 'Photo' | 'Timeline' | 'Member'

export type AuditEntry = {
  actorId: string
  action: AuditAction
  entity: AuditEntity
  entityId: string
  metadata?: Record<string, unknown>
}

export class AuditService {
  constructor(private readonly prisma: PrismaClient) {}

  async log(entry: AuditEntry): Promise<Result<void>> {
    const r = await safe(async () =>
      this.prisma.auditLog.create({
        data: {
          actorId: entry.actorId,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId,
          metadata: entry.metadata as Prisma.InputJsonValue ?? undefined,
        },
      }),
    )
    if (!r.ok) {
      // Best-effort: don't fail the mutation if audit logging fails —
      // but NEVER fail silently. A missing audit trail must be visible
      // in the process logs (PM2 captures stderr).
      console.error('[audit] FAILED to write audit log entry:', {
        actorId: entry.actorId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        error: r.error.message,
      })
      return ok(undefined)
    }
    return ok(undefined)
  }

  /** Bare helper — callers that just need a one-liner. */
  static entry(
    actorId: string,
    action: AuditAction,
    entity: AuditEntity,
    entityId: string,
    metadata?: Record<string, unknown>,
  ): AuditEntry {
    return { actorId, action, entity, entityId, metadata }
  }
}