# Claude Code Prompt — Phase 2.5 / Block F: Wizard Polish

**Project:** Klyro
**Phase:** 2.5 — Hardening & Localization
**Block:** F (polish after Block E E2E findings)
**Branch base:** `development` (after your Phase 2.5 PR merged)
**Your feature branch:** `feature/phase-2.5-block-f-wizard-polish`
**Parallel work:** A teammate is building Phase 3 on `feature/phase-3-public-booking`. This prompt is designed to avoid conflicts.
**Workflow rules:** `CLAUDE_CODE_WORKFLOW.md`

---

## Why this block exists

The E2E wizard test in Block E exposed two friction points:
1. After clicking **"Lanzar mi negocio"** in Step 9, there's no visual feedback while the server actions run. The button just sits there until the redirect — users may double-click or assume the app froze.
2. The phone fields in Steps 3 (Branch) and 7 (Messaging) accept raw input. There's no visual cue that the number must match the business's country. Block B.1 added country selection, but the phone UI never picked it up.

This block fixes both without touching the booking flow your teammate is building.

---

## 🚀 PROMPT

Paste the block below into Claude Code from the `klyro/` repo root, **on a fresh branch off `development`**.

```
You are continuing Phase 2.5 on a feature branch. Phase 2.5 Blocks A–E are complete and merged to development. A teammate is building Phase 3 (public booking) in parallel on feature/phase-3-public-booking. You are executing Block F — Wizard Polish — to be merged back into development without conflicting with their work.

Workflow rules in CLAUDE_CODE_WORKFLOW.md apply.

CRITICAL RULES:
1. Klyro_Technical_PRD.md is the source of truth. If unclear, ASK before guessing.
2. One block, one commit. Stop and report at the end.
3. Typecheck + lint + test must all pass before commit.
4. Use existing deps only — no new dependencies.
5. Apply Klyro brand tokens. Loader animation uses the violet accent.
6. NEVER touch files outside the allowlist below. If you think you need to, STOP and ask.
7. Update STATUS.md, TASKS.md, DECISIONS.md as part of the commit.
8. NEVER push. Local commit only.

================================================================
BRANCH SETUP (do this BEFORE editing any code)
================================================================

  git fetch origin
  git checkout development
  git pull origin development
  git checkout -b feature/phase-2.5-block-f-wizard-polish

Confirm with `git status` that you're on the new branch and clean.

================================================================
CONFLICT-AVOIDANCE BOUNDARIES (read carefully)
================================================================

A teammate is building Phase 3 (public booking) in parallel. To merge cleanly,
this block follows strict file-scope rules:

ALLOWED to modify:
  src/components/wizard/SetupWizard.tsx
  src/components/wizard/Step3Branch.tsx
  src/components/wizard/Step7Messaging.tsx
  src/components/wizard/Step9Confirm.tsx           (or wherever the "Lanzar" button lives)
  src/components/wizard/__tests__/*               (test additions)
  src/i18n/locales/es.json                         (ONLY under namespace wizard.confirm.* and wizard.steps.branch.phone.* and wizard.steps.messaging.phone.*)
  src/i18n/locales/en.json                         (same namespaces)
  STATUS.md
  TASKS.md
  DECISIONS.md

ALLOWED to create:
  src/components/ui/LaunchLoader.tsx               (new component for the launch animation)
  src/components/wizard/CountryPhoneInput.tsx      (new wrapper for prefix + national number)
  src/components/wizard/__tests__/CountryPhoneInput.test.tsx
  src/components/ui/__tests__/LaunchLoader.test.tsx

FORBIDDEN to touch (your teammate owns these in Phase 3):
  src/app/[locale]/[bizSlug]/**                    (public booking routes)
  src/app/api/booking/**                           (booking API)
  src/lib/booking/**                               (booking domain logic)
  src/lib/validation/phone.ts                      (do not edit; only consume)
  src/lib/format/phone.ts                          (do not edit; only consume)
  Any i18n keys under `booking.*` namespace

If you discover you need to extend `validation/phone.ts` or `format/phone.ts`, STOP.
Tell me the gap and we'll decide whether to add a new sibling file (e.g.
`src/lib/format/phone-prefix.ts`) or coordinate with Phase 3.

================================================================
PART 1 — LAUNCH LOADER (after "Lanzar mi negocio" click)
================================================================

Goal: when the user clicks "Lanzar mi negocio" in Step 9 (Confirm), they see a branded full-screen overlay with the cat mark and a sequence of status messages while the final server actions run. The redirect happens after the actions complete (already in code) — this is purely UX polish around an existing flow.

P1.1. Create src/components/ui/LaunchLoader.tsx:
    - Full-screen modal/overlay (z-index above wizard)
    - Centered <Logo variant="mark" /> at large size (~96px)
    - Below: rotating status messages that animate in/out:
        es: "Configurando tu negocio..." → "Creando tu equipo..." → "Generando tus enlaces..." → "¡Listo!"
        en: "Setting up your business..." → "Creating your team..." → "Generating your links..." → "Ready!"
    - Subtle violet pulse animation on the cat mark (framer-motion, already in stack)
    - Messages rotate every 900ms, last one stays until parent unmounts
    - Background: --color-bg-base with a slight gradient veil (use --grad-surface if it exists, else linear-gradient(180deg, var(--color-bg-surface) 0%, var(--color-bg-base) 100%))
    - Accessible: aria-live="polite", aria-busy="true" on the wrapper
    - Props: `{ open: boolean; locale: 'es' | 'en' }` — keep it presentation-only
    - NO API calls inside this component. It only animates.

P1.2. Wire it up in Step9Confirm (or wherever the "Lanzar mi negocio" button + final action lives):
    - Add local state `isLaunching: boolean`
    - On button click:
        setIsLaunching(true)
        try { await confirmSetup(); }   // existing call(s)
        finally { /* don't unset isLaunching — redirect will unmount */ }
    - Render <LaunchLoader open={isLaunching} locale={locale} /> alongside the existing UI
    - The button itself becomes disabled while isLaunching is true (already standard pattern in the wizard)
    - If confirmSetup throws, the existing error handling (Block A's ApiError boundary) takes over; reset isLaunching before re-throwing so the user can see the error UI

P1.3. i18n keys (es + en) under namespace `wizard.confirm`:
    - wizard.confirm.launching.message1
    - wizard.confirm.launching.message2
    - wizard.confirm.launching.message3
    - wizard.confirm.launching.message4
    - wizard.confirm.launching.ariaLabel ("Lanzando tu negocio" / "Launching your business")

P1.4. Unit tests:
    - LaunchLoader renders 4 messages in sequence (use vi.useFakeTimers)
    - LaunchLoader is hidden when open=false
    - Step9Confirm: clicking "Lanzar" sets isLaunching=true and renders LaunchLoader

================================================================
PART 2 — PHONE PREFIX FIXED FROM BUSINESS COUNTRY
================================================================

Goal: in Step 3 (Branch) and Step 7 (Messaging), the phone field shows a fixed, read-only country prefix (e.g. "+504" for Honduras) before the national number input. The prefix is derived from the country selected in Step 3 — already in scope per Block B.1. The user types only the national number; storage stays E.164.

Locked decision (per founder, do not re-debate):
- Prefix is FIXED, read-only, comes from business country.
- No country dropdown in the phone field itself. Country is set in Step 3 (Block B.1).
- If the user changes country in Step 3, the prefix in both phone fields updates automatically.

P2.1. Create src/components/wizard/CountryPhoneInput.tsx:
    - Two visual parts in one form field:
      [+504] [ national number input ]
    - Left side: read-only pill/chip with the country dial code (e.g. "+504")
      - Background --color-bg-elevated, text --color-text-secondary
      - Aria: aria-label="Código de país: +504" / "Country code: +504"
    - Right side: <input type="tel"> for national-only digits
      - placeholder shows national format example (e.g. "9999-9999" for HN, "55 1234 5678" for MX)
      - allowed characters: digits, spaces, dashes
    - Props:
        {
          country: CountryCode;            // from form state
          value: string;                    // E.164 in form state
          onChange: (e164: string) => void; // emits E.164 on every keystroke
          onBlur?: () => void;
          id: string;                       // for label htmlFor
          error?: string;
          placeholder?: string;
          ariaLabel?: string;
        }
    - Internal logic:
        - On mount: split incoming E.164 value into prefix + national; show national
        - On change: re-assemble E.164 = dialCode + national.replace(/\D/g,'')
                     emit via onChange
        - On country prop change: re-derive prefix display; national stays
    - Pure presentational + controlled. NO direct calls to validation/phone.ts.
      Validation stays in the form's existing zod schema and onBlur handlers
      (already wired by Block B / B.1).
    - Use formatPhoneE164 from src/lib/format/phone.ts ONLY as a read-only import
      to assemble the value. Do not modify that file.

P2.2. Replace the phone input in Step3Branch.tsx:
    - Where the current phone field is rendered, swap to <CountryPhoneInput
        country={form.watch('country')}
        value={form.watch('phone')}
        onChange={(v) => form.setValue('phone', v, { shouldValidate: true })}
        onBlur={() => form.trigger('phone')}
        id="branch-phone"
        error={form.formState.errors.phone?.message}
      />
    - Keep the existing label + error display.
    - Keep the existing zod validation (validatePhone is called there).

P2.3. Replace the WhatsApp input in Step7Messaging.tsx:
    - The wizard already stores `country` in the form (Block B.1).
    - Same swap pattern. Use the same CountryPhoneInput.
    - id="messaging-whatsapp"

P2.4. i18n keys (es + en) under wizard.steps.branch.phone and wizard.steps.messaging.phone:
    - wizard.steps.branch.phone.prefixAriaLabel ("Código de país" / "Country code")
    - wizard.steps.branch.phone.nationalPlaceholder (vertical-neutral example like "9999-9999")
    - wizard.steps.messaging.phone.prefixAriaLabel
    - wizard.steps.messaging.phone.nationalPlaceholder
    - If a "national format example" lookup is needed per country, derive it inline in the
      component from COUNTRIES[country] (the catalog already has dialCode; example masks
      can be a tiny const map inside the component file).

P2.5. Unit tests:
    - CountryPhoneInput: typing "9999 9999" with country=HN emits "+50499999999"
    - CountryPhoneInput: typing "55 1234 5678" with country=MX emits "+525512345678"
    - CountryPhoneInput: changing country prop re-renders prefix but keeps national
    - CountryPhoneInput: existing E.164 value split correctly on mount
    - CountryPhoneInput: aria-label present on the prefix chip

P2.6. Manual verification (run after commit, report):
    1. Open /es/setup as a fresh user. In Step 3, leave country as Honduras. The phone field shows "+504" prefix.
    2. Type "9999-9999" in the national input. Form value (inspect via React DevTools or a console.log in the action) is "+50499999999".
    3. Change country to México in Step 3. Prefix updates to "+52". National input keeps "9999-9999". Form value updates to "+52" + national.
    4. Continue to Step 7 (Messaging). The prefix there matches the country selected in Step 3.
    5. Complete the wizard. Click "Lanzar mi negocio". The LaunchLoader appears with rotating messages until redirect to /dashboard.
    6. Refresh /es/setup mid-wizard. Country and phone restore correctly from localStorage.
    7. Switch to /en/setup. Loader messages and phone placeholders render in English.

================================================================
EXIT CRITERION FOR BLOCK F
================================================================
  ✅ Clicking "Lanzar mi negocio" shows the LaunchLoader overlay until redirect
  ✅ Step 3 phone field shows fixed country prefix derived from selected country
  ✅ Step 7 WhatsApp field shows the same prefix logic
  ✅ Changing country in Step 3 updates the prefix in both fields automatically
  ✅ E.164 storage unchanged — schema, server actions, DB shape all identical
  ✅ All 7 manual verification steps pass
  ✅ pnpm typecheck + lint + test all green
  ✅ NO files outside the allowlist were modified
  ✅ Single commit: "feat(phase-2.5-block-f): launch loader + fixed phone prefix"
  ✅ STATUS.md + TASKS.md + DECISIONS.md updated

================================================================
DECISIONS.md ADDITIONS (append, do not delete existing)
================================================================

## Phase 2.5 — Block F

### ADR-006: Phone prefix is fixed (read-only) from business country, not editable per field

**Decision:** The phone fields in Steps 3 and 7 render a fixed country prefix derived from the country selected in Step 3. The prefix is not user-editable on the phone field itself.

**Why:** For the MVP wedge (Honduras barbershops), 100% of phone numbers are local. Asking for a country picker on every phone field adds clicks and cognitive load. Country lives in Step 3 (Block B.1) and is the single source of truth for the business; phone fields read from it. This also guarantees that the business's phone, the owner's WhatsApp, and (in Phase 3) the client's WhatsApp all share the same country — preventing cross-country accidents.

**Trade-off:** A business owner whose personal WhatsApp is in a different country than the branch cannot represent that in the wizard. Edge case; can be unblocked later via the Settings page (Phase 5) if it surfaces.

### ADR-007: LaunchLoader is presentation-only, no API calls

**Decision:** LaunchLoader animates 4 rotating messages on a timer and renders the cat mark. It does not orchestrate the confirm flow or know whether the underlying actions have completed.

**Why:** Keeps the loader testable in isolation and decouples it from the wizard's action lifecycle. The confirm action's existing redirect unmounts the loader naturally on success; the existing error handling re-renders the wizard on failure. No new state machine.

================================================================
REPORTING TEMPLATE (use after commit)
================================================================

## Block F — Wizard Polish — Report

**Status:** ✅ Done / 🟡 Partial / 🔴 Blocked

**Branch:** feature/phase-2.5-block-f-wizard-polish (based on development @ <sha>)

**Files added/changed:**
- <list>

**Decisions added to DECISIONS.md:**
- ADR-006 — <summary>
- ADR-007 — <summary>

**Tests:**
- pnpm typecheck: <status>
- pnpm lint: <status>
- pnpm test: <pass/fail counts>

**Manual verification (7 steps):**
- 1: <pass/fail>
- ...
- 7: <pass/fail>

**Conflict avoidance check:**
- Files modified outside allowlist? (must be NO)
- i18n keys added only under `wizard.confirm.*` and `wizard.steps.{branch,messaging}.phone.*`? (must be YES)
- `src/lib/validation/phone.ts` and `src/lib/format/phone.ts` untouched? (must be YES)

**Ready to push the branch and open PR to development?** Yes / No

================================================================
START NOW
================================================================
Read Klyro_Technical_PRD.md (§6.6 Localization, §8.4 brand motion), STATUS.md, TASKS.md, DECISIONS.md (ADR-004 and ADR-005 for country context). Summarize Block F in 3–5 bullets including the conflict-avoidance constraints, then begin with the branch setup, then Part 1 (LaunchLoader).
```

---

## 📋 Notes for you (the human)

1. **Branch first, prompt second.** Make sure you're on `development` and pulled latest before pasting. The prompt itself includes the branch setup as the first step.
2. **Conflict avoidance is the headline feature.** If Claude Code wants to edit `src/lib/format/phone.ts` or `src/lib/validation/phone.ts`, it must stop and ask. Those are your teammate's territory in Phase 3.
3. **Manual verification matters here.** The 7-step script is what catches subtle issues (e.g. country change not propagating to Step 7's prefix).
4. **When merging to development:** open a PR titled `feat(phase-2.5-block-f): wizard polish — launch loader + phone prefix`. If your teammate's Phase 3 PR is open at the same time, merge whichever is ready first. The strict file-scope rules mean conflicts should be minimal — only the two i18n files might need a 3-way merge under different namespaces.
