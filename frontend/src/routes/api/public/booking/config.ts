import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { cors, corsOptions } from "@/server/cors";

export const Route = createFileRoute("/api/public/booking/config")({
  server: {
    handlers: {
      OPTIONS: async () => corsOptions(),
      GET: async () => {
        const [{ data: services = [] }, { data: workers = [] }, { data: ws = [] }, { data: profile }] = await Promise.all([
          supabaseAdmin.from("services").select("id,name,description,duration_minutes,price_cents,currency,active").eq("active", true).order("name"),
          supabaseAdmin.from("workers").select("id,name,color,avatar_url,active").eq("active", true).order("name"),
          supabaseAdmin.from("worker_services").select("worker_id,service_id"),
          supabaseAdmin.from("ai_profile").select("business_name,greeting").limit(1).maybeSingle(),
        ]);
        return cors({ services, workers, worker_services: ws, business: profile ?? null });
      },
    },
  },
});
