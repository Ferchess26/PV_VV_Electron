const getDatabase = require('./connection'); // o { getDatabase } si así lo exportas

/**
 * Obtiene la lista consolidada de permisos activos para un ID de usuario dado.
 *
 * @param {number} userId - El ID del usuario.
 * @returns {Array<{id: number, nombre: string, modulo: string}>} Lista de permisos activos.
 */
function getConsolidatedPermissions(userId) {
    const db = getDatabase();
    const sql = `
        WITH Granted AS (
            -- Permisos otorgados por el Rol del usuario
            SELECT p.id, p.nombre, p.modulo
            FROM users u
            JOIN rol_permiso rp ON u.id_rol = rp.id_rol
            JOIN permisos p ON rp.id_permiso = p.id
            WHERE u.id = ?

            UNION

            -- Permisos otorgados explícitamente (GRANT)
            SELECT p.id, p.nombre, p.modulo
            FROM user_permiso up
            JOIN permisos p ON up.id_permiso = p.id
            WHERE up.id_usuario = ? AND up.tipo_acceso = 'GRANT'
        ),

        -- Permisos denegados explícitamente
        Denied AS (
            SELECT p.id
            FROM user_permiso up
            JOIN permisos p ON up.id_permiso = p.id
            WHERE up.id_usuario = ? AND up.tipo_acceso = 'DENY'
        )

        -- Resultado final
        SELECT 
            g.id,
            g.nombre, 
            g.modulo
        FROM Granted g
        LEFT JOIN Denied d ON g.id = d.id
        WHERE d.id IS NULL;
    `;

    try {
        const stmt = db.prepare(sql);
        return stmt.all(userId, userId, userId);
    } catch (error) {
        console.error("Error al obtener permisos consolidados:", error.message);
        return [];
    }
}

module.exports = {
    getConsolidatedPermissions
};