# Implementation Log & Audit Finding Resolution

This document tracks the status of every finding from the code audit and brief during the implementation of the mocktwo hardening and permissions plan.

| Finding ID | Title / Target Area | Status | Files Changed | Tests Added / Verification Method |
|---|---|---|---|---|
| **HC-AUDIT-001** | ProcessingScreen trapped on synthesis drop / fake step timer | Fixed | `src/screens/ProcessingScreen.tsx` | Removed fake step timer. Driven by real session state (`processing`, `ready`, `error`, `cancelled`). Added timeout, retry, cancel, Escape key handling, and exit paths. Verified in unit tests. |
| **HC-AUDIT-002** | Synchronous file I/O on window resize/move in main.cjs | Pending (Phase 2) | `electron/main.cjs` | Debounce benchmark test |
| **HC-AUDIT-003** | Non-functional global keyboard shortcuts (⌘K, ⌘,, ⌘1..4) | Fixed | `src/hooks/useGlobalShortcuts.ts`, `src/components/layout/AppLayout.tsx` | Added window keydown and menu bridge fallback for `⌘/Ctrl+K`, `⌘/Ctrl+,`, `⌘/Ctrl+Shift+P`, `⌘/Ctrl+1..4`. |
| **HC-AUDIT-004** | Direct state mutation during render in RecordingsScreen.tsx | Fixed | `src/screens/RecordingsScreen.tsx` | Removed render-time `setState` and `prevRecId` mutation. Cleanly reset playback state inside recording selection and close handlers. Oxlint passed with 0 warnings. |
| **HC-AUDIT-005** | Windows settings URI incompatibility in open-system-settings IPC | Pending (Phase 2/4)| `electron/main.cjs` | Platform mock unit test |
| **HC-AUDIT-006** | Unhandled Electron renderer crashes & process failures | Pending (Phase 2) | `electron/main.cjs` | Process crash dialog test |
| **HC-AUDIT-007** | LiveSimulationScreen timer side-effect in state updater | Fixed | `src/screens/LiveSimulationScreen.tsx` | Replaced interval tick increment with monotonic `performance.now()` clock. Clamped elapsed time and guarded `finishSimulation` with `hasFinishedRef.current`. Verified in strict mode. |
| **HC-AUDIT-008** | Dev mode IPv4/IPv6 localhost mismatch | Pending (Phase 2) | `electron/main.cjs` | Verified 127.0.0.1 host binding |
| **HC-AUDIT-009** | Misleading empty search state on Scenarios screen | Fixed | `src/screens/ScenariosScreen.tsx` | Differentiated zero-scenario database from filtered search empty state. Shows "Create scenario" CTA when empty. |
| **HC-AUDIT-010** | Re-entrancy guards missing on Export, Studio Save, Start | Fixed | `src/components/common/StudioSheet.tsx`, `src/components/common/BriefingSheet.tsx` | Added `isSaving` mutex to Studio scenario/persona save handlers and `countdown !== null` guard on Briefing start. |
| **HC-AUDIT-011** | Unhandled rejection in AudioContext teardown | Fixed | `src/services/biometrics.ts` | Cleaned up biometrics service, removed simulator mocks. |
| **HC-AUDIT-012** | Uncancelled video frame animation in BaselineSheet | Already Fine | `src/components/common/BaselineSheet.tsx` | Verified lines 91-99 already cancel RAF and stop stream. |
| **HC-AUDIT-013** | Video element stream leak on practice abort | Fixed | `src/screens/LiveSimulationScreen.tsx` | Camera stream tracks verified cleaned and unmount safe. |
| **HC-AUDIT-014** | Studio dirty-form confirmation on Escape / backdrop / close | Fixed | `src/components/common/StudioSheet.tsx` | Added dirty state detection and modal confirmation before discarding unsaved scenario/persona drafts. |
| **HC-AUDIT-015** | Keyboard accessibility on Recent Sessions rows | Already Fine | `src/screens/TodayScreen.tsx` | Verified rows have `role="button"`, `tabIndex={0}`, and `handleRowKeyDown`. |
| **HC-AUDIT-016** | Usage strings in Info.plist | Already Fine | `package.json` | Verified extendInfo has camera & mic usage strings. |
| **HC-AUDIT-017** | Dead code and unused exports | Fixed | Deleted `LoadingSkeleton.tsx`, `Modal.tsx`. Cleaned unused types and internal exports. | Knip and compiler validation. |
| **HC-MOCK-CLEANUP**| Remove MockBiometricsProvider & fake sign-in & hotel aliases | Fixed | `src/services/biometrics.ts`, `src/services/api/emptyAdapters.ts`, `src/screens/SignInScreen.tsx`, `src/types/index.ts`, `src/context/AppContextBase.ts`, `src/context/AppContext.tsx` | Removed MockBiometricsProvider from `src/`. EmptyAuthService rejects without backend. Hotel-era aliases removed. `tests/bannedStrings.test.ts` passes. |
| **HC-INVENTORY-RISKS**| Fix TodayScreen scenarios[0], toast unmount, Progress NaN, Briefing persona undefined, ErrorBoundary logging | Fixed | `src/screens/TodayScreen.tsx`, `src/context/AppContext.tsx`, `src/screens/ProgressScreen.tsx`, `src/components/common/BriefingSheet.tsx`, `src/components/common/ErrorBoundary.tsx`, `src/App.tsx` | Handled empty scenarios array, toast unmount cleanup, dynamic progress averages without NaN, fallback persona in Briefing, and ErrorBoundary IPC logging. |
