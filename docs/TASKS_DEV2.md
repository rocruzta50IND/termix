# TASKS_DEV2 — Termix (frente da dev2)

Tarefas da **dev2**, separadas das do DEV1. Decisão do Ygor (2026-11-06):

- Numeração própria: **DEV2-001, DEV2-002...** A sequência TASK-xxx é do DEV1 e não é usada aqui.
- A dev2 trabalha só nas frentes **Vibe Coding** e **Mutirão** (desenho em `docs/VIBE_MUTIRAO.md`).
- Estas tarefas não vão para `docs/TASKS.md` nem para `docs/CHANGELOG_DEV.md`; o histórico fica em `docs/CHANGELOG_DEV2.md`.
- O DEV1 não é notificado até o MVP do Vibe/Mutirão; `docs/HANDOFF_DEV2.md` fica como "EXPERIMENTO (não entregar)".

---

## DEV2-003 — Vibe Coding cria orquestrador e dev, gera o plano e faz só as perguntas necessárias

- **Status:** CONCLUÍDA NA DEV2 (aguardando revisão do Ygor)
- **Data:** 2026-11-06
- **Pedido:** (orquestrador, autorizado pelo Ygor) com a entrega pronta, "Iniciar Vibe Coding" cria as abas do orquestrador e do dev, o Termix pede o plano com um prompt curto, detecta o fim do turno, mostra o andamento, as perguntas (formulário) e o plano; "Parar"; estado que sobrevive a fechar o app; dicas de economia; corrigir o recuo da lista de seções da DEV2-002. Sem executar o código do projeto (isso é a DEV2-004). Decisões novas do Ygor registradas em `docs/VIBE_MUTIRAO.md` (economia de tokens, autonomia só na branch do papel, notificação só para deploy e o indispensável, roteiro renumerado até a DEV2-007).
- **Feito:**
  - "Iniciar Vibe Coding" grava a entrega e cria no projeto, pelo `createTab` do app, as abas **"Vibe · Orquestrador"** e **"Vibe · Dev"** (Dangerously). O Dev fica parado.
  - O Termix espera o `SessionStart` do orquestrador e digita um pedido curto (uma linha, ~1,7 mil caracteres) que aponta para a pasta da entrega e pede `plano.md` (com "Branch de trabalho: …" e tarefas "## T1 — …") e `perguntas.json` (só o indispensável, sempre gravado). O pedido traz as regras de autonomia e de economia e proíbe mexer no código e escrever fora da pasta do módulo.
  - Fim do turno pelo hook `Stop` que o app já recebe (zero token); o Termix lê os arquivos. Perguntas viram formulário (opções + comentário, ou texto livre), com notificação pelo mecanismo do app (sino, dica, som, Windows sem foco); as respostas vão para `respostas.json` e um pedido curto fecha o plano.
  - Painel de andamento na tela: Preparando plano → Perguntas (N) → Plano pronto, plano visível (recolhível), avisos e uma dica de economia por etapa. "Plano pronto, N tarefas. A execução automática chega na DEV2-004."
  - "Parar Vibe Coding" (Esc no orquestrador se estiver trabalhando; não apaga nada; abas ficam) e "Retomar" (lê os arquivos primeiro, zero token; só pede ao orquestrador o que faltar).
  - Estado em `vibe\<id>\estado.json`; ao reabrir o app, a tela mostra onde parou e nada recomeça sozinho. Novo ciclo arquiva o anterior em `historico\ciclo-<data>\`.
  - Conferências do Termix (zero token): contagem de tarefas pelos IDs T1, T2… (sem IDs, não mostra número); alerta se o plano mandar commit/push na main/master; aviso + notificação se o orquestrador não abrir em 30 s (pasta ainda não confiada no Claude Code).
  - Dica de economia também na entrega ("Entregas completas evitam perguntas e gastam menos tokens").
  - Corrigido o recuo da lista de seções que faltam (e das listas dos quadros "Falta para iniciar" e de mensagem): a lista herdava os 40 px do navegador mais 18 px; agora segue o padrão das listas do app (1,35em) e fica alinhada com o nome do arquivo.
  - Modo de teste: `vibeTest` ganhou `cycle`, `inject` (grava um `perguntas.json` de teste), `answer`, `stop` e `resume`; o canal de teste só funciona com `TERMIX_VIBE_TEST=1`.
- **Decisões:**
  - **Zero linha no núcleo.** O módulo usa o que o `app.js` já expõe no escopo global (`createTab`, `findTab`, `RT`, `stOf`, `UI`, `renderAll`, `addEvent`, `notifCfg`, `showToast`, `beep`, `api`) e ouve os hooks pelo próprio `window.termix.onHook` (o preload aceita vários ouvintes). `main.js`, `preload.js`, `index.html` e `app.js` não mudaram.
  - Abas em **Dangerously**: em Normal, gravar na pasta do módulo (fora do projeto) pediria aprovação a cada passo e o ciclo não seria autônomo.
  - O Enter do pedido vai 1 s depois do texto e se repete enquanto o hook de prompt enviado não chega: o `typeTo` do app (150 ms) deixou o pedido parado na caixa no teste (o Claude Code trata texto longo como colagem).
  - `perguntas.json` ausente com um plano gravado no mesmo turno vale como "nenhuma pergunta" (no teste real o orquestrador não gravou a lista vazia).
  - A notificação de perguntas usa as peças do aviso do app sem a regra "não avisa a aba que está à vista", porque as perguntas ficam na tela do Vibe, não no terminal.
  - "Parar" também aparece em "Plano pronto" (o ciclo fica esperando a DEV2-004); "Iniciar" fica bloqueado enquanto há ciclo em andamento.
- **Arquivos tocados:** `src/vibe/index.js`, `src/renderer/vibe/vibe.js`, `src/renderer/vibe/vibe.css`, `docs/VIBE_MUTIRAO.md`, `docs/DECISOES.md` (1 linha na seção do Vibe), `docs/TASKS_DEV2.md`, `docs/CHANGELOG_DEV2.md`, `docs/HANDOFF_DEV2.md`. Núcleo (`main.js`, `preload.js`, `index.html`, `app.js`): nada.
- **Como validar:** `npm run check`. Numa instância isolada com `TERMIX_VIBE_TEST=1`: entrega completa > "Iniciar" > aparecem as 2 abas > (pasta nova: escolher "Yes, I trust this folder" na aba do orquestrador) > o painel passa a "Preparando plano" > o orquestrador grava `plano.md` > "Plano pronto" ou perguntas > responder > plano fechado > "Parar" > fechar e reabrir: "parado" e nada recomeça. Sem perguntas reais, `vibeTest.inject([...])` testa o formulário.
- **Validação feita:** `npm run check` passou. Teste real por CDP numa instância isolada (`--user-data-dir` e projeto "contador" com git em pasta temporária, porta 9335, um Electron por vez):
  - 1ª rodada: falhou por dois motivos, ambos corrigidos — o script de teste apertou Enter no aviso "confiar nesta pasta?" (padrão "No, exit") e fechou o orquestrador; e o Enter de 150 ms foi engolido (pedido ficou na caixa, 0 mensagens).
  - 2ª rodada: abas criadas; pasta confiada (ação do humano, simulada pelo script); `SessionStart` detectado; pedido enviado; o orquestrador gravou `plano.md` em ~31 s, mas sem `perguntas.json` (virou "erro"; corrigido: vale como "nenhuma pergunta"). Notificação do erro funcionou.
  - Continuação sem novo plano: "Retomar" leu os arquivos e foi a "Plano pronto" sem tokens; `perguntas.json` de teste injetado (2 perguntas, opções e texto) → formulário e notificação "2 perguntas esperando você"; enviar vazio mostra o erro; respostas gravadas → pedido de fechar → o orquestrador regravou o plano e `perguntas.json` vazio em ~20 s → "Plano pronto"; "Parar" → "parado", 2 abas abertas.
  - Reabrir o app: a tela mostra "Vibe Coding parado em Plano pronto"; 15 s depois, fase igual e o orquestrador continuou com 2 mensagens (nada foi enviado).
  - Checagem visual final (zero token) depois dos ajustes de contagem e alerta: "Plano pronto, 3 tarefas" e o alerta da T3 "Commit em master".
  - O orquestrador só usou `ls`/`cat` na pasta do módulo e `Write`/`Edit` em `plano.md` e `perguntas.json` dessa pasta. Projeto de teste intacto (só `README.md`, 1 commit, `git status` limpo); o Dev não recebeu nenhuma mensagem; o `%APPDATA%\Termix\vibe` real não existe. Sem erros no console.
  - Gasto: janela de 5 h foi de 34 % para 37 % durante o teste (a mesma conta também rodava esta sessão de desenvolvimento, então o número inclui o gasto dela); a status line do orquestrador mostrou custo equivalente de US$ 0,26 no turno do plano e US$ 0,35 somando o fechamento, com 56 mil tokens de contexto (Opus 5.5).
  - Capturas fora do repositório, em `C:\Users\CRUUUU~1\AppData\Local\Temp\claude\c5001e4e31f92b1a\daee3475-441f-40b5-a470-a7d2a9f7778d\scratchpad\shots`.
- **Pendências:**
  - **O orquestrador ignorou a regra de branch**: a T3 do plano real diz "Commit em master". O pedido agora exige a linha "Branch de trabalho" e a tela alerta, mas a trava precisa ser em código na DEV2-004 (o Termix cria/confere a branch e bloqueia commit/push fora dela, por exemplo com um hook).
  - O orquestrador também não seguiu o formato "## T1 — título" (usou lista numerada); a contagem lida com isso, mas a DEV2-004 deve ler o plano de forma tolerante ou exigir o formato.
  - A versão final do pedido (com "Branch de trabalho" e o reforço do formato) não passou por uma nova rodada real, para não gastar tokens; vale uma rodada na revisão.
  - Pasta nova no Claude Code pede "confiar nesta pasta?" (ação do humano; o Termix avisa em 30 s). Em máquina que nunca aceitou o modo Dangerously, pode aparecer também o aviso de aceitar esse modo (não apareceu aqui).
  - Observado: a aba "Vibe · Dev" gerou um aviso "Terminou" sem ter recebido mensagem (comportamento do app ao abrir; sem efeito no ciclo).
  - Ainda sem teste manual com o diálogo de arquivo nativo (herdado da DEV2-002).
- **Próximo passo:** DEV2-004 — ciclo de execução autônomo com travas em código: o Termix cria/confere a branch permitida, passa as tarefas do plano ao Dev uma a uma (pedido curto, `/clear` entre tarefas), o orquestrador confere pelo resumo e o humano só é chamado para deploy e o indispensável.

---

## DEV2-002 — Tela de entrega do Vibe Coding (formulário engessado e .md modelo)

- **Status:** CONCLUÍDA NA DEV2 (aguardando revisão do Ygor)
- **Data:** 2026-11-06
- **Pedido:** (orquestrador, autorizado pelo Ygor) o botão Vibe Coding deixa de abrir o "Em construção" e abre a tela de entrega engessada, com o .md modelo para baixar; validar o botão de ponta a ponta em instância isolada. Não cria agentes (fica para a DEV2-003).
- **Feito:**
  - Tela de entrega num modal largo (760 px) com os 7 itens: projeto, objetivo final (até 300 caracteres), fluxo desenhado (.png/.jpg/.svg/.pdf/.drawio/.excalidraw/.md com Mermaid), estrutura .md com as 9 seções do modelo, critério de pronto, o que os agentes NÃO podem fazer (opcional) e acessos/dados a fornecer (lista ou "Nada a fornecer").
  - Quadro "Falta para iniciar" sempre visível, em linguagem clara; a estrutura lista as seções que faltam e as que estão sem conteúdo. "Iniciar Vibe Coding" fica desabilitado até tudo estar completo; clicado, grava e mostra "Entrega pronta. Os agentes chegam na próxima etapa (DEV2-003)".
  - "Baixar modelo (.md)": salva com diálogo o `src/vibe/modelo-entrega.md` (9 seções, dicas e exemplos para sócios não técnicos, dicas de Excalidraw, draw.io e Mermaid).
  - Rascunho por projeto, salvo a cada mudança; a tela reabre no último projeto usado.
  - Entrega em `%APPDATA%\Termix\vibe\<id-do-projeto>\` (`entrega.json` com status "pronta" e a data, mais as cópias `fluxo.<ext>` e `estrutura.md`). Já existindo, a tela avisa e só substitui com confirmação; a anterior vai para `historico\<data>\` (nada é apagado).
  - Canais ipc `vibe:*` registrados pelo próprio módulo, cada um com try/catch. O processo principal reconfere tudo antes de gravar.
  - Modo de teste só com `TERMIX_VIBE_TEST=1` (aceita caminho no lugar do diálogo nativo e expõe `window.vibeTest`); sem a variável, nada é exposto.
  - Mutirão continua "Em construção". O texto da chave em Configurações foi atualizado.
- **Decisões:**
  - Modal largo em vez de página: cabe bem em 760 px com rolagem e rodapé fixo, igual às outras janelas.
  - A confirmação de substituir aparece dentro da própria tela, porque o app só tem um modal por vez.
  - Seção do .md "com conteúdo" = pelo menos 3 caracteres úteis, sem contar as dicas `> ` e os comentários. Assim o modelo baixado e não preenchido não passa.
  - Depois de gravar, "Iniciar" só volta a habilitar quando algo muda (evita uma substituição por engano).
  - Preload: a ponte `vibeStatus` virou a ponte genérica `vibe(canal, ...)` (só canais `vibe:*`), para os próximos canais não precisarem mexer no núcleo.
- **Arquivos tocados:** `src/vibe/index.js`, `src/vibe/modelo-entrega.md` (novo), `src/renderer/vibe/vibe.js`, `src/renderer/vibe/vibe.css`, `src/main.js` (3 linhas viraram 2: comentário e `create({ ipcMain, dialog, app, getWin, logError })`; o handler `vibe:status` foi para o módulo), `src/preload.js` (1 linha trocada), `docs/VIBE_MUTIRAO.md`, `docs/DECISOES.md`, `docs/TASKS_DEV2.md`, `docs/CHANGELOG_DEV2.md`, `docs/HANDOFF_DEV2.md`. `index.html` e `app.js`: nada.
- **Como validar:** `npm run check`. `npm start` > Configurações > Experimental > "Sim" > "Vibe Coding": a tela lista o que falta e "Iniciar" fica desabilitado; "Baixar modelo (.md)" salva o modelo; um .md sem seções mostra quais faltam; com tudo completo, "Iniciar" grava em `%APPDATA%\Termix\vibe\<id>\`; ao fechar e reabrir, o rascunho e o aviso da entrega existente aparecem; desligar a chave some com os botões.
- **Validação feita:** `npm run check` passou. Teste de ponta a ponta por CDP numa instância isolada (`--user-data-dir` na pasta temporária, `TERMIX_VIBE_TEST=1`, porta 9334, dois projetos de teste em pastas temporárias): a) desligado sem botões; b) ligado com 2 botões; c) tela vazia com 6 pendências e "Iniciar" desabilitado; d) modelo criado com as 9 seções (todas "sem conteúdo" no modelo cru); e) .md parcial aponta 6 seções faltando e 1 sem conteúdo; f) completo: "Iniciar" habilita e grava `entrega.json` (status "pronta"), `fluxo.md` e `estrutura.md`; g) reaberto com o rascunho e o aviso da entrega; substituir pede confirmação e guarda a anterior em `historico`; h) desligado sem botões e o app normal. Pastas dos projetos de teste continuaram vazias, o `%APPDATA%\Termix\vibe` real não foi criado e não houve erro no console. Capturas fora do repositório, em `C:\Users\CRUUUU~1\AppData\Local\Temp\claude\c5001e4e31f92b1a\3067c43d-1147-4e7b-ac53-ac1300b9ca68\scratchpad\shots`.
- **Pendências:** nenhuma desta tarefa. Ainda não foi testado com o diálogo nativo de verdade (só pelo modo de teste); vale um clique manual em "Escolher arquivo…" e "Baixar modelo (.md)" na revisão.
- **Próximo passo:** DEV2-003, criar os dois agentes (orquestrador e dev) a partir da `entrega.json` e o ciclo autônomo.

---

## DEV2-001 — Estrutura isolada do módulo Vibe Coding e Mutirão

- **Status:** CONCLUÍDA NA DEV2 (aguardando revisão do Ygor)
- **Data:** 2026-11-06
- **Pedido:** casca de um módulo separado do Termix com dois botões (Vibe Coding e Mutirão) que abrem telas próprias, ainda sem comportamento; o botão só chama a função, sem quebrar nada (pedido do Rodrigo).
- **Feito:**
  - Módulo do processo principal em `src/vibe/index.js` (fábrica no padrão do `chat.js`/`consumo.js`; devolve `{ vibe: 'idle', mutirao: 'idle' }`).
  - Ligações no núcleo: `main.js` +3 linhas (require e canal `vibe:status` com try/catch), `preload.js` +1 (`vibeStatus`), `index.html` +2 (CSS e script), `app.js` 0.
  - Interface em `src/renderer/vibe/vibe.js` e `vibe.css`: chave "Vibe Coding e Mutirão (experimental)" numa seção "Experimental" no fim de Configurações (desligada por padrão; grava `settings.vibe.on`); ligada, dois botões em pílula no cabeçalho, à esquerda do sino; cada um abre um modal do app com título, uma linha explicando a função e "Em construção".
  - `docs/VIBE_MUTIRAO.md` com o desenho aprovado, arquitetura, roteiro DEV2-002..006 e perguntas em aberto.
  - Os dois arquivos novos entraram no `npm run check`.
- **Decisões:** o `vibe.js` não altera o `app.js`: usa o que ele já expõe no escopo global (`S`, `save`, `modal`, `esc`) e repõe os botões quando o `app.js` redesenha o cabeçalho (MutationObserver no `#topbar`); a chave é anexada à página Configurações do mesmo jeito (observador no `#page`).
- **Arquivos tocados:** `src/vibe/index.js` (novo), `src/renderer/vibe/vibe.js` (novo), `src/renderer/vibe/vibe.css` (novo), `src/main.js`, `src/preload.js`, `src/renderer/index.html`, `package.json` (script check), `docs/VIBE_MUTIRAO.md`, `docs/TASKS_DEV2.md`, `docs/CHANGELOG_DEV2.md`, `docs/DECISOES.md`, `docs/HANDOFF_DEV2.md`.
- **Como validar:** `npm run check`. `npm start`: sem botões novos no cabeçalho. Configurações > Experimental > "Sim": aparecem "Vibe Coding" e "Mutirão" ao lado do sino; cada um abre a tela "Em construção" (fecha pelo X, Esc ou Fechar). "Não": somem.
- **Validação feita:** `npm run check` passou. Teste visual por CDP numa instância isolada (`--user-data-dir` na pasta temporária, sem tocar no `%APPDATA%\Termix`): desligado sem botões; ligado com 2 botões; os dois modais abrem; os botões voltam depois de um redesenho forçado do cabeçalho; desligar remove os botões. Capturas fora do repositório em `C:\Users\CRUUUU~1\AppData\Local\Temp\claude\c5001e4e31f92b1a\c7827fbc-286a-4c32-bf6f-40166b3f1a12\scratchpad\shots`.
- **Pendências:** nenhuma desta tarefa.
- **Próximo passo:** DEV2-002 — tela de entrega do Vibe Coding (formulário engessado) e .md modelo para baixar.
