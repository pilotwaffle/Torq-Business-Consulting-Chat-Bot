# App Store Submission Checklist — TORQ Chat

| Field | Value |
|-------|--------|
| **Product** | TORQ Chat |
| **Document** | APP-STORE-SUBMISSION |
| **Phase** | Phase 3 prep (App Store Connect package) |
| **Date** | 2026-08-01 |
| **Bundle ID** | `com.torq.chat` |
| **Platform** | iOS (Capacitor shell over production web origin) |
| **Status** | **Draft package** — do not submit until Phase 1 + Phase 2 exit criteria pass |

> **Invariant:** No Anthropic (or other LLM provider) secret may exist in any web or iOS client artifact. Submit only builds that talk to the TORQ BFF over HTTPS.

---

## 1. App Store Connect — App information

| Field | Value | Notes |
|-------|--------|--------|
| **App name** | TORQ Chat | Max 30 characters. Confirm availability in App Store Connect. |
| **Subtitle** | AI Business Advisors | Max 30 characters. See `STORE-LISTING-COPY.md` for alternates. |
| **Bundle ID** | `com.torq.chat` | Locked in PRD §16 D6. |
| **SKU** | `torq-chat-ios` | Internal; not user-visible. Change if ASC already uses another SKU. |
| **Primary language** | English (U.S.) | |
| **Primary category** | **Business** | Matches multi-consultant SMB / founder positioning. |
| **Secondary category** | **Productivity** | Optional but recommended. |
| **Content rights** | Does not contain third-party content that requires extra licenses beyond model provider ToS | Confirm if marketing assets use stock photography. |
| **Age rating** | See §4 | Business AI chat; no social network, no user-generated public feed. |
| **Pricing** | Free | PRD D7: operator-funded free tier for v1. |
| **Availability** | All territories (default) or operator-selected | Restrict only if legal review requires it. |

### 1.1 URLs (production domain TBD)

Replace `https://YOUR-PRODUCTION-DOMAIN` when `PUBLIC_WEB_ORIGIN` / production host is final (PRD D5 deferred).

| Field | Placeholder URL | Live asset |
|-------|-----------------|------------|
| **Privacy Policy URL** | `https://YOUR-PRODUCTION-DOMAIN/privacy.html` | `public/privacy.html` |
| **Terms of Use (optional in ASC, required in product)** | `https://YOUR-PRODUCTION-DOMAIN/terms.html` | `public/terms.html` |
| **Support URL** | `https://YOUR-PRODUCTION-DOMAIN/support.html` | `public/support.html` |
| **Marketing URL (optional)** | `https://YOUR-PRODUCTION-DOMAIN/` | Main app / landing |

**Before submit:** both Privacy and Support URLs must load over **public HTTPS** without auth walls. Apple rejects missing or offline privacy pages.

---

## 2. Pre-submit gates (must be green)

### 2.1 Product / engineering

- [ ] Phase 1 exit: chat works via BFF only; zero client Anthropic keys  
- [ ] Bundle / IPA secret scan: no `sk-ant`, no `ANTHROPIC_API_KEY`  
- [ ] Phase 2 exit: Capacitor TestFlight install + E2E chat on physical device  
- [ ] No microphone permission prompt (voice realtime disabled)  
- [ ] Icons, splash, safe areas, status bar correct  
- [ ] Privacy Policy, Terms, Support linked in app UI footer  
- [ ] AI / professional-advice disclaimers visible in product  

### 2.2 App Store Connect assets

- [ ] App name + subtitle finalized  
- [ ] Description, keywords, promotional text pasted from `STORE-LISTING-COPY.md`  
- [ ] Privacy Nutrition Labels match `APP-PRIVACY-LABELS.md`  
- [ ] Screenshots for required device sizes (§6)  
- [ ] App icon 1024×1024 (no alpha, no rounded corners baked in)  
- [ ] Review notes completed (§5)  
- [ ] Export compliance answered (§7)  
- [ ] Demo / review access notes completed (§8)  

### 2.3 Legal consistency

- [ ] Privacy labels match real data flow: chat → TORQ BFF → Anthropic  
- [ ] Session / device identifiers disclosed  
- [ ] Tracking = **No** unless analytics/ads are later added with ATT  
- [ ] Disclaimers: not legal/financial/tax/medical advice  

---

## 3. App Privacy (nutrition labels) — summary

Full matrix: **`docs/APP-PRIVACY-LABELS.md`**.

| Topic | Declaration (v1 default) |
|-------|---------------------------|
| **Data collection** | Yes — chat content, identifiers used for session, coarse technical data |
| **Tracking** | **No** (no third-party advertising, no cross-app tracking) |
| **Chat content** | Collected → App Functionality → Linked to user? **No** (anonymous session) → Used for tracking? **No** |
| **Device / session IDs** | Collected → App Functionality → Linked? **No** (or Yes only if later account login) → Tracking? **No** |
| **Diagnostics** | Optional host logs only; declare if retained and product-identifiable |
| **Contact info / Location / Health / Financial accounts** | **Not collected** in v1 |

Chat content is sent to **TORQ BFF**, which may forward prompts/context to **Anthropic** as an AI subprocessor. That is **third-party processing for app functionality**, not “tracking” under Apple’s definition, provided you do not use data for ads or share with data brokers.

---

## 4. Age rating guidance

Use Apple’s age rating questionnaire honestly. Expected pattern for a **business AI chat** app with no UGC social graph:

| Questionnaire theme | Typical answer for TORQ Chat v1 |
|---------------------|----------------------------------|
| Cartoon / fantasy violence | None |
| Realistic violence | None |
| Sexual content / nudity | None |
| Profanity / crude humor | None (model may produce text; no app-directed mature content) |
| Alcohol / tobacco / drugs | None |
| Simulated gambling | None |
| Horror / fear themes | None |
| Medical / treatment info | None as primary purpose (redirect users to professionals) |
| Unrestricted web access | **No** (in-app chat only; no general browser) |
| User-generated content (public) | **No** (private chat with AI; not a social network) |
| Messaging / chat with strangers | **No** (AI assistant, not peer messaging) |
| Contests | No |

**Expected rating:** **4+** (or Apple’s equivalent lowest business-productivity rating), unless questionnaire flags change.

If legal/finance personas remain (PRD D8: keep + strong disclaimers), ensure listing and review notes state **general guidance only**, not regulated advice.

---

## 5. Review notes template (for Apple)

Paste into **App Review Information → Notes**. Adjust domain and build number before submit.

```text
TORQ Chat — App Review Notes
Bundle ID: com.torq.chat
Build: <BUILD_NUMBER>
Version: 1.0.0

WHAT THE APP DOES
TORQ Chat is a multi-consultant AI assistant for business founders and operators.
Users select a specialist persona (strategy, marketing, finance framing, operations,
code, etc.) and chat with streaming replies powered by our backend API, which
calls Anthropic Claude server-side. No login is required for v1.

HOW TO TEST (NO ACCOUNT)
1. Launch the app.
2. An anonymous session is created automatically against the TORQ API over HTTPS.
3. Select any consultant from the sidebar (menu button on iPhone).
4. Send a message such as: "Give me a 3-bullet GTM outline for a B2B SaaS MVP."
5. Observe streaming response, conversation history (device-local), light/dark theme.

DEMO ACCOUNT
None. v1 uses anonymous sessions only — no username/password.
If review needs a fresh session, force-quit and relaunch, or clear app storage.

BACKEND
Production API: https://YOUR-API-HOST (BFF)
Web origin (if hybrid): https://YOUR-PRODUCTION-DOMAIN
Privacy: https://YOUR-PRODUCTION-DOMAIN/privacy.html
Support: https://YOUR-PRODUCTION-DOMAIN/support.html
Terms: https://YOUR-PRODUCTION-DOMAIN/terms.html

AI / PROFESSIONAL DISCLAIMERS
Outputs are general business guidance only — not legal, financial, tax, medical,
or other licensed professional advice. Disclaimers appear in the chat footer and
in Terms of Use.

PERMISSIONS
Microphone: not required (live voice is disabled). Please reject the build if any
unexpected mic prompt appears.
Camera / Photos: only if the user attaches an image via the system picker (optional).
No background location. No tracking / ATT prompt in v1.

ENCRYPTION
Standard HTTPS/TLS only for network transport. No proprietary encryption; export
compliance: exempt under standard HTTPS-only apps (see Export Compliance section).

CONTACT FOR REVIEW
<OPERATOR_EMAIL> — TORQ Business Solutions
```

---

## 6. Screenshots checklist

Capture on **real devices or Xcode simulators** at required resolutions. Use polished empty state + active chat + consultant switcher. Avoid real customer PII in sample chats.

### 6.1 Required size classes (iPhone)

| Display | Typical devices | Portrait size (pts @3x often required) | Required? |
|---------|-----------------|----------------------------------------|-----------|
| **6.7"** | iPhone 15 Pro Max / 14 Pro Max / 16 Plus family | 1290 × 2796 (or current ASC requirement) | **Yes** if supporting latest phones |
| **6.5"** | iPhone 11 Pro Max / XS Max class | 1242 × 2688 | Often still accepted / required set |
| **5.5"** | iPhone 8 Plus class | 1242 × 2208 | Required if you still support that class in ASC |

> Always confirm the **current** App Store Connect media manager sizes — Apple updates required slots. Add iPad screenshots only if the binary is universal / iPad-capable.

### 6.2 Shot list (minimum 3, target 5–8)

| # | Shot | Content |
|---|------|---------|
| 1 | Empty / welcome | TORQ logo, consultant name, starter prompts |
| 2 | Streaming answer | Clear multi-bullet business advice (safe sample text) |
| 3 | Consultant switcher | Sidebar with multiple personas |
| 4 | Dark mode | Same chat in dark theme |
| 5 | History / export (if visible) | Conversation list or export affordance |
| 6 | Disclaimer footer | Privacy · Terms · Support visible if possible |

### 6.3 Production tips

- Prefer **device frames** only if ASC allows; keep text large and readable.  
- Do **not** show API keys, debug URLs, or `localhost`.  
- Align marketing copy with `STORE-LISTING-COPY.md`.  
- Optional: short App Preview video later (not required for v1).

---

## 7. Export compliance (encryption)

| Question (paraphrased) | Answer for TORQ Chat v1 |
|------------------------|-------------------------|
| Does the app use encryption? | **Yes** — HTTPS/TLS only for network communication. |
| Proprietary / non-standard encryption? | **No** |
| Only encryption is HTTPS / OS standard crypto? | **Yes** |
| Exempt from full EAR encryption reporting? | Typically **Yes** for standard HTTPS apps using Apple network APIs / system TLS. |

**In practice:**

1. In Xcode / ASC, answer that the app **uses encryption**.  
2. Select that it is limited to **exempt** uses (HTTPS, authentication over TLS).  
3. You generally do **not** need a separate ERN if you only use standard HTTPS.  
4. Revisit if you later add custom crypto, E2E encryption schemes, or non-TLS tunnels.

Document the final answers chosen at submit time in the release checklist notes.

---

## 8. Demo account note

| Item | Value |
|------|--------|
| **Login required?** | **No** |
| **Auth model** | Anonymous session token from `POST /v1/session` (device/browser storage) |
| **Username / password for Apple** | N/A — leave demo account fields empty; explain in Review Notes |
| **Sign-in required checkbox** | **Unchecked** |
| **If Apple asks for credentials** | Reply: “No account system in v1; open app and chat immediately.” |

History is **device-local** (PRD D4). Reviewers will not see cloud-synced chats.

---

## 9. App Review Information — contact & version

| Field | Placeholder |
|-------|-------------|
| First name | `<OPERATOR_FIRST>` |
| Last name | `<OPERATOR_LAST>` |
| Phone | `<OPERATOR_PHONE>` |
| Email | `<OPERATOR_EMAIL>` |
| Trade representative contact | Same as operator unless entity counsel differs |
| Copyright | `© 2026 TORQ Business Solutions` (confirm legal entity name) |
| Version | `1.0.0` |
| What’s New | See `STORE-LISTING-COPY.md` |

---

## 10. Capabilities & Info.plist accuracy

| Capability | Expected v1 | Action |
|------------|-------------|--------|
| Background Modes | None required | Do not enable unused modes |
| Push Notifications | Not required for v1 | Omit unless implemented |
| App Tracking Transparency | **Not used** | No ATT prompt if no tracking |
| Microphone (`NSMicrophoneUsageDescription`) | **Must not claim** if unused | Remove dead keys (Phase 2 I-xx) |
| Photo Library / Camera | Only if attachments enabled | Accurate usage strings only |
| Local Network | No | |
| Privacy Manifest (PrivacyInfo.xcprivacy) | Required for third-party SDKs as applicable | Align with labels |

---

## 11. Submission day runbook

1. Freeze production BFF + web deploy; verify health endpoints.  
2. Cut release Capacitor build from tagged commit; archive with production origin.  
3. Upload to App Store Connect; wait for processing.  
4. Attach build to version **1.0.0**.  
5. Paste listing copy, keywords, URLs, privacy answers.  
6. Upload screenshots per size class.  
7. Paste Review Notes; confirm **no demo login**.  
8. Answer export compliance.  
9. Submit for Review.  
10. Monitor Resolution Center; respond within 24–48h.  
11. On **Ready for Sale**, announce carefully; watch spend caps and error rates daily for first week (PRD §18).

---

## 12. Common rejection risks & mitigations

| Risk | Mitigation |
|------|------------|
| “Minimum functionality” / thin web wrapper | Native icons/splash, offline history, polished mobile chrome, clear unique value (multi-consultant TORQ product) |
| Missing Privacy Policy | Hosted `privacy.html` HTTPS URL in ASC + in-app link |
| AI medical/legal claims | Disclaimers in UI, Terms, review notes; keep personas “general guidance” |
| Unexpected permission | Strip mic; accurate photo usage only |
| Broken backend during review | Stable production API + spend headroom; avoid cold-start failures |
| Privacy label mismatch | Follow `APP-PRIVACY-LABELS.md` exactly; re-audit if analytics added |
| Login wall with no demo | Anonymous session — document clearly |

---

## 13. Related documents

| Doc | Purpose |
|-----|---------|
| `docs/APP-PRIVACY-LABELS.md` | Full Apple Privacy Nutrition Label matrix |
| `docs/STORE-LISTING-COPY.md` | Title, subtitle, description, keywords, What’s New |
| `docs/PRD-TORQ-CHAT-WEB-IOS-v1.md` | Product authority; phases; D1–D8 decisions |
| `public/privacy.html` | Privacy Policy page |
| `public/terms.html` | Terms of Use page |
| `public/support.html` | Support page (Support URL) |

---

## 14. Document control

| Version | Date | Notes |
|---------|------|--------|
| v1 | 2026-08-01 | Phase 3 prep package; placeholders for production domain and operator contact |
