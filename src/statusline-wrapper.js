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
      const slim = {
        updated: Date.now(),
        session_id: j.session_id,
        model: j.model,
        context_window: j.context_window,
        rate_limits: j.rate_limits,
        cost: j.cost,
      };
      fs.writeFileSync(path.join(dir, `tab-${id}.json`), JSON.stringify(slim));
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
