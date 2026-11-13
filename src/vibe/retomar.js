'use strict';
/* DEV2-026: "Retomar projeto" e a estrutura legível do projeto (guia, tarefas e estado).
   Processo principal. Canais 'vibe:ret*', registrados pelo index.js. Tudo aqui é SEM IA, exceto a coleta em segundo plano,
   que roda `claude -p --resume <id>` por terminal, em somente leitura (sem ferramentas), e só quando o usuário pede.
   Nas pastas do usuário este módulo só LÊ; quem grava a estrutura (CLAUDE.md, docs/TASKS.md, docs/ESTADO.md, sem commit)
   é o orquestrador novo, por um pedido em arquivo. O que o Termix guarda fica em <userData>\retomar\<projeto>\.
   Desenho: docs/ORGANIZADOR.md ("Retomar projeto"). */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const ORG = require('./organizador');

const isFile = (f) => { try { return fs.statSync(f).isFile(); } catch { return false; } };
const isDir = (f) => { try { return fs.statSync(f).isDirectory(); } catch { return false; } };
const lsDir = (d) => { try { return fs.readdirSync(d); } catch { return []; } };
const readTxt = (f, n = 400 * 1024) => { try { return fs.readFileSync(f, 'utf8').slice(0, n); } catch { return ''; } };
const tem = (f) => readTxt(f, 4096).replace(/\s+/g, '').length >= 20; // "com conteúdo"
const slug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'projeto';
const validP = (g) => typeof g === 'string' && /^[a-z0-9-]{1,80}$/.test(g);
const TETO_CONVERSAS = 5; // teto padrão da coleta (as mais recentes)
const PRAZO_CONVERSA = 12 * 60000; // cada conversa: no máximo isto

// Os 8 itens do PROMPT FIXO (aprovado pelo Ygor, 12/11).
const PROMPT_FIXO = `Responda em texto, de forma curta (no máximo ~800 palavras), só com o que ESTA conversa sabe sobre o projeto. Onde não souber, escreva "não sei": não chute e não invente. Não use ferramentas, não leia arquivos e não rode comandos; só responda.

Os 8 itens, nesta ordem:
1. Objetivo do projeto e para quem é.
2. Organização: pastas e arquivos principais e para que servem.
3. Decisões tomadas e o porquê.
4. O que já foi feito.
5. O que está em andamento e o próximo passo.
6. Pendências e problemas conhecidos.
7. Como rodar e testar (comandos).
8. Regras e preferências do usuário neste projeto.`;

// ---------- estrutura (sem IA) ----------
// "Estrutura existente" = guia + tarefas + estado, os três com conteúdo. Para a detecção, aceita equivalentes comuns.
const GUIA = ['CLAUDE.md', 'AGENTS.md'];
const TAREFAS = ['docs/TASKS.md', 'TASKS.md', 'docs/TAREFAS.md', 'TAREFAS.md', 'TODO.md'];
const ESTADO = ['docs/ESTADO.md', 'ESTADO.md', 'docs/HANDOFF.md', 'HANDOFF.md', 'docs/CHECKPOINT.md', 'CHECKPOINT.md'];
function achar(pasta, cands, extraRx) {
  for (const c of cands) if (tem(path.join(pasta, c))) return c;
  if (extraRx) for (const d of ['', 'docs']) for (const f of lsDir(path.join(pasta, d))) if (extraRx.test(f) && tem(path.join(pasta, d, f))) return d ? `${d}/${f}` : f;
  return null;
}
function estruturaDe(pasta) {
  const guia = achar(pasta, GUIA);
  const tarefas = achar(pasta, TAREFAS, /^TASKS[\w.-]*\.md$/i);
  const estado = achar(pasta, ESTADO, /^(HANDOFF|ESTADO|CHECKPOINT)[\w.-]*\.md$/i);
  const falta = [];
  if (!guia) falta.push('guia (CLAUDE.md)');
  if (!tarefas) falta.push('lista de tarefas (docs/TASKS.md)');
  if (!estado) falta.push('estado atual (docs/ESTADO.md)');
  return { guia, tarefas, estado, completa: falta.length === 0, falta };
}

// Pasta principal de um grupo: a do papel de dev; senão a com o commit mais recente (o usuário pode trocar no mapa).
function pastaPrincipal(lista) {
  const ex = (lista || []).filter((a) => a && a.existe);
  if (!ex.length) return null;
  const dev = ex.filter((a) => a.papel === 'Dev');
  const base = dev.length ? dev : ex;
  const t = (a) => { const c = a.git && a.git.commits && a.git.commits[0]; const m = c && /^S+ (d{4}-d{2}-d{2})/.exec(c); return m ? m[1] : ''; }; // data do último commit (AAAA-MM-DD)
  return base.slice().sort((a, b) => (t(b) > t(a) ? 1 : t(b) < t(a) ? -1 : 0))[0].pasta;
}

// ---------- conversas fora do Termix ----------
// Lista as conversas do Claude Code das pastas (todas as pastas do projeto entram), da mais recente para a mais antiga.
function conversasDe(pastas, ignorar = []) {
  const skip = new Set(ignorar);
  const out = [];
  for (const p of [...new Set(pastas || [])]) {
    for (const s of ORG.sessoesDe(p, 40)) if (!skip.has(s.id)) out.push({ ...s, pasta: p });
  }
  out.sort((a, b) => b.mtime - a.mtime);
  return out.map((s) => ({ id: s.id, pasta: s.pasta, mtime: s.mtime, size: s.size, titulo: s.titulo, primeiro: s.primeiro }));
}
// Custo estimado: cada conversa é reprocessada uma vez (~4 bytes por token no .jsonl, que traz bastante metadado).
const tokensDe = (bytes) => Math.round(Math.min(bytes, 3 * 1048576) / 4 / 1000) * 1000;

// ---------- claude CLI ----------
function acharClaude() {
  const home = os.homedir();
  const dirs = (process.env.PATH || '').split(path.delimiter);
  dirs.push(path.join(home, '.local', 'bin'), path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'npm'),
    path.join(process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'Programs', 'claude'));
  for (const d of dirs) for (const f of ['claude.exe', 'claude.cmd']) { const full = path.join(d, f); if (d && isFile(full)) return full; }
  return null;
}
const SESSION_BOUND = ['CLAUDECODE', 'CLAUDE_PID', 'CLAUDE_CODE_BRIDGE_SESSION_ID', 'CLAUDE_CODE_CHILD_SESSION', 'CLAUDE_CODE_ENTRYPOINT', 'CLAUDE_CODE_MESSAGING_SOCKET', 'CLAUDE_CODE_MESSAGING_TOKEN', 'CLAUDE_CODE_SESSION_ATTENDED', 'CLAUDE_CODE_SESSION_ID'];
// Argumentos da coleta (conferidos em `claude --help`): -p; --resume <id>; --fork-session (a pergunta NÃO entra na conversa
// original: o Claude Code cria uma cópia); --model sonnet; --tools "" (nenhuma ferramenta: não grava nem roda comandos);
// --permission-mode dontAsk (o que pedisse permissão é negado); --output-format json (para ler resultado e id da cópia).
const argsColeta = (id) => ['-p', '--resume', id, '--fork-session', '--model', 'sonnet', '--tools', '', '--permission-mode', 'dontAsk', '--output-format', 'json'];
const q = (a) => (/^[\w.:\\/=@-]+$/.test(a) && a !== '' ? a : `"${String(a).replace(/"/g, '\\"')}"`);

// ---------- pedidos em arquivo (lidos pelo orquestrador; o Termix digita só uma linha) ----------
const REGRAS_ARQ = `Arquivos da estrutura (só estes três; NÃO use o /fluxo:init nem o fluxo Rocruzta):
- **guia = \`CLAUDE.md\`**: se já existir, ACRESCENTE uma seção no fim ("## Estrutura do projeto (Termix)"); nunca sobrescreva nem apague nada.
- **tarefas = \`docs/TASKS.md\`**, com as seções "Em andamento", "Pendentes" e "Concluídas".
- **estado = \`docs/ESTADO.md\`**, com "Onde paramos" e "Próximo passo".
Se algum já existir com conteúdo, complete só o que falta, sem apagar o que existe. Grave na branch atual, SEM commit e sem push. Ao terminar, mostre ao usuário o que criou ou alterou (arquivo por arquivo, em 1 linha cada).
A partir de agora, a cada tarefa concluída mantenha \`docs/TASKS.md\` e \`docs/ESTADO.md\` atualizados.`;

function pedidoEstrutura({ nome, pasta, pastas, respostas }) {
  const outras = (pastas || []).filter((x) => x !== pasta);
  const comResp = respostas && respostas.length;
  return `# Pedido do Termix: criar a estrutura do projeto "${nome}"

Você é o orquestrador NOVO (contexto limpo) do projeto "${nome}". Pasta de trabalho: ${pasta}.${outras.length ? `\nOutras pastas do mesmo projeto (não são usadas; não as altere): ${outras.join(' | ')}` : ''}

## Como levantar o que existe (com teto de leitura)
${comResp ? `1. Leia as respostas das conversas antigas (cada uma foi pedida ao chat, em somente leitura, e cobre: objetivo, organização, decisões, feito, andamento, pendências, como rodar, regras do usuário):\n${respostas.map((r) => `   - ${r}`).join('\n')}\n   Quando duas respostas divergirem, prefira a mais recente e anote a divergência como pendência. Onde disseram "não sei", escreva "não sei" (sem chute).\n2.` : '1.'} Leia o README, os manifestos (package.json e similares), a árvore em até 2 níveis e um \`git log\` curto (10 linhas). Para os pontos de entrada, use grep, sem abrir arquivos grandes. NÃO leia o projeto inteiro.

## O que gravar
${REGRAS_ARQ}

Seja curto e fiel: só o que foi levantado, com "não sei" onde faltar. Não rode o projeto, não instale nada, não mude código.
`;
}

function pedidoRetomar({ nome, pasta, temRetomar, avisoPendente }) {
  const passos = temRetomar
    ? 'Rode `/retomar` (este projeto tem `.claude/commands/retomar.md`) e siga o que ele mandar.'
    : `Leia só: o guia (\`CLAUDE.md\`, o começo e as seções de regras), a tarefa em andamento (\`docs/TASKS.md\`, seção "Em andamento"), o estado (\`docs/ESTADO.md\`) ou o handoff, a última entrada do changelog (se houver) e \`git log --oneline -10\`. Não leia código nem históricos inteiros.`;
  return `# Pedido do Termix: retomar o projeto "${nome}"

Você é o orquestrador do projeto "${nome}" (pasta ${pasta}), com contexto limpo.
${passos}

Depois responda ao usuário, em até 10 linhas: **onde paramos**, **as tarefas pendentes** e **o que precisa para seguir**. Só leitura: não grave nada, não faça commit nem push. Então aguarde as instruções.
${avisoPendente ? `\n${avisoPendente}\n` : ''}`;
}

function create(deps = {}) {
  const { app, getWin, logError = () => {} } = deps;
  const root = () => path.join(app.getPath('userData'), 'retomar');
  const dirOf = (id) => path.join(root(), id);
  const writeAtomic = (f, txt) => { fs.mkdirSync(path.dirname(f), { recursive: true }); const tmp = `${f}.tmp`; fs.writeFileSync(tmp, txt); fs.renameSync(tmp, f); };
  const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
  const ativo = new Map(); // projeto -> { filho, cancelar }
  let ciclos = [];

  // cópias (fork) criadas pela coleta: ficam fora das listas futuras
  const forksF = () => path.join(root(), 'forks.json');
  const forks = () => (readJson(forksF()) || []).filter((x) => typeof x === 'string');
  const addFork = (id) => { if (!id) return; const l = forks(); if (!l.includes(id)) { l.push(id); writeAtomic(forksF(), JSON.stringify(l.slice(-500))); } };

  const estadoF = (id) => path.join(dirOf(id), 'coleta.json');
  const salvaEstado = (id, e) => { writeAtomic(estadoF(id), JSON.stringify(e, null, 2)); };

  // Roda UMA conversa em segundo plano. Resolve { ok, texto, fork, erro }.
  function rodaUma(id, conv, pasta, claude, prompt, onFilho) {
    return new Promise((resolve) => {
      let out = '', err = '', fim = false;
      const acabou = (r) => { if (fim) return; fim = true; clearTimeout(timer); resolve(r); };
      const env = { ...process.env }; for (const k of SESSION_BOUND) delete env[k];
      let ch;
      try {
        const args = argsColeta(conv);
        ch = spawn(`"${claude}" ${args.map(q).join(' ')}`, { cwd: pasta, shell: true, windowsHide: true, env, stdio: ['pipe', 'pipe', 'pipe'] });
      } catch (e) { return acabou({ ok: false, erro: `Não foi possível rodar o claude (${e.message}).` }); }
      onFilho(ch);
      const timer = setTimeout(() => { try { ch.kill(); } catch { /* já saiu */ } acabou({ ok: false, erro: 'Tempo esgotado (a conversa demorou demais).' }); }, PRAZO_CONVERSA);
      ch.stdout.on('data', (d) => { out += d; });
      ch.stderr.on('data', (d) => { err += d; });
      ch.on('error', (e) => acabou({ ok: false, erro: e.message }));
      ch.on('close', (code) => {
        let j = null; try { j = JSON.parse(out.trim().split('\n').filter(Boolean).pop() || ''); } catch { /* texto puro */ }
        const texto = j && typeof j.result === 'string' ? j.result : (j ? '' : out.trim());
        if (code === 0 && texto && !(j && j.is_error)) acabou({ ok: true, texto, fork: j && j.session_id });
        else acabou({ ok: false, erro: (j && j.result) || err.trim().split('\n').pop() || `saiu com código ${code}` });
      });
      try { ch.stdin.end(prompt); } catch { /* sem stdin */ }
    });
  }

  const api = {
    retEstrutura(pasta) { return typeof pasta === 'string' && isDir(pasta) ? { ok: true, ...estruturaDe(pasta) } : { ok: false, completa: false, falta: ['pasta'] }; },
    retPrincipal(lista) { return pastaPrincipal(lista); },
    retConversas(pastas) {
      const l = conversasDe(Array.isArray(pastas) ? pastas.filter((x) => typeof x === 'string').slice(0, 12) : [], forks());
      return l.map((c, i) => ({ ...c, recente: i === 0, tokens: tokensDe(c.size) }));
    },
    retPromptFixo() { return PROMPT_FIXO; },
    retTeto() { return TETO_CONVERSAS; },
    retClaude() { return !!acharClaude(); },

    // Dados do pop-up (SEM IA): reaproveita a análise do Organizador.
    retPopup({ pasta } = {}) {
      if (typeof pasta !== 'string' || !isDir(pasta)) return null;
      const a = ORG.analisarPasta(pasta, deps.gitRun);
      const ss = a.sessoes || [];
      const g = a.git || {};
      const st = estruturaDe(pasta);
      return {
        pasta, nome: a.nome, estrutura: st,
        sessao: ss[0] ? { id: ss[0].id, mtime: ss[0].mtime, titulo: ss[0].titulo || ss[0].primeiro } : null,
        andamento: a.andamento || [], checkpoint: a.checkpoint || null,
        commit: (g.commits || [])[0] || null, branch: g.git ? g.branch : null,
        temRetomar: isFile(path.join(pasta, '.claude', 'commands', 'retomar.md')),
        conversas: ss.length,
        proximo: proximoPasso(pasta, st),
      };
    },

    // A pendência principal para o Vibe de tarefa: a tarefa em andamento; sem ela, o primeiro item de "Pendentes". Sem IA.
    retPendencia({ pasta } = {}) {
      if (typeof pasta !== 'string' || !isDir(pasta)) return null;
      const st = estruturaDe(pasta);
      const proximo = proximoPasso(pasta, st);
      for (const f of [st.tarefas].filter(Boolean)) {
        const t = readTxt(path.join(pasta, f), 400 * 1024);
        const and = ORG.andamentoDe(t);
        if (and.length) return { titulo: and[0], proximo, origem: 'andamento', arquivo: f };
        const m = /^#{1,3}\s*pendentes[^\n]*\n([\s\S]*?)(?=^#{1,3}\s|\s*$(?![\s\S]))/im.exec(t);
        const it = m && /^\s*(?:[-*]\s+(?:\[[ x]\]\s*)?|#{2,4}\s+)(.+)$/m.exec(m[1]);
        if (it) return { titulo: it[1].trim().slice(0, 200), proximo, origem: 'pendentes', arquivo: f };
      }
      return proximo ? { titulo: '', proximo, origem: 'estado' } : null;
    },

    // Pedido do orquestrador (a): /retomar ou leitura guiada.
    retPedidoRetomar({ id, nome, pasta, avisoPendente } = {}) {
      const pid = validP(id) ? id : slug(nome);
      const f = path.join(dirOf(pid), 'pedido-retomar.md');
      writeAtomic(f, pedidoRetomar({ nome: String(nome || 'Projeto'), pasta, temRetomar: isFile(path.join(pasta, '.claude', 'commands', 'retomar.md')), avisoPendente }));
      return { ok: true, arquivo: f };
    },
    // Pedido de criação da estrutura (sem conversas: README, manifestos, árvore e git log; com conversas: as respostas coletadas).
    retPedidoEstrutura({ id, nome, pasta, pastas } = {}) {
      const pid = validP(id) ? id : slug(nome);
      const dir = dirOf(pid);
      const rd = path.join(dir, 'respostas');
      const respostas = lsDir(rd).filter((f) => f.endsWith('.txt')).sort().map((f) => path.join(rd, f));
      const f = path.join(dir, 'pedido-estrutura.md');
      writeAtomic(f, pedidoEstrutura({ nome: String(nome || 'Projeto'), pasta, pastas: Array.isArray(pastas) ? pastas : [pasta], respostas }));
      return { ok: true, arquivo: f, respostas: respostas.length };
    },
    // Texto do "Copiar prompt" (para conversas fora do Termix; alternativa manual).
    retCopiar() { return PROMPT_FIXO; },

    // Coleta em segundo plano: uma conversa por vez, em ordem. convs = [{ id, pasta }]. Progresso em coleta.json (k/N).
    retColetaIniciar({ id, nome, convs } = {}) {
      const pid = validP(id) ? id : slug(nome);
      if (ativo.has(pid)) return { ok: false, motivo: 'A coleta deste projeto já está rodando.' };
      const claude = acharClaude();
      if (!claude) return { ok: false, motivo: 'Não encontrei o Claude Code (claude) neste PC.' };
      const lista = (Array.isArray(convs) ? convs : []).filter((c) => c && /^[0-9a-f-]{36}$/i.test(c.id) && typeof c.pasta === 'string' && isDir(c.pasta)).slice(0, TETO_CONVERSAS);
      if (!lista.length) return { ok: false, motivo: 'Nenhuma conversa marcada.' };
      const dir = dirOf(pid), rd = path.join(dir, 'respostas');
      fs.mkdirSync(rd, { recursive: true });
      for (const f of lsDir(rd)) { try { fs.renameSync(path.join(rd, f), path.join(rd, `${f}.antiga-${Date.now().toString(36)}`)); } catch { /* fica */ } } // nada é apagado
      const est = { id: pid, nome, total: lista.length, feitas: 0, falhas: 0, status: 'rodando', atual: 1, itens: lista.map((c) => ({ id: c.id, pasta: c.pasta, status: 'espera' })), inicio: Date.now() };
      salvaEstado(pid, est);
      const ctl = { cancelado: false, filho: null };
      ativo.set(pid, ctl);
      (async () => {
        for (let i = 0; i < lista.length; i++) {
          if (ctl.cancelado) break;
          est.atual = i + 1; est.itens[i].status = 'rodando'; salvaEstado(pid, est);
          const r = await rodaUma(lista[i].id, lista[i].id, lista[i].pasta, claude, PROMPT_FIXO, (ch) => { ctl.filho = ch; });
          if (ctl.cancelado) { est.itens[i].status = 'cancelada'; break; }
          if (r.fork) addFork(r.fork);
          if (r.ok) {
            writeAtomic(path.join(rd, `${String(i + 1).padStart(2, '0')}-${lista[i].id.slice(0, 8)}.txt`), `# Resposta da conversa ${lista[i].id} (pasta ${lista[i].pasta})\n\n${r.texto}\n`);
            est.itens[i].status = 'ok'; est.feitas++;
          } else { est.itens[i].status = 'falhou'; est.itens[i].erro = String(r.erro || '').slice(0, 200); est.falhas++; }
          salvaEstado(pid, est);
        }
        est.status = ctl.cancelado ? 'cancelada' : (est.feitas ? 'pronta' : 'falhou'); est.fim = Date.now();
        salvaEstado(pid, est); ativo.delete(pid);
        try { const w = getWin && getWin(); if (w && !w.isDestroyed()) w.webContents.send('vibe:retColeta', { id: pid }); } catch { /* sem janela */ }
      })().catch((e) => { logError(e); ativo.delete(pid); });
      return { ok: true, id: pid, total: lista.length };
    },
    retColetaEstado(id) { return validP(id) ? readJson(estadoF(id)) : null; },
    retColetaCancelar(id) {
      const c = ativo.get(id); if (!c) return false;
      c.cancelado = true; try { c.filho && c.filho.kill(); } catch { /* já saiu */ }
      return true;
    },
    retColetaAtivas() { return [...ativo.keys()]; },
    // Ciclos do Vibe/Mutirão rodando, informados pela interface a cada poucos segundos (o main.js lê no fechamento do app, sem IPC).
    retAtivos(lista) { ciclos = (Array.isArray(lista) ? lista : []).filter((x) => x && typeof x.nome === 'string').slice(0, 20).map((x) => ({ id: String(x.id || ''), nome: x.nome.slice(0, 60), auto: !!x.auto, fase: String(x.fase || '') })); return true; },
    retLista() { return ciclos; },
  };
  return api;
}

// "Próximo passo" da tarefa em andamento (linha depois de "Próximo passo:"), ou o começo do estado. Sem IA.
function proximoPasso(pasta, st) {
  for (const f of [st.tarefas, st.estado, 'docs/TASKS_DEV2.md'].filter(Boolean)) {
    const t = readTxt(path.join(pasta, f), 200 * 1024);
    const m = /\*{0,2}Pr[óo]ximo passo:?\*{0,2}:?\s*([^\n]{3,200})/i.exec(t);
    if (m) return m[1].trim();
  }
  return null;
}

module.exports = { create, estruturaDe, pastaPrincipal, conversasDe, tokensDe, argsColeta, pedidoEstrutura, pedidoRetomar, PROMPT_FIXO, TETO_CONVERSAS };
