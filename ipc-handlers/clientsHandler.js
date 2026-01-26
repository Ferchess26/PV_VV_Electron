const { ipcMain } = require('electron');

function setupClientsHandlers(db) {
    // ========================================
    // LISTAR CLIENTES
    // ========================================
    ipcMain.handle("clients:list", () => {
        try {
            return db.prepare("SELECT * FROM clients ORDER BY ID ASC").all();
        } catch (error) {
            throw error;
        }
    });

    // ========================================
    // GUARDAR O ACTUALIZAR CLIENTE
    // ========================================
    ipcMain.handle("clients:save", (event, data) => {
        try {
            if (data.id) {
                const stmt = db.prepare(`
                    UPDATE clients SET 
                        nombre = @nombre, 
                        apellido_paterno = @apellido_paterno,
                        apellido_materno = @apellido_materno,
                        telefono = @telefono, 
                        email = @email, 
                        direccion = @direccion,
                        rfc = @rfc,
                        estatus = @estatus
                    WHERE id = @id
                `);
                return stmt.run(data);
            } else {
                const stmt = db.prepare(`
                    INSERT INTO clients (
                        nombre, apellido_paterno, apellido_materno, 
                        telefono, email, direccion, rfc, estatus
                    ) VALUES (
                        @nombre, @apellido_paterno, @apellido_materno, 
                        @telefono, @email, @direccion, @rfc, @estatus
                    )
                `);
                return stmt.run(data);
            }
        } catch (error) {
            throw error; // El error se captura en el frontend para mostrar el mensaje de "RFC/Email duplicado"
        }
    });

    ipcMain.handle("clients:search", (event, query) => {
        const q = `%${query}%`;
        return db.prepare(`
            SELECT *, 
            (nombre || ' ' || apellido_paterno) AS nombre_completo 
            FROM clients 
            WHERE (nombre LIKE ? OR telefono LIKE ? OR rfc LIKE ?) 
        `).all(q, q, q);
    });
}

module.exports = { setupClientsHandlers };