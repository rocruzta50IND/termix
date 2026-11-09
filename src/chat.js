'use strict';
/* Modo Chat (TASK-040): uma conversa com o Claude Code sem terminal. Sobe `claude -p` em modo stream-json (entrada e saída em JSON, uma linha por evento)
   e repassa os eventos para a tela. Usa o login do próprio Claude Code (sem API externa). Um processo por aba, criado no primeiro envio. */
const { spawn, execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

module.exports = function createChat({ findClaude, sessionEnv, emit, hint, handoffFile }) {
  const procs = new Map(); // tabId -> { child, killed, err }

  function start({ tabId, cwd, sessionId, resume, perm, handoff }) {
    const claude = findClaude();
    if (!claude) return { ok: false, error: 'Claude Code não foi encontrado neste computador. Instale-o (claude.com/claude-code), abra o Termix de novo e tente de novo.' };
    if (!fs.existsSync(cwd)) return { ok: false, error: `A pasta do projeto não existe: ${cwd}` };
    stop(tabId);
    const args = ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--include-partial-messages', '--verbose',
      ...(resume ? ['--resume', sessionId] : ['--session-id', sessionId]),
      // Automático: ignora as verificações de permissão (como a aba "Dangerously"). Perguntar: edições de arquivo são aceitas e o resto vira um pedido
      // (`control_request` no stdout) que o chat mostra como cartão Permitir/Negar; a resposta volta pelo stdin (`permit`). Sem o `--permission-prompt-tool stdio`
      // o modo `-p` negaria tudo em silêncio (TASK-105).
      ...(perm === 'd' ? ['--dangerously-skip-permissions'] : ['--permission-mode', 'acceptEdits', '--permission-prompt-tool', 'stdio']),
      '--append-system-prompt', hint];
    // depois de um Clear: o resumo montado pelo app entra como instrução da conversa nova (arquivo: evita aspas e quebras de linha no cmd.exe)
    const hfile = handoff && !resume && handoffFile ? handoffFile(tabId) : '';
    if (hfile && fs.existsSync(hfile)) args.push('--append-system-prompt-file', hfile);
    const isCmd = claude.toLowerCase().endsWith('.cmd');
    let child;
    try {
      child = spawn(isCmd ? 'cmd.exe' : claude, isCmd ? ['/c', claude, ...args] : args, { cwd, env: sessionEnv(tabId), windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (err) { return { ok: false, error: String((err && err.message) || err) }; }
    child.stdin.on('error', () => { /* o processo encerrou no meio da escrita */ });
    const rec = { child, killed: false, err: '' };
    procs.set(tabId, rec);
    // junta os eventos em lotes (~16 ms): o texto chega em dezenas de pedaços por segundo
    let buf = '', batch = [], timer = null;
    const flush = () => { timer = null; if (batch.length) { const evs = batch; batch = []; emit('chat:events', { tabId, evs }); } };
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (d) => {
      if (hfile) { try { fs.unlinkSync(hfile); } catch { /* já apagado */ } } // o Claude Code já leu o arquivo ao subir
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

  function send({ tabId, text, images }) {
    const rec = procs.get(tabId);
    if (!rec || !rec.child.stdin.writable) return { ok: false };
    const imgs = (Array.isArray(images) ? images : []).filter((m) => m && /^image\/(png|jpeg|webp|gif)$/.test(m.mt) && typeof m.data === 'string' && /^[A-Za-z0-9+/=]+$/.test(m.data)).slice(0, 20);
    const content = imgs.length
      ? [...imgs.map((m) => ({ type: 'image', source: { type: 'base64', media_type: m.mt, data: m.data } })), ...(String(text).trim() ? [{ type: 'text', text: String(text) }] : [])]
      : String(text);
    rec.child.stdin.write(JSON.stringify({ type: 'user', message: { role: 'user', content } }) + '\n');
    return { ok: true };
  }

  /* resposta a um pedido de permissão (`can_use_tool`): allow (com a entrada original e, se for "sempre", as regras sugeridas) ou deny com o motivo */
  function permit({ tabId, requestId, allow, input, rules, message }) {
    const rec = procs.get(tabId);
    if (!rec || !rec.child.stdin.writable || typeof requestId !== 'string') return { ok: false };
    const response = allow
      ? { behavior: 'allow', updatedInput: input && typeof input === 'object' ? input : {}, ...(Array.isArray(rules) && rules.length ? { updatedPermissions: rules } : {}) }
      : { behavior: 'deny', message: String(message || 'O usuário negou esta ação no Termix.').slice(0, 500) };
    rec.child.stdin.write(JSON.stringify({ type: 'control_response', response: { subtype: 'success', request_id: requestId, response } }) + '\n');
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
          const pics = c.filter((b) => b.type === 'image' && b.source && b.source.type === 'base64' && /^image\//.test(b.source.media_type || '')).map((b) => 'data:' + b.source.media_type + ';base64,' + b.source.data);
          let used = false;
          for (const b of c) {
            if (b.type === 'text' && b.text && !b.text.startsWith('<')) { items.push({ k: 'me', text: b.text, ...(pics.length && !used ? { imgs: pics } : {}) }); used = true; }
            else if (b.type === 'tool_result' && tools[b.tool_use_id]) {
              const t = tools[b.tool_use_id];
              t.done = true; t.err = !!b.is_error;
              t.body = (typeof b.content === 'string' ? b.content : Array.isArray(b.content) ? b.content.map((x) => x.text || '').join('\n') : '').slice(0, 1500);
            }
          }
          if (pics.length && !used) items.push({ k: 'me', text: '', imgs: pics });
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

  return { start, send, permit, stop, stopAll, history };
};
