import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Supabase OAuth callback.
 *
 * Google → Supabase Auth → here (with `?code=<…>` and `state` in the URL).
 *
 * The Supabase JS SDK has `detectSessionInUrl: true` by default, which means
 * it AUTOMATICALLY exchanges the `?code=…` for a session as soon as the
 * client is created on this page load. Calling `exchangeCodeForSession()`
 * ourselves would race with the SDK and Google would reject the second use
 * of the single-use code with:  "Unable to exchange external code: 4/0A…".
 *
 * So here we just sit and wait for `onAuthStateChange` to fire with the new
 * session, then route to /calendar. Errors land us back on /login with a
 * descriptive toast.
 *
 * REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
 */
export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let resolved = false;

    const url = new URL(window.location.href);
    const errParam =
      url.searchParams.get("error_description") || url.searchParams.get("error");

    if (errParam) {
      resolved = true;
      toast.error(decodeURIComponent(errParam));
      navigate({ to: "/login" });
      return;
    }

    const finalize = (ok: boolean, message?: string) => {
      if (resolved) return;
      resolved = true;
      if (ok) {
        toast.success("Sesión iniciada con Google");
        navigate({ to: "/calendar" });
      } else {
        toast.error(message ?? "No se pudo iniciar sesión");
        navigate({ to: "/login" });
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        finalize(true);
      } else if (event === "SIGNED_OUT") {
        finalize(false);
      }
    });

    // Defensive: maybe the session was already exchanged before we subscribed.
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) finalize(false, error.message);
        else if (data.session) finalize(true);
      })
      .catch((err) => finalize(false, (err as Error).message));

    // Safety net so the spinner never gets stuck forever.
    const timeout = window.setTimeout(() => {
      finalize(false, "Tiempo de espera agotado. Inténtalo de nuevo.");
    }, 8000);

    return () => {
      window.clearTimeout(timeout);
      sub.subscription.unsubscribe();
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
