const { contextBridge, ipcRenderer } = require("electron");

// Presage SmartSpectra preload bridge (contextIsolation & sandbox compliant)
try {
  require("@smartspectra/node-sdk/preload");
} catch {
  try {
    const path = require("path");
    require(path.join(__dirname, "../node_modules/@smartspectra/node-sdk/js/preload/index.js"));
  } catch (_e) {
    // If already exposed by session.setPreloads, ignore
  }
}

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,

  getPresageConfig: () => ipcRenderer.invoke("presage:get-config"),
  probePresage: () => ipcRenderer.invoke("presage:probe"),

  onMenuAction: (callback) => {
    if (typeof callback !== "function") return () => {};
    const handler = (_event, action) => callback(action);
    ipcRenderer.on("menu-action", handler);
    return () => ipcRenderer.removeListener("menu-action", handler);
  },

  onAppWillClose: (callback) => {
    if (typeof callback !== "function") return () => {};
    const handler = () => callback();
    ipcRenderer.on("app:will-close", handler);
    return () => ipcRenderer.removeListener("app:will-close", handler);
  },

  sendWindowAction: (action) => {
    if (typeof action === "string" && ["toggle-fullscreen", "exit-fullscreen"].includes(action)) {
      ipcRenderer.send("window-action", action);
    }
  },

  onFullscreenChange: (callback) => {
    if (typeof callback !== "function") return () => {};
    const handler = (_event, isFullscreen) => callback(isFullscreen);
    ipcRenderer.on("fullscreen-change", handler);
    return () => ipcRenderer.removeListener("fullscreen-change", handler);
  },

  openSystemSettings: (pane) => {
    if (typeof pane === "string" && ["camera", "microphone"].includes(pane)) {
      return ipcRenderer.invoke("open-system-settings", pane);
    }
    return Promise.resolve(false);
  },

  logError: (payload) => {
    if (payload && typeof payload === "object") {
      ipcRenderer.send("log-error", payload);
    }
  },

  revealLogs: () => {
    return ipcRenderer.invoke("reveal-logs");
  },

  getClientConfig: () => ipcRenderer.invoke("config:get-client"),

  seedGetStatus: () => ipcRenderer.invoke("seed:get-status"),
  seedRetry: () => ipcRenderer.invoke("seed:retry"),
  onSeedProgress: (callback) => {
    if (typeof callback !== "function") return () => {};
    const handler = (_event, progress) => callback(progress);
    ipcRenderer.on("seed:progress", handler);
    return () => ipcRenderer.removeListener("seed:progress", handler);
  },

  tavusStatus: () => ipcRenderer.invoke("tavus:get-status"),
  personaRetrySync: (id) => ipcRenderer.invoke("tavus:sync-persona", id),
  personaPreviewPrompt: (draft) => ipcRenderer.invoke("tavus:preview-prompt", draft),
  tavusListFaces: (options) => ipcRenderer.invoke("tavus:list-faces", options),
  tavusListVoices: (options) => ipcRenderer.invoke("tavus:list-voices", options),

  // Tavus CVI Live Conversation
  tavus: {
    createConversation: (payload) => ipcRenderer.invoke("tavus:conversation:create", payload),
    endConversation: (conversationId) => ipcRenderer.invoke("tavus:conversation:end", conversationId),
  },
  createConversation: (payload) => ipcRenderer.invoke("tavus:conversation:create", payload),
  endConversation: (conversationId) => ipcRenderer.invoke("tavus:conversation:end", conversationId),

  // Storage API bridge (SQLite worker backed)
  storage: {
    getProfile: () => ipcRenderer.invoke("storage:get-profile"),
    saveProfile: (p) => ipcRenderer.invoke("storage:save-profile", p),
    getPersonas: (options) => ipcRenderer.invoke("storage:get-personas", options),
    getPersona: (id) => ipcRenderer.invoke("storage:get-persona", id),
    createPersona: (p) => ipcRenderer.invoke("storage:create-persona", p),
    updatePersona: (id, persona) => ipcRenderer.invoke("storage:update-persona", { id, persona }),
    deletePersona: (id, options) => ipcRenderer.invoke("storage:delete-persona", id, options),
    getScenarios: (options) => ipcRenderer.invoke("storage:get-scenarios", options),
    getScenario: (id) => ipcRenderer.invoke("storage:get-scenario", id),
    saveScenario: (sc) => ipcRenderer.invoke("storage:save-scenario", sc),
    updateScenario: (id, updates) => ipcRenderer.invoke("storage:update-scenario", id, updates),
    createScenario: (sc) => ipcRenderer.invoke("storage:create-scenario", sc),
    deleteScenario: (id) => ipcRenderer.invoke("storage:delete-scenario", id),
    getRecordings: (params) => ipcRenderer.invoke("storage:get-recordings", params),
    getRecording: (id) => ipcRenderer.invoke("storage:get-recording", id),
    saveRecording: (rec) => ipcRenderer.invoke("storage:save-recording", rec),
    deleteRecording: (id) => ipcRenderer.invoke("storage:delete-recording", id),
    addNote: (recordingId, note) => ipcRenderer.invoke("storage:add-note", { recordingId, note }),
    getBaseline: () => ipcRenderer.invoke("storage:get-baseline"),
    getActiveBaseline: () => ipcRenderer.invoke("storage:get-active-baseline"),
    saveBaseline: (b) => ipcRenderer.invoke("storage:save-baseline", b),
    clearBaseline: () => ipcRenderer.invoke("storage:clear-baseline"),
    onBaselineChange: (callback) => {
      if (typeof callback !== "function") return () => {};
      const handler = (_event, baseline) => callback(baseline);
      ipcRenderer.on("baseline:changed", handler);
      return () => ipcRenderer.removeListener("baseline:changed", handler);
    },
    getSettings: () => ipcRenderer.invoke("storage:get-settings"),
    setSetting: (key, value) => ipcRenderer.invoke("storage:set-setting", { key, value }),
    clearAllData: () => ipcRenderer.invoke("storage:clear-all"),
    checkFreeSpace: () => ipcRenderer.invoke("storage:check-space"),
    getStreakDates: () => ipcRenderer.invoke("storage:get-streak-dates"),
  },

  // Unified MediaRecorder bridge (Sessions & Baselines)
  recording: {
    start: (payload) => ipcRenderer.invoke("recording:start", payload),
    chunk: (payload) => ipcRenderer.invoke("recording:chunk", payload),
    appendTranscript: (payload) => ipcRenderer.invoke("recording:append-transcript", payload),
    appendVitals: (payload) => ipcRenderer.invoke("recording:append-vitals", payload),
    finalize: (payload) => ipcRenderer.invoke("recording:finalize", payload),
    abort: (payload) => ipcRenderer.invoke("recording:abort", payload),
  },

  // Audio Chunk Recorder bridge (legacy compatibility)
  audio: {
    startRecording: (id) => ipcRenderer.invoke("audio:start-recording", id),
    appendChunk: (id, chunk) => ipcRenderer.invoke("audio:append-chunk", { id, chunk }),
    finalizeRecording: (id) => ipcRenderer.invoke("audio:finalize-recording", id),
  },

  // Permissions API bridge (used in Phase 4)
  getMediaStatus: (resource) => {
    if (typeof resource === "string" && ["camera", "microphone"].includes(resource)) {
      return ipcRenderer.invoke("permissions:get-status", resource);
    }
    return Promise.resolve("unknown");
  },

  requestMediaAccess: (resource) => {
    if (typeof resource === "string" && ["camera", "microphone"].includes(resource)) {
      return ipcRenderer.invoke("permissions:request", resource);
    }
    return Promise.resolve(false);
  },

  onPermissionsUpdated: (callback) => {
    if (typeof callback !== "function") return () => {};
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("permissions:updated", handler);
    return () => ipcRenderer.removeListener("permissions:updated", handler);
  },
});
