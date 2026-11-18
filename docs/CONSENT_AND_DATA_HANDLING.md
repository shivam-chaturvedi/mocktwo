# Privacy, Consent, and Data Handling Audit

> **mocktwo (Hotel Coach)** — Formal Privacy & Technical Data Flow Verification  
> Prepared for the Presage SmartSpectra SDK Challenge.

---

## 1. Executive Summary

mocktwo is designed around an **on-device first, privacy-by-architecture** model. The application processes sensitive optical facial signals for physiological composure tracking during high-stakes conversational rehearsals.

| Question | Audit Result | Evidence in Source Code |
| :--- | :---: | :--- |
| **Do raw camera frames leave the user's device for vitals analysis?** | **NO** | `SmartSpectraSDK` processes optical video in local RAM via native C-API (`libsmartspectra_capi.dylib`). rPPG frames are never transmitted over the network or saved to disk. |
| **Is video recorded locally on disk?** | **YES (Optional / Local Only)** | When session recording is active, the Canvas Stage Compositor writes 720p WebM files directly to `~/Library/Application Support/mocktwo/recordings/` on macOS. |
| **Are biometric measurements transmitted to the cloud?** | **NO** | Pulse, HRV, breathing rate, and facial metrics are stored exclusively in the local SQLite database (`recordings` and `vitals_samples` tables). |
| **What third-party cloud services are invoked?** | **Tavus CVI & Daily WebRTC** | Tavus provides the interactive AI conversational video counterpart over Daily WebRTC. User camera video/audio needed for the conversational call is sent directly to Daily/Tavus. SmartSpectra vitals telemetry is **never sent to Tavus**. |
| **Are API keys and secrets protected?** | **YES** | `TAVUS_API_KEY` and `SMARTSPECTRA_API_KEY` reside exclusively in the Electron main process (`process.env`). All network logs automatically redact tokens and keys using regex masks. |
| **Is medical diagnosis claimed?** | **NO** | Explicit disclaimers throughout the UI and database state that mocktwo is an educational and wellness coaching indicator, not a diagnostic medical evaluation. |

---

## 2. Sensor Permissions & Hardware Lifecycle

### 2.1 Explicit Permission Flow
1. **Operating System Gate**:
   - On macOS, Electron triggers native TCC dialogs via `Info.plist` strings:
     - `NSCameraUsageDescription`: *"mocktwo uses your camera to measure optical blood volume pulse locally in real time using Presage SmartSpectra, and to stream video to interactive AI personas during live rehearsal calls. Physiological video is analyzed in local memory."*
     - `NSMicrophoneUsageDescription`: *"mocktwo uses your microphone for real-time speech during live AI rehearsals and for local conversational speech pacing analysis."*
2. **In-App Device Selection & Probe**:
   - Implemented in [src/hooks/useMediaDevices.ts](file:///Users/shivam/work/hotel-coach/src/hooks/useMediaDevices.ts).
   - Queries `navigator.mediaDevices.enumerateDevices()` to inspect available hardware without activating sensor streams prematurely.
3. **True Hardware Track Release**:
   - Implemented in [src/utils/mediaLifecycle.ts](file:///Users/shivam/work/hotel-coach/src/utils/mediaLifecycle.ts) and verified by `tests/mediaLifecycle.test.ts`.
   - When the user clicks "Video Off", the application calls `track.stop()` and sets `userStream = null`, physically turning off the MacBook camera LED indicator. The system never merely hides a video element while keeping the hardware stream running.
4. **Camera Off Warning Modal**:
   - If the user turns off the camera during a live rehearsal, [src/components/common/CameraOffWarningModal.tsx](file:///Users/shivam/work/hotel-coach/src/components/common/CameraOffWarningModal.tsx) alerts them that optical vitals tracking is paused while the conversational rehearsal continues.

---

## 3. Data Flow & Boundary Analysis

```
[User Camera / Mic]
         │
         ├───> [SmartSpectra Native C-API (In-Memory FFI)]
         │           │
         │           └───> [Local Protobuf Metric Decode]
         │                       │
         │                       └───> [Local SQLite DB (vitals_samples)]
         │                             (NO external upload)
         │
         ├───> [Canvas Stage Compositor (1280x720)]
         │           │
         │           └───> [Local WebM Video File (Disk Only)]
         │
         └───> [Daily WebRTC / Tavus CVI Connection]
                     │
                     └───> [Remote Interactive AI Persona Video/Audio]
                           (Encrypted WebRTC media stream)
```

### 3.1 Presage SmartSpectra SDK
- **Telemetry Configuration**: In [src/services/vitals/presageSession.ts](file:///Users/shivam/work/hotel-coach/src/services/vitals/presageSession.ts#L103), `enableTelemetry: false` is explicitly set on `SmartSpectraSDK`, ensuring zero diagnostic or optical payload transmission to Presage servers.
- **Protobuf Memory Handling**: Protobuf buffers from the C-API are decoded via `decodeMetrics()` in the renderer process and mapped to numeric arrays.

### 3.2 Tavus Conversational Video Interface (CVI)
- **What Tavus Receives**: The user's live WebRTC audio and video stream is sent to Daily/Tavus so the AI persona can listen, transcribe, and respond in real time.
- **What Tavus Does NOT Receive**: Tavus receives **zero physiological telemetry**. No pulse, HRV, breathing rate, or composure scores are ever transmitted to Tavus.
- **Readiness Gate**: In [src/screens/LiveSimulationScreen.tsx](file:///Users/shivam/work/hotel-coach/src/screens/LiveSimulationScreen.tsx), the application enforces a strict readiness gate. No Tavus conversation is instantiated until the user explicitly confirms scenario briefing, audio/video checks, and hardware calibration. Every exit path (hangup, cancel, timeout, error) explicitly triggers `endConversation()`.

---

## 4. Local Database Storage & Retention

All data is stored locally in SQLite (`better-sqlite3`) in the user's application data directory (`~/Library/Application Support/mocktwo/mocktwo.db` on macOS).

### Tables & Data Contents:
1. `profiles`: Local user profile (name, practice goals, average composure score).
2. `baselines`: 60-second resting calibration records (resting pulse, resting HRV, quality score, calibration timestamp).
3. `baseline_samples`: Second-by-second resting calibration vitals points for baseline verification.
4. `recordings`: Metadata for practice sessions (scenario ID, duration, composure score, avg pulse, peak pulse, recovery seconds, nervousness level, local video path).
5. `vitals_samples`: Millisecond-indexed telemetry points during rehearsals (`pulse_bpm`, `hrv_rmssd`, `breathing_rate`, `confidence`, `is_clean`).
6. `transcript_segments`: Diarized session dialogue text with millisecond start/end timestamps and speaker tags (`persona` vs `user`).
7. `recording_notes`: User-authored timestamped notes on recordings.

### Data Deletion Controls:
- Users can delete any individual recording directly from the Recordings screen (`RecordingsScreen.tsx`). Deletion executes a cascading removal: the video file is unlinked from disk, and all associated rows in `recordings`, `vitals_samples`, and `transcript_segments` are dropped from SQLite.
- Clearing the baseline in settings drops all baseline records and resets calibration state to uncalibrated.

---

## 5. Security & Secret Protection

1. **Secret Isolation**:
   - `TAVUS_API_KEY` and `SMARTSPECTRA_API_KEY` are stored in the root `.env` file and loaded exclusively in the Node.js main process.
   - The preload script (`electron/preload.cjs`) exposes only safe wrapper methods (`getPresageConfig()`, `createConversation()`) via `contextBridge`. Secrets are never passed to the frontend JavaScript runtime.
2. **Secret Redaction**:
   - `electron/tavus/tavusClient.cjs` enforces automated regex redaction on all logging output:
     ```js
     str.replace(/tvsk_[a-zA-Z0-9_-]+/g, "tvsk_***REDACTED***")
        .replace(/(x-api-key\s*[:=]\s*)[^\s,]+/gi, "$1***REDACTED***")
        .replace(/(authorization\s*[:=]\s*Bearer\s+)[^\s,]+/gi, "$1***REDACTED***");
     ```
3. **Content Security Policy (CSP)**:
   - Configured in `electron/main.cjs` to restrict script execution strictly to local application bundles and trusted Daily/Tavus WebRTC domains.

---

## 6. Regulatory & Ethical Compliance

- **No Medical Claims**: mocktwo explicitly displays wellness indicators. It does not diagnose, treat, or monitor cardiac arrhythmias, hypertension, or medical distress.
- **Consensual Training**: Rehearsals are strictly user-initiated. No covert, continuous, or unannounced background employee monitoring occurs.
- **GDPR & Privacy Alignment**: Data minimization is respected—raw optical frames are discarded immediately after in-memory feature extraction.
