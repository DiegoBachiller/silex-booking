
# Plan: Login admin + Reservas públicas en tiempo real + Integración n8n/Vapi

Tres bloques independientes, todos sobre la misma base actual.

---

## 1. Autenticación (email + Google) para proteger el panel

Hoy SILEX es single-tenant sin login. Voy a añadir un muro de acceso **solo para el panel de administración** (`/calendar`, `/team`, `/services`, `/holidays`, `/ai-config`). Los endpoints `/api/public/ai-tools/*` y el nuevo widget público siguen abiertos (los primeros con API key, el segundo público de lectura/escritura controlada).

Cambios:

- Activar Lovable Cloud Auth con **Email/Password + Google** (gestionado, sin pedir credenciales OAuth).
- Nueva ruta `/login` con dos opciones: formulario email/contraseña y botón "Continuar con Google".
- Layout protegido `src/routes/_authenticated.tsx` con `beforeLoad` → si no hay sesión, redirige a `/login`.
- Mover las rutas actuales bajo `_authenticated/` (calendar, team, services, holidays, ai-config).
- Botón "Cerrar sesión" en `AppShell`.
- Tabla `profiles` mínima (id, email, full_name, avatar_url) con trigger `on_auth_user_created` que la rellena.
- RLS: solo el propio usuario puede leer/editar su `profiles`. El resto de tablas de la app (workers, services, etc.) las dejamos accesibles a cualquier usuario autenticado (sigue siendo un único negocio).

Notas:
- Sin confirmación de email para acelerar pruebas (luego puedes activarlo).
- No multi-tenant todavía: cualquier usuario que se registre verá el negocio. Si más adelante quieres restringir por invitación o limitar a un solo admin, lo añadimos con tabla `user_roles`.

---

## 2. Widget público de reservas + disponibilidad en tiempo real

Objetivo: que tu web pueda **(a)** mostrar slots libres actualizándose solos y **(b)** permitir que un cliente reserve, y que esa reserva aparezca al instante en `/calendar`.

### 2.1 Endpoints públicos (sin API key, con rate-limit suave)

Bajo `src/routes/api/public/booking/`:

- `GET /api/public/booking/config` → devuelve servicios activos, trabajadores activos y duración. Para que el widget se pinte solo.
- `GET /api/public/booking/availability?date=YYYY-MM-DD&service_id=...&worker_id=...` → reutiliza `computeAvailability` ya existente. CORS abierto.
- `POST /api/public/booking/book` → crea cita con `source = "web"`. Valida con Zod (nombre, teléfono/email, slot, servicio). Comprobación de conflicto. Sin API key.

CORS `*` en estos endpoints, headers JSON.

### 2.2 Widget embebible

Nueva ruta pública `/embed/book` (sin AppShell, layout aislado, sin auth):
- Selector de servicio → trabajador → fecha → slot → datos de contacto → confirmar.
- Estilos heredados de los tokens (Light Premium).
- Pensado para meterse en un `<iframe>` en la web del cliente:
  ```html
  <iframe src="https://tu-app.lovable.app/embed/book"
          style="width:100%;height:780px;border:0"></iframe>
  ```

### 2.3 Vista pública de disponibilidad en tiempo real

Nueva ruta pública `/embed/availability`:
- Muestra los próximos 7 días con slots libres por trabajador (chips clicables).
- Suscripción **Supabase Realtime** a la tabla `appointments`: cuando cambia algo, refresca disponibilidad automáticamente.
- También embebible por iframe en cualquier web.
- Migración: `ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;`

### 2.4 Calendario admin también en tiempo real

Activar la misma suscripción realtime dentro de `/calendar` para que las reservas hechas por la web o por la IA aparezcan sin recargar.

---

## 3. Integración n8n + Vapi/ElevenLabs (sin código nuevo, solo guía + docs en la app)

Los endpoints AI ya existen y están protegidos por `x-api-key`:
- `POST /api/public/ai-tools/availability`
- `POST /api/public/ai-tools/book`
- `POST /api/public/ai-tools/reschedule`
- `POST /api/public/ai-tools/cancel`

Voy a:

### 3.1 Mejorar la página `/ai-config`

Nueva pestaña **"Integraciones"** con tres tarjetas listas para copiar:

**a) Vapi (voz por teléfono)** — bloque con 4 *function/tool definitions* en JSON listas para pegar en el dashboard de Vapi (`checkAvailability`, `bookAppointment`, `rescheduleAppointment`, `cancelAppointment`), cada una apuntando a tu URL `https://...lovable.app/api/public/ai-tools/...` con header `x-api-key`.

**b) ElevenLabs (Conversational AI)** — mismo set, formateado como tools de ElevenLabs Agents.

**c) n8n (WhatsApp / Telegram / cualquier canal)** — instrucciones paso a paso + un **workflow JSON exportable** que el usuario importa en n8n:
- Trigger: WhatsApp Business / Telegram / Webhook.
- Nodo **AI Agent** (OpenAI o Gemini) con system prompt orientado a recepcionista.
- 4 nodos **HTTP Request** configurados como *Tools* del agente, apuntando a los endpoints con tu API key.
- Nodo de respuesta al canal.

### 3.2 Documentación inline

En `/ai-config` añadir un panel "Cómo conectar tu agente" con:
- URL base de tu proyecto.
- Cómo crear/rotar API keys (ya existe).
- Snippets `curl` de los 4 endpoints.
- Schemas JSON de input/output.

No requiere ningún backend nuevo: todo el trabajo de IA lo hace n8n/Vapi/ElevenLabs llamando a tus endpoints existentes.

---

## Detalles técnicos

```text
src/
├─ routes/
│  ├─ login.tsx                       (nuevo)
│  ├─ _authenticated.tsx              (nuevo, gate)
│  ├─ _authenticated/
│  │   ├─ calendar.tsx                (movido)
│  │   ├─ team.tsx                    (movido)
│  │   ├─ services.tsx                (movido)
│  │   ├─ holidays.tsx                (movido)
│  │   └─ ai-config.tsx               (movido + tab Integraciones)
│  ├─ embed/
│  │   ├─ book.tsx                    (nuevo, público)
│  │   └─ availability.tsx            (nuevo, público + realtime)
│  └─ api/public/booking/
│      ├─ config.ts                   (nuevo)
│      ├─ availability.ts             (nuevo)
│      └─ book.ts                     (nuevo)
└─ integrations/lovable/...           (generado por configure social auth)
```

Migraciones SQL:
- `profiles` + trigger `handle_new_user`.
- `ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments`.
- (Opcional) índice en `appointments(starts_at)` para la vista realtime.

---

## Lo que NO incluye este plan

- Multi-tenant real (un usuario = un negocio aislado). Sigue siendo single-tenant; cualquier usuario logueado administra el mismo calendario.
- Pagos/depósitos en la reserva pública.
- Notificaciones por email/SMS al cliente al reservar (puedo añadirlas después con Resend o Twilio).
- Despliegue automático en n8n: te doy el JSON del workflow, lo importas tú.

¿Aplico el plan completo, o prefieres que empiece por uno de los tres bloques?
