'use strict';
/* Organizador (DEV2-010, experimental): "Importar projeto (várias pastas)".
   Fica dentro do módulo src/vibe porque é o único ponto que o núcleo já liga (o require no main.js e a ponte 'vibe:*'
   no preload): assim o núcleo não muda nenhuma linha. Canais 'vibe:org*', registrados pelo index.js.
   A análise só LÊ as pastas do usuário (git sem alterar nada, alguns arquivos de texto, a lista de sessões do Claude Code)
   e não gasta tokens. Tudo o que o organizador grava fica em <userData>\organizador\<grupo>\ (grupo.json, pedidos\,
   dossie.md, organizacao.md); nas pastas do usuário, nada é criado, movido, renomeado ou apagado.
   Desenho: docs/ORGANIZADOR.md. */
const fs = require('fs');
const path = require('path');
const os = require('os');

const MAX_READ = 400 * 1024; // lê no máximo isto de cada arquivo de texto
const PAPEIS = ['Orquestrador', 'Dev', 'Gerente', 'Outro'];
const ANDAMENTO_RX = /em andamento|em curso|in progress|doing|fazendo/i;
const ESTADO_RX = /^(checkpoint|estado|state|progress|progresso|status|sessao|session|resumo|retomada|retomar|proximo|next|handoff|changelog_dev)[\w.-]*\.md$/i;

const readHead = (f, n = MAX_READ) => {
  try {
    const fd = fs.openSync(f, 'r');
    try { const b = Buffer.alloc(Math.min(n, fs.fstatSync(fd).size)); fs.readSync(fd, b, 0, b.length, 0); return b.toString('utf8'); } finally { fs.closeSync(fd); }
  } catch { return ''; }
};
const readTail = (f, n) => {
  try {
    const fd = fs.openSync(f, 'r');
    try { const size = fs.fstatSync(fd).size, len = Math.min(n, size); const b = Buffer.alloc(len); fs.readSync(fd, b, 0, len, size - len); return b.toString('utf8'); } finally { fs.closeSync(fd); }
  } catch { return ''; }
};
const isFile = (f) => { try { return fs.statSync(f).isFile(); } catch { return false; } };
const isDir = (f) => { try { return fs.statSync(f).isDirectory(); } catch { return false; } };
const mtimeOf = (f) => { try { return fs.statSync(f).mtimeMs; } catch { return 0; } };
const lsDir = (d) => { try { return fs.readdirSync(d); } catch { return []; } };
const slug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'projeto';
const firstText = (c) => (typeof c === 'string' ? c : Array.isArray(c) ? ((c.find((x) => x && x.type === 'text') || {}).text || '') : '');
const claudeHome = () => process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const rel = (pasta, f) => path.relative(pasta, f).replace(/\\/g, '/');

// Títulos das tarefas em andamento: (1) os títulos dentro de uma seção "Em andamento"; (2) títulos cujo "Status:" logo
// abaixo diz "em andamento" (formato do TASKS_DEV2). Só os títulos, até 6.
function andamentoDe(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const out = [];
  const push = (t) => { t = t.replace(/[*`]+/g, '').trim(); if (t && !out.includes(t) && out.length < 6) out.push(t); };
  let sec = 0; // nível da seção "Em andamento" (0 = fora)
  lines.forEach((l, i) => {
    const h = /^(#{1,4})\s+(.+?)\s*#*$/.exec(l);
    if (!h) return;
    const lv = h[1].length;
    if (sec && lv <= sec) sec = 0;
    if (ANDAMENTO_RX.test(h[2]) && lv <= 3 && !/^\W*(DEV\d|TASK|T\d)/i.test(h[2])) { sec = lv; return; }
    if (sec && lv > sec) { push(h[2]); return; }
    const prox = lines.slice(i + 1, i + 8);
    const fim = prox.findIndex((x) => /^#{1,4}\s/.test(x)); // o Status vale só até o próximo título
    const st = (fim >= 0 ? prox.slice(0, fim) : prox).find((x) => /^\W*status\W*:/i.test(x));
    if (st && ANDAMENTO_RX.test(st) && !/conclu|aguardando|feito|done/i.test(st)) push(h[2]);
  });
  return out;
}
const statusDe = (text) => { const m = /^\W*status\W*:\**\s*(.+)$/im.exec(String(text || '')); return m ? m[1].replace(/<!--.*?-->/g, '').replace(/[*_`]+/g, '').trim().slice(0, 80) : ''; };
// Primeira entrada de um changelog/checkpoint (título em negrito ou ###), para dizer "onde paramos" sem ler tudo.
function ultimaEntrada(text) {
  for (const l of String(text || '').replace(/\r/g, '').split('\n').slice(1, 80)) {
    const m = /^\*\*(.+?)\*\*/.exec(l.trim()) || /^#{2,4}\s+(.+)$/.exec(l.trim());
    if (m && !/^(changelog|hist[oó]rico)/i.test(m[1])) return m[1].replace(/[*_`]+/g, '').trim().slice(0, 120);
  }
  return '';
}

// Sessões do Claude Code daquela pasta: só a lista (data, tamanho, título ou primeiro pedido), nunca a conversa inteira.
function sessoesDe(pasta, max = 8) {
  const dir = path.join(claudeHome(), 'projects', String(pasta).replace(/[^a-zA-Z0-9]/g, '-'));
  const out = [];
  for (const f of lsDir(dir)) {
    if (!f.endsWith('.jsonl')) continue;
    const id = f.slice(0, -6);
    if (!/^[0-9a-f-]{36}$/i.test(id)) continue;
    const full = path.join(dir, f);
    let st; try { st = fs.statSync(full); } catch { continue; }
    out.push({ id, full, mtime: st.mtimeMs, size: st.size });
  }
  out.sort((a, b) => b.mtime - a.mtime);
  return out.slice(0, max).map((s) => {
    let titulo = '', primeiro = '';
    for (const txt of [readHead(s.full, 65536), s.size > 65536 ? readTail(s.full, 16384) : '']) {
      for (const line of txt.split('\n')) {
        if (!line.startsWith('{')) continue;
        let o; try { o = JSON.parse(line); } catch { continue; }
        if (o.type === 'custom-title' && o.customTitle) titulo = o.customTitle;
        else if (o.type === 'ai-title' && o.aiTitle && !titulo) titulo = o.aiTitle;
        else if (!primeiro && o.type === 'user' && !o.isMeta && o.message) { const t = firstText(o.message.content).trim(); if (t && !t.startsWith('<')) primeiro = t; }
      }
    }
    return { id: s.id, mtime: s.mtime, size: s.size, titulo: String(titulo).slice(0, 80), primeiro: primeiro.replace(/\s+/g, ' ').slice(0, 140) };
  });
}

function gitDe(pasta, gitRun) {
  const top = gitRun(pasta, ['rev-parse', '--show-toplevel'], 8000);
  if (!top.ok) return { git: false };
  const b = gitRun(pasta, ['symbolic-ref', '--short', '-q', 'HEAD'], 8000);
  const r = gitRun(pasta, ['remote', 'get-url', 'origin'], 8000);
  const l = gitRun(pasta, ['log', '-5', '--format=%h %cs %s'], 8000);
  const s = gitRun(pasta, ['status', '--porcelain'], 15000);
  return {
    git: true,
    raiz: top.out,
    branch: b.ok ? b.out : '(destacado)',
    remoto: r.ok ? r.out.replace(/\/\/[^@/]+@/, '//') : '', // sem usuário/token embutido na URL
    commits: l.ok && l.out ? l.out.split('\n').slice(0, 5).map((x) => x.slice(0, 100)) : [],
    pendentes: s.ok && s.out ? s.out.split('\n').length : 0,
  };
}

// Analisa uma pasta (só leitura, sem tokens).
function analisarPasta(pasta, gitRun) {
  const a = { pasta, nome: path.basename(pasta), existe: isDir(pasta), arquivos: {}, andamento: [], avisos: [] };
  if (!a.existe) { a.avisos.push('Pasta não encontrada.'); a.papel = 'Outro'; a.motivo = 'pasta não encontrada'; a.sessoes = []; a.git = { git: false }; return a; }
  a.git = gitDe(pasta, gitRun);
  const at = (r) => { const f = path.join(pasta, r); return isFile(f) ? f : null; };
  for (const r of ['CLAUDE.md', 'CLAUDE.local.md', 'WORKFLOW.md', 'README.md', '.claude/fluxo.json']) if (at(r)) a.arquivos[r] = true;
  // CLAUDE.local.md: papel e branch do fluxo Rocruzta
  const local = a.arquivos['CLAUDE.local.md'] ? readHead(path.join(pasta, 'CLAUDE.local.md'), 16384) : '';
  const mp = /^\s*papel:\s*"?([A-Za-z0-9]+)"?/m.exec(local);
  a.papelLocal = mp ? mp[1].toUpperCase() : '';
  const mb = /^\s*branch_padrao:\s*"?([\w./-]*)"?/m.exec(local);
  a.branchPapel = mb ? mb[1] : '';
  a.fluxo = !!a.arquivos['.claude/fluxo.json'];
  // tarefas, handoff e arquivos de estado (raiz, docs\ e .claude\)
  a.tarefas = []; a.handoffs = []; a.estado = [];
  for (const d of ['', 'docs', '.claude']) {
    for (const f of lsDir(path.join(pasta, d))) {
      const full = path.join(pasta, d, f);
      if (!/\.md$/i.test(f) || !isFile(full)) continue;
      const r = rel(pasta, full);
      if (/^tasks[\w.-]*\.md$/i.test(f)) {
        const and = andamentoDe(readHead(full));
        a.tarefas.push({ arquivo: r, andamento: and, mtime: mtimeOf(full) });
        for (const t of and) if (!a.andamento.includes(t) && a.andamento.length < 6) a.andamento.push(t);
      } else if (/^handoff[\w.-]*\.md$/i.test(f)) {
        a.handoffs.push({ arquivo: r, status: statusDe(readHead(full, 8192)), mtime: mtimeOf(full) });
      } else if (ESTADO_RX.test(f)) {
        a.estado.push({ arquivo: r, ultima: /changelog/i.test(f) ? ultimaEntrada(readHead(full, 32768)) : '', mtime: mtimeOf(full) });
      }
    }
  }
  const cands = [...a.handoffs, ...a.estado].sort((x, y) => y.mtime - x.mtime);
  a.checkpoint = cands[0] ? cands[0].arquivo : '';
  a.sessoes = sessoesDe(pasta);
  // papel sugerido
  const orqNome = /(^|[^a-z])orq(uestrador)?([^a-z]|$)/i.test(a.nome);
  const orqLocal = /orquestrador|\borq\b/i.test(local.replace(/^\s*#.*$/gm, '')); // comentários do modelo não contam
  if (orqNome || orqLocal) { a.papel = 'Orquestrador'; a.motivo = orqNome ? '"ORQ" no nome da pasta' : 'o CLAUDE.local.md fala em orquestrador'; }
  else if (a.papelLocal === 'GERENTE') { a.papel = 'Gerente'; a.motivo = 'papel GERENTE no CLAUDE.local.md'; }
  else if (/^DEV\d$/.test(a.papelLocal)) { a.papel = 'Dev'; a.motivo = `papel ${a.papelLocal} no CLAUDE.local.md`; }
  else { a.papel = 'Outro'; a.motivo = 'sem padrão reconhecido'; }
  if (!a.git.git) a.avisos.push('Não é um repositório git.');
  if (a.git.pendentes) a.avisos.push(`${a.git.pendentes} arquivo(s) com mudanças não commitadas.`);
  return a;
}

// Ajustes que dependem do conjunto: par X / X-ORQ, papéis repetidos, mesma raiz git.
function analisarConjunto(pastas, gitRun) {
  const lista = pastas.map((p) => analisarPasta(p, gitRun));
  const base = (n) => n.toLowerCase().replace(/[-_ .]*orq(uestrador)?$/i, '');
  for (const a of lista) {
    if (a.papel !== 'Outro' || !a.existe) continue;
    const par = lista.find((b) => b !== a && b.papel === 'Orquestrador' && base(b.nome) === base(a.nome));
    if (par) { a.papel = 'Dev'; a.motivo = `par de "${par.nome}" (mesmo nome sem ORQ)`; }
  }
  const avisos = [];
  for (const p of ['Orquestrador', 'Gerente']) {
    const n = lista.filter((a) => a.papel === p);
    if (n.length > 1) { avisos.push(`${n.length} pastas parecem ser ${p}: confira o papel de cada uma.`); n.forEach((a) => { a.ambiguo = true; }); }
  }
  for (const a of lista) if (a.papel === 'Outro' && a.existe) { a.ambiguo = true; a.avisos.push('Papel não reconhecido: escolha um na lista.'); }
  const raizes = {};
  for (const a of lista) if (a.git && a.git.raiz) (raizes[a.git.raiz.toLowerCase()] = raizes[a.git.raiz.toLowerCase()] || []).push(a.nome);
  for (const ns of Object.values(raizes)) if (ns.length > 1) avisos.push(`As pastas ${ns.join(', ')} estão no mesmo repositório git (uma é subpasta da outra).`);
  if (!lista.some((a) => a.papel === 'Orquestrador') && lista.length > 1) avisos.push('Nenhuma pasta foi reconhecida como orquestrador.');
  return { lista, avisos, ambiguo: avisos.length > 0 || lista.some((a) => a.ambiguo) };
}

// Pedido curto de localização para a aba nova (lido pelo agente; o Termix digita só uma linha).
function pedidoLocalizar({ nome, item, todos }) {
  const a = item.analise || {};
  const passos = [];
  if (a.arquivos && a.arquivos['CLAUDE.md']) passos.push('`CLAUDE.md` (regras do projeto; se for longo, só o começo e as seções de fluxo)');
  if (a.arquivos && a.arquivos['CLAUDE.local.md']) passos.push('`CLAUDE.local.md` (o papel desta máquina)');
  for (const t of a.tarefas || []) passos.push(`\`${t.arquivo}\`: só a seção "Em andamento"${t.andamento.length ? ` (${t.andamento.slice(0, 3).map((x) => `"${x.slice(0, 60)}"`).join(', ')})` : ''}`);
  for (const h of a.handoffs || []) passos.push(`\`${h.arquivo}\`${h.status ? ` (status: ${h.status})` : ''}`);
  if (a.checkpoint && !(a.handoffs || []).some((h) => h.arquivo === a.checkpoint)) passos.push(`\`${a.checkpoint}\`: só a entrada mais recente (o último checkpoint)`);
  if (!passos.length) passos.push(a.arquivos && a.arquivos['README.md'] ? '`README.md` (só o começo)' : 'a lista de arquivos da raiz (sem abrir código)');
  const outras = todos.filter((x) => x.pasta !== item.pasta).map((x) => `- ${x.papel}: ${x.pasta}`).join('\n');
  return `# Pedido do Termix: localize-se nesta pasta

Você é a aba "${item.aba}" do projeto "${nome}", aberta pelo Termix. Papel sugerido: **${item.papel}**. Pasta: ${item.pasta}.
${outras ? `\nOutras pastas do mesmo projeto (não precisa abri-las):\n${outras}\n` : ''}
Leia só o essencial, nesta ordem (pule o que não existir):
${passos.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Regras deste pedido: só leitura. Não leia código nem históricos inteiros, não rode comandos que alterem arquivos, não faça commit nem push. Se as regras do CLAUDE.md mandarem ler algo a mais para começar, leia só o indispensável.

Depois responda em até 8 linhas: o que é esta pasta, o seu papel, a tarefa em andamento, onde paramos e o próximo passo. Então aguarde as instruções do Ygor.
`;
}

const cut = (t, n) => { t = String(t || '').replace(/\r/g, ''); return t.length > n ? `${t.slice(0, n)}\n[... cortado pelo Termix]` : t; };
const headings = (t) => String(t || '').replace(/\r/g, '').split('\n').filter((l) => /^#{1,3}\s/.test(l)).slice(0, 25).join('\n');

// Dossiê para o "Organizar com IA": trechos curtos dos arquivos-chave, montados em código (o agente lê um arquivo só).
function dossie({ nome, itens }) {
  const parts = [`# Dossiê do projeto "${nome}" (montado pelo Termix, sem IA)\n`, `Pastas: ${itens.length}. Cada trecho foi cortado de propósito; para decidir, isto basta.\n`];
  for (const it of itens) {
    const a = it.analise || {};
    const p = it.pasta;
    const g = a.git || {};
    const local = a.arquivos && a.arquivos['CLAUDE.local.md'] ? readHead(path.join(p, 'CLAUDE.local.md'), 4096).split('\n').filter((l) => l.trim() && !/^\s*#/.test(l)).join('\n') : '';
    const h = (a.handoffs || [])[0];
    const est = (a.estado || []).sort((x, y) => y.mtime - x.mtime)[0];
    parts.push(`\n---\n\n## ${a.nome || path.basename(p)} — papel sugerido: ${it.papel}\n
- Pasta: ${p}
- Git: ${g.git ? `branch ${g.branch}${g.remoto ? `, remoto ${g.remoto}` : ', sem remoto'}${g.pendentes ? `, ${g.pendentes} arquivo(s) não commitados` : ''}` : 'não é git'}
- Commits recentes: ${(g.commits || []).slice(0, 3).join(' | ') || '—'}
- Fluxo Rocruzta: ${a.fluxo ? 'sim' : 'não'}${a.papelLocal ? ` (papel ${a.papelLocal}${a.branchPapel ? `, branch ${a.branchPapel}` : ''})` : ''}
- Arquivos-chave: ${Object.keys(a.arquivos || {}).concat((a.tarefas || []).map((t) => t.arquivo), (a.handoffs || []).map((x) => x.arquivo)).join(', ') || 'nenhum'}
- Em andamento: ${(a.andamento || []).join(' | ') || '—'}
- Conversas do Claude Code: ${(a.sessoes || []).length}${(a.sessoes || [])[0] ? ` (a mais recente: ${new Date(a.sessoes[0].mtime).toISOString().slice(0, 16).replace('T', ' ')}, "${a.sessoes[0].titulo || a.sessoes[0].primeiro}")` : ''}
- Avisos da análise: ${(a.avisos || []).join(' ') || '—'}
`);
    if (local) parts.push(`\n### CLAUDE.local.md (sem comentários)\n\n${cut(local, 800)}\n`);
    if (a.arquivos && a.arquivos['CLAUDE.md']) parts.push(`\n### CLAUDE.md (só os títulos)\n\n${cut(headings(readHead(path.join(p, 'CLAUDE.md'), 65536)), 1500)}\n`);
    if (h) parts.push(`\n### ${h.arquivo} (começo)\n\n${cut(readHead(path.join(p, h.arquivo), 3000), 2500)}\n`);
    if (est && est.arquivo !== (h && h.arquivo)) parts.push(`\n### ${est.arquivo} (começo: a entrada mais recente)\n\n${cut(readHead(path.join(p, est.arquivo), 2500), 2000)}\n`);
  }
  return parts.join('');
}

function pedidoOrganizar({ nome, dossiePath, saida }) {
  return `# Pedido do Termix: organizar o projeto "${nome}"

1. Leia \`${dossiePath}\` (o Termix já juntou ali o essencial de cada pasta). Só abra outro arquivo se for indispensável, e só para ler.
2. Grave \`${saida}\` com:
   - **O que é cada pasta** (uma linha por pasta, com o papel: Orquestrador, Dev, Gerente ou Outro);
   - **Onde paramos** e **Próximo passo**, por pasta;
   - **Ambiguidades** que o Ygor precisa decidir (se houver);
   - **Sugestões**: só propostas. Nada que mova, renomeie, apague ou edite arquivos nas pastas do projeto deve ser feito; escreva como proposta, para o Ygor decidir.
3. Seja curto (até ~60 linhas). Não grave nada além desse arquivo. Responda só "Organização gravada."
`;
}

function create(deps = {}) {
  const { app, dialog, getWin, gitRun, TEST, logError = () => {} } = deps;
  const root = () => path.join(app.getPath('userData'), 'organizador');
  const validG = (g) => typeof g === 'string' && /^[a-z0-9-]{1,80}$/.test(g);
  const dirOf = (g) => path.join(root(), g);
  const writeAtomic = (f, txt) => { fs.mkdirSync(path.dirname(f), { recursive: true }); const tmp = `${f}.tmp`; fs.writeFileSync(tmp, txt); fs.renameSync(tmp, f); };
  const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
  const limpaPastas = (ps) => [...new Set((Array.isArray(ps) ? ps : []).filter((x) => typeof x === 'string' && x.trim()).map((x) => path.resolve(x.trim())))].slice(0, 12);

  const api = {
    // Escolha de pastas (várias de uma vez). No modo de teste (TERMIX_VIBE_TEST=1), aceita a lista vinda da interface.
    async orgPick(testPaths) {
      if (TEST && Array.isArray(testPaths)) return { ok: true, pastas: limpaPastas(testPaths) };
      const r = await dialog.showOpenDialog(getWin(), { title: 'Escolha as pastas do projeto', properties: ['openDirectory', 'multiSelections'] });
      return { ok: !r.canceled, pastas: r.canceled ? [] : limpaPastas(r.filePaths) };
    },
    orgAnalisar(pastas) {
      const ps = limpaPastas(pastas);
      if (!ps.length) return { lista: [], avisos: ['Nenhuma pasta escolhida.'], ambiguo: true };
      return analisarConjunto(ps, gitRun);
    },
    // Grava os pedidos de localização e o registro do grupo. itens: [{ pasta, papel, aba, retomar, analise }]
    orgPreparar({ nome, itens } = {}) {
      nome = String(nome || '').trim().slice(0, 60) || 'Projeto';
      const lista = (Array.isArray(itens) ? itens : []).filter((x) => x && typeof x.pasta === 'string').slice(0, 12)
        .map((x) => ({ ...x, papel: PAPEIS.includes(x.papel) ? x.papel : 'Outro', aba: String(x.aba || '').slice(0, 60) || path.basename(x.pasta) }));
      const g = `${slug(nome)}-${Date.now().toString(36)}`;
      const dir = dirOf(g);
      const pedidos = {};
      lista.forEach((it, i) => {
        if (it.retomar) return; // aba que retoma uma conversa não recebe pedido
        const f = path.join(dir, 'pedidos', `${i + 1}-${slug(it.aba)}.md`);
        writeAtomic(f, pedidoLocalizar({ nome, item: it, todos: lista }));
        pedidos[it.pasta] = f;
      });
      writeAtomic(path.join(dir, 'grupo.json'), JSON.stringify({ id: g, nome, criado: new Date().toISOString(), pastas: lista.map((x) => ({ pasta: x.pasta, papel: x.papel, aba: x.aba, retomar: x.retomar || null })) }, null, 2));
      return { ok: true, grupo: g, dir, pedidos };
    },
    // Depois de criar as abas: guarda quais projetos e abas do Termix são do grupo (para o módulo achar o grupo depois).
    orgRegistrar(g, ligacoes) {
      if (!validG(g)) return false;
      const f = path.join(dirOf(g), 'grupo.json');
      const r = readJson(f);
      if (!r) return false;
      r.ligacoes = Array.isArray(ligacoes) ? ligacoes.slice(0, 12) : [];
      writeAtomic(f, JSON.stringify(r, null, 2));
      return true;
    },
    // "Organizar com IA": monta o dossiê (código) e o pedido; o agente lê só o dossiê e grava organizacao.md aqui.
    orgOrganizar({ nome, itens } = {}) {
      nome = String(nome || '').trim().slice(0, 60) || 'Projeto';
      const lista = (Array.isArray(itens) ? itens : []).filter((x) => x && typeof x.pasta === 'string').slice(0, 12);
      const g = `org-${slug(nome)}`;
      const dir = dirOf(g);
      fs.mkdirSync(dir, { recursive: true });
      const saida = path.join(dir, 'organizacao.md');
      if (isFile(saida)) { try { fs.renameSync(saida, path.join(dir, `organizacao-${Date.now().toString(36)}.md`)); } catch { /* fica a anterior */ } } // nada é apagado
      const dossiePath = path.join(dir, 'dossie.md');
      writeAtomic(dossiePath, dossie({ nome, itens: lista }));
      const pedido = path.join(dir, 'pedido-organizar.md');
      writeAtomic(pedido, pedidoOrganizar({ nome: nome, dossiePath: 'dossie.md', saida: 'organizacao.md' }));
      return { ok: true, grupo: g, dir, dossie: dossiePath, pedido, saida };
    },
    orgLerOrganizacao(g) {
      if (!validG(g)) return null;
      const f = path.join(dirOf(g), 'organizacao.md');
      return isFile(f) ? { ok: true, arquivo: f, texto: readHead(f, 65536) } : null;
    },
  };
  return api;
}

module.exports = { create, analisarPasta, analisarConjunto, andamentoDe, sessoesDe, pedidoLocalizar, dossie, PAPEIS };
