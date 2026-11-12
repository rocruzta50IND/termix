// DEV2-026 etapa 1 (adaptado do DEV2-024; sem IA, sem credencial): análise do Organizador com pastas de brinquedo e conversas falsas numa
// CLAUDE_CONFIG_DIR de teste, e a recomendação (conversa mais recente de orquestrador e de dev) do lado da interface,
// rodando o organizador.js da interface num vm com o mínimo do escopo global. Uso: node org24.js <raiz do Termix>
const { ROOT: ROOT_PADRAO, WORK } = require('./lib'); // raiz do repositório e pasta temporária do sistema
const fs = require('fs'), path = require('path'), vm = require('vm'); const { execFileSync } = require('child_process');
const ROOT = (process.argv[2] || ROOT_PADRAO), S = path.join(WORK, 'o24');
fs.rmSync(S, { recursive: true, force: true }); fs.mkdirSync(S, { recursive: true });
process.env.TERMIX_VIBE_TEST = '1';
process.env.CLAUDE_CONFIG_DIR = path.join(S, 'claude-cfg');
process.env.TERMIX_VIBE_CLAUDE_JSON = path.join(S, 'claude-teste.json');
fs.writeFileSync(process.env.TERMIX_VIBE_CLAUDE_JSON, '{"projects":{}}');
const W = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); };
let ok = 0, bad = 0; const check = (n, c, extra = '') => { if (c) ok++; else bad++; console.log(`${c ? 'OK  ' : 'FALHOU'} ${n}${extra ? ' — ' + extra : ''}`); };
const g = (dir, ...a) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

// pastas de brinquedo
const P = { dev: path.join(S, 'Loja'), orq: path.join(S, 'Loja-ORQ'), dev3: path.join(S, 'Loja-dev3'), notas: path.join(S, 'Notas'), orq2: path.join(S, 'Outra-ORQ') };
for (const [k, d] of Object.entries(P)) {
  fs.mkdirSync(d, { recursive: true });
  if (k !== 'notas') { execFileSync('git', ['init', '-q', '-b', 'main', d]); g(d, 'config', 'user.name', 't'); g(d, 'config', 'user.email', 't@t'); W(path.join(d, 'README.md'), `# ${k}\n`); g(d, 'add', '-A'); g(d, 'commit', '-qm', 'inicio'); }
}
W(path.join(P.dev, 'CLAUDE.local.md'), 'papel: "DEV1"\nbranch_padrao: "dev1"\n');
W(path.join(P.dev3, 'CLAUDE.local.md'), 'papel: "DEV3"\nbranch_padrao: "dev3"\n');
W(path.join(P.notas, 'ideias.txt'), 'nada\n');
const antes = Object.fromEntries(Object.values(P).map((d) => [d, fs.readdirSync(d).sort().join(',')]));

// conversas falsas
const H = 3600000, now = Date.now();
const conv = (pasta, horas, titulo, kb = 2) => {
  const id = require('crypto').randomUUID();
  const f = path.join(process.env.CLAUDE_CONFIG_DIR, 'projects', pasta.replace(/[^a-zA-Z0-9]/g, '-'), `${id}.jsonl`);
  W(f, `${JSON.stringify({ type: 'custom-title', customTitle: titulo })}\n${JSON.stringify({ type: 'user', message: { content: `pedido ${titulo}` } })}\n${'x'.repeat(kb * 1024)}\n`);
  const t = new Date(now - horas * H); fs.utimesSync(f, t, t);
  return id;
};
const C = {
  devVelha: conv(P.dev, 10, 'dev antiga'), devMeio: conv(P.dev, 2, 'dev meio'),
  orqNova: conv(P.orq, 1, 'orq nova'), orqVelha: conv(P.orq, 5, 'orq velha'),
  dev3Nova: conv(P.dev3, 0.5, 'dev3 nova'),
  notasNova: conv(P.notas, 0.1, 'notas nova'),
  orq2Velha: conv(P.orq2, 8, 'outra orq velha'),
};

(async () => {
  const handlers = {};
  require(path.join(ROOT, 'src/vibe/index.js')).create({ ipcMain: { handle: (ch, fn) => { handlers[ch] = fn; } }, app: { getPath: () => path.join(S, 'ud') }, dialog: null, getWin: () => null, logError: (e) => console.log('logError', e && e.message) });
  const call = (ch, ...a) => handlers[`vibe:${ch}`]({}, ...a);

  // escolha de várias pastas (no teste, as pastas entram sem o diálogo)
  const pk = await call('orgPick', Object.values(P));
  check('seletor devolve as várias pastas', pk.ok && pk.pastas.length === 5, String(pk.pastas.length));
  const an = await call('orgAnalisar', [P.dev, P.orq, P.dev3, P.notas, P.orq2]);
  const by = (d) => an.lista.find((a) => a.pasta.toLowerCase() === d.toLowerCase());
  check('papéis: Loja = Dev, Loja-ORQ = Orquestrador, Loja-dev3 = Dev, Notas = Outro', by(P.dev).papel === 'Dev' && by(P.orq).papel === 'Orquestrador' && by(P.dev3).papel === 'Dev' && by(P.notas).papel === 'Outro', an.lista.map((a) => `${a.nome}=${a.papel}`).join(' '));
  check('conversas lidas da CLAUDE_CONFIG_DIR de teste, mais recente primeiro', by(P.dev).sessoes.length === 2 && by(P.dev).sessoes[0].id === C.devMeio && by(P.orq).sessoes[0].id === C.orqNova);

  // interface: o organizador.js num vm com o mínimo do escopo global
  const win = { termix: { onHook: () => {}, vibe: (ch, ...a) => call(ch, ...a) } };
  const ctx = { window: win, document: { readyState: 'complete', getElementById: () => null, addEventListener: () => {} }, console, setTimeout, clearTimeout, Promise, crypto: globalThis.crypto, S: { projects: [], settings: {} } };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/renderer/vibe/organizador.js'), 'utf8'), ctx);
  check('window.TermixOrg exposto (pick e mapaDe) para o "Usar pasta existente"', typeof win.TermixOrg.pick === 'function' && typeof win.TermixOrg.mapaDe === 'function');
  win.__npTestPaths = [P.dev, P.orq];
  const pk2 = await win.TermixOrg.pick();
  check('TermixOrg.pick devolve a lista (modo de teste)', Array.isArray(pk2) && pk2.length === 2);
  const rows = win.orgTest.linhas(an);
  const prin = rows.filter((r) => r.principal);
  check('várias pastas = UM projeto: exatamente uma pasta principal', prin.length === 1, String(prin.length));
  check('a principal é uma pasta de papel Dev (Loja ou Loja-dev3), não a orquestrador nem a Outro', prin[0].papel === 'Dev');
  check('linhas sem os campos de retomada por pasta (DEV2-026)', rows.every((r) => !('ret' in r) && !('rec' in r)));
  const rows2 = win.orgTest.linhas({ lista: an.lista.filter((a) => [P.orq, P.notas].includes(a.pasta)) });
  check('sem pasta Dev: escolhe entre as existentes (a de commit mais recente)', rows2.filter((r) => r.principal).length === 1);
  const rows3 = win.orgTest.linhas({ lista: [{ ...by(P.dev), existe: false }] });
  check('pasta inexistente nunca é principal', !rows3[0].principal);
  const rm = await call('retPrincipal', an.lista);
  check('retPrincipal (processo principal) devolve uma pasta Dev', [P.dev, P.dev3].some((d) => d.toLowerCase() === String(rm).toLowerCase()), String(rm));
  // conversas de TODAS as pastas entram na lista (5.1-B), mais recente primeiro e marcada
  const cv = await call('retConversas', Object.values(P));
  check('lista de chats junta as conversas de todas as pastas (7), do mais recente ao mais antigo', cv.length === 7 && cv[0].id === C.notasNova && cv.every((c, i) => !i || cv[i - 1].mtime >= c.mtime), String(cv.length));
  check('o mais recente vem marcado e traz data, tamanho e custo estimado', cv[0].recente === true && !cv[1].recente && cv[0].size > 0 && cv[0].tokens >= 0);
  check('pastas do usuário sem nenhuma mudança', Object.entries(antes).every(([d, l]) => fs.readdirSync(d).sort().join(',') === l));
  console.log(`\n${ok} OK, ${bad} FALHOU`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.log('ERRO', e); process.exit(1); });
