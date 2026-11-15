# Tool Verification and Static Analysis Results

Date: 2026-11-15  
Environment: macOS (Darwin arm64), Node.js v26.13.0, TypeScript v7.0.2, Vite v8.3.8

---

## 1. Oxlint Static Analysis
- **Command**: `npx oxlint src`
- **Rules evaluated**: 116 linting rules (including `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`, `react/set-state-in-effect`, and ESLint standard rules)
- **Scope**: 50 files in `src/`
- **Result**:
  ```text
  Found 0 warnings and 0 errors.
  Finished in 84ms on 50 files with 116 rules using 10 threads.
  ```
- **Finding confirmation**: No lingering React hook dependency violations or state-in-effect issues detected in renderer code.

---

## 2. TypeScript Compilation & Strict Mode
- **Commands**:
  - `npx tsc -b --noEmit`
  - `npx tsc --noEmit --strict`
- **Result**:
  ```text
  Exit code: 0 (No type errors)
  ```
- **Finding confirmation**: All TypeScript types across models, services, contexts, and screens resolve cleanly without compilation errors under strict type checking.

---

## 3. Dependency Vulnerability Audit (`npm audit`)
- **Command**: `npm audit`
- **Result**:
  - Identified **6 moderate severity vulnerabilities** in transitive dependency:
    - `minimatch` (7.0.0 - 11.0.0): Potential denial of service via globparts amplification (GHSA-g3hv-75wg-m249).
    - Chain: `electron-builder` (devDependency) -> `dmg-builder` / `electron-builder-squirrel-windows` -> `app-builder-lib` -> `@electron/universal` -> `minimatch`.
  - **Assessment**: The vulnerability is confined to desktop packaging tooling (`electron-builder`) and does not affect the production runtime bundle shipped to end users.
  - **Fix Recommendation**: Upgrade `electron-builder` to latest release once stable, or specify `overrides` for `minimatch: "^11.0.1"`.

---

## 4. Dead Code & Unused Exports Analysis (`knip`)
- **Command**: `npx -y knip --no-exit-code`
- **Key Findings**:
  - **Unused Component Files**:
    - `src/components/common/LoadingSkeleton.tsx` (generic skeleton loader not currently mounted in any active screen)
    - `src/components/common/Modal.tsx` (generic modal surface replaced by specialized sheets: `BriefingSheet`, `StudioSheet`, `BaselineSheet`, `SettingsModal`)
  - **Unused Component Exports**:
    - `BaselineSheetModal` in `src/components/common/BaselineSheet.tsx` (internal component; exported wrapper is `BaselineSheet`)
    - `GuestPicker` alias in `src/components/common/PersonaPicker.tsx`
  - **Unused Service Functions & Classes**:
    - `createDefaultServiceRegistry` in `src/services/api/registry.ts`
    - `DEFAULT_USER_BASELINE`, `MockBiometricsProvider`, `CameraEstimateProvider`, `calculateComposureScore` in `src/services/biometrics.ts` (legacy biometric simulator classes from early prototype)
    - `CURRENT_DATA_VERSION`, `DATA_VERSION_KEY` in `src/services/migration.ts`
    - `WEEK_START_DAY`, `toLocalDateString`, `isCompletedSession`, `getStartOfWeek`, `computeStreak` in `src/services/weekStats.ts`
    - `formatRoomNumber`, `getCompatibleGuests` in `src/types/index.ts`
  - **Unused Type Declarations**:
    - `BadgeVariant`, `ButtonVariant`, `ButtonSize`, `EmptyStateAction`, `GuestPickerProps`, `ServiceStatus`, `ServiceResult`, `BiometricsProvider`, `TrendSessionPoint`, `WeekDayStat`, `ScenarioSource`, `SubmissionStatus`, `ArterialWaveformPoint`, `GuestScenario`, `TranscriptUtterance`, `CoachingNoteItem`, `RecordingUserNote`, `CoachingHeldSteadyItem`, `CoachingStrainItem`, `CounterpartHandlingItem`, `PracticeDrill`, `RecordingPressureCoaching`.
  - **Duplicate Exports**:
    - `App|default` in `src/App.tsx`
    - `PersonaPicker|GuestPicker` in `src/components/common/PersonaPicker.tsx`
    - `formatContextSetting|formatRoomNumber` in `src/types/index.ts`
    - `getCompatiblePersonas|getCompatibleGuests` in `src/types/index.ts`

---

## 5. Circular Dependency Analysis (`madge`)
- **Command**: `npx -y madge --circular --extensions ts,tsx src/`
- **Result**:
  ```text
  - Finding files
  Processed 54 files (341ms) 
  ✔ No circular dependency found!
  ```
- **Finding confirmation**: Module graph is completely acyclic. No circular import loops between context, services, screens, and components.

---

## 6. Electronegativity AST Scanner Analysis
- **Command**: `npx -y @doyensec/electronegativity -i electron/main.cjs`
- **Result**: Electronegativity v1.10.3 crashed during startup due to internal `got` v11 / `p-cancelable` incompatibility on Node.js v26.13.0 (`The onCancel handler was attached after the promise settled` when attempting to query GitHub for Electron releases).
- **Manual AST Security Review**:
  In place of the broken tool, manual review was conducted against the 42 Electronegativity AST checks and the official Electron Security Checklist:
  - `nodeIntegration`: Disabled (`false`) in `webPreferences`.
  - `contextIsolation`: Enabled (`true`) in `webPreferences`.
  - `sandbox`: Enabled (`true`) in `webPreferences`.
  - `webSecurity`: Enabled (`true`).
  - `allowRunningInsecureContent`: Disabled (`false`).
  - `enableRemoteModule`: Disabled (removed in Electron 14+).
  - Navigation handlers: `will-navigate` blocks non-app URLs.
  - Window open handlers: `setWindowOpenHandler` blocks external popups and routes external links to system browser via `shell.openExternal`.
  - **Flagged Finding**: CSP header in `index.html` permits `connect-src 'self' http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:*`. This is essential for Vite HMR in development, but must be hardened in production packaged builds to `connect-src 'self'`.

---

## 7. Test Suite Execution
- **Command**: `node --test tests/*.test.ts`
- **Result**:
  ```text
  ✔ src/ directory contains zero banned strings (no fake names, no Math.random, no mockData, no INITIAL_) (16.5ms)
  ✔ Baseline State and Biometrics Service Contract (2.09ms)
  ✔ Empty State Duplicate CTA Prevention (1.76ms)
  ℹ tests 8, suites 2, pass 8, fail 0
  ```
- **Finding confirmation**: Core baseline contract, banned strings policy, and CTA deduplication assertions pass 100%.
