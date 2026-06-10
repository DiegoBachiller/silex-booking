import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Calendar,
  Users,
  Wrench,
  CalendarOff,
  // AI: Bot,
  LogOut,
  Menu,
  X,
  BarChart2,
  UserSquare2,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { toast } from "sonner";
import silexLogo from "@/assets/silex-logo.png.asset.json";

const NAV = [
  { to: "/calendar", label: "Calendario", icon: Calendar },
  { to: "/estadisticas", label: "Estadísticas", icon: BarChart2 },
  { to: "/team", label: "Equipo", icon: Users },
  { to: "/clientes", label: "Clientes", icon: UserSquare2 },
  { to: "/services", label: "Servicios", icon: Wrench },
  { to: "/holidays", label: "Festivos", icon: CalendarOff },
  // AI: { to: "/ai-config", label: "Agente IA", icon: Bot },
] as const;

// Mobile bottom-nav keeps 5 columns; the rest live in the drawer.
const MOBILE_NAV = [
  { to: "/calendar", label: "Calendario", icon: Calendar },
  { to: "/estadisticas", label: "Stats", icon: BarChart2 },
  { to: "/clientes", label: "Clientes", icon: UserSquare2 },
  { to: "/team", label: "Equipo", icon: Users },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [apptOpen, setApptOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [loading, user, navigate]);

  // close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const onLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sesión cerrada");
    navigate({ to: "/login" });
  };

  const openNewAppointment = () => {
    setDrawerOpen(false);
    setApptOpen(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Cargando…</div>
      </div>
    );
  }
  if (!user) return null;

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
        <Link to="/calendar" className="flex items-center gap-2 px-6 py-5 border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden bg-background shadow-elegant">
            <img src={silexLogo.url} alt="SILEX" className="h-full w-full object-cover" />
          </div>
          <div>
            <div className="text-base font-semibold tracking-tight">SILEX</div>
            <div className="text-xs text-muted-foreground">Gestor de reservas</div>
          </div>
        </Link>

        <div className="px-4 pt-4">
          <Button onClick={openNewAppointment} className="w-full justify-center gap-2">
            <Plus className="h-4 w-4" /> Nueva cita
          </Button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive(to)
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-sidebar-border space-y-3">
          <div className="text-xs text-muted-foreground truncate" title={user.email ?? ""}>
            {user.email}
          </div>
          <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={onLogout}>
            <LogOut className="h-3.5 w-3.5" /> Cerrar sesión
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-border px-4 h-14 bg-surface/95 backdrop-blur">
          <Link to="/calendar" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden bg-background">
              <img src={silexLogo.url} alt="SILEX" className="h-full w-full object-cover" />
            </div>
            <span className="font-semibold">SILEX</span>
          </Link>
          <div className="flex items-center gap-1">
            <Button size="sm" className="gap-1.5" onClick={openNewAppointment}>
              <Plus className="h-4 w-4" /> Cita
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content area — leave room for mobile bottom nav */}
        <div className="flex-1 min-w-0 pb-20 md:pb-0">{children}</div>
      </main>

      {/* Mobile bottom nav (5 columns: 4 links + menu) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <ul className="grid grid-cols-5">
          {MOBILE_NAV.map(({ to, label, icon: Icon }) => {
            const active = isActive(to);
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_6px_color-mix(in_oklab,var(--primary)_45%,transparent)]")} />
                  <span className="truncate max-w-[68px]">{label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              onClick={() => setDrawerOpen(true)}
              className="w-full flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Menu className="h-5 w-5" />
              <span>Más</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Mobile drawer (full nav + account) */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-72 bg-sidebar text-sidebar-foreground shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 border-b border-sidebar-border">
              <span className="font-semibold">Menú</span>
              <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(false)} aria-label="Cerrar">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="px-4 pt-4">
              <Button onClick={openNewAppointment} className="w-full justify-center gap-2">
                <Plus className="h-4 w-4" /> Nueva cita
              </Button>
            </div>
            <div className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
              {NAV.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors",
                    isActive(to)
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                  )}
                >
                  <Icon className="h-4 w-4" /> {label}
                </Link>
              ))}
            </div>
            <div className="px-4 py-4 border-t border-sidebar-border space-y-3">
              <div className="text-xs text-muted-foreground truncate" title={user.email ?? ""}>
                {user.email}
              </div>
              <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={onLogout}>
                <LogOut className="h-3.5 w-3.5" /> Cerrar sesión
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quick "Nueva cita" dialog — reuses the same component as /calendar */}
      <AppointmentDialog open={apptOpen} onOpenChange={setApptOpen} />
    </div>
  );
}
