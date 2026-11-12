// DEV2-024 (reescrito na DEV2-026 para projeto único) — teste SEM TOKENS (CDP, agente falso, instância isolada): Configurações sem chaves, partindo de um state.json
// com as chaves desligadas; Vibe Coding no cabeçalho; Usar pasta existente com uma e com várias pastas (mapa com as
// conversas recomendadas, Carregar); Novo mutirão com várias pastas. Uso: node run24.js <raiz do Termix>
const { ROOT: ROOT_PADRAO, WORK } = require('./lib'); // raiz do repositório e pasta temporária do sistema
const fs = require('fs'), path = require('path'); const { spawn, execFileSync } = require('child_process');
const ROOT = (process.argv[2] || ROOT_PADRAO);
const S = path.join(WORK, 'r24'), UD = path.join(S, 'ud'), CFGD = path.join(S, 'claude-cfg'), PORT = 9424;
const FAKE = path.join(WORK, 'fake'), FCFG = path.join(S, 'fake-cfg.json'), FLOG = FCFG + '.log';
const SHOTS = path.join(WORK, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const T0 = Date.now(); const LOGF = path.join(WORK, 'run24.log'); fs.writeFileSync(LOGF, '');
const log = (...a) => { const l = `[${((Date.now() - T0) / 1000).toFixed(0)}s] ${a.join(' ')}`; console.log(l); fs.appendFileSync(LOGF, l + '\n'); };
let ok = 0, bad = 0; const check = (n, c, extra = '') => { if (c) ok++; else bad++; log(`${c ? 'OK  ' : 'FALHOU'} ${n}${extra ? ' — ' + extra : ''}`); };
const g = (dir, ...a) => { try { return execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); } catch (e) { return `ERRO ${String(e.stderr || e.message).split('\n')[0]}`; } };
const W = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); };
const R = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '');

fs.rmSync(S, { recursive: true, force: true });
const ID = 'p17', PJ = path.join(S, 'loja'), REM = path.join(S, 'loja.git'), VD = path.join(UD, 'vibe', ID);
execFileSync('git', ['init', '-q', '--bare', '-b', 'main', REM]);
g(REM, 'config', 'receive.denyNonFastForwards', 'true'); g(REM, 'config', 'receive.denyDeletes', 'true');
execFileSync('git', ['clone', '-q', REM, PJ], { stdio: 'ignore' });
g(PJ, 'config', 'user.name', 'Teste'); g(PJ, 'config', 'user.email', 't@exemplo.invalid'); g(PJ, 'switch', '-qc', 'main');
W(path.join(PJ, 'README.md'), '# Loja de brinquedo\n\nCatálogo simples.\n');
W(path.join(PJ, 'CLAUDE.md'), '# Loja\n\n- Validar: node --check app.js\n');
W(path.join(PJ, 'docs/TASKS.md'), '# Tarefas\n\n## Em andamento\n\n### TASK-007 — Carrinho\n- Status: EM ANDAMENTO\n\n## Prontas\n');
W(path.join(PJ, '.claude', 'fluxo.json'), JSON.stringify({ validacao: ['node --check app.js'] })); W(path.join(PJ, '.gitignore'), 'CLAUDE.local.md\n');
W(path.join(PJ, 'app.js'), 'console.log(1)\n');
g(PJ, 'add', '-A'); g(PJ, 'commit', '-qm', 'inicio da loja'); g(PJ, 'push', '-q', 'origin', 'main');
W(path.join(PJ, 'CLAUDE.local.md'), 'papel: "DEV2"\nbranch_padrao: "dev2"\n'); g(PJ, 'push', '-q', 'origin', 'main:dev1'); g(PJ, 'switch', '-qc', 'dev2');
W(path.join(PJ, 'app.js'), 'console.log(2)\n'); g(PJ, 'commit', '-qam', 'TASK-007: carrinho (parcial)'); g(PJ, 'push', '-q', '-u', 'origin', 'dev2');
const main0 = g(REM, 'rev-parse', 'main');
W(path.join(UD, 'state.json'), JSON.stringify({ projects: [{ id: ID, name: 'Loja', path: PJ, imported: true, archived: false, tabs: [], activeTab: null, g: 0, open: true }], lastSeenVersion: require(path.join(ROOT, 'package.json')).version, settings: { vibe: { on: false, last: ID }, organizador: { on: false } } }, null, 2));
W(path.join(CFGD, '.claude.json'), JSON.stringify({ projects: {} }));
W(FCFG, JSON.stringify({ demora: 1200, plano: 'Branch de trabalho: dev2\n\n## T1 — Botão remover\nObjetivo: remover item.\nCritério de pronto: commit.\n\n## T2 — [SEM COMMIT] Validação\nObjetivo: validar.\n', 'dev:T2': ['valida', 'valida'] }, null, 2));
const flog = () => R(FLOG);

// DEV2-024: pastas de brinquedo para o "Usar pasta existente" com várias pastas e conversas falsas na CLAUDE_CONFIG_DIR de teste
const mkrepo = (d, local) => { fs.mkdirSync(d, { recursive: true }); execFileSync('git', ['init', '-q', '-b', 'main', d]); g(d, 'config', 'user.name', 't'); g(d, 'config', 'user.email', 't@t'); W(path.join(d, 'README.md'), '# x\n'); if (local) W(path.join(d, 'CLAUDE.local.md'), local); g(d, 'add', 'README.md'); g(d, 'commit', '-qm', 'inicio'); };
const PS = path.join(S, 'pastas'), PD = path.join(PS, 'Loja'), PO = path.join(PS, 'Loja-ORQ'), PD3 = path.join(PS, 'Loja-dev3'), PN = path.join(PS, 'Notas'), P1 = path.join(PS, 'Avulso'), PX1 = path.join(PS, 'Mut-A'), PX2 = path.join(PS, 'Mut-A-ORQ');
mkrepo(PD, 'papel: "DEV1"\nbranch_padrao: "dev1"\n'); mkrepo(PO); mkrepo(PD3, 'papel: "DEV3"\nbranch_padrao: "dev3"\n'); mkrepo(P1); mkrepo(PX1); mkrepo(PX2);
fs.mkdirSync(PN, { recursive: true }); W(path.join(PN, 'ideias.txt'), 'nada\n');
const antes = Object.fromEntries([PD, PO, PD3, PN, P1, PX1, PX2].map((d) => [d, fs.readdirSync(d).sort().join(',')]));
const HR = 3600000, NOW = Date.now();
const conv = (pasta, horas, titulo) => {
  const sid = require('crypto').randomUUID();
  const f = path.join(CFGD, 'projects', pasta.replace(/[^a-zA-Z0-9]/g, '-'), `${sid}.jsonl`);
  W(f, `${JSON.stringify({ type: 'custom-title', customTitle: titulo })}\n${JSON.stringify({ type: 'user', message: { content: `pedido ${titulo}` } })}\n`);
  const t = new Date(NOW - horas * HR); fs.utimesSync(f, t, t);
  return sid;
};
const C = { devVelha: conv(PD, 10, 'dev antiga'), devMeio: conv(PD, 2, 'dev meio'), orqNova: conv(PO, 1, 'orq nova'), orqVelha: conv(PO, 5, 'orq velha'), dev3Nova: conv(PD3, 0.5, 'dev3 nova'), notasNova: conv(PN, 0.1, 'notas nova') };

(async () => {
  const env = { ...process.env, PATH: `${FAKE};${process.env.PATH}`, FAKE_CFG: FCFG, TERMIX_VIBE_TEST: '1', TERMIX_VIBE_NO_OPEN: '1', CLAUDE_CONFIG_DIR: CFGD, TERMIX_VIBE_CLAUDE_JSON: path.join(CFGD, '.claude.json') };
  const el = spawn(path.join(ROOT, 'node_modules', 'electron', 'dist', 'electron.exe'), [ROOT, `--user-data-dir=${UD}`, `--remote-debugging-port=${PORT}`], { env, stdio: 'ignore' });
  let t = null; for (let i = 0; i < 40 && !t; i++) { await wait(500); try { t = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((x) => x.url.endsWith('renderer/index.html')); } catch {} }
  const ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const P = {}; ws.onmessage = (e) => { const m = JSON.parse(e.data); if (P[m.id]) { P[m.id](m); delete P[m.id]; } };
  await new Promise((r) => (ws.onopen = r));
  const send = (method, params) => new Promise((r) => { const i = ++id; P[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Runtime.evaluate', { expression: 'window.__retSemVigia = true' }); const errs = []; ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.method === 'Runtime.exceptionThrown' || (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')) errs.push(JSON.stringify(m.params).slice(0, 300)); });
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  const ev = async (x) => { const m = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (m.result && m.result.exceptionDetails) log('EXC', JSON.stringify(m.result.exceptionDetails).slice(0, 300)); return m.result && m.result.result && m.result.result.value; };
  const shot = async (n, sel) => {
    let clip = null;
    if (sel) { clip = await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;e.scrollIntoView({block:'start'});const r=e.getBoundingClientRect();return {x:Math.max(0,r.x-8),y:Math.max(0,r.y-8),width:Math.min(r.width+16,1280),height:Math.min(r.height+16,900-Math.max(0,r.y-8)),scale:1}})()`); await wait(250); }
    const m = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip } : {}) });
    fs.writeFileSync(path.join(SHOTS, `${n}.png`), Buffer.from(m.result.data, 'base64')); log('captura', n);
  };
  const until = async (nome, fn, ms = 90000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await wait(600); } log(`TEMPO ESGOTADO esperando: ${nome}`); return null; };

  const txt = (sel) => ev(`(document.querySelector(${JSON.stringify(sel)})||{}).innerText||""`);
  const go = async (cur) => { await ev(`(UI.cur=${JSON.stringify(cur)},renderAll(),1)`); await wait(900); };
  const dlg = () => ev('(document.querySelector("#modalRoot .dlg")||{}).innerText||""');
  const btnDlg = (t) => ev(`(()=>{const b=[...document.querySelectorAll("#modalRoot .dlg button")].find(b=>b.textContent.trim()===${JSON.stringify(t)});if(b){b.click();return true}return false})()`);
  await wait(4000);
  check('modo de teste ativo (vibeTest e TermixOrg)', await ev('!!window.vibeTest && !!window.TermixOrg'));
  check('state.json partiu com as chaves desligadas (valores mantidos, não apagados)', (await ev('JSON.stringify([S.settings.vibe&&S.settings.vibe.on,S.settings.organizador&&S.settings.organizador.on])')) === '[false,false]');

  /* 1: Configurações sem chaves */
  await go({ p: '_', page: 'Configurações' });
  const conf = await txt('#page');
  check('1 Configurações sem "Vibe Coding e Mutirão (experimental)" e sem "Importar projeto com várias pastas"', !/Vibe Coding e Mutirão/.test(conf) && !/Importar projeto com várias pastas/.test(conf) && !(await ev('!!document.querySelector("#vibeConf,#orgConf,[data-vibe-set],[data-org-set]")')));
  check('1 sem o título "Experimental"', !(await ev('[...document.querySelectorAll("#page h5")].some(h=>/Experimental/.test(h.textContent))')));
  await ev('(document.querySelector("#page .page").lastElementChild.scrollIntoView({block:"end"}),1)'); await wait(300);
  await shot('n24-1-configuracoes-fim', null);

  /* 2: cabeçalho com o Vibe Coding (chave salva desligada) */
  await go({ p: ID, page: 'Terminais' });
  const bt = await ev('JSON.stringify([...document.querySelectorAll("#topbar [data-vibe-open]")].map(b=>b.textContent.trim()))');
  check('2 "Vibe Coding" no cabeçalho, no mesmo lugar, com a chave salva desligada', bt === '["Vibe Coding"]' && (await ev('(()=>{const b=document.querySelector("#topbar .vibebtns");return !!b && b.nextElementSibling && (b.nextElementSibling.id==="updchip"||b.nextElementSibling.matches("[data-togact]"))})()')), bt);
  await shot('n24-2-cabecalho', '#topbar');

  /* 3: Novo projeto — sem o botão separado; uma pasta funciona como antes */
  await ev('(document.querySelector("[data-newk=chat]").click(),1)'); await wait(1000);
  const row = JSON.parse(await ev('JSON.stringify([...document.querySelectorAll(".npage .row2 button")].map(b=>b.textContent.trim()))'));
  check('3 "Novo Projeto" sem o botão "Importar projeto (várias pastas)"', !(await ev('!!document.querySelector("[data-org-open]")')) && row.length === 1 && /Criar chat/.test(row[0]), JSON.stringify(row));
  await ev(`(window.__npTestPaths=${JSON.stringify([P1])},1)`);
  await ev('(document.querySelector("[data-npwhere=dir]").click(),1)'); await wait(1200);
  const np1 = JSON.parse(await ev('JSON.stringify({dir:UI.np&&UI.np.dir,name:UI.np&&UI.np.name,modal:!!document.querySelector("#modalRoot .dlg")})'));
  check('3 uma pasta: registra a pasta e sugere o nome, sem abrir mapa', np1.dir && np1.dir.toLowerCase() === P1.toLowerCase() && np1.name === 'Avulso' && !np1.modal, JSON.stringify(np1));
  check('3 texto do "Usar pasta existente" fala em escolher várias', /escolha várias com Ctrl ou Shift/.test(await txt('.npage')));
  await shot('n24-3-uma-pasta', '.npage');
  await ev('(document.querySelector("[data-npgo]").click(),1)'); await wait(1500);
  const pav = await ev(`JSON.stringify(S.projects.filter(p=>p.path.toLowerCase()===${JSON.stringify(P1.toLowerCase())}).map(p=>({name:p.name,tabs:p.tabs.length})))`);
  check('3 "Criar chat" com uma pasta cria o projeto como antes', JSON.parse(pav).length === 1 && JSON.parse(pav)[0].name === 'Avulso', pav);

  /* 4: várias pastas — mapa com as recomendadas */
  await ev('(document.querySelector("[data-newk=chat]").click(),1)'); await wait(1000);
  await ev(`(window.__npTestPaths=${JSON.stringify([PD, PO, PD3, PN])},1)`);
  await ev('(document.querySelector("[data-npwhere=dir]").click(),1)');
  const mapaTx = await until('mapa', async () => { const x = await dlg(); return /Mapa do projeto/.test(x) ? x : null; }, 20000);
  check('4 várias pastas abrem o mapa do Organizador (nome sugerido sem -ORQ)', !!mapaTx && /Mapa do projeto: Loja/.test(mapaTx), (mapaTx || '').slice(0, 120));
  const rows = JSON.parse(await ev('JSON.stringify([...document.querySelectorAll("#orgRows .orgrow")].map(r=>({nome:r.querySelector(".orghd b").textContent,papel:r.querySelector("[data-o=papel]").value,prin:r.querySelector("[data-o=principal]").checked,chip:!!r.querySelector(".chip.orgrec"),off:r.classList.contains("off")})))'));
  log('4 linhas:', JSON.stringify(rows));
  const rw = (n) => rows.find((r) => r.nome === n) || {};
  check('4 papéis por pasta (Dev, Orquestrador, Dev, Outro)', rw('Loja').papel === 'Dev' && rw('Loja-ORQ').papel === 'Orquestrador' && rw('Loja-dev3').papel === 'Dev' && rw('Notas').papel === 'Outro');
  check('4 DEV2-026: UMA pasta principal, a de papel dev (marcada com o chip "pasta principal")', rows.filter((r) => r.prin).length === 1 && rows.filter((r) => r.chip).length === 1 && rw(rows.find((r) => r.prin).nome).papel === 'Dev', JSON.stringify(rows.filter((r) => r.prin)));
  check('4 DEV2-026: as outras pastas ficam apagadas (off), sem conversa por pasta', rows.filter((r) => r.off).length === 3 && !(await ev('!!document.querySelector("#orgRows [data-o=ret], #orgRows [data-o=sess]")')));
  check('4 DEV2-026: aviso de que viram um projeto só, com um orquestrador e um dev', /um projeto só/.test(mapaTx) && /pasta principal/.test(mapaTx), mapaTx.slice(0, 200));
  await shot('n24-4-mapa-pasta-principal', '#modalRoot .dlg');
  const geo = JSON.parse((await ev(`(()=>{const d=document.querySelector("#modalRoot .dlg"),b=d.querySelector(".orgbody"),f=d.querySelector(".foot2");if(!b||!f)return "null";b.scrollTop=b.scrollHeight;const rb=b.getBoundingClientRect(),rf=f.getBoundingClientRect(),rows=[...d.querySelectorAll("#orgRows .orgrow")],last=rows[rows.length-1].getBoundingClientRect();return JSON.stringify({bodyBottom:rb.bottom,footTop:rf.top,lastBottom:last.bottom})})()`)) || 'null');
  check('9 rodapé do mapa: o conteúdo rola acima dos botões e o último cartão não fica sob eles', !!geo && geo.lastBottom <= geo.footTop + 1 && geo.bodyBottom <= geo.footTop + 1, JSON.stringify(geo));
  // trocar a pasta principal no mapa (radio): Loja-dev3 vira a principal
  await ev('(()=>{const r=[...document.querySelectorAll("#orgRows .orgrow")].find(r=>r.querySelector(".orghd b").textContent==="Loja-dev3");const c=r.querySelector("[data-o=principal]");c.checked=true;c.dispatchEvent(new Event("change",{bubbles:true}));c.dispatchEvent(new Event("input",{bubbles:true}));return 1})()'); await wait(400);
  const prin2 = await ev('(()=>{const r=[...document.querySelectorAll("#orgRows .orgrow")].find(r=>r.querySelector("[data-o=principal]").checked);return r?r.querySelector(".orghd b").textContent:""})()');
  check('4 o usuário troca a pasta principal no mapa', prin2 === 'Loja-dev3', prin2);
  await ev('(()=>{const r=[...document.querySelectorAll("#orgRows .orgrow")].find(r=>r.querySelector(".orghd b").textContent==="Loja");const c=r.querySelector("[data-o=principal]");c.checked=true;c.dispatchEvent(new Event("change",{bubbles:true}));c.dispatchEvent(new Event("input",{bubbles:true}));return 1})()'); await wait(400);
  check('4 "Carregar" clicado', await btnDlg('Carregar'));
  // DEV2-026: o projeto único passa pela oferta "Criar estrutura do projeto" (a pasta principal não tem guia, tarefas nem estado)
  const of = await until('oferta de estrutura', async () => { const x = await dlg(); return /Criar estrutura do projeto/.test(x) ? x : null; }, 30000);
  check('4 DEV2-026: depois do mapa, a oferta "Criar estrutura do projeto" (projeto sem estrutura)', !!of);
  const nrc = await ev('document.querySelectorAll("#modalRoot [data-rc]").length');
  const mrc = JSON.parse(await ev('JSON.stringify([...document.querySelectorAll("#modalRoot [data-rc]")].map(c=>c.checked))'));
  check('4 DEV2-026: a lista de chats junta as conversas de TODAS as pastas (6), o mais recente marcado', nrc === 6 && mrc[0] === true && mrc.filter(Boolean).length === 1, 'n=' + nrc + ' ' + JSON.stringify(mrc));
  await shot('n24-4-oferta-estrutura', '#modalRoot .dlg');
  await btnDlg('Agora não');
  const ps = await until('projeto criado', async () => { const x = JSON.parse(await ev(`JSON.stringify(S.projects.filter(p=>p.path.toLowerCase()===${JSON.stringify(PD.toLowerCase())}).map(p=>({name:p.name,path:p.path,tabs:p.tabs.map(t=>t.name)})))`)); return x.length && x[0].tabs.length >= 2 ? x : null; }, 40000);
  log('4 projetos:', JSON.stringify(ps));
  check('4 "Carregar": UM projeto só (na pasta principal), com Orquestrador e Dev', !!ps && ps.length === 1 && JSON.stringify(ps[0].tabs.slice().sort()) === JSON.stringify(['Dev', 'Orquestrador']), JSON.stringify(ps));
  const outros = JSON.parse(await ev(`JSON.stringify(S.projects.filter(p=>[${JSON.stringify(PO.toLowerCase())},${JSON.stringify(PD3.toLowerCase())},${JSON.stringify(PN.toLowerCase())}].includes(p.path.toLowerCase())).length)`));
  check('4 as outras pastas não viraram projeto (nada movido nem apagado)', outros === 0, String(outros));
  check('4 a tela "Novo Projeto" foi encerrada (abre o primeiro projeto)', (await ev('UI.cur.page')) === 'Terminais' && !(await ev('!!UI.np')));
  await wait(1500);
  await shot('n24-4b-depois-de-carregar', null);

  /* 5: Novo mutirão — várias pastas também abrem o mapa */
  await ev('(document.querySelector("[data-newk=workflow]").click(),1)'); await wait(1200);
  await ev(`(window.__npTestPaths=${JSON.stringify([PX1, PX2])},1)`);
  const tem = await ev('!!document.querySelector("[data-npwhere=dir]")');
  if (tem) await ev('(document.querySelector("[data-npwhere=dir]").click(),1)');
  const m2 = await until('mapa no Novo mutirão', async () => { const x = await dlg(); return /Mapa do projeto/.test(x) ? x : null; }, 20000);
  check('5 "Novo mutirão" > Usar pasta existente com várias pastas abre o mapa', tem && !!m2, String(tem));
  await btnDlg('Cancelar'); await wait(500);
  check('5 cancelar o mapa volta à tela sem pasta escolhida', (await ev('UI.cur.page')) === 'Novo workflow' && !(await ev('UI.np && UI.np.dir')));

  check('pastas do usuário sem nenhuma mudança', Object.entries(antes).every(([d, l]) => fs.readdirSync(d).sort().join(',') === l));
  check('sem erros de JavaScript na página', errs.length === 0, errs.slice(0, 3).join(' || ').slice(0, 400));
  log(`${ok} OK, ${bad} FALHOU`);
  try { el.kill(); } catch {}
  process.exit(bad ? 1 : 0);
})().catch((e) => { log('ERRO', e.stack); process.exit(2); });
