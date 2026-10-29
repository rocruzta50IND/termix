// Hook do Claude Code usado pelo Termix: grava o último evento da sessão (iniciou, prompt enviado,
// terminou, pediu atenção) para o app ler. Não imprime nada e nunca falha: não atrapalha o Claude Code.
const fs = require('fs');
const path = require('path');

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => { raw += d; });
process.stdin.on('end', () => {
  try {
    const dir = process.env.TERMIX_METRICS_DIR;
    const id = process.env.TERMIX_TAB_ID;
    if (!dir || !id) return;
    let j = {};
    try { j = JSON.parse(raw); } catch { /* entrada inesperada */ }
    const event = j.hook_event_name || process.argv[2];
    fs.mkdirSync(dir, { recursive: true });
    const out = { t: Date.now(), event, session_id: j.session_id, source: j.source, notification_type: j.notification_type, message: j.message };
    fs.writeFileSync(path.join(dir, `hook-${id}.json`), JSON.stringify(out));
  } catch { /* silencioso */ }
});
