# TASKS — Termix

Controle de tarefas do projeto. Ao receber um pedido, o Claude localiza a tarefa aqui (ou cria uma nova entrada) antes de desenvolver.

Formato do ID: `TASK-XXX` — numeração sequencial, sem reuso, livre em todas as branches. Status e responsabilidades em `WORKFLOW.md`.

---

## Em andamento

### TASK-025 — Botão Clear no alternador de baixo (MVP)

- **Responsável:** DEV1
- **Status:** EM ANDAMENTO (feito; aguardando teste do usuário)
- **Prioridade:** Alta (MVP)
- **Objetivo:** um botão **Clear** no alternador, ao lado de Terminais, que limpa o contexto do terminal ativo sem perder o fio: fecha a tarefa em arquivo, manda `/clear` e pede para retomar pelos arquivos do projeto (ideia do guia de economia de tokens do pacote `economia-tokens-pacote.zip`, que o app reproduz por dentro).
- **Decisões (usuário, 2026-10-30):** só o Clear por enquanto (Compact, Interromper e outras ações ficam fora; dificilmente serão usadas); o limite de contexto que faz o botão **pulsar** é configurável (exemplo dado: 15 %); o modelo é escolha da pessoa, o app não se envolve; as configurações ficam só dentro do app. Decisões minhas, sem objeção até aqui: um único botão que abre uma confirmação com duas saídas (**Só limpar** e **Fechar a tarefa e limpar**); o botão só vale com o agente aguardando; o rótulo "Clear" fica visível (a dica nativa não aparece na vista do alternador).
- **Feito até agora:** botão "Clear" na pílula do alternador (só na tela Terminais, junto de um separador), desabilitado sem terminal vivo e aguardando, com pulso âmbar quando o CTX do terminal ativo chega ao limite configurado; a largura do alternador cresce com o botão. Fluxo em `src/renderer/app.js` (`clearFlow`): confirmação → "Fechar a tarefa e limpar" envia o pedido de fechamento, espera o agente terminar (estado vindo dos hooks, conferido a cada 700 ms), confere se o terminal mostra o aviso final `TERMIX-CLEAR-OK` (senão pergunta se limpa mesmo assim) → envia `/clear` → ao chegar o hook `SessionStart` com `source: clear`, envia o pedido de retomada na conversa nova. "Só limpar" envia só o `/clear`. Travas: sem resposta do agente em 10 s o fluxo é cancelado; sem o `SessionStart` em 12 s também. Configurações > "Botão Clear": limite de contexto (0 desliga), texto do pedido de fechamento, texto do pedido de retomada e "Restaurar" (guardados em `settings.clear`). Os textos padrão são genéricos (procuram `docs/TASKS.md` ou `docs/HISTORICO-TAREFAS.md`, não fazem commit) e podem ser trocados por `/encerrar-tarefa` e `/retomar` neste projeto. Testado numa instância isolada: o app carrega, a página de Configurações e o botão (com pulso) aparecem certos; **o fluxo completo com um Claude Code de verdade ainda não foi exercitado**.
- **Ajustes após o 1º teste do usuário (2026-10-30):** o botão funcionou; (1) o alternador sumia ao abrir o menu da engrenagem do rail (agora só some com modal ou outros menus); (2) ícone do Clear trocado (círculo com X); (3) o `/clear` deixava o texto antigo na tela: ao chegar o `SessionStart` com `source: clear`, o app apaga a tela e o histórico visível e manda Ctrl+L para o Claude Code redesenhar; (4) Ctrl+C (copia com texto selecionado; sem seleção segue sendo o Ctrl+C do terminal) e Ctrl+V (cola; sem texto, como imagem, passa o Ctrl+V ao Claude Code) passaram a funcionar nos terminais, pela área de transferência do Electron (`clip:read`/`clip:write`).
- **Arquivos tocados:** `src/main.js`, `src/preload.js`, `src/renderer/app.js`, `src/renderer/web.js`, `src/renderer/styles.css`, `src/dock.js`, `src/dock.html`, `docs/DECISOES.md`, `docs/DESIGN.md`, `docs/TASKS.md`, `docs/CHANGELOG_DEV.md`.
- **Como validar:** `npm start`; abrir um terminal do Claude Code, mandar uma mensagem e esperar terminar. (1) O botão Clear fica habilitado; durante uma resposta, desabilitado. (2) Clicar: aparece a confirmação; "Só limpar" deve limpar a conversa; "Fechar a tarefa e limpar" deve registrar a tarefa, limpar e o agente retomar sozinho. (3) Em Configurações > Botão Clear, baixar o limite para 1: o botão pulsa quando o CTX passa disso; 0 desliga o pulso. (4) Trocar os textos por `/encerrar-tarefa` e `/retomar` e repetir (o app deve perguntar antes de limpar, pois o aviso final não aparece).
- **Pendências:** testar o fluxo completo com um Claude Code real (inclusive o `/clear` digitado pelo menu de comandos e o retomar na conversa nova); o aviso final `TERMIX-CLEAR-OK` depende de o agente obedecer; o botão age só na aba ativa do projeto atual; sem atalho de teclado (TASK-009).
- **Próximo passo:** o usuário testa; ajustar o que aparecer. Fora de escopo registrado na TASK-026 (Backlog).

## Aguardando validação DEV1

_Nenhuma no momento._

## Validadas em DEV1

### TASK-022 — Rail flutuante com alternador Terminais / Web (MVP)

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1
- **Prioridade:** Alta (MVP)
- **Objetivo:** ver o navegador dentro do app para testar sistemas web, alternando com os terminais por um alternador flutuante no centro da base. Só visualizar e navegar; o agente controlar o navegador fica para uma versão futura.
- **Critérios de aceite:**
  - Alternador em pílula, flutuando no centro da base, com **Terminais** (selo do número de abas e de atenção) e **Web**; atalho Ctrl+`.
  - A tela Web tem abas de página, voltar, avançar, recarregar, barra de URL, tamanho de dispositivo e DevTools.
  - A Web é por projeto (lembra abas e URL), com perfil persistente (não perde login); a vista só é criada quando a pessoa abre a Web.
  - O alternador, os menus e os modais continuam visíveis por cima da vista do navegador.
- **Decisões (2026-10-30, padrões adotados sem objeção do usuário):** Web **por projeto**; alternador **esmaece** quando parado (como o rail de informações). Arquitetura: `WebContentsView` por aba web (`src/web.js`), um segundo `WebContentsView` pequeno só com o alternador por cima (a vista nativa fica acima do HTML), e, com menu/modal aberto, a vista do navegador vira uma imagem (`capturePage`) para o HTML ficar por cima.
- **Feito até agora:** `src/web.js` (uma `WebContentsView` por aba web, perfil `persist:termix-web`, só http/https, permissões negadas, `target=_blank` vira aba), alternador como vista própria (`src/dock.html`, `dock.js`, `dock-preload.js`), tela Web na interface (`src/renderer/web.js`: abas, voltar/avançar/recarregar/parar, endereço, dispositivo Responsivo/Celular/Tablet, DevTools, tela inicial com atalhos de localhost), troca da vista por imagem com menu/modal aberto, Ctrl+` (também com o foco dentro da página) e Ctrl+L. Web por projeto, salva em `projects[].web`; as abas voltam ao reabrir e a vista só nasce quando a aba é aberta. Testado numa instância isolada (CDP + captura só da janela): alternador acima da página, retângulo certo, modal sobre a imagem, link em nova aba, Celular, restauração.
- **Arquivos tocados:** `src/web.js`, `src/dock.html`, `src/dock.js`, `src/dock-preload.js`, `src/main.js`, `src/preload.js`, `src/renderer/index.html`, `src/renderer/app.js`, `src/renderer/web.js`, `src/renderer/styles.css`, `package.json` (check), `docs/DECISOES.md`, `docs/DESIGN.md`, `docs/TASKS.md`, `docs/CHANGELOG_DEV.md`.
- **Como validar:** `npm start`; com um projeto aberto, clicar em **Web** no alternador (ou Ctrl+`): digitar `localhost:3000` (ou outro endereço) na barra e Enter; abrir um link com nova aba, usar voltar/avançar/recarregar, o botão de dispositivo (Responsivo → Celular → Tablet) e o DevTools; abrir o menu "+" de um projeto ou um modal com a Web aberta (a página some atrás, o menu fica por cima); trocar para outro projeto e voltar; voltar a **Terminais** pelo alternador e conferir que os terminais continuam vivos; fechar e reabrir o app (as abas web voltam).
- **Pendências:** o alternador cobre um pouco do rodapé do terminal (se incomodar, reservar uma faixa ou mudar a posição); o botão de dispositivo alterna a cada clique (sem menu); cantos de baixo da vista do navegador são retos; testar em janela estreita e com o painel de notificações aberto; não testado com um terminal do Claude Code aberto junto (só instância isolada sem sessões).
- **Validada em:** 2026-10-30 (o usuário testou: o rail ficou como está e deve ser mantido; novas funções entram depois). Organização de páginas (grupos e atalhos) na TASK-023. Falta promover para a `main` com `/fluxo:promover`, quando o usuário pedir.

### TASK-021 — Informações do terminal no app (rail no lugar da status line do plugin) (MVP)

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1
- **Prioridade:** Alta (MVP)
- **Objetivo:** o Termix mostra por conta própria o que a status line do plugin mostrava dentro do terminal (e que um dia vai sumir), num rail dentro do app, em vez de só no cabeçalho.
- **Critérios de aceite:** (atendidos)
  - Mostra, por aba/sessão: contexto (% e tokens usados/limite), limite de 5 h, limite de 7 d (com quando renovam) e validade do cache; modelo, projeto, branch e permissões como etiqueta opcional.
  - Decidido o que fica no rail e o que sai do cabeçalho, sem duplicar: a cápsula 5 h / 7 d do cabeçalho só aparece com o rail desligado.
  - Todos os dados têm origem definida: `statusline-wrapper.js` (modelo, contexto, limites, `prompt_cache`, pasta), `git branch` na pasta do projeto e as opções com que a aba foi aberta (permissões).
- **Feito:** cápsula vertical de anéis (CTX, 5H, 7D, CACHE) dentro do terminal, junto à borda direita; número no anel e detalhe ao passar o mouse (tokens usados/limite, quando renova, validade do cache); cores verde/amarelo (≥ 70 %)/vermelho (≥ 90 %); cache pelo `prompt_cache` do Claude Code (≥ 2.1.251), com estimativa pelo arquivo da conversa em versões antigas, validade (1 h ou 5 min) vinda do dado e estado "frio". Engrenagem com menu ao lado da cápsula: mostrar informações, reservar espaço no terminal (padrão desligado), esmaecer quando parada (padrão ligado), etiqueta de modelo/branch/permissões (padrão desligada); as escolhas ficam em `settings.rail` com versão dos padrões (`v: 2`). O encaminhador mantém os últimos limites conhecidos até a primeira resposta da sessão. A atualização do rail troca só o que mudou (sem recriar os nós), para o tooltip não piscar a cada segundo. O plugin da status line (`statusline-command.py`, do repositório Jhonatan-de-Souza/claude-code-statusline, sem licença declarada, por isso reimplementado e não copiado) foi retirado do `~/.claude/settings.json` do usuário (backup em `settings.json.bak-termix-statusline`). Valores conferidos contra os da status line antiga (ctx, 5h, 7d, cache). Testado numa instância isolada com sessão real do Claude Code v2.1.314.
- **Decisões (usuário, 2026-10-30):** informações da sessão no rail e opcionais (menu próprio); contexto, 5 h, 7 d e cache sempre visíveis quando ligadas; entre a pílula horizontal na base, a lateral larga e a lateral compacta, escolheu a **lateral compacta dentro do terminal**; reservar espaço desligado e esmaecer ligado por padrão (o usuário escolhe deixar sempre à vista ou ver ao passar o mouse). Detalhes em `docs/DECISOES.md` e `docs/DESIGN.md`.
- **Arquivos tocados:** `src/statusline-wrapper.js`, `src/main.js`, `src/preload.js`, `src/renderer/app.js`, `src/renderer/index.html`, `src/renderer/styles.css`, `docs/DECISOES.md`, `docs/DESIGN.md`, `docs/prototipos/rail-demo.html`, `docs/prototipos/rail-lateral.html`, `docs/prototipos/rail-compacto-terminal.html`, `docs/TASKS.md`, `docs/CHANGELOG_DEV.md`.
- **Como validar:** `npm start`; abrir uma aba e mandar uma mensagem: a cápsula mostra CTX, 5H, 7D e CACHE (antes da primeira resposta, "—"), esmaecida até passar o mouse; o terminal não mostra mais a status line antiga. Na engrenagem: ligar "Reservar espaço" (o terminal estreita), desligar "Esmaecer", ligar a etiqueta de modelo/branch, desligar "Mostrar informações" (a cápsula 5 h / 7 d volta ao cabeçalho).
- **Pendências:** o cache de 5 min (créditos extras ou chave de API) não foi exercitado, só o de 1 h; em janela estreita (< ~980 px) a cápsula só estreita o terminal; o plugin foi retirado também do Claude Code fora do Termix (backup do `settings.json` guardado).
- **Validada em:** 2026-10-30 (o usuário testou e aprovou). Falta promover para a `main` com `/fluxo:promover`, quando o usuário pedir.

### TASK-010 — Instalador, atalho e backup do estado (MVP)

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1
- **Prioridade:** Alta (MVP)
- **Objetivo:** gerar um instalador `.exe` (electron-builder) que funcione em qualquer PC com Windows 10/11 x64, com atalho no menu Iniciar/área de trabalho e backup do `state.json` (a gravação já é atômica).
- **Critérios de aceite:**
  - O instalador abre o Termix sem precisar de Node, npm nem de rebuild de módulos nativos.
  - Terminais (node-pty), hooks e captura dos limites funcionam também no app instalado (arquivos fora do `app.asar`).
  - Funciona em PC sem Node.js no PATH (Claude Code instalado pelo instalador nativo).
  - Se o Claude Code não for encontrado, o app explica o que fazer, em vez de falhar calado.
  - Testado instalando e abrindo o app a partir da pasta de instalação (não do código-fonte).
- **Feito até agora:** electron-builder configurado (`npm run dist` → `dist\Termix-Setup-0.1.0.exe`, ~118 MB, NSIS por usuário, atalhos no menu Iniciar e na área de trabalho, pasta de instalação escolhível). Ajustes de portabilidade em `src/main.js`: (1) sem Node.js no PATH, hooks e status line rodam pelo próprio Termix (`--termix-run`), e os dois scripts passaram a ler o stdin de forma síncrona (no Electron o stdin por evento chegava vazio); (2) `findClaude()` também procura em `~\.local\bin` e `%APPDATA%\npm`, com mensagem clara se não achar; (3) trava de instância única; (4) backup do `state.json` (`state.bak.json`, 1 por hora) e recuperação se o principal estiver ilegível. Testado **instalando de verdade** (silencioso, em pasta temporária): o app abre, o `node-pty` abre o terminal e o Claude Code responde, o hook `SessionStart` e a status line gravam os dados, tudo com o PATH sem Node. A instalação de teste foi removida (pasta, atalhos e registro).
- **Decisões:** NSIS por usuário, só x64; sem `asar`; instalador não assinado (SmartScreen avisa); o app não instala o Claude Code. Detalhes em `docs/DECISOES.md`. `electron` passou para `devDependencies` (exigência do builder).
- **Arquivos tocados:** `package.json`, `package-lock.json`, `.gitignore`, `CLAUDE.md`, `src/main.js`, `src/hook-wrapper.js`, `src/statusline-wrapper.js`, `docs/DECISOES.md`, `docs/TASKS.md`, `docs/CHANGELOG_DEV.md`.
- **Como validar:** `npm run dist`; instalar o `.exe` de `dist\` (de preferência num PC sem Node.js, com o Claude Code instalado e logado); abrir pelo atalho, criar um projeto e uma aba, enviar uma mensagem; conferir o selo/aviso ao terminar; abrir o atalho de novo (deve trazer a janela existente); desinstalar e conferir que os dados em `%APPDATA%\Termix` continuam.
- **Pendências:** teste em Windows limpo (vira TASK-020); Windows 10 (o fundo "Ofuscado" depende do Windows 11). Não feito: assinatura do código e atualização automática.
- **Validada em:** 2026-10-30. O usuário não tem como testar em outro PC agora e vai usar o app no dia a dia para dar feedback; aceitou o estado atual como MVP, com o teste em Windows limpo registrado na TASK-020. Falta promover para a `main` com `/fluxo:promover`, quando o usuário pedir.

### TASK-005 — Validar controles da janela e menus das abas

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1
- **Prioridade:** Média (MVP)
- **Objetivo:** testar com cliques minimizar/maximizar/fechar, arrastar o header, e as ações duplicar, exportar texto e "fechar outras/à direita" do menu de botão direito.
- **Feito até agora:** testado por cliques reais (CDP + automação do Windows), sem encontrar defeito. Controles da janela: minimizar (janela iconificada e restaurada), maximizar e restaurar (ícone e dica alternam, tamanho muda), arrastar pelo espaço vazio do cabeçalho (a janela acompanhou o mouse) e fechar (com sessões ativas abre a confirmação: "Cancelar" mantém o app aberto, "Encerrar tudo e sair" fecha). Menu de botão direito da aba: Duplicar (cria "Aba B (2)" logo depois da original), Exportar texto (diálogo de salvar abre e grava o arquivo com o conteúdo do terminal), Fechar guias à direita e Fechar outras guias (fecham as abas certas; ficam desabilitados quando não há o que fechar).
- **Decisões:** teste visual via CDP (`--remote-debugging-port`) numa instância isolada (`--user-data-dir` próprio, estado semeado), para não mexer nas abas reais do usuário; nenhuma alteração de código foi necessária.
- **Arquivos tocados:** `docs/TASKS.md`, `docs/CHANGELOG_DEV.md` (nenhum arquivo de código).
- **Como validar:** `npm start`; clicar em minimizar/maximizar/restaurar/fechar, arrastar o cabeçalho, e no menu de botão direito de uma aba testar duplicar, exportar texto, fechar outras e fechar à direita.
- **Pendências:** nenhuma.
- **Validada em:** 2026-10-29 (o usuário aprovou). Falta promover para a `main` com `/fluxo:promover`, quando o usuário pedir.

### TASK-012 — Acompanhar a mudança do ID da sessão (/clear) para o Retomar não perder a conversa

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1
- **Prioridade:** Média
- **Objetivo:** confirmar como `/clear` e compactação mudam o ID da conversa e garantir que o "Retomar" do Termix use sempre o ID atual.
- **Feito até agora:** verificado nos históricos reais (`~/.claude/projects`): `/clear` cria uma conversa nova (arquivo `.jsonl` novo, ID novo, hook `SessionStart:clear`); a compactação (`SessionStart:compact`) e o resume mantêm o ID. Antes da correção, a aba guardava o ID original e o Retomar voltava para a conversa de antes do `/clear`. Correção feita: o hook grava o `session_id` e o app atualiza o ID da aba quando ele muda.
- **Decisões:** o hook grava `session_id` em todo evento (não só no `SessionStart`), para cobrir o caso de um evento ser sobrescrito antes da leitura; o app atualiza `tab.sessionId` e marca a aba como iniciada.
- **Arquivos tocados:** `src/hook-wrapper.js`, `src/renderer/app.js`, `docs/TASKS.md`.
- **Como validar:** `npm start`; abrir uma aba, enviar uma mensagem, dar `/clear`, enviar outra; fechar o app e reabrir: a aba deve retomar a conversa posterior ao `/clear`.
- **Pendências:** nenhuma.
- **Validada em:** 2026-10-29 (o usuário testou: a aba voltou na conversa posterior ao `/clear`). Falta promover para a `main` com `/fluxo:promover`, quando o usuário pedir.

### TASK-018 — Animação de abertura do app (MVP)

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1
- **Prioridade:** Média (MVP)
- **Objetivo:** uma animação simples de abertura que cubra o tempo de carregar e reabrir os terminais, para a pessoa entrar já com tudo aberto, sem ver terminais vazios abrindo um a um.
- **Feito até agora:** tela de abertura (`#splash`) com a logo pulsando, mostrada desde o primeiro quadro e removida com fade quando `restoreOnOpen()` termina (mínimo ~900 ms, máximo 8 s). Sem abas para restaurar, some logo após o mínimo.
- **Decisões:** só anima `opacity`/`transform`; respeita "reduzir movimento" (sem pulso, só fade); o tempo máximo evita travar a entrada se uma aba demorar.
- **Arquivos tocados:** `src/renderer/index.html`, `src/renderer/styles.css`, `src/renderer/app.js`, `docs/DECISOES.md`, `docs/DESIGN.md`.
- **Como validar:** abrir 3 abas, fechar o app e reabrir: a logo aparece, some em fade e os terminais já estão abertos. Com nenhum terminal aberto, a abertura é rápida (~1 s).
- **Pendências:** nenhuma.
- **Validada em:** 2026-10-29 (o usuário testou e aprovou). Falta promover para a `main` com `/fluxo:promover`, quando o usuário pedir.

### TASK-004 — Notificações reais

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1
- **Prioridade:** Alta
- **Objetivo:** painel lateral listando eventos (terminou, pediu permissão, erro), notificação do Windows e selo na aba quando a pessoa não está olhando para ela ou o app está em segundo plano.
- **Feito até agora:** `notifyTab()` em `app.js` centraliza os avisos (hooks Stop/Notification, heurística de reserva e falha ao iniciar): vão para o painel com o botão "Abrir", marcam a aba com um selo (verde = terminou, amarelo = precisa de você, vermelho = erro), destacam o projeto na barra lateral e, com o app sem foco, disparam notificação do Windows (`notify:show` no `main.js`) e piscam o ícone na barra de tarefas. Clicar na notificação traz a janela e abre a aba. O selo some quando a aba fica à vista com o app em foco.
- **Decisões:** aviso só quando a pessoa não está vendo a aba (aba oculta ou app sem foco); com o app em foco e a aba visível, nada é mostrado. Selo guarda o mais grave (erro > permissão > terminou).
- **Arquivos tocados:** `src/main.js`, `src/preload.js`, `src/renderer/app.js`, `src/renderer/styles.css`.
- **Como validar:** `npm start`; abrir duas abas, pedir algo longo na segunda e ir para a primeira: ao terminar, selo verde na aba, evento no painel e destaque no projeto; clicar em "Abrir" vai até a aba e o selo some. Com o app minimizado (ou outra janela em foco), terminar uma resposta ou pedir uma permissão: aparece a notificação do Windows e o ícone pisca; clicar nela abre o Termix na aba certa.
- **Pendências:** nenhuma.
- **Validada em:** 2026-10-29 (o usuário testou e aprovou). Falta promover para a `main` com `/fluxo:promover`, quando o usuário pedir.

### TASK-002 — Corrigir retomada de aba que nunca recebeu mensagem

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1
- **Prioridade:** Alta
- **Objetivo:** a primeira aba mostrava "No conversation found with session ID …" ao reabrir o app, porque o Claude Code só grava o histórico depois da primeira mensagem e o app tentava `--resume` num ID sem histórico.
- **Feito até agora:** o app confere se o histórico da conversa existe (`session:exists`) antes de usar `--resume`; se não existir, abre a mesma conversa com `--session-id`.
- **Decisões:** não criar conversa nova com outro ID; reaproveitar o ID da aba, que ainda está vazio.
- **Arquivos tocados:** `src/main.js`, `src/preload.js`, `src/renderer/app.js`.
- **Como validar:** criar uma aba, fechar o app sem enviar nada, reabrir e restaurar a sessão: não deve aparecer o erro.
- **Pendências:** nenhuma.
- **Validada em:** 2026-10-29 (o usuário testou e aprovou). Falta promover para a `main` com `/fluxo:promover`, quando o usuário pedir.

### TASK-003 — Detecção confiável de "trabalhando / aguardando" com hooks do Claude Code

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1
- **Prioridade:** Alta
- **Objetivo:** trocar a estimativa por tempo sem saída (2,5 s) pelos hooks do Claude Code, injetados por sessão como a status line. É a base do pulso da aba e das notificações.
- **Feito até agora:** `src/hook-wrapper.js` grava o último evento em `metrics/hook-<aba>.json`; `pty:spawn` injeta os hooks `SessionStart`, `UserPromptSubmit`, `PostToolUse`, `Notification` e `Stop` via `--settings` (somam-se aos hooks do usuário); o main lê a cada 300 ms e envia `hook:event`; `app.js` muda o estado: prompt enviado/ferramenta rodou = trabalhando; iniciou/terminou/pediu atenção = aguardando, com evento no painel quando a aba não está visível.
- **Decisões:** a heurística antiga continua como reserva (sem hooks, 2,5 s); com hooks ativos vira só proteção contra interrupção com Esc (que não dispara o Stop): 20 s de silêncio total. `PostToolUse` volta a aba para "trabalhando" depois que uma permissão é aprovada.
- **Arquivos tocados:** `src/hook-wrapper.js`, `src/main.js`, `src/preload.js`, `src/renderer/app.js`, `package.json`.
- **Como validar:** `npm start`; em uma aba, enviar um prompt: o ponto vira "Trabalhando" na hora e volta a "Aguardando você" quando a resposta termina (sem esperar 2,5 s). Pedir algo que exija permissão: deve ficar "Aguardando você"; aprovar: volta a "Trabalhando". Com outra aba em foco, o aviso "Terminou" aparece no painel. Apertar Esc no meio de uma resposta: volta a "Aguardando" em até ~20 s.
- **Pendências:** nenhuma.
- **Validada em:** 2026-10-29 (o usuário testou no app e aprovou). Falta promover para a `main` com `/fluxo:promover`, quando o usuário pedir.

### TASK-019 — Restaurar sozinho os terminais que estavam abertos ao reabrir o app

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1
- **Prioridade:** Alta
- **Objetivo:** ao reabrir, as abas que estavam abertas quando o app foi fechado voltam sozinhas (conversa retomada pelo ID), sem o aviso "N sessões estavam ativas" e sem terminais vazios. As abas que o usuário fechou antes continuam fechadas.
- **Feito até agora:** aviso amarelo removido; `restoreOnOpen()` em `app.js` reabre as abas `live` + `open` uma de cada vez (intervalo de 400 ms), a ativa do projeto atual primeiro.
- **Decisões:** muda a decisão anterior "pergunta antes de restaurar" (`docs/DECISOES.md` atualizado); fila em vez de abrir tudo junto, para não pesar; falha numa aba mostra o estado de falha da própria aba, sem aviso global. A tela de "Continuar" proposta antes deixou de ser necessária. Animação de abertura fica na TASK-018.
- **Arquivos tocados:** `src/renderer/app.js`, `src/renderer/styles.css`, `src/renderer/index.html`, `docs/DECISOES.md`.
- **Como validar:** abrir 3 abas (uma delas sem nenhuma mensagem), fechar o app, reabrir: as 3 voltam sozinhas, sem aviso; uma aba fechada pelo X antes do fechamento do app não volta.
- **Pendências:** nenhuma.
- **Validada em:** 2026-10-29 (o usuário testou e aprovou). Falta promover para a `main` com `/fluxo:promover`, quando o usuário pedir.

### TASK-017 — Continuidade entre sessões: comandos e documentos de decisões

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1
- **Prioridade:** Alta
- **Objetivo:** garantir que, depois de cada `/clear`, a sessão nova continue de onde a anterior parou, sem depender da conversa.
- **Feito até agora:** comandos `/retomar` e `/encerrar-tarefa` em `.claude/commands/`; `docs/DECISOES.md` (decisões de produto e motivos) e `docs/DESIGN.md` (aparência e regras de desempenho); `CLAUDE.md` aponta para eles.
- **Decisões:** os comandos ficam no repositório (versionados), não no plugin `fluxo`; não mudam `WORKFLOW.md` nem o bloco do fluxo no `CLAUDE.md`; `/encerrar-tarefa` nunca promove para a `main` nem consulta a `dev2`.
- **Arquivos tocados:** `.claude/commands/retomar.md`, `.claude/commands/encerrar-tarefa.md`, `docs/DECISOES.md`, `docs/DESIGN.md`, `CLAUDE.md`.
- **Como validar:** o usuário lê `docs/DECISOES.md` e confirma que está fiel; numa sessão nova (depois do `/clear`), rodar `/retomar` e conferir se o resumo bate com o `TASKS.md`.
- **Pendências:** os comandos só aparecem em sessões novas do Claude Code e ainda não foram executados; o primeiro teste real é o `/retomar` logo após o primeiro `/clear`.
- **Validada em:** 2026-10-29 (o usuário revisou as decisões do `docs/DECISOES.md` item por item e aprovou). Próximo passo: dar o primeiro `/clear`, rodar `/retomar` e começar a TASK-003. Falta promover para a `main` com `/fluxo:promover`, quando o usuário pedir.

### TASK-014 — Novo ícone do Termix (cabeçalho, janela e barra de tarefas)

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1
- **Prioridade:** Média
- **Objetivo:** ícone coerente que lembre um gerenciador de terminais, legível em todos os tamanhos e igual no cabeçalho do app, na janela e na barra de tarefas.
- **Feito até agora:** marca simplificada do cabeçalho (`assets/logo-mark.svg`); ícone detalhado do app (`assets/icon.svg`: fundo escuro com borda azul luminosa, barra com três abas coloridas e `>_` claro com brilho); versão de traço grosso para 16 e 32 px (`assets/icon-small.svg`); `tools/make-icon.js` gera `icon.png` e `icon.ico` usando cada versão no tamanho certo.
- **Decisões:** a logo do cabeçalho é só o prompt `>_` com brilho, sem caixa (escolha do usuário), o ícone "Terminais" da barra lateral usa janelas em cascata (para não ficar igual à logo); texto "Termix" alinhado ao prompt (altura e centro); o ícone do app e da barra de tarefas mantém o quadrado escuro. Duas artes (detalhada e pequena) porque os detalhes finos somem abaixo de 48 px. Gradiente do prompt em `userSpaceOnUse`, porque um gradiente por caixa de contorno não pinta o traço horizontal do `_`.
- **Arquivos tocados:** `assets/icon.svg`, `assets/icon-small.svg`, `assets/logo-mark.svg`, `assets/icon.png`, `assets/icon.ico`, `tools/make-icon.js`, `src/renderer/app.js`, `src/renderer/styles.css`.
- **Como validar:** abrir o Termix e conferir o ícone no cabeçalho, na barra de tarefas e no Alt+Tab.
- **Pendências:** nenhuma.

### TASK-015 — Botão de reiniciar discreto e barras de rolagem finas

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1
- **Prioridade:** Média
- **Objetivo:** o botão Reiniciar/Retomar vira só um ícone sutil (com dica ao passar o mouse); as barras de rolagem de todo o app ficam finas, transparentes e recuadas das bordas arredondadas, sem passar da moldura.
- **Feito até agora:** botão `.btn.icon` (gira enquanto reinicia); barras do navegador estilizadas (trilho recuado 18 px, thumb de 4 px de borda) e barra do xterm colorida pelo tema (`scrollbarSlider*`) e estreita por CSS.
- **Decisões:** o texto do botão passa para o `title` e `aria-label`; o menu de botão direito da aba continua com "Reiniciar com a conversa atual".
- **Arquivos tocados:** `src/renderer/app.js`, `src/renderer/styles.css`.
- **Como validar:** abrir uma página longa (Configurações com janela pequena) e um terminal com histórico e ver se a barra fica dentro das bordas.
- **Pendências:** nenhuma.
- **Validada em:** 2026-10-29 (o usuário aprovou o resultado). Falta promover para a `main` com `/fluxo:promover`, quando o usuário pedir.

### TASK-016 — Tela "nenhum terminal aberto" com as abas fechadas do projeto

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1
- **Prioridade:** Média
- **Objetivo:** quando um projeto não tem terminal aberto (por exemplo, depois de fechar o app e encerrar as sessões), a tela lista as abas fechadas do projeto, a mais recente em destaque com "há X s/min/h", para continuar de onde parou.
- **Feito até agora:** `noTermHTML` em `app.js`: card "Continuar de onde parou" (mais recente) e lista "Outros terminais fechados"; tempo vem da data do histórico da conversa (`sessions:scan`), com `closedAt` como reserva; abas que nunca receberam mensagem viram um resumo com "Arquivar vazias"; botões Continuar/Reabrir/Arquivar e "Importar conversas da pasta…"; tempo relativo atualizado a cada 15 s; corrigido o centro da tela vazia que cortava listas longas.
- **Decisões:** a tela ficou só com "+ Terminal", o mais recente em destaque e uma lista dos terminais abertos antes neste projeto, sem rolagem (o número de linhas depende da altura; o resto vira "e mais N…", que abre a lista de sessões fechadas, onde ficam arquivar e importar). Tiramos da tela "Arquivar vazias" e "Importar conversas"; clicar numa linha reabre e retoma a conversa.
- **Arquivos tocados:** `src/renderer/app.js`, `src/renderer/styles.css`.
- **Como validar:** fechar todas as abas de um projeto com conversas e ver a tela; clicar em Continuar deve reabrir e retomar a conversa.
- **Pendências:** nenhuma.
- **Validada em:** 2026-10-29 (o usuário aprovou o resultado). Falta promover para a `main` com `/fluxo:promover`, quando o usuário pedir.

## Prontas

## Backlog

### TASK-026 — Registro de consumo e alertas de ritmo (derivado do guia de economia de tokens)

- **Responsável:** A definir
- **Status:** BACKLOG
- **Prioridade:** Média
- **Objetivo:** o `statusline-wrapper.js` já recebe `rate_limits` e `context_window`; passar a gravar um registro (`consumo-limites.jsonl`, no máximo 1 linha por minuto e uma quando a % muda, como no `statusline-registro.py.txt` do pacote) para medir **quem gasta a cota** por projeto/sessão, e mostrar isso no app (junto da TASK-011), em vez do `consumo.mjs` externo.
- **Ideias do guia a avaliar:** ritmo de ~20 % da cota por hora na janela de 5 h (aviso no rail quando passar); alerta de cache perto de esfriar (< ~1 min); hábito de `/clear` (contexto mediano ao limpar, sessões que ficaram pesadas). Os limiares de contexto (15 % / 35 %) dependem do tamanho da janela do modelo: conferir com o plano do usuário antes de fixar.
- **Origem:** `economia-tokens-pacote.zip` (guia, `consumo.mjs`, `statusline-registro.py.txt`) enviado pelo usuário em 2026-10-30.

### TASK-027 — Controle de contexto sob medida para o fluxo Rocruzta (pós-MVP, a avaliar)

- **Responsável:** A definir
- **Status:** BACKLOG (análise feita em 2026-10-30; nada do fluxo foi alterado)
- **Prioridade:** Alta entre as pós-MVP (reflete direto no gasto de tokens)
- **Objetivo:** o fluxo é iniciado em todo projeto novo; o Termix deve fechar, limpar e retomar com o mínimo de tokens nesse fluxo, só com configuração dentro do app.
- **Achados:** (1) o plugin `fluxo` **não traz** `/retomar` nem `/encerrar-tarefa` (são deste repositório); em projeto novo não existe mecanismo de continuidade, só o botão Clear do app. (2) O fluxo manda ler `CLAUDE.md`, `WORKFLOW.md` e `docs/TASKS.md` por inteiro a cada tarefa. Aqui o `TASKS.md` tem ~48 KB (≈ 14 mil tokens) e cresce a cada tarefa; o `/retomar` atual custa ≈ 21 a 27 mil tokens antes de qualquer trabalho (≈ 10 a 13 % de uma janela de 200 mil, acima do alerta de 15 % do guia). (3) A retomada só precisa das seções *Em andamento* / *Aguardando* e da última entrada do changelog (≈ 4 mil tokens). (4) O hook `SessionStart` do plugin já injeta nome das tarefas em andamento, branch, papel e validação (barato) e o guardrail não gasta tokens. (5) O app já recebe do Claude Code o tamanho do contexto, o cache (`prompt_cache`, com tokens a reescrever se frio) e os hooks de fim de resposta.
- **Candidatas de configuração (só no app, sem mexer no fluxo):**
  - **Perfil "projeto no fluxo"** (detecta `.claude/fluxo.json`): pedidos de fechar e retomar prontos para o fluxo, lendo o papel de `CLAUDE.local.md` e a validação de `fluxo.json`.
  - **Retomada enxuta:** ler só as seções ativas do `TASKS.md` (busca por título, sem abrir o arquivo todo) e a última entrada do changelog; ler `DECISOES`/`DESIGN` só se a tarefa mexer em produto/visual.
  - **Fechamento do fluxo:** validar, registrar a tarefa ativa no `TASKS.md`/changelog e fazer commit/push só na branch do papel, nunca promover; opção liga/desliga do commit.
  - **Gatilhos de graça:** o aviso final do fechamento (hoje `TERMIX-CLEAR-OK`, no fluxo "Pode dar /clear.") faz o botão avisar "pronto para limpar"; pulso também com cache frio e contexto grande (limpar é mais barato que reescrever).
  - **Modo por aba/projeto:** "tarefa pequena" (alerta 15 %) e "tarefa longa" (alerta 35 %), trocável no próprio botão.
  - **Medir o custo da retomada:** o app guarda o CTX antes do `/clear`, logo depois da retomada e ao fim da primeira resposta, e mostra "retomada custou X mil tokens"; também a "base da sessão" (CTX antes do primeiro pedido: CLAUDE.md, plugins, skills).
  - **Higiene de base:** mostrar plugins/skills/MCPs ativos no projeto e o peso estimado (liga com a TASK-013).
- **Propostas para o dono do fluxo (não aplicadas):** dividir o `TASKS.md` em índice + arquivo de tarefas encerradas e limitar cada entrada a ~6 linhas (como no guia); incluir no plugin comandos de retomar/fechar (hoje só existem aqui); `WORKFLOW.md` do template tem 12 KB e é relido a cada tarefa.
- **Fora de escopo:** registro de consumo e ritmo por hora (TASK-026); modelo escolhido pela pessoa.
- **Próximo passo:** (ao retomar) escolher com o usuário quais candidatas entram, começando por retomada enxuta + medir o custo da retomada.

### TASK-024 — Web só para testes locais, com abertura automática a partir dos terminais (standby, pós-MVP)

- **Responsável:** A definir
- **Status:** BACKLOG (em standby; código já está na dev1)
- **Prioridade:** Baixa (pós-MVP)
- **Objetivo:** a aba Web serve para ver e testar projetos locais. Quando um terminal abre algo local (um `index.html`, um servidor em `localhost`), isso aparece direto na Web do app, e o ícone **Web** do rail avisa que há algo aberto.
- **Critérios de aceite:**
  - **Aviso no rail:** quando um terminal imprime um endereço local (`http://localhost:5173`, `127.0.0.1`, `0.0.0.0`, endereço da rede local) ou abre um arquivo local, o botão Web do alternador ganha um selo; um clique abre numa aba web do projeto daquela aba. Sem repetir para o mesmo endereço.
  - **`termix-open <página ou endereço>`:** comando disponível só nos terminais do Termix (atalho no PATH da sessão) que abre direto na Web; a variável `BROWSER` da sessão aponta para ele, para servidores que a respeitam (Vite e similares) abrirem sozinhos no app.
  - **Pedir ao Claude Code:** instrução curta injetada na sessão (por `--append-system-prompt`, a confirmar com o usuário) para abrir páginas locais com `termix-open`; sem ela, `start index.html` abre no navegador do sistema (não dá para interceptar).
  - **Só local:** a Web abre apenas `localhost`, `127.0.0.1`, `[::1]`, endereços da rede local e arquivos (`file://`) do projeto; links externos abrem no navegador do sistema.
  - Abas web por projeto, DevTools, tamanho de dispositivo e a vista só criada ao usar continuam como na TASK-022.
- **Notas técnicas:** detectar endereços na saída do terminal (já passa por `pty:data`), com limpeza dos códigos de cor; `termix-open` fala com o app por um arquivo/pipe local (como os hooks) e identifica a aba pela variável de ambiente da sessão; avaliar `file://` com a política de segurança da vista (hoje só http/https); decidir se o selo vive só no alternador ou também na aba do terminal.
- **Fora de escopo:** plataformas com login (TASK-023, pós-MVP); o Claude Code controlar o navegador (MCP do Termix).
- **Decisões (usuário, 2026-10-30):** instrução injetada só nas sessões do Termix, com fallback ("se o comando existir"); status line do `settings.json` fica como está; terminais fora do app não mudam.
- **Feito até agora:** (1) `termix-open <arquivo, pasta ou endereço local>` (`src/open-wrapper.js`, atalhos `src/bin/termix-open.cmd` e `src/bin/termix-open` para o Git Bash): grava um pedido que o app lê (`pollOpens`) e abre numa aba web do projeto da aba que pediu, sem tirar o usuário do que está fazendo; (2) `sessionEnv` em `src/main.js`: só no terminal do Termix, `src/bin` entra no PATH, `BROWSER` aponta para o `termix-open.cmd` e `TERMIX_EXE` permite rodar sem Node; (3) `--append-system-prompt` por sessão pedindo ao Claude Code que use `termix-open` para páginas locais (e abra do jeito normal se o comando não existir); (4) detecção de servidores locais na saída dos terminais (`webDetect`, só conta se a porta está de fato aberta, checada por `web:probe`): selo verde no botão Web do alternador, chips na tela inicial da aba em branco e faixa "Detectado nos terminais" acima da página; (5) a Web só abre localhost, 127.x, 0.0.0.0, redes privadas e arquivos; links e endereços externos abrem no navegador do sistema; (6) `.gitattributes` para manter o script sh em LF e o `.cmd` em CRLF. Testado numa instância isolada com um Claude Code de verdade: o Claude abriu o `index.html` sozinho com `termix-open`, o servidor em 3921 foi detectado (selo e faixa), o selo some ao abrir a Web, e um endereço externo foi para o navegador do sistema.
- **Arquivos tocados:** `src/open-wrapper.js`, `src/bin/termix-open`, `src/bin/termix-open.cmd`, `src/main.js`, `src/web.js`, `src/preload.js`, `src/dock.js`, `src/dock.html`, `src/renderer/web.js`, `src/renderer/app.js`, `src/renderer/index.html`, `src/renderer/styles.css`, `package.json`, `.gitattributes`, `docs/*`.
- **Como validar:** `npm start`; abrir uma aba do Claude Code num projeto com um `index.html` e pedir "abre o index no navegador": deve abrir na aba Web (não no Chrome) e o botão Web ganha um selo verde; clicar em Web mostra a página e o selo some. Subir um servidor (`npm run dev`, `python -m http.server`): o endereço aparece como "Detectado nos terminais". Digitar um endereço externo (example.com) na barra: abre no navegador do sistema. Abrir o Claude Code num terminal comum fora do app e pedir o mesmo: abre no navegador padrão, como sempre.
- **Pendências:** o selo só aparece para o projeto aberto no momento (aviso de outro projeto não aparece até trocar para ele); `BROWSER` só funciona com ferramentas que o respeitam e sabem executar `.cmd` (a detecção na saída cobre o resto); `file://` aceita qualquer arquivo local, sem limitar à pasta do projeto; não testado com Vite/Next reais abrindo o navegador sozinhos.
- **Teste do usuário (2026-10-30), motivo do standby:** o usuário pediu a um terminal para abrir uma página local e ela abriu **no navegador normal do sistema**, não na aba Web; no app, a Web mostrou apenas a listagem de pastas de um servidor local (`http://127.0.0.1:8765/`, tipo `python -m http.server`, raiz do projeto) em vez da página pedida. Ou seja, o redirecionamento automático não cumpriu o objetivo nesse caso. Causas **não investigadas**; hipóteses: o Claude Code usou `start`/navegador padrão em vez de `termix-open` (a instrução vale só em sessões novas; uma conversa retomada pode não tê-la, e o modelo pode ignorá-la), e a aba Web foi aberta pelo servidor detectado (raiz do servidor), não pelo arquivo.
- **Decisão do usuário (2026-10-30):** deixar a função em standby e focar em outra coisa. O código continua na `dev1` (comando `termix-open`, detecção de servidores, selo no alternador, Web só local); retomar depois, começando por reproduzir o caso (qual comando o Claude usou e por que ignorou a instrução).
- **Próximo passo:** (ao retomar) reproduzir o caso do usuário, ver o que o Claude executou e ajustar; decidir se a instrução injetada basta ou se vale interceptar outra camada.

### TASK-023 — Atalhos e grupos de páginas no navegador do app (pós-MVP)

- **Responsável:** A definir
- **Status:** BACKLOG
- **Prioridade:** Baixa (pós-MVP)
- **Objetivo:** deixar à mão, dentro do app, as plataformas que o usuário usa o tempo todo (Vercel, GitHub, Supabase, pesquisa etc.) e o teste do que está sendo codado, organizados em grupos de páginas prontas, sem sair do Termix.
- **Critérios de aceite:**
  - **Grupos de páginas:** o usuário cria, renomeia, reordena e apaga grupos (ex.: "Deploy", "Pesquisa", "Banco") e guarda páginas dentro deles. Um clique abre a página numa aba nova ou leva até a aba já aberta.
  - **Dois níveis:** grupos **globais** (valem em todo projeto) e grupos **do projeto** (localhost, painel daquele projeto).
  - **Barra de atalhos** na tela Web, com os grupos e as páginas fixadas; **"salvar aba como atalho"** em um clique a partir de uma aba aberta.
  - **Sessão compartilhada:** o login vale para todos os projetos (perfil único). As abas abertas continuam por projeto.
  - **Opcional, se couber:** um grupo abrir várias páginas de uma vez ("abrir ambiente de deploy").
  - **Login funcionando (critério de entrada, ver abaixo):** conseguir entrar e pesquisar nos serviços mais usados sem ser barrado.
- **Risco principal — login e bloqueio de navegador embutido:** alguns serviços recusam login em navegadores embutidos (o do Google costuma mostrar "este navegador ou app pode não ser seguro"; o do GitHub costuma funcionar). Não dá para garantir sem testar. Plano, nesta ordem:
  1. **Teste de compatibilidade primeiro (antes de construir os grupos):** com o usuário, testar entrar em Google, GitHub, Vercel, Supabase e outros que ele usa, e pesquisar no Google/outros, e registrar o resultado numa tabela na tarefa.
  2. **Identidade de navegador comum:** remover do user agent as marcas `Electron` e `Termix` (a vista passa a se identificar como um Chrome comum). É o ajuste que mais costuma resolver.
  3. **Janelas de login (popup):** hoje `target=_blank` vira aba, mas o login "Entrar com Google/GitHub" abre uma janela que precisa falar com a página de origem (`window.opener`). Tratar esses casos abrindo uma janela filha com o mesmo perfil, só para fluxos de login.
  4. **Se o Google ainda barrar:** alternativas, em ordem de preferência: entrar nos serviços por **GitHub ou e-mail** em vez de Google (quando o serviço oferecer); usar uma **chave de acesso (passkey)**; como último recurso, abrir o serviço no navegador do sistema (sem compartilhar a sessão com o app). Pesquisa pode usar um buscador que não exige login (o próprio Google pesquisa sem login).
  5. O resultado e o que não funcionar ficam registrados em `docs/DECISOES.md`, sem prometer o que não foi testado.
- **Notas técnicas:** guardar os grupos em `settings.webGroups` (globais) e `projects[].web.groups` (do projeto), com versão dos dados; barra de atalhos como HTML da própria tela Web (acima da vista nativa, sem mudar a arquitetura da TASK-022); decidir se arrastar para reordenar entra agora ou depois.
- **Fora de escopo (futuro):** o Claude Code controlar o navegador (MCP do Termix); sincronizar atalhos entre computadores.
- **Decisão do usuário (2026-10-30):** o Termix será usado por um grupo restrito, não por todos. Fazer funcionar **para nós primeiro**; se os testes de login não forem positivos, a Web passa a servir **apenas para testes locais** (localhost e páginas do próprio projeto), sem plataformas com login.
- **Feito até agora (etapa 1):** user agent sem `Electron`/`Termix` (sessão do navegador, em `src/web.js`) e janelas abertas por `window.open` com tamanho (login "Entrar com Google/GitHub") viram janela filha com o mesmo perfil e `window.opener` preservado; links `target=_blank` continuam virando aba. Também foi tentado acrescentar a marca "Google Chrome" aos client hints pelo protocolo de depuração: **não adiantou e foi retirado** (o Google barra do mesmo jeito, com e sem o ajuste, e o ajuste atrapalharia um controle futuro do navegador).
- **Arquivos tocados:** `src/web.js`, `docs/TASKS.md`.
- **Como validar a etapa 1:** `npm start`; abrir a Web e, na barra de endereço, tentar entrar em: google.com (pesquisar e entrar na conta), github.com, vercel.com (por GitHub e por Google) e supabase.com; anotar o que entra, o que pede verificação extra e o que é barrado ("navegador não seguro"). O login deve ficar salvo ao fechar e reabrir o app.
- **Tabela de compatibilidade:** **Google (login): BARRADO** ("Esse navegador ou app pode não ser seguro"; visto pelo usuário e reproduzido numa instância isolada com e-mail inventado, com e sem o ajuste dos client hints). Pesquisa no Google sem login: a testar. GitHub ?, Vercel (por GitHub e por e-mail) ?, Supabase (por GitHub e por e-mail) ?
- **Decisão do usuário (2026-10-30):** deixar para depois do MVP; retomar com mais calma. Por ora a Web serve só para testes de projetos locais (TASK-024). Ao retomar: o login com Google é barrado no navegador embutido (ver Tabela de compatibilidade); entrar por GitHub ou e-mail; o teste em GitHub, Vercel e Supabase ficou por fazer.
- **Próximo passo:** (ao retomar) testar GitHub, Vercel e Supabase por GitHub/e-mail e só então desenhar grupos e atalhos.

### TASK-006 — Personalização de cores e temas

- **Responsável:** A definir
- **Status:** BACKLOG
- **Prioridade:** Baixa (pós-MVP)
- **Objetivo:** a pessoa escolhe o tema principal do app, com variações com preto e com branco, e tema escuro e claro para o app inteiro (moldura, barra lateral, abas, painéis, modais e terminal).
- **Notas:** centralizar as cores em variáveis CSS (`:root`, `termTheme()`); cuidar de contraste; salvar a escolha em `settings`.

### TASK-007 — Animação do fundo

- **Responsável:** A definir
- **Status:** BACKLOG
- **Prioridade:** Baixa (pós-MVP)
- **Objetivo:** movimento lento das bolhas de cor do degradê, com liga/desliga, pausa ao perder o foco e respeito a "reduzir movimento". Animar só `transform`/`opacity` e medir CPU/GPU antes.

### TASK-008 — Trocar o modo de fundo sem reiniciar

- **Responsável:** A definir
- **Status:** BACKLOG
- **Prioridade:** Baixa (pós-MVP)
- **Objetivo:** hoje trocar entre Degradê e Ofuscado reabre o app (o tipo da janela só é definido na criação) e fecha os terminais. Ideia: criar a janela nova mantendo os processos vivos no processo principal e reconstruir a tela de cada terminal a partir de um histórico recente.

### TASK-009 — Atalhos de teclado, busca no terminal e paleta de comandos

- **Responsável:** A definir
- **Status:** BACKLOG
- **Prioridade:** Média
- **Objetivo:** Ctrl+T/W/Tab/1..9, Ctrl+F no terminal, links clicáveis e paleta de comandos.

### TASK-011 — Consumo por sessão e alertas de limite

- **Responsável:** A definir
- **Status:** BACKLOG
- **Prioridade:** Média
- **Objetivo:** tokens/contexto/custo por sessão, histórico de 5h e 7d, alerta em 80%/90% e previsão de quando o limite zera.

### TASK-020 — Testar o instalador em um Windows limpo (Sandbox)

- **Responsável:** A definir
- **Status:** BACKLOG
- **Prioridade:** Média
- **Objetivo:** garantir que o instalador funcione em um computador sem nada do ambiente de desenvolvimento. Ativar o Windows Sandbox (como administrador: `Enable-WindowsOptionalFeature -Online -FeatureName Containers-DisposableClientVM -All`, exige reiniciar) e testar: instalação pelo instalador com janelas, abertura do app, aviso na aba quando não há Claude Code, atalhos e desinstalação (que mantém os dados).
- **Notas:** o Windows Sandbox não estava ativado em 2026-10-30 (virtualização presente). Fora do Sandbox já foi testado instalando em pasta temporária com PATH sem Node (TASK-010). Windows 10 não foi testado.

### TASK-013 — Gerenciar plugins, skills e MCPs pelo app

- **Responsável:** A definir
- **Status:** BACKLOG
- **Prioridade:** Baixa (pós-MVP)
- **Objetivo:** hoje a leitura é somente leitura; evoluir para editar e ativar/desativar por escopo, com aviso de "reinicie para aplicar".

## Concluídas

### TASK-001 — Código inicial do MVP do Termix (antes chamado Vitra)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA
- **Descrição:** Base do app Electron: moldura de vidro em "U", terminais (node-pty + xterm com WebGL), projetos, abas arrastáveis, importação de conversas existentes, limites 5h/7d pela status line, Degradê e Ofuscado. Importado como baseline do repositório.
- **Concluída em:** 2026-10-29

### TASK-000 — Adotar o fluxo DEV2 → DEV1 → MAIN

- **Responsável:** DEV1
- **Status:** CONCLUÍDA
- **Descrição:** Adoção do fluxo via plugin `fluxo` v1: branches `main`/`dev1`/`dev2`, `WORKFLOW.md`, seção do fluxo no `CLAUDE.md`, `docs/TASKS.md`, `docs/CHANGELOG_DEV.md` e `.claude/fluxo.json`.
- **Concluída em:** 2026-10-29

<!--
Modelo de tarefa:

### TASK-XXX — Título curto

- **Responsável:** DEV1 | DEV2 | A definir
- **Status:** BACKLOG | PRONTA | EM ANDAMENTO | AGUARDANDO VALIDAÇÃO DEV1 | VALIDADA EM DEV1 | CONCLUÍDA
- **Prioridade:** Alta | Média | Baixa
- **Objetivo:** ...
- **Critérios de aceite:**
  - ...
- **Feito até agora:** (atualizar a cada etapa; é o que permite continuar após um /clear)
- **Decisões:** ...
- **Arquivos tocados:** ...
- **Como validar:** ...
- **Pendências:** ...
- **Próximo passo:** ...
-->
