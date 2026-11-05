'use strict';
/* Carregado ANTES do app.js (o app.js já usa chatCfg/chatNewKey no primeiro desenho); só usa o que é do app.js dentro de funções, nunca ao carregar. */
/* Modo Chat (TASK-040): a conversa com o Claude Code em bolhas, sem terminal. O processo (`claude -p` em stream-json) vive em src/chat.js;
   aqui ficam a tela, os eventos do stream e o histórico. Usa o estado do app.js (S, RT, MET, UI) e é carregado depois dele. */
const CH = {}; // por aba de chat: { items, root, thread, busy, ... }
const CHAT_DEF = { mode: 'chat', perm: 'auto' };
const chatCfg = () => ({ ...CHAT_DEF, ...(S.settings.chat || {}) });
const chatPermFor = () => (chatCfg().perm === 'ask' ? 'n' : 'd'); // Automático = como a aba "Dangerously"; Perguntar = só edições de arquivo
const chatNewKey = () => (chatCfg().mode === 'chat' ? 'chat|auto' : 'claude|n'); // o que o "+" cria

/* ---------- Markdown mínimo e seguro: escapa o HTML antes de tudo ---------- */
const CHAT_HL = /(\/\/.*$)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(const|let|var|function|return|if|else|await|async|for|of|new|import|from|require|class|export)\b|\b([a-zA-Z_]\w*)(?=\()/gm;
function chatHl(code, lang) {
  if (!/^(js|javascript|ts|typescript|json|jsx|tsx)$/.test(lang || '')) return esc(code);
  let out = '', last = 0;
  code.replace(CHAT_HL, (m, cm, str, kw, fn, off) => {
    out += esc(code.slice(last, off)) + `<span class="${cm ? 'k-c' : str ? 'k-s' : kw ? 'k-k' : 'k-f'}">${esc(m)}</span>`;
    last = off + m.length;
    return m;
  });
  return out + esc(code.slice(last));
}
function chatInline(t) {
  t = esc(t);
  const codes = []; t = t.replace(/`([^`\n]+)`/g, (_, c) => { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
  t = t.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>').replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, '$1<i>$2</i>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" data-ext="1">$1</a>');
  return t.replace(/\u0000(\d+)\u0000/g, (_, i) => '<code>' + codes[i] + '</code>');
}
function chatMd(src) {
  const lines = String(src).replace(/\r/g, '').split('\n'); let out = '', i = 0;
  while (i < lines.length) {
    const L = lines[i]; let m;
    if ((m = L.match(/^```(\w*)/))) {
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out += `<div class="c-code"><div class="ch"><span>${esc(m[1] || 'texto')}</span><button class="c-copy" type="button">Copiar</button></div><pre>${chatHl(buf.join('\n'), m[1])}</pre></div>`; continue;
    }
    if ((m = L.match(/^(#{1,3})\s+(.*)/))) { out += `<h${m[1].length}>${chatInline(m[2])}</h${m[1].length}>`; i++; continue; }
    if (/^---+\s*$/.test(L)) { out += '<hr>'; i++; continue; }
    if (/^>\s?/.test(L)) { const b = []; while (i < lines.length && /^>\s?/.test(lines[i])) b.push(lines[i++].replace(/^>\s?/, '')); out += `<blockquote>${chatInline(b.join(' '))}</blockquote>`; continue; }
    if (/^\s*[-*]\s+/.test(L) || /^\s*\d+[.)]\s+/.test(L)) {
      const ord = /^\s*\d+[.)]/.test(L), it = [];
      while (i < lines.length && (ord ? /^\s*\d+[.)]\s+/ : /^\s*[-*]\s+/).test(lines[i])) it.push(lines[i++].replace(/^\s*(\d+[.)]|[-*])\s+/, ''));
      out += `<${ord ? 'ol' : 'ul'}>${it.map((x) => `<li>${chatInline(x)}</li>`).join('')}</${ord ? 'ol' : 'ul'}>`; continue;
    }
    if (/^\|.*\|\s*$/.test(L) && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '')) {
      const row = (s) => s.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = row(L); i += 2; const body = [];
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) body.push(row(lines[i++]));
      out += `<table><tr>${head.map((c) => `<th>${chatInline(c)}</th>`).join('')}</tr>${body.map((r) => `<tr>${r.map((c) => `<td>${chatInline(c)}</td>`).join('')}</tr>`).join('')}</table>`; continue;
    }
    if (!L.trim()) { i++; continue; }
    const p = []; while (i < lines.length && lines[i].trim() && !/^(```|#{1,3}\s|>|\s*[-*]\s|\s*\d+[.)]\s|---)/.test(lines[i])) p.push(lines[i++]);
    out += `<p>${chatInline(p.join(' '))}</p>`;
  }
  return out;
}

/* ---------- runtime da aba de chat (finge ser um terminal para o resto do app.js) ---------- */
const CHAT_TERM = {
  cols: 100, rows: 30, write() {}, writeln() {}, focus() {}, dispose() {}, paste() {}, hasSelection: () => false, clearSelection() {}, getSelection: () => '',
  buffer: { active: { length: 0, getLine: () => null } }, onData() {}, onResize() {}, loadAddon() {}, open() {},
};
function chatEnsure(tab) {
  if (RT[tab.id]) return RT[tab.id];
  return (RT[tab.id] = { chat: true, term: CHAT_TERM, fit: { fit() {} }, el: document.createElement('div'), opened: true, alive: false, st: 'wait', hooks: true, lastData: 0, lastInput: 0, spawnAt: 0, evidence: true, killing: false, waiter: null });
}

const CHAT_MARK = '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l8 7-8 7"/><path d="M17 24h10"/></svg>'; // marca do Termix (>_), parada
const CHAT_SPARK = '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path class="ray" style="--i:0" d="M16.0 12.0L16.0 2.0"/><path class="ray" style="--i:1" d="M18.0 12.5L21.3 6.9"/><path class="ray" style="--i:2" d="M19.5 14.0L27.7 9.3"/><path class="ray" style="--i:3" d="M20.0 16.0L26.0 16.0"/><path class="ray" style="--i:4" d="M19.5 18.0L28.6 23.3"/><path class="ray" style="--i:5" d="M18.0 19.5L21.5 25.5"/><path class="ray" style="--i:6" d="M16.0 20.0L16.0 29.0"/><path class="ray" style="--i:7" d="M14.0 19.5L11.0 24.7"/><path class="ray" style="--i:8" d="M12.5 18.0L3.9 23.0"/><path class="ray" style="--i:9" d="M12.0 16.0L5.5 16.0"/><path class="ray" style="--i:10" d="M12.5 14.0L4.3 9.2"/><path class="ray" style="--i:11" d="M14.0 12.5L10.5 6.5"/></svg>'; // brilho em raios, usado só animado
// símbolos animados de "trabalhando" (todos no azul do app): um por mensagem, em rodízio; a resposta pronta fica com o símbolo que rodou, parado (respostas do histórico, sem símbolo, usam o >_)
const CHAT_WORK = [
  CHAT_SPARK.replace('<svg ', '<svg class="wk spark" '),
  '<svg class="wk orbit" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle class="dt" style="--i:0" cx="16.0" cy="5.0" r="2.3" fill="currentColor" stroke="none"/><circle class="dt" style="--i:1" cx="23.8" cy="8.2" r="2.3" fill="currentColor" stroke="none"/><circle class="dt" style="--i:2" cx="27.0" cy="16.0" r="2.3" fill="currentColor" stroke="none"/><circle class="dt" style="--i:3" cx="23.8" cy="23.8" r="2.3" fill="currentColor" stroke="none"/><circle class="dt" style="--i:4" cx="16.0" cy="27.0" r="2.3" fill="currentColor" stroke="none"/><circle class="dt" style="--i:5" cx="8.2" cy="23.8" r="2.3" fill="currentColor" stroke="none"/><circle class="dt" style="--i:6" cx="5.0" cy="16.0" r="2.3" fill="currentColor" stroke="none"/><circle class="dt" style="--i:7" cx="8.2" cy="8.2" r="2.3" fill="currentColor" stroke="none"/></svg>',
  '<svg class="wk ripple" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle cx="16" cy="16" r="2.6" fill="currentColor" stroke="none"/><circle class="rp" style="--i:0" cx="16" cy="16" r="12"/><circle class="rp" style="--i:1" cx="16" cy="16" r="12"/></svg>',
  '<svg class="wk bars" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path class="bar" style="--i:0" d="M6 9V23"/><path class="bar" style="--i:1" d="M11 9V23"/><path class="bar" style="--i:2" d="M16 9V23"/><path class="bar" style="--i:3" d="M21 9V23"/><path class="bar" style="--i:4" d="M26 9V23"/></svg>',
  '<svg class="wk prompt" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path class="ch" d="M6 9l8 7-8 7"/><path class="cur" d="M17 24h10"/></svg>',
];
let chatVar = 0; // símbolo da vez
function chatAvatar(el, v) { // troca o avatar da resposta entre o brilho parado (v = null) e o símbolo animado v
  const a = el.querySelector('.c-av'); if (!a) return;
  const key = v == null ? 's' : String(v);
  if (a.dataset.v === key) return;
  a.dataset.v = key; a.innerHTML = v == null ? CHAT_MARK : CHAT_WORK[v];
}
const CHAT_USER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c1-3.8 3.6-5.6 7-5.6s6 1.8 7 5.6"/></svg>';
const CHAT_ICON = {
  copy: '<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  send: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2.5"/>',
  laptop: '<rect x="4" y="5" width="16" height="11" rx="2"/><path d="M2 20h20"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
};
const chatIc = (n, s = 18) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${CHAT_ICON[n]}</svg>`;

function chatView(tab) {
  let c = CH[tab.id];
  if (c) return c;
  c = CH[tab.id] = { items: [], loaded: false, busy: false, byIdx: {}, seen: new Set(), modelName: '', dirty: new Set(), q: false, lastAi: '' };
  const root = document.createElement('div');
  root.className = 'c-root'; root.dataset.chat = tab.id;
  root.innerHTML = `<div class="c-empty"><div class="c-mascot"><svg viewBox="0 0 32 32" fill="none"><path d="M5 9l8 7-8 7" stroke="#8cc0ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 24h11" stroke="#8cc0ff" stroke-width="3" stroke-linecap="round"/></svg></div><h2></h2><p></p></div>
    <div class="c-scroll"><div class="c-thread"><div class="c-typing"><span class="c-av">${CHAT_MARK}</span><div class="c-st"><div class="c-st1"><b class="v"></b><span class="t"></span></div><div class="c-st2"></div></div></div></div></div>
    <div class="c-comp"><div class="c-box"><div class="c-slash" role="listbox"></div>
      <div class="c-in"><div class="c-thumbs"></div><textarea rows="1" placeholder="Descreva uma tarefa ou faça uma pergunta"></textarea>
        <button class="c-send" type="button" title="Enviar (Enter)" aria-label="Enviar">${chatIc('send')}</button>
        <button class="c-stop" type="button" title="Parar a resposta" aria-label="Parar">${chatIc('stop')}</button></div>
      <div class="c-meta"><span class="c-env">${chatIc('laptop', 15)}Este computador</span><span class="c-env c-folder">${chatIc('folder', 15)}<span></span><em></em></span><span class="sp"></span><span class="c-mdl"></span><span class="c-perm"></span></div>
    </div></div>`;
  $('#chatHost').appendChild(root);
  Object.assign(c, {
    root, scroll: root.querySelector('.c-scroll'), thread: root.querySelector('.c-thread'), typing: root.querySelector('.c-typing'), inp: root.querySelector('textarea'),
    perm: root.querySelector('.c-perm'), mdl: root.querySelector('.c-mdl'),
  });
  const send = () => { const t = c.inp.value; if (!t.trim() && !c.imgs.length) return; const imgs = c.imgs; c.imgs = []; chatThumbs(c); c.inp.value = ''; c.inp.style.height = 'auto'; chatSendMsg(tab, t, imgs); };
  c.slash = root.querySelector('.c-slash'); c.thumbs = root.querySelector('.c-thumbs'); c.imgs = [];
  c.inp.addEventListener('keydown', (e) => {
    if (chatSlashKey(tab, c, e)) return;
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); }
  });
  c.inp.addEventListener('blur', () => setTimeout(() => chatSlashClose(c), 120));
  c.slash.addEventListener('mousedown', (e) => { const b = e.target.closest('[data-i]'); if (!b) return; e.preventDefault(); chatSlashPick(tab, c, +b.dataset.i); });
  c.inp.addEventListener('input', () => { c.inp.style.height = 'auto'; c.inp.style.height = Math.min(c.inp.scrollHeight, 180) + 'px'; chatSlashUpdate(tab, c); });
  c.inp.addEventListener('paste', (e) => { const fl = [...(e.clipboardData ? e.clipboardData.files : [])].filter((f) => /^image\//.test(f.type)); if (!fl.length) return; e.preventDefault(); chatAddImages(c, fl); });
  const box = root.querySelector('.c-in');
  box.addEventListener('dragover', (e) => { if ([...(e.dataTransfer ? e.dataTransfer.types : [])].includes('Files')) { e.preventDefault(); box.classList.add('drop'); } });
  box.addEventListener('dragleave', () => box.classList.remove('drop'));
  box.addEventListener('drop', (e) => { box.classList.remove('drop'); const fl = [...(e.dataTransfer ? e.dataTransfer.files : [])].filter((f) => /^image\//.test(f.type)); if (!fl.length) return; e.preventDefault(); chatAddImages(c, fl); c.inp.focus(); });
  c.thumbs.addEventListener('click', (e) => { const x = e.target.closest('[data-rm]'); if (!x) return; c.imgs.splice(+x.dataset.rm, 1); chatThumbs(c); c.inp.focus(); });
  root.querySelector('.c-send').addEventListener('click', send);
  root.querySelector('.c-stop').addEventListener('click', () => chatInterrupt(tab));
  c.scroll.addEventListener('scroll', () => { c.stick = c.scroll.scrollHeight - c.scroll.scrollTop - c.scroll.clientHeight < 90; });
  c.stick = true;
  root.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-ext]'); if (a) { e.preventDefault(); api.webExternal(a.getAttribute('href')); return; }
    const pm = e.target.closest('[data-pm]');
    if (pm) { const row = pm.closest('.c-pm'), it = c.items.find((x) => x.el === row); if (it) chatDecide(tab, it, pm.dataset.pm); return; }
    const all = e.target.closest('.c-copyall');
    if (all) { // copia a resposta inteira, no texto original (Markdown), não só o que está na tela
      const row = all.closest('.c-row'), it = c.items.find((x) => x.el === row);
      if (it && it.text) { api.clipWrite(it.text); all.classList.add('done'); all.title = 'Copiado'; all.innerHTML = chatIc('check', 14); setTimeout(() => { all.classList.remove('done'); all.title = 'Copiar a resposta inteira'; all.innerHTML = chatIc('copy', 14); }, 1400); }
      return;
    }
    const b = e.target.closest('.c-copy'); if (b) { const pre = b.closest('.c-code').querySelector('pre'); api.clipWrite(pre.innerText); b.textContent = 'Copiado'; setTimeout(() => { b.textContent = 'Copiar'; }, 1400); }
  });
  return c;
}

/* ---------- imagens coladas (TASK-041) ---------- */
const CHAT_IMG_MAX = 20, CHAT_IMG_SIDE = 1568, CHAT_IMG_BYTES = 3.5 * 1024 * 1024; // a API aceita ~5 MB por imagem; reduz antes de enviar (custo em tokens)
function chatThumbs(c) {
  c.thumbs.innerHTML = c.imgs.map((m, i) => `<div class="c-th"><img src="${m.url}" alt="Imagem ${i + 1}"><button type="button" data-rm="${i}" title="Remover" aria-label="Remover imagem"><svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7"/></svg></button></div>`).join('');
  c.root.querySelector('.c-in').classList.toggle('has-img', c.imgs.length > 0);
}
async function chatReadImage(file) { // createImageBitmap: a política de segurança da tela não deixa usar blob: em <img>
  let im;
  try { im = await createImageBitmap(file); } catch { throw new Error('ilegivel'); }
  const k = Math.min(1, CHAT_IMG_SIDE / Math.max(im.width, im.height)), w = Math.max(1, Math.round(im.width * k)), h = Math.max(1, Math.round(im.height * k));
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  cv.getContext('2d').drawImage(im, 0, 0, w, h); im.close();
  let url = file.type === 'image/jpeg' ? cv.toDataURL('image/jpeg', 0.88) : cv.toDataURL('image/png');
  if (url.length * 0.75 > CHAT_IMG_BYTES) url = cv.toDataURL('image/jpeg', 0.8); // PNG grande demais: JPEG
  if (url.length * 0.75 > CHAT_IMG_BYTES) throw new Error('grande');
  return { url, mt: url.slice(5, url.indexOf(';')), data: url.slice(url.indexOf(',') + 1) };
}
async function chatAddImages(c, files) {
  for (const f of files) {
    if (c.imgs.length >= CHAT_IMG_MAX) { chatWarn(c, `No máximo ${CHAT_IMG_MAX} imagens por mensagem.`); break; }
    try { c.imgs.push(await chatReadImage(f)); } catch (e) { chatWarn(c, e.message === 'grande' ? 'A imagem é grande demais, mesmo reduzida.' : 'Não consegui ler essa imagem.'); }
  }
  chatThumbs(c);
}
function chatWarn(c, msg) { // aviso rápido sobre a caixa (some sozinho; não vira linha da conversa)
  let w = c.root.querySelector('.c-warn'); if (!w) { w = document.createElement('div'); w.className = 'c-warn'; c.root.querySelector('.c-box').prepend(w); }
  w.textContent = msg; clearTimeout(c.warnT); c.warnT = setTimeout(() => w.remove(), 3500);
}

/* ---------- menu de comandos "/" (TASK-045) ---------- */
// No modo -p só rodam comandos de skill, de plugin e personalizados; os interativos do terminal (/mcp, /model...) não entram na lista.
const CHAT_CMDS = {}; // por projeto: { at, list }
function chatDecode(t) { const d = document.createElement('textarea'); d.innerHTML = String(t || ''); return d.value.replace(/\s+/g, ' ').trim(); }
async function chatCmdList(p) {
  const k = CHAT_CMDS[p.id];
  if (k && Date.now() - k.at < 3000) return k.list;
  let list = [];
  try {
    const r = await api.scan(p.path);
    list = (r.skills || []).filter((x) => !x.off).map((x) => {
      const plug = x.scope === 'Plugin' ? String(x.origin || '').split('@')[0] : '';
      return { name: plug ? plug + ':' + x.name : x.name, desc: chatDecode(x.desc), origin: plug ? 'Plugin ' + plug : x.scope, kind: x.kind };
    });
  } catch { /* sem leitura: fica só o /clear */ }
  list.push({ name: 'clear', desc: 'Começa uma conversa nova nesta aba (o mesmo que o botão Clear)', origin: 'Termix', app: 'clear' });
  const seen = new Set(); list = list.filter((x) => (seen.has(x.name) ? false : seen.add(x.name))).sort((a, b) => a.name.localeCompare(b.name));
  CHAT_CMDS[p.id] = { at: Date.now(), list };
  return list;
}
function chatSlashClose(c) { c.sl = null; if (c.slash) { c.slash.classList.remove('on'); c.slash.innerHTML = ''; } }
async function chatSlashUpdate(tab, c) {
  const m = /^\/([^\s]*)$/.exec(c.inp.value); // só no começo do campo, e só enquanto digita o nome
  const f = findTab(tab.id);
  if (!m || !f) return chatSlashClose(c);
  const q = m[1].toLowerCase();
  const list = await chatCmdList(f.p);
  if (!/^\/([^\s]*)$/.test(c.inp.value)) return chatSlashClose(c); // o texto mudou enquanto lia
  const hit = list.filter((x) => x.name.toLowerCase().includes(q) || x.desc.toLowerCase().includes(q))
    .sort((a, b) => (b.name.toLowerCase().startsWith(q) - a.name.toLowerCase().startsWith(q)) || (+!!b.name.toLowerCase().includes(q) - +!!a.name.toLowerCase().includes(q))).slice(0, 60);
  if (!hit.length) return chatSlashClose(c);
  const keep = c.sl && c.sl.q === q ? c.sl.i : 0;
  c.sl = { hit, i: Math.min(keep, hit.length - 1), q };
  chatSlashPaint(c);
}
function chatSlashPaint(c) {
  const { hit, i } = c.sl;
  c.slash.innerHTML = hit.map((x, j) => `<button type="button" class="${j === i ? 'sel' : ''}" data-i="${j}" role="option"><b>/${esc(x.name)}</b><span>${esc(x.desc || 'Sem descrição')}</span><em>${esc(x.origin)}</em></button>`).join('');
  c.slash.classList.add('on');
  const el = c.slash.querySelector('.sel'); if (el) el.scrollIntoView({ block: 'nearest' });
}
function chatSlashPick(tab, c, i) {
  const x = c.sl && c.sl.hit[i]; if (!x) return;
  chatSlashClose(c);
  if (x.app === 'clear') { c.inp.value = ''; const f = findTab(tab.id); if (f) chatClearFlow(f.p, tab); return; }
  c.inp.value = '/' + x.name + ' '; c.inp.focus();
  c.inp.style.height = 'auto'; c.inp.style.height = Math.min(c.inp.scrollHeight, 180) + 'px';
}
function chatSlashKey(tab, c, e) { // devolve true se a tecla foi do menu
  if (!c.sl) return false;
  const n = c.sl.hit.length;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); c.sl.i = (c.sl.i + (e.key === 'ArrowDown' ? 1 : n - 1)) % n; chatSlashPaint(c); return true; }
  if ((e.key === 'Enter' && !e.shiftKey && !e.isComposing) || e.key === 'Tab') { e.preventDefault(); chatSlashPick(tab, c, c.sl.i); return true; }
  if (e.key === 'Escape') { e.preventDefault(); chatSlashClose(c); return true; }
  return false;
}

/* ---------- itens da conversa ---------- */
function chatToolArg(name, input) {
  const i = input || {};
  const s = String(i.file_path || i.path || i.command || i.pattern || i.url || i.query || i.description || i.prompt || '');
  return (i.file_path ? s.split(/[\\/]/).slice(-2).join('/') : s).replace(/\s+/g, ' ').slice(0, 100);
}
function chatItemEl(it) {
  const d = document.createElement(it.k === 'tool' ? 'details' : 'div');
  it.el = d;
  chatPaintItem(it);
  return d;
}
function chatPaintItem(it) {
  const d = it.el; if (!d) return;
  if (it.k === 'me') { d.className = 'c-row me'; d.innerHTML = `<div class="c-av">${CHAT_USER}</div><div class="c-bub">${(it.imgs || []).length ? `<div class="c-imgs">${it.imgs.map((u) => `<img src="${u}" alt="Imagem enviada">`).join('')}</div>` : ''}${it.text ? chatMd(it.text) : ''}</div>`; }
  else if (it.k === 'ai') {
    if (!d.firstChild) { d.className = 'c-row ai'; d.innerHTML = `<div class="c-av">${CHAT_MARK}</div><div class="c-bub"></div>`; }
    d.classList.toggle('live', !!it.live);
    if (it.live && it.v == null) it.v = chatVar;
    chatAvatar(d, it.v == null ? null : it.v); // terminou: fica o símbolo que estava animando, parado
    // o botão de copiar vem ANTES do texto, grudado (sticky) no canto de cima, à direita, dentro da caixa: acompanha a rolagem de respostas longas
    d.querySelector('.c-bub').innerHTML = (!it.live && it.text ? `<span class="c-cpw"><button class="c-copyall" type="button" title="Copiar a resposta inteira" aria-label="Copiar a resposta inteira">${chatIc('copy', 14)}</button></span>` : '') + chatMd(it.text) + (it.live ? '<span class="c-caret"></span>' : '');
  } else if (it.k === 'sys') { d.className = 'c-sys' + (it.err ? ' err' : ''); d.textContent = it.text; }
  else if (it.k === 'perm') { // pedido de permissão do Claude Code (TASK-105): Permitir uma vez / sempre / Negar
    const st = it.state, dest = ((it.rules || [])[0] || {}).destination;
    const always = (it.rules || []).length ? (dest === 'session' ? 'Permitir nesta sessão' : dest === 'userSettings' ? 'Permitir sempre (todos os projetos)' : 'Permitir sempre neste projeto') : '';
    const ST = { allow: 'Permitido', always: 'Permitido sempre', deny: 'Negado', gone: 'Encerrado sem resposta' };
    d.className = 'c-pm' + (st === 'pending' ? '' : ' done ' + st);
    d.innerHTML = `<div class="pmh"><span class="ti">!</span><b>${esc(it.title)}</b><span class="pms">${st === 'pending' ? 'Aguardando você' : ST[st]}</span></div><pre class="pmb">${esc(it.body)}</pre>${it.desc ? `<div class="pmd">${esc(it.desc)}</div>` : ''}`
      + (st === 'pending' ? `<div class="pma"><button type="button" class="pri" data-pm="allow">Permitir uma vez</button>${always ? `<button type="button" data-pm="always">${esc(always)}</button>` : ''}<button type="button" class="neg" data-pm="deny">Negar</button></div>` : '');
  }
  else if (it.k === 'tool') {
    const open = d.open;
    d.className = 'c-tool' + (it.done ? (it.err ? ' err' : '') : ' run');
    d.innerHTML = `<summary><span class="ti">${esc((it.name || '?')[0])}</span><span class="tn">${esc(it.name || '')}</span><span class="ta">${esc(chatToolArg(it.name, it.input))}</span><span class="ts">${it.done ? (it.err ? 'erro' : '✓ concluído') : 'executando…'}</span></summary><div class="tb">${esc(it.body || (it.input ? JSON.stringify(it.input, null, 1).slice(0, 1200) : ''))}</div>`;
    d.open = open;
  }
}
function chatAdd(c, it) {
  c.items.push(it);
  c.thread.insertBefore(chatItemEl(it), c.typing);
  chatScroll(c);
  return it;
}
function chatSys(c, text, err) { return chatAdd(c, { k: 'sys', text, err: !!err }); }
function chatScroll(c) { if (c.stick) requestAnimationFrame(() => { c.scroll.scrollTop = c.scroll.scrollHeight; }); }
function chatMark(c, it) { // desenha o item em andamento no máximo uma vez por quadro
  c.dirty.add(it);
  if (c.q) return;
  c.q = true;
  const wait = Math.max(0, 110 - (performance.now() - (c.lp || 0)));
  setTimeout(() => requestAnimationFrame(() => { c.q = false; c.lp = performance.now(); for (const x of c.dirty) chatPaintItem(x); c.dirty.clear(); chatScroll(c); }), wait);
}
function chatRenderAll(c) {
  [...c.thread.children].forEach((el) => { if (el !== c.typing) el.remove(); });
  for (const it of c.items) c.thread.insertBefore(chatItemEl(it), c.typing);
  c.stick = true; chatScroll(c);
}

/* ---------- "o que o Claude está fazendo", abaixo da conversa, como o "Manifesting…" do terminal ---------- */
const CHAT_VERBS = ['Pensando', 'Analisando', 'Tecendo', 'Conjurando', 'Cozinhando', 'Manifestando', 'Decifrando', 'Montando', 'Destilando', 'Explorando', 'Costurando', 'Calculando'];
const CHAT_DOING = { Read: 'Lendo', Bash: 'Executando', Edit: 'Editando', Write: 'Escrevendo', MultiEdit: 'Editando', Grep: 'Buscando em arquivos', Glob: 'Procurando arquivos', WebFetch: 'Abrindo uma página', WebSearch: 'Pesquisando na web', Task: 'Delegando a um subagente', Agent: 'Delegando a um subagente', TodoWrite: 'Atualizando a lista de tarefas', NotebookEdit: 'Editando o notebook' };
function chatElapsed(ms) { const s = Math.max(0, Math.floor(ms / 1000)); return s < 60 ? s + 's' : Math.floor(s / 60) + 'min ' + String(s % 60).padStart(2, '0') + 's'; }
function chatStatus(c) {
  if (!c.busy || !c.typing) return;
  const el = Date.now() - (c.t0 || Date.now());
  const run = [...c.items].reverse().find((it) => it.k === 'tool' && !it.done);
  const last = c.items[c.items.length - 1];
  const pend = c.items.find((it) => it.k === 'perm' && it.state === 'pending');
  let sub;
  if (pend) sub = 'Aguardando a sua permissão · ' + (pend.title || '');
  else if (run) { let arg = chatToolArg(run.name, run.input);
    if (!arg && run.json) { // a entrada ainda chegando pelo stream: pega o primeiro campo conhecido
      const m = /"(?:file_path|command|pattern|path|url|query|description)"\s*:\s*"((?:[^"\\]|\\.)*)/.exec(run.json);
      if (m) arg = m[1].replace(/\\n/g, ' ').slice(0, 120);
    }
    sub = (CHAT_DOING[run.name] || 'Usando ' + (run.name || 'uma ferramenta')) + (arg ? ' · ' + arg : '');
  }
  else if (last && last.k === 'tool') sub = 'Analisando o resultado de ' + (last.name || 'ferramenta');
  else if (last && last.k === 'me') sub = 'Começando a pensar na sua mensagem';
  else sub = 'Pensando no próximo passo';
  const q = c.typing;
  q.querySelector('.v').textContent = CHAT_VERBS[((c.verbI || 0) + Math.floor(el / 6000)) % CHAT_VERBS.length] + '…';
  q.querySelector('.t').textContent = chatElapsed(el);
  q.querySelector('.c-st2').textContent = sub;
}
setInterval(() => { for (const id in CH) { const c = CH[id]; if (c.busy && c.typing && c.typing.classList.contains('on')) chatStatus(c); } }, 1000);

/* ---------- interface da aba (estado, modelo, contexto, permissão) ---------- */
function chatUi(tab) {
  const c = CH[tab.id], f = findTab(tab.id);
  if (!c || !f) return;
  const p = f.p, last = c.items[c.items.length - 1];
  c.root.classList.toggle('busy', c.busy);
  c.root.classList.toggle('c-new', !c.items.length); // (não usar a classe 'empty': o app.js já tem uma com outro desenho)
  const think = c.busy && !(last && last.k === 'ai' && last.live);
  c.typing.classList.toggle('on', think);
  if (think) chatAvatar(c.typing, c.v == null ? chatVar : c.v);
  if (think) chatStatus(c);
  c.root.querySelector('.c-empty h2').textContent = `Nova conversa em ${p.name}`;
  c.root.querySelector('.c-empty p').textContent = p.path;
  c.root.querySelector('.c-folder span').textContent = p.name;
  c.root.querySelector('.c-folder em').textContent = railBranch(p) || '';
  c.mdl.textContent = c.modelName || '';
  c.perm.textContent = tab.perm === 'd' ? '⚠ bypass' : 'Perguntar';
  c.perm.title = tab.perm === 'd' ? 'Esta aba ignora as verificações de permissão (Configurações > Chat)' : 'Edições de arquivo são aceitas; o resto pede a sua permissão aqui na conversa (Configurações > Chat)';
  c.perm.classList.toggle('w', tab.perm === 'd');
}

function showChat(tab) {
  const c = chatView(tab), f = findTab(tab.id);
  chatEnsure(tab);
  $('#termHost').classList.add('hide'); $('#chatHost').classList.remove('hide'); $('#sess').classList.add('chatmode');
  $('#chatHost').querySelectorAll('.c-root').forEach((el) => el.classList.toggle('on', el === c.root));
  if (!c.loaded) {
    c.loaded = true;
    if (tab.started && f) {
      api.chatHistory(f.p.path, tab.sessionId).then((h) => {
        const items = h.items || [];
        if (!items.length) { chatUi(tab); return; }
        items.forEach((it) => { if (it.k === 'tool') it.done = true; });
        if (h.model && !c.modelName) { c.modelId = h.model; c.modelName = CHAT_NAME(h.model); }
        c.items = items.concat(c.items); chatRenderAll(c);
        if (h.usage && !(MET[tab.id] && MET[tab.id].context_window)) chatCtx(tab, c, h.usage); // contexto da última resposta gravada
        chatUi(tab);
      });
    }
  }
  chatUi(tab);
  const changed = UI.chatShown !== tab.id; UI.chatShown = tab.id;
  if (changed) { c.stick = true; requestAnimationFrame(() => { c.scroll.scrollTop = c.scroll.scrollHeight; }); }
  requestAnimationFrame(() => {
    const a = document.activeElement;
    if (!UI.menu && !$('#modalRoot').firstChild && (!a || a === document.body || a.closest('.c-root'))) c.inp.focus();
  });
}

/* ---------- ciclo de vida ---------- */
function chatOpen(p, tab) { // chamado por launch(): a aba de chat não sobe processo até a primeira mensagem
  chatEnsure(tab); chatView(tab);
  setSt(tab, 'wait');
  return Promise.resolve();
}
async function chatSpawn(p, tab) {
  const r = chatEnsure(tab), c = chatView(tab);
  const resume = !!tab.started && await api.sessionExists(p.path, tab.sessionId); // sem histórico gravado não há o que retomar
  const res = await api.chatStart({ tabId: tab.id, cwd: p.path, sessionId: tab.sessionId, resume, perm: tab.perm });
  if (!res.ok) {
    r.alive = false; setSt(tab, 'fail');
    chatSys(c, res.error, true);
    addEvent({ c: tab.color, who: tab.name, msg: res.error, kind: 'error', acts: [['Tentar de novo', 'restart', tab.id]] });
    return false;
  }
  r.alive = true; r.killing = false; r.spawnAt = Date.now(); sendSummary();
  return true;
}
async function chatSendMsg(tab, text, imgs = []) {
  const f = findTab(tab.id); if (!f) return;
  const r = chatEnsure(tab), c = chatView(tab);
  if (!r.alive && !(await chatSpawn(f.p, tab))) return;
  r.lastInput = Date.now();
  UI.events = UI.events.filter((e) => !(e.kind === 'cache' && e.tabId === tab.id)); // mandou mensagem: o cache foi renovado
  chatAdd(c, { k: 'me', text: text.trim(), imgs: imgs.map((m) => m.url) });
  c.busy = true; c.stick = true; c.lastAi = '';
  c.t0 = Date.now(); c.verbI = Math.floor(Math.random() * CHAT_VERBS.length);
  chatVar = c.v = (chatVar + 1) % CHAT_WORK.length; // rodízio: cada mensagem usa o próximo símbolo
  setSt(tab, 'work'); chatUi(tab);
  const res = await api.chatSend(tab.id, text.trim(), imgs.map((m) => ({ mt: m.mt, data: m.data })));
  if (!res.ok) { c.busy = false; chatSys(c, 'Não consegui enviar: o processo do Claude Code não está ativo. Envie de novo para reiniciá-lo.', true); r.alive = false; setSt(tab, 'wait'); chatUi(tab); return; }
  if (!tab.started) { tab.started = true; save(); }
}
// resposta do usuário ao cartão de permissão: how = 'allow' | 'always' | 'deny'
async function chatDecide(tab, it, how) {
  if (it.state !== 'pending' || it.sending) return;
  it.sending = true;
  const c = chatView(tab);
  const res = await api.chatPermit({ tabId: tab.id, requestId: it.rid, allow: how !== 'deny', input: it.input, rules: how === 'always' ? it.rules : undefined, message: 'O usuário negou esta ação no Termix. Não tente de novo da mesma forma; pergunte a ele o que prefere.' });
  it.sending = false;
  if (!res || !res.ok) { it.state = 'gone'; chatPaintItem(it); chatSys(c, 'Não consegui responder: o processo do Claude Code não está mais ativo. Envie uma mensagem para reiniciá-lo.', true); chatUi(tab); return; }
  it.state = how; chatPaintItem(it);
  if (!c.items.some((x) => x.k === 'perm' && x.state === 'pending')) setSt(tab, 'work'); // voltou a trabalhar
  chatUi(tab);
}
function chatInterrupt(tab) {
  const r = RT[tab.id], c = CH[tab.id];
  if (!r || !r.alive || !c || !c.busy) return;
  r.killing = true;
  api.chatStop(tab.id);
  chatSys(c, 'Resposta interrompida. A próxima mensagem retoma a conversa.');
}
async function chatRestart(p, tab) {
  const c = chatView(tab), r = chatEnsure(tab);
  if (c.busy) {
    const ch = await modal({ title: 'O agente está trabalhando', body: '<p>Reiniciar agora interrompe a resposta em andamento. A conversa continua na próxima mensagem.</p>', buttons: [['Cancelar', null], ['Interromper e reiniciar', 'now', 'pri']] });
    if (!ch.value) return;
  }
  if (r.alive) await stopProc(tab);
  c.busy = false; chatStopLive(c); setSt(tab, 'wait');
  chatSys(c, 'Processo reiniciado. A próxima mensagem retoma a conversa.');
  chatUi(tab);
}
async function chatNew(p, tab) {
  await stopProc(tab);
  tab.sessionId = uuid(); tab.started = false; save();
  const c = chatView(tab);
  c.items = []; c.byIdx = {}; c.busy = false; c.seen = new Set(); c.loaded = true; c.modelName = '';
  chatRenderAll(c); delete MET[tab.id]; setSt(tab, 'wait'); chatUi(tab); renderRail();
}
// Clear do chat com as mesmas opções do terminal: "Só limpar" (conversa nova) ou "Fechar a tarefa e limpar" (o agente registra o que fez,
// a conversa nova começa e ele retoma pelos arquivos do projeto). Aqui sabemos exatamente quando o agente terminou (evento `result`).
async function chatClearFlow(p, tab) {
  const c = chatView(tab);
  if (c.busy || c.flow) return;
  const pr = await clearPrompts(p);
  if (c.busy || c.flow) return;
  const nota = pr.fl ? `<p class="meta">Projeto no fluxo Rocruzta${pr.info.role ? ` · papel ${esc(pr.info.role)}` : ''}: o fechamento e a retomada seguem o fluxo e leem só o necessário.</p>` : '';
  const ch = await modal({
    title: 'Limpar o contexto?',
    body: '<p>Uma <b>conversa nova</b> começa vazia; a atual continua guardada pelo Claude Code e pode ser retomada pelo ID. <b>Fechar a tarefa e limpar</b> pede antes ao agente para registrar o que foi feito e, ao terminar, começa a conversa nova e manda ele retomar pelos arquivos do projeto.</p>' + nota,
    buttons: pr.canClose ? [['Cancelar', null], ['Só limpar', 'only'], ['Fechar a tarefa e limpar', 'full', 'pri']] : [['Cancelar', null], ['Só limpar', 'only', 'pri']],
  });
  if (ch.value === 'only') { chatNew(p, tab); return; }
  if (ch.value !== 'full') return;
  c.flow = { step: 'closing', t0: Date.now() }; const n0 = c.items.length; // só vale o aviso final escrito DEPOIS deste pedido
  renderRail(); dockRefresh();
  addEvent({ c: tab.color, who: tab.name, msg: 'Fechando a tarefa antes de limpar…' });
  try {
    await chatSendMsg(tab, pr.close);
    const t0 = Date.now();
    while (c.busy && Date.now() - t0 < 20 * 60 * 1000) await new Promise((r) => setTimeout(r, 500)); // espera o agente terminar (teto de 20 min)
    if (!c.flow || !CH[tab.id]) return; // a aba foi fechada ou o fluxo cancelado
    const marcou = c.items.slice(n0).some((it) => it.k === 'ai' && it.text.includes(CLEAR_MARK)); // o agente escreveu o aviso final combinado
    if (!marcou) { // sem o aviso final (pediu aprovação, deu erro, negou algo ou foi interrompido): pergunta, como no terminal
      c.flow = { step: 'asking', t0: Date.now() }; dockRefresh();
      const ask = await modal({
        title: 'A tarefa foi registrada?',
        body: '<p>Não encontrei o aviso de que o fechamento terminou (o agente pode ter pedido a sua aprovação, ter sido interrompido, ter tido um erro ou ter deixado algo pendente). Olhe a conversa antes de decidir.</p>',
        buttons: [['Não limpar', null], ['Limpar e retomar mesmo assim', 'ok', 'pri']],
      });
      if (ask.value !== 'ok') return;
    }
    c.flow = { step: 'clearing', t0: Date.now() }; dockRefresh();
    await chatNew(p, tab);
    await chatSendMsg(tab, pr.resume);
  } finally {
    c.flow = null; renderRail(); dockRefresh();
  }
}
async function chatExport(tab) { // "Exportar texto" do menu da aba, para o chat
  const c = CH[tab.id];
  if (!c || !c.items.length) return;
  const text = c.items.map((it) => (it.k === 'me' ? `Você:\n${it.text}` : it.k === 'ai' ? `Claude:\n${it.text}` : it.k === 'tool' ? `[${it.name} ${chatToolArg(it.name, it.input)}]` : it.k === 'perm' ? `[Permissão ${it.title}: ${it.state}]` : `(${it.text})`)).join('\n\n') + '\n';
  const saved = await api.saveText(`${tab.name}.txt`, text);
  if (saved) addEvent({ c: tab.color, who: tab.name, msg: `Conversa exportada para ${saved}` });
}
function chatForget(tab) {
  const c = CH[tab.id];
  if (c) { c.root.remove(); delete CH[tab.id]; }
  delete MET[tab.id];
}
function chatStopLive(c) {
  for (const it of c.items) { if (it.live) { it.live = false; chatPaintItem(it); } if (it.k === 'tool' && !it.done) { it.done = true; chatPaintItem(it); } if (it.k === 'perm' && it.state === 'pending') { it.state = 'gone'; chatPaintItem(it); } }
  c.byIdx = {};
}

/* ---------- eventos do stream-json ---------- */
const CHAT_NAME = (id) => { const m = /claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?(?:\b|$)/i.exec(String(id || '')); return m ? `${m[1][0].toUpperCase()}${m[1].slice(1)} ${m[2]}${m[3] ? '.' + m[3] : ''}` : String(id || ''); };
/* Métricas da aba de chat no mesmo formato da status line do terminal, para o rail (contexto, 5 h, 7 d e cache) agir igual nos dois modos (TASK-058).
   O `claude -p` não tem status line, então tudo vem do stream: usage (contexto e tipo de cache), rate_limit_event (limites) e modelUsage (janela real). */
const CHAT_CTX_DEFAULT = 200000;
function chatMet(tab, c, patch) {
  const { rate_limits, ...rest } = patch;
  c.met = { ...(c.met || {}), ...rest };
  const data = { ...c.met, updated: Date.now() }; // em milissegundos, como o arquivo de métricas do terminal: a ordem "mais novo vence" e o "atualizado há" dependem da mesma unidade (TASK-091)
  if (rate_limits) data.rate_limits = rate_limits; // os limites só vão quando acabaram de chegar: não sobrescrevem os mais novos vindos de um terminal
  onMetric({ tabId: tab.id, data });
  if (rate_limits && UI.limits) { S.lastLimits = UI.limits; save(); } // ao reabrir o app os anéis 5 h / 7 d já aparecem (o terminal faz o mesmo pelo arquivo de métricas)
}
// tamanho real da janela: o do último resultado, o guardado deste modelo, ou um palpite pelo nome do modelo (só até a primeira resposta terminar)
function chatCtxSize(c) {
  const saved = (S.settings.ctxSizes || {})[c.modelId];
  return c.ctxSize || saved || (/1m/i.test(c.modelId || '') ? 1000000 : CHAT_CTX_DEFAULT);
}
function chatCtx(tab, c, u, fresh) {
  if (!u) return;
  const tok = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
  c.lastUsage = u;
  const size = chatCtxSize(c);
  const patch = { model: { id: c.modelId, display_name: c.modelName }, context_window: { used_percentage: Math.min(100, tok / size * 100), context_window_size: size, total_input_tokens: tok, current_usage: { input_tokens: u.input_tokens || 0, output_tokens: u.output_tokens || 0, cache_creation_input_tokens: u.cache_creation_input_tokens || 0, cache_read_input_tokens: u.cache_read_input_tokens || 0 } } };
  if (fresh && (u.cache_read_input_tokens || u.cache_creation_input_tokens)) { // cada chamada à API renova a validade do cache; o tipo (1 h ou 5 min) vem do usage
    const cc = u.cache_creation || {};
    if ((cc.ephemeral_1h_input_tokens || 0) > 0) c.cacheTtl = '1h'; else if ((cc.ephemeral_5m_input_tokens || 0) > 0) c.cacheTtl = '5m';
    if (!c.cacheTtl) c.cacheTtl = c.apiKeySource === 'none' ? '1h' : '5m'; // assinatura: 1 h; chave de API ou créditos extras: 5 min
    patch.prompt_cache = { caching_observed: true, warm: true, ttl: c.cacheTtl, expires_at: Date.now() / 1000 + (c.cacheTtl === '1h' ? 3600 : 300), recache_tokens_if_cold: tok };
  }
  chatMet(tab, c, patch);
}
function chatEvent(f, ev) {
  const { p, tab } = f, c = chatView(tab), r = chatEnsure(tab);
  switch (ev.type) {
    case 'system':
      if (ev.subtype === 'init') { c.modelId = ev.model || ''; c.modelName = CHAT_NAME(ev.model); c.apiKeySource = ev.apiKeySource || ''; }
      break;
    case 'stream_event': {
      const e = ev.event || {};
      if (e.type === 'message_start') { c.curMsg = e.message && e.message.id; c.seen.add(c.curMsg); c.byIdx = {}; chatCtx(tab, c, e.message && e.message.usage, true); }
      else if (e.type === 'content_block_start') {
        const b = e.content_block || {};
        if (b.type === 'text') c.byIdx[e.index] = chatAdd(c, { k: 'ai', text: b.text || '', live: true, mid: c.curMsg });
        else if (b.type === 'tool_use') c.byIdx[e.index] = chatAdd(c, { k: 'tool', id: b.id, name: b.name, input: null, json: '', done: false });
      } else if (e.type === 'content_block_delta') {
        const it = c.byIdx[e.index], d = e.delta || {};
        if (!it) break;
        if (d.type === 'text_delta') { it.text += d.text; c.lastAi = it.text; chatMark(c, it); }
        else if (d.type === 'input_json_delta') it.json += d.partial_json || '';
      } else if (e.type === 'content_block_stop') {
        const it = c.byIdx[e.index];
        if (!it) break;
        if (it.k === 'ai') { it.live = false; chatMark(c, it); }
        else if (it.k === 'tool') { try { it.input = JSON.parse(it.json || '{}'); } catch { it.input = null; } chatMark(c, it); }
      } else if (e.type === 'message_delta' && e.usage) chatCtx(tab, c, { ...e.usage });
      break;
    }
    case 'assistant': { // mensagem completa: só desenha se o stream parcial não passou por ela (e completa o que faltou)
      const m = ev.message || {};
      if (c.seen.has(m.id)) break;
      c.seen.add(m.id);
      for (const b of m.content || []) {
        if (b.type === 'text' && b.text) { chatAdd(c, { k: 'ai', text: b.text, mid: m.id }); c.lastAi = b.text; }
        else if (b.type === 'tool_use') chatAdd(c, { k: 'tool', id: b.id, name: b.name, input: b.input, done: false });
      }
      chatCtx(tab, c, m.usage, true);
      break;
    }
    case 'user': { // resultados das ferramentas
      const arr = ev.message && Array.isArray(ev.message.content) ? ev.message.content : [];
      for (const b of arr) {
        if (b.type !== 'tool_result') continue;
        const it = c.items.find((x) => x.k === 'tool' && x.id === b.tool_use_id);
        if (!it) continue;
        it.done = true; it.err = !!b.is_error;
        it.body = (typeof b.content === 'string' ? b.content : Array.isArray(b.content) ? b.content.map((x) => x.text || '').join('\n') : '').slice(0, 1500);
        chatPaintItem(it);
      }
      break;
    }
    case 'control_request': { // o Claude Code pede permissão para uma ferramenta e espera a resposta (TASK-105)
      const q = ev.request || {};
      if (q.subtype !== 'can_use_tool') break;
      if (q.tool_name === 'AskUserQuestion') { // o chat ainda não mostra perguntas com opções: devolve ao Claude para perguntar em texto
        api.chatPermit({ tabId: tab.id, requestId: ev.request_id, allow: false, message: 'O chat do Termix ainda não mostra perguntas interativas. Faça a pergunta em texto, na sua resposta, e espere o usuário responder.' });
        break;
      }
      const inp = q.input || {}, title = q.display_name || q.tool_name || 'Ferramenta';
      const body = String(inp.command || inp.file_path || inp.path || inp.url || inp.pattern || JSON.stringify(inp, null, 1)).slice(0, 1200);
      chatAdd(c, { k: 'perm', rid: ev.request_id, tuid: q.tool_use_id, title, input: inp, rules: Array.isArray(q.permission_suggestions) ? q.permission_suggestions : [], desc: q.description || '', body, state: 'pending' });
      setSt(tab, 'wait'); // "Aguardando você" na barra de abas, como o pedido de permissão do terminal
      notifyTab(p, tab, 'perm', `Permitir ${title}? ${chatToolArg(q.tool_name, inp)}`.trim());
      break;
    }
    case 'control_cancel_request': { // o Claude Code desistiu do pedido (ex.: interrompido)
      const it = c.items.find((x) => x.k === 'perm' && x.rid === ev.request_id && x.state === 'pending');
      if (it) { it.state = 'gone'; chatPaintItem(it); if (!c.items.some((x) => x.k === 'perm' && x.state === 'pending') && c.busy) setSt(tab, 'work'); }
      break;
    }
    case 'rate_limit_event': { // limites de 5 h e 7 d da conta, como a status line do terminal
      const i = ev.rate_limit_info || {}, w = i.unifiedWindows || {};
      const conv = (x) => (x && typeof x.utilization === 'number' ? { used_percentage: x.utilization <= 1 ? x.utilization * 100 : x.utilization, resets_at: x.resetsAt } : null);
      const five = conv(w.five_hour) || (i.rateLimitType === 'five_hour' ? conv(i) : null), week = conv(w.seven_day) || (i.rateLimitType === 'seven_day' ? conv(i) : null);
      if (five || week) chatMet(tab, c, { rate_limits: { ...(five ? { five_hour: five } : {}), ...(week ? { seven_day: week } : {}) } });
      break;
    }
    case 'result': {
      c.busy = false; chatStopLive(c);
      { // o Claude Code informa a janela de contexto real do modelo: corrige o percentual (o palpite pelo nome errava em 5x com o modelo de 1 M)
        const mu = ev.modelUsage && (ev.modelUsage[c.modelId] || Object.values(ev.modelUsage)[0]);
        if (mu && mu.contextWindow && mu.contextWindow !== c.ctxSize) {
          c.ctxSize = mu.contextWindow;
          if (!S.settings.ctxSizes) S.settings.ctxSizes = {};
          if (S.settings.ctxSizes[c.modelId] !== c.ctxSize) { S.settings.ctxSizes[c.modelId] = c.ctxSize; save(); }
          if (c.lastUsage) chatCtx(tab, c, c.lastUsage);
        }
      }
      // negações que o próprio usuário deu no cartão já aparecem nele; aqui só o que foi negado sem pergunta (regra de permissão do projeto ou do usuário)
      const byUser = new Set(c.items.filter((x) => x.k === 'perm' && x.state === 'deny').map((x) => x.tuid));
      const denied = (ev.permission_denials || []).filter((d) => !byUser.has(d.tool_use_id));
      for (const d of denied) chatSys(c, `Negado por uma regra de permissão: ${d.tool_name} ${chatToolArg(d.tool_name, d.tool_input)}.`, true);
      if (ev.is_error) chatSys(c, `O Claude Code devolveu um erro${ev.result ? ': ' + String(ev.result).slice(0, 300) : '.'}`, true);
      setSt(tab, 'wait');
      if (denied.length) notifyTab(p, tab, 'perm', 'Precisa de você: ' + [...new Set(denied.map((d) => d.tool_name))].join(', ') + ' foi negado por uma regra de permissão.');
      notifyTab(p, tab, ev.is_error ? 'error' : 'done', ev.is_error ? 'A resposta terminou com erro.' : (c.lastAi.replace(/[#*`>_-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 160) || 'Terminou. Aguardando você.'));
      break;
    }
    default: break;
  }
  chatUi(tab);
}
window.termix.onChatEvents(({ tabId, evs }) => {
  const f = findTab(tabId);
  if (!f) return;
  for (const ev of evs) { try { chatEvent(f, ev); } catch (err) { console.error('chat', err); } }
});
window.termix.onChatExit(({ tabId, killed, err }) => {
  const f = findTab(tabId), r = RT[tabId];
  if (!f || !r) return;
  const c = CH[tabId];
  r.alive = false; sendSummary();
  if (r.killing || killed) {
    r.killing = false;
    if (r.waiter) { r.waiter(); r.waiter = null; }
    if (c) { c.busy = false; chatStopLive(c); }
    setSt(f.tab, 'wait'); if (c) chatUi(f.tab);
    return;
  }
  if (c && c.busy) {
    c.busy = false; chatStopLive(c);
    const msg = 'O Claude Code encerrou sem terminar a resposta' + (err ? `: ${String(err).slice(-300)}` : '.');
    chatSys(c, msg, true);
    setSt(f.tab, 'fail');
    notifyTab(f.p, f.tab, 'error', msg, [['Tentar de novo', 'restart', f.tab.id]]);
  } else setSt(f.tab, 'wait');
  if (c) chatUi(f.tab);
});
