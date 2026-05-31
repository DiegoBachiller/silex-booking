## 1. RLS: bloquear acceso desde el navegador anónimo

**Confirmado:** todos los endpoints externos (`/api/public/booking/*`, `/api/public/ai-tools/*`) y los helpers de `src/server/*` ya usan `supabaseAdmin` (service role), por lo que endurecer RLS no rompe ni el widget de reservas ni los agentes IA.

Migración SQL:
- Quitar las políticas `public all` actuales en `customers`, `appointments`, `workers`, `services`, `worker_services`, `schedules`, `holidays`, `ai_profile`.
- Crear políticas `FOR ALL TO authenticated USING (true) WITH CHECK (true)` en cada tabla (single-tenant: cualquier admin logueado puede gestionar todo).
- Revocar `GRANT` a `anon` y mantener `GRANT ... TO authenticated` y `GRANT ALL TO service_role`.
- `api_keys` se queda como está (sin políticas, solo service role).

Resultado: el cliente del navegador (anon key, sin sesión) deja de poder leer/escribir nada; los hooks `useSilexData`, `/clientes`, `/estadisticas`, `/calendar` ya van firmados por el usuario logueado (sesión Supabase), así que siguen funcionando. Los endpoints públicos siguen funcionando porque van por service role en el servidor.

## 2. Paginación + límites

**`/clientes`:**
- Hook nuevo `useCustomersPaged(pageSize=25)` con `useInfiniteQuery` y `range(from, to)`. Mantiene el filtro de búsqueda actual (filtrado en cliente sobre las páginas cargadas).
- Botón "Cargar más" al pie de la tabla. Contador "Mostrando X de Y" usando `count: 'exact'` en la primera página.

**Historial de citas dentro de `CustomerSheet`:**
- Nuevo query dedicado por cliente (no reutiliza el `useAppointments()` global, que carga todo). Trae las últimas 10 citas del cliente filtrando server-side por `customer_phone` / `customer_email` / `customer_name`.
- Botón "Cargar más" que pide otras 10 hacia atrás.

## 3. Confirmación al eliminar cliente

- Reemplazar el botón "Eliminar" directo en `CustomerDialog` por un `AlertDialog` de shadcn con texto "Esta acción no se puede deshacer. Las citas pasadas se conservarán y aparecerán marcadas como 'Cliente eliminado'."
- Como no hay FK entre `customers` y `appointments`, al eliminar no se rompe nada en BD.
- Marcado visual: en `CustomerSheet` (ya no aplica tras borrar) y, sobre todo, en el calendario / estadísticas, mostrar un tag pequeño "Cliente eliminado" cuando un `appointment.customer_phone/email/name` no coincide con ninguna fila viva de `customers`. Implementación: hook `useDeletedCustomerMarker(appt)` que cruza con el listado de customers cargados, sin tocar el esquema.

## 4. Badges de estado consistentes

- Extraer un único mapa `APPOINTMENT_STATUS` a `src/lib/appointment-status.ts` con `{ label, color }` para `scheduled | completed | cancelled | no_show` (los mismos hex que ya usa el calendario y la `CustomerSheet`).
- `src/routes/calendar.tsx`, `src/routes/estadisticas.tsx` y `src/routes/clientes.tsx` (CustomerSheet) lo importan en lugar de tener su propio diccionario. Mismo color de fondo (`color-mix` 14%) y mismo texto que el calendario.

## 5. Logo real

Para subirlo: arrastra el archivo (PNG o SVG, fondo transparente preferido) al cuadro del chat y mándalo en tu siguiente mensaje. Cuando lo tenga:
- Lo guardo en `src/assets/logo.svg` (o .png).
- En `src/components/AppShell.tsx` sustituyo el bloque `<div ...><Sparkles/></div>` por `<img src={logo} alt="SILEX" className="h-9 w-9 rounded-lg" />` tanto en sidebar como en top-bar móvil, conservando el wordmark "SILEX" al lado.
- También lo uso como favicon (`public/favicon.ico` o link en `__root.tsx`).

Hasta que lo subas, dejo el icono Sparkles actual.

---

### Detalles técnicos

- Una sola migración de Supabase para el punto 1 (drop + create policies + revoke/grant). Tras aprobarla, `src/integrations/supabase/types.ts` se regenera automáticamente.
- Sin librerías nuevas. Se usa `useInfiniteQuery` (ya viene con TanStack Query) y `AlertDialog` de shadcn (ya está en `src/components/ui/alert-dialog.tsx`).
- Ningún cambio en rutas existentes ni en estilos/tokens. El sidebar sigue idéntico salvo el `<img>` del logo cuando lo subas.
- No toco `/embed/book`, `/embed/availability`, autenticación, conexión Supabase, ni `client.ts`/`types.ts`/`routeTree.gen.ts`.
