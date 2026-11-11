'use strict';
/* Deploy feito pelo Termix, em código (DEV2-016). Decisões do Ygor (2026-11-11):
   - o DEV1 (ou o dono, sem o fluxo) tem autorização total para deploy na main; quem faz é o Termix, nunca o agente: a trava
     continua barrando a main para a IA;
   - voltar versão é por git revert, nunca reset nem force; nada de apagar tags remotas;
   - para DEV2..DEV5 o fim do ciclo é enviar a própria branch com o handoff (o DEV1 é avisado pelo fluxo normal).
   Passos do deploy (deployExec): árvore limpa e HEAD na branch de trabalho -> portão de qualidade na branch de trabalho ->
   leva a branch para a main (com o fluxo: fast-forward da dev1, como o /fluxo:promover; sem fast-forward, merge --no-ff;
   sem o fluxo: merge --no-ff da vibe/<pasta>; conflito = merge --abort) -> envia a main, cria a tag anotada e envia a tag
   (sem força) -> roda a receita com a main em checkout, cada comando pelo verificador da trava -> volta para a branch de
   trabalho. Registro em vibe\<id>\deploys\deploys.json e o log em vibe\<id>\deploys\<tag>.log.
   Quem conduz (quando rodar, autorização, pausas) é a interface (src/renderer/vibe/vibe.js). */
const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const { CD_RX, matarArvore } = require('./recuperacao');

const PROTEGIDAS = ['main', 'master'];
const linhas = (t) => String(t || '').replace(/\r/g, '').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
const pad = (n) => String(n).padStart(2, '0');
const carimbo = (d = new Date()) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
const primeira = (s, n = 300) => String(s || '').split('\n').filter(Boolean).slice(-3).join(' ').slice(0, n);

function create({ dirOf, readJson, writeJson, validId, pastaDe, gitRun, shaOf, headOf, branchDe, POL, decide, travaCfg, pedido, socioOuAuto, TEST }) {
  const dDir = (id) => path.join(dirOf(id), 'deploys');
  const regF = (id) => path.join(dDir(id), 'deploys.json');
  const autF = (id) => path.join(dDir(id), 'autorizacao.json');
  const lerReg = (id) => { const j = readJson(regF(id)); return j && Array.isArray(j.deploys) ? j : { deploys: [] }; };
  const gravarReg = (id, j) => writeJson(regF(id), { deploys: j.deploys.slice(-100) });
  const TEMPO = () => (TEST && Number(process.env.TERMIX_VIBE_DEPLOY_MS)) || 10 * 60000; // por comando (portão e receita)
  let ocupado = null; // um deploy/volta por vez, em todo o app

  // A main deste projeto: main se existir (local ou no origin), senão master.
  const principalDe = (pasta) => (shaOf(pasta, 'refs/heads/main') || shaOf(pasta, 'refs/remotes/origin/main') ? 'main' : shaOf(pasta, 'refs/heads/master') || shaOf(pasta, 'refs/remotes/origin/master') ? 'master' : 'main');
  const limpa = (pasta) => { const r = gitRun(pasta, ['status', '--porcelain', '--untracked-files=no']); return r.ok && !r.out; };
  const anc = (pasta, a, b) => gitRun(pasta, ['merge-base', '--is-ancestor', a, b]).ok;
  const versaoEm = (pasta, ref) => { const r = gitRun(pasta, ['show', `${ref}:package.json`]); try { return r.ok ? String(JSON.parse(r.out).version || '') : ''; } catch { return ''; } };

  function contexto(id) {
    const pasta = pastaDe(id);
    if (!pasta || !fs.existsSync(pasta)) return { ok: false, motivo: 'A pasta do projeto não foi encontrada.' };
    const info = POL.info(id), pol = POL.ler(id);
    if (!info.podeDeploy) return { ok: false, proibido: true, motivo: info.motivo || 'Este papel não publica na main.' };
    const branch = branchDe(id, pasta);
    if (!branch || PROTEGIDAS.includes(branch)) return { ok: false, motivo: 'Não há branch de trabalho definida (ou ela é a main/master).' };
    return { ok: true, pasta, info, pol, branch, principal: principalDe(pasta), receita: linhas(pol && pol.deploy.receita), portao: String((pol && pol.portao) || '').trim() };
  }

  // Roda um comando (portão ou receita) na pasta do projeto, depois do verificador da trava. Saída no log. { ok, codigo, motivo }
  function rodar(id, pasta, cmd, logF, rotulo) {
    if (CD_RX.test(cmd)) return Promise.resolve({ ok: false, motivo: `${rotulo}: o comando não pode trocar de pasta (roda sempre na pasta do projeto): ${cmd}` });
    let veto = null;
    try { veto = decide({ tool_name: 'Bash', tool_input: { command: cmd }, cwd: pasta }, travaCfg(id, pasta)); } catch { veto = 'a trava não conseguiu conferir o comando'; }
    if (veto) { fs.appendFileSync(logF, `\n--- ${rotulo}: BARRADO pela trava: ${cmd}\n${veto}\n`); return Promise.resolve({ ok: false, barrado: true, motivo: `${rotulo}: a trava barrou "${cmd}": ${String(veto).slice(0, 300)}` }); }
    fs.appendFileSync(logF, `\n--- ${rotulo}: ${cmd}\n`);
    const fd = fs.openSync(logF, 'a');
    return new Promise((resolve) => {
      let fim = false, timer = null;
      const done = (r) => { if (fim) return; fim = true; clearTimeout(timer); try { fs.closeSync(fd); } catch { /* já fechado */ } try { fs.appendFileSync(logF, `--- ${rotulo}: ${r.ok ? 'ok' : 'FALHOU'}${r.codigo != null ? ` (código ${r.codigo})` : ''}\n`); } catch { /* sem log */ } resolve(r); };
      let ch;
      try { ch = spawn(cmd, { cwd: pasta, shell: true, windowsHide: true, stdio: ['ignore', fd, fd] }); } catch (e) { done({ ok: false, motivo: `${rotulo}: não foi possível rodar "${cmd}" (${e.message})` }); return; }
      ch.on('error', (e) => done({ ok: false, motivo: `${rotulo}: não foi possível rodar "${cmd}" (${e.message})` }));
      ch.on('exit', (code) => done(code === 0 ? { ok: true, codigo: 0 } : { ok: false, codigo: code, motivo: `${rotulo}: "${cmd}" terminou com o código ${code}` }));
      timer = setTimeout(() => { matarArvore(ch.pid); done({ ok: false, motivo: `${rotulo}: "${cmd}" passou de ${Math.round(TEMPO() / 1000)} s e foi encerrado` }); }, TEMPO());
    });
  }
  async function receita(id, pasta, cmds, logF) {
    if (!cmds.length) { fs.appendFileSync(logF, '\n(sem receita de deploy: nada a rodar)\n'); return { ok: true, vazia: true }; }
    for (const c of cmds) { const r = await rodar(id, pasta, c, logF, 'receita'); if (!r.ok) return r; }
    return { ok: true };
  }

  // Leva a pasta para a main atualizada com o origin (ff se estiver atrás). Nunca reseta; divergência = falha.
  function irParaMain(pasta, principal, logF) {
    const sw = shaOf(pasta, `refs/heads/${principal}`) ? gitRun(pasta, ['switch', principal]) : gitRun(pasta, ['switch', '-c', principal, '--track', `origin/${principal}`]);
    fs.appendFileSync(logF, `git switch ${principal}: ${sw.ok ? 'ok' : sw.err}\n`);
    if (!sw.ok) return { ok: false, etapa: 'checkout', motivo: `Não foi possível trocar para a ${principal} sem descartar nada (${primeira(sw.err)}).` };
    const rem = shaOf(pasta, `refs/remotes/origin/${principal}`), loc = shaOf(pasta, `refs/heads/${principal}`);
    if (rem && rem !== loc) {
      if (anc(pasta, loc, rem)) { const ff = gitRun(pasta, ['merge', '--ff-only', `origin/${principal}`]); fs.appendFileSync(logF, `main local atrás do origin: fast-forward ${ff.ok ? 'ok' : ff.err}\n`); if (!ff.ok) return { ok: false, etapa: 'main', motivo: `A ${principal} local está atrás do origin e não avançou (${primeira(ff.err)}).` }; }
      else if (!anc(pasta, rem, loc)) return { ok: false, etapa: 'main', motivo: `A ${principal} local e a do origin divergiram. Resolva à mão (sem reset nem force) e tente de novo.` };
    }
    return { ok: true };
  }
  // DEV2-021: depois de "Voltar versão" com o fluxo, junta a main (com os reverts) na branch de trabalho e envia a branch, sem
  // força. Conflito: merge --abort e aviso; nada é descartado. Devolve { ok, enviado, motivo }.
  function juntarNaBranch(pasta, branch, principal, logF) {
    if (headOf(pasta) !== branch) return { ok: false, motivo: `A ${principal} não foi juntada na ${branch}: o HEAD não voltou para ela.` };
    const mg = gitRun(pasta, ['merge', '--no-ff', '--no-edit', '-m', `Junta a ${principal} (Voltar versão pelo Termix)`, principal], 60000);
    fs.appendFileSync(logF, `git merge --no-ff ${principal} (na ${branch}): ${mg.ok ? 'ok' : `${mg.out}
${mg.err}`}
`);
    if (!mg.ok) {
      const ab = gitRun(pasta, ['merge', '--abort']);
      fs.appendFileSync(logF, `git merge --abort: ${ab.ok ? 'ok' : ab.err}
`);
      return { ok: false, conflito: true, motivo: `Juntar a ${principal} na ${branch} deu conflito e foi cancelado (merge --abort); nada foi descartado. Junte à mão quando puder.` };
    }
    const ps = gitRun(pasta, ['push', 'origin', `refs/heads/${branch}:refs/heads/${branch}`], 120000);
    fs.appendFileSync(logF, `git push origin ${branch}: ${ps.ok ? 'ok' : ps.err}
`);
    return { ok: true, enviado: ps.ok, motivo: ps.ok ? '' : `A ${branch} recebeu a ${principal}, mas o envio falhou (${primeira(ps.err)}).` };
  }
  const voltar = (pasta, branch, logF) => { const r = gitRun(pasta, ['switch', branch]); fs.appendFileSync(logF, `git switch ${branch}: ${r.ok ? 'ok' : r.err}\n`); return r.ok; };

  function nomeTag(pasta, branch, principal) {
    const v = versaoEm(pasta, branch);
    if (v && v !== versaoEm(pasta, principal) && !shaOf(pasta, `refs/tags/v${v}`)) return `v${v}`;
    let t = `deploy-${carimbo()}`, k = 2;
    while (shaOf(pasta, `refs/tags/${t}`)) t = `deploy-${carimbo()}-${k++}`;
    return t;
  }

  const api = {
    // Resumo para o pedido de autorização: commits que entram, portão e receita (zero token).
    deployResumo(id) {
      if (!validId(id)) return null;
      const cx = contexto(id);
      if (!cx.ok) return cx;
      const { pasta, branch, principal } = cx;
      gitRun(pasta, ['fetch', '--quiet', 'origin'], 60000);
      const base = shaOf(pasta, `refs/remotes/origin/${principal}`) ? `origin/${principal}` : principal;
      const lg = gitRun(pasta, ['log', '--oneline', '--no-merges', '-n', '30', `${base}..${branch}`]);
      const commits = lg.ok && lg.out ? lg.out.split('\n') : [];
      const modo = cx.info.fluxo && (!shaOf(pasta, base) || anc(pasta, base, branch)) ? 'fast-forward' : 'merge --no-ff';
      return { ok: true, branch, principal, fluxo: cx.info.fluxo, modo, commits, portao: cx.portao, receita: cx.receita };
    },

    // O deploy inteiro (passos a-f). Devolve { ok, etapa, motivo, tag, enviado, log, deploy }.
    // etapa: 'arvore' | 'branch' | 'portao' | 'conflito' (vão para a recuperação) | 'checkout' | 'main' | 'push' | 'remoto' (pausa)
    //        | 'receita' (a main JÁ foi enviada; a publicação falhou) | 'nada' (nada novo a publicar).
    async deployExec(id, origem) {
      if (!validId(id)) return { ok: false, etapa: 'interno', motivo: 'Projeto inválido.' };
      if (ocupado) return { ok: false, etapa: 'ocupado', motivo: 'Já há um deploy ou uma volta de versão em andamento.' };
      const cx = contexto(id);
      if (!cx.ok) return { ok: false, etapa: cx.proibido ? 'proibido' : 'interno', motivo: cx.motivo };
      // DEV2-021: por segurança, o processo principal também recusa o deploy automático sem portão (política antiga ou editada à mão)
      if (['sempre', 'marco'].includes(cx.pol && cx.pol.deploy.modo) && !cx.portao) return { ok: false, etapa: 'politica', motivo: 'O deploy automático ("Sempre" ou "Marco") exige o portão de qualidade, e a política está sem ele. Preencha o portão na política (ou escolha "Pedir autorização"). Nada foi publicado.' };
      ocupado = id;
      const { pasta, branch, principal } = cx;
      fs.mkdirSync(dDir(id), { recursive: true });
      let tag = nomeTag(pasta, branch, principal);
      let logF = path.join(dDir(id), `${tag}.log`);
      fs.appendFileSync(logF, `=== Deploy pelo Termix · ${new Date().toISOString()} · ${branch} -> ${principal} (${origem || 'ciclo'})\n`);
      const reg = { tag, data: new Date().toISOString(), branch, principal, origem: origem || 'ciclo', status: 'iniciado', log: logF };
      const fim = (r) => {
        ocupado = null;
        Object.assign(reg, { status: r.ok ? 'publicado' : r.enviado ? 'receita-falhou' : 'falhou', etapa: r.etapa || '', motivo: r.motivo || '' });
        if (r.etapa !== 'nada') { const j = lerReg(id); j.deploys = j.deploys.filter((d) => d.tag !== reg.tag); j.deploys.push(reg); gravarReg(id, j); }
        return { ...r, tag: reg.tag, log: logF, deploy: reg };
      };
      try {
        // a. árvore limpa e HEAD na branch de trabalho
        if (headOf(pasta) !== branch) return fim({ ok: false, etapa: 'branch', motivo: `O HEAD não está na branch de trabalho "${branch}" (está em "${headOf(pasta) || 'destacado'}").` });
        if (!limpa(pasta)) return fim({ ok: false, etapa: 'arvore', motivo: `Há mudanças sem commit na ${branch}. O deploy só sai com a árvore limpa.` });
        if (!gitRun(pasta, ['remote', 'get-url', 'origin']).ok) return fim({ ok: false, etapa: 'remoto', motivo: 'O projeto não tem o remoto "origin" para enviar a main.' });
        const fe = gitRun(pasta, ['fetch', '--quiet', '--tags', 'origin'], 60000);
        fs.appendFileSync(logF, `git fetch: ${fe.ok ? 'ok' : fe.err}\n`);
        if (!fe.ok) return fim({ ok: false, etapa: 'remoto', motivo: `Não foi possível buscar o origin (${primeira(fe.err)}).` });
        tag = nomeTag(pasta, branch, principal); // a tag pode ter chegado do remoto
        if (tag !== reg.tag) { const n = path.join(dDir(id), `${tag}.log`); fs.renameSync(logF, n); logF = n; reg.tag = tag; reg.log = n; }
        const alvo = shaOf(pasta, `refs/remotes/origin/${principal}`) || shaOf(pasta, `refs/heads/${principal}`);
        if (alvo && anc(pasta, branch, alvo)) return fim({ ok: false, etapa: 'nada', motivo: `A ${principal} já tem tudo da ${branch}: nada novo para publicar.` });
        // b. portão de qualidade na branch de trabalho
        if (cx.portao) {
          const pr = await rodar(id, pasta, cx.portao, logF, 'portão');
          reg.portao = { comando: cx.portao, ok: pr.ok };
          if (!pr.ok) return fim({ ok: false, etapa: 'portao', motivo: `O portão de qualidade não passou: ${pr.motivo}. Nada foi publicado.` });
        } else { reg.portao = { comando: '', ok: true }; fs.appendFileSync(logF, '\n(sem portão de qualidade na política)\n'); }
        // c. leva a branch de trabalho para a main
        const im = irParaMain(pasta, principal, logF);
        if (!im.ok) { voltar(pasta, branch, logF); return fim({ ok: false, ...im }); }
        const antes = shaOf(pasta, `refs/heads/${principal}`);
        const lg = gitRun(pasta, ['log', '--oneline', '--no-merges', '-n', '50', `${principal}..${branch}`]);
        reg.commits = lg.ok && lg.out ? lg.out.split('\n') : [];
        let tipo = 'merge';
        if (cx.info.fluxo) { const ff = gitRun(pasta, ['merge', '--ff-only', branch], 60000); fs.appendFileSync(logF, `git merge --ff-only ${branch}: ${ff.ok ? 'ok' : ff.err}\n`); if (ff.ok) tipo = 'ff'; }
        if (tipo !== 'ff') {
          const m = gitRun(pasta, ['merge', '--no-ff', '-m', `Deploy pelo Termix: ${branch} na ${principal}`, branch], 60000);
          fs.appendFileSync(logF, `git merge --no-ff ${branch}: ${m.ok ? 'ok' : `${m.out}\n${m.err}`}\n`);
          if (!m.ok) {
            const conf = gitRun(pasta, ['diff', '--name-only', '--diff-filter=U']);
            const ab = gitRun(pasta, ['merge', '--abort']);
            fs.appendFileSync(logF, `git merge --abort: ${ab.ok ? 'ok' : ab.err}\n`);
            voltar(pasta, branch, logF);
            const arqs = conf.ok && conf.out ? conf.out.split('\n').slice(0, 10) : [];
            return fim({ ok: false, etapa: 'conflito', arquivos: arqs, motivo: `A junção da ${branch} na ${principal} deu conflito${arqs.length ? ` (${arqs.join(', ')})` : ''}; foi cancelada sem perder nada. Traga a ${principal} para a ${branch} e resolva o conflito lá.` });
          }
        }
        const depois = shaOf(pasta, `refs/heads/${principal}`);
        Object.assign(reg, { tipo, antes, depois });
        // d. envia a main, cria a tag anotada e envia a tag (sem força)
        const ps = gitRun(pasta, ['push', 'origin', `refs/heads/${principal}:refs/heads/${principal}`], 120000);
        fs.appendFileSync(logF, `git push origin ${principal}: ${ps.ok ? 'ok' : ps.err}\n`);
        if (!ps.ok) { voltar(pasta, branch, logF); return fim({ ok: false, etapa: 'push', motivo: `A ${principal} local recebeu a ${branch}, mas o envio ao origin falhou (${primeira(ps.err)}). Nada foi publicado; o próximo deploy envia de novo.` }); }
        reg.enviado = true;
        const tg = gitRun(pasta, ['tag', '-a', tag, '-m', `Deploy pelo Termix: ${branch} na ${principal} (${reg.commits.length} commits, ${tipo === 'ff' ? 'fast-forward' : 'merge --no-ff'})`, depois]);
        const pt = tg.ok ? gitRun(pasta, ['push', 'origin', `refs/tags/${tag}`], 60000) : { ok: false, err: tg.err };
        fs.appendFileSync(logF, `git tag -a ${tag}: ${tg.ok ? 'ok' : tg.err}\ngit push origin ${tag}: ${pt.ok ? 'ok' : pt.err}\n`);
        reg.tagEnviada = !!pt.ok;
        // e. receita com a main em checkout
        const rc = await receita(id, pasta, cx.receita, logF);
        reg.receita = { ok: rc.ok, motivo: rc.motivo || '', comandos: cx.receita.length };
        // f. volta para a branch de trabalho
        const vb = voltar(pasta, branch, logF);
        if (!rc.ok) return fim({ ok: false, enviado: true, etapa: 'receita', motivo: `A ${principal} já foi enviada (tag ${tag}), mas a publicação falhou: ${rc.motivo}.` });
        if (!vb) return fim({ ok: true, enviado: true, aviso: `Publicado, mas o Termix não conseguiu voltar para a ${branch}.` });
        return fim({ ok: true, enviado: true, avisoTag: pt.ok ? '' : 'a tag não foi enviada' });
      } catch (e) {
        try { if (headOf(pasta) !== branch) voltar(pasta, branch, logF); } catch { /* segue */ }
        return fim({ ok: false, etapa: 'interno', motivo: `Erro no deploy: ${e.message}` });
      }
    },

    // "Rodar a receita de novo" (depois de uma falha da receita, ou depois de voltar versão): main em checkout e volta.
    async deployReceita(id, tag) {
      if (!validId(id)) return { ok: false, motivo: 'Projeto inválido.' };
      if (ocupado) return { ok: false, motivo: 'Já há um deploy ou uma volta de versão em andamento.' };
      const cx = contexto(id);
      if (!cx.ok) return cx;
      const { pasta, branch, principal } = cx;
      if (headOf(pasta) !== branch || !limpa(pasta)) return { ok: false, motivo: `A receita roda com a árvore limpa e o HEAD na ${branch}.` };
      ocupado = id;
      try {
        fs.mkdirSync(dDir(id), { recursive: true });
        const nome = tag && /^[\w.-]+$/.test(tag) ? `${tag}-receita-${carimbo()}` : `receita-${carimbo()}`;
        const logF = path.join(dDir(id), `${nome}.log`);
        fs.appendFileSync(logF, `=== Receita de novo · ${new Date().toISOString()} · ${principal}\n`);
        const im = irParaMain(pasta, principal, logF);
        if (!im.ok) { voltar(pasta, branch, logF); return { ok: false, motivo: im.motivo, log: logF }; }
        const rc = await receita(id, pasta, cx.receita, logF);
        voltar(pasta, branch, logF);
        const j = lerReg(id), d = j.deploys.find((x) => x.tag === tag);
        if (d) { d.receita = { ok: rc.ok, motivo: rc.motivo || '', comandos: cx.receita.length, de_novo: new Date().toISOString(), log: logF }; if (rc.ok && d.status === 'receita-falhou') d.status = 'publicado'; gravarReg(id, j); }
        return { ok: rc.ok, motivo: rc.motivo || '', log: logF };
      } finally { ocupado = null; }
    },

    deployLista(id) {
      if (!validId(id)) return [];
      return lerReg(id).deploys.filter((d) => d.enviado).map((d) => ({ tag: d.tag, data: d.data, tipo: d.tipo, branch: d.branch, principal: d.principal, commits: (d.commits || []).length, status: d.status, revertido: d.revertido || null, receita: d.receita || null, log: d.log })).reverse();
    },

    // "Voltar para antes deste": git revert na main de cada deploy (do mais novo até este), envia a main sem força.
    async deployVoltar(id, tag) {
      if (!validId(id)) return { ok: false, motivo: 'Projeto inválido.' };
      if (ocupado) return { ok: false, motivo: 'Já há um deploy ou uma volta de versão em andamento.' };
      const cx = contexto(id);
      if (!cx.ok) return cx;
      const { pasta, branch, principal } = cx;
      const j = lerReg(id);
      const lista = j.deploys.filter((d) => d.enviado && !d.revertido);
      const k = lista.findIndex((d) => d.tag === tag);
      if (k < 0) return { ok: false, motivo: `O deploy ${tag} não está na lista (ou já foi revertido).` };
      if (headOf(pasta) !== branch || !limpa(pasta)) return { ok: false, motivo: `Para voltar versão, a árvore precisa estar limpa e o HEAD na ${branch}.` };
      ocupado = id;
      fs.mkdirSync(dDir(id), { recursive: true });
      const logF = path.join(dDir(id), `${tag}-volta-${carimbo()}.log`);
      fs.appendFileSync(logF, `=== Voltar para antes de ${tag} · ${new Date().toISOString()}\n`);
      try {
        const fe = gitRun(pasta, ['fetch', '--quiet', 'origin'], 60000);
        if (!fe.ok) return { ok: false, motivo: `Não foi possível buscar o origin (${primeira(fe.err)}).`, log: logF };
        const im = irParaMain(pasta, principal, logF);
        if (!im.ok) { voltar(pasta, branch, logF); return { ok: false, motivo: im.motivo, log: logF }; }
        const alvo = lista.slice(k).reverse(); // do mais novo para o escolhido
        // Os reverts são feitos numa branch temporária a partir da main: a main só avança (fast-forward) se todos derem certo.
        const tmp = `termix-volta-${carimbo()}-${process.pid}`;
        const cb = gitRun(pasta, ['switch', '-c', tmp]);
        fs.appendFileSync(logF, `git switch -c ${tmp}: ${cb.ok ? 'ok' : cb.err}
`);
        if (!cb.ok) { voltar(pasta, branch, logF); return { ok: false, motivo: `Não foi possível preparar a volta (${primeira(cb.err)}).`, log: logF }; }
        const falhou = (m) => { voltar(pasta, branch, logF); return { ok: false, motivo: `${m} A ${principal} não mudou (nem a local nem a do origin); o que foi feito ficou na branch ${tmp}.`, log: logF }; };
        for (const d of alvo) {
          if (!d.depois || !anc(pasta, d.depois, tmp)) return falhou(`O commit do deploy ${d.tag} não está na ${principal}.`);
          const temMerge = d.tipo === 'ff' && gitRun(pasta, ['rev-list', '--merges', '--count', `${d.antes}..${d.depois}`]).out !== '0';
          if (!temMerge) {
            // merge: git revert -m 1 do commit de merge; fast-forward: git revert dos commits do intervalo
            const args = d.tipo === 'merge' ? ['revert', '--no-edit', '-m', '1', d.depois] : ['revert', '--no-edit', `${d.antes}..${d.depois}`];
            const rv = gitRun(pasta, args, 60000);
            fs.appendFileSync(logF, `git ${args.join(' ')}: ${rv.ok ? 'ok' : `${rv.out}
${rv.err}`}
`);
            if (!rv.ok) { const ab = gitRun(pasta, ['revert', '--abort']); fs.appendFileSync(logF, `git revert --abort: ${ab.ok ? 'ok' : ab.err}
`); return falhou(`O revert do deploy ${d.tag} deu conflito e foi cancelado.`); }
            continue;
          }
          // fast-forward com merges no intervalo (ex.: a main trazida para a dev1): um commit de revert com a diferença líquida
          // do intervalo (o mesmo efeito do git revert dos commits, sem os merges, que o revert não desfaz sozinho)
          let patch = '';
          try { patch = execFileSync('git', ['-C', pasta, 'diff', '--binary', d.depois, d.antes], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, windowsHide: true }); } catch (e) { return falhou(`Não foi possível montar o revert do deploy ${d.tag} (${e.message}).`); }
          if (patch) {
            const ap = (extra) => { try { execFileSync('git', ['-C', pasta, 'apply', ...extra], { input: patch, stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true }); return null; } catch (e) { return String(e.stderr || e.message); } };
            const chk = ap(['--check']);
            if (chk) { fs.appendFileSync(logF, `git apply --check (revert de ${d.tag}): ${chk}
`); return falhou(`O revert do deploy ${d.tag} conflita com o que veio depois na ${principal}; foi cancelado.`); }
            const ok2 = ap(['--index']);
            if (ok2) return falhou(`O revert do deploy ${d.tag} falhou (${primeira(ok2)}).`);
            const cm = gitRun(pasta, ['commit', '-m', `Revert "deploy ${d.tag}"`, '-m', `Desfaz os commits do intervalo ${String(d.antes).slice(0, 8)}..${String(d.depois).slice(0, 8)} (Voltar versão pelo Termix).`]);
            fs.appendFileSync(logF, `revert de ${d.tag} pela diferença do intervalo (há merges nele): ${cm.ok ? 'ok' : cm.err}
`);
            if (!cm.ok) return falhou(`O commit do revert do deploy ${d.tag} falhou (${primeira(cm.err)}).`);
          }
        }
        const sw = gitRun(pasta, ['switch', principal]);
        const ff = sw.ok ? gitRun(pasta, ['merge', '--ff-only', tmp]) : sw;
        fs.appendFileSync(logF, `${principal} avança para ${tmp} (fast-forward): ${ff.ok ? 'ok' : ff.err}
`);
        if (!ff.ok) return falhou(`A ${principal} não avançou para os reverts (${primeira(ff.err)}).`);
        gitRun(pasta, ['branch', '-d', tmp]); // já está na main (só apaga se estiver junta)
        const sha = shaOf(pasta, `refs/heads/${principal}`);
        const ps = gitRun(pasta, ['push', 'origin', `refs/heads/${principal}:refs/heads/${principal}`], 120000);
        fs.appendFileSync(logF, `git push origin ${principal}: ${ps.ok ? 'ok' : ps.err}\n`);
        voltar(pasta, branch, logF);
        if (!ps.ok) return { ok: false, motivo: `Os reverts foram feitos na ${principal} local, mas o envio falhou (${primeira(ps.err)}).`, log: logF };
        const data = new Date().toISOString();
        for (const d of j.deploys) if (alvo.some((a) => a.tag === d.tag)) d.revertido = { data, sha, por: tag };
        gravarReg(id, j);
        // DEV2-021: com o fluxo, a main revertida volta para a branch de trabalho (dev1) por merge --no-ff, sem força
        const juncao = cx.info.fluxo ? juntarNaBranch(pasta, branch, principal, logF) : null;
        return { ok: true, sha, revertidos: alvo.map((d) => d.tag), principal, branch, juncao, log: logF };
      } finally { ocupado = null; }
    },

    // Autorização ("Pedir autorização"). O ponto de aprovação é este arquivo: a interface (sino e painel) e, depois, o
    // Telegram (DEV2-019) gravam a decisão pelo mesmo caminho (acao 'decidir'); o ciclo lê e segue.
    deployAut(id, acao, dados) {
      if (!validId(id)) return null;
      const f = autF(id), cur = readJson(f);
      if (acao === 'pedir') { const j = { status: 'aguardando', tarefa: String((dados && dados.tarefa) || ''), resumo: (dados && dados.resumo) || null, pedido: new Date().toISOString(), decisao: null }; writeJson(f, j); return j; }
      if (acao === 'decidir') {
        if (!cur || cur.status !== 'aguardando') return { ok: false, motivo: 'Não há deploy aguardando autorização.' };
        const d = dados && dados.decisao === 'autorizar' ? 'autorizar' : 'negar';
        const j = { ...cur, status: d === 'autorizar' ? 'autorizado' : 'negado', decisao: { decisao: d, origem: String((dados && dados.origem) || 'termix').slice(0, 40), data: new Date().toISOString() } };
        writeJson(f, j);
        return { ok: true, ...j };
      }
      if (acao === 'fechar' && cur) { writeJson(f, { ...cur, status: 'fechado' }); return { ok: true }; }
      return cur || null;
    },

    /* Fim do ciclo de DEV2..DEV5: o orquestrador reescreve docs/HANDOFF_DEVn.md em alto nível; o Termix faz o commit desse
       arquivo e envia só a devN. Não vale para a parte do sócio nem para a implementação automática do Mutirão. */
    fimInfo(id) {
      if (!validId(id)) return { aplica: false };
      const pasta = pastaDe(id), info = POL.info(id);
      const m = /^DEV([2-5])$/.exec(info.papel || '');
      if (!pasta || !info.fluxo || info.podeDeploy || !m || socioOuAuto(id)) return { aplica: false };
      const branch = branchDe(id, pasta);
      return { aplica: !!branch, papel: info.papel, branch, arquivo: `docs/HANDOFF_DEV${m[1]}.md` };
    },
    fimPrompt(id) {
      const fi = api.fimInfo(id);
      if (!fi.aplica) return null;
      const pasta = pastaDe(id);
      return pedido(id, 'fim-handoff', [
        `Você é o ORQUESTRADOR do Vibe Coding do Termix. O ciclo terminou na branch ${fi.branch} (papel ${fi.papel}).`,
        `Reescreva ${path.join(pasta, fi.arquivo)} em alto nível para o DEV1: o que mudou e por quê, riscos, como validar e o status. Sem colar código, diffs nem trechos de arquivos.`,
        `Base: ${path.join(dirOf(id), 'plano.md')}, os resumos em ${path.join(dirOf(id), 'resultados')} e git log. Mantenha o cabeçalho e as seções do arquivo, se existirem.`,
        'Não faça commit nem push: o Termix faz o commit desse arquivo e envia a branch. Ao terminar, responda apenas HANDOFF GRAVADO e encerre o turno.',
      ].join('\n'));
    },
    fimEnviar(id) {
      const fi = api.fimInfo(id);
      if (!fi.aplica) return { ok: false, motivo: 'O fim com handoff não vale para este projeto.' };
      const pasta = pastaDe(id), b = fi.branch;
      if (headOf(pasta) !== b) return { ok: false, motivo: `O HEAD não está na ${b}.` };
      if (!fs.existsSync(path.join(pasta, fi.arquivo))) return { ok: false, motivo: `O orquestrador não gravou ${fi.arquivo}.` };
      gitRun(pasta, ['add', '--', fi.arquivo]);
      const st = gitRun(pasta, ['diff', '--cached', '--name-only']);
      let sha = '';
      if (st.ok && st.out) {
        const cm = gitRun(pasta, ['commit', '-m', `${fi.papel}: handoff do ciclo do Vibe`, '--', fi.arquivo]);
        if (!cm.ok) return { ok: false, motivo: `O commit do handoff falhou (${primeira(cm.err)}).` };
        sha = shaOf(pasta, 'HEAD');
      }
      let ps = gitRun(pasta, ['push', 'origin', `refs/heads/${b}:refs/heads/${b}`], 120000);
      let integrou = false;
      if (!ps.ok) { // a devN do remoto avançou (outra máquina): busca e junta antes de enviar, sem reescrever nada
        gitRun(pasta, ['fetch', '--quiet', 'origin', b], 60000);
        if (shaOf(pasta, `refs/remotes/origin/${b}`)) {
          const m = gitRun(pasta, ['merge', '--no-ff', '-m', `${fi.papel}: integrar origin/${b}`, `origin/${b}`], 60000);
          if (!m.ok) { gitRun(pasta, ['merge', '--abort']); return { ok: false, motivo: `A ${b} do remoto avançou e a junção deu conflito (cancelada, nada perdido). Resolva e envie à mão.`, sha }; }
          integrou = true;
          ps = gitRun(pasta, ['push', 'origin', `refs/heads/${b}:refs/heads/${b}`], 120000);
        }
      }
      if (!ps.ok) return { ok: false, motivo: `O handoff está no commit, mas o envio da ${b} falhou (${primeira(ps.err)}).`, sha };
      return { ok: true, branch: b, arquivo: fi.arquivo, sha: shaOf(pasta, 'HEAD'), integrou };
    },
  };
  return { api };
}

module.exports = { create, carimbo };
