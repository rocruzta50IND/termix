'use strict';
// Roda UM teste com Electron (agente falso, instância isolada, CDP): node tools/vibe-testes/rodar-electron.js run26
// Sem argumento, lista os testes. Windows (electron.exe e claude.cmd). Sem custo de IA; nunca em projeto real.
const path = require('path');
const { spawnSync } = require('child_process');
const { ROOT } = require('./lib');
const LISTA = ['run7', 'run15', 'run16 a', 'run16 b', 'run17', 'run22', 'run23', 'run24', 'run25', 'run26', 'embed-delegar27'];
const arg = process.argv.slice(2);
if (!arg.length) { console.log('Testes com Electron:\n  ' + LISTA.join('\n  ')); process.exit(0); }
const nome = arg[0];
const r = spawnSync(process.execPath, [path.join(__dirname, `${nome}.js`), ROOT, ...arg.slice(1)], { stdio: 'inherit', timeout: 900000 });
process.exit(r.status || 0);
