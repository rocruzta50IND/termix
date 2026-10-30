# TASKS — Termix

Controle de tarefas do projeto. Ao receber um pedido, o Claude localiza a tarefa aqui (ou cria uma nova entrada) antes de desenvolver.

Formato do ID: `TASK-XXX` — numeração sequencial, sem reuso, livre em todas as branches. Status e responsabilidades em `WORKFLOW.md`.

---

## Em andamento

_Nenhuma no momento._

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

### TASK-023 — Atalhos e grupos de páginas no navegador do app (MVP)

- **Responsável:** A definir
- **Status:** PRONTA
- **Prioridade:** Alta (MVP; próxima)
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
- **Próximo passo:** teste de compatibilidade de login com o usuário (itens 1 e 2) antes de desenhar a barra de atalhos.

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
