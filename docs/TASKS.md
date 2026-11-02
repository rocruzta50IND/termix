# TASKS — Termix

Controle de tarefas do projeto. Ao receber um pedido, o Claude localiza a tarefa aqui (ou cria uma nova entrada) antes de desenvolver.

Formato do ID: `TASK-XXX` — numeração sequencial, sem reuso, livre em todas as branches. Status e responsabilidades em `WORKFLOW.md`.

---

## Em andamento

_Nenhuma no momento._

## Aguardando validação DEV1

## Validadas em DEV1

### TASK-040 — Modo Chat por aba (conversa visual sobre o Claude Code)

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 (testada pelo usuário na janela de demonstração e aprovada em 2026-11-02; ajustes de visual feitos durante a revisão)
- **Prioridade:** Alta — pedido do usuário em 2026-11-02 (pausa a TASK-036)
- **Objetivo:** uma aba de chat (bolhas com Markdown) no lugar do terminal, falando com o Claude Code por `claude -p` em stream-json, sem API externa; as abas de terminal e de chat convivem; o modo vem de Configurações; as funções (Terminais, Web, Clear, Reiniciar) moram num rodapé do app.
- **Decisões (usuário, 2026-11-02):** layout aprovado em `docs/prototipos/chat-layout.html` (app como está, só a área do terminal vira chat; compositor no desenho do Claude; funções no rodapé do app; modo e visual do chat nas Configurações); ideia das baias e o layout B (app inteiro) descartados; permissões em Automático no protótipo.
- **Feito:** `src/chat.js` (processo principal: sobe `claude -p` por aba, lotes de eventos, parar, histórico do `.jsonl`), ponte no `src/preload.js` e IPC `chat:*` no `src/main.js` (encerra tudo ao fechar o app); `src/renderer/chat.js` (tela, Markdown seguro, eventos do stream, ciclo de vida, Clear/Reiniciar/exportar); `src/renderer/app.js` (aba `kind: "chat"`, "+" e menu, Configurações > Chat, etiqueta nas abas, rodapé com a base de vidro de 38 px); `src/renderer/web.js` (rodapé no lugar da janelinha flutuante); `styles.css`, `index.html`, `package.json` (check).
- **Testado (CDP, instância isolada, Claude Code real 2.1.316):** criar chat pelo "+"; mensagem com título, lista, código e leitura de arquivo (ferramenta Read ✓, texto em stream, modelo e contexto 16 %); reabrir o app com o histórico e a próxima mensagem retomando a conversa (respondeu o conteúdo do arquivo lido antes); estado Trabalhando → Aguardando você; Parar no meio (e responder de novo depois); Clear (conversa nova, nova sessão); Reiniciar; modo Perguntar negando um Bash e avisando; Fluxo e Bolhas; Configurações > Chat; aba de terminal real (Claude Code abre normalmente, rodapé igual); sem erro de JavaScript; `npm run check` passou. Defeitos achados e corrigidos: erro de ordem de carga (chat.js antes do app.js), classe `empty` colidindo com a do app, realce de código quebrando as marcas, etiquetas das abas comendo o nome.
- **Arquivos tocados:** `src/chat.js`, `src/main.js`, `src/preload.js`, `src/renderer/chat.js`, `src/renderer/app.js`, `src/renderer/web.js`, `src/renderer/index.html`, `src/renderer/styles.css`, `package.json`, `docs/DECISOES.md`, `docs/DESIGN.md`, `docs/TASKS.md`, `docs/CHANGELOG_DEV.md`, `docs/prototipos/*`.
- **Como validar:** `npm start`; o "+" já cria um Chat (Configurações > Chat muda para Terminal; o menu ao lado do "+" tem os dois). Mande uma mensagem que use uma ferramenta, pare uma resposta longa, feche e reabra o app (o histórico volta), use Clear e Reiniciar no rodapé, troque Bolhas/Fluxo e Automático/Perguntar nas Configurações.
- **Ajustes pedidos pelo usuário (2026-11-02, após ver o app):** avatar "C" trocado pela marca do Termix (e silhueta na pergunta); engrenagem do rail movida para o rodapé; rail sem fundo, só os anéis flutuando; configuração de cada anel e do rodapé na engrenagem e em Configurações > Rail e rodapé.
- **Pendências / limitações:** não há cartão de aprovação no chat (em Perguntar o `-p` só nega e avisa); o "+" de anexo e o microfone do desenho do Claude não existem; sem seletor de modelo/esforço (o modelo mostrado é o da sessão); sem limites 5 h/7 d nem cache no rail com só chats (vêm da status line do terminal); o custo da conversa não é mostrado; imagens e colagem de arquivos não testadas; uma aba não troca de modo depois de aberta; testado sem projeto no fluxo Rocruzta; o aviso de fechar o app conta chats com processo vivo; muitas abas continuam apertando os nomes (TASK-039).
- **Ajustes finais (2026-11-02):** rodapé do chat alinhado à coluna da caixa de prompt (funções à esquerda, engrenagem na ponta direita); decisão de manter os dois modos por ora (o Terminal pode sair no futuro).
- **Próximo passo:** TASK-044, TASK-045 e TASK-041 já validadas; seguem no Backlog TASK-042 (telas sem o fundo nas bordas), TASK-043 (ícone do Claude), TASK-046 (barra superior) e TASK-036 (README).
- **Validada em:** 2026-11-02. Falta promover para a `main` com `/fluxo:promover`, quando o usuário pedir (e só com a versão consolidada e o instalador testado).

### TASK-033 — Arrastar e soltar das abas dos terminais não funciona direito (CRÍTICA)

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 (aprovada pelo usuário em 2026-11-02)
- **Prioridade:** **Crítica** — pedido do usuário em 2026-11-01 ("não está funcionando direito")
- **Objetivo:** reordenar as abas dos terminais (e as da Web, que usam a mesma barra) arrastando, de forma fluida e previsível, sem perder aba, sem pular de posição e sem estragar o visual encaixado da TASK-030.
- **Sintomas:** o usuário não descreveu o defeito exato; **perguntar ou reproduzir ao iniciar** (arrasta mas não solta na posição certa? a aba some? o recorte da aba ativa fica para trás? trava com muitas abas?).
- **Base existente:** `src/renderer/app.js` (arraste por `mousedown`/`transform` nas abas, `reorderTabs`, classe `dragging`), `src/renderer/styles.css` (`#tabsRow .tab.dragging`). Suspeitas já conhecidas: o recorte da aba ativa (`fuseBar`, TASK-030) fica na posição de antes enquanto a aba ativa é arrastada (só se refaz ao soltar); o limite da barra com muitas abas encolhidas; arrastar com a aba ativa versus uma inativa.
- **Critérios de aceite (a refinar):** arrastar qualquer aba (ativa ou não) até qualquer posição e soltar sempre deixa a ordem certa, salva e refletida na tela; a aba arrastada acompanha o mouse sem pulos e o visual encaixado se mantém durante o arraste; funciona com 2, 8 e 20 abas e em janela estreita; clique simples e clique duplo continuam funcionando; testado por cliques reais (CDP) e capturas.
- **Reproduzido (2026-11-02, instância isolada com CDP e cliques reais):** a ordem final saía certa com poucas abas; os defeitos eram (1) com a aba ativa arrastada, o recorte escuro da barra ficava parado no lugar antigo (buraco na barra e aba sem a fusão com o terminal); (2) qualquer redesenho das abas no meio do arraste (aviso, estado do agente) soltava a aba do mouse; (3) a aba arrastada era translúcida e o nome da aba de baixo aparecia através; (4) **com muitas abas a barra estourava** (20 abas: 2041 px numa barra de 1000; abas além da borda inalcançáveis e botões "+" fora da tela); (5) com abas de larguras diferentes não dava para chegar à última posição (o limite do trilho usava a largura da aba arrastada).
- **Feito:** `src/renderer/app.js`: o recorte (`fuseBar(bar, dx)`) acompanha a aba ativa durante o arraste (colado ao mouse se ela é a arrastada; deslizando junto se ela abre espaço); `renderTabs` adia o redesenho enquanto arrasta (`UI.tabDragging`) e refaz ao soltar; a posição de soltar usa o centro sem o limite do trilho. `src/renderer/styles.css`: aba arrastada opaca; inativas encolhem até 34 px (só o ponto de estado) e a ativa fica com no mínimo 120 px; transição do recorte só durante o arraste.
- **Testado (CDP, cliques reais, instância isolada):** 8 abas (ativa e inativa, redesenho forçado no meio) e 20 abas (primeira→última, última→primeira, ativa, inativa), ordem certa, salva e igual à tela; clique simples ativa a aba; janela 980×620 sem estouro; capturas conferidas; `npm run check` passou. Não exercitado: clique duplo logo após arrastar, 30+ abas (a barra voltaria a estourar), abas da Web.
- **Arquivos tocados:** `src/renderer/app.js`, `src/renderer/styles.css`, `docs/DESIGN.md`, `docs/TASKS.md`, `docs/CHANGELOG_DEV.md`.
- **Como validar:** `npm start`; abra 6 ou mais terminais, arraste a aba ativa e uma inativa para o começo, o meio e o fim; abra 15 a 20 abas e confira que todas cabem (inativas só com o ponto); clique e clique duplo continuam funcionando.
- **Pendências:** as abas da **Web** (`#wtabs`) nunca tiveram arrastar (só os terminais); com mais de ~25 abas a barra estoura de novo (rolagem horizontal seria o próximo passo). Ambas vão para o Backlog se o usuário quiser.
- **Próximo passo:** TASK-036 (README).
- **Validada em:** 2026-11-02. Falta promover para a `main` com `/fluxo:promover`, quando o usuário pedir.

### TASK-035 — Atualização do app com aviso no cabeçalho (MVP)

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 (aprovada pelo usuário em 2026-11-02; o teste real com duas versões publicadas foi feito na TASK-020: Release v0.1.1, aviso, botão no cabeçalho, instalação e reabertura)
- **Prioridade:** Alta (MVP) — pedido do usuário em 2026-11-02
- **Objetivo:** avisar quem tem o app instalado que há versão nova; ao clicar, atualiza e pede/faz o reinício; se a pessoa não quiser agora, o botão **Atualizar** fica no cabeçalho.
- **Decisões (usuário, 2026-11-02):** botão no cabeçalho do app quando a pessoa adia o aviso; hospedagem no **GitHub** com o repositório público (sem token no app).
- **Feito até agora:** `src/updater.js` (novo, `electron-updater`; consulta 15 s depois de abrir e a cada 4 h, baixa em segundo plano, instala ao fechar se ignorado; desligado em `npm start`; `TERMIX_FAKE_UPDATE=1` simula); `src/main.js` e `src/preload.js` (ponte `update:*`); `src/renderer/app.js` (aviso com Depois/Atualizar agora, botão no cabeçalho, confirmação se houver agente trabalhando) e `styles.css`; `package.json` (`publish` do GitHub, script `release`, dependência). Testado por CDP em instância isolada com a simulação: o aviso aparece, "Depois" o fecha e o botão fica no cabeçalho; capturas conferidas; `npm run check` passou.
- **Arquivos tocados:** `src/updater.js`, `src/main.js`, `src/preload.js`, `src/renderer/app.js`, `src/renderer/styles.css`, `package.json`, `package-lock.json`, `docs/DECISOES.md`, `docs/TASKS.md`, `docs/CHANGELOG_DEV.md`.
- **Como validar:** `TERMIX_FAKE_UPDATE=1 npm start` (aviso depois de ~6 s; Depois; botão no cabeçalho). Real: instalar a 0.1.0, publicar a 0.1.1 com `npm run release`, abrir a 0.1.0 e esperar o aviso.
- **Pendências:** nenhuma da atualização; sem assinatura de código (SmartScreen pode avisar).
- **Próximo passo:** próximos lançamentos usam versão 0.1.2 ou maior (`npm run release`).
- **Validada em:** 2026-11-02. Falta promover para a `main` com `/fluxo:promover`, quando o usuário pedir.

### TASK-020 — Testar o instalador em um Windows limpo (Sandbox)

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 (testada no Sandbox pelo Claude e instalada pelo usuário na própria máquina em 2026-11-02)
- **Prioridade:** Média (pré-requisito da promoção para a `main`, junto da TASK-010)
- **Objetivo:** garantir que o instalador funcione em um computador sem nada do ambiente de desenvolvimento. Ativar o Windows Sandbox (como administrador: `Enable-WindowsOptionalFeature -Online -FeatureName Containers-DisposableClientVM -All`, exige reiniciar) e testar: instalação pelo instalador com janelas, abertura do app, aviso na aba quando não há Claude Code, atalhos e desinstalação (que mantém os dados).
- **Preparo conferido (2026-10-31):** o PC atende (Windows 11 Pro, virtualização ligada, 32 GB de RAM, 16 núcleos, 7,6 GB livres), mas o recurso continua desativado (não existe o WindowsSandbox.exe). **Falta um único reinício, e só depois de ativar** o recurso: PowerShell como administrador, `Enable-WindowsOptionalFeature -Online -FeatureName Containers-DisposableClientVM -All -NoRestart`, e então reiniciar o PC. Reiniciar antes de ativar não adianta.
- **Notas:** o Windows Sandbox não estava ativado em 2026-10-30 (virtualização presente). Fora do Sandbox já foi testado instalando em pasta temporária com PATH sem Node (TASK-010). Windows 10 não foi testado.
- **Feito até agora (2026-11-02):** Windows Sandbox funcionando (recurso ativo). Roteiro automático (fora do repositório, pasta da sessão) mapeia o instalador de `dist` no Sandbox, roda tudo e grava o resultado e capturas de tela (CDP) numa pasta compartilhada. Instalador recompilado (`npm run dist`, 0.1.0, com a TASK-035). Resultado em Windows limpo (sem Node e sem Claude Code): instala sem erro (código 0) em `%LOCALAPPDATA%ProgramsTermix`; `Termix.exe`, desinstalador, atalhos da área de trabalho e do menu Iniciar e registro "Termix 0.1.0" criados; app abre (5 processos, vivo depois de 15 s) na tela inicial; criar projeto abre a aba com a mensagem clara "Claude Code não foi encontrado neste computador…" e o botão "Tentar de novo" (estado "Falha ao iniciar"); desinstalar remove pasta e atalhos e **mantém** `%APPDATA%Termix`.
- **Feito (atualização e assistente, 2026-11-02):** Release **v0.1.1** publicado no GitHub (repositório público; versão do `package.json` agora 0.1.1; ativos: exe, blockmap e `latest.yml`). No Sandbox, com a 0.1.0 instalada: aviso "Nova versão 0.1.1 pronta" apareceu sozinho (~25 s depois de abrir), "Depois" deixou o botão Atualizar no cabeçalho, o clique instalou a 0.1.1 e o app reabriu sozinho (~25 s). O assistente com janelas (clicando por teclado em todas as telas) instalou e abriu o app; telas em português com o ícone novo.
- **Pendências:** Windows 10 não testado; Claude Code instalado dentro do Sandbox não testado; sem assinatura de código (SmartScreen pode avisar); o Release v0.1.1 já está público (o próximo lançamento deve usar 0.1.2 ou maior).
- **Decisões:** a atualização foi testada com um Release real (v0.1.1, repositório público); o usuário baixou o instalador do GitHub, instalou e o app abriu, com o atalho criado.
- **Arquivos tocados:** `package.json` (versão 0.1.1), `docs/TASKS.md`, `docs/CHANGELOG_DEV.md`.
- **Como validar:** baixar `Termix-Setup-0.1.1.exe` em https://github.com/rocruzta50IND/termix/releases/latest, instalar e abrir.
- **Próximo passo:** TASK-036 (README profissional) para poder divulgar o link; depois TASK-033 (arrastar das abas); promoção para a `main` só quando o usuário pedir.
- **Validada em:** 2026-11-02. Falta promover para a `main` com `/fluxo:promover`, quando o usuário pedir.

### TASK-034 — Novo ícone do app: só o `>_` sobre degradê azul (MVP)

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 (aprovada pelo usuário em 2026-11-02, com captura da barra de tarefas e do aviso)
- **Prioridade:** Alta (MVP) — pedido do usuário em 2026-11-02, antes de validar o instalador
- **Objetivo:** o ícone da barra de tarefas e das notificações do Windows deve ser só o prompt `>_` sobre um quadrado em degradê, como os ícones do próprio Windows, e não o ícone padrão do Electron.
- **Feito até agora:** `assets/icon.svg` e `assets/icon-small.svg` redesenhados (degradê azul, `>_` branco, sombra suave; sem abas e sem janela desenhada); `assets/icon.ico` e `assets/icon.png` regerados (16 a 256 px). O `Termix.exe` empacotado (`npm run dist`) carrega o ícone novo.
- **Ajuste (usuário, 2026-11-02, "ainda está do mesmo jeito" no `npm start`):** em desenvolvimento o processo é o `electron.exe`, então o Windows mostrava o nome e o átomo do Electron. `src/main.js`: fora do app instalado, cria o atalho `Termix (dev)` no menu Iniciar com ID próprio (`com.termix.app.dev`) e o ícone novo; o instalado segue com `com.termix.app` e o atalho do instalador. Conferido: o atalho é criado com o alvo e o ícone certos; **o efeito na barra de tarefas e no aviso não pôde ser visto pelo Claude** (precisa reiniciar o app e ver).
- **Decisões:** o ícone do cabeçalho do app (`logo-mark.svg`) não foi alterado.
- **Arquivos tocados:** `src/main.js`, `assets/icon.svg`, `assets/icon-small.svg`, `assets/icon.ico`, `assets/icon.png`, `docs/DESIGN.md`, `docs/TASKS.md`, `docs/CHANGELOG_DEV.md`.
- **Como validar:** conferir o ícone no `Termix.exe` de `dist\win-unpacked` e, ao instalar (TASK-020), na barra de tarefas, no atalho e numa notificação (o nome deve ser "Termix").
- **Pendências:** o app instalado (nome "Termix", sem "(dev)") só será visto no teste do instalador (TASK-020).
- **Próximo passo:** TASK-033, depois TASK-020.
- **Validada em:** 2026-11-02. Falta promover para a `main` com `/fluxo:promover`, quando o usuário pedir.

### TASK-032 — Teste geral de plugins, MCPs e skills (feito pelo Claude)

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 (aprovada pelo usuário em 2026-10-31)
- **Prioridade:** Alta, antes do teste do instalador (TASK-020) e da promoção para a `main`
- **Objetivo:** o usuário não testa a TASK-013 à mão; o Claude fez o teste geral das telas Plugins, MCPs e Skills e de Configurações > Conectores.
- **Método:** tudo numa **pasta de usuário isolada** (`USERPROFILE` próprio, com marketplace local de teste, plugins `alfa` e `beta`, um servidor MCP de verdade escrito para o teste e um projeto temporário), com a CLI real do Claude Code 2.1.316; o ambiente do usuário só foi **lido**. Parte 1: funções do `src/resources.js` chamadas direto com a CLI real. Parte 2: o app Electron isolado (CDP), com cliques reais, nas 3 larguras (1600×900, 1180×720, 980×620). Os roteiros ficaram fora do repositório (pasta temporária da sessão).
- **Relatório (passou / falhou / limitação):**
  - **Plugins (33/33 passaram):** marketplace local, lista de disponíveis (3.603 itens), instalar em escopo usuário e local, versão/escopo/ligado/skills/tokens, desligar em usuário, ligar em local sobrepondo o usuário (local vence), ligar/desligar todos aqui, atualizar (1.0.0 → 1.1.0), mudança feita pelo terminal refletida no app, remover (os dois), erros (plugin inexistente, id inválido ou perigoso, ação desconhecida, remover o que não existe), CLI ausente (`scanPlugins` e `scanMcpStatus` devolvem erro sem quebrar), marketplace inalcançável (sem rede).
  - **MCPs (arquivos e CLI):** adicionar stdio, http (com cabeçalho, que não aparece na tela) e de projeto; nome, URL e comando inválidos recusados; nome repetido recusado pela CLI; estado real (conectado, falhou); ligar/desligar por projeto conferido pela CLI (`⊘ Disabled for this project`); aprovar MCP de projeto; desligar/ligar todos; **`.claude.json` preserva campos que o app não conhece**, backup criado, sem arquivo temporário sobrando; `.claude.json` ilegível: recusa e não altera; remover (local, usuário, projeto), inexistente e conector da conta recusados. Tudo passou, exceto 3 verificações do meu primeiro roteiro que usavam um "servidor MCP" de mentira; repetidas com um servidor MCP de verdade, 3 passaram e 3 viraram a limitação 1 abaixo.
  - **Skills e comandos (32/32 passaram):** criar, listar (descrição de várias linhas vira uma), ler, salvar (acentos e dois-pontos intactos), nome repetido recusado e excluir (lixeira), para skill e comando, de usuário e de projeto; nome com `../`, escopo Plugin, excluir/salvar o que não existe: recusados.
  - **Projeto limpo (3/3 passaram):** plugins e MCPs desligados só no projeto, outro projeto continua com o plugin do usuário ligado, e a CLI confirma (0 plugins ligados, MCP do usuário `Disabled for this project`). Criado de verdade pela tela (Configurações > Conectores > Limpo > Novo projeto) e conferido; voltando a Automático, o projeto novo vem como sempre.
  - **Interface (68/68 passaram):** as 3 telas, status na tela, desligar/ligar aqui (grava só `disabledMcpServers`), Gerenciar, remover com confirmação (cancelar mantém), adicionar MCP com erro que reabre a janela sem perder o que foi digitado, instalar plugin (lista de 3.603 abre em ~1 s; digitar é instantâneo), erro em vermelho, mudança pelo terminal aparecendo sozinha (≤ 40 s), skill nova → editor → salvar → excluir, busca e filtros, entrar/sair de um MCP web, **sem rolagem horizontal nem texto vazando em 3 larguras** e janela Adicionar MCP cabendo em 980×620, nenhum erro de JavaScript no console. **Aviso de reinício com terminal vivo** (sessão real do Claude Code): aparece com o botão "Reiniciar a aba ativa", que reinicia a aba.
  - **Integridade:** `settings.json`, `installed_plugins.json` e `known_marketplaces.json` do usuário idênticos (SHA-256) ao início; no `.claude.json` real, MCPs, conectores e "desligados por projeto" idênticos. Leitura real comparada com a CLI: 5 plugins e 9 MCPs (5 conectados) iguais; 22 skills.
  - **Desempenho:** `scanFiles` com 752 skills e comandos: ~80 ms (com ~20, ~15 ms); abrir a tela Skills com 752 cartões: ~200 ms; redesenhar 9 ms; busca 32 ms por 4 teclas. Plugins reais: 2,4 s; MCPs reais: 4,9 s (em segundo plano).
- **Defeitos achados e corrigidos:**
  1. **Entrar (login) num MCP/conector nunca funcionaria:** a CLI recusa rodar `claude mcp login` sem terminal ("stdin isn't a terminal") e o app a chamava sem terminal. Agora o login roda dentro de um terminal (PTY) em `src/resources.js` (`runClaudePty`; `pty` passado por `src/main.js`), com limite de 5 min, e a mensagem mostra a causa real. Testado até o ponto em que o servidor responde (servidor inalcançável: mostra o erro real; MCP inexistente e CLI ausente: erro claro; logout segue sem terminal).
  2. **Cartão de MCP mostrava "Desligado" velho depois de ligar:** o estado vinha da leitura da CLI (que leva alguns segundos e pode estar em andamento) e vencia os arquivos. Agora os arquivos (lidos a cada 4 s) mandam no "desligado"; o "desligado" velho da CLI vira "Verificando…" até a leitura nova (`src/renderer/app.js`, `resItems`).
- **Limitações e observações (não são defeitos do app):**
  1. MCP de projeto (`.mcp.json`): em pasta ainda não confiada, o `claude mcp list` pode nem listá-lo (aparece "Sem leitura de estado") ou listá-lo como "Aguardando aprovação"; aprovar pela tela grava `enabledMcpjsonServers`, mas o efeito real depende de o Claude Code confiar na pasta (não consegui provocar o estado "Aguardando aprovação" de forma repetível).
  2. **Login com conta real não foi exercitado** (precisa de navegador e de uma conta; não mexi nos conectores reais do usuário): só foi provado que a CLI é chamada do jeito certo e que erros chegam à tela. O sucesso depende de o Claude Code devolver código 0 e nenhuma frase de falha.
  3. Pasta de projeto por caminho curto 8.3 (`GLAYON~1`) não casa com a entrada do Claude Code; o app resolve o caminho real ao gravar, a CLI chamada de fora com o caminho curto não enxerga (só afetou o meu teste).
  4. O texto do erro de um MCP no cartão é cortado em 90 caracteres (o completo aparece ao passar o mouse).
  5. `scanFiles` roda no processo principal, de forma síncrona, a cada 4 s com a tela aberta: ~80 ms com 750 skills (inofensivo no uso normal, mas é trabalho parado; trocar por `fs.watch` fica como ideia).
  6. Se a pasta Documentos do Windows não puder ser lida, o app trava na tela de abertura (`app:info` falha); só aconteceu na pasta de usuário isolada, mas vale proteger (ideia para o Backlog).
- **Arquivos tocados:** `src/resources.js`, `src/main.js`, `src/renderer/app.js`, `docs/DECISOES.md`, `docs/TASKS.md`, `docs/CHANGELOG_DEV.md`.
- **Como validar:** `npm start`; em Plugins/MCPs/Skills conferir uma mudança (desligar e ligar um MCP: o cartão deve voltar a "Verificando…" e depois ao estado certo, nunca ficar em "Desligado"); num conector que pede login, "Gerenciar… > Entrar (login)" deve abrir o navegador.
- **Pendências:** o login com conta real (limitação 2) e as ideias das limitações 5 e 6.
- **Próximo passo:** TASK-020 (instalador em Windows limpo).
- **Validada em:** 2026-10-31. Falta promover para a `main` com `/fluxo:promover`, quando o usuário pedir.

### TASK-013 — Gerenciar plugins, skills e MCPs pelo app (MVP)

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 (testada pelo Claude na TASK-032, por decisão do usuário; aprovada em 2026-10-31)
- **Prioridade:** Alta (MVP) — foco da etapa atual (decisão do usuário, 2026-10-30)
- **Objetivo:** as telas **Plugins, MCPs e Skills** mostram tudo o que o Claude Code enxerga no projeto (inclusive os conectores do claude.ai da conta, que não estão em arquivo) e permitem controlar pela tela ou pelo terminal, sem conflito com a organização do Claude Code.
- **Achados (2026-10-31):** `claude mcp list` traz todos os MCPs com o estado real (conectado, precisa de login, falhou), inclusive os conectores da conta (9 na máquina do usuário; hoje o app mostra 0), mas leva ~10 a 20 s (listar na hora e preencher o status depois); `claude plugin list --json` traz versão, escopo, ativo e avisos; `claude plugin details <nome>` traz o inventário do plugin e o custo estimado em tokens; a CLI tem `plugin enable/disable/install/uninstall/update` e `mcp add/add-json/remove/login/logout`. Não há comando para listar skills: ler os arquivos (usuário, projeto, comandos e pastas dos plugins).
- **Decisões (usuário, 2026-10-31):** controlar pela tela e também pelo terminal; o app não grava nos arquivos do Claude Code por conta própria, chama a CLI (`claude plugin …`, `claude mcp …`), para não dar conflito; o que for mudado pelo terminal continua aparecendo no app; depois de cada mudança, aviso "reinicie a aba para aplicar" com o botão de reiniciar; confirmação antes de remover.
- **Plano em etapas (cada uma validada pelo usuário antes da próxima):**
  1. **Ver tudo (só leitura):** listas completas de plugins (versão, escopo, custo), MCPs (todas as origens: conta, usuário, projeto, local e de plugins, com status real) e skills (todas as origens, com descrição); busca, filtro por escopo e por estado; atualização automática.
  2. **Controlar plugins e MCPs:** plugins (ligar, desligar, atualizar, remover); MCPs (login, logout, adicionar, remover).
  3. **Skills e o resto:** criar, editar e excluir skills de usuário e de projeto; ligar/desligar conectores da conta, se der (a confirmar se é um campo gravável).
- **Adendo — Configurações > "Conectores" (usuário, 2026-10-31):** opção para **habilitar ou desabilitar a aplicação automática de plugins, skills e MCPs** em projetos novos. Ligada: o projeto novo vem como o Claude Code monta por padrão (plugins, MCPs e skills automáticos, o que pesa nos tokens). Desligada: o projeto novo vem **limpo**, sem nenhum plugin, skill ou MCP, e a pessoa personaliza como quiser. **A verificar antes de construir:** plugins, MCPs e skills de escopo Usuário e os conectores da conta valem para todo projeto; "limpo" só se consegue sobrepondo no projeto (por exemplo `enabledPlugins` falso e MCPs desativados em `.claude/settings.json`), e isso precisa ser testado, inclusive para os conectores da conta e para as skills do usuário. Definir também se vale por projeto novo (padrão) e se dá para mudar depois por projeto.
- **Critérios de aceite:** (1) as três telas mostram o mesmo que o `/mcp`, `/plugin` e as skills do terminal, com status real e sem inventar dado; (2) toda mudança passa pela CLI do Claude Code, com confirmação antes de remover e aviso de reinício; (3) mudar pelo terminal reflete no app; (4) a opção "Conectores" cria projetos novos com ou sem tudo automático, conforme a escolha, testado de verdade com o Claude Code; (5) não mexe em arquivos do Claude Code fora da CLI, sem perder campos que o app não conhece.
- **Base existente:** `scan:resources` em `src/main.js` e `resPageHTML` em `src/renderer/app.js` (leitura simples dos arquivos); DECISOES.md ("Plugins, Skills e MCPs", hoje somente leitura).
- **Feito até agora (etapa 1, 2026-10-31):** `src/resources.js` (novo): lê pela CLI do Claude Code os plugins (`plugin list --json` + `plugin details`, com inventário e custo em tokens, em cache por versão) e o estado real dos MCPs (`mcp list`, com os conectores da conta), e pelos arquivos as skills e comandos (usuário, projeto e plugins, com descrição) e a configuração dos MCPs (escopo e origem). `src/main.js`: `scan:resources` (rápido), `scan:plugins`, `scan:mcpstatus`; `src/preload.js`; `src/renderer/app.js`: telas novas com busca, filtro de escopo e de estado, "Atualizar", total de tokens dos plugins ligados e atualização automática (arquivos 4 s, plugins 12 s, MCPs 60 s) só na lista, e último resultado guardado por projeto; `src/renderer/styles.css`; `package.json` (check inclui o módulo novo). Testado com o Claude Code real numa instância isolada: 5 plugins (custo somado ~3,3 mil tokens/sessão), 22 skills e comandos, 9 MCPs com o estado certo (5 conectados, 3 pedem login, 1 falhou), busca e filtros. Do MCP só aparece o endereço sem parâmetros ou o nome do comando.
- **Feito (etapas 2 e 3 e Conectores, 2026-10-31):** `src/resources.js` ganhou as ações (`res:do`): plugins (ligar/desligar por escopo, atualizar, remover, instalar com busca nos marketplaces, ligar/desligar todos aqui), MCPs (adicionar por `add-json` com validação, remover, login, logout, ligar/desligar por projeto, ligar/desligar todos) e skills/comandos de usuário e de projeto (criar, ler, salvar, excluir para a lixeira). Ligar/desligar MCP por projeto é a única gravação direta (campo `disabledMcpServers` no `.claude.json`, atômica, com backup diário e conferência); o resto vai pela CLI. Telas: botões nos cartões, janelas Gerenciar/Instalar/Adicionar MCP/Nova skill/editor, mensagem de resultado, aviso de reinício com botão. Configurações > Conectores (Automático/Limpo, padrão Automático) e preparo do projeto limpo ao criar projeto. Defeitos achados e corrigidos nos testes: plugins desligados em paralelo apagavam uns aos outros (agora um por vez) e o cartão mostrava o estado antigo logo após a ação (a tela espera a lista nova). Testes: 33 verificações ponta a ponta na tela (instância isolada, projeto temporário) e conferência com sessões reais do Claude Code (projeto normal: 5 plugins, 9 MCPs, 50 skills, 62 ferramentas; projeto limpo: 0 plugins seus, MCPs desligados, 29 skills, 32 ferramentas); `.claude.json` e `settings.json` do usuário conferidos intactos.
- **Arquivos tocados (etapa 1):** `src/resources.js`, `src/main.js`, `src/preload.js`, `src/renderer/app.js`, `src/renderer/styles.css`, `package.json`, `docs/DECISOES.md`, `docs/DESIGN.md`, `docs/TASKS.md`, `docs/CHANGELOG_DEV.md`.
- **Como validar (etapa 1):** `npm start`; abrir um projeto e ir a Plugins, Skills e MCPs: conferir contra `/plugin`, `/mcp` e as skills de um terminal do Claude Code (os 9 conectores da conta, com o estado de cada um); testar a busca e os filtros; mudar algo pelo terminal (por exemplo `claude plugin disable <plugin>`) e ver a tela atualizar em segundos.
- **Como validar (etapas 2 e 3 e Conectores):** `npm start`. Plugins: "Desligar aqui" num plugin e conferir no terminal (`/plugin`) que, depois de reiniciar a aba, ele não carrega; "Gerenciar…" mostra atualizar/remover (não precisa remover para testar). MCPs: "Desligar aqui" num conector e conferir no `/mcp` do terminal ("disabled for this project"); adicionar um MCP de teste e removê-lo; "Gerenciar…" num conector que pede login e entrar (abre o navegador). Skills: criar uma skill de projeto, editar, ver no terminal, excluir (confere na lixeira). Configurações > Conectores > Limpo; criar um projeto novo e abrir um terminal nele: o `/plugin` e o `/mcp` devem vir vazios/desligados. Voltar para Automático e criar outro: vem como sempre.
- **Pendências (etapas 2 e 3):** não exercitados com conta real: login/logout de conector (abre o navegador), instalar plugin de verdade, atualizar e remover plugin (o remover é destrutivo; só a janela e a confirmação foram vistas); conectores adicionados à conta depois não entram no "limpo" já feito; skills/comandos de **usuário** valem em todo projeto (limite do Claude Code); com uma ação em andamento a tela não aceita outra (mostra "…"); o app não desliga skills de plugin individualmente.
- **Pendências (etapa 1):** a leitura de skills não conhece skills de MCP nem as embutidas do Claude Code; plugins instalados só em outro projeto não aparecem; o estado dos MCPs de projeto (`.mcp.json`) pendentes de aprovação aparece como "Aguardando aprovação" (conferir com um projeto real); sem controle ainda (etapa 2).
- **Próximo passo:** TASK-020 (instalador em Windows limpo) e a promoção para a `main`, quando o usuário pedir.
- **Validada em:** 2026-10-31 (teste geral da TASK-032 aprovado pelo usuário; login com conta real segue nas Pendências). Falta promover para a `main` com `/fluxo:promover`, quando o usuário pedir.

### TASK-030 — Abas encaixadas na janela do terminal, como no Terminal do Windows (MVP)

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 (aprovada pelo usuário em 2026-10-31)
- **Prioridade:** Alta (MVP) — pedido do usuário em 2026-10-30
- **Objetivo:** a aba ativa deve ficar **perfeitamente encaixada** na janela do terminal, como no Terminal do Windows, para dar um visual melhor.
- **Como está (captura do usuário):** as abas parecem cartões soltos, com cantos arredondados nos quatro lados e um vão entre a base da aba e a linha verde do terminal; a ativa não se funde com o conteúdo.
- **Como deve ficar (referência: Terminal do Windows):** a aba ativa tem a mesma cor do terminal abaixo e se liga a ele sem emenda (sem linha entre os dois), com cantos de baixo curvados para fora ("orelhas") que encostam na linha do conteúdo; as inativas ficam mais discretas, coladas na barra, com separador fino; botões "+" e de menu alinhados à barra.
- **Critérios de aceite (a refinar ao retomar):** sem vão nem linha entre a aba ativa e o terminal; mantém a cor própria de cada aba (linha de cima com a cor da aba ativa, DESIGN.md), o selo de aviso, o estado (ponto) e o fechar; arrastar e soltar para reordenar continua; funciona com abas demais (rolagem/encolhimento) e com a janela estreita; sem perder desempenho.
- **Adendo — cor (usuário, 2026-10-30):** todo terminal novo abre com a **cor principal do sistema (azul)**, em vez de uma cor diferente por aba; a pessoa ainda pode mudar a cor da aba depois (clique duplo / menu). Hoje a cor inicial sai de uma lista rotativa (`COLORS` em `src/renderer/app.js`). Vale também para as abas importadas e duplicadas; as abas já salvas mantêm a cor que têm.
- **Base existente:** `renderTabs()` em `src/renderer/app.js` e o estilo das abas em `src/renderer/styles.css`; `docs/DESIGN.md` (abas coladas no terminal, estilo Windows Terminal) e as capturas do usuário (a atual e a do Terminal do Windows).
- **Feito até agora (2026-10-31):** leitura do CSS (`.tabsbar`, `.tab`, `.sess` com borda de cima na cor da aba) e do `renderTabs`. Protótipo em `docs/prototipos/abas-encaixadas.html`: aba ativa na mesma cor do terminal (sem linha entre os dois), com orelhas curvas e linha de cima na cor da aba; inativas transparentes, com separador fino; versão em janela estreita.
- **Feito (2026-10-31, desenho aprovado no protótipo):** `src/renderer/styles.css`: aba ativa com a cor do terminal (`--tab-a` calculado a partir de `--term-op` e da barra) e orelhas curvas, sem linha entre as duas; linha de 2 px da cor da aba no topo (`.tl`), que pulsa quando o agente trabalha (saiu o pulso da borda do terminal); inativas transparentes com separador fino; `.sess` sem borda de cima. `src/renderer/app.js`: `renderTabs` com a linha `.tl`, `DEFAULT_COLOR` (azul `#5B9DFF`) para aba nova, importada e duplicada (as salvas mantêm a cor). A aba da Web usa a mesma classe e herda o visual. Testado por CDP em instância isolada (4 abas): cor da ativa 0,80 de alpha sobre a barra, equivalente ao terminal, orelhas e linha presentes, captura conferida; `npm run check` passou.
- **Arquivos tocados:** `src/renderer/styles.css`, `src/renderer/app.js`, `docs/DESIGN.md`, `docs/TASKS.md`, `docs/CHANGELOG_DEV.md`, `docs/prototipos/abas-encaixadas.html`.
- **Como validar:** `npm start`; olhar as abas (ativa fundida ao terminal, sem vão, linha de cor no topo), clicar entre abas, arrastar para reordenar, fechar, mudar a cor pelo clique duplo, abrir várias abas e estreitar a janela, deixar o agente trabalhando (a linha do topo pulsa), conferir a aba da Web; criar uma aba nova (nasce azul).
- **Pendências:** testado só com abas sem terminal vivo (sem sessão real do Claude Code); o contraste entre a barra e o terminal depende do fundo e da opacidade do terminal (Configurações); arrastar, muitas abas e janela estreita não foram exercitados.
- **Ajuste final (usuário, 2026-10-31, com capturas):** a aba ativa ainda parecia solta e o terminal deixava um espaço; pedido: tudo colado e rente, como o Terminal do Windows, com **separação nítida** entre as abas. Feito: barra mais escura que o terminal e aba ativa só com a cor do terminal (fusão sem emenda, formato visível), orelhas corrigidas nas abas que não são a primeira (a orelha esquerda saía do lugar por causa do separador), separador mais nítido e barra com margem esquerda menor; vale para a Web. Testado por CDP (instância isolada) com 4 a 8 abas, nas larguras 1280 e 980, na aba da Web e sem erro de JavaScript; arrastar para reordenar não foi exercitado (o recorte é refeito ao soltar).
- **2º ajuste (usuário, 2026-10-31, nova captura):** ainda sobrava uma faixa de fundo acima e ao lado das abas (margem de 6 px no topo e 8 px à esquerda); pedido: as abas rentes ao container (a "tela") dos terminais. Feito: a barra perdeu a margem de cima (altura 36 px, a aba toca o topo do container, que já recorta os cantos), a margem esquerda ficou em 10 px (fora da curva do canto) e a faixa escura ficou mais discreta (45 %). Conferido por CDP nos terminais e na Web.
- **3º ajuste (usuário, 2026-10-31, nova captura):** a primeira aba começava com a ponta quadrada, 10 px para dentro do canto arredondado. Feito: a barra encosta também na lateral esquerda (sem margem), e o container recorta a aba e a linha colorida do topo pela curva do canto; o texto da primeira aba ganhou 18 px de folga.
- **4º ajuste (usuário, 2026-11-01, nova captura):** tirar a linha colorida do topo da aba; a cor da aba passa a valer para a **aba inteira, em degradê** (forte no canto de cima, some até a base; na ativa termina exatamente na cor do terminal, então a fusão continua sem emenda; as inativas levam um tom bem leve). Sem a linha, o "agente trabalhando" passou a ser mostrado pelo **ponto de estado da aba ativa pulsando**. O arrastar das abas virou a TASK-033 (crítica).
- **Arquivos tocados (ajuste):** `src/renderer/styles.css`, `src/renderer/app.js` (`fuseBar`), `src/renderer/web.js`, `docs/DESIGN.md`, `docs/TASKS.md`, `docs/CHANGELOG_DEV.md`.
- **Próximo passo:** TASK-020 (instalador em Windows limpo).
- **Validada em:** 2026-10-31 (o usuário aprovou). Falta promover para a `main` com `/fluxo:promover`, quando o usuário pedir.

### TASK-029 — Notificações bem encaixadas no app, com o cache como função principal (MVP)

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 (aprovada pelo usuário em 2026-10-31 sem teste manual; testada só pelo Claude em instância isolada)
- **Prioridade:** Alta (MVP) — pedido do usuário em 2026-10-30, para depois da TASK-013
- **Objetivo:** avaliar e refazer a parte de notificações para ela ser útil de verdade e ficar perfeitamente encaixada no app. Hoje o painel só acumula avisos ("terminou", "precisa de você", "erro") e o contador do sino não zera.
- **Pedidos do usuário (2026-10-30):**
  - **Contador:** ao abrir a tela de notificações e fechá-la, o indicador do sino volta a **0 (some)**, porque a pessoa já viu o que havia lá.
  - **Cache como função principal:** relacionar as notificações com o **cache dos terminais**; quando um terminal chegar a **10 minutos** (do cache esfriar, a confirmar a leitura), a notificação aparece.
  - **Terminal trabalhando não notifica:** enquanto o terminal está trabalhando, não aparece nada dele.
  - **Terminal que terminou:** aparece uma **tooltip animada ao lado esquerdo do ícone de notificações**, mostrando rápido a ação daquele momento; para ver mais detalhes, clica no ícone e abre a telinha lateral.
  - **Controle total:** configurar (o que notificar, tempos, som, tooltip) e excluir (uma, várias, limpar tudo) as notificações.
- **A avaliar (observado na captura do usuário):** o painel mostra só o nome da aba e "há X min", sem a mensagem do evento (texto cortado nos cartões); 16 avisos seguidos de "Coder"/"Brain" sem dizer o que aconteceu. Pensar em agrupar por aba, tipo (terminou, precisa de você, erro, cache) e limite de histórico.
- **Perguntas ao retomar:** o aviso de cache é "faltam 10 min para esfriar" ou "esfriou há 10 min"? Vale para o TTL de 1 h e o de 5 min (neste, 10 min não cabe)? O som e a notificação do Windows seguem as mesmas regras? O que continua sendo avisado além do cache?
- **Base existente:** `notifyTab()` em `src/renderer/app.js` (painel, selo da aba, notificação do Windows, ícone piscando), TASK-004, e o cache do rail (`prompt_cache`, TASK-021).
- **Critérios de aceite (propostos e aprovados pelo usuário em 2026-10-31, "pode implementar"):** (1) abrir e fechar o painel zera o selo do sino; (2) terminal trabalhando não notifica; (3) terminou: dica animada ao lado esquerdo do sino, clique abre o painel; (4) cache esfriando como tipo principal, um aviso por ciclo; (5) painel agrupado por aba, texto inteiro, tipo e limite de histórico; (6) configuração de tipos, tempos, som, dica e Windows, e exclusão de um, de uma aba ou de todos. As 4 perguntas ficaram sem resposta explícita; usei as recomendações (cache 10 min antes no TTL de 1 h e 1 min antes no de 5 min; mesmas regras para som e Windows; dica só para aba fora de vista).
- **Feito até agora (2026-10-31):** `src/renderer/app.js`: `notifyTab` com tipos configuráveis, regra de terminal trabalhando, dica (`showToast`), som (`beep`) e aviso de cache (`checkCache`, a cada 10 s, uma vez por `expires_at`; apagado ao enviar mensagem); selo só conta avisos novos (`seen`); painel agrupado com excluir/limpar; Configurações > Notificações (`settings.notif`, v1). `src/hook-wrapper.js` passou a gravar o texto final do agente (`last_assistant_message`, 600 caracteres) para a dica mostrar o que foi feito. `src/renderer/styles.css`. Testado por CDP numa instância isolada (abas falsas em memória): selo 5 → 0 após abrir e fechar, dica com o texto resumido e posição ao lado do sino, terminal trabalhando sem aviso, cache de 1 h (9 min, uma vez só) e de 5 min (só com ≤ 1 min), exclusão de um/de uma aba/de tudo, ajuste dos minutos nas Configurações; capturas conferidas.
- **Arquivos tocados:** `src/renderer/app.js`, `src/renderer/styles.css`, `src/hook-wrapper.js`, `docs/DECISOES.md`, `docs/DESIGN.md`, `docs/TASKS.md`.
- **Como validar:** `npm start`; abrir dois terminais do Claude Code, pedir algo curto no segundo e ficar no primeiro: ao terminar, a dica aparece à esquerda do sino com o resumo, o selo conta 1, e abrir e fechar o painel zera. Com o terminal parado, o aviso de cache aparece quando faltarem 10 min (para testar rápido, baixe o valor em Configurações > Notificações para 55 logo depois de uma resposta). Terminal trabalhando não gera aviso. Excluir um aviso, os de uma aba e tudo; desligar tipos, dica, som e Windows.
- **Pendências:** o som e a notificação do Windows não foram ouvidos/vistos de verdade (só a lógica); o texto da dica depende de a versão do Claude Code enviar `last_assistant_message` no hook Stop (senão mostra "Terminou · aguarda você"; não conferido com sessão real); os avisos do painel não persistem ao fechar o app; o cache estimado pelo histórico também avisa.
- **Próximo passo:** TASK-030.
- **Validada em:** 2026-10-31 (o usuário aprovou sem testar à mão, confiando no teste do Claude; o teste real de som, notificação do Windows e texto da dica com sessão real do Claude Code segue nas Pendências). Falta promover para a `main` com `/fluxo:promover`, quando o usuário pedir.


### TASK-031 — Auditoria de UI/UX e desempenho do app inteiro (MVP)

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 (testada pelo Claude, por decisão do usuário em 2026-10-31)
- **Prioridade:** Alta (MVP)
- **Objetivo:** varrer o app inteiro atrás de elementos que não combinam com a estética, consertar e medir o desempenho. Quem testa tudo é o Claude (CDP numa instância isolada, capturando só o conteúdo do app).
- **Pedido do usuário (2026-10-31):** campos fora de alinhamento, pequenos e não responsivos, com cara dos anos 2000. Casos das capturas: campo numérico do Clear com setinhas nativas; campo "Nome do projeto" minúsculo.
- **Método:** roteiro automático (instância isolada com 2 terminais) que abre 20 telas e janelas (Terminais, Plugins, Skills, MCPs, Consumo, Integrações, Configurações em 3 trechos, Web, notificações, limites, menu "+", e as janelas Novo projeto, Instalar plugin, Adicionar MCP em duas formas, Nova skill, Gerenciar plugin e Renomear aba) em **3 larguras** (1600×900, 1180×720 e o mínimo 980×620), captura cada uma e varre o DOM atrás de controles nativos, campos estreitos ou baixos, texto transbordando, rolagem horizontal, janela fora da tela e alturas diferentes na mesma linha. Capturas e achados em arquivos do roteiro (fora do repositório).
- **Achados (antes):** (1) duas regras `.inp` conflitantes (a das Configurações, 72 px, vencia a das janelas: o campo minúsculo); (2) campo numérico nativo (Clear); (3) controle deslizante nativo (opacidade); (4) 7 `select` com aparência nativa nas janelas; (5) janela Adicionar MCP estourava a altura em 980×620 (título e botões fora da tela); (6) alturas de botões, campos e alternadores diferentes entre si (28 a 40 px); (7) barra de ferramentas de Plugins/MCPs/Skills quebrava em três linhas soltas; (8) linhas das Configurações sem quebra em janela estreita e áreas de texto de largura fixa; (9) caixas de marcar nativas (importar conversas); (10) selo do sino cobrindo o ícone; (11) sem anel de foco por teclado; (12) duas definições da barra de rolagem; (13) barra de progresso com raio diferente do resto.
- **Feito:** padrão único dos controles em `src/renderer/styles.css` (ver `docs/DESIGN.md`): alturas 36/32 px, campo, `select` com seta própria, campo numérico com − e + (`.numf`, com setas do teclado), deslizante e caixa de marcar próprios, foco visível, linhas das Configurações responsivas (consulta de contêiner), janelas com altura limitada e rodapé fixo, selo do sino ajustado, barra de ferramentas reorganizada (busca e filtros numa linha; ações e "Atualizar" na outra). `src/renderer/app.js`: campo numérico do Clear, preenchimento do deslizante, barra de ferramentas.
- **Resultado (depois):** a varredura não encontra mais controle nativo, campo estreito (fora o do número, de propósito), janela fora da tela nem rolagem horizontal nas 3 larguras; as capturas "antes" e "depois" mostram o alinhamento das linhas, o campo numérico novo, as listas de seleção e a janela de MCP com rodapé fixo.
- **Desempenho (medido, 3 rodadas alternadas de cada versão, 3 terminais abertos, mediana):** abertura 1,85 s → 1,88 s; CPU do app parado 1,9 % → 2,0 % de um núcleo; memória do app (5 processos) 702 MB → 699 MB (os terminais do Claude à parte: ~650 MB, são processos do Claude Code); trabalho do renderer parado 0,18 % → 0,19 %; desenhar telas 0,2 a 1,9 ms (Plugins 0,27 → 0,22, Skills 0,45 → 0,37, Configurações 0,24 → 0,17, tudo 1,88 → 1,44); trocar de aba 37 ms → 33 ms (pior 61 → 50 ms); trocar de tela 5,6 ms → 5,7 ms. **Conclusão:** as mudanças foram visuais e não pioraram nada; o app já é leve (sem desperdício de renderização; os temporizadores do renderer deduplicam o trabalho). Uma rodada isolada do código antigo mediu 30 s numa troca de aba: foi o Windows limitando temporizadores de uma janela oculta (artefato da medição), não do app.
- **Arquivos tocados:** `src/renderer/styles.css`, `src/renderer/app.js`, `docs/DESIGN.md`, `docs/TASKS.md`, `docs/CHANGELOG_DEV.md`.
- **Como validar:** `npm start`; Configurações (campo numérico com − e +, deslizante, linhas alinhadas, estreitar a janela), as janelas Novo projeto, Adicionar MCP e Nova skill (campos largos, listas escuras, janela baixa com botões sempre visíveis), Plugins/MCPs (barra de ferramentas em duas linhas).
- **Pendências / ideias (Backlog se o usuário quiser):** os pesquisadores de arquivos de métricas e hooks do processo principal rodam por `setInterval` (300 ms e 1,5 s): trocar por `fs.watch` reduziria o uso parado, mas o ganho medido seria de ~1 % de um núcleo; não medi o app com dezenas de abas nem por horas (vazamento de memória); o visual das abas (TASK-030) e das notificações (TASK-029) ficam nas suas tarefas.
- **Validada em:** 2026-10-31 (testes e capturas feitos pelo Claude). Falta promover para a `main` com `/fluxo:promover`, quando o usuário pedir.

### TASK-028 — Medir o custo da retomada e novos gatilhos do botão Clear (só no app)

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 (etapa 2; as candidatas seguem em aberto, sem data)
- **Prioridade:** Média (continuação da TASK-027)
- **Objetivo:** provar com números o ganho da retomada enxuta e deixar o botão Clear mais esperto, só com configuração dentro do app (o fluxo Rocruzta não será alterado).
- **Etapa 2 — medir o custo:** guardar o CTX antes do `/clear`, logo depois da retomada e ao fim da primeira resposta; mostrar "a retomada custou X mil tokens" e a "base da sessão" (CTX antes do primeiro pedido: CLAUDE.md, plugins, skills).
- **Candidatas:** aviso "pronto para limpar" quando o fechamento termina; pulso também com cache frio e contexto grande (limpar sai mais barato que reescrever); modo "tarefa pequena" (alerta 15 %) e "tarefa longa" (35 %) por aba ou projeto, trocável no botão; mostrar plugins/skills/MCPs ativos e o peso estimado (liga com a TASK-013); registro de consumo e ritmo (TASK-026).
- **Feito até agora (etapa 2, 2026-10-30):** `src/renderer/app.js`: no Clear com retomada, o app guarda o contexto em tokens antes do `/clear` (soma do `current_usage`, mais exata que o `used_percentage`, que vem inteiro), a **base** da conversa nova (última leitura da status line depois do `SessionStart` e antes do pedido de retomada) e o contexto no fim da primeira resposta (2,5 s depois do `Stop`). Ao fim, um evento no painel diz "A retomada custou ~X tokens · base A → B · antes do /clear C", e o tooltip do anel CTX mostra a base e o custo da última retomada. Sem leitura da base (a status line pode não atualizar logo após o `/clear`), mostra só "contexto depois da retomada". "Só limpar" não mede.
- **Ajuste pedido (2026-10-30):** o botão de reiniciar o chat saiu do cabeçalho e foi para o alternador de baixo, só o ícone, ao lado do Clear (`src/dock.js`, `src/dock.html`, `src/renderer/web.js`, `src/renderer/app.js`). Mesmo comportamento: reinicia com a conversa atual, vira "Retomar a conversa" com a sessão encerrada e "Tentar de novo" na falha; gira enquanto reinicia. Depois do teste, ganhou o texto "Reiniciar" (como o Clear, para não parecer vazio; só ícones fica para reavaliar) e o aviso ⚠ de "dangerously" saiu da aba, pois a etiqueta "⚠ bypass" do rail de baixo já mostra.
- **Arquivos tocados:** `src/renderer/app.js`, `src/renderer/web.js`, `src/dock.js`, `src/dock.html`, `docs/DECISOES.md`, `docs/DESIGN.md`, `docs/TASKS.md`, `docs/CHANGELOG_DEV.md`.
- **Como validar:** `npm start`; num terminal do Claude Code, usar Clear > "Fechar a tarefa e limpar". Ao fim da primeira resposta da conversa nova deve aparecer o evento com o custo da retomada (painel de eventos) e o tooltip do CTX deve mostrar base e custo.
- **Pendências:** as candidatas acima (aviso "pronto para limpar", pulso com cache frio, modos de tarefa pequena/longa, plugins ativos e peso) ficam para depois; o foco passou para a TASK-013.
- **Próximo passo:** TASK-013 (plugins, skills e MCPs no app, agora MVP).
- **Validada em:** 2026-10-30 (o usuário testou: o custo da retomada funciona; o botão de reiniciar no alternador foi aceito para fechar). Falta promover para a `main` só com a versão consolidada (instalador testado).

### TASK-025 — Botão Clear no alternador de baixo (MVP)

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1
- **Prioridade:** Alta (MVP)
- **Objetivo:** um botão **Clear** no alternador, ao lado de Terminais, que limpa o contexto do terminal ativo sem perder o fio: fecha a tarefa em arquivo, manda `/clear` e pede para retomar pelos arquivos do projeto (ideia do guia de economia de tokens do pacote `economia-tokens-pacote.zip`, que o app reproduz por dentro).
- **Decisões (usuário, 2026-10-30):** só o Clear por enquanto (Compact, Interromper e outras ações ficam fora; dificilmente serão usadas); o limite de contexto que faz o botão **pulsar** é configurável (exemplo dado: 15 %); o modelo é escolha da pessoa, o app não se envolve; as configurações ficam só dentro do app. Decisões minhas, sem objeção até aqui: um único botão que abre uma confirmação com duas saídas (**Só limpar** e **Fechar a tarefa e limpar**); o botão só vale com o agente aguardando; o rótulo "Clear" fica visível (a dica nativa não aparece na vista do alternador).
- **Feito até agora:** botão "Clear" na pílula do alternador (só na tela Terminais, junto de um separador), desabilitado sem terminal vivo e aguardando, com pulso âmbar quando o CTX do terminal ativo chega ao limite configurado; a largura do alternador cresce com o botão. Fluxo em `src/renderer/app.js` (`clearFlow`): confirmação → "Fechar a tarefa e limpar" envia o pedido de fechamento, espera o agente terminar (estado vindo dos hooks, conferido a cada 700 ms), confere se o terminal mostra o aviso final `TERMIX-CLEAR-OK` (senão pergunta se limpa mesmo assim) → envia `/clear` → ao chegar o hook `SessionStart` com `source: clear`, envia o pedido de retomada na conversa nova. "Só limpar" envia só o `/clear`. Travas: sem resposta do agente em 10 s o fluxo é cancelado; sem o `SessionStart` em 12 s também. Configurações > "Botão Clear": limite de contexto (0 desliga), texto do pedido de fechamento, texto do pedido de retomada e "Restaurar" (guardados em `settings.clear`). Os textos padrão são genéricos (procuram `docs/TASKS.md` ou `docs/HISTORICO-TAREFAS.md`, não fazem commit) e podem ser trocados por `/encerrar-tarefa` e `/retomar` neste projeto. Testado numa instância isolada: o app carrega, a página de Configurações e o botão (com pulso) aparecem certos; **o fluxo completo com um Claude Code de verdade ainda não foi exercitado**.
- **Ajustes após o 1º teste do usuário (2026-10-30):** o botão funcionou; (1) o alternador sumia ao abrir o menu da engrenagem do rail (agora só some com modal ou outros menus); (2) ícone do Clear trocado (círculo com X); (3) o `/clear` deixava o texto antigo na tela: ao chegar o `SessionStart` com `source: clear`, o app apaga a tela e o histórico visível e manda Ctrl+L para o Claude Code redesenhar; (4) Ctrl+C (copia com texto selecionado; sem seleção segue sendo o Ctrl+C do terminal) e Ctrl+V (cola; sem texto, como imagem, passa o Ctrl+V ao Claude Code) passaram a funcionar nos terminais, pela área de transferência do Electron (`clip:read`/`clip:write`).
- **Arquivos tocados:** `src/main.js`, `src/preload.js`, `src/renderer/app.js`, `src/renderer/web.js`, `src/renderer/styles.css`, `src/dock.js`, `src/dock.html`, `docs/DECISOES.md`, `docs/DESIGN.md`, `docs/TASKS.md`, `docs/CHANGELOG_DEV.md`.
- **Como validar:** `npm start`; abrir um terminal do Claude Code, mandar uma mensagem e esperar terminar. (1) O botão Clear fica habilitado; durante uma resposta, desabilitado. (2) Clicar: aparece a confirmação; "Só limpar" deve limpar a conversa; "Fechar a tarefa e limpar" deve registrar a tarefa, limpar e o agente retomar sozinho. (3) Em Configurações > Botão Clear, baixar o limite para 1: o botão pulsa quando o CTX passa disso; 0 desliga o pulso. (4) Trocar os textos por `/encerrar-tarefa` e `/retomar` e repetir (o app deve perguntar antes de limpar, pois o aviso final não aparece).
- **Pendências:** testar o fluxo completo com um Claude Code real (inclusive o `/clear` digitado pelo menu de comandos e o retomar na conversa nova); o aviso final `TERMIX-CLEAR-OK` depende de o agente obedecer; o botão age só na aba ativa do projeto atual; sem atalho de teclado (TASK-009).
- **Validada em:** 2026-10-30 (o usuário testou e aprovou: o botão funcionou, o /clear limpa a tela e o Ctrl+C/Ctrl+V funcionam). Falta promover para a `main` com `/fluxo:promover`, quando o usuário pedir.

### TASK-027 — Controle de contexto sob medida para o fluxo Rocruzta (só no app)

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 (etapa 1; a etapa 2 e as candidatas seguem na TASK-028)
- **Prioridade:** Alta (reflete direto no gasto de tokens)
- **Objetivo:** o fluxo Rocruzta é iniciado em todo projeto; o Termix deve fechar, limpar e retomar com o mínimo de tokens nesse fluxo, **só com configuração dentro do app**. O fluxo e o plugin não serão alterados (decisão do usuário; o dono já foi avisado).
- **Achados da análise (2026-10-30):** (1) o plugin `fluxo` não traz `/retomar` nem `/encerrar-tarefa` (são deste repositório); (2) o fluxo manda ler `CLAUDE.md`, `WORKFLOW.md` e `docs/TASKS.md` inteiros a cada tarefa; aqui o `TASKS.md` tem ~48 KB (≈ 14 mil tokens) e o `/retomar` custa ≈ 21 a 27 mil tokens antes de qualquer trabalho; (3) a retomada só precisa das seções *Em andamento* e *Aguardando* e da última entrada do changelog (≈ 4 mil tokens); (4) o hook `SessionStart` do plugin já injeta papel, branch, validação e nomes das tarefas ativas; (5) o app já recebe do Claude Code o contexto, o cache e o fim de cada resposta.
- **Etapa 1 — retomada enxuta (feita):** o app detecta o projeto no fluxo (`.claude/fluxo.json`) e lê o papel e a branch de `CLAUDE.local.md` (`flow:info` em `src/main.js`). Nesses projetos, o botão Clear usa pedidos próprios: **retomar** lê `CLAUDE.md` e `CLAUDE.local.md`, só as seções ativas do `TASKS.md` (busca por títulos + leitura com offset/limite), só a última entrada do changelog, `DECISOES`/`DESIGN` só se a tarefa pedir, `git status`/`log`, respeita a trava de contexto do DEV1 e, para devs auxiliares, confere se a dev1 tem novidades; **fechar** confirma aprovação, roda a validação do `fluxo.json`, edita só a entrada da tarefa ativa (status certo para o papel), acrescenta o changelog, registra o que ficou fora do escopo no Backlog, reescreve o HANDOFF (devs auxiliares), faz commit e push só na branch do papel (nunca promove) e termina com o aviso `TERMIX-CLEAR-OK`. GERENTE (somente leitura) só pode "Só limpar". Fora do fluxo, ou com a opção desligada, valem os textos genéricos. Em Configurações > Botão Clear: "Usar o fluxo Rocruzta nos projetos que o têm" (padrão Sim), "Commit e push ao fechar" (padrão Sim) e os dois textos, agora **vazios = automático** (o que a pessoa escrever vale sempre; textos genéricos salvos na versão anterior voltam a automático). Testado numa instância isolada: a detecção, o papel/branch/validação lidos e os textos gerados para o Termix e para uma pasta fora do fluxo; **o ciclo completo com um Claude Code real ainda não foi exercitado** (nem o ganho de tokens medido).
- **Arquivos tocados:** `src/main.js`, `src/preload.js`, `src/renderer/app.js`, `docs/DECISOES.md`, `docs/TASKS.md`, `docs/CHANGELOG_DEV.md`.
- **Como validar:** `npm start`; num terminal do Claude Code neste projeto (que está no fluxo), usar Clear > "Fechar a tarefa e limpar" depois de aprovar um trabalho pequeno: o agente deve validar, registrar só a tarefa ativa, fazer commit/push na `dev1` e escrever o aviso; o app limpa e o agente responde um resumo curto lendo só o necessário (conferir no CTX quanto a retomada custou). Num projeto fora do fluxo, o texto genérico. Em Configurações, desligar o fluxo e conferir que volta ao genérico.
- **Pendências:** o ganho de tokens ainda é estimado (a medição é a TASK-028); o modo GERENTE não foi exercitado.
- **Validada em:** 2026-10-30 (o usuário testou: "aparentemente funcionou perfeitamente"). Falta promover para a `main` com `/fluxo:promover`, quando o usuário pedir.

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
- **Pendências:** é a última tarefa do MVP; teste em Windows limpo (TASK-020, pré-requisito para promover à `main`); Windows 10 (o fundo "Ofuscado" depende do Windows 11). Não feito: assinatura do código e atualização automática.
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

### TASK-047 — Controles do chat (modo, estilo, permissão) à mão na tela e fim do texto "Aguardando você"

- **Responsável:** DEV1
- **Status:** BACKLOG
- **Prioridade:** Média — pedido do usuário em 2026-11-02, com captura do chat
- **Objetivo:** hoje, para trocar de Chat para Terminal, de Bolhas para Fluxo ou de Automático para Perguntar, é preciso ir a Configurações > Chat (e o modo da aba só pelo menu da aba, TASK-044). Colocar esses controles **em algum canto da própria tela do chat**, à mão.
- **Pedido adicional (mesma captura):** na barra de cima da aba, tirar o texto **"Aguardando você"** e manter só a **bolinha de estado** (a aba já mostra o mesmo estado com a bolinha); o texto pode virar dica ao passar o mouse.
- **A decidir com o usuário ao começar:** onde ficam os controles (menu na linha do modelo/permissão abaixo da caixa, no canto direito da barra de abas no lugar do texto de estado, ou na engrenagem do rodapé); quais entram (Chat ↔ Terminal da aba aberta, Bolhas ↔ Fluxo, Automático ↔ Perguntar da aba, talvez o modo das abas novas); se valem para a aba ou para todas.
- **Critérios de aceite (a refinar):** trocar modo/estilo/permissão sem abrir Configurações; o texto de estado some e a bolinha continua com a dica; vale para terminal e Web (o texto "Aguardando você" aparece nas duas barras); sem quebrar o layout em janela estreita; testado com o Claude Code real; documentar em `docs/DECISOES.md` e `docs/DESIGN.md`.
- **Base existente:** `switchMode` e `renderTabMenu` (`src/renderer/app.js`), `.state` na barra de abas (`renderTabs`), `chatCfg`/Configurações > Chat, `.c-perm` e `.c-mdl` em `src/renderer/chat.js`, `docs/DESIGN.md`.

### TASK-046 — Barra superior: sino centralizado e botões da janela mais elegantes

- **Responsável:** DEV1
- **Status:** BACKLOG
- **Prioridade:** Média (visual) — pedido do usuário em 2026-11-02, com duas capturas
- **Objetivo:** (1) o ícone do **sino** de notificações não está centralizado dentro do botão redondo (o desenho do sino fica deslocado em relação ao círculo); (2) os botões de **minimizar, maximizar e fechar** ficam com um **retângulo cheio** ao passar o mouse, e o de fechar mostra um **quadrado vermelho forte** de ponta a ponta da barra, que destoa do vidro do app.
- **Base existente:** `src/renderer/styles.css`: `.wc button` (50 px de largura, altura da barra), `.wc button:hover`, `.wc button.close:hover{background:#e5384a}` e `.wc button.close{border-top-right-radius}`; `.tbtn.round` (sino, 30 px) e o desenho do sino em `ICONS` (`src/renderer/app.js`, `data-togact`).
- **Ideias a validar com o usuário:** botões da janela com realce em **pílula ou círculo** menor (como o sino), com cantos arredondados e margem em volta, em vez do retângulo de ponta a ponta; fechar com um vermelho mais suave (translúcido, ou o vermelho só no ícone com um fundo discreto), mantendo o canto superior direito arredondado da janela; transição curta; foco por teclado visível. Centralizar o sino ajustando o `viewBox`/o caminho do SVG ou o alinhamento do botão (medir o centro real do desenho, não só o do quadro).
- **Critérios de aceite:** sino com o centro óptico no centro do círculo (conferido por captura ampliada); minimizar, maximizar e fechar sem retângulo cheio, com realce arredondado coerente com o resto do app; fechar continua óbvio e acessível; funciona maximizado, com a janela normal e no modo Ofuscado (cantos do Windows 11); capturas antes e depois; atualizar `docs/DESIGN.md`.

### TASK-043 — Ícone do Claude nas mensagens do chat

- **Responsável:** DEV1
- **Status:** BACKLOG
- **Prioridade:** Baixa (visual) — pedido do usuário em 2026-11-02, com captura do avatar atual
- **Objetivo:** o avatar da resposta no chat hoje é a marca do Termix (`>_` em quadrado azul). O usuário quer **o ícone do próprio Claude** nas mensagens (a pergunta continua com o ícone de pessoa).
- **A decidir ao começar:** qual ícone (o mascote pixelado laranja que o Claude Code mostra no terminal, ou o brilho/estrela do Claude) e como desenhar: um SVG simples próprio, em `src/renderer/chat.js` (`CHAT_MARK`) e `styles.css` (`.c-av`). Lembrar que é uma marca de terceiros; para uso pessoal tudo bem, mas não entra em material de divulgação (TASK-036) sem checar. No visual Fluxo os rótulos de texto continuam.
- **Critérios de aceite:** avatar da resposta com o ícone escolhido, nítido em 30 px; cor de fundo coerente com o tema; sem quebrar o visual Fluxo; captura antes e depois.

### TASK-044 — Trocar o modo de uma aba aberta (chat ↔ terminal) e o aviso de que a configuração só vale para abas novas

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 (Aprovada pelo usuário em 2026-11-02. Falta promover para a `main` com `/fluxo:promover`, quando o usuário pedir.)
- **Prioridade:** Alta — o usuário trocou Configurações > Chat > Modo das abas novas para Terminal e os chats abertos continuaram chats (comportamento previsto na TASK-040, mas não é o que ele esperava)
- **Objetivo:** dar um jeito claro de ver uma conversa no outro modo. Chat e terminal usam a **mesma sessão do Claude Code** (`--resume <id>`), então trocar é viável: encerrar o processo da aba, mudar o `kind` e abrir de novo no outro modo, com a mesma conversa.
- **Opções a validar com o usuário:** (1) item no menu da aba (clique direito): "Abrir como terminal" / "Abrir como chat", só com o agente parado; (2) botão no cabeçalho da aba; (3) em Configurações, um botão "Aplicar a todas as abas abertas" (com confirmação, pois encerra os processos). Deixar o texto de Configurações mais claro ("vale para as abas novas").
- **Critérios de aceite:** a troca mantém o nome, a cor e o ID da conversa; o histórico aparece no chat (do `.jsonl`) e a conversa continua no terminal (`--resume`); se o agente está trabalhando, pede confirmação; abas não iniciadas (sem histórico) trocam sem erro; testado nos dois sentidos com o Claude Code real; documentar em `docs/DECISOES.md` (Chat).
- **Base existente:** `tab.kind` (`src/renderer/app.js`, `createTab`), `launch`, `stopProc`, `chatForget`/`chatOpen` em `src/renderer/chat.js`, `renderTabMenu`.
- **Feito:** opção (1): item "Abrir como terminal" / "Abrir como chat" no menu da aba (`switchMode` em `src/renderer/app.js`); pede confirmação se o agente trabalha; para o processo, troca `tab.kind` e reabre com `--resume` (nome, cor e ID mantidos). Texto de Configurações > Chat deixa claro que vale só para abas novas.
- **Testado (CDP, instância isolada, Claude Code real):** chat novo → mensagem (BANANA) → trocar para terminal (retoma a mesma sessão) → voltar para chat (histórico de 2 itens volta do `.jsonl`); `npm run check` passou. Não exercitado: troca com agente trabalhando (modal) e o clique no menu pelo mouse.
- **Ajustes pedidos pelo usuário (2026-11-02):** botão "Nova conversa" do cabeçalho (estado de falha) removido (a seta ao lado do "+" já abre outra aba); rodapé do chat centralizado como o do terminal, com a engrenagem logo depois de Reiniciar (o alinhamento à coluna da caixa de prompt, da TASK-040, foi desfeito; `styles.css`, `web.js`). Conferido por captura e CDP.
- **Arquivos tocados:** `src/renderer/app.js`, `src/renderer/styles.css`, `src/renderer/web.js`, `docs/DECISOES.md`, `docs/TASKS.md`, `docs/CHANGELOG_DEV.md`.
- **Como validar:** `npm start`; clique direito numa aba > "Abrir como terminal" (e de volta); a conversa continua a mesma.

### TASK-045 — Menu de comandos "/" no campo de envio do chat

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 (Aprovada pelo usuário em 2026-11-02 (o ajuste da barra de rolagem do chat entrou junto). Falta promover para a `main` com `/fluxo:promover`, quando o usuário pedir.)
- **Prioridade:** Alta — pedido do usuário em 2026-11-02 (no terminal, digitar "/" abre a lista de comandos; no chat não aparece nada)
- **Objetivo:** ao digitar "/" no início do campo de envio do chat, abre uma lista (acima da caixa) com os comandos disponíveis, nome e descrição, filtrando enquanto digita; setas e Enter escolhem, Esc fecha, Tab completa; no estilo do app. Referência: a lista do Claude Code no terminal (ex.: `/fluxo:init`, `/fluxo:papel`, com descrição).
- **De onde vêm os comandos:** o evento `system/init` do stream-json traz `slash_commands` (e `skills`) da sessão; antes da primeira mensagem (processo ainda não criado) usar a leitura de skills e comandos do app (`scan:resources`: usuário, projeto e plugins) ou subir o processo ao focar a caixa. Descrições com entidades HTML (como `-&gt;`) devem ser decodificadas.
- **Limite importante:** no modo `-p` só funcionam comandos de skill, de plugin e personalizados (viram texto expandido pelo Claude Code); os comandos interativos do terminal (`/clear`, `/mcp`, `/model`, `/resume`…) não rodam. A lista deve mostrar só o que funciona, mapear o que o app já faz (`/clear` → botão Clear/conversa nova) e avisar o resto ("abra uma aba de terminal para este comando").
- **Critérios de aceite:** "/" abre a lista na hora, filtra por nome, mostra descrição e origem (skill, plugin, projeto); escolher insere o comando no campo; funciona por teclado; enviar um comando de skill de verdade e ver a resposta; sem atrapalhar quem digita "/" no meio do texto (só no início); testado com o Claude Code real.
- **Feito:** `src/renderer/chat.js` (lista, filtro, teclado, `/clear` mapeado para Nova conversa) e `styles.css` (`.c-slash`). Fonte: `scan:resources` (skills e comandos de usuário, projeto e plugins ligados; leitura em cache por 3 s), nome de plugin como `plugin:nome`, descrição com entidades HTML decodificadas. Só abre quando o "/" está no início do campo.
- **Testado (CDP, teclas reais, Claude Code real):** "/" abre a lista na hora (21 itens), "/init" filtra, Esc fecha, "texto /meio" não abre; comando de projeto criado (`/ola`) aparece, Enter insere, Enter envia e a resposta (ABACAXI) veio; `npm run check` passou. Observação: `/fluxo:vendas` enviado de verdade foi recusado pelo Claude no modo -p (esperado: dependem do ambiente interativo). Não exercitado: `/clear` pelo menu e clique do mouse na lista.
- **Ajuste (usuário, 2026-11-02):** barra de rolagem do chat (padrão do Windows, clara e larga ao lado do rail) trocada pela do app: fina, translúcida e só aparece com o mouse sobre a conversa (`styles.css`, `.c-scroll`).
- **Pendências:** comandos nativos do terminal (`/mcp`, `/model`…) não aparecem (não funcionam no `-p`); só o `/clear` é mapeado; sem aviso "abra um terminal" ao digitar um comando que não existe.
- **Como validar:** `npm start`; num chat digite "/" e escolha uma skill; filtre digitando; setas, Enter/Tab e Esc.

### TASK-041 — Imagens coladas no chat, com miniatura na caixa de prompt

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 (Aprovada pelo usuário em 2026-11-02 (layout do Claude Desktop, até 20 imagens). Falta promover para a `main` com `/fluxo:promover`, quando o usuário pedir.)
- **Prioridade:** Alta — pedido do usuário em 2026-11-02, com wireframe e a captura do Claude como referência
- **Objetivo:** ao colar uma imagem (Ctrl+V) no campo de envio do chat, ela aparece como **miniatura dentro da caixa de prompt, acima do texto**, com contorno só em volta da imagem (como no Claude); a imagem segue junto com a mensagem. Wireframe do usuário: quadrado da miniatura em cima, à esquerda, e a barra de texto embaixo.
- **Critérios de aceite (a refinar ao começar):** colar imagem da área de transferência (print, cópia de imagem) mostra a miniatura com um "x" para remover; várias imagens lado a lado; arrastar arquivo de imagem para a caixa também funciona (se couber); enviar manda texto e imagens juntos e a bolha da pergunta mostra as miniaturas; o histórico reaberto (do `.jsonl`) também mostra as imagens; limite de tamanho/quantidade com aviso claro; sem quebrar a colagem de texto; testado com o Claude Code real (ele precisa "ver" a imagem e descrevê-la).
- **Notas técnicas:** o `stream-json` de entrada aceita `message.content` como lista de blocos, inclusive `{type:"image", source:{type:"base64", media_type, data}}`; hoje `chat:send` só manda texto (`src/chat.js`, `chatSendMsg` em `src/renderer/chat.js`). A colagem pode vir do evento `paste` do textarea (`clipboardData.items`) ou de um `clipboard.readImage()` no processo principal (hoje só existe `clip:read` de texto). Reduzir imagens grandes antes de enviar (custo em tokens). Atualizar o `history()` para devolver blocos de imagem.
- **Feito:** colar (Ctrl+V) ou arrastar imagem para a caixa mostra a miniatura (128×84 px, com "x") **dentro da caixa, acima do texto, como no Claude Desktop** (decisão do usuário em 2026-11-02, depois de testar duas variações com a miniatura saindo da barra, que não agradaram; não inventar layout novo); até 20 imagens (o mesmo limite do Claude Code), em uma fileira que rola na horizontal, com aviso rápido sobre a caixa ao passar do limite; a imagem é reduzida (lado maior 1568 px; PNG grande vira JPEG; recusa se passar de ~3,5 MB) antes de enviar; vai ao Claude como blocos `image` base64 junto do texto (pode enviar só a imagem); a bolha mostra as miniaturas e o histórico reaberto (`.jsonl`) também. Arquivos: `src/renderer/chat.js`, `src/chat.js`, `src/preload.js`, `src/renderer/styles.css`.
- **Testado (CDP, Claude Code real):** imagem 3000×2000 com a palavra ABACATE colada por evento de colagem: miniatura, envio, o Claude respondeu "ABACATE", e `chatHistory` devolveu a imagem; `npm run check` passou. Defeito achado e corrigido: a política de segurança da tela bloqueava `blob:` (trocado por `createImageBitmap`). Não exercitado: Ctrl+V com print real do Windows, arrastar arquivo, 5+ imagens, WebP/GIF.
- **Como validar:** `npm start`; num chat, copie um print (Win+Shift+S) e dê Ctrl+V na caixa; escreva "descreva a imagem" e envie.

### TASK-042 — Refatoração de design: telas que não são terminais sem o fundo aparecendo nas bordas

- **Responsável:** DEV1
- **Status:** BACKLOG (depois da TASK-041)
- **Prioridade:** Média — pedido do usuário em 2026-11-02, com captura de Configurações
- **Objetivo:** hoje as telas Plugins, Skills, MCPs, Consumo, Integrações e Configurações são um painel arredondado, com borda e margem, flutuando dentro do vidro, e o fundo degradê aparece em volta. Pedido: **qualquer tela que não seja de terminal (nem o chat) deve ser uma coisa só com o app**, sem o fundo aparecendo nos arredores; o fundo/vidro com a moldura fica só para os terminais.
- **Base existente:** `#page` (`.stage.panel.glass`, `#page:not(.hide){margin:8px}` em `src/renderer/styles.css`), `renderPage` e `mode()` em `src/renderer/app.js`, a moldura em "U" (`framePath`/`layout`, `GEO`), `docs/DESIGN.md` (estrutura da janela e padrão dos controles).
- **Critérios de aceite (a refinar):** páginas ocupam a área do palco de ponta a ponta, contínuas com a barra lateral e o rodapé, sem margem de 8 px, sem borda dupla nem o degradê vazando nas laterais; o terminal e o chat continuam como estão (fundo de vidro); rolagem, cartões e controles seguem o padrão da TASK-031; funciona nas larguras 1600, 1180 e 980 e nos modos Degradê e Ofuscado; capturas antes e depois; atualizar `docs/DESIGN.md`.
- **Ideia a validar com o usuário:** como o rodapé de funções fica nessas telas (hoje some fora de terminal/Web) e se a barra lateral também perde o vidro ou só o palco muda.
- **Próximo passo:** auditar as telas atuais com capturas e propor 2 variações no HTML de protótipo antes de mexer no app.

### TASK-038 — Arrastar para reordenar as abas da Web

- **Responsável:** DEV1
- **Status:** BACKLOG
- **Prioridade:** Baixa
- **Objetivo:** as abas da Web (`#wtabs`, `src/renderer/web.js`) não têm arrastar; reutilizar a lógica das abas dos terminais (TASK-033).

### TASK-039 — Barra de abas com mais de ~25 abas (rolagem horizontal)

- **Responsável:** DEV1
- **Status:** BACKLOG
- **Prioridade:** Baixa
- **Objetivo:** hoje as inativas encolhem até 34 px; acima de ~25 abas a barra estoura de novo. Avaliar rolagem horizontal mantendo o recorte (`fuseBar`) e o arrastar com rolagem automática.

### TASK-036 — README profissional e página do projeto no GitHub

- **Responsável:** DEV1
- **Status:** BACKLOG
- **Prioridade:** Alta (necessária antes de mandar o link para outras pessoas)
- **Objetivo:** o repositório não tem README. Criar um profissional: o que é o Termix, capturas de tela, como baixar (Releases) e instalar (inclusive o aviso do SmartScreen, pois o app não é assinado), requisito do Claude Code, como atualizar, limites conhecidos e como relatar problema. Depois de aprovado, promover a `dev1` para a `main` (só com pedido do usuário).

### TASK-037 — Imagem lateral do instalador com a marca do Termix

- **Responsável:** DEV1
- **Status:** BACKLOG
- **Prioridade:** Baixa
- **Objetivo:** o assistente do instalador mostra a imagem lateral padrão do NSIS (laptop com seta e logo genérico). Trocar por uma com a marca do Termix (`installerSidebar`, 164×314 px). Ideia: avaliar assinatura de código para tirar o aviso do SmartScreen.

### TASK-026 — Registro de consumo e alertas de ritmo (derivado do guia de economia de tokens)

- **Responsável:** A definir
- **Status:** BACKLOG
- **Prioridade:** Média
- **Objetivo:** o `statusline-wrapper.js` já recebe `rate_limits` e `context_window`; passar a gravar um registro (`consumo-limites.jsonl`, no máximo 1 linha por minuto e uma quando a % muda, como no `statusline-registro.py.txt` do pacote) para medir **quem gasta a cota** por projeto/sessão, e mostrar isso no app (junto da TASK-011), em vez do `consumo.mjs` externo.
- **Ideias do guia a avaliar:** ritmo de ~20 % da cota por hora na janela de 5 h (aviso no rail quando passar); alerta de cache perto de esfriar (< ~1 min); hábito de `/clear` (contexto mediano ao limpar, sessões que ficaram pesadas). Os limiares de contexto (15 % / 35 %) dependem do tamanho da janela do modelo: conferir com o plano do usuário antes de fixar.
- **Origem:** `economia-tokens-pacote.zip` (guia, `consumo.mjs`, `statusline-registro.py.txt`) enviado pelo usuário em 2026-10-30.

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
