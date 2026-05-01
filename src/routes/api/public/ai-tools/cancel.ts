import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { validateApiKey, jsonResponse, errorResponse } from "@/server/ai-tools.server";

const Schema = z.object({
  appointment_id: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

export const Route = createFileRoute("/api/public/ai-tools/cancel")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await validateApiKey(request);
        if (!auth.ok) return auth.response;
        let body: unknown;
        try { body = await request.json(); } catch { return errorResponse("Invalid JSON"); }
        const parsed = Schema.safeParse(body);
        if (!parsed.success) return errorResponse(parsed.error.message);

        const { error } = await supabaseAdmin
          .from("appointments")
          .update({ status: "cancelled", notes: parsed.data.reason ?? null })
          .eq("id", parsed.data.appointment_id);
        if (error) return errorResponse(error.message, 500);
        return jsonResponse({ message: "Appointment cancelled" });
      },
    },
  },
});
