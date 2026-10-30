const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dock', {
  click: (mode) => ipcRenderer.send('dock:click', mode),
  onRender: (fn) => ipcRenderer.on('dock:render', (_e, st) => fn(st)),
});
