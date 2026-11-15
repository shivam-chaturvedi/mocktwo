const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  onMenuAction: (callback) => {
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
  }
});

