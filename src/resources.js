// Plugins, skills e MCPs de um projeto, como o Claude Code os enxerga (TASK-013).
// Leitura rápida pelos arquivos (skills e MCPs configurados) e leitura pela CLI do Claude Code
// (plugins com custo em tokens e estado real dos MCPs, inclusive os conectores da conta).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

module.exports = function createResources({ findClaude, readJson, cleanEnv, trash, reveal }) {
  const home = os.homedir();
  const same = (a, b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();

  function runClaude(args, cwd, timeout) {
    return new Promise((resolve) => {
      const claude = findClaude();
      if (!claude) return resolve({ ok: false, out: '', err: 'Claude Code não encontrado' });
      const isCmd = claude.toLowerCase().endsWith('.cmd');
      const cmd = isCmd ? 'cmd.exe' : claude;
      const argv = isCmd ? ['/c', claude, ...args] : args;
      execFile(cmd, argv, { cwd: cwd && fs.existsSync(cwd) ? cwd : home, timeout, env: cleanEnv(), windowsHide: true, maxBuffer: 8 * 1024 * 1024 },
        (err, stdout, stderr) => resolve({ ok: !err, out: String(stdout || ''), err: String(stderr || (err && err.message) || '') }));
    });
  }

  // frontmatter simples (name, description), com descrição em várias linhas (> ou |)
  function frontmatter(file) {
    let txt;
    try { txt = fs.readFileSync(file, 'utf8').slice(0, 6000); } catch { return {}; }
    const m = txt.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) return {};
    const lines = m[1].split(/\r?\n/);
    const out = {};
    for (let i = 0; i < lines.length; i++) {
      const k = lines[i].match(/^(name|description):\s*(.*)$/);
      if (!k) continue;
      let v = k[2].trim();
      if (/^[>|][+-]?$/.test(v)) {
        v = '';
        while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) v += (v ? ' ' : '') + lines[++i].trim();
      }
      out[k[1]] = v.replace(/^(["'])([\s\S]*)\1$/, '$2');
    }
    return out;
  }

  function skillsIn(root, scope, origin, off) {
    const out = [];
    let dirs = [];
    try { dirs = fs.readdirSync(path.join(root, 'skills'), { withFileTypes: true }).filter((d) => d.isDirectory()); } catch { /* sem skills */ }
    for (const d of dirs) {
      const file = path.join(root, 'skills', d.name, 'SKILL.md');
      if (!fs.existsSync(file)) continue;
      const fm = frontmatter(file);
      out.push({ name: fm.name || d.name, desc: fm.description || '', kind: 'skill', scope, origin, off, file });
    }
    let cmds = [];
    try { cmds = fs.readdirSync(path.join(root, 'commands'), { withFileTypes: true }).filter((f) => f.isFile() && f.name.toLowerCase().endsWith('.md')); } catch { /* sem comandos */ }
    for (const f of cmds) {
      const file = path.join(root, 'commands', f.name);
      const fm = frontmatter(file);
      out.push({ name: f.name.slice(0, -3), desc: fm.description || '', kind: 'comando', scope, origin, off, file });
    }
    return out;
  }

  // plugin ligado? o escopo mais específico define (Local > Projeto > Usuário)
  function pluginOn(id, projectPath) {
    let on = null;
    const files = [path.join(home, '.claude', 'settings.json')];
    if (projectPath) files.push(path.join(projectPath, '.claude', 'settings.json'), path.join(projectPath, '.claude', 'settings.local.json'));
    for (const f of files) {
      const ep = (readJson(f) || {}).enabledPlugins;
      if (ep && typeof ep[id] === 'boolean') on = ep[id];
    }
    return on;
  }

  function installedPlugins(projectPath) {
    const j = readJson(path.join(home, '.claude', 'plugins', 'installed_plugins.json'));
    const list = [];
    for (const [id, entries] of Object.entries((j && j.plugins) || {})) {
      const e = (entries || []).find((x) => (x.scope !== 'project' && x.scope !== 'local') || (x.projectPath && projectPath && same(x.projectPath, projectPath)));
      if (e && e.installPath) list.push({ id, installPath: e.installPath, version: e.version });
    }
    return list;
  }

  function mcpConfig(servers, scope, origin, out) {
    for (const [name, c] of Object.entries(servers || {})) {
      const type = c.type || (c.url ? 'http' : 'stdio');
      const target = c.url || [c.command].concat(c.args || []).filter(Boolean).join(' ');
      out.push({ name, scope, origin, type, target });
    }
  }

  // leitura rápida, só de arquivos
  function scanFiles(projectPath) {
    const skills = [];
    const mcps = [];
    skills.push(...skillsIn(path.join(home, '.claude'), 'Usuário', ''));
    if (projectPath) skills.push(...skillsIn(path.join(projectPath, '.claude'), 'Projeto', ''));
    for (const pl of installedPlugins(projectPath)) {
      const on = pluginOn(pl.id, projectPath);
      skills.push(...skillsIn(pl.installPath, 'Plugin', pl.id, on === false));
      const mj = readJson(path.join(pl.installPath, '.mcp.json'));
      mcpConfig((mj && (mj.mcpServers || mj)) || {}, 'Plugin', pl.id, mcps);
    }
    const cj = readJson(path.join(home, '.claude.json'));
    if (cj) {
      mcpConfig(cj.mcpServers, 'Usuário', '', mcps);
      const key = projectPath && Object.keys(cj.projects || {}).find((k) => same(k, projectPath));
      if (key) mcpConfig(cj.projects[key].mcpServers, 'Local', '', mcps);
    }
    if (projectPath) {
      const mj = readJson(path.join(projectPath, '.mcp.json'));
      mcpConfig(mj && mj.mcpServers, 'Projeto', '', mcps);
    }
    for (const n of ((cj && cj.claudeAiMcpEverConnected) || [])) {
      if (!mcps.some((m) => m.name === n)) mcps.push({ name: n, scope: 'Conta', origin: '', type: 'http', target: '' });
    }
    let disabled = [];
    const entry = projectPath && cj && Object.keys(cj.projects || {}).find((k) => same(k, projectPath) || (() => { try { return same(k, fs.realpathSync.native(path.resolve(projectPath))); } catch { return false; } })());
    if (entry) {
      const e = cj.projects[entry];
      disabled = (e.disabledMcpServers || []).concat(e.disabledMcpjsonServers || []);
    }
    return { skills, mcps, disabledMcps: disabled };
  }

  // "~1.553 tok" (milhar com ponto) ou "~4.6k"
  function tokens(s) {
    const m = String(s || '').match(/~?\s*([\d.,]+)\s*(k?)/i);
    if (!m) return null;
    if (m[2]) return Math.round(parseFloat(m[1].replace(',', '.')) * 1000);
    return parseInt(m[1].replace(/[.,]/g, ''), 10);
  }

  const detailsCache = new Map(); // id@versão -> inventário
  async function details(id, version, cwd) {
    const key = id + '@' + version;
    if (detailsCache.has(key)) return detailsCache.get(key);
    const r = await runClaude(['plugin', 'details', id], cwd, 20000);
    if (!r.ok && !r.out) return {};
    const d = { skills: [], agents: 0, hooks: [], mcps: [], desc: '', alwaysOn: null, perItem: {} };
    let mode = '';
    for (const raw of r.out.split(/\r?\n/)) {
      const line = raw.replace(/\s+$/, '');
      let m;
      if ((m = line.match(/^\s*Description:\s*(.*)$/))) d.desc = m[1];
      else if ((m = line.match(/^\s*Skills \((\d+)\)\s*(.*)$/))) d.skills = m[2] ? m[2].split(/,\s*/) : [];
      else if ((m = line.match(/^\s*Agents \((\d+)\)/))) d.agents = +m[1];
      else if ((m = line.match(/^\s*Hooks \((\d+)\)\s*(.*?)(\s{2,}\(.*\))?$/))) d.hooks = m[2] ? m[2].split(/,\s*/) : [];
      else if ((m = line.match(/^\s*MCP servers \((\d+)\)\s*(.*)$/))) d.mcps = m[2] ? m[2].split(/,\s*/) : [];
      else if ((m = line.match(/^\s*Always-on:\s*(.*?)\s+added/))) d.alwaysOn = tokens(m[1]);
      else if (/^Per-component/.test(line)) mode = 'per';
      else if (mode === 'per' && (m = line.match(/^\s+(\S+)\s+(~\S+(?: tok)?)\s+(~\S+(?: tok)?)\s*$/)) && m[1] !== 'component') d.perItem[m[1]] = { always: tokens(m[2]), invoke: tokens(m[3]) };
    }
    detailsCache.set(key, d);
    return d;
  }

  async function scanPlugins(projectPath) {
    const r = await runClaude(['plugin', 'list', '--json'], projectPath, 30000);
    let list;
    try { list = JSON.parse(r.out); } catch { return { error: r.err || 'Não consegui ler a lista de plugins.', plugins: [] }; }
    const plugins = await Promise.all(list.map(async (p) => {
      const d = await details(p.id, p.version, projectPath);
      const [name, marketplace] = p.id.split('@');
      return {
        id: p.id, name, marketplace: marketplace || '', version: p.version, scope: p.scope, enabled: p.enabled !== false,
        projectEnabled: !!p.projectEnabled, notes: p.notes || [], installPath: p.installPath,
        desc: d.desc || '', skills: d.skills || [], agents: d.agents || 0, hooks: d.hooks || [], mcps: d.mcps || [], alwaysOn: d.alwaysOn,
      };
    }));
    return { plugins };
  }

  // estado real dos MCPs (a checagem de saúde leva alguns segundos)
  async function scanMcpStatus(projectPath) {
    const r = await runClaude(['mcp', 'list'], projectPath, 90000);
    if (!r.ok && !r.out) return { error: r.err || 'Não consegui consultar os MCPs.', items: [] };
    const items = [];
    for (const raw of r.out.split(/\r?\n/)) {
      const m = raw.match(/^(.+?): (.*) - ([✔!✘⏸⊘].*)$/);
      if (!m) continue;
      const st = m[3];
      let kind = 'warn'; let label = st.replace(/^[✔!✘⏸⊘]\s*/, '');
      if (/^✔/.test(st)) { kind = 'ok'; label = 'Conectado'; }
      else if (/needs auth/i.test(st)) label = 'Precisa de login';
      else if (/^✘/.test(st)) { kind = 'bad'; label = 'Falhou ao conectar'; }
      else if (/^⏸/.test(st)) label = 'Aguardando aprovação';
      else if (/^⊘/.test(st)) { kind = 'off'; label = 'Desligado neste projeto'; }
      items.push({ name: m[1], target: m[2], kind, label, detail: /^✘/.test(st) ? st.replace(/^✘\s*/, '') : '' });
    }
    return { items };
  }


  /* ---------- ações (etapas 2 e 3) ---------- */
  const SCOPE_FLAG = { 'Usuário': 'user', 'Projeto': 'project', 'Local': 'local' };
  const ID_RE = /^[A-Za-z0-9][\w.-]{0,80}(@[A-Za-z0-9][\w.-]{0,80})?$/;
  const NAME_RE = /^[A-Za-z0-9][\w.-]{0,63}$/;
  const stripAnsi = (s) => String(s || '').replace(/\u001b\[[0-9;]*[A-Za-z]/g, '').trim();

  function parseJsonLine(out) {
    for (const l of String(out || '').split(/\r?\n/).reverse()) {
      try { const j = JSON.parse(l); if (j && typeof j === 'object') return j; } catch { /* não é a linha de resultado */ }
    }
    return null;
  }
  // resultado padrão de uma ação da CLI
  function result(r, okMsg) {
    const j = parseJsonLine(r.out);
    const failed = !r.ok || (j && j.outcome && j.outcome !== 'ok');
    const msg = stripAnsi((j && (j.message || j.error)) || (failed ? (r.err || r.out) : r.out) || okMsg || '').split(/\r?\n/).filter(Boolean).slice(-3).join(' ').replace(/\s*File modified:.*$/, '');
    return { ok: !failed, message: msg || (failed ? 'Não deu certo.' : okMsg || 'Feito.') };
  }

  async function pluginAction({ action, id, scope, projectPath }) {
    if (!['enable', 'disable', 'update', 'uninstall'].includes(action) || !ID_RE.test(id || '')) return { ok: false, message: 'Pedido inválido.' };
    const args = ['plugin', action, id];
    if (['user', 'project', 'local'].includes(scope) && action !== 'update') args.push('--scope', scope);
    args.push('--json');
    const r = await runClaude(args, projectPath, 120000);
    if (action === 'update' || action === 'uninstall') detailsCache.clear();
    const res = result(r, 'Feito.');
    if (res.ok && action !== 'update') {
      const where = scope === 'local' ? ' neste projeto' : scope === 'user' ? ' para todos os projetos' : scope === 'project' ? ' no projeto (compartilhado)' : '';
      res.message = { enable: `Plugin ${plShort(id)} ligado${where}.`, disable: `Plugin ${plShort(id)} desligado${where}.`, uninstall: `Plugin ${plShort(id)} removido.` }[action];
    }
    return res;
  }

  async function pluginInstall({ id, scope, projectPath }) {
    if (!ID_RE.test(id || '')) return { ok: false, message: 'Informe o plugin como nome@marketplace.' };
    const sc = ['user', 'project', 'local'].includes(scope) ? scope : 'user';
    const r = await runClaude(['plugin', 'install', id, '--scope', sc, '--json'], projectPath, 180000);
    const res = result(r, 'Plugin instalado.');
    if (res.ok) res.message = `Plugin ${id} instalado.`;
    return res;
  }

  async function pluginsAvailable(projectPath) {
    const r = await runClaude(['plugin', 'list', '--available', '--json'], projectPath, 60000);
    try {
      const j = JSON.parse(r.out);
      const list = Array.isArray(j) ? j : (j.available || []);
      return { items: list.map((x) => ({ id: x.id || x.pluginId || '', name: x.name || String(x.id || '').split('@')[0], desc: String(x.description || x.desc || '').slice(0, 200), marketplace: x.marketplaceName || x.marketplace || String(x.id || '').split('@')[1] || '' })).filter((x) => x.id) };
    } catch { return { items: [], error: 'Não consegui ler a lista de plugins disponíveis.' }; }
  }

  // liga ou desliga todos os plugins neste projeto (escopo local: só vale aqui, não vai para o git)
  async function pluginsBulk({ enable, projectPath }) {
    const r = await runClaude(['plugin', 'list', '--json'], projectPath, 30000);
    let list = [];
    try { list = JSON.parse(r.out); } catch { return { ok: false, message: 'Não consegui ler a lista de plugins.' }; }
    const todo = list.filter((p) => (p.enabled !== false) !== enable);
    let done = 0; const fail = [];
    for (const p of todo) { // um por vez: todos regravam o mesmo settings.local.json e em paralelo uma mudança apaga a outra
      const x = await runClaude(['plugin', enable ? 'enable' : 'disable', p.id, '--scope', 'local', '--json'], projectPath, 60000);
      if (result(x).ok) done++; else fail.push(plShort(p.id));
    }
    return { ok: !fail.length, done, failed: fail, message: `${done} plugin${done === 1 ? '' : 's'} ${enable ? 'ligado' : 'desligado'}${done === 1 ? '' : 's'} neste projeto${fail.length ? `; não consegui: ${fail.join(', ')}` : ''}.` };
  }
  const plShort = (id) => String(id || '').split('@')[0];

  async function mcpAdd({ name, type, url, command, args, env, headers, scope, projectPath }) {
    if (!NAME_RE.test(name || '')) return { ok: false, message: 'Nome inválido: use letras, números, ponto, hífen ou sublinhado.' };
    const sc = ['user', 'local', 'project'].includes(scope) ? scope : 'local';
    let cfg;
    if (type === 'http' || type === 'sse') {
      if (!/^https?:\/\/\S+$/i.test(url || '')) return { ok: false, message: 'Informe um endereço http(s) válido.' };
      cfg = { type, url };
      if (headers && Object.keys(headers).length) cfg.headers = headers;
    } else {
      if (!String(command || '').trim()) return { ok: false, message: 'Informe o comando.' };
      cfg = { type: 'stdio', command: String(command).trim(), args: Array.isArray(args) ? args : [] };
      if (env && Object.keys(env).length) cfg.env = env;
    }
    const r = await runClaude(['mcp', 'add-json', name, JSON.stringify(cfg), '--scope', sc], projectPath, 60000);
    const res = result(r, 'MCP adicionado.');
    if (res.ok) res.message = `MCP ${name} adicionado.`;
    return res;
  }
  async function mcpRemove({ name, scope, projectPath }) {
    const sc = SCOPE_FLAG[scope];
    if (!name || !sc) return { ok: false, message: 'Só dá para remover MCPs de usuário, projeto ou local.' };
    const res = result(await runClaude(['mcp', 'remove', name, '--scope', sc], projectPath, 60000), 'MCP removido.');
    if (res.ok) res.message = `MCP ${name} removido.`;
    return res;
  }
  async function mcpAuth({ action, name, projectPath }) {
    if (!name || !['login', 'logout'].includes(action)) return { ok: false, message: 'Pedido inválido.' };
    // o login abre o navegador e espera a pessoa concluir
    return result(await runClaude(['mcp', action, name], projectPath, action === 'login' ? 300000 : 60000), action === 'login' ? 'Login concluído.' : 'Sessão encerrada.');
  }

  /* Ligar/desligar MCP e conector POR PROJETO: a CLI não tem comando para isso, então o app grava só o campo
     disabledMcpServers (e o par enabled/disabledMcpjsonServers, para o .mcp.json) da entrada do projeto no ~/.claude.json —
     o mesmo que o /mcp do terminal grava. Escrita atômica, com backup diário, e relida para conferir. */
  const CJ = () => path.join(home, '.claude.json');
  function claudeJsonEdit(mutate) {
    const f = CJ();
    let j;
    try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { throw new Error('Não consegui ler o .claude.json; nada foi alterado.'); }
    try {
      const bak = f + '.termix-backup';
      if (!fs.existsSync(bak) || Date.now() - fs.statSync(bak).mtimeMs > 24 * 3600 * 1000) fs.copyFileSync(f, bak);
    } catch { /* sem backup: segue, a escrita é atômica */ }
    mutate(j);
    const tmp = f + '.tmp-termix';
    fs.writeFileSync(tmp, JSON.stringify(j, null, 2));
    for (let i = 0; ; i++) {
      try { fs.renameSync(tmp, f); break; } catch (e) { if (i >= 4) { try { fs.unlinkSync(tmp); } catch { /* ok */ } throw e; } Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 120); }
    }
  }
  function projectEntry(j, projectPath, create) {
    j.projects = j.projects || {};
    const real = (() => { try { return fs.realpathSync.native(path.resolve(projectPath)); } catch { return path.resolve(projectPath); } })();
    let key = Object.keys(j.projects).find((k) => same(k, real));
    if (!key && create) {
      key = real.split('\\').join('/');
      j.projects[key] = { allowedTools: [], mcpServers: {}, enabledMcpjsonServers: [], disabledMcpjsonServers: [], hasTrustDialogAccepted: false };
    }
    return key ? j.projects[key] : null;
  }
  const uniq = (a) => Array.from(new Set(a));
  function setMcpDisabled({ items, disabled, projectPath }) {
    if (!projectPath || !Array.isArray(items)) return { ok: false, message: 'Pedido inválido.' };
    try {
      claudeJsonEdit((j) => {
        const e = projectEntry(j, projectPath, true);
        for (const it of items) {
          if (!it || typeof it.name !== 'string') continue;
          if (it.scope === 'Projeto') { // servidor do .mcp.json: lista própria
            e.disabledMcpjsonServers = uniq((e.disabledMcpjsonServers || []).filter((n) => n !== it.name).concat(disabled ? [it.name] : []));
            e.enabledMcpjsonServers = uniq((e.enabledMcpjsonServers || []).filter((n) => n !== it.name).concat(disabled ? [] : [it.name]));
          } else {
            e.disabledMcpServers = uniq((e.disabledMcpServers || []).filter((n) => n !== it.name).concat(disabled ? [it.name] : []));
          }
        }
      });
      const e = projectEntry(JSON.parse(fs.readFileSync(CJ(), 'utf8')), projectPath, false) || {};
      const ok = items.every((it) => it.scope === 'Projeto' ? (e.disabledMcpjsonServers || []).includes(it.name) === !!disabled : (e.disabledMcpServers || []).includes(it.name) === !!disabled);
      return ok ? { ok: true, message: disabled ? 'Desligado neste projeto.' : 'Ligado neste projeto.' } : { ok: false, message: 'A mudança não ficou gravada (o Claude Code pode ter reescrito o arquivo). Tente de novo.' };
    } catch (e) { return { ok: false, message: String(e.message || e) }; }
  }
  // todos os MCPs e conectores conhecidos neste projeto (nomes), para ligar/desligar em bloco
  async function allMcpItems(projectPath) {
    const files = scanFiles(projectPath);
    const st = await scanMcpStatus(projectPath);
    const map = new Map();
    for (const m of files.mcps) if (m.scope !== 'Plugin') map.set(m.name, { name: m.name, scope: m.scope });
    for (const it of st.items) if (!/^plugin:/.test(it.name) && !map.has(it.name)) map.set(it.name, { name: it.name, scope: /^claude\.ai /.test(it.name) ? 'Conta' : 'Usuário' });
    return Array.from(map.values());
  }
  async function mcpBulk({ disabled, projectPath }) {
    const items = disabled ? await allMcpItems(projectPath) : [];
    if (!disabled) {
      try {
        claudeJsonEdit((j) => { const e = projectEntry(j, projectPath, false); if (e) { e.disabledMcpServers = []; e.disabledMcpjsonServers = []; } });
        return { ok: true, count: 0, message: 'Todos os MCPs e conectores ligados neste projeto.' };
      } catch (e) { return { ok: false, message: String(e.message || e) }; }
    }
    const r = setMcpDisabled({ items, disabled: true, projectPath });
    return { ...r, count: items.length, message: r.ok ? `${items.length} MCP${items.length === 1 ? '' : 's'} e conectores desligados neste projeto.` : r.message };
  }

  // projeto limpo: nenhum plugin, MCP ou conector automático (as skills e comandos de usuário não têm como ser desligados por projeto)
  async function cleanProject({ projectPath }) {
    const [pl, mc] = await Promise.all([pluginsBulk({ enable: false, projectPath }), mcpBulk({ disabled: true, projectPath })]);
    const userSkills = scanFiles(projectPath).skills.filter((s) => s.scope === 'Usuário').length;
    return { ok: pl.ok && mc.ok, plugins: pl.done || 0, mcps: mc.count || 0, userSkills, message: [pl.message, mc.message].join(' ') };
  }

  /* ---------- skills e comandos de usuário e de projeto (arquivos do próprio usuário) ---------- */
  function skillFile(scope, kind, name, projectPath) {
    if (!NAME_RE.test(name || '')) return null;
    const root = scope === 'Usuário' ? path.join(home, '.claude') : scope === 'Projeto' && projectPath ? path.join(projectPath, '.claude') : null;
    if (!root) return null;
    return kind === 'comando'
      ? { file: path.join(root, 'commands', name + '.md'), target: path.join(root, 'commands', name + '.md') }
      : { file: path.join(root, 'skills', name, 'SKILL.md'), target: path.join(root, 'skills', name) };
  }
  async function skillOp({ op, scope, kind, name, desc, text, projectPath }) {
    const f = skillFile(scope, kind, name, projectPath);
    if (!f) return { ok: false, message: 'Só dá para mexer em skills e comandos de usuário ou de projeto (nome com letras, números, ponto, hífen ou sublinhado).' };
    if (op === 'read') { try { return { ok: true, text: fs.readFileSync(f.file, 'utf8') }; } catch { return { ok: false, message: 'Não consegui ler o arquivo.' }; } }
    if (op === 'create') {
      if (fs.existsSync(f.target)) return { ok: false, message: 'Já existe uma com esse nome.' };
      const d = String(desc || '').replace(/\r?\n/g, ' ').trim() || 'Descreva quando usar.';
      const body = kind === 'comando'
        ? `---\ndescription: ${d}\n---\n\nEscreva aqui o que o comando deve fazer.\n`
        : `---\nname: ${name}\ndescription: ${d}\n---\n\n# ${name}\n\nEscreva aqui as instruções da skill.\n`;
      fs.mkdirSync(path.dirname(f.file), { recursive: true });
      fs.writeFileSync(f.file, body, 'utf8');
      return { ok: true, message: 'Criada.', file: f.file };
    }
    if (op === 'write') {
      if (!fs.existsSync(f.file)) return { ok: false, message: 'O arquivo não existe mais.' };
      fs.writeFileSync(f.file, String(text == null ? '' : text), 'utf8');
      return { ok: true, message: 'Salva.' };
    }
    if (op === 'delete') {
      if (!fs.existsSync(f.target)) return { ok: false, message: 'Já não existe.' };
      try { await trash(f.target); return { ok: true, message: 'Enviada para a lixeira.' }; } catch (e) { return { ok: false, message: String(e.message || e) }; }
    }
    if (op === 'reveal') { reveal(f.file); return { ok: true }; }
    return { ok: false, message: 'Pedido inválido.' };
  }

  const OPS = { pluginAction, pluginInstall, pluginsAvailable, pluginsBulk, mcpAdd, mcpRemove, mcpAuth, mcpDisabled: async (a) => setMcpDisabled(a), mcpBulk, cleanProject, skillOp };
  async function run(op, args) {
    if (!Object.prototype.hasOwnProperty.call(OPS, op)) return { ok: false, message: 'Operação desconhecida.' };
    try { return await OPS[op](args || {}); } catch (e) { return { ok: false, message: String(e.message || e) }; }
  }

  return { scanFiles, scanPlugins, scanMcpStatus, run };
};
