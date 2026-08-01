# PRD: TORQ Chat — Production Web + iOS App Store

| Field | Value |
|-------|--------|
| **Product** | TORQ Chat |
| **Document** | PRD-TORQ-CHAT-WEB-IOS-v1 |
| **Status** | **APPROVED** by King Flowers (2026-08-01) |
| **Date** | 2026-08-01 |
| **Owner** | King Flowers (operator) |
| **Repo** | `pilotwaffle/Torq-Business-Consulting-Chat-Bot` |
| **Current baseline** | `main` @ `2a46d44` — local Vite SPA, Claude client-side |

---

## 1. Executive summary

### 1.1 Problem
TORQ Chat already delivers strong multi-persona consulting answers (strategy, code, legal, retirement, marketing, finance, ops), but it is a **personal local SPA** that bundles the Anthropic API key in the browser. That architecture is unsafe for public web use and **not App Store–eligible**.

### 1.2 Goal
Ship TORQ Chat as:

1. **Production web app** (HTTPS, multi-user-safe, no client secrets), and  
2. **iOS app** distributable via **Apple App Store / TestFlight**, sharing one product core.

### 1.3 Outcome (definition of done)
- Users can use TORQ Chat on **web** and **iOS** without exposing provider keys.  
- Apple review requirements for privacy, AI disclaimers, and minimum app quality are met.  
- Operator can deploy, monitor cost, and rotate keys without rebuilding clients.  
- Local/dev mode remains possible for King Flowers without blocking production path.

### 1.4 Explicit non-goals (v1)
- Android / Google Play (v1.1+).  
- Real-time voice / live audio (disabled; no Anthropic realtime equivalent).  
- Multi-tenant enterprise SSO / SOC2 certification in v1.  
- Full human legal/financial advice (product remains **general guidance**).  
- On-device LLMs as primary model.  
- Replacing TORQ Console / TORQCLAW.

---

## 2. Product vision

**TORQ Chat** is a multi-consultant AI workspace for founders and operators: switch specialized personas (strategy, code, legal, retirement, character writing, marketing, finance, operations), keep conversation history, export transcripts, and get structured, high-signal answers powered by Claude — on **browser and iPhone**.

**Positioning:** TORQ Business Solutions branded advisor suite, not a generic ChatGPT wrapper.

---

## 3. Current state (baseline)

| Area | Today | Gap vs target |
|------|--------|----------------|
| UI | React 19 + Vite SPA, light/dark, 8 consultants | Mobile-native chrome, safe areas |
| Model | `claude-sonnet-5` via Anthropic SDK | Must move behind server |
| Auth | None | Session/user identity for web+iOS |
| Secrets | `ANTHROPIC_API_KEY` baked into client | **Blocker** |
| Storage | `localStorage` only | Account-backed optional sync (v1: device-local OK if disclosed) |
| Tests | Vitest 115 + tsc + build | + API contract tests, E2E smoke |
| iOS | None | Capacitor or Expo shell + store assets |
| Compliance | Footer disclaimer only | Privacy Policy, Terms, App Privacy labels |
| Deploy | Local `npm run dev` | Hosted web + API |

---

## 4. Users & use cases

### 4.1 Primary users
| Persona | Needs |
|---------|--------|
| **King Flowers / TORQ operator** | Reliable advisors, cost control, brand consistency |
| **Founder / SMB operator** | Strategy, GTM, ops, finance framing |
| **Technical founder** | Architecture / code review persona |
| **Mobile user** | Same product on iPhone, offline-tolerant UX for history |

### 4.2 Core use cases (v1)
1. Select a consultant persona and chat with streaming replies.  
2. Start / resume / rename / delete / export conversations.  
3. Attach images or text files within size limits.  
4. Use tools where enabled (mock tools OK if labeled; web search via Anthropic server tool).  
5. Toggle light/dark theme.  
6. Use on **web (desktop + mobile browser)** and **iOS app**.  
7. Understand that output is **not professional legal/financial advice**.

---

## 5. Success metrics

| Metric | Target (90 days post-launch) |
|--------|------------------------------|
| Web production deploy | Live, HTTPS, health check green |
| App Store | **Approved** or **In Review with no security reject** |
| Client secret exposure | **Zero** provider keys in web/iOS bundles |
| Chat success rate | ≥ 99% of authenticated requests return stream or clear error |
| p95 first token (web) | ≤ 3s under normal load (region-dependent) |
| Crash-free iOS sessions | ≥ 99% |
| Support incidents: key leak | **0** |
| Cost visibility | Daily Anthropic spend visible to operator |

---

## 6. Target architecture

```text
┌─────────────────┐     HTTPS      ┌──────────────────────────┐
│  Web (Vite SPA) │ ──────────────►│  TORQ Chat API (BFF)     │
└─────────────────┘                │  - Auth / sessions       │
                                   │  - Rate limits           │
┌─────────────────┐     HTTPS      │  - Anthropic proxy       │
│  iOS (Capacitor │ ──────────────►│  - Usage metering        │
│   or Expo shell)│                │  - Audit logs (no PII    │
└─────────────────┘                │    beyond need)          │
                                   └────────────┬─────────────┘
                                                │ server-side key
                                                ▼
                                   ┌──────────────────────────┐
                                   │  Anthropic Messages API  │
                                   │  claude-sonnet-5 (+ tools)│
                                   └──────────────────────────┘
```

### 6.1 Principles
1. **No secrets in clients** — only TORQ Chat API tokens / session cookies.  
2. **One chat contract** — web and iOS call the same BFF endpoints.  
3. **Server owns model, tools policy, and spend caps.**  
4. **UI can stay React** for speed; iOS = shell around the same UI or thin native chrome + WebView with shared remote origin (decide in Phase 2).  
5. **Fail closed** — missing auth or over quota returns 401/429, not open proxy.

### 6.2 Recommended stack (decision defaults — operator may override)

| Layer | Default choice | Alternatives |
|-------|----------------|--------------|
| BFF | Node (Hono/Fastify) or Python FastAPI on **Railway** | Vercel serverless |
| Auth v1 | **Anonymous device ID + optional email magic link** later | Supabase Auth, Clerk |
| DB | Supabase Postgres (sessions, usage, optional chat sync) | SQLite for single-tenant |
| Web host | Vercel or Coolify | Cloudflare Pages |
| iOS shell | **Capacitor 6+** wrapping production web origin | Expo + RN rewrite (higher cost) |
| Secrets | Railway/Vercel env; never client | — |

**Decision locked for PRD unless operator rejects:** Capacitor over full React Native rewrite for v1 (faster App Store path, reuses UI).

---

## 7. Functional requirements

### 7.1 Chat core (web + iOS)
| ID | Requirement | Priority |
|----|-------------|----------|
| F-01 | Streaming chat with selected consultant system prompt | P0 |
| F-02 | Multi-turn history per conversation | P0 |
| F-03 | Consultant switch starts fresh thread; history list retained | P0 |
| F-04 | New chat, rename, delete, export Markdown | P0 |
| F-05 | File attach: images + text, max 10MB, user-visible errors | P0 |
| F-06 | Light/dark theme with class-based toggle + persistence | P0 |
| F-07 | Loading, retry, offline/network error states | P0 |
| F-08 | Stream text must not double-append | P0 |
| F-09 | Tools: client tools executed server-side or mocked with clear labeling | P1 |
| F-10 | Anthropic web_search only when consultant policy allows; budget exhausted → graceful degrade | P1 |
| F-11 | Conversation titles: provisional + optional server title gen | P1 |
| F-12 | Accessibility: focus, live regions, contrast | P1 |

### 7.2 Auth & identity
| ID | Requirement | Priority |
|----|-------------|----------|
| A-01 | Every production chat request requires a TORQ session | P0 |
| A-02 | v1: anonymous install/device session (iOS) + web session cookie/JWT | P0 |
| A-03 | Optional sign-in (email) for cross-device history — **P1 / v1.1** | P1 |
| A-04 | If accounts exist: account deletion flow (App Store 5.1.1) | P0 when A-03 ships |
| A-05 | Operator admin path to revoke sessions / rotate keys | P1 |

### 7.3 Backend / API
| ID | Requirement | Priority |
|----|-------------|----------|
| B-01 | `POST /v1/chat/stream` — SSE or chunked stream of assistant deltas | P0 |
| B-02 | Server loads consultant config; client cannot override system prompt | P0 |
| B-03 | Server holds `ANTHROPIC_API_KEY` | P0 |
| B-04 | Per-session rate limits (e.g. N requests/min, M tokens/day) | P0 |
| B-05 | Global spend circuit breaker for operator | P0 |
| B-06 | Structured logging: request id, model, tokens, latency (no full prompt dump by default) | P1 |
| B-07 | Health: `GET /health` | P0 |
| B-08 | CORS allowlist for web origin(s) only | P0 |

### 7.4 Web production
| ID | Requirement | Priority |
|----|-------------|----------|
| W-01 | HTTPS production URL (e.g. `chat.torq…`) | P0 |
| W-02 | No `dangerouslyAllowBrowser` in production builds | P0 |
| W-03 | CSP tightened (connect-src = TORQ API only) | P0 |
| W-04 | Privacy Policy + Terms linked in UI footer | P0 |
| W-05 | Environment configs: local / staging / prod | P0 |
| W-06 | Analytics optional; if used, consent + privacy disclosure | P2 |

### 7.5 iOS / App Store
| ID | Requirement | Priority |
|----|-------------|----------|
| I-01 | iOS 16+ target; iPhone priority (iPad OK scaled) | P0 |
| I-02 | Capacitor project + signing + TestFlight | P0 |
| I-03 | App icon set, splash, display name **TORQ Chat** | P0 |
| I-04 | Privacy Manifest / required reason APIs if applicable | P0 |
| I-05 | Privacy Policy URL in App Store Connect | P0 |
| I-06 | App Privacy nutrition labels accurate (data to Anthropic via TORQ API) | P0 |
| I-07 | No microphone permission unless feature ships | P0 |
| I-08 | Safe area, keyboard avoidance, status bar | P0 |
| I-09 | Reviewer notes: demo flow without secrets | P0 |
| I-10 | Guideline 4.2: polish beyond blank WebView (native chrome, share, haptics light) | P1 |
| I-11 | Offline: show last local history; chat requires network with clear message | P1 |

### 7.6 Compliance content (shared)
| ID | Requirement | Priority |
|----|-------------|----------|
| C-01 | Persistent UI disclaimer: general guidance, not attorney/CPA/fiduciary advice | P0 |
| C-02 | Stronger disclaimers when Legal / Retirement / Finance consultants selected | P0 |
| C-03 | Privacy Policy: data categories, Anthropic as subprocessors, retention | P0 |
| C-04 | Terms of Use: acceptable use, AI limitations, liability limits | P0 |
| C-05 | Age rating appropriate for business AI chat (no UGC social by default) | P0 |

---

## 8. Non-functional requirements

| ID | Category | Requirement |
|----|----------|-------------|
| N-01 | Security | No provider keys in client bundles or git |
| N-02 | Security | TLS everywhere; secure cookie flags if cookie auth |
| N-03 | Security | Input size limits; prompt injection not able to escalate server privileges |
| N-04 | Reliability | Stream cancel on client disconnect |
| N-05 | Performance | First contentful paint web ≤ 2.5s on broadband |
| N-06 | Observability | Error rate + token usage dashboards for operator |
| N-07 | Testing | Unit tests maintained; API integration tests; smoke E2E web |
| N-08 | Cost | Configurable per-user daily token budget |
| N-09 | DX | Local dev: mock mode OR local BFF with `.env` |

---

## 9. Security & threat model (summary)

| Threat | Mitigation |
|--------|------------|
| Stolen Anthropic key from client | Keys only on BFF |
| Open proxy abuse | Auth + rate limits + spend cap |
| Prompt injection → tool abuse | Allowlist tools per consultant; no arbitrary shell |
| History leakage | Device-local by default; encrypt at rest if cloud sync |
| Man-in-the-middle | HTTPS only |
| Dependency supply chain | Lockfiles, CI audit optional |

---

## 10. Data model (v1 minimum)

### 10.1 Server
- `sessions` — id, created_at, last_seen, platform (web|ios), revoked  
- `usage_events` — session_id, tokens_in/out, model, cost_estimate, created_at  
- `rate_limits` — counters by session/day  

### 10.2 Client (device)
- Conversation map (consultant → conversations) — local storage / Capacitor Preferences  
- Theme preference  
- Optional cloud sync table (v1.1)

**v1 decision:** Cloud message sync is **optional P1**. App Store can ship with on-device history only if Privacy labels say so.

---

## 11. API sketch (normative for implementers)

### `POST /v1/chat/stream`
**Auth:** Bearer session token  
**Body:**
```json
{
  "consultantId": "strategic-advisor",
  "messages": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "attachments": []
}
```
**Response:** `text/event-stream`  
Events: `delta` | `tool_call` | `tool_result` | `error` | `done` (+ usage)

### `POST /v1/session`
Creates anonymous session → `{ sessionToken, expiresAt }`

### `GET /health`
`{ "ok": true, "version": "..." }`

---

## 12. Phased delivery plan

### Phase 0 — Operator decisions (1–2 days)
- [ ] Approve this PRD (or mark changes)  
- [ ] Confirm domain(s), Apple Developer account access  
- [ ] Confirm hosting: Railway vs Vercel for BFF  
- [ ] Confirm Capacitor (default) vs RN  
- [ ] Confirm v1 auth: anonymous session only vs email  
- [ ] Confirm cloud chat sync v1 vs device-only  

**Exit:** Signed decisions table in this doc §16.

### Phase 1 — Production web foundation (1–2 weeks) — **P0**
**Goal:** Public web usable without client secrets.

1. Implement TORQ Chat BFF (stream proxy + session + rate limits).  
2. Refactor web client to call BFF only; remove key bundling.  
3. Deploy staging + production web.  
4. Privacy Policy + Terms pages (or hosted docs).  
5. CSP, CORS, health checks, basic metrics.  
6. Tests: API contract + updated client unit tests + smoke.

**Exit criteria:**
- Production web chat works with key only on server.  
- Bundle scan: no `sk-ant` strings.  
- `tsc`, client tests, BFF tests green.  
- Operator can set daily spend cap.

### Phase 2 — iOS packaging (1–2 weeks) — **P0**
**Goal:** TestFlight build of TORQ Chat.

1. Add Capacitor; point at production (or staging) origin.  
2. Native chrome polish: splash, icons, safe areas, status bar.  
3. Remove dead microphone claims.  
4. Privacy manifests / Info.plist accuracy.  
5. Internal TestFlight → external optional.  

**Exit criteria:**
- Installable TestFlight build; chat end-to-end.  
- No client secrets in IPA.  
- Checklist §7.5 I-01–I-09 complete.

### Phase 3 — App Store submission (3–7 days) — **P0**
1. App Store Connect listing, screenshots, description, keywords.  
2. Privacy labels + review notes.  
3. Submit for review; respond to rejections.  

**Exit criteria:** **Ready for Sale** or clear residual Apple feedback list.

### Phase 4 — Hardening & growth (ongoing) — **P1**
- Email auth + account delete  
- Cloud history sync  
- Stronger analytics / cost dashboard  
- Android  
- Improved native share / export  
- Real tool backends (stocks etc.)  

---

## 13. UX requirements (web + mobile)

### 13.1 Information architecture
- Sidebar: brand, consultants, history, theme  
- Main: consultant header, messages, composer  
- Empty state: logo + starter prompts  

### 13.2 Mobile web / iOS
- Collapse sidebar behind menu  
- Thumb-reachable composer  
- Avoid hover-only controls (always show critical actions)  
- Keyboard: Enter send, Shift+Enter newline (web); iOS keyboard safe area  

### 13.3 Brand
- Name: **TORQ Chat**  
- Icon: TORQ mark with **CHAT** subtitle (existing asset)  
- Colors: primary `#D90429`, dark bg `#2B2D42`, light surfaces `#EDF2F4` / `#F8F9FA`  

---

## 14. Testing strategy

| Layer | What |
|-------|------|
| Unit | Existing Vitest + new BFF unit tests |
| Contract | Stream protocol golden tests |
| Integration | BFF → Anthropic in staging with test key |
| E2E web | Playwright: login/session, send, stream, theme |
| iOS | Manual TestFlight checklist + Detox optional later |
| Security | Bundle secret scan in CI; no key in artifacts |
| Gate | Client: `tsc` + `npm test` + `build`; BFF: its test + typecheck |

---

## 15. Risks & mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Apple rejects “website wrapper” | High | Capacitor polish, native assets, offline history, clear value prop |
| Legal/finance persona scrutiny | High | Disclaimers + ToS; consider gating legal/finance behind extra confirm |
| Cost runaway | High | Rate limits + spend breaker |
| Stream regressions | Medium | Keep Strict Mode–safe accumulation tests |
| Scope creep to full TORQ platform | Medium | This PRD scope only |
| Capacitor WebView quirks | Medium | Staging device matrix (recent iPhones) |

---

## 16. Open decisions (operator)

| # | Decision | Options | Default in this PRD | Operator choice |
|---|----------|---------|---------------------|-----------------|
| D1 | BFF host | Railway / Vercel / Coolify | Railway | **Approved: Railway** |
| D2 | iOS approach | Capacitor / Expo RN | Capacitor | **Approved: Capacitor** |
| D3 | Auth v1 | Anonymous only / Email | Anonymous + session | **Approved: Anonymous session** |
| D4 | History sync | Device only / Cloud | Device only | **Approved: Device only** |
| D5 | Public web domain | _operator provides_ | — | **Deferred** (use env `PUBLIC_WEB_ORIGIN`) |
| D6 | Bundle ID | e.g. `com.torq.chat` | `com.torq.chat` | **Approved: com.torq.chat** |
| D7 | Monetization v1 | Free / subscription / credits | Free (operator-funded) | **Approved: Free** |
| D8 | Legal/finance consultants in v1 store | Keep / soft-gate / remove | Keep + strong disclaimers | **Approved: Keep + disclaimers** |

---

## 17. Acceptance criteria (release gates)

### 17.1 Web production release
- [ ] Chat works on staging and production without client Anthropic key  
- [ ] Secret scan clean  
- [ ] Privacy + Terms linked  
- [ ] Rate limit returns 429 with clear UI message  
- [ ] Light/dark works  
- [ ] Automated gates green  

### 17.2 iOS TestFlight
- [ ] Build installs on physical device  
- [ ] Chat E2E vs production/staging API  
- [ ] No mic permission prompt  
- [ ] Icons/splash correct  

### 17.3 App Store
- [ ] Metadata complete  
- [ ] Privacy labels match real data flows  
- [ ] Submitted; no reject for secrets or missing privacy policy  

---

## 18. Rollout plan

1. **Staging web** → operator dogfood 48h  
2. **Production web** → soft launch  
3. **TestFlight** internal → external  
4. **App Store** submit  
5. Monitor spend + errors daily first week  

---

## 19. Out-of-scope detail deferred to tech design

The following will be specified in a short **Tech Design** after PRD approval (not blocking PRD approval):

- Exact stream wire format  
- Session token crypto  
- DB migrations  
- Capacitor plugin list  
- CI workflows  

---

## 20. Document control

| Version | Date | Notes |
|---------|------|--------|
| v1 | 2026-08-01 | Initial complete PRD for web + iOS App Store path |

**Approval:**

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Operator | King Flowers | 2026-08-01 | ☑ **Approve** (defaults locked; use subagents for build/review/test/verify) |

---

## 21. Implementation-ready summary (for builders)

**Build order:** Phase 0 decisions → Phase 1 BFF + web de-keying → Phase 2 Capacitor iOS → Phase 3 Store.

**Do not start iOS packaging until Phase 1 exit criteria pass** (otherwise the IPA will still be a secret-leaking wrapper).

**Primary invariant:**  
> No Anthropic (or other LLM provider) secret may exist in any web or iOS client artifact for staging/production.

---

*End of PRD-TORQ-CHAT-WEB-IOS-v1*
