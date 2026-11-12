// DEV2-017 — teste SEM TOKENS do Vibe de tarefa no app (CDP), com o Claude Code FALSO da DEV2-007 (fake\claude.cmd no PATH).
// Instância isolada: --user-data-dir temporário, CLAUDE_CONFIG_DIR vazio, remoto bare local (nada de projeto real).
// Projeto de brinquedo em andamento com o fluxo (papel DEV2). Escolha inicial, formulário da tarefa com o resumo, tarefa 1
// até o fim (com o fim de ciclo do DEV2), tarefa 2 reaproveitando as abas com /clear e o painel com o histórico.
// Uso: node run17.js <raiz do Termix>
const { ROOT: ROOT_PADRAO, WORK } = require('./lib'); // raiz do repositório e pasta temporária do sistema
const fs = require('fs'), path = require('path'); const { spawn, execFileSync } = require('child_process');
const ROOT = (process.argv[2] || ROOT_PADRAO);
const S = path.join(WORK, 'r17'), UD = path.join(S, 'ud'), CFGD = path.join(S, 'claude-cfg'), PORT = 9383;
const FAKE = path.join(WORK, 'fake'), FCFG = path.join(S, 'fake-cfg.json'), FLOG = FCFG + '.log';
const SHOTS = path.join(WORK, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const T0 = Date.now(); const LOGF = path.join(WORK, 'run17.log'); fs.writeFileSync(LOGF, '');
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
W(path.join(UD, 'state.json'), JSON.stringify({ projects: [{ id: ID, name: 'Loja', path: PJ, imported: true, archived: false, tabs: [], activeTab: null, g: 0, open: true }], lastSeenVersion: require(path.join(ROOT, 'package.json')).version, settings: { organizador: { on: false }, vibe: { on: false, last: ID } } }, null, 2));
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
  check('modo de teste ativo (vibeTest)', await ev('!!window.vibeTest'));
  await ev(`(UI.cur={p:${JSON.stringify(ID)},page:"Terminais"},UI.last=${JSON.stringify(ID)},renderAll(),1)`);
  await ev('(vibeTest.open(), 1)'); await wait(1200);

  /* A1: escolha inicial */
  let tx = await modalTxt();
  const go0 = await botao('[data-vgo]'), tpl0 = await botao('[data-vtpl]');
  check('A1 escolha inicial: as duas opções e nada de formulário', /Projeto novo \(entrega completa\)/.test(tx) && /Tarefa num projeto em andamento/.test(tx) && !(await ev('!!document.querySelector("#vfObj")')) && !(await ev('!!document.querySelector("#vtOq")')), tx.slice(0, 200));
  check('A1 escolha inicial: sem "Iniciar" e sem "Baixar modelo" no rodapé', go0 && !go0.vis && tpl0 && !tpl0.vis, JSON.stringify({ go0, tpl0 }));
  await shot('d17-escolha', '.dlg');
  // "Projeto novo" abre o formulário completo de sempre; "Trocar o tipo" volta à escolha
  await ev('vibeTest.modo("projeto")'); await wait(500);
  const goP = await botao('[data-vgo]'), tplP = await botao('[data-vtpl]');
  check('A1 "Projeto novo": o formulário completo (fluxo, estrutura, acessos) e o "Baixar modelo"', (await ev('!!document.querySelector("#vfObj")&&!!document.querySelector("[data-vpick=fluxo]")&&!!document.querySelector("#vfAcc")')) && tplP && tplP.vis && goP && goP.vis && /Iniciar Vibe Coding/.test(goP.txt));
  await ev('(document.querySelector(".vibe-form [data-vmodo]").click(),1)'); await wait(400);
  check('A1 "Trocar o tipo" volta à escolha inicial', /Tarefa num projeto em andamento/.test(await modalTxt()) && (await st()).modo === '');

  /* A2: formulário da tarefa com o resumo do projeto */
  await ev('vibeTest.modo("tarefa")');
  await until('resumo do projeto', async () => { const s = await st(); return s && s.res ? s : null; }, 15000);
  let s = await st();
  check('A2 resumo do projeto (sem IA): branch dev2, papel DEV2, últimos commits, README/CLAUDE.md/TASKS', s.res && s.res.branch === 'dev2' && s.res.papel === 'DEV2' && /TASK-007/.test(s.res.commits[0]) && s.res.readme && s.res.claude && s.res.andamento, JSON.stringify(s.res && { b: s.res.branch, p: s.res.papel }));
  check('A2 falta: o que fazer e critério de pronto; "Iniciar tarefa" desabilitado', s.missing.some((m) => /o que fazer/.test(m)) && s.missing.some((m) => /critério/.test(m)) && (await botao('[data-vgo]')).dis === true && /Iniciar tarefa/.test((await botao('[data-vgo]')).txt));
  await ev('(document.querySelector(".vt-res").open=true,1)');
  tx = await modalTxt();
  check('A2 formulário: 4 campos da tarefa e o resumo à vista', /2\. O que fazer/.test(tx) && /3\. Critério de pronto/.test(tx) && /4\. O que não pode/.test(tx) && /5\. Arquivos ou telas envolvidos/.test(tx) && /os agentes trabalham na dev2/.test(tx) && /TASK-007/.test(tx));
  await ev('vibeTest.tarefa({ oQue: "Botão remover item do carrinho", criterio: "Clicar em remover tira o item", naoPode: "Não mexer no catálogo", arquivos: "app.js" })'); await wait(400);
  check('A2 tudo preenchido: "Iniciar tarefa" habilitado', (await botao('[data-vgo]')).dis === false && /Tudo pronto/.test(await modalTxt()));
  await shot('d17-form-tarefa', '.dlg');

  /* tarefa 1: plano -> Antes de iniciar -> execução -> fim do ciclo do DEV2 */
  await ev('vibeTest.start()');
  let c = await fase('pronto', 60000);
  const ent = JSON.parse(R(path.join(VD, 'entrega.json')) || '{}');
  check('A2 entrega sintética gravada (modo tarefa, n=1) e o plano pedido pelo pedido da tarefa', ent.modo === 'tarefa' && ent.tarefa && ent.tarefa.n === 1 && /Vibe de tarefa/.test(R(path.join(VD, 'pedidos', 'pedido-plano.md'))) && /POUCAS tarefas/.test(R(path.join(VD, 'pedidos', 'pedido-plano.md'))));
  const ab1 = await abas();
  check('tarefa 1: as duas abas do Vibe criadas', ab1.length === 2 && ab1.some((a) => a.name === 'Vibe · Orquestrador') && ab1.some((a) => a.name === 'Vibe · Dev') && c.est.orq && c.est.dev, JSON.stringify(ab1));
  const orq1 = c.est.orq, dev1 = c.est.dev;
  check('painel: plano pronto com 2 tarefas e o "Executar plano…" (Antes de iniciar)', c.tarefas === 2 && !!(await ev('!!document.querySelector("[data-vc=antes]")')));
  await ev('(document.querySelector("[data-vc=antes]").click(),1)'); await wait(600);
  check('A4 "Antes de iniciar" aparece na tarefa (política)', /Iniciar a produção autônoma/.test(await ev('(document.querySelector("#vpForm")||{}).innerText||""')));
  await ev('vibeTest.pol.salvar()');
  c = await fase('concluido', 150000);
  check('tarefa 1 concluída: T1 com commit e T2 validada; fim do ciclo DEV2 (handoff e dev2 enviada)', c && c.est.exec.feitas.length === 2 && c.est.exec.fimHandoff && c.est.exec.fimHandoff.ok && g(REM, 'rev-parse', 'dev2') === g(PJ, 'rev-parse', 'dev2'), c && JSON.stringify(c.est.exec.fimHandoff));
  check('main do remoto intacta (DEV2 nunca publica)', g(REM, 'rev-parse', 'main') === main0);
  await until('histórico da tarefa 1 concluída', async () => { const x = await st(); return x.hist[0] && x.hist[0].status === 'concluida' ? x : null; }, 10000);
  s = await st();
  check('A5 histórico: tarefa 1 concluída com 2 feitas', s.hist.length === 1 && s.hist[0].n === 1 && s.hist[0].status === 'concluida' && s.hist[0].feitas.length === 2);
  check('notificação do fim diz "Tarefa concluída"', (await avisos()).some((m) => /^Tarefa concluída: /.test(m)));
  check('formulário limpo para a próxima tarefa ("Nova tarefa")', s.t.oQue === '' && /Nova tarefa/.test(await modalTxt()));

  /* tarefa 2: as abas são reaproveitadas com /clear; a anterior continua no histórico */
  const clearsAntes = (flog().match(/hook SessionStart clear/g) || []).length;
  await ev('vibeTest.tarefa({ oQue: "Mostrar o total com desconto", criterio: "Total com 10% acima de R$ 100", arquivos: "app.js" })'); await wait(300);
  await ev('vibeTest.start()');
  c = await fase('pronto', 60000);
  const ab2 = await abas();
  check('A5 tarefa 2: as mesmas abas do orquestrador e do Dev (nenhuma aba nova)', ab2.length === 2 && c.est.orq === orq1 && c.est.dev === dev1, JSON.stringify({ ab2, orq: c.est.orq, orq1 }));
  check('A5 tarefa 2: o orquestrador recebeu /clear antes do plano', (flog().match(/hook SessionStart clear/g) || []).length > clearsAntes && /Mostrar o total/.test(R(path.join(VD, 'estrutura.md'))));
  s = await st();
  check('A5 histórico durante a tarefa 2: a 2 em andamento e a 1 concluída', s.hist.length === 2 && s.hist[0].n === 2 && s.hist[0].status === 'andamento' && s.hist[1].status === 'concluida');
  tx = await modalTxt();
  check('A5 painel: "Tarefa atual (2)" e "Tarefas anteriores (1)" com a tarefa 1 CONCLUÍDA', /Tarefa atual \(2\)/.test(tx) && /Tarefas anteriores \(1\)/.test(tx) && /Tarefa 1 — Botão remover item do carrinho CONCLUÍDA/.test(tx), tx.slice(0, 300));
  await ev('vibeTest.exec()');
  c = await fase('concluido', 150000);
  await until('histórico da tarefa 2 concluída', async () => { const x = await st(); return x.hist[0] && x.hist[0].n === 2 && x.hist[0].status === 'concluida' ? x : null; }, 10000);
  s = await st();
  check('A5 duas tarefas seguidas concluídas, nenhuma apagada', s.hist.length === 2 && s.hist.every((h) => h.status === 'concluida'));
  check('a entrega e o ciclo da tarefa 1 ficaram no histórico do módulo', fs.readdirSync(path.join(VD, 'historico')).some((d) => /Botão remover/.test(R(path.join(VD, 'historico', d, 'entrega.json')))) && fs.readdirSync(path.join(VD, 'historico')).some((d) => d.startsWith('ciclo-')));
  await ev('(document.querySelector("#vtHist").scrollIntoView({block:"start"}),1)'); await wait(300);
  await shot('d17-painel-historico', '.dlg');
  check('main do remoto intacta no fim', g(REM, 'rev-parse', 'main') === main0);

  log('erros no console:', errs.length ? errs.join('\n') : 'nenhum');
  check('sem erros no console', !errs.length);
  log(`\n${ok} OK, ${bad} FALHOU`);
  try { await ev('window.close()'); } catch {} await wait(2000); try { el.kill(); } catch {}
  process.exit(bad ? 1 : 0);
})().catch((e) => { log('ERRO', e && e.stack); process.exit(1); });
