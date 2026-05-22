# Claude Code Prompt — Landing Page (klyro.app)

**Project:** Klyro
**Scope:** MVP marketing landing at `klyro.app/[locale]` (the public root)
**Branch base:** `development`
**Your feature branch:** `feature/landing-page`
**Parallel work:** Teammate is finishing Phase 3 (public booking) on `feature/phase-3-public-booking`. This work is designed to merge cleanly alongside theirs.
**Spec:** `Klyro_Technical_PRD.md` v2.0 §1 (problem/solution/positioning), §8 (design system)
**Workflow rules:** `CLAUDE_CODE_WORKFLOW.md`

---

## Why this work exists

The repo has been shipping product (wizard, booking flow) but `klyro.app/` itself still renders the Phase 0 smoke test (the wordmark + a Supabase row count). When closed beta starts, the 10 pioneer businesses share their booking links — but anyone who curiously visits `klyro.app` directly should see what Klyro is and how to sign up.

This is the **marketing landing**, not the dashboard, not a booking page. It lives at the public root of each locale (`klyro.app/es`, `klyro.app/en`) and is fully static — no Supabase calls, no auth checks. It uses the **dark brand surface** (matching the dark lockup asset), not the light booking surface.

---

## 🚀 PROMPT

Paste the block below into Claude Code from the `klyro/` repo root, **on a fresh branch off `development`**.

```
You are building the MVP marketing landing page for Klyro at /[locale]. The full product context is in Klyro_Technical_PRD.md §1. A teammate is finishing Phase 3 (public booking) in parallel on feature/phase-3-public-booking. Your work is designed to merge cleanly alongside theirs.

Workflow rules in CLAUDE_CODE_WORKFLOW.md apply.

CRITICAL RULES:
1. Klyro_Technical_PRD.md is the source of truth — especially §1 (problem/solution/positioning) and §8 (design system).
2. One block, one commit. Stop and report at the end.
3. Typecheck + lint + test must all pass before commit.
4. Use existing deps only — no new dependencies.
5. Apply Klyro brand tokens. The landing uses the DARK surface (--color-bg-base), matching the brand's primary treatment.
6. NEVER touch files outside the allowlist below. If you think you need to, STOP and ask.
7. Update STATUS.md, TASKS.md, DECISIONS.md as part of the commit.
8. NEVER push. Local commit only.

================================================================
BRANCH SETUP (do this BEFORE editing any code)
================================================================

  git fetch origin
  git checkout development
  git pull origin development
  git checkout -b feature/landing-page

Confirm with `git status` that you're on the new branch and clean.

================================================================
FILE-SCOPE BOUNDARIES (read carefully)
================================================================

A teammate is finishing Phase 3 (public booking) in parallel. To merge cleanly, this work
follows strict file-scope rules:

ALLOWED to modify:
  src/app/[locale]/page.tsx                         (the root locale page — currently a smoke test)
  src/i18n/locales/es.json                           (ONLY under namespace `landing.*`)
  src/i18n/locales/en.json                           (same namespace)
  STATUS.md
  TASKS.md
  DECISIONS.md

ALLOWED to create:
  src/components/landing/Hero.tsx
  src/components/landing/Features.tsx
  src/components/landing/CTASection.tsx
  src/components/landing/Footer.tsx
  src/components/landing/__tests__/*

FORBIDDEN to touch:
  src/app/[locale]/[businessSlug]/**                (Phase 3 territory — teammate)
  src/app/api/booking/**                            (Phase 3 territory)
  src/lib/booking/**                                (Phase 3 territory)
  src/components/wizard/**                          (Phase 2.5 territory)
  src/components/ui/**                              (shared primitives — don't add new ones here)
  Any i18n keys under `booking.*`, `wizard.*`, `dashboard.*`, `errors.*`

ALLOWED to consume (read-only — do NOT edit):
  src/components/shared/Logo.tsx                    (use <Logo variant="lockup" /> in header/hero)
  src/app/globals.css                               (read tokens only)

If you discover you need to extend something in the "consume" list, STOP. Tell me the gap.

================================================================
SCOPE — MVP LANDING (locked, do NOT expand)
================================================================

Build EXACTLY these 4 sections, in order, on a single page:

  1. Hero            — Klyro lockup + headline + sub + primary CTA + secondary link
  2. Features        — 3 feature cards in a row (responsive grid)
  3. CTASection      — Final "start free" panel
  4. Footer          — Logo + tagline + nav links + © BridgeStack Dev

NOT in scope:
- Pricing section
- FAQ section
- Testimonials
- Blog
- Pricing toggle
- Animated illustrations beyond what framer-motion already gives us
- Newsletter signup
- Live chat / Intercom

If Claude Code wants to add any of the above, STOP and ask.

================================================================
COPY (you write this from PRD §1 + tagline)
================================================================

Source the marketing copy directly from Klyro_Technical_PRD.md §1.

Mandatory inputs to use verbatim or paraphrase tightly:
  - Tagline: "Tu negocio. Tus clientes. Tu marca." / "Your business. Your clients. Your brand."
  - Positioning (§1.3): "La plataforma de scheduling para cualquier negocio que opere por citas."
  - Problem (§1.1): double booking, interruptions, no-shows 5–25%, scattered client data
  - Solution (§1.2): three things — shareable link, instant WhatsApp confirmation, 24h reminder

Tone: warm but professional (matches the brand personality in PRD §1: "amigable, calmada, competente").

Each i18n string max 140 chars. No marketing fluff. No "10x your business" / "skyrocket" / startup jargon.

================================================================
SECTION SPECS
================================================================

────────────────────────────────────────────────────────────────
SECTION 1 — Hero
────────────────────────────────────────────────────────────────

Layout: centered vertical stack, min-height ~80vh, dark gradient background.

Elements (top to bottom):
  - Top nav (sticky transparent): <Logo variant="wordmark" theme="dark" /> on left, "Iniciar sesión" / "Sign in" link on right (→ /es/login or /en/login)
  - Hero block:
      <Logo variant="mark" /> at ~96px, centered, with subtle violet pulse (framer-motion, ease-out)
      H1 headline (Inter 800, 48–60px desktop, 32px mobile, tight tracking)
      Sub paragraph (Inter 400, 18–20px, --color-text-secondary, max-w 600px)
      Primary CTA button: "Crear cuenta gratis" / "Create free account" → /es/login
      Secondary text link below: "¿Ya tienes cuenta? Iniciar sesión" / "Already have an account? Sign in" → /es/login

Background: linear-gradient(135deg, var(--color-bg-base) 0%, #0F0F2A 100%) — keep it subtle, don't compete with the content.

i18n keys (es + en):
  landing.nav.signIn
  landing.hero.headline           (suggest: "Tu negocio de citas, sin caos" / "Your appointment business, without the chaos")
  landing.hero.subheadline        (3-sentence summary of the problem + solution from PRD §1.1 and §1.2)
  landing.hero.ctaPrimary          ("Crear cuenta gratis" / "Create free account")
  landing.hero.ctaSecondary        (the "already have an account" link text)

────────────────────────────────────────────────────────────────
SECTION 2 — Features (3 cards)
────────────────────────────────────────────────────────────────

Layout: 3-column grid on desktop, single column on mobile. Each card is a flex column with
icon at top, title, body. Cards have subtle violet border on hover.

The 3 features map to the PRD §1.2 solution (the three things Klyro delivers):
  1. "Link compartible" — owner shares one link, clients book in 60s
  2. "Confirmación automática" — instant WhatsApp message when a booking lands
  3. "Recordatorio 24h antes" — reduces no-shows from the 5–25% range mentioned in §1.1

Each card:
  - Icon (lucide-react — Link2, MessageCircle, Bell or similar — already in deps)
  - Icon container: 48x48px, --color-violet-faint background at 15% opacity, --color-violet icon
  - Title (Inter 700, 20px)
  - Body (Inter 400, 16px, --color-text-secondary, ~80 chars)

i18n keys (es + en):
  landing.features.sectionTitle    (optional small heading above the grid, e.g. "Tres cosas. Solo tres." / "Three things. Just three.")
  landing.features.link.title
  landing.features.link.body
  landing.features.confirm.title
  landing.features.confirm.body
  landing.features.reminder.title
  landing.features.reminder.body

────────────────────────────────────────────────────────────────
SECTION 3 — CTASection
────────────────────────────────────────────────────────────────

Layout: centered single-column block, ~40vh tall, distinct background to separate from Features.

Elements:
  - Eyebrow text (--color-violet, uppercase, letter-spacing wide, 14px): "Empieza hoy" / "Start today"
  - H2 (Inter 800, 36-44px): one strong sentence about the value
  - Sub (Inter 400, 18px, --color-text-secondary): one supporting sentence
  - Primary CTA: same "Crear cuenta gratis" / "Create free account" → /es/login
  - Small text below: "Setup en menos de 15 minutos." / "Setup in under 15 minutes." (from PRD §1.2)

Background: --color-bg-surface (slightly lighter than base, gives visual separation).

i18n keys (es + en):
  landing.cta.eyebrow
  landing.cta.headline
  landing.cta.sub
  landing.cta.ctaPrimary           (reuse the same text as hero CTA — or define once and reference)
  landing.cta.footnote

────────────────────────────────────────────────────────────────
SECTION 4 — Footer
────────────────────────────────────────────────────────────────

Layout: 3-column on desktop (logo+tagline | product links | company links), single column on mobile.

Elements:
  - Left column:
      <Logo variant="lockup" theme="dark" /> small (~120px wide)
      Tagline below: "Tu negocio. Tus clientes. Tu marca." / "Your business. Your clients. Your brand."
  - Middle column (Product):
      Heading: "Producto" / "Product"
      Links: "Iniciar sesión" / "Sign in" → /[locale]/login
             "Crear cuenta" / "Create account" → /[locale]/login
  - Right column (Empresa / Company):
      Heading: "Empresa" / "Company"
      Links: just placeholders for now — don't create new pages
             "Acerca de" / "About" → "#" (anchor)
             "Contacto" / "Contact" → "mailto:hola@klyro.app"

Bottom strip (full width, divider above):
  © 2026 BridgeStack Dev · Klyro
  Language switcher on the right: "ES | EN" — clicking toggles /es ↔ /en preserving path
    (use next-intl's useRouter().replace with the other locale)

Border-top with --border-subtle, padding generous.

i18n keys (es + en):
  landing.footer.tagline
  landing.footer.productHeading
  landing.footer.productLinks.signIn
  landing.footer.productLinks.signUp
  landing.footer.companyHeading
  landing.footer.companyLinks.about
  landing.footer.companyLinks.contact
  landing.footer.copyright           (e.g. "© 2026 BridgeStack Dev · Klyro")

================================================================
ROUTE WIRING
================================================================

The landing replaces the current contents of src/app/[locale]/page.tsx.

Currently page.tsx is a Phase 0 smoke test that fetches a businesses count from Supabase.
REMOVE the Supabase fetch. The landing is fully static — no DB calls.

Structure of the new page.tsx:

  import { Hero } from "@/components/landing/Hero";
  import { Features } from "@/components/landing/Features";
  import { CTASection } from "@/components/landing/CTASection";
  import { Footer } from "@/components/landing/Footer";

  export default function HomePage() {
    return (
      <>
        <Hero />
        <Features />
        <CTASection />
        <Footer />
      </>
    );
  }

The components themselves are client components ONLY where framer-motion is used (Hero has the
pulse animation). Features/CTASection/Footer can be server components.

================================================================
ACCESSIBILITY + RESPONSIVE
================================================================

- Semantic HTML: <header>, <main>, <section>, <footer>
- Each section has an aria-labelledby tied to its H1/H2
- All CTAs are <a> tags with proper href, not <button onClick>
- Focus rings visible on all interactive elements (--color-violet, 2px offset, per PRD §8.4)
- Color contrast: hero headline on bg-base must hit WCAG AA (it does — white on #0A0A1F)
- Mobile-first: design for 375px width, scale up
- No horizontal scroll at any viewport width
- Test mentally at 375px, 768px, 1280px

================================================================
TESTS
================================================================

Unit tests in src/components/landing/__tests__/:
  - Hero.test.tsx          — renders headline, both CTAs, Logo lockup
  - Features.test.tsx      — renders all 3 cards with title + body
  - CTASection.test.tsx    — renders eyebrow + headline + CTA
  - Footer.test.tsx        — renders both columns + copyright + language switcher
  - i18n.test.tsx          — all landing.* keys present in both es.json and en.json

Skip visual regression / Playwright for the landing — those belong to Phase 7 (Polish).

================================================================
MANUAL VERIFICATION (run after commit, report)
================================================================

  1. /es renders the landing (not the smoke test)
  2. Hero displays Logo lockup + headline + 2 CTAs
  3. Primary CTA links to /es/login; clicking it works
  4. Features section shows 3 cards in a row (desktop) / stacked (mobile)
  5. CTASection renders with eyebrow + headline + CTA
  6. Footer shows 3 columns + copyright + language switcher
  7. Clicking "EN" in the language switcher takes you to /en (same landing in English)
  8. /es/dashboard still requires auth (regression check — middleware untouched)
  9. /es/marcus-barber (or whatever Phase 3 booking slug exists) still works (regression check)
  10. Lighthouse on /es (Chrome DevTools): Performance ≥ 90, Accessibility ≥ 95

================================================================
EXIT CRITERION
================================================================
  ✅ /es and /en render the 4-section landing
  ✅ Both CTAs link to /[locale]/login
  ✅ All landing.* i18n keys present in es + en
  ✅ Language switcher in footer works
  ✅ Smoke test removed from page.tsx
  ✅ All 10 manual verification steps pass
  ✅ pnpm typecheck + lint + test all green
  ✅ NO files outside the allowlist were modified
  ✅ Single commit: "feat(landing): MVP marketing page — hero + features + CTA + footer"
  ✅ STATUS.md + TASKS.md + DECISIONS.md updated

================================================================
DECISIONS.md ADDITIONS (append, do not delete existing)
================================================================

## Landing Page

### ADR-008: Landing lives at /[locale]/page.tsx, not in a (marketing) route group

**Decision:** The landing page replaces the existing smoke test at src/app/[locale]/page.tsx
rather than being placed in a (marketing) route group as suggested in the PRD §3.1 folder
structure.

**Why:** Phase 3 already mounted the public booking routes directly under [locale]
(/[locale]/[businessSlug]) without a (booking) route group. Mirroring that pattern keeps
the file layout consistent and avoids speculative routing infrastructure (a route group
buys us a separate layout, which we don't need yet — the landing and the booking pages
can both use the dark and light surfaces respectively via inline composition).

**Trade-off:** If we later want a distinct marketing layout (e.g. with a different header
or different analytics tracking), we'll move to (marketing)/page.tsx then. Cheap refactor
when needed; pay nothing today.

### ADR-009: Landing is fully static — no Supabase calls, no auth checks

**Decision:** The landing makes zero DB calls and skips auth entirely. The Phase 0 smoke
test that fetched a businesses count is removed.

**Why:** The landing is a marketing page. It must render fast (Lighthouse Performance ≥ 90),
work without a Supabase connection during outages, and never expose auth state. Visitors who
are already signed in still see the marketing page — they can click "Sign in" and land on
the existing logged-in redirect to /dashboard.

================================================================
REPORTING TEMPLATE (use after commit)
================================================================

## Landing Page — Report

**Status:** ✅ Done / 🟡 Partial / 🔴 Blocked

**Branch:** feature/landing-page (based on development @ <sha>)

**Files added/changed:**
- <list>

**Decisions added to DECISIONS.md:**
- ADR-008 — landing in [locale]/page.tsx (not route group)
- ADR-009 — fully static, no Supabase, no auth

**Tests:**
- pnpm typecheck: <status>
- pnpm lint: <status>
- pnpm test: <pass/fail counts>

**Manual verification (10 steps):**
- 1: <pass/fail>
- ...
- 10: <pass/fail>

**Lighthouse on /es:**
- Performance: <score>
- Accessibility: <score>
- Best Practices: <score>
- SEO: <score>

**File-scope check:**
- Files modified outside allowlist? (must be NO)
- i18n keys added only under `landing.*`? (must be YES)
- Phase 3 / wizard files untouched? (must be YES)

**Ready to push the branch and open PR to development?** Yes / No

================================================================
START NOW
================================================================
Read Klyro_Technical_PRD.md §1 (full Resumen Ejecutivo) and §8 (design system, especially
§8.1 color tokens and §8.4 motion). Summarize in 4–6 bullets:
- The 4 sections you'll build
- The 2 locked decisions (landing at /[locale], fully static)
- The file-scope boundaries
- Your draft marketing headline + sub in both ES and EN (so I can correct copy before you write)

WAIT for my approval of the draft copy before implementing.

Once approved, begin with branch setup, then implement section by section.
```

---

## 📋 Notes for you (the human)

1. **Branch first, prompt second.** Make sure you're on `development` and pulled latest before pasting.
2. **The copy draft is the most important checkpoint.** Claude Code is going to draft ~10 i18n strings in both languages. Read them carefully before approving — marketing copy is hard to fix in bulk later. If you don't love the headline, say so before any code is written.
3. **No conflicts expected with Phase 3.** Different files, different namespaces, different surfaces (dark vs light). The only file both touch is `page.tsx` at different levels:
   - Landing: `src/app/[locale]/page.tsx`
   - Phase 3 booking: `src/app/[locale]/[businessSlug]/page.tsx`
   Next.js handles the resolution correctly: static segment wins over dynamic.
4. **When Phase 3 merges to development first**, you rebase your landing branch and it should be a no-op. When the landing merges first, your teammate rebases their Phase 3 branch — also no-op.
5. **PR title:** `feat(landing): MVP marketing page` — keep it focused, don't mention Phase numbers since this isn't part of the PRD's phase plan, it's a parallel deliverable.
6. **Lighthouse scores matter here.** The landing is the first impression of the product. If Lighthouse is below 90 Performance, the most common culprits are: unoptimized images (use `next/image`), too much JS sent (keep components server when possible), large font payloads (you already use `next/font/google` — should be fine).

---

## Why this doesn't break Phase 3

- Different files: `[locale]/page.tsx` vs `[locale]/[businessSlug]/page.tsx`
- Different i18n namespaces: `landing.*` vs `booking.*`
- Different surfaces: dark vs light
- Different deps: zero new deps on either side
- Different test paths: `src/components/landing/__tests__/` vs `tests/booking/`

The only theoretical conflict is `STATUS.md` / `TASKS.md` if both PRs touch the same section. Mitigation: the landing PR adds a new section "Landing Page" to those files, doesn't modify Phase 3 sections.

¡Adelante!
