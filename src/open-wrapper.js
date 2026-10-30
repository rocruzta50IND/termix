// termix-open: abre uma página local (arquivo ou endereço) na aba Web do Termix. Roda só dentro dos terminais do Termix
// (o comando e as variáveis TERMIX_* existem apenas na sessão que o app abre). Grava um pedido para o app ler e nunca abre nada por conta própria.
const fs = require('fs');
const path = require('path');

const LOCAL_HOST = /^(localhost|127(\.\d{1,3}){3}|0\.0\.0\.0|\[::1\]|10(\.\d{1,3}){3}|192\.168(\.\d{1,3}){2}|172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2}|[^.]+\.localhost)$/i;
const say = (s) => { try { process.stdout.write(`${s}\n`); } catch { /* sem saída */ } };

const dir = process.env.TERMIX_METRICS_DIR;
const tabId = process.env.TERMIX_TAB_ID;
const arg = process.argv.slice(2).join(' ').trim().replace(/^"(.*)"$/, '$1');

if (!dir || !tabId) { say('termix-open só funciona dentro de um terminal do Termix.'); process.exit(1); }
if (!arg) { say('Uso: termix-open <arquivo, pasta ou endereço local>   (ex.: termix-open index.html  |  termix-open http://localhost:3000)'); process.exit(1); }

let target = null;
if (/^https?:\/\//i.test(arg)) {
  let host = '';
  try { host = new URL(arg).hostname; } catch { /* inválido */ }
  const h = host.includes(':') ? `[${host.replace(/^\[|\]$/g, '')}]` : host;
  if (!LOCAL_HOST.test(h)) { say('Termix: a aba Web abre só páginas locais. Para este endereço use o navegador do sistema.'); process.exit(2); }
  target = arg;
} else {
  const raw = /^file:\/\//i.test(arg) ? decodeURIComponent(arg.replace(/^file:\/+/i, '')) : arg;
  let file = path.resolve(process.cwd(), raw);
  try { if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html'); } catch { /* checado abaixo */ }
  if (!fs.existsSync(file)) { say(`Termix: arquivo não encontrado: ${file}`); process.exit(3); }
  target = file;
}
try {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `open-${Date.now()}-${process.pid}.json`), JSON.stringify({ t: Date.now(), tabId, target }));
  say(`Termix: aberto na aba Web — ${target}`);
} catch (e) { say(`Termix: não foi possível pedir a abertura (${e.message})`); process.exit(4); }
