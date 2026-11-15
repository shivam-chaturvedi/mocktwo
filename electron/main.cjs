const { app, BrowserWindow, Menu, ipcMain, shell, dialog, screen, session } = require("electron");
const path = require("path");
const fs = require("fs");
const { StorageManager } = require("./storage/storageManager.cjs");
const { PermissionsService } = require("./permissions/permissionsService.cjs");

// 1. Platform Identity for persistent permissions & notification grouping
app.setName("mocktwo");
if (process.platform === "win32") {
  app.setAppUserModelId("com.mocktwo.desktop");
}

const DEV_HOST = "127.0.0.1";
const DEV_PORT = 5173;
const DEV_SERVER_URL = `http://${DEV_HOST}:${DEV_PORT}`;

let mainWindow = null;
let storageManager = null;
let permissionsService = null;
const boundsFilePath = path.join(app.getPath("userData"), "window-bounds.json");
const logsDir = path.join(app.getPath("userData"), "logs");
const primaryLogPath = path.join(logsDir, "mocktwo.log");

// Ensure logs directory exists
try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
} catch (err) {
  console.error("Failed to create logs directory:", err);
}

// -----------------------------------------------------------------------------
// Logging Subsystem: Size-limited, rotated, and rate-limited
// -----------------------------------------------------------------------------
let logCounter = 0;
let lastLogResetTime = Date.now();
const MAX_LOGS_PER_MINUTE = 50;
const MAX_LOG_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function rotateLogsIfNeeded() {
  try {
    if (fs.existsSync(primaryLogPath)) {
      const stats = fs.statSync(primaryLogPath);
      if (stats.size >= MAX_LOG_SIZE_BYTES) {
        const backup2 = path.join(logsDir, "mocktwo.2.log");
        const backup1 = path.join(logsDir, "mocktwo.1.log");
        if (fs.existsSync(backup1)) {
          fs.renameSync(backup1, backup2);
        }
        fs.renameSync(primaryLogPath, backup1);
      }
    }
  } catch (err) {
    console.error("Failed to rotate logs:", err);
  }
}

function writeLogEntry(level, tag, message, extra = {}) {
  const now = Date.now();
  if (now - lastLogResetTime > 60000) {
    logCounter = 0;
    lastLogResetTime = now;
  }
  if (logCounter >= MAX_LOGS_PER_MINUTE) return;
  logCounter++;

  rotateLogsIfNeeded();

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    tag,
    message,
    ...extra,
  };

  const line = JSON.stringify(entry) + "\n";
  fs.appendFile(primaryLogPath, line, (err) => {
    if (err) console.error("Failed to write log entry:", err);
  });
}

// Process-level uncaught error handlers
process.on("uncaughtException", (err) => {
  console.error("[main] Uncaught exception:", err);
  writeLogEntry("fatal", "process:uncaughtException", err.message, { stack: err.stack });
});

process.on("unhandledRejection", (reason) => {
  console.error("[main] Unhandled rejection:", reason);
  writeLogEntry("error", "process:unhandledRejection", String(reason));
});

// -----------------------------------------------------------------------------
// Window Bounds: Debounced, async persistence with multi-display validation
// -----------------------------------------------------------------------------
function loadBounds() {
  const defaultBounds = { width: 1360, height: 860, x: undefined, y: undefined };
  try {
    if (fs.existsSync(boundsFilePath)) {
      const raw = fs.readFileSync(boundsFilePath, "utf8");
      const parsed = JSON.parse(raw);
      if (typeof parsed.width === "number" && typeof parsed.height === "number") {
        // Validate saved bounds are within an active display
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          const displays = screen.getAllDisplays();
          const isVisible = displays.some((d) => {
            const b = d.bounds;
            return (
              parsed.x >= b.x - 20 &&
              parsed.x <= b.x + b.width - 100 &&
              parsed.y >= b.y - 20 &&
              parsed.y <= b.y + b.height - 100
            );
          });
          if (isVisible) return parsed;
        }
        return { ...defaultBounds, width: parsed.width, height: parsed.height };
      }
    }
  } catch (err) {
    writeLogEntry("warn", "window:loadBounds", "Failed to load window bounds, falling back to defaults", { error: String(err) });
  }
  return defaultBounds;
}

let saveBoundsTimeout = null;
let pendingBounds = null;

function debouncedSaveBounds(win) {
  if (!win || win.isDestroyed()) return;
  try {
    pendingBounds = win.getBounds();
    if (saveBoundsTimeout) clearTimeout(saveBoundsTimeout);
    saveBoundsTimeout = setTimeout(async () => {
      if (pendingBounds) {
        try {
          await fs.promises.writeFile(boundsFilePath, JSON.stringify(pendingBounds), "utf8");
        } catch (err) {
          writeLogEntry("error", "window:saveBounds", "Failed to write bounds file", { error: String(err) });
        }
      }
    }, 500);
  } catch {
    // ignore
  }
}

function flushBoundsNow(win) {
  if (saveBoundsTimeout) clearTimeout(saveBoundsTimeout);
  if (win && !win.isDestroyed()) {
    try {
      const b = win.getBounds();
      fs.writeFileSync(boundsFilePath, JSON.stringify(b), "utf8");
    } catch {
      // ignore
    }
  }
}

// -----------------------------------------------------------------------------
// Native Application Menu & Action Bridge
// -----------------------------------------------------------------------------
function sendAction(action) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("menu-action", action);
  }
}

function buildMenu() {
  const isMac = process.platform === "darwin";

  const template = [
    ...(isMac
      ? [
          {
            label: "mocktwo",
            submenu: [
              { role: "about", label: "About mocktwo" },
              { type: "separator" },
              {
                label: "Settings…",
                accelerator: "CmdOrCtrl+,",
                click: () => sendAction("open-settings"),
              },
              {
                label: "Privacy & Permissions…",
                click: () => sendAction("open-settings-privacy"),
              },
              { type: "separator" },
              {
                label: "Sign Out…",
                click: () => sendAction("sign-out"),
              },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide", label: "Hide mocktwo" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit", label: "Quit mocktwo" },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "New Scenario…",
          accelerator: "CmdOrCtrl+N",
          click: () => sendAction("new-scenario"),
        },
        {
          label: "New Persona…",
          accelerator: "CmdOrCtrl+Shift+N",
          click: () => sendAction("new-persona"),
        },
        { type: "separator" },
        {
          label: "Quick Practice…",
          accelerator: "CmdOrCtrl+Shift+P",
          click: () => sendAction("quick-practice"),
        },
        ...(!isMac
          ? [
              { type: "separator" },
              {
                label: "Settings…",
                accelerator: "Ctrl+,",
                click: () => sendAction("open-settings"),
              },
              {
                label: "Privacy & Permissions…",
                click: () => sendAction("open-settings-privacy"),
              },
              { type: "separator" },
              { role: "quit" },
            ]
          : [{ type: "separator" }, { role: "close" }]),
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        {
          label: "Home",
          accelerator: "CmdOrCtrl+1",
          click: () => sendAction("navigate-today"),
        },
        {
          label: "Scenarios",
          accelerator: "CmdOrCtrl+2",
          click: () => sendAction("navigate-scenarios"),
        },
        {
          label: "Recordings",
          accelerator: "CmdOrCtrl+3",
          click: () => sendAction("navigate-recordings"),
        },
        {
          label: "Progress",
          accelerator: "CmdOrCtrl+4",
          click: () => sendAction("navigate-progress"),
        },
        { type: "separator" },
        {
          label: "Search & Command Palette…",
          accelerator: "CmdOrCtrl+K",
          click: () => sendAction("toggle-search"),
        },
        { type: "separator" },
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(isMac
          ? [
              { type: "separator" },
              { role: "front" },
              { type: "separator" },
              { role: "window" },
            ]
          : [{ role: "close" }]),
      ],
    },
    {
      role: "help",
      submenu: [
        {
          label: "mocktwo Knowledge Base",
          click: () => sendAction("open-help"),
        },
        { type: "separator" },
        {
          label: "Reveal Application Logs",
          click: () => shell.openPath(logsDir),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// -----------------------------------------------------------------------------
// Window Creation, Lifecycle & Crash Resilience
// -----------------------------------------------------------------------------
let recentCrashTimestamps = [];

function isAllowedReload() {
  const now = Date.now();
  recentCrashTimestamps = recentCrashTimestamps.filter((t) => now - t < 60000);
  return recentCrashTimestamps.length < 3;
}

function isValidSender(frame) {
  if (!frame || !frame.url) return false;
  const url = frame.url;
  if (app.isPackaged) {
    return url.startsWith("file://");
  }
  return url.startsWith(DEV_SERVER_URL) || url.startsWith("file://");
}

function createWindow() {
  const initialBounds = loadBounds();

  mainWindow = new BrowserWindow({
    width: initialBounds.width || 1360,
    height: initialBounds.height || 860,
    x: initialBounds.x,
    y: initialBounds.y,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    title: "mocktwo",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 18, y: 18 },
    vibrancy: "under-window",
    visualEffectState: "active",
    backgroundColor: "#1e1e1e",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      zoomFactor: 1.0,
      navigateOnDragDrop: false,
    },
  });

  // Strict CSP via webRequest headers
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const isDev = !app.isPackaged;
    const csp = isDev
      ? `default-src 'self' ${DEV_SERVER_URL}; script-src 'self' 'unsafe-inline' 'unsafe-eval' ${DEV_SERVER_URL}; style-src 'self' 'unsafe-inline' ${DEV_SERVER_URL}; font-src 'self' data: ${DEV_SERVER_URL}; img-src 'self' data: blob: https:; media-src 'self' blob:; worker-src 'self' blob:; connect-src 'self' ws://${DEV_HOST}:${DEV_PORT} ${DEV_SERVER_URL} ws://localhost:* http://localhost:*; object-src 'none'; base-uri 'none'; frame-ancestors 'none';`
      : `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob: https:; media-src 'self' blob:; worker-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none';`;

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [csp],
      },
    });
  });

  // Session Permission Handlers: Media only for trusted application origin
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const url = details.requestingUrl || webContents.getURL();
    const isAllowedOrigin = app.isPackaged
      ? url.startsWith("file://")
      : url.startsWith(DEV_SERVER_URL) || url.startsWith("file://");

    if (isAllowedOrigin && permission === "media") {
      callback(true);
    } else {
      writeLogEntry("warn", "security:permissionDenied", `Denied request for '${permission}' from '${url}'`);
      callback(false);
    }
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    const isAllowedOrigin = app.isPackaged
      ? requestingOrigin.startsWith("file://")
      : requestingOrigin.startsWith(DEV_SERVER_URL) || requestingOrigin.startsWith("file://");

    return isAllowedOrigin && permission === "media";
  });

  // Block unexpected window opens
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    writeLogEntry("info", "navigation:windowOpenBlocked", `Blocked window.open for ${url}`);
    if (url.startsWith("https://") || url.startsWith("http://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  // Restrict in-window navigation
  mainWindow.webContents.on("will-navigate", (e, url) => {
    const isAllowed = app.isPackaged
      ? url.startsWith("file://")
      : url.startsWith(DEV_SERVER_URL) || url.startsWith("file://");
    if (!isAllowed) {
      e.preventDefault();
      writeLogEntry("warn", "navigation:willNavigateBlocked", `Blocked navigation to ${url}`);
    }
  });

  // Crash Resilience
  mainWindow.webContents.on("render-process-gone", (event, details) => {
    writeLogEntry("fatal", "renderer:render-process-gone", "Renderer process gone", { details });
    const now = Date.now();
    recentCrashTimestamps.push(now);

    if (isAllowedReload()) {
      dialog
        .showMessageBox(mainWindow, {
          type: "error",
          title: "mocktwo encountered a problem",
          message: "The rehearsal window crashed unexpectedly.",
          detail: `Reason: ${details.reason}. Would you like to reload?`,
          buttons: ["Reload Rehearsal Window", "Quit mocktwo"],
          defaultId: 0,
        })
        .then(({ response }) => {
          if (response === 0 && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.reload();
          } else {
            app.quit();
          }
        });
    } else {
      dialog.showErrorBox(
        "mocktwo Stability Guard",
        "Repeated renderer crashes detected (3 in one minute). The application will now close to prevent instability."
      );
      app.quit();
    }
  });

  mainWindow.webContents.on("unresponsive", () => {
    writeLogEntry("warn", "renderer:unresponsive", "Renderer window became unresponsive");
  });

  mainWindow.webContents.on("responsive", () => {
    writeLogEntry("info", "renderer:responsive", "Renderer window became responsive again");
  });

  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame) {
      writeLogEntry("error", "renderer:did-fail-load", `Failed to load ${validatedURL}: ${errorDescription} (${errorCode})`);
      if (!app.isPackaged) {
        // In dev mode, retry connection if server was just booting
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.loadURL(DEV_SERVER_URL).catch(() => {});
          }
        }, 1000);
      }
    }
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow.webContents.setVisualZoomLevelLimits(1, 1).catch(() => {});
  });

  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    const levelStr = ["verbose", "info", "warning", "error"][level] || "log";
    console.log(`[renderer ${levelStr}] ${message}`);
    if (level >= 3) {
      writeLogEntry("error", "renderer:console", message, { line, sourceId });
    }
  });

  mainWindow.on("resize", () => debouncedSaveBounds(mainWindow));
  mainWindow.on("move", () => debouncedSaveBounds(mainWindow));
  mainWindow.on("close", () => flushBoundsNow(mainWindow));

  buildMenu();

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html")).catch((err) => {
      console.error("[main] Failed to load production index.html:", err);
    });
  } else {
    mainWindow.loadURL(DEV_SERVER_URL).catch((err) => {
      console.warn("[main] Initial connection to dev server failed; will retry on did-fail-load:", err.message);
    });
  }
}

app.whenReady().then(() => {
  storageManager = new StorageManager(app.getPath("userData"));
  permissionsService = new PermissionsService(storageManager, () => mainWindow);
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("browser-window-focus", () => {
  if (permissionsService) {
    permissionsService.refreshOnFocus().catch((err) => {
      console.error("[main] Failed to refresh permissions on focus:", err);
    });
  }
});

app.on("before-quit", () => {
  if (storageManager) {
    storageManager.close();
  }
});

// -----------------------------------------------------------------------------
// IPC Handlers
// -----------------------------------------------------------------------------
ipcMain.on("window-action", (event, action) => {
  if (!isValidSender(event.senderFrame)) return;
  if (!mainWindow || typeof action !== "string") return;
  if (action === "toggle-fullscreen") {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});

ipcMain.on("log-error", (event, payload) => {
  if (!isValidSender(event.senderFrame)) return;
  if (payload && typeof payload === "object") {
    const safePayload = JSON.stringify(payload).slice(0, 16384);
    try {
      const parsed = JSON.parse(safePayload);
      writeLogEntry("error", "renderer:error", parsed.message || "Renderer reported error", parsed);
    } catch {
      // ignore malformed payloads
    }
  }
});

ipcMain.handle("reveal-logs", async (event) => {
  if (!isValidSender(event.senderFrame)) return false;
  return shell.openPath(logsDir);
});

ipcMain.handle("open-system-settings", async (event, pane) => {
  if (!isValidSender(event.senderFrame)) return false;
  if (process.platform === "darwin") {
    if (pane === "camera") {
      await shell.openExternal("x-apple.systempreferences:com.apple.preference.security?Privacy_Camera");
      return true;
    } else if (pane === "microphone") {
      await shell.openExternal("x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone");
      return true;
    }
  } else if (process.platform === "win32") {
    if (pane === "camera") {
      await shell.openExternal("ms-settings:privacy-webcam");
      return true;
    } else if (pane === "microphone") {
      await shell.openExternal("ms-settings:privacy-microphone");
      return true;
    }
  }
  return false;
});

// Storage IPC Handlers
ipcMain.handle("storage:get-profile", async (event) => {
  if (!isValidSender(event.senderFrame) || !storageManager) return null;
  return storageManager.execute("profile:get");
});

ipcMain.handle("storage:save-profile", async (event, profile) => {
  if (!isValidSender(event.senderFrame) || !storageManager) return null;
  return storageManager.execute("profile:save", profile);
});

ipcMain.handle("storage:get-personas", async (event) => {
  if (!isValidSender(event.senderFrame) || !storageManager) return [];
  return storageManager.execute("personas:list");
});

ipcMain.handle("storage:create-persona", async (event, persona) => {
  if (!isValidSender(event.senderFrame) || !storageManager) return null;
  return storageManager.execute("personas:create", persona);
});

ipcMain.handle("storage:update-persona", async (event, payload) => {
  if (!isValidSender(event.senderFrame) || !storageManager) return null;
  return storageManager.execute("personas:update", payload);
});

ipcMain.handle("storage:delete-persona", async (event, id) => {
  if (!isValidSender(event.senderFrame) || !storageManager) return false;
  return storageManager.execute("personas:delete", id);
});

ipcMain.handle("storage:get-scenarios", async (event) => {
  if (!isValidSender(event.senderFrame) || !storageManager) return [];
  return storageManager.execute("scenarios:list");
});

ipcMain.handle("storage:create-scenario", async (event, scenario) => {
  if (!isValidSender(event.senderFrame) || !storageManager) return null;
  return storageManager.execute("scenarios:create", scenario);
});

ipcMain.handle("storage:delete-scenario", async (event, id) => {
  if (!isValidSender(event.senderFrame) || !storageManager) return false;
  return storageManager.execute("scenarios:delete", id);
});

ipcMain.handle("storage:get-recordings", async (event, params) => {
  if (!isValidSender(event.senderFrame) || !storageManager) return [];
  return storageManager.execute("recordings:list", params);
});

ipcMain.handle("storage:get-recording", async (event, id) => {
  if (!isValidSender(event.senderFrame) || !storageManager) return null;
  return storageManager.execute("recordings:get", id);
});

ipcMain.handle("storage:save-recording", async (event, rec) => {
  if (!isValidSender(event.senderFrame) || !storageManager) return null;
  return storageManager.execute("recordings:save", rec);
});

ipcMain.handle("storage:delete-recording", async (event, id) => {
  if (!isValidSender(event.senderFrame) || !storageManager) return false;
  return storageManager.execute("recordings:delete", id);
});

ipcMain.handle("storage:add-note", async (event, payload) => {
  if (!isValidSender(event.senderFrame) || !storageManager) return null;
  return storageManager.execute("recordings:add-note", payload);
});

ipcMain.handle("storage:get-baseline", async (event) => {
  if (!isValidSender(event.senderFrame) || !storageManager) return null;
  return storageManager.execute("baseline:get");
});

ipcMain.handle("storage:save-baseline", async (event, baseline) => {
  if (!isValidSender(event.senderFrame) || !storageManager) return null;
  return storageManager.execute("baseline:save", baseline);
});

ipcMain.handle("storage:clear-baseline", async (event) => {
  if (!isValidSender(event.senderFrame) || !storageManager) return false;
  return storageManager.execute("baseline:clear");
});

ipcMain.handle("storage:get-settings", async (event) => {
  if (!isValidSender(event.senderFrame) || !storageManager) return {};
  return storageManager.execute("settings:get-all");
});

ipcMain.handle("storage:set-setting", async (event, payload) => {
  if (!isValidSender(event.senderFrame) || !storageManager) return false;
  return storageManager.execute("settings:set", payload);
});

ipcMain.handle("storage:clear-all", async (event) => {
  if (!isValidSender(event.senderFrame) || !storageManager) return false;
  return storageManager.execute("data:clear-all");
});

ipcMain.handle("storage:check-space", async (event) => {
  if (!isValidSender(event.senderFrame) || !storageManager) return Number.MAX_SAFE_INTEGER;
  return storageManager.checkFreeSpaceBytes();
});

// Audio Chunk Recording Handlers
ipcMain.handle("audio:start-recording", async (event, id) => {
  if (!isValidSender(event.senderFrame) || !storageManager) return null;
  return storageManager.startAudioRecording(id);
});

ipcMain.handle("audio:append-chunk", async (event, { id, chunk }) => {
  if (!isValidSender(event.senderFrame) || !storageManager) return false;
  const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
  await storageManager.appendAudioChunk(id, buffer);
  return true;
});

ipcMain.handle("audio:finalize-recording", async (event, id) => {
  if (!isValidSender(event.senderFrame) || !storageManager) return null;
  return storageManager.finalizeAudioRecording(id);
});

// Permissions Handlers
ipcMain.handle("permissions:get-status", async (event, resource) => {
  if (!isValidSender(event.senderFrame) || !permissionsService) return "unknown";
  return permissionsService.getStatus(resource);
});

ipcMain.handle("permissions:request", async (event, resource) => {
  if (!isValidSender(event.senderFrame) || !permissionsService) return false;
  return permissionsService.requestAccess(resource);
});
