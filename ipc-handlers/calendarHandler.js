const { ipcMain } = require('electron');

function setupCalendarHandlers(db) {
    // Listar todos los eventos (con unión al color del tipo de cita)
    ipcMain.handle("calendar:list", () => {
        return db.prepare(`
            SELECT c.*, tc.color as tColor 
            FROM calendar c 
            LEFT JOIN tipos_cita tc ON c.id_tipo_cita = tc.id
        `).all();
    });

    // Listar eventos de un día específico
    ipcMain.handle("calendar:get-day", (event, dateStr) => {
        return db.prepare(`
            SELECT c.*, tc.color 
            FROM calendar c 
            LEFT JOIN tipos_cita tc ON c.id_tipo_cita = tc.id 
            WHERE date(c.fecha_inicio) = date(?) 
            ORDER BY c.fecha_inicio ASC
        `).all(dateStr);
    });

    // Guardar o Actualizar evento
    ipcMain.handle("calendar:save", (event, data) => {
        if (data.id) {
            const stmt = db.prepare(`
                UPDATE calendar SET 
                    id_cliente = @id_cliente, 
                    id_tipo_cita = @id_tipo_cita, 
                    nombre_cliente = @nombre_cliente, 
                    titulo = @titulo, 
                    observaciones = @observaciones, 
                    telefono_contacto = @telefono_contacto, 
                    usuario_creador = @usuario_creador, 
                    fecha_inicio = @fecha_inicio, 
                    fecha_fin = @fecha_fin, 
                    estatus = @estatus 
                WHERE id = @id
            `);
            return stmt.run(data);
        } else {
            const stmt = db.prepare(`
                INSERT INTO calendar (
                    id_cliente, id_tipo_cita, nombre_cliente, titulo, 
                    observaciones, telefono_contacto, usuario_creador, 
                    fecha_inicio, fecha_fin, estatus
                ) VALUES (
                    @id_cliente, @id_tipo_cita, @nombre_cliente, @titulo, 
                    @observaciones, @telefono_contacto, @usuario_creador, 
                    @fecha_inicio, @fecha_fin, @estatus
                )
            `);
            return stmt.run(data);
        }
    });

    // Actualizar solo tiempos (Drag & Drop o Resize)
    ipcMain.handle("calendar:update-times", (event, { id, start, end }) => {
        return db.prepare("UPDATE calendar SET fecha_inicio = ?, fecha_fin = ? WHERE id = ?")
                 .run(start, end, id);
    });

    // --- TIPOS DE CITA ---
    ipcMain.handle("calendar:get-types", () => {
        return db.prepare("SELECT * FROM tipos_cita WHERE estatus = 1").all();
    });

    ipcMain.handle("calendar:save-type", (event, { nombre, color }) => {
        return db.prepare("INSERT INTO tipos_cita (nombre, color) VALUES (?, ?)").run(nombre, color);
    });
}

module.exports = { setupCalendarHandlers };