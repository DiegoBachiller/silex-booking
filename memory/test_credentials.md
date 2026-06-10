# Test credentials & auth setup — SILEX

## Supabase project

- **Project URL**: `https://qhbguphsfnzvmyaxnxqb.supabase.co`
- **Publishable key** (browser-safe): `sb_publishable_1M_9QCMNUhIn1-rqSgDBzw_x2AmCX6A`
- **Service role key**: NOT shared in code. Stored in Cloudflare/Supabase dashboards only.

## Auth providers

### Email + password (Supabase native)
- Sign-up: enabled
- Email confirmation: default Supabase behaviour (configurable in dashboard)
- No app-managed seed users created by code.

### Google OAuth (Supabase native, configured by USER in dashboard)

**Status**: code ready (`supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })`). Provider must be enabled in Supabase + Google Cloud Console by the user.

**Configuration values the user used in Google Cloud Console** → fill in after setup:

| Field                      | Value                                                                 |
|----------------------------|-----------------------------------------------------------------------|
| OAuth Client ID            | _to be filled_                                                        |
| Authorized JavaScript Origin | `http://localhost:3000`, `https://3b422408-58e2-400f-958b-3d81ebdeb6c9.preview.emergentagent.com`, plus production domain |
| Authorized redirect URI     | `https://qhbguphsfnzvmyaxnxqb.supabase.co/auth/v1/callback`           |

**Supabase Auth → URL configuration** (`Authentication → URL Configuration`):

| Field                | Value                                                                                                          |
|----------------------|----------------------------------------------------------------------------------------------------------------|
| Site URL             | production domain (e.g. `https://silex.app` or `https://silex-booking.<user>.workers.dev`)                     |
| Additional redirect URLs | `http://localhost:3000/**`, `https://3b422408-58e2-400f-958b-3d81ebdeb6c9.preview.emergentagent.com/**`, prod domain `/**` |

## Test accounts

None seeded by the app. The user signs up themselves.

## RBAC / roles

Single-tenant (one business per Supabase user). RLS on every table by `auth.uid()`.
