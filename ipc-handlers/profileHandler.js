const { ipcMain } = require("electron");

function setupProfileHandlers(db) {
    // Obtener datos del perfil con JOIN a roles
    ipcMain.handle("get-profile-data", async (event, userId) => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT u.*, r.nombre as rol_nombre 
                FROM users u 
                LEFT JOIN roles r ON u.id_rol = r.id 
                WHERE u.id = ?`;
            
            // Usamos db.get porque better-sqlite3 es síncrono, 
            // pero si usas el wrapper de tus otros handlers:
            try {
                const row = db.prepare(sql).get(userId);
                resolve(row);
            } catch (err) {
                reject(err);
            }
        });
    });

    ipcMain.handle("update-profile", async (event, { sql, params }) => {
        return new Promise((resolve, reject) => {
            try {
                const stmt = db.prepare(sql);
                const info = stmt.run(...params);
                resolve({ changes: info.changes });
            } catch (err) {
                reject(err);
            }
        });
    });
}

module.exports = { setupProfileHandlers };