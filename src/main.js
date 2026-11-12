const { app, BrowserWindow, ipcMain, dialog, shell, Notification, clipboard, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
// TASK-072: erro não capturado (ex.: escrever num terminal que acabou de fechar) não derruba o app nem abre a caixa de erro do Electron; vai para o log
const logError = (e) => { try { fs.appendFileSync(path.join(app.getPath('userData'), 'erros.log'), `${new Date().toISOString()} ${(e && e.stack) || e}\n`); } catch { /* sem log */ } };
process.on('uncaughtException', logError);
process.on('unhandledRejection', logError);
const { execFile } = require('child_process');
const { pathToFileURL } = require('url');
const { setupWeb } = require('./web');

// Modo "executar script": o Claude Code chama os encaminhadores (hooks e status line) como comando externo.
// Sem Node.js instalado, o próprio Termix os executa: `Termix.exe --termix-run <script>`. Não abre janela nem pega a trava de instância única.
const RUN_IDX = process.argv.indexOf('--termix-run');
const RUN_MODE = RUN_IDX > 0 && !!process.argv[RUN_IDX + 1];
if (RUN_MODE) {
  const script = process.argv[RUN_IDX + 1];
  process.argv.splice(RUN_IDX, 2, script); // o script vê o mesmo argv de quando roda no Node
  require(script); // lê o stdin e escreve tudo de forma síncrona
  setTimeout(() => app.exit(0), 150); // dá tempo de a saída ser entregue antes de encerrar
}
const pty = RUN_MODE ? null : require('@lydell/node-pty');

const STATE_FILE = () => path.join(app.getPath('userData'), 'state.json');
const STATE_BACKUP = () => path.join(app.getPath('userData'), 'state.bak.json');
const DOCS_ROOT = () => path.join(app.getPath('documents'), 'Termix');
/* TASK-090: pasta dos projetos criados pelo app. Escolha do usuário; sem ela, o disco fixo com mais espaço livre (X:\Termix), para não encher o C:. */
function biggestDriveRoot() {
  return new Promise((resolve) => {
    const cmd = "Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | ForEach-Object { $_.DeviceID + '|' + $_.FreeSpace }";
    require('child_process').execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', cmd], { windowsHide: true, timeout: 8000 }, (err, out) => {
      if (err) return resolve(null);
      let best = null;
      for (const line of String(out).split(/\r?\n/)) {
        const [dev, free] = line.trim().split('|');
        const f = Number(free);
        if (/^[A-Z]:$/i.test(dev || '') && f > 0 && (!best || f > best.free)) best = { dev: dev.toUpperCase(), free: f };
      }
      resolve(best && best.free > 2 * 1024 ** 3 ? path.join(best.dev + '\\', 'Termix') : null);
    });
  });
}
async function resolveRoot(custom) {
  if (typeof custom === 'string' && custom.trim()) {
    try { fs.mkdirSync(custom, { recursive: true }); return { root: custom, auto: false }; } catch { /* pasta escolhida indisponível: cai no automático */ }
  }
  return { root: (await biggestDriveRoot()) || DOCS_ROOT(), auto: true };
}
// o app se chamava Vitra: na primeira abertura copia os dados salvos para a pasta nova (a antiga fica intacta)
try {
  const legacy = path.join(app.getPath('appData'), 'Vitra'), cur = app.getPath('userData');
  if (!fs.existsSync(path.join(cur, 'state.json')) && fs.existsSync(path.join(legacy, 'state.json'))) fs.cpSync(legacy, cur, { recursive: true });
} catch { /* sem migração: o app abre limpo */ }

let win = null;
const web = RUN_MODE ? null : setupWeb({ ipcMain, getWin: () => win }); // navegador embutido e alternador Terminais / Web (TASK-022)
let quitting = false;
let summary = { active: 0, working: 0 };
const procs = new Map(); // tabId -> pty

/* ---------- utilidades ---------- */
// Onde o Claude Code costuma ficar. O PATH vem primeiro; as pastas conhecidas cobrem o PATH antigo
// (app aberto pelo menu Iniciar logo depois de instalar o Claude Code, sem reiniciar a sessão do Windows).
function claudeDirs() {
  const home = os.homedir();
  const dirs = (process.env.PATH || '').split(path.delimiter);
  dirs.push(path.join(home, '.local', 'bin'), path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'npm'),
    path.join(process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'Programs', 'claude'));
  return dirs;
}
let claudeCache = null;
function findClaude() {
  if (claudeCache && fs.existsSync(claudeCache)) return claudeCache;
  for (const dir of claudeDirs()) {
    for (const f of ['claude.exe', 'claude.cmd']) {
      const full = path.join(dir, f);
      if (dir && fs.existsSync(full)) return (claudeCache = full);
    }
  }
  return null;
}

// variáveis ligadas a OUTRA sessão do Claude Code (herdadas quando o app é aberto de dentro de uma)
const SESSION_BOUND_ENV = [
  'CLAUDECODE', 'CLAUDE_PID', 'CLAUDE_CODE_BRIDGE_SESSION_ID', 'CLAUDE_CODE_CHILD_SESSION', 'CLAUDE_CODE_ENTRYPOINT',
  'CLAUDE_CODE_MESSAGING_SOCKET', 'CLAUDE_CODE_MESSAGING_TOKEN', 'CLAUDE_CODE_SESSION_ATTENDED', 'CLAUDE_CODE_SESSION_ID',
];
function cleanEnv() {
  const env = { ...process.env };
  for (const k of SESSION_BOUND_ENV) delete env[k];
  return env;
}

const pathCache = new Map();
function findInPath(names) {
  const key = names.join('|'), hit = pathCache.get(key);
  if (hit && fs.existsSync(hit)) return hit;
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    for (const f of names) {
      const full = path.join(dir, f);
      if (dir && fs.existsSync(full)) { pathCache.set(key, full); return full; }
    }
  }
  return null;
}

const METRICS_DIR = () => path.join(app.getPath('userData'), 'metrics');
const BIN_DIR = () => path.join(__dirname, 'bin');
// resumo de retomada do Clear (TASK-117): o app grava aqui e o Claude Code o lê na conversa nova (hook no terminal, arquivo no chat)
const HANDOFF_FILE = (tabId) => path.join(METRICS_DIR(), `handoff-${String(tabId).replace(/[^\w-]/g, '')}.txt`);
const OPEN_HINT = 'Se o comando termix-open existir, voce esta dentro do app Termix: para abrir paginas locais, como um index.html ou um servidor em localhost, use termix-open seguido do caminho do arquivo ou do endereco local, por exemplo termix-open index.html ou termix-open http://localhost:3000, em vez de start, open ou do navegador padrao. Se o comando nao existir, abra do jeito normal.';
// ambiente do terminal do Termix: comando termix-open no PATH e BROWSER apontando para ele, só nesta sessão (terminais fora do app não mudam)
function sessionEnv(tabId) {
  const env = { ...cleanEnv(), TERM: 'xterm-256color', COLORTERM: 'truecolor', TERMIX_METRICS_DIR: METRICS_DIR(), TERMIX_TAB_ID: tabId, TERMIX_EXE: process.execPath };
  const pathKey = Object.keys(env).find((k) => k.toLowerCase() === 'path') || 'Path';
  env[pathKey] = `${BIN_DIR()}${path.delimiter}${env[pathKey] || ''}`;
  env.BROWSER = path.join(BIN_DIR(), 'termix-open.cmd');
  return env;
}
const HOOK = () => path.join(__dirname, 'hook-wrapper.js').replace(/\\/g, '/');
const WRAPPER = () => path.join(__dirname, 'statusline-wrapper.js').replace(/\\/g, '/');

function slug(name) {
  const s = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').slice(0, 60).replace(/^-+|-+$/g, '');
  return s || 'projeto';
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

/* ---------- janela ---------- */
// Modo da janela, definido na abertura: 'none' = transparente (degradê do app); 'acrylic' = vidro fosco do Windows por trás do degradê (modo "Ofuscado").
// Trocar entre "transparente" e "material" exige reabrir, porque o tipo da janela muda.
let winMode = 'none';
let wantRelaunch = false;
function createWindow() {
  const st = readJson(STATE_FILE());
  const bg = st && st.settings && st.settings.bg;
  winMode = bg === 'blur' || bg === 'acrylic' || bg === 'mica' ? 'acrylic' : 'none'; // valores antigos (acrylic/mica) viram Ofuscado
  const mat = winMode !== 'none';
  // TASK-093: o tamanho inicial e o mínimo nunca passam da área útil da tela (antes, numa tela de ~1200×650 a janela de 1280×760 saía pela borda)
  const wa = screen.getPrimaryDisplay().workArea;
  const fitW = Math.max(640, wa.width - 16), fitH = Math.max(480, wa.height - 16);
  win = new BrowserWindow({
    width: Math.min(1280, fitW),
    height: Math.min(760, fitH),
    minWidth: Math.min(980, fitW),
    minHeight: Math.min(620, fitH),
    transparent: !mat, // sem material: janela realmente transparente, sem "placa" atrás do vidro
    ...(mat ? { backgroundMaterial: winMode } : {}), // com material: o Windows desenha o fundo desfocado atrás do vidro
    frame: false,
    hasShadow: mat, // em transparente a sombra é desenhada pelo app; com material usa a do sistema
    backgroundColor: '#00000000',
    show: false, // só mostra quando a primeira tela estiver pronta (evita piscar e engasgar na abertura)
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    title: 'Termix',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setMenuBarVisibility(false);
  win.once('ready-to-show', () => win.show());
  win.webContents.on('render-process-gone', (_e, d) => { logError('render-process-gone: ' + (d && d.reason)); if (!quitting && win && !win.isDestroyed() && d && d.reason !== 'clean-exit') win.reload(); });
  // marca de "o Termix abriu" para o auxiliar da atualização saber que já pode fechar a janelinha (TASK-072)
  win.webContents.once('did-finish-load', () => { try { fs.writeFileSync(path.join(os.tmpdir(), 'termix-started.json'), String(Date.now())); } catch { /* sem a marca, o auxiliar usa a detecção da janela */ } });
  const sendMax = () => { if (!win.isDestroyed()) win.webContents.send('win:state', { maximized: win.isMaximized() }); };
  win.on('focus', () => { win.flashFrame(false); win.webContents.send('win:focus'); });
  win.on('maximize', sendMax);
  win.on('unmaximize', sendMax);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  web.attach();
  win.on('closed', () => web.destroy());

  win.on('close', (e) => {
    // DEV2-026: ciclo do Vibe/Mutirão rodando: avisa quais projetos e pergunta se quer fechar e interromper mesmo assim
    let ciclos = [];
    if (!quitting) { try { ciclos = (vibe && vibe.avisoFechar && vibe.avisoFechar()) || []; } catch (err) { logError(err); } }
    if (ciclos.length) {
      e.preventDefault();
      dialog.showMessageBox(win, {
        type: 'warning', buttons: ['Fechar e interromper', 'Cancelar'], defaultId: 1, cancelId: 1, title: 'Termix',
        message: `Há ${ciclos.length} projeto(s) com ciclo do Vibe Coding ou Mutirão rodando.`,
        detail: `${ciclos.map((c) => `• ${c.nome}${c.auto ? ' (Mutirão)' : ''}`).join('\n')}\n\nFechar o Termix interrompe esses ciclos. Ao abrir de novo, o pop-up do projeto traz "Continuar ciclo" como botão principal.`,
      }).then((r) => { if (r.response === 0) { quitting = true; killAll(); win.close(); } else wantRelaunch = false; });
      return;
    }
    if (quitting || summary.active === 0) { killAll(); return; }
    e.preventDefault();
    const w = summary.working ? ` (${summary.working} trabalhando agora)` : '';
    dialog.showMessageBox(win, {
      type: 'question',
      buttons: ['Encerrar tudo e sair', 'Cancelar'],
      defaultId: 1,
      cancelId: 1,
      title: 'Termix',
      message: `Há ${summary.active} sessão(ões) ativa(s)${w}.`,
      detail: 'Os processos serão encerrados. As conversas ficam guardadas e podem ser restauradas ao reabrir.',
    }).then((r) => {
      if (r.response === 0) { quitting = true; killAll(); win.close(); } else wantRelaunch = false;
    });
  });
}

function killAll() {
  for (const p of procs.values()) { try { p.kill(); } catch { /* já encerrado */ } }
  procs.clear();
  try { chat.stopAll(); } catch { /* ainda não iniciado */ }
}

/* ---------- IPC: estado ---------- */
// se o state.json estiver ilegível (disco cheio, queda de energia), recupera do backup
ipcMain.handle('state:load', () => readJson(STATE_FILE()) || readJson(STATE_BACKUP()));
ipcMain.handle('state:save', (_e, state) => {
  const file = STATE_FILE();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // backup: guarda a versão anterior, no máximo uma vez por hora (só se ela estiver legível)
  try {
    const bak = STATE_BACKUP();
    if ((!fs.existsSync(bak) || Date.now() - fs.statSync(bak).mtimeMs > 3600e3) && readJson(file)) fs.copyFileSync(file, bak);
  } catch { /* o backup nunca atrapalha o salvamento */ }
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state));
  try { fs.renameSync(tmp, file); } catch { // antivírus/indexador segurando o arquivo (EPERM/EBUSY): copia por cima
    fs.copyFileSync(tmp, file); try { fs.unlinkSync(tmp); } catch { /* ignora */ }
  }
  return true;
});
ipcMain.on('sessions:summary', (_e, s) => { summary = s; });

// botões da janela desenhados no cabeçalho
ipcMain.on('win:ctl', (_e, kind) => {
  if (!win || win.isDestroyed()) return;
  if (kind === 'min') win.minimize();
  else if (kind === 'max') { if (win.isMaximized()) win.unmaximize(); else win.maximize(); }
  else if (kind === 'close') win.close();
});
// projeto no fluxo Rocruzta: .claude/fluxo.json (comandos de validação) e CLAUDE.local.md (papel e branch desta máquina)
ipcMain.handle('flow:info', (_e, dir) => {
  try {
    if (typeof dir !== 'string' || !dir) return { on: false };
    const cfg = JSON.parse(fs.readFileSync(path.join(dir, '.claude', 'fluxo.json'), 'utf8'));
    let role = '', branch = '';
    try {
      const loc = fs.readFileSync(path.join(dir, 'CLAUDE.local.md'), 'utf8');
      role = (/^\s*papel:\s*"?([A-Za-z0-9]+)/m.exec(loc) || [])[1] || '';
      branch = (/^\s*branch_padrao:\s*"?([\w/.-]*)/m.exec(loc) || [])[1] || '';
    } catch { /* sem papel definido */ }
    return { on: true, role: role.toUpperCase(), branch, validacao: Array.isArray(cfg.validacao) ? cfg.validacao.filter((x) => typeof x === 'string') : [] };
  } catch { return { on: false }; }
});
// resumo de retomada (TASK-117): monta e deixa gravado para a conversa nova ler; `drop` apaga se o Clear não aconteceu
ipcMain.handle('handoff:prepare', (_e, a) => {
  try {
    if (!a || typeof a.tabId !== 'string' || typeof a.cwd !== 'string' || !/^[0-9a-f-]{36}$/i.test(String(a.sessionId))) return { ok: false };
    let info = null;
    try {
      const loc = fs.readFileSync(path.join(a.cwd, 'CLAUDE.local.md'), 'utf8');
      info = { role: ((/^\s*papel:\s*"?([A-Za-z0-9]+)/m.exec(loc) || [])[1] || '').toUpperCase(), branch: (/^\s*branch_padrao:\s*"?([\w/.-]*)/m.exec(loc) || [])[1] || '' };
    } catch { /* sem papel definido */ }
    const h = require('./handoff').buildHandoff({ cwd: a.cwd, sessionId: a.sessionId, info, template: typeof a.template === 'string' ? a.template : null });
    const file = HANDOFF_FILE(a.tabId);
    if (!h) { try { fs.unlinkSync(file); } catch { /* nada a apagar */ } return { ok: true, text: '', chars: 0 }; }
    fs.mkdirSync(METRICS_DIR(), { recursive: true });
    fs.writeFileSync(file, h.text, 'utf8');
    return { ok: true, text: h.text, chars: h.chars, task: h.task, files: h.files };
  } catch (err) { return { ok: false, error: String((err && err.message) || err) }; }
});
ipcMain.handle('handoff:template', () => require('./handoff').DEFAULT_TEMPLATE);
ipcMain.on('handoff:drop', (_e, a) => { if (a && typeof a.tabId === 'string') { try { fs.unlinkSync(HANDOFF_FILE(a.tabId)); } catch { /* já consumido */ } } });
ipcMain.handle('clip:read', () => clipboard.readText());
ipcMain.on('clip:write', (_e, t) => clipboard.writeText(String(t)));
// aviso do Windows quando o app está em segundo plano; clicar nele traz a janela e abre a aba
ipcMain.on('notify:show', (_e, { tabId, title, body }) => {
  if (!win || win.isDestroyed() || win.isFocused()) return;
  win.flashFrame(true);
  if (!Notification.isSupported()) return;
  const n = new Notification({ title: String(title).slice(0, 80), body: String(body).slice(0, 200), icon: path.join(__dirname, '..', 'assets', 'icon.png') });
  n.on('click', () => {
    if (win.isDestroyed()) return;
    if (win.isMinimized()) win.restore();
    win.show(); win.focus();
    win.webContents.send('notify:click', { tabId });
  });
  n.show();
});
ipcMain.handle('win:isMax', () => !!(win && !win.isDestroyed() && win.isMaximized()));

// fundo da janela: 'none' (degradê) ou 'acrylic' (Ofuscado); trocar de um para o outro exige reabrir
ipcMain.handle('win:material', (_e, kind) => {
  if (!win || win.isDestroyed()) return { ok: false };
  const want = kind === 'none' ? 'none' : 'acrylic';
  return { ok: true, restart: want !== winMode };
});

/* ---------- IPC: terminais ---------- */
ipcMain.handle('pty:spawn', (e, { tabId, cwd, args, cols, rows }) => {
  const claude = findClaude();
  if (!claude) return { ok: false, error: 'Claude Code não foi encontrado neste computador. Instale-o (claude.com/claude-code), abra o Termix de novo e use "Tentar de novo".' };
  if (!fs.existsSync(cwd)) return { ok: false, error: `A pasta do projeto não existe: ${cwd}` };
  if (procs.has(tabId)) { try { procs.get(tabId).kill(); } catch { /* ignora */ } procs.delete(tabId); }
  try {
    const isCmd = claude.toLowerCase().endsWith('.cmd');
    const file = isCmd ? 'cmd.exe' : claude;
    // captura dos limites: a status line da sessão passa por um encaminhador que grava os dados
    // e repassa tudo para a status line original do usuário (o visual não muda)
    const extra = [];
    // com Node.js no PATH usa o node (mais leve); sem ele, o próprio Termix executa os encaminhadores
    const runner = findInPath(['node.exe', 'node.cmd']) ? 'node' : `"${process.execPath.replace(/\\/g, '/')}" --termix-run`;
    const cmd = `${runner} "${WRAPPER()}"`;
    // hooks: o Claude Code avisa quando começa a trabalhar, termina ou pede atenção (somam-se aos hooks do usuário)
    const hook = { hooks: [{ type: 'command', command: `${runner} "${HOOK()}"` }] };
    const hooks = {};
    for (const ev of ['SessionStart', 'UserPromptSubmit', 'PostToolUse', 'Notification', 'Stop']) hooks[ev] = [hook];
    const sets = { statusLine: { type: 'command', command: cmd }, hooks };
    let vibeSets = null; try { vibeSets = vibe && vibe.spawnSettings({ tabId, cwd, args, settings: sets, runner }); } catch (err) { logError(err); } // abas do Vibe: os mesmos settings + a trava (src/vibe)
    extra.push('--settings', vibeSets || JSON.stringify(sets));
    // só nesta sessão: pede ao Claude Code que abra páginas locais pela aba Web (texto simples: passa por cmd.exe sem aspas nem símbolos)
    extra.push('--append-system-prompt', OPEN_HINT);
    const finalArgs = [...args, ...extra];
    const fullArgs = isCmd ? ['/c', claude, ...finalArgs] : finalArgs;
    fs.mkdirSync(METRICS_DIR(), { recursive: true });
    const p = pty.spawn(file, fullArgs, {
      name: 'xterm-256color',
      cols: cols || 120,
      rows: rows || 30,
      cwd,
      env: sessionEnv(tabId),
    });
    procs.set(tabId, p);
    // junta a saída do terminal em lotes (~8 ms) para não inundar o IPC com milhares de mensagens pequenas
    let buf = '', timer = null;
    const flush = () => {
      timer = null;
      if (buf && !quitting && win && !win.isDestroyed()) win.webContents.send('pty:data', { tabId, data: buf });
      buf = '';
    };
    p.onData((data) => {
      buf += data;
      if (buf.length > 65536) { clearTimeout(timer); flush(); } else if (!timer) timer = setTimeout(flush, 8);
    });
    p.onExit(({ exitCode, signal }) => {
      if (timer) { clearTimeout(timer); flush(); }
      if (procs.get(tabId) === p) procs.delete(tabId);
      if (!quitting && win && !win.isDestroyed()) win.webContents.send('pty:exit', { tabId, code: exitCode, signal });
    });
    return { ok: true, pid: p.pid };
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  }
});
ipcMain.on('pty:write', (_e, { tabId, data }) => { const p = procs.get(tabId); if (p) { try { p.write(data); } catch { /* terminal acabou de encerrar */ } } });
ipcMain.on('pty:resize', (_e, { tabId, cols, rows }) => {
  const p = procs.get(tabId);
  if (p && cols > 0 && rows > 0) { try { p.resize(cols, rows); } catch { /* ignora */ } }
});
ipcMain.on('pty:kill', (_e, { tabId }) => { const p = procs.get(tabId); if (p) { try { p.kill(); } catch { /* ignora */ } } });

/* ---------- IPC: modo Chat (claude -p em stream-json, sem terminal) ---------- */
const chat = require('./chat')({
  findClaude, sessionEnv, hint: OPEN_HINT, handoffFile: HANDOFF_FILE,
  emit: (channel, msg) => { if (!quitting && win && !win.isDestroyed()) win.webContents.send(channel, msg); },
});
const UUID_RE = /^[0-9a-f-]{36}$/i;
ipcMain.handle('chat:start', (_e, a) => {
  if (!a || typeof a.tabId !== 'string' || !UUID_RE.test(String(a.sessionId)) || typeof a.cwd !== 'string') return { ok: false, error: 'Pedido inválido.' };
  return chat.start({ tabId: a.tabId, cwd: a.cwd, sessionId: a.sessionId, resume: !!a.resume, perm: a.perm === 'd' ? 'd' : 'n', handoff: !!a.handoff });
});
ipcMain.handle('chat:send', (_e, a) => (a && typeof a.tabId === 'string' && typeof a.text === 'string' ? chat.send(a) : { ok: false }));
ipcMain.handle('chat:permit', (_e, a) => (a && typeof a.tabId === 'string' && typeof a.requestId === 'string' ? chat.permit(a) : { ok: false }));
ipcMain.on('chat:stop',(_e, a) => { if (a && typeof a.tabId === 'string') chat.stop(a.tabId); });
ipcMain.handle('chat:history', (_e, a) => (a && typeof a.cwd === 'string' ? chat.history(a) : { items: [], model: '', usage: null }));

/* ---------- IPC: projetos ---------- */
ipcMain.handle('project:create', async (_e, name, custom) => {
  const { root } = await resolveRoot(custom);
  fs.mkdirSync(root, { recursive: true });
  let dir = path.join(root, slug(name));
  for (let i = 2; fs.existsSync(dir); i++) dir = path.join(root, `${slug(name)}-${i}`);
  fs.mkdirSync(dir, { recursive: true });
  return { path: dir };
});
ipcMain.handle('project:pick', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'Importar pasta de projeto', properties: ['openDirectory'] });
  return r.canceled ? null : r.filePaths[0];
});
/* Conversas do Claude Code de uma pasta: ~/.claude/projects/<caminho com tudo que não é letra/dígito virando "-">/<id>.jsonl */
function readSlice(fd, size, start, len) {
  const n = Math.max(0, Math.min(len, size - start));
  const buf = Buffer.alloc(n);
  fs.readSync(fd, buf, 0, n, start);
  return buf.toString('utf8');
}
function firstText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) { const t = content.find((c) => c && c.type === 'text'); return t ? t.text : ''; }
  return '';
}
ipcMain.handle('sessions:scan', (_e, projectPath) => {
  try {
    const dir = path.join(os.homedir(), '.claude', 'projects', String(projectPath).replace(/[^a-zA-Z0-9]/g, '-'));
    if (!fs.existsSync(dir)) return [];
    const out = [];
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.jsonl')) continue;
      const id = f.slice(0, -6);
      if (!/^[0-9a-f-]{36}$/i.test(id)) continue;
      const full = path.join(dir, f);
      try {
        const st = fs.statSync(full);
        const fd = fs.openSync(full, 'r');
        let head, tail;
        try { head = readSlice(fd, st.size, 0, 262144); tail = st.size > 262144 ? readSlice(fd, st.size, st.size - 131072, 131072) : ''; } finally { fs.closeSync(fd); }
        let title = '', custom = '', first = '', last = '', users = 0;
        const scan = (txt, isHead) => {
          for (const line of txt.split('\n')) {
            if (!line.startsWith('{')) continue;
            let o; try { o = JSON.parse(line); } catch { continue; }
            if (o.type === 'custom-title' && o.customTitle) custom = o.customTitle;
            else if (o.type === 'ai-title' && o.aiTitle) title = o.aiTitle;
            else if (o.type === 'last-prompt' && o.lastPrompt) last = String(o.lastPrompt);
            else if (o.type === 'user' && !o.isMeta && o.message) {
              const t = firstText(o.message.content).trim();
              if (!t || t.startsWith('<')) continue;
              users++;
              if (isHead && !first) first = t;
            }
          }
        };
        scan(head, true); if (tail) scan(tail, false);
        if (!users && !title && !custom) continue; // conversa vazia
        out.push({ id, title: custom || title || first.slice(0, 80) || '(sem título)', first: first.slice(0, 160), last: last.slice(0, 160), mtime: st.mtimeMs, size: st.size });
      } catch { /* arquivo ilegível: ignora */ }
    }
    return out.sort((a, b) => b.mtime - a.mtime);
  } catch { return []; }
});
// a conversa só existe para o --resume se o Claude Code chegou a gravar o histórico dela (isto é, se algo foi enviado)
ipcMain.handle('session:exists', (_e, { cwd, id }) => {
  try {
    const dir = path.join(os.homedir(), '.claude', 'projects', String(cwd).replace(/[^a-zA-Z0-9]/g, '-'));
    return /^[0-9a-f-]{36}$/i.test(id) && fs.existsSync(path.join(dir, id + '.jsonl'));
  } catch { return false; }
});
ipcMain.handle('project:open', (_e, p) => shell.openPath(p));
ipcMain.handle('project:trash', async (_e, p) => {
  try { await shell.trashItem(p); return { ok: true }; } catch (err) { return { ok: false, error: String(err.message || err) }; }
});
ipcMain.handle('project:exists', (_e, p) => fs.existsSync(p));
ipcMain.handle('file:saveText', async (_e, { name, text }) => {
  const r = await dialog.showSaveDialog(win, { title: 'Exportar texto do terminal', defaultPath: name, filters: [{ name: 'Texto', extensions: ['txt'] }] });
  if (r.canceled || !r.filePath) return null;
  fs.writeFileSync(r.filePath, text, 'utf8');
  return r.filePath;
});
ipcMain.handle('app:info', async (_e, custom) => { const r = await resolveRoot(custom); return { root: r.root, rootAuto: r.auto, winMode }; });
ipcMain.handle('project:pickRoot', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'Pasta dos projetos criados pelo Termix', properties: ['openDirectory', 'createDirectory'] });
  return r.canceled ? null : r.filePaths[0];
});

/* ---------- IPC: ambiente e recursos ---------- */
ipcMain.handle('env:check', () => new Promise((resolve) => {
  const claude = findClaude();
  if (!claude) return resolve({ installed: false });
  const isCmd = claude.toLowerCase().endsWith('.cmd');
  const run = isCmd ? ['cmd.exe', ['/c', claude, '--version']] : [claude, ['--version']];
  execFile(run[0], run[1], { timeout: 8000 }, (err, stdout) => {
    resolve({ installed: true, path: claude, version: err ? null : String(stdout).trim() });
  });
}));

const resources = require('./resources')({ findClaude, readJson, cleanEnv, pty, trash: (p) => shell.trashItem(p), reveal: (p) => shell.showItemInFolder(p) });
ipcMain.handle('scan:resources', (_e, projectPath) => resources.scanFiles(projectPath));
ipcMain.handle('scan:plugins', (_e, projectPath) => resources.scanPlugins(projectPath));
ipcMain.handle('scan:mcpstatus', (_e, projectPath) => resources.scanMcpStatus(projectPath));
ipcMain.handle('res:do', (_e, a) => resources.run(a && a.op, a && a.args));

/* ---------- métricas vindas da status line ---------- */
const seen = new Map(); // arquivo -> mtime
function pollMetrics() {
  if (!win || win.isDestroyed()) return;
  let files = [];
  try { files = fs.readdirSync(METRICS_DIR()).filter((f) => f.startsWith('tab-') && f.endsWith('.json')); } catch { return; }
  for (const f of files) {
    const full = path.join(METRICS_DIR(), f);
    let st; try { st = fs.statSync(full); } catch { continue; }
    if (seen.get(f) === st.mtimeMs) continue;
    const data = readJson(full);
    if (!data) continue; // gravado pela metade: tenta de novo no próximo ciclo
    seen.set(f, st.mtimeMs);
    win.webContents.send('metrics:update', { tabId: f.slice(4, -5), data });
  }
}

// eventos dos hooks: leitura rápida (300 ms) para o estado da aba reagir quase na hora
const hookSeen = new Map();
function pollHooks() {
  if (!win || win.isDestroyed()) return;
  let files = [];
  try { files = fs.readdirSync(METRICS_DIR()).filter((f) => f.startsWith('hook-') && f.endsWith('.json')); } catch { return; }
  for (const f of files) {
    const full = path.join(METRICS_DIR(), f);
    let st; try { st = fs.statSync(full); } catch { continue; }
    if (hookSeen.get(f) === st.mtimeMs) continue;
    const data = readJson(full);
    if (!data) continue;
    hookSeen.set(f, st.mtimeMs);
    if (Date.now() - data.t < 60000) win.webContents.send('hook:event', { tabId: f.slice(5, -5), data });
  }
}

// pedidos do termix-open (abrir página local na aba Web): o comando grava um arquivo, o app lê, entrega à interface e apaga
function pollOpens() {
  if (!win || win.isDestroyed()) return;
  let files = [];
  try { files = fs.readdirSync(METRICS_DIR()).filter((f) => f.startsWith('open-') && f.endsWith('.json')); } catch { return; }
  for (const f of files) {
    const full = path.join(METRICS_DIR(), f);
    const data = readJson(full);
    if (!data) { try { if (Date.now() - fs.statSync(full).mtimeMs > 60000) fs.unlinkSync(full); } catch { /* já removido */ } continue; } // gravado pela metade: espera o próximo ciclo
    try { fs.unlinkSync(full); } catch { /* já removido */ }
    if (!data.tabId || !data.target || Date.now() - data.t > 60000) continue;
    const url = /^https?:\/\//i.test(data.target) ? data.target : pathToFileURL(data.target).href;
    win.webContents.send('web:open', { tabId: data.tabId, url });
  }
}

// limpeza ao abrir: métricas e hooks de abas que não existem mais (mais de 7 dias sem mudar)
function cleanOldMetrics() {
  try {
    const dir = METRICS_DIR(), lim = Date.now() - 7 * 864e5;
    for (const f of fs.readdirSync(dir)) {
      if (!/^(tab|hook|open)-.*\.json$/.test(f) && !/^handoff-.*\.txt$/.test(f)) continue;
      const full = path.join(dir, f);
      try { if (fs.statSync(full).mtimeMs < lim) fs.unlinkSync(full); } catch { /* ignora */ }
    }
  } catch { /* pasta ainda não existe */ }
}

// instantâneo das métricas já gravadas: a interface pede ao iniciar, para não perder o que chegou antes de estar pronta
ipcMain.handle('metrics:all', () => {
  let files = [];
  try { files = fs.readdirSync(METRICS_DIR()).filter((f) => f.startsWith('tab-') && f.endsWith('.json')); } catch { return []; }
  return files.map((f) => ({ tabId: f.slice(4, -5), data: readJson(path.join(METRICS_DIR(), f)) })).filter((x) => x.data);
});

// tela Consumo: tokens e custo equivalente lidos das conversas do Claude Code (leitura incremental, ver consumo.js)
const consumo = RUN_MODE ? null : require('./consumo').create({ userData: app.getPath('userData') });
ipcMain.handle('consumo:get', () => (consumo ? consumo.snapshot() : { updated: Date.now(), sessions: [] }));
// módulo Vibe Coding e Mutirão (DEV2-001/002, experimental): isolado em src/vibe, registra os próprios canais 'vibe:*' com try/catch; um erro nele nunca derruba o app
let vibe = null; try { vibe = require('./vibe').create({ ipcMain, dialog, app, getWin: () => win, logError }); } catch (e) { logError(e); }

if (!RUN_MODE) require('./code').setup(ipcMain); // tela Código (TASK-102)
if (!RUN_MODE) require('./clone').setup(ipcMain, { resolveRoot, slug }); // clonar repositório público do GitHub (TASK-133)

// branch git da pasta de um projeto (para o rail); vazio se não for repositório ou sem git
ipcMain.handle('git:branch', (_e, cwd) => new Promise((resolve) => {
  if (!cwd || !fs.existsSync(cwd)) return resolve('');
  execFile('git', ['-C', cwd, 'branch', '--show-current'], { timeout: 3000, windowsHide: true }, (err, out) => resolve(err ? '' : String(out).trim()));
}));

/* Atalhos com o ícone novo. O Termix.exe é um "casco" fixo (TASK-081) e carrega o ícone antigo; o Windows usa o ícone do atalho (menu Iniciar / área de trabalho / barra de tarefas) para o botão do app.
   Roda ANTES de criar a janela (o botão da barra de tarefas é criado com o ícone do atalho; consertar depois só valia na abertura seguinte). Ao abrir, aponta o ícone desses atalhos para assets/icon.ico (o do app instalado), sem mexer no exe e sem trocar o resto do atalho. */
function repairShortcutIcons() {
  if (process.platform !== 'win32' || !app.isPackaged) return;
  try {
    const icon = path.join(__dirname, '..', 'assets', 'icon.ico');
    if (!fs.existsSync(icon)) return;
    const ad = app.getPath('appData');
    let changed = false;
    const links = [
      path.join(app.getPath('desktop'), 'Termix.lnk'),
      path.join(ad, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Termix.lnk'),
      path.join(ad, 'Microsoft', 'Internet Explorer', 'Quick Launch', 'User Pinned', 'TaskBar', 'Termix.lnk'),
    ];
    for (const lnk of links) {
      if (!fs.existsSync(lnk)) continue;
      const cur = shell.readShortcutLink(lnk);
      if (String(cur.target || '').toLowerCase() !== process.execPath.toLowerCase()) continue; // só atalhos deste Termix
      if (String(cur.icon || '').toLowerCase() === icon.toLowerCase()) continue;
      shell.writeShortcutLink(lnk, 'update', { icon, iconIndex: 0 }); changed = true;
    }
    // o Windows guarda o ícone do botão da barra de tarefas: pede para renovar o cache de ícones (inofensivo)
    if (changed) execFile('ie4uinit.exe', ['-show'], { windowsHide: true }, () => {});
  } catch { /* o ícone do atalho nunca atrapalha a abertura */ }
}

/* ---------- ciclo de vida ---------- */
if (!RUN_MODE) {
  if (app.isPackaged) app.setAppUserModelId('com.termix.app');
  else {
    // em desenvolvimento (npm start) o processo é o electron.exe: o Windows mostraria o nome e o átomo do Electron na barra de tarefas e nos avisos.
    // Um atalho no menu Iniciar com este ID dá ao Windows o nome e o ícone do Termix (o instalado já traz o seu atalho).
    const devId = 'com.termix.app.dev';
    app.setAppUserModelId(devId);
    try {
      const lnk = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Termix (dev).lnk');
      shell.writeShortcutLink(lnk, fs.existsSync(lnk) ? 'replace' : 'create', {
        target: process.execPath, args: `"${app.getAppPath()}"`, cwd: app.getAppPath(),
        icon: path.join(__dirname, '..', 'assets', 'icon.ico'), iconIndex: 0, appUserModelId: devId, description: 'Termix (desenvolvimento)',
      });
    } catch {}
  }
  // uma instância só: abrir de novo (atalho, menu Iniciar) traz a janela que já existe, em vez de duas escrevendo no mesmo estado
  if (!app.requestSingleInstanceLock()) app.quit();
  else {
    app.on('second-instance', () => { if (win && !win.isDestroyed()) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });
    app.whenReady().then(() => { if (require('./updater').holdForRunningInstaller(dialog)) { app.exit(0); return; } repairShortcutIcons(); createWindow(); setTimeout(cleanOldMetrics, 5000); require('./updater').setupUpdater(() => win, { quit: () => { quitting = true; killAll(); app.quit(); } }); setInterval(pollMetrics, 1500); setInterval(pollHooks, 300); setInterval(pollOpens, 300); });
  }
  app.on('quit', () => { if (!wantRelaunch) require('./updater').applyStagedOnQuit(); }); // TASK-069: versão nova já preparada entra no lugar ao fechar
  app.on('window-all-closed', () => { killAll(); if (wantRelaunch) app.relaunch(); app.quit(); });
}
ipcMain.handle('app:version', () => app.getVersion());
ipcMain.on('app:relaunch', () => { wantRelaunch = true; if (win && !win.isDestroyed()) win.close(); });
