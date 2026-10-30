// Encaminhador da status line do Claude Code usado pelo Termix.
// 1) grava os dados da sessão (limites, contexto, custo) para o app ler;
// 2) repassa a mesma entrada para a status line original do usuário e devolve a saída dela.
// Qualquer falha aqui é silenciosa: a status line do usuário continua funcionando.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

// leitura síncrona do stdin: funciona igual no Node e quando o próprio Termix executa o script (--termix-run)
let raw = '';
try { raw = fs.readFileSync(0, 'utf8'); } catch { /* sem entrada */ }
{
  let j = {};
  try { j = JSON.parse(raw); } catch { /* entrada inesperada */ }

  try {
    const dir = process.env.TERMIX_METRICS_DIR;
    const id = process.env.TERMIX_TAB_ID;
    if (dir && id) {
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `tab-${id}.json`);
      // os limites da conta só chegam depois da primeira resposta da sessão: até lá mantém os últimos conhecidos (o app confere se a janela ainda vale)
      let prevLimits = null;
      if (!j.rate_limits) { try { prevLimits = JSON.parse(fs.readFileSync(file, 'utf8')).rate_limits; } catch { /* sem leitura anterior */ } }
      const slim = {
        updated: Date.now(),
        session_id: j.session_id,
        model: j.model,
        context_window: j.context_window,
        rate_limits: j.rate_limits || prevLimits || undefined,
        cost: j.cost,
        cwd: (j.workspace && j.workspace.current_dir) || j.cwd,
        // Claude Code >= 2.1.251 envia prompt_cache; nas versões antigas estima pelo arquivo da conversa
        prompt_cache: j.prompt_cache || cacheFromTranscript(j.transcript_path),
      };
      fs.writeFileSync(file, JSON.stringify(slim));
    }
  } catch { /* não atrapalha a status line */ }

  const cmd = originalCommand(j);
  if (cmd) {
    try {
      const r = spawnSync(cmd, { input: raw, shell: true, encoding: 'utf8', timeout: 5000 });
      process.stdout.write(r.stdout || '');
    } catch { /* ignora */ }
  }
}

// estimativa do cache a partir da última chamada da conversa principal (últimos 512 KB do arquivo)
function cacheFromTranscript(file) {
  if (!file) return null;
  let lines;
  try {
    const fd = fs.openSync(file, 'r');
    try {
      const size = fs.fstatSync(fd).size;
      const start = Math.max(0, size - 512 * 1024);
      const buf = Buffer.alloc(size - start);
      fs.readSync(fd, buf, 0, buf.length, start);
      lines = buf.toString('utf8').split(/\r?\n/);
    } finally { fs.closeSync(fd); }
  } catch { return null; }
  let lastTs = null, ttl = null;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i].includes('"assistant"')) continue;
    let e; try { e = JSON.parse(lines[i]); } catch { continue; }
    if (e.type !== 'assistant' || e.isSidechain) continue;
    const usage = e.message && e.message.usage;
    if (!usage) continue;
    if (!lastTs) lastTs = e.timestamp;
    const c = usage.cache_creation || {};
    // quando a requisição mistura TTLs, o de 5 min fica no fim da conversa e vale o mais curto
    if (c.ephemeral_5m_input_tokens) ttl = '5m';
    else if (c.ephemeral_1h_input_tokens) ttl = '1h';
    if (ttl) break;
  }
  const called = lastTs ? Date.parse(lastTs) / 1000 : NaN;
  if (!isFinite(called)) return null;
  ttl = ttl || '5m';
  const expires = called + (ttl === '1h' ? 3600 : 300);
  return { ttl, expires_at: expires, warm: expires > Date.now() / 1000, estimated: true };
}

function originalCommand(j) {
  const cwd = (j.workspace && j.workspace.current_dir) || j.cwd || process.cwd();
  const files = [
    path.join(cwd, '.claude', 'settings.local.json'),
    path.join(cwd, '.claude', 'settings.json'),
    path.join(os.homedir(), '.claude', 'settings.json'),
  ];
  for (const f of files) {
    try {
      const s = JSON.parse(fs.readFileSync(f, 'utf8')).statusLine;
      if (s && s.type === 'command' && s.command && !String(s.command).includes('statusline-wrapper')) return s.command;
    } catch { /* arquivo ausente ou inválido */ }
  }
  return null;
}
