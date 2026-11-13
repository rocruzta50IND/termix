function montar(k, conflito) {
  const { REM, DONO, ANA, BIA } = dirs(k);
  execFileSync('git', ['init', '-q', '--bare', '-b', 'master', REM]);
  execFileSync('git', ['clone', '-q', REM, DONO]);
  g(DONO, 'config', 'user.name', 'Dono'); g(DONO, 'config', 'user.email', 'dono@teste');
  W(path.join(DONO, 'CLAUDE.md'), '# Tarefinhas\n\nApp de lista de tarefas em HTML e JavaScript puro, sem dependências. Abre direto no navegador (index.html). Validação: node --check src/*.js.\n\n- `index.html`: página única.\n- `src/app.js`: lista de tarefas.\n- `src/filtros.js`: filtros (parte da Ana).\n- `src/exportar.js`: exportar CSV (parte da Bia).\n');
  W(path.join(DONO, 'index.html'), '<!doctype html><html><head><meta charset="utf-8"><title>Tarefinhas</title></head><body><h1>Tarefinhas</h1><ul id="lista"></ul><script src="src/app.js"></script></body></html>\n');
  W(path.join(DONO, 'src/app.js'), "const tarefas = [];\nfunction adicionar(t) { tarefas.push({ t, feita: false }); desenhar(); }\nfunction desenhar() { document.getElementById('lista').innerHTML = tarefas.map((x) => `<li>${x.t}</li>`).join(''); }\n");
  W(path.join(DONO, 'docs/ROADMAP.md'), '# O que falta\n\n1. Filtros: todas, pendentes, feitas (src/filtros.js).\n2. Exportar CSV (src/exportar.js).\n3. Ligar as duas na index.html (botões e scripts).\n');
  W(path.join(DONO, '.claude/fluxo.json'), '{"validacao":["node --check src/app.js"]}\n'); W(path.join(DONO, '.gitignore'), 'CLAUDE.local.md\nmutirao/PEDIDO.md\n');
  g(DONO, 'add', '-A'); g(DONO, 'commit', '-qm', 'inicio'); g(DONO, 'push', '-q', 'origin', 'master');
  for (const b of ['dev1', 'dev2', 'dev3']) { g(DONO, 'branch', b); g(DONO, 'push', '-q', 'origin', b); }
  g(DONO, 'switch', '-q', 'dev1');
  W(path.join(DONO, 'CLAUDE.local.md'), 'papel: "DEV1"\nbranch_padrao: "dev1"\n');
  // divisão publicada (como o "Publicar" da DEV2-005 faria): commit só de mutirao/ na dev1 e push da dev1
  const div = { branchDono: 'dev1', objetivo: 'Tarefinhas com filtros e exportação em CSV, ligados na página', criterio: 'A index.html mostra os botões de filtro e o de exportar, e os três scripts passam no node --check.', participantes: [{ nome: 'Ana', branch: 'dev2' }, { nome: 'Bia', branch: 'dev3' }],
    partes: [{ branch: 'dev2', titulo: 'Filtros', objetivo: 'Função filtrar(tarefas, modo) em src/filtros.js', criterio: 'filtrar devolve todas, pendentes ou feitas', arquivos: ['src/filtros.js'] }, { branch: 'dev3', titulo: 'Exportar CSV', objetivo: 'Função paraCSV(tarefas) em src/exportar.js', criterio: 'paraCSV devolve o texto CSV', arquivos: ['src/exportar.js'] }] };
  W(path.join(DONO, 'mutirao/divisao.json'), JSON.stringify(div, null, 2));
  W(path.join(DONO, 'mutirao/partes/dev2.md'), MD('Filtros', { Objetivo: 'Função filtrar(tarefas, modo) em src/filtros.js.' }));
  W(path.join(DONO, 'mutirao/partes/dev3.md'), MD('Exportar', { Objetivo: 'Função paraCSV(tarefas) em src/exportar.js.' }));
  g(DONO, 'add', 'mutirao'); g(DONO, 'commit', '-qm', 'Mutirao: divisao do trabalho (2 partes)'); g(DONO, 'push', '-q', 'origin', 'dev1');
  const pubSha = g(DONO, 'rev-parse', 'HEAD');
  // sócias: sincronizam com a dev1, fazem a parte e a entrega (por script, sem rodar o Vibe) e enviam só a branch delas
  for (const [dir, b, n, arq, txt] of [[ANA, 'dev2', 'Ana', 'src/filtros.js', "function filtrar(tarefas, modo) { if (modo === 'pendentes') return tarefas.filter((x) => !x.feita); if (modo === 'feitas') return tarefas.filter((x) => x.feita); return tarefas; }\n"], [BIA, 'dev3', 'Bia', 'src/exportar.js', "function paraCSV(tarefas) { return ['tarefa,feita', ...tarefas.map((x) => `\"${x.t}\",${x.feita ? 'sim' : 'nao'}`)].join('\\n'); }\n"]]) {
    execFileSync('git', ['clone', '-q', '-b', b, REM, dir]);
    g(dir, 'config', 'user.name', n); g(dir, 'config', 'user.email', `${b}@teste`);
    W(path.join(dir, 'CLAUDE.local.md'), `papel: "${b.toUpperCase()}"\nbranch_padrao: "${b}"\n`);
    g(dir, 'merge', '-q', '--ff-only', 'origin/dev1');
    W(path.join(dir, arq), txt);
    if (conflito) W(path.join(dir, 'src/app.js'), fs.readFileSync(path.join(DONO, 'src/app.js'), 'utf8') + (b === 'dev2' ? "// Ana: filtros em src/filtros.js\nlet modo = 'todas';\n" : "// Bia: exportar em src/exportar.js\nconst separador = ',';\n"));
    g(dir, 'add', '-A'); g(dir, 'commit', '-qm', `T1: ${n} - ${arq}`);
    W(path.join(dir, `mutirao/entregas/${b}.json`), JSON.stringify({ versao: 1, branch: b, data: new Date().toISOString(), titulo: n === 'Ana' ? 'Filtros' : 'Exportar CSV', commits: [g(dir, 'log', '-1', '--format=%h %s')], tarefas: [{ id: 'T1', titulo: `criar ${arq}`, commit: g(dir, 'log', '-1', '--format=%h') }], resumo: `${n} criou ${arq}.${conflito ? ' Também anotou em src/app.js.' : ''}` }, null, 2));
    g(dir, 'add', `mutirao/entregas/${b}.json`); g(dir, 'commit', '-qm', `Mutirao: entrega da parte ${b}`); g(dir, 'push', '-q', 'origin', b);
  }
  return { pubSha, div };
}

const { ROOT: ROOT_PADRAO, WORK } = require('./lib'); // raiz do repositório e pasta temporária do sistema
