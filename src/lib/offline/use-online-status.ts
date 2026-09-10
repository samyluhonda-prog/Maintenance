"use client";

import * as React from "react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

// SSR-safe default: assume online until mounted, matching the pattern used
// by useIsMobile (src/hooks/use-mobile.ts).
function getServerSnapshot() {
  return true;
}

/** Live online/offline status, SSR-safe. */
export function useOnlineStatus() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
