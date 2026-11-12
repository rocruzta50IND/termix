// DEV2-023 — teste SEM TOKENS do Mutirão nativo no processo principal: quem pode (mutPapel), a lista da pasta "Mutirão"
// (mutLista) e a fase, com remoto bare local, um dono e dois sócios, nos dois caminhos:
//  (a) projeto novo: clone de um repositório sem o fluxo (o dono é quem abre; branch do dono dev1 criada ao publicar);
//  (b) projeto ativo do Termix: repositório com o fluxo, papel DEV1, com histórico.
// Uso: node mut23.js <raiz do Termix>
const { ROOT: ROOT_PADRAO, WORK } = require('./lib'); // raiz do repositório e pasta temporária do sistema
const fs = require('fs'), path = require('path'); const { execFileSync } = require('child_process');
const ROOT = (process.argv[2] || ROOT_PADRAO), S = path.join(WORK, 'm23');
fs.rmSync(S, { recursive: true, force: true }); fs.mkdirSync(S, { recursive: true });
process.env.TERMIX_VIBE_TEST = '1';
process.env.TERMIX_VIBE_CLAUDE_JSON = path.join(S, 'claude-teste.json');
const g = (dir, ...a) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const W = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); };
let ok = 0, bad = 0; const check = (n, c, extra = '') => { if (c) ok++; else bad++; console.log(`${c ? 'OK  ' : 'FALHOU'} ${n}${extra ? ' — ' + extra : ''}`); };
const cfgU = (d, b) => { g(d, 'config', 'user.name', b); g(d, 'config', 'user.email', `${b}@t`); };

const handlers = {};
const UD = path.join(S, 'ud');
const vibe = require(path.join(ROOT, 'src/vibe/index.js')).create({ ipcMain: { handle: (ch, fn) => { handlers[ch] = fn; } }, app: { getPath: () => UD }, dialog: null, getWin: () => null, logError: (e) => console.log('logError', e && e.message) });
const call = (ch, ...a) => handlers[`vibe:${ch}`]({}, ...a);
const MD = (t) => ['Objetivo', 'Público e usuários', 'Funcionalidades', 'Fora do escopo', 'Telas e fluxos', 'Dados e regras de negócio', 'Integrações e acessos', 'Tecnologia', 'Critério de pronto'].map((h) => `## ${h}\n${t}: conteúdo de ${h}.\n`).join('\n');

function remoto(nome, fluxo) {
  const REM = path.join(S, `${nome}.git`), BASE = path.join(S, `${nome}-base`);
  execFileSync('git', ['init', '-q', '--bare', '-b', 'master', REM]);
  execFileSync('git', ['clone', '-q', REM, BASE], { stdio: 'ignore' }); cfgU(BASE, 'base');
  W(path.join(BASE, 'README.md'), `# ${nome}\n`); W(path.join(BASE, 'src/a.js'), '1\n'); W(path.join(BASE, 'src/b.js'), '2\n');
  if (fluxo) { W(path.join(BASE, '.claude/fluxo.json'), '{"validacao":[]}\n'); W(path.join(BASE, '.gitignore'), 'CLAUDE.local.md\n'); }
  g(BASE, 'add', '-A'); g(BASE, 'commit', '-qm', 'inicio'); g(BASE, 'push', '-q', 'origin', 'master');
  if (fluxo) for (const b of ['dev1', 'dev2', 'dev3']) g(BASE, 'push', '-q', 'origin', `master:${b}`);
  return REM;
}
async function ciclo(rot, id, DONO, REM, branchDono, opts) {
  const nome = (s) => `${rot} ${s}`;
  let lst = await call('mutLista', [id]);
  check(nome('antes de criar: fora da pasta "Mutirão"'), Array.isArray(lst) && lst.length === 0);
  const r = await call('mutIniciar', id, { nome: rot, pasta: DONO }, [{ nome: 'Ana', branch: 'dev2' }, { nome: 'Bia', branch: 'dev3' }], false, opts);
  check(nome(`modo ${opts.modo} gravado`), r.ok && r.dono.modo === opts.modo);
  const pedido = (await call('mutPrompt', id)) && fs.readFileSync(path.join(DONO, 'mutirao/PEDIDO.md'), 'utf8');
  check(nome(opts.modo === 'tarefas' ? 'pedido: uma tarefa por participante, sem dividir o projeto inteiro' : opts.modo === 'estado_atual' ? 'pedido: todo o restante, do estado atual até finalizar' : 'pedido: dividir 100% a partir de mutirao/estrutura.md'), opts.modo === 'tarefas' ? /Delegar algumas tarefas/.test(pedido) && /NÃO divida o projeto inteiro/.test(pedido) && /UMA TAREFA/.test(pedido) && /segue trabalhando na branch dele/.test(pedido) : opts.modo === 'estado_atual' ? /Do estado atual até finalizar/.test(pedido) && /TODO O RESTANTE/.test(pedido) && !/UMA TAREFA/.test(pedido) : /INTEIRO \(100%\)/.test(pedido) && /mutirao\/estrutura\.md/.test(pedido) && /Objetivo do projeto: Loja online/.test(pedido));
  check(nome('Criar mutirão registra o dono com 2 participantes'), r.ok && r.dono.participantes.length === 2 && r.dono.branchDono === branchDono, JSON.stringify(r).slice(0, 160));
  lst = await call('mutLista', [id, 'outro-projeto', '../fora']);
  check(nome('pasta "Mutirão": aparece, fase Dividindo, 0 de 2'), lst.length === 1 && lst[0].id === id && lst[0].fase.k === 'dividindo' && !lst[0].publicado && lst[0].n === 2 && !lst[0].contado, JSON.stringify(lst));
  let e = await call('mutEstado', id, DONO);
  check(nome('painel: fase Dividindo'), e.fase && e.fase.l === 'Dividindo');
  // divisão gravada "pelo orquestrador" e publicada
  W(path.join(DONO, 'mutirao/divisao.json'), JSON.stringify({ branchDono, objetivo: 'Loja inteira', criterio: 'tudo pronto', participantes: [{ nome: 'Ana', branch: 'dev2' }, { nome: 'Bia', branch: 'dev3' }], partes: [{ branch: 'dev2', titulo: 'Tela A', objetivo: 'a', criterio: 'a pronto', arquivos: ['src/a.js'] }, { branch: 'dev3', titulo: 'Tela B', objetivo: 'b', criterio: 'b pronto', arquivos: ['src/b.js'] }] }, null, 2));
  W(path.join(DONO, 'mutirao/partes/dev2.md'), MD('Ana')); W(path.join(DONO, 'mutirao/partes/dev3.md'), MD('Bia'));
  const cf = await call('mutConferir', id);
  check(nome('conferência sem arquivo em comum'), cf.ok, (cf.problemas || []).join(' | '));
  const pb = await call('mutPublicar', id);
  const pubf = g(DONO, 'show', '--name-only', '--format=', pb.sha).split('\n');
  check(nome(opts.modo === 'projeto' ? 'a estrutura do dono vai na publicação' : 'publicação só com divisão e tarefas'), opts.modo === 'projeto' ? pubf.includes('mutirao/estrutura.md') : !pubf.includes('mutirao/estrutura.md'), pubf.join(','));
  check(nome(`divisão publicada na ${branchDono} (nunca na master)`), pb.ok && pb.branch === branchDono && g(DONO, 'rev-parse', `origin/${branchDono}`) === pb.sha && g(DONO, 'ls-remote', 'origin', 'refs/heads/master').split(/\s/)[0] !== pb.sha, JSON.stringify(pb).slice(0, 160));
  lst = await call('mutLista', [id]);
  check(nome('pasta: publicado, Aguardando entregas (?/2) antes de contar'), lst[0].publicado && lst[0].fase.k === 'aguardando' && /\?\/2/.test(lst[0].fase.l), lst[0].fase.l);
  let ct = await call('mutContador', id);
  lst = await call('mutLista', [id]);
  check(nome('entregas 0/2 (lido do remoto, sem IA)'), ct.k === 0 && ct.n === 2 && lst[0].contado && lst[0].k === 0 && lst[0].fase.l === 'Aguardando entregas (0/2)', lst[0].fase.l);
  // sócios: clone na branch deles, sincronizam com a do dono, aplicam a parte e entregam
  const socios = [];
  for (const b of ['dev2', 'dev3']) {
    const dir = path.join(S, `${rot}-${b}`);
    execFileSync('git', ['clone', '-q', REM, dir], { stdio: 'ignore' }); cfgU(dir, b);
    const tem = g(dir, 'ls-remote', 'origin', `refs/heads/${b}`);
    g(dir, 'switch', '-q', ...(tem ? [b] : ['-c', b, `origin/${branchDono}`]));
    if (fs.existsSync(path.join(DONO, '.claude/fluxo.json'))) W(path.join(dir, 'CLAUDE.local.md'), `papel: "${b.toUpperCase()}"\nbranch_padrao: "${b}"\n`);
    g(dir, 'merge', '-q', `origin/${branchDono}`);
    socios.push({ b, dir, id: `${id}-${b}` });
  }
  const pa = await call('mutParte', socios[0].dir);
  check(nome('sócio vê a parte dele depois de sincronizar'), pa.tem && pa.branch === 'dev2' && pa.titulo === 'Tela A' && !pa.entregue);
  const ap = await call('mutAplicar', socios[0].id, socios[0].dir);
  check(nome('sócio: "Abrir o Vibe com a minha parte" pré-preenche'), ap.ok);
  // DEV2-024: o modo vai na divisão publicada; no (b2) o sócio recebe o rascunho da TAREFA (abre o Vibe de tarefa)
  const mq = opts.modo || 'projeto';
  check(nome('DEV2-024: modo publicado na divisão e lido pelo sócio'), pa.modo === mq && ap.modo === mq, `${pa.modo}/${ap.modo}`);
  const ras = JSON.parse(fs.readFileSync(path.join(UD, 'vibe', socios[0].id, 'rascunho.json'), 'utf8'));
  check(nome(mq === 'tarefas' ? 'DEV2-024: (b2) rascunho da tarefa preenchido (o que fazer, critério, não pode, arquivos)' : 'DEV2-024: (a)/(b1) sem rascunho de tarefa (Vibe de projeto como antes)'), mq === 'tarefas' ? !!(ras.tarefa && /Tela A/.test(ras.tarefa.oQue) && ras.tarefa.oQue.includes('mutirao/partes/dev2.md') && ras.tarefa.criterio && ras.tarefa.naoPode && ras.tarefa.arquivos.includes('src/a.js') && /./.test(ras.tarefa.arquivos)) : !ras.tarefa && !!ras.objetivo, JSON.stringify(ras.tarefa || {}).slice(0, 200));
  const pp2 = await call('mutPapel', socios[0].dir);
  if (fs.existsSync(path.join(DONO, '.claude/fluxo.json'))) check(nome('sócio (DEV2) não pode criar o mutirão'), !pp2.dono && /DEV2/.test(pp2.motivo), pp2.motivo);
  for (let i = 0; i < socios.length; i++) {
    const s = socios[i];
    if (i) await call('mutAplicar', s.id, s.dir);
    W(path.join(s.dir, i ? 'src/b.js' : 'src/a.js'), `parte ${s.b}\n`); g(s.dir, 'commit', '-qam', `T1: parte ${s.b}`);
    const en = await call('mutEntregar', s.id, { feitas: [{ id: 'T1', titulo: 'parte', commit: 'x' }], resumo: 'ok', teste: true });
    check(nome(`entrega do ${s.b}: push só da ${s.b}`), en.ok && g(s.dir, 'rev-parse', `origin/${s.b}`) === en.sha, JSON.stringify(en).slice(0, 120));
    ct = await call('mutContador', id);
    lst = await call('mutLista', [id]);
    const fim = i === socios.length - 1;
    check(nome(`entregas ${i + 1}/2 na pasta e no painel`), ct.k === i + 1 && lst[0].k === i + 1 && (fim ? lst[0].fase.k === 'entregue' && lst[0].fase.l === 'Todas as entregas (2/2)' : lst[0].fase.l === `Aguardando entregas (${i + 1}/2)`), lst[0].fase.l);
    const st = ct.lista.find((x) => x.branch === s.b);
    check(nome(`status do ${s.b}: nome, branch, entregue e quando`), st && st.nome === (i ? 'Bia' : 'Ana') && st.entregue && !!st.data);
  }
  // implementação automática (só a junção, em código): a fase acompanha
  const pr = await call('mutAutoPrep', id);
  check(nome('com todas as entregas, a implementação automática pode começar'), pr.ok, pr.motivo);
  e = await call('mutEstado', id, DONO);
  check(nome('fase Juntando entregas'), e.fase.k === 'juntando', e.fase.l);
  for (const b of ['dev2', 'dev3']) await call('mutAutoJuntar', id, b);
  const en = await call('mutAutoEntrega', id, { maxTarefas: 2 });
  lst = await call('mutLista', [id]);
  check(nome('depois de juntar: fase Planejando'), en.ok && lst[0].fase.k === 'planejando', lst[0].fase.l);
  await call('mutAutoSet', id, 'executando');
  lst = await call('mutLista', [id]);
  check(nome('fase Executando'), lst[0].fase.k === 'executando');
}

(async () => {
  // quem pode
  const SG = path.join(S, 'semgit'); fs.mkdirSync(SG);
  let pp = await call('mutPapel', SG);
  check('pasta nova sem git: dono, mas não pode (exige git e origin)', pp.dono && !pp.pode && /git/.test(pp.motivo), pp.motivo);
  check('mutPapel sem pasta = null', (await call('mutPapel', '')) === null);

  // (a) projeto novo: clone de um repositório sem o fluxo
  const REMA = remoto('loja', false), DA = path.join(S, 'loja');
  execFileSync('git', ['clone', '-q', REMA, DA], { stdio: 'ignore' }); cfgU(DA, 'dono');
  pp = await call('mutPapel', DA);
  check('(a) sem fluxo, com origin: quem abre é o dono; branch dev1 criada ao publicar', pp.dono && pp.pode && pp.branchDono === 'dev1' && pp.criar && !pp.fluxo, JSON.stringify(pp).slice(0, 160));
  const ESTF = path.join(S, 'estrutura-loja.md'); W(ESTF, MD('Loja'));
  const BADF = path.join(S, 'estrutura-ruim.md'); W(BADF, '## Objetivo\nsó isso\n');
  let rr = await call('mutIniciar', 'proj-novo', { nome: 'Loja', pasta: DA }, [{ nome: 'Ana', branch: 'dev2' }], false, { modo: 'projeto', entrega: { objetivo: 'x', estrutura: BADF } });
  check('(a) estrutura sem as 9 seções recusada', !rr.ok && rr.problemas.some((p) => /estrutura/.test(p)), (rr.problemas || []).join(' | '));
  await ciclo('(a)', 'proj-novo', DA, REMA, 'dev1', { modo: 'projeto', entrega: { objetivo: 'Loja online', criterio: 'vende', estrutura: ESTF } });
  check('(a) estrutura copiada para mutirao/estrutura.md', fs.readFileSync(path.join(DA, 'mutirao/estrutura.md'), 'utf8') === MD('Loja'));

  // (b) projeto ativo do Termix: com o fluxo e histórico, papel DEV1
  const REMB = remoto('erp', true), DB = path.join(S, 'erp');
  execFileSync('git', ['clone', '-q', REMB, DB], { stdio: 'ignore' }); cfgU(DB, 'dono');
  g(DB, 'switch', '-q', 'dev1'); W(path.join(DB, 'src/c.js'), '3\n'); g(DB, 'add', '-A'); g(DB, 'commit', '-qm', 'TASK-1: trabalho em andamento'); g(DB, 'push', '-q', 'origin', 'dev1');
  W(path.join(DB, 'CLAUDE.local.md'), 'papel: "DEV2"\nbranch_padrao: "dev2"\n');
  pp = await call('mutPapel', DB);
  check('(b) papel DEV2: não é dono, explicação', !pp.dono && /DEV2/.test(pp.motivo), pp.motivo);
  let r = await call('mutIniciar', 'proj-ativo', { nome: 'ERP', pasta: DB }, [{ nome: 'Ana', branch: 'dev2' }]);
  check('(b) papel DEV2: criar é recusado', !r.ok && /DEV1/.test(r.motivo), r.motivo);
  W(path.join(DB, 'CLAUDE.local.md'), 'papel: "DEV1"\nbranch_padrao: "dev1"\n');
  pp = await call('mutPapel', DB);
  check('(b) papel DEV1: dono, branch dev1', pp.dono && pp.pode && pp.branchDono === 'dev1' && pp.fluxo);
  await ciclo('(b2)', 'proj-ativo', DB, REMB, 'dev1', { modo: 'tarefas' });
  // (b1) projeto ativo, "Do estado atual até finalizar"
  const REMD = remoto('pdv', true), DD = path.join(S, 'pdv');
  execFileSync('git', ['clone', '-q', REMD, DD], { stdio: 'ignore' }); cfgU(DD, 'dono'); g(DD, 'switch', '-q', 'dev1');
  W(path.join(DD, 'CLAUDE.local.md'), 'papel: "DEV1"\nbranch_padrao: "dev1"\n');
  await ciclo('(b1)', 'proj-b1', DD, REMD, 'dev1', { modo: 'estado_atual' });
  const rx = await call('mutIniciar', 'proj-x', { nome: 'X', pasta: DD }, [{ nome: 'Ana', branch: 'dev2' }], false, { modo: 'qualquer' });
  check('modo desconhecido vira "projeto"', rx.ok && rx.dono.modo === 'projeto');
  check('(b) o trabalho em andamento do projeto ativo continua na dev1', fs.existsSync(path.join(DB, 'src/c.js')) && /TASK-1/.test(g(DB, 'log', '--oneline', 'dev1')));

  // (c) projeto em andamento com o dono como participante (o normal no b)
  const REMC = remoto('crm', true), DC = path.join(S, 'crm');
  execFileSync('git', ['clone', '-q', REMC, DC], { stdio: 'ignore' }); cfgU(DC, 'dono'); g(DC, 'switch', '-q', 'dev1');
  W(path.join(DC, 'CLAUDE.local.md'), 'papel: "DEV1"\nbranch_padrao: "dev1"\n');
  rr = await call('mutIniciar', 'proj-c', { nome: 'CRM', pasta: DC }, [{ nome: 'Dono', branch: 'dev1' }, { nome: 'Ana', branch: 'dev2' }], false, { modo: 'tarefas' });
  check('(c) o dono entra como participante com a branch dele', rr.ok && rr.dono.participantes.map((p) => p.branch).join() === 'dev1,dev2', JSON.stringify(rr).slice(0, 160));
  await call('mutPrompt', 'proj-c');
  check('(c) pedido: a tarefa do dono separada das outras', /inclusive a do próprio dono \(Dono, branch dev1\)/.test(fs.readFileSync(path.join(DC, 'mutirao/PEDIDO.md'), 'utf8')));
  const divc = (bArq) => JSON.stringify({ branchDono: 'dev1', participantes: [{ nome: 'Dono', branch: 'dev1' }, { nome: 'Ana', branch: 'dev2' }], partes: [{ branch: 'dev1', titulo: 'Relatórios', objetivo: 'r', criterio: 'r', arquivos: ['src/a.js'] }, { branch: 'dev2', titulo: 'Cadastro', objetivo: 'c', criterio: 'c', arquivos: bArq }] });
  W(path.join(DC, 'mutirao/divisao.json'), divc(['src/a.js', 'src/b.js']));
  W(path.join(DC, 'mutirao/partes/dev1.md'), MD('Dono')); W(path.join(DC, 'mutirao/partes/dev2.md'), MD('Ana'));
  let cc = await call('mutConferir', 'proj-c');
  check('(c) tarefa do dono com arquivo em comum com a da Ana é recusada', !cc.ok && cc.conflitos.length === 1 && /dev1/.test(cc.problemas.join()), cc.problemas.join(' | '));
  W(path.join(DC, 'mutirao/divisao.json'), divc(['src/b.js']));
  cc = await call('mutConferir', 'proj-c');
  const pc = await call('mutPublicar', 'proj-c');
  check('(c) separadas: conferida e publicada na dev1', cc.ok && pc.ok && pc.branch === 'dev1', JSON.stringify(pc).slice(0, 120));
  const pd = await call('mutParte', DC);
  check('(c) o dono vê a própria tarefa na branch dele', pd.tem && pd.branch === 'dev1' && pd.titulo === 'Relatórios');
  await call('mutAplicar', 'proj-c-parte', DC);
  W(path.join(DC, 'src/a.js'), 'relatorios\n'); g(DC, 'commit', '-qam', 'T1: relatorios');
  const ed = await call('mutEntregar', 'proj-c-parte', { feitas: [], resumo: 'ok', teste: true });
  let cn = await call('mutContador', 'proj-c');
  check('(c) entrega do dono conta: 1/2', ed.ok && cn.k === 1 && cn.lista.find((x) => x.branch === 'dev1').entregue, JSON.stringify(ed).slice(0, 120));
  const lc = (await call('mutLista', ['proj-c']))[0];
  check('(c) lista: modo tarefa, entregues [dev1] e os nomes', lc.modo === 'tarefas' && lc.ent.join() === 'dev1' && lc.nomes.dev2 === 'Ana', JSON.stringify(lc));
  const SA = path.join(S, 'crm-ana'); execFileSync('git', ['clone', '-q', REMC, SA], { stdio: 'ignore' }); cfgU(SA, 'dev2'); g(SA, 'switch', '-q', 'dev2'); W(path.join(SA, 'CLAUDE.local.md'), 'papel: "DEV2"\nbranch_padrao: "dev2"\n'); g(SA, 'merge', '-q', 'origin/dev1');
  await call('mutAplicar', 'proj-c-ana', SA); W(path.join(SA, 'src/b.js'), 'cadastro\n'); g(SA, 'commit', '-qam', 'T1: cadastro');
  await call('mutEntregar', 'proj-c-ana', { feitas: [], resumo: 'ok', teste: true });
  cn = await call('mutContador', 'proj-c');
  const pr3 = await call('mutAutoPrep', 'proj-c');
  const j1 = await call('mutAutoJuntar', 'proj-c', 'dev1'), j2 = await call('mutAutoJuntar', 'proj-c', 'dev2');
  check('(c) 2/2 e a junção de sempre: a do dono já está, a da Ana entra', cn.k === 2 && pr3.ok && j1.ok && j2.ok && fs.readFileSync(path.join(DC, 'src/b.js'), 'utf8').trim() === 'cadastro', JSON.stringify([pr3.motivo, j1.juncao, j2.juncao]).slice(0, 300));

  // a lista junta os dois e ignora quem não tem Mutirão
  const all = await call('mutLista', ['proj-novo', 'proj-ativo', 'sem-mutirao']);
  check('pasta "Mutirão": os dois mutirões, nenhum projeto sem Mutirão', all.length === 2 && all.map((x) => x.id).sort().join() === 'proj-ativo,proj-novo');
  check('mutLista com lixo não quebra', Array.isArray(await call('mutLista', null)) && (await call('mutLista', [1, {}, '../x'])).length === 0);
  console.log(`\n${ok} OK, ${bad} FALHOU`);
})().catch((e) => { console.log('ERRO', e); process.exit(1); });
