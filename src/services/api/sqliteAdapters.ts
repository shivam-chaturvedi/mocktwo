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
} from "../../types";
import { LEGACY_CAMERA, LEGACY_MIC, LEGACY_SPEAKER } from "../../constants/legacyDevices.ts";
import { generateCoaching } from "../../utils/coachingEngine.ts";

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
        const raw = await window.electronAPI.storage.getRecording(id);
        if (!raw) return null;

        // Fetch user's genuine active baseline (if calibrated) for accurate telemetry deltas
        const activeBaseline = await window.electronAPI?.storage?.getActiveBaseline?.().catch(() => null);
        const activeBaselinePulse = activeBaseline?.restingPulse ?? activeBaseline?.resting_pulse ?? null;

        // Build sessionBiometrics if raw vitals samples exist
        let sessionBiometrics = raw.sessionBiometrics;
        if (!sessionBiometrics && Array.isArray(raw.vitalsSamples) && raw.vitalsSamples.length > 0) {
          const cleanPulseSamples = raw.vitalsSamples.filter(
            (s: any) => (s.is_clean || s.isClean) && s.pulse_bpm != null && s.pulse_bpm >= 40 && s.pulse_bpm <= 110
          );
          const hasCleanPulse = cleanPulseSamples.length > 0;

            const breathingSamples = (raw.vitalsSamples || [])
              .filter((s: any) => (s.breathing_rate != null || s.breathingRate != null))
              .map((s: any) => ({
                t: Math.round((s.timestamp_offset_ms || s.timestampOffsetMs || 0) / 1000),
                value: Number(s.breathing_rate ?? s.breathingRate),
              }));
            const validBreathingVals = breathingSamples
              .map((s: any) => s.value)
              .filter((v: number) => typeof v === "number" && !isNaN(v) && v >= 5 && v <= 40);
            const avgBreathing = validBreathingVals.length > 0
              ? Math.round(validBreathingVals.reduce((a: number, b: number) => a + b, 0) / validBreathingVals.length)
              : undefined;

            const rawTranscript = raw.transcript || raw.transcriptSegments || [];
            const userDurationSec = (Array.isArray(rawTranscript) ? rawTranscript : [])
              .filter((u: any) => u.speaker === "user" || u.speaker === "Learner" || u.speaker === "You")
              .reduce((acc: number, u: any) => {
                if (u.endMs != null && u.startMs != null) {
                  return acc + (u.endMs - u.startMs) / 1000;
                }
                const words = (u.text || "").trim().split(/\s+/).filter(Boolean).length;
                return acc + Math.max(1, (words / 150) * 60);
              }, 0);
            const speakingPct = raw.durationSeconds > 0
              ? Math.min(100, Math.round((userDurationSec / raw.durationSeconds) * 100))
              : 0;

            sessionBiometrics = {
              pulse: {
                rate: raw.vitalsSamples
                  .filter((s: any) => s.pulse_bpm != null)
                  .map((s: any) => ({
                    t: Math.round((s.timestamp_offset_ms || s.timestampOffsetMs || 0) / 1000),
                    value: s.pulse_bpm > 110 ? "outOfRange" : s.pulse_bpm,
                    confidence: s.confidence || 0,
                    stable: Boolean(s.is_clean || s.isClean),
                  })),
                avg: raw.avgPulse,
                peak: raw.peakPulse,
                baselineValue: activeBaselinePulse ?? undefined,
                deltaVsBaseline: raw.avgPulse != null && activeBaselinePulse != null ? Math.round(raw.avgPulse - activeBaselinePulse) : undefined,
                state: hasCleanPulse ? "measured" : "unavailable",
                confidence: hasCleanPulse ? 90 : 0,
                windowSeconds: 12,
                rangeBpm: "40–110 bpm",
                hasOutOfRange: raw.vitalsSamples.some((s: any) => (s.pulse_bpm || s.pulseBpm) > 110),
              },
              waveform: { samples: [], state: hasCleanPulse ? "measured" : "unavailable" },
              hrv: {
                trace: raw.vitalsSamples
                  .filter((s: any) => (s.hrv_rmssd != null || s.hrvRmssd != null))
                  .map((s: any) => ({
                    t: Math.round((s.timestamp_offset_ms || s.timestampOffsetMs || 0) / 1000),
                    value: s.hrv_rmssd ?? s.hrvRmssd,
                  })),
                rmssd: raw.avgHrvRmssd,
                state: raw.avgHrvRmssd ? "measured" : "notEnoughTime",
                confidence: raw.avgHrvRmssd ? 85 : 0,
                windowSeconds: 60,
              },
              breathing: {
                rate: breathingSamples,
                quietRateBpm: avgBreathing,
                state: avgBreathing ? "measured" : "notMeasurableWhileSpeaking",
                confidence: avgBreathing ? 85 : 0,
                windowSeconds: 30,
                rangeBpm: "5–40 br/min",
              },
              eda: { trace: [], state: "unavailable", startSeconds: 35 },
              face: {
                trace: [],
                expressionAverages: { neutral: 0, happy: 0, angry: 0, contempt: 0, disgust: 0, fear: 0, sad: 0, surprise: 0 },
                blinkRatePerMin: 0,
                speakingSharePct: speakingPct,
                state: "unavailable",
              },
            validationEvents: [],
            cleanMeasuredSeconds: raw.measuredSeconds || (hasCleanPulse ? Math.round(cleanPulseSamples.length * 0.5) : 0),
            totalDurationSeconds: raw.durationSeconds || 0,
            coverageRatio: raw.coverageRatio || `${raw.measuredSeconds || 0} of ${raw.durationSeconds || 0} s measured cleanly`,
            readinessStatus: raw.readinessStatus || (raw.durationSeconds >= 60 ? "Full read" : "Too short"),
            signalsAvailableCount: raw.signalsAvailableCount ?? (hasCleanPulse ? 3 : 0),
            isPartialScore: Boolean(raw.isPartialScore),
            nervousnessLevel: raw.nervousnessLevel || "Mild",
            peakStressMoments: [],
          };
        }

        // Generate coaching if not saved in DB
        let pressureCoaching = raw.pressureCoaching;
        const transcriptItems = raw.transcript || raw.transcriptSegments || [];
        if (!pressureCoaching && (transcriptItems.length > 0 || (raw.vitalsSamples && raw.vitalsSamples.length > 0))) {
          const telemetrySamples = (raw.vitalsSamples || []).map((s: any) => ({
            timestampOffsetMs: s.timestamp_offset_ms || s.timestampOffsetMs || 0,
            pulseBpm: s.pulse_bpm ?? s.pulseBpm ?? null,
            hrvRmssd: s.hrv_rmssd ?? s.hrvRmssd ?? null,
            breathingRate: s.breathing_rate ?? s.breathingRate ?? null,
            confidence: s.confidence ?? null,
            isClean: Boolean(s.is_clean ?? s.isClean),
          }));

          const baselineRef = activeBaselinePulse != null
            ? {
                restingPulse: activeBaselinePulse,
                restingHrvRmssd: activeBaseline?.restingHrvRmssd ?? activeBaseline?.resting_hrv_rmssd ?? null,
                restingBreathingRate: activeBaseline?.restingBreathingRate ?? activeBaseline?.resting_breathing_rate ?? null,
              }
            : null;

          pressureCoaching = generateCoaching({
            transcript: transcriptItems,
            vitalsSamples: telemetrySamples,
            durationSeconds: raw.durationSeconds || 0,
            baseline: baselineRef,
            composureScore: raw.composureScore,
            avgPulse: raw.avgPulse,
            peakPulse: raw.peakPulse,
            recoverySeconds: raw.recoverySeconds,
            nervousnessLevel: raw.nervousnessLevel,
          });
        }

        return {
          ...raw,
          sessionBiometrics,
          pressureCoaching,
          transcript: transcriptItems,
        };
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

  constructor(
    scenarioService: ScenarioService,
    personaService: PersonaService,
    recordingService: RecordingService,
    _profileService: ProfileService
  ) {
    this.scenarioService = scenarioService;
    this.personaService = personaService;
    this.recordingService = recordingService;
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

    const durationSeconds = Math.max(0, Math.round((Date.now() - sessionMeta.startedAt) / 1000));
    const now = new Date();
    const isoDate = now.toISOString();

    const recordingId = sessionId || `rec-${Date.now()}`;
    const scenarioTitle = sc?.title || "Practice Session";
    const counterpartName = persona?.name || sc?.personaName || "Practice Partner";
    const status = durationSeconds >= 30 ? "completed" : "abandoned";

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
      composureScore: undefined,
      score: undefined,
      composureTier: undefined,
      nervousnessLevel: undefined,
      readinessStatus: "Too short",
      status: status === "completed" ? "Completed" : "Incomplete",
      mediaType: "video",
      videoPath: `sessions/${recordingId}/video.webm`,
      transcript: [],
      userNotes: [],
      sessionBiometrics: {
        pulse: {
          rate: [],
          baselineValue: 70,
          state: "unavailable",
          confidence: 0,
          windowSeconds: 12,
          rangeBpm: "40–110 bpm",
          hasOutOfRange: false,
        },
        waveform: {
          samples: [],
          state: "unavailable",
        },
        hrv: {
          trace: [],
          state: "unavailable",
          confidence: 0,
          windowSeconds: 60,
        },
        breathing: {
          rate: [],
          state: "unavailable",
          confidence: 0,
          windowSeconds: 30,
          rangeBpm: "5–40 br/min",
        },
        eda: {
          trace: [],
          state: "unavailable",
          startSeconds: 35,
        },
        face: {
          trace: [],
          expressionAverages: {
            neutral: 0,
            happy: 0,
            angry: 0,
            contempt: 0,
            disgust: 0,
            fear: 0,
            sad: 0,
            surprise: 0,
          },
          blinkRatePerMin: 0,
          speakingSharePct: 0,
          state: "unavailable",
        },
        validationEvents: [],
        cleanMeasuredSeconds: 0,
        totalDurationSeconds: durationSeconds,
        coverageRatio: `Coverage: 0 of ${durationSeconds} s measured cleanly`,
        readinessStatus: "Too short",
        signalsAvailableCount: 0,
        isPartialScore: false,
        nervousnessLevel: "Calm",
        peakStressMoments: [],
      },
    };

    // If the recording was already saved & finalized via recording:finalize IPC, preserve its real metrics
    const existing = await this.recordingService.getRecording(recordingId);
    if (!existing) {
      await this.recordingService.saveRecording(newRecording);
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
        const payload = {
          ...baseline,
          makeActive: baseline.isActive ?? (baseline.status === "valid"),
        };
        return await window.electronAPI.storage.saveBaseline(payload);
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

  async calibrateBaseline(_durationSeconds: number = 90): Promise<UserBaseline> {
    const existing = await this.getBaseline();
    if (existing) return existing;
    throw new Error("No optical sensor baseline samples captured. Please run the calibration flow.");
  }
}

export class SqliteSettingsService implements SettingsService {
  private defaultSettings: AppSettings = {
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
    if (typeof window !== "undefined" && window.electronAPI?.storage) {
      try {
        const stored = await window.electronAPI.storage.getSettings();
        if (stored && typeof stored === "object") {
          const sanitized = { ...this.defaultSettings, ...stored };
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
      } catch {
        // fallback
      }
    }
    return { ...this.defaultSettings };
  }

  async updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
    if (typeof window !== "undefined" && window.electronAPI?.storage) {
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
