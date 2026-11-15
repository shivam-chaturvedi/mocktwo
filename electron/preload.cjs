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
