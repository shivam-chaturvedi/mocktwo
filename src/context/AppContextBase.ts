import { createContext } from "react";
import type {
  Screen,
  Guest,
  GuestScenario,
  EmployeeProfile,
  Recording,
  AppSettings
} from "../types";

export interface AppContextType {
  currentScreen: Screen;
  navigateTo: (screen: Screen) => void;
  isAuthenticated: boolean;
  signIn: (email: string) => void;
  signOut: () => void;
  employee: EmployeeProfile;
  updateEmployee: (profile: Partial<EmployeeProfile>) => void;
  
  // Guests
  guests: Guest[];
  addGuest: (guest: Guest) => void;
  updateGuest: (guest: Guest) => void;
  deleteGuest: (id: string) => { success: boolean; reason?: string };

  // Scenarios
  scenarios: GuestScenario[];
  selectedScenario: GuestScenario;
  selectScenario: (scenario: GuestScenario) => void;
  addScenario: (scenario: GuestScenario) => void;
  updateScenario: (scenario: GuestScenario) => void;
  deleteScenario: (id: string) => void;
  duplicateScenario: (id: string) => void;
  submitScenarioToLibrary: (id: string) => void;
  
  // Briefing modal sheet
  isBriefingOpen: boolean;
  openBriefing: (scenario?: GuestScenario, guestId?: string) => void;
  closeBriefing: () => void;
  activeSessionGuest: Guest | null;
  setSessionGuest: (guest: Guest | null) => void;
  
  // Live simulation session
  beginSimulation: (overrideGuest?: Guest) => void;
  finishSimulation: (durationSeconds: number) => void;
  
  // Recordings & Debrief (Replaces old report screen)
  recordings: Recording[];
  selectedRecording: Recording | null;
  selectRecording: (recording: Recording | null) => void;
  isDebriefMode: boolean;
  closeDebriefMode: () => void;
  addRecordingNote: (recordingId: string, timestampSeconds: number, text: string) => void;
  deleteRecording: (id: string) => void;
  renameRecording: (id: string, newTitle: string) => void;
  
  // Studio Sheet (Create Scenario & Guest)
  isStudioOpen: boolean;
  studioInitialTab: "scenario" | "guest";
  openStudio: (initialTab?: "scenario" | "guest") => void;
  closeStudio: () => void;

  // Quick Practice
  isQuickPracticeOpen: boolean;
  openQuickPractice: () => void;
  closeQuickPractice: () => void;
  triggerRandomPractice: () => void;
  triggerLastUsedPractice: () => void;

  // Settings modal (⌘,)
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;

  // Search / Command Palette (⌘K)
  isSearchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;

  // Sign out confirmation sheet
  isSignOutConfirmOpen: boolean;
  openSignOutConfirm: () => void;
  closeSignOutConfirm: () => void;
  confirmSignOut: () => void;

  // Developer mode flag
  isDevMode: boolean;
  toggleDevMode: () => void;

  // Toast notifications
  toastMessage: string | null;
  toastAction: { label: string; onClick: () => void } | null;
  showToast: (message: string, action?: { label: string; onClick: () => void }) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);
