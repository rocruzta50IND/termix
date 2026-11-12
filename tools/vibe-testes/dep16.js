// DEV2-016 (sem tokens): deploy feito pelo Termix, módulo do processo principal, com remotos bare locais.
// Uso: node dep16.js <raiz do Termix>
const { ROOT: ROOT_PADRAO, WORK } = require('./lib'); // raiz do repositório e pasta temporária do sistema
const fs = require('fs'), path = require('path'); const { execFileSync } = require('child_process');
const ROOT = (process.argv[2] || ROOT_PADRAO), S = path.join(WORK, 'd16');
fs.rmSync(S, { recursive: true, force: true }); fs.mkdirSync(S, { recursive: true });
process.env.TERMIX_VIBE_TEST = '1';
let ok = 0, bad = 0; const check = (n, c, extra = '') => { if (c) ok++; else bad++; console.log(`${c ? 'OK  ' : 'FALHOU'} ${n}${extra ? ' — ' + extra : ''}`); };
const W = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); };
const R = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '');
const g = (dir, ...a) => { try { return execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); } catch (e) { return `ERRO ${String(e.stderr || e.message).split('\n')[0]}`; } };
const gok = (dir, ...a) => { try { execFileSync('git', ['-C', dir, ...a], { stdio: 'ignore' }); return true; } catch { return false; } };
const UD = path.join(S, 'ud'), PUB = path.join(S, 'publicado').replace(/\\/g, '/');
fs.mkdirSync(PUB, { recursive: true });
const RECEITA = (nome) => `node -e "require('fs').appendFileSync('${PUB}/${nome}.txt', 'publicado\\n')"`;
const PORTAO = 'node -e "process.exit(require(\'fs\').existsSync(\'QUEBRADO\') ? 1 : 0)"';

// remoto bare (não aceita reescrever nem apagar: prova que não há force) + clone do projeto
function projeto(nome, { fluxo, papel, branch }) {
  const rem = path.join(S, `${nome}.git`), pj = path.join(S, nome);
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', rem]);
  g(rem, 'config', 'receive.denyNonFastForwards', 'true'); g(rem, 'config', 'receive.denyDeletes', 'true');
  execFileSync('git', ['clone', '-q', rem, pj], { stdio: 'ignore' });
  g(pj, 'config', 'user.name', 'Teste'); g(pj, 'config', 'user.email', 't@exemplo.invalid'); g(pj, 'switch', '-qc', 'main');
  W(path.join(pj, 'README.md'), `# ${nome}\nlinha 1\n`);
  W(path.join(pj, 'package.json'), JSON.stringify({ name: nome, version: '1.0.0' }, null, 2) + '\n');
  if (fluxo) { W(path.join(pj, '.claude', 'fluxo.json'), JSON.stringify({ validacao: [PORTAO] })); W(path.join(pj, '.gitignore'), 'CLAUDE.local.md\n'); }
  g(pj, 'add', '-A'); g(pj, 'commit', '-qm', 'inicio'); g(pj, 'push', '-q', 'origin', 'main');
  if (fluxo) W(path.join(pj, 'CLAUDE.local.md'), `papel: "${papel}"\nbranch_padrao: "${branch}"\n`);
  g(pj, 'switch', '-qc', branch);
  const id = `d16${nome}`;
  W(path.join(UD, 'vibe', id, 'entrega.json'), JSON.stringify({ versao: 1, status: 'pronta', projeto: { id, nome, pasta: pj }, objetivo: 'x', criterioDePronto: 'y', arquivos: {} }));
  return { id, pj, rem };
}
const commit = (pj, arq, txt, msg) => { W(path.join(pj, arq), txt); g(pj, 'add', '-A'); g(pj, 'commit', '-qm', msg); };
const h = {};
const api = require(path.join(ROOT, 'src/vibe/index.js')).create({ ipcMain: { handle: (ch, fn) => { h[ch] = fn; } }, app: { getPath: () => UD }, dialog: null, getWin: () => null, logError: (e) => console.log('logError', e && e.stack) });
const call = (ch, ...a) => h[`vibe:${ch}`]({}, ...a);
const pol = (id, d, extra = {}) => call('politicaSet', id, { modelo: 'deploy', deploy: { modo: 'sempre', receita: RECEITA(id), ...d }, portao: PORTAO, ...extra }, 'teste');
const vivo = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  /* ---- A: fluxo DEV1, Sempre, fast-forward da dev1 para a main ---- */
  const A = projeto('a', { fluxo: true, papel: 'DEV1', branch: 'dev1' });
  commit(A.pj, 'src/x.js', 'x\n', 'T1: x'); commit(A.pj, 'src/y.js', 'y\n', 'T2: y');
  const pA = await pol(A.id, {});
  check('A: política Sempre gravada (DEV1 pode)', pA && pA.ok && pA.politica.deploy.modo === 'sempre');
  check('A: tarefa [DEPLOY] com Sempre = pendente (o Termix faz)', (await call('politicaTarefa', A.id, { deploy: true })).deploy === 'pendente');
  const rs = await call('deployResumo', A.id);
  check('A: resumo (commits que entram, modo, portão, receita)', rs.ok && rs.commits.length === 2 && rs.modo === 'fast-forward' && rs.portao === PORTAO && rs.receita.length === 1, JSON.stringify(rs).slice(0, 200));
  const mainA0 = g(A.rem, 'rev-parse', 'main');
  let r = await call('deployExec', A.id, 'teste');
  const dev1 = g(A.pj, 'rev-parse', 'dev1');
  check('A: deploy ok, tipo fast-forward', r.ok && r.deploy.tipo === 'ff', JSON.stringify({ ok: r.ok, etapa: r.etapa, motivo: r.motivo }));
  check('A: origin/main = dev1 (fast-forward, sem merge)', g(A.rem, 'rev-parse', 'main') === dev1 && g(A.rem, 'rev-list', '--merges', '--count', 'main') === '0');
  check('A: tag anotada deploy-AAAAMMDD-HHMM no origin', /^deploy-\d{8}-\d{4}$/.test(r.tag) && g(A.rem, 'cat-file', '-t', r.tag) === 'tag' && g(A.rem, 'rev-parse', `${r.tag}^{commit}`) === dev1, r.tag);
  check('A: receita rodou com a main em checkout e gravou fora do git', /publicado/.test(R(`${PUB}/${A.id}.txt`)) && /--- receita: ok/.test(R(r.log)));
  check('A: log em vibe\\<id>\\deploys\\<tag>.log com o portão', r.log === path.join(UD, 'vibe', A.id, 'deploys', `${r.tag}.log`) && /--- portão: ok/.test(R(r.log)));
  check('A: voltou para a dev1, árvore limpa', g(A.pj, 'rev-parse', '--abbrev-ref', 'HEAD') === 'dev1' && g(A.pj, 'status', '--porcelain', '--untracked-files=no') === '');
  const tagA1 = r.tag;
  check('A: nada novo = não publica de novo', (await call('deployExec', A.id)).etapa === 'nada');

  /* portão falhando: não publica */
  commit(A.pj, 'QUEBRADO', 'x\n', 'T3: quebra o portão');
  const mainA1 = g(A.rem, 'rev-parse', 'main');
  r = await call('deployExec', A.id);
  check('portão falhando: etapa "portao", nada publicado (origin/main igual, sem tag nova)', !r.ok && r.etapa === 'portao' && g(A.rem, 'rev-parse', 'main') === mainA1 && g(A.rem, 'tag').split('\n').filter(Boolean).length === 1 && /Nada foi publicado/.test(r.motivo), r.motivo);
  check('portão falhando: continua na dev1, main local intacta', g(A.pj, 'rev-parse', '--abbrev-ref', 'HEAD') === 'dev1' && g(A.pj, 'rev-parse', 'main') === mainA1);
  g(A.pj, 'rm', '-q', 'QUEBRADO'); g(A.pj, 'commit', '-qm', 'T3: conserta');

  /* conflito na junção: a main recebeu um hotfix no remoto; a dev1 mexeu na mesma linha */
  const H = path.join(S, 'hot'); execFileSync('git', ['clone', '-q', A.rem, H], { stdio: 'ignore' });
  g(H, 'config', 'user.name', 'H'); g(H, 'config', 'user.email', 'h@exemplo.invalid');
  commit(H, 'README.md', '# a\nlinha 1 HOTFIX\n', 'hotfix na main'); g(H, 'push', '-q', 'origin', 'main');
  commit(A.pj, 'README.md', '# a\nlinha 1 DEV1\n', 'T4: readme');
  const dev1c = g(A.pj, 'rev-parse', 'dev1'), mainRemC = g(A.rem, 'rev-parse', 'main');
  r = await call('deployExec', A.id);
  check('conflito: etapa "conflito", cancelado (merge --abort), com o arquivo', !r.ok && r.etapa === 'conflito' && /README\.md/.test(r.motivo) && /cancelada sem perder nada/.test(r.motivo), r.motivo);
  check('conflito: sem perda (dev1 intacta, sem MERGE_HEAD, árvore limpa, origin/main igual)', g(A.pj, 'rev-parse', 'dev1') === dev1c && !gok(A.pj, 'rev-parse', '-q', '--verify', 'MERGE_HEAD') && g(A.pj, 'rev-parse', '--abbrev-ref', 'HEAD') === 'dev1' && g(A.pj, 'status', '--porcelain') === '' && g(A.rem, 'rev-parse', 'main') === mainRemC);
  // o humano (ou o Dev, na recuperação) traz a main para a dev1 e resolve; o deploy sai em merge --no-ff (sem fast-forward possível)
  g(A.pj, 'merge', '-q', 'origin/main'); commit(A.pj, 'README.md', '# a\nlinha 1 HOTFIX + DEV1\n', 'T4: resolve conflito');
  g(H, 'pull', '-q', '--ff-only'); commit(H, 'hot2.txt', 'h2\n', 'hotfix 2 na main (sem conflito)'); g(H, 'push', '-q', 'origin', 'main'); // a dev1 fica sem ele: sem fast-forward possível
  commit(A.pj, 'package.json', JSON.stringify({ name: 'a', version: '1.1.0' }, null, 2) + '\n', 'versao 1.1.0');
  r = await call('deployExec', A.id);
  check('fluxo sem fast-forward possível: merge --no-ff na main', r.ok && r.deploy.tipo === 'merge' && g(A.rem, 'rev-list', '--parents', '-n', '1', 'main').split(' ').length === 3, JSON.stringify({ etapa: r.etapa, motivo: r.motivo, tipo: r.deploy && r.deploy.tipo }));
  check('versão do package.json mudou: a tag é v1.1.0', r.tag === 'v1.1.0' && g(A.rem, 'cat-file', '-t', 'v1.1.0') === 'tag', r.tag);
  const tagA2 = r.tag;

  /* receita falhando depois do push */
  await pol(A.id, { receita: 'node -e "process.exit(3)"' });
  commit(A.pj, 'src/z.js', 'z\n', 'T5: z');
  r = await call('deployExec', A.id);
  check('receita falhando: a main JÁ foi enviada e a publicação falhou (mensagem clara)', !r.ok && r.enviado && r.etapa === 'receita' && /já foi enviada/.test(r.motivo) && /a publicação falhou/.test(r.motivo) && g(A.rem, 'rev-parse', 'main') === g(A.pj, 'rev-parse', 'main') && g(A.rem, 'cat-file', '-t', r.tag) === 'tag', r.motivo);
  check('receita falhando: o Termix não desfez nada sozinho e voltou para a dev1', gok(A.pj, 'merge-base', '--is-ancestor', 'dev1', 'origin/main') && g(A.rem, 'rev-parse', 'main') === g(A.pj, 'rev-parse', 'main') && g(A.pj, 'rev-parse', '--abbrev-ref', 'HEAD') === 'dev1');
  const tagA3 = r.tag;
  let lista = await call('deployLista', A.id);
  check('lista de deploys com o status "receita-falhou"', lista[0].tag === tagA3 && lista[0].status === 'receita-falhou' && lista.length === 3, JSON.stringify(lista.map((d) => d.tag + ':' + d.status)));
  await pol(A.id, { receita: RECEITA(`${A.id}-b`) });
  r = await call('deployReceita', A.id, tagA3);
  lista = await call('deployLista', A.id);
  check('"Rodar a receita de novo": ok, status publicado, voltou para a dev1', r.ok && /publicado/.test(R(`${PUB}/${A.id}-b.txt`)) && lista[0].status === 'publicado' && g(A.pj, 'rev-parse', '--abbrev-ref', 'HEAD') === 'dev1', r.motivo);

  /* voltar versão (merge): antes do deploy v1.1.0 = desfaz o último (fast-forward da T5) e o merge da v1.1.0 */
  const antesV11 = (await call('deployLista', A.id)).find((d) => d.tag === tagA2);
  const regA = JSON.parse(R(path.join(UD, 'vibe', A.id, 'deploys', 'deploys.json')));
  const dA2 = regA.deploys.find((d) => d.tag === tagA2);
  const mainAntesVolta = g(A.rem, 'rev-parse', 'main');
  r = await call('deployVoltar', A.id, tagA2);
  check('voltar versão (merge + ff do intervalo): ok, os dois deploys revertidos', r.ok && r.revertidos.join(',') === `${tagA3},${tagA2}`, JSON.stringify(r).slice(0, 300));
  check('voltar versão: a main ficou com a árvore de antes do deploy v1.1.0 (o hotfix 2, que já estava na main, ficou)', g(A.pj, 'diff', '--stat', dA2.antes, 'main') === '' && fs.existsSync(path.join(A.pj, 'hot2.txt')) === true && /hot2.txt/.test(g(A.pj, 'ls-tree', '--name-only', 'main')) && g(A.rem, 'rev-parse', 'main') === g(A.pj, 'rev-parse', 'main'));
  check('voltar versão: sem reset nem force (a main anterior é ancestral da nova; o remoto recusa não-ff)', gok(A.rem, 'merge-base', '--is-ancestor', mainAntesVolta, 'main') && Number(g(A.rem, 'rev-list', '--count', `${mainAntesVolta}..main`)) >= 2 && /Revert/.test(g(A.rem, 'log', '-1', '--format=%s', 'main')));
  check('voltar versão: tags remotas intactas e voltou para a dev1', [tagA1, tagA2, tagA3].every((t) => g(A.rem, 'cat-file', '-t', t) === 'tag') && g(A.pj, 'rev-parse', '--abbrev-ref', 'HEAD') === 'dev1');
  check('DEV2-021 A: depois da volta, a main foi juntada na dev1 (merge --no-ff) e a dev1 enviada sem força', r.juncao && r.juncao.ok && r.juncao.enviado && gok(A.pj, 'merge-base', '--is-ancestor', 'main', 'dev1') && g(A.pj, 'rev-list', '--parents', '-n', '1', 'dev1').split(' ').length === 3 && g(A.rem, 'rev-parse', 'dev1') === g(A.pj, 'rev-parse', 'dev1'), JSON.stringify(r.juncao));
  check('DEV2-021 A: a dev1 passa a conter o revert (mesma árvore da main revertida)', g(A.pj, 'diff', '--stat', 'main', 'dev1') === '' && /Revert/.test(g(A.pj, 'log', '--format=%s', 'dev1')) && g(A.pj, 'rev-parse', '--abbrev-ref', 'HEAD') === 'dev1');
  lista = await call('deployLista', A.id);
  check('lista mostra os revertidos', lista.filter((d) => d.revertido).length === 2 && !lista.find((d) => d.tag === tagA1).revertido);
  check('voltar de novo um já revertido é recusado', !(await call('deployVoltar', A.id, tagA2)).ok);

  /* ---- B: sem fluxo, merge --no-ff da vibe/<pasta> ---- */
  const B = projeto('b', { fluxo: false, branch: 'vibe/b' });
  commit(B.pj, 'b.js', 'b\n', 'T1: b');
  check('B: sem fluxo, o dono pode (Sempre gravado)', (await pol(B.id, {})).politica.deploy.modo === 'sempre');
  const mainB0 = g(B.rem, 'rev-parse', 'main');
  r = await call('deployExec', B.id);
  check('B: merge --no-ff da vibe/b na main (commit de merge com 2 pais)', r.ok && r.deploy.tipo === 'merge' && g(B.rem, 'rev-list', '--parents', '-n', '1', 'main').split(' ').length === 3 && /Deploy pelo Termix: vibe\/b na main/.test(g(B.rem, 'log', '-1', '--format=%s', 'main')), r.motivo);
  check('B: tag e receita', g(B.rem, 'cat-file', '-t', r.tag) === 'tag' && /publicado/.test(R(`${PUB}/${B.id}.txt`)) && g(B.pj, 'rev-parse', '--abbrev-ref', 'HEAD') === 'vibe/b');
  r = await call('deployVoltar', B.id, r.tag);
  check('DEV2-021 B: sem o fluxo, não há junção na branch', r.ok && r.juncao === null);
  check('B: voltar versão = git revert -m 1 do merge, main com a árvore de antes, sem force', r.ok && g(B.pj, 'diff', '--stat', mainB0, 'main') === '' && /^Revert/.test(g(B.rem, 'log', '-1', '--format=%s', 'main')) && g(B.rem, 'rev-list', '--count', 'main') === '4', r.motivo);

  /* ---- C: voltar versão de um fast-forward (git revert dos commits do intervalo) e de um intervalo com merge ---- */
  const C = projeto('c', { fluxo: true, papel: 'DEV1', branch: 'dev1' });
  await pol(C.id, {});
  commit(C.pj, 'c1.txt', '1\n', 'T1: c1'); commit(C.pj, 'c2.txt', '2\n', 'T2: c2');
  const mainC0 = g(C.rem, 'rev-parse', 'main');
  const rc1 = await call('deployExec', C.id);
  check('C: deploy fast-forward', rc1.ok && rc1.deploy.tipo === 'ff' && rc1.deploy.commits.length === 2);
  r = await call('deployVoltar', C.id, rc1.tag);
  check('C: voltar versão (fast-forward) = git revert dos 2 commits do intervalo, sem force', r.ok && g(C.pj, 'diff', '--stat', mainC0, 'main') === '' && g(C.rem, 'log', '--format=%s', '-2', 'main').split('\n').every((l) => /^Revert "T[12]: c[12]"/.test(l)) && gok(C.rem, 'merge-base', '--is-ancestor', rc1.deploy.depois, 'main'), JSON.stringify(r).slice(0, 200));
  check('C: sem branch temporária sobrando', !/termix-volta/.test(g(C.pj, 'branch', '--list')));
  // a dev1 traz a main (com os reverts) e uma feature com merge --no-ff: o deploy é fast-forward com merges no intervalo
  g(C.pj, 'merge', '-q', '--no-edit', 'origin/main');
  g(C.pj, 'switch', '-qc', 'feat'); commit(C.pj, 'f.txt', 'f\n', 'feat: f'); g(C.pj, 'switch', '-q', 'dev1'); g(C.pj, 'merge', '-q', '--no-ff', '--no-edit', 'feat');
  const mainC1 = g(C.rem, 'rev-parse', 'main');
  const rc2 = await call('deployExec', C.id);
  check('C: deploy fast-forward com merge no intervalo', rc2.ok && rc2.deploy.tipo === 'ff' && g(C.pj, 'rev-list', '--merges', '--count', `${rc2.deploy.antes}..${rc2.deploy.depois}`) !== '0', rc2.motivo);
  r = await call('deployVoltar', C.id, rc2.tag);
  check('C: voltar versão com merge no intervalo = um commit de revert com a diferença líquida, main como antes', r.ok && g(C.pj, 'diff', '--stat', mainC1, 'main') === '' && /^Revert "deploy /.test(g(C.rem, 'log', '-1', '--format=%s', 'main')) && gok(C.rem, 'merge-base', '--is-ancestor', mainC1, 'main'), JSON.stringify(r).slice(0, 200));
  // revert que conflita com o que veio depois na main: cancelado, main intacta
  commit(C.pj, 'g.txt', 'g\n', 'T3: g'); const rc3 = await call('deployExec', C.id);
  const H2 = path.join(S, 'hot2'); execFileSync('git', ['clone', '-q', C.rem, H2], { stdio: 'ignore' }); g(H2, 'config', 'user.name', 'H'); g(H2, 'config', 'user.email', 'h@exemplo.invalid');
  commit(H2, 'g.txt', 'g mudado depois\n', 'hotfix em g'); g(H2, 'push', '-q', 'origin', 'main');
  const mainC3 = g(C.rem, 'rev-parse', 'main');
  r = await call('deployVoltar', C.id, rc3.tag);
  check('C: revert com conflito = cancelado; main local e do origin não mudam; volta para a dev1', rc3.ok && !r.ok && /conflit/.test(r.motivo) && g(C.rem, 'rev-parse', 'main') === mainC3 && g(C.pj, 'rev-parse', 'main') === mainC3 && g(C.pj, 'rev-parse', '--abbrev-ref', 'HEAD') === 'dev1' && !gok(C.pj, 'rev-parse', '-q', '--verify', 'REVERT_HEAD'), r.motivo);

  /* ---- autorização, pausar/retomar, marco (as regras; o fluxo da tela está no teste do app) ---- */
  await pol(B.id, { modo: 'pedir' });
  check('Pedir autorização: tarefa [DEPLOY] = autorizar', (await call('politicaTarefa', B.id, { deploy: true })).deploy === 'autorizar');
  let au = await call('deployAut', B.id, 'pedir', { tarefa: 'T9', resumo: { commits: ['a'] } });
  check('autorização pedida: arquivo com status aguardando', au.status === 'aguardando' && JSON.parse(R(path.join(UD, 'vibe', B.id, 'deploys', 'autorizacao.json'))).status === 'aguardando');
  au = await call('deployAut', B.id, 'decidir', { decisao: 'autorizar', origem: 'telegram' });
  check('aprovar: status autorizado, com a origem (o Telegram usa o mesmo caminho)', au.ok && au.status === 'autorizado' && au.decisao.origem === 'telegram');
  await call('deployAut', B.id, 'pedir', { tarefa: 'T9' });
  au = await call('deployAut', B.id, 'decidir', { decisao: 'negar', origem: 'termix' });
  check('negar: status negado; decidir de novo é recusado', au.status === 'negado' && !(await call('deployAut', B.id, 'decidir', { decisao: 'autorizar' })).ok);
  await call('politicaPausarDeploy', B.id, true);
  check('Pausar deploy: Pedir autorização vira retido', (await call('politicaTarefa', B.id, { deploy: true })).deploy === 'retido');
  await pol(B.id, { modo: 'sempre', pausado: true });
  check('Pausar deploy: Sempre vira retido; Retomar = pendente', (await call('politicaTarefa', B.id, { deploy: true })).deploy === 'retido' && (await call('politicaPausarDeploy', B.id, false)).ok && (await call('politicaTarefa', B.id, { deploy: true })).deploy === 'pendente');
  await pol(B.id, { modo: 'marco', marco: 'v1.0 estável', marcoAtingido: false });
  check('marco não atingido: pausa (não publica)', (await call('politicaTarefa', B.id, { deploy: true })).deploy === 'pausar');
  await pol(B.id, { modo: 'marco', marco: 'v1.0 estável', marcoAtingido: true });
  check('marco atingido: pendente (o Termix publica)', (await call('politicaTarefa', B.id, { deploy: true })).deploy === 'pendente');

  /* ---- D: fluxo DEV2: nunca publica na main; fim do ciclo envia só a dev2 com o handoff ---- */
  const D = projeto('d', { fluxo: true, papel: 'DEV2', branch: 'dev2' });
  g(D.pj, 'push', '-q', 'origin', 'main:dev1'); // a dev1 existe no remoto
  commit(D.pj, 'd.js', 'd\n', 'T1: d');
  const pD = await pol(D.id, {});
  check('DEV2: política com Sempre vira Nunca; tarefa [DEPLOY] pausa', pD.politica.deploy.modo === 'nunca' && (await call('politicaTarefa', D.id, { deploy: true })).deploy === 'pausar');
  const mainD = g(D.rem, 'rev-parse', 'main'), dev1D = g(D.rem, 'rev-parse', 'dev1');
  r = await call('deployExec', D.id);
  check('DEV2 nunca publica na main: deployExec recusado (proibido), main e tags intactas', !r.ok && r.etapa === 'proibido' && g(D.rem, 'rev-parse', 'main') === mainD && g(D.rem, 'tag') === '' && g(D.pj, 'rev-parse', '--abbrev-ref', 'HEAD') === 'dev2', r.motivo);
  check('DEV2: voltar versão e receita também recusados', !(await call('deployVoltar', D.id, 'x')).ok && !(await call('deployReceita', D.id, 'x')).ok);
  const fi = await call('fimInfo', D.id);
  check('fim de ciclo DEV2: aplica, docs/HANDOFF_DEV2.md, branch dev2', fi.aplica && fi.arquivo === 'docs/HANDOFF_DEV2.md' && fi.branch === 'dev2', JSON.stringify(fi));
  const fp = await call('fimPrompt', D.id);
  const fpTxt = R(path.join(UD, 'vibe', D.id, 'pedidos', 'pedido-fim-handoff.md'));
  check('fim: pedido curto em arquivo ao orquestrador (alto nível, sem código, sem commit)', /^Vibe do Termix: leia e siga /.test(fp) && /HANDOFF_DEV2\.md/.test(fpTxt) && /Sem colar código/.test(fpTxt) && /Não faça commit nem push/.test(fpTxt));
  W(path.join(D.pj, 'docs', 'HANDOFF_DEV2.md'), '# HANDOFF DEV2\n\n- Status: AGUARDANDO DECISÃO\n\nO que mudou: d.\n');
  W(path.join(D.pj, 'outro.txt'), 'não entra\n');
  r = await call('fimEnviar', D.id);
  check('fim: commit só do handoff e envio só da dev2', r.ok && g(D.rem, 'rev-parse', 'dev2') === g(D.pj, 'rev-parse', 'dev2') && g(D.pj, 'show', '--name-only', '--format=', 'dev2') === 'docs/HANDOFF_DEV2.md' && /DEV2: handoff do ciclo do Vibe/.test(g(D.rem, 'log', '-1', '--format=%s', 'dev2')), JSON.stringify(r));
  check('fim: main e dev1 do remoto intactas; outro arquivo não entrou', g(D.rem, 'rev-parse', 'main') === mainD && g(D.rem, 'rev-parse', 'dev1') === dev1D && /\?\? outro\.txt/.test(g(D.pj, 'status', '--porcelain')));
  check('fim: não vale para DEV1 nem para projeto sem fluxo', !(await call('fimInfo', A.id)).aplica && !(await call('fimInfo', B.id)).aplica);

  /* ---- F5 do projeto encerra o servidor anterior ---- */
  await call('politicaSet', B.id, { recuperacao: { f5Projeto: 'node -e "setInterval(() => {}, 1000)"', voltas: 3 } }, 'teste');
  const f1 = await call('f5Projeto', B.id, 1500);
  const pidF = path.join(UD, 'vibe', B.id, 'recuperacao', 'f5-projeto.pid.json');
  check('F5 do projeto: servidor rodando, PID guardado', f1.ok && f1.estado === 'rodando' && f1.pid > 0 && vivo(f1.pid) && JSON.parse(R(pidF)).pid === f1.pid, JSON.stringify(f1));
  const f2 = await call('f5Projeto', B.id, 1500);
  await wait(500);
  check('F5 de novo: encerrou o anterior (só esse PID, com a árvore) e subiu outro', f2.ok && f2.anterior && f2.anterior.encerrado && f2.anterior.pid === f1.pid && !vivo(f1.pid) && vivo(f2.pid) && f2.pid !== f1.pid, JSON.stringify(f2));
  const fe = await call('f5Encerrar', B.id);
  await wait(500);
  check('fim do ciclo: f5Encerrar encerra o servidor e apaga o registro', fe.encerrado && !vivo(f2.pid) && !fs.existsSync(pidF) && /encerrado: PID/.test(R(path.join(UD, 'vibe', B.id, 'recuperacao', 'f5-projeto.log'))));
  check('f5Encerrar sem servidor: nada a fazer', (await call('f5Encerrar', B.id)).nada === true);

  /* abrir arquivo: só dentro de vibe\<id>\ */
  process.env.TERMIX_VIBE_NO_OPEN = '1';
  check('abrirArquivo: aceita o log do deploy, recusa fora da pasta do Vibe', (await call('abrirArquivo', B.id, path.join(UD, 'vibe', B.id, 'recuperacao', 'f5-projeto.log'))) === true && (await call('abrirArquivo', B.id, path.join(B.pj, 'README.md'))) === false);

  /* ---- DEV2-021: portão obrigatório no deploy automático; junção na dev1 com conflito ---- */
  const E = projeto('e', { fluxo: true, papel: 'DEV1', branch: 'dev1' });
  const semP = (modo, extra = {}) => call('politicaSet', E.id, { modelo: 'deploy', deploy: { modo, receita: RECEITA(E.id), ...extra }, portao: '' }, 'teste');
  const polF = path.join(UD, 'vibe', E.id, 'politica.json');
  let pe = await semP('sempre');
  check('DEV2-021: Sempre sem portão é recusado (não grava)', pe && !pe.ok && /portão de qualidade é obrigatório/.test(pe.problema) && !fs.existsSync(polF), JSON.stringify(pe));
  pe = await semP('marco', { marco: 'v1', marcoAtingido: true });
  check('DEV2-021: Marco sem portão é recusado (não grava)', pe && !pe.ok && /portão de qualidade é obrigatório/.test(pe.problema) && !fs.existsSync(polF), JSON.stringify(pe));
  pe = await semP('pedir');
  check('DEV2-021: Pedir autorização sem portão é aceito', pe && pe.ok && pe.politica.deploy.modo === 'pedir' && pe.politica.portao === '');
  commit(E.pj, 'e.txt', 'v1\n', 'T1: e v1');
  const mainE0 = g(E.rem, 'rev-parse', 'main');
  r = await call('deployExec', E.id);
  check('DEV2-021: Pedir sem portão publica (depois de autorizado)', r.ok && /sem portão/.test(R(r.log)), r.motivo);
  const tagE1 = r.tag;
  // política antiga ou editada à mão com Sempre e sem portão: o processo principal recusa
  const pj0 = JSON.parse(R(polF)); pj0.deploy.modo = 'sempre'; W(polF, JSON.stringify(pj0));
  commit(E.pj, 'e2.txt', 'x\n', 'T2: e2');
  const mainE1 = g(E.rem, 'rev-parse', 'main');
  r = await call('deployExec', E.id);
  check('DEV2-021: processo principal recusa Sempre sem portão (etapa politica), nada publicado', !r.ok && r.etapa === 'politica' && g(E.rem, 'rev-parse', 'main') === mainE1 && g(E.rem, 'tag').split('\n').filter(Boolean).length === 1 && g(E.pj, 'rev-parse', '--abbrev-ref', 'HEAD') === 'dev1', r.motivo);
  pj0.deploy.modo = 'marco'; pj0.deploy.marco = 'v1'; pj0.deploy.marcoAtingido = true; W(polF, JSON.stringify(pj0));
  r = await call('deployExec', E.id);
  check('DEV2-021: processo principal recusa Marco sem portão', !r.ok && r.etapa === 'politica' && g(E.rem, 'rev-parse', 'main') === mainE1, r.motivo);
  pj0.deploy.modo = 'pedir'; W(polF, JSON.stringify(pj0));
  // junção com conflito: a dev1 mexeu (sem publicar) na linha que o revert desfaz
  commit(E.pj, 'e.txt', 'v2\n', 'T3: e v2 (não publicado)');
  const dev1E = g(E.pj, 'rev-parse', 'dev1');
  r = await call('deployVoltar', E.id, tagE1);
  check('DEV2-021: volta feita na main; junção na dev1 com conflito cancelada (merge --abort), com aviso', r.ok && r.juncao && !r.juncao.ok && r.juncao.conflito && /merge --abort/.test(r.juncao.motivo) && g(E.rem, 'rev-parse', 'main') !== mainE1 && !/e\.txt/.test(g(E.pj, 'ls-tree', '--name-only', 'origin/main')), JSON.stringify(r).slice(0, 300));
  check('DEV2-021: nada descartado (dev1 intacta, sem MERGE_HEAD, árvore limpa, na dev1)', g(E.pj, 'rev-parse', 'dev1') === dev1E && !gok(E.pj, 'rev-parse', '-q', '--verify', 'MERGE_HEAD') && g(E.pj, 'status', '--porcelain', '--untracked-files=no') === '' && g(E.pj, 'rev-parse', '--abbrev-ref', 'HEAD') === 'dev1' && R(path.join(E.pj, 'e.txt')).trim() === 'v2');

  console.log(`\n${ok} OK, ${bad} FALHOU`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.log('ERRO', e && e.stack); process.exit(1); });
