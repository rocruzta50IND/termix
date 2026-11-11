'use strict';
/* Resumo de retomada do Clear (TASK-117). Monta, sem usar o Claude, um texto curto com o ponto em que a conversa estava:
   últimos pedidos do usuário, fim da última resposta, arquivos alterados, git e a tarefa ativa (se o projeto tem docs/TASKS.md).
   A fonte é o histórico que o próprio Claude Code grava (.jsonl) + git; nada é enviado a lugar nenhum. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

// Modelo padrão do resumo (editável em Configurações > Botão Clear). Cada {{MARCADOR}} vira um bloco já com o seu título, ou some quando não há o que mostrar.
const DEFAULT_TEMPLATE = [
  '[Termix · retomada] O usuário limpou o contexto pelo botão Clear do Termix. Este resumo foi montado pelo app a partir da conversa anterior: continue de onde ela parou, sem reler o projeto inteiro. Leia só o que a próxima etapa exigir; se faltar informação, pergunte em vez de supor.',
  '',
  '{{PROJETO}}',
  '{{PEDIDOS}}',
  '{{RESPOSTA}}',
  '{{ARQUIVOS}}',
  '{{GIT}}',
  '{{TAREFA}}',
].join('\n');
const MAX_TEMPLATE = 20000;
const MAX_TAIL = 4 * 1024 * 1024; // lê só o final do histórico (a conversa pode ter dezenas de MB)
const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);

const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const tailClip = (s, n) => { s = String(s || '').replace(/[ \t]+/g, ' ').trim(); return s.length > n ? '…' + s.slice(-(n - 1)) : s; };

function transcriptFile(cwd, sessionId) {
  if (!/^[0-9a-f-]{36}$/i.test(String(sessionId))) return null;
  const file = path.join(os.homedir(), '.claude', 'projects', String(cwd).replace(/[^a-zA-Z0-9]/g, '-'), sessionId + '.jsonl');
  return fs.existsSync(file) ? file : null;
}

function readLines(file) {
  const st = fs.statSync(file), n = Math.min(st.size, MAX_TAIL), fd = fs.openSync(file, 'r');
  try {
    const b = Buffer.alloc(n); fs.readSync(fd, b, 0, n, st.size - n);
    const lines = b.toString('utf8').split('\n');
    if (st.size > MAX_TAIL) lines.shift(); // a primeira linha do pedaço pode estar cortada
    return lines;
  } finally { fs.closeSync(fd); }
}

// lê o histórico: pedidos do usuário, textos do Claude e arquivos alterados, na ordem em que aconteceram
function digestTranscript(file, cwd) {
  const users = [], ais = [], files = [], texts = [];
  for (const line of readLines(file)) {
    if (!line.startsWith('{')) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    if (o.isSidechain || o.isMeta || !o.message) continue;
    const c = o.message.content;
    if (o.type === 'user') {
      const parts = typeof c === 'string' ? [c] : Array.isArray(c) ? c.filter((b) => b.type === 'text').map((b) => b.text) : [];
      for (const t of parts) if (t && t.trim() && !t.startsWith('<')) { users.push(t.trim()); texts.push(t); }
    } else if (o.type === 'assistant' && Array.isArray(c)) {
      for (const b of c) {
        if (b.type === 'text' && b.text && b.text.trim()) { ais.push(b.text.trim()); texts.push(b.text); }
        else if (b.type === 'tool_use' && EDIT_TOOLS.has(b.name) && b.input) {
          const f = b.input.file_path || b.input.notebook_path;
          if (typeof f === 'string' && f) { const rel = path.isAbsolute(f) ? path.relative(cwd, f) : f; if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) continue; /* fora do projeto */ const i = files.indexOf(rel); if (i >= 0) files.splice(i, 1); files.push(rel.replace(/\\/g, '/')); }
        }
      }
    }
  }
  return { users, ais, files, texts };
}

function git(cwd, args) {
  try { return execFileSync('git', args, { cwd, encoding: 'utf8', timeout: 4000, windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; }
}

// entrada da tarefa em docs/TASKS.md: só status, pendências e próximo passo (nunca o arquivo inteiro)
function taskEntry(cwd, id) {
  try {
    const txt = fs.readFileSync(path.join(cwd, 'docs', 'TASKS.md'), 'utf8');
    const m = new RegExp('^### ' + id + ' — (.*)$', 'm').exec(txt);
    if (!m) return null;
    const rest = txt.slice(m.index + m[0].length), next = rest.search(/^#{2,3} /m);
    const body = next >= 0 ? rest.slice(0, next) : rest;
    const pick = (label) => { const r = new RegExp('^- \\*\\*' + label + ':\\*\\*\\s*(.*)$', 'm').exec(body); return r ? clip(r[1], 420) : ''; };
    return { id, title: clip(m[1], 120), status: pick('Status'), pending: pick('Pendências'), next: pick('Próximo passo') };
  } catch { return null; }
}

// a tarefa ativa é a última TASK-NNN citada na conversa que existe no TASKS.md
function activeTask(cwd, texts) {
  const tried = new Set();
  for (let i = texts.length - 1; i >= 0 && tried.size < 6; i--) {
    for (const id of [...new Set(String(texts[i]).match(/TASK-\d{3,4}/g) || [])].reverse()) {
      if (tried.has(id)) continue; tried.add(id);
      const e = taskEntry(cwd, id); if (e) return e;
    }
  }
  return null;
}

/* Monta o resumo. `info` = { role, branch } opcional (do fluxo Rocruzta). Devolve null quando não há o que resumir. */
function buildHandoff({ cwd, sessionId, info, template }) {
  if (typeof cwd !== 'string' || !fs.existsSync(cwd)) return null;
  const file = transcriptFile(cwd, sessionId);
  const t = file ? digestTranscript(file, cwd) : { users: [], ais: [], files: [], texts: [] };
  const status = git(cwd, ['status', '-sb']).split('\n').slice(0, 12).join('\n');
  const log = git(cwd, ['log', '--oneline', '-4']);
  if (!t.users.length && !t.ais.length && !status) return null;
  const task = activeTask(cwd, t.texts);
  const blocks = {
    PROJETO: `Projeto: ${path.basename(cwd)}${info && info.role ? ` · papel ${info.role}` : ''}${info && info.branch ? ` · branch ${info.branch}` : ''}`,
    PEDIDOS: t.users.length ? ['Últimos pedidos do usuário (do mais antigo ao mais recente):', ...t.users.slice(-3).map((u) => '- ' + clip(u, 420))].join('\n') : '',
    RESPOSTA: t.ais.length ? 'Fim da última resposta do Claude (onde parou): ' + tailClip(t.ais[t.ais.length - 1], 1000) : '',
    ARQUIVOS: t.files.length ? `Arquivos alterados na conversa (${t.files.length}): ${t.files.slice(-12).join(', ')}${t.files.length > 12 ? ' …' : ''}` : '',
    GIT: [status ? 'git status:\n' + status : '', log ? 'Últimos commits:\n' + log : ''].filter(Boolean).join('\n'),
    TAREFA: task ? `Tarefa ativa ${task.id} — ${task.title}${task.status ? `\n  Status: ${task.status}` : ''}${task.pending ? `\n  Pendências: ${task.pending}` : ''}${task.next ? `\n  Próximo passo: ${task.next}` : ''}` : '',
  };
  const tpl = typeof template === 'string' && template.trim() && template.length <= MAX_TEMPLATE ? template : DEFAULT_TEMPLATE;
  const text = tpl.replace(/\{\{\s*([A-Z]+)\s*\}\}/g, (m, k) => (k in blocks ? blocks[k] : m)).replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 8000);
  if (!text) return null;
  return { text, chars: text.length, task: task ? task.id : '', files: t.files.length };
}

module.exports = { buildHandoff, DEFAULT_TEMPLATE };
