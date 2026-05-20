---
name: security-patterns
description: Security findings and patterns in Klyro codebase — Phase 1 and Phase 2 (Wizard) review
metadata:
  type: project
---

Key security findings from Phase 1 review:

1. **Service role key used on public landing page** (`src/app/[locale]/page.tsx`) — `SUPABASE_SERVICE_ROLE_KEY` used to count businesses on a public page. This is a dev scaffold; must be removed before any production traffic. The service key bypasses all RLS.

2. **Middleware uses inline Supabase client instead of `updateSession`** — `src/middleware.ts` duplicates the cookie-handling logic that `src/lib/supabase/middleware.ts` already encapsulates. The `updateSession` function exists but is never called. This creates a maintenance risk if the cookie logic diverges.

3. **`next` redirect param on login is user-controlled** — The `next` query parameter set in middleware is passed to the callback route and used directly as a redirect target. No validation that it's a relative path — open redirect risk if `next` is set to an external URL.

4. **RLS `service role can manage messages` policy** — `using (true)` allows ANY authenticated user (not just service role) to manage messages if using the anon key with a JWT. The intent is service-role-only but the policy name is misleading — it applies to all roles.

5. **Auth trigger uses `private` schema** — Correct pattern; `private.handle_new_user()` runs as `security definer` with empty `search_path`. Well-implemented.

6. **`users` INSERT policy** — `with check (true)` means any authenticated user can insert a row into `public.users`. This is intentional (for the auth trigger to work via service role) but is a broad policy. Should be restricted to service role only in prod.

**Phase 2 (Wizard) security findings — RESOLVED in current branch:**

6. **Client-supplied IDs now verified via ownership check** — All wizard server actions (`saveBranchStep`, `saveServicesStep`, `saveStaffStep`, `saveAvailabilityStep`, `saveMessagingStep`, `completeSetup`) now call `getVerifiedUserAndBusiness(admin)` which queries the `users` table to retrieve the session-derived `businessId`, then compare it against the client-supplied `businessId` parameter. Branch and staff IDs are further verified with `.eq("business_id", ownBusinessId)` queries before any writes. This closes the cross-tenant write vulnerability from Phase 1. Pattern to enforce in future reviews.

7. **Zod validation added to all server actions** — All wizard actions now call the relevant `stepNSchema.safeParse()` at the top of the function. Previously schemas existed only on the client.

8. **`auth.ts` accesses `NEXT_PUBLIC_APP_URL` via `process.env` directly, bypassing `env.ts`** — Line 7 of `auth.ts` reads `process.env["NEXT_PUBLIC_APP_URL"]` with a local fallback instead of using `env.NEXT_PUBLIC_APP_URL`. Still unresolved.

9. **`saveServicesStep` uses non-atomic delete-then-insert pattern** — Inserts new services first (good), but the subsequent `delete` of old `branch_services` and old `services` rows is not transactional. If the final `branch_services.insert()` for new services fails, new service rows are orphaned in the `services` table with no branch link. Should use an RPC or a single atomic transaction.

10. **`saveAvailabilityStep` startTime/endTime ordering not validated** — The `availabilitySlotSchema` validates format (`HH:MM`) but not that `startTime < endTime`. A slot with `startTime: "18:00"` and `endTime: "09:00"` passes schema validation and gets written to the DB.

11. **`step7Schema.whatsappNumber` has no format validation** — `z.string()` with no `.regex()` or `.min()`. When `channel === "whatsapp"`, a blank or malformed number passes Zod and reaches the DB.

**Why:** Documenting for future reviews so these known issues are tracked.
**How to apply:** Flag the service role key on the public page as critical in any Phase 2+ review. The ownership-check pattern in wizard actions is correct and should be the template for all future admin-client writes.

[[project-architecture]]
