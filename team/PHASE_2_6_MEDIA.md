# Phase 2.6 — Business & Staff Media

**Goal:** Let owners upload a business logo and a photo per staff member. Foundation only — no full team management page yet (that lands in Phase 5).

**Branch:** `feature/media-upload` off `development`.

**Why this phase exists:** `businesses.logo_url` and `staff.avatar_url` are in the schema since Phase 0 but never used. The wizard skipped them intentionally to keep onboarding under 15 minutes. This phase adds them post-wizard, from the dashboard, where it doesn't slow down setup.

**Parallel-safe with Phase 3:** purely additive. Phase 3 (booking pages) reads these fields with a fallback; once both branches merge, images start appearing automatically. No shared files, no schema conflict.

**Read before starting:** `CLAUDE_CODE_WORKFLOW.md` (rules, block pattern, anti-patterns), `Klyro_Technical_PRD.md` §5.1 (fields already in schema), `STATUS.md`, `TASKS.md`, `DECISIONS.md`.

---

## Block order

| Block | Goal | Files touched (approx) | Commit |
|---|---|---|---|
| A | Storage buckets + RLS + reusable `<ImageUpload />` | ~12 | `feat(phase-2.6-block-a): storage infrastructure for media uploads` |
| B | Business logo upload from `/dashboard/settings` | ~10 | `feat(phase-2.6-block-b): business logo upload from /dashboard/settings` |
| C | Staff avatar upload from `/dashboard/team` | ~12 | `feat(phase-2.6-block-c): staff avatar upload from /dashboard/team` |

One block per session. One commit per block. Stop and report after each.

---

## Block A — Storage Infrastructure

**Goal:** Build the foundation. No UI for either feature in this block.

**Migration:** `supabase/migrations/0008_storage_buckets.sql`

Create two public Supabase Storage buckets:

- `business-logos` — public read, 2 MB limit, `image/png`, `image/jpeg`, `image/webp`
- `staff-avatars` — public read, 1 MB limit, same MIME types

Path convention (document as ADR-008):
- Logo: `business-logos/{business_id}/logo.{ext}`
- Avatar: `staff-avatars/{business_id}/{staff_id}.{ext}`

This convention is what RLS uses to authorize via `(storage.foldername(name))[1] = business_id`.

RLS policies on `storage.objects` (reuse the existing `auth.current_business_id()` and `auth.is_owner()` helpers from migration 0002):

**business-logos:**
- INSERT / UPDATE / DELETE: only owner of the business whose `business_id` matches the folder.
- SELECT: public (logos appear on public booking pages).

**staff-avatars:**
- INSERT / UPDATE / DELETE: owner OR the staff user themselves (`user_id = auth.uid()`).
- SELECT: public.

Apply migration locally. Remind the human to apply to staging Supabase before deploy.

**Reusable component:** `src/components/shared/ImageUpload.tsx`

`'use client'` component. Props:

```ts
{
  bucket: 'business-logos' | 'staff-avatars';
  path: string;                       // e.g. "<biz_id>/logo.png"
  currentUrl: string | null;
  onUploaded: (publicUrl: string) => void | Promise<void>;
  maxSizeMB?: number;                 // default 2 for logos, 1 for avatars
  aspect?: 'square' | 'free';         // default 'square'
  label?: string;
  helpText?: string;
  disabled?: boolean;
}
```

Behavior:

- Click target shows current image, or a Klyro-branded placeholder using `<Logo variant="mark" />` at low opacity.
- File picker accepts `image/png`, `image/jpeg`, `image/webp`.
- Client-side validation: size ≤ `maxSizeMB`, MIME in allowlist. Inline error via the existing `ApiError`-compatible resolver pattern from the wizard.
- Client-side resize: if image is larger than 1024px on the longest side, resize using a plain HTML canvas before upload. Preserve aspect ratio.
- Upload via `supabase.storage.from(bucket).upload(path, blob, { upsert: true })`.
- On success: `supabase.storage.from(bucket).getPublicUrl(path)`, then `onUploaded(publicUrl)`.
- Loading state during upload (spinner inside click target, disable button).
- `aria-label` and keyboard support (Space/Enter triggers picker).

Do NOT add a third-party crop library (no `react-image-crop`, no `sharp` on client, no `react-easy-crop`). Plain canvas resize is enough for MVP. Document as ADR-009.

**i18n keys** (add to `src/i18n/locales/es.json` and `en.json`):

```
media.upload.button         "Subir imagen" / "Upload image"
media.upload.change         "Cambiar imagen" / "Change image"
media.upload.uploading      "Subiendo..." / "Uploading..."
media.upload.tooLarge       "Imagen demasiado grande (máx {max} MB)" / "Image too large (max {max} MB)"
media.upload.wrongType      "Formato no soportado. Usa PNG, JPG o WebP." / "Unsupported format. Use PNG, JPG or WebP."
media.upload.failed         "No se pudo subir la imagen." / "Couldn't upload the image."
```

**Tests:** `src/components/shared/__tests__/ImageUpload.test.tsx`

- Renders placeholder when `currentUrl` is null.
- Renders `<img>` when `currentUrl` is set.
- Rejects file over `maxSizeMB` (shows error, does NOT call upload).
- Rejects file with disallowed MIME.
- On valid file: triggers upload mock, calls `onUploaded` with returned URL.
- `aria-label` present, button focusable.
- `disabled` prop blocks interaction.

Mock `supabase.storage.from(...).upload` and `getPublicUrl`. Use the existing test setup (jsdom, testing-library). Tests must exercise real component code paths, not just assert the mock was called.

**Docs:**

- `STATUS.md`: add row "2.6 | Business & Staff Media | 🟡 In progress | Block A done"; add Phase 2.6 section with files added.
- `TASKS.md`: add `## Phase 2.6 — Business & Staff Media` section with three sub-sections (A done, B and C unchecked).
- `DECISIONS.md`: ADR-008 (storage path convention), ADR-009 (no crop library in MVP).

**Validation:** `pnpm typecheck && pnpm lint && pnpm test` — all green, only pre-existing unrelated errors allowed.

**Commit message:**

```
feat(phase-2.6-block-a): storage infrastructure for media uploads

Add business-logos + staff-avatars Supabase Storage buckets with RLS
policies keyed on business_id folder convention. Add reusable
<ImageUpload /> component with canvas-based client-side resize, MIME +
size validation, and public-URL emission.

This block is foundation only — no UI is wired yet. Blocks B and C
will consume <ImageUpload /> from /dashboard/settings and /dashboard/team.

Refs: TASKS.md Phase 2.6 / Block A
ADR-008: storage path convention
ADR-009: no third-party crop library
```

**Stop and report:** exit criteria met, file list, new deps (should be none), ADRs added, manual steps for the human. Do not begin Block B.

---

## Block B — Business Logo Upload

**Goal:** Owner uploads a logo from `/[locale]/dashboard/settings`. Banner on dashboard home if `logo_url` is null. Phase 3 will consume the field later — that integration is NOT this block.

**Pages and components:**

`src/app/[locale]/(dashboard)/settings/page.tsx` — server component. If the page already exists, add a "Brand" section. If it doesn't exist, create it with a shadcn Card layout containing only the Brand section for now (other settings come later). Fetch the current business via the authed Supabase server client.

`src/components/dashboard/settings/BrandSettingsForm.tsx` — `'use client'`. Uses:

```tsx
<ImageUpload
  bucket="business-logos"
  path={`${businessId}/logo.png`}
  currentUrl={currentLogoUrl}
  onUploaded={handleUploaded}
  aspect="square"
  maxSizeMB={2}
  label={t('settings.brand.title')}
  helpText={t('settings.brand.help')}
/>
```

`onUploaded` calls the `updateBusinessLogo(url)` server action and shows a Klyro-branded toast (sonner) on success or failure.

`src/components/dashboard/SetupLogoBanner.tsx` — server component. Receives `business` as prop. If `business.logo_url` is null/empty AND `business.onboarding_completed === true`, renders a dismissible banner above the dashboard content linking to `/dashboard/settings`. Match the existing dashboard banner pattern but quieter (logo missing is not urgent). `aria-label` on the dismiss button.

Wire `<SetupLogoBanner />` into `src/app/[locale]/(dashboard)/dashboard/page.tsx`.

**Server action:** `src/lib/actions/media.ts`

```ts
export async function updateBusinessLogo(logoUrl: string): Promise<void>
```

- Use the authed Supabase server client (not service-role admin — owner is doing this, RLS is the authority).
- Verify session; throw `ApiError.unauthorized()` if missing.
- Look up `business_id` via existing helper pattern from `wizard.ts`.
- `UPDATE businesses SET logo_url = $1, updated_at = now() WHERE id = $2` using the same scoping pattern as `wizard.ts`.
- If no rows updated or PG error: throw appropriate `ApiError.*` (FORBIDDEN, NOT_FOUND, INTERNAL).
- `revalidatePath('/[locale]/dashboard')` and `revalidatePath('/[locale]/dashboard/settings')`.
- `logger.info({ userId, businessId, action: 'updateBusinessLogo' })`.

Why server action over route handler: consistency with `wizard.ts`.

**i18n keys:**

```
settings.brand.title              "Marca de tu negocio" / "Your business brand"
settings.brand.help               "Esta imagen aparecerá en tu página pública de reservas." / "This image will appear on your public booking page."
settings.brand.updated            "Logo actualizado" / "Logo updated"
settings.brand.failed             "No se pudo actualizar el logo" / "Couldn't update the logo"
dashboard.banners.logo.title      "Sube el logo de tu negocio" / "Add your business logo"
dashboard.banners.logo.body       "Aparecerá en tu página pública de reservas y en los mensajes a tus clientes." / "It will appear on your public booking page and in messages to your clients."
dashboard.banners.logo.cta        "Ir a Configuración" / "Go to Settings"
dashboard.banners.logo.dismiss    "Cerrar" / "Dismiss"
```

**Tests:**

- `src/lib/actions/__tests__/media.test.ts` — `updateBusinessLogo`: rejects no session (UNAUTHORIZED), rejects business not found (NOT_FOUND), succeeds for owner.
- `src/components/dashboard/settings/__tests__/BrandSettingsForm.test.tsx` — renders `ImageUpload` with correct bucket+path, calls `updateBusinessLogo` on `onUploaded`, shows success toast on success, error toast on failure.
- `src/components/dashboard/__tests__/SetupLogoBanner.test.tsx` — returns null when `logo_url` is set, renders when null and onboarding complete, returns null when onboarding incomplete.

**Docs:**

- `STATUS.md`: mark Block B done in Phase 2.6 section.
- `TASKS.md`: check off Block B items.
- `DECISIONS.md`: ADR-010 only if a non-obvious decision is made (e.g. banner dismissal stored in localStorage).

**Validation:** `pnpm typecheck && pnpm lint && pnpm test` — all green.

**Commit message:**

```
feat(phase-2.6-block-b): business logo upload from /dashboard/settings

Add Brand section to settings page consuming <ImageUpload />. Add
updateBusinessLogo server action with RLS-enforced ownership check.
Add SetupLogoBanner on dashboard home when logo_url is null.

Refs: TASKS.md Phase 2.6 / Block B
```

**Stop and report:** exit criteria (logo round-trips: pick → upload → visible on dashboard), file list, new deps (should be none). Do not begin Block C.

---

## Block C — Staff Avatar Upload

**Goal:** Owner views team at `/[locale]/dashboard/team` and uploads an avatar per staff. Build only what's needed for avatar editing — full team management (invite, deactivate, schedule) lands in Phase 5.

**Pages and components:**

`src/app/[locale]/(dashboard)/team/page.tsx` — server component. Selects `id, display_name, slug, avatar_url` from `staff` where `business_id = current AND is_active = true`. Renders responsive grid (1 col mobile, 2 col md, 3 col lg) of `<StaffCard />`s.

`src/components/dashboard/team/StaffCard.tsx` — `'use client'`. Receives `{ staff, businessId }`. Shows avatar (or initials placeholder via `getInitials`) + display name + slug + "Editar" button. Click opens `<EditStaffDialog />`.

`src/components/dashboard/team/EditStaffDialog.tsx` — `'use client'`. Shadcn `Dialog`. For MVP contains only an avatar upload section:

```tsx
<ImageUpload
  bucket="staff-avatars"
  path={`${businessId}/${staff.id}.png`}
  currentUrl={staff.avatarUrl}
  onUploaded={handleUploaded}
  aspect="square"
  maxSizeMB={1}
/>
```

`onUploaded` calls `updateStaffAvatar(staffId, url)`. Footer with "Cerrar" button. `aria-labelledby` / `role=dialog` handled by shadcn.

**Server action:** extend `src/lib/actions/media.ts`

```ts
export async function updateStaffAvatar(staffId: string, avatarUrl: string): Promise<void>
```

- Authed server client.
- Verify session; throw UNAUTHORIZED if missing.
- Explicit check: staff belongs to the user's business OR user is the staff itself. RLS will enforce again, but the explicit check gives a clean error code.
- `UPDATE staff SET avatar_url = $1, updated_at = now() WHERE id = $2`.
- `revalidatePath('/[locale]/dashboard/team')`.
- `logger.info({ userId, staffId, action: 'updateStaffAvatar' })`.

**Helper:** `src/lib/format/initials.ts`

```ts
export function getInitials(displayName: string): string
```

Cases: `"Juan Pérez"` → `"JP"`, `"Marcus"` → `"M"`, `""` → `"?"`, accented characters handled. Use the same export pattern as the rest of `src/lib/format/`.

Use this in `StaffCard` for the placeholder when `avatar_url` is null.

**i18n keys:**

```
team.title                     "Mi equipo" / "My team"
team.empty                     "Aún no tienes miembros en tu equipo." / "You don't have any team members yet."
team.edit                      "Editar" / "Edit"
team.dialog.title              "Editar miembro del equipo" / "Edit team member"
team.dialog.avatar.label       "Foto de perfil" / "Profile photo"
team.dialog.avatar.help        "Cuadrada, máximo 1 MB. PNG, JPG o WebP." / "Square, max 1 MB. PNG, JPG or WebP."
team.dialog.close              "Cerrar" / "Close"
team.avatar.updated            "Foto actualizada" / "Photo updated"
team.avatar.failed             "No se pudo actualizar la foto" / "Couldn't update the photo"
```

**Tests:**

- `src/lib/actions/__tests__/media.test.ts` — extend with `updateStaffAvatar` tests (unauth, wrong tenant, success).
- `src/lib/format/__tests__/initials.test.ts` — `getInitials` cases (1 word, 2 words, 3+ words, accented characters, empty string).
- `src/components/dashboard/team/__tests__/StaffCard.test.tsx` — renders avatar when set, renders initials when not, opens dialog on click.
- `src/components/dashboard/team/__tests__/EditStaffDialog.test.tsx` — opens and closes, calls `updateStaffAvatar` on upload.

**Docs:**

- `STATUS.md`: Phase 2.6 ✅ Done. Add a retro paragraph (what shipped, what surprised us, what to revisit in Phase 5).
- `TASKS.md`: check off Block C; add forward note in Phase 5 reminding us to revisit full team management.
- `DECISIONS.md`: ADR-011 documenting that the team page in 2.6 is intentionally minimal (avatar-only edit) — full team management deferred to Phase 5.

**Validation:** `pnpm typecheck && pnpm lint && pnpm test` — all green.

**Commit message:**

```
feat(phase-2.6-block-c): staff avatar upload from /dashboard/team

Add minimal team page listing active staff with avatar (or initials)
placeholder. Add EditStaffDialog with <ImageUpload /> wired to
updateStaffAvatar server action. Add getInitials helper.

This is a minimal team page for Phase 2.6 — full team management
(invite, deactivate, role, schedule) lands in Phase 5.

Refs: TASKS.md Phase 2.6 / Block C
```

**Tag the phase:**

```bash
git tag phase-2.6-done
```

**Stop and report:** exit criteria (avatar round-trips: pick → upload → visible on team page), file list, Phase 2.6 retro paragraph, confirmation that the phase is tagged. Ready for PR to `development`.

---

## Out of scope for Phase 2.6 (do NOT build)

- Image cropping UI (canvas resize is enough; no `react-image-crop` etc.)
- Full team management — invite, deactivate, role assignment, schedule editing (Phase 5)
- Settings sections beyond Brand — business info, language, currency (Phase 5 or later)
- Wizard changes of any kind — Phase 2 is closed, do not touch `src/components/wizard/**`, `src/lib/actions/wizard.ts`, `src/lib/schemas/wizard.ts`
- Booking page integration — Phase 3 owns that; we only expose the fields
- WhatsApp / messaging — Phase 4
- Any new top-level dependency unless the spec explicitly requires it
- Schema changes beyond migration `0008` (no new columns, no new tables)

---

## Anti-patterns to reject at review

Per `CLAUDE_CODE_WORKFLOW.md` §5, reject the block if you see:

- Wizard files touched.
- New top-level dep that isn't justified (`react-image-crop`, `sharp`, `formidable`, `react-easy-crop`, etc.).
- Schema change beyond the storage migration.
- More than ~20 files in Block A, ~15 in Blocks B and C.
- Tests that only assert a mock was called without exercising real code.
- `// @ts-expect-error` or `as any` without a DECISIONS.md entry.
- A "while we're here" bug fix mixed into the commit.
