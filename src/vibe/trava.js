'use strict';
/* Trava do Vibe Coding (DEV2-004): hook PreToolUse do Claude Code, só nas abas do Vibe.
   Uso: node trava.js <trava.json>   (entrada do hook em JSON pelo stdin)
   trava.json: { projeto, vibe, branch, protegidas: ['main', 'master'] }
   Nega (código 2 e o motivo no stderr, mais a decisão em JSON no stdout) o que pode estragar o projeto ou apagar dados:
   commit/merge/rebase com o HEAD fora da branch permitida (ou em main/master), push fora dela ou forçado,
   comandos git que descartam trabalho, apagar recursivo ou fora das pastas permitidas, gravar fora delas
   e gravar em .env, chaves e credenciais. O resto passa. Sem dependências; não é sandbox: cobre os caminhos comuns.
   Desenho: docs/VIBE_MUTIRAO.md. */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const lc = (s) => String(s || '').toLowerCase();
const WRITE_TOOLS = ['write', 'edit', 'multiedit', 'notebookedit'];
const SHELL_TOOLS = ['bash', 'powershell'];

// ---------- caminhos ----------
function resolveP(p, cwd) {
  let s = String(p || '').trim().replace(/^["']|["']$/g, '');
  if (/^~(?=$|[\\/])/.test(s)) s = os.homedir() + s.slice(1);
  const m = /^\/([a-zA-Z])(?:\/|$)(.*)$/.exec(s); // /c/Users/... do Git Bash
  if (m) s = `${m[1]}:/${m[2]}`;
  const w = /^\/mnt\/([a-zA-Z])(?:\/|$)(.*)$/.exec(s);
  if (w) s = `${w[1]}:/${w[2]}`;
  return path.resolve(cwd || process.cwd(), s);
}
const inside = (p, dir) => { if (!dir) return false; const r = path.relative(lc(path.resolve(dir)), lc(p)); return r === '' || (!r.startsWith('..') && !path.isAbsolute(r)); };
const unresolved = (s) => /[$%]/.test(String(s).replace(/^\$null$/i, ''));
const NULLS = ['/dev/null', 'nul', '$null', '&1', '&2', '-'];

// .env (menos os modelos), chaves e credenciais: ler pode, gravar não
function isSecret(p) {
  const b = lc(path.basename(p));
  if (b === '.env') return true;
  if (/^\.env\./.test(b) && !/^\.env\.(example|sample|template|dist|defaults?)$/.test(b)) return true;
  if (/\.(pem|key|p12|pfx|jks|keystore|ppk|asc)$/.test(b)) return true;
  if (/^id_(rsa|dsa|ecdsa|ed25519)/.test(b)) return true;
  if (['credentials', 'credentials.json', '.npmrc', '.pypirc', '.netrc', '.git-credentials', 'secrets.json', 'secrets.yml', 'secrets.yaml', '.credentials.json'].includes(b)) return true;
  if (/^service-account.*\.json$/.test(b)) return true;
  return false;
}

// ---------- divisão do comando em partes (respeita aspas) ----------
function segments(cmd) {
  const out = [];
  let cur = [], tok = '', has = false, q = null;
  const push = () => { if (has) cur.push(tok); tok = ''; has = false; };
  const end = () => { push(); if (cur.length) out.push(cur); cur = []; };
  const s = String(cmd || '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      if (ch === q) q = null;
      else if (ch === '\\' && q === '"' && (s[i + 1] === '"' || s[i + 1] === '\\')) tok += s[++i];
      else tok += ch;
      continue;
    }
    if (ch === '"' || ch === "'") { q = ch; has = true; continue; }
    if (ch === '\\' && s[i + 1] === '\n') { i++; continue; }
    if (ch === '\n' || ch === ';' || ch === '|' || ch === '&' || ch === '(' || ch === ')' || ch === '{' || ch === '}' || ch === '`') {
      if (ch === '&' && /[<>]$/.test(tok)) { tok += ch; has = true; continue; } // 2>&1, >&2
      end(); // ";", "&&", "||", "|", "&" (fundo, ou o "& cmd" do PowerShell), subshell e substituição separam comandos
      if ((ch === '&' || ch === '|') && s[i + 1] === ch) i++;
      continue;
    }
    if (ch === '$' && s[i + 1] === '(') { end(); i++; continue; }
    if (ch === '>' || (ch === '<' && s[i + 1] !== '(')) {
      // redirecionamento: vira um token próprio ('>' ou '>>'), com o número do descritor antes, se houver
      if (has && !/^\d$/.test(tok)) push(); else { tok = ''; has = false; }
      let op = ch;
      if (s[i + 1] === '>') { op += '>'; i++; }
      if (s[i + 1] === '&' && /\d/.test(s[i + 2] || '')) { i += 2; continue; } // >&1
      cur.push(op === '<' ? '<' : '>');
      continue;
    }
    if (/\s/.test(ch)) { push(); continue; }
    tok += ch; has = true;
  }
  end();
  return out;
}

// ---------- regras ----------
function git(dir, args) {
  try { return execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000, windowsHide: true }).trim(); } catch { return null; }
}
const isRepo = (dir) => git(dir, ['rev-parse', '--git-dir']) !== null;
const headOf = (dir) => git(dir, ['symbolic-ref', '--short', '-q', 'HEAD']);

// DEV2-009: resolver conflito escolhendo um lado (git checkout --ours|--theirs -- <arq>, git restore [--source=..] --ours|--theirs <arq>).
// Só com merge em andamento (MERGE_HEAD), o HEAD na branch permitida e cada arquivo ainda em conflito; fora disso, bloqueado.
function lado(sub, rest, dir, allowed, prot) {
  const NAO = `git ${sub} --ours/--theirs só é permitido pelo Termix para resolver um conflito de merge em andamento, na branch permitida, citando os arquivos em conflito (ex.: git checkout --theirs -- src/a.js). Fora disso, edite os arquivos.`;
  if (!isRepo(dir) || git(dir, ['rev-parse', '-q', '--verify', 'MERGE_HEAD']) === null) return NAO;
  const head = headOf(dir);
  if (!head || !allowed || head !== allowed || prot.includes(head)) return NAO;
  const files = [];
  let dd = false;
  for (let k = 0; k < rest.length; k++) {
    const a = rest[k];
    if (!dd && a === '--') { dd = true; continue; }
    if (!dd && ['--ours', '--theirs', '--worktree', '-W'].includes(a)) continue;
    if (!dd && sub === 'restore' && /^--source=./.test(a)) continue;
    if (!dd && sub === 'restore' && ['-s', '--source'].includes(a) && rest[k + 1]) { k++; continue; }
    if (!dd && a.startsWith('-')) return NAO; // -f, -p, --staged, --merge, --conflict...: fora do caso permitido
    files.push(a);
  }
  if (!files.length) return NAO;
  const real = (p) => { try { return fs.realpathSync.native(p); } catch { return p; } }; // nomes curtos do Windows (ex.: CRUUUU~1)
  const top = real(git(dir, ['rev-parse', '--show-toplevel']) || dir);
  const un = (git(dir, ['diff', '--name-only', '--diff-filter=U']) || '').split('\n').filter(Boolean).map((f) => lc(path.resolve(top, f)));
  for (const f of files) {
    if (/[*?[\]]/.test(f) || unresolved(f)) return NAO;
    if (!un.includes(lc(real(resolveP(f, dir))))) return `${NAO} "${f}" não está em conflito.`;
  }
  return null;
}

// DEV2-013: trocar para a main/master (git checkout/switch <prot>, com -b/-c/--detach ou pelo remoto origin/<prot>) é bloqueado.
// Considera cada nome não-opção do comando (branch nova, ponto de partida, alvo); "-" e @{-N} viram a branch anterior.
function vaiParaProt(rest, dir, prot) {
  const remotos = ((isRepo(dir) && git(dir, ['remote'])) || '').split('\n').map((s) => s.trim()).filter(Boolean);
  if (!remotos.includes('origin')) remotos.push('origin');
  const nome = (a) => {
    let r = a === '@' ? '-' : a; // o separador de comandos corta as chaves: @{-1} chega como '@' (e main@{1} como 'main@')
    if (r === '-' || /^@\{-\d+\}$/.test(r)) r = (isRepo(dir) && git(dir, ['rev-parse', '--symbolic-full-name', r === '-' ? '@{-1}' : r])) || r;
    r = r.replace(/^refs\/heads\//, '').replace(/^refs\/remotes\//, '').replace(/^remotes\//, '');
    r = r.split(/[~^]|@\{/)[0].replace(/@$/, '');
    const barra = r.indexOf('/');
    if (barra > 0 && remotos.includes(r.slice(0, barra))) r = r.slice(barra + 1);
    return r;
  };
  const eProt = (n) => prot.some((b) => lc(b) === lc(n)); // refs no Windows não diferenciam maiúsculas
  let dd = false;
  for (const a of rest) {
    if (a === '--') { dd = true; continue; }
    if (dd) continue;
    if (a !== '-' && a.startsWith('-')) {
      const v = a.match(/^--(?:orphan|create|force-create)=(.+)$/); // --create=<nome>
      if (v && eProt(nome(v[1]))) return nome(v[1]);
      continue;
    }
    if (eProt(nome(a))) return nome(a);
  }
  return null;
}

function checkGit(args, dir, cfg) {
  // opções globais do git antes do subcomando
  let i = 0;
  while (i < args.length && args[i].startsWith('-')) {
    const a = args[i];
    if (a === '-C') { dir = resolveP(args[i + 1], dir); i += 2; continue; }
    if (a === '-c' || a === '--git-dir' || a === '--work-tree' || a === '--namespace') { i += 2; continue; }
    if (a.startsWith('--work-tree=')) dir = resolveP(a.slice(12), dir);
    i++;
  }
  const sub = lc(args[i]);
  const rest = args.slice(i + 1);
  const has = (...f) => rest.some((a) => f.includes(a));
  const allowed = cfg.branch;
  const prot = cfg.protegidas || ['main', 'master'];
  const why = (m) => m;
  const BR = allowed ? `a branch permitida é "${allowed}" (git switch ${allowed})` : 'não há branch permitida definida: não faça commit nem push';

  if (['commit', 'merge', 'rebase', 'cherry-pick', 'revert', 'am', 'pull'].includes(sub)) {
    if (['rebase', 'merge', 'cherry-pick', 'revert', 'am'].includes(sub) && has('--abort', '--quit')) return null;
    if (!isRepo(dir)) return null; // fora de um repositório o próprio git recusa
    const head = headOf(dir);
    if (!head) return why(`git ${sub} com o HEAD destacado é bloqueado pelo Termix: ${BR}.`);
    if (prot.includes(head)) return why(`git ${sub} com o HEAD em "${head}" é bloqueado pelo Termix: nunca altere a main/master. ${BR[0].toUpperCase()}${BR.slice(1)}.`);
    if (!allowed) return why(`git ${sub} bloqueado: ${BR}.`);
    if (head !== allowed) return why(`git ${sub} na branch "${head}" é bloqueado pelo Termix: ${BR}.`);
    return null;
  }
  if (sub === 'push') {
    const pos = [];
    for (let k = 0; k < rest.length; k++) {
      const a = rest[k];
      if (['-o', '--push-option', '--repo', '--receive-pack', '--exec'].includes(a)) { k++; continue; }
      if (/^--(force|force-with-lease|force-if-includes|delete|mirror|all|prune)(=|$)/.test(a)) return why(`git push ${a} é bloqueado pelo Termix (força, apaga ou envia tudo). Envie só a branch permitida, sem forçar.`);
      if (/^-[a-zA-Z]+$/.test(a) && /[fd]/.test(a)) return why(`git push ${a} é bloqueado pelo Termix (força ou apaga). Envie só a branch permitida, sem forçar.`);
      if (a.startsWith('-')) continue;
      pos.push(a);
    }
    if (!allowed) return why(`git push bloqueado: ${BR}.`);
    const head = isRepo(dir) ? headOf(dir) : null;
    const refs = pos.slice(1);
    if (!refs.length) {
      if (head !== allowed) return why(`git push sem branch, com o HEAD em "${head || '?'}", é bloqueado pelo Termix: ${BR}; use git push -u origin ${allowed}.`);
      return null;
    }
    for (const r of refs) {
      if (r.startsWith('+')) return why(`git push ${r} (forçado) é bloqueado pelo Termix.`);
      if (r.startsWith(':')) return why(`git push ${r} (apaga a branch remota) é bloqueado pelo Termix.`);
      let dst = r.includes(':') ? r.split(':').pop() : r;
      dst = dst.replace(/^refs\/heads\//, '');
      if (dst === 'HEAD' || dst === '@') dst = head || '';
      if (prot.includes(dst)) return why(`git push para "${dst}" é bloqueado pelo Termix: nunca envie para a main/master. ${BR[0].toUpperCase()}${BR.slice(1)}.`);
      if (dst !== allowed && !/^refs\/tags\//.test(r) && !/^v?\d/.test(dst)) return why(`git push para "${dst}" é bloqueado pelo Termix: ${BR}.`);
    }
    return null;
  }
  if (sub === 'reset' && has('--hard', '--merge')) return why('git reset --hard é bloqueado pelo Termix (descarta trabalho). Faça um commit novo que desfaça a mudança (git revert) ou peça ao humano.');
  if (sub === 'clean' && !has('-n', '--dry-run')) return why('git clean é bloqueado pelo Termix (apaga arquivos não versionados). Peça ao humano se for mesmo necessário.');
  if ((sub === 'checkout' || sub === 'restore') && has('--ours', '--theirs')) {
    const r = lado(sub, rest, dir, allowed, prot);
    if (r === null) return null;
    return why(r);
  }
  if (sub === 'checkout') {
    if (has('--', '-f', '--force', '.', '-p', '--patch') || rest.some((a) => /^-[a-zA-Z]*f[a-zA-Z]*$/.test(a) && a !== '-b')) return why('git checkout em arquivos (ou forçado) é bloqueado pelo Termix (descarta mudanças). Para trocar de branch use git switch <branch>.');
    if (has('-B') && rest.some((a) => prot.includes(a))) return why('git checkout -B na main/master é bloqueado pelo Termix.');
    if (!has('-b', '-B', '--orphan') && rest.some((a) => !a.startsWith('-') && fs.existsSync(resolveP(a, dir)))) return why('git checkout em arquivos é bloqueado pelo Termix (descarta mudanças). Para trocar de branch use git switch <branch>.');
    const p = vaiParaProt(rest, dir, prot);
    if (p) return why(`git checkout para "${p}" é bloqueado pelo Termix: não saia da branch permitida para a main/master. ${BR[0].toUpperCase()}${BR.slice(1)}.`);
    return null;
  }
  if (sub === 'restore') {
    const staged = has('--staged', '-S'), wt = has('--worktree', '-W');
    if (!staged || wt) return why('git restore em arquivos é bloqueado pelo Termix (descarta mudanças). Faça um commit novo ou peça ao humano.');
    return null;
  }
  if (sub === 'switch' && (has('--discard-changes', '-f', '--force', '-C') || has('--force-create'))) return why('git switch forçado é bloqueado pelo Termix (descarta mudanças ou recria a branch).');
  if (sub === 'switch') {
    const p = vaiParaProt(rest, dir, prot);
    if (p) return why(`git switch para "${p}" é bloqueado pelo Termix: não saia da branch permitida para a main/master. ${BR[0].toUpperCase()}${BR.slice(1)}.`);
    return null;
  }
  if (sub === 'branch') {
    const del = has('-D') || (has('-d', '--delete') && has('-f', '--force'));
    if (del) return why('git branch -D é bloqueado pelo Termix (apaga uma branch sem conferir). Peça ao humano.');
    if (rest.some((a) => prot.includes(a)) && has('-f', '--force', '-m', '-M', '-c', '-C', '-d', '--delete', '--move')) return why('Mexer na main/master com git branch é bloqueado pelo Termix.');
    return null;
  }
  if (sub === 'stash' && ['drop', 'clear'].includes(lc(rest[0]))) return why(`git stash ${rest[0]} é bloqueado pelo Termix (apaga trabalho guardado).`);
  if (sub === 'update-ref' && (has('-d', '--delete') || rest.some((a) => prot.some((b) => a === b || a.endsWith(`/${b}`))))) return why('git update-ref na main/master (ou apagando) é bloqueado pelo Termix.');
  if (['filter-branch', 'filter-repo'].includes(sub)) return why(`git ${sub} é bloqueado pelo Termix (reescreve o histórico).`);
  if (sub === 'reflog' && ['expire', 'delete'].includes(lc(rest[0]))) return why('git reflog expire/delete é bloqueado pelo Termix.');
  return null;
}

// apagar: recursivo nunca; não recursivo só dentro do projeto ou da pasta do Vibe (e nunca na trava)
const RM = ['rm', 'del', 'erase', 'rd', 'rmdir', 'remove-item', 'ri', 'unlink', 'shred'];
function checkRm(name, args, cwd, cfg) {
  const cmdStyle = ['del', 'erase', 'rd', 'rmdir'].includes(name);
  const targets = [];
  let rec = false;
  for (let k = 0; k < args.length; k++) {
    const a = args[k], l = lc(a);
    if (l === '--recursive' || /^-r(e(c(u(r(s(e)?)?)?)?)?)?$/i.test(a) || (/^-[a-z]{1,4}$/i.test(a) && /r/i.test(a) && name !== 'remove-item' && name !== 'ri') || (cmdStyle && l === '/s')) { rec = true; continue; }
    if (/^-(path|literalpath|lp)$/i.test(a)) { if (args[k + 1]) targets.push(args[++k]); continue; }
    if (a.startsWith('-') || (cmdStyle && /^\/[a-z]$/i.test(a))) continue;
    targets.push(a);
  }
  if (rec) return 'Apagar de forma recursiva (rm -r, Remove-Item -Recurse, rd /s) é bloqueado pelo Termix. Apague arquivo por arquivo dentro do projeto ou peça ao humano.';
  if (!targets.length) return inside(cwd, cfg.projeto) || inside(cwd, cfg.vibe) ? null : 'Apagar fora da pasta do projeto é bloqueado pelo Termix.';
  for (const t of targets) {
    if (unresolved(t)) return `Apagar "${t}" (caminho com variável) é bloqueado pelo Termix: use o caminho literal dentro do projeto.`;
    const p = resolveP(t.replace(/[*?].*$/, '') || '.', cwd);
    if (!(inside(p, cfg.projeto) || inside(p, cfg.vibe))) return `Apagar "${t}" é bloqueado pelo Termix: fica fora da pasta do projeto.`;
    if (inside(p, path.join(cfg.vibe, 'trava'))) return 'A configuração da trava do Termix não pode ser apagada.';
    if (lc(path.resolve(p)) === lc(path.resolve(cfg.projeto)) || inside(p, path.join(cfg.projeto, '.git'))) return 'Apagar a pasta do projeto ou o .git é bloqueado pelo Termix.';
  }
  return null;
}

// gravar: só dentro do projeto ou da pasta do Vibe; nunca em .env, chaves, credenciais, na trava, nos settings do Claude do projeto nem no .git
function checkWritePath(target, cwd, cfg) {
  if (!target || NULLS.includes(lc(target))) return null;
  if (unresolved(target)) return `Gravar em "${target}" (caminho com variável) é bloqueado pelo Termix: use o caminho literal dentro do projeto.`;
  const p = resolveP(target, cwd);
  if (!(inside(p, cfg.projeto) || inside(p, cfg.vibe))) return `Gravar em "${p}" é bloqueado pelo Termix: só dentro da pasta do projeto (${cfg.projeto}) ou da pasta do Vibe.`;
  if (inside(p, path.join(cfg.vibe, 'trava'))) return 'A configuração da trava do Termix não pode ser alterada pelos agentes.';
  if (isSecret(p)) return `Gravar em "${path.basename(p)}" é bloqueado pelo Termix (.env, chaves e credenciais): ler pode; peça ao humano para preencher.`;
  if (inside(p, path.join(cfg.projeto, '.git'))) return 'Gravar dentro do .git é bloqueado pelo Termix.';
  if (/^settings(\.local)?\.json$/i.test(path.basename(p)) && lc(path.basename(path.dirname(p))) === '.claude') return 'Os settings do Claude Code do projeto não podem ser alterados pelos agentes do Vibe (podem desligar a trava).';
  return null;
}

function checkShell(cmd, cwd, cfg, depth = 0) {
  if (depth > 3) return null;
  for (let seg of segments(cmd)) {
    // redirecionamentos (> arquivo) primeiro
    for (let k = 0; k < seg.length; k++) if (seg[k] === '>') { const r = checkWritePath(seg[k + 1], cwd, cfg); if (r) return r; }
    seg = seg.filter((t, k) => t !== '>' && t !== '<' && seg[k - 1] !== '>' && seg[k - 1] !== '<');
    while (seg.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(seg[0]) || ['sudo', 'command', 'env', 'time', 'nohup', 'exec', 'xargs', 'call', '&', '.'].includes(lc(seg[0])))) seg = seg.slice(1);
    if (!seg.length) continue;
    const name = lc(path.basename(seg[0].replace(/\\/g, '/'))).replace(/\.(exe|cmd|bat)$/, '');
    const args = seg.slice(1);
    if (['cd', 'pushd', 'set-location', 'sl', 'chdir'].includes(name)) { const a = args.find((x) => !x.startsWith('-')); if (a && !unresolved(a) && a !== '-' && fs.existsSync(resolveP(a, cwd))) cwd = resolveP(a, cwd); continue; } // cd que falha não muda a pasta
    if (['bash', 'sh', 'zsh', 'dash'].includes(name)) { const k = args.findIndex((a) => /^-[a-z]*c$/.test(a)); if (k >= 0 && args[k + 1]) { const r = checkShell(args[k + 1], cwd, cfg, depth + 1); if (r) return r; } continue; }
    if (name === 'cmd') { const k = args.findIndex((a) => /^\/[ck]$/i.test(a)); if (k >= 0) { const r = checkShell(args.slice(k + 1).join(' '), cwd, cfg, depth + 1); if (r) return r; } continue; }
    if (['powershell', 'pwsh'].includes(name)) {
      if (args.some((a) => /^-e(nc(odedcommand)?)?$/i.test(a))) return 'PowerShell com comando codificado é bloqueado pelo Termix (não dá para conferir).';
      const k = args.findIndex((a) => /^-c(ommand)?$/i.test(a));
      const inner = k >= 0 ? args.slice(k + 1).join(' ') : args.filter((a) => !a.startsWith('-')).join(' ');
      if (inner) { const r = checkShell(inner, cwd, cfg, depth + 1); if (r) return r; }
      continue;
    }
    if (['invoke-expression', 'iex', 'eval'].includes(name)) { const r = checkShell(args.join(' '), cwd, cfg, depth + 1); if (r) return r; continue; }
    if (name === 'git') { const r = checkGit(args, cwd, cfg); if (r) return r; continue; }
    if (name === 'gh') {
      const a = args.map(lc).join(' ');
      if (/\bpr merge\b/.test(a)) return 'gh pr merge é bloqueado pelo Termix: o humano decide o que entra na branch principal.';
      if (/\b(repo|release) delete\b/.test(a)) return 'Apagar repositório ou release pelo gh é bloqueado pelo Termix.';
      continue;
    }
    if (RM.includes(name)) { const r = checkRm(name, args, cwd, cfg); if (r) return r; continue; }
    if (name === 'find' && args.some((a) => a === '-delete' || a === '-exec' || a === '-execdir')) { if (args.includes('-delete') || args.some((a) => RM.includes(lc(a)))) return 'find com -delete ou -exec rm é bloqueado pelo Termix (apaga em massa).'; }
    if (name === 'tee') { for (const a of args.filter((x) => !x.startsWith('-'))) { const r = checkWritePath(a, cwd, cfg); if (r) return r; } continue; }
    if (['out-file', 'set-content', 'add-content', 'sc', 'ac', 'new-item', 'ni'].includes(name)) {
      let t = null;
      for (let k = 0; k < args.length; k++) { if (/^-(path|filepath|literalpath)$/i.test(args[k])) { t = args[k + 1]; break; } }
      if (!t) t = args.find((a) => !a.startsWith('-'));
      if (t) { const r = checkWritePath(t, cwd, cfg); if (r) return r; }
      continue;
    }
  }
  return null;
}

function decide(input, cfg) {
  const tool = lc(input && input.tool_name);
  const ti = (input && input.tool_input) || {};
  const cwd = (input && input.cwd) || cfg.projeto || process.cwd();
  if (!cfg || !cfg.projeto) {
    if (SHELL_TOOLS.includes(tool) || WRITE_TOOLS.includes(tool)) return 'A trava do Termix está sem configuração: comando bloqueado por segurança. Avise o humano.';
    return null;
  }
  if (SHELL_TOOLS.includes(tool)) return checkShell(ti.command, cwd, cfg);
  if (WRITE_TOOLS.includes(tool)) return checkWritePath(ti.file_path || ti.notebook_path || ti.path, cwd, cfg);
  return null;
}

module.exports = { decide, segments, isSecret };

if (require.main === module || process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  let raw = '';
  try { raw = fs.readFileSync(0, 'utf8'); } catch { /* sem entrada */ }
  let cfg = null, input = null;
  try { cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); } catch { cfg = null; }
  try { input = JSON.parse(raw); } catch { input = null; }
  let reason = null;
  try { reason = decide(input, cfg || {}); } catch (e) { reason = null; }
  if (reason) {
    const msg = `[Termix · trava do Vibe] ${reason}`;
    try { fs.writeSync(1, JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: msg } })); } catch { /* sem stdout */ }
    try { fs.writeSync(2, msg); } catch { /* sem stderr */ }
    process.exit(2);
  }
  process.exit(0);
}
