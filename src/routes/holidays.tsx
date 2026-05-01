import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, CalendarOff } from "lucide-react";
import { useHolidays, useWorkers, useMut, type Holiday } from "@/hooks/useSilexData";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/holidays")({
  head: () => ({
    meta: [
      { title: "Festivos y vacaciones — SILEX" },
      { name: "description", content: "Bloquea fechas globales o de un trabajador concreto. La IA respetará estas fechas." },
    ],
  }),
  component: HolidaysPage,
});

function HolidaysPage() {
  const { data: holidays = [] } = useHolidays();
  const { data: workers = [] } = useWorkers();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Holiday | null>(null);

  return (
    <AppShell>
      <PageHeader
        title="Festivos y vacaciones"
        description="Días que el agente IA nunca ofrecerá. Pueden ser globales o solo para un trabajador."
        actions={
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Nuevo bloqueo
          </Button>
        }
      />
      <div className="px-6 md:px-10 py-6">
        {holidays.length === 0 ? (
          <div className="silex-card p-12 text-center">
            <div className="mx-auto h-12 w-12 rounded-xl bg-accent flex items-center justify-center mb-4">
              <CalendarOff className="h-6 w-6 text-accent-foreground" />
            </div>
            <h3 className="text-base font-semibold mb-1">Sin festivos configurados</h3>
            <p className="text-sm text-muted-foreground">Añade tus festivos nacionales o periodos de vacaciones.</p>
          </div>
        ) : (
          <div className="silex-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-xs text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Nombre</th>
                  <th className="text-left font-medium px-4 py-3">Desde</th>
                  <th className="text-left font-medium px-4 py-3">Hasta</th>
                  <th className="text-left font-medium px-4 py-3">Alcance</th>
                  <th className="text-right font-medium px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {holidays.map((h) => (
                  <tr key={h.id} className="border-t border-border hover:bg-surface-muted/50">
                    <td className="px-4 py-3 font-medium">{h.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{h.start_date}</td>
                    <td className="px-4 py-3 text-muted-foreground">{h.end_date}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {h.worker_id ? workers.find((w) => w.id === h.worker_id)?.name ?? "—" : "Todo el equipo"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(h); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <HolidayDialog open={open} onOpenChange={setOpen} holiday={editing} />
    </AppShell>
  );
}

function HolidayDialog({ open, onOpenChange, holiday }: { open: boolean; onOpenChange: (v: boolean) => void; holiday: Holiday | null }) {
  const { data: workers = [] } = useWorkers();
  const [form, setForm] = useState({
    name: "", start_date: "", end_date: "", worker_id: "" as string,
  });
  useEffect(() => {
    if (!open) return;
    const today = new Date().toISOString().slice(0, 10);
    setForm({
      name: holiday?.name ?? "",
      start_date: holiday?.start_date ?? today,
      end_date: holiday?.end_date ?? today,
      worker_id: holiday?.worker_id ?? "",
    });
  }, [open, holiday]);

  const save = useMut({
    fn: async () => {
      const payload = {
        name: form.name,
        start_date: form.start_date,
        end_date: form.end_date,
        worker_id: form.worker_id || null,
      };
      if (holiday) {
        const { error } = await supabase.from("holidays").update(payload).eq("id", holiday.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("holidays").insert(payload);
        if (error) throw error;
      }
    },
    success: holiday ? "Bloqueo actualizado" : "Bloqueo creado",
    invalidate: ["holidays"],
  });

  const remove = useMut({
    fn: async () => {
      if (!holiday) return;
      const { error } = await supabase.from("holidays").delete().eq("id", holiday.id);
      if (error) throw error;
    },
    success: "Bloqueo eliminado",
    invalidate: ["holidays"],
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{holiday ? "Editar bloqueo" : "Nuevo bloqueo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nombre</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Navidad" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Desde</Label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Hasta</Label>
              <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Aplica a</Label>
            <Select value={form.worker_id || "_all"} onValueChange={(v) => setForm({ ...form, worker_id: v === "_all" ? "" : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todo el equipo</SelectItem>
                {workers.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2">
          {holiday && <Button variant="destructive" onClick={() => { remove.mutate(); onOpenChange(false); }}>Eliminar</Button>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => save.mutate(undefined, { onSuccess: () => onOpenChange(false) })}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
