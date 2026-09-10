"use client";

import { useEffect, useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { pendingActionHandlers } from "@/lib/offline/handlers";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import { getPendingActions, QUEUE_CHANGE_EVENT, syncPendingActions } from "@/lib/offline/queue";

const RETRY_INTERVAL_MS = 30_000;

/**
 * Mounted once in the org layout. Silent (renders nothing) when online with
 * an empty queue — only surfaces when there's something worth telling the
 * technician about: offline, syncing, or items that failed to sync.
 */
export function SyncIndicator() {
  const online = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  async function refreshCounts() {
    const actions = await getPendingActions();
    setPendingCount(actions.length);
    setFailedCount(actions.filter((a) => a.retries > 0).length);
  }

  async function runSync() {
    if (!navigator.onLine) return;
    setSyncing(true);
    await syncPendingActions(pendingActionHandlers);
    await refreshCounts();
    setSyncing(false);
  }

  useEffect(() => {
    // Initial load of the queue counts from IndexedDB — an external data
    // source, not derived state, so the async setState below is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshCounts();
    window.addEventListener(QUEUE_CHANGE_EVENT, refreshCounts);
    return () => window.removeEventListener(QUEUE_CHANGE_EVENT, refreshCounts);
  }, []);

  useEffect(() => {
    if (!online) return;
    // Same rationale: syncing on reconnect is an external effect, not
    // state derived from props/state, so setState-after-await is expected.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void runSync();
    const interval = setInterval(() => void runSync(), RETRY_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  if (online && pendingCount === 0) return null;

  return (
    <div className="border-b bg-warning/10 px-4 py-1.5 text-center text-xs font-medium text-warning-foreground">
      {!online ? (
        <span className="inline-flex items-center gap-1.5">
          <CloudOff className="size-3.5" />
          Hors ligne{pendingCount > 0 && ` — ${pendingCount} modification(s) en attente`}
        </span>
      ) : syncing ? (
        <span className="inline-flex items-center gap-1.5">
          <RefreshCw className="size-3.5 animate-spin" />
          Synchronisation…
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5">
          <Badge variant="warning">{failedCount > 0 ? failedCount : pendingCount}</Badge>
          {failedCount > 0
            ? "modification(s) non synchronisées — nouvelle tentative automatique"
            : "modification(s) en attente de synchronisation"}
        </span>
      )}
    </div>
  );
}
