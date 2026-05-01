import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { Calendar, Users, Wrench, CalendarOff, Bot, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/calendar", label: "Calendario", icon: Calendar },
  { to: "/team", label: "Equipo", icon: Users },
  { to: "/services", label: "Servicios", icon: Wrench },
  { to: "/holidays", label: "Festivos", icon: CalendarOff },
  { to: "/ai-config", label: "Agente IA", icon: Bot },
] as const;

export function AppShell() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
        <Link to="/" className="flex items-center gap-2 px-6 py-5 border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-elegant">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-semibold tracking-tight">SILEX</div>
            <div className="text-xs text-muted-foreground">Reservas con IA</div>
          </div>
        </Link>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to || location.pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-sidebar-border">
          <div className="rounded-lg bg-accent/60 p-3 text-xs text-accent-foreground">
            <div className="font-medium mb-1">Conectado a Vapi / ElevenLabs</div>
            <div className="text-muted-foreground">
              Configura tu agente en <span className="font-medium">Agente IA</span>.
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top nav */}
        <div className="md:hidden flex items-center justify-between border-b border-border px-4 py-3 bg-surface">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-semibold">SILEX</span>
          </Link>
        </div>
        <div className="md:hidden flex gap-1 overflow-x-auto border-b border-border bg-surface px-2 py-2">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to || location.pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs whitespace-nowrap",
                  active ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            );
          })}
        </div>

        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
