'use strict';
/* Política de autonomia do Vibe Coding (DEV2-014). Decisões do Ygor (2026-11-11):
   - O responsável pelo projeto fica na dev1 e tem autorização total para deploy na main. Num projeto com o fluxo Rocruzta,
     só o papel DEV1 (CLAUDE.local.md) pode ligar o deploy automático; sem o fluxo, quem abre é o dono. Para DEV2..DEV5 a
     opção de deploy não existe: o fim do ciclo é enviar a própria branch e o handoff.
   - O deploy é feito pelo Termix, em código (DEV2-016, src/vibe/deploy.js), nunca pelo agente: a trava continua barrando a main para a IA.
     Aqui ficam só a política, a gravação e as regras que o ciclo consulta (zero token).
   Gravada por projeto em %APPDATA%\Termix\vibe\<id>\politica.json; editável no meio do ciclo (vale a partir da próxima
   tarefa; teto e "Pausar deploy" valem na hora). */
const fs = require('fs');
const path = require('path');

const DEPLOY_MODOS = ['nunca', 'pedir', 'marco', 'sempre'];
const HUMANO = ['indispensavel', 'produto', 'sempre'];
const MODELOS_IA = ['', 'opus', 'sonnet', 'haiku']; // '' = o padrão do Claude Code; vai no "model" do settings da aba
const TETO5_PADRAO = 93; // decisão anterior do Ygor (DEV2-004), agora configurável
const TETO7_PADRAO = 95;
const VOLTAS_PADRAO = 3; // DEV2-015: voltas de recuperação do orquestrador por tarefa (0 a 5)

// Modelos prontos: o usuário escolhe um e ajusta por cima.
const PRONTOS = {
  supervisionado: { titulo: 'Supervisionado', deploy: 'pedir', humano: 'produto', resumo: 'Pede autorização para deploy e para decisões de produto.' },
  branch: { titulo: 'Autônomo até a branch', deploy: 'nunca', humano: 'indispensavel', resumo: 'Trabalha sozinho até a branch; deploy nunca é automático. Chama você só no indispensável.' },
  deploy: { titulo: 'Autônomo com deploy', deploy: 'sempre', humano: 'indispensavel', resumo: 'Trabalha sozinho e o Termix faz o deploy depois do portão de qualidade. Só DEV1 ou o dono.', soDeploy: true },
};

const readText = (f) => { try { return fs.readFileSync(f, 'utf8').replace(/^﻿/, ''); } catch { return null; } };
const num = (v, min, max, def) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n * 100) / 100)) : def; };
const str = (v, max) => String(v == null ? '' : v).replace(/\r/g, '').trim().slice(0, max);

// Quem pode ligar o deploy neste projeto. Fluxo Rocruzta (.claude/fluxo.json): só o papel DEV1. Sem fluxo: o dono (quem abre).
function papelDe(pasta) {
  const r = { fluxo: false, papel: '', podeDeploy: false, motivo: '', validacao: '' };
  try {
    if (pasta && fs.existsSync(path.join(pasta, '.claude', 'fluxo.json'))) {
      r.fluxo = true;
      try { const j = JSON.parse(readText(path.join(pasta, '.claude', 'fluxo.json')) || '{}'); if (Array.isArray(j.validacao)) r.validacao = j.validacao.map(String).filter(Boolean).join(' && ').slice(0, 500); } catch { /* fluxo.json ilegível: sem sugestão */ }
      const m = /^\s*papel:\s*"?([A-Za-z0-9]+)"?/m.exec(readText(path.join(pasta, 'CLAUDE.local.md')) || '');
      r.papel = m ? m[1].toUpperCase() : '';
      r.podeDeploy = r.papel === 'DEV1';
      if (!r.papel) r.motivo = 'O projeto usa o fluxo Rocruzta, mas esta máquina não tem papel (CLAUDE.local.md): o deploy na main não está disponível.';
      else if (!r.podeDeploy) r.motivo = `Nesta máquina o seu papel é ${r.papel}: o deploy na main é do DEV1.`;
      return r;
    }
  } catch { /* segue como projeto sem fluxo */ }
  r.podeDeploy = true; // sem fluxo: quem abre é o dono
  return r;
}

function padrao(info) {
  return { versao: 1, modelo: 'branch', ajustado: false, deploy: { modo: 'nunca', marco: '', marcoAtingido: false, receita: '', pausado: false }, portao: (info && info.validacao) || '', orcamento: { teto5: TETO5_PADRAO, teto7: TETO7_PADRAO, usd: null }, modelos: { orq: '', dev: '' }, humano: 'indispensavel', recuperacao: { f5Projeto: '', voltas: VOLTAS_PADRAO } };
}

// Aplica um modelo pronto por cima da política atual (só deploy e humano mudam; o resto fica).
function aplicarModelo(pol, nome, info) {
  const m = PRONTOS[nome];
  if (!m || (m.soDeploy && !(info && info.podeDeploy))) return normalizar(pol, info);
  const p = normalizar(pol, info);
  return normalizar({ ...p, modelo: nome, ajustado: false, humano: m.humano, deploy: { ...p.deploy, modo: m.deploy } }, info);
}

// Confere e limpa a política vinda da interface. A regra que vale é esta: sem permissão de deploy, deploy = nunca.
function normalizar(pol, info) {
  const base = padrao(info);
  const p = pol && typeof pol === 'object' ? pol : {};
  const d = p.deploy && typeof p.deploy === 'object' ? p.deploy : {};
  const o = p.orcamento && typeof p.orcamento === 'object' ? p.orcamento : {};
  const mo = p.modelos && typeof p.modelos === 'object' ? p.modelos : {};
  const rc = p.recuperacao && typeof p.recuperacao === 'object' ? p.recuperacao : {};
  const pode = !!(info && info.podeDeploy);
  const out = {
    versao: 1,
    modelo: PRONTOS[p.modelo] ? p.modelo : base.modelo,
    ajustado: false,
    deploy: {
      modo: DEPLOY_MODOS.includes(d.modo) ? d.modo : base.deploy.modo,
      marco: str(d.marco, 200),
      marcoAtingido: !!d.marcoAtingido,
      receita: str(d.receita, 4000),
      pausado: !!d.pausado,
    },
    portao: p.portao == null ? base.portao : str(p.portao, 500),
    orcamento: { teto5: num(o.teto5, 1, 100, TETO5_PADRAO), teto7: num(o.teto7, 1, 100, TETO7_PADRAO), usd: o.usd === '' || o.usd == null ? null : num(o.usd, 0.01, 100000, null) },
    modelos: { orq: MODELOS_IA.includes(mo.orq) ? mo.orq : '', dev: MODELOS_IA.includes(mo.dev) ? mo.dev : '' },
    humano: HUMANO.includes(p.humano) ? p.humano : base.humano,
    // DEV2-015: recuperação de erro. f5Projeto = comando opcional para "reiniciar o projeto" (roda na pasta do projeto, depois
    // de passar pela trava); voltas = quantas voltas do orquestrador por tarefa antes de virar pendência.
    recuperacao: { f5Projeto: str(rc.f5Projeto, 500).replace(/\n+/g, ' '), voltas: Math.round(num(rc.voltas, 0, 5, VOLTAS_PADRAO)) },
  };
  if (!pode) { // DEV2..DEV5 (ou fluxo sem papel): sem deploy nem modelo "com deploy"
    out.deploy = { ...out.deploy, modo: 'nunca', marcoAtingido: false };
    if (out.modelo === 'deploy') out.modelo = 'branch';
  }
  if (out.deploy.modo !== 'marco') out.deploy.marcoAtingido = false;
  // "ajustado" = deploy ou humano diferem do modelo escolhido (os outros campos são ajustes finos de qualquer modelo)
  const m = PRONTOS[out.modelo];
  out.ajustado = !!m && (m.deploy !== out.deploy.modo || m.humano !== out.humano);
  out.fimCiclo = pode ? 'deploy' : 'branch-handoff';
  return out;
}

// DEV2-021: deploy automático ("Sempre" ou "Marco") exige o portão de qualidade; "Pedir autorização" pode publicar sem ele.
const PORTAO_OBRIGATORIO = 'Com o deploy "Sempre" ou "Automático a partir de um marco", o portão de qualidade é obrigatório. Preencha o portão (ex.: npm test) ou escolha "Pedir autorização".';
const semPortaoAuto = (pol) => !!pol && ['sempre', 'marco'].includes(pol.deploy.modo) && !String(pol.portao || '').trim();

// O deploy desta política é automático agora? (sempre, ou a partir do marco já atingido)
const deployAuto = (pol) => !!pol && (pol.deploy.modo === 'sempre' || (pol.deploy.modo === 'marco' && pol.deploy.marcoAtingido));

/* O que o ciclo faz com uma tarefa [DEPLOY] (zero token):
   - 'pausar'    — Nunca / marco ainda não atingido / papel sem deploy: pausa como antes (o humano libera ou pula);
   - 'autorizar' — Pedir autorização (DEV2-016): o sino e o painel mostram "Autorizar deploy" e "Negar", com o resumo;
   - 'pendente'  — automático: o Termix faz o deploy em código (DEV2-016: src/vibe/deploy.js);
   - 'retido'    — automático (ou autorizado), mas com "Pausar deploy" ligado: fica retido e o resto do ciclo segue;
                   "Retomar deploy" executa os retidos. */
function decidirDeploy(pol, info) {
  if (!pol || !(info ? info.podeDeploy : true)) return 'pausar';
  if (pol.deploy.modo === 'pedir') return pol.deploy.pausado ? 'retido' : 'autorizar';
  if (!deployAuto(pol)) return 'pausar';
  return pol.deploy.pausado ? 'retido' : 'pendente';
}

// Pausa antes da tarefa? [HUMANO] pausa sempre (o indispensável, como hoje); "sempre" pausa antes de toda tarefa.
function decidirHumano(pol, tarefa) {
  if (tarefa && tarefa.humano) return 'humano';
  if (pol && pol.humano === 'sempre') return 'sempre';
  return '';
}

/* Teto de uso: devolve o motivo da pausa, ou '' se pode seguir. l5/l7 = { pct, resets } (só valem com a janela ativa);
   usd = custo equivalente do ciclo (tabela da API), quando houver. */
function tetoAtingido(pol, l5, l7, usd, agora = Date.now()) {
  const o = (pol && pol.orcamento) || { teto5: TETO5_PADRAO, teto7: TETO7_PADRAO, usd: null };
  const ok = (l) => !!(l && typeof l.pct === 'number' && (!l.resets || l.resets * 1000 > agora));
  if (ok(l5) && l5.pct >= o.teto5) return { tipo: '5h', motivo: `Janela de 5 h em ${Math.round(l5.pct)}% (teto ${o.teto5}%). O Termix retoma sozinho quando ela virar ou quando você subir o teto.`, auto: true };
  if (ok(l7) && l7.pct >= o.teto7) return { tipo: '7d', motivo: `Janela de 7 dias em ${Math.round(l7.pct)}% (teto ${o.teto7}%). O Termix retoma sozinho quando ela virar ou quando você subir o teto.`, auto: true };
  if (o.usd != null && typeof usd === 'number' && usd >= o.usd) return { tipo: 'usd', motivo: `Custo equivalente do ciclo em US$ ${usd.toFixed(2)} (teto US$ ${o.usd.toFixed(2)}). Suba o teto na política e clique em Continuar para seguir.`, auto: false };
  return null;
}

// Só o que é relevante para cada agente (curto; os agentes não leem a política inteira).
function trechoAgente(pol, quem, info) {
  if (!pol) return '';
  const out = [];
  if (quem === 'plano') {
    if (pol.humano === 'produto') out.push('Política do humano: pergunte também as decisões de produto (além do indispensável) e marque [HUMANO] as tarefas que dependem de uma decisão de produto.');
    if (pol.humano === 'sempre') out.push('Política do humano: o Termix confirma com o humano antes de cada tarefa; planeje tarefas pequenas e claras.');
    if (deployAuto(pol) || pol.deploy.modo === 'marco' || pol.deploy.modo === 'pedir') out.push('Deploy: marque [DEPLOY] a tarefa de publicação, como sempre; quem faz o deploy é o Termix, com a receita do projeto, não o Dev.');
    if (info && !info.podeDeploy) out.push('Não planeje deploy na main: o fim deste ciclo é a branch de trabalho enviada e o handoff.');
  }
  return out.join(' ');
}

const resumo = (pol, info) => {
  if (!pol) return '';
  const m = PRONTOS[pol.modelo];
  const dep = !(info && info.podeDeploy) ? 'fim: enviar a branch e o handoff'
    : { nunca: 'deploy nunca automático', pedir: 'deploy com autorização', marco: `deploy automático a partir de "${pol.deploy.marco}"${pol.deploy.marcoAtingido ? ' (marco atingido)' : ''}`, sempre: 'deploy sempre automático' }[pol.deploy.modo];
  const hum = { indispensavel: 'chama você só no indispensável', produto: 'chama você também em decisões de produto', sempre: 'confirma com você antes de cada tarefa' }[pol.humano];
  const o = pol.orcamento;
  return `${m ? m.titulo : ''}${pol.ajustado ? ' (ajustado)' : ''} · ${dep}${pol.deploy.pausado ? ' · DEPLOY PAUSADO' : ''} · ${hum} · teto 5 h ${o.teto5}% / 7 d ${o.teto7}%${o.usd != null ? ` / US$ ${o.usd}` : ''}`;
};

function create({ dirOf, readJson, writeJson, validId, pastaDe }) {
  const arq = (id) => path.join(dirOf(id), 'politica.json');
  const info = (id) => { const pasta = pastaDe(id); return { ...papelDe(pasta), pasta: pasta || '' }; };
  function ler(id) {
    if (!validId(id)) return null;
    const j = readJson(arq(id));
    return j ? normalizar(j, info(id)) : null;
  }
  function gravar(id, pol, motivo) {
    if (!validId(id)) return null;
    const inf = info(id);
    const old = readJson(arq(id));
    const p = normalizar(pol, inf);
    if (p.deploy.modo === 'marco' && !p.deploy.marco) return { ok: false, problema: 'Escreva o marco (ex.: "v1.0 estável") ou escolha outro modo de deploy.' };
    if (semPortaoAuto(p)) return { ok: false, problema: PORTAO_OBRIGATORIO };
    const mudou = old ? Object.keys(p).filter((k) => JSON.stringify(p[k]) !== JSON.stringify(old[k]) && !['fimCiclo'].includes(k)) : ['nova'];
    const alteracoes = [...((old && Array.isArray(old.alteracoes)) ? old.alteracoes : []), { data: new Date().toISOString(), motivo: str(motivo, 80) || 'edição', campos: mudou }].slice(-30);
    writeJson(arq(id), { ...p, criada: (old && old.criada) || new Date().toISOString(), atualizada: new Date().toISOString(), alteracoes });
    return { ok: true, politica: p, info: inf };
  }
  const api = {
    // A política gravada (ou a padrão, sem gravar), o papel e as opções que a tela pode mostrar.
    politicaGet(id) {
      if (!validId(id)) return null;
      const inf = info(id);
      const p = ler(id);
      return { existe: !!p, politica: p || normalizar(padrao(inf), inf), info: inf, prontos: Object.entries(PRONTOS).filter(([, m]) => !m.soDeploy || inf.podeDeploy).map(([k, m]) => ({ id: k, titulo: m.titulo, resumo: m.resumo })), resumo: resumo(p || normalizar(padrao(inf), inf), inf) };
    },
    politicaSet: (id, pol, motivo) => gravar(id, pol, motivo),
    politicaModelo(id, pol, nome) { const inf = info(id); return { politica: aplicarModelo(pol, nome, inf), info: inf }; },
    // O ciclo pergunta antes de cada tarefa (lida na hora: edições valem a partir da próxima tarefa).
    politicaTarefa(id, tarefa) {
      const inf = info(id), p = ler(id) || normalizar(padrao(inf), inf);
      const t = tarefa && typeof tarefa === 'object' ? tarefa : {};
      return { deploy: t.deploy ? decidirDeploy(p, inf) : '', humano: decidirHumano(p, t), resumo: resumo(p, inf) };
    },
    // Teto de uso (5 h, 7 d e US$): motivo da pausa, ou null para seguir.
    politicaTeto(id, l5, l7, usd) {
      const inf = info(id);
      return tetoAtingido(ler(id) || normalizar(padrao(inf), inf), l5, l7, usd);
    },
    // "Pausar deploy": vale na hora, sem parar o resto do ciclo.
    politicaPausarDeploy(id, pausado) {
      const p = ler(id) || normalizar(padrao(info(id)), info(id));
      return gravar(id, { ...p, deploy: { ...p.deploy, pausado: !!pausado } }, pausado ? 'pausar deploy' : 'retomar deploy');
    },
  };
  return { api, ler, info };
}

module.exports = { create, papelDe, padrao, normalizar, aplicarModelo, decidirDeploy, decidirHumano, tetoAtingido, trechoAgente, resumo, deployAuto, semPortaoAuto, PORTAO_OBRIGATORIO, PRONTOS, TETO5_PADRAO, TETO7_PADRAO, VOLTAS_PADRAO };
