'use strict';
/* Organizador (DEV2-010) — lado da interface: projeto com várias pastas. Desde a DEV2-024, sem chave experimental e sem
   botão próprio: o "Usar pasta existente" do núcleo (npPick) chama window.TermixOrg.pick e, com mais de uma pasta,
   window.TermixOrg.mapaDe, que abre o mapa com as conversas mais recentes de orquestrador e de dev marcadas (recomendadas).
   Carregado pelo vibe.js (o núcleo não muda). Usa o que o app.js expõe no escopo global (S, save, modal, esc, createTab,
   findTab, addProject, launch, renderAll, addEvent, RT, UI, api) e fala com o processo principal só pelos canais
   'vibe:org*'.
   Desenho (docs/ORGANIZADOR.md): o núcleo abre cada aba na pasta do projeto, então cada pasta vira um projeto do Termix
   (ou reaproveita o que já existe) e o módulo guarda o grupo em <userData>\organizador\<grupo>\grupo.json. */
(() => {
  const call = async (ch, ...a) => { try { return await window.termix.vibe(ch, ...a); } catch (e) { console.error('organizador:', ch, e); return null; } };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const PAPEIS = ['Orquestrador', 'Dev', 'Gerente', 'Outro'];
  const COR = { Orquestrador: '#A78BFA', Dev: '#34D399', Gerente: '#FBBF24', Outro: '#5B9DFF' };
  const same = (a, b) => String(a || '').replace(/[\\/]+$/, '').toLowerCase() === String(b || '').replace(/[\\/]+$/, '').toLowerCase();
  const projOfPath = (pasta) => { try { return S.projects.find((p) => !p.archived && same(p.path, pasta)) || null; } catch { return null; } };
  const kb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
  const quando = (ms) => { const d = new Date(ms); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const LONGA = 2 * 1048576; // conversa acima disto: retomar recarrega muito histórico

  /* ---------- espera dos hooks (SessionStart, UserPromptSubmit, Stop) ---------- */
  const HW = [];
  function waitHook(tabId, test, ms) {
    return new Promise((resolve) => {
      const w = { tabId, test, since: Date.now() - 500, resolve };
      if (ms) w.timer = setTimeout(() => done(w, null), ms);
      HW.push(w);
    });
  }
  function done(w, d) { const i = HW.indexOf(w); if (i >= 0) HW.splice(i, 1); clearTimeout(w.timer); w.resolve(d); }
  try { window.termix.onHook(({ tabId, data }) => { for (const w of HW.slice()) if (w.tabId === tabId && data && (data.t || Date.now()) >= w.since && w.test(data)) done(w, data); }); } catch (e) { console.error('organizador: hooks', e); }
  const alive = (id) => { try { return !!(RT[id] && RT[id].alive); } catch { return false; } };

  // Digita uma linha e aperta Enter, repetindo o Enter enquanto o hook do pedido enviado não chega (como no Vibe).
  async function typeLine(tabId, text) {
    let sent = false;
    const w = waitHook(tabId, (d) => d.event === 'UserPromptSubmit', 30000).then((d) => { sent = !!d; return d; });
    api.write(tabId, '\x15'); // caixa de texto vazia antes
    await sleep(200);
    api.write(tabId, text);
    let n = 0;
    const enter = () => { if (sent || !alive(tabId)) return; api.write(tabId, '\r'); if (++n < 5) setTimeout(enter, 3000); };
    setTimeout(enter, 1000);
    return w;
  }
  // Abre uma aba nova num projeto e, quando o Claude Code estiver pronto (SessionStart), manda a linha do pedido.
  async function abaComPedido(p, perm, nome, cor, arquivo) {
    createTab(p, perm, { name: nome, color: cor });
    const tab = findTab(p.activeTab) && findTab(p.activeTab).tab;
    if (!tab) return { ok: false };
    const ready = waitHook(tab.id, (d) => d.event === 'SessionStart', 5 * 60000);
    const go = (async () => {
      const d = await ready;
      if (!d) { addEvent({ c: cor, who: nome, tabId: tab.id, msg: `A aba não ficou pronta em 5 min (o Claude Code pode estar perguntando algo, como confiar na pasta). Para ela se localizar, digite: Termix: leia e siga ${arquivo}` }); return false; }
      await sleep(1500);
      // O pedido fica fora da pasta da aba (pasta de dados do módulo): lido pela ferramenta Read, o Claude Code pede permissão
      // para "ler fora da pasta de trabalho". Com a menção @arquivo, quem anexa o arquivo é o próprio Claude Code, sem pedir.
      // Caminho com espaço quebra a menção: aí vai o caminho simples (e a permissão é pedida uma vez).
      const s = await typeLine(tab.id, /\s/.test(arquivo) ? `Termix: leia e siga o pedido em ${arquivo}` : `Termix: siga o pedido @${arquivo} (anexado)`);
      if (!s) addEvent({ c: cor, who: nome, tabId: tab.id, msg: `O pedido de localização não foi confirmado. Ele está em ${arquivo}` });
      return !!s;
    })();
    return { ok: true, tab, go };
  }

  /* ---------- passo 1: nome e pastas ---------- */
  async function abrir(st = null) {
    st = st || { nome: '', pastas: [], perm: 'n' };
    const lista = () => (st.pastas.length ? st.pastas.map((x, i) => `<div class="orgp"><span>${esc(x)}</span><button class="btn sm" data-org-rm="${i}" title="Tirar da lista">Tirar</button></div>`).join('') : '<p class="meta">Nenhuma pasta ainda. Escolha várias de uma vez (Ctrl ou Shift) ou uma por vez.</p>');
    const r = await modal({
      title: 'Importar projeto (várias pastas)',
      body: `<p>Para projetos com mais de uma pasta (ex.: <b>Projeto</b> e <b>Projeto-ORQ</b>). O Termix analisa cada pasta só lendo, sem custo de IA, e mostra um mapa para você confirmar antes de abrir qualquer aba. Nada é movido, renomeado ou apagado.</p>
        <div class="f"><label>Nome do projeto</label><input class="inp" type="text" data-f="nome" maxlength="60" placeholder="Ex.: Termix" value="${esc(st.nome)}"></div>
        <div class="f"><label>Pastas</label><div id="orgList" class="orglist">${lista()}</div><button class="btn sm" id="orgAdd">Adicionar pastas…</button></div>`,
      buttons: [['Cancelar', null], ['Analisar', 'ok', 'pri']],
      onOpen: (root) => {
        const draw = () => { root.querySelector('#orgList').innerHTML = lista(); };
        root.querySelector('#orgAdd').onclick = async () => {
          const out = await call('orgPick', window.__orgTestPaths);
          for (const x of (out && out.pastas) || []) if (!st.pastas.some((y) => same(y, x))) st.pastas.push(x);
          if (!root.querySelector('[data-f=nome]').value.trim() && st.pastas[0]) root.querySelector('[data-f=nome]').value = st.pastas[0].split(/[\\/]/).pop().replace(/[-_ .]*orq(uestrador)?$/i, '');
          draw();
        };
        root.querySelector('#orgList').onclick = (e) => { const b = e.target.closest('[data-org-rm]'); if (b) { st.pastas.splice(+b.dataset.orgRm, 1); draw(); } };
      },
    });
    if (r.value !== 'ok') return;
    st.nome = (r.form.nome || '').trim();
    if (!st.pastas.length) return abrir(st);
    if (!st.nome) st.nome = st.pastas[0].split(/[\\/]/).pop();
    st.analise = await call('orgAnalisar', st.pastas);
    if (!st.analise) { addEvent({ who: 'Importar projeto', msg: 'Não foi possível analisar as pastas. Veja o erros.log.' }); return; }
    st.rows = linhas(st.analise);
    return mapa(st);
  }
  // Linhas do mapa. DEV2-026 (5.2-B): várias pastas viram UM projeto, com UM orquestrador e UM dev. O Termix escolhe a pasta
  // principal: a do papel de dev ou, sem dev, a com o commit mais recente (o usuário troca no mapa). As duas abas trabalham nela;
  // as outras pastas não são usadas, mas não são movidas nem apagadas.
  const dataCommit = (a) => { const c = a.git && a.git.commits && a.git.commits[0]; const m = c && /^S+ (d{4}-d{2}-d{2})/.exec(c); return m ? m[1] : ''; };
  function linhas(an) {
    const rows = an.lista.map((a) => ({ a, papel: a.papel, principal: false }));
    const ex = rows.filter((r) => r.a.existe), dev = ex.filter((r) => r.papel === 'Dev');
    const base = (dev.length ? dev : ex).slice().sort((x, y) => (dataCommit(y.a) > dataCommit(x.a) ? 1 : dataCommit(y.a) < dataCommit(x.a) ? -1 : 0));
    if (base[0]) base[0].principal = true;
    return rows;
  }
  // DEV2-024: entrada pelo "Usar pasta existente" (Novo projeto e Novo mutirão) com mais de uma pasta: análise e mapa direto.
  async function mapaDe(pastas, nome, fim) {
    const ps = (pastas || []).filter(Boolean);
    if (!ps.length) return;
    const base = ps[0].split(/[\\/]/).filter(Boolean).pop() || '';
    const st = { nome: String(nome || '').trim() || base.replace(/[-_ .]*orq(uestrador)?$/i, '') || base, pastas: ps, perm: 'n', fim };
    st.analise = await call('orgAnalisar', ps);
    if (!st.analise) { addEvent({ who: 'Projetos', msg: 'Não foi possível analisar as pastas. Veja o erros.log.' }); return; }
    st.rows = linhas(st.analise);
    return mapa(st);
  }

  /* ---------- passo 2: mapa para confirmar ---------- */
  function rowHtml(r, i) {
    const a = r.a, g = a.git || {};
    const proj = projOfPath(a.pasta);
    const chips = [];
    if (!a.existe) chips.push('<span class="chip orgbad">pasta não encontrada</span>');
    else if (g.git) chips.push(`<span class="chip">git · ${esc(g.branch)}</span>`, `<span class="chip">${g.remoto ? esc(g.remoto.replace(/^https?:\/\/|\.git$/g, '').slice(0, 48)) : 'sem remoto'}</span>`);
    else chips.push('<span class="chip orgwarn">sem git</span>');
    if (a.fluxo) chips.push(`<span class="chip">fluxo${a.papelLocal ? ` · ${esc(a.papelLocal)}` : ''}</span>`);
    for (const k of ['CLAUDE.md', 'CLAUDE.local.md', 'WORKFLOW.md']) if (a.arquivos && a.arquivos[k]) chips.push(`<span class="chip">${k}</span>`);
    for (const t of a.tarefas || []) chips.push(`<span class="chip">${esc(t.arquivo.split('/').pop())}</span>`);
    for (const h of a.handoffs || []) chips.push(`<span class="chip" title="${esc(h.status)}">${esc(h.arquivo.split('/').pop())}</span>`);
    const avisos = [...(a.avisos || [])];
    if (proj) avisos.push(`Já está no Termix como "${proj.name}": as abas novas entram nele.`);
    return `<div class="orgrow${r.principal ? '' : ' off'}${a.ambiguo ? ' amb' : ''}" data-i="${i}">
      <div class="orghd"><label class="orgck"><input type="radio" name="orgprin" data-o="principal" ${r.principal ? 'checked' : ''} ${a.existe ? '' : 'disabled'}><b>${esc(a.nome)}</b>${r.principal ? ' <span class="chip orgrec" title="As abas do Orquestrador e do Dev trabalham nesta pasta">pasta principal</span>' : ''}</label><span class="meta orgpath">${esc(a.pasta)}</span></div>
      <div class="orgchips">${chips.join('')}</div>
      <div class="orginfo">${a.andamento && a.andamento.length ? `<div><span class="meta">Em andamento:</span> ${a.andamento.slice(0, 3).map(esc).join(' · ')}</div>` : ''}
        ${a.checkpoint ? `<div><span class="meta">Último checkpoint:</span> ${esc(a.checkpoint)}</div>` : ''}
        ${g.commits && g.commits[0] ? `<div><span class="meta">Último commit:</span> ${esc(g.commits[0])}</div>` : ''}</div>
      <div class="orggrid"><div class="f"><label>Papel <span class="meta">(sugerido: ${esc(a.papel)} — ${esc(a.motivo || '')})</span></label><select class="inp" data-o="papel">${PAPEIS.map((p) => `<option ${p === r.papel ? 'selected' : ''}>${p}</option>`).join('')}</select></div></div>
      ${avisos.length ? `<div class="orgav">${avisos.map((x) => `<div>⚠ ${esc(x)}</div>`).join('')}</div>` : ''}
    </div>`;
  }

  async function mapa(st) {
    const an = st.analise;
    const r = await modal({
      title: `Mapa do projeto: ${esc(st.nome)}`,
      body: `<div class="orgbody"><p class="meta">Estas pastas viram <b>um projeto só</b>, com <b>um orquestrador e um dev</b>, que trabalham na <b>pasta principal</b> (marcada: a do dev ou a com o commit mais recente; troque se precisar). As outras pastas não são usadas, mas não são movidas nem apagadas, e as conversas delas entram na lista de chats do próximo passo. O orquestrador recebe um pedido curto para ler só o essencial e dizer onde paramos; o dev abre e fica esperando.</p>
        ${an.avisos.length || an.ambiguo ? `<div class="orgav top">${an.avisos.map((x) => `<div>⚠ ${esc(x)}</div>`).join('')}${an.ambiguo ? '<div>A análise ficou ambígua em algum ponto: ajuste o papel à mão ou use “Organizar com IA” (opcional).</div>' : ''}</div>` : ''}
        <div class="f"><label>Nome do projeto</label><input class="inp" type="text" data-f="nome" maxlength="60" value="${esc(st.nome)}"></div>
        <div id="orgRows">${st.rows.map(rowHtml).join('')}</div>
        <div class="f"><label>Permissão das abas novas</label><select class="inp" data-f="perm"><option value="n" ${st.perm === 'd' ? '' : 'selected'}>Normal</option><option value="d" ${st.perm === 'd' ? 'selected' : ''}>Dangerously</option></select></div>
        <div class="orgtips"><b>Economia</b>
          <div>• Contexto limpo com o estado em arquivo gasta menos que retomar conversas longas.</div>
          <div>• O “Organizar com IA” lê um dossiê de poucos KB montado pelo Termix, não as pastas inteiras.</div>
          <div>• Mantenha TASKS e HANDOFF em dia: é o que faz a aba nova se localizar barato.</div></div></div>`,
      buttons: [['Cancelar', null], ['Voltar', 'back'], ['Organizar com IA', 'ia', an.ambiguo ? 'orgsug' : ''], ['Carregar', 'ok', 'pri']],
      onOpen: (root) => {
        root.querySelector('.dlg').classList.add('orgdlg');
        const box = root.querySelector('#orgRows');
        const upd = (e) => {
          const el = e.target.closest('[data-o]'), row = e.target.closest('[data-i]');
          if (!el || !row) return;
          const x = st.rows[+row.dataset.i], k = el.dataset.o;
          if (k === 'principal') { st.rows.forEach((y) => { y.principal = false; }); x.principal = true; box.innerHTML = st.rows.map(rowHtml).join(''); return; }
          if (k === 'papel') x.papel = el.value;
          row.outerHTML = rowHtml(x, +row.dataset.i);
        };
        box.addEventListener('change', upd);
      },
    });
    st.nome = (r.form.nome || '').trim() || st.nome;
    st.perm = r.form.perm === 'd' ? 'd' : 'n';
    if (r.value === 'back') return st.fim ? undefined : abrir(st);
    if (r.value === 'ia') return organizar(st);
    if (r.value === 'ok') return carregar(st);
  }

  /* ---------- Carregar: abas novas com o pedido (ou a conversa escolhida) ---------- */
  async function carregar(st) {
    const main = st.rows.find((x) => x.principal && x.a.existe) || st.rows.find((x) => x.a.existe);
    if (!main) return;
    const itens = st.rows.filter((x) => x.a.existe).map((x) => (x === main
      ? { pasta: x.a.pasta, papel: 'Orquestrador', aba: 'Orquestrador', analise: x.a }
      : { pasta: x.a.pasta, papel: x.papel, aba: x.a.nome, nao: true, analise: x.a })); // as outras pastas só constam do grupo e do pedido
    const prep = await call('orgPreparar', { nome: st.nome, itens });
    if (!prep || !prep.ok) { addEvent({ who: 'Importar projeto', msg: 'Não foi possível preparar os pedidos. Veja o erros.log.' }); return; }
    let p = projOfPath(main.a.pasta);
    if (!p) p = addProject({ name: String(st.nome).slice(0, 60), path: main.a.pasta, imported: true, noTab: true });
    const ligacoes = [], pend = [];
    const aberta = (nome) => p.tabs.find((t) => t.open && !t.archived && String(t.name).toLowerCase() === nome.toLowerCase());
    if (!aberta('Orquestrador')) {
      const out = await abaComPedido(p, st.perm, 'Orquestrador', COR.Orquestrador, prep.pedidos[main.a.pasta]);
      if (out.ok) { pend.push(out.go); ligacoes.push({ pasta: main.a.pasta, projeto: p.id, aba: out.tab.id, papel: 'Orquestrador' }); }
    }
    if (!aberta('Dev')) { // o dev só abre e fica esperando (não gasta token)
      pend.push(createTab(p, st.perm, { name: 'Dev', color: COR.Dev }));
      const t = findTab(p.activeTab) && findTab(p.activeTab).tab;
      if (t) ligacoes.push({ pasta: main.a.pasta, projeto: p.id, aba: t.id, papel: 'Dev' });
    }
    call('orgRegistrar', prep.grupo, ligacoes);
    if (st.fim) try { st.fim(); } catch { /* sem retorno */ } // DEV2-024: a tela "Novo projeto"/"Novo mutirão" que abriu o mapa é encerrada
    UI.cur = { p: p.id, page: 'Terminais' }; renderAll();
    addEvent({ who: `Importar projeto · ${st.nome}`, msg: `Projeto único em ${main.a.pasta}: orquestrador e dev criados. O orquestrador recebe o pedido de localização assim que o Claude Code abrir; os pedidos ficam em ${prep.dir}.` });
    return Promise.all(pend);
  }

  /* ---------- Organizar com IA (opcional) ---------- */
  async function organizar(st) {
    const itens = st.rows.filter((x) => x.a.existe).map((x) => ({ pasta: x.a.pasta, papel: x.papel, analise: x.a }));
    const o = await call('orgOrganizar', { nome: st.nome, itens });
    if (!o || !o.ok) { addEvent({ who: 'Organizar com IA', msg: 'Não foi possível montar o dossiê. Veja o erros.log.' }); return mapa(st); }
    // a aba organizadora roda na pasta de dados do módulo: lê o dossiê e grava organizacao.md ali, sem tocar nas pastas do projeto
    let p = projOfPath(o.dir);
    if (!p) p = addProject({ name: `Organizador · ${st.nome}`.slice(0, 60), path: o.dir, imported: true, noTab: true });
    const out = await abaComPedido(p, 'n', 'Organizador', '#A78BFA', o.pedido);
    if (!out.ok) return mapa(st);
    addEvent({ who: `Organizar com IA · ${st.nome}`, tabId: out.tab.id, msg: 'A aba "Organizador" está lendo o dossiê. Quando terminar, o mapa volta com a organização.' });
    if (!(await out.go)) return;
    await waitHook(out.tab.id, (d) => d.event === 'Stop', 20 * 60000);
    return verOrganizacao(st, o.grupo);
  }
  async function verOrganizacao(st, g) {
    const r0 = await call('orgLerOrganizacao', g);
    const r = await modal({
      title: `Organização${st ? `: ${esc(st.nome)}` : ' do projeto'}`,
      body: r0 ? `<p class="meta">Gravada em ${esc(r0.arquivo)}. As sugestões são só propostas: nada foi alterado nas pastas.</p><pre class="orgmd">${esc(r0.texto)}</pre>` : '<p>O organizador terminou, mas não gravou o organizacao.md. Confira a aba "Organizador".</p>',
      buttons: [['Fechar', null], ['Voltar ao mapa', 'ok', 'pri']],
      onOpen: (root) => root.querySelector('.dlg').classList.add('orgdlg'),
    });
    if (r.value === 'ok' && st) return mapa(st);
  }

  /* DEV2-024: sem chave em Configurações e sem o botão "Importar projeto (várias pastas)": a função passou para o
     "Usar pasta existente" do núcleo, que chama estas duas. pick: diálogo do Windows com várias pastas (no modo de teste,
     window.__npTestPaths substitui o diálogo). */
  window.TermixOrg = {
    pick: async () => { const out = await call('orgPick', window.__npTestPaths); return out && out.ok ? out.pastas || [] : null; },
    mapaDe,
  };

  window.TermixOrg.abaComPedido = abaComPedido; window.TermixOrg.waitHook = waitHook; window.TermixOrg.typeLine = typeLine; // DEV2-026: o módulo "Retomar projeto" reaproveita

  // gancho de teste (o caminho das pastas só é aceito pelo processo principal com TERMIX_VIBE_TEST=1)
  window.orgTest = { mapaDe: (ps, nome) => mapaDe(ps, nome), linhas: (an) => linhas(an), abrir: (st) => abrir(st), mapa: (st) => mapa(st), carregar: (st) => carregar(st), organizar: (st) => organizar(st), ver: (g) => verOrganizacao(null, g), analisar: (ps) => call('orgAnalisar', ps) };
})();
