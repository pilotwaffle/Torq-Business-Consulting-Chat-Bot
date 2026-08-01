# iOS Info.plist notes (TORQ Chat)

These notes apply once `ios/` exists (created on macOS via `npx cap add ios`).

## Bundle / display

| Setting | Value |
|---------|--------|
| Bundle ID | `com.torq.chat` |
| Display name | TORQ Chat |
| Source of truth | `capacitor.config.ts` (`appId` / `appName`) |

## Do not add (Phase 2)

```xml
<!-- NOT required — app does not use microphone -->
<key>NSMicrophoneUsageDescription</key>
```

Also omit camera / photo library keys unless a future feature needs them.

## ATS (production)

No exceptions. BFF must be HTTPS via `VITE_TORQ_API_BASE`.

## ATS (debug / Simulator → local BFF only)

Optional, **do not ship**:

```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsLocalNetworking</key>
  <true/>
</dict>
```

Prefer a staging HTTPS BFF for device testing.

## Privacy strings to keep accurate

If Capacitor or plugins inject usage descriptions you do not need, remove them before App Store submission so the binary matches Privacy Nutrition Labels and `docs/IOS-SETUP.md`.
