'use strict';
/* Módulo Vibe Coding e Mutirão: isolado do núcleo do Termix.
   DEV2-001: casca e canal 'vibe:status'. DEV2-002: tela de entrega do Vibe Coding (recebe, confere e guarda a entrega).
   O main.js só chama create({ ipcMain, dialog, app, getWin, logError }); os handlers 'vibe:*' são registrados aqui,
   cada um com try/catch. Nada aqui escreve em terminal, git, chat, notificação ou na pasta do projeto do usuário:
   tudo fica em <userData>\vibe\<id-do-projeto>\. Desenho: docs/VIBE_MUTIRAO.md. */
const fs = require('fs');
const path = require('path');

// Seções obrigatórias do .md da estrutura (as mesmas do modelo modelo-entrega.md). O título é conferido sem acento,
// sem caixa e sem pontuação; cada seção aceita alguns nomes equivalentes.
const SECTIONS = [
  { key: 'objetivo', label: 'Objetivo', match: (h) => h.startsWith('objetivo') },
  { key: 'publico', label: 'Público e usuários', match: (h) => h.includes('publico') || h.includes('usuario') },
  { key: 'funcionalidades', label: 'Funcionalidades', match: (h) => h.includes('funcionalidade') },
  { key: 'fora', label: 'Fora do escopo', match: (h) => h.includes('fora do escopo') },
  { key: 'telas', label: 'Telas e fluxos', match: (h) => h.includes('tela') || h.includes('fluxo') },
  { key: 'dados', label: 'Dados e regras de negócio', match: (h) => h.includes('dados') || h.includes('regra') },
  { key: 'integracoes', label: 'Integrações e acessos', match: (h) => h.includes('integra') || h.includes('acesso') },
  { key: 'tecnologia', label: 'Tecnologia', match: (h) => h.includes('tecnologia') },
  { key: 'pronto', label: 'Critério de pronto', match: (h) => h.includes('pronto') },
];
const FLOW_EXT = ['png', 'jpg', 'jpeg', 'svg', 'pdf', 'drawio', 'excalidraw', 'md'];
const MAX_FILE = 50 * 1024 * 1024; // 50 MB por arquivo
const LIMITS = { objetivo: 300, criterio: 4000, proibido: 4000, acessos: 4000 };

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const validId = (id) => typeof id === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(id);
const extOf = (p) => path.extname(String(p || '')).slice(1).toLowerCase();

// Confere o .md da estrutura: quais seções faltam e quais estão sem conteúdo (dicas "> ", comentários e linhas vazias não contam).
function checkStructure(text) {
  const lines = String(text).replace(/\r/g, '').split('\n');
  const heads = [];
  let fence = false;
  lines.forEach((l, i) => {
    if (/^\s*(```|~~~)/.test(l)) fence = !fence;
    if (fence) return;
    const m = /^(#{1,3})\s+(.+?)\s*#*\s*$/.exec(l);
    if (m) heads.push({ i, level: m[1].length, h: norm(m[2]) });
  });
  const missing = [], empty = [];
  const used = new Set();
  for (const s of SECTIONS) {
    const idx = heads.findIndex((x, k) => !used.has(k) && s.match(x.h));
    if (idx < 0) { missing.push(s.label); continue; }
    used.add(idx);
    const start = heads[idx].i + 1;
    const nxt = heads.slice(idx + 1).find((x) => x.level <= heads[idx].level);
    const body = lines.slice(start, nxt ? nxt.i : lines.length).join('\n').replace(/<!--[\s\S]*?-->/g, '')
      .split('\n').filter((l) => l.trim() && !/^\s*>/.test(l)).join(' ').trim();
    if (body.replace(/[\s\-*#|_`]/g, '').length < 3) empty.push(s.label);
  }
  return { missing, empty, ok: !missing.length && !empty.length };
}

// Confere um arquivo escolhido. kind: 'fluxo' (desenho) ou 'estrutura' (.md com as seções).
function inspect(kind, file) {
  const r = { kind, path: file, name: path.basename(String(file || '')), ext: extOf(file), ok: false, problems: [] };
  try {
    if (!file || !fs.existsSync(file)) { r.problems.push('O arquivo não foi encontrado. Escolha de novo.'); return r; }
    const st = fs.statSync(file);
    if (!st.isFile()) { r.problems.push('Isso não é um arquivo.'); return r; }
    r.size = st.size;
    if (!st.size) { r.problems.push('O arquivo está vazio.'); return r; }
    if (st.size > MAX_FILE) { r.problems.push('O arquivo passa de 50 MB.'); return r; }
    if (kind === 'fluxo') {
      if (!FLOW_EXT.includes(r.ext)) { r.problems.push('Formato não aceito. Use .png, .jpg, .svg, .pdf, .drawio, .excalidraw ou .md com Mermaid.'); return r; }
      if (r.ext === 'md' && !/^\s*(```|~~~)\s*mermaid\b/im.test(fs.readFileSync(file, 'utf8'))) { r.problems.push('O .md não tem um bloco ```mermaid com o fluxo.'); return r; }
    } else if (kind === 'estrutura') {
      if (r.ext !== 'md') { r.problems.push('A estrutura precisa ser um arquivo .md (use o modelo).'); return r; }
      const c = checkStructure(fs.readFileSync(file, 'utf8'));
      r.missing = c.missing; r.empty = c.empty;
      if (c.missing.length) r.problems.push(`Faltam as seções: ${c.missing.join(', ')}.`);
      if (c.empty.length) r.problems.push(`Seções sem conteúdo: ${c.empty.join(', ')}.`);
      if (!c.ok) return r;
    } else { r.problems.push('Tipo de arquivo desconhecido.'); return r; }
    r.ok = true;
  } catch (e) { r.problems.push('Não foi possível ler o arquivo.'); }
  return r;
}

// Confere os campos de texto da entrega (mesma regra da tela; a tela só mostra, aqui é que vale).
function checkFields(f) {
  const out = [];
  const t = (v) => String(v || '').trim();
  if (!validId(f.projectId)) out.push('Escolha o projeto.');
  if (!t(f.objetivo)) out.push('Escreva o objetivo final do projeto.');
  else if (t(f.objetivo).length > LIMITS.objetivo) out.push(`O objetivo passa de ${LIMITS.objetivo} caracteres.`);
  if (!t(f.criterio)) out.push('Escreva o critério de pronto.');
  if (t(f.criterio).length > LIMITS.criterio || t(f.proibido).length > LIMITS.proibido || t(f.acessos).length > LIMITS.acessos) out.push('Algum texto passou do tamanho máximo.');
  if (!f.nadaFornecer && !t(f.acessos)) out.push('Liste os acessos e dados que o humano precisa fornecer, ou marque "Nada a fornecer".');
  return out;
}

function create(deps = {}) {
  const { ipcMain, dialog, app, getWin, logError = () => {} } = deps;
  const state = { vibe: 'idle', mutirao: 'idle' };
  // Modo de teste: só com a variável TERMIX_VIBE_TEST=1 ao abrir o app. Permite passar o caminho do arquivo sem o
  // diálogo nativo (que o CDP não automatiza). Sem a variável, o caminho vindo da interface é ignorado.
  const TEST = process.env.TERMIX_VIBE_TEST === '1';
  const root = () => path.join(app.getPath('userData'), 'vibe');
  const dirOf = (id) => path.join(root(), id);
  const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
  const writeJson = (f, v) => { fs.mkdirSync(path.dirname(f), { recursive: true }); const tmp = `${f}.tmp`; fs.writeFileSync(tmp, JSON.stringify(v, null, 2)); fs.renameSync(tmp, f); };

  const api = {
    status: () => ({ ...state, test: TEST }),
    sections: () => SECTIONS.map((s) => s.label),

    async template(testPath) {
      let dest = TEST && typeof testPath === 'string' ? testPath : null;
      if (!dest) {
        const r = await dialog.showSaveDialog(getWin(), { title: 'Salvar o modelo da entrega do Vibe Coding', defaultPath: path.join(app.getPath('documents'), 'estrutura-do-projeto.md'), filters: [{ name: 'Markdown', extensions: ['md'] }] });
        if (r.canceled || !r.filePath) return { ok: false, canceled: true };
        dest = r.filePath;
      }
      fs.writeFileSync(dest, fs.readFileSync(path.join(__dirname, 'modelo-entrega.md')));
      return { ok: true, path: dest };
    },

    async pick(kind, testPath) {
      let file = TEST && typeof testPath === 'string' ? testPath : null;
      if (!file) {
        const filters = kind === 'fluxo'
          ? [{ name: 'Fluxo desenhado', extensions: FLOW_EXT }]
          : [{ name: 'Markdown', extensions: ['md'] }];
        const r = await dialog.showOpenDialog(getWin(), { title: kind === 'fluxo' ? 'Escolher o fluxo desenhado do projeto' : 'Escolher o .md da estrutura do projeto', properties: ['openFile'], filters });
        if (r.canceled || !r.filePaths || !r.filePaths[0]) return { canceled: true };
        file = r.filePaths[0];
      }
      return inspect(kind, file);
    },

    check: (kind, file) => inspect(kind, file),

    draftGet: (id) => (validId(id) ? readJson(path.join(dirOf(id), 'rascunho.json')) : null),
    draftSet(id, d) {
      if (!validId(id) || !d || typeof d !== 'object') return false;
      writeJson(path.join(dirOf(id), 'rascunho.json'), { ...d, projectId: id, salvo: new Date().toISOString() });
      return true;
    },

    entregaGet: (id) => (validId(id) ? readJson(path.join(dirOf(id), 'entrega.json')) : null),

    // Grava a entrega pronta. Se já existir e replace não vier true, não toca em nada e avisa.
    // Ao substituir, a entrega anterior é movida para historico\<data>\ (nada é apagado).
    entregaSave(f, replace) {
      f = f || {};
      const problems = checkFields(f);
      const fluxo = inspect('fluxo', f.fluxo), estrutura = inspect('estrutura', f.estrutura);
      if (!fluxo.ok) problems.push(...fluxo.problems.map((p) => `Fluxo: ${p}`));
      if (!estrutura.ok) problems.push(...estrutura.problems.map((p) => `Estrutura: ${p}`));
      if (problems.length) return { ok: false, problems };
      const dir = dirOf(f.projectId);
      const cur = path.join(dir, 'entrega.json');
      if (fs.existsSync(cur)) {
        if (replace !== true) return { ok: false, exists: true, entrega: readJson(cur) };
        const old = readJson(cur) || {};
        const hist = path.join(dir, 'historico', String(old.data || new Date().toISOString()).replace(/[:.]/g, '-'));
        fs.mkdirSync(hist, { recursive: true });
        for (const n of ['entrega.json', old.arquivos && old.arquivos.fluxo, old.arquivos && old.arquivos.estrutura]) {
          if (n && fs.existsSync(path.join(dir, n))) fs.renameSync(path.join(dir, n), path.join(hist, n));
        }
      }
      fs.mkdirSync(dir, { recursive: true });
      const fluxoName = `fluxo.${fluxo.ext}`, estruturaName = 'estrutura.md';
      fs.copyFileSync(fluxo.path, path.join(dir, fluxoName));
      fs.copyFileSync(estrutura.path, path.join(dir, estruturaName));
      const t = (v) => String(v || '').trim();
      const entrega = {
        versao: 1,
        status: 'pronta',
        data: new Date().toISOString(),
        projeto: { id: f.projectId, nome: t(f.projectName), pasta: t(f.projectPath) },
        objetivo: t(f.objetivo),
        criterioDePronto: t(f.criterio),
        naoPodem: t(f.proibido),
        acessos: f.nadaFornecer ? [] : t(f.acessos).split('\n').map((l) => l.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean),
        nadaAFornecer: !!f.nadaFornecer,
        arquivos: { fluxo: fluxoName, estrutura: estruturaName },
        origem: { fluxo: fluxo.path, estrutura: estrutura.path },
      };
      writeJson(cur, entrega);
      return { ok: true, entrega, pasta: dir };
    },
  };

  // Handlers ipc do módulo: um erro aqui é registrado no erros.log e devolve um resultado neutro (o app segue).
  if (ipcMain) {
    const on = (ch, fn, fallback = null) => ipcMain.handle(`vibe:${ch}`, async (_e, ...a) => {
      try { return await fn(...a); } catch (e) { logError(e); return fallback; }
    });
    on('status', api.status);
    on('sections', api.sections, []);
    on('template', api.template, { ok: false, error: true });
    on('pick', api.pick, { ok: false, problems: ['Não foi possível abrir o arquivo.'] });
    on('check', api.check, { ok: false, problems: ['Não foi possível conferir o arquivo.'] });
    on('draftGet', api.draftGet);
    on('draftSet', api.draftSet, false);
    on('entregaGet', api.entregaGet);
    on('entregaSave', api.entregaSave, { ok: false, problems: ['Não foi possível gravar a entrega. Veja o erros.log.'] });
  }
  return api;
}

module.exports = { create, checkStructure, SECTIONS };
