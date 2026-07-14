---
title: torq-chatbot Project Memory
type: memory-index
updated: 2026-07-13
---

# torq-chatbot — Project Memory

Durable factual index for `E:\torq-chatbot`. One line per fact. Factual only.

## Global Memory

Read ~/.claude/CLAUDE.md for memory rules and topic files.

When a new file is added to ~/.claude/memory/:
- Add it to the ## Global Memory topic file list in ~/.claude/CLAUDE.md only
- Do NOT update individual project MEMORY.md files

## Project Identity + Stack

- TORQ Business Consulting chatbot: client-side single-page web app.
- Stack: Vite 6 + React 19 + TypeScript.
- AI provider: Anthropic `claude-sonnet-5` via `@anthropic-ai/sdk` (migrated from Google Gemini).
- API key is bundled client-side with `dangerouslyAllowBrowser` — personal/local use only, not multi-tenant production.
- GitHub remote: `pilotwaffle/Torq-Business-Consulting-Chat-Bot`, branch `main`.

## Landed Commits (main)

- `f85c160` — Gemini -> Anthropic migration; on `main`, independently graded.
- `5df9032` — review follow-up fixes; on `main`, independently graded.
- `e2a9a6f` — project-local authority files added; on `main`, graded PASS.
- `f6b29b1` — operator ruling (tsc+build is the gate) recorded; on `main`.
- (uncommitted, branch `docs/authority-scaffold`) — authority-scaffold
  corrections: G1R/G2A responsibility split, G1R made read-only, model-alias
  prose fix, draft-review + repo-accuracy guidance. Not yet committed.

## Migration Facts

- Live voice was removed: no Anthropic realtime-audio equivalent exists to replace the prior Gemini live-voice feature.
- Web search maps to Anthropic web search tool `web_search_20260209`.

## Gate

- No test suite exists; npm scripts are dev/build/preview only.
- Effective gate is `npx tsc --noEmit` + `npm run build`.
- **Operator ruling (2026-07-14):** this gate IS the repo's satisfying gate for the loop's "tests pass" condition; the absence of a `test` script is not a blocker. (See CLAUDE.md §2.)
- Known pre-existing, out-of-scope typecheck error: `components/ChatMessageBubble.tsx` inline prop (react-markdown v9).

## Operating Loop

- The multi-model operating loop (G1D / G1R / Builder / G2A / Haiku roles, LOOP, GATES) is defined in CLAUDE.md — that file is the source of truth for the operator /goal policy.
- `STATE.md` (repo root, committed in `5df9032`) holds current-state / session progress; the memory-writer updates it and this file only after meaningful progress + gate passes + G2A PASS.

## Project Notes

(Populated as work continues in this project.)
