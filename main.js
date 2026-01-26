const { app, BrowserWindow, Menu, ipcMain, protocol } = require("electron");
const path = require("path");
const getDatabase = require("./database/connection");
const initializeDatabase = require("./database/init");
const fs = require("fs");

const { setupUserHandlers } = require("./ipc-handlers/userHandlers");

let mainWindow;
let db;

function createWindow() {
    Menu.setApplicationMenu(null);
    mainWindow = new BrowserWindow({
        width: 700,
        height: 450,
        resizable: false,
        frame: false,
        roundedCorners: true,
        transparent: true,
        visualEffectState: "active",
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
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
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    homeWindow.loadFile(path.join(__dirname, "renderer/home/home.html"));
}

ipcMain.on("minimize-window", () => mainWindow.minimize());
ipcMain.on("maximize-window", () => {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
});
ipcMain.on("close-window", () => mainWindow.close());

ipcMain.on("login-success", () => {
    createHomeWindow();
    mainWindow.close();
});

ipcMain.handle("save-product-image", async (e, data) => {
    if (!data || !data.sourcePath) throw new Error("sourcePath inválido");

    // VALIDACIÓN DE EXTENSIONES
    const ext = path.extname(data.sourcePath).toLowerCase();
    const validExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    if (!validExts.includes(ext)) throw new Error("Formato no válido");

    const assetsDir = path.join(__dirname, "assets", "products");
    if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

    // NOMBRE ÚNICO (No borra las anteriores)
    const fileName = `prod_${Date.now()}${ext}`;
    const destPath = path.join(assetsDir, fileName);

    fs.copyFileSync(data.sourcePath, destPath);
    return `assets/products/${fileName}`;
});


ipcMain.handle("save-user-photo", async (e, data) => {
    if (!data || !data.sourcePath) throw new Error("Ruta inválida");
    const ext = path.extname(data.sourcePath).toLowerCase();
    const validExts = ['.jpg', '.jpeg', '.png', '.webp'];
    if (!validExts.includes(ext)) throw new Error("Formato no válido");

    const assetsDir = path.join(__dirname, "assets", "profiles");
    if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

    const fileName = `user_${Date.now()}${ext}`;
    const destPath = path.join(assetsDir, fileName);
    fs.copyFileSync(data.sourcePath, destPath);
    return `assets/profiles/${fileName}`;
});

app.whenReady().then(() => {
    initializeDatabase();
    db = getDatabase();
    setupUserHandlers(db);

    protocol.registerFileProtocol('media', (request, callback) => {
        const url = request.url.replace('media://', '');
        try {
            return callback(path.normalize(decodeURIComponent(url)));
        } catch (error) {
            console.error('Error al leer archivo', error);
        }
    });

    createWindow();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
    if (db) db.close();
});