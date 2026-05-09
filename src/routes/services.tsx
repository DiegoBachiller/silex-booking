import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Wrench } from "lucide-react";
import { useServices, useMut, type Service } from "@/hooks/useSilexData";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Servicios — SILEX" },
      { name: "description", content: "Catálogo global de servicios con duración y precio." },
    ],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  const { data: services = [] } = useServices();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);

  return (
    <AppShell>
      <PageHeader
        title="Servicios"
        description="Catálogo global. Asigna servicios a cada trabajador desde la página Equipo."
        actions={
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Nuevo servicio
          </Button>
        }
      />
      <div className="px-4 sm:px-6 md:px-10 py-5 md:py-6">
        {services.length === 0 ? (
          <div className="silex-card p-12 text-center">
            <div className="mx-auto h-12 w-12 rounded-xl bg-accent flex items-center justify-center mb-4">
              <Wrench className="h-6 w-6 text-accent-foreground" />
            </div>
            <h3 className="text-base font-semibold mb-1">No hay servicios todavía</h3>
            <p className="text-sm text-muted-foreground mb-4">Crea tu primer servicio para que los clientes puedan reservarlo.</p>
            <Button onClick={() => { setEditing(null); setOpen(true); }}>Crear servicio</Button>
          </div>
        ) : (
          <div className="silex-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-xs text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Nombre</th>
                  <th className="text-left font-medium px-4 py-3">Duración</th>
                  <th className="text-left font-medium px-4 py-3">Precio</th>
                  <th className="text-right font-medium px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id} className="border-t border-border hover:bg-surface-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium">{s.name}</div>
                      {s.description && <div className="text-xs text-muted-foreground">{s.description}</div>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{s.duration_minutes} min</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatCurrency(s.price_cents, s.currency)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(s); setOpen(true); }}>
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
      <ServiceDialog open={open} onOpenChange={setOpen} service={editing} />
    </AppShell>
  );
}

function ServiceDialog({ open, onOpenChange, service }: { open: boolean; onOpenChange: (v: boolean) => void; service: Service | null }) {
  const [form, setForm] = useState({
    name: "", description: "", duration_minutes: 30, price_cents: 0, currency: "EUR", active: true,
  });
  useEffect(() => {
    if (!open) return;
    setForm({
      name: service?.name ?? "",
      description: service?.description ?? "",
      duration_minutes: service?.duration_minutes ?? 30,
      price_cents: service?.price_cents ?? 0,
      currency: service?.currency ?? "EUR",
      active: service?.active ?? true,
    });
  }, [open, service]);

  const save = useMut({
    fn: async () => {
      if (service) {
        const { error } = await supabase.from("services").update(form).eq("id", service.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("services").insert(form);
        if (error) throw error;
      }
    },
    success: service ? "Servicio actualizado" : "Servicio creado",
    invalidate: ["services"],
  });

  const remove = useMut({
    fn: async () => {
      if (!service) return;
      const { error } = await supabase.from("services").delete().eq("id", service.id);
      if (error) throw error;
    },
    success: "Servicio eliminado",
    invalidate: ["services"],
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{service ? "Editar servicio" : "Nuevo servicio"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nombre</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Descripción</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Duración (min)</Label>
              <Input type="number" min={5} step={5} value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Precio (€)</Label>
              <Input type="number" min={0} step={1} value={form.price_cents / 100}
                onChange={(e) => setForm({ ...form, price_cents: Math.round(Number(e.target.value) * 100) })} />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          {service && <Button variant="destructive" onClick={() => { remove.mutate(); onOpenChange(false); }}>Eliminar</Button>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => save.mutate(undefined, { onSuccess: () => onOpenChange(false) })}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
