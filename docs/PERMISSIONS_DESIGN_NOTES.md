# Permissions & Platform Security Design Notes
**Target Engine:** Electron 45.3.1 (Chromium 134+, Node.js 22+)  
**Platforms:** macOS (Darwin / Apple Silicon & Intel), Windows (win32 x64), Linux (safe non-crashing fallback)  
**Date:** November 15, 2026  

---

## 1. Electron APIs & Method Signatures (Electron 45.x)

### 1.1 `systemPreferences`
- **Docs:** https://www.electronjs.org/docs/latest/api/system-preferences
- **`systemPreferences.getMediaAccessStatus(mediaType)`**:
  - `mediaType`: `'microphone' | 'camera' | 'screen'`
  - **macOS & Windows:** Supported on macOS (10.14+) and Windows (10 1903+).
  - Returns: `'not-determined' | 'granted' | 'denied' | 'restricted' | 'unknown'`.
  - On Linux: Returns `'unknown'` or undefined depending on build; code must handle gracefully and never throw.
- **`systemPreferences.askForMediaAccess(mediaType)`**:
  - `mediaType`: `'microphone' | 'camera'`
  - **macOS only**: Returns `Promise<boolean>`.
  - Invariant: Only invokes native TCC dialog when status is `'not-determined'`. When status is `'denied'` or `'restricted'`, OS suppresses prompt immediately; do NOT call repeatedly.
  - On Windows & Linux: This method does NOT exist. On Windows, permissions for unpackaged desktop apps are governed by OS settings (`Settings > Privacy & security > Camera/Microphone`). Renderer `navigator.mediaDevices.getUserMedia` triggers device access or throws `NotAllowedError`.

### 1.2 `session` Permission Handlers
- **Docs:** https://www.electronjs.org/docs/latest/api/session
- **`session.setPermissionRequestHandler(handler)`**:
  - `handler(webContents, permission, callback, details)`:
    - `permission`: `'media'` (camera, microphone), `'notifications'`, `'geolocation'`, `'clipboard-read'`, etc.
    - `details.mediaTypes`: Array of requested media types, e.g. `['video']` or `['video', 'audio']`.
    - `details.requestingUrl`: URL requesting access.
  - Rule: Only grant if `permission === 'media'` AND requesting URL matches application origin (e.g., `file://` or trusted dev URL `http://127.0.0.1:5173`). Explicitly deny all other permissions (`notifications`, `geolocation`, `midi`, `hid`, `serial`, `usb`).
- **`session.setPermissionCheckHandler(handler)`**:
  - `handler(webContents, permission, requestingOrigin, details)`:
    - Returns synchronous `boolean`.
    - Enforce same origin and media type validation.

### 1.3 `webContents` Lifecycle & Crash Events
- **Docs:** https://www.electronjs.org/docs/latest/api/web-contents
- **`render-process-gone`**:
  - `(event, details)`: `details.reason`: `'clean-exit' | 'abnormal-exit' | 'killed' | 'crashed' | 'oom' | 'launch-failed' | 'integrity-failure'`.
  - Action: Log error, display calm native recovery dialog with `dialog.showMessageBox`, allow user to reload window or quit. Cap reloads at 3 per minute.
- **`unresponsive` / `responsive`**:
  - Emitted when renderer hangs or resumes responding. Log event; avoid premature crash termination.
- **`did-fail-load`**:
  - `(event, errorCode, errorDescription, validatedURL, isMainFrame)`:
    - Handles dev server cold-boot network disconnects or packaging path errors.

### 1.4 `Menu`, `dialog`, and `safeStorage`
- **Docs:**
  - Menu: https://www.electronjs.org/docs/latest/api/menu
  - Dialog: https://www.electronjs.org/docs/latest/api/dialog
  - SafeStorage: https://www.electronjs.org/docs/latest/api/safe-storage
- **Standard Roles:** Use standard OS roles (`about`, `hide`, `quit`, `undo`, `redo`, `cut`, `copy`, `paste`, `selectAll`) so native text controls maintain standard macOS/Windows hotkey behaviors.
- **Preferences Accelerator:** `CmdOrCtrl+,` bound in menu to trigger `'open-settings'` via IPC bridge.
- **Dialog Concurrency:** Native `dialog.showSaveDialog` must be guarded against concurrent invocations in main process.

---

## 2. Platform Specifics: macOS

### 2.1 Info.plist Keys (TCC Usage Descriptions)
- **Docs:** https://developer.apple.com/documentation/bundleresources/information_property_list
- Must exist in bundled `.app/Contents/Info.plist` (configured via `package.json` -> `build.mac.extendInfo`):
  - `NSCameraUsageDescription`: Accurate description of pulse rate, breathing, and HRV measurements via camera.
  - `NSMicrophoneUsageDescription`: Accurate description of rehearsal session audio capture.
  - Omission causes immediate `SIGABRT` upon calling `getUserMedia`.

### 2.2 Hardened Runtime & Entitlements
- **Docs:** https://developer.apple.com/documentation/security/hardened_runtime
- Entitlements file for macOS:
  - `com.apple.security.device.camera`: Mandatory for camera access under Hardened Runtime.
  - `com.apple.security.device.audio-input`: Mandatory for microphone input.
  - `com.apple.security.cs.allow-jit`: Required for V8 JIT compiler.
  - `com.apple.security.cs.allow-unsigned-executable-memory`: Required for Electron/Node.js native runtime.
  - Sandboxing (`com.apple.security.app-sandbox`): Not required for direct notarized distribution; omit to avoid file quarantine and security-scoped bookmark overhead.

### 2.3 System Settings Deep Links
- Camera: `x-apple.systempreferences:com.apple.preference.security?Privacy_Camera`
- Microphone: `x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone`

---

## 3. Platform Specifics: Windows

### 3.1 Windows 10/11 Privacy Settings & URI Schemes
- **Docs:** https://learn.microsoft.com/en-us/windows/uwp/launch-resume/launch-settings-app
- Windows controls camera and microphone access at the system and per-category level under `Settings > Privacy & security`.
- Direct URI Schemes:
  - Camera: `ms-settings:privacy-webcam`
  - Microphone: `ms-settings:privacy-microphone`
- Shell execution: `shell.openExternal('ms-settings:privacy-webcam')`.

### 3.2 Error Mapping in Renderer
When camera or microphone access is blocked by Windows privacy settings or device busy state:
- `NotAllowedError`: User or Windows Privacy Settings blocked desktop app camera/mic.
- `NotFoundError`: No camera/mic hardware detected.
- `NotReadableError`: Hardware camera in use by another application (e.g. Zoom, Teams).
- `OverconstrainedError`: Hardware cannot satisfy resolution/framerate constraints.

---

## 4. Linux Fallback Behavior
- Return `'unknown'` from status queries; avoid calling missing macOS/Windows APIs.
- Allow `getUserMedia` to execute; map errors into identical UI states (denied, no-device, device-busy).
- `open-system-settings` returns `false`; UI renders friendly manual configuration instructions.
