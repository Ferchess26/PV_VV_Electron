const { app, BrowserWindow, Menu, ipcMain, protocol } = require("electron");
const path = require("path");
const fs = require("fs");

// Importación de módulos propios
const getDatabase = require("./database/connection");
const initializeDatabase = require("./database/init");
const { setupUserHandlers } = require("./ipc-handlers/userHandlers");
const { setupProductsHandlers } = require("./ipc-handlers/productsHandler");
const { setupClientsHandlers } = require("./ipc-handlers/clientsHandler");
const { setupSuppliersHandlers } = require("./ipc-handlers/suppliersHandler");
const { setupCalendarHandlers } = require("./ipc-handlers/calendarHandler");
const { setupProfileHandlers } = require("./ipc-handlers/profileHandler");

let db;
let loginWindow;
let homeWindow;

function createLoginWindow() {
    Menu.setApplicationMenu(null);
    loginWindow = new BrowserWindow({
        width: 700, height: 450, resizable: false, frame: false, transparent: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    loginWindow.loadFile(path.join(__dirname, "renderer/login/login.html"));
}

function createHomeWindow() {
    homeWindow = new BrowserWindow({
        fullscreen: true, frame: false,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    homeWindow.loadFile(path.join(__dirname, "renderer/home/home.html"));
}

// Ventanas
ipcMain.on("minimize-window", () => { const win = BrowserWindow.getFocusedWindow(); if (win) win.minimize(); });
ipcMain.on("maximize-window", () => { 
    const win = BrowserWindow.getFocusedWindow(); 
    if (win) { if (win.isMaximized()) win.unmaximize(); else win.maximize(); }
});
ipcMain.on("close-window", () => { const win = BrowserWindow.getFocusedWindow(); if (win) win.close(); });
ipcMain.on("login-success", () => { createHomeWindow(); if (loginWindow) loginWindow.close(); });

// GESTIÓN DE IMÁGENES
ipcMain.handle("save-user-photo", async (e, data) => {
    if (!data || !data.sourcePath) throw new Error("Ruta inválida");
    const ext = path.extname(data.sourcePath).toLowerCase();
    const assetsDir = path.join(__dirname, "assets", "profiles");

    if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

    const fileName = `user_${Date.now()}${ext}`;
    const destPath = path.join(assetsDir, fileName);
    fs.copyFileSync(data.sourcePath, destPath);
    
    // Guardamos la ruta relativa en la BD
    return `assets/profiles/${fileName}`;
});

// INICIALIZACIÓN
app.whenReady().then(() => {
    initializeDatabase();
    db = getDatabase();

    setupUserHandlers(db);
    setupProductsHandlers(db);
    setupClientsHandlers(db);
    setupSuppliersHandlers(db);
    setupCalendarHandlers(db);
    setupProfileHandlers(db);

    protocol.registerFileProtocol('media', (request, callback) => {
        const url = request.url.replace('media://', '');
        try {
            const decodedPath = decodeURIComponent(url);
            const fullPath = path.isAbsolute(decodedPath) ? decodedPath : path.join(__dirname, decodedPath);
            return callback({ path: path.normalize(fullPath) });
        } catch (error) { console.error(error); }
    });

    createLoginWindow();
});