# Project State — TORQ Chat

_Last updated: 2026-08-01_

## What this is
TORQ Chat: multi-consultant AI chat for web + iOS packaging.

- **Web client:** Vite 6 + React 19 (repo root)
- **BFF:** Hono server in `server/` (holds Anthropic key)
- **iOS:** Capacitor (`com.torq.chat`) in `ios/`
- **Model:** `claude-sonnet-5` via server-side Anthropic SDK only

GitHub: `pilotwaffle/Torq-Business-Consulting-Chat-Bot` · default branch `main`.

## Architecture (authoritative)
Client → `VITE_TORQ_API_BASE` → BFF (`/v1/session`, `/v1/chat/stream`) → Anthropic.  
**No** `dangerouslyAllowBrowser` and **no** Anthropic key in client bundles.

## Phase status
See `docs/PHASE-STATUS.md`.

| Phase | Status |
|-------|--------|
| 1 BFF + de-key | Merged (PR #5) |
| 2 Capacitor iOS | Merged (PR #6) |
| 3 App Store package | Merged (PR #6 docs) |
| 4 Hardening | This PR |

## Operator-owned (not automated here)
1. Deploy BFF (Railway + `server/Dockerfile`)
2. Production domain + CORS + `VITE_TORQ_API_BASE`
3. Mac: Xcode → TestFlight → App Store Connect submit
4. Apple Developer Program membership

## Gates
```
npm test && npm run build
npm --prefix server test && npm --prefix server run build
```
