const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const { app } = require("electron");

function initializeDatabase() {
    const dbFolder = path.join(app.getPath("userData"), "database");

    if (!fs.existsSync(dbFolder)) {
        fs.mkdirSync(dbFolder, { recursive: true });
    }

    const dbPath = path.join(dbFolder, "pv.db");
    const db = new Database(dbPath);
    db.exec('PRAGMA foreign_keys = ON;'); 

    // =========================================================
    // CREACIÓN DE TABLAS
    // =========================================================

    // 1. Tabla ROLES
    db.exec(`
      CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE NOT NULL, 
        descripcion TEXT
      );
    `);

    // 2. Tabla PERMISOS
    db.exec(`
      CREATE TABLE IF NOT EXISTS permisos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE NOT NULL, 
        modulo TEXT 
      );
    `);

    // 3. Tabla ROL_PERMISO (Relación N:M Rol a Permiso)
    db.exec(`
      CREATE TABLE IF NOT EXISTS rol_permiso (
        id_rol INTEGER NOT NULL,
        id_permiso INTEGER NOT NULL,
        PRIMARY KEY (id_rol, id_permiso),
        FOREIGN KEY (id_rol) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (id_permiso) REFERENCES permisos(id) ON DELETE CASCADE
      );
    `);
    
    // --- 4. NUEVA TABLA: USER_PERMISO (Permisos individuales o de anulación) ---
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_permiso (
        id_usuario INTEGER NOT NULL,
        id_permiso INTEGER NOT NULL,
        tipo_acceso TEXT NOT NULL CHECK(tipo_acceso IN ('GRANT', 'DENY')), -- 'GRANT' (otorgar) o 'DENY' (denegar)
        PRIMARY KEY (id_usuario, id_permiso),
        FOREIGN KEY (id_usuario) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (id_permiso) REFERENCES permisos(id) ON DELETE CASCADE
      );
    `);

    // 5. Tabla USERS
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nombre TEXT NOT NULL,
        apellido_paterno TEXT NOT NULL,
        apellido_materno TEXT,
        foto BLOB,
        id_rol INTEGER NOT NULL, 
        estatus INTEGER DEFAULT 1,
        fecha_creacion TEXT DEFAULT (datetime('now')),
        ultimo_login TEXT,
        telefono TEXT,
        email TEXT,
        FOREIGN KEY (id_rol) REFERENCES roles(id) ON DELETE RESTRICT
      );
    `);


    // =========================================================
    // INSERCIÓN DE DATOS INICIALES (SEEDING)
    // =========================================================
    
    const insertRole = db.prepare("INSERT OR IGNORE INTO roles (nombre, descripcion) VALUES (?, ?)");
    const insertPermiso = db.prepare("INSERT OR IGNORE INTO permisos (nombre, modulo) VALUES (?, ?)");
    const rolPermisoInsert = db.prepare("INSERT OR IGNORE INTO rol_permiso (id_rol, id_permiso) VALUES (?, ?)");
    const insertUser = db.prepare("INSERT INTO users (username, password, nombre, apellido_paterno, apellido_materno, id_rol) VALUES (?, ?, ?, ?, ?, ?)");
    
    
    // --- 6. Insertar ROLES ---
    let adminRoleId = null;
    try {
      insertRole.run('admin', 'Administrador del sistema con acceso total.');
      insertRole.run('vendedor', 'Personal de ventas con permisos limitados.');
      insertRole.run('cajero', 'Personal de caja para transacciones finales.');
      adminRoleId = db.prepare("SELECT id FROM roles WHERE nombre = 'admin'").get().id;
    } catch (e) {
      adminRoleId = db.prepare("SELECT id FROM roles WHERE nombre = 'admin'").get()?.id;
    }
    
    
    // --- 7. Insertar PERMISOS ---
    const permisosToInsert = [
        { nombre: 'EDITAR_PERFIL', modulo: 'USUARIOS' },
        { nombre: 'VER_DASHBOARD', modulo: 'DASHBOARD' },
        { nombre: 'CREAR_VENTA', modulo: 'VENTAS' },
        { nombre: 'CERRAR_CAJA', modulo: 'FINANZAS' },
        { nombre: 'GESTIONAR_USUARIOS', modulo: 'ADMIN' },
        { nombre: 'GESTIONAR_PRODUCTOS', modulo: 'ADMIN' },
    ];
    
    permisosToInsert.forEach(p => insertPermiso.run(p.nombre, p.modulo));
    
    
    // --- 8. Asignación ROL -> PERMISOS (Asigna todos al admin) ---
    if (adminRoleId) {
        const allPermisos = db.prepare("SELECT id FROM permisos").all();
        allPermisos.forEach(permiso => {
            rolPermisoInsert.run(adminRoleId, permiso.id);
        });
        console.log("Permisos asignados al rol 'admin'.");
    }
    
    
    // --- 9. Insertar Admin solo si no existe nadie ---
    const count = db.prepare("SELECT COUNT(*) AS total FROM users").get().total;

    if (count === 0 && adminRoleId) {
      insertUser.run("admin", "1234", "Administrador", "Sistema", "", adminRoleId);
      console.log("Usuario administrador creado: admin / 1234 con Rol ID: " + adminRoleId);
    }
    

    db.close();
}

module.exports = initializeDatabase;