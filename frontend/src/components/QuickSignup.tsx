import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "silex_quick_signup_dismissed_v1";

/**
 * Sticky bottom bar that captures an email on the landing and forwards
 * the visitor to the signup form with the email pre-filled.
 *
 * - Appears after the user has scrolled past the hero (≈ 600px)
 * - Hides automatically when the in-page Pricing or final-CTA sections
 *   are in the viewport (no double CTA distraction)
 * - Dismissal is remembered in localStorage for 14 days
 * - On mobile: full-width pill at the bottom
 * - On desktop: floating pill bottom-right
 */
export function QuickSignup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [hiddenByCta, setHiddenByCta] = useState(false);
  const ctaObserver = useRef<IntersectionObserver | null>(null);

  // Check dismissal on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw) {
        const ts = Number(raw);
        if (!Number.isNaN(ts) && Date.now() - ts < 14 * 24 * 60 * 60 * 1000) {
          setDismissed(true);
          return;
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Show after scroll past hero
  useEffect(() => {
    if (dismissed) return;
    const onScroll = () => {
      setVisible(window.scrollY > 600);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [dismissed]);

  // Hide when pricing or final-cta is in view
  useEffect(() => {
    if (typeof window === "undefined" || dismissed) return;
    const targets = [
      document.getElementById("precios"),
      document.querySelector('[data-testid="landing-final-cta"]'),
    ].filter(Boolean) as Element[];
    if (!targets.length) return;
    ctaObserver.current = new IntersectionObserver(
      (entries) => {
        // Hide if any target is at least 25% visible
        setHiddenByCta(entries.some((e) => e.isIntersecting && e.intersectionRatio > 0.25));
      },
      { threshold: [0, 0.25, 0.5] },
    );
    targets.forEach((t) => ctaObserver.current!.observe(t));
    return () => ctaObserver.current?.disconnect();
  }, [dismissed]);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = email.trim();
    if (!v) return;
    navigate({
      to: "/login",
      search: { email: v, mode: "signup" } as never,
    });
  };

  if (dismissed) return null;
  const show = visible && !hiddenByCta;

  return (
    <div
      className={cn(
        "fixed inset-x-0 z-50 px-3 sm:px-6 pointer-events-none",
        // Sit above the iOS home indicator on mobile
        "bottom-3 sm:bottom-5",
        "transition-all duration-300 ease-out",
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-hidden={!show}
      data-testid="quick-signup-bar"
    >
      <div className="mx-auto max-w-3xl sm:max-w-2xl sm:ml-auto sm:mr-3 lg:mr-6">
        <div
          className={cn(
            "pointer-events-auto rounded-2xl border border-border shadow-floating",
            "bg-card/95 backdrop-blur-xl",
            "p-2 sm:p-2.5",
            "flex items-center gap-2",
          )}
        >
          <div className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>

          <form onSubmit={onSubmit} className="flex flex-1 items-center gap-2 min-w-0">
            <label htmlFor="quick-signup-email" className="sr-only">
              Tu email
            </label>
            <Input
              id="quick-signup-email"
              type="email"
              required
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com — empieza gratis"
              className="h-11 border-0 bg-transparent focus-visible:ring-0 px-2 sm:px-3 text-sm flex-1 min-w-0"
              data-testid="quick-signup-email-input"
            />
            <Button
              type="submit"
              size="sm"
              className="h-11 px-3 sm:px-4 shrink-0"
              data-testid="quick-signup-submit"
            >
              <span className="hidden sm:inline">Empezar</span>
              <span className="sm:hidden">Empezar</span>
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </form>

          <button
            type="button"
            onClick={dismiss}
            aria-label="Cerrar"
            className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            data-testid="quick-signup-dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="hidden sm:block text-[10.5px] text-muted-foreground mt-1.5 text-center px-2">
          Sin tarjeta · 14 días Pro de prueba · cancela cuando quieras
        </p>
      </div>
    </div>
  );
}
