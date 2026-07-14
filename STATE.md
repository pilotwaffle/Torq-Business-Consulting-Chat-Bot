# Project State — TORQ Business Consulting Chatbot

_Last updated: 2026-07-14_

## What this is
React + Vite chatbot with multiple AI consultant personas. AI provider is
**Anthropic Claude (`claude-sonnet-5`)** via `@anthropic-ai/sdk`. Client-side
app: the API key is bundled and `dangerouslyAllowBrowser` is used (intentional;
personal/local use only — do NOT deploy publicly with a live key).

GitHub: `pilotwaffle/Torq-Business-Consulting-Chat-Bot` (branch `main`).

## Stack / gate
- Vite 6 + React 19 + TypeScript.
- No test suite. Effective gate = `npx tsc --noEmit` + `npm run build`.
- Known pre-existing, out-of-scope typecheck error: `components/ChatMessageBubble.tsx`
  `inline` prop (react-markdown v9). Does not block the build.

## History (all on `main`)
- `f85c160` — Migrated the AI provider Google Gemini → Anthropic Claude Sonnet 5
  (service rewrite, 15 tool schemas converted, `googleSearch` → `web_search`,
  live voice feature disabled — no Anthropic realtime-audio equivalent).
  Independently reviewed; build verified.
- `5df9032` — Fixed 5 findings from the independent review of the migration
  (removed leftover `@google/genai` CDN import map; raised `max_tokens` + surface
  truncation; `web_search_20260209`; empty-turn guard; image media-type
  whitelist) and added STATE.md. Independently graded **PASS**. Build verified.
- `e2a9a6f` — Added project-local authority files
  (`.claude/agents/{g1d,g1r,builder,g2a}.md`, `CLAUDE.md`, `MEMORY.md`).
  Reviewed twice; independently graded **PASS**.
- `f6b29b1` — Recorded the operator ruling that `tsc + build` is the repo's
  satisfying gate (no test suite required).

## In progress — NOT yet committed
Branch `docs/authority-scaffold` (off `main`): corrections to the authority
scaffolding per operator instruction — separate G1R (pre-implementation) from
G2A (post-implementation) responsibilities; make G1R strictly read-only (removed
Bash); correct model-tier prose to reflect `model:` aliases (not dated pins);
add draft-review and repo-state-accuracy guidance to `CLAUDE.md`; and correct
this file's own stale "not yet committed" line. **Uncommitted; awaiting operator
review and approval before commit/push.**

## Multi-model loop
This repo runs a G1D / G1R / Builder / G2A routing loop. The role definitions
live in `.claude/agents/` and the loop is documented in `CLAUDE.md` (the
authority root). `MEMORY.md` is the durable factual index. Push/merge/destructive
git actions require explicit operator approval.
