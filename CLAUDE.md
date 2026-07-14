# CLAUDE.md — TORQ Consulting Chatbot

## 1. What this project is

TORQ Business Consulting chatbot. A **client-side** single-page app: Vite 6 + React 19 + TypeScript. The AI provider is **Anthropic `claude-sonnet-5`** via `@anthropic-ai/sdk` (migrated from Google Gemini).

The Anthropic call runs **in the browser**: the API key is bundled into the build and the SDK is initialized with `dangerouslyAllowBrowser: true`. This is acceptable ONLY because this is a **personal / local-use** app.

- **Do NOT deploy this publicly with a live API key.** A bundled key is extractable by anyone who loads the page. Public deployment requires moving the Anthropic call behind a server/proxy first.
- GitHub remote: `pilotwaffle/Torq-Business-Consulting-Chat-Bot` (branch `main`).

## 2. Build / test gate

There is **NO test suite**. `package.json` scripts are dev / build / preview only. The effective gate for any change is:

```
npx tsc --noEmit
npm run build
```

Both must pass before a change is merge-ready.

> **Operator ruling (2026-07-14):** This gate — `npx tsc --noEmit` + `npm run build` — **is** the repo's satisfying gate under the multi-model loop's "do not stop until tests pass" condition. This repo intentionally has no automated test suite; a passing gate (with only the known `ChatMessageBubble.tsx` error below) satisfies "tests pass." Do not treat the absence of a `test` script as a blocker.

**Known pre-existing, out-of-scope error:** `components/ChatMessageBubble.tsx` has an inline-prop typecheck error from react-markdown v9. It predates current work and is **not** to be "fixed" as drive-by cleanup — leave it unless a ticket explicitly scopes it. Do not let it mask *new* errors: read tsc output and confirm any failures are only this one known line.

## 3. Multi-model operating loop (active authority)

This repo operates under a multi-model loop. Role definitions live in:

- `.claude/agents/g1d.md` — **G1D** (Opus 4.8): planner / task router / session owner. Produces the scope package (task restatement, repo facts, goal / non-goals, source-of-truth files, allowed / forbidden files, expected shape, **verification steps** — `tsc --noEmit` + `build`, since there is no test suite — risks, whether G1R is required, Builder instructions, G2A checklist, operator approval gates). Orchestrates; does not push or merge without approval.
- `.claude/agents/g1r.md` — **G1R** (Opus 4.7): independent architecture challenger / risk reviewer. Triggered when a task touches architecture, security, auth, permissions, data model, API contracts, persistence, concurrency, async state, payments, deployment, CI/CD, production behavior, agent authority, destructive actions, or cross-project files. Verdicts: APPROVE / APPROVE-WITH-CHANGES / REJECT.
- `.claude/agents/builder.md` — **Builder** (Sonnet 5): code / test-repair worker. Implements ONLY approved scope; no broad rewrites, no unrelated cleanup; preserves operator files; runs focused checks then the full gate; summarizes exact files changed. Must NOT push / merge / delete branches / clean / reset / force-push / overwrite operator files / start extra tickets.
- `.claude/agents/g2a.md` — **G2A** (Opus 4.8): final verifier / merge-readiness auditor. Grades against approved scope, git diff, files changed, gate output (tsc + build), runtime behavior, acceptance criteria, security invariants, and repo authority files. Verdicts: PASS / PASS-WITH-NITS / REJECT.

Haiku/fast tier may do cheap verification, checklist grading, log triage, scope sanity, and test-output summarization — but is **never** the sole final authority for risky code, architecture, security, production, merges, or destructive ops.

**Loop:** G1D scopes → G1R reviews if triggered → G1D folds the review → Builder implements approved scope → Builder runs focused checks → Builder runs the full gate (`npx tsc --noEmit` + `npm run build`) → G2A audits → on REJECT, Builder patches ONLY the mismatch and reruns → G2A re-audits → memory-writer updates `STATE.md` / `MEMORY.md` only after meaningful progress + gate passes + G2A passes → coordinator reports PR-readiness and waits for **operator approval** before any push / PR / merge.

### Gates and branch policy

- **Fresh branch per change**, named `fix/…`, `docs/…`, or `ticket/…`. Never work directly on `main`.
- **Explicit operator approval is required** before any: `git push`, PR creation, merge, `git reset --hard`, `git clean`, `git branch -D`, force-push, or `rm -rf`.
- Safe inspection is always allowed. Safe local commits are allowed only after the plan is approved and the repo is in a safe state.

## 4. Environment

- `ANTHROPIC_API_KEY` is read from `.env`.
- `.env` is **gitignored** — never commit it, never paste the key into source, logs, commits, or PRs.
- Because the key is bundled at build time (see §1), treat any built artifact containing it as sensitive and local-only.
