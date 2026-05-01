import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { validateApiKey, jsonResponse, errorResponse } from "@/server/ai-tools.server";

const Schema = z.object({
  appointment_id: z.string().uuid(),
  starts_at: z.string().datetime().optional(),
  worker_id: z.string().uuid().optional(),
  duration_minutes: z.number().int().min(5).max(480).optional(),
});

export const Route = createFileRoute("/api/public/ai-tools/reschedule")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await validateApiKey(request);
        if (!auth.ok) return auth.response;
        let body: unknown;
        try { body = await request.json(); } catch { return errorResponse("Invalid JSON"); }
        const parsed = Schema.safeParse(body);
        if (!parsed.success) return errorResponse(parsed.error.message);
        const { appointment_id, starts_at, worker_id, duration_minutes } = parsed.data;

        const { data: existing } = await supabaseAdmin
          .from("appointments")
          .select("*")
          .eq("id", appointment_id)
          .maybeSingle();
        if (!existing) return errorResponse("Appointment not found", 404);

        const newWorker = worker_id ?? existing.worker_id;
        const newStart = starts_at ? new Date(starts_at) : new Date(existing.starts_at);
        const oldDuration = (new Date(existing.ends_at).getTime() - new Date(existing.starts_at).getTime()) / 60000;
        const dur = duration_minutes ?? oldDuration;
        const newEnd = new Date(newStart.getTime() + dur * 60000);

        // Conflict check (excluding self)
        const { data: conflicts } = await supabaseAdmin
          .from("appointments")
          .select("id")
          .eq("worker_id", newWorker)
          .neq("id", appointment_id)
          .neq("status", "cancelled")
          .lt("starts_at", newEnd.toISOString())
          .gt("ends_at", newStart.toISOString());
        if (conflicts && conflicts.length > 0) return errorResponse("New time slot conflicts with another appointment", 409);

        const { data: updated, error } = await supabaseAdmin
          .from("appointments")
          .update({
            worker_id: newWorker,
            starts_at: newStart.toISOString(),
            ends_at: newEnd.toISOString(),
          })
          .eq("id", appointment_id)
          .select()
          .single();
        if (error) return errorResponse(error.message, 500);
        return jsonResponse({ appointment: updated, message: "Appointment rescheduled" });
      },
    },
  },
});
