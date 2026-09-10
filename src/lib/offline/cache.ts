import { getOfflineDB, type CachedWorkOrderSnapshot } from "./db";

/**
 * Best-effort, read-only local snapshot of a work order — written whenever a
 * technician views one while online, so the detail screen has something to
 * show if IndexedDB has it but no fresh network response is available (a
 * fallback of last resort; the service worker's page cache is the primary
 * mechanism for offline viewing — see public/sw.js). Never read back into a
 * mutation, and never treated as authoritative.
 */
export async function cacheWorkOrderSnapshot(snapshot: Omit<CachedWorkOrderSnapshot, "cachedAt">): Promise<void> {
  if (typeof window === "undefined" || !navigator.onLine) return;
  const db = await getOfflineDB();
  await db.put("cached-work-orders", { ...snapshot, cachedAt: Date.now() });
}

export async function getCachedWorkOrderSnapshot(id: string): Promise<CachedWorkOrderSnapshot | undefined> {
  if (typeof window === "undefined") return undefined;
  const db = await getOfflineDB();
  return db.get("cached-work-orders", id);
}
