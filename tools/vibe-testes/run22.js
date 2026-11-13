// DEV2-017 — teste SEM TOKENS do Vibe de tarefa no app (CDP), com o Claude Code FALSO da DEV2-007 (fake\claude.cmd no PATH).
// Instância isolada: --user-data-dir temporário, CLAUDE_CONFIG_DIR vazio, remoto bare local (nada de projeto real).
// Projeto de brinquedo em andamento com o fluxo (papel DEV2). Escolha inicial, formulário da tarefa com o resumo, tarefa 1
// até o fim (com o fim de ciclo do DEV2), tarefa 2 reaproveitando as abas com /clear e o painel com o histórico.
// Uso: node run17.js <raiz do Termix>
const { ROOT: ROOT_PADRAO, WORK } = require('./lib'); // raiz do repositório e pasta temporária do sistema
const fs = require('fs'), path = require('path'); const { spawn, execFileSync } = require('child_process');
const ROOT = (process.argv[2] || ROOT_PADRAO);
const S = path.join(WORK, 'r22'), UD = path.join(S, 'ud'), CFGD = path.join(S, 'claude-cfg'), PORT = 9390;
const FAKE = path.join(WORK, 'fake'), FCFG = path.join(S, 'fake-cfg.json'), FLOG = FCFG + '.log';
const SHOTS = path.join(WORK, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const T0 = Date.now(); const LOGF = path.join(WORK, 'run22.log'); fs.writeFileSync(LOGF, '');
const log = (...a) => { const l = `[${((Date.now() - T0) / 1000).toFixed(0)}s] ${a.join(' ')}`; console.log(l); fs.appendFileSync(LOGF, l + '\n'); };
let ok = 0, bad = 0; const check = (n, c, extra = '') => { if (c) ok++; else bad++; log(`${c ? 'OK  ' : 'FALHOU'} ${n}${extra ? ' — ' + extra : ''}`); };
const g = (dir, ...a) => { try { return execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); } catch (e) { return `ERRO ${String(e.stderr || e.message).split('\n')[0]}`; } };
const W = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); };
const R = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '');

fs.rmSync(S, { recursive: true, force: true });
const ID = 'p17', PJ = path.join(S, 'loja'), REM = path.join(S, 'loja.git'), VD = path.join(UD, 'vibe', ID);
execFileSync('git', ['init', '-q', '--bare', '-b', 'main', REM]);
g(REM, 'config', 'receive.denyNonFastForwards', 'true'); g(REM, 'config', 'receive.denyDeletes', 'true');
execFileSync('git', ['clone', '-q', REM, PJ], { stdio: 'ignore' });
g(PJ, 'config', 'user.name', 'Teste'); g(PJ, 'config', 'user.email', 't@exemplo.invalid'); g(PJ, 'switch', '-qc', 'main');
W(path.join(PJ, 'README.md'), '# Loja de brinquedo\n\nCatálogo simples.\n');
W(path.join(PJ, 'CLAUDE.md'), '# Loja\n\n- Validar: node --check app.js\n');
W(path.join(PJ, 'docs/TASKS.md'), '# Tarefas\n\n## Em andamento\n\n### TASK-007 — Carrinho\n- Status: EM ANDAMENTO\n\n## Prontas\n');
W(path.join(PJ, '.claude', 'fluxo.json'), JSON.stringify({ validacao: ['node --check app.js'] })); W(path.join(PJ, '.gitignore'), 'CLAUDE.local.md\n');
W(path.join(PJ, 'app.js'), 'console.log(1)\n');
g(PJ, 'add', '-A'); g(PJ, 'commit', '-qm', 'inicio da loja'); g(PJ, 'push', '-q', 'origin', 'main');
W(path.join(PJ, 'CLAUDE.local.md'), 'papel: "DEV2"\nbranch_padrao: "dev2"\n'); g(PJ, 'push', '-q', 'origin', 'main:dev1'); g(PJ, 'switch', '-qc', 'dev2');
W(path.join(PJ, 'app.js'), 'console.log(2)\n'); g(PJ, 'commit', '-qam', 'TASK-007: carrinho (parcial)'); g(PJ, 'push', '-q', '-u', 'origin', 'dev2');
const main0 = g(REM, 'rev-parse', 'main');
W(path.join(UD, 'state.json'), JSON.stringify({ projects: [{ id: ID, name: 'Loja', path: PJ, imported: true, archived: false, tabs: [], activeTab: null, g: 0, open: true }], lastSeenVersion: require(path.join(ROOT, 'package.json')).version, settings: { vibe: { on: false, last: ID }, organizador: { on: false } } }, null, 2));
W(path.join(CFGD, '.claude.json'), JSON.stringify({ projects: {} }));
W(FCFG, JSON.stringify({ demora: 1200, plano: 'Branch de trabalho: dev2\n\n## T1 — Botão remover\nObjetivo: remover item.\nCritério de pronto: commit.\n\n## T2 — [SEM COMMIT] Validação\nObjetivo: validar.\n', 'dev:T2': ['valida', 'valida'] }, null, 2));
const flog = () => R(FLOG);

(async () => {
  const env = { ...process.env, PATH: `${FAKE};${process.env.PATH}`, FAKE_CFG: FCFG, TERMIX_VIBE_TEST: '1', TERMIX_VIBE_NO_OPEN: '1', CLAUDE_CONFIG_DIR: CFGD, TERMIX_VIBE_CLAUDE_JSON: path.join(CFGD, '.claude.json') };
  const el = spawn(path.join(ROOT, 'node_modules', 'electron', 'dist', 'electron.exe'), [ROOT, `--user-data-dir=${UD}`, `--remote-debugging-port=${PORT}`], { env, stdio: 'ignore' });
  let t = null; for (let i = 0; i < 40 && !t; i++) { await wait(500); try { t = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((x) => x.url.endsWith('renderer/index.html')); } catch {} }
  const ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const P = {}; ws.onmessage = (e) => { const m = JSON.parse(e.data); if (P[m.id]) { P[m.id](m); delete P[m.id]; } };
  await new Promise((r) => (ws.onopen = r));
  const send = (method, params) => new Promise((r) => { const i = ++id; P[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); const errs = []; ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.method === 'Runtime.exceptionThrown' || (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')) errs.push(JSON.stringify(m.params).slice(0, 300)); });
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  const ev = async (x) => { const m = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (m.result && m.result.exceptionDetails) log('EXC', JSON.stringify(m.result.exceptionDetails).slice(0, 300)); return m.result && m.result.result && m.result.result.value; };
  const shot = async (n, sel) => {
    let clip = null;
    if (sel) { clip = await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;e.scrollIntoView({block:'start'});const r=e.getBoundingClientRect();return {x:Math.max(0,r.x-8),y:Math.max(0,r.y-8),width:Math.min(r.width+16,1280),height:Math.min(r.height+16,900-Math.max(0,r.y-8)),scale:1}})()`); await wait(250); }
    const m = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip } : {}) });
    fs.writeFileSync(path.join(SHOTS, `${n}.png`), Buffer.from(m.result.data, 'base64')); log('captura', n);
  };
  const cy = async () => JSON.parse((await ev(`JSON.stringify(vibeTest.cycle(${JSON.stringify(ID)}))`)) || 'null');
  const st = async () => JSON.parse((await ev('JSON.stringify(vibeTest.state())')) || 'null');
  const until = async (nome, fn, ms = 90000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await wait(600); } log(`TEMPO ESGOTADO esperando: ${nome}`); return null; };
  const fase = (f, ms) => until(`fase ${f}`, async () => { const c = await cy(); return c && c.est && c.est.fase === f ? c : null; }, ms);
  const modalTxt = () => ev('(document.querySelector(".vibe-form")||{}).innerText||""');
  const botao = (sel) => ev(`(()=>{const b=document.querySelector(${JSON.stringify(sel)});return b?{vis:b.style.display!=='none'&&!!b.offsetParent,dis:b.disabled,txt:b.textContent}:null})()`);
  const abas = () => ev(`JSON.stringify(S.projects.find(p=>p.id===${JSON.stringify(ID)}).tabs.map(t=>({id:t.id,name:t.name})))`).then((x) => JSON.parse(x || '[]'));
  const avisos = async () => JSON.parse((await ev('JSON.stringify((UI.events||[]).filter(e=>/Vibe Coding/.test(e.who||"")).map(e=>e.msg))')) || '[]');

  await wait(3000);
  const txt = (sel) => ev(`(document.querySelector(${JSON.stringify(sel)})||{}).innerText||""`);
  const go = async (cur) => { await ev(`(UI.cur=${JSON.stringify(cur)},renderAll(),1)`); await wait(900); };
  await wait(3000);
  check('modo de teste ativo (vibeTest)', await ev('!!window.vibeTest'));

  /* 3a/3b (DEV2-024): sem chaves em Configurações e sem o botão separado do Organizador (ver run24.js) */
  await go({ p: '_', page: 'Configurações' });
  check('3a sem chaves experimentais em Configurações', !(await ev('!!document.querySelector("#vibeConf,#orgConf,[data-vibe-set],[data-org-set]")')) && !(await ev('[...document.querySelectorAll("#page h5")].some(h=>/Experimental/.test(h.textContent))')));
  await ev('(document.querySelector("[data-newk=chat]").click(),1)'); await wait(1000);
  check('3b "Novo Projeto" sem o botão "Importar projeto (várias pastas)"', (await ev('(document.querySelector(".npage h2")||{}).textContent')) === 'Novo Projeto' && !(await ev('!!document.querySelector("[data-org-open]")')));
  await ev('(document.querySelector("[data-newk=workflow]").click(),1)'); await wait(1000);
  check('3b "Novo Mutirão" abre, sem o botão do Organizador', (await ev('(document.querySelector(".npage h2")||{}).textContent')) === 'Novo Mutirão' && !(await ev('!!document.querySelector("[data-org-open]")')));

  /* 3c: botão Vibe Coding — escolha inicial e formulário da tarefa */
  await go({ p: ID, page: 'Terminais' });
  const bt = await ev('JSON.stringify([...document.querySelectorAll("#fpill [data-vibe-open]")].map(b=>b.textContent.trim()))');
  check('3c só o botão Vibe Coding no cabeçalho (o Mutirão saiu na DEV2-023)', bt === JSON.stringify(['Vibe Coding']), bt);
  await ev('(document.querySelector("[data-vibe-open=vibe]").click(),1)'); await wait(1200);
  let tx = await modalTxt();
  check('3c escolha inicial: as duas opções', /Projeto novo \(entrega completa\)/.test(tx) && /Tarefa num projeto em andamento/.test(tx));
  await shot('d22-vibe-escolha', '.dlg');
  await ev('vibeTest.modo("tarefa")');
  const s = await until('resumo do projeto', async () => { const x = await st(); return x && x.res ? x : null; }, 15000);
  await ev('(document.querySelector(".vt-res")&&(document.querySelector(".vt-res").open=true),1)'); tx = await modalTxt();
  check('3c formulário da tarefa: 4 campos, resumo (dev2, DEV2, TASK-007), "Iniciar tarefa" desabilitado', /2\. O que fazer/.test(tx) && /3\. Critério de pronto/.test(tx) && /4\. O que não pode/.test(tx) && /5\. Arquivos ou telas/.test(tx) && s && s.res.branch === 'dev2' && s.res.papel === 'DEV2' && /TASK-007/.test(tx) && (await botao('[data-vgo]')).dis === true);
  await shot('d22-vibe-tarefa', '.dlg');
  await ev('(document.querySelector(".dlg [data-close],.dlg .mclose,.dlg .x")||{click(){}}).click(),1'); await ev('(document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true})),1)'); await wait(500);

  /* 3d: painel do Mutirão do módulo */
  await go({ p: ID, page: 'Terminais' });
  await ev('(window.TermixMut.open(' + JSON.stringify(ID) + '),1)'); await wait(1500);
  const mp = await txt('.mutp');
  log('3d painel:', mp.slice(0, 300).replace(/\n/g, ' | '));
  check('3d painel do Mutirão abre ao lado do terminal, com o projeto', !!mp && /Mutirão/.test(mp) && (await ev('document.getElementById("col").classList.contains("mut-open")')));
  await shot('d22-mutirao', '.mutp');
  await ev('(document.querySelector(".mutp [data-mp=close]").click(),1)'); await wait(400);
  check('3d painel fecha', !(await ev('!!document.querySelector(".mutp")')));
  await shot('d22-app', null);

  check('sem erros de JavaScript na página', errs.length === 0, errs.slice(0, 3).join(' || ').slice(0, 400));
  log(`${ok} OK, ${bad} FALHOU`);
  try { el.kill(); } catch {}
  process.exit(bad ? 1 : 0);
})().catch((e) => { log('ERRO', e.stack); process.exit(2); });
