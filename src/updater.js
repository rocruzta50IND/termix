// Atualização do app (TASK-035): consulta a última versão publicada no GitHub Releases, baixa em segundo plano
// e avisa a interface quando está pronta. Só roda no app instalado; em desenvolvimento fica desligado
// (use TERMIX_FAKE_UPDATE=1 para ver o aviso sem uma versão real).
const { app, ipcMain, Notification } = require('electron');
const fs = require('fs');
const path = require('path');
const { startUpdateHelper, readHelperTimeline } = require('./update-helper');

const FIRST_CHECK_MS = 15 * 1000;
const EVERY_MS = 4 * 60 * 60 * 1000;

// TASK-050: retorno durante a atualização. Ao clicar em Atualizar: a interface mostra um cartão "Atualizando…" e o main avisa por
// notificação do Windows (que continua na tela enquanto o instalador roda sem janela); grava update-pending.json com a hora do clique;
// ao abrir na versão nova, a interface mostra "Termix atualizado para a X" com o tempo que levou.
// TASK-056: com o app fechado, um auxiliar separado (update-helper.ps1) mostra "Atualizando…" até o Termix abrir de novo.
const INSTALL_DELAY_MS = 2500; // dá tempo de a interface mostrar o cartão antes de o app fechar
const pendingFile = () => path.join(app.getPath('userData'), 'update-pending.json');

function setupUpdater(getWin) {
  let just = null; // { from, to, ms } quando este início é o primeiro depois de uma atualização
  try {
    const p = JSON.parse(fs.readFileSync(pendingFile(), 'utf8'));
    fs.unlinkSync(pendingFile());
    if (p && p.to === app.getVersion()) just = { from: p.from, to: p.to, ms: Date.now() - p.t0, ...(readHelperTimeline() || {}) }; // closedMs: quanto o app ficou fechado
  } catch { /* sem atualização pendente */ }
  ipcMain.handle('update:just', () => { const j = just; just = null; return j; });
  const beginInstall = (version, write) => {
    if (write) startUpdateHelper({ version }); // TASK-056: janelinha separada que cobre o tempo em que o app está fechado
    try { if (write) fs.writeFileSync(pendingFile(), JSON.stringify({ from: app.getVersion(), to: version, t0: Date.now() })); } catch { /* o aviso de "atualizado" é só um extra */ }
    try { if (Notification.isSupported()) new Notification({ title: 'O Termix está atualizando', body: `Para a versão ${version}. Ele reabre sozinho em instantes; não precisa fazer nada.` }).show(); } catch { /* sem notificação */ }
  };
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
    ipcMain.handle('update:install', () => { beginInstall(state.version || '9.9.9', false); push({ state: 'idle' }); return true; });
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
  ipcMain.handle('update:install', () => { if (state.state !== 'ready') return false; beginInstall(state.version, true); setTimeout(() => autoUpdater.quitAndInstall(true, true), INSTALL_DELAY_MS); return true; });
  setTimeout(check, FIRST_CHECK_MS);
  setInterval(check, EVERY_MS);
}

module.exports = { setupUpdater };
