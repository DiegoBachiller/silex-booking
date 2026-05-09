import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Clock, Mail, Phone } from "lucide-react";
import { useWorkers, useServices, useWorkerServices, useSchedules, useMut, type Worker } from "@/hooks/useSilexData";
import { supabase } from "@/integrations/supabase/client";
import { DAY_NAMES_SHORT } from "@/lib/format";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Equipo — SILEX" },
      { name: "description", content: "Crea y edita perfiles de trabajadores, sus servicios y horarios semanales." },
    ],
  }),
  component: TeamPage,
});

const PALETTE = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#0ea5e9"];

function TeamPage() {
  const { data: workers = [] } = useWorkers();
  const { data: services = [] } = useServices();
  const { data: ws = [] } = useWorkerServices();
  const { data: schedules = [] } = useSchedules();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Worker | null>(null);

  return (
    <AppShell>
      <PageHeader
        title="Equipo"
        description="Gestiona los trabajadores, los servicios que ofrecen y sus horarios."
        actions={
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Nuevo trabajador
          </Button>
        }
      />

      <div className="px-4 sm:px-6 md:px-10 py-5 md:py-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {workers.length === 0 && (
          <div className="silex-card p-8 col-span-full text-center text-sm text-muted-foreground">
            Aún no hay trabajadores. Añade el primero para empezar.
          </div>
        )}
        {workers.map((w) => {
          const wsList = ws.filter((x) => x.worker_id === w.id);
          const sch = schedules.filter((s) => s.worker_id === w.id);
          return (
            <div key={w.id} className="silex-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-full flex items-center justify-center font-semibold text-white" style={{ background: w.color }}>
                    {w.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{w.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {w.active ? "Activo" : "Inactivo"}
                    </div>
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => { setEditing(w); setOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                {w.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {w.email}</div>}
                {w.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {w.phone}</div>}
                <div className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {sch.length} bloques de horario</div>
              </div>
              {wsList.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {wsList.map((x) => {
                    const s = services.find((sv) => sv.id === x.service_id);
                    return s ? <Badge key={x.service_id} variant="secondary">{s.name}</Badge> : null;
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <WorkerDialog open={open} onOpenChange={setOpen} worker={editing} />
    </AppShell>
  );
}

function WorkerDialog({ open, onOpenChange, worker }: { open: boolean; onOpenChange: (v: boolean) => void; worker: Worker | null }) {
  const { data: services = [] } = useServices();
  const { data: ws = [] } = useWorkerServices();
  const { data: schedules = [] } = useSchedules();

  const [form, setForm] = useState({
    name: worker?.name ?? "",
    email: worker?.email ?? "",
    phone: worker?.phone ?? "",
    color: worker?.color ?? PALETTE[0],
    active: worker?.active ?? true,
  });
  const [selectedServices, setSelectedServices] = useState<string[]>(
    worker ? ws.filter((x) => x.worker_id === worker.id).map((x) => x.service_id) : []
  );
  const [weekly, setWeekly] = useState<{ enabled: boolean; start: string; end: string }[]>(() => {
    const base = Array.from({ length: 7 }, () => ({ enabled: false, start: "09:00", end: "18:00" }));
    if (worker) {
      schedules.filter((s) => s.worker_id === worker.id).forEach((s) => {
        base[s.day_of_week] = { enabled: true, start: s.start_time.slice(0, 5), end: s.end_time.slice(0, 5) };
      });
    } else {
      [1, 2, 3, 4, 5].forEach((d) => (base[d] = { enabled: true, start: "09:00", end: "18:00" }));
    }
    return base;
  });

  // re-init when reopened
  useResetOnOpen(open, worker, ws, schedules, setForm, setSelectedServices, setWeekly);

  const save = useMut({
    fn: async () => {
      let workerId = worker?.id;
      if (worker) {
        const { error } = await supabase.from("workers").update(form).eq("id", worker.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("workers").insert(form).select().single();
        if (error) throw error;
        workerId = data.id;
      }
      // Replace worker_services
      await supabase.from("worker_services").delete().eq("worker_id", workerId!);
      if (selectedServices.length) {
        await supabase
          .from("worker_services")
          .insert(selectedServices.map((sid) => ({ worker_id: workerId!, service_id: sid })));
      }
      // Replace schedules
      await supabase.from("schedules").delete().eq("worker_id", workerId!);
      const rows = weekly
        .map((d, i) => (d.enabled ? { worker_id: workerId!, day_of_week: i, start_time: d.start, end_time: d.end } : null))
        .filter(Boolean) as { worker_id: string; day_of_week: number; start_time: string; end_time: string }[];
      if (rows.length) await supabase.from("schedules").insert(rows);
    },
    success: worker ? "Trabajador actualizado" : "Trabajador creado",
    invalidate: ["workers", "worker_services", "schedules"],
  });

  const remove = useMut({
    fn: async () => {
      if (!worker) return;
      const { error } = await supabase.from("workers").delete().eq("id", worker.id);
      if (error) throw error;
    },
    success: "Trabajador eliminado",
    invalidate: ["workers"],
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{worker ? "Editar trabajador" : "Nuevo trabajador"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nombre</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Teléfono</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="col-span-2 space-y-2">
            <Label className="text-xs text-muted-foreground">Color del calendario</Label>
            <div className="flex gap-2">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, color: c })}
                  className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ background: c, borderColor: form.color === c ? "var(--ring)" : "transparent" }}
                />
              ))}
            </div>
          </div>
          <div className="col-span-2 flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <div className="text-sm font-medium">Activo</div>
              <div className="text-xs text-muted-foreground">Si está inactivo, no aparece en el calendario.</div>
            </div>
            <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
          </div>
        </div>

        <div className="mt-2">
          <div className="text-sm font-medium mb-2">Servicios que ofrece</div>
          {services.length === 0 ? (
            <div className="text-xs text-muted-foreground">Crea servicios primero en la página Servicios.</div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {services.map((s) => (
                <label key={s.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 cursor-pointer hover:bg-accent/50">
                  <Checkbox
                    checked={selectedServices.includes(s.id)}
                    onCheckedChange={(v) => setSelectedServices(v ? [...selectedServices, s.id] : selectedServices.filter((x) => x !== s.id))}
                  />
                  <span className="text-sm">{s.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="mt-2">
          <div className="text-sm font-medium mb-2">Horario semanal</div>
          <div className="space-y-1.5">
            {weekly.map((d, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
                <div className="w-16 flex items-center gap-2">
                  <Checkbox checked={d.enabled} onCheckedChange={(v) => { const n = [...weekly]; n[i] = { ...n[i], enabled: !!v }; setWeekly(n); }} />
                  <span className="text-xs font-medium">{DAY_NAMES_SHORT[i]}</span>
                </div>
                <Input type="time" value={d.start} disabled={!d.enabled} onChange={(e) => { const n = [...weekly]; n[i] = { ...n[i], start: e.target.value }; setWeekly(n); }} className="h-8" />
                <span className="text-xs text-muted-foreground">a</span>
                <Input type="time" value={d.end} disabled={!d.enabled} onChange={(e) => { const n = [...weekly]; n[i] = { ...n[i], end: e.target.value }; setWeekly(n); }} className="h-8" />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2">
          {worker && <Button variant="destructive" onClick={() => { remove.mutate(); onOpenChange(false); }}>Eliminar</Button>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => save.mutate(undefined, { onSuccess: () => onOpenChange(false) })}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect } from "react";
function useResetOnOpen(open: boolean, worker: Worker | null, ws: { worker_id: string; service_id: string }[], schedules: { worker_id: string; day_of_week: number; start_time: string; end_time: string }[], setForm: (v: { name: string; email: string; phone: string; color: string; active: boolean }) => void, setSelectedServices: (v: string[]) => void, setWeekly: (v: { enabled: boolean; start: string; end: string }[]) => void) {
  useEffect(() => {
    if (!open) return;
    setForm({
      name: worker?.name ?? "",
      email: worker?.email ?? "",
      phone: worker?.phone ?? "",
      color: worker?.color ?? PALETTE[0],
      active: worker?.active ?? true,
    });
    setSelectedServices(worker ? ws.filter((x) => x.worker_id === worker.id).map((x) => x.service_id) : []);
    const base = Array.from({ length: 7 }, () => ({ enabled: false, start: "09:00", end: "18:00" }));
    if (worker) {
      schedules.filter((s) => s.worker_id === worker.id).forEach((s) => {
        base[s.day_of_week] = { enabled: true, start: s.start_time.slice(0, 5), end: s.end_time.slice(0, 5) };
      });
    } else {
      [1, 2, 3, 4, 5].forEach((d) => (base[d] = { enabled: true, start: "09:00", end: "18:00" }));
    }
    setWeekly(base);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, worker?.id]);
}
