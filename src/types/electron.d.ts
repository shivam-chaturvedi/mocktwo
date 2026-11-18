export interface ElectronAPI {
  platform: string;
  onMenuAction: (callback: (action: string) => void) => () => void;
  onAppWillClose?: (callback: () => void) => () => void;
  sendWindowAction: (action: string) => void;
  openSystemSettings: (pane: "camera" | "microphone") => Promise<boolean>;
  logError: (payload: Record<string, unknown>) => void;
  revealLogs: () => Promise<string>;
  getClientConfig?: () => Promise<{ seedEnabled: boolean; uiListPageSize: number; seedBatchSize: number; error: string | null }>;
  seedGetStatus?: () => Promise<{
    isSeeding: boolean;
    personasStatus: string;
    scenariosStatus: string;
    unboundPersonasCount: number;
    totalPersonasCount: number;
    totalScenariosCount: number;
    attempts: number;
    lastError: string | null;
    errorCode?: string | null;
  }>;
  seedRetry?: () => Promise<boolean>;
  onSeedProgress?: (callback: (progress: any) => void) => () => void;
  tavusStatus: () => Promise<{ configured: boolean }>;
  personaRetrySync: (id: string) => Promise<any>;
  personaPreviewPrompt: (draft: any) => Promise<{ prompt: string; wordCount: number; warnings: string[]; error: string | null }>;
  tavusListFaces: (options?: { forceRefresh?: boolean }) => Promise<{ data: any[]; total_count?: number }>;
  tavusListVoices: (options?: { forceRefresh?: boolean }) => Promise<{ data: any[]; total_count?: number }>;
  tavus?: {
    createConversation: (payload: { scenarioId: string; personaId: string; scenario?: any }) => Promise<{
      ok: boolean;
      conversationId?: string;
      conversationUrl?: string;
      meetingToken?: string | null;
      code?: string;
      error?: string;
    }>;
    endConversation: (conversationId: string) => Promise<{ ok: boolean; error?: string }>;
  };
  createConversation?: (payload: { scenarioId: string; personaId: string; scenario?: any }) => Promise<{
    ok: boolean;
    conversationId?: string;
    conversationUrl?: string;
    meetingToken?: string | null;
    code?: string;
    error?: string;
  }>;
  endConversation?: (conversationId: string) => Promise<{ ok: boolean; error?: string }>;
  getPresageConfig: () => Promise<{ configured: boolean; apiKey: string; telemetry: boolean }>;
  probePresage?: () => Promise<{
    sdkLoaded: boolean;
    ipcBound: boolean;
    capiPath: string;
    capiExists: boolean;
    apiKeyConfigured: boolean;
    sdkVersion: string;
    lastLoadError: string | null;
  } | null>;
  storage: {
    getProfile: () => Promise<any>;
    saveProfile: (p: any) => Promise<any>;
    getPersonas: (options?: { limit?: number; offset?: number }) => Promise<any[]>;
    getPersona: (id: string) => Promise<any>;
    createPersona: (p: any) => Promise<any>;
    updatePersona: (id: string, p: any) => Promise<any>;
    deletePersona: (id: string, options?: { deleteTavusPal?: boolean }) => Promise<boolean>;
    getScenarios: (options?: { limit?: number; offset?: number }) => Promise<any[]>;
    getScenario: (id: string) => Promise<any>;
    saveScenario: (s: any) => Promise<{ ok: boolean; scenario?: any; error?: string; code?: string }>;
    updateScenario: (id: string, updates: any) => Promise<{ ok: boolean; scenario?: any; error?: string; code?: string }>;
    createScenario: (s: any) => Promise<any>;
    deleteScenario: (id: string) => Promise<boolean>;
    getRecordings: (params?: any) => Promise<any[]>;
    getRecording: (id: string) => Promise<any>;
    saveRecording: (r: any) => Promise<any>;
    deleteRecording: (id: string) => Promise<boolean>;
    addNote: (recordingId: string, note: any) => Promise<any>;
    getBaseline: () => Promise<any>;
    getActiveBaseline: () => Promise<any>;
    saveBaseline: (b: any) => Promise<any>;
    clearBaseline: () => Promise<boolean>;
    getSettings: () => Promise<Record<string, any>>;
    setSetting: (key: string, value: any) => Promise<boolean>;
    clearAllData: () => Promise<boolean>;
    checkFreeSpace: () => Promise<number>;
    getStreakDates: () => Promise<string[]>;
  };
  recording: {
    start: (payload: {
      id: string;
      kind?: "sessions" | "baseline";
      scenarioId?: string;
      scenarioTitle?: string;
      personaId?: string;
      personaName?: string;
      personaAvatarUrl?: string;
      baselineId?: string;
      interactionType?: string;
      startedAt?: string;
      localDate?: string;
      timezone?: string;
      plannedDurationSeconds?: number;
    }) => Promise<{ id: string; videoPath: string } | null>;
    chunk: (payload: { id: string; seq: number; chunk: Uint8Array | ArrayBuffer }) => Promise<boolean>;
    appendTranscript: (payload: {
      recordingId: string;
      segments: Array<{ seq: number; speaker: string; text: string; startMs: number; endMs: number }>;
    }) => Promise<boolean>;
    appendVitals: (payload: {
      recordingId: string;
      samples: Array<{
        timestampOffsetMs: number;
        pulseBpm: number | null;
        hrvRmssd: number | null;
        breathingRate: number | null;
        confidence: number | null;
        isClean: boolean;
      }>;
    }) => Promise<boolean>;
    finalize: (payload: {
      id: string;
      kind?: "sessions" | "baseline";
      durationMs?: number;
      durationSeconds?: number;
      status?: string;
      endReason?: string;
      composureScore?: number | null;
      avgPulse?: number | null;
      peakPulse?: number | null;
      avgHrvRmssd?: number | null;
      recoverySeconds?: number | null;
      restingPulse?: number | null;
      hrvRmssd?: number | null;
      breathingRate?: number | null;
      cleanFramesPct?: number | null;
      qualityScore?: number | null;
      qualityRating?: string | null;
      invalidReason?: string | null;
    }) => Promise<any>;
    abort: (payload: { id: string; kind?: "sessions" | "baseline" }) => Promise<boolean>;
  };
  audio: {
    startRecording: (id: string) => Promise<string>;
    appendChunk: (id: string, chunk: Uint8Array | ArrayBuffer) => Promise<boolean>;
    finalizeRecording: (id: string) => Promise<string | null>;
  };
  getMediaStatus: (resource: "camera" | "microphone") => Promise<"granted" | "denied" | "not-determined" | "restricted" | "unknown">;
  requestMediaAccess: (resource: "camera" | "microphone") => Promise<boolean>;
  onPermissionsUpdated: (callback: (status: { camera: string; microphone: string }) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
