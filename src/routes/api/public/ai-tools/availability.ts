import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { validateApiKey, jsonResponse, errorResponse } from "@/server/ai-tools.server";
import { computeAvailability } from "@/server/availability.server";

const Schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  service_id: z.string().uuid().optional().nullable(),
  worker_id: z.string().uuid().optional().nullable(),
  duration_minutes: z.number().int().min(5).max(480).optional().nullable(),
});

export const Route = createFileRoute("/api/public/ai-tools/availability")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await validateApiKey(request);
        if (!auth.ok) return auth.response;
        let body: unknown;
        try { body = await request.json(); } catch { return errorResponse("Invalid JSON"); }
        const parsed = Schema.safeParse(body);
        if (!parsed.success) return errorResponse(parsed.error.message);
        const slots = await computeAvailability(parsed.data);
        return jsonResponse({ slots: slots.slice(0, 50), total: slots.length });
      },
    },
  },
});
