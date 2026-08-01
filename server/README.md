# TORQ Chat BFF (Phase 1)

Backend-for-Frontend for the TORQ Business Consulting chatbot.

**Purpose:** Hold `ANTHROPIC_API_KEY` server-side so the browser never receives it. Clients obtain an anonymous session JWT, then stream chat through this service.

## Stack

| Piece | Choice |
|-------|--------|
| Runtime | Node.js 18+ |
| Framework | [Hono](https://hono.dev) + `@hono/node-server` |
| Language | TypeScript (ESM) |
| LLM | `@anthropic-ai/sdk` → model `claude-sonnet-5` |
| Auth | JWT session tokens (HS256 via `jose`) |
| Validation | Zod |
| Tests | Vitest |

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | No | `{ ok: true, version: "1.0.0" }` |
| `POST` | `/v1/session` | No | Create anonymous session → `{ sessionToken, expiresAt }` |
| `POST` | `/v1/chat/stream` | Bearer session JWT | SSE stream of chat deltas |

### Chat stream body

```json
{
  "consultantId": "strategic-advisor",
  "messages": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi — how can I help?" },
    { "role": "user", "content": "Draft a GTM plan." }
  ]
}
```

- `systemInstruction` from the client is **ignored**. System prompts are loaded from `src/consultants.ts` by `consultantId`.
- Roles: `user` | `assistant` | `tool` (`tool` is mapped to `user` in Phase 1).

### SSE events

```
data: {"type":"delta","text":"..."}\n\n
data: {"type":"error","message":"..."}\n\n
data: {"type":"done","usage":{"input_tokens":0,"output_tokens":0}}\n\n
```

### Rate limiting

- **30 requests / session / 10 minutes** (in-memory)
- Over limit → `429` with `{ "error": "rate_limit" }` and `Retry-After` header

### Consultants (server-side only)

| ID | Name |
|----|------|
| `strategic-advisor` | Strategic Advisor |
| `code-architect` | Code Architect |
| `legal-intelligence-system` | Legal Intelligence System |
| `retirement-planning-intelligence` | Retirement Planning Intelligence |
| `ebook-character-intelligence` | E-book Character Intelligence |
| `marketing-guru` | Marketing Guru |
| `finance-analyst` | Finance Analyst |
| `operations-expert` | Operations Expert |

## Setup & Run

```bash
cd server

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set ANTHROPIC_API_KEY and SESSION_SECRET

# 3. Development (hot reload via tsx)
npm run dev

# 4. Production build + start
npm run build
npm start

# 5. Tests
npm test
```

Default listen address: `http://localhost:8787`

### Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes (for chat) | — | Anthropic API key (never exposed to clients) |
| `SESSION_SECRET` | Prod: yes | random (dev) | HS256 signing secret (≥16 chars) |
| `PORT` | No | `8787` | HTTP port |
| `CORS_ORIGINS` | No | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated allow-list |
| `DAILY_TOKEN_BUDGET` | No | disabled | Soft global daily token budget |

Load env vars yourself (export / dotenv / process manager). This package does not bundle a dotenv loader so secrets stay outside the process by default. For local dev you can:

```bash
# PowerShell
$env:ANTHROPIC_API_KEY="sk-ant-..."
$env:SESSION_SECRET="a-long-random-secret-here"
npm run dev

# bash
export ANTHROPIC_API_KEY=sk-ant-...
export SESSION_SECRET=a-long-random-secret-here
npm run dev
```

Or use a tool like `dotenv-cli`:

```bash
npx dotenv -e .env -- npm run dev
```

## Quick smoke test

```bash
# Health
curl http://localhost:8787/health

# Session
TOKEN=$(curl -s -X POST http://localhost:8787/v1/session | jq -r .sessionToken)

# Stream chat
curl -N -X POST http://localhost:8787/v1/chat/stream \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"consultantId":"strategic-advisor","messages":[{"role":"user","content":"Say hi in one sentence."}]}'
```

## Security notes

- API key never leaves the server; never logged in full.
- Client `systemInstruction` is discarded — prompts come only from `src/consultants.ts`.
- Session JWTs are HS256-signed; set a strong `SESSION_SECRET` in production.
- CORS is an explicit allow-list (no wildcards when origins are configured).
- Request body capped at ~1 MiB.
- Empty message content is rejected.

## Project layout

```
server/
  src/
    index.ts              # process entry
    app.ts                # Hono app factory
    config.ts             # env + defaults
    consultants.ts        # server-side system prompts
    types.ts              # zod schemas + SSE types
    middleware/
      auth.ts             # Bearer JWT verification
      rateLimit.ts        # per-session rate limit
    routes/
      health.ts
      session.ts
      chat.ts             # SSE chat stream
    services/
      session.ts          # JWT create/verify
      rateLimit.ts        # in-memory limiter + daily budget
      anthropic.ts        # Anthropic stream wrapper
  tests/
    health.test.ts
    session.test.ts
    auth.test.ts
    chat-validation.test.ts
  .env.example
  package.json
  tsconfig.json
  vitest.config.ts
  README.md
```

## Phase 1 scope / non-goals

**In scope:** health, anonymous session JWT, authenticated SSE chat, server-side consultant prompts, rate limit, CORS, basic tests.

**Not in scope (later phases):** tool-use loop, web search, conversation persistence, multi-replica rate limiting, OAuth user accounts, client wiring (`App.tsx` / Vite proxy).
