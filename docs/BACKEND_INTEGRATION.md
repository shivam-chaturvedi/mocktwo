# mocktwo — Backend Integration Guide & Service Architecture

This document provides the complete integration specification for connecting `mocktwo` to a live production backend, real-time conversational AI session engine, and the SmartSpectra optical vitals SDK.

---

## 1. Architectural Overview

`mocktwo` uses a decoupled service-oriented architecture:
```
┌─────────────────────────────────────────────────────────────┐
│                       React UI Layer                        │
│ (Screens, Modals, Empty States, Skeletons, Visualizations)  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      AppContext Layer                       │
│    (Reactive state, local cache sync, data migration v2)    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Service Registry Layer                      │
│        (`serviceRegistry` via `src/services/api/`)          │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌─────────────────────────────┐
│    REST / WebSocket Adapters │ │  SmartSpectra Sensor Bridge │
│   (Auth, Scenarios, Session) │ │ (Optical vitals via camera) │
└──────────────────────────────┘ └─────────────────────────────┘
```

The app ships with **typed default empty adapters** (`src/services/api/emptyAdapters.ts`). In disconnected mode, the application boots into a clean, zero-data first-run state, with all screens presenting intentional macOS empty states and disabled buttons with descriptive tooltips.

---

## 2. Service Interfaces & Contracts

All contracts are defined strictly in `src/services/api/types.ts`.

### 2.1 AuthService
Handles user identity, SSO, and magic code tokens.
```typescript
export interface AuthService {
  isAuthenticated(): boolean;
  getCurrentUser(): Promise<UserProfile | null>;
  signIn(email: string): Promise<UserProfile>;
  signOut(): Promise<void>;
}
```
* **Status**: Disconnected by default.
* **Handoff**: Implement `HttpAuthService` targeting `POST /api/v1/auth/sign-in` and `POST /api/v1/auth/sign-out`.

### 2.2 ProfileService
Manages personal user settings, baseline references, and telemetry preferences.
```typescript
export interface ProfileService {
  getProfile(): Promise<UserProfile | null>;
  updateProfile(updates: Partial<UserProfile>): Promise<UserProfile>;
}
```
* **Endpoints**: `GET /api/v1/profile`, `PATCH /api/v1/profile`.

### 2.3 ScenarioService
Manages the shared library, user-created practice scenarios, and AI draft generation.
```typescript
export interface CreateAdHocParams {
  topic: string;
  category?: string;
  personaId?: string;
  lengthMin?: number;
}

export interface ScenarioService {
  getScenarios(): Promise<PracticeScenario[]>;
  getScenario(id: string): Promise<PracticeScenario | null>;
  createScenario(scenario: Omit<PracticeScenario, "id">): Promise<PracticeScenario>;
  createAdHoc(params: CreateAdHocParams): Promise<PracticeScenario>;
  updateScenario(id: string, updates: Partial<PracticeScenario>): Promise<PracticeScenario>;
  deleteScenario(id: string): Promise<boolean>;
  generateDraft?(prompt: string, documentName?: string): Promise<Partial<PracticeScenario>>;
}
```
* **Endpoints**:
  * `GET /api/v1/scenarios` (supports `?category=...&source=...&search=...`)
  * `POST /api/v1/scenarios`
  * `POST /api/v1/scenarios/adhoc` (creates on-the-fly practice scenario from freeform user topic, persona, and length)
  * `PATCH /api/v1/scenarios/:id`
  * `DELETE /api/v1/scenarios/:id`
  * `POST /api/v1/scenarios/generate-draft` (throws `BackendNotConnectedError` when offline, triggering informative UI notice in Studio)

### 2.4 PersonaService
Manages interlocutor counterpart profiles, seniority tiers, voice options, and behavioral traits.
```typescript
export interface PersonaService {
  getPersonas(): Promise<Persona[]>;
  getPersona(id: string): Promise<Persona | null>;
  createPersona(persona: Omit<Persona, "id">): Promise<Persona>;
  updatePersona(id: string, updates: Partial<Persona>): Promise<Persona>;
  deletePersona(id: string): Promise<boolean>;
}
```

### 2.5 SessionService (Realtime Conversational Engine)
Manages live conversational turns, bidirectional audio chunk streaming, and simulation completion.
```typescript
export interface SessionStreamChunk {
  counterpartText: string;
  isComplete: boolean;
  audioBlob?: Blob;
}

export interface SessionService {
  isAvailable(): boolean;
  getUnavailableReason(): string;
  startSession(scenarioId: string, personaId?: string): Promise<{ sessionId: string }>;
  streamTurn(sessionId: string, audioChunk: Blob | ArrayBuffer): Promise<SessionStreamChunk>;
  endSession(sessionId: string): Promise<{ recordingId: string }>;
}
```
* **Realtime Flow**:
  1. Client calls `startSession(scenarioId, personaId)` -> receives `sessionId` and WebSocket connection URL (`wss://...`).
  2. During turn: microphone audio is recorded via `MediaRecorder` (Opus / WebM or PCM 16kHz) and sent as binary WebSocket frames.
  3. Server streams JSON events:
     ```json
     { "type": "turn_delta", "text": "We reviewed your proposal...", "isComplete": false }
     ```
     followed by audio chunk frames.
  4. Client calls `endSession(sessionId)` -> server aggregates transcript, body signals, and outputs a `Recording` object.

### 2.6 RecordingService
Retrieves past rehearsal sessions, transcripts, timestamped notes, and coaching debriefs.
```typescript
export interface RecordingService {
  getRecordings(): Promise<Recording[]>;
  getRecording(id: string): Promise<Recording | null>;
  addNote(recordingId: string, timestampSeconds: number, text: string): Promise<void>;
  deleteRecording(id: string): Promise<boolean>;
}
```

### 2.7 ProgressService
Aggregates longitudinal composure trends, category breakdowns, and counterpart reactivity.
```typescript
export interface ProgressService {
  getProgressSummary(): Promise<ProgressSummary | null>;
}
```

### 2.8 BiometricsService (Local Optical Engine & Storage)
Interfaces with the camera optical vitals engine and local user baseline storage.
```typescript
export type BiometricsServiceStatus = "loading" | "ready" | "error";

export interface BiometricsStatusInfo {
  status: BiometricsServiceStatus;
  hasBaseline: boolean;
  error?: string;
}

export interface BiometricsService {
  isAvailable(): boolean;
  getUnavailableReason(): string;
  getStatus(): Promise<BiometricsStatusInfo>;
  getBaseline(): Promise<UserBaseline | null>;
  saveBaseline(baseline: UserBaseline): Promise<UserBaseline>;
  clearBaseline(): Promise<void>;
  calibrateBaseline(durationSeconds?: number): Promise<UserBaseline>;
}
```
* **Offline & Local Architecture**: The calm baseline runs 100% locally on device using the device camera. It does not invoke any network LLM, Tavus or backend service. Only derived resting metrics (pulse, breathing rate, HRV, quality, capture timestamp) are stored locally under `mocktwo_baseline_v2`. Video frames are never saved or transmitted.
* **Endpoints (when syncing with optional cloud workspace)**:
  * `GET /api/v1/baseline` -> returns current `UserBaseline` or 404
  * `PUT /api/v1/baseline` -> saves derived resting vitals
  * `DELETE /api/v1/baseline` -> clears stored baseline

### 2.9 SettingsService
Reads and updates persistent hardware choices, turn-taking sounds, and telemetry.
```typescript
export interface SettingsService {
  getSettings(): Promise<AppSettings>;
  updateSettings(updates: Partial<AppSettings>): Promise<AppSettings>;
}
```

---

## 3. SmartSpectra Optical Vitals SDK Integration Spec

When integrating the actual SDK:
1. **Preload & CSP Requirements**:
   - `index.html` already includes `worker-src 'self' blob:; media-src 'self' blob:;` which is required for SmartSpectra's WebAssembly / Web Worker pipeline.
   - `electron/main.cjs` has `sandbox: true` and strict `session.setPermissionRequestHandler` approving only local `media` (camera and microphone).
2. **Timing Windows (SDK Truth Table)**:
   - **Pulse rate**: 12 s moving window, 40–110 bpm only.
   - **HRV**: 60 s window (`rmssd`, `baevsky`). Confidence remains 0 until 60 seconds of clean face capture.
   - **Breathing rate**: 30 s window, 5–40 br/min, unmeasurable while speaking.
   - **EDA proxy**: Starts after 35+ seconds.
   - **Face landmarks**: 478 landmarks, immediate confidence.
3. **Validation Codes**:
   Bind SDK error codes to `ValidationStatusCode` in `src/types/index.ts` (`NO_FACE_FOUND`, `TOO_DARK`, `EXCESSIVE_MOTION`, etc.).

---

## 4. Environment Variables & Runtime Switch

To switch `mocktwo` from the empty adapter layer to live services, configure the following environment variables in `.env`:

```env
# API Gateway Endpoints
VITE_BACKEND_URL=https://api.mocktwo.internal
VITE_WS_URL=wss://session.mocktwo.internal/ws

# Feature Flags
VITE_USE_LIVE_SERVICES=true
VITE_ENABLE_OPTICAL_VITALS=false
```

Inside `src/services/api/registry.ts`:
```typescript
import { createDefaultServiceRegistry, createHttpServiceRegistry } from "./factory";

export const serviceRegistry: ServiceRegistry =
  import.meta.env.VITE_USE_LIVE_SERVICES === "true"
    ? createHttpServiceRegistry({
        baseUrl: import.meta.env.VITE_BACKEND_URL,
        wsUrl: import.meta.env.VITE_WS_URL,
      })
    : createDefaultServiceRegistry();
```

---

## 5. Data Versioning & Local Migration

The application includes an automated startup migration (`src/services/migration.ts`) running on startup:
* **Current Version**: `2` (`mocktwo_data_version`).
* **Behavior**: Cleanses all legacy keys prefixed with `hc_*`, `m2_*`, `hotel_*`, and `mocktwo_persisted_*` to ensure existing installations boot cleanly into production-ready state without stale mock caches.
