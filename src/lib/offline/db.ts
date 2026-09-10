import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import type { WORK_ORDER_STATUSES } from "@/lib/validation/work-orders";

/**
 * Offline capability is scoped deliberately to work-order *execution*
 * actions — the single highest-value offline scenario (a technician
 * finishing a job in a dead zone) — not a full offline-first data layer for
 * every entity in the app. See src/lib/offline/queue.ts and
 * src/components/offline/sync-indicator.tsx for the rest of the mechanism.
 */

export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];

export type PendingActionType = "wo-status-change" | "wo-close" | "wo-task-toggle" | "wo-time-log" | "wo-comment";

export type PendingActionPayloads = {
  "wo-status-change": { status: WorkOrderStatus };
  "wo-close": { failureCause: string; resolution: string; followUpRequired: boolean; followUpNotes: string };
  "wo-task-toggle": { taskId: string; isDone: boolean };
  "wo-time-log": { orgId: string; startedAt: string; endedAt: string; note: string };
  "wo-comment": { orgId: string; body: string };
};

/** A queued mutation, discriminated by `type`. */
export type PendingAction = {
  [K in PendingActionType]: {
    id: string;
    type: K;
    orgSlug: string;
    workOrderId: string;
    payload: PendingActionPayloads[K];
    createdAt: number;
    retries: number;
    lastError?: string;
  };
}[PendingActionType];

/**
 * Read-only, best-effort local snapshot of a work order a technician has
 * viewed, so the detail screen has *something* to show if it's opened again
 * while offline. Not a sync source of truth — it is overwritten every time
 * the page is viewed online and is never read back into a mutation.
 */
export interface CachedWorkOrderSnapshot {
  id: string;
  orgSlug: string;
  cachedAt: number;
  number: string;
  title: string;
  status: string;
  tasks: { id: string; label: string; is_done: boolean }[];
}

interface OfflineDB extends DBSchema {
  "pending-actions": {
    key: string;
    value: PendingAction;
    indexes: { "by-workOrderId": string };
  };
  "cached-work-orders": {
    key: string;
    value: CachedWorkOrderSnapshot;
  };
}

const DB_NAME = "intervia-offline";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null;

/** Lazily opens (and caches) the offline IndexedDB database. Browser-only. */
export function getOfflineDB(): Promise<IDBPDatabase<OfflineDB>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("getOfflineDB() ne peut être utilisé que dans le navigateur."));
  }
  if (!dbPromise) {
    dbPromise = openDB<OfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("pending-actions")) {
          const store = db.createObjectStore("pending-actions", { keyPath: "id" });
          store.createIndex("by-workOrderId", "workOrderId");
        }
        if (!db.objectStoreNames.contains("cached-work-orders")) {
          db.createObjectStore("cached-work-orders", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}
