// DEV2-027: (A) Delegar estacionado no app normal; (B) modo --embed com Edge headless, por CDP, só o conteúdo.
const { ROOT: ROOT_PADRAO, WORK } = require('./lib'); // raiz do repositório e pasta temporária do sistema
const fs = require('fs'), path = require('path'); const { spawn, execFileSync } = require('child_process');
const ROOT = (process.argv[2] || ROOT_PADRAO); const S = path.join(WORK, 'c27'); fs.rmSync(S, { recursive: true, force: true }); fs.mkdirSync(S, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms)); let ok = 0, bad = 0;
const check = (n, c, x = '') => { c ? ok++ : bad++; console.log(`${c ? 'OK  ' : 'FALHOU'} ${n}${x ? ' — ' + x : ''}`); };
async function cdp(port, filter) {
  let t;
  for (let i = 0; i < 60; i++) { try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); t = l.find((x) => x.type === 'page' && (!filter || filter(x))); if (t) break; } catch { /* espera */ } await wait(500); }
  const ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const P = {};
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (P[m.id]) { P[m.id](m); delete P[m.id]; } };
  await new Promise((r) => (ws.onopen = r));
  return {
    ev: (expr) => new Promise((r) => { const i = ++id; P[i] = r; ws.send(JSON.stringify({ id: i, method: 'Runtime.evaluate', params: { expression: expr, awaitPromise: true, returnByValue: true } })); }).then((m) => m.result && m.result.result && m.result.result.value),
    close: () => ws.close(),
  };
}
const proj = path.join(S, 'brinq'); fs.mkdirSync(proj, { recursive: true });
const g = (...a) => execFileSync('git', ['-C', proj, ...a], { stdio: 'ignore' });
g('init', '-q', '-b', 'main'); g('config', 'user.name', 't'); g('config', 'user.email', 't@t'); fs.writeFileSync(path.join(proj, 'README.md'), '# brinquedo\n'); g('add', '-A'); g('commit', '-qm', 'i');
const state = (ud) => { fs.mkdirSync(ud, { recursive: true }); fs.writeFileSync(path.join(ud, 'state.json'), JSON.stringify({ projects: [{ id: 'p1', name: 'Brinq', path: proj, imported: true, archived: false, tabs: [], activeTab: null, g: 0, open: true }], lastSeenVersion: require(path.join(ROOT, 'package.json')).version, settings: {} })); };
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((x) => fs.existsSync(x));
if (!EDGE) { console.log('Sem Edge/Chrome para a parte --embed'); process.exit(1); }
const EL = path.join(ROOT, 'node_modules', 'electron', 'dist', 'electron.exe');
const kill = (p) => { try { execFileSync('taskkill', ['/F', '/PID', String(p.pid), '/T'], { stdio: 'ignore' }); } catch { /* nada */ } };
(async () => {
  // A) app normal (sem o modo de teste do Delegar)
  const ud = path.join(S, 'udA'); state(ud);
  const el = spawn(EL, [ROOT, `--user-data-dir=${ud}`, '--remote-debugging-port=9411'], { env: { ...process.env, TERMIX_VIBE_NO_OPEN: '1' }, stdio: 'ignore' });
  const c = await cdp(9411, (x) => x.url.includes("index.html")); await wait(14000);
  const top = await c.ev(`(() => { const b = document.querySelector('#topbar .vibebtns'); return JSON.stringify({ vibe: !!document.querySelector('[data-vibe-open]'), deleg: !!document.querySelector('[data-deleg-open],[data-deleg-part]'), btns: b ? b.innerText : null }); })()`);
  console.log('topbar', top); const T = JSON.parse(top);
  check('A: Vibe Coding aparece no cabeçalho', T.vibe); check('A: botão Delegar NÃO aparece', !T.deleg);
  await c.ev(`(() => { const b = [...document.querySelectorAll('button,a,div')].find((e) => /^Configura/.test((e.textContent || '').trim()) && e.children.length < 3); b && b.click(); })()`); await wait(1500);
  const conf = await c.ev(`JSON.stringify({ page: (document.getElementById('page') || {}).innerText || '', conf: !!document.getElementById('delegConf') })`); const C = JSON.parse(conf);
  check('A: Configurações abriu', /Clear|Notifica|Configura/i.test(C.page), C.page.slice(0, 40).replace(/\n/g, ' '));
  check('A: sem "Conta neste PC"', !/Conta neste PC/.test(C.page) && !C.conf);
  check('A: nenhum nome mock visível', !(await c.ev(`/Zanata|Glayon|Gilbram/.test(document.body.innerText)`)));
  const aberto = await c.ev(`(window.TermixDelegar && window.TermixDelegar.open('p1'), !!document.querySelector('.mutp'))`); check('A: TermixDelegar.open não abre painel', !aberto);
  const v = await c.ev(`window.TermixDelegar.vigia()`); check('A: vigia não roda (0)', v === 0);
  c.close(); kill(el); await wait(1500);
  // B) --embed
  const udB = path.join(S, 'udB'); state(udB); const ready = path.join(S, 'ready.json');
  const eb = spawn(EL, [ROOT, `--user-data-dir=${udB}`, '--embed=9421'], { env: { ...process.env, HUB_TOKEN: 'aabbccddeeff00112233445566778899', HUB_READY_FILE: ready, TERMIX_VIBE_NO_OPEN: '1', TERMIX_VIBE_TEST: '1' }, stdio: 'ignore' });
  for (let i = 0; i < 60 && !fs.existsSync(ready); i++) await wait(500); check('B: --embed subiu (ready)', fs.existsSync(ready));
  const edge = spawn(EDGE, ['--headless=new', '--remote-debugging-port=9431', `--user-data-dir=${path.join(S, 'edge')}`, '--window-size=1280,800', '--no-first-run', 'http://127.0.0.1:9421/?t=aabbccddeeff00112233445566778899'], { stdio: 'ignore' });
  const d = await cdp(9431, (x) => /9421/.test(x.url)); await wait(12000);
  const emb = await d.ev(`(() => { const q = (s) => document.querySelector(s); const vis = (e) => !!e && e.offsetParent !== null && getComputedStyle(e).display !== 'none'; return JSON.stringify({ embed: document.documentElement.classList.contains('embed'), termix: typeof window.termix, topbarVis: vis(q('#topbar')), vibeBtnExiste: !!q('[data-vibe-open]'), vibeBtnVisivel: vis(q('[data-vibe-open]')), delegBtn: !!q('[data-deleg-open]'), mut: typeof window.TermixMut, ret: typeof window.TermixRet, org: typeof window.TermixOrg, sidebar: vis(q('.side')) }); })()`);
  console.log('embed', emb); const E = JSON.parse(emb);
  check('B: classe embed aplicada', E.embed); check('B: window.termix ligado (WebSocket)', E.termix === 'object');
  check('B: módulo carregou (TermixMut/Ret/Org)', E.mut === 'object' && E.ret === 'object' && E.org === 'object');
  check('B: sem botão Delegar no embed', !E.delegBtn);
  console.log('INFO cabeçalho visível:', E.topbarVis, '| botão Vibe existe:', E.vibeBtnExiste, 'visível:', E.vibeBtnVisivel);
  const st = await d.ev(`window.termix.vibe('status').then((s) => JSON.stringify(s))`); check('B: canal vibe responde pelo WebSocket', /"test"/.test(st || ''), String(st).slice(0, 60));
  const pop = await d.ev(`(async () => { try { await window.TermixRet.abrirPopup('p1'); } catch (e) { return 'erro ' + e.message; } await new Promise((r) => setTimeout(r, 1500)); return (document.body.innerText.match(/Retomar projeto|Inicializar orquestrador/g) || []).join('|'); })()`); console.log('popup', pop);
  check('B: pop-up Retomar aparece', /Retomar projeto|Inicializar/.test(String(pop)));
  await d.ev(`document.querySelectorAll('button').forEach((b) => /Agora não/.test(b.textContent) && b.click())`);
  const mp = await d.ev(`(async () => { window.TermixMut.open('p1'); await new Promise((r) => setTimeout(r, 1500)); return document.querySelector('.mutp') ? document.querySelector('.mutp').innerText.slice(0, 80) : 'sem painel'; })()`); console.log('mutirao', mp);
  check('B: painel do Mutirão abre', /Mutir/.test(String(mp)), String(mp).replace(/\n/g, ' '));
  const vb = await d.ev(`(async () => { const b = document.querySelector('[data-vibe-open]'); if (b) { b.click(); await new Promise((r) => setTimeout(r, 1200)); } return JSON.stringify({ clicou: !!b, modal: /Projeto novo|Tarefa num projeto/.test(document.body.innerText) }); })()`); console.log('vibe', vb);
  d.close(); kill(edge); kill(eb);
  console.log(`${ok} OK, ${bad} FALHOU`); process.exit(0);
})().catch((e) => { console.log('ERRO', e); process.exit(1); });
