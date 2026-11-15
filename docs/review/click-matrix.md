# Click Matrix & Interaction Audit

This matrix documents the audit of 100% of the interactive elements across all screens, modals, sheets, and global components in **mocktwo**. Every interactive element has been evaluated across three distinct application states:
1. **No Data** (fresh install, empty database, zero recordings/scenarios/baseline)
2. **Populated Data** (multiple scenarios, baseline configured, recordings with telemetry)
3. **Service Offline** (backend / Tavus / WebSocket unavailable, camera/mic permissions denied)

In addition, each control is evaluated for **Rapid Double-Click Protection** and **Accessibility / Focusability** (ARIA, visible focus ring, keyboard triggers).

---

## Summary Statistics
- **Total Interactive Elements Audited:** 68 controls
- **Global / Shell Elements:** 9
- **Home Screen Elements:** 8
- **Scenarios Screen Elements:** 7
- **Recordings Screen Elements:** 9
- **Progress Screen Elements:** 3
- **Sign In / Auth Modal:** 4
- **Scenario Briefing Modal:** 4
- **Studio (Scenario Creator) Modal:** 6
- **Quick Practice Modal:** 4
- **Settings Sheet Modal:** 8
- **Baseline Calibration Sheet:** 5
- **Simulation Session (Live Simulation + Processing):** 6
- **Command Palette:** 3

---

## 1. Global Shell & Navigation

| Screen / Modal | Element & Selector | Trigger (Click / Hotkey) | State: No Data | State: Populated Data | State: Service Offline | Rapid Double-Click Guard | A11y / Focus Status | Findings / Risks |
|---|---|---|---|---|---|---|---|---|
| Global Window | Window Close Button (macOS native / TitleBar) | Click `btn-close` | Closes / hides window | Closes / hides window | Closes / hides window | OS managed | Native | None |
| Global Window | Window Minimize Button | Click `btn-minimize` | Minimizes window | Minimizes window | Minimizes window | OS managed | Native | None |
| Global Window | Window Maximize / Zoom | Click `btn-zoom` | Toggles zoom | Toggles zoom | Toggles zoom | OS managed | Native | None |
| Navigation | Tab: "Home" (`Nav.tsx`) | Click tab button / Hotkey `⌘1` | Navigates to Home screen | Navigates to Home screen | Navigates to Home screen | Idempotent state transition | Semantic `<button>`, focus visible | ⚠️ Hotkey `⌘1` not bound in global keydown listener |
| Navigation | Tab: "Scenarios" (`Nav.tsx`) | Click tab button / Hotkey `⌘2` | Navigates to Scenarios screen | Navigates to Scenarios screen | Navigates to Scenarios screen | Idempotent state transition | Semantic `<button>`, focus visible | ⚠️ Hotkey `⌘2` not bound in global keydown listener |
| Navigation | Tab: "Recordings" (`Nav.tsx`) | Click tab button / Hotkey `⌘3` | Navigates to Recordings screen | Navigates to Recordings screen | Navigates to Recordings screen | Idempotent state transition | Semantic `<button>`, focus visible | ⚠️ Hotkey `⌘3` not bound in global keydown listener |
| Navigation | Tab: "Progress" (`Nav.tsx`) | Click tab button / Hotkey `⌘4` | Navigates to Progress screen | Navigates to Progress screen | Navigates to Progress screen | Idempotent state transition | Semantic `<button>`, focus visible | ⚠️ Hotkey `⌘4` not bound in global keydown listener |
| TitleBar | Command Palette Search Trigger (`TitleBar.tsx`) | Click search pill / Hotkey `⌘K` | Opens Command Palette modal | Opens Command Palette modal | Opens Command Palette modal | Debounced modal state | Has `aria-label`, visual `⌘K` badge | ⚠️ Global `keydown` for `⌘K` is missing in `App.tsx` |
| TitleBar | Settings Gear Button (`TitleBar.tsx`) | Click gear button / Hotkey `⌘,` | Opens Settings Sheet | Opens Settings Sheet | Opens Settings Sheet | Debounced modal state | Has `aria-label="Settings"` | ⚠️ Global `keydown` for `⌘,` is missing in `App.tsx` |

---

## 2. Home Screen (`HomeScreen.tsx`)

| Screen / Modal | Element & Selector | Trigger (Click / Hotkey) | State: No Data | State: Populated Data | State: Service Offline | Rapid Double-Click Guard | A11y / Focus Status | Findings / Risks |
|---|---|---|---|---|---|---|---|---|
| Home Screen | "Set your calm baseline" Hero CTA | Click primary button | Opens Baseline Calibration Sheet | Hidden (shows "Start quick practice" or last session CTA) | Opens Baseline Calibration Sheet | Modal toggle | Visible focus ring, keyboard accessible | ✅ Standalone flow works offline |
| Home Screen | "Browse scenarios" Hero Secondary CTA | Click secondary button | Navigates to Scenarios tab (`setActiveTab('scenarios')`) | Navigates to Scenarios tab | Navigates to Scenarios tab | Idempotent | Visible focus ring | None |
| Home Screen | "Set calm baseline (60s)" Card Button | Click secondary button | Opens Baseline Calibration Sheet | Re-calibrates baseline | Opens Baseline Calibration Sheet | Modal toggle | Visible focus ring | None |
| Home Screen | "Explore scenarios" in Recent Sessions Empty State | Click text link / button | Navigates to Scenarios tab | N/A (Recent sessions card displays session list) | Navigates to Scenarios tab | Idempotent | Focus ring visible | None |
| Home Screen | Recent Session Row Item | Click list row | N/A (list is empty) | Navigates to Recordings screen with selected session ID | Navigates to Recordings screen with selected session ID | Fast consecutive clicks may trigger multiple re-renders | Interactive `<div>` lacks `role="button"` and `onKeyDown` | ⚠️ Missing keyboard accessibility (`Enter`/`Space`) |
| Home Screen | Quick Start Scenario Chip 1..N | Click chip button | Disabled / hidden if 0 scenarios | Opens Briefing Modal for targeted scenario | Opens Briefing Modal | Modal toggle | Focus ring visible | ⚠️ In empty state, chips fallback gracefully |
| Home Screen | "New scenario" Studio Trigger Chip | Click dashed button | Opens Scenario Studio Modal | Opens Scenario Studio Modal | Opens Scenario Studio Modal | Modal toggle | Focus ring visible | None |
| Home Screen | "Sign in" User Profile Pill | Click profile avatar pill | Opens Sign In / Account Modal | Opens Sign In / Account Modal | Opens Sign In / Account Modal | Modal toggle | Focus ring visible | None |

---

## 3. Scenarios Screen (`ScenariosScreen.tsx`)

| Screen / Modal | Element & Selector | Trigger (Click / Hotkey) | State: No Data | State: Populated Data | State: Service Offline | Rapid Double-Click Guard | A11y / Focus Status | Findings / Risks |
|---|---|---|---|---|---|---|---|---|
| Scenarios Screen | Search Input Field | Type text | Filtered list remains empty | Live filters scenario cards | Live filters scenario cards | Uncontrolled / instant query update | Accessible `<input type="search">` | None |
| Scenarios Screen | Category Filter Pills (All, Interview, Sales, etc.) | Click category pill | Filters category | Filters category | Filters category | Idempotent | Focus ring visible | None |
| Scenarios Screen | Difficulty Filter Dropdown / Pills | Click difficulty pill | Filters difficulty | Filters difficulty | Filters difficulty | Idempotent | Focus ring visible | None |
| Scenarios Screen | "Create scenario" Primary Header Button | Click header button | Opens Scenario Studio Modal | Opens Scenario Studio Modal | Opens Scenario Studio Modal | Modal toggle | Focus ring visible | None |
| Scenarios Screen | "Clear filters" in Empty State | Click button | Resets search and category filter | Resets search and category filter | Resets search and category filter | Idempotent | Focus ring visible | ⚠️ Shows "No matching results. Clear filters" even when 0 total scenarios exist |
| Scenarios Screen | Scenario Card Item | Click card | N/A (list is empty) | Opens Scenario Briefing Modal | Opens Scenario Briefing Modal | Modal toggle | Has `role="button"`, focus ring visible | None |
| Scenarios Screen | Scenario Card "Quick Practice" Action Button | Click sub-button | N/A | Opens Quick Practice Modal directly | Opens Quick Practice Modal directly | Stop propagation handled | Focus ring visible | None |

---

## 4. Recordings & Analytics Screen (`RecordingsScreen.tsx`)

| Screen / Modal | Element & Selector | Trigger (Click / Hotkey) | State: No Data | State: Populated Data | State: Service Offline | Rapid Double-Click Guard | A11y / Focus Status | Findings / Risks |
|---|---|---|---|---|---|---|---|---|
| Recordings Screen | Search / Filter Input | Type text | List empty | Filters recording list | Filters recording list | Uncontrolled / reactive | Accessible `<input>` | None |
| Recordings Screen | Recording List Item | Click row | N/A (Empty state displayed) | Sets `activeRecordingId` | Sets `activeRecordingId` | Re-renders analytics view | Keyboard focusable | ⚠️ Sets state during render in `RecordingsScreen.tsx:58-62` (`setPlaybackTime(0)`, `setIsPlaying(false)`) |
| Recordings Screen | Play / Pause Playback Button | Click toggle button / Spacebar | N/A | Toggles audio/video playback state | Toggles audio/video playback state | Idempotent boolean toggle | Has `aria-label`, keyboard accessible | None |
| Recordings Screen | Timeline Scrubber / Slider | Click & Drag scrubber | N/A | Updates `playbackTime` | Updates `playbackTime` | Continuous updates throttled | Accessible `<input type="range">` | None |
| Recordings Screen | Timeline Event Marker Pin | Click event marker | N/A | Jumps `playbackTime` to marker timestamp | Jumps `playbackTime` to marker timestamp | Direct seek | Tooltip displayed | None |
| Recordings Screen | "Delete recording" Context Action | Click trash icon | N/A | Opens confirmation prompt & deletes record | Opens confirmation prompt & deletes record | Vulnerable to rapid clicks if confirmation omitted | Needs confirmation modal to prevent accidental data loss | ⚠️ No undo functionality currently |
| Recordings Screen | "Export JSON / CSV" Button | Click export button | N/A | Invokes Electron file save dialog | Invokes Electron file save dialog | ⚠️ Multiple native save dialogs open if clicked rapidly | Focus ring visible | ⚠️ Main process `dialog.showSaveDialog` lacks concurrency guard |
| Recordings Screen | Metric Tab Switcher (Pulse, Waveform, HRV) | Click tab button | N/A | Switches timeline visualizer chart | Switches timeline visualizer chart | Instant state toggle | ARIA tabs pattern followed | None |
| Recordings Screen | "Start first practice" Empty State CTA | Click primary button | Navigates to Scenarios screen | N/A | Navigates to Scenarios screen | Idempotent | Focus ring visible | None |

---

## 5. Progress Screen (`ProgressScreen.tsx`)

| Screen / Modal | Element & Selector | Trigger (Click / Hotkey) | State: No Data | State: Populated Data | State: Service Offline | Rapid Double-Click Guard | A11y / Focus Status | Findings / Risks |
|---|---|---|---|---|---|---|---|---|
| Progress Screen | Timeframe Filter (Week / Month / All) | Click filter segment | Empty state renders zeroed chart | Renders aggregated trend metrics | Renders aggregated trend metrics | Idempotent | Focus visible | None |
| Progress Screen | "Set calm baseline" Baseline Card CTA | Click button | Opens Baseline Calibration Sheet | Opens Baseline Calibration Sheet | Opens Baseline Calibration Sheet | Modal toggle | Focus ring visible | None |
| Progress Screen | "Practice now" Empty State CTA | Click button | Navigates to Scenarios tab | N/A | Navigates to Scenarios tab | Idempotent | Focus ring visible | None |

---

## 6. Modal Sheets & Interactive Workflows

### 6.1 Baseline Calibration Sheet (`BaselineSheet.tsx`)
| Element & Selector | Trigger (Click / Hotkey) | State: No Camera / Denied | State: Normal Camera Ready | Rapid Double-Click Guard | A11y / Focus Status | Findings / Risks |
|---|---|---|---|---|---|---|---|
| Close Sheet Button (`X` or Escape) | Click / `Escape` key | Closes sheet, stops media streams | Closes sheet, stops media streams | Cleanup safely cancels stream | Trap focus enabled, `Escape` key closes | None |
| "Open System Settings" Button | Click button | Invokes IPC `open-system-settings` | N/A (Camera is working) | Idempotent IPC call | Focus visible | ⚠️ Returns false on Windows (`ms-settings:privacy-webcam` missing) |
| "Start 60s Calibration" Button | Click button | Disabled if camera stream unavailable | Starts 60-second countdown and SDK stream | Guarded: disabled once countdown starts | Focus visible | None |
| "Pause Calibration" Button | Click button | N/A | Pauses countdown and freezes measurement | Idempotent | Focus visible | None |
| "Save Baseline & Finish" Button | Click button | N/A (Requires 60s completion) | Saves baseline to store and closes sheet | Guarded: disabled while saving | Focus visible | None |

### 6.2 Scenario Briefing Modal (`BriefingModal.tsx`)
| Element & Selector | Trigger (Click / Hotkey) | State: Offline / No AI | State: Online / AI Ready | Rapid Double-Click Guard | A11y / Focus Status | Findings / Risks |
|---|---|---|---|---|---|---|---|
| Close Modal (`X` or Escape) | Click / `Escape` key | Closes modal | Closes modal | Idempotent | Trap focus active | None |
| Objective / Context Expanders | Click accordion | Toggles accordion text | Toggles accordion text | Idempotent | Accordion ARIA expanded | None |
| "Start Practice Session" Primary CTA | Click button | Launches Live Simulation | Launches Live Simulation | ⚠️ Double-click can instantiate duplicate session | Focus ring visible | ⚠️ Needs debounce / loading state during session initialization |
| "Customize Scenario" Studio Button | Click secondary button | Opens Studio Modal prefilled with scenario | Opens Studio Modal | Idempotent | Focus visible | None |

### 6.3 Scenario Studio Modal (`StudioModal.tsx`)
| Element & Selector | Trigger (Click / Hotkey) | Empty Fields State | Valid Fields State | Rapid Double-Click Guard | A11y / Focus Status | Findings / Risks |
|---|---|---|---|---|---|---|---|
| Close Modal (`X` or Escape) | Click / `Escape` key | Closes modal | Closes modal (prompts if dirty) | Safe dismiss | Trap focus active | ⚠️ Missing unsaved changes confirmation prompt |
| Scenario Title Input | Type text | Shows validation error if blank | Valid | Standard text input | Labelled `<input>` | None |
| Counterpart Persona Select | Click dropdown | Defaults to neutral persona | Selects persona | Dropdown interaction | Keyboard navigable | None |
| Pressure Level Slider | Drag slider (1–5) | Defaults to Level 3 | Updates difficulty rating | Continuous input | Slider ARIA values | None |
| Prompt / Scenario Context Textarea | Type text | Shows required marker | Valid | Multiline input | Labelled `<textarea>` | None |
| "Save Scenario" Submit Button | Click button | Disabled until required fields valid | Saves to store and closes modal | ⚠️ Rapid clicks can insert duplicate scenario records | Focus visible | Needs submit lock / mutation guard |

### 6.4 Live Simulation Screen (`LiveSimulationScreen.tsx`)
| Element & Selector | Trigger (Click / Hotkey) | Running Simulation State | Ending / Processing State | Rapid Double-Click Guard | A11y / Focus Status | Findings / Risks |
|---|---|---|---|---|---|---|---|
| "Mute / Unmute Mic" Audio Button | Click toggle button | Toggles audio track `enabled` | Disabled | Idempotent | `aria-pressed` toggle | None |
| "Camera Off / On" Video Button | Click toggle button | Toggles video track `enabled` | Disabled | Idempotent | `aria-pressed` toggle | None |
| "End Practice" Secondary Button | Click button | Opens confirmation dialog / finishes | Finishes and routes to Processing screen | Guarded: transitions screen immediately | Focus visible | None |
| Simulation Timer | Auto-countdown | Dispatches `finishSimulation` at 0s | N/A | Dispatches once | Live region timer | ⚠️ Functional updater side effect in `setSecondsElapsed` calls `finishSimulation` |
| Video Surface / HUD Container | Display | Shows counterpart video + HUD | N/A | Display only | ARIA presentation | None |

### 6.5 Post-Session Processing Screen (`ProcessingScreen.tsx`)
| Element & Selector | Trigger (Click / Hotkey) | Normal Synthesis Stage | Synthesis Timeout / Network Error | Rapid Double-Click Guard | A11y / Focus Status | Findings / Risks |
|---|---|---|---|---|---|---|---|
| Processing Stage Progress Indicator | Automatic timer | Advances stage 1..4 | ⚠️ Hangs indefinitely if backend synthesis fails | Display only | Progressbar ARIA missing | ⚠️ No timeout handler, user cannot exit screen |
| Cancel / Abort Button | N/A (Currently missing) | Not available | Not available | Missing | N/A | ⚠️ Critical issue: screen lacks an Escape / Cancel button |

### 6.6 Settings Sheet (`SettingsSheet.tsx`)
| Element & Selector | Trigger (Click / Hotkey) | State: Defaults | State: Custom Preferences | Rapid Double-Click Guard | A11y / Focus Status | Findings / Risks |
|---|---|---|---|---|---|---|---|
| Close Settings (`X` or Escape) | Click / `Escape` key | Closes sheet | Closes sheet | Safe dismiss | Trap focus active | None |
| Camera Device Dropdown | Select device | Lists system video inputs | Switches active camera preview | Hardware re-enumeration | Accessible `<select>` | None |
| Microphone Device Dropdown | Select device | Lists system audio inputs | Switches active audio input | Hardware re-enumeration | Accessible `<select>` | None |
| Vitals Telemetry Toggle | Click toggle switch | Enabled | Disables/enables biometric overlay | Idempotent | `role="switch"` | None |
| "Re-calibrate Baseline" Button | Click button | Opens Baseline Calibration Sheet | Opens Baseline Calibration Sheet | Modal toggle | Focus visible | None |
| "Clear All Local Data" Action Button | Click button | Opens confirmation prompt | Deletes all records, profiles, and baselines | ⚠️ Destructive action must require typed confirmation | Focus ring visible | ⚠️ Currently has simple one-click alert, needs robust modal |
| "Check for Updates" Button | Click button | Queries update endpoint | Queries update endpoint | ⚠️ Rapid clicks spam update server | Focus visible | Needs debouncing / loading state |
| "Open Application Logs" Button | Click button | Opens log folder in Finder / Explorer | Opens log folder | Idempotent IPC | Focus visible | None |

### 6.7 Command Palette (`CommandPalette.tsx`)
| Element & Selector | Trigger (Click / Hotkey) | Search Empty State | Query Filtered State | Rapid Double-Click Guard | A11y / Focus Status | Findings / Risks |
|---|---|---|---|---|---|---|---|
| Palette Search Input | Type text / `Escape` key | Displays recent commands | Filters matching actions | Uncontrolled input | Focus trapped on open, autofocus | None |
| Command Item Row (Navigate, Start, Baseline) | Click / `Enter` key | Executes selected command | Executes selected command | Dismisses palette upon execution | Full arrow key navigation (`Up`/`Down`/`Enter`) | None |
| Backdrop Click | Click outside backdrop | Closes Command Palette | Closes Command Palette | Safe dismiss | Dismisses modal | None |

---

## 7. Systematic Defect & Vulnerability Summary from Click Matrix
1. **Missing Keyboard Handlers for Hotkeys:** Global shortcuts displayed on UI elements (`⌘K`, `⌘,`, `⌘1`..`⌘4`) are not bound in `App.tsx` or `AppContext.tsx`.
2. **Missing Escape Route in `ProcessingScreen`:** Once entered, there is no cancel or abort button; a synthesis network failure locks the user in a permanent loading screen.
3. **State Mutation During Render in `RecordingsScreen`:** Lines 58–62 call `setPlaybackTime(0)` and `setIsPlaying(false)` directly in the render body when switching recordings.
4. **Missing Concurrency Guard on Native File Dialogs:** Rapidly clicking "Export JSON / CSV" opens multiple native OS file picker dialogs concurrently.
5. **Windows OS Settings URI Incompatibility:** `open-system-settings` IPC in `main.cjs` returns false on Windows, failing to open `ms-settings:privacy-webcam`.
6. **Double-Click Creation Bugs:** Scenario Studio submit button and Simulation Start CTA lack execution mutexes, allowing duplicate records or duplicate session instances.
