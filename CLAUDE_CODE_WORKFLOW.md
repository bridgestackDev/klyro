# Working with Claude Code on Klyro — Best Practices

**Audience:** You (the human in the loop) and Claude Code (the agent doing the work).
**Goal:** Ship Klyro phase by phase without yak-shaving, without scope creep, and without losing the thread between sessions.

---

## 1. The four-document context system

Claude Code does its best work when it knows *exactly* where to look. Don't make it guess. Maintain these four documents in the repo root — they are the agent's external memory.

| File | Purpose | Updated by | Update frequency |
|---|---|---|---|
| `Klyro_Technical_PRD.md` | The spec. Architecture, schema, brand. Source of truth. | You (rare edits) | Only when the product itself changes |
| `STATUS.md` | What's done, what's next, what's blocked. Phase-level. | Claude Code at end of each block | After every block |
| `TASKS.md` | The checkbox list, per-phase. | Claude Code as work happens | Continuously within a block |
| `DECISIONS.md` | Architecture decisions and their *why*. Never deleted, only appended. | You + Claude Code | Anytime a non-obvious choice is made |

Every Claude Code session starts with: "Read PRD §<relevant section>, STATUS.md, TASKS.md, DECISIONS.md, then summarize what you understood in 5–8 bullets before doing anything."

> The summary is not a formality. If Claude Code summarizes wrong, you catch it before code is written.

---

## 2. The block pattern (already working — keep doing it)

What you did for Phase 2 was the right shape. Formalize it:

**Per phase:** 3–7 blocks (A, B, C, …). Each block has a single goal that fits in one commit and one Claude Code session.

**Per block:**
1. Claude Code reads the relevant docs and summarizes.
2. Claude Code implements.
3. Claude Code runs `pnpm typecheck && pnpm lint && pnpm test`.
4. Claude Code commits with a structured message.
5. Claude Code reports back: exit criteria met? deviations? new deps? open questions?
6. Claude Code **stops** and waits for your approval.
7. You review the diff, you reply "approved" or "fix X first."

The stop is the most important step. Without it Claude Code drifts into the next block, mixes concerns in the commit, and you lose the ability to roll back a bad decision cheaply.

---

## 3. Rules Claude Code follows on every block

Paste these at the top of every phase prompt. They don't change.

```
1. Klyro_Technical_PRD.md is the source of truth. If unclear, ASK before guessing.
2. One block per session. One commit per block. Do NOT mix blocks.
3. After each block: typecheck + lint + test must pass before you commit.
4. After each block: STOP and report. Do NOT start the next block.
5. Use @latest for new deps. The lockfile is the source of truth.
6. Apply Klyro brand tokens and <Logo /> component. Never hardcode colors.
7. Never touch RLS-protected data without going through the authed Supabase server
   client and the appropriate helper (getOwnerBusinessId, etc.).
8. Update STATUS.md and TASKS.md as part of every commit.
9. If you discover a non-obvious decision during the block, append it to DECISIONS.md
   in the same commit.
10. NEVER push. Local commits only.
```

---

## 4. What "good" looks like — concrete signals per block

| Signal | Means |
|---|---|
| Summary mentions the exact files it's going to touch | Claude Code read the docs. Good. |
| Summary lists 8+ files, asks if there's a smaller starting point | Claude Code spotted scope creep. Listen to it. |
| Commit touches >25 files | Block is too big. Either split or you defined it wrong. |
| New top-level dep added | Confirm it was justified. Bias toward the existing stack. |
| New folder created not in the spec | Stop. Ask why. Often a sign of over-architecting. |
| Tests skipped | Reject. Ask why. Either fix the test or document why it's not needed in DECISIONS.md. |
| Type errors fixed by `as any` or `// @ts-expect-error` | Reject unless DECISIONS.md explains it. |

---

## 5. Anti-patterns to call out

These come up often with agents. Watch for them.

**Speculative generality.** Claude Code wants to build an abstraction "in case we need it later." You only need it now. Refuse it. The cost of a missing abstraction is one refactor; the cost of a wrong abstraction is a permanent tax.

**Silent dependency upgrades.** A block sneaks in a major version bump of an unrelated package. Reject. Major upgrades get their own commit with their own PR.

**Quiet schema changes.** A block adds a column to `appointments` without mentioning it in the summary. Reject. Schema changes get explicit migrations + DECISIONS.md notes.

**Mixed concerns in commits.** A block "fixes a bug while we're here." That bug fix is its own commit. Make Claude Code split it.

**Vague error messages.** `throw new Error("failed")`. Reject. Every error has a code, a user-facing message, and context for the log.

**Tests that test the mock.** A test that only verifies a mock returns what the mock was told to return. Reject. Tests must exercise real code paths.

---

## 6. The commit message format

```
<type>(<scope>): <subject>

<body — what changed and why>

<footer — refs and breaking changes>
```

Types: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `perf`, `style`.
Scope: the phase + block, e.g. `phase-2.5`, `phase-3-block-b`.

Example:
```
feat(phase-2.5-block-a): error model + global handler

Add ApiError class with code/status/fieldErrors. Add toErrorResponse helper
used by all route handlers. Add app/[locale]/error.tsx and not-found.tsx
with Klyro-branded UI.

Refs: STATUS.md Phase 2.5 / TASKS.md A1-A3
```

---

## 7. When Claude Code asks you something

Default: answer in one sentence with the decision and one sentence with the reason. Don't write an essay.

If the question reveals the spec is genuinely ambiguous, also update `Klyro_Technical_PRD.md` so the next session inherits the answer.

If the question reveals Claude Code didn't read the spec, point it at the section and ask it to summarize before continuing.

---

## 8. When you spot drift mid-block

Don't wait. Tell it now.

```
Stop. You're <doing X>. The spec says <Y>. Revert and follow the spec.
If the spec is wrong, update it first, then resume.
```

The earlier you catch drift the cheaper it is. Five minutes in, you lose a draft. Two hours in, you lose a commit.

---

## 9. Session hygiene

- One phase per conversation. Long conversations lose context fast.
- Start every session with "Read STATUS.md and TASKS.md and tell me where we are."
- End every session with "Update STATUS.md and TASKS.md and commit."
- If a session goes off the rails, kill it. Start fresh, point at the latest commit, resume.

---

## 10. Reviewing the diff (your part)

You don't have to read every line. Read these in order:

1. **The commit message.** Does it match what the block was supposed to do?
2. **The file list.** Any files that shouldn't be there?
3. **`STATUS.md` and `TASKS.md`.** Do they reflect reality?
4. **`DECISIONS.md` if it changed.** Do you agree with the call?
5. **Migrations folder.** Any new SQL? Read it carefully.
6. **One or two changed files at random.** Sniff test for style and conventions.

If steps 1–5 are clean, you can usually trust step 6. If steps 1–5 are sloppy, every line of step 6 is suspect.

---

## 11. The two questions to ask before starting any phase

1. **What is the smallest commit that proves this phase works?** This is your exit criterion. Everything else is decoration.
2. **What does this phase NOT include?** Write it down. Otherwise it grows.

Phase 2.5 examples:
- Smallest proof: one E2E test that completes the wizard end-to-end without crashing, on a public booking endpoint that's rate-limited and returns localized errors.
- Not included: dashboards, payments, GDPR, multi-currency, anything beyond ES + EN.

---

## 12. End of phase ritual

When a phase is done:

1. STATUS.md updated, phase marked ✅.
2. TASKS.md updated, every item checked or moved to next phase.
3. DECISIONS.md reviewed for completeness.
4. A short "Phase N retro" appended to STATUS.md: what went well, what didn't, what to do differently next phase.
5. Tag the commit: `git tag phase-N-done`.

Then take a break. Come back to the next phase fresh.

---

**Bottom line:** treat Claude Code like a strong junior developer with perfect recall and zero context. The four docs are the context. The block pattern is the workflow. The stop-and-report is the safety net. Everything else is just discipline.
