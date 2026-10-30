# TASKS — Termix

Controle de tarefas do projeto. Ao receber um pedido, o Claude localiza a tarefa aqui (ou cria uma nova entrada) antes de desenvolver.

Formato do ID: `TASK-XXX` — numeração sequencial, sem reuso, livre em todas as branches. Status e responsabilidades em `WORKFLOW.md`.

---

## Em andamento

### TASK-021 — Informações do terminal no app (substituir a status line do plugin) (MVP, prioridade agora)

- **Responsável:** DEV1
- **Status:** EM ANDAMENTO
- **Prioridade:** Alta (MVP, é a primeira a fazer)
- **Objetivo:** o Termix passa a mostrar por conta própria tudo o que a status line do plugin mostra hoje dentro do terminal (e que um dia vai sumir), no rail flutuante da base do app em vez de ficar só na parte superior (cabeçalho).
- **Critérios de aceite:**
  - Mostra, por aba/sessão: modelo (ex.: Sonnet 5.5), projeto, branch git, contexto usado (% e tokens usados/limite, ex.: `16% 159k/1M`), limite de 5 h (% e quando zera), limite de 7 d (% e quando zera), validade do cache (ex.: `59m of 1h`) e o modo de permissões (ex.: `bypass permissions on`).
  - Decidido o que fica no rail, o que fica no cabeçalho (hoje: cápsula de limites 5 h / 7 d) e o que some, sem duplicar a mesma informação nos dois lugares.
  - Os dados vêm do que o app já captura (`src/statusline-wrapper.js`: modelo, janela de contexto, limites, custo) e dos hooks; o que não vem de lá (branch, cache, modo de permissões) tem origem definida.
  - A status line original do usuário continua funcionando dentro do terminal (o wrapper repassa a entrada).
- **Feito até agora:** conversa de alinhamento. Demo visual do rail salvo em `docs/prototipos/rail-demo.html` (alternador Terminais/Web e opção de mostrar ctx · 5 h · 7 d no rail). Já captura `model`, `context_window`, `rate_limits` e `cost` por aba; o cabeçalho já mostra 5 h / 7 d.
- **Decisões:** o rail é o lugar das informações da sessão ativa (decisão do usuário, 2026-10-30); o desenho final (o que mostrar, em que ordem, o que esmaece) ainda vai ser alinhado com o usuário antes de implementar.
- **Arquivos tocados:** `docs/prototipos/rail-demo.html`, `docs/TASKS.md`, `docs/CHANGELOG_DEV.md`.
- **Como validar:** (a definir após o desenho) comparar os valores do rail com a status line do terminal da mesma aba.
- **Pendências:** definir a origem de branch, cache e modo de permissões (não vêm no JSON da status line; branch pode sair do `git` da pasta do projeto, o modo sai dos parâmetros com que a aba foi aberta, o cache precisa ser investigado). Decidir se o rail mostra tudo ou o essencial com detalhe ao passar o mouse.
- **Próximo passo:** alinhar com o usuário o desenho do rail com as informações (mockup em `docs/prototipos/`), depois implementar. A TASK-022 (alternador Terminais/Web) usa o mesmo rail e vem em seguida.

## Aguardando validação DEV1

_Nenhuma no momento._

## Validadas em DEV1

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

### TASK-022 — Rail flutuante com alternador Terminais / Web (MVP)

- **Responsável:** A definir
- **Status:** PRONTA
- **Prioridade:** Alta (MVP; depois da TASK-021, que define o conteúdo do rail)
- **Objetivo:** ver o navegador dentro do app para testar sistemas web, alternando com os terminais por um rail flutuante no centro da base do app. Só visualizar e navegar; o agente controlar o navegador fica para uma versão futura.
- **Critérios de aceite:**
  - Rail em forma de pílula, flutuando no centro da base, com os botões **Terminais** (com selo do número de abas e de atenção) e **Web**; atalho sugerido Ctrl+`.
  - A tela Web tem abas de página, voltar, avançar, recarregar, barra de URL, tamanho de dispositivo e DevTools.
  - A Web é por projeto (lembra abas e URL) e com perfil persistente, para não perder login; a vista só é criada quando a pessoa abre a Web (economiza memória).
  - O rail e os menus/modais continuam visíveis por cima da vista do navegador.
- **Notas técnicas:** usar `WebContentsView` (o `<webview>` está em desuso). A vista é nativa e fica por cima do HTML; é preciso garantir o rail, menus e modais acima dela (esconder/encolher a vista ou desenhar o rail numa vista própria por cima). Validar isso primeiro com um protótipo, numa instância isolada (`--user-data-dir` próprio) para não mexer nas abas em uso. Sessão do navegador separada da do app; pensar em limitar a `localhost` e a URLs liberadas quando o agente puder controlá-lo.
- **Fora de escopo (futuro):** o Claude Code controlar o navegador (MCP do próprio Termix via `webContents.debugger`/CDP: navegar, clicar, digitar, ler o DOM, screenshot, console e rede).
- **Demo visual:** `docs/prototipos/rail-demo.html`.
- **Pendências:** decidir se o rail esmaece quando parado e se é por projeto ou um só para o app (a inclinação é por projeto).
- **Próximo passo:** depois da TASK-021, protótipo da vista do navegador com o rail por cima.

## Backlog

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
