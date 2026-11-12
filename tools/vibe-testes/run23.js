// DEV2-023 — teste SEM TOKENS do Mutirão nativo no app (CDP), instância isolada: --user-data-dir temporário,
// CLAUDE_CONFIG_DIR vazio, Claude Code FALSO no PATH, remotos bare locais (nada de projeto real). Chave experimental DESLIGADA.
// Caminho (b) projeto ativo (fluxo, DEV1) até a divisão publicada, entregas 0..2 e o botão da implementação automática;
// caminho (a) projeto novo ("Usar pasta existente", sem fluxo, com origin) até a divisão publicada; regra do dono (DEV2);
// pasta "Mutirão" com o status; Workflow antigo abrindo; sem o botão do cabeçalho; lado do sócio (com a chave ligada).
// Uso: node run23.js <raiz do Termix>
const { ROOT: ROOT_PADRAO, WORK } = require('./lib'); // raiz do repositório e pasta temporária do sistema
const fs = require('fs'), path = require('path'); const { spawn, execFileSync } = require('child_process');
const ROOT = (process.argv[2] || ROOT_PADRAO);
const S = path.join(WORK, 'r23'), UD = path.join(S, 'ud'), CFGD = path.join(S, 'claude-cfg'), PORT = 9423;
const FAKE = path.join(WORK, 'fake'), FCFG = path.join(S, 'fake-cfg.json');
const SHOTS = path.join(WORK, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const T0 = Date.now(); const LOGF = path.join(WORK, 'run23.log'); fs.writeFileSync(LOGF, '');
const log = (...a) => { const l = `[${((Date.now() - T0) / 1000).toFixed(0)}s] ${a.join(' ')}`; console.log(l); fs.appendFileSync(LOGF, l + '\n'); };
let ok = 0, bad = 0; const check = (n, c, extra = '') => { if (c) ok++; else bad++; log(`${c ? 'OK  ' : 'FALHOU'} ${n}${extra ? ' — ' + extra : ''}`); };
const g = (dir, ...a) => { try { return execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); } catch (e) { return `ERRO ${String(e.stderr || e.message).split('\n')[0]}`; } };
const W = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); };
const cfgU = (d, b) => { g(d, 'config', 'user.name', b); g(d, 'config', 'user.email', `${b}@exemplo.invalid`); };
const MD = (t) => ['Objetivo', 'Público e usuários', 'Funcionalidades', 'Fora do escopo', 'Telas e fluxos', 'Dados e regras de negócio', 'Integrações e acessos', 'Tecnologia', 'Critério de pronto'].map((h) => `## ${h}\n${t}: conteúdo de ${h}.\n`).join('\n');
const DIV = (bd) => JSON.stringify({ branchDono: bd, objetivo: 'Projeto inteiro', criterio: 'tudo pronto', participantes: [{ nome: 'Ana', branch: 'dev2' }, { nome: 'Bia', branch: 'dev3' }], partes: [{ branch: 'dev2', titulo: 'Tela A', objetivo: 'fazer a tela A', criterio: 'A pronta', arquivos: ['src/a.js'] }, { branch: 'dev3', titulo: 'Tela B', objetivo: 'fazer a tela B', criterio: 'B pronta', arquivos: ['src/b.js'] }] }, null, 2);
const dividir = (dir, bd) => { W(path.join(dir, 'mutirao/divisao.json'), DIV(bd)); W(path.join(dir, 'mutirao/partes/dev2.md'), MD('Ana')); W(path.join(dir, 'mutirao/partes/dev3.md'), MD('Bia')); };

fs.rmSync(S, { recursive: true, force: true });
function remoto(nome, fluxo) {
  const REM = path.join(S, `${nome}.git`), BASE = path.join(S, `${nome}-base`);
  execFileSync('git', ['init', '-q', '--bare', '-b', 'master', REM]);
  g(REM, 'config', 'receive.denyNonFastForwards', 'true');
  execFileSync('git', ['clone', '-q', REM, BASE], { stdio: 'ignore' }); cfgU(BASE, 'base');
  W(path.join(BASE, 'README.md'), `# ${nome}\n`); W(path.join(BASE, 'src/a.js'), '1\n'); W(path.join(BASE, 'src/b.js'), '2\n');
  if (fluxo) { W(path.join(BASE, '.claude/fluxo.json'), '{"validacao":[]}\n'); W(path.join(BASE, '.gitignore'), 'CLAUDE.local.md\n'); }
  g(BASE, 'add', '-A'); g(BASE, 'commit', '-qm', 'inicio'); g(BASE, 'push', '-q', 'origin', 'master');
  if (fluxo) for (const b of ['dev1', 'dev2', 'dev3']) g(BASE, 'push', '-q', 'origin', `master:${b}`);
  return REM;
}
const clone = (REM, dir, b, papel) => { execFileSync('git', ['clone', '-q', REM, dir], { stdio: 'ignore' }); cfgU(dir, b); if (b !== 'master') g(dir, 'switch', '-q', b); if (papel) W(path.join(dir, 'CLAUDE.local.md'), `papel: "${papel}"\nbranch_padrao: "${b}"\n`); };
// (b) projeto ativo com o fluxo: o dono (DEV1) e o sócio (DEV2), clones do mesmo remoto
const REMB = remoto('erp', true), PB = path.join(S, 'erp'), PS = path.join(S, 'erp-socio');
clone(REMB, PB, 'dev1', 'DEV1'); clone(REMB, PS, 'dev2', 'DEV2');
W(path.join(PB, 'src/c.js'), '3\n'); g(PB, 'add', '-A'); g(PB, 'commit', '-qm', 'TASK-1: em andamento'); g(PB, 'push', '-q', 'origin', 'dev1');
// (a) projeto novo pela pasta existente: clone sem o fluxo (dono = quem abre)
const REMA = remoto('loja', false), PA = path.join(S, 'loja'); clone(REMA, PA, 'master');
// Workflow antigo (dados que já existem; nada é migrado)
const PW = path.join(S, 'wf-antigo'); fs.mkdirSync(PW, { recursive: true });
const ver = require(path.join(ROOT, 'package.json')).version;
W(path.join(UD, 'state.json'), JSON.stringify({ projects: [
  { id: 'pb', name: 'ERP', path: PB, imported: true, archived: false, tabs: [], activeTab: null, g: 0, open: true },
  { id: 'ps', name: 'ERP (sócio)', path: PS, imported: true, archived: false, tabs: [], activeTab: null, g: 1, open: true },
  { id: 'pw', name: 'Workflow antigo', path: PW, imported: true, archived: false, tabs: [], activeTab: null, g: 2, open: true, kind: 'workflow' },
], lastSeenVersion: ver, settings: { vibe: { on: false }, organizador: { on: false } } }, null, 2));
W(path.join(CFGD, '.claude.json'), JSON.stringify({ projects: {} }));
W(FCFG, JSON.stringify({ demora: 800 }));
const stateRaw0 = fs.readFileSync(path.join(UD, 'state.json'), 'utf8');

(async () => {
  const env = { ...process.env, PATH: `${FAKE};${process.env.PATH}`, FAKE_CFG: FCFG, TERMIX_VIBE_TEST: '1', TERMIX_VIBE_NO_OPEN: '1', CLAUDE_CONFIG_DIR: CFGD, TERMIX_VIBE_CLAUDE_JSON: path.join(CFGD, '.claude.json') };
  const el = spawn(path.join(ROOT, 'node_modules', 'electron', 'dist', 'electron.exe'), [ROOT, `--user-data-dir=${UD}`, `--remote-debugging-port=${PORT}`], { env, stdio: 'ignore' });
  let t = null; for (let i = 0; i < 40 && !t; i++) { await wait(500); try { t = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((x) => x.url.endsWith('renderer/index.html')); } catch {} }
  const ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const P = {}; ws.onmessage = (e) => { const m = JSON.parse(e.data); if (P[m.id]) { P[m.id](m); delete P[m.id]; } };
  await new Promise((r) => (ws.onopen = r));
  const send = (method, params) => new Promise((r) => { const i = ++id; P[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); const errs = []; ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.method === 'Runtime.exceptionThrown' || (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')) errs.push(JSON.stringify(m.params).slice(0, 300)); });
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  const ev = async (x) => { const m = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (m.result && m.result.exceptionDetails) log('EXC', JSON.stringify(m.result.exceptionDetails).slice(0, 300)); return m.result && m.result.result && m.result.result.value; };
  const shot = async (n, sel) => {
    let clip = null;
    if (sel) { clip = await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;const r=e.getBoundingClientRect();return {x:Math.max(0,r.x-6),y:Math.max(0,r.y-6),width:Math.min(r.width+12,1280),height:Math.min(r.height+12,900-Math.max(0,r.y-6)),scale:1}})()`); await wait(250); }
    const m = await send('Page.captureScreenshot', { format: 'png', ...(clip ? { clip } : {}) });
    fs.writeFileSync(path.join(SHOTS, `${n}.png`), Buffer.from(m.result.data, 'base64')); log('captura', n);
  };
  const until = async (nome, fn, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await wait(400); } log(`TEMPO ESGOTADO esperando: ${nome}`); return null; };
  const txt = (sel) => ev(`(document.querySelector(${JSON.stringify(sel)})||{}).innerText||""`);
  const click = (sel) => ev(`(()=>{const b=document.querySelector(${JSON.stringify(sel)});if(!b)return false;b.click();return true})()`);
  const typeIn = (sel, v) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return false;e.value=${JSON.stringify(v)};e.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
  const pick = (sel, v) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return false;e.value=${JSON.stringify(v)};e.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
  const side = () => txt('#side [data-cat="workflow"]');
  const mp = () => txt('.mutp');
  const contar = async (k) => { await click('.mutp [data-mp=count]'); return until(`Entregas: ${k}/2`, async () => (/Entregas: (\d)\/2/.exec(await mp()) || [])[1] === String(k) && !(await ev('!!document.querySelector(".mutp [data-mp=count][disabled]")')), 30000); };
  const entregar = (b) => { const d = path.join(S, `ent-${b}`); fs.rmSync(d, { recursive: true, force: true }); clone(REMB, d, b); g(d, 'merge', '-q', 'origin/dev1'); W(path.join(d, `mutirao/entregas/${b}.json`), JSON.stringify({ data: new Date().toISOString(), commits: ['x'], resumo: 'ok' })); g(d, 'add', '-A'); g(d, 'commit', '-qm', `Mutirão: entrega ${b}`); return g(d, 'push', '-q', 'origin', b); };

  await wait(4000);
  check('modo de teste ativo', await ev('!!window.vibeTest && !!window.TermixMut'));
  /* 1: cabeçalho sem o botão Mutirão (chave desligada e ligada) */
  await ev('(UI.cur={p:"pb",page:"Terminais"},renderAll(),1)'); await wait(800);
  check('DEV2-024: state.json com vibe.on = false: o "Vibe Coding" aparece no cabeçalho mesmo assim', JSON.stringify(await ev('[...document.querySelectorAll("#topbar [data-vibe-open]")].map(b=>b.textContent.trim())')) === '["Vibe Coding"]');
  /* 2: tela Novo mutirão (chave desligada) */
  check('botão "Novo mutirão" na barra lateral', await click('[data-newk=workflow]')); await wait(900);
  let pg = await txt('.npage');
  check('tela "Novo Mutirão": dois caminhos, participantes e "Criar mutirão"', /Novo Mutirão/.test(pg) && /Projeto novo/.test(pg) && /Projeto ativo do Termix/.test(pg) && /Participantes/i.test(pg) && /Criar mutirão/.test(pg), pg.slice(0, 200).replace(/\n/g, ' | '));
  check('tela "Novo Mutirão" não fala mais dos dois terminais em Dangerously', !/Dangerously/.test(pg));
  check('mesmas classes do núcleo (npage, nphead, seg, f, row2)', await ev('!!document.querySelector(".npage .npinner .nphead") && !!document.querySelector(".npage .seg [data-mnorig]") && !!document.querySelector(".npage .f [data-npwhere]") && !!document.querySelector(".npage .row2 [data-mngo]")'));
  await shot('n23-1-novo-mutirao-projeto-novo', '.npage .npinner');

  /* 3: regra do dono: projeto do sócio (DEV2) */
  await click('[data-mnorig=ativo]'); await wait(400);
  await pick('#mnProj', 'ps');
  pg = await until('explicação do dono', async () => { const x = await txt('.npage'); return /Só o dono do projeto cria o Mutirão/.test(x) ? x : null; });
  check('papel DEV2: explicação e "Criar mutirão" desligado', !!pg && /DEV2/.test(pg) && (await ev('document.querySelector("[data-mngo]").disabled')));
  await shot('n23-2-novo-mutirao-nao-dono', '.npage .npinner');

  /* 4: caminho (b) projeto ativo (DEV1) */
  await pick('#mnProj', 'pb');
  pg = await until('dono reconhecido', async () => { const x = await txt('.npage'); return /Você é o dono/.test(x) ? x : null; });
  check('(b) papel DEV1: "Você é o dono", branch dev1', !!pg && /branch dev1/.test(pg));
  check('(b) duas opções: "Do estado atual até finalizar" (padrão) e "Delegar algumas tarefas"', /Do estado atual até finalizar/.test(pg) && /Delegar algumas tarefas/.test(pg) && (await ev('document.querySelector("[data-mnmodo=estado_atual]").classList.contains("sel")')));
  await click('[data-mnmodo=tarefas]'); await wait(300);
  check('(b2) "Delegar algumas tarefas" selecionado, com a explicação', (await ev('document.querySelector("[data-mnmodo=tarefas]").classList.contains("sel")')) && /segue trabalhando na sua branch/.test(await txt('.npage')));
  await typeIn('[data-mnn="0"]', 'Ana'); await click('[data-mnadd]'); await wait(300);
  check('(b) "Adicionar participante" sugere dev3 e mantém o que foi digitado', (await ev('document.querySelector("[data-mnb=\\"1\\"]").value')) === 'dev3' && (await ev('document.querySelector("[data-mnn=\\"0\\"]").value')) === 'Ana');
  await typeIn('[data-mnn="1"]', 'Bia');
  await shot('n23-3-novo-mutirao-projeto-ativo', '.npage .npinner');
  await click('[data-mngo]');
  let m = await until('painel do Mutirão', async () => { const x = await mp(); return /Mutirão criado/.test(x) && /Fase/.test(x) ? x : null; });
  check('(b) "Criar mutirão" abre o projeto com o painel do Mutirão', !!m && (await ev('UI.cur.p')) === 'pb' && (await ev('document.getElementById("col").classList.contains("mut-open")')));
  check('(b) painel: tipo "uma tarefa por participante" e o botão "Gerar tarefas"', /Tipo\s*Projeto em andamento: delegar algumas tarefas/.test(m) && /Gerar tarefas/.test(m), m.slice(0, 300).replace(/\n/g, ' | '));
  check('(b) painel: fase Dividindo, branch do dono dev1, 2 participantes', /Fase\s*Dividindo/.test(m) && /Branch do dono\s*dev1/.test(m) && (await ev('JSON.stringify(vibeTest.mut.state().rows.map(r=>r.branch))')) === '["dev2","dev3"]', m.slice(0, 260).replace(/\n/g, ' | '));
  check('(b) o projeto não virou Workflow nem foi duplicado', (await ev('JSON.stringify(S.projects.map(p=>p.id+":"+(p.kind||"")))')) === '["pb:","ps:","pw:workflow"]');
  let sd = await until('ERP na pasta Mutirão', async () => { const x = await side(); return /ERP/.test(x) ? x : null; });
  check('(b) pasta "Mutirão" lista o ERP e o Workflow antigo', !!sd && /Workflow antigo/.test(sd) && (await ev('!!document.querySelector("#side [data-cat=workflow] [data-mutgo=pb]")')), (sd || '').replace(/\n/g, ' | '));
  check('(b) o ERP continua em "Projetos"', await ev('!!document.querySelector("#side [data-cat=chat] [data-ph=pb]")'));
  await shot('n23-4-painel-dividindo', '#col');
  // divisão gravada (no lugar do orquestrador), conferida e publicada pelo painel
  dividir(PB, 'dev1');
  await click('.mutp [data-mp=conf]');
  m = await until('conferência ok', async () => { const x = await mp(); return /Divisão conferida/.test(x) ? x : null; });
  check('(b) conferência: nenhum arquivo em comum', !!m);
  await click('.mutp [data-mp=pub]');
  m = await until('publicada', async () => { const x = await mp(); return /Divisão publicada/.test(x) && /Entregas: 0\/2/.test(x) ? x : null; }, 40000);
  check('(b) divisão publicada na dev1 (master intacta) e Entregas 0/2', !!m && g(PB, 'rev-parse', 'origin/dev1') === g(PB, 'rev-parse', 'dev1') && g(PB, 'rev-parse', 'origin/master') === g(path.join(S, 'erp-base'), 'rev-parse', 'master'));
  check('(b) fase Aguardando entregas (0/2), ninguém entregou', /Aguardando entregas \(0\/2\)/.test(m) && (m.match(/ainda não entregou/g) || []).length === 2, m.replace(/\n/g, ' | ').slice(0, 400));
  sd = await until('0/2 na pasta', async () => { const x = await txt('#side [data-mutgo=pb]'); return /0\/2/.test(x) ? x : null; });
  check('(b) pasta "Mutirão": ERP com 0/2', !!sd);
  check('(b) sem o botão da implementação automática com 0/2', !(await ev('!!document.querySelector(".mutp [data-mp=auto]")')));
  /* 5: lado do sócio (DEV2-024: sem chave; o state.json tem vibe.on = false e não esconde nada): parte e Vibe de tarefa (b2) */
  await ev('(UI.cur={p:"_",page:"Configurações"},renderAll(),1)'); await wait(800);
  check('DEV2-024: Configurações sem chaves experimentais', !(await ev('!!document.querySelector("#vibeConf,#orgConf,[data-vibe-set],[data-org-set]")')) && !(await ev('/Experimental/.test(document.querySelector("#page").innerText)')));
  await ev('(UI.cur={p:"pb",page:"Terminais"},renderAll(),1)'); await wait(800);
  const bt = await ev('JSON.stringify([...document.querySelectorAll("#topbar [data-vibe-open]")].map(b=>b.textContent.trim()))');
  check('sem chave (vibe.on = false salvo): só o "Vibe Coding" no cabeçalho (o "Mutirão" saiu)', bt === '["Vibe Coding"]', bt);
  check('o painel do Mutirão segue aberto', await ev('!!document.querySelector(".mutp")'));
  await shot('n23-5-cabecalho-sem-mutirao', '#topbar');
  await ev('vibeTest.mut.close()');
  g(PS, 'fetch', '-q', 'origin'); g(PS, 'merge', '-q', 'origin/dev1');
  await ev('(UI.cur={p:"ps",page:"Terminais"},renderAll(),1)'); await wait(500);
  const pt = JSON.parse((await ev('vibeTest.mut.parte().then(r=>JSON.stringify(r))')) || 'null');
  check('sócio (dev2): tem a parte "Tela A" depois de sincronizar', pt && pt.tem && pt.branch === 'dev2' && pt.titulo === 'Tela A');
  check('sócio: botão "Sua parte do Mutirão" no cabeçalho', await until('botão da parte', () => ev('!!document.querySelector("#topbar [data-vibe-part]")'), 10000));
  await click('#topbar [data-vibe-part]'); await wait(1500);
  check('sócio: o painel mostra a parte e "Abrir o Vibe Coding com a minha parte"', /Você tem uma parte do Mutirão/.test(await mp()) && (await ev('!!document.querySelector(".mutp [data-mp=vibe]")')));
  await click('.mutp [data-mp=vibe]'); await wait(1500);
  const vs = JSON.parse((await ev('JSON.stringify(vibeTest.state())')) || 'null');
  check('DEV2-024: sócio do (b2) cai no Vibe de TAREFA preenchido (o que fazer, critério, arquivos)', vs && vs.id === 'ps' && vs.modo === 'tarefa' && /Tela A/.test(vs.t.oQue) && /fazer a tela A/.test(vs.t.oQue) && vs.t.criterio === 'A pronta' && !!vs.t.arquivos, JSON.stringify(vs && vs.t).slice(0, 300));
  const vtx = await ev('(document.querySelector(".dlg")||{}).innerText||""');
  check('DEV2-024: tela do Vibe de tarefa com o aviso da tarefa do Mutirão (não o formulário completo de projeto)', /2. O que fazer/.test(vtx) && /tarefa do Mutirão/.test(vtx) && !/Objetivo final do projeto/.test(vtx), vtx.slice(0, 300).split('\n').join(' | '));
  await shot('n24-socio-b2-vibe-tarefa', '.dlg');
  await ev('(document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true})),1)'); await wait(400);
  await ev('(document.querySelector(".vibe-form [data-close],.dlg .mclose")||{click(){}}).click(),1'); await wait(300);
  await ev('(S.settings.vibe={...(S.settings.vibe||{}),on:false},save(),renderAll(),1)'); await wait(400);
  if (await ev('!!document.querySelector(".modal,.vibe-form")')) await ev('(document.querySelectorAll(".modal").forEach(x=>x.remove()),1)');

  /* 6: monitoramento pela pasta "Mutirão": entregas 1/2 e 2/2 */
  check('clique no ERP da pasta "Mutirão" abre o projeto com o painel', await click('#side [data-mutgo=pb]') && (await until('painel', async () => /Entregas: \d\/2/.test(await mp()), 20000)) && (await ev('UI.cur.p')) === 'pb');
  entregar('dev2');
  const sino = () => ev('JSON.stringify((UI.events||[]).filter(e=>/Mutirão · ERP/.test(e.who||"")).map(e=>e.msg))').then((x) => JSON.parse(x || '[]'));
  check('entrega da Ana: 1/2, Ana entregou e quando', !!(await contar(1)) && /Ana\s*dev2\s*entregou em/.test(await mp()) && /Bia\s*dev3\s*ainda não entregou/.test(await mp()), (await mp()).replace(/\n/g, ' | ').slice(0, 400));
  check('fase Aguardando entregas (1/2) e pasta com 1/2', /Aguardando entregas \(1\/2\)/.test(await mp()) && !!(await until('1/2 na pasta', async () => /1\/2/.test(await txt('#side [data-mutgo=pb]')))));
  check('sem o botão da implementação automática com 1/2', !(await ev('!!document.querySelector(".mutp [data-mp=auto]")')));
  check('aviso no sino: "Ana (dev2) entregou a tarefa: 1/2"', (await sino()).some((x) => /Ana \(dev2\) entregou a tarefa: 1\/2/.test(x)), JSON.stringify(await sino()));
  await ev('vibeTest.mut.close()'); await ev('(UI.cur={p:"ps",page:"Terminais"},renderAll(),1)'); await wait(400);
  entregar('dev3');
  const nv = await ev('vibeTest.novo.vigiar()');
  check('vigia (git fetch, sem IA, painel fechado): a entrega da Bia chega sozinha', nv === 1, String(nv));
  check('aviso no sino: Bia entregou, 2/2, implementação automática liberada', (await sino()).some((x) => /Bia \(dev3\) entregou a tarefa: 2\/2\. Todas as entregas chegaram/.test(x)), JSON.stringify(await sino()));
  check('pasta "Mutirão": ERP com 2/2 sem abrir o painel', !!(await until('2/2 na pasta (vigia)', async () => /2\/2/.test(await txt('#side [data-mutgo=pb]')))));
  await click('#side [data-mutgo=pb]');
  check('entrega da Bia: 2/2 no painel aberto pela pasta', !!(await until('2/2 no painel', async () => /Entregas: 2\/2/.test(await mp()) && /Todas as entregas/.test(await mp()), 30000)));
  m = await mp();
  check('2/2: fase "Todas as entregas (2/2)" e o botão "Implementação automática"', /Todas as entregas \(2\/2\)/.test(m) && (await ev('!!document.querySelector(".mutp [data-mp=auto]")')));
  check('pasta "Mutirão": ERP com 2/2', !!(await until('2/2 na pasta', async () => /2\/2/.test(await txt('#side [data-mutgo=pb]')))));
  await ev('(document.querySelector(".mutp .mp-body").scrollTop=99999,1)'); await wait(300);
  await shot('n23-6-monitoramento-2-de-2', '#col');
  await shot('n23-7-pasta-mutirao', '#side');
  await ev('vibeTest.mut.close()');

  /* 7: caminho (a) projeto novo pela pasta existente */
  await click('[data-newk=workflow]'); await wait(700);
  await click('[data-mnorig=novo]'); await wait(300);
  await ev('(UI.np.where="dir",renderPage(),1)'); await wait(200);
  await ev(`(UI.np.dir=${JSON.stringify(PA)},UI.np.name="Loja",renderPage(),1)`);
  pg = await until('dono (a)', async () => { const x = await txt('.npage'); return /Você é o dono/.test(x) ? x : null; });
  check('(a) pasta sem o fluxo com origin: "Você é o dono", branch dev1 criada ao publicar', !!pg && /branch dev1/.test(pg) && /criada a partir da master/.test(pg), (pg || '').replace(/\n/g, ' | ').slice(-300));
  check('(a) campos da entrega: objetivo, estrutura (.md) e critério', /Objetivo do projeto/i.test(pg) && /Estrutura do projeto \(\.md\)/i.test(pg) && /Critério de pronto do projeto/i.test(pg));
  await typeIn('[data-mnn="0"]', 'Ana'); await click('[data-mnadd]'); await wait(200); await typeIn('[data-mnn="1"]', 'Bia');
  await click('[data-mngo]'); await wait(500);
  check('(a) sem o .md da estrutura, "Criar mutirão" explica e não cria', /Escolha o \.md da estrutura/.test(await txt('.npage')) && (await ev('S.projects.length')) === 3);
  const ESTF = path.join(S, 'estrutura-loja.md'); W(ESTF, MD('Loja'));
  check('(a) .md da estrutura conferido (9 seções)', await ev(`vibeTest.novo.estrutura(${JSON.stringify(ESTF)}).then(r=>!!(r&&r.ok))`));
  await typeIn('#mnObj', 'Loja online'); await typeIn('#mnCrit', 'vende pela internet');
  await shot('n23-8a-novo-mutirao-projeto-novo-preenchido', '.npage .npinner');
  await click('[data-mngo]');
  m = await until('painel (a)', async () => { const x = await mp(); return /Mutirão criado/.test(x) && /Fase/.test(x) ? x : null; });
  const pa = JSON.parse((await ev(`JSON.stringify(S.projects.find(p=>p.path===${JSON.stringify(PA)})||null)`)) || 'null');
  check('(a) painel: tipo "o projeto inteiro dividido" e estrutura copiada para mutirao/estrutura.md', /Projeto novo: o projeto inteiro dividido/.test(m) && fs.existsSync(path.join(PA, 'mutirao/estrutura.md')));
  check('(a) projeto novo criado (comum, sem abas) e aberto com o painel', !!m && pa && !pa.kind && pa.tabs.length === 0 && (await ev('UI.cur.p')) === pa.id);
  check('(a) aparece em "Projetos" e na pasta "Mutirão"', !!(await until('Loja na pasta', () => ev(`!!document.querySelector("#side [data-cat=workflow] [data-mutgo='${pa.id}']") && !!document.querySelector("#side [data-cat=chat] [data-ph='${pa.id}']")`))));
  dividir(PA, 'dev1');
  await click('.mutp [data-mp=conf]'); await until('conf (a)', async () => /Divisão conferida/.test(await mp()));
  await click('.mutp [data-mp=pub]');
  m = await until('publicada (a)', async () => { const x = await mp(); return /Divisão publicada/.test(x) && /Entregas: 0\/2/.test(x) ? x : null; }, 40000);
  check('(a) a estrutura do dono vai na publicação', m && g(PA, 'show', '--name-only', '--format=', 'origin/dev1').split('\n').includes('mutirao/estrutura.md'));
  check('(a) divisão publicada: dev1 criada a partir da master e enviada; master intacta', !!m && g(PA, 'rev-parse', 'origin/dev1') === g(PA, 'rev-parse', 'dev1') && g(PA, 'rev-parse', 'origin/master') === g(path.join(S, 'loja-base'), 'rev-parse', 'master'));
  await shot('n23-8-projeto-novo-publicado', '#col');
  await ev('vibeTest.mut.close()');

  /* 8: Workflow antigo abre como antes */
  await click('#side [data-ph=pw]'); await wait(900);
  pg = await txt('#page');
  check('Workflow antigo abre como antes (tela do Workflow, sem o painel do Mutirão)', (await ev('UI.cur.p')) === 'pw' && /Workflow · Workflow antigo/.test(pg) && (await ev('document.getElementById("page").classList.contains("wfpage")')) && !(await ev('!!document.querySelector(".mutp")')), pg.slice(0, 160).replace(/\n/g, ' | '));
  await shot('n23-9-workflow-antigo', '#col');

  check('sem erros de JavaScript na página', errs.length === 0, errs.slice(0, 3).join(' || ').slice(0, 400));
  log(`${ok} OK, ${bad} FALHOU`);
  try { el.kill(); } catch {}
  await wait(800);
  const st1 = JSON.parse(fs.readFileSync(path.join(UD, 'state.json'), 'utf8'));
  const w0 = JSON.parse(stateRaw0).projects.find((p) => p.id === 'pw'), w1 = st1.projects.find((p) => p.id === 'pw');
  console.log(`Workflow antigo preservado no state.json: ${w1 && w1.kind === 'workflow' && w1.path === w0.path}`);
  process.exit(0);
})().catch((e) => { log('ERRO', e && e.stack); process.exit(1); });
