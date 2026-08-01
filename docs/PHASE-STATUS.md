# TORQ Chat — Phase Status

_Last updated: 2026-08-01_

| Phase | Status | Notes |
|-------|--------|--------|
| **0** Decisions | ✅ Done | PRD approved; defaults locked |
| **1** BFF + de-keyed web | ✅ Merged | PR #5 → `main` (`557ba10`) |
| **2** Capacitor iOS shell | ✅ This PR | Windows: scaffold + sync; Mac: Xcode/TestFlight |
| **3** App Store package | ✅ This PR | Docs + listing + privacy labels + support page |
| **4** Hardening / growth | 🟡 Partial | Deploy scaffold done; email auth / cloud history deferred |

## Operator still required (cannot automate from Windows)

1. **Host BFF** on Railway (use `server/Dockerfile` + env vars).
2. **Set production domain** → fill URL placeholders in App Store docs.
3. **Mac**: `VITE_TORQ_API_BASE=https://… npm run cap:sync` → Xcode sign → TestFlight → App Store Connect submit.
4. **Apple Developer Program** account + App Store Connect listing upload.

## Gates green (local)

- Client: `tsc` + 115 tests + build  
- Server: 12 tests + build  
- Client dist: no `sk-ant`
