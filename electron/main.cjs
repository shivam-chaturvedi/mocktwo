const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

app.setName("mocktwo");

let mainWindow = null;
const boundsFilePath = path.join(app.getPath("userData"), "window-bounds.json");

function loadBounds() {
  try {
    if (fs.existsSync(boundsFilePath)) {
      return JSON.parse(fs.readFileSync(boundsFilePath, "utf8"));
    }
  } catch {
    // fallback
  }
  return { width: 1360, height: 860 };
}

function saveBounds(win) {
  try {
    const bounds = win.getBounds();
    fs.writeFileSync(boundsFilePath, JSON.stringify(bounds), "utf8");
  } catch {
    // ignore
  }
}

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
                click: () => sendAction("open-settings")
              },
              { type: "separator" },
              {
                label: "Sign Out…",
                click: () => sendAction("sign-out")
              },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide", label: "Hide mocktwo" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit", label: "Quit mocktwo" }
            ]
          }
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "New Scenario…",
          accelerator: "CmdOrCtrl+N",
          click: () => sendAction("new-scenario")
        },
        {
          label: "New Guest…",
          accelerator: "CmdOrCtrl+Shift+N",
          click: () => sendAction("new-guest")
        },
        { type: "separator" },
        {
          label: "Quick Practice…",
          accelerator: "CmdOrCtrl+Shift+P",
          click: () => sendAction("quick-practice")
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" }
      ]
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
        { role: "selectAll" }
      ]
    },
    {
      label: "View",
      submenu: [
        {
          label: "Today",
          accelerator: "CmdOrCtrl+1",
          click: () => sendAction("tab-today")
        },
        {
          label: "Scenarios",
          accelerator: "CmdOrCtrl+2",
          click: () => sendAction("tab-scenarios")
        },
        {
          label: "Recordings",
          accelerator: "CmdOrCtrl+3",
          click: () => sendAction("tab-recordings")
        },
        {
          label: "Progress",
          accelerator: "CmdOrCtrl+4",
          click: () => sendAction("tab-progress")
        },
        { type: "separator" },
        {
          label: "Search Scenarios…",
          accelerator: "CmdOrCtrl+K",
          click: () => sendAction("open-search")
        },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    },
    {
      label: "Session",
      submenu: [
        {
          label: "Start Recommended Session",
          accelerator: "Return",
          click: () => sendAction("start-recommended")
        },
        {
          label: "End Active Session",
          accelerator: "CmdOrCtrl+.",
          click: () => sendAction("end-session")
        }
      ]
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
              { role: "window" }
            ]
          : [{ role: "close" }])
      ]
    },
    {
      role: "help",
      submenu: [
        {
          label: "mocktwo Knowledge Base",
          click: () => sendAction("open-help")
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  const initialBounds = loadBounds();

  mainWindow = new BrowserWindow({
    width: initialBounds.width || 1360,
    height: initialBounds.height || 860,
    x: initialBounds.x,
    y: initialBounds.y,
    minWidth: 1000,
    minHeight: 680,
    title: "mocktwo",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 18, y: 18 },
    vibrancy: "under-window",
    visualEffectState: "active",
    backgroundColor: "#1e1e1e",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.on("resize", () => saveBounds(mainWindow));
  mainWindow.on("move", () => saveBounds(mainWindow));

  buildMenu();

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  } else {
    mainWindow.loadURL("http://localhost:5173");
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.on("window-action", (_event, action) => {
  if (!mainWindow) return;
  if (action === "toggle-fullscreen") {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});
