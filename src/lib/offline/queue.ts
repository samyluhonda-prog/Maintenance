import { getOfflineDB, type PendingAction, type PendingActionPayloads, type PendingActionType } from "./db";

const MAX_RETRIES = 5;

/** Fired on window whenever the pending-actions queue changes, so UI (e.g. SyncIndicator) can refresh without polling. */
export const QUEUE_CHANGE_EVENT = "intervia-offline-queue-change";

function notifyQueueChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(QUEUE_CHANGE_EVENT));
}

/**
 * Queues a work-order execution action for later replay. Writes to
 * IndexedDB and returns immediately — the caller is expected to update its
 * own UI state optimistically alongside this call.
 */
export async function enqueueAction<K extends PendingActionType>(action: {
  type: K;
  orgSlug: string;
  workOrderId: string;
  payload: PendingActionPayloads[K];
}): Promise<PendingAction> {
  const db = await getOfflineDB();
  const record = {
    id: crypto.randomUUID(),
    type: action.type,
    orgSlug: action.orgSlug,
    workOrderId: action.workOrderId,
    payload: action.payload,
    createdAt: Date.now(),
    retries: 0,
  } as PendingAction;
  await db.add("pending-actions", record);
  notifyQueueChanged();
  return record;
}

/** All queued actions, oldest first. */
export async function getPendingActions(): Promise<PendingAction[]> {
  if (typeof window === "undefined") return [];
  const db = await getOfflineDB();
  const all = await db.getAll("pending-actions");
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

/** Queued actions for a single work order — used for the beforeunload warning and per-screen counts. */
export async function getPendingActionsForWorkOrder(workOrderId: string): Promise<PendingAction[]> {
  if (typeof window === "undefined") return [];
  const db = await getOfflineDB();
  return db.getAllFromIndex("pending-actions", "by-workOrderId", workOrderId);
}

export async function removePendingAction(id: string): Promise<void> {
  const db = await getOfflineDB();
  await db.delete("pending-actions", id);
  notifyQueueChanged();
}

async function updatePendingAction(id: string, patch: Partial<Pick<PendingAction, "retries" | "lastError">>): Promise<void> {
  const db = await getOfflineDB();
  const existing = await db.get("pending-actions", id);
  if (!existing) return;
  await db.put("pending-actions", { ...existing, ...patch });
  notifyQueueChanged();
}

/** Resets an entry's retry count so a manually-triggered retry gets the full attempt budget again. */
export async function resetPendingActionRetries(id: string): Promise<void> {
  await updatePendingAction(id, { retries: 0, lastError: undefined });
}

/** One handler per action type — each calls the real server action (see src/lib/offline/handlers.ts). */
export type PendingActionHandlers = {
  [K in PendingActionType]: (action: Extract<PendingAction, { type: K }>) => Promise<void>;
};

export type SyncResult = { synced: number; failed: number; permanentlyFailed: number };

/**
 * Replays queued actions against the real server actions, in FIFO order.
 *
 * Deduplication note: an action is only removed from the queue once its
 * matching server action has confirmed success (no error). This function
 * never creates new queue entries on its own — it only replays what a user
 * action already enqueued — so a given user action is applied at most once:
 * it is either still pending (not yet sent) or it succeeded and was
 * removed. A failed attempt is retried *in place* (same record, `retries`
 * incremented) rather than duplicated as a new entry, which is what gives
 * us "nouvelle tentative automatique" without risking double-application.
 *
 * Known gap (documented, not attempted here): this is last-write-wins, same
 * as the underlying server actions. If two people edit the same work order
 * while both offline, whichever queue syncs second silently overwrites the
 * first — there is no conflict detection.
 */
export async function syncPendingActions(handlers: PendingActionHandlers): Promise<SyncResult> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { synced: 0, failed: 0, permanentlyFailed: 0 };
  }

  const actions = await getPendingActions();
  let synced = 0;
  let failed = 0;
  let permanentlyFailed = 0;

  for (const action of actions) {
    if (action.retries >= MAX_RETRIES) {
      permanentlyFailed++;
      continue;
    }
    try {
      const handler = handlers[action.type] as (a: PendingAction) => Promise<void>;
      await handler(action);
      await removePendingAction(action.id);
      synced++;
    } catch (error) {
      failed++;
      const message = error instanceof Error ? error.message : "Erreur inconnue.";
      await updatePendingAction(action.id, { retries: action.retries + 1, lastError: message });
    }
  }

  return { synced, failed, permanentlyFailed };
}

export { MAX_RETRIES };
