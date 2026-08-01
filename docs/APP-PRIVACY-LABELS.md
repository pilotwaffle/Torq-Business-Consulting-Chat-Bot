# App Privacy Nutrition Labels — TORQ Chat

| Field | Value |
|-------|--------|
| **Product** | TORQ Chat |
| **Bundle ID** | `com.torq.chat` |
| **Document** | APP-PRIVACY-LABELS |
| **Date** | 2026-08-01 |
| **Applies to** | iOS App Store Connect Privacy questionnaire + Privacy Policy alignment |
| **Status** | **v1 default** — anonymous session, device-local history, no advertising/tracking |

Update this file **before** any release that adds analytics SDKs, accounts/email login, crash reporters that collect device IDs, or ad networks.

---

## 1. Data flow (source of truth)

```text
User device (Web / Capacitor iOS)
  │
  ├─ Device-local conversation history (browser / WebView storage)
  │
  └─ HTTPS ──► TORQ Chat BFF (session + rate limit + proxy)
                  │
                  └─ server-side ──► Anthropic Messages API (model inference)
```

| Principle | Implementation |
|-----------|----------------|
| No provider keys on device | Anthropic key only on BFF |
| Auth v1 | Anonymous session token (`POST /v1/session`) |
| History v1 | Device only (not cloud-synced) |
| Tracking | None by default |
| Monetization | Free (no IAP required for privacy labels in v1) |

---

## 2. Apple “Data Used to Track You”

| Tracking? | Answer |
|-----------|--------|
| **Do you or your third-party partners use data from this app to track users across apps/websites owned by other companies?** | **No** |

**Rationale:** No advertising SDK, no IDFA collection, no ATT, no data broker sharing, no cross-app advertising profiles in v1.

If you later add Meta/Google ads, affiliate pixels, or data brokers → change to **Yes** and complete ATT + tracking disclosures.

---

## 3. Data collection matrix

Apple asks, per data type: **Collected?** → **Purpose(s)** → **Linked to User?** → **Used for Tracking?**

Definitions used here:

- **Linked to User:** Tied to identity (name, email, account). v1 has **no account** → treat as **Not Linked** unless you store a durable personal identifier you associate with a person.
- **Tracking:** Cross-app/site advertising identity (Apple definition). v1 = **No** for all types.

### 3.1 Contact Info

| Data type | Collected? | Purpose | Linked? | Tracking? |
|-----------|------------|---------|---------|-----------|
| Name | No | — | — | — |
| Email Address | No | — | — | — |
| Phone Number | No | — | — | — |
| Physical Address | No | — | — | — |
| Other User Contact Info | No | — | — | — |

> Optional later: magic-link email auth (PRD Phase 4) would add **Email** → Account / App Functionality → Linked: **Yes**.

### 3.2 Health & Fitness

| Data type | Collected? |
|-----------|------------|
| Health / Fitness | **No** |

### 3.3 Financial Info

| Data type | Collected? | Notes |
|-----------|------------|--------|
| Payment Info | No | No IAP / payments in v1 |
| Credit Info | No | |
| Other Financial Info | No | Chat *about* finance is user content (see Other Data), not Apple “Financial Info” account data |

### 3.4 Location

| Data type | Collected? | Notes |
|-----------|------------|--------|
| Precise Location | No | |
| Coarse Location | No (app does not request) | Hosting providers may see IP-derived region for routing/security — declare under **Other Diagnostic Data** or **Coarse Location** only if you retain/process it as product analytics. Default: do not declare Coarse Location if you do not collect it in-app and only rely on standard reverse-proxy logs with short retention. |

### 3.5 Sensitive Info

| Data type | Collected? |
|-----------|------------|
| Sensitive Info | **No** as a product category |

Users may voluntarily type sensitive topics into chat; treat as **User Content** and discourage in Privacy Policy / Terms. Do not solicit protected categories.

### 3.6 Contacts / User Content

| Data type | Collected? | Purpose | Linked? | Tracking? | Notes |
|-----------|------------|---------|---------|-----------|-------|
| Emails or Text Messages | No | — | — | — | Not a peer messenger |
| Photos or Videos | **Optional Yes** if image attach is shipped | App Functionality | No | No | Only when user attaches; sent to BFF → model as needed |
| Audio Data | No | — | — | — | Live voice disabled |
| Gameplay Content | No | — | — | — | |
| Customer Support | **Optional** if users email support | Customer Support | Yes if email used | No | Via support channel, not in-app form necessarily |
| **Other User Content** | **Yes** | **App Functionality** | **No** | **No** | Chat prompts, attachments text, model replies processed to deliver the service |
| Other User Content (on device only) | Stored locally | App Functionality | No | No | Conversation history in local storage |

**Chat content path:** User message → TORQ BFF → Anthropic (subprocessor) → stream back. Not used for advertising.

### 3.7 Browsing History / Search History / Purchases

| Data type | Collected? |
|-----------|------------|
| Browsing History | No |
| Search History | No (in-app consultant search is local UI only; not sold/shared) |
| Purchases | No |

If you log “search queries” server-side later, reclassify under User Content or Search History.

### 3.8 Identifiers

| Data type | Collected? | Purpose | Linked? | Tracking? | Notes |
|-----------|------------|---------|---------|-----------|-------|
| **User ID** | No durable account ID in v1 | — | — | — | |
| **Device ID** | **Yes (session-related)** | App Functionality | **No** | **No** | Short-lived session token / device-scoped id for auth to BFF and rate limiting — not IDFA |
| Advertising Data / IDFA | No | — | — | — | |

Declare **Device ID** (or Apple’s closest identifier type for session tokens) as collected for **App Functionality**. Do **not** mark as tracking.

### 3.9 Usage Data

| Data type | Collected? | Purpose | Linked? | Tracking? | Notes |
|-----------|------------|---------|---------|-----------|-------|
| Product Interaction | Optional | Analytics / App Functionality | No | No | Only if you add first-party product analytics |
| Advertising Data | No | — | — | — | |
| Other Usage Data | Optional | App Functionality | No | No | Rate-limit counters, request counts on BFF |

**v1 default recommendation:** If you only retain operational metrics (request counts, latency, 429s) without building user profiles, either:

- Declare minimal **Product Interaction** / **Other Usage Data** for App Functionality, or  
- Rely on ephemeral server logs with short retention and keep declarations minimal — but stay consistent with Privacy Policy § technical data.

### 3.10 Diagnostics

| Data type | Collected? | Purpose | Linked? | Tracking? | Notes |
|-----------|------------|---------|---------|-----------|-------|
| Crash Data | Optional | App Functionality | No | No | If Capacitor / host crash tools added |
| Performance Data | Optional | App Functionality | No | No | |
| Other Diagnostic Data | Optional | App Functionality | No | No | Server logs: timestamps, status codes, user-agent |

**v1 default:** Hosting/platform logs exist for reliability/security. Declare **Other Diagnostic Data** if retained in a way Apple would consider “collected” by the app developer (not solely Apple’s own OS diagnostics).

### 3.11 Surroundings / Body / Other

| Data type | Collected? |
|-----------|------------|
| Environment Scanning | No |
| Hands / Head | No |
| Other Data Types not listed | Cover chat under **Other User Content**; session under **Device ID** |

---

## 4. Recommended App Store Connect answers (v1 checklist)

Use this as the operator’s ASC fill-in order:

1. **Data Used to Track You:** No types selected.  
2. **Data Linked to You:** None (anonymous v1).  
3. **Data Not Linked to You:**  
   - Other User Content (chat) — App Functionality  
   - Device ID (session) — App Functionality  
   - Photos (only if attach ships) — App Functionality  
   - Other Diagnostic Data (if declaring host logs) — App Functionality  
4. **Third-party partners:** Anthropic processes chat content solely to generate responses (functionality), under TORQ control via BFF — not for tracking.  
5. **Privacy Policy URL:** `https://YOUR-PRODUCTION-DOMAIN/privacy.html`

---

## 5. Purposes glossary (Apple)

| Purpose used in this doc | Meaning for TORQ Chat |
|--------------------------|------------------------|
| **App Functionality** | Deliver chat, sessions, rate limits, model replies, optional attachments |
| **Analytics** | Only if product analytics SDK added |
| **Product Personalization** | Not used in v1 |
| **Developer Advertising / Third-Party Advertising** | Not used in v1 |
| **Other Purposes** | Avoid; prefer explicit purposes |

---

## 6. Subprocessors (disclosure support)

| Party | Role | Data | Tracking? |
|-------|------|------|-----------|
| **TORQ Business Solutions** | App operator / BFF | Session tokens, chat content in transit, operational logs | No |
| **Anthropic** | AI model inference | Prompts / conversation context as needed for completion | No (functionality) |
| **Hosting (e.g. Railway / Vercel / CDN)** | Infrastructure | TLS connection metadata, logs per host policy | No |

List public Privacy Policy URL in product; keep this label doc aligned with `public/privacy.html`.

---

## 7. User controls

| Control | v1 |
|---------|-----|
| Delete on-device history | User can clear site/app data / delete conversations in UI where available |
| Account deletion | N/A (no account) — Phase 4 when email auth ships |
| Opt out of tracking | N/A (no tracking) |
| Support contact | `public/support.html` |

---

## 8. Change log triggers (re-audit required)

Re-open ASC privacy labels and this file when any of the following ship:

- [ ] Email / social login or durable user accounts  
- [ ] Cloud-synced conversation history  
- [ ] Analytics (PostHog, Amplitude, Firebase Analytics, etc.)  
- [ ] Crash reporting with device identifiers (Sentry, etc.)  
- [ ] Advertising or attribution SDKs  
- [ ] Push notifications with device tokens retained  
- [ ] Payments / subscriptions  
- [ ] Additional model providers with different retention  

---

## 9. Related documents

| Doc | Purpose |
|-----|---------|
| `docs/APP-STORE-SUBMISSION.md` | Full submission checklist |
| `docs/STORE-LISTING-COPY.md` | Marketing copy |
| `public/privacy.html` | User-facing Privacy Policy |
| `docs/PRD-TORQ-CHAT-WEB-IOS-v1.md` | Architecture & decisions D1–D8 |

---

## 10. Document control

| Version | Date | Notes |
|---------|------|--------|
| v1 | 2026-08-01 | Phase 3 prep; anonymous session + chat content + no tracking |
