const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,

  onMenuAction: (callback) => {
    if (typeof callback !== "function") return () => {};
    const handler = (_event, action) => callback(action);
    ipcRenderer.on("menu-action", handler);
    return () => ipcRenderer.removeListener("menu-action", handler);
  },

  sendWindowAction: (action) => {
    if (typeof action === "string" && ["toggle-fullscreen"].includes(action)) {
      ipcRenderer.send("window-action", action);
    }
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

  tavusStatus: () => ipcRenderer.invoke("tavus:get-status"),
  personaRetrySync: (id) => ipcRenderer.invoke("tavus:sync-persona", id),
  personaPreviewPrompt: (draft) => ipcRenderer.invoke("tavus:preview-prompt", draft),
  tavusListFaces: (options) => ipcRenderer.invoke("tavus:list-faces", options),
  tavusListVoices: (options) => ipcRenderer.invoke("tavus:list-voices", options),

  // Storage API bridge (SQLite worker backed)
  storage: {
    getProfile: () => ipcRenderer.invoke("storage:get-profile"),
    saveProfile: (p) => ipcRenderer.invoke("storage:save-profile", p),
    getPersonas: () => ipcRenderer.invoke("storage:get-personas"),
    createPersona: (p) => ipcRenderer.invoke("storage:create-persona", p),
    updatePersona: (id, persona) => ipcRenderer.invoke("storage:update-persona", { id, persona }),
    deletePersona: (id, options) => ipcRenderer.invoke("storage:delete-persona", id, options),
    getScenarios: () => ipcRenderer.invoke("storage:get-scenarios"),
    createScenario: (sc) => ipcRenderer.invoke("storage:create-scenario", sc),
    deleteScenario: (id) => ipcRenderer.invoke("storage:delete-scenario", id),
    getRecordings: (params) => ipcRenderer.invoke("storage:get-recordings", params),
    getRecording: (id) => ipcRenderer.invoke("storage:get-recording", id),
    saveRecording: (rec) => ipcRenderer.invoke("storage:save-recording", rec),
    deleteRecording: (id) => ipcRenderer.invoke("storage:delete-recording", id),
    addNote: (recordingId, note) => ipcRenderer.invoke("storage:add-note", { recordingId, note }),
    getBaseline: () => ipcRenderer.invoke("storage:get-baseline"),
    saveBaseline: (b) => ipcRenderer.invoke("storage:save-baseline", b),
    clearBaseline: () => ipcRenderer.invoke("storage:clear-baseline"),
    getSettings: () => ipcRenderer.invoke("storage:get-settings"),
    setSetting: (key, value) => ipcRenderer.invoke("storage:set-setting", { key, value }),
    clearAllData: () => ipcRenderer.invoke("storage:clear-all"),
    checkFreeSpace: () => ipcRenderer.invoke("storage:check-space"),
  },

  // Audio Chunk Recorder bridge
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
