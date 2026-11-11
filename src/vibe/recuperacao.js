'use strict';
/* Recuperação de erro do ciclo do Vibe (DEV2-015). Decisão do Ygor: erro simples não pode travar o projeto.
   Quando o Dev erra, estoura o tempo ou fica sem sinal, o Termix (código, sem IA):
   1. grava um diagnóstico em vibe\<id>\diagnosticos\Tk-n.md (tela da aba do Dev, git status, último commit, branch,
      motivo e o que já foi tentado);
   2. dá /clear no orquestrador e pede, por arquivo, UMA ação de uma lista fechada em vibe\<id>\recuperacao\Tk-n.json;
   3. executa a ação em código e confere o resultado como já faz. Até N voltas por tarefa (política, padrão 3); depois,
      a tarefa vira pendência e o ciclo segue.
   Este arquivo é o lado do processo principal (arquivos, git, comando "reiniciar o projeto"); quem conduz é a interface
   (src/renderer/vibe/vibe.js). */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ACOES = ['reenviar', 'clear_dev', 'f5_aba', 'f5_projeto', 'dividir', 'pular'];
const TK_RX = /^T\d+(?:\.[a-z]){0,3}$/; // T3, e as partes de uma tarefa dividida: T3.a, T3.b, T3.a.a...
const ACOES_TXT = {
  reenviar: 'reenviar: o Termix manda a tarefa de novo ao Dev, com a sua explicação extra (campo "explicacao")',
  clear_dev: 'clear_dev: /clear no Dev e a tarefa recomeça do zero, com o pedido normal',
  f5_aba: 'f5_aba: o Termix fecha e reabre a aba do Dev retomando a conversa (com a trava e o modelo atual) e pede para continuar',
  f5_projeto: 'f5_projeto: o Termix roda o comando "reiniciar o projeto" da política e depois reenvia a tarefa',
  dividir: 'dividir: a tarefa vira duas no plano (campo "dividir" com "a" e "b", cada uma com "titulo" e "criterio")',
  pular: 'pular: a tarefa vira pendência e o ciclo segue para a próxima',
};
// Mudar de pasta no comando de F5 do projeto não é aceito: ele roda sempre na pasta do projeto.
const CD_RX = /(^|[\s;&|(])(cd|chdir|pushd|popd|set-location|sl|push-location)(?=$|[\s;&|)])/i;

const str = (v, max) => String(v == null ? '' : v).replace(/\r/g, '').trim().slice(0, max);
const bool = (v) => v === true || /^(true|sim|yes|1)$/i.test(String(v == null ? '' : v).trim());

function create({ dirOf, readJson, validId, entregaOf, pastaDe, gitRun, headOf, branchDe, pedido, POL, decide, travaCfg, TEST }) {
  const pastaDo = (id) => { const e = entregaOf(id); return (e && e.projeto.pasta) || (pastaDe && pastaDe(id)) || ''; };
  const ok = (id, tk) => validId(id) && TK_RX.test(String(tk || ''));
  const diagF = (id, tk, n) => path.join(dirOf(id), 'diagnosticos', `${tk}-${n}.md`);
  const recF = (id, tk, n) => path.join(dirOf(id), 'recuperacao', `${tk}-${n}.json`);
  const politica = (id) => POL.ler(id) || null;
  const f5Cmd = (id) => { const p = politica(id); return (p && p.recuperacao && p.recuperacao.f5Projeto) || ''; };

  const api = {
    // Diagnóstico em código (sem IA). info: { quem, motivo, tela, tentado: [texto], max }
    recDiag(id, tk, n, info) {
      if (!ok(id, tk) || !(n >= 1 && n <= 9)) return { ok: false, motivo: 'Tarefa inválida.' };
      const i = info && typeof info === 'object' ? info : {};
      const pasta = pastaDo(id);
      const gs = pasta ? gitRun(pasta, ['status', '--short', '--branch']) : { ok: false, out: '' };
      const lc = pasta ? gitRun(pasta, ['log', '-1', '--format=%h %s (%cr)']) : { ok: false, out: '' };
      const branch = pasta ? headOf(pasta) : '';
      const permitida = pasta ? branchDe(id, pasta) : '';
      const tela = String(i.tela || '').replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+$/, '').slice(0, 300));
      while (tela.length && !tela[tela.length - 1]) tela.pop();
      const ult = tela.slice(-60);
      const status = (gs.ok ? gs.out : `(não foi possível ler: ${(gs.err || '').split('\n')[0]})`).split('\n').slice(0, 40).join('\n');
      const tentado = (Array.isArray(i.tentado) ? i.tentado : []).slice(-20).map((t) => `- ${str(t, 400)}`);
      const motivo = str(i.motivo, 1500) || 'sem motivo registrado';
      const md = [
        `# Diagnóstico do Termix: ${tk}, volta ${n} de ${i.max || n}`,
        '',
        `- Data: ${new Date().toISOString()}`,
        `- Quem: ${i.quem === 'orq' ? 'orquestrador' : 'Dev'}`,
        `- Erro ou motivo: ${motivo}`,
        `- Branch atual: ${branch || '(destacada ou sem git)'}${permitida ? ` (permitida: ${permitida})` : ''}`,
        `- Último commit: ${lc.ok && lc.out ? lc.out : '(nenhum)'}`,
        '',
        '## O que já foi tentado',
        tentado.length ? tentado.join('\n') : '- nada além do pedido normal',
        '',
        '## git status',
        '```',
        status || '(limpo)',
        '```',
        '',
        `## Últimas ${ult.length} linhas da tela da aba do Dev`,
        '```',
        ult.join('\n').replace(/```/g, "'''") || '(tela vazia)',
        '```',
        '',
      ].join('\n');
      const f = diagF(id, tk, n);
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, md);
      return { ok: true, arquivo: f, resumo: `${tk}: ${motivo}`.slice(0, 300), linhas: ult.length, branch };
    },

    // Pedido curto ao orquestrador (em arquivo): ler o diagnóstico e gravar UMA ação da lista fechada.
    recPrompt(id, tk, n, max) {
      if (!ok(id, tk) || !(n >= 1 && n <= 9)) return null;
      const d = dirOf(id), plano = path.join(d, 'plano.md'), res = path.join(d, 'resultados', `${tk}.md`);
      const acoes = ACOES.filter((a) => a !== 'f5_projeto' || f5Cmd(id));
      const out = recF(id, tk, n);
      const exemplo = '{"acao":"reenviar","explicacao":"o que dizer ao Dev","motivo":"por que esta ação","bloqueia_proximas":false}';
      return pedido(id, `${tk}-recuperacao-${n}`, [
        `Você é o ORQUESTRADOR do Vibe Coding do Termix. O Dev não concluiu a tarefa ${tk} e o Termix precisa de UMA decisão sua (volta ${n} de ${max || n}).`,
        `Leia o diagnóstico ${diagF(id, tk, n)} e a seção ${tk} de ${plano}${fs.existsSync(res) ? ` (e, se ajudar, ${res})` : ''}. Não altere o código, não rode comandos que mudem o projeto e não faça commit.`,
        `Grave ${out} com UMA ação desta lista fechada, no campo "acao":`,
        ...acoes.map((a) => `- ${ACOES_TXT[a]}`),
        `Formato: ${exemplo}. Para "dividir", acrescente "dividir":{"a":{"titulo":"...","criterio":"..."},"b":{"titulo":"...","criterio":"..."}}.`,
        `"bloqueia_proximas": true só se as próximas tarefas do plano dependerem desta (se ela virar pendência, o Termix pausa o ciclo em vez de seguir).`,
        'Ao terminar, responda apenas RECUPERACAO GRAVADA e encerre o turno.',
      ].join('\n'));
    },

    // Lê e confere a decisão. JSON inválido ou ação fora da lista = { ok: false } (o ciclo pausa).
    recLer(id, tk, n) {
      if (!ok(id, tk)) return { ok: false, motivo: 'Tarefa inválida.' };
      const f = recF(id, tk, n);
      let st;
      try { st = fs.statSync(f); } catch { return { ok: false, ausente: true, motivo: `O orquestrador não gravou recuperacao\\${tk}-${n}.json.` }; }
      let j;
      try { j = JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, '').replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, '')); } catch { return { ok: false, mtime: st.mtimeMs, motivo: `recuperacao\\${tk}-${n}.json não é um JSON válido.` }; }
      if (!j || typeof j !== 'object' || Array.isArray(j)) return { ok: false, mtime: st.mtimeMs, motivo: `recuperacao\\${tk}-${n}.json não tem o formato esperado.` };
      const acao = str(j.acao || j.action, 40).toLowerCase();
      if (!ACOES.includes(acao)) return { ok: false, mtime: st.mtimeMs, motivo: `A ação "${acao.slice(0, 40) || '(vazia)'}" não está na lista (${ACOES.join(', ')}).` };
      if (acao === 'f5_projeto' && !f5Cmd(id)) return { ok: false, mtime: st.mtimeMs, motivo: 'O orquestrador pediu f5_projeto, mas a política não tem o comando "reiniciar o projeto".' };
      const r = { ok: true, mtime: st.mtimeMs, acao, explicacao: str(j.explicacao || j.explicação, 1500), motivo: str(j.motivo, 600), bloqueia: bool(j.bloqueia_proximas) };
      if (acao === 'dividir') {
        const dv = j.dividir && typeof j.dividir === 'object' ? j.dividir : {};
        const parte = (p) => (p && typeof p === 'object' ? { titulo: str(p.titulo, 160), criterio: str(p.criterio || p.criterio_de_pronto, 1000) } : { titulo: '', criterio: '' });
        const a = parte(dv.a || (Array.isArray(dv) && dv[0])), b = parte(dv.b || (Array.isArray(dv) && dv[1]));
        if (!a.titulo || !b.titulo) return { ok: false, mtime: st.mtimeMs, motivo: 'Para "dividir", faltam os títulos das partes "a" e "b".' };
        r.dividir = { a, b };
      }
      return r;
    },

    // Divide Tk em Tk.a e Tk.b no plano.md (inseridas logo depois da seção Tk; o plano anterior fica numa cópia).
    planoDividir(id, tk, partes) {
      if (!ok(id, tk) || !partes || !partes.a || !partes.b) return { ok: false, motivo: 'Divisão inválida.' };
      const f = path.join(dirOf(id), 'plano.md');
      let text;
      try { text = fs.readFileSync(f, 'utf8').replace(/^﻿/, ''); } catch { return { ok: false, motivo: 'O plano.md não foi encontrado.' }; }
      const lines = text.replace(/\r/g, '').split('\n');
      const rx = /^[ \t]*(?:#{1,4}[ \t]*|\d+[.)][ \t]*|[-*][ \t]+)?(?:\*\*|__)?T(\d+)((?:\.[a-z])*)\b/;
      const starts = [];
      lines.forEach((l, i) => { const m = rx.exec(l); if (m) starts.push({ i, id: `T${m[1]}${m[2]}` }); });
      const ini = starts.find((s) => s.id === tk);
      if (!ini) return { ok: false, motivo: `A seção ${tk} não foi encontrada no plano.` };
      if (starts.some((s) => s.id === `${tk}.a` || s.id === `${tk}.b`)) return { ok: false, motivo: `A ${tk} já foi dividida.` };
      const prox = starts.find((s) => s.i > ini.i);
      const fim = prox ? prox.i : lines.length;
      const nivel = (/^[ \t]*(#{1,4})/.exec(lines[ini.i]) || [, '##'])[1];
      const sec = (k, p) => [`${nivel} ${tk}.${k} — ${p.titulo}`, `Parte ${k === 'a' ? '1' : '2'} de 2 da ${tk}, dividida pelo Termix na recuperação de erro (a seção ${tk} acima é o contexto).`, `Critério de pronto: ${p.criterio || 'o da seção ' + tk + ' que couber nesta parte'}.`, ''];
      const novo = [...lines.slice(0, ini.i + 1), `> Dividida pelo Termix em ${tk}.a e ${tk}.b (recuperação de erro): o Dev executa as partes, não esta seção.`, ...lines.slice(ini.i + 1, fim), ...(fim > 0 && lines[fim - 1] !== '' ? [''] : []), ...sec('a', partes.a), ...sec('b', partes.b), ...lines.slice(fim)];
      const copia = path.join(dirOf(id), `plano.antes-de-dividir-${tk}.md`);
      if (!fs.existsSync(copia)) fs.writeFileSync(copia, text);
      const tmp = `${f}.tmp`;
      fs.writeFileSync(tmp, novo.join('\n'));
      fs.renameSync(tmp, f);
      return { ok: true, copia };
    },

    // "F5 do projeto": roda o comando da política na pasta do projeto, depois de passar pelo verificador da trava.
    // Espera até `espera` ms: terminou com código 0 = ok; ainda rodando (ex.: servidor de desenvolvimento) = ok, fica rodando.
    f5Projeto(id, espera) {
      if (!validId(id)) return { ok: false, motivo: 'Projeto inválido.' };
      const cmd = f5Cmd(id);
      if (!cmd) return { ok: false, motivo: 'A política não tem o comando "reiniciar o projeto".' };
      const pasta = pastaDo(id);
      if (!pasta || !fs.existsSync(pasta)) return { ok: false, motivo: 'A pasta do projeto não foi encontrada.' };
      if (CD_RX.test(cmd)) return { ok: false, motivo: 'O comando de F5 do projeto não pode trocar de pasta (ele roda sempre na pasta do projeto).' };
      let veto = null;
      try { veto = decide({ tool_name: 'Bash', tool_input: { command: cmd }, cwd: pasta }, travaCfg(id, pasta)); } catch (e) { veto = 'A trava não conseguiu conferir o comando.'; }
      if (veto) return { ok: false, motivo: `A trava barrou o comando de F5 do projeto: ${String(veto).slice(0, 400)}` };
      const logF = path.join(dirOf(id), 'recuperacao', 'f5-projeto.log');
      fs.mkdirSync(path.dirname(logF), { recursive: true });
      fs.appendFileSync(logF, `\n=== ${new Date().toISOString()} · ${cmd}\n`);
      const fd = fs.openSync(logF, 'a');
      const ms = Math.min(120000, Math.max(1000, Number(espera) || (TEST ? 8000 : 15000)));
      return new Promise((resolve) => {
        let fim = false;
        const done = (r) => { if (fim) return; fim = true; try { fs.closeSync(fd); } catch { /* já fechado */ } resolve({ ...r, comando: cmd, log: logF }); };
        let ch;
        try { ch = spawn(cmd, { cwd: pasta, shell: true, windowsHide: true, stdio: ['ignore', fd, fd] }); } catch (e) { done({ ok: false, motivo: `Não foi possível rodar o comando: ${e.message}` }); return; }
        ch.on('error', (e) => done({ ok: false, motivo: `Não foi possível rodar o comando: ${e.message}` }));
        ch.on('exit', (code) => done(code === 0 ? { ok: true, estado: 'terminou', codigo: 0 } : { ok: false, estado: 'terminou', codigo: code, motivo: `O comando de F5 do projeto terminou com o código ${code} (veja ${logF}).` }));
        setTimeout(() => { if (!fim) { try { ch.unref(); } catch { /* sem processo */ } done({ ok: true, estado: 'rodando' }); } }, ms);
      });
    },
  };
  return { api };
}

module.exports = { create, ACOES, TK_RX };
