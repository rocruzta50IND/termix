// DEV2-017 (sem tokens): Vibe de tarefa no processo principal — entrega sintética com o resumo do projeto (sem IA),
// pedido de planejamento curto e histórico de 2 tarefas seguidas. Uso: node tar17.js <raiz do Termix>
const { ROOT: ROOT_PADRAO, WORK } = require('./lib'); // raiz do repositório e pasta temporária do sistema
const fs = require('fs'), path = require('path'); const { execFileSync } = require('child_process');
const ROOT = (process.argv[2] || ROOT_PADRAO), S = path.join(WORK, 't17');
fs.rmSync(S, { recursive: true, force: true }); fs.mkdirSync(S, { recursive: true });
process.env.TERMIX_VIBE_TEST = '1';
process.env.TERMIX_VIBE_CLAUDE_JSON = path.join(S, 'claude-teste.json');
fs.writeFileSync(process.env.TERMIX_VIBE_CLAUDE_JSON, '{"projects":{}}');
const W = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); };
const R = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '');
let ok = 0, bad = 0; const check = (n, c, extra = '') => { if (c) ok++; else bad++; console.log(`${c ? 'OK  ' : 'FALHOU'} ${n}${extra && !c ? ' — ' + extra : ''}`); };
const g = (d, ...a) => execFileSync('git', ['-C', d, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const UD = path.join(S, 'ud');
const h = {};
const api = require(path.join(ROOT, 'src/vibe/index.js')).create({ ipcMain: { handle: (ch, fn) => { h[ch] = fn; } }, app: { getPath: () => UD }, dialog: null, getWin: () => null, logError: (e) => console.log('logError', e && e.message) });

// projeto de brinquedo em andamento, com o fluxo (papel DEV2), README, CLAUDE.md e TASKS com uma tarefa em andamento
const PJ = path.join(S, 'loja');
W(path.join(PJ, 'README.md'), '<!-- comentário que não entra -->\n# Loja de brinquedo\n\nCatálogo simples em HTML.\n');
W(path.join(PJ, 'CLAUDE.md'), '# Loja\n\n- Rodar: abrir index.html\n- Validar: node --check app.js\n');
W(path.join(PJ, 'docs/TASKS.md'), '# Tarefas\n\n## Em andamento\n\n### TASK-007 — Carrinho\n- Status: EM ANDAMENTO\n- Próximo passo: botão remover\n\n## Prontas\n\n### TASK-006 — Lista\n');
W(path.join(PJ, '.claude/fluxo.json'), JSON.stringify({ validacao: ['node --check app.js'] }));
W(path.join(PJ, '.gitignore'), 'CLAUDE.local.md\n');
W(path.join(PJ, 'app.js'), 'console.log(1)\n');
execFileSync('git', ['init', '-q', '-b', 'main', PJ]);
g(PJ, 'config', 'user.name', 'Teste'); g(PJ, 'config', 'user.email', 't@exemplo.invalid');
g(PJ, 'add', '-A'); g(PJ, 'commit', '-qm', 'inicio da loja'); g(PJ, 'switch', '-qc', 'dev2');
W(path.join(PJ, 'app.js'), 'console.log(2)\n'); g(PJ, 'commit', '-qam', 'TASK-007: carrinho (parcial)');
W(path.join(PJ, 'CLAUDE.local.md'), 'papel: "DEV2"\nbranch_padrao: "dev2"\n');
const ID = 'p17';

// canais registrados
for (const ch of ['tarefaResumo', 'tarefaNova', 'tarefaFim', 'tarefaHist']) check(`canal vibe:${ch} registrado`, typeof h[`vibe:${ch}`] === 'function');

// resumo sem IA
const r = api.tarefaResumo(PJ);
check('resumo: branch atual dev2, branch de trabalho dev2, fluxo com papel DEV2', r && r.branch === 'dev2' && r.branchTrabalho === 'dev2' && r.fluxo && r.papel === 'DEV2', JSON.stringify(r && { b: r.branch, bt: r.branchTrabalho, p: r.papel }));
check('resumo: últimos commits (mais novo primeiro)', r && r.commits.length === 2 && /TASK-007: carrinho/.test(r.commits[0]) && /inicio da loja/.test(r.commits[1]));
check('resumo: README sem o comentário HTML', r && r.readme && /^# Loja de brinquedo/.test(r.readme.texto) && !/comentário/.test(r.readme.texto));
check('resumo: CLAUDE.md (primeiras linhas)', r && r.claude && /Validar: node --check app.js/.test(r.claude.texto));
check('resumo: tarefa em andamento do TASKS (só a seção, sem as Prontas)', r && r.andamento && /TASK-007/.test(r.andamento.texto) && !/TASK-006/.test(r.andamento.texto) && r.andamento.arquivo === 'docs/TASKS.md');
check('resumo: pasta inexistente = null', api.tarefaResumo(path.join(S, 'nao-existe')) === null && api.tarefaResumo(123) === null);
// TASKS sem a seção "Em andamento": linhas com EM ANDAMENTO e o título acima
const PJ2 = path.join(S, 'outro'); W(path.join(PJ2, 'TASKS.md'), '# T\n\n### TASK-1 — A\n- Status: PRONTA\n\n### TASK-2 — B\n- Status: EM ANDAMENTO\n');
execFileSync('git', ['init', '-q', '-b', 'main', PJ2]);
const r2 = api.tarefaResumo(PJ2);
check('resumo: TASKS sem a seção usa o grep "EM ANDAMENTO" com o título da tarefa', r2 && r2.andamento && /TASK-2 — B/.test(r2.andamento.texto) && !/TASK-1/.test(r2.andamento.texto) && !r2.fluxo && r2.branchTrabalho === 'vibe/outro', JSON.stringify(r2 && r2.andamento));

// conferência dos campos
const base = { projectId: ID, projectName: 'Loja', projectPath: PJ };
const e0 = api.tarefaNova({ ...base, oQue: '', criterio: '' });
check('tarefa sem "o que fazer" e sem critério é recusada (nada gravado)', e0 && !e0.ok && e0.problems.some((p) => /o que fazer/.test(p)) && e0.problems.some((p) => /critério/.test(p)) && !fs.existsSync(path.join(UD, 'vibe', ID, 'entrega.json')));
const e0b = api.tarefaNova({ ...base, oQue: 'x'.repeat(4001), criterio: 'ok' });
check('campo acima do limite é recusado', e0b && !e0b.ok);
const SG = path.join(S, 'semgit'); fs.mkdirSync(SG);
const e0c = api.tarefaNova({ projectId: 'psg', projectPath: SG, oQue: 'a', criterio: 'b' });
check('projeto sem git é recusado (Vibe de tarefa é para projeto em andamento)', e0c && !e0c.ok && /não tem git/.test(e0c.problems.join(' ')));

// tarefa 1
const VD = path.join(UD, 'vibe', ID);
const e1 = api.tarefaNova({ ...base, oQue: 'Botão remover item do carrinho', criterio: 'Clicar em remover tira o item e atualiza o total', naoPode: 'Não mexer no catálogo', arquivos: 'app.js; tela do carrinho' });
check('tarefa 1 gravada: entrega sintética modo "tarefa", n=1', e1 && e1.ok && e1.n === 1 && e1.entrega.modo === 'tarefa' && e1.entrega.tarefa.n === 1);
const ent1 = JSON.parse(R(path.join(VD, 'entrega.json')) || '{}');
check('entrega.json: objetivo, critério, o que não pode, sem acessos, estrutura.md e sem fluxo', ent1.objetivo === 'Botão remover item do carrinho' && ent1.criterioDePronto.startsWith('Clicar') && ent1.naoPodem === 'Não mexer no catálogo' && ent1.nadaAFornecer === true && ent1.arquivos.estrutura === 'estrutura.md' && !ent1.arquivos.fluxo && ent1.projeto.pasta === path.resolve(PJ));
const est1 = R(path.join(VD, 'estrutura.md'));
check('estrutura.md: a tarefa (4 campos) e o resumo do projeto (branch, papel, commits, README, CLAUDE.md, TASKS)', /# Tarefa 1/.test(est1) && /## O que fazer\n\nBotão remover/.test(est1) && /## Arquivos ou telas envolvidos\n\napp.js; tela do carrinho/.test(est1) && /Branch de trabalho dos agentes: dev2/.test(est1) && /papel DEV2/.test(est1) && /TASK-007: carrinho/.test(est1) && /Loja de brinquedo/.test(est1) && /Validar: node --check/.test(est1) && /Status: EM ANDAMENTO/.test(est1), est1.slice(0, 400));
check('nada foi escrito na pasta do projeto', g(PJ, 'status', '--porcelain') === '');

// pedido de planejamento
const ped = api.cicloPrompt(ID, 'plano');
const pedTxt = R((/leia e siga (.+)$/.exec(ped || '') || [])[1] || '');
check('pedido do plano: uma linha curta que aponta para o arquivo', ped && ped.length < 200 && /pedido-plano\.md$/.test(ped));
check('pedido do plano: tarefa num projeto em andamento, ler só o necessário por grep, poucas tarefas, só perguntas indispensáveis', /projeto que já está em andamento/.test(pedTxt) && /grep/.test(pedTxt) && /POUCAS tarefas/.test(pedTxt) && /indispensável/.test(pedTxt) && /estrutura\.md/.test(pedTxt));
check('pedido do plano: mesmas marcas [DEPLOY]/[HUMANO]/[SEM COMMIT], branch de trabalho e "até cumprir o critério de pronto da tarefa"', /\[DEPLOY\]/.test(pedTxt) && /\[HUMANO\]/.test(pedTxt) && /\[SEM COMMIT\]/.test(pedTxt) && /Branch de trabalho: dev2/.test(pedTxt) && /até cumprir o critério de pronto da tarefa/.test(pedTxt) && !/até o fim do projeto/.test(pedTxt));
check('pedido do plano: PLANO GRAVADO e nada fora da pasta do Vibe', /PLANO GRAVADO/.test(pedTxt) && /Não escreva fora de/.test(pedTxt));
check('pedido do plano curto (menos de 3.500 caracteres)', pedTxt.length < 3500, String(pedTxt.length));
// o pedido do projeto novo não mudou
W(path.join(UD, 'vibe', 'pnovo', 'entrega.json'), JSON.stringify({ versao: 1, status: 'pronta', projeto: { id: 'pnovo', nome: 'n', pasta: PJ2 }, objetivo: 'x', criterioDePronto: 'y', naoPodem: '', acessos: [], nadaAFornecer: true, arquivos: { fluxo: 'fluxo.md', estrutura: 'estrutura.md' } }));
const pedN = R((/leia e siga (.+)$/.exec(api.cicloPrompt('pnovo', 'plano') || '') || [])[1] || '');
check('pedido do projeto novo continua o mesmo (até o fim do projeto, sem "Vibe de tarefa")', /até o fim do projeto/.test(pedN) && !/Vibe de tarefa/.test(pedN) && /ORQUESTRADOR do Vibe Coding/.test(pedN));

// simula o ciclo da tarefa 1: concluído com 1 feita e 1 pendência
W(path.join(VD, 'estado.json'), JSON.stringify({ fase: 'concluido', exec: { branch: 'dev2', tarefas: [{ id: 'T1' }, { id: 'T2' }], feitas: [{ id: 'T1', titulo: 'Remover', commit: 'abc123 T1: remover' }], pendencias: [{ id: 'T2', titulo: 'Total', motivo: 'voltas esgotadas' }] } }));
const f1 = api.tarefaFim(ID);
check('fim da tarefa 1: concluída no histórico com feitas e pendências', f1 && f1.status === 'concluida' && f1.feitas.length === 1 && f1.feitas[0].commit.startsWith('abc123') && f1.pendencias.length === 1 && f1.pendencias[0].motivo === 'voltas esgotadas' && f1.branch === 'dev2');
check('fim repetido não muda nada (sem tarefa em andamento)', api.tarefaFim(ID) === null);
// a interface arquiva o ciclo (cicloNovo) e grava a tarefa 2
api.cicloNovo(ID);
const e2 = api.tarefaNova({ ...base, oQue: 'Mostrar o total com desconto', criterio: 'Total com 10% de desconto acima de R$ 100' });
check('tarefa 2 gravada (n=2) sem apagar a anterior', e2 && e2.ok && e2.n === 2);
const hist = api.tarefaHist(ID);
check('histórico: 2 tarefas, a mais nova primeiro; a 2 em andamento, a 1 concluída', hist.length === 2 && hist[0].n === 2 && hist[0].status === 'andamento' && hist[1].n === 1 && hist[1].status === 'concluida' && hist[1].pendencias.length === 1);
const hdir = fs.readdirSync(path.join(VD, 'historico'));
check('a entrega da tarefa 1 ficou no historico\\<data>\\ (entrega.json e estrutura.md)', hdir.some((d) => /Botão remover/.test(R(path.join(VD, 'historico', d, 'entrega.json'))) && /Botão remover/.test(R(path.join(VD, 'historico', d, 'estrutura.md')))));
check('o ciclo da tarefa 1 ficou no historico\\ciclo-<data>\\', hdir.some((d) => d.startsWith('ciclo-') && fs.existsSync(path.join(VD, 'historico', d, 'estado.json'))));
// tarefa 3 enquanto a 2 não terminou: a 2 vira "interrompida"
W(path.join(VD, 'estado.json'), JSON.stringify({ fase: 'parado', exec: { branch: 'dev2', tarefas: [{ id: 'T1' }], feitas: [] } }));
const e3 = api.tarefaNova({ ...base, oQue: 'Terceira', criterio: 'ok' });
const h3 = api.tarefaHist(ID);
check('tarefa nova com a anterior parada: a anterior fica "interrompida", nada apagado', e3.ok && h3.length === 3 && h3[1].n === 2 && h3[1].status === 'interrompida' && h3[2].status === 'concluida');
check('histórico com id inválido = lista vazia', Array.isArray(api.tarefaHist('../x')) && api.tarefaHist('../x').length === 0);

// a trava continua valendo na aba do Vibe de tarefa (entrega sintética com a pasta do projeto)
const sf = api.spawnSettings({ tabId: 'tab-orq-17', cwd: PJ, args: ['--name', 'Vibe · Orquestrador'], settings: {} });
const sj = sf && JSON.parse(R(sf) || '{}');
const tj = JSON.parse(R(path.join(VD, 'trava', 'trava.json')) || '{}');
check('aba do Vibe de tarefa abre com a trava (PreToolUse) e a branch dev2', sj && sj.hooks && sj.hooks.PreToolUse && tj.branch === 'dev2' && path.resolve(tj.projeto) === path.resolve(PJ));

console.log(`\n${ok} OK, ${bad} FALHOU`);
process.exit(bad ? 1 : 0);
