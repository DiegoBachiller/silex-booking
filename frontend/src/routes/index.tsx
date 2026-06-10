import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  Users,
  LayoutDashboard,
  Globe,
  BarChart3,
  Clock,
  Sparkles,
  MessageSquare,
  MapPinned,
  Check,
  Play,
  ArrowRight,
  Menu,
  X,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import silexLogo from "@/assets/silex-logo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SILEX — Reservas inteligentes para belleza y bienestar" },
      {
        name: "description",
        content:
          "Software de reservas simple y potente para peluquerías, barberías, estética, fisio y clínicas. Calendario multi-trabajador, widget público y agenda en una sola app.",
      },
      { property: "og:title", content: "SILEX — Reservas inteligentes" },
      {
        property: "og:description",
        content:
          "El sistema de citas que une lo mejor de Booksy y Treatwell con IA, recordatorios WhatsApp y SEO Local (próximamente).",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: LandingPage,
});

// ---------- helpers ---------------------------------------------------------

function useAuthState() {
  const [logged, setLogged] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setLogged(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setLogged(!!s),
    );
    return () => sub.subscription.unsubscribe();
  }, []);
  return logged;
}

// ---------- sections --------------------------------------------------------

function TopBar() {
  const logged = useAuthState();
  const [open, setOpen] = useState(false);
  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border/60"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
      data-testid="landing-topbar"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5" data-testid="landing-logo-link">
          <span className="h-9 w-9 rounded-xl overflow-hidden ring-1 ring-border bg-card">
            <img src={silexLogo} alt="SILEX" className="h-full w-full object-cover" />
          </span>
          <span className="font-semibold tracking-tight text-base">SILEX</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm">
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Funciones</a>
          <a href="#pronto" className="text-muted-foreground hover:text-foreground transition-colors">Próximamente</a>
          <a href="#precios" className="text-muted-foreground hover:text-foreground transition-colors">Precios</a>
          <a href="#faq" className="text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {logged ? (
            <Button asChild size="sm" data-testid="landing-cta-panel">
              <Link to="/calendar">Ir al panel <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" data-testid="landing-cta-signin">
                <Link to="/login">Iniciar sesión</Link>
              </Button>
              <Button asChild size="sm" data-testid="landing-cta-signup-top">
                <Link to="/login">Empieza gratis</Link>
              </Button>
            </>
          )}
        </div>

        <button
          className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-md hover:bg-muted"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menú"
          data-testid="landing-mobile-menu-toggle"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border/60 bg-background/95 backdrop-blur-md">
          <div className="px-4 py-4 flex flex-col gap-1 text-sm">
            <a href="#features" onClick={() => setOpen(false)} className="px-3 py-2.5 rounded-md hover:bg-muted">Funciones</a>
            <a href="#pronto" onClick={() => setOpen(false)} className="px-3 py-2.5 rounded-md hover:bg-muted">Próximamente</a>
            <a href="#precios" onClick={() => setOpen(false)} className="px-3 py-2.5 rounded-md hover:bg-muted">Precios</a>
            <a href="#faq" onClick={() => setOpen(false)} className="px-3 py-2.5 rounded-md hover:bg-muted">FAQ</a>
            <div className="pt-3 mt-2 border-t border-border/60 flex flex-col gap-2">
              {logged ? (
                <Button asChild className="w-full"><Link to="/calendar">Ir al panel</Link></Button>
              ) : (
                <>
                  <Button asChild variant="outline" className="w-full"><Link to="/login">Iniciar sesión</Link></Button>
                  <Button asChild className="w-full"><Link to="/login">Empieza gratis</Link></Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function Hero() {
  const logged = useAuthState();
  return (
    <section className="relative overflow-hidden" data-testid="landing-hero">
      {/* Decorative gradient blob */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-32 h-[480px] bg-gradient-to-b from-primary/15 via-primary/5 to-transparent blur-3xl"
      />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-14 sm:pt-20 pb-12 sm:pb-16">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          <Badge
            variant="secondary"
            className="mb-5 rounded-full px-3 py-1.5 text-[11px] font-medium tracking-wide uppercase"
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Belleza · Bienestar · Salud
          </Badge>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05] text-balance">
            Reservas inteligentes,{" "}
            <span className="bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">
              sin la complejidad
            </span>{" "}
            de Booksy.
          </h1>

          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl text-pretty">
            SILEX es el software de citas para peluquerías, barberías, estética, fisios y
            clínicas que <span className="text-foreground font-medium">une todo en una sola app</span>:
            calendario multi‑trabajador, widget público para tu web, gestión de clientes y
            estadísticas. Pronto con IA, WhatsApp y SEO local.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full sm:w-auto justify-center">
            <Button asChild size="lg" className="h-12 px-6 text-base" data-testid="hero-cta-primary">
              <Link to="/login">
                {logged ? "Ir al panel" : "Empieza gratis"} <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 px-6 text-base"
              data-testid="hero-cta-secondary"
            >
              <Link to="/embed/book">Ver widget en vivo</Link>
            </Button>
          </div>

          <div className="mt-5 text-xs text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-success" /> 14 días Pro de prueba · sin tarjeta
          </div>
        </div>

        {/* Video / demo placeholder */}
        <div className="mt-12 sm:mt-16">
          <div
            className="relative mx-auto max-w-5xl aspect-video rounded-2xl border border-border bg-gradient-to-br from-foreground/[0.06] to-primary/[0.08] overflow-hidden shadow-floating"
            data-testid="hero-video-placeholder"
          >
            {/* Faux dashboard mockup */}
            <div className="absolute inset-0 grid grid-cols-12 gap-0 opacity-90">
              <div className="col-span-3 hidden sm:flex flex-col gap-2 p-5 border-r border-border/60 bg-card/40">
                <div className="h-7 rounded bg-foreground/5" />
                <div className="h-7 rounded bg-primary/15" />
                <div className="h-7 rounded bg-foreground/5" />
                <div className="h-7 rounded bg-foreground/5" />
                <div className="h-7 rounded bg-foreground/5" />
              </div>
              <div className="col-span-12 sm:col-span-9 p-5 sm:p-6 grid grid-cols-7 gap-1.5">
                {Array.from({ length: 7 }).map((_, c) => (
                  <div key={c} className="flex flex-col gap-1.5">
                    <div className="h-5 rounded bg-foreground/5" />
                    {Array.from({ length: 6 }).map((__, r) => {
                      const filled = (c + r) % 4 === 0;
                      return (
                        <div
                          key={r}
                          className={cn(
                            "h-8 rounded",
                            filled ? "bg-primary/85" : "bg-foreground/5",
                          )}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Play overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-background/30 via-transparent to-transparent">
              <button
                type="button"
                className="group flex items-center gap-3 px-5 py-3 rounded-full bg-background/90 backdrop-blur shadow-floating border border-border hover:scale-[1.02] transition-transform"
                data-testid="hero-video-play"
                aria-label="Reproducir demo"
              >
                <span className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Play className="h-4 w-4 ml-0.5 fill-current" />
                </span>
                <span className="text-sm font-medium pr-2">Ver demo de 90 s</span>
              </button>
            </div>

            <div className="absolute top-3 left-3 flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
            </div>
          </div>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Vídeo demo en preparación
          </p>
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  const tags = [
    "Peluquerías",
    "Barberías",
    "Estética",
    "Uñas",
    "Fisioterapia",
    "Masaje",
    "Consultas médicas",
    "Spa & wellness",
  ];
  return (
    <section className="py-8 border-y border-border/60 bg-surface-muted/40" data-testid="landing-trust">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-center text-xs uppercase tracking-[0.18em] text-muted-foreground mb-4">
          Pensado para
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {tags.map((t, i) => (
            <span key={t} className="flex items-center gap-3">
              <span className="font-medium text-foreground/80">{t}</span>
              {i < tags.length - 1 && <span className="opacity-30">•</span>}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: CalendarDays,
    title: "Calendario multi‑trabajador",
    desc: "Vista diaria, semanal y por trabajador. Arrastra, reasigna y evita dobles reservas.",
  },
  {
    icon: Globe,
    title: "Widget público embebible",
    desc: "Pega un iframe en tu web y tus clientes reservan en 3 toques. Sin instalación.",
  },
  {
    icon: Users,
    title: "Clientes con historial",
    desc: "Ficha por cliente: contacto, notas, próximas y pasadas citas. Búsqueda instantánea.",
  },
  {
    icon: BarChart3,
    title: "Estadísticas que importan",
    desc: "Ingresos, ocupación, servicios top y clientes recurrentes — todo a un vistazo.",
  },
  {
    icon: Clock,
    title: "Horarios y festivos",
    desc: "Configura turnos por trabajador, vacaciones y días bloqueados en segundos.",
  },
  {
    icon: LayoutDashboard,
    title: "Instalable como app",
    desc: "PWA: tu personal la instala en móvil, tablet y escritorio. Funciona offline.",
  },
];

function Features() {
  return (
    <section id="features" className="py-20 sm:py-28" data-testid="landing-features">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl mb-12 sm:mb-14">
          <Badge variant="secondary" className="mb-3 rounded-full">Funciones</Badge>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Todo lo que necesitas, nada de lo que sobra.
          </h2>
          <p className="mt-3 text-muted-foreground text-base sm:text-lg">
            Hemos quitado los menús infinitos. SILEX te lleva del cero al primer cobro en
            menos de 10 minutos.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="group relative rounded-2xl border border-border bg-card p-6 hover:border-border-strong hover:shadow-elegant transition-all"
              data-testid={`feature-${title.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold mb-1.5">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const COMING = [
  {
    icon: Sparkles,
    title: "Agente IA de reservas",
    desc:
      "Recibe y gestiona llamadas con voz IA (Vapi, ElevenLabs). El agente conoce tu agenda, servicios y precios — y reserva en tu calendario.",
    eta: "Q1",
  },
  {
    icon: MessageSquare,
    title: "Recordatorios por WhatsApp",
    desc:
      "Reduce los no‑shows hasta un 70%. Confirmaciones, recordatorios 24h antes y reseñas tras la cita, automáticos.",
    eta: "Q2",
  },
  {
    icon: MapPinned,
    title: "Consultoría de SEO Local",
    desc:
      "Acceso desde la app a sesiones 1:1 con consultores para posicionarte en Google Maps y captar más clientes locales.",
    eta: "Q2",
  },
];

function ComingSoon() {
  return (
    <section
      id="pronto"
      className="py-20 sm:py-28 bg-surface-muted/50 border-y border-border/60"
      data-testid="landing-coming"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl mb-12 sm:mb-14">
          <Badge className="mb-3 rounded-full bg-primary/12 text-primary border-0">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Próximamente
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Lo que está a punto de llegar.
          </h2>
          <p className="mt-3 text-muted-foreground text-base sm:text-lg">
            Si reservas hoy un plan Pro, accedes a estas funciones en cuanto entren — sin
            cambio de precio, sin sorpresas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {COMING.map(({ icon: Icon, title, desc, eta }) => (
            <div
              key={title}
              className="relative rounded-2xl border border-border bg-card p-6 overflow-hidden"
              data-testid={`coming-${title.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div
                aria-hidden
                className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
              />
              <div className="flex items-start justify-between mb-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-primary bg-primary/10 px-2 py-1 rounded-full">
                  {eta}
                </span>
              </div>
              <h3 className="text-base font-semibold mb-1.5">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingCard({
  name,
  price,
  period,
  description,
  features,
  highlight,
  cta,
  testId,
}: {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  highlight?: boolean;
  cta: string;
  testId: string;
}) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border p-7 sm:p-8 bg-card flex flex-col",
        highlight
          ? "border-primary/60 shadow-floating ring-1 ring-primary/30"
          : "border-border",
      )}
      data-testid={testId}
    >
      {highlight && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold tracking-wide uppercase">
          Más popular
        </span>
      )}
      <h3 className="text-lg font-semibold">{name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-6 flex items-baseline gap-1">
        <span className="text-4xl sm:text-5xl font-semibold tracking-tight">{price}</span>
        {period && <span className="text-sm text-muted-foreground">/ {period}</span>}
      </div>
      <Button
        asChild
        size="lg"
        variant={highlight ? "default" : "outline"}
        className="mt-6 h-11 w-full"
        data-testid={`${testId}-cta`}
      >
        <Link to="/login">{cta}</Link>
      </Button>
      <ul className="mt-7 space-y-3 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <Check className={cn("h-4 w-4 mt-0.5 shrink-0", highlight ? "text-primary" : "text-success")} />
            <span className="text-foreground/85">{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Pricing() {
  return (
    <section id="precios" className="py-20 sm:py-28" data-testid="landing-pricing">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Badge variant="secondary" className="mb-3 rounded-full">Precios</Badge>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Empieza gratis. Crece cuando estés listo.
          </h2>
          <p className="mt-3 text-muted-foreground text-base sm:text-lg">
            Sin permanencia. Cancela cuando quieras. Datos siempre tuyos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 max-w-4xl mx-auto">
          <PricingCard
            testId="pricing-free"
            name="Free"
            price="0 €"
            description="Para empezar a digitalizar tu agenda hoy mismo."
            cta="Crear cuenta gratis"
            features={[
              "1 trabajador",
              "Hasta 40 citas / mes",
              "Widget público de reservas",
              "Ficha de clientes básica",
              "Soporte por email",
            ]}
          />
          <PricingCard
            testId="pricing-pro"
            name="Pro"
            price="30 €"
            period="mes"
            description="Todo lo que necesita un negocio en crecimiento."
            cta="Probar Pro 14 días"
            highlight
            features={[
              "Trabajadores ilimitados",
              "Citas ilimitadas",
              "Clientes ilimitados",
              "Estadísticas avanzadas",
              "Horarios y festivos por trabajador",
              "Personalización del widget",
              "Acceso anticipado a IA, WhatsApp y SEO Local",
              "Soporte prioritario",
            ]}
          />
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Precios en euros con IVA no incluido · Facturación mensual o anual (2 meses gratis)
        </p>
      </div>
    </section>
  );
}

const FAQS = [
  {
    q: "¿Necesito instalar algo?",
    a: "No. SILEX es una app web que funciona en cualquier navegador moderno. Además puedes instalarla como app en tu móvil, tablet o escritorio (PWA) en 2 toques.",
  },
  {
    q: "¿Puedo migrar mis citas desde Booksy o Treatwell?",
    a: "Sí. Te ayudamos con la importación CSV de clientes y citas activas en el plan Pro. Escríbenos y lo gestionamos contigo.",
  },
  {
    q: "¿Mis clientes pueden reservar sin descargar nada?",
    a: "Por supuesto. Compartes un enlace o lo incrustas en tu web/Instagram. Reservan en 3 toques sin registrarse.",
  },
  {
    q: "¿Cuándo estarán disponibles la IA, WhatsApp y el SEO Local?",
    a: "Estamos puliendo el agente IA conversacional y la integración con WhatsApp Business. Los suscriptores del plan Pro tendrán acceso anticipado durante el desarrollo, sin coste adicional.",
  },
  {
    q: "¿Mis datos están seguros?",
    a: "Sí. Almacenamiento cifrado en Supabase (Postgres), copias de seguridad diarias, RLS por negocio y cumplimiento RGPD. Tus datos son tuyos y los exportas cuando quieras.",
  },
];

function FAQ() {
  return (
    <section id="faq" className="py-20 sm:py-28 bg-surface-muted/40 border-t border-border/60" data-testid="landing-faq">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-3 rounded-full">FAQ</Badge>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Preguntas frecuentes
          </h2>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {FAQS.map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`} data-testid={`faq-item-${i}`}>
              <AccordionTrigger className="text-left text-base font-medium">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function FinalCTA() {
  const logged = useAuthState();
  return (
    <section className="py-20 sm:py-28" data-testid="landing-final-cta">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/95 to-fuchsia-600 text-primary-foreground p-10 sm:p-16 text-center shadow-floating">
          <div aria-hidden className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div aria-hidden className="absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-black/10 blur-3xl" />

          <h2 className="relative text-3xl sm:text-4xl font-semibold tracking-tight">
            Empieza a recibir reservas mañana mismo.
          </h2>
          <p className="relative mt-3 text-white/85 text-base sm:text-lg max-w-xl mx-auto">
            Crea tu cuenta gratis y configura tu negocio en menos de 10 minutos.
          </p>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="relative mt-7 h-12 px-7 text-base bg-white text-primary hover:bg-white/90"
            data-testid="final-cta-btn"
          >
            <Link to="/login">
              {logged ? "Ir al panel" : "Crear cuenta gratis"}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 bg-surface-muted/30" data-testid="landing-footer">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 grid grid-cols-2 sm:grid-cols-4 gap-8 text-sm">
        <div className="col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-8 w-8 rounded-lg overflow-hidden ring-1 ring-border bg-card">
              <img src={silexLogo} alt="SILEX" className="h-full w-full object-cover" />
            </span>
            <span className="font-semibold">SILEX</span>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Reservas inteligentes para negocios de belleza y bienestar.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground/70 mb-3">Producto</p>
          <ul className="space-y-2 text-muted-foreground">
            <li><a href="#features" className="hover:text-foreground">Funciones</a></li>
            <li><a href="#precios" className="hover:text-foreground">Precios</a></li>
            <li><Link to="/embed/book" className="hover:text-foreground">Widget en vivo</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground/70 mb-3">Empresa</p>
          <ul className="space-y-2 text-muted-foreground">
            <li><a href="#faq" className="hover:text-foreground">FAQ</a></li>
            <li><a href="mailto:hola@silex.app" className="hover:text-foreground">Contacto</a></li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground/70 mb-3">Legal</p>
          <ul className="space-y-2 text-muted-foreground">
            <li><a href="#" className="hover:text-foreground">Términos</a></li>
            <li><a href="#" className="hover:text-foreground">Privacidad</a></li>
            <li><a href="#" className="hover:text-foreground">Cookies</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} SILEX. Todos los derechos reservados.</span>
          <span className="flex items-center gap-1.5">
            Hecho con <ChevronDown className="h-3 w-3 rotate-90 text-primary" /> en España
          </span>
        </div>
      </div>
    </footer>
  );
}

// ---------- page ------------------------------------------------------------

function LandingPage() {
  return (
    <main className="min-h-[100dvh] bg-background text-foreground antialiased" data-testid="landing-page">
      <TopBar />
      <Hero />
      <TrustStrip />
      <Features />
      <ComingSoon />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
