# CHANGELOG_DEV2 — Termix (frente da dev2)

Histórico da dev2 (tarefas DEV2-xxx, frentes Vibe Coding e Mutirão). Mais recente no topo. As tarefas do DEV1 ficam em `docs/CHANGELOG_DEV.md`.

---

## 2026-11-07

**DEV2-008 — Guia de validação do MVP do Vibe e do Mutirão** (DEV2)

- Novo `docs/VALIDACAO_MVP_VIBE.md`: roteiro com caixas de marcar para o Ygor validar no Termix real (da dev2): preparação e custos medidos, a pasta confiável no `~/.claude.json` real (o que muda, backup, conferir e desfazer), Roteiro A (Vibe Coding de ponta a ponta, com Parar/Continuar e conferência do git), Roteiro B (Mutirão com dono e duas sócias num PC, remoto local), o que observar, limitações conhecidas, o que fica para depois e o modelo do veredito.
- Correção: o painel de pausa não repete mais "Clique em Continuar" quando o motivo já diz isso.
- Núcleo: nenhuma linha. Sem rodadas com tokens.

**DEV2-007 — Robustez do ciclo do Vibe e do Mutirão** (DEV2)

- Marca `[SEM COMMIT]` no plano: tarefa de validação/conferência aceita sem commit novo quando o `Tk.md` traz "Validação: ..."; o planejamento pede a marca e a validação final do Mutirão vem marcada.
- Limite de tentativas: 1 execução + 2 refações, depois pausa com o motivo e aviso; "Continuar" dá mais uma tentativa.
- Tempo limite: turno sem terminar em 30 min (ou 20 min sem sinal) = Esc no agente, pausa e aviso; "Continuar" confere e refaz ou pede a revisão de novo.
- Parar no meio do turno: pedido não enviado é desfeito (não conta, caixa limpa com Ctrl+U); turno interrompido é conferido e refeito. Ctrl+U antes de todo `/clear` (a 1ª tecla depois de um Esc se perdia).
- Push final do Mutirão com a branch do dono à frente no remoto: fetch + merge de `origin/<dono>` (sem rebase); conflito = `merge --abort`, nada enviado, motivo na tela.
- Núcleo: nenhuma linha. Testes: módulo 23/23, app com agente falso 23/23 (sem tokens), regressões 62/62, 23/23, 31/31, 41/41; rodada real: T1 do conflito resolvida e aprovada pelos agentes reais, validação final marcada [SEM COMMIT] (~US$ 1,3).

**DEV2-006 — Implementação automática do Mutirão** (DEV2)

- Em N/N, "Implementação automática": o Termix (código) confere working tree limpo e a branch do dono, faz `git fetch` e `git merge --no-ff origin/<branch>` de cada sócio ("Mutirão: integrar <branch> (<nome>)"). Conflito: `git merge --abort` sem descartar nada, registro da branch e dos arquivos; as outras entregas entram.
- Entrega sintética do Vibe em `vibe\<id>\` (objetivo e critério da divisão; divisão, partes, entregas, junções e conflitos) e o mesmo fluxo de planejamento: primeiro os conflitos, depois ligar as partes, lacunas e validação final. Com o plano conferido e sem perguntas, a execução da DEV2-004 começa sozinha na branch do dono.
- Em "Projeto concluído", o Termix faz push só da branch do dono e avisa "Mutirão concluído na <branch>. Promover para a main é com você.".
- Tela do Mutirão: Juntando entregas (k/N) → Conflitos: X → Planejando → Executando k/n → Concluído, as junções e "Ver no Vibe".
- Pedido em arquivo como padrão do Vibe: planejamento, fechar, Dev, refação e revisão em `vibe\<id>\pedidos\pedido-<nome>.md`, com uma linha curta digitada.
- Correções: botão "Sua parte do Mutirão" sai na hora ao trocar de projeto; lista do `git status` perdia a 1ª letra; regra `Write(**/.env)` inútil removida; aba do Vibe parada volta com conversa nova (retomar uma conversa vazia não abria); pedido que não chegou ao Dev não conta como tentativa.
- Núcleo: nenhuma linha. Testes: 41 conferências sem tokens; rodada real com Caso A até "Concluído" e push da dev1 e Caso B com o conflito como T1; ~US$ 2,4 equivalente.

**DEV2-005 — Tela do Mutirão com divisão, parte do sócio e contador de entregas** (DEV2)

- Botão "Mutirão" abre um painel ao lado do terminal, só para o dono (fluxo: DEV1; sem fluxo: com o aviso de remoto git); os outros veem a explicação. O chat é a aba "Mutirão · Orquestrador", com a trava do Vibe.
- Participantes (nome e branch); "Gerar divisão" grava o pedido em `mutirao/PEDIDO.md` e digita uma linha; o orquestrador grava `mutirao/divisao.json` e `mutirao/partes/<branch>.md`; o Termix confere no fim de cada turno e recusa arquivo em comum entre as partes.
- "Publicar divisão": commit só de `divisao.json` e `partes/` e push só da branch do dono.
- Sócio na branch da parte: "Sua parte do Mutirão" no cabeçalho e no sino; o Vibe abre pré-preenchido e trabalha na branch da parte; ao concluir, o Termix grava `mutirao/entregas/<branch>.json`, faz commit e push só da branch dele.
- Contador "Entregas: k/N" com `git fetch` + `git show` (zero token), ao abrir e em "Atualizar"; em N/N, "Implementação automática" (chega na DEV2-006). Estado em `vibe\<id>\mutirao.json`.
- Correção da DEV2-004: só os 10 backups mais recentes do `.claude.json`.
- Núcleo: só `package.json` (`check`). Testes: 31 conferências sem tokens e uma rodada real (divisão real, 1/2 → 2/2, reabrir); ~US$ 1,1 equivalente.

---

## 2026-11-06

**DEV2-004 — Execução autônoma do Vibe Coding com trava em código** (DEV2)

- Trava em código só nas abas do Vibe: settings próprios (`--settings` gerado em `vibe\<id>\trava\`) com um hook PreToolUse (`src/vibe/trava.js`) e regras `permissions.deny`. Bloqueia commit/merge/rebase fora da branch permitida ou na main/master, push fora dela ou forçado, comandos git que descartam trabalho, apagar recursivo ou fora do projeto, gravar fora do projeto e gravar em .env/chaves/credenciais. Testada sem tokens em 62 casos.
- O Termix confere ou cria a branch permitida (sem fluxo: `vibe/<projeto>`) e marca a pasta do projeto como confiável no `.claude.json` do Claude Code (só `hasTrustDialogAccepted`, com backup e gravação atômica).
- "Executar plano": para cada tarefa, /clear e pedido curto ao Dev, conferência do git em código, /clear e revisão do orquestrador por resumo; até 2 refações. Pausas por limite de 5 h (93 %, retoma sozinha), DEPLOY/HUMANO, erro ou agente sem resposta. Painel com tarefa k/n, fase, commit, tentativas e limites; "Projeto concluído" com notificação. Reabrir não retoma sozinho.
- O pedido de planejamento marca `[DEPLOY]` e `[HUMANO]`. Correções da DEV2-003: "Iniciar" some com ciclo ativo; "Terminou" das abas do Vibe silenciado.
- Núcleo: `main.js` 1 linha virou 3 no `pty:spawn`; `package.json` só no `check`.
- Rodada real no projeto de brinquedo: 3 tarefas concluídas com commits só na `vibe/contador`, commit em master pedido de propósito barrado, master intacta; ~US$ 1,35 equivalente.

**DEV2-003 — Vibe Coding cria orquestrador e dev, gera plano e perguntas** (DEV2)

- "Iniciar Vibe Coding" cria no projeto as abas "Vibe · Orquestrador" e "Vibe · Dev" (o Dev fica parado). O Termix pede o plano com um pedido curto que aponta para a entrega, percebe o fim do turno pelo hook Stop (zero token) e lê `plano.md` e `perguntas.json`.
- Painel de andamento (Preparando plano → Perguntas (N) → Plano pronto), formulário de perguntas com notificação, respostas em `respostas.json`, plano visível, "Parar" e "Retomar", estado em `estado.json` (reabrir o app não recomeça nada) e dicas de economia de tokens.
- Conferências do Termix: contagem de tarefas pelos IDs T1, T2…, alerta de commit/push na main/master no plano e aviso se o orquestrador não abrir em 30 s.
- Corrigido o recuo da lista de seções que faltam (DEV2-002).
- Núcleo: nenhuma linha. Decisões novas do Ygor e roteiro renumerado (até DEV2-007) em `docs/VIBE_MUTIRAO.md`.
- Testado com uma rodada real numa instância isolada; o orquestrador escreveu "Commit em master" no plano apesar da regra, por isso a trava em código fica para a DEV2-004.

**DEV2-002 — Tela de entrega do Vibe Coding com modelo .md** (DEV2)

- O botão "Vibe Coding" abre a tela de entrega engessada: projeto, objetivo final, fluxo desenhado, estrutura .md com as 9 seções do modelo, critério de pronto, o que os agentes não podem fazer (opcional) e acessos a fornecer (ou "Nada a fornecer").
- A tela mostra sempre o que falta. "Iniciar Vibe Coding" só habilita com tudo completo e apenas grava a entrega (os agentes chegam na DEV2-003).
- "Baixar modelo (.md)" com o passo a passo da melhor entrega, para sócios não técnicos.
- Rascunho salvo a cada mudança. Entrega em `%APPDATA%\Termix\vibe\<id-do-projeto>\`; substituir pede confirmação e guarda a anterior no histórico.
- Núcleo: `main.js` 3 linhas viraram 2, `preload.js` 1 linha trocada, `index.html` e `app.js` nada. Os canais `vibe:*` ficam no módulo.
- Validado de ponta a ponta por CDP numa instância isolada (passos a a h).

**DEV2-001 — Estrutura isolada do módulo Vibe Coding e Mutirão** (DEV2)

- Módulo novo em `src/vibe/` (processo principal) e `src/renderer/vibe/` (interface). O núcleo só ganhou ligações: `main.js` +3 linhas, `preload.js` +1, `index.html` +2, `app.js` nenhuma.
- Chave "Vibe Coding e Mutirão (experimental)" em Configurações, desligada por padrão. Ligada, os botões "Vibe Coding" e "Mutirão" aparecem no cabeçalho e abrem telas "Em construção". Sem comportamento real.
- Desenho e roteiro em `docs/VIBE_MUTIRAO.md`.
