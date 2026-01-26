const path = require("path");
const Database = require("better-sqlite3");
const { app } = require("electron");

let db = null;

function getDatabase() {
    if (db) return db;

    const dbPath = path.join(app.getPath("userData"), "database", "pv.db");
  
    db = new Database(dbPath);
    
    db.exec("PRAGMA foreign_keys = ON;");
    
    return db;
}

module.exports = getDatabase;