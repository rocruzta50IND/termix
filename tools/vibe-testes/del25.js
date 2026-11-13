// DEV2-025 — teste SEM IA do "Delegar tarefa" no processo principal: duas "máquinas" (duas pastas de dados do Termix e dois
// clones de um remoto bare local): Rodrigo (DEV1) e Ygor (DEV2). Ciclo: delegar, aviso só para o Ygor, Começar, Entregar,
// vigia do Rodrigo, Analisar (só o handoff), Aprovar. Mais: branch ocupada, não responsável, projeto sem fluxo, nada forçado.
// Uso: node del25.js <raiz do Termix>
const { ROOT: ROOT_PADRAO, WORK } = require('./lib'); // raiz do repositório e pasta temporária do sistema
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = (process.argv[2] || ROOT_PADRAO), S = path.join(WORK, 'd25');
fs.rmSync(S, { recursive: true, force: true }); fs.mkdirSync(S, { recursive: true });
process.env.TERMIX_VIBE_TEST = '1';
process.env.TERMIX_VIBE_CLAUDE_JSON = path.join(S, 'claude-teste.json');
// espiona todo comando git do módulo (o index.js desestrutura execFileSync ao ser carregado: patch ANTES do require)
const LOG = []; const orig = cp.execFileSync;
cp.execFileSync = function (cmd, args, ...r) { if (cmd === 'git' && Array.isArray(args)) LOG.push(args.slice(2).join(' ')); return orig.call(this, cmd, args, ...r); };
const g = (dir, ...a) => orig('git', ['-C', dir, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const gOk = (dir, ...a) => { try { g(dir, ...a); return true; } catch { return false; } };
const W = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); };
let ok = 0, bad = 0; const check = (n, c, extra = '') => { if (c) ok++; else bad++; console.log(`${c ? 'OK  ' : 'FALHOU'} ${n}${extra ? ' — ' + extra : ''}`); };
const cfgU = (d, b) => { g(d, 'config', 'user.name', b); g(d, 'config', 'user.email', `${b}@t`); };
const mk = (nome) => require(path.join(ROOT, 'src/vibe/index.js')).create({ ipcMain: null, app: { getPath: () => path.join(S, `ud-${nome}`) }, dialog: null, getWin: () => null, logError: (e) => console.log('logError', e && e.message) });
// duas máquinas = dois módulos com pastas de dados diferentes
const ROD = mk('rodrigo'), YGO = mk('ygor');
const PID = 'projx';

const REM = path.join(S, 'remoto.git'), BASE = path.join(S, 'base');
orig('git', ['init', '-q', '--bare', '-b', 'master', REM]);
orig('git', ['clone', '-q', REM, BASE], { stdio: 'ignore' }); cfgU(BASE, 'base');
W(path.join(BASE, 'README.md'), '# X\n'); W(path.join(BASE, 'src/app.js'), 'console.log(1)\n'); W(path.join(BASE, 'docs/HANDOFF_DEV2.md'), '# HANDOFF DEV2\n\nvazio\n');
W(path.join(BASE, '.claude/fluxo.json'), JSON.stringify({ versao_fluxo: 1, projeto: 'X', devs: ['dev2'], validacao: ['npm run check'] }, null, 2) + '\n');
W(path.join(BASE, '.gitignore'), 'CLAUDE.local.md\n');
g(BASE, 'add', '-A'); g(BASE, 'commit', '-qm', 'inicio'); g(BASE, 'push', '-q', 'origin', 'master');
for (const b of ['dev1', 'dev2']) g(BASE, 'push', '-q', 'origin', `master:${b}`);
const MASTER0 = g(BASE, 'rev-parse', 'master');
const local = (md, papel, branch) => W(path.join(md, 'CLAUDE.local.md'), `usuario:\n  nome: "x"\n\npapel: "${papel}"\nbranch_padrao: "${branch}"\n`);
const RDIR = path.join(S, 'rodrigo'), YDIR = path.join(S, 'ygor');
for (const [d, b, papel] of [[RDIR, 'dev1', 'DEV1'], [YDIR, 'dev2', 'DEV2']]) {
  orig('git', ['clone', '-q', REM, d], { stdio: 'ignore' }); cfgU(d, path.basename(d));
  g(d, 'checkout', '-q', b); local(d, papel, b);
}
const rem = (...a) => g(REM, ...a);
const MD = (t, extra = '') => `# ${t}\n\n## Objetivo\nFazer ${t}.\n\n## Contexto\nProjeto X, tela simples.\n\n## O que ler\nsrc/app.js\n\n## Critério de pronto\nA tela mostra o texto e o teste passa.\n\n## O que não fazer\nNão mexer em docs/ nem na main.\n\n## Resultado esperado\nHandoff com o que mudou e como validar.\n${extra}`;

(async () => {
  // ---- contas (mock) e quem pode ----
  check('contas: lista fixa dos 5 nomes', JSON.stringify(ROD.delegConta().contas) === JSON.stringify(['Ygor', 'Zanata', 'Rodrigo', 'Glayon', 'Gilbram']) && ROD.delegConta().mock === true);
  check('conta desconhecida é recusada', ROD.delegContaSet('Fulano').ok === false && ROD.delegConta().conta === '');
  let i = ROD.delegInfo(RDIR);
  check('sem conta escolhida: não pode e explica', !i.pode && /Conta neste PC/.test(i.motivo), i.motivo);
  check('Rodrigo escolhe a conta', ROD.delegContaSet('Rodrigo').ok && ROD.delegConta().conta === 'Rodrigo');
  check('conta gravada na pasta de dados desta máquina (a do Ygor segue vazia)', YGO.delegConta().conta === '');
  i = ROD.delegInfo(RDIR);
  check('responsável (DEV1, fluxo, remoto): pode; branch sugerida dev2', i.pode && i.dono && i.sugerida === 'dev2' && i.ocupadas.length === 0, JSON.stringify(i).slice(0, 200));
  check('dropdown: 4 contas, sem a do próprio responsável', i.contas.length === 4 && !i.contas.includes('Rodrigo') && i.contas.includes('Ygor'));
  YGO.delegContaSet('Ygor');
  const iy = YGO.delegInfo(YDIR);
  check('não responsável (DEV2): não pode, explica', !iy.pode && !iy.dono && /DEV2/.test(iy.motivo) && /DEV1/.test(iy.motivo), iy.motivo);
  const SF = path.join(S, 'semfluxo'); orig('git', ['clone', '-q', REM, SF], { stdio: 'ignore' }); g(SF, 'checkout', '-q', 'master'); g(SF, 'rm', '-q', '-r', '.claude'); g(SF, 'commit', '-qm', 'sem fluxo'); local(SF, 'DEV1', 'dev1');
  const isf = ROD.delegInfo(SF);
  check('projeto sem fluxo: explica que precisa do fluxo e não faz nada', !isf.pode && !isf.fluxo && /precisa do fluxo/.test(isf.motivo) && !(await ROD.delegPedido(PID, SF, { para: 'Ygor', branch: 'dev2', resumo: 'x' })).ok);
  // DEV1 fora da branch dele
  g(RDIR, 'checkout', '-q', 'master'); const ifora = ROD.delegInfo(RDIR); g(RDIR, 'checkout', '-q', 'dev1');
  check('responsável fora da dev1: não pode e explica', !ifora.pode && /dev1/.test(ifora.motivo), ifora.motivo);

  // ---- pedido ao orquestrador (em arquivo) e conferência ----
  check('pedido: para a própria conta é recusado', !ROD.delegPedido(PID, RDIR, { para: 'Rodrigo', branch: 'dev2', resumo: 'x' }).ok);
  check('pedido: branch fora de dev2..dev5 é recusada', !ROD.delegPedido(PID, RDIR, { para: 'Ygor', branch: 'main', resumo: 'x' }).ok);
  check('pedido: sem texto é recusado', !ROD.delegPedido(PID, RDIR, { para: 'Ygor', branch: 'dev2', resumo: '  ' }).ok);
  const p1 = ROD.delegPedido(PID, RDIR, { para: 'Ygor', branch: 'dev2', resumo: 'Trocar o texto da tela inicial' });
  const txtPed = fs.readFileSync(p1.linha.replace('Vibe do Termix: leia e siga ', ''), 'utf8');
  check('pedido: o orquestrador recebe as 6 seções e a proibição de código/commit', p1.ok && /Objetivo/.test(txtPed) && /Critério de pronto/.test(txtPed) && /O que não fazer/.test(txtPed) && /Resultado esperado/.test(txtPed) && /Não altere o código, não faça commit/.test(txtPed) && txtPed.includes(p1.arquivo));
  let c = ROD.delegConferir(PID, p1.did);
  check('conferir: sem a tarefa escrita ainda', !c.ok && /ainda não gravou/.test(c.problemas[0]));
  W(p1.arquivo, MD('Trocar o texto').replace(/## Resultado esperado[\s\S]*/, ''));
  c = ROD.delegConferir(PID, p1.did);
  check('conferir: falta seção', !c.ok && /Resultado esperado/.test(c.problemas.join(' ')), c.problemas.join('|'));
  W(p1.arquivo, MD('Trocar o texto', 'senha = abcdef12345678\n'));
  c = ROD.delegConferir(PID, p1.did);
  check('conferir: segredo no texto é barrado', !c.ok && /segredo/.test(c.problemas.join(' ')));
  W(p1.arquivo, MD('Trocar o texto'));
  c = ROD.delegConferir(PID, p1.did);
  check('conferir: tarefa completa passa (título lido)', c.ok && c.titulo === 'Trocar o texto' && c.texto.includes('## Objetivo'));

  // ---- enviar: commit só na dev1; a dev2 não é tocada ----
  const dev2Antes = rem('rev-parse', 'dev2');
  const e1 = ROD.delegEnviar(PID, RDIR, p1.did);
  check('enviar: ok, commit na dev1', e1.ok && e1.dono === 'dev1' && /^DELEGAR: pedido/.test(g(RDIR, 'log', '-1', '--format=%s')), JSON.stringify(e1));
  check('remoto: dev1 tem o pedido e o índice', rem('cat-file', '-e', `dev1:.termix/delegar/${p1.did}.md`) === '' && /"estado": "enviado"/.test(rem('show', 'dev1:.termix/delegar/indice.json')));
  check('remoto: a dev2 NÃO foi tocada (o pedido não vai na branch do dev)', rem('rev-parse', 'dev2') === dev2Antes && !/\.termix/.test(rem('ls-tree', '-r', '--name-only', 'dev2')));
  check('remoto: a master não mudou', rem('rev-parse', 'master') === MASTER0);
  check('dev2 já existia no fluxo.json: o arquivo não mudou (sem registro duplicado)', e1.registrou === false && e1.criouBranch === false);
  check('só os arquivos do pedido no commit', g(RDIR, 'show', '--name-only', '--format=', 'HEAD').split('\n').sort().join(',') === `.termix/delegar/${p1.did}.md,.termix/delegar/indice.json`);
  i = ROD.delegInfo(RDIR);
  check('branch ocupada: a sugerida passa para a dev3', i.pode && i.ocupadas.join() === 'dev2' && i.sugerida === 'dev3' && i.livres.join() === 'dev3,dev4,dev5', JSON.stringify([i.ocupadas, i.sugerida]));
  check('pedido para a branch ocupada é recusado', !ROD.delegPedido(PID, RDIR, { para: 'Zanata', branch: 'dev2', resumo: 'x' }).ok);

  // ---- aviso só para o Ygor ----
  let cx = ROD.delegCaixa(RDIR);
  check('o aviso NÃO aparece para o responsável (Rodrigo)', cx.pedidos.length === 0);
  YGO.delegContaSet('Zanata');
  check('o aviso NÃO aparece para outra conta (Zanata)', YGO.delegCaixa(YDIR).pedidos.length === 0);
  YGO.delegContaSet('Ygor');
  cx = YGO.delegCaixa(YDIR);
  check('o aviso aparece para o Ygor, com resumo e estado enviado', cx.pedidos.length === 1 && cx.pedidos[0].id === p1.did && cx.pedidos[0].estado === 'enviado' && cx.pedidos[0].de === 'Rodrigo' && cx.pedidos[0].titulo === 'Trocar o texto' && cx.pedidos[0].branch === 'dev2', JSON.stringify(cx).slice(0, 200));
  check('nada começou sozinho: a dev2 local do Ygor está como antes', g(YDIR, 'rev-parse', 'HEAD') === dev2Antes && g(YDIR, 'branch', '--show-current') === 'dev2');
  check('a vigia do responsável vê o pedido "enviado" (sem marcador ainda)', ROD.delegPainel(RDIR).pedidos[0].estado === 'enviado');

  // ---- Começar ----
  W(path.join(YDIR, 'README.md'), '# X mudado\n'); // mudança não salva (tracked)
  let cm = YGO.delegComecar(PID, YDIR, p1.did);
  check('Começar com mudanças não salvas: recusa e nada é descartado', !cm.ok && /não salvas/.test(cm.motivo) && fs.readFileSync(path.join(YDIR, 'README.md'), 'utf8') === '# X mudado\n', cm.motivo);
  g(YDIR, 'checkout', '--', 'README.md');
  const noPasta = YGO.delegComecar(PID, path.join(S, 'nao-existe'), p1.did);
  check('projeto sem pasta neste Termix: explica que é preciso adicionar a pasta', !noPasta.ok && /Adicione a pasta/.test(noPasta.motivo));
  const ROD2 = YGO.delegComecar(PID, YDIR, 'd-20200101000000-zzz');
  check('Começar com pedido que não existe é recusado', !ROD2.ok);
  cm = YGO.delegComecar(PID, YDIR, p1.did);
  check('Começar: ok na dev2, marcador enviado', cm.ok && cm.branch === 'dev2' && cm.enviado === true && !cm.aviso, JSON.stringify(cm));
  const mrc = JSON.parse(rem('show', `dev2:.termix/delegar/estado-${p1.did}.json`));
  check('remoto: dev2 tem o marcador em_andamento (só estado e data)', mrc.estado === 'em_andamento' && mrc.conta === 'Ygor' && mrc.data && Object.keys(mrc).sort().join() === 'branch,conta,data,id,iniciado,estado,versao'.split(',').sort().join(), JSON.stringify(mrc));
  check('Começar sincronizou com a dev1 (o pedido veio junto) sem merge forçado', gOk(YDIR, 'merge-base', '--is-ancestor', 'origin/dev1', 'HEAD') && fs.existsSync(path.join(YDIR, '.termix/delegar', `${p1.did}.md`)));
  check('o pedido ficou num arquivo do módulo para o orquestrador', fs.existsSync(cm.arquivo) && /## Resultado esperado/.test(fs.readFileSync(cm.arquivo, 'utf8')));
  check('commit do marcador: só o marcador', g(YDIR, 'show', '--name-only', '--format=', 'HEAD') === `.termix/delegar/estado-${p1.did}.json`);
  const linhaC = YGO.delegComecarPrompt(PID, p1.did);
  check('prompt do orquestrador de quem recebe: pedido em arquivo, só a branch atual', /leia e siga/.test(linhaC) && /só na branch atual/.test(fs.readFileSync(linhaC.replace('Vibe do Termix: leia e siga ', ''), 'utf8')));
  const vr = YGO.delegVibe(PID, p1.did);
  const rasc = JSON.parse(fs.readFileSync(path.join(S, 'ud-ygor/vibe', PID, 'rascunho.json'), 'utf8'));
  check('"Seguir com Vibe de tarefa": rascunho preenchido pelas seções', vr.ok && /Trocar o texto/.test(rasc.tarefa.oQue) && /teste passa/.test(rasc.tarefa.criterio) && /Não mexer em docs/.test(rasc.tarefa.naoPode) && /src\/app\.js/.test(rasc.tarefa.arquivos) && rasc.delegar === p1.did);
  cx = YGO.delegCaixa(YDIR);
  check('caixa do Ygor agora em andamento', cx.pedidos[0].estado === 'em_andamento');
  const cm2 = YGO.delegComecar(PID, YDIR, p1.did);
  check('Começar de novo retoma sem novo commit', cm2.ok && cm2.retomado === true && g(YDIR, 'rev-parse', 'HEAD') === g(YDIR, 'rev-parse', 'origin/dev2'));

  // ---- vigia do responsável: lê só o marcador ----
  const mark0 = LOG.length;
  let pn = ROD.delegPainel(RDIR);
  const cmds = LOG.slice(mark0);
  check('vigia do Rodrigo vê "em andamento" e a data de início', pn.pedidos[0].estado === 'em_andamento' && !!pn.pedidos[0].datas.iniciado && pn.pedidos[0].para === 'Ygor');
  const cmdsDev2 = cmds.filter((x) => /dev2/.test(x));
  check('trava de contexto: a vigia só faz fetch da dev2 e lê o marcador (nada de log, diff ou código)', cmdsDev2.length > 0 && cmdsDev2.every((x) => /^fetch --quiet origin dev2$/.test(x) || x === `show refs/remotes/origin/dev2:.termix/delegar/estado-${p1.did}.json`), cmdsDev2.join(' || '));
  check('o que o Rodrigo tem no disco: nada da dev2 foi trazido para a dev1', !fs.existsSync(path.join(RDIR, `.termix/delegar/estado-${p1.did}.json`)) && g(RDIR, 'branch', '--show-current') === 'dev1');

  // ---- Entregar ----
  let en = YGO.delegEntregar(PID, YDIR, p1.did);
  check('Entregar sem o handoff novo: recusa', !en.ok && /(não gravou|anterior ao início)/.test(en.motivo), en.motivo);
  const pe = YGO.delegEntregarPrompt(PID, YDIR, p1.did);
  check('prompt de entrega: o orquestrador reescreve o HANDOFF_DEV2 e não faz commit', /HANDOFF_DEV2\.md/.test(fs.readFileSync(pe.replace('Vibe do Termix: leia e siga ', ''), 'utf8')) && /Não faça commit nem push/.test(fs.readFileSync(pe.replace('Vibe do Termix: leia e siga ', ''), 'utf8')));
  await new Promise((r) => setTimeout(r, 1500));
  W(path.join(YDIR, 'docs/HANDOFF_DEV2.md'), '# HANDOFF DEV2 → DEV1\n\nTroquei o texto da tela e validei; o teste passa. Risco baixo.\n');
  W(path.join(YDIR, 'src/app.js'), 'console.log("novo texto")\n'); g(YDIR, 'add', 'src/app.js'); g(YDIR, 'commit', '-qm', 'DEV2-001: troca o texto'); // trabalho do dev (nunca lido pelo responsável)
  en = YGO.delegEntregar(PID, YDIR, p1.did);
  check('Entregar: handoff e marcador entregue, push só da dev2', en.ok && en.branch === 'dev2' && rem('rev-parse', 'dev2') === g(YDIR, 'rev-parse', 'HEAD'), JSON.stringify(en));
  const me = JSON.parse(rem('show', `dev2:.termix/delegar/estado-${p1.did}.json`));
  check('remoto: marcador entregue com a data e o caminho do handoff', me.estado === 'entregue' && me.handoff === 'docs/HANDOFF_DEV2.md' && me.iniciado === mrc.iniciado && me.data >= mrc.data);
  check('o commit de entrega leva só o handoff e o marcador', g(YDIR, 'show', '--name-only', '--format=', 'HEAD').split('\n').sort().join() === `.termix/delegar/estado-${p1.did}.json,docs/HANDOFF_DEV2.md`);
  check('remoto: a dev1 e a master não mudaram com a entrega', rem('rev-parse', 'master') === MASTER0 && !/novo texto/.test(rem('show', 'dev1:src/app.js')));

  // ---- sino: o responsável percebe a entrega ----
  const m1 = LOG.length;
  pn = ROD.delegPainel(RDIR);
  const c1 = LOG.slice(m1).filter((x) => /dev2/.test(x));
  check('vigia do Rodrigo: entregue (para o sino), de novo só marcador', pn.pedidos[0].estado === 'entregue' && !!pn.pedidos[0].datas.entregue && c1.every((x) => /^fetch --quiet origin dev2$/.test(x) || x === `show refs/remotes/origin/dev2:.termix/delegar/estado-${p1.did}.json`), c1.join(' || '));
  check('antes de analisar: o código da dev2 não está no disco do Rodrigo', !gOk(RDIR, 'cat-file', '-e', 'HEAD:src/app.js') || !/novo texto/.test(fs.readFileSync(path.join(RDIR, 'src/app.js'), 'utf8')));

  // ---- Analisar: só o handoff ----
  const m2 = LOG.length;
  const an = ROD.delegAnalisar(PID, RDIR, p1.did);
  const c2 = LOG.slice(m2).filter((x) => /dev2/.test(x));
  check('Analisar: extrai só o handoff e monta o pedido', an.ok && /Troquei o texto da tela/.test(fs.readFileSync(an.arquivo, 'utf8')));
  check('trava de contexto: Analisar só buscou a dev2 e leu o marcador e o HANDOFF_DEV2.md', c2.length > 0 && c2.every((x) => /^fetch --quiet origin dev2$/.test(x) || x === `show refs/remotes/origin/dev2:.termix/delegar/estado-${p1.did}.json` || x === 'show refs/remotes/origin/dev2:docs/HANDOFF_DEV2.md'), c2.join(' || '));
  const ta = fs.readFileSync(an.linha.replace('Vibe do Termix: leia e siga ', ''), 'utf8');
  check('pedido de análise: APENAS o pedido original e o handoff; proíbe diff/log/código', /APENAS/.test(ta) && /NÃO leia diff, log, código/.test(ta) && ta.includes(an.arquivo));
  const dec0 = ROD.delegDecidir(PID, RDIR, 'd-20200101000000-zzz', 'aprovado', '');
  check('decidir pedido que não existe: recusa', !dec0.ok);

  // ---- segundo pedido: dev3 criada a partir da dev1 e registrada no fluxo.json; Começar troca de branch ----
  const p2 = ROD.delegPedido(PID, RDIR, { para: 'Ygor', branch: 'dev3', resumo: 'Segunda tarefa' });
  W(p2.arquivo, MD('Segunda tarefa'));
  const antes3 = gOk(REM, 'rev-parse', '--verify', '-q', 'refs/heads/dev3');
  const e2 = ROD.delegEnviar(PID, RDIR, p2.did);
  check('2º pedido: dev3 não existia e foi criada a partir da dev1 (sem força)', e2.ok && !antes3 && e2.criouBranch === true && rem('rev-parse', 'dev3') === g(RDIR, 'rev-parse', 'HEAD~1'), JSON.stringify(e2));
  check('2º pedido: dev3 registrada em .claude/fluxo.json (só o acréscimo)', e2.registrou && JSON.parse(rem('show', 'dev1:.claude/fluxo.json')).devs.join() === 'dev2,dev3' && JSON.parse(rem('show', 'dev1:.claude/fluxo.json')).projeto === 'X' && g(RDIR, 'show', '--name-only', '--format=', 'HEAD').includes('.claude/fluxo.json'));
  const an2 = ROD.delegAnalisar(PID, RDIR, p2.did);
  check('Analisar antes da entrega: recusa', !an2.ok && /não foi marcado como entregue/.test(an2.motivo));
  check('Aprovar antes da entrega: recusa', !ROD.delegDecidir(PID, RDIR, p2.did, 'aprovado', '').ok);
  // o Ygor recebe o 2º: troca para a dev3 (nova), mas o papel local diz DEV2 → recusa sem forçar
  cx = YGO.delegCaixa(YDIR);
  check('Ygor vê os dois pedidos (um entregue, um enviado)', cx.pedidos.length === 2 && cx.pedidos.map((x) => x.estado).sort().join() === 'entregue,enviado', JSON.stringify(cx.pedidos.map((x) => x.estado)));
  const cm3 = YGO.delegComecar(PID, YDIR, p2.did);
  check('2º Começar: troca para a dev3, mas o papel local não bate: recusa explicando (nada forçado)', !cm3.ok && /\/fluxo:papel/.test(cm3.motivo) && g(YDIR, 'branch', '--show-current') === 'dev3', cm3.motivo);
  fs.rmSync(path.join(YDIR, 'CLAUDE.local.md'));
  const cm4 = YGO.delegComecar(PID, YDIR, p2.did);
  check('sem CLAUDE.local.md: o Termix cria o papel DEV3 e começa', cm4.ok && cm4.papelCriado && /papel: "DEV3"/.test(fs.readFileSync(path.join(YDIR, 'CLAUDE.local.md'), 'utf8')) && JSON.parse(rem('show', `dev3:.termix/delegar/estado-${p2.did}.json`)).estado === 'em_andamento', JSON.stringify(cm4));
  check('a dev2 do Ygor e a entrega dela ficaram intactas', g(YDIR, 'rev-parse', 'dev2') === rem('rev-parse', 'dev2'));

  // ---- Aprovar / Reprovar: grava no índice (dev1); não integra ----
  const dev1Antes = rem('rev-parse', 'dev1');
  const ap = ROD.delegDecidir(PID, RDIR, p1.did, 'aprovado', 'Atende ao pedido');
  const idxR = JSON.parse(rem('show', 'dev1:.termix/delegar/indice.json')).pedidos.find((x) => x.id === p1.did);
  check('Aprovar: gravado no índice da dev1, com data e motivo', ap.ok && idxR.estado === 'aprovado' && idxR.decidido && idxR.motivo === 'Atende ao pedido' && rem('rev-parse', 'dev1') !== dev1Antes, JSON.stringify(ap).slice(0, 200));
  check('Aprovar NÃO junta branches (a integração continua manual)', !gOk(REM, 'merge-base', '--is-ancestor', 'dev2', 'dev1') && /continua manual/.test(ap.integracao) && !LOG.some((x) => /^merge .*dev2/.test(x) && false));
  check('decidir de novo: recusa (já aprovado)', !ROD.delegDecidir(PID, RDIR, p1.did, 'reprovado', '').ok);
  pn = ROD.delegPainel(RDIR);
  check('painel: aprovado (dev2 liberada), 2º em andamento', pn.pedidos.find((x) => x.id === p1.did).estado === 'aprovado' && pn.pedidos.find((x) => x.id === p2.did).estado === 'em_andamento' && pn.pedidos.find((x) => x.id === p1.did).datas.decidido);
  i = ROD.delegInfo(RDIR);
  check('dev2 volta a ficar livre e vira a sugerida', i.ocupadas.join() === 'dev3' && i.sugerida === 'dev2');
  cx = YGO.delegCaixa(YDIR);
  check('Ygor vê o 1º como aprovado', cx.pedidos.find((x) => x.id === p1.did).estado === 'aprovado');
  // reprovar o 2º: o Ygor entrega e o Rodrigo reprova
  await new Promise((r) => setTimeout(r, 1500));
  W(path.join(YDIR, 'docs/HANDOFF_DEV3.md'), '# HANDOFF DEV3\n\nfeito pela metade.\n');
  const en2 = YGO.delegEntregar(PID, YDIR, p2.did);
  const rp = en2.ok && ROD.delegDecidir(PID, RDIR, p2.did, 'reprovado', 'Faltou o teste');
  check('Reprovar: gravado no índice com o motivo', rp.ok && JSON.parse(rem('show', 'dev1:.termix/delegar/indice.json')).pedidos.find((x) => x.id === p2.did).estado === 'reprovado');
  check('commit de decisão só mexe no índice', g(RDIR, 'show', '--name-only', '--format=', 'HEAD') === '.termix/delegar/indice.json');

  // ---- nada forçado nem descartado ----
  const todos = LOG.join('\n');
  check('nenhum comando forçado ou destrutivo (force, -f, reset, clean, branch -D, stash drop, rebase)', !/--force|\bpush -f\b|\breset\b|\bclean\b|branch -D|stash drop|\brebase\b|checkout --\s*\./.test(todos.replace(/^checkout -- README\.md$/gm, '')), (todos.match(/--force|reset|clean|rebase/g) || []).join());
  check('os únicos push foram para dev1, dev2 e dev3 (nunca master/main)', LOG.filter((x) => /^push /.test(x)).every((x) => /refs\/heads\/(dev1|dev2|dev3)(:refs\/heads\/dev[123])?$/.test(x) && !/master|main/.test(x)), LOG.filter((x) => /^push /.test(x)).join(' | '));
  check('a master do remoto nunca mudou', rem('rev-parse', 'master') === MASTER0);
  console.log(`\n${ok} OK, ${bad} FALHAS`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.log('ERRO', e); process.exit(2); });
