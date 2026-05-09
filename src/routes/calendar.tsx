import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Bot, User, Calendar as CalIcon } from "lucide-react";
import { useAppointments, useServices, useWorkers, useMut, useAppointmentsRealtime, type Appointment, type Worker } from "@/hooks/useSilexData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Calendario — SILEX" },
      { name: "description", content: "Vista multi-trabajador de tus citas, manuales o creadas por la IA." },
    ],
  }),
  component: CalendarPage,
});

type ViewMode = "day" | "week" | "month";

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7..20
const HOUR_PX = 64;
const HEADER_PX = 48;
const SLOT_MIN = 15;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7; // monday = 0
  x.setDate(x.getDate() - day);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

type DraftRange = { worker_id?: string; date: Date; start: Date; end: Date } | null;

function CalendarPage() {
  useAppointmentsRealtime();
  const [view, setView] = useState<ViewMode>("week");
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [draft, setDraft] = useState<DraftRange>(null);

  const { data: workers = [] } = useWorkers();
  const { data: services = [] } = useServices();
  const { data: appointments = [] } = useAppointments();
  const activeWorkers = useMemo(() => workers.filter((w) => w.active), [workers]);

  const range = useMemo(() => {
    if (view === "day") return { from: cursor, to: addDays(cursor, 1) };
    if (view === "week") {
      const s = startOfWeek(cursor);
      return { from: s, to: addDays(s, 7) };
    }
    const s = startOfMonth(cursor);
    return { from: s, to: new Date(s.getFullYear(), s.getMonth() + 1, 1) };
  }, [view, cursor]);

  const visibleAppts = useMemo(() => {
    const f = range.from.getTime();
    const t = range.to.getTime();
    return appointments.filter((a) => {
      const ts = new Date(a.starts_at).getTime();
      return ts >= f && ts < t;
    });
  }, [appointments, range]);

  const navigate = (dir: -1 | 0 | 1) => {
    if (dir === 0) return setCursor(startOfDay(new Date()));
    if (view === "day") return setCursor(addDays(cursor, dir));
    if (view === "week") return setCursor(addDays(cursor, dir * 7));
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
  };

  const headerLabel = useMemo(() => {
    if (view === "day") return cursor.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    if (view === "week") {
      const s = startOfWeek(cursor);
      const e = addDays(s, 6);
      return `${s.toLocaleDateString("es-ES", { day: "numeric", month: "short" })} – ${e.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    return cursor.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  }, [view, cursor]);

  const openCreate = (preset?: DraftRange) => {
    setEditing(null);
    setDraft(preset ?? null);
    setOpen(true);
  };

  return (
    <AppShell>
      <PageHeader
        title="Calendario"
        description="Día, semana o mes. Arrastra sobre un hueco vacío para crear una cita."
        actions={
          <>
            <ViewSwitcher view={view} onChange={setView} />
            <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
              <Button size="icon" variant="ghost" onClick={() => navigate(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <button
                onClick={() => navigate(0)}
                className="px-3 text-sm font-medium hover:text-primary transition-colors capitalize min-w-[12ch]"
              >
                {headerLabel}
              </button>
              <Button size="icon" variant="ghost" onClick={() => navigate(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={() => openCreate()} className="gap-2">
              <Plus className="h-4 w-4" /> Nueva cita
            </Button>
          </>
        }
      />

      <div className="px-4 sm:px-6 md:px-10 py-5 md:py-6">
        {activeWorkers.length === 0 ? (
          <EmptyState />
        ) : view === "day" ? (
          <DayGrid
            day={cursor}
            workers={activeWorkers}
            services={services}
            appointments={visibleAppts}
            onPick={(a) => { setEditing(a); setDraft(null); setOpen(true); }}
            onDraft={(d) => openCreate(d)}
          />
        ) : view === "week" ? (
          <WeekGrid
            weekStart={startOfWeek(cursor)}
            workers={activeWorkers}
            services={services}
            appointments={visibleAppts}
            onPick={(a) => { setEditing(a); setDraft(null); setOpen(true); }}
            onDraft={(d) => openCreate(d)}
          />
        ) : (
          <MonthGrid
            month={cursor}
            workers={activeWorkers}
            appointments={visibleAppts}
            onPickDay={(d) => { setCursor(d); setView("day"); }}
          />
        )}
      </div>

      <AppointmentDialog
        open={open}
        onOpenChange={setOpen}
        appointment={editing}
        defaultDate={cursor}
        draft={draft}
      />
    </AppShell>
  );
}

function ViewSwitcher({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  const opts: { id: ViewMode; label: string }[] = [
    { id: "day", label: "Día" },
    { id: "week", label: "Semana" },
    { id: "month", label: "Mes" },
  ];
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface p-1">
      {opts.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
            view === o.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="silex-card p-12 text-center">
      <div className="mx-auto h-12 w-12 rounded-xl bg-accent flex items-center justify-center mb-4">
        <User className="h-6 w-6 text-accent-foreground" />
      </div>
      <h3 className="text-base font-semibold mb-1">Aún no hay trabajadores activos</h3>
      <p className="text-sm text-muted-foreground mb-4">Añade tu primer miembro del equipo para empezar.</p>
      <a href="/team">
        <Button>Ir a Equipo</Button>
      </a>
    </div>
  );
}

/* =====================================================================================
 * Drag-to-create primitive — shared between Day and Week column
 * ===================================================================================*/
function useDragCreate(opts: {
  date: Date;
  workerId?: string;
  onCommit: (d: { date: Date; start: Date; end: Date; worker_id?: string }) => void;
}) {
  const [drag, setDrag] = useState<{ startMin: number; endMin: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const minutesFromY = (clientY: number) => {
    const el = ref.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
    const totalMin = (y / HOUR_PX) * 60 + HOURS[0] * 60;
    return Math.round(totalMin / SLOT_MIN) * SLOT_MIN;
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("[data-appt]")) return;
    const m = minutesFromY(e.clientY);
    setDrag({ startMin: m, endMin: m + SLOT_MIN });
    e.preventDefault();
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: MouseEvent) => {
      const m = minutesFromY(e.clientY);
      setDrag((d) => (d ? { ...d, endMin: Math.max(m, d.startMin + SLOT_MIN) } : d));
    };
    const onUp = () => {
      setDrag((d) => {
        if (d) {
          const start = new Date(opts.date);
          start.setHours(0, 0, 0, 0);
          start.setMinutes(d.startMin);
          const end = new Date(opts.date);
          end.setHours(0, 0, 0, 0);
          end.setMinutes(d.endMin);
          opts.onCommit({ date: opts.date, start, end, worker_id: opts.workerId });
        }
        return null;
      });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drag, opts]);

  const overlay = drag ? (() => {
    const top = ((drag.startMin - HOURS[0] * 60) / 60) * HOUR_PX;
    const height = ((drag.endMin - drag.startMin) / 60) * HOUR_PX;
    const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    return (
      <div
        className="absolute left-1 right-1 rounded-lg border-2 border-primary/60 bg-primary/10 pointer-events-none flex items-start justify-center pt-1 z-10"
        style={{ top, height }}
      >
        <span className="text-[10px] font-semibold text-primary">{fmt(drag.startMin)} – {fmt(drag.endMin)}</span>
      </div>
    );
  })() : null;

  return { ref, onMouseDown, overlay };
}

/* =====================================================================================
 * Time column (hours labels)
 * ===================================================================================*/
function HoursColumn() {
  return (
    <div className="border-r border-border bg-surface-muted/40">
      <div style={{ height: HEADER_PX }} className="border-b border-border" />
      {HOURS.map((h) => (
        <div key={h} style={{ height: HOUR_PX }} className="relative border-b border-border">
          <span className="absolute -top-2 right-2 text-[10px] font-medium text-muted-foreground bg-surface-muted/40 px-1">
            {String(h).padStart(2, "0")}:00
          </span>
        </div>
      ))}
    </div>
  );
}

/* =====================================================================================
 * Appointment Card
 * ===================================================================================*/
function ApptCard({
  appt,
  worker,
  service,
  onClick,
  compact,
}: {
  appt: Appointment;
  worker?: Worker;
  service?: { name: string } | undefined;
  onClick: () => void;
  compact?: boolean;
}) {
  const start = new Date(appt.starts_at);
  const end = new Date(appt.ends_at);
  const startMin = start.getHours() * 60 + start.getMinutes() - HOURS[0] * 60;
  const dur = (end.getTime() - start.getTime()) / 60000;
  const top = (startMin / 60) * HOUR_PX;
  const height = Math.max((dur / 60) * HOUR_PX - 2, 22);
  const color = worker?.color ?? "#7c3aed";
  const isAi = appt.source === "ai";
  const cancelled = appt.status === "cancelled";

  return (
    <button
      data-appt
      onMouseDown={(e) => e.stopPropagation()}
      onClick={onClick}
      className={cn(
        "group absolute left-1 right-1 rounded-lg overflow-hidden text-left",
        "border bg-card transition-all duration-200",
        "hover:shadow-floating hover:-translate-y-[1px] hover:z-20",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        cancelled && "opacity-50 line-through"
      )}
      style={{
        top,
        height,
        background: `color-mix(in oklab, ${color} 8%, var(--card))`,
        borderColor: `color-mix(in oklab, ${color} 30%, var(--border))`,
        boxShadow: `inset 3px 0 0 0 ${color}, var(--shadow-elegant)`,
      }}
    >
      <div className="px-2 py-1 h-full flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-1 text-[11px] font-semibold text-foreground truncate">
          {isAi ? <Bot className="h-3 w-3 shrink-0 text-primary" /> : <User className="h-3 w-3 shrink-0 text-muted-foreground" />}
          <span className="truncate">{appt.customer_name}</span>
        </div>
        {!compact && height > 36 && (
          <div className="text-[10px] text-muted-foreground truncate leading-tight">
            {fmtTime(start)} · {service?.name ?? "Sin servicio"}
          </div>
        )}
      </div>
    </button>
  );
}

/* =====================================================================================
 * Day Grid — workers as columns
 * ===================================================================================*/
function DayGrid({
  day,
  workers,
  services,
  appointments,
  onPick,
  onDraft,
}: {
  day: Date;
  workers: Worker[];
  services: { id: string; name: string }[];
  appointments: Appointment[];
  onPick: (a: Appointment) => void;
  onDraft: (d: { date: Date; start: Date; end: Date; worker_id?: string }) => void;
}) {
  return (
    <div className="silex-card overflow-hidden">
      <div className="overflow-x-auto">
        <div className="grid min-w-[700px]" style={{ gridTemplateColumns: `64px repeat(${workers.length}, minmax(180px, 1fr))` }}>
          <HoursColumn />
          {workers.map((w) => (
            <WorkerColumn
              key={w.id}
              date={day}
              worker={w}
              services={services}
              appointments={appointments.filter((a) => a.worker_id === w.id)}
              workers={workers}
              onPick={onPick}
              onDraft={onDraft}
              showHeader
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkerColumn({
  date, worker, services, appointments, workers, onPick, onDraft, showHeader,
}: {
  date: Date; worker: Worker;
  services: { id: string; name: string }[];
  appointments: Appointment[];
  workers: Worker[];
  onPick: (a: Appointment) => void;
  onDraft: (d: { date: Date; start: Date; end: Date; worker_id?: string }) => void;
  showHeader?: boolean;
}) {
  const { ref, onMouseDown, overlay } = useDragCreate({
    date, workerId: worker.id,
    onCommit: onDraft,
  });
  return (
    <div className="border-l border-border flex flex-col">
      {showHeader && (
        <div className="h-12 border-b border-border bg-surface-muted/60 px-3 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full ring-2 ring-background" style={{ background: worker.color }} />
          <span className="text-sm font-medium truncate">{worker.name}</span>
        </div>
      )}
      <div ref={ref} onMouseDown={onMouseDown} className="relative cursor-crosshair select-none" style={{ height: HOURS.length * HOUR_PX }}>
        {HOURS.map((_, i) => (
          <div key={i} style={{ height: HOUR_PX }} className="border-b border-border/70" />
        ))}
        {overlay}
        {appointments.map((a) => (
          <ApptCard
            key={a.id}
            appt={a}
            worker={workers.find((w) => w.id === a.worker_id)}
            service={services.find((s) => s.id === a.service_id)}
            onClick={() => onPick(a)}
          />
        ))}
      </div>
    </div>
  );
}

/* =====================================================================================
 * Week Grid — days as columns (workers stacked inside each day-cell legend on hover)
 * ===================================================================================*/
function WeekGrid({
  weekStart, workers, services, appointments, onPick, onDraft,
}: {
  weekStart: Date; workers: Worker[];
  services: { id: string; name: string }[];
  appointments: Appointment[];
  onPick: (a: Appointment) => void;
  onDraft: (d: { date: Date; start: Date; end: Date; worker_id?: string }) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = startOfDay(new Date());
  return (
    <div className="silex-card overflow-hidden">
      <div className="overflow-x-auto">
        <div className="grid min-w-[900px]" style={{ gridTemplateColumns: `64px repeat(7, minmax(140px, 1fr))` }}>
          <HoursColumn />
          {days.map((d) => {
            const isToday = sameDay(d, today);
            const dayAppts = appointments.filter((a) => sameDay(new Date(a.starts_at), d));
            return (
              <DayColumn
                key={d.toISOString()}
                date={d}
                isToday={isToday}
                workers={workers}
                services={services}
                appointments={dayAppts}
                onPick={onPick}
                onDraft={onDraft}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DayColumn({
  date, isToday, workers, services, appointments, onPick, onDraft,
}: {
  date: Date; isToday: boolean; workers: Worker[];
  services: { id: string; name: string }[];
  appointments: Appointment[];
  onPick: (a: Appointment) => void;
  onDraft: (d: { date: Date; start: Date; end: Date; worker_id?: string }) => void;
}) {
  const { ref, onMouseDown, overlay } = useDragCreate({ date, onCommit: onDraft });
  return (
    <div className="border-l border-border flex flex-col">
      <div className={cn("h-12 border-b border-border px-3 flex flex-col justify-center", isToday ? "bg-primary/5" : "bg-surface-muted/60")}>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
          {date.toLocaleDateString("es-ES", { weekday: "short" })}
        </span>
        <span className={cn("text-sm font-semibold", isToday && "text-primary")}>
          {date.getDate()}
        </span>
      </div>
      <div ref={ref} onMouseDown={onMouseDown} className="relative cursor-crosshair select-none" style={{ height: HOURS.length * HOUR_PX }}>
        {HOURS.map((_, i) => (
          <div key={i} style={{ height: HOUR_PX }} className="border-b border-border/70" />
        ))}
        {overlay}
        {appointments.map((a) => (
          <ApptCard
            key={a.id}
            appt={a}
            worker={workers.find((w) => w.id === a.worker_id)}
            service={services.find((s) => s.id === a.service_id)}
            onClick={() => onPick(a)}
            compact
          />
        ))}
      </div>
    </div>
  );
}

/* =====================================================================================
 * Month Grid
 * ===================================================================================*/
function MonthGrid({
  month, workers, appointments, onPickDay,
}: {
  month: Date; workers: Worker[]; appointments: Appointment[]; onPickDay: (d: Date) => void;
}) {
  const first = startOfMonth(month);
  const gridStart = startOfWeek(first);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const today = startOfDay(new Date());
  const labels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  return (
    <div className="silex-card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border bg-surface-muted/60">
        {labels.map((l) => (
          <div key={l} className="px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{l}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 grid-rows-6">
        {days.map((d, i) => {
          const inMonth = d.getMonth() === month.getMonth();
          const isToday = sameDay(d, today);
          const dayAppts = appointments.filter((a) => sameDay(new Date(a.starts_at), d));
          return (
            <button
              key={i}
              onClick={() => onPickDay(d)}
              className={cn(
                "min-h-[110px] border-r border-b border-border p-2 text-left transition-colors hover:bg-accent/40",
                !inMonth && "bg-surface-muted/30 text-muted-foreground",
                (i + 1) % 7 === 0 && "border-r-0"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "text-xs font-semibold inline-flex h-6 w-6 items-center justify-center rounded-full",
                    isToday && "bg-primary text-primary-foreground"
                  )}
                >
                  {d.getDate()}
                </span>
                {dayAppts.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">{dayAppts.length}</span>
                )}
              </div>
              <div className="space-y-1">
                {dayAppts.slice(0, 3).map((a) => {
                  const w = workers.find((x) => x.id === a.worker_id);
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-1 text-[11px] truncate rounded px-1.5 py-0.5"
                      style={{
                        background: `color-mix(in oklab, ${w?.color ?? "#7c3aed"} 12%, var(--card))`,
                        boxShadow: `inset 2px 0 0 0 ${w?.color ?? "#7c3aed"}`,
                      }}
                    >
                      <span className="font-medium tabular-nums text-muted-foreground">
                        {fmtTime(new Date(a.starts_at))}
                      </span>
                      <span className="truncate">{a.customer_name}</span>
                    </div>
                  );
                })}
                {dayAppts.length > 3 && (
                  <div className="text-[10px] text-muted-foreground pl-1.5">+{dayAppts.length - 3} más</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* =====================================================================================
 * Appointment Dialog
 * ===================================================================================*/
function AppointmentDialog({
  open, onOpenChange, appointment, defaultDate, draft,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  appointment: Appointment | null;
  defaultDate: Date;
  draft: DraftRange;
}) {
  const { data: workers = [] } = useWorkers();
  const { data: services = [] } = useServices();

  const initial = useMemo(() => {
    if (appointment) {
      const s = new Date(appointment.starts_at);
      const e = new Date(appointment.ends_at);
      return {
        worker_id: appointment.worker_id,
        service_id: appointment.service_id ?? "",
        customer_name: appointment.customer_name,
        customer_phone: appointment.customer_phone ?? "",
        customer_email: appointment.customer_email ?? "",
        date: toDateInput(s),
        start: toTimeInput(s),
        end: toTimeInput(e),
        notes: appointment.notes ?? "",
      };
    }
    if (draft) {
      return {
        worker_id: draft.worker_id ?? workers[0]?.id ?? "",
        service_id: "",
        customer_name: "",
        customer_phone: "",
        customer_email: "",
        date: toDateInput(draft.date),
        start: toTimeInput(draft.start),
        end: toTimeInput(draft.end),
        notes: "",
      };
    }
    return {
      worker_id: workers[0]?.id ?? "",
      service_id: "",
      customer_name: "",
      customer_phone: "",
      customer_email: "",
      date: toDateInput(defaultDate),
      start: "10:00",
      end: "10:30",
      notes: "",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment, draft, open]);

  const [form, setForm] = useState(initial);
  useEffect(() => {
    if (open) setForm(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = useMut({
    fn: async () => {
      const starts_at = new Date(`${form.date}T${form.start}:00`).toISOString();
      const ends_at = new Date(`${form.date}T${form.end}:00`).toISOString();
      const payload = {
        worker_id: form.worker_id,
        service_id: form.service_id || null,
        customer_name: form.customer_name,
        customer_phone: form.customer_phone || null,
        customer_email: form.customer_email || null,
        starts_at,
        ends_at,
        notes: form.notes || null,
      };
      if (appointment) {
        const { error } = await supabase.from("appointments").update(payload).eq("id", appointment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("appointments").insert({ ...payload, source: "manual" });
        if (error) throw error;
      }
    },
    success: appointment ? "Cita actualizada" : "Cita creada",
    invalidate: ["appointments"],
  });

  const remove = useMut({
    fn: async () => {
      if (!appointment) return;
      const { error } = await supabase.from("appointments").delete().eq("id", appointment.id);
      if (error) throw error;
    },
    success: "Cita eliminada",
    invalidate: ["appointments"],
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalIcon className="h-4 w-4 text-primary" />
            {appointment ? "Editar cita" : "Nueva cita"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Cliente" full>
            <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
          </Field>
          <Field label="Teléfono">
            <Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} />
          </Field>
          <Field label="Trabajador">
            <Select value={form.worker_id} onValueChange={(v) => setForm({ ...form, worker_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
              <SelectContent>
                {workers.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Servicio">
            <Select value={form.service_id || "_none"} onValueChange={(v) => setForm({ ...form, service_id: v === "_none" ? "" : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Ninguno</SelectItem>
                {services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Fecha">
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Inicio">
            <Input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
          </Field>
          <Field label="Fin">
            <Input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
          </Field>
          <Field label="Notas" full>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          {appointment?.source === "ai" && (
            <div className="col-span-2">
              <Badge variant="secondary" className="gap-1"><Bot className="h-3 w-3" /> Creada por el agente IA</Badge>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          {appointment && (
            <Button variant="destructive" onClick={() => { remove.mutate(); onOpenChange(false); }}>
              Eliminar
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => {
              if (!form.customer_name || !form.worker_id) {
                toast.error("Cliente y trabajador son obligatorios");
                return;
              }
              save.mutate(undefined, { onSuccess: () => onOpenChange(false) });
            }}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", full && "col-span-2")}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function toDateInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function toTimeInput(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
