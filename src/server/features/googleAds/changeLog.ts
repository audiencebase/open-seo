import { db } from "@/db";
import { gadsChangeLog } from "@/db/app.schema";
import { desc, eq } from "drizzle-orm";

export type ChangeLogEntry = {
  id: number;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string | null;
  oldValue: string | null;
  newValue: string | null;
  source: string;
  createdAt: string;
};

export async function logGadsChange(
  projectId: string,
  entry: {
    action: string;
    entityType: string;
    entityId: string;
    entityName?: string;
    oldValue?: string;
    newValue?: string;
    source?: string;
  },
): Promise<void> {
  await db.insert(gadsChangeLog).values({
    projectId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    entityName: entry.entityName ?? null,
    oldValue: entry.oldValue ?? null,
    newValue: entry.newValue ?? null,
    source: entry.source ?? "ui",
  });
}

export async function getGadsChangeLog(
  projectId: string,
  limit: number = 50,
): Promise<ChangeLogEntry[]> {
  const rows = await db
    .select()
    .from(gadsChangeLog)
    .where(eq(gadsChangeLog.projectId, projectId))
    .orderBy(desc(gadsChangeLog.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    entityName: row.entityName,
    oldValue: row.oldValue,
    newValue: row.newValue,
    source: row.source,
    createdAt: row.createdAt,
  }));
}
