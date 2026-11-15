let electronSystemPreferences = null;
try {
  electronSystemPreferences = require("electron").systemPreferences;
} catch {
  // outside electron runtime
}

class PermissionsService {
  constructor(storageManager, getMainWindow, customSystemPreferences = null) {
    this.storageManager = storageManager;
    this.getMainWindow = getMainWindow;
    this.systemPreferences = customSystemPreferences || electronSystemPreferences;
    this.cachedStatus = {
      camera: "not-determined",
      microphone: "not-determined",
    };
  }

  async getStatus(resource) {
    if (resource !== "camera" && resource !== "microphone") {
      return "unknown";
    }

    let osStatus = "unknown";
    if (process.platform === "darwin" && this.systemPreferences && typeof this.systemPreferences.getMediaAccessStatus === "function") {
      try {
        osStatus = this.systemPreferences.getMediaAccessStatus(resource);
      } catch (err) {
        console.error(`[PermissionsService] Failed to get macOS media access status for ${resource}:`, err);
        osStatus = "unknown";
      }
    } else if (process.platform === "win32" && this.systemPreferences) {
      try {
        if (typeof this.systemPreferences.getMediaAccessStatus === "function") {
          osStatus = this.systemPreferences.getMediaAccessStatus(resource);
        } else {
          osStatus = "unknown";
        }
      } catch {
        osStatus = "unknown";
      }
    } else {
      osStatus = "unknown";
    }

    this.cachedStatus[resource] = osStatus;

    if (this.storageManager) {
      try {
        await this.storageManager.execute("permissions:save", {
          resource,
          status: osStatus,
        });
      } catch (err) {
        console.error(`[PermissionsService] Failed to cache permission in SQLite:`, err);
      }
    }

    return osStatus;
  }

  async requestAccess(resource) {
    if (resource !== "camera" && resource !== "microphone") {
      return false;
    }

    const currentStatus = await this.getStatus(resource);
    if (currentStatus === "granted") {
      return true;
    }

    if (process.platform === "darwin" && this.systemPreferences) {
      if (currentStatus === "not-determined") {
        try {
          let granted = false;
          if (typeof this.systemPreferences.askForMediaAccess === "function") {
            granted = await this.systemPreferences.askForMediaAccess(resource);
          }
          const newStatus = typeof this.systemPreferences.getMediaAccessStatus === "function"
            ? this.systemPreferences.getMediaAccessStatus(resource)
            : granted ? "granted" : "denied";

          this.cachedStatus[resource] = newStatus;
          if (this.storageManager) {
            await this.storageManager.execute("permissions:save", {
              resource,
              status: newStatus,
              declinedAt: newStatus === "denied" ? new Date().toISOString() : null,
            });
          }
          this.notifyRenderer();
          return granted || newStatus === "granted";
        } catch (err) {
          console.error(`[PermissionsService] Error requesting macOS media access for ${resource}:`, err);
          return false;
        }
      } else {
        // If already 'denied' or 'restricted', do NOT prompt again
        return false;
      }
    }

    // Windows and Linux:
    // systemPreferences.askForMediaAccess is macOS-only.
    // Return true to allow renderer getUserMedia to prompt or probe
    return true;
  }

  async recordRendererStatus(resource, status) {
    if (resource !== "camera" && resource !== "microphone") return;
    this.cachedStatus[resource] = status;
    if (this.storageManager) {
      try {
        await this.storageManager.execute("permissions:save", {
          resource,
          status,
          declinedAt: status === "denied" ? new Date().toISOString() : null,
        });
      } catch (err) {
        console.error("[PermissionsService] Failed to record renderer status:", err);
      }
    }
    this.notifyRenderer();
  }

  async refreshOnFocus() {
    const prevCam = this.cachedStatus.camera;
    const prevMic = this.cachedStatus.microphone;

    const newCam = await this.getStatus("camera");
    const newMic = await this.getStatus("microphone");

    this.cachedStatus.camera = newCam;
    this.cachedStatus.microphone = newMic;

    if (prevCam !== newCam || prevMic !== newMic) {
      this.notifyRenderer();
    }
  }

  notifyRenderer() {
    try {
      const win = typeof this.getMainWindow === "function" ? this.getMainWindow() : null;
      if (
        win &&
        !win.isDestroyed() &&
        win.webContents &&
        (typeof win.webContents.isDestroyed !== "function" || !win.webContents.isDestroyed())
      ) {
        win.webContents.send("permissions:updated", {
          camera: this.cachedStatus.camera,
          microphone: this.cachedStatus.microphone,
        });
      }
    } catch {
      // webContents was disposing or destroyed
    }
  }
}

module.exports = { PermissionsService };
