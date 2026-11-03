'use strict';
const api = window.termix;

const DEFAULT_COLOR = '#5B9DFF'; // cor principal do sistema (azul): toda aba nova começa com ela
const COLORS = ['#5B9DFF', '#7C8CFF', '#34D399', '#F472B6', '#FBBF24', '#22D3EE', '#FB923C', '#A78BFA', '#F87171', '#84CC16', '#38BDF8'];
const GRADS = [['#60a5fa', '#22d3ee'], ['#94a3b8', '#64748b'], ['#38bdf8', '#6366f1'], ['#a5b4fc', '#60a5fa'], ['#67e8f9', '#34d399']];
const GLOBALS = [['Consumo', 'gauge'], ['Integrações', 'link'], ['Configurações', 'gear']];
// o desenho de cada ícone ocupa uma parte diferente do quadro (a engrenagem é grande, o link é pequeno): o tamanho de cada um é ajustado para os três terem o mesmo peso visual (~13 px de desenho)
const GLOBAL_ICON = { gauge: 19, link: 21, gear: 16 };
const gIc = (name, base) => ic(name, Math.round(base * (GLOBAL_ICON[name] || 19) / 19 * 10) / 10);
const SUBS = [['Terminais', 'terminal'], ['Plugins', 'plug'], ['Skills', 'sparkles'], ['MCPs', 'network']];

// engrenagem de 8 dentes, gerada por pontos para não depender de um desenho externo
function gearPath() {
  const teeth = 8, rad = (deg) => (deg * Math.PI) / 180;
  const shape = [[-16, 7.6], [-10, 9.9], [10, 9.9], [16, 7.6]];
  const pts = [];
  for (let i = 0; i < teeth; i++) {
    const base = (i * 360) / teeth;
    for (const [deg, r] of shape) { const t = rad(base + deg); pts.push(`${(12 + r * Math.sin(t)).toFixed(2)} ${(12 - r * Math.cos(t)).toFixed(2)}`); }
  }
  return `M${pts.join('L')}Z`;
}

// ícones de traço, todos no mesmo estilo
const ICONS = {
  panel: '<rect x="3" y="4.5" width="18" height="15" rx="3.5"/><path d="M9.5 4.5v15"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  bell: '<path d="M6 10a6 6 0 0 1 12 0c0 4.6 1.8 6 1.8 6H4.2S6 14.6 6 10z"/><path d="M10 19.2a2.2 2.2 0 0 0 4 0"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  terminal: '<path d="M7.5 4.5h10a3.5 3.5 0 0 1 3.5 3.5v8"/><rect x="3" y="8" width="15" height="12" rx="3"/><path d="M7 12.4l2.4 1.9L7 16.2M11.6 16.4h3"/>',
  plug: '<path d="M9 3.5v4M15 3.5v4"/><path d="M6.5 7.5h11v3.2a5.5 5.5 0 0 1-11 0V7.5z"/><path d="M12 16.2v4.3"/>',
  sparkles: '<path d="M11 4l1.7 4.6L17.3 10l-4.6 1.4L11 16l-1.7-4.6L4.7 10l4.6-1.4L11 4z"/><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15z"/>',
  network: '<circle cx="6" cy="6.5" r="2.3"/><circle cx="18" cy="6.5" r="2.3"/><circle cx="12" cy="17.5" r="2.3"/><path d="M8.2 7.7l2.7 7.5M15.8 7.7l-2.7 7.5M8.3 6.5h7.4"/>',
  gauge: '<path d="M4.5 17a8 8 0 1 1 15 0"/><path d="M12 15.5l3.6-4.6"/><circle cx="12" cy="15.8" r="1"/>',
  link: '<path d="M10.2 13.8a3.6 3.6 0 0 0 5.1 0l2.9-2.9a3.6 3.6 0 0 0-5.1-5.1l-.9.9"/><path d="M13.8 10.2a3.6 3.6 0 0 0-5.1 0l-2.9 2.9a3.6 3.6 0 0 0 5.1 5.1l.9-.9"/>',
  gear: `<path d="${gearPath()}"/><circle cx="12" cy="12" r="3"/>`,
  plus: '<path d="M12 5.5v13M5.5 12h13"/>',
  chevd: '<path d="M6.5 9.5l5.5 5.5 5.5-5.5"/>',
  chevr: '<path d="M9.5 6.5l5.5 5.5-5.5 5.5"/>',
  x: '<path d="M7 7l10 10M17 7L7 17"/>',
  refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4.5H15"/>',
  alert: '<path d="M12 4.5l8.5 15h-17L12 4.5z"/><path d="M12 10.5v3.8M12 17.2v.01"/>',
  dots: '<circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
  minus: '<path d="M5.5 12h13"/>',
  edit: '<path d="M4.5 19.5l1-4L16.8 4.2a2 2 0 0 1 2.8 0l.2.2a2 2 0 0 1 0 2.8L8.5 18.5l-4 1z"/><path d="M14.5 6.5l3 3"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6.5A2 2 0 0 0 13.5 4.5h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/>',
  arrowl: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  arrowr: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5"/><path d="M5 19.5h14"/>',
  save: '<path d="M5 4.5h11l3 3v12H5z"/><path d="M8 4.5v5h7v-5M8 19.5v-6h8v6"/>',
};
const ic = (name, size = 18) => `<svg class="i" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
const STATES = {
  work: ['s-work', 'Trabalhando'],
  wait: ['s-wait', 'Aguardando você'],
  restart: ['s-restart', 'Reiniciando…'],
  fail: ['s-fail', 'Falha ao iniciar'],
  end: ['s-end', 'Encerrada'],
  unk: ['s-unk', 'Desconhecido'],
};

let S = { projects: [], settings: { termOp: 88, sideCollapsed: false } };
const UI = { cur: { p: null, page: 'Terminais' }, last: null, actOpen: false, pop: false, menu: null, events: [], res: null, env: null, limits: null };
const RT = {};  // runtime por aba: terminal, estado, processo
const MET = {}; // métricas por aba vindas da status line

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uuid = () => crypto.randomUUID();

/* ---------- estado persistido ---------- */
let saveTimer = null;
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => api.saveState(S), 250); }
const visibleProjects = () => S.projects.filter((p) => !p.archived);
const proj = (id) => S.projects.find((p) => p.id === id);
const openTabs = (p) => p.tabs.filter((t) => t.open && !t.archived);
const curProject = () => (UI.cur.p && UI.cur.p !== '_' ? proj(UI.cur.p) : null);
const curTab = (p) => openTabs(p).find((t) => t.id === p.activeTab) || openTabs(p)[0];
function findTab(tabId) {
  for (const p of S.projects) { const tab = p.tabs.find((t) => t.id === tabId); if (tab) return { p, tab }; }
  return null;
}
const stOf = (tab) => (RT[tab.id] ? RT[tab.id].st : tab.kind === 'chat' ? 'wait' : 'end');
const aliveTabs = () => S.projects.flatMap((p) => p.tabs.filter((t) => RT[t.id] && RT[t.id].alive).map((t) => ({ p, tab: t })));

/* ---------- eventos (notificações) ---------- */
const NOTIF_DEF = { v: 1, done: true, perm: true, error: true, cache: true, cacheMin: 10, sound: true, toast: true, toastSec: 6, win: true };
const notifCfg = () => S.settings.notif || NOTIF_DEF;
const EV_MAX = 60;
let evSeq = 0;
function addEvent(ev) {
  // aberto o painel, o aviso já nasce visto; fechado, conta no selo do sino até a pessoa abrir e fechar o painel
  UI.events.unshift({ id: ++evSeq, ts: Date.now(), done: false, seen: UI.actOpen, acts: [], ...ev });
  UI.events = UI.events.slice(0, EV_MAX);
  renderAct(); renderTop();
}
function markSeen() { for (const e of UI.events) e.seen = true; }

// som curto gerado na hora (sem arquivo): tom por tipo, volume baixo
let audioCtx = null;
function beep(kind) {
  if (!notifCfg().sound) return;
  try {
    audioCtx = audioCtx || new AudioContext();
    const f = { done: [660, 880], perm: [740, 740, 740], error: [330, 247], cache: [523, 392] }[kind] || [660];
    const t0 = audioCtx.currentTime;
    f.forEach((hz, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = hz;
      g.gain.setValueAtTime(0.0001, t0 + i * 0.13);
      g.gain.exponentialRampToValueAtTime(0.07, t0 + i * 0.13 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.13 + 0.16);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t0 + i * 0.13); o.stop(t0 + i * 0.13 + 0.18);
    });
  } catch { /* sem áudio: segue sem som */ }
}

// dica animada ao lado esquerdo do sino: mostra rápido o que aconteceu; clicar abre o painel
let toastEl = null, toastTimer = 0;
function showToast(ev) {
  const cfg = notifCfg();
  if (!cfg.toast || UI.actOpen) return;
  const bell = document.querySelector('[data-togact]');
  if (!bell) return;
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'ntoast';
    toastEl.addEventListener('click', () => { hideToast(); if (!UI.actOpen) document.querySelector('[data-togact]').click(); });
    document.body.appendChild(toastEl);
  }
  const r = bell.getBoundingClientRect();
  toastEl.style.right = `${Math.round(window.innerWidth - r.left + 10)}px`;
  toastEl.style.top = `${Math.round(r.top + r.height / 2)}px`;
  toastEl.style.setProperty('--c', ev.c || '#8B7BFF');
  toastEl.innerHTML = `<b>${esc(ev.who)}<small>${esc(KIND_TITLE[ev.kind] || '')}</small></b><span>${esc(ev.msg)}</span>`;
  toastEl.classList.remove('show'); void toastEl.offsetWidth; toastEl.classList.add('show'); // reinicia a animação
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, Math.max(2, cfg.toastSec) * 1000);
}
function hideToast() { clearTimeout(toastTimer); if (toastEl) toastEl.classList.remove('show'); }
// resumo curto do texto final do agente: a última frase útil, sem marcação
function lastLine(t) {
  if (!t) return '';
  const s = String(t).replace(/```[\s\S]*?```/g, ' ').replace(/[*_`#>]/g, '').split(/\n+/).map((x) => x.trim()).filter(Boolean);
  const l = s[s.length - 1] || '';
  return l.length > 160 ? `${l.slice(0, 157)}…` : l;
}
function ago(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 45) return 'agora';
  if (s < 3600) return `há ${Math.max(1, Math.round(s / 60))} min`;
  return `há ${Math.round(s / 3600)} h`;
}
const pending = () => UI.events.filter((e) => !e.seen && !e.done).length;

/* ---------- terminais ---------- */
function termTheme() {
  return { background: 'rgba(0,0,0,0)', foreground: '#dcd9ee', cursor: '#8B7BFF', selectionBackground: 'rgba(139,123,255,.35)', scrollbarSliderBackground: 'rgba(255,255,255,.14)', scrollbarSliderHoverBackground: 'rgba(255,255,255,.28)', scrollbarSliderActiveBackground: 'rgba(255,255,255,.38)' };
}

function ensureRT(tab) {
  if (RT[tab.id]) return RT[tab.id];
  if (tab.kind === 'chat') return chatEnsure(tab); // aba de chat (chat.js): sem terminal
  const term = new Terminal({
    fontFamily: '"Cascadia Mono","Cascadia Code",Consolas,monospace',
    fontSize: 13, cursorBlink: true, allowTransparency: true, scrollback: 5000, theme: termTheme(),
  });
  const fit = new FitAddon.FitAddon();
  term.loadAddon(fit);
  const el = document.createElement('div');
  el.className = 'tview';
  $('#termHost').appendChild(el);
  const r = (RT[tab.id] = { term, fit, el, opened: false, alive: false, st: 'end', hooks: false, lastData: 0, lastInput: 0, spawnAt: 0, evidence: false, killing: false, waiter: null });
  // Ctrl+C copia quando há texto selecionado (sem seleção continua sendo o Ctrl+C do terminal); Ctrl+V cola
  term.attachCustomKeyEventHandler((ev) => {
    if (ev.type !== 'keydown' || !ev.ctrlKey || ev.altKey) return true;
    const k = ev.key.toLowerCase();
    if (k === 'c' && (term.hasSelection() || ev.shiftKey)) {
      ev.preventDefault();
      if (term.hasSelection()) { api.clipWrite(term.getSelection()); term.clearSelection(); }
      return false;
    }
    if (k === 'v') {
      ev.preventDefault();
      api.clipRead().then((t) => { if (t) term.paste(t); else api.write(tab.id, '\x16'); }); // sem texto (ex.: imagem), deixa o Claude Code tratar o Ctrl+V
      return false;
    }
    return true;
  });
  term.onData((d) => { r.lastInput = Date.now(); api.write(tab.id, d); });
  term.onResize(({ cols, rows }) => api.resize(tab.id, cols, rows));
  return r;
}

// renderizador WebGL só na aba visível (bem mais rápido que o DOM); as outras abas liberam o contexto de GPU
function setGL(r, on) {
  if (on && !r.gl && r.opened && window.WebglAddon) {
    try {
      const gl = new WebglAddon.WebglAddon();
      gl.onContextLoss(() => { try { gl.dispose(); } catch { /* ignora */ } r.gl = null; });
      r.term.loadAddon(gl); r.gl = gl;
    } catch { r.gl = null; }
  } else if (!on && r.gl) { try { r.gl.dispose(); } catch { /* ignora */ } r.gl = null; }
}

function showTab(tab) {
  const r = ensureRT(tab);
  $('#termHost').classList.remove('hide'); $('#chatHost').classList.add('hide'); $('#sess').classList.remove('chatmode');
  for (const o of Object.values(RT)) if (o !== r) setGL(o, false);
  document.querySelectorAll('.tview').forEach((el) => el.classList.remove('on'));
  r.el.classList.add('on');
  if (!r.opened) { r.term.open(r.el); r.opened = true; }
  setGL(r, true);
  requestAnimationFrame(() => { try { r.fit.fit(); } catch { /* sem tamanho ainda */ } if (!UI.menu && !$('#modalRoot').firstChild) r.term.focus(); });
}

// fit agrupado: em animações e redimensionamentos ajusta uma vez só (evita dezenas de resizes no processo)
let fitTimer = null;
function fitActive() {
  if (fitTimer) return;
  fitTimer = setTimeout(() => { fitTimer = null; fitNow(); }, 150);
}
function fitNow() {
  const p = curProject();
  if (!p || UI.cur.page !== 'Terminais') return;
  const tab = curTab(p);
  if (tab && RT[tab.id] && RT[tab.id].opened) { try { RT[tab.id].fit.fit(); } catch { /* ignora */ } }
}

function setSt(tab, st) {
  const r = ensureRT(tab);
  if (r.st === st) return;
  r.st = st;
  renderChrome();
  sendSummary();
}

function sendSummary() {
  const al = aliveTabs();
  api.summary({ active: al.length, working: al.filter((x) => stOf(x.tab) === 'work').length });
}

async function launch(p, tab, mode) {
  if (tab.kind === 'chat') return chatOpen(p, tab, mode);
  const r = ensureRT(tab);
  // aba criada mas nunca usada: não há histórico para retomar (o Claude diria "No conversation found"); abre a mesma conversa vazia
  if (mode === 'resume' && !(await api.sessionExists(p.path, tab.sessionId))) mode = 'new';
  r.alive = true; r.killing = false; r.evidence = false; r.hooks = false; r.spawnAt = Date.now(); r.lastData = 0;
  setSt(tab, mode === 'resume' ? 'restart' : 'work');
  const args = mode === 'resume' ? ['--resume', tab.sessionId] : ['--session-id', tab.sessionId, '--name', tab.name];
  if (tab.perm === 'd') args.push('--dangerously-skip-permissions');
  r.term.writeln(`\x1b[2m── Termix: ${mode === 'resume' ? 'retomando' : 'iniciando'} a conversa ${tab.sessionId.slice(0, 8)}… ──\x1b[0m`);
  const res = await api.spawn({ tabId: tab.id, cwd: p.path, args, cols: r.term.cols, rows: r.term.rows });
  if (!res.ok) {
    r.alive = false;
    setSt(tab, 'fail');
    r.term.writeln(`\x1b[31m${res.error}\x1b[0m`);
    addEvent({ c: tab.color, who: tab.name, msg: res.error, acts: [['Tentar de novo', 'restart', tab.id]] });
    return;
  }
  tab.started = true; tab.live = true; save();
  sendSummary();
  const stamp = r.spawnAt;
  setTimeout(() => {
    if (!(r.alive && r.spawnAt === stamp)) return;
    r.evidence = true;
    if (r.st === 'restart') {
      setSt(tab, 'wait');
      addEvent({ c: tab.color, who: tab.name, msg: 'Conversa retomada (processo ativo após o reinício).' });
    }
  }, 4000);
}

function stopProc(tab) {
  const r = RT[tab.id];
  if (!r || !r.alive) return Promise.resolve();
  return new Promise((resolve) => {
    r.killing = true; r.waiter = resolve;
    if (tab.kind === 'chat') api.chatStop(tab.id); else api.kill(tab.id);
    setTimeout(() => { if (r.waiter) { r.waiter = null; r.alive = false; resolve(); } }, 3000);
  });
}

async function restartTab(p, tab) {
  if (tab.kind === 'chat') return chatRestart(p, tab);
  const r = RT[tab.id];
  if (r && r.alive) {
    if (r.st === 'work') {
      const choice = await modal({
        title: 'O agente está trabalhando',
        body: '<p>Reiniciar agora interrompe o que ele está fazendo. A conversa é retomada depois, mas o comando em andamento não continua sozinho.</p>',
        buttons: [['Cancelar', null], ['Aguardar finalizar e reiniciar', 'wait'], ['Interromper e reiniciar', 'now', 'pri']],
      });
      if (!choice.value) return;
      if (choice.value === 'wait') {
        addEvent({ c: tab.color, who: tab.name, msg: 'Aguardando o agente terminar para reiniciar.' });
        while (RT[tab.id] && RT[tab.id].alive && RT[tab.id].st === 'work') await new Promise((ok) => setTimeout(ok, 600));
      }
    }
    await stopProc(tab);
  }
  await launch(p, tab, 'resume');
}

// troca a aba entre Chat e Terminal mantendo nome, cor e a mesma conversa (--resume <id>)
async function switchMode(p, tab) {
  const toChat = tab.kind !== 'chat';
  const r = RT[tab.id], c = typeof CH !== 'undefined' ? CH[tab.id] : null;
  if ((r && r.alive && r.st === 'work') || (c && c.busy)) {
    const ch = await modal({ title: 'O agente está trabalhando', body: `<p>Trocar para ${toChat ? 'Chat' : 'Terminal'} agora interrompe o que ele está fazendo. A conversa continua no novo modo.</p>`, buttons: [['Cancelar', null], ['Interromper e trocar', 'now', 'pri']] });
    if (!ch.value) return;
  }
  await stopProc(tab);
  if (tab.kind === 'chat') chatForget(tab);
  if (RT[tab.id]) { if (RT[tab.id].term) { RT[tab.id].term.dispose(); RT[tab.id].el.remove(); } delete RT[tab.id]; }
  if (toChat) tab.kind = 'chat'; else delete tab.kind;
  tab.live = false; save();
  await launch(p, tab, 'resume');
  sendSummary(); renderAll();
}

async function newConversation(p, tab) {
  if (tab.kind === 'chat') return chatNew(p, tab);
  await stopProc(tab);
  tab.sessionId = uuid(); tab.started = false;
  save();
  await launch(p, tab, 'new');
}

api.onData(({ tabId, data }) => {
  const f = findTab(tabId);
  if (!f) return;
  const r = ensureRT(f.tab);
  r.term.write(data);
  if (window.webDetect) webDetect(f.p, data); // servidores locais citados na saída (selo na Web)
  const now = Date.now();
  r.lastData = now;
  if (!r.hooks && r.st === 'wait' && now - r.lastInput > 500) setSt(f.tab, 'work');
});

api.onExit(({ tabId, code }) => {
  const f = findTab(tabId);
  if (!f || !RT[tabId]) return;
  const { tab } = f; const r = RT[tabId];
  r.alive = false;
  if (r.killing) { r.killing = false; if (r.waiter) { r.waiter(); r.waiter = null; } return; }
  const failed = code !== 0 && !r.evidence;
  tab.live = false; save();
  r.term.writeln(`\r\n\x1b[2m[Termix] Processo encerrado (código ${code}).\x1b[0m`);
  setSt(tab, failed ? 'fail' : 'end');
  if (failed) {
    const p = f.p;
    const msg = 'Falha ao iniciar ou retomar a conversa. A aba foi mantida; nenhuma conversa nova foi criada.';
    const acts = [['Tentar de novo', 'restart', tab.id], ['Nova conversa', 'newconv', tab.id]];
    if (document.hasFocus() && tabVisible(p, tab)) addEvent({ c: tab.color, who: tab.name, msg, kind: 'error', acts });
    else notifyTab(p, tab, 'error', msg, acts);
  }
  sendSummary();
});

// métricas da status line: limites da conta (5h e 7d) e contexto por sessão
function onMetric({ tabId, data }) {
  MET[tabId] = data;
  const c = RT[tabId] && RT[tabId].cost; // base da conversa nova: leitura mais recente antes do pedido de retomada
  if (c && c.phase === 'cleared' && data.updated >= c.clearedAt && ctxTok(data) !== null) c.base = ctxTok(data);
  const rl = data.rate_limits;
  if (rl && (!UI.limits || data.updated >= UI.limits.updated)) {
    const w = (x) => (x && typeof x.used_percentage === 'number' ? { pct: x.used_percentage, resets: x.resets_at } : null);
    UI.limits = { five: w(rl.five_hour), week: w(rl.seven_day), updated: data.updated };
  }
  renderTop(); renderRail();
  if (UI.pop) renderPop();
  if (UI.cur.p === '_' && UI.cur.page === 'Consumo') renderPage();
}
api.onMetrics(onMetric);
setInterval(() => { renderTop(); }, 30000); // atualiza "renova em" e "atualizado há"

// estado da aba pelos hooks do Claude Code (exato). Sem hooks (node ausente ou hooks bloqueados), vale a heurística abaixo.
const tabVisible = (p, tab) => UI.cur.p === p.id && UI.cur.page === 'Terminais' && curTab(p) && curTab(p).id === tab.id;

// aviso de uma aba: só quando a pessoa não está olhando para ela (aba oculta ou app em segundo plano).
// Vai para o painel, ganha selo na aba e, com o app sem foco, vira notificação do Windows.
const KIND_RANK = { done: 1, perm: 2, error: 3 };
const KIND_TITLE = { done: 'Terminou', perm: 'Precisa de você', error: 'Erro', cache: 'Cache esfriando' };
function notifyTab(p, tab, kind, msg, acts = []) {
  const cfg = notifCfg();
  if (cfg[kind] === false) return; // tipo desligado em Configurações > Notificações
  const focused = document.hasFocus();
  if (kind !== 'cache' && focused && tabVisible(p, tab)) return;
  if (stOf(tab) === 'work' && kind !== 'error') return; // terminal trabalhando não notifica
  const ev = { c: tab.color, who: tab.name, tabId: tab.id, msg, kind, acts: [['Abrir', 'open', tab.id], ...acts] };
  addEvent(ev);
  if (kind !== 'cache') { const r = ensureRT(tab); if (!r.unread || KIND_RANK[kind] >= KIND_RANK[r.unread]) r.unread = kind; }
  if (!focused && cfg.win) api.notify({ tabId: tab.id, title: `${tab.name} · ${KIND_TITLE[kind]}`, body: msg });
  showToast(ev); beep(kind);
  renderChrome();
}

// cache esfriando: avisa uma vez por ciclo (cada resposta renova o cache e reabre o ciclo). TTL de 1 h avisa N min antes; o de 5 min, 1 min antes.
function checkCache() {
  const cfg = notifCfg();
  if (cfg.cache === false) return;
  for (const { p, tab } of aliveTabs()) {
    const r = RT[tab.id], pc = (MET[tab.id] || {}).prompt_cache;
    if (!r || !pc || !pc.warm || !pc.expires_at || stOf(tab) !== 'wait') continue;
    const rem = pc.expires_at - Date.now() / 1000;
    const lim = (pc.ttl === '1h' ? Math.max(1, cfg.cacheMin) * 60 : 60);
    if (rem <= 0 || rem > lim || r.cacheWarned === pc.expires_at) continue;
    r.cacheWarned = pc.expires_at;
    const left = rem >= 90 ? `${Math.round(rem / 60)} min` : `${Math.max(1, Math.round(rem))} s`;
    notifyTab(p, tab, 'cache', `O cache esfria em ~${left}.${pc.recache_tokens_if_cold ? ` Depois disso, a próxima mensagem reescreve ${fmtTok(pc.recache_tokens_if_cold)} tokens.` : ' Depois disso, a próxima mensagem reescreve o contexto.'}`);
  }
}
setInterval(checkCache, 10000);
function openTab(tabId) {
  const f = findTab(tabId);
  if (!f || !f.tab.open) return;
  f.p.activeTab = f.tab.id; UI.cur = { p: f.p.id, page: 'Terminais' }; UI.last = f.p.id; UI.pop = false;
  save(); renderAll();
}
api.onNotifyClick(({ tabId }) => openTab(tabId));
api.onFocus(() => renderChrome()); // voltar ao app limpa o selo da aba que já está à vista
api.onHook(({ tabId, data }) => {
  const f = findTab(tabId);
  if (!f || !RT[tabId] || !RT[tabId].alive) return;
  const { p, tab } = f; const r = RT[tabId];
  if (data.t < r.spawnAt) return; // evento de uma execução anterior desta aba
  r.hooks = true;
  // /clear cria uma conversa nova com outro ID; o Retomar precisa do ID atual (compactação e resume mantêm o ID)
  if (data.session_id && data.session_id !== tab.sessionId) { tab.sessionId = data.session_id; tab.started = true; save(); }
  switch (data.event) {
    case 'UserPromptSubmit': case 'PostToolUse':
      setSt(tab, 'work');
      if (data.event === 'UserPromptSubmit' && UI.events.some((e) => e.kind === 'cache' && e.tabId === tab.id)) { UI.events = UI.events.filter((e) => !(e.kind === 'cache' && e.tabId === tab.id)); renderAct(); renderTop(); } // mandou mensagem: o cache foi renovado, o aviso perdeu o sentido
      if (data.event === 'UserPromptSubmit' && r.cost && r.cost.phase === 'cleared') r.cost.phase = 'resumed'; // o pedido de retomada entrou: a base fica congelada
      break;
    case 'SessionStart':
      setSt(tab, 'wait');
      if (data.source === 'clear') { r.term.write('\x1b[2J\x1b[3J\x1b[H'); api.write(tab.id, '\x0c'); } // apaga a tela e o histórico visível e pede o redesenho (Ctrl+L)
      if (data.source === 'clear' && r.cost && r.cost.phase === 'clearing') { r.cost.phase = 'cleared'; r.cost.clearedAt = Date.now(); }
      if (r.flow && r.flow.step === 'clearing' && data.source === 'clear') {
        const resume = r.flow.resume;
        r.flow = null;
        if (resume) setTimeout(() => typeTo(tab, resume), 900);
        renderRail();
      }
      break;
    case 'Stop':
      setSt(tab, 'wait');
      if (r.cost && r.cost.phase === 'resumed') { r.cost.phase = 'ending'; setTimeout(() => finishCost(tab), 2500); } // dá tempo da status line gravar o fim da resposta
      notifyTab(p, tab, 'done', lastLine(data.last) || 'Terminou · aguarda você');
      break;
    case 'Notification':
      setSt(tab, 'wait');
      notifyTab(p, tab, 'perm', data.message || 'Precisa da sua atenção');
      break;
  }
});

/* ---------- botão Clear (alternador): fechar a tarefa, /clear e retomar ---------- */
const CLEAR_MARK = 'TERMIX-CLEAR-OK';
const GENERIC_CLOSE = 'Vou fechar esta tarefa. Faça nesta ordem: 1) confirme que o trabalho está aprovado por mim; se não estiver, resuma o que foi feito e pare, sem escrever o aviso final. 2) Rode a validação do projeto e corrija se falhar. 3) Registre a tarefa no arquivo de tarefas do projeto (docs/TASKS.md ou docs/HISTORICO-TAREFAS.md, o que existir): o que foi feito, arquivos alterados, padrão seguido, decisões e pendências, em até 6 linhas. 4) Não faça commit nem push. 5) Só se tudo isso foi concluído, termine escrevendo exatamente ' + CLEAR_MARK + '.';
const GENERIC_RESUME = 'Estou retomando o trabalho depois de um /clear. Leia o CLAUDE.md, o arquivo de tarefas do projeto (docs/TASKS.md ou docs/HISTORICO-TAREFAS.md, o que existir) e os últimos commits. Resuma em poucas linhas onde paramos e o que está pendente. Antes de mexer em algo de uma tarefa já encerrada, leia a entrada dela e siga o mesmo padrão. Se faltar informação, pergunte em vez de supor. Não leia arquivos além do necessário.';
const CLEAR_DEF = {
  v: 2, alert: 15, // alert: % de contexto a partir do qual o botão pulsa (0 = nunca)
  flow: true, commit: true, // flow: usar os pedidos do fluxo Rocruzta nos projetos que o têm; commit: fechar com commit e push na branch do papel
  closePrompt: '', resumePrompt: '', // vazio = automático (fluxo ou genérico, conforme o projeto)
};
// pedidos para projetos no fluxo Rocruzta: só o que o fluxo exige, lendo o mínimo (nada de abrir o TASKS.md inteiro)
const AUX_ROLES = ['DEV2', 'DEV3', 'DEV4', 'DEV5'];
const flowResume = (i) => 'Estou retomando o trabalho depois de um /clear; a conversa anterior foi apagada, não dependa dela. '
  + `Papel desta máquina: ${i.role || 'veja o CLAUDE.local.md'}${i.branch ? `, branch ${i.branch}` : ''}. `
  + 'Leia o CLAUDE.md e o CLAUDE.local.md (o WORKFLOW.md só se precisar do passo a passo). '
  + 'Do docs/TASKS.md NÃO abra o arquivo inteiro: ache os títulos com Grep -n "^## " e leia só as seções "Em andamento" e "Aguardando validação DEV1" (Read com offset e limit); das demais tarefas veja só os títulos (Grep -n "^### TASK"). '
  + 'Do docs/CHANGELOG_DEV.md leia só a entrada mais recente (as primeiras ~40 linhas). '
  + 'Leia docs/DECISOES.md ou docs/DESIGN.md só se a tarefa em andamento mexer no comportamento do produto ou na aparência, e apenas a seção relevante. '
  + 'Confira git status -sb e git log --oneline -5. '
  + (AUX_ROLES.includes(i.role) ? 'Confira se a dev1 tem commits que a sua branch ainda não tem (git log ..origin/dev1 --oneline) e avise antes de seguir. ' : i.role === 'DEV1' ? 'Não consulte as branches dev2 a dev5 (trava de contexto do fluxo). ' : '')
  + 'Responda em poucas linhas: onde paramos, o que depende de mim e o próximo passo. Não comece a desenvolver até eu confirmar.';
const flowClose = (i, commit) => {
  const aux = AUX_ROLES.includes(i.role);
  const val = i.validacao && i.validacao.length ? i.validacao.join(' e ') : 'a validação do projeto (.claude/fluxo.json)';
  return 'Vou fechar a tarefa em andamento. Faça nesta ordem, lendo só o necessário: '
    + '1) confirme que o resultado foi aprovado por mim nesta conversa; se não foi, resuma o que foi feito e como testar e pare, sem escrever o aviso final. '
    + `2) rode ${val}; se falhar, corrija. `
    + `3) em docs/TASKS.md edite só a entrada da tarefa ativa (ache-a com Grep -n e leia só esse trecho; não abra o arquivo inteiro): preencha Feito até agora, Decisões, Arquivos tocados, Como validar, Pendências e Próximo passo, mude o status para ${aux ? 'AGUARDANDO VALIDAÇÃO DEV1' : 'VALIDADA EM DEV1'} e mova a entrada para a seção correspondente. `
    + '4) acrescente a entrada de hoje no topo de docs/CHANGELOG_DEV.md. '
    + '5) o que surgiu fora do escopo vira tarefa no Backlog. '
    + (aux ? `6) reescreva docs/HANDOFF_${i.role}.md (resumo em alto nível, sem colar código). ` : '')
    + (commit ? `${aux ? '7' : '6'}) faça o commit "TASK-XXX: descrição curta no imperativo" e o push somente para origin/${i.branch || 'a branch do seu papel'}; nunca promova para a main. ` : `${aux ? '7' : '6'}) não faça commit nem push. `)
    + `${aux ? '8' : '7'}) só se tudo isso foi concluído, termine escrevendo exatamente ${CLEAR_MARK}.`;
};
// textos efetivos para um projeto: o que a pessoa escreveu nas configurações vale sempre; vazio = automático
async function clearPrompts(p) {
  const c = clearCfg();
  const info = c.flow ? await api.flowInfo(p.path) : { on: false };
  const fl = !!info.on;
  return { fl, info, canClose: !(fl && info.role === 'GERENTE'),
    close: c.closePrompt || (fl ? flowClose(info, c.commit) : GENERIC_CLOSE),
    resume: c.resumePrompt || (fl ? flowResume(info) : GENERIC_RESUME) };
}
const clearCfg = () => S.settings.clear || CLEAR_DEF;
const connCfg = () => S.settings.connectors || { v: 1, newProject: 'auto' };
const typeTo = (tab, text) => { api.write(tab.id, text); setTimeout(() => api.write(tab.id, '\r'), 150); };
// tokens no contexto agora (soma do uso atual; o used_percentage vem em inteiro e a 1M de janela cada 1 % são 10 mil tokens)
const ctxTok = (m) => { const u = m && m.context_window && m.context_window.current_usage; return u ? (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0) : null; };
// custo da retomada: antes do /clear → base da conversa nova (antes do pedido de retomada) → fim da primeira resposta
function finishCost(tab) {
  const r = RT[tab.id], c = r && r.cost;
  if (!c || c.phase !== 'ending') return;
  c.after = ctxTok(MET[tab.id]); c.phase = 'done';
  if (c.after === null) return;
  const parts = [c.base !== null ? `base ${fmtTok(c.base)} → ${fmtTok(c.after)}` : `contexto depois da retomada ${fmtTok(c.after)}`];
  if (c.before !== null) parts.push(`antes do /clear ${fmtTok(c.before)}`);
  addEvent({ c: tab.color, who: tab.name, msg: `${c.base !== null ? `A retomada custou ~${fmtTok(Math.max(0, c.after - c.base))} tokens` : 'Retomada concluída'} · ${parts.join(' · ')}` });
  renderRail();
}
function markCount(term) { // quantas vezes o aviso final aparece no texto do terminal (linhas quebradas são unidas)
  const b = term.buffer.active; let t = '';
  for (let i = 0; i < b.length; i++) { const l = b.getLine(i); if (l) t += (l.isWrapped ? '' : '\n') + l.translateToString(true); }
  return (t.match(new RegExp(CLEAR_MARK, 'g')) || []).length;
}
// estado do botão no alternador: off = desabilitado, pulse = contexto passou do limite configurado
function clearDockState(p) {
  const tab = p && curTab(p), r = tab && RT[tab.id];
  if (!tab || !openTabs(p).length) return null;
  if (tab.kind === 'chat') { // chat: Clear = conversa nova; Reiniciar = reinicia o processo (a conversa continua)
    // mesma regra do terminal: pulsa quando o agente está parado e o contexto (anel CTX) chegou ao limite de alerta (Configurações > Clear)
    const c = CH[tab.id], busy = !!(c && c.busy), flow = !!(c && c.flow);
    const cpc = ((MET[tab.id] || {}).context_window || {}).used_percentage, al = +clearCfg().alert;
    const ready = !busy && !flow && !!(tab.started || (c && c.items.length));
    return { off: !ready, busy: flow, pulse: ready && al > 0 && typeof cpc === 'number' && cpc >= al, rst: { spin: false, off: busy || flow, tip: 'Reiniciar o processo (a conversa continua)' } };
  }
  const cp = ((MET[tab.id] || {}).context_window || {}).used_percentage;
  const ready = !!(r && r.alive && r.st === 'wait' && !r.flow);
  const a = +clearCfg().alert;
  const st = stOf(tab);
  return { off: !ready, busy: !!(r && r.flow), pulse: ready && a > 0 && typeof cp === 'number' && cp >= a,
    rst: { spin: st === 'restart', off: st === 'restart' || !!(r && r.flow), tip: st === 'end' ? 'Retomar a conversa' : st === 'fail' ? 'Tentar de novo' : 'Reiniciar com a conversa atual' } };
}
function dockRestart() { const p = curProject(), tab = p && curTab(p); if (tab) restartTab(p, tab); }
async function clearFlow() {
  const p = curProject(), tab = p && curTab(p), r = tab && RT[tab.id];
  if (tab && tab.kind === 'chat') return chatClearFlow(p, tab);
  if (!r || !r.alive || r.st !== 'wait' || r.flow) return;
  const pr = await clearPrompts(p);
  if (!r.alive || r.st !== 'wait' || r.flow) return;
  const nota = pr.fl ? `<p class="meta">Projeto no fluxo Rocruzta${pr.info.role ? ` · papel ${esc(pr.info.role)}` : ''}: o fechamento e a retomada seguem o fluxo e leem só o necessário.</p>` : '';
  const c = await modal({
    title: 'Limpar o contexto?',
    body: '<p>O <code>/clear</code> apaga o contexto e começa uma conversa nova. <b>Fechar a tarefa e limpar</b> pede antes ao agente para registrar o que foi feito e, ao terminar, limpa e manda ele retomar pelos arquivos do projeto.</p>' + nota,
    buttons: pr.canClose ? [['Cancelar', null], ['Só limpar', 'only'], ['Fechar a tarefa e limpar', 'full', 'pri']] : [['Cancelar', null], ['Só limpar', 'only', 'pri']],
  });
  if (!c.value || !r.alive || r.st !== 'wait' || r.flow) return;
  if (c.value === 'only') { doClear(tab, ''); return; }
  r.flow = { step: 'closing', t0: Date.now(), saw: false, base: null, resumeText: pr.resume };
  typeTo(tab, pr.close);
  setTimeout(() => { if (r.flow && r.flow.base === null) r.flow.base = markCount(r.term); }, 1500);
  addEvent({ c: tab.color, who: tab.name, msg: 'Fechando a tarefa antes do /clear…' });
  renderRail();
}
function doClear(tab, resumeText) { // resumeText vazio = só limpar, sem pedir a retomada
  const r = RT[tab.id];
  r.flow = { step: 'clearing', t0: Date.now(), resume: resumeText };
  r.cost = resumeText ? { phase: 'clearing', before: ctxTok(MET[tab.id]), base: null, after: null } : null; // só mede quando há retomada
  typeTo(tab, '/clear');
  renderRail();
}
async function clearClosed(tab) { // o agente terminou de fechar a tarefa: limpa se o aviso final apareceu; senão pergunta
  const r = RT[tab.id];
  const text = r.flow.resumeText;
  if (markCount(r.term) > r.flow.base) { doClear(tab, text); return; }
  r.flow = { step: 'asking', t0: Date.now() };
  renderRail();
  const c = await modal({
    title: 'A tarefa foi registrada?',
    body: '<p>Não encontrei o aviso de que o fechamento terminou (o agente pode ter pedido sua aprovação ou deixado algo pendente). Olhe o terminal antes de decidir.</p>',
    buttons: [['Não limpar', null], ['Limpar e retomar mesmo assim', 'ok', 'pri']],
  });
  if (c.value === 'ok' && r.alive) doClear(tab, text); else { r.flow = null; renderRail(); }
}
function clearTick(tab) { // chamado a cada 700 ms para cada aba viva
  const r = RT[tab.id], f = r.flow;
  if (!f) return;
  if (f.step === 'closing') {
    if (r.st === 'work') f.saw = true;
    if (!f.saw && Date.now() - f.t0 > 10000) { r.flow = null; renderRail(); } // o agente não recebeu o pedido
    else if (f.saw && r.st === 'wait' && f.base !== null) clearClosed(tab);
  } else if (f.step === 'clearing' && Date.now() - f.t0 > 12000) { r.flow = null; renderRail(); }
}

// heurística de reserva: sem saída por 2,5 s = aguardando você. Com hooks, só cobre o caso de interrupção
// (Esc não dispara o Stop): 20 s de silêncio total.
setInterval(() => {
  for (const { p, tab } of aliveTabs()) {
    const r = RT[tab.id];
    clearTick(tab);
    const quiet = r.hooks ? 20000 : 2500;
    if (r.st === 'work' && Date.now() - r.lastData > quiet && Date.now() - r.spawnAt > 2500) {
      setSt(tab, 'wait');
      notifyTab(p, tab, 'done', 'Terminou · aguarda você');
    }
  }
}, 700);
setInterval(renderAct, 30000);

/* ---------- modal ---------- */
function modal({ title, body = '', buttons = [['Cancelar', null], ['OK', 'ok', 'pri']], onOpen }) {
  return new Promise((resolve) => {
    const root = $('#modalRoot');
    const prevFocus = document.activeElement;
    root.innerHTML = `<div class="modal"><div class="dlg glass" role="dialog" aria-modal="true"><h2>${title}</h2>${body}<div class="foot2">${buttons.map(([l, , c], i) => `<button class="btn ${c || ''}" data-mb="${i}">${l}</button>`).join('')}</div></div></div>`;
    const collect = () => { const f = {}; root.querySelectorAll('[data-f]').forEach((i) => { f[i.dataset.f] = i.value; }); return f; };
    const done = (v) => { const form = collect(); const picked = [...root.querySelectorAll('[data-sid]:checked')].map((i) => i.dataset.sid); root.innerHTML = ''; resolve({ value: v, form, picked }); fitActive(); try { if (prevFocus && prevFocus.isConnected && prevFocus.focus) prevFocus.focus(); } catch { /* sem foco para devolver */ } };
    root.querySelectorAll('[data-mb]').forEach((b) => { b.onclick = () => done(buttons[+b.dataset.mb][1]); });
    root.firstElementChild.onclick = (e) => { if (e.target === root.firstElementChild) done(null); };
    root.onkeydown = (e) => {
      if (e.key === 'Escape') done(null);
      if (e.key === 'Enter' && e.target.tagName === 'INPUT') done(buttons[buttons.length - 1][1]);
    };
    if (onOpen) onOpen(root);
    const first = root.querySelector('input[type=text]');
    if (first) { first.focus(); first.select(); }
    else { const pb = root.querySelector('.foot2 .btn.pri') || root.querySelector('.foot2 .btn:last-child'); if (pb) pb.focus(); } // sem campo de texto: foco no botão principal (Escape/Enter não vazam para o terminal)
  });
}

/* ---------- atualização do app (TASK-035) ---------- */
// O app baixa a versão nova em segundo plano. Pronta: aparece este aviso; "Depois" o guarda no botão "Atualizar" do cabeçalho.
let UPD = { state: 'idle' };
let APP_VER = ''; // versão instalada, mostrada ao lado do nome no cabeçalho (TASK-070)
let updCard = null, updShownFor = '';
function hideUpdCard() { if (updCard) updCard.classList.remove('show'); }
function showUpdCard() {
  if (!updCard) {
    updCard = document.createElement('div');
    updCard.id = 'updcard';
    updCard.addEventListener('click', (e) => {
      const b = e.target.closest('[data-updc]'); if (!b) return;
      hideUpdCard();
      if (b.dataset.updc === 'go') applyUpdate();
    });
    document.body.appendChild(updCard);
  }
  const swap = UPD.mode === 'swap';
  updCard.innerHTML = `<div class="ut"><span class="ui">${ic('download', 18)}</span><div><b>Termix ${esc(UPD.version || '')} pronto</b><span>${swap ? 'A atualização foi preparada sem interromper o seu trabalho. Reinicie quando quiser: o Termix fecha e abre de novo em poucos segundos, e as abas voltam sozinhas. Se preferir, é só fechar e abrir o app depois.' : 'O Termix fecha, atualiza e abre de novo. Os terminais voltam sozinhos.'}</span></div></div>
    <div class="ua"><button class="btn sm" data-updc="later">Depois</button><button class="btn sm pri" data-updc="go">${swap ? 'Reiniciar agora' : 'Atualizar agora'}</button></div>`;
  updCard.classList.remove('show'); void updCard.offsetWidth; updCard.classList.add('show');
}
async function applyUpdate() {
  const working = aliveTabs().filter((x) => stOf(x.tab) === 'work').length;
  if (working) {
    const r = await modal({ title: 'Há agente trabalhando', body: `<p class="hint">${working === 1 ? '1 terminal está' : `${working} terminais estão`} trabalhando. Atualizar agora interrompe ${working === 1 ? 'ele' : 'eles'}. Quer atualizar mesmo assim?</p>`, buttons: [['Esperar', null], ['Atualizar mesmo assim', 'ok', 'pri']] });
    if (r.value !== 'ok') return;
  }
  showUpdBusy(UPD.version);
  api.updateInstall();
}

// TASK-050: cartão por cima da janela entre o clique em Atualizar e o fechamento do app (o main espera ~2,5 s)
function showUpdBusy(v) {
  let el = $('#updbusy');
  if (!el) { el = document.createElement('div'); el.id = 'updbusy'; document.body.appendChild(el); }
  el.innerHTML = UPD.mode === 'swap'
    ? `<div class="ub"><i class="spin"></i><b>Reiniciando o Termix${v ? ' na versão ' + esc(v) : ''}…</b><span>O app fecha e abre de novo sozinho em poucos segundos. Não abra o Termix de novo, ele volta sozinho.</span><span>Suas conversas ficam guardadas e as abas voltam sozinhas.</span></div>`
    : `<div class="ub"><i class="spin"></i><b>Atualizando o Termix${v ? ' para a versão ' + esc(v) : ''}…</b><span>O app vai fechar e abrir de novo sozinho. Pode levar alguns minutos, e durante esse tempo não aparece nenhuma janela: não abra o Termix de novo, ele volta sozinho.</span><span>Suas conversas ficam guardadas e as abas voltam sozinhas.</span></div>`;
  el.classList.add('show');
}
const fmtMs = (ms) => { const s = Math.round(ms / 1000); return s < 60 ? s + ' s' : Math.floor(s / 60) + ' min ' + String(s % 60).padStart(2, '0') + ' s'; };
function showUpdated(j) {
  let el = $('#updok');
  if (!el) { el = document.createElement('div'); el.id = 'updok'; document.body.appendChild(el); el.addEventListener('click', () => el.classList.remove('show')); }
  el.innerHTML = `<div class="ut"><span class="ui">${ic('check', 18)}</span><div><b>Termix atualizado para a versão ${esc(j.to)}</b><span>Estava na ${esc(j.from)}. Da hora em que você clicou em Atualizar até o app voltar levou ${fmtMs(j.ms)}${j.closedMs ? ` (o app ficou fechado por ${fmtMs(j.closedMs)}${j.installerMs ? `: ${fmtMs(j.beforeMs)} até o instalador começar, ${fmtMs(j.installerMs)} instalando e ${fmtMs(j.afterMs)} até a janela voltar` : ''})` : ''}.</span></div></div>`;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 14000);
}
function onUpdateState(s) {
  UPD = s || { state: 'idle' };
  if (UPD.state === 'ready' && updShownFor !== UPD.version) { updShownFor = UPD.version; showUpdCard(); }
  if (UPD.state !== 'ready') hideUpdCard();
  if (!patchUpdChip()) renderTop();
}

// TASK-069: chip no cabeçalho com a barrinha (baixando → preparando → pronto), sem tirar a pessoa do que está fazendo
function updChipHTML() {
  const st = UPD.state, v = esc(UPD.version || '');
  if (st === 'downloading' || st === 'preparing') {
    const p = Math.max(0, Math.min(100, Math.round(UPD.percent || 0)));
    return `<div class="updchip" id="updchip" data-st="${st}" title="${st === 'downloading' ? 'Baixando' : 'Preparando'} a versão ${v} em segundo plano; você pode continuar usando o Termix"><i class="uic"></i><span class="ult">${st === 'downloading' ? 'Baixando' : 'Preparando'} ${v}</span><span class="ubar"><i style="width:${p}%"></i></span><span class="upc">${p}%</span></div>`;
  }
  if (st === 'ready') {
    const swap = UPD.mode === 'swap';
    return `<div class="updchip ready" id="updchip" data-st="ready"><i class="uic"></i><span class="ult">${swap ? 'Termix ' + v + ' pronto' : 'Nova versão ' + v}</span><button class="updbtn" data-upd="go" title="${swap ? 'Reiniciar o Termix para usar a versão ' + v : 'Atualizar e reabrir o Termix'}">${ic('download', 15)}${swap ? 'Reiniciar agora' : 'Atualizar'}</button></div>`;
  }
  return '';
}
function patchUpdChip() {
  const el = $('#updchip');
  if (!el || el.dataset.st !== UPD.state || (UPD.state !== 'downloading' && UPD.state !== 'preparing')) return false;
  const p = Math.max(0, Math.min(100, Math.round(UPD.percent || 0)));
  const b = el.querySelector('.ubar i'), t = el.querySelector('.upc');
  if (b) b.style.width = p + '%';
  if (t) t.textContent = p + '%';
  topLast = '';
  return true;
}

/* ---------- peças de renderização ---------- */
function barHTML(pct, w) {
  const c = pct >= 90 ? 'var(--bad)' : pct >= 70 ? 'var(--warn)' : 'var(--ok)';
  return `<span class="bar" ${w ? `style="width:${w}px"` : ''}><i style="width:${Math.min(100, pct)}%;background:${c}"></i></span>`;
}
const pctClass = (p) => (p >= 90 ? 'r' : p >= 70 ? 'y' : 'g');
function fmtReset(epoch) {
  const s = Math.max(0, epoch - Math.floor(Date.now() / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return d ? `${d}d${h}h` : h ? `${h}h${String(m).padStart(2, '0')}m` : `${m}m`;
}
const liveWin = (d) => d && d.resets * 1000 > Date.now();

/* ---------- rail: informações da sessão ativa (no lugar da status line do terminal) ---------- */
const RAIL_DEF = { v: 2, on: true, reserve: false, fade: true, meta: false, ctx: true, h5: true, d7: true, cache: true, footFade: false }; // v: versão dos padrões (ao subir, as escolhas salvas voltam ao padrão novo)
const railCfg = () => S.settings.rail || RAIL_DEF;
function fmtDur(secs) { // 45s, 12m, 4h38m, 5d18h
  secs = Math.max(0, Math.floor(secs));
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h${String(m % 60).padStart(2, '0')}m`;
  return `${Math.floor(h / 24)}d${String(h % 24).padStart(2, '0')}h`;
}
function fmtTok(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`.replace('.0M', 'M');
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}
UI.br = {}; // branch git por pasta
function railBranch(p) {
  const b = UI.br[p.path];
  if (!b || Date.now() - b.t > 20000) {
    UI.br[p.path] = { t: Date.now(), v: b ? b.v : '' };
    api.gitBranch(p.path).then((v) => { const changed = !UI.br[p.path] || UI.br[p.path].v !== v; UI.br[p.path] = { t: Date.now(), v }; if (changed) renderRail(); });
  }
  return (UI.br[p.path] || {}).v || '';
}

const RING_C = 113.1; // circunferência do anel (r = 18)
// anel de progresso: pct = % preenchido (null = sem dado); fill = quanto do anel desenhar (padrão = pct); cls = cor forçada (g/y/r)
function ring(lbl, pct, center, tipTitle, tipSub, { sm = false, fill = pct, cls } = {}) {
  const c = cls || (pct === null ? '' : pct >= 90 ? 'r' : pct >= 70 ? 'y' : 'g');
  const col = c === 'r' ? 'var(--bad)' : c === 'y' ? 'var(--warn)' : 'var(--ok)';
  const arc = fill === null ? '' : `<circle class="v" cx="22" cy="22" r="18" style="stroke:${col}" stroke-dasharray="${RING_C}" stroke-dashoffset="${(RING_C * (1 - Math.min(100, Math.max(0, fill)) / 100)).toFixed(1)}"/>`;
  return `<div class="ring"><svg viewBox="0 0 44 44"><circle class="t" cx="22" cy="22" r="18"/>${arc}</svg><span class="n ${c} ${sm ? 'sm' : ''} ${pct === null ? 'na' : ''}">${center}</span><small>${lbl}</small><div class="tip"><b>${esc(tipTitle)}</b>${esc(tipSub)}</div></div>`;
}

function railHTML(p, tab) {
  const m = MET[tab.id] || {};
  const noData = 'sem dados ainda (aparecem depois da primeira resposta)';
  const win = (lbl, d, title) => (liveWin(d)
    ? ring(lbl, d.pct, Math.round(d.pct), `${title} · ${Math.round(d.pct)}%`, `renova em ${fmtDur(d.resets - Date.now() / 1000)}`)
    : ring(lbl, null, '—', title, noData));

  // contexto
  const cw = m.context_window || {};
  const cp = typeof cw.used_percentage === 'number' ? cw.used_percentage : null;
  const rc = (RT[tab.id] || {}).cost; // última retomada medida: base (CLAUDE.md, plugins, skills) e custo
  const cost = rc && rc.phase === 'done' && rc.after !== null ? ` · ${rc.base !== null ? `base ${fmtTok(rc.base)}, retomada custou ~${fmtTok(Math.max(0, rc.after - rc.base))}` : `após a retomada ${fmtTok(rc.after)}`}` : '';
  const ctx = cp !== null
    ? ring('CTX', cp, Math.round(cp), `Contexto · ${Math.round(cp)}%`, (cw.total_input_tokens ? `${fmtTok(cw.total_input_tokens)}${cw.context_window_size ? ` de ${fmtTok(cw.context_window_size)}` : ''} tokens` : 'desta conversa') + cost)
    : ring('CTX', null, '—', 'Contexto', noData);

  // cache de prompt: tempo até esfriar (o TTL vem do Claude Code: 1 h na assinatura, 5 min com créditos extras ou chave de API).
  // O anel mostra o tempo que resta (cheio = recém-escrito).
  const pc = m.prompt_cache;
  let cache;
  if (!pc || pc.caching_observed === false) cache = ring('CACHE', null, '—', 'Cache do prompt', 'sem informação ainda nesta conversa');
  else {
    const ttl = pc.ttl || '5m', ttlS = ttl === '1h' ? 3600 : 300;
    const rem = pc.expires_at ? pc.expires_at - Date.now() / 1000 : 0;
    if (!pc.warm || rem <= 0) {
      cache = ring('CACHE', 0, 'frio', 'Cache do prompt · frio', pc.recache_tokens_if_cold ? `a próxima mensagem reescreve ${fmtTok(pc.recache_tokens_if_cold)} tokens` : 'a próxima mensagem reescreve o contexto', { sm: true, fill: 0, cls: 'r' });
    } else {
      const left = rem < 600 ? `${Math.floor(rem / 60)}:${String(Math.floor(rem % 60)).padStart(2, '0')}` : fmtDur(rem);
      const frac = rem / ttlS * 100;
      cache = ring('CACHE', 0, left, `Cache do prompt · ${left}`, `de ${ttl} de validade${pc.estimated ? ' (estimado pelo histórico)' : ''}`, { sm: true, fill: frac, cls: frac > 20 ? 'g' : 'y' });
    }
  }
  const rcfg = railCfg(); // cada anel pode ser ligado ou desligado (Configurações ou engrenagem do rodapé)
  return `${rcfg.ctx !== false ? ctx : ''}${rcfg.h5 !== false ? win('5H', UI.limits && UI.limits.five, 'Limite de 5 horas') : ''}${rcfg.d7 !== false ? win('7D', UI.limits && UI.limits.week, 'Limite semanal') : ''}${rcfg.cache !== false ? cache : ''}`;
}

function railMetaHTML(p, tab) {
  const m = MET[tab.id] || {};
  const model = (m.model && m.model.display_name) || '';
  const br = railBranch(p);
  const perm = tab.perm === 'd' ? '<span class="w" title="Esta aba ignora as verificações de permissão">⚠ bypass</span>' : '<span>permissões normais</span>';
  return `${model ? `<span class="m">${esc(model)}</span> · ` : ''}${esc(p.name)}${br ? ` · <span class="b">${esc(br)}</span>` : ''} · ${perm}`;
}

// atualiza o conteúdo de um elemento só onde o HTML novo difere (não recria os nós: o tooltip aberto não pisca a cada segundo)
function morph(a, b) {
  const an = [...a.childNodes], bn = [...b.childNodes];
  bn.forEach((y, i) => {
    const x = an[i];
    if (!x) { a.appendChild(y.cloneNode(true)); return; }
    if (x.nodeType !== y.nodeType || x.nodeName !== y.nodeName) { a.replaceChild(y.cloneNode(true), x); return; }
    if (x.nodeType === 3) { if (x.nodeValue !== y.nodeValue) x.nodeValue = y.nodeValue; return; }
    for (const at of [...x.attributes]) if (!y.hasAttribute(at.name)) x.removeAttribute(at.name);
    for (const at of y.attributes) if (x.getAttribute(at.name) !== at.value) x.setAttribute(at.name, at.value);
    morph(x, y);
  });
  while (a.childNodes.length > bn.length) a.removeChild(a.lastChild);
}
function setHTML(el, html) { const t = document.createElement('div'); t.innerHTML = html; morph(el, t); }

let railLast = '', metaLast = '';
function renderRail() {
  const p = curProject(), tab = p && curTab(p);
  if (typeof dockRefresh === 'function') dockRefresh();
  const show = mode() === 'term' && !!tab;
  const cfg = railCfg();
  $('#rail').classList.toggle('hide', !(show && cfg.on));
  $('#rmeta').classList.toggle('hide', !(show && cfg.on && cfg.meta));
  $('#sess').classList.toggle('reserve', show && cfg.on && cfg.reserve);
  if (!show) { railLast = ''; metaLast = ''; return; }
  const rail = $('#rail');
  const menuOpen = !!(UI.menu && UI.menu.type === 'rail');
  rail.classList.toggle('off', !cfg.on);
  rail.classList.toggle('fade', cfg.on && cfg.fade);
  rail.classList.toggle('menuopen', menuOpen);
  document.querySelectorAll('[data-railmenu]').forEach((b) => b.classList.toggle('on', menuOpen));
  $('#rinfo').style.display = cfg.on ? '' : 'none';
  const html = cfg.on ? railHTML(p, tab) : '';
  if (html !== railLast) { railLast = html; setHTML($('#rinfo'), html); }
  if (cfg.on && cfg.meta) { const mh = railMetaHTML(p, tab); if (mh !== metaLast) { metaLast = mh; setHTML($('#rmeta'), mh); } }
}
setInterval(renderRail, 1000); // contagem regressiva do cache; só troca o HTML quando o texto muda

function mode() {
  if (UI.cur.p === '_') return 'page';
  const p = curProject();
  if (!p) return 'empty';
  if (UI.cur.page !== 'Terminais') return 'page';
  if (UI.surface === 'web') return 'web'; // navegador embutido (TASK-022)
  return curTab(p) ? 'term' : 'noterm';
}

let topLast = ''; // último HTML do cabeçalho (TASK-072)
function renderTop() {
  const L = UI.limits;
  const lim = (lbl, d) => `<div class="lim"><span class="lb">${lbl}</span>${liveWin(d) ? `${barHTML(d.pct, 78)}<b class="${pctClass(d.pct)}">${Math.round(d.pct)}%</b><span class="rn" title="Renova em ${fmtReset(d.resets)}">${ic('clock', 12)}${fmtReset(d.resets)}</span>` : `${barHTML(0, 78)}<span class="na">indisponível</span>`}</div>`;
  const age = L ? Math.floor((Date.now() - L.updated) / 60000) : null;
  const fresh = !L ? 'none' : age >= 10 ? 'stale' : 'ok';
  const upd = !L ? 'Sem dados ainda — aparecem depois da primeira resposta de uma sessão' : age >= 10 ? `Desatualizado · última leitura ${ago(L.updated)}` : `Atualizado ${ago(L.updated)}`;
  const maxIcon = UI.maxed
    ? '<rect x="7" y="9" width="10" height="10" rx="1.5"/><path d="M9.5 9V7a1.5 1.5 0 0 1 1.5-1.5h6A1.5 1.5 0 0 1 18.5 7v6A1.5 1.5 0 0 1 17 14.5h-2"/>'
    : '<rect x="5.5" y="5.5" width="13" height="13" rx="1.8"/>';
  const topHtml = `<div class="brand"><img class="logo" src="../../assets/logo-mark.svg" alt="">Termix<span class="ver" title="Versão instalada do Termix">${APP_VER ? 'v' + esc(APP_VER) : ''}</span></div><span class="sp"></span>
    ${railCfg().on ? '' : `<div class="lims" data-lim title="${upd}">${lim('5h', L && L.five)}<span class="lsep"></span>${lim('7d', L && L.week)}<span class="lsep"></span><i class="fresh ${fresh}"></i></div>`}
    <span class="sp"></span>
    ${updChipHTML()}
    <button class="tbtn round ${UI.actOpen ? 'on' : ''}" data-togact title="Notificações">${ic('bell', 18)}${pending() ? `<span class="nb">${pending()}</span>` : ''}</button>
    <div class="wc">
      <button data-win="min" title="Minimizar">${ic('minus', 16)}</button>
      <button data-win="max" title="${UI.maxed ? 'Restaurar' : 'Maximizar'}"><svg class="i" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">${maxIcon}</svg></button>
      <button class="close" data-win="close" title="Fechar">${ic('x', 16)}</button>
    </div>`;
  if (topHtml !== topLast) { topLast = topHtml; $('#topbar').innerHTML = topHtml; }
}

// dica de nome dos ícones da barra lateral recolhida (TASK-067)
let sideTipEl = null;
function hideSideTip() { if (sideTipEl) sideTipEl.classList.remove('show'); }
function showSideTip(el) {
  if (!sideTipEl) { sideTipEl = document.createElement('div'); sideTipEl.id = 'sidetip'; document.body.appendChild(sideTipEl); }
  sideTipEl.textContent = el.dataset.tip;
  const r = el.getBoundingClientRect();
  sideTipEl.style.left = `${Math.round(r.right + 10)}px`;
  sideTipEl.style.top = `${Math.round(r.top + r.height / 2)}px`;
  sideTipEl.classList.add('show');
}
document.addEventListener('mouseover', (e) => {
  const el = e.target.closest && e.target.closest('.side.mini [data-tip]');
  if (el) showSideTip(el); else hideSideTip();
});
document.addEventListener('mouseleave', hideSideTip);
document.addEventListener('mousedown', hideSideTip, true);
document.addEventListener('scroll', hideSideTip, true);

function renderSide() {
  hideSideTip(); // a barra é redesenhada: o ícone sobre o qual estava o mouse pode ter saído
  const col = S.settings.sideCollapsed;
  const side = $('#side');
  side.classList.toggle('mini', col);
  const ps = visibleProjects();
  const cp = curProject();
  const isCur = (p, n) => UI.cur.p === p && UI.cur.page === n;
  const toggle = `<button class="tbtn" data-togside title="${col ? 'Abrir' : 'Fechar'} barra lateral">${ic('panel', 19)}</button>`;
  if (col) {
    side.innerHTML = toggle + `<span class="rsep"></span>` + ps.map((p) => {
      const g = GRADS[(p.g || 0) % GRADS.length];
      const n = openTabs(p).length;
      const work = openTabs(p).some((t) => stOf(t) === 'work');
      const wait = openTabs(p).some((t) => stOf(t) === 'wait');
      const att = openTabs(p).some((t) => RT[t.id] && RT[t.id].unread);
      const dotc = att ? 'var(--warn)' : work ? 'var(--work)' : wait ? 'var(--ok)' : '';
      const letter = esc(p.name.trim()[0] ? p.name.trim()[0].toUpperCase() : '?');
      return `<button class="av ${UI.cur.p === p.id ? 'active' : ''}" style="--c1:${g[0]};--c2:${g[1]}" data-go="${p.id}|${UI.cur.p === p.id ? UI.cur.page : 'Terminais'}" data-tip="${esc(p.name)}">${letter}${n ? `<span class="b">${n}</span>` : ''}${dotc ? `<span class="st" style="background:${dotc}"></span>` : ''}</button>`
        + (cp && cp.id === p.id ? SUBS.map(([n, i]) => `<button class="ci sub ${isCur(p.id, n) ? 'active' : ''}" data-go="${p.id}|${n}" data-tip="${n}">${ic(i, 17)}</button>`).join('') : '');
    }).join('')
      + `<button class="ci add" data-newproj data-tip="Novo projeto">${ic('plus', 17)}</button><span class="sp"></span><span class="rsep"></span>`
      + GLOBALS.map(([n, i]) => `<button class="ci ${isCur('_', n) ? 'active' : ''}" data-go="_|${n}" data-tip="${n}">${gIc(i, 19)}</button>`).join('');
    return;
  }
  side.innerHTML = `<div class="shead2"><span class="label">Projetos</span>${toggle}</div>
    ${ps.map((p) => `<div class="proj ${p.open !== false ? 'open' : ''}">
      <div class="prow"><button class="ph" data-ph="${p.id}"><span class="chev">${ic('chevr', 12)}</span>${esc(p.name)}</button><button class="pm" data-pmenu="${p.id}" title="Gerenciar projeto">${ic('dots', 16)}</button></div>
      <div class="subs">${SUBS.map(([n, i]) => `<button class="item ${isCur(p.id, n) ? 'active' : ''}" data-go="${p.id}|${n}"><span class="ico">${ic(i, 17)}</span>${n}${n === 'Terminais' && openTabs(p).length ? `<span class="cnt ${openTabs(p).some((t) => RT[t.id] && RT[t.id].unread) ? 'att' : ''}">${openTabs(p).length}</span>` : ''}</button>`).join('')}</div></div>`).join('')}
    <button class="newproj" data-newproj>+ Novo projeto</button>
    <span class="sp"></span>
    <div class="label">Geral</div>
    ${GLOBALS.map(([n, i]) => `<button class="item ${isCur('_', n) ? 'active' : ''}" data-go="_|${n}"><span class="ico">${gIc(i, 17)}</span>${n}</button>`).join('')}`;
}

// mede a aba ativa e deixa a barra sem o fundo escuro atrás dela (com as duas orelhas), para ela se fundir ao terminal
function fuseBar(bar, dx = 0) {
  if (!bar) return;
  const t = bar.querySelector('.tab.active');
  if (!t) { for (const k of ['--al', '--ar', '--tl', '--tr']) bar.style.removeProperty(k); return; }
  const l = t.offsetLeft + dx, r = l + t.offsetWidth;
  bar.style.setProperty('--tl', l + 'px'); bar.style.setProperty('--tr', r + 'px');
  bar.style.setProperty('--al', (l - 8) + 'px'); bar.style.setProperty('--ar', (r + 8) + 'px');
}
if (typeof ResizeObserver !== 'undefined') window.addEventListener('DOMContentLoaded', () => { for (const id of ['tabsRow', 'wtabs']) { const el = document.getElementById(id); if (el) new ResizeObserver(() => fuseBar(el)).observe(el); } });
function renderTabs() {
  if (UI.tabDragging) return; // redesenhar no meio do arraste soltaria a aba do mouse; o soltar refaz
  const p = curProject();
  if (!p || mode() !== 'term') { $('#tabsRow').innerHTML = ''; $('#sess').classList.remove('working'); $('#tabsRow').classList.remove('working'); return; }
  const cur = curTab(p);
  const closed = p.tabs.filter((t) => !t.open && !t.archived).length;
  const st = stOf(cur), [sc, sl] = STATES[st];
  if (document.hasFocus() && RT[cur.id]) RT[cur.id].unread = null; // a aba à vista, com o app em foco, já foi vista
  $('#sess').style.setProperty('--tc', cur.color);
  $('#sess').classList.toggle('working', st === 'work');
  $('#tabsRow').classList.toggle('working', st === 'work');
  $('#tabsRow').innerHTML = openTabs(p).map((t) => `<button class="tab ${t.id === cur.id ? 'active' : ''}" style="--c:${t.color}" data-tab="${t.id}" title="${esc(t.name)} · ${STATES[stOf(t)][1]} — clique duplo para renomear ou mudar a cor"><i class="dot ${STATES[stOf(t)][0]}"></i><span class="nm">${esc(t.name)}</span>${RT[t.id] && RT[t.id].unread ? `<span class="bd bd-${RT[t.id].unread}" title="${KIND_TITLE[RT[t.id].unread]}"></span>` : ''}<span class="x" data-x="${t.id}">${ic('x', 13)}</span></button>`).join('')
    + `<button class="plus" data-newtab="${chatNewKey()}" title="${chatCfg().mode === 'chat' ? 'Novo chat (Claude Code)' : 'Novo terminal (Claude Code)'}">${ic('plus', 17)}</button><button class="plus chev2" data-menu="new" title="Escolher a ferramenta">${ic('chevd', 14)}</button>
    <span class="sp"></span>
    <div class="tctl">
      ${closed ? `<button class="linkbtn" data-closedlist>Fechadas (${closed})</button>` : ''}
      <span class="state"><i class="dot ${sc}"></i>${sl}</span>
    </div>`;
  fuseBar($('#tabsRow'));
}

function emptyHTML() {
  return `<div class="empty"><h2>Comece criando um projeto</h2><p>O Termix cria a pasta do projeto para você, ou registra uma pasta que você já tem — sem copiar nem mover nada.</p>
    <div class="row2"><button class="btn pri" data-newproj>Novo projeto</button><button class="btn" data-import>Importar pasta existente</button></div></div>`;
}
const ptitle = (t) => `<div class="ptitle"><span>${UI.cur.p === '_' ? 'Geral' : esc(curProject().name)} ›</span> ${t}</div>`;

/* ---------- plugins, skills e MCPs (TASK-013: ver tudo e controlar) ---------- */
const RES_PAGES = ['Plugins', 'Skills', 'MCPs'];
const RES_SCOPES = { Plugins: ['Usuário', 'Projeto', 'Local', 'Sincronizado'], Skills: ['Usuário', 'Projeto', 'Plugin'], MCPs: ['Conta', 'Usuário', 'Projeto', 'Local', 'Plugin'] };
const RES_STATES = { Plugins: [['on', 'Ligados'], ['off', 'Desligados']], Skills: [], MCPs: [['ok', 'Conectados'], ['issue', 'Com problema'], ['off', 'Desligados']] };
const PL_SCOPE = { user: 'Usuário', project: 'Projeto', local: 'Local', synced: 'Sincronizado' };
const RESC = {}; // por projeto: plugins e estado dos MCPs lidos pela CLI (aparecem na hora e atualizam por trás) e aviso de reinício
const safeTarget = (t) => (!t ? '' : /^https?:/i.test(t) ? t.replace(/[?#].*$/, '') : t.split(/\s+/)[0]); // sem argumentos (podem ter chaves)
const fmtTokPt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')} mil` : String(n)); // preciso, para somar custos
const resNoun = (kind, n) => (kind === 'MCPs' ? (n === 1 ? 'MCP' : 'MCPs') : n === 1 ? kind.slice(0, -1).toLowerCase() : kind.toLowerCase());
const plShort = (id) => String(id || '').split('@')[0];

function resEnsure(kind) {
  const p = curProject();
  if (!UI.res || UI.res.pid !== p.id) UI.res = { pid: p.id, files: null, filesJson: '', q: '', scope: '', st: '', busy: '', msg: null, byKey: {} };
  const r = UI.res;
  if (!r.files && !r.loadingFiles) { r.loadingFiles = true; api.scan(p.path).then((d) => { r.loadingFiles = false; r.files = d; r.filesJson = JSON.stringify(d); repaintRes(); }); }
  if (kind === 'Plugins') resLoadPlugins(p, false);
  if (kind === 'MCPs') resLoadMcp(p, false);
}
// leituras pela CLI: devolvem a promessa (a ação espera a lista nova); uma leitura em andamento não é duplicada
function resLoadPlugins(p, force) {
  const c = RESC[p.id] || (RESC[p.id] = {});
  const go = () => { c.plLoading = true; c.plP = api.scanPlugins(p.path).then((d) => { c.pl = d; c.plAt = Date.now(); }).finally(() => { c.plLoading = false; c.plP = null; repaintRes(); }); return c.plP; };
  if (c.plP) return force ? c.plP.then(go) : c.plP;
  return c.pl && !force ? Promise.resolve() : go();
}
function resLoadMcp(p, force) {
  const c = RESC[p.id] || (RESC[p.id] = {});
  const go = () => { c.mcpLoading = true; c.mcpP = api.scanMcpStatus(p.path).then((d) => { c.mcp = d; c.mcpAt = Date.now(); }).finally(() => { c.mcpLoading = false; c.mcpP = null; repaintRes(); }); return c.mcpP; };
  if (c.mcpP) return force ? c.mcpP.then(go) : c.mcpP;
  return c.mcp && !force ? Promise.resolve() : go();
}

// itens de cada tela, já no formato comum { key, raw, search, scope, st, html }
function resItems(kind) {
  const r = UI.res, c = RESC[r.pid] || {};
  const tag = (txt, k = '') => `<span class="tag ${k}">${esc(txt)}</span>`;
  const btn = (act, key, label, cls = '') => `<button class="btn sm ${cls}" data-ract="${act}" data-rk="${esc(key)}">${label}</button>`;
  const files = r.files || { skills: [], mcps: [], disabledMcps: [] };
  if (kind === 'Plugins') {
    if (!c.pl) return null;
    return c.pl.plugins.map((x) => {
      const key = 'pl:' + x.id;
      const inv = [x.skills.length && `${x.skills.length} skill${x.skills.length > 1 ? 's' : ''}`, x.agents && `${x.agents} agente${x.agents > 1 ? 's' : ''}`, x.hooks.length && `${x.hooks.length} hook${x.hooks.length > 1 ? 's' : ''}`, x.mcps.length && `${x.mcps.length} MCP${x.mcps.length > 1 ? 's' : ''}`].filter(Boolean).join(' · ') || 'sem componentes';
      return { key, raw: x, search: `${x.name} ${x.marketplace} ${x.desc} ${x.skills.join(' ')}`, scope: PL_SCOPE[x.scope] || x.scope, st: x.enabled ? 'on' : 'off',
        html: `<div class="card${x.enabled ? '' : ' dim'}"><h5>${esc(x.name)}</h5><p class="rmeta">${esc(x.marketplace)} · v${esc(String(x.version).slice(0, 12))}</p>${x.desc ? `<p class="rdesc">${esc(x.desc)}</p>` : ''}<p class="rmeta">${esc(inv)}</p>${x.skills.length ? `<p class="rmeta" title="${esc(x.skills.join(', '))}">Skills: ${esc(x.skills.slice(0, 6).join(', '))}${x.skills.length > 6 ? '…' : ''}</p>` : ''}
          <div class="tags">${tag('Escopo: ' + (PL_SCOPE[x.scope] || x.scope))}${tag(x.enabled ? 'Ligado' : 'Desligado', x.enabled ? 'ok' : 'warn')}${typeof x.alwaysOn === 'number' ? `<span class="tag" title="Custo estimado, em todo início de sessão, enquanto o plugin estiver ligado">~${fmtTokPt(x.alwaysOn)} tokens/sessão</span>` : ''}${x.notes.length ? `<span class="tag warn" title="${esc(x.notes.join(' '))}">Aviso</span>` : ''}</div>
          <div class="acts">${btn('pl-toggle', key, x.enabled ? 'Desligar aqui' : 'Ligar aqui', x.enabled ? '' : 'pri')}${btn('pl-manage', key, 'Gerenciar…')}</div></div>` };
    });
  }
  if (kind === 'Skills') {
    return files.skills.map((x) => {
      const key = `sk:${x.scope}:${x.kind}:${x.name}:${x.origin}`;
      const nm = x.scope === 'Plugin' ? `${plShort(x.origin)}:${x.name}` : x.name;
      const own = x.scope === 'Usuário' || x.scope === 'Projeto';
      return { key, raw: x, search: `${x.name} ${x.desc} ${x.origin}`, scope: x.scope, st: '',
        html: `<div class="card${x.off ? ' dim' : ''}"><h5>/${esc(nm)}</h5>${x.desc ? `<p class="rdesc">${esc(x.desc)}</p>` : '<p class="rmeta">Sem descrição.</p>'}
          <div class="tags">${tag('Escopo: ' + x.scope + (x.scope === 'Plugin' ? ' · ' + plShort(x.origin) : ''))}${tag(x.kind === 'skill' ? 'Skill' : 'Comando')}${x.off ? tag('Plugin desligado', 'warn') : ''}</div>
          <div class="acts">${own ? btn('sk-edit', key, 'Editar') + btn('sk-del', key, 'Excluir', 'bad') : '<span class="rmeta">Faz parte do plugin; para desligar, desligue o plugin.</span>'}</div></div>` };
    });
  }
  // MCPs: o estado real (CLI) manda; os arquivos dão o escopo e a origem e dizem o que está desligado neste projeto
  const live = c.mcp && c.mcp.items;
  const offSet = new Set(files.disabledMcps || []);
  const findCfg = (n) => files.mcps.find((f) => f.name === n || (f.scope === 'Plugin' && n.endsWith(':' + f.name) && n.includes(plShort(f.origin))));
  const rows = [];
  for (const it of live || []) {
    const f = findCfg(it.name);
    const scope = f ? f.scope : /^claude\.ai /.test(it.name) ? 'Conta' : /^plugin:/.test(it.name) ? 'Plugin' : 'Usuário';
    rows.push({ name: it.name, scope, origin: f ? f.origin : '', type: f ? f.type : '', target: it.target, kind: it.kind, label: it.label, detail: it.detail });
  }
  for (const f of files.mcps) {
    if (live && rows.some((x) => findCfg(x.name) === f)) continue;
    rows.push({ name: f.name, scope: f.scope, origin: f.origin, type: f.type, target: f.target, kind: '', label: live ? 'Sem leitura de estado' : 'Verificando…', detail: '' });
  }
  return rows.map((x) => {
    // os arquivos (lidos a cada poucos segundos) dizem o que está desligado aqui; o "desligado" que vem da CLI pode estar velho
    // logo depois de ligar (a leitura do estado leva alguns segundos) e não vale sozinho, a não ser nos MCPs de plugin
    const off = offSet.has(x.name) || (x.kind === 'off' && x.scope === 'Plugin');
    if (off) { x.kind = 'off'; x.label = 'Desligado neste projeto'; x.detail = ''; }
    else if (x.kind === 'off') { x.kind = ''; x.label = 'Verificando…'; x.detail = ''; }
    const key = 'mcp:' + x.name;
    const ctl = x.scope !== 'Plugin';
    return { key, raw: x, search: `${x.name} ${x.origin} ${x.target}`, scope: x.scope, st: off ? 'off' : x.kind === 'ok' ? 'ok' : x.kind ? 'issue' : '',
      html: `<div class="card${x.kind === 'ok' || !x.kind ? '' : ' dim'}"><h5>${esc(x.name)}</h5>${x.target ? `<p class="rmeta">${esc(safeTarget(x.target))}</p>` : ''}${x.detail ? `<p class="rmeta" title="${esc(x.detail)}">${esc(x.detail.slice(0, 90))}</p>` : ''}
        <div class="tags">${tag('Escopo: ' + x.scope + (x.scope === 'Plugin' && x.origin ? ' · ' + plShort(x.origin) : ''))}${tag(x.label, x.kind === 'off' ? '' : x.kind)}${x.type ? tag(x.type) : ''}</div>
        <div class="acts">${ctl ? btn('mcp-toggle', key, off ? 'Ligar aqui' : 'Desligar aqui', off ? 'pri' : '') : '<span class="rmeta">Vem do plugin; o plugin controla.</span>'}${btn('mcp-manage', key, 'Gerenciar…')}</div></div>` };
  });
}

function resListHTML(kind) {
  const r = UI.res, c = RESC[r.pid] || {};
  if (!r.files && kind !== 'Plugins') return '<div class="empty" style="height:auto">Lendo configurações…</div>';
  const items = resItems(kind);
  if (!items) return `<div class="empty" style="height:auto">${c.pl && c.pl.error ? esc(c.pl.error) : 'Lendo plugins pelo Claude Code…'}</div>`;
  r.byKey = Object.fromEntries(items.map((x) => [x.key, x.raw]));
  const q = r.q.trim().toLowerCase();
  const list = items.filter((x) => (!r.scope || x.scope === r.scope) && (!r.st || x.st === r.st) && (!q || x.search.toLowerCase().includes(q)));
  const one = kind.slice(0, -1).toLowerCase();
  if (!list.length) return `<div class="empty" style="height:auto">${items.length ? 'Nada com esse filtro.' : `Nenhum(a) ${one} encontrado(a) para este projeto.`}</div>`;
  return `<div class="cards">${list.map((x) => x.html).join('')}</div>`;
}
function resMetaText(kind) {
  const r = UI.res, c = RESC[r.pid] || {};
  if (r.busy) return r.busy;
  const items = (r.files || kind === 'Plugins') ? resItems(kind) : null;
  const n = items ? items.length : 0;
  const on = kind === 'Plugins' && c.pl ? c.pl.plugins.filter((x) => x.enabled && typeof x.alwaysOn === 'number') : [];
  const sum = on.length ? ` · ligados custam ~${fmtTokPt(on.reduce((s, x) => s + x.alwaysOn, 0))} tokens por sessão` : '';
  const since = (t) => { const s = Math.round((Date.now() - t) / 1000); return s < 5 ? 'agora' : s < 60 ? `há ${s} s` : `há ${Math.round(s / 60)} min`; };
  let st = '';
  if (kind === 'Plugins') st = c.plLoading ? 'atualizando…' : c.plAt ? `lido pelo Claude Code ${since(c.plAt)}` : '';
  else if (kind === 'MCPs') st = c.mcpLoading ? 'conferindo o estado de cada conector (leva alguns segundos)…' : c.mcpAt ? `estado conferido ${since(c.mcpAt)}` : '';
  else st = 'lido dos arquivos do Claude Code';
  const err = (kind === 'MCPs' && c.mcp && c.mcp.error) ? ` · ${c.mcp.error}` : '';
  return `${items ? `${n} ${resNoun(kind, n)}${kind === 'Plugins' ? sum : ''}${st ? ' · ' : ''}` : ''}${st}${err}`;
}
const resMsgHTML = () => (UI.res && UI.res.msg ? `<div class="resmsg ${UI.res.msg.ok ? 'ok' : 'bad'}">${esc(UI.res.msg.text)}</div>` : '');
const resBannerHTML = () => {
  const c = (UI.res && RESC[UI.res.pid]) || {};
  const p = curProject();
  const t = p && curTab(p);
  return c.restart ? `<div class="note restartnote"><span>Mudança aplicada. Os terminais já abertos deste projeto só passam a ver depois de reiniciar.</span><span class="acts" style="margin:0">${t && t.live ? '<button class="btn sm pri" data-ract="restart-tab">Reiniciar a aba ativa</button>' : ''}<button class="btn sm" data-ract="restart-dismiss">Dispensar</button></span></div>` : '';
};
function repaintRes() {
  const kind = UI.cur.page;
  if (!UI.res || !RES_PAGES.includes(kind) || UI.cur.p !== UI.res.pid || mode() !== 'page') return;
  const l = $('#reslist'), m = $('#resmeta'), g = $('#resmsg'), b = $('#resbanner');
  if (l) l.innerHTML = resListHTML(kind);
  if (m) m.textContent = resMetaText(kind);
  if (g) g.innerHTML = resMsgHTML();
  if (b) b.innerHTML = resBannerHTML();
}

function resPageHTML(kind) {
  resEnsure(kind);
  const r = UI.res;
  const seg = (attr, cur, opts) => `<div class="seg sm">${[['', 'Todos']].concat(opts).map(([v, l]) => `<button ${attr}="${esc(v)}" class="${cur === v ? 'sel' : ''}">${esc(l)}</button>`).join('')}</div>`;
  const A = (act, label, cls = '') => `<button class="btn sm ${cls}" data-ract="${act}">${label}</button>`;
  const actions = kind === 'Plugins' ? A('pl-install', '+ Instalar plugin…', 'pri') + A('pl-all-off', 'Desligar todos aqui') + A('pl-all-on', 'Ligar todos aqui')
    : kind === 'MCPs' ? A('mcp-add', '+ Adicionar MCP…', 'pri') + A('mcp-all-off', 'Desligar todos aqui') + A('mcp-all-on', 'Ligar todos aqui')
      : A('sk-new', '+ Nova skill ou comando…', 'pri');
  const hint = kind === 'MCPs' ? 'inclusive os conectores da sua conta' : kind === 'Plugins' ? 'com o custo estimado em tokens' : 'de usuário, de projeto e de plugins';
  return `<div class="page">${ptitle(kind)}<div class="note">Mostra o mesmo que o Claude Code enxerga neste projeto (${hint}). "Aqui" vale só para este projeto. Tudo o que você muda pela tela pode ser mudado também pelo terminal (e vice-versa), e o app acompanha.</div>
    <div id="resbanner">${resBannerHTML()}</div>
    <div class="restools"><input id="resq" class="resq" type="text" placeholder="Buscar em ${resNoun(kind, 2)}…" value="${esc(r.q)}">${seg('data-resscope', r.scope, RES_SCOPES[kind].map((s) => [s, s]))}${RES_STATES[kind].length ? seg('data-resst', r.st, RES_STATES[kind]) : ''}</div>
    <div class="restools">${actions}<button class="btn sm resrefresh" data-resrefresh>Atualizar</button></div>
    <div id="resmsg">${resMsgHTML()}</div>
    <div class="rmeta" id="resmeta" style="margin:2px 0 4px">${esc(resMetaText(kind))}</div>
    <div id="reslist">${resListHTML(kind)}</div></div>`;
}

/* ---- ações ---- */
// roda uma ação: mostra o andamento, o resultado e recarrega as listas; restart = a mudança só vale depois de reiniciar o terminal
async function resRun(label, fn, restart) {
  const p = curProject();
  const r = UI.res;
  if (!p || !r || r.busy) return null;
  r.busy = label; r.msg = null; repaintRes();
  let out;
  try { out = await fn(); } catch (e) { out = { ok: false, message: String((e && e.message) || e) }; }
  // espera as listas novas antes de liberar a tela, para os cartões já mostrarem o estado novo (o estado dos MCPs vem por trás)
  const onPlugins = UI.cur.page === 'Plugins';
  r.busy = 'Atualizando a lista…'; repaintRes();
  const [d] = await Promise.all([api.scan(p.path), onPlugins ? resLoadPlugins(p, true) : null]);
  if (UI.res === r) { r.files = d; r.filesJson = JSON.stringify(d); }
  resLoadMcp(p, true);
  if (!onPlugins) resLoadPlugins(p, true);
  r.busy = ''; r.msg = { ok: !!out.ok, text: out.message || (out.ok ? 'Feito.' : 'Não deu certo.') };
  const c = RESC[p.id] || (RESC[p.id] = {});
  if (out.ok && restart) c.restart = true;
  repaintRes();
  return out;
}
const PLMSG = (x) => `Remover o plugin "${x.name}"? Ele deixa de existir ${x.scope === 'user' ? 'para todos os seus projetos' : 'no escopo ' + (PL_SCOPE[x.scope] || x.scope)}. Dá para instalar de novo depois.`;

async function resAct(act, key) {
  const p = curProject(), r = UI.res;
  if (!p || !r) return;
  const x = key ? r.byKey[key] : null;
  const run = (op, args) => api.resDo(op, { projectPath: p.path, ...args });
  if (act === 'restart-dismiss') { (RESC[p.id] || {}).restart = false; repaintRes(); return; }
  if (act === 'restart-tab') { const t = curTab(p); (RESC[p.id] || {}).restart = false; repaintRes(); if (t) restartTab(p, t); return; }

  if (act === 'pl-toggle' && x) return resRun(`${x.enabled ? 'Desligando' : 'Ligando'} ${x.name} neste projeto…`, () => run('pluginAction', { action: x.enabled ? 'disable' : 'enable', id: x.id, scope: 'local' }), true);
  if (act === 'pl-all-off' || act === 'pl-all-on') {
    const on = act === 'pl-all-on';
    const ok = await modal({ title: on ? 'Ligar todos os plugins aqui?' : 'Desligar todos os plugins aqui?', body: `<p>${on ? 'Todos os plugins instalados passam a valer' : 'Nenhum plugin vai valer'} <b>só neste projeto</b> (guardado em .claude/settings.local.json, que não vai para o git). Os outros projetos não mudam.</p>`, buttons: [['Cancelar', null], [on ? 'Ligar todos' : 'Desligar todos', 'ok', 'pri']] });
    if (ok.value !== 'ok') return;
    return resRun(`${on ? 'Ligando' : 'Desligando'} os plugins neste projeto… (alguns segundos)`, () => run('pluginsBulk', { enable: on }), true);
  }
  if (act === 'pl-manage' && x) {
    const canAll = x.scope !== 'synced';
    const allLabel = `${x.enabled ? 'Desligar' : 'Ligar'} em ${x.scope === 'user' ? 'todos os projetos' : 'escopo ' + (PL_SCOPE[x.scope] || x.scope)}`;
    const m = await modal({ title: `Gerenciar ${esc(x.name)}`, body: `<p>${esc(x.desc || 'Plugin do Claude Code.')}</p><p class="meta">${esc(x.id)} · v${esc(String(x.version).slice(0, 12))} · instalado no escopo ${esc(PL_SCOPE[x.scope] || x.scope)} · ${x.enabled ? 'ligado' : 'desligado'} neste projeto</p><p class="meta">Atualizar e remover valem para todos os projetos que usam este plugin.</p>`,
      buttons: [['Fechar', null], ['Remover…', 'uninstall', 'bad'], ['Atualizar', 'update'], ...(canAll ? [[allLabel, 'all']] : [])] });
    if (m.value === 'update') return resRun(`Atualizando ${x.name}…`, () => run('pluginAction', { action: 'update', id: x.id }), true);
    if (m.value === 'all') return resRun(`${x.enabled ? 'Desligando' : 'Ligando'} ${x.name}…`, () => run('pluginAction', { action: x.enabled ? 'disable' : 'enable', id: x.id, scope: x.scope }), true);
    if (m.value === 'uninstall') {
      const c = await modal({ title: 'Remover plugin?', body: `<p>${esc(PLMSG(x))}</p>`, buttons: [['Cancelar', null], ['Remover', 'ok', 'bad']] });
      if (c.value === 'ok') return resRun(`Removendo ${x.name}…`, () => run('pluginAction', { action: 'uninstall', id: x.id, scope: x.scope }), true);
    }
    return;
  }
  if (act === 'pl-install') return plInstallFlow();

  if (act === 'mcp-toggle' && x) {
    const off = x.kind === 'off';
    return resRun(`${off ? 'Ligando' : 'Desligando'} ${x.name} neste projeto…`, () => run('mcpDisabled', { items: [{ name: x.name, scope: x.scope }], disabled: !off }), true);
  }
  if (act === 'mcp-all-off' || act === 'mcp-all-on') {
    const on = act === 'mcp-all-on';
    const ok = await modal({ title: on ? 'Ligar todos os MCPs e conectores aqui?' : 'Desligar todos os MCPs e conectores aqui?', body: `<p>${on ? 'Todos voltam a valer' : 'Nenhum MCP nem conector da conta vai valer'} <b>só neste projeto</b>. Os outros projetos não mudam. É o mesmo que desligar um a um no /mcp do terminal.</p>`, buttons: [['Cancelar', null], [on ? 'Ligar todos' : 'Desligar todos', 'ok', 'pri']] });
    if (ok.value !== 'ok') return;
    return resRun(`${on ? 'Ligando' : 'Desligando'} os MCPs neste projeto… (alguns segundos)`, () => run('mcpBulk', { disabled: !on }), true);
  }
  if (act === 'mcp-manage' && x) return mcpManageFlow(x);
  if (act === 'mcp-add') return mcpAddFlow({});

  if (act === 'sk-new') return skNewFlow();
  if (act === 'sk-edit' && x) return skEditFlow(x);
  if (act === 'sk-del' && x) {
    const c = await modal({ title: `Excluir ${x.kind === 'skill' ? 'a skill' : 'o comando'} /${esc(x.name)}?`, body: `<p>${x.scope === 'Usuário' ? 'Vale para todos os seus projetos.' : 'Vale só neste projeto.'} O arquivo vai para a <b>lixeira</b> do Windows, então dá para recuperar.</p>`, buttons: [['Cancelar', null], ['Excluir', 'ok', 'bad']] });
    if (c.value === 'ok') return resRun(`Excluindo /${x.name}…`, () => run('skillOp', { op: 'delete', scope: x.scope, kind: x.kind, name: x.name }), false);
  }
}

const selHTML = (f, opts, cur) => `<select class="inp" data-f="${f}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;

async function plInstallFlow() {
  const p = curProject();
  let avail = null;
  const m = await modal({ title: 'Instalar plugin', body: `<p>Plugins dos marketplaces que o seu Claude Code já conhece. Digite para buscar ou escreva <b>nome@marketplace</b>.</p>
    <div class="f"><label>Plugin</label><input class="inp" type="text" data-f="id" id="plq" placeholder="ex.: frontend-design@claude-plugins-official" autocomplete="off"></div><div id="plres" class="plres meta">Carregando a lista dos marketplaces…</div>
    <div class="f"><label>Instalar para</label>${selHTML('scope', [['user', 'Todos os meus projetos (usuário)'], ['local', 'Só neste projeto, só para mim (local)'], ['project', 'Este projeto, compartilhado com o time (.claude/settings.json)']], 'user')}</div>`,
    buttons: [['Cancelar', null], ['Instalar', 'ok', 'pri']],
    onOpen: (root) => {
      const input = root.querySelector('#plq'), box = root.querySelector('#plres');
      const draw = () => {
        if (!avail) return;
        const q = input.value.trim().toLowerCase();
        const rank = (a) => (a.name.toLowerCase() === q ? 0 : a.name.toLowerCase().startsWith(q) ? 1 : a.name.toLowerCase().includes(q) ? 2 : 3); // nome primeiro, descrição por último
        const list = (q ? avail.filter((a) => `${a.id} ${a.desc}`.toLowerCase().includes(q)).sort((a, b) => rank(a) - rank(b)) : avail).slice(0, 7);
        box.innerHTML = list.length ? list.map((a) => `<button class="cl-row" type="button" data-plpick="${esc(a.id)}"><span class="cl-txt"><b>${esc(a.name)}</b><small>${esc(a.marketplace)}${a.desc ? ' · ' + esc(a.desc.slice(0, 90)) : ''}</small></span></button>`).join('') : 'Nada encontrado. Se souber o nome exato, escreva nome@marketplace.';
        box.querySelectorAll('[data-plpick]').forEach((b) => { b.onclick = () => { input.value = b.dataset.plpick; draw(); }; });
      };
      input.addEventListener('input', draw);
      api.resDo('pluginsAvailable', { projectPath: p.path }).then((d) => { avail = d.items || []; if (!avail.length) box.textContent = d.error || 'Nenhum marketplace com plugins encontrado; escreva nome@marketplace.'; else draw(); });
    } });
  if (m.value !== 'ok') return;
  const id = (m.form.id || '').trim();
  if (!id) return;
  return resRun(`Instalando ${id}… (pode levar um minuto)`, () => api.resDo('pluginInstall', { id, scope: m.form.scope, projectPath: p.path }), true);
}

async function mcpManageFlow(x) {
  const p = curProject();
  const run = (op, args) => api.resDo(op, { projectPath: p.path, ...args });
  const can = ['Usuário', 'Local', 'Projeto'].includes(x.scope);
  const http = x.type === 'http' || x.type === 'sse' || x.scope === 'Conta' || /^https?:/i.test(x.target || '');
  const note = x.scope === 'Conta' ? '<p class="meta">Este conector pertence à sua conta do claude.ai. Aqui você pode entrar, sair e ligar ou desligar neste projeto; para removê-lo de vez, use claude.ai › Configurações › Conectores.</p>'
    : x.scope === 'Plugin' ? `<p class="meta">Este MCP vem do plugin ${esc(plShort(x.origin))}; quem o liga ou desliga é o plugin.</p>` : '';
  const m = await modal({ title: `Gerenciar ${esc(x.name)}`, body: `<p class="meta">Escopo ${esc(x.scope)} · ${esc(x.label)}${x.target ? ' · ' + esc(safeTarget(x.target)) : ''}</p>${x.detail ? `<p class="meta">${esc(x.detail.slice(0, 200))}</p>` : ''}${note}`,
    buttons: [['Fechar', null], ...(can ? [['Remover…', 'remove', 'bad']] : []), ...(http && x.scope !== 'Plugin' ? [['Sair (logout)', 'logout'], ['Entrar (login)', 'login', 'pri']] : [])] });
  if (m.value === 'login') return resRun(`Aguardando o login de ${x.name} no navegador…`, () => run('mcpAuth', { action: 'login', name: x.name }), true);
  if (m.value === 'logout') return resRun(`Saindo de ${x.name}…`, () => run('mcpAuth', { action: 'logout', name: x.name }), true);
  if (m.value === 'remove') {
    const c = await modal({ title: 'Remover MCP?', body: `<p>Remover <b>${esc(x.name)}</b> do escopo ${esc(x.scope)}? ${x.scope === 'Usuário' ? 'Deixa de existir para todos os seus projetos.' : x.scope === 'Projeto' ? 'Sai do .mcp.json deste projeto (afeta o time).' : 'Deixa de existir só neste projeto.'}</p>`, buttons: [['Cancelar', null], ['Remover', 'ok', 'bad']] });
    if (c.value === 'ok') return resRun(`Removendo ${x.name}…`, () => run('mcpRemove', { name: x.name, scope: x.scope }), true);
  }
}

async function mcpAddFlow(prev) {
  const p = curProject();
  const v = { name: '', type: 'http', url: '', command: '', args: '', env: '', headers: '', scope: 'local', ...prev };
  const m = await modal({ title: 'Adicionar MCP', body: `${v.error ? `<div class="resmsg bad">${esc(v.error)}</div>` : ''}
    <div class="f"><label>Nome</label><input class="inp" type="text" data-f="name" value="${esc(v.name)}" placeholder="ex.: github"></div>
    <div class="f"><label>Tipo</label>${selHTML('type', [['http', 'Servidor na web (HTTP)'], ['sse', 'Servidor na web (SSE)'], ['stdio', 'Programa local (comando)']], v.type)}</div>
    <div data-mcpf="web"><div class="f"><label>Endereço</label><input class="inp" type="text" data-f="url" value="${esc(v.url)}" placeholder="https://servidor.exemplo.com/mcp"></div>
      <div class="f"><label>Cabeçalhos (um por linha, <i>Nome: valor</i>)</label><textarea class="inp ta" rows="2" data-f="headers" placeholder="Authorization: Bearer ...">${esc(v.headers)}</textarea></div></div>
    <div data-mcpf="cmd"><div class="f"><label>Comando</label><input class="inp" type="text" data-f="command" value="${esc(v.command)}" placeholder="npx"></div>
      <div class="f"><label>Argumentos (um por linha)</label><textarea class="inp ta" rows="3" data-f="args" placeholder="-y&#10;@modelcontextprotocol/server-github">${esc(v.args)}</textarea></div>
      <div class="f"><label>Variáveis de ambiente (uma por linha, <i>CHAVE=valor</i>)</label><textarea class="inp ta" rows="2" data-f="env" placeholder="GITHUB_TOKEN=...">${esc(v.env)}</textarea></div></div>
    <div class="f"><label>Valer para</label>${selHTML('scope', [['local', 'Só neste projeto, só para mim (local)'], ['user', 'Todos os meus projetos (usuário)'], ['project', 'Este projeto, compartilhado com o time (.mcp.json)']], v.scope)}</div>`,
    buttons: [['Cancelar', null], ['Adicionar', 'ok', 'pri']],
    onOpen: (root) => {
      const sel = root.querySelector('[data-f=type]');
      const sync = () => { const web = sel.value !== 'stdio'; root.querySelector('[data-mcpf=web]').style.display = web ? '' : 'none'; root.querySelector('[data-mcpf=cmd]').style.display = web ? 'none' : ''; };
      sel.addEventListener('change', sync); sync();
    } });
  if (m.value !== 'ok') return;
  const f = m.form;
  const lines = (s) => String(s || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const kv = (s, sep) => Object.fromEntries(lines(s).map((l) => { const i = l.indexOf(sep); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : null; }).filter(Boolean));
  const out = await resRun(`Adicionando ${f.name}…`, () => api.resDo('mcpAdd', { name: (f.name || '').trim(), type: f.type, url: (f.url || '').trim(), command: f.command, args: lines(f.args), env: kv(f.env, '='), headers: kv(f.headers, ':'), scope: f.scope, projectPath: p.path }), true);
  if (out && !out.ok) return mcpAddFlow({ ...f, error: out.message }); // não perde o que foi digitado
}

async function skNewFlow() {
  const p = curProject();
  const m = await modal({ title: 'Nova skill ou comando', body: `<p>Uma <b>skill</b> o Claude usa quando faz sentido; um <b>comando</b> você chama digitando /nome.</p>
    <div class="f"><label>Tipo</label>${selHTML('kind', [['skill', 'Skill'], ['comando', 'Comando']], 'skill')}</div>
    <div class="f"><label>Valer para</label>${selHTML('scope', [['Projeto', 'Só este projeto'], ['Usuário', 'Todos os meus projetos']], 'Projeto')}</div>
    <div class="f"><label>Nome (letras, números, hífen)</label><input class="inp" type="text" data-f="name" placeholder="minha-skill"></div>
    <div class="f"><label>Descrição (quando usar)</label><input class="inp" type="text" data-f="desc" placeholder="Use quando o usuário pedir..."></div>`,
    buttons: [['Cancelar', null], ['Criar e editar', 'ok', 'pri']] });
  if (m.value !== 'ok') return;
  const f = m.form;
  const out = await resRun(`Criando /${f.name}…`, () => api.resDo('skillOp', { op: 'create', scope: f.scope, kind: f.kind, name: (f.name || '').trim(), desc: f.desc, projectPath: p.path }), false);
  if (out && out.ok) return skEditFlow({ scope: f.scope, kind: f.kind, name: (f.name || '').trim() });
}
async function skEditFlow(x) {
  const p = curProject();
  const args = { scope: x.scope, kind: x.kind, name: x.name, projectPath: p.path };
  const rd = await api.resDo('skillOp', { op: 'read', ...args });
  if (!rd.ok) { UI.res.msg = { ok: false, text: rd.message }; repaintRes(); return; }
  const m = await modal({ title: `/${esc(x.name)} <small class="meta">${esc(x.scope)} · ${x.kind === 'skill' ? 'skill' : 'comando'}</small>`, body: `<textarea class="inp ta mono" rows="18" data-f="text" spellcheck="false">${esc(rd.text)}</textarea><p class="meta">O Claude Code relê as skills sozinho; normalmente não precisa reiniciar o terminal.</p>`,
    buttons: [['Fechar', null], ['Abrir pasta', 'reveal'], ['Salvar', 'ok', 'pri']] });
  if (m.value === 'reveal') { await api.resDo('skillOp', { op: 'reveal', ...args }); return; }
  if (m.value === 'ok') return resRun(`Salvando /${x.name}…`, () => api.resDo('skillOp', { op: 'write', ...args, text: m.form.text }), false);
}

function consumoHTML() {
  const rows = S.projects.flatMap((p) => p.tabs.filter((t) => t.started).map((t) => ({ p, t })));
  const L = UI.limits;
  const card = (title, d) => `<div class="card"><h5>${title}</h5>${liveWin(d) ? `<div style="font:600 26px var(--mono);margin:8px 0" class="${pctClass(d.pct)}">${Math.round(d.pct)}%</div>${barHTML(d.pct, 220)}<p style="margin-top:8px">Renova em ${fmtReset(d.resets)}</p>` : '<div style="font:600 18px var(--mono);margin:12px 0" class="na">indisponível</div><p>Sem dados recentes.</p>'}</div>`;
  const ctx = (t) => { const m = MET[t.id]; const v = m && m.context_window && m.context_window.used_percentage; return typeof v === 'number' ? `${Math.round(v)}%` : '<span class="na">indisponível</span>'; };
  return `<div class="page">${ptitle('Consumo')}<div class="note">Percentuais da conta vêm da status line do Claude Code e podem incluir uso fora do app; não são somados por terminal. Dado indisponível aparece como indisponível, nunca como zero.</div>
    <div class="cards">${card('Janela de 5 horas', L && L.five)}${card('Semana', L && L.week)}
    <div class="card"><h5>Origem dos dados</h5><p>${L ? `Status line do Claude Code · atualizado ${ago(L.updated)}` : 'Aguardando a primeira resposta de uma sessão.'}</p></div></div>
    <table class="t"><tr><th>Sessão</th><th>Projeto</th><th>Estado</th><th>Contexto</th><th>Tokens</th><th>Custo equivalente</th></tr>
    ${rows.map(({ p, t }) => `<tr><td>${esc(t.name)}</td><td>${esc(p.name)}</td><td>${STATES[stOf(t)][1]}</td><td>${ctx(t)}</td><td class="na">indisponível</td><td class="na">indisponível</td></tr>`).join('') || '<tr><td colspan="6" class="na">Nenhuma sessão ainda.</td></tr>'}</table></div>`;
}

function integHTML() {
  const e = UI.env;
  if (!e) { api.checkEnv().then((x) => { UI.env = x; if (UI.cur.page === 'Integrações') renderPage(); }); return `<div class="page">${ptitle('Integrações')}<div class="empty" style="height:auto">Verificando…</div></div>`; }
  return `<div class="page">${ptitle('Integrações')}<div class="cards">
    <div class="card"><h5>Claude Code</h5><p>${e.installed ? esc(e.path) : 'Não encontrado no PATH.'}</p>
      <div class="tags">${e.installed ? `<span class="tag ok">Instalado</span><span class="tag">${esc(e.version || 'versão desconhecida')}</span>` : '<span class="tag bad">Não instalado</span>'}</div>
      <p style="margin-top:10px">A autenticação acontece dentro do terminal, no fluxo oficial do Claude, na primeira vez que você abrir uma sessão.</p>
      <div class="tags" style="margin-top:12px"><button class="btn sm" data-recheck>Verificar novamente</button></div></div>
    <div class="card"><h5>Codex</h5><p>Planejado para uma próxima fase.</p><div class="tags"><span class="tag">Em breve</span></div></div></div></div>`;
}

const yn = (k) => `<div class="seg"><button class="${clearCfg()[k] ? 'sel' : ''}" data-clrflag="${k}|1">Sim</button><button class="${clearCfg()[k] ? '' : 'sel'}" data-clrflag="${k}|0">Não</button></div>`;
const ynN = (k) => `<div class="seg"><button class="${notifCfg()[k] ? 'sel' : ''}" data-ntf="${k}|1">Sim</button><button class="${notifCfg()[k] ? '' : 'sel'}" data-ntf="${k}|0">Não</button></div>`;
function confHTML() {
  const arch = S.projects.filter((p) => p.archived);
  return `<div class="page">${ptitle('Configurações')}<div class="card" style="padding:6px 18px">
    <div class="row"><div class="grow">Opacidade do terminal<small>Mais baixo = mais vidro, menos legibilidade</small></div><input type="range" min="50" max="100" value="${S.settings.termOp}" id="rngOp" style="--pct:${(S.settings.termOp - 50) * 2}%"><span id="opv" class="chip">${S.settings.termOp}%</span></div>
    <div class="row"><div class="grow">Fundo do app<small>Degradê: o app é o degradê e o resto fica transparente. Ofuscado: o mesmo degradê, mais suave, com o Windows de fundo aparecendo desfocado por trás (Windows 11). Trocar de um para o outro pede para reabrir o app.</small></div>
      <div class="seg"><button class="${bgMode() === 'gradient' ? 'sel' : ''}" data-bg="gradient">Degradê</button><button class="${bgMode() === 'blur' ? 'sel' : ''}" data-bg="blur">Ofuscado</button></div></div>
    <div class="row"><div class="grow">Pasta raiz dos projetos criados pelo app<small>Projetos importados ficam onde já estão</small></div><span class="chip" id="rootChip">…</span></div>
    <div class="row"><div class="grow">Ao fechar o app<small>Encerra os processos, com confirmação. As conversas ficam guardadas.</small></div><span class="chip">Pergunta antes de sair</span></div>
    <div class="row"><div class="grow">Ao reabrir<small>Reabre sozinho os terminais que estavam abertos, retomando as conversas</small></div><span class="chip">Restaura sozinho</span></div></div>
    <h5 style="margin:22px 0 8px">Rail e rodapé</h5>
    <div class="card" style="padding:6px 18px">
    ${[['on', 'Anéis de métricas', 'Os anéis flutuantes junto à borda direita (contexto, limites e cache)'], ['ctx', 'Contexto', 'Quanto da janela de contexto da conversa já foi usado'], ['h5', 'Limite de 5 horas', 'Uso da conta na janela de 5 horas'], ['d7', 'Limite de 7 dias', 'Uso semanal da conta'], ['cache', 'Cache do prompt', 'Tempo até o cache esfriar (só nos terminais)'], ['fade', 'Esmaecer os anéis quando parado', 'Ficam discretos e voltam ao normal ao passar o mouse'], ['reserve', 'Reservar espaço para os anéis', 'O texto para antes dos anéis, sem passar por baixo'], ['meta', 'Modelo, branch e permissões', 'Etiqueta no canto inferior direito'], ['footFade', 'Esmaecer o rodapé quando parado', 'Terminais · Web · Clear · Reiniciar ficam discretos']].map(([k, t, d]) => `<div class="row"><div class="grow">${t}<small>${d}</small></div><div class="seg"><button class="${railCfg()[k] ? 'sel' : ''}" data-railset="${k}|1">Sim</button><button class="${railCfg()[k] ? '' : 'sel'}" data-railset="${k}|0">Não</button></div></div>`).join('')}
    <div class="row"><div class="grow"><small>Esses ajustes também ficam na engrenagem do rodapé.</small></div></div></div>
    <h5 style="margin:22px 0 8px">Chat <small style="font-weight:400;color:var(--text3)">· como o app abre; no uso, troque pelo rodapé (vale só para o uso atual)</small></h5>
    <div class="card" style="padding:6px 18px">
    <div class="row" style="align-items:flex-start"><div class="grow">Modo das abas novas<small><b>Chat:</b> conversa em bolhas, sem terminal. <b>Terminal:</b> o Claude Code como sempre. O "+" cria a aba no modo escolhido; o menu ao lado do "+" tem os dois. Isto vale só para abas <b>novas</b>: para trocar uma aba já aberta, use o menu da aba (clique direito) > "Abrir como terminal/chat"; a conversa é a mesma.</small></div>
      <div class="seg"><button class="${chatCfg().mode === 'chat' ? 'sel' : ''}" data-chatset="mode|chat">Chat</button><button class="${chatCfg().mode === 'term' ? 'sel' : ''}" data-chatset="mode|term">Terminal</button></div></div>
    <div class="row" style="align-items:flex-start"><div class="grow">Permissões no chat<small><b>Automático:</b> o Claude executa sem perguntar (como a aba Dangerously, sem isolamento do sistema). <b>Perguntar:</b> só edições de arquivo são aceitas; o resto é negado e o chat avisa. Vale para os chats criados depois.</small></div>
      <div class="seg"><button class="${chatCfg().perm === 'auto' ? 'sel' : ''}" data-chatset="perm|auto">Automático</button><button class="${chatCfg().perm === 'ask' ? 'sel' : ''}" data-chatset="perm|ask">Perguntar</button></div></div></div>
    <h5 style="margin:22px 0 8px">Botão Clear (base da janela)</h5>
    <div class="card" style="padding:6px 18px">
    <div class="row"><div class="grow">Pulsar quando o contexto chegar a<small>% do anel CTX a partir da qual o botão Clear pisca. 0 desliga o aviso. Sugestão: 15 para tarefas pequenas, 35 para tarefas longas.</small></div><div class="numf" data-min="0" data-max="100"><button type="button" data-step="-1" aria-label="Diminuir">−</button><input id="clrAlert" type="text" inputmode="numeric" maxlength="3" value="${clearCfg().alert}"><button type="button" data-step="1" aria-label="Aumentar">+</button></div><span class="unit">%</span></div>
    <div class="row"><div class="grow">Usar o fluxo Rocruzta nos projetos que o têm<small>Detecta .claude/fluxo.json e usa pedidos enxutos que seguem o fluxo (papel, validação, TASKS e CHANGELOG, sem abrir os arquivos inteiros)</small></div>${yn('flow')}</div>
    <div class="row"><div class="grow">Commit e push ao fechar a tarefa (projetos do fluxo)<small>Commit "TASK-XXX: ..." e push só na branch do seu papel; nunca promove para a main</small></div>${yn('commit')}</div>
    <div class="row" style="align-items:flex-start"><div class="grow">Pedido de fechamento<small>Enviado ao agente em "Fechar a tarefa e limpar". Vazio = automático (fluxo ou genérico, conforme o projeto). Para o app limpar sozinho, o texto deve terminar pedindo que o agente escreva ${CLEAR_MARK}; sem isso o app pergunta antes de limpar.</small></div><textarea class="inp ta" id="clrClose" rows="5" placeholder="Automático">${esc(clearCfg().closePrompt)}</textarea></div>
    <div class="row" style="align-items:flex-start"><div class="grow">Pedido de retomada<small>Enviado depois do /clear, na conversa nova. Vazio = automático. Pode ser um comando seu, como /retomar.</small></div><textarea class="inp ta" id="clrResume" rows="5" placeholder="Automático">${esc(clearCfg().resumePrompt)}</textarea></div>
    <div class="row"><div class="grow">Restaurar os textos padrão</div><button class="btn sm" data-clrreset>Restaurar</button></div></div>
    <h5 style="margin:22px 0 8px">Notificações</h5>
    <div class="card" style="padding:6px 18px">
    <div class="row"><div class="grow">Terminou<small>Aviso quando um terminal termina a resposta e aguarda você (só se você não estiver olhando para ele)</small></div>${ynN('done')}</div>
    <div class="row"><div class="grow">Precisa de você<small>Pedido de permissão ou de atenção do agente</small></div>${ynN('perm')}</div>
    <div class="row"><div class="grow">Erro<small>Falha ao iniciar ou retomar uma conversa</small></div>${ynN('error')}</div>
    <div class="row"><div class="grow">Cache esfriando<small>Aviso uma vez por resposta, antes de o cache do prompt esfriar (depois disso a próxima mensagem reescreve o contexto, o que gasta mais). Vale para terminais parados; terminal trabalhando não notifica.</small></div>${ynN('cache')}</div>
    <div class="row"><div class="grow">Avisar quando faltarem<small>Cache de 1 h. O cache de 5 min (créditos extras ou chave de API) avisa 1 minuto antes.</small></div><div class="numf" data-min="1" data-max="55"><button type="button" data-step="-1" aria-label="Diminuir">−</button><input id="ntfCache" type="text" inputmode="numeric" maxlength="2" value="${notifCfg().cacheMin}"><button type="button" data-step="1" aria-label="Aumentar">+</button></div><span class="unit">min</span></div>
    <div class="row"><div class="grow">Dica ao lado do sino<small>Mostra por alguns segundos o que aconteceu; clicar abre o painel</small></div>${ynN('toast')}</div>
    <div class="row"><div class="grow">Tempo da dica<small>Quanto tempo a dica fica na tela</small></div><div class="numf" data-min="2" data-max="30"><button type="button" data-step="-1" aria-label="Diminuir">−</button><input id="ntfToast" type="text" inputmode="numeric" maxlength="2" value="${notifCfg().toastSec}"><button type="button" data-step="1" aria-label="Aumentar">+</button></div><span class="unit">s</span></div>
    <div class="row"><div class="grow">Som<small>Toque curto, diferente para cada tipo</small></div>${ynN('sound')}</div>
    <div class="row"><div class="grow">Notificação do Windows<small>Com o app em segundo plano, também pisca o ícone na barra de tarefas</small></div>${ynN('win')}</div>
    <div class="row"><div class="grow">Restaurar os padrões</div><button class="btn sm" data-ntfreset>Restaurar</button></div></div>
    <h5 style="margin:22px 0 8px">Conectores (plugins, skills e MCPs)</h5>
    <div class="card" style="padding:6px 18px">
    <div class="row" style="align-items:flex-start"><div class="grow">Projeto novo criado pelo Termix<small><b>Automático:</b> o projeto nasce como o Claude Code monta por padrão, com os seus plugins, MCPs e conectores já valendo (isso pesa nos tokens de cada sessão). <b>Limpo:</b> o projeto nasce sem nenhum plugin, MCP nem conector; você liga só o que quiser nas telas Plugins, MCPs e Skills.</small></div>
      <div class="seg"><button class="${connCfg().newProject === 'auto' ? 'sel' : ''}" data-conn="auto">Automático</button><button class="${connCfg().newProject === 'clean' ? 'sel' : ''}" data-conn="clean">Limpo</button></div></div>
    <div class="row"><div class="grow"><small>O "limpo" desliga só dentro do projeto novo (plugins em .claude/settings.local.json e MCPs/conectores na entrada do projeto do Claude Code); os outros projetos e as suas configurações de usuário não mudam. Skills e comandos de <b>usuário</b> (pasta .claude do seu usuário) não têm como ser desligados por projeto. Plugins, MCPs ou conectores instalados depois ficam ligados até você desligar. Projetos importados não são alterados.</small></div></div></div>
    <h5 style="margin:22px 0 8px">Projetos arquivados</h5>
    <div class="card">${arch.length ? arch.map((p) => `<div class="lrow"><span class="nm">${esc(p.name)}<br><span class="meta">${esc(p.path)}</span></span><button class="btn sm" data-unarchive="${p.id}">Restaurar</button></div>`).join('') : '<span class="meta">Nenhum projeto arquivado.</span>'}</div></div>`;
}

// quando cada conversa foi usada pela última vez: vem da data do histórico em disco; sem histórico, de quando a aba foi fechada
async function loadSessInfo(p) {
  UI.sessInfoAt = UI.sessInfoAt || {};
  if (Date.now() - (UI.sessInfoAt[p.id] || 0) < 10000) return;
  UI.sessInfoAt[p.id] = Date.now();
  const list = await api.scanSessions(p.path);
  UI.sessInfo = UI.sessInfo || {};
  UI.sessInfo[p.id] = Object.fromEntries(list.map((s) => [s.id, s]));
  if (mode() === 'noterm' && curProject() && curProject().id === p.id) renderPage();
}
function noTermHTML(p) {
  loadSessInfo(p);
  const info = (UI.sessInfo && UI.sessInfo[p.id]) || {};
  // todas as abas fechadas do projeto, da mais recente para a mais antiga (conversas com histórico primeiro pela data real)
  const rows = p.tabs.filter((t) => !t.open && !t.archived).map((t) => {
    const i = info[t.sessionId];
    return { t, has: !!i, ms: i ? i.mtime : t.closedAt || 0, sub: i ? i.last || i.title || '' : '' };
  }).sort((a, b) => b.ms - a.ms);
  // a lista tem que caber na tela sem rolagem: o número de linhas depende da altura disponível
  const H = ($('#page') && $('#page').clientHeight) || 600;
  const max = Math.max(2, Math.min(8, Math.floor((H - 330) / 56)));
  const shown = rows.slice(0, 1 + max), rest = rows.length - shown.length;
  const when = (r) => (r.has && r.ms ? agoText(r.ms) : r.ms ? `fechada ${agoText(r.ms)}` : 'sem mensagens');
  const row = (r, top) => `<button class="cl-row ${top ? 'cl-top' : ''}" data-reopen2="${r.t.id}" title="Reabrir e retomar a conversa">
    <i class="cdot" style="background:${r.t.color}"></i>
    <span class="cl-txt"><b>${esc(r.t.name)}</b>${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</span>
    <span class="cl-when">${when(r)}</span>${top ? '<span class="cl-go">Continuar</span>' : ''}</button>`;
  const list = shown.length
    ? `<div class="cl-wrap"><div class="cl-h">Mais recente</div>${row(shown[0], true)}${shown.length > 1 ? `<div class="cl-h">Abertos antes neste projeto</div>${shown.slice(1).map((r) => row(r, false)).join('')}` : ''}${rest > 0 ? `<button class="cl-more" data-closedlist>e mais ${rest}…</button>` : ''}</div>`
    : '<p>Abra um terminal do Claude Code neste projeto.</p>';
  return `<div class="empty"><h2>Nenhum terminal aberto</h2>${list}<div class="row2"><button class="btn pri" data-newtab="${chatNewKey()}">${chatCfg().mode === 'chat' ? '+ Chat' : '+ Terminal'}</button></div></div>`;
}

function renderPage() {
  const m = mode();
  let html = '';
  if (m === 'empty') html = emptyHTML();
  else if (m === 'noterm') html = noTermHTML(curProject());
  else if (UI.cur.p === '_') html = { Consumo: consumoHTML, 'Integrações': integHTML, 'Configurações': confHTML }[UI.cur.page]();
  else if (m === 'page') html = resPageHTML(UI.cur.page);
  $('#page').innerHTML = html;
  layout(); // o recorte do vidro depende do tipo de tela
  if (UI.cur.p === '_' && UI.cur.page === 'Configurações') api.appInfo().then((i) => { const c = $('#rootChip'); if (c) c.textContent = i.root; });
}

function renderPop() {
  const L = UI.limits;
  const pop = $('#pop');
  pop.classList.toggle('show', UI.pop);
  pop.innerHTML = `<h4>Consumo da conta</h4><table><tr><th>Sessão ativa</th><th>Estado</th><th>Contexto</th></tr>
    ${aliveTabs().map(({ p: pp, tab }) => { const m = MET[tab.id]; const v = m && m.context_window && m.context_window.used_percentage; return `<tr><td><i class="dot" style="background:${tab.color};margin-right:8px"></i>${esc(pp.name)} › ${esc(tab.name)}</td><td>${STATES[stOf(tab)][1]}</td><td>${typeof v === 'number' ? `${Math.round(v)}%` : '<span class="na">—</span>'}</td></tr>`; }).join('') || '<tr><td colspan="3" class="meta">Nenhuma sessão ativa.</td></tr>'}</table>
    <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center"><span class="meta">${L ? 'Origem: status line · pode incluir uso fora do app' : 'Limites ainda indisponíveis'}</span><button class="btn sm" data-go="_|Consumo">Abrir Consumo</button></div>`;
}

function renderAct() {
  const a = $('#act');
  // agrupado por aba (o grupo com o aviso mais novo vem primeiro); o índice do aviso continua o da lista geral
  const groups = [];
  UI.events.forEach((e, i) => {
    const key = e.tabId || '_sys';
    let g = groups.find((x) => x.key === key);
    if (!g) { g = { key, who: e.who, c: e.c, items: [] }; groups.push(g); }
    g.items.push([e, i]);
  });
  const evHTML = ([e, i]) => `<div class="ev ${e.done ? 'done' : ''}" style="--c:${e.c || '#8B7BFF'}"><div class="h">${e.kind ? `<span class="kd kd-${e.kind}">${KIND_TITLE[e.kind]}</span>` : ''}<small>${ago(e.ts)}</small><button class="evx" data-evdel="${i}" title="Excluir este aviso" aria-label="Excluir este aviso">${ic('x', 12)}</button></div><p>${esc(e.msg)}</p>
    ${e.acts.length && !e.done ? `<div class="acts">${e.acts.map(([l, k, id], j) => `<button class="btn sm ${j ? '' : 'pri'}" data-ev="${i}|${k}|${id}">${l}</button>`).join('')}</div>` : ''}</div>`;
  a.innerHTML = `<div class="ah"><h3>Notificações</h3>${UI.events.length ? '<button class="btn sm" data-evclr="all">Limpar tudo</button>' : ''}</div><div class="list">${groups.length ? groups.map((g) => `<div class="evg"><div class="eh"><i class="dot" style="background:${g.c || '#8B7BFF'}"></i><span class="nm">${esc(g.who)}</span><small>${g.items.length}</small><button class="evx" data-evclr="${esc(g.key)}" title="Limpar os avisos desta aba" aria-label="Limpar os avisos desta aba">${ic('x', 12)}</button></div>${g.items.map(evHTML).join('')}</div>`).join('') : '<div class="empty" style="padding:24px;height:auto">Nada por aqui</div>'}</div>`;
}

function renderTabMenu(m) {
  const f = findTab(m.tabId);
  if (!f) { $('#menuRoot').innerHTML = ''; return; }
  const { p, tab } = f;
  const open = openTabs(p), idx = open.findIndex((t) => t.id === tab.id);
  const st = stOf(tab);
  const row = (attr, icon, label, extra = '', dis = false) => `<button class="mi mrow" ${attr} ${dis ? 'disabled' : ''}>${icon ? ic(icon, 16) : '<span style="width:16px"></span>'}<span class="t">${label}</span>${extra}</button>`;
  const x = Math.max(8, Math.min(m.x, window.innerWidth - 270)), y = Math.max(8, Math.min(m.y, window.innerHeight - 400));
  $('#menuRoot').innerHTML = `<div class="menu" style="left:${x}px;top:${y}px;min-width:250px">
    <div class="mlabel">Cor da guia</div>
    <div class="mcolors">${COLORS.map((c) => `<button style="--c:${c}" class="${c === tab.color ? 'sel' : ''}" data-setcolor="${tab.id}|${c}"></button>`).join('')}</div>
    ${row(`data-rename="${tab.id}"`, 'edit', 'Renomear guia')}
    ${row(`data-dup="${tab.id}"`, 'copy', 'Duplicar guia')}
    ${row(`data-restart="${tab.id}"`, 'refresh', st === 'end' ? 'Retomar conversa' : 'Reiniciar com a conversa atual', '', st === 'restart')}
    ${row(`data-switchmode="${tab.id}"`, 'refresh', tab.kind === 'chat' ? 'Abrir como terminal' : 'Abrir como chat', '', st === 'restart')}
    <div class="msep"></div>
    ${row(`data-export="${tab.id}"`, 'save', 'Exportar texto…')}
    <div class="msep"></div>
    ${row(`data-closeothers="${tab.id}"`, '', 'Fechar outras guias', '', open.length < 2)}
    ${row(`data-closeright="${tab.id}"`, '', 'Fechar guias à direita', '', idx >= open.length - 1)}
    ${row(`data-x="${tab.id}"`, 'x', 'Fechar guia')}</div>`;
}

function renderMenu() {
  const m = UI.menu;
  if (!m) { $('#menuRoot').innerHTML = ''; return; }
  if (m.type === 'tab') return renderTabMenu(m);
  if (m.type === 'rail') {
    const c = railCfg();
    const row = (k, label, sub) => `<button class="mi" data-rail="${k}"><span class="t"><span class="mchk ${c[k] ? 'on' : ''}">${c[k] ? '✓' : ''}</span>${label}</span><small>${sub}</small></button>`;
    const ringRow = (k, label) => row(k, label, '');
    $('#menuRoot').innerHTML = `<div class="menu" style="left:${Math.max(8, Math.min(m.x, window.innerWidth - 440))}px;bottom:${m.b}px;min-width:320px;max-width:420px">
      <div class="mlabel">Rail · anéis de métricas</div>
      ${row('on', 'Mostrar os anéis', 'Anéis flutuantes junto à borda direita, sem fundo')}
      ${row('ctx', 'Contexto', 'Quanto da janela de contexto desta conversa já foi usado')}
      ${row('h5', 'Limite de 5 horas', 'Uso da conta na janela de 5 horas')}
      ${row('d7', 'Limite de 7 dias', 'Uso semanal da conta')}
      ${row('cache', 'Cache do prompt', 'Tempo até o cache esfriar (terminais)')}
      <div class="msep"></div>
      ${row('reserve', 'Reservar espaço no terminal', 'O texto para antes dos anéis, sem passar por baixo deles')}
      ${row('fade', 'Esmaecer quando parado', 'Fica discreta e volta ao normal ao passar o mouse')}
      ${row('meta', 'Modelo, branch e permissões', 'Etiqueta no canto inferior direito do terminal')}
      <div class="msep"></div>
      <div class="mlabel">Rodapé</div>
      ${row('footFade', 'Esmaecer quando parado', 'Terminais · Web · Clear · Reiniciar ficam discretos e voltam ao normal ao passar o mouse')}</div>`;
    return;
  }
  const p = curProject();
  const closed = p ? p.tabs.filter((t) => !t.open && !t.archived).length : 0;
  $('#menuRoot').innerHTML = `<div class="menu" style="left:${Math.max(8, Math.min(m.x, window.innerWidth - 320))}px;top:${m.y}px">
    <button class="mi" data-newtab="chat|auto"><span class="t">${ic('sparkles', 16)} Chat · Claude Code</span><small>Conversa em bolhas, sem terminal (permissão: ${chatCfg().perm === 'ask' ? 'perguntar' : 'automático'}, em Configurações)</small></button>
    <div class="msep"></div>
    <button class="mi" data-newtab="claude|n"><span class="t">${ic('terminal', 16)} Terminal · Claude Code</span><small>Permissões normais</small></button>
    <button class="mi warn" data-newtab="claude|d"><span class="t">${ic('alert', 16)} Terminal · Claude Code · Dangerously</span><small>Ignora as verificações de permissão. Sem isolamento do sistema.</small></button>
    <div class="msep"></div>
    <button class="mi" disabled><span class="t">${ic('terminal', 16)} Codex</span><small>Em breve</small></button>
    <div class="msep"></div>
    <button class="mi" data-impsess><span class="t">Importar conversas existentes…</span><small>Abre conversas do Claude Code já feitas nesta pasta</small></button>
    ${closed ? `<button class="mi" data-closedlist><span class="t">Sessões fechadas (${closed})…</span></button>` : ''}
    <button class="mi" data-projmenu><span class="t">Gerenciar projeto…</span></button></div>`;
}

function renderChrome() { renderSide(); renderTabs(); renderTop(); renderRail(); if (UI.pop) renderPop(); }

function renderAll() {
  const m = mode();
  renderTop(); renderSide(); renderTabs(); renderPage(); renderPop(); renderAct(); renderMenu(); renderRail();
  $('#tabsRow').classList.toggle('hide', m !== 'term');
  $('#sess').classList.toggle('hide', m !== 'term');
  $('#page').classList.toggle('hide', m === 'term' || m === 'web');
  if (window.webRender) webRender(m);
  document.documentElement.style.setProperty('--term-op', S.settings.termOp / 100);
  if (m === 'term') { const t = curTab(curProject()); if (t.kind === 'chat') showChat(t); else showTab(t); }
}

/* ---------- ações de projeto e abas ---------- */
async function newProjectFlow() {
  const r = await modal({
    title: 'Novo projeto',
    body: '<p>O Termix cria e organiza a pasta do projeto. Você só informa o nome.</p><div class="f"><label>Nome do projeto</label><input class="inp" type="text" data-f="name" placeholder="Meu SaaS"></div>',
    buttons: [['Cancelar', null], ['Importar pasta existente…', 'import'], ['Criar projeto', 'ok', 'pri']],
  });
  if (r.value === 'import') return importFlow();
  if (r.value !== 'ok') return;
  const name = (r.form.name || '').trim();
  if (!name) return;
  const { path } = await api.createProject(name);
  let note = '';
  if (connCfg().newProject === 'clean') {
    $('#modalRoot').innerHTML = '<div class="modal"><div class="dlg glass"><h2>Preparando o projeto limpo…</h2><p>Desligando plugins, MCPs e conectores só neste projeto. Leva alguns segundos.</p></div></div>';
    const out = await api.resDo('cleanProject', { projectPath: path });
    $('#modalRoot').innerHTML = '';
    note = out.ok ? `Projeto limpo: ${out.plugins} plugin${out.plugins === 1 ? '' : 's'} e ${out.mcps} MCP${out.mcps === 1 ? '' : 's'}/conectores desligados aqui.${out.userSkills ? ` ${out.userSkills} skill(s) de usuário continuam valendo (limite do Claude Code).` : ''}` : `Não consegui deixar o projeto limpo: ${out.message}`;
  }
  addProject({ name, path, imported: false });
  if (note) addEvent({ who: name, msg: note });
}
async function importFlow() {
  const dir = await api.pickFolder();
  if (!dir) return;
  if (S.projects.some((p) => p.path.toLowerCase() === dir.toLowerCase() && !p.archived)) { addEvent({ who: 'Projetos', msg: 'Essa pasta já está registrada.' }); return; }
  const name = dir.split(/[\\/]/).filter(Boolean).pop() || 'Projeto';
  const found = (await api.scanSessions(dir)).length;
  const p = addProject({ name, path: dir, imported: true, noTab: found > 0 });
  if (found) await importSessionsFlow(p, true);
}

function agoText(ms) {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 5) return 'agora';
  if (s < 60) return `há ${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 48) return `há ${h} h`;
  return `há ${Math.round(h / 24)} dias`;
}
// Mostra as conversas do Claude Code já existentes na pasta e abre abas só para as escolhidas (retoma pelo ID exato)
async function importSessionsFlow(p, fromImport = false) {
  UI.menu = null; renderMenu();
  const known = new Set(p.tabs.map((t) => t.sessionId));
  const list = (await api.scanSessions(p.path)).filter((s) => !known.has(s.id));
  if (!list.length) {
    if (fromImport) { createTab(p, 'n'); return; }
    await modal({ title: 'Importar conversas', body: '<p>Não encontrei conversas do Claude Code nesta pasta que ainda não estejam abertas no Termix.</p>', buttons: [['Fechar', null]] });
    return;
  }
  const busy = (s) => Date.now() - s.mtime < 3 * 60000;
  const r = await modal({
    title: 'Conversas encontradas nesta pasta',
    body: `<p>Escolha quais conversas abrir como abas. As outras continuam guardadas e podem ser importadas depois pelo menu “⌄”.</p>
      <div class="slist">${list.map((s) => `<label class="srow"><input type="checkbox" data-sid="${s.id}">
        <span class="sbody"><b>${esc(s.title)}</b><small>${esc(s.last || s.first)}</small>
        <em>${agoText(s.mtime)} · ${s.id.slice(0, 8)}${busy(s) ? ' · <u>parece estar em uso agora em outro terminal</u>' : ''}</em></span></label>`).join('')}</div>
      <p class="meta">Abrir a mesma conversa em dois terminais ao mesmo tempo mistura as respostas no histórico. Se ela estiver ativa em outro terminal, feche-o antes de abrir aqui.</p>
      <div class="f"><label>Permissão das abas importadas</label><select class="inp" data-f="perm"><option value="n">Normal</option><option value="d">Dangerously</option></select></div>`,
    buttons: [['Pular', null], ['Abrir selecionadas', 'ok', 'pri']],
  });
  const picked = r.value === 'ok' ? list.filter((s) => r.picked.includes(s.id)) : [];
  if (!picked.length) { if (fromImport && !p.tabs.length) createTab(p, 'n'); return; }
  picked.forEach((s, i) => {
    p.tabs.push({ id: uuid(), sessionId: s.id, agent: 'claude', name: s.title.slice(0, 28), color: DEFAULT_COLOR, perm: r.form.perm === 'd' ? 'd' : 'n', started: true, open: true, live: false, archived: false });
  });
  p.activeTab = p.tabs[p.tabs.length - 1].id; save();
  UI.cur = { p: p.id, page: 'Terminais' }; renderAll();
  for (const t of p.tabs.slice(-picked.length)) await launch(p, t, 'resume');
}
function addProject({ name, path, imported, noTab }) {
  const p = { id: uuid(), name, path, imported, archived: false, tabs: [], activeTab: null, g: S.projects.length, open: true };
  S.projects.push(p);
  UI.cur = { p: p.id, page: 'Terminais' }; UI.last = p.id; UI.res = null;
  save(); renderAll();
  if (!noTab) createTab(p, 'n');
  return p;
}

// "+" cria direto um terminal com a ferramenta escolhida; nome e cor podem ser mudados depois
function createTab(p, perm, opts = {}) {
  const isChat = opts.kind === 'chat';
  const n = p.tabs.filter((t) => (t.agent || 'claude') === 'claude' && (t.kind === 'chat') === isChat).length + 1;
  const tab = { id: uuid(), sessionId: uuid(), agent: 'claude', name: opts.name || `${isChat ? 'Chat' : 'Claude'} ${n}`, color: opts.color || DEFAULT_COLOR, perm: perm === 'd' ? 'd' : 'n', started: false, open: true, live: false, archived: false, ...(isChat ? { kind: 'chat' } : {}) };
  if (opts.after) { const i = p.tabs.findIndex((t) => t.id === opts.after); p.tabs.splice(i + 1, 0, tab); } else p.tabs.push(tab);
  p.activeTab = tab.id; save();
  UI.cur.page = 'Terminais'; UI.menu = null; renderAll();
  return launch(p, tab, 'new');
}

async function editTabFlow(tab) {
  let color = tab.color;
  const r = await modal({
    title: 'Editar aba',
    body: `<div class="f"><label>Nome</label><input class="inp" type="text" data-f="name" value="${esc(tab.name)}"></div>
      <div class="f"><label>Cor da aba</label><div class="sw" id="mSw">${COLORS.map((c) => `<button style="--c:${c}" data-c="${c}" class="${c === color ? 'sel' : ''}"></button>`).join('')}</div><input type="hidden" data-f="color" value="${color}"></div>
      <p class="meta">A permissão (${tab.perm === 'd' ? 'Dangerously' : 'Normal'}) é definida ao criar a aba e não muda com a sessão em andamento.</p>`,
    buttons: [['Cancelar', null], ['Salvar', 'ok', 'pri']],
    onOpen: (root) => {
      root.querySelector('#mSw').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; color = b.dataset.c; root.querySelector('[data-f=color]').value = color; root.querySelectorAll('#mSw button').forEach((x) => x.classList.toggle('sel', x === b)); };
    },
  });
  if (r.value !== 'ok') return;
  tab.name = (r.form.name || '').trim() || tab.name;
  tab.color = r.form.color;
  save(); renderAll();
}

async function closeTab(p, tab) {
  const r = RT[tab.id];
  if (r && r.alive && r.st === 'work') {
    const c = await modal({ title: 'Fechar a aba?', body: '<p>O agente está trabalhando. Fechar a aba encerra o processo; a conversa fica guardada e pode ser reaberta depois.</p>', buttons: [['Cancelar', null], ['Fechar aba', 'ok', 'pri']] });
    if (c.value !== 'ok') return;
  }
  await stopProc(tab);
  tab.open = false; tab.live = false; tab.closedAt = Date.now();
  if (UI.sessInfoAt) UI.sessInfoAt[p.id] = 0; // a data da conversa pode ter mudado
  if (RT[tab.id]) { RT[tab.id].term.dispose(); RT[tab.id].el.remove(); delete RT[tab.id]; }
  if (tab.kind === 'chat') chatForget(tab);
  if (p.activeTab === tab.id) p.activeTab = (openTabs(p)[0] || {}).id || null;
  save(); sendSummary(); renderAll();
}

async function closedListFlow() {
  const p = curProject();
  if (!p) return;
  UI.menu = null; renderMenu();
  const list = p.tabs.filter((t) => !t.open && !t.archived);
  await modal({
    title: 'Sessões fechadas',
    body: list.length ? `<p>As conversas continuam guardadas. Reabrir retoma a conversa exata.</p>${list.map((t) => `<div class="lrow"><i class="cdot" style="background:${t.color}"></i><span class="nm">${esc(t.name)}</span><button class="btn sm" data-reopen="${t.id}">Reabrir</button><button class="btn sm" data-archive-tab="${t.id}">Arquivar</button></div>`).join('')}` : '<p>Nenhuma sessão fechada.</p>',
    buttons: [['Fechar', null]],
    onOpen: (root) => {
      (root.querySelector('.dlg') || root).addEventListener('click', (e) => {
        const ro = e.target.closest('[data-reopen]'), ar = e.target.closest('[data-archive-tab]');
        if (ro) { const t = p.tabs.find((x) => x.id === ro.dataset.reopen); t.open = true; p.activeTab = t.id; save(); root.innerHTML = ''; renderAll(); restartTab(p, t); }
        if (ar) { p.tabs.find((x) => x.id === ar.dataset.archiveTab).archived = true; save(); root.innerHTML = ''; renderAll(); }
      });
    },
  });
}

async function stopProject(p) {
  for (const t of p.tabs.filter((x) => RT[x.id] && RT[x.id].alive)) await stopProc(t);
}
function disposeProjectViews(p) {
  p.tabs.forEach((t) => { if (RT[t.id]) { RT[t.id].term.dispose(); RT[t.id].el.remove(); delete RT[t.id]; } t.live = false; });
}

async function projectMenuFlow() {
  const p = curProject();
  if (!p) return;
  UI.menu = null; renderMenu();
  const r = await modal({
    title: esc(p.name),
    body: `<p class="meta" style="user-select:text">${esc(p.path)}</p><p>${p.imported ? 'Pasta importada: o app só a registra, sem copiar nem mover.' : 'Pasta criada e organizada pelo app.'}</p>`,
    buttons: [['Fechar', null], ['Abrir pasta', 'open'], ['Renomear', 'rename'], ['Arquivar', 'archive'], ['Remover do app', 'remove', 'bad']].concat(p.imported ? [] : [['Excluir pasta…', 'delete', 'bad']]),
  });
  if (r.value === 'open') api.openFolder(p.path);
  if (r.value === 'rename') {
    const n = await modal({ title: 'Renomear projeto', body: `<p>Só o nome na interface muda; a pasta continua no mesmo lugar.</p><div class="f"><input class="inp" type="text" data-f="name" value="${esc(p.name)}"></div>`, buttons: [['Cancelar', null], ['Salvar', 'ok', 'pri']] });
    if (n.value === 'ok' && n.form.name.trim()) { p.name = n.form.name.trim(); save(); renderAll(); }
  }
  if (r.value === 'archive' || r.value === 'remove') {
    const any = p.tabs.some((t) => RT[t.id] && RT[t.id].alive);
    const verb = r.value === 'archive' ? 'Arquivar' : 'Remover do app';
    const c = await modal({ title: `${verb} “${esc(p.name)}”?`, body: `<p>${any ? 'Os terminais ativos deste projeto serão encerrados. ' : ''}${r.value === 'remove' ? 'Os arquivos na pasta <b>não</b> são apagados.' : 'Os arquivos e o histórico ficam intactos, e você pode restaurar depois em Configurações.'}</p>`, buttons: [['Cancelar', null], [verb, 'ok', 'pri']] });
    if (c.value !== 'ok') return;
    await stopProject(p);
    disposeProjectViews(p);
    if (r.value === 'archive') p.archived = true; else S.projects = S.projects.filter((x) => x.id !== p.id);
    const next = visibleProjects()[0];
    UI.cur = { p: next ? next.id : null, page: 'Terminais' }; UI.res = null;
    save(); sendSummary(); renderAll();
  }
  if (r.value === 'delete') {
    const c = await modal({ title: 'Excluir a pasta do projeto?', body: `<p>A pasta <b>${esc(p.path)}</b> será enviada para a <b>Lixeira do Windows</b>. Para confirmar, digite o nome do projeto:</p><div class="f"><input class="inp" type="text" data-f="confirm" placeholder="${esc(p.name)}"></div>`, buttons: [['Cancelar', null], ['Enviar para a Lixeira', 'ok', 'bad']] });
    if (c.value !== 'ok') return;
    if (c.form.confirm.trim() !== p.name) { addEvent({ who: 'Projetos', msg: 'O nome digitado não confere. Nada foi excluído.' }); return; }
    await stopProject(p);
    const res = await api.trashFolder(p.path);
    if (!res.ok) { addEvent({ who: 'Projetos', msg: `Não foi possível enviar para a Lixeira: ${res.error}` }); return; }
    disposeProjectViews(p);
    S.projects = S.projects.filter((x) => x.id !== p.id);
    const next = visibleProjects()[0];
    UI.cur = { p: next ? next.id : null, page: 'Terminais' };
    save(); sendSummary(); renderAll();
  }
}

/* ---------- ações do menu de botão direito da aba ---------- */
async function renameTab(tab) {
  const r = await modal({ title: 'Renomear guia', body: `<div class="f"><input class="inp" type="text" data-f="name" value="${esc(tab.name)}"></div>`, buttons: [['Cancelar', null], ['Salvar', 'ok', 'pri']] });
  if (r.value === 'ok' && r.form.name.trim()) { tab.name = r.form.name.trim(); save(); renderAll(); }
}
// reordena as abas abertas (from/to são posições entre as abas visíveis); abas fechadas mantêm o lugar delas
function reorderTabs(p, from, to) {
  const open = openTabs(p);
  const slots = p.tabs.map((t, k) => (open.includes(t) ? k : -1)).filter((k) => k >= 0);
  const next = [...open];
  const [m] = next.splice(from, 1);
  next.splice(to, 0, m);
  slots.forEach((k, n) => { p.tabs[k] = next[n]; });
  save(); renderAll();
}
async function exportText(tab) {
  if (tab.kind === 'chat') return chatExport(tab);
  const r = RT[tab.id];
  if (!r) return;
  const buf = r.term.buffer.active;
  const lines = [];
  for (let i = 0; i < buf.length; i++) { const l = buf.getLine(i); lines.push(l ? l.translateToString(true) : ''); }
  const text = `${lines.join('\n').replace(/\s+$/, '')}\n`;
  const saved = await api.saveText(`${tab.name}.txt`, text);
  if (saved) addEvent({ c: tab.color, who: tab.name, msg: `Texto exportado para ${saved}` });
}
async function closeMany(p, list) { for (const t of list) await closeTab(p, t); }

/* ---------- eventos de clique ---------- */
function closeFloaters(e) {
  let changed = false;
  if (UI.pop && !e.target.closest('.pop,[data-lim]')) { UI.pop = false; changed = true; }
  if (UI.menu && !e.target.closest('.menu,[data-menu],[data-railmenu]')) { UI.menu = null; changed = true; }
  if (changed) { renderPop(); renderAct(); renderMenu(); renderTop(); renderRail(); }
}

document.addEventListener('click', async (e) => {
  const q = (s) => e.target.closest(s);
  let el;
  closeFloaters(e);
  if ((el = q('[data-setcolor]'))) { const [id, c] = el.dataset.setcolor.split('|'); const f = findTab(id); if (f) { f.tab.color = c; save(); } UI.menu = null; renderAll(); return; }
  if ((el = q('[data-rename]'))) { const f = findTab(el.dataset.rename); UI.menu = null; renderMenu(); if (f) renameTab(f.tab); return; }
  if ((el = q('[data-dup]'))) { const f = findTab(el.dataset.dup); UI.menu = null; if (f) createTab(f.p, f.tab.perm, { name: `${f.tab.name} (2)`, color: f.tab.color, after: f.tab.id }); return; }
  if ((el = q('[data-export]'))) { const f = findTab(el.dataset.export); UI.menu = null; renderMenu(); if (f) exportText(f.tab); return; }
  if ((el = q('[data-closeothers]'))) { const f = findTab(el.dataset.closeothers); UI.menu = null; renderMenu(); if (f) closeMany(f.p, openTabs(f.p).filter((t) => t.id !== f.tab.id)); return; }
  if ((el = q('[data-closeright]'))) { const f = findTab(el.dataset.closeright); UI.menu = null; renderMenu(); if (f) { const o = openTabs(f.p); closeMany(f.p, o.slice(o.findIndex((t) => t.id === f.tab.id) + 1)); } return; }
  if ((el = q('[data-x]'))) { UI.menu = null; renderMenu(); e.stopPropagation(); const f = findTab(el.dataset.x); if (f) closeTab(f.p, f.tab); return; }
  if ((el = q('[data-tab]'))) { if (UI.justDragged) return; const p = curProject(); p.activeTab = el.dataset.tab; save(); renderAll(); return; }
  if ((el = q('[data-newtab]'))) { const p = curProject(); if (!p) return; const [kind, perm] = el.dataset.newtab.split('|'); UI.menu = null; renderMenu(); if (kind === 'chat') createTab(p, chatPermFor(), { kind: 'chat' }); else createTab(p, perm); return; }
  if ((el = q('[data-chatset]'))) { const [k, v] = el.dataset.chatset.split('|'); S.settings.chat = { ...chatCfg(), [k]: v }; save(); renderAll(); return; }
  if ((el = q('[data-menu]'))) {
    if (UI.menu) { UI.menu = null; renderMenu(); return; }
    const r = el.getBoundingClientRect(); UI.menu = { type: 'new', x: r.left, y: r.bottom + 6 }; renderMenu(); return;
  }
  if ((el = q('[data-railmenu]'))) {
    if (UI.menu && UI.menu.type === 'rail') UI.menu = null;
    else { const r = el.getBoundingClientRect(); UI.menu = { type: 'rail', x: r.left - 60, b: Math.max(8, window.innerHeight - r.top + 8) }; } // abre logo acima da engrenagem do rodapé
    renderMenu(); renderRail(); return;
  }
  if ((el = q('[data-railset]'))) { const [k, v] = el.dataset.railset.split('|'); railCfg()[k] = v === '1'; save(); renderPage(); renderRail(); renderTop(); dockRefresh(); return; }
  if ((el = q('[data-clrflag]'))) { const [k, v] = el.dataset.clrflag.split('|'); S.settings.clear[k] = v === '1'; save(); renderPage(); return; }
  if ((el = q('[data-conn]'))) { S.settings.connectors = { v: 1, newProject: el.dataset.conn }; save(); renderPage(); return; }
  if (q('[data-clrreset]')) { S.settings.clear = { ...CLEAR_DEF }; save(); renderPage(); renderRail(); return; }
  if ((el = q('[data-rail]'))) {
    const k = el.dataset.rail; railCfg()[k] = !railCfg()[k]; save();
    renderMenu(); renderRail(); renderTop(); return;
  }
  if ((el = q('[data-bg]'))) { S.settings.bg = el.dataset.bg; save(); applyBg(); if (UI.cur.page === 'Configurações') renderPage(); return; }
  if ((el = q('[data-win]'))) { api.winCtl(el.dataset.win); return; }
  if (q('[data-togside]')) { S.settings.sideCollapsed = !S.settings.sideCollapsed; save(); renderSide(); tween('sideW', sideTarget()); return; }
  if ((el = q('[data-ph]'))) {
    const p = proj(el.dataset.ph);
    p.open = p.open === false; save();
    if (UI.cur.p !== p.id) { UI.cur = { p: p.id, page: 'Terminais' }; UI.last = p.id; UI.res = null; renderAll(); } else renderSide();
    return;
  }
  if ((el = q('[data-pmenu]'))) { UI.cur = { p: el.dataset.pmenu, page: UI.cur.p === el.dataset.pmenu ? UI.cur.page : 'Terminais' }; renderAll(); projectMenuFlow(); return; }
  if ((el = q('[data-step]'))) { // botões − e + do campo numérico
    const box = el.closest('.numf'), inp = box.querySelector('input');
    inp.value = Math.min(+box.dataset.max, Math.max(+box.dataset.min, (parseInt(inp.value, 10) || 0) + (+el.dataset.step)));
    inp.dispatchEvent(new Event('input', { bubbles: true })); return;
  }
  if ((el = q('[data-ract]'))) { resAct(el.dataset.ract, el.dataset.rk); return; }
  if ((el = q('[data-resscope]'))) { UI.res.scope = el.dataset.resscope; renderPage(); return; }
  if ((el = q('[data-resst]'))) { UI.res.st = el.dataset.resst; renderPage(); return; }
  if ((el = q('[data-resrefresh]'))) {
    const p = curProject(), kind = UI.cur.page;
    UI.res.files = null; UI.res.loadingFiles = false;
    if (kind === 'Plugins') resLoadPlugins(p, true);
    if (kind === 'MCPs') resLoadMcp(p, true);
    renderPage(); return;
  }
  if ((el = q('[data-go]'))) {
    const [p, pg] = el.dataset.go.split('|');
    UI.cur = { p, page: pg }; if (p !== '_') UI.last = p;
    UI.pop = false;
    if (RES_PAGES.includes(pg)) UI.res = null;
    if (pg === 'Integrações') UI.env = null;
    renderAll(); return;
  }
  if ((el = q('[data-reopen2]'))) { const p = curProject(); const t = p.tabs.find((x) => x.id === el.dataset.reopen2); if (t) { t.open = true; p.activeTab = t.id; save(); renderAll(); restartTab(p, t); } return; }
  if ((el = q('[data-switchmode]'))) { UI.menu = null; renderMenu(); const f = findTab(el.dataset.switchmode); if (f) switchMode(f.p, f.tab); return; }
  if ((el = q('[data-restart]'))) { UI.menu = null; renderMenu(); const f = findTab(el.dataset.restart); if (f) restartTab(f.p, f.tab); return; }
  if ((el = q('[data-newconv]'))) { const f = findTab(el.dataset.newconv); if (f) newConversation(f.p, f.tab); return; }
  if (q('[data-upd]')) { applyUpdate(); return; }
  if (q('[data-togact]')) {
    UI.actOpen = !UI.actOpen; UI.pop = false; hideToast();
    if (!UI.actOpen) markSeen(); // abriu e fechou: o que estava lá já foi visto, o selo do sino volta a 0
    renderTop(); renderPop(); tween('armW', armTarget()); return;
  }
  if ((el = q('[data-evdel]'))) { UI.events.splice(+el.dataset.evdel, 1); renderAct(); renderTop(); return; }
  if ((el = q('[data-evclr]'))) { const k = el.dataset.evclr; UI.events = k === 'all' ? [] : UI.events.filter((e) => (e.tabId || '_sys') !== k); renderAct(); renderTop(); return; }
  if ((el = q('[data-ntf]'))) { const [k, v] = el.dataset.ntf.split('|'); S.settings.notif[k] = v === '1'; save(); renderPage(); return; }
  if (q('[data-ntfreset]')) { S.settings.notif = { ...NOTIF_DEF }; save(); renderPage(); return; }
  if (q('[data-lim]')) { UI.pop = !UI.pop; renderPop(); return; }
  if ((el = q('[data-ev]'))) {
    const [i, k, id] = el.dataset.ev.split('|');
    UI.events[i].done = true; renderAct(); renderTop();
    const f = findTab(id);
    if (f && k === 'open') openTab(id);
    if (f && k === 'restart') restartTab(f.p, f.tab);
    if (f && k === 'newconv') newConversation(f.p, f.tab);
    return;
  }
  if (q('[data-newproj]')) return newProjectFlow();
  if (q('[data-import]')) return importFlow();
  if (q('[data-projmenu]')) return projectMenuFlow();
  if (q('[data-closedlist]')) return closedListFlow();
  if (q('[data-impsess]')) return importSessionsFlow(curProject());
  if (q('[data-recheck]')) { UI.env = null; renderPage(); return; }
  if ((el = q('[data-unarchive]'))) { proj(el.dataset.unarchive).archived = false; save(); renderAll(); return; }
});

document.addEventListener('contextmenu', (e) => {
  // clique direito num projeto (avatar da barra recolhida ou nome na barra aberta) = o mesmo menu do botão "⋯" (TASK-053)
  const pj = e.target.closest('.av[data-go], [data-ph]');
  if (pj) {
    const pid = pj.dataset.ph || String(pj.dataset.go || '').split('|')[0];
    if (pid && proj(pid)) {
      e.preventDefault(); UI.pop = false;
      UI.cur = { p: pid, page: UI.cur.p === pid ? UI.cur.page : 'Terminais' }; renderAll(); projectMenuFlow();
      return;
    }
  }
  const el = e.target.closest('[data-tab]');
  if (!el) { if (UI.menu) { UI.menu = null; renderMenu(); } return; }
  e.preventDefault();
  UI.pop = false;
  UI.menu = { type: 'tab', tabId: el.dataset.tab, x: e.clientX, y: e.clientY };
  renderMenu(); renderPop();
});

document.addEventListener('dblclick', (e) => {
  const el = e.target.closest('[data-tab]');
  if (!el || e.target.closest('[data-x]')) return;
  const f = findTab(el.dataset.tab);
  if (f) editTabFlow(f.tab);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && (UI.menu || UI.pop)) { UI.menu = null; UI.pop = false; renderMenu(); renderPop(); }
});

document.addEventListener('keydown', (e) => {
  const box = e.target.closest && e.target.closest('.numf');
  if (!box || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
  e.preventDefault();
  box.querySelector(`[data-step="${e.key === 'ArrowUp' ? 1 : -1}"]`).click();
});
document.addEventListener('focusout', (e) => {
  if (e.target.id === 'clrAlert') e.target.value = String(clearCfg().alert);
  if (e.target.id === 'ntfCache') e.target.value = String(notifCfg().cacheMin);
  if (e.target.id === 'ntfToast') e.target.value = String(notifCfg().toastSec);
});

document.addEventListener('input', (e) => {
  const id = e.target.id;
  if (id === 'resq' && UI.res) { UI.res.q = e.target.value; repaintRes(); return; }
  if (id === 'clrAlert' || id === 'clrClose' || id === 'clrResume') {
    const c = S.settings.clear;
    if (id === 'clrAlert') { const d = e.target.value.replace(/\D/g, '').slice(0, 3); if (d !== e.target.value) e.target.value = d; c.alert = Math.min(100, Math.max(0, parseInt(d, 10) || 0)); }
    else c[id === 'clrClose' ? 'closePrompt' : 'resumePrompt'] = e.target.value;
    save(); renderRail(); return;
  }
  if (id === 'ntfCache' || id === 'ntfToast') {
    const d = e.target.value.replace(/\D/g, '').slice(0, 2); if (d !== e.target.value) e.target.value = d;
    const n = parseInt(d, 10);
    if (id === 'ntfCache') S.settings.notif.cacheMin = Math.min(55, Math.max(1, n || 1)); else S.settings.notif.toastSec = Math.min(30, Math.max(2, n || 2));
    save(); return;
  }
  if (id !== 'rngOp') return;
  S.settings.termOp = +e.target.value;
  e.target.style.setProperty('--pct', `${(+e.target.value - 50) * 2}%`);
  $('#opv').textContent = `${e.target.value}%`;
  document.documentElement.style.setProperty('--term-op', S.settings.termOp / 100);
  save();
});

new ResizeObserver(() => { if (!tweening) fitActive(); }).observe($('#termHost'));
window.addEventListener('resize', fitActive);

// detecção de mudanças externas nos recursos (feitas pelo terminal): arquivos a cada 4 s, plugins a cada 12 s, MCPs a cada 60 s
let resTick = 0;
setInterval(async () => {
  const p = curProject();
  const kind = UI.cur.page;
  if (!p || UI.cur.p === '_' || mode() !== 'page' || !RES_PAGES.includes(kind) || !UI.res || !UI.res.files) return;
  resTick++;
  const data = await api.scan(p.path);
  const json = JSON.stringify(data);
  const changed = UI.res && json !== UI.res.filesJson;
  if (changed) { UI.res.files = data; UI.res.filesJson = json; }
  if (kind === 'Plugins' && resTick % 3 === 0) resLoadPlugins(p, true);
  if (kind === 'MCPs' && resTick % 15 === 0) resLoadMcp(p, true);
  if (changed) repaintRes();
}, 4000);

// dois modos: 'gradient' (Degradê) e 'blur' (Ofuscado); valores antigos 'acrylic'/'mica' contam como Ofuscado
const bgMode = () => (['blur', 'acrylic', 'mica'].includes(S.settings.bg) ? 'blur' : 'gradient');
/* ---------- moldura em "U": geometria do vidro ---------- */
const FR = { R: 22, RI: 14, HEAD: 46, BOT: 38, SIDE_OPEN: 252, SIDE_MINI: 70, ARM_OPEN: 346, ARM_CLOSED: 12 };
const GEO = { sideW: FR.SIDE_OPEN, armW: FR.ARM_CLOSED, bot: FR.BOT }; // bot fixo: a base de vidro não engrossa
const sideTarget = () => (S.settings.sideCollapsed ? FR.SIDE_MINI : FR.SIDE_OPEN);
const armTarget = () => (UI.actOpen ? FR.ARM_OPEN : FR.ARM_CLOSED);

// anel fechado: contorno externo arredondado + recorte (o terminal) com os quatro cantos suavizados
// telas que não são terminal nem chat (Plugins, Skills, MCPs, Consumo, Integrações, Configurações, sem projeto): sem recorte, contínuas com o vidro do app (TASK-042)
const flatMode = () => ['page', 'empty'].includes(mode());
function framePath(W, H, S_, A, flat) {
  const { R, RI, HEAD: h } = FR, b = GEO.bot;
  const outer = `M${R} 0H${W - R}A${R} ${R} 0 0 1 ${W} ${R}V${H - R}A${R} ${R} 0 0 1 ${W - R} ${H}H${R}A${R} ${R} 0 0 1 0 ${H - R}V${R}A${R} ${R} 0 0 1 ${R} 0Z`;
  const hole = `M${S_} ${h + RI}A${RI} ${RI} 0 0 1 ${S_ + RI} ${h}H${W - A - RI}A${RI} ${RI} 0 0 1 ${W - A} ${h + RI}V${H - b - RI}A${RI} ${RI} 0 0 1 ${W - A - RI} ${H - b}H${S_ + RI}A${RI} ${RI} 0 0 1 ${S_} ${H - b - RI}Z`;
  return flat ? outer : outer + hole;
}

function layout() {
  const f = $('#frame');
  const W = f.clientWidth, H = f.clientHeight;
  if (!W || !H) return;
  const flat = flatMode();
  if (flat !== document.body.classList.contains('flatpage')) { document.body.classList.toggle('flatpage', flat); setTimeout(() => { if (typeof fitActive === 'function') fitActive(); }, 0); } // o palco muda de altura: reajusta o terminal
  const d = framePath(W, H, GEO.sideW, GEO.armW, flat);
  $('#glass').style.clipPath = `path(evenodd, '${d}')`;
  $('#edgePath').setAttribute('d', d);
  document.documentElement.style.setProperty('--head', `${FR.HEAD}px`);
  $('#side').style.width = `${GEO.sideW}px`;
  $('#arm').style.width = `${GEO.armW}px`;
  $('#arm').classList.toggle('open', UI.actOpen && GEO.armW > 200);
  Object.assign($('#col').style, { left: `${GEO.sideW}px`, top: `${FR.HEAD}px`, right: `${GEO.armW}px`, bottom: `${flat ? 0 : GEO.bot}px` });
  Object.assign($('#appfoot').style, { left: `${GEO.sideW}px`, right: `${GEO.armW}px`, bottom: '0px', height: `${GEO.bot}px` }); // rodapé: dentro da base de vidro, sob o palco
}

let tweening = 0; // durante a animação: sem sombra pesada e sem refazer o tamanho do terminal a cada quadro
function tween(key, to, ms = 260) {
  const from = GEO[key], t0 = performance.now();
  tweening++; document.body.classList.add('moving');
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms), e = 1 - (1 - k) ** 3;
    GEO[key] = from + (to - from) * e;
    layout();
    if (k < 1) requestAnimationFrame(step); else { if (!--tweening) document.body.classList.remove('moving'); fitActive(); }
  };
  requestAnimationFrame(step);
}
window.addEventListener('resize', layout);

// WIN = tipo da janela definido na abertura ('none' transparente | 'acrylic' = Ofuscado); no Ofuscado o Windows desenha o vidro fosco
let WIN = 'none';
function applyWinShape() {
  const mat = WIN !== 'none';
  const mx = !!UI.maxed;
  document.body.classList.toggle('osmat', mat);
  document.body.classList.toggle('maxed', mx);
  FR.R = mx ? 0 : mat ? 8 : 22; // maximizado: tela cheia, sem margem nem cantos; com material: cantos do Windows 11 (~8 px)
  document.documentElement.style.setProperty('--R', FR.R + 'px');
}
async function applyBg() {
  const mode = bgMode();
  document.body.classList.toggle('mat', mode !== 'gradient');
  document.documentElement.style.setProperty('--p', mode === 'blur' ? '0.55' : '1'); // Ofuscado: mesmo degradê, mais leve (o Windows aparece desfocado por trás)
  const r = await api.setMaterial(mode === 'gradient' ? 'none' : 'acrylic');
  if (r && r.restart) {
    const m = await modal({ title: 'Reiniciar para aplicar', body: '<p>Trocar entre o Degradê e o Ofuscado muda o tipo da janela, então o Termix precisa reabrir. As sessões ativas serão encerradas (as conversas ficam guardadas e você pode restaurá-las ao reabrir).</p>', buttons: [['Depois', null], ['Reiniciar agora', 'ok', 'pri']] });
    if (m.value === 'ok') { clearTimeout(saveTimer); await api.saveState(S); api.relaunch(); }
  }
}

/* ---------- início ---------- */
(async function init() {
  const saved = await api.loadState();
  if (saved && Array.isArray(saved.projects)) S = { ...saved, settings: { termOp: 88, sideCollapsed: false, ...(saved.settings || {}) } };
  S.settings.rail = S.settings.rail && S.settings.rail.v === RAIL_DEF.v ? { ...RAIL_DEF, ...S.settings.rail } : { ...RAIL_DEF };
  S.settings.clear = { ...CLEAR_DEF, ...(S.settings.clear || {}), v: CLEAR_DEF.v };
  if (S.settings.clear.closePrompt === GENERIC_CLOSE) S.settings.clear.closePrompt = ''; // a versão 1 gravava o texto genérico; agora vazio = automático
  if (S.settings.clear.resumePrompt === GENERIC_RESUME) S.settings.clear.resumePrompt = '';
  S.settings.notif = { ...NOTIF_DEF, ...(S.settings.notif || {}), v: NOTIF_DEF.v };
  if (S.lastLimits && !UI.limits) UI.limits = S.lastLimits; // últimos limites de 5 h / 7 d conhecidos (vindos do chat ou de um terminal); janelas já vencidas não aparecem (liveWin)
  for (const p of S.projects) {
    p.tabs = p.tabs || [];
    if (!(await api.folderExists(p.path))) addEvent({ who: p.name, msg: `A pasta do projeto não foi encontrada: ${p.path}` });
  }
  const first = visibleProjects()[0];
  if (first) { UI.cur = { p: first.id, page: 'Terminais' }; UI.last = first.id; }
  WIN = (await api.appInfo()).winMode || 'none';
  applyWinShape(); applyBg();
  UI.maxed = await api.isMaximized();
  applyWinShape();
  api.onWinState(({ maximized }) => { UI.maxed = maximized; applyWinShape(); renderTop(); setTimeout(layout, 50); layout(); });
  GEO.sideW = sideTarget(); GEO.armW = armTarget();
  api.appVersion().then((v) => { APP_VER = v || ''; renderTop(); }).catch(() => {});
  api.onUpdate(onUpdateState);
  api.updateGet().then(onUpdateState).catch(() => {});
  api.updateJust().then((j) => { if (j) setTimeout(() => showUpdated(j), 1500); }).catch(() => {});
  renderAll();
  layout();
  (await api.allMetrics()).forEach(onMetric);
  const t0 = Date.now();
  await Promise.race([restoreOnOpen(), new Promise((ok) => setTimeout(ok, 8000))]); // teto: não trava a entrada se uma aba demorar
  await new Promise((ok) => setTimeout(ok, Math.max(0, 900 - (Date.now() - t0)))); // mínimo, para a animação não piscar
  const sp = $('#splash');
  sp.classList.add('out');
  setTimeout(() => sp.remove(), 500);
})();

// ao abrir: reabre sozinho as abas que estavam abertas quando o app foi fechado, uma de cada vez (a ativa do projeto atual primeiro) para não pesar
async function restoreOnOpen() {
  const cur = curProject();
  const rank = ({ p, t }) => (cur && p.id === cur.id ? (t.id === curTab(p)?.id ? 0 : 1) : 2);
  const pend = S.projects.flatMap((p) => p.tabs.filter((t) => t.live && t.open && !t.archived).map((t) => ({ p, t }))).sort((a, b) => rank(a) - rank(b));
  for (const { p, t } of pend) {
    if (RT[t.id] && RT[t.id].alive) continue;
    try { await launch(p, t, 'resume'); } catch { /* a aba mostra a própria falha */ }
    await new Promise((ok) => setTimeout(ok, 400));
  }
}


/* arrastar abas: pegue a aba e solte na nova posição; as outras abrem espaço na hora */
let tabDrag = null;
document.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  const el = e.target.closest('#tabsRow .tab');
  if (!el || e.target.closest('.x')) return;
  const els = [...document.querySelectorAll('#tabsRow .tab')];
  const from = els.indexOf(el);
  tabDrag = { el, els, rects: els.map((x) => x.getBoundingClientRect()), from, to: from, startX: e.clientX, on: false, pid: e.pointerId };
});
document.addEventListener('pointermove', (e) => {
  const d = tabDrag;
  if (!d) return;
  const dx = e.clientX - d.startX;
  if (!d.on) {
    if (Math.abs(dx) < 6) return;
    d.on = true; UI.tabDragging = true; document.getElementById('tabsRow').classList.add('tabdrag');
    try { d.el.setPointerCapture(d.pid); } catch { /* sem captura: segue assim mesmo */ }
    d.el.classList.add('dragging');
  }
  const r0 = d.rects[d.from], last = d.rects[d.rects.length - 1];
  const cdx = Math.max(d.rects[0].left - r0.left, Math.min(last.right - r0.right, dx)); // não sai do trilho das abas
  d.el.style.transform = `translateX(${cdx}px)`;
  const center = r0.left + r0.width / 2 + dx; // sem o limite do trilho: com abas de larguras diferentes, o limite impediria chegar à última posição
  let to = 0;
  d.rects.forEach((r, k) => { if (k !== d.from && r.left + r.width / 2 <= center + 1) to++; });
  d.to = to;
  const shift = r0.width + 2;
  const offs = d.els.map((x, k) => {
    if (k === d.from) return cdx;
    const o = d.from < to && k > d.from && k <= to ? -shift : d.from > to && k >= to && k < d.from ? shift : 0;
    x.style.transform = o ? `translateX(${o}px)` : '';
    return o;
  });
  // o recorte escuro da barra acompanha a aba ativa (colada no mouse se é ela que é arrastada; com a mesma animação das vizinhas se ela abre espaço)
  const bar = document.getElementById('tabsRow'), ai = d.els.findIndex((x) => x.classList.contains('active'));
  if (ai >= 0) {
    bar.classList.toggle('tabdrag-follow', ai === d.from);
    fuseBar(bar, offs[ai]);
  }
});
function endTabDrag() {
  const d = tabDrag;
  tabDrag = null;
  if (!d || !d.on) return;
  UI.tabDragging = false;
  document.getElementById('tabsRow').classList.remove('tabdrag', 'tabdrag-follow');
  d.els.forEach((x) => { x.style.transform = ''; x.classList.remove('dragging'); });
  UI.justDragged = true; setTimeout(() => { UI.justDragged = false; }, 60); // evita que o clique do soltar selecione/abra a aba
  if (d.to !== d.from) reorderTabs(curProject(), d.from, d.to);
  else renderTabs(); // refaz o que ficou adiado durante o arraste e devolve o recorte ao lugar
}
document.addEventListener('pointerup', endTabDrag);
document.addEventListener('pointercancel', endTabDrag);

setInterval(() => { if (mode() === 'noterm') renderPage(); }, 15000);
