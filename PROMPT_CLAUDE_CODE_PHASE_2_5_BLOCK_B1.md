# Claude Code Prompt — Phase 2.5 / Block B.1: Country Selection in Wizard

**Project:** Klyro
**Phase:** 2.5 — Hardening & Localization
**Block:** B.1 (refinement after B, before C)
**Spec:** `Klyro_Technical_PRD.md` v2.0 §5.1 (schema), §6.6 (NFR Localization)
**Workflow rules:** `CLAUDE_CODE_WORKFLOW.md`

---

## Why this refinement exists

The `businesses` and `branches` tables both have a `country` column (PRD §5.1), defaulting to `'HN'`. Block B added a `COUNTRIES` catalog at `src/lib/i18n/countries.ts` with 8 entries (HN + 6 LATAM + US), each containing `currency`, `dialCode`, `timezone`, and `locale`.

The wizard never exposes country to the user — every business gets persisted with `country='HN'` by default. This blocks three downstream items:

- **Phase 3 (Public Booking):** the client form will validate WhatsApp against a country. With no country on the business, we'd be hardcoded to HN.
- **Phase 4 (Messaging):** message templates use locale-specific date/time formats. Without country we can't resolve the right locale.
- **Phase 8 (Closed Beta expansion):** any business onboarded in MX or CO today gets stored as HN, corrupting the data we'd later use to expand.

This block fixes the gap without renumbering wizard steps or breaking the existing 9-step flow.

---

## 🚀 PROMPT

Paste the block below into Claude Code from the `klyro/` repo root. `Klyro_Technical_PRD.md`, `STATUS.md`, `TASKS.md`, `DECISIONS.md`, and `CLAUDE_CODE_WORKFLOW.md` must be in the repo root.

```
You are continuing Phase 2.5 of the Klyro build. Blocks A and B are complete (see STATUS.md). Before proceeding to Block C (rate limiting), execute Block B.1 — a small refinement that surfaces country selection in the wizard. Workflow rules in CLAUDE_CODE_WORKFLOW.md apply.

CRITICAL RULES (from CLAUDE_CODE_WORKFLOW.md):
1. Klyro_Technical_PRD.md is the source of truth. If unclear, ASK before guessing.
2. One block, one commit. Do NOT touch Block C work in this commit.
3. Typecheck + lint + test must all pass before commit.
4. After this block: STOP and report using the reporting template.
5. Use existing deps only — no new dependencies in this refinement.
6. Apply Klyro brand tokens. Country dropdown follows the same styling as existing wizard selects.
7. Never bypass RLS. Wizard already uses the admin client (Phase 2 decision) — keep that pattern.
8. Update STATUS.md and TASKS.md as part of the commit.
9. Append an ADR to DECISIONS.md explaining the chosen approach.
10. NEVER push. Local commit only.

================================================================
BLOCK B.1 OVERVIEW
================================================================

Goal: the wizard captures country in Step 3 (Branch), defaulting to a detected value but explicitly editable. Country propagates to both `branches.country` and `businesses.country` + `businesses.default_currency`. All downstream phone validation in the wizard switches from hardcoded HN to the business's country.

Locked decisions (do not re-debate):
- Country lives in Step 3 (Branch), not as a new wizard step. Adding a 10th step shifts numbering everywhere — too disruptive for the value.
- Auto-detection uses the existing locale detection. If we detect `es-MX` → MX, `en-US` → US, fallback `HN`. No new auto-detection infrastructure — read what next-intl already gives us.
- Country options are NOT translated (Honduras is Honduras in both ES and EN). Read names directly from the COUNTRIES catalog.
- When the user changes country in Step 3, the timezone select auto-suggests the country's default timezone but remains editable.
- The business's `country` and `default_currency` are derived from the FIRST (and only) branch created. The wizard's `saveBranchStep` action propagates them with an UPDATE on businesses in the same DB roundtrip.
- No migration. The `country` column already exists with default `'HN'`. We just stop relying on the default.

Out of scope for this block:
- Multi-branch country handling (PRD allows N branches; wizard creates 1; out of scope here).
- Backfilling existing test data — not real users, just dev seeds. If a test business exists with `country='HN'` and the dev wants to clear it, they run a manual delete. No automated backfill script in this block.
- Currency dropdown — currency is derived from country, not separately editable in the wizard. Edit-after pages (Phase 5+) will expose currency override if needed.

================================================================
FILES TO TOUCH
================================================================

Modified:
  src/lib/schemas/wizard.ts                    add `country` to branch schema; type for country code
  src/lib/actions/wizard.ts                    saveBranchStep persists country + updates business
  src/components/wizard/Step3Branch.tsx        new Country select; timezone autosuggest on change
  src/components/wizard/WizardContext.tsx      pre-fill initial country from detected locale
  src/i18n/locales/es.json                     wizard.step3.country.{label,help} + a few helpers
  src/i18n/locales/en.json                     same keys
  STATUS.md                                    update Block B.1 line under Phase 2.5
  TASKS.md                                     add Block B.1 sub-checklist + check off as we go
  DECISIONS.md                                 append ADR for Block B.1

New:
  src/lib/i18n/detect-country.ts               tiny helper: derive country from a next-intl locale
  src/lib/i18n/__tests__/detect-country.test.ts

No new files outside the above. No migrations.

================================================================
IMPLEMENTATION STEPS
================================================================

Step 1 — Country detection helper

Create src/lib/i18n/detect-country.ts:

  import { COUNTRIES, DEFAULT_COUNTRY, type CountryCode } from "./countries";

  /**
   * Derive a country code from a next-intl locale string.
   * - "es-HN" → "HN"
   * - "en-US" → "US"
   * - "es"    → DEFAULT_COUNTRY (HN)
   * - unknown → DEFAULT_COUNTRY
   */
  export function detectCountryFromLocale(locale: string): CountryCode {
    if (!locale) return DEFAULT_COUNTRY;
    const parts = locale.split("-");
    const region = parts[1]?.toUpperCase();
    if (region && region in COUNTRIES) return region as CountryCode;
    return DEFAULT_COUNTRY;
  }

Add unit tests covering: es-HN, en-US, es-MX, es (no region), gibberish, empty string.

Step 2 — Schema update

In src/lib/schemas/wizard.ts:

- Import { COUNTRIES, type CountryCode } from "@/lib/i18n/countries"
- The Step 3 branch schema gains:
    country: z.enum(Object.keys(COUNTRIES) as [CountryCode, ...CountryCode[]])
- Phone validation in this schema switches from hardcoded HN to use the form's `country` field
  (use a `superRefine` if needed to access sibling fields, or run validation imperatively in the
  Step3Branch component on blur, the same pattern Block B already established)

If wizard storage (localStorage shape) is versioned with a Zod schema (Phase 2 added this — see
TASKS I4), add `country` to that schema too. Default to DEFAULT_COUNTRY if missing during restore
so existing localStorage state from before this commit doesn't break.

Step 3 — Server action update

In src/lib/actions/wizard.ts saveBranchStep:

- Parse `country` from the validated input
- Insert into branches with `country: input.country` (instead of relying on default)
- In the SAME action, after the branch insert succeeds, UPDATE businesses:
    SET country = input.country,
        default_currency = COUNTRIES[input.country].currency
    WHERE id = businessId
- Both writes use the existing admin client + the existing tenant verification helper. Keep the
  same try/catch wrapping that uses ApiError from Block A.
- If the UPDATE fails after the INSERT succeeded, log via console (pino comes in Block D — don't
  preempt) and return an INTERNAL ApiError. The branch row stays; this is acceptable because the
  user can retry the step.

Step 4 — Step3Branch component

In src/components/wizard/Step3Branch.tsx:

- Import COUNTRIES and getCountry from the i18n lib
- Add a Country select RIGHT BEFORE the City field (logical reading order: country → city → address)
- Options render { flag emoji, name } from the COUNTRIES catalog
- The form's default value for `country` comes from WizardContext (set in Step 5 below)
- onChange of country:
    - Update form value
    - Suggest the country's default timezone: setValue("timezone", COUNTRIES[newCountry].timezone)
      ONLY if the user has not manually changed the timezone yet — use a `timezoneTouched` ref or
      similar to detect "still default" state. If you can't reliably detect this, simpler is fine:
      always overwrite on country change and document the behavior in the field help text.
- The phone validation switches to use the selected country (validatePhone(input, watchedCountry))
- i18n labels:
    - wizard.step3.country.label   ("País" / "Country")
    - wizard.step3.country.help    ("Define la moneda y formato de teléfono" / "Sets currency and phone format")

Step 5 — WizardContext initial value

In src/components/wizard/WizardContext.tsx:

- The context already has a way to seed initial form state (Phase 2 added localStorage restore).
- For Step 3's `country` field, seed from `detectCountryFromLocale(currentLocale)`.
- `currentLocale` is whatever next-intl gives us at the page level — pass it down via the
  WizardProvider or pull from `useLocale()` inside the provider component.
- If localStorage has a `country` value already (from a partial wizard run), localStorage wins;
  detection only applies on fresh starts.

Step 6 — i18n keys (es.json + en.json)

Add to both files under wizard.step3:
  "country": {
    "label": "País" / "Country",
    "help":  "Define la moneda y formato de teléfono" / "Sets currency and phone format"
  }

Step 7 — Update STATUS.md and TASKS.md

In STATUS.md, under Phase 2.5, change the Block B entry to read:
  **Block B — Validation + Country Catalog + Formatters** ✅ Done
  **Block B.1 — Country Selection in Wizard** ✅ Done

Add a brief paragraph under Block B.1 summarizing what changed.

In TASKS.md, under "Phase 2.5 — Hardening & Localization", add a new subsection after Block B:

  ### Block B.1 — Country Selection in Wizard ✅
  - [x] B1.1: detect-country.ts helper + tests
  - [x] B1.2: branch schema accepts country (enum from COUNTRIES)
  - [x] B1.3: saveBranchStep persists country + updates business country + currency
  - [x] B1.4: Step3Branch UI — Country select, timezone autosuggest, phone validation uses country
  - [x] B1.5: WizardContext seeds country from detected locale
  - [x] B1.6: i18n keys (es + en)

Step 8 — Append ADR to DECISIONS.md

Add a new entry (do NOT delete existing ones):

  ## Phase 2.5 — Block B.1

  ### ADR-004: Country lives in Step 3 (Branch), not its own wizard step

  **Decision:** Country selection is added as a field within the existing Step 3 (Branch), not
  as a new wizard step. The wizard remains 9 steps.

  **Why:** Adding a 10th step would renumber every existing step in code, i18n keys, telemetry
  events, the progress bar, and unit tests. The cognitive value of a dedicated "what country?"
  step is low — users selecting a vertical and entering a branch address already have spatial
  context. Placing the field next to "city" and before "timezone" reads naturally.

  **Trade-off:** Country becomes visible later in the flow than locale. We mitigate by
  auto-detecting from `useLocale()` so the field is pre-filled for 95% of HN users. The 5%
  who travel/use the wrong browser locale will see HN pre-filled and may need one click to
  change. Acceptable.

  **What this enables:** Phase 3 (booking) can validate client WhatsApp against the business's
  country. Phase 4 (messaging) can format dates/times in the right locale. Phase 8 expansion
  to MX/CO doesn't need a data migration.

  ### ADR-005: Business country + currency derived from the (single) first branch

  **Decision:** When `saveBranchStep` runs, after inserting the branch it also issues an UPDATE
  on `businesses` setting `country` and `default_currency` from the branch's country.

  **Why:** The wizard creates exactly one branch (Phase 2 scope). Asking country twice (once
  for business, once for branch) is friction. In multi-branch later (Phase 5 edit-after), the
  user can manage branch-country separately if they expand internationally. For MVP, business
  country == primary branch country.

  **Trade-off:** Edge case — if the UPDATE on businesses fails after the branch INSERT succeeds,
  we have a branch with country=MX but business still HN. We log it and return an internal
  error; the user can retry. Acceptable for MVP; a transactional RPC would be the proper fix
  if this ever becomes flaky in production.

================================================================
EXIT CRITERION FOR BLOCK B.1
================================================================
  ✅ Step 3 shows a Country select pre-filled from detected locale
  ✅ Changing country updates timezone suggestion AND switches phone validation
  ✅ Completing the wizard from MX (or any non-HN country) results in:
      - branches.country == 'MX'
      - businesses.country == 'MX'
      - businesses.default_currency == 'MXN'
  ✅ Existing wizard runs (HN users) behave identically to before (no visible change)
  ✅ Wizard localStorage from before this commit is safely migrated (country defaults to HN if absent)
  ✅ pnpm typecheck + lint + test all green
  ✅ Single commit: "feat(phase-2.5-block-b.1): country selection in wizard step 3"
  ✅ STATUS.md + TASKS.md + DECISIONS.md updated as part of the commit

================================================================
MANUAL VERIFICATION SCRIPT (run after commit, report results)
================================================================

1. Clear browser localStorage for the dev domain.
2. Visit /es/setup as a fresh-onboarded user. Confirm Step 3's Country defaults to Honduras with a flag.
3. Change Country to "México". Confirm the timezone select updates to America/Mexico_City.
4. Enter a Mexican phone number (e.g. +52 55 1234 5678). Confirm validation passes.
5. Enter a Honduran phone number while Country=México. Confirm validation FAILS.
6. Finish the wizard. Open Supabase SQL editor:
     SELECT country, default_currency FROM businesses ORDER BY created_at DESC LIMIT 1;
     SELECT country FROM branches ORDER BY created_at DESC LIMIT 1;
   Both should show MX. default_currency should be MXN.
7. Repeat with HN to confirm no regression.

Report which of these 7 steps passed.

================================================================
REPORTING TEMPLATE (use after commit)
================================================================

## Block B.1 — Country Selection — Report

**Status:** ✅ Done / 🟡 Partial / 🔴 Blocked

**Files added/changed:**
- <list, with line counts if useful>

**Decisions added to DECISIONS.md:**
- ADR-004 — <one-line summary>
- ADR-005 — <one-line summary>

**Tests:**
- pnpm typecheck: <status>
- pnpm lint: <status>
- pnpm test: <pass/fail counts>

**Manual verification (7 steps):**
- 1: <pass/fail>
- 2: <pass/fail>
- ...
- 7: <pass/fail>

**Open questions / blockers:**
- <list or "none">

**Ready for Block C?** Yes / No

================================================================
START NOW
================================================================
Read Klyro_Technical_PRD.md §5.1 + §6.6, STATUS.md (Phase 2.5 section), TASKS.md (Phase 2.5 block list), DECISIONS.md (ADR-001 through ADR-003 for context). Summarize in 3–5 bullets what you understood about Block B.1, then begin Step 1 (detect-country helper).
```

---

## 📋 Notes before pasting

1. This is a **refinement block**, not a full Phase 2.5 block. It's smaller than Blocks A and B — expect 30–60 minutes of Claude Code time, one commit, one stop-and-report.
2. After this is done and approved, the next prompt is the existing Block C from `PROMPT_CLAUDE_CODE_PHASE_2_5.md` — no changes needed there.
3. The manual verification script (7 steps) is your way of catching subtle UI regressions that unit tests miss. Don't skip it.
4. If Claude Code reports the timezone-touched detection in Step 4 is awkward, accept the simpler version (always overwrite on country change). It's a wizard, not a settings page — destructive defaults are fine.
