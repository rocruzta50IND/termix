'use strict';
/* Modo Chat (TASK-040): uma conversa com o Claude Code sem terminal. Sobe `claude -p` em modo stream-json (entrada e saída em JSON, uma linha por evento)
   e repassa os eventos para a tela. Usa o login do próprio Claude Code (sem API externa). Um processo por aba, criado no primeiro envio. */
const { spawn, execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

module.exports = function createChat({ findClaude, sessionEnv, emit, hint }) {
  const procs = new Map(); // tabId -> { child, killed, err }

  function start({ tabId, cwd, sessionId, resume, perm }) {
    const claude = findClaude();
    if (!claude) return { ok: false, error: 'Claude Code não foi encontrado neste computador. Instale-o (claude.com/claude-code), abra o Termix de novo e tente de novo.' };
    if (!fs.existsSync(cwd)) return { ok: false, error: `A pasta do projeto não existe: ${cwd}` };
    stop(tabId);
    const args = ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--include-partial-messages', '--verbose',
      ...(resume ? ['--resume', sessionId] : ['--session-id', sessionId]),
      // Automático: ignora as verificações de permissão (como a aba "Dangerously"); Perguntar: só edições de arquivo são aceitas e o resto é negado (o app avisa)
      ...(perm === 'd' ? ['--dangerously-skip-permissions'] : ['--permission-mode', 'acceptEdits']),
      '--append-system-prompt', hint];
    const isCmd = claude.toLowerCase().endsWith('.cmd');
    let child;
    try {
      child = spawn(isCmd ? 'cmd.exe' : claude, isCmd ? ['/c', claude, ...args] : args, { cwd, env: sessionEnv(tabId), windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (err) { return { ok: false, error: String((err && err.message) || err) }; }
    const rec = { child, killed: false, err: '' };
    procs.set(tabId, rec);
    // junta os eventos em lotes (~16 ms): o texto chega em dezenas de pedaços por segundo
    let buf = '', batch = [], timer = null;
    const flush = () => { timer = null; if (batch.length) { const evs = batch; batch = []; emit('chat:events', { tabId, evs }); } };
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line.startsWith('{')) continue;
        try { batch.push(JSON.parse(line)); } catch { /* linha incompleta ou não JSON: ignora */ }
      }
      if (!timer) timer = setTimeout(flush, 16);
    });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (d) => { rec.err = (rec.err + d).slice(-2000); });
    child.on('error', (err) => { rec.err += String((err && err.message) || err); });
    child.on('close', (code, signal) => {
      if (timer) { clearTimeout(timer); flush(); }
      if (procs.get(tabId) === rec) procs.delete(tabId);
      emit('chat:exit', { tabId, code, signal, killed: rec.killed, err: rec.err.trim() });
    });
    return { ok: true, pid: child.pid };
  }

  function send({ tabId, text }) {
    const rec = procs.get(tabId);
    if (!rec || !rec.child.stdin.writable) return { ok: false };
    rec.child.stdin.write(JSON.stringify({ type: 'user', message: { role: 'user', content: String(text) } }) + '\n');
    return { ok: true };
  }

  function stop(tabId) {
    const rec = procs.get(tabId);
    if (!rec) return;
    rec.killed = true;
    const pid = rec.child.pid;
    if (process.platform === 'win32' && pid) execFile('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true }, () => {}); // mata a árvore (claude.cmd -> node -> claude)
    else { try { rec.child.kill(); } catch { /* já encerrado */ } }
  }

  function stopAll() { for (const id of [...procs.keys()]) stop(id); }

  /* histórico para reabrir uma conversa: lê o .jsonl do Claude Code e devolve itens simples (você, Claude, ferramenta) */
  function history({ cwd, sessionId }) {
    try {
      if (!/^[0-9a-f-]{36}$/i.test(String(sessionId))) return { items: [], model: '', usage: null };
      const file = path.join(os.homedir(), '.claude', 'projects', String(cwd).replace(/[^a-zA-Z0-9]/g, '-'), sessionId + '.jsonl');
      if (!fs.existsSync(file)) return { items: [], model: '', usage: null };
      const st = fs.statSync(file), MAX = 8 * 1024 * 1024;
      const fd = fs.openSync(file, 'r');
      let txt;
      try { const n = Math.min(st.size, MAX), b = Buffer.alloc(n); fs.readSync(fd, b, 0, n, st.size - n); txt = b.toString('utf8'); } finally { fs.closeSync(fd); }
      const lines = txt.split('\n'); if (st.size > MAX) lines.shift(); // a primeira linha do pedaço pode estar cortada
      const items = [], tools = {};
      let model = '', usage = null;
      for (const line of lines) {
        if (!line.startsWith('{')) continue;
        let o; try { o = JSON.parse(line); } catch { continue; }
        if (o.isSidechain || o.isMeta || !o.message) continue;
        const c = o.message.content;
        if (o.type === 'user') {
          if (typeof c === 'string') { if (c.trim() && !c.startsWith('<')) items.push({ k: 'me', text: c }); continue; }
          if (!Array.isArray(c)) continue;
          for (const b of c) {
            if (b.type === 'text' && b.text && !b.text.startsWith('<')) items.push({ k: 'me', text: b.text });
            else if (b.type === 'tool_result' && tools[b.tool_use_id]) {
              const t = tools[b.tool_use_id];
              t.done = true; t.err = !!b.is_error;
              t.body = (typeof b.content === 'string' ? b.content : Array.isArray(b.content) ? b.content.map((x) => x.text || '').join('\n') : '').slice(0, 1500);
            }
          }
        } else if (o.type === 'assistant' && Array.isArray(c)) {
          if (o.message.model && o.message.model[0] !== '<') model = o.message.model;
          if (o.message.usage) usage = o.message.usage;
          for (const b of c) {
            if (b.type === 'text' && b.text && b.text.trim()) items.push({ k: 'ai', text: b.text });
            else if (b.type === 'tool_use') { const t = { k: 'tool', id: b.id, name: b.name, input: b.input, done: false }; tools[b.id] = t; items.push(t); }
          }
        }
      }
      return { items: items.slice(-300), model, usage };
    } catch { return { items: [], model: '', usage: null }; }
  }

  return { start, send, stop, stopAll, history };
};
