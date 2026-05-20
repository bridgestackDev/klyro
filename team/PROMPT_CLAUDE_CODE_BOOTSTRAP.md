# Claude Code Prompt — Bootstrap Klyro From Scratch

**Version:** 2.0 — aligned with `Klyro_Technical_PRD.md` v2.0

Copy the block below and paste it into Claude Code in an empty directory. Have the `Klyro_Technical_PRD.md` file in the same folder (or attach it) so Claude Code can reference it. If you have the brand assets (`klyro.png`, `klyro_.png`), drop them in the folder too — Phase 0 uses them to derive the design tokens and build the `<Logo />` component.

> **What changed in v2.0:** The design system is no longer placeholder. Klyro now has a real brand identity — a cat mascot with a check mark on its chest, and a lowercase "klyro" wordmark with a violet "k". Phase 0 builds the actual brand tokens (violet `#6D64FB` + navy `#14143A` and the derived palette) and a real `Logo.tsx` component. Reference dependency versions are the May 2026 stable line: Next.js 16.2.x, React 19.2.x, Node 22 LTS.

---

## 🚀 PROMPT

```
You are building Klyro from scratch — a scheduling platform for any appointment-based business (barbershops and beauty salons are the launch wedge, but the platform is multi-vertical from day 1). Klyro is a product of BridgeStack Dev. The full technical specification is in Klyro_Technical_PRD.md in this directory. Read it first, then execute Phase 0 (Foundation) as defined in Section 7.

CRITICAL RULES:
1. Follow the Technical PRD as the single source of truth. If something is unclear, ASK before guessing.
2. Build phase by phase. Do NOT skip ahead. Do NOT mix work from different phases in the same commit.
3. After each phase, stop and report. Wait for me to confirm before starting the next phase.
4. Every commit must compile, pass lint, and pass typecheck.
5. Never commit secrets. Use .env.example for templates; .env.local is gitignored.
6. ALWAYS install dependencies with @latest tag. Do NOT pin versions in install commands.
   The lockfile (pnpm-lock.yaml) is the source of truth for reproducibility after install.
   This applies to every package: next, react, typescript, tailwindcss, supabase, all of them.
7. The Klyro brand identity is REAL, not placeholder. Section 8 of the PRD defines the exact
   color tokens, the <Logo /> component, and typography. Implement them as specified — do not
   invent your own colors or substitute a generic logo.

================================================================
PHASE 0 — FOUNDATION (this is what you'll do now)
================================================================

Goal: A working Next.js (latest) + Tailwind + Supabase project that reads a row from the
database AND renders the real Klyro brand (cat mark + wordmark, correct violet/navy palette).

STEP 1 — Read the spec
- Open and read Klyro_Technical_PRD.md fully.
- Pay special attention to Section 2 (tech stack), Section 3 (repo structure), Section 4 (env vars),
  Section 5 (database schema + vertical registry), Section 7 (build phases), and Section 8 (design system).
- Summarize back to me what you understood about Phase 0 before doing anything.
- Confirm the Node version requirement: Next.js 16 requires Node 22 LTS minimum. Check the installed
  Node version with `node -v` and report it.

STEP 2 — Initialize the Next.js project
- Run: pnpm create next-app@latest klyro --typescript --tailwind --app --eslint --src-dir --import-alias "@/*"
- Use pnpm as the package manager throughout.
- After scaffolding, copy the resolved pnpm version into the "packageManager" field of package.json
  (read it from `pnpm --version`).
- Pin Node 22 LTS (or higher) in .nvmrc and in package.json engines field.
- Verify by running: pnpm --version, node -v, and inspecting package.json.

STEP 3 — Install dependencies (ALL with @latest)

Production dependencies:
  pnpm add \
    @supabase/supabase-js@latest \
    @supabase/ssr@latest \
    @hookform/resolvers@latest \
    react-hook-form@latest \
    zod@latest \
    next-intl@latest \
    @tanstack/react-query@latest \
    lucide-react@latest \
    date-fns@latest \
    libphonenumber-js@latest \
    clsx@latest \
    tailwind-merge@latest \
    framer-motion@latest \
    posthog-js@latest \
    @vercel/analytics@latest \
    @vercel/speed-insights@latest

Dev dependencies:
  pnpm add -D \
    prettier@latest \
    prettier-plugin-tailwindcss@latest \
    eslint-config-prettier@latest \
    vitest@latest \
    @vitejs/plugin-react@latest \
    @testing-library/react@latest \
    @testing-library/jest-dom@latest \
    @testing-library/user-event@latest \
    jsdom@latest \
    @playwright/test@latest \
    supabase@latest

Note: next, react, react-dom, typescript, tailwindcss, eslint, and eslint-config-next are already
installed by create-next-app. Verify they are on the latest stable versions; if any are behind, run:
  pnpm up --latest next react react-dom typescript tailwindcss eslint eslint-config-next

Sentry will be installed separately via its wizard in Step 14.

After install, paste the resolved versions of next, react, typescript, tailwindcss, and
@supabase/supabase-js from package.json into your report to me.

STEP 4 — Configure tooling
- Set up Prettier with Tailwind plugin (.prettierrc with prettier-plugin-tailwindcss)
- Extend ESLint with prettier (.eslintrc.json: extends ["next/core-web-vitals", "next/typescript", "prettier"])
- Configure tsconfig.json with strict: true, noUncheckedIndexedAccess: true, target: ES2022
- Create .gitignore additions: .env.local, .env*.local, .vercel, .next, dist, coverage,
  playwright-report, /test-results

STEP 5 — Folder structure
Create the EXACT folder structure from Section 3.1 of the Technical PRD, including the
public/brand/ directory. Use empty .gitkeep files in directories that have no content yet.

STEP 6 — Tailwind & the Klyro design tokens (Tailwind v4)
Tailwind v4 uses a CSS-first config. Implement the REAL Klyro brand tokens from Section 8.1 of
the PRD — these are derived from the brand assets, not placeholders:
- In src/app/globals.css, use the @import "tailwindcss" directive at the top.
- Below that, define a @theme block with the full Klyro token set:
    Brand:        --color-violet #6D64FB, --color-violet-hover #5D56D8,
                  --color-violet-soft #8A83FC, --color-violet-faint #AFAAFD, --color-navy #14143A
    Dark surfaces (default theme):
                  --color-bg-base #0A0A1F, --color-bg-surface #111131,
                  --color-bg-elevated #222246, --color-bg-hover #303052
    Text on dark: --color-text-primary #FFFFFF, --color-text-secondary #BDBDC8,
                  --color-text-muted #858599
    Light surfaces (optional booking theme):
                  --color-bg-light #FDFDFD, --color-bg-light-surface #FFFFFF,
                  --color-text-on-light #14143A
    Status:       --color-success #10B981, --color-warning #F59E0B, --color-danger #EF4444
    Radii:        --radius-card 16px, --radius-button 12px, --radius-pill 999px
    Fonts:        --font-sans "Inter, system-ui, sans-serif", --font-mono "JetBrains Mono, ui-monospace, monospace"
- Configure dark mode as the default (the dashboard is dark-only for MVP — no light-mode toggle).
- Set the app background to --color-bg-base and default text to --color-text-secondary.
- Configure postcss.config.mjs with @tailwindcss/postcss as the only plugin.
- Verify Tailwind works by adding a className to the default page and confirming styles render.

If Tailwind v4 isn't the installed major version (e.g. create-next-app installed v3), STOP and
tell me. Don't downgrade silently.

STEP 7 — Install fonts
- Use next/font/google to load Inter (primary, all weights up to 800) and JetBrains Mono
  (booking codes only) in src/app/[locale]/layout.tsx.
- Apply the font variables to the html element so --font-sans / --font-mono resolve.

STEP 8 — Build the <Logo /> component (the real brand mark)
This is the single source of truth for the Klyro brand mark. Per Section 8.2 of the PRD,
create src/components/shared/Logo.tsx with three variants, all as inline SVG:

  - 'mark'      : the cat mascot only — a rounded, friendly sitting black cat with violet
                  inner ears + collar, closed content eyes, and a white check mark on its
                  chest. Body uses the brand gradient (violet -> navy) on dark; a flat navy
                  body + white check is the 1-color fallback for the favicon. The check mark
                  must stay legible (never below ~30% of the body height).
  - 'wordmark'  : "klyro" lowercase, Inter 800, tight tracking. The "k" is --color-violet;
                  "lyro" is --color-text-primary on dark / --color-navy on light. No period.
  - 'lockup'    : cat mark + wordmark side by side (the horizontal treatment).

Props: { variant?: 'mark' | 'wordmark' | 'lockup'; theme?: 'dark' | 'light'; className?: string }
Defaults: variant 'lockup', theme 'dark'.

If the brand asset files (klyro.png / klyro_.png) are present in the working directory, use them
as visual reference for the cat's proportions and the wordmark's letterforms when authoring the
SVG paths. Also export static SVGs to public/brand/ (klyro-cat.svg, klyro-wordmark.svg,
klyro-lockup.svg) for email/press/OG use — the component remains the source of truth.

If you cannot produce a clean SVG cat on the first pass, ship a simple geometric placeholder mark
(a rounded square containing a violet "k" with a small check) AND tell me clearly that the cat SVG
needs a follow-up. Do not block Phase 0 on logo polish — but do implement the wordmark properly,
since it's just type.

STEP 9 — Install shadcn/ui
- Run: pnpm dlx shadcn@latest init
- Configure with Slate base color (we override with Klyro tokens via the Tailwind theme).
- Install initial primitives:
  pnpm dlx shadcn@latest add button card dialog input label select sheet sonner
- After install, adjust components.json / the generated CSS variables so shadcn primitives consume
  the Klyro tokens (violet primary, navy surfaces) rather than the default Slate values.

STEP 10 — Environment variable validation
- Create src/lib/env.ts that uses Zod to parse process.env at startup.
- Split into client-only (NEXT_PUBLIC_*) and server-only schemas.
- Throw a clear error if any required env var is missing in production.
- Export a typed env object for use across the app.
- Create .env.example with ALL keys from Section 4 of the PRD (with empty values).
- Add a brief comment above each section explaining what it's for.

STEP 11 — Supabase setup
- Create a Supabase project at supabase.com (or ask me to do it and provide the URL + keys).
- Once I provide credentials:
  - Add them to .env.local (which is gitignored)
  - Create the Supabase clients per Section 6 patterns:
    - src/lib/supabase/client.ts     (browser client, createBrowserClient from @supabase/ssr)
    - src/lib/supabase/server.ts     (RSC + Route Handlers, createServerClient with cookies)
    - src/lib/supabase/middleware.ts (Edge middleware client)

STEP 12 — Database migrations + vertical registry
- Create the migration files in supabase/migrations/ per Section 5 of the PRD:
  - 0001_init.sql              — All 12 tables with constraints and indexes
  - 0002_rls_policies.sql      — Helper functions + RLS policies for all tables
  - 0003_message_templates.sql — Seed default templates programmatically: all 7 active verticals
                                  × 2 channels (whatsapp, email) × 2 languages (es, en) × 3 types
                                  (confirmation, reminder_24h, cancellation) = 84 templates
  - 0004_pg_cron_reminders.sql — pg_cron job 'dispatch-due-messages' (every 5 minutes)
- Remember: businesses.vertical is free-form TEXT, NOT a Postgres enum — adding a vertical must
  never require a migration.
- Run migrations against Supabase (ask me to run them in the SQL Editor if you don't have CLI
  access, or use supabase db push).
- Generate types: pnpm dlx supabase@latest gen types typescript --project-id <id> > src/types/database.ts
- Scaffold src/lib/verticals/registry.ts with all 8 vertical profiles (barbershop, salon, fitness,
  spa, tattoo, carwash, petgrooming, other) typed per the VerticalProfile interface in Section 5.4.
  Fill in real default services, durations, buffers, cancellation hints, message tone, and the
  es/en booking-page nouns for each. 'other' is the no-defaults fallback.

STEP 13 — i18n scaffold
- Configure next-intl with es as default and en as secondary, following the latest next-intl
  App Router setup guide.
- Create src/i18n/locales/es.json and en.json with starter keys:
  - common.continue, common.back, common.cancel, common.save
  - landing.title, landing.tagline   (tagline: "Tu negocio. Tus clientes. Tu marca." / 
    "Your business. Your clients. Your brand.")
- Set up the [locale] App Router segment and middleware per next-intl docs.

STEP 14 — Hello Klyro smoke test
- Create src/app/[locale]/page.tsx that:
  - Renders the <Logo variant="lockup" /> component on the --color-bg-base background
  - Shows the tagline below it using --color-text-secondary
  - Server-side fetches a count from the businesses table using the server Supabase client
  - Displays the count to prove the Supabase connection works (will be 0)
- Verify pnpm dev runs at http://localhost:3000 and the page shows the cat + wordmark in the
  correct violet/navy palette.
- Verify pnpm typecheck and pnpm lint pass (add these scripts to package.json if missing).

STEP 15 — Favicon & app icons
- Generate favicon.ico, public/icon.svg, and public/apple-icon.png from the Logo 'mark' variant.
- icon.svg uses the cat mark; apple-icon.png sits the cat mark on a --color-bg-base rounded square;
  favicon.ico uses the 1-color navy fallback so it stays crisp at 16px.
- Wire src/app/manifest.ts with name "Klyro", theme color --color-bg-base, the icons above.

STEP 16 — Observability wiring
- Set up Sentry: pnpm dlx @sentry/wizard@latest -i nextjs
- Add a PostHog provider in src/app/[locale]/layout.tsx (initialize only on the client)
- Add @vercel/analytics and @vercel/speed-insights components in the layout
- These can be no-ops in dev (env vars empty); they must not crash the app.

STEP 17 — CI workflow
Create .github/workflows/ci.yml that on every PR:
  - Uses Node 22 LTS
  - Installs pnpm via corepack (or pnpm/action-setup@latest)
  - Caches the pnpm store
  - Runs pnpm install --frozen-lockfile
  - Runs pnpm typecheck
  - Runs pnpm lint
  - Runs pnpm test (vitest, will be empty for now)
  - Fails the PR if any step fails

STEP 18 — README
Write README.md with:
  - Project description (1 paragraph) — note it's a product of BridgeStack Dev
  - Tech stack summary (mention "all dependencies on latest stable; pinned via lockfile")
  - Prerequisites (Node 22+, pnpm, Supabase account)
  - Setup steps (clone, install, env, migrate, dev)
  - Available scripts (dev, build, typecheck, lint, test, test:e2e)
  - A short "Brand & design system" section pointing to globals.css (tokens) and
    src/components/shared/Logo.tsx (the mark)
  - A section on keeping dependencies up to date (pnpm outdated, pnpm up --latest)
  - Link to Klyro_Technical_PRD.md for the full spec

STEP 19 — Initial commit
- git init
- git add .
- git commit -m "chore: bootstrap Klyro project

Phase 0 (Foundation) complete:
- Next.js (latest) + TypeScript + Tailwind v4 + App Router
- pnpm + Node 22 LTS
- Klyro brand design tokens (violet/navy palette) in globals.css
- <Logo /> component (mark / wordmark / lockup variants)
- shadcn/ui primitives wired to Klyro tokens
- Supabase clients (browser, server, middleware) configured
- Database migrations for 12 tables + RLS policies + 84 message templates + pg_cron
- Vertical registry scaffolded with all 8 vertical profiles
- Zod-validated env vars
- next-intl i18n scaffold (es default, en secondary)
- Favicon + app icons from the cat mark
- Sentry + PostHog + Vercel Analytics + Speed Insights wired
- CI workflow (typecheck + lint + test)
- README with setup instructions

All dependencies on latest stable at install time; reproducibility guaranteed by pnpm-lock.yaml.

Product of BridgeStack Dev."

DO NOT push. Local commit only.

================================================================
EXIT CRITERION FOR PHASE 0
================================================================
At the end of Phase 0:
  ✅ pnpm dev runs at localhost:3000 without errors
  ✅ The Hello Klyro page renders the cat + wordmark lockup in the correct violet/navy palette
  ✅ The tagline displays below the logo
  ✅ A server-rendered count from Supabase displays (0 is fine)
  ✅ pnpm typecheck passes
  ✅ pnpm lint passes
  ✅ pnpm build completes successfully
  ✅ All 12 tables exist in Supabase with RLS enabled
  ✅ The verticals registry is type-safe and exports all 8 profiles
  ✅ Favicon shows the cat mark in the browser tab
  ✅ One commit on the main branch
  ✅ All major deps confirmed on latest stable (next, react, tailwindcss, supabase clients)

================================================================
REPORT BACK TO ME
================================================================
Once Phase 0 is done, give me:
1. Confirmation that all exit criteria above are met.
2. The exact resolved versions of: next, react, react-dom, typescript, tailwindcss,
   @supabase/supabase-js, @supabase/ssr, next-intl, zod (paste from package.json or pnpm list).
3. A screenshot or text description of the Hello Klyro page — specifically whether the cat
   mascot SVG came out clean or shipped as the geometric placeholder.
4. Any blockers, decisions you had to make on your own (especially Tailwind v4 rough edges or
   the Logo SVG), or questions before Phase 1.
5. The total time spent on Phase 0.

Then STOP and wait for my approval before starting Phase 1 (Authentication & Onboarding Shell).
```

---

## 📋 Notes before you start

1. Make sure `Klyro_Technical_PRD.md` is in the same folder where Claude Code runs.
2. Drop the brand assets (`klyro.png`, `klyro_.png`) in the folder too if you have them — Claude
   Code uses them as visual reference for the `<Logo />` SVG. If they're missing, the wordmark
   still ships correctly (it's just type) and the cat falls back to a geometric placeholder.
3. You need **Node 22 LTS or higher** installed locally. Check with `node -v`. If on an older
   version, install via `nvm install 22 && nvm use 22` or use Volta.
4. Create a Supabase project beforehand (or have Claude Code prompt you for it).
5. For OAuth (Google + Apple), Phase 0 doesn't need credentials yet — those come in Phase 1.
6. Expect Phase 0 to take 2–4 hours of Claude Code time if everything goes smoothly. The
   `<Logo />` component and Tailwind v4 token setup add a bit over the v1 bootstrap.
7. After Phase 0 passes, paste a new prompt asking to proceed with Phase 1.

---

## 🔁 Pattern for next phases

After Phase 0 is approved, use this short prompt for each subsequent phase:

```
Proceed with Phase N (Phase Name) from Klyro_Technical_PRD.md.

Same rules apply:
- Read the section first, summarize the plan
- Implement step by step
- Use @latest for any new dependencies you need to add
- Apply the Klyro brand tokens and <Logo /> component — never hardcode colors or substitute marks
- End with a single commit (do not push)
- Report exit criteria back to me
- Wait for my approval before moving on
```

Phase numbers:
- Phase 1 — Authentication & Onboarding Shell
- Phase 2 — Setup Wizard (Step 1 = vertical selection)
- Phase 3 — Public Booking Flow
- Phase 4 — Messaging Engine
- Phase 5 — Owner Dashboard
- Phase 6 — Staff Dashboard
- Phase 7 — Polish & QA (includes a brand-consistency pass)
- Phase 8 — Closed Beta

---

## 🔒 Dependency hygiene (run weekly after MVP launch)

```bash
# See what's outdated
pnpm outdated

# Apply all patch + minor updates safely
pnpm up

# Apply major version upgrades (review breaking changes first!)
pnpm up --latest

# Audit for security issues
pnpm audit
```

Next.js receives frequent security patches — apply patch upgrades immediately. Major version
upgrades (e.g., Next.js 17 when released) deserve a dedicated branch and migration plan.
