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

**Decision:** `error.tsx` uses a native `<button>` with Tailwind classes instead of the shadcn `<Button>` component.

**Why:** The error boundary is a "use client" component that must work even if the component tree that imports `<Button>` is broken. Keeping it dependency-light prevents a broken import from causing a blank screen on error.

---
