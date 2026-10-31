// Plugins, skills e MCPs de um projeto, como o Claude Code os enxerga (TASK-013).
// Leitura rápida pelos arquivos (skills e MCPs configurados) e leitura pela CLI do Claude Code
// (plugins com custo em tokens e estado real dos MCPs, inclusive os conectores da conta).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

module.exports = function createResources({ findClaude, readJson, cleanEnv }) {
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
    return { skills, mcps };
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
      const m = raw.match(/^(.+?): (.*) - ([✔!✘⏸].*)$/);
      if (!m) continue;
      const st = m[3];
      let kind = 'warn'; let label = st.replace(/^[✔!✘⏸]\s*/, '');
      if (/^✔/.test(st)) { kind = 'ok'; label = 'Conectado'; }
      else if (/needs auth/i.test(st)) label = 'Precisa de login';
      else if (/^✘/.test(st)) { kind = 'bad'; label = 'Falhou ao conectar'; }
      else if (/^⏸/.test(st)) label = 'Aguardando aprovação';
      items.push({ name: m[1], target: m[2], kind, label, detail: /^✘/.test(st) ? st.replace(/^✘\s*/, '') : '' });
    }
    return { items };
  }

  return { scanFiles, scanPlugins, scanMcpStatus };
};
