// Teste sem tokens da implementação automática do Mutirão (DEV2-006). Uso: node mod6.js <raiz do Termix>
// Remoto bare local, dono (dev1, fluxo com papel DEV1), sócios Ana (dev2) e Bia (dev3). Entregas por script.
const { ROOT: ROOT_PADRAO, WORK } = require('./lib'); // raiz do repositório e pasta temporária do sistema
const fs = require('fs'), path = require('path'); const { execFileSync } = require('child_process');
const ROOT = (process.argv[2] || ROOT_PADRAO), S = path.join(WORK, 'm7');
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
  const { tarefasDo } = require(path.join(ROOT, 'src/vibe/index.js'));
  /* ---------- 1. marca [SEM COMMIT] ---------- */
  const ts = tarefasDo('Branch de trabalho: dev1\n\n## T1 — Ligar\nx\n## T2 — [SEM COMMIT] Validação final\ny\n## T3 — [sem-commit] conferir\n## T4 — [SEM_COMMIT] conferir 2\n## T5 — [DEPLOY] publicar\n## T6 — [HUMANO] chave\n');
  check('plano: T2 [SEM COMMIT] marcada e título limpo', ts[1].semCommit && ts[1].titulo === 'Validação final', JSON.stringify(ts[1]));
  check('plano: variações [sem-commit] e [SEM_COMMIT]', ts[2].semCommit && ts[3].semCommit && !/\[/.test(ts[2].titulo + ts[3].titulo));
  check('plano: T1 sem marca; DEPLOY e HUMANO continuam', !ts[0].semCommit && ts[4].deploy && !ts[4].semCommit && ts[5].humano);

  const A = await cenario('a', false);
  check('A: divisão publicada', A.pub && A.pub.ok, A.pub && A.pub.motivo);
  const masterA = g(A.DONO, 'rev-parse', 'origin/master');
  let pr = await call('mutAutoPrep', A.id);
  for (const b of ['dev2', 'dev3']) await call('mutAutoJuntar', A.id, b);
  const en = await call('mutAutoEntrega', A.id, {});
  check('A: entrega sintética', pr.ok && en && en.ok, JSON.stringify(en).slice(0, 200));
  const VD = path.join(UD, 'vibe', A.id);
  const lerPedido = (t) => { const m = /leia e siga (.+)$/.exec(t || ''); return m ? fs.readFileSync(m[1].trim(), 'utf8') : ''; };
  const pp = lerPedido(await call('cicloPrompt', A.id, 'plano'));
  check('pedido do plano: pede [SEM COMMIT] na validação final do Mutirão', /\[SEM COMMIT\] a que só valida/.test(pp) && /validação final do projeto inteiro, marcada \[SEM COMMIT\]/.test(pp));
  const pd = lerPedido(await call('execPrompt', A.id, 'dev', 'T2', { semCommit: true }));
  check('pedido do Dev [SEM COMMIT]: commit só se corrigir e linha "Validação:" obrigatória', /\[SEM COMMIT\]/.test(pd) && /se nada mudar, não faça commit/.test(pd) && /Validação: <comandos e resultado>/.test(pd));
  const pn = lerPedido(await call('execPrompt', A.id, 'dev', 'T1', {}));
  check('pedido do Dev normal continua pedindo o commit', /faça um commit "T1: \.\.\."/.test(pn) && !/SEM COMMIT/.test(pn));
  const pf = lerPedido(await call('execPrompt', A.id, 'refazer', 'T2', { semCommit: true, falta: 'faltou a linha' }));
  check('refação [SEM COMMIT]', /Refaça a tarefa T2 \(marcada \[SEM COMMIT\]\)/.test(pf) && /faltou a linha/.test(pf));
  const pv = lerPedido(await call('execPrompt', A.id, 'revisao', 'T2', { sha: null, semCommit: true }));
  check('revisão [SEM COMMIT]: avisa que não há commit novo', /sem commit novo, vale o resultado da validação/.test(pv));
  W(path.join(VD, 'resultados', 'T2.md'), '# T2\n\n**Validação:** node --check passou.\n');
  check('resultado com "**Validação:** ..." vale', (await call('resultadoLer', A.id, 'T2')).validacao === true);
  W(path.join(VD, 'resultados', 'T2.md'), 'T2: feito.\n- Validação: npm run check ok\n');
  check('resultado com "- Validação: ..." vale', (await call('resultadoLer', A.id, 'T2')).validacao === true);
  W(path.join(VD, 'resultados', 'T2.md'), 'T2: não validei.\nValidação:\n');
  check('resultado sem validação (ou "Validação:" vazia) não vale', (await call('resultadoLer', A.id, 'T2')).validacao === false);

  /* ---------- 5. push final com o remoto à frente ---------- */
  const OUT = path.join(A.B, 'outra-maquina');
  execFileSync('git', ['clone', '-q', '-b', 'dev1', A.REM, OUT], { stdio: 'ignore' });
  g(OUT, 'config', 'user.name', 'Outra'); g(OUT, 'config', 'user.email', 'o@t');
  W(path.join(OUT, 'docs/outra.md'), 'feito em outra máquina\n'); g(OUT, 'add', '-A'); g(OUT, 'commit', '-qm', 'outra máquina'); g(OUT, 'push', '-q', 'origin', 'dev1');
  const outraSha = g(OUT, 'rev-parse', 'HEAD');
  W(path.join(A.DONO, 'src/c.js'), 'C\n'); g(A.DONO, 'add', '-A'); g(A.DONO, 'commit', '-qm', 'T1: ligar');
  const localSha = g(A.DONO, 'rev-parse', 'HEAD');
  // a) com mudança sem commit: recusa sem mexer em nada
  W(path.join(A.DONO, 'src/a.js'), 'sujo\n');
  let fim = await call('mutAutoFim', A.id);
  check('remoto à frente + mudança sem commit: recusa, nada enviado, mudança preservada', !fim.ok && /mudanças sem commit/.test(fim.motivo) && g(A.REM, 'rev-parse', 'dev1') === outraSha && fs.readFileSync(path.join(A.DONO, 'src/a.js'), 'utf8') === 'sujo\n' && g(A.DONO, 'rev-parse', 'HEAD') === localSha, fim.motivo);
  g(A.DONO, 'stash', 'push', '-q', '-m', 'teste');
  // b) fora da branch do dono: recusa
  g(A.DONO, 'switch', '-q', 'dev2');
  fim = await call('mutAutoFim', A.id);
  check('remoto à frente + fora da branch do dono: recusa, nada enviado', !fim.ok && /não está na branch dev1/.test(fim.motivo) && g(A.REM, 'rev-parse', 'dev1') === outraSha, fim.motivo);
  g(A.DONO, 'switch', '-q', 'dev1');
  // c) sem conflito: merge de origin/dev1 (sem rebase) e push
  fim = await call('mutAutoFim', A.id);
  const msg = g(A.DONO, 'log', '-1', '--format=%s');
  const pais = g(A.DONO, 'log', '-1', '--format=%P').split(' ');
  check('remoto à frente sem conflito: merge de origin/dev1 e push', fim.ok && !!fim.integrou && msg === 'Mutirão: integrar origin/dev1 (remoto à frente)' && pais.includes(localSha) && pais.includes(outraSha), `${fim.motivo} | ${msg}`);
  check('… remoto = local; os dois trabalhos estão lá; master intacta', g(A.REM, 'rev-parse', 'dev1') === g(A.DONO, 'rev-parse', 'dev1') && fs.existsSync(path.join(A.DONO, 'docs/outra.md')) && fs.existsSync(path.join(A.DONO, 'src/c.js')) && g(A.REM, 'rev-parse', 'master') === masterA && g(A.DONO, 'rev-parse', 'master') === masterA);
  const mj = JSON.parse(fs.readFileSync(path.join(VD, 'mutirao.json'), 'utf8'));
  check('… mutirao.json: concluído, push com "integrou"', mj.dono.auto.fase === 'concluido' && mj.dono.auto.push.ok && !!mj.dono.auto.push.integrou);
  // d) com conflito: merge --abort, nada enviado nem descartado, motivo
  g(OUT, 'pull', '-q', '--no-rebase', 'origin', 'dev1');
  W(path.join(OUT, 'src/c.js'), 'C da outra máquina\n'); g(OUT, 'add', '-A'); g(OUT, 'commit', '-qm', 'outra: c.js'); g(OUT, 'push', '-q', 'origin', 'dev1');
  const outra2 = g(OUT, 'rev-parse', 'HEAD');
  W(path.join(A.DONO, 'src/c.js'), 'C do dono\n'); g(A.DONO, 'add', '-A'); g(A.DONO, 'commit', '-qm', 'T2: c.js');
  const local2 = g(A.DONO, 'rev-parse', 'HEAD');
  fim = await call('mutAutoFim', A.id);
  check('remoto à frente com conflito: não envia, explica e lista o arquivo', !fim.ok && fim.conflito && fim.arquivos.includes('src/c.js') && /merge cancelado, nada foi enviado nem descartado/i.test(fim.motivo), fim.motivo);
  check('… merge cancelado (sem MERGE_HEAD), tree limpo, dev1 local e remota intactas', gq(A.DONO, 'rev-parse', '-q', '--verify', 'MERGE_HEAD') === null && g(A.DONO, 'status', '--porcelain', '--untracked-files=no') === '' && g(A.DONO, 'rev-parse', 'HEAD') === local2 && g(A.REM, 'rev-parse', 'dev1') === outra2 && fs.readFileSync(path.join(A.DONO, 'src/c.js'), 'utf8').replace(/\r/g, '') === 'C do dono\n');
  const mj2 = JSON.parse(fs.readFileSync(path.join(VD, 'mutirao.json'), 'utf8'));
  check('… mutirao.json: fase "push" (a tela mostra o motivo e "Enviar a branch de novo")', mj2.dono.auto.fase === 'push' && !mj2.dono.auto.push.ok && mj2.dono.auto.push.conflito);
  check('… master do remoto intacta', g(A.REM, 'rev-parse', 'master') === masterA);
  // e) remoto não à frente: push direto, sem merge
  const B2 = path.join(A.B, 'dono2'); // (o dono resolve o conflito à mão; aqui o teste faz o merge resolvendo pela versão do dono)
  try { g(A.DONO, 'merge', '-q', 'origin/dev1'); } catch { W(path.join(A.DONO, 'src/c.js'), 'C do dono\n'); g(A.DONO, 'add', '-A'); g(A.DONO, 'commit', '-qm', 'resolver c.js'); }
  const antes = g(A.DONO, 'rev-parse', 'HEAD');
  fim = await call('mutAutoFim', A.id);
  check('depois de resolver: "Enviar de novo" envia sem merge novo', fim.ok && !fim.integrou && g(A.DONO, 'rev-parse', 'HEAD') === antes && g(A.REM, 'rev-parse', 'dev1') === antes, fim.motivo);
  void B2;

  console.log(`\n${ok} OK, ${bad} FALHOU`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
