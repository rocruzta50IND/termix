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
  const on = () => { try { return !!(S && S.settings && S.settings.vibe && S.settings.vibe.on); } catch { return false; } };
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
    if (c.est) await cyRead(id);
    return c;
  }
  function cySave(id) { const c = cyOf(id); if (c.est) call('cicloSet', id, c.est); paintCycle(); if (MP && MP.id === id && c.est && c.est.auto) mutPaint(); }

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
  // auto (DEV2-006): ciclo da implementação automática do Mutirão ({ mutirao, executar, conflitos, branch })
  async function startCycle(id, auto) {
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
    c.est = { versao: 1, fase: 'abrindo', rodada: 0, orq, dev, iniciado: nowIso(), ...(auto ? { auto } : {}), aviso: tr && !tr.ok ? `O Termix não marcou a pasta como confiável (${tr.motivo || 'erro'}). Se o Claude Code perguntar na aba, escolha "Yes, I trust this folder".` : '' };
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
    if (!d) { pause(id, 'erro', `A aba "${tab.name}" não abriu em 60 s. Confira a aba (o Claude Code pode estar perguntando algo) e clique em Continuar.`); return null; }
    await sleep(1500);
    return tab;
  }
  // Pede algo a um agente: /clear, pedido curto e espera o fim do turno (hook Stop). false = parou, pausou ou falhou.
  async function ask(id, g, key, text) {
    const c = cyOf(id);
    if (!text) { pause(id, 'erro', 'Não foi possível montar o pedido (a entrega ou o plano não foram encontrados).'); return false; }
    // o pedido não chegou a ser digitado (aba não abriu, /clear não confirmado): não conta como tentativa, e o "Continuar"
    // manda o pedido normal em vez de "refazer" (achado na DEV2-006)
    const P = (c.pedindo = { key, tab: null, enviado: false, digitado: false });
    const naoEnviado = () => { if (c.pedindo !== P) return; desfazPedido(c); cySave(id); };
    const tab = await ensureTab(id, key, g);
    if (!tab || c.gen !== g) { naoEnviado(); return false; }
    P.tab = tab.id;
    if (!(await clearTab(c, tab, g))) { if (c.gen === g) pause(id, 'erro', `O /clear não foi confirmado na aba "${tab.name}". Confira a aba (a caixa de texto deve estar vazia) e clique em Continuar.`); naoEnviado(); return false; }
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
    desfazPedido(c);
    c.gen++; cancelWaits(c); c.esperando = null;
    if (extra.interromper) { try { if (isAlive(extra.interromper)) api.write(extra.interromper, '\x1b'); } catch { /* aba já encerrada */ } delete extra.interromper; }
    c.live = tipo === 'limite' && !extra.semAuto; // limite das janelas: com o app aberto, o Termix retoma sozinho quando ela virar
    const x0 = c.est.exec.pausa; // limite: avisa uma vez, não a cada nova conferência
    c.est = { ...c.est, fase: 'pausado', aviso: '' };
    c.est.exec.pausa = { tipo, motivo, desde: nowIso(), ...extra };
    cySave(id);
    const t = c.est.exec.tarefas[c.est.exec.k];
    if (tipo !== 'limite' || !(x0 && x0.tipo === 'limite')) notifyHuman(projOf(id), tabOf(c.est.dev) || tabOf(c.est.orq), `${t ? `${t.id}: ` : ''}${motivo}`);
  }
  function finish(id) {
    const c = cyOf(id), x = c.est.exec;
    c.gen++; c.live = false;
    c.est = { ...c.est, fase: 'concluido', concluido: nowIso(), aviso: '' };
    cySave(id);
    if (c.est.auto && c.est.auto.mutirao) { mutFim(id); return; } // implementação automática do Mutirão (DEV2-006)
    notifyHuman(projOf(id), tabOf(c.est.orq), `Projeto concluído: ${plural(x.feitas.length, 'tarefa', 'tarefas')} na branch ${x.branch || ''}.`);
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
    const ts = await call('tarefas', id);
    if (!ts || !ts.length) { c.est.aviso = 'O plano não tem tarefas no formato "## T1 — título". Peça ao orquestrador para regravar o plano nesse formato (Parar e Iniciar de novo).'; cySave(id); return false; }
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
    Object.assign(x, { k: x.k + 1, etapa: 'dev', tentativas: 0, extra: 0, refazer: null, enviadoDev: null, enviadoRev: null, pausa: null, retomar: false });
    c.est = { ...c.est, fase: 'execucao', aviso: '' };
    cySave(id);
    execLoop(id);
  }

  // limite de tentativas: 1 execução + MAX_REFAZER refações; cada "Continuar" depois da pausa dá mais uma (DEV2-007)
  const maxTent = (x) => MAX_REFAZER + 1 + (x.extra || 0);
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
        if (x.k >= x.tarefas.length) return finish(id);
        const t = x.tarefas[x.k];
        // DEV2-014: a política é lida no início de cada tarefa (editar no meio do ciclo vale a partir da próxima)
        if (x.etapa === 'dev' && !x.tentativas) {
          const pt = (await call('politicaTarefa', id, t)) || { deploy: t.deploy ? 'pausar' : '', humano: t.humano ? 'humano' : '' };
          if (!alive()) return;
          const liberada = (x.liberadas || []).includes(t.id);
          if (!liberada && (pt.humano || pt.deploy === 'pausar')) {
            if (t.deploy && pt.deploy === 'pausar') return pause(id, 'deploy', `Tarefa de DEPLOY: "${t.titulo}". O Termix só segue com a sua liberação.`, { gate: t.id });
            if (pt.humano === 'humano') return pause(id, 'humano', `A tarefa "${t.titulo}" precisa de você (acesso, dado ou decisão).`, { gate: t.id });
            return pause(id, 'humano', `Política: confirmar com você antes de cada tarefa. Próxima: ${t.id} — "${t.titulo}". Clique em Continuar para liberar.`, { gate: t.id, sempre: true });
          }
          // deploy automático: o Termix fará o deploy (DEV2-016); a tarefa fica marcada e o ciclo segue sem pausar à toa
          if (t.deploy && (pt.deploy === 'pendente' || pt.deploy === 'retido')) {
            x.feitas.push({ id: t.id, titulo: t.titulo, deploy: pt.deploy, data: nowIso() });
            Object.assign(x, { k: x.k + 1, etapa: 'dev', tentativas: 0, extra: 0, refazer: null, enviadoDev: null, enviadoRev: null });
            cySave(id);
            continue;
          }
        }
        const teto = await tetoDe(id);
        if (!alive()) return;
        if (teto) return pause(id, 'limite', teto.motivo, teto.auto ? {} : { semAuto: true });
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
            const text = await call('execPrompt', id, x.refazer ? 'refazer' : 'dev', t.id, { ...(x.refazer || {}), semCommit: !!t.semCommit });
            if (!(await ask(id, g, 'dev', text))) return;
          }
          const retomada = !!x.retomar;
          x.retomar = false;
          // conferência em código (zero token)
          const info = await call('gitInfo', id), res = await call('resultadoLer', id, t.id);
          if (!alive()) return;
          if (!info) return pause(id, 'erro', 'Não foi possível ler o git do projeto.');
          const mexeu = Object.keys(x.base.heads || {}).filter((b) => (info.heads[b] || null) !== (x.base.heads[b] || null));
          if (mexeu.length) return pause(id, 'erro', `A ${mexeu.join(', ')} mudou durante a ${t.id}. Isso é proibido: confira o projeto antes de continuar.`);
          if (info.branch !== x.branch) return pause(id, 'erro', `O Dev terminou a ${t.id} na branch "${info.branch || '?'}" em vez de "${x.branch}". Confira e clique em Continuar.`);
          const falta = [];
          const fresco = !!(res && res.existe && res.mtime >= Date.parse(x.enviadoDev) - 2000);
          const novo = !!(info.permitidaSha && info.permitidaSha !== x.base.sha);
          if (!fresco) falta.push(`resultados\\${t.id}.md`);
          // [SEM COMMIT] (DEV2-007): tarefa de validação/conferência; sem commit novo vale, desde que o Tk.md traga a validação
          if (t.semCommit) { if (fresco && !novo && !res.validacao) falta.push(`a linha "Validação: ..." em resultados\\${t.id}.md (tarefa [SEM COMMIT])`); }
          else if (!novo) falta.push(`um commit novo na branch ${x.branch}`);
          if (falta.length) {
            x.refazer = { falta: `faltou ${falta.join(' e ')}` };
            if (esgotou(x)) { Object.assign(x, { etapa: 'dev', enviadoDev: null }); return pause(id, 'humano', `A ${t.id} não ficou pronta em ${plural(x.tentativas, 'tentativa', 'tentativas')} (${retomada ? 'interrompida e ' : ''}faltou ${falta.join(' e ')}). Veja a aba "${DEV_NAME}", ajude e clique em Continuar (mais uma tentativa).`, { ajuda: true }); }
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
          if (!rv || !rv.ok || rv.mtime < Date.parse(x.enviadoRev) - 2000) return pause(id, 'erro', `O orquestrador não gravou revisoes\\${t.id}.json com o veredito. Veja a aba "${ORQ_NAME}" e clique em Continuar.`);
          x.ultimaRevisao = { id: t.id, veredito: rv.veredito, motivo: rv.motivo.slice(0, 300) };
          if (rv.veredito === 'aprovado') {
            x.feitas.push({ id: t.id, titulo: t.titulo, commit: x.semCommitOk ? '' : x.ultimoCommit, semCommit: !!x.semCommitOk, tentativas: x.tentativas });
            Object.assign(x, { k: x.k + 1, etapa: 'dev', tentativas: 0, extra: 0, refazer: null, enviadoDev: null, enviadoRev: null, semCommitOk: false });
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

  let tick = 0;
  // relógio da execução (zero token): retoma a pausa por limite quando a janela vira e pausa agente sem resposta
  setInterval(() => {
    for (const id of Object.keys(CY)) {
      const c = CY[id], e = c.est, x = e && e.exec;
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
        if (!isAlive(tid)) { pause(id, 'erro', 'A aba do agente fechou no meio da tarefa. Clique em Continuar para reabrir e seguir.'); continue; }
        const last = Math.max(c.esperando.desde, ACT[tid] || 0, (RT[tid] && RT[tid].lastData) || 0);
        const quem = c.esperando.key === 'orq' ? 'O orquestrador' : 'O Dev';
        const min = (ms) => (ms >= 60000 ? `${Math.round(ms / 60000)} min` : `${Math.round(ms / 1000)} s`);
        if (Date.now() - c.esperando.desde > T.turno) pause(id, 'erro', `${quem} não terminou o turno em ${min(T.turno)} (tempo limite). O Termix interrompeu o agente; veja a aba e clique em Continuar para conferir e seguir.`, { interromper: tid });
        else if (Date.now() - last > T.semResposta) pause(id, 'erro', `${quem} está sem responder há ${min(T.semResposta)}. O Termix interrompeu o agente; veja a aba e clique em Continuar.`, { interromper: tid });
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
    else if (e.fase === 'pausado') fase = PAUSA_TIT[x.pausa && x.pausa.tipo] || 'Pausado';
    else if (e.fase === 'parado') fase = 'Parado';
    else if (!c.live) fase = 'Pausado (o Termix foi fechado)';
    else fase = x.etapa === 'revisao' ? 'Revisão (orquestrador)' : 'Dev trabalhando';
    const rows = [
      ['Tarefa', e.fase === 'concluido' ? `${n}/${n}` : t ? `${x.k + 1}/${n} · ${esc(t.id)} — ${esc(t.titulo)}` : `${n}/${n}`],
      ['Fase', esc(fase)],
      ['Branch', esc(x.branch || '—')],
      ['Último commit', esc(x.ultimoCommit || '—')],
      ['Tentativas', e.fase === 'concluido' || !t ? '—' : `${x.tentativas || 0} de ${maxTent(x)}`],
      ['Limites', `5 h ${pctTxt(lim5())} · 7 d ${pctTxt(lim7r())}${usd != null ? ` · US$ ${usd.toFixed(2)}` : ''} <small>(teto: 5 h ${o.teto5}% · 7 d ${o.teto7}%${o.usd != null ? ` · US$ ${o.usd}` : ''})</small>`],
    ];
    if (x.ultimaRevisao) rows.push(['Última revisão', `${esc(x.ultimaRevisao.id)}: ${esc(x.ultimaRevisao.veredito)}${x.ultimaRevisao.motivo ? ` — ${esc(x.ultimaRevisao.motivo.slice(0, 160))}` : ''}`]);
    const feita = (id) => x.feitas.find((f) => f.id === id);
    const list = x.tarefas.map((tt, i) => {
      const f = feita(tt.id);
      const cls = f ? 'done' : i === x.k && e.fase !== 'concluido' ? 'cur' : '';
      const tags = `${tt.deploy ? ' <em class="vx-tag">DEPLOY</em>' : ''}${tt.humano ? ' <em class="vx-tag">HUMANO</em>' : ''}${tt.semCommit ? ' <em class="vx-tag">SEM COMMIT</em>' : ''}`;
      const extra = f ? (f.deploy === 'pendente' ? ' · deploy pendente' : f.deploy === 'retido' ? ' · deploy retido (Pausar deploy)' : f.humano ? ' · feita pelo humano' : f.semCommit ? ' · validada, sem commit' : f.commit ? ` · ${esc(f.commit.split(' ')[0])}` : '') : '';
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
      pausado: x && x.pausa ? `<b>${esc(PAUSA_TIT[x.pausa.tipo] || 'Pausado')}.</b> ${esc(x.pausa.motivo || '')}${(x.pausa.tipo === 'limite' && c.live) || /clique em "?Continuar/i.test(x.pausa.motivo || '') ? '' : x.pausa.gate ? ' Clique em "Continuar" para o Dev executar a tarefa, ou em "Já fiz, pular" se você mesmo a fez.' : ' Clique em "Continuar" quando quiser seguir.'}` : '',
      concluido: (e.auto && e.auto.mutirao && e.mutFim ? (e.mutFim.ok ? `<b>Mutirão concluído na ${esc(e.mutFim.branch || '')}.</b> Push feito pelo Termix (commit ${esc(String(e.mutFim.sha || '').slice(0, 8))}). Promover para a main é com você. ` : `<span class="mp-bad">O push da branch do dono falhou: ${esc(e.mutFim.motivo || '')}</span> `) : '') + (x ? `<b>Projeto concluído.</b> ${plural(x.feitas.length, 'tarefa feita', 'tarefas feitas')} na branch "${esc(x.branch || '')}"${x.feitas.some((f) => f.humano) ? `, ${x.feitas.filter((f) => f.humano).length} pelo humano` : ''}. A main/master não foi alterada.` : '<b>Projeto concluído.</b>') + (e.mutirao ? (e.mutirao.ok ? ` Entrega do Mutirão enviada na branch ${esc(e.mutirao.branch || '')}.` : ` <span class="mp-bad">Entrega do Mutirão não enviada: ${esc(e.mutirao.motivo || '')}</span>`) : ''),
      parado: `<b>Vibe Coding parado em "${esc(stepName)}".</b> Nada foi apagado e as abas continuam abertas. Clique em "${go}" para seguir.`,
      erro: `<b>O plano não ficou pronto.</b>`,
    }[e.fase] || '';
    const acts = [];
    if (e.fase === 'abrindo' && e.aviso && c.live) acts.push('<button class="btn sm" data-vc="send">Enviar o pedido agora</button>');
    if (e.fase === 'pronto' && !(c.form && c.form.modo === 'iniciar')) acts.push('<button class="btn sm pri" data-vc="antes">Executar plano…</button>'); // DEV2-014: antes, a tela "Antes de iniciar"
    if (e.fase === 'concluido' && e.mutFim && !e.mutFim.ok) acts.push('<button class="btn sm pri" data-vc="mutfim">Enviar a branch de novo</button>');
    if (e.fase === 'concluido' && e.mutirao && !e.mutirao.ok) acts.push('<button class="btn sm pri" data-vc="mutent">Enviar a entrega de novo</button>');
    if (paused || ['parado', 'erro'].includes(e.fase) || (e.fase === 'pausado' && !(x && x.pausa && x.pausa.tipo === 'limite' && c.live))) acts.push(`<button class="btn sm pri" data-vc="resume">${go}</button>`);
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
    const o = p.orcamento;
    const deploy = pode ? `
      <div class="vf"><label>Deploy na main</label>${sel('deploy.modo', DEPLOY_TXT, p.deploy.modo)}
        ${p.deploy.modo === 'marco' ? `<input type="text" class="inp vp-gap" data-vpf="deploy.marco" maxlength="200" placeholder="Marco, em texto livre. Ex.: v1.0 estável" value="${esc(p.deploy.marco)}">
        <label class="vf-chk"><input type="checkbox" data-vpf="deploy.marcoAtingido" ${p.deploy.marcoAtingido ? 'checked' : ''}> Marco atingido: a partir de agora o deploy é automático</label>` : ''}
        <small>O deploy é feito pelo Termix, em código, nunca pelo agente (a trava continua barrando a main para a IA). Voltar versão: git revert. A execução do deploy ainda não está disponível nesta versão; até lá, o deploy automático fica marcado "pendente" e o ciclo segue.</small></div>
      <div class="vf"><label>Receita de deploy <em class="opt">os comandos que o Termix vai rodar</em></label>
        <textarea class="inp ta" rows="3" data-vpf="deploy.receita" maxlength="4000" placeholder="Um comando por linha. Ex.: npm run build">${esc(p.deploy.receita)}</textarea>
        <small>Só fica gravada: nada é executado agora.</small></div>
      <div class="vf"><label>Portão de qualidade <em class="opt">precisa passar antes de qualquer deploy</em></label>
        <input type="text" class="inp" data-vpf="portao" maxlength="500" placeholder="${esc(inf.validacao || 'Ex.: npm test')}" value="${esc(p.portao)}">
        ${inf.validacao ? `<small>Sugestão do .claude/fluxo.json: <code>${esc(inf.validacao)}</code></small>` : ''}</div>`
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
    const mutNote = V.mut ? `<div class="vibe-note">Entrega pré-preenchida pela sua <b>parte do Mutirão</b> (branch ${esc(V.mut)}): a estrutura é a parte gravada pelo dono. Complete o que faltar (ex.: o fluxo desenhado) e inicie. Os agentes trabalham só na branch ${esc(V.mut)}.</div>` : '';
    const ent = V.entrega && V.entrega.mutirao ? `<div class="vibe-note">Entrega gerada pelo Termix na <b>implementação automática do Mutirão</b> (branch ${esc(V.entrega.mutirao.branch || '')}, ${esc(fmtDate(V.entrega.data))}): divisão, partes, entregas e conflitos da junção. O andamento está no painel acima.</div>` : V.entrega ? `<div class="vibe-note">Este projeto já tem uma entrega pronta, de ${esc(fmtDate(V.entrega.data))}. Ela continua guardada. Ao clicar em "Iniciar Vibe Coding", o Termix pede confirmação antes de gravar a versão nova.</div>` : '';
    return `<div class="vibe-form">
      <p>Entregue o projeto completo de uma vez. Com tudo preenchido, o Termix cria um orquestrador e um dev que trabalham sozinhos até o fim. Quanto mais claro, menos retrabalho. O que você preencher fica salvo como rascunho.</p>
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
    V.id = id || ''; V.mut = ''; V.saved = false; V.f = EMPTY(); V.fx = { fluxo: null, estrutura: null }; V.entrega = null; V.msg = null;
    if (V.id) {
      const [d, e] = await Promise.all([call('draftGet', V.id), call('entregaGet', V.id), cyLoad(V.id)]);
      if (!V || V.id !== id) return;
      V.entrega = e && e.status === 'pronta' ? e : null;
      V.mut = d && d.mutirao ? String(d.mutirao) : '';
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
          const vp = e.target.closest('[data-vp]'); // DEV2-014: tela "Antes de iniciar" / editar a política
          if (vp && V && V.id) polAct(V.id, vp.dataset.vp, vp);
          if (e.target.closest('[data-vyes]')) start(true);
          else if (e.target.closest('[data-vno]')) { V.msg = null; paint(); }
          const vc = e.target.closest('[data-vc]');
          if (vc && V && V.id) {
            const k = vc.dataset.vc, id = V.id;
            if (k === 'stop') stopCycle(id); else if (k === 'resume') resumeCycle(id); else if (k === 'send') sendPrompt(id, 'plano'); else if (k === 'answers') sendAnswers(id);
            else if (k === 'antes') polOpen(id, 'iniciar'); else if (k === 'poledit') polOpen(id, 'editar'); else if (k === 'deploypause') polPausarDeploy(id, true); else if (k === 'deployresume') polPausarDeploy(id, false);
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
      const pub = d && d.publicado;
      const tab = d && d.orq ? tabOf(d.orq) : null;
      main = `${pp.motivo ? `<div class="mp-warn">${esc(pp.motivo)}</div>` : ''}
        ${!pp.fluxo ? '<p class="mp-why">Projeto sem o fluxo Rocruzta: o Mutirão exige um remoto git (origin) que todos os sócios acessem.</p>' : ''}
        <dl class="mp-dl"><dt>Branch do dono</dt><dd>${esc(pp.branchDono || '—')}${pp.criar ? ` <small>(será criada a partir de ${esc(pp.atual || 'atual')} ao publicar)</small>` : ''}</dd><dt>Remoto</dt><dd>${esc(pp.remoto || 'nenhum')}</dd></dl>
        <div class="mp-sec"><b>1. Participantes</b> <small>nome e branch de cada sócio</small>${mutRowsHtml(bloq)}</div>
        <div class="mp-sec"><b>2. Divisão com o orquestrador</b>
          <p class="mp-small">O chat é o terminal da aba "${esc(MUT_NAME)}", ao lado. Converse com ele à vontade; "Gerar divisão" manda um pedido curto para ele gravar <code>mutirao/divisao.json</code> e uma parte por sócio.</p>
          <div class="vibe-confirm mp-left"><button class="btn sm" data-mp="chat" ${bloq}>${tab ? 'Ir para o chat' : 'Abrir o chat'}</button><button class="btn sm pri" data-mp="gerar" ${bloq || (MP.gerando ? 'disabled' : '')}>${MP.gerando ? 'Dividindo…' : MP.conf ? 'Gerar de novo' : 'Gerar divisão'}</button><button class="btn sm" data-mp="conf" ${MP.gerando ? 'disabled' : ''}>Conferir</button></div>
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
    MP.est.dono = r.dono;
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
    mutPaint();
    return ct;
  }

  // Sócio: registra a parte, pré-preenche a entrega do Vibe e abre o Vibe Coding nesse projeto.
  async function mutVibe(id) {
    const p = projOf(id);
    const r = await call('mutAplicar', id, p && p.path);
    if (!r || !r.ok) { mutMsg('bad', esc((r && r.motivo) || 'Não foi possível abrir a parte.')); return false; }
    try { S.settings.vibe = { ...(S.settings.vibe || {}), last: id }; save(); } catch { /* sem preferência */ }
    closeMutirao();
    openVibe();
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

  function openMutirao(pid) {
    const col = document.getElementById('col');
    if (!col) return;
    let id = pid || '';
    if (!id) { try { id = UI.cur && UI.cur.p && projOf(UI.cur.p) ? UI.cur.p : ''; } catch { /* sem projeto atual */ } }
    if (!id) { const ps = projects(); id = ps.length === 1 ? ps[0].id : ''; }
    if (MP) { if (id && MP.id !== id) mutSwitch(id); return; }
    const root = document.createElement('aside');
    root.className = 'mutp glass';
    MP = { id, root, est: null, conf: null, cont: null, rows: [], msg: null, busy: false, gerando: false, counting: false, autoBusy: false };
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

  /* gancho de teste: só existe com o app aberto em modo de teste (TERMIX_VIBE_TEST=1), porque o diálogo nativo de arquivo
     não é automatizável por CDP. Sem esse modo, nada é exposto e a interface não tem atalho escondido. */
  call('status').then((s) => {
    if (s && s.test) window.vibeTest = { open: () => openVibe(), pick: (k, p) => pick(k, p), template: (p) => template(p), start: (r) => start(r), state: () => (V ? { id: V.id, f: { ...V.f }, missing: missing(), entrega: V.entrega } : null),
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
      // DEV2-005: Mutirão. mut.* = os botões do painel; mutEntregar grava a entrega simulada do sócio (sem rodar o Vibe)
      mut: { open: (pid) => openMutirao(pid), close: () => closeMutirao(), rows: (r) => { if (!MP) return false; MP.rows = r; mutPaint(); return true; },
        state: () => (MP ? { id: MP.id, est: MP.est, conf: MP.conf, cont: MP.cont, rows: MP.rows, msg: MP.msg && MP.msg.html, gerando: MP.gerando } : null),
        auto: (o) => MP && mutAuto(MP.id, o || {}), autoPush: () => MP && mutAutoPush(MP.id), verVibe: () => MP && mutVerVibe(MP.id),
        gerar: () => MP && mutGerar(MP.id), conferir: () => MP && mutConferir(MP.id), publicar: () => MP && mutPublicar(MP.id), contar: () => MP && mutCount(MP.id), vibe: () => MP && mutVibe(MP.id),
        parte: async () => { for (const k of Object.keys(PART)) delete PART[k]; await checkPart(); const p = UI.cur && projOf(UI.cur.p); return p && PART[p.id] ? PART[p.id].r : null; } },
      mutEntregar: (id) => mutEntrega(id || (V && V.id), true) };
  });

  /* botões no cabeçalho: o app.js redesenha o #topbar inteiro; reponho os botões a cada redesenho */
  function mountTop() {
    const top = document.getElementById('topbar');
    if (!top) return;
    const cur = top.querySelector('.vibebtns');
    if (!on()) { if (cur) cur.remove(); closeMutirao(); return; }
    if (cur) { checkPart(); return; }
    const anchor = top.querySelector('[data-togact]');
    if (!anchor) return;
    const box = document.createElement('div');
    box.className = 'vibebtns';
    box.innerHTML = '<button class="vibebtn" data-vibe-open="vibe" title="Vibe Coding (experimental)"><i></i>Vibe Coding</button><button class="vibebtn mut" data-vibe-open="mutirao" title="Mutirão (experimental)"><i></i>Mutirão</button>';
    box.addEventListener('click', (e) => { const b = e.target.closest('[data-vibe-open]'); if (b) { e.stopPropagation(); openScreen(b.dataset.vibeOpen); } });
    const before = top.querySelector('#updchip') || anchor;
    top.insertBefore(box, before);
    checkPart();
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
      box.innerHTML = `<h5 style="margin:22px 0 8px">Experimental</h5><div class="card" style="padding:6px 18px"><div class="row"><div class="grow">Vibe Coding e Mutirão (experimental)<small>Mostra no cabeçalho os botões Vibe Coding e Mutirão. O Vibe Coding recebe a entrega, cria o orquestrador e o dev, prepara o plano e o executa tarefa a tarefa, com commits só numa branch própria (a main/master nunca é alterada); o Mutirão (só para o dono do projeto) divide o trabalho entre os sócios por branch e conta as entregas.</small></div><div class="seg"><button class="${v ? 'sel' : ''}" data-vibe-set="1">Sim</button><button class="${v ? '' : 'sel'}" data-vibe-set="0">Não</button></div></div></div>`;
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
  // DEV2-010: o Organizador (importar projeto com várias pastas) vem em arquivos próprios, carregados daqui (o index.html não muda)
  try {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'vibe/organizador.css'; document.head.appendChild(l);
    const s = document.createElement('script'); s.src = 'vibe/organizador.js'; document.body.appendChild(s);
  } catch (e) { console.error('vibe: organizador', e); }
})();
