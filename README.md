# TORQ Chat

Specialized AI consultants for strategy, code, legal, retirement, marketing, finance, and operations — powered by **Claude** (`claude-sonnet-5`).

![TORQ Chat](public/torq-chat-logo.jpg)

## Quick start

```bash
cd E:\torq-chatbot
npm install
# Set ANTHROPIC_API_KEY in .env (Console key: sk-ant-api03-…)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server |
| `npm test` | Vitest (unit + component) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## Product notes

- **8 consultants** with distinct system prompts and tools (including Anthropic web search where enabled).
- **Streaming** chat with clean token accumulation (Strict Mode safe).
- **History** per consultant in `localStorage` (`torq-chat-history-v1`).
- **Export** conversations as Markdown.
- **Shortcuts:** `Ctrl/⌘+Shift+O` new chat · Enter send · Shift+Enter newline.

## Security

This is a **local / personal** Vite app. The Anthropic API key is injected at build time and used from the browser (`dangerouslyAllowBrowser`). **Do not deploy publicly** with a live key. For production, put the model call behind a small server proxy.

Use a Console API key (`sk-ant-api03-…`), not an OAuth-style `sk-ant-oat01-…` token.

## Stack

React 19 · TypeScript · Vite 6 · Tailwind 4 · Anthropic SDK · Vitest · Testing Library
