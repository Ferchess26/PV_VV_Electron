// ipc-handlers/userHandlers.js
const { ipcMain } = require('electron');
const { getConsolidatedPermissions } = require("../database/permissionHelper");

function setupUserHandlers(db) {

    // ========================================
    // LOGIN CON PERMISOS Y SESIÓN GLOBAL
    // ========================================
    ipcMain.handle("login", (event, { user, pass }) => {

        const foundUser = db.prepare(`
        SELECT 
            u.id,
            u.username,
            u.nombre,
            u.apellido_paterno,
            u.apellido_materno,
            u.id_rol,
            r.nombre AS rol
        FROM users u
        INNER JOIN roles r ON r.id = u.id_rol
        WHERE u.username = ? AND u.password = ? `).get(user, pass);

        if (!foundUser) return null;

        const permisos = getConsolidatedPermissions(foundUser.id);

        global.sharedUser = {
            id: foundUser.id,
            username: foundUser.username,
            nombre: `${foundUser.nombre} ${foundUser.apellido_paterno}`,
            rol: foundUser.rol,
            permisos
        };

        return global.sharedUser;
    });


    // ========================================
    // WRAPPERS DE BASE DE DATOS
    // ========================================
    ipcMain.handle("db-query", (event, { sql, params }) => {
        const stmt = db.prepare(sql);
        return stmt.all(params || []);
    });

    ipcMain.handle("db-run", (event, { sql, params }) => {
        const stmt = db.prepare(sql);
        return stmt.run(params || []);
    });

    ipcMain.handle("db-exec", (event, sql) => {
        return db.exec(sql);
    });

    // ========================================
    // EXTRA: obtener sesión en cualquier ventana
    // ========================================
    ipcMain.handle("get-user-session", () => {
        return global.sharedUser || null;
    });

}

module.exports = { setupUserHandlers };
