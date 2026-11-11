/* Tela "Código" (TASK-102): explorador de arquivos, abas, leitor e diff do git, no estilo do VS Code. Somente leitura. */
Object.assign(ICONS, {
  scode: '<path d="M8.5 7 3.5 12l5 5M15.5 7l5 5-5 5M13.5 4.5l-3 15"/>',
  file: '<path d="M14 3H7.5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7z"/><path d="M14 3v4h4"/>',
  branch: '<circle cx="6" cy="5.5" r="2"/><circle cx="6" cy="18.5" r="2"/><circle cx="18" cy="8.5" r="2"/><path d="M6 7.5v9M18 10.5c0 4-12 2-12 6"/>',
});

const CODE = {}; // por projeto: { tree, exp, tabs, active, st, side }
const codeState = (p) => (CODE[p.id] ||= { tree: {}, exp: { '': true }, tabs: [], active: null, st: null, stLoading: false, sec: { chg: true, files: true }, treeErr: '' });

const CODE_STATUS = { M: ['M', 'var(--warn)', 'Modificado'], A: ['A', 'var(--ok)', 'Adicionado'], D: ['D', 'var(--bad)', 'Apagado'], R: ['R', 'var(--work)', 'Renomeado'], C: ['C', 'var(--work)', 'Copiado'], U: ['U', 'var(--ok)', 'Novo (não rastreado)'], T: ['T', 'var(--warn)', 'Tipo alterado'] };
const CODE_EXT = { js: '#e5c547', mjs: '#e5c547', cjs: '#e5c547', ts: '#4f9be8', tsx: '#4f9be8', jsx: '#60befa', json: '#e5a63b', md: '#8fa3b8', css: '#a07bff', html: '#ec7a4f', py: '#4f9be8', yml: '#ec5d5d', yaml: '#ec5d5d', svg: '#4cc38a', png: '#4cc38a', ico: '#4cc38a', sh: '#4cc38a', ps1: '#4f9be8' };
const codeExt = (name) => (name.includes('.') ? name.split('.').pop().toLowerCase() : '');
const codeBase = (rel) => rel.split('/').pop();
const codeDirOf = (rel) => (rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '');
const fileIc = (name) => `<span class="cd-fi" style="color:${CODE_EXT[codeExt(name)] || 'var(--text3)'}">${ic('file', 15)}</span>`;

// ---------- carregamento ----------
async function codeLoadTree(p, rel) {
  const c = codeState(p);
  const r = await api.codeTree(p.path, rel);
  if (r.ok) { c.tree[rel] = r.items; c.treeErr = ''; } else if (rel === '') c.treeErr = r.error || 'Não foi possível ler a pasta.';
  codeRepaint('side');
}
async function codeLoadStatus(p) {
  const c = codeState(p);
  if (c.stLoading) return;
  c.stLoading = true;
  const r = await api.codeStatus(p.path);
  c.stLoading = false;
  const nu = r.ok ? r : { repo: false, files: [] };
  if (c.st && JSON.stringify(c.st) === JSON.stringify(nu)) return; // nada mudou: não refaz a tela
  c.st = nu;
  // abas de diff de arquivos que não mudam mais saem sozinhas
  c.tabs = c.tabs.filter((t) => t.kind !== 'diff' || c.st.files.some((f) => f.path === t.rel));
  if (!c.tabs.some((t) => t.key === c.active)) c.active = c.tabs.length ? c.tabs[c.tabs.length - 1].key : null;
  codeRepaint();
  c.tabs.forEach((t) => { if (t.loaded) codeLoadTab(p, t, true); }); // as mudanças alteraram o que está aberto: relê
  Object.keys(c.exp).filter((k) => k && c.exp[k]).concat('').forEach((k) => codeLoadTree(p, k)); // pastas novas ou apagadas
}
async function codeLoadTab(p, t, quiet) {
  if (!quiet) t.data = null;
  const f = codeState(p).st && codeState(p).st.files.find((x) => x.path === t.rel);
  const r = t.kind === 'diff' ? await api.codeDiff(p.path, t.rel, f ? f.untracked : t.untracked) : await api.codeRead(p.path, t.rel);
  t.data = r; t.loaded = true;
  if (codeState(p).active === t.key) codeRepaint('main');
}

// ---------- realce de sintaxe simples (sem biblioteca) ----------
const KW = /^(?:const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|import|from|export|default|async|await|try|catch|finally|throw|typeof|instanceof|in|of|this|null|undefined|true|false|void|def|self|None|True|False|elif|lambda|with|as|pass|raise|yield|fn|pub|use|struct|enum|impl|match|mut)$/;
function codeHL(line, ext) {
  if (line.length > 600) return esc(line);
  const hashC = ['py', 'sh', 'yml', 'yaml', 'ps1', 'rb', 'toml'].includes(ext);
  const slashC = !['md', 'json', 'html', 'css', 'txt', 'yml', 'yaml'].includes(ext) || ext === 'css';
  if (ext === 'md') {
    if (/^\s*#{1,6}\s/.test(line)) return `<span class="hl-h">${esc(line)}</span>`;
    if (/^\s*(?:[-*+]|\d+\.)\s/.test(line)) return esc(line).replace(/^(\s*(?:[-*+]|\d+\.))/, '<span class="hl-k">$1</span>');
    return esc(line).replace(/`([^`]+)`/g, '<span class="hl-s">`$1`</span>');
  }
  let out = '', i = 0;
  while (i < line.length) {
    const ch = line[i], two = line.substr(i, 2);
    if ((slashC && two === '//') || (hashC && ch === '#') || (ext === 'css' && two === '/*')) { out += `<span class="hl-c">${esc(line.slice(i))}</span>`; break; }
    if (ch === '"' || ch === "'" || ch === '`') {
      let j = i + 1; while (j < line.length && line[j] !== ch) j += line[j] === '\\' ? 2 : 1;
      out += `<span class="hl-s">${esc(line.slice(i, j + 1))}</span>`; i = j + 1; continue;
    }
    const num = /^\d[\d._]*(?:[eE][+-]?\d+)?/.exec(line.slice(i));
    if (num && !/\w/.test(line[i - 1] || '')) { out += `<span class="hl-n">${num[0]}</span>`; i += num[0].length; continue; }
    const w = /^[A-Za-z_$][\w$]*/.exec(line.slice(i));
    if (w) {
      const nxt = line[i + w[0].length];
      out += KW.test(w[0]) ? `<span class="hl-k">${w[0]}</span>` : nxt === '(' ? `<span class="hl-f">${w[0]}</span>` : esc(w[0]);
      i += w[0].length; continue;
    }
    out += esc(ch); i++;
  }
  return out;
}

// ---------- peças da tela ----------
function codeTreeHTML(p, c, rel, depth) {
  const items = c.tree[rel];
  if (!items) return `<div class="cd-note" style="padding-left:${12 + depth * 14}px">Carregando…</div>`;
  const stMap = {};
  if (c.st) for (const f of c.st.files) stMap[f.path] = f;
  return items.map((it) => {
    const r = rel ? `${rel}/${it.name}` : it.name;
    const pad = 14 + depth * 14;
    if (it.dir) {
      const open = !!c.exp[r];
      const dirty = c.st && c.st.files.some((f) => f.path.startsWith(r + '/'));
      return `<button class="cd-row" style="padding-left:${pad}px" data-cd="dir" data-cv="${esc(r)}"><span class="cd-chev">${ic(open ? 'chevd' : 'chevr', 12)}</span><span class="cd-fi" style="color:var(--text3)">${ic('folder', 15)}</span><span class="cd-nm">${esc(it.name)}</span>${dirty ? '<i class="cd-dot"></i>' : ''}</button>${open ? codeTreeHTML(p, c, r, depth + 1) : ''}`;
    }
    const f = stMap[r], s = f && CODE_STATUS[f.code];
    return `<button class="cd-row ${c.active === 'f:' + r ? 'sel' : ''}" style="padding-left:${pad + 21}px" data-cd="file" data-cv="${esc(r)}" title="${esc(r)}">${fileIc(it.name)}<span class="cd-nm" ${s ? `style="color:${s[1]}"` : ''}>${esc(it.name)}</span>${s ? `<b class="cd-st" style="color:${s[1]}" title="${s[2]}">${s[0]}</b>` : ''}</button>`;
  }).join('');
}
function codeSideHTML(p, c) {
  const files = (c.st && c.st.files) || [];
  const sec = (key, title, count, body, acts = '') => `<div class="cd-sec"><div class="cd-sh" data-cd="sec" data-cv="${key}"><span class="cd-chev">${ic(c.sec[key] ? 'chevd' : 'chevr', 12)}</span><span>${title}</span>${count != null ? `<em>${count}</em>` : ''}<span class="grow"></span>${acts}</div>${c.sec[key] ? `<div class="cd-sb">${body}</div>` : ''}</div>`;
  const chgBody = !c.st ? '<div class="cd-note">Carregando…</div>'
    : !c.st.repo ? '<div class="cd-note">Esta pasta não é um repositório git; não há mudanças para mostrar.</div>'
    : !files.length ? '<div class="cd-note">Nenhuma mudança desde o último commit.</div>'
    : files.map((f) => { const s = CODE_STATUS[f.code] || [f.code, 'var(--text2)', '']; const nm = codeBase(f.path), dir = codeDirOf(f.path);
      return `<button class="cd-row cd-chg ${c.active === 'd:' + f.path ? 'sel' : ''}" data-cd="diff" data-cv="${esc(f.path)}" title="${esc(f.path)} — ${s[2]}">${fileIc(nm)}<span class="cd-nm" style="color:${s[1]}">${esc(nm)}</span>${dir ? `<small>${esc(dir)}</small>` : ''}<span class="grow"></span>${f.add ? `<span class="cd-add">+${f.add}</span>` : ''}${f.del ? `<span class="cd-del">−${f.del}</span>` : ''}<b class="cd-st" style="color:${s[1]}">${s[0]}</b></button>`; }).join('');
  const refresh = `<button class="cd-ib" data-cd="refresh" title="Atualizar" aria-label="Atualizar">${ic('refresh', 14)}</button>`;
  return `<div class="cd-sidehead">EXPLORADOR</div>
    ${sec('chg', 'ALTERAÇÕES', c.st && c.st.repo ? files.length : null, chgBody, refresh)}
    ${sec('files', esc(p.name).toUpperCase(), null, c.treeErr ? `<div class="cd-note">${esc(c.treeErr)}</div>` : codeTreeHTML(p, c, '', 0))}`;
}
function codeTabsHTML(c) {
  if (!c.tabs.length) return '';
  return c.tabs.map((t) => `<div class="cd-tab ${c.active === t.key ? 'on' : ''}" data-cd="tab" data-cv="${esc(t.key)}" title="${esc(t.rel)}">${fileIc(codeBase(t.rel))}<span class="cd-nm">${esc(codeBase(t.rel))}</span>${t.kind === 'diff' ? '<em class="cd-tag">diff</em>' : ''}<button class="cd-x" data-cd="close" data-cv="${esc(t.key)}" aria-label="Fechar">${ic('x', 12)}</button></div>`).join('');
}
function codeDiffHTML(text, truncated) {
  if (!text.trim()) return '<div class="cd-empty"><div>Sem diferenças neste arquivo.</div></div>';
  const rows = [];
  let a = 0, b = 0, hunks = 0;
  for (const ln of text.split('\n')) {
    if (/^(diff --git|index |--- |\+\+\+ |new file|deleted file|old mode|new mode|similarity|rename )/.test(ln)) continue;
    const h = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)$/.exec(ln);
    if (h) { a = +h[1]; b = +h[2]; hunks++; rows.push(`<div class="cd-ln hunk"><span class="g"></span><span class="g"></span><span class="t">@@ ${esc(h[3].trim() || `linha ${b}`)}</span></div>`); continue; }
    if (!hunks) continue;
    if (ln.startsWith('\\')) continue;
    const k = ln[0], body = esc(ln.slice(1));
    if (k === '+') rows.push(`<div class="cd-ln add"><span class="g"></span><span class="g">${b++}</span><span class="t"><i>+</i>${body}</span></div>`);
    else if (k === '-') rows.push(`<div class="cd-ln del"><span class="g">${a++}</span><span class="g"></span><span class="t"><i>−</i>${body}</span></div>`);
    else if (ln !== '') rows.push(`<div class="cd-ln"><span class="g">${a++}</span><span class="g">${b++}</span><span class="t"><i></i>${body}</span></div>`);
  }
  return `<div class="cd-code">${rows.join('')}${truncated ? '<div class="cd-note">Arquivo muito grande: mostrando só o começo.</div>' : ''}</div>`;
}
function codeFileHTML(t) {
  const d = t.data;
  if (d.binary) return `<div class="cd-empty"><div>Arquivo binário (${(d.size / 1024).toFixed(0)} KB). Não dá para mostrar como texto.</div></div>`;
  const lines = d.text.split('\n');
  const cap = 6000, ext = codeExt(codeBase(t.rel));
  const shown = lines.slice(0, cap), w = String(shown.length).length;
  return `<div class="cd-code">${shown.map((l, i) => `<div class="cd-ln"><span class="g" style="min-width:${w + 2}ch">${i + 1}</span><span class="t">${codeHL(l, ext) || ' '}</span></div>`).join('')}${lines.length > cap || d.truncated ? '<div class="cd-note">Arquivo grande: mostrando só o começo.</div>' : ''}</div>`;
}
function codeMainHTML(c) {
  const t = c.tabs.find((x) => x.key === c.active);
  if (!t) return `<div class="cd-empty"><div class="cd-big">${ic('scode', 46)}</div><div>Escolha um arquivo no explorador ou uma mudança em Alterações.</div><small>Somente leitura: quem escreve nos arquivos é o Claude.</small></div>`;
  if (!t.data) return '<div class="cd-empty"><div>Carregando…</div></div>';
  if (!t.data.ok) return `<div class="cd-empty"><div>${esc(t.data.error || 'Não foi possível abrir.')}</div></div>`;
  const crumb = t.rel.split('/').map(esc).join(' <span class="cd-sep">›</span> ');
  const f = t.kind === 'diff' && codeStateCur().st && codeStateCur().st.files.find((x) => x.path === t.rel);
  const info = f ? `<span class="grow"></span>${f.add ? `<span class="cd-add">+${f.add}</span>` : ''}${f.del ? `<span class="cd-del">−${f.del}</span>` : ''}<button class="btn sm" data-cd="open-file" data-cv="${esc(t.rel)}">Abrir arquivo</button>` : '';
  const body = t.data.binary && t.kind === 'diff' ? '<div class="cd-empty"><div>Arquivo binário: sem diff de texto.</div></div>' : t.kind === 'diff' ? codeDiffHTML(t.data.text || '', t.data.truncated) : codeFileHTML(t);
  return `<div class="cd-crumb">${crumb}${info}</div><div class="cd-scroll" id="cdscroll">${body}</div>`;
}
const codeStateCur = () => codeState(curProject());
function codeStatusHTML(p, c) {
  const st = c.st, hasTab = !!curTab(p) && p.kind !== 'workflow';
  return `<span>${ic('branch', 13)} ${st && st.repo ? esc(st.branch || 'sem branch') : 'sem git'}</span>${st && st.repo ? `<span>${st.files.length} ${st.files.length === 1 ? 'alteração' : 'alterações'}</span>` : ''}<span class="grow"></span><span>Somente leitura</span>${hasTab ? `<button class="cd-tb ${c.term !== false ? 'on' : ''}" data-cd="term" title="Mostrar ou esconder os terminais deste projeto">${ic('sterm', 14)} Terminal</button>` : ''}`;
}

// ---------- tela ----------
function codeHTML() {
  const p = curProject(), c = codeState(p);
  if (!c.tree[''] && !c.treeErr) codeLoadTree(p, '');
  if (!c.st && !c.stLoading) codeLoadStatus(p);
  return `<div class="cd" id="cd">
    <div class="cd-side" id="cdside">${codeSideHTML(p, c)}</div>
    <div class="cd-editor"><div class="cd-tabs" id="cdtabs">${codeTabsHTML(c)}</div><div class="cd-main" id="cdmain">${codeMainHTML(c)}</div></div>
    <div class="cd-status" id="cdstatus">${codeStatusHTML(p, c)}</div><div class="cd-rs" data-cdrs title="Arraste para mudar a altura do terminal"></div></div>`;
}
// refaz só um pedaço (ou tudo) sem perder a rolagem
function codeRepaint(part) {
  const p = curProject();
  if (!p || UI.cur.page !== 'Código' || mode() !== 'page' || !$('#cd')) return;
  const c = codeState(p);
  const keep = (id, fn) => { const el = $(id); if (!el) return; const sc = el.querySelector('#cdscroll'), top = el.scrollTop, st2 = sc ? sc.scrollTop : 0; fn(el); const sc2 = el.querySelector('#cdscroll'); el.scrollTop = top; if (sc2) sc2.scrollTop = st2; };
  if (!part || part === 'side') keep('#cdside', (el) => { el.innerHTML = codeSideHTML(p, c); });
  if (!part || part === 'tabs') { const el = $('#cdtabs'); if (el) el.innerHTML = codeTabsHTML(c); }
  if (!part || part === 'main') keep('#cdmain', (el) => { el.innerHTML = codeMainHTML(c); });
  if (!part) { const el = $('#cdstatus'); if (el) el.innerHTML = codeStatusHTML(p, c); }
}
function codeOpen(p, kind, rel) {
  const c = codeState(p), key = (kind === 'diff' ? 'd:' : 'f:') + rel;
  let t = c.tabs.find((x) => x.key === key);
  if (!t) { t = { key, kind, rel, data: null, loaded: false }; c.tabs.push(t); }
  c.active = key;
  codeLoadTab(p, t, false);
  codeRepaint();
}
function codeClose(p, key) {
  const c = codeState(p), i = c.tabs.findIndex((t) => t.key === key);
  if (i < 0) return;
  c.tabs.splice(i, 1);
  if (c.active === key) c.active = c.tabs.length ? c.tabs[Math.min(i, c.tabs.length - 1)].key : null;
  codeRepaint();
}
function codeAct(a, v) {
  const p = curProject(); if (!p) return;
  const c = codeState(p);
  if (a === 'dir') { c.exp[v] = !c.exp[v]; if (c.exp[v] && !c.tree[v]) codeLoadTree(p, v); codeRepaint('side'); }
  else if (a === 'file') codeOpen(p, 'file', v);
  else if (a === 'open-file') codeOpen(p, 'file', v);
  else if (a === 'diff') codeOpen(p, 'diff', v);
  else if (a === 'tab') { c.active = v; codeRepaint(); const t = c.tabs.find((x) => x.key === v); if (t && !t.loaded) codeLoadTab(p, t, false); }
  else if (a === 'close') codeClose(p, v);
  else if (a === 'term') { c.term = c.term === false; renderAll(); }
  else if (a === 'sec') { c.sec[v] = !c.sec[v]; codeRepaint('side'); }
  else if (a === 'refresh') { c.tree = {}; codeLoadTree(p, ''); Object.keys(c.exp).filter((k) => k && c.exp[k]).forEach((k) => codeLoadTree(p, k)); codeLoadStatus(p); }
}
// atualiza as mudanças enquanto a tela está aberta (só consulta o git; sem observador de arquivos)
setInterval(() => {
  const p = curProject();
  if (p && UI.cur.page === 'Código' && mode() === 'page' && document.hasFocus()) codeLoadStatus(p);
}, 4000);

// arrastar a divisória entre o editor e o terminal muda a altura do painel de terminais
document.addEventListener('mousedown', (e) => {
  const tr = e.target.id === 'tabsRow' && document.body.classList.contains('codedock') && e.clientY - e.target.getBoundingClientRect().top < 9; // faixa no topo das abas do terminal
  const h = tr || (e.target.closest && e.target.closest('[data-cdrs]'));
  if (!h) return;
  e.preventDefault();
  const root = document.documentElement, startY = e.clientY, start = parseInt(getComputedStyle(root).getPropertyValue('--cdh'), 10) || 320;
  const max = () => Math.max(160, $('#stage').clientHeight - 200);
  const mv = (ev) => { root.style.setProperty('--cdh', Math.min(max(), Math.max(120, start - (ev.clientY - startY))) + 'px'); };
  const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); document.body.classList.remove('cdresizing'); fitActive(); };
  document.body.classList.add('cdresizing');
  document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
});
