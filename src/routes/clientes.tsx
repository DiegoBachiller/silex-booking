import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Pencil, Search, Users, Mail, Phone, Calendar as CalIcon } from "lucide-react";
import { useAppointments, useWorkers, useServices, useMut } from "@/hooks/useSilexData";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — SILEX" },
      { name: "description", content: "Base de clientes de tu negocio con su historial de citas." },
    ],
  }),
  component: ClientesPage,
});

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
};

function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers" as never).select("*").order("name");
      if (error) throw error;
      return (data as unknown as Customer[]) ?? [];
    },
  });
}

function ClientesPage() {
  const { data: customers = [] } = useCustomers();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [selected, setSelected] = useState<Customer | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone ?? "").toLowerCase().includes(q),
    );
  }, [customers, search]);

  return (
    <AppShell>
      <PageHeader
        title="Clientes"
        description="Tu base de clientes y el historial de sus citas."
        actions={
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Nuevo cliente
          </Button>
        }
      />
      <div className="px-4 sm:px-6 md:px-10 py-5 md:py-6 space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o teléfono…"
            className="pl-9"
          />
        </div>

        {customers.length === 0 ? (
          <div className="silex-card p-12 text-center">
            <div className="mx-auto h-12 w-12 rounded-xl bg-accent flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-accent-foreground" />
            </div>
            <h3 className="text-base font-semibold mb-1">Aún no hay clientes</h3>
            <p className="text-sm text-muted-foreground mb-4">Crea tu primer cliente para empezar a guardar su ficha y su historial.</p>
            <Button onClick={() => { setEditing(null); setOpen(true); }}>Crear cliente</Button>
          </div>
        ) : (
          <div className="silex-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-xs text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Nombre</th>
                  <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">Teléfono</th>
                  <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Email</th>
                  <th className="text-right font-medium px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className="border-t border-border hover:bg-surface-muted/50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{c.name}</div>
                      <div className="sm:hidden text-xs text-muted-foreground">{c.phone ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{c.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{c.email ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); setEditing(c); setOpen(true); }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      Sin resultados para “{search}”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CustomerDialog open={open} onOpenChange={setOpen} customer={editing} />
      <CustomerSheet customer={selected} onClose={() => setSelected(null)} onEdit={(c) => { setSelected(null); setEditing(c); setOpen(true); }} />
    </AppShell>
  );
}

function CustomerDialog({ open, onOpenChange, customer }: { open: boolean; onOpenChange: (v: boolean) => void; customer: Customer | null }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  useEffect(() => {
    if (!open) return;
    setForm({
      name: customer?.name ?? "",
      phone: customer?.phone ?? "",
      email: customer?.email ?? "",
      notes: customer?.notes ?? "",
    });
  }, [open, customer]);

  const save = useMut({
    fn: async () => {
      const payload = {
        name: form.name,
        phone: form.phone || null,
        email: form.email || null,
        notes: form.notes || null,
      };
      if (customer) {
        const { error } = await supabase.from("customers" as never).update(payload).eq("id", customer.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("customers" as never).insert(payload);
        if (error) throw error;
      }
    },
    success: customer ? "Cliente actualizado" : "Cliente creado",
    invalidate: ["customers"],
  });

  const remove = useMut({
    fn: async () => {
      if (!customer) return;
      const { error } = await supabase.from("customers" as never).delete().eq("id", customer.id);
      if (error) throw error;
    },
    success: "Cliente eliminado",
    invalidate: ["customers"],
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{customer ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nombre</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Teléfono</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Notas</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          {customer && (
            <Button variant="destructive" onClick={() => { remove.mutate(); onOpenChange(false); }}>
              Eliminar
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => {
              if (!form.name.trim()) return;
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

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  scheduled: { label: "Programada", color: "#6366f1" },
  completed: { label: "Completada", color: "#10b981" },
  cancelled: { label: "Cancelada", color: "#ef4444" },
  no_show: { label: "No asistió", color: "#f59e0b" },
};

function CustomerSheet({ customer, onClose, onEdit }: { customer: Customer | null; onClose: () => void; onEdit: (c: Customer) => void }) {
  const { data: appointments = [] } = useAppointments();
  const { data: workers = [] } = useWorkers();
  const { data: services = [] } = useServices();

  const history = useMemo(() => {
    if (!customer) return [];
    return appointments
      .filter((a) =>
        (customer.phone && a.customer_phone === customer.phone) ||
        (customer.email && a.customer_email === customer.email) ||
        a.customer_name.toLowerCase() === customer.name.toLowerCase(),
      )
      .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
  }, [appointments, customer]);

  return (
    <Sheet open={!!customer} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{customer?.name}</SheetTitle>
        </SheetHeader>
        {customer && (
          <div className="mt-6 space-y-5">
            <div className="silex-card p-4 space-y-2 text-sm">
              {customer.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {customer.phone}</div>}
              {customer.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {customer.email}</div>}
              {customer.notes && (
                <div className="pt-2 border-t border-border text-muted-foreground whitespace-pre-wrap">
                  {customer.notes}
                </div>
              )}
              <div className="pt-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(customer)} className="gap-2">
                  <Pencil className="h-3.5 w-3.5" /> Editar ficha
                </Button>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-2">
                <CalIcon className="h-3.5 w-3.5" /> Historial de citas
              </div>
              {history.length === 0 ? (
                <div className="text-sm text-muted-foreground silex-card p-4 text-center">
                  Sin citas registradas.
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((a) => {
                    const w = workers.find((x) => x.id === a.worker_id);
                    const s = services.find((x) => x.id === a.service_id);
                    const st = STATUS_LABEL[a.status] ?? STATUS_LABEL.scheduled;
                    const d = new Date(a.starts_at);
                    return (
                      <div
                        key={a.id}
                        className="silex-card p-3 text-sm"
                        style={{ boxShadow: `inset 3px 0 0 0 ${w?.color ?? "#6366f1"}` }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium">
                            {d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                            <span className="text-muted-foreground"> · {d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          <Badge
                            variant="secondary"
                            style={{
                              background: `color-mix(in oklab, ${st.color} 14%, transparent)`,
                              color: st.color,
                            }}
                          >
                            {st.label}
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {s?.name ?? "Sin servicio"} · {w?.name ?? "—"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
