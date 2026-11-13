// DEV2-025 — o "Delegar tarefa" no app de verdade (Electron isolado, agente falso, CDP, captura só do conteúdo do app).
// Duas instâncias do Termix = duas "máquinas" (pastas de dados diferentes) ligadas a um remoto bare local:
//   Rodrigo (DEV1, conta Rodrigo) e Ygor (DEV2, conta Ygor). Sem IA real. Uso: node run25.js <raiz do Termix>
const { ROOT: ROOT_PADRAO, WORK } = require('./lib'); // raiz do repositório e pasta temporária do sistema
const fs = require('fs'), path = require('path'); const { spawn, execFileSync } = require('child_process');
const ROOT = (process.argv[2] || ROOT_PADRAO);
const S = path.join(WORK, 'r25'), FAKE = path.join(WORK, 'fake');
const SHOTS = path.join(WORK, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const T0 = Date.now(); const LOGF = path.join(WORK, 'run25.log'); fs.writeFileSync(LOGF, '');
const log = (...a) => { const l = `[${((Date.now() - T0) / 1000).toFixed(0)}s] ${a.join(' ')}`; console.log(l); fs.appendFileSync(LOGF, l + '\n'); };
let ok = 0, bad = 0; const check = (n, c, extra = '') => { if (c) ok++; else bad++; log(`${c ? 'OK  ' : 'FALHOU'} ${n}${extra ? ' — ' + extra : ''}`); };
const g = (dir, ...a) => { try { return execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); } catch (e) { return `ERRO ${String(e.stderr || e.message).split('\n')[0]}`; } };
const W = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); };
const R = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '');
const ID = 'p25', ID2 = 'p25b';

fs.rmSync(S, { recursive: true, force: true });
const REM = path.join(S, 'loja.git'), PR = path.join(S, 'rodrigo', 'loja'), PY = path.join(S, 'ygor', 'loja'), PSF = path.join(S, 'rodrigo', 'avulso');
execFileSync('git', ['init', '-q', '--bare', '-b', 'main', REM]);
const BASE = path.join(S, 'base'); execFileSync('git', ['clone', '-q', REM, BASE], { stdio: 'ignore' });
g(BASE, 'config', 'user.name', 'base'); g(BASE, 'config', 'user.email', 'b@t'); g(BASE, 'switch', '-qc', 'main');
W(path.join(BASE, 'README.md'), '# Loja de brinquedo\n'); W(path.join(BASE, 'app.js'), 'console.log(1)\n'); W(path.join(BASE, 'docs/HANDOFF_DEV2.md'), '# HANDOFF DEV2\n\nvazio\n');
W(path.join(BASE, '.claude/fluxo.json'), JSON.stringify({ versao_fluxo: 1, projeto: 'Loja', devs: ['dev2'], validacao: ['node --check app.js'] }, null, 2) + '\n'); W(path.join(BASE, '.gitignore'), 'CLAUDE.local.md\n');
g(BASE, 'add', '-A'); g(BASE, 'commit', '-qm', 'inicio'); g(BASE, 'push', '-q', 'origin', 'main'); g(BASE, 'push', '-q', 'origin', 'main:dev1'); g(BASE, 'push', '-q', 'origin', 'main:dev2');
const MAIN0 = g(REM, 'rev-parse', 'main');
for (const [d, br, papel, nome] of [[PR, 'dev1', 'DEV1', 'Rodrigo'], [PY, 'dev2', 'DEV2', 'Ygor']]) {
  execFileSync('git', ['clone', '-q', REM, d], { stdio: 'ignore' }); g(d, 'config', 'user.name', nome); g(d, 'config', 'user.email', `${nome}@t`); g(d, 'switch', '-q', br);
  W(path.join(d, 'CLAUDE.local.md'), `usuario:\n  nome: "${nome}"\n\npapel: "${papel}"\nbranch_padrao: "${br}"\n`);
}
fs.mkdirSync(PSF, { recursive: true }); execFileSync('git', ['init', '-q', '-b', 'main', PSF]); g(PSF, 'config', 'user.name', 'R'); g(PSF, 'config', 'user.email', 'r@t'); W(path.join(PSF, 'README.md'), '# avulso\n'); g(PSF, 'add', '-A'); g(PSF, 'commit', '-qm', 'i'); W(path.join(PSF, 'CLAUDE.local.md'), 'papel: "DEV1"\nbranch_padrao: "dev1"\n');
const rem = (...a) => g(REM, ...a);

async function inst(nome, port, pj, outros, fresh = true) {
  const UD = path.join(S, nome, 'ud'), CFGD = path.join(S, nome, 'claude-cfg'), FCFG = path.join(S, nome, 'fake-cfg.json'), FLOG = FCFG + '.log';
  const projects = [{ id: ID, name: 'Loja', path: pj, imported: true, archived: false, tabs: [], activeTab: null, g: 0, open: true }, ...(outros || [])];
  if (fresh) W(path.join(UD, 'state.json'), JSON.stringify({ projects, lastSeenVersion: require(path.join(ROOT, 'package.json')).version, settings: { vibe: { last: ID } } }, null, 2));
  if (fresh) W(path.join(CFGD, '.claude.json'), JSON.stringify({ projects: {} }));
  W(FCFG, JSON.stringify({ demora: 4500 }));
  const env = { ...process.env, PATH: `${FAKE};${process.env.PATH}`, FAKE_CFG: FCFG, TERMIX_VIBE_TEST: '1', TERMIX_DELEGAR_TESTE: '1', TERMIX_VIBE_NO_OPEN: '1', CLAUDE_CONFIG_DIR: CFGD, TERMIX_VIBE_CLAUDE_JSON: path.join(CFGD, '.claude.json') };
  const el = spawn(path.join(ROOT, 'node_modules', 'electron', 'dist', 'electron.exe'), [ROOT, `--user-data-dir=${UD}`, `--remote-debugging-port=${port}`], { env, stdio: 'ignore' });
  let t = null; for (let i = 0; i < 60 && !t; i++) { await wait(500); try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.url.endsWith('renderer/index.html')); } catch {} }
  const ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const P = {}; ws.onmessage = (e) => { const m = JSON.parse(e.data); if (P[m.id]) { P[m.id](m); delete P[m.id]; } };
  await new Promise((r) => (ws.onopen = r));
  const send = (method, params) => new Promise((r) => { const i = ++id; P[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); const errs = []; ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.method === 'Runtime.exceptionThrown' || (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')) errs.push(JSON.stringify(m.params).slice(0, 300)); });
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  const ev = async (x) => { const m = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (m.result && m.result.exceptionDetails) log(`EXC[${nome}]`, JSON.stringify(m.result.exceptionDetails).slice(0, 300)); return m.result && m.result.result && m.result.result.value; };
  const js = async (x) => JSON.parse((await ev(`JSON.stringify(${x})`)) || 'null');
  const shot = async (n, sel) => {
    let clip = null;
    if (sel) { clip = await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;e.scrollIntoView({block:"start"});const r=e.getBoundingClientRect();return {x:Math.max(0,r.x-8),y:Math.max(0,r.y-8),width:Math.min(r.width+16,1280),height:Math.min(r.height+16,900-Math.max(0,r.y-8)),scale:1}})()`); await wait(250); }
    const m = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip } : {}) });
    fs.writeFileSync(path.join(SHOTS, `${n}.png`), Buffer.from(m.result.data, 'base64')); log('captura', n);
  };
  const until = async (n, fn, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await wait(500); } log(`TEMPO ESGOTADO esperando: ${n}`); return null; };
  const click = (sel) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(e){e.click();return true}return false})()`);
  const setv = (sel, v) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return false;e.value=${JSON.stringify(v)};e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
  const txt = (sel) => ev(`(document.querySelector(${JSON.stringify(sel)})||{}).innerText||''`);
  const aba = (p, rx) => js(`S.projects.find(p=>p.id===${JSON.stringify(p)}).tabs.map(t=>t.name)`).then((l) => (l || []).some((n) => rx.test(n)));
  const st = () => js('delegarTest.state()');
  const evts = () => js('UI.events.map(e=>e.msg)');
  return { nome, UD, el, ev, js, shot, until, click, setv, txt, aba, st, evts, errs, flog: () => R(FLOG), kill: () => { try { ws.close(); } catch {} try { el.kill(); } catch {} } };
}

(async () => {
  // uma instância por vez: com duas janelas abertas a de trás não renderiza e a captura trava
  const OUT = [{ id: ID2, name: 'Avulso', path: PSF, imported: true, archived: false, tabs: [], activeTab: null, g: 0, open: true }];
  const ERRS = []; const fim = async (X) => { await wait(1200); ERRS.push(...X.errs); X.kill(); await wait(1500); };
  const pronto = async (X) => check(`${X.nome}: ganchos de teste carregados`, await X.until('gancho', async () => (await X.ev('typeof delegarTest')) === 'object', 30000));
  const abrirProj = async (X) => { await X.ev(`(UI.cur={p:${JSON.stringify(ID)},page:'Terminais'},UI.last=${JSON.stringify(ID)},renderAll(),1)`); await X.until('botão', async () => X.ev('!!document.querySelector("[data-deleg-open]")')); };
  let A = await inst('rodrigo', 9425, PR, OUT); await wait(2500); await pronto(A);
  /* ===== Rodrigo: conta, botão, dropdown, pedido, revisão, envio ===== */
  await A.ev("(UI.cur={p:'_',page:'Configurações'},renderAll(),1)");
  await A.until('campo de conta', async () => A.ev('!!document.querySelector("#delContaSel")'));
  const opts = await A.js('[...document.querySelectorAll("#delContaSel option")].map(o=>o.textContent)');
  check('A Configurações: "Conta neste PC (provisório)" com os 5 nomes', JSON.stringify(opts) === JSON.stringify(['Escolha…', 'Ygor', 'Zanata', 'Rodrigo', 'Glayon', 'Gilbram']) && /Conta neste PC \(provisório\)/.test(await A.txt('#delegConf')), JSON.stringify(opts));
  await A.setv('#delContaSel', 'Rodrigo'); await wait(600);
  check('A a conta é gravada localmente (pasta de dados desta máquina)', JSON.parse(R(path.join(A.UD, 'vibe', 'conta.json')) || '{}').conta === 'Rodrigo');
  await A.shot('n25-1-configuracoes-conta', '#delegConf');

  await A.ev(`(UI.cur={p:${JSON.stringify(ID)},page:'Terminais'},UI.last=${JSON.stringify(ID)},renderAll(),1)`);
  await A.until('botão no cabeçalho', async () => A.ev('!!document.querySelector("[data-deleg-open]")'));
  const ordem = await A.js('[...document.querySelectorAll("#fpill .vibebtns button")].map(b=>b.textContent.trim())');
  check('A botão "Delegar tarefa" no cabeçalho, ao lado do "Vibe Coding"', ordem[0] === 'Vibe Coding' && ordem[1] === 'Delegar tarefa', JSON.stringify(ordem));
  await A.shot('n25-2-cabecalho', '#appfoot');
  await A.click('[data-deleg-open]');
  const s0 = await A.until('painel carregado', async () => { const s = await A.st(); return s && s.info ? s : null; });
  check('A painel abre ao lado do terminal (mesmo lugar do Mutirão)', await A.ev('!!document.querySelector("#col.mut-open > aside.mutp.delp")'));
  check('A responsável (DEV1 com o fluxo): pode delegar', s0 && s0.info.pode === true && s0.info.sugerida === 'dev2');
  const para = await A.js('[...document.querySelectorAll("select[data-df=para] option")].map(o=>o.textContent)');
  check('A dropdown "Para quem": as outras 4 contas, sem a do responsável', JSON.stringify(para) === JSON.stringify(['Escolha a pessoa…', 'Ygor', 'Zanata', 'Glayon', 'Gilbram']), JSON.stringify(para));
  check('A branch sugerida: dev2 (trocável)', (await A.ev('document.querySelector("select[data-df=branch]").value')) === 'dev2' && (await A.js('[...document.querySelectorAll("select[data-df=branch] option")].length')) === 4);
  await A.shot('n25-3-painel-responsavel', '.delp');
  await A.setv('select[data-df=para]', 'Ygor'); await A.setv('textarea[data-df=resumo]', 'Trocar o texto da tela inicial');
  await A.click('[data-dl=pedir]');
  const tab1 = await A.until('aba do orquestrador', async () => A.aba(ID, /^Delegar · Orquestrador$/), 40000);
  check('A o orquestrador do responsável recebe o pedido numa aba (pedido em arquivo)', !!tab1);
  const rv = await A.until('tarefa escrita e conferida', async () => { const s = await A.st(); return s && s.rev && s.rev.c && s.rev.c.ok ? s : null; }, 90000);
  check('A o orquestrador (falso) escreveu a tarefa e o Termix conferiu sozinho no fim do turno', !!rv && /pedido-delegar-d-/.test(A.flog()), A.flog().split('\n').filter((l) => /delegar/.test(l)).join(' | ').slice(0, 200));
  const md = await A.txt('.dl-md');
  check('A revisão mostra a tarefa completa (6 seções)', /Objetivo/.test(md) && /Contexto/.test(md) && /O que ler/.test(md) && /Critério de pronto/.test(md) && /O que não fazer/.test(md) && /Resultado esperado/.test(md));
  await A.shot('n25-4-revisao-da-tarefa', '.delp');
  const dev2Antes = rem('rev-parse', 'dev2');
  await A.click('[data-dl=enviar]');
  const env1 = await A.until('pedido enviado', async () => /Pedido enviado para Ygor/.test((await A.txt('.delp .vibe-msg')) || ''), 40000);
  check('A confirmar e enviar: pedido enviado, com push só da dev1', !!env1 && /\.termix\/delegar\/d-/.test(rem('ls-tree', '-r', '--name-only', 'dev1')) && rem('rev-parse', 'dev2') === dev2Antes && rem('rev-parse', 'main') === MAIN0);
  const sBr = await A.until('branch atualizada', async () => { const s = await A.st(); return s && s.info && s.info.sugerida === 'dev3' ? s : null; });
  check('A branch ocupada: a sugerida passa para a dev3', !!sBr && sBr.info.ocupadas.join() === 'dev2' && (await A.ev('document.querySelector("select[data-df=branch]").value')) === 'dev3', JSON.stringify(sBr && sBr.info.ocupadas));
  await A.shot('n25-5-painel-enviado', '.delp');
  // segundo pedido, para a Zanata na dev3 (branch criada a partir da dev1)
  await A.ev("delegarTest.form({para:'Zanata',branch:'dev3',resumo:'Segunda tarefa: ajustar o rodapé'})");
  await A.click('[data-dl=pedir]');
  await A.until('2ª tarefa conferida', async () => { const s = await A.st(); return s && s.rev && s.rev.c && s.rev.c.ok ? s : null; }, 90000);
  await A.click('[data-dl=enviar]');
  await A.until('2º enviado', async () => /Pedido enviado para Zanata/.test((await A.txt('.delp .vibe-msg')) || ''), 40000);
  check('A 2º pedido: a dev3 foi criada a partir da dev1 e registrada no fluxo.json', rem('rev-parse', '--verify', '-q', 'refs/heads/dev3') !== '' && JSON.parse(rem('show', 'dev1:.claude/fluxo.json')).devs.join() === 'dev2,dev3');
  // projeto sem fluxo
  await A.setv('#dlProj', ID2);
  const sSf = await A.until('projeto sem fluxo lido', async () => { const s = await A.st(); return s && s.id === ID2 && s.info ? s : null; });
  const tx = await A.txt('.delp .mp-body');
  check('A projeto sem fluxo: explica que precisa do fluxo e não oferece o pedido', !!sSf && sSf.info.pode === false && /precisa do fluxo/.test(tx) && !(await A.ev('!!document.querySelector("[data-dl=pedir]")')));
  await A.shot('n25-6-sem-fluxo', '.delp');
  await A.setv('#dlProj', ID);
  await A.until('volta ao projeto', async () => { const s = await A.st(); return s && s.id === ID && s.info ? s : null; });

  await fim(A);
  /* ===== Ygor: não responsável, aviso, começar, vibe de tarefa, entregar ===== */
  let B = await inst('ygor', 9426, PY); await wait(2500); await pronto(B);
  await B.ev("(UI.cur={p:'_',page:'Configurações'},renderAll(),1)");
  await B.until('campo de conta', async () => B.ev('!!document.querySelector("#delContaSel")'));
  await B.setv('#delContaSel', 'Zanata'); await wait(2500);
  const evZ = await B.evts();
  check('B conta Zanata: só vê o pedido dela (nada do pedido do Ygor)', evZ.filter((m) => /delegou uma tarefa a você/.test(m)).length === 1 && evZ.every((m) => !/Trocar o texto da tela inicial/.test(m)) && evZ.some((m) => /Segunda tarefa/.test(m)), JSON.stringify(evZ).slice(0, 300));
  await B.setv('#delContaSel', 'Ygor'); await wait(2500);
  const evY = await B.evts();
  check('B conta Ygor: aviso no sino com o resumo (só do pedido dele)', evY.filter((m) => /Trocar o texto da tela inicial/.test(m) && /delegou uma tarefa a você/.test(m)).length === 1, JSON.stringify(evY).slice(0, 300));
  await B.ev(`(UI.cur={p:${JSON.stringify(ID)},page:'Terminais'},UI.last=${JSON.stringify(ID)},renderAll(),1)`);
  await B.until('aviso no projeto', async () => B.ev('!!document.querySelector("[data-deleg-part]")'), 15000);
  check('B aviso no projeto: botão "Tarefa delegada a você (1)"', /Tarefa delegada a você \(1\)/.test(await B.txt('[data-deleg-part]')), await B.txt('[data-deleg-part]'));
  await B.shot('n25-7-aviso-no-cabecalho', '#appfoot');
  await B.click('[data-deleg-part]');
  const sB = await B.until('painel do Ygor', async () => { const s = await B.st(); return s && s.info && s.caixa && s.caixa.pedidos.length ? s : null; });
  check('B painel: não é o responsável (DEV2), explica e não oferece o pedido', !!sB && sB.info.pode === false && /DEV2/.test(await B.txt('.delp .mp-warn')) && !(await B.ev('!!document.querySelector("[data-dl=pedir]")')));
  const rtx = await B.txt('.delp .dl-item');
  check('B painel: resumo, quem delegou, branch e botões Começar', /Trocar o texto da tela inicial/.test(rtx) && /De Rodrigo/.test(rtx) && /dev2/.test(rtx) && /Começar/.test(rtx) && /Começar com Vibe de tarefa/.test(rtx), rtx.slice(0, 160));
  await B.shot('n25-8-aviso-de-quem-recebe', '.delp');
  check('B nada começou sozinho: a dev2 local está como antes e sem aba', g(PY, 'rev-parse', 'HEAD') === rem('rev-parse', 'dev2') && !(await B.aba(ID, /Delegar/)));
  await B.click('[data-dl=comecar][data-via=orq]');
  await B.until('em andamento', async () => { const s = await B.st(); return s && s.caixa && s.caixa.pedidos[0] && s.caixa.pedidos[0].estado === 'em_andamento' ? s : null; }, 60000);
  check('B Começar: dev2 sincronizada com a dev1, marcador "em andamento" na dev2 e só ela enviada', JSON.parse(rem('show', `dev2:.termix/delegar/estado-${(await B.st()).caixa.pedidos[0].id}.json`)).estado === 'em_andamento' && g(PY, 'merge-base', '--is-ancestor', 'origin/dev1', 'HEAD') === '' && rem('rev-parse', 'main') === MAIN0);
  const tabB = await B.until('aba do orquestrador de quem recebe', async () => B.aba(ID, /^Delegar · Orquestrador$/), 90000);
  await B.until('fake recebeu o pedido', async () => /pedido delegar pedido-delegar-comecar-/.test(B.flog()), 40000);
  check('B Começar: abre a aba do orquestrador com o pedido em arquivo', !!tabB && /pedido delegar pedido-delegar-comecar-/.test(B.flog()), B.flog().split('\n').filter((l) => /delegar/.test(l)).join(' | ').slice(0, 200));
  await B.shot('n25-9-em-andamento', '.delp');
  // Seguir com Vibe de tarefa
  await B.click('[data-dl=vibe]');
  const vs = await B.until('Vibe de tarefa aberto e preenchido', async () => { const s = await B.js('vibeTest.state()'); return s && s.modo === 'tarefa' && s.t && s.t.oQue ? s : null; }, 20000);
  check('B "Seguir com Vibe de tarefa": abre o Vibe de tarefa já preenchido pelo pedido', !!vs && /Trocar o texto da tela inicial/.test(vs.t.oQue) && /teste passa/.test(vs.t.criterio) && /Não mexer na main/.test(vs.t.naoPode) && /app\.js/.test(vs.t.arquivos), JSON.stringify(vs && vs.t).slice(0, 200));
  await B.shot('n25-10-vibe-de-tarefa-preenchido', '#modalRoot .dlg');
  await B.ev('document.querySelector("#modalRoot [data-mclose]").click()'); await wait(500);
  // Entregar
  await wait(7000); // o agente falso trabalha um pedido por vez: espera o do Começar terminar (o Claude Code de verdade enfileira)
  await B.click('[data-dl=entregar]');
  const ent = await B.until('entregue', async () => { const s = await B.st(); return s && s.caixa && s.caixa.pedidos[0] && s.caixa.pedidos[0].estado === 'entregue' ? s : null; }, 120000);
  const did1 = ent && ent.caixa.pedidos[0].id;
  check('B Entregar: handoff (reescrito pelo orquestrador) e marcador "entregue" gravados e enviados só na dev2', !!ent && /Troquei o texto/.test(rem('show', 'dev2:docs/HANDOFF_DEV2.md')) && JSON.parse(rem('show', `dev2:.termix/delegar/estado-${did1}.json`)).estado === 'entregue' && rem('rev-parse', 'main') === MAIN0 && !/estado-/.test(rem('ls-tree', '-r', '--name-only', 'dev1')));
  await B.shot('n25-11-entregue', '.delp');

  await fim(B);
  /* ===== Rodrigo: sino, painel com estados, analisar, aprovar ===== */
  A = await inst('rodrigo', 9425, PR, OUT, false); await wait(2500); await pronto(A);
  await abrirProj(A); await A.click('[data-deleg-open]');
  await A.ev('delegarTest.vigia()'); await wait(2500);
  const evA = await A.evts();
  check('A sino do responsável: "entregou a tarefa"', evA.some((m) => /Ygor entregou a tarefa/.test(m)), JSON.stringify(evA).slice(0, 200));
  await A.until('painel com entregue', async () => { const s = await A.st(); return s && s.painel && s.painel.pedidos.some((p) => p.id === did1 && p.estado === 'entregue') ? s : null; });
  check('A painel do projeto: estados (entregue e enviado) e as ações Analisar/Aprovar/Reprovar', /Entregue/.test(await A.txt('.delp')) && /Enviado/.test(await A.txt('.delp')) && (await A.ev('!!document.querySelector("[data-dl=analisar]") && !!document.querySelector("[data-dl=aprovar]") && !!document.querySelector("[data-dl=reprovar]")')));
  await A.shot('n25-12-painel-estados', '.delp');
  await A.click('[data-dl=analisar]');
  const anOk = await A.until('análise pedida', async () => /handoff/.test((await A.txt('.delp .vibe-msg')) || '') && fs.existsSync(path.join(A.UD, 'vibe', ID, 'delegar', did1, 'handoff-dev2.md')), 90000);
  await A.until('fake recebeu a análise', async () => /pedido delegar pedido-analisar-/.test(A.flog()), 40000);
  check('A Analisar entrega: extrai só o HANDOFF_DEV2.md e o orquestrador recebe o pedido', !!anOk && /Troquei o texto/.test(R(path.join(A.UD, 'vibe', ID, 'delegar', did1, 'handoff-dev2.md'))) && /pedido delegar pedido-analisar-/.test(A.flog() + (await wait(1500), A.flog())), A.flog().split('\n').filter((l) => /analisar/.test(l)).join(' | ').slice(0, 160));
  await A.click('[data-dl=aprovar]');
  await A.until('modal de aprovar', async () => /Aprovar a entrega/.test((await A.txt('#modalRoot .dlg')) || ''), 10000);
  await A.shot('n25-13-aprovar', '#modalRoot .dlg');
  await A.ev('document.querySelector("#modalRoot [data-mb=\\"1\\"]").click()');
  const apr = await A.until('aprovado', async () => { const s = await A.st(); return s && s.painel && s.painel.pedidos.some((p) => p.id === did1 && p.estado === 'aprovado') ? s : null; }, 40000);
  check('A Aprovar: decisão gravada no índice (dev1) e a dev2 NÃO foi integrada', !!apr && JSON.parse(rem('show', 'dev1:.termix/delegar/indice.json')).pedidos.find((p) => p.id === did1).estado === 'aprovado' && g(REM, 'merge-base', '--is-ancestor', 'dev2', 'dev1') !== '');
  await A.shot('n25-14-painel-final', '.delp');
  await fim(A);
  B = await inst('ygor', 9426, PY, [], false); await wait(2500); await pronto(B);
  await abrirProj(B); await B.click('[data-deleg-open]');
  await B.until('caixa lida', async () => { const s = await B.st(); return s && s.caixa && s.caixa.pedidos.length ? s : null; });
  check('B o dev vê o pedido como aprovado no painel dele', /Aprovado/.test(await B.txt('.delp .dl-item')), (await B.txt('.delp .dl-item')).slice(0, 100));
  check('remoto: a main nunca mudou', rem('rev-parse', 'main') === MAIN0);
  await fim(B);
  const e1 = ERRS.filter((e) => !/ResizeObserver/.test(e));
  check('sem erros de script nas instâncias', !e1.length, JSON.stringify(e1).slice(0, 300));
  log(`
${ok} OK, ${bad} FALHOU`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { log('ERRO', e && e.stack || e); process.exit(2); });
