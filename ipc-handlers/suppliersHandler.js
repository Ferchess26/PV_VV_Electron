const { ipcMain } = require('electron');

function setupSuppliersHandlers(db) {
    // Listar
    ipcMain.handle("suppliers:list", () => {
        try {
            return db.prepare("SELECT * FROM suppliers ORDER BY id ASC").all();
        } catch (error) {
            throw error;
        }
    });

    // Guardar o Actualizar
    ipcMain.handle("suppliers:save", (event, data) => {
        try {
            if (data.id) {
                const stmt = db.prepare(`
                    UPDATE suppliers SET 
                        nombre_empresa = @nombre_empresa, 
                        contacto_nombre = @contacto_nombre,
                        email = @email, 
                        telefono = @telefono, 
                        rfc = @rfc, 
                        direccion = @direccion, 
                        estatus = @estatus
                    WHERE id = @id
                `);
                return stmt.run(data);
            } else {
                const stmt = db.prepare(`
                    INSERT INTO suppliers (
                        nombre_empresa, contacto_nombre, email, 
                        telefono, rfc, direccion, estatus
                    ) VALUES (
                        @nombre_empresa, @contacto_nombre, @email, 
                        @telefono, @rfc, @direccion, @estatus
                    )
                `);
                return stmt.run(data);
            }
        } catch (error) {
            throw error;
        }
    });
}

module.exports = { setupSuppliersHandlers };