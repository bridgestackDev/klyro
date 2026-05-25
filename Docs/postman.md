# Importing the Klyro API into Postman

## Quick import

1. Open Postman → **File → Import**.
2. Select the **Link** tab and paste one of these URLs:
   - Local dev: `http://localhost:3000/openapi.json`
   - Production: `https://klyro.app/openapi.json`
3. Postman will create a **Klyro API** collection with all endpoints pre-configured.

## Environments

Import one of the pre-built environments from `docs/postman/`:

| File | Purpose |
|------|---------|
| `klyro-local.postman_environment.json` | Local dev (`http://localhost:3000`) |
| `klyro-staging.postman_environment.json` | Staging / preview deploy |

In Postman: **Environments → Import → Upload Files** → select the JSON file.

## Authenticated endpoints

Most booking endpoints are public (no auth). Future endpoints that require auth will need a Supabase JWT:

1. Log in at `http://localhost:3000/es/login`.
2. Open browser DevTools → **Application → Cookies** → copy the `sb-*-auth-token` value.
3. Set the `supabaseJwt` variable in your active environment.
4. Add an `Authorization: Bearer {{supabaseJwt}}` header to the request.

## Current endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/booking/slots` | List available time slots for a staff member |
| `POST` | `/api/booking/create` | Create a booking appointment |

New endpoints added in each phase will appear in the spec automatically after running `pnpm openapi:gen`.
