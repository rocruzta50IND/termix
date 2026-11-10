// Tela "Código" (TASK-102): árvore de arquivos, leitor e mudanças do git. Somente leitura.
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const SKIP = new Set(['.git', 'node_modules', 'dist', 'build-cache', '.next', '__pycache__', '.venv']);
const MAX_READ = 1024 * 1024; // 1 MB

// resolve um caminho relativo garantindo que fica dentro da pasta do projeto
function inside(cwd, rel) {
  const root = path.resolve(cwd);
  const full = path.resolve(root, rel || '.');
  if (full !== root && !full.startsWith(root + path.sep)) return null;
  return full;
}

function git(cwd, args, opts = {}) {
  return new Promise((resolve) => {
    execFile('git', ['-C', cwd, ...args], { timeout: opts.timeout || 8000, windowsHide: true, maxBuffer: 8 * 1024 * 1024, encoding: 'utf8' }, (err, out) => {
      resolve({ ok: !err, out: String(out || ''), code: err && err.code });
    });
  });
}

function tree(cwd, rel) {
  const dir = inside(cwd, rel);
  if (!dir) return { ok: false, error: 'Caminho fora do projeto.' };
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true })
      .filter((d) => !SKIP.has(d.name))
      .map((d) => ({ name: d.name, dir: d.isDirectory() }))
      .sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }) : a.dir ? -1 : 1));
    return { ok: true, items };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
}

function read(cwd, rel) {
  const full = inside(cwd, rel);
  if (!full) return { ok: false, error: 'Caminho fora do projeto.' };
  try {
    const st = fs.statSync(full);
    if (!st.isFile()) return { ok: false, error: 'Não é um arquivo.' };
    const fd = fs.openSync(full, 'r');
    const len = Math.min(st.size, MAX_READ);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, 0); fs.closeSync(fd);
    if (buf.subarray(0, Math.min(len, 8000)).includes(0)) return { ok: true, binary: true, size: st.size };
    return { ok: true, text: buf.toString('utf8'), size: st.size, truncated: st.size > MAX_READ };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
}

// git status + contagem de linhas (+/-) de cada arquivo
async function status(cwd) {
  const inRepo = await git(cwd, ['rev-parse', '--is-inside-work-tree']);
  if (!inRepo.ok || inRepo.out.trim() !== 'true') return { ok: true, repo: false, files: [] };
  const [st, ns, br] = await Promise.all([
    git(cwd, ['status', '--porcelain=v1', '-z', '-uall']),
    git(cwd, ['diff', 'HEAD', '--numstat', '-z']),
    git(cwd, ['branch', '--show-current']),
  ]);
  const nums = {};
  const parts = ns.out.split('\0');
  for (let i = 0; i < parts.length; i++) {
    const m = /^(\d+|-)\t(\d+|-)\t(.*)$/.exec(parts[i]);
    if (!m) continue;
    let file = m[3];
    if (file === '') { file = parts[i + 2] || ''; i += 2; } // renomeado: -z manda origem e destino em campos separados
    nums[file] = { add: m[1] === '-' ? 0 : +m[1], del: m[2] === '-' ? 0 : +m[2] };
  }
  const files = [];
  const ent = st.out.split('\0');
  for (let i = 0; i < ent.length; i++) {
    const e = ent[i];
    if (e.length < 4) continue;
    const x = e[0], y = e[1];
    let file = e.slice(3);
    if (x === 'R' || x === 'C') i++; // o próximo campo é o nome antigo
    const untracked = x === '?' && y === '?';
    const code = untracked ? 'U' : (x !== ' ' && x !== '?' ? x : y);
    files.push({ path: file, code, staged: !untracked && x !== ' ', untracked, ...(nums[file] || { add: 0, del: 0 }) });
  }
  files.sort((a, b) => a.path.localeCompare(b.path, 'pt-BR', { sensitivity: 'base' }));
  return { ok: true, repo: true, branch: br.out.trim(), files };
}

// diff de um arquivo contra o último commit; arquivo novo (não rastreado) vira "tudo adicionado"
async function diff(cwd, rel, untracked) {
  const full = inside(cwd, rel);
  if (!full) return { ok: false, error: 'Caminho fora do projeto.' };
  if (untracked) {
    const r = read(cwd, rel);
    if (!r.ok) return r;
    if (r.binary) return { ok: true, binary: true };
    const lines = r.text.split('\n'); if (lines[lines.length - 1] === '') lines.pop();
    return { ok: true, text: `--- /dev/null\n+++ b/${rel}\n@@ -0,0 +1,${lines.length} @@\n${lines.map((l) => '+' + l).join('\n')}`, truncated: r.truncated };
  }
  const r = await git(cwd, ['diff', 'HEAD', '--no-color', '-U4', '--', rel]);
  if (!r.ok) return { ok: false, error: 'Não foi possível ler o diff.' };
  if (/^Binary files /m.test(r.out)) return { ok: true, binary: true };
  return { ok: true, text: r.out };
}

function setup(ipcMain) {
  ipcMain.handle('code:tree', (_e, a) => tree(a.cwd, a.rel));
  ipcMain.handle('code:read', (_e, a) => read(a.cwd, a.rel));
  ipcMain.handle('code:status', (_e, a) => status(a.cwd));
  ipcMain.handle('code:diff', (_e, a) => diff(a.cwd, a.rel, !!a.untracked));
}

module.exports = { setup };
