// Teste sem tokens da política de autonomia (DEV2-014). Uso: node pol14.js <raiz do Termix>
const { ROOT: ROOT_PADRAO, WORK } = require('./lib'); // raiz do repositório e pasta temporária do sistema
const fs = require('fs'), path = require('path'); const { execFileSync } = require('child_process');
const ROOT = (process.argv[2] || ROOT_PADRAO), S = path.join(WORK, 'p14');
fs.rmSync(S, { recursive: true, force: true }); fs.mkdirSync(S, { recursive: true });
process.env.TERMIX_VIBE_TEST = '1';
process.env.TERMIX_VIBE_CLAUDE_JSON = path.join(S, 'claude-teste.json');
fs.writeFileSync(process.env.TERMIX_VIBE_CLAUDE_JSON, '{"projects":{}}');
const W = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); };
let ok = 0, bad = 0; const check = (n, c, extra = '') => { if (c) ok++; else bad++; console.log(`${c ? 'OK  ' : 'FALHOU'} ${n}${extra && !c ? ' — ' + extra : ''}`); };
const P = require(path.join(ROOT, 'src/vibe/politica.js'));
const UD = path.join(S, 'ud');
const mk = () => { const h = {}; const api = require(path.join(ROOT, 'src/vibe/index.js')).create({ ipcMain: { handle: (ch, fn) => { h[ch] = fn; } }, app: { getPath: () => UD }, dialog: null, getWin: () => null, logError: (e) => console.log('logError', e && e.message) }); return { api, call: (ch, ...a) => h[`vibe:${ch}`]({}, ...a) }; };

// projetos: sem fluxo (dono), fluxo DEV1, fluxo DEV2, fluxo DEV5, fluxo sem papel
const proj = (nome, fluxo, papel) => {
  const d = path.join(S, nome);
  W(path.join(d, 'README.md'), '# x\n');
  if (fluxo) W(path.join(d, '.claude/fluxo.json'), JSON.stringify({ validacao: ['npm run check', 'npm test'] }));
  if (papel) W(path.join(d, 'CLAUDE.local.md'), `papel: "${papel}"\nbranch_padrao: "${papel.toLowerCase()}"\n`);
  execFileSync('git', ['init', '-q', '-b', 'main', d]);
  const id = `p-${nome}`;
  W(path.join(UD, 'vibe', id, 'entrega.json'), JSON.stringify({ versao: 1, status: 'pronta', projeto: { id, nome, pasta: d }, objetivo: 'x', criterioDePronto: 'y', naoPodem: '', acessos: [], nadaAFornecer: true, arquivos: { fluxo: 'fluxo.md', estrutura: 'estrutura.md' } }));
  return id;
};
const SOLO = proj('solo'), D1 = proj('dev1', true, 'DEV1'), D2 = proj('dev2', true, 'DEV2'), D5 = proj('dev5', true, 'DEV5'), SP = proj('sempapel', true, '');

(async () => {
  let { call } = mk();
  /* 1. o papel define as opções */
  const g = {}; for (const [k, id] of Object.entries({ SOLO, D1, D2, D5, SP })) g[k] = await call('politicaGet', id);
  check('sem fluxo: o dono pode ligar o deploy', g.SOLO.info.podeDeploy && !g.SOLO.info.fluxo);
  check('fluxo DEV1: pode ligar o deploy', g.D1.info.podeDeploy && g.D1.info.papel === 'DEV1');
  check('fluxo DEV2 e DEV5: não podem', !g.D2.info.podeDeploy && !g.D5.info.podeDeploy && /DEV2/.test(g.D2.info.motivo));
  check('fluxo sem papel: não pode', !g.SP.info.podeDeploy && /papel/.test(g.SP.info.motivo));
  check('DEV1 vê os 3 modelos (inclui "Autônomo com deploy")', g.D1.prontos.map((m) => m.id).join() === 'supervisionado,branch,deploy');
  check('DEV2..DEV5 não veem o modelo com deploy', !g.D2.prontos.some((m) => m.id === 'deploy') && !g.D5.prontos.some((m) => m.id === 'deploy') && g.D2.prontos.length === 2);
  check('padrão = Autônomo até a branch, deploy nunca, só o indispensável, teto 93/95', g.D1.politica.modelo === 'branch' && g.D1.politica.deploy.modo === 'nunca' && g.D1.politica.humano === 'indispensavel' && g.D1.politica.orcamento.teto5 === 93 && g.D1.politica.orcamento.teto7 === 95 && !g.D1.existe);
  check('portão sugerido do .claude/fluxo.json (validacao)', g.D1.politica.portao === 'npm run check && npm test' && g.D1.info.validacao === 'npm run check && npm test');
  check('fim do ciclo: DEV1 = deploy; DEV2 = branch e handoff', g.D1.politica.fimCiclo === 'deploy' && g.D2.politica.fimCiclo === 'branch-handoff');
  // DEV2 tentando gravar deploy automático: a regra do processo principal corta
  const r2 = await call('politicaSet', D2, { ...g.D2.politica, modelo: 'deploy', deploy: { modo: 'sempre', receita: 'npm run deploy' } }, 'teste');
  check('DEV2: deploy "sempre" gravado vira "nunca" e o modelo vira "branch"', r2.ok && r2.politica.deploy.modo === 'nunca' && r2.politica.modelo === 'branch');
  check('DEV2: tarefa [DEPLOY] pausa como hoje', (await call('politicaTarefa', D2, { id: 'T3', deploy: true })).deploy === 'pausar');
  const m2 = await call('politicaModelo', D2, g.D2.politica, 'deploy');
  check('DEV2: aplicar o modelo "com deploy" não liga o deploy', m2.politica.deploy.modo === 'nunca' && m2.politica.modelo !== 'deploy');

  /* 2. modelos prontos e ajustes */
  const sup = P.aplicarModelo(g.D1.politica, 'supervisionado', g.D1.info), aut = P.aplicarModelo(g.D1.politica, 'deploy', g.D1.info);
  check('Supervisionado: pede autorização para deploy e decisões de produto', sup.deploy.modo === 'pedir' && sup.humano === 'produto' && !sup.ajustado);
  check('Autônomo com deploy (DEV1): deploy sempre automático', aut.deploy.modo === 'sempre' && aut.modelo === 'deploy');
  const aj = P.normalizar({ ...sup, humano: 'indispensavel' }, g.D1.info);
  check('ajuste fino por cima marca "ajustado"', aj.ajustado && aj.modelo === 'supervisionado');
  check('aplicar modelo mantém orçamento e modelos por papel', P.aplicarModelo({ ...g.D1.politica, orcamento: { teto5: 50, teto7: 60 }, modelos: { orq: 'opus', dev: 'sonnet' } }, 'supervisionado', g.D1.info).orcamento.teto5 === 50);
  check('valores inválidos voltam ao padrão (modelo IA, teto, humano)', (() => { const n = P.normalizar({ modelos: { orq: 'gpt' }, orcamento: { teto5: 'x', teto7: 500 }, humano: 'talvez' }, g.D1.info); return n.modelos.orq === '' && n.orcamento.teto5 === 93 && n.orcamento.teto7 === 100 && n.humano === 'indispensavel'; })());
  const rm = await call('politicaSet', D1, { ...g.D1.politica, deploy: { modo: 'marco', marco: '' } }, 'teste');
  check('marco sem texto não é gravado', !rm.ok && /marco/i.test(rm.problema || ''));

  /* 3. deploy: decisão do ciclo */
  const base = g.D1.politica, I = g.D1.info, dp = (d) => P.decidirDeploy(P.normalizar({ ...base, deploy: { ...base.deploy, ...d } }, I), I);
  // DEV2-016: Pedir autorização deixou de pausar como antes: pede a autorização (sino e painel)
  check('Nunca: [DEPLOY] pausa; Pedir autorização: autorizar (DEV2-016)', dp({ modo: 'nunca' }) === 'pausar' && dp({ modo: 'pedir' }) === 'autorizar');
  check('Sempre automático: deploy pendente e o ciclo segue', dp({ modo: 'sempre' }) === 'pendente');
  check('Marco não atingido: pausa; atingido: pendente', dp({ modo: 'marco', marco: 'v1.0 estável' }) === 'pausar' && dp({ modo: 'marco', marco: 'v1.0 estável', marcoAtingido: true }) === 'pendente');
  check('Pausar deploy com deploy automático: retido (não sai) e o ciclo segue', dp({ modo: 'sempre', pausado: true }) === 'retido' && dp({ modo: 'marco', marco: 'v1', marcoAtingido: true, pausado: true }) === 'retido');
  // DEV2-016: Pausar deploy deixa a tarefa retida em qualquer modo que publicaria (pedido do orquestrador)
  check('Pausar deploy com "pedir": retido (DEV2-016)', dp({ modo: 'pedir', pausado: true }) === 'retido');
  check('tarefa sem [DEPLOY]: nada a decidir', (await call('politicaTarefa', D1, { id: 'T1' })).deploy === '');

  /* 4. humano */
  check('[HUMANO] pausa em qualquer política', P.decidirHumano(P.normalizar({ humano: 'indispensavel' }, I), { humano: true }) === 'humano');
  check('"só o indispensável": tarefa comum não pausa', P.decidirHumano(P.normalizar({ humano: 'indispensavel' }, I), {}) === '' && P.decidirHumano(P.normalizar({ humano: 'produto' }, I), {}) === '');
  check('"sempre": pausa antes de cada tarefa', P.decidirHumano(P.normalizar({ humano: 'sempre' }, I), {}) === 'sempre');

  /* 5. teto (orçamento) */
  const now = Date.now(), win = (pct) => ({ pct, resets: now / 1000 + 3600 });
  const pol93 = P.normalizar({}, I);
  check('5 h em 93% (teto padrão 93): pausa, com retomada automática', (() => { const t = P.tetoAtingido(pol93, win(93), win(10), null); return t && t.tipo === '5h' && t.auto; })());
  check('5 h em 92%: segue', P.tetoAtingido(pol93, win(92), win(10), null) === null);
  const pol50 = P.normalizar({ orcamento: { teto5: 50, teto7: 40, usd: 2 } }, I);
  check('teto configurável: 5 h em 60% com teto 50 pausa', P.tetoAtingido(pol50, win(60), win(10), null).tipo === '5h');
  check('teto de 7 d: 7 d em 45% com teto 40 pausa', P.tetoAtingido(pol50, win(10), win(45), null).tipo === '7d');
  check('teto em US$: US$ 2,10 com teto US$ 2 pausa, sem retomada automática', (() => { const t = P.tetoAtingido(pol50, win(10), win(10), 2.1); return t && t.tipo === 'usd' && !t.auto && /2\.10/.test(t.motivo); })());
  check('janela vencida não conta', P.tetoAtingido(pol50, { pct: 99, resets: now / 1000 - 10 }, null, null) === null);
  check('sem limites conhecidos e sem US$: segue', P.tetoAtingido(pol50, null, null, null) === null);
  await call('politicaSet', D1, { ...base, orcamento: { teto5: 70, teto7: 95 } }, 'teste');
  check('canal politicaTeto usa o teto gravado (75% com teto 70 pausa)', ((await call('politicaTeto', D1, win(75), null, null)) || {}).tipo === '5h' && (await call('politicaTeto', D1, win(65), null, null)) === null);

  /* 6. gravação, reabrir o app e editar no meio do ciclo */
  const pol = { ...aut, portao: 'npm run check', deploy: { ...aut.deploy, receita: 'npm run build\nnpm run deploy' }, modelos: { orq: 'opus', dev: 'sonnet' }, orcamento: { teto5: 80, teto7: 90, usd: 5 } };
  const s1 = await call('politicaSet', D1, pol, 'antes de iniciar');
  check('política gravada em vibe\\<id>\\politica.json', s1.ok && fs.existsSync(path.join(UD, 'vibe', D1, 'politica.json')));
  ({ call } = mk()); // "reabrir o app": novo processo principal lendo a mesma pasta
  const r = await call('politicaGet', D1);
  check('relida ao reabrir o app (receita, portão, teto, modelos)', r.existe && r.politica.deploy.receita === 'npm run build\nnpm run deploy' && r.politica.portao === 'npm run check' && r.politica.orcamento.usd === 5 && r.politica.modelos.dev === 'sonnet' && r.politica.deploy.modo === 'sempre');
  check('a receita só é gravada (nenhum comando roda)', !fs.existsSync(path.join(S, 'dev1', 'dist')));
  await call('politicaSet', D1, { ...r.politica, humano: 'sempre' }, 'edição no painel');
  check('edição no meio do ciclo vale na próxima tarefa (politicaTarefa já lê a nova)', (await call('politicaTarefa', D1, { id: 'T4' })).humano === 'sempre');
  const j = JSON.parse(fs.readFileSync(path.join(UD, 'vibe', D1, 'politica.json'), 'utf8'));
  check('histórico das alterações (quando e o quê)', Array.isArray(j.alteracoes) && j.alteracoes.slice(-1)[0].motivo === 'edição no painel' && j.alteracoes.slice(-1)[0].campos.includes('humano'));

  /* 7. Pausar deploy */
  check('antes: [DEPLOY] com deploy automático = pendente', (await call('politicaTarefa', D1, { id: 'T5', deploy: true })).deploy === 'pendente');
  const pd = await call('politicaPausarDeploy', D1, true);
  check('Pausar deploy grava na hora', pd.ok && JSON.parse(fs.readFileSync(path.join(UD, 'vibe', D1, 'politica.json'), 'utf8')).deploy.pausado === true);
  check('com o deploy pausado: [DEPLOY] = retido, o resto do ciclo segue', (await call('politicaTarefa', D1, { id: 'T5', deploy: true })).deploy === 'retido' && (await call('politicaTarefa', D1, { id: 'T6' })).deploy === '');
  check('Pausar deploy não muda o resto da política', (await call('politicaGet', D1)).politica.deploy.modo === 'sempre' && (await call('politicaGet', D1)).politica.humano === 'sempre');
  check('resumo mostra DEPLOY PAUSADO', /DEPLOY PAUSADO/.test((await call('politicaGet', D1)).resumo));
  await call('politicaPausarDeploy', D1, false);
  check('Retomar deploy: volta a pendente', (await call('politicaTarefa', D1, { id: 'T5', deploy: true })).deploy === 'pendente');

  /* 8. agentes: modelo por papel no settings da aba e só o trecho relevante no pedido */
  W(path.join(UD, 'vibe', D1, 'estado.json'), JSON.stringify({ fase: 'pronto', orq: 'tab-orq', dev: 'tab-dev' }));
  const { api } = mk();
  const so = api.spawnSettings({ tabId: 'tab-orq', cwd: path.join(S, 'dev1'), args: [], settings: { hooks: {} } });
  const sd = api.spawnSettings({ tabId: 'tab-dev', cwd: path.join(S, 'dev1'), args: [], settings: { hooks: {} } });
  const jo = JSON.parse(fs.readFileSync(so, 'utf8')), jd = JSON.parse(fs.readFileSync(sd, 'utf8'));
  check('aba do orquestrador abre com o modelo da política (opus), a trava continua', jo.model === 'opus' && jo.hooks.PreToolUse && jo.permissions.deny.length > 0);
  check('aba do Dev abre com o modelo da política (sonnet)', jd.model === 'sonnet');
  const sn = api.spawnSettings({ tabId: 'tab-nova', cwd: path.join(S, 'dev1'), args: ['--name', 'Vibe · Dev'], settings: {} });
  check('aba nova do Dev (pelo nome) também recebe o modelo', JSON.parse(fs.readFileSync(sn, 'utf8')).model === 'sonnet');
  check('aba comum do app não muda', api.spawnSettings({ tabId: 'outra', cwd: path.join(S, 'solo'), args: [], settings: {} }) === null);
  await call('politicaSet', D1, { ...(await call('politicaGet', D1)).politica, modelos: { orq: '', dev: '' } }, 'teste');
  check('modelo padrão: sem a chave "model"', !('model' in JSON.parse(fs.readFileSync(api.spawnSettings({ tabId: 'tab-dev', cwd: path.join(S, 'dev1'), args: [], settings: {} }), 'utf8'))));
  await call('politicaSet', D1, { ...(await call('politicaGet', D1)).politica, humano: 'produto' }, 'teste');
  const pp = await call('cicloPrompt', D1, 'plano');
  const txt = fs.readFileSync(path.join(UD, 'vibe', D1, 'pedidos', 'pedido-plano.md'), 'utf8');
  check('pedido do plano continua curto e em arquivo', typeof pp === 'string' && pp.length < 200 && /pedidos/.test(pp));
  check('planejador recebe só o trecho relevante (decisões de produto e quem faz o deploy)', /decisões de produto/.test(txt) && /quem faz o deploy é o Termix/.test(txt) && !/npm run deploy|npm run build|teto|US\$/.test(txt));
  await call('cicloPrompt', D2, 'plano');
  const t2 = fs.readFileSync(path.join(UD, 'vibe', D2, 'pedidos', 'pedido-plano.md'), 'utf8');
  check('DEV2: planejador sabe que o fim é a branch e o handoff', /Não planeje deploy na main/.test(t2));
  const ex = await call('execPrompt', D1, 'dev', 'T1', {});
  check('pedido do Dev não traz a política', !/Política|deploy/i.test(fs.readFileSync(path.join(UD, 'vibe', D1, 'pedidos', 'pedido-T1-dev.md'), 'utf8')) && !!ex);

  console.log(`\n${ok} OK, ${bad} FALHOU`);
  process.exit(bad ? 1 : 0);
})();
