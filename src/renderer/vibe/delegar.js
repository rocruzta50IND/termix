'use strict';
/* Delegar tarefa (DEV2-025) — lado da interface. Carregado pelo vibe.js (o núcleo não muda).
   O responsável (DEV1) pede a UMA pessoa: escolhe quem e a branch, escreve em poucas palavras o que quer; o orquestrador DELE
   escreve a tarefa completa; ele revisa e confirma; o Termix grava na dev1 (commit e push só dela). Quem recebe vê o aviso no
   sino e no projeto, e só COMEÇA quando clica. A entrega e o parecer seguem pelo handoff (ver docs/VIBE_MUTIRAO.md,
   seção "Delegar tarefa"). Tudo que é git é feito pelo processo principal (src/vibe/delegar.js), sem IA.
   O painel reaproveita o do Mutirão (.mutp, ao lado do terminal). As contas são um MOCK (src/vibe/contas.js) até o login do Hub.
   Usa o que o app.js expõe no escopo global (S, save, modal, esc, createTab, findTab, launch, renderAll, addEvent, showToast,
   RT, UI, api) e fala com o processo principal só pelos canais 'vibe:deleg*'. */
(() => {
  /* DEV2-027: ESTACIONADO. O "Delegar tarefa" fica fora da interface até o Rodrigo fazer o login do Hub (com PIN).
     Para religar: DELEGAR_ATIVO = true (e trocar a fonte das contas em src/vibe/contas.js). Com false: sem botão no cabeçalho, sem
     "Conta neste PC" em Configurações, sem a vigia de 5 min e nenhuma conta mock visível. O código inteiro continua aqui. */
  const DELEGAR_ATIVO = false;
  let TESTE_ON = false; // só os testes automáticos (TERMIX_VIBE_TEST=1 + TERMIX_DELEGAR_TESTE=1) ligam sem mudar a constante
  const ON = () => DELEGAR_ATIVO || TESTE_ON;
  const call = async (ch, ...a) => { try { return await window.termix.vibe(ch, ...a); } catch (e) { console.error('delegar:', ch, e); return null; } };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const COR = '#b98cff';
  const NOME_ABA = 'Delegar · Orquestrador';
  const EST = { enviado: 'Enviado', em_andamento: 'Em andamento', entregue: 'Entregue', aprovado: 'Aprovado', reprovado: 'Reprovado' };
  const projects = () => { try { return S.projects.filter((p) => !p.archived && p.kind !== 'workflow' && p.path); } catch { return []; } };
  const projOf = (id) => projects().find((p) => p.id === id) || null;
  const fmt = (iso) => { try { return iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : ''; } catch { return iso || ''; } };
  const alive = (id) => { try { return !!(RT[id] && RT[id].alive); } catch { return false; } };
  const arqDe = (linha) => String(linha || '').replace(/^Vibe do Termix: leia e siga /, '');
  const aviso = (p, msg) => { try { const ev = { c: COR, who: `Delegar tarefa · ${p ? p.name : ''}`, msg, kind: 'perm' }; addEvent(ev); showToast(ev); } catch { /* sem aviso */ } };
  const atual = () => { try { return UI.cur && UI.cur.p && projOf(UI.cur.p) ? UI.cur.p : ''; } catch { return ''; } };

  /* ---------- espera dos hooks e digitação do pedido (mesmo jeito do Organizador) ---------- */
  const HW = [];
  function waitHook(tabId, test, ms) {
    return new Promise((resolve) => {
      const w = { tabId, test, since: Date.now() - 500, resolve };
      if (ms) w.timer = setTimeout(() => done(w, null), ms);
      HW.push(w);
    });
  }
  function done(w, d) { const i = HW.indexOf(w); if (i >= 0) HW.splice(i, 1); clearTimeout(w.timer); w.resolve(d); }
  try {
    window.termix.onHook(({ tabId, data }) => {
      for (const w of HW.slice()) if (w.tabId === tabId && data && (data.t || Date.now()) >= w.since && w.test(data)) done(w, data);
      if (data && data.event === 'Stop') fimDeTurno(tabId);
    });
  } catch (e) { console.error('delegar: hooks', e); }
  async function typeLine(tabId, text) {
    let sent = false;
    const w = waitHook(tabId, (d) => d.event === 'UserPromptSubmit', 30000).then((d) => { sent = !!d; return d; });
    api.write(tabId, '\x15');
    await sleep(200);
    api.write(tabId, text);
    let n = 0;
    const enter = () => { if (sent || !alive(tabId)) return; api.write(tabId, '\r'); if (++n < 5) setTimeout(enter, 3000); };
    setTimeout(enter, 1000);
    return w;
  }
  // Aba do orquestrador do projeto: usa uma já aberta (menos as do Vibe e do Mutirão, que têm ciclo próprio) ou cria uma nova;
  // digita uma linha curta que aponta para o pedido em arquivo (anexado com @, para o Claude Code não pedir permissão de leitura).
  const orqAberta = (p) => p.tabs.find((t) => t.open && t.kind !== 'chat' && alive(t.id) && /orquestrador/i.test(t.name || '') && !/^(Vibe|Mutirão) ·/.test(t.name || '')) || null;
  async function pedirAoOrquestrador(p, linha, rotulo) {
    const arquivo = arqDe(linha);
    const texto = /\s/.test(arquivo) ? `Termix: leia e siga o pedido em ${arquivo}` : `Termix: siga o pedido @${arquivo} (anexado)`;
    let tab = orqAberta(p), novo = false;
    if (tab) { p.activeTab = tab.id; UI.cur = { p: p.id, page: 'Terminais' }; try { renderAll(); } catch { /* sem tela */ } await sleep(300); }
    else {
      createTab(p, 'n', { name: NOME_ABA, color: COR }); novo = true;
      const f = findTab(p.activeTab); tab = f && f.tab;
      if (!tab) return { ok: false };
      const d = await waitHook(tab.id, (x) => x.event === 'SessionStart', 5 * 60000);
      if (!d) { aviso(p, `A aba "${NOME_ABA}" não ficou pronta em 5 min (o Claude Code pode estar perguntando se você confia na pasta). Quando abrir, digite: ${texto}`); return { ok: false, tab, novo }; }
      await sleep(1500);
    }
    const s = await typeLine(tab.id, texto);
    if (!s) aviso(p, `O pedido (${rotulo}) não foi confirmado na aba. Ele está em ${arquivo}`);
    return { ok: !!s, tab, novo };
  }

  /* ---------- estado do painel ---------- */
  let D = null; // { id, root, info, painel, caixa, form, rev, entr, msg, busy }
  const ST = {}; // por projeto, da vigia: { pend: n pedidos para a conta atual ainda não começados }
  const PREV = {}; // did → último estado visto (avisos só nas mudanças)
  let CONTA = { conta: '', contas: [] };

  async function carregar(id) {
    const p = projOf(id);
    if (!p) return;
    const [info, painel, caixa, conta] = await Promise.all([call('delegInfo', p.path), call('delegPainel', p.path), call('delegCaixa', p.path), call('delegConta')]);
    if (conta) CONTA = conta;
    if (!D || D.id !== id) return;
    D.info = info || { pode: false, motivo: 'Não foi possível ler o projeto.', contas: [], livres: [] };
    D.painel = painel || { pedidos: [] };
    D.caixa = caixa || { pedidos: [] };
    if (!D.form.para || !(D.info.contas || []).includes(D.form.para)) D.form.para = '';
    if (!D.form.branch || !(D.info.livres || []).includes(D.form.branch)) D.form.branch = D.info.sugerida || '';
    ST[id] = { pend: D.caixa.pedidos.filter((x) => x.estado === 'enviado').length };
    paint(); paintTop();
  }

  const badge = (e) => `<em class="vx-tag dl-st dl-${e}">${esc(EST[e] || e)}</em>`;
  const btn = (k, txt, extra = '', cls = '') => `<button class="btn sm ${cls}" data-dl="${k}" ${extra}>${txt}</button>`;

  function recebidasHtml() {
    const l = (D.caixa && D.caixa.pedidos) || [];
    if (!l.length) return '';
    const itens = l.map((x) => {
      const ocupado = D.busy ? 'disabled' : '';
      const d = `data-did="${esc(x.id)}"`;
      let acoes = '';
      if (x.estado === 'enviado') acoes = `${btn('comecar', 'Começar', `${d} data-via="orq" ${ocupado}`, 'pri')}${btn('comecar', 'Começar com Vibe de tarefa', `${d} data-via="vibe" ${ocupado}`)}`;
      else if (x.estado === 'em_andamento') {
        const ent = D.entr && D.entr.did === x.id;
        acoes = `${btn('orq', 'Abrir o orquestrador', `${d} ${ocupado}`)}${btn('vibe', 'Seguir com Vibe de tarefa', `${d} ${ocupado}`)}${btn('entregar', ent ? 'Aguardando o handoff…' : 'Entregar', `${d} ${ocupado || (ent ? 'disabled' : '')}`, 'pri')}${ent ? btn('enviarentrega', 'Enviar agora', `${d} ${ocupado}`) : ''}`;
      } else if (x.estado === 'entregue') acoes = '<small>Entregue. Agora é com o responsável analisar.</small>';
      else if (x.estado === 'reprovado' && x.motivo) acoes = `<small>Motivo: ${esc(x.motivo)}</small>`;
      return `<div class="dl-item" ${d}><div class="mp-h"><b>${esc(x.titulo || 'Tarefa')}</b>${badge(x.estado)}<em class="vx-tag mp-br">${esc(x.branch)}</em></div>
        <small>De ${esc(x.de || '')} · enviado em ${esc(fmt(x.criado))}</small>${x.resumo ? `<small class="dl-res">${esc(x.resumo)}</small>` : ''}
        ${acoes ? `<div class="vibe-confirm mp-left">${acoes}</div>` : ''}</div>`;
    }).join('');
    return `<div class="mp-sec"><b>Delegadas a você</b> <small>conta ${esc(CONTA.conta || '')}</small>${itens}
      <p class="vibe-tip">"Começar" confere ou troca para a branch do pedido, sincroniza com a dev1 (sem descartar nada) e abre o orquestrador com o pedido. Nada começa sozinho.</p></div>`;
  }

  function revHtml() {
    const r = D.rev;
    if (!r) return '';
    const bloq = D.busy ? 'disabled' : '';
    if (!r.c || r.esperando) return `<div class="mp-conf"><b>O orquestrador está escrevendo a tarefa…</b><p class="mp-small">O pedido foi digitado na aba "${esc(r.aba || NOME_ABA)}". Quando ele terminar, o Termix confere sozinho; se preferir, confira agora.</p>
      <div class="vibe-confirm mp-left">${btn('conferir', 'Conferir agora', bloq)}${btn('cancelar', 'Cancelar o pedido', bloq)}</div></div>`;
    const c = r.c;
    if (!c.ok) return `<div class="mp-conf bad"><b>A tarefa ainda não está pronta</b><div class="mp-probs"><ul>${(c.problemas || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
      <div class="vibe-confirm mp-left">${btn('conferir', 'Conferir de novo', bloq)}${btn('refazer', 'Pedir de novo ao orquestrador', bloq)}${btn('cancelar', 'Cancelar o pedido', bloq)}</div></div>`;
    return `<div class="mp-conf ok"><b>Revise a tarefa</b> <small>para ${esc(r.para)} · ${esc(r.branch)}</small>
      <pre class="vc-md dl-md">${esc(c.texto)}</pre>
      <div class="vibe-confirm mp-left">${btn('abrirarq', 'Abrir o arquivo', bloq)}${btn('refazer', 'Pedir de novo', bloq)}${btn('cancelar', 'Cancelar', bloq)}${btn('enviar', `Confirmar e enviar para ${esc(r.para)}`, bloq, 'pri')}</div></div>`;
  }

  function novoHtml() {
    const i = D.info || {};
    if (!i.pode) return `<div class="mp-sec"><b>Delegar uma tarefa</b><div class="mp-warn" style="margin-top:8px">${esc(i.motivo || 'Não é possível delegar neste projeto.')}</div>
      <p class="mp-small">Só o responsável do projeto (papel DEV1, num projeto com o fluxo Rocruzta) delega tarefas. Para vários sócios ao mesmo tempo, use o Mutirão.</p></div>`;
    const f = D.form, travado = !!D.rev || D.busy;
    return `<div class="mp-sec"><b>Delegar uma tarefa</b> <small>a uma pessoa, numa branch dela</small>
      <div class="vf" style="margin-top:8px"><label class="mp-small">Para quem</label><select class="inp" data-df="para" ${travado ? 'disabled' : ''}><option value="">Escolha a pessoa…</option>${(i.contas || []).map((c) => `<option value="${esc(c)}" ${c === f.para ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
      <div class="vf"><label class="mp-small">Branch</label><select class="inp" data-df="branch" ${travado ? 'disabled' : ''}>${(i.livres || []).map((b) => `<option value="${esc(b)}" ${b === f.branch ? 'selected' : ''}>${esc(b)}${b === i.sugerida ? ' (sugerida)' : ''}</option>`).join('')}</select>${(i.ocupadas || []).length ? `<small class="mp-small">Ocupadas: ${esc(i.ocupadas.join(', '))} (têm pedido aberto)</small>` : ''}</div>
      <div class="vf"><label class="mp-small">O que você quer, em poucas palavras</label><textarea class="inp dl-txt" data-df="resumo" rows="3" maxlength="2000" placeholder="Ex.: trocar o texto da tela inicial e conferir o teste" ${travado ? 'disabled' : ''}>${esc(f.resumo)}</textarea></div>
      <div class="vibe-confirm mp-left">${btn('pedir', 'Pedir ao meu orquestrador', travado ? 'disabled' : '', 'pri')}</div>
      <p class="vibe-tip">O seu orquestrador escreve a tarefa completa (objetivo, contexto, o que ler, critério de pronto, o que não fazer e o resultado esperado). Você revisa e confirma antes de qualquer envio.</p>
      ${revHtml()}</div>`;
  }

  function enviadosHtml() {
    const l = (D.painel && D.painel.pedidos) || [];
    if (!l.length) return '';
    const itens = l.map((x) => {
      const d = `data-did="${esc(x.id)}"`, dt = x.datas || {};
      const datas = [`enviado ${fmt(dt.enviado)}`, dt.iniciado ? `iniciado ${fmt(dt.iniciado)}` : '', dt.entregue ? `entregue ${fmt(dt.entregue)}` : '', dt.decidido ? `decidido ${fmt(dt.decidido)}` : ''].filter(Boolean).join(' · ');
      const bloq = D.busy ? 'disabled' : '';
      const acoes = x.estado === 'entregue' ? `<div class="vibe-confirm mp-left">${btn('analisar', 'Analisar entrega', `${d} ${bloq}`, 'pri')}${btn('aprovar', 'Aprovar', `${d} ${bloq}`)}${btn('reprovar', 'Reprovar', `${d} ${bloq}`)}</div>` : '';
      return `<div class="dl-item" ${d}><div class="mp-h"><b>${esc(x.titulo || 'Tarefa')}</b>${badge(x.estado)}<em class="vx-tag mp-br">${esc(x.branch)}</em></div>
        <small>Para ${esc(x.para)} · ${esc(datas)}</small>${x.motivo ? `<small>Motivo: ${esc(x.motivo)}</small>` : ''}${acoes}</div>`;
    }).join('');
    return `<div class="mp-sec"><b>Pedidos do projeto</b>${itens}
      <p class="vibe-tip">A vigia lê, sem IA, só o marcador de estado da branch de quem recebeu (nunca código, diff ou log). "Analisar entrega" pede ao seu orquestrador que leia APENAS o handoff. A integração continua manual, pelo fluxo (/fluxo:integrar).</p></div>`;
  }

  function body() {
    const ps = projects();
    const sel = `<select class="inp" id="dlProj">${ps.length ? `<option value="" ${D.id ? '' : 'selected'}>Escolha o projeto…</option>` : '<option value="">Nenhum projeto no Termix</option>'}${ps.map((p) => `<option value="${esc(p.id)}" ${p.id === D.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>`;
    let main = '';
    if (!D.id) main = '<p class="mp-small">Escolha o projeto.</p>';
    else if (!D.info) main = '<p class="mp-small">Lendo o projeto…</p>';
    else {
      const semConta = !CONTA.conta ? '<div class="mp-warn">Esta conta ainda não foi escolhida. Em Configurações, defina a "Conta neste PC (provisório)": é por ela que os pedidos chegam a quem recebe.</div>' : `<p class="mp-small">Conta neste PC (provisório): <b>${esc(CONTA.conta)}</b>. Trocar em Configurações.</p>`;
      main = `${semConta}${recebidasHtml()}${novoHtml()}${enviadosHtml()}`;
    }
    const msg = D.msg ? `<div class="vibe-msg ${D.msg.kind}">${D.msg.html}</div>` : '';
    return `<div class="mp-hd"><b>Delegar tarefa</b><span><button class="btn sm" data-dl="refresh" title="Atualizar agora (git fetch, sem IA)">Atualizar</button> <button class="mclose" data-dl="close" title="Fechar" aria-label="Fechar">×</button></span></div>
      <div class="mp-body"><div class="vf">${sel}</div>${main}${msg}</div>`;
  }
  function paint() {
    if (!D || !D.root || !D.root.isConnected) return;
    const sc = D.root.querySelector('.mp-body'), top = sc ? sc.scrollTop : 0;
    D.root.innerHTML = body();
    const sc2 = D.root.querySelector('.mp-body'); if (sc2) sc2.scrollTop = top;
  }
  const msg = (kind, html) => { if (D) { D.msg = kind != null ? { kind, html } : null; paint(); } };

  /* ---------- abrir e fechar ---------- */
  const fitSoon = () => setTimeout(() => { try { if (typeof fitActive === 'function') fitActive(); } catch { /* sem terminal */ } }, 60);
  function fechar() {
    if (!D) return;
    try { D.root.remove(); } catch { /* já saiu */ }
    const col = document.getElementById('col'); if (col) col.classList.remove('mut-open');
    D = null; fitSoon();
  }
  function abrir(pid) {
    if (!ON()) return;
    const col = document.getElementById('col');
    if (!col) return;
    let id = pid || atual();
    if (!id) { const ps = projects(); id = ps.length === 1 ? ps[0].id : ''; }
    if (D) { if (id && D.id !== id) trocar(id); return; }
    try { window.TermixVibeBridge && window.TermixVibeBridge.closeMut(); } catch { /* sem Mutirão aberto */ }
    const root = document.createElement('aside');
    root.className = 'mutp delp glass';
    D = { id, root, info: null, painel: null, caixa: null, form: { para: '', branch: '', resumo: '' }, rev: null, entr: null, msg: null, busy: false };
    col.appendChild(root); col.classList.add('mut-open');
    root.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') fechar(); });
    root.addEventListener('input', (e) => { const k = e.target.dataset && e.target.dataset.df; if (k && D) D.form[k] = e.target.value; });
    root.addEventListener('change', (e) => {
      if (e.target.id === 'dlProj') { trocar(e.target.value); return; }
      const k = e.target.dataset && e.target.dataset.df; if (k && D) D.form[k] = e.target.value;
    });
    root.addEventListener('click', (e) => { const b = e.target.closest('[data-dl]'); if (b && D) acao(b.dataset.dl, b.dataset); });
    paint();
    if (id) carregar(id);
    fitSoon();
  }
  function trocar(id) { if (!D) return; Object.assign(D, { id, info: null, painel: null, caixa: null, form: { para: '', branch: '', resumo: '' }, rev: null, entr: null, msg: null, busy: false }); paint(); if (id) carregar(id); }

  /* ---------- ações ---------- */
  async function ocupado(fn) { if (!D || D.busy) return null; D.busy = true; paint(); try { return await fn(); } finally { if (D) { D.busy = false; paint(); } } }

  async function pedir() {
    const p = projOf(D.id); if (!p) return;
    const r = await ocupado(async () => call('delegPedido', D.id, p.path, { para: D.form.para, branch: D.form.branch, resumo: D.form.resumo }));
    if (!r || !r.ok) { msg('bad', esc((r && r.motivo) || 'Não foi possível montar o pedido.')); return; }
    D.msg = null;
    D.rev = { did: r.did, para: r.para, branch: r.branch, arquivo: r.arquivo, c: null, esperando: true, tabId: '', desde: Date.now(), aba: NOME_ABA };
    paint();
    const o = await pedirAoOrquestrador(p, r.linha, 'tarefa');
    if (D && D.rev && D.rev.did === r.did) { D.rev.tabId = (o && o.tab && o.tab.id) || ''; D.rev.aba = (o && o.tab && o.tab.name) || NOME_ABA; D.rev.desde = Date.now(); paint(); }
  }
  async function conferir() {
    if (!D || !D.rev) return;
    const c = await call('delegConferir', D.id, D.rev.did);
    if (c && !c.ok && (c.problemas || []).some((x) => /ainda não gravou/.test(x))) { D.rev.c = null; D.rev.esperando = true; msg('', 'O orquestrador ainda não gravou a tarefa. Espere o fim da resposta dele e confira de novo.'); return; }
    D.rev.c = c || { ok: false, problemas: ['Não foi possível conferir.'] }; D.rev.esperando = false;
    D.msg = null; paint();
  }
  async function enviar() {
    const p = projOf(D.id); if (!p || !D.rev) return;
    const did = D.rev.did, para = D.rev.para, branch = D.rev.branch;
    const r = await ocupado(async () => call('delegEnviar', D.id, p.path, did, { para, branch }));
    if (!r || !r.ok) { msg('bad', esc((r && r.motivo) || 'Não foi possível enviar o pedido.')); return; }
    D.rev = null; D.form.resumo = ''; D.form.para = '';
    msg('ok', `<b>Pedido enviado para ${esc(para)}</b> na branch ${esc(branch)}${r.criouBranch ? ' (criada agora a partir da ' + esc(r.dono) + ')' : ''}. Commit ${esc(String(r.sha || '').slice(0, 8))} e push só da ${esc(r.dono)}. Quando ${esc(para)} abrir o Termix, o aviso aparece lá.`);
    aviso(p, `Pedido enviado para ${para} (${branch}).`);
    await carregar(D.id);
  }
  async function comecar(did, via) {
    const p = projOf(D.id); if (!p) return;
    msg('', 'Preparando a branch e sincronizando com a dev1…');
    const r = await ocupado(async () => call('delegComecar', D.id, p.path, did));
    if (!r || !r.ok) { msg('bad', esc((r && r.motivo) || 'Não foi possível começar.')); return; }
    msg('ok', `<b>Pedido em andamento</b> na branch ${esc(r.branch)}${r.papelCriado ? ' (o papel desta máquina foi criado no CLAUDE.local.md)' : ''}.${r.aviso ? ` ${esc(r.aviso)}` : ''}`);
    await carregar(D.id);
    if (via === 'vibe') await seguirVibe(did);
    else await abrirOrq(did, true);
  }
  async function abrirOrq(did, primeira) {
    const p = projOf(D.id); if (!p) return;
    const linha = await call('delegComecarPrompt', D.id, did);
    if (!linha) { msg('bad', 'O texto do pedido não está neste PC. Use "Começar" antes.'); return; }
    const o = await pedirAoOrquestrador(p, linha, 'começar');
    if (o && o.ok) msg('ok', `O orquestrador recebeu o pedido na aba "${esc((o.tab && o.tab.name) || NOME_ABA)}".`);
  }
  async function seguirVibe(did) {
    const p = projOf(D.id); if (!p) return;
    const r = await call('delegVibe', D.id, did);
    if (!r || !r.ok) { msg('bad', esc((r && r.motivo) || 'Não foi possível preencher o Vibe de tarefa.')); return; }
    try { window.TermixVibeBridge.openTarefa(D.id); } catch (e) { msg('bad', 'O Vibe Coding não abriu.'); console.error(e); }
  }
  async function entregar(did) {
    const p = projOf(D.id); if (!p) return;
    const linha = await call('delegEntregarPrompt', D.id, p.path, did);
    if (!linha) { msg('bad', 'A entrega só vale numa branch de dev (dev2 a dev5).'); return; }
    D.entr = { did, tabId: '', desde: Date.now() }; paint();
    const o = await pedirAoOrquestrador(p, linha, 'handoff');
    if (D && D.entr && D.entr.did === did) { D.entr.tabId = (o && o.tab && o.tab.id) || ''; D.entr.desde = Date.now(); paint(); }
    msg('', 'O orquestrador está reescrevendo o handoff. Quando ele terminar, o Termix faz o commit do handoff e do marcador "entregue" e envia só a sua branch.');
  }
  async function enviarEntrega() {
    const p = projOf(D.id); if (!p || !D.entr) return;
    const did = D.entr.did;
    const r = await ocupado(async () => call('delegEntregar', D.id, p.path, did));
    if (!r || !r.ok) { msg('bad', esc((r && r.motivo) || 'Não foi possível entregar.')); return; }
    D.entr = null;
    msg('ok', `<b>Entrega enviada</b>: handoff e marcador "entregue" na ${esc(r.branch)} (commit ${esc(String(r.sha || '').slice(0, 8))}). O responsável é avisado no Termix dele.`);
    aviso(p, `Entrega enviada na ${r.branch}.`);
    await carregar(D.id);
  }
  async function analisar(did) {
    const p = projOf(D.id); if (!p) return;
    const r = await ocupado(async () => call('delegAnalisar', D.id, p.path, did));
    if (!r || !r.ok) { msg('bad', esc((r && r.motivo) || 'Não foi possível preparar a análise.')); return; }
    msg('', 'Pedindo o parecer ao seu orquestrador (ele lê só o handoff)…');
    const o = await pedirAoOrquestrador(p, r.linha, 'análise');
    msg('ok', `O parecer sai na aba "${esc((o && o.tab && o.tab.name) || NOME_ABA)}". O orquestrador leu apenas o handoff da ${esc(r.branch)} e o pedido original. Depois, aprove ou reprove aqui.`);
  }
  async function decidir(did, dec) {
    const p = projOf(D.id); if (!p) return;
    const it = ((D.painel && D.painel.pedidos) || []).find((x) => x.id === did) || {};
    let motivo = '';
    const r0 = await modal({
      title: dec === 'aprovado' ? 'Aprovar a entrega?' : 'Reprovar a entrega?',
      body: `<p>${esc(it.titulo || 'Tarefa')} · ${esc(it.para || '')} · ${esc(it.branch || '')}</p><p class="meta">${dec === 'aprovado' ? 'A decisão fica gravada no índice dos pedidos (dev1). O Termix não junta nenhuma branch: a integração continua manual, pelo fluxo (/fluxo:integrar).' : 'A decisão e o motivo ficam gravados no índice dos pedidos (dev1). O conteúdo reprovado não deve ser usado como base para novas propostas.'}</p>
        <div class="f"><label>${dec === 'aprovado' ? 'Observação (opcional)' : 'Motivo'}</label><input class="inp" type="text" data-f="motivo" maxlength="300"></div>`,
      buttons: [['Cancelar', null], [dec === 'aprovado' ? 'Aprovar' : 'Reprovar', 'ok', 'pri']],
    });
    if (r0.value !== 'ok') return;
    motivo = (r0.form.motivo || '').trim();
    return decidirDireto(did, dec, motivo);
  }
  async function decidirDireto(did, dec, motivo) {
    const p = projOf(D.id); if (!p) return;
    const r = await ocupado(async () => call('delegDecidir', D.id, p.path, did, dec, motivo || ''));
    if (!r || !r.ok) { msg('bad', esc((r && r.motivo) || 'Não foi possível gravar a decisão.')); return r; }
    msg('ok', `<b>${dec === 'aprovado' ? 'Aprovado' : 'Reprovado'}</b>: decisão gravada no índice (commit ${esc(String(r.sha || '').slice(0, 8))}). ${esc(r.integracao || '')}`);
    await carregar(D.id);
    return r;
  }
  async function acao(k, ds) {
    try {
      if (k === 'close') fechar();
      else if (k === 'refresh') { msg('', 'Conferindo o remoto…'); await carregar(D.id); vigia(); if (D) msg(null); }
      else if (k === 'pedir') await pedir();
      else if (k === 'refazer') { const rv = D.rev; D.rev = null; D.form.para = rv.para; D.form.branch = rv.branch; paint(); await pedir(); }
      else if (k === 'cancelar') { D.rev = null; D.msg = null; paint(); }
      else if (k === 'conferir') await conferir();
      else if (k === 'abrirarq') { if (D.rev) await call('abrirArquivo', D.id, D.rev.arquivo); }
      else if (k === 'enviar') await enviar();
      else if (k === 'comecar') await comecar(ds.did, ds.via);
      else if (k === 'orq') await abrirOrq(ds.did);
      else if (k === 'vibe') await seguirVibe(ds.did);
      else if (k === 'entregar') await entregar(ds.did);
      else if (k === 'enviarentrega') await enviarEntrega();
      else if (k === 'analisar') await analisar(ds.did);
      else if (k === 'aprovar') await decidir(ds.did, 'aprovado');
      else if (k === 'reprovar') await decidir(ds.did, 'reprovado');
    } catch (e) { console.error('delegar:', k, e); }
  }
  // Fim de turno da aba que recebeu o pedido: confere a tarefa escrita ou envia a entrega (o Termix confere, sem IA).
  function fimDeTurno(tabId) {
    if (!D) return;
    if (D.rev && D.rev.esperando && D.rev.tabId === tabId && Date.now() - D.rev.desde > 4000) conferir();
    else if (D.entr && D.entr.tabId === tabId && Date.now() - D.entr.desde > 4000) enviarEntrega();
  }

  /* ---------- botões no cabeçalho ---------- */
  function paintTop() {
    const top = document.getElementById('topbar'), box = top && top.querySelector('.vibebtns');
    if (!box) return;
    if (!ON()) { box.querySelectorAll('[data-deleg-open],[data-deleg-part]').forEach((e) => e.remove()); return; }
    if (!box.querySelector('[data-deleg-open]')) {
      const b = document.createElement('button');
      b.className = 'vibebtn deleg'; b.dataset.delegOpen = '1'; b.title = 'Delegar tarefa: pedir a uma pessoa que faça uma tarefa numa branch dela';
      b.innerHTML = '<i></i>Delegar tarefa';
      b.onclick = (e) => { e.stopPropagation(); botao(); };
      const first = box.querySelector('[data-vibe-open]');
      if (first && first.nextSibling) box.insertBefore(b, first.nextSibling); else box.appendChild(b);
    }
    const id = atual(), n = (id && ST[id] && ST[id].pend) || 0;
    const cur = box.querySelector('[data-deleg-part]');
    if (!n) { if (cur) cur.remove(); return; }
    if (cur && cur.dataset.delegPart === id) { cur.lastChild.textContent = `Tarefa delegada a você (${n})`; return; }
    if (cur) cur.remove();
    const b = document.createElement('button');
    b.className = 'vibebtn part'; b.dataset.delegPart = id; b.title = 'Você tem uma tarefa delegada neste projeto';
    b.innerHTML = `<i></i>Tarefa delegada a você (${n})`;
    b.onclick = (e) => { e.stopPropagation(); abrir(b.dataset.delegPart); };
    box.appendChild(b);
  }
  async function botao() {
    const id = atual();
    if (!id) { await modal({ title: 'Delegar tarefa', body: '<p>Abra um projeto do Termix para delegar uma tarefa. O botão vale para o projeto aberto.</p>', buttons: [['OK', null, 'pri']] }); return; }
    if (D) { fechar(); return; }
    abrir(id);
  }

  /* ---------- Configurações: conta neste PC (provisório, mock até o login do Hub) ---------- */
  async function mountConf() {
    if (!ON()) return;
    const page = document.getElementById('page');
    if (!page || !page.querySelector('#rngOp') || page.querySelector('#delegConf')) return;
    const host = page.querySelector('.page');
    if (!host) return;
    const box = document.createElement('div');
    box.id = 'delegConf';
    host.appendChild(box);
    const c = (await call('delegConta')) || { conta: '', contas: [] };
    CONTA = c;
    box.innerHTML = `<h5 style="margin:22px 0 8px">Delegar tarefa</h5><div class="card" style="padding:6px 18px"><div class="row"><div class="grow">Conta neste PC (provisório)<small>Diz quem está usando este Termix: é para quem os pedidos de "Delegar tarefa" são endereçados e quem vê os avisos. Provisório, até o login do Hub (com PIN); por enquanto qualquer pessoa pode escolher qualquer nome.</small></div>
      <select class="inp" id="delContaSel" style="width:auto"><option value="">Escolha…</option>${(c.contas || []).map((n) => `<option value="${esc(n)}" ${n === c.conta ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div></div>`;
    box.querySelector('#delContaSel').onchange = async (e) => {
      const r = await call('delegContaSet', e.target.value);
      CONTA = (await call('delegConta')) || CONTA;
      if (!r || !r.ok) return;
      for (const k of Object.keys(PREV)) delete PREV[k];
      vigia();
    };
  }

  /* ---------- vigia: a cada 5 min (e no "Atualizar" do painel), sem IA ---------- */
  let vigiando = false;
  async function vigia() {
    if (!ON() || vigiando) return 0;
    vigiando = true; let n = 0;
    try {
      CONTA = (await call('delegConta')) || CONTA;
      if (!CONTA.conta) return 0;
      for (const p of projects()) {
        // lado de quem recebe: pedidos para a conta deste PC (git fetch + git show origin/dev1:.termix/delegar)
        const cx = await call('delegCaixa', p.path);
        if (cx && Array.isArray(cx.pedidos)) {
          ST[p.id] = { pend: cx.pedidos.filter((x) => x.estado === 'enviado').length };
          for (const x of cx.pedidos) {
            const k = `r:${x.id}`;
            if (x.estado === 'enviado' && PREV[k] !== 'enviado') { aviso(p, `${x.de || 'O responsável'} delegou uma tarefa a você: "${x.titulo}" (branch ${x.branch}). Abra o projeto e use "Começar".`); n++; }
            else if (PREV[k] && PREV[k] !== x.estado && ['aprovado', 'reprovado'].includes(x.estado)) { aviso(p, `${x.de || 'O responsável'} ${x.estado === 'aprovado' ? 'aprovou' : 'reprovou'} a sua entrega: "${x.titulo}".${x.motivo ? ` Motivo: ${x.motivo}` : ''}`); n++; }
            PREV[k] = x.estado;
          }
          if (D && D.id === p.id) { D.caixa = cx; paint(); }
        }
        // lado do responsável: só o marcador de estado de cada branch (trava de contexto)
        const inf = await call('delegInfo', p.path);
        if (inf && inf.dono) {
          const pn = await call('delegPainel', p.path);
          if (pn && Array.isArray(pn.pedidos)) {
            for (const x of pn.pedidos) {
              const k = `d:${x.id}`;
              if (x.estado === 'entregue' && PREV[k] !== 'entregue') { aviso(p, `${x.para} entregou a tarefa "${x.titulo}" (${x.branch}). Use "Analisar entrega" no painel Delegar tarefa.`); n++; }
              else if (x.estado === 'em_andamento' && PREV[k] === 'enviado') { aviso(p, `${x.para} começou a tarefa "${x.titulo}" (${x.branch}).`); n++; }
              PREV[k] = x.estado;
            }
            if (D && D.id === p.id) { D.painel = pn; paint(); }
          }
        }
      }
      paintTop();
    } finally { vigiando = false; }
    return n;
  }
  setInterval(vigia, 5 * 60000);
  setTimeout(vigia, 25000);
  window.TermixDelegar = { open: (id) => abrir(id), close: () => fechar(), vigia: () => vigia() };

  function boot() {
    try {
      const top = document.getElementById('topbar'), page = document.getElementById('page');
      if (top) new MutationObserver(paintTop).observe(top, { childList: true });
      if (page) new MutationObserver(mountConf).observe(page, { childList: true });
      document.addEventListener('click', () => setTimeout(paintTop, 80), true);
      setInterval(paintTop, 3000); // o cabeçalho nem sempre é redesenhado ao trocar de projeto (mesma cautela do vibe.js)
      paintTop(); mountConf();
    } catch (e) { console.error('delegar: início', e); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  /* gancho de teste: só com o app aberto em modo de teste (TERMIX_VIBE_TEST=1) */
  call('status').then((s) => {
    if (!s || !s.test) return;
    if (s.delegarTeste) { TESTE_ON = true; paintTop(); mountConf(); }
    window.delegarTest = {
      abrir: (id) => abrir(id), fechar: () => fechar(), vigia: () => vigia(), st: () => JSON.parse(JSON.stringify(ST)), conta: async (n) => { await call('delegContaSet', n); CONTA = (await call('delegConta')) || CONTA; for (const k of Object.keys(PREV)) delete PREV[k]; return CONTA; },
      state: () => (D ? { id: D.id, info: D.info, painel: D.painel, caixa: D.caixa, form: { ...D.form }, rev: D.rev && { ...D.rev }, entr: D.entr, msg: D.msg && D.msg.html, busy: D.busy } : null),
      form: (o) => { if (!D) return false; Object.assign(D.form, o); paint(); return { ...D.form }; },
      pedir: () => pedir(), conferir: () => conferir(), enviar: () => enviar(), comecar: (did, via) => comecar(did, via || 'orq'), vibe: (did) => seguirVibe(did),
      entregar: (did) => entregar(did), enviarEntrega: () => enviarEntrega(), analisar: (did) => analisar(did), decidir: (did, dec, m) => decidirDireto(did, dec, m || ''),
      carregar: () => carregar(D && D.id), botao: () => botao(),
    };
  });
})();
