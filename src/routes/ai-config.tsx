import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Copy, Plus, Shield, Trash2, Webhook, Volume2 } from "lucide-react";
import { useAiProfile, useMut, type ApiKey } from "@/hooks/useSilexData";
import { supabase } from "@/integrations/supabase/client";
import { generateApiKey } from "@/lib/api-key";
import { toast } from "sonner";

export const Route = createFileRoute("/ai-config")({
  head: () => ({
    meta: [
      { title: "Agente IA — SILEX" },
      { name: "description", content: "Configura tu asistente de voz: nombre, tono, voz e idioma. Sin tocar el prompt técnico." },
    ],
  }),
  component: AiConfigPage,
});

const VOICES = [
  { id: "rachel", label: "Rachel — femenina, cálida (ES/EN)" },
  { id: "adam", label: "Adam — masculina, profunda (EN)" },
  { id: "bella", label: "Bella — femenina, joven (EN)" },
  { id: "domi", label: "Domi — femenina, segura (EN)" },
  { id: "elli", label: "Elli — femenina, dulce (EN)" },
  { id: "antoni", label: "Antoni — masculina, suave (ES/EN)" },
];

const TONES = [
  { id: "friendly", label: "Amigable y cercano" },
  { id: "formal", label: "Formal y profesional" },
  { id: "casual", label: "Casual y desenfadado" },
  { id: "luxury", label: "Premium y elegante" },
];

const LANGUAGES = [
  { id: "es", label: "Español" },
  { id: "en", label: "English" },
  { id: "fr", label: "Français" },
  { id: "pt", label: "Português" },
];

function AiConfigPage() {
  const { data: profile } = useAiProfile();
  const [form, setForm] = useState({
    business_name: "", agent_name: "", voice: "rachel", tone: "friendly",
    language: "es", greeting: "", business_hours_note: "",
  });

  useEffect(() => {
    if (profile) setForm({
      business_name: profile.business_name,
      agent_name: profile.agent_name,
      voice: profile.voice,
      tone: profile.tone,
      language: profile.language,
      greeting: profile.greeting,
      business_hours_note: profile.business_hours_note ?? "",
    });
  }, [profile]);

  const save = useMut({
    fn: async () => {
      if (!profile) return;
      const { error } = await supabase.from("ai_profile").update(form).eq("id", profile.id);
      if (error) throw error;
    },
    success: "Agente actualizado",
    invalidate: ["ai_profile"],
  });

  return (
    <AppShell>
      <PageHeader
        title="Agente IA"
        description="Configura cómo se presenta tu asistente. El prompt técnico está protegido — tú solo defines la personalidad."
      />
      <div className="px-6 md:px-10 py-6 grid gap-6 lg:grid-cols-3">
        {/* Profile */}
        <div className="silex-card p-6 lg:col-span-2 space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">Personalidad del agente</h2>
              <p className="text-xs text-muted-foreground">Estos campos se inyectan en el prompt base de forma segura.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre del negocio">
              <Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
            </Field>
            <Field label="Nombre del agente">
              <Input value={form.agent_name} onChange={(e) => setForm({ ...form, agent_name: e.target.value })} />
            </Field>
            <Field label="Voz">
              <Select value={form.voice} onValueChange={(v) => setForm({ ...form, voice: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{VOICES.map((v) => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Tono">
              <Select value={form.tone} onValueChange={(v) => setForm({ ...form, tone: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TONES.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Idioma principal">
              <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Mensaje de bienvenida" full>
              <Textarea rows={2} value={form.greeting} onChange={(e) => setForm({ ...form, greeting: e.target.value })} />
            </Field>
            <Field label="Notas de horario (opcional)" full>
              <Textarea rows={2} placeholder="Ej. Cerramos los domingos. Festivos según calendario."
                value={form.business_hours_note} onChange={(e) => setForm({ ...form, business_hours_note: e.target.value })} />
            </Field>
          </div>

          <div className="flex justify-end pt-2 border-t border-border">
            <Button onClick={() => save.mutate()}>Guardar cambios</Button>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <ProtectedPromptCard />
          <ToolsCard />
          <ApiKeysCard />
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={`space-y-1.5 ${full ? "col-span-2" : ""}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ProtectedPromptCard() {
  return (
    <div className="silex-card p-5">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Prompt protegido</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        El prompt técnico que controla la lógica del agente está bloqueado. Solo personalizas la personalidad —
        los pasos de reserva, validaciones y herramientas son inalterables.
      </p>
    </div>
  );
}

function ToolsCard() {
  const tools = [
    { name: "check_availability", desc: "La IA consulta huecos libres respetando horarios y festivos." },
    { name: "book_appointment", desc: "Crea una nueva cita con cliente, servicio, trabajador y hora." },
    { name: "reschedule_appointment", desc: "Cambia la hora o reasigna una cita existente." },
    { name: "cancel_appointment", desc: "Cancela una cita y libera el calendario." },
  ];
  return (
    <div className="silex-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Webhook className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Herramientas (Function Calling)</h3>
      </div>
      <div className="space-y-2">
        {tools.map((t) => (
          <div key={t.name} className="text-xs">
            <code className="font-mono text-[11px] bg-accent text-accent-foreground rounded px-1.5 py-0.5">{t.name}</code>
            <p className="text-muted-foreground mt-1">{t.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function useApiKeys() {
  return useQuery({
    queryKey: ["api_keys_meta"],
    queryFn: async () => {
      // We call our own server endpoint to list keys (safer than exposing the table)
      const res = await fetch("/api/public/admin/api-keys", { method: "GET" });
      if (!res.ok) return [] as ApiKey[];
      return (await res.json()) as ApiKey[];
    },
  });
}

function ApiKeysCard() {
  const { data: keys = [], refetch } = useApiKeys();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [justCreated, setJustCreated] = useState<string | null>(null);

  const create = useMut({
    fn: async () => {
      const key = generateApiKey();
      const res = await fetch("/api/public/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || "Nueva clave", key }),
      });
      if (!res.ok) throw new Error("No se pudo crear la clave");
      setJustCreated(key);
      setName("");
      setCreating(false);
      refetch();
    },
    success: "Clave creada",
    invalidate: ["api_keys_meta"],
  });

  const remove = (id: string) => async () => {
    await fetch(`/api/public/admin/api-keys?id=${id}`, { method: "DELETE" });
    toast.success("Clave eliminada");
    refetch();
  };

  return (
    <div className="silex-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Claves API para Vapi/ElevenLabs</h3>
        </div>
        <Button size="sm" variant="outline" className="h-7 gap-1" onClick={() => setCreating(true)}>
          <Plus className="h-3 w-3" /> Nueva
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Usa estas claves en el header <code className="bg-accent rounded px-1">x-api-key</code> al configurar las
        herramientas en Vapi o ElevenLabs.
      </p>

      {creating && (
        <div className="flex gap-2 mb-3">
          <Input placeholder="Nombre (ej. Vapi prod)" value={name} onChange={(e) => setName(e.target.value)} className="h-8" />
          <Button size="sm" onClick={() => create.mutate()}>Crear</Button>
          <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>×</Button>
        </div>
      )}

      {justCreated && (
        <div className="rounded-md border border-warning bg-warning/10 p-3 mb-3">
          <div className="text-xs font-medium mb-1 text-warning-foreground">⚠ Copia esta clave ahora — solo se muestra una vez</div>
          <div className="flex items-center gap-2">
            <code className="text-[11px] font-mono break-all flex-1">{justCreated}</code>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { navigator.clipboard.writeText(justCreated); toast.success("Copiado"); }}>
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <button className="text-[11px] text-muted-foreground mt-2 hover:underline" onClick={() => setJustCreated(null)}>
            Entendido
          </button>
        </div>
      )}

      <div className="space-y-1.5">
        {keys.length === 0 && <div className="text-xs text-muted-foreground">Aún no hay claves.</div>}
        {keys.map((k) => (
          <div key={k.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div className="min-w-0">
              <div className="text-xs font-medium">{k.name}</div>
              <div className="text-[10px] text-muted-foreground font-mono">{k.key.slice(0, 12)}…{k.key.slice(-4)}</div>
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={remove(k.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-border">
        <div className="text-[11px] text-muted-foreground">Endpoints:</div>
        <code className="block text-[11px] font-mono mt-1 break-all">
          POST /api/public/ai-tools/availability<br />
          POST /api/public/ai-tools/book<br />
          POST /api/public/ai-tools/reschedule<br />
          POST /api/public/ai-tools/cancel
        </code>
      </div>
    </div>
  );
}
