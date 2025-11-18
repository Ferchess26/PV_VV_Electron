const { contextBridge, ipcRenderer } = require("electron");

// Comunicación genérica
contextBridge.exposeInMainWorld("electronAPI", {
  send: (channel, data) => ipcRenderer.send(channel, data),
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  on: (channel, callback) => ipcRenderer.on(channel, callback),
});

// Controles de ventana
contextBridge.exposeInMainWorld("windowControls", {
  minimize: () => ipcRenderer.send("minimize-window"),
  maximize: () => ipcRenderer.send("maximize-window"),
  close: () => ipcRenderer.send("close-window"),
});

// API para BD
contextBridge.exposeInMainWorld("db", {
  query: (sql, params) => ipcRenderer.invoke("db-query", { sql, params }),
  run: (sql, params) => ipcRenderer.invoke("db-run", { sql, params }),
  exec: (sql) => ipcRenderer.invoke("db-exec", sql),
});
