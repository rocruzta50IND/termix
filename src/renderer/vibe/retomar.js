'use strict';
/* DEV2-026 — "Retomar projeto" e a estrutura legível do projeto (interface). Desenho: docs/ORGANIZADOR.md.
   Carregado pelo vibe.js (o núcleo só ganhou 1 chamada no npSubmit). Usa o escopo global do app.js (S, UI, RT, modal, esc,
   createTab, findTab, launch, addEvent, save, renderAll, api) e o que o organizador.js expõe em window.TermixOrg
   (waitHook, typeLine), e fala com o processo principal só pelos canais 'vibe:ret*'.
   Padrão do Ygor: todo projeto de desenvolvimento começa com um orquestrador + um dev (o dev aberto sem tarefa não gasta token).
   Estrutura = CLAUDE.md + docs/TASKS.md + docs/ESTADO.md. Quem grava é o orquestrador, por um pedido em arquivo, sem commit. */
(() => {
  const call = async (ch, ...a) => { try { return await window.termix.vibe(ch, ...a); } catch (e) { console.error('retomar:', ch, e); return null; } };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const ORG = () => window.TermixOrg || {};
  const COR = { orq: '#A78BFA', dev: '#34D399' };
  const RX = { orq: /^orquestrador/i, dev: /^dev\b/i };
  const kb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
  const quando = (ms) => { const d = new Date(ms); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const alive = (id) => { try { return !!(RT[id] && RT[id].alive); } catch { return false; } };
  const mil = (n) => (n >= 1000 ? `${Math.round(n / 1000)} mil` : String(n));
  const ponte = () => window.TermixVibeBridge || {};

  /* ---------- abas: reaproveita com /clear, cria as que faltam ---------- */
  const abaDoCiclo = (p, t) => { // o /clear NUNCA toca nas abas do ciclo do Vibe/Mutirão
    if (/^vibe\b/i.test(String(t.name))) return true;
    try { return (ponte().cicloAbas ? ponte().cicloAbas(p.id) : []).includes(t.id); } catch { return false; }
  };
  const acha = (p, rx) => p.tabs.find((t) => t.open && !t.archived && (t.agent || 'claude') === 'claude' && t.kind !== 'chat' && rx.test(String(t.name)) && !abaDoCiclo(p, t));
  async function limpar(tab) { // /clear e espera o SessionStart (source "clear")
    const o = ORG();
    const w = o.waitHook(tab.id, (d) => d.event === 'SessionStart' && d.source === 'clear', 20000);
    let got = false; w.then((d) => { got = !!d; });
    api.write(tab.id, '\x15'); await sleep(200);
    api.write(tab.id, '/clear');
    let n = 0;
    const enter = () => { if (got || !alive(tab.id)) return; api.write(tab.id, '\r'); if (++n < 3) setTimeout(enter, 5000); };
    setTimeout(enter, 500);
    const d = await w;
    if (d) await sleep(1500);
    return !!d;
  }
  // Devolve a aba pronta (Claude Code aberto, contexto limpo). Existe e está viva: /clear. Existe sem processo: recomeça limpa.
  // Não existe: cria. { tab, como: 'clear' | 'nova' | 'criada' }
  async function abaPronta(p, chave, nome, perm) {
    const o = ORG();
    let t = acha(p, RX[chave]);
    if (t && alive(t.id)) { await limpar(t); return { tab: t, como: 'clear' }; }
    if (t) {
      t.sessionId = crypto.randomUUID(); t.started = false; save();
      const w = o.waitHook(t.id, (d) => d.event === 'SessionStart', 5 * 60000);
      await launch(p, t, 'new'); await w; await sleep(1500);
      return { tab: t, como: 'nova' };
    }
    createTab(p, perm || 'n', { name: nome, color: COR[chave] });
    t = findTab(p.activeTab) && findTab(p.activeTab).tab;
    if (!t) return null;
    const w = o.waitHook(t.id, (d) => d.event === 'SessionStart', 5 * 60000);
    await w; await sleep(1500);
    return { tab: t, como: 'criada' };
  }
  const linhaPedido = (arq) => (/\s/.test(arq) ? `Termix: leia e siga o pedido em ${arq}` : `Termix: siga o pedido @${arq} (anexado)`);
  async function pedidoNaAba(p, tab, arq) {
    const s = await ORG().typeLine(tab.id, linhaPedido(arq));
    if (!s) addEvent({ c: COR.orq, who: tab.name, tabId: tab.id, msg: `O pedido não foi confirmado. Ele está em ${arq}` });
    return !!s;
  }
  // Orquestrador com o pedido; dev só abre (ou /clear) e fica esperando.
  async function orqEDev(p, arq) {
    const perm = (p.tabs.find((t) => t.open && t.perm) || {}).perm || 'n';
    const dev = abaPronta(p, 'dev', 'Dev', perm); // em paralelo: o dev não recebe pedido
    const orq = await abaPronta(p, 'orq', 'Orquestrador', perm);
    if (orq) await pedidoNaAba(p, orq.tab, arq);
    await dev;
    UI.cur = { p: p.id, page: 'Terminais' }; renderAll();
    return orq;
  }

  /* ---------- lista de chats antigos (5.1) ---------- */
  function listaHtml(convs, sel, teto) {
    if (!convs.length) return '';
    const tot = convs.filter((c) => sel.has(c.id)).reduce((s, c) => s + c.tokens, 0);
    return `<div class="retchats"><b>Chats antigos deste projeto (fora do Termix)</b>
      <p class="meta">Marque os que guardam conhecimento: cada um é <b>retomado uma vez, em segundo plano e só leitura</b> (modelo Sonnet), para escrever o que sabe. Nenhuma aba abre e a conversa original não recebe a pergunta (usa uma cópia). Teto: ${teto} chats, os mais recentes.</p>
      <div class="retlist">${convs.slice(0, 12).map((c) => `<label class="retck"><input type="checkbox" data-rc="${c.id}" ${sel.has(c.id) ? 'checked' : ''}> <span>${quando(c.mtime)} · ${kb(c.size)} · ~${mil(c.tokens)} tokens${c.recente ? ' · <span class="chip orgrec">mais recente</span>' : ''} · ${esc((c.titulo || c.primeiro || c.id.slice(0, 8)).slice(0, 70))}</span></label>`).join('')}</div>
      <p class="meta retcusto">${sel.size ? `${sel.size} marcado(s): custo estimado ~${mil(tot)} tokens de entrada (cada conversa é reprocessada uma vez, com o cache frio).` : 'Nenhum marcado: o orquestrador levanta a estrutura pelo README, pelos manifestos e pelo git log.'}</p>
      <button class="btn sm" data-rcopy>Copiar prompt</button> <span class="meta">para usar em chats fora do Termix (alternativa manual)</span></div>`;
  }
  function ligaLista(root, convs, sel, teto, redesenha) {
    root.addEventListener('change', (e) => {
      const el = e.target.closest('[data-rc]'); if (!el) return;
      if (el.checked) { if (sel.size >= teto) { el.checked = false; addEvent({ who: 'Chats antigos', msg: `O teto é ${teto} chats por vez.` }); return; } sel.add(el.dataset.rc); } else sel.delete(el.dataset.rc);
      const cc = root.querySelector('.retcusto'); if (cc) cc.outerHTML = (listaHtml(convs, sel, teto).match(/<p class="meta retcusto">[\s\S]*?<\/p>/) || [''])[0];
      if (redesenha) redesenha();
    });
    const b = root.querySelector('[data-rcopy]');
    if (b) b.onclick = async () => { const t = await call('retCopiar'); try { await navigator.clipboard.writeText(t); b.textContent = 'Copiado'; } catch { b.textContent = 'Não consegui copiar'; } };
  }

  /* ---------- coleta em segundo plano (5.1-B): painel com k/N, sem bloquear o app ---------- */
  function coletar(p, convs) {
    return new Promise(async (resolve) => {
      const r = await call('retColetaIniciar', { id: p.id, nome: p.name, convs });
      if (!r || !r.ok) { addEvent({ who: `Chats antigos · ${p.name}`, msg: (r && r.motivo) || 'Não foi possível iniciar a coleta. Veja o erros.log.' }); return resolve({ ok: false, feitas: 0 }); }
      const card = document.createElement('div'); card.className = 'retcard glass'; card.dataset.retcard = p.id;
      document.body.appendChild(card);
      let fim = false;
      const pinta = (e) => {
        const f = (e && e.feitas) || 0, tot = (e && e.total) || r.total, at = (e && e.atual) || 1;
        card.innerHTML = `<b>Chats antigos · ${esc(p.name)}</b><div class="retbar"><i style="width:${Math.round((f / tot) * 100)}%"></i></div>
          <div class="meta">${e && e.status !== 'rodando' ? `Coleta ${e.status === 'pronta' ? 'concluída' : e.status}: ${f}/${tot}${e.falhas ? ` (${e.falhas} falhou)` : ''}.` : `Coletando ${Math.min(at, tot)}/${tot} (uma por vez, em segundo plano)…`}</div>
          ${e && e.status === 'rodando' ? '<button class="btn sm" data-retcancel>Cancelar</button>' : ''}`;
        const c = card.querySelector('[data-retcancel]'); if (c) c.onclick = () => call('retColetaCancelar', p.id);
      };
      pinta(null);
      while (!fim) {
        await sleep(TEST ? 300 : 2000);
        const e = await call('retColetaEstado', p.id);
        if (!e) continue;
        pinta(e);
        if (e.status !== 'rodando') { fim = true; setTimeout(() => card.remove(), 4000); resolve({ ok: e.feitas > 0, feitas: e.feitas, total: e.total, falhas: e.falhas, status: e.status }); }
      }
    });
  }
  const TEST = !!(window.__retTest);

  /* ---------- criar a estrutura: coleta (se houver chats marcados) + orquestrador novo ---------- */
  async function criarEstrutura(p, { pastas, convs }) {
    let col = null;
    if (convs && convs.length) {
      col = await coletar(p, convs);
      if (col.status === 'cancelada') { addEvent({ who: `Estrutura · ${p.name}`, msg: 'Coleta cancelada: nada foi criado.' }); return false; }
      if (!col.ok) addEvent({ who: `Estrutura · ${p.name}`, msg: 'Nenhum chat respondeu: o orquestrador vai levantar a estrutura pelo README, pelos manifestos e pelo git log.' });
    }
    const ped = await call('retPedidoEstrutura', { id: p.id, nome: p.name, pasta: p.path, pastas: pastas && pastas.length ? pastas : [p.path] });
    if (!ped || !ped.ok) { addEvent({ who: `Estrutura · ${p.name}`, msg: 'Não foi possível montar o pedido. Veja o erros.log.' }); return false; }
    addEvent({ who: `Estrutura · ${p.name}`, msg: `Orquestrador novo (contexto limpo) criando o guia (CLAUDE.md, só acrescenta), docs/TASKS.md e docs/ESTADO.md, sem commit. Pedido: ${ped.arquivo}` });
    await orqEDev(p, ped.arquivo);
    return true;
  }

  /* ---------- ao adicionar o projeto (Usar pasta existente, uma ou várias pastas) ---------- */
  // Devolve true quando tratou o projeto (abas criadas); false para o núcleo seguir com o fluxo antigo.
  async function aoAdicionar(p, { pastas } = {}) {
    try {
      if (!p || !p.path) return false;
      vistos.add(p.id);
      const ps = pastas && pastas.length ? pastas : [p.path];
      const est = await call('retEstrutura', p.path);
      if (est && est.completa) { // exceção: já tem guia, tarefas e estado: pula a coleta e entra direto
        const ped = await call('retPedidoRetomar', { id: p.id, nome: p.name, pasta: p.path });
        await orqEDev(p, ped.arquivo);
        addEvent({ who: p.name, msg: 'Projeto já estruturado (guia, tarefas e estado): entrou direto com orquestrador e dev.' });
        return true;
      }
      const convs = (await call('retConversas', ps)) || [];
      const teto = (await call('retTeto')) || 5;
      const sel = new Set(convs.slice(0, 1).map((c) => c.id));
      const r = await modal({
        title: 'Criar estrutura do projeto',
        body: `<div class="orgbody"><p>O Termix não achou ${esc((est && est.falta ? est.falta : ['a estrutura']).join(', '))} em <b>${esc(p.name)}</b>. A estrutura (guia <code>CLAUDE.md</code>, lista de tarefas <code>docs/TASKS.md</code> e estado <code>docs/ESTADO.md</code>) deixa o projeto legível para o orquestrador: ele retoma de onde parou sem reler o projeto inteiro. Os arquivos são gravados na branch atual, <b>sem commit</b>; o <code>CLAUDE.md</code> só ganha uma seção no fim.</p>
          ${convs.length ? '' : '<p class="meta">Nenhum chat antigo encontrado para esta pasta: o orquestrador novo lê o README, os manifestos, a árvore em 2 níveis e um git log curto (sem ler o projeto inteiro).</p>'}
          <div id="retLista">${listaHtml(convs, sel, teto)}</div></div>`,
        buttons: [['Agora não', null], ['Criar estrutura', 'ok', 'pri']],
        onOpen: (root) => { root.querySelector('.dlg').classList.add('orgdlg'); ligaLista(root, convs, sel, teto); },
      });
      if (r.value !== 'ok') return false;
      return await criarEstrutura(p, { pastas: ps, convs: convs.filter((c) => sel.has(c.id)).map((c) => ({ id: c.id, pasta: c.pasta })) });
    } catch (e) { console.error('retomar: aoAdicionar', e); return false; }
  }

  const vistos = new Set(); // projetos já oferecidos nesta execução do Termix

  window.TermixRet = { aoAdicionar, criarEstrutura, coletar, orqEDev, abaPronta, listaHtml, ligaLista, vistos };
})();
