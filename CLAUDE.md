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

This repo operates under a multi-model loop. Role definitions live in the four files below (`.claude/agents/`):

- `.claude/agents/g1d.md` — **G1D** (current Opus alias): planner / task router / session owner. Produces the scope package (task restatement, repo facts, goal / non-goals, source-of-truth files, allowed / forbidden files, expected shape, **verification steps** — `tsc --noEmit` + `build`, since there is no test suite — risks, whether G1R is required, Builder instructions, G2A checklist, operator approval gates). Orchestrates; does not push or merge without approval.
- `.claude/agents/g1r.md` — **G1R** (current Opus alias): independent **pre-implementation** architecture / risk / security challenger. Reviews the *plan* (the G1D scope package) and its risks **before any code is written** — architecture, threat model, API/model assumptions, acceptance criteria, allowed/forbidden files, and data/persistence/concurrency/payment/deployment/authority risks. **Strictly read-only: Read/Grep/Glob only — no Bash, no Edit, no Write.** Does NOT review the finished implementation (that is G2A's job). Triggered when a task touches architecture, security, auth, permissions, data model, API contracts, persistence, concurrency, async state, payments, deployment, CI/CD, production behavior, agent authority, destructive actions, or cross-project files. Verdicts: APPROVE / APPROVE-WITH-CHANGES / REJECT.
- `.claude/agents/builder.md` — **Builder** (current Sonnet alias): code / test-repair worker. Implements ONLY approved scope; no broad rewrites, no unrelated cleanup; preserves operator files; runs focused checks then the full gate; summarizes exact files changed. Must NOT push / merge / delete branches / clean / reset / force-push / overwrite operator files / start extra tickets.
- `.claude/agents/g2a.md` — **G2A** (current Opus alias): final **post-implementation** verifier / merge-readiness auditor. Grades the *finished change* against approved scope, git diff, exact files changed, gate output (tsc + build, which G2A re-runs itself), runtime behavior, acceptance criteria, security invariants, operator/authority-file preservation, branch hygiene, and whether G1R's conditions were folded. Note: `npm run build` writes `dist/` artifacts, so the gate is **not** fully read-only — it's verification that produces throwaway build output (never committed). Verdicts: PASS / PASS-WITH-NITS / REJECT.

The four role files carry `model:` **tier aliases** (`opus` / `sonnet`) in their frontmatter, which the harness resolves to the current model in that tier — they are **not** pins to a specific dated version. Where a role's prose names a tier, read it as "the current Opus/Sonnet alias."

Haiku/fast tier may do cheap verification, checklist grading, log triage, scope sanity, and test-output summarization — but is **never** the sole final authority for risky code, architecture, security, production, merges, or destructive ops.

**Loop:** G1D scopes → G1R reviews if triggered → G1D folds the review → Builder implements approved scope → Builder runs focused checks → Builder runs the full gate (`npx tsc --noEmit` + `npm run build`) → G2A audits → on REJECT, Builder patches ONLY the mismatch and reruns → G2A re-audits → memory-writer updates `STATE.md` / `MEMORY.md` only after meaningful progress + gate passes + G2A passes → coordinator reports PR-readiness and waits for **operator approval** before any push / PR / merge.

### Reviewing drafts vs. on-disk files

When a reviewer grades content that has **not yet been written to the repository** (e.g. proposed new files still in a workflow's memory or a scratch directory), give the reviewer the **actual draft contents** — inline, or a staging directory holding the exact draft files. A reviewer that inspects the live repo before the drafts are written will wrongly report them as "missing." Do **not** treat "not yet written to the repo" as evidence a draft is absent. Sequence:

1. Review the **draft contents** for correctness/consistency (contents-based review).
2. Write the files to disk.
3. Run a **separate on-disk review** (YAML parse, cross-file consistency, gate) against the real files.

### Keeping repository state accurate

- Never describe files as **committed, merged, or on `main`** until that has actually happened. If they exist only in the working tree, label them **uncommitted**.
- Do **not** update `STATE.md` with a "completed / merged" status before the work is committed and (where required) operator-approved. `STATE.md` and `MEMORY.md` must reflect real git state, not intended state.

### Gates and branch policy

- **Fresh branch per change**, named `fix/…`, `docs/…`, or `ticket/…`. Never work directly on `main`.
- **Explicit operator approval is required** before any: `git push`, PR creation, merge, `git reset --hard`, `git clean`, `git branch -D`, force-push, or `rm -rf`.
- Safe inspection is always allowed. Safe local commits are allowed only after the plan is approved and the repo is in a safe state.

## 4. Environment

- `ANTHROPIC_API_KEY` is read from `.env`.
- `.env` is **gitignored** — never commit it, never paste the key into source, logs, commits, or PRs.
- Because the key is bundled at build time (see §1), treat any built artifact containing it as sensitive and local-only.
