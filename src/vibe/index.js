'use strict';
/* Módulo Vibe Coding e Mutirão: isolado do núcleo do Termix. DEV2-005: Mutirão em mutirao.js (canais vibe:mut*).
   DEV2-001: casca e canal 'vibe:status'. DEV2-002: tela de entrega do Vibe Coding (recebe, confere e guarda a entrega).
   DEV2-003: arquivos do ciclo (estado, plano, perguntas, respostas) e o texto dos pedidos ao orquestrador.
   DEV2-004: execução. A trava em código das abas do Vibe (settings próprios com o hook PreToolUse de trava.js e regras
   permissions.deny, via spawnSettings, que o main.js chama ao abrir um terminal), a pasta confiável no .claude.json,
   a branch permitida (o Termix confere ou cria) e a conferência do git depois de cada tarefa.
   O main.js só chama create({ ipcMain, dialog, app, getWin, logError }) e spawnSettings; os handlers 'vibe:*' são
   registrados aqui, cada um com try/catch. Nada aqui escreve em terminal, chat ou notificação. Na pasta do projeto do
   usuário, só o git troca ou cria a branch permitida (sem descartar nada). No .claude.json do Claude Code, só a chave
   hasTrustDialogAccepted da pasta do projeto, com backup e gravação atômica. O resto fica em <userData>\vibe\<id>\
   (quem cria as abas e digita os pedidos é a interface, src/renderer/vibe). Desenho: docs/VIBE_MUTIRAO.md. */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

// Seções obrigatórias do .md da estrutura (as mesmas do modelo modelo-entrega.md). O título é conferido sem acento,
// sem caixa e sem pontuação; cada seção aceita alguns nomes equivalentes.
const SECTIONS = [
  { key: 'objetivo', label: 'Objetivo', match: (h) => h.startsWith('objetivo') },
  { key: 'publico', label: 'Público e usuários', match: (h) => h.includes('publico') || h.includes('usuario') },
  { key: 'funcionalidades', label: 'Funcionalidades', match: (h) => h.includes('funcionalidade') },
  { key: 'fora', label: 'Fora do escopo', match: (h) => h.includes('fora do escopo') },
  { key: 'telas', label: 'Telas e fluxos', match: (h) => h.includes('tela') || h.includes('fluxo') },
  { key: 'dados', label: 'Dados e regras de negócio', match: (h) => h.includes('dados') || h.includes('regra') },
  { key: 'integracoes', label: 'Integrações e acessos', match: (h) => h.includes('integra') || h.includes('acesso') },
  { key: 'tecnologia', label: 'Tecnologia', match: (h) => h.includes('tecnologia') },
  { key: 'pronto', label: 'Critério de pronto', match: (h) => h.includes('pronto') },
];
const FLOW_EXT = ['png', 'jpg', 'jpeg', 'svg', 'pdf', 'drawio', 'excalidraw', 'md'];
const MAX_FILE = 50 * 1024 * 1024; // 50 MB por arquivo
const LIMITS = { objetivo: 300, criterio: 4000, proibido: 4000, acessos: 4000 };

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const validId = (id) => typeof id === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(id);
const extOf = (p) => path.extname(String(p || '')).slice(1).toLowerCase();

// Confere o .md da estrutura: quais seções faltam e quais estão sem conteúdo (dicas "> ", comentários e linhas vazias não contam).
function checkStructure(text) {
  const lines = String(text).replace(/\r/g, '').split('\n');
  const heads = [];
  let fence = false;
  lines.forEach((l, i) => {
    if (/^\s*(```|~~~)/.test(l)) fence = !fence;
    if (fence) return;
    const m = /^(#{1,3})\s+(.+?)\s*#*\s*$/.exec(l);
    if (m) heads.push({ i, level: m[1].length, h: norm(m[2]) });
  });
  const missing = [], empty = [];
  const used = new Set();
  for (const s of SECTIONS) {
    const idx = heads.findIndex((x, k) => !used.has(k) && s.match(x.h));
    if (idx < 0) { missing.push(s.label); continue; }
    used.add(idx);
    const start = heads[idx].i + 1;
    const nxt = heads.slice(idx + 1).find((x) => x.level <= heads[idx].level);
    const body = lines.slice(start, nxt ? nxt.i : lines.length).join('\n').replace(/<!--[\s\S]*?-->/g, '')
      .split('\n').filter((l) => l.trim() && !/^\s*>/.test(l)).join(' ').trim();
    if (body.replace(/[\s\-*#|_`]/g, '').length < 3) empty.push(s.label);
  }
  return { missing, empty, ok: !missing.length && !empty.length };
}

// Confere um arquivo escolhido. kind: 'fluxo' (desenho) ou 'estrutura' (.md com as seções).
function inspect(kind, file) {
  const r = { kind, path: file, name: path.basename(String(file || '')), ext: extOf(file), ok: false, problems: [] };
  try {
    if (!file || !fs.existsSync(file)) { r.problems.push('O arquivo não foi encontrado. Escolha de novo.'); return r; }
    const st = fs.statSync(file);
    if (!st.isFile()) { r.problems.push('Isso não é um arquivo.'); return r; }
    r.size = st.size;
    if (!st.size) { r.problems.push('O arquivo está vazio.'); return r; }
    if (st.size > MAX_FILE) { r.problems.push('O arquivo passa de 50 MB.'); return r; }
    if (kind === 'fluxo') {
      if (!FLOW_EXT.includes(r.ext)) { r.problems.push('Formato não aceito. Use .png, .jpg, .svg, .pdf, .drawio, .excalidraw ou .md com Mermaid.'); return r; }
      if (r.ext === 'md' && !/^\s*(```|~~~)\s*mermaid\b/im.test(fs.readFileSync(file, 'utf8'))) { r.problems.push('O .md não tem um bloco ```mermaid com o fluxo.'); return r; }
    } else if (kind === 'estrutura') {
      if (r.ext !== 'md') { r.problems.push('A estrutura precisa ser um arquivo .md (use o modelo).'); return r; }
      const c = checkStructure(fs.readFileSync(file, 'utf8'));
      r.missing = c.missing; r.empty = c.empty;
      if (c.missing.length) r.problems.push(`Faltam as seções: ${c.missing.join(', ')}.`);
      if (c.empty.length) r.problems.push(`Seções sem conteúdo: ${c.empty.join(', ')}.`);
      if (!c.ok) return r;
    } else { r.problems.push('Tipo de arquivo desconhecido.'); return r; }
    r.ok = true;
  } catch (e) { r.problems.push('Não foi possível ler o arquivo.'); }
  return r;
}

// Confere os campos de texto da entrega (mesma regra da tela; a tela só mostra, aqui é que vale).
function checkFields(f) {
  const out = [];
  const t = (v) => String(v || '').trim();
  if (!validId(f.projectId)) out.push('Escolha o projeto.');
  if (!t(f.objetivo)) out.push('Escreva o objetivo final do projeto.');
  else if (t(f.objetivo).length > LIMITS.objetivo) out.push(`O objetivo passa de ${LIMITS.objetivo} caracteres.`);
  if (!t(f.criterio)) out.push('Escreva o critério de pronto.');
  if (t(f.criterio).length > LIMITS.criterio || t(f.proibido).length > LIMITS.proibido || t(f.acessos).length > LIMITS.acessos) out.push('Algum texto passou do tamanho máximo.');
  if (!f.nadaFornecer && !t(f.acessos)) out.push('Liste os acessos e dados que o humano precisa fornecer, ou marque "Nada a fornecer".');
  return out;
}

// Arquivos de um ciclo (DEV2-003). Ao iniciar um ciclo novo, os do anterior vão para o histórico.
const CYCLE_FILES = ['estado.json', 'plano.md', 'perguntas.json', 'respostas.json', 'resultados', 'revisoes', 'pedidos'];
const ORQ_NAME = 'Vibe · Orquestrador', DEV_NAME = 'Vibe · Dev';
const PROTEGIDAS = ['main', 'master'];

// git sem shell, na pasta do projeto: { ok, out, err }
function gitRun(dir, args, timeout = 15000) {
  try { return { ok: true, out: execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout, windowsHide: true }).trim() }; } catch (e) { return { ok: false, out: String(e.stdout || '').trim(), err: String(e.stderr || e.message || '').trim() }; }
}
const shaOf = (dir, ref) => { const r = gitRun(dir, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]); return r.ok && r.out ? r.out : null; };
const headOf = (dir) => { const r = gitRun(dir, ['symbolic-ref', '--short', '-q', 'HEAD']); return r.ok ? r.out : ''; };

// Tarefas do plano: IDs T1..Tn (no início de um título ou item de lista), com o título e as marcas [DEPLOY] e [HUMANO].
function tarefasDo(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const out = [];
  lines.forEach((l, i) => {
    const m = /^[ \t]*(?:#{1,4}[ \t]*|\d+[.)][ \t]*|[-*][ \t]+)?(?:\*\*|__)?T(\d+)\b(.*)$/.exec(l);
    if (!m || out.some((t) => t.n === +m[1])) return;
    out.push({ n: +m[1], id: `T${m[1]}`, titulo: m[2].replace(/[*_`]+/g, '').replace(/^[\s—–:.)-]+/, '').trim().slice(0, 160), linha: i });
  });
  out.sort((a, b) => a.n - b.n);
  const starts = out.map((t) => t.linha).sort((a, b) => a - b);
  for (const t of out) {
    const fim = starts.find((x) => x > t.linha) || lines.length;
    const corpo = lines.slice(t.linha + 1, fim).join('\n');
    t.deploy = /\[\s*DEPLOY\s*\]/i.test(t.titulo) || /^\W*tipo\W*:\W*deploy/im.test(corpo);
    t.humano = /\[\s*HUMANO\s*\]/i.test(t.titulo) || /^\W*tipo\W*:\W*humano/im.test(corpo);
    t.semCommit = /\[\s*SEM[\s_-]*COMMIT\s*\]/i.test(t.titulo); // DEV2-007: só valida/confere; pode terminar sem commit
    t.titulo = t.titulo.replace(/\[\s*(DEPLOY|HUMANO|SEM[\s_-]*COMMIT)\s*\]\s*/gi, '').trim() || t.id; // a marca vira etiqueta na tela
    delete t.linha;
  }
  return out;
}

// Resultado de tarefa [SEM COMMIT]: o Tk.md precisa trazer a linha "Validação: ..." com algum conteúdo.
const temValidacao = (t) => /^[ \t>*#_-]*valida[çc][ãa]o[*_ \t]*:[*_ \t]*\S/im.test(String(t || ''));

// Branch onde os agentes podem fazer commit e push. Projeto com fluxo Rocruzta (.claude/fluxo.json): a branch do papel,
// lida do CLAUDE.local.md. Sem fluxo: uma branch própria vibe/<projeto>, criada a partir da atual.
function branchOf(pasta) {
  try {
    if (pasta && fs.existsSync(path.join(pasta, '.claude', 'fluxo.json'))) {
      let b = '';
      try { const m = /^\s*branch_padrao:\s*"?([\w./-]+)"?/m.exec(fs.readFileSync(path.join(pasta, 'CLAUDE.local.md'), 'utf8')); b = m ? m[1] : ''; } catch { /* sem CLAUDE.local.md */ }
      if (PROTEGIDAS.includes(b)) b = ''; // papel apontando para main/master não vale como branch de trabalho
      return b ? { nome: b, regra: `só na branch "${b}" (a do papel no CLAUDE.local.md)` } : { nome: '', regra: 'só na branch do papel definida no CLAUDE.local.md (sem ela, não faça commit)' };
    }
  } catch { /* segue a regra sem fluxo */ }
  const s = norm(path.basename(String(pasta || 'projeto'))).replace(/ /g, '-') || 'projeto';
  return { nome: `vibe/${s}`, regra: `só numa branch própria "vibe/${s}", criada a partir da atual` };
}
// Linhas do plano que mandam fazer commit/push na main/master (sem negação na mesma linha). Conferência do Termix, sem tokens.
const mainCommitLines = (text) => String(text).split('\n').filter((l) => /\b(commit|push)\w*\b[^\n]{0,30}?\b(em|na|no|para|on|to|into)\s+[`"'*]*(origin\/)?(main|master)\b/i.test(l) && !/\b(nunca|n[aã]o|sem|never|proibid\w*)\b[^\n]{0,25}\b(main|master)\b/i.test(l));

function create(deps = {}) {
  const { ipcMain, dialog, app, getWin, logError = () => {} } = deps;
  const state = { vibe: 'idle', mutirao: 'idle' };
  // Modo de teste: só com a variável TERMIX_VIBE_TEST=1 ao abrir o app. Permite passar o caminho do arquivo sem o
  // diálogo nativo (que o CDP não automatiza). Sem a variável, o caminho vindo da interface é ignorado.
  const TEST = process.env.TERMIX_VIBE_TEST === '1';
  const root = () => path.join(app.getPath('userData'), 'vibe');
  const dirOf = (id) => path.join(root(), id);
  const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
  const writeJson = (f, v) => { fs.mkdirSync(path.dirname(f), { recursive: true }); const tmp = `${f}.tmp`; fs.writeFileSync(tmp, JSON.stringify(v, null, 2)); fs.renameSync(tmp, f); };
  const entregaOf = (id) => { const e = validId(id) && readJson(path.join(dirOf(id), 'entrega.json')); return e && e.projeto && e.projeto.pasta ? e : null; };
  const samePath = (a, b) => !!a && !!b && path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
  // Mutirão (DEV2-005): divisão, parte do sócio e contador (src/vibe/mutirao.js)
  // Entrega: ao gravar uma nova, a anterior vai para historico\<data>\ (nada é apagado). Usada também pela entrega
  // sintética da implementação automática do Mutirão (DEV2-006).
  function arquivarEntrega(dir) {
    const cur = path.join(dir, 'entrega.json');
    if (!fs.existsSync(cur)) return;
    const old = readJson(cur) || {};
    const hist = path.join(dir, 'historico', String(old.data || new Date().toISOString()).replace(/[:.]/g, '-'));
    fs.mkdirSync(hist, { recursive: true });
    for (const n of ['entrega.json', old.arquivos && old.arquivos.fluxo, old.arquivos && old.arquivos.estrutura]) {
      if (n && fs.existsSync(path.join(dir, n))) fs.renameSync(path.join(dir, n), path.join(hist, n));
    }
  }
  function gravarEntrega(id, entrega, arquivos) {
    const dir = dirOf(id);
    arquivarEntrega(dir);
    fs.mkdirSync(dir, { recursive: true });
    for (const [n, txt] of Object.entries(arquivos || {})) fs.writeFileSync(path.join(dir, n), txt);
    writeJson(path.join(dir, 'entrega.json'), entrega);
  }
  const MUT = require('./mutirao').create({ dirOf, readJson, writeJson, gitRun, shaOf, headOf, checkStructure, validId, TEST, logError, gravarEntrega });
  // Branch dos agentes deste projeto: a do dono, na implementação automática do Mutirão (DEV2-006); a da parte do Mutirão,
  // se o sócio abriu o Vibe por ela; senão, a regra de branchOf.
  const branchFor = (id, pasta) => {
    const a = MUT.autoDe(id);
    if (a) return { nome: a.branch, regra: `só na branch "${a.branch}" (a do dono do Mutirão)` };
    const s = MUT.socioDe(id);
    return s ? { nome: s.branch, regra: `só na branch "${s.branch}" (a sua parte do Mutirão)` } : branchOf(pasta);
  };
  // Pedido em arquivo (DEV2-006): as instruções vão para vibe\<id>\pedidos\pedido-<nome>.md e o Termix digita só uma linha curta.
  // No teste da DEV2-005, um pedido longo digitado chegou cortado; assim há menos risco e menos texto no terminal.
  function pedido(id, nome, texto) {
    const f = path.join(dirOf(id), 'pedidos', `pedido-${nome}.md`); // prefixo: nunca o mesmo nome do que o agente grava
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, `# Pedido do Termix (${nome})\n\n${texto}\n`);
    return `Vibe do Termix: leia e siga ${f}`;
  }

  /* ---------- pasta confiável (DEV2-004) ----------
     O Claude Code pergunta "confia nesta pasta?" numa pasta nova e o ciclo para. Decisão do Ygor: o Termix marca sozinho,
     mexendo só na chave hasTrustDialogAccepted da entrada da pasta do projeto no .claude.json. Backup com a data antes,
     releitura logo antes de gravar (as sessões abertas do Claude Code escrevem nesse arquivo), gravação atômica
     (temporário + rename) e nada é gravado se o JSON não for lido. Caminho: CLAUDE_CONFIG_DIR\.claude.json ou ~\.claude.json;
     no modo de teste, TERMIX_VIBE_CLAUDE_JSON aponta para um arquivo de teste. */
  const claudeJson = () => (TEST && process.env.TERMIX_VIBE_CLAUDE_JSON) || path.join(process.env.CLAUDE_CONFIG_DIR || os.homedir(), '.claude.json');
  function trustFolder(pasta) {
    const file = claudeJson();
    const key = path.resolve(pasta).replace(/\\/g, '/');
    const ler = () => { const raw = fs.readFileSync(file, 'utf8'); const j = JSON.parse(raw); if (!j || typeof j !== 'object' || Array.isArray(j)) throw new Error('formato'); return { raw, j }; };
    const keyIn = (j) => Object.keys((j.projects && typeof j.projects === 'object') ? j.projects : {}).find((k) => k.toLowerCase() === key.toLowerCase());
    let a;
    try { a = ler(); } catch { return { ok: false, arquivo: file, motivo: 'Não foi possível ler o .claude.json do Claude Code; nada foi gravado.' }; }
    const k0 = keyIn(a.j);
    if (k0 && a.j.projects[k0] && a.j.projects[k0].hasTrustDialogAccepted === true) return { ok: true, ja: true, arquivo: file, chave: k0 };
    const bdir = path.join(root(), 'backup-claude-json');
    fs.mkdirSync(bdir, { recursive: true });
    const backup = path.join(bdir, `claude-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(backup, a.raw);
    // só os 10 backups mais recentes (DEV2-005): os mais antigos saem
    try { fs.readdirSync(bdir).filter((n) => /^claude-.*\.json$/.test(n)).sort().slice(0, -10).forEach((n) => fs.unlinkSync(path.join(bdir, n))); } catch { /* fica como está */ }
    let b;
    try { b = ler(); } catch { return { ok: false, arquivo: file, backup, motivo: 'O .claude.json mudou e não pôde ser relido; nada foi gravado.' }; }
    const k = keyIn(b.j) || key;
    if (!b.j.projects || typeof b.j.projects !== 'object') b.j.projects = {};
    b.j.projects[k] = { ...(b.j.projects[k] || {}), hasTrustDialogAccepted: true };
    const tmp = `${file}.termix-${process.pid}.tmp`;
    try { fs.writeFileSync(tmp, JSON.stringify(b.j, null, 2)); fs.renameSync(tmp, file); } catch (e) { try { fs.unlinkSync(tmp); } catch { /* sem temporário */ } return { ok: false, arquivo: file, backup, motivo: `Não foi possível gravar o .claude.json (${e.code || e.message}).` }; }
    let ok = false;
    try { const c = ler(); const kc = keyIn(c.j); ok = !!(kc && c.j.projects[kc].hasTrustDialogAccepted === true); } catch { /* confere abaixo */ }
    return { ok, arquivo: file, chave: k, backup, motivo: ok ? '' : 'A marca não ficou gravada (outra sessão do Claude Code pode ter regravado o arquivo).' };
  }

  /* ---------- trava em código das abas do Vibe (DEV2-004) ----------
     Chamado pelo main.js ao abrir um terminal. Se a aba for do Vibe (registrada no ciclo, ou nova com o nome de uma aba do
     Vibe na pasta de uma entrega), grava em vibe\<id>\trava\ o trava.json (projeto, pasta do Vibe, branch permitida) e um
     settings.json = os settings que o núcleo já passaria (status line e hooks do app) + o hook PreToolUse da trava + regras
     permissions.deny, e devolve o caminho para o --settings. Outras abas: null (o núcleo segue igual). Nada disso vai para
     os arquivos .claude do projeto. Se não conseguir gravar, devolve settings que negam shell e escrita (falha fechada). */
  const TRAVA = path.join(__dirname, 'trava.js').replace(/\\/g, '/');
  const DENY = ['Bash(git push --force:*)', 'Bash(git push -f:*)', 'Bash(git push --force-with-lease:*)', 'Bash(git push origin main:*)', 'Bash(git push origin master:*)', 'Bash(git reset --hard:*)', 'Bash(git clean -f:*)', 'Bash(git clean -fd:*)', 'Bash(git branch -D:*)', 'Bash(git stash drop:*)', 'Bash(git stash clear:*)', 'Bash(rm -rf:*)', 'Bash(rm -r:*)', 'Edit(**/.env)']; // Write(**/.env) saiu (DEV2-006): o Claude Code avisa que essa regra nunca vale; o hook já bloqueia
  function vibeIdOfTab(tabId, cwd, args) {
    let ids;
    try { ids = fs.readdirSync(root()).filter(validId); } catch { return null; }
    for (const id of ids) {
      const ab = readJson(path.join(dirOf(id), 'abas.json'));
      if (ab && Array.isArray(ab.abas) && ab.abas.includes(tabId)) return id;
      const es = readJson(path.join(dirOf(id), 'estado.json'));
      if (es && (es.orq === tabId || es.dev === tabId)) return id;
    }
    const ni = Array.isArray(args) ? args.indexOf('--name') : -1;
    const nm = ni >= 0 ? args[ni + 1] : '';
    const mid = MUT.idDaAba(ids, tabId, cwd, nm, samePath); // aba "Mutirão · Orquestrador" (mesma trava do Vibe)
    if (mid) return mid;
    if (nm !== ORQ_NAME && nm !== DEV_NAME) return null;
    const id = ids.find((x) => { const e = entregaOf(x); return e && samePath(e.projeto.pasta, cwd); });
    if (id) { const f = path.join(dirOf(id), 'abas.json'); const ab = readJson(f) || { abas: [] }; ab.abas = [...(ab.abas || []), tabId].slice(-50); writeJson(f, ab); }
    return id || null;
  }
  function spawnSettings({ tabId, cwd, args, settings, runner } = {}) {
    if (!tabId || typeof tabId !== 'string') return null;
    const id = vibeIdOfTab(tabId, cwd, args);
    if (!id) return null;
    const base = settings && typeof settings === 'object' ? settings : {};
    try {
      const e = entregaOf(id);
      const projeto = (e && e.projeto.pasta) || MUT.pastaDe(id) || cwd;
      const tdir = path.join(dirOf(id), 'trava');
      const cfgF = path.join(tdir, 'trava.json');
      writeJson(cfgF, { projeto, vibe: dirOf(id), branch: branchFor(id, projeto).nome, protegidas: PROTEGIDAS, gravado: new Date().toISOString() });
      const cmd = `${runner || 'node'} "${TRAVA}" "${cfgF.replace(/\\/g, '/')}"`;
      const out = { ...base, hooks: { ...(base.hooks || {}), PreToolUse: [{ matcher: '*', hooks: [{ type: 'command', command: cmd, timeout: 30 }] }] }, permissions: { deny: DENY } };
      const sf = path.join(tdir, 'settings.json');
      writeJson(sf, out);
      return sf;
    } catch (err) {
      logError(err);
      return JSON.stringify({ ...base, permissions: { deny: ['Bash', 'PowerShell', 'Write', 'Edit', 'MultiEdit', 'NotebookEdit'] } });
    }
  }

  const api = {
    status: () => ({ ...state, test: TEST }),
    sections: () => SECTIONS.map((s) => s.label),

    async template(testPath) {
      let dest = TEST && typeof testPath === 'string' ? testPath : null;
      if (!dest) {
        const r = await dialog.showSaveDialog(getWin(), { title: 'Salvar o modelo da entrega do Vibe Coding', defaultPath: path.join(app.getPath('documents'), 'estrutura-do-projeto.md'), filters: [{ name: 'Markdown', extensions: ['md'] }] });
        if (r.canceled || !r.filePath) return { ok: false, canceled: true };
        dest = r.filePath;
      }
      fs.writeFileSync(dest, fs.readFileSync(path.join(__dirname, 'modelo-entrega.md')));
      return { ok: true, path: dest };
    },

    async pick(kind, testPath) {
      let file = TEST && typeof testPath === 'string' ? testPath : null;
      if (!file) {
        const filters = kind === 'fluxo'
          ? [{ name: 'Fluxo desenhado', extensions: FLOW_EXT }]
          : [{ name: 'Markdown', extensions: ['md'] }];
        const r = await dialog.showOpenDialog(getWin(), { title: kind === 'fluxo' ? 'Escolher o fluxo desenhado do projeto' : 'Escolher o .md da estrutura do projeto', properties: ['openFile'], filters });
        if (r.canceled || !r.filePaths || !r.filePaths[0]) return { canceled: true };
        file = r.filePaths[0];
      }
      return inspect(kind, file);
    },

    check: (kind, file) => inspect(kind, file),

    draftGet: (id) => (validId(id) ? readJson(path.join(dirOf(id), 'rascunho.json')) : null),
    draftSet(id, d) {
      if (!validId(id) || !d || typeof d !== 'object') return false;
      const old = readJson(path.join(dirOf(id), 'rascunho.json')) || {};
      writeJson(path.join(dirOf(id), 'rascunho.json'), { ...d, ...(old.mutirao && !d.mutirao ? { mutirao: old.mutirao } : {}), projectId: id, salvo: new Date().toISOString() });
      return true;
    },

    entregaGet: (id) => (validId(id) ? readJson(path.join(dirOf(id), 'entrega.json')) : null),

    // Grava a entrega pronta. Se já existir e replace não vier true, não toca em nada e avisa.
    // Ao substituir, a entrega anterior é movida para historico\<data>\ (nada é apagado).
    entregaSave(f, replace) {
      f = f || {};
      const problems = checkFields(f);
      const fluxo = inspect('fluxo', f.fluxo), estrutura = inspect('estrutura', f.estrutura);
      if (!fluxo.ok) problems.push(...fluxo.problems.map((p) => `Fluxo: ${p}`));
      if (!estrutura.ok) problems.push(...estrutura.problems.map((p) => `Estrutura: ${p}`));
      if (problems.length) return { ok: false, problems };
      const dir = dirOf(f.projectId);
      const cur = path.join(dir, 'entrega.json');
      if (fs.existsSync(cur)) {
        if (replace !== true) return { ok: false, exists: true, entrega: readJson(cur) };
        arquivarEntrega(dir);
      }
      fs.mkdirSync(dir, { recursive: true });
      const fluxoName = `fluxo.${fluxo.ext}`, estruturaName = 'estrutura.md';
      fs.copyFileSync(fluxo.path, path.join(dir, fluxoName));
      fs.copyFileSync(estrutura.path, path.join(dir, estruturaName));
      const t = (v) => String(v || '').trim();
      const entrega = {
        versao: 1,
        status: 'pronta',
        data: new Date().toISOString(),
        projeto: { id: f.projectId, nome: t(f.projectName), pasta: t(f.projectPath) },
        objetivo: t(f.objetivo),
        criterioDePronto: t(f.criterio),
        naoPodem: t(f.proibido),
        acessos: f.nadaFornecer ? [] : t(f.acessos).split('\n').map((l) => l.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean),
        nadaAFornecer: !!f.nadaFornecer,
        arquivos: { fluxo: fluxoName, estrutura: estruturaName },
        origem: { fluxo: fluxo.path, estrutura: estrutura.path },
      };
      writeJson(cur, entrega);
      return { ok: true, entrega, pasta: dir };
    },

    /* ---------- ciclo (DEV2-003): agentes, plano e perguntas ----------
       Quem conduz e espera é a interface do Termix (código, zero token); aqui só ficam os arquivos e os textos dos pedidos. */
    cicloGet(id) {
      if (!validId(id)) return null;
      return { estado: readJson(path.join(dirOf(id), 'estado.json')), pasta: dirOf(id) };
    },
    cicloSet(id, est) {
      if (!validId(id) || !est || typeof est !== 'object' || JSON.stringify(est).length > 100000) return false;
      writeJson(path.join(dirOf(id), 'estado.json'), { ...est, projectId: id, atualizado: new Date().toISOString() });
      return true;
    },
    // Novo ciclo: os arquivos do ciclo anterior vão para historico\ciclo-<data>\ (nada é apagado).
    cicloNovo(id) {
      if (!validId(id)) return false;
      const dir = dirOf(id);
      const names = CYCLE_FILES.filter((n) => fs.existsSync(path.join(dir, n)));
      if (!names.length) return true;
      const old = readJson(path.join(dir, 'estado.json')) || {};
      const hist = path.join(dir, 'historico', `ciclo-${String(old.iniciado || new Date().toISOString()).replace(/[:.]/g, '-')}`);
      fs.mkdirSync(hist, { recursive: true });
      for (const n of names) fs.renameSync(path.join(dir, n), path.join(hist, n));
      return true;
    },
    // Texto curto que o Termix digita no terminal do orquestrador. kind: 'plano' (primeiro pedido) ou 'fechar' (depois das respostas).
    cicloPrompt(id, kind) {
      if (!validId(id)) return null;
      const e = readJson(path.join(dirOf(id), 'entrega.json'));
      if (!e) return null;
      const d = dirOf(id);
      const br = branchFor(id, e.projeto && e.projeto.pasta);
      if (kind === 'fechar') {
        return pedido(id, 'fechar', `Respostas do humano em ${path.join(d, 'respostas.json')}. Atualize ${path.join(d, 'plano.md')} com elas e regrave ${path.join(d, 'perguntas.json')} com a lista vazia, a menos que reste algo realmente indispensável. Mesmas regras de antes: só planejar, não mexer no código, não escrever fora de ${d}. Ao terminar, responda apenas PLANO FECHADO e encerre o turno.`);
      }
      const formato = `Grave na pasta ${d} (não na pasta pedidos): 1) plano.md com as tarefas até o fim do projeto, na ordem, cada uma com o título no formato "## T1 — título" (T e o número) e os itens Objetivo, Critério de pronto, Arquivos prováveis, Validação e Não fazer; cada tarefa deve caber num turno do dev e terminar num commit; marque no título com [DEPLOY] a tarefa de deploy/publicação, com [HUMANO] a que precisa de acesso, dado ou decisão do humano (ex.: "## T5 — [DEPLOY] publicar") e com [SEM COMMIT] a que só valida ou confere e pode não mudar nada (ex.: "## T6 — [SEM COMMIT] validação final"); 2) perguntas.json no formato {"perguntas":[{"id":"p1","texto":"...","porque":"...","opcoes":["..."]}]}, só com o que for indispensável e não estiver na entrega; grave o arquivo sempre, com {"perguntas":[]} se nada faltar ("opcoes" é opcional). Comece o plano.md com a linha "Branch de trabalho: ${br.nome || 'a do papel no CLAUDE.local.md'}". Regras do projeto, para valer no plano: commit e push ${br.regra}, nunca na main/master, nem como tarefa do plano; nada que apague dados (sem reset --hard, clean -f, force push, apagar pastas do usuário); economia de tokens (quem espera e controla o ciclo é o Termix, prompts curtos que apontam para arquivos, /clear entre tarefas, o orquestrador lê resumos e não diffs inteiros); avisar o humano só para deploy e o indispensável. Não escreva fora de ${d}. Ao terminar, responda apenas PLANO GRAVADO e encerre o turno.`;
      const m = e.mutirao;
      if (m) { // implementação automática do Mutirão (DEV2-006): as entregas já estão juntadas na branch do dono
        const cf = Array.isArray(m.conflitos) ? m.conflitos : [];
        const conflitos = cf.length ? ` Primeiro, os conflitos da junção: uma tarefa para cada branch que não entrou, a começar pela T1, com o título "## T1 — Resolver o conflito da <branch>" (T2 para a segunda, e assim por diante) (${cf.map((c) => `${c.branch}: ${(c.arquivos || []).join(', ') || 'ver estrutura.md'}`).join('; ')}); nela o Dev roda "git merge --no-ff origin/<branch>" na ${m.branch}, resolve editando os arquivos em conflito (git checkout --ours/--theirs é bloqueado pelo Termix), valida e faz o commit do merge.` : '';
        const lim = m.maxTarefas ? ` Limite deste teste: no máximo ${m.maxTarefas} tarefas no total.` : '';
        return pedido(id, 'plano', `Você é o ORQUESTRADOR do Mutirão do Termix (implementação automática) neste projeto. Todas as partes dos sócios foram entregues e o Termix já juntou as entregas na branch "${m.branch}" (a atual), uma por participante. Nesta etapa só PLANEJE: não altere o código do projeto, não faça commit nem merge. Leia ${path.join(d, 'estrutura.md')} (divisão, partes, entregas, junções e conflitos) e ${path.join(d, 'entrega.json')} (objetivo e critério de pronto) e confira a versão atual da branch ${m.branch} (git log --oneline -20, a estrutura de pastas e só os arquivos necessários; sem ler diffs inteiros). Monte as tarefas até o fim do projeto.${conflitos} Depois: ligar as partes entre si, cobrir as lacunas contra o critério de pronto e, por último, uma tarefa de validação final do projeto inteiro, marcada [SEM COMMIT].${lim} ${formato}`);
      }
      return pedido(id, 'plano', `Você é o ORQUESTRADOR do Vibe Coding do Termix neste projeto. Nesta etapa só PLANEJE: não altere o código do projeto, não instale nada, não faça commit. A entrega do humano está em ${d}: entrega.json (objetivo, critério de pronto, o que não fazer, acessos), estrutura.md e ${e.arquivos && e.arquivos.fluxo || 'o fluxo desenhado'}. Leia só o necessário. ${formato}`);
    },
    // Lê o que o orquestrador gravou: plano.md (texto e nº de tarefas) e perguntas.json (lista normalizada).
    planoLer(id) {
      if (!validId(id)) return null;
      const d = dirOf(id);
      const out = { plano: { ok: false }, perguntas: { ok: false, lista: [] }, respostas: readJson(path.join(d, 'respostas.json')) };
      const pf = path.join(d, 'plano.md');
      if (fs.existsSync(pf)) {
        const st = fs.statSync(pf);
        const text = fs.readFileSync(pf, 'utf8').replace(/^﻿/, '');
        // tarefas = IDs T1, T2... distintos no início de um título ou item de lista ("## T1 — ...", "1. **T1 — ...**", "- T1: ...").
        // Sem IDs, o número fica desconhecido (null): melhor não mostrar do que contar seções como tarefas.
        const ids = new Set([...text.matchAll(/^[ \t]*(?:#{1,4}[ \t]*|\d+[.)][ \t]*|[-*][ \t]+)?(?:\*\*|__)?T(\d+)\b/gm)].map((m) => m[1]));
        const n = ids.size || null;
        out.plano = { ok: text.trim().length > 0, text: text.slice(0, 200000), tarefas: n, mtime: st.mtimeMs, mainCommit: mainCommitLines(text).slice(0, 3) };
      }
      const qf = path.join(d, 'perguntas.json');
      if (!fs.existsSync(qf)) out.perguntas.ausente = true; // a interface decide: com um plano novo, vale como "sem perguntas"
      else {
        try {
          const raw = fs.readFileSync(qf, 'utf8').replace(/^﻿/, '').replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, '');
          const j = JSON.parse(raw);
          const arr = Array.isArray(j) ? j : Array.isArray(j && j.perguntas) ? j.perguntas : null;
          if (!arr) throw new Error('formato');
          out.perguntas = { ok: true, mtime: fs.statSync(qf).mtimeMs, lista: arr.slice(0, 30).map((q, i) => ({
            id: String((q && q.id) || `p${i + 1}`).slice(0, 40),
            texto: String((q && (q.texto || q.pergunta || q.text)) || '').slice(0, 1000),
            porque: String((q && (q.porque || q.motivo || q.why)) || '').slice(0, 1000),
            opcoes: Array.isArray(q && q.opcoes) ? q.opcoes.slice(0, 12).map((o) => String(o).slice(0, 300)) : [],
          })).filter((q) => q.texto.trim()) };
        } catch { out.perguntas = { ok: false, lista: [], erro: 'O perguntas.json não está no formato esperado.' }; }
      }
      return out;
    },
    respostasSave(id, r) {
      if (!validId(id) || !r || !Array.isArray(r.respostas) || JSON.stringify(r).length > 100000) return false;
      writeJson(path.join(dirOf(id), 'respostas.json'), { rodada: r.rodada || 1, data: new Date().toISOString(), respostas: r.respostas });
      return true;
    },
    /* ---------- execução (DEV2-004) ----------
       O Termix (código, zero token) prepara a branch, passa as tarefas ao Dev e confere o git depois de cada uma.
       Os agentes só leem e gravam arquivos curtos: resultados\Tk.md (Dev) e revisoes\Tk.json (orquestrador). */
    trust(id) { const e = entregaOf(id); const pasta = (e && e.projeto.pasta) || MUT.pastaDe(id); return pasta ? trustFolder(pasta) : { ok: false, motivo: 'A entrega do projeto não foi encontrada.' }; },
    tarefas(id) {
      if (!validId(id)) return [];
      try { return tarefasDo(fs.readFileSync(path.join(dirOf(id), 'plano.md'), 'utf8')); } catch { return []; }
    },
    // Confere ou cria a branch permitida (git switch / git switch -c a partir da atual), sem descartar nada.
    branchPrep(id) {
      const e = entregaOf(id);
      const dir = e && e.projeto.pasta;
      if (!dir || !fs.existsSync(dir)) return { ok: false, motivo: 'A pasta do projeto não foi encontrada.' };
      if (!gitRun(dir, ['rev-parse', '--is-inside-work-tree']).ok) return { ok: false, motivo: 'O projeto não tem git. Rode "git init" e faça um primeiro commit na pasta do projeto, depois clique em Continuar.' };
      const br = branchFor(id, dir).nome;
      if (!br) return { ok: false, motivo: 'O projeto usa o fluxo Rocruzta, mas o CLAUDE.local.md não tem a branch do papel (ou ela é a main/master). Defina o papel (/fluxo:papel) e clique em Continuar.' };
      const head = headOf(dir);
      if (head === br) return { ok: true, branch: br, acao: 'ja' };
      const exists = !!shaOf(dir, `refs/heads/${br}`);
      const r = gitRun(dir, exists ? ['switch', br] : ['switch', '-c', br]);
      if (!r.ok) return { ok: false, motivo: `O Termix não conseguiu ${exists ? 'trocar para' : 'criar'} a branch "${br}" sem descartar nada (${(r.err || '').split('\n').slice(0, 3).join(' ').slice(0, 300)}). Guarde as mudanças (commit ou stash) e clique em Continuar.` };
      return { ok: true, branch: br, de: head, acao: exists ? 'trocou' : 'criou' };
    },
    // Fotografia do git: branch atual, a permitida, os SHAs de main/master (locais e do origin) e da permitida, último commit.
    gitInfo(id) {
      const e = entregaOf(id);
      const dir = e && e.projeto.pasta;
      if (!dir || !fs.existsSync(dir)) return null;
      const br = branchFor(id, dir).nome;
      const heads = {};
      for (const b of PROTEGIDAS) { heads[b] = shaOf(dir, `refs/heads/${b}`); heads[`origin/${b}`] = shaOf(dir, `refs/remotes/origin/${b}`); }
      const last = br ? gitRun(dir, ['log', '-1', '--format=%h %s', `refs/heads/${br}`]) : { ok: false };
      return { branch: headOf(dir), permitida: br, permitidaSha: br ? shaOf(dir, `refs/heads/${br}`) : null, heads, ultimo: last.ok ? last.out.slice(0, 160) : '' };
    },
    resultadoLer(id, tk) {
      if (!validId(id) || !/^T\d+$/.test(tk)) return null;
      const f = path.join(dirOf(id), 'resultados', `${tk}.md`);
      try { const st = fs.statSync(f), texto = fs.readFileSync(f, 'utf8').slice(0, 4000); return { existe: true, mtime: st.mtimeMs, texto, validacao: temValidacao(texto) }; } catch { return { existe: false }; }
    },
    revisaoLer(id, tk) {
      if (!validId(id) || !/^T\d+$/.test(tk)) return null;
      const f = path.join(dirOf(id), 'revisoes', `${tk}.json`);
      try {
        const st = fs.statSync(f);
        const j = JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, '').replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, ''));
        const v = norm(j.veredito || j.verdict);
        const veredito = v.startsWith('aprov') ? 'aprovado' : v.startsWith('refaz') ? 'refazer' : '';
        const txt = (x) => (Array.isArray(x) ? x.join('; ') : String(x || '')).slice(0, 1500);
        return { ok: !!veredito, veredito, motivo: txt(j.motivo), ajustes: txt(j.ajustes), mtime: st.mtimeMs };
      } catch { return { ok: false }; }
    },
    // Pedidos curtos da execução. kind: 'dev' (tarefa nova), 'refazer' (com a revisão ou o que faltou), 'revisao' (orquestrador).
    execPrompt(id, kind, tk, extra) {
      const e = entregaOf(id);
      if (!e || !/^T\d+$/.test(String(tk))) return null;
      const d = dirOf(id), plano = path.join(d, 'plano.md'), res = path.join(d, 'resultados', `${tk}.md`), rev = path.join(d, 'revisoes', `${tk}.json`);
      const br = branchFor(id, e.projeto.pasta).nome;
      const regras = `Commit só na branch "${br}" (já é a atual); não faça push nem troque de branch. O Termix bloqueia commit/push na main/master, comandos que apagam dados e gravar fora do projeto: se algo for bloqueado, leia o motivo e siga pelo caminho permitido.`;
      const fim = `Depois grave ${res} (curto: o que fez, hash do commit, validação feita e pendências) e responda apenas ${tk} FEITA, encerrando o turno.`;
      // [SEM COMMIT] (DEV2-007): tarefa de validação/conferência; commit só se corrigir algo, e o Tk.md traz o resultado
      const sc = !!(extra && extra.semCommit);
      const fimSc = `Depois grave ${res} (curto) com uma linha "Validação: <comandos e resultado>" (obrigatória), o hash do commit se houve correção e as pendências; responda apenas ${tk} FEITA, encerrando o turno.`;
      if (kind === 'dev' && sc) return pedido(id, `${tk}-dev`, `Você é o DEV do Vibe Coding do Termix. Execute só a tarefa ${tk} (marcada [SEM COMMIT]: só valida ou confere): leia a seção ${tk} de ${plano} (e só o que ela exigir) e valide como ela pede. Se achar algo para corrigir, corrija e faça um commit "${tk}: ..."; se nada mudar, não faça commit. ${regras} ${fimSc}`);
      if (kind === 'dev') return pedido(id, `${tk}-dev`, `Você é o DEV do Vibe Coding do Termix. Execute só a tarefa ${tk}: leia a seção ${tk} de ${plano} (e só o que ela exigir). Implemente, valide como a tarefa pede e faça um commit "${tk}: ..." com tudo dela. ${regras} ${fim}`);
      if (kind === 'refazer') {
        const ajuste = extra && extra.revisao ? `a revisão pediu ajustes: leia ${rev}` : `o Termix não aceitou a entrega: ${String((extra && extra.falta) || 'faltou o resultado ou o commit').slice(0, 400)}`;
        if (sc) return pedido(id, `${tk}-refazer`, `Você é o DEV do Vibe Coding do Termix. Refaça a tarefa ${tk} (marcada [SEM COMMIT]) da seção ${tk} de ${plano}: ${ajuste}. Valide de novo; commit "${tk}: ..." só se corrigir algo. ${regras} ${fimSc}`);
        return pedido(id, `${tk}-refazer`, `Você é o DEV do Vibe Coding do Termix. Refaça a tarefa ${tk} da seção ${tk} de ${plano}: ${ajuste}. Corrija e faça um commit novo "${tk}: ...". ${regras} ${fim}`);
      }
      if (kind === 'revisao') {
        const sha = extra && extra.sha ? ` (commit ${String(extra.sha).slice(0, 12)})` : sc ? ' (marcada [SEM COMMIT]: sem commit novo, vale o resultado da validação)' : '';
        return pedido(id, `${tk}-revisao`, `Você é o ORQUESTRADOR do Vibe Coding do Termix. Revise a tarefa ${tk}${sha}: leia ${res} e o critério de pronto da seção ${tk} de ${plano}; se precisar, use só "git show --stat" do commit, sem ler diffs inteiros. Não altere o código. Grave ${rev} com {"veredito":"aprovado" ou "refazer","motivo":"...","ajustes":"o que corrigir, se refazer"} e responda apenas REVISADO, encerrando o turno.`);
      }
      return null;
    },
    // Só no modo de teste: grava um perguntas.json de teste para conferir o formulário sem gastar tokens.
    testPerguntas(id, lista) {
      if (!TEST || !validId(id) || !Array.isArray(lista)) return false;
      writeJson(path.join(dirOf(id), 'perguntas.json'), { perguntas: lista });
      return true;
    },
  };

  // Handlers ipc do módulo: um erro aqui é registrado no erros.log e devolve um resultado neutro (o app segue).
  if (ipcMain) {
    const on = (ch, fn, fallback = null) => ipcMain.handle(`vibe:${ch}`, async (_e, ...a) => {
      try { return await fn(...a); } catch (e) { logError(e); return fallback; }
    });
    on('status', api.status);
    on('sections', api.sections, []);
    on('template', api.template, { ok: false, error: true });
    on('pick', api.pick, { ok: false, problems: ['Não foi possível abrir o arquivo.'] });
    on('check', api.check, { ok: false, problems: ['Não foi possível conferir o arquivo.'] });
    on('draftGet', api.draftGet);
    on('draftSet', api.draftSet, false);
    on('entregaGet', api.entregaGet);
    on('entregaSave', api.entregaSave, { ok: false, problems: ['Não foi possível gravar a entrega. Veja o erros.log.'] });
    on('cicloGet', api.cicloGet);
    on('cicloSet', api.cicloSet, false);
    on('cicloNovo', api.cicloNovo, false);
    on('cicloPrompt', api.cicloPrompt);
    on('planoLer', api.planoLer);
    on('respostasSave', api.respostasSave, false);
    on('testPerguntas', api.testPerguntas, false);
    on('trust', api.trust, { ok: false, motivo: 'Erro ao marcar a pasta como confiável. Veja o erros.log.' });
    on('tarefas', api.tarefas, []);
    on('branchPrep', api.branchPrep, { ok: false, motivo: 'Erro ao preparar a branch. Veja o erros.log.' });
    on('gitInfo', api.gitInfo);
    on('resultadoLer', api.resultadoLer);
    on('revisaoLer', api.revisaoLer);
    on('execPrompt', api.execPrompt);
    for (const [k, fn] of Object.entries(MUT.api)) on(k, fn, null); // Mutirão (DEV2-005)
  }
  api.spawnSettings = spawnSettings; // usado pelo main.js (não é canal ipc)
  return api;
}

module.exports = { create, checkStructure, tarefasDo, SECTIONS };
