'use strict';
const api = window.termix;

const DEFAULT_COLOR = '#3B82F6'; // cor principal do sistema (azul): toda aba nova começa com ela
const COLORS = ['#3B82F6', '#7C8CFF', '#34D399', '#F472B6', '#FBBF24', '#22D3EE', '#FB923C', '#A78BFA', '#F87171', '#84CC16', '#38BDF8'];
const GRADS = [['#60a5fa', '#22d3ee'], ['#94a3b8', '#64748b'], ['#38bdf8', '#6366f1'], ['#a5b4fc', '#60a5fa'], ['#67e8f9', '#34d399']];
const GLOBALS = [['Consumo', 'gauge'], ['Integrações', 'link'], ['Configurações', 'gear']];
// o desenho de cada ícone ocupa uma parte diferente do quadro (a engrenagem é grande, o link é pequeno): o tamanho de cada um é ajustado para os três terem o mesmo peso visual (~13 px de desenho)
const GLOBAL_ICON = { gauge: 19, link: 21, gear: 16 };
const gIc = (name, base) => ic(name, Math.round(base * (GLOBAL_ICON[name] || 19) / 19 * 10) / 10);
const SUBS = [['Terminais', 'sterm'], ['Conectores', 'splug'], ['Código', 'scode']];

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
  panel: '<rect x="3" y="3.5" width="18" height="17" rx="3"/><path d="M9 3.5v17"/>',
  newchat: '<path d="M12 3H6a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3v-6"/><path d="M18.4 2.6a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/>',
  newwf: '<rect x="3" y="3" width="8" height="8" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h2"/><path d="M17 13v8M13 17h8"/>',
  bubble: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  wfnodes: '<rect x="3" y="3" width="8" height="8" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect x="13" y="13" width="8" height="8" rx="2"/>',
  sterm: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m7.5 10 2.5 2-2.5 2M12.5 15h4"/>',
  splug: '<path d="M12 21v-4.5M9 7.5V3M15 7.5V3"/><path d="M18 7.5v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4v-5z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  bell: '<path d="M6 10a6 6 0 0 1 12 0c0 4.6 1.8 6 1.8 6H4.2S6 14.6 6 10z"/><path d="M10 19.2a2.2 2.2 0 0 0 4 0"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  terminal: '<path d="M7.5 4.5h10a3.5 3.5 0 0 1 3.5 3.5v8"/><rect x="3" y="8" width="15" height="12" rx="3"/><path d="M7 12.4l2.4 1.9L7 16.2M11.6 16.4h3"/>',
  plug: '<path d="M9 3.5v4M15 3.5v4"/><path d="M6.5 7.5h11v3.2a5.5 5.5 0 0 1-11 0V7.5z"/><path d="M12 16.2v4.3"/>',
  workflow: '<rect x="3" y="4" width="6" height="6" rx="1.6"/><rect x="15" y="14" width="6" height="6" rx="1.6"/><path d="M9 7h3.5a2.5 2.5 0 0 1 2.5 2.5V14"/>',
  shield: '<path d="M12 3l7 3v5.5c0 4.2-2.9 7.6-7 9.5-4.1-1.9-7-5.3-7-9.5V6l7-3z"/><path d="M9 12l2.2 2.2L15.2 10"/>',
  bolt: '<path d="M13 3L5.5 13.2H11L10 21l8.5-10.5H13L13 3z"/>',
  folder: '<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.2h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7.5z"/>',
  archive: '<rect x="3.5" y="4.5" width="17" height="4" rx="1.4"/><path d="M5 8.5V18a1.6 1.6 0 0 0 1.6 1.6h10.8A1.6 1.6 0 0 0 19 18V8.5M10 12.5h4"/>',
  trash: '<path d="M4.5 7h15M9.5 7V5h5v2M6.5 7l.8 11.2a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5L17.5 7M10 11v5M14 11v5"/>',
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
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  filter: '<path d="M4 5.5h16l-6 7.2v5.3l-4 2v-7.3z"/>',
  sort: '<path d="M8 4.5v15M4.5 16l3.5 3.5 3.5-3.5M16 19.5v-15M12.5 8l3.5-3.5L19.5 8"/>',
  save: '<path d="M5 4.5h11l3 3v12H5z"/><path d="M8 4.5v5h7v-5M8 19.5v-6h8v6"/>',
};
// Embutido no Hub: os ícones em comum (barra lateral, mais, check, fechar, terminal, sino) usam os mesmos desenhos do Hub.
if (window.termixEmbed) Object.assign(ICONS, {"panel": "<rect x=\"3.5\" y=\"4.5\" width=\"17\" height=\"15\" rx=\"3\"/><path d=\"M9.5 4.5v15\"/>", "plus": "<path d=\"M12 5v14M5 12h14\"/>", "check": "<path d=\"m5 12.5 4.5 4.5L19 7.5\"/>", "x": "<path d=\"M18 6 6 18M6 6l12 12\"/>", "terminal": "<path d=\"m4 17 6-6-6-6M12 19h8\"/>", "bell": "<path d=\"M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9\"/><path d=\"M10.3 21a1.94 1.94 0 0 0 3.4 0\"/>", "minus": "<path d=\"M5 12h14\"/>"}); // mesmos desenhos do Hub
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
document.addEventListener('input', (e) => { if (e.target.id === 'npName' && UI.np) UI.np.name = e.target.value; if (e.target.id === 'npUrl' && UI.np) { UI.np.url = e.target.value; UI.np.err = ''; } }); // o nome digitado na tela de novo projeto sobrevive a redesenhos
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
  if (EMBED) api.hubEvento({ id: UI.events[0].id, tabId: ev.tabId, quem: ev.who, tipo: ev.kind, msg: ev.msg, ts: UI.events[0].ts }); // dentro do Hub: quem mostra é o Hub (sino e aviso do Windows)
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
  if (EMBED || !cfg.toast || UI.actOpen) return; // embutido: o aviso curto é do Hub
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
  toastEl.title = `${ev.who}: ${ev.msg}`; // a mensagem na dica é cortada em uma linha; o texto inteiro aparece ao passar o mouse
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
// Tema claro do Hub (atributo data-hub-theme na raiz): texto escuro e cores ANSI com contraste sobre fundo claro.
const LIGHT_ANSI = { black: '#2a2926', red: '#b3261e', green: '#1f7a46', yellow: '#8a5a00', blue: '#1d4ed8', magenta: '#8e24aa', cyan: '#0e7490', white: '#5c5a54',
  brightBlack: '#6b6862', brightRed: '#d32f2f', brightGreen: '#2e7d32', brightYellow: '#a16207', brightBlue: '#2563eb', brightMagenta: '#a21caf', brightCyan: '#0891b2', brightWhite: '#18181a' };
const isLightHub = () => document.documentElement.dataset.hubTheme === 'light';
function termTheme() {
  if (isLightHub()) return { ...LIGHT_ANSI, background: 'rgba(0,0,0,0)', foreground: '#18181a', cursor: '#1d4ed8', selectionBackground: 'rgba(59,130,246,.30)', scrollbarSliderBackground: 'rgba(15,23,42,.18)', scrollbarSliderHoverBackground: 'rgba(15,23,42,.32)', scrollbarSliderActiveBackground: 'rgba(15,23,42,.42)' };
  return { background: 'rgba(0,0,0,0)', foreground: '#ececea', cursor: '#60befa', selectionBackground: 'rgba(59,130,246,.38)', scrollbarSliderBackground: 'rgba(255,255,255,.14)', scrollbarSliderHoverBackground: 'rgba(255,255,255,.28)', scrollbarSliderActiveBackground: 'rgba(255,255,255,.38)' };
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
  if (!p || (UI.cur.page !== 'Terminais' && !dockOn())) return;
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
  const rl = data.rate_limits;
  if (rl && (!UI.limits || data.updated >= UI.limits.updated)) {
    const w = (x) => (x && typeof x.used_percentage === 'number' ? { pct: x.used_percentage, resets: x.resets_at } : null);
    UI.limits = { five: w(rl.five_hour), week: w(rl.seven_day), updated: data.updated };
  }
  renderTop(); renderRail();
  if (UI.pop) renderPop();
  if (UI.cur.p === '_' && UI.cur.page === 'Consumo') consLimits();
}
api.onMetrics(onMetric);
setInterval(() => { renderTop(); }, 30000); // atualiza "renova em" e "atualizado há"

// estado da aba pelos hooks do Claude Code (exato). Sem hooks (node ausente ou hooks bloqueados), vale a heurística abaixo.
// tela Código com o painel de terminais embaixo (como o VS Code): as abas e a sessão da aba ativa aparecem sob o editor
const dockOn = () => { const p = curProject(); return !!p && UI.cur.p !== '_' && UI.cur.page === 'Código' && p.kind !== 'workflow' && !!curTab(p) && codeState(p).term !== false; };
const tabVisible = (p, tab) => UI.cur.p === p.id && (UI.cur.page === 'Terminais' || dockOn()) && curTab(p) && curTab(p).id === tab.id;

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
// Hub (tela Início): abre um chat novo no projeto atual e envia a primeira mensagem. Se o app ainda estiver carregando, tenta de novo por alguns segundos.

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
      break;
    case 'SessionStart':
      setSt(tab, 'wait');
      if (data.source === 'clear') { r.term.write('\x1b[2J\x1b[3J\x1b[H'); api.write(tab.id, '\x0c'); } // apaga a tela e o histórico visível e pede o redesenho (Ctrl+L)
      if (r.flow && r.flow.step === 'clearing' && data.source === 'clear') {
        const fl = r.flow;
        r.flow = null;
        addEvent({ c: tab.color, who: tab.name, msg: fl.chars ? `Contexto limpo · resumo de ${fl.chars} caracteres (~${fmtTok(Math.round(fl.chars / 3.4))} tokens) entregue ao agente` : 'Contexto limpo' });
        renderRail();
      }
      break;
    case 'Stop':
      setSt(tab, 'wait');
      notifyTab(p, tab, 'done', lastLine(data.last) || 'Terminou · aguarda você');
      break;
    case 'Notification':
      setSt(tab, 'wait');
      notifyTab(p, tab, 'perm', data.message || 'Precisa da sua atenção');
      break;
  }
});

/* ---------- botão Clear (alternador): limpa o contexto e entrega ao agente o resumo da conversa (TASK-117) ---------- */
const CLEAR_DEF = {
  v: 3, alert: 15, // alert: % de contexto a partir do qual o botão pulsa (0 = nunca)
  template: null, // modelo do resumo entregue ao agente depois do Clear: null = o padrão do app; '' = só limpar, sem resumo
};
let HANDOFF_DEF = ''; // modelo padrão do resumo (vem do processo principal, que o usa para montar o resumo)
const clearCfg = () => S.settings.clear || CLEAR_DEF;
const clearTemplate = () => (typeof clearCfg().template === 'string' ? clearCfg().template : null);
const connCfg = () => S.settings.connectors || { v: 1, newProject: 'auto' };
const typeTo = (tab, text) => { api.write(tab.id, text); setTimeout(() => api.write(tab.id, '\r'), 150); };
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
const clearModal = () => ({
  title: 'Limpar o contexto?',
  body: clearTemplate() === '' ? '<p>O Termix limpa a conversa e começa uma <b>conversa nova, sem resumo</b> (o modelo do resumo está vazio em Configurações). A conversa atual continua guardada pelo Claude Code.</p>'
    : '<p>O Termix limpa a conversa e já entrega ao agente um <b>resumo do ponto em que vocês estavam</b> (último pedido, arquivos alterados, git e tarefa ativa), para ele continuar sem reler o projeto. A conversa atual continua guardada pelo Claude Code. O modelo do resumo pode ser editado em Configurações.</p>',
  buttons: [['Cancelar', null], ['Confirmar', 'ok', 'pri']],
});
async function clearFlow() {
  const p = curProject(), tab = p && curTab(p), r = tab && RT[tab.id];
  if (tab && tab.kind === 'chat') return chatClearFlow(p, tab);
  if (!r || !r.alive || r.st !== 'wait' || r.flow) return;
  const c = await modal(clearModal());
  if (c.value !== 'ok' || !r.alive || r.st !== 'wait' || r.flow) return;
  doClearNative(p, tab);
}
// o app monta o resumo, deixa gravado e dá o /clear; o hook de início de sessão (hook-wrapper) o entrega ao agente. Nenhuma volta do Claude.
async function doClearNative(p, tab) {
  const r = RT[tab.id], tpl = clearTemplate();
  r.flow = { step: 'preparing', t0: Date.now() }; renderRail();
  let h = null;
  if (tpl === '') api.handoffDrop(tab.id); else h = await api.handoffPrepare({ tabId: tab.id, cwd: p.path, sessionId: tab.sessionId, template: tpl });
  if (!r.alive || r.st !== 'wait' || !r.flow || r.flow.step !== 'preparing') { api.handoffDrop(tab.id); if (r.flow && r.flow.step === 'preparing') { r.flow = null; renderRail(); } return; }
  r.flow = { step: 'clearing', t0: Date.now(), chars: h && h.ok ? h.chars : 0 };
  typeTo(tab, '/clear');
  renderRail();
}
function clearTick(tab) { // chamado a cada 700 ms para cada aba viva: desiste se o /clear não chegou ao agente
  const r = RT[tab.id], f = r.flow;
  if (f && f.step === 'clearing' && Date.now() - f.t0 > 12000) { api.handoffDrop(tab.id); r.flow = null; renderRail(); }
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
    root.innerHTML = `<div class="modal"><div class="dlg glass" role="dialog" aria-modal="true"><div class="dh"><h2>${title}</h2><button class="mclose" data-mclose title="Fechar (Esc)" aria-label="Fechar">${ic('x', 16)}</button></div>${body}<div class="foot2">${buttons.map(([l, , c], i) => `<button class="btn ${c || ''}" data-mb="${i}">${l}</button>`).join('')}</div></div></div>`;
    const collect = () => { const f = {}; root.querySelectorAll('[data-f]').forEach((i) => { f[i.dataset.f] = i.value; }); return f; };
    const done = (v) => { const form = collect(); const picked = [...root.querySelectorAll('[data-sid]:checked')].map((i) => i.dataset.sid); root.innerHTML = ''; resolve({ value: v, form, picked }); fitActive(); try { if (prevFocus && prevFocus.isConnected && prevFocus.focus) prevFocus.focus(); } catch { /* sem foco para devolver */ } };
    root.querySelectorAll('[data-mb]').forEach((b) => { b.onclick = () => done(buttons[+b.dataset.mb][1]); });
    root.querySelector('[data-mclose]').onclick = () => done(null);
    // clicar fora NÃO fecha (perderia o que foi digitado): só um balanço discreto lembra que o modal espera Esc ou o X
    root.firstElementChild.onclick = (e) => { if (e.target !== root.firstElementChild) return; const d = root.querySelector('.dlg'); d.classList.remove('nudge'); void d.offsetWidth; d.classList.add('nudge'); };
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

/* ---------- novidades da versão (patch notes) ----------
   Ao abrir depois de uma atualização, mostra o que entrou de novo, o que melhorou e o que foi corrigido (texto em patchnotes.js).
   Primeira instalação (sem estado salvo) não mostra; quem pulou versões vê todas as que perdeu. Clicar na versão no cabeçalho abre de novo. */
const verCmp = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < 3; i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; };
function patchBody(entries) {
  const sec = (label, list, cls) => (list && list.length ? '<div class="pn-sec ' + cls + '"><h3>' + label + '</h3><ul>' + list.map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul></div>' : '');
  return '<div class="pn">' + entries.map((e) => '<section class="pn-ver"><div class="pn-h"><b>Versão ' + esc(e.v) + '</b><span>' + esc(e.date || '') + '</span></div>' + (e.resumo ? '<p>' + esc(e.resumo) + '</p>' : '') + sec('Novo', e.novo, 'n') + sec('Melhorado', e.melhorado, 'm') + sec('Corrigido', e.corrigido, 'c') + '</section>').join('') + '</div>';
}
async function showPatchNotes(entries) {
  if (!entries || !entries.length) return;
  const title = entries.length === 1 ? 'Novidades da versão ' + esc(entries[0].v) : 'Novidades do Termix';
  await modal({ title, body: patchBody(entries), buttons: [['Entendi', 'ok', 'pri']] });
}
async function maybeShowPatchNotes(hadState) {
  try {
    const ver = (await api.appVersion()) || '';
    if (!ver || typeof PATCH_NOTES === 'undefined') return;
    const seen = S.lastSeenVersion;
    if (seen === ver) return;
    S.lastSeenVersion = ver; save();
    if (!seen && !hadState) return; // primeira instalação: nada para contar
    const list = PATCH_NOTES.filter((e) => verCmp(e.v, ver) <= 0 && (seen ? verCmp(e.v, seen) > 0 : e.v === ver)).sort((a, b) => verCmp(b.v, a.v));
    await showPatchNotes(list);
  } catch { /* as novidades nunca atrapalham a abertura */ }
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
const railCfg = () => {
  const c = S.settings.rail || RAIL_DEF;
  // embutido (TASK-135): só os anéis, sem a barra de consumo no topo; na primeira vez liga todos (depois vale a escolha do usuário)
  if (EMBED && !S.settings.railEmbed) { Object.assign(c, { on: true, ctx: true, h5: true, d7: true, cache: true }); S.settings.railEmbed = 1; }
  return c;
};
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
  const ctx = cp !== null
    ? ring('CTX', cp, Math.round(cp), `Contexto · ${Math.round(cp)}%`, (cw.total_input_tokens ? `${fmtTok(cw.total_input_tokens)}${cw.context_window_size ? ` de ${fmtTok(cw.context_window_size)}` : ''} tokens` : 'desta conversa'))
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
  if (p.kind === 'workflow') { wfEnsure(p); return p.wfStarted ? 'term' : 'workflow'; } // Workflow: tela limpa com "Começar Brainstorm"; depois, os dois chats fixos
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
  const topHtml = `<div class="brand"><img class="logo" src="../../assets/logo-mark.svg" alt="">Termix<span class="ver" data-patch title="Versão instalada do Termix (clique para ver as novidades)">${APP_VER ? 'v' + esc(APP_VER) : ''}</span></div><span class="sp"></span>
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

/* Barra lateral (TASK-080): três faixas. Cabeçalho e rodapé "Geral" ficam parados; só a lista de projetos (.sscroll) rola.
   Aberta e recolhida usam o mesmo estado (p.open) e o mesmo clique: clicar no projeto mostra/esconde as subtelas dele. */
const subsOf = (p, mini, isCur) => (mini
  ? SUBS.map(([n, i]) => `<button class="ci sub ${isCur(p.id, n) ? 'active' : ''}" data-go="${p.id}|${n}" data-tip="${n}">${ic(i, 17)}</button>`).join('')
  : SUBS.map(([n, i]) => `<button class="item ${isCur(p.id, n) ? 'active' : ''}" data-go="${p.id}|${n}"><span class="ico">${ic(i, 17)}</span>${n}${n === 'Terminais' && openTabs(p).length ? `<span class="cnt ${openTabs(p).some((t) => RT[t.id] && RT[t.id].unread) ? 'att' : ''}">${openTabs(p).length}</span>` : ''}</button>`).join(''));

// cor do ponto de estado do projeto (sinal novo > trabalhando > aguardando) e letra do avatar: iguais na barra aberta e na recolhida
function projDot(p) {
  const ts = openTabs(p);
  return ts.some((t) => RT[t.id] && RT[t.id].unread) ? 'var(--warn)' : ts.some((t) => stOf(t) === 'work') ? 'var(--work)' : ts.some((t) => stOf(t) === 'wait') ? 'var(--ok)' : '';
}
const projLetter = (p) => esc(p.name.trim()[0] ? p.name.trim()[0].toUpperCase() : '?');

// pastas da barra lateral (Chats e Workflows): abertas por padrão; a escolha fica salva
const catOpen = (k) => !(S.settings.sideCats && S.settings.sideCats[k] === false);
const setCatOpen = (k, v) => { S.settings.sideCats = { ...(S.settings.sideCats || {}), [k]: v }; };
function renderSide() {
  hideSideTip(); // a barra é redesenhada: o ícone sobre o qual estava o mouse pode ter saído
  const col = S.settings.sideCollapsed;
  const side = $('#side');
  const keep = side.querySelector('.sscroll'), same = side.dataset.mode === (col ? 'mini' : 'open');
  const top = keep && same ? keep.scrollTop : 0; // a rolagem da lista não volta ao topo a cada redesenho (só ao trocar de modo)
  side.dataset.mode = col ? 'mini' : 'open';
  side.classList.toggle('mini', col);
  const all = visibleProjects();
  const cp = curProject();
  if (cp && UI.kindFor !== cp.id) { UI.kindFor = cp.id; S.settings.sideKind = kindOf(cp); setCatOpen(kindOf(cp), true); } // abriu outro projeto (por aviso, por exemplo): a pasta dele (Chats ou Workflows) abre
  const onNew = UI.cur.p === '_' && /^Novo /.test(UI.cur.page);
  const CATS = [['chat', 'Projetos', 'bubble', 'Nenhum projeto ainda.'], ['workflow', 'Mutirão', 'wfnodes', 'Nenhum mutirão ainda.']];
  const byKind = (k) => all.filter((p) => kindOf(p) === k);
  // DEV2-023: a pasta "Mutirão" lista os mutirões (projetos com o Mutirão do dono, que continuam também em "Projetos"; o resumo vem do módulo) e os Workflows antigos, como antes
  const MS = (window.TermixMut && window.TermixMut.status) || {}, muts = all.filter((p) => kindOf(p) !== 'workflow' && MS[p.id]);
  const catLen = (k) => byKind(k).length + (k === 'workflow' ? muts.length : 0);
  const mutK = (p) => { const s = MS[p.id]; return s && s.publicado && s.contado ? `${s.k}/${s.n}` : ''; };
  const mutTip = (p) => { const s = MS[p.id]; return `${p.name} · ${s && s.fase ? s.fase.l : 'Mutirão'}`; };
  const mutAv = (p) => `--c1:${GRADS[(p.g || 0) % GRADS.length][0]};--c2:${GRADS[(p.g || 0) % GRADS.length][1]}`;
  const mutMini = (p) => `<div class="pg"><button class="av" style="${mutAv(p)}" data-mutgo="${p.id}" data-tip="${esc(mutTip(p))}">${projLetter(p)}</button></div>`;
  const mutOpen = (p) => `<div class="proj"><div class="prow"><button class="ph" data-mutgo="${p.id}" title="${esc(mutTip(p))}"><span class="pav" style="${mutAv(p)}">${projLetter(p)}</span><span class="pn">${esc(p.name)}</span>${mutK(p) ? `<small class="mutk">${mutK(p)}</small>` : ''}</button></div></div>`;
  const newBtns = col
    ? `<div class="snew mini"><button class="ci add nw ${onNew && UI.cur.page === 'Novo chat' ? 'active' : ''}" data-newk="chat" data-tip="Novo projeto">${ic('newchat', 18)}</button><button class="ci add nw ${onNew && UI.cur.page === 'Novo workflow' ? 'active' : ''}" data-newk="workflow" data-tip="Novo mutirão">${ic('newwf', 18)}</button></div>`
    : `<div class="snew"><button class="nw ${onNew && UI.cur.page === 'Novo chat' ? 'active' : ''}" data-newk="chat">${ic('newchat', 16)}<span>Novo projeto</span></button><button class="nw ${onNew && UI.cur.page === 'Novo workflow' ? 'active' : ''}" data-newk="workflow">${ic('newwf', 16)}<span>Novo mutirão</span></button></div>`;
  const isCur = (p, n) => UI.cur.p === p && UI.cur.page === n;
  const toggle = `<button class="tbtn" data-togside title="${col ? 'Abrir' : 'Fechar'} barra lateral">${ic('panel', 19)}</button>`;
  const projMini = (p) => {
    const g = GRADS[(p.g || 0) % GRADS.length];
    const n = openTabs(p).length;
    const dotc = projDot(p), letter = projLetter(p);
    return `<div class="pg ${p.open !== false && UI.cur.p === p.id ? 'open' : ''}" data-pid="${p.id}"><button class="av ${UI.cur.p === p.id ? 'active' : ''}" style="--c1:${g[0]};--c2:${g[1]}" data-pt="${p.id}" data-go="${p.id}|${UI.cur.p === p.id ? UI.cur.page : 'Terminais'}" data-tip="${esc(p.name)}">${letter}${n ? `<span class="b">${n}</span>` : ''}${dotc ? `<span class="st" style="background:${dotc}"></span>` : ''}</button>
        <div class="subs"><div class="subs-in"><div class="tray">${subsOf(p, true, isCur)}</div></div></div></div>`;
  };
  const projOpen = (p) => `<div class="proj ${p.open !== false ? 'open' : ''}" data-pid="${p.id}">
        <div class="prow"><button class="ph" data-ph="${p.id}"><span class="pav" style="--c1:${GRADS[(p.g || 0) % GRADS.length][0]};--c2:${GRADS[(p.g || 0) % GRADS.length][1]}">${projLetter(p)}${projDot(p) ? `<span class="st" style="background:${projDot(p)}"></span>` : ''}</span><span class="pn">${esc(p.name)}</span><span class="chev">${ic('chevr', 12)}</span></button><button class="pm" data-pmenu="${p.id}" title="Gerenciar projeto">${ic('dots', 16)}</button></div>
        <div class="subs"><div class="subs-in"><div class="subs-pad">${subsOf(p, false, isCur)}</div></div></div></div>`;
  if (col) {
    // barra recolhida: cada categoria é um ícone (como uma pasta); selecionar abre/fecha a lista de projetos dela logo abaixo
    const list = CATS.map(([k, label, icon]) => { const ps = byKind(k), open = catOpen(k);
      return `<div class="mcat ${open ? 'open' : ''}" data-cat="${k}"><button class="ci ksel ${open ? 'sel' : ''}" data-sidecat="${k}" data-tip="${label} (${catLen(k)})">${ic(icon, 17)}</button>${open ? (k === 'workflow' ? muts.map(mutMini).join('') : '') + ps.map(projMini).join('') : ''}</div>`; }).join('');
    side.innerHTML = `<div class="shead">${toggle}<span class="rsep"></span></div>
      ${newBtns}
      <span class="rsep"></span>
      <div class="sscroll">${list}</div>
      <div class="sfoot"><span class="rsep"></span>${GLOBALS.map(([n, i]) => `<button class="ci ${isCur('_', n) ? 'active' : ''}" data-go="_|${n}" data-tip="${n}">${gIc(i, 19)}</button>`).join('')}</div>`;
  } else {
    // barra aberta: hierarquia de pastas. Chats e Workflows são as pastas; dentro de cada uma ficam os projetos, e dentro deles as funções
    const body = CATS.map(([k, label, icon, none]) => { const ps = byKind(k), open = catOpen(k);
      return `<div class="cat ${open ? 'open' : ''}" data-cat="${k}">
        <button class="chead" data-sidecat="${k}"><span class="chev">${ic('chevr', 12)}</span>${ic(icon, 16)}<span class="cn">${label}</span><small>${catLen(k)}</small></button>
        <div class="subs"><div class="subs-in"><div class="cbody">${catLen(k) ? (k === 'workflow' ? muts.map(mutOpen).join('') : '') + ps.map(projOpen).join('') : `<p class="meta sempty">${none}</p>`}</div></div></div></div>`; }).join('');
    side.innerHTML = `<div class="shead2"><span class="label">Projetos</span>${toggle}</div>
      ${newBtns}
      <div class="sscroll">${body}</div>
      <div class="sfoot"><div class="label">Geral</div>
      ${GLOBALS.map(([n, i]) => `<button class="item ${isCur('_', n) ? 'active' : ''}" data-go="_|${n}"><span class="ico">${gIc(i, 17)}</span>${n}</button>`).join('')}</div>`;
  }
  const sc = side.querySelector('.sscroll'); if (sc) { sc.scrollTop = top; sc.scrollLeft = 0; }
  side.scrollLeft = 0; // o painel é só vertical: nunca fica deslocado para o lado (o conteúdo aberto é mais largo que a barra no meio da animação)
  if (UI.sideCur !== UI.cur.p || !same) { // mudou de projeto (ou de modo): traz o projeto atual para a vista
    UI.sideCur = UI.cur.p;
    const cur = side.querySelector(`[data-pid="${UI.cur.p}"]`); if (cur && !side.classList.contains('anim')) cur.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}

// barra aberta: clicar na setinha do projeto só abre/fecha o dropdown das funções dele, sem sair da tela atual
function projToggle(id) {
  const p = proj(id);
  if (!p) return;
  p.open = p.open === false; save();
  const el = document.querySelector(`#side [data-pid="${p.id}"]`);
  if (el) el.classList.toggle('open', p.open !== false); else renderSide();
}

// clique num projeto (avatar da barra recolhida; a barra aberta usa projToggle ou avatar na recolhida): outro projeto = vai até ele e abre as subtelas; o projeto atual = mostra/esconde as subtelas (mesmo efeito nas duas barras)
function projClick(id) {
  const p = proj(id);
  if (!p) return;
  if (UI.cur.p !== p.id) { p.open = true; UI.cur = { p: p.id, page: 'Terminais' }; UI.last = p.id; UI.res = null; save(); renderAll(); return; }
  p.open = p.open === false; save();
  const el = document.querySelector(`#side [data-pid="${p.id}"]`); // troca a classe no lugar (sem redesenhar) para a animação rodar
  if (el) el.classList.toggle('open', p.open !== false); else renderSide();
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
  if (!p || (mode() !== 'term' && !dockOn())) { $('#tabsRow').innerHTML = ''; $('#sess').classList.remove('working'); $('#tabsRow').classList.remove('working'); return; }
  const cur = curTab(p);
  const closed = p.tabs.filter((t) => !t.open && !t.archived).length;
  const wf = p.kind === 'workflow'; // Workflow: as duas guias são fixas (sem fechar, sem nova guia); o split é sempre lado a lado
  const st = stOf(cur), [sc, sl] = STATES[st];
  if (document.hasFocus() && RT[cur.id]) RT[cur.id].unread = null; // a aba à vista, com o app em foco, já foi vista
  $('#sess').style.setProperty('--tc', cur.color);
  $('#sess').classList.toggle('working', st === 'work');
  $('#tabsRow').classList.toggle('working', st === 'work');
  $('#tabsRow').innerHTML = openTabs(p).map((t) => `<button class="tab ${t.id === cur.id ? 'active' : ''}" style="--c:${t.color}" data-tab="${t.id}" title="${esc(t.name)} · ${STATES[stOf(t)][1]} — clique duplo para renomear ou mudar a cor"><i class="dot ${STATES[stOf(t)][0]}"></i><span class="nm">${esc(t.name)}</span>${RT[t.id] && RT[t.id].unread ? `<span class="bd bd-${RT[t.id].unread}" title="${KIND_TITLE[RT[t.id].unread]}"></span>` : ''}${wf ? '' : `<span class="x" data-x="${t.id}">${ic('x', 13)}</span>`}</button>`).join('')
    + (wf ? '' : `<button class="plus" data-newtab="${chatNewKey()}" title="${chatCfg().mode === 'chat' ? 'Novo chat (Claude Code)' : 'Novo terminal (Claude Code)'}">${ic('plus', 17)}</button><button class="plus chev2" data-menu="new" title="Escolher a ferramenta">${ic('chevd', 14)}</button>`) + `
    <span class="sp"></span>
    <div class="tctl">
      ${closed && !wf ? `<button class="linkbtn" data-closedlist>Fechadas (${closed})</button>` : ''}
      <span class="state"><i class="dot ${sc}"></i>${sl}</span>
    </div>`;
  fuseBar($('#tabsRow'));
}

function emptyHTML() {
  return `<div class="empty"><h2>Comece criando um projeto</h2><p>O Termix cria a pasta do projeto para você, ou registra uma pasta que você já tem — sem copiar nem mover nada.</p>
    <div class="row2"><button class="btn pri" data-newk="chat">+ Chat</button><button class="btn pri" data-newk="workflow">+ Workflow</button><button class="btn" data-import>Importar pasta existente</button></div></div>`;
}
const ptitle = (t) => `<div class="ptitle"><span>${UI.cur.p === '_' ? 'Geral' : esc(curProject().name)} ›</span> ${t}</div>`;

/* ---------- Conectores: plugins, skills e MCPs numa tela só (TASK-127, sobre a TASK-013: ver tudo e controlar) ---------- */
const RES_PAGES = ['Conectores'];
const PL_SCOPE = { user: 'Usuário', project: 'Projeto', local: 'Local', synced: 'Sincronizado' };
const RESC = {}; // por projeto: plugins e estado dos MCPs lidos pela CLI (aparecem na hora e atualizam por trás) e aviso de reinício
const safeTarget = (t) => (!t ? '' : /^https?:/i.test(t) ? t.replace(/[?#].*$/, '') : t.split(/\s+/)[0]); // sem argumentos (podem ter chaves)
const fmtTokPt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')} mil` : String(n)); // preciso, para somar custos
const plShort = (id) => String(id || '').split('@')[0];
const mkOf = (id) => String(id || '').split('@')[1] || '';
const OFFICIAL_MK = ['claude-plugins-official', 'anthropic-plugin-directory'];
const CON_TYPE = { plugin: ['Plugin', 'P'], skill: ['Skill', 'S'], mcp: ['MCP', 'M'] };
const CON_GROUPS = [
  ['acc', 'Da sua conta claude.ai', 'Conectores ligados na sua conta: aqui você liga, desliga e entra.'],
  ['anth', 'Da Anthropic', 'Plugins dos marketplaces oficiais e o que vem neles.'],
  ['mk', 'Dos marketplaces que você adicionou', ''],
  ['own', 'Seus, neste computador', 'Criados ou adicionados por você (usuário, projeto e local).'],
];
const CON_SRC = [['anth', 'Anthropic'], ['dir', 'Diretório'], ['mk', 'Meus marketplaces'], ['reg', 'Registro MCP']];
const CON_SRC_HINT = {
  anth: 'Marketplace oficial da Anthropic, dos mais instalados para os menos.',
  dir: 'Diretório da Anthropic (parceiros e comunidade). Instale só de quem você conhece.',
  mk: 'Plugins dos marketplaces que você adicionou.',
  reg: 'Registro público de servidores MCP. Não tem avaliação: instale só de quem você conhece.',
};
const CON_PAGE = 24;
// catálogos do "Descobrir": valem para o app inteiro (não dependem do projeto) e são buscados só quando a aba é aberta
const DISC = { pl: null, plP: null, plErr: '', reg: { items: [], next: '', loading: false, loaded: false, err: '', tok: 0, q: '' }, t: 0 };
const fmtInst = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace('.', ',')} mi` : n >= 1e3 ? `${Math.round(n / 1e3)} mil` : String(n));

function resEnsure() {
  const p = curProject();
  if (!UI.res || UI.res.pid !== p.id) UI.res = { pid: p.id, files: null, filesJson: '', q: '', scope: '', st: '', type: '', ord: 'nome', mode: 'meus', src: 'anth', adv: false, menu: '', show: CON_PAGE, busy: '', msg: null, byKey: {} };
  const r = UI.res;
  if (!r.files && !r.loadingFiles) { r.loadingFiles = true; api.scan(p.path).then((d) => { r.loadingFiles = false; r.files = d; r.filesJson = JSON.stringify(d); repaintRes(); }); }
  resLoadPlugins(p, false);
  resLoadMcp(p, false);
  if (r.mode === 'desc') discEnsure();
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

// itens da aba "Meus": plugins, skills e MCPs no mesmo formato { key, raw, type, name, by, desc, scope, g (grupo), on, toggle, tok, tag, label, st, issue, search }
function conItems() {
  const r = UI.res, c = RESC[r.pid] || {};
  if (!r.files || !c.pl) return null;
  const out = [];
  for (const x of c.pl.plugins) {
    out.push({ key: 'pl:' + x.id, raw: x, type: 'plugin', name: x.name, by: `${x.marketplace} · v${String(x.version).slice(0, 12)}`, desc: x.desc, scope: PL_SCOPE[x.scope] || x.scope,
      g: OFFICIAL_MK.includes(x.marketplace) ? 'anth' : 'mk', on: x.enabled, toggle: true, tok: typeof x.alwaysOn === 'number' ? x.alwaysOn : 0, tag: x.notes.length ? 'Aviso' : '', tagK: 'warn', st: x.enabled ? 'on' : 'off', issue: false,
      search: `${x.name} ${x.marketplace} ${x.desc} ${x.skills.join(' ')}` });
  }
  for (const x of r.files.skills) {
    const own = x.scope === 'Usuário' || x.scope === 'Projeto';
    const nm = x.scope === 'Plugin' ? `${plShort(x.origin)}:${x.name}` : x.name;
    out.push({ key: `sk:${x.scope}:${x.kind}:${x.name}:${x.origin}`, raw: x, type: 'skill', name: '/' + nm, by: x.scope === 'Plugin' ? plShort(x.origin) : x.kind === 'skill' ? 'skill' : 'comando', desc: x.desc, scope: x.scope,
      g: own ? 'own' : OFFICIAL_MK.includes(mkOf(x.origin)) ? 'anth' : 'mk', on: !x.off, toggle: false, tok: 0, tag: x.kind === 'skill' ? '' : 'Comando', tagK: '', st: x.off ? 'off' : 'on', issue: false, search: `${x.name} ${x.desc} ${x.origin}` });
  }
  // MCPs: o estado real (CLI) manda; os arquivos dão o escopo e a origem e dizem o que está desligado neste projeto
  const live = c.mcp && c.mcp.items;
  const offSet = new Set(r.files.disabledMcps || []);
  const findCfg = (n) => r.files.mcps.find((f) => f.name === n || (f.scope === 'Plugin' && n.endsWith(':' + f.name) && n.includes(plShort(f.origin))));
  const rows = [];
  for (const it of live || []) {
    const f = findCfg(it.name);
    const scope = f ? f.scope : /^claude\.ai /.test(it.name) ? 'Conta' : /^plugin:/.test(it.name) ? 'Plugin' : 'Usuário';
    rows.push({ name: it.name, scope, origin: f ? f.origin : '', type: f ? f.type : '', target: it.target, kind: it.kind, label: it.label, detail: it.detail });
  }
  for (const f of r.files.mcps) {
    if (live && rows.some((x) => findCfg(x.name) === f)) continue;
    rows.push({ name: f.name, scope: f.scope, origin: f.origin, type: f.type, target: f.target, kind: '', label: live ? 'Sem leitura de estado' : 'Verificando…', detail: '' });
  }
  for (const x of rows) {
    // os arquivos (lidos a cada poucos segundos) dizem o que está desligado aqui; o "desligado" que vem da CLI pode estar velho
    // logo depois de ligar (a leitura do estado leva alguns segundos) e não vale sozinho, a não ser nos MCPs de plugin
    const off = offSet.has(x.name) || (x.kind === 'off' && x.scope === 'Plugin');
    if (off) { x.kind = 'off'; x.label = 'Desligado neste projeto'; x.detail = ''; }
    else if (x.kind === 'off') { x.kind = ''; x.label = 'Verificando…'; x.detail = ''; }
    const st = off ? 'off' : x.kind === 'ok' ? 'ok' : x.kind ? 'issue' : '';
    out.push({ key: 'mcp:' + x.name, raw: x, type: 'mcp', name: x.name, by: x.scope === 'Plugin' && x.origin ? plShort(x.origin) : x.type || 'MCP', desc: x.target ? safeTarget(x.target) : (x.detail || '').slice(0, 90), scope: x.scope,
      g: x.scope === 'Conta' ? 'acc' : x.scope === 'Plugin' ? (OFFICIAL_MK.includes(mkOf(x.origin)) ? 'anth' : 'mk') : 'own', on: !off, toggle: x.scope !== 'Plugin', tok: 0, tag: '', label: x.label, lk: x.kind === 'off' ? '' : x.kind, st, issue: st === 'issue',
      search: `${x.name} ${x.origin} ${x.target}` });
  }
  return out;
}

const conTag = (t, k = '') => `<span class="tag ${k}">${esc(t)}</span>`;
function conRow(x) {
  const act = x.type === 'plugin' ? 'pl-toggle' : 'mcp-toggle';
  const sw = x.toggle ? `<button class="cn-sw ${x.on ? 'on' : ''}" data-ract="${act}" data-rk="${esc(x.key)}" title="${x.on ? 'Desligar aqui' : 'Ligar aqui'}" aria-label="${x.on ? 'Desligar' : 'Ligar'} ${esc(x.name)} neste projeto" role="switch" aria-checked="${x.on}"></button>` : '<span></span>';
  return `<div class="cn-it${x.on ? '' : ' dim'}"><div class="cn-ic t-${x.type}" title="${CON_TYPE[x.type][0]}">${CON_TYPE[x.type][1]}</div>
    <div class="cn-mid"><div class="cn-nm">${esc(x.name)}${x.tag ? conTag(x.tag, x.tagK) : ''}${x.label ? conTag(x.label, x.lk) : ''}</div><div class="cn-sub" title="${esc(x.desc)}">${esc(x.by)} · ${esc(x.desc || 'Sem descrição.')}</div></div>
    <div class="cn-tags">${conTag(CON_TYPE[x.type][0])}${conTag(x.scope)}</div><div class="cn-meta">${x.tok ? `~${fmtTokPt(x.tok)} tok.` : ''}</div>${sw}
    <button class="cn-more" data-con="more" data-rk="${esc(x.key)}" title="Gerenciar…" aria-label="Gerenciar ${esc(x.name)}">${ic('dots', 18)}</button></div>`;
}
const conSkelRows = (n) => `<div class="cn-rows">${Array(n).fill('<div class="cn-it"><div class="sk" style="width:40px;height:40px;border-radius:10px"></div><div class="cn-mid" style="display:flex;flex-direction:column;gap:7px"><div class="sk cn-l" style="width:34%;height:12px"></div><div class="sk cn-l" style="width:78%"></div></div><div class="sk" style="width:90px;height:18px;border-radius:99px"></div><span></span><div class="sk" style="width:34px;height:20px;border-radius:99px"></div><span></span></div>').join('')}</div>`;
const conSkelCards = (n) => `<div class="cn-cards">${Array(n).fill('<div class="cn-cd"><div class="sk" style="width:40px;height:40px;border-radius:10px"></div><div class="cn-ct" style="gap:8px"><div class="sk cn-l" style="width:40%;height:12px"></div><div class="sk cn-l" style="width:88%"></div><div class="sk cn-l" style="width:50%"></div></div><div class="sk" style="width:32px;height:32px;border-radius:8px"></div></div>').join('')}</div>`;

function conMeusHTML() {
  const r = UI.res, items = conItems();
  if (!items) return conSkelRows(6);
  r.byKey = Object.fromEntries(items.map((x) => [x.key, x.raw]));
  const q = r.q.trim().toLowerCase();
  const list = items.filter((x) => (!r.type || x.type === r.type) && (!r.scope || x.scope === r.scope) && (!q || x.search.toLowerCase().includes(q))
    && (!r.st || (r.st === 'on' ? x.on : r.st === 'off' ? !x.on : x.issue)));
  if (!list.length) return `<div class="cn-empty">${items.length ? 'Nada com esse filtro.' : 'Nenhum conector neste projeto ainda. Use “Descobrir” ou “+ Adicionar”.'}</div>`;
  const cmp = r.ord === 'custo' ? (a, b) => (b.tok - a.tok) || a.name.localeCompare(b.name) : (a, b) => a.name.localeCompare(b.name);
  return CON_GROUPS.map(([g, title, sub]) => {
    const rows = list.filter((x) => x.g === g).sort(cmp);
    return rows.length ? `<div class="cn-gh">${title}<span class="cn-n">${rows.length}</span></div>${sub ? `<div class="cn-gsub">${sub}</div>` : ''}<div class="cn-rows">${rows.map(conRow).join('')}</div>` : '';
  }).join('');
}

/* ---- Descobrir: catálogo dos marketplaces (plugins) e registro público de MCPs ---- */
function discLoadPlugins() {
  if (DISC.pl || DISC.plP) return;
  const p = curProject();
  DISC.plP = api.resDo('pluginsAvailable', { projectPath: p.path }).then((d) => { DISC.pl = d.items || []; DISC.plErr = d.error || ''; }).catch(() => { DISC.pl = []; DISC.plErr = 'Não consegui ler os marketplaces.'; }).finally(() => { DISC.plP = null; repaintRes(); });
}
function regFetch(more) {
  const g = DISC.reg, q = UI.res ? UI.res.q.trim() : '';
  if (!more) { g.items = []; g.next = ''; g.q = q; g.loaded = false; }
  const tok = ++g.tok;
  g.loading = true; g.err = ''; repaintRes();
  api.resDo('mcpRegistry', { q: g.q, cursor: more ? g.next : '' }).then((d) => {
    if (tok !== g.tok) return;
    g.loading = false; g.loaded = true;
    if (!d.ok) { g.err = d.message || 'Não consegui consultar o registro MCP.'; return; }
    const seen = new Set(g.items.map((i) => i.name));
    g.items = g.items.concat(d.items.filter((i) => !seen.has(i.name)));
    g.next = d.next || '';
  }).catch(() => { if (tok === g.tok) { g.loading = false; g.err = 'Não consegui consultar o registro MCP.'; } }).finally(() => { if (tok === g.tok) repaintRes(); });
}
function discEnsure() {
  const r = UI.res;
  if (!r || r.mode !== 'desc') return;
  if (r.src === 'reg') { const g = DISC.reg; if (!g.loading && (g.q !== r.q.trim() || (!g.loaded && !g.err))) regFetch(false); }
  else discLoadPlugins();
}
const regAdded = (it) => {
  const r = UI.res, c = RESC[r.pid] || {};
  const k = String(it.name).split('/').pop().toLowerCase();
  const have = [...((r.files && r.files.mcps) || []).map((m) => m.name), ...((c.mcp && c.mcp.items) || []).map((m) => m.name)].map((n) => String(n).toLowerCase());
  return have.includes(k);
};
function conCard(it) {
  const t = it.kind;
  const nm = t === 'plugin' ? it.name : (it.title || it.name.split('/').pop());
  const by = t === 'plugin' ? it.by : it.name.split('/')[0];
  const flags = [it.added ? '<span class="tag ok">✓ Adicionado</span>' : '', it.installs ? `<span class="tag">${fmtInst(it.installs)} instalações</span>` : '', t === 'mcp' && it.remote ? '<span class="tag">Web</span>' : t === 'mcp' && it.pkg ? '<span class="tag">Local</span>' : ''].join('');
  const btn = it.added ? `<button class="cn-plus done" disabled title="Já adicionado" aria-label="Já adicionado">${ic('save', 15)}</button>` : `<button class="cn-plus" data-con="${t === 'plugin' ? 'inst' : 'regadd'}" data-cv="${esc(t === 'plugin' ? it.id : it.name)}" title="Adicionar" aria-label="Adicionar ${esc(nm)}">${ic('plus', 16)}</button>`;
  return `<div class="cn-cd"><div class="cn-ic t-${t}">${CON_TYPE[t][1]}</div><div class="cn-ct"><div class="cn-nm">${esc(nm)}</div><p>${esc(it.desc || 'Sem descrição.')}</p><div class="cn-by">${flags}<span>por ${esc(by)}</span></div></div>${btn}</div>`;
}
function conDescHTML() {
  const r = UI.res, c = RESC[r.pid] || {}, src = r.src, q = r.q.trim().toLowerCase();
  const title = (CON_SRC.find((s) => s[0] === src) || [0, ''])[1];
  let list = [], total = 0, more = '', loading = false, err = '';
  if (src === 'reg') {
    const g = DISC.reg;
    list = g.items.map((i) => ({ ...i, kind: 'mcp', added: regAdded(i) }));
    total = list.length; loading = g.loading && !list.length; err = g.err;
    if (g.next && !g.loading) more = '<button class="btn" data-con="showmore">Mostrar mais</button>';
    else if (g.loading && list.length) more = '<span class="cn-gsub">Carregando…</span>';
    if (!err && !loading && !list.length && g.loaded) err = 'Nada encontrado no registro.';
  } else {
    if (!DISC.pl) loading = true;
    else {
      const have = new Set(((c.pl && c.pl.plugins) || []).map((x) => x.id));
      const official = new Set(DISC.pl.filter((x) => x.marketplace === 'claude-plugins-official').map((x) => x.name));
      let a = DISC.pl.filter((x) => (src === 'anth' ? x.marketplace === 'claude-plugins-official' : src === 'dir' ? x.marketplace === 'anthropic-plugin-directory' && !official.has(x.name) : !OFFICIAL_MK.includes(x.marketplace)));
      if (q) { const rank = (x) => (x.name.toLowerCase().startsWith(q) ? 0 : x.name.toLowerCase().includes(q) ? 1 : 2); a = a.filter((x) => `${x.name} ${x.desc}`.toLowerCase().includes(q)).sort((x, y) => rank(x) - rank(y) || y.installs - x.installs); }
      else a.sort((x, y) => y.installs - x.installs || x.name.localeCompare(y.name));
      total = a.length;
      list = a.slice(0, r.show).map((x) => ({ kind: 'plugin', id: x.id, name: x.name, desc: x.desc, by: x.marketplace, installs: x.installs, added: have.has(x.id) }));
      if (total > r.show) more = '<button class="btn" data-con="showmore">Mostrar mais</button>';
      err = !total ? (DISC.plErr || (q ? 'Nada com esse filtro.' : src === 'mk' ? 'Você ainda não adicionou nenhum marketplace. Use “+ Adicionar › Adicionar marketplace”.' : 'Nenhum plugin encontrado.')) : '';
    }
  }
  const head = `<div class="cn-gh">${title}${loading ? '' : `<span class="cn-n">${total}${src === 'reg' && DISC.reg.next ? '+' : ''}</span>`}</div><div class="cn-gsub">${CON_SRC_HINT[src]}</div>`;
  if (loading) return head + conSkelCards(8);
  if (err && !list.length) return `${head}<div class="cn-empty">${esc(err)}</div>`;
  return `${head}${err ? `<div class="cn-empty">${esc(err)}</div>` : ''}<div class="cn-cards">${list.map(conCard).join('')}</div>${more ? `<div class="cn-moreb">${more}</div>` : ''}`;
}

function resListHTML() { return UI.res.mode === 'desc' ? conDescHTML() : conMeusHTML(); }
function resMetaText() {
  const r = UI.res, c = RESC[r.pid] || {};
  if (r.busy) return r.busy;
  if (r.mode === 'desc') return '';
  const items = conItems();
  if (!items) return '';
  const tot = c.pl ? c.pl.plugins.filter((x) => x.enabled && typeof x.alwaysOn === 'number').reduce((s, x) => s + x.alwaysOn, 0) : 0;
  const st = c.mcpLoading ? 'conferindo o estado dos conectores (leva alguns segundos)…' : '';
  const err = c.mcp && c.mcp.error ? c.mcp.error : '';
  return [`${items.length} ${items.length === 1 ? 'conector' : 'conectores'}`, tot ? `os plugins ligados custam ~${fmtTokPt(tot)} tokens por sessão` : '', st, err].filter(Boolean).join(' · ');
}
const resMsgHTML = () => (UI.res && UI.res.msg ? `<div class="resmsg ${UI.res.msg.ok ? 'ok' : 'bad'}">${esc(UI.res.msg.text)}</div>` : '');
const resBannerHTML = () => {
  const c = (UI.res && RESC[UI.res.pid]) || {};
  const p = curProject();
  const t = p && curTab(p);
  return c.restart ? `<div class="note restartnote"><span>Mudança aplicada. Os terminais já abertos deste projeto só passam a ver depois de reiniciar.</span><span class="acts" style="margin:0">${t && t.live ? '<button class="btn sm pri" data-ract="restart-tab">Reiniciar a aba ativa</button>' : ''}<button class="btn sm" data-ract="restart-dismiss">Dispensar</button></span></div>` : '';
};
function repaintRes() {
  if (!UI.res || UI.cur.page !== 'Conectores' || UI.cur.p !== UI.res.pid || mode() !== 'page') return;
  const l = $('#reslist'), m = $('#resmeta'), g = $('#resmsg'), b = $('#resbanner');
  if (l) l.innerHTML = resListHTML();
  if (m) m.textContent = resMetaText();
  if (g) g.innerHTML = resMsgHTML();
  if (b) b.innerHTML = resBannerHTML();
}

function resPageHTML() {
  resEnsure();
  const r = UI.res, desc = r.mode === 'desc';
  const chip = (attr, v, cur, l) => `<button class="cn-chip ${cur === v ? 'sel' : ''}" data-con="${attr}" data-cv="${esc(v)}">${esc(l)}</button>`;
  const types = [['', 'Todos'], ['plugin', 'Plugins'], ['skill', 'Skills'], ['mcp', 'MCPs']];
  const row2 = desc ? CON_SRC.map(([k, l]) => chip('src', k, r.src, l)).join('') : types.map(([k, l]) => chip('type', k, r.type, l)).join('');
  const menu = r.menu === 'add' ? `<div class="cn-menu" style="right:0;top:40px">
      <button data-con="add-mcp"><span class="cn-mi t-mcp">M</span><span>Adicionar conector personalizado<small>MCP por URL ou por comando</small></span></button>
      <button data-con="add-mk"><span class="cn-mi t-plugin">P</span><span>Adicionar marketplace<small>repositório do GitHub ou URL Git</small></span></button>
      <button data-con="add-plugin"><span class="cn-mi t-plugin">P</span><span>Instalar plugin<small>nome@marketplace</small></span></button>
      <hr><button data-con="add-skill"><span class="cn-mi t-skill">S</span><span>Nova skill ou comando<small>criar e editar aqui</small></span></button></div>`
    : r.menu === 'sort' ? `<div class="cn-menu" style="right:0;top:40px;min-width:200px">${[['nome', 'Nome (A–Z)'], ['custo', 'Custo em tokens']].map(([v, l]) => `<button data-con="ord" data-cv="${v}"${r.ord === v ? ' class="sel"' : ''}>${l}</button>`).join('')}</div>` : '';
  const adv = !desc && r.adv ? `<div class="cn-adv"><div><label>Escopo</label><div class="cn-chips">${chip('scope', '', r.scope, 'Todos')}${['Conta', 'Usuário', 'Projeto', 'Local', 'Plugin'].map((s) => chip('scope', s, r.scope, s)).join('')}</div></div>
      <div><label>Estado</label><div class="cn-chips">${[['', 'Todos'], ['on', 'Ligados'], ['off', 'Desligados'], ['issue', 'Com problema']].map(([v, l]) => chip('st', v, r.st, l)).join('')}</div></div>
      <div><label>Neste projeto</label><div class="cn-chips"><button class="btn sm" data-ract="pl-all-off">Desligar todos os plugins</button><button class="btn sm" data-ract="pl-all-on">Ligar todos os plugins</button><button class="btn sm" data-ract="mcp-all-off">Desligar todos os MCPs</button><button class="btn sm" data-ract="mcp-all-on">Ligar todos os MCPs</button></div></div></div>` : '';
  return `<div class="page cn-page">
    <div class="cn-head">${ptitle('Conectores').replace('class="ptitle"', 'class="ptitle" style="margin:0"')}
      <div class="seg" role="tablist"><button role="tab" class="${desc ? '' : 'sel'}" data-con="mode" data-cv="meus">Meus</button><button role="tab" class="${desc ? 'sel' : ''}" data-con="mode" data-cv="desc">Descobrir</button></div>
      <span class="grow"></span>
      <div class="cn-search">${ic('search', 15)}<input id="resq" class="resq" type="text" placeholder="${desc && r.src === 'reg' ? 'Pesquisar no registro MCP' : 'Procurar'}" value="${esc(r.q)}" autocomplete="off"></div>
      <button class="cn-ib ${r.adv ? 'on' : ''}" data-con="adv" title="Filtros" aria-label="Filtros" ${desc ? 'hidden' : ''}>${ic('filter', 17)}</button>
      <span class="cn-rel" ${desc ? 'hidden' : ''}><button class="cn-ib ${r.menu === 'sort' ? 'on' : ''}" data-con="menu" data-cv="sort" title="Ordenar" aria-label="Ordenar">${ic('sort', 17)}</button>${r.menu === 'sort' ? menu : ''}</span>
      <button class="cn-ib" data-con="refresh" title="Atualizar" aria-label="Atualizar">${ic('refresh', 17)}</button>
      <span class="cn-rel"><button class="btn pri" data-con="menu" data-cv="add">${ic('plus', 15)} Adicionar ${ic('chevd', 14)}</button>${r.menu === 'add' ? menu : ''}</span></div>
    <div class="cn-row2">${row2}</div>${adv}
    <div id="resbanner">${resBannerHTML()}</div><div id="resmsg">${resMsgHTML()}</div>
    <div class="rmeta" id="resmeta" style="margin:8px 0 0">${esc(resMetaText())}</div>
    <div id="reslist">${resListHTML()}</div></div>`;
}

// ações dos controles da tela (abas, filtros, menus, cartões do Descobrir)
function conAct(a, v, el) {
  const r = UI.res;
  if (!r) return;
  const redraw = () => { r.show = CON_PAGE; renderPage(); };
  if (a === 'mode') { r.mode = v; r.menu = ''; redraw(); discEnsure(); return; }
  if (a === 'type') { r.type = v; redraw(); return; }
  if (a === 'src') { r.src = v; redraw(); discEnsure(); return; }
  if (a === 'scope') { r.scope = v; redraw(); return; }
  if (a === 'st') { r.st = v; redraw(); return; }
  if (a === 'ord') { r.ord = v; r.menu = ''; renderPage(); return; }
  if (a === 'adv') { r.adv = !r.adv; renderPage(); return; }
  if (a === 'menu') { r.menu = r.menu === v ? '' : v; renderPage(); return; }
  if (a === 'refresh') {
    const p = curProject();
    r.files = null; r.loadingFiles = false; resLoadPlugins(p, true); resLoadMcp(p, true);
    DISC.pl = null; DISC.reg.loaded = false; DISC.reg.err = '';
    renderPage(); return;
  }
  if (a === 'showmore') { if (r.mode === 'desc' && r.src === 'reg') regFetch(true); else { r.show += CON_PAGE; repaintRes(); } return; }
  if (a === 'more') return conMore(el.dataset.rk);
  if (a === 'inst') return plInstallQuick(v);
  if (a === 'regadd') return regAddFlow(v);
  r.menu = ''; renderPage();
  if (a === 'add-mcp') return mcpAddFlow({});
  if (a === 'add-mk') return marketplaceFlow();
  if (a === 'add-plugin') return plInstallFlow();
  if (a === 'add-skill') return skNewFlow();
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
  r.busy = 'Atualizando a lista…'; repaintRes();
  const [d] = await Promise.all([api.scan(p.path), resLoadPlugins(p, true)]);
  if (UI.res === r) { r.files = d; r.filesJson = JSON.stringify(d); }
  resLoadMcp(p, true);
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

// instalar um plugin escolhido no Descobrir: só pergunta onde vale (o padrão é só neste projeto)
async function plInstallQuick(id) {
  const p = curProject();
  const x = (DISC.pl || []).find((a) => a.id === id);
  if (!p || !x) return;
  const m = await modal({ title: `Instalar ${esc(x.name)}`, body: `<p>${esc(x.desc || 'Plugin do Claude Code.')}</p><p class="meta">${esc(x.id)}${x.version ? ' · v' + esc(x.version) : ''}${x.installs ? ' · ' + fmtInst(x.installs) + ' instalações' : ''}</p><p class="meta">Use apenas plugins de quem você confia: a Anthropic não controla os plugins dos marketplaces.</p>
    <div class="f"><label>Instalar para</label>${selHTML('scope', [['local', 'Só neste projeto, só para mim (local)'], ['user', 'Todos os meus projetos (usuário)'], ['project', 'Este projeto, compartilhado com o time (.claude/settings.json)']], 'local')}</div>`,
    buttons: [['Cancelar', null], ['Instalar', 'ok', 'pri']] });
  if (m.value !== 'ok') return;
  return resRun(`Instalando ${x.name}… (pode levar um minuto)`, () => api.resDo('pluginInstall', { id: x.id, scope: m.form.scope, projectPath: p.path }), true);
}

// adicionar um servidor do registro MCP: abre o formulário já preenchido (endereço web ou comando npx/uvx)
function regAddFlow(name) {
  const it = DISC.reg.items.find((i) => i.name === name);
  if (!it) return;
  const base = String(it.title || it.name.split('/').pop()).replace(/[^\w.-]+/g, '-').replace(/^[^A-Za-z0-9]+/, '').slice(0, 40) || 'servidor';
  if (it.remote) return mcpAddFlow({ name: base, type: it.remote.type, url: it.remote.url });
  if (it.pkg && it.pkg.type === 'npm') return mcpAddFlow({ name: base, type: 'stdio', command: 'npx', args: '-y\n' + it.pkg.id });
  if (it.pkg && it.pkg.type === 'pypi') return mcpAddFlow({ name: base, type: 'stdio', command: 'uvx', args: it.pkg.id });
  UI.res.msg = { ok: false, text: `${it.title || it.name} precisa de instalação manual${it.site ? ': veja ' + it.site : '.'}` }; repaintRes();
}

async function marketplaceFlow() {
  const p = curProject();
  const m = await modal({ title: 'Adicionar marketplace', body: `<p class="meta">Adicione somente marketplaces em que você confia: a Anthropic não controla os plugins deles e os proprietários podem alterá-los depois.</p>
    <div class="f"><label>URL</label><input class="inp" type="text" data-f="src" placeholder="owner/repo   ou   https://github.com/owner/repo.git" autocomplete="off"></div><p class="meta">Um <b>owner/repo</b> do GitHub ou uma URL https de repositório Git.</p>`,
    buttons: [['Cancelar', null], ['Sincronizar', 'ok', 'pri']] });
  if (m.value !== 'ok') return;
  const src = (m.form.src || '').trim();
  if (!src) return;
  const out = await resRun(`Adicionando o marketplace ${src}… (pode levar um minuto)`, () => api.resDo('marketplaceAdd', { source: src, projectPath: p.path }), false);
  if (out && out.ok) { DISC.pl = null; discEnsure(); }
}

// menu ⋯ de uma linha da lista
async function conMore(key) {
  const r = UI.res, x = r && r.byKey[key];
  if (!x) return;
  if (key.startsWith('pl:')) return resAct('pl-manage', key);
  if (key.startsWith('mcp:')) return resAct('mcp-manage', key);
  const own = x.scope === 'Usuário' || x.scope === 'Projeto';
  const m = await modal({ title: `/${esc(x.name)} <small class="meta">${esc(x.scope)} · ${x.kind === 'skill' ? 'skill' : 'comando'}</small>`, body: `<p>${esc(x.desc || 'Sem descrição.')}</p>${own ? '' : '<p class="meta">Faz parte do plugin; para desligar, desligue o plugin.</p>'}`,
    buttons: [['Fechar', null], ...(own ? [['Excluir…', 'del', 'bad'], ['Editar', 'edit', 'pri']] : [])] });
  if (m.value === 'edit') return resAct('sk-edit', key);
  if (m.value === 'del') return resAct('sk-del', key);
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
  const m = await modal({ title: 'Adicionar conector personalizado', body: `${v.error ? `<div class="resmsg bad">${esc(v.error)}</div>` : ''}<p class="meta">Use apenas conectores de desenvolvedores em quem você confia: a Anthropic não controla as ferramentas que eles disponibilizam.</p>
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

/* ---------- Consumo (TASK-084) ---------- */
// Limites 5 h / 7 d: status line (conta inteira). Tokens e custo: lidos das conversas deste computador (src/consumo.js).
UI.cons = UI.cons || { data: null, loading: false, tab: 'ov', per: 'all', more: false, sig: '' };
const CONS_PERIODS = [['all', 'Todo o período'], ['7', '7 dias'], ['30', '30 dias']];
const nfPt = new Intl.NumberFormat('pt-BR');
const fmtTokBig = (n) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)} bi` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} mi` : n >= 1e3 ? `${(n / 1e3).toFixed(1)} mil` : String(Math.round(n))).replace('.', ',');
const fmtUsd = (v) => `US$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const consDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const consDate = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const consDayLabel = (k) => consDate(k).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
const consDur = (ms) => { const m = Math.floor(ms / 60000), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60); return d ? `${d}d ${h}h ${m % 60}m` : h ? `${h}h ${m % 60}m` : `${m}m`; };
const normDir = (p) => String(p || '').replace(/[^a-zA-Z0-9]/g, '-');

// cartões 5 h / 7 d (atualizam sozinhos a cada métrica, sem refazer a tela inteira)
function consLimCards() {
  const L = UI.limits;
  const card = (title, d) => `<div class="card"><h5>${title}</h5>${liveWin(d) ? `<div class="big ${pctClass(d.pct)}">${Math.round(d.pct)}%</div>${barHTML(d.pct, 220)}<p style="margin-top:8px">Renova em ${fmtReset(d.resets)}</p>` : '<div class="big na">indisponível</div><p>Nenhuma sessão informou este limite ainda.</p>'}</div>`;
  return card('Janela de 5 horas', L && L.five) + card('Semana', L && L.week);
}
function consLimits() { const el = document.getElementById('cons-lim'); if (el) el.innerHTML = consLimCards(); }

function consFetch() {
  const C = UI.cons;
  if (C.loading) return;
  C.loading = true;
  const onPage = () => UI.cur.p === '_' && UI.cur.page === 'Consumo';
  api.consumo().then((d) => {
    C.loading = false; C.data = d;
    const sig = `${d.sessions.length}|${d.sessions.reduce((a, s) => a + s.msgs, 0)}|${d.sessions.reduce((a, s) => Math.max(a, s.last), 0)}`;
    const changed = sig !== C.sig; C.sig = sig;
    if (onPage() && (changed || !C.painted)) renderPage();
  }).catch(() => { C.loading = false; C.data = C.data || { sessions: [], error: true }; if (onPage()) renderPage(); });
}
setInterval(() => { if (UI.cur.p === '_' && UI.cur.page === 'Consumo' && !document.hidden) consFetch(); }, 15000);

// soma por período (exata, por dia e por modelo): tot [entrada, saída, cache lido, cache gravado, custo], dias, modelos e sessões
function consAgg(data, per) {
  const cut = per === 'all' ? '' : consDay(new Date(Date.now() - (Number(per) - 1) * 86400000));
  const a = { tot: [0, 0, 0, 0, 0], days: {}, models: {}, sess: {}, unpriced: 0, nSess: 0, longest: 0 };
  for (const s of data.sessions) {
    const t = [0, 0, 0, 0, 0]; let unp = 0;
    for (const [k, models] of Object.entries(s.days)) {
      if (k < cut) continue;
      for (const [m, v] of Object.entries(models)) {
        for (let i = 0; i < 5; i++) { t[i] += v[i]; a.tot[i] += v[i]; }
        const n = v[0] + v[1] + v[2] + v[3];
        a.days[k] = (a.days[k] || 0) + n;
        if (!v[5]) unp += n;
        const mm = (a.models[m] = a.models[m] || [0, 0, 0, 0, 0, v[5]]);
        for (let i = 0; i < 5; i++) mm[i] += v[i];
      }
    }
    const n = t[0] + t[1] + t[2] + t[3];
    if (!n) continue;
    a.sess[s.id] = { t, n, unpriced: unp, dir: s.dir };
    a.unpriced += unp; a.nSess++;
    a.longest = Math.max(a.longest, s.last - s.first);
  }
  return a;
}

// mapa de calor das últimas 53 semanas (colunas = semanas, linhas = seg..dom), como o /stats do Claude Code
function consHeatmap(days) {
  const WEEKS = 53, today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(today); start.setDate(start.getDate() - ((today.getDay() + 6) % 7) - (WEEKS - 1) * 7);
  const vals = Object.values(days).filter((v) => v > 0).sort((x, y) => x - y);
  const q = (f) => (vals.length ? vals[Math.min(vals.length - 1, Math.floor(vals.length * f))] : 0);
  const cuts = [q(0.25), q(0.5), q(0.75)];
  const lvl = (v) => (!v ? 0 : v <= cuts[0] ? 1 : v <= cuts[1] ? 2 : v <= cuts[2] ? 3 : 4);
  let cols = '', mon = '', lastMonth = -1;
  for (let w = 0; w < WEEKS; w++) {
    let cells = '';
    for (let r = 0; r < 7; r++) {
      const d = new Date(start); d.setDate(start.getDate() + w * 7 + r);
      if (d > today) { cells += '<i class="hm-x"></i>'; continue; }
      const k = consDay(d), v = days[k] || 0;
      cells += `<i class="hm l${lvl(v)}" title="${consDayLabel(k)}: ${v ? `${fmtTokBig(v)} tokens` : 'sem uso'}"></i>`;
    }
    const first = new Date(start); first.setDate(start.getDate() + w * 7);
    mon += `<span>${first.getMonth() !== lastMonth ? first.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') : ''}</span>`;
    lastMonth = first.getMonth();
    cols += `<div class="hm-col">${cells}</div>`;
  }
  return `<div class="hm-wrap"><div class="hm-days"><span>seg</span><span></span><span>qua</span><span></span><span>sex</span><span></span><span></span></div>
    <div><div class="hm-mon">${mon}</div><div class="hm-grid">${cols}</div></div></div>
    <div class="hm-leg">Menos <i class="hm l0"></i><i class="hm l1"></i><i class="hm l2"></i><i class="hm l3"></i><i class="hm l4"></i> Mais</div>`;
}

function consStreaks(days) {
  const keys = Object.keys(days).filter((k) => days[k] > 0).sort();
  let best = 0, run = 0, prev = null;
  for (const k of keys) {
    const t = consDate(k).getTime();
    run = prev !== null && Math.round((t - prev) / 86400000) === 1 ? run + 1 : 1;
    best = Math.max(best, run); prev = t;
  }
  let cur = 0; const d = new Date(); d.setHours(0, 0, 0, 0);
  if (!days[consDay(d)]) d.setDate(d.getDate() - 1); // hoje ainda sem uso não quebra a sequência
  while (days[consDay(d)] > 0) { cur++; d.setDate(d.getDate() - 1); }
  return { best, cur };
}

function consumoHTML() {
  const C = UI.cons;
  C.painted = true;
  if (!C.data || Date.now() - (C.data.updated || 0) > 15000) consFetch();
  const head = `<div class="page">${ptitle('Consumo')}
    <div class="note">Os limites de 5 h e 7 dias são da conta inteira (vêm do Claude Code e podem incluir uso fora do app). Tokens e custo vêm das conversas gravadas neste computador. <b>Custo equivalente</b> é quanto o uso custaria pelos preços de tabela da API; a assinatura não cobra por token.</div>
    <div class="cards" id="cons-lim">${consLimCards()}</div>`;
  const D = C.data;
  if (!D) return `${head}<div class="empty" style="height:auto;margin-top:18px">Lendo suas conversas… a primeira leitura pode levar alguns segundos.</div></div>`;
  if (D.error) return `${head}<div class="empty" style="height:auto;margin-top:18px">Não foi possível ler as conversas do Claude Code (pasta ~/.claude/projects).</div></div>`;
  const A = consAgg(D, C.per);
  const bar = `<div class="cons-bar"><div class="seg sm">${[['ov', 'Visão geral'], ['md', 'Modelos']].map(([k, n]) => `<button class="${C.tab === k ? 'sel' : ''}" data-ctab="${k}">${n}</button>`).join('')}</div>
    <div class="seg sm">${CONS_PERIODS.map(([k, n]) => `<button class="${C.per === k ? 'sel' : ''}" data-cper="${k}">${n}</button>`).join('')}</div></div>`;
  const noPrice = '<span class="na" title="Modelo sem preço na tabela do app">sem preço</span>';
  const costOf = (v, unp) => (unp > 0 ? noPrice : fmtUsd(v));
  const cost = A.unpriced > 0 ? `<span title="Parte do uso é de um modelo sem preço na tabela: o valor está incompleto">${fmtUsd(A.tot[4])}+</span>` : fmtUsd(A.tot[4]);
  const total = A.tot[0] + A.tot[1] + A.tot[2] + A.tot[3];
  if (!A.nSess) return `${head}${bar}<div class="empty" style="height:auto;margin-top:18px">Nenhum uso neste período.</div></div>`;

  let body = '';
  if (C.tab === 'md') {
    const rows = Object.entries(A.models).map(([m, v]) => ({ m, v, n: v[0] + v[1] + v[2] + v[3] })).sort((x, y) => y.n - x.n);
    body = `<table class="t"><tr><th>Modelo</th><th>Tokens</th><th>Entrada</th><th>Saída</th><th>Cache lido</th><th>Cache gravado</th><th>Custo equivalente</th><th>Parte</th></tr>
      ${rows.map(({ m, v, n }) => `<tr><td>${esc(m)}</td><td>${fmtTokBig(n)}</td><td>${fmtTokBig(v[0])}</td><td>${fmtTokBig(v[1])}</td><td>${fmtTokBig(v[2])}</td><td>${fmtTokBig(v[3])}</td><td>${v[5] ? fmtUsd(v[4]) : noPrice}</td><td>${Math.round(n / total * 100)}%</td></tr>`).join('')}</table>`;
  } else {
    const days = A.days, active = Object.keys(days).filter((k) => days[k] > 0).sort();
    const fav = Object.entries(A.models).sort((x, y) => (y[1][0] + y[1][1] + y[1][2] + y[1][3]) - (x[1][0] + x[1][1] + x[1][2] + x[1][3]))[0];
    const spanDays = Math.max(1, Math.round((new Date().setHours(0, 0, 0, 0) - consDate(active[0]).getTime()) / 86400000) + 1);
    const top = active.slice().sort((x, y) => days[y] - days[x])[0], st = consStreaks(days);
    const dd = (n) => `${n} ${n === 1 ? 'dia' : 'dias'}`;
    const stat = (l, v) => `<div class="stat"><span>${l}</span><b>${v}</b></div>`;
    body = `<div class="card cons-ov">${consHeatmap(days)}
      <div class="stats">${stat('Modelo favorito', esc(fav ? fav[0] : '—'))}${stat('Total de tokens', fmtTokBig(total))}
        ${stat('Sessões', nfPt.format(A.nSess))}${stat('Maior sessão', consDur(A.longest))}
        ${stat('Dias ativos', `${active.length}<small>/${spanDays}</small>`)}${stat('Maior sequência', dd(st.best))}
        ${stat('Dia mais ativo', consDayLabel(top))}${stat('Sequência atual', dd(st.cur))}
        ${stat('Custo equivalente', cost)}${stat('Média por dia ativo', fmtUsd(A.tot[4] / active.length))}</div>
      <p class="cons-brk">Entrada ${fmtTokBig(A.tot[0])} · Saída ${fmtTokBig(A.tot[1])} · Cache lido ${fmtTokBig(A.tot[2])} · Cache gravado ${fmtTokBig(A.tot[3])}</p></div>`;

    // por projeto: projetos do Termix + o que está fora dele, para a soma fechar com o total geral
    const byDir = {};
    for (const s of Object.values(A.sess)) { const o = (byDir[s.dir] = byDir[s.dir] || { n: 0, c: 0, un: 0, ns: 0 }); o.n += s.n; o.c += s.t[4]; o.un += s.unpriced; o.ns++; }
    const used = new Set(), prow = [];
    for (const p of S.projects) { const k = normDir(p.path); used.add(k); prow.push({ name: p.name, ...(byDir[k] || { n: 0, c: 0, un: 0, ns: 0 }) }); }
    const out = Object.entries(byDir).filter(([k]) => !used.has(k)).reduce((x, [, o]) => ({ n: x.n + o.n, c: x.c + o.c, un: x.un + o.un, ns: x.ns + o.ns }), { n: 0, c: 0, un: 0, ns: 0 });
    if (out.ns) prow.push({ name: 'Fora do Termix', ...out, muted: true });
    prow.sort((x, y) => y.n - x.n);
    const proj = `<h4 class="cons-h">Por projeto</h4><table class="t"><tr><th>Projeto</th><th>Sessões</th><th>Tokens</th><th>Custo equivalente</th><th>Parte</th></tr>
      ${prow.map((r) => `<tr class="${r.muted ? 'dim' : ''}"><td>${esc(r.name)}</td><td>${r.ns}</td><td>${fmtTokBig(r.n)}</td><td>${costOf(r.c, r.un)}</td><td>${Math.round(r.n / total * 100)}%</td></tr>`).join('')}
      <tr class="tot"><td>Total geral</td><td>${A.nSess}</td><td>${fmtTokBig(total)}</td><td>${cost}</td><td>100%</td></tr></table>`;

    // por sessão: as abas do Termix
    const ctx = (t) => { const m = MET[t.id]; const v = m && m.context_window && m.context_window.used_percentage; return typeof v === 'number' ? `${Math.round(v)}%` : '<span class="na" title="O contexto só existe enquanto a sessão está aberta">—</span>'; };
    const known = new Set(D.sessions.map((x) => x.id)); // sessões com conversa gravada (mesmo sem uso no período)
    const rows = S.projects.flatMap((p) => p.tabs.filter((t) => t.started).map((t) => ({ p, t, s: A.sess[t.sessionId] })));
    rows.sort((x, y) => (y.s ? y.s.n : 0) - (x.s ? x.s.n : 0));
    const none = '<span class="na" title="Esta aba ainda não tem nenhuma resposta gravada">—</span>';
    const shown = rows.slice(0, C.more ? rows.length : 25);
    const sess = `<h4 class="cons-h">Por sessão <small>(abas do Termix)</small></h4><table class="t"><tr><th>Sessão</th><th>Projeto</th><th>Estado</th><th>Contexto</th><th>Tokens</th><th>Custo equivalente</th></tr>
      ${shown.map(({ p, t, s }) => `<tr><td>${esc(t.name)}</td><td>${esc(p.name)}</td><td>${STATES[stOf(t)][1]}</td><td>${ctx(t)}</td><td>${s ? fmtTokBig(s.n) : known.has(t.sessionId) ? '0' : none}</td><td>${s ? costOf(s.t[4], s.unpriced) : known.has(t.sessionId) ? fmtUsd(0) : none}</td></tr>`).join('') || '<tr><td colspan="6" class="na">Nenhuma sessão ainda.</td></tr>'}</table>
      ${rows.length > 25 ? `<button class="btn sm" data-cmore="1" style="margin-top:8px">${C.more ? 'Mostrar só as 25 maiores' : `Mostrar todas (${rows.length})`}</button>` : ''}`;
    body += proj + sess;
  }
  return `${head}${bar}${body}</div>`;
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

const ynN = (k) => `<div class="seg"><button class="${notifCfg()[k] ? 'sel' : ''}" data-ntf="${k}|1">Sim</button><button class="${notifCfg()[k] ? '' : 'sel'}" data-ntf="${k}|0">Não</button></div>`;
function confHTML() {
  const arch = S.projects.filter((p) => p.archived);
  return `<div class="page">${ptitle('Configurações')}<div class="card" style="padding:6px 18px">
    <div class="row"><div class="grow">Opacidade do terminal<small>Mais baixo = mais vidro, menos legibilidade</small></div><input type="range" min="50" max="100" value="${S.settings.termOp}" id="rngOp" style="--pct:${(S.settings.termOp - 50) * 2}%"><span id="opv" class="chip">${S.settings.termOp}%</span></div>
    <div class="row"><div class="grow">Fundo do app<small>Degradê: o app é o degradê e o resto fica transparente. Ofuscado: o mesmo degradê, mais suave, com o Windows de fundo aparecendo desfocado por trás (Windows 11). Trocar de um para o outro pede para reabrir o app.</small></div>
      <div class="seg"><button class="${bgMode() === 'gradient' ? 'sel' : ''}" data-bg="gradient">Degradê</button><button class="${bgMode() === 'blur' ? 'sel' : ''}" data-bg="blur">Ofuscado</button></div></div>
    <div class="row"><div class="grow">Pasta raiz dos projetos criados pelo app<small id="rootNote">Projetos importados ficam onde já estão</small></div><span class="chip" id="rootChip" style="user-select:text;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">…</span><button class="btn" id="rootPick">Alterar</button>${S.settings.projectsRoot ? '<button class="btn" id="rootAuto">Automática</button>' : ''}</div>
    <div class="row"><div class="grow">Ao fechar o app<small>Encerra os processos, com confirmação. As conversas ficam guardadas.</small></div><span class="chip">Pergunta antes de sair</span></div>
    <div class="row"><div class="grow">Ao reabrir<small>Os projetos e as abas voltam todos; as conversas de cada projeto são retomadas quando você abre o projeto (o que está na tela volta na hora)</small></div><span class="chip">Restaura sozinho</span></div></div>
    <h5 style="margin:22px 0 8px">Rail e rodapé</h5>
    <div class="card" style="padding:6px 18px">
    ${[['on', 'Anéis de métricas', 'Os anéis flutuantes junto à borda direita (contexto, limites e cache)'], ['ctx', 'Contexto', 'Quanto da janela de contexto da conversa já foi usado'], ['h5', 'Limite de 5 horas', 'Uso da conta na janela de 5 horas'], ['d7', 'Limite de 7 dias', 'Uso semanal da conta'], ['cache', 'Cache do prompt', 'Tempo até o cache esfriar (só nos terminais)'], ['fade', 'Esmaecer os anéis quando parado', 'Ficam discretos e voltam ao normal ao passar o mouse'], ['reserve', 'Reservar espaço para os anéis', 'O texto para antes dos anéis, sem passar por baixo'], ['meta', 'Modelo, branch e permissões', 'Etiqueta no canto inferior direito'], ['footFade', 'Esmaecer o rodapé quando parado', 'Terminais · Web · Clear · Reiniciar ficam discretos']].map(([k, t, d]) => `<div class="row"><div class="grow">${t}<small>${d}</small></div><div class="seg"><button class="${railCfg()[k] ? 'sel' : ''}" data-railset="${k}|1">Sim</button><button class="${railCfg()[k] ? '' : 'sel'}" data-railset="${k}|0">Não</button></div></div>`).join('')}
    <div class="row"><div class="grow"><small>Esses ajustes também ficam na engrenagem do rodapé.</small></div></div></div>
    <h5 style="margin:22px 0 8px">Chat <small style="font-weight:400;color:var(--text3)">· como o app abre; no uso, troque pelo rodapé (vale só para o uso atual)</small></h5>
    <div class="card" style="padding:6px 18px">
    <div class="row" style="align-items:flex-start"><div class="grow">Modo das abas novas<small><b>Chat:</b> conversa em bolhas, sem terminal. <b>Terminal:</b> o Claude Code como sempre. O "+" cria a aba no modo escolhido; o menu ao lado do "+" tem os dois. Isto vale só para abas <b>novas</b>: para trocar uma aba já aberta, use o menu da aba (clique direito) > "Abrir como terminal/chat"; a conversa é a mesma.</small></div>
      <div class="seg"><button class="${chatCfg().mode === 'chat' ? 'sel' : ''}" data-chatset="mode|chat">Chat</button><button class="${chatCfg().mode === 'term' ? 'sel' : ''}" data-chatset="mode|term">Terminal</button></div></div>
    <div class="row" style="align-items:flex-start"><div class="grow">Permissões no chat<small><b>Automático:</b> o Claude executa sem perguntar (como a aba Dangerously, sem isolamento do sistema). <b>Perguntar:</b> edições de arquivo são aceitas; o resto aparece na conversa como um cartão para você Permitir (uma vez ou sempre no projeto) ou Negar. Vale para os chats criados depois.</small></div>
      <div class="seg"><button class="${chatCfg().perm === 'auto' ? 'sel' : ''}" data-chatset="perm|auto">Automático</button><button class="${chatCfg().perm === 'ask' ? 'sel' : ''}" data-chatset="perm|ask">Perguntar</button></div></div></div>
    <h5 style="margin:22px 0 8px">Botão Clear (base da janela)</h5>
    <div class="card" style="padding:6px 18px">
    <div class="row"><div class="grow">Pulsar quando o contexto chegar a<small>% do anel CTX a partir da qual o botão Clear pisca. 0 desliga o aviso. Sugestão: 15 para tarefas pequenas, 35 para tarefas longas.</small></div><div class="numf" data-min="0" data-max="100"><button type="button" data-step="-1" aria-label="Diminuir">−</button><input id="clrAlert" type="text" inputmode="numeric" maxlength="3" value="${clearCfg().alert}"><button type="button" data-step="1" aria-label="Aumentar">+</button></div><span class="unit">%</span></div>
    <div class="row" style="align-items:flex-start;flex-wrap:wrap"><div class="grow">Resumo entregue ao agente depois do Clear<small>É o texto que o agente recebe na conversa nova, para continuar sem reler o projeto. Pode editar à vontade; os marcadores entre chaves são trocados pelo app na hora do Clear e somem quando não há o que mostrar: <code>{{PROJETO}}</code> projeto, papel e branch · <code>{{PEDIDOS}}</code> últimos pedidos do usuário · <code>{{RESPOSTA}}</code> fim da última resposta do Claude · <code>{{ARQUIVOS}}</code> arquivos alterados · <code>{{GIT}}</code> git status e últimos commits · <code>{{TAREFA}}</code> tarefa ativa do docs/TASKS.md. Apagar tudo = só limpar, sem resumo.</small></div><textarea class="inp ta" id="clrTpl" rows="14" spellcheck="false" style="width:100%;flex-basis:100%;margin-top:8px;font-family:Consolas,monospace;font-size:12px;line-height:1.45">${esc(clearTemplate() ?? HANDOFF_DEF)}</textarea><div class="tags" style="margin-top:8px;flex-basis:100%"><button class="btn sm" data-clrreset>Restaurar o padrão do Termix</button></div></div>
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
    <div class="row" style="align-items:flex-start"><div class="grow">Projeto novo criado pelo Termix<small><b>Automático:</b> o projeto nasce como o Claude Code monta por padrão, com os seus plugins, MCPs e conectores já valendo (isso pesa nos tokens de cada sessão). <b>Limpo:</b> o projeto nasce sem nenhum plugin, MCP nem conector; você liga só o que quiser na tela Conectores.</small></div>
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

// Workflow: sempre dois chats fixos, lado a lado, já em Dangerously (a função em si vem depois)
function wfStartHTML(p) {
  return `<div class="empty wfstart"><div class="wfmark">${ic('workflow', 34)}</div><h2>Workflow · ${esc(p.name)}</h2>
    <p>Dois terminais lado a lado, sempre em Dangerously, para trabalhar o projeto em etapas. Comece pelo brainstorm.</p>
    <div class="row2"><button class="btn pri big" data-wfstart>Começar Brainstorm</button></div></div>`;
}
function wfEnsure(p) {
  let made = false;
  for (const n of [1, 2]) {
    const old = p.tabs.find((t) => t.wf === n);
    if (old) { if (!old.open || old.archived) { old.open = true; old.archived = false; made = true; } continue; } // os dois são fixos: se um foi fechado, volta
    const t = { id: uuid(), sessionId: uuid(), agent: 'claude', name: `Terminal ${n}`, color: DEFAULT_COLOR, perm: 'd', started: false, open: true, live: false, archived: false, kind: 'chat', wf: n };
    p.tabs.push(t); made = true; launch(p, t, 'new');
  }
  if (made) { if (!p.tabs.some((t) => t.id === p.activeTab)) p.activeTab = (p.tabs.find((t) => t.wf === 1) || p.tabs[0]).id; save(); }
}
function renderPage() {
  const m = mode();
  let html = '';
  if (m === 'empty') html = emptyHTML();
  else if (m === 'noterm') html = noTermHTML(curProject());
  else if (m === 'workflow') html = wfStartHTML(curProject());
  else if (UI.cur.p === '_') html = { Consumo: consumoHTML, 'Integrações': integHTML, 'Configurações': confHTML, 'Novo chat': () => newPageHTML('chat'), 'Novo workflow': () => newPageHTML('workflow') }[UI.cur.page]();
  else if (m === 'page') html = UI.cur.page === 'Código' ? codeHTML() : resPageHTML();
  $('#page').innerHTML = html;
  $('#page').classList.toggle('wfpage', m === 'workflow');
  $('#page').classList.toggle('codepage', m === 'page' && UI.cur.p !== '_' && UI.cur.page === 'Código'); // tela Código ocupa o palco sem margem // tela inicial do Workflow ocupa o palco inteiro, sem moldura
  layout(); // o recorte do vidro depende do tipo de tela
  if (UI.cur.p === '_' && UI.cur.page === 'Configurações') api.appInfo(S.settings.projectsRoot).then((i) => { const c = $('#rootChip'); if (c) { c.textContent = i.root; c.title = i.root; } const n = $('#rootNote'); if (n && i.rootAuto) n.textContent = 'Automática: o disco com mais espaço livre, para não encher o C:. Projetos importados ficam onde já estão.'; });
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
  const dk = dockOn();
  document.body.classList.toggle('codedock', dk);
  $('#tabsRow').classList.toggle('hide', m !== 'term' && !dk);
  $('#sess').classList.toggle('hide', m !== 'term' && !dk);
  $('#page').classList.toggle('hide', m === 'term' || m === 'web');
  if (window.webRender) webRender(m);
  document.documentElement.style.setProperty('--term-op', S.settings.termOp / 100);
  if (m === 'term' || dk) { const cp = curProject(); if (cp.kind === 'workflow') showWorkflow(cp); else { const t = curTab(cp); if (t.kind === 'chat') showChat(t); else showTab(t); } }
  const cp0 = curProject(); if (cp0 && BOOTED && !RESTORING.has(cp0.id)) restoreProject(cp0); // abriu um projeto que ainda não foi retomado nesta abertura do app
}

/* ---------- ações de projeto e abas ---------- */
// Novo projeto: tela ao lado da barra (como um "novo chat"), aberta pelos botões fixos "+ Chat" e "+ Workflow" no topo
const NP_PERMS = [
  ['n', 'shield', 'Perguntar', 'Aceita edições de arquivo e pede a sua aprovação para o resto, na conversa.'],
  ['d', 'bolt', 'Automático', 'Executa tudo sem pedir permissão. Mais rápido, com menos controle.'],
];
const kindOf = (p) => (p.kind === 'workflow' ? 'workflow' : 'chat');
function goNew(kind, where = 'new') {
  UI.np = { kind, name: '', dir: null, perm: chatPermFor(), where, url: '', busy: false, err: '' };
  UI.cur = { p: '_', page: kind === 'workflow' ? 'Novo workflow' : 'Novo chat' }; UI.pop = false;
  renderAll();
  if (where === 'dir') npPick();
}
function newPageHTML(kind) {
  if (!UI.np || UI.np.kind !== kind) UI.np = { kind, name: '', dir: null, perm: chatPermFor(), where: 'new', url: '', busy: false, err: '' };
  const np = UI.np, wf = kind === 'workflow';
  const folder = np.where === 'git'
    ? `<div class="nprow"><input class="inp" type="text" id="npUrl" value="${esc(np.url)}" placeholder="https://github.com/dono/repositorio" spellcheck="false" autocomplete="off" ${np.busy ? 'disabled' : ''}></div><p class="meta npwf">${ic('alert', 14)} Só repositórios <b>públicos</b> por enquanto. Repositório privado vai exigir uma conexão, que ficará no Rocruzta Hub.</p>${np.err ? `<p class="meta nperr">${esc(np.err)}</p>` : ''}<p class="meta">O Termix baixa o repositório para <b>${esc(S.settings.projectsRoot || 'a pasta de projetos')}</b> e cria o projeto nele.</p>`
    : np.where === 'dir'
    ? `<div class="nprow"><div class="pjpath" style="user-select:text" title="${esc(np.dir || '')}">${ic('folder', 16)}<span>${np.dir ? esc(np.dir) : 'Nenhuma pasta escolhida'}</span></div><button type="button" class="btn" data-nppick>Escolher pasta…</button></div><p class="meta">O Termix só registra a pasta, sem copiar nem mover nada. Para um projeto com mais de uma pasta (ex.: a do dev e a do orquestrador), escolha várias com Ctrl ou Shift.</p>`
    : `<p class="meta">O Termix cria e organiza a pasta dentro de <b>${esc(S.settings.projectsRoot || 'a pasta de projetos')}</b>.</p>`;
  if (wf && window.TermixMut) return window.TermixMut.pageHTML(np, folder); // DEV2-023: "Novo mutirão" cria um Mutirão (o Workflow antigo não é mais criado)
  return `<div class="npage"><div class="npinner">
    <div class="nphead"><span class="wfmark sm">${ic(wf ? 'workflow' : 'sparkles', 26)}</span><div><h2>${wf ? 'Novo Mutirão' : 'Novo Projeto'}</h2>
      <p class="meta">${wf ? 'Dois terminais lado a lado, sempre em Dangerously, para trabalhar o projeto em etapas.' : 'Conversa em bolhas com o Claude Code, sem terminal.'}</p></div></div>
    <div class="f"><label>Nome do projeto</label><input class="inp" type="text" id="npName" value="${esc(np.name)}" placeholder="Meu SaaS" maxlength="60"></div>
    <div class="f"><label>Pasta</label><div class="seg"><button type="button" class="${np.where === 'new' ? 'sel' : ''}" data-npwhere="new">Criar pasta nova</button><button type="button" class="${np.where === 'dir' ? 'sel' : ''}" data-npwhere="dir">Usar pasta existente</button><button type="button" class="${np.where === 'git' ? 'sel' : ''}" data-npwhere="git">Clonar do GitHub</button></div>${folder}</div>
    ${wf ? `<p class="meta npwf">${ic('alert', 14)} O Workflow usa sempre dois terminais fixos em Dangerously: sem pedir permissão e sem isolamento do sistema.</p>`
      : `<div class="f"><label>Permissão</label><div class="npmodes">${NP_PERMS.map(([v, i, l, d]) => `<button type="button" class="npm ${v === 'd' ? 'warn' : ''} ${v === np.perm ? 'sel' : ''}" data-npp="${v}">${ic(i, 26)}<b>${l}</b><small>${d}</small></button>`).join('')}</div></div>`}
    <div class="row2"><button class="btn pri big" data-npgo ${np.busy ? 'disabled' : ''}>${np.busy ? 'Clonando…' : np.where === 'git' ? (wf ? 'Clonar e criar workflow' : 'Clonar e criar chat') : (wf ? 'Criar workflow' : 'Criar chat')}</button></div></div></div>`;
}
async function npPick() {
  // DEV2-024: o seletor aceita várias pastas (pelo Organizador da dev2, quando carregado). Uma pasta: como sempre.
  // Mais de uma: abre o mapa do Organizador (papel de cada pasta e a conversa a retomar) e "Carregar" cria um projeto por pasta.
  const org = window.TermixOrg;
  const dirs = org ? await org.pick() : [await api.pickFolder()].filter(Boolean);
  if (!dirs || !dirs.length || !UI.np) return;
  if (dirs.length > 1 && org) {
    const np = UI.np; np.dir = null; renderPage();
    return org.mapaDe(dirs, np.name, () => { if (UI.np === np) UI.np = null; });
  }
  const dir = dirs[0];
  UI.np.dir = dir;
  if (!UI.np.name.trim()) UI.np.name = projNameClip(dir.split(/[\\/]/).filter(Boolean).pop()) || '';
  renderPage();
}
// Resolve a pasta do projeto novo (criar, usar existente ou clonar): { name, path, imported, note } ou null. Usada também pelo Mutirão (DEV2-023).
async function npResolve() {
  const np = UI.np; if (!np || np.busy) return null;
  let name = projNameClip(np.name), path, imported = false, note = '';
  if (np.where === 'git') {
    if (!np.url.trim()) { np.err = 'Cole o link do repositório.'; renderPage(); return; }
    np.busy = true; np.err = ''; renderPage();
    const r = await api.cloneProject(np.url, S.settings.projectsRoot);
    np.busy = false;
    if (!r || !r.ok) { np.err = (r && r.error) || 'Não consegui clonar.'; renderPage(); return; }
    path = r.path; name = name || projNameClip(r.name) || 'Projeto';
  } else if (np.where === 'dir') {
    if (!np.dir) { addEvent({ who: 'Projetos', msg: 'Escolha a pasta do projeto.' }); return; }
    if (S.projects.some((p) => p.path.toLowerCase() === np.dir.toLowerCase() && !p.archived)) { addEvent({ who: 'Projetos', msg: 'Essa pasta já está registrada.' }); return; }
    path = np.dir; imported = true;
    name = name || projNameClip(path.split(/[\\/]/).filter(Boolean).pop()) || 'Projeto';
  } else {
    if (!name) { const i = $('#npName'); if (i) i.focus(); return; }
    ({ path } = await api.createProject(name, S.settings.projectsRoot));
    if (connCfg().newProject === 'clean') {
      $('#modalRoot').innerHTML = '<div class="modal"><div class="dlg glass"><h2>Preparando o projeto limpo…</h2><p>Desligando plugins, MCPs e conectores só neste projeto. Leva alguns segundos.</p></div></div>';
      const out = await api.resDo('cleanProject', { projectPath: path });
      $('#modalRoot').innerHTML = '';
      note = out.ok ? `Projeto limpo: ${out.plugins} plugin${out.plugins === 1 ? '' : 's'} e ${out.mcps} MCP${out.mcps === 1 ? '' : 's'}/conectores desligados aqui.${out.userSkills ? ` ${out.userSkills} skill(s) de usuário continuam valendo (limite do Claude Code).` : ''}` : `Não consegui deixar o projeto limpo: ${out.message}`;
    }
  }
  return { name, path, imported, note };
}
async function npSubmit() {
  const np = UI.np; if (!np || np.busy) return;
  const wf = np.kind === 'workflow';
  const r = await npResolve(); if (!r) return;
  const { name, path, imported, note } = r;
  const found = imported && !wf ? (await api.scanSessions(path)).length : 0;
  UI.np = null;
  const ret = imported && !wf && window.TermixRet; // DEV2-026: pasta existente = projeto de desenvolvimento: estrutura, chats antigos, orquestrador e dev
  const p = addProject({ name, path, imported, noTab: found > 0 || !!ret, workflow: wf, first: { kind: 'chat', perm: np.perm === 'd' ? 'd' : 'n' } });
  if (note) addEvent({ who: name, msg: note });
  if (ret) { if (await ret.aoAdicionar(p, { pastas: [path] })) return; if (!found) createTab(p, np.perm === 'd' ? 'd' : 'n', { kind: 'chat' }); }
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
function addProject({ name, path, imported, noTab, first, workflow }) {
  const p = { id: uuid(), name, path, imported, archived: false, tabs: [], activeTab: null, g: S.projects.length, open: true, ...(workflow ? { kind: 'workflow' } : {}) };
  S.projects.push(p); S.settings.sideKind = kindOf(p); setCatOpen(kindOf(p), true);
  UI.cur = { p: p.id, page: 'Terminais' }; UI.last = p.id; UI.res = null;
  save(); renderAll();
  if (!noTab && !workflow) { if (first && first.kind === 'chat') createTab(p, first.perm, { kind: 'chat' }); else createTab(p, first ? first.perm : 'n'); }
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

const PROJ_NAME_MAX = 60; // nome do projeto: limite de tamanho (a pasta criada usa o nome; Windows aceita 255 por nome e 260 no caminho)
const projNameClip = (s) => String(s || '').trim().slice(0, PROJ_NAME_MAX);
const PJ_ACTS = [
  { k: 'open', i: 'folder', t: 'Abrir pasta', d: 'Mostra a pasta no Explorador de Arquivos.' },
  { k: 'rename', i: 'edit', t: 'Renomear', d: 'Muda só o nome na interface; a pasta fica onde está.' },
  { k: 'archive', i: 'archive', t: 'Arquivar', d: 'Tira da lista sem apagar nada; dá para restaurar em Configurações.' },
  { k: 'remove', i: 'x', t: 'Remover do app', d: 'Esquece o projeto aqui; os arquivos da pasta não são apagados.', bad: true },
  { k: 'delete', i: 'trash', t: 'Excluir pasta…', d: 'Envia a pasta para a Lixeira do Windows, com confirmação.', bad: true },
];
async function projectMenuFlow() {
  const p = curProject();
  if (!p) return;
  UI.menu = null; renderMenu();
  const r = await modal({
    title: `<span class="clamp3" title="${esc(p.name)}">${esc(p.name)}</span>`,
    body: `<div class="pjhead"><span class="pjpath" style="user-select:text" title="${esc(p.path)}">${ic('folder', 16)}<span>${esc(p.path)}</span></span><span class="pjtag">${p.imported ? 'Pasta importada' : 'Criada pelo Termix'}</span></div>
      <p class="meta">${p.imported ? 'O app só registra a pasta, sem copiar nem mover nada.' : 'Pasta criada e organizada pelo app.'}</p>
      <div class="pjlist">${PJ_ACTS.filter((x) => !(x.k === 'delete' && p.imported)).map((x) => `<button type="button" class="pjrow ${x.bad ? 'bad' : ''}" data-pj="${x.k}">${ic(x.i, 20)}<span><b>${x.t}</b><small>${x.d}</small></span>${ic('chevr', 14)}</button>`).join('')}</div>`,
    buttons: [['Fechar', null], ...PJ_ACTS.map((x) => [x.t, x.k, 'hide'])],
    onOpen: (root) => { root.querySelectorAll('[data-pj]').forEach((b) => { b.onclick = () => root.querySelector(`.foot2 [data-mb="${PJ_ACTS.findIndex((x) => x.k === b.dataset.pj) + 1}"]`).click(); }); },
  });
  if (r.value === 'open') api.openFolder(p.path);
  if (r.value === 'rename') {
    const n = await modal({ title: 'Renomear projeto', body: `<p>Só o nome na interface muda; a pasta continua no mesmo lugar.</p><div class="f"><input class="inp" type="text" data-f="name" value="${esc(p.name)}" maxlength="60"></div>`, buttons: [['Cancelar', null], ['Salvar', 'ok', 'pri']] });
    if (n.value === 'ok' && projNameClip(n.form.name)) { p.name = projNameClip(n.form.name); save(); renderAll(); }
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
  if (UI.res && UI.res.menu && UI.cur.page === 'Conectores' && !q('.cn-menu,[data-con="menu"]')) { UI.res.menu = ''; renderPage(); }
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
  if ((el = q('[data-conn]'))) { S.settings.connectors = { v: 1, newProject: el.dataset.conn }; save(); renderPage(); return; }
  if (q('[data-clrreset]')) { S.settings.clear.template = null; save(); renderPage(); return; }
  if ((el = q('[data-rail]'))) {
    const k = el.dataset.rail; railCfg()[k] = !railCfg()[k]; save();
    renderMenu(); renderRail(); renderTop(); return;
  }
  if (q('#rootPick')) { api.pickProjectsRoot().then((r) => { if (r) { S.settings.projectsRoot = r; save(); renderPage(); } }); return; }
  if (q('#rootAuto')) { delete S.settings.projectsRoot; save(); renderPage(); return; }
  if ((el = q('[data-bg]'))) { S.settings.bg = el.dataset.bg; save(); applyBg(); if (UI.cur.page === 'Configurações') renderPage(); return; }
  if ((el = q('[data-win]'))) { api.winCtl(el.dataset.win); return; }
  if (q('[data-togside]')) { toggleSide(); return; }
  if ((el = q('[data-mutgo]'))) { const id = el.dataset.mutgo; if (!proj(id)) return; UI.cur = { p: id, page: 'Terminais' }; UI.last = id; UI.res = null; save(); renderAll(); if (window.TermixMut) window.TermixMut.open(id); return; } // DEV2-023: mutirão da pasta "Mutirão" = o projeto com o painel do Mutirão (monitoramento)
  if ((el = q('[data-ph]'))) { if (e.target.closest('.chev')) projToggle(el.dataset.ph); else projClick(el.dataset.ph); return; } // barra aberta: o nome abre o projeto (e mostra as funções dele); a setinha só abre/fecha as funções, sem trocar de tela
  if ((el = q('[data-pt]'))) { projClick(el.dataset.pt); return; }
  if ((el = q('[data-pmenu]'))) { UI.cur = { p: el.dataset.pmenu, page: UI.cur.p === el.dataset.pmenu ? UI.cur.page : 'Terminais' }; renderAll(); projectMenuFlow(); return; }
  if ((el = q('[data-step]'))) { // botões − e + do campo numérico
    const box = el.closest('.numf'), inp = box.querySelector('input');
    inp.value = Math.min(+box.dataset.max, Math.max(+box.dataset.min, (parseInt(inp.value, 10) || 0) + (+el.dataset.step)));
    inp.dispatchEvent(new Event('input', { bubbles: true })); return;
  }
  if ((el = q('[data-cd]'))) { codeAct(el.dataset.cd, el.dataset.cv); return; }
  if ((el = q('[data-con]'))) { conAct(el.dataset.con, el.dataset.cv, el); return; }
  if ((el = q('[data-ract]'))) { resAct(el.dataset.ract, el.dataset.rk); return; }
  if ((el = q('[data-ctab]'))) { UI.cons.tab = el.dataset.ctab; renderPage(); return; }
  if ((el = q('[data-cper]'))) { UI.cons.per = el.dataset.cper; renderPage(); return; }
  if ((el = q('[data-cmore]'))) { UI.cons.more = !UI.cons.more; renderPage(); return; }
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
  if (q('[data-wfstart]')) { const wp = curProject(); if (wp) { wp.wfStarted = true; save(); renderAll(); } return; }
  if ((el = q('[data-newk]'))) return goNew(el.dataset.newk);
  if (q('[data-import]')) return goNew('chat', 'dir');
  if (q('[data-patch]')) { const v = APP_VER && typeof PATCH_NOTES !== 'undefined' ? PATCH_NOTES.filter((e) => e.v === APP_VER) : []; showPatchNotes(v.length ? v : (typeof PATCH_NOTES !== 'undefined' ? PATCH_NOTES.slice(0, 1) : [])); return; }
  if ((el = q('[data-sidecat]'))) {
    const k = el.dataset.sidecat; setCatOpen(k, !catOpen(k)); save();
    const box = document.querySelector('#side .cat[data-cat="' + k + '"]');
    if (box) box.classList.toggle('open', catOpen(k)); else renderSide(); // barra aberta: troca a classe no lugar para a animação rodar; recolhida: redesenha
    return;
  }
  if ((el = q('[data-npwhere]'))) { if (UI.np) { UI.np.where = el.dataset.npwhere; renderPage(); if (UI.np.where === 'dir' && !UI.np.dir) npPick(); } return; }
  if (q('[data-nppick]')) return npPick();
  if ((el = q('[data-npp]'))) { if (UI.np) { UI.np.perm = el.dataset.npp; renderPage(); } return; }
  if (q('[data-npgo]')) return npSubmit();
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
  if (id === 'resq' && UI.res) {
    UI.res.q = e.target.value; UI.res.show = CON_PAGE;
    if (UI.res.mode === 'desc' && UI.res.src === 'reg') { clearTimeout(DISC.t); DISC.t = setTimeout(discEnsure, 350); } else repaintRes();
    return;
  }
  if (id === 'clrTpl') { S.settings.clear.template = e.target.value === HANDOFF_DEF ? null : e.target.value; save(); return; } // igual ao padrão = continua "padrão do app" (acompanha melhorias futuras)
  if (id === 'clrAlert') {
    const c = S.settings.clear;
    const d = e.target.value.replace(/\D/g, '').slice(0, 3); if (d !== e.target.value) e.target.value = d; c.alert = Math.min(100, Math.max(0, parseInt(d, 10) || 0));
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
  if (resTick % 3 === 0) resLoadPlugins(p, true);
  if (resTick % 15 === 0) resLoadMcp(p, true);
  if (changed) repaintRes();
}, 4000);

// dois modos: 'gradient' (Degradê) e 'blur' (Ofuscado); valores antigos 'acrylic'/'mica' contam como Ofuscado
const bgMode = () => (['blur', 'acrylic', 'mica'].includes(S.settings.bg) ? 'blur' : 'gradient');
/* ---------- geometria do vidro: painéis flutuantes, como no Rocruzta Hub (TASK-121) ----------
   Cabeçalho e rodapé ficam soltos sobre o fundo; a barra lateral e o braço de notificações são painéis de vidro (um recorte só, em #glass);
   o palco (#col) é o painel de conteúdo, com vidro próprio. GAP = vão entre painéis e até a borda; RP = raio dos painéis. */
const EMBED = !!window.termixEmbed; // TASK-135: rodando dentro do Rocruzta Hub (sem cabeçalho, janela e notificações próprios)
// Embutido no Hub: painéis acoplados e encostados nas bordas, separados só por linhas de 1px (sem vão, raio nem cabeçalho solto).
const FR = { R: 22, RP: EMBED ? 0 : 18, GAP: EMBED ? 0 : 10, HEAD: EMBED ? 0 : 44, DOCK: 36, BOT: EMBED ? 36 : 56, SIDE_OPEN: EMBED ? 224 : 260, SIDE_MINI: EMBED ? 0 : 64, ARM_OPEN: 360, ARM_CLOSED: EMBED ? 0 : 10 };
const GEO = { sideW: FR.SIDE_OPEN, armW: FR.ARM_CLOSED, bot: FR.BOT }; // bot fixo: a base não engrossa
// abrir/fechar a barra lateral só com a largura animando (sem esmaecer): o conteúdo aberto fica com largura fixa e é revelado/escondido pela borda;
// ao abrir, o conteúdo aberto entra no começo; ao fechar, o recolhido só entra quando a barra termina de encolher
let sideSwapping = false;
function toggleSide() {
  if (sideSwapping) return;
  sideSwapping = true;
  const side = $('#side'), closing = !S.settings.sideCollapsed;
  side.classList.add('anim');
  S.settings.sideCollapsed = closing; save(); renderSide(); // o recolhido (centralizado) já entra no começo e acompanha a barra encolhendo
  tween('sideW', closing ? FR.SIDE_MINI : FR.SIDE_OPEN, 240);
  setTimeout(() => {
    side.classList.remove('anim'); side.scrollLeft = 0; sideSwapping = false;
    const cur = side.querySelector(`[data-pid="${UI.cur.p}"]`); if (cur) cur.scrollIntoView({ block: 'nearest', inline: 'nearest' }); side.scrollLeft = 0; // traz o projeto atual à vista já com a barra no tamanho final
  }, 250);
}
const sideTarget = () => (S.settings.sideCollapsed ? FR.SIDE_MINI : FR.SIDE_OPEN);
const armTarget = () => (UI.actOpen ? FR.ARM_OPEN : FR.ARM_CLOSED);

// telas que não são terminal nem chat (Plugins, Skills, MCPs, Consumo, Integrações, Configurações, sem projeto): o painel de conteúdo desce até perto da base e sem o rodapé de funções (TASK-042)
const flatMode = () => ['page', 'empty'].includes(mode());
const rrect = (x, y, w, h, r) => { r = Math.max(0, Math.min(r, w / 2, h / 2)); return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`; };
function framePath(W, H, S_, A, bot) {
  const { RP, GAP, HEAD: h } = FR;
  const side = rrect(GAP, h, S_ - 2 * GAP, H - h - bot, RP);
  const aw = A - 2 * GAP; // painel de notificações: cresce junto com o braço
  return aw > 2 ? side + rrect(W - A + GAP, h, aw, H - h - bot, RP) : side;
}

function layout() {
  const f = $('#frame');
  const W = f.clientWidth, H = f.clientHeight;
  if (!W || !H) return;
  const flat = flatMode();
  if (flat !== document.body.classList.contains('flatpage')) { document.body.classList.toggle('flatpage', flat); setTimeout(() => { if (typeof fitActive === 'function') fitActive(); }, 0); } // o palco muda de altura: reajusta o terminal
  if (EMBED) { // no Hub, recolher a barra lateral a esconde por inteiro (como no Claude Desktop); um botão no canto reabre
    document.body.classList.toggle('sidehidden', GEO.sideW < 8);
    if (!$('#sidereopen')) $('#col').insertAdjacentHTML('beforeend', '<button id="sidereopen" data-togside title="Mostrar a barra lateral" aria-label="Mostrar a barra lateral">' + ic('panel', 18) + '</button>');
  }
  const sw = GEO.sideW;
  const bot = flat ? FR.GAP : GEO.bot; // o palco termina acima do rail inferior (terminal, chat, Web); a barra lateral e as notificações descem sempre até o chão
  const d = framePath(W, H, sw, GEO.armW, FR.GAP);
  $('#glass').style.clipPath = `path(evenodd, '${d}')`;
  $('#edgePath').setAttribute('d', d);
  document.documentElement.style.setProperty('--head', `${FR.HEAD}px`);
  Object.assign($('#side').style, { left: `${FR.GAP}px`, width: `${Math.max(0, sw - 2 * FR.GAP)}px` });
  Object.assign($('#arm').style, { right: `${FR.GAP}px`, width: `${Math.max(0, GEO.armW - 2 * FR.GAP)}px` });
  $('#arm').classList.toggle('open', UI.actOpen && GEO.armW > 200);
  document.documentElement.style.setProperty('--bot', `${FR.GAP}px`);
  Object.assign($('#col').style, { left: `${sw}px`, top: `${FR.HEAD}px`, right: `${GEO.armW}px`, bottom: `${bot}px` });
  Object.assign($('#appfoot').style, { left: `${sw}px`, right: `${GEO.armW}px`, bottom: `${FR.GAP}px`, height: `${FR.DOCK}px` }); // rail: ao lado da barra lateral, sob o palco; mesmo vão (GAP) acima, abaixo e dos lados
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
  FR.R = EMBED ? 0 : mx ? 0 : mat ? 8 : 22; // maximizado: tela cheia, sem margem nem cantos; com material: cantos do Windows 11 (~8 px)
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
let BOOTED = false;
(async function init() {
  const saved = await api.loadState();
  const hadState = !!(saved && Array.isArray(saved.projects));
  if (saved && Array.isArray(saved.projects)) S = { ...saved, settings: { termOp: 88, sideCollapsed: false, ...(saved.settings || {}) } };
  S.settings.rail = S.settings.rail && S.settings.rail.v === RAIL_DEF.v ? { ...RAIL_DEF, ...S.settings.rail } : { ...RAIL_DEF };
  { const sc = S.settings.clear || {}; S.settings.clear = { v: CLEAR_DEF.v, alert: typeof sc.alert === 'number' ? sc.alert : CLEAR_DEF.alert, template: typeof sc.template === 'string' ? sc.template : null }; } // descarta os campos do modelo antigo (pedidos de fechar e retomar)
  HANDOFF_DEF = await api.handoffTemplate();
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
  BOOTED = true;
  const sp = $('#splash');
  sp.classList.add('out');
  setTimeout(() => sp.remove(), 500);
  setTimeout(() => maybeShowPatchNotes(hadState), 900);
})();

// Reabertura sob demanda (TASK-125): ao abrir o app só o projeto que aparece é retomado; os outros têm as abas na lista (do estado salvo) e só retomam as conversas quando você abre o projeto.
// Com 30 projetos abertos, retomar tudo na entrada demorava muito (um processo do Claude por aba de terminal). Cada projeto é retomado uma vez por abertura do app; a aba ativa vai primeiro.
const RESTORING = new Map(); // id do projeto -> promessa (retomada já feita ou em andamento)
function restoreProject(p) {
  if (!p) return Promise.resolve();
  if (RESTORING.has(p.id)) return RESTORING.get(p.id);
  const act = p.activeTab;
  const pr = (async () => {
    const pend = p.tabs.filter((t) => t.live && t.open && !t.archived).sort((x, y) => (x.id === act ? 0 : 1) - (y.id === act ? 0 : 1));
    for (const t of pend) {
      if (RT[t.id] && RT[t.id].alive) continue;
      try { await launch(p, t, 'resume'); } catch { /* a aba mostra a própria falha */ }
      await new Promise((ok) => setTimeout(ok, 300));
    }
  })();
  RESTORING.set(p.id, pr);
  return pr;
}
async function restoreOnOpen() { await restoreProject(curProject()); }


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

new MutationObserver(() => { for (const id in RT) if (RT[id].term) RT[id].term.options.theme = termTheme(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-hub-theme'] });
