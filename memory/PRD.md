# SILEX — PRD

## Problem statement (original, in user's language)

> Te adjunto un archivo zip de mi SaaS en desarrollo. Es un repositorio de
> github. Quiero que elimines la parte de la IA de este software para hacerlo
> más simple. Ya añadiré los agentes de IA después. También necesito publicar
> este SaaS en la web y como app. Tengo que poder ser capaz de seguir
> añadiendo cambios. Optimiza para móviles y tablets también.

## User choices

- **Eliminar IA**: desactivar/comentar, NO borrar (`b`). Conservar para
  reintegrar más adelante.
- **App**: web + app móvil **instalable** desde el navegador (PWA).
- **Despliegue**: la opción más barata.
- **Stack**: React (se asume sin confirmar).
- **Orden**: limpiar IA → optimizar móvil → deploy.

## Personas

- **Owner / administrador** del negocio: gestiona citas, equipo, clientes,
  servicios y festivos. Único tenant.
- **Cliente final**: usa el widget público `/embed/book` para reservar.

## Stack (heredado del repo)

- TanStack Start + TanStack Router (file-based)
- React 19 + TypeScript + Vite 7
- Tailwind 4 + shadcn/ui (registro completo en `src/components/ui/`)
- Supabase (Postgres + Auth + Realtime + RLS) — backend único
- Cloudflare Workers (deploy target en producción, Nitro)
- vite-plugin-pwa (instalación móvil/desktop)

## Arquitectura del entorno

- `/app/frontend/` → la app entera (TanStack Start)
- `/app/backend/` → stub mínimo FastAPI (vacío) para satisfacer al supervisor
  Emergent que espera un backend en :8001. **No se usa funcionalmente**:
  toda la lógica vive en Supabase + endpoints de TanStack en Cloudflare Worker.

## What's been implemented (2026-06-10)

- [x] Reestructurado el repo a `frontend/` + `backend/` para encajar con el
      entorno Emergent (supervisor expone Vite en `3000`).
- [x] Movido **todo** el código de IA a `src/_disabled_ai/` con README de
      restauración (1 minuto). Incluye:
      - Ruta `/ai-config`
      - Endpoints `/api/public/ai-tools/{availability,book,reschedule,cancel}`
      - Endpoint admin `/api/public/admin/api-keys`
      - `server/ai-tools.server.ts` y `lib/api-key.ts`
- [x] Quitado el item "Agente IA" del menú lateral y del drawer móvil
      (`AppShell.tsx`, marcado con `// AI:` para reactivar fácilmente).
- [x] Limpiados textos públicos: "Reservas con IA" → "Gestor de reservas",
      meta-descriptions y og:descriptions sin menciones a IA en `__root.tsx`,
      `login.tsx`, `calendar.tsx`, `holidays.tsx`, `llms.txt`.
- [x] Tipos `AiProfile` / `ApiKey` se conservan en `useSilexData.ts` (dead
      code controlado, con comentario `// AI:`) porque la tabla `ai_profile`
      todavía aporta `business_name` y `greeting` al widget público.
- [x] Tablas `ai_profile` y `api_keys` de Supabase intactas — no se tocan
      migraciones.
- [x] **PWA**: `vite-plugin-pwa` con manifest, iconos (192/512/maskable/apple),
      service worker, runtime caching (Supabase, assets, imágenes), registro
      diferido client-only en `usePwaRegister`.
- [x] **Meta tags móviles** en `__root.tsx`: viewport con `viewport-fit=cover`,
      `theme-color`, `apple-mobile-web-app-*`, `format-detection`, manifest.
- [x] **Mobile polish** en `styles.css`: `font-size: 16px` en inputs <768px
      (evita zoom-on-focus en iOS), `touch-action: manipulation`,
      `-webkit-overflow-scrolling: touch`, `overscroll-behavior-y: none`.
- [x] `vite.config.ts` con `allowedHosts: true` para que funcione en el
      preview de Emergent y en cualquier dominio custom tras deploy.
- [x] `README.md` con guía de variables, `yarn dev`, build y **deploy
      gratuito en Cloudflare Workers** (la opción más barata).
- [x] `.env.example` listando `VITE_SUPABASE_URL`,
      `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## Pendiente que el usuario debe hacer

1. Crear/copiar `.env` desde `.env.example` con las credenciales de su
   proyecto Supabase (Project Settings → API).
2. `npx wrangler login` y `npx wrangler deploy` para publicar gratis en
   Cloudflare Workers (incluye dominio `*.workers.dev`).
3. (Opcional) Vincular un dominio propio desde el dashboard de Cloudflare.

## Backlog priorizado

### P0 — siguiente sesión
- Conectar `.env` con credenciales reales de Supabase para probar el flujo
  completo (login email + Google, calendar, alta de citas).
- Push inicial al GitHub del usuario (mediante la opción "Save to Github"
  del chat).

### P1 — features que el usuario quiere reintegrar
- Reactivar agente IA cuando esté listo (mover `src/_disabled_ai/` de vuelta
  a sus rutas originales, ver README de la carpeta).
- Configuración del agente: voz, tono, idioma (página ya existe lista).
- Endpoints para Vapi / ElevenLabs / n8n (también ya listos).

### P2 — mejoras opcionales
- Pasar de Supabase free a paid cuando supere 500 MB / 50 K MAU.
- Notificaciones push web (`Notification API` + Web Push) — la PWA ya está
  preparada.
- Modo offline real para `/calendar` (sólo lectura), apoyado en el SW.
- Vista semanal compacta para tablets en `landscape`.

## Última iteración: 2026-06-10 (iteración 2)

- [x] **Logo nuevo** integrado: PNG en `/src/assets/silex-logo.png` y `/public/silex-logo.png`. Iconos PWA (192/512/maskable/apple-touch) y favicon regenerados desde el logo.
- [x] **Landing page** en `/` (público, accesible sin login): TopBar sticky con nav + CTAs, Hero con badge + H1 con gradiente + sub + 2 CTAs + placeholder de vídeo (mockup de calendario, ratio 16:9, botón "Ver demo de 90s" listo para enchufar video real), TrustStrip (verticales target), Features (6 cards), ComingSoon (IA / WhatsApp / SEO Local con badge ETA Q1/Q2), Pricing (Free 0€ vs Pro 30€/mes destacado), FAQ (5 preguntas accordion), CTA final gradient, Footer 4 columnas.
- [x] **Google OAuth migrado** de `lovable.auth` a `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })`. Usa `window.location.origin` (no hardcoded). Marcado con el comentario recordatorio.
- [x] **Login rediseñado**: nuevo logo, copy mejorado ("Bienvenido de vuelta" / "Crea tu cuenta"), inputs h-11 para móvil, data-testids, link "Volver al inicio".
- [x] **Cleanup Lovable.app**: eliminadas referencias hardcodeadas a `silex-booking.lovable.app` en `login.tsx`, `__root.tsx` (schema JSON-LD) y `sitemap.xml.ts` (ahora deriva del host del request, fallback `silex.app`).
- [x] **`/integrations/lovable/index.ts`** no se usa ya en código activo. Se conserva por si se reutiliza para otra cosa.

Status del entorno:
- Frontend OK (Vite dev :3000, landing y login renderizan).
- Build de producción OK (12.94 s, `dist/client` + `dist/server` generados).
- Supabase publishable key configurada en `.env`.
- ⏳ Pendiente: service role key + configuración Google OAuth en Supabase/Google Console por parte del usuario.
