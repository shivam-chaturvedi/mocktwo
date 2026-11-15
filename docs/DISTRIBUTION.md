# mocktwo — Desktop Distribution, Signing & Notarization Guide

This document defines the production distribution architecture, code signing, Apple Notarization, Windows Authenticode, and automated update pipelines for **mocktwo**.

---

## 1. Distribution Targets

| Platform | Format | Target Architecture | Distribution Channel |
|---|---|---|---|
| **macOS** | Universal DMG & ZIP (`.dmg`, `.zip`) | `arm64` (Apple Silicon) & `x64` (Intel) | Direct Download / Enterprise MDM |
| **Windows** | NSIS Installer (`.exe`) | `x64` | Direct Download / Silent MDM Deployment |
| **Linux** | AppImage & Debian package (`.AppImage`, `.deb`) | `x64` | Developer / Enterprise Linux |

---

## 2. macOS Code Signing & Notarization Pipeline

### 2.1 Apple Hardened Runtime & Entitlements
macOS requires applications to run under the Hardened Runtime (`hardenedRuntime: true`) with explicit security entitlements to pass Gatekeeper and Apple Notary Service.

The entitlements configured in `build/entitlements.mac.plist` are:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <!-- Hardware camera access for real-time optical pulse measurement -->
    <key>com.apple.security.device.camera</key>
    <true/>
    <!-- Hardware microphone access for conversational simulation rehearsals -->
    <key>com.apple.security.device.audio-input</key>
    <true/>
    <!-- V8 JIT compilation in Chromium/Node.js -->
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <!-- Dynamic memory execution for native SQLite bindings (better-sqlite3) -->
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <!-- Strict library validation enforces that all dylibs match team signature -->
    <key>com.apple.security.cs.disable-library-validation</key>
    <false/>
  </dict>
</plist>
```

### 2.2 Environment Variables for macOS Signing & Notarization
To sign and notarize on CI or locally, provide the following environment variables:

```bash
# Apple Developer Certificate (Base64-encoded .p12 certificate)
export CSC_LINK="data:application/x-pkcs12;base64,..."
export CSC_KEY_PASSWORD="your-certificate-password"

# Apple Notarization Credentials (App-Specific Password via appleid.apple.com)
export APPLE_ID="developer@company.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="ABCDE12345"
```

### 2.3 Local Packaged Verification (Without Signing Identity)
During development, unpack and test the packaged bundle without codesigning using:
```bash
# 1. Build frontend bundle
npm run build

# 2. Package into local directory without creating DMG
npx electron-builder --dir --mac
```

### 2.4 Verifying Gatekeeper & Notarization
After generating a signed build on macOS:
```bash
# Verify code signature
codesign -dv --verbose=4 release/mac-arm64/mocktwo.app

# Verify Gatekeeper acceptance
spctl -a -vvv -t install release/mac-arm64/mocktwo.app

# Verify notarization ticket staple
xcrun stapler validate release/mocktwo-1.0.0-arm64.dmg
```

---

## 3. Windows Authenticode & SmartScreen

### 3.1 Code Signing Certificate
Windows binaries (`.exe` installer and packaged binary) must be signed with an Authenticode certificate (EV or standard) to prevent the *"Windows protected your PC"* SmartScreen warning.

Required environment variables for Windows CI:
```bash
# Windows Authenticode Certificate (.pfx file or base64)
export WIN_CSC_LINK="data:application/x-pkcs12;base64,..."
export WIN_CSC_KEY_PASSWORD="your-pfx-password"
```

### 3.2 NSIS Installer Configuration
The installer is configured in `package.json` under `"nsis"`:
- `oneClick: false`: allows the user to select installation directory.
- `allowToChangeInstallationDirectory: true`.
- Automatically installs to `%LOCALAPPDATA%\Programs\mocktwo` (per-user installation, requiring no administrator elevation for install or auto-update).
- Creates Desktop and Start Menu shortcuts with Application User Model ID (`com.mocktwo.desktop`).

---

## 4. Native Dependency Packing (`better-sqlite3`)

Because `better-sqlite3` compiles to a native C++ Node.js addon (`better_sqlite3.node`), it cannot be executed directly from inside a compressed ASAR archive.

`package.json` explicitly unpacks the native module:
```json
"asarUnpack": [
  "**/node_modules/better-sqlite3/**"
]
```
When electron-builder packages the application:
1. `better_sqlite3.node` is extracted to `app.asar.unpacked/node_modules/better-sqlite3/`.
2. The SQLite worker thread (`electron/storage/dbWorker.cjs`) dynamically resolves the unpacked binary at runtime without extraction delays.

---

## 5. Release Checklist

Before tagging and publishing a new release:
1. [ ] Run full test suite: `node --test tests/*.test.ts src/services/*.test.ts`.
2. [ ] Run strict type check: `npx tsc -b`.
3. [ ] Run linter: `npx oxlint src`.
4. [ ] Build application assets: `npm run build`.
5. [ ] Package directory: `npx electron-builder --dir`.
6. [ ] Verify packaged application boots, displays native menu, and records baseline vitals.
7. [ ] Ensure `release/` directory is in `.gitignore` (never commit binary installer outputs).
