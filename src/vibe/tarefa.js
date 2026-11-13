'use strict';
/* Vibe de tarefa (DEV2-017): o modo rápido do Vibe Coding para um projeto em andamento.
   Decisão do Ygor: o formulário completo de entrega fica só para projeto do zero. Num projeto em andamento, o humano
   descreve a tarefa (o que fazer, critério de pronto, o que não pode e os arquivos ou telas envolvidos) e o Termix monta
   uma entrega sintética (como a do Mutirão), com um resumo do projeto lido SEM IA: primeiras linhas do README e do
   CLAUDE.md, papel do fluxo, branch, últimos commits e a tarefa em andamento do TASKS. Daí em diante o ciclo é o mesmo
   do Vibe (plano, Antes de iniciar, execução, recuperação, deploy e fim de ciclo de DEV2..DEV5).
   Histórico: vibe\<id>\tarefas.json guarda as tarefas uma depois da outra (a atual e as anteriores, com o que foi feito e
   as pendências). Uma tarefa nova não apaga a anterior: a entrega vai para historico\<data>\ e o ciclo para
   historico\ciclo-<data>\, como sempre. */
const fs = require('fs');
const path = require('path');

const LIM = { oQue: 4000, criterio: 2000, naoPode: 2000, arquivos: 2000 };
const MAX_HIST = 100;
const str = (v, max) => String(v == null ? '' : v).replace(/\r/g, '').trim().slice(0, max);
const lerTexto = (f) => { try { return fs.readFileSync(f, 'utf8').replace(/^﻿/, ''); } catch { return null; } };
const achar = (pasta, nomes) => { for (const n of nomes) { const f = path.join(pasta, n); if (fs.existsSync(f)) return f; } return null; };

// primeiras linhas úteis (sem vazias, comentários HTML e linhas de cerca de código)
function primeiras(texto, n = 12, max = 1500) {
  if (texto == null) return '';
  const out = [];
  let dentroComentario = false;
  for (const l0 of texto.split('\n')) {
    const l = l0.replace(/\s+$/, '');
    if (dentroComentario) { if (l.includes('-->')) dentroComentario = false; continue; }
    if (/^\s*<!--/.test(l)) { if (!l.includes('-->')) dentroComentario = true; continue; }
    if (!l.trim()) continue;
    out.push(l.slice(0, 300));
    if (out.length >= n) break;
  }
  return out.join('\n').slice(0, max);
}

// A tarefa em andamento do TASKS (por grep, sem IA): a seção "## Em andamento" até o próximo "## "; sem ela, as linhas
// com "EM ANDAMENTO" e o título da tarefa logo acima.
function emAndamento(pasta) {
  const f = achar(pasta, ['docs/TASKS.md', 'TASKS.md', 'docs/tasks.md']);
  const t = f && lerTexto(f);
  if (!t) return { arquivo: '', texto: '' };
  const ls = t.split('\n');
  const i = ls.findIndex((l) => /^##\s+em andamento\b/i.test(l.trim()));
  let bloco = [];
  if (i >= 0) {
    for (let j = i + 1; j < ls.length && !/^##\s/.test(ls[j]); j++) if (ls[j].trim()) bloco.push(ls[j].slice(0, 300));
  } else {
    ls.forEach((l, j) => {
      if (!/em andamento/i.test(l)) return;
      for (let k = j; k >= Math.max(0, j - 8); k--) if (/^#{2,4}\s/.test(ls[k])) { bloco.push(ls[k].slice(0, 300)); break; }
      bloco.push(l.slice(0, 300));
    });
  }
  bloco = bloco.slice(0, 25);
  return { arquivo: path.relative(pasta, f).replace(/\\/g, '/'), texto: bloco.join('\n').slice(0, 2500) };
}

function create(h) {
  const { dirOf, readJson, writeJson, validId, gitRun, headOf, branchDe, papelDe, gravarEntrega } = h;
  const histF = (id) => path.join(dirOf(id), 'tarefas.json');
  const histLer = (id) => { const j = readJson(histF(id)); return j && Array.isArray(j.tarefas) ? j : { tarefas: [] }; };

  // Resumo do projeto lido sem IA (git e alguns arquivos de texto da pasta)
  function resumo(pasta) {
    if (typeof pasta !== 'string' || !pasta || !fs.existsSync(pasta) || !fs.statSync(pasta).isDirectory()) return null;
    const temGit = gitRun(pasta, ['rev-parse', '--is-inside-work-tree']).ok;
    const log = temGit ? gitRun(pasta, ['log', '-8', '--format=%h %s']) : { ok: false };
    const info = papelDe(pasta);
    const readme = achar(pasta, ['README.md', 'readme.md', 'Readme.md', 'README.txt', 'README']);
    const claude = achar(pasta, ['CLAUDE.md', '.claude/CLAUDE.md']);
    const and = emAndamento(pasta);
    return {
      pasta,
      git: temGit,
      branch: temGit ? headOf(pasta) || '(destacado)' : '',
      commits: log.ok && log.out ? log.out.split('\n').filter(Boolean).map((l) => l.slice(0, 160)) : [],
      fluxo: info.fluxo,
      papel: info.papel,
      branchTrabalho: branchDe(pasta),
      readme: readme ? { arquivo: path.basename(readme), texto: primeiras(lerTexto(readme)) } : null,
      claude: claude ? { arquivo: path.relative(pasta, claude).replace(/\\/g, '/'), texto: primeiras(lerTexto(claude)) } : null,
      andamento: and.texto ? and : null,
    };
  }

  function conferir(f) {
    const out = [];
    if (!validId(f.projectId)) out.push('Escolha o projeto.');
    if (!str(f.oQue, LIM.oQue)) out.push('Descreva o que fazer.');
    if (!str(f.criterio, LIM.criterio)) out.push('Escreva o critério de pronto da tarefa.');
    for (const [k, n] of Object.entries(LIM)) if (String(f[k] || '').length > n) out.push(`O campo "${k}" passou de ${n} caracteres.`);
    if (!str(f.projectPath, 1000) || !fs.existsSync(f.projectPath)) out.push('A pasta do projeto não foi encontrada.');
    return out;
  }

  // o estado do ciclo atual vira o resumo da tarefa no histórico (feitas e pendências)
  function fechamento(id, status) {
    const es = readJson(path.join(dirOf(id), 'estado.json')) || {};
    const x = es.exec || {};
    return {
      status: status || (es.fase === 'concluido' ? 'concluida' : 'interrompida'),
      fim: new Date().toISOString(),
      fase: String(es.fase || '').slice(0, 20),
      branch: String(x.branch || '').slice(0, 120),
      tarefas: Array.isArray(x.tarefas) ? x.tarefas.length : 0,
      feitas: (Array.isArray(x.feitas) ? x.feitas : []).slice(0, 50).map((t) => ({ id: String(t.id || '').slice(0, 20), titulo: String(t.titulo || '').slice(0, 200), commit: String(t.commit || '').slice(0, 120), deploy: t.deploy || '', tag: t.tag || '' })),
      pendencias: (Array.isArray(x.pendencias) ? x.pendencias : []).slice(0, 50).map((p) => ({ id: String(p.id || '').slice(0, 20), titulo: String(p.titulo || '').slice(0, 200), motivo: String(p.motivo || '').slice(0, 400) })),
    };
  }

  function estruturaMd(n, t, r) {
    const sec = (tit, txt) => `## ${tit}\n\n${txt && String(txt).trim() ? String(txt).trim() : '(não informado)'}\n`;
    const cerca = (txt) => (txt ? `\`\`\`\n${txt}\n\`\`\`` : '');
    return [
      `# Tarefa ${n} (Vibe de tarefa, projeto em andamento)`, '',
      sec('O que fazer', t.oQue), sec('Critério de pronto', t.criterio), sec('O que não pode', t.naoPode), sec('Arquivos ou telas envolvidos', t.arquivos),
      '# Resumo do projeto (montado pelo Termix, sem IA)', '',
      '> Só um ponto de partida. Confira no repositório o que precisar, por grep, sem ler arquivos inteiros.', '',
      sec('Pasta, branch e papel', [`Pasta: ${r.pasta}`, `Branch atual: ${r.branch || '(sem git)'}`, `Branch de trabalho dos agentes: ${r.branchTrabalho || '(a do papel)'}`, r.fluxo ? `Fluxo Rocruzta: sim, papel ${r.papel || '(não definido)'}` : 'Fluxo Rocruzta: não'].join('\n')),
      sec('Últimos commits', r.commits.length ? r.commits.map((c) => `- ${c}`).join('\n') : ''),
      sec(`README (primeiras linhas${r.readme ? `, ${r.readme.arquivo}` : ''})`, r.readme && cerca(r.readme.texto)),
      sec(`CLAUDE.md (primeiras linhas${r.claude ? `, ${r.claude.arquivo}` : ''})`, r.claude && cerca(r.claude.texto)),
      sec(`Tarefa em andamento no TASKS${r.andamento ? ` (${r.andamento.arquivo})` : ''}`, r.andamento && cerca(r.andamento.texto)),
    ].join('\n');
  }

  // Tarefa nova: confere, fecha a anterior no histórico (com o estado do ciclo que ainda está em vibe\<id>), grava a entrega
  // sintética (a anterior vai para historico\<data>\) e acrescenta a tarefa ao histórico. Quem arquiva o ciclo e reaproveita
  // as abas é a interface (startCycle).
  function nova(f) {
    f = f || {};
    const problemas = conferir(f);
    if (problemas.length) return { ok: false, problems: problemas };
    const id = f.projectId, pasta = path.resolve(str(f.projectPath, 1000));
    const r = resumo(pasta);
    if (!r) return { ok: false, problems: ['A pasta do projeto não foi encontrada.'] };
    if (!r.git) return { ok: false, problems: ['O projeto não tem git. O Vibe de tarefa é para projeto em andamento: rode "git init" e faça um primeiro commit, ou use "Projeto novo".'] };
    const hist = histLer(id);
    hist.tarefas = hist.tarefas.map((t) => (t.status === 'andamento' ? { ...t, ...fechamento(id) } : t));
    const n = hist.tarefas.reduce((m, t) => Math.max(m, t.n || 0), 0) + 1;
    const t = { oQue: str(f.oQue, LIM.oQue), criterio: str(f.criterio, LIM.criterio), naoPode: str(f.naoPode, LIM.naoPode), arquivos: str(f.arquivos, LIM.arquivos) };
    const data = new Date().toISOString();
    const entrega = {
      versao: 1, status: 'pronta', modo: 'tarefa', data,
      projeto: { id, nome: str(f.projectName, 200), pasta },
      objetivo: t.oQue.split('\n')[0].slice(0, 300), criterioDePronto: t.criterio, naoPodem: t.naoPode,
      acessos: [], nadaAFornecer: true,
      arquivos: { estrutura: 'estrutura.md' }, origem: { tarefa: true },
      tarefa: { n, ...t },
      resumo: { branch: r.branch, branchTrabalho: r.branchTrabalho, fluxo: r.fluxo, papel: r.papel, commits: r.commits.slice(0, 3) },
    };
    gravarEntrega(id, entrega, { 'estrutura.md': estruturaMd(n, t, r) });
    hist.tarefas.push({ n, oQue: t.oQue.slice(0, 600), criterio: t.criterio.slice(0, 300), iniciada: data, status: 'andamento' });
    hist.tarefas = hist.tarefas.slice(-MAX_HIST);
    writeJson(histF(id), hist);
    return { ok: true, entrega, n, pasta: dirOf(id) };
  }

  // Fim do ciclo (a interface chama ao concluir): a tarefa atual fica "concluida", com as feitas e as pendências.
  function fim(id) {
    if (!validId(id)) return null;
    const hist = histLer(id);
    const i = hist.tarefas.map((t) => t.status).lastIndexOf('andamento');
    if (i < 0) return null;
    hist.tarefas[i] = { ...hist.tarefas[i], ...fechamento(id, 'concluida') };
    writeJson(histF(id), hist);
    return hist.tarefas[i];
  }

  const api = {
    tarefaResumo: (pasta) => resumo(pasta),
    tarefaNova: (f) => nova(f),
    tarefaFim: (id) => fim(id),
    tarefaHist: (id) => (validId(id) ? histLer(id).tarefas.slice().reverse() : []), // a mais nova primeiro
  };
  return { api, resumo, LIM };
}

// Pedido de planejamento da tarefa: curto, manda ler só o necessário (por grep), poucas tarefas e só as perguntas indispensáveis.
function pedidoPlano(d, e, formato, trechoPolitica) {
  const t = e.tarefa || {};
  return `Você é o ORQUESTRADOR do Vibe de tarefa do Termix: uma TAREFA num projeto que já está em andamento (não é um projeto do zero). Nesta etapa só PLANEJE: não altere o código, não instale nada, não faça commit. A tarefa ${t.n || ''} do humano e um resumo do projeto montado pelo Termix (sem IA) estão em ${path.join(d, 'estrutura.md')}; entrega.json tem os mesmos campos. Leia o repositório só no necessário para planejar: comece pelos arquivos ou telas citados na tarefa e use grep/busca para achar o resto; não leia arquivos grandes inteiros, diffs nem o histórico todo. Planeje POUCAS tarefas (o normal é 1 a 3; no máximo 5), só o que cumpre o critério de pronto da tarefa, sem refatorar nem melhorar o que não foi pedido; se fizer sentido validar no fim, uma tarefa de validação marcada [SEM COMMIT]. Pergunte só o que for indispensável para não errar (o normal é nenhuma pergunta). ${formato}${trechoPolitica ? ` ${trechoPolitica}` : ''}`;
}

module.exports = { create, pedidoPlano, primeiras, emAndamento, LIM };
