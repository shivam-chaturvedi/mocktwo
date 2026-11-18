import { createContext } from "react";
import type {
  Screen,
  Persona,
  PracticeScenario,
  UserProfile,
  Recording,
  AppSettings,
  UserBaseline,
} from "../types";
import type { StudioScenarioInput } from "../services/api/types";

export interface AppContextType {
  currentScreen: Screen;
  navigateTo: (screen: Screen) => void;
  isAuthenticated: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => void;
  
  // User profile
  user: UserProfile;
  updateUser: (profile: Partial<UserProfile>) => void;

  // Baseline biometrics
  baseline: UserBaseline | null;
  setBaseline: (baseline: UserBaseline) => void;
  measureBaseline: (durationSeconds?: number) => Promise<UserBaseline>;
  runMiniBaseline: (durationSeconds?: number) => Promise<{ restingPulse: number; expressions: Record<string, number> }>;
  isBaselineSheetOpen: boolean;
  openBaselineSheet: () => void;
  closeBaselineSheet: () => void;
  saveBaselineData: (baseline: UserBaseline) => Promise<UserBaseline>;
  clearBaselineData: () => Promise<void>;
  
  // Personas
  personas: Persona[];
  addPersona: (persona: Persona) => Promise<Persona>;
  updatePersona: (persona: Persona) => Promise<Persona>;
  deletePersona: (id: string) => { success: boolean; reason?: string };

  // Scenarios
  scenarios: PracticeScenario[];
  selectedScenario: PracticeScenario;
  selectScenario: (scenario: PracticeScenario) => void;
  addScenario: (scenario: PracticeScenario) => void;
  updateScenario: (scenario: PracticeScenario) => void;
  deleteScenario: (id: string) => void;
  duplicateScenario: (id: string) => void;
  submitScenarioToLibrary: (id: string) => void;
  
  // Briefing modal sheet
  isBriefingOpen: boolean;
  openBriefing: (scenario?: PracticeScenario, personaId?: string) => void;
  closeBriefing: () => void;
  activeSessionPersona: Persona | null;
  setSessionPersona: (persona: Persona | null) => void;
  
  // Live simulation session
  activeSessionId: string | null;
  beginSimulation: (overridePersona?: Persona, overrideDurationMinutes?: number) => void;
  finishSimulation: (durationSeconds: number) => void;
  completeProcessingSession: () => Promise<Recording | null>;
  
  // Recordings
  recordings: Recording[];
  selectedRecording: Recording | null;
  selectRecording: (recording: Recording | null) => void;
  isDebriefMode: boolean;
  closeDebriefMode: () => void;
  addRecordingNote: (recordingId: string, timestampSeconds: number, text: string) => void;
  deleteRecording: (id: string) => void;
  renameRecording: (id: string, newTitle: string) => void;
  
  // Studio Sheet (Create Scenario & Persona)
  isStudioOpen: boolean;
  studioInitialTab: "scenario" | "persona";
  openStudio: (initialTab?: "scenario" | "persona") => void;
  closeStudio: () => void;
  saveStudioScenario: (data: StudioScenarioInput) => Promise<PracticeScenario>;

  // Quick Practice
  isQuickPracticeOpen: boolean;
  quickPracticeInitialCategory?: string;
  openQuickPractice: (initialCategory?: string) => void;
  closeQuickPractice: () => void;
  triggerRandomPractice: () => void;
  triggerLastUsedPractice: () => void;
  startQuickConversation: (topic: string, personaId?: string) => void;

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

  // Developer mode flag & Demo data toggle
  isDevMode: boolean;
  toggleDevMode: () => void;
  demoDataEnabled: boolean;
  toggleDemoData: () => void;

  // Toast notifications
  toastMessage: string | null;
  toastAction: { label: string; onClick: () => void } | null;
  showToast: (message: string, action?: { label: string; onClick: () => void }) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);
