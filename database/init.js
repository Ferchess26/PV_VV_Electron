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

  // Crear tabla users si no existe
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nombre TEXT NOT NULL,
      apellido_paterno TEXT NOT NULL,
      apellido_materno TEXT,
      foto BLOB,
      rol TEXT NOT NULL DEFAULT 'empleado',
      estatus INTEGER DEFAULT 1,
      fecha_creacion TEXT DEFAULT (datetime('now')),
      ultimo_login TEXT,
      telefono TEXT,
      email TEXT
    );
  `);

  // Insertar admin solo si no existe nadie
  const count = db.prepare("SELECT COUNT(*) AS total FROM users").get().total;

  if (count === 0) {
    const insert = db.prepare(`
      INSERT INTO users (username, password, nombre, apellido_paterno, apellido_materno, rol)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insert.run("admin", "1234", "Administrador", "Sistema", "", "admin");

    console.log("Usuario administrador creado: admin / 1234");
  }

  db.close();
}

module.exports = initializeDatabase;
