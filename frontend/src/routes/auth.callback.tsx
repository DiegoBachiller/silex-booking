import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Supabase OAuth callback.
 *
 * Google → Supabase Auth → here (with `?code=<…>` and `state` in the URL).
 * We exchange the auth code for a session client‑side, then route the user
 * straight to /calendar. If anything goes wrong, we bounce back to /login
 * with a toast describing the failure.
 *
 * REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
 */
export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const finish = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const errorDescription =
          url.searchParams.get("error_description") || url.searchParams.get("error");

        if (errorDescription) {
          if (!active) return;
          toast.error(decodeURIComponent(errorDescription));
          navigate({ to: "/login" });
          return;
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        // If there is no `code`, Supabase may have already exchanged it via
        // detectSessionInUrl. Either way, verify we now have a session.
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        if (data.session) {
          toast.success("Sesión iniciada con Google");
          navigate({ to: "/calendar" });
        } else {
          toast.error("No se pudo iniciar sesión. Inténtalo de nuevo.");
          navigate({ to: "/login" });
        }
      } catch (err) {
        if (!active) return;
        console.error("[auth/callback]", err);
        toast.error((err as Error)?.message ?? "Error completando el login con Google");
        navigate({ to: "/login" });
      }
    };

    finish();
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <div
      className="min-h-[100dvh] bg-background flex items-center justify-center px-4"
      data-testid="auth-callback"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="h-9 w-9 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Completando inicio de sesión…</p>
      </div>
    </div>
  );
}
