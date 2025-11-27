const { getDatabase } = require('./connection'); // Asumimos que tienes esta función

/**
 * Obtiene la lista consolidada de permisos activos para un ID de usuario dado.
 *
 * @param {number} userId - El ID del usuario.
 * @returns {Array<{nombre: string, modulo: string}>} Lista de permisos activos.
 */
function getConsolidatedPermissions(userId) {
    const db = getDatabase();
    const sql = `
        -- Paso A: Identificar todos los permisos GRANTED (Por Rol O Explicitamente)
        WITH Granted AS (
            -- Permisos otorgados por el Rol del usuario
            SELECT
                p.id,
                p.nombre,
                p.modulo
            FROM
                users u
            JOIN
                rol_permiso rp ON u.id_rol = rp.id_rol
            JOIN
                permisos p ON rp.id_permiso = p.id
            WHERE u.id = ?

            UNION

            -- Permisos otorgados Explicitamente al Usuario (GRANT)
            SELECT
                p.id,
                p.nombre,
                p.modulo
            FROM
                user_permiso up
            JOIN
                permisos p ON up.id_permiso = p.id
            WHERE up.id_usuario = ? AND up.tipo_acceso = 'GRANT'
        ),

        -- Paso B: Identificar todos los permisos DENIED (Anulación Explícita)
        Denied AS (
            SELECT
                id
            FROM
                user_permiso up
            JOIN
                permisos p ON up.id_permiso = p.id
            WHERE up.id_usuario = ? AND up.tipo_acceso = 'DENY'
        )

        -- Paso C: Resultado Final: Permisos GRANTED que no están en DENIED
        SELECT
            g.nombre,
            g.modulo
        FROM
            Granted g
        LEFT JOIN
            Denied d ON g.id = d.id
        WHERE d.id IS NULL; -- Excluye los IDs que se encontraron en la tabla de Denegados
    `;

    try {
        const stmt = db.prepare(sql);
        const permissions = stmt.all(userId, userId, userId);
        
        return permissions;

    } catch (error) {
        console.error("Error al obtener permisos consolidados:", error.message);
        return []; 
    }
}

module.exports = {
    getConsolidatedPermissions
};