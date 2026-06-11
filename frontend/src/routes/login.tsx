import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import silexLogo from "@/assets/silex-logo.png?url";

type LoginSearch = {
  email?: string;
  mode?: "signin" | "signup";
};

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    email: typeof search.email === "string" ? search.email : undefined,
    mode: search.mode === "signup" ? "signup" : search.mode === "signin" ? "signin" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Iniciar sesión — SILEX" },
      { name: "description", content: "Accede al panel de administración de SILEX." },
      { property: "og:title", content: "SILEX — Panel de administración" },
      { property: "og:description", content: "Inicia sesión para gestionar tus citas, equipo y clientes." },
    ],
  }),

  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/login" });
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [email, setEmail] = useState(search.email ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/calendar" });
    });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bienvenido de vuelta");
        navigate({ to: "/calendar" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
          options: { emailRedirectTo: `${window.location.origin}/calendar` },
        });
        if (error) throw error;
        toast.success("Cuenta creada. Revisa tu email para confirmarla.");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setLoading(true);
    try {
      // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
          redirectTo: `${window.location.origin}/auth/callback`,
          // We do the redirect manually below to avoid edge-cases where the
          // SDK's auto-redirect silently fails (preview iframes, COOP/COEP, …).
          skipBrowserRedirect: true,
        },
      });
      if (error) {
        console.error("[Google OAuth]", error);
        toast.error(error.message ?? "Error con Google");
        setLoading(false);
        return;
      }
      if (data?.url) {
        // Hard navigation — bypasses any SPA router intercept.
        window.location.assign(data.url);
        return;
      }
      toast.error("No se recibió URL de Google. Revisa la configuración del proveedor en Supabase.");
      setLoading(false);
    } catch (err) {
      console.error("[Google OAuth] threw", err);
      toast.error((err as Error)?.message ?? "Error inesperado con Google");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6"
          data-testid="login-back-home"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al inicio
        </Link>

        <div className="flex flex-col items-center mb-6">
          <div className="h-16 w-16 rounded-2xl overflow-hidden ring-1 ring-border bg-card shadow-elegant mb-4">
            <img src={silexLogo} alt="SILEX" className="h-full w-full object-cover" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "signin" ? "Bienvenido de vuelta" : "Crea tu cuenta"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 text-center">
            {mode === "signin"
              ? "Accede a tu panel SILEX"
              : "Empieza gratis en menos de 30 segundos"}
          </p>
        </div>

        <div className="silex-card p-6 space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full h-11"
            onClick={onGoogle}
            disabled={loading}
            data-testid="login-google-btn"
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 48 48" aria-hidden>
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.5 29.3 4.5 24 4.5 12.7 4.5 3.5 13.7 3.5 25S12.7 45.5 24 45.5 44.5 36.3 44.5 25c0-1.5-.2-3-.5-4.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.5 29.3 4.5 24 4.5c-7.6 0-14.2 4.3-17.7 10.2z" />
              <path fill="#4CAF50" d="M24 45.5c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.2-7.2 2.2-5.3 0-9.7-3.4-11.3-8L6.2 34c3.4 6 9.9 11.5 17.8 11.5z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.6l6.2 5.2c-.4.4 6.7-4.9 6.7-13.8 0-1.5-.2-3-.5-4.5z" />
            </svg>
            Continuar con Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">o con email</span>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-3" data-testid="login-form">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 h-11"
                  placeholder="tu@email.com"
                  autoComplete="email"
                  data-testid="login-email-input"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 h-11"
                  placeholder="••••••••"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  data-testid="login-password-input"
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-11"
              disabled={loading}
              data-testid="login-submit-btn"
            >
              {loading
                ? "Procesando…"
                : mode === "signin"
                  ? "Iniciar sesión"
                  : "Crear cuenta gratis"}
            </Button>
          </form>

          <div className="text-center text-xs text-muted-foreground">
            {mode === "signin" ? (
              <>
                ¿No tienes cuenta?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="text-primary hover:underline font-medium"
                  data-testid="login-switch-signup"
                >
                  Regístrate gratis
                </button>
              </>
            ) : (
              <>
                ¿Ya tienes cuenta?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="text-primary hover:underline font-medium"
                  data-testid="login-switch-signin"
                >
                  Inicia sesión
                </button>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          <Link to="/embed/book" className="hover:underline">
            Ver widget público de reservas →
          </Link>
        </p>
      </div>
    </div>
  );
}
