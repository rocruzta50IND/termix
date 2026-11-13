// Teste sem tokens do Mutirão (DEV2-005). Uso: node mod-test.js <raiz do Termix>
// Cria um remoto bare local, o clone do dono (dev1, fluxo com papel DEV1) e os clones dos sócios (dev2, dev3).
const { ROOT: ROOT_PADRAO, WORK } = require('./lib'); // raiz do repositório e pasta temporária do sistema
const fs = require('fs'), path = require('path'); const { execFileSync } = require('child_process');
const ROOT = (process.argv[2] || ROOT_PADRAO), S = path.join(WORK, 'mt');
fs.rmSync(S, { recursive: true, force: true }); fs.mkdirSync(S, { recursive: true });
process.env.TERMIX_VIBE_TEST = '1';
process.env.TERMIX_VIBE_CLAUDE_JSON = path.join(S, 'claude-teste.json');
const g = (dir, ...a) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const W = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); };
let ok = 0, bad = 0; const check = (n, c, extra = '') => { if (c) ok++; else bad++; console.log(`${c ? 'OK  ' : 'FALHOU'} ${n}${extra ? ' — ' + extra : ''}`); };

const REM = path.join(S, 'remoto.git'), DONO = path.join(S, 'dono'), S2 = path.join(S, 'socio2'), S3 = path.join(S, 'socio3');
execFileSync('git', ['init', '--bare', '-b', 'master', REM]);
execFileSync('git', ['clone', REM, DONO], { stdio: 'ignore' });
for (const [k, v] of [['user.name', 'teste'], ['user.email', 't@t']]) g(DONO, 'config', k, v);
W(path.join(DONO, 'README.md'), '# Brinquedo\n'); W(path.join(DONO, 'src/a.js'), '1\n'); W(path.join(DONO, 'src/b.js'), '2\n'); W(path.join(DONO, 'docs/x.md'), 'x\n');
W(path.join(DONO, '.claude/fluxo.json'), '{"validacao":[]}\n'); W(path.join(DONO, '.gitignore'), 'CLAUDE.local.md\n');
g(DONO, 'add', '-A'); g(DONO, 'commit', '-m', 'inicio'); g(DONO, 'push', '-q', 'origin', 'master');
for (const b of ['dev1', 'dev2', 'dev3']) g(DONO, 'branch', b), g(DONO, 'push', '-q', 'origin', b);
g(DONO, 'switch', '-q', 'dev1');
W(path.join(DONO, 'CLAUDE.local.md'), 'papel: "DEV1"\nbranch_padrao: "dev1"\n');
const masterSha = g(DONO, 'rev-parse', 'origin/master');

const handlers = {};
const UD = path.join(S, 'ud');
const vibe = require(path.join(ROOT, 'src/vibe/index.js')).create({ ipcMain: { handle: (ch, fn) => { handlers[ch] = fn; } }, app: { getPath: () => UD }, dialog: null, getWin: () => null, logError: (e) => console.log('logError', e && e.message) });
const call = (ch, ...a) => handlers[`vibe:${ch}`]({}, ...a);
const MD = (titulo) => ['Objetivo', 'Público e usuários', 'Funcionalidades', 'Fora do escopo', 'Telas e fluxos', 'Dados e regras de negócio', 'Integrações e acessos', 'Tecnologia', 'Critério de pronto'].map((h) => `## ${h}\n${titulo}: conteúdo de ${h}.\n`).join('\n');

(async () => {
  // papel: dono, não-dono, sem remoto
  const e0 = await call('mutEstado', 'proj-dono', DONO);
  check('dono (DEV1) reconhecido', e0.papel.dono && e0.papel.pode && e0.papel.branchDono === 'dev1', JSON.stringify(e0.papel).slice(0, 160));
  // participantes inválidos
  let r = await call('mutIniciar', 'proj-dono', { nome: 'Dono', pasta: DONO }, [{ nome: 'Ana', branch: 'master' }, { nome: '', branch: 'dev3' }, { nome: 'Eu', branch: 'dev1' }]);
  check('participantes inválidos recusados (master, sem nome); a branch do dono vale desde a DEV2-023', !r.ok && r.problemas.length === 2, (r.problemas || []).join(' | '));
  r = await call('mutIniciar', 'proj-dono', { nome: 'Dono', pasta: DONO }, [{ nome: 'Ana', branch: 'dev2' }, { nome: 'Bia', branch: 'dev3' }]);
  check('participantes válidos', r.ok && r.dono.participantes.length === 2);
  const pr = await call('mutPrompt', 'proj-dono');
  const ped = fs.readFileSync(path.join(DONO, 'mutirao/PEDIDO.md'), 'utf8'); check('pedido de uma linha + instruções em mutirao/PEDIDO.md', pr && pr.length < 80 && ped.includes('mutirao/divisao.json') && ped.includes('dev2'), pr.length + ' caracteres digitados');
  // sem divisão ainda
  let cf = await call('mutConferir', 'proj-dono');
  check('sem divisao.json = não confere', !cf.ok && /ainda não gravou/.test(cf.problemas[0]));
  // divisão com arquivo em comum (pasta src/ x src/a.js) e um arquivo igual
  const div = (pA, pB) => ({ branchDono: 'dev1', participantes: [{ nome: 'Ana', branch: 'dev2' }, { nome: 'Bia', branch: 'dev3' }], partes: [{ branch: 'dev2', titulo: 'Tela', objetivo: 'Fazer a tela', criterio: 'tela pronta', arquivos: pA }, { branch: 'dev3', titulo: 'Docs', objetivo: 'Fazer docs', criterio: 'docs prontos', arquivos: pB }] });
  W(path.join(DONO, 'mutirao/divisao.json'), JSON.stringify(div(['src/', 'README.md'], ['./src/a.js', 'docs', 'readme.md']), null, 2));
  W(path.join(DONO, 'mutirao/partes/dev2.md'), MD('Ana')); W(path.join(DONO, 'mutirao/partes/dev3.md'), MD('Bia'));
  cf = await call('mutConferir', 'proj-dono');
  check('divisão com arquivo em comum é RECUSADA', !cf.ok && cf.conflitos.length === 2, cf.problemas.join(' | '));
  let pb = await call('mutPublicar', 'proj-dono');
  check('publicar recusa divisão com arquivo em comum', !pb.ok && g(DONO, 'log', '--oneline', 'dev1').split('\n').length === 1);
  // curinga e raiz
  W(path.join(DONO, 'mutirao/divisao.json'), JSON.stringify(div(['src/**/*.js'], ['.', 'src/b.js']), null, 2));
  cf = await call('mutConferir', 'proj-dono');
  check('curinga e "." (projeto inteiro) recusados', !cf.ok && cf.conflitos.some((c) => /raiz/.test(c.motivo)) && cf.conflitos.some((c) => c.b), cf.problemas.join(' | '));
  // parte .md incompleta
  W(path.join(DONO, 'mutirao/divisao.json'), JSON.stringify(div(['src/'], ['docs/']), null, 2));
  W(path.join(DONO, 'mutirao/partes/dev3.md'), '## Objetivo\nsó isso\n');
  cf = await call('mutConferir', 'proj-dono');
  check('parte .md sem as 9 seções recusada', !cf.ok && cf.problemas.some((p) => /dev3\.md/.test(p)), cf.problemas.join(' | '));
  W(path.join(DONO, 'mutirao/partes/dev3.md'), MD('Bia'));
  W(path.join(DONO, 'src/fora.txt'), 'mudança fora de mutirao\n');
  cf = await call('mutConferir', 'proj-dono');
  check('divisão sem arquivo em comum aceita', cf.ok && cf.partes.length === 2, cf.problemas.join(' | '));
  check('aviso de mudança fora de mutirao/', cf.avisos.length === 1, cf.avisos[0]);
  pb = await call('mutPublicar', 'proj-dono');
  check('publicar: commit e push na dev1', pb.ok && g(DONO, 'rev-parse', 'origin/dev1') === pb.sha, JSON.stringify(pb));
  const files = g(DONO, 'show', '--name-only', '--format=', pb.sha).split('\n');
  check('commit só com mutirao/', files.every((f) => f.startsWith('mutirao/')) && files.length === 3 && !files.includes('mutirao/PEDIDO.md'), files.join(','));
  check('src/fora.txt continua fora do commit (não descartado)', fs.existsSync(path.join(DONO, 'src/fora.txt')) && g(DONO, 'status', '--porcelain').includes('src/fora.txt'));
  check('master do remoto intacta', g(DONO, 'rev-parse', 'origin/master') === masterSha);
  let ct = await call('mutContador', 'proj-dono');
  check('contador 0/2', ct.k === 0 && ct.n === 2, JSON.stringify(ct).slice(0, 200));

  // sócio dev2 (fluxo, papel DEV2): não-dono; depois de sincronizar, tem a parte
  for (const [dir, b] of [[S2, 'dev2'], [S3, 'dev3']]) {
    execFileSync('git', ['clone', '-q', '-b', b, REM, dir]);
    for (const [k, v] of [['user.name', b], ['user.email', `${b}@t`]]) g(dir, 'config', k, v);
    W(path.join(dir, 'CLAUDE.local.md'), `papel: "${b.toUpperCase()}"\nbranch_padrao: "${b}"\n`);
  }
  let e2 = await call('mutEstado', 'proj-s2', S2);
  check('sócio (DEV2) não é dono e não tem parte antes de sincronizar', !e2.papel.dono && !e2.parte.tem, e2.papel.motivo);
  g(S2, 'merge', '-q', 'origin/dev1');
  e2 = await call('mutEstado', 'proj-s2', S2);
  check('sócio tem a parte depois de sincronizar', e2.parte.tem && e2.parte.branch === 'dev2' && e2.parte.titulo === 'Tela', JSON.stringify(e2.parte).slice(0, 200));
  const ap = await call('mutAplicar', 'proj-s2', S2);
  const ras = JSON.parse(fs.readFileSync(path.join(UD, 'vibe', 'proj-s2', 'rascunho.json'), 'utf8'));
  check('Vibe pré-preenchido (objetivo, critério, estrutura = parte, marcador)', ap.ok && ras.objetivo === 'Fazer a tela' && ras.criterio === 'tela pronta' && ras.estrutura.endsWith(path.join('mutirao', 'partes', 'dev2.md')) && ras.mutirao === 'dev2' && /src\//.test(ras.proibido));
  await call('draftSet', 'proj-s2', { objetivo: 'x', criterio: 'y', estrutura: ras.estrutura });
  check('rascunho salvo pela tela mantém o marcador do Mutirão', JSON.parse(fs.readFileSync(path.join(UD, 'vibe', 'proj-s2', 'rascunho.json'), 'utf8')).mutirao === 'dev2');
  // branch do Vibe do sócio = a da parte
  W(path.join(UD, 'vibe', 'proj-s2', 'entrega.json'), JSON.stringify({ projeto: { id: 'proj-s2', pasta: S2 } }));
  const gi = await call('gitInfo', 'proj-s2');
  check('branch permitida do Vibe do sócio = dev2', gi.permitida === 'dev2', gi.permitida);
  // entrega simulada
  W(path.join(S2, 'src/a.js'), 'tela\n'); g(S2, 'commit', '-qam', 'T1: tela');
  const en = await call('mutEntregar', 'proj-s2', { feitas: [{ id: 'T1', titulo: 'tela', commit: 'abc T1: tela' }], resumo: 'teste', teste: true });
  check('entrega: commit e push só da dev2', en.ok && g(S2, 'rev-parse', 'origin/dev2') === en.sha && g(S2, 'show', '--name-only', '--format=', en.sha) === 'mutirao/entregas/dev2.json', JSON.stringify(en));
  check('master do remoto intacta depois da entrega', g(S2, 'ls-remote', 'origin', 'refs/heads/master').startsWith(masterSha));
  ct = await call('mutContador', 'proj-dono');
  check('contador 1/2', ct.k === 1 && ct.lista.find((x) => x.branch === 'dev2').entregue);
  e2 = await call('mutEstado', 'proj-s2', S2);
  check('parte do sócio aparece como entregue', e2.parte.tem && !!e2.parte.entregue);
  // dev3: entrega fora da branch recusada; depois entrega certa
  g(S3, 'merge', '-q', 'origin/dev1'); await call('mutAplicar', 'proj-s3', S3);
  g(S3, 'switch', '-qc', 'outra');
  let e3 = await call('mutEntregar', 'proj-s3', { feitas: [], teste: true });
  check('entrega fora da branch da parte recusada', !e3.ok && /não está na branch/.test(e3.motivo), e3.motivo);
  g(S3, 'switch', '-q', 'dev3');
  e3 = await call('mutEntregar', 'proj-s3', { feitas: [], teste: true });
  ct = await call('mutContador', 'proj-dono');
  check('contador 2/2', e3.ok && ct.k === 2 && ct.n === 2, JSON.stringify(ct.lista.map((x) => `${x.branch}:${x.entregue}`)));
  // projeto sem fluxo e sem remoto
  const SR = path.join(S, 'semremoto'); fs.mkdirSync(SR); execFileSync('git', ['init', '-q', '-b', 'master', SR]);
  const es = await call('mutEstado', 'proj-sr', SR);
  check('sem fluxo e sem remoto: dono, mas avisa e bloqueia', es.papel.dono && !es.papel.pode && /remoto/.test(es.papel.motivo) && es.papel.branchDono === 'dev1', es.papel.motivo);
  // backups do .claude.json: só os 10 mais recentes
  W(process.env.TERMIX_VIBE_CLAUDE_JSON, JSON.stringify({ projects: {} }));
  const bdir = path.join(UD, 'vibe', 'backup-claude-json'); fs.mkdirSync(bdir, { recursive: true });
  for (let i = 0; i < 14; i++) W(path.join(bdir, `claude-2020-01-${String(i + 1).padStart(2, '0')}T00-00-00-000Z.json`), '{}');
  const tr = await call('trust', 'proj-dono');
  const bs = fs.readdirSync(bdir).sort();
  check('backups do .claude.json: ficam só os 10 mais recentes', tr.ok && bs.length === 10 && bs[bs.length - 1] === path.basename(tr.backup) && !bs.includes('claude-2020-01-05T00-00-00-000Z.json'), `${bs.length} arquivos`);
  // trava da aba do Mutirão
  const sf = vibe.spawnSettings({ tabId: 'aba-mut-1', cwd: DONO, args: ['--session-id', 'x', '--name', 'Mutirão · Orquestrador'], settings: { statusLine: { type: 'command', command: 'x' } } });
  const sj = sf && JSON.parse(fs.readFileSync(sf, 'utf8'));
  check('aba "Mutirão · Orquestrador" abre com a trava (PreToolUse + deny)', sj && sj.hooks.PreToolUse && sj.permissions.deny.length > 5 && sj.statusLine, sf);
  check('outra aba do projeto não recebe a trava', vibe.spawnSettings({ tabId: 'aba-x', cwd: DONO, args: ['--name', 'Claude 1'] }) === null);
  console.log(`\n${ok} certos, ${bad} errados`);
})();
