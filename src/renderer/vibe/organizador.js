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
  // Linhas do mapa. DEV2-024: a conversa mais recente de orquestrador e a de dev (entre as pastas com esse papel) vêm
  // marcadas para retomar, como recomendação (rec); o usuário pode trocar ou desmarcar. As outras pastas seguem com a aba nova.
  function linhas(an) {
    const rows = an.lista.map((a) => ({ a, abrir: a.existe, papel: a.papel, aba: `${a.papel} · ${a.nome}`, abaManual: false, ret: false, rec: '', sess: (a.sessoes[0] || {}).id || '' }));
    for (const papel of ['Orquestrador', 'Dev']) {
      let best = null;
      for (const r of rows) {
        if (r.papel !== papel || !r.a.existe) continue;
        for (const s of r.a.sessoes || []) if (!best || s.mtime > best.s.mtime) best = { r, s };
      }
      if (best) { best.r.ret = true; best.r.sess = best.s.id; best.r.rec = best.s.id; }
    }
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
    const ss = a.sessoes || [];
    const busy = (s) => Date.now() - s.mtime < 3 * 60000;
    const sel = ss.find((s) => s.id === r.sess);
    const rec = r.rec && r.ret && r.sess === r.rec;
    const avisos = [...(a.avisos || [])];
    if (proj) avisos.push(`Já está no Termix como "${proj.name}": a aba nova entra nele.`);
    if (r.ret && sel && busy(sel)) avisos.push('Essa conversa parece estar em uso agora em outro terminal: abrir a mesma conversa em dois lugares mistura o histórico.');
    if (r.ret && sel && sel.size > LONGA) avisos.push(`Conversa longa (${kb(sel.size)}): retomá-la recarrega todo o histórico. A aba nova com o pedido de localização sai mais barata.`);
    return `<div class="orgrow${r.abrir ? '' : ' off'}${a.ambiguo ? ' amb' : ''}" data-i="${i}">
      <div class="orghd"><label class="orgck"><input type="checkbox" data-o="abrir" ${r.abrir ? 'checked' : ''} ${a.existe ? '' : 'disabled'}><b>${esc(a.nome)}</b></label><span class="meta orgpath">${esc(a.pasta)}</span></div>
      <div class="orgchips">${chips.join('')}</div>
      <div class="orginfo">${a.andamento && a.andamento.length ? `<div><span class="meta">Em andamento:</span> ${a.andamento.slice(0, 3).map(esc).join(' · ')}</div>` : ''}
        ${a.checkpoint ? `<div><span class="meta">Último checkpoint:</span> ${esc(a.checkpoint)}</div>` : ''}
        ${g.commits && g.commits[0] ? `<div><span class="meta">Último commit:</span> ${esc(g.commits[0])}</div>` : ''}</div>
      <div class="orggrid">
        <div class="f"><label>Papel <span class="meta">(sugerido: ${esc(a.papel)} — ${esc(a.motivo || '')})</span></label><select class="inp" data-o="papel">${PAPEIS.map((p) => `<option ${p === r.papel ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
        <div class="f"><label>Aba que será criada</label><input class="inp" type="text" data-o="aba" maxlength="60" value="${esc(r.aba)}"></div>
      </div>
      <div class="orgret"><label class="orgck"><input type="checkbox" data-o="ret" ${r.ret ? 'checked' : ''} ${ss.length ? '' : 'disabled'}>Retomar uma conversa antiga em vez do pedido de localização</label>${rec ? ' <span class="chip orgrec" title="A conversa mais recente encontrada para este papel">recomendada</span>' : ''}
        ${ss.length ? `<select class="inp" data-o="sess" ${r.ret ? '' : 'disabled'}>${ss.map((s) => `<option value="${s.id}" ${s.id === r.sess ? 'selected' : ''}>${quando(s.mtime)} · ${kb(s.size)} · ${esc((s.titulo || s.primeiro || s.id.slice(0, 8)).slice(0, 70))}${s.id === r.rec ? ' · recomendada' : ''}${busy(s) ? ' · em uso?' : ''}</option>`).join('')}</select>` : '<span class="meta">nenhuma conversa do Claude Code nesta pasta</span>'}</div>
      ${avisos.length ? `<div class="orgav">${avisos.map((x) => `<div>⚠ ${esc(x)}</div>`).join('')}</div>` : ''}
    </div>`;
  }

  async function mapa(st) {
    const an = st.analise;
    const r = await modal({
      title: `Mapa do projeto: ${esc(st.nome)}`,
      body: `<div class="orgbody"><p class="meta">Confira o papel de cada pasta e a aba que será criada. Cada aba nova recebe um pedido curto para ler só o essencial (tarefas em andamento, handoff, CLAUDE.md e o último checkpoint) e dizer onde paramos. Retomar uma conversa antiga é opcional.${st.rows.some((x) => x.rec) ? ' O Termix deixou marcadas, como <b>recomendação</b>, as conversas mais recentes de orquestrador e de dev: troque ou desmarque à vontade.' : ''}</p>
        ${an.avisos.length || an.ambiguo ? `<div class="orgav top">${an.avisos.map((x) => `<div>⚠ ${esc(x)}</div>`).join('')}${an.ambiguo ? '<div>A análise ficou ambígua em algum ponto: ajuste o papel à mão ou use “Organizar com IA” (opcional).</div>' : ''}</div>` : ''}
        <div class="f"><label>Nome do projeto</label><input class="inp" type="text" data-f="nome" maxlength="60" value="${esc(st.nome)}"></div>
        <div id="orgRows">${st.rows.map(rowHtml).join('')}</div>
        <div class="f"><label>Permissão das abas novas</label><select class="inp" data-f="perm"><option value="n" ${st.perm === 'd' ? '' : 'selected'}>Normal</option><option value="d" ${st.perm === 'd' ? 'selected' : ''}>Dangerously</option></select></div>
        <div class="orgtips"><b>Economia</b>
          <div>• Abas novas que leem o checkpoint gastam menos que retomar conversas longas.</div>
          <div>• Retome só conversas curtas ou quando a pasta não tiver tarefas nem handoff.</div>
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
          if (k === 'abrir') x.abrir = el.checked;
          else if (k === 'papel') { x.papel = el.value; if (!x.abaManual) x.aba = `${x.papel} · ${x.a.nome}`; }
          else if (k === 'aba') { x.aba = el.value; x.abaManual = true; return; } // não redesenha enquanto digita
          else if (k === 'ret') x.ret = el.checked;
          else if (k === 'sess') x.sess = el.value;
          row.outerHTML = rowHtml(x, +row.dataset.i);
        };
        box.addEventListener('change', upd);
        box.addEventListener('input', (e) => { if (e.target.dataset.o === 'aba') upd(e); });
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
    const sel = st.rows.filter((x) => x.abrir && x.a.existe);
    if (!sel.length) return;
    const itens = sel.map((x) => ({ pasta: x.a.pasta, papel: x.papel, aba: (x.aba || '').trim() || `${x.papel} · ${x.a.nome}`, retomar: x.ret && x.sess ? x.sess : null, analise: x.a }));
    const prep = await call('orgPreparar', { nome: st.nome, itens });
    if (!prep || !prep.ok) { addEvent({ who: 'Importar projeto', msg: 'Não foi possível preparar os pedidos. Veja o erros.log.' }); return; }
    const conta = {};
    for (const it of itens) conta[it.papel] = (conta[it.papel] || 0) + 1;
    const ligacoes = [], pend = [];
    let primeiro = null;
    for (const it of itens) {
      let p = projOfPath(it.pasta);
      if (!p) {
        const nm = String(conta[it.papel] > 1 ? `${st.nome} · ${it.pasta.split(/[\\/]/).pop()}` : `${st.nome} · ${it.papel}`).slice(0, 60);
        p = addProject({ name: nm, path: it.pasta, imported: true, noTab: true });
      }
      primeiro = primeiro || p;
      const cor = COR[it.papel] || COR.Outro;
      if (it.retomar) {
        const tab = { id: crypto.randomUUID(), sessionId: it.retomar, agent: 'claude', name: it.aba.slice(0, 40), color: cor, perm: st.perm, started: true, open: true, live: false, archived: false };
        p.tabs.push(tab); p.activeTab = tab.id; save(); renderAll();
        pend.push(launch(p, tab, 'resume').catch(() => {}));
        ligacoes.push({ pasta: it.pasta, projeto: p.id, aba: tab.id, retomar: it.retomar });
      } else {
        const out = await abaComPedido(p, st.perm, it.aba.slice(0, 40), cor, prep.pedidos[it.pasta]);
        if (out.ok) { pend.push(out.go); ligacoes.push({ pasta: it.pasta, projeto: p.id, aba: out.tab.id }); }
      }
    }
    call('orgRegistrar', prep.grupo, ligacoes);
    if (st.fim) try { st.fim(); } catch { /* sem retorno */ } // DEV2-024: a tela "Novo projeto"/"Novo mutirão" que abriu o mapa é encerrada
    if (primeiro) { UI.cur = { p: primeiro.id, page: 'Terminais' }; renderAll(); }
    addEvent({ who: `Importar projeto · ${st.nome}`, msg: `${ligacoes.length} aba(s) criada(s). As abas novas recebem o pedido de localização assim que o Claude Code abrir; os pedidos ficam em ${prep.dir}.` });
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

  // gancho de teste (o caminho das pastas só é aceito pelo processo principal com TERMIX_VIBE_TEST=1)
  window.orgTest = { mapaDe: (ps, nome) => mapaDe(ps, nome), linhas: (an) => linhas(an), abrir: (st) => abrir(st), mapa: (st) => mapa(st), carregar: (st) => carregar(st), organizar: (st) => organizar(st), ver: (g) => verOrganizacao(null, g), analisar: (ps) => call('orgAnalisar', ps) };
})();
