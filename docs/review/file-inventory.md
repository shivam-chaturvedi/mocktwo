# Complete Codebase File Inventory

Total Inventoried Files: **70**  
Audited: **70 / 70 (100%)**  
Sampling: **None (Exhaustive full-file audit)**

---

## 1. Electron Main Process & Preload (2 files)

| File | Lines | Category | Audit Status | Key Review Notes & Potential Bug Risks |
|---|---|---|---|---|
| `electron/main.cjs` | 281 | Electron Main Process | **Reviewed** | Secure defaults (`contextIsolation`, `sandbox`, `nodeIntegration: false`). IPC handlers for `get-screen-mode`, `toggle-maximize`, `open-system-settings`, `app-version`. **Risk**: Missing unhandled rejection handlers (`process.on('unhandledRejection')`), missing renderer crash listeners (`render-process-gone`, `child-process-gone`, `did-fail-load`), synchronous path resolution for icons. |
| `electron/preload.cjs` | 22 | Preload Script | **Reviewed** | Minimal contextBridge surface. Exposes `getPlatform`, `onMenuAction`, `getScreenMode`, `toggleMaximize`, `openSystemSettings`, `appVersion`. **Safe**: No unrestricted `ipcRenderer` exposure. |

---

## 2. Build Configuration & HTML Shell (6 files)

| File | Lines | Category | Audit Status | Key Review Notes & Potential Bug Risks |
|---|---|---|---|---|
| `package.json` | 46 | Build & Dependency Config | **Reviewed** | Contains scripts (`dev`, `build`, `dist`, `lint`, `preview`), Electron Builder metadata with `NSCameraUsageDescription` and `NSMicrophoneUsageDescription`. Audit flagged 6 moderate vulnerabilities in builder dependencies. |
| `tsconfig.json` | 7 | TS Project References | **Reviewed** | References `tsconfig.app.json` and `tsconfig.node.json`. Clean. |
| `tsconfig.app.json` | 26 | Renderer TS Config | **Reviewed** | Strict compilation enabled, noEmit, JSX react-jsx. Clean. |
| `tsconfig.node.json` | 23 | Node/Vite TS Config | **Reviewed** | Strict compilation for config files. Clean. |
| `vite.config.ts` | 7 | Vite Bundler Config | **Reviewed** | Minimal config with `@vitejs/plugin-react`. Host set to `127.0.0.1`. Clean. |
| `index.html` | 17 | Main Application HTML Shell | **Reviewed** | CSP header present. Needs production tightening to avoid open websocket/http connect-src in packaged DMG/EXE. |

---

## 3. Application State & Context (4 files)

| File | Lines | Category | Audit Status | Key Review Notes & Potential Bug Risks |
|---|---|---|---|---|
| `src/context/AppContextBase.ts` | 126 | Context Interface Contract | **Reviewed** | Defines `AppContextType` contracts, including legacy aliases (`guests`, `updateGuest`, `employee`). Safe nullability defaults. |
| `src/context/AppContext.tsx` | 712 | Application State Provider | **Reviewed** | Central hub for personas, scenarios, recordings, settings, modals, sheets. **Risk**: `beginSimulation` does not guard against missing or unselected scenario (can throw on undefined scenario). Toast timeouts have no unmount cleanup. |
| `src/context/index.ts` | 3 | Context Barrel Export | **Reviewed** | Re-exports `AppProvider`, `useApp`, `AppContext`. Clean. |
| `src/context/useApp.ts` | 10 | Context Consumer Hook | **Reviewed** | Throws error if used outside `AppProvider`. Clean. |

---

## 4. Screens (7 files)

| File | Lines | Category | Audit Status | Key Review Notes & Potential Bug Risks |
|---|---|---|---|---|
| `src/screens/TodayScreen.tsx` | 1798 | Home Dashboard Screen | **Reviewed** | Complex dashboard with Adaptive Quick Start ResizeObserver, Recent Sessions, Composure Snapshot, MiniTrendSparkline. **Risk**: `quickStartCardRef` observer must guard against disconnected nodes; `allQuickChips` category click references `scenarios[0]` which may be undefined when scenario list is empty. |
| `src/screens/ScenariosScreen.tsx` | 1001 | Scenarios Library & Mine | **Reviewed** | Tabbed scenarios management, search, filtering, card grids. **Risk**: Duplicate key warnings if custom scenario IDs collide; filter chip toggles without debouncing on rapid clicks. |
| `src/screens/RecordingsScreen.tsx` | 1267 | Recordings & Pressure Timeline | **Reviewed** | Master-detail session viewer, Recharts pressure timeline, tabbed analytics, user notes. **Risk**: Notes list mutation without unique IDs; delete confirmation modal backdrop double-click. |
| `src/screens/ProgressScreen.tsx` | 790 | Progress & Composure Analytics | **Reviewed** | Progress aggregates, weekly composure chart, habit milestones. **Risk**: Division by zero if all completed sessions have 0 duration; NaN rendering on empty metrics if not guarded. |
| `src/screens/SignInScreen.tsx` | 494 | Authentication / Profile Screen | **Reviewed** | Standalone auth screen with email inputs and mock sign-in. **Risk**: Keyboard submission on empty input without validation error text. |
| `src/screens/LiveSimulationScreen.tsx` | 656 | Live Rehearsal Simulator | **Reviewed** | Live rehearsal interface, audio waveform visualizer, pause/resume, timer, vitals telemetry. **Risk**: `setInterval` timer leak if component unmounts mid-speech; media tracks must be cleaned up if user navigates away abruptly. |
| `src/screens/ProcessingScreen.tsx` | 106 | Post-Session Synthesis Screen | **Reviewed** | Intermediate transition screen during speech & biometrics processing. **Risk**: Hardcoded 1800ms timeout transition; if service fails, screen hangs indefinitely without error fallback or escape route. |

---

## 5. Sheets & Modals (10 files)

| File | Lines | Category | Audit Status | Key Review Notes & Potential Bug Risks |
|---|---|---|---|---|
| `src/components/common/BaselineSheet.tsx` | 1556 | 60s Optical Baseline Calibration | **Reviewed** | 5-step standalone calibration flow, camera track cleanup, requestAnimationFrame loop, milestone chips. Clean. |
| `src/components/common/BriefingSheet.tsx` | 751 | Pre-Session Briefing Sheet | **Reviewed** | Scenario review, persona selector, objective checklist. **Risk**: If persona has no voice or traits, render throws if accessing `.length` on undefined. |
| `src/components/common/StudioSheet.tsx` | 1210 | Scenario & Persona Creator Sheet | **Reviewed** | Tabbed creation tool (Describe AI draft, Manual scenario, Persona creator). **Risk**: Unsaved changes warning not triggered if dismissed via backdrop click. |
| `src/components/common/QuickPracticeModal.tsx` | 960 | Quick Practice Shortcut Modal | **Reviewed** | Fast 1-click topic practice modal with Describe and Scenarios modes. Clean. |
| `src/components/common/SettingsModal.tsx` | 679 | Application Preferences Modal | **Reviewed** | Device selector (camera, mic, speaker), audio settings, data management. **Risk**: Device enumeration `navigator.mediaDevices.enumerateDevices` fails in sandboxed Electron if camera permissions not yet requested. |
| `src/components/common/CommandPalette.tsx` | 300 | Spotlight Command Palette (⌘K) | **Reviewed** | Global navigation and action launcher. **Risk**: Missing arrow key navigation wrap-around; Escape listener collision with nested sheets. |
| `src/components/common/SignOutConfirmSheet.tsx` | 103 | Sign Out Confirmation Sheet | **Reviewed** | Safe sign out confirmation dialog. Clean. |
| `src/components/common/PersonaPicker.tsx` | 508 | Persona Selection Dropdown/Sheet | **Reviewed** | Reusable counterpart picker. Export alias `GuestPicker` identified as duplicate by knip. |
| `src/components/common/Modal.tsx` | 126 | Generic Modal Surface | **Reviewed** | Unused component identified by knip. Retained for plan documentation. |
| `src/components/common/ErrorBoundary.tsx` | 177 | React Error Boundary | **Reviewed** | Catches render-time errors with recovery button. **Risk**: Does not log errors across IPC to main process or disk. |

---

## 6. Shared Components & Visual Controls (14 files)

| File | Lines | Category | Audit Status | Key Review Notes & Potential Bug Risks |
|---|---|---|---|---|
| `src/App.tsx` | 77 | Root Application Component | **Reviewed** | Screen switcher, CommandPalette, global hotkeys. Wrapped in ErrorBoundary. Clean. |
| `src/components/layout/AppLayout.tsx` | 124 | App Shell Layout | **Reviewed** | TitleBar, sidebar navigation, screen viewports, ToastNotification. Clean. |
| `src/components/layout/TitleBar.tsx` | 554 | macOS Traffic Lights & Title Bar | **Reviewed** | Window controls, mode indicator, search trigger, settings button. Clean. |
| `src/components/common/AudioVisualizer.tsx` | 79 | Audio Level Waveform Bar | **Reviewed** | Canvas-based audio bar. Safe animation frame cleanup. |
| `src/components/common/Badge.tsx` | 136 | Status & Category Pill Badges | **Reviewed** | Variant styling component. Clean. |
| `src/components/common/Button.tsx` | 154 | Standard macOS Button Control | **Reviewed** | Accessible button wrapper. Clean. |
| `src/components/common/Card.tsx` | 55 | Container Card Wrapper | **Reviewed** | Surface styling component. Clean. |
| `src/components/common/CategoryIcon.tsx` | 112 | Scenario Category Icon Helper | **Reviewed** | Maps category strings to Lucide icons with fallback. Clean. |
| `src/components/common/EmptyState.tsx` | 180 | Zero-Data Empty State View | **Reviewed** | High-polish empty state illustrations with actions. Clean. |
| `src/components/common/LoadingSkeleton.tsx` | 63 | Skeleton Placeholder Loader | **Reviewed** | Unused component identified by knip. Clean. |
| `src/components/common/MiniTrendSparkline.tsx` | 214 | 64px Mini Trend Sparkline | **Reviewed** | Responsive Recharts sparkline for Home screen. Clean. |
| `src/components/common/PressureTimelineChart.tsx` | 590 | Analytics Timeline Chart | **Reviewed** | Recharts multi-line pressure graph in Recordings screen. Clean. |
| `src/components/common/ScoreRing.tsx` | 121 | Circular Composure Score Ring | **Reviewed** | SVG score ring with stroke offset animation. Clean. |
| `src/components/common/ToastNotification.tsx` | 66 | Global Notification Banner | **Reviewed** | Floating bottom-right toast with action button. Clean. |

---

## 7. Styles & Design Tokens (4 files)

| File | Lines | Category | Audit Status | Key Review Notes & Potential Bug Risks |
|---|---|---|---|---|
| `src/styles/tokens.css` | 83 | Design Tokens & System Colors | **Reviewed** | Defines Dark Xcode graphite palette, accent colors, radius, shadows. Clean. |
| `src/styles/theme.css` | 28 | Theme Utilities | **Reviewed** | Global theme overrides. Clean. |
| `src/styles/index.css` | 280 | Global Styles & Mac Reset | **Reviewed** | Window styling, scrollbar hiding, typography scale. Clean. |
| `src/App.css` | 184 | App Layout & Transitions | **Reviewed** | Fade-in transitions and glass surfaces. Clean. |

---

## 8. Services & Data Layer (12 files)

| File | Lines | Category | Audit Status | Key Review Notes & Potential Bug Risks |
|---|---|---|---|---|
| `src/services/api/types.ts` | 127 | Service Contracts | **Reviewed** | Clean interfaces for `ScenarioService`, `PersonaService`, `SessionService`, `BiometricsService`, `ProgressService`. |
| `src/services/api/emptyAdapters.ts` | 417 | Local Adapters | **Reviewed** | In-memory & LocalStorage fallback adapters. Standalone optical baseline implementation. Clean. |
| `src/services/api/registry.ts` | 29 | Service Registry | **Reviewed** | Singleton registry providing service instances. Clean. |
| `src/services/api/index.ts` | 3 | API Barrel Export | **Reviewed** | Re-exports registry and types. Clean. |
| `src/services/biometrics.ts` | 659 | Biometrics Engine Simulator | **Reviewed** | Legacy prototype simulator. Contains unused classes flagged by knip. Retained for mock fallback. |
| `src/services/migration.ts` | 64 | Local Storage Migration | **Reviewed** | Versioned migration from legacy hotel coach keys to mocktwo. Clean. |
| `src/services/migration.test.ts` | 64 | Migration Unit Tests | **Reviewed** | Tests localStorage key renaming and defaults. Clean. |
| `src/services/timelineAdapter.ts` | 255 | Pressure Timeline Transformer | **Reviewed** | Converts raw session recordings into Recharts timeline dataset. Clean. |
| `src/services/timelineAdapter.test.ts` | 240 | Timeline Adapter Tests | **Reviewed** | Tests data contracts, downsampling, and null safety. Clean. |
| `src/services/trendChart.ts` | 39 | Mini Trend Data Formatter | **Reviewed** | Formats session points for sparkline. Clean. |
| `src/services/trendChart.test.ts` | 43 | Trend Chart Tests | **Reviewed** | Tests formatting and empty states. Clean. |
| `src/services/weekStats.ts` | 189 | Weekly Activity Aggregator | **Reviewed** | Calculates streak and daily practice minutes. Clean. |
| `src/services/weekStats.test.ts` | 268 | Week Stats Unit Tests | **Reviewed** | Tests Monday-start week calculations, goal progress, and streaks. Clean. |

---

## 9. Types & Models (1 file)

| File | Lines | Category | Audit Status | Key Review Notes & Potential Bug Risks |
|---|---|---|---|---|
| `src/types/index.ts` | 576 | Application Domain Types | **Reviewed** | UserProfile, Persona, PracticeScenario, Recording, Vitals, Baseline, AppSettings. Contains backward-compatibility aliases. Clean. |

---

## 10. Test Suites & Fixtures (4 files)

| File | Lines | Category | Audit Status | Key Review Notes & Potential Bug Risks |
|---|---|---|---|---|
| `tests/bannedStrings.test.ts` | 68 | Static Policy Tests | **Reviewed** | Asserts zero banned strings (no fake names, Math.random) in `src/`. Clean. |
| `tests/baselineState.test.ts` | 131 | Baseline State Tests | **Reviewed** | Tests standalone local biometrics and track cleanup. Clean. |
| `tests/emptyStateCtas.test.ts` | 60 | UI Contract Tests | **Reviewed** | Tests CTA deduplication in empty states. Clean. |
| `tests/fixtures/mockData.ts` | 1411 | Static Test Fixtures | **Reviewed** | Isolated test fixtures for Playwright and mock data testing. Clean. |
