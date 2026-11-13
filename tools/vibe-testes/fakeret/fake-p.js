// "claude" falso para a coleta (-p): grava os argumentos, o cwd e o stdin; responde em JSON como `--output-format json`.
const fs = require('fs'), crypto = require('crypto');
const cfg = (() => { try { return JSON.parse(fs.readFileSync(process.env.FAKE_RET_CFG, 'utf8')); } catch { return {}; } })();
let inp = ''; process.stdin.on('data', (d) => { inp += d; });
process.stdin.on('end', () => {
  const args = process.argv.slice(2), t0 = Date.now();
  const i = args.indexOf('--resume'); const id = i >= 0 ? args[i + 1] : '';
  const n = (cfg.n = (cfg.n || 0) + 1); try { fs.writeFileSync(process.env.FAKE_RET_CFG, JSON.stringify(cfg)); } catch {}
  setTimeout(() => {
    fs.appendFileSync(process.env.FAKE_RET_LOG, JSON.stringify({ args, cwd: process.cwd(), stdin: inp, t0, t1: Date.now(), n }) + '\n');
    if (cfg.falha && cfg.falha.includes(id)) { process.stderr.write('Erro falso: conversa não encontrada\n'); process.exit(1); }
    process.stdout.write(JSON.stringify({ type: 'result', is_error: false, result: `Resposta falsa da conversa ${id.slice(0, 8)}: objetivo X; não sei o resto.`, session_id: crypto.randomUUID() }) + '\n');
  }, cfg.demora || 200);
});
