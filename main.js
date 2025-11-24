const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const path = require("path");
const getDatabase = require("./database/connection");
const initializeDatabase = require("./database/init");

// 1. IMPORTAMOS LOS HANDLERS DE USUARIO MODULARIZADOS
const { setupUserHandlers } = require("./ipc-handlers/userHandlers"); 

let mainWindow;
let db; // Variable global para la conexión a la BD

/**
 * Crea la ventana de Login (Módulo 700x450px)
 */
function createWindow() {
    Menu.setApplicationMenu(null);

    mainWindow = new BrowserWindow({
        // Dimensiones ajustadas a tu diseño compacto de dos columnas:
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
            disableBlinkFeatures: 'CSSAntialiasing'
        },
    });

    mainWindow.loadFile(path.join(__dirname, "renderer/login/login.html"));
}

/**
 * Crea la ventana principal (Home) después del login exitoso
 */
function createHomeWindow() {
    const homeWindow = new BrowserWindow({
        fullscreen: true,
        frame: false, // Puedes cambiar a true si quieres la barra nativa para el Home
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

// =============================
// IPC Handlers de Ventana (Se quedan en main.js por ser de control de ventana)
// =============================

ipcMain.on("minimize-window", () => mainWindow.minimize());

ipcMain.on("maximize-window", () => {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
});

ipcMain.on("close-window", () => mainWindow.close());


// =============================
// IPC Handler de Navegación (Se queda en main.js por ser control de ventana)
// =============================

ipcMain.on("login-success", () => {
    createHomeWindow();
    mainWindow.close();
});

// =============================
// CICLO DE VIDA Y MODULARIZACIÓN
// =============================

app.whenReady().then(() => {
    initializeDatabase(); 
    db = getDatabase();     // <-- ABRE la conexión global aquí

    // 2. EJECUTAMOS LOS HANDLERS MODULARIZADOS
    setupUserHandlers(db);
    // setupProductHandlers(db); // Para futuros módulos
    
    createWindow();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

// 3. CIERRA la conexión global a la BD antes de que la aplicación termine
app.on("before-quit", () => {
    if (db) {
        db.close();
        console.log("Conexión a la base de datos cerrada.");
    }
});