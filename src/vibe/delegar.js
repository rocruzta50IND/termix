'use strict';
/* Delegar tarefa (DEV2-025): o responsável (DEV1) passa UMA tarefa a UMA pessoa, pelo git, sem servidor e sem IA nos passos
   mecânicos. Diferente do Mutirão (vários sócios). Base: docs/PROPOSTA_DELEGAR_TAREFA.md (decisões da DEV2-025 valem por cima).
   Quem escreve a tarefa é o orquestrador do responsável; quem confere, grava, envia e vigia é o Termix (este código):
   - o pedido vai na branch DO RESPONSÁVEL (dev1): .termix/delegar/<id>.md + índice .termix/delegar/indice.json (para quem,
     branch, data, estado); commit e push só da dev1; a branch devN é criada a partir da dev1 e registrada em .claude/fluxo.json;
   - quem recebe lê origin/dev1:.termix/delegar (git fetch + git show, zero token), avisa e só COMEÇA quando a pessoa clica:
     confere/troca para a devN, sincroniza com a dev1 sem descartar nada e grava na devN o marcador mínimo
     .termix/delegar/estado-<id>.json (em_andamento, depois entregue); commit e push só da devN;
   - o responsável lê, SÓ do remoto da devN, esse marcador (trava de contexto do WORKFLOW: nada de código, diff ou log);
     "Analisar" extrai SÓ docs/HANDOFF_DEVn.md para um arquivo do módulo; aprovar/reprovar grava no índice (dev1);
   - nunca junta branches, nunca força push, nunca descarta nada.
   As contas (quem é quem neste PC) vêm de contas.js, que é um MOCK até o login do Hub. */
const fs = require('fs');
const path = require('path');

const DIR_REL = '.termix/delegar';
const IDX_REL = `${DIR_REL}/indice.json`;
const DEVS = ['dev2', 'dev3', 'dev4', 'dev5'];
const ABERTOS = ['enviado', 'em_andamento', 'entregue']; // pedido aberto = a branch está ocupada
const ESTADOS = ['enviado', 'em_andamento', 'entregue', 'aprovado', 'reprovado'];
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const validDid = (d) => typeof d === 'string' && /^d-[0-9]{14}-[a-z0-9]{3}$/.test(d);
const linha1 = (r) => String((r && (r.err || r.out)) || '').split('\n').find((l) => l.trim()) || 'erro do git';
const SEGREDOS = [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, /\bghp_[A-Za-z0-9]{20,}/, /\bgithub_pat_[A-Za-z0-9_]{20,}/, /\bsk-[A-Za-z0-9_-]{20,}/, /\bAKIA[0-9A-Z]{16}\b/, /\b(?:senha|password|passwd|secret|token|api[_-]?key)\s*[:=]\s*["']?[^\s"']{8,}/i];

// Seções da tarefa escrita pelo orquestrador (títulos conferidos sem acento e sem caixa).
const SECOES = [
  { key: 'objetivo', label: 'Objetivo', match: (h) => h.startsWith('objetivo') },
  { key: 'contexto', label: 'Contexto', match: (h) => h.startsWith('contexto') },
  { key: 'ler', label: 'O que ler', match: (h) => /\bler\b/.test(h) },
  { key: 'pronto', label: 'Critério de pronto', match: (h) => h.includes('pronto') },
  { key: 'nao', label: 'O que não fazer', match: (h) => h.includes('nao fazer') || h.startsWith('nao fazer') },
  { key: 'esperado', label: 'Resultado esperado', match: (h) => h.includes('esperado') },
];
function secoes(texto) {
  const lines = String(texto || '').replace(/\r/g, '').split('\n');
  const heads = [];
  let cerca = false;
  lines.forEach((l, i) => {
    if (/^\s*(```|~~~)/.test(l)) cerca = !cerca;
    if (cerca) return;
    const m = /^(#{1,3})\s+(.+?)\s*#*\s*$/.exec(l);
    if (m) heads.push({ i, level: m[1].length, h: norm(m[2]) });
  });
  const out = {}, faltam = [], vazias = [];
  const usados = new Set();
  for (const s of SECOES) {
    const idx = heads.findIndex((x, k) => !usados.has(k) && x.level >= 2 && s.match(x.h));
    if (idx < 0) { faltam.push(s.label); continue; }
    usados.add(idx);
    const nxt = heads.slice(idx + 1).find((x) => x.level <= heads[idx].level);
    const corpo = lines.slice(heads[idx].i + 1, nxt ? nxt.i : lines.length).join('\n').replace(/<!--[\s\S]*?-->/g, '').trim();
    out[s.key] = corpo;
    if (corpo.replace(/[\s\-*#|_`>]/g, '').length < 3) vazias.push(s.label);
  }
  return { out, faltam, vazias };
}

function create(h) {
  const { dirOf, readJson, writeJson, gitRun, shaOf, headOf, validId, pedido, contas, TEST, logError = () => {} } = h;
  const readText = (f) => { try { return fs.readFileSync(f, 'utf8').replace(/^﻿/, ''); } catch { return null; } };
  const parseJson = (t) => { try { return JSON.parse(String(t).replace(/^﻿/, '')); } catch { return null; } };
  const wdir = (projId, did) => path.join(dirOf(projId), 'delegar', did);
  const relIdx = (pasta) => path.join(pasta, ...IDX_REL.split('/'));
  const relPedido = (did) => `${DIR_REL}/${did}.md`;
  const relMarc = (did) => `${DIR_REL}/estado-${did}.json`;
  const showRef = (pasta, ref, rel) => { const r = gitRun(pasta, ['show', `${ref}:${rel}`]); return r.ok ? r.out : null; };
  const temRef = (pasta, ref) => !!shaOf(pasta, ref);

  // Papel desta máquina no projeto, lido do CLAUDE.local.md (o fluxo Rocruzta). O responsável é o DEV1.
  function lerPapel(pasta) {
    const r = { pasta, existe: !!pasta && fs.existsSync(pasta), git: false, fluxo: false, papel: '', branchPapel: '', remoto: '', atual: '' };
    if (!r.existe) return r;
    r.git = gitRun(pasta, ['rev-parse', '--is-inside-work-tree']).ok;
    if (!r.git) return r;
    r.atual = headOf(pasta);
    const rm = gitRun(pasta, ['remote', 'get-url', 'origin']);
    r.remoto = rm.ok ? rm.out : '';
    r.fluxo = fs.existsSync(path.join(pasta, '.claude', 'fluxo.json'));
    const loc = readText(path.join(pasta, 'CLAUDE.local.md')) || '';
    const pm = /^\s*papel:\s*"?([A-Za-z0-9]+)"?/m.exec(loc), bm = /^\s*branch_padrao:\s*"?([\w./-]+)"?/m.exec(loc);
    r.papel = pm ? pm[1].toUpperCase() : '';
    r.branchPapel = bm ? bm[1] : '';
    return r;
  }
  function lerIndice(pasta) {
    const j = parseJson(readText(relIdx(pasta)) || '');
    return { versao: 1, pedidos: j && Array.isArray(j.pedidos) ? j.pedidos.filter((p) => p && validDid(p.id)) : [] };
  }
  const gravarIndice = (pasta, idx) => { fs.mkdirSync(path.dirname(relIdx(pasta)), { recursive: true }); fs.writeFileSync(relIdx(pasta), `${JSON.stringify(idx, null, 2)}\n`); };

  /* ---------- responsável: quem pode, conta, branch sugerida ---------- */
  function info(pasta) {
    const r = lerPapel(pasta);
    const conta = contas.contaAtual();
    const out = { fluxo: r.fluxo, papel: r.papel, dono: r.papel === 'DEV1', branchDono: r.branchPapel, remoto: !!r.remoto, atual: r.atual, conta, contas: contas.listarContas().filter((c) => c !== conta), mock: true, ocupadas: [], livres: [], sugerida: '', pode: false, motivo: '' };
    if (!r.existe) { out.motivo = 'A pasta do projeto não foi encontrada.'; return out; }
    if (!r.git) { out.motivo = 'O projeto não tem git. "Delegar tarefa" exige o fluxo Rocruzta (DEV2..DEV5 → DEV1 → MAIN) com um remoto.'; return out; }
    if (!r.fluxo) { out.motivo = 'Este projeto não usa o fluxo Rocruzta (DEV2..DEV5 → DEV1 → MAIN). O botão "Delegar tarefa" precisa do fluxo: aplique-o ao projeto (/fluxo:init) e tente de novo. Nada foi alterado.'; return out; }
    if (!r.papel) { out.motivo = 'Esta máquina não tem papel neste projeto (CLAUDE.local.md). Só o responsável (DEV1) delega tarefas.'; return out; }
    if (!out.dono) { out.motivo = `Nesta máquina o seu papel é ${r.papel}. Só o responsável pelo projeto (DEV1) delega tarefas.`; return out; }
    if (!r.branchPapel || /^(main|master)$/i.test(r.branchPapel)) { out.motivo = 'O CLAUDE.local.md do DEV1 não tem uma branch válida (branch_padrao).'; return out; }
    if (!r.remoto) { out.motivo = 'O projeto não tem o remoto origin: o pedido precisa chegar à outra pessoa pelo git.'; return out; }
    if (!conta) { out.motivo = 'Escolha a conta deste PC em Configurações (Conta neste PC, provisório) antes de delegar.'; return out; }
    if (r.atual !== r.branchPapel) { out.motivo = `O projeto precisa estar na sua branch (${r.branchPapel}); agora está em "${r.atual || 'nenhuma'}". Troque de branch e tente de novo.`; return out; }
    const idx = lerIndice(pasta);
    out.ocupadas = idx.pedidos.filter((p) => ABERTOS.includes(p.estado)).map((p) => p.branch);
    out.livres = DEVS.filter((b) => !out.ocupadas.includes(b));
    out.sugerida = out.livres[0] || '';
    if (!out.sugerida) { out.motivo = 'As branches dev2 a dev5 já têm pedido aberto. Conclua ou decida um pedido antes de delegar outro.'; return out; }
    out.pode = true;
    return out;
  }

  /* ---------- pedido ao orquestrador do responsável (em arquivo) ---------- */
  function pedidoTarefa(projId, pasta, d) {
    const i = info(pasta);
    if (!validId(projId)) return { ok: false, motivo: 'Projeto inválido.' };
    if (!i.pode) return { ok: false, motivo: i.motivo };
    const para = String((d && d.para) || ''), branch = String((d && d.branch) || ''), resumo = String((d && d.resumo) || '').replace(/\r/g, '').trim().slice(0, 2000);
    if (!i.contas.includes(para)) return { ok: false, motivo: 'Escolha para quem delegar (a sua própria conta não vale).' };
    if (!DEVS.includes(branch) || i.ocupadas.includes(branch)) return { ok: false, motivo: `A branch ${branch || '(nenhuma)'} não está livre.` };
    if (!resumo) return { ok: false, motivo: 'Escreva em poucas palavras o que você quer.' };
    const did = `d-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 5).padEnd(3, 'x')}`;
    const dir = wdir(projId, did), arquivo = path.join(dir, 'tarefa.md');
    fs.mkdirSync(dir, { recursive: true });
    writeJson(path.join(dir, 'rascunho.json'), { versao: 1, did, para, branch, resumo, de: i.conta, criado: new Date().toISOString() });
    const linha = pedido(projId, `delegar-${did}`, [
      `Você é o ORQUESTRADOR do responsável (DEV1, ${i.conta}) deste projeto. Ele quer delegar UMA tarefa a ${para}, que vai trabalhar na branch ${branch}. Em poucas palavras, ele pediu:`,
      `> ${resumo.split('\n').join('\n> ')}`,
      `Escreva a tarefa completa em ${arquivo} (Markdown; primeira linha "# <título curto>") com estas seções "##", todas preenchidas:`,
      '## Objetivo — o que a pessoa deve entregar, em poucas frases.',
      '## Contexto — o mínimo que ela precisa saber do projeto e do porquê.',
      '## O que ler — arquivos ou telas por onde começar (caminhos), sem pedir que leia o projeto todo.',
      '## Critério de pronto — como saber que terminou (observável e conferível).',
      '## O que não fazer — limites: arquivos e áreas que não podem ser tocados, e que a main, a dev1 e as outras branches ficam de fora.',
      '## Resultado esperado — o que o handoff (docs/HANDOFF_DEV' + branch.slice(3) + '.md) deve trazer; é com isto que a entrega será comparada depois.',
      'Leia o projeto só no necessário (busca e grep, sem arquivos grandes inteiros). Não altere o código, não faça commit nem push, não escreva segredos, senhas nem chaves. Ao terminar, responda apenas TAREFA ESCRITA e encerre o turno.',
    ].join('\n'));
    return { ok: true, did, arquivo, linha, para, branch };
  }

  // Confere o que o orquestrador escreveu (seções, vazios, segredos) e devolve o texto para o responsável revisar.
  function conferir(projId, did) {
    if (!validId(projId) || !validDid(did)) return { ok: false, problemas: ['Pedido inválido.'] };
    const arquivo = path.join(wdir(projId, did), 'tarefa.md');
    const texto = readText(arquivo);
    if (texto == null || !texto.trim()) return { ok: false, arquivo, problemas: ['O orquestrador ainda não gravou a tarefa.'] };
    const s = secoes(texto);
    const problemas = [];
    if (s.faltam.length) problemas.push(`Faltam as seções: ${s.faltam.join(', ')}.`);
    if (s.vazias.length) problemas.push(`Seções sem conteúdo: ${s.vazias.join(', ')}.`);
    if (SEGREDOS.some((rx) => rx.test(texto))) problemas.push('A tarefa parece conter um segredo (senha, token ou chave). Tire-o do texto.');
    if (texto.length > 40000) problemas.push('A tarefa passa de 40 mil caracteres.');
    const tm = /^#\s+(.+)$/m.exec(texto);
    const rasc = readJson(path.join(wdir(projId, did), 'rascunho.json')) || {};
    return { ok: !problemas.length, arquivo, problemas, titulo: ((tm && tm[1]) || rasc.resumo || 'Tarefa').trim().slice(0, 160), texto: texto.slice(0, 40000), para: rasc.para || '', branch: rasc.branch || '' };
  }

  /* ---------- git seguro: envia só uma branch, sem força; se o remoto avançou, junta antes (sem reescrever nada) ---------- */
  function enviar(pasta, b, quem) {
    let ps = gitRun(pasta, ['push', 'origin', `refs/heads/${b}:refs/heads/${b}`], 120000);
    let integrou = false;
    if (!ps.ok) {
      gitRun(pasta, ['fetch', '--quiet', 'origin', b], 60000);
      if (temRef(pasta, `refs/remotes/origin/${b}`)) {
        const m = gitRun(pasta, ['merge', '--no-ff', '-m', `${quem}: integrar origin/${b}`, `origin/${b}`], 60000);
        if (!m.ok) { gitRun(pasta, ['merge', '--abort']); return { ok: false, motivo: `A ${b} do remoto avançou e a junção deu conflito (cancelada, nada perdido). Resolva e envie à mão.` }; }
        integrou = true;
        ps = gitRun(pasta, ['push', 'origin', `refs/heads/${b}:refs/heads/${b}`], 120000);
      }
    }
    return ps.ok ? { ok: true, integrou } : { ok: false, motivo: `O envio da ${b} falhou (${linha1(ps)}).` };
  }
  const sujo = (pasta, ...paths) => { const r = gitRun(pasta, ['status', '--porcelain', '--untracked-files=no', ...(paths.length ? ['--', ...paths] : [])]); return !r.ok || !!r.out; };

  /* ---------- responsável: enviar o pedido ---------- */
  function enviarPedido(projId, pasta, did, opts) {
    const i = info(pasta);
    if (!validId(projId) || !validDid(did)) return { ok: false, motivo: 'Pedido inválido.' };
    if (!i.pode) return { ok: false, motivo: i.motivo };
    const c = conferir(projId, did);
    if (!c.ok) return { ok: false, motivo: (c.problemas || []).join(' ') };
    const rasc = readJson(path.join(wdir(projId, did), 'rascunho.json')) || {};
    const para = (opts && opts.para) || rasc.para, branch = (opts && opts.branch) || rasc.branch;
    if (!i.contas.includes(para)) return { ok: false, motivo: 'Para quem delegar? A conta não vale.' };
    if (!DEVS.includes(branch) || i.ocupadas.includes(branch)) return { ok: false, motivo: `A branch ${branch} está ocupada por outro pedido aberto.` };
    const dono = i.branchDono;
    const fluxoF = path.join(pasta, '.claude', 'fluxo.json');
    const paths = [relIdx(pasta), path.join(pasta, ...relPedido(did).split('/')), fluxoF].map((p) => path.relative(pasta, p).replace(/\\/g, '/'));
    if (sujo(pasta, '.claude/fluxo.json', IDX_REL)) return { ok: false, motivo: 'O índice dos pedidos ou o .claude/fluxo.json tem mudanças não salvas. Salve ou desfaça essas mudanças e tente de novo; nada foi enviado.' };
    // 1) a branch devN nasce da dev1 (se ainda não existe no remoto), ANTES do commit do pedido: o pedido não vai para a branch do dev
    const ls = gitRun(pasta, ['ls-remote', '--heads', 'origin', `refs/heads/${branch}`], 60000);
    if (!ls.ok) return { ok: false, motivo: `Não foi possível consultar o remoto (${linha1(ls)}). Nada foi enviado.` };
    let criouBranch = false;
    if (!ls.out) {
      const pb = gitRun(pasta, ['push', 'origin', `refs/heads/${dono}:refs/heads/${branch}`], 120000); // sem força: só cria
      if (!pb.ok) return { ok: false, motivo: `Não foi possível criar a ${branch} a partir da ${dono} (${linha1(pb)}).` };
      criouBranch = true;
    }
    // 2) registra a devN em .claude/fluxo.json (só acrescenta; o resto do arquivo fica como está)
    let registrou = false;
    try {
      const raw = fs.readFileSync(fluxoF, 'utf8'), j = JSON.parse(raw.replace(/^﻿/, ''));
      if (!Array.isArray(j.devs)) j.devs = [];
      if (!j.devs.includes(branch)) {
        j.devs.push(branch); j.devs.sort();
        fs.writeFileSync(fluxoF, `${JSON.stringify(j, null, 2)}${/\n$/.test(raw) ? '\n' : ''}`);
        registrou = true;
      }
    } catch (e) { logError(e); return { ok: false, motivo: `Não foi possível registrar a ${branch} no .claude/fluxo.json (${e.message}).${criouBranch ? ` A ${branch} já foi criada no remoto.` : ''}` }; }
    // 3) o pedido e o índice
    const agora = new Date().toISOString();
    const textoPedido = `<!-- termix-delegar: ${did} · de ${i.conta} para ${para} · branch ${branch} · ${agora} -->\n${c.texto.replace(/\s+$/, '')}\n`;
    fs.mkdirSync(path.join(pasta, ...DIR_REL.split('/')), { recursive: true });
    fs.writeFileSync(path.join(pasta, ...relPedido(did).split('/')), textoPedido);
    const idx = lerIndice(pasta);
    idx.pedidos.push({ id: did, para, de: i.conta, branch, titulo: c.titulo, resumo: String(rasc.resumo || '').slice(0, 500), criado: agora, estado: 'enviado' });
    gravarIndice(pasta, idx);
    // 4) commit só desses arquivos, push só da dev1
    const addp = registrou ? paths : paths.filter((p) => p !== '.claude/fluxo.json');
    const ad = gitRun(pasta, ['add', '--', ...addp]);
    if (!ad.ok) return { ok: false, motivo: `O git não aceitou os arquivos do pedido (${linha1(ad)}). Veja se .termix está no .gitignore.` };
    const cm = gitRun(pasta, ['commit', '-m', `DELEGAR: pedido ${did} para ${para} (${branch})`, '--', ...addp]);
    if (!cm.ok) return { ok: false, motivo: `O commit do pedido falhou (${linha1(cm)}).` };
    const sha = shaOf(pasta, 'HEAD');
    const ps = enviar(pasta, dono, 'DELEGAR');
    if (!ps.ok) return { ok: false, motivo: `O pedido está no commit ${String(sha).slice(0, 8)}, mas ${ps.motivo}`, sha, did };
    return { ok: true, did, para, branch, sha, criouBranch, registrou, dono };
  }

  /* ---------- painel do projeto: pedidos, estados efetivos e datas (vigia do responsável) ---------- */
  function marcadorRemoto(pasta, p) { return parseJson(showRef(pasta, `refs/remotes/origin/${p.branch}`, relMarc(p.id)) || ''); }
  function painel(pasta, opts) {
    const i = info(pasta);
    const idx = i.dono ? lerIndice(pasta) : { pedidos: [] };
    const pedidos = [];
    const buscados = new Set();
    for (const p of idx.pedidos.slice().reverse()) {
      let estado = p.estado, marc = null;
      if (ABERTOS.includes(p.estado) && i.remoto) {
        if (!(opts && opts.semBuscar) && !buscados.has(p.branch)) { buscados.add(p.branch); gitRun(pasta, ['fetch', '--quiet', 'origin', p.branch], 60000); }
        marc = marcadorRemoto(pasta, p); // SÓ o marcador (trava de contexto): estado e datas
        if (marc && ['em_andamento', 'entregue'].includes(marc.estado)) estado = marc.estado;
      }
      pedidos.push({ id: p.id, para: p.para, de: p.de, branch: p.branch, titulo: p.titulo, resumo: p.resumo, estado, estadoIndice: p.estado, motivo: p.motivo || '', datas: { enviado: p.criado || '', iniciado: (marc && marc.iniciado) || (marc && marc.estado === 'em_andamento' ? marc.data : '') || '', entregue: (marc && marc.estado === 'entregue' ? marc.data : '') || '', decidido: p.decidido || '' } });
    }
    return { info: { pode: i.pode, dono: i.dono, fluxo: i.fluxo, motivo: i.motivo, conta: i.conta }, pedidos };
  }

  // "Analisar entrega": extrai SÓ docs/HANDOFF_DEVn.md da devN (do remoto) para um arquivo do módulo e monta o pedido ao orquestrador.
  function analisar(projId, pasta, did) {
    const i = info(pasta);
    if (!validId(projId) || !validDid(did)) return { ok: false, motivo: 'Pedido inválido.' };
    if (!i.dono) return { ok: false, motivo: 'Só o responsável (DEV1) analisa entregas.' };
    const p = lerIndice(pasta).pedidos.find((x) => x.id === did);
    if (!p) return { ok: false, motivo: 'Pedido não encontrado no índice.' };
    gitRun(pasta, ['fetch', '--quiet', 'origin', p.branch], 60000);
    const marc = marcadorRemoto(pasta, p);
    if (!marc || marc.estado !== 'entregue') return { ok: false, motivo: 'Este pedido ainda não foi marcado como entregue.' };
    const rel = `docs/HANDOFF_DEV${p.branch.slice(3)}.md`;
    const txt = showRef(pasta, `refs/remotes/origin/${p.branch}`, rel);
    if (!txt) return { ok: false, motivo: `Não há ${rel} na ${p.branch} do remoto.` };
    const dir = wdir(projId, did);
    fs.mkdirSync(dir, { recursive: true });
    const arq = path.join(dir, `handoff-${p.branch}.md`);
    fs.writeFileSync(arq, `${txt}\n`);
    const pedidoMd = path.join(pasta, ...relPedido(did).split('/'));
    const linha = pedido(projId, `analisar-${did}`, [
      `Você é o ORQUESTRADOR do responsável (DEV1). ${p.para} entregou a tarefa "${p.titulo}" na branch ${p.branch}. O responsável pediu agora, explicitamente, a análise desta entrega.`,
      `Leia APENAS estes dois arquivos: o pedido original ${pedidoMd} (seções "Critério de pronto" e "Resultado esperado") e o handoff ${arq} (cópia do ${rel} da ${p.branch}).`,
      `NÃO leia diff, log, código, TASKS nem qualquer outro arquivo da ${p.branch}, e não consulte essa branch por outro caminho: é a trava de contexto do WORKFLOW.`,
      'Dê um parecer curto ao responsável: o que foi atendido, o que falta, riscos e se recomenda aprovar ou reprovar. Quem decide é o responsável; não integre nada e não altere arquivos. Ao terminar, encerre o turno.',
    ].join('\n'));
    return { ok: true, arquivo: arq, linha, branch: p.branch };
  }

  // Aprovar ou reprovar: grava no índice (dev1), commit e push só da dev1. Não junta branches (a integração é manual, /fluxo:integrar).
  function decidir(projId, pasta, did, decisao, motivo) {
    const i = info(pasta);
    if (!validId(projId) || !validDid(did)) return { ok: false, motivo: 'Pedido inválido.' };
    if (!i.pode) return { ok: false, motivo: i.motivo };
    if (!['aprovado', 'reprovado'].includes(decisao)) return { ok: false, motivo: 'Decisão inválida.' };
    const idx = lerIndice(pasta), p = idx.pedidos.find((x) => x.id === did);
    if (!p) return { ok: false, motivo: 'Pedido não encontrado no índice.' };
    if (!ABERTOS.includes(p.estado)) return { ok: false, motivo: `Este pedido já está ${p.estado}.` };
    const ef = painel(pasta).pedidos.find((x) => x.id === did);
    if (!ef || ef.estado !== 'entregue') return { ok: false, motivo: 'Só dá para decidir depois que a entrega chegar (estado entregue).' };
    if (sujo(pasta, IDX_REL)) return { ok: false, motivo: 'O índice dos pedidos tem mudanças não salvas; nada foi gravado.' };
    p.estado = decisao; p.decidido = new Date().toISOString(); p.motivo = String(motivo || '').slice(0, 1000);
    gravarIndice(pasta, idx);
    const ad = gitRun(pasta, ['add', '--', IDX_REL]);
    if (!ad.ok) return { ok: false, motivo: `O git não aceitou o índice (${linha1(ad)}).` };
    const cm = gitRun(pasta, ['commit', '-m', `DELEGAR: pedido ${did} ${decisao}`, '--', IDX_REL]);
    if (!cm.ok) return { ok: false, motivo: `O commit da decisão falhou (${linha1(cm)}).` };
    const ps = enviar(pasta, i.branchDono, 'DELEGAR');
    if (!ps.ok) return { ok: false, motivo: `A decisão está gravada no commit, mas ${ps.motivo}`, sha: shaOf(pasta, 'HEAD') };
    return { ok: true, estado: decisao, sha: shaOf(pasta, 'HEAD'), integracao: 'A integração continua manual, pelo fluxo (/fluxo:integrar). O Termix não juntou nenhuma branch.' };
  }

  /* ---------- quem recebe: caixa de pedidos (sem IA), começar e entregar ---------- */
  function marcadorDoDev(pasta, p) {
    return parseJson(showRef(pasta, `refs/heads/${p.branch}`, relMarc(p.id)) || '') || parseJson(showRef(pasta, `refs/remotes/origin/${p.branch}`, relMarc(p.id)) || '');
  }
  function caixa(pasta) {
    const conta = contas.contaAtual();
    const r = { conta, mock: true, pedidos: [] };
    if (!conta || !pasta || !fs.existsSync(pasta)) return r;
    const pp = lerPapel(pasta);
    if (!pp.git || !pp.remoto) return r;
    gitRun(pasta, ['fetch', '--quiet', 'origin', 'dev1'], 60000);
    const j = parseJson(showRef(pasta, 'refs/remotes/origin/dev1', IDX_REL) || '');
    for (const p of j && Array.isArray(j.pedidos) ? j.pedidos : []) {
      if (!p || !validDid(p.id) || p.para !== conta || !DEVS.includes(p.branch)) continue;
      const m = marcadorDoDev(pasta, p);
      const estado = p.estado === 'aprovado' || p.estado === 'reprovado' ? p.estado : m && ['em_andamento', 'entregue'].includes(m.estado) ? m.estado : 'enviado';
      r.pedidos.push({ id: p.id, de: p.de, branch: p.branch, titulo: p.titulo, resumo: p.resumo, criado: p.criado, estado, motivo: p.motivo || '' });
    }
    return r;
  }

  function comecar(projId, pasta, did) {
    const conta = contas.contaAtual();
    if (!validId(projId) || !validDid(did)) return { ok: false, motivo: 'Pedido inválido.' };
    if (!pasta || !fs.existsSync(pasta)) return { ok: false, motivo: 'A pasta do projeto não foi encontrada neste Termix. Adicione a pasta do projeto ao Termix (o Termix não clona nada sozinho) e tente de novo.' };
    if (!conta) return { ok: false, motivo: 'Escolha a conta deste PC em Configurações (Conta neste PC, provisório).' };
    const pp = lerPapel(pasta);
    if (!pp.git || !pp.remoto) return { ok: false, motivo: 'O projeto precisa de git e do remoto origin.' };
    if (gitRun(pasta, ['fetch', '--quiet', 'origin'], 120000).ok === false) return { ok: false, motivo: 'Não foi possível buscar o remoto. Confira a rede e tente de novo.' };
    const j = parseJson(showRef(pasta, 'refs/remotes/origin/dev1', IDX_REL) || '');
    const p = j && Array.isArray(j.pedidos) ? j.pedidos.find((x) => x && x.id === did) : null;
    if (!p || p.para !== conta || !DEVS.includes(p.branch)) return { ok: false, motivo: 'Este pedido não é para a conta deste PC.' };
    const b = p.branch;
    if (p.estado === 'aprovado' || p.estado === 'reprovado') return { ok: false, motivo: `Este pedido já foi ${p.estado}.` };
    const jaIniciou = marcadorDoDev(pasta, p);
    // 1) a branch do pedido: confere ou troca (sem forçar; com mudanças não salvas, não troca)
    const atual = headOf(pasta);
    if (atual !== b) {
      if (sujo(pasta)) return { ok: false, motivo: `O projeto tem mudanças não salvas na branch "${atual}". Salve (commit) ou guarde essas mudanças e tente de novo; o Termix não descarta nada.` };
      const local = temRef(pasta, `refs/heads/${b}`);
      if (!local && !temRef(pasta, `refs/remotes/origin/${b}`)) return { ok: false, motivo: `A branch ${b} ainda não existe no remoto. Peça ao responsável para conferir o envio do pedido.` };
      const co = local ? gitRun(pasta, ['checkout', b], 60000) : gitRun(pasta, ['checkout', '-b', b, '--track', `origin/${b}`], 60000);
      if (!co.ok) return { ok: false, motivo: `Não foi possível trocar para a ${b} (${linha1(co)}).` };
    } else if (sujo(pasta)) return { ok: false, motivo: `O projeto tem mudanças não salvas na ${b}. Salve (commit) e tente de novo; o Termix não descarta nada.` };
    // 2) sincroniza: o que a própria branch tem no remoto e depois a dev1 (como o fluxo manda), sem descartar
    if (temRef(pasta, `refs/remotes/origin/${b}`)) gitRun(pasta, ['merge', '--ff-only', `origin/${b}`], 60000);
    const mg = gitRun(pasta, ['merge', '--no-edit', 'refs/remotes/origin/dev1'], 60000);
    if (!mg.ok) { gitRun(pasta, ['merge', '--abort']); return { ok: false, motivo: `A junção da dev1 na ${b} deu conflito (cancelada, nada perdido). Resolva com /fluxo:sincronizar e tente de novo.` }; }
    // 3) o papel desta máquina: o CLAUDE.local.md é local (fora do git); só criado se não existir
    const num = b.slice(3), loc = path.join(pasta, 'CLAUDE.local.md');
    let papelCriado = false;
    const lp = readText(loc);
    if (lp == null) {
      fs.writeFileSync(loc, `# CLAUDE.local.md — papel desta máquina NESTE repositório (criado pelo Termix ao começar um pedido delegado)\n# Nunca deve ser commitado (listado no .gitignore).\n\nusuario:\n  nome: "${conta}"\n\npapel: "DEV${num}"          # DEV1 | DEV2 | DEV3 | DEV4 | DEV5 | GERENTE\n\nbranch_padrao: "${b}"\n`);
      papelCriado = true;
    } else {
      const pm = /^\s*papel:\s*"?([A-Za-z0-9]+)"?/m.exec(lp), bm = /^\s*branch_padrao:\s*"?([\w./-]+)"?/m.exec(lp);
      if (!pm || pm[1].toUpperCase() !== `DEV${num}` || !bm || bm[1] !== b) return { ok: false, motivo: `O papel desta máquina neste projeto (CLAUDE.local.md) não é DEV${num} na ${b}. Rode /fluxo:papel para ajustar e tente de novo. A troca de branch e a sincronização já foram feitas.` };
    }
    // 4) o pedido para o orquestrador (cópia do remoto, fora do repositório) e o marcador "em andamento" na devN
    const txt = showRef(pasta, 'refs/remotes/origin/dev1', relPedido(did));
    if (!txt) return { ok: false, motivo: 'O texto do pedido não está na dev1 do remoto.' };
    const dir = wdir(projId, did);
    fs.mkdirSync(dir, { recursive: true });
    const arquivo = path.join(dir, 'pedido.md');
    fs.writeFileSync(arquivo, `${txt}\n`);
    let enviado = true, aviso = '';
    if (!jaIniciou) {
      const agora = new Date().toISOString();
      const marc = { versao: 1, id: did, estado: 'em_andamento', conta, branch: b, data: agora, iniciado: agora };
      fs.mkdirSync(path.join(pasta, ...DIR_REL.split('/')), { recursive: true });
      fs.writeFileSync(path.join(pasta, ...relMarc(did).split('/')), `${JSON.stringify(marc, null, 2)}\n`);
      const ad = gitRun(pasta, ['add', '--', relMarc(did)]);
      if (!ad.ok) return { ok: false, motivo: `O git não aceitou o marcador (${linha1(ad)}).` };
      const cm = gitRun(pasta, ['commit', '-m', `DELEGAR: pedido ${did} em andamento (${conta})`, '--', relMarc(did)]);
      if (!cm.ok) return { ok: false, motivo: `O commit do marcador falhou (${linha1(cm)}).` };
      const ps = enviar(pasta, b, 'DELEGAR');
      if (!ps.ok) { enviado = false; aviso = `O marcador está no commit, mas ${ps.motivo} O responsável só verá o andamento depois do envio.`; }
    }
    return { ok: true, branch: b, arquivo, enviado, aviso, papelCriado, retomado: !!jaIniciou, titulo: p.titulo, de: p.de, resumo: p.resumo };
  }
  function comecarPrompt(projId, did) {
    const arq = path.join(wdir(projId, did), 'pedido.md');
    if (!validId(projId) || !validDid(did) || !fs.existsSync(arq)) return null;
    return pedido(projId, `delegar-comecar-${did}`, [
      'Você é o ORQUESTRADOR de quem recebeu esta tarefa delegada pelo responsável do projeto (DEV1).',
      `Leia o pedido em ${arq} e siga o fluxo do projeto (WORKFLOW.md e CLAUDE.md): trabalhe só na branch atual (devN), com commits TASK-xxx/DEVn, sem tocar na main, na dev1 nem nas outras branches, e respeite a seção "O que não fazer".`,
      'Planeje, execute e valide como o projeto manda. Quando terminar, avise o humano: o botão "Entregar" do Termix vai pedir o handoff e enviar a sua branch.',
    ].join('\n'));
  }
  // "Seguir com Vibe de tarefa": o rascunho da tarefa do Vibe (DEV2-017) preenchido pelas seções do pedido
  function vibeRascunho(projId, did) {
    const txt = readText(path.join(wdir(projId, did), 'pedido.md'));
    if (!validId(projId) || !validDid(did) || txt == null) return { ok: false, motivo: 'Comece o pedido antes (o texto dele ainda não foi trazido).' };
    const s = secoes(txt).out;
    const rf = path.join(dirOf(projId), 'rascunho.json');
    const atual = readJson(rf) || {};
    const lim = (v, n) => String(v || '').replace(/<!--[\s\S]*?-->/g, '').trim().slice(0, n);
    const tm = /^#\s+(.+)$/m.exec(txt);
    const tarefa = {
      oQue: lim(`${tm ? `${tm[1]}. ` : ''}${s.objetivo || ''}${s.contexto ? `\n\nContexto: ${s.contexto}` : ''}`, 4000),
      criterio: lim(s.pronto, 2000), naoPode: lim(s.nao, 2000), arquivos: lim(s.ler, 2000),
    };
    writeJson(rf, { ...atual, tarefa, delegar: did });
    return { ok: true, tarefa };
  }
  function entregarPrompt(projId, pasta, did) {
    const pp = lerPapel(pasta);
    if (!validId(projId) || !validDid(did) || !/^dev[2-5]$/.test(pp.atual)) return null;
    const rel = `docs/HANDOFF_DEV${pp.atual.slice(3)}.md`;
    return pedido(projId, `delegar-entregar-${did}`, [
      `Você é o ORQUESTRADOR do dev desta tarefa delegada. O trabalho terminou na branch ${pp.atual}.`,
      `Reescreva ${path.join(pasta, rel)} em alto nível para o responsável (DEV1): o que mudou e por quê, riscos, como validar e o status, respondendo ao "Resultado esperado" do pedido (${path.join(wdir(projId, did), 'pedido.md')}). Sem colar código, diffs nem trechos de arquivos. Mantenha o cabeçalho e as seções do arquivo, se existirem.`,
      'Não faça commit nem push: o Termix faz o commit do handoff e do marcador "entregue" e envia só a sua branch. Ao terminar, responda apenas HANDOFF GRAVADO e encerre o turno.',
    ].join('\n'));
  }
  function entregar(projId, pasta, did) {
    const conta = contas.contaAtual();
    if (!validId(projId) || !validDid(did)) return { ok: false, motivo: 'Pedido inválido.' };
    const pp = lerPapel(pasta);
    const b = pp.atual;
    if (!pp.git || !/^dev[2-5]$/.test(b)) return { ok: false, motivo: 'A entrega só vale numa branch de dev (dev2 a dev5).' };
    const p = (() => { const a = lerIndice(pasta).pedidos.find((x) => x.id === did); if (a) return a; const j = parseJson(showRef(pasta, 'refs/remotes/origin/dev1', IDX_REL) || ''); return j && Array.isArray(j.pedidos) ? j.pedidos.find((x) => x && x.id === did) : null; })();
    if (!p || p.branch !== b || p.para !== conta) return { ok: false, motivo: 'Este pedido não é desta branch e desta conta.' };
    const m = marcadorDoDev(pasta, p);
    if (!m || !['em_andamento', 'entregue'].includes(m.estado)) return { ok: false, motivo: 'Comece o pedido antes de entregar.' };
    const rel = `docs/HANDOFF_DEV${b.slice(3)}.md`, f = path.join(pasta, ...rel.split('/'));
    if (!fs.existsSync(f) || !(readText(f) || '').trim()) return { ok: false, motivo: `O orquestrador ainda não gravou ${rel}.` };
    if (fs.statSync(f).mtimeMs < Date.parse(m.data || m.iniciado || '') - 1000) return { ok: false, motivo: `O ${rel} é anterior ao início do pedido: peça ao orquestrador para reescrevê-lo.` };
    const agora = new Date().toISOString();
    const marc = { ...m, versao: 1, id: did, estado: 'entregue', conta, branch: b, data: agora, iniciado: m.iniciado || m.data || '', handoff: rel };
    fs.writeFileSync(path.join(pasta, ...relMarc(did).split('/')), `${JSON.stringify(marc, null, 2)}\n`);
    const ad = gitRun(pasta, ['add', '--', rel, relMarc(did)]);
    if (!ad.ok) return { ok: false, motivo: `O git não aceitou os arquivos da entrega (${linha1(ad)}).` };
    const cm = gitRun(pasta, ['commit', '-m', `DEV${b.slice(3)}: handoff e entrega do pedido ${did}`, '--', rel, relMarc(did)]);
    if (!cm.ok) return { ok: false, motivo: `O commit da entrega falhou (${linha1(cm)}).` };
    const sha = shaOf(pasta, 'HEAD');
    const ps = enviar(pasta, b, `DEV${b.slice(3)}`);
    if (!ps.ok) return { ok: false, motivo: `A entrega está no commit ${String(sha).slice(0, 8)}, mas ${ps.motivo}`, sha };
    return { ok: true, branch: b, arquivo: rel, sha: shaOf(pasta, 'HEAD'), integrou: ps.integrou };
  }

  const api = {
    delegConta: () => ({ conta: contas.contaAtual(), contas: contas.listarContas(), mock: true }),
    delegContaSet: (nome) => contas.definirConta(nome),
    delegInfo: (pasta) => (typeof pasta === 'string' && pasta ? info(pasta) : null),
    delegPedido: (id, pasta, d) => pedidoTarefa(id, pasta, d),
    delegConferir: (id, did) => conferir(id, did),
    delegEnviar: (id, pasta, did, o) => enviarPedido(id, pasta, did, o),
    delegPainel: (pasta, o) => (typeof pasta === 'string' && pasta ? painel(pasta, o) : null),
    delegAnalisar: (id, pasta, did) => analisar(id, pasta, did),
    delegDecidir: (id, pasta, did, dec, motivo) => decidir(id, pasta, did, dec, motivo),
    delegCaixa: (pasta) => caixa(pasta),
    delegComecar: (id, pasta, did) => comecar(id, pasta, did),
    delegComecarPrompt: (id, did) => comecarPrompt(id, did),
    delegVibe: (id, did) => vibeRascunho(id, did),
    delegEntregarPrompt: (id, pasta, did) => entregarPrompt(id, pasta, did),
    delegEntregar: (id, pasta, did) => entregar(id, pasta, did),
  };
  return { api, info, secoes };
}

module.exports = { create, secoes, SECOES, DEVS };
