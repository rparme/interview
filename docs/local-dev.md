# Local Development

## How it works

```
Browser → Vite (:5173) → proxy /rest/v1/* → PostgREST (:3000) → Postgres (:5432)
```

In dev mode Vite proxies every `supabase-js` REST call to a local PostgREST container, so the app talks to local Docker Postgres instead of Supabase cloud. The same `supabase-js` client is used in both environments — only the env vars change.

In production (`npm run build`), no proxy exists; `VITE_SUPABASE_URL` points directly to the Supabase project.

## Quick start

```bash
# 1. Start Postgres + PostgREST
docker compose up -d

# 2. Start the dev server (uses .env by default)
npm run dev
```

`.env` is pre-configured with local values — no edits needed for basic browsing.

> **Note:** Sign-in does not work locally (no GoTrue/auth service). Categories and problems load read-only.

## Environment variables

| Variable | Local value | Production value |
|---|---|---|
| `VITE_SUPABASE_URL` | `http://localhost:5173` | `https://<project>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | well-known local JWT (see `.env.example`) | project anon key from Supabase dashboard |

## Production deployment

Set the two env vars to your Supabase project values (Dashboard → Settings → API) and deploy the `dist/` output of `npm run build`.

## How the local stack is initialised

Docker runs these SQL files in order on first startup (fresh volume):

| File | Purpose |
|---|---|
| `docker/auth_stub.sql` | Creates `auth` schema + `auth.uid()` stub so `schema.sql` loads cleanly |
| `supabase/schema.sql` | Tables + RLS policies (same file used by Supabase cloud) |
| `supabase/seed.sql` | 8 categories + 37 problems |
| `docker/postgrest_roles.sql` | `anon` + `authenticator` roles required by PostgREST |

To reset the database: `docker compose down -v && docker compose up -d`

## PostgREST JWT secret

PostgREST is configured with the well-known Supabase CLI development secret:

```
super-secret-jwt-token-with-at-least-32-characters-long
```

The anon key in `.env` / `.env.example` is a JWT signed with this secret (`role: anon`):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlLWRlbW8iLCJpYXQiOjE2NDE3NjkyMDAsImV4cCI6MTc5OTUzNTYwMH0.F_rDxRTPE8OU83L_CNgEGXfmirMXmMMugT29Cvc8ygQ
```
**Never use these values in production.**
