import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

// Use SITE_URL env var if set (Cloudflare prod), otherwise derive from the
// incoming request host so the sitemap works on every domain.
const FALLBACK_BASE = "https://silex.app";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const envBase =
          (typeof process !== "undefined" && process.env?.SITE_URL) || undefined;
        let baseUrl = envBase ?? FALLBACK_BASE;
        try {
          const reqUrl = new URL(request.url);
          baseUrl = envBase ?? `${reqUrl.protocol}//${reqUrl.host}`;
        } catch {
          /* keep fallback */
        }

        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/login", changefreq: "monthly", priority: "0.6" },
          { path: "/embed/book", changefreq: "monthly", priority: "0.7" },
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${baseUrl}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ].filter(Boolean).join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
