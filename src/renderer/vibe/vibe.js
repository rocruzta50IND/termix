'use strict';
/* Módulo Vibe Coding e Mutirão — lado da interface.
   DEV2-001: chave em Configurações e botões no cabeçalho. DEV2-002: tela de entrega do Vibe Coding (formulário engessado).
   DEV2-003: ciclo com orquestrador e dev (abas do próprio app), plano, perguntas e painel de andamento.
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

  /* ---------- ciclo do Vibe Coding (DEV2-003): orquestrador e dev, plano e perguntas ----------
     Quem conduz e espera é o Termix (este código, zero token): cria as abas pelo createTab do app, digita pedidos curtos
     no terminal do orquestrador (pty:write) e percebe o fim do turno pelo hook Stop que o app já recebe. O estado fica em
     vibe\<id>\estado.json; ao reabrir o app, a tela mostra onde parou e nada recomeça sozinho. */
  const WAITING = ['abrindo', 'plano', 'fechando', 'execucao']; // esperando o agente (ao reabrir o app, vira "Pausado")
  const ACTIVE = [...WAITING, 'perguntas']; // ciclo em andamento (inclui esperar o humano)
  const BUSY = [...ACTIVE, 'pronto', 'pausado']; // com o ciclo nessas fases, "Iniciar" não é a ação da tela
  const ORQ_NAME = 'Vibe · Orquestrador', DEV_NAME = 'Vibe · Dev';
  const CY = {}; // por projeto: { est, wait: { tab, ev, since }, live, plano, perguntas, ans, err, timer, loaded, gen, esperando }
  const cyOf = (id) => (CY[id] = CY[id] || { est: null, wait: null, live: false, plano: null, perguntas: [], ans: {}, err: '', timer: null, loaded: false, gen: 0, esperando: null });
  const tabOf = (tid) => { try { const f = tid && findTab(tid); return f && f.tab.open ? f.tab : null; } catch { return null; } };
  const isAlive = (tid) => { try { return !!(RT[tid] && RT[tid].alive); } catch { return false; } };
  const nowIso = () => new Date().toISOString();
  const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;
  const cycleActive = (id) => { const c = id && CY[id]; return !!(c && c.est && BUSY.includes(c.est.fase)); };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function cyRead(id) {
    const r = await call('planoLer', id);
    const c = cyOf(id);
    c.plano = r && r.plano && r.plano.ok ? r.plano : null;
    c.perguntas = r && r.perguntas && r.perguntas.ok ? r.perguntas.lista : [];
    return r;
  }
  async function cyLoad(id) {
    const c = cyOf(id);
    if (!c.loaded) { const r = await call('cicloGet', id); c.est = (r && r.estado) || null; c.loaded = true; }
    if (c.est) await cyRead(id);
    return c;
  }
  function cySave(id) { const c = cyOf(id); if (c.est) call('cicloSet', id, c.est); paintCycle(); }

  // Aviso ao humano pelo mecanismo de notificações do app (painel do sino, dica, som e Windows sem foco).
  function notifyHuman(p, tab, msg) {
    try {
      const cfg = notifCfg();
      if (cfg.perm === false) return;
      const ev = { c: tab ? tab.color : '#A78BFA', who: `Vibe Coding${p ? ` · ${p.name}` : ''}`, tabId: tab ? tab.id : undefined, msg, kind: 'perm', acts: tab ? [['Abrir', 'open', tab.id]] : [] };
      addEvent(ev);
      if (!document.hasFocus() && cfg.win && tab) api.notify({ tabId: tab.id, title: `Vibe Coding · ${p ? p.name : ''}`, body: msg });
      showToast(ev); beep('perm');
    } catch (e) { console.error('vibe: aviso', e); }
  }

  // Inicia um ciclo novo: arquiva o anterior, cria as duas abas (Dangerously: trabalham sem pedir aprovação) e espera o orquestrador abrir.
  async function startCycle(id) {
    const p = projOf(id);
    if (!p) return false;
    const c = cyOf(id);
    await call('cicloNovo', id);
    // pasta confiável (decisão do Ygor): o Termix marca antes de abrir as abas, para o Claude Code não parar perguntando
    const tr = await call('trust', id);
    clearTimeout(c.timer);
    Object.assign(c, { plano: null, perguntas: [], ans: {}, err: '', wait: null, loaded: true });
    UI.cur = { p: p.id, page: 'Terminais' }; UI.last = p.id;
    createTab(p, 'd', { name: ORQ_NAME, color: '#A78BFA' });
    const orq = p.activeTab;
    createTab(p, 'd', { name: DEV_NAME, color: '#34D399' }); // nesta etapa o dev só é criado e fica parado
    const dev = p.activeTab;
    p.activeTab = orq; save(); renderAll();
    c.est = { versao: 1, fase: 'abrindo', rodada: 0, orq, dev, iniciado: nowIso(), aviso: tr && !tr.ok ? `O Termix não marcou a pasta como confiável (${tr.motivo || 'erro'}). Se o Claude Code perguntar na aba, escolha "Yes, I trust this folder".` : '' };
    c.live = true;
    const w = (c.wait = { tab: orq, ev: 'SessionStart', since: Date.now() - 2000 });
    c.timer = setTimeout(() => {
      if (c.wait !== w || !c.est || c.est.fase !== 'abrindo') return;
      c.est.aviso = `O orquestrador ainda não abriu. Confira a aba "${ORQ_NAME}": numa pasta nova, o Claude Code pergunta se você confia nela (escolha "Yes, I trust this folder"). O Termix envia o pedido sozinho quando ele abrir; se não enviar, clique em "Enviar o pedido agora".`;
      cySave(id);
      notifyHuman(p, tabOf(orq), 'O orquestrador ainda não abriu: confira a aba (o Claude Code pode estar perguntando se você confia na pasta).');
    }, 30000);
    cySave(id);
    return true;
  }

  // Digita um pedido curto no terminal do orquestrador e passa a esperar o fim do turno (hook Stop).
  async function sendPrompt(id, kind) {
    const c = cyOf(id);
    if (!c.est || c.est.fase === 'parado') return false;
    const tab = tabOf(c.est.orq);
    if (!tab || !isAlive(tab.id)) { c.est.aviso = `A aba "${ORQ_NAME}" não está aberta. Abra-a (ou clique em Retomar na aba) e depois clique em "Retomar" aqui.`; cySave(id); return false; }
    const text = await call('cicloPrompt', id, kind);
    if (!text) { c.est.aviso = 'Não foi possível montar o pedido (a entrega do projeto não foi encontrada).'; cySave(id); return false; }
    clearTimeout(c.timer);
    c.live = true;
    c.wait = { tab: tab.id, ev: 'Stop', since: Date.now() };
    c.est = { ...c.est, fase: kind === 'fechar' ? 'fechando' : 'plano', aviso: '', enviado: nowIso() };
    cySave(id);
    typeIn(tab, c.wait);
    return true;

    // Um texto longo chega ao Claude Code como colagem e o Enter logo em seguida é engolido (o typeTo do app espera só 150 ms).
    // Por isso: Enter 1 s depois e, enquanto o hook de prompt enviado não chega, mais um (com a caixa vazia ele não faz nada).
    function typeIn(t, w) {
      api.write(t.id, text);
      let n = 0;
      const enter = () => {
        if (c.wait !== w || !isAlive(t.id) || (n > 0 && stOf(t) === 'work')) return;
        api.write(t.id, '\r');
        if (++n < 4) setTimeout(enter, 3000);
      };
      setTimeout(enter, 1000);
    }
  }

  // Fim do turno do orquestrador: o Termix lê os arquivos e decide o próximo passo.
  async function afterTurn(id) {
    const c = cyOf(id);
    if (!c.est || !WAITING.includes(c.est.fase)) return;
    const prev = c.est.fase;
    const r = await cyRead(id);
    const p = projOf(id), tab = tabOf(c.est.orq);
    // perguntas.json ausente com um plano gravado neste turno = nenhuma pergunta (o agente às vezes não grava a lista vazia)
    if (r && r.plano.ok && !r.perguntas.ok && r.perguntas.ausente && r.plano.mtime >= Date.parse(c.est.enviado || 0) - 2000) r.perguntas = { ok: true, lista: [] };
    if (!r || !r.plano.ok || !r.perguntas.ok) {
      const falta = [!(r && r.plano.ok) && 'plano.md', !(r && r.perguntas.ok) && 'perguntas.json'].filter(Boolean).join(' e ');
      c.live = false;
      c.est = { ...c.est, fase: 'erro', antes: prev, aviso: `O orquestrador encerrou o turno sem gravar ${falta} no formato pedido. Veja a aba "${ORQ_NAME}" e clique em "Retomar" para pedir de novo.` };
      cySave(id);
      notifyHuman(p, tab, `O orquestrador terminou sem gravar ${falta}.`);
      return;
    }
    if (c.perguntas.length) {
      c.ans = {}; c.err = ''; c.live = true;
      c.est = { ...c.est, fase: 'perguntas', rodada: (c.est.rodada || 0) + 1, nPerguntas: c.perguntas.length, aviso: '' };
      cySave(id);
      notifyHuman(p, tab, `${plural(c.perguntas.length, 'pergunta esperando', 'perguntas esperando')} você na tela do Vibe Coding.`);
    } else {
      c.live = false;
      c.est = { ...c.est, fase: 'pronto', tarefas: r.plano.tarefas, aviso: branchAlert(r), pronto: nowIso() };
      cySave(id);
    }
  }
  // o Termix confere o plano (zero token): commit ou push na main/master é proibido e vira alerta na tela
  function branchAlert(r) {
    const l = r && r.plano && r.plano.mainCommit && r.plano.mainCommit[0];
    return l ? `Atenção: o plano cita commit ou push na main/master ("${l.trim().slice(0, 100)}"). Isso é proibido: a execução só usa a branch permitida e a trava do Termix bloqueia commit e push na main/master.` : '';
  }

  const answerOf = (c, q) => { const a = c.ans[q.id] || {}; return [a.op, (a.tx || '').trim()].filter(Boolean).join(' — '); };
  async function sendAnswers(id) {
    const c = cyOf(id);
    if (!c.est || c.est.fase !== 'perguntas') return false;
    if (c.perguntas.some((q) => !answerOf(c, q))) { c.err = 'Responda todas as perguntas antes de enviar.'; paintCycle(); return false; }
    c.err = '';
    const respostas = c.perguntas.map((q) => ({ id: q.id, pergunta: q.texto, resposta: answerOf(c, q) }));
    if (!(await call('respostasSave', id, { rodada: c.est.rodada, respostas }))) { c.err = 'Não foi possível gravar as respostas.'; paintCycle(); return false; }
    return sendPrompt(id, 'fechar');
  }

  // Parar: o Termix deixa de conduzir; se o orquestrador estiver no meio de um turno, interrompe (Esc). Nada é apagado e as abas ficam.
  function stopCycle(id) {
    const c = cyOf(id);
    if (!c.est) return;
    clearTimeout(c.timer);
    c.wait = null; c.live = false;
    c.gen++; cancelWaits(c); c.esperando = null; // a execução em andamento para de conduzir
    for (const k of ['orq', 'dev']) {
      const tab = tabOf(c.est[k]);
      try { if (tab && isAlive(tab.id) && stOf(tab) === 'work') api.write(tab.id, '\x1b'); } catch { /* aba já encerrada */ }
    }
    const from = ['parado', 'erro'].includes(c.est.fase) ? (c.est.antes || 'plano') : c.est.fase === 'pausado' ? 'execucao' : c.est.fase;
    c.est = { ...c.est, fase: 'parado', antes: from, parado: nowIso(), aviso: '' };
    cySave(id);
  }

  // Retomar: primeiro lê os arquivos (zero token); só pede algo ao orquestrador se faltar.
  async function resumeCycle(id) {
    const c = cyOf(id);
    if (!c.est) return;
    const prev = ['parado', 'erro'].includes(c.est.fase) ? (c.est.antes || 'plano') : c.est.fase;
    if (prev === 'execucao' || prev === 'pausado') return continueExec(id); // execução (DEV2-004): segue de onde parou
    const r = await cyRead(id);
    if (r && r.plano.ok && !r.perguntas.ok && r.perguntas.ausente) r.perguntas = { ok: true, lista: [] }; // plano sem lista de perguntas = nenhuma pergunta
    if (r && r.plano.ok && r.perguntas.ok && prev !== 'fechando') {
      if (c.perguntas.length) { c.live = true; c.est = { ...c.est, fase: 'perguntas', rodada: Math.max(1, c.est.rodada || 0), nPerguntas: c.perguntas.length, aviso: '' }; }
      else { c.live = false; c.est = { ...c.est, fase: 'pronto', tarefas: r.plano.tarefas, aviso: branchAlert(r), pronto: nowIso() }; }
      cySave(id);
      return;
    }
    if (r && r.plano.ok && r.perguntas.ok && prev === 'fechando' && !c.perguntas.length) { c.live = false; c.est = { ...c.est, fase: 'pronto', tarefas: r.plano.tarefas, aviso: branchAlert(r), pronto: nowIso() }; cySave(id); return; }
    c.est = { ...c.est, fase: prev === 'fechando' ? 'fechando' : 'plano' };
    await sendPrompt(id, prev === 'fechando' ? 'fechar' : 'plano');
  }

  /* ---------- execução do plano (DEV2-004) ----------
     Para cada tarefa T1..Tn: /clear no Dev, pedido curto (ler a seção Tk do plano, implementar, validar, commit na branch
     permitida, gravar resultados\Tk.md); no fim do turno o Termix confere em código (Tk.md novo, commit novo na branch
     permitida, main/master intactas); /clear no orquestrador, pedido curto de revisão (revisoes\Tk.json); aprovado = próxima,
     refazer = volta ao Dev (até MAX_REFAZER vezes). Pausas salvas no estado.json: limite de 5 h, tarefa de DEPLOY/HUMANO,
     erro ou agente sem resposta. A trava em código (src/vibe/trava.js) vale em todas as abas do Vibe. */
  const TETO_5H = 93; // decisão do Ygor: com a janela de 5 h em 93 % ou mais, pausa e retoma sozinha quando ela virar
  const MAX_REFAZER = 2; // refações por tarefa; depois disso, pausa e pede ajuda ao humano
  const SEM_RESPOSTA = 20 * 60000; // agente sem nenhum sinal (hook ou saída no terminal) por 20 min = pausa
  let LIM_TEST = null; // só no modo de teste: % da janela de 5 h injetado
  const winOk = (l) => !!(l && typeof l.pct === 'number' && (!l.resets || l.resets * 1000 > Date.now()));
  const lim5 = () => { if (LIM_TEST != null) return { pct: LIM_TEST, resets: Date.now() / 1000 + 3600, teste: true }; try { return UI.limits && UI.limits.five; } catch { return null; } };
  const lim7 = () => { try { return UI.limits && UI.limits.week; } catch { return null; } };
  const limHit = () => { const l = lim5(); return winOk(l) && l.pct >= TETO_5H; };
  const ACT = {}; // último sinal de cada aba (hook)

  // esperas por hook (promessas): resolvem com o evento, ou null ao cancelar/expirar
  const HW = [];
  function waitHook(c, tab, test, ms) {
    return new Promise((resolve) => {
      const w = { c, tab, test, since: Date.now() - 500, resolve };
      if (ms) w.timer = setTimeout(() => hwDone(w, null), ms);
      HW.push(w);
    });
  }
  function hwDone(w, d) { const i = HW.indexOf(w); if (i >= 0) HW.splice(i, 1); clearTimeout(w.timer); w.resolve(d); }
  function cancelWaits(c) { for (const w of HW.filter((x) => x.c === c)) hwDone(w, null); }

  // Digita um pedido e aperta Enter 1 s depois, repetindo enquanto o hook de prompt enviado não chega (ver sendPrompt).
  function typeInto(c, tab, text, g) {
    let sent = false;
    waitHook(c, tab.id, (d) => d.event === 'UserPromptSubmit', 30000).then(() => { sent = true; });
    api.write(tab.id, text);
    let n = 0;
    const enter = () => { if (sent || c.gen !== g || !isAlive(tab.id)) return; api.write(tab.id, '\r'); if (++n < 5) setTimeout(enter, 3000); };
    setTimeout(enter, 1000);
  }
  // /clear: contexto limpo a cada tarefa. Espera o SessionStart (source "clear") que o Claude Code dispara.
  async function clearTab(c, tab, g) {
    const w = waitHook(c, tab.id, (d) => d.event === 'SessionStart' && d.source === 'clear', 20000);
    let got = false;
    w.then((d) => { got = !!d; });
    api.write(tab.id, '/clear');
    let n = 0;
    const enter = () => { if (got || c.gen !== g || !isAlive(tab.id)) return; api.write(tab.id, '\r'); if (++n < 3) setTimeout(enter, 5000); };
    setTimeout(enter, 500);
    const d = await w;
    if (d) await sleep(1500); // o Claude Code redesenha a caixa de texto
    return d;
  }
  // Garante a aba do orquestrador ou do Dev aberta: retoma a aba parada ou recria a aba fechada (sempre Dangerously, com a trava).
  async function ensureTab(id, key, g) {
    const c = cyOf(id), p = projOf(id);
    if (!p) { pause(id, 'erro', 'O projeto não foi encontrado no Termix.'); return null; }
    let tab = tabOf(c.est[key]);
    if (tab && isAlive(tab.id)) return tab;
    let w;
    if (!tab) {
      const keep = p.activeTab;
      createTab(p, 'd', { name: key === 'orq' ? ORQ_NAME : DEV_NAME, color: key === 'orq' ? '#A78BFA' : '#34D399' });
      tab = tabOf(p.activeTab);
      if (!tab) { pause(id, 'erro', 'Não foi possível recriar a aba do Vibe.'); return null; }
      w = waitHook(c, tab.id, (d) => d.event === 'SessionStart', 60000);
      c.est[key] = tab.id; if (keep) p.activeTab = keep; save(); renderAll(); cySave(id);
    } else {
      w = waitHook(c, tab.id, (d) => d.event === 'SessionStart', 60000);
      launch(p, tab, 'resume');
    }
    const d = await w;
    if (c.gen !== g) return null;
    if (!d) { pause(id, 'erro', `A aba "${tab.name}" não abriu em 60 s. Confira a aba (o Claude Code pode estar perguntando algo) e clique em Continuar.`); return null; }
    await sleep(1500);
    return tab;
  }
  // Pede algo a um agente: /clear, pedido curto e espera o fim do turno (hook Stop). false = parou, pausou ou falhou.
  async function ask(id, g, key, text) {
    const c = cyOf(id);
    if (!text) { pause(id, 'erro', 'Não foi possível montar o pedido (a entrega ou o plano não foram encontrados).'); return false; }
    const tab = await ensureTab(id, key, g);
    if (!tab || c.gen !== g) return false;
    if (!(await clearTab(c, tab, g))) { if (c.gen === g) pause(id, 'erro', `O /clear não foi confirmado na aba "${tab.name}". Confira a aba (a caixa de texto deve estar vazia) e clique em Continuar.`); return false; }
    if (c.gen !== g) return false;
    const stop = waitHook(c, tab.id, (d) => d.event === 'Stop');
    c.esperando = { tab: tab.id, desde: Date.now() };
    typeInto(c, tab, text, g);
    const d = await stop;
    c.esperando = null;
    return c.gen === g && !!d;
  }

  function pause(id, tipo, motivo, extra = {}) {
    const c = cyOf(id);
    if (!c.est || !c.est.exec) return;
    c.gen++; cancelWaits(c); c.esperando = null;
    c.live = tipo === 'limite'; // limite: enquanto o app estiver aberto, o Termix retoma sozinho quando a janela virar
    c.est = { ...c.est, fase: 'pausado', aviso: '' };
    c.est.exec.pausa = { tipo, motivo, desde: nowIso(), ...extra };
    cySave(id);
    const t = c.est.exec.tarefas[c.est.exec.k];
    if (tipo !== 'limite') notifyHuman(projOf(id), tabOf(c.est.dev) || tabOf(c.est.orq), `${t ? `${t.id}: ` : ''}${motivo}`);
  }
  function finish(id) {
    const c = cyOf(id), x = c.est.exec;
    c.gen++; c.live = false;
    c.est = { ...c.est, fase: 'concluido', concluido: nowIso(), aviso: '' };
    cySave(id);
    notifyHuman(projOf(id), tabOf(c.est.orq), `Projeto concluído: ${plural(x.feitas.length, 'tarefa', 'tarefas')} na branch ${x.branch || ''}.`);
  }

  // "Executar plano": lê as tarefas do plano (zero token) e começa pela T1.
  async function execStart(id) {
    const c = cyOf(id);
    if (!c.est || c.est.fase !== 'pronto') return false;
    const ts = await call('tarefas', id);
    if (!ts || !ts.length) { c.est.aviso = 'O plano não tem tarefas no formato "## T1 — título". Peça ao orquestrador para regravar o plano nesse formato (Parar e Iniciar de novo).'; cySave(id); return false; }
    await call('trust', id);
    c.est = { ...c.est, fase: 'execucao', aviso: '', exec: { tarefas: ts, k: 0, etapa: 'dev', tentativas: 0, feitas: [], liberadas: [], iniciado: nowIso() } };
    cySave(id);
    execLoop(id);
    return true;
  }
  // Continuar (depois de pausa, Parar ou reabrir o app): segue de onde parou, conferindo os arquivos antes de pedir de novo.
  function continueExec(id, auto) {
    const c = cyOf(id), x = c.est && c.est.exec;
    if (!x) return;
    const pz = x.pausa;
    if (pz && pz.gate) x.liberadas = [...(x.liberadas || []), pz.gate]; // o humano liberou a tarefa de DEPLOY/HUMANO
    if (pz && pz.ajuda) { x.tentativas = 0; x.retomar = false; } // depois das refações, o humano ajudou: nova rodada
    else x.retomar = true;
    x.pausa = null;
    c.est = { ...c.est, fase: 'execucao', aviso: '', retomado: auto ? 'auto' : nowIso() };
    cySave(id);
    execLoop(id);
  }
  // Pular: o humano fez a tarefa de DEPLOY/HUMANO por conta própria.
  function skipTask(id) {
    const c = cyOf(id), x = c.est && c.est.exec;
    if (!x || !x.pausa || !x.pausa.gate) return;
    const t = x.tarefas[x.k];
    x.feitas.push({ id: t.id, titulo: t.titulo, humano: true });
    Object.assign(x, { k: x.k + 1, etapa: 'dev', tentativas: 0, refazer: null, enviadoDev: null, enviadoRev: null, pausa: null, retomar: false });
    c.est = { ...c.est, fase: 'execucao', aviso: '' };
    cySave(id);
    execLoop(id);
  }

  async function execLoop(id) {
    const c = cyOf(id);
    const g = ++c.gen;
    c.live = true;
    const alive = () => c.gen === g && c.est && c.est.fase === 'execucao';
    try {
      const bp = await call('branchPrep', id); // o Termix confere ou cria a branch permitida (código, não a IA)
      if (!alive()) return;
      if (!bp || !bp.ok) return pause(id, 'erro', (bp && bp.motivo) || 'Não foi possível preparar a branch permitida.');
      const x = c.est.exec;
      x.branch = bp.branch;
      cySave(id);
      while (alive()) {
        if (x.k >= x.tarefas.length) return finish(id);
        const t = x.tarefas[x.k];
        if ((t.deploy || t.humano) && !(x.liberadas || []).includes(t.id) && x.etapa === 'dev' && !x.tentativas) {
          return pause(id, t.deploy ? 'deploy' : 'humano', t.deploy ? `Tarefa de DEPLOY: "${t.titulo}". O Termix só segue com a sua liberação.` : `A tarefa "${t.titulo}" precisa de você (acesso, dado ou decisão).`, { gate: t.id });
        }
        if (limHit()) return pause(id, 'limite', `Janela de 5 h em ${Math.round(lim5().pct)}% (teto ${TETO_5H}%). O Termix retoma sozinho quando ela virar.`);
        if (x.etapa === 'dev') {
          if (!(x.retomar && x.enviadoDev)) {
            let info = await call('gitInfo', id);
            if (!alive()) return;
            if (info && info.branch !== x.branch) { const b2 = await call('branchPrep', id); if (!alive()) return; if (!b2 || !b2.ok) return pause(id, 'erro', (b2 && b2.motivo) || 'A branch permitida não está ativa.'); info = await call('gitInfo', id); }
            if (!info) return pause(id, 'erro', 'Não foi possível ler o git do projeto.');
            x.base = { sha: info.permitidaSha, heads: info.heads };
            x.tentativas = (x.tentativas || 0) + 1;
            x.enviadoDev = nowIso(); x.sub = 'dev';
            cySave(id);
            const text = await call('execPrompt', id, x.refazer ? 'refazer' : 'dev', t.id, x.refazer || null);
            if (!(await ask(id, g, 'dev', text))) return;
          }
          x.retomar = false;
          // conferência em código (zero token)
          const info = await call('gitInfo', id), res = await call('resultadoLer', id, t.id);
          if (!alive()) return;
          if (!info) return pause(id, 'erro', 'Não foi possível ler o git do projeto.');
          const mexeu = Object.keys(x.base.heads || {}).filter((b) => (info.heads[b] || null) !== (x.base.heads[b] || null));
          if (mexeu.length) return pause(id, 'erro', `A ${mexeu.join(', ')} mudou durante a ${t.id}. Isso é proibido: confira o projeto antes de continuar.`);
          if (info.branch !== x.branch) return pause(id, 'erro', `O Dev terminou a ${t.id} na branch "${info.branch || '?'}" em vez de "${x.branch}". Confira e clique em Continuar.`);
          const falta = [];
          if (!res || !res.existe || res.mtime < Date.parse(x.enviadoDev) - 2000) falta.push(`resultados\\${t.id}.md`);
          if (!info.permitidaSha || info.permitidaSha === x.base.sha) falta.push(`um commit novo na branch ${x.branch}`);
          if (falta.length) {
            if (x.tentativas > MAX_REFAZER) return pause(id, 'humano', `A ${t.id} não ficou pronta em ${plural(x.tentativas, 'tentativa', 'tentativas')} (faltou ${falta.join(' e ')}). Veja a aba "${DEV_NAME}", ajude e clique em Continuar.`, { ajuda: true });
            x.refazer = { falta: `faltou ${falta.join(' e ')}` };
            cySave(id);
            continue;
          }
          Object.assign(x, { ultimoCommit: info.ultimo, devSha: info.permitidaSha, etapa: 'revisao', enviadoRev: null });
          cySave(id);
          continue;
        }
        if (x.etapa === 'revisao') {
          if (!(x.retomar && x.enviadoRev)) {
            x.enviadoRev = nowIso(); x.sub = 'rev';
            cySave(id);
            const text = await call('execPrompt', id, 'revisao', t.id, { sha: x.devSha });
            if (!(await ask(id, g, 'orq', text))) return;
          }
          x.retomar = false;
          const rv = await call('revisaoLer', id, t.id);
          if (!alive()) return;
          if (!rv || !rv.ok || rv.mtime < Date.parse(x.enviadoRev) - 2000) return pause(id, 'erro', `O orquestrador não gravou revisoes\\${t.id}.json com o veredito. Veja a aba "${ORQ_NAME}" e clique em Continuar.`);
          x.ultimaRevisao = { id: t.id, veredito: rv.veredito, motivo: rv.motivo.slice(0, 300) };
          if (rv.veredito === 'aprovado') {
            x.feitas.push({ id: t.id, titulo: t.titulo, commit: x.ultimoCommit, tentativas: x.tentativas });
            Object.assign(x, { k: x.k + 1, etapa: 'dev', tentativas: 0, refazer: null, enviadoDev: null, enviadoRev: null });
            cySave(id);
            continue;
          }
          if (x.tentativas > MAX_REFAZER) return pause(id, 'humano', `A revisão pediu para refazer a ${t.id} depois de ${plural(x.tentativas, 'tentativa', 'tentativas')}: ${rv.motivo.slice(0, 200)}. Ajude e clique em Continuar.`, { ajuda: true });
          Object.assign(x, { refazer: { revisao: true }, etapa: 'dev', enviadoDev: null });
          cySave(id);
        }
      }
    } catch (e) {
      console.error('vibe: execução', e);
      if (c.gen === g) pause(id, 'erro', `Erro no Termix: ${e && e.message ? e.message : e}`);
    }
  }

  let tick = 0;
  // relógio da execução (zero token): retoma a pausa por limite quando a janela vira e pausa agente sem resposta
  setInterval(() => {
    for (const id of Object.keys(CY)) {
      const c = CY[id], e = c.est, x = e && e.exec;
      if (!x || !c.live) continue;
      if (e.fase === 'pausado' && x.pausa && x.pausa.tipo === 'limite' && !limHit()) { continueExec(id, true); continue; }
      if (e.fase === 'execucao' && c.esperando) {
        const tid = c.esperando.tab;
        if (!isAlive(tid)) { pause(id, 'erro', 'A aba do agente fechou no meio da tarefa. Clique em Continuar para reabrir e seguir.'); continue; }
        const last = Math.max(c.esperando.desde, ACT[tid] || 0, (RT[tid] && RT[tid].lastData) || 0);
        if (Date.now() - last > SEM_RESPOSTA) pause(id, 'erro', `O agente está sem responder há ${Math.round(SEM_RESPOSTA / 60000)} min. Veja a aba e clique em Continuar.`);
      }
    }
    if (++tick % 6 === 0 && V && V.id && CY[V.id] && CY[V.id].est && ['execucao', 'pausado'].includes(CY[V.id].est.fase)) paintCycle(); // limites e estado à vista
  }, 5000);

  // As abas do Vibe são conduzidas pelo Termix: o aviso "Terminou" delas (inclusive o falso, ao abrir) não vai ao humano.
  // Os avisos do Vibe (perguntas, pausas, conclusão) saem pelo notifyHuman. Erros das abas continuam passando.
  try {
    const orig = window.notifyTab;
    if (typeof orig === 'function') window.notifyTab = function (p, tab, kind, ...rest) { if (kind === 'done' && tab && (tab.name === ORQ_NAME || tab.name === DEV_NAME)) return; return orig.call(this, p, tab, kind, ...rest); };
  } catch (e) { console.error('vibe: avisos', e); }

  // fim de turno e abertura do orquestrador vêm dos hooks que o app já recebe (vários ouvintes podem coexistir)
  try {
    window.termix.onHook(({ tabId, data }) => {
      if (!data) return;
      ACT[tabId] = Date.now();
      for (const w of HW.slice()) if (w.tab === tabId && data.t >= w.since && w.test(data)) hwDone(w, data);
      for (const id of Object.keys(CY)) {
        const c = CY[id], w = c.wait;
        if (!w || w.tab !== tabId || data.t < w.since) continue;
        if (w.ev === 'SessionStart' && data.event === 'SessionStart') { c.wait = null; clearTimeout(c.timer); setTimeout(() => { if (c.est && c.est.fase === 'abrindo') sendPrompt(id, 'plano'); }, 1500); }
        else if (w.ev === 'Stop' && data.event === 'Stop') { c.wait = null; afterTurn(id); }
      }
    });
  } catch (e) { console.error('vibe: hooks', e); }

  /* painel de andamento */
  const STEPS = [['Preparando plano'], ['Perguntas'], ['Plano pronto'], ['Execução'], ['Concluído']];
  const STEP_OF = { abrindo: 0, plano: 0, perguntas: 1, fechando: 1, pronto: 2, execucao: 3, pausado: 3, concluido: 4 };
  const TIPS = {
    abrindo: 'Quem espera é o Termix, não a IA: enquanto o orquestrador trabalha, esperar não gasta tokens.',
    plano: 'Quem espera é o Termix, não a IA: enquanto o orquestrador trabalha, esperar não gasta tokens.',
    perguntas: 'Respostas objetivas fecham o plano numa rodada só e gastam menos tokens.',
    fechando: 'O pedido ao orquestrador é curto e aponta para o arquivo das respostas, sem colar o conteúdo.',
    pronto: 'Na execução, cada tarefa começa com o contexto limpo (/clear): é o que mais economiza tokens.',
    execucao: 'Cada tarefa começa com /clear e um pedido curto que aponta para o plano; o orquestrador revisa pelo resumo da tarefa, sem ler diffs inteiros.',
    concluido: 'Revise a branch do projeto e decida o que entra na principal: os agentes nunca mexem na main/master.',
  };
  const PAUSA_TIT = { limite: 'Pausado: limite de uso', deploy: 'Pausado: tarefa de DEPLOY', humano: 'Pausado: precisa de você', erro: 'Pausado: erro' };

  // andamento da execução: tarefa k/n, fase, último commit, tentativas, limites e a lista de tarefas
  function execHtml(c) {
    const e = c.est, x = e.exec;
    if (!x) return '';
    const n = x.tarefas.length, t = x.tarefas[x.k];
    const pct = (l) => (winOk(l) ? `${Math.round(l.pct)}%${l.teste ? ' (teste)' : ''}` : 'indisponível');
    let fase;
    if (e.fase === 'concluido') fase = 'Concluído';
    else if (e.fase === 'pausado') fase = PAUSA_TIT[x.pausa && x.pausa.tipo] || 'Pausado';
    else if (e.fase === 'parado') fase = 'Parado';
    else if (!c.live) fase = 'Pausado (o Termix foi fechado)';
    else fase = x.etapa === 'revisao' ? 'Revisão (orquestrador)' : 'Dev trabalhando';
    const rows = [
      ['Tarefa', e.fase === 'concluido' ? `${n}/${n}` : t ? `${x.k + 1}/${n} · ${esc(t.id)} — ${esc(t.titulo)}` : `${n}/${n}`],
      ['Fase', esc(fase)],
      ['Branch', esc(x.branch || '—')],
      ['Último commit', esc(x.ultimoCommit || '—')],
      ['Tentativas', e.fase === 'concluido' || !t ? '—' : `${x.tentativas || 0} de ${MAX_REFAZER + 1}`],
      ['Limites', `5 h ${pct(lim5())} · 7 d ${pct(lim7())} <small>(pausa com a janela de 5 h em ${TETO_5H}%)</small>`],
    ];
    if (x.ultimaRevisao) rows.push(['Última revisão', `${esc(x.ultimaRevisao.id)}: ${esc(x.ultimaRevisao.veredito)}${x.ultimaRevisao.motivo ? ` — ${esc(x.ultimaRevisao.motivo.slice(0, 160))}` : ''}`]);
    const feita = (id) => x.feitas.find((f) => f.id === id);
    const list = x.tarefas.map((tt, i) => {
      const f = feita(tt.id);
      const cls = f ? 'done' : i === x.k && e.fase !== 'concluido' ? 'cur' : '';
      const tags = `${tt.deploy ? ' <em class="vx-tag">DEPLOY</em>' : ''}${tt.humano ? ' <em class="vx-tag">HUMANO</em>' : ''}`;
      const extra = f ? (f.humano ? ' · feita pelo humano' : f.commit ? ` · ${esc(f.commit.split(' ')[0])}` : '') : '';
      return `<li class="${cls}">${esc(tt.id)} — ${esc(tt.titulo)}${tags}<small>${extra}</small></li>`;
    }).join('');
    return `<div class="vx"><dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl><ol class="vx-list">${list}</ol></div>`;
  }
  const mdLite = (t) => String(t).replace(/\r/g, '').split('\n').map((l) => { const m = /^(#{1,4})\s+(.*)$/.exec(l); return m ? `<div class="vh h${m[1].length}">${esc(m[2])}</div>` : `<div>${l.trim() ? esc(l) : '&nbsp;'}</div>`; }).join('');

  function questionsHtml(c) {
    return `<div class="vc-qs">${c.perguntas.map((q, i) => {
      const a = c.ans[q.id] || {};
      const ops = q.opcoes.length ? `<div class="vc-ops">${q.opcoes.map((o) => `<label class="vf-chk"><input type="radio" name="vq${i}" data-qop="${esc(q.id)}" value="${esc(o)}" ${a.op === o ? 'checked' : ''}> ${esc(o)}</label>`).join('')}</div>` : '';
      return `<div class="vc-q"><b>${i + 1}. ${esc(q.texto)}</b>${q.porque ? `<small>Por quê: ${esc(q.porque)}</small>` : ''}${ops}
        <input type="text" class="inp" data-qtx="${esc(q.id)}" maxlength="2000" placeholder="${q.opcoes.length ? 'Comentário (opcional)' : 'Sua resposta'}" value="${esc(a.tx || '')}"></div>`;
    }).join('')}${c.err ? `<div class="vf-prob">${esc(c.err)}</div>` : ''}
      <div class="vibe-confirm"><button class="btn sm pri" data-vc="answers">Enviar respostas</button></div></div>`;
  }

  function cycleHtml(id) {
    const c = CY[id];
    if (!c || !c.est) return '';
    const e = c.est;
    const paused = WAITING.includes(e.fase) && !c.live;
    const base = ['parado', 'erro'].includes(e.fase) ? (e.antes || 'plano') : e.fase;
    const si = STEP_OF[base] != null ? STEP_OF[base] : 0;
    const steps = STEPS.map(([l], i) => {
      const done = i < si || (i === si && (base === 'pronto' || base === 'concluido'));
      const cur = !done && i === si;
      const label = i === 1 && (e.nPerguntas != null || si >= 2) ? `${l} (${e.nPerguntas || 0})` : i === 3 && e.exec ? `${l} (${Math.min(e.exec.feitas.length, e.exec.tarefas.length)}/${e.exec.tarefas.length})` : l;
      return `<li class="${done ? 'done' : cur ? 'cur' : ''}">${label}</li>`;
    }).join('');
    const stepName = STEPS[si][0];
    let line;
    const exe = base === 'execucao' || base === 'pausado';
    const x = e.exec;
    const go = exe ? 'Continuar' : 'Retomar';
    if (paused) line = exe ? `<b>Pausado na execução.</b> O Termix foi fechado no meio de uma tarefa; nada reiniciou sozinho. Clique em "Continuar": ele confere os arquivos antes de pedir de novo.` : `<b>Pausado em "${esc(stepName)}".</b> O Termix foi fechado enquanto esperava o orquestrador; nada reiniciou sozinho. Clique em "Retomar" para continuar.`;
    else line = {
      abrindo: `Abrindo as abas "${ORQ_NAME}" e "${DEV_NAME}"…`,
      plano: 'O orquestrador está preparando o plano. O Termix avisa quando ele terminar.',
      perguntas: `O orquestrador tem ${plural(c.perguntas.length, 'pergunta indispensável', 'perguntas indispensáveis')}. Responda para fechar o plano.`,
      fechando: 'O orquestrador está fechando o plano com as suas respostas.',
      pronto: `<b>Plano pronto${e.tarefas ? `, ${plural(e.tarefas, 'tarefa', 'tarefas')}` : ''}.</b> "Executar plano" passa as tarefas ao Dev uma a uma, com revisão do orquestrador. Commits só na branch permitida; a main/master fica intacta.`,
      execucao: x ? `<b>Executando o plano.</b> ${x.etapa === 'revisao' ? 'O orquestrador está revisando' : 'O Dev está trabalhando'} na ${esc((x.tarefas[x.k] || {}).id || '')}. O Termix avisa se precisar de você.` : '',
      pausado: x && x.pausa ? `<b>${esc(PAUSA_TIT[x.pausa.tipo] || 'Pausado')}.</b> ${esc(x.pausa.motivo || '')}${x.pausa.tipo === 'limite' && c.live ? '' : x.pausa.gate ? ' Clique em "Continuar" para o Dev executar a tarefa, ou em "Já fiz, pular" se você mesmo a fez.' : ' Clique em "Continuar" quando quiser seguir.'}` : '',
      concluido: x ? `<b>Projeto concluído.</b> ${plural(x.feitas.length, 'tarefa feita', 'tarefas feitas')} na branch "${esc(x.branch || '')}"${x.feitas.some((f) => f.humano) ? `, ${x.feitas.filter((f) => f.humano).length} pelo humano` : ''}. A main/master não foi alterada.` : '<b>Projeto concluído.</b>',
      parado: `<b>Vibe Coding parado em "${esc(stepName)}".</b> Nada foi apagado e as abas continuam abertas. Clique em "${go}" para seguir.`,
      erro: `<b>O plano não ficou pronto.</b>`,
    }[e.fase] || '';
    const acts = [];
    if (e.fase === 'abrindo' && e.aviso && c.live) acts.push('<button class="btn sm" data-vc="send">Enviar o pedido agora</button>');
    if (e.fase === 'pronto') acts.push('<button class="btn sm pri" data-vc="exec">Executar plano</button>');
    if (paused || ['parado', 'erro'].includes(e.fase) || (e.fase === 'pausado' && !(x && x.pausa && x.pausa.tipo === 'limite' && c.live))) acts.push(`<button class="btn sm pri" data-vc="resume">${go}</button>`);
    if (e.fase === 'pausado' && x && x.pausa && x.pausa.gate) acts.push('<button class="btn sm" data-vc="skip">Já fiz, pular</button>');
    if (ACTIVE.includes(e.fase) || ['erro', 'pronto', 'pausado'].includes(e.fase)) acts.push('<button class="btn sm" data-vc="stop">Parar Vibe Coding</button>');
    const tip = TIPS[base] ? `<p class="vibe-tip">${esc(TIPS[base])}</p>` : '';
    const plan = c.plano ? `<details class="vc-plan" ${e.fase === 'pronto' ? 'open' : ''}><summary>Ver o plano (plano.md${c.plano.tarefas ? `, ${plural(c.plano.tarefas, 'tarefa', 'tarefas')}` : ''})</summary><div class="vc-md">${mdLite(c.plano.text)}</div></details>` : '';
    return `<div class="vc ${e.fase} ${paused ? 'paused' : ''}">
      <div class="vc-hd"><b>Andamento</b><ol class="vc-steps">${steps}</ol></div>
      <div class="vc-line">${line}</div>
      ${e.aviso ? `<div class="vc-aviso">${esc(e.aviso)}</div>` : ''}
      ${x ? execHtml(c) : ''}
      ${e.fase === 'perguntas' ? questionsHtml(c) : ''}
      ${plan}${tip}
      ${acts.length ? `<div class="vibe-confirm">${acts.join('')}</div>` : ''}
    </div>`;
  }

  function paintCycle() {
    if (!V || !V.root || !V.root.isConnected) return;
    const box = V.root.querySelector('#vcPanel');
    if (box) box.innerHTML = cycleHtml(V.id);
    paint();
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
    const ent = V.entrega ? `<div class="vibe-note">Este projeto já tem uma entrega pronta, de ${esc(fmtDate(V.entrega.data))}. Ela continua guardada. Ao clicar em "Iniciar Vibe Coding", o Termix pede confirmação antes de gravar a versão nova.</div>` : '';
    return `<div class="vibe-form">
      <p>Entregue o projeto completo de uma vez. Com tudo preenchido, o Termix cria um orquestrador e um dev que trabalham sozinhos até o fim. Quanto mais claro, menos retrabalho. O que você preencher fica salvo como rascunho.</p>
      <p class="vibe-tip">Entregas completas evitam perguntas e gastam menos tokens.</p>
      ${ent}
      <div class="vf"><label for="vfProj">1. Projeto <em>obrigatório</em></label>
        <select class="inp" id="vfProj">${ps.length ? '' : '<option value="">Nenhum projeto no Termix. Crie um projeto antes.</option>'}${ps.length ? `<option value="" ${V.id ? '' : 'selected'}>Escolha o projeto…</option>` : ''}${ps.map((p) => `<option value="${esc(p.id)}" ${p.id === V.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
      <div id="vcPanel">${V.id ? cycleHtml(V.id) : ''}</div>
      <details class="vf-det" ${V.id && CY[V.id] && CY[V.id].est ? '' : 'open'}><summary>Entrega do projeto (itens 2 a 7)</summary>
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
      </details>
      <div class="vibe-miss" id="vfMiss"></div>
      <div class="vibe-msg" id="vfMsg"></div>
    </div>`;
  }

  function paint() {
    if (!V || !V.root.isConnected) return;
    const m = missing();
    const box = V.root.querySelector('#vfMiss');
    box.className = `vibe-miss ${m.length ? '' : 'done'}`;
    const act = cycleActive(V.id);
    box.innerHTML = m.length ? `<b>Falta para iniciar:</b><ul>${m.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : act ? '<b>Vibe Coding em andamento neste projeto.</b> Para iniciar de novo, pare o atual.' : '<b>Tudo pronto.</b> Pode iniciar o Vibe Coding.';
    const go = V.root.querySelector('[data-vgo]');
    if (go) {
      go.disabled = !!m.length || V.busy || V.saved || act; // gravada: só reabilita depois de mudar algo; com ciclo em andamento, só depois de parar
      // com um ciclo, a ação principal fica no painel (Executar plano / Continuar): "Iniciar" some enquanto o ciclo está
      // em andamento e, parado, aparece como ação secundária ("Iniciar de novo")
      const c = V.id && CY[V.id], has = !!(c && c.est && c.est.fase !== 'concluido');
      go.style.display = act ? 'none' : '';
      go.classList.toggle('pri', !has);
      go.textContent = has ? 'Iniciar de novo' : 'Iniciar Vibe Coding';
    }
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
      const [d, e] = await Promise.all([call('draftGet', V.id), call('entregaGet', V.id), cyLoad(V.id)]);
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
    if (!V || missing().length || V.busy || cycleActive(V.id)) return null;
    V.busy = true; V.msg = { kind: '', html: 'Gravando a entrega…' }; paint();
    persist();
    const r = await call('entregaSave', payload(), !!replace);
    if (!V) return r;
    V.busy = false;
    if (r && r.ok) {
      V.entrega = r.entrega; V.saved = true; V.msg = null;
      const ok = await startCycle(V.id);
      if (!V) return r;
      if (!ok) V.msg = { kind: 'bad', html: 'A entrega foi gravada, mas o projeto não foi encontrado para criar os agentes.' };
      redraw();
      return r;
    } else if (r && r.exists) {
      V.msg = { kind: 'warn', html: `Este projeto já tem uma entrega, de ${esc(fmtDate(r.entrega && r.entrega.data))}. Iniciar grava esta versão no lugar dela (a anterior fica no histórico do módulo, nada é apagado) e cria os agentes.<div class="vibe-confirm"><button class="btn sm" data-vno>Cancelar</button><button class="btn sm pri" data-vyes>Gravar e iniciar</button></div>` };
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
          const vc = e.target.closest('[data-vc]');
          if (vc && V && V.id) {
            const k = vc.dataset.vc, id = V.id;
            if (k === 'stop') stopCycle(id); else if (k === 'resume') resumeCycle(id); else if (k === 'send') sendPrompt(id, 'plano'); else if (k === 'answers') sendAnswers(id);
            else if (k === 'exec') execStart(id); else if (k === 'skip') skipTask(id);
          }
        });
        // respostas das perguntas: guardadas na memória enquanto a pessoa digita (sem redesenhar o painel)
        const ansSet = (e) => {
          if (!V || !V.id) return;
          const c = cyOf(V.id), t = e.target;
          if (t.dataset.qtx) (c.ans[t.dataset.qtx] = c.ans[t.dataset.qtx] || {}).tx = t.value;
          else if (t.dataset.qop) (c.ans[t.dataset.qop] = c.ans[t.dataset.qop] || {}).op = t.value;
        };
        root.addEventListener('input', ansSet); root.addEventListener('change', ansSet);
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
    if (s && s.test) window.vibeTest = { open: () => openVibe(), pick: (k, p) => pick(k, p), template: (p) => template(p), start: (r) => start(r), state: () => (V ? { id: V.id, f: { ...V.f }, missing: missing(), entrega: V.entrega } : null),
      cycle: (id) => { const c = CY[id || (V && V.id)]; return c ? { est: c.est, live: c.live, wait: c.wait, perguntas: c.perguntas, tarefas: c.plano && c.plano.tarefas } : null; },
      inject: async (lista) => { const id = V && V.id, c = id && CY[id]; if (!c || !c.est) return false; if (!(await call('testPerguntas', id, lista))) return false; c.est.fase = 'plano'; await afterTurn(id); return c.est.fase; },
      answer: (map) => { const c = V && CY[V.id]; if (!c) return false; c.ans = map; return sendAnswers(V.id); },
      stop: () => V && stopCycle(V.id), resume: () => V && resumeCycle(V.id),
      // DEV2-004: execução. limit(93) injeta o % da janela de 5 h (null volta ao real); exec/cont/skip = botões do painel
      limit: (v) => { LIM_TEST = typeof v === 'number' ? v : null; paintCycle(); return LIM_TEST; },
      exec: () => V && execStart(V.id), cont: () => V && resumeCycle(V.id), skip: () => V && skipTask(V.id) };
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
      box.innerHTML = `<h5 style="margin:22px 0 8px">Experimental</h5><div class="card" style="padding:6px 18px"><div class="row"><div class="grow">Vibe Coding e Mutirão (experimental)<small>Mostra no cabeçalho os botões Vibe Coding e Mutirão. O Vibe Coding recebe a entrega, cria o orquestrador e o dev, prepara o plano e o executa tarefa a tarefa, com commits só numa branch própria (a main/master nunca é alterada); o Mutirão ainda está em construção.</small></div><div class="seg"><button class="${v ? 'sel' : ''}" data-vibe-set="1">Sim</button><button class="${v ? '' : 'sel'}" data-vibe-set="0">Não</button></div></div></div>`;
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
