# mocktwo

> **Desktop rehearsal and conversational composure training application.**  
> Built with Electron, React, TypeScript, SmartSpectra optical vitals, and Tavus conversational video.

---

## 1. Overview

**mocktwo** (Hotel Coach) is a native desktop application designed for high-stakes conversational practice. Whether preparing for critical executive negotiations, high-pressure job interviews, difficult management conversations, or customer escalations, mocktwo allows professionals to rehearse against realistic, interactive AI video counterparts while continuously monitoring their physiological composure and stress reactions in real time.

All physiological telemetry is derived on-device through non-invasive optical photoplethysmography (rPPG), tracking micro-capillary pulse fluctuations, autonomic recovery, and facial expressions without transmitting or saving raw camera video to the cloud.

---

## 2. Key Capabilities

### 🎥 Live Conversational Rehearsals (Tavus CVI)
- **Interactive AI Counterparts**: Practice face-to-face against realistic video personas powered by Tavus Conversational Video Interface (CVI) over Daily WebRTC.
- **Dynamic Dialogue**: Realistic turn-taking, interruption handling, and natural conversational cadence with streaming speech recognition and speech synthesis.
- **Customizable Duration**: Flexible rehearsal timers from 1 to 10 minutes (defaulting to 3 minutes) matching the target scenario.

### 💓 On-Device Optical Biometrics (SmartSpectra rPPG)
- **Pulse & Heart Rate**: Continuous optical pulse tracking (40–110 bpm) starting at 12 seconds of steady framing.
- **Heart Rate Variability (HRV)**: Computes RMSSD and Baevsky stress index over sessions lasting 60 seconds or longer.
- **Autonomic Recovery Latency**: Automatically calculates how quickly your heart rate returns within $+5\text{ bpm}$ of your resting baseline following conversational stress spikes.
- **Landmarks & Micro-Expressions**: Monitors 478 facial landmarks for tension indicators (neutral, fear, contempt, surprise, happy) and tracks blink frequency and speaking share.
- **Calm Baseline Calibration**: A 60-second resting calibration sheet establishes personal resting pulse and HRV to normalize all subsequent session scores.

### 🎬 Stage Compositor & Dual-Stream Session Recording
- **Real-Time Video Compositing**: Combines the incoming AI persona video, user camera picture-in-picture (PiP) with fallback avatar, live synchronized captions, and elapsed timers into a single 30 fps $1280 \times 720$ canvas stream.
- **Dual-Channel Audio Mixing**: Merges remote counterpart speech and local microphone input via the Web Audio API into a clean two-way audio track.
- **HTTP 206 Seeking Replay**: Encodes and finalizes WebM recordings with EBML duration patches, streamed via custom protocol (`mocktwo-asset://`) with true byte-range seeking support.

### 📊 Evidence-Gated Debrief & Analytics
- **Dual Inspector Views**:
  - **Coaching View**: Provides actionable feedback, pinpointing exact conversational pressure moments with timestamped video links, counterpart dialogue quotes, and practical reset techniques.
  - **Analytics View**: Visualizes full pulse and EDA timeline curves, peak stress moments, coverage ratios, HRV RMSSD, and 478-landmark expression distributions.
- **Interactive Transcripts**: Full diarized dialogue transcript with search, speaker labels, and timestamped note-taking.

### 📈 Longitudinal Progress & Skill Tracking
- **Time Horizons**: Filter session history and performance across 7 Days, 30 Days, 90 Days, or All time.
- **5 Pressure Skills**: Long-term tracking across *Composure*, *Recovery*, *Pulse Control*, *Autonomic Balance*, and *Expression Calm*.
- **Persona & Category Breakdown**: Identifies which counterpart temperaments and conversation types trigger the highest autonomic responses.

---

## 3. Composure Scoring & Methodology

mocktwo uses an empirical, deterministic scoring engine based strictly on recorded biometric telemetry and baseline comparisons—**no mock or placeholder scores exist anywhere in the app**.

### 1. Composure Index Formula (0% – 100%)
$$\text{Composure Score} = \text{round}(\text{Pulse Control} \times 0.60 + \text{Recovery Score} \times 0.40)$$

- **Pulse Control (60% weight)**: Measures how effectively pulse elevation is contained when challenged compared to resting baseline:
  $$\text{Pulse Control} = \text{clamp}(40, 100, 100 - (\text{Peak Pulse} - \text{Resting Baseline}) \times 2.2)$$
- **Autonomic Recovery (40% weight)**: Measures the latency (in seconds) for the pulse to recover within $+5\text{ bpm}$ of resting baseline:
  $$\text{Recovery Score} = \text{clamp}(40, 100, 100 - \max(0, \text{Recovery Seconds} - 12) \times 2.0)$$

### 2. Composure Tiers
| Tier | Score Range | Description |
| :--- | :---: | :--- |
| **Unshakeable** | **93% – 100%** | Exceptional poise; heart rate remains virtually flat at baseline with instant autonomic recovery. |
| **Composed** | **83% – 92%** | High emotional control; minor pulse elevation that settles in a few seconds. |
| **Steady** | **70% – 82%** | Dependable, grounded performance. A natural alert reaction occurs under challenge, but autonomic stability reliably brings the heart rate back to baseline. |
| **Building** | **< 70%** | Poise in development; higher pulse elevation or delayed recovery under sudden objections. |

### 3. Nervousness Level Breakdown
- **Calm ($\ge 88\%$)**: Heart rate stays within $0\text{ to }+3\text{ bpm}$ of resting calm baseline; recovery $\le 12\text{s}$.
- **Mild ($76\% - 87\%$)**: Normal healthy human alertness. Pulse rise of $+4\text{ to }+8\text{ bpm}$; settles within 12–16 seconds.
- **Moderate ($60\% - 75\%$)**: Noticeable cardiovascular pushback reaction ($+9\text{ to }+16\text{ bpm}$); recovery takes 17–24 seconds.
- **High ($< 60\%$)**: Sustained sympathetic fight-or-flight dominance; pulse spikes $>+16\text{ bpm}$ or delayed stabilization $>25\text{s}$.

### 4. Stress & Pressure Moments
Peak stress moments (purple timeline markers) are detected whenever instantaneous pulse rises by $\ge +8\text{ bpm}$ in a rolling 12-second window. The engine automatically looks back 12 seconds in the transcript to link the physiological spike directly to the counterpart's preceding objection.

---

## 4. Privacy & Security Architecture

1. **100% On-Device Physiological Processing**:
   - Optical facial frames are processed in-memory by the SmartSpectra native SDK.
   - Raw video frames from your camera are **never transmitted to external servers**, saved to unencrypted temp directories, or included in telemetry payloads.
2. **Strict Electron Security Model**:
   - `nodeIntegration: false` and `contextIsolation: true` enforced on all renderer windows.
   - Narrowly scoped IPC bridge with input validation and sender verification.
   - Restrictive Content Security Policy (CSP).
   - Video replay is served over a custom protocol (`mocktwo-asset://`) with strict path sanitation preventing directory traversal.
3. **Secret Isolation**:
   - Sensitive credentials (`TAVUS_API_KEY`, `SMARTSPECTRA_API_KEY`) reside exclusively in the main process and are injected via `.env`.
   - Keys, tokens, and room URLs are redacted from logs and never exposed to the frontend renderer.

---

## 5. Technology Stack

- **Desktop Shell**: Electron 34+ (Node.js runtime, hardened macOS sandbox)
- **Frontend UI**: React 19, TypeScript, Lucide Icons, Vite
- **Styling**: Apple Human Interface Guidelines (HIG), native dark mode, glass surfaces, accessible focus rings
- **Local Database**: SQLite (`better-sqlite3`) managed via background worker thread
- **Biometrics Engine**: SmartSpectra C++ Native Node.js SDK (Darwin arm64/x64)
- **Video Counterpart**: Tavus CVI API over Daily WebRTC
- **Video Compositing**: HTML5 Canvas 2D + Web Audio API + MediaStream Recording API

---

## 6. Directory Structure

```
├── electron/                   # Electron main process & native bridges
│   ├── main.cjs                # Main process lifecycle, protocols, and IPC handlers
│   ├── preload.cjs             # Secure contextBridge API definition
│   ├── storage/                # SQLite database and background dbWorker thread
│   └── tavus/                  # Tavus CVI conversation client
├── src/                        # React 19 renderer application
│   ├── components/common/      # Reusable UI controls, modals, and explainer sheets
│   ├── constants/              # System constants and session configurations
│   ├── context/                # Application state provider and lifecycle management
│   ├── hooks/                  # Camera, microphone, and baseline capture hooks
│   ├── screens/                # Top-level screen views (Today, Scenarios, Simulation, Recordings, Progress)
│   ├── services/               # API adapters, biometrics integration, and stage compositor
│   ├── types/                  # TypeScript domain definitions and IPC signatures
│   └── utils/                  # Analytics scoring, coaching rules, and quick-start logic
├── tests/                      # Unit and integration test suites
└── scripts/                    # Dev runners, branding, and static compliance checkers
```

---

## 7. Getting Started

### Prerequisites
- macOS (Apple Silicon or Intel)
- Node.js $\ge 20.x$
- Camera and microphone access

### Installation
1. Clone the repository and install dependencies:
   ```bash
   git clone <repo-url>
   cd hotel-coach
   npm install
   ```

2. Configure environment credentials in `.env`:
   ```bash
   TAVUS_API_KEY="your-tavus-api-key"
   SMARTSPECTRA_API_KEY="your-smartspectra-api-key"
   ```

3. Launch the development application:
   ```bash
   npm run dev
   ```

---

## 8. Verification & Quality Gates

The codebase enforces strict quality and anti-mock invariants before every build:

```bash
# 1. Verify zero mock data or forbidden placeholder literals
node scripts/check-forbidden-literals.cjs

# 2. Type check TypeScript definitions
npx tsc -b

# 3. Static linting with Oxlint
npx oxlint src

# 4. Run full unit and integration test suite
npm test

# 5. Production build
npm run build
```

---

## 9. License & Compliance Disclaimer

*mocktwo is designed for professional coaching, educational development, and conversational skills training. Biometric scores, pulse rates, and composure metrics are wellness indicators and do not constitute clinical or medical diagnostics.*
