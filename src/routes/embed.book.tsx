import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Check, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/embed/book")({
  head: () => ({
    meta: [
      { title: "Reservar cita" },
      { name: "description", content: "Reserva tu cita en línea, en menos de un minuto." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EmbedBookPage,
});

type Worker = { id: string; name: string; color: string; active: boolean };
type Service = { id: string; name: string; duration_minutes: number; price_cents: number; currency: string };
type Slot = { worker_id: string; worker_name: string; start: string; end: string };

function todayStr() { return new Date().toISOString().slice(0, 10); }

function EmbedBookPage() {
  const [config, setConfig] = useState<{ services: Service[]; workers: Worker[]; worker_services: { worker_id: string; service_id: string }[]; business: { business_name: string } | null } | null>(null);
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState<string>("");
  const [workerId, setWorkerId] = useState<string>("");
  const [date, setDate] = useState(todayStr());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotKey, setSlotKey] = useState<string>("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ when: string; service?: string; worker: string } | null>(null);

  useEffect(() => {
    fetch("/api/public/booking/config").then((r) => r.json()).then(setConfig);
  }, []);

  const eligibleWorkers = useMemo(() => {
    if (!config) return [];
    if (!serviceId) return config.workers;
    const ids = new Set(config.worker_services.filter((w) => w.service_id === serviceId).map((w) => w.worker_id));
    return config.workers.filter((w) => ids.has(w.id));
  }, [config, serviceId]);

  const fetchSlots = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date });
      if (serviceId) params.set("service_id", serviceId);
      if (workerId) params.set("worker_id", workerId);
      const r = await fetch(`/api/public/booking/availability?${params}`);
      const data = await r.json();
      setSlots(data.slots ?? []);
    } finally { setLoading(false); }
  };

  useEffect(() => { if (step === 3) fetchSlots(); /* eslint-disable-next-line */ }, [step, date, workerId, serviceId]);

  const selectedSlot = slots.find((s) => `${s.worker_id}|${s.start}` === slotKey);

  const submit = async () => {
    if (!selectedSlot) return;
    setLoading(true);
    try {
      const r = await fetch("/api/public/booking/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          worker_id: selectedSlot.worker_id,
          service_id: serviceId || null,
          customer_name: name,
          customer_phone: phone || null,
          customer_email: email || null,
          starts_at: selectedSlot.start,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error al reservar");
      const svc = config?.services.find((s) => s.id === serviceId);
      setDone({ when: new Date(selectedSlot.start).toLocaleString("es-ES", { dateStyle: "full", timeStyle: "short" }), service: svc?.name, worker: selectedSlot.worker_name });
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setLoading(false); }
  };

  if (!config) return <Shell><div className="text-sm text-muted-foreground">Cargando…</div></Shell>;

  if (done) {
    return (
      <Shell>
        <div className="text-center py-8">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
            <Check className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-semibold">¡Cita confirmada!</h2>
          <p className="text-sm text-muted-foreground mt-2">{done.when}</p>
          {done.service && <p className="text-sm mt-1">{done.service} con <span className="font-medium">{done.worker}</span></p>}
          <Button className="mt-6" onClick={() => { setDone(null); setStep(1); setSlotKey(""); setName(""); setPhone(""); setEmail(""); }}>Reservar otra</Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell business={config.business?.business_name}>
      <Stepper step={step} />

      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Servicio</Label>
            <Select value={serviceId} onValueChange={(v) => { setServiceId(v); setWorkerId(""); }}>
              <SelectTrigger><SelectValue placeholder="Elige un servicio" /></SelectTrigger>
              <SelectContent>
                {config.services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} — {s.duration_minutes}min · {(s.price_cents / 100).toFixed(2)} {s.currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" disabled={!serviceId} onClick={() => setStep(2)}>
            Continuar <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Profesional</Label>
            <Select value={workerId || "any"} onValueChange={(v) => setWorkerId(v === "any" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Cualquiera disponible</SelectItem>
                {eligibleWorkers.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Fecha</Label>
            <Input type="date" min={todayStr()} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4 mr-1" /> Atrás</Button>
            <Button className="flex-1" onClick={() => setStep(3)}>Ver horas <ArrowRight className="h-4 w-4 ml-1" /></Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="text-xs text-muted-foreground">{slots.length} huecos disponibles · {date}</div>
          {loading ? <div className="text-sm text-muted-foreground">Cargando…</div> : (
            <div className="grid grid-cols-3 gap-2 max-h-72 overflow-auto">
              {slots.map((s) => {
                const k = `${s.worker_id}|${s.start}`;
                const t = new Date(s.start).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
                return (
                  <button key={k} onClick={() => setSlotKey(k)}
                    className={`rounded-lg border px-2 py-2 text-xs transition ${slotKey === k ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:border-primary/50"}`}>
                    <div className="font-medium">{t}</div>
                    {!workerId && <div className="text-[10px] text-muted-foreground truncate">{s.worker_name}</div>}
                  </button>
                );
              })}
              {slots.length === 0 && <div className="col-span-3 text-sm text-muted-foreground py-6 text-center">Sin huecos en esta fecha.</div>}
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4 mr-1" /></Button>
            <Button className="flex-1" disabled={!slotKey} onClick={() => setStep(4)}>Continuar <ArrowRight className="h-4 w-4 ml-1" /></Button>
          </div>
        </div>
      )}

      {step === 4 && selectedSlot && (
        <div className="space-y-4">
          <div className="rounded-lg bg-accent/40 p-3 text-xs">
            <div className="font-medium">{new Date(selectedSlot.start).toLocaleString("es-ES", { dateStyle: "full", timeStyle: "short" })}</div>
            <div className="text-muted-foreground">con {selectedSlot.worker_name}</div>
          </div>
          <Field label="Nombre completo *"><Input value={name} onChange={(e) => setName(e.target.value)} required /></Field>
          <Field label="Teléfono"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep(3)}><ArrowLeft className="h-4 w-4 mr-1" /></Button>
            <Button className="flex-1" disabled={!name || loading} onClick={submit}>Confirmar reserva</Button>
          </div>
        </div>
      )}
    </Shell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? "bg-primary" : "bg-border"}`} />
      ))}
    </div>
  );
}

function Shell({ children, business }: { children: React.ReactNode; business?: string }) {
  return (
    <div className="min-h-screen bg-background flex items-start justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-sm">{business ?? "Reservas"}</div>
            <div className="text-xs text-muted-foreground">Reserva tu cita</div>
          </div>
        </div>
        <div className="silex-card p-5">{children}</div>
        <p className="text-center text-[10px] text-muted-foreground mt-3">Powered by SILEX</p>
      </div>
    </div>
  );
}
