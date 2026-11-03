// Atualização do app (TASK-035): consulta a última versão publicada no GitHub Releases, baixa em segundo plano
// e avisa a interface quando está pronta. Só roda no app instalado; em desenvolvimento fica desligado
// (use TERMIX_FAKE_UPDATE=1 para ver o aviso sem uma versão real).
const { app, ipcMain, Notification } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { startUpdateHelper, readHelperTimeline, installerRunning, runDetachedScript } = require('./update-helper');

const FIRST_CHECK_MS = 15 * 1000;
const EVERY_MS = 4 * 60 * 60 * 1000;

// TASK-050: retorno durante a atualização. Ao clicar em Atualizar: a interface mostra um cartão "Atualizando…" e o main avisa por
// notificação do Windows (que continua na tela enquanto o instalador roda sem janela); grava update-pending.json com a hora do clique;
// ao abrir na versão nova, a interface mostra "Termix atualizado para a X" com o tempo que levou.
// TASK-056: com o app fechado, um auxiliar separado (update-helper.ps1) mostra "Atualizando…" até o Termix abrir de novo.
const INSTALL_DELAY_MS = 2500; // dá tempo de a interface mostrar o cartão antes de o app fechar
const pendingFile = () => path.join(app.getPath('userData'), 'update-pending.json');

// TASK-069: atualização sem tirar a pessoa do app. Baixada a versão nova, o instalador é extraído (com o 7za, sem executá-lo) para uma pasta de
// preparo enquanto o Termix continua em uso (estado "preparing"); pronto ("ready", modo "swap"), a pessoa reinicia quando quiser e, quando o app
// fecha, um script (apply-update.ps1) copia a versão nova por cima da instalada em poucos segundos. Se a preparação falhar, cai no caminho antigo
// (modo "installer": o instalador roda ao reiniciar / ao fechar).
// TASK-079: a pasta de preparo fica DENTRO da pasta instalada (mesmo disco): a troca vira renomeação, instantânea, e os arquivos mantêm a identidade
// que o Windows já liberou (a primeira execução de um .exe recém-gravado leva ~8 s para ser liberada). Sem permissão de escrita ali, usa o LOCALAPPDATA
// (e a troca volta a ser por cópia).
let stageRootCache = null;
function STAGE_ROOT() {
  if (stageRootCache) return stageRootCache;
  const prefer = path.join(path.dirname(process.execPath), '.update');
  try { fs.mkdirSync(prefer, { recursive: true }); const w = path.join(prefer, '.w'); fs.writeFileSync(w, '1'); fs.unlinkSync(w); return (stageRootCache = prefer); } catch { /* pasta instalada sem escrita */ }
  return (stageRootCache = path.join(process.env.LOCALAPPDATA || app.getPath('userData'), 'termix-updater', 'staged'));
}
// "aquece" o Termix.exe preparado: roda uma vez com --version (sai na hora, sem janela) para o Windows liberar a primeira execução em segundo plano
function prime(dir) {
  return new Promise((resolve) => {
    try {
      const p = spawn(path.join(dir, 'Termix.exe'), ['--version'], { windowsHide: true, stdio: 'ignore' });
      const t = setTimeout(() => { try { p.kill(); } catch { /* ignora */ } resolve(false); }, 90000);
      p.on('error', () => { clearTimeout(t); resolve(false); });
      p.on('close', () => { clearTimeout(t); resolve(true); });
    } catch { resolve(false); }
  });
}
const SEVENZ = () => path.join(process.resourcesPath, '7za.exe');
let staged = null; // { version, dir } quando a versão nova está pronta na pasta de preparo
let applyLaunched = false;

function stagedValid(version, dir) {
  try {
    return fs.existsSync(path.join(dir, 'Termix.exe')) && JSON.parse(fs.readFileSync(path.join(dir, 'resources', 'app', 'package.json'), 'utf8')).version === version;
  } catch { return false; }
}
// TASK-081: o Smart App Control do Windows bloqueia um Termix.exe novo (sem assinatura, reputação desconhecida): aconteceu na 0.3.1. Por isso o Termix.exe
// instalado só é trocado quando o motor Electron muda; com o mesmo motor ele fica como está (o código do app está em resources/app). Compara arquivos
// centrais do motor (pequenos) entre a pasta instalada e a preparada.
const ENGINE_FILES = ['v8_context_snapshot.bin', 'snapshot_blob.bin', 'icudtl.dat', 'ffmpeg.dll', 'chrome_100_percent.pak'];
function sameEngine(dir) {
  try {
    const inst = path.dirname(process.execPath);
    for (const f of ENGINE_FILES) if (!fs.readFileSync(path.join(inst, f)).equals(fs.readFileSync(path.join(dir, f)))) return false;
    return true;
  } catch { return false; }
}
// extrai o instalador (que é um arquivo 7z com o app dentro) para dir; onPercent recebe 0..100
function extractInstaller(file, dir, onPercent) {
  return new Promise((resolve) => {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      fs.mkdirSync(dir, { recursive: true });
      const p = spawn(SEVENZ(), ['x', '-y', '-bsp1', '-bso0', '-bse0', '-o' + dir, file], { windowsHide: true });
      let buf = '';
      p.stdout.on('data', (d) => {
        buf = (buf + d.toString()).slice(-200);
        const all = buf.match(/\d{1,3}(?=%)/g);
        if (all) onPercent(Math.min(100, +all[all.length - 1]));
      });
      p.on('error', () => resolve(false));
      p.on('close', (code) => resolve(code === 0 || code === 1)); // 1 = avisos (o cabeçalho do instalador não é 7z puro)
    } catch { resolve(false); }
  });
}
// copia a versão preparada por cima da instalada depois que este app fechar (restart: abre o Termix de novo)
function applyStaged(restart) {
  if (!staged || applyLaunched || !app.isPackaged) return false;
  applyLaunched = runDetachedScript(path.join(__dirname, 'apply-update.ps1'), 'termix-apply-update.ps1', {
    ParentPid: process.pid, Src: staged.dir, Dst: path.dirname(process.execPath), Restart: restart ? 1 : 0, KeepExe: sameEngine(staged.dir) ? 1 : 0, Log: path.join(os.tmpdir(), 'termix-apply-update.log'),
  });
  return applyLaunched;
}
// chamado quando o app fecha por qualquer caminho: se há versão preparada, ela entra no lugar (sem reabrir)
function applyStagedOnQuit() { applyStaged(false); }

function setupUpdater(getWin, hooks = {}) {
  let just = null; // { from, to, ms } quando este início é o primeiro depois de uma atualização
  try {
    const p = JSON.parse(fs.readFileSync(pendingFile(), 'utf8'));
    fs.unlinkSync(pendingFile());
    if (p && p.to === app.getVersion()) just = { from: p.from, to: p.to, ms: Date.now() - p.t0 };
  } catch { /* sem atualização pendente */ }
  // O registro do auxiliar (quanto o app ficou fechado e as etapas) só é gravado quando ele enxerga a janela do Termix já na tela, DEPOIS de este app
  // abrir: por isso espera por ele até 4 s em vez de ler uma vez só no início (antes o aviso nunca trazia esse tempo).
  ipcMain.handle('update:just', async () => {
    const j = just; just = null;
    if (j) {
      for (let i = 0; i < 10; i++) {
        const t = readHelperTimeline();
        if (t) { Object.assign(j, t); break; }
        await new Promise((r) => setTimeout(r, 400));
      }
    }
    return j;
  });
  const beginInstall = (version, write, helper = true) => {
    if (write && helper) startUpdateHelper({ version }); // com a troca em segundos (modo swap) a janelinha não é lançada: só atrapalharia // TASK-056: janelinha separada que cobre o tempo em que o app está fechado
    try { if (write) fs.writeFileSync(pendingFile(), JSON.stringify({ from: app.getVersion(), to: version, t0: Date.now() })); } catch { /* o aviso de "atualizado" é só um extra */ }
    try { if (helper && Notification.isSupported()) new Notification({ title: 'O Termix está atualizando', body: `Para a versão ${version}. Ele reabre sozinho em instantes; não precisa fazer nada.` }).show(); } catch { /* sem notificação */ }
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
    setTimeout(() => push({ state: 'downloading', version: '9.9.9', percent: 85 }), 5000);
    setTimeout(() => push({ state: 'preparing', version: '9.9.9', percent: 30 }), 6500);
    setTimeout(() => push({ state: 'preparing', version: '9.9.9', percent: 75 }), 8000);
    setTimeout(() => push({ state: 'ready', version: '9.9.9', percent: 100, mode: 'swap' }), 9500);
    return;
  }

  const { autoUpdater } = require('electron-updater');
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false; // a troca é feita por applyStagedOnQuit; só volta a ligar se a preparação falhar (modo installer)
  autoUpdater.allowPrerelease = false;
  autoUpdater.on('update-available', (i) => push({ state: 'downloading', version: i.version, percent: 0 }));
  autoUpdater.on('download-progress', (p) => push({ state: 'downloading', percent: Math.round(p.percent || 0) }));
  let lastPct = -1;
  const prepare = async (version, file) => {
    const dir = path.join(STAGE_ROOT(), version);
    const marker = path.join(STAGE_ROOT(), version + '.primed');
    try { for (const d of fs.readdirSync(STAGE_ROOT())) if (d !== version && d !== version + '.primed' && d !== 'staged.json') fs.rmSync(path.join(STAGE_ROOT(), d), { recursive: true, force: true }); } catch { /* pasta ainda não existe */ }
    if (stagedValid(version, dir)) {
      if (!fs.existsSync(marker) && !sameEngine(dir)) { push({ state: 'preparing', version, percent: 90 }); await prime(dir); try { fs.writeFileSync(marker, '1'); } catch { /* sem marca: aquece de novo na próxima vez */ } }
      staged = { version, dir }; push({ state: 'ready', version, percent: 100, mode: 'swap' }); return;
    }
    push({ state: 'preparing', version, percent: 0 });
    let ok = false;
    try { ok = !!file && fs.existsSync(file) && fs.existsSync(SEVENZ()) && await extractInstaller(file, dir, (pc) => { const sc = Math.round(pc * 0.85); if (sc !== lastPct) { lastPct = sc; push({ state: 'preparing', percent: sc }); } }); } catch { ok = false; }
    if (ok && stagedValid(version, dir)) {
      if (!sameEngine(dir)) { push({ state: 'preparing', percent: 90 }); await prime(dir); }
      try { fs.writeFileSync(marker, '1'); } catch { /* sem marca: aquece de novo na próxima vez */ }
      staged = { version, dir }; push({ state: 'ready', version, percent: 100, mode: 'swap' }); return;
    }
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignora */ }
    autoUpdater.autoInstallOnAppQuit = true; // caminho antigo: o instalador roda quando a pessoa reinicia ou fecha o app
    push({ state: 'ready', version, percent: 100, mode: 'installer' });
  };
  autoUpdater.on('update-downloaded', (i) => { prepare(i.version, i.downloadedFile); });
  autoUpdater.on('update-not-available', () => { if (state.state !== 'ready' && state.state !== 'preparing') push({ state: 'idle' }); });
  // sem rede ou servidor fora do ar: não incomoda; tenta de novo no próximo ciclo
  autoUpdater.on('error', () => { if (state.state !== 'ready' && state.state !== 'preparing') push({ state: 'idle' }); });

  const check = () => { if (state.state === 'ready' || state.state === 'preparing') return state; autoUpdater.checkForUpdates().catch(() => {}); return state; };
  ipcMain.handle('update:check', () => check());
  // silencioso (sem o assistente do instalador) e reabre o app já na versão nova
  ipcMain.handle('update:install', () => {
    if (state.state !== 'ready') return false;
    const swap = !!staged && state.mode === 'swap';
    beginInstall(state.version, true, !swap);
    if (swap) { setTimeout(() => { applyStaged(true); if (hooks.quit) hooks.quit(); else app.quit(); }, 350); return true; }
    setTimeout(() => autoUpdater.quitAndInstall(true, true), INSTALL_DELAY_MS);
    return true;
  });
  setTimeout(check, FIRST_CHECK_MS);
  setInterval(check, EVERY_MS);
}

// TASK-066: se o app for aberto enquanto o instalador da atualização ainda está rodando, a instalação é interrompida e fica a versão antiga
// (foi o que aconteceu: o usuário reabriu o app 2 min depois do clique). Só consulta o instalador quando há uma atualização pendente.
// Devolve true quando o app deve fechar sem abrir a janela.
function holdForRunningInstaller(dialog) {
  try {
    if (!app.isPackaged || !fs.existsSync(pendingFile()) || !installerRunning()) return false;
    const r = dialog.showMessageBoxSync({
      type: 'info', title: 'Termix', buttons: ['Aguardar (fechar agora)', 'Abrir mesmo assim'], defaultId: 0, cancelId: 0, noLink: true,
      message: 'O Termix está se atualizando',
      detail: 'A instalação da nova versão ainda está terminando. Aguarde alguns minutos: o Termix abre sozinho quando ela acabar. Se você abrir agora, a instalação é interrompida e o Termix continua na versão antiga.',
    });
    return r === 0;
  } catch { return false; }
}

module.exports = { setupUpdater, holdForRunningInstaller, applyStagedOnQuit };
