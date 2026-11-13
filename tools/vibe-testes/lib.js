'use strict';
// Ajudante comum dos testes do módulo Vibe (tools/vibe-testes). Nada aqui toca em projeto real nem gasta IA.
// ROOT: raiz do repositório (relativa a este arquivo). WORK: pasta temporária do sistema (apagada pelos testes a cada rodada).
// Também aponta o Claude Code para uma configuração de TESTE, para nunca tocar no ~/.claude.json de verdade.
const path = require('path');
const os = require('os');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '..', '..');
const WORK = path.join(fs.realpathSync.native(os.tmpdir()), 'termix-vibe-testes'); // nome longo (o tmpdir do Windows pode vir no formato curto 8.3, que confunde os caminhos dos projetos de teste)
fs.mkdirSync(WORK, { recursive: true });
if (!process.env.CLAUDE_CONFIG_DIR) process.env.CLAUDE_CONFIG_DIR = path.join(WORK, 'claude-cfg-teste');
if (!process.env.TERMIX_VIBE_CLAUDE_JSON) process.env.TERMIX_VIBE_CLAUDE_JSON = path.join(WORK, 'claude-teste.json');
fs.mkdirSync(process.env.CLAUDE_CONFIG_DIR, { recursive: true });
// Os agentes falsos (fake/ e fakeret/) são copiados para a pasta temporária a cada uso: com espaço no caminho (ex.: "DEV 2 Central") o Termix não acha o claude.cmd falso no PATH.
for (const d of ['fake', 'fakeret']) fs.cpSync(path.join(__dirname, d), path.join(WORK, d), { recursive: true, force: true });
module.exports = { ROOT, WORK };
