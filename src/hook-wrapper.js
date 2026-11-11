// Hook do Claude Code usado pelo Termix: grava o último evento da sessão (iniciou, prompt enviado,
// terminou, pediu atenção) para o app ler. Nunca falha: não atrapalha o Claude Code. Única saída: depois de um /clear (SessionStart),
// se o app deixou um resumo de retomada para esta aba (TASK-117), entrega-o ao Claude Code como contexto da conversa nova.
const fs = require('fs');
const path = require('path');

// leitura síncrona do stdin: funciona igual no Node e quando o próprio Termix executa o script (--termix-run)
let raw = '';
try { raw = fs.readFileSync(0, 'utf8'); } catch { /* sem entrada */ }
{
  try {
    const dir = process.env.TERMIX_METRICS_DIR;
    const id = process.env.TERMIX_TAB_ID;
    if (!dir || !id) return;
    let j = {};
    try { j = JSON.parse(raw); } catch { /* entrada inesperada */ }
    const event = j.hook_event_name || process.argv[2];
    fs.mkdirSync(dir, { recursive: true });
    const out = { t: Date.now(), event, session_id: j.session_id, source: j.source, notification_type: j.notification_type, message: j.message,
      last: typeof j.last_assistant_message === 'string' ? j.last_assistant_message.slice(0, 600) : undefined }; // texto final do agente (Stop), para o aviso mostrar o que foi feito
    const hf = path.join(dir, `hook-${id}.json`);
    fs.writeFileSync(hf + '.tmp', JSON.stringify(out));
    fs.renameSync(hf + '.tmp', hf);
    if (event === 'SessionStart' && j.source === 'clear') {
      const rf = path.join(dir, `handoff-${String(id).replace(/[^\w-]/g, '')}.txt`);
      try {
        if (Date.now() - fs.statSync(rf).mtimeMs < 5 * 60 * 1000) {
          const text = fs.readFileSync(rf, 'utf8');
          process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text } }));
        }
        fs.unlinkSync(rf);
      } catch { /* sem resumo para esta aba */ }
    }
  } catch { /* silencioso */ }
}
