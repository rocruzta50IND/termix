'use strict';
/* Módulo Vibe Coding e Mutirão: isolado do núcleo do Termix.
   DEV2-001: casca e canal 'vibe:status'. DEV2-002: tela de entrega do Vibe Coding (recebe, confere e guarda a entrega).
   DEV2-003: arquivos do ciclo (estado, plano, perguntas, respostas) e o texto dos pedidos ao orquestrador.
   O main.js só chama create({ ipcMain, dialog, app, getWin, logError }); os handlers 'vibe:*' são registrados aqui,
   cada um com try/catch. Nada aqui escreve em terminal, git, chat, notificação ou na pasta do projeto do usuário:
   tudo fica em <userData>\vibe\<id-do-projeto>\ (quem cria as abas e digita os pedidos é a interface, src/renderer/vibe).
   Desenho: docs/VIBE_MUTIRAO.md. */
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

// Arquivos de um ciclo (DEV2-003). Ao iniciar um ciclo novo, os do anterior vão para o histórico.
const CYCLE_FILES = ['estado.json', 'plano.md', 'perguntas.json', 'respostas.json'];

// Branch onde os agentes podem fazer commit e push. Projeto com fluxo Rocruzta (.claude/fluxo.json): a branch do papel,
// lida do CLAUDE.local.md. Sem fluxo: uma branch própria vibe/<projeto>, criada a partir da atual.
function branchOf(pasta) {
  try {
    if (pasta && fs.existsSync(path.join(pasta, '.claude', 'fluxo.json'))) {
      let b = '';
      try { const m = /^\s*branch_padrao:\s*"?([\w./-]+)"?/m.exec(fs.readFileSync(path.join(pasta, 'CLAUDE.local.md'), 'utf8')); b = m ? m[1] : ''; } catch { /* sem CLAUDE.local.md */ }
      return b ? { nome: b, regra: `só na branch "${b}" (a do papel no CLAUDE.local.md)` } : { nome: '', regra: 'só na branch do papel definida no CLAUDE.local.md (sem ela, não faça commit)' };
    }
  } catch { /* segue a regra sem fluxo */ }
  const s = norm(path.basename(String(pasta || 'projeto'))).replace(/ /g, '-') || 'projeto';
  return { nome: `vibe/${s}`, regra: `só numa branch própria "vibe/${s}", criada a partir da atual` };
}
// Linhas do plano que mandam fazer commit/push na main/master (sem negação na mesma linha). Conferência do Termix, sem tokens.
const mainCommitLines = (text) => String(text).split('\n').filter((l) => /\b(commit|push)\w*\b[^\n]{0,30}?\b(em|na|no|para|on|to|into)\s+[`"'*]*(origin\/)?(main|master)\b/i.test(l) && !/\b(nunca|n[aã]o|sem|never|proibid\w*)\b[^\n]{0,25}\b(main|master)\b/i.test(l));

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

    /* ---------- ciclo (DEV2-003): agentes, plano e perguntas ----------
       Quem conduz e espera é a interface do Termix (código, zero token); aqui só ficam os arquivos e os textos dos pedidos. */
    cicloGet(id) {
      if (!validId(id)) return null;
      return { estado: readJson(path.join(dirOf(id), 'estado.json')), pasta: dirOf(id) };
    },
    cicloSet(id, est) {
      if (!validId(id) || !est || typeof est !== 'object' || JSON.stringify(est).length > 20000) return false;
      writeJson(path.join(dirOf(id), 'estado.json'), { ...est, projectId: id, atualizado: new Date().toISOString() });
      return true;
    },
    // Novo ciclo: os arquivos do ciclo anterior vão para historico\ciclo-<data>\ (nada é apagado).
    cicloNovo(id) {
      if (!validId(id)) return false;
      const dir = dirOf(id);
      const names = CYCLE_FILES.filter((n) => fs.existsSync(path.join(dir, n)));
      if (!names.length) return true;
      const old = readJson(path.join(dir, 'estado.json')) || {};
      const hist = path.join(dir, 'historico', `ciclo-${String(old.iniciado || new Date().toISOString()).replace(/[:.]/g, '-')}`);
      fs.mkdirSync(hist, { recursive: true });
      for (const n of names) fs.renameSync(path.join(dir, n), path.join(hist, n));
      return true;
    },
    // Texto curto que o Termix digita no terminal do orquestrador. kind: 'plano' (primeiro pedido) ou 'fechar' (depois das respostas).
    cicloPrompt(id, kind) {
      if (!validId(id)) return null;
      const e = readJson(path.join(dirOf(id), 'entrega.json'));
      if (!e) return null;
      const d = dirOf(id);
      const br = branchOf(e.projeto && e.projeto.pasta);
      if (kind === 'fechar') {
        return `Respostas do humano em ${path.join(d, 'respostas.json')}. Atualize ${path.join(d, 'plano.md')} com elas e regrave ${path.join(d, 'perguntas.json')} com a lista vazia, a menos que reste algo realmente indispensável. Mesmas regras de antes: só planejar, não mexer no código, não escrever fora de ${d}. Ao terminar, responda apenas PLANO FECHADO e encerre o turno.`;
      }
      return `Você é o ORQUESTRADOR do Vibe Coding do Termix neste projeto. Nesta etapa só PLANEJE: não altere o código do projeto, não instale nada, não faça commit. A entrega do humano está em ${d}: entrega.json (objetivo, critério de pronto, o que não fazer, acessos), estrutura.md e ${e.arquivos && e.arquivos.fluxo || 'o fluxo desenhado'}. Leia só o necessário. Grave nessa mesma pasta: 1) plano.md com as tarefas até o fim do projeto, na ordem, cada uma com o título no formato "## T1 — título" (T e o número) e os itens Objetivo, Critério de pronto, Arquivos prováveis, Validação e Não fazer; 2) perguntas.json no formato {"perguntas":[{"id":"p1","texto":"...","porque":"...","opcoes":["..."]}]}, só com o que for indispensável e não estiver na entrega; grave o arquivo sempre, com {"perguntas":[]} se nada faltar ("opcoes" é opcional). Comece o plano.md com a linha "Branch de trabalho: ${br.nome || 'a do papel no CLAUDE.local.md'}". Regras do projeto, para valer no plano: commit e push ${br.regra}, nunca na main/master, nem como tarefa do plano; nada que apague dados (sem reset --hard, clean -f, force push, apagar pastas do usuário); economia de tokens (quem espera e controla o ciclo é o Termix, prompts curtos que apontam para arquivos, /clear entre tarefas, o orquestrador lê resumos e não diffs inteiros); avisar o humano só para deploy e o indispensável. Não escreva fora de ${d}. Ao terminar, responda apenas PLANO GRAVADO e encerre o turno.`;
    },
    // Lê o que o orquestrador gravou: plano.md (texto e nº de tarefas) e perguntas.json (lista normalizada).
    planoLer(id) {
      if (!validId(id)) return null;
      const d = dirOf(id);
      const out = { plano: { ok: false }, perguntas: { ok: false, lista: [] }, respostas: readJson(path.join(d, 'respostas.json')) };
      const pf = path.join(d, 'plano.md');
      if (fs.existsSync(pf)) {
        const st = fs.statSync(pf);
        const text = fs.readFileSync(pf, 'utf8').replace(/^﻿/, '');
        // tarefas = IDs T1, T2... distintos no início de um título ou item de lista ("## T1 — ...", "1. **T1 — ...**", "- T1: ...").
        // Sem IDs, o número fica desconhecido (null): melhor não mostrar do que contar seções como tarefas.
        const ids = new Set([...text.matchAll(/^[ \t]*(?:#{1,4}[ \t]*|\d+[.)][ \t]*|[-*][ \t]+)?(?:\*\*|__)?T(\d+)\b/gm)].map((m) => m[1]));
        const n = ids.size || null;
        out.plano = { ok: text.trim().length > 0, text: text.slice(0, 200000), tarefas: n, mtime: st.mtimeMs, mainCommit: mainCommitLines(text).slice(0, 3) };
      }
      const qf = path.join(d, 'perguntas.json');
      if (!fs.existsSync(qf)) out.perguntas.ausente = true; // a interface decide: com um plano novo, vale como "sem perguntas"
      else {
        try {
          const raw = fs.readFileSync(qf, 'utf8').replace(/^﻿/, '').replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, '');
          const j = JSON.parse(raw);
          const arr = Array.isArray(j) ? j : Array.isArray(j && j.perguntas) ? j.perguntas : null;
          if (!arr) throw new Error('formato');
          out.perguntas = { ok: true, mtime: fs.statSync(qf).mtimeMs, lista: arr.slice(0, 30).map((q, i) => ({
            id: String((q && q.id) || `p${i + 1}`).slice(0, 40),
            texto: String((q && (q.texto || q.pergunta || q.text)) || '').slice(0, 1000),
            porque: String((q && (q.porque || q.motivo || q.why)) || '').slice(0, 1000),
            opcoes: Array.isArray(q && q.opcoes) ? q.opcoes.slice(0, 12).map((o) => String(o).slice(0, 300)) : [],
          })).filter((q) => q.texto.trim()) };
        } catch { out.perguntas = { ok: false, lista: [], erro: 'O perguntas.json não está no formato esperado.' }; }
      }
      return out;
    },
    respostasSave(id, r) {
      if (!validId(id) || !r || !Array.isArray(r.respostas) || JSON.stringify(r).length > 100000) return false;
      writeJson(path.join(dirOf(id), 'respostas.json'), { rodada: r.rodada || 1, data: new Date().toISOString(), respostas: r.respostas });
      return true;
    },
    // Só no modo de teste: grava um perguntas.json de teste para conferir o formulário sem gastar tokens.
    testPerguntas(id, lista) {
      if (!TEST || !validId(id) || !Array.isArray(lista)) return false;
      writeJson(path.join(dirOf(id), 'perguntas.json'), { perguntas: lista });
      return true;
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
    on('cicloGet', api.cicloGet);
    on('cicloSet', api.cicloSet, false);
    on('cicloNovo', api.cicloNovo, false);
    on('cicloPrompt', api.cicloPrompt);
    on('planoLer', api.planoLer);
    on('respostasSave', api.respostasSave, false);
    on('testPerguntas', api.testPerguntas, false);
  }
  return api;
}

module.exports = { create, checkStructure, SECTIONS };
