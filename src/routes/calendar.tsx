import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Bot, User } from "lucide-react";
import { useAppointments, useServices, useWorkers, useMut, type Appointment } from "@/hooks/useSilexData";
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

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7..20

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function CalendarPage() {
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const { data: workers = [] } = useWorkers();
  const { data: services = [] } = useServices();
  const { data: appointments = [] } = useAppointments();

  const dayAppts = useMemo(() => {
    const start = day.getTime();
    const end = start + 86_400_000;
    return appointments.filter((a) => {
      const t = new Date(a.starts_at).getTime();
      return t >= start && t < end;
    });
  }, [appointments, day]);

  const activeWorkers = workers.filter((w) => w.active);

  return (
    <AppShell>
      <PageHeader
        title="Calendario"
        description="Vista multi-trabajador. Las reservas creadas por el agente IA aparecen marcadas."
        actions={
          <>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
              <Button size="icon" variant="ghost" onClick={() => setDay(new Date(day.getTime() - 86400000))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <button
                onClick={() => setDay(startOfDay(new Date()))}
                className="px-3 text-sm font-medium hover:text-primary transition-colors"
              >
                {day.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
              </button>
              <Button size="icon" variant="ghost" onClick={() => setDay(new Date(day.getTime() + 86400000))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Nueva cita
            </Button>
          </>
        }
      />

      <div className="px-6 md:px-10 py-6">
        {activeWorkers.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="silex-card overflow-hidden">
            <div className="overflow-x-auto">
              <div
                className="grid min-w-[700px]"
                style={{ gridTemplateColumns: `64px repeat(${activeWorkers.length}, minmax(180px, 1fr))` }}
              >
                {/* Header */}
                <div className="border-b border-border bg-surface-muted h-12" />
                {activeWorkers.map((w) => (
                  <div key={w.id} className="border-b border-l border-border bg-surface-muted px-3 py-3 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: w.color }} />
                    <span className="text-sm font-medium truncate">{w.name}</span>
                  </div>
                ))}

                {/* Hours grid */}
                {HOURS.map((h) => (
                  <div key={`row-${h}`} className="contents">
                    <div className="h-16 border-b border-border text-[11px] text-muted-foreground px-2 pt-1">
                      {String(h).padStart(2, "0")}:00
                    </div>
                    {activeWorkers.map((w) => (
                      <div key={`${w.id}-${h}`} className="relative h-16 border-b border-l border-border" />
                    ))}
                  </div>
                ))}

                {/* Appointments overlay (absolute per worker column) */}
                {activeWorkers.map((w, colIdx) => {
                  const items = dayAppts.filter((a) => a.worker_id === w.id);
                  return items.map((a) => {
                    const start = new Date(a.starts_at);
                    const end = new Date(a.ends_at);
                    const startMinutes = start.getHours() * 60 + start.getMinutes() - HOURS[0] * 60;
                    const duration = (end.getTime() - start.getTime()) / 60000;
                    if (startMinutes < 0 || startMinutes > HOURS.length * 60) return null;
                    const top = (startMinutes / 60) * 64 + 48; // 48 = header h
                    const height = Math.max((duration / 60) * 64 - 4, 28);
                    const left = `calc(64px + ${colIdx} * ((100% - 64px) / ${activeWorkers.length}) + 4px)`;
                    const width = `calc((100% - 64px) / ${activeWorkers.length} - 8px)`;
                    const service = services.find((s) => s.id === a.service_id);
                    const isAi = a.source === "ai";
                    return (
                      <button
                        key={a.id}
                        onClick={() => { setEditing(a); setOpen(true); }}
                        className={cn(
                          "absolute rounded-md border text-left px-2 py-1.5 transition-all hover:shadow-floating overflow-hidden",
                          a.status === "cancelled" && "opacity-50 line-through"
                        )}
                        style={{
                          top,
                          left,
                          width,
                          height,
                          background: `color-mix(in oklab, ${w.color} 14%, var(--card))`,
                          borderColor: `color-mix(in oklab, ${w.color} 50%, transparent)`,
                        }}
                      >
                        <div className="flex items-center gap-1 text-[11px] font-medium text-foreground truncate">
                          {isAi ? <Bot className="h-3 w-3 shrink-0" /> : <User className="h-3 w-3 shrink-0" />}
                          {a.customer_name}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {service?.name ?? "Sin servicio"} · {start.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </button>
                    );
                  });
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <AppointmentDialog
        open={open}
        onOpenChange={setOpen}
        appointment={editing}
        defaultDate={day}
      />
    </AppShell>
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

function AppointmentDialog({
  open,
  onOpenChange,
  appointment,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  appointment: Appointment | null;
  defaultDate: Date;
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
        date: s.toISOString().slice(0, 10),
        start: s.toTimeString().slice(0, 5),
        end: e.toTimeString().slice(0, 5),
        notes: appointment.notes ?? "",
      };
    }
    const d = new Date(defaultDate);
    return {
      worker_id: workers[0]?.id ?? "",
      service_id: "",
      customer_name: "",
      customer_phone: "",
      customer_email: "",
      date: d.toISOString().slice(0, 10),
      start: "10:00",
      end: "10:30",
      notes: "",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment, open]);

  const [form, setForm] = useState(initial);
  useMemoSync(initial, setForm, open);

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
          <DialogTitle>{appointment ? "Editar cita" : "Nueva cita"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
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
          <Button onClick={() => { if (!form.customer_name || !form.worker_id) { toast.error("Cliente y trabajador son obligatorios"); return; } save.mutate(undefined, { onSuccess: () => onOpenChange(false) }); }}>
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

function useMemoSync<T>(value: T, setter: (v: T) => void, open: boolean) {
  useEffect(() => {
    if (open) setter(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
