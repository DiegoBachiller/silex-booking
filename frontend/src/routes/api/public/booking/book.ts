import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { cors, corsOptions } from "@/server/cors";

const Schema = z.object({
  worker_id: z.string().uuid(),
  service_id: z.string().uuid().optional().nullable(),
  customer_name: z.string().min(1).max(200),
  customer_phone: z.string().max(50).optional().nullable(),
  customer_email: z.string().email().max(200).optional().nullable(),
  starts_at: z.string().datetime(),
  notes: z.string().max(2000).optional().nullable(),
});

export const Route = createFileRoute("/api/public/booking/book")({
  server: {
    handlers: {
      OPTIONS: async () => corsOptions(),
      POST: async ({ request }) => {
        let body: unknown;
        try { body = await request.json(); } catch { return cors({ error: "Invalid JSON" }, 400); }
        const parsed = Schema.safeParse(body);
        if (!parsed.success) return cors({ error: parsed.error.message }, 400);
        const data = parsed.data;

        // Determine duration from service
        let duration = 30;
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
        if (conflicts && conflicts.length > 0) return cors({ error: "Ese hueco ya no está disponible" }, 409);

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
            source: "web",
          })
          .select()
          .single();
        if (error) return cors({ error: error.message }, 500);
        return cors({ appointment: created, message: "Reserva confirmada" });
      },
    },
  },
});
