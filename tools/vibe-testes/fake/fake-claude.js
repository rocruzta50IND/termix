// Claude Code FALSO para testar o ciclo do Vibe sem tokens (DEV2-007). Lê o teclado da aba (pty), grava os hooks do
// Termix (hook-<aba>.json) e age conforme o roteiro em FAKE_CFG: { "dev:T1": ["commit"], "rev:T1": ["refazer","aprovado"], ... }
// Ações do Dev: commit | nocommit | valida | hang | surdo | mudo. Revisão: aprovado | refazer | hang | mudo. Plano: plano.
// DEV2-015: "rec:T3": [ {objeto da decisão} | "invalido" | "mudo" | "hang" ]; IDs T3.a; "acao:ms" = ação com demora.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const CFG = process.env.FAKE_CFG, DIR = process.env.TERMIX_METRICS_DIR, TAB = process.env.TERMIX_TAB_ID;
const LOG = CFG + '.log';
// DEV2-026: coleta em segundo plano (claude -p --resume ...): grava os argumentos e o stdin, responde em JSON e sai
if (process.argv.includes('-p')) {
  let inp = ''; process.stdin.on('data', (d) => { inp += d; });
  process.stdin.on('end', () => {
    const a = process.argv.slice(2), i = a.indexOf('--resume');
    fs.appendFileSync(CFG + '.log', JSON.stringify({ coleta: true, args: a, cwd: process.cwd(), stdin: inp.slice(0, 40) }) + '\n');
    process.stdout.write(JSON.stringify({ type: 'result', is_error: false, result: 'Resposta falsa da conversa ' + (i >= 0 ? a[i + 1].slice(0, 8) : '?') + ': objetivo X; nao sei o resto.', session_id: require('crypto').randomUUID() }) + '\n');
  });
  return;
}
const nome = (() => { const i = process.argv.indexOf('--name'); return i >= 0 ? process.argv[i + 1] : '?'; })();
const log = (m) => fs.appendFileSync(LOG, `${new Date().toISOString().slice(11, 19)} [${nome}] ${m}\n`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fila = Promise.resolve(), ultimo = 0;
function hook(event, extra = {}) {
  fila = fila.then(async () => {
    const espera = 800 - (Date.now() - ultimo); if (espera > 0) await sleep(espera);
    const f = path.join(DIR, `hook-${TAB}.json`);
    fs.writeFileSync(f + '.tmp', JSON.stringify({ t: Date.now(), event, session_id: SID, ...extra })); fs.renameSync(f + '.tmp', f);
    ultimo = Date.now(); log(`hook ${event}${extra.source ? ' ' + extra.source : ''}`);
  });
  return fila;
}
let SID = `fake-${Date.now()}`;
const out = (s) => process.stdout.write(s);
out(`\x1b[2J\x1b[H[Claude FALSO do teste] aba "${nome}"\r\n> `);
hook('SessionStart', { source: 'startup' });

const cfg = () => { try { return JSON.parse(fs.readFileSync(CFG, 'utf8')); } catch { return {}; } };
const NF = CFG + '.n.json';
function proxima(chave, padrao) {
  let n = {}; try { n = JSON.parse(fs.readFileSync(NF, 'utf8')); } catch { /* novo */ }
  const lista = cfg()[chave] || [];
  const i = n[chave] || 0;
  return { acao: lista[i] || padrao, consumir: () => { n[chave] = i + 1; fs.writeFileSync(NF, JSON.stringify(n)); } };
}

let buf = '', job = null, surdo = false;
function interromper() { if (job) { clearInterval(job.iv); clearTimeout(job.to); job = null; log('INTERROMPIDO (Esc)'); out('\r\nInterrupted by user\r\n> '); } else log('Esc sem trabalho'); }
const git = (...a) => execFileSync('git', a, { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function executar(texto) {
  // DEV2-025: pedidos do "Delegar tarefa" (tarefa do responsável, começar, entregar, analisar)
  const dm = /@?(\S*pedido-(?:delegar|analisar)[^\s)]*\.md)/.exec(texto) || /em (.+pedido-(?:delegar|analisar)[^\s)]*\.md)\s*$/.exec(texto);
  if (dm) {
    const ped = dm[1].replace(/^@/, ''), base = path.basename(ped, '.md'), conteudo = fs.readFileSync(ped, 'utf8');
    const dem = cfg().demora || 1500;
    log('pedido delegar ' + base);
    job = { to: setTimeout(() => {
      try {
        if (/^pedido-delegar-d-/.test(base)) { // tarefa do responsável: escreve o .md completo
          const mt = /Escreva a tarefa completa em (.+?) \(Markdown/.exec(conteudo);
          const resumo = (/^> (.+)$/m.exec(conteudo) || [])[1] || 'tarefa';
          fs.writeFileSync(mt[1], `# ${resumo}\n\n## Objetivo\nFazer: ${resumo}.\n\n## Contexto\nProjeto de brinquedo (teste).\n\n## O que ler\napp.js\n\n## Critério de pronto\nO app roda e o teste passa.\n\n## O que não fazer\nNão mexer na main nem na dev1.\n\n## Resultado esperado\nHandoff com o que mudou e como validar.\n`);
        } else if (/^pedido-delegar-entregar-/.test(base)) {
          const mh = /Reescreva (.+?\.md) em alto/.exec(conteudo);
          fs.mkdirSync(path.dirname(mh[1]), { recursive: true }); fs.writeFileSync(mh[1], '# HANDOFF\n\nTroquei o texto e validei; o teste passa. Risco baixo.\n');
        }
      } catch (e) { log('ERRO ' + e.message); }
      job = null; out('\r\nFEITA\r\n> '); hook('Stop');
    }, dem) };
    return;
  }
  const mr = /pedido-(estrutura|retomar)\.md/.exec(texto); // DEV2-026
  if (mr) {
    log('pedido ' + mr[1]);
    if (mr[1] === 'estrutura') {
      const w = (r, t, ap) => { const x = path.join(process.cwd(), r); fs.mkdirSync(path.dirname(x), { recursive: true }); (ap ? fs.appendFileSync : fs.writeFileSync)(x, t); };
      w('CLAUDE.md', '\n## Estrutura do projeto (Termix)\nGuia criado pelo orquestrador falso.\n', true);
      w('docs/TASKS.md', '# Tarefas\n\n## Em andamento\n\n### TASK-1 — Terminar o carrinho\n\n## Pendentes\n\n- Pagamento\n\n## Concluídas\n\n- Login\n');
      w('docs/ESTADO.md', '# Estado\n\n## Onde paramos\nCarrinho pela metade.\n\n## Próximo passo\nLigar o carrinho ao pagamento.\n');
    }
    out('\r\nFEITA\r\n> '); hook('Stop'); return;
  }
  const m = /leia e siga (.+?)\s*$/.exec(texto);
  if (!m) { log(`pedido sem arquivo: ${texto.slice(0, 80)}`); hook('Stop'); return; }
  const ped = m[1].trim(), base = path.basename(ped, '.md'), vd = path.dirname(path.dirname(ped));
  const mm = /^pedido-(T\d+(?:\.[a-z])*)-(dev|refazer|revisao|recuperacao-(\d+))$/.exec(base);
  let chave, padrao;
  if (base === 'pedido-plano' || base === 'pedido-fechar') { chave = 'acao:plano'; padrao = 'plano'; }
  else if (base === 'pedido-fim-handoff') { chave = 'acao:fim'; padrao = 'handoff'; } // DEV2-016
  else if (mm && mm[3]) { chave = `rec:${mm[1]}`; padrao = 'mudo'; }
  else if (mm) { chave = `${mm[2] === 'revisao' ? 'rev' : 'dev'}:${mm[1]}`; padrao = mm[2] === 'revisao' ? 'aprovado' : 'commit'; }
  else { log(`pedido desconhecido ${base}`); hook('Stop'); return; }
  const tk = mm && mm[1];
  const px = proxima(chave, padrao);
  px.consumir();
  let acao = px.acao, demora = cfg().demora || 1500;
  if (typeof acao === 'string' && /:\d+$/.test(acao)) { demora = +acao.split(':')[1]; acao = acao.split(':')[0]; }
  const decisao = acao && typeof acao === 'object' ? acao : null;
  if (decisao) acao = 'decidir';
  log(`pedido ${base} -> ${decisao ? JSON.stringify(decisao) : acao}`);
  const fazer = () => {
    try {
      if (acao === 'plano') {
        fs.writeFileSync(path.join(vd, 'plano.md'), cfg().plano || '# Plano\n\n## T1 — tarefa\n');
        fs.writeFileSync(path.join(vd, 'perguntas.json'), '{"perguntas":[]}');
      } else if (acao === 'commit') {
        const n = Date.now();
        fs.mkdirSync('fake', { recursive: true }); fs.writeFileSync(path.join('fake', `${tk}-${n}.txt`), `${tk} ${n}\n`);
        git('add', 'fake'); git('commit', '-qm', `${tk}: entrega falsa ${n}`);
        fs.mkdirSync(path.join(vd, 'resultados'), { recursive: true });
        fs.writeFileSync(path.join(vd, 'resultados', `${tk}.md`), `${tk}: feito (${git('rev-parse', '--short', 'HEAD')}). Validação: node --check ok.\n`);
      } else if (acao === 'handoff') { // DEV2-016: o orquestrador reescreve o handoff do fim do ciclo
        const mh = /Reescreva (.+?\.md) em alto/.exec(fs.readFileSync(ped, 'utf8'));
        fs.mkdirSync(path.dirname(mh[1]), { recursive: true }); fs.writeFileSync(mh[1], '# HANDOFF\n\n- Status: AGUARDANDO DECISÃO\n\nO que mudou: teste do fim do ciclo.\n');
      } else if (acao === 'quebra' || acao === 'conserta') { // DEV2-016: commit que quebra (ou conserta) o portão de qualidade
        if (acao === 'quebra') { fs.writeFileSync('QUEBRADO', 'x'); git('add', 'QUEBRADO'); } else git('rm', '-q', 'QUEBRADO');
        git('commit', '-qm', `${tk}: ${acao} o portão`);
        fs.mkdirSync(path.join(vd, 'resultados'), { recursive: true });
        fs.writeFileSync(path.join(vd, 'resultados', `${tk}.md`), `${tk}: ${acao} (${git('rev-parse', '--short', 'HEAD')}). Validação: ok.\n`);
      } else if (acao === 'nocommit') {
        fs.mkdirSync(path.join(vd, 'resultados'), { recursive: true });
        fs.writeFileSync(path.join(vd, 'resultados', `${tk}.md`), `${tk}: não fiz o commit (teste).\n`);
      } else if (acao === 'valida') {
        fs.mkdirSync(path.join(vd, 'resultados'), { recursive: true });
        fs.writeFileSync(path.join(vd, 'resultados', `${tk}.md`), `# ${tk}\n\n**Validação:** node --check src/*.js passou; nada a corrigir.\n`);
      } else if (acao === 'decidir' || acao === 'invalido') {
        fs.mkdirSync(path.join(vd, 'recuperacao'), { recursive: true });
        fs.writeFileSync(path.join(vd, 'recuperacao', `${tk}-${mm[3]}.json`), acao === 'invalido' ? '{"acao": "reenviar", "explicacao": ' : JSON.stringify(decisao));
      } else if (acao === 'aprovado' || acao === 'refazer') {
        fs.mkdirSync(path.join(vd, 'revisoes'), { recursive: true });
        fs.writeFileSync(path.join(vd, 'revisoes', `${tk}.json`), JSON.stringify({ veredito: acao, motivo: `revisão falsa: ${acao}`, ajustes: acao === 'refazer' ? 'refaça (teste)' : '' }));
      }
    } catch (e) { log(`ERRO ${e.message}`); }
    job = null; out(`\r\n${tk || ''} FEITA\r\n> `); hook('Stop');
  };
  if (acao === 'hang') { job = { iv: setInterval(() => out('.'), 2000) }; return; } // trabalha (sai texto) e nunca termina
  if (acao === 'mudo') { job = { iv: setInterval(() => {}, 60000) }; return; } // nem texto nem fim
  job = { to: setTimeout(fazer, demora) };
}

process.stdin.setRawMode && process.stdin.setRawMode(true);
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => {
  if (d.length < 12) log('bytes ' + JSON.stringify(d));
  for (const ch of d) {
    if (ch === '\x1b') { interromper(); continue; }
    if (ch === '\x15') { log(`Ctrl+U (caixa limpa: ${buf.length} caracteres)`); buf = ''; surdo = false; continue; }
    if (ch === '\x03') process.exit(0);
    if (ch === '\r' || ch === '\n') {
      const t = buf.trim();
      if (!t) continue;
      if (t === '/clear') { buf = ''; SID = `fake-${Date.now()}`; out('\r\n(clear)\r\n> '); hook('SessionStart', { source: 'clear' }); continue; }
      if (surdo) { log('Enter ignorado (surdo)'); continue; }
      const mm = /pedido-(T\d+(?:\.[a-z])*)-(dev|refazer)\.md/.exec(t);
      if (mm) { const p = proxima(`dev:${mm[1]}`, 'commit'); if (p.acao === 'surdo') { p.consumir(); surdo = true; log('surdo: pedido fica na caixa sem enviar'); continue; } }
      buf = '';
      if (job) { log('pedido com trabalho em andamento (ignorado)'); continue; }
      out('\r\n'); hook('UserPromptSubmit'); executar(t);
      continue;
    }
    buf += ch; out(ch);
  }
});
