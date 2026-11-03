'use strict';
/* Consumo (tokens e custo equivalente) lido das conversas do Claude Code em ~/.claude/projects/<pasta>/<sessão>.jsonl.
   Cada resposta do Claude vem em várias linhas com o mesmo message.id; vale a última (a de uso completo).
   Os arquivos só crescem no fim: guardamos, por arquivo, o ponto onde paramos e as respostas já lidas
   (cache em %APPDATA%\Termix\consumo-cache.json), então a leitura seguinte só lê o que é novo. */
const fs = require('fs');
const path = require('path');
const os = require('os');

const CACHE_VERSION = 1;

/* US$ por milhão de tokens: [entrada, saída, leitura de cache]. Escrita de cache: 1,25x a entrada (5 min) e 2x (1 h).
   Preços de tabela da API (não é o que a assinatura cobra: por isso "custo equivalente"). Modelo fora da tabela => sem custo. */
const PRICES = {
  'claude-fable-5-1': [10, 50, 0.25], 'claude-mythos-5-1': [10, 50, 0.25],
  'claude-fable-5': [10, 50, 1], 'claude-mythos-5': [10, 50, 1],
  'claude-opus-5-5': [4, 20, 0.2], 'claude-opus-5': [5, 25, 0.5],
  'claude-opus-4-8': [5, 25, 0.5], 'claude-opus-4-7': [5, 25, 0.5], 'claude-opus-4-6': [5, 25, 0.5],
  'claude-sonnet-5-5': [2, 10, 0.2], 'claude-sonnet-5': [2, 10, 0.2], 'claude-sonnet-4-6': [3, 15, 0.3],
  'claude-haiku-5-5': [0.1, 0.5, 0.01], 'claude-haiku-4-5': [1, 5, 0.1],
};
const priceOf = (model) => PRICES[String(model).replace(/-\d{8}$/, '')] || null;

function costOf(model, inp, out, cr, cw5, cw1) {
  const p = priceOf(model);
  if (!p) return null;
  return (inp * p[0] + out * p[1] + cr * p[2] + cw5 * p[0] * 1.25 + cw1 * p[0] * 2) / 1e6;
}

const pad = (n) => (n < 10 ? '0' : '') + n;
const dayKey = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

function create({ userData }) {
  const ROOT = path.join(os.homedir(), '.claude', 'projects');
  const CACHE = path.join(userData, 'consumo-cache.json');
  let files = {}; // caminho relativo -> { size, offset, sid, dir, cwd, msgs: { id: [ts, modelo, in, out, cr, cw5, cw1] } }
  let loaded = false, dirty = false, running = null, snap = null;

  function loadCache() {
    loaded = true;
    try { const j = JSON.parse(fs.readFileSync(CACHE, 'utf8')); if (j && j.v === CACHE_VERSION && j.files) files = j.files; } catch { /* sem cache: lê tudo */ }
  }
  function saveCache() {
    if (!dirty) return;
    try { fs.writeFileSync(CACHE + '.tmp', JSON.stringify({ v: CACHE_VERSION, files })); fs.renameSync(CACHE + '.tmp', CACHE); dirty = false; } catch { /* tenta na próxima */ }
  }

  function parseLine(f, line) {
    if (!line.includes('"usage"')) return;
    let o; try { o = JSON.parse(line); } catch { return; }
    const m = o && o.message;
    if (!m || m.role !== 'assistant' || !m.usage || !m.id || m.model === '<synthetic>') return;
    if (!f.cwd && typeof o.cwd === 'string') f.cwd = o.cwd;
    const u = m.usage, cc = u.cache_creation || {};
    const cw1 = cc.ephemeral_1h_input_tokens || 0;
    const cw5 = typeof cc.ephemeral_5m_input_tokens === 'number' ? cc.ephemeral_5m_input_tokens : Math.max(0, (u.cache_creation_input_tokens || 0) - cw1);
    const ts = Date.parse(o.timestamp);
    if (!ts) return;
    f.msgs[m.id] = [ts, m.model || '', u.input_tokens || 0, u.output_tokens || 0, u.cache_read_input_tokens || 0, cw5, cw1];
  }

  /* lê o arquivo a partir de f.offset em blocos; só consome linhas completas */
  function readFrom(file, f, size) {
    return new Promise((resolve) => {
      let rest = Buffer.alloc(0), consumed = f.offset;
      const st = fs.createReadStream(file, { start: f.offset, end: size - 1, highWaterMark: 1 << 20 });
      st.on('data', (chunk) => {
        let buf = rest.length ? Buffer.concat([rest, chunk]) : chunk, from = 0, i;
        while ((i = buf.indexOf(10, from)) !== -1) { parseLine(f, buf.toString('utf8', from, i)); consumed += i - from + 1; from = i + 1; }
        rest = from < buf.length ? Buffer.from(buf.subarray(from)) : Buffer.alloc(0);
      });
      st.on('error', () => resolve());
      st.on('close', () => { f.offset = consumed; resolve(); });
    });
  }

  async function scanOnce() {
    if (!loaded) loadCache();
    let dirs = [];
    try { dirs = fs.readdirSync(ROOT, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name); } catch { /* sem conversas ainda */ }
    const seen = new Set();
    for (const dir of dirs) {
      let names = [];
      try { names = fs.readdirSync(path.join(ROOT, dir)).filter((n) => n.endsWith('.jsonl')); } catch { continue; }
      for (const n of names) {
        const rel = dir + '/' + n, abs = path.join(ROOT, dir, n);
        seen.add(rel);
        let size; try { size = fs.statSync(abs).size; } catch { continue; }
        let f = files[rel];
        if (f && size < f.offset) f = null; // arquivo foi reescrito: lê de novo
        if (!f) { f = files[rel] = { size: 0, offset: 0, sid: n.slice(0, -6), dir, cwd: '', msgs: {} }; dirty = true; }
        if (size > f.offset) { await readFrom(abs, f, size); f.size = size; dirty = true; }
      }
    }
    for (const rel of Object.keys(files)) if (!seen.has(rel)) { delete files[rel]; dirty = true; }
    saveCache();
    return build();
  }

  /* junta as respostas de cada sessão por dia e por modelo */
  function build() {
    const sessions = [];
    for (const f of Object.values(files)) {
      const ids = Object.keys(f.msgs);
      if (!ids.length) continue;
      const s = { id: f.sid, dir: f.dir, cwd: f.cwd, first: Infinity, last: 0, msgs: ids.length, days: {} };
      for (const id of ids) {
        const [ts, model, inp, out, cr, cw5, cw1] = f.msgs[id];
        if (ts < s.first) s.first = ts;
        if (ts > s.last) s.last = ts;
        const cost = costOf(model, inp, out, cr, cw5, cw1);
        const cw = cw5 + cw1;
        // por dia e por modelo: [entrada, saída, cache lido, cache gravado, custo, 1 se o modelo tem preço]
        const day = (s.days[dayKey(ts)] = s.days[dayKey(ts)] || {});
        const mm = (day[model || '?'] = day[model || '?'] || [0, 0, 0, 0, 0, cost === null ? 0 : 1]);
        mm[0] += inp; mm[1] += out; mm[2] += cr; mm[3] += cw; mm[4] += cost || 0;
      }
      sessions.push(s);
    }
    return { updated: Date.now(), sessions };
  }

  /* uma leitura por vez; chamadas durante uma leitura recebem o mesmo resultado */
  function snapshot() {
    if (!running) running = scanOnce().then((r) => { snap = r; return r; }).catch(() => snap || { updated: Date.now(), sessions: [], error: true }).finally(() => { running = null; });
    return running;
  }
  return { snapshot, PRICES };
}

module.exports = { create, priceOf, costOf };
