const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('termix', {
  loadState: () => ipcRenderer.invoke('state:load'),
  saveState: (s) => ipcRenderer.invoke('state:save', s),
  summary: (s) => ipcRenderer.send('sessions:summary', s),
  setMaterial: (kind) => ipcRenderer.invoke('win:material', kind),
  winCtl: (kind) => ipcRenderer.send('win:ctl', kind),
  notify: (n) => ipcRenderer.send('notify:show', n),
  onNotifyClick: (fn) => ipcRenderer.on('notify:click', (_e, m) => fn(m)),
  onFocus: (fn) => ipcRenderer.on('win:focus', () => fn()),
  isMaximized: () => ipcRenderer.invoke('win:isMax'),
  onWinState: (fn) => ipcRenderer.on('win:state', (_e, m) => fn(m)),

  spawn: (opts) => ipcRenderer.invoke('pty:spawn', opts),
  write: (tabId, data) => ipcRenderer.send('pty:write', { tabId, data }),
  resize: (tabId, cols, rows) => ipcRenderer.send('pty:resize', { tabId, cols, rows }),
  kill: (tabId) => ipcRenderer.send('pty:kill', { tabId }),
  onData: (fn) => ipcRenderer.on('pty:data', (_e, m) => fn(m)),
  onExit: (fn) => ipcRenderer.on('pty:exit', (_e, m) => fn(m)),
  onHook: (fn) => ipcRenderer.on('hook:event', (_e, m) => fn(m)),
  onMetrics: (fn) => ipcRenderer.on('metrics:update', (_e, m) => fn(m)),
  allMetrics: () => ipcRenderer.invoke('metrics:all'),
  gitBranch: (cwd) => ipcRenderer.invoke('git:branch', cwd),

  createProject: (name) => ipcRenderer.invoke('project:create', name),
  pickFolder: () => ipcRenderer.invoke('project:pick'),
  scanSessions: (p) => ipcRenderer.invoke('sessions:scan', p),
  sessionExists: (cwd, id) => ipcRenderer.invoke('session:exists', { cwd, id }),
  openFolder: (p) => ipcRenderer.invoke('project:open', p),
  trashFolder: (p) => ipcRenderer.invoke('project:trash', p),
  folderExists: (p) => ipcRenderer.invoke('project:exists', p),
  appInfo: () => ipcRenderer.invoke('app:info'),
  relaunch: () => ipcRenderer.send('app:relaunch'),
  saveText: (name, text) => ipcRenderer.invoke('file:saveText', { name, text }),

  checkEnv: () => ipcRenderer.invoke('env:check'),
  scan: (projectPath) => ipcRenderer.invoke('scan:resources', projectPath),
});
