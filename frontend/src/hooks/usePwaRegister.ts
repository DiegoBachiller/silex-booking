/// <reference types="vite/client" />
import { useEffect } from "react";

// Hook that registers the PWA service worker in the browser only.
// Uses dynamic import so it has no effect during SSR/server build.
export function usePwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Don't register during dev (devOptions.enabled: false in vite.config)
    if (import.meta.env.DEV) return;
    import("virtual:pwa-register")
      .then(({ registerSW }) => {
        registerSW({ immediate: true });
      })
      .catch(() => {
        /* virtual module only exists in builds with VitePWA plugin */
      });
  }, []);
}
