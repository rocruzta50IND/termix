// DEV2-007 — teste SEM TOKENS do ciclo do Vibe/Mutirão no app (CDP), com um Claude Code FALSO no PATH (fake/claude.cmd).
// Uso: node run7.js <raiz do Termix>
// Projeto "Tarefinhas" (Mutirão publicado, 2/2 entregas por script) -> Implementação automática -> plano falso com 4 tarefas:
// T1 limite de tentativas; T2 Parar antes do envio e no meio do turno; T3 tempo limite do Dev e silêncio da revisão
// (DEV2-016: desde a DEV2-015 eles não pausam: o Dev vai para a recuperação e o orquestrador ganha o F5 da aba dele);
// T4 [SEM COMMIT]; no fim, push com a origin/dev1 à frente (outra máquina).
const { ROOT: ROOT_PADRAO, WORK } = require('./lib'); // raiz do repositório e pasta temporária do sistema
const fs = require('fs'), path = require('path'); const { spawn, execFileSync } = require('child_process');
const ROOT = (process.argv[2] || ROOT_PADRAO), S = path.join(WORK, 'real7'), UD = path.join(S, 'ud'), CFGD = path.join(S, 'claude-cfg'), PORT = 9339;
const FAKE = path.join(WORK, 'fake'), FCFG = path.join(S, 'fake-cfg.json'), FLOG = FCFG + '.log';
const SHOTS = path.join(WORK, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const T0 = Date.now(); const LOGF = path.join(WORK, 'run7.log'); fs.writeFileSync(LOGF, '');
const log = (...a) => { const l = `[${((Date.now() - T0) / 1000).toFixed(0)}s] ${a.join(' ')}`; console.log(l); fs.appendFileSync(LOGF, l + '\n'); };
let ok = 0, bad = 0; const check = (n, c, extra = '') => { if (c) ok++; else bad++; log(`${c ? 'OK  ' : 'FALHOU'} ${n}${extra ? ' — ' + extra : ''}`); };
const g = (dir, ...a) => { try { return execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); } catch (e) { return `ERRO ${String(e.stderr || e.message).split('\n')[0]}`; } };
const W = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); };
const MD = (t, extra) => ['Objetivo', 'Público e usuários', 'Funcionalidades', 'Fora do escopo', 'Telas e fluxos', 'Dados e regras de negócio', 'Integrações e acessos', 'Tecnologia', 'Critério de pronto'].map((h) => `## ${h}\n${extra[h] || `${t}: ver docs/ROADMAP.md.`}\n`).join('\n');
const dirs = (k) => ({ REM: path.join(S, k, 'remoto.git'), DONO: path.join(S, k, 'dono'), ANA: path.join(S, k, 'ana'), BIA: path.join(S, k, 'bia') });
// montar(): o mesmo cenário da rodada da DEV2-006 (run6.js)
const SRC6 = fs.readFileSync(path.join(__dirname, 'run6-montar.js'), 'utf8'); eval(SRC6); /* define montar(k, conflito) */

fs.rmSync(S, { recursive: true, force: true }); fs.mkdirSync(S, { recursive: true });
const { pubSha } = montar('a', false);
const { DONO, REM } = dirs('a');
const proj = (id, name, p) => ({ id, name, path: p, imported: true, archived: false, tabs: [], activeTab: null, g: 0, open: true, web: { tabs: [], active: null, device: 0 } });
W(path.join(UD, 'vibe', 'proj-a', 'mutirao.json'), JSON.stringify({ dono: { versao: 1, projeto: { id: 'proj-a', nome: 'Tarefinhas (dono)', pasta: DONO }, branchDono: 'dev1', participantes: [{ nome: 'Ana', branch: 'dev2' }, { nome: 'Bia', branch: 'dev3' }], fase: 'publicada', iniciado: new Date().toISOString(), publicado: { sha: pubSha, branch: 'dev1', data: new Date().toISOString() } } }, null, 2));
W(path.join(UD, 'state.json'), JSON.stringify({ projects: [proj('proj-a', 'Tarefinhas (dono)', DONO)], settings: { organizador: { on: false }, vibe: { on: false } } }, null, 2));
W(path.join(CFGD, '.claude.json'), JSON.stringify({ projects: {} })); // sem credenciais: o Claude é falso
const PLANO = 'Branch de trabalho: dev1\n\n## T1 — Ligar os filtros na página\nObjetivo: botões.\n\n## T2 — Ligar o exportar na página\nObjetivo: botão.\n\n## T3 — Ajustes de texto\nObjetivo: textos.\n\n## T4 — [SEM COMMIT] Validação final\nObjetivo: node --check em tudo.\n';
const CEN = {
  plano: PLANO, demora: 1200,
  'dev:T1': ['commit', 'commit', 'commit', 'commit'], 'rev:T1': ['refazer', 'refazer', 'refazer', 'aprovado'],
  'dev:T2': ['surdo', 'hang', 'commit'],
  'dev:T3': ['hang', 'commit'], 'rev:T3': ['mudo', 'aprovado'], 'rec:T3': [{ acao: 'reenviar', explicacao: 'Termine a tarefa e faça o commit.', motivo: 'o Dev travou' }],
  'dev:T4': ['nocommit', 'valida'],
};
W(FCFG, JSON.stringify(CEN, null, 2));
W(path.join(FAKE, 'claude.cmd'), `@node "%~dp0fake-claude.js" %*\r\n`);
const flog = () => (fs.existsSync(FLOG) ? fs.readFileSync(FLOG, 'utf8') : '');
const master0 = g(REM, 'rev-parse', 'master');

(async () => {
  const env = { ...process.env, PATH: `${FAKE};${process.env.PATH}`, FAKE_CFG: FCFG, TERMIX_VIBE_TEST: '1', CLAUDE_CONFIG_DIR: CFGD, TERMIX_VIBE_CLAUDE_JSON: path.join(CFGD, '.claude.json') };
  const el = spawn(path.join(ROOT, 'node_modules', 'electron', 'dist', 'electron.exe'), [ROOT, `--user-data-dir=${UD}`, `--remote-debugging-port=${PORT}`], { env, stdio: 'ignore' });
  let t = null; for (let i = 0; i < 40 && !t; i++) { await wait(500); try { t = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((x) => x.url.endsWith('renderer/index.html')); } catch {} }
  const ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const P = {}; ws.onmessage = (e) => { const m = JSON.parse(e.data); if (P[m.id]) { P[m.id](m); delete P[m.id]; } };
  await new Promise((r) => (ws.onopen = r));
  const send = (method, params) => new Promise((r) => { const i = ++id; P[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); const errs = []; ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.method === 'Runtime.exceptionThrown' || (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')) errs.push(JSON.stringify(m.params).slice(0, 300)); });
  const ev = async (x) => { const m = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (m.result && m.result.exceptionDetails) log('EXC', JSON.stringify(m.result.exceptionDetails).slice(0, 300)); return m.result && m.result.result && m.result.result.value; };
  const shot = async (n) => { const m = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(SHOTS, `r7-${n}.png`), Buffer.from(m.result.data, 'base64')); log('captura', n); };
  const cy = async () => JSON.parse((await ev('JSON.stringify(vibeTest.cycle("proj-a"))')) || 'null');
  const ex = async () => { const c = await cy(); return c && c.est && c.est.exec; };
  const fase = async () => { const c = await cy(); return c && c.est && c.est.fase; };
  const go = () => ev('(()=>{UI.cur={p:"proj-a",page:"Terminais"};UI.last="proj-a";renderAll();return 1})()');
  const until = async (nome, fn, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await wait(700); } log(`TEMPO ESGOTADO esperando: ${nome}`); return null; };
  const vibePanel = async (n) => { await go(); await ev('(S.settings.vibe={...S.settings.vibe,last:"proj-a"},save(),1)'); await ev('(vibeTest.open(), 1)'); await wait(1200); await ev('(()=>{const b=document.querySelector(".vibe-body,.modal .body,.vc");if(b)b.scrollTop=99999;return 1})()'); await shot(n); await ev('(document.querySelector("[data-mclose]")||{click(){}}).click(), 1'); await wait(300); };
  const avisos = async () => JSON.parse((await ev('JSON.stringify((UI.events||[]).filter(e=>/Vibe Coding/.test(e.who||"")).map(e=>e.msg))')) || '[]');
  const act = async (fn) => { await go(); await ev('(S.settings.vibe={...S.settings.vibe,last:"proj-a"},save(),1)'); await ev('(vibeTest.open(), 1)'); await wait(800); const r = await ev('(vibeTest.'+fn+'(), 1)'); await wait(300); await ev('(document.querySelector("[data-mclose]")||{click(){}}).click(), 1'); return r; };
  await wait(4000);
  await go(); await ev('vibeTest.mut.open("proj-a")'); await wait(5000);

  // Implementação automática: junção em código, plano pelo orquestrador falso, execução automática
  const r = await ev('vibeTest.mut.auto({}).then(r=>JSON.stringify(r))');
  log('auto:', String(r).slice(0, 160));
  await ev('vibeTest.mut.close()');

  /* ---- 2. limite de tentativas (T1: 3 revisões "refazer") ---- */
  let x = await until('pausa da T1', async () => { const e = await ex(); return e && e.pausa ? e : null; }, 120000);
  check('T1: pausa depois de 2 refações (3 execuções)', x && x.pausa.tipo === 'humano' && x.pausa.ajuda && x.tentativas === 3 && x.k === 0, x && JSON.stringify({ t: x.tentativas, p: x.pausa }).slice(0, 300));
  check('T1: motivo mostra a revisão e "mais uma tentativa"', x && /refazer a T1 depois de 3 tentativas: revisão falsa: refazer/.test(x.pausa.motivo) && /mais uma tentativa/.test(x.pausa.motivo));
  check('T1: notificação ao humano', (await avisos()).some((m) => /T1: A revisão pediu para refazer/.test(m)));
  check('T1: o fake recebeu 3 pedidos do Dev e 3 revisões', (flog().match(/pedido pedido-T1-(dev|refazer) ->/g) || []).length === 3 && (flog().match(/pedido pedido-T1-revisao ->/g) || []).length === 3);
  await vibePanel('f1-pausa-tentativas');
  await act('cont');
  x = await until('T1 aprovada', async () => { const e = await ex(); return e && e.feitas.length >= 1 ? e : null; }, 60000);
  check('T1: "Continuar" deu mais UMA chance (4ª execução) e aprovou', x && x.feitas[0].id === 'T1' && x.feitas[0].tentativas === 4, x && JSON.stringify(x.feitas[0]));

  /* ---- 4a. Parar com o pedido digitado e não enviado (T2, fake "surdo") ---- */
  await until('T2 surdo', async () => /surdo: pedido fica na caixa/.test(flog()), 30000);
  await wait(1500);
  await act('stop'); await wait(1500);
  x = await ex();
  check('Parar antes do envio: fase parado, tentativa desfeita (0), sem pedido pendente', (await fase()) === 'parado' && x.tentativas === 0 && !x.enviadoDev && x.k === 1, JSON.stringify({ t: x.tentativas, e: x.enviadoDev }));
  check('Parar antes do envio: a caixa do Dev foi limpa (Ctrl+U)', /\[Vibe · Dev\] Ctrl\+U \(caixa limpa: [1-9]/.test(flog()));
  await vibePanel('f2-parado-antes-do-envio');
  /* ---- 4b. Parar no meio do turno (T2, fake "hang") ---- */
  await act('cont');
  await until('T2 hang', async () => /pedido pedido-T2-dev -> hang/.test(flog()), 30000);
  await wait(2500);
  check('T2 retomada: /clear limpo (sem texto grudado) e o pedido normal foi enviado', !/pedido sem arquivo/.test(flog()) && /pedido pedido-T2-dev -> hang/.test(flog()));
  await act('stop'); await wait(1500);
  x = await ex();
  check('Parar no meio do turno: Esc ao Dev, fase parado, tentativa 1 contada', /\[Vibe · Dev\] INTERROMPIDO/.test(flog()) && (await fase()) === 'parado' && x.tentativas === 1);
  await act('cont');
  x = await until('T2 aprovada', async () => { const e = await ex(); return e && e.feitas.length >= 2 ? e : null; }, 60000);
  check('Continuar depois do Parar: confere, refaz de forma limpa (refação) e aprova', x && x.feitas[1].id === 'T2' && x.feitas[1].tentativas === 2 && /pedido pedido-T2-refazer -> commit/.test(flog()), x && JSON.stringify(x.feitas[1]));

  /* ---- 3. tempo limite (T3: Dev "hang"; revisão "mudo") ---- */
  await ev('vibeTest.tempos({turno:20000, semResposta:600000})');
  const RD = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '');
  const VD7 = path.join(UD, 'vibe', 'proj-a');
  const orqStarts0 = (flog().match(/\[Vibe · Orquestrador\] hook SessionStart startup/g) || []).length;
  x = await until('T3 em recuperação (tempo limite)', async () => { const e = await ex(); return e && (e.pausa || (e.rec && e.rec.tarefa === 'T3' && e.rec.voltas >= 1)) ? e : null; }, 90000);
  check('Dev sem terminar o turno em 20 s: não pausa; vai para a recuperação com o motivo no diagnóstico', x && !x.pausa && x.k === 2 && /O Dev não terminou o turno em 20 s \(tempo limite\)/.test(RD(path.join(VD7, 'diagnosticos', 'T3-1.md'))), x && JSON.stringify(x.pausa || x.rec).slice(0, 300));
  check('… o Termix interrompeu o Dev (Esc) e não avisou pausa', /INTERROMPIDO/.test(flog().split('pedido-T3-dev')[1] || '') && !(await avisos()).some((m) => /T3: O Dev não terminou o turno/.test(m)));
  await ev('vibeTest.tempos({turno:600000, semResposta:12000})');
  await vibePanel('f3-recuperacao-tempo-limite');
  // remoto à frente (outra máquina) antes do fim: o push final terá de integrar
  const OUT = path.join(S, 'a', 'outra');
  execFileSync('git', ['clone', '-q', '-b', 'dev1', REM, OUT]); g(OUT, 'config', 'user.name', 'Outra'); g(OUT, 'config', 'user.email', 'o@t');
  W(path.join(OUT, 'docs/outra-maquina.md'), 'feito em outra máquina\n'); g(OUT, 'add', '-A'); g(OUT, 'commit', '-qm', 'outra máquina'); g(OUT, 'push', '-q', 'origin', 'dev1');
  const outraSha = g(OUT, 'rev-parse', 'HEAD');
  x = await until('T3 aprovada', async () => { const e = await ex(); return e && (e.pausa || e.feitas.length >= 3) ? e : null; }, 150000);
  check('recuperação: o orquestrador decidiu reenviar e o Dev fez o commit', /pedido pedido-T3-recuperacao-1 ->/.test(flog()) && /pedido pedido-T3-refazer -> commit/.test(flog()));
  check('revisão sem nenhum sinal: o Termix interrompeu, deu F5 na aba do orquestrador e pediu a revisão de novo; aprovada sem pausar', x && !x.pausa && x.feitas[2] && x.feitas[2].id === 'T3' && /\[Vibe · Orquestrador\] INTERROMPIDO/.test(flog()) && (flog().match(/\[Vibe · Orquestrador\] hook SessionStart startup/g) || []).length === orqStarts0 + 1 && (flog().match(/pedido pedido-T3-revisao ->/g) || []).length === 2, x && JSON.stringify(x.pausa || x.feitas[2]).slice(0, 300));
  await ev('vibeTest.tempos()');

  /* ---- 1. [SEM COMMIT] (T4) ---- */
  const antesT4 = g(DONO, 'rev-parse', 'dev1');
  const fim = await until('fim', async () => { const c = await cy(); return c && c.est && (c.est.fase === 'concluido' && c.est.mutFim) || (c.est.fase === 'pausado') ? c.est : null; }, 90000);
  x = fim && fim.exec;
  check('T4 [SEM COMMIT]: 1ª entrega sem a linha "Validação:" foi recusada (refação)', /pedido pedido-T4-refazer -> valida/.test(flog()), (flog().match(/pedido-T4[^\n]*/g) || []).join(' | '));
  check('T4 [SEM COMMIT]: aceita sem commit novo, revisão aprovada, marcada "sem commit"', x && x.feitas[3] && x.feitas[3].id === 'T4' && x.feitas[3].semCommit === true && x.feitas[3].tentativas === 2, x && JSON.stringify(x.feitas[3]));
  check('… nenhum commit da T4 (dev1 local só ganhou o merge da origin)', g(DONO, 'log', '--format=%s', `${antesT4}..dev1`).split('\n').every((s) => !/^T4:/.test(s)));

  /* ---- 5. push final com a origin/dev1 à frente ---- */
  check('Projeto concluído e push feito pelo Termix depois de integrar a origin/dev1', fim && fim.fase === 'concluido' && fim.mutFim && fim.mutFim.ok, fim && JSON.stringify(fim.mutFim));
  const pais = g(DONO, 'log', '-1', '--format=%P', 'dev1').split(' ');
  check('… merge de origin/dev1 (sem rebase): 2 pais, um deles o da outra máquina', pais.length === 2 && pais.includes(outraSha) && g(DONO, 'log', '-1', '--format=%s', 'dev1') === 'Mutirão: integrar origin/dev1 (remoto à frente)');
  check('… remoto = local; master intacta (local e remota); tree limpo', g(REM, 'rev-parse', 'dev1') === g(DONO, 'rev-parse', 'dev1') && g(REM, 'rev-parse', 'master') === master0 && g(DONO, 'rev-parse', 'master') === master0 && g(DONO, 'status', '--porcelain', '--untracked-files=no') === '');
  check('… notificação "Mutirão concluído na dev1"', (await avisos()).some((m) => /Mutirão concluído na dev1/.test(m)));
  await vibePanel('f4-concluido-sem-commit');
  await go(); await ev('vibeTest.mut.open("proj-a")'); await wait(5000); await ev('(document.querySelector(".mutp .mp-body").scrollTop=99999, 1)'); await wait(300);
  await shot('f5-mutirao-concluido-remoto-a-frente');
  const mline = await ev('(document.querySelector(".mutp .mp-auto")||{}).innerText');
  check('tela do Mutirão: diz que integrou a origin/dev1 que estava à frente', /depois de integrar a origin\/dev1, que estava à frente/.test(mline || ''), (mline || '').replace(/\s+/g, ' ').slice(0, 200));
  await ev('vibeTest.mut.close()');

  log('log dev1:\n' + g(DONO, 'log', '--oneline', '--graph', '-16', 'dev1'));
  log('erros no console:', errs.length ? errs.join('\n') : 'nenhum');
  check('sem erros no console', !errs.length);
  log(`\n${ok} OK, ${bad} FALHOU`);
  el.kill(); await wait(1500); process.exit(bad ? 1 : 0);
})().catch((e) => { log('ERRO', e && e.stack); process.exit(1); });
