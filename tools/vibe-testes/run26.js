// DEV2-026 — "Retomar projeto" no app de verdade (Electron isolado, agente falso, CDP, captura só do conteúdo do app). Sem IA real.
// Uso: node run26.js <raiz do Termix>
const { ROOT: ROOT_PADRAO, WORK } = require('./lib'); // raiz do repositório e pasta temporária do sistema
const fs = require('fs'), path = require('path'), crypto = require('crypto'); const { spawn, execFileSync } = require('child_process');
const ROOT = (process.argv[2] || ROOT_PADRAO);
const S = path.join(WORK, 'r26'), FAKE = path.join(WORK, 'fake');
const SHOTS = path.join(WORK, 'shots26'); fs.mkdirSync(SHOTS, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const T0 = Date.now(); const LOGF = path.join(WORK, 'run26.log'); fs.writeFileSync(LOGF, '');
const log = (...a) => { const l = `[${((Date.now() - T0) / 1000).toFixed(0)}s] ${a.join(' ')}`; console.log(l); fs.appendFileSync(LOGF, l + '\n'); };
let ok = 0, bad = 0; const check = (n, c, extra = '') => { if (c) ok++; else bad++; log(`${c ? 'OK  ' : 'FALHOU'} ${n}${extra ? ' — ' + extra : ''}`); };
const g = (dir, ...a) => { try { return execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); } catch (e) { return `ERRO ${String(e.stderr || e.message).split('\n')[0]}`; } };
const W = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); };
const R = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '');
async function inst(nome, port, projects, fresh = true, extraEnv = {}, extraState = {}) {
  const UD = path.join(S, nome, 'ud'), CFGD = process.env.CFGD_FIXO || path.join(S, nome, 'claude-cfg'), FCFG = path.join(S, nome, 'fake-cfg.json'), FLOG = FCFG + '.log';
  if (fresh) W(path.join(UD, 'state.json'), JSON.stringify({ projects, lastSeenVersion: require(path.join(ROOT, 'package.json')).version, settings: {}, ...extraState }, null, 2));
  if (fresh) W(path.join(CFGD, '.claude.json'), JSON.stringify({ projects: {} }));
  W(FCFG, JSON.stringify({ demora: 1500 }));
  const env = { ...process.env, PATH: `${FAKE};${process.env.PATH}`, FAKE_CFG: FCFG, TERMIX_VIBE_TEST: '1', TERMIX_VIBE_NO_OPEN: '1', CLAUDE_CONFIG_DIR: CFGD, TERMIX_VIBE_CLAUDE_JSON: path.join(CFGD, '.claude.json'), ...extraEnv };
  const el = spawn(path.join(ROOT, 'node_modules', 'electron', 'dist', 'electron.exe'), [ROOT, `--user-data-dir=${UD}`, `--remote-debugging-port=${port}`], { env, stdio: 'ignore' });
  let t = null; for (let i = 0; i < 60 && !t; i++) { await wait(500); try { t = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((x) => x.url.endsWith('renderer/index.html')); } catch {} }
  const ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const P = {}; ws.onmessage = (e) => { const m = JSON.parse(e.data); if (P[m.id]) { P[m.id](m); delete P[m.id]; } };
  await new Promise((r) => (ws.onopen = r));
  const send = (method, params) => new Promise((r) => { const i = ++id; P[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); const errs = []; ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.method === 'Runtime.exceptionThrown' || (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')) errs.push(JSON.stringify(m.params).slice(0, 300)); });
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  const ev = async (x) => { const m = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (m.result && m.result.exceptionDetails) log(`EXC[${nome}]`, JSON.stringify(m.result.exceptionDetails).slice(0, 300)); return m.result && m.result.result && m.result.result.value; };
  const js = async (x) => JSON.parse((await ev(`JSON.stringify(${x})`)) || 'null');
  const shot = async (n, sel) => {
    let clip = null;
    if (sel) { clip = await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;e.scrollIntoView({block:"start"});const r=e.getBoundingClientRect();return {x:Math.max(0,r.x-8),y:Math.max(0,r.y-8),width:Math.min(r.width+16,1280),height:Math.min(r.height+16,900-Math.max(0,r.y-8)),scale:1}})()`); await wait(250); }
    const m = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip } : {}) });
    fs.writeFileSync(path.join(SHOTS, `${n}.png`), Buffer.from(m.result.data, 'base64')); log('captura', n);
  };
  const until = async (n, fn, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await wait(500); } log(`TEMPO ESGOTADO esperando: ${n}`); return null; };
  const click = (sel) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(e){e.click();return true}return false})()`);
  const setv = (sel, v) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return false;e.value=${JSON.stringify(v)};e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
  const txt = (sel) => ev(`(document.querySelector(${JSON.stringify(sel)})||{}).innerText||''`);
  const aba = (p, rx) => js(`S.projects.find(p=>p.id===${JSON.stringify(p)}).tabs.map(t=>t.name)`).then((l) => (l || []).some((n) => rx.test(n)));
  const st = () => js('delegarTest.state()');
  const evts = () => js('UI.events.map(e=>e.msg)');
  return { nome, UD, el, ev, js, shot, until, click, setv, txt, aba, st, evts, errs, flog: () => R(FLOG), kill: () => { try { ws.close(); } catch {} try { el.kill(); } catch {} } };
}

fs.rmSync(S, { recursive: true, force: true });
const CFGD = path.join(S, 'cfg'); process.env.CFGD_FIXO = CFGD;
const mkProj = (nome, estrutura, dataCommit) => {
  const d = path.join(S, 'pj', nome); fs.mkdirSync(d, { recursive: true }); execFileSync('git', ['init', '-q', '-b', 'dev2', d]);
  g(d, 'config', 'user.name', 'T'); g(d, 'config', 'user.email', 't@t');
  W(path.join(d, 'README.md'), `# ${nome}\n`); W(path.join(d, 'package.json'), JSON.stringify({ name: nome, scripts: { test: 'node t.js' } }));
  if (estrutura) { W(path.join(d, 'CLAUDE.md'), `# ${nome}\n\nGuia do projeto ${nome}, com as regras e o jeito de rodar.\n`); W(path.join(d, 'docs/TASKS.md'), '# Tarefas\n\n## Em andamento\n\n### TASK-7 — Fechar o carrinho\n\n## Pendentes\n\n- Pagamento\n\n## Concluídas\n\n- Login\n'); W(path.join(d, 'docs/ESTADO.md'), '# Estado\n\n## Onde paramos\nCarrinho pela metade.\n\n## Próximo passo\nLigar o carrinho ao pagamento.\n'); }
  g(d, 'add', '-A');
  if (dataCommit) execFileSync('git', ['-C', d, 'commit', '-qm', `inicio ${nome}`], { env: { ...process.env, GIT_COMMITTER_DATE: dataCommit, GIT_AUTHOR_DATE: dataCommit } }); // DEV2-028: commit antigo
  else g(d, 'commit', '-qm', `inicio ${nome}`);
  return d;
};
const hojeLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const H = 3600e3, now = Date.now();
const conv = (pasta, horas, titulo, kb = 4) => { const id = crypto.randomUUID(); const f = path.join(CFGD, 'projects', pasta.replace(/[^a-zA-Z0-9]/g, '-'), `${id}.jsonl`); W(f, `${JSON.stringify({ type: 'custom-title', customTitle: titulo })}\n${'x'.repeat(kb * 1024)}\n`); const t = new Date(now - horas * H); fs.utimesSync(f, t, t); return id; };
const pj = (id, name, p, extra = {}) => ({ id, name, path: p, imported: true, archived: false, tabs: [], activeTab: null, g: 0, open: true, ...extra });
const PSEM = mkProj('sem'), PCOM = mkProj('com', true), PCIC = mkProj('ciclo', true), PCHAT = mkProj('chat', true), PNOVA = mkProj('nova'), PNOVA2 = mkProj('nova-dev'), PJA = mkProj('ja', true);
// DEV2-028: Organizador com 2 pastas (a 1ª da lista tem o commit mais ANTIGO: a principal tem de ser a 2ª, pela data) e Novidades
const PORG1 = mkProj('org28-velha', false, '2020-01-05T10:00:00'), PORG2 = mkProj('org28-nova', true), PNOV = mkProj('novidades', true);
conv(PSEM, 1, 'Loja: carrinho'); conv(PSEM, 5, 'Loja: pagamento'); conv(PNOVA, 2, 'Nova: api'); conv(PNOVA2, 3, 'Nova: tela'); conv(PNOVA2, 9, 'Nova: antigo');
const tabChat = { id: 'tc1', name: 'Conversa', kind: 'chat', open: true, archived: false, agent: 'claude', sessionId: 's-c1', started: true, color: '#888', perm: 'n' };
const PROJS = [pj('p26sem', 'Sem estrutura', PSEM), pj('p26com', 'Com estrutura', PCOM), pj('p26cic', 'Com ciclo', PCIC), pj('p26chat', 'Modo chat', PCHAT, { tabs: [tabChat], activeTab: 'tc1' })];
// ciclo parado do Vibe (como fica ao reabrir o app: "Pausado")
W(path.join(S, 'r26', 'ud', 'vibe', 'p26cic', 'estado.json'), JSON.stringify({ versao: 1, fase: 'pausado', rodada: 0, orq: 'x-orq', dev: 'x-dev', iniciado: new Date().toISOString(), projectId: 'p26cic' }));

const txtBtns = (X) => X.js('[...document.querySelectorAll("#modalRoot .dlg [data-mb]")].map(b=>b.textContent.trim())');
const clickBtn = (X, rx) => X.ev(`(()=>{const b=[...document.querySelectorAll("#modalRoot .dlg button")].find(b=>${rx}.test(b.textContent));if(b){b.click();return true}return false})()`);
const priBtn = (X) => X.ev('(document.querySelector("#modalRoot .dlg button.pri")||{}).textContent||""');
const modalAberto = (X) => X.ev('!!document.querySelector("#modalRoot .dlg")');
const abas = (X, id) => X.js(`S.projects.find(p=>p.id===${JSON.stringify(id)}).tabs.map(t=>t.name)`);
const cur = (X, id) => X.ev(`(UI.cur={p:${JSON.stringify(id)},page:'Terminais'},UI.last=${JSON.stringify(id)},renderAll(),1)`);

const vc = async (X, ...a) => JSON.parse((await X.ev(`window.termix.vibe(${a.map((x) => JSON.stringify(x)).join(",")}).then((r) => JSON.stringify(r === undefined ? null : r))`)) || "null");
(async () => {
  const X = await inst('r26', 9426, PROJS, true);
  await wait(3000);
  check('ganchos: TermixRet carregado', await X.until('ret', async () => (await X.ev('typeof TermixRet')) === 'object', 30000));
  const fl = () => X.flog();
  const nHook = (tipo) => (fl().match(new RegExp(`hook SessionStart ${tipo}`, 'g')) || []).length;
  const fechaModal = () => X.ev('(document.querySelectorAll("#modalRoot [data-mclose]").forEach(b=>b.click()),1)');
  const colunas = () => fl().split('\n').filter((l) => /"coleta":true/.test(l)).map((l) => JSON.parse(l));

  /* ===== 1. sem estrutura ===== */
  await cur(X, 'p26sem');
  check('1 pop-up abre sozinho na 1ª abertura do projeto', !!(await X.until('modal', async () => modalAberto(X), 15000)));
  const t1 = await X.txt('#modalRoot .dlg h2'); const b1 = await txtBtns(X);
  check('1 título "Retomar projeto: Sem estrutura"', /Retomar projeto: Sem estrutura/.test(t1), t1);
  const b1f = b1;
  check('1 botões: Agora não / Retomar últimas conversas / Inicializar e criar estrutura', JSON.stringify(b1f) === JSON.stringify(['Agora não', 'Retomar últimas conversas', 'Inicializar e criar estrutura']), JSON.stringify(b1));
  check('1 botão principal = "Inicializar e criar estrutura" (não há caminho sem estrutura)', (await priBtn(X)) === 'Inicializar e criar estrutura');
  const corpo = await X.txt('#modalRoot .dlg');
  check('1 aviso de falta de estrutura legível', /não tem estrutura legível/.test(corpo));
  const cks = await X.js('[...document.querySelectorAll("#modalRoot [data-rc]")].map(c=>c.checked)');
  check('1 lista de chats antigos: 2 chats, só o mais recente marcado', cks.length === 2 && cks[0] === true && cks[1] === false, JSON.stringify(cks));
  check('1 "Copiar prompt" presente + aviso de custo', (await X.ev('!!document.querySelector("#modalRoot [data-rcopy]")')) && /reprocessa o histórico inteiro/.test(corpo));
  await X.shot('n26-1-popup-sem-estrutura', '#modalRoot .dlg');
  await clickBtn(X, '/^Agora não$/'); await wait(800);
  check('1 "Agora não": nenhuma aba criada', (await abas(X, 'p26sem')).length === 0);
  await cur(X, 'p26com'); await wait(300); await cur(X, 'p26sem'); await wait(4000);
  const tAberto = (await modalAberto(X)) ? await X.txt('#modalRoot .dlg h2') : '';
  check('1 trocar de projeto e voltar não reabre o pop-up do projeto', !/Sem estrutura/.test(tAberto), tAberto);

  /* ===== 2. com estrutura: Inicializar (abas novas) ===== */
  await cur(X, 'p26com');
  await X.until('modal com', async () => /Com estrutura/.test(await X.txt('#modalRoot .dlg h2')), 15000);
  const b2 = await txtBtns(X);
  check('2 botão principal = "Inicializar orquestrador e dev"', (await priBtn(X)) === 'Inicializar orquestrador e dev', JSON.stringify(b2));
  const c2 = await X.txt('#modalRoot .dlg');
  check('2 resumo sem IA: tarefa "Fechar o carrinho", próximo passo, branch dev2, sem aviso de estrutura', /Fechar o carrinho/.test(c2) && /Ligar o carrinho ao pagamento/.test(c2) && /dev2/.test(c2) && !/não tem estrutura legível/.test(c2));
  await X.shot('n26-2-popup-com-estrutura', '#modalRoot .dlg');
  await clickBtn(X, '/^Inicializar orquestrador e dev$/');
  await X.until('2 abas', async () => { const a = await abas(X, 'p26com'); return a.includes('Orquestrador') && a.includes('Dev'); }, 60000);
  check('2 Inicializar sem abas: cria Orquestrador e Dev', JSON.stringify((await abas(X, 'p26com')).sort()) === JSON.stringify(['Dev', 'Orquestrador']));
  await X.until('pedido retomar', async () => /\[Orquestrador\] pedido retomar/.test(fl()), 60000);
  check('2 o orquestrador recebeu o pedido (retomar)', /\[Orquestrador\] pedido retomar/.test(fl()));
  check('2 o dev não recebeu nada', !/\[Dev\] pedido/.test(fl()));
  await X.shot('n26-3-abas-criadas', '#topbar');
  const vibe = await X.until('Vibe pré-preenchido', async () => { const t = await X.ev('document.body.innerText'); return /leva o projeto sozinho até a próxima entrega/.test(t) ? t : null; }, 60000);
  check('2 Vibe de tarefa abre com a nota "…leva o projeto sozinho até a próxima entrega ou até a conclusão."', !!vibe);
  const dr = await vc(X, "draftGet", "p26com");
  check('2 Vibe: pendência principal preenchida (tarefa em andamento + próximo passo)', !!(dr && dr.tarefa && /Fechar o carrinho/.test(dr.tarefa.oQue) && /Ligar o carrinho ao pagamento/.test(dr.tarefa.oQue)), dr && dr.tarefa ? dr.tarefa.oQue.slice(0, 120) : 'sem draft');
  await X.shot('n26-4-vibe-preenchido');
  await fechaModal();

  /* ===== 2b. Inicializar de novo: /clear nas duas abas existentes ===== */
  const antes = nHook('clear'); const nAbas = (await abas(X, 'p26com')).length;
  await X.ev('(TermixRet.abrirPopup(S.projects.find(p=>p.id==="p26com"),true),1)');
  await X.until('modal 2b', async () => modalAberto(X), 15000);
  await clickBtn(X, '/^Inicializar orquestrador e dev$/');
  await X.until('2 clears', async () => nHook('clear') - antes >= 2, 90000);
  await wait(2500);
  check('2b Inicializar com abas existentes: /clear nas duas (Orquestrador e Dev)', nHook('clear') - antes === 2, `clears novos=${nHook('clear') - antes}`);
  check('2b não criou abas novas', (await abas(X, 'p26com')).length === nAbas);
  await X.until('pedido 2', async () => (fl().match(/\[Orquestrador\] pedido retomar/g) || []).length >= 2, 60000);
  check('2b o orquestrador recebeu o pedido de novo; o dev continuou sem pedido', (fl().match(/\[Orquestrador\] pedido retomar/g) || []).length === 2 && !/\[Dev\] pedido/.test(fl()));
  await wait(2500); await fechaModal();

  /* ===== 3. ciclo do Vibe parado ===== */
  await cur(X, 'p26cic');
  check('3 pop-up com ciclo abre', !!(await X.until('modal cic', async () => /Com ciclo/.test(await X.txt('#modalRoot .dlg h2')), 15000)));
  const b3 = await txtBtns(X);
  check('3 "Continuar ciclo" é o botão principal; Inicializar e Retomar ficam ao lado', (await priBtn(X)) === 'Continuar ciclo' && b3.includes('Inicializar orquestrador e dev') && b3.includes('Retomar últimas conversas'), JSON.stringify(b3));
  const c3 = await X.txt('#modalRoot .dlg');
  check('3 mostra "Ciclo do Vibe" parado na fase pausado', /Ciclo do Vibe[\s\S]*pausado/.test(c3));
  check('3 explica que o /clear nunca toca nas abas do ciclo', /nunca toca nas abas do ciclo/.test(c3));
  await X.shot('n26-5-popup-ciclo', '#modalRoot .dlg');
  await clickBtn(X, '/^Agora não$/'); await wait(800);

  /* ===== 4. modo chat: o pop-up abre também (DEV2-028), com os mesmos botões ===== */
  await cur(X, 'p26chat');
  check('4 projeto em modo chat (bolhas): o pop-up abre', !!(await X.until('modal chat', async () => /Modo chat/.test(await X.txt('#modalRoot .dlg h2')), 15000)));
  const b4 = await txtBtns(X);
  check('4 modo chat: mesmos botões (Agora não / Retomar últimas conversas / Inicializar orquestrador e dev)', JSON.stringify(b4) === JSON.stringify(['Agora não', 'Retomar últimas conversas', 'Inicializar orquestrador e dev']), JSON.stringify(b4));
  /* 4b. outro pop-up passa por cima: a promessa resolve, a vigia não trava e o pop-up volta quando o outro fecha */
  await X.ev("(window.__outro = modal({ title: 'Outro pop-up', body: '<p>teste</p>', buttons: [['Fechar', null]] }), 1)");
  await wait(2000);
  check('4b outro pop-up trocou o "Retomar projeto" (sobrescrito)', /Outro pop-up/.test(await X.txt('#modalRoot .dlg h2')));
  check('4b o dia NÃO foi marcado (o pop-up não foi respondido)', (await vc(X, 'retPopupDia', 'p26chat')) === null);
  await clickBtn(X, '/^Fechar$/');
  check('4b vigia não travou: o "Retomar projeto" volta depois que o outro fecha', !!(await X.until('modal chat de novo', async () => /Modo chat/.test(await X.txt('#modalRoot .dlg h2')), 15000)));
  await clickBtn(X, '/^Agora não$/'); await wait(800);
  check('4b respondido ("Agora não"): o dia de hoje fica gravado para o projeto', (await vc(X, 'retPopupDia', 'p26chat')) === hojeLocal());

  /* ===== 4c. 1ª abertura do dia x 2ª no mesmo dia ===== */
  await X.ev('(TermixRet.vistos.clear(), 1)'); // como reabrir o app no mesmo dia (a memória da sessão some; o dia gravado fica)
  await cur(X, 'p26sem'); await wait(4500);
  check('4c mesmo dia (memória da sessão limpa): o pop-up NÃO abre de novo', !(await modalAberto(X)));
  await X.ev("(window.__retHoje = '2099-01-02', 1)"); // virou o dia
  check('4c outro dia: o pop-up abre de novo na 1ª abertura', !!(await X.until('modal dia novo', async () => /Sem estrutura/.test(await X.txt('#modalRoot .dlg h2')), 15000)));
  await clickBtn(X, '/^Agora não$/'); await wait(800);
  check('4c o dia novo fica gravado', (await vc(X, 'retPopupDia', 'p26sem')) === '2099-01-02');
  await vc(X, 'retPopupMarcar', 'p26sem', hojeLocal()); // volta ao dia real sem reabrir o pop-up deste projeto
  await X.ev('(delete window.__retHoje, 1)'); await wait(3000);
  check('4c de volta ao dia real (já marcado): sem pop-up', !(await modalAberto(X)));

  /* ===== 5. Retomar últimas conversas (aviso de custo) ===== */
  await X.ev('(TermixRet.abrirPopup(S.projects.find(p=>p.id==="p26sem"),true),1)');
  await X.until('modal 5', async () => modalAberto(X), 15000);
  check('5 aviso de custo visível: "reprocessa o histórico inteiro e gasta bem mais tokens"', /reprocessa o histórico inteiro e gasta bem mais tokens/.test(await X.txt('#modalRoot .dlg')));
  await clickBtn(X, '/^Retomar últimas conversas$/');
  await X.until('5 abas', async () => (await abas(X, 'p26sem')).length >= 2, 60000);
  check('5 Retomar: duas abas (Orquestrador e Dev) com as conversas mais recentes', JSON.stringify((await abas(X, 'p26sem')).sort()) === JSON.stringify(['Dev', 'Orquestrador']), JSON.stringify(await abas(X, 'p26sem')) + ' tabs=' + JSON.stringify(await X.js('S.projects.find(p=>p.id==="p26sem").tabs.map(t=>[t.name,t.open,t.started,t.sessionId])')) + ' ' + JSON.stringify(await X.js('S.projects.map(p=>p.id+":"+p.tabs.length)')));
  await wait(2500);
  check('5 evento "Retomar" registra o custo', (await X.js('UI.events.map(e=>e.msg)')).some((m) => /reprocessa o histórico inteiro e gasta mais tokens/.test(m)));

  /* ===== 6. adicionar: oferta "Criar estrutura do projeto" + coleta em segundo plano ===== */
  await X.ev(`(S.projects.push(${JSON.stringify(pj('p26nova', 'Projeto novo', PNOVA))}),save(),renderAll(),TermixRet.vistos.add('p26nova'),1)`);
  await X.ev(`(window.__rp = TermixRet.aoAdicionar(S.projects.find(p=>p.id==="p26nova"),{pastas:[${JSON.stringify(PNOVA)},${JSON.stringify(PNOVA2)}]}),1)`);
  check('6 oferta "Criar estrutura do projeto" ao adicionar', !!(await X.until('oferta', async () => /Criar estrutura do projeto/.test(await X.txt('#modalRoot .dlg h2')), 20000)));
  const ck6 = await X.js('[...document.querySelectorAll("#modalRoot [data-rc]")].map(c=>c.checked)');
  check('6 lista com chats das DUAS pastas (3 chats), mais recente marcado', ck6.length === 3 && ck6[0] === true, JSON.stringify(ck6));
  const custo1 = (await X.txt('#retLista')).replace(/\s+/g, ' ');
  await X.ev('(document.querySelectorAll("#modalRoot [data-rc]")[1].click(),1)'); await wait(400);
  const custo2 = (await X.txt('#retLista')).replace(/\s+/g, ' ');
  check('6 marcar mais um chat atualiza o custo estimado', custo1 !== custo2, `${custo1.slice(-90)} => ${custo2.slice(-90)}`);
  await X.shot('n26-6-oferta-ao-adicionar', '#modalRoot .dlg');
  await clickBtn(X, '/^Criar estrutura$/');
  const card = await X.until('cartão da coleta', async () => X.ev('!!document.querySelector("[data-retcard]")'), 20000);
  check('6 cartão da coleta em segundo plano aparece (k/N)', !!card);
  if (card) await X.shot('n26-7-coleta-progresso', '[data-retcard]');
  await X.until('pedido estrutura', async () => /\[Orquestrador\] pedido estrutura/.test(fl()), 120000);
  const col = colunas();
  check('6 coleta: 2 chats marcados, um por vez, via claude -p --resume', col.length === 2 && col.every((c) => c.args.includes('-p') && c.args.includes('--resume')), `coletas=${col.length}`);
  check('6 coleta só leitura: --fork-session, --tools "", dontAsk, sonnet, json', col.length > 0 && col.every((c) => c.args.includes('--fork-session') && c.args[c.args.indexOf('--tools') + 1] === '' && c.args.includes('dontAsk') && c.args.includes('sonnet') && c.args.includes('json')), col[0] ? col[0].args.join(' ').slice(0, 220) : '');
  check('6 prompt fixo pelo stdin (não na linha de comando)', col.length > 0 && col.every((c) => c.stdin.length > 0));
  await X.until('arquivos', async () => fs.existsSync(path.join(PNOVA, 'docs/ESTADO.md')), 60000);
  check('6 estrutura gravada: CLAUDE.md (seção acrescentada), docs/TASKS.md, docs/ESTADO.md', /Estrutura do projeto/.test(R(path.join(PNOVA, 'CLAUDE.md'))) && fs.existsSync(path.join(PNOVA, 'docs/TASKS.md')) && fs.existsSync(path.join(PNOVA, 'docs/ESTADO.md')));
  check('6 sem commit automático: 1 commit só e árvore com mudanças', g(PNOVA, 'rev-list', '--count', 'HEAD') === '1' && g(PNOVA, 'status', '--porcelain').length > 0);
  check('6 pasta secundária intacta (nada movido nem apagado)', fs.existsSync(path.join(PNOVA2, 'README.md')) && !fs.existsSync(path.join(PNOVA2, 'docs')));
  await X.until('abas 6', async () => { const a = await abas(X, 'p26nova'); return a.includes('Orquestrador') && a.includes('Dev'); }, 60000);
  check('6 o projeto entra com UM orquestrador e UM dev', JSON.stringify((await abas(X, 'p26nova')).sort()) === JSON.stringify(['Dev', 'Orquestrador']));
  await wait(3000); await fechaModal();

  /* ===== 6b. projeto que já tem estrutura: entra direto, sem coleta ===== */
  await X.ev(`(S.projects.push(${JSON.stringify(pj('p26ja', 'Projeto pronto', PJA))}),save(),renderAll(),1)`);
  const colAntes = colunas().length; log('modal antes do 6b:', await modalAberto(X), await X.txt('#modalRoot .dlg h2'));
  await X.ev('(window.__rj = TermixRet.aoAdicionar(S.projects.find(p=>p.id==="p26ja"),{}).then(v=>{window.__rjv=String(v)}),1)');
  await X.until('abas ja', async () => { const a = await abas(X, 'p26ja'); return a.includes('Orquestrador') && a.includes('Dev'); }, 60000);
  log('rjv=', await X.ev('window.__rjv'), 'est=', JSON.stringify(await vc(X, 'retEstrutura', PJA)));
  check('6b já estruturado: sem oferta, entra direto com orquestrador e dev', !/Criar estrutura do projeto/.test(await X.txt('#modalRoot .dlg h2')) && (await abas(X, 'p26ja')).length === 2, JSON.stringify(await abas(X, 'p26ja')) + ' modal=' + (await X.txt('#modalRoot .dlg')).replace(/\s+/g, ' ').slice(0, 300) + ' ' + JSON.stringify(await X.js('S.projects.map(p=>p.id+":"+p.tabs.length)')));
  check('6b sem coleta em segundo plano', colunas().length === colAntes);
  await wait(2500);

  /* ===== 8. Organizador com 2 pastas + "Organizar com IA" (DEV2-028): sem projeto extra, termina com Orquestrador + Dev ===== */
  await fechaModal(); await wait(500);
  const pr8 = JSON.parse((await X.ev(`orgTest.analisar(${JSON.stringify([PORG1, PORG2])}).then((an) => JSON.stringify(orgTest.linhas(an).map((r) => r.principal)))`)) || 'null');
  check('8 pasta principal pela data do commit: a 2ª pasta (commit mais novo), não a 1ª da lista', JSON.stringify(pr8) === '[false,true]', JSON.stringify(pr8));
  const nProj8 = await X.js('S.projects.length');
  const nRet8 = (fl().match(/\[Orquestrador\] pedido retomar/g) || []).length;
  await X.ev(`(window.__org8 = orgTest.mapaDe(${JSON.stringify([PORG1, PORG2])}, 'Org28'), 1)`);
  check('8 mapa do projeto com 2 pastas abre', !!(await X.until('mapa 8', async () => /Mapa do projeto: Org28/.test(await X.txt('#modalRoot .dlg h2')), 20000)));
  await X.shot('n26-8-mapa-2-pastas', '#modalRoot .dlg');
  await clickBtn(X, '/^Organizar com IA$/');
  const pid8 = await X.until('projeto real 8', async () => X.ev(`(S.projects.find((p) => String(p.path).toLowerCase() === ${JSON.stringify(PORG2.toLowerCase())}) || {}).id || ''`), 30000);
  await X.until('abas 8', async () => { const a = pid8 ? await abas(X, pid8) : []; return a.includes('Orquestrador') && a.includes('Dev'); }, 60000);
  check('8 o projeto real (pasta principal) termina com Orquestrador + Dev', !!pid8 && JSON.stringify((await abas(X, pid8)).sort()) === JSON.stringify(['Dev', 'Orquestrador']), pid8 ? JSON.stringify(await abas(X, pid8)) : 'sem projeto');
  check('8 sem projeto extra "Organizador · Org28" e sem aba "Organizador" (só 1 projeto novo)', !(await X.js('S.projects.map((p) => p.name)')).some((n) => /^Organizador ·/.test(n)) && !(await X.js('S.projects.some((p) => p.tabs.some((t) => /^Organizador$/.test(t.name)))')) && (await X.js('S.projects.length')) === nProj8 + 1, JSON.stringify(await X.js('S.projects.map((p) => p.name)')));
  await X.until('pedido 8', async () => (fl().match(/\[Orquestrador\] pedido retomar/g) || []).length > nRet8, 60000);
  check('8 o orquestrador recebeu o pedido curto de retomada; o dev, nada', (fl().match(/\[Orquestrador\] pedido retomar/g) || []).length === nRet8 + 1 && !/\[Dev\] pedido/.test(fl()));
  const ped8 = pid8 ? R(path.join(X.UD, 'retomar', pid8, 'pedido-retomar.md')) : '';
  check('8 o pedido traz o dossiê das 2 pastas e pede o resumo do projeto e as tarefas', /Dossiê das pastas/.test(ped8) && /org28-velha/.test(ped8) && /org28-nova/.test(ped8) && /resumo do projeto/.test(ped8) && /tarefas pendentes/.test(ped8), ped8.slice(0, 200));
  check('8 a pasta não principal ficou intacta (nada criado nem alterado)', g(PORG1, 'status', '--porcelain') === '' && !fs.existsSync(path.join(PORG1, 'docs')));
  await wait(1500); await X.shot('n26-9-organizador-fim');
  await wait(2500); await fechaModal();

  /* ===== 7. aviso ao fechar o app com ciclo rodando ===== */
  await X.ev('(TermixVibeBridge.cicloAtivos = () => [{ id: "p26cic", nome: "Com ciclo", auto: false, fase: "executando" }], 1)');
  await wait(4500);
  const lista = await vc(X, "retLista");
  check('7 o processo principal sabe quais ciclos rodam (retLista)', Array.isArray(lista) && lista.length === 1 && lista[0].nome === 'Com ciclo', JSON.stringify(lista));
  const dest = (await (await fetch('http://127.0.0.1:9426/json/version')).json()).webSocketDebuggerUrl;
  const bws = new WebSocket(dest); await new Promise((r) => (bws.onopen = r)); bws.send(JSON.stringify({ id: 1, method: 'Browser.close' }));
  await wait(5000);
  check('7 fechar com ciclo rodando: o app NÃO fecha (o aviso "Fechar e interromper / Cancelar" espera resposta)', X.el.exitCode === null, `exitCode=${X.el.exitCode}`);
  try { bws.close(); } catch {}
  log('ERROS DO APP:', JSON.stringify(X.errs).slice(0, 1500)); log('FAKELOG:', fl().split(String.fromCharCode(10)).slice(-12).join(' | ').slice(0, 900));
  check('0 sem exceções no console do app', X.errs.length === 0, X.errs.slice(0, 2).join(' | ').slice(0, 300));
  X.kill(); await wait(2500);

  /* ===== 9. Novidades abertas antes do pop-up + reabrir no mesmo dia (instância própria; DEV2-028) ===== */
  const PN = [pj('p26nov', 'Com novidades', PNOV)];
  let Y = await inst('r26n', 9427, PN, true, {}, { lastSeenVersion: '0.0.1' }); // como a 1ª abertura depois de atualizar
  await Y.until('TermixRet Y', async () => (await Y.ev('typeof TermixRet')) === 'object', 30000);
  await cur(Y, 'p26nov');
  check('9 as Novidades abrem na 1ª abertura depois de atualizar', !!(await Y.until('novidades', async () => /Novidades/.test(await Y.txt('#modalRoot .dlg h2')), 30000)));
  await wait(5000);
  check('9 com as Novidades abertas, o pop-up espera (as Novidades continuam na tela)', /Novidades/.test(await Y.txt('#modalRoot .dlg h2')));
  await Y.shot('n26-10-novidades', '#modalRoot .dlg');
  await clickBtn(Y, '/^Entendi$/');
  check('9 fechadas as Novidades, o pop-up "Retomar projeto" abre', !!(await Y.until('pop-up depois das novidades', async () => /Retomar projeto: Com novidades/.test(await Y.txt('#modalRoot .dlg h2')), 15000)));
  await Y.shot('n26-11-popup-depois-das-novidades', '#modalRoot .dlg');
  await clickBtn(Y, '/^Agora não$/'); await wait(1000);
  check('9 respondido: dia de hoje gravado', (await vc(Y, 'retPopupDia', 'p26nov')) === hojeLocal());
  check('9 sem exceções no console (1ª abertura)', Y.errs.length === 0, Y.errs.slice(0, 2).join(' | ').slice(0, 300));
  Y.kill(); await wait(2500);
  Y = await inst('r26n', 9427, PN, false); // reabrir o app no mesmo dia
  await Y.until('TermixRet Y2', async () => (await Y.ev('typeof TermixRet')) === 'object', 30000);
  await cur(Y, 'p26nov'); await wait(7000);
  check('9 reabrir o app no mesmo dia: sem Novidades e sem pop-up', !(await modalAberto(Y)), await Y.txt('#modalRoot .dlg h2'));
  check('9 sem exceções no console (reabertura)', Y.errs.length === 0, Y.errs.slice(0, 2).join(' | ').slice(0, 300));
  Y.kill(); await wait(1500);
  log(`\n${ok} OK, ${bad} FALHOU`);
  process.exit(bad ? 1 : 0);
})().catch((e) => { log('ERRO FATAL', e.stack); process.exit(2); });
