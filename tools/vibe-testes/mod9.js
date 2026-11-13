// DEV2-009 (sem tokens): conferências do plano e a entrega sintética do Mutirão.
// Teste sem tokens da implementação automática do Mutirão (DEV2-006). Uso: node mod6.js <raiz do Termix>
// Remoto bare local, dono (dev1, fluxo com papel DEV1), sócios Ana (dev2) e Bia (dev3). Entregas por script.
const { ROOT: ROOT_PADRAO, WORK } = require('./lib'); // raiz do repositório e pasta temporária do sistema
const fs = require('fs'), path = require('path'); const { execFileSync } = require('child_process');
const ROOT = (process.argv[2] || ROOT_PADRAO), S = path.join(WORK, 'm9');
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
  const { mainCommitLines, deploySemMarca } = require(path.join(ROOT, 'src/vibe/index.js'));
  /* ---------- item 1: conferências do plano, em código ---------- */
  const real = fs.readFileSync(path.join(__dirname, 'fixtures', 'real9-plano.md'), 'utf8');
  check('plano real: "Não fazer: nada de push em main/master" não vira alerta', mainCommitLines(real).length === 0, JSON.stringify(mainCommitLines(real)));
  check('ordem de commit na main continua virando alerta', mainCommitLines('- faça o commit na main e o push para origin/master').length === 1);
  check('negações comuns não viram alerta', mainCommitLines('nunca faça commit na main\nsem push para master\nproibido commit em main\nevite push na master\ndo not push to main').length === 0);
  check('plano real (com [DEPLOY]): sem aviso de deploy sem marca', deploySemMarca(real).length === 0);
  const sem = real.replace(/\[DEPLOY\]\s*/g, '');
  const ds = deploySemMarca(sem);
  check('plano real sem a marca [DEPLOY]: aviso cita a T5 (GitHub Pages)', ds.length >= 1 && ds.some((x) => /^T5 /.test(x)), JSON.stringify(ds));
  check('plano sem nada de publicação: sem aviso', deploySemMarca('## T1 — Página\n## T2 — Estilo\n## T3 — [SEM COMMIT] validação').length === 0);
  check('variações: deploy por FTP, produção, Vercel', deploySemMarca('## T1 — Deploy por FTP\n## T2 — Subir para produção\n## T3 — Ligar na Vercel').length === 3);
  /* ---------- item 2: entrega sintética do Mutirão ---------- */
  const A = await cenario('a', false);
  check('divisão publicada', A.pub && A.pub.ok, A.pub && A.pub.motivo);
  W(path.join(A.DONO, 'docs/ROADMAP.md'), '# Roadmap\n\n1. Parte A\n2. Parte B\n3. Publicar a versão no servidor da empresa (deploy por FTP). Só o dono tem a senha do FTP.\n');
  g(A.DONO, 'add', '-A'); g(A.DONO, 'commit', '-qm', 'roadmap'); g(A.DONO, 'push', '-q', 'origin', 'dev1');
  const pr = await call('mutAutoPrep', A.id);
  for (const b of ['dev2', 'dev3']) await call('mutAutoJuntar', A.id, b);
  const en = await call('mutAutoEntrega', A.id, {});
  check('entrega sintética gravada', pr.ok && en && en.ok, JSON.stringify(en).slice(0, 200));
  const VD = path.join(UD, 'vibe', A.id);
  const est = fs.readFileSync(path.join(VD, 'estrutura.md'), 'utf8');
  const ej = JSON.parse(fs.readFileSync(path.join(VD, 'entrega.json'), 'utf8'));
  check('estrutura: objetivo do projeto inteiro explícito', /## Objetivo do projeto inteiro\n\nBrinquedo com a e b prontos/.test(est));
  check('estrutura: critério de pronto do projeto inteiro explícito', /## Critério de pronto do projeto inteiro\n\na\.js e b\.js com o valor final/.test(est));
  check('estrutura: o passo de publicação do roadmap aparece', /## Publicação, deploy e passos do humano[\s\S]*docs\/ROADMAP\.md: 3\. Publicar a versão no servidor da empresa \(deploy por FTP\)/.test(est), (est.match(/## Publicação[\s\S]*?\n## /) || [''])[0].slice(0, 400));
  check('entrega.json: critério começa pelo projeto inteiro', /^Projeto inteiro: a\.js e b\.js com o valor final/.test(ej.criterioDePronto) && ej.objetivo === 'Brinquedo com a e b prontos');
  const lerPedido = (t) => { const m = /leia e siga (.+)$/.exec(t || ''); return m ? fs.readFileSync(m[1].trim(), 'utf8') : ''; };
  const pp = lerPedido(await call('cicloPrompt', A.id, 'plano'));
  check('pedido do plano final: até o critério do projeto inteiro', /Monte as tarefas até o fim do projeto inteiro \(o critério de pronto do projeto, não só o das partes\)/.test(pp));
  check('pedido do plano final: publicação/deploy e humano com as marcas', /Não deixe de fora a publicação\/deploy nem o que depende do humano/.test(pp) && /marcada \[DEPLOY\]/.test(pp) && /\[HUMANO\]/.test(pp) && /validação final do projeto inteiro, marcada \[SEM COMMIT\]/.test(pp));
  check('pedido do plano final: formato pede as 3 marcas', /marque no título com \[DEPLOY\]/.test(pp) && /com \[HUMANO\]/.test(pp) && /com \[SEM COMMIT\]/.test(pp));
  fs.writeFileSync(path.join(WORK, 'mod9-pedido-plano.md'), pp); fs.writeFileSync(path.join(WORK, 'mod9-estrutura.md'), est);
  console.log(`\n${ok} OK, ${bad} FALHOU`);
})().catch((e) => { console.log('ERRO', e && e.stack); process.exit(1); });
