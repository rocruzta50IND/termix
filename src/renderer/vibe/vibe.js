'use strict';
/* Módulo Vibe Coding e Mutirão — lado da interface.
   DEV2-001: chave em Configurações e botões no cabeçalho. DEV2-002: tela de entrega do Vibe Coding (formulário engessado).
   Carregado depois do app.js e independente dele: usa só o que o app.js já expõe no escopo global
   (S, save, modal, esc) e se pendura no cabeçalho e na página Configurações por observação do DOM.
   Desligado (padrão), não mostra nada. Fala com o processo principal só pelos canais 'vibe:*' (window.termix.vibe).
   Desenho: docs/VIBE_MUTIRAO.md. */
(() => {
  const on = () => { try { return !!(S && S.settings && S.settings.vibe && S.settings.vibe.on); } catch { return false; } };
  const call = async (ch, ...a) => { try { return await window.termix.vibe(ch, ...a); } catch (e) { console.error('vibe:', ch, e); return null; } };

  const SCREENS = {
    mutirao: { title: 'Mutirão', line: 'O dono do projeto define com o orquestrador a divisão do trabalho; cada sócio recebe uma parte numa branch própria e o contador mostra as entregas até liberar a implementação automática.' },
  };

  function openScreen(k) {
    try {
      if (k === 'vibe') { openVibe(); return; }
      const s = SCREENS[k];
      modal({ title: esc(s.title), body: `<p>${esc(s.line)}</p><span class="vibe-wip">Em construção</span>`, buttons: [['Fechar', null, 'pri']] });
    } catch (e) { console.error('vibe: tela', e); }
  }

  /* ---------- tela de entrega do Vibe Coding (DEV2-002) ---------- */
  const LIM_OBJ = 300;
  const EMPTY = () => ({ objetivo: '', criterio: '', proibido: '', acessos: '', nadaFornecer: false, fluxo: '', estrutura: '' });
  let V = null; // estado da tela aberta: { root, id, f, fx: { fluxo, estrutura }, entrega, timer, msg }

  const projects = () => { try { return S.projects.filter((p) => !p.archived); } catch { return []; } };
  const projOf = (id) => projects().find((p) => p.id === id);
  const fmtDate = (iso) => { try { return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); } catch { return iso || ''; } };

  // O que falta para iniciar, em linguagem clara (a regra que vale é a do processo principal; aqui é só para mostrar)
  function missing() {
    if (!V) return [];
    const f = V.f, out = [];
    if (!V.id) out.push('Escolha o projeto (item 1). Os outros campos abrem depois dele.');
    if (!f.objetivo.trim()) out.push('Escreva o objetivo final do projeto (item 2).');
    else if (f.objetivo.trim().length > LIM_OBJ) out.push(`Encurte o objetivo para até ${LIM_OBJ} caracteres (item 2).`);
    if (!f.fluxo) out.push('Escolha o arquivo do fluxo desenhado do projeto inteiro (item 3).');
    else if (V.fx.fluxo && !V.fx.fluxo.ok) out.push(`Fluxo desenhado (item 3): ${V.fx.fluxo.problems.join(' ')}`);
    if (!f.estrutura) out.push('Escolha o .md da estrutura do projeto (item 4). Use o modelo, se ainda não tiver.');
    else if (V.fx.estrutura && !V.fx.estrutura.ok) out.push(`Estrutura do projeto (item 4): ${V.fx.estrutura.problems.join(' ')}`);
    if (!f.criterio.trim()) out.push('Escreva o critério de pronto: como saber que o projeto acabou (item 5).');
    if (!f.nadaFornecer && !f.acessos.trim()) out.push('Liste os acessos e dados que você precisa fornecer, ou marque "Nada a fornecer" (item 7).');
    if ((f.fluxo && !V.fx.fluxo) || (f.estrutura && !V.fx.estrutura)) out.push('Conferindo os arquivos…');
    return out;
  }

  function fileBox(kind) {
    const f = V.f[kind], x = V.fx[kind];
    if (!f) return '<span class="vf-file none">Nenhum arquivo escolhido</span>';
    const cls = !x ? 'wait' : x.ok ? 'ok' : 'bad';
    let extra = '';
    if (kind === 'estrutura' && x && (x.missing || x.empty)) {
      const all = [...(x.missing || []).map((s) => [s, 'falta']), ...(x.empty || []).map((s) => [s, 'sem conteúdo'])];
      if (all.length) extra = `<ul class="vf-secs">${all.map(([s, w]) => `<li><b>${esc(s)}</b> — ${w}</li>`).join('')}</ul>`;
    }
    const prob = x && !x.ok && !extra ? `<div class="vf-prob">${esc(x.problems.join(' '))}</div>` : '';
    return `<span class="vf-file ${cls}" title="${esc(f)}">${esc(x ? x.name : f.split(/[\\/]/).pop())}${x && x.ok ? ' — conferido' : ''}</span>${prob}${extra}`;
  }

  function body() {
    const ps = projects();
    const dis = V.id ? '' : 'disabled';
    const f = V.f;
    const ent = V.entrega ? `<div class="vibe-note">Este projeto já tem uma entrega pronta, de ${esc(fmtDate(V.entrega.data))}. Ela continua guardada. Para trocar, ajuste os campos e clique em "Iniciar Vibe Coding": o Termix pede confirmação antes de substituir.</div>` : '';
    return `<div class="vibe-form">
      <p>Entregue o projeto completo de uma vez. Com tudo preenchido, o Termix cria um orquestrador e um dev que trabalham sozinhos até o fim. Quanto mais claro, menos retrabalho. O que você preencher fica salvo como rascunho.</p>
      ${ent}
      <div class="vf"><label for="vfProj">1. Projeto <em>obrigatório</em></label>
        <select class="inp" id="vfProj">${ps.length ? '' : '<option value="">Nenhum projeto no Termix. Crie um projeto antes.</option>'}${ps.length ? `<option value="" ${V.id ? '' : 'selected'}>Escolha o projeto…</option>` : ''}${ps.map((p) => `<option value="${esc(p.id)}" ${p.id === V.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
      <div class="vf"><label for="vfObj">2. Objetivo final do projeto <em>obrigatório</em></label>
        <input type="text" class="inp" id="vfObj" maxlength="${LIM_OBJ}" placeholder="Em uma frase: o que o projeto entrega e para quem" value="${esc(f.objetivo)}" ${dis}>
        <small class="vf-cnt">${f.objetivo.length}/${LIM_OBJ}</small></div>
      <div class="vf"><label>3. Fluxo desenhado do projeto inteiro <em>obrigatório</em></label>
        <div class="vf-pick"><button class="btn sm" data-vpick="fluxo" ${dis}>Escolher arquivo…</button><div class="vf-st" data-vst="fluxo">${fileBox('fluxo')}</div></div>
        <small>Aceita .png, .jpg, .svg, .pdf, .drawio, .excalidraw ou .md com um bloco Mermaid. Dicas de como desenhar no modelo.</small></div>
      <div class="vf"><label>4. Estrutura do projeto (.md) <em>obrigatório</em></label>
        <div class="vf-pick"><button class="btn sm" data-vpick="estrutura" ${dis}>Escolher .md…</button><div class="vf-st" data-vst="estrutura">${fileBox('estrutura')}</div></div>
        <small>Precisa ter as seções do modelo: Objetivo, Público e usuários, Funcionalidades, Fora do escopo, Telas e fluxos, Dados e regras de negócio, Integrações e acessos, Tecnologia e Critério de pronto. Baixe o modelo no botão abaixo.</small></div>
      <div class="vf"><label for="vfCrit">5. Critério de pronto <em>obrigatório</em></label>
        <textarea class="inp ta" id="vfCrit" rows="3" maxlength="4000" placeholder="Como saber que o projeto acabou? Ex.: um cliente consegue agendar pelo celular em menos de 1 minuto." ${dis}>${esc(f.criterio)}</textarea></div>
      <div class="vf"><label for="vfProib">6. O que os agentes NÃO podem fazer <em class="opt">opcional</em></label>
        <textarea class="inp ta" id="vfProib" rows="2" maxlength="4000" placeholder="Ex.: não mudar o banco de dados de produção; não trocar a tecnologia escolhida." ${dis}>${esc(f.proibido)}</textarea></div>
      <div class="vf"><label for="vfAcc">7. Acessos e dados que você precisa fornecer <em>obrigatório responder</em></label>
        <textarea class="inp ta" id="vfAcc" rows="3" maxlength="4000" placeholder="Um por linha. Ex.: conta da Vercel; chave de teste do Mercado Pago; planilha de clientes. Não escreva senhas aqui." ${dis || (f.nadaFornecer ? 'disabled' : '')}>${esc(f.acessos)}</textarea>
        <label class="vf-chk"><input type="checkbox" id="vfNada" ${f.nadaFornecer ? 'checked' : ''} ${dis}> Nada a fornecer: os agentes não vão precisar de nenhum acesso nem dado meu.</label></div>
      <div class="vibe-miss" id="vfMiss"></div>
      <div class="vibe-msg" id="vfMsg"></div>
    </div>`;
  }

  function paint() {
    if (!V || !V.root.isConnected) return;
    const m = missing();
    const box = V.root.querySelector('#vfMiss');
    box.className = `vibe-miss ${m.length ? '' : 'done'}`;
    box.innerHTML = m.length ? `<b>Falta para iniciar:</b><ul>${m.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<b>Tudo pronto.</b> Pode iniciar o Vibe Coding.';
    const go = V.root.querySelector('[data-vgo]');
    if (go) go.disabled = !!m.length || V.busy || V.saved; // gravada: só reabilita depois de mudar algo
    const msg = V.root.querySelector('#vfMsg');
    msg.className = `vibe-msg ${V.msg ? V.msg.kind : ''}`;
    msg.innerHTML = V.msg ? V.msg.html : '';
    for (const k of ['fluxo', 'estrutura']) { const st = V.root.querySelector(`[data-vst="${k}"]`); if (st) st.innerHTML = fileBox(k); }
  }

  function redraw() { // redesenha o formulário inteiro (troca de projeto, entrega concluída)
    if (!V || !V.root.isConnected) return;
    const host = V.root.querySelector('.vibe-form');
    host.outerHTML = body();
    wire(); paint();
  }

  const persist = () => { if (V && V.id) call('draftSet', V.id, V.f); };
  const persistSoon = () => { clearTimeout(V.timer); V.timer = setTimeout(persist, 300); };

  async function checkFiles() {
    const id = V.id;
    for (const k of ['fluxo', 'estrutura']) {
      V.fx[k] = null;
      if (V.f[k]) { const r = await call('check', k, V.f[k]); if (!V || V.id !== id) return; V.fx[k] = r || { ok: false, problems: ['Não foi possível conferir o arquivo.'] }; }
    }
    paint();
  }

  async function loadProject(id) {
    V.id = id || ''; V.saved = false; V.f = EMPTY(); V.fx = { fluxo: null, estrutura: null }; V.entrega = null; V.msg = null;
    if (V.id) {
      const [d, e] = await Promise.all([call('draftGet', V.id), call('entregaGet', V.id)]);
      if (!V || V.id !== id) return;
      V.entrega = e && e.status === 'pronta' ? e : null;
      const src = d || (V.entrega ? { objetivo: e.objetivo, criterio: e.criterioDePronto, proibido: e.naoPodem, acessos: (e.acessos || []).join('\n'), nadaFornecer: e.nadaAFornecer, fluxo: e.origem && e.origem.fluxo, estrutura: e.origem && e.origem.estrutura } : {});
      const base = EMPTY();
      for (const k of Object.keys(base)) if (src[k] != null) base[k] = typeof base[k] === 'boolean' ? !!src[k] : String(src[k]);
      V.f = base;
      try { S.settings.vibe = { ...(S.settings.vibe || {}), last: V.id }; save(); } catch { /* sem preferência gravada */ }
    }
    redraw();
    checkFiles();
  }

  // Escolher arquivo. testPath só é usado no modo de teste (TERMIX_VIBE_TEST=1); fora dele o processo principal ignora.
  async function pick(kind, testPath) {
    if (!V || !V.id) return null;
    const r = await call('pick', kind, testPath);
    if (!V || !r || r.canceled) return r;
    V.f[kind] = r.path; V.fx[kind] = r; V.msg = null; V.saved = false;
    persist(); paint();
    return r;
  }

  async function template(testPath) {
    const r = await call('template', testPath);
    if (!V) return r;
    if (r && r.ok) V.msg = { kind: 'ok', html: `Modelo salvo em <b>${esc(r.path)}</b>. Abra, preencha todas as seções e escolha o arquivo no item 4.` };
    else if (r && !r.canceled) V.msg = { kind: 'bad', html: 'Não foi possível salvar o modelo.' };
    paint();
    return r;
  }

  function payload() {
    const p = projOf(V.id) || {};
    return { projectId: V.id, projectName: p.name || '', projectPath: p.path || '', ...V.f };
  }

  async function start(replace) {
    if (!V || missing().length || V.busy) return null;
    V.busy = true; V.msg = { kind: '', html: 'Gravando a entrega…' }; paint();
    persist();
    const r = await call('entregaSave', payload(), !!replace);
    if (!V) return r;
    V.busy = false;
    if (r && r.ok) {
      V.entrega = r.entrega; V.saved = true;
      V.msg = { kind: 'ok', html: `<b>Entrega pronta.</b> Os agentes chegam na próxima etapa (DEV2-003).<br><small>Guardada em ${esc(r.pasta)}</small>` };
    } else if (r && r.exists) {
      V.msg = { kind: 'warn', html: `Este projeto já tem uma entrega pronta, de ${esc(fmtDate(r.entrega && r.entrega.data))}. Substituir? A anterior não é apagada: fica guardada no histórico do módulo.<div class="vibe-confirm"><button class="btn sm" data-vno>Cancelar</button><button class="btn sm pri" data-vyes>Substituir entrega</button></div>` };
    } else {
      V.msg = { kind: 'bad', html: `Não foi possível gravar a entrega.${r && r.problems ? `<ul>${r.problems.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}` };
    }
    paint();
    try { V.root.querySelector('#vfMsg').scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch { /* tela fechada */ }
    return r;
  }

  function wire() {
    const R = V.root;
    R.querySelector('#vfProj').onchange = (e) => { clearTimeout(V.timer); persist(); loadProject(e.target.value); };
    const txt = (sel, k) => { const el = R.querySelector(sel); el.oninput = () => { V.f[k] = el.value; V.msg = null; V.saved = false; if (k === 'objetivo') R.querySelector('.vf-cnt').textContent = `${el.value.length}/${LIM_OBJ}`; persistSoon(); paint(); }; };
    txt('#vfObj', 'objetivo'); txt('#vfCrit', 'criterio'); txt('#vfProib', 'proibido'); txt('#vfAcc', 'acessos');
    // Enter nos campos não fecha o modal (o modal do app trata Enter num <input> como o último botão)
    R.querySelector('.vibe-form').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.stopPropagation(); });
    R.querySelector('#vfNada').onchange = (e) => { V.f.nadaFornecer = e.target.checked; V.msg = null; V.saved = false; R.querySelector('#vfAcc').disabled = e.target.checked; persist(); paint(); };
    R.querySelectorAll('[data-vpick]').forEach((b) => { b.onclick = () => pick(b.dataset.vpick); });
  }

  async function openVibe() {
    if (V) return;
    const ps = projects();
    let last = '';
    try { last = (S.settings.vibe && S.settings.vibe.last) || ''; } catch { /* sem preferência */ }
    const id = projOf(last) ? last : ps.length === 1 ? ps[0].id : '';
    V = { root: null, id, f: EMPTY(), fx: { fluxo: null, estrutura: null }, entrega: null, msg: null, busy: false, timer: null };
    const p = modal({
      title: 'Vibe Coding — entrega do projeto',
      body: body(),
      buttons: [['Baixar modelo (.md)', 'tpl'], ['Fechar', null], ['Iniciar Vibe Coding', 'go', 'pri']],
      onOpen: (root) => {
        V.root = root;
        const bs = root.querySelectorAll('.foot2 [data-mb]');
        bs[0].onclick = () => template(); bs[0].dataset.vtpl = '';
        bs[2].onclick = () => start(false); bs[2].dataset.vgo = '';
        // confirmação de substituir (dentro da própria tela; o app só tem um modal por vez)
        root.addEventListener('click', (e) => {
          if (e.target.closest('[data-vyes]')) start(true);
          else if (e.target.closest('[data-vno]')) { V.msg = null; paint(); }
        });
        wire(); paint();
      },
    });
    loadProject(id);
    await p;
    if (V) { clearTimeout(V.timer); persist(); }
    V = null;
  }

  /* gancho de teste: só existe com o app aberto em modo de teste (TERMIX_VIBE_TEST=1), porque o diálogo nativo de arquivo
     não é automatizável por CDP. Sem esse modo, nada é exposto e a interface não tem atalho escondido. */
  call('status').then((s) => {
    if (s && s.test) window.vibeTest = { open: () => openVibe(), pick: (k, p) => pick(k, p), template: (p) => template(p), start: (r) => start(r), state: () => (V ? { id: V.id, f: { ...V.f }, missing: missing(), entrega: V.entrega } : null) };
  });

  /* botões no cabeçalho: o app.js redesenha o #topbar inteiro; reponho os botões a cada redesenho */
  function mountTop() {
    const top = document.getElementById('topbar');
    if (!top) return;
    const cur = top.querySelector('.vibebtns');
    if (!on()) { if (cur) cur.remove(); return; }
    if (cur) return;
    const anchor = top.querySelector('[data-togact]');
    if (!anchor) return;
    const box = document.createElement('div');
    box.className = 'vibebtns';
    box.innerHTML = '<button class="vibebtn" data-vibe-open="vibe" title="Vibe Coding (experimental)"><i></i>Vibe Coding</button><button class="vibebtn mut" data-vibe-open="mutirao" title="Mutirão (experimental)"><i></i>Mutirão</button>';
    box.addEventListener('click', (e) => { const b = e.target.closest('[data-vibe-open]'); if (b) { e.stopPropagation(); openScreen(b.dataset.vibeOpen); } });
    const before = top.querySelector('#updchip') || anchor;
    top.insertBefore(box, before);
  }

  /* chave em Configurações: anexada ao fim da página quando ela é desenhada */
  function mountConf() {
    const page = document.getElementById('page');
    if (!page || !page.querySelector('#rngOp') || page.querySelector('#vibeConf')) return;
    const host = page.querySelector('.page');
    if (!host) return;
    const box = document.createElement('div');
    box.id = 'vibeConf';
    const draw = () => {
      const v = on();
      box.innerHTML = `<h5 style="margin:22px 0 8px">Experimental</h5><div class="card" style="padding:6px 18px"><div class="row"><div class="grow">Vibe Coding e Mutirão (experimental)<small>Mostra no cabeçalho os botões Vibe Coding e Mutirão. O Vibe Coding já recebe a entrega do projeto (os agentes chegam numa próxima versão); o Mutirão ainda está em construção.</small></div><div class="seg"><button class="${v ? 'sel' : ''}" data-vibe-set="1">Sim</button><button class="${v ? '' : 'sel'}" data-vibe-set="0">Não</button></div></div></div>`;
    };
    draw();
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-vibe-set]');
      if (!b) return;
      e.stopPropagation();
      S.settings.vibe = { ...(S.settings.vibe || {}), on: b.dataset.vibeSet === '1' };
      save(); draw(); mountTop();
    });
    host.appendChild(box);
  }

  function boot() {
    try {
      const top = document.getElementById('topbar'), page = document.getElementById('page');
      if (top) new MutationObserver(mountTop).observe(top, { childList: true });
      if (page) new MutationObserver(mountConf).observe(page, { childList: true });
      mountTop(); mountConf();
    } catch (e) { console.error('vibe: início', e); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
