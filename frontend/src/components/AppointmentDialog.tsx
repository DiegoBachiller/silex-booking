import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Bot, Calendar as CalIcon } from "lucide-react";
import { useWorkers, useServices, useMut, type Appointment } from "@/hooks/useSilexData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type AppointmentDraft = {
  worker_id?: string;
  date: Date;
  start: Date;
  end: Date;
} | null;

export function AppointmentDialog({
  open,
  onOpenChange,
  appointment = null,
  defaultDate,
  draft = null,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  appointment?: Appointment | null;
  defaultDate?: Date;
  draft?: AppointmentDraft;
}) {
  const { data: workers = [] } = useWorkers();
  const { data: services = [] } = useServices();
  const baseDate = defaultDate ?? new Date();

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
      date: toDateInput(baseDate),
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
