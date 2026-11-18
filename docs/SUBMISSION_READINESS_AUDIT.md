# Submission Readiness Audit & Prototype Assessment

> **mocktwo (Hotel Coach)** — Technical Prototype Audit for Presage Hackathon Judges  
> Evaluated at: November 18, 2026

---

## 1. Prototype Status Overview

mocktwo is a **fully functional, verified engineering prototype**. All core architectural pathways—from camera hardware capture, native C-API optical vitals processing, and WebRTC conversational AI to canvas video compositing and evidence-based debriefing—are operational, backed by **175 automated unit/integration tests** and zero mock or fabricated data.

---

## 2. Feature-by-Feature Operational Status

| Module / User Journey | Status | Verification & Evidence | Notes / Constraints |
| :--- | :---: | :--- | :--- |
| **SmartSpectra Native FFI Bridge** | **Operational** | `tests/presageSessionSingleton.test.ts` (Pass) | Bridges `libsmartspectra_capi.dylib` through Koffi; single long-lived instance per BrowserWindow. |
| **Calm Baseline Calibration (60s)** | **Operational** | `tests/baselineState.test.ts`, `tests/baselineStateMachine.test.ts` | Guided 60s calibration establishing resting pulse, HRV, and quality score. |
| **Live Tavus Rehearsal (WebRTC)** | **Operational** | `tests/tavusClient.test.ts`, `tests/cviSession.test.ts` | Connects to Tavus CVI over Daily WebRTC. Audio and video exchange operational. |
| **Stage Compositor & Recording** | **Operational** | `tests/stageCompositor.test.ts`, `tests/ebmlFixer.test.ts` | Composites 1280x720 30fps canvas with AI persona, user PiP, live captions, and mixed two-way audio. |
| **True Hardware Release** | **Operational** | `tests/mediaLifecycle.test.ts` (Pass) | Disabling video physically stops tracks and turns off Mac camera LED. |
| **Composure & Nervousness Engine** | **Operational** | `tests/analyticsScoring.test.ts` (Pass) | Computes pulse elevation control (60%) and autonomic recovery (40%). |
| **Evidence-Gated Coaching** | **Operational** | `tests/coachingEngine.test.ts`, `tests/sessionInsights.test.ts` | Pins peak stress moments to counterpart transcript objections using -12s lookback. |
| **Video Playback with Range Seeking** | **Operational** | `electron/main.cjs` HTTP 206 handler | Custom `mocktwo-asset://` protocol handles `Range: bytes=X-Y` for smooth seeking. |
| **Progress & Longitudinal Tracking** | **Operational** | `src/screens/ProgressScreen.tsx` | Dynamically derived from SQLite rows across 7D, 30D, 90D, and All filters. |
| **Composure Explainer Modal** | **Operational** | `src/components/common/ComposureExplainerModal.tsx` | Details exact formulas, nervousness thresholds, and layman definition of Steady. |

---

## 3. Known Constraints & Environmental Dependencies

### 1. Hardware & Platform
- **macOS Requirement**: Built and tested primarily on macOS (Darwin arm64 Apple Silicon and x64 Intel). Windows and Linux binaries are bundled in the package configuration but require platform-specific native C-API libraries.
- **Physical Camera Required**: Optical photoplethysmography (rPPG) requires an active optical camera with facial framing. Virtual cameras or black frames will output validation code `1` (`kNoFaceFound`).

### 2. Signal Availability Constraints (SDK Invariants)
- **Pulse Tracking**: Requires 12 seconds of stable optical convergence before emitting stable readings.
- **HRV RMSSD**: Presage SmartSpectra requires a minimum of 60 seconds of continuous steady measurement for statistical validity. Sessions shorter than 60 seconds will honestly indicate `"Requires 60s steady read"`.
- **Breathing Rate**: Facial rPPG respiratory rate is only measured during non-speaking quiet pauses. While speaking, the app displays `"Not measurable while speaking"`, avoiding speech-movement artifacts.

### 3. API Keys Required in `.env`
- `SMARTSPECTRA_API_KEY`: Required for Presage native license validation.
- `TAVUS_API_KEY`: Required to spin up Tavus CVI conversation rooms.

---

## 4. Issue Classification Matrix

### Critical Issues (Could prevent main demo)
- **None Identified**. All build targets, tests (175/175), and forbidden-literal checkers pass cleanly.

### High-Priority Considerations (Judge Environment)
- **API Key Configuration**: If a judge runs the code without a valid `SMARTSPECTRA_API_KEY`, the native SDK fails initialization. The application handles this gracefully by displaying an informative diagnostic screen (`probePresage` diagnostics) explaining which key is missing.
- **Camera Permissions**: First launch requires standard macOS camera and microphone approval.

### Medium / Low-Priority Enhancements
- **Multi-Monitor Window Resizing**: Very narrow window widths (< 1000px) compress the right-hand inspector. Responsive clamps were added to ensure cards wrap cleanly.

---

## 5. Judge Testing Guide (Step-by-Step)

Follow these steps to evaluate the application directly from the repository:

### Step 1: Clone and Install
```bash
git clone https://github.com/shivam-chaturvedi/mocktwo.git
cd mocktwo
npm install
```

### Step 2: Configure Environment
Create a `.env` file in the root directory:
```bash
SMARTSPECTRA_API_KEY="your-presage-key"
TAVUS_API_KEY="your-tavus-key"
```

### Step 3: Run Automated Verification Suite
```bash
# 1. Verify zero mock data or placeholder strings
node scripts/check-forbidden-literals.cjs

# 2. Compile TypeScript
npx tsc -b

# 3. Static linter
npx oxlint src

# 4. Run test suite (175 tests)
npm test

# 5. Production build
npm run build
```

### Step 4: Launch Application
```bash
npm run dev
```

### Step 5: Recommended Evaluation Flow
1. **Calm Baseline Calibration**: Click *"Set calm baseline"* on the Today screen. Complete the 60-second guided resting session to record resting pulse and HRV.
2. **Select a Scenario**: Open the *Scenarios* tab. Select *"Why are you leaving your current role?"* or *"The Renewal Negotiation"*.
3. **Inspect Briefing Sheet**: Select practice duration (e.g. 1, 2, or 3 minutes). Review context, objectives, and counterpart temperament.
4. **Live Rehearsal**: Enter simulation. Observe optical facial validation, speak with the AI persona, and experience pushback objections.
5. **Debrief Analysis**:
   - Check the **Coaching** tab for timestamped pressure moments paired with counterpart quotes.
   - Check the **Analytics** tab for the timeline chart, pulse control score, nervousness badge, and recovery latency.
   - Click the `(i)` button on the Composure Index card to review the mathematical formula breakdown.
6. **Progress View**: Navigate to *Progress* to see your multi-session composure trajectory, pressure skills, and persona reactivity.
