# CHANGELOG_DEV2 — Termix (frente da dev2)

Histórico da dev2 (tarefas DEV2-xxx, frentes Vibe Coding e Mutirão). Mais recente no topo. As tarefas do DEV1 ficam em `docs/CHANGELOG_DEV.md`.

---

## 2026-11-11

**DEV2-021 — Portão obrigatório no deploy automático e junção na dev1 depois de "Voltar versão"** (DEV2)

- Deploy "Sempre" ou "Marco" exige o portão de qualidade: a tela "Antes de iniciar" (e a edição da política) avisa e não grava; o processo principal também recusa o deploy. "Pedir autorização" segue podendo publicar sem portão.
- Com o fluxo, depois de "Voltar versão" o Termix junta a main na dev1 (merge --no-ff, sem força) e envia a dev1; conflito = merge --abort e aviso, nada descartado. O painel explica que, para trazer de volta o que foi revertido, é preciso "reverter o revert".
- Testes sem IA: dep16 68/68 (11 novos), run16 a 28/28 e b 9/9, política 55/55, trava 113/113.

**DEV2-016 — Deploy feito pelo Termix, fim de ciclo de DEV2..DEV5 e ajustes da DEV2-015** (DEV2)

- Tarefa `[DEPLOY]` permitida pela política: o Termix (código, sem IA) confere árvore e branch, roda o portão na branch de trabalho, leva a branch para a main (fluxo DEV1: fast-forward; senão merge --no-ff; conflito = merge --abort), envia a main e a tag anotada (`deploy-AAAAMMDD-HHMM` ou `v<versão>`) sem força, roda a receita com a main em checkout (cada comando pela trava), grava `vibe\<id>\deploys\<tag>.log` e volta para a branch.
- Portão, conflito ou árvore suja: nada publicado, vai para a recuperação da DEV2-015 e o deploy é tentado de novo depois do conserto. Receita que falha depois do envio: aviso claro e "Rodar a receita de novo", "Voltar versão" ou "Seguir sem publicar"; nada é desfeito sozinho.
- "Pedir autorização": resumo e "Autorizar deploy"/"Negar" no sino e no painel; ponto de aprovação em arquivo, pronto para o Telegram. "Pausar deploy" retém; "Retomar deploy" publica os retidos (na fronteira da tarefa).
- "Voltar versão": lista de deploys no painel, confirmação explícita, git revert na main (merge: -m 1; fast-forward: o intervalo) e envio sem força; depois pergunta se roda a receita.
- DEV2..DEV5 nunca publicam na main (recusado no processo principal); no fim do ciclo, o orquestrador reescreve o `docs/HANDOFF_DEVn.md` e o Termix faz o commit só dele e envia só a devN.
- DEV2-015: o servidor do F5 do projeto é encerrado (só o PID dele, com a árvore) antes de um F5 novo e no fim do ciclo; painel com "Volta n/N" e "Abrir diagnóstico"; `run7.js` adaptado (23/23).
- Testes sem IA: módulo novo 57/57 (remotos bare); app com o agente falso 27/27 e 9/9; antigos passando (política e run15 com 3 checagens ajustadas por mudanças pedidas).

**DEV2-015 — Recuperação de erro no ciclo do Vibe** (DEV2)

- Erro do Dev, tempo limite, silêncio, aba fechada e tentativas esgotadas pela conferência não pausam mais: o Termix grava um diagnóstico (`vibe\<id>\diagnosticos\Tk-n.md`: tela, git status, último commit, branch, motivo e o já tentado), dá `/clear` no orquestrador e pede UMA ação (reenviar, clear_dev, f5_aba, f5_projeto, dividir, pular) em `recuperacao\Tk-n.json`, e executa em código.
- Até 3 voltas por tarefa (política, 0 a 5; contam no orçamento). Esgotadas, a tarefa vira pendência, o sino avisa e o ciclo segue. Pausa total só com `bloqueia_proximas`, main/master alterada ou teto. JSON inválido pausa.
- Orquestrador travado: F5 da aba dele uma vez por tarefa; travou de novo, pausa e avisa. Refação pela revisão (2 + Continuar) sem mudança e sem contar em dobro.
- F5 da aba: fecha e reabre com `--resume` (trava e modelo atual da política). F5 do projeto: comando opcional da política, na pasta do projeto, conferido pela trava antes de rodar.
- Painel: "Recuperando (volta n/3): <ação>", PENDÊNCIA na lista e "Pendências do ciclo" no fim. Tarefa dividida vira Tk.a e Tk.b no plano.
- Testes sem IA: módulo novo 36/36; app com o agente falso 29/29; antigos sem ajuste (política 55, trava 113, Mutirão 31, implementação automática 41, robustez 23, conferências 16, Organizador 19). Antes, sincronizada com a dev1 (0.6.2).

**DEV2-018 — Ajustes da DEV2-014 e proposta do botão "Delegar tarefa"** (DEV2)

- `npm run check` passa a incluir `src/vibe/politica.js`.
- Interface sem IDs internos: "deploy pendente" (sem o número da tarefa) e "A execução do deploy ainda não está disponível nesta versão".
- Modal do Vibe: só o formulário rola e o rodapé ("Baixar modelo (.md)", "Fechar") fica fora do conteúdo; "Quando chamar você" e os botões da tela "Antes de iniciar" não são mais cortados. Só CSS do módulo.
- `docs/PROPOSTA_DELEGAR_TAREFA.md` (novo, só documento, para o Rodrigo): botão "Delegar tarefa" para o DEV1, pedido pelo git, Vibe de tarefa, entrega e "Analisar entrega" com a trava de contexto; perfil e PIN por sócio (conta GitHub compartilhada), opções de onde guardar o hash, ressalva de segurança, reaproveitamento, fases e perguntas em aberto. Handoff com "Sugestões ao DEV1".
- Decisões do orquestrador sobre a DEV2-014 registradas (7 d pausa em 95 %, pausa por teto avisa, "Decisões de produto" no próximo plano; envio automático no fim do ciclo de DEV2..DEV5 na DEV2-016).
- Testes sem IA: política 55/55, trava 113/113, Mutirão 31/31, implementação automática 41/41, robustez 23/23, conferências 16/16, Organizador 19/19; CDP novo 12/12 e o da DEV2-014 30/30, sem abas de agente.

**DEV2-014 — Política de autonomia por projeto ("Antes de iniciar") e "Pausar deploy"** (DEV2)

- Tela "Antes de iniciar" entre "Plano pronto" e a execução: Supervisionado, Autônomo até a branch (padrão) e Autônomo com deploy (só DEV1 ou o dono), com ajustes de deploy na main (Nunca / Pedir / a partir de um marco / Sempre), receita, portão (sugere o `validacao` do fluxo), teto 5 h / 7 d / US$, modelo por papel e quando chamar o humano.
- Gravada por projeto (`vibe\<id>\politica.json`, com histórico), relida ao reabrir e editável no meio do ciclo (vale a partir da próxima tarefa). "Pausar deploy" no painel, na hora, sem parar o ciclo. DEV2..DEV5 não veem deploy: o fim é a branch e o handoff.
- O ciclo lê a política: `[DEPLOY]` com deploy automático vira "deploy pendente (DEV2-016)" e segue; com "Pausar deploy", "retido"; teto atingido pausa e avisa. Modelo por papel na chave `model` do settings da aba do Vibe, sem tocar no núcleo.
- Testes sem IA: política 55/55 (novo), trava 113/113, Mutirão 31/31, implementação automática 41/41, robustez 23/23, conferências 16/16, Organizador 19/19; CDP 30/30 sem abas de agente. Fila decidida registrada: DEV2-015 a DEV2-019.

**DEV2-013 — Trava do Vibe barra a troca para a branch principal** (DEV2)

- `git checkout`/`git switch` para main/master recusados com o motivo, inclusive com `-b`/`-c`/`--detach`/`--track`, como ponto de partida, pelo remoto (`origin/main`), com `~`/`^`/`@{n}` e pela branch anterior (`-`, `@{-N}`).
- Troca para a permitida e outras branches, branch nova a partir da permitida e leitura da principal seguem como antes; as operações de git do próprio Termix ficam fora do hook (Mutirão sem mudança).
- Testes sem IA: trava 113/113 (34 novos), Mutirão 31/31, implementação automática 41/41, robustez 23/23, conferências 16/16, Organizador 19/19. Só `src/vibe/trava.js` e docs da dev2.

**DEV2-012 — Ciclo real do Vibe Coding no layout novo (0.6.1)** (DEV2)

- Rodada real num projeto de brinquedo isolado (remoto bare local, config do Claude Code temporária, credenciais apagadas no fim): chave ligada pela interface, plano de 3 tarefas + validação sem perguntas, "Parar" no meio da T2, app fechado e reaberto parado sem recomeçar, "Continuar" até "Projeto concluído" com a notificação.
- Commits só na `vibe/brinquedo`; main local e do remoto intactas; commit proposital na main recusado pela trava com o motivo na aba.
- Gasto ≈ US$ 3,35 (tabela da API), ~7 pontos da janela de 5 h. Módulo sem mudanças; testes sem IA todos passando.
- Sugestões ao DEV1 (núcleo): conferência de conversa existente ignora `CLAUDE_CONFIG_DIR`; cartões aninhados em Configurações.

**DEV2-011 — Sincronizar a dev2 com a dev1 (0.6.1) e conferir o módulo no layout novo** (DEV2)

- Junção de 52 commits da dev1 (merge, commit `86ba8bb`); conflitos em `package.json`, `src/renderer/index.html` e `docs/DECISOES.md`, resolvidos mantendo a dev1 e somando as linhas do módulo.
- O botão "Importar projeto (várias pastas)…" saiu do diálogo Novo projeto (que deixou de existir) para a tela Novo chat.
- O painel do Mutirão encosta na folha arredondada do palco, sem borda dupla.
- Núcleo: nenhuma linha além dos conflitos. Testes sem IA: trava 79/79, Mutirão 31/31, implementação automática 41/41, robustez 23/23, conferências 16/16, Organizador 19/19.

## 2026-11-07

**DEV2-010 — Importar projeto (várias pastas) com análise e organização automática** (DEV2)

- Chave própria em Configurações > Experimental (desligada por padrão); botão "Importar projeto (várias pastas)…" no diálogo Novo projeto.
- Análise em código, zero token: git, papel do `CLAUDE.local.md`, "ORQ" no nome, fluxo, CLAUDE.md, tarefas em andamento, handoff, checkpoint e a lista das conversas do Claude Code.
- Mapa para confirmar (papel editável, aba, retomar desmarcado, avisos de ambiguidade, dicas de economia); "Carregar" cria abas novas com o papel no nome, que se localizam por um pedido em arquivo anexado com `@` (sem pedido de permissão); "Organizar com IA" opcional com um dossiê montado em código.
- Investigação: o núcleo abre toda aba na pasta do projeto, então cada pasta vira um projeto agrupado pelo módulo. Núcleo: nenhuma linha.
- Testes: análise 19/19, app sem tokens 21/21, rodada real com 2 abas ≈ US$ 0,78. Desenho em `docs/ORGANIZADOR.md`.

**DEV2-009 — Fechar as pendências do MVP (marcas do plano, trava em conflito)** (DEV2)

- Rodada real (Vibe de brinquedo com GitHub Pages e o domínio do cliente): o planejador marcou [HUMANO], [DEPLOY] [HUMANO] e [HUMANO] [SEM COMMIT]; o pedido de planejamento não mudou.
- Correção: alarme falso de main/master numa linha de "Não fazer" (a negação vale até 80 caracteres antes); no Mutirão ele travaria a execução automática.
- Novo aviso em código: plano sem nenhuma [DEPLOY] e com título de publicação/deploy.
- Mutirão: a entrega sintética traz o objetivo e o critério do projeto inteiro e a seção "Publicação, deploy e passos do humano" (divisão, partes, README/ROADMAP/DEPLOY); o pedido do plano final pede essas tarefas com as marcas.
- Esc no meio do turno num Claude Code real seguido do /clear do ciclo: chegou inteiro.
- Trava: `git checkout --ours|--theirs` e `git restore ... --ours|--theirs` só com merge em andamento, na branch permitida, em arquivo ainda em conflito.
- Núcleo: nenhuma linha. Testes: trava 79/79, DEV2-009 16/16, regressões 23/23, 31/31, 41/41, 23/23 e app com agente falso 23/23; rodada real ~US$ 1,5.

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
