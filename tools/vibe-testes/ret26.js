// DEV2-026 etapas 2 e 3 (sem IA): estrutura, pedidos e a coleta em segundo plano com um "claude" falso e uma
// CLAUDE_CONFIG_DIR de teste. Uso: node ret26.js <raiz do Termix>
const { ROOT: ROOT_PADRAO, WORK } = require('./lib'); // raiz do repositório e pasta temporária do sistema
const fs = require('fs'), path = require('path'), crypto = require('crypto'); const { execFileSync } = require('child_process');
const ROOT = (process.argv[2] || ROOT_PADRAO), S = path.join(WORK, 'r26'), FAKE = path.join(WORK, 'fakeret');
const realHelp = (() => { try { return execFileSync('claude', ['--help'], { encoding: 'utf8', shell: true }); } catch (e) { return ''; } })(); // antes de pôr o falso no PATH
fs.rmSync(S, { recursive: true, force: true }); fs.mkdirSync(S, { recursive: true });
process.env.TERMIX_VIBE_TEST = '1'; process.env.CLAUDE_CONFIG_DIR = path.join(S, 'claude-cfg');
process.env.TERMIX_VIBE_CLAUDE_JSON = path.join(S, 'claude-teste.json'); fs.writeFileSync(process.env.TERMIX_VIBE_CLAUDE_JSON, '{"projects":{}}');
process.env.PATH = `${FAKE};${process.env.PATH}`; process.env.FAKE_RET_CFG = path.join(S, 'fake.json'); process.env.FAKE_RET_LOG = path.join(S, 'fake.log');
fs.writeFileSync(process.env.FAKE_RET_CFG, '{}'); fs.writeFileSync(process.env.FAKE_RET_LOG, '');
const W = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); };
const R = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '');
let ok = 0, bad = 0; const check = (n, c, extra = '') => { if (c) ok++; else bad++; console.log(`${c ? 'OK  ' : 'FALHOU'} ${n}${extra ? ' — ' + extra : ''}`); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const g = (dir, ...a) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const mk = (nome, files = {}) => { const d = path.join(S, nome); fs.mkdirSync(d, { recursive: true }); execFileSync('git', ['init', '-q', '-b', 'main', d]); g(d, 'config', 'user.name', 't'); g(d, 'config', 'user.email', 't@t'); W(path.join(d, 'README.md'), `# ${nome}\n`); for (const [k, v] of Object.entries(files)) W(path.join(d, k), v); g(d, 'add', '-A'); g(d, 'commit', '-qm', 'inicio'); return d; };
const LONGO = 'conteúdo suficiente para contar como arquivo com conteúdo real\n';
const P = {
  vazio: mk('Vazio'), soGuia: mk('SoGuia', { 'CLAUDE.md': LONGO }), cheio: mk('Cheio', { 'CLAUDE.md': LONGO, 'docs/TASKS.md': LONGO, 'docs/ESTADO.md': LONGO }),
  fluxo: mk('ComFluxo', { 'CLAUDE.md': LONGO, 'docs/TASKS.md': LONGO, 'docs/HANDOFF_DEV2.md': LONGO, 'WORKFLOW.md': LONGO, '.claude/fluxo.json': '{"versao_fluxo":1}', '.claude/commands/retomar.md': 'rode algo\n' }),
  vazioArq: mk('ArqVazio', { 'CLAUDE.md': '\n', 'docs/TASKS.md': '# t\n', 'docs/ESTADO.md': '' }),
  conv: mk('ComChats'), conv2: mk('ComChats-ORQ'),
};
const snap = () => Object.fromEntries(Object.values(P).map((d) => [d, execFileSync('git', ['-C', d, 'status', '--porcelain'], { encoding: 'utf8' }) + fs.readdirSync(d).sort().join(',')]));
const antes = snap();
const H = 3600000, now = Date.now();
const conv = (pasta, horas, titulo, kb = 4) => { const id = crypto.randomUUID(); const f = path.join(process.env.CLAUDE_CONFIG_DIR, 'projects', pasta.replace(/[^a-zA-Z0-9]/g, '-'), `${id}.jsonl`); W(f, `${JSON.stringify({ type: 'custom-title', customTitle: titulo })}\n${'x'.repeat(kb * 1024)}\n`); const t = new Date(now - horas * H); fs.utimesSync(f, t, t); return id; };
const CV = [conv(P.conv, 1, 'c1'), conv(P.conv, 2, 'c2'), conv(P.conv2, 3, 'c3'), conv(P.conv2, 4, 'c4'), conv(P.conv, 5, 'c5'), conv(P.conv, 6, 'c6'), conv(P.conv2, 7, 'c7')];

(async () => {
  const handlers = {};
  require(path.join(ROOT, 'src/vibe/index.js')).create({ ipcMain: { handle: (ch, fn) => { handlers[ch] = fn; } }, app: { getPath: () => path.join(S, 'ud') }, dialog: null, getWin: () => null, logError: (e) => console.log('logError', e && e.message) });
  const call = (ch, ...a) => handlers[`vibe:${ch}`]({}, ...a);

  // ---- flags do claude CLI conferidas na ajuda do CLI real (sem IA) ----
  if (realHelp) for (const fl of ['-p, --print', '-r, --resume', '--fork-session', '--model', '--tools', '--permission-mode', '--output-format']) check(`claude --help traz ${fl}`, realHelp.includes(fl));
  else check('claude --help disponível (pulado: CLI real não achado)', true);

  // ---- detecção da estrutura ----
  const e = async (d) => call('retEstrutura', d);
  const e0 = await e(P.vazio), e1 = await e(P.soGuia), e2 = await e(P.cheio), e3 = await e(P.fluxo), e4 = await e(P.vazioArq);
  check('projeto sem nada: falta guia, tarefas e estado', !e0.completa && e0.falta.length === 3 && !e0.guia && !e0.tarefas && !e0.estado);
  check('só CLAUDE.md: faltam tarefas e estado (completa só o que falta)', !e1.completa && e1.guia === 'CLAUDE.md' && e1.falta.length === 2);
  check('CLAUDE.md + docs/TASKS.md + docs/ESTADO.md = estrutura existente', e2.completa && e2.estado === 'docs/ESTADO.md');
  check('projeto com o fluxo (TASKS + HANDOFF) conta como estruturado: nada de /fluxo:init', e3.completa && e3.estado === 'docs/HANDOFF_DEV2.md');
  check('arquivos vazios ou só com título não contam ("com conteúdo")', !e4.completa && e4.falta.length === 3);
  check('pasta inexistente não quebra', (await e(path.join(S, 'nao-existe'))).ok === false);

  // ---- pedidos ----
  const pe = await call('retPedidoEstrutura', { id: 'proj-a', nome: 'Loja', pasta: P.vazio, pastas: [P.vazio] });
  const txt = R(pe.arquivo);
  check('pedido (i), sem conversas: README, manifestos, árvore em 2 níveis, git log curto e grep nos pontos de entrada', /README/.test(txt) && /manifestos/.test(txt) && /2 níveis/.test(txt) && /git log/.test(txt) && /grep/.test(txt) && !/respostas das conversas/.test(txt));
  check('pedido manda gravar CLAUDE.md (só acrescentar), docs/TASKS.md e docs/ESTADO.md, SEM commit', /CLAUDE\.md/.test(txt) && /ACRESCENTE/.test(txt) && /docs\/TASKS\.md/.test(txt) && /docs\/ESTADO\.md/.test(txt) && /SEM commit/.test(txt) && /Em andamento/.test(txt) && /Pendentes/.test(txt) && /Conclu/.test(txt));
  check('pedido manda manter a estrutura atualizada a cada tarefa', /a cada tarefa/.test(txt));
  check('pedido proíbe o /fluxo:init e o fluxo Rocruzta (5.5-B)', /NÃO use o \/fluxo:init/.test(txt));
  const pr1 = R((await call('retPedidoRetomar', { id: 'proj-a', nome: 'Loja', pasta: P.fluxo })).arquivo), pr2 = R((await call('retPedidoRetomar', { id: 'proj-b', nome: 'Loja', pasta: P.cheio })).arquivo);
  check('pedido de retomar: com .claude/commands/retomar.md manda rodar /retomar', /Rode `\/retomar`/.test(pr1) && !/changelog/i.test(pr1));
  check('pedido de retomar sem /retomar: só o guia, a tarefa em andamento, o estado, o último changelog e um git log curto', /guia/.test(pr2) && /Em andamento/.test(pr2) && /changelog/i.test(pr2) && /git log --oneline -10/.test(pr2) && !/Rode `\/retomar`/.test(pr2) && /onde paramos/.test(pr2) && /tarefas pendentes/.test(pr2));

  // ---- conversas ----
  const lista = await call('retConversas', [P.conv, P.conv2]);
  check('lista de chats: 7 conversas das duas pastas, a mais recente marcada', lista.length === 7 && lista[0].id === CV[0] && lista[0].recente && lista.slice(1).every((c) => !c.recente));
  const prompt = await call('retPromptFixo');
  check('PROMPT FIXO: ~800 palavras, "não sei", sem chute e os 8 itens', /800 palavras/.test(prompt) && /não sei/.test(prompt) && /não chute/.test(prompt) && [1, 2, 3, 4, 5, 6, 7, 8].every((n) => new RegExp(`^${n}\\. `, 'm').test(prompt)) && /Objetivo/.test(prompt) && /Como rodar e testar/.test(prompt) && /Regras e preferências/.test(prompt));
  check('teto padrão de 5 conversas', (await call('retTeto')) === 5);

  // ---- coleta em segundo plano ----
  const marcadas = lista.slice(0, 5).map((c) => ({ id: c.id, pasta: c.pasta }));
  const r6 = await call('retColetaIniciar', { id: 'proj-col', nome: 'Loja', convs: lista.map((c) => ({ id: c.id, pasta: c.pasta })) });
  check('com 7 marcadas, só as 5 mais recentes entram (teto)', r6.ok && r6.total === 5);
  check('segunda coleta do mesmo projeto enquanto roda é recusada', (await call('retColetaIniciar', { id: 'proj-col', nome: 'Loja', convs: marcadas })).ok === false);
  let est = null;
  for (let i = 0; i < 100; i++) { est = await call('retColetaEstado', 'proj-col'); if (est && est.status !== 'rodando') break; await wait(200); }
  check('progresso k/N: pronta com 5/5 e nenhuma falha', est.status === 'pronta' && est.feitas === 5 && est.total === 5 && est.falhas === 0, JSON.stringify({ s: est.status, f: est.feitas }));
  const log = R(process.env.FAKE_RET_LOG).trim().split('\n').map((l) => JSON.parse(l));
  check('o claude falso foi chamado 5 vezes, uma por conversa, na ordem (mais recente primeiro)', log.length === 5 && log.every((l, i) => l.args[l.args.indexOf('--resume') + 1] === lista[i].id));
  check('uma por vez: nenhuma chamada começou antes da anterior terminar', log.every((l, i) => !i || l.t0 >= log[i - 1].t1 - 50));
  const a0 = log[0].args;
  check('flags: -p, --resume <id>, --fork-session, --model sonnet, --permission-mode dontAsk, --output-format json', a0[0] === '-p' && a0.includes('--resume') && a0.includes('--fork-session') && a0[a0.indexOf('--model') + 1] === 'sonnet' && a0[a0.indexOf('--permission-mode') + 1] === 'dontAsk' && a0[a0.indexOf('--output-format') + 1] === 'json');
  check('somente leitura: --tools "" (nenhuma ferramenta), nem Bash nem Write/Edit liberados', a0.includes('--tools') && a0[a0.indexOf('--tools') + 1] === '' && !a0.some((x) => /allowedTools|dangerously|bypass/i.test(x)), JSON.stringify(a0));
  check('roda na pasta da conversa (a que o Claude Code usa para achar o histórico)', log.every((l, i) => l.cwd.toLowerCase() === lista[i].pasta.toLowerCase()));
  check('o prompt vai pelo stdin e é o PROMPT FIXO', log.every((l) => l.stdin === prompt));
  const rd = path.join(S, 'ud', 'retomar', 'proj-col', 'respostas');
  const files = fs.existsSync(rd) ? fs.readdirSync(rd).filter((f) => f.endsWith('.txt')) : [];
  check('as 5 respostas ficam em texto na pasta de dados do Termix', files.length === 5 && /Resposta falsa da conversa/.test(R(path.join(rd, files[0]))));
  const pe2 = await call('retPedidoEstrutura', { id: 'proj-col', nome: 'Loja', pasta: P.conv, pastas: [P.conv, P.conv2] });
  const t2 = R(pe2.arquivo);
  check('com respostas: o orquestrador novo lê as 5 respostas, README/manifestos/git log, e as outras pastas ficam citadas', pe2.respostas === 5 && files.every((f) => t2.includes(f)) && t2.includes(P.conv2) && /prefira a mais recente/.test(t2));
  const lista2 = await call('retConversas', [P.conv, P.conv2]);
  check('as cópias (fork) criadas pela coleta ficam fora da lista de chats', lista2.length === 7 && fs.existsSync(path.join(S, 'ud', 'retomar', 'forks.json')) && JSON.parse(R(path.join(S, 'ud', 'retomar', 'forks.json'))).length === 5);

  // falha de uma conversa não derruba as outras; cancelar interrompe e não apaga o que já veio
  W(process.env.FAKE_RET_CFG, JSON.stringify({ falha: [CV[1]], demora: 150 })); fs.writeFileSync(process.env.FAKE_RET_LOG, '');
  await call('retColetaIniciar', { id: 'proj-falha', nome: 'Loja', convs: lista.slice(0, 3).map((c) => ({ id: c.id, pasta: c.pasta })) });
  for (let i = 0; i < 100; i++) { est = await call('retColetaEstado', 'proj-falha'); if (est && est.status !== 'rodando') break; await wait(200); }
  check('uma conversa falha: as outras seguem (2 ok, 1 falha) e o erro é guardado', est.status === 'pronta' && est.feitas === 2 && est.falhas === 1 && est.itens[1].status === 'falhou' && /não encontrada/.test(est.itens[1].erro), JSON.stringify(est.itens.map((x) => x.status)));
  W(process.env.FAKE_RET_CFG, JSON.stringify({ demora: 1500 })); fs.writeFileSync(process.env.FAKE_RET_LOG, '');
  await call('retColetaIniciar', { id: 'proj-canc', nome: 'Loja', convs: lista.slice(0, 4).map((c) => ({ id: c.id, pasta: c.pasta })) });
  await wait(3200); const ok1 = await call('retColetaCancelar', 'proj-canc');
  for (let i = 0; i < 50; i++) { est = await call('retColetaEstado', 'proj-canc'); if (est && est.status !== 'rodando') break; await wait(200); }
  check('cancelar: status "cancelada", o que já veio fica e as outras não rodam', ok1 && est.status === 'cancelada' && est.feitas >= 1 && est.feitas < 4, JSON.stringify({ f: est.feitas, s: est.status }));
  check('sem conversa marcada, a coleta é recusada', (await call('retColetaIniciar', { id: 'proj-x', nome: 'Loja', convs: [] })).ok === false);

  check('as pastas do usuário não mudaram (nada criado, movido ou apagado)', JSON.stringify(snap()) === JSON.stringify(antes));
  console.log(`\n${ok} OK, ${bad} FALHOU`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.log('ERRO', e); process.exit(1); });
