const { contextBridge, ipcRenderer } = require("electron");

// Comunicación genérica
contextBridge.exposeInMainWorld("electronAPI", {
  // Para eventos que NO esperan respuesta (ej. "login-success")
  send: (channel, data) => ipcRenderer.send(channel, data), 
  // Para funciones que SÍ esperan una respuesta (ej. "login", "db-query")
  invoke: (channel, data) => ipcRenderer.invoke(channel, data), 
  // Para escuchar eventos del proceso principal
  on: (channel, callback) => ipcRenderer.on(channel, (event, ...args) => callback(...args)),
});

// Controles de ventana
contextBridge.exposeInMainWorld("windowControls", {
  minimize: () => ipcRenderer.send("minimize-window"),
  maximize: () => ipcRenderer.send("maximize-window"),
  close: () => ipcRenderer.send("close-window"),
});
