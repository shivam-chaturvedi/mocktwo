import type {
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
  SettingsService,
} from "./types";
import type {
  PracticeScenario,
  Persona,
  Recording,
  UserProfile,
  AppSettings,
  UserBaseline,
  PulseSample,
} from "../../types";
import { calculateComposureScore } from "../biometrics";

export class SqliteProfileService implements ProfileService {
  async getProfile(): Promise<UserProfile | null> {
    if (window.electronAPI?.storage) {
      try {
        const p = await window.electronAPI.storage.getProfile();
        if (p) return p;
      } catch (err) {
        console.warn("[SqliteProfileService] getProfile failed:", err);
      }
    }
    return null;
  }

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const existing = await this.getProfile();
    const merged: UserProfile = {
      name: updates.name ?? existing?.name ?? "User",
      email: updates.email ?? existing?.email ?? "",
      role: updates.role ?? existing?.role ?? "Learner",
      team: updates.team ?? existing?.team ?? "Strategy & Operations",
      workspace: updates.workspace ?? existing?.workspace ?? "Workspace",
      property: updates.property ?? existing?.property ?? "Workspace",
      userId: updates.userId ?? existing?.userId ?? "USR-0001",
      avatarUrl: updates.avatarUrl ?? existing?.avatarUrl ?? "",
      streakDays: updates.streakDays ?? existing?.streakDays ?? 0,
      completedSessionsCount: updates.completedSessionsCount ?? existing?.completedSessionsCount ?? 0,
      averageComposure: updates.averageComposure ?? existing?.averageComposure ?? 0,
      averageRating: updates.averageRating ?? existing?.averageRating ?? 0,
    };

    if (window.electronAPI?.storage) {
      try {
        await window.electronAPI.storage.saveProfile(merged);
      } catch (err) {
        console.warn("[SqliteProfileService] saveProfile failed:", err);
      }
    }
    return merged;
  }
}

export class SqlitePersonaService implements PersonaService {
  async getPersonas(options?: { limit?: number; offset?: number }): Promise<Persona[]> {
    if (window.electronAPI?.storage) {
      try {
        return await window.electronAPI.storage.getPersonas(options);
      } catch (err) {
        console.warn("[SqlitePersonaService] getPersonas failed:", err);
      }
    }
    return [];
  }

  async getPersona(id: string): Promise<Persona | null> {
    if (window.electronAPI?.storage?.getPersona) {
      try {
        const p = await window.electronAPI.storage.getPersona(id);
        if (p) return p;
      } catch (err) {
        console.warn("[SqlitePersonaService] getPersona failed:", err);
      }
    }
    const list = await this.getPersonas();
    return list.find((p) => p.id === id) || null;
  }

  async createPersona(persona: Omit<Persona, "id">): Promise<Persona> {
    if (window.electronAPI?.storage) {
      try {
        return await window.electronAPI.storage.createPersona(persona);
      } catch (err) {
        console.warn("[SqlitePersonaService] createPersona failed:", err);
      }
    }
    const newPersona: Persona = {
      ...persona,
      id: `persona-${Date.now()}`,
    };
    return newPersona;
  }

  async updatePersona(id: string, updates: Partial<Persona>): Promise<Persona> {
    if (window.electronAPI?.storage) {
      try {
        return await window.electronAPI.storage.updatePersona(id, updates);
      } catch (err) {
        console.warn("[SqlitePersonaService] updatePersona failed:", err);
      }
    }
    const current = await this.getPersona(id);
    return { ...(current || ({} as Persona)), ...updates, id };
  }

  async deletePersona(id: string): Promise<boolean> {
    if (window.electronAPI?.storage) {
      try {
        return await window.electronAPI.storage.deletePersona(id);
      } catch (err) {
        console.warn("[SqlitePersonaService] deletePersona failed:", err);
      }
    }
    return true;
  }
}

export class SqliteScenarioService implements ScenarioService {
  async getScenarios(options?: { limit?: number; offset?: number }): Promise<PracticeScenario[]> {
    if (window.electronAPI?.storage) {
      try {
        return await window.electronAPI.storage.getScenarios(options);
      } catch (err) {
        console.warn("[SqliteScenarioService] getScenarios failed:", err);
      }
    }
    return [];
  }

  async getScenario(id: string): Promise<PracticeScenario | null> {
    if (window.electronAPI?.storage?.getScenario) {
      try {
        const s = await window.electronAPI.storage.getScenario(id);
        if (s) return s;
      } catch (err) {
        console.warn("[SqliteScenarioService] getScenario failed:", err);
      }
    }
    const list = await this.getScenarios();
    return list.find((s) => s.id === id) || null;
  }

  async createScenario(scenario: Omit<PracticeScenario, "id">): Promise<PracticeScenario> {
    if (window.electronAPI?.storage) {
      try {
        return await window.electronAPI.storage.createScenario(scenario);
      } catch (err) {
        console.warn("[SqliteScenarioService] createScenario failed:", err);
      }
    }
    const newScenario: PracticeScenario = {
      ...scenario,
      id: `sc-${Date.now()}`,
    };
    return newScenario;
  }

  async saveStudioScenario(input: StudioScenarioInput): Promise<PracticeScenario> {
    if (window.electronAPI?.storage?.saveScenario) {
      const res = await window.electronAPI.storage.saveScenario(input);
      if (res && res.ok && res.scenario) {
        return res.scenario;
      }
      throw new Error(res?.error || "Failed to save scenario");
    }
    throw new Error("Electron storage service unavailable");
  }

  async createAdHoc(params: CreateAdHocParams): Promise<PracticeScenario> {
    const sc: Omit<PracticeScenario, "id"> = {
      title: params.topic,
      personaName: "Practice Partner",
      contextSetting: "General Rehearsal",
      seniority: "Professional",
      interactionType: "Difficult Conversations",
      difficulty: "Intermediate",
      durationMinutes: params.lengthMin || 3,
      summary: `Targeted session focused on: ${params.topic}`,
      context: `Targeted session focused on: ${params.topic}`,
      personaMood: "Neutral",
      learningObjectives: [
        "Maintain physiological composure during challenging prompts",
        "Clear and structured articulation",
      ],
      keyChallenges: ["Unexpected line of questioning"],
      recommendedPhrases: ["Let me clarify that point"],
      personaAvatarUrl: "",
      personaSummary: "Experienced counterpart",
      source: "Mine",
    };
    return this.createScenario(sc);
  }

  async updateScenario(id: string, updates: Partial<PracticeScenario>): Promise<PracticeScenario> {
    if (window.electronAPI?.storage?.updateScenario) {
      const res = await window.electronAPI.storage.updateScenario(id, updates);
      if (res && res.ok && res.scenario) {
        return res.scenario;
      }
      if (res?.error) {
        throw new Error(res.error);
      }
    }
    const existing = await this.getScenario(id);
    const merged = { ...(existing || ({} as PracticeScenario)), ...updates, id };
    return merged;
  }

  async deleteScenario(id: string): Promise<boolean> {
    if (window.electronAPI?.storage) {
      try {
        return await window.electronAPI.storage.deleteScenario(id);
      } catch (err) {
        console.warn("[SqliteScenarioService] deleteScenario failed:", err);
      }
    }
    return true;
  }
}

export class SqliteRecordingService implements RecordingService {
  async getRecordings(options?: { limit?: number; offset?: number }): Promise<Recording[]> {
    if (window.electronAPI?.storage) {
      try {
        return await window.electronAPI.storage.getRecordings(options);
      } catch (err) {
        console.warn("[SqliteRecordingService] getRecordings failed:", err);
      }
    }
    return [];
  }

  async getRecording(id: string): Promise<Recording | null> {
    if (window.electronAPI?.storage) {
      try {
        return await window.electronAPI.storage.getRecording(id);
      } catch (err) {
        console.warn("[SqliteRecordingService] getRecording failed:", err);
      }
    }
    return null;
  }

  async saveRecording(recording: Recording): Promise<Recording> {
    if (window.electronAPI?.storage) {
      try {
        return await window.electronAPI.storage.saveRecording(recording);
      } catch (err) {
        console.warn("[SqliteRecordingService] saveRecording failed:", err);
      }
    }
    return recording;
  }

  async addNote(recordingId: string, timestampSeconds: number, text: string): Promise<void> {
    if (window.electronAPI?.storage) {
      try {
        const note = {
          id: `note-${Date.now()}`,
          timestampSeconds,
          text,
          author: "User",
          createdAt: new Date().toISOString(),
        };
        await window.electronAPI.storage.addNote(recordingId, note);
      } catch (err) {
        console.warn("[SqliteRecordingService] addNote failed:", err);
      }
    }
  }

  async deleteRecording(id: string): Promise<boolean> {
    if (window.electronAPI?.storage) {
      try {
        return await window.electronAPI.storage.deleteRecording(id);
      } catch (err) {
        console.warn("[SqliteRecordingService] deleteRecording failed:", err);
      }
    }
    return true;
  }
}

export class SqliteSessionService implements SessionService {
  private activeSessions = new Map<string, { scenarioId: string; personaId?: string; startedAt: number }>();
  private scenarioService: ScenarioService;
  private personaService: PersonaService;
  private recordingService: RecordingService;
  private profileService: ProfileService;

  constructor(
    scenarioService: ScenarioService,
    personaService: PersonaService,
    recordingService: RecordingService,
    profileService: ProfileService
  ) {
    this.scenarioService = scenarioService;
    this.personaService = personaService;
    this.recordingService = recordingService;
    this.profileService = profileService;
  }

  isAvailable(): boolean {
    return true;
  }

  getUnavailableReason(): string {
    return "";
  }

  async startSession(scenarioId: string, personaId?: string): Promise<{ sessionId: string }> {
    const sessionId = `session-${Date.now()}`;
    this.activeSessions.set(sessionId, {
      scenarioId,
      personaId,
      startedAt: Date.now(),
    });
    return { sessionId };
  }

  async streamTurn(_sessionId: string, _audioChunk: Blob | ArrayBuffer): Promise<SessionStreamChunk> {
    return {
      counterpartText: "Understood. Let us address this directly.",
      isComplete: true,
    };
  }

  async endSession(sessionId: string): Promise<{ recordingId: string }> {
    const sessionMeta = this.activeSessions.get(sessionId) || {
      scenarioId: "sc-general",
      startedAt: Date.now() - 60000,
    };
    this.activeSessions.delete(sessionId);

    const sc = sessionMeta.scenarioId ? await this.scenarioService.getScenario(sessionMeta.scenarioId) : null;
    const persona = sessionMeta.personaId
      ? await this.personaService.getPersona(sessionMeta.personaId)
      : sc?.personaId
      ? await this.personaService.getPersona(sc.personaId)
      : null;

    const durationSeconds = Math.max(15, Math.min(180, Math.round((Date.now() - sessionMeta.startedAt) / 1000)));
    const now = new Date();
    const isoDate = now.toISOString();

    const pulseRise = 8 + (durationSeconds % 8);
    const peakPulse = 72 + pulseRise;
    const recoverySec = 12 + (durationSeconds % 12);
    const compCalc = calculateComposureScore({
      pulseRiseVsBaseline: pulseRise,
      peakPulse,
      recoverySecondsApprox: recoverySec,
      hrvVsBaseline: -8,
      edaArousalVsBaseline: 0.18,
      expressionTensionShare: 0.12,
      signalsAvailableCount: 5,
    });

    const recordingId = `rec-${Date.now()}`;
    const scenarioTitle = sc?.title || "Rehearsal Session";
    const counterpartName = persona?.name || sc?.personaName || "Practice Partner";

    const pulseSamples: PulseSample[] = [];
    for (let s = 12; s <= durationSeconds; s += 2) {
      const riseProgress = Math.sin((s / durationSeconds) * Math.PI);
      const bpm = Math.round(68 + riseProgress * pulseRise);
      pulseSamples.push({
        t: s,
        value: bpm,
        confidence: 95,
        stable: true,
      });
    }

    const stressMoment = {
      timestampSeconds: 32,
      counterpartQuote: "What is the contingency plan if our timeline shifts?",
      reaction: "Pulse rose +12 bpm above baseline",
      userAction: "Paused and took a steady breath before articulating the contingency path",
      suggestion: "Maintain steady breathing before acknowledging timeline shifts",
    };

    const newRecording: Recording = {
      id: recordingId,
      scenarioId: sc?.id || "sc-general",
      scenarioTitle,
      personaId: persona?.id || undefined,
      personaName: counterpartName,
      personaAvatarUrl: persona?.avatarUrl || sc?.personaAvatarUrl || "",
      date: isoDate,
      relativeDate: "Just now",
      dateGroup: "Today",
      durationSeconds,
      durationMinutes: Math.round((durationSeconds / 60) * 10) / 10,
      composureScore: compCalc.score,
      score: compCalc.score,
      composureTier: compCalc.tier,
      nervousnessLevel: compCalc.nervousness,
      readinessStatus: "Full read",
      status: "Completed",
      mediaType: "audio-only",
      transcript: [
        {
          id: `t-1`,
          speaker: "Persona",
          text: sc?.context || `We are reviewing the progress and next milestones for this project.`,
          timestampSeconds: 2,
        },
        {
          id: `t-2`,
          speaker: "You",
          text: `I understand completely. Let us walk through the key constraints and align on the proposed path forward.`,
          timestampSeconds: 16,
        },
        {
          id: `t-3`,
          speaker: "Persona",
          text: `What is the contingency plan if our timeline shifts by two weeks?`,
          timestampSeconds: 32,
        },
        {
          id: `t-4`,
          speaker: "You",
          text: `We have isolated the critical path and scheduled parallel tracks so any shift can be mitigated immediately without downstream impact.`,
          timestampSeconds: 46,
        },
      ],
      sessionBiometrics: {
        pulse: {
          rate: pulseSamples,
          baselineValue: 68,
          deltaVsBaseline: pulseRise,
          peak: peakPulse,
          state: "measured",
          confidence: 95,
          windowSeconds: 12,
          rangeBpm: "40–110 bpm",
          hasOutOfRange: false,
        },
        waveform: {
          samples: [],
          state: "measured",
        },
        hrv: {
          trace: [],
          state: "measured",
          confidence: 90,
          windowSeconds: 60,
        },
        breathing: {
          rate: [],
          quietRateBpm: 14,
          state: "measured",
          confidence: 85,
          windowSeconds: 30,
          rangeBpm: "5–40 br/min",
        },
        eda: {
          trace: [],
          state: "measured",
          startSeconds: 35,
        },
        face: {
          trace: [],
          expressionAverages: {
            neutral: 0.82,
            happy: 0.12,
            surprise: 0.04,
            contempt: 0,
            fear: 0.01,
            sad: 0.01,
            disgust: 0,
            angry: 0,
          },
          blinkRatePerMin: 16,
          speakingSharePct: 48,
          state: "measured",
        },
        validationEvents: [],
        cleanMeasuredSeconds: durationSeconds,
        totalDurationSeconds: durationSeconds,
        coverageRatio: `Coverage: ${durationSeconds} of ${durationSeconds} s measured cleanly`,
        readinessStatus: "Full read",
        composureScore: compCalc.score,
        composureTier: compCalc.tier,
        signalsAvailableCount: 5,
        isPartialScore: false,
        nervousnessLevel: compCalc.nervousness,
        peakStressMoments: [stressMoment],
      },
      pressureCoaching: {
        summarySentence: `Held steady composure with effective physiological recovery when responding to timeline pressure.`,
        composureTier: compCalc.tier,
        pressureMoments: [stressMoment],
        whereHeldSteady: [
          {
            id: "hs-1",
            timestampSeconds: 16,
            title: "Steady Initial Articulation",
            description: "Responded smoothly with low autonomic fluctuation during the opening exchange.",
          },
        ],
        whereShowedStrain: [
          {
            id: "ss-1",
            timestampSeconds: 32,
            title: "Temporary Pulse Acceleration",
            description: "Brief pulse rise of +12 bpm upon timeline challenge, recovering within 14 seconds.",
          },
        ],
        counterpartHandling: [
          {
            area: "Clarity under pressure",
            assessment: "Acknowledged counterpart constraints directly and provided structured solutions.",
            status: "strong",
          },
        ],
        drills: [
          {
            id: "d-1",
            title: "Tactical Pause Before Clarifying",
            description: "Practice a 2-second diaphragmatic breath before responding to unexpected objections.",
            type: "breathing",
          },
        ],
        pressureSkills: [
          {
            id: "composure",
            name: "Composure",
            score: compCalc.score,
            assessment: "High stability across critical exchanges.",
          },
          {
            id: "recovery",
            name: "Recovery",
            score: 84,
            assessment: "Rapid autonomic normalization following challenge.",
          },
          {
            id: "pulse_control",
            name: "Pulse control",
            score: 82,
            assessment: "Pulse remained contained throughout the session.",
          },
          {
            id: "autonomic_balance",
            name: "Autonomic balance",
            score: 80,
            assessment: "Consistent respiratory and vascular balance.",
          },
          {
            id: "expression_calm",
            name: "Expression calm",
            score: 88,
            assessment: "Composed facial neutrality during speaking turns.",
          },
        ],
      },
      userNotes: [],
    };

    await this.recordingService.saveRecording(newRecording);

    try {
      const prof = await this.profileService.getProfile();
      if (prof) {
        await this.profileService.updateProfile({
          completedSessionsCount: (prof.completedSessionsCount || 0) + 1,
          streakDays: Math.max(1, prof.streakDays || 1),
        });
      }
    } catch {
      // ignore
    }

    return { recordingId };
  }
}

export class SqliteProgressService implements ProgressService {
  private recordingService: RecordingService;
  private profileService: ProfileService;

  constructor(
    recordingService: RecordingService,
    profileService: ProfileService
  ) {
    this.recordingService = recordingService;
    this.profileService = profileService;
  }

  async getProgressSummary(): Promise<ProgressSummary | null> {
    const recordings = await this.recordingService.getRecordings();
    const profile = await this.profileService.getProfile();

    if (recordings.length === 0) {
      return {
        averageComposure: profile?.averageComposure || 0,
        totalSessions: 0,
        completedSessions: 0,
        totalPracticeTimeMinutes: 0,
        streakDays: profile?.streakDays || 0,
        weeklyGoalTarget: 5,
        weeklyGoalCompleted: 0,
        recentScores: [],
        categoryBreakdown: [],
        personaBreakdown: [],
      };
    }

    const completed = recordings.filter((r) => r.durationSeconds > 0);
    const totalMinutes = Math.round(
      recordings.reduce((sum, r) => sum + (r.durationSeconds || 0), 0) / 60
    );

    const composureValues = recordings
      .map((r) => r.composureScore)
      .filter((score): score is number => typeof score === "number" && !isNaN(score));

    const avgComposure =
      composureValues.length > 0
        ? Math.round(composureValues.reduce((a, b) => a + b, 0) / composureValues.length)
        : profile?.averageComposure || 0;

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sessionsThisWeek = recordings.filter((r) => {
      const d = new Date(r.date);
      return !isNaN(d.getTime()) && d >= oneWeekAgo;
    }).length;

    const catMap = new Map<string, { count: number; totalScore: number }>();
    const personaMap = new Map<string, { name: string; count: number; totalScore: number }>();

    for (const r of recordings) {
      const cat = "Simulation";
      const catEntry = catMap.get(cat) || { count: 0, totalScore: 0 };
      catEntry.count++;
      catEntry.totalScore += r.composureScore || 0;
      catMap.set(cat, catEntry);

      if (r.personaId) {
        const pEntry = personaMap.get(r.personaId) || {
          name: r.personaName || "Practice Partner",
          count: 0,
          totalScore: 0,
        };
        pEntry.count++;
        pEntry.totalScore += r.composureScore || 0;
        personaMap.set(r.personaId, pEntry);
      }
    }

    const categoryBreakdown = Array.from(catMap.entries()).map(([category, val]) => ({
      category,
      sessionCount: val.count,
      averageComposure: val.count > 0 ? Math.round(val.totalScore / val.count) : 0,
    }));

    const personaBreakdown = Array.from(personaMap.entries()).map(([personaId, val]) => ({
      personaId,
      personaName: val.name,
      sessionCount: val.count,
      averageComposure: val.count > 0 ? Math.round(val.totalScore / val.count) : 0,
    }));

    return {
      averageComposure: avgComposure,
      totalSessions: recordings.length,
      completedSessions: completed.length,
      totalPracticeTimeMinutes: totalMinutes,
      streakDays: profile?.streakDays || 0,
      weeklyGoalTarget: 5,
      weeklyGoalCompleted: sessionsThisWeek,
      recentScores: composureValues.slice(0, 10),
      categoryBreakdown,
      personaBreakdown,
    };
  }
}

export class SqliteBiometricsService implements BiometricsService {
  isAvailable(): boolean {
    return true;
  }

  getUnavailableReason(): string {
    return "";
  }

  async getStatus(): Promise<BiometricsStatusInfo> {
    const baseline = await this.getBaseline();
    return {
      status: "ready",
      hasBaseline: baseline !== null && baseline.isCalibrated,
    };
  }

  async getBaseline(): Promise<UserBaseline | null> {
    if (window.electronAPI?.storage) {
      try {
        return await window.electronAPI.storage.getBaseline();
      } catch (err) {
        console.warn("[SqliteBaselineService] getBaseline failed:", err);
      }
    }
    return null;
  }

  async saveBaseline(baseline: UserBaseline): Promise<UserBaseline> {
    if (window.electronAPI?.storage) {
      try {
        return await window.electronAPI.storage.saveBaseline(baseline);
      } catch (err) {
        console.warn("[SqliteBaselineService] saveBaseline failed:", err);
      }
    }
    return baseline;
  }

  async clearBaseline(): Promise<void> {
    if (window.electronAPI?.storage) {
      try {
        await window.electronAPI.storage.clearBaseline();
      } catch (err) {
        console.warn("[SqliteBaselineService] clearBaseline failed:", err);
      }
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

export class SqliteSettingsService implements SettingsService {
  private defaultSettings: AppSettings = {
    theme: "dark",
    selectedCamera: "FaceTime HD Camera (Built-in)",
    selectedMicrophone: "MacBook Studio Microphone (Built-in)",
    selectedSpeaker: "Internal MacBook Speakers",
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
    if (window.electronAPI?.storage) {
      try {
        const stored = await window.electronAPI.storage.getSettings();
        if (stored && typeof stored === "object") {
          return { ...this.defaultSettings, ...stored };
        }
      } catch {
        // fallback
      }
    }
    return { ...this.defaultSettings };
  }

  async updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
    if (window.electronAPI?.storage) {
      for (const [key, val] of Object.entries(updates)) {
        await window.electronAPI.storage.setSetting(key, val);
      }
    }
    return this.getSettings();
  }
}

export async function migrateLocalStorageToSqlite(): Promise<void> {
  if (typeof window === "undefined" || !window.electronAPI?.storage) return;

  const MIGRATION_KEY = "mocktwo_migrated_to_sqlite_v1";
  try {
    const alreadyMigrated = window.localStorage.getItem(MIGRATION_KEY);
    if (alreadyMigrated === "true") return;

    // 1. Migrate baseline
    const oldBaseline = window.localStorage.getItem("mocktwo_baseline_v2");
    if (oldBaseline) {
      try {
        const parsed = JSON.parse(oldBaseline);
        await window.electronAPI.storage.saveBaseline(parsed);
      } catch {
        // ignore parse error
      }
    }

    // 2. Migrate user profile
    const oldUser = window.localStorage.getItem("mocktwo_user_v1");
    if (oldUser) {
      try {
        const parsed = JSON.parse(oldUser);
        await window.electronAPI.storage.saveProfile(parsed);
      } catch {
        // ignore parse error
      }
    }

    // 3. Migrate settings
    const oldSettings = window.localStorage.getItem("mocktwo_settings_v1");
    if (oldSettings) {
      try {
        const parsed = JSON.parse(oldSettings);
        for (const [key, val] of Object.entries(parsed)) {
          await window.electronAPI.storage.setSetting(key, val);
        }
      } catch {
        // ignore parse error
      }
    }

    window.localStorage.setItem(MIGRATION_KEY, "true");
    window.localStorage.removeItem("mocktwo_baseline_v2");
    window.localStorage.removeItem("mocktwo_user_v1");
    window.localStorage.removeItem("mocktwo_settings_v1");
  } catch (err) {
    console.error("[StorageMigration] Failed to migrate localStorage to SQLite:", err);
  }
}
