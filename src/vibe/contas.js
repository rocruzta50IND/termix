'use strict';
/* Contas do Termix (DEV2-025) — MOCK PROVISÓRIO.
   Ponto único de "quem é a pessoa deste Termix". Hoje: lista fixa de 5 nomes e uma escolha gravada localmente
   (<userData>\vibe\conta.json), sem PIN. Quando o login do Hub existir (com o PIN, que fica com o Rodrigo), só este arquivo
   muda: listarContas() e contaAtual() passam a vir do Hub e o resto do módulo (delegar.js e a interface) continua igual.
   Nada aqui é segurança: qualquer um escolhe qualquer nome. Serve só para endereçar pedidos ("para quem") e mostrar o
   aviso para a pessoa certa. */
const fs = require('fs');
const path = require('path');

const CONTAS = ['Ygor', 'Zanata', 'Rodrigo', 'Glayon', 'Gilbram']; // MOCK: lista fixa

const listarContas = () => CONTAS.slice();
const validaConta = (n) => (typeof n === 'string' && CONTAS.includes(n) ? n : '');

// dir: pasta de dados do módulo (<userData>\vibe). Função, para acompanhar o userData do momento.
function create({ dir }) {
  const arq = () => path.join(dir(), 'conta.json');
  const contaAtual = () => {
    try { return validaConta(JSON.parse(fs.readFileSync(arq(), 'utf8')).conta); } catch { return ''; }
  };
  const definirConta = (nome) => {
    const n = validaConta(nome);
    if (nome !== '' && nome != null && !n) return { ok: false, motivo: 'Conta desconhecida.' };
    fs.mkdirSync(dir(), { recursive: true });
    const tmp = `${arq()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ conta: n, mock: true, gravado: new Date().toISOString() }, null, 2));
    fs.renameSync(tmp, arq());
    return { ok: true, conta: n };
  };
  return { listarContas, contaAtual, definirConta, mock: true };
}

module.exports = { create, listarContas, CONTAS };
