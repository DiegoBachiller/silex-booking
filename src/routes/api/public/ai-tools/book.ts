import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { validateApiKey, jsonResponse, errorResponse } from "@/server/ai-tools.server";

const Schema = z.object({
  worker_id: z.string().uuid(),
  service_id: z.string().uuid().optional().nullable(),
  customer_name: z.string().min(1).max(200),
  customer_phone: z.string().max(50).optional().nullable(),
  customer_email: z.string().email().max(200).optional().nullable(),
  starts_at: z.string().datetime(),
  duration_minutes: z.number().int().min(5).max(480).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const Route = createFileRoute("/api/public/ai-tools/book")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await validateApiKey(request);
        if (!auth.ok) return auth.response;
        let body: unknown;
        try { body = await request.json(); } catch { return errorResponse("Invalid JSON"); }
        const parsed = Schema.safeParse(body);
        if (!parsed.success) return errorResponse(parsed.error.message);
        const data = parsed.data;

        // Determine duration
        let duration = data.duration_minutes ?? 30;
        if (data.service_id) {
          const { data: svc } = await supabaseAdmin.from("services").select("duration_minutes").eq("id", data.service_id).maybeSingle();
          if (svc?.duration_minutes) duration = svc.duration_minutes;
        }
        const starts = new Date(data.starts_at);
        const ends = new Date(starts.getTime() + duration * 60000);

        // Conflict check
        const { data: conflicts } = await supabaseAdmin
          .from("appointments")
          .select("id")
          .eq("worker_id", data.worker_id)
          .neq("status", "cancelled")
          .lt("starts_at", ends.toISOString())
          .gt("ends_at", starts.toISOString());
        if (conflicts && conflicts.length > 0) return errorResponse("Time slot is no longer available", 409);

        const { data: created, error } = await supabaseAdmin
          .from("appointments")
          .insert({
            worker_id: data.worker_id,
            service_id: data.service_id ?? null,
            customer_name: data.customer_name,
            customer_phone: data.customer_phone ?? null,
            customer_email: data.customer_email ?? null,
            starts_at: starts.toISOString(),
            ends_at: ends.toISOString(),
            notes: data.notes ?? null,
            source: "ai",
          })
          .select()
          .single();
        if (error) return errorResponse(error.message, 500);
        return jsonResponse({ appointment: created, message: "Appointment booked successfully" });
      },
    },
  },
});
