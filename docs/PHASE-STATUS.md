# TORQ Chat — Phase Status

_Last updated: 2026-08-01_

| Phase | Status | Evidence |
|-------|--------|----------|
| **0** Decisions | ✅ | PRD approved |
| **1** BFF + de-keyed web | ✅ Merged | PR #5 |
| **2** Capacitor iOS shell | ✅ Merged | PR #6 |
| **3** App Store package docs | ✅ Merged | PR #6 (`docs/APP-STORE-*`) |
| **4** Hardening | ✅ This change | Budget warn, message caps, scripts, STATE |

## Complete for software delivery (repo)

All PRD software phases that can be finished **without Apple/Mac/Railway credentials** are in `main` after Phase 4 merge.

## Remaining human/ops checklist (App Store live)

| Step | Owner | Status |
|------|--------|--------|
| Railway (or other) BFF deploy + secrets | Operator | ☐ |
| Production HTTPS domain for web + privacy/support URLs | Operator | ☐ |
| Mac: `cap:sync` with prod API URL, Xcode signing | Operator | ☐ |
| TestFlight internal test | Operator | ☐ |
| App Store Connect listing + screenshots | Operator | ☐ |
| Submit for review | Operator | ☐ |

## Docs map
- PRD: `docs/PRD-TORQ-CHAT-WEB-IOS-v1.md`
- iOS: `docs/IOS-SETUP.md`
- Store: `docs/APP-STORE-SUBMISSION.md`, `STORE-LISTING-COPY.md`, `APP-PRIVACY-LABELS.md`
