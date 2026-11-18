# Demo Video Recording Script

> **mocktwo — High-Stakes Conversational Composure with Presage SmartSpectra**  
> Complete shot-by-shot script for the 3-minute hackathon demo video.

---

## Video Specifications
- **Target Duration**: 2 minutes 45 seconds to 3 minutes 15 seconds.
- **Resolution**: 1080p ($1920 \times 1080$) or 1440p at 30/60 fps.
- **Audio**: Clear microphone voiceover with crisp system audio.
- **Visuals**: Clean macOS dark desktop with mocktwo maximized.

---

## Shot-by-Shot Timeline & Script

---

### Scene 1: The Problem & Introduction
- **Timestamp**: `0:00 – 0:25` (25s)
- **Visual**: mocktwo Home / Today screen. Show the modern dark-themed macOS interface, greeting, streak tracker, and composure snapshot.
- **Action**: Smoothly pan cursor over the Composure Snapshot card and Quick Start category chips.
- **Voiceover (Spoken)**:
  > *"When we walk into high-stakes conversations—salary negotiations, board presentations, or tough interviews—the biggest danger isn't forgetting our points. It's our physiology. Under unexpected pushback, our heart rate spikes, stress surges, and composure slips. Traditional practice can't help because roleplay lacks real pressure, and bathroom mirrors provide zero objective biofeedback. Meet mocktwo: an empirical flight simulator for conversational composure, powered by Presage SmartSpectra."*
- **Technical Feature**: Native macOS Electron shell, local SQLite session history, zero mock data.

---

### Scene 2: 60-Second Calm Baseline Calibration
- **Timestamp**: `0:25 – 0:50` (25s)
- **Visual**: The Baseline Calibration Sheet (`BaselineSheet.tsx`).
- **Action**: Click *"Set calm baseline"*. Position face in camera guide. The SmartSpectra optical validation ring turns green (`kOk`). Show the countdown timer and real-time pulse stabilizing.
- **Voiceover (Spoken)**:
  > *"Every body is different, so mocktwo begins with a 60-second guided resting calibration. Using Presage SmartSpectra's optical photoplethysmography engine, mocktwo reads micro-capillary pulses across my face through the webcam—without sending any video to the cloud. In 60 seconds, it calculates my baseline resting heart rate at 72 bpm and resting HRV at 54 ms. All future session scores will be calibrated against this exact baseline."*
- **Technical Feature**: Native SmartSpectra C-API FFI, facial landmark validation, `applyQualityGate()` filtering.

---

### Scene 3: Choosing a High-Pressure Scenario
- **Timestamp**: `0:50 – 1:10` (20s)
- **Visual**: Scenarios Library screen (`ScenariosScreen.tsx`) and Briefing Sheet (`BriefingSheet.tsx`).
- **Action**: Select *"The Renewal Negotiation With a Hidden Exit Option"*. Choose a 3-minute practice duration dropdown. Click *"Start Rehearsal"*.
- **Voiceover (Spoken)**:
  > *"Next, I choose a scenario from the library. Let's practice a high-stakes client renewal with Victor Hale, an assertive procurement executive. I configure a 3-minute rehearsal. Notice the explicit hardware readiness gate—mocktwo verifies camera framing and audio before launching."*
- **Technical Feature**: Dynamic duration selection (1–10 minutes), scenario context building.

---

### Scene 4: Live Rehearsal & Real-Time Human Sensing
- **Timestamp**: `1:10 – 1:55` (45s)
- **Visual**: Live Simulation screen (`LiveSimulationScreen.tsx`). AI persona Victor Hale is talking over WebRTC. Top right shows user PiP. Stage Compositor renders live captions at bottom.
- **Action**: Speak with Victor. At 1:30, Victor challenges: *"I need your final proposal right now, or we walk."* User visibly takes a breath, speaks, and responds. The live pulse tracker on screen rises from 72 to 92 bpm, capturing the physiological reaction.
- **Voiceover (Spoken)**:
  > *"Here is the live rehearsal. I'm interacting in real time with Victor, powered by Tavus CVI over Daily WebRTC. Meanwhile, our Canvas Stage Compositor mixes two-way audio and records both video streams at 30 fps. Notice what happens when Victor pushes back aggressively: my pulse rises past 90 bpm. SmartSpectra tracks this physiological arousal in real time directly on-device in local RAM."*
- **Technical Feature**: Canvas Stage Compositor (1280x720 @ 30fps), SmartSpectra rPPG continuous telemetry, live WebRTC turn-taking.

---

### Scene 5: Hardware Camera Release Demonstration
- **Timestamp**: `1:55 – 2:10` (15s)
- **Visual**: Click "Video Off" button during the call.
- **Action**: The camera LED on the MacBook turns completely off. The Camera Off Warning Modal pops up explaining that vitals tracking is paused. Click to resume video.
- **Voiceover (Spoken)**:
  > *"Privacy is paramount. If I turn my video off, mocktwo physically stops the camera track and turns off the hardware indicator LED—it never secretly captures frames. A clear warning explains that vitals tracking is paused while the rehearsal continues."*
- **Technical Feature**: True hardware track release (`mediaLifecycle.ts`), `CameraOffWarningModal.tsx`.

---

### Scene 6: Evidence-Gated Debrief & Pressure Moment Lookback
- **Timestamp**: `2:10 – 2:35` (25s)
- **Visual**: Recordings Debrief view (`RecordingsScreen.tsx`). Show the synchronized video player, transcript, and Coaching pane.
- **Action**: Click the purple peak stress marker at `0:44` on the timeline. The video automatically seeks back 12 seconds to `0:32` to replay Victor's objection.
- **Voiceover (Spoken)**:
  > *"When the rehearsal ends, mocktwo generates an evidence-gated debrief. Look at the timeline: a purple dot marks where my pulse spiked to 92 bpm. With one click, the player seeks back 12 seconds to the exact moment Victor delivered his ultimatum. mocktwo pairs my physiological reaction with Victor's exact transcript quote, showing me the exact conversational trigger that challenged my nervous system."*
- **Technical Feature**: -12s conversational trigger lookback, HTTP 206 byte-range seeking, diarized transcript synchronization.

---

### Scene 7: Analytics, Scoring Formula & The Explainer Modal
- **Timestamp**: `2:35 – 2:55` (20s)
- **Visual**: Analytics tab in Recordings view. Show the Composure & Nervousness Index card with the 75% Steady score.
- **Action**: Click the `(i)` info icon button. The `ComposureExplainerModal` opens with its clean glass UI, displaying the mathematical formulas and tier definitions.
- **Voiceover (Spoken)**:
  > *"Switching to Analytics reveals my final score: 75% Steady. Clicking the info icon reveals the exact mathematical formulas: 60% Pulse Control plus 40% Autonomic Recovery Latency. The modal explains that Steady is a strong, dependable score—meaning my body experienced natural arousal, but autonomic vagal return brought my heart rate right back to baseline within 14 seconds."*
- **Technical Feature**: `ScoreRing` dynamic scaling, `ComposureExplainerModal.tsx`, deterministic scoring formulas.

---

### Scene 8: Progress Tracking & Conclusion
- **Timestamp**: `2:55 – 3:15` (20s)
- **Visual**: Your Progress screen (`ProgressScreen.tsx`). Show multi-session trend bars, the 5 Pressure Skills breakdown, and persona reactivity.
- **Action**: Switch between 7D, 30D, and All tabs. Hover over the pulse vs baseline trend bars.
- **Voiceover (Spoken)**:
  > *"Over time, the Progress tab tracks my autonomic trajectory across multiple sessions, showing my pulse control and recovery speed improving across difficult personas. By combining Presage SmartSpectra with interactive conversational AI, mocktwo turns composure from an abstract feeling into an empirical, trainable skill. Thank you."*
- **Technical Feature**: SQLite longitudinal aggregations, 5 Pressure Skills derivation, zero mock data.

---

## Recording Tips for Success
1. **Lighting**: Ensure soft, front-facing lighting so the SmartSpectra optical sensor acquires clean micro-capillary readings immediately without `kUnderexposed` warnings.
2. **Audio Levels**: Test your microphone beforehand to ensure voiceover is distinctly louder than Victor Hale's audio.
3. **Pacing**: Move the mouse pointer smoothly and deliberately; let each screen transition settle for 1–2 seconds before speaking.
