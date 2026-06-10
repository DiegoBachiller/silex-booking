import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, Euro, Trophy, XCircle, BarChart2 } from "lucide-react";
import { useAppointments, useWorkers, useServices, useAppointmentsRealtime } from "@/hooks/useSilexData";
import { formatCurrency } from "@/lib/format";
import { getStatus, statusBadgeStyle } from "@/lib/appointment-status";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/estadisticas")({
  head: () => ({
    meta: [
      { title: "Estadísticas — SILEX" },
      { name: "description", content: "Métricas clave de tu negocio: citas, ingresos y rendimiento del equipo." },
      { property: "og:title", content: "Estadísticas — SILEX" },
      { property: "og:description", content: "Resumen mensual de citas e ingresos." },
    ],
  }),

  component: EstadisticasPage,
});

function EstadisticasPage() {
  useAppointmentsRealtime();
  const { data: appointments = [] } = useAppointments();
  const { data: workers = [] } = useWorkers();
  const { data: services = [] } = useServices();

  // Lightweight set of existing customers (just identifying fields) to mark
  // appointments whose client has been removed.
  const { data: customerKeys = new Set<string>() } = useQuery({
    queryKey: ["customer_keys"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("customers").select("name, phone, email");
      if (error) throw error;
      const set = new Set<string>();
      (data ?? []).forEach((c: { name: string; phone: string | null; email: string | null }) => {
        if (c.phone) set.add(`p:${c.phone}`);
        if (c.email) set.add(`e:${c.email.toLowerCase()}`);
        if (c.name) set.add(`n:${c.name.toLowerCase()}`);
      });
      return set;
    },
  });

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();

    const inMonth = appointments.filter((a) => {
      const t = new Date(a.starts_at).getTime();
      return t >= monthStart && t < monthEnd;
    });

    const active = inMonth.filter((a) => a.status !== "cancelled");
    const cancelled = inMonth.filter((a) => a.status === "cancelled");

    const revenueCents = active.reduce((sum, a) => {
      const s = services.find((x) => x.id === a.service_id);
      return sum + (s?.price_cents ?? 0);
    }, 0);

    // worker with most appointments
    const counts = new Map<string, number>();
    active.forEach((a) => counts.set(a.worker_id, (counts.get(a.worker_id) ?? 0) + 1));
    let topWorkerId: string | null = null;
    let topCount = 0;
    counts.forEach((c, id) => {
      if (c > topCount) { topCount = c; topWorkerId = id; }
    });
    const topWorker = topWorkerId ? workers.find((w) => w.id === topWorkerId) : null;

    const cancelRate = inMonth.length === 0 ? 0 : (cancelled.length / inMonth.length) * 100;

    const recent = [...inMonth]
      .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
      .slice(0, 5);

    return {
      monthCount: active.length,
      revenueCents,
      topWorker,
      topCount,
      cancelRate,
      recent,
    };
  }, [appointments, services, workers]);

  return (
    <AppShell>
      <PageHeader
        title="Estadísticas"
        description="Resumen del mes en curso."
      />
      <div className="px-4 sm:px-6 md:px-10 py-5 md:py-6 space-y-6">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={CalendarCheck}
            label="Citas este mes"
            value={stats.monthCount.toString()}
            hint="Sin contar canceladas"
            color="#6366f1"
          />
          <MetricCard
            icon={Euro}
            label="Ingresos estimados"
            value={formatCurrency(stats.revenueCents, "EUR")}
            hint="Según precios del catálogo"
            color="#10b981"
          />
          <MetricCard
            icon={Trophy}
            label="Trabajador más ocupado"
            value={stats.topWorker?.name ?? "—"}
            hint={stats.topWorker ? `${stats.topCount} citas` : "Sin datos"}
            color={stats.topWorker?.color ?? "#8b5cf6"}
          />
          <MetricCard
            icon={XCircle}
            label="Tasa de cancelación"
            value={`${stats.cancelRate.toFixed(1)} %`}
            hint="Cancelaciones / total mes"
            color="#ef4444"
          />
        </div>

        <div className="silex-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Últimas citas del mes</h2>
          </div>
          {stats.recent.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Aún no hay citas registradas este mes.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-xs text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-2.5">Fecha</th>
                  <th className="text-left font-medium px-4 py-2.5">Cliente</th>
                  <th className="text-left font-medium px-4 py-2.5 hidden sm:table-cell">Servicio</th>
                  <th className="text-left font-medium px-4 py-2.5 hidden md:table-cell">Trabajador</th>
                  <th className="text-left font-medium px-4 py-2.5">Estado</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent.map((a) => {
                  const w = workers.find((x) => x.id === a.worker_id);
                  const s = services.find((x) => x.id === a.service_id);
                  const st = getStatus(a.status);
                  const d = new Date(a.starts_at);
                  const isDeleted =
                    customerKeys.size > 0 &&
                    !(
                      (a.customer_phone && customerKeys.has(`p:${a.customer_phone}`)) ||
                      (a.customer_email && customerKeys.has(`e:${a.customer_email.toLowerCase()}`)) ||
                      customerKeys.has(`n:${a.customer_name.toLowerCase()}`)
                    );
                  return (
                    <tr key={a.id} className="border-t border-border">
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                        <span className="text-muted-foreground"> · {d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-medium">{a.customer_name}</span>
                        {isDeleted && (
                          <Badge variant="outline" className="ml-2 text-[10px] font-normal text-muted-foreground">
                            Cliente eliminado
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">{s?.name ?? "—"}</td>
                      <td className="px-4 py-2.5 hidden md:table-cell">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ background: w?.color ?? "#6366f1" }} />
                          {w?.name ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="secondary" style={statusBadgeStyle(a.status)}>
                          {st.label}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  color: string;
}) {
  return (
    <div className="silex-card p-5">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span
          className="h-7 w-7 rounded-lg flex items-center justify-center"
          style={{
            background: `color-mix(in oklab, ${color} 14%, transparent)`,
            color,
          }}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight truncate" title={value}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
