// Admin endpoint for the in-app UI to manage API keys (no auth — single-tenant app).
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { jsonResponse, errorResponse } from "@/server/ai-tools.server";

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  key: z.string().min(20).max(200),
});

export const Route = createFileRoute("/api/public/admin/api-keys")({
  server: {
    handlers: {
      GET: async () => {
        const { data, error } = await supabaseAdmin
          .from("api_keys")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) return errorResponse(error.message, 500);
        return jsonResponse(data ?? []);
      },
      POST: async ({ request }) => {
        let body: unknown;
        try { body = await request.json(); } catch { return errorResponse("Invalid JSON"); }
        const parsed = CreateSchema.safeParse(body);
        if (!parsed.success) return errorResponse(parsed.error.message);
        const { error } = await supabaseAdmin.from("api_keys").insert(parsed.data);
        if (error) return errorResponse(error.message, 500);
        return jsonResponse({ ok: true });
      },
      DELETE: async ({ request }) => {
        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        if (!id) return errorResponse("Missing id");
        const { error } = await supabaseAdmin.from("api_keys").delete().eq("id", id);
        if (error) return errorResponse(error.message, 500);
        return jsonResponse({ ok: true });
      },
    },
  },
});
