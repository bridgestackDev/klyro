# Block D Design — Branches / Services / Links / Settings

**Date:** 2026-06-08  
**Phase:** 5 — Owner Dashboard  
**Status:** Approved, ready for implementation planning

---

## Overview

Block D delivers the four remaining owner dashboard pages: Branches, Services, Links/QR, and Settings expansion. It is split into four atomic sub-blocks, each one commit.

| Sub-block | Surface | Pattern | Migration |
|-----------|---------|---------|-----------|
| D1 | Branches CRUD | List page + Sheet add/edit + server actions | None |
| D2 | Services CRUD | List page + Dialog add/edit + server actions | None |
| D3 | Links / QR | Read-only list + client QR generation | None |
| D4 | Settings expansion | Business Info Card on existing `/settings` page | None |

No new DB migrations are needed. All required columns already exist on `branches`, `services`, and `businesses`.

**Note on messaging config:** `whatsapp_number` is stored per-branch (on `branches`), not on `businesses`. Rather than introducing a business-level messaging column (which would require a migration and create a confusing dual-location), the `whatsapp_number` field is managed inside the D1 Branch Sheet alongside the other branch fields. The D4 Settings page is limited to business-level info only.

---

## Shared patterns

- All server actions use the owner-authed pattern from `team.ts` (ADR-036): verify ownership via the authed Supabase client — never the admin client.
- All write actions call `revalidatePath` after success.
- Zod schemas live in `src/lib/schemas/` alongside existing schemas.
- Forms use react-hook-form + sonner toasts for feedback, consistent with `BrandSettingsForm`.
- Active/inactive toggles are optimistic with revert on failure, consistent with the staff active toggle in `EditStaffDialog`.

---

## D1 — Branches CRUD

### Page

`src/app/[locale]/(dashboard)/branches/page.tsx` — server component.

Fetches all branches for the business (RLS-scoped, ordered by `created_at` ASC). Renders a `BranchList` client component with an "Add branch" header button.

### BranchCard

Displays: name, city + country, timezone, active/inactive badge, WhatsApp number (if set). Edit button opens the sheet prefilled. No inline delete — deactivation is the soft-delete pattern.

### BranchSheet

Unified add/edit Sheet (shadcn `Sheet` component, already used in `AppointmentDrawer`). Prop: `initialData?: Branch` — controls add vs. edit mode.

**Fields:**
- Name (text, required)
- Address (text, optional)
- City (text, optional)
- Country (dropdown from `COUNTRIES` catalog, default `HN`)
- Timezone (text with autosuggest on country change — same logic as wizard `Step3Branch`)
- Phone (`CountryPhoneInput`, optional — general contact number)
- WhatsApp number (`CountryPhoneInput`, optional — messaging channel for confirmations/reminders)
- Is active (toggle, edit mode only — defaults true on create)

### Server actions

`src/lib/actions/branches.ts`

- `addBranch(data)` — owner-only via `getOwnerContext`, generates collision-safe slug from name (reuses `slugify`; appends `-2`, `-3` etc. on conflict, same pattern as `addStaffMember`), inserts into `branches`, revalidates `/[locale]/branches`
- `updateBranch(id, data)` — same ownership check, updates all editable fields
- `setBranchActive(id, isActive)` — owner-only toggle, revalidates

### Schema

`src/lib/schemas/branches.ts`

`addBranchSchema` / `updateBranchSchema` — mirrors wizard `step3Schema` shape: name (string min 1), address/city/phone/whatsapp_number (all optional), country (enum from COUNTRIES keys), timezone (string).

### Tests

- `src/lib/actions/__tests__/branches.test.ts` — unauth, forbidden role, success add, success update, not-found update, active toggle
- `src/components/dashboard/branches/__tests__/BranchCard.test.tsx` — renders name, city, active badge
- `src/components/dashboard/branches/__tests__/BranchSheet.test.tsx` — opens on button click, renders all fields, closes on cancel

---

## D2 — Services CRUD

### Page

`src/app/[locale]/(dashboard)/services/page.tsx` — server component.

Fetches all services for the business (RLS-scoped, ordered by `created_at` ASC). Renders a `ServiceList` client component with an "Add service" header button.

### ServiceRow

Table-style row (responsive card on mobile). Displays: name, duration (e.g. "45 min"), buffer (e.g. "+ 10 min" — only shown if > 0), price via `formatCurrency`, active badge. Edit button opens the dialog prefilled. Active toggle fires `setServiceActive` inline (optimistic with revert).

### ServiceDialog

Unified add/edit Dialog (shadcn `Dialog`). Prop: `initialData?: Service` — controls add vs. edit mode.

**Fields:**
- Name (text, required)
- Duration (number input, minutes, required — range 5–480)
- Buffer (number input, minutes, optional — range 0–120, default 0)
- Price (decimal input, converted to cents on submit)
- Currency (select, defaults to `business.default_currency`)

No is_active on create — new services start active.

### Server actions

`src/lib/actions/services.ts`

- `addService(data)` — owner-only, inserts into `services` with `business_id` from session, revalidates `/[locale]/services`
- `updateService(id, data)` — ownership check, updates all editable fields
- `setServiceActive(id, isActive)` — owner-only toggle, revalidates

### Schema

`src/lib/schemas/services.ts`

`addServiceSchema` / `updateServiceSchema` — name (string min 1), duration_min (int 5–480), buffer_min (int 0–120, optional default 0), price_cents (non-negative int), currency (string).

### Tests

- `src/lib/actions/__tests__/services.test.ts` — unauth, forbidden, cross-tenant, success add, success update, active toggle, validation failure
- `src/components/dashboard/services/__tests__/ServiceRow.test.tsx` — renders name, duration, price, active badge
- `src/components/dashboard/services/__tests__/ServiceDialog.test.tsx` — opens, renders fields, closes on cancel

---

## D3 — Links / QR

### Page

`src/app/[locale]/(dashboard)/links/page.tsx` — server component.

Fetches all active staff with their active branch assignments for the business (join: `staff → staff_branches → branches`, filtered by `staff.is_active = true` and `branches.is_active = true`). Also fetches `business.slug`.

For each staff+branch pair, constructs the booking URL:
```
/${locale}/${businessSlug}/${branchSlug}/${staffSlug}
```

Passes the list to a `LinksList` client component.

### LinkCard

Displays: staff avatar/initials (reuses `getInitials`), staff display name, branch name chip, full booking URL (truncated, copyable). Two actions:

- **Copy link** — clipboard API, toggles button label to "Copied!" for 2s, then reverts
- **Download QR** — triggers PNG download (see QrCode component)

### QrCode component

`src/components/dashboard/links/QrCode.tsx` — `'use client'`.

Uses the `qrcode` npm package to render the booking URL onto a `<canvas>` element on mount (hidden visually, used as the download source). "Download QR" button calls `canvas.toDataURL('image/png')` and triggers an `<a download="klyro-qr-[staffSlug].png">` click.

QR options: size 256×256, dark color `#6D64FB` (Klyro Violet), light color `#FFFFFF` — visible when printed or displayed on light surfaces.

**New dependency:** `qrcode` + `@types/qrcode` (justifies the dep noted in TASKS.md).

### No server actions

Read-only page — no writes, no migration.

### Tests

- `src/components/dashboard/links/__tests__/LinkCard.test.tsx` — renders staff name, branch chip, URL; copy button toggles label
- `src/components/dashboard/links/__tests__/QrCode.test.tsx` — renders a canvas element; download button present

---

## D4 — Settings Expansion

### Page change

The existing `src/app/[locale]/(dashboard)/settings/page.tsx` already renders a Brand Card. D4 adds one new Card below it in the same `space-y-6` layout — no structural change.

### Business Info Card

`src/components/dashboard/settings/BusinessInfoForm.tsx` — `'use client'`, react-hook-form.

**Fields (all already on `businesses`, no migration):**
- Business name (text, required)
- Country (dropdown from `COUNTRIES` catalog)
- Default currency (text, auto-suggested on country change — same pattern as wizard)
- Default language (select: ES / EN)

Server action: `updateBusinessInfo(data)` — sonner toast on success/failure.

### Server actions

`src/lib/actions/settings.ts`

- `updateBusinessInfo(data)` — owner-only authed client, updates `businesses` row (name, country, default_currency, default_language), revalidates `/[locale]/settings`

### Schema

`src/lib/schemas/settings.ts`

`businessInfoSchema` — name (string min 1), country (enum from COUNTRIES keys), default_currency (string), default_language (enum `'es' | 'en'`).

### Tests

- `src/lib/actions/__tests__/settings.test.ts` — unauth, forbidden, success
- `src/components/dashboard/settings/__tests__/BusinessInfoForm.test.tsx` — renders fields, submits

---

## File inventory (new files per sub-block)

### D1
```
src/lib/schemas/branches.ts
src/lib/actions/branches.ts
src/lib/actions/__tests__/branches.test.ts
src/components/dashboard/branches/BranchCard.tsx
src/components/dashboard/branches/BranchSheet.tsx
src/components/dashboard/branches/__tests__/BranchCard.test.tsx
src/components/dashboard/branches/__tests__/BranchSheet.test.tsx
src/app/[locale]/(dashboard)/branches/page.tsx   (replaces .gitkeep)
```

### D2
```
src/lib/schemas/services.ts
src/lib/actions/services.ts
src/lib/actions/__tests__/services.test.ts
src/components/dashboard/services/ServiceRow.tsx
src/components/dashboard/services/ServiceDialog.tsx
src/components/dashboard/services/__tests__/ServiceRow.test.tsx
src/components/dashboard/services/__tests__/ServiceDialog.test.tsx
src/app/[locale]/(dashboard)/services/page.tsx   (replaces .gitkeep)
```

### D3
```
src/components/dashboard/links/LinkCard.tsx
src/components/dashboard/links/QrCode.tsx
src/components/dashboard/links/__tests__/LinkCard.test.tsx
src/components/dashboard/links/__tests__/QrCode.test.tsx
src/app/[locale]/(dashboard)/links/page.tsx      (replaces .gitkeep)
```

### D4
```
src/lib/schemas/settings.ts
src/lib/actions/settings.ts
src/lib/actions/__tests__/settings.test.ts
src/components/dashboard/settings/BusinessInfoForm.tsx
src/components/dashboard/settings/__tests__/BusinessInfoForm.test.tsx
```
_(settings/page.tsx is modified, not new)_

---

## i18n keys (new namespaces)

- `dashboard.branches.*` — page title, add button, empty state, sheet labels, field placeholders, save/saved/failed
- `dashboard.services.*` — page title, add button, empty state, dialog labels, field placeholders, save/saved/failed
- `dashboard.links.*` — page title, empty state, copy button, copied label, download button
- `settings.business.*` — card title, field labels, save/saved/failed

All keys added to both `es.json` and `en.json`.

---

## Out of scope for Block D

- Branch-to-service assignment (many-to-many via `branch_services`) — managed at wizard time; re-assignment deferred
- Service ordering / drag-and-drop
- Branch deletion (soft-delete via `is_active` is sufficient for MVP)
- Service deletion
- Business slug edit (high-risk: breaks all existing booking URLs)
