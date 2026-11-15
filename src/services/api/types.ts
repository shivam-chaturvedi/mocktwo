import type {
  PracticeScenario,
  Persona,
  Recording,
  UserProfile,
  AppSettings,
  UserBaseline,
} from "../../types";

export type ServiceStatus = "loading" | "ready" | "empty" | "error";

export interface ServiceResult<T> {
  status: ServiceStatus;
  data: T;
  error?: string;
  retry?: () => Promise<void>;
}

export interface ProgressSummary {
  averageComposure: number;
  totalSessions: number;
  completedSessions: number;
  totalPracticeTimeMinutes: number;
  streakDays: number;
  weeklyGoalTarget: number;
  weeklyGoalCompleted: number;
  recentScores: number[];
  categoryBreakdown: { category: string; sessionCount: number; averageComposure: number }[];
  personaBreakdown: { personaId: string; personaName: string; sessionCount: number; averageComposure: number }[];
}

export interface AuthService {
  isAuthenticated(): boolean;
  getCurrentUser(): Promise<UserProfile | null>;
  signIn(email: string): Promise<UserProfile>;
  signOut(): Promise<void>;
}

export interface ProfileService {
  getProfile(): Promise<UserProfile | null>;
  updateProfile(updates: Partial<UserProfile>): Promise<UserProfile>;
}

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

export interface PersonaService {
  getPersonas(): Promise<Persona[]>;
  getPersona(id: string): Promise<Persona | null>;
  createPersona(persona: Omit<Persona, "id">): Promise<Persona>;
  updatePersona(id: string, updates: Partial<Persona>): Promise<Persona>;
  deletePersona(id: string): Promise<boolean>;
}

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

export interface RecordingService {
  getRecordings(): Promise<Recording[]>;
  getRecording(id: string): Promise<Recording | null>;
  saveRecording(recording: Recording): Promise<Recording>;
  addNote(recordingId: string, timestampSeconds: number, text: string): Promise<void>;
  deleteRecording(id: string): Promise<boolean>;
}

export interface ProgressService {
  getProgressSummary(): Promise<ProgressSummary | null>;
}

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

export interface SettingsService {
  getSettings(): Promise<AppSettings>;
  updateSettings(updates: Partial<AppSettings>): Promise<AppSettings>;
}

export interface ServiceRegistry {
  auth: AuthService;
  profile: ProfileService;
  scenarios: ScenarioService;
  personas: PersonaService;
  session: SessionService;
  recordings: RecordingService;
  progress: ProgressService;
  biometrics: BiometricsService;
  settings: SettingsService;
}
