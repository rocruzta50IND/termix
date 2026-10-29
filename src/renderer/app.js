'use strict';
const api = window.termix;

const COLORS = ['#7C8CFF', '#34D399', '#F472B6', '#FBBF24', '#22D3EE', '#FB923C', '#A78BFA', '#F87171', '#84CC16', '#38BDF8'];
const GRADS = [['#60a5fa', '#22d3ee'], ['#94a3b8', '#64748b'], ['#38bdf8', '#6366f1'], ['#a5b4fc', '#60a5fa'], ['#67e8f9', '#34d399']];
const GLOBALS = [['Consumo', 'gauge'], ['Integrações', 'link'], ['Configurações', 'gear']];
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
  bell: '<path d="M6 10a6 6 0 0 1 12 0c0 4.6 1.8 6 1.8 6H4.2S6 14.6 6 10z"/><path d="M10 19.2a2.2 2.2 0 0 0 4 0"/>',
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
const UI = { cur: { p: null, page: 'Terminais' }, last: null, actOpen: false, pop: false, menu: null, events: [], scan: null, env: null, limits: null };
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
const stOf = (tab) => (RT[tab.id] ? RT[tab.id].st : 'end');
const aliveTabs = () => S.projects.flatMap((p) => p.tabs.filter((t) => RT[t.id] && RT[t.id].alive).map((t) => ({ p, tab: t })));

/* ---------- eventos (notificações) ---------- */
function addEvent(ev) {
  UI.events.unshift({ ts: Date.now(), done: false, acts: [], ...ev });
  UI.events = UI.events.slice(0, 40);
  renderAct(); renderTop();
}
function ago(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 45) return 'agora';
  if (s < 3600) return `há ${Math.max(1, Math.round(s / 60))} min`;
  return `há ${Math.round(s / 3600)} h`;
}
const pending = () => UI.events.filter((e) => !e.done).length;

/* ---------- terminais ---------- */
function termTheme() {
  return { background: 'rgba(0,0,0,0)', foreground: '#dcd9ee', cursor: '#8B7BFF', selectionBackground: 'rgba(139,123,255,.35)', scrollbarSliderBackground: 'rgba(255,255,255,.14)', scrollbarSliderHoverBackground: 'rgba(255,255,255,.28)', scrollbarSliderActiveBackground: 'rgba(255,255,255,.38)' };
}

function ensureRT(tab) {
  if (RT[tab.id]) return RT[tab.id];
  const term = new Terminal({
    fontFamily: '"Cascadia Mono","Cascadia Code",Consolas,monospace',
    fontSize: 13, cursorBlink: true, allowTransparency: true, scrollback: 5000, theme: termTheme(),
  });
  const fit = new FitAddon.FitAddon();
  term.loadAddon(fit);
  const el = document.createElement('div');
  el.className = 'tview';
  $('#termHost').appendChild(el);
  const r = (RT[tab.id] = { term, fit, el, opened: false, alive: false, st: 'end', lastData: 0, lastInput: 0, spawnAt: 0, evidence: false, killing: false, waiter: null });
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
  fitTimer = setTimeout(() => { fitTimer = null; fitNow(); }, 60);
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
  const r = ensureRT(tab);
  // aba criada mas nunca usada: não há histórico para retomar (o Claude diria "No conversation found"); abre a mesma conversa vazia
  if (mode === 'resume' && !(await api.sessionExists(p.path, tab.sessionId))) mode = 'new';
  r.alive = true; r.killing = false; r.evidence = false; r.spawnAt = Date.now(); r.lastData = 0;
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
    api.kill(tab.id);
    setTimeout(() => { if (r.waiter) { r.waiter = null; r.alive = false; resolve(); } }, 3000);
  });
}

async function restartTab(p, tab) {
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

async function newConversation(p, tab) {
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
  const now = Date.now();
  r.lastData = now;
  if (r.st === 'wait' && now - r.lastInput > 500) setSt(f.tab, 'work');
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
    addEvent({
      c: tab.color, who: tab.name,
      msg: 'Falha ao iniciar ou retomar a conversa. A aba foi mantida; nenhuma conversa nova foi criada.',
      acts: [['Tentar de novo', 'restart', tab.id], ['Nova conversa', 'newconv', tab.id]],
    });
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
  renderTop();
  if (UI.pop) renderPop();
  if (UI.cur.p === '_' && UI.cur.page === 'Consumo') renderPage();
}
api.onMetrics(onMetric);
setInterval(() => { renderTop(); }, 30000); // atualiza "renova em" e "atualizado há"

// heurística: sem saída por 2,5 s = aguardando você (a validar contra o comportamento real da ferramenta)
setInterval(() => {
  for (const { p, tab } of aliveTabs()) {
    const r = RT[tab.id];
    if (r.st === 'work' && Date.now() - r.lastData > 2500 && Date.now() - r.spawnAt > 2500) {
      setSt(tab, 'wait');
      const visible = UI.cur.p === p.id && UI.cur.page === 'Terminais' && curTab(p) && curTab(p).id === tab.id;
      if (!visible) addEvent({ c: tab.color, who: tab.name, msg: 'Terminou · aguarda você' });
    }
  }
}, 700);
setInterval(renderAct, 30000);

/* ---------- modal ---------- */
function modal({ title, body = '', buttons = [['Cancelar', null], ['OK', 'ok', 'pri']], onOpen }) {
  return new Promise((resolve) => {
    const root = $('#modalRoot');
    root.innerHTML = `<div class="modal"><div class="dlg glass"><h2>${title}</h2>${body}<div class="foot2">${buttons.map(([l, , c], i) => `<button class="btn ${c || ''}" data-mb="${i}">${l}</button>`).join('')}</div></div></div>`;
    const collect = () => { const f = {}; root.querySelectorAll('[data-f]').forEach((i) => { f[i.dataset.f] = i.value; }); return f; };
    const done = (v) => { const form = collect(); const picked = [...root.querySelectorAll('[data-sid]:checked')].map((i) => i.dataset.sid); root.innerHTML = ''; resolve({ value: v, form, picked }); fitActive(); };
    root.querySelectorAll('[data-mb]').forEach((b) => { b.onclick = () => done(buttons[+b.dataset.mb][1]); });
    root.firstElementChild.onclick = (e) => { if (e.target === root.firstElementChild) done(null); };
    root.onkeydown = (e) => {
      if (e.key === 'Escape') done(null);
      if (e.key === 'Enter' && e.target.tagName === 'INPUT') done(buttons[buttons.length - 1][1]);
    };
    if (onOpen) onOpen(root);
    const first = root.querySelector('input[type=text]'); if (first) { first.focus(); first.select(); }
  });
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

function mode() {
  if (UI.cur.p === '_') return 'page';
  const p = curProject();
  if (!p) return 'empty';
  if (UI.cur.page !== 'Terminais') return 'page';
  return curTab(p) ? 'term' : 'noterm';
}

function renderTop() {
  const L = UI.limits;
  const lim = (lbl, d) => `<div class="lim"><span class="lb">${lbl}</span>${liveWin(d) ? `${barHTML(d.pct, 78)}<b class="${pctClass(d.pct)}">${Math.round(d.pct)}%</b><span class="rn" title="Renova em ${fmtReset(d.resets)}">${ic('clock', 12)}${fmtReset(d.resets)}</span>` : `${barHTML(0, 78)}<span class="na">indisponível</span>`}</div>`;
  const age = L ? Math.floor((Date.now() - L.updated) / 60000) : null;
  const fresh = !L ? 'none' : age >= 10 ? 'stale' : 'ok';
  const upd = !L ? 'Sem dados ainda — aparecem depois da primeira resposta de uma sessão' : age >= 10 ? `Desatualizado · última leitura ${ago(L.updated)}` : `Atualizado ${ago(L.updated)}`;
  const maxIcon = UI.maxed
    ? '<rect x="7" y="9" width="10" height="10" rx="1.5"/><path d="M9.5 9V7a1.5 1.5 0 0 1 1.5-1.5h6A1.5 1.5 0 0 1 18.5 7v6A1.5 1.5 0 0 1 17 14.5h-2"/>'
    : '<rect x="5.5" y="5.5" width="13" height="13" rx="1.8"/>';
  $('#topbar').innerHTML = `<div class="brand"><img class="logo" src="../../assets/logo-mark.svg" alt="">Termix</div><span class="sp"></span>
    <div class="lims" data-lim title="${upd}">${lim('5h', L && L.five)}<span class="lsep"></span>${lim('7d', L && L.week)}<span class="lsep"></span><i class="fresh ${fresh}"></i></div>
    <span class="sp"></span>
    <button class="tbtn round ${UI.actOpen ? 'on' : ''}" data-togact title="Notificações">${ic('bell', 18)}${pending() ? `<span class="nb">${pending()}</span>` : ''}</button>
    <div class="wc">
      <button data-win="min" title="Minimizar">${ic('minus', 16)}</button>
      <button data-win="max" title="${UI.maxed ? 'Restaurar' : 'Maximizar'}"><svg class="i" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">${maxIcon}</svg></button>
      <button class="close" data-win="close" title="Fechar">${ic('x', 16)}</button>
    </div>`;
}

function renderSide() {
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
      const dotc = work ? 'var(--work)' : wait ? 'var(--ok)' : '';
      const letter = esc(p.name.trim()[0] ? p.name.trim()[0].toUpperCase() : '?');
      return `<button class="av ${UI.cur.p === p.id ? 'active' : ''}" style="--c1:${g[0]};--c2:${g[1]}" data-go="${p.id}|${UI.cur.p === p.id ? UI.cur.page : 'Terminais'}" data-tip="${esc(p.name)}">${letter}${n ? `<span class="b">${n}</span>` : ''}${dotc ? `<span class="st" style="background:${dotc}"></span>` : ''}</button>`
        + (cp && cp.id === p.id ? SUBS.map(([n, i]) => `<button class="ci sub ${isCur(p.id, n) ? 'active' : ''}" data-go="${p.id}|${n}" data-tip="${n}">${ic(i, 17)}</button>`).join('') : '');
    }).join('')
      + `<button class="ci add" data-newproj data-tip="Novo projeto">${ic('plus', 17)}</button><span class="sp"></span><span class="rsep"></span>`
      + GLOBALS.map(([n, i]) => `<button class="ci ${isCur('_', n) ? 'active' : ''}" data-go="_|${n}" data-tip="${n}">${ic(i, 19)}</button>`).join('');
    return;
  }
  side.innerHTML = `<div class="shead2"><span class="label">Projetos</span>${toggle}</div>
    ${ps.map((p) => `<div class="proj ${p.open !== false ? 'open' : ''}">
      <div class="prow"><button class="ph" data-ph="${p.id}"><span class="chev">${ic('chevr', 12)}</span>${esc(p.name)}</button><button class="pm" data-pmenu="${p.id}" title="Gerenciar projeto">${ic('dots', 16)}</button></div>
      <div class="subs">${SUBS.map(([n, i]) => `<button class="item ${isCur(p.id, n) ? 'active' : ''}" data-go="${p.id}|${n}"><span class="ico">${ic(i, 17)}</span>${n}${n === 'Terminais' && openTabs(p).length ? `<span class="cnt">${openTabs(p).length}</span>` : ''}</button>`).join('')}</div></div>`).join('')}
    <button class="newproj" data-newproj>+ Novo projeto</button>
    <span class="sp"></span>
    <div class="label">Geral</div>
    ${GLOBALS.map(([n, i]) => `<button class="item ${isCur('_', n) ? 'active' : ''}" data-go="_|${n}"><span class="ico">${ic(i, 17)}</span>${n}</button>`).join('')}`;
}

function renderTabs() {
  const p = curProject();
  if (!p || mode() !== 'term') { $('#tabsRow').innerHTML = ''; $('#sess').classList.remove('working'); return; }
  const cur = curTab(p);
  const closed = p.tabs.filter((t) => !t.open && !t.archived).length;
  const st = stOf(cur), [sc, sl] = STATES[st];
  $('#sess').style.setProperty('--tc', cur.color);
  $('#sess').classList.toggle('working', st === 'work');
  $('#tabsRow').innerHTML = openTabs(p).map((t) => `<button class="tab ${t.id === cur.id ? 'active' : ''}" style="--c:${t.color}" data-tab="${t.id}" title="Clique duplo para renomear ou mudar a cor"><i class="dot ${STATES[stOf(t)][0]}"></i><span class="nm">${esc(t.name)}</span>${t.perm === 'd' ? `<span class="pw" title="Dangerously: ignora as verificações de permissão">${ic('alert', 13)}</span>` : ''}<span class="x" data-x="${t.id}">${ic('x', 13)}</span></button>`).join('')
    + `<button class="plus" data-newtab="claude|n" title="Novo terminal (Claude Code)">${ic('plus', 17)}</button><button class="plus chev2" data-menu="new" title="Escolher a ferramenta">${ic('chevd', 14)}</button>
    <span class="sp"></span>
    <div class="tctl">
      ${closed ? `<button class="linkbtn" data-closedlist>Fechadas (${closed})</button>` : ''}
      <span class="state"><i class="dot ${sc}"></i>${sl}</span>
      ${st === 'fail' ? `<button class="btn sm" data-newconv="${cur.id}">Nova conversa</button>` : ''}
      <button class="btn icon ${st === 'restart' ? 'spin' : ''}" data-restart="${cur.id}" ${st === 'restart' ? 'disabled' : ''} title="${st === 'end' ? 'Retomar a conversa' : st === 'fail' ? 'Tentar de novo' : 'Reiniciar com a conversa atual'}" aria-label="Reiniciar">${ic('refresh', 15)}</button>
    </div>`;
}

function emptyHTML() {
  return `<div class="empty"><h2>Comece criando um projeto</h2><p>O Termix cria a pasta do projeto para você, ou registra uma pasta que você já tem — sem copiar nem mover nada.</p>
    <div class="row2"><button class="btn pri" data-newproj>Novo projeto</button><button class="btn" data-import>Importar pasta existente</button></div></div>`;
}
const ptitle = (t) => `<div class="ptitle"><span>${UI.cur.p === '_' ? 'Geral' : esc(curProject().name)} ›</span> ${t}</div>`;

function resPageHTML(kind) {
  const p = curProject();
  if (!UI.scan || UI.scan.pid !== p.id) {
    api.scan(p.path).then((data) => { UI.scan = { pid: p.id, json: JSON.stringify(data), data }; if (mode() === 'page' && UI.cur.page === kind) renderPage(); });
    return `<div class="page">${ptitle(kind)}<div class="empty">Lendo configurações…</div></div>`;
  }
  const list = UI.scan.data[kind.toLowerCase()];
  return `<div class="page">${ptitle(kind)}<div class="note">Somente leitura: mostra o que está configurado nos arquivos do Claude Code (escopos Usuário, Projeto e Local). Mudanças feitas pelo terminal aparecem aqui em poucos segundos. Gerenciar pelo app fica para uma próxima fase.</div>
    ${list.length ? `<div class="cards">${list.map((x) => `<div class="card"><h5>${esc(x.name)}</h5><p>${kind.slice(0, -1)} do Claude Code</p><div class="tags"><span class="tag">Escopo: ${x.scope}</span><span class="tag ${x.kind}">${x.status}</span></div></div>`).join('')}</div>` : `<div class="empty" style="height:auto">Nenhum(a) ${kind.slice(0, -1).toLowerCase()} encontrado(a) para este projeto.</div>`}</div>`;
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

function confHTML() {
  const arch = S.projects.filter((p) => p.archived);
  return `<div class="page">${ptitle('Configurações')}<div class="card" style="padding:6px 18px">
    <div class="row"><div class="grow">Opacidade do terminal<small>Mais baixo = mais vidro, menos legibilidade</small></div><input type="range" min="50" max="100" value="${S.settings.termOp}" id="rngOp"><span id="opv" class="chip">${S.settings.termOp}%</span></div>
    <div class="row"><div class="grow">Fundo do app<small>Degradê: o app é o degradê e o resto fica transparente. Ofuscado: o mesmo degradê, mais suave, com o Windows de fundo aparecendo desfocado por trás (Windows 11). Trocar de um para o outro pede para reabrir o app.</small></div>
      <div class="seg"><button class="${bgMode() === 'gradient' ? 'sel' : ''}" data-bg="gradient">Degradê</button><button class="${bgMode() === 'blur' ? 'sel' : ''}" data-bg="blur">Ofuscado</button></div></div>
    <div class="row"><div class="grow">Pasta raiz dos projetos criados pelo app<small>Projetos importados ficam onde já estão</small></div><span class="chip" id="rootChip">…</span></div>
    <div class="row"><div class="grow">Ao fechar o app<small>Encerra os processos, com confirmação. As conversas ficam guardadas.</small></div><span class="chip">Pergunta antes de sair</span></div>
    <div class="row"><div class="grow">Ao reabrir<small>Reabre sozinho os terminais que estavam abertos, retomando as conversas</small></div><span class="chip">Restaura sozinho</span></div></div>
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
  return `<div class="empty"><h2>Nenhum terminal aberto</h2>${list}<div class="row2"><button class="btn pri" data-newtab="claude|n">+ Terminal</button></div></div>`;
}

function renderPage() {
  const m = mode();
  let html = '';
  if (m === 'empty') html = emptyHTML();
  else if (m === 'noterm') html = noTermHTML(curProject());
  else if (UI.cur.p === '_') html = { Consumo: consumoHTML, 'Integrações': integHTML, 'Configurações': confHTML }[UI.cur.page]();
  else if (m === 'page') html = resPageHTML(UI.cur.page);
  $('#page').innerHTML = html;
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
  a.innerHTML = `<h3>Notificações</h3><div class="list">${UI.events.length ? UI.events.map((e, i) => `<div class="ev ${e.done ? 'done' : ''}" style="--c:${e.c || '#8B7BFF'}"><div class="h">${esc(e.who)}<small>${ago(e.ts)}</small></div><p>${esc(e.msg)}</p>
    ${e.acts.length && !e.done ? `<div class="acts">${e.acts.map(([l, k, id], j) => `<button class="btn sm ${j ? '' : 'pri'}" data-ev="${i}|${k}|${id}">${l}</button>`).join('')}</div>` : ''}</div>`).join('') : '<div class="empty" style="padding:24px;height:auto">Nada por aqui</div>'}</div>`;
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
  const p = curProject();
  const closed = p ? p.tabs.filter((t) => !t.open && !t.archived).length : 0;
  $('#menuRoot').innerHTML = `<div class="menu" style="left:${Math.max(8, Math.min(m.x, window.innerWidth - 320))}px;top:${m.y}px">
    <button class="mi" data-newtab="claude|n"><span class="t">${ic('sparkles', 16)} Claude Code</span><small>Permissões normais</small></button>
    <button class="mi warn" data-newtab="claude|d"><span class="t">${ic('alert', 16)} Claude Code · Dangerously</span><small>Ignora as verificações de permissão. Sem isolamento do sistema.</small></button>
    <div class="msep"></div>
    <button class="mi" disabled><span class="t">${ic('terminal', 16)} Codex</span><small>Em breve</small></button>
    <div class="msep"></div>
    <button class="mi" data-impsess><span class="t">Importar conversas existentes…</span><small>Abre conversas do Claude Code já feitas nesta pasta</small></button>
    ${closed ? `<button class="mi" data-closedlist><span class="t">Sessões fechadas (${closed})…</span></button>` : ''}
    <button class="mi" data-projmenu><span class="t">Gerenciar projeto…</span></button></div>`;
}

function renderChrome() { renderSide(); renderTabs(); renderTop(); if (UI.pop) renderPop(); }

function renderAll() {
  const m = mode();
  renderTop(); renderSide(); renderTabs(); renderPage(); renderPop(); renderAct(); renderMenu();
  $('#tabsRow').classList.toggle('hide', m !== 'term');
  $('#sess').classList.toggle('hide', m !== 'term');
  $('#page').classList.toggle('hide', m === 'term');
  document.documentElement.style.setProperty('--term-op', S.settings.termOp / 100);
  if (m === 'term') showTab(curTab(curProject()));
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
  addProject({ name, path, imported: false });
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
    p.tabs.push({ id: uuid(), sessionId: s.id, agent: 'claude', name: s.title.slice(0, 28), color: COLORS[(p.tabs.length + i) % COLORS.length], perm: r.form.perm === 'd' ? 'd' : 'n', started: true, open: true, live: false, archived: false });
  });
  p.activeTab = p.tabs[p.tabs.length - 1].id; save();
  UI.cur = { p: p.id, page: 'Terminais' }; renderAll();
  for (const t of p.tabs.slice(-picked.length)) await launch(p, t, 'resume');
}
function addProject({ name, path, imported, noTab }) {
  const p = { id: uuid(), name, path, imported, archived: false, tabs: [], activeTab: null, g: S.projects.length, open: true };
  S.projects.push(p);
  UI.cur = { p: p.id, page: 'Terminais' }; UI.last = p.id; UI.scan = null;
  save(); renderAll();
  if (!noTab) createTab(p, 'n');
  return p;
}

// "+" cria direto um terminal com a ferramenta escolhida; nome e cor podem ser mudados depois
function createTab(p, perm, opts = {}) {
  const n = p.tabs.filter((t) => (t.agent || 'claude') === 'claude').length + 1;
  const tab = { id: uuid(), sessionId: uuid(), agent: 'claude', name: opts.name || `Claude ${n}`, color: opts.color || COLORS[p.tabs.length % COLORS.length], perm: perm === 'd' ? 'd' : 'n', started: false, open: true, live: false, archived: false };
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
      root.addEventListener('click', (e) => {
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
    UI.cur = { p: next ? next.id : null, page: 'Terminais' }; UI.scan = null;
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
  if (UI.menu && !e.target.closest('.menu,[data-menu]')) { UI.menu = null; changed = true; }
  if (changed) { renderPop(); renderAct(); renderMenu(); renderTop(); }
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
  if ((el = q('[data-newtab]'))) { const p = curProject(); if (!p) return; const [, perm] = el.dataset.newtab.split('|'); UI.menu = null; renderMenu(); createTab(p, perm); return; }
  if ((el = q('[data-menu]'))) {
    if (UI.menu) { UI.menu = null; renderMenu(); return; }
    const r = el.getBoundingClientRect(); UI.menu = { type: 'new', x: r.left, y: r.bottom + 6 }; renderMenu(); return;
  }
  if ((el = q('[data-bg]'))) { S.settings.bg = el.dataset.bg; save(); applyBg(); if (UI.cur.page === 'Configurações') renderPage(); return; }
  if ((el = q('[data-win]'))) { api.winCtl(el.dataset.win); return; }
  if (q('[data-togside]')) { S.settings.sideCollapsed = !S.settings.sideCollapsed; save(); renderSide(); tween('sideW', sideTarget()); return; }
  if ((el = q('[data-ph]'))) {
    const p = proj(el.dataset.ph);
    p.open = p.open === false; save();
    if (UI.cur.p !== p.id) { UI.cur = { p: p.id, page: 'Terminais' }; UI.last = p.id; UI.scan = null; renderAll(); } else renderSide();
    return;
  }
  if ((el = q('[data-pmenu]'))) { UI.cur = { p: el.dataset.pmenu, page: UI.cur.p === el.dataset.pmenu ? UI.cur.page : 'Terminais' }; renderAll(); projectMenuFlow(); return; }
  if ((el = q('[data-go]'))) {
    const [p, pg] = el.dataset.go.split('|');
    UI.cur = { p, page: pg }; if (p !== '_') UI.last = p;
    UI.pop = false;
    if (['Plugins', 'Skills', 'MCPs'].includes(pg)) UI.scan = null;
    if (pg === 'Integrações') UI.env = null;
    renderAll(); return;
  }
  if ((el = q('[data-reopen2]'))) { const p = curProject(); const t = p.tabs.find((x) => x.id === el.dataset.reopen2); if (t) { t.open = true; p.activeTab = t.id; save(); renderAll(); restartTab(p, t); } return; }
  if ((el = q('[data-restart]'))) { UI.menu = null; renderMenu(); const f = findTab(el.dataset.restart); if (f) restartTab(f.p, f.tab); return; }
  if ((el = q('[data-newconv]'))) { const f = findTab(el.dataset.newconv); if (f) newConversation(f.p, f.tab); return; }
  if (q('[data-togact]')) { UI.actOpen = !UI.actOpen; UI.pop = false; renderTop(); renderPop(); tween('armW', armTarget()); return; }
  if (q('[data-lim]')) { UI.pop = !UI.pop; renderPop(); return; }
  if ((el = q('[data-ev]'))) {
    const [i, k, id] = el.dataset.ev.split('|');
    UI.events[i].done = true; renderAct(); renderTop();
    const f = findTab(id);
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

document.addEventListener('input', (e) => {
  if (e.target.id !== 'rngOp') return;
  S.settings.termOp = +e.target.value;
  $('#opv').textContent = `${e.target.value}%`;
  document.documentElement.style.setProperty('--term-op', S.settings.termOp / 100);
  for (const r of Object.values(RT)) r.term.options.theme = termTheme();
  save();
});

new ResizeObserver(() => { if (!tweening) fitActive(); }).observe($('#termHost'));
window.addEventListener('resize', fitActive);

// detecção de mudanças externas nos recursos (feitas pelo terminal)
setInterval(async () => {
  const p = curProject();
  if (!p || !['Plugins', 'Skills', 'MCPs'].includes(UI.cur.page) || !UI.scan) return;
  const data = await api.scan(p.path);
  const json = JSON.stringify(data);
  if (json !== UI.scan.json) { UI.scan = { pid: p.id, json, data }; renderPage(); }
}, 4000);

// dois modos: 'gradient' (Degradê) e 'blur' (Ofuscado); valores antigos 'acrylic'/'mica' contam como Ofuscado
const bgMode = () => (['blur', 'acrylic', 'mica'].includes(S.settings.bg) ? 'blur' : 'gradient');
/* ---------- moldura em "U": geometria do vidro ---------- */
const FR = { R: 22, RI: 14, HEAD: 46, BOT: 12, SIDE_OPEN: 252, SIDE_MINI: 70, ARM_OPEN: 346, ARM_CLOSED: 12 };
const GEO = { sideW: FR.SIDE_OPEN, armW: FR.ARM_CLOSED };
const sideTarget = () => (S.settings.sideCollapsed ? FR.SIDE_MINI : FR.SIDE_OPEN);
const armTarget = () => (UI.actOpen ? FR.ARM_OPEN : FR.ARM_CLOSED);

// anel fechado: contorno externo arredondado + recorte (o terminal) com os quatro cantos suavizados
function framePath(W, H, S_, A) {
  const { R, RI, HEAD: h, BOT: b } = FR;
  const outer = `M${R} 0H${W - R}A${R} ${R} 0 0 1 ${W} ${R}V${H - R}A${R} ${R} 0 0 1 ${W - R} ${H}H${R}A${R} ${R} 0 0 1 0 ${H - R}V${R}A${R} ${R} 0 0 1 ${R} 0Z`;
  const hole = `M${S_} ${h + RI}A${RI} ${RI} 0 0 1 ${S_ + RI} ${h}H${W - A - RI}A${RI} ${RI} 0 0 1 ${W - A} ${h + RI}V${H - b - RI}A${RI} ${RI} 0 0 1 ${W - A - RI} ${H - b}H${S_ + RI}A${RI} ${RI} 0 0 1 ${S_} ${H - b - RI}Z`;
  return outer + hole;
}

function layout() {
  const f = $('#frame');
  const W = f.clientWidth, H = f.clientHeight;
  if (!W || !H) return;
  const d = framePath(W, H, GEO.sideW, GEO.armW);
  $('#glass').style.clipPath = `path(evenodd, '${d}')`;
  $('#edgePath').setAttribute('d', d);
  document.documentElement.style.setProperty('--head', `${FR.HEAD}px`);
  $('#side').style.width = `${GEO.sideW}px`;
  $('#arm').style.width = `${GEO.armW}px`;
  $('#arm').classList.toggle('open', UI.actOpen && GEO.armW > 200);
  Object.assign($('#col').style, { left: `${GEO.sideW}px`, top: `${FR.HEAD}px`, right: `${GEO.armW}px`, bottom: `${FR.BOT}px` });
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
  renderAll();
  layout();
  (await api.allMetrics()).forEach(onMetric);
  restoreOnOpen();
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
    d.on = true;
    try { d.el.setPointerCapture(d.pid); } catch { /* sem captura: segue assim mesmo */ }
    d.el.classList.add('dragging');
  }
  const r0 = d.rects[d.from], last = d.rects[d.rects.length - 1];
  const cdx = Math.max(d.rects[0].left - r0.left, Math.min(last.right - r0.right, dx)); // não sai do trilho das abas
  d.el.style.transform = `translateX(${cdx}px)`;
  const center = r0.left + r0.width / 2 + cdx;
  let to = 0;
  d.rects.forEach((r, k) => { if (k !== d.from && r.left + r.width / 2 <= center + 1) to++; });
  d.to = to;
  const shift = r0.width + 2;
  d.els.forEach((x, k) => {
    if (k === d.from) return;
    x.style.transform = d.from < to && k > d.from && k <= to ? `translateX(${-shift}px)` : d.from > to && k >= to && k < d.from ? `translateX(${shift}px)` : '';
  });
});
function endTabDrag() {
  const d = tabDrag;
  tabDrag = null;
  if (!d || !d.on) return;
  d.els.forEach((x) => { x.style.transform = ''; x.classList.remove('dragging'); });
  UI.justDragged = true; setTimeout(() => { UI.justDragged = false; }, 60); // evita que o clique do soltar selecione/abra a aba
  if (d.to !== d.from) reorderTabs(curProject(), d.from, d.to);
}
document.addEventListener('pointerup', endTabDrag);
document.addEventListener('pointercancel', endTabDrag);

setInterval(() => { if (mode() === 'noterm') renderPage(); }, 15000);
