const path = require("path");
const Database = require("better-sqlite3");
const { app } = require("electron");

function getDatabase() {
  const dbPath = path.join(app.getPath("userData"), "database", "pv.db");
  return new Database(dbPath);
}

module.exports = getDatabase;
