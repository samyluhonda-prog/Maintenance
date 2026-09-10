"use client";

import { useEffect } from "react";

import { registerServiceWorker } from "@/lib/pwa/register-sw";

/** Mounted once in the root layout. Renders nothing — registers the PWA service worker as a side effect. */
export function SwRegister() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
}
