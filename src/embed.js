// TASK-134: modo embutível (--embed[=porta]) para o Rocruzta Hub.
// Sem a flag este arquivo não faz nada: o Termix abre a janela de sempre.
// Com a flag, o Termix não abre janela: serve a MESMA interface (src/renderer) em 127.0.0.1 e liga o `window.termix`
// ao processo principal por WebSocket. Os handlers do main.js continuam os mesmos; aqui só se troca o transporte.
//
// Segurança: só 127.0.0.1, token obrigatório (cookie `hubt`, entregue pelo link `/?t=<token>`), `Host` e `Origin` conferidos,
// e só os diretórios da interface são servidos (nada de ler arquivo arbitrário).
const { app, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');

const ARG = process.argv.find((a) => a === '--embed' || a.startsWith('--embed='));
const enabled = !!ARG;

const handlers = new Map(); // canal -> função do main.js (a mesma que o IPC chamaria)
const clients = new Set();
let server = null;
let token = '';
let port = 0;

if (enabled) {
  // o main.js registra tudo com ipcMain.handle/on: aqui guardamos também a função para o servidor chamar
  const origHandle = ipcMain.handle.bind(ipcMain);
  const origOn = ipcMain.on.bind(ipcMain);
  ipcMain.handle = (channel, fn) => { handlers.set(channel, fn); return origHandle(channel, fn); };
  ipcMain.on = (channel, fn) => { if (!handlers.has(channel)) handlers.set(channel, fn); return origOn(channel, fn); };
  if (process.env.HUB_PARENT_PID) {
    const opcoesDe = (a, b) => (b && typeof b === 'object' ? b : (a && typeof a === 'object' && !a.webContents ? a : {})); // (janela, opções) ou (opções)
    dialog.showOpenDialog = (a, b) => dialogoPeloHub('abrir', opcoesDe(a, b));
    dialog.showSaveDialog = (a, b) => dialogoPeloHub('salvar', opcoesDe(a, b));
  }
}

// TASK-139: no modo embutido o Termix não tem janela, e um diálogo de arquivo aberto por ele nasce SEM DONO (janela solta na
// barra de tarefas). Quando quem abriu o Termix foi o Hub (HUB_PARENT_PID), o diálogo é pedido ao Hub por uma linha HUB_EVENT
// { evento: 'dialogo' }; o Hub o abre preso à janela dele e responde pelo comando autenticado 'dialogo:resultado'.
// Os pontos que chamam dialog.showOpenDialog / showSaveDialog no main.js e no módulo Vibe continuam iguais.
const dialogosPendentes = new Map(); // id -> { metodo, resolve }
let seqDialogo = 0;
const dialogoVazio = (metodo) => (metodo === 'salvar' ? { canceled: true, filePath: undefined } : { canceled: true, filePaths: [] });
function dialogoPeloHub(metodo, opcoes) {
  return new Promise((resolve) => {
    const id = ++seqDialogo;
    const t = setTimeout(() => { dialogosPendentes.delete(id); resolve(dialogoVazio(metodo)); }, 10 * 60 * 1000);
    dialogosPendentes.set(id, { metodo, resolve: (r) => { clearTimeout(t); resolve(r); } });
    emitirHub({ evento: 'dialogo', id, metodo, opcoes });
  });
}
function resolverDialogo(m) {
  const p = dialogosPendentes.get(m.id);
  if (!p) return;
  dialogosPendentes.delete(m.id);
  if (m.canceled) return p.resolve(dialogoVazio(p.metodo));
  if (p.metodo === 'salvar') return p.resolve({ canceled: false, filePath: typeof m.filePath === 'string' ? m.filePath : undefined });
  p.resolve({ canceled: false, filePaths: Array.isArray(m.filePaths) ? m.filePaths.filter((x) => typeof x === 'string') : [] });
}

const broadcast = (channel, payload) => {
  if (!clients.size) return;
  const msg = JSON.stringify({ t: 'event', ch: channel, p: payload === undefined ? null : payload });
  for (const c of clients) if (c.readyState === 1) c.send(msg);
};

// "janela" de mentira: o main.js só precisa dela para mandar eventos à interface e para as chamadas de janela, que aqui não fazem nada
function makeFakeWin() {
  const noop = () => {};
  const w = {
    isDestroyed: () => false, isMinimized: () => false, isMaximized: () => false, isVisible: () => true, isFocused: () => false,
    show: noop, hide: noop, focus: noop, restore: noop, minimize: noop, maximize: noop, unmaximize: noop, close: noop, flashFrame: noop,
    setMenuBarVisibility: noop, setBackgroundMaterial: noop, on: noop, once: noop, getContentSize: () => [1280, 760],
    webContents: { send: broadcast, on: noop, once: noop, isDestroyed: () => false },
  };
  return w;
}

const ROOT = () => app.getAppPath();
const ALLOWED = ['/src/renderer/', '/node_modules/@xterm/', '/assets/'];
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.json': 'application/json', '.map': 'application/json' };

function hostOk(req) { const h = req.headers.host || ''; return h === `127.0.0.1:${port}` || h === `localhost:${port}`; }
function cookieToken(req) { const m = /(?:^|;\s*)hubt=([0-9a-f]+)/.exec(req.headers.cookie || ''); return m ? m[1] : ''; }
const tokenOk = (t) => { const a = Buffer.from(String(t || '')), b = Buffer.from(token); return a.length === b.length && crypto.timingSafeEqual(a, b); };

// o mesmo preload.js do Electron é a única lista de métodos: roda no navegador com um `ipcRenderer` que fala pelo WebSocket
function shimSource() {
  const preload = fs.readFileSync(path.join(__dirname, 'preload.js'), 'utf8');
  return `(function () {
  var ws, seq = 0, pending = new Map(), listeners = new Map(), queue = [];
  function connect() {
    ws = new WebSocket('ws://' + location.host + '/__ws');
    ws.onopen = function () { var q = queue; queue = []; q.forEach(function (m) { ws.send(m); }); };
    ws.onmessage = function (ev) {
      var m = JSON.parse(ev.data);
      if (m.t === 'event') { (listeners.get(m.ch) || []).forEach(function (fn) { fn({}, m.p); }); }
      else if (m.t === 'result') { var p = pending.get(m.id); if (!p) return; pending.delete(m.id); if (m.ok) p.res(m.r); else p.rej(new Error(m.e)); }
    };
    ws.onclose = function () { pending.forEach(function (p) { p.rej(new Error('Conexão com o Termix encerrada')); }); pending.clear(); setTimeout(connect, 1000); };
  }
  function send(o) { var s = JSON.stringify(o); if (ws && ws.readyState === 1) ws.send(s); else queue.push(s); }
  var ipcRenderer = {
    invoke: function (ch) { var a = Array.prototype.slice.call(arguments, 1); return new Promise(function (res, rej) { var id = ++seq; pending.set(id, { res: res, rej: rej }); send({ t: 'invoke', id: id, ch: ch, a: a }); }); },
    send: function (ch) { var a = Array.prototype.slice.call(arguments, 1); send({ t: 'send', ch: ch, a: a }); },
    on: function (ch, fn) { var l = listeners.get(ch); if (!l) { l = []; listeners.set(ch, l); } l.push(fn); }
  };
  window.termixEmbed = true; document.documentElement.classList.add('embed'); // TASK-135: o app.js e o embed.css se ajustam a rodar dentro do Hub
  var contextBridge = { exposeInMainWorld: function (name, api) { window[name] = api; } };
  connect();
  (function (require) {
${preload}
  })(function () { return { contextBridge: contextBridge, ipcRenderer: ipcRenderer }; });
})();`;
}

function handleHttp(req, res) {
  const deny = (code, msg) => { res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(msg); };
  if (!hostOk(req)) return deny(421, 'host inválido');
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  // entrada com o token: grava o cookie e limpa o link
  if (url.searchParams.has('t')) {
    if (!tokenOk(url.searchParams.get('t'))) return deny(401, 'sem autorização');
    res.writeHead(302, { 'Set-Cookie': `hubt=${token}; HttpOnly; SameSite=Strict; Path=/`, Location: url.pathname === '/' ? '/src/renderer/index.html' : url.pathname });
    return res.end();
  }
  if (!tokenOk(cookieToken(req))) return deny(401, 'sem autorização');
  if (url.pathname === '/health') return deny(200, 'ok');
  if (url.pathname === '/__cmd' && req.method === 'POST') { // Hub -> app; só o canal permitido
    let corpo = '';
    req.on('data', (d) => { corpo += d; if (corpo.length > 65536) req.destroy(); });
    req.on('end', () => { try { const m = JSON.parse(corpo); if (m.canal === 'dialogo:resultado' && Number.isInteger(m.id)) { resolverDialogo(m); return deny(200, 'ok'); } if (m.canal === 'notify:click' && typeof m.tabId === 'string') { broadcast('notify:click', { tabId: m.tabId }); return deny(200, 'ok'); } } catch { /* corpo inválido */ } deny(400, 'comando inválido'); });
    return;
  }
  if (url.pathname === '/__embed.js') { res.writeHead(200, { 'Content-Type': TYPES['.js'], 'Cache-Control': 'no-store' }); return res.end(shimSource()); }
  if (url.pathname === '/') { res.writeHead(302, { Location: '/src/renderer/index.html' }); return res.end(); }
  let rel;
  try { rel = decodeURIComponent(url.pathname); } catch { return deny(400, 'caminho inválido'); }
  if (rel.includes('\0') || rel.includes('..') || !ALLOWED.some((p) => rel.startsWith(p))) return deny(404, 'não encontrado');
  const file = path.join(ROOT(), rel);
  if (!file.startsWith(ROOT())) return deny(404, 'não encontrado');
  fs.readFile(file, (err, buf) => {
    if (err) return deny(404, 'não encontrado');
    const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
    if (rel === '/src/renderer/index.html') {
      const css = '<link rel="stylesheet" href="styles.css">';
      buf = Buffer.from(buf.toString('utf8').replace(css, css + '\n<link rel="stylesheet" href="embed.css">').replace('<script', '<script src="/__embed.js"></script>\n<script'));
    }
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(buf);
  });
}

function onSocket(ws) {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
  ws.on('error', () => clients.delete(ws));
  const fakeEvent = { sender: { send: broadcast, id: 0 }, reply: broadcast };
  ws.on('message', async (raw) => {
    let m;
    try { m = JSON.parse(raw.toString()); } catch { return; }
    const fn = handlers.get(m.ch);
    if (m.t === 'send') { try { if (fn) await fn(fakeEvent, ...(m.a || [])); } catch { /* o main.js já registra os próprios erros */ } return; }
    if (m.t !== 'invoke') return;
    let out;
    if (!fn) out = { t: 'result', id: m.id, ok: false, e: `canal desconhecido: ${m.ch}` };
    else {
      try { const r = await fn(fakeEvent, ...(m.a || [])); out = { t: 'result', id: m.id, ok: true, r: r === undefined ? null : r }; }
      catch (err) { out = { t: 'result', id: m.id, ok: false, e: String((err && err.message) || err) }; }
    }
    if (ws.readyState === 1) ws.send(JSON.stringify(out));
  });
}

// sobe o servidor e devolve a "janela" de mentira para o main.js usar no lugar de createWindow()
// Hub -> app: comandos autenticados pelo token (ex.: abrir a aba de uma notificação). App -> Hub: linhas `HUB_EVENT {json}` na saída.
function emitirHub(ev) { try { console.log('HUB_EVENT ' + JSON.stringify(ev)); } catch { /* evento inválido */ } }
if (enabled) {
  handlers.set('hub:evento', (_e, ev) => { if (ev && typeof ev === 'object') emitirHub({ ...ev, evento: 'notificacao' }); });
}

function start(aoPerderPai) {
  const { WebSocketServer } = require('ws');
  token = process.env.HUB_TOKEN || crypto.randomBytes(16).toString('hex');
  const want = ARG.includes('=') ? parseInt(ARG.split('=')[1], 10) || 0 : 0;
  const wss = new WebSocketServer({ noServer: true, maxPayload: 32 * 1024 * 1024 });
  server = http.createServer(handleHttp);
  server.on('upgrade', (req, socket, head) => {
    const origin = req.headers.origin || '';
    const ok = req.url === '/__ws' && hostOk(req) && tokenOk(cookieToken(req)) && (origin === `http://127.0.0.1:${port}` || origin === `http://localhost:${port}`);
    if (!ok) { socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, onSocket);
  });
  server.listen(want, '127.0.0.1', () => {
    port = server.address().port;
    const line = `HUB_READY ${port}`;
    console.log(line);
    if (process.env.HUB_READY_FILE) { try { fs.writeFileSync(process.env.HUB_READY_FILE, JSON.stringify({ port, token })); } catch { /* sem arquivo de aviso */ } }
  });
  // se o Hub (quem abriu este processo) morrer sem avisar, o Termix encerra também em vez de ficar órfão com os terminais
  const pai = parseInt(process.env.HUB_PARENT_PID, 10);
  if (pai > 0 && aoPerderPai) {
    const t = setInterval(() => { try { process.kill(pai, 0); } catch (e) { if (e.code === 'ESRCH') { clearInterval(t); aoPerderPai(); } } }, 2000);
    t.unref();
  }
  return makeFakeWin();
}

module.exports = { enabled, start, broadcast, url: () => `http://127.0.0.1:${port}/?t=${token}` };
