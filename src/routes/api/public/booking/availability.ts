import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { computeAvailability } from "@/server/availability.server";
import { cors, corsOptions } from "@/server/cors";

const Schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  service_id: z.string().uuid().optional(),
  worker_id: z.string().uuid().optional(),
  duration_minutes: z.coerce.number().int().min(5).max(480).optional(),
});

export const Route = createFileRoute("/api/public/booking/availability")({
  server: {
    handlers: {
      OPTIONS: async () => corsOptions(),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const parsed = Schema.safeParse(Object.fromEntries(url.searchParams));
        if (!parsed.success) return cors({ error: parsed.error.message }, 400);
        const slots = await computeAvailability(parsed.data);
        return cors({ slots, total: slots.length });
      },
    },
  },
});
