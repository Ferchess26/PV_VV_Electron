const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const path = require("path");
const getDatabase = require("./database/connection");

// Importamos el archivo de inicialización
const initializeDatabase = require("./database/init");

let mainWindow;

function createWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    frame: false,
    roundedCorners: true,
    transparent: false,
    visualEffectState: "active",

    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadFile(path.join(__dirname, "renderer/login/login.html"));
}

function createHomeWindow() {
  const homeWindow = new BrowserWindow({
    fullscreen: true,
    frame: false,
    roundedCorners: true,
    transparent: false,
    visualEffectState: "active",

    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  homeWindow.loadFile(path.join(__dirname, "renderer/home/home.html"));
}

ipcMain.on("login-success", () => {
  createHomeWindow();
  mainWindow.close();
});

ipcMain.handle("login", (event, { user, pass }) => {
  const db = getDatabase();

  const result = db.prepare(
    "SELECT * FROM users WHERE username = ? AND password = ?"
  ).get(user, pass);

  db.close();

  if (result) {
    return true;
  } else {
    return false;
  }
});

ipcMain.on("minimize-window", () => mainWindow.minimize());
ipcMain.on("maximize-window", () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on("close-window", () => mainWindow.close());


// =============================
// Handlers de base de datos
// =============================
ipcMain.handle("db-query", (event, { sql, params }) => {
  const db = getDatabase();
  const stmt = db.prepare(sql);
  const result = stmt.all(params || []);
  db.close();
  return result;
});

ipcMain.handle("db-run", (event, { sql, params }) => {
  const db = getDatabase();
  const stmt = db.prepare(sql);
  const result = stmt.run(params || []);
  db.close();
  return result;
});

ipcMain.handle("db-exec", (event, sql) => {
  const db = getDatabase();
  const result = db.exec(sql);
  db.close();
  return result;
});

app.whenReady().then(() => {
  initializeDatabase();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
