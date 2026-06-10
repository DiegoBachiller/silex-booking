// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  vite: {
    server: {
      host: "0.0.0.0",
      port: 3000,
      // Allow the Emergent preview hostname and any custom host the user deploys to.
      // "true" disables host validation entirely — fine in dev, ignored in build.
      allowedHosts: true,
    },
  },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["robots.txt", "llms.txt", "favicon.ico"],
      manifest: {
        name: "SILEX — Reservas",
        short_name: "SILEX",
        description:
          "Gestión premium de citas multi-trabajador. Calendario, clientes, equipo y estadísticas.",
        lang: "es",
        start_url: "/calendar",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0b0b0e",
        theme_color: "#0b0b0e",
        categories: ["business", "productivity"],
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Don't precache the heavy app shell at dev time; let Workbox cache on demand.
        navigateFallback: null,
        globPatterns: ["**/*.{js,css,html,svg,png,ico,webp,woff2}"],
        runtimeCaching: [
          {
            // Cache Supabase REST/REALTIME data with stale-while-revalidate
            urlPattern: ({ url }) => url.origin.endsWith("supabase.co"),
            handler: "NetworkFirst",
            options: {
              cacheName: "silex-supabase",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === "document",
            handler: "NetworkFirst",
            options: { cacheName: "silex-pages", networkTimeoutSeconds: 4 },
          },
          {
            urlPattern: ({ request }) =>
              request.destination === "style" ||
              request.destination === "script" ||
              request.destination === "worker",
            handler: "StaleWhileRevalidate",
            options: { cacheName: "silex-assets" },
          },
          {
            urlPattern: ({ request }) =>
              request.destination === "image" || request.destination === "font",
            handler: "CacheFirst",
            options: {
              cacheName: "silex-media",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
