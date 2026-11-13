// Teste sem tokens da implementação automática do Mutirão (DEV2-006). Uso: node mod6.js <raiz do Termix>
// Remoto bare local, dono (dev1, fluxo com papel DEV1), sócios Ana (dev2) e Bia (dev3). Entregas por script.
const { ROOT: ROOT_PADRAO, WORK } = require('./lib'); // raiz do repositório e pasta temporária do sistema
const fs = require('fs'), path = require('path'); const { execFileSync } = require('child_process');
const ROOT = (process.argv[2] || ROOT_PADRAO), S = path.join(WORK, 'm6');
fs.rmSync(S, { recursive: true, force: true }); fs.mkdirSync(S, { recursive: true });
process.env.TERMIX_VIBE_TEST = '1';
process.env.TERMIX_VIBE_CLAUDE_JSON = path.join(S, 'claude-teste.json');
fs.writeFileSync(process.env.TERMIX_VIBE_CLAUDE_JSON, '{"projects":{}}');
const g = (dir, ...a) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const gq = (dir, ...a) => { try { return g(dir, ...a); } catch (e) { return null; } };
const W = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); };
let ok = 0, bad = 0; const check = (n, c, extra = '') => { if (c) ok++; else bad++; console.log(`${c ? 'OK  ' : 'FALHOU'} ${n}${extra ? ' — ' + extra : ''}`); };
const MD = (t) => ['Objetivo', 'Público e usuários', 'Funcionalidades', 'Fora do escopo', 'Telas e fluxos', 'Dados e regras de negócio', 'Integrações e acessos', 'Tecnologia', 'Critério de pronto'].map((h) => `## ${h}\n${t}: conteúdo de ${h}.\n`).join('\n');

const handlers = {};
const UD = path.join(S, 'ud');
const vibe = require(path.join(ROOT, 'src/vibe/index.js')).create({ ipcMain: { handle: (ch, fn) => { handlers[ch] = fn; } }, app: { getPath: () => UD }, dialog: null, getWin: () => null, logError: (e) => console.log('logError', e && e.message) });
const call = (ch, ...a) => handlers[`vibe:${ch}`]({}, ...a);
const { decide } = require(path.join(ROOT, 'src/vibe/trava.js'));

// cenário: tag = 'a' (sem conflito) ou 'b' (Ana e Bia mexem no mesmo arquivo)
async function cenario(tag, conflito) {
  const B = path.join(S, tag), REM = path.join(B, 'remoto.git'), DONO = path.join(B, 'dono');
  execFileSync('git', ['init', '-q', '--bare', '-b', 'master', REM]);
  execFileSync('git', ['clone', '-q', REM, DONO], { stdio: 'ignore' });
  g(DONO, 'config', 'user.name', 'Dono'); g(DONO, 'config', 'user.email', 'dono@t');
  W(path.join(DONO, 'README.md'), '# Brinquedo\n'); W(path.join(DONO, 'src/a.js'), '1\n'); W(path.join(DONO, 'src/b.js'), '2\n');
  W(path.join(DONO, '.claude/fluxo.json'), '{"validacao":[]}\n'); W(path.join(DONO, '.gitignore'), 'CLAUDE.local.md\n');
  g(DONO, 'add', '-A'); g(DONO, 'commit', '-qm', 'inicio'); g(DONO, 'push', '-q', 'origin', 'master');
  for (const b of ['dev1', 'dev2', 'dev3']) { g(DONO, 'branch', b); g(DONO, 'push', '-q', 'origin', b); }
  g(DONO, 'switch', '-q', 'dev1');
  W(path.join(DONO, 'CLAUDE.local.md'), 'papel: "DEV1"\nbranch_padrao: "dev1"\n');
  const id = `proj-${tag}`;
  await call('mutIniciar', id, { nome: `Brinquedo ${tag}`, pasta: DONO }, [{ nome: 'Ana', branch: 'dev2' }, { nome: 'Bia', branch: 'dev3' }]);
  W(path.join(DONO, 'mutirao/divisao.json'), JSON.stringify({ branchDono: 'dev1', objetivo: 'Brinquedo com a e b prontos', criterio: 'a.js e b.js com o valor final', participantes: [{ nome: 'Ana', branch: 'dev2' }, { nome: 'Bia', branch: 'dev3' }], partes: [{ branch: 'dev2', titulo: 'Parte A', objetivo: 'a.js', criterio: 'a.js = A', arquivos: ['src/a.js'] }, { branch: 'dev3', titulo: 'Parte B', objetivo: 'b.js', criterio: 'b.js = B', arquivos: ['src/b.js'] }] }, null, 2));
  W(path.join(DONO, 'mutirao/partes/dev2.md'), MD('Ana')); W(path.join(DONO, 'mutirao/partes/dev3.md'), MD('Bia'));
  const pub = await call('mutPublicar', id);
  // sócios: clone, sincroniza com a dev1, commit da parte e da entrega (por script, sem rodar o Vibe), push só da branch
  for (const [b, nome, arq] of [['dev2', 'Ana', 'src/a.js'], ['dev3', 'Bia', 'src/b.js']]) {
    const C = path.join(B, nome.toLowerCase());
    execFileSync('git', ['clone', '-q', REM, C], { stdio: 'ignore' });
    g(C, 'config', 'user.name', nome); g(C, 'config', 'user.email', `${nome}@t`);
    g(C, 'switch', '-q', b); g(C, 'merge', '-q', '--ff-only', 'origin/dev1');
    W(path.join(C, arq), `${b === 'dev2' ? 'A' : 'B'}\n`);
    if (conflito) W(path.join(C, 'README.md'), `# Brinquedo\n\nNota da ${nome}.\n`);
    g(C, 'add', '-A'); g(C, 'commit', '-qm', `${nome}: parte`);
    W(path.join(C, `mutirao/entregas/${b}.json`), JSON.stringify({ versao: 1, branch: b, data: new Date().toISOString(), titulo: `Parte ${nome}`, commits: [], tarefas: [{ id: 'T1', titulo: `fazer ${arq}` }], resumo: `${nome} fez ${arq}.` }));
    g(C, 'add', '-A'); g(C, 'commit', '-qm', `Mutirao: entrega da parte ${b}`); g(C, 'push', '-q', 'origin', b);
  }
  return { B, REM, DONO, id, pub };
}

(async () => {
  /* ---------- Caso A: sem conflito ---------- */
  const A = await cenario('a', false);
  check('A: divisão publicada', A.pub && A.pub.ok, A.pub && A.pub.motivo);
  const masterA = g(A.DONO, 'rev-parse', 'origin/master');
  const ct = await call('mutContador', A.id);
  check('A: contador 2/2', ct.k === 2 && ct.n === 2);
  // working tree sujo impede a junção, com aviso claro, sem mexer em nada
  W(path.join(A.DONO, 'src/a.js'), 'sujo\n');
  let pr = await call('mutAutoPrep', A.id);
  check('working tree sujo impede a junção com aviso', !pr.ok && pr.sujo && /mudanças sem commit \(src\/a\.js\)/.test(pr.motivo), pr.motivo);
  check('working tree sujo: a mudança continua lá', fs.readFileSync(path.join(A.DONO, 'src/a.js'), 'utf8') === 'sujo\n' && g(A.DONO, 'log', '--oneline').split('\n').length === 2);
  W(path.join(A.DONO, 'src/a.js'), '1\n'); // o teste desfaz a própria sujeira
  // HEAD fora da branch do dono: o Termix volta para ela (sem descartar nada)
  g(A.DONO, 'switch', '-q', 'master');
  pr = await call('mutAutoPrep', A.id);
  check('prep: volta para a dev1 e confere as entregas', pr.ok && pr.branch === 'dev1' && g(A.DONO, 'branch', '--show-current') === 'dev1' && pr.participantes.length === 2, JSON.stringify(pr).slice(0, 160));
  const j1 = await call('mutAutoJuntar', A.id, 'dev2');
  const j2 = await call('mutAutoJuntar', A.id, 'dev3');
  check('A: junção dev2 ok', j1.ok && j1.juncao.status === 'ok' && j1.auto.k === 1);
  check('A: junção dev3 ok e fase "juntado"', j2.ok && j2.juncao.status === 'ok' && j2.auto.k === 2 && j2.auto.fase === 'juntado');
  const logA = g(A.DONO, 'log', '--format=%s', '-3');
  check('A: commits "Mutirão: integrar <branch> (<nome>)" com --no-ff', /Mutirão: integrar dev3 \(Bia\)/.test(logA) && /Mutirão: integrar dev2 \(Ana\)/.test(logA) && g(A.DONO, 'rev-list', '--merges', '--count', 'dev1') === '2', logA.replace(/\n/g, ' | '));
  check('A: a.js e b.js das sócias na dev1', fs.readFileSync(path.join(A.DONO, 'src/a.js'), 'utf8').trim() === 'A' && fs.readFileSync(path.join(A.DONO, 'src/b.js'), 'utf8').trim() === 'B');
  check('A: main/master intacta (local e remoto)', g(A.DONO, 'rev-parse', 'master') === masterA && g(A.REM, 'rev-parse', 'master') === masterA);
  const j3 = await call('mutAutoJuntar', A.id, 'dev2');
  check('junção depois de "juntado" é recusada', !j3.ok);
  const en = await call('mutAutoEntrega', A.id, { maxTarefas: 2 });
  const E = JSON.parse(fs.readFileSync(path.join(UD, 'vibe', A.id, 'entrega.json'), 'utf8'));
  const est = fs.readFileSync(path.join(UD, 'vibe', A.id, 'estrutura.md'), 'utf8');
  check('A: entrega sintética gravada (objetivo e critério da divisão, sem conflitos)', en.ok && E.status === 'pronta' && E.objetivo === 'Brinquedo com a e b prontos' && /a\.js e b\.js/.test(E.criterioDePronto) && E.mutirao.conflitos.length === 0 && E.mutirao.maxTarefas === 2);
  check('A: estrutura com partes, entregas e junções', /Ana fez src\/a\.js/.test(est) && /integrada \(commit/.test(est) && /Nenhum: todas as entregas entraram/.test(est));
  check('A: fluxo.md com mermaid', /```mermaid/.test(fs.readFileSync(path.join(UD, 'vibe', A.id, 'fluxo.md'), 'utf8')));
  // pedido em arquivo: uma linha curta; as instruções ficam em vibe\<id>\pedidos\
  const pl = await call('cicloPrompt', A.id, 'plano');
  const plf = path.join(UD, 'vibe', A.id, 'pedidos', 'pedido-plano.md');
  const plt = fs.readFileSync(plf, 'utf8');
  check('pedido do plano: uma linha curta que aponta para o arquivo', pl.startsWith('Vibe do Termix: leia e siga ') && pl.endsWith('pedido-plano.md') && !pl.includes('\n') && pl.length < 200, `${pl.length} caracteres`);
  check('A: pedido do plano final (entregas, branch do dono, no máximo 2 tarefas, sem conflitos)', /implementação automática/.test(plt) && /branch "dev1"/.test(plt) && /no máximo 2 tarefas/.test(plt) && !/Resolver o conflito/.test(plt) && /validação final/.test(plt) && /Branch de trabalho: dev1/.test(plt) && plt.includes('Grave na pasta ' + path.join(UD, 'vibe', A.id) + ' (não na pasta pedidos)'));
  W(path.join(UD, 'vibe', A.id, 'plano.md'), 'Branch de trabalho: dev1\n\n## T1 — Ligar\nx\n## T2 — Validar\ny\n');
  const dv = await call('execPrompt', A.id, 'dev', 'T1');
  const rv = await call('execPrompt', A.id, 'revisao', 'T1', { sha: 'abc' });
  const rf = await call('execPrompt', A.id, 'refazer', 'T1', { revisao: true });
  check('pedidos do Dev, da revisão e da refação em arquivo', [dv, rv, rf].every((x) => x && x.startsWith('Vibe do Termix: leia e siga ') && x.length < 200) && /Commit só na branch "dev1"/.test(fs.readFileSync(path.join(UD, 'vibe', A.id, 'pedidos', 'pedido-T1-dev.md'), 'utf8')) && fs.existsSync(path.join(UD, 'vibe', A.id, 'pedidos', 'pedido-T1-revisao.md')) && fs.existsSync(path.join(UD, 'vibe', A.id, 'pedidos', 'pedido-T1-refazer.md')));
  const fc = await call('cicloPrompt', A.id, 'fechar');
  check('pedido de fechar em arquivo', fc && fc.endsWith('pedido-fechar.md') && fs.existsSync(path.join(UD, 'vibe', A.id, 'pedidos', 'pedido-fechar.md')));
  // a trava das abas do Vibe do dono usa a branch do dono
  const sf = vibe.spawnSettings({ tabId: 'tab-vibe-orq-a', cwd: A.DONO, args: ['--name', 'Vibe · Orquestrador'], settings: {} });
  const tj = sf && JSON.parse(fs.readFileSync(path.join(UD, 'vibe', A.id, 'trava', 'trava.json'), 'utf8'));
  check('trava das abas do Vibe do dono: branch permitida = dev1', tj && tj.branch === 'dev1', tj && tj.branch);
  check('branchPrep na branch do dono', (await call('branchPrep', A.id)).branch === 'dev1');
  // novo ciclo arquiva os pedidos
  await call('cicloNovo', A.id);
  check('novo ciclo arquiva pedidos/ no histórico', !fs.existsSync(path.join(UD, 'vibe', A.id, 'pedidos')) && fs.readdirSync(path.join(UD, 'vibe', A.id, 'historico')).some((d) => fs.existsSync(path.join(UD, 'vibe', A.id, 'historico', d, 'pedidos'))));
  // fim: push só da dev1
  W(path.join(A.DONO, 'src/c.js'), 'C\n'); g(A.DONO, 'add', '-A'); g(A.DONO, 'commit', '-qm', 'T1: ligar');
  const fim = await call('mutAutoFim', A.id);
  check('fim: push só da dev1 (remoto = local); master do remoto intacta', fim.ok && fim.branch === 'dev1' && g(A.REM, 'rev-parse', 'dev1') === g(A.DONO, 'rev-parse', 'dev1') && g(A.REM, 'rev-parse', 'master') === masterA);
  const mjA = JSON.parse(fs.readFileSync(path.join(UD, 'vibe', A.id, 'mutirao.json'), 'utf8'));
  check('mutirao.json: auto concluído com o push', mjA.dono.auto.fase === 'concluido' && mjA.dono.auto.push.ok);
  // repetir a implementação: as junções já feitas viram "já estava integrada"
  pr = await call('mutAutoPrep', A.id);
  const jr = await call('mutAutoJuntar', A.id, 'dev2');
  check('repetir: junção já feita = "ja", sem commit novo', pr.ok && jr.ok && jr.juncao.status === 'ja');

  /* ---------- Caso B: com conflito ---------- */
  const Bc = await cenario('b', true);
  const masterB = g(Bc.DONO, 'rev-parse', 'origin/master');
  pr = await call('mutAutoPrep', Bc.id);
  const b1 = await call('mutAutoJuntar', Bc.id, 'dev2');
  const devAntes = g(Bc.DONO, 'rev-parse', 'dev1');
  const b2 = await call('mutAutoJuntar', Bc.id, 'dev3');
  check('B: dev2 entra', b1.ok && b1.juncao.status === 'ok');
  check('B: dev3 conflita em README.md (registrado)', b2.ok && b2.juncao.status === 'conflito' && b2.juncao.arquivos.join() === 'README.md' && b2.auto.fase === 'juntado', JSON.stringify(b2.juncao));
  check('B: merge cancelado sem descartar nada (sem MERGE_HEAD, tree limpo, dev2 continua integrada)', gq(Bc.DONO, 'rev-parse', '-q', '--verify', 'MERGE_HEAD') === null && g(Bc.DONO, 'status', '--porcelain', '--untracked-files=no') === '' && g(Bc.DONO, 'rev-parse', 'dev1') === devAntes && /Nota da Ana/.test(fs.readFileSync(path.join(Bc.DONO, 'README.md'), 'utf8')));
  check('B: origin/dev3 continua no remoto (nada perdido)', /Nota da Bia/.test(g(Bc.DONO, 'show', 'origin/dev3:README.md')));
  const enB = await call('mutAutoEntrega', Bc.id, {});
  const plB = await call('cicloPrompt', Bc.id, 'plano');
  const plBt = fs.readFileSync(path.join(UD, 'vibe', Bc.id, 'pedidos', 'pedido-plano.md'), 'utf8');
  check('B: entrega com o conflito; pedido manda T1 = resolver o conflito da dev3', enB.ok && enB.conflitos.length === 1 && enB.conflitos[0].branch === 'dev3' && /## T1 — Resolver o conflito da <branch>/.test(plBt) && /dev3: README\.md/.test(plBt) && /git merge --no-ff origin\/<branch>/.test(plBt) && plB.length < 200);
  check('B: estrutura lista o conflito', /NÃO integrada: conflito em README\.md/.test(fs.readFileSync(path.join(UD, 'vibe', Bc.id, 'estrutura.md'), 'utf8')));
  check('B: master intacta', g(Bc.DONO, 'rev-parse', 'master') === masterB && g(Bc.REM, 'rev-parse', 'master') === masterB);

  /* ---------- trava: merge na branch do dono pode; main/master não ---------- */
  const cfg = { projeto: Bc.DONO, vibe: path.join(UD, 'vibe', Bc.id), branch: 'dev1', protegidas: ['main', 'master'] };
  const sh = (cmd) => decide({ tool_name: 'Bash', tool_input: { command: cmd }, cwd: Bc.DONO }, cfg);
  check('trava: git merge --no-ff origin/dev3 na dev1 é permitido', sh('git merge --no-ff origin/dev3') === null);
  check('trava: git commit na dev1 é permitido', sh('git commit -m "T1: merge"') === null);
  check('trava: git merge --abort é permitido', sh('git merge --abort') === null);
  g(Bc.DONO, 'switch', '-q', 'master');
  check('trava: git merge com o HEAD na master é bloqueado', /master/.test(sh('git merge --no-ff origin/dev3') || ''));
  check('trava: git commit com o HEAD na master é bloqueado', /master/.test(sh('git commit -m x') || ''));
  check('trava: git pull na master é bloqueado', !!sh('git pull origin dev3'));
  g(Bc.DONO, 'switch', '-q', 'dev2');
  check('trava: merge numa branch que não é a do dono é bloqueado', /dev2/.test(sh('git merge origin/dev3') || ''));
  g(Bc.DONO, 'switch', '-q', 'dev1');
  check('trava: push para a master é bloqueado', !!sh('git push origin dev1:master'));
  check('trava: checkout --theirs (descarta lado) é bloqueado', !!sh('git checkout --theirs README.md'));

  /* ---------- prep recusa: sem publicar, entregas faltando ---------- */
  const r0 = await call('mutAutoPrep', 'proj-inexistente');
  check('prep sem Mutirão publicado é recusado', !r0.ok && /Publique/.test(r0.motivo));

  console.log(`\n${ok} OK, ${bad} FALHOU`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
