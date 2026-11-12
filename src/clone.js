// Clonar um repositório público do GitHub pelo link (TASK-133). Sem login e sem API: só o `git clone` que já está no PC.
// O link nunca vira texto de comando: só dono/repositório validados entram, como argumento do git (execFile, com `--`).
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const REPO = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,99}$/;

// aceita https://github.com/dono/repo (com ou sem .git e barra final), github.com/dono/repo e dono/repo
function parse(input) {
  let s = String(input || '').trim();
  if (!s) return { ok: false, error: 'Cole o link do repositório.' };
  if (/\s/.test(s)) return { ok: false, error: 'O link não pode ter espaços.' };
  const m = s.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/(.+)$/i);
  if (m) s = m[1];
  else if (/^[a-z][a-z0-9+.-]*:/i.test(s) || /^[^/]+\.[a-z]{2,}\//i.test(s)) return { ok: false, error: 'Por enquanto só links do GitHub (github.com).' };
  s = s.replace(/[?#].*$/, '').replace(/\/+$/, '');
  const parts = s.split('/');
  if (parts.length > 2) return { ok: false, error: 'Use o link do repositório inteiro, sem /tree, /blob ou /pull (ex.: github.com/dono/repo).' };
  if (parts.length < 2) return { ok: false, error: 'O link precisa ter o dono e o repositório (ex.: github.com/dono/repo).' };
  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/i, '');
  if (!OWNER.test(owner) || !REPO.test(repo) || repo === '.' || repo === '..') return { ok: false, error: 'Link inválido. Use o formato github.com/dono/repo.' };
  return { ok: true, owner, repo, url: `https://github.com/${owner}/${repo}.git` };
}

function explain(err, stderr) {
  if (err && err.code === 'ENOENT') return 'O Git não foi encontrado neste computador. Instale o Git para clonar.';
  if (err && err.killed) return 'O clone demorou demais e foi cancelado. Verifique a internet e tente de novo.';
  const t = String(stderr || '');
  if (/not found|could not read username|authentication failed|terminal prompts disabled|unable to get password|invalid credentials|repository .* not exist/i.test(t)) {
    return 'Não consegui acessar. O repositório é privado ou o link está errado. Por enquanto só públicos.';
  }
  if (/could not resolve host|unable to access|failed to connect|timed out|network/i.test(t)) return 'Sem conexão com o GitHub. Verifique a internet e tente de novo.';
  const last = t.trim().split(/\r?\n/).filter(Boolean).pop() || 'erro desconhecido';
  return `O clone falhou: ${last.slice(0, 160)}`;
}

// clona para <root>/<nome-livre>; se falhar, remove o que ficou pelo meio
function run(parsed, root, slug) {
  return new Promise((resolve) => {
    try { fs.mkdirSync(root, { recursive: true }); } catch (e) { resolve({ ok: false, error: 'Não consegui criar a pasta de projetos.' }); return; }
    const base = slug(parsed.repo);
    let dir = path.join(root, base);
    for (let i = 2; fs.existsSync(dir); i++) dir = path.join(root, `${base}-${i}`);
    const env = { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never', GIT_ASKPASS: '', SSH_ASKPASS: '' };
    // credential.helper vazio: nada de janela de login do Windows (repositório privado falha rápido)
    const args = ['-c', 'credential.helper=', '-c', 'credential.interactive=never', 'clone', '--', parsed.url, dir];
    execFile('git', args, { env, timeout: 5 * 60 * 1000, windowsHide: true, maxBuffer: 4 * 1024 * 1024, encoding: 'utf8' }, (err, _out, stderr) => {
      if (err) {
        try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignora */ }
        resolve({ ok: false, error: explain(err, stderr) });
        return;
      }
      resolve({ ok: true, path: dir, name: parsed.repo });
    });
  });
}

function setup(ipcMain, { resolveRoot, slug }) {
  ipcMain.handle('project:clone', async (_e, url, custom) => {
    const p = parse(url);
    if (!p.ok) return p;
    const { root } = await resolveRoot(custom);
    return run(p, root, slug);
  });
}

module.exports = { setup, parse };
