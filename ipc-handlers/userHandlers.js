// ipc-handlers/userHandlers.js
const { ipcMain } = require('electron');

function setupUserHandlers(db) {

    ipcMain.handle("login", (event, { user, pass }) => {

        const result = db.prepare(
            "SELECT * FROM users WHERE username = ? AND password = ?"
        ).get(user, pass);
        
        return !!result;
    });


    ipcMain.handle("db-query", (event, { sql, params }) => {
        const stmt = db.prepare(sql);
        return stmt.all(params || []);
    });

    ipcMain.handle("db-run", (event, { sql, params }) => {
        const stmt = db.prepare(sql);
        return stmt.run(params || []);
    });

    ipcMain.handle("db-exec", (event, sql) => {
        return db.exec(sql);
    });

}

module.exports = { setupUserHandlers };