'use strict';
// Navegador embutido (TASK-022): abas web por projeto, barra de navegação e alternador Terminais / Web.
// Carregado depois do app.js (usa S, UI, RT, api, mode, curProject, openTabs, save, renderAll, esc, ic).

const DEVICES = [['Responsivo', 0, 0], ['Celular', 390, 844], ['Tablet', 820, 1180]];
const WEB = {}; // runtime por aba web: { loading, canBack, canForward }
const WICON = {
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.2 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.2-3.6-8.5S9.6 5.9 12 3.5z"/>',
  code: '<path d="M8.5 7.5L4 12l4.5 4.5M15.5 7.5L20 12l-4.5 4.5M13.5 5.5l-3 13"/>',
  device: '<rect x="7" y="3.5" width="10" height="17" rx="2.5"/><path d="M11 17.5h2"/>',
};
const wic = (n, s = 17) => `<svg class="i" viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${WICON[n]}</svg>`;

const webOf = (p) => { if (!p.web) p.web = { tabs: [], active: null, device: 0 }; return p.web; };
const curWebTab = (p) => { const w = webOf(p); return w.tabs.find((t) => t.id === w.active) || w.tabs[0] || null; };
function findWebTab(id) {
  for (const p of S.projects) { const t = p.web && p.web.tabs.find((x) => x.id === id); if (t) return { p, t }; }
  return null;
}

// o que a pessoa digita vira endereço: localhost e IP em http, domínio em https, o resto vai para a busca
function normalizeUrl(s) {
  s = s.trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (/^:?\d{2,5}$/.test(s)) return `http://localhost:${s.replace(':', '')}`;
  if (/^(localhost|127\.0\.0\.1|\[::1\]|\d{1,3}(\.\d{1,3}){3})(:\d+)?([/?#]\S*)?$/i.test(s)) return `http://${s}`;
  if (/^[^\s/]+\.[a-z]{2,}(:\d+)?([/?#]\S*)?$/i.test(s)) return `https://${s}`;
  return `https://www.google.com/search?q=${encodeURIComponent(s)}`;
}

function addWebTab(p, url, activate = true) {
  const w = webOf(p);
  const t = { id: uuid(), url: url || '', title: '' };
  w.tabs.push(t);
  if (activate || !w.active) w.active = t.id;
  save();
  return t;
}
function closeWebTab(p, id) {
  const w = webOf(p);
  const i = w.tabs.findIndex((t) => t.id === id);
  if (i < 0) return;
  w.tabs.splice(i, 1);
  delete WEB[id];
  lastShow = '';
  api.webClose(id);
  if (w.active === id) w.active = (w.tabs[i] || w.tabs[i - 1] || {}).id || null;
  if (!w.tabs.length) addWebTab(p, '');
  save();
}

/* ---------- alternar Terminais / Web ---------- */
function setSurface(s) {
  if (!curProject()) return;
  if (UI.surface === s) return;
  UI.surface = s;
  if (s === 'web') UI.webFocus = true;
  UI.menu = null;
  renderAll();
}
const toggleSurface = () => setSurface(UI.surface === 'web' ? 'term' : 'web');

/* ---------- tela Web ---------- */
function webTabsHTML(p) {
  const w = webOf(p);
  return w.tabs.map((t) => {
    const loading = WEB[t.id] && WEB[t.id].loading;
    const label = t.title || (t.url ? t.url.replace(/^https?:\/\//i, '') : 'Nova aba');
    return `<div class="tab ${t.id === (curWebTab(p) || {}).id ? 'active' : ''}" style="--c:#5B9DFF" data-wtab="${t.id}" title="${esc(t.url || 'Nova aba')}">
      ${loading ? '<i class="dot s-restart"></i>' : ''}<span class="nm">${esc(label)}</span><button class="x" data-wx="${t.id}" title="Fechar aba">${ic('x', 13)}</button></div>`;
  }).join('') + '<button class="plus" data-wnew title="Nova aba web">+</button>';
}

function ensureWebBar() {
  const bar = $('#wbar');
  if (bar.firstChild) return;
  bar.innerHTML = `<button class="wb" data-wnav="back" title="Voltar">${ic('arrowl', 17)}</button>
    <button class="wb" data-wnav="forward" title="Avançar">${ic('arrowr', 17)}</button>
    <button class="wb" data-wnav="reload" title="Recarregar (Shift: sem cache)" id="wreload">${ic('refresh', 16)}</button>
    <input class="wurl" id="wurl" type="text" spellcheck="false" placeholder="Digite um endereço ou uma busca (Ctrl+L)">
    <button class="wb wdev" data-wdev title="Tamanho de dispositivo">${wic('device', 16)}<span id="wdevl">Responsivo</span></button>
    <button class="wb" data-wnav="devtools" title="Ferramentas do desenvolvedor">${wic('code', 17)}</button>`;
  const inp = $('#wurl');
  inp.addEventListener('keydown', (e) => {
    const p = curProject(), t = p && curWebTab(p);
    if (!t) return;
    if (e.key === 'Enter') { goUrl(t, inp.value); inp.blur(); }
    else if (e.key === 'Escape') { inp.value = t.url; inp.blur(); }
  });
  inp.addEventListener('focus', () => inp.select());
}

// a Web é só para testes locais: o resto abre no navegador do sistema (mesma regra do processo principal)
const LOCAL_HOST = /^(localhost|127(\.\d{1,3}){3}|0\.0\.0\.0|\[::1\]|10(\.\d{1,3}){3}|192\.168(\.\d{1,3}){2}|172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2}|[^.]+\.localhost)$/i;
function isLocalUrl(u) {
  try {
    const x = new URL(u);
    return x.protocol === 'file:' || (/^https?:$/.test(x.protocol) && LOCAL_HOST.test(x.hostname));
  } catch { return false; }
}

function goUrl(t, raw) {
  const url = normalizeUrl(raw);
  if (!url) return;
  if (!isLocalUrl(url)) {
    api.webExternal(url);
    addEvent({ who: 'Web', msg: `A aba Web abre só páginas locais. Aberto no navegador do sistema: ${url}`, done: true });
    const inp = $('#wurl'); if (inp) inp.value = t.url || '';
    return;
  }
  t.url = url; save();
  UI.webFocus = false;
  if (WEB[t.id] && WEB[t.id].created) api.webGo(t.id, url); // a vista já existe
  else { renderWebStart(); webSync(); } // ainda não existe: webShow cria e já carrega o endereço
}

function updateWebBar() {
  const p = curProject(), t = p && curWebTab(p);
  if (!t) return;
  const rt = WEB[t.id] || {};
  const btn = (k) => document.querySelector(`[data-wnav="${k}"]`);
  if (btn('back')) { btn('back').disabled = !rt.canBack; btn('forward').disabled = !rt.canForward; }
  const rl = $('#wreload');
  if (rl) { const stop = !!rt.loading; rl.dataset.wnav = stop ? 'stop' : 'reload'; rl.title = stop ? 'Parar' : 'Recarregar (Shift: sem cache)'; rl.innerHTML = ic(stop ? 'x' : 'refresh', 16); }
  const inp = $('#wurl');
  if (inp && document.activeElement !== inp && inp.value !== t.url) inp.value = t.url || '';
  const dl = $('#wdevl');
  if (dl) dl.textContent = DEVICES[webOf(p).device || 0][0];
}

function renderWebStart() {
  const p = curProject(), t = p && curWebTab(p);
  const el = $('#wstart');
  const show = !!t && !t.url && mode() === 'web';
  el.classList.toggle('hide', !show);
  if (!show) return;
  const det = detectedFor(p);
  const html = `<div class="wst">${wic('globe', 34)}<h2>Navegador do projeto</h2>
    ${det.length ? `<p>Servidores detectados nos terminais deste projeto:</p><div class="wq">${det.map((d) => `<button class="btn pri sm" data-wquick="${esc(d.url)}">${esc(shortUrl(d.url))}</button>`).join('')}</div>` : ''}
    <p>Digite um endereço local na barra acima${det.length ? ' ou abra outro' : ', ou abra um destes'}:</p>
    <div class="wq">${['localhost:3000', 'localhost:5173', 'localhost:8080', 'localhost:4200'].map((u) => `<button class="btn sm" data-wquick="${u}">${u}</button>`).join('')}</div></div>`;
  if (el.dataset.h !== html) { el.dataset.h = html; el.innerHTML = html; }
}

/* ---------- servidores locais detectados nos terminais (selo no alternador) ---------- */
const DET = {}; // id do projeto -> [{ url, t }]
const detProbe = new Map(); // projeto|origem -> instante da última checagem
const shortUrl = (u) => u.replace(/^https?:\/\//i, '').replace(/\/$/, '');
const sameUrl = (a, b) => a.replace(/\/$/, '') === b.replace(/\/$/, '');
function detectedFor(p) {
  const open = webOf(p).tabs.map((t) => t.url);
  DET[p.id] = (DET[p.id] || []).filter((d) => !open.some((u) => sameUrl(u, d.url)));
  return DET[p.id];
}
const ANSI_RE = /\x1b\[[0-9;?]*[ -\/]*[@-~]|\x1b\][^\x07\x1b]*(\x07|\x1b\\)/g;
const LOCAL_URL_RE = /https?:\/\/(?:localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|\[::1\]|192\.168(?:\.\d{1,3}){2}|10(?:\.\d{1,3}){3})(?::\d{2,5})?/gi;
function webDetect(p, data) {
  const found = data.replace(ANSI_RE, '').match(LOCAL_URL_RE);
  if (!found) return;
  for (const raw of new Set(found)) {
    const url = `${raw.replace('0.0.0.0', 'localhost').toLowerCase()}/`;
    const key = `${p.id}|${url}`;
    if (Date.now() - (detProbe.get(key) || 0) < 30000) continue;
    detProbe.set(key, Date.now());
    api.webProbe(url).then((alive) => {
      if (!alive || webOf(p).tabs.some((t) => sameUrl(t.url, url)) || (DET[p.id] || []).some((d) => sameUrl(d.url, url))) return;
      (DET[p.id] = DET[p.id] || []).unshift({ url, t: Date.now() });
      DET[p.id] = DET[p.id].slice(0, 5);
      UI.webNew = { ...(UI.webNew || {}), [p.id]: true };
      if (mode() === 'web' && curProject() === p) renderWebDet();
      queueSync();
    });
  }
}
// faixa com os servidores detectados que ainda não estão abertos (a tela inicial da aba em branco já os mostra)
function renderWebDet() {
  const p = curProject(), t = p && curWebTab(p);
  const el = $('#wdet');
  const det = p && t && t.url ? detectedFor(p) : [];
  el.classList.toggle('hide', !det.length || mode() !== 'web');
  const html = det.length ? `<span>Detectado nos terminais:</span>${det.map((d) => `<button class="btn sm" data-wnewurl="${esc(d.url)}" title="Abrir em nova aba">${esc(shortUrl(d.url))}</button>`).join('')}` : '';
  if (el.dataset.h !== html) { el.dataset.h = html; el.innerHTML = html; }
}

function webRender(m) {
  const on = m === 'web';
  $('#webpane').classList.toggle('hide', !on);
  if (on) {
    const p = curProject();
    if (!webOf(p).tabs.length) addWebTab(p, '');
    $('#wtabs').innerHTML = webTabsHTML(p);
    ensureWebBar();
    updateWebBar();
    if (UI.webNew && UI.webNew[p.id]) UI.webNew = { ...UI.webNew, [p.id]: false }; // quem abre a Web viu o aviso
  }
  renderWebStart();
  renderWebDet();
  webSync();
}

/* ---------- vista nativa e alternador ---------- */
const overlayOpen = () => !!(UI.menu || UI.pop || $('#modalRoot').firstChild || $('#menuRoot').firstChild);
let syncTok = 0, held = false, lastShow = '', lastDock = '';

function viewRect() {
  const p = curProject();
  const h = $('#whost').getBoundingClientRect();
  const dev = DEVICES[(p && webOf(p).device) || 0];
  if (!dev[1]) return { x: h.left, y: h.top, width: h.width, height: h.height };
  const width = Math.min(dev[1], h.width), height = Math.min(dev[2], h.height);
  return { x: h.left + (h.width - width) / 2, y: h.top, width, height };
}

function sendDock(m, p) {
  const c = $('#col').getBoundingClientRect();
  const clr = m === 'web' ? null : clearDockState(p);
  const W = 276 + (clr ? 202 : 0), H = 46;
  const visible = !!p && (m === 'term' || m === 'noterm' || m === 'web') && (!overlayOpen() || (UI.menu && UI.menu.type === 'rail' && !UI.pop && !$('#modalRoot').firstChild)) && !$('#splash');
  const st = {
    visible, mode: m === 'web' ? 'web' : 'term',
    terms: p ? openTabs(p).length : 0,
    attention: p ? openTabs(p).some((t) => RT[t.id] && RT[t.id].unread) : false,
    webs: p && p.web ? p.web.tabs.filter((t) => t.url).length : 0,
    fresh: !!(p && UI.webNew && UI.webNew[p.id]), // algo novo na Web deste projeto (aberto por um terminal ou servidor detectado)
    fade: !!railCfg().fade,
    clear: clr,
    rect: { x: c.left + (c.width - W) / 2, y: c.bottom - H + 8, width: W, height: H }, // metade dentro da base de vidro, para cobrir pouco do terminal
  };
  const j = JSON.stringify(st);
  if (j !== lastDock) { lastDock = j; api.dockState(st); }
}

function dockRefresh() { sendDock(mode(), curProject()); }

async function webSync() {
  const tok = ++syncTok;
  const m = mode(), p = curProject();
  sendDock(m, p);
  const shot = $('#wshot');
  const t = m === 'web' && p ? curWebTab(p) : null;
  if (!t || !t.url) { if (lastShow !== 'none') { lastShow = 'none'; api.webShow(null); } shot.classList.add('hide'); held = false; return; }
  if (overlayOpen()) {
    // menu ou modal aberto: a vista nativa ficaria por cima; troca por uma imagem dela e a esconde
    if (held) return;
    const d = await api.webSnapshot();
    if (tok !== syncTok) return;
    const r = viewRect(), h = $('#whost').getBoundingClientRect();
    if (d) { Object.assign(shot.style, { left: `${r.x - h.left}px`, top: `${r.y - h.top}px`, width: `${r.width}px`, height: `${r.height}px` }); shot.src = d; shot.classList.remove('hide'); }
    held = true; lastShow = 'none'; api.webShow(null);
    return;
  }
  const r = viewRect();
  const msg = { id: t.id, url: t.url, rect: r, focus: !!UI.webFocus };
  const j = JSON.stringify({ ...msg, rect: [r.x, r.y, r.width, r.height].map(Math.round) });
  WEB[t.id] = { ...(WEB[t.id] || {}), created: true };
  if (j !== lastShow || held) { lastShow = j; api.webShow(msg); UI.webFocus = false; }
  if (held) { held = false; requestAnimationFrame(() => shot.classList.add('hide')); }
}

let syncQueued = false;
const queueSync = () => { if (syncQueued) return; syncQueued = true; requestAnimationFrame(() => { syncQueued = false; webSync(); }); };
new ResizeObserver(queueSync).observe($('#whost'));
new ResizeObserver(queueSync).observe($('#col'));
for (const id of ['#menuRoot', '#modalRoot']) new MutationObserver(queueSync).observe($(id), { childList: true });
new MutationObserver(queueSync).observe($('#pop'), { attributes: true, attributeFilter: ['class'] });
setInterval(queueSync, 600); // selos do alternador, fim da abertura e o que mais mudar sem aviso

/* ---------- eventos ---------- */
api.onWebUpdate((m) => {
  const f = findWebTab(m.id);
  if (!f) return;
  const old = `${f.t.url}|${f.t.title}`;
  if (m.url) f.t.url = m.url;
  f.t.title = m.title || f.t.title;
  WEB[m.id] = { ...(WEB[m.id] || {}), loading: m.loading, canBack: m.canBack, canForward: m.canForward, created: true };
  if (old !== `${f.t.url}|${f.t.title}`) save();
  if (mode() === 'web' && curProject() === f.p) { $('#wtabs').innerHTML = webTabsHTML(f.p); updateWebBar(); renderWebStart(); }
});
api.onWebNewTab(({ from, url }) => {
  const f = findWebTab(from);
  if (!f) return;
  const t = addWebTab(f.p, url, true);
  WEB[t.id] = { created: true };
  if (mode() === 'web') renderAll();
});
// um terminal pediu para abrir uma página local (termix-open ou BROWSER): vira aba web do projeto dessa aba, sem tirar o usuário do que está fazendo
api.onWebOpen(({ tabId, url }) => {
  const f = findTab(tabId);
  if (!f || !isLocalUrl(url)) return;
  const { p, tab } = f, w = webOf(p);
  const viewing = UI.surface === 'web' && curProject() === p;
  const cur = curWebTab(p);
  let t = w.tabs.find((x) => sameUrl(x.url, url));
  let activate = !viewing || !!(cur && !cur.url);
  if (t) { if (WEB[t.id] && WEB[t.id].created) api.webNav(t.id, 'reload'); }
  else if (cur && !cur.url) { t = cur; t.url = url; } // aproveita a aba em branco
  else t = addWebTab(p, url, false);
  if (activate) w.active = t.id;
  DET[p.id] = (DET[p.id] || []).filter((d) => !sameUrl(d.url, url));
  save();
  addEvent({ who: tab.name, c: tab.color, msg: `Aberto na aba Web: ${shortUrl(url)}`, done: true });
  if (!(viewing && activate)) UI.webNew = { ...(UI.webNew || {}), [p.id]: true };
  if (mode() === 'web') renderAll(); else queueSync();
});
api.onWebToggle(toggleSurface);
api.onWebFocusUrl(() => { if (mode() === 'web') { const i = $('#wurl'); if (i) i.focus(); } });
api.onDockAction((m) => { if (m === 'clear') clearFlow(); else if (m === 'restart') dockRestart(); else setSurface(m === 'web' ? 'web' : 'term'); });

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && !e.altKey && !e.shiftKey && e.key === '`') { e.preventDefault(); e.stopPropagation(); toggleSurface(); }
  else if (e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'l' && mode() === 'web') { e.preventDefault(); $('#wurl').focus(); }
}, true);

document.addEventListener('click', (e) => {
  const q = (s) => e.target.closest(s);
  const p = curProject();
  let el;
  if ((el = q('[data-wx]'))) { e.stopPropagation(); if (p) { closeWebTab(p, el.dataset.wx); renderAll(); } return; }
  if ((el = q('[data-wtab]'))) { if (p) { webOf(p).active = el.dataset.wtab; save(); renderAll(); } return; }
  if (q('[data-wnew]')) { if (p) { const t = addWebTab(p, ''); UI.webFocus = false; renderAll(); setTimeout(() => $('#wurl') && $('#wurl').focus(), 0); void t; } return; }
  if ((el = q('[data-wnewurl]'))) { if (p) { const t = addWebTab(p, el.dataset.wnewurl); WEB[t.id] = {}; renderAll(); } return; }
  if ((el = q('[data-wquick]'))) { const t = p && curWebTab(p); if (t) { goUrl(t, el.dataset.wquick); renderAll(); } return; }
  if ((el = q('[data-wnav]'))) { const t = p && curWebTab(p); if (t) api.webNav(t.id, el.dataset.wnav === 'reload' && e.shiftKey ? 'hardreload' : el.dataset.wnav); return; }
  if (q('[data-wdev]')) { if (p) { const w = webOf(p); w.device = ((w.device || 0) + 1) % DEVICES.length; save(); updateWebBar(); webSync(); } return; }
});
