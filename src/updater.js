// Atualização do app (TASK-035): consulta a última versão publicada no GitHub Releases, baixa em segundo plano
// e avisa a interface quando está pronta. Só roda no app instalado; em desenvolvimento fica desligado
// (use TERMIX_FAKE_UPDATE=1 para ver o aviso sem uma versão real).
const { app, ipcMain } = require('electron');

const FIRST_CHECK_MS = 15 * 1000;
const EVERY_MS = 4 * 60 * 60 * 1000;

function setupUpdater(getWin) {
  let state = { state: 'idle' }; // idle | downloading | ready | error
  const push = (patch) => {
    state = { ...state, ...patch };
    const w = getWin();
    if (w && !w.isDestroyed()) w.webContents.send('update:state', state);
  };
  ipcMain.handle('update:get', () => state);

  const fake = !app.isPackaged && process.env.TERMIX_FAKE_UPDATE === '1';
  if (!app.isPackaged && !fake) {
    ipcMain.handle('update:install', () => false);
    ipcMain.handle('update:check', () => state);
    return;
  }

  if (fake) {
    ipcMain.handle('update:install', () => { push({ state: 'idle' }); return true; });
    ipcMain.handle('update:check', () => state);
    setTimeout(() => push({ state: 'downloading', version: '9.9.9', percent: 40 }), 3000);
    setTimeout(() => push({ state: 'ready', version: '9.9.9', percent: 100 }), 6000);
    return;
  }

  const { autoUpdater } = require('electron-updater');
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true; // ignorou o aviso: instala sozinho quando a pessoa fechar o app
  autoUpdater.allowPrerelease = false;
  autoUpdater.on('update-available', (i) => push({ state: 'downloading', version: i.version, percent: 0 }));
  autoUpdater.on('download-progress', (p) => push({ state: 'downloading', percent: Math.round(p.percent || 0) }));
  autoUpdater.on('update-downloaded', (i) => push({ state: 'ready', version: i.version, percent: 100 }));
  autoUpdater.on('update-not-available', () => { if (state.state !== 'ready') push({ state: 'idle' }); });
  // sem rede ou servidor fora do ar: não incomoda; tenta de novo no próximo ciclo
  autoUpdater.on('error', () => { if (state.state !== 'ready') push({ state: 'idle' }); });

  const check = () => { if (state.state === 'ready') return state; autoUpdater.checkForUpdates().catch(() => {}); return state; };
  ipcMain.handle('update:check', () => check());
  // silencioso (sem o assistente do instalador) e reabre o app já na versão nova
  ipcMain.handle('update:install', () => { if (state.state !== 'ready') return false; setImmediate(() => autoUpdater.quitAndInstall(true, true)); return true; });
  setTimeout(check, FIRST_CHECK_MS);
  setInterval(check, EVERY_MS);
}

module.exports = { setupUpdater };
