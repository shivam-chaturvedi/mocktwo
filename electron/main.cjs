const { app, BrowserWindow, Menu, ipcMain, shell, dialog, screen, session, nativeImage, protocol, net } = require("electron");
const path = require("path");
const fs = require("fs");
const { fileURLToPath } = require("url");
const { StorageManager } = require("./storage/storageManager.cjs");
const { PermissionsService } = require("./permissions/permissionsService.cjs");
const { initConfig, getConfig, getClientConfig } = require("./config/seedConfig.cjs");

// Enforce single instance lock to prevent concurrent app instances or duplicate seed runs
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}


// Reliable packaging check: on macOS dev, branding changes CFBundleExecutable which makes
// app.isPackaged true even in dev. In true production builds, files reside in app.asar.
function isPackagedApp() {
  return Boolean(app && app.isPackaged && __dirname.includes("app.asar"));
}

// Load environment variables with dotenv in dev mode only
function loadEnvironment() {
  if (isPackagedApp()) {
    return;
  }
  try {
    const dotenv = require("dotenv");
    const envPath = path.join(__dirname, "../.env");
    const envExamplePath = path.join(__dirname, "../.env.example");
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    } else if (fs.existsSync(envExamplePath)) {
      dotenv.config({ path: envExamplePath });
    }
  } catch (err) {
    console.error("[main] Failed to load .env:", err);
  }
}

loadEnvironment();

// Register custom asset protocol scheme before app is ready
if (protocol && typeof protocol.registerSchemesAsPrivileged === "function") {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: "mocktwo-asset",
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
      },
    },
  ]);
}

const APP_NAME = process.env.APP_NAME || "mocktwo";
const APP_VERSION = process.env.APP_VERSION || "1.0.0";
const APP_COPYRIGHT = process.env.APP_COPYRIGHT || `Copyright © 2026 ${APP_NAME}`;
const APP_ID = process.env.APP_ID || "com.mocktwo.app";

// 1. Platform Identity for persistent permissions & notification grouping
app.setName(APP_NAME);
if (typeof app.setVersion === "function") {
  app.setVersion(APP_VERSION);
}
if (process.platform === "win32") {
  app.setAppUserModelId(APP_ID);
}

// Initialize and freeze seeding/tunables configuration
initConfig(app);

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

const DEV_HOST = "127.0.0.1";
const DEV_PORT = 5173;
const DEV_SERVER_URL = `http://${DEV_HOST}:${DEV_PORT}`;
const appIconPath = path.join(__dirname, "../build/icon.png");

let mainWindow = null;
let storageManager = null;
let permissionsService = null;
let syncService = null;
let tavusClient = null;
let seedOrchestrator = null;
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

function redactSecrets(obj) {
  if (typeof obj === "string") {
    return obj
      .replace(/tvsk_[a-zA-Z0-9_-]+/g, "tvsk_***REDACTED***")
      .replace(/(x-api-key\s*[:=]\s*)[^\s,]+/gi, "$1***REDACTED***")
      .replace(/(authorization\s*[:=]\s*Bearer\s+)[^\s,]+/gi, "$1***REDACTED***");
  }
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(redactSecrets);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const lk = k.toLowerCase();
    if (lk.includes("key") || lk.includes("secret") || lk.includes("token") || lk.includes("auth")) {
      out[k] = "***REDACTED***";
    } else {
      out[k] = redactSecrets(v);
    }
  }
  return out;
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
    message: redactSecrets(message),
    ...redactSecrets(extra),
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
  try {
    if (saveBoundsTimeout) {
      clearTimeout(saveBoundsTimeout);
      saveBoundsTimeout = null;
    }
    const b = (win && !win.isDestroyed()) ? win.getBounds() : pendingBounds;
    if (b) {
      fs.writeFileSync(boundsFilePath, JSON.stringify(b), "utf8");
    }
  } catch {
    // ignore
  }
}

// -----------------------------------------------------------------------------
// Native Application Menu & Action Bridge
// -----------------------------------------------------------------------------
function sendAction(action) {
  try {
    if (
      mainWindow &&
      !mainWindow.isDestroyed() &&
      mainWindow.webContents &&
      (typeof mainWindow.webContents.isDestroyed !== "function" || !mainWindow.webContents.isDestroyed())
    ) {
      mainWindow.webContents.send("menu-action", action);
    }
  } catch {
    // window or webContents was disposed
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
              {
                label: "About mocktwo",
                click: () => {
                  app.showAboutPanel();
                },
              },
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
    ...(!isPackagedApp()
      ? [
          {
            label: "Developer",
            submenu: [
              {
                label: "Reset Database & Re-seed Everything…",
                click: async () => {
                  if (!mainWindow || mainWindow.isDestroyed()) return;
                  const choice = await dialog.showMessageBox(mainWindow, {
                    type: "warning",
                    buttons: ["Reset & Re-seed", "Cancel"],
                    defaultId: 1,
                    cancelId: 1,
                    title: "Reset Database (Developer)",
                    message: "Completely wipe SQLite database and re-seed?",
                    detail:
                      "This deletes all personas, scenarios, recordings, baselines, and seed state, then runs initial seeding fresh.",
                  });
                  if (choice.response === 0) {
                    await storageManager.execute("data:reset-database-dev");
                    if (seedOrchestrator) {
                      await seedOrchestrator.runSeeding();
                    }
                    mainWindow.reload();
                  }
                },
              },
              {
                label: "Clear User Data (Settings Wipe)…",
                click: async () => {
                  if (!mainWindow || mainWindow.isDestroyed()) return;
                  const choice = await dialog.showMessageBox(mainWindow, {
                    type: "warning",
                    buttons: ["Clear User Data", "Cancel"],
                    defaultId: 1,
                    cancelId: 1,
                    title: "Clear User Data",
                    message: "Clear recordings, baselines, and custom scenarios?",
                    detail: "Preserves built-in personas and scenarios.",
                  });
                  if (choice.response === 0) {
                    await storageManager.execute("data:clear-all");
                    mainWindow.webContents.executeJavaScript("localStorage.clear(); window.location.reload();");
                  }
                },
              },
              {
                label: "Re-run Avatar Seeding",
                click: async () => {
                  if (seedOrchestrator) {
                    await seedOrchestrator.runSeeding();
                  }
                },
              },
              { type: "separator" },
              { role: "toggleDevTools" },
            ],
          },
        ]
      : []),
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

function isAllowedAppOrigin(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    if (isPackagedApp()) {
      if (parsed.protocol !== "file:") return false;
      const appPath = path.resolve(app.getAppPath());
      const filePath = fileURLToPath(url);
      return filePath === appPath || filePath.startsWith(appPath + path.sep);
    }
    if (parsed.origin === DEV_SERVER_URL) return true;
    if (parsed.protocol === "file:") {
      const distPath = path.resolve(__dirname, "../dist");
      const filePath = fileURLToPath(url);
      return filePath === distPath || filePath.startsWith(distPath + path.sep);
    }
    return false;
  } catch {
    return false;
  }
}

function isValidSender(frameOrEvent) {
  try {
    if (!frameOrEvent) return false;
    const frame = frameOrEvent.senderFrame !== undefined ? frameOrEvent.senderFrame : frameOrEvent;
    if (!frame || !frame.url) return false;
    return isAllowedAppOrigin(frame.url);
  } catch {
    // Gracefully handle frame disposal during rapid navigation/reload
    return false;
  }
}

let isSessionSecurityConfigured = false;

function configureSessionSecurity() {
  if (isSessionSecurityConfigured) return;
  isSessionSecurityConfigured = true;

  // Strict CSP via webRequest headers
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const isDev = !isPackagedApp();
    // Dev-only CSP allows local Vite HMR WebSocket on 127.0.0.1; production CSP enforces secure defaults
    // nosemgrep: javascript.lang.security.detect-insecure-websocket.detect-insecure-websocket
    const csp = isDev
      ? `default-src 'self' ${DEV_SERVER_URL}; script-src 'self' 'unsafe-inline' 'unsafe-eval' ${DEV_SERVER_URL}; style-src 'self' 'unsafe-inline' ${DEV_SERVER_URL}; font-src 'self' data: ${DEV_SERVER_URL}; img-src 'self' data: blob: https: mocktwo-asset: ${DEV_SERVER_URL}; media-src 'self' blob: https: mocktwo-asset:; worker-src 'self' blob:; connect-src 'self' ws://${DEV_HOST}:${DEV_PORT} ${DEV_SERVER_URL} https://tavusapi.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none';`
      : `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob: https: mocktwo-asset:; media-src 'self' blob: https: mocktwo-asset:; worker-src 'self' blob:; connect-src 'self' https://tavusapi.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none';`;

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
    if (isAllowedAppOrigin(url) && permission === "media") {
      callback(true);
    } else {
      writeLogEntry("warn", "security:permissionDenied", `Denied request for '${permission}' from '${url}'`);
      callback(false);
    }
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    return isAllowedAppOrigin(requestingOrigin) && permission === "media";
  });
}

function createWindow() {
  configureSessionSecurity();
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
    icon: appIconPath,
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

  // Block unexpected window opens
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    writeLogEntry("info", "navigation:windowOpenBlocked", `Blocked window.open for ${url}`);
    try {
      const parsed = new URL(url);
      if (parsed.protocol === "https:") {
        shell.openExternal(url);
      }
    } catch {
      // invalid URL
    }
    return { action: "deny" };
  });

  // Restrict in-window navigation
  mainWindow.webContents.on("will-navigate", (e, url) => {
    const isAllowed = isAllowedAppOrigin(url);
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
      if (!isPackagedApp()) {
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
    if (seedOrchestrator) {
      const conf = getConfig();
      setTimeout(() => {
        seedOrchestrator.runSeeding().catch((err) => {
          console.warn("[main] Background seeding non-blocking error:", err.message);
        });
      }, conf.SEED_STARTUP_DELAY_MS || 1000);
    }
  });

  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow.webContents.setVisualZoomLevelLimits(1, 1).catch(() => {});
  });

  mainWindow.webContents.on("console-message", (event) => {
    const level = typeof event?.level === "number" ? event.level : 0;
    const message = event?.message || "";
    const line = event?.lineNumber;
    const sourceId = event?.sourceId;
    const levelStr = ["verbose", "info", "warning", "error"][level] || "log";
    console.log(`[renderer ${levelStr}] ${message}`);
    if (level >= 3) {
      writeLogEntry("error", "renderer:console", message, { line, sourceId });
    }
  });

  mainWindow.on("resize", () => debouncedSaveBounds(mainWindow));
  mainWindow.on("move", () => debouncedSaveBounds(mainWindow));
  mainWindow.on("close", () => flushBoundsNow(mainWindow));
  mainWindow.on("page-title-updated", (event) => {
    event.preventDefault();
  });

  buildMenu();

  if (isPackagedApp()) {
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
  if (process.platform === "darwin" && app.dock) {
    try {
      const dockIcon = nativeImage.createFromPath(appIconPath);
      if (!dockIcon.isEmpty()) {
        app.dock.setIcon(dockIcon);
      }
    } catch (err) {
      console.warn("[main] Failed to set dock icon:", err.message);
    }
  }

  app.setAboutPanelOptions({
    applicationName: APP_NAME,
    applicationVersion: APP_VERSION,
    version: APP_VERSION,
    copyright: APP_COPYRIGHT,
    iconPath: appIconPath,
  });

  // Handle mocktwo-asset:// protocol safely
  if (protocol && typeof protocol.handle === "function") {
    protocol.handle("mocktwo-asset", async (request) => {
      try {
        const url = new URL(request.url);
        const cleanHost = String(url.host || "").replace(/[^a-zA-Z0-9_-]/g, "");
        const cleanPathname = String(url.pathname || "").replace(/[^a-zA-Z0-9_\-\.\/]/g, "");
        const relative = path.join(cleanHost, cleanPathname);
        const { resolveAssetPath } = require("./tavus/assetStore.cjs");
        const safePath = resolveAssetPath(app.getPath("userData"), relative);
        if (!safePath || !fs.existsSync(safePath)) {
          return new Response("Not found", { status: 404 });
        }
        return net.fetch(pathToFileURL(safePath).toString());
      } catch (err) {
        writeLogEntry("warn", "protocol:mocktwo-asset", `Failed to serve asset: ${err.message}`);
        return new Response("Internal error", { status: 500 });
      }
    });
  }

  storageManager = new StorageManager(app.getPath("userData"));
  permissionsService = new PermissionsService(storageManager, () => mainWindow);

  const { SeedOrchestrator } = require("./seed/seedOrchestrator.cjs");
  seedOrchestrator = new SeedOrchestrator(storageManager, {
    onProgress: (progress) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("seed:progress", progress);
      }
    },
  });

  try {
    const { TavusClient } = require("./tavus/tavusClient.cjs");
    const { SyncService } = require("./tavus/syncService.cjs");
    tavusClient = new TavusClient();
    syncService = new SyncService(storageManager, { tavusClient });
  } catch (err) {
    writeLogEntry("error", "main:syncServiceInit", `Failed to initialize Tavus SyncService: ${err.message}`);
  }
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
  try {
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
  } catch (err) {
    writeLogEntry("warn", "system:openSettingsFailed", `Failed to open settings for ${pane}: ${err.message}`);
    return false;
  }
  return false;
});

// Storage IPC Handlers
ipcMain.handle("storage:get-profile", async (event) => {
  try {
    if (!isValidSender(event) || !storageManager) return null;
    return await storageManager.execute("profile:get");
  } catch (err) {
    writeLogEntry("warn", "ipc:storage:get-profile", err.message);
    return null;
  }
});

ipcMain.handle("storage:save-profile", async (event, profile) => {
  try {
    if (!isValidSender(event) || !storageManager) return null;
    return await storageManager.execute("profile:save", profile);
  } catch (err) {
    writeLogEntry("warn", "ipc:storage:save-profile", err.message);
    return null;
  }
});

ipcMain.handle("storage:get-personas", async (event, options) => {
  try {
    if (!isValidSender(event) || !storageManager) return [];
    return await storageManager.execute("personas:list", options);
  } catch (err) {
    writeLogEntry("warn", "ipc:storage:get-personas", err.message);
    return [];
  }
});

ipcMain.handle("storage:get-persona", async (event, id) => {
  try {
    if (!isValidSender(event) || !storageManager) return null;
    return await storageManager.execute("personas:get", id);
  } catch (err) {
    writeLogEntry("warn", "ipc:storage:get-persona", err.message);
    return null;
  }
});

ipcMain.handle("storage:create-persona", async (event, persona) => {
  try {
    if (!isValidSender(event) || !storageManager) return null;
    const { PersonaInputSchema } = require("./tavus/validation.cjs");
    const validated = PersonaInputSchema.parse(persona);
    const created = await storageManager.execute("personas:create", validated);
    if (syncService && created && created.id) {
      if (process.env.TAVUS_API_KEY && validated.tavusFaceId) {
        try {
          return await syncService.syncPersona(created.id);
        } catch {
          return await storageManager.execute("personas:get", created.id);
        }
      }
    }
    return created;
  } catch (err) {
    writeLogEntry("warn", "ipc:storage:create-persona", err.message);
    throw new Error(err.message || "Failed to create persona");
  }
});

ipcMain.handle("storage:update-persona", async (event, payload) => {
  try {
    if (!isValidSender(event) || !storageManager) return null;
    const { PersonaUpdateSchema } = require("./tavus/validation.cjs");
    const validated = PersonaUpdateSchema.parse(payload);
    const updated = await storageManager.execute("personas:update", validated);
    if (syncService && updated && updated.id) {
      if (process.env.TAVUS_API_KEY && (updated.tavusFaceId || validated.persona.tavusFaceId)) {
        try {
          return await syncService.syncPersona(updated.id);
        } catch {
          return await storageManager.execute("personas:get", updated.id);
        }
      }
    }
    return updated;
  } catch (err) {
    writeLogEntry("warn", "ipc:storage:update-persona", err.message);
    throw new Error(err.message || "Failed to update persona");
  }
});

ipcMain.handle("storage:delete-persona", async (event, id, options = {}) => {
  try {
    if (!isValidSender(event) || !storageManager || typeof id !== "string" || !id.trim()) return false;
    if (syncService) {
      return await syncService.deletePersona(id.trim(), options);
    }
    return await storageManager.execute("personas:delete", id.trim());
  } catch (err) {
    writeLogEntry("warn", "ipc:storage:delete-persona", err.message);
    return false;
  }
});

ipcMain.handle("storage:get-scenarios", async (event, options) => {
  try {
    if (!isValidSender(event) || !storageManager) return [];
    return await storageManager.execute("scenarios:list", options);
  } catch (err) {
    writeLogEntry("warn", "ipc:storage:get-scenarios", err.message);
    return [];
  }
});

ipcMain.handle("storage:get-scenario", async (event, id) => {
  try {
    if (!isValidSender(event) || !storageManager) return null;
    return await storageManager.execute("scenarios:get", id);
  } catch (err) {
    writeLogEntry("warn", "ipc:storage:get-scenario", err.message);
    return null;
  }
});

ipcMain.handle("storage:save-scenario", async (event, scenario) => {
  try {
    if (!isValidSender(event) || !storageManager) {
      return { ok: false, code: "forbidden", error: "Unauthorized IPC request" };
    }
    const { ScenarioStudioSchema } = require("./validators/scenarioSchemas.cjs");
    const parsed = ScenarioStudioSchema.safeParse(scenario);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false, code: "validation_error", error: `${issue.path.join(".")}: ${issue.message}` };
    }
    return await storageManager.execute("scenarios:save-studio", parsed.data);
  } catch (err) {
    writeLogEntry("warn", "ipc:storage:save-scenario", err.message);
    return { ok: false, code: "server_error", error: err.message };
  }
});

ipcMain.handle("storage:update-scenario", async (event, id, updates) => {
  try {
    if (!isValidSender(event) || !storageManager) {
      return { ok: false, code: "forbidden", error: "Unauthorized IPC request" };
    }
    const { ScenarioStudioUpdateSchema } = require("./validators/scenarioSchemas.cjs");
    const payload = { ...(updates || {}), id: typeof id === "string" ? id.trim() : (updates && updates.id) };
    const parsed = ScenarioStudioUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false, code: "validation_error", error: `${issue.path.join(".")}: ${issue.message}` };
    }
    return await storageManager.execute("scenarios:update-studio", parsed.data);
  } catch (err) {
    writeLogEntry("warn", "ipc:storage:update-scenario", err.message);
    return { ok: false, code: "server_error", error: err.message };
  }
});

ipcMain.handle("storage:create-scenario", async (event, scenario) => {
  try {
    if (!isValidSender(event) || !storageManager) return null;
    const { ScenarioLegacyCreateSchema } = require("./validators/scenarioSchemas.cjs");
    const parsed = ScenarioLegacyCreateSchema.safeParse(scenario);
    const data = parsed.success ? parsed.data : scenario;
    return await storageManager.execute("scenarios:create", data);
  } catch (err) {
    writeLogEntry("warn", "ipc:storage:create-scenario", err.message);
    return null;
  }
});

ipcMain.handle("storage:delete-scenario", async (event, id) => {
  try {
    if (!isValidSender(event) || !storageManager || typeof id !== "string" || !id.trim()) return false;
    return await storageManager.execute("scenarios:delete", id.trim());
  } catch (err) {
    writeLogEntry("warn", "ipc:storage:delete-scenario", err.message);
    return false;
  }
});

ipcMain.handle("storage:get-recordings", async (event, params) => {
  try {
    if (!isValidSender(event) || !storageManager) return [];
    return await storageManager.execute("recordings:list", params);
  } catch (err) {
    writeLogEntry("warn", "ipc:storage:get-recordings", err.message);
    return [];
  }
});

ipcMain.handle("storage:get-recording", async (event, id) => {
  try {
    if (!isValidSender(event) || !storageManager || typeof id !== "string" || !id.trim()) return null;
    return await storageManager.execute("recordings:get", id.trim());
  } catch (err) {
    writeLogEntry("warn", "ipc:storage:get-recording", err.message);
    return null;
  }
});

ipcMain.handle("storage:save-recording", async (event, rec) => {
  try {
    if (!isValidSender(event) || !storageManager) return null;
    return await storageManager.execute("recordings:save", rec);
  } catch (err) {
    writeLogEntry("warn", "ipc:storage:save-recording", err.message);
    return null;
  }
});

ipcMain.handle("storage:delete-recording", async (event, id) => {
  try {
    if (!isValidSender(event) || !storageManager || typeof id !== "string" || !id.trim()) return false;
    return await storageManager.execute("recordings:delete", id.trim());
  } catch (err) {
    writeLogEntry("warn", "ipc:storage:delete-recording", err.message);
    return false;
  }
});

ipcMain.handle("storage:add-note", async (event, payload) => {
  try {
    if (!isValidSender(event) || !storageManager) return null;
    return await storageManager.execute("recordings:add-note", payload);
  } catch (err) {
    writeLogEntry("warn", "ipc:storage:add-note", err.message);
    return null;
  }
});

ipcMain.handle("storage:get-baseline", async (event) => {
  try {
    if (!isValidSender(event) || !storageManager) return null;
    return await storageManager.execute("baseline:get");
  } catch (err) {
    writeLogEntry("warn", "ipc:storage:get-baseline", err.message);
    return null;
  }
});

ipcMain.handle("storage:save-baseline", async (event, baseline) => {
  try {
    if (!isValidSender(event) || !storageManager) return null;
    return await storageManager.execute("baseline:save", baseline);
  } catch (err) {
    writeLogEntry("warn", "ipc:storage:save-baseline", err.message);
    return null;
  }
});

ipcMain.handle("storage:clear-baseline", async (event) => {
  try {
    if (!isValidSender(event) || !storageManager) return false;
    return await storageManager.execute("baseline:clear");
  } catch (err) {
    writeLogEntry("warn", "ipc:storage:clear-baseline", err.message);
    return false;
  }
});

ipcMain.handle("storage:get-settings", async (event) => {
  try {
    if (!isValidSender(event) || !storageManager) return {};
    return await storageManager.execute("settings:get-all");
  } catch (err) {
    writeLogEntry("warn", "ipc:storage:get-settings", err.message);
    return {};
  }
});

ipcMain.handle("storage:set-setting", async (event, payload) => {
  try {
    if (!isValidSender(event) || !storageManager) return false;
    return await storageManager.execute("settings:set", payload);
  } catch (err) {
    writeLogEntry("warn", "ipc:storage:set-setting", err.message);
    return false;
  }
});

ipcMain.handle("storage:clear-all", async (event) => {
  try {
    if (!isValidSender(event) || !storageManager) return false;
    return await storageManager.execute("data:clear-all");
  } catch (err) {
    writeLogEntry("warn", "ipc:storage:clear-all", err.message);
    return false;
  }
});

ipcMain.handle("storage:check-space", async (event) => {
  try {
    if (!isValidSender(event) || !storageManager) return Number.MAX_SAFE_INTEGER;
    return await storageManager.checkFreeSpaceBytes();
  } catch (err) {
    writeLogEntry("warn", "ipc:storage:check-space", err.message);
    return Number.MAX_SAFE_INTEGER;
  }
});

// Audio Chunk Recording Handlers
ipcMain.handle("audio:start-recording", async (event, id) => {
  try {
    if (!isValidSender(event) || !storageManager || typeof id !== "string" || !id.trim()) return null;
    return await storageManager.startAudioRecording(id.trim());
  } catch (err) {
    writeLogEntry("warn", "ipc:audio:start-recording", err.message);
    return null;
  }
});

ipcMain.handle("audio:append-chunk", async (event, payload) => {
  try {
    if (!isValidSender(event) || !storageManager || !payload || typeof payload !== "object") return false;
    const { id, chunk } = payload;
    if (typeof id !== "string" || !id.trim() || !chunk) return false;

    let buffer;
    if (Buffer.isBuffer(chunk)) {
      buffer = chunk;
    } else if (chunk instanceof ArrayBuffer || ArrayBuffer.isView(chunk)) {
      buffer = Buffer.from(chunk);
    } else if (Array.isArray(chunk)) {
      buffer = Buffer.from(chunk);
    } else {
      return false;
    }

    // Limit individual chunk size to 10 MB to prevent memory exhaustion
    if (buffer.length > 10 * 1024 * 1024) {
      writeLogEntry("warn", "ipc:audio:append-chunk", "Audio chunk exceeds maximum allowed size (10 MB)");
      return false;
    }

    await storageManager.appendAudioChunk(id.trim(), buffer);
    return true;
  } catch (err) {
    writeLogEntry("warn", "ipc:audio:append-chunk", err.message);
    return false;
  }
});

ipcMain.handle("audio:finalize-recording", async (event, id) => {
  try {
    if (!isValidSender(event) || !storageManager || typeof id !== "string" || !id.trim()) return null;
    return await storageManager.finalizeAudioRecording(id.trim());
  } catch (err) {
    writeLogEntry("warn", "ipc:audio:finalize-recording", err.message);
    return null;
  }
});

// Permissions Handlers
ipcMain.handle("permissions:get-status", async (event, resource) => {
  try {
    if (!isValidSender(event) || !permissionsService) return "unknown";
    return await permissionsService.getStatus(resource);
  } catch (err) {
    writeLogEntry("warn", "ipc:permissions:get-status", err.message);
    return "unknown";
  }
});

ipcMain.handle("permissions:request", async (event, resource) => {
  try {
    if (!isValidSender(event) || !permissionsService) return false;
    return await permissionsService.requestAccess(resource);
  } catch (err) {
    writeLogEntry("warn", "ipc:permissions:request", err.message);
    return false;
  }
});

// Tavus Integration Handlers
ipcMain.handle("tavus:get-status", async (event) => {
  try {
    if (!isValidSender(event)) return { configured: false };
    const hasKey = Boolean(process.env.TAVUS_API_KEY && process.env.TAVUS_API_KEY.trim().length > 0);
    return { configured: hasKey };
  } catch (err) {
    writeLogEntry("warn", "ipc:tavus:get-status", err.message);
    return { configured: false };
  }
});

ipcMain.handle("tavus:sync-persona", async (event, id) => {
  try {
    if (!isValidSender(event) || !syncService || typeof id !== "string" || !id.trim()) return null;
    return await syncService.syncPersona(id.trim());
  } catch (err) {
    writeLogEntry("warn", "ipc:tavus:sync-persona", err.message);
    throw new Error(err.message || "Sync failed");
  }
});

ipcMain.handle("tavus:preview-prompt", async (event, draft) => {
  try {
    if (!isValidSender(event)) return null;
    const { buildSystemPrompt } = require("./tavus/promptBuilder.cjs");
    return buildSystemPrompt(draft || {});
  } catch (err) {
    writeLogEntry("warn", "ipc:tavus:preview-prompt", err.message);
    return null;
  }
});

ipcMain.handle("config:get-client", async (event) => {
  if (!isValidSender(event)) return null;
  return getClientConfig(app);
});

ipcMain.handle("seed:get-status", async (event) => {
  if (!isValidSender(event) || !seedOrchestrator) {
    return { isSeeding: false, personasStatus: "pending", scenariosStatus: "pending" };
  }
  return seedOrchestrator.getStatus();
});

ipcMain.handle("seed:retry", async (event) => {
  if (!isValidSender(event) || !seedOrchestrator) return false;
  seedOrchestrator.runSeeding().catch((err) => {
    console.warn("[main] Manual seed retry error:", err.message);
  });
  return true;
});

ipcMain.handle("tavus:list-faces", async (event, options = {}) => {
  try {
    if (!isValidSender(event) || !storageManager) return { data: [], total_count: 0 };
    const conf = getConfig();
    const CACHE_TTL_MS = conf.TAVUS_CATALOG_CACHE_TTL_MS;
    const force = Boolean(options && options.forceRefresh);

    if (!force) {
      const cached = await storageManager.execute("tavus:cache:get", "faces");
      if (cached && cached.payload && cached.fetchedAt) {
        const age = Date.now() - new Date(cached.fetchedAt).getTime();
        if (age < CACHE_TTL_MS) {
          return cached.payload;
        }
      }
    }

    if (!tavusClient) {
      const { TavusClient } = require("./tavus/tavusClient.cjs");
      tavusClient = new TavusClient();
    }

    const defaultLimit = conf.TAVUS_FACES_PAGE_SIZE;
    const result = await tavusClient.listFaces({
      page: options && options.page ? options.page : 1,
      limit: Math.min(Number(options && options.limit) || defaultLimit, 100),
    });
    if (result && Array.isArray(result.data)) {
      await storageManager.execute("tavus:cache:set", { kind: "faces", payload: result });
    }
    return result;
  } catch (err) {
    writeLogEntry("warn", "ipc:tavus:list-faces", err.message);
    try {
      const cached = await storageManager.execute("tavus:cache:get", "faces");
      if (cached && cached.payload) return cached.payload;
    } catch {
      // ignore
    }
    throw new Error(err.message || "Failed to list faces");
  }
});

ipcMain.handle("tavus:list-voices", async (event, options = {}) => {
  try {
    if (!isValidSender(event) || !storageManager) return { data: [], total_count: 0 };
    const conf = getConfig();
    const CACHE_TTL_MS = conf.TAVUS_CATALOG_CACHE_TTL_MS;
    const force = Boolean(options && options.forceRefresh);

    if (!force) {
      const cached = await storageManager.execute("tavus:cache:get", "voices");
      if (cached && cached.payload && cached.fetchedAt) {
        const age = Date.now() - new Date(cached.fetchedAt).getTime();
        if (age < CACHE_TTL_MS) {
          return cached.payload;
        }
      }
    }

    if (!tavusClient) {
      const { TavusClient } = require("./tavus/tavusClient.cjs");
      tavusClient = new TavusClient();
    }

    const defaultLimit = conf.SEED_BATCH_SIZE;
    const result = await tavusClient.listVoices({
      page: options && options.page ? options.page : 1,
      limit: Math.min(Number(options && options.limit) || defaultLimit, 100),
    });
    if (result && Array.isArray(result.data)) {
      await storageManager.execute("tavus:cache:set", { kind: "voices", payload: result });
    }
    return result;
  } catch (err) {
    writeLogEntry("warn", "ipc:tavus:list-voices", err.message);
    try {
      const cached = await storageManager.execute("tavus:cache:get", "voices");
      if (cached && cached.payload) return cached.payload;
    } catch {
      // ignore
    }
    throw new Error(err.message || "Failed to list voices");
  }
});

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    isAllowedAppOrigin,
    isValidSender,
  };
}
