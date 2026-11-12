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
// Nomes do git status --porcelain. O gitRun tira o espaço do início da 1ª linha (" M x" chega como "M x"): por isso o
// prefixo de 1 ou 2 letras de estado é tirado por expressão, não por posição (DEV2-006).
const porcelain = (out) => String(out || '').split('\n').map((l) => l.replace(/^[ MADRCUT?!]{1,2} /, '').trim()).filter(Boolean);
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
    const dono = d.participantes.find((p) => p.branch === d.branchDono);
    const intro = d.modo === 'tarefas'
      ? `Você é o ORQUESTRADOR do Mutirão do Termix neste projeto, que JÁ ESTÁ EM ANDAMENTO (modo "Delegar algumas tarefas"). NÃO divida o projeto inteiro: escreva UMA TAREFA para cada participante (${lista}), com o que fazer e o resultado esperado, conversando com o dono no chat sobre o que cada um vai fazer. As tarefas não podem ter arquivo em comum entre si${dono ? `, inclusive a do próprio dono (${dono.nome}, branch ${d.branchDono}), que segue trabalhando na branch dele` : '; o dono segue trabalhando na branch dele em outra parte, então evite os arquivos que ele indicar'}. Em divisao.json, "objetivo" e "criterio" descrevem o conjunto das tarefas; cada parte é uma tarefa.`
      : d.modo === 'estado_atual'
      ? `Você é o ORQUESTRADOR do Mutirão do Termix neste projeto, que JÁ ESTÁ EM ANDAMENTO (modo "Do estado atual até finalizar"). Primeiro veja o que já está feito (README, docs, TASKS, ROADMAP e a estrutura de pastas do estado atual do repositório). Depois divida TODO O RESTANTE do projeto, do estado atual até finalizar, entre: ${lista}; cada um fica com a sua parte até o fim${dono ? ` (o dono, ${dono.nome}, também tem uma parte, na branch ${d.branchDono})` : ''}. Não repita o que já está pronto. Em divisao.json, "objetivo" e "criterio" são os do projeto finalizado.`
      : `Você é o ORQUESTRADOR do Mutirão do Termix neste projeto NOVO. Divida o projeto INTEIRO (100%) entre: ${lista}; cada um fica com a sua parte do início ao fim${dono ? ` (o dono, ${dono.nome}, também tem uma parte, na branch ${d.branchDono})` : ''}.${d.entrega && d.entrega.estrutura ? ' A estrutura do projeto enviada pelo dono está em mutirao/estrutura.md: leia-a primeiro e cubra tudo o que ela descreve.' : ''}${d.entrega && d.entrega.objetivo ? ` Objetivo do projeto: ${d.entrega.objetivo}.` : ''}${d.entrega && d.entrega.criterio ? ` Critério de pronto do projeto: ${d.entrega.criterio}.` : ''}`;
    return `${intro} Leia só o necessário (CLAUDE.md, README, docs e a estrutura de pastas; sem ler o código inteiro). Grave, sem escrever nada fora da pasta mutirao/ do projeto: 1) mutirao/divisao.json = {"branchDono":"${d.branchDono}","objetivo":"objetivo do projeto inteiro, até 300 caracteres","criterio":"critério de pronto do projeto inteiro","participantes":[{"nome":"...","branch":"..."}],"partes":[{"branch":"...","titulo":"...","objetivo":"até 300 caracteres","criterio":"como saber que a parte acabou","arquivos":["arquivos ou pastas, relativos à raiz"]}]}, uma parte por participante, SEM nenhum arquivo ou pasta em comum entre as partes (uma pasta conta como tudo dentro dela; o Termix confere e recusa); 2) mutirao/partes/<branch>.md de cada um, com as 9 seções preenchidas: Objetivo, Público e usuários, Funcionalidades, Fora do escopo (inclua os arquivos das outras partes), Telas e fluxos, Dados e regras de negócio, Integrações e acessos, Tecnologia, Critério de pronto. Não altere o código nem este PEDIDO.md, não faça commit nem push: quem publica é o Termix. Ao terminar, responda apenas DIVISÃO GRAVADA e um resumo de até 3 linhas.`;
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
      const fora = porcelain(st.out).filter((f) => !/^"?mutirao\//.test(f));
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
    const SPEC = ['mutirao/divisao.json', 'mutirao/partes', ...(exists(path.join(pasta, 'mutirao', 'estrutura.md')) ? ['mutirao/estrutura.md'] : [])]; // o PEDIDO.md fica fora do commit; estrutura.md = a do dono (DEV2-023)
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

  // DEV2-023: fase do mutirão do dono, para o painel e a pasta "Mutirão" da barra lateral (lida do mutirao.json, sem git
  // nem IA). Dividindo → Aguardando entregas (k/N) → Juntando → Conflitos → Planejando → Executando → Concluído.
  function faseDe(d) {
    if (!d) return null;
    const a = d.auto, ct = d.contador, n = (d.participantes || []).length;
    if (a) {
      if (a.fase === 'concluido') return { k: 'concluido', l: 'Concluído' };
      if (a.fase === 'push') return { k: 'concluido', l: 'Concluído (falta enviar a branch)' };
      if (a.fase === 'juntando') return { k: 'juntando', l: `Juntando entregas (${a.k || 0}/${a.n || n})` };
      if (a.fase === 'erro') return { k: 'juntando', l: 'Juntando entregas (parou)' };
      if (a.fase === 'executando') return { k: 'executando', l: 'Executando' };
      const ruins = (a.juncoes || []).filter((j) => j.status === 'conflito' || j.status === 'erro').length;
      if (ruins) return { k: 'conflitos', l: `Conflitos: ${ruins}` };
      return { k: 'planejando', l: a.fase === 'parado' ? 'Planejando (parado)' : 'Planejando' };
    }
    if (!d.publicado) return { k: 'dividindo', l: 'Dividindo' };
    if (ct && ct.n && ct.k === ct.n) return { k: 'entregue', l: `Todas as entregas (${ct.k}/${ct.n})` };
    return { k: 'aguardando', l: `Aguardando entregas (${ct ? `${ct.k}/${ct.n}` : `?/${n}`})` };
  }
  function estado(id, pasta) {
    const m = ler(id);
    const pp = papel(pasta);
    return { dono: m.dono || null, socio: m.socio || null, papel: pp, parte: parte(pasta), fase: faseDe(m.dono) };
  }
  // DEV2-023: resumo dos mutirões (projetos com o lado do dono) para a pasta "Mutirão" da barra lateral. Só lê os arquivos.
  function lista(ids) {
    return (Array.isArray(ids) ? ids : []).filter(validId).slice(0, 500).map((id) => {
      const d = ler(id).dono;
      if (!d || !d.projeto) return null;
      const ct = d.contador;
      return { id, modo: d.modo || 'projeto', publicado: !!d.publicado, k: ct ? ct.k : 0, n: ct ? ct.n : (d.participantes || []).length, contado: !!ct, ent: ct ? ct.lista.filter((x) => x.entregue).map((x) => x.branch) : [], nomes: Object.fromEntries((d.participantes || []).map((p) => [p.branch, p.nome])), fase: faseDe(d) };
    }).filter(Boolean);
  }
  // soProjeto: só registra o projeto (para abrir o chat antes de definir os participantes)
  // opts (DEV2-023): { modo: 'projeto' (a: projeto novo, 100% dividido) | 'estado_atual' (b1: do estado atual até finalizar) | 'tarefas' (b2: delegar algumas tarefas), entrega: { objetivo, criterio, estrutura (.md) } }
  function iniciar(id, projeto, participantes, soProjeto, opts) {
    if (!validId(id) || !projeto || !projeto.pasta) return { ok: false, motivo: 'Projeto inválido.' };
    const pp = papel(projeto.pasta);
    if (!pp.dono) return { ok: false, motivo: pp.motivo || 'Só o dono do projeto usa o Mutirão.' };
    const cur0 = ler(id).dono || {};
    if (soProjeto) return { ok: true, dono: grava(id, 'dono', { versao: 1, participantes: [], fase: 'divisao', iniciado: new Date().toISOString(), ...cur0, projeto: { id, nome: String(projeto.nome || '').slice(0, 120), pasta: projeto.pasta }, branchDono: pp.branchDono }) };
    const lista = (Array.isArray(participantes) ? participantes : []).map((p) => ({ nome: String((p && p.nome) || '').trim().slice(0, 60), branch: String((p && p.branch) || '').trim() })).filter((p) => p.nome || p.branch);
    const prob = [];
    if (!lista.length) prob.push('Informe pelo menos um participante.');
    lista.forEach((p, i) => { if (!p.nome) prob.push(`Participante ${i + 1}: falta o nome.`); if (!validBranch(p.branch)) prob.push(`Participante ${i + 1}: branch "${p.branch}" inválida (ex.: dev2; main/master não vale).`); /* DEV2-023: o dono pode ser participante, com a branch dele */ });
    const bs = lista.map((p) => p.branch);
    if (new Set(bs).size !== bs.length) prob.push('Duas pessoas com a mesma branch.');
    const o = opts && typeof opts === 'object' ? opts : {};
    const modo = ['projeto', 'estado_atual', 'tarefas'].includes(o.modo) ? o.modo : null; // DEV2-023: (a) projeto | (b1) estado_atual | (b2) tarefas
    let entrega = null;
    if (o.entrega && typeof o.entrega === 'object') {
      entrega = { objetivo: String(o.entrega.objetivo || '').trim().slice(0, 300), criterio: String(o.entrega.criterio || '').trim().slice(0, 2000), estrutura: '' };
      const ef = String(o.entrega.estrutura || '');
      if (ef) {
        const tx = readText(ef), est = tx == null ? null : checkStructure(tx);
        if (!est) prob.push('O .md da estrutura do projeto não foi encontrado.');
        else if (!est.ok) prob.push(`O .md da estrutura do projeto: ${[est.missing.length && `faltam ${est.missing.join(', ')}`, est.empty.length && `sem conteúdo: ${est.empty.join(', ')}`].filter(Boolean).join('; ')}.`);
        else { const dst = path.join(projeto.pasta, 'mutirao', 'estrutura.md'); fs.mkdirSync(path.dirname(dst), { recursive: true }); if (path.resolve(ef) !== path.resolve(dst)) fs.copyFileSync(ef, dst); entrega.estrutura = 'mutirao/estrutura.md'; }
      }
    }
    if (prob.length) return { ok: false, problemas: prob };
    const cur = ler(id).dono || {};
    const d = grava(id, 'dono', { ...cur, versao: 1, projeto: { id, nome: String(projeto.nome || '').slice(0, 120), pasta: projeto.pasta }, branchDono: pp.branchDono, participantes: lista, modo: modo || cur.modo || 'projeto', ...(entrega ? { entrega } : {}), fase: cur.fase === 'publicada' ? 'publicada' : (cur.fase || 'divisao'), iniciado: cur.iniciado || new Date().toISOString() });
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

  /* ---------- Implementação automática (DEV2-006) ----------
     Em N/N, o Termix (código, zero token) junta as entregas na branch do dono: working tree limpo, HEAD na branch do dono
     (nunca main/master), git fetch e, para cada participante, git merge --no-ff origin/<b>. Conflito: git merge --abort
     (nada é descartado: o que já entrou fica), e o conflito vira a primeira tarefa do plano. Depois monta a "entrega
     sintética" do Vibe em vibe\<id>\ e a interface segue o ciclo do Vibe (plano, execução) na branch do dono. No fim, o
     Termix faz push só da branch do dono. Estado em mutirao.json: dono.auto. */
  const mergeEmAndamento = (pasta) => !!shaOf(pasta, 'MERGE_HEAD');
  const linha1 = (r) => String((r && (r.err || r.out)) || '').split('\n').filter(Boolean).slice(0, 2).join(' ').slice(0, 300);
  function entregaDe(pasta, b) {
    const s = gitRun(pasta, ['show', `refs/remotes/origin/${b}:mutirao/entregas/${b}.json`]);
    return s.ok ? parseJson(s.out) : null;
  }
  function autoPrep(id) {
    const d = ler(id).dono;
    if (!d || !d.publicado) return { ok: false, motivo: 'Publique a divisão antes da implementação automática.' };
    const pasta = d.projeto.pasta;
    const pp = papel(pasta);
    if (!pp.pode) return { ok: false, motivo: pp.motivo || 'Só o dono do projeto usa a implementação automática.' };
    const br = pp.branchDono;
    if (!validBranch(br)) return { ok: false, motivo: 'A branch do dono não é válida (main/master não vale).' };
    if (mergeEmAndamento(pasta)) return { ok: false, motivo: 'Há um merge em andamento no projeto. Termine ou cancele (git merge --abort) e tente de novo.' };
    const st = gitRun(pasta, ['status', '--porcelain', '--untracked-files=no']);
    if (!st.ok) return { ok: false, motivo: `Não foi possível ler o git do projeto (${linha1(st)}).` };
    if (st.out) {
      const fs2 = porcelain(st.out);
      return { ok: false, sujo: true, motivo: `O projeto tem mudanças sem commit (${fs2.slice(0, 5).join(', ')}${fs2.length > 5 ? '…' : ''}). Faça commit ou guarde (stash) antes: a junção só mexe no que está commitado.` };
    }
    if (headOf(pasta) !== br) {
      if (!shaOf(pasta, `refs/heads/${br}`)) return { ok: false, motivo: `A branch do dono "${br}" não existe neste projeto.` };
      const sw = gitRun(pasta, ['switch', br]);
      if (!sw.ok || headOf(pasta) !== br) return { ok: false, motivo: `O Termix não conseguiu ir para a branch "${br}" sem descartar nada (${linha1(sw)}).` };
    }
    const fe = gitRun(pasta, ['fetch', 'origin', '--quiet'], 60000);
    if (!fe.ok) return { ok: false, motivo: `git fetch falhou: ${linha1(fe)}` };
    const parts = (d.participantes || []).map((p) => ({ nome: p.nome, branch: p.branch }));
    const faltam = parts.filter((p) => !entregaDe(pasta, p.branch));
    if (!parts.length || faltam.length) return { ok: false, motivo: `Ainda faltam entregas: ${faltam.map((p) => `${p.nome} (${p.branch})`).join(', ') || 'nenhum participante'}.` };
    const heads = {};
    for (const b of PROTEGIDAS) { heads[b] = shaOf(pasta, `refs/heads/${b}`); heads[`origin/${b}`] = shaOf(pasta, `refs/remotes/origin/${b}`); }
    const auto = { fase: 'juntando', branch: br, base: shaOf(pasta, 'HEAD'), heads, k: 0, n: parts.length, juncoes: [], iniciado: new Date().toISOString() };
    grava(id, 'dono', { ...ler(id).dono, auto });
    return { ok: true, branch: br, participantes: parts };
  }
  function autoJuntar(id, b) {
    const d = ler(id).dono, a = d && d.auto;
    if (!a || a.fase !== 'juntando') return { ok: false, motivo: 'A junção não foi preparada.' };
    const pasta = d.projeto.pasta;
    const p = (d.participantes || []).find((x) => x.branch === b);
    if (!p) return { ok: false, motivo: `A branch ${b} não é de um participante.` };
    const fim = (j, parar) => {
      const juncoes = [...a.juncoes.filter((x) => x.branch !== b), j];
      const k = juncoes.length;
      const fase = parar ? 'erro' : k >= a.n ? 'juntado' : 'juntando';
      const auto = { ...a, juncoes, k, fase, motivo: parar ? j.motivo : '' };
      grava(id, 'dono', { ...ler(id).dono, auto });
      return { ok: !parar, juncao: j, auto };
    };
    if (headOf(pasta) !== a.branch || PROTEGIDAS.includes(headOf(pasta).toLowerCase())) return fim({ branch: b, nome: p.nome, status: 'erro', motivo: `O projeto saiu da branch "${a.branch}"; a junção parou.` }, true);
    const ref = `refs/remotes/origin/${b}`;
    if (!shaOf(pasta, ref)) return fim({ branch: b, nome: p.nome, status: 'erro', motivo: `A branch ${b} não foi encontrada no remoto.` });
    if (gitRun(pasta, ['merge-base', '--is-ancestor', ref, 'HEAD']).ok) return fim({ branch: b, nome: p.nome, status: 'ja', sha: shaOf(pasta, 'HEAD') });
    const m = gitRun(pasta, ['merge', '--no-ff', '-m', `Mutirão: integrar ${b} (${p.nome})`, `origin/${b}`], 60000);
    if (m.ok) return fim({ branch: b, nome: p.nome, status: 'ok', sha: shaOf(pasta, 'HEAD') });
    // conflito ou erro: para o merge sem descartar nada (o que já entrou continua) e registra a branch e os arquivos
    const u = gitRun(pasta, ['diff', '--name-only', '--diff-filter=U']);
    const arquivos = u.ok && u.out ? u.out.split('\n').filter(Boolean).slice(0, 100) : [];
    let parar = false, motivo = linha1(m);
    if (mergeEmAndamento(pasta)) {
      const ab = gitRun(pasta, ['merge', '--abort']);
      if (!ab.ok || mergeEmAndamento(pasta)) { parar = true; motivo = `O merge da ${b} não pôde ser cancelado (${linha1(ab)}). Confira o projeto à mão.`; }
    }
    return fim({ branch: b, nome: p.nome, status: arquivos.length ? 'conflito' : 'erro', arquivos, motivo: arquivos.length ? `Conflito em ${arquivos.length} arquivo(s).` : motivo }, parar);
  }
  // Entrega sintética do Vibe: objetivo e critério da divisão; estrutura = divisão + partes + entregas + junções e conflitos.
  function autoEntrega(id, opts) {
    const d = ler(id).dono, a = d && d.auto;
    if (!a || a.fase !== 'juntado') return { ok: false, motivo: 'A junção ainda não terminou.' };
    const pasta = d.projeto.pasta, br = a.branch;
    const div = parseJson(readText(path.join(pasta, 'mutirao', 'divisao.json')) || '') || {};
    const partes = Array.isArray(div.partes) ? div.partes : [];
    const conflitos = a.juncoes.filter((j) => j.status === 'conflito' || j.status === 'erro');
    const titulos = (d.participantes || []).map((p) => (partes.find((x) => x && x.branch === p.branch) || {}).titulo || p.branch);
    const objetivo = String(div.objetivo || `Concluir o projeto ${d.projeto.nome || ''} ligando as partes do Mutirão: ${titulos.join('; ')}`).replace(/\s+/g, ' ').trim().slice(0, 300);
    // DEV2-009: objetivo e critério do projeto inteiro explícitos, e os passos de publicação/deploy e do humano achados na
    // divisão e nos documentos do projeto (o planejador lia só as partes e deixava a publicação de fora)
    const critProj = String(div.criterio || '').trim();
    const pub = [];
    const PUB_RX = /\b(deploy\w*|publica(r|[çc][ãa]o)|publique|produ[çc][ãa]o|go[- ]live|github pages|vercel|netlify|ftp|hospedagem|hospedar|dom[íi]nio|dns|senha|credencia\w*)\b/i;
    const achar = (fonte, texto) => { for (const l of String(texto || '').replace(/\r/g, '').split('\n')) { const s = l.replace(/\s+/g, ' ').trim(); if (s && PUB_RX.test(s) && pub.length < 12 && !pub.some((x) => x.endsWith(s.slice(0, 200)))) pub.push(`- ${fonte}: ${s.slice(0, 200)}`); } };
    achar('objetivo do projeto', div.objetivo); achar('critério do projeto', critProj);
    for (const pt of partes) if (pt) { achar(`parte ${pt.branch}`, pt.objetivo); achar(`parte ${pt.branch}`, pt.criterio); }
    for (const f of ['README.md', 'ROADMAP.md', path.join('docs', 'ROADMAP.md'), path.join('docs', 'DEPLOY.md'), 'DEPLOY.md']) { const t = readText(path.join(pasta, f)); if (t) achar(f.replace(/\\/g, '/'), t.slice(0, 20000)); }
    const crit = [critProj ? `Projeto inteiro: ${critProj}` : '', ...partes.filter(Boolean).map((pt) => `- Parte ${pt.branch}${pt.titulo ? ` (${pt.titulo})` : ''}: ${String(pt.criterio || 'ver mutirao/partes/' + pt.branch + '.md').replace(/\s+/g, ' ').slice(0, 600)}`),
      `- Todas as partes integradas na branch ${br}${conflitos.length ? ` (inclusive ${conflitos.map((c) => c.branch).join(', ')}, que tiveram conflito)` : ''} e ligadas entre si.`, '- A validação final do projeto passa.'].filter(Boolean).join('\n').slice(0, 4000);
    const md = [`# Mutirão: entrega sintética para a implementação automática (gerada pelo Termix)`, '',
      `Projeto: ${d.projeto.nome || ''} (${pasta}). Branch do dono: ${br}. Todas as partes foram entregues; o Termix já juntou as entregas na ${br} com git merge --no-ff (uma por participante).`, '',
      '## Objetivo do projeto inteiro', '', objetivo, '',
      '## Critério de pronto do projeto inteiro', '', critProj || 'A divisão não trouxe um critério do projeto inteiro: use o objetivo acima, o README e o roadmap do projeto, se houver.', '',
      '## Publicação, deploy e passos do humano', '', pub.length ? `Achados pelo Termix (viram tarefas do plano: publicação/deploy com [DEPLOY]; o que depende de acesso, dado ou decisão do humano com [HUMANO]):\n${pub.join('\n')}` : 'Nenhum passo de publicação ou deploy achado na divisão, no README nem no roadmap. Se o objetivo pedir, inclua-o mesmo assim, marcado [DEPLOY].', '',
      '## Divisão', '', `- ${pasta}${path.sep}mutirao${path.sep}divisao.json (na branch ${br}).`, `- Partes: mutirao/partes/<branch>.md de cada participante (as 9 seções).`, '',
      '## Partes, entregas e junções', ''];
    for (const p of d.participantes || []) {
      const pt = partes.find((x) => x && x.branch === p.branch) || {};
      const en = entregaDe(pasta, p.branch) || {};
      const j = a.juncoes.find((x) => x.branch === p.branch) || {};
      const jt = j.status === 'ok' ? `integrada (commit ${String(j.sha || '').slice(0, 10)})` : j.status === 'ja' ? 'já estava integrada' : j.status === 'conflito' ? `NÃO integrada: conflito em ${(j.arquivos || []).join(', ')}` : `NÃO integrada: ${j.motivo || 'erro'}`;
      md.push(`### ${p.nome} (branch ${p.branch})${pt.titulo ? ` — ${pt.titulo}` : ''}`, '',
        `- Objetivo da parte: ${String(pt.objetivo || '').replace(/\s+/g, ' ')}`, `- Arquivos da parte: ${(Array.isArray(pt.arquivos) ? pt.arquivos : []).join(', ')}`,
        `- Parte completa: mutirao/partes/${p.branch}.md`, `- Entrega (${en.data || 's/ data'}): ${String(en.resumo || '').replace(/\s+/g, ' ').slice(0, 600)}`,
        `- Tarefas entregues: ${(Array.isArray(en.tarefas) ? en.tarefas : []).map((t) => `${t.id} ${t.titulo || ''}`.trim()).join('; ') || '—'}`,
        `- Junção na ${br}: ${jt}`, '');
    }
    md.push('## Conflitos da junção', '', conflitos.length ? conflitos.map((c) => `- ${c.branch} (${c.nome}): ${c.status === 'conflito' ? `conflito em ${(c.arquivos || []).join(', ')}` : c.motivo}. O merge foi cancelado sem descartar nada; refazer com git merge --no-ff origin/${c.branch} na ${br} e resolver.`).join('\n') : 'Nenhum: todas as entregas entraram sem conflito.', '',
      '## Critério de pronto', '', crit, '');
    const no = (s) => String(s || '').replace(/["[\]{}()<>|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
    const fluxo = ['# Fluxo do Mutirão (gerado pelo Termix)', '', '```mermaid', 'flowchart LR', `  D["Divisão (${no(br)})"]`,
      ...(d.participantes || []).map((p, i) => `  D --> P${i}["${no(p.nome)} · ${no(p.branch)}"] --> J["Junção na ${no(br)}"]`),
      '  J --> F["Plano final"] --> X["Execução"] --> C["Concluído e push da ' + no(br) + '"]', '```', ''].join('\n');
    const lim = opts && Number.isInteger(opts.maxTarefas) && opts.maxTarefas > 0 && opts.maxTarefas < 50 ? opts.maxTarefas : null;
    const entrega = { versao: 1, status: 'pronta', data: new Date().toISOString(), projeto: { id, nome: d.projeto.nome || '', pasta }, objetivo, criterioDePronto: crit,
      naoPodem: 'Não alterar a main/master nem fazer push (quem envia a branch do dono no fim é o Termix). Não desfazer as partes entregues pelos sócios.', acessos: [], nadaAFornecer: true,
      arquivos: { fluxo: 'fluxo.md', estrutura: 'estrutura.md' }, origem: { mutirao: true },
      mutirao: { branch: br, juncoes: a.juncoes, conflitos: conflitos.map((c) => ({ branch: c.branch, nome: c.nome, status: c.status, arquivos: c.arquivos || [] })), maxTarefas: lim } };
    h.gravarEntrega(id, entrega, { 'fluxo.md': fluxo, 'estrutura.md': md.join('\n') });
    grava(id, 'dono', { ...ler(id).dono, auto: { ...a, fase: 'planejando', entrega: entrega.data } });
    return { ok: true, conflitos: entrega.mutirao.conflitos, branch: br };
  }
  // Mutirão em execução (para a branch dos agentes do Vibe do dono): a branch do dono.
  const autoDe = (id) => { const d = ler(id).dono; return d && d.auto && d.auto.fase !== 'juntando' && validBranch(d.auto.branch) ? d.auto : null; };
  function autoSet(id, fase, extra) { const d = ler(id).dono; if (!d || !d.auto) return null; return grava(id, 'dono', { ...d, auto: { ...d.auto, fase: String(fase).slice(0, 20), ...(extra || {}) } }).auto; }
  // Fim: o Termix (código) faz push só da branch do dono. Nunca main/master.
  function autoFim(id) {
    const d = ler(id).dono, a = d && d.auto;
    if (!a) return { ok: false, motivo: 'A implementação automática não foi iniciada.' };
    const pasta = d.projeto.pasta, br = a.branch;
    if (!validBranch(br)) return { ok: false, motivo: 'A branch do dono não é válida (main/master não vale).' };
    const falhou = (motivo, extra = {}) => { const push = { ok: false, sha: shaOf(pasta, `refs/heads/${br}`), data: new Date().toISOString(), motivo, ...extra }; autoSet(id, 'push', { push }); return { ...push, branch: br }; };
    // DEV2-007: a branch do dono no remoto pode estar à frente (outra máquina). Antes do push, fetch; se o remoto estiver à
    // frente, merge de origin/<dono> (sem rebase, sem descartar). Conflito = merge --abort, nada enviado, motivo na tela.
    const fe = gitRun(pasta, ['fetch', 'origin'], 60000);
    if (!fe.ok) return falhou(`O fetch do remoto falhou antes do push: ${linha1(fe)}`);
    const ref = `refs/remotes/origin/${br}`;
    let integrou = '';
    if (shaOf(pasta, ref) && !gitRun(pasta, ['merge-base', '--is-ancestor', ref, `refs/heads/${br}`]).ok) {
      if (headOf(pasta) !== br) return falhou(`A origin/${br} está à frente, mas o projeto não está na branch ${br}; nada foi enviado.`);
      if (mergeEmAndamento(pasta)) return falhou('Há um merge em andamento no projeto; nada foi enviado.');
      const st = gitRun(pasta, ['status', '--porcelain', '--untracked-files=no']);
      if (!st.ok || st.out) return falhou(`A origin/${br} está à frente e o projeto tem mudanças sem commit (${porcelain(st.out || '').slice(0, 5).join(', ')}); nada foi enviado.`);
      const m = gitRun(pasta, ['merge', '--no-ff', '-m', `Mutirão: integrar origin/${br} (remoto à frente)`, `origin/${br}`], 60000);
      if (!m.ok) {
        const u = gitRun(pasta, ['diff', '--name-only', '--diff-filter=U']);
        const arquivos = u.ok && u.out ? u.out.split('\n').filter(Boolean).slice(0, 50) : [];
        let extra = '';
        if (mergeEmAndamento(pasta)) { const ab = gitRun(pasta, ['merge', '--abort']); if (!ab.ok || mergeEmAndamento(pasta)) extra = ` O merge não pôde ser cancelado (${linha1(ab)}): confira o projeto à mão.`; }
        return falhou(`A origin/${br} estava à frente e o merge com ela ${arquivos.length ? `conflitou em ${arquivos.join(', ')}` : `falhou (${linha1(m)})`}. Merge cancelado, nada foi enviado nem descartado. Resolva o merge da origin/${br} na ${br} (ou peça ao Vibe) e clique em "Enviar a branch de novo".${extra}`, { conflito: arquivos.length > 0, arquivos });
      }
      integrou = shaOf(pasta, 'HEAD');
    }
    const ps = gitRun(pasta, ['push', 'origin', `refs/heads/${br}:refs/heads/${br}`], 60000);
    const push = { ok: ps.ok, sha: shaOf(pasta, `refs/heads/${br}`), data: new Date().toISOString(), integrou, motivo: ps.ok ? '' : `O push da ${br} falhou: ${linha1(ps)}` };
    autoSet(id, ps.ok ? 'concluido' : 'push', { push });
    return { ...push, branch: br };
  }

  const api = {
    mutEstado: (id, pasta) => (validId(id) ? estado(id, pasta) : null),
    mutPapel: (pasta) => (typeof pasta === 'string' && pasta ? papel(pasta) : null), // DEV2-023: quem pode, antes de criar o mutirão
    mutLista: (ids) => lista(ids), // DEV2-023: pasta "Mutirão" da barra lateral
    mutAutoPrep: (id) => (validId(id) ? autoPrep(id) : { ok: false, motivo: 'Projeto inválido.' }),
    mutAutoJuntar: (id, b) => (validId(id) && validBranch(b) ? autoJuntar(id, b) : { ok: false, motivo: 'Branch inválida.' }),
    mutAutoEntrega: (id, opts) => (validId(id) ? autoEntrega(id, opts) : { ok: false, motivo: 'Projeto inválido.' }),
    mutAutoSet: (id, fase) => (validId(id) && ['planejando', 'executando', 'parado', 'erro'].includes(fase) ? autoSet(id, fase) : null),
    mutAutoFim: (id) => (validId(id) ? autoFim(id) : { ok: false, motivo: 'Projeto inválido.' }),
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
  return { api, socioDe, autoDe, idDaAba, pastaDe, MUT_NAME };
}

module.exports = { create, conflitos, normPath, validBranch, MUT_NAME };
