import { db } from "@/db";
import { auditEvents } from "@/db/schema";
import type { Role } from "@/lib/auth";

/** DOCUMENT_AND_REPORT_GENERATION_STANDARD.md's distribution rule: "every distribution ... writes an AuditEvent". */
export async function logDocumentExport(objectType: string, objectReference: string, actorRole: Role, detail: string) {
  await db.insert(auditEvents).values({
    eventType: "DOCUMENT_EXPORT",
    objectType,
    objectReference,
    actorRole,
    detail,
  });
}
