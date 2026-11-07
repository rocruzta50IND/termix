'use strict';
/* Mutirão (DEV2-005): lado do processo principal. Criado pelo src/vibe/index.js, que registra os canais 'vibe:mut*'.
   Quem divide é o orquestrador do DONO (aba "Mutirão · Orquestrador", com a trava do Vibe); quem confere, publica, entrega
   e conta é o Termix (este código, zero token):
   - mutirao/divisao.json e mutirao/partes/<branch>.md: gravados pelo orquestrador na pasta do projeto do dono;
   - conferência: uma parte por participante, cada .md com as 9 seções e NENHUM arquivo/pasta em comum entre as partes;
   - publicar: commit só da pasta mutirao/ na branch do dono e push só dela (nunca main/master);
   - lado do sócio: projeto na branch <b> com mutirao/partes/<b>.md = "Você tem uma parte"; a entrega do Vibe é
     pré-preenchida; ao concluir, o Termix grava mutirao/entregas/<b>.json, faz commit e push só da branch <b>;
   - contador do dono: git fetch + git show origin/<b>:mutirao/entregas/<b>.json de cada participante.
   Estado em <userData>\vibe\<id>\mutirao.json ({ dono: {...} } ou { socio: {...} }). Desenho: docs/VIBE_MUTIRAO.md. */
const fs = require('fs');
const path = require('path');

const PROTEGIDAS = ['main', 'master'];
const MUT_NAME = 'Mutirão · Orquestrador';
const BRANCH_RE = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,59}$/;
const validBranch = (b) => typeof b === 'string' && BRANCH_RE.test(b) && !b.includes('..') && !b.endsWith('/') && !b.endsWith('.lock') && !PROTEGIDAS.includes(b.toLowerCase());

// Caminho de uma parte normalizado para comparar: barras "/", sem "./" no início nem "/" no fim, sem diferença de caixa.
// Curingas (* ? [) valem como a pasta antes deles ("src/**/*.js" = "src").
function normPath(p) {
  let s = String(p || '').trim().replace(/\\/g, '/').replace(/^(\.\/)+/, '').replace(/\/{2,}/g, '/');
  const w = s.search(/[*?[]/);
  if (w >= 0) s = s.slice(0, w).replace(/[^/]*$/, '');
  return s.replace(/\/+$/, '').toLowerCase();
}
// Arquivos em comum entre as partes: iguais, ou um dentro da pasta do outro. Caminho vazio/"."/fora da raiz = o projeto todo.
function conflitos(partes) {
  const out = [];
  const lista = partes.map((pt) => ({ branch: pt.branch, arq: (pt.arquivos || []).map((a) => ({ orig: String(a), n: normPath(a) })) }));
  for (const pt of lista) for (const a of pt.arq) if (!a.n || a.n === '.' || a.n.startsWith('../') || /^[a-z]:/.test(a.n) || a.n.startsWith('/')) out.push({ a: pt.branch, b: '', arquivo: a.orig || '(vazio)', motivo: 'caminho vazio, a raiz do projeto inteiro ou fora dele' });
  const dentro = (x, y) => x === y || y.startsWith(`${x}/`) || x.startsWith(`${y}/`);
  for (let i = 0; i < lista.length; i++) {
    for (let j = i + 1; j < lista.length; j++) {
      for (const a of lista[i].arq) for (const b of lista[j].arq) {
        if (a.n && b.n && dentro(a.n, b.n)) out.push({ a: lista[i].branch, b: lista[j].branch, arquivo: a.n === b.n ? a.orig : `${a.orig} × ${b.orig}`, motivo: a.n === b.n ? 'o mesmo caminho' : 'um está dentro da pasta do outro' });
      }
    }
  }
  return out;
}

function create(h) {
  const { dirOf, readJson, writeJson, gitRun, shaOf, headOf, checkStructure, validId, TEST, logError = () => {} } = h;
  const fileOf = (id) => path.join(dirOf(id), 'mutirao.json');
  const ler = (id) => (validId(id) && readJson(fileOf(id))) || {};
  const grava = (id, k, v) => { const m = ler(id); m[k] = v ? { ...v, atualizado: new Date().toISOString() } : undefined; writeJson(fileOf(id), m); return m[k]; };
  const exists = (f) => { try { return fs.statSync(f).isFile(); } catch { return false; } };
  const readText = (f) => { try { return fs.readFileSync(f, 'utf8').replace(/^﻿/, ''); } catch { return null; } };
  const parseJson = (t) => { try { return JSON.parse(String(t).replace(/^﻿/, '').replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, '')); } catch { return null; } };

  // Quem é o dono. Projeto com fluxo Rocruzta (.claude/fluxo.json): dono = papel DEV1 no CLAUDE.local.md, branch do dono =
  // branch_padrao. Sem fluxo: qualquer um pode usar (exige um remoto git); branch do dono = a atual, ou "dev1" se a atual for
  // main/master (criada a partir dela pelo Termix ao publicar, sem descartar nada).
  function papel(pasta) {
    const r = { pasta, git: false, fluxo: false, papel: '', dono: false, branchDono: '', criar: false, atual: '', remoto: '', motivo: '' };
    if (!pasta || !fs.existsSync(pasta)) { r.motivo = 'A pasta do projeto não foi encontrada.'; return r; }
    r.git = gitRun(pasta, ['rev-parse', '--is-inside-work-tree']).ok;
    r.atual = r.git ? headOf(pasta) : '';
    const rm = r.git ? gitRun(pasta, ['remote', 'get-url', 'origin']) : { ok: false };
    r.remoto = rm.ok ? rm.out : '';
    r.fluxo = fs.existsSync(path.join(pasta, '.claude', 'fluxo.json'));
    if (r.fluxo) {
      const loc = readText(path.join(pasta, 'CLAUDE.local.md')) || '';
      const pm = /^\s*papel:\s*"?([A-Za-z0-9]+)"?/m.exec(loc), bm = /^\s*branch_padrao:\s*"?([\w./-]+)"?/m.exec(loc);
      r.papel = pm ? pm[1].toUpperCase() : '';
      r.dono = r.papel === 'DEV1';
      r.branchDono = r.dono && bm && validBranch(bm[1]) ? bm[1] : '';
      if (!r.papel) r.motivo = 'O projeto usa o fluxo Rocruzta, mas esta máquina não tem papel (CLAUDE.local.md). Só o DEV1 usa o Mutirão.';
      else if (!r.dono) r.motivo = `Nesta máquina o seu papel é ${r.papel}. Só o dono do projeto (DEV1) divide o trabalho no Mutirão.`;
      else if (!r.branchDono) r.motivo = 'O CLAUDE.local.md do DEV1 não tem uma branch válida (branch_padrao); main/master não vale.';
    } else {
      r.dono = true;
      if (!r.git) r.motivo = 'O projeto não tem git. O Mutirão exige git e um remoto (origin) que todos os sócios acessem.';
      else if (validBranch(r.atual)) r.branchDono = r.atual;
      else { r.branchDono = 'dev1'; r.criar = !shaOf(pasta, 'refs/heads/dev1'); }
    }
    if (r.dono && !r.motivo && !r.remoto) r.motivo = 'O Mutirão exige um remoto git (origin) que todos os sócios acessem. Configure o origin e abra a tela de novo.';
    r.pode = r.dono && !r.motivo;
    return r;
  }

  // Parte do sócio: o projeto está na branch <b> e existe mutirao/partes/<b>.md na pasta (depois de sincronizar com a do dono).
  function parte(pasta) {
    if (!pasta || !fs.existsSync(pasta)) return { tem: false };
    const b = headOf(pasta);
    if (!b || !validBranch(b)) return { tem: false, branch: b };
    const md = path.join(pasta, 'mutirao', 'partes', `${b}.md`);
    if (!exists(md)) return { tem: false, branch: b };
    const div = parseJson(readText(path.join(pasta, 'mutirao', 'divisao.json')) || '') || {};
    const pt = (Array.isArray(div.partes) ? div.partes : []).find((x) => x && x.branch === b) || {};
    const part = (Array.isArray(div.participantes) ? div.participantes : []).find((x) => x && x.branch === b) || {};
    const ent = parseJson(readText(path.join(pasta, 'mutirao', 'entregas', `${b}.json`)) || '');
    const est = checkStructure(readText(md) || '');
    return {
      tem: true, branch: b, arquivo: md, nome: String(part.nome || '').slice(0, 80), titulo: String(pt.titulo || '').slice(0, 160),
      objetivo: String(pt.objetivo || '').slice(0, 300), criterio: String(pt.criterio || '').slice(0, 4000),
      arquivos: Array.isArray(pt.arquivos) ? pt.arquivos.slice(0, 200).map(String) : [], branchDono: String(div.branchDono || '').slice(0, 60),
      estruturaOk: est.ok, entregue: ent ? { data: ent.data || '', commits: Array.isArray(ent.commits) ? ent.commits.length : 0 } : null,
    };
  }

  // Pedido ao orquestrador do dono. O Termix grava as instruções em mutirao/PEDIDO.md (fica fora do commit da divisão) e
  // digita só uma linha que aponta para ele: no teste, um texto longo digitado na aba recém-aberta chegou cortado.
  function prompt(id) {
    const d = ler(id).dono;
    if (!d || !Array.isArray(d.participantes) || !d.participantes.length) return null;
    const pf = path.join(d.projeto.pasta, 'mutirao', 'PEDIDO.md');
    fs.mkdirSync(path.dirname(pf), { recursive: true });
    fs.writeFileSync(pf, `# Pedido do Termix ao orquestrador do Mutirão\n\n${pedidoTexto(d)}\n`);
    return 'Mutirão do Termix: leia e siga mutirao/PEDIDO.md.';
  }
  function pedidoTexto(d) {
    const lista = d.participantes.map((p) => `${p.nome} (branch ${p.branch})`).join(', ');
    return `Você é o ORQUESTRADOR do Mutirão do Termix neste projeto. Divida o trabalho que falta entre: ${lista}. Leia só o necessário (CLAUDE.md, README, docs e a estrutura de pastas; sem ler o código inteiro). Grave, sem escrever nada fora da pasta mutirao/ do projeto: 1) mutirao/divisao.json = {"branchDono":"${d.branchDono}","participantes":[{"nome":"...","branch":"..."}],"partes":[{"branch":"...","titulo":"...","objetivo":"até 300 caracteres","criterio":"como saber que a parte acabou","arquivos":["arquivos ou pastas, relativos à raiz"]}]}, uma parte por participante, SEM nenhum arquivo ou pasta em comum entre as partes (uma pasta conta como tudo dentro dela; o Termix confere e recusa); 2) mutirao/partes/<branch>.md de cada um, com as 9 seções preenchidas: Objetivo, Público e usuários, Funcionalidades, Fora do escopo (inclua os arquivos das outras partes), Telas e fluxos, Dados e regras de negócio, Integrações e acessos, Tecnologia, Critério de pronto. Não altere o código nem este PEDIDO.md, não faça commit nem push: quem publica é o Termix. Ao terminar, responda apenas DIVISÃO GRAVADA e um resumo de até 3 linhas.`;
  }

  // Conferência do Termix (zero token): formato, uma parte por participante, as 9 seções e nenhum arquivo em comum.
  function conferir(id) {
    const m = ler(id), d = m.dono;
    if (!d || !d.projeto || !d.projeto.pasta) return { ok: false, problemas: ['O Mutirão deste projeto não foi iniciado.'] };
    const pasta = d.projeto.pasta, base = path.join(pasta, 'mutirao');
    const r = { ok: false, problemas: [], avisos: [], partes: [], conflitos: [], data: new Date().toISOString() };
    const raw = readText(path.join(base, 'divisao.json'));
    if (raw == null) { r.problemas.push('O orquestrador ainda não gravou mutirao/divisao.json.'); return r; }
    const div = parseJson(raw);
    if (!div || !Array.isArray(div.partes)) { r.problemas.push('O mutirao/divisao.json não está no formato pedido (falta a lista "partes").'); return r; }
    const quer = (d.participantes || []).map((p) => p.branch);
    const vistas = new Set();
    for (const pt of div.partes) {
      const b = pt && String(pt.branch || '');
      if (!b) { r.problemas.push('Há uma parte sem branch no divisao.json.'); continue; }
      if (vistas.has(b)) r.problemas.push(`A branch ${b} aparece em duas partes.`);
      vistas.add(b);
      if (!quer.includes(b)) r.problemas.push(`A parte da branch ${b} não é de nenhum participante.`);
      const arquivos = Array.isArray(pt.arquivos) ? pt.arquivos.map(String).filter((x) => x.trim()) : [];
      if (!arquivos.length) r.problemas.push(`A parte de ${b} não lista arquivos ou pastas.`);
      const mdf = path.join(base, 'partes', `${b}.md`);
      const txt = readText(mdf);
      const est = txt == null ? null : checkStructure(txt);
      if (!est) r.problemas.push(`Falta mutirao/partes/${b}.md.`);
      else if (!est.ok) r.problemas.push(`mutirao/partes/${b}.md: ${[est.missing.length && `faltam ${est.missing.join(', ')}`, est.empty.length && `sem conteúdo: ${est.empty.join(', ')}`].filter(Boolean).join('; ')}.`);
      const nome = ((d.participantes || []).find((p) => p.branch === b) || {}).nome || '';
      r.partes.push({ branch: b, nome, titulo: String(pt.titulo || '').slice(0, 160), objetivo: String(pt.objetivo || '').slice(0, 300), arquivos: arquivos.slice(0, 200), mdOk: !!(est && est.ok) });
    }
    for (const b of quer) if (!vistas.has(b)) r.problemas.push(`Falta a parte de ${b}.`);
    r.conflitos = conflitos(r.partes);
    for (const c of r.conflitos) r.problemas.push(c.b ? `Arquivo em comum entre ${c.a} e ${c.b}: ${c.arquivo} (${c.motivo}).` : `Parte de ${c.a}: ${c.arquivo} (${c.motivo}).`);
    // o orquestrador só deveria ter gravado em mutirao/: o Termix avisa o que mudou fora (e publica só a pasta mutirao/)
    const st = gitRun(pasta, ['status', '--porcelain', '--untracked-files=all']);
    if (st.ok) {
      const fora = st.out.split('\n').map((l) => l.slice(3).trim()).filter((f) => f && !/^"?mutirao\//.test(f));
      if (fora.length) r.avisos.push(`Há mudanças fora de mutirao/ no projeto (${fora.slice(0, 5).join(', ')}${fora.length > 5 ? '…' : ''}). O Termix publica só a pasta mutirao/.`);
    }
    r.ok = !r.problemas.length;
    const atual = ler(id).dono;
    grava(id, 'dono', { ...atual, conferencia: r, fase: atual.publicado ? 'publicada' : r.ok ? 'conferida' : 'divisao' });
    return r;
  }

  // Publicar: commit só de mutirao/ na branch do dono e push só dela. Nunca main/master, nunca descarta nada.
  function publicar(id) {
    const d = ler(id).dono;
    if (!d) return { ok: false, motivo: 'O Mutirão deste projeto não foi iniciado.' };
    const pasta = d.projeto.pasta;
    const pp = papel(pasta);
    if (!pp.pode) return { ok: false, motivo: pp.motivo || 'Só o dono do projeto publica a divisão.' };
    const conf = conferir(id);
    if (!conf.ok) return { ok: false, motivo: 'A divisão não passou na conferência.', conferencia: conf };
    const br = pp.branchDono;
    if (!validBranch(br)) return { ok: false, motivo: 'A branch do dono não é válida (main/master não vale).' };
    if (headOf(pasta) !== br) {
      const sw = gitRun(pasta, shaOf(pasta, `refs/heads/${br}`) ? ['switch', br] : ['switch', '-c', br]);
      if (!sw.ok) return { ok: false, motivo: `O Termix não conseguiu ir para a branch "${br}" sem descartar nada (${(sw.err || '').split('\n')[0].slice(0, 200)}). Guarde as mudanças e tente de novo.` };
    }
    if (headOf(pasta) !== br) return { ok: false, motivo: `O projeto não está na branch "${br}".` };
    const SPEC = ['mutirao/divisao.json', 'mutirao/partes']; // o PEDIDO.md fica fora do commit
    const add = gitRun(pasta, ['add', '--', ...SPEC]);
    if (!add.ok) return { ok: false, motivo: `git add falhou: ${(add.err || '').slice(0, 200)}` };
    const pend = gitRun(pasta, ['diff', '--cached', '--name-only', '--', ...SPEC]);
    let sha = shaOf(pasta, 'HEAD');
    if (pend.ok && pend.out) {
      const nomes = d.participantes.map((p) => `${p.nome} (${p.branch})`).join(', ');
      const cm = gitRun(pasta, ['commit', '-m', `Mutirao: divisao do trabalho (${d.participantes.length} partes)`, '-m', `Participantes: ${nomes}. Gravado pelo Termix.`, '--', ...SPEC]);
      if (!cm.ok) return { ok: false, motivo: `O commit falhou: ${(cm.err || cm.out || '').split('\n').slice(0, 2).join(' ').slice(0, 300)}` };
      sha = shaOf(pasta, 'HEAD');
    }
    const ps = gitRun(pasta, ['push', 'origin', `refs/heads/${br}:refs/heads/${br}`], 60000);
    if (!ps.ok) return { ok: false, motivo: `O commit foi feito (${String(sha).slice(0, 8)}), mas o push falhou: ${(ps.err || '').split('\n').slice(-2).join(' ').slice(0, 300)}. Confira o acesso ao remoto e publique de novo.`, sha };
    const pub = { sha, branch: br, data: new Date().toISOString() };
    grava(id, 'dono', { ...ler(id).dono, fase: 'publicada', publicado: pub, branchDono: br });
    return { ok: true, ...pub };
  }

  // Contador do dono: git fetch e, para cada participante, git show origin/<b>:mutirao/entregas/<b>.json (zero token).
  function contador(id) {
    const d = ler(id).dono;
    if (!d) return null;
    const pasta = d.projeto.pasta;
    const fe = gitRun(pasta, ['fetch', 'origin', '--quiet'], 60000);
    const lista = (d.participantes || []).map((p) => {
      const s = gitRun(pasta, ['show', `refs/remotes/origin/${p.branch}:mutirao/entregas/${p.branch}.json`]);
      const j = s.ok ? parseJson(s.out) : null;
      return { nome: p.nome, branch: p.branch, entregue: !!j, data: j ? String(j.data || '') : '', commits: j && Array.isArray(j.commits) ? j.commits.length : 0, resumo: j ? String(j.resumo || '').slice(0, 300) : '' };
    });
    const c = { k: lista.filter((x) => x.entregue).length, n: lista.length, lista, atualizado: new Date().toISOString(), fetch: fe.ok ? '' : (fe.err || 'git fetch falhou').split('\n')[0].slice(0, 200) };
    grava(id, 'dono', { ...ler(id).dono, contador: c });
    return c;
  }

  // Sócio: registra a parte (a branch do Vibe passa a ser a da parte) e pré-preenche o rascunho do Vibe com ela.
  function aplicar(id, pasta) {
    const pt = parte(pasta);
    if (!pt.tem) return { ok: false, motivo: 'Não há parte do Mutirão para a branch atual deste projeto.' };
    grava(id, 'socio', { branch: pt.branch, arquivo: pt.arquivo, titulo: pt.titulo, projeto: { id, pasta }, aplicado: new Date().toISOString() });
    const rf = path.join(dirOf(id), 'rascunho.json');
    const atual = readJson(rf) || {};
    const objetivo = (pt.objetivo || `Parte do Mutirão: ${pt.titulo || pt.branch}`).slice(0, 300);
    const criterio = pt.criterio || 'Ver a seção "Critério de pronto" da parte.';
    writeJson(rf, { ...atual, objetivo: atual.mutirao === pt.branch && atual.objetivo ? atual.objetivo : objetivo, criterio: atual.mutirao === pt.branch && atual.criterio ? atual.criterio : criterio, estrutura: pt.arquivo, fluxo: atual.fluxo || '', proibido: atual.proibido || `Não alterar arquivos fora da sua parte do Mutirão: ${pt.arquivos.slice(0, 30).join(', ')}${pt.arquivos.length > 30 ? '…' : ''}.`.slice(0, 4000), acessos: atual.acessos || '', nadaFornecer: !!atual.nadaFornecer, mutirao: pt.branch, projectId: id, salvo: new Date().toISOString() });
    return { ok: true, parte: pt };
  }
  const socioDe = (id) => { const s = ler(id).socio; return s && validBranch(s.branch) ? s : null; };

  // Entrega do sócio (Vibe em "Projeto concluído"): grava mutirao/entregas/<b>.json, commit e push só da branch <b>.
  function entregar(id, info) {
    const s = socioDe(id);
    if (!s) return { ok: false, motivo: 'Este projeto não tem uma parte do Mutirão registrada.' };
    const pasta = s.projeto.pasta, b = s.branch;
    if (headOf(pasta) !== b) return { ok: false, motivo: `O projeto não está na branch "${b}" da sua parte; a entrega não foi gravada.` };
    if (!gitRun(pasta, ['remote', 'get-url', 'origin']).ok) return { ok: false, motivo: 'O projeto não tem o remoto origin; a entrega não foi enviada.' };
    const feitas = Array.isArray(info && info.feitas) ? info.feitas.slice(0, 200) : [];
    const desde = info && info.desde ? String(info.desde) : '';
    const lg = gitRun(pasta, ['log', '--format=%h %s', '-n', '200', ...(desde ? [`--since=${desde}`] : []), `refs/heads/${b}`]);
    const commits = lg.ok && lg.out ? lg.out.split('\n').slice(0, 200) : [];
    const rel = `mutirao/entregas/${b}.json`;
    const dados = { versao: 1, branch: b, data: new Date().toISOString(), titulo: s.titulo || '', commits, tarefas: feitas.map((f) => ({ id: String(f.id || ''), titulo: String(f.titulo || '').slice(0, 160), commit: String(f.commit || '').slice(0, 160), humano: !!f.humano })), resumo: String((info && info.resumo) || `${feitas.length} tarefas concluídas pelo Vibe Coding.`).slice(0, 1000), teste: TEST && info && info.teste ? true : undefined };
    writeJson(path.join(pasta, ...rel.split('/')), dados);
    const add = gitRun(pasta, ['add', '--', rel]);
    if (!add.ok) return { ok: false, motivo: `git add falhou: ${(add.err || '').slice(0, 200)}` };
    const cm = gitRun(pasta, ['commit', '-m', `Mutirao: entrega da parte ${b}`, '--', rel]);
    if (!cm.ok && !/nothing|nada/i.test(cm.out + cm.err)) return { ok: false, motivo: `O commit da entrega falhou: ${(cm.err || cm.out).split('\n')[0].slice(0, 200)}` };
    const ps = gitRun(pasta, ['push', 'origin', `refs/heads/${b}:refs/heads/${b}`], 60000);
    const out = { ok: ps.ok, sha: shaOf(pasta, 'HEAD'), branch: b, data: dados.data, motivo: ps.ok ? '' : `Entrega gravada e no commit, mas o push falhou: ${(ps.err || '').split('\n').slice(-2).join(' ').slice(0, 300)}` };
    grava(id, 'socio', { ...s, entrega: out });
    return out;
  }

  function estado(id, pasta) {
    const m = ler(id);
    const pp = papel(pasta);
    return { dono: m.dono || null, socio: m.socio || null, papel: pp, parte: parte(pasta) };
  }
  // soProjeto: só registra o projeto (para abrir o chat antes de definir os participantes)
  function iniciar(id, projeto, participantes, soProjeto) {
    if (!validId(id) || !projeto || !projeto.pasta) return { ok: false, motivo: 'Projeto inválido.' };
    const pp = papel(projeto.pasta);
    if (!pp.dono) return { ok: false, motivo: pp.motivo || 'Só o dono do projeto usa o Mutirão.' };
    const cur0 = ler(id).dono || {};
    if (soProjeto) return { ok: true, dono: grava(id, 'dono', { versao: 1, participantes: [], fase: 'divisao', iniciado: new Date().toISOString(), ...cur0, projeto: { id, nome: String(projeto.nome || '').slice(0, 120), pasta: projeto.pasta }, branchDono: pp.branchDono }) };
    const lista = (Array.isArray(participantes) ? participantes : []).map((p) => ({ nome: String((p && p.nome) || '').trim().slice(0, 60), branch: String((p && p.branch) || '').trim() })).filter((p) => p.nome || p.branch);
    const prob = [];
    if (!lista.length) prob.push('Informe pelo menos um participante.');
    lista.forEach((p, i) => { if (!p.nome) prob.push(`Participante ${i + 1}: falta o nome.`); if (!validBranch(p.branch)) prob.push(`Participante ${i + 1}: branch "${p.branch}" inválida (ex.: dev2; main/master não vale).`); else if (p.branch === pp.branchDono) prob.push(`Participante ${i + 1}: a branch ${p.branch} é a do dono.`); });
    const bs = lista.map((p) => p.branch);
    if (new Set(bs).size !== bs.length) prob.push('Duas pessoas com a mesma branch.');
    if (prob.length) return { ok: false, problemas: prob };
    const cur = ler(id).dono || {};
    const d = grava(id, 'dono', { ...cur, versao: 1, projeto: { id, nome: String(projeto.nome || '').slice(0, 120), pasta: projeto.pasta }, branchDono: pp.branchDono, participantes: lista, fase: cur.fase === 'publicada' ? 'publicada' : (cur.fase || 'divisao'), iniciado: cur.iniciado || new Date().toISOString() });
    return { ok: true, dono: d };
  }
  function setAba(id, tabId) { const d = ler(id).dono; if (!d || typeof tabId !== 'string') return false; grava(id, 'dono', { ...d, orq: tabId, abas: [...new Set([...(d.abas || []), tabId])].slice(-20) }); return true; }
  function setGerado(id, desde) { const d = ler(id).dono; if (!d) return false; grava(id, 'dono', { ...d, pedido: String(desde || new Date().toISOString()) }); return true; }

  // Aba do Mutirão para a trava (spawnSettings): registrada no mutirao.json, ou nova com o nome certo na pasta do projeto.
  function idDaAba(ids, tabId, cwd, nome, samePath) {
    for (const id of ids) { const d = ler(id).dono; if (d && (d.orq === tabId || (d.abas || []).includes(tabId))) return id; }
    if (nome !== MUT_NAME) return null;
    for (const id of ids) { const d = ler(id).dono; if (d && d.projeto && samePath(d.projeto.pasta, cwd)) { setAba(id, tabId); return id; } }
    return null;
  }
  const pastaDe = (id) => { const d = ler(id).dono; return d && d.projeto ? d.projeto.pasta : ''; };

  const api = {
    mutEstado: (id, pasta) => (validId(id) ? estado(id, pasta) : null),
    mutIniciar: iniciar,
    mutAba: setAba,
    mutPedido: setGerado,
    mutPrompt: (id) => (validId(id) ? prompt(id) : null),
    mutConferir: (id) => (validId(id) ? conferir(id) : null),
    mutPublicar: (id) => (validId(id) ? publicar(id) : { ok: false, motivo: 'Projeto inválido.' }),
    mutContador: (id) => (validId(id) ? contador(id) : null),
    mutParte: (pasta) => { try { return parte(pasta); } catch (e) { logError(e); return { tem: false }; } },
    mutAplicar: (id, pasta) => (validId(id) ? aplicar(id, pasta) : { ok: false, motivo: 'Projeto inválido.' }),
    mutEntregar: (id, info) => (validId(id) ? entregar(id, info) : { ok: false, motivo: 'Projeto inválido.' }),
  };
  return { api, socioDe, idDaAba, pastaDe, MUT_NAME };
}

module.exports = { create, conflitos, normPath, validBranch, MUT_NAME };
