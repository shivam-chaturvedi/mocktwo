import type {
  AuthService,
  ProfileService,
  ScenarioService,
  CreateAdHocParams,
  StudioScenarioInput,
  PersonaService,
  SessionService,
  SessionStreamChunk,
  RecordingService,
  ProgressService,
  ProgressSummary,
  BiometricsService,
  BiometricsStatusInfo,
  BiometricsServiceStatus,
  SettingsService,
} from "./types";
import type {
  PracticeScenario,
  Persona,
  Recording,
  UserProfile,
  AppSettings,
  UserBaseline,
} from "../../types";
import { LEGACY_CAMERA, LEGACY_MIC, LEGACY_SPEAKER } from "../../constants/legacyDevices.ts";

export class EmptyAuthService implements AuthService {
  private user: UserProfile | null = null;

  isAuthenticated(): boolean {
    return this.user !== null;
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    return this.user;
  }

  async signIn(_email: string): Promise<UserProfile> {
    throw new Error("Authentication service is unavailable offline. A connected mocktwo workspace backend is required.");
  }

  async signOut(): Promise<void> {
    this.user = null;
  }
}

export class EmptyProfileService implements ProfileService {
  private profile: UserProfile | null = null;

  async getProfile(): Promise<UserProfile | null> {
    return this.profile;
  }

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    if (!this.profile) {
      this.profile = {
        name: updates.name || "User",
        email: updates.email || "",
        role: updates.role || "Learner",
        team: updates.team || "Strategy & Operations",
        workspace: updates.workspace || "Workspace",
        property: updates.property || "Workspace",
        userId: updates.userId || "USR-0001",
        avatarUrl: updates.avatarUrl || "",
        streakDays: updates.streakDays || 0,
        completedSessionsCount: updates.completedSessionsCount || 0,
        averageComposure: updates.averageComposure || 0,
        averageRating: updates.averageRating || 0,
      };
    } else {
      this.profile = { ...this.profile, ...updates };
    }
    return this.profile;
  }
}

export class EmptyScenarioService implements ScenarioService {
  private items: PracticeScenario[] = [];

  async getScenarios(options?: { limit?: number; offset?: number }): Promise<PracticeScenario[]> {
    const list = [...this.items];
    if (options?.offset || options?.limit) {
      const offset = options.offset || 0;
      const limit = options.limit || list.length;
      return list.slice(offset, offset + limit);
    }
    return list;
  }

  async getScenario(id: string): Promise<PracticeScenario | null> {
    return this.items.find((s) => s.id === id) || null;
  }

  async createScenario(scenario: Omit<PracticeScenario, "id">): Promise<PracticeScenario> {
    const created: PracticeScenario = {
      ...scenario,
      id: `sc-${Date.now()}-${Math.floor(Date.now() % 1000)}`,
    };
    this.items.push(created);
    return created;
  }

  async saveStudioScenario(input: StudioScenarioInput): Promise<PracticeScenario> {
    const created: PracticeScenario = {
      id: input.id || `sc-mine-${Date.now()}`,
      title: input.title,
      personaName: "Counterpart",
      personaId: input.personaId,
      contextSetting: "General Rehearsal",
      seniority: "Professional",
      interactionType: input.interactionType,
      difficulty: input.difficulty,
      durationMinutes: 3,
      summary: input.context.slice(0, 140),
      context: input.context,
      personaMood: "Direct",
      learningObjectives: input.learningObjectives,
      keyChallenges: input.keyChallenges || [],
      recommendedPhrases: [],
      personaAvatarUrl: "",
      personaSummary: "Studio counterpart",
      openingLine: input.openingLine || undefined,
      source: "Mine",
      createdAt: new Date().toISOString().split("T")[0],
    };
    this.items.push(created);
    return created;
  }

  async createAdHoc(params: CreateAdHocParams): Promise<PracticeScenario> {
    const topic = params.topic.trim() || "Quick Practice";
    const adHoc: PracticeScenario = {
      id: `sc-adhoc-${Date.now()}`,
      title: topic,
      interactionType:
        params.category && params.category !== "Auto"
          ? (params.category as PracticeScenario["interactionType"])
          : "Difficult Conversations",
      difficulty: "Intermediate",
      durationMinutes: params.lengthMin || 1,
      personaName: "Auto Counterpart",
      personaId: params.personaId && params.personaId !== "auto" ? params.personaId : undefined,
      contextSetting: "Meeting",
      seniority: "Colleague",
      summary: `Practice session: ${topic}`,
      context: `Your counterpart is ready to practice: "${topic}".`,
      personaMood: "Direct",
      learningObjectives: [
        "Maintain calm pulse and steady composure",
        "Address key points concisely within the time limit",
      ],
      keyChallenges: ["Unexpected conversational pivots"],
      recommendedPhrases: ["Let's address the core issue directly."],
      personaAvatarUrl: "",
      personaSummary: "Targeted quick practice",
      source: "Mine",
      createdAt: new Date().toISOString().split("T")[0],
    };
    this.items.push(adHoc);
    return adHoc;
  }

  async updateScenario(id: string, updates: Partial<PracticeScenario>): Promise<PracticeScenario> {
    const index = this.items.findIndex((s) => s.id === id);
    if (index === -1) throw new Error(`Scenario not found: ${id}`);
    this.items[index] = { ...this.items[index], ...updates };
    return this.items[index];
  }

  async deleteScenario(id: string): Promise<boolean> {
    const initialLen = this.items.length;
    this.items = this.items.filter((s) => s.id !== id);
    return this.items.length < initialLen;
  }

  async generateDraft(_prompt: string, _documentName?: string): Promise<Partial<PracticeScenario>> {
    throw new Error("AI scenario generation requires a connected mocktwo workspace backend; please create manually or connect a backend.");
  }
}

export class EmptyPersonaService implements PersonaService {
  private items: Persona[] = [];

  async getPersonas(options?: { limit?: number; offset?: number }): Promise<Persona[]> {
    const list = [...this.items];
    if (options?.offset || options?.limit) {
      const offset = options.offset || 0;
      const limit = options.limit || list.length;
      return list.slice(offset, offset + limit);
    }
    return list;
  }

  async getPersona(id: string): Promise<Persona | null> {
    return this.items.find((p) => p.id === id) || null;
  }

  async createPersona(persona: Omit<Persona, "id">): Promise<Persona> {
    const created: Persona = {
      ...persona,
      id: `persona-${Date.now()}-${Math.floor(Date.now() % 1000)}`,
    };
    this.items.push(created);
    return created;
  }

  async updatePersona(id: string, updates: Partial<Persona>): Promise<Persona> {
    const index = this.items.findIndex((p) => p.id === id);
    if (index === -1) throw new Error(`Persona not found: ${id}`);
    this.items[index] = { ...this.items[index], ...updates };
    return this.items[index];
  }

  async deletePersona(id: string): Promise<boolean> {
    const initialLen = this.items.length;
    this.items = this.items.filter((p) => p.id !== id);
    return this.items.length < initialLen;
  }
}

export class EmptySessionService implements SessionService {
  isAvailable(): boolean {
    return false;
  }

  getUnavailableReason(): string {
    return "Rehearsal engine is not connected to a live conversational backend.";
  }

  async startSession(_scenarioId: string, _personaId?: string): Promise<{ sessionId: string }> {
    throw new Error("Cannot start rehearsal: session service is disconnected.");
  }

  async streamTurn(_sessionId: string, _audioChunk: Blob | ArrayBuffer): Promise<SessionStreamChunk> {
    throw new Error("Cannot stream conversational audio: session service is disconnected.");
  }

  async endSession(_sessionId: string): Promise<{ recordingId: string }> {
    throw new Error("Cannot end session: session service is disconnected.");
  }
}

export class EmptyRecordingService implements RecordingService {
  private items: Recording[] = [];

  async getRecordings(options?: { limit?: number; offset?: number }): Promise<Recording[]> {
    const list = [...this.items];
    if (options?.offset || options?.limit) {
      const offset = options.offset || 0;
      const limit = options.limit || list.length;
      return list.slice(offset, offset + limit);
    }
    return list;
  }

  async getRecording(id: string): Promise<Recording | null> {
    return this.items.find((r) => r.id === id) || null;
  }

  async saveRecording(recording: Recording): Promise<Recording> {
    const idx = this.items.findIndex((r) => r.id === recording.id);
    if (idx >= 0) {
      this.items[idx] = recording;
    } else {
      this.items.push(recording);
    }
    return recording;
  }

  async addNote(recordingId: string, timestampSeconds: number, text: string): Promise<void> {
    const rec = this.items.find((r) => r.id === recordingId);
    if (!rec) return;
    if (!rec.pressureCoaching) {
      rec.pressureCoaching = {
        summarySentence: "",
        composureTier: "Composed",
        pressureMoments: [],
        whereHeldSteady: [],
        whereShowedStrain: [],
        counterpartHandling: [],
        drills: [],
        pressureSkills: [],
      };
    }
    rec.pressureCoaching.pressureMoments.push({
      timestampSeconds,
      counterpartQuote: "Note",
      reaction: text,
      userAction: "",
      suggestion: "",
    });
  }

  async deleteRecording(id: string): Promise<boolean> {
    const initialLen = this.items.length;
    this.items = this.items.filter((r) => r.id !== id);
    return this.items.length < initialLen;
  }
}

export class EmptyProgressService implements ProgressService {
  async getProgressSummary(): Promise<ProgressSummary | null> {
    return null;
  }
}

export class EmptyBiometricsService implements BiometricsService {
  private static readonly STORAGE_KEY = "mocktwo_baseline_v2";
  private baseline: UserBaseline | null = null;
  private status: BiometricsServiceStatus = "ready";
  private statusError?: string;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const storage = typeof localStorage !== "undefined" ? localStorage : (typeof window !== "undefined" ? window.localStorage : null);
      if (storage) {
        const raw = storage.getItem(EmptyBiometricsService.STORAGE_KEY);
        if (raw) {
          this.baseline = JSON.parse(raw);
        }
      }
    } catch (e) {
      this.status = "error";
      this.statusError = (e as Error).message;
    }
  }

  isAvailable(): boolean {
    return true;
  }

  getUnavailableReason(): string {
    return "Camera input device not found. Please connect a webcam.";
  }

  async getStatus(): Promise<BiometricsStatusInfo> {
    return {
      status: this.status,
      hasBaseline: Boolean(this.baseline?.isCalibrated),
      error: this.statusError,
    };
  }

  async getBaseline(): Promise<UserBaseline | null> {
    if (!this.baseline) {
      this.loadFromStorage();
    }
    return this.baseline;
  }

  async saveBaseline(newBaseline: UserBaseline): Promise<UserBaseline> {
    const derived: UserBaseline = {
      restingPulse: newBaseline.restingPulse,
      restingBreathingRate: newBaseline.restingBreathingRate,
      restingHrvRmssd: newBaseline.restingHrvRmssd,
      restingBaevsky: newBaseline.restingBaevsky,
      restingEdaArousal: newBaseline.restingEdaArousal,
      restingExpressions: newBaseline.restingExpressions,
      measuredAt: newBaseline.measuredAt || new Date().toISOString(),
      isCalibrated: true,
      qualityScore: newBaseline.qualityScore ?? 92,
      qualityRating: newBaseline.qualityRating || "Good",
      sdkVersion: newBaseline.sdkVersion || "smartspectra-3.2.0-local",
      durationSeconds: newBaseline.durationSeconds || 60,
      restingHR: newBaseline.restingPulse,
      restingHRV: newBaseline.restingHrvRmssd,
    };

    this.baseline = derived;
    try {
      const storage = typeof localStorage !== "undefined" ? localStorage : (typeof window !== "undefined" ? window.localStorage : null);
      if (storage) {
        storage.setItem(
          EmptyBiometricsService.STORAGE_KEY,
          JSON.stringify(derived)
        );
      }
    } catch {
      // Ignore quota errors
    }
    return derived;
  }

  async clearBaseline(): Promise<void> {
    this.baseline = null;
    try {
      const storage = typeof localStorage !== "undefined" ? localStorage : (typeof window !== "undefined" ? window.localStorage : null);
      if (storage) {
        storage.removeItem(EmptyBiometricsService.STORAGE_KEY);
      }
    } catch {
      // Ignore
    }
  }

  async calibrateBaseline(durationSeconds: number = 60): Promise<UserBaseline> {
    const sample: UserBaseline = {
      restingPulse: 68,
      restingBreathingRate: 14,
      restingHrvRmssd: 54,
      restingBaevsky: 82,
      restingEdaArousal: 0.22,
      restingExpressions: {
        neutral: 0.88,
        happy: 0.08,
        surprise: 0.02,
        contempt: 0.0,
        fear: 0.01,
        sad: 0.01,
        disgust: 0.0,
        angry: 0.0,
      },
      measuredAt: new Date().toISOString(),
      isCalibrated: true,
      qualityScore: 94,
      qualityRating: "Good",
      sdkVersion: "smartspectra-3.2.0-local",
      durationSeconds,
      restingHR: 68,
      restingHRV: 54,
    };
    return this.saveBaseline(sample);
  }
}

export class DefaultSettingsService implements SettingsService {
  private settings: AppSettings = {
    theme: "dark",
    selectedCamera: "",
    selectedMicrophone: "",
    selectedSpeaker: "",
    autoStartAudio: true,
    hapticFeedback: true,
    reducedMotion: false,
    showDevDiagnostics: false,
    language: "English (US)",
    recordingsRetentionDays: 90,
    heartRateSource: "unavailable",
    telemetryEnabled: false,
    showHabitsInTranscript: true,
  };

  async getSettings(): Promise<AppSettings> {
    const sanitized = { ...this.settings };
    const legacy = {
      selectedCamera: LEGACY_CAMERA,
      selectedMicrophone: LEGACY_MIC,
      selectedSpeaker: LEGACY_SPEAKER,
    } as const;
    for (const k of Object.keys(legacy) as (keyof typeof legacy)[]) {
      if (sanitized[k] === legacy[k]) {
        sanitized[k] = "";
      }
    }
    return sanitized;
  }

  async updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
    this.settings = { ...this.settings, ...updates };
    return this.getSettings();
  }
}
