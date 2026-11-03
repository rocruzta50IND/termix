// TASK-081: fixa o Termix.exe entre as versões.
// O Smart App Control do Windows bloqueia executáveis sem assinatura e com reputação desconhecida, e o Termix.exe muda a cada versão (o electron-builder
// grava a versão nele), então cada versão nova era uma chance de o Windows bloquear o app (aconteceu na 0.3.1). Este gancho troca o Termix.exe recém-montado
// pelo "casco" fixo guardado em build-cache/Termix-shell.exe (o executável da 0.3.0, que o Windows já liberou): o código do app está em resources/app,
// o exe é só o motor Electron. Sem o arquivo de casco, não faz nada (o build segue normal, com o aviso).
// build-cache/ não vai para o git (o arquivo tem ~250 MB); para gerar o casco de novo, extraia o Termix.exe de um instalador que funcionou.
const fs = require('fs');
const path = require('path');

exports.default = async function afterPack(context) {
  const shell = path.join(__dirname, '..', 'build-cache', 'Termix-shell.exe');
  const target = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  if (!fs.existsSync(shell)) {
    console.warn('  • AVISO: build-cache/Termix-shell.exe não existe; o Termix.exe desta versão vai mudar e o Smart App Control pode bloquear.');
    return;
  }
  fs.copyFileSync(shell, target);
  console.log(`  • Termix.exe fixado (casco ${(fs.statSync(shell).size / 1048576).toFixed(0)} MB) em ${path.basename(context.appOutDir)}`);
};
