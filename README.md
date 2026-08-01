# TORQ Chat

Specialized AI consultants for strategy, code, legal, retirement, marketing, finance, and operations — powered by **Claude** via the **TORQ Chat BFF** (no API keys in the browser).

![TORQ Chat](public/torq-chat-logo.jpg)

## Architecture (Phase 1)

```
Browser (Vite :3000)  →  TORQ BFF (:8787)  →  Anthropic API
     session token           holds ANTHROPIC_API_KEY
     local chat history
```

The web client never receives or bundles `ANTHROPIC_API_KEY`. It obtains a short-lived session token from the BFF and streams chat over SSE.

## Two-process local development

You need **two terminals**.

### Terminal 1 — BFF server (port 8787)

```bash
# From the server project (separate agent / package holds the key)
# Example once server/ exists in this monorepo:
cd server   # or wherever the BFF lives
# Set ANTHROPIC_API_KEY in the server's .env only
npm run dev   # listens on http://localhost:8787
```

### Terminal 2 — Vite web client (port 3000)

```bash
cd E:\torq-chatbot
npm install
# Optional: copy .env.example → .env and set VITE_TORQ_API_BASE
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Process | Default URL | Secrets |
|---------|-------------|---------|
| Vite client | http://localhost:3000 | None (only `VITE_TORQ_API_BASE`) |
| TORQ BFF | http://localhost:8787 | `ANTHROPIC_API_KEY` (server-only) |

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server (client) |
| `npm test` | Vitest (unit + component) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## Product notes

- **8 consultants** with distinct system prompts (persona applied server-side / by consultant id).
- **Streaming** chat via BFF SSE (`data: {"type":"delta","text":"..."}`).
- **History** per consultant in `localStorage` (`torq-chat-history-v1`).
- **Session** token in `localStorage` (`torq-chat-session-v1`).
- **Export** conversations as Markdown.
- **Shortcuts:** `Ctrl/⌘+Shift+O` new chat · Enter send · Shift+Enter newline.
- **Legal:** [/privacy.html](/privacy.html) · [/terms.html](/terms.html)

## Security

- **Do not** put `ANTHROPIC_API_KEY` in client `.env` with a `VITE_` prefix or in `vite.config.ts` `define`.
- Server holds the model key; client holds only a session token from `POST /v1/session`.
- CSP allows connecting to the BFF (`localhost:8787` / `127.0.0.1:8787`) and HTTPS origins.

## Stack

React 19 · TypeScript · Vite 6 · Tailwind 4 · TORQ BFF (SSE) · Vitest · Testing Library
