// Lança o auxiliar da atualização (TASK-056): uma janelinha separada (src/update-helper.ps1) que sobrevive ao fechamento do app e
// mostra "Atualizando o Termix…" até ele abrir de novo. Se qualquer coisa falhar, a atualização segue normalmente, só sem a janelinha.
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPT_SRC = path.join(__dirname, 'update-helper.ps1');
const SCRIPT_TMP = path.join(os.tmpdir(), 'termix-updating.ps1'); // roda de uma cópia: o instalador vai trocar os arquivos da pasta do app
const FLAG = path.join(os.tmpdir(), 'termix-started.json'); // o app grava aqui quando termina de abrir
const TIMELINE = path.join(os.tmpdir(), 'termix-updating.json'); // o auxiliar grava aqui quando o app fechou e quando voltou

function startUpdateHelper({ version = '', parentPid = process.pid, processName = path.basename(process.execPath, '.exe'), timeoutSec = 600, shot = '' } = {}) {
  if (process.platform !== 'win32') return false;
  try {
    try { fs.unlinkSync(TIMELINE); } catch { /* sem registro anterior */ }
    // o PowerShell 5.1 só lê acentos certos se o arquivo tiver BOM
    fs.writeFileSync(SCRIPT_TMP, '﻿' + fs.readFileSync(SCRIPT_SRC, 'utf8').replace(/^﻿/, ''), 'utf8');
    const args = ['-NoProfile', '-NonInteractive', '-STA', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', SCRIPT_TMP,
      '-ParentPid', String(parentPid), '-Version', String(version), '-ProcessName', processName, '-TimeoutSec', String(timeoutSec), '-Timeline', TIMELINE, '-Flag', FLAG];
    if (shot) args.push('-Shot', shot);
    // O instalador encerra o Termix.exe com `taskkill /T`, que leva junto todos os processos FILHOS dele: um auxiliar filho do Termix morria
    // na hora (foi o que escondeu a janelinha). Por isso o auxiliar é lançado por um cmd.exe intermediário (`start`) que sai logo em seguida: o
    // auxiliar fica órfão, fora da árvore do Termix. (Sem `detached`: com ele o PowerShell perde o console e sai na hora, sem janela.)
    const q = (s) => '"' + String(s).replace(/"/g, '') + '"';
    const cmdline = 'start "" /B powershell.exe ' + args.map(q).join(' ');
    const child = spawn('cmd.exe', ['/d /s /c "' + cmdline + '"'], { stdio: 'ignore', windowsHide: true, windowsVerbatimArguments: true });
    child.on('error', () => { /* sem PowerShell: segue sem a janelinha */ });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

// quanto tempo o app ficou fechado (do último instante dele até a janela voltar), medido pelo auxiliar; null se não houver registro
function readHelperTimeline() {
  try {
    const t = JSON.parse(fs.readFileSync(TIMELINE, 'utf8').replace(/^﻿/, ''));
    try { fs.unlinkSync(TIMELINE); } catch { /* ignora */ }
    if (t && t.closedAt && t.backAt && t.backAt >= t.closedAt) {
      const out = { closedMs: t.backAt - t.closedAt };
      if (t.installerStart && t.installerEnd && t.installerStart >= t.closedAt && t.installerEnd >= t.installerStart && t.backAt >= t.installerEnd) {
        out.beforeMs = t.installerStart - t.closedAt; // do app fechar até o instalador começar
        out.installerMs = t.installerEnd - t.installerStart; // o instalador (desinstala a versão antiga e instala a nova)
        out.afterMs = t.backAt - t.installerEnd; // do instalador terminar até a janela do Termix voltar
      }
      return out;
    }
  } catch { /* sem registro */ }
  return null;
}

// o instalador da atualização está rodando agora? (Termix-Setup-<versão>.exe). Abrir o app nessa hora interrompe a instalação sem avisar.
function installerRunning() {
  if (process.platform !== 'win32') return false;
  try {
    const r = require('child_process').spawnSync('tasklist', ['/FI', 'IMAGENAME eq Termix-Setup*', '/NH'], { encoding: 'utf8', windowsHide: true, timeout: 5000 });
    return /Termix-Setup/i.test(r.stdout || '');
  } catch { return false; }
}

// TASK-069: roda um script PowerShell solto (fora da árvore do Termix, sobrevive ao fechamento do app) a partir de uma cópia em %TEMP%.
// Usado para trocar os arquivos do app pela versão nova depois que ele fecha (src/apply-update.ps1).
function runDetachedScript(scriptSrc, tmpName, params) {
  if (process.platform !== 'win32') return false;
  try {
    const tmp = path.join(os.tmpdir(), tmpName);
    fs.writeFileSync(tmp, '﻿' + fs.readFileSync(scriptSrc, 'utf8').replace(/^﻿/, ''), 'utf8');
    const args = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', tmp];
    for (const [k, v] of Object.entries(params)) args.push('-' + k, String(v));
    // cmd.exe intermediário (start) que sai logo: o script fica órfão, fora da árvore do Termix. spawnSync espera o cmd sair, o que garante que o
    // PowerShell já foi criado antes de o app terminar (lançar sem esperar perdia o script quando o app saía no mesmo instante).
    const q = (x) => '"' + String(x).replace(/"/g, '') + '"';
    const r = require('child_process').spawnSync('cmd.exe', ['/d /s /c "start "" /B powershell.exe ' + args.map(q).join(' ') + '"'], { stdio: 'ignore', windowsHide: true, windowsVerbatimArguments: true, timeout: 8000 });
    if (r.error) return false;
    return true;
  } catch { return false; }
}

module.exports = { startUpdateHelper, readHelperTimeline, installerRunning, runDetachedScript };
