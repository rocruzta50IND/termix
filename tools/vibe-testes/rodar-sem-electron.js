'use strict';
// Roda, em sequência, os testes do módulo Vibe que NÃO abrem o Electron e compara com o resultado esperado.
// Uso: node tools/vibe-testes/rodar-sem-electron.js   (ou npm run test:vibe). Sem custo de IA; nunca em projeto real.
const path = require('path');
const { spawnSync } = require('child_process');
const { ROOT } = require('./lib');
const TESTES = [
  ['dep16', 68, 0], ['rec15', 36, 0], ['pol14', 55, 0], ['trava13', 113, 0], ['mod5', 31, 0], ['mod6', 41, 0], ['mod7', 23, 0],
  ['mod9', 16, 0], ['tar17', 33, 0], ['mut23', 97, 0], ['org26a', 14, 0], ['del25', 77, 0], ['ret26', 38, 0],
]; // [nome, certos esperados, falhas esperadas] (rec15: com caminho temporário curto passa 36/0; com caminho longo uma checagem de tamanho do pedido falha e dá 35/1, o que também é aceito)
let ruim = 0;
for (const [nome, okEsp, malEsp] of TESTES) {
  const r = spawnSync(process.execPath, [path.join(__dirname, `${nome}.js`), ROOT], { encoding: 'utf8', timeout: 600000, maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout || ''}\n${r.stderr || ''}`;
  let ok, mal, m;
  if ((m = /(\d+) casos, (\d+) OK, (\d+) falharam/.exec(out))) { ok = +m[2]; mal = +m[3]; }
  else if ((m = /(\d+) OK, (\d+) (?:FALHOU|FALHAS)/.exec(out))) { ok = +m[1]; mal = +m[2]; }
  else { ok = (out.match(/^OK /gm) || []).length; mal = (out.match(/^FALHOU/gm) || []).length; }
  const bate = (ok === okEsp && mal === malEsp) || (nome === 'rec15' && ok === 35 && mal === 1);
  if (!bate) ruim++;
  console.log(`${bate ? 'OK  ' : 'DIFERE'} ${nome}: ${ok} certos, ${mal} falhas (esperado ${okEsp}/${malEsp})`);
}
console.log(ruim ? `\n${ruim} teste(s) diferem do esperado` : '\nTodos como esperado');
process.exit(ruim ? 1 : 0);
