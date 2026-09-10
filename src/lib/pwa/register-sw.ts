/**
 * Registers the app-shell service worker (see public/sw.js). Browser-only —
 * guarded so it's a no-op during SSR or in browsers without support.
 */
export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      console.error("Échec de l'enregistrement du service worker :", error);
    });
  });
}
