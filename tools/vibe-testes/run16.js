// DEV2-016 — teste SEM TOKENS do deploy pelo Termix no app (CDP), com o Claude Code FALSO da DEV2-007 (fake\claude.cmd no PATH).
// Instância isolada: --user-data-dir temporário, CLAUDE_CONFIG_DIR vazio. Remoto bare local (nada de projeto real).
// Uso: node run16.js <raiz do Termix> a|b
//  a: projeto sem fluxo (o dono pode): deploy Sempre (merge --no-ff), portão falhando -> recuperação -> deploy, Pedir autorização
//     (autorizar pelo sino; negar pelo arquivo, como o Telegram fará), Pausar/Retomar deploy, receita falhando depois do envio,
//     lista de versões e Voltar versão, F5 do projeto encerrando o servidor anterior.
//  b: projeto com o fluxo, papel DEV2: [DEPLOY] não publica; fim do ciclo: handoff pelo orquestrador e envio só da dev2.
const { ROOT: ROOT_PADRAO, WORK } = require('./lib'); // raiz do repositório e pasta temporária do sistema
const fs = require('fs'), path = require('path'); const { spawn, execFileSync } = require('child_process');
const ROOT = (process.argv[2] || ROOT_PADRAO), MODO = process.argv[3] || 'a';
const S = path.join(WORK, `r16${MODO}`), UD = path.join(S, 'ud'), CFGD = path.join(S, 'claude-cfg'), PORT = MODO === 'a' ? 9381 : 9382;
const FAKE = path.join(WORK, 'fake'), FCFG = path.join(S, 'fake-cfg.json'), FLOG = FCFG + '.log';
const SHOTS = path.join(WORK, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const T0 = Date.now(); const LOGF = path.join(WORK, `run16${MODO}.log`); fs.writeFileSync(LOGF, '');
const log = (...a) => { const l = `[${((Date.now() - T0) / 1000).toFixed(0)}s] ${a.join(' ')}`; console.log(l); fs.appendFileSync(LOGF, l + '\n'); };
let ok = 0, bad = 0; const check = (n, c, extra = '') => { if (c) ok++; else bad++; log(`${c ? 'OK  ' : 'FALHOU'} ${n}${extra ? ' — ' + extra : ''}`); };
const g = (dir, ...a) => { try { return execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); } catch (e) { return `ERRO ${String(e.stderr || e.message).split('\n')[0]}`; } };
const W = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); };
const R = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '');
const vivo = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };

fs.rmSync(S, { recursive: true, force: true });
const ID = MODO === 'a' ? 'p16' : 'p16d', PJ = path.join(S, 'proj'), REM = path.join(S, 'proj.git'), VD = path.join(UD, 'vibe', ID);
const PUB = path.join(S, 'publicado').replace(/\\/g, '/'); fs.mkdirSync(PUB, { recursive: true });
const RECEITA = `node -e "require('fs').appendFileSync('${PUB}/site.txt', 'publicado\\n')"`;
const RECEITA_RUIM = 'node -e "process.exit(3)"';
const PORTAO = 'node -e "process.exit(require(\'fs\').existsSync(\'QUEBRADO\') ? 1 : 0)"';
const SERVIDOR = 'node -e "setInterval(() => {}, 1000)"';
execFileSync('git', ['init', '-q', '--bare', '-b', 'main', REM]);
g(REM, 'config', 'receive.denyNonFastForwards', 'true'); g(REM, 'config', 'receive.denyDeletes', 'true');
execFileSync('git', ['clone', '-q', REM, PJ], { stdio: 'ignore' });
g(PJ, 'config', 'user.name', 'Teste'); g(PJ, 'config', 'user.email', 't@exemplo.invalid'); g(PJ, 'switch', '-qc', 'main');
W(path.join(PJ, 'README.md'), '# Site\n');
if (MODO === 'b') { W(path.join(PJ, '.claude', 'fluxo.json'), JSON.stringify({ validacao: [PORTAO] })); W(path.join(PJ, '.gitignore'), 'CLAUDE.local.md\n'); }
g(PJ, 'add', '-A'); g(PJ, 'commit', '-qm', 'inicio'); g(PJ, 'push', '-q', 'origin', 'main');
if (MODO === 'b') { W(path.join(PJ, 'CLAUDE.local.md'), 'papel: "DEV2"\nbranch_padrao: "dev2"\n'); g(PJ, 'push', '-q', 'origin', 'main:dev1'); g(PJ, 'switch', '-qc', 'dev2'); g(PJ, 'push', '-q', '-u', 'origin', 'dev2'); }
const main0 = g(REM, 'rev-parse', 'main');
const TAREFAS = MODO === 'a'
  ? ['Base', '[DEPLOY] Publicar a primeira versão', 'Mudança que quebra o portão', '[DEPLOY] Publicar a correção', 'Tela', '[DEPLOY] Publicar com autorização', 'Ajuste', '[DEPLOY] Publicar sem autorização', 'Ajuste 2', '[DEPLOY] Publicar retido', 'Ajuste 3', 'Ajuste 4', '[DEPLOY] Publicar com receita quebrada', 'Final']
  : ['Base', '[DEPLOY] Publicar na main', 'Final'];
const PLANO = `Branch de trabalho: ${MODO === 'a' ? 'vibe/proj' : 'dev2'}\n\n` + TAREFAS.map((t, i) => `## T${i + 1} — ${t}\nObjetivo: parte ${i + 1}.\nCritério de pronto: commit.\n`).join('\n');
W(path.join(VD, 'entrega.json'), JSON.stringify({ versao: 1, status: 'pronta', data: new Date().toISOString(), projeto: { id: ID, nome: 'Site', pasta: PJ }, objetivo: 'Site de teste', criterioDePronto: 'Tudo commitado', naoPodem: '', acessos: [], nadaAFornecer: true, arquivos: { fluxo: 'fluxo.md', estrutura: 'estrutura.md' } }));
W(path.join(VD, 'plano.md'), PLANO);
W(path.join(VD, 'perguntas.json'), '{"perguntas":[]}');
W(path.join(VD, 'estado.json'), JSON.stringify({ fase: 'pronto', iniciado: new Date().toISOString(), rodada: 1, nPerguntas: 0, tarefas: TAREFAS.length, projectId: ID }));
W(path.join(UD, 'state.json'), JSON.stringify({ projects: [{ id: ID, name: 'Site', path: PJ, imported: true, archived: false, tabs: [], activeTab: null, g: 0, open: true }], lastSeenVersion: require(path.join(ROOT, 'package.json')).version, settings: { organizador: { on: false }, vibe: { on: false, last: ID } } }, null, 2));
W(path.join(CFGD, '.claude.json'), JSON.stringify({ projects: {} }));
const CEN = MODO === 'a'
  ? { demora: 1500, 'dev:T3': ['quebra'], 'dev:T4': ['conserta'], 'rec:T4': [{ acao: 'reenviar', explicacao: 'Tire o arquivo QUEBRADO (git rm) e faça o commit.', motivo: 'o portão falhou por causa do QUEBRADO' }], 'dev:T11': ['commit:9000'] }
  : { demora: 1500 };
W(FCFG, JSON.stringify(CEN, null, 2));
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
  // captura só do conteúdo do app (CDP), recortada no elemento
  const shot = async (n, sel) => {
    let clip = null;
    if (sel) { clip = await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;e.scrollIntoView({block:'start'});const r=e.getBoundingClientRect();return {x:Math.max(0,r.x-8),y:Math.max(0,r.y-8),width:Math.min(r.width+16,1280),height:Math.min(r.height+16,900-Math.max(0,r.y-8)),scale:1}})()`); await wait(250); }
    const m = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip } : {}) });
    fs.writeFileSync(path.join(SHOTS, `${n}.png`), Buffer.from(m.result.data, 'base64')); log('captura', n);
  };
  const cy = async () => JSON.parse((await ev(`JSON.stringify(vibeTest.cycle(${JSON.stringify(ID)}))`)) || 'null');
  const ex = async () => { const c = await cy(); return c && c.est && c.est.exec; };
  const until = async (nome, fn, ms = 90000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await wait(600); } log(`TEMPO ESGOTADO esperando: ${nome}`); return null; };
  const avisos = async () => JSON.parse((await ev('JSON.stringify((UI.events||[]).filter(e=>/Vibe Coding/.test(e.who||"")).map(e=>e.msg))')) || '[]');
  const openV = async () => { await ev(`(UI.cur={p:${JSON.stringify(ID)},page:"Terminais"},UI.last=${JSON.stringify(ID)},renderAll(),1)`); if (!(await ev('!!document.querySelector("#vcPanel")'))) { await ev('(vibeTest.open(), 1)'); await wait(900); } };
  const painel = async (n, sel = '#vcPanel') => { await openV(); await wait(400); await shot(n, sel); };
  const panelText = async () => { await openV(); return ev('(document.querySelector("#vcPanel")||{}).innerText||""'); };
  const clicar = async (sel) => { await openV(); const r = await ev(`(()=>{const b=document.querySelector(${JSON.stringify(sel)});if(!b)return false;b.click();return true})()`); await wait(400); return r; };
  const polSet = async (fn) => ev(`(async()=>{const P=await window.termix.vibe('politicaGet',${JSON.stringify(ID)});const p=P.politica;(${fn})(p);const r=await window.termix.vibe('politicaSet',${JSON.stringify(ID)},p,'teste');return r&&r.ok})()`);
  const naTarefa = (tk, ms = 120000) => until(`tarefa ${tk}`, async () => { const e = await ex(); return e && e.tarefas[e.k] && e.tarefas[e.k].id === tk ? e : null; }, ms);
  const feita = (tk, ms = 120000) => until(`${tk} feita`, async () => { const e = await ex(); return e && e.feitas.some((f) => f.id === tk) ? e : null; }, ms);
  const tags = () => g(REM, 'tag').split('\n').filter(Boolean);

  await wait(3000);
  check('modo de teste ativo (vibeTest)', await ev('!!window.vibeTest'));
  await openV();
  await ev('vibeTest.pol.abrir("iniciar")'); await wait(600);

  if (MODO === 'a') {
    await ev('vibeTest.pol.set("modelo", "deploy")'); await wait(300);
    await ev(`vibeTest.pol.set("deploy.receita", ${JSON.stringify(RECEITA)})`);
    // DEV2-021: Sempre sem portão — a tela avisa e não grava
    await ev('vibeTest.pol.set("portao", "")'); await wait(200);
    await ev('vibeTest.pol.salvar()'); await wait(800);
    const ftx0 = await ev('(document.querySelector("#vpForm")||{}).innerText||""');
    check('DEV2-021 tela "Antes de iniciar": Sempre sem portão avisa e não grava', /portão de qualidade é obrigatório/.test(ftx0) && /Obrigatório com o deploy "Sempre" ou "Marco"/.test(ftx0) && !fs.existsSync(path.join(VD, 'politica.json')), ftx0.slice(0, 300));
    await shot('d21-sem-portao-recusado');
    await ev(`vibeTest.pol.set("portao", ${JSON.stringify(PORTAO)})`);
    await ev(`vibeTest.pol.set("recuperacao.f5Projeto", ${JSON.stringify(SERVIDOR)})`);
    const ftxt = await ev('(document.querySelector("#vpForm")||{}).innerText||""');
    check('tela "Antes de iniciar": o texto do deploy diz que o Termix faz o deploy (sem "ainda não está disponível")', /O Termix faz o deploy/.test(ftxt) && !/ainda não está disponível/.test(ftxt));
    await ev('vibeTest.pol.salvar()');
    const pol = JSON.parse(R(path.join(VD, 'politica.json')) || '{}');
    check('política gravada: Sempre, receita, portão e F5', pol.deploy && pol.deploy.modo === 'sempre' && pol.deploy.receita === RECEITA && pol.portao === PORTAO && pol.recuperacao.f5Projeto === SERVIDOR);

    /* F5 do projeto: o servidor anterior é encerrado antes de subir de novo */
    const f1 = await ev('vibeTest.f5Projeto()'), f2 = await ev('vibeTest.f5Projeto()');
    await wait(800);
    check('F5 do projeto: o segundo encerra o servidor do primeiro (só esse PID) e sobe outro', f1 && f2 && f1.estado === 'rodando' && f2.anterior && f2.anterior.encerrado && !vivo(f1.pid) && vivo(f2.pid), JSON.stringify({ f1: f1 && f1.pid, f2: f2 && f2.pid, ant: f2 && f2.anterior }));

    /* T2: deploy Sempre (sem fluxo: merge --no-ff da vibe/proj na main) */
    let x = await feita('T2');
    const f2d = x && x.feitas.find((f) => f.id === 'T2');
    check('T2: deploy feito pelo Termix, sem passar pelo Dev', f2d && f2d.deploy === 'feito' && /^deploy-\d{8}-\d{4}/.test(f2d.tag) && !/pedido-T2-dev/.test(flog()), JSON.stringify(f2d));
    check('T2: main do remoto com o merge --no-ff, tag anotada, receita rodou; HEAD de volta na vibe/proj', g(REM, 'rev-list', '--parents', '-n', '1', 'main').split(' ').length === 3 && g(REM, 'cat-file', '-t', f2d.tag) === 'tag' && /publicado/.test(R(`${PUB}/site.txt`)) && g(PJ, 'rev-parse', '--abbrev-ref', 'HEAD') === 'vibe/proj');

    /* T4: o portão falha (T3 deixou QUEBRADO) -> não publica -> recuperação -> o Dev conserta -> o Termix publica */
    x = await feita('T4', 180000);
    const d4 = R(path.join(VD, 'diagnosticos', 'T4-1.md'));
    check('T4: portão falhando não publicou e foi para a recuperação (diagnóstico com o motivo)', /portão de qualidade não passou/.test(d4) && /Nada foi publicado/.test(d4), d4.split('\n').slice(0, 5).join(' | '));
    check('T4: o orquestrador decidiu reenviar; o Dev consertou; revisão aprovada; o Termix publicou', /pedido pedido-T4-recuperacao-1 ->/.test(flog()) && /T4: conserta o portão/.test(g(REM, 'log', '--format=%s', 'main')) && x.feitas.find((f) => f.id === 'T4').deploy === 'feito' && tags().length === 2, JSON.stringify(x && x.feitas.find((f) => f.id === 'T4')));

    /* T6: Pedir autorização -> sino e painel com "Autorizar deploy" e "Negar" -> autorizar pelo sino */
    await naTarefa('T5');
    check('política: Pedir autorização (no meio do ciclo, vale a partir da próxima tarefa)', await polSet("(p)=>{p.deploy.modo='pedir'}"));
    x = await until('pausa de autorização da T6', async () => { const e = await ex(); return e && e.pausa && e.pausa.autorizacao ? e : null; }, 120000);
    const ptx = await panelText();
    check('T6: pausa "Aguardando autorização de deploy" com o resumo (commits, portão, receita) e os botões', x && x.pausa.autorizacao.tarefa === 'T6' && /Aguardando autorização de deploy/.test(ptx) && /Deploy aguardando a sua autorização \(T6\)/.test(ptx) && /T5: entrega falsa/.test(ptx) && /portão: node -e/.test(ptx) && (await ev('!!document.querySelector(\'[data-vc="depok"]\') && !!document.querySelector(\'[data-vc="depno"]\') && !document.querySelector(\'[data-vc="resume"]\')')), ptx.split('\n').filter((l) => /autoriza/i.test(l)).join(' | '));
    check('T6: ponto de aprovação em arquivo (deploys\\autorizacao.json, aguardando)', JSON.parse(R(path.join(VD, 'deploys', 'autorizacao.json'))).status === 'aguardando');
    await painel('d2-pedido-de-autorizacao');
    await ev('(UI.actOpen||document.querySelector("[data-togact]").click(),1)'); await wait(600);
    const sino = await ev(`(()=>{const b=[...document.querySelectorAll('[data-ev]')].filter(b=>/\\|vibedep-(ok|no)\\|${ID}$/.test(b.dataset.ev));return b.map(x=>x.textContent)})()`);
    check('sino: aviso com "Autorizar deploy" e "Negar"', JSON.stringify(sino) === '["Autorizar deploy","Negar"]', JSON.stringify(sino));
    await shot('d3-sino-autorizar', '#act');
    await ev(`(()=>{const b=[...document.querySelectorAll('[data-ev]')].find(b=>b.dataset.ev.endsWith('|vibedep-ok|${ID}'));b&&b.click();return 1})()`);
    await ev('(UI.actOpen&&document.querySelector("[data-togact]").click(),1)');
    x = await feita('T6');
    check('T6: autorizado pelo sino -> o Termix publicou (decisão gravada com a origem)', x && x.feitas.find((f) => f.id === 'T6').deploy === 'feito' && tags().length === 3 && JSON.parse(R(path.join(VD, 'deploys', 'autorizacao.json'))).decisao.origem === 'sino');

    /* T8: Pedir autorização -> negar pelo arquivo (o caminho que o Telegram usará) -> pendência e o ciclo segue */
    x = await until('pausa de autorização da T8', async () => { const e = await ex(); return e && e.pausa && e.pausa.autorizacao && e.pausa.autorizacao.tarefa === 'T8' ? e : null; }, 120000);
    const mainAntes8 = g(REM, 'rev-parse', 'main');
    await ev(`window.termix.vibe('deployAut', ${JSON.stringify(ID)}, 'decidir', { decisao: 'negar', origem: 'telegram' })`);
    x = await until('T8 pendência', async () => { const e = await ex(); return e && (e.pendencias || []).some((p) => p.id === 'T8') ? e : null; }, 30000);
    check('T8: negado pelo arquivo (origem telegram) -> pendência "deploy negado", nada publicado, o ciclo seguiu', x && /deploy negado \(telegram\)/.test(x.pendencias.find((p) => p.id === 'T8').motivo) && g(REM, 'rev-parse', 'main') === mainAntes8 && tags().length === 3 && x.tarefas[x.k].id === 'T9');

    /* T10: Sempre + "Pausar deploy" -> retido; "Retomar deploy" no meio da T11 -> sai na fronteira da tarefa */
    await naTarefa('T9');
    await polSet("(p)=>{p.deploy.modo='sempre'}");
    await ev('vibeTest.pol.pausarDeploy(true)'); await wait(500);
    check('"Pausar deploy" à vista e ligado', (await panelText()).includes('DEPLOY PAUSADO') && (await ev('!!document.querySelector(\'[data-vc="deployresume"]\')')));
    x = await feita('T10');
    check('T10: deploy retido (Pausar deploy), nada publicado, o ciclo seguiu', x && x.feitas.find((f) => f.id === 'T10').deploy === 'retido' && tags().length === 3);
    await until('T11 com o Dev trabalhando', async () => { const e = await ex(); return e && e.tarefas[e.k].id === 'T11' && e.enviadoDev ? e : null; }, 60000);
    await clicar('[data-vc="deployresume"]');
    x = await ex();
    check('"Retomar deploy" com o Dev trabalhando: fica na fila (deployFila), nada sai no meio do turno', x.deployFila === true && tags().length === 3 && /saem assim que a tarefa atual terminar/.test(await panelText()));
    x = await feita('T11', 60000);
    x = await until('retidos publicados', async () => { const e = await ex(); const f = e && e.feitas.find((y) => y.id === 'T10'); return f && f.deploy === 'feito' ? e : null; }, 60000);
    check('retidos publicados na fronteira (depois da T11, antes da T12), com tag', x && tags().length === 4 && /T11: entrega falsa/.test(g(REM, 'log', '--format=%s', 'main')) && !x.deployFila);

    /* T13: receita falhando depois do envio -> mensagem clara e as opções; "Rodar a receita de novo" */
    await naTarefa('T12');
    await polSet(`(p)=>{p.deploy.receita=${JSON.stringify(RECEITA_RUIM)}}`);
    x = await until('pausa da receita da T13', async () => { const e = await ex(); return e && e.pausa && e.pausa.receita ? e : null; }, 120000);
    const rtx = await panelText();
    check('T13: "a main foi enviada, a publicação falhou", sem desfazer nada, com as opções', x && /já foi enviada/.test(x.pausa.motivo) && /a publicação falhou/.test(x.pausa.motivo) && /não desfez nada/.test(x.pausa.motivo) && /Deploy: a main foi enviada, a publicação falhou/.test(rtx) && (await ev('["deprec","depvolta","depseguir"].every(k=>!!document.querySelector(`#vcPanel .vibe-confirm [data-vc="${k}"]`)) && !document.querySelector(\'[data-vc="resume"]\')')) && g(REM, 'rev-parse', 'main') === g(PJ, 'rev-parse', 'main') && tags().length === 5, x && x.pausa.motivo);
    await painel('d4-receita-falhou');
    await polSet(`(p)=>{p.deploy.receita=${JSON.stringify(RECEITA)}}`);
    const nPub = (R(`${PUB}/site.txt`).match(/publicado/g) || []).length;
    await clicar('#vcPanel .vibe-confirm [data-vc="deprec"]');
    x = await feita('T13', 60000);
    check('"Rodar a receita de novo": publicou e o ciclo seguiu', x && x.feitas.find((f) => f.id === 'T13').deploy === 'feito' && (R(`${PUB}/site.txt`).match(/publicado/g) || []).length === nPub + 1);

    /* fim: concluído; lista de versões; Voltar versão com confirmação explícita */
    const fim = await until('concluído', async () => { const c = await cy(); return c && c.est && c.est.fase === 'concluido' ? c.est : null; }, 90000);
    check('ciclo concluído (12 feitas, pendência T8)', fim && fim.exec.feitas.length === 13 && fim.exec.pendencias.map((p) => p.id).join(',') === 'T8', fim && JSON.stringify(fim.exec.feitas.map((f) => f.id + ':' + (f.deploy || ''))));
    await wait(1500);
    check('fim do ciclo: o servidor do F5 do projeto foi encerrado', !vivo(f2.pid) && !fs.existsSync(path.join(VD, 'recuperacao', 'f5-projeto.pid.json')));
    let ftx = await panelText();
    check('painel do fim: "A main recebeu o deploy pelo Termix" e a lista de versões (5) com "Voltar para antes deste"', /A main recebeu o deploy pelo Termix/.test(ftx) && /Deploys \(versões\)/.test(ftx) && (await ev('document.querySelectorAll(\'.vx-deps [data-vc="depvolta"]\').length')) === 5);
    await painel('d1-deploy-concluido-e-versoes', '.vx-deps');
    const ultimo = await ev('document.querySelector(\'.vx-deps [data-vc="depvolta"]\').dataset.tag');
    const mainAntesVolta = g(REM, 'rev-parse', 'main');
    await clicar(`.vx-deps [data-vc="depvolta"][data-tag="${ultimo}"]`);
    ftx = await panelText();
    check('Voltar versão: pede confirmação explícita antes (nada mudou ainda)', /Voltar a main para antes de/.test(ftx) && /Confirmar: voltar versão/.test(ftx) && g(REM, 'rev-parse', 'main') === mainAntesVolta);
    await painel('d5-voltar-versao-confirmar', '.vx-deps');
    await clicar('[data-vc="depvoltaok"]');
    await until('volta feita', async () => /Versão voltada/.test(await panelText()), 60000);
    ftx = await panelText();
    check('Voltar versão: git revert na main, enviada sem força; pergunta se roda a receita de novo', /Versão voltada: git revert de/.test(ftx) && /Rodar a receita de deploy de novo agora/.test(ftx) && /^Revert/.test(g(REM, 'log', '-1', '--format=%s', 'main')) && g(REM, 'merge-base', '--is-ancestor', mainAntesVolta, 'main') === '' && /REVERTIDO/.test(ftx));
    await clicar('[data-vc="depvoltafim"]');
    check('main nunca reescrita: a main inicial é ancestral da final; todas as tags no remoto', g(REM, 'merge-base', '--is-ancestor', main0, 'main') === '' && tags().length === 5);
  } else {
    const ftxt = await ev('(document.querySelector("#vpForm")||{}).innerText||""');
    check('DEV2: a tela não oferece deploy; fim = enviar a branch e o handoff', !/Deploy na main/.test(ftxt) && /Fim do ciclo:/.test(ftxt));
    await ev('vibeTest.pol.salvar()');
    let x = await until('pausa do [DEPLOY] da T2', async () => { const e = await ex(); return e && e.pausa ? e : null; }, 90000);
    check('DEV2: a tarefa [DEPLOY] pausa (o Termix não publica na main)', x && x.tarefas[x.k].id === 'T2' && x.pausa.tipo === 'deploy' && g(REM, 'rev-parse', 'main') === main0);
    await ev('vibeTest.skip()');
    const fim = await until('concluído', async () => { const c = await cy(); return c && c.est && c.est.fase === 'concluido' ? c.est : null; }, 120000);
    check('fim do ciclo DEV2: o orquestrador recebeu o pedido do handoff (em arquivo)', /pedido pedido-fim-handoff ->/.test(flog()) && /HANDOFF_DEV2\.md/.test(R(path.join(VD, 'pedidos', 'pedido-fim-handoff.md'))));
    check('fim do ciclo DEV2: commit do docs/HANDOFF_DEV2.md e envio só da dev2', fim && fim.exec.fimHandoff && fim.exec.fimHandoff.ok && g(REM, 'rev-parse', 'dev2') === g(PJ, 'rev-parse', 'dev2') && g(PJ, 'show', '--name-only', '--format=', 'dev2') === 'docs/HANDOFF_DEV2.md', fim && JSON.stringify(fim.exec.fimHandoff));
    check('DEV2 nunca publica na main: main e dev1 do remoto intactas, sem tags', g(REM, 'rev-parse', 'main') === main0 && g(REM, 'rev-parse', 'dev1') === main0 && g(REM, 'tag') === '');
    const ftx = await panelText();
    check('painel do fim: handoff no commit e dev2 enviada; DEV1 avisado pelo fluxo; sem lista de deploys', /docs\/HANDOFF_DEV2\.md no commit e a dev2 enviada/.test(ftx) && !/Deploys \(versões\)/.test(ftx));
    check('notificação do fim cita o handoff', (await avisos()).some((m) => /Projeto concluído: .*HANDOFF_DEV2\.md no commit e a dev2 enviada/.test(m)));
    await painel('d6-dev2-fim-handoff');
  }
  log('erros no console:', errs.length ? errs.join('\n') : 'nenhum');
  check('sem erros no console', !errs.length);
  log(`\n${ok} OK, ${bad} FALHOU`);
  try { await ev('window.close()'); } catch {} await wait(2000); try { el.kill(); } catch {}
  process.exit(bad ? 1 : 0);
})().catch((e) => { log('ERRO', e && e.stack); process.exit(1); });
