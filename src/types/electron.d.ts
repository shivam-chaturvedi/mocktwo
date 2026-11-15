export interface ElectronAPI {
  platform: string;
  onMenuAction: (callback: (action: string) => void) => () => void;
  sendWindowAction: (action: string) => void;
  openSystemSettings: (pane: "camera" | "microphone") => Promise<boolean>;
  logError: (payload: Record<string, unknown>) => void;
  revealLogs: () => Promise<string>;
  storage: {
    getProfile: () => Promise<any>;
    saveProfile: (p: any) => Promise<any>;
    getPersonas: () => Promise<any[]>;
    createPersona: (p: any) => Promise<any>;
    updatePersona: (id: string, p: any) => Promise<any>;
    deletePersona: (id: string) => Promise<boolean>;
    getScenarios: () => Promise<any[]>;
    createScenario: (s: any) => Promise<any>;
    deleteScenario: (id: string) => Promise<boolean>;
    getRecordings: (params?: any) => Promise<any[]>;
    getRecording: (id: string) => Promise<any>;
    saveRecording: (r: any) => Promise<any>;
    deleteRecording: (id: string) => Promise<boolean>;
    addNote: (recordingId: string, note: any) => Promise<any>;
    getBaseline: () => Promise<any>;
    saveBaseline: (b: any) => Promise<any>;
    clearBaseline: () => Promise<boolean>;
    getSettings: () => Promise<Record<string, any>>;
    setSetting: (key: string, value: any) => Promise<boolean>;
    clearAllData: () => Promise<boolean>;
    checkFreeSpace: () => Promise<number>;
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
