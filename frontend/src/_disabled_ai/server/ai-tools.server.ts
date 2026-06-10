// Server-only helpers for AI tool endpoints. Validates x-api-key against api_keys table.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function validateApiKey(request: Request): Promise<{ ok: true } | { ok: false; response: Response }> {
  const key = request.headers.get("x-api-key");
  if (!key) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Missing x-api-key header" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }
  const { data, error } = await supabaseAdmin
    .from("api_keys")
    .select("id, active")
    .eq("key", key)
    .maybeSingle();
  if (error || !data || !data.active) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Invalid or revoked API key" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }
  // touch last_used_at (fire and forget)
  supabaseAdmin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => {});
  return { ok: true };
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

export function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}
