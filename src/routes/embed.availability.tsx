import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Sparkles, Wifi } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/embed/availability")({
  head: () => ({
    meta: [
      { title: "Disponibilidad en directo" },
      { name: "description", content: "Huecos libres actualizándose en tiempo real." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EmbedAvailabilityPage,
});

type Slot = { worker_id: string; worker_name: string; start: string; end: string };

function dateStr(d: Date) { return d.toISOString().slice(0, 10); }

function EmbedAvailabilityPage() {
  const [days] = useState(7);
  const [data, setData] = useState<Record<string, Slot[]>>({});
  const [loading, setLoading] = useState(true);
  const [pulse, setPulse] = useState(false);

  const load = useCallback(async () => {
    const today = new Date();
    const dates = Array.from({ length: days }, (_, i) => {
      const d = new Date(today); d.setDate(d.getDate() + i); return dateStr(d);
    });
    const results = await Promise.all(
      dates.map(async (date) => {
        const r = await fetch(`/api/public/booking/availability?date=${date}`);
        const j = await r.json();
        return [date, (j.slots ?? []) as Slot[]] as const;
      })
    );
    setData(Object.fromEntries(results));
    setLoading(false);
    setPulse(true); setTimeout(() => setPulse(false), 600);
  }, [days]);

  useEffect(() => { load(); }, [load]);

  // Realtime: when appointments change, re-fetch
  useEffect(() => {
    const ch = supabase
      .channel("public-availability")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const dates = Object.keys(data).sort();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold text-sm">Disponibilidad</div>
              <div className="text-xs text-muted-foreground">Próximos {days} días</div>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-success/10 text-success-foreground transition-all ${pulse ? "scale-105" : ""}`}>
            <Wifi className="h-3 w-3" /> En directo
          </div>
        </div>

        {loading ? <div className="text-sm text-muted-foreground">Cargando…</div> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dates.map((date) => {
              const slots = data[date] ?? [];
              const d = new Date(date + "T00:00:00");
              return (
                <div key={date} className="silex-card p-4">
                  <div className="flex items-baseline justify-between mb-3">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        {d.toLocaleDateString("es-ES", { weekday: "short" })}
                      </div>
                      <div className="font-semibold">
                        {d.toLocaleDateString("es-ES", { day: "2-digit", month: "long" })}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">{slots.length} libres</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-auto">
                    {slots.slice(0, 30).map((s, i) => {
                      const t = new Date(s.start).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
                      return (
                        <span key={i} className="text-[11px] rounded-md border border-border px-1.5 py-0.5 bg-surface" title={s.worker_name}>
                          {t}
                        </span>
                      );
                    })}
                    {slots.length === 0 && <span className="text-xs text-muted-foreground">Sin huecos</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-[10px] text-muted-foreground mt-6">
          Powered by SILEX · Actualizado en tiempo real
        </p>
      </div>
    </div>
  );
}
