# TORQ Chat — iOS Setup (Phase 2)

This guide covers packaging the Vite web app with **Capacitor 8** for iOS (bundle id `com.torq.chat`, display name **TORQ Chat**).

> **Windows note:** `npx cap add ios` **can** scaffold the `ios/` Xcode project on Windows (this repo includes that scaffold). **Building, signing, Simulator, CocoaPods (if used), Archive, and TestFlight still require macOS + Xcode.** `npx cap doctor` will report `Xcode is not installed` on Windows — expected.

---

## Architecture (security)

```
iOS WKWebView (packaged dist)  →  TORQ BFF (HTTPS)  →  Anthropic API
     VITE_TORQ_API_BASE only         holds ANTHROPIC_API_KEY
```

- **Never** embed `ANTHROPIC_API_KEY` (or any `VITE_`-prefixed Anthropic secret) in the client or iOS binary.
- Production/staging builds set **`VITE_TORQ_API_BASE`** to the public BFF URL before `npm run build` / `npm run cap:sync`.
- The app uses session tokens from `POST /v1/session` only.

---

## Prerequisites (Mac)

| Tool | Notes |
|------|--------|
| macOS | Recent stable |
| Xcode 15+ | App Store; open once to accept license |
| Xcode Command Line Tools | `xcode-select --install` |
| Node.js 18+ | Match CI / local web toolchain |
| Apple Developer account | For device install, TestFlight, App Store |
| CocoaPods | Only if you add Cordova/legacy pods; Capacitor 8 plugins use **Swift Package Manager** by default |

---

## One-time / sync workflow

From repo root `torq-chatbot`:

```bash
npm install

# Set BFF URL for the environment you are packaging (required for device/TestFlight)
export VITE_TORQ_API_BASE=https://your-bff.example.com

npm run build

# Create the native iOS project only if ios/ is missing
npx cap add ios   # or: npm run cap:add:ios

# Sync web assets + plugins into ios/
npm run cap:sync

# Open in Xcode (Mac only)
npm run cap:ios
# equivalent: npx cap open ios
```

### Dependencies (SPM vs CocoaPods)

Capacitor 8 for this project registers plugins via **Swift Package Manager** (`ios/App/CapApp-SPM/Package.swift`). Xcode resolves packages on first open.

If you later add plugins that require CocoaPods:

```bash
cd ios/App
pod install
cd ../..
# then open ios/App/App.xcworkspace instead of .xcodeproj
```

For the default SPM setup, open the project from `npx cap open ios` (Xcode handles SPM).

---

## Environment for production / staging builds

Client-only env (safe in bundle):

```bash
# Staging example
export VITE_TORQ_API_BASE=https://torq-chat-bff-staging.example.com

# Production example
export VITE_TORQ_API_BASE=https://torq-chat-bff.example.com

npm run cap:sync
```

On Windows (PowerShell):

```powershell
$env:VITE_TORQ_API_BASE = "https://torq-chat-bff.example.com"
npm run cap:sync
```

Do **not** set Anthropic keys in any Vite env file used for the client.

See root `.env.example` for the template.

---

## Xcode configuration

1. Open the iOS app via `npm run cap:ios` (Mac).
2. Select target **App** → **Signing & Capabilities**:
   - Team: your Apple Developer team
   - Bundle Identifier: **`com.torq.chat`** (matches `capacitor.config.ts` `appId` and `PRODUCT_BUNDLE_IDENTIFIER`)
3. Deployment target: **iOS 15.0** (current Capacitor scaffold).
4. Display name: **TORQ Chat** (`CFBundleDisplayName` in `Info.plist` / `appName` in Capacitor config).

### App icons

Source artwork in the repo:

- `public/torq-chat-logo.jpg` — primary marketing / App Store source
- `public/torq-icon.jpg` — alternate square mark
- `public/favicon.jpg` — web favicon

Generate the full App Icon set (1024×1024 master + all slot sizes) with:

- [App Icon Generator](https://www.appicon.co/) / Xcode Asset Catalog, or
- `npx @capacitor/assets generate` (optional; add `@capacitor/assets` if you adopt it)

Place generated icons in:

```text
ios/App/App/Assets.xcassets/AppIcon.appiconset/
```

Splash uses Capacitor Splash Screen (`backgroundColor: #2B2D42` in `capacitor.config.ts`). Launch storyboard assets live under `Splash.imageset`.

---

## Info.plist / privacy notes

Path when scaffold exists: `ios/App/App/Info.plist`  
Additional notes: [`docs/ios/Info.plist.notes.md`](ios/Info.plist.notes.md)

### Microphone

TORQ Chat **does not** use the microphone in Phase 2.

- Do **not** add `NSMicrophoneUsageDescription` unless a future feature needs mic access.
- The generated `Info.plist` intentionally has **no** mic usage string.
- Web metadata `requestFramePermissions` is empty (no microphone claim).

### Other usage strings (only if you add features later)

| Key | When required |
|-----|----------------|
| `NSCameraUsageDescription` | Camera capture |
| `NSPhotoLibraryUsageDescription` | Photo library |
| `NSMicrophoneUsageDescription` | Voice input / recording |

### App Transport Security (ATS)

- **Production:** call BFF over **HTTPS** only. No ATS exceptions needed.
- **Debug / local BFF only:** if you must hit `http://localhost:8787` from a Simulator build, you may temporarily allow local networking. **Do not ship** cleartext ATS exceptions to the App Store.

Example debug-only exception (**not for release**):

```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsLocalNetworking</key>
  <true/>
</dict>
```

Prefer pointing Simulator/device builds at a staging HTTPS BFF.

### Capacitor config reference

```text
capacitor.config.ts
  appId: com.torq.chat
  appName: TORQ Chat
  webDir: dist
  ios.contentInset: automatic
  plugins.SplashScreen / StatusBar
```

Native bootstrap: `native.ts` (StatusBar, Keyboard resize + accessory bar, App, SplashScreen) — loaded only on native platforms via dynamic import from `index.tsx`.

Safe-area CSS: `index.css` uses `env(safe-area-inset-*)`; viewport uses `viewport-fit=cover` in `index.html`.

---

## Privacy Nutrition Labels (App Store Connect summary)

Complete labels based on actual data flows when submitting. Expected starting point for TORQ Chat:

| Category | Likely collection | Notes |
|----------|-------------------|--------|
| Contact Info | No (unless you add accounts later) | — |
| Health & Fitness | No | — |
| Financial Info | Possibly “Other Financial Info” if users paste financial content into chat | User-generated content sent to BFF/LLM |
| Location | No | — |
| Sensitive Info | Possibly if users type it | Treat chat content carefully in privacy policy |
| Contacts | No | — |
| User Content | Yes — chat messages | Processed by BFF → model provider |
| Browsing History | No | — |
| Identifiers | Possibly device/session identifiers | Session token storage; no third-party ad ID intended |
| Usage Data | Optional diagnostics | Only if you add analytics (none in Phase 2 by default) |
| Diagnostics | Optional | Crash reporting if enabled later |

Link in-app / App Store privacy policy to the hosted `/privacy.html` (or production URL). Terms: `/terms.html`.

**Data not used for tracking** (default product intent): no advertising SDKs in Phase 2.

---

## TestFlight

1. In Xcode: Product → Archive.
2. Distribute App → App Store Connect → Upload.
3. In [App Store Connect](https://appstoreconnect.apple.com/):
   - Create app record if needed (`com.torq.chat`)
   - Complete Privacy Nutrition Labels + privacy policy URL
   - Add build to TestFlight internal/external group
4. Install via TestFlight on device and verify:
   - Splash / status bar
   - Safe areas on notched devices
   - Keyboard does not cover composer
   - Chat streams against production/staging BFF (`VITE_TORQ_API_BASE`)
   - No mic permission prompt

---

## Day-to-day web → iOS sync

After any web change:

```bash
# Set VITE_TORQ_API_BASE for the target environment first
npm run cap:sync
npm run cap:ios   # optional: reopen Xcode (Mac)
```

`cap:sync` = `npm run build && npx cap sync`.

---

## Windows developer workflow

On Windows you **can**:

- Edit React/TS/CSS, Capacitor config, docs
- `npm install` / `npm test` / `npm run build`
- `npx cap add ios` / `npm run cap:sync` (scaffold + copy web assets)
- Prepare icons under `public/`

On Windows you **cannot**:

- Open Xcode, run Simulator, sign, Archive, or upload to TestFlight
- Fully resolve Xcode SPM packages without Xcode

Hand off to a Mac (or GitHub Actions `macos-*` runner) for Archive / TestFlight.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Blank WebView | Ensure `webDir` is `dist` and you ran `cap sync` after build |
| API failures | Check `VITE_TORQ_API_BASE` baked into the last build; rebuild + sync |
| CSP / connect blocked | Production CSP allows `https:`; localhost is for dev BFF |
| `cap doctor`: Xcode not installed | Expected on Windows; use a Mac for native build |
| SPM package resolve fails | Open project in Xcode on Mac; File → Packages → Resolve |
| Signing errors | Fix Team + unique bundle id `com.torq.chat` |
| Mic permission appears | Remove any accidental `NSMicrophoneUsageDescription` |

---

## Related files

| Path | Role |
|------|------|
| `capacitor.config.ts` | App id, name, plugins |
| `native.ts` | Native plugin init |
| `index.css` | Safe-area insets |
| `index.html` | `viewport-fit=cover`, CSP |
| `metadata.json` | No microphone permission claims |
| `ios/App/App/Info.plist` | Display name; no mic usage string |
| `public/torq-chat-logo.jpg` | Icon source |
| `.env.example` | `VITE_TORQ_API_BASE` only for client |

---

*Phase 2 — Capacitor iOS packaging. Last updated: 2026-08-01*
