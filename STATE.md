# Project State — TORQ Business Consulting Chatbot

_Last updated: 2026-07-13_

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
  `inline` prop (react-markdown v9 typing). Does not block the build.

## History
- `f85c160` — Migrated the AI provider Google Gemini → Anthropic Claude Sonnet 5
  (service rewrite, 15 tool schemas converted, `googleSearch` → `web_search`,
  live voice feature disabled — no Anthropic realtime-audio equivalent). Pushed
  to `main`. Build verified.
- `f1b3091` (branch `fix/g1r-migration-followups`) — Fixed 5 findings from an
  independent review of the migration:
  - Removed leftover `@google/genai` + dead CDN import map from `index.html`.
  - Raised `max_tokens` 8192 → 32000; surface `max_tokens` truncation to the UI.
  - `web_search_20250305` → `web_search_20260209` (dynamic filtering).
  - Guard against empty user turns (would 400).
  - Whitelist image media types before send.
  - **Independently graded PASS / merge-ready.** `tsc` (only the known error) +
    `build` pass. Awaiting operator approval to fast-forward into `main`.

## Multi-model loop (this session)
Operator activated a G1D/G1R/Builder/G2A routing policy via `/goal`. Note: the
`.claude/agents` files it references do not exist in this repo; roles were
approximated with Opus-model subagent reviews. G1R (review) and G2A (final
audit) both ran and passed for the follow-up fixes.
