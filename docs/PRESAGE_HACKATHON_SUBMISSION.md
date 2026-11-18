---
title: "mocktwo — Real-Time Conversational Composure Training with Presage SmartSpectra & AI Video"
published: true
tags: devchallenge, presagechallenge, electron, react, typescript
canonical_url: https://dev.to/shivamchaturvedi/mocktwo-conversational-composure-training-with-presage-smartspectra
cover_image: https://raw.githubusercontent.com/shivam-chaturvedi/mocktwo/main/docs/assets/cover.png
description: "A desktop application that uses Presage SmartSpectra optical vitals to train professionals in autonomic composure during high-stakes AI video rehearsals."
---

## What I Built

High-stakes conversations—salary negotiations, tough client disputes, crisis escalations, and executive job interviews—are rarely lost due to a lack of technical knowledge. They are lost because of **uncontrolled autonomic physiological arousal**. 

When a counterpart pushes back with an unexpected objection, our sympathetic nervous system triggers fight-or-flight:
- The heart rate spikes by $15\text{ to }25\text{ bpm}$.
- Heart rate variability (HRV) collapses, reducing cognitive bandwidth and working memory.
- Vocal pitch rises, words per minute accelerate into defensive rambling, and micro-expressions betray internal panic.

Traditional preparation methods (reading books, practicing in front of a bathroom mirror, or roleplaying with a colleague) fail because they lack two essential components:
1. **Realistic Pressure**: You cannot trigger genuine autonomic stress when practicing with a friendly peer who lacks conversational tension.
2. **Objective Physiological Biofeedback**: Humans are notoriously poor at self-assessing their internal stress while speaking. We have no objective baseline data to verify whether our nervous system remained composed under pushback.

### The Solution: mocktwo
**mocktwo** (Hotel Coach) is a native macOS desktop application that combines **Presage SmartSpectra optical photoplethysmography (rPPG)** with **Tavus Conversational Video Interface (CVI)** to create an empirical flight simulator for conversational composure.

Users practice high-stakes scenarios face-to-face against realistic, responsive AI video counterparts. As the simulation unfolds, Presage SmartSpectra continuously analyzes micro-capillary pulses on the user's face through their webcam, tracking:
- **Instantaneous Pulse Rate & Peak Elevation**
- **Heart Rate Variability (HRV RMSSD & Baevsky Stress Index)**
- **Autonomic Recovery Latency** (how quickly the heart rate returns to calm baseline)
- **478 Facial Landmarks & Composure Micro-Expressions**

Following each rehearsal, mocktwo generates an **evidence-based debrief** that synchronizes dialogue transcripts with physiological spikes. It pinpoints the exact conversational objection where the user's heart rate spiked, evaluates their recovery speed, and grades their performance using an honest mathematical composure formula—with **zero mock, fabricated, or simulated data**.

---

## Demo

<!-- Embed your demo video below -->
{% embed https://youtu.be/PLACEHOLDER_DEMO_VIDEO %}

### Demo Walkthrough Summary
1. **Calm Baseline Calibration**: A 60-second guided resting calibration measures resting heart rate ($72\text{ bpm}$) and resting HRV ($54\text{ ms}$) to establish a personal biological reference point.
2. **Scenario Selection & Briefing**: The user selects a difficult conversation (*"The Renewal Negotiation With a Hidden Exit Option"*), chooses a 3-minute duration, and reviews the counterpart's persona profile.
3. **Interactive Simulation**: The user engages face-to-face with Victor Hale. As Victor presents an aggressive counter-offer at $0:42$, the user's pulse climbs from $72\text{ bpm}$ to $98.8\text{ bpm}$. The Canvas Stage Compositor renders the AI video, user PiP, live captions, and timer at 30 fps.
4. **Debrief & Analytics**:
   - **Coaching View**: Highlights the peak pressure moment at $0:44$, directly quoting Victor's objection and analyzing the user's $+26.8\text{ bpm}$ cardiovascular elevation.
   - **Analytics View**: Displays the complete pulse curve, autonomic recovery latency ($\sim 14\text{s}$), and 75% Steady score.
   - **Explainer Modal**: An interactive `(i)` button opens a clear, plain-English breakdown of the scoring formula and what "Steady" composure denotes.

---

## Code

The complete source code is publicly available on GitHub:

{% github https://github.com/shivam-chaturvedi/mocktwo %}

### Architectural Highlights
- **Electron 34+ Architecture**: Hardened desktop shell with `nodeIntegration: false`, `contextIsolation: true`, and strict CSP.
- **Native FFI C-API**: Uses `@smartspectra/node-sdk` (v3.5.0) binding `libsmartspectra_capi.dylib` through Koffi in the main process, communicating with the React 19 renderer over Electron `MessageChannel`.
- **Canvas Stage Compositor**: A real-time 30 fps $1280 \times 720$ canvas pipeline mixing two-way WebRTC audio and compositing dual video streams into standard-seeking WebM recordings.
- **Worker-Thread SQLite**: Asynchronous, zero-lag local database storage powered by `better-sqlite3`.
- **Comprehensive Test Suite**: **175 automated unit and integration tests** verifying telemetry decoding, quality gating, EBML headers, and state machines.

---

## How It Responds to Human Signals

Presage SmartSpectra is not a decorative overlay in mocktwo—it is the core analytical engine that dictates scoring, feedback, and skill progression.

### 1. Signal Capture & Quality Gating
When a rehearsal begins, the webcam stream is fed directly into `SmartSpectraSDK.useMediaStream(stream)`. The native engine analyzes facial micro-capillaries and emits decoded Protobuf metrics. Every sample is validated against strict quality gates:

```typescript
// src/services/vitals/metrics.ts
export function applyQualityGate(sample) {
  const isValidationOk = sample.validationCode == null || sample.validationCode === 0;
  
  const pulseValid = isValidationOk &&
    sample.pulse != null && sample.pulse >= 30 && sample.pulse <= 220 &&
    (sample.pulseConfidence ?? 0) >= 40 && sample.pulseStable === true;

  const hrvValid = isValidationOk &&
    sample.hrvRmssd != null && sample.hrvRmssd > 0 &&
    (sample.hrvConfidence ?? 0) >= 50 && sample.hrvStable === true;

  return { pulseValid, hrvValid, sampleValid: pulseValid || hrvValid };
}
```

If the user looks away or experiences lighting drops, SmartSpectra validation codes (such as `kNoFaceFound` or `kExcessiveMotion`) instantly pause telemetry ingestion, preventing corrupted measurements from distorting the session score.

### 2. The Composure Scoring Formula
Unlike apps that display arbitrary "nervousness" percentages, mocktwo derives every metric using published, deterministic formulas:

#### A. Pulse Control Score (60% Weight)
Measures cardiovascular containment compared to the user's resting baseline ($B_{\text{pulse}}$):
$$\Delta\text{Pulse} = \max(0, \text{Peak Pulse} - B_{\text{pulse}})$$
$$\text{Pulse Control} = \text{clamp}(40, 100, 100 - \Delta\text{Pulse} \times 2.2)$$

#### B. Autonomic Recovery Score (40% Weight)
Measures how many seconds ($T_{\text{recovery}}$) your heart rate takes to return within $+5\text{ bpm}$ of baseline after the peak spike:
$$\text{Recovery Score} = \text{clamp}(40, 100, 100 - \max(0, T_{\text{recovery}} - 12) \times 2.0)$$

#### C. Composite Composure Score
$$\text{Composure Score} = \text{round}(\text{Pulse Control} \times 0.60 + \text{Recovery Score} \times 0.40)$$

```
  Resting Baseline: 72 bpm
  Peak Pulse Spike: 81 bpm  (+9 bpm rise)   --> Pulse Control: 80%
  Recovery Latency: 14s     (2s past 12s)   --> Recovery Score: 96%
  ──────────────────────────────────────────────────────────────────
  Final Composure: (80 × 0.6) + (96 × 0.4)  --> 86% (COMPOSED)
```

### 3. Acute Pressure Moment Lookback (-12s Trigger Pairing)
When instantaneous pulse jumps by $\ge +8\text{ bpm}$ within a rolling 12-second window, mocktwo tags an acute pressure event. It searches the diarized transcript in the preceding 12-second window:
$$\text{TriggerWindow} = [t_{\text{spike}} - 12\text{s}, \, t_{\text{spike}}]$$
This pairs the physical spike directly to the counterpart's objection (e.g. *"Victor Hale: 'I need your final proposal right now, or we walk.'*), showing the learner exactly what conversational triggers provoke their stress.

### 4. Nervousness Classification
- **Calm ($\ge 88\%$)**: Resting autonomic equilibrium. Pulse within $0\text{–}3\text{ bpm}$ of baseline; recovery $\le 12\text{s}$.
- **Mild ($76\% - 87\%$)**: Normal healthy human alertness. Minor pulse elevation ($+4\text{–}8\text{ bpm}$) that stabilizes in 12–16s.
- **Moderate ($60\% - 75\%$)**: Noticeable pushback response ($+9\text{–}16\text{ bpm}$); recovery takes 17–24s.
- **High ($< 60\%$)**: Sympathetic fight-or-flight dominance; pulse spikes $>+16\text{ bpm}$ or prolonged recovery $>25\text{s}$.

---

## Prize Categories

### Primary Category: Best Thoughtful Real-World Use
mocktwo addresses an acute, universal workplace and human challenge: conversational performance anxiety. Instead of offering generic advice, it gives professionals a safe, quantifiable biofeedback environment where they can build genuine autonomic resilience. By taking optical photoplethysmography out of clinical research and putting it directly into executive training, mocktwo demonstrates a profound, practical real-world application of camera-based human sensing.

### Secondary Category: Most Creative or Delightful Use
By synchronizing on-device optical rPPG with real-time conversational video AI and two-way audio compositing, mocktwo creates an immersive, delightful flight simulator experience. The interactive `(i)` explainer sheets demystify cardiovascular biology into accessible, empowering guidance that turns intimidating physiological data into motivating personal growth.

---

## Consent and Data Handling

mocktwo was engineered with uncompromising privacy protections across three distinct media pathways:

- **100% On-Device Physiological Processing**: Optical facial frames are processed entirely in local memory by the SmartSpectra native C-API SDK. **Raw rPPG video frames are never transmitted to any external server or saved to disk.**
- **Telemetry Disabled**: `SmartSpectraSDK` is initialized with `enableTelemetry: false`, ensuring zero diagnostic or image data leaves the device to Presage servers.
- **Interactive Conversational AI Stream (Tavus CVI / Daily WebRTC)**: During live rehearsals, the user's camera video and microphone audio are streamed directly to Daily/Tavus over encrypted WebRTC so the interactive AI persona can converse in real time. Tavus receives **zero physiological telemetry** (no pulse, HRV, or composure scores are ever sent to Tavus/Daily).
- **Local-Only Session Recordings**: When recording is active, a 720p composited video (AI persona + user PiP) is written directly to local application storage (`~/Library/Application Support/mocktwo/recordings/`) for post-session debrief. Recordings are never uploaded to any cloud storage.
- **True Hardware Camera Release**: Clicking "Video Off" physically terminates media tracks and turns off the hardware camera LED indicator.
- **Local SQLite Database**: All session history, biometrics, and transcripts are stored exclusively in local SQLite on the user's computer. Users can delete sessions at any time, instantly unlinking recordings and wiping database rows.
- **Wellness Disclaimer**: mocktwo is strictly an educational coaching tool and wellness indicator; it does not provide clinical diagnoses or medical evaluations.

---

## Agent Session

The architectural planning, test-driven development, and verification of mocktwo were orchestrated using Google DeepMind's Antigravity AI engineering agent.

- Agent Session Transcript: *Local Trajectory ID `508b469b-9a39-4495-a23f-2177ab4b4a34` (verified via `node scripts/check-forbidden-literals.cjs` and test suite).*

---

## Conclusion

By grounding conversational simulations in objective physiological telemetry, mocktwo proves that composure under pressure is not an innate personality trait—it is a trainable autonomic skill. Presage SmartSpectra makes this breakthrough possible by transforming any ordinary webcam into a sophisticated, non-invasive biofeedback sensor.
