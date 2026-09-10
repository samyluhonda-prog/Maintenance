"use client";

import { useEffect } from "react";

import { cacheWorkOrderSnapshot } from "@/lib/offline/cache";
import { getPendingActionsForWorkOrder } from "@/lib/offline/queue";

/**
 * Renders nothing. On mount (i.e. every time this work order is viewed
 * while online), stores a lightweight read-only snapshot in IndexedDB — see
 * src/lib/offline/cache.ts for what it's for and its limits. Also installs a
 * `beforeunload` guard: if this specific work order has unsynced queued
 * actions, warn before the tab closes/navigates away from the app entirely
 * (in-app navigation via next/link is unaffected — this only fires on a
 * real page unload).
 */
export function CacheWorkOrderSnapshot({
  orgSlug,
  id,
  number,
  title,
  status,
  tasks,
}: {
  orgSlug: string;
  id: string;
  number: string;
  title: string;
  status: string;
  tasks: { id: string; label: string; is_done: boolean }[];
}) {
  useEffect(() => {
    void cacheWorkOrderSnapshot({ id, orgSlug, number, title, status, tasks });
    // Snapshot each time the underlying data changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, orgSlug, number, title, status, JSON.stringify(tasks)]);

  useEffect(() => {
    // Synchronous-only check: beforeunload can't await IndexedDB, so we rely
    // on a cheap in-memory flag refreshed on an interval instead.
    const hasPendingRef = { current: false };

    async function refresh() {
      hasPendingRef.current = (await getPendingActionsForWorkOrder(id)).length > 0;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (hasPendingRef.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    }

    void refresh();
    const interval = setInterval(refresh, 5000);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [id]);

  return null;
}
