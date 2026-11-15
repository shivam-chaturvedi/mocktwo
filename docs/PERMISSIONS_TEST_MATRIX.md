# mocktwo — Permissions Test Matrix & Hardware Verification Guide

This document defines the comprehensive permissions test matrix for **mocktwo** across macOS and Windows desktop environments. It details manual verification procedures, expected operating system behavior, Just-In-Time (JIT) permission triggers, and error recovery flows.

---

## 1. Operating System Permission Architecture

| Platform | Permission Model | Detection API | Prompt Mechanism | Settings Deep Link |
|---|---|---|---|---|
| **macOS** | Apple Transparency, Consent, and Control (TCC) | `systemPreferences.getMediaAccessStatus('camera' \| 'microphone')` | `systemPreferences.askForMediaAccess('camera' \| 'microphone')` | `x-apple.systempreferences:com.apple.preference.security?Privacy_Camera`<br>`x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone` |
| **Windows** | Windows Privacy Settings (WinRT / UWP Capability) | Capability probing & `getUserMedia` mapping | Native OS prompt on `getUserMedia` invocation | `ms-settings:privacy-webcam`<br>`ms-settings:privacy-microphone` |
| **Linux** | Device Nodes (`/dev/video*`, PulseAudio/ALSA/PipeWire) | Device node readability & `getUserMedia` mapping | Browser/Chromium permission bubble | Browser/System Control Center |

---

## 2. Invariant Security & Privacy Rules

1. **Camera-Only at Baseline:**
   - Calm Baseline calibration (`BaselineSheet.tsx`) and Welcome card baseline CTA request **Camera ONLY**.
   - Under no circumstances is Microphone permission queried or requested during Baseline calibration.

2. **Camera + Microphone at Rehearsal Start:**
   - Rehearsal simulation (`BriefingSheet.tsx`, `QuickPracticeModal.tsx`) requires both Camera and Microphone.
   - Permissions are queried only when the user clicks **Start Session** (Just-In-Time).
   - If either device access was denied, the session does not start and an in-sheet recovery banner is displayed.

3. **No Hardware Enumeration or Streams Without Permission:**
   - In Preferences (`SettingsModal.tsx > Audio, Video & Sensors`), device labels are not enumerated and camera preview is not started until permission is in the `granted` state.
   - If `not-determined`, a calm `PermissionPrompt` card is rendered.
   - If `denied`, an explanation with an "Open System Settings" button is displayed.

4. **Dynamic Recovery on Window Focus:**
   - When the user switches to System Settings, toggles the camera or microphone permission, and returns to mocktwo, `browser-window-focus` automatically re-queries OS status and notifies the renderer via `permissions:updated`.
   - The UI unblocks immediately without requiring an application restart.

---

## 3. Manual Test Matrix

### Test Case M-01: First-Time Camera Access (Calm Baseline)
- **Preconditions:** macOS TCC or Windows permission reset: `tccutil reset Camera com.mocktwo.desktop` (or running in dev).
- **Steps:**
  1. Launch mocktwo.
  2. Click **Set calm baseline (60s)** on Home screen or Welcome banner.
  3. Click **Start Calibration**.
- **Expected Result:**
  - OS displays native permission prompt: *"mocktwo would like to access the camera"*.
  - Prompt text accurately explains biometric pulse estimation without recording.
  - Clicking **Allow** transitions to the 3-second countdown and begins optical pulse calibration.
  - Microphone access is NOT requested.

### Test Case M-02: Camera Access Denied (Calm Baseline Recovery)
- **Preconditions:** Camera reset or previously denied.
- **Steps:**
  1. Click **Set calm baseline (60s)**.
  2. Click **Start Calibration**.
  3. When OS prompts, click **Don't Allow** (or toggle off in System Settings).
- **Expected Result:**
  - `BaselineSheet` displays `permission-denied` view.
  - A primary button **Open System Settings** appears.
  - Clicking **Open System Settings** opens macOS `Privacy_Camera` pane or Windows `ms-settings:privacy-webcam`.
  - Toggling permission to ON in System Settings and clicking back into mocktwo immediately refreshes status.

### Test Case M-03: Rehearsal Start (Camera + Microphone JIT Prompt)
- **Preconditions:** Fresh install or reset TCC (`tccutil reset Microphone com.mocktwo.desktop`).
- **Steps:**
  1. Navigate to Scenarios.
  2. Click **Practice** on any scenario to open `BriefingSheet`.
  3. Click **Start Session**.
- **Expected Result:**
  - JIT permission engine requests Camera and Microphone sequentially.
  - If both granted, countdown begins and transitions to `LiveSimulationScreen`.
  - Audio chunk recording starts via background worker into `<userData>/recordings/<sessionId>.partial`.

### Test Case M-04: Microphone Denied During Rehearsal Start
- **Preconditions:** Microphone set to Denied in System Settings.
- **Steps:**
  1. Open `BriefingSheet` on any scenario.
  2. Click **Start Session**.
- **Expected Result:**
  - Countdown does NOT start.
  - Simulation does NOT launch.
  - Red recovery alert appears in sheet footer: *"Microphone access was declined. Enable microphone in System Settings to start rehearsal."*
  - Button **Open Settings** links directly to OS microphone privacy pane.

### Test Case M-05: Preferences Hardware Shielding
- **Preconditions:** Reset camera and microphone permissions.
- **Steps:**
  1. Open Settings (`Cmd+,` or menu).
  2. Select **Audio, Video & Sensors** tab.
- **Expected Result:**
  - Device labels are not enumerated.
  - No active camera stream is opened.
  - `PermissionPrompt` card is shown: *"Allow camera access: mocktwo uses your camera locally..."* with an **Allow Camera** CTA button.
  - Clicking **Allow Camera** prompts the OS, transitions to `granted`, and reveals the device selector dropdown.

### Test Case M-06: Privacy & Data Center Inspection & Data Wipe
- **Steps:**
  1. Open Settings (`Cmd+,`).
  2. Click **Privacy & Data** tab.
  3. Verify status badges for Camera and Microphone (`Allowed` / `Turned off` / `Not configured`).
  4. Click **Reveal Logs**: verifies Finder/Explorer opens `<userData>/logs/`.
  5. Click **Clear All Data…**: verifies confirmation modal appears with danger styling.
  6. Click **Yes, Erase Everything**: verifies SQLite tables are truncated, VACUUM runs, localStorage is cleared, and application reloads cleanly with zero mock/residual data.

---

## 4. Automation & CLI Validation Commands

```bash
# Reset camera permission on macOS (Development & Production)
tccutil reset Camera com.mocktwo.desktop
tccutil reset Camera node

# Reset microphone permission on macOS
tccutil reset Microphone com.mocktwo.desktop
tccutil reset Microphone node

# Check macOS TCC database status (requires Full Disk Access in terminal)
sqlite3 ~/Library/Application\ Support/com.apple.TCC/TCC.db \
  "SELECT client, service, auth_value FROM access WHERE client LIKE '%mocktwo%';"

# Run Permissions Unit Tests
node --test tests/permissionsService.test.ts
```
