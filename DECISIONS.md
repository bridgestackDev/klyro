# Klyro — Architecture Decisions

This file records non-obvious design decisions and their rationale. Never delete entries — only append.

---

## Phase 2.5 — Block A

### ADR-001: ApiError codes use UPPERCASE strings matching existing i18n keys

**Decision:** `ERROR_CODES` constants are UPPERCASE strings (`UNAUTHORIZED`, `SLUG_TAKEN`, etc.) that match the existing `errors.*` keys in the i18n locale files.

**Why:** The wizard components use `t(\`errors.${result.error}\`)` to resolve error messages. Using UPPERCASE codes means the existing i18n lookup in `SetupWizard.resolveError()` keeps working without changing the wizard component or DB write logic. Avoids a two-step migration (error model + UI update) in the same block.

**Trade-off:** New ApiError codes introduced in Phase 2.5 (FORBIDDEN, NOT_FOUND, VALIDATION_FAILED, RATE_LIMITED, INTERNAL, BAD_REQUEST, CONFLICT) required adding new UPPERCASE i18n keys rather than reusing the old ad-hoc strings. Both old and new keys now coexist in the locale files.

---

### ADR-002: toErrorResponse targets route handlers, not server actions

**Decision:** `toErrorResponse()` returns a `NextResponse` and is intended for API route handlers. Wizard server actions keep their `{ error?: string }` return type; they use `ApiError` internally but extract `.code` as the returned string.

**Why:** Server actions can't return `NextResponse`—only serializable values. `toErrorResponse` wraps the error into an HTTP response for route handlers. Server actions use `ApiError` for typed error creation and catch-all `try/catch` wrapping, but expose the code as a plain string to the UI layer.

---

### ADR-003: Branded error.tsx uses inline Tailwind classes, not shadcn Button

---

## Phase 2.5 — Block B.1

### ADR-004: Country lives in Step 3 (Branch), not its own wizard step

**Decision:** Country selection is added as a field within the existing Step 3 (Branch), not as a new wizard step. The wizard remains 9 steps.

**Why:** Adding a 10th step would renumber every existing step in code, i18n keys, telemetry events, the progress bar, and unit tests. The cognitive value of a dedicated "what country?" step is low — users selecting a vertical and entering a branch address already have spatial context. Placing the field before "city" and "timezone" reads naturally.

**Trade-off:** Country becomes visible later in the flow than locale. Mitigated by auto-detecting from `useLocale()` so the field is pre-filled for 95% of HN users. The 5% who travel/use the wrong browser locale will see HN pre-filled and may need one click to change. Acceptable.

**What this enables:** Phase 3 (booking) can validate client WhatsApp against the business's country. Phase 4 (messaging) can format dates/times in the right locale. Phase 8 expansion to MX/CO doesn't need a data migration.

---

### ADR-005: Business country + currency derived from the (single) first branch

**Decision:** When `saveBranchStep` runs, after inserting the branch it also issues an UPDATE on `businesses` setting `country` and `default_currency` from the branch's country.

**Why:** The wizard creates exactly one branch (Phase 2 scope). Asking country twice (once for business, once for branch) is friction. In multi-branch later (Phase 5 edit-after), the user can manage branch-country separately if they expand internationally. For MVP, business country == primary branch country.

**Trade-off:** Edge case — if the UPDATE on businesses fails after the branch INSERT succeeds, the branch has the correct country but the business still has the old value. We log it and return an internal error; the user can retry. Acceptable for MVP; a transactional RPC would be the proper fix if this ever becomes flaky in production.

---

**Decision:** `error.tsx` uses a native `<button>` with Tailwind classes instead of the shadcn `<Button>` component.

**Why:** The error boundary is a "use client" component that must work even if the component tree that imports `<Button>` is broken. Keeping it dependency-light prevents a broken import from causing a blank screen on error.

---
