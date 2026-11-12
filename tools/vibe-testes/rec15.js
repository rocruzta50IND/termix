// DEV2-015 (sem tokens): módulo da recuperação de erro no processo principal. Uso: node rec15.js <raiz do Termix>
const { ROOT: ROOT_PADRAO, WORK } = require('./lib'); // raiz do repositório e pasta temporária do sistema
const fs = require('fs'), path = require('path'); const { execFileSync } = require('child_process');
const ROOT = (process.argv[2] || ROOT_PADRAO), S = path.join(WORK, 'r15m');
fs.rmSync(S, { recursive: true, force: true }); fs.mkdirSync(S, { recursive: true });
process.env.TERMIX_VIBE_TEST = '1';
let ok = 0, bad = 0; const check = (n, c, extra = '') => { if (c) ok++; else bad++; console.log(`${c ? 'OK  ' : 'FALHOU'} ${n}${extra ? ' — ' + extra : ''}`); };
const W = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); };
const UD = path.join(S, 'ud'), PJ = path.join(S, 'proj'), ID = 'p15';
W(path.join(PJ, 'README.md'), '# Proj\n');
execFileSync('git', ['init', '-q', '-b', 'main', PJ]);
execFileSync('git', ['-C', PJ, 'config', 'user.name', 'T']); execFileSync('git', ['-C', PJ, 'config', 'user.email', 't@exemplo.invalid']);
execFileSync('git', ['-C', PJ, 'add', '-A']); execFileSync('git', ['-C', PJ, 'commit', '-qm', 'inicio']);
execFileSync('git', ['-C', PJ, 'switch', '-qc', 'vibe/proj']);
W(path.join(PJ, 'sujo.txt'), 'x\n');
const V = path.join(UD, 'vibe', ID);
W(path.join(V, 'entrega.json'), JSON.stringify({ versao: 1, status: 'pronta', projeto: { id: ID, nome: 'Proj', pasta: PJ }, objetivo: 'x', criterioDePronto: 'y', arquivos: {} }));
W(path.join(V, 'plano.md'), 'Branch de trabalho: vibe/proj\n\n## T1 — Primeira\nObjetivo: a.\n\n## T2 — Segunda grande\nObjetivo: b.\nCritério: tudo.\n\n## T3 — [SEM COMMIT] Validação\nValidação.\n');
const h = {};
const api = require(path.join(ROOT, 'src/vibe/index.js')).create({ ipcMain: { handle: (ch, fn) => { h[ch] = fn; } }, app: { getPath: () => UD }, dialog: null, getWin: () => null, logError: (e) => console.log('logError', e && e.message) });
const call = (ch, ...a) => h[`vibe:${ch}`]({}, ...a);
const P = require(path.join(ROOT, 'src/vibe/politica.js'));

(async () => {
  // política: campos novos
  const pd = P.normalizar({}, { podeDeploy: true });
  check('política padrão: voltas 3, sem comando de F5', pd.recuperacao.voltas === 3 && pd.recuperacao.f5Projeto === '');
  check('política: voltas limitadas a 0..5', P.normalizar({ recuperacao: { voltas: 9 } }, {}).recuperacao.voltas === 5 && P.normalizar({ recuperacao: { voltas: -2 } }, {}).recuperacao.voltas === 0 && P.normalizar({ recuperacao: { voltas: 0 } }, {}).recuperacao.voltas === 0);
  check('política: comando de F5 numa linha só', P.normalizar({ recuperacao: { f5Projeto: 'npm run dev\nrm x' } }, {}).recuperacao.f5Projeto === 'npm run dev rm x');

  // diagnóstico
  const tela = Array.from({ length: 90 }, (_, i) => `linha ${i + 1}`).join('\n') + '\n\n\n';
  const d = await call('recDiag', ID, 'T2', 1, { quem: 'dev', motivo: 'O Dev não terminou o turno em 30 min (tempo limite).', tela, tentado: ['falha: faltou commit', 'volta 1: reenviar'], max: 3 });
  const md = d && d.ok ? fs.readFileSync(d.arquivo, 'utf8') : '';
  check('diagnóstico gravado em diagnosticos\\T2-1.md', d && d.ok && d.arquivo === path.join(V, 'diagnosticos', 'T2-1.md'));
  check('… últimas 60 linhas da tela (31 a 90, sem as vazias do fim)', d.linhas === 60 && md.includes('linha 31\n') && !md.includes('linha 30\n') && md.includes('linha 90\n```'));
  check('… git status, branch, último commit, motivo e tentado', /## git status\n```\n## vibe\/proj[\s\S]*\?\? sujo\.txt/.test(md) && /Branch atual: vibe\/proj \(permitida: vibe\/proj\)/.test(md) && /Último commit: \w+ inicio/.test(md) && /tempo limite/.test(md) && /- volta 1: reenviar/.test(md));
  check('diagnóstico recusa tarefa inválida', !(await call('recDiag', ID, '../x', 1, {})).ok);

  // pedido ao orquestrador
  const pp = await call('recPrompt', ID, 'T2', 1, 3);
  const pf = /leia e siga (.+)$/.exec(pp)[1], ptxt = fs.readFileSync(pf, 'utf8');
  check('pedido curto em arquivo (pedido-T2-recuperacao-1.md)', pp.length < 200 && path.basename(pf) === 'pedido-T2-recuperacao-1.md');
  check('… lista fechada sem f5_projeto (política sem comando)', /reenviar/.test(ptxt) && /clear_dev/.test(ptxt) && /f5_aba/.test(ptxt) && /dividir/.test(ptxt) && /pular/.test(ptxt) && !/f5_projeto/.test(ptxt) && /bloqueia_proximas/.test(ptxt) && ptxt.includes(path.join(V, 'recuperacao', 'T2-1.json')));

  // leitura da decisão
  const RJ = (n, v) => W(path.join(V, 'recuperacao', `T2-${n}.json`), typeof v === 'string' ? v : JSON.stringify(v));
  check('decisão ausente = não ok (ausente)', (await call('recLer', ID, 'T2', 7)).ausente === true);
  RJ(1, { acao: 'reenviar', explicacao: 'faça o commit', motivo: 'esqueceu', bloqueia_proximas: false });
  let r = await call('recLer', ID, 'T2', 1);
  check('reenviar lido com a explicação', r.ok && r.acao === 'reenviar' && r.explicacao === 'faça o commit' && r.bloqueia === false);
  RJ(2, '{"acao": "reenviar", ');
  check('JSON inválido = não ok, com o motivo', !(await call('recLer', ID, 'T2', 2)).ok && /não é um JSON válido/.test((await call('recLer', ID, 'T2', 2)).motivo));
  RJ(3, { acao: 'apagar_tudo' });
  check('ação fora da lista = não ok', /não está na lista/.test((await call('recLer', ID, 'T2', 3)).motivo));
  RJ(4, { acao: 'f5_projeto' });
  check('f5_projeto sem comando na política = não ok', /não tem o comando/.test((await call('recLer', ID, 'T2', 4)).motivo));
  RJ(5, { acao: 'pular', bloqueia_proximas: 'true' });
  check('pular com bloqueia_proximas (texto "true" aceito)', (await call('recLer', ID, 'T2', 5)).bloqueia === true);
  RJ(6, { acao: 'dividir', dividir: { a: { titulo: 'Parte A' } } });
  check('dividir sem a parte b = não ok', /faltam os títulos/.test((await call('recLer', ID, 'T2', 6)).motivo));
  RJ(8, '```json\n{"acao":"DIVIDIR","dividir":{"a":{"titulo":"Base","criterio":"c1"},"b":{"titulo":"Tela","criterio":"c2"}}}\n```');
  r = await call('recLer', ID, 'T2', 8);
  check('dividir com cercas ``` e maiúsculas', r.ok && r.acao === 'dividir' && r.dividir.a.titulo === 'Base' && r.dividir.b.criterio === 'c2');

  // dividir no plano
  const dv = await call('planoDividir', ID, 'T2', r.dividir);
  const ts = await call('tarefas', ID);
  check('plano dividido: T1, T2 (dividida), T2.a, T2.b, T3', dv.ok && ts.map((t) => t.id).join(',') === 'T1,T2,T2.a,T2.b,T3' && ts[1].dividida && !ts[2].dividida && ts[2].titulo === 'Base' && ts[4].semCommit, ts.map((t) => t.id).join(','));
  check('… cópia do plano anterior guardada', fs.existsSync(path.join(V, 'plano.antes-de-dividir-T2.md')) && !/T2\.a/.test(fs.readFileSync(path.join(V, 'plano.antes-de-dividir-T2.md'), 'utf8')));
  check('… dividir de novo a mesma tarefa = recusado', !(await call('planoDividir', ID, 'T2', r.dividir)).ok);
  const pa = await call('execPrompt', ID, 'dev', 'T2.a', {});
  check('pedido do Dev aceita a parte T2.a', !!pa && /pedido-T2\.a-dev\.md$/.test(pa) && /seção T2\.a/.test(fs.readFileSync(/leia e siga (.+)$/.exec(pa)[1], 'utf8')));
  const rf = await call('execPrompt', ID, 'refazer', 'T1', { recuperacao: { motivo: 'tempo limite', explicacao: 'use o arquivo X', f5: true } });
  const rft = fs.readFileSync(/leia e siga (.+)$/.exec(rf)[1], 'utf8');
  check('refazer da recuperação: motivo, aviso da aba reaberta e orientação', /tempo limite/.test(rft) && /reabriu esta aba retomando a conversa/.test(rft) && /Orientação do orquestrador: use o arquivo X/.test(rft));

  // F5 do projeto
  check('F5 do projeto sem comando = recusado', /não tem o comando/.test((await call('f5Projeto', ID)).motivo));
  const pol = (cmd) => call('politicaSet', ID, { ...P.padrao({}), recuperacao: { voltas: 3, f5Projeto: cmd } }, 'teste');
  await pol('node -e "console.log(\'F5 do projeto ok\', process.cwd())"');
  check('pedido ao orquestrador passa a listar f5_projeto', /f5_projeto/.test(fs.readFileSync(/leia e siga (.+)$/.exec(await call('recPrompt', ID, 'T2', 1, 3))[1], 'utf8')));
  let f = await call('f5Projeto', ID);
  const lg = fs.existsSync(path.join(V, 'recuperacao', 'f5-projeto.log')) ? fs.readFileSync(path.join(V, 'recuperacao', 'f5-projeto.log'), 'utf8') : '';
  check('F5 do projeto com comando inofensivo: terminou com código 0', f.ok && f.estado === 'terminou' && f.codigo === 0, JSON.stringify(f));
  check('… rodou na pasta do projeto (log)', lg.includes('F5 do projeto ok') && lg.toLowerCase().includes(PJ.toLowerCase()), lg.slice(-200));
  await pol('node -e "setTimeout(()=>{},4000)"');
  f = await call('f5Projeto', ID, 1500);
  check('F5 do projeto que fica rodando (servidor): ok "rodando"', f.ok && f.estado === 'rodando', JSON.stringify(f));
  await pol('node -e "process.exit(3)"');
  f = await call('f5Projeto', ID);
  check('F5 do projeto com erro: não ok, código 3', !f.ok && f.codigo === 3);
  for (const [cmd, rx, nome] of [['git reset --hard', /trava barrou/, 'reset --hard'], ['git push --force origin vibe/proj', /trava barrou/, 'push --force'], ['rm -rf node_modules', /trava barrou/, 'rm -rf'], ['git checkout main', /trava barrou/, 'trocar para a main'], ['echo x > C:/Windows/teste.txt', /trava barrou/, 'gravar fora do projeto'], ['cd .. && npm run dev', /trocar de pasta/, 'cd ..'], ['pushd C:\\ & dir', /trocar de pasta/, 'pushd']]) {
    await pol(cmd);
    const x = await call('f5Projeto', ID);
    check(`F5 do projeto barrado: ${nome}`, !x.ok && rx.test(x.motivo || ''), x.motivo);
  }
  check('nada foi apagado no projeto', fs.existsSync(path.join(PJ, 'sujo.txt')) && fs.existsSync(path.join(PJ, 'README.md')));
  await new Promise((r) => setTimeout(r, 3000)); // o processo "servidor" de 4 s termina sozinho
  console.log(`\n${ok} OK, ${bad} FALHOU`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.log('ERRO', e && e.stack); process.exit(1); });
