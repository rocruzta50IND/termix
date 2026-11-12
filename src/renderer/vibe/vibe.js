'use strict';
/* Módulo Vibe Coding e Mutirão — lado da interface.
   DEV2-001: chave em Configurações e botões no cabeçalho. DEV2-002: tela de entrega do Vibe Coding (formulário engessado).
   DEV2-003: ciclo com orquestrador e dev (abas do próprio app), plano, perguntas e painel de andamento.
   DEV2-004: execução com trava. DEV2-005: Mutirão (painel ao lado do terminal, parte do sócio e contador de entregas).
   Carregado depois do app.js e independente dele: usa só o que o app.js já expõe no escopo global
   (S, save, modal, esc) e se pendura no cabeçalho e na página Configurações por observação do DOM.
   Desligado (padrão), não mostra nada. Fala com o processo principal só pelos canais 'vibe:*' (window.termix.vibe).
   Desenho: docs/VIBE_MUTIRAO.md. */
(() => {
  const on = () => true; // DEV2-024: sem chave experimental; o Vibe e o Mutirão (inclusive o lado do sócio) funcionam sempre. Um S.settings.vibe.on salvo é ignorado (não é apagado).
  const call = async (ch, ...a) => { try { return await window.termix.vibe(ch, ...a); } catch (e) { console.error('vibe:', ch, e); return null; } };

  function openScreen(k) {
    try {
      if (k === 'vibe') { openVibe(); return; }
      if (k === 'mutirao') { if (MP) closeMutirao(); else openMutirao(); } // DEV2-005: painel ao lado do terminal
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
    c.pol = await call('politicaGet', id); // DEV2-014: política de autonomia do projeto
    c.deps = (await call('deployLista', id)) || []; // DEV2-016: deploys (versões) feitos pelo Termix
    c.hist = (await call('tarefaHist', id)) || []; // DEV2-017: tarefas do Vibe de tarefa (a mais nova primeiro)
    if (c.est) await cyRead(id);
    return c;
  }
  function cySave(id) { const c = cyOf(id); if (c.est) call('cicloSet', id, c.est); paintCycle(); if (MP && MP.id === id && c.est && c.est.auto) mutPaint(); }

  // Aviso ao humano pelo mecanismo de notificações do app (painel do sino, dica, som e Windows sem foco).
  function notifyHuman(p, tab, msg, acts) {
    try {
      const cfg = notifCfg();
      if (cfg.perm === false) return;
      const ev = { c: tab ? tab.color : '#A78BFA', who: `Vibe Coding${p ? ` · ${p.name}` : ''}`, tabId: tab ? tab.id : undefined, msg, kind: 'perm', acts: [...(Array.isArray(acts) ? acts : []), ...(tab ? [['Abrir', 'open', tab.id]] : [])] };
      addEvent(ev);
      if (!document.hasFocus() && cfg.win && tab) api.notify({ tabId: tab.id, title: `Vibe Coding · ${p ? p.name : ''}`, body: msg });
      showToast(ev); beep('perm');
    } catch (e) { console.error('vibe: aviso', e); }
  }

  // Inicia um ciclo novo: arquiva o anterior, cria as duas abas (Dangerously: trabalham sem pedir aprovação) e espera o orquestrador abrir.
  // auto (DEV2-006): ciclo da implementação automática do Mutirão ({ mutirao, executar, conflitos, branch })
  // opts.reusar (DEV2-017, Vibe de tarefa): reaproveita as abas do orquestrador e do Dev do ciclo anterior, com /clear (o Dev
  // recebe o /clear antes de cada tarefa, como sempre); sem elas, cria as duas como antes.
  async function startCycle(id, auto, opts = {}) {
    const p = projOf(id);
    if (!p) return false;
    const c = cyOf(id);
    const ant = c.est; // ciclo anterior (as abas dele)
    await call('cicloNovo', id);
    // pasta confiável (decisão do Ygor): o Termix marca antes de abrir as abas, para o Claude Code não parar perguntando
    const tr = await call('trust', id);
    clearTimeout(c.timer);
    Object.assign(c, { plano: null, perguntas: [], ans: {}, err: '', wait: null, loaded: true });
    UI.cur = { p: p.id, page: 'Terminais' }; UI.last = p.id;
    const tOrq = opts.reusar && ant && tabOf(ant.orq), tDev = opts.reusar && ant && tabOf(ant.dev);
    const reuso = !!(tOrq && tDev);
    let orq, dev;
    if (reuso) { orq = tOrq.id; dev = tDev.id; }
    else {
      createTab(p, 'd', { name: ORQ_NAME, color: '#A78BFA' });
      orq = p.activeTab;
      createTab(p, 'd', { name: DEV_NAME, color: '#34D399' }); // nesta etapa o dev só é criado e fica parado
      dev = p.activeTab;
    }
    p.activeTab = orq; save(); renderAll();
    c.est = { versao: 1, fase: 'abrindo', rodada: 0, orq, dev, iniciado: nowIso(), ...(auto ? { auto } : {}), ...(opts.reusar ? { tarefa: true } : {}), aviso: tr && !tr.ok ? `O Termix não marcou a pasta como confiável (${tr.motivo || 'erro'}). Se o Claude Code perguntar na aba, escolha "Yes, I trust this folder".` : '' };
    c.live = true;
    if (reuso) c.est.reuso = true;
    const w = (c.wait = { tab: orq, ev: 'SessionStart', since: Date.now() - (reuso ? 0 : 2000) });
    if (reuso) { // o SessionStart do /clear (ou da reabertura) dispara o pedido do plano, como na abertura
      if (isAlive(orq)) {
        api.write(orq, '\x15'); // Ctrl+U: caixa vazia antes do /clear (DEV2-007)
        setTimeout(() => { if (c.wait !== w) return; api.write(orq, '/clear'); let n = 0; const enter = () => { if (c.wait !== w || !isAlive(orq)) return; api.write(orq, '\r'); if (++n < 3) setTimeout(enter, 5000); }; setTimeout(enter, 500); }, 200);
      } else { tOrq.sessionId = crypto.randomUUID(); tOrq.started = false; save(); launch(p, tOrq, 'new'); } // aba parada (app reaberto): conversa nova
    }
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
      autoGo(id);
    }
  }
  // Implementação automática do Mutirão (DEV2-006): com o plano pronto, o Termix executa sozinho. Antes confere (zero token)
  // que as primeiras tarefas são os conflitos da junção; se não forem, para em "Plano pronto" com um aviso.
  function autoGo(id) {
    const c = cyOf(id), a = c.est && c.est.auto;
    if (!a || !a.executar || c.est.fase !== 'pronto' || c.est.aviso) return;
    setTimeout(async () => {
      if (!c.est || c.est.fase !== 'pronto') return;
      const cf = a.conflitos || [];
      if (cf.length) {
        const ts = (await call('tarefas', id)) || [];
        const primeiras = ts.slice(0, cf.length).map((t) => t.titulo.toLowerCase());
        const falta = cf.filter((b) => !primeiras.some((t) => t.includes(String(b).toLowerCase())));
        if (falta.length) { c.est.aviso = `O plano não começa pelos conflitos da junção (${falta.join(', ')}). Confira o plano; para seguir assim mesmo, clique em "Executar plano".`; cySave(id); return; }
      }
      if (c.est.fase === 'pronto') execStart(id);
    }, 1500);
  }
  // o Termix confere o plano (zero token): commit ou push na main/master é proibido e vira alerta na tela;
  // DEV2-009: publicação/deploy sem a marca [DEPLOY] (o Termix não pausaria antes dela) também vira alerta
  function branchAlert(r) {
    const l = r && r.plano && r.plano.mainCommit && r.plano.mainCommit[0];
    const d = (r && r.plano && r.plano.deploySemMarca) || [];
    return [l ? `Atenção: o plano cita commit ou push na main/master ("${l.trim().slice(0, 100)}"). Isso é proibido: a execução só usa a branch permitida e a trava do Termix bloqueia commit e push na main/master.` : '',
      d.length ? `Atenção: o plano parece ter publicação ou deploy sem a marca [DEPLOY] (${d.join('; ')}). Sem a marca, o Termix não pausa antes dela: confira o plano e marque a tarefa com [DEPLOY] no título antes de executar.` : ''].filter(Boolean).join(' ');
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
    const esp = c.esperando;
    desfazPedido(c); // DEV2-007: pedido digitado e ainda não enviado = apagado da caixa e não conta como tentativa
    c.gen++; cancelWaits(c); c.esperando = null; // a execução em andamento para de conduzir
    for (const k of ['orq', 'dev']) {
      const tab = tabOf(c.est[k]);
      try { if (tab && isAlive(tab.id) && (stOf(tab) === 'work' || (esp && esp.tab === tab.id && esp.enviado))) api.write(tab.id, '\x1b'); } catch { /* aba já encerrada */ }
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
      autoGo(id);
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
  // DEV2-014: o teto (5 h, 7 d e US$) vem da política do projeto (padrão 93 % na janela de 5 h, 95 % na de 7 d); a regra fica
  // em src/vibe/politica.js (canal politicaTeto). Ao atingir, pausa e avisa; nas janelas, retoma sozinho quando virar.
  const MAX_REFAZER = 2; // refações por tarefa; depois disso, pausa e pede ajuda ao humano
  const T = { semResposta: 20 * 60000, turno: 30 * 60000 }; // sem nenhum sinal por 20 min, ou turno sem terminar em 30 min = pausa (no teste: vibeTest.tempos)
  let LIM_TEST = null; // só no modo de teste: % da janela de 5 h injetado
  const winOk = (l) => !!(l && typeof l.pct === 'number' && (!l.resets || l.resets * 1000 > Date.now()));
  const lim5 = () => { if (LIM_TEST != null) return { pct: LIM_TEST, resets: Date.now() / 1000 + 3600, teste: true }; try { return UI.limits && UI.limits.five; } catch { return null; } };
  const lim7 = () => { try { return UI.limits && UI.limits.week; } catch { return null; } };
  let LIM7_TEST = null, CUSTO_TEST = null; // só no modo de teste: % da janela de 7 d e custo do ciclo (US$) injetados
  const lim7r = () => (LIM7_TEST != null ? { pct: LIM7_TEST, resets: Date.now() / 1000 + 86400, teste: true } : lim7());
  // custo equivalente do ciclo (tabela da API, vindo da status line das abas do Vibe): soma o maior valor visto por sessão
  function custoCiclo(c) {
    if (CUSTO_TEST != null) return CUSTO_TEST;
    const e = c && c.est;
    if (!e) return null;
    e.custo = e.custo || {};
    try {
      for (const tid of [e.orq, e.dev]) {
        const m = tid && MET[tid], v = m && m.cost && m.cost.total_cost_usd;
        if (m && m.session_id && typeof v === 'number') e.custo[m.session_id] = Math.max(e.custo[m.session_id] || 0, v);
      }
    } catch { /* sem métricas */ }
    const vs = Object.values(e.custo);
    return vs.length ? vs.reduce((a, b) => a + b, 0) : null;
  }
  const tetoDe = (id) => call('politicaTeto', id, lim5(), lim7r(), custoCiclo(cyOf(id)));
  const pctTxt = (l) => (winOk(l) ? `${Math.round(l.pct)}%${l.teste ? ' (teste)' : ''}` : 'indisponível');
  const ACT = {}; // último sinal de cada aba (hook)
  // DEV2-007: o pedido em curso (c.pedindo) até o hook de prompt enviado. Parar ou pausar antes disso desfaz a tentativa
  // (não conta) e apaga o texto da caixa (Ctrl+U), para o próximo /clear não sair grudado no pedido antigo.
  function desfazPedido(c) {
    const p = c.pedindo;
    if (!p || p.enviado) return;
    c.pedindo = null;
    const x = c.est && c.est.exec;
    if (x) { if (p.key === 'dev') { x.enviadoDev = null; x.tentativas = Math.max(0, (x.tentativas || 1) - 1); } else x.enviadoRev = null; }
    try { if (p.digitado && isAlive(p.tab)) api.write(p.tab, '\x15'); } catch { /* aba já encerrada */ }
  }

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
    if (c.pedindo) c.pedindo.digitado = true;
    const P = c.pedindo;
    waitHook(c, tab.id, (d) => d.event === 'UserPromptSubmit', 30000).then((d) => { sent = true; if (d && P) { P.enviado = true; if (c.esperando) c.esperando.enviado = true; } });
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
    // DEV2-007: depois de um Esc (Parar ou tempo limite), a 1ª tecla seguinte pode ser engolida no caminho do terminal
    // ("/clear" chegava como "clear" e virava um pedido). Ctrl+U antes: esvazia a caixa e é a tecla que se perde, se for o caso.
    api.write(tab.id, '\x15');
    await sleep(200);
    if (c.gen !== g || !isAlive(tab.id)) return null;
    api.write(tab.id, '/clear');
    let n = 0;
    const enter = () => { if (got || c.gen !== g || !isAlive(tab.id)) return; api.write(tab.id, '\r'); if (++n < 3) setTimeout(enter, 5000); };
    setTimeout(enter, 500);
    const d = await w;
    if (d) await sleep(1500); // o Claude Code redesenha a caixa de texto
    return d;
  }
  // DEV2-015: "F5 da aba": fecha e reabre a aba do agente retomando a mesma conversa (--resume). Abre pelo caminho normal do
  // app, então a trava e o modelo atual da política (settings da aba do Vibe) valem na reabertura. Aba fechada: recria.
  async function f5Aba(id, key, g) {
    const c = cyOf(id), p = projOf(id), tab = tabOf(c.est[key]);
    if (!p) return false;
    if (!tab) return !!(await ensureTab(id, key, g));
    const w = waitHook(c, tab.id, (d) => d.event === 'SessionStart', 60000);
    try { await stopProc(tab); } catch { /* processo já encerrado */ }
    if (c.gen !== g) return false;
    await launch(p, tab, 'resume');
    const d = await w;
    if (c.gen !== g || !d) return false;
    await sleep(1500);
    return true;
  }
  // DEV2-015: últimas linhas da tela de uma aba (para o diagnóstico), como o "Exportar texto" do app
  function telaDe(tid) {
    try {
      const r = RT[tid];
      if (!r || !r.term) return '';
      const b = r.term.buffer.active, out = [];
      for (let i = Math.max(0, b.length - 200); i < b.length; i++) { const l = b.getLine(i); out.push(l ? l.translateToString(true) : ''); }
      return out.join('\n');
    } catch { return ''; }
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
      // Aba do Vibe parada (ex.: o app foi reaberto): volta na mesma aba com uma conversa nova. Cada pedido começa com
      // /clear, então não há contexto a perder; e retomar uma conversa que nunca recebeu mensagem não abre no Claude Code
      // (achado na DEV2-006: a aba Dev criada e nunca usada ficou parada e o ciclo pausou em 60 s).
      w = waitHook(c, tab.id, (d) => d.event === 'SessionStart', 60000);
      tab.sessionId = crypto.randomUUID(); tab.started = false; save();
      launch(p, tab, 'new');
    }
    const d = await w;
    if (c.gen !== g) return null;
    if (!d) { falha(id, key, `A aba "${tab.name}" não abriu em 60 s.`); return null; } // DEV2-015: recuperação, não pausa
    await sleep(1500);
    return tab;
  }
  // Pede algo a um agente: /clear, pedido curto e espera o fim do turno (hook Stop). false = parou, pausou ou falhou.
  // opts.semClear (DEV2-015): depois do F5 da aba, o pedido vai na conversa retomada, sem /clear.
  async function ask(id, g, key, text, opts = {}) {
    const c = cyOf(id);
    if (!text) { pause(id, 'erro', 'Não foi possível montar o pedido (a entrega ou o plano não foram encontrados).'); return false; }
    // o pedido não chegou a ser digitado (aba não abriu, /clear não confirmado): não conta como tentativa, e o "Continuar"
    // manda o pedido normal em vez de "refazer" (achado na DEV2-006)
    const P = (c.pedindo = { key, tab: null, enviado: false, digitado: false });
    const naoEnviado = () => { if (c.pedindo !== P) return; desfazPedido(c); cySave(id); };
    const tab = await ensureTab(id, key, g);
    if (!tab || c.gen !== g) { naoEnviado(); return false; }
    P.tab = tab.id;
    if (!opts.semClear && !(await clearTab(c, tab, g))) { if (c.gen === g) { naoEnviado(); falha(id, key, `O /clear não foi confirmado na aba "${tab.name}".`); return false; } naoEnviado(); return false; }
    if (c.gen !== g) { naoEnviado(); return false; }
    const stop = waitHook(c, tab.id, (d) => d.event === 'Stop');
    c.esperando = { tab: tab.id, desde: Date.now(), key, enviado: false };
    typeInto(c, tab, text, g);
    const d = await stop;
    if (c.gen === g) { c.esperando = null; if (c.pedindo === P) c.pedindo = null; }
    return c.gen === g && !!d;
  }

  function pause(id, tipo, motivo, extra = {}) {
    const c = cyOf(id);
    if (!c.est || !c.est.exec) return;
    const acts = extra.acts; delete extra.acts; // DEV2-016: botões no sino (Autorizar deploy / Negar)
    desfazPedido(c);
    c.gen++; cancelWaits(c); c.esperando = null;
    if (extra.interromper) { try { if (isAlive(extra.interromper)) api.write(extra.interromper, '\x1b'); } catch { /* aba já encerrada */ } delete extra.interromper; }
    c.live = tipo === 'limite' && !extra.semAuto; // limite das janelas: com o app aberto, o Termix retoma sozinho quando ela virar
    const x0 = c.est.exec.pausa; // limite: avisa uma vez, não a cada nova conferência
    c.est = { ...c.est, fase: 'pausado', aviso: '' };
    c.est.exec.pausa = { tipo, motivo, desde: nowIso(), ...extra };
    cySave(id);
    const t = c.est.exec.tarefas[c.est.exec.k];
    if (tipo !== 'limite' || !(x0 && x0.tipo === 'limite')) notifyHuman(projOf(id), tabOf(c.est.dev) || tabOf(c.est.orq), `${t ? `${t.id}: ` : ''}${motivo}`, acts);
  }
  /* ---------- recuperação de erro (DEV2-015) ----------
     Decisão do Ygor: erro simples não trava o projeto. Dev com erro, tempo limite ou sem sinal: o Termix grava um diagnóstico
     (vibe\<id>\diagnosticos\Tk-n.md), dá /clear no orquestrador e pede UMA ação da lista fechada (recuperacao\Tk-n.json),
     executa em código e confere como sempre. Até N voltas por tarefa (política, padrão 3); esgotadas, a tarefa vira
     pendência, o sino avisa e o ciclo segue. Pausa total só com "bloqueia_proximas", main/master alterada ou teto da política.
     Orquestrador travado: F5 da aba dele uma vez; se travar de novo, pausa e avisa. As voltas não gastam as tentativas
     da revisão (2 refações + Continuar), que seguem como antes. */
  const REC_TXT = { reenviar: 'reenviar ao Dev', clear_dev: '/clear no Dev e recomeçar', f5_aba: 'F5 da aba do Dev', f5_projeto: 'F5 do projeto', dividir: 'dividir a tarefa', pular: 'pular (vira pendência)' };
  const voltasMax = (c) => { const p = c && c.pol && c.pol.politica; return p && p.recuperacao && typeof p.recuperacao.voltas === 'number' ? p.recuperacao.voltas : 3; };
  const ZERA = { etapa: 'dev', tentativas: 0, extra: 0, extraRec: 0, refazer: null, enviadoDev: null, enviadoRev: null, semCommitOk: false, rec: null, semClear: false, manterBase: false, deployRetry: null };
  // Falha no meio da tarefa: Dev = recuperação (sem pausar); orquestrador = F5 da aba dele uma vez, depois pausa.
  function falha(id, key, motivo, extra = {}) {
    const c = cyOf(id), x = c.est && c.est.exec;
    if (!x || c.est.fase !== 'execucao') return;
    const t = x.tarefas[x.k];
    if (!t) return pause(id, 'erro', motivo); // DEV2-016: no fim do ciclo (handoff de DEV2..DEV5) não há tarefa para recuperar
    if (key === 'orq') {
      if (x.orqF5 && x.orqF5.tarefa === t.id && !x.orqF5.pendente) return pause(id, 'erro', `${motivo} O Termix já reabriu a aba do orquestrador (F5) nesta tarefa e ele travou de novo. Veja a aba "${ORQ_NAME}" e clique em Continuar.`, extra);
      x.orqF5 = { tarefa: t.id, motivo, pendente: true, data: nowIso() };
    } else {
      const r0 = x.rec && x.rec.tarefa === t.id ? x.rec : { tarefa: t.id, voltas: 0, tentado: [] };
      x.rec = { ...r0, fase: 'nova', falha: motivo, decisao: null, enviado: null };
      x.etapa = 'recuperar';
    }
    x.retomar = false;
    desfazPedido(c);
    c.gen++; cancelWaits(c); c.esperando = null;
    if (extra.interromper) { try { if (isAlive(extra.interromper)) api.write(extra.interromper, '\x1b'); } catch { /* aba já encerrada */ } }
    cySave(id);
    setTimeout(() => { if (c.est && c.est.fase === 'execucao') execLoop(id); }, 500);
  }
  // Voltas esgotadas (ou "pular"): a tarefa vira pendência, o sino avisa e o ciclo segue (ou pausa, se as próximas dependem dela).
  function pendencia(id, motivo) {
    const c = cyOf(id), x = c.est.exec, t = x.tarefas[x.k], rec = x.rec || {};
    const bloq = !!(rec.decisao && rec.decisao.bloqueia);
    x.pendencias = [...(x.pendencias || []), { id: t.id, titulo: t.titulo, motivo: String(motivo || '').slice(0, 400), voltas: rec.voltas || 0, diag: rec.diag || '', bloqueia: bloq, data: nowIso() }];
    Object.assign(x, { ...ZERA, k: x.k + 1 });
    cySave(id);
    const prox = x.tarefas[x.k];
    if (bloq) return pause(id, 'humano', `A ${t.id} virou pendência (${motivo}) e o orquestrador indicou que as próximas tarefas dependem dela. Resolva a ${t.id} (diagnóstico em ${rec.diag || 'vibe\\diagnosticos'}) e clique em Continuar para seguir${prox ? ` com a ${prox.id}` : ''}.`);
    notifyHuman(projOf(id), tabOf(c.est.dev) || tabOf(c.est.orq), `${t.id} virou pendência: ${motivo}${rec.resumo ? ` · Diagnóstico: ${rec.resumo}` : ''}. O ciclo segue${prox ? ` com a ${prox.id}` : ''}.`);
    return null;
  }
  /* ---------- deploy feito pelo Termix (DEV2-016) ----------
     Decisões do Ygor: o deploy é do Termix, em código (src/vibe/deploy.js), nunca do agente; voltar versão é por git revert.
     Etapa 'deploy' do ciclo (zero token): portão na branch de trabalho, junção na main, tag, envio sem força, receita e volta
     para a branch. Portão, conflito ou árvore suja vão para a recuperação (DEV2-015): o Dev conserta na branch e o Termix
     tenta de novo. Receita que falha depois do envio: pausa com "Rodar a receita de novo", "Voltar versão" e "Seguir sem
     publicar"; o Termix não desfaz nada sozinho. */
  async function depRefresh(id) { const c = cyOf(id); c.deps = (await call('deployLista', id)) || []; paintCycle(); return c.deps; }
  const proxTarefa = (id, x, item, pend) => { // a tarefa atual vira feita (ou pendência) e o ciclo segue
    const c = cyOf(id), t = x.tarefas[x.k];
    x.pausa = null;
    c.est = { ...c.est, fase: 'execucao', aviso: '' };
    if (pend) { cySave(id); pendencia(id, pend); } else { x.feitas.push({ id: t.id, titulo: t.titulo, data: nowIso(), ...item }); Object.assign(x, { ...ZERA, k: x.k + 1 }); cySave(id); }
    if (c.est.fase === 'execucao') execLoop(id);
  };
  async function deployEtapa(id, g, x, t, alive) {
    const c = cyOf(id);
    const pt = await call('politicaTarefa', id, t);
    if (!alive()) return 'parar';
    if (pt && pt.deploy === 'retido') { x.feitas.push({ id: t.id, titulo: t.titulo, deploy: 'retido', data: nowIso() }); Object.assign(x, { ...ZERA, k: x.k + 1 }); cySave(id); return; }
    if (!pt || pt.deploy === 'pausar') { x.etapa = 'dev'; pause(id, 'deploy', `Tarefa de DEPLOY: "${t.titulo}". A política não permite o deploy automático agora; o Termix só segue com a sua liberação.`, { gate: t.id }); return 'parar'; }
    x.sub = 'deploy'; x.deployEm = nowIso(); cySave(id);
    const r = (await call('deployExec', id, 'ciclo')) || { ok: false, etapa: 'interno', motivo: 'Erro no deploy. Veja o erros.log.' };
    x.ultimoDeploy = { tarefa: t.id, ok: !!r.ok, etapa: r.etapa || '', tag: r.tag || '', motivo: r.motivo || '', log: r.log || '', data: nowIso() };
    depRefresh(id);
    if (!alive()) return 'parar';
    if (r.ok || r.etapa === 'nada') {
      x.feitas.push({ id: t.id, titulo: t.titulo, deploy: r.ok ? 'feito' : 'nada', tag: r.ok ? r.tag : '', data: nowIso() });
      Object.assign(x, { ...ZERA, k: x.k + 1 });
      cySave(id);
      if (r.ok) notifyHuman(projOf(id), tabOf(c.est.orq), `Deploy publicado pelo Termix: ${t.id}, tag ${r.tag}.${r.aviso ? ` ${r.aviso}` : ''}`);
      return;
    }
    if (['portao', 'conflito', 'arvore', 'branch'].includes(r.etapa)) {
      x.deployRetry = t.id; cySave(id);
      falha(id, 'dev', `${r.motivo} O deploy da ${t.id} é feito pelo Termix: corrija na branch ${x.branch} (com commit) para o deploy poder sair; não publique você.`);
      return 'parar';
    }
    if (r.etapa === 'receita') { pause(id, 'deploy', `${r.motivo} O Termix não desfez nada sozinho.`, { receita: r.tag, log: r.log }); return 'parar'; }
    pause(id, 'erro', `Deploy da ${t.id}: ${r.motivo || 'falhou'} Clique em Continuar para tentar o deploy de novo.`);
    return 'parar';
  }
  // "Pedir autorização": resumo (commits que entram, portão, receita) e o ponto de aprovação em arquivo (deploys\autorizacao.json)
  async function pedirAutorizacao(id, t) {
    const c = cyOf(id);
    c.pol = (await call('politicaGet', id)) || c.pol; // a política pode ter sido editada fora da tela
    const rs = await call('deployResumo', id);
    await call('deployAut', id, 'pedir', { tarefa: t.id, resumo: rs });
    const txt = rs && rs.ok ? `${plural(rs.commits.length, 'commit', 'commits')} da ${rs.branch} para a ${rs.principal} (${rs.modo}); portão: ${rs.portao || 'nenhum'}; receita: ${rs.receita.length ? rs.receita.join(' · ') : 'nenhuma'}.` : ((rs && rs.motivo) || '');
    return pause(id, 'deploy', `Autorizar o deploy da ${t.id} ("${t.titulo}")? ${txt}`, { autorizacao: { tarefa: t.id, resumo: rs && rs.ok ? rs : null }, acts: [['Autorizar deploy', 'vibedep-ok', id], ['Negar', 'vibedep-no', id]] });
  }
  // Decisão da autorização: painel, sino ou (DEV2-019) Telegram, pelo mesmo caminho (o arquivo de autorização).
  async function deployDecidir(id, decisao, origem) {
    const c = cyOf(id), x = c.est && c.est.exec, pz = x && x.pausa;
    if (!pz || !pz.autorizacao || c.decidindo) return false;
    c.decidindo = true;
    try {
      const r = await call('deployAut', id, 'decidir', { decisao, origem: origem || 'painel' });
      const lido = r && r.ok ? r : ((await call('deployAut', id, 'ler')) || {}); // já decidido por outro caminho (ex.: Telegram)
      const st = lido.status;
      if (st !== 'autorizado' && st !== 'negado') return false;
      if (x.pausa !== pz) return false;
      const t = x.tarefas[x.k], quem = (lido.decisao && lido.decisao.origem) || origem || 'painel';
      if (st === 'autorizado') { x.autorizadas = [...(x.autorizadas || []), t.id]; x.pausa = null; x.etapa = 'deploy'; c.est = { ...c.est, fase: 'execucao', aviso: '' }; cySave(id); execLoop(id); }
      else proxTarefa(id, x, null, `deploy negado (${quem})`);
      return st;
    } finally { c.decidindo = false; }
  }
  // "Retomar deploy": os retidos (e os "pendentes" da DEV2-014) saem num deploy só, com a branch de trabalho atual.
  async function deployRetidos(id) {
    const c = cyOf(id), x = c.est && c.est.exec;
    const pend = x ? x.feitas.filter((f) => f.deploy === 'retido' || f.deploy === 'pendente') : [];
    if (!pend.length) return null;
    c.depMsg = 'Deploy dos retidos em andamento…'; paintCycle();
    const r = (await call('deployExec', id, 'retomar')) || { ok: false, motivo: 'erro no deploy' };
    if (r.ok || r.etapa === 'nada' || r.etapa === 'receita') for (const f of pend) Object.assign(f, { deploy: r.ok || r.enviado ? 'feito' : 'nada', tag: r.enviado ? r.tag : '', receitaFalhou: r.etapa === 'receita' });
    c.depMsg = r.ok ? `Deploy dos retidos publicado (tag ${r.tag}).` : r.etapa === 'nada' ? 'Deploy dos retidos: nada novo a publicar.' : r.etapa === 'receita' ? `${r.motivo} Use "Rodar a receita de novo" ou "Voltar para antes deste" na lista de deploys.` : `O deploy dos retidos não saiu: ${r.motivo}`;
    cySave(id); await depRefresh(id);
    notifyHuman(projOf(id), tabOf(c.est && c.est.orq), c.depMsg);
    return r;
  }
  // "Rodar a receita de novo" (receita que falhou depois do envio, ou depois de voltar versão)
  async function depReceita(id, tag) {
    const c = cyOf(id), x = c.est && c.est.exec;
    if (c.esperando) { c.depMsg = 'Um agente está trabalhando: espere a tarefa atual terminar.'; paintCycle(); return null; }
    c.depMsg = 'Rodando a receita de novo…'; paintCycle();
    const r = (await call('deployReceita', id, tag)) || { ok: false, motivo: 'erro ao rodar' };
    c.depMsg = r.ok ? `Receita rodou de novo: publicado${tag ? ` (${tag})` : ''}.` : `A receita falhou de novo: ${r.motivo}`;
    await depRefresh(id);
    const pz = x && x.pausa;
    if (r.ok && pz && pz.receita && pz.receita === tag && c.est.fase === 'pausado') proxTarefa(id, x, { deploy: 'feito', tag });
    else if (r.ok && x) { for (const f of x.feitas) if (f.tag === tag) f.receitaFalhou = false; cySave(id); }
    return r;
  }
  // "Voltar versão": confirmação explícita no painel; git revert na main e envio sem força (src/vibe/deploy.js)
  async function depVoltar(id, tag) {
    const c = cyOf(id);
    if (c.esperando) { c.depMsg = 'Um agente está trabalhando: espere a tarefa atual terminar (ou pare o ciclo) para voltar versão.'; paintCycle(); return null; }
    c.voltaConf = null; c.depMsg = `Voltando para antes de ${tag}…`; paintCycle();
    const r = (await call('deployVoltar', id, tag)) || { ok: false, motivo: 'erro ao voltar versão' };
    const jn = r.ok && r.juncao ? (r.juncao.ok ? ` A ${r.principal} foi juntada na ${r.branch} (merge --no-ff)${r.juncao.enviado ? ' e enviada, sem força' : `; ${r.juncao.motivo}`}.` : ` ${r.juncao.motivo}`) : '';
    c.depMsg = r.ok ? `Versão voltada: git revert de ${r.revertidos.join(', ')} enviado para a ${r.principal} (${String(r.sha).slice(0, 8)}), sem força.${jn}` : `Voltar versão não foi feito: ${r.motivo}`;
    if (r.ok) c.voltaFeita = { tag };
    await depRefresh(id);
    notifyHuman(projOf(id), tabOf(c.est && c.est.orq), c.depMsg);
    return r;
  }
  // DEV2..DEV5: no fim do ciclo, o orquestrador reescreve o docs/HANDOFF_DEVn.md e o Termix faz o commit e envia só a devN.
  async function fimDevN(id, g, x, alive) {
    if (x.fimHandoff) return;
    const fi = await call('fimInfo', id);
    if (!alive()) return 'parar';
    if (!fi || !fi.aplica) { x.fimHandoff = { aplica: false }; cySave(id); return; }
    x.sub = 'fim'; cySave(id);
    const text = await call('fimPrompt', id);
    if (!(await ask(id, g, 'orq', text))) { if (alive()) pause(id, 'erro', `O orquestrador não terminou o ${fi.arquivo} do fim do ciclo. Clique em Continuar para pedir de novo.`); return 'parar'; }
    const r = await call('fimEnviar', id);
    if (!alive()) return 'parar';
    x.fimHandoff = { aplica: true, ok: !!(r && r.ok), branch: (r && r.branch) || fi.branch, arquivo: fi.arquivo, sha: (r && r.sha) || '', motivo: (r && r.motivo) || (r ? '' : 'erro ao enviar') };
    cySave(id);
  }
  async function fimReenviar(id) {
    const c = cyOf(id), x = c.est && c.est.exec;
    if (!x || !x.fimHandoff || !x.fimHandoff.aplica) return null;
    const r = await call('fimEnviar', id);
    x.fimHandoff = { ...x.fimHandoff, ok: !!(r && r.ok), sha: (r && r.sha) || x.fimHandoff.sha, motivo: (r && r.motivo) || '' };
    cySave(id);
    return r;
  }
  // a decisão da autorização pelo sino (botões do aviso). O núcleo marca o aviso como feito; aqui o Termix decide.
  document.addEventListener('click', (e) => {
    const el = e.target && e.target.closest && e.target.closest('[data-ev]');
    if (!el) return;
    const [, k, pid] = String(el.dataset.ev).split('|');
    if (k === 'vibedep-ok') deployDecidir(pid, 'autorizar', 'sino');
    else if (k === 'vibedep-no') deployDecidir(pid, 'negar', 'sino');
  }, true);
  function finish(id) {
    const c = cyOf(id), x = c.est.exec;
    c.gen++; c.live = false;
    c.est = { ...c.est, fase: 'concluido', concluido: nowIso(), aviso: '' };
    cySave(id);
    if (c.est.auto && c.est.auto.mutirao) { mutFim(id); return; } // implementação automática do Mutirão (DEV2-006)
    call('f5Encerrar', id); // DEV2-016: o servidor do F5 do projeto sai no fim do ciclo
    call('tarefaFim', id).then(async (r) => { if (r) { c.hist = (await call('tarefaHist', id)) || []; paintCycle(); } }); // DEV2-017: a tarefa fica "concluida" no histórico
    const np = (x.pendencias || []).length, fh = x.fimHandoff;
    const hand = fh && fh.aplica ? (fh.ok ? ` ${fh.arquivo} no commit e a ${fh.branch} enviada; o DEV1 é avisado pelo fluxo.` : ` O envio da ${fh.branch} com o handoff falhou: ${fh.motivo}`) : '';
    notifyHuman(projOf(id), tabOf(c.est.orq), `${c.est.tarefa ? 'Tarefa concluída' : 'Projeto concluído'}: ${plural(x.feitas.length, 'tarefa', 'tarefas')} na branch ${x.branch || ''}${np ? `, ${plural(np, 'pendência', 'pendências')} (veja a lista no painel)` : ''}.${hand}`);
    mutEntrega(id); // Mutirão (DEV2-005): sendo a parte de um sócio, o Termix grava e envia a entrega
  }
  // Mutirão concluído (DEV2-006): o Termix (código) faz push só da branch do dono e avisa. Promover para a main é do humano.
  async function mutFim(id) {
    const c = cyOf(id), p = projOf(id);
    const r = await call('mutAutoFim', id);
    if (c.est) { c.est.mutFim = r ? { ok: !!r.ok, branch: r.branch, sha: r.sha, motivo: r.motivo || '' } : { ok: false, motivo: 'Erro ao enviar a branch do dono.' }; cySave(id); }
    notifyHuman(p, tabOf(c.est && c.est.orq), r && r.ok ? `Mutirão concluído na ${r.branch}. Promover para a main é com você.` : `Mutirão: ${(r && r.motivo) || 'o push da branch do dono falhou.'}`);
    if (MP && MP.id === id) mutReload(id);
    return r;
  }
  async function mutEntrega(id, teste) {
    const c = cyOf(id), p = projOf(id);
    const st = await call('mutEstado', id, p && p.path);
    if (!st || !st.socio) return null;
    const x = (c.est && c.est.exec) || { feitas: [] };
    const r = await call('mutEntregar', id, { feitas: x.feitas, desde: c.est && c.est.iniciado, resumo: teste ? 'Entrega simulada (modo de teste).' : '', teste: !!teste });
    if (c.est) { c.est.mutirao = r ? { ok: !!r.ok, branch: r.branch, data: r.data, motivo: r.motivo || '' } : { ok: false, motivo: 'Erro ao gravar a entrega.' }; cySave(id); }
    if (r && !r.ok) notifyHuman(p, null, `Entrega do Mutirão: ${r.motivo}`);
    delete PART[id];
    return r;
  }

  // "Executar plano": lê as tarefas do plano (zero token) e começa pela T1.
  async function execStart(id) {
    const c = cyOf(id);
    if (!c.est || c.est.fase !== 'pronto') return false;
    const ts = ((await call('tarefas', id)) || []).filter((t) => !t.dividida); // DEV2-015: tarefa dividida = só as partes
    if (!ts.length) { c.est.aviso = 'O plano não tem tarefas no formato "## T1 — título". Peça ao orquestrador para regravar o plano nesse formato (Parar e Iniciar de novo).'; cySave(id); return false; }
    // DEV2-014: sem política gravada (ex.: o Mutirão clica sozinho em Executar), grava a padrão antes de começar
    if (!c.pol || !c.pol.existe) { await call('politicaSet', id, (c.pol && c.pol.politica) || {}, 'padrão ao executar'); c.pol = (await call('politicaGet', id)) || c.pol; }
    await call('trust', id);
    c.est = { ...c.est, fase: 'execucao', aviso: '', exec: { tarefas: ts, k: 0, etapa: 'dev', tentativas: 0, feitas: [], liberadas: [], iniciado: nowIso() } };
    cySave(id);
    if (c.est.auto && c.est.auto.mutirao) call('mutAutoSet', id, 'executando');
    execLoop(id);
    return true;
  }
  // Continuar (depois de pausa, Parar ou reabrir o app): segue de onde parou, conferindo os arquivos antes de pedir de novo.
  function continueExec(id, auto) {
    const c = cyOf(id), x = c.est && c.est.exec;
    if (!x) return;
    const pz = x.pausa;
    if (pz && pz.gate) x.liberadas = [...(x.liberadas || []), pz.gate]; // o humano liberou a tarefa de DEPLOY/HUMANO
    if (pz && pz.ajuda) { x.retomar = false; x.extra = (x.extra || 0) + 1; } // limite de tentativas: o humano ajudou, mais UMA chance (DEV2-007)
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
    Object.assign(x, { ...ZERA, k: x.k + 1, pausa: null, retomar: false });
    c.est = { ...c.est, fase: 'execucao', aviso: '' };
    cySave(id);
    execLoop(id);
  }

  // limite de tentativas: 1 execução + MAX_REFAZER refações; cada "Continuar" depois da pausa dá mais uma (DEV2-007)
  // DEV2-015: as execuções pedidas pela recuperação (extraRec) não gastam as tentativas da revisão (não contam em dobro)
  const maxTent = (x) => MAX_REFAZER + 1 + (x.extra || 0) + (x.extraRec || 0);
  const esgotou = (x) => (x.tentativas || 0) >= maxTent(x);
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
        // DEV2-016: "Retomar deploy" no meio de uma tarefa: os retidos saem na fronteira (nenhum agente trabalhando)
        if (x.deployFila && (x.k >= x.tarefas.length || (x.etapa === 'dev' && !x.tentativas))) { x.deployFila = false; cySave(id); await deployRetidos(id); if (!alive()) return; }
        if (x.k >= x.tarefas.length) { if ((await fimDevN(id, g, x, alive)) === 'parar') return; return finish(id); } // DEV2-016: fim de DEV2..DEV5
        const t = x.tarefas[x.k];
        // DEV2-014: a política é lida no início de cada tarefa (editar no meio do ciclo vale a partir da próxima)
        // DEV2-016: numa tarefa de deploy em recuperação (deployRetry), o Dev conserta primeiro; o deploy volta depois da revisão
        if (x.etapa === 'dev' && !x.tentativas && x.deployRetry !== t.id) {
          const pt = (await call('politicaTarefa', id, t)) || { deploy: t.deploy ? 'pausar' : '', humano: t.humano ? 'humano' : '' };
          if (!alive()) return;
          const liberada = (x.liberadas || []).includes(t.id);
          if (!liberada && (pt.humano || pt.deploy === 'pausar')) {
            if (t.deploy && pt.deploy === 'pausar') return pause(id, 'deploy', `Tarefa de DEPLOY: "${t.titulo}". O Termix só segue com a sua liberação.`, { gate: t.id });
            if (pt.humano === 'humano') return pause(id, 'humano', `A tarefa "${t.titulo}" precisa de você (acesso, dado ou decisão).`, { gate: t.id });
            return pause(id, 'humano', `Política: confirmar com você antes de cada tarefa. Próxima: ${t.id} — "${t.titulo}". Clique em Continuar para liberar.`, { gate: t.id, sempre: true });
          }
          // DEV2-016: "Pedir autorização": o sino e o painel mostram "Autorizar deploy" e "Negar", com o resumo
          if (t.deploy && pt.deploy === 'autorizar' && !(x.autorizadas || []).includes(t.id)) return pedirAutorizacao(id, t);
          // DEV2-016: deploy automático (ou autorizado): quem faz é o Termix, em código (etapa 'deploy')
          if (t.deploy && (pt.deploy === 'pendente' || pt.deploy === 'autorizar')) { x.etapa = 'deploy'; cySave(id); continue; }
          // "Pausar deploy" ligado: o deploy fica retido e o resto do ciclo segue ("Retomar deploy" executa os retidos)
          if (t.deploy && pt.deploy === 'retido') {
            x.feitas.push({ id: t.id, titulo: t.titulo, deploy: pt.deploy, data: nowIso() });
            Object.assign(x, { ...ZERA, k: x.k + 1 });
            cySave(id);
            continue;
          }
        }
        // DEV2-015: orquestrador travado: o Termix dá F5 na aba dele (uma vez por tarefa) e pede de novo o que estava pendente
        if (x.orqF5 && x.orqF5.pendente) {
          x.orqF5.pendente = false; cySave(id);
          const okF5 = await f5Aba(id, 'orq', g);
          if (!alive()) return;
          if (!okF5) return pause(id, 'erro', `${x.orqF5.motivo} O Termix tentou reabrir a aba do orquestrador (F5) e ela não voltou. Veja a aba "${ORQ_NAME}" e clique em Continuar.`);
          x.orqF5.feito = nowIso();
          if (x.etapa === 'revisao') x.enviadoRev = null;
          if (x.etapa === 'recuperar' && x.rec) x.rec.enviado = null;
          cySave(id);
          continue;
        }
        if (x.etapa === 'deploy') { if ((await deployEtapa(id, g, x, t, alive)) === 'parar') return; continue; } // DEV2-016
        const teto = await tetoDe(id); // as voltas da recuperação também passam pelo teto (contam no orçamento)
        if (!alive()) return;
        if (teto) return pause(id, 'limite', teto.motivo, teto.auto ? {} : { semAuto: true });
        if (x.etapa === 'recuperar') { if ((await recuperar(id, g, x, t, alive)) === 'parar') return; continue; }
        if (x.etapa === 'dev') {
          if (!(x.retomar && x.enviadoDev)) {
            let info = await call('gitInfo', id);
            if (!alive()) return;
            if (info && info.branch !== x.branch) { const b2 = await call('branchPrep', id); if (!alive()) return; if (!b2 || !b2.ok) return pause(id, 'erro', (b2 && b2.motivo) || 'A branch permitida não está ativa.'); info = await call('gitInfo', id); }
            if (!info) return pause(id, 'erro', 'Não foi possível ler o git do projeto.');
            // DEV2-015: numa volta de recuperação, o commit que o Dev já tiver feito nesta tarefa continua valendo
            if (!(x.manterBase && x.base)) x.base = { sha: info.permitidaSha, heads: info.heads };
            x.manterBase = false;
            x.tentativas = (x.tentativas || 0) + 1;
            x.enviadoDev = nowIso(); x.sub = 'dev';
            const semClear = !!x.semClear; x.semClear = false;
            cySave(id);
            const text = await call('execPrompt', id, x.refazer ? 'refazer' : 'dev', t.id, { ...(x.refazer || {}), semCommit: !!t.semCommit });
            if (!(await ask(id, g, 'dev', text, { semClear }))) return;
          }
          const retomada = !!x.retomar;
          x.retomar = false;
          // conferência em código (zero token)
          const info = await call('gitInfo', id), res = await call('resultadoLer', id, t.id);
          if (!alive()) return;
          if (!info) return pause(id, 'erro', 'Não foi possível ler o git do projeto.');
          const mexeu = Object.keys(x.base.heads || {}).filter((b) => (info.heads[b] || null) !== (x.base.heads[b] || null));
          if (mexeu.length) return pause(id, 'erro', `A ${mexeu.join(', ')} mudou durante a ${t.id}. Isso é proibido: confira o projeto antes de continuar.`);
          if (info.branch !== x.branch) return falha(id, 'dev', `O Dev terminou a ${t.id} na branch "${info.branch || '?'}" em vez de "${x.branch}".`);
          const falta = [];
          const fresco = !!(res && res.existe && res.mtime >= Date.parse(x.enviadoDev) - 2000);
          const novo = !!(info.permitidaSha && info.permitidaSha !== x.base.sha);
          if (!fresco) falta.push(`resultados\\${t.id}.md`);
          // [SEM COMMIT] (DEV2-007): tarefa de validação/conferência; sem commit novo vale, desde que o Tk.md traga a validação
          if (t.semCommit) { if (fresco && !novo && !res.validacao) falta.push(`a linha "Validação: ..." em resultados\\${t.id}.md (tarefa [SEM COMMIT])`); }
          else if (!novo) falta.push(`um commit novo na branch ${x.branch}`);
          if (falta.length) {
            x.refazer = { falta: `faltou ${falta.join(' e ')}` };
            // DEV2-015: esgotadas as tentativas (ou numa execução pedida pela recuperação), vai para a recuperação em vez de pausar
            if (esgotou(x)) return falha(id, 'dev', `A ${t.id} não ficou pronta em ${plural(x.tentativas, 'tentativa', 'tentativas')} (${retomada ? 'interrompida e ' : ''}faltou ${falta.join(' e ')}).`);
            cySave(id);
            continue;
          }
          Object.assign(x, { ultimoCommit: novo ? info.ultimo : x.ultimoCommit, devSha: novo ? info.permitidaSha : null, semCommitOk: !novo, etapa: 'revisao', enviadoRev: null });
          cySave(id);
          continue;
        }
        if (x.etapa === 'revisao') {
          if (!(x.retomar && x.enviadoRev)) {
            x.enviadoRev = nowIso(); x.sub = 'rev';
            cySave(id);
            const text = await call('execPrompt', id, 'revisao', t.id, { sha: x.devSha, semCommit: !!t.semCommit });
            if (!(await ask(id, g, 'orq', text))) return;
          }
          const retomadaRev = !!x.retomar;
          x.retomar = false;
          const rv = await call('revisaoLer', id, t.id);
          if (!alive()) return;
          // revisão interrompida (Parar ou tempo limite) e sem veredito: pede a revisão de novo, uma vez, de forma limpa
          if (retomadaRev && (!rv || !rv.ok || rv.mtime < Date.parse(x.enviadoRev) - 2000)) { x.enviadoRev = null; cySave(id); continue; }
          if (!rv || !rv.ok || rv.mtime < Date.parse(x.enviadoRev) - 2000) return falha(id, 'orq', `O orquestrador não gravou revisoes\\${t.id}.json com o veredito.`); // DEV2-015: F5 dele uma vez, depois pausa
          x.ultimaRevisao = { id: t.id, veredito: rv.veredito, motivo: rv.motivo.slice(0, 300) };
          if (rv.veredito === 'aprovado') {
            // DEV2-016: o Dev consertou o que barrou o deploy (portão, conflito): o Termix tenta o deploy de novo (as voltas continuam contando)
            if (t.deploy && x.deployRetry === t.id) { Object.assign(x, { ...ZERA, rec: x.rec, etapa: 'deploy', deployRetry: t.id }); cySave(id); continue; }
            x.feitas.push({ id: t.id, titulo: t.titulo, commit: x.semCommitOk ? '' : x.ultimoCommit, semCommit: !!x.semCommitOk, tentativas: x.tentativas });
            Object.assign(x, { ...ZERA, k: x.k + 1 });
            cySave(id);
            continue;
          }
          Object.assign(x, { refazer: { revisao: true }, etapa: 'dev', enviadoDev: null, enviadoRev: null });
          if (esgotou(x)) return pause(id, 'humano', `A revisão pediu para refazer a ${t.id} depois de ${plural(x.tentativas, 'tentativa', 'tentativas')}: ${rv.motivo.slice(0, 200)}. Ajude e clique em Continuar (mais uma tentativa).`, { ajuda: true });
          cySave(id);
        }
      }
    } catch (e) {
      console.error('vibe: execução', e);
      if (c.gen === g) pause(id, 'erro', `Erro no Termix: ${e && e.message ? e.message : e}`);
    }
  }

  // DEV2-015: uma etapa da recuperação. Fases: 'nova' (diagnóstico e nova volta, ou pendência) -> 'pedido' (orquestrador
  // grava a decisão) -> 'acao' (o Termix executa) -> 'conferir' (a tarefa volta ao Dev; falhando de novo, nova volta).
  // Devolve 'parar' quando pausou/parou; senão o execLoop segue.
  async function recuperar(id, g, x, t, alive) {
    const c = cyOf(id), rec = x.rec, max = voltasMax(c);
    const retom = !!x.retomar;
    x.retomar = false;
    if (!rec || rec.tarefa !== t.id) { Object.assign(x, { etapa: 'dev', rec: null }); cySave(id); return; }
    if (rec.fase === 'nova') {
      const n = (rec.diags || 0) + 1;
      const tentado = [...(rec.tentado || []), `falha: ${rec.falha}`];
      const d = await call('recDiag', id, t.id, n, { quem: 'dev', motivo: rec.falha, tela: telaDe(c.est.dev), tentado, max });
      if (!alive()) return 'parar';
      Object.assign(rec, { diags: n, tentado, diag: d && d.arquivo ? d.arquivo : '', resumo: d && d.resumo ? d.resumo : rec.falha });
      if ((rec.voltas || 0) >= max) { pendencia(id, max ? `${plural(max, 'volta', 'voltas')} de recuperação sem sucesso (última falha: ${rec.falha})` : `sem voltas de recuperação na política (${rec.falha})`); return alive() ? undefined : 'parar'; }
      rec.voltas = (rec.voltas || 0) + 1;
      Object.assign(rec, { fase: 'pedido', n, enviado: null, decisao: null, inicio: rec.inicio || nowIso() });
      cySave(id);
      return;
    }
    if (rec.fase === 'pedido') {
      if (!(retom && rec.enviado)) {
        rec.enviado = nowIso(); x.sub = 'rec';
        cySave(id);
        const text = await call('recPrompt', id, t.id, rec.n, max);
        if (!(await ask(id, g, 'orq', text))) return 'parar';
      }
      const r = await call('recLer', id, t.id, rec.n);
      if (!alive()) return 'parar';
      const fresco = r && r.mtime != null && r.mtime >= Date.parse(rec.enviado) - 2000;
      if (!r || !r.ok || !fresco) {
        if (retom && !rec.repetido) { rec.repetido = true; rec.enviado = null; cySave(id); return; } // depois do Continuar: pede de novo, uma vez
        rec.repetido = false;
        const mot = !r ? 'erro ao ler a decisão' : !fresco && r.ok ? `o orquestrador não gravou recuperacao\\${t.id}-${rec.n}.json neste turno` : r.motivo;
        pause(id, 'erro', `Recuperação da ${t.id} (volta ${rec.voltas}/${max}): ${String(mot || '').replace(/\.+$/, '')}. Veja a aba "${ORQ_NAME}" e clique em Continuar (o Termix pede a decisão de novo).`);
        return 'parar';
      }
      rec.repetido = false;
      rec.decisao = { acao: r.acao, explicacao: r.explicacao, motivo: r.motivo, bloqueia: r.bloqueia, dividir: r.dividir || null };
      rec.tentado = [...(rec.tentado || []), `volta ${rec.voltas}: ${r.acao}${r.motivo ? ` (${r.motivo.slice(0, 160)})` : ''}`];
      rec.fase = 'acao';
      cySave(id);
      return;
    }
    if (rec.fase === 'acao') {
      const dc = rec.decisao || {};
      const reexec = (o = {}) => { // a tarefa volta ao Dev; a execução pedida pela recuperação não gasta tentativa da revisão
        Object.assign(x, { etapa: 'dev', enviadoDev: null, enviadoRev: null, extraRec: (x.extraRec || 0) + 1, manterBase: true, ...o });
        rec.fase = 'conferir';
        cySave(id);
      };
      const falhou = (m) => { rec.tentado = [...(rec.tentado || []), `ação ${dc.acao} falhou: ${m}`]; Object.assign(rec, { fase: 'nova', falha: `a ação ${dc.acao} falhou (${m})` }); cySave(id); };
      const recTxt = { motivo: rec.falha, explicacao: dc.explicacao };
      if (dc.acao === 'pular') { pendencia(id, `pulada pelo orquestrador${dc.motivo ? `: ${dc.motivo}` : ''}`); return alive() ? undefined : 'parar'; }
      if (dc.acao === 'reenviar') return reexec({ refazer: { recuperacao: recTxt } });
      if (dc.acao === 'clear_dev') return reexec({ refazer: null });
      if (dc.acao === 'f5_aba') {
        const okF5 = await f5Aba(id, 'dev', g);
        if (!alive()) return 'parar';
        if (!okF5) return falhou('a aba do Dev não voltou em 60 s');
        return reexec({ refazer: { recuperacao: { ...recTxt, f5: true } }, semClear: true });
      }
      if (dc.acao === 'f5_projeto') {
        rec.f5Projeto = { inicio: nowIso() }; cySave(id);
        const r = await call('f5Projeto', id);
        if (!alive()) return 'parar';
        rec.f5Projeto = r ? { ok: !!r.ok, estado: r.estado || '', motivo: r.motivo || '', log: r.log || '' } : { ok: false, motivo: 'erro ao rodar' };
        if (!r || !r.ok) return falhou((r && r.motivo) || 'erro ao rodar o comando');
        return reexec({ refazer: { recuperacao: recTxt } });
      }
      if (dc.acao === 'dividir') {
        const r = await call('planoDividir', id, t.id, dc.dividir);
        if (!alive()) return 'parar';
        if (!r || !r.ok) return falhou((r && r.motivo) || 'não foi possível dividir o plano');
        const ts = ((await call('tarefas', id)) || []).filter((y) => y.id === `${t.id}.a` || y.id === `${t.id}.b`);
        if (!alive()) return 'parar';
        if (ts.length !== 2) return falhou('as partes não apareceram no plano');
        x.tarefas.splice(x.k, 1, ...ts);
        x.divididas = [...(x.divididas || []), { id: t.id, titulo: t.titulo, partes: ts.map((y) => y.id), data: nowIso() }];
        Object.assign(x, { ...ZERA });
        cySave(id);
        notifyHuman(projOf(id), tabOf(c.est.orq), `${t.id} dividida pelo orquestrador em ${ts.map((y) => y.id).join(' e ')}. O ciclo segue.`);
        return;
      }
      return falhou('ação desconhecida');
    }
    Object.assign(x, { etapa: 'dev' }); cySave(id); // 'conferir' sem execução em andamento: volta ao Dev
  }

  let tick = 0;
  // relógio da execução (zero token): retoma a pausa por limite quando a janela vira e pausa agente sem resposta
  setInterval(() => {
    for (const id of Object.keys(CY)) {
      const c = CY[id], e = c.est, x = e && e.exec;
      if (x && e.fase === 'pausado' && x.pausa && x.pausa.autorizacao && !c.decidindo) { // DEV2-016: o ponto de aprovação é o arquivo
        call('deployAut', id, 'ler').then((a) => { if (a && (a.status === 'autorizado' || a.status === 'negado')) deployDecidir(id, a.status === 'autorizado' ? 'autorizar' : 'negar', (a.decisao && a.decisao.origem) || 'arquivo'); });
        continue;
      }
      if (!x || !c.live) continue;
      if (e.fase === 'pausado' && x.pausa && x.pausa.tipo === 'limite' && !x.pausa.semAuto) {
        if (!c.conferindoTeto) {
          c.conferindoTeto = true;
          tetoDe(id).then((r) => {
            c.conferindoTeto = false;
            const pz = c.live && c.est && c.est.fase === 'pausado' && c.est.exec && c.est.exec.pausa;
            if (!pz || pz.tipo !== 'limite') return;
            if (!r) { continueExec(id, true); return; }
            // outro teto ainda segura (ex.: subiu o de 5 h, mas a janela de 7 d está acima): o motivo à vista acompanha
            if (r.motivo !== pz.motivo) { pz.motivo = r.motivo; if (!r.auto) { pz.semAuto = true; c.live = false; } cySave(id); }
          });
        }
        continue;
      }
      if (e.fase === 'execucao' && c.esperando) {
        const tid = c.esperando.tab;
        // DEV2-015: aba fechada, tempo limite ou silêncio não pausam mais: Dev vai para a recuperação; orquestrador, F5 dele uma vez
        const key = c.esperando.key;
        if (!isAlive(tid)) { falha(id, key, 'A aba do agente fechou no meio da tarefa.'); continue; }
        const last = Math.max(c.esperando.desde, ACT[tid] || 0, (RT[tid] && RT[tid].lastData) || 0);
        const quem = key === 'orq' ? 'O orquestrador' : 'O Dev';
        const min = (ms) => (ms >= 60000 ? `${Math.round(ms / 60000)} min` : `${Math.round(ms / 1000)} s`);
        if (Date.now() - c.esperando.desde > T.turno) falha(id, key, `${quem} não terminou o turno em ${min(T.turno)} (tempo limite); o Termix interrompeu o agente.`, { interromper: tid });
        else if (Date.now() - last > T.semResposta) falha(id, key, `${quem} ficou sem nenhum sinal por ${min(T.semResposta)}; o Termix interrompeu o agente.`, { interromper: tid });
      }
    }
    try { checkPart(); } catch { /* aviso da parte do Mutirão: o cabeçalho nem sempre é redesenhado ao trocar de projeto */ }
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
    const pol = c.pol && c.pol.politica, o = pol ? pol.orcamento : { teto5: 93, teto7: 95, usd: null }, usd = custoCiclo(c);
    let fase;
    if (e.fase === 'concluido') fase = 'Concluído';
    else if (e.fase === 'pausado') fase = x.pausa && x.pausa.autorizacao ? 'Aguardando autorização de deploy' : x.pausa && x.pausa.receita ? 'Deploy: a main foi enviada, a publicação falhou' : PAUSA_TIT[x.pausa && x.pausa.tipo] || 'Pausado';
    else if (e.fase === 'parado') fase = 'Parado';
    else if (!c.live) fase = 'Pausado (o Termix foi fechado)';
    else fase = recTxt(c) || (x.k >= n ? 'Fim do ciclo: handoff (orquestrador)' : x.etapa === 'deploy' ? 'Deploy pelo Termix (portão, main, tag, receita)' : x.etapa === 'revisao' ? 'Revisão (orquestrador)' : 'Dev trabalhando');
    const rows = [
      ['Tarefa', e.fase === 'concluido' ? `${n}/${n}` : t ? `${x.k + 1}/${n} · ${esc(t.id)} — ${esc(t.titulo)}` : `${n}/${n}`],
      ['Fase', esc(fase)],
      ['Branch', esc(x.branch || '—')],
      ['Último commit', esc(x.ultimoCommit || '—')],
      (x.rec && t && x.rec.tarefa === t.id && x.rec.voltas && e.fase !== 'concluido') ? ['Volta', `${x.rec.voltas}/${voltasMax(c)}`] : ['Tentativas', e.fase === 'concluido' || !t ? '—' : `${x.tentativas || 0} de ${maxTent(x)}`], // DEV2-016: durante a recuperação, só a volta
      ['Limites', `5 h ${pctTxt(lim5())} · 7 d ${pctTxt(lim7r())}${usd != null ? ` · US$ ${usd.toFixed(2)}` : ''} <small>(teto: 5 h ${o.teto5}% · 7 d ${o.teto7}%${o.usd != null ? ` · US$ ${o.usd}` : ''})</small>`],
    ];
    if (x.rec && x.rec.tarefa === (t && t.id) && e.fase !== 'concluido') rows.push(['Recuperação', `${esc(recTxt(c) || '')}${x.rec.diag ? `<small class="vx-sub">${abrirLink(x.rec.diag, 'Abrir diagnóstico')}</small>` : ''}${x.rec.tentado && x.rec.tentado.length ? `<small class="vx-sub">Já tentado: ${esc(x.rec.tentado.slice(-4).join(' · ').slice(0, 400))}</small>` : ''}`]);
    if (x.ultimaRevisao) rows.push(['Última revisão', `${esc(x.ultimaRevisao.id)}: ${esc(x.ultimaRevisao.veredito)}${x.ultimaRevisao.motivo ? ` — ${esc(x.ultimaRevisao.motivo.slice(0, 160))}` : ''}`]);
    const feita = (id) => x.feitas.find((f) => f.id === id);
    const pends = x.pendencias || [];
    const list = x.tarefas.map((tt, i) => {
      const f = feita(tt.id), pd = pends.find((y) => y.id === tt.id);
      if (pd && !f) return `<li class="pend">${esc(tt.id)} — ${esc(tt.titulo)} <em class="vx-tag vx-pend">PENDÊNCIA</em></li>`;
      const cls = f ? 'done' : i === x.k && e.fase !== 'concluido' ? 'cur' : '';
      const tags = `${tt.deploy ? ' <em class="vx-tag">DEPLOY</em>' : ''}${tt.humano ? ' <em class="vx-tag">HUMANO</em>' : ''}${tt.semCommit ? ' <em class="vx-tag">SEM COMMIT</em>' : ''}`;
      const extra = f ? (f.deploy === 'feito' ? ` · publicado pelo Termix${f.tag ? ` (${esc(f.tag)})` : ''}${f.receitaFalhou ? ', receita falhou' : ''}` : f.deploy === 'nada' ? ' · nada novo a publicar' : f.deploy === 'pendente' ? ' · deploy pendente' : f.deploy === 'retido' ? ' · deploy retido (Pausar deploy)' : f.humano ? ' · feita pelo humano' : f.semCommit ? ' · validada, sem commit' : f.commit ? ` · ${esc(f.commit.split(' ')[0])}` : '') : '';
      return `<li class="${cls}">${esc(tt.id)} — ${esc(tt.titulo)}${tags}<small>${extra}</small></li>`;
    }).join('');
    // DEV2-015: pendências (tarefas puladas ou com as voltas esgotadas), uma por tarefa, com o motivo e o diagnóstico
    const pendHtml = pends.length ? `<div class="vx-pends"><b>${e.fase === 'concluido' ? 'Pendências do ciclo' : 'Pendências até agora'} (${pends.length})</b><ul>${pends.map((y) => `<li><b>${esc(y.id)} — ${esc(y.titulo)}</b>: ${esc(y.motivo)}${y.bloqueia ? ' <em class="vx-tag">BLOQUEIA AS PRÓXIMAS</em>' : ''}${y.diag ? `<small>${abrirLink(y.diag, 'Abrir diagnóstico')}</small>` : ''}</li>`).join('')}</ul></div>` : '';
    const divHtml = (x.divididas || []).length ? `<small class="vx-div">Divididas na recuperação: ${x.divididas.map((y) => `${esc(y.id)} em ${esc(y.partes.join(' e '))}`).join('; ')}</small>` : '';
    return `<div class="vx"><dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>${autHtml(c)}<ol class="vx-list">${list}</ol>${divHtml}${pendHtml}${depHtml(c)}</div>`;
  }
  // DEV2-016: link que abre um arquivo do Vibe (diagnóstico, log de deploy) no programa padrão
  const abrirLink = (arq, txt) => `<a href="#" class="vx-link" data-vc="abrir" data-arq="${esc(arq)}" title="${esc(arq)}">${esc(txt)}</a>`;
  // DEV2-016: resumo do pedido de autorização (commits que entram, portão, receita)
  function autHtml(c) {
    const x = c.est && c.est.exec, a = x && x.pausa && x.pausa.autorizacao;
    if (!a || c.est.fase !== 'pausado') return '';
    const r = a.resumo;
    const corpo = r ? `<small>${esc(r.branch)} para a ${esc(r.principal)} (${esc(r.modo)}) · portão: ${esc(r.portao || 'nenhum')} · receita: ${esc(r.receita.length ? r.receita.join(' · ') : 'nenhuma')}</small><ul>${r.commits.slice(0, 12).map((l) => `<li>${esc(l)}</li>`).join('')}${r.commits.length > 12 ? `<li>… e mais ${r.commits.length - 12}</li>` : ''}</ul>` : '<small>O resumo não pôde ser montado.</small>';
    return `<div class="vx-aut"><b>Deploy aguardando a sua autorização (${esc(a.tarefa)})</b>${corpo}</div>`;
  }
  // DEV2-016: lista de deploys (versões) com "Voltar para antes deste", a confirmação explícita e "Rodar a receita de novo"
  function depHtml(c) {
    const pode = c.pol && c.pol.info && c.pol.info.podeDeploy, deps = c.deps || [];
    if (!pode || (!deps.length && !c.depMsg)) return '';
    const dt = (d) => { try { return new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); } catch { return d; } };
    const st = (d) => (d.status === 'receita-falhou' ? 'main enviada, receita falhou' : d.status === 'publicado' ? 'publicado' : d.status);
    const lis = deps.map((d) => `<li class="${d.revertido ? 'rev' : ''}"><b>${esc(d.tag)}</b> · ${esc(dt(d.data))} · ${d.tipo === 'ff' ? 'fast-forward' : 'merge --no-ff'} · ${plural(d.commits, 'commit', 'commits')} · ${esc(st(d))}${d.revertido ? ' <em class="vx-tag">REVERTIDO</em>' : ''}<span class="vx-dacts">${!d.revertido ? `<button class="btn sm" data-vc="depvolta" data-tag="${esc(d.tag)}">Voltar para antes deste</button>` : ''}${d.status === 'receita-falhou' && !d.revertido ? `<button class="btn sm" data-vc="deprec" data-tag="${esc(d.tag)}">Rodar a receita de novo</button>` : ''}${d.log ? abrirLink(d.log, 'Abrir log') : ''}</span></li>`).join('');
    let conf = '';
    if (c.voltaConf) {
      const k = deps.filter((d) => !d.revertido).findIndex((d) => d.tag === c.voltaConf);
      conf = `<div class="vx-conf"><b>Voltar a main para antes de ${esc(c.voltaConf)}?</b> O Termix faz git revert de ${plural(k + 1, 'deploy', 'deploys')} (do mais novo até este) na main e envia a main, sem força. Nada é apagado; a tag continua no histórico.${c.pol.info.fluxo ? ` Depois, a main é juntada na ${esc(c.pol.info.papel === 'DEV1' ? 'dev1' : 'branch de trabalho')} (merge --no-ff), para ela também ter o revert.` : ''} <span class="vx-dacts"><button class="btn sm pri" data-vc="depvoltaok">Confirmar: voltar versão</button><button class="btn sm" data-vc="depvoltano">Cancelar</button></span></div>`;
    } else if (c.voltaFeita) conf = `<div class="vx-conf">Versão voltada. Rodar a receita de deploy de novo agora, com a main revertida? <span class="vx-dacts"><button class="btn sm pri" data-vc="deprecvolta">Rodar a receita</button><button class="btn sm" data-vc="depvoltafim">Agora não</button></span></div>`;
    const rr = deps.some((d) => d.revertido) ? '<small class="vx-sub">Para trazer de volta o que foi revertido, é preciso "reverter o revert" (git revert do commit de revert); só juntar a branch de novo não traz.</small>' : '';
    return `<div class="vx-deps"><b>Deploys (versões)</b>${c.depMsg ? `<small class="vx-sub">${esc(c.depMsg)}</small>` : ''}${lis ? `<ul>${lis}</ul>` : ''}${rr}${conf}</div>`;
  }
  // DEV2-015: "Recuperando (volta n/3): <ação>" enquanto a tarefa atual está numa volta de recuperação
  function recTxt(c) {
    const x = c && c.est && c.est.exec, r = x && x.rec, t = x && x.tarefas[x.k];
    if (!r || !t || r.tarefa !== t.id || !r.voltas) return '';
    const acao = r.fase === 'pedido' ? 'aguardando a decisão do orquestrador' : r.decisao ? REC_TXT[r.decisao.acao] || r.decisao.acao : 'diagnóstico';
    return `Recuperando (volta ${r.voltas}/${voltasMax(c)}): ${acao}`;
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
      execucao: x ? (recTxt(c) ? `<b>${esc(recTxt(c))}.</b> A ${esc((x.tarefas[x.k] || {}).id || '')} falhou e o Termix está recuperando sozinho (diagnóstico e decisão do orquestrador). Esgotadas as voltas, ela vira pendência e o ciclo segue.` : `<b>Executando o plano.</b> ${x.k >= x.tarefas.length ? 'O orquestrador está escrevendo o handoff do fim do ciclo' : x.etapa === 'deploy' ? 'O Termix está fazendo o deploy (portão, main, tag e receita)' : x.etapa === 'revisao' ? 'O orquestrador está revisando' : 'O Dev está trabalhando'}${x.k < x.tarefas.length ? ` na ${esc((x.tarefas[x.k] || {}).id || '')}` : ''}. O Termix avisa se precisar de você.`) : '',
      pausado: x && x.pausa ? `<b>${esc(x.pausa.autorizacao ? 'Aguardando autorização de deploy' : x.pausa.receita ? 'Deploy: a main foi enviada, a publicação falhou' : PAUSA_TIT[x.pausa.tipo] || 'Pausado')}.</b> ${esc(x.pausa.motivo || '')}${x.pausa.autorizacao || x.pausa.receita || (x.pausa.tipo === 'limite' && c.live) || /clique em "?Continuar/i.test(x.pausa.motivo || '') ? '' : x.pausa.gate ? ' Clique em "Continuar" para o Dev executar a tarefa, ou em "Já fiz, pular" se você mesmo a fez.' : ' Clique em "Continuar" quando quiser seguir.'}` : '',
      concluido: (e.auto && e.auto.mutirao && e.mutFim ? (e.mutFim.ok ? `<b>Mutirão concluído na ${esc(e.mutFim.branch || '')}.</b> Push feito pelo Termix (commit ${esc(String(e.mutFim.sha || '').slice(0, 8))}). Promover para a main é com você. ` : `<span class="mp-bad">O push da branch do dono falhou: ${esc(e.mutFim.motivo || '')}</span> `) : '') + (x ? `<b>${e.tarefa ? 'Tarefa concluída' : 'Projeto concluído'}.</b> ${plural(x.feitas.length, 'tarefa feita', 'tarefas feitas')} na branch "${esc(x.branch || '')}"${x.feitas.some((f) => f.humano) ? `, ${x.feitas.filter((f) => f.humano).length} pelo humano` : ''}${(x.pendencias || []).length ? `, ${plural(x.pendencias.length, 'pendência', 'pendências')} (lista abaixo)` : ''}.${x.feitas.some((f) => f.deploy === 'feito') ? ' A main recebeu o deploy pelo Termix (lista de deploys abaixo).' : ' A main/master não foi alterada.'}${x.fimHandoff && x.fimHandoff.aplica ? (x.fimHandoff.ok ? ` ${esc(x.fimHandoff.arquivo)} no commit e a ${esc(x.fimHandoff.branch)} enviada; o DEV1 é avisado pelo fluxo.` : ` <span class="mp-bad">O envio da ${esc(x.fimHandoff.branch || '')} com o handoff falhou: ${esc(x.fimHandoff.motivo || '')}</span>`) : ''}` : '<b>Projeto concluído.</b>') + (e.mutirao ? (e.mutirao.ok ? ` Entrega do Mutirão enviada na branch ${esc(e.mutirao.branch || '')}.` : ` <span class="mp-bad">Entrega do Mutirão não enviada: ${esc(e.mutirao.motivo || '')}</span>`) : ''),
      parado: `<b>Vibe Coding parado em "${esc(stepName)}".</b> Nada foi apagado e as abas continuam abertas. Clique em "${go}" para seguir.`,
      erro: `<b>O plano não ficou pronto.</b>`,
    }[e.fase] || '';
    const acts = [];
    if (e.fase === 'abrindo' && e.aviso && c.live) acts.push('<button class="btn sm" data-vc="send">Enviar o pedido agora</button>');
    if (e.fase === 'pronto' && !(c.form && c.form.modo === 'iniciar')) acts.push('<button class="btn sm pri" data-vc="antes">Executar plano…</button>'); // DEV2-014: antes, a tela "Antes de iniciar"
    if (e.fase === 'concluido' && e.mutFim && !e.mutFim.ok) acts.push('<button class="btn sm pri" data-vc="mutfim">Enviar a branch de novo</button>');
    if (e.fase === 'concluido' && x && x.fimHandoff && x.fimHandoff.aplica && !x.fimHandoff.ok) acts.push('<button class="btn sm pri" data-vc="fimenv">Enviar a branch e o handoff de novo</button>'); // DEV2-016
    const pzD = e.fase === 'pausado' && x && x.pausa; // DEV2-016: autorização e receita que falhou depois do envio
    if (pzD && pzD.autorizacao) acts.push('<button class="btn sm pri" data-vc="depok">Autorizar deploy</button><button class="btn sm" data-vc="depno">Negar</button>');
    if (pzD && pzD.receita) acts.push(`<button class="btn sm pri" data-vc="deprec" data-tag="${esc(pzD.receita)}">Rodar a receita de novo</button><button class="btn sm" data-vc="depvolta" data-tag="${esc(pzD.receita)}">Voltar versão</button><button class="btn sm" data-vc="depseguir">Seguir sem publicar</button>`);
    if (e.fase === 'concluido' && e.mutirao && !e.mutirao.ok) acts.push('<button class="btn sm pri" data-vc="mutent">Enviar a entrega de novo</button>');
    if (paused || ['parado', 'erro'].includes(e.fase) || (e.fase === 'pausado' && !(x && x.pausa && ((x.pausa.tipo === 'limite' && c.live) || x.pausa.autorizacao || x.pausa.receita)))) acts.push(`<button class="btn sm pri" data-vc="resume">${go}</button>`);
    if (e.fase === 'pausado' && x && x.pausa && x.pausa.gate && !x.pausa.sempre) acts.push('<button class="btn sm" data-vc="skip">Já fiz, pular</button>');
    if (ACTIVE.includes(e.fase) || ['erro', 'pronto', 'pausado'].includes(e.fase)) acts.push('<button class="btn sm" data-vc="stop">Parar Vibe Coding</button>');
    const tip = TIPS[base] ? `<p class="vibe-tip">${esc(TIPS[base])}</p>` : '';
    const polBar = polBarHtml(c, e); // DEV2-014: política em uma linha, "Editar" e "Pausar deploy" sempre à vista
    const plan = c.plano ? `<details class="vc-plan" ${e.fase === 'pronto' ? 'open' : ''}><summary>Ver o plano (plano.md${c.plano.tarefas ? `, ${plural(c.plano.tarefas, 'tarefa', 'tarefas')}` : ''})</summary><div class="vc-md">${mdLite(c.plano.text)}</div></details>` : '';
    return `<div class="vc ${e.fase} ${paused ? 'paused' : ''}">
      <div class="vc-hd"><b>Andamento</b><ol class="vc-steps">${steps}</ol></div>
      <div class="vc-line">${line}</div>
      ${e.aviso ? `<div class="vc-aviso">${esc(e.aviso)}</div>` : ''}
      ${polBar}
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
    const hb = V.root.querySelector('#vtHist'); // DEV2-017: tarefa atual e anteriores
    if (hb) hb.innerHTML = tarHistHtml(V.id);
    paint();
  }

  /* ---------- política de autonomia (DEV2-014) ----------
     Tela "Antes de iniciar" entre "Plano pronto" e "Executar plano": três modelos prontos e ajustes finos por cima. A política
     fica em vibe\<id>\politica.json (processo principal, src/vibe/politica.js, que é quem decide) e pode ser editada no meio
     do ciclo, no painel, sem parar nada: vale a partir da próxima tarefa; o teto e "Pausar deploy" valem na hora. O formulário
     fica em #vpPanel, fora do #vcPanel, para o redesenho periódico do andamento não apagar o que está sendo digitado. */
  const DEPLOY_TXT = { nunca: 'Nunca', pedir: 'Pedir autorização', marco: 'Automático a partir de um marco', sempre: 'Sempre automático' };
  const HUM_TXT = { indispensavel: 'Só o indispensável', produto: 'Também em decisões de produto', sempre: 'Sempre (antes de cada tarefa)' };
  const IA_TXT = { '': 'Padrão do Claude Code', opus: 'Opus', sonnet: 'Sonnet', haiku: 'Haiku' };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  function polBarHtml(c, e) {
    const P = c.pol;
    if (!P || !e || ['abrindo', 'plano', 'perguntas', 'fechando', 'erro'].includes(e.fase)) return '';
    const pol = P.politica, pode = P.info && P.info.podeDeploy;
    const pausado = pode && pol.deploy.pausado;
    const btns = [];
    if (!(c.form && c.form.modo)) btns.push('<button class="btn sm" data-vc="poledit">Editar política</button>');
    if (pode) btns.push(pausado ? '<button class="btn sm pri" data-vc="deployresume">Retomar deploy</button>' : '<button class="btn sm vp-stop" data-vc="deploypause" title="Corta na hora qualquer deploy automático; o resto do ciclo continua">Pausar deploy</button>');
    return `<div class="vp-bar ${pausado ? 'pausado' : ''}"><div><b>Política${P.existe ? '' : ' (padrão)'}:</b> ${esc(P.resumo || '')}${c.polMsg ? `<small>${esc(c.polMsg)}</small>` : ''}</div><div class="vp-btns">${btns.join('')}</div></div>`;
  }
  function polFormHtml(id) {
    const c = CY[id], F = c && c.form;
    if (!F || !c.pol) return '';
    const p = F.p, inf = c.pol.info || {}, pode = !!inf.podeDeploy;
    const rad = (name, field, val, cur, label, sub) => `<label class="vp-opt ${cur === val ? 'sel' : ''}"><input type="radio" name="${name}" data-vpf="${field}" value="${esc(val)}" ${cur === val ? 'checked' : ''}><span><b>${esc(label)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span></label>`;
    const modelos = (c.pol.prontos || []).map((m) => rad('vpModelo', 'modelo', m.id, p.modelo, `${m.titulo}${m.id === 'branch' ? ' (padrão)' : ''}`, m.resumo)).join('');
    const sel = (field, opts, cur) => `<select class="inp" data-vpf="${field}">${Object.entries(opts).map(([v, l]) => `<option value="${esc(v)}" ${cur === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    const o = p.orcamento, rc = p.recuperacao || { voltas: 3, f5Projeto: '' };
    const deploy = pode ? `
      <div class="vf"><label>Deploy na main</label>${sel('deploy.modo', DEPLOY_TXT, p.deploy.modo)}
        ${p.deploy.modo === 'marco' ? `<input type="text" class="inp vp-gap" data-vpf="deploy.marco" maxlength="200" placeholder="Marco, em texto livre. Ex.: v1.0 estável" value="${esc(p.deploy.marco)}">
        <label class="vf-chk"><input type="checkbox" data-vpf="deploy.marcoAtingido" ${p.deploy.marcoAtingido ? 'checked' : ''}> Marco atingido: a partir de agora o deploy é automático</label>` : ''}
        <small>O deploy é feito pelo Termix, em código, nunca pelo agente (a trava continua barrando a main para a IA). Voltar versão: git revert. O Termix faz o deploy: confere a árvore, roda o portão, leva a branch para a main (fast-forward ou merge --no-ff), cria a tag, envia sem força e roda a receita. A lista de versões no painel tem "Voltar para antes deste".</small></div>
      <div class="vf"><label>Receita de deploy <em class="opt">os comandos que o Termix vai rodar</em></label>
        <textarea class="inp ta" rows="3" data-vpf="deploy.receita" maxlength="4000" placeholder="Um comando por linha. Ex.: npm run build">${esc(p.deploy.receita)}</textarea>
        <small>Só fica gravada: nada é executado agora.</small></div>
      <div class="vf"><label>Portão de qualidade <em class="opt">precisa passar antes de qualquer deploy</em></label>
        <input type="text" class="inp" data-vpf="portao" maxlength="500" placeholder="${esc(inf.validacao || 'Ex.: npm test')}" value="${esc(p.portao)}">
        ${inf.validacao ? `<small>Sugestão do .claude/fluxo.json: <code>${esc(inf.validacao)}</code></small>` : ''}
        ${['sempre', 'marco'].includes(p.deploy.modo) ? `<small class="vp-obg${String(p.portao || '').trim() ? '' : ' bad'}">Obrigatório com o deploy "Sempre" ou "Marco": sem o portão, a política não é gravada.</small>` : ''}</div>`
      : `<div class="vibe-note"><b>Fim do ciclo:</b> enviar a sua branch e o handoff. ${esc(inf.motivo || 'O deploy na main é do DEV1.')}</div>`;
    const tit = F.modo === 'iniciar' ? 'Antes de iniciar a produção autônoma' : 'Editar a política (vale a partir da próxima tarefa)';
    const go = F.modo === 'iniciar' ? 'Iniciar a produção autônoma' : 'Salvar a política';
    return `<div class="vp-form" id="vpForm">
      <div class="vp-hd"><b>${tit}</b>${p.ajustado ? '<em class="vx-tag">AJUSTADO</em>' : ''}</div>
      <p class="vp-sub">Escolha um modelo pronto e ajuste o que quiser. Fica gravado neste projeto e pode ser editado no meio do ciclo, sem parar nada.</p>
      <div class="vf"><label>Modelo</label><div class="vp-opts">${modelos}</div></div>
      ${deploy}
      <div class="vf"><label>Orçamento <em class="opt">ao atingir o teto, o ciclo pausa e avisa</em></label>
        <div class="vp-row"><label>Janela de 5 h <input type="number" class="inp" data-vpf="orcamento.teto5" min="1" max="100" value="${o.teto5}"> %</label>
        <label>Janela de 7 d <input type="number" class="inp" data-vpf="orcamento.teto7" min="1" max="100" value="${o.teto7}"> %</label>
        <label>US$ <input type="number" class="inp" data-vpf="orcamento.usd" min="0" step="0.5" placeholder="sem teto" value="${o.usd == null ? '' : o.usd}"></label></div>
        <small>US$ = custo equivalente do ciclo pela tabela da API (status line das abas do Vibe); opcional.</small></div>
      <div class="vf"><label>Modelo por papel</label>
        <div class="vp-row"><label>Orquestrador ${sel('modelos.orq', IA_TXT, p.modelos.orq)}</label><label>Dev ${sel('modelos.dev', IA_TXT, p.modelos.dev)}</label></div>
        <small>Vai no settings da aba do agente (o mesmo da trava) e vale quando a aba abre. No meio do ciclo, vale na próxima vez que a aba for aberta.</small></div>
      <div class="vf"><label>Quando chamar você</label><div class="vp-opts">${Object.entries(HUM_TXT).map(([v, l]) => rad('vpHum', 'humano', v, p.humano, l)).join('')}</div>
        <small>[HUMANO] sempre pausa (o indispensável). "Decisões de produto" vale para as perguntas do próximo plano.</small></div>
      <div class="vf"><label>Recuperação de erro <em class="opt">quando o Dev erra, estoura o tempo ou fica sem sinal</em></label>
        <div class="vp-row"><label>Voltas do orquestrador por tarefa <input type="number" class="inp" data-vpf="recuperacao.voltas" min="0" max="5" value="${rc.voltas}"></label></div>
        <small>Em cada volta, o Termix grava um diagnóstico e o orquestrador escolhe uma ação: reenviar ao Dev, /clear no Dev, F5 da aba, F5 do projeto, dividir a tarefa ou pular. Esgotadas as voltas, a tarefa vira pendência, o Termix avisa e o ciclo segue. As voltas contam no orçamento.</small></div>
      <div class="vf"><label>Comando para reiniciar o projeto (F5 do projeto) <em class="opt">opcional</em></label>
        <input type="text" class="inp" data-vpf="recuperacao.f5Projeto" maxlength="500" placeholder="Ex.: npm run dev (sobe de novo o servidor de desenvolvimento)" value="${esc(rc.f5Projeto)}">
        <small>Roda na pasta do projeto, só quando o orquestrador pedir, e passa antes pela trava (comandos proibidos e troca de pasta são recusados).</small></div>
      ${F.err ? `<div class="vf-prob">${esc(F.err)}</div>` : ''}
      <div class="vibe-confirm"><button class="btn sm" data-vp="cancelar">Voltar</button><button class="btn sm pri" data-vp="salvar">${go}</button></div>
    </div>`;
  }
  function polPaint(id) {
    if (!V || !V.root || !V.root.isConnected || V.id !== id) return;
    const box = V.root.querySelector('#vpPanel');
    if (box) box.innerHTML = polFormHtml(id);
    paintCycle();
  }
  // DOM -> rascunho (sem redesenhar: quem digita não perde o foco)
  function polRead(id) {
    const c = CY[id], F = c && c.form;
    if (!F || !V || !V.root) return null;
    for (const el of V.root.querySelectorAll('#vpPanel [data-vpf]')) {
      if (el.type === 'radio' && !el.checked) continue;
      const [a, b] = el.dataset.vpf.split('.');
      let v = el.type === 'checkbox' ? el.checked : el.value;
      if (el.type === 'number') v = el.value === '' ? null : Number(el.value);
      if (b) F.p[a] = { ...(F.p[a] || {}), [b]: v }; else F.p[a] = v;
    }
    return F.p;
  }
  async function polOpen(id, modo) {
    const c = cyOf(id);
    c.pol = (await call('politicaGet', id)) || c.pol;
    if (!c.pol) return;
    c.form = { modo, p: clone(c.pol.politica), err: '' };
    c.polMsg = '';
    polPaint(id);
    try { V.root.querySelector('#vpForm').scrollIntoView({ block: 'start' }); } catch { /* sem rolagem */ }
  }
  async function polChange(id, el) {
    const c = CY[id];
    if (!c || !c.form) return;
    polRead(id);
    const f = el.dataset.vpf;
    // modelo pronto: aplica por cima; deploy/humano: recalcula o "ajustado" e mostra o campo do marco
    if (['modelo', 'deploy.modo', 'humano'].includes(f)) {
      const r = await call('politicaModelo', id, c.form.p, f === 'modelo' ? el.value : '');
      if (r && r.politica) c.form.p = r.politica;
      polPaint(id);
    }
  }
  async function polAct(id, k) {
    const c = CY[id];
    if (!c || !c.form) return;
    if (k === 'cancelar') { c.form = null; polPaint(id); return; }
    if (k !== 'salvar') return;
    polRead(id);
    const modo = c.form.modo;
    const r = await call('politicaSet', id, c.form.p, modo === 'iniciar' ? 'antes de iniciar' : 'edição no painel');
    if (!r || !r.ok) { c.form.err = (r && r.problema) || 'Não foi possível gravar a política. Veja o erros.log.'; polPaint(id); return false; }
    c.pol = (await call('politicaGet', id)) || c.pol;
    c.form = null;
    c.polMsg = modo === 'iniciar' ? '' : `Salva às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}: vale a partir da próxima tarefa.`;
    polPaint(id);
    if (modo === 'iniciar') return execStart(id);
    return true;
  }
  // "Pausar deploy": grava na hora e não para o resto do ciclo
  async function polPausarDeploy(id, pausado) {
    const c = cyOf(id);
    const r = await call('politicaPausarDeploy', id, pausado);
    c.pol = (await call('politicaGet', id)) || c.pol;
    c.polMsg = r && r.ok ? (pausado ? 'Deploy pausado: nenhum deploy automático sai; o resto do ciclo continua.' : 'Deploy retomado: vale a partir da próxima tarefa de deploy.') : 'Não foi possível gravar. Veja o erros.log.';
    if (c.form && c.form.p) c.form.p.deploy = { ...c.form.p.deploy, pausado: !!pausado };
    // DEV2-016: "Retomar deploy" executa os retidos e os pendentes da DEV2-014 (com um agente trabalhando, na fronteira da tarefa)
    const x = c.est && c.est.exec;
    if (r && r.ok && !pausado && x && x.feitas.some((f) => f.deploy === 'retido' || f.deploy === 'pendente')) {
      if (c.est.fase === 'execucao' && c.live) { x.deployFila = true; c.polMsg = 'Deploy retomado: os deploys retidos saem assim que a tarefa atual terminar.'; cySave(id); } else deployRetidos(id);
    }
    paintCycle();
    return !!(r && r.ok);
  }

  /* ---------- tela de entrega do Vibe Coding (DEV2-002) ---------- */
  const LIM_OBJ = 300;
  const EMPTY = () => ({ objetivo: '', criterio: '', proibido: '', acessos: '', nadaFornecer: false, fluxo: '', estrutura: '' });
  let V = null; // estado da tela aberta: { root, id, f, fx: { fluxo, estrutura }, entrega, timer, msg }

  const projects = () => { try { return S.projects.filter((p) => !p.archived); } catch { return []; } };
  const projOf = (id) => projects().find((p) => p.id === id);
  const fmtDate = (iso) => { try { return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); } catch { return iso || ''; } };

  /* ---------- Vibe de tarefa (DEV2-017) ----------
     Escolha inicial: "Projeto novo (entrega completa)" ou "Tarefa num projeto em andamento". A tarefa tem 4 campos; o Termix
     monta a entrega sintética com um resumo do projeto lido sem IA (src/vibe/tarefa.js) e o ciclo é o mesmo do Vibe.
     Tarefas seguidas no mesmo projeto reaproveitam as abas do orquestrador e do Dev (com /clear) e ficam no histórico. */
  const EMPTY_T = () => ({ oQue: '', criterio: '', naoPode: '', arquivos: '' });
  const LIM_T = { oQue: 4000, criterio: 2000, naoPode: 2000, arquivos: 2000 };
  function missingT() {
    const t = V.t, out = [];
    if (!V.id) out.push('Escolha o projeto (item 1).');
    if (!t.oQue.trim()) out.push('Descreva o que fazer (item 2).');
    if (!t.criterio.trim()) out.push('Escreva o critério de pronto da tarefa (item 3).');
    for (const [k, n] of Object.entries(LIM_T)) if (t[k].length > n) out.push(`Encurte o campo para até ${n} caracteres.`);
    if (V.id && V.res === false) out.push('A pasta do projeto não foi encontrada.');
    else if (V.id && V.res && !V.res.git) out.push('O projeto não tem git: o Vibe de tarefa é para projeto em andamento. Rode "git init" e faça um primeiro commit, ou use "Projeto novo".');
    return out;
  }
  function choiceHtml() {
    return `<div class="vibe-form">
      <p>Como você quer usar o Vibe Coding?</p>
      <div class="vt-choice">
        <button class="vt-opt" data-vmodo="projeto"><b>Projeto novo (entrega completa)</b><small>Para começar um projeto do zero: objetivo, fluxo desenhado, estrutura (.md), critério de pronto e acessos. O orquestrador planeja o projeto inteiro.</small></button>
        <button class="vt-opt" data-vmodo="tarefa"><b>Tarefa num projeto em andamento</b><small>Descreva só a tarefa. O Termix lê um resumo do projeto (sem IA) e o orquestrador planeja poucas tarefas a partir do repositório. Mesmo painel: política, recuperação, deploy, Parar e Continuar.</small></button>
      </div>
    </div>`;
  }
  const ST_T = { andamento: 'EM ANDAMENTO', concluida: 'CONCLUÍDA', interrompida: 'INTERROMPIDA' };
  function tarHistHtml(id) {
    const hs = (CY[id] && CY[id].hist) || [];
    if (!hs.length) return '';
    const atual = hs[0].status === 'andamento' ? hs[0] : null, ants = atual ? hs.slice(1) : hs;
    const li = (h) => `<li class="${h.status}"><b>Tarefa ${h.n}</b> — ${esc(String(h.oQue || '').split('\n')[0].slice(0, 140))} <em class="vx-tag vt-${h.status}">${ST_T[h.status] || esc(h.status)}</em><small>${esc(fmtDate(h.iniciada))}${h.status !== 'andamento' ? ` · ${plural((h.feitas || []).length, 'feita', 'feitas')}${h.branch ? ` na ${esc(h.branch)}` : ''}${(h.feitas || []).length ? `: ${esc(h.feitas.map((x) => x.commit ? x.commit.split(' ')[0] : x.id).join(', ').slice(0, 200))}` : ''}` : ''}</small>${(h.pendencias || []).length ? `<small class="vt-pend">Pendências: ${esc(h.pendencias.map((p) => `${p.id} — ${p.motivo}`).join('; ').slice(0, 400))}</small>` : ''}</li>`;
    return `${atual ? `<div class="vibe-note vt-atual"><b>Tarefa atual (${atual.n}):</b> ${esc(String(atual.oQue).slice(0, 300))}<small>Critério de pronto: ${esc(String(atual.criterio || '').slice(0, 200))}</small></div>` : ''}${ants.length ? `<div class="vt-hist"><b>Tarefas anteriores (${ants.length})</b><ul>${ants.map(li).join('')}</ul></div>` : ''}`;
  }
  function resumoHtml() {
    const r = V.res;
    if (!V.id) return '';
    if (r == null) return '<small class="vt-res">Lendo o projeto…</small>';
    if (r === false) return '<small class="vt-res">A pasta do projeto não foi encontrada.</small>';
    const linhas = [`Branch atual: <b>${esc(r.branch || '(sem git)')}</b> · os agentes trabalham na <b>${esc(r.branchTrabalho || 'branch do papel')}</b>${r.fluxo ? ` · fluxo Rocruzta, papel <b>${esc(r.papel || 'não definido')}</b>` : ''}`,
      r.commits.length ? `Últimos commits: ${esc(r.commits.slice(0, 3).join(' · '))}` : '',
      `Lidos: ${[r.readme && r.readme.arquivo, r.claude && r.claude.arquivo, r.andamento && `${r.andamento.arquivo} (em andamento)`].filter(Boolean).map(esc).join(', ') || 'nenhum README, CLAUDE.md ou TASKS'}`].filter(Boolean);
    return `<details class="vf-det vt-res"><summary>Resumo do projeto que vai para o orquestrador (lido pelo Termix, sem IA)</summary><div class="vt-res-box">${linhas.map((l) => `<div>${l}</div>`).join('')}${r.andamento ? `<pre>${esc(r.andamento.texto.slice(0, 800))}</pre>` : ''}</div></details>`;
  }
  function tarefaBody() {
    const ps = projects(), t = V.t, dis = V.id ? '' : 'disabled';
    const c = V.id && CY[V.id], ativo = cycleActive(V.id);
    return `<div class="vibe-form">
      <p>Descreva a tarefa. O Termix monta a entrega com um resumo do projeto e cria (ou reaproveita) o orquestrador e o dev, que trabalham sozinhos até o fim da tarefa. <a href="#" class="vx-link" data-vmodo="">Trocar o tipo</a></p>
      <p class="vibe-tip">Cite os arquivos ou telas: o orquestrador lê só o necessário e gasta menos tokens.</p>
      ${V.mut ? `<div class="vibe-note">Tarefa pré-preenchida pela sua <b>tarefa do Mutirão</b> (branch ${esc(V.mut)}). Confira e inicie. Os agentes trabalham só na branch ${esc(V.mut)} e, ao concluir, o Termix envia a entrega.</div>` : ''}
      <div class="vf"><label for="vfProj">1. Projeto <em>obrigatório</em></label>
        <select class="inp" id="vfProj">${ps.length ? '' : '<option value="">Nenhum projeto no Termix. Crie um projeto antes.</option>'}${ps.length ? `<option value="" ${V.id ? '' : 'selected'}>Escolha o projeto…</option>` : ''}${ps.map((p) => `<option value="${esc(p.id)}" ${p.id === V.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
      <div id="vtHist">${V.id ? tarHistHtml(V.id) : ''}</div>
      <div id="vcPanel">${V.id ? cycleHtml(V.id) : ''}</div>
      <div id="vpPanel">${V.id ? polFormHtml(V.id) : ''}</div>
      <details class="vf-det" ${ativo || (c && c.est && c.est.fase !== 'concluido') ? '' : 'open'}><summary>${c && c.hist && c.hist.length ? 'Nova tarefa' : 'Tarefa'} (itens 2 a 5)</summary>
      ${resumoHtml()}
      <div class="vf"><label for="vtOq">2. O que fazer <em>obrigatório</em></label>
        <textarea class="inp ta" id="vtOq" rows="3" maxlength="${LIM_T.oQue}" placeholder="Ex.: na tela do carrinho, um botão para remover um item." ${dis}>${esc(t.oQue)}</textarea></div>
      <div class="vf"><label for="vtCrit">3. Critério de pronto <em>obrigatório</em></label>
        <textarea class="inp ta" id="vtCrit" rows="2" maxlength="${LIM_T.criterio}" placeholder="Como saber que acabou? Ex.: clicar em remover tira o item e o total é atualizado." ${dis}>${esc(t.criterio)}</textarea></div>
      <div class="vf"><label for="vtNao">4. O que não pode <em class="opt">opcional</em></label>
        <textarea class="inp ta" id="vtNao" rows="2" maxlength="${LIM_T.naoPode}" placeholder="Ex.: não mexer no catálogo; não trocar bibliotecas." ${dis}>${esc(t.naoPode)}</textarea></div>
      <div class="vf"><label for="vtArq">5. Arquivos ou telas envolvidos <em class="opt">opcional</em></label>
        <textarea class="inp ta" id="vtArq" rows="2" maxlength="${LIM_T.arquivos}" placeholder="Ex.: src/carrinho.js; tela Carrinho." ${dis}>${esc(t.arquivos)}</textarea></div>
      </details>
      <div class="vibe-miss" id="vfMiss"></div>
      <div class="vibe-msg" id="vfMsg"></div>
    </div>`;
  }
  async function loadResumo() {
    const id = V && V.id, p = id && projOf(id);
    if (!p) return;
    V.res = null;
    const r = await call('tarefaResumo', p.path);
    if (!V || V.id !== id) return;
    V.res = r || false;
    const d = V.root && V.root.querySelector('.vt-res');
    if (d && V.modo === 'tarefa') { const open = d.open; d.outerHTML = resumoHtml(); const n = V.root.querySelector('.vt-res'); if (n && open) n.open = true; }
    paint();
  }
  function setModo(m) {
    if (!V) return null;
    V.modo = m || ''; V.msg = null; V.saved = false;
    redraw();
    if (V.modo === 'tarefa') loadResumo();
    return V.modo;
  }
  async function startTarefa() {
    if (!V || missingT().length || V.busy || cycleActive(V.id)) return null;
    const p = projOf(V.id) || {};
    V.busy = true; V.msg = { kind: '', html: 'Gravando a tarefa…' }; paint();
    persist();
    const r = await call('tarefaNova', { projectId: V.id, projectName: p.name || '', projectPath: p.path || '', ...V.t });
    if (!V) return r;
    V.busy = false;
    if (r && r.ok) {
      V.entrega = r.entrega; V.saved = true; V.msg = null;
      const ok = await startCycle(V.id, null, { reusar: true });
      if (!V) return r;
      cyOf(V.id).hist = (await call('tarefaHist', V.id)) || [];
      V.t = EMPTY_T(); persist(); // a próxima tarefa começa em branco; esta fica no histórico
      if (!ok) V.msg = { kind: 'bad', html: 'A tarefa foi gravada, mas o projeto não foi encontrado para criar os agentes.' };
      redraw();
      return r;
    }
    V.msg = { kind: 'bad', html: `Não foi possível gravar a tarefa.${r && r.problems ? `<ul>${r.problems.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}` };
    paint();
    return r;
  }

  // O que falta para iniciar, em linguagem clara (a regra que vale é a do processo principal; aqui é só para mostrar)
  function missing() {
    if (!V) return [];
    if (!V.modo) return ['Escolha o tipo: projeto novo ou tarefa num projeto em andamento.']; // DEV2-017
    if (V.modo === 'tarefa') return missingT();
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
    if (!V.modo) return choiceHtml(); // DEV2-017
    if (V.modo === 'tarefa') return tarefaBody();
    const ps = projects();
    const dis = V.id ? '' : 'disabled';
    const f = V.f;
    const mutNote = V.mut ? `<div class="vibe-note">Entrega pré-preenchida pela sua <b>parte do Mutirão</b> (branch ${esc(V.mut)}): a estrutura é a parte gravada pelo dono. Complete o que faltar (ex.: o fluxo desenhado) e inicie. Os agentes trabalham só na branch ${esc(V.mut)}.</div>` : '';
    const ent = V.entrega && V.entrega.mutirao ? `<div class="vibe-note">Entrega gerada pelo Termix na <b>implementação automática do Mutirão</b> (branch ${esc(V.entrega.mutirao.branch || '')}, ${esc(fmtDate(V.entrega.data))}): divisão, partes, entregas e conflitos da junção. O andamento está no painel acima.</div>` : V.entrega ? `<div class="vibe-note">Este projeto já tem uma entrega pronta, de ${esc(fmtDate(V.entrega.data))}. Ela continua guardada. Ao clicar em "Iniciar Vibe Coding", o Termix pede confirmação antes de gravar a versão nova.</div>` : '';
    return `<div class="vibe-form">
      <p>Entregue o projeto completo de uma vez. Com tudo preenchido, o Termix cria um orquestrador e um dev que trabalham sozinhos até o fim. Quanto mais claro, menos retrabalho. O que você preencher fica salvo como rascunho. <a href="#" class="vx-link" data-vmodo="">Trocar o tipo</a></p>
      <p class="vibe-tip">Entregas completas evitam perguntas e gastam menos tokens.</p>
      ${mutNote}${ent}
      <div class="vf"><label for="vfProj">1. Projeto <em>obrigatório</em></label>
        <select class="inp" id="vfProj">${ps.length ? '' : '<option value="">Nenhum projeto no Termix. Crie um projeto antes.</option>'}${ps.length ? `<option value="" ${V.id ? '' : 'selected'}>Escolha o projeto…</option>` : ''}${ps.map((p) => `<option value="${esc(p.id)}" ${p.id === V.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
      <div id="vcPanel">${V.id ? cycleHtml(V.id) : ''}</div>
      <div id="vpPanel">${V.id ? polFormHtml(V.id) : ''}</div>
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
    const act = cycleActive(V.id);
    // DEV2-017: na escolha inicial não há "Iniciar" nem modelo; na tarefa, sem o modelo e com "Iniciar tarefa"
    const tpl = V.root.querySelector('[data-vtpl]');
    if (tpl) tpl.style.display = V.modo === 'projeto' ? '' : 'none';
    const go0 = V.root.querySelector('[data-vgo]');
    if (!V.modo) { if (go0) go0.style.display = 'none'; return; }
    if (V.modo === 'tarefa') {
      const box = V.root.querySelector('#vfMiss');
      box.className = `vibe-miss ${m.length ? '' : 'done'}`;
      box.innerHTML = m.length ? `<b>Falta para iniciar:</b><ul>${m.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : act ? '<b>Uma tarefa está em andamento neste projeto.</b> Para começar outra, espere ela terminar ou pare a atual.' : '<b>Tudo pronto.</b> Pode iniciar a tarefa.';
      if (go0) {
        go0.disabled = !!m.length || V.busy || V.saved || act;
        go0.style.display = act ? 'none' : '';
        go0.classList.add('pri');
        go0.textContent = 'Iniciar tarefa';
      }
      const msg = V.root.querySelector('#vfMsg');
      msg.className = `vibe-msg ${V.msg ? V.msg.kind : ''}`;
      msg.innerHTML = V.msg ? V.msg.html : '';
      return;
    }
    const box = V.root.querySelector('#vfMiss');
    box.className = `vibe-miss ${m.length ? '' : 'done'}`;
    box.innerHTML = m.length ? `<b>Falta para iniciar:</b><ul>${m.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : act ? '<b>Vibe Coding em andamento neste projeto.</b> Para iniciar de novo, pare o atual.' : '<b>Tudo pronto.</b> Pode iniciar o Vibe Coding.';
    const go = go0;
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

  const persist = () => { if (V && V.id) call('draftSet', V.id, { ...V.f, tarefa: V.t }); }; // DEV2-017: o rascunho da tarefa junto
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
    V.id = id || ''; V.mut = ''; V.saved = false; V.f = EMPTY(); V.t = EMPTY_T(); V.res = null; V.fx = { fluxo: null, estrutura: null }; V.entrega = null; V.msg = null;
    if (V.id) {
      const [d, e] = await Promise.all([call('draftGet', V.id), call('entregaGet', V.id), cyLoad(V.id)]);
      if (!V || V.id !== id) return;
      V.entrega = e && e.status === 'pronta' ? e : null;
      // DEV2-017: rascunho da tarefa; com um ciclo em andamento, a tela abre direto no tipo dele (tarefa ou projeto)
      if (d && d.tarefa && typeof d.tarefa === 'object') for (const k of Object.keys(V.t)) if (d.tarefa[k] != null) V.t[k] = String(d.tarefa[k]);
      if (!V.modo && cycleActive(V.id)) V.modo = e && e.modo === 'tarefa' ? 'tarefa' : 'projeto';
      if (e && e.modo === 'tarefa') V.entrega = null; // a entrega sintética da tarefa não pré-preenche o formulário do projeto novo
      V.mut = d && d.mutirao ? String(d.mutirao) : '';
      const src = d || (V.entrega ? { objetivo: e.objetivo, criterio: e.criterioDePronto, proibido: e.naoPodem, acessos: (e.acessos || []).join('\n'), nadaFornecer: e.nadaAFornecer, fluxo: e.origem && e.origem.fluxo, estrutura: e.origem && e.origem.estrutura } : {});
      const base = EMPTY();
      for (const k of Object.keys(base)) if (src[k] != null) base[k] = typeof base[k] === 'boolean' ? !!src[k] : String(src[k]);
      V.f = base;
      try { S.settings.vibe = { ...(S.settings.vibe || {}), last: V.id }; save(); } catch { /* sem preferência gravada */ }
    }
    redraw();
    if (V.modo === 'tarefa') loadResumo();
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
    if (V && V.modo === 'tarefa') return startTarefa(); // DEV2-017
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
    if (!V.modo) return; // DEV2-017: escolha inicial (os botões são tratados no clique do modal)
    R.querySelector('#vfProj').onchange = (e) => { clearTimeout(V.timer); persist(); loadProject(e.target.value); };
    R.querySelector('.vibe-form').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.stopPropagation(); });
    if (V.modo === 'tarefa') { // DEV2-017: os 4 campos da tarefa
      for (const [sel, k] of [['#vtOq', 'oQue'], ['#vtCrit', 'criterio'], ['#vtNao', 'naoPode'], ['#vtArq', 'arquivos']]) {
        const el = R.querySelector(sel);
        el.oninput = () => { V.t[k] = el.value; V.msg = null; V.saved = false; persistSoon(); paint(); };
      }
      return;
    }
    const txt = (sel, k) => { const el = R.querySelector(sel); el.oninput = () => { V.f[k] = el.value; V.msg = null; V.saved = false; if (k === 'objetivo') R.querySelector('.vf-cnt').textContent = `${el.value.length}/${LIM_OBJ}`; persistSoon(); paint(); }; };
    txt('#vfObj', 'objetivo'); txt('#vfCrit', 'criterio'); txt('#vfProib', 'proibido'); txt('#vfAcc', 'acessos');
    // Enter nos campos não fecha o modal (o modal do app trata Enter num <input> como o último botão)
    R.querySelector('.vibe-form').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.stopPropagation(); });
    R.querySelector('#vfNada').onchange = (e) => { V.f.nadaFornecer = e.target.checked; V.msg = null; V.saved = false; R.querySelector('#vfAcc').disabled = e.target.checked; persist(); paint(); };
    R.querySelectorAll('[data-vpick]').forEach((b) => { b.onclick = () => pick(b.dataset.vpick); });
  }

  async function openVibe(modo0 = '') { // DEV2-024: modo0 = 'tarefa' abre direto no Vibe de tarefa (sócio do b2)
    if (V) return;
    const ps = projects();
    let last = '';
    try { last = (S.settings.vibe && S.settings.vibe.last) || ''; } catch { /* sem preferência */ }
    const id = projOf(last) ? last : ps.length === 1 ? ps[0].id : '';
    V = { root: null, id, modo: modo0 === 'tarefa' || modo0 === 'projeto' ? modo0 : '', f: EMPTY(), t: EMPTY_T(), res: null, fx: { fluxo: null, estrutura: null }, entrega: null, msg: null, busy: false, timer: null }; // modo (DEV2-017): '' = escolha inicial
    const p = modal({
      title: 'Vibe Coding',
      body: body(),
      buttons: [['Baixar modelo (.md)', 'tpl'], ['Fechar', null], ['Iniciar Vibe Coding', 'go', 'pri']],
      onOpen: (root) => {
        V.root = root;
        const bs = root.querySelectorAll('.foot2 [data-mb]');
        bs[0].onclick = () => template(); bs[0].dataset.vtpl = '';
        bs[2].onclick = () => start(false); bs[2].dataset.vgo = '';
        // confirmação de substituir (dentro da própria tela; o app só tem um modal por vez)
        root.addEventListener('click', (e) => {
          const vm = e.target.closest('[data-vmodo]'); // DEV2-017: escolha inicial (projeto novo ou tarefa) e "Trocar o tipo"
          if (vm && V) { e.preventDefault(); setModo(vm.dataset.vmodo); return; }
          const vp = e.target.closest('[data-vp]'); // DEV2-014: tela "Antes de iniciar" / editar a política
          if (vp && V && V.id) polAct(V.id, vp.dataset.vp, vp);
          if (e.target.closest('[data-vyes]')) start(true);
          else if (e.target.closest('[data-vno]')) { V.msg = null; paint(); }
          const vc = e.target.closest('[data-vc]');
          if (vc && V && V.id) {
            const k = vc.dataset.vc, id = V.id;
            if (k === 'stop') stopCycle(id); else if (k === 'resume') resumeCycle(id); else if (k === 'send') sendPrompt(id, 'plano'); else if (k === 'answers') sendAnswers(id);
            else if (k === 'antes') polOpen(id, 'iniciar'); else if (k === 'poledit') polOpen(id, 'editar'); else if (k === 'deploypause') polPausarDeploy(id, true); else if (k === 'deployresume') polPausarDeploy(id, false);
            else if (k === 'depok') deployDecidir(id, 'autorizar', 'painel'); else if (k === 'depno') deployDecidir(id, 'negar', 'painel'); // DEV2-016
            else if (k === 'deprec') depReceita(id, vc.dataset.tag || ''); else if (k === 'depseguir') { const x = cyOf(id).est.exec; if (x && x.pausa && x.pausa.receita) proxTarefa(id, x, null, `publicação falhou: a main foi enviada (${x.pausa.receita}), mas a receita não rodou`); }
            else if (k === 'depvolta') { const c = cyOf(id); c.voltaConf = vc.dataset.tag; c.voltaFeita = null; paintCycle(); } else if (k === 'depvoltaok') { const c = cyOf(id); if (c.voltaConf) depVoltar(id, c.voltaConf); } else if (k === 'depvoltano') { cyOf(id).voltaConf = null; paintCycle(); }
            else if (k === 'deprecvolta') { const c = cyOf(id), tg = c.voltaFeita && c.voltaFeita.tag; c.voltaFeita = null; depReceita(id, tg ? `${tg}-volta` : ''); } else if (k === 'depvoltafim') { cyOf(id).voltaFeita = null; paintCycle(); }
            else if (k === 'abrir') { e.preventDefault(); call('abrirArquivo', id, vc.dataset.arq); } else if (k === 'fimenv') fimReenviar(id);
            else if (k === 'exec') execStart(id); else if (k === 'skip') skipTask(id); else if (k === 'mutent') mutEntrega(id); else if (k === 'mutfim') mutFim(id);
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
        root.addEventListener('change', (e) => { if (V && V.id && e.target.closest('#vpPanel') && e.target.dataset.vpf) polChange(V.id, e.target); });
        wire(); paint();
      },
    });
    loadProject(id);
    await p;
    if (V) { clearTimeout(V.timer); persist(); }
    V = null;
  }

  /* ---------- Mutirão (DEV2-005) ----------
     Só o DONO usa (fluxo Rocruzta: papel DEV1; sem fluxo: qualquer um, com um remoto git). A tela é um painel ao lado do
     terminal (não um modal), porque o chat com o orquestrador do dono É o terminal da aba "Mutirão · Orquestrador" (com a
     trava do Vibe). "Gerar divisão" digita um pedido curto; no fim de cada turno dessa aba o Termix confere sozinho os
     arquivos (zero token). Publicar, contar entregas e entregar a parte do sócio são feitos pelo Termix (git em código). */
  const MUT_NAME = 'Mutirão · Orquestrador';
  let MP = null; // painel aberto: { id, root, est, conf, cont, rows, msg, busy, gerando, counting }
  const MC = {}; // por projeto: objeto de espera dos hooks (gen) do Mutirão
  const mcOf = (id) => (MC[id] = MC[id] || { gen: 0 });
  const PART = {}; // parte do sócio por projeto: { at, r }

  async function mutLoad(id) {
    const p = projOf(id);
    if (!MP || !p) return;
    const est = await call('mutEstado', id, p.path);
    if (!MP || MP.id !== id) return;
    MP.est = est || {};
    const d = MP.est.dono;
    MP.rows = d && d.participantes && d.participantes.length ? d.participantes.map((x) => ({ ...x })) : (MP.rows && MP.rows.length ? MP.rows : [{ nome: '', branch: 'dev2' }]);
    MP.conf = d && d.conferencia ? d.conferencia : null;
    MP.cont = d && d.contador ? d.contador : null;
    if (d && d.auto) await cyLoad(id); // implementação automática: as fases de plano e execução vêm do ciclo do Vibe
    if (!MP || MP.id !== id) return;
    mutPaint();
    if (d && d.publicado && MP.est.papel && MP.est.papel.dono) mutCount(id); // contador ao abrir a tela
    mutStatus();
  }

  function mutRowsHtml(dis) {
    return `<div class="mp-rows">${MP.rows.map((r, i) => `<div class="mp-row"><input type="text" class="inp" data-mrn="${i}" maxlength="60" placeholder="Nome" value="${esc(r.nome || '')}" ${dis}><input type="text" class="inp" data-mrb="${i}" maxlength="60" placeholder="branch (ex.: dev2)" value="${esc(r.branch || '')}" ${dis}><button class="btn sm" data-mp="rm" data-i="${i}" title="Tirar" ${dis || (MP.rows.length < 2 ? 'disabled' : '')}>×</button></div>`).join('')}
      <button class="btn sm" data-mp="add" ${dis}>Adicionar participante</button></div>`;
  }

  function mutConfHtml() {
    const cf = MP.conf;
    if (!cf) return '';
    const partes = (cf.partes || []).map((pt) => `<li><b>${esc(pt.nome || pt.branch)}</b> <em class="vx-tag mp-br">${esc(pt.branch)}</em> ${esc(pt.titulo || '')}${pt.mdOk ? '' : ' <small class="mp-bad">(parte .md incompleta)</small>'}<details><summary>${plural((pt.arquivos || []).length, 'arquivo ou pasta', 'arquivos ou pastas')}</summary><small>${(pt.arquivos || []).map(esc).join('<br>')}</small></details></li>`).join('');
    const probs = (cf.problemas || []).length ? `<div class="mp-probs"><b>Não dá para publicar:</b><ul>${cf.problemas.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><small>Peça o ajuste ao orquestrador no terminal ao lado; o Termix confere de novo quando ele terminar o turno.</small></div>` : '';
    const avs = (cf.avisos || []).map((x) => `<div class="vc-aviso">${esc(x)}</div>`).join('');
    return `<div class="mp-conf ${cf.ok ? 'ok' : 'bad'}"><div class="mp-h">${cf.ok ? '<b class="mp-ok">Divisão conferida: nenhum arquivo em comum.</b>' : '<b>Conferência da divisão</b>'} <small>${esc(fmtDate(cf.data))}</small></div>${partes ? `<ol class="mp-partes">${partes}</ol>` : ''}${probs}${avs}</div>`;
  }

  function mutCountHtml() {
    const ct = MP.cont, d = MP.est.dono;
    if (!d || !d.publicado) return '';
    const head = `<div class="mp-h"><b>Entregas: ${ct ? `${ct.k}/${ct.n}` : '…'}</b> <button class="btn sm" data-mp="count" ${MP.counting ? 'disabled' : ''}>${MP.counting ? 'Atualizando…' : 'Atualizar'}</button></div>`;
    const lst = ct ? `<ul class="mp-ent">${ct.lista.map((x) => `<li class="${x.entregue ? 'done' : ''}">${esc(x.nome)} <em class="vx-tag mp-br">${esc(x.branch)}</em> ${x.entregue ? `entregou em ${esc(fmtDate(x.data))}${x.commits ? ` · ${plural(x.commits, 'commit', 'commits')}` : ''}` : 'ainda não entregou'}</li>`).join('')}</ul>${ct.fetch ? `<div class="vc-aviso">git fetch: ${esc(ct.fetch)}</div>` : ''}` : '';
    const a = d.auto;
    const pode = ct && ct.n && ct.k === ct.n && !MP.autoBusy && !cycleActive(MP.id) && !(a && a.fase === 'push');
    const auto = pode ? `<div class="vibe-confirm mp-left"><button class="btn sm pri" data-mp="auto">${a ? 'Implementação automática de novo' : 'Implementação automática'}</button></div>` : '';
    return `<div class="mp-count">${head}${lst}${auto}</div>${mutAutoHtml(d)}`;
  }

  /* Implementação automática (DEV2-006): Juntando entregas (k/N) → Conflitos: X → Planejando → Executando k/n → Concluído.
     A junção é do Termix (git em código); o plano e a execução são o ciclo do Vibe na branch do dono ("Ver no Vibe"). */
  function mutAutoHtml(d) {
    const a = d && d.auto;
    if (!a) return '';
    const c = CY[MP.id], e = c && c.est && c.est.auto && c.est.auto.mutirao ? c.est : null;
    const ruins = (a.juncoes || []).filter((j) => j.status === 'conflito' || j.status === 'erro');
    const base = e ? (['parado', 'erro'].includes(e.fase) ? (e.antes || 'plano') : e.fase) : '';
    const x = e && e.exec;
    const steps = [{ k: 'j', l: `Juntando entregas (${a.k || 0}/${a.n || 0})` }];
    if (ruins.length) steps.push({ k: 'c', l: `Conflitos: ${ruins.length}` });
    steps.push({ k: 'p', l: base === 'pronto' ? 'Plano pronto' : 'Planejando' }, { k: 'x', l: x ? `Executando ${Math.min(x.feitas.length, x.tarefas.length)}/${x.tarefas.length}` : 'Executando' }, { k: 'f', l: 'Concluído' });
    const at = a.fase === 'concluido' || a.fase === 'push' || base === 'concluido' ? 'f' : ['execucao', 'pausado'].includes(base) ? 'x' : e ? 'p' : ['juntando', 'erro'].includes(a.fase) ? 'j' : 'p';
    const ai = steps.map((t) => t.k).indexOf(at);
    const lis = steps.map((t, i) => `<li class="${i < ai || (t.k === 'f' && a.fase === 'concluido') ? 'done' : i === ai ? 'cur' : ''}">${esc(t.l)}</li>`).join('');
    const jlist = (a.juncoes || []).map((j) => `<li class="${j.status === 'ok' || j.status === 'ja' ? 'done' : ''}">${esc(j.nome || '')} <em class="vx-tag mp-br">${esc(j.branch)}</em> ${j.status === 'ok' ? `integrada (${esc(String(j.sha || '').slice(0, 8))})` : j.status === 'ja' ? 'já estava integrada' : j.status === 'conflito' ? `<span class="mp-bad">conflito: ${esc((j.arquivos || []).join(', '))}</span> — vira a primeira tarefa do plano` : `<span class="mp-bad">${esc(j.motivo || 'erro')}</span>`}</li>`).join('');
    let line = '';
    if (a.fase === 'juntando' && MP.autoBusy) line = 'O Termix está juntando as entregas na branch do dono (git merge --no-ff, uma por participante).';
    else if (a.fase === 'erro') line = `<span class="mp-bad">A junção parou: ${esc(a.motivo || 'erro')}</span>`;
    else if (a.fase === 'push') line = `<span class="mp-bad">${esc((a.push && a.push.motivo) || 'O push da branch do dono falhou.')}</span>`;
    else if (a.fase === 'concluido') line = `<b>Mutirão concluído na ${esc(a.branch)}.</b> Push feito pelo Termix${a.push && a.push.sha ? ` (${esc(String(a.push.sha).slice(0, 8))})` : ''}${a.push && a.push.integrou ? `, depois de integrar a origin/${esc(a.branch)}, que estava à frente` : ''}. Promover para a main é com você.`;
    else if (e && e.fase === 'parado') line = 'O Vibe Coding foi parado. Continue pelo painel do Vibe.';
    else if (e && e.fase === 'pausado') line = `Pausado: ${esc((x && x.pausa && x.pausa.motivo) || '')}`;
    else if (e && e.fase === 'perguntas') line = 'O orquestrador tem perguntas indispensáveis: responda no painel do Vibe.';
    else if (e && e.fase === 'pronto') line = e.aviso ? esc(e.aviso) : 'Plano pronto.';
    else if (e) line = base === 'execucao' ? 'O Dev e o orquestrador estão trabalhando na branch do dono.' : 'O orquestrador do dono está montando o plano final.';
    const acts = [];
    if (e) acts.push('<button class="btn sm" data-mp="vervibe">Ver no Vibe</button>');
    if (a.fase === 'push') acts.push('<button class="btn sm pri" data-mp="autopush">Enviar a branch de novo</button>');
    return `<div class="mp-auto"><div class="mp-h"><b>Implementação automática</b> <small>branch ${esc(a.branch || '')}</small></div><ol class="vc-steps">${lis}</ol>${line ? `<div class="mp-small">${line}</div>` : ''}${jlist ? `<ul class="mp-ent">${jlist}</ul>` : ''}${acts.length ? `<div class="vibe-confirm mp-left">${acts.join('')}</div>` : ''}</div>`;
  }
  async function mutReload(id) {
    const p = projOf(id);
    const est = await call('mutEstado', id, p && p.path);
    if (MP && MP.id === id && est) { MP.est = est; mutPaint(); }
    mutStatus();
    return est;
  }
  // "Implementação automática": junção em código (k/N), entrega sintética e o ciclo do Vibe na branch do dono.
  // opts (só o teste usa): { maxTarefas, executar: false = para em "Plano pronto" }.
  async function mutAuto(id, opts = {}) {
    if (!MP || MP.autoBusy) return null;
    if (cycleActive(id)) { mutMsg('warn', 'Há um Vibe Coding em andamento neste projeto. Pare-o no painel do Vibe antes.'); return null; }
    MP.autoBusy = true; mutMsg('', 'Conferindo o projeto e buscando as entregas (git fetch)…');
    try {
      const pr = await call('mutAutoPrep', id);
      if (!pr || !pr.ok) { mutMsg('bad', esc((pr && pr.motivo) || 'Não foi possível preparar a junção.')); return pr; }
      await mutReload(id);
      let last = null;
      for (const pt of pr.participantes) {
        mutMsg('', `Juntando a entrega de ${esc(pt.nome)} (${esc(pt.branch)})…`);
        last = await call('mutAutoJuntar', id, pt.branch);
        if (MP && MP.id === id && MP.est && MP.est.dono && last && last.auto) { MP.est.dono = { ...MP.est.dono, auto: last.auto }; mutPaint(); }
        if (!last || !last.ok) { mutMsg('bad', esc((last && (last.motivo || (last.juncao && last.juncao.motivo))) || 'A junção parou.')); return last; }
      }
      const en = await call('mutAutoEntrega', id, { maxTarefas: opts.maxTarefas });
      if (!en || !en.ok) { mutMsg('bad', esc((en && en.motivo) || 'Não foi possível montar a entrega do plano final.')); return en; }
      const conf = en.conflitos.map((x) => x.branch);
      const ok = await startCycle(id, { mutirao: true, executar: opts.executar !== false, conflitos: conf, branch: en.branch });
      await mutReload(id);
      mutMsg(ok ? 'ok' : 'bad', ok ? `<b>Entregas juntadas na ${esc(en.branch)}${conf.length ? ` (conflito em ${esc(conf.join(', '))})` : ''}.</b> O orquestrador está montando o plano final; acompanhe em "Ver no Vibe".` : 'A entrega foi montada, mas o projeto não foi encontrado para criar os agentes.');
      return { ...en, iniciado: ok };
    } finally { if (MP) { MP.autoBusy = false; mutPaint(); } }
  }
  function mutVerVibe(id) {
    try { S.settings.vibe = { ...(S.settings.vibe || {}), last: id }; save(); } catch { /* sem preferência */ }
    openVibe();
  }
  async function mutAutoPush(id) {
    const r = await call('mutAutoFim', id);
    const c = CY[id];
    if (c && c.est && c.est.mutFim) { c.est.mutFim = { ok: !!(r && r.ok), branch: r && r.branch, sha: r && r.sha, motivo: (r && r.motivo) || '' }; cySave(id); }
    await mutReload(id);
    mutMsg(r && r.ok ? 'ok' : 'bad', r && r.ok ? `Branch ${esc(r.branch)} enviada.` : esc((r && r.motivo) || 'O push falhou.'));
    return r;
  }

  function mutPartHtml(pt) {
    if (!pt || !pt.tem) return '';
    if (pt.entregue) return `<div class="mp-part done"><b>Sua parte do Mutirão foi entregue</b> (branch ${esc(pt.branch)}, ${esc(fmtDate(pt.entregue.data))}).</div>`;
    return `<div class="mp-part"><b>Você tem uma parte do Mutirão</b><div>${esc(pt.titulo || 'Parte')} <em class="vx-tag mp-br">${esc(pt.branch)}</em></div>${pt.objetivo ? `<small>${esc(pt.objetivo)}</small>` : ''}
      <p class="vibe-tip">O Vibe Coding abre com a entrega já preenchida pela sua parte; complete o que faltar (ex.: o fluxo desenhado) e inicie.</p>
      <div class="vibe-confirm mp-left"><button class="btn sm pri" data-mp="vibe">Abrir o Vibe Coding com a minha parte</button></div></div>`;
  }

  function mutBody() {
    const ps = projects();
    const est = MP.est || {}, pp = est.papel || {}, d = est.dono;
    const sel = `<select class="inp" id="mpProj">${ps.length ? `<option value="" ${MP.id ? '' : 'selected'}>Escolha o projeto…</option>` : '<option value="">Nenhum projeto no Termix</option>'}${ps.map((p) => `<option value="${esc(p.id)}" ${p.id === MP.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>`;
    let main = '';
    if (!MP.id) main = '<p class="mp-small">Escolha o projeto que será dividido.</p>';
    else if (!MP.est) main = '<p class="mp-small">Lendo o projeto…</p>';
    else if (!pp.dono) {
      main = `<div class="mp-expl"><p><b>Só o dono do projeto usa o Mutirão.</b> Ele define com o orquestrador a divisão do trabalho; cada sócio recebe uma parte numa branch própria (dev2, dev3…), e o contador mostra as entregas até liberar a implementação automática.</p>${pp.motivo ? `<p class="mp-why">${esc(pp.motivo)}</p>` : ''}<p>Se você recebeu uma parte: sincronize a sua branch com a do dono e abra o projeto no Termix na sua branch. O aviso "Você tem uma parte do Mutirão" aparece aqui e no cabeçalho.</p></div>`;
    } else {
      const bloq = pp.pode ? '' : 'disabled';
      const tarefa = !!(d && d.modo === 'tarefas'); // DEV2-023: (b2) "Delegar algumas tarefas" = uma tarefa por participante
      const pub = d && d.publicado;
      const tab = d && d.orq ? tabOf(d.orq) : null;
      main = `${pp.motivo ? `<div class="mp-warn">${esc(pp.motivo)}</div>` : ''}
        ${!pp.fluxo ? '<p class="mp-why">Projeto sem o fluxo Rocruzta: o Mutirão exige um remoto git (origin) que todos os sócios acessem.</p>' : ''}
        <dl class="mp-dl">${d ? `<dt>Tipo</dt><dd>${tarefa ? 'Projeto em andamento: delegar algumas tarefas (uma por participante)' : d.modo === 'estado_atual' ? 'Projeto em andamento: do estado atual até finalizar, todo o restante dividido' : 'Projeto novo: o projeto inteiro dividido'}</dd>` : ''}${est.fase ? `<dt>Fase</dt><dd>${esc(est.fase.l)}</dd>` : ''}<dt>Branch do dono</dt><dd>${esc(pp.branchDono || '—')}${pp.criar ? ` <small>(será criada a partir de ${esc(pp.atual || 'atual')} ao publicar)</small>` : ''}</dd><dt>Remoto</dt><dd>${esc(pp.remoto || 'nenhum')}</dd></dl>
        <div class="mp-sec"><b>1. Participantes</b> <small>nome e branch de cada sócio</small>${mutRowsHtml(bloq)}</div>
        <div class="mp-sec"><b>2. ${tarefa ? 'Tarefas' : 'Divisão'} com o orquestrador</b>
          <p class="mp-small">O chat é o terminal da aba "${esc(MUT_NAME)}", ao lado. Converse com ele à vontade; "${tarefa ? 'Gerar tarefas' : 'Gerar divisão'}" manda um pedido curto para ele gravar <code>mutirao/divisao.json</code> e ${tarefa ? 'uma tarefa por participante (não é dividir o projeto inteiro)' : d && d.modo === 'estado_atual' ? 'uma parte por participante (todo o restante, do estado atual até finalizar)' : 'uma parte por participante (o projeto inteiro, 100%)'}.</p>
          <div class="vibe-confirm mp-left"><button class="btn sm" data-mp="chat" ${bloq}>${tab ? 'Ir para o chat' : 'Abrir o chat'}</button><button class="btn sm pri" data-mp="gerar" ${bloq || (MP.gerando ? 'disabled' : '')}>${MP.gerando ? (tarefa ? 'Escrevendo…' : 'Dividindo…') : MP.conf ? 'Gerar de novo' : tarefa ? 'Gerar tarefas' : 'Gerar divisão'}</button><button class="btn sm" data-mp="conf" ${MP.gerando ? 'disabled' : ''}>Conferir</button></div>
          ${mutConfHtml()}</div>
        <div class="mp-sec"><b>3. Publicar</b> <small>commit só de mutirao/ na branch ${esc(pp.branchDono || 'do dono')} e push só dela</small>
          ${pub ? `<p class="mp-small mp-ok">Publicada em ${esc(fmtDate(pub.data))} (commit ${esc(String(pub.sha || '').slice(0, 8))}). Os sócios sincronizam a branch deles com a ${esc(pub.branch)} e a parte aparece no Termix deles.</p>` : ''}
          <div class="vibe-confirm mp-left"><button class="btn sm ${pub ? '' : 'pri'}" data-mp="pub" ${bloq || (MP.conf && MP.conf.ok && !MP.busy && !MP.gerando ? '' : 'disabled')}>${pub ? 'Publicar de novo' : 'Publicar divisão'}</button></div></div>
        ${pub ? `<div class="mp-sec"><b>4. Entregas</b>${mutCountHtml()}</div>` : ''}
        <p class="vibe-tip">O orquestrador lê só os documentos e a estrutura de pastas; quem confere, publica e conta as entregas é o Termix, sem gastar tokens.</p>`;
    }
    const msg = MP.msg ? `<div class="vibe-msg ${MP.msg.kind}">${MP.msg.html}</div>` : '';
    return `<div class="mp-hd"><b>Mutirão</b><button class="mclose" data-mp="close" title="Fechar" aria-label="Fechar">×</button></div>
      <div class="mp-body"><div class="vf">${sel}</div>${mutPartHtml(est.parte)}${main}${msg}</div>`;
  }

  function mutPaint() {
    if (!MP || !MP.root || !MP.root.isConnected) return;
    const sc = MP.root.querySelector('.mp-body'), top = sc ? sc.scrollTop : 0;
    const open = [...MP.root.querySelectorAll('.mp-partes details')].map((x) => x.open);
    MP.root.innerHTML = mutBody();
    MP.root.querySelectorAll('.mp-partes details').forEach((x, i) => { if (open[i]) x.open = true; });
    const sc2 = MP.root.querySelector('.mp-body'); if (sc2) sc2.scrollTop = top;
  }

  function mutRowsRead() {
    if (!MP || !MP.root) return;
    MP.root.querySelectorAll('[data-mrn]').forEach((el) => { const r = MP.rows[+el.dataset.mrn]; if (r) r.nome = el.value; });
    MP.root.querySelectorAll('[data-mrb]').forEach((el) => { const r = MP.rows[+el.dataset.mrb]; if (r) r.branch = el.value.trim(); });
  }
  function mutMsg(kind, html) { if (MP) { MP.msg = kind != null ? { kind, html } : null; mutPaint(); } }

  // Garante a aba do orquestrador do Mutirão aberta (cria, ou retoma a parada). Sempre Dangerously, com a trava do Vibe.
  async function mutTab(id, g) {
    const p = projOf(id), c = mcOf(id);
    if (!p) return null;
    const d = MP && MP.est && MP.est.dono;
    let tab = d && d.orq ? tabOf(d.orq) : null;
    if (tab && isAlive(tab.id)) return tab;
    let w;
    if (!tab) {
      const r = await call('mutIniciar', id, { nome: p.name, pasta: p.path }, null, true);
      if (!r || !r.ok) { mutMsg('bad', esc((r && (r.motivo || (r.problemas || []).join(' '))) || 'Não foi possível iniciar o Mutirão.')); return null; }
      await call('trust', id, p.path); // pasta confiável (como no Vibe): o Claude Code não para perguntando
      UI.cur = { p: p.id, page: 'Terminais' }; UI.last = p.id;
      createTab(p, 'd', { name: MUT_NAME, color: '#b98cff' });
      tab = tabOf(p.activeTab);
      if (!tab) return null;
      w = waitHook(c, tab.id, (x) => x.event === 'SessionStart', 60000);
      await call('mutAba', id, tab.id);
      if (MP && MP.est) MP.est.dono = { ...(MP.est.dono || r.dono), orq: tab.id };
      renderAll();
    } else {
      p.activeTab = tab.id; UI.cur = { p: p.id, page: 'Terminais' }; renderAll();
      w = waitHook(c, tab.id, (x) => x.event === 'SessionStart', 60000);
      launch(p, tab, 'resume');
    }
    const ok = await w;
    if (c.gen !== g) return null;
    if (!ok) { mutMsg('warn', `A aba "${esc(MUT_NAME)}" não abriu em 60 s. Confira a aba (o Claude Code pode estar perguntando se você confia na pasta) e tente de novo.`); return null; }
    await sleep(3000); // sessão recém-aberta: a caixa de texto ainda está sendo desenhada
    return tab;
  }

  async function mutChat(id) {
    const p = projOf(id);
    const d = MP.est && MP.est.dono, tab = d && d.orq ? tabOf(d.orq) : null;
    if (tab && isAlive(tab.id)) { p.activeTab = tab.id; UI.cur = { p: p.id, page: 'Terminais' }; renderAll(); return; }
    mutMsg('', 'Abrindo o orquestrador…');
    const t = await mutTab(id, mcOf(id).gen);
    if (t) mutMsg('', `Chat aberto na aba "${esc(MUT_NAME)}". Converse com ele no terminal ao lado.`);
  }

  async function mutGerar(id) {
    mutRowsRead();
    const p = projOf(id);
    const r = await call('mutIniciar', id, { nome: p.name, pasta: p.path }, MP.rows);
    if (!r || !r.ok) { mutMsg('bad', `Confira os participantes:<ul>${((r && r.problemas) || [(r && r.motivo) || 'erro']).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`); return false; }
    MP.est.dono = r.dono; mutStatus();
    const c = mcOf(id), g = ++c.gen;
    MP.gerando = true; mutMsg('', 'Abrindo o orquestrador…');
    const tab = await mutTab(id, g);
    if (!tab || c.gen !== g) { if (MP) { MP.gerando = false; mutPaint(); } return false; }
    const text = await call('mutPrompt', id);
    if (!text) { MP.gerando = false; mutMsg('bad', 'Não foi possível montar o pedido.'); return false; }
    await call('mutPedido', id, nowIso());
    const stop = waitHook(c, tab.id, (x) => x.event === 'Stop');
    typeInto(c, tab, text, g); // uma linha curta: as instruções ficam em mutirao/PEDIDO.md
    mutMsg('', 'O orquestrador está lendo o projeto e gravando a divisão. Quem espera é o Termix (zero token); a conferência sai sozinha quando ele terminar.');
    const d = await stop;
    if (c.gen !== g) return false;
    if (MP) MP.gerando = false;
    if (!d) return false;
    return mutConferir(id, true);
  }

  async function mutConferir(id, auto) {
    const cf = await call('mutConferir', id);
    if (!MP || MP.id !== id) return cf;
    MP.conf = cf;
    const p = projOf(id);
    const est = await call('mutEstado', id, p && p.path);
    if (MP && MP.id === id && est) MP.est = est;
    MP.msg = cf && cf.ok ? { kind: 'ok', html: '<b>Divisão pronta para publicar.</b> Confira o resumo; para ajustar, peça no chat ao lado.' } : auto ? { kind: 'warn', html: 'O orquestrador terminou, mas a divisão ainda não passou na conferência (veja abaixo).' } : null;
    mutPaint();
    return cf;
  }

  async function mutPublicar(id) {
    MP.busy = true; mutMsg('', 'Publicando: commit de mutirao/ e push da branch do dono…');
    const r = await call('mutPublicar', id);
    if (!MP || MP.id !== id) return r;
    MP.busy = false;
    if (r && r.ok) { const p = projOf(id); MP.est = (await call('mutEstado', id, p && p.path)) || MP.est; mutMsg('ok', `<b>Divisão publicada</b> na branch ${esc(r.branch)} (commit ${esc(String(r.sha).slice(0, 8))}).`); mutCount(id); }
    else { if (r && r.conferencia) MP.conf = r.conferencia; mutMsg('bad', esc((r && r.motivo) || 'Não foi possível publicar.')); }
    return r;
  }

  async function mutCount(id) {
    if (!MP || MP.counting) return null;
    MP.counting = true; mutPaint();
    const ct = await call('mutContador', id);
    if (!MP || MP.id !== id) return ct;
    MP.counting = false;
    if (ct) MP.cont = ct;
    if (ct) mutNovas(id, ct); // entrega nova = aviso no sino (DEV2-023)
    if (ct && MP.est) MP.est = (await call('mutEstado', id, projOf(id) && projOf(id).path)) || MP.est; // a fase muda com as entregas
    if (!MP) return ct;
    mutPaint(); mutStatus();
    return ct;
  }

  // Sócio: registra a parte, pré-preenche a entrega do Vibe e abre o Vibe Coding nesse projeto.
  async function mutVibe(id) {
    const p = projOf(id);
    const r = await call('mutAplicar', id, p && p.path);
    if (!r || !r.ok) { mutMsg('bad', esc((r && r.motivo) || 'Não foi possível abrir a parte.')); return false; }
    try { S.settings.vibe = { ...(S.settings.vibe || {}), last: id }; save(); } catch { /* sem preferência */ }
    closeMutirao();
    openVibe(r.modo === 'tarefas' ? 'tarefa' : ''); // DEV2-024: (b2) direto no Vibe de tarefa; (a) e (b1) abrem como antes
    return true;
  }

  const fitSoon = () => setTimeout(() => { try { if (typeof fitActive === 'function') fitActive(); } catch { /* sem terminal */ } }, 60);
  function closeMutirao() {
    if (!MP) return;
    try { MP.root.remove(); } catch { /* já saiu */ }
    const col = document.getElementById('col'); if (col) col.classList.remove('mut-open');
    MP = null;
    fitSoon();
  }
  function mutSwitch(id) { if (!MP) return; mutRowsRead(); Object.assign(MP, { id, est: null, conf: null, cont: null, rows: [], msg: null, gerando: false }); mutPaint(); if (id) mutLoad(id); }

  function openMutirao(pid, init) {
    const col = document.getElementById('col');
    if (!col) return;
    try { window.TermixDelegar && window.TermixDelegar.close(); } catch { /* sem painel de Delegar tarefa */ } // DEV2-025: os dois painéis usam o mesmo lugar
    let id = pid || '';
    if (!id) { try { id = UI.cur && UI.cur.p && projOf(UI.cur.p) ? UI.cur.p : ''; } catch { /* sem projeto atual */ } }
    if (!id) { const ps = projects(); id = ps.length === 1 ? ps[0].id : ''; }
    if (MP) { if (id && MP.id !== id) mutSwitch(id); if (init) { Object.assign(MP, init); mutPaint(); } return; }
    const root = document.createElement('aside');
    root.className = 'mutp glass';
    MP = { id, root, est: null, conf: null, cont: null, rows: [], msg: null, busy: false, gerando: false, counting: false, autoBusy: false, ...(init || {}) };
    col.appendChild(root); col.classList.add('mut-open');
    root.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') closeMutirao(); });
    root.addEventListener('input', (e) => { if (e.target.dataset.mrn != null || e.target.dataset.mrb != null) mutRowsRead(); });
    root.addEventListener('change', (e) => { if (e.target.id === 'mpProj') mutSwitch(e.target.value); });
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-mp]');
      if (!b || !MP) return;
      const k = b.dataset.mp, id2 = MP.id;
      if (k === 'close') { closeMutirao(); return; }
      if (!id2) return;
      if (k === 'add') { mutRowsRead(); const used = MP.rows.map((r) => r.branch); let n = 2; while (used.includes(`dev${n}`)) n++; MP.rows.push({ nome: '', branch: `dev${n}` }); mutPaint(); }
      else if (k === 'rm') { mutRowsRead(); MP.rows.splice(+b.dataset.i, 1); mutPaint(); }
      else if (k === 'chat') mutChat(id2);
      else if (k === 'gerar') mutGerar(id2);
      else if (k === 'conf') mutConferir(id2);
      else if (k === 'pub') mutPublicar(id2);
      else if (k === 'count') mutCount(id2);
      else if (k === 'vibe') mutVibe(id2);
      else if (k === 'auto') mutAuto(id2);
      else if (k === 'vervibe') mutVerVibe(id2);
      else if (k === 'autopush') mutAutoPush(id2);
    });
    mutPaint();
    if (id) mutLoad(id);
    fitSoon();
  }

  // Fim de turno na aba do orquestrador do Mutirão (inclusive depois de um ajuste pedido no chat): o Termix confere de novo.
  try {
    window.termix.onHook(({ tabId, data }) => {
      if (!data || data.event !== 'Stop' || !MP || !MP.id || MP.gerando) return;
      const d = MP.est && MP.est.dono;
      if (d && d.orq === tabId) mutConferir(MP.id, true);
    });
  } catch (e) { console.error('vibe: mutirão hooks', e); }

  // Lado do sócio: o projeto em foco está na branch <b> e tem mutirao/partes/<b>.md. Aviso no cabeçalho (zero token: só o
  // processo principal lendo a pasta e o HEAD), conferido ao trocar de projeto e no máximo a cada 15 s.
  const PART_SEEN = new Set();
  let partBusy = false;
  async function checkPart() {
    if (!on() || partBusy) return;
    let p = null;
    try { p = UI.cur && UI.cur.p ? projOf(UI.cur.p) : null; } catch { /* sem projeto */ }
    if (!p) { paintPart(null); return; }
    const k = PART[p.id];
    if (k && Date.now() - k.at < 15000) { paintPart(p); return; }
    paintPart(p); // sem leitura recente deste projeto: o botão de outro projeto sai já, antes de ler a pasta
    partBusy = true;
    const r = await call('mutParte', p.path);
    partBusy = false;
    PART[p.id] = { at: Date.now(), r: r || { tem: false } };
    let agora = null;
    try { agora = UI.cur && UI.cur.p ? projOf(UI.cur.p) : null; } catch { /* sem projeto */ }
    paintPart(agora); // o projeto em foco pode ter mudado durante a leitura
    if (agora !== p) return;
    if (r && r.tem && !r.entregue && !PART_SEEN.has(`${p.id}|${r.branch}`)) {
      PART_SEEN.add(`${p.id}|${r.branch}`);
      try { const ev = { c: '#b98cff', who: `Mutirão · ${p.name}`, msg: `Você tem uma parte do Mutirão na branch ${r.branch}${r.titulo ? `: ${r.titulo}` : ''}. Abra pelo botão no cabeçalho.`, kind: 'perm' }; addEvent(ev); showToast(ev); } catch { /* sem aviso */ }
    }
  }
  // troca de projeto por clique: confere a parte logo depois (o cabeçalho nem sempre é redesenhado)
  document.addEventListener('click', () => { if (on()) setTimeout(() => { try { checkPart(); } catch { /* sem aviso */ } }, 80); }, true);
  function paintPart(p) {
    const top = document.getElementById('topbar'), box = top && top.querySelector('.vibebtns');
    if (!box) return;
    const r = p && PART[p.id] && PART[p.id].r;
    const cur = box.querySelector('[data-vibe-part]');
    const show = !!(r && r.tem && !r.entregue);
    if (!show || (cur && cur.dataset.vibePart !== p.id)) { if (cur) cur.remove(); if (!show) return; }
    if (box.querySelector('[data-vibe-part]')) return;
    const b = document.createElement('button');
    b.className = 'vibebtn part'; b.dataset.vibePart = p.id; b.title = `Você tem uma parte do Mutirão (branch ${r.branch})`;
    b.innerHTML = '<i></i>Sua parte do Mutirão';
    b.onclick = (e) => { e.stopPropagation(); openMutirao(b.dataset.vibePart); };
    box.appendChild(b);
  }

  /* ---------- Mutirão nativo (DEV2-023) ----------
     A tela "Novo mutirão" do núcleo (página interna 'Novo workflow') é desenhada aqui: projeto novo (as opções de pasta do
     núcleo: criar, usar existente, clonar) ou um projeto ativo do Termix, e os participantes. "Criar mutirão" cria ou
     escolhe o projeto, registra o Mutirão do dono (mutIniciar) e abre o projeto com o painel do Mutirão, que segue o fluxo
     de sempre (chat com o orquestrador, divisão, conferência, publicação, entregas e implementação automática).
     A pasta "Mutirão" da barra lateral lê MUT_ST (resumo do mutirao.json de cada projeto, sem git e sem IA) e, no clique,
     abre o projeto com o painel (monitoramento). */
  const MUT_ST = {}; // por projeto com o Mutirão do dono: { publicado, k, n, contado, fase }
  let mutStBusy = false, mutStAgain = false;
  async function mutStatus() {
    if (mutStBusy) { mutStAgain = true; return; }
    mutStBusy = true;
    try {
      const ids = projects().filter((p) => p.kind !== 'workflow').map((p) => p.id);
      const r = await call('mutLista', ids);
      if (Array.isArray(r)) {
        const antes = JSON.stringify(MUT_ST);
        for (const k of Object.keys(MUT_ST)) delete MUT_ST[k];
        for (const x of r) MUT_ST[x.id] = { modo: x.modo, publicado: x.publicado, k: x.k, n: x.n, contado: x.contado, ent: x.ent || [], nomes: x.nomes || {}, fase: x.fase };
        if (JSON.stringify(MUT_ST) !== antes) { try { renderSide(); } catch { /* barra ainda não desenhada */ } }
      }
    } finally { mutStBusy = false; if (mutStAgain) { mutStAgain = false; mutStatus(); } }
  }

  const MN0 = () => ({ modoB: 'estado_atual', orig: 'novo', pid: '', rows: [{ nome: '', branch: 'dev2' }], pp: null, ppKey: '', busy: false, err: '', objetivo: '', criterio: '', estrutura: null });
  // (a) projeto novo: o .md da estrutura do projeto, escolhido e conferido como na entrega do Vibe (as 9 seções)
  async function mnEstrutura(testPath) {
    const r = await call('pick', 'estrutura', testPath);
    if (!r || r.canceled) return r;
    MN.estrutura = r; mnRepaint(); return r;
  }
  let MN = MN0();
  const onNovo = () => { try { return UI.cur.p === '_' && UI.cur.page === 'Novo workflow'; } catch { return false; } };
  const mnRepaint = () => { if (onNovo()) { try { renderPage(); } catch { /* sem página */ } } };
  // Quem pode (só o dono), conferido pela pasta antes de criar: projeto ativo escolhido ou "Usar pasta existente".
  function mnPapel(np) {
    const p = MN.orig === 'ativo' ? projOf(MN.pid) : null;
    const pasta = p ? p.path : MN.orig === 'novo' && np && np.where === 'dir' ? np.dir : '';
    const key = pasta ? `${MN.orig}|${pasta}` : '';
    if (key === MN.ppKey) return;
    MN.ppKey = key; MN.pp = null;
    if (!pasta) return;
    call('mutPapel', pasta).then((r) => { if (MN.ppKey === key) { MN.pp = r; mnRepaint(); } });
  }
  function mnPapelHTML(np) {
    const pp = MN.pp;
    if (MN.orig === 'novo' && np.where === 'new') return `<p class="meta npwf">${ic('alert', 14)} A pasta nova nasce sem git. O Mutirão exige git e um remoto (origin) que todos os sócios acessem: configure-os antes de publicar a divisão.</p>`;
    if (MN.orig === 'novo' && np.where === 'git') return '<p class="meta">O repositório clonado já vem com o remoto (origin). Se ele usa o fluxo Rocruzta, só o DEV1 divide o trabalho.</p>';
    if (!pp) return MN.ppKey ? '<p class="meta">Conferindo o projeto…</p>' : '';
    if (!pp.dono) return `<p class="meta npwf">${ic('alert', 14)} <span><b>Só o dono do projeto cria o Mutirão.</b> ${esc(pp.motivo || '')} Se você recebeu uma parte, sincronize a sua branch com a do dono e abra o projeto no Termix na sua branch: o aviso "Sua parte do Mutirão" aparece no cabeçalho.</span></p>`;
    if (pp.motivo) return `<p class="meta npwf">${ic('alert', 14)} ${esc(pp.motivo)}</p>`;
    return `<p class="meta">Você é o dono: branch <b>${esc(pp.branchDono)}</b>${pp.criar ? ` (criada a partir da ${esc(pp.atual || 'atual')} ao publicar)` : ''}, remoto ${esc(pp.remoto)}.</p>`;
  }
  function pageHTML(np, folder) {
    mnPapel(np);
    const novo = MN.orig === 'novo', ps = projects().filter((p) => p.kind !== 'workflow');
    const bloq = !!(MN.pp && !MN.pp.dono) || MN.busy || np.busy;
    const est = MN.estrutura;
    const entrega = novo ? `<div class="f"><label>Objetivo do projeto</label><input class="inp" type="text" id="mnObj" value="${esc(MN.objetivo)}" placeholder="O que o projeto precisa entregar" maxlength="300"></div>
    <div class="f"><label>Estrutura do projeto (.md)</label><div class="nprow"><div class="pjpath" title="${esc((est && est.path) || '')}">${ic('folder', 16)}<span>${est ? esc(est.name) : 'Nenhum arquivo escolhido'}</span></div><button type="button" class="btn" data-mnest>Escolher .md…</button></div>${est && !est.ok ? `<p class="meta nperr">${(est.problems || []).map(esc).join('<br>')}</p>` : '<p class="meta">O mesmo .md da entrega do Vibe Coding (as 9 seções). O orquestrador divide o projeto inteiro a partir dele.</p>'}</div>
    <div class="f"><label>Critério de pronto do projeto</label><input class="inp" type="text" id="mnCrit" value="${esc(MN.criterio)}" placeholder="Como saber que o projeto inteiro acabou" maxlength="2000"></div>` : '';
    const proj = novo
      ? `<div class="f"><label>Nome do projeto</label><input class="inp" type="text" id="npName" value="${esc(np.name)}" placeholder="Meu SaaS" maxlength="60"></div>
    <div class="f"><label>Pasta</label><div class="seg"><button type="button" class="${np.where === 'new' ? 'sel' : ''}" data-npwhere="new">Criar pasta nova</button><button type="button" class="${np.where === 'dir' ? 'sel' : ''}" data-npwhere="dir">Usar pasta existente</button><button type="button" class="${np.where === 'git' ? 'sel' : ''}" data-npwhere="git">Clonar do GitHub</button></div>${folder}</div>`
      : `<div class="f"><label>Projeto do Termix</label><select class="inp" id="mnProj">${ps.length ? `<option value="" ${MN.pid ? '' : 'selected'}>Escolha o projeto…</option>` : '<option value="">Nenhum projeto no Termix</option>'}${ps.map((p) => `<option value="${esc(p.id)}" ${p.id === MN.pid ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
    <div class="f"><label>O que fazer com ele</label><div class="seg"><button type="button" class="${MN.modoB === 'estado_atual' ? 'sel' : ''}" data-mnmodo="estado_atual">Do estado atual até finalizar</button><button type="button" class="${MN.modoB === 'tarefas' ? 'sel' : ''}" data-mnmodo="tarefas">Delegar algumas tarefas</button></div>${MN.modoB === 'tarefas' ? '<p class="meta">Você define uma ou mais tarefas para os sócios (o orquestrador ajuda a escrever o resultado esperado e confere os arquivos em comum) e segue trabalhando na sua branch enquanto as entregas chegam.</p>' : '<p class="meta">Todo o restante do projeto, do estado atual do repositório até finalizar, é dividido entre os participantes, cada um com a sua parte até o fim.</p>'}</div>`;
    const rows = MN.rows.map((r, i) => `<div class="nprow"><input class="inp" type="text" data-mnn="${i}" value="${esc(r.nome || '')}" placeholder="Nome" maxlength="60"><input class="inp" type="text" data-mnb="${i}" value="${esc(r.branch || '')}" placeholder="branch (ex.: dev2)" maxlength="60"><button type="button" class="btn" data-mnrm="${i}" title="Tirar" ${MN.rows.length < 2 ? 'disabled' : ''}>×</button></div>`).join('');
    const label = MN.busy || np.busy ? (np.busy ? 'Clonando…' : 'Criando…') : novo && np.where === 'git' ? 'Clonar e criar mutirão' : 'Criar mutirão';
    return `<div class="npage"><div class="npinner">
    <div class="nphead"><span class="wfmark sm">${ic('workflow', 26)}</span><div><h2>Novo Mutirão</h2>
      <p class="meta">Divida um projeto entre sócios: cada um faz uma parte numa branch própria e, com todas as entregas, o Termix junta tudo e conclui em Vibe Coding.</p></div></div>
    <div class="f"><label>Projeto</label><div class="seg"><button type="button" class="${novo ? 'sel' : ''}" data-mnorig="novo">Projeto novo</button><button type="button" class="${novo ? '' : 'sel'}" data-mnorig="ativo">Projeto ativo do Termix</button></div></div>
    ${proj}
    ${entrega}
    ${mnPapelHTML(np)}
    <div class="f"><label>Participantes</label><p class="meta">Nome e branch de cada um (dev2, dev3…). Para ter ${!novo && MN.modoB === 'tarefas' ? 'uma tarefa' : 'uma parte'} também, inclua-se com a sua branch${MN.pp && MN.pp.branchDono ? ` (${esc(MN.pp.branchDono)})` : ''}; ela fica separada das outras, sem arquivo em comum. main/master não vale.</p>${rows}<div class="nprow"><button type="button" class="btn" data-mnadd>Adicionar participante</button></div></div>
    <p class="meta">Em seguida, o projeto abre com o painel do Mutirão: o chat com o orquestrador do dono, ${novo ? 'a divisão de 100% do projeto' : MN.modoB === 'tarefas' ? 'uma tarefa por participante' : 'a divisão de todo o restante'}, a conferência de arquivos em comum e a publicação. As entregas aparecem na pasta "Mutirão" e no sino.</p>
    ${MN.err ? `<p class="meta nperr">${MN.err}</p>` : ''}
    <div class="row2"><button class="btn pri big" data-mngo ${bloq ? 'disabled' : ''}>${label}</button></div></div></div>`;
  }
  function mnRowsRead() {
    document.querySelectorAll('#page [data-mnn]').forEach((el) => { const r = MN.rows[+el.dataset.mnn]; if (r) r.nome = el.value; });
    document.querySelectorAll('#page [data-mnb]').forEach((el) => { const r = MN.rows[+el.dataset.mnb]; if (r) r.branch = el.value.trim(); });
  }
  function mnProblemas() {
    const rows = MN.rows.map((r) => ({ nome: String(r.nome || '').trim(), branch: String(r.branch || '').trim() })).filter((r) => r.nome || r.branch);
    const out = [];
    if (!rows.length) out.push('Informe pelo menos um participante.');
    rows.forEach((r, i) => { if (!r.nome) out.push(`Participante ${i + 1}: falta o nome.`); if (!/^[A-Za-z0-9._/-]+$/.test(r.branch) || /^(main|master)$/i.test(r.branch)) out.push(`Participante ${i + 1}: branch "${r.branch}" inválida (ex.: dev2; main/master não vale).`); });
    const bs = rows.map((r) => r.branch); if (new Set(bs).size !== bs.length) out.push('Duas pessoas com a mesma branch.');
    return { rows, out };
  }
  async function mnCriar() {
    const np = UI.np;
    if (MN.busy || !np || np.busy) return null;
    mnRowsRead();
    const { rows, out } = mnProblemas();
    let p = MN.orig === 'ativo' ? projOf(MN.pid) : null;
    if (MN.orig === 'ativo' && !p) out.unshift('Escolha o projeto.');
    if (MN.orig === 'novo') { MN.objetivo = ($('#mnObj') || {}).value || MN.objetivo; MN.criterio = ($('#mnCrit') || {}).value || MN.criterio; if (!MN.estrutura || !MN.estrutura.ok) out.unshift('Escolha o .md da estrutura do projeto (as 9 seções, como na entrega do Vibe).'); }
    if (MN.pp && !MN.pp.dono) out.unshift(MN.pp.motivo || 'Só o dono do projeto cria o Mutirão.');
    if (out.length) { MN.err = out.map(esc).join('<br>'); mnRepaint(); return { ok: false, problemas: out }; }
    MN.err = ''; MN.busy = true; mnRepaint();
    let note = '';
    try {
      if (!p) {
        const r = await npResolve(); // as mesmas opções de pasta do "Novo projeto" (criar, usar existente, clonar)
        if (!r) return { ok: false, motivo: (UI.np && UI.np.err) || 'pasta' };
        note = r.note;
        p = addProject({ name: r.name, path: r.path, imported: r.imported, noTab: true }); // projeto comum (fica em "Projetos"); o Mutirão o lista também na pasta "Mutirão"
      }
    } finally { MN.busy = false; mnRepaint(); }
    if (note) addEvent({ who: p.name, msg: note });
    const opts = MN.orig === 'novo' ? { modo: 'projeto', entrega: { objetivo: MN.objetivo, criterio: MN.criterio, estrutura: MN.estrutura && MN.estrutura.path } } : { modo: MN.modoB === 'tarefas' ? 'tarefas' : 'estado_atual' };
    const res = await call('mutIniciar', p.id, { nome: p.name, pasta: p.path }, rows, false, opts);
    UI.np = null; MN = MN0();
    UI.cur = { p: p.id, page: 'Terminais' }; UI.last = p.id; save(); renderAll();
    const msg = res && res.ok
      ? { kind: 'ok', html: '<b>Mutirão criado.</b> Próximo passo: "Abrir o chat" para conversar com o orquestrador do dono, ou "Gerar divisão".' }
      : { kind: 'bad', html: esc((res && (res.motivo || (res.problemas || []).join(' '))) || 'Não foi possível registrar o Mutirão.') };
    openMutirao(p.id, { rows: rows.map((r) => ({ ...r })), msg });
    mutStatus();
    return { ok: !!(res && res.ok), id: p.id, res };
  }
  document.addEventListener('click', (e) => {
    if (!onNovo()) return;
    const b = e.target.closest('[data-mnorig],[data-mnadd],[data-mnrm],[data-mngo],[data-mnest],[data-mnmodo]');
    if (!b) return;
    mnRowsRead();
    if (b.dataset.mnorig) { MN.orig = b.dataset.mnorig; MN.err = ''; }
    else if (b.dataset.mnmodo) MN.modoB = b.dataset.mnmodo === 'tarefas' ? 'tarefas' : 'estado_atual';
    else if (b.hasAttribute('data-mnadd')) { const used = MN.rows.map((r) => r.branch); let n = 2; while (used.includes(`dev${n}`)) n++; MN.rows.push({ nome: '', branch: `dev${n}` }); }
    else if (b.dataset.mnrm != null) MN.rows.splice(+b.dataset.mnrm, 1);
    else if (b.hasAttribute('data-mnest')) { mnEstrutura(); return; }
    else { mnCriar(); return; }
    mnRepaint();
  });
  document.addEventListener('input', (e) => { if (!onNovo()) return; if (e.target.dataset.mnn != null || e.target.dataset.mnb != null) mnRowsRead(); if (e.target.id === 'mnObj') MN.objetivo = e.target.value; if (e.target.id === 'mnCrit') MN.criterio = e.target.value; });
  document.addEventListener('change', (e) => { if (onNovo() && e.target.id === 'mnProj') { mnRowsRead(); MN.pid = e.target.value; MN.err = ''; mnRepaint(); } });
  // Entregas chegam de forma nativa (DEV2-023): o que entrou desde a última contagem vira aviso no sino.
  function mutNovas(id, ct) {
    const s = MUT_ST[id], p = projOf(id);
    if (!s || !p || !ct || !Array.isArray(ct.lista)) return [];
    const novas = ct.lista.filter((x) => x.entregue && !(s.ent || []).includes(x.branch));
    s.ent = ct.lista.filter((x) => x.entregue).map((x) => x.branch);
    for (const x of novas) {
      const tudo = ct.n && ct.k === ct.n;
      const ev = { c: '#b98cff', who: `Mutirão · ${p.name}`, msg: `${x.nome} (${x.branch}) entregou ${s.modo === 'tarefas' ? 'a tarefa' : 'a parte'}: ${ct.k}/${ct.n}.${tudo ? ' Todas as entregas chegaram: a implementação automática está liberada no painel.' : ''}`, kind: 'perm' };
      try { addEvent(ev); showToast(ev); } catch { /* sem aviso */ }
    }
    return novas;
  }
  let vigiando = false;
  async function mutVigia() {
    if (vigiando) return 0;
    vigiando = true; let n = 0;
    try {
      for (const [id, s] of Object.entries(MUT_ST)) {
        if (!s.publicado || (s.contado && s.k >= s.n) || (MP && MP.id === id && MP.counting)) continue;
        const ct = await call('mutContador', id);
        if (ct) { n += mutNovas(id, ct).length; if (MP && MP.id === id) { MP.cont = ct; mutReload(id); } }
      }
      if (n) mutStatus();
    } finally { vigiando = false; }
    return n;
  }
  setInterval(mutVigia, 5 * 60000); // a cada 5 min: git fetch dos mutirões publicados e ainda sem todas as entregas
  setTimeout(mutVigia, 20000);
  window.TermixMut = { status: MUT_ST, pageHTML, open: (id) => openMutirao(id), refresh: () => mutStatus() };
  setTimeout(mutStatus, 300); // a barra lateral recebe a lista assim que o app abre

  /* gancho de teste: só existe com o app aberto em modo de teste (TERMIX_VIBE_TEST=1), porque o diálogo nativo de arquivo
     não é automatizável por CDP. Sem esse modo, nada é exposto e a interface não tem atalho escondido. */
  call('status').then((s) => {
    if (s && s.test) window.vibeTest = { open: () => openVibe(), pick: (k, p) => pick(k, p), template: (p) => template(p), start: (r) => start(r), state: () => (V ? { id: V.id, modo: V.modo, f: { ...V.f }, t: { ...V.t }, res: V.res, missing: missing(), entrega: V.entrega, hist: (CY[V.id] && CY[V.id].hist) || [] } : null),
      // DEV2-017: Vibe de tarefa. modo('projeto'|'tarefa'|'') = escolha inicial; tarefa({oQue, criterio, naoPode, arquivos}) preenche os campos
      modo: (m) => setModo(m), tarefa: (o) => { if (!V || V.modo !== 'tarefa') return false; for (const [k, sel] of [['oQue', '#vtOq'], ['criterio', '#vtCrit'], ['naoPode', '#vtNao'], ['arquivos', '#vtArq']]) if (o && o[k] != null) { const el = V.root.querySelector(sel); if (el) { el.value = o[k]; el.dispatchEvent(new Event('input', { bubbles: true })); } } return { ...V.t }; },
      cycle: (id) => { const c = CY[id || (V && V.id)]; return c ? { est: c.est, live: c.live, wait: c.wait, perguntas: c.perguntas, tarefas: c.plano && c.plano.tarefas } : null; },
      inject: async (lista) => { const id = V && V.id, c = id && CY[id]; if (!c || !c.est) return false; if (!(await call('testPerguntas', id, lista))) return false; c.est.fase = 'plano'; await afterTurn(id); return c.est.fase; },
      answer: (map) => { const c = V && CY[V.id]; if (!c) return false; c.ans = map; return sendAnswers(V.id); },
      stop: () => V && stopCycle(V.id), resume: () => V && resumeCycle(V.id),
      // DEV2-009: o /clear do ciclo (com o Ctrl+U antes) numa aba do Vibe ('orq' ou 'dev'); true = o SessionStart "clear" chegou
      clear: async (k) => { const c = V && CY[V.id], tab = c && c.est && tabOf(c.est[k || 'orq']); return tab ? !!(await clearTab(c, tab, c.gen)) : null; },
      // DEV2-004: execução. limit(93) injeta o % da janela de 5 h (null volta ao real); exec/cont/skip = botões do painel
      limit: (v) => { LIM_TEST = typeof v === 'number' ? v : null; paintCycle(); return LIM_TEST; },
      // DEV2-014: política. lim7(v)/custo(v) injetam a janela de 7 d e o custo do ciclo; pol.* = os botões da tela e do painel
      lim7: (v) => { LIM7_TEST = typeof v === 'number' ? v : null; paintCycle(); return LIM7_TEST; },
      custo: (v) => { CUSTO_TEST = typeof v === 'number' ? v : null; paintCycle(); return CUSTO_TEST; },
      pol: { get: () => V && call('politicaGet', V.id), abrir: (m) => V && polOpen(V.id, m || 'iniciar'), form: () => { const c = V && CY[V.id]; if (c && c.form) polRead(V.id); return c && c.form ? clone(c.form) : null; },
        set: (field, val) => { const el = V && V.root.querySelector(`#vpPanel [data-vpf="${field}"]${typeof val === 'string' && /^(modelo|humano)$/.test(field) ? `[value="${val}"]` : ''}`); if (!el) return false; if (el.type === 'radio' || el.type === 'checkbox') el.checked = el.type === 'radio' ? true : !!val; else el.value = val; el.dispatchEvent(new Event('change', { bubbles: true })); return true; },
        salvar: () => V && polAct(V.id, 'salvar'), voltar: () => V && polAct(V.id, 'cancelar'), pausarDeploy: (on) => V && polPausarDeploy(V.id, on !== false) },
      // DEV2-007: tempos(ms) do tempo limite do turno e do silêncio (sem argumento: volta ao padrão de 30 e 20 min)
      tempos: (o) => { T.turno = (o && o.turno) || 30 * 60000; T.semResposta = (o && o.semResposta) || 20 * 60000; return { ...T }; },
      exec: () => V && execStart(V.id), cont: () => V && resumeCycle(V.id), skip: () => V && skipTask(V.id),
      // DEV2-015: recuperação. f5Projeto() roda o comando "reiniciar o projeto" da política; tela(k) = o texto do diagnóstico
      f5Projeto: () => V && call('f5Projeto', V.id),
      // DEV2-016: deploy. dep.lista() = versões; dep.decidir(d, origem) = o mesmo caminho do painel/sino/Telegram
      dep: { lista: () => V && call('deployLista', V.id), decidir: (d, o) => V && deployDecidir(V.id, d, o || 'teste'), aut: () => V && call('deployAut', V.id, 'ler') }, tela: (k) => { const c = V && CY[V.id]; return c && c.est ? telaDe(c.est[k || 'dev']).split('\n').slice(-60).join('\n') : ''; },
      // DEV2-005: Mutirão. mut.* = os botões do painel; mutEntregar grava a entrega simulada do sócio (sem rodar o Vibe)
      mut: { open: (pid) => openMutirao(pid), close: () => closeMutirao(), rows: (r) => { if (!MP) return false; MP.rows = r; mutPaint(); return true; },
        state: () => (MP ? { id: MP.id, est: MP.est, conf: MP.conf, cont: MP.cont, rows: MP.rows, msg: MP.msg && MP.msg.html, gerando: MP.gerando } : null),
        auto: (o) => MP && mutAuto(MP.id, o || {}), autoPush: () => MP && mutAutoPush(MP.id), verVibe: () => MP && mutVerVibe(MP.id),
        gerar: () => MP && mutGerar(MP.id), conferir: () => MP && mutConferir(MP.id), publicar: () => MP && mutPublicar(MP.id), contar: () => MP && mutCount(MP.id), vibe: () => MP && mutVibe(MP.id),
        parte: async () => { for (const k of Object.keys(PART)) delete PART[k]; await checkPart(); const p = UI.cur && projOf(UI.cur.p); return p && PART[p.id] ? PART[p.id].r : null; } },
      mutEntregar: (id) => mutEntrega(id || (V && V.id), true),
      // DEV2-023: tela "Novo mutirão" (estado) e o resumo da pasta "Mutirão"
      novo: { state: () => ({ ...MN, rows: MN.rows.map((r) => ({ ...r })) }), criar: () => mnCriar(), estrutura: (p) => mnEstrutura(p), vigiar: () => mutVigia(), status: () => ({ ...MUT_ST }), refresh: () => mutStatus() } };
  });

  /* botões no cabeçalho: o app.js redesenha o #topbar inteiro; reponho os botões a cada redesenho */
  function mountTop() {
    const top = document.getElementById('topbar');
    if (!top) return;
    const cur = top.querySelector('.vibebtns');
        if (cur) { checkPart(); return; }
    const anchor = top.querySelector('[data-togact]');
    if (!anchor) return;
    const box = document.createElement('div');
    box.className = 'vibebtns';
    box.innerHTML = '<button class="vibebtn" data-vibe-open="vibe" title="Vibe Coding"><i></i>Vibe Coding</button>'; // DEV2-023: o Mutirão saiu do cabeçalho (fica em "Novo mutirão" e na pasta "Mutirão")
    box.addEventListener('click', (e) => { const b = e.target.closest('[data-vibe-open]'); if (b) { e.stopPropagation(); openScreen(b.dataset.vibeOpen); } });
    const before = top.querySelector('#updchip') || anchor;
    top.insertBefore(box, before);
    checkPart();
  }

  /* DEV2-024: a chave "Vibe Coding e Mutirão (experimental)" saiu de Configurações (a dev2 não vai para a main; o Rodrigo
     implementa de forma nativa depois). */

  function boot() {
    try {
      const top = document.getElementById('topbar');
      if (top) new MutationObserver(mountTop).observe(top, { childList: true });
      mountTop();
    } catch (e) { console.error('vibe: início', e); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  // DEV2-025: ponte para o painel "Delegar tarefa" (src/renderer/vibe/delegar.js): abrir o Vibe de tarefa já preenchido e fechar o painel do Mutirão
  window.TermixVibeBridge = {
    openTarefa: (id) => { try { S.settings.vibe = { ...(S.settings.vibe || {}), last: id }; save(); } catch { /* sem preferência */ } return openVibe('tarefa'); },
    closeMut: () => { if (MP) closeMutirao(); },
    // DEV2-026 (Retomar projeto): estado do ciclo, abas do ciclo (o /clear nunca as toca), ciclos rodando (aviso ao fechar o app) e "Continuar ciclo"
    cicloDe: async (id) => { const c = await cyLoad(id); const e = c && c.est; return e ? { fase: e.fase, live: !!c.live, auto: !!e.auto, tarefa: !!e.tarefa, abas: [e.orq, e.dev].filter(Boolean), concluido: e.fase === 'concluido', aviso: e.aviso || '' } : null; },
    cicloAbas: (id) => { const e = CY[id] && CY[id].est; return e ? [e.orq, e.dev].filter(Boolean) : []; },
    cicloAtivos: () => Object.keys(CY).filter((id) => CY[id].est && CY[id].live && BUSY.includes(CY[id].est.fase)).map((id) => { const p = projOf(id); return { id, nome: p ? p.name : id, auto: !!CY[id].est.auto, fase: CY[id].est.fase }; }),
    continuar: (id) => resumeCycle(id),
  };
  // DEV2-010: o Organizador (importar projeto com várias pastas) vem em arquivos próprios, carregados daqui (o index.html não muda)
  try {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'vibe/organizador.css'; document.head.appendChild(l);
    const s = document.createElement('script'); s.src = 'vibe/organizador.js'; document.body.appendChild(s);
    const l2 = document.createElement('link'); l2.rel = 'stylesheet'; l2.href = 'vibe/delegar.css'; document.head.appendChild(l2); // DEV2-025
    const s2 = document.createElement('script'); s2.src = 'vibe/delegar.js'; document.body.appendChild(s2);
    const l3 = document.createElement('link'); l3.rel = 'stylesheet'; l3.href = 'vibe/retomar.css'; document.head.appendChild(l3); // DEV2-026
    const s3 = document.createElement('script'); s3.src = 'vibe/retomar.js'; document.body.appendChild(s3);
  } catch (e) { console.error('vibe: organizador', e); }
})();
