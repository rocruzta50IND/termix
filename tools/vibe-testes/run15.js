// DEV2-015 — teste SEM TOKENS da recuperação de erro do ciclo do Vibe no app (CDP), com o Claude Code FALSO da DEV2-007
// (fake\claude.cmd no PATH). Instância isolada: --user-data-dir temporário, CLAUDE_CONFIG_DIR vazio (sem credenciais).
// Uso: node run15.js <raiz do Termix>
// T1 erro do Dev -> reenviar ok; T2 tempo limite -> f5_aba ok; T3 3 voltas sem sucesso -> pendência e segue (com f5_projeto);
// T4 dividir -> T4.a e T4.b; T5 orquestrador mudo -> F5 dele -> mudo de novo -> pausa; T6 JSON inválido -> pausa, depois
// pular com bloqueia_proximas -> pausa; T7 normal -> concluído com a lista de pendências.
const { ROOT: ROOT_PADRAO, WORK } = require('./lib'); // raiz do repositório e pasta temporária do sistema
const fs = require('fs'), path = require('path'); const { spawn, execFileSync } = require('child_process');
const ROOT = (process.argv[2] || ROOT_PADRAO), S = path.join(WORK, 'r15'), UD = path.join(S, 'ud'), CFGD = path.join(S, 'claude-cfg'), PORT = 9371;
const FAKE = path.join(WORK, 'fake'), FCFG = path.join(S, 'fake-cfg.json'), FLOG = FCFG + '.log';
const SHOTS = path.join(WORK, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const T0 = Date.now(); const LOGF = path.join(WORK, 'run15.log'); fs.writeFileSync(LOGF, '');
const log = (...a) => { const l = `[${((Date.now() - T0) / 1000).toFixed(0)}s] ${a.join(' ')}`; console.log(l); fs.appendFileSync(LOGF, l + '\n'); };
let ok = 0, bad = 0; const check = (n, c, extra = '') => { if (c) ok++; else bad++; log(`${c ? 'OK  ' : 'FALHOU'} ${n}${extra ? ' — ' + extra : ''}`); };
const g = (dir, ...a) => { try { return execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); } catch (e) { return `ERRO ${String(e.stderr || e.message).split('\n')[0]}`; } };
const W = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); };
const R = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '');

fs.rmSync(S, { recursive: true, force: true });
const ID = 'p15', PJ = path.join(S, 'proj'), VD = path.join(UD, 'vibe', ID);
W(path.join(PJ, 'README.md'), '# Relatórios\n');
execFileSync('git', ['init', '-q', '-b', 'main', PJ]);
g(PJ, 'config', 'user.name', 'Teste'); g(PJ, 'config', 'user.email', 't@exemplo.invalid');
g(PJ, 'add', '-A'); g(PJ, 'commit', '-qm', 'inicio');
const main0 = g(PJ, 'rev-parse', 'main');
W(path.join(VD, 'entrega.json'), JSON.stringify({ versao: 1, status: 'pronta', data: new Date().toISOString(), projeto: { id: ID, nome: 'Relatórios', pasta: PJ }, objetivo: 'Relatórios de teste', criterioDePronto: 'Tudo commitado', naoPodem: '', acessos: [], nadaAFornecer: true, arquivos: { fluxo: 'fluxo.md', estrutura: 'estrutura.md' } }));
const PLANO = 'Branch de trabalho: vibe/proj\n\n' + [1, 2, 3, 4, 5, 6, 7].map((n) => `## T${n} — Tarefa ${n}\nObjetivo: parte ${n}.\nCritério de pronto: commit.\n`).join('\n');
W(path.join(VD, 'plano.md'), PLANO);
W(path.join(VD, 'perguntas.json'), '{"perguntas":[]}');
W(path.join(VD, 'estado.json'), JSON.stringify({ fase: 'pronto', iniciado: new Date().toISOString(), rodada: 1, nPerguntas: 0, tarefas: 7, projectId: ID }));
W(path.join(UD, 'state.json'), JSON.stringify({ projects: [{ id: ID, name: 'Relatórios', path: PJ, imported: true, archived: false, tabs: [], activeTab: null, g: 0, open: true }], lastSeenVersion: require(path.join(ROOT, 'package.json')).version, settings: { organizador: { on: false }, vibe: { on: false, last: ID } } }, null, 2));
W(path.join(CFGD, '.claude.json'), JSON.stringify({ projects: {} })); // sem credenciais: o Claude é falso
const N = (k) => Array(k).fill('nocommit');
const CEN = {
  demora: 1200,
  'dev:T1': [...N(3), 'commit'], 'rec:T1': [{ acao: 'reenviar', explicacao: 'Faça o commit "T1: ..." antes de gravar o resultado.', motivo: 'o Dev esqueceu o commit' }],
  'dev:T2': ['hang', 'commit'], 'rec:T2': [{ acao: 'f5_aba', motivo: 'o Dev travou no meio do turno' }],
  'dev:T3': [...N(3), 'nocommit:10000', 'nocommit', 'nocommit'], 'rec:T3': [{ acao: 'reenviar', explicacao: 'tente de novo' }, { acao: 'clear_dev' }, { acao: 'f5_projeto', motivo: 'servidor parado' }],
  'dev:T4': N(3), 'rec:T4': [{ acao: 'dividir', motivo: 'grande demais', dividir: { a: { titulo: 'Base do relatório', criterio: 'função criada' }, b: { titulo: 'Tela do relatório', criterio: 'botão ligado' } } }],
  'dev:T4.a': ['commit'], 'dev:T4.b': ['commit'],
  'dev:T5': ['commit'], 'rev:T5': ['mudo', 'mudo', 'aprovado'],
  'dev:T6': N(3), 'rec:T6': ['invalido', { acao: 'pular', motivo: 'precisa de acesso que o Dev não tem', bloqueia_proximas: true }],
  'dev:T7': ['commit'],
};
W(FCFG, JSON.stringify(CEN, null, 2));
const flog = () => R(FLOG);
const cnt = (rx) => (flog().match(rx) || []).length;
const F5CMD = 'node -e "console.log(\'F5 do projeto: servidor de teste reiniciado\')"';

(async () => {
  const env = { ...process.env, PATH: `${FAKE};${process.env.PATH}`, FAKE_CFG: FCFG, TERMIX_VIBE_TEST: '1', CLAUDE_CONFIG_DIR: CFGD, TERMIX_VIBE_CLAUDE_JSON: path.join(CFGD, '.claude.json') };
  const el = spawn(path.join(ROOT, 'node_modules', 'electron', 'dist', 'electron.exe'), [ROOT, `--user-data-dir=${UD}`, `--remote-debugging-port=${PORT}`], { env, stdio: 'ignore' });
  let t = null; for (let i = 0; i < 40 && !t; i++) { await wait(500); try { t = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((x) => x.url.endsWith('renderer/index.html')); } catch {} }
  const ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const P = {}; ws.onmessage = (e) => { const m = JSON.parse(e.data); if (P[m.id]) { P[m.id](m); delete P[m.id]; } };
  await new Promise((r) => (ws.onopen = r));
  const send = (method, params) => new Promise((r) => { const i = ++id; P[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); const errs = []; ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.method === 'Runtime.exceptionThrown' || (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')) errs.push(JSON.stringify(m.params).slice(0, 300)); });
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  const ev = async (x) => { const m = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (m.result && m.result.exceptionDetails) log('EXC', JSON.stringify(m.result.exceptionDetails).slice(0, 300)); return m.result && m.result.result && m.result.result.value; };
  // captura só do conteúdo do app (CDP), recortada no elemento
  const shot = async (n, sel) => {
    let clip = null;
    if (sel) { clip = await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;e.scrollIntoView({block:'start'});const r=e.getBoundingClientRect();return {x:Math.max(0,r.x-8),y:Math.max(0,r.y-8),width:Math.min(r.width+16,1280),height:Math.min(r.height+16,900-Math.max(0,r.y-8)),scale:1}})()`); await wait(250); }
    const m = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip } : {}) });
    fs.writeFileSync(path.join(SHOTS, `${n}.png`), Buffer.from(m.result.data, 'base64')); log('captura', n);
  };
  const cy = async () => JSON.parse((await ev(`JSON.stringify(vibeTest.cycle(${JSON.stringify(ID)}))`)) || 'null');
  const ex = async () => { const c = await cy(); return c && c.est && c.est.exec; };
  const fase = async () => { const c = await cy(); return c && c.est && c.est.fase; };
  const until = async (nome, fn, ms = 90000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await wait(600); } log(`TEMPO ESGOTADO esperando: ${nome}`); return null; };
  const avisos = async () => JSON.parse((await ev('JSON.stringify((UI.events||[]).filter(e=>/Vibe Coding/.test(e.who||"")).map(e=>e.msg))')) || '[]');
  const openV = async () => { await ev(`(UI.cur={p:${JSON.stringify(ID)},page:"Terminais"},UI.last=${JSON.stringify(ID)},renderAll(),1)`); if (!(await ev('!!document.querySelector("#vcPanel")'))) { await ev('(vibeTest.open(), 1)'); await wait(900); } };
  const closeV = async () => { await ev('(document.querySelector("[data-mclose]")||{click(){}}).click(), 1'); await wait(250); };
  const painel = async (n) => { await openV(); await ev('typeof paintCycle==="function"?1:1'); await wait(300); await shot(n, '#vcPanel'); };
  const panelText = async () => { await openV(); return ev('(document.querySelector("#vcPanel")||{}).innerText||""'); };
  const act = async (fn) => { await openV(); const r = await ev(`Promise.resolve(vibeTest.${fn}()).then(()=>1)`); await wait(300); return r; };

  await wait(3000);
  check('modo de teste ativo (vibeTest)', await ev('!!window.vibeTest'));
  await ev('vibeTest.tempos({turno:20000, semResposta:12000})');

  /* ---- política: campos novos na tela "Antes de iniciar" ---- */
  await openV();
  await ev('vibeTest.pol.abrir("iniciar")'); await wait(600);
  const ftxt = await ev('(document.querySelector("#vpForm")||{}).innerText||""');
  check('tela "Antes de iniciar": campo "Comando para reiniciar o projeto (F5 do projeto)" e voltas (padrão 3)', /Comando para reiniciar o projeto \(F5 do projeto\)/.test(ftxt) && /Voltas do orquestrador por tarefa/.test(ftxt) && (await ev('document.querySelector(\'[data-vpf="recuperacao.voltas"]\').value')) === '3');
  await ev(`vibeTest.pol.set("recuperacao.f5Projeto", ${JSON.stringify(F5CMD)})`);
  await shot('r1-antes-de-iniciar-recuperacao', '[data-vpf="recuperacao.voltas"]');
  await ev('vibeTest.pol.salvar()');
  const pol = JSON.parse(R(path.join(VD, 'politica.json')) || '{}');
  check('política gravada com o comando de F5 e 3 voltas', pol.recuperacao && pol.recuperacao.f5Projeto === F5CMD && pol.recuperacao.voltas === 3, JSON.stringify(pol.recuperacao));

  /* ---- T1: erro do Dev (3 entregas sem commit) -> recuperação "reenviar" -> sucesso ---- */
  let x = await until('T1 feita', async () => { const e = await ex(); return e && e.feitas.length >= 1 ? e : null; }, 120000);
  check('T1: 3 entregas sem commit não pausaram; recuperação pedida ao orquestrador (volta 1)', cnt(/\[Vibe · Dev\] pedido pedido-T1-(dev|refazer) -> nocommit/g) === 3 && /pedido pedido-T1-recuperacao-1 ->/.test(flog()) && !((await avisos()).some((m) => /^T1: /.test(m) && /Pausado|precisa/.test(m))));
  const d1 = R(path.join(VD, 'diagnosticos', 'T1-1.md'));
  check('T1: diagnóstico com tela, git status, branch, último commit, motivo e tentado', /## Últimas \d+ linhas da tela da aba do Dev/.test(d1) && /T1 FEITA/.test(d1) && /## git status\n```\n## vibe\/proj/.test(d1) && /Branch atual: vibe\/proj/.test(d1) && /Último commit: \w+ /.test(d1) && /não ficou pronta em 3 tentativas/.test(d1) && /falha: /.test(d1), d1.slice(0, 300));
  check('T1: orquestrador recebeu /clear e o pedido em arquivo; decisão gravada', /\[Vibe · Orquestrador\] hook SessionStart clear/.test(flog()) && fs.existsSync(path.join(VD, 'pedidos', 'pedido-T1-recuperacao-1.md')) && fs.existsSync(path.join(VD, 'recuperacao', 'T1-1.json')));
  check('T1: reenviada ao Dev com a explicação do orquestrador e aprovada (4 execuções)', /Orientação do orquestrador: Faça o commit/.test(R(path.join(VD, 'pedidos', 'pedido-T1-refazer.md'))) && x.feitas[0].id === 'T1' && x.feitas[0].tentativas === 4, JSON.stringify(x.feitas[0]));

  /* ---- T2: tempo limite -> f5_aba (fecha e reabre a aba do Dev retomando a conversa) -> sucesso ---- */
  const devStarts0 = cnt(/\[Vibe · Dev\] hook SessionStart startup/g);
  x = await until('T2 feita', async () => { const e = await ex(); return e && e.feitas.length >= 2 ? e : null; }, 120000);
  const d2 = R(path.join(VD, 'diagnosticos', 'T2-1.md'));
  check('T2: tempo limite (20 s) interrompeu o Dev e foi para a recuperação, sem pausar', /O Dev não terminou o turno em 20 s \(tempo limite\)/.test(d2) && /INTERROMPIDO/.test(flog().split('pedido-T2-dev')[1] || ''), d2.split('\n').slice(0, 6).join(' | '));
  check('T2: F5 da aba do Dev (processo novo) e pedido na conversa retomada, sem /clear', cnt(/\[Vibe · Dev\] hook SessionStart startup/g) === devStarts0 + 1 && /reabriu esta aba retomando a conversa/.test(R(path.join(VD, 'pedidos', 'pedido-T2-refazer.md'))) && !/\[Vibe · Dev\] hook SessionStart clear/.test(flog().split('pedido pedido-T2-recuperacao-1')[1].split('pedido pedido-T2-refazer')[0]));
  check('T2: aprovada depois do F5', x.feitas[1].id === 'T2', JSON.stringify(x.feitas[1]));

  /* ---- T3: 3 voltas sem sucesso (reenviar, clear_dev, f5_projeto) -> pendência, o ciclo segue ---- */
  await until('T3 em recuperação, Dev lento', async () => { const e = await ex(); return e && e.rec && e.rec.tarefa === 'T3' && e.rec.fase === 'conferir' && e.rec.voltas === 1; }, 120000);
  await wait(1500);
  const ptxt = await panelText();
  check('painel: "Recuperando (volta 1/3): reenviar ao Dev"', /Recuperando \(volta 1\/3\): reenviar ao Dev/.test(ptxt), ptxt.split('\n').filter((l) => /Recupera/.test(l)).join(' | '));
  await painel('r2-painel-recuperando');
  x = await until('T3 pendência', async () => { const e = await ex(); return e && (e.pendencias || []).length >= 1 ? e : null; }, 180000);
  check('T3: 3 voltas (reenviar, clear_dev, f5_projeto) e virou pendência', x && x.pendencias[0].id === 'T3' && x.pendencias[0].voltas === 3 && cnt(/pedido pedido-T3-recuperacao-\d ->/g) === 3 && /3 voltas de recuperação sem sucesso/.test(x.pendencias[0].motivo), x && JSON.stringify(x.pendencias[0]).slice(0, 300));
  check('T3: clear_dev mandou o pedido normal (pedido-T3-dev) depois da volta 2', /pedido-T3-recuperacao-2[\s\S]*pedido pedido-T3-dev -> nocommit/.test(flog()));
  check('T3: F5 do projeto rodou o comando inofensivo na pasta do projeto', /F5 do projeto: servidor de teste reiniciado/.test(R(path.join(VD, 'recuperacao', 'f5-projeto.log'))));
  check('T3: diagnóstico final (T3-4) e o sino avisou com o resumo', fs.existsSync(path.join(VD, 'diagnosticos', 'T3-4.md')) && (await avisos()).some((m) => /T3 virou pendência: .*Diagnóstico: T3:.*O ciclo segue com a T4/.test(m)));
  check('T3: o ciclo seguiu sem pausar (próxima: T4)', x.k >= 3 && !x.pendencias[0].bloqueia && /O ciclo segue com a T4/.test(((await avisos()).find((m) => /T3 virou pendência/.test(m))) || ''));

  /* ---- T4: dividir -> T4.a e T4.b no plano e no ciclo ---- */
  x = await until('T4.b feita', async () => { const e = await ex(); return e && e.feitas.some((f) => f.id === 'T4.b') ? e : null; }, 150000);
  const plano = R(path.join(VD, 'plano.md'));
  check('T4: dividida em T4.a e T4.b no plano (com títulos e critério) e no ciclo', x && x.tarefas.map((y) => y.id).join(',') === 'T1,T2,T3,T4.a,T4.b,T5,T6,T7' && /## T4\.a — Base do relatório\n[\s\S]*Critério de pronto: função criada/.test(plano) && /## T4\.b — Tela do relatório/.test(plano) && fs.existsSync(path.join(VD, 'plano.antes-de-dividir-T4.md')), x && x.tarefas.map((y) => y.id).join(','));
  check('T4: as partes foram feitas e aprovadas; aviso de divisão', x.feitas.some((f) => f.id === 'T4.a') && /T4\.a: entrega falsa/.test(g(PJ, 'log', '--format=%s', 'vibe/proj')) && (await avisos()).some((m) => /T4 dividida pelo orquestrador em T4\.a e T4\.b/.test(m)));

  /* ---- T5: orquestrador mudo na revisão -> F5 da aba dele -> mudo de novo -> pausa ---- */
  const orqStarts0 = cnt(/\[Vibe · Orquestrador\] hook SessionStart startup/g);
  x = await until('pausa da T5', async () => { const e = await ex(); return e && e.pausa ? e : null; }, 120000);
  check('T5: orquestrador mudo -> F5 da aba dele (uma vez) -> revisão pedida de novo', cnt(/\[Vibe · Orquestrador\] hook SessionStart startup/g) === orqStarts0 + 1 && cnt(/pedido pedido-T5-revisao ->/g) === 2);
  check('T5: mudo de novo -> pausa com aviso', x && x.tarefas[x.k].id === 'T5' && x.pausa.tipo === 'erro' && /já reabriu a aba do orquestrador \(F5\)/.test(x.pausa.motivo) && (await avisos()).some((m) => /^T5: .*travou de novo/.test(m)), x && x.pausa && x.pausa.motivo);
  await painel('r3-pausa-orquestrador-mudo');
  await act('cont');
  x = await until('T5 feita', async () => { const e = await ex(); return e && e.feitas.some((f) => f.id === 'T5') ? e : null; }, 90000);
  check('T5: Continuar -> revisão pedida de novo e aprovada', !!x);

  /* ---- T6: JSON inválido -> pausa; Continuar -> pular com bloqueia_proximas -> pausa ---- */
  x = await until('pausa da T6 (JSON inválido)', async () => { const e = await ex(); return e && e.pausa ? e : null; }, 120000);
  check('T6: JSON inválido na decisão = pausa com o motivo', x && x.tarefas[x.k].id === 'T6' && x.pausa.tipo === 'erro' && /não é um JSON válido/.test(x.pausa.motivo), x && x.pausa && x.pausa.motivo);
  await act('cont');
  x = await until('pausa da T6 (bloqueia)', async () => { const e = await ex(); return e && e.pausa && (e.pendencias || []).some((p) => p.id === 'T6') ? e : null; }, 90000);
  check('T6: pedida de novo; "pular" com bloqueia_proximas=true = pendência e pausa', x && x.pausa.tipo === 'humano' && /as próximas tarefas dependem dela/.test(x.pausa.motivo) && x.pendencias.find((p) => p.id === 'T6').bloqueia === true && x.tarefas[x.k].id === 'T7', x && x.pausa && x.pausa.motivo);
  await painel('r4-pausa-bloqueia-proximas');
  await act('cont');

  /* ---- T7 e fim: concluído com a lista de pendências ---- */
  const fim = await until('concluído', async () => { const c = await cy(); return c && c.est && c.est.fase === 'concluido' ? c.est : null; }, 90000);
  check('ciclo concluído: 6 feitas e 2 pendências (T3, T6)', fim && fim.exec.feitas.length === 6 && fim.exec.pendencias.map((p) => p.id).join(',') === 'T3,T6', fim && JSON.stringify(fim.exec.feitas.map((f) => f.id)));
  const ftx = await panelText();
  check('painel do fim: "Pendências do ciclo (2)" com T3 e T6 e o link Abrir diagnóstico', /Pendências do ciclo \(2\)/.test(ftx) && /T3 — Tarefa 3/.test(ftx) && /T6 — Tarefa 6/.test(ftx) && /Abrir diagnóstico/.test(ftx)); // DEV2-016: o caminho virou o link 'Abrir diagnóstico'
  check('notificação do fim cita as pendências', (await avisos()).some((m) => /Projeto concluído: .*2 pendências/.test(m)));
  await painel('r5-concluido-com-pendencias');
  check('main intacta; commits só na vibe/proj', g(PJ, 'rev-parse', 'main') === main0 && g(PJ, 'rev-parse', '--abbrev-ref', 'HEAD') === 'vibe/proj');
  check('nenhuma pausa por tempo limite/erro do Dev (só T5 orquestrador e T6)', !(await avisos()).some((m) => /^T[1-4]: .*(tempo limite|não ficou pronta)/.test(m)));
  log('erros no console:', errs.length ? errs.join('\n') : 'nenhum');
  check('sem erros no console', !errs.length);
  log(`\n${ok} OK, ${bad} FALHOU`);
  try { await ev('window.close()'); } catch {} await wait(2000); try { el.kill(); } catch {}
  process.exit(bad ? 1 : 0);
})().catch((e) => { log('ERRO', e && e.stack); process.exit(1); });
