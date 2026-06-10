# SILEX

App de gestión de citas multi-trabajador. Calendario, clientes, equipo,
estadísticas y widget público de reservas para incrustar en cualquier web.

> La parte de **agentes IA** (Vapi, ElevenLabs, n8n) está temporalmente
> desactivada y guardada en `src/_disabled_ai/`. Para reactivarla, mira
> el README dentro de esa carpeta.

## Stack

- React 19 + TypeScript
- TanStack Start + TanStack Router (file-based)
- Vite 7 + Tailwind 4 + shadcn/ui
- Supabase (Postgres + Auth + Realtime + RLS)
- Cloudflare Workers (deploy target, build via Nitro)
- PWA instalable en móvil/tablet (`vite-plugin-pwa`)

## Variables de entorno

Copia `.env.example` a `.env` y rellena los valores (los obtienes desde el
dashboard de Supabase → Project Settings → API):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # solo para SSR / Cloudflare Worker
```

## Desarrollo

```bash
yarn install --ignore-engines    # Node 22+ recomendado; con 20 usa --ignore-engines
yarn dev                          # http://localhost:3000
```

El servidor expone tanto el front (TanStack Router) como los endpoints en
`/api/public/*` (Cloudflare Worker en producción, Node en dev).

## Build y despliegue

### Opción A — Cloudflare Workers (recomendado, **plan gratuito**)

Cloudflare Workers es gratis hasta 100 000 peticiones/día y 10 ms de CPU por
petición — más que suficiente para un SaaS pequeño/medio.

```bash
yarn build                        # genera .output/ listo para Workers
npx wrangler login                # una sola vez
npx wrangler deploy               # despliega a tu cuenta
```

Configura las variables de entorno como **secrets**:

```bash
npx wrangler secret put VITE_SUPABASE_URL
npx wrangler secret put VITE_SUPABASE_PUBLISHABLE_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

Conecta un dominio propio desde el dashboard de Cloudflare.

### Opción B — Vercel / Netlify / cualquier host Node

Nitro detecta el preset por el entorno (`NITRO_PRESET=vercel`, etc.). Sube el
repo a GitHub y conecta el proyecto. Pon las variables de entorno como
"Environment Variables" en la UI del proveedor.

## Instalación como app móvil (PWA)

El proyecto incluye manifest, iconos y service worker. Tras desplegar en
HTTPS:

- **iOS Safari** → Compartir → "Añadir a pantalla de inicio".
- **Android Chrome** → menú → "Instalar app".
- **Escritorio Chrome/Edge** → icono "+" en la barra de URL.

Se abre en su propia ventana, sin barra del navegador, y funciona offline
para las pantallas ya visitadas.

## Estructura

```
src/
├── routes/                # File-based routing (TanStack)
│   ├── api/public/        # Endpoints HTTP (Cloudflare Worker)
│   └── embed.book.tsx     # Widget público iframe
├── components/
├── hooks/
├── integrations/supabase/ # Cliente Supabase (browser + admin SSR)
├── lib/
├── _disabled_ai/          # Código de IA congelado (no se compila)
└── styles.css             # Tokens de diseño + Tailwind
```

## Tablas Supabase

`workers`, `services`, `worker_services`, `appointments`, `customers`,
`schedules`, `holidays`, `ai_profile`, `api_keys`. Las migraciones están en
`supabase/migrations/`.

## Hacer cambios

El proyecto sigue Lovable conventions:

- Editar componentes en `src/components/` y rutas en `src/routes/`.
- `routeTree.gen.ts` se regenera automáticamente al guardar un fichero.
- Tailwind reescribe el CSS en caliente.
- Para añadir una página: crea `src/routes/mi-pagina.tsx` con el patrón
  `createFileRoute` — aparece en `/mi-pagina` inmediatamente.
