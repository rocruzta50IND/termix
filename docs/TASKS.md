# TASKS — Termix

Controle de tarefas do projeto. Ao receber um pedido, o Claude localiza a tarefa aqui (ou cria uma nova entrada) antes de desenvolver.

Formato do ID: `TASK-XXX` — numeração sequencial, sem reuso, livre em todas as branches. Status e responsabilidades em `WORKFLOW.md`.

---

## Em andamento

### TASK-116 — Adicionar o DEV2 ao fluxo (criar a branch dev2 e registrar devs no fluxo.json)

- **Responsável:** DEV1
- **Status:** EM ANDAMENTO (2026-11-06; branch criada, falta o DEV2 configurar a máquina)
- **Prioridade:** Alta — pedido do usuário: o DEV2 clonou o projeto e o `/fluxo:papel` não achou a `origin/dev2`.
- **Feito:** `.claude/fluxo.json` com `devs: ["dev2"]` e `design_system.modo: "nao-se-aplica"` (decisão do usuário: o Termix não usa o DS Rocruzta; a aparência é regida por `docs/DESIGN.md`). Branch `dev2` criada a partir da `dev1` (não da `main`, para não tocar a main com 10 commits não promovidos).
- **Próximo passo:** o DEV2 roda `/fluxo:papel` (DEV2) e valida o ambiente; depois voltar à TASK-109.

### TASK-109 — Chat: pedidos de permissão em fila (vários cartões iguais) e "Permitir tudo nesta sessão"

- **Responsável:** DEV1
- **Status:** EM ANDAMENTO (decisão do usuário em 2026-11-05: seguir a recomendação; implementação ainda não começou)
- **Prioridade:** Alta — levantada pelo usuário em 2026-11-05, com um print do chat: três ou mais cartões de `WebFetch` (mesmo domínio) empilhados, cada um pedindo um clique. O usuário quer ver o pedido **uma vez só**: "Permitir" mostra os próximos; "Permitir sempre" faz o app parar de perguntar; e um jeito de liberar tudo na sessão, independente da tarefa.
- **Causa confirmada (Claude Code 2.1.318, teste real):** o Claude Code chama várias ferramentas em paralelo e envia **todos os pedidos de uma vez**; no teste, 3 `WebFetch` em paralelo geraram 3 pedidos simultâneos com a **mesma regra sugerida** (`domain:raw.githubusercontent.com`). O "Permitir sempre" grava a regra, mas os outros pedidos **já foram enviados** e continuam esperando, então cada um precisa do seu clique (a TASK-105 responde só ao pedido clicado).
- **Teste do "liberar tudo na sessão":** responder `allow` com `updatedPermissions: [{ type: 'setMode', mode: 'bypassPermissions', destination: 'session' }]`. **Sem** a flag `--allow-dangerously-skip-permissions` na subida do processo, o Claude Code **ignora** e continua perguntando (pedidos 2 a 5 apareceram). **Com** a flag (ela só *permite* entrar no modo, não o liga; o primeiro pedido continuou aparecendo), o primeiro `allow` com `setMode` fez os outros dois pedidos da fila **e** os do turno seguinte (um `Bash` e outro `WebFetch`) passarem sem perguntar: 1 pedido no total, 0 negações. O modo vale **só enquanto o processo da aba vive**: reiniciar, Clear ou reabrir o app volta a "Perguntar".
- **Proposta (3 camadas, do mais seguro ao mais amplo):** (1) **Fila inteligente (sem mudar segurança):** ao responder **Permitir sempre**, o app responde `allow` aos outros cartões pendentes cuja regra sugerida é igual (mesma ferramenta e mesmo domínio/comando) e os marca como "Permitido sempre"; com 2 ou mais pedidos pendentes aparece uma faixa fixa acima da caixa de mensagem: "N pedidos aguardando: **Permitir todos** (uma vez) · **Negar todos**", e os cartões já respondidos encolhem para uma linha. (2) **Permitir tudo nesta sessão:** novo botão no cartão (com o ícone ⚠, visual de alerta e confirmação curta), que usa o `setMode` acima; o selo do rodapé muda para "⚠ tudo liberado (sessão)" e volta ao normal ao reiniciar a aba; **não grava nada em disco** e nada vale para outras abas ou projetos. Exige subir os chats em "Perguntar" com `--allow-dangerously-skip-permissions`. (3) **Permitir sempre neste projeto** continua sendo **uma regra** (ferramenta + domínio/comando, em `.claude/settings.local.json`); não vira "liberar tudo do projeto para sempre".
- **Decisão do usuário (2026-11-05): seguir a recomendação.** "Permitir sempre neste projeto" continua valendo **só para aquela regra**; **não** haverá "liberar tudo no projeto" gravado. Escopo: camadas 1 e 2.
- **Riscos:** "tudo na sessão" vale também para `Bash` destrutivo, escrita fora do projeto e arquivos sensíveis (`.mcp.json`, `.claude/`): é o mesmo risco do Dangerously, só que escolhido na hora; a flag nova é do Claude Code e pode mudar; auto-responder pedidos "iguais" exige comparar a regra inteira (não só o nome da ferramenta) para não liberar um comando diferente; ligar com a TASK-108 (aviso e lembrete) para a faixa de pedidos pendentes aparecer também com a conversa rolada.
- **Como validar (depois):** pedir 3 buscas em paralelo ao mesmo domínio: um clique em "Permitir sempre" resolve os 3 cartões; "Permitir todos" resolve a fila de comandos diferentes; "Permitir tudo nesta sessão" para de perguntar até o fim da conversa e deixa de valer ao reiniciar a aba; em "Automático" nada muda.
- **Próximo passo:** implementar a camada 1 (auto-resolver os cartões pendentes com a mesma regra ao dar "Permitir sempre"; faixa "N pedidos: Permitir todos / Negar todos"; cartões respondidos encolhem) e a camada 2 (botão "Permitir tudo nesta sessão" com confirmação, `--allow-dangerously-skip-permissions` na subida das abas em "Perguntar", selo do rodapé "⚠ tudo liberado (sessão)"). Pontos de partida: `src/chat.js` (`start`, `permit`), `src/renderer/chat.js` (`chatDecide`, `chatPaintItem` do tipo `perm`, `chatUi`), `styles.css` (`.c-pm`). Testar por CDP em instância isolada como na TASK-105 (3 `WebFetch` em paralelo). Depois: atualizar `docs/DECISOES.md` (Permissões), README e o texto de Configurações > Chat.

### TASK-107 — Publicar a versão 0.3.7 (cartão de permissão no chat)

- **Responsável:** DEV1
- **Status:** AGUARDANDO VALIDAÇÃO DO USUÁRIO (Release v0.3.7 publicado em 2026-11-05: https://github.com/rocruzta50IND/termix/releases/tag/v0.3.7; instalador 125.195.366 bytes, sha512 conferido; promoção dev1 → main `8956754`; feed público já mostra 0.3.7)
- **Prioridade:** Alta — pedido do usuário em 2026-11-05: "suba a nova versão", para levar a TASK-105 (cartão Permitir/Negar no chat) ao time.
- **Entra nesta versão:** TASK-105 (cartão de permissão no chat em modo Perguntar) e as tarefas de documentação do Backlog (099 a 106). A TASK-105 foi testada por CDP, mas ainda não validada pelo usuário no uso real: o usuário decidiu publicar mesmo assim.
- **Passos:** versão 0.3.7; promoção dev1 → main (fast-forward); `npm run dist`; conferir o `latest.yml`; `gh release create v0.3.7`.
- **Feito:** versão 0.3.7; promoção dev1 → main (fast-forward); `npm run dist`; `latest.yml` conferido (versão, tamanho e sha512 batem com o instalador); pacote confere (`--permission-prompt-tool` presente em `src/chat.js`); Release v0.3.7 com instalador, blockmap e `latest.yml`.
- **Próximo passo:** o usuário atualiza o app (0.3.6 → 0.3.7) e valida o cartão de permissão no uso real (aba de chat em Perguntar, por exemplo um `claude mcp add`); isso também valida a TASK-105.

### TASK-098 — Apresentação do Termix para a reunião (index.html)

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 (usuário aprovou em 2026-11-04: "ficou perfeito"; usada na reunião do dia)
- **Prioridade:** Alta — pedido do usuário em 2026-11-04: apresentação em `index.html` do sistema inteiro, com tudo o que ele faz e o intuito de ter criado o app, para a reunião do dia.
- **Feito:** `docs/apresentacao/index.html` (arquivo único, sem dependências, imagem embutida): 19 slides (capa, por que criamos, intuito, o app em uma tela, projetos e abas, chat e terminal, retomada, anéis de consumo, tela Consumo, Clear, plugins/skills/MCPs, Web, notificações, instalação e atualização, dados e privacidade, como foi feito, limites, próximos passos, encerramento). Conteúdo tirado do README e de `docs/DECISOES.md`; limites e pendências ditos com franqueza. Navegação por setas, F (tela cheia), P (imprimir/PDF).
- **Atenção:** o texto do "intuito" foi deduzido da documentação (o `DECISOES.md` não traz uma frase de motivação); o usuário deve ajustar ao que quer dizer. Os números do slide 16 (170+ commits, 90+ tarefas, 5 usuários) vêm do repositório. Não é código do app: não entra em versão.
- **Testado:** capturas headless (Edge) dos slides em 1600×900 e 1366×700 sem corte nem estouro.
- **Próximo passo:** nenhum. Ideias pós-MVP são o próximo assunto (Backlog; TASK-095 e TASK-096 seguem pendentes).

### TASK-097 — Publicar a versão 0.3.6 (só para provar a atualização automática em outro PC)

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 (usuário confirmou em 2026-11-04: o PC de teste atualizou 0.3.5 → 0.3.6 sozinho, "tudo funcionando") — Release v0.3.6 publicado em 2026-11-04: https://github.com/rocruzta50IND/termix/releases/tag/v0.3.6; instalador 125.193.579 bytes, sha512 conferido; promoção dev1 → main `29c2d93`; feed público já mostra 0.3.6)
- **Prioridade:** Alta — pedido do usuário em 2026-11-04: o PC de teste (Windows 11, Smart App Control em Avaliação) instalou a 0.3.5 pelo guia; subir uma versão simples para esse PC atualizar sozinho. Parte da TASK-095.
- **Entra:** nenhuma mudança de código; versão 0.3.6 e o rodapé do `docs/INSTALACAO.md` com o resultado do teste real.
- **Como validar:** no PC de teste, com o Termix 0.3.5 aberto, aparece o chip de atualização no cabeçalho (até alguns segundos após abrir ou em até 4 h); baixa em segundo plano; **Reiniciar agora**; o app volta com `v0.3.6` e as abas restauradas. Anotar o tempo.
- **Próximo passo:** usuário valida a atualização no outro PC.

### TASK-094 — Publicar a versão 0.3.5

- **Responsável:** DEV1
- **Status:** AGUARDANDO VALIDAÇÃO DEV1 (Release publicado; faltam a atualização 0.3.4 → 0.3.5 no app do usuário e a instalação em outra máquina pelo guia)
- **Prioridade:** Alta — pedido do usuário em 2026-11-03: "pode subir a nova versão" (o usuário delegou a avaliação das TASK-090, 092 e 093 e pediu publicar, para o time seguir o `docs/INSTALACAO.md` que fica no GitHub).
- **Entra nesta versão:** anéis 5H/7D certos no chat e sub-abas da barra recolhida só do projeto em foco (TASK-091), projetos novos no disco com mais espaço e escolha da pasta (TASK-090), dica de notificação dentro do cabeçalho (TASK-092), janela que respeita a tela pequena (TASK-093); documentação: guia de instalação com o passo a passo do Smart App Control.
- **Passos:** versão 0.3.5; promoção dev1 → main (fast-forward); `npm run dist`; conferir o `latest.yml`; `gh release create v0.3.5`.
- **Feito:** versão 0.3.5; promoção dev1 → main (`ab029da`, fast-forward); `npm run dist`; `latest.yml` conferido (versão, tamanho 125.193.450 e sha512 batem com o instalador); Release **v0.3.5** publicado (https://github.com/rocruzta50IND/termix/releases/tag/v0.3.5) com instalador, blockmap e `latest.yml`; conferido que o feed público já mostra a 0.3.5, que o `docs/INSTALACAO.md` está na `main` do repositório público e que o pacote traz as mudanças (`workArea`, `biggestDriveRoot`).
- **Próximo passo:** o usuário atualiza o app (0.3.4 → 0.3.5) e, depois, a validação da instalação em **outra máquina** seguindo o guia do GitHub: só então o MVP (TASK-083) é declarado.

### TASK-093 — Janela maior que a tela pequena (item B da TASK-083)

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 (emulada em 1000×560 e 800×500 por CDP, por delegação do usuário; falta ver numa tela física pequena)
- **Prioridade:** Média — achado do teste no Sandbox: a janela abria em 1280×760 e saía pela borda do Sandbox (~1214×651). **Esclarecido em 2026-11-03:** esse tamanho era do Sandbox aberto em janela pequena; em tela cheia ele fica normal. O ajuste continua válido para notebooks de tela pequena, mas o achado é menos grave do que parecia.
- **Feito:** `main.js` (`createWindow`): tamanho inicial e mínimo limitados à área útil da tela principal (`screen.getPrimaryDisplay().workArea` menos 16 px; nunca abaixo de 640×480). Em telas grandes nada muda (1280×760, mínimo 980×620).
- **Testado:** `npm run check`; layout do app emulado em 1000×560 e 800×500 por CDP nas telas Terminais, Consumo e Configurações: sem rolagem horizontal, nada estoura. Não testado: numa tela física pequena (a lógica é simples; confirmar no Sandbox ou num notebook pequeno).
- **Achados menores do percurso (sem correção ainda):** em 800 px de largura o mapa de calor da tela Consumo é cortado no lado direito (sem rolagem); a bandeja de sub-abas mostra só 2 de 4 ícones em 500 px de altura (rola, mas sem indício claro).
- **Percurso feito até aqui (instância isolada, 1280×760):** Terminais, Plugins, Skills, MCPs, Consumo, Integrações e Configurações, sem erro visível, textos em português e carregamento rápido depois da primeira leitura. Falta: aba Web, chat, modais e estados de erro, notificações, DPI alto e mais de um monitor, teclado e foco, muitos projetos.

### TASK-092 — Dica de notificação ao lado do sino saía do cabeçalho

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 (testada por CDP em 2026-11-03, por delegação do usuário)
- **Prioridade:** Alta — pedido do usuário em 2026-11-03: a caixa que aparece ao lado do ícone de notificação ficava fora do app e não alinhada ao cabeçalho.
- **Causa (medida por CDP):** a dica tinha 59 px de altura, centrada no sino (y 31), então o topo ficava a 1,6 px da borda da janela, acima do quadro arredondado do app e mais alta que o cabeçalho (46 px).
- **Feito:** `renderer/styles.css` (`#ntoast`): pílula de 34 px numa linha (título + tipo + mensagem com reticências), centrada no sino, largura máxima 420 px; `renderer/app.js` (`showToast`): texto inteiro na dica nativa. `docs/DESIGN.md` atualizado.
- **Testado:** instância isolada por CDP com mensagem curta e longa: topo a 14 px, base a 48 px (dentro do cabeçalho), alinhada ao sino, com reticências; `npm run check`. Não testado: com a janela bem estreita e com o painel de notificações aberto.
- **Como validar:** deixar um terminal/chat terminar com o app em foco em outra aba e ver a dica ao lado do sino.

### TASK-091 — Anéis 5H/7D diferentes do /usage e sub-abas da barra recolhida só no projeto em foco

- **Responsável:** DEV1
- **Status:** EM ANDAMENTO (correção feita, falta validar no app)
- **Prioridade:** Crítica — pedido do usuário em 2026-11-03 (com capturas): o `/usage` do terminal mostra 13 % (sessão) e 46 % (semana), mas o app mostrava 5H "–" e 7D 24 %; "sem essas informações corretas não podemos evoluir para o pós-MVP". Também: na barra recolhida as sub-abas apareciam em mais de um projeto.
- **Causa (confirmada):** o chat gravava `updated` em **segundos** (`Date.now() / 1000`, `renderer/chat.js`) e o terminal em **milissegundos**. O `onMetric` só aceita um limite se `data.updated >= UI.limits.updated`; depois que um terminal (ms) ou o `lastLimits` salvo (ms) preenchia o valor, toda leitura do chat (segundos) parecia "mais antiga" e era descartada para sempre; o "atualizado há" também errava. O mesmo mistério afetava o Clear no chat (`clearedAt` em ms). O parser em si estava certo: um `claude -p` real devolveu `unifiedWindows.five_hour 0.15` e `seven_day 0.46`, igual ao `/usage`.
- **Feito:** `renderer/chat.js` (`chatMet`): `updated` em milissegundos nos dois modos. `renderer/app.js` (`renderSide`): na barra recolhida só o projeto em foco mostra a bandeja de sub-abas (`open` só se `UI.cur.p` é o projeto); a barra aberta segue o estado `open` de cada projeto.
- **Testado:** `npm run check`; formato real do `rate_limit_event` capturado com o Claude Code. **Não testado no app** (precisa de uma resposta no chat/terminal para os anéis atualizarem).
- **Como validar:** `npm start`; mandar uma mensagem num chat: 5H e 7D devem passar a bater com o `/usage` (tolerância de 1–2 pontos por causa do momento); repetir num terminal; a barra recolhida deve mostrar sub-abas só do projeto selecionado, e trocar de projeto troca a bandeja.
- **Limite que continua:** o Claude Code só informa os limites depois da **primeira resposta** de uma sessão; numa aba recém-aberta, sem resposta, o anel mostra o último valor conhecido (ou "–" se a janela de 5 h já venceu). Se isso incomodar, a saída é o Termix consultar o mesmo endpoint do `/usage` (não documentado, usa o token de login): fica como opção a decidir.
- **Próximo passo:** usuário valida; depois retomar a TASK-083.

### TASK-090 — Projetos novos no disco com mais espaço (e escolha da pasta raiz)

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 (testada por CDP em instância isolada em 2026-11-03, por delegação do usuário: automático em `D:Termix`, pasta escolhida respeitada, pasta inválida cai no automático, tela Configurações com Alterar/Automática)
- **Prioridade:** Crítica e urgente — pedido do usuário em 2026-11-03: "os projetos deveriam ser jogados para o armazenamento de maior espaço (geralmente HD)". Surgiu com o C: do usuário cheio (0 GB livres) durante o teste no Sandbox; os projetos criados pelo app iam sempre para `Documentos\Termix`, no C:.
- **Feito até agora:** `src/main.js` (`resolveRoot`, `biggestDriveRoot`): sem escolha do usuário, a pasta é `X:\Termix` no disco fixo com mais espaço livre (mínimo 2 GB; se a consulta falhar ou nenhum disco servir, volta para `Documentos\Termix`); com escolha, usa a pasta escolhida (e cai no automático se ela estiver indisponível). `src/preload.js` e `src/renderer/app.js`: em Configurações, "Pasta raiz dos projetos criados pelo app" mostra o caminho real e ganhou os botões **Alterar** (seletor de pasta) e **Automática** (volta ao padrão); o valor fica em `settings.projectsRoot`. Projetos importados continuam onde estão. Na máquina do usuário a detecção devolve `D:\Termix` (D: com 421 GB livres; C: com 4 GB).
- **Testado:** `npm run check`; a consulta de discos (PowerShell/CIM) rodada de verdade (C: e D:). **Não testado:** a tela Configurações e a criação de um projeto no app (CDP).
- **Como validar:** `npm start` > Configurações: o caminho deve mostrar `D:\Termix` com a nota "Automática"; criar um projeto novo e conferir que a pasta nasce em `D:\Termix\<nome>`; "Alterar" para outra pasta e criar outro; "Automática" volta ao padrão.
- **Pendências:** o `~\.claude\projects` (conversas do Claude Code) e `%APPDATA%\Termix` continuam no C: (não são controlados pelo Termix); registrar no `docs/INSTALACAO.md` que o instalador e o Sandbox também usam o C:.
- **Próximo passo:** validar no app; depois retomar a TASK-083 (Sandbox) quando houver espaço no C:.

### TASK-083 — Validação do MVP: auditoria geral e uso por 5 pessoas da empresa

- **Responsável:** DEV1
- **Status:** ENCERRADA — MVP DECLARADO NA 0.3.5 (decisão do usuário em 2026-11-04: "considerar um MVP pronto" e partir para as ideias pós-MVP). **Não é a versão 1.0** (só com aprovação do usuário). O que ficou sem fazer foi movido para o Backlog: **TASK-095** (instalação em PC de colega) e **TASK-096** (restante da auditoria B/C/D e `docs/AUDITORIA_MVP.md`).
- **Prioridade:** Crítica — decisão do usuário em 2026-11-03: fechar o MVP antes das duas funções pós-MVP; o app é de **uso interno, para 5 integrantes da empresa, sem comercialização por ora**, e todos precisam conseguir instalar e usar. O usuário vai dar `/clear` e retomar com o chat limpo para esta auditoria.
- **Pronto quando:** as 5 pessoas conseguem instalar do zero, abrir, usar o dia a dia e atualizar sem ajuda, e o relatório da auditoria não tem pendência crítica nem alta; então o usuário declara a primeira grande versão (1.0).
- **Plano (nesta ordem):**
  - **A. Distribuição e instalação para o time** (o maior risco; apareceu hoje com o Smart App Control bloqueando o `Termix.exe` da 0.3.1, TASK-081):
    - Instalar do zero numa máquina/VM limpa e na de um colega: Windows 10 e 11, com e sem Smart App Control e SmartScreen, usuário comum sem administrador, pasta de instalação com espaços/acentos, OneDrive.
    - **Assinatura de código: decidido que NÃO precisa** (uso interno; TASK-082 cancelada, ver `docs/DECISOES.md`). O risco que sobra é o Smart App Control ligado no PC de um colega: testar num PC real com ele ligado e documentar a saída no `docs/INSTALACAO.md`.
    - **Onde ficam os releases: decidido, o repositório fica público para sempre** (ver `docs/DECISOES.md`). Falta só conferir, no item D, que o repositório e o histórico não têm segredos nem dados da empresa.
    - Pré-requisitos de cada pessoa: Claude Code instalado e com login, Git; mensagens claras quando faltar (hoje "Claude Code não foi encontrado…"); primeiro uso sem nenhum projeto; abrir projeto existente (importar conversas); atualização de uma versão antiga do time; antivírus da empresa.
    - Entregar `docs/INSTALACAO.md`: passo a passo curto para o time (baixar, instalar, o que fazer se o Windows bloquear, primeiro uso, como atualizar, a quem pedir ajuda).
  - **B. Percurso de UX clicando em todas as telas** (a auditoria da TASK-072 cobriu UX só por leitura de código): barra lateral aberta/recolhida, projetos (criar, importar, renomear, arquivar, excluir), abas e terminais, chat, aba Web, Plugins, Skills, MCPs, Consumo, Integrações, Configurações, notificações, atualização; com muitos projetos (TASK-080), janela pequena, DPI alto e mais de um monitor; textos em português, estados vazios e de erro, teclado e foco. Capturas só do conteúdo do app (CDP).
  - **C. Performance e estabilidade:** carga de 10 a 15 abas e uso prolongado (horas) medindo memória e CPU; reavaliar do Backlog o que pesa para o time: TASK-075 (abertura com muitas abas), TASK-076 (hooks que atrasam o agente), TASK-073 (alvos de clique e teclado), TASK-077.
  - **D. Segurança e privacidade básicas** (várias pessoas, dados da empresa): o que o app lê e grava (`%APPDATA%\Termix`, `~/.claude`), o modo Dangerously, o que vai para o GitHub nos releases, permissões do instalador.
- **Entregável:** relatório `docs/AUDITORIA_MVP.md` com achados por gravidade, o que foi corrigido e o que fica para depois; versão 1.0 só com aprovação do usuário.
- **Contexto já feito (não repetir):** auditoria de performance/robustez da TASK-072 (0.3.0), atualização em segundo plano com reinício em ~1 s (TASK-069/071/079, validada pelo usuário), exe fixo contra o Smart App Control (TASK-081, 0.3.2/0.3.3).
- **Pendente de aprovação do usuário para fechar:** TASK-065, 061, 068 (publicações/medições antigas), 069, 072, 079 e 081 (aguardando validação; o usuário já viu o reinício de ~1 s funcionar).
- **Feito até agora (2026-11-03):** decisões de distribuição registradas (repositório sempre público, sem assinatura); **`docs/INSTALACAO.md` escrito** (checagem do Smart App Control, instalar, avisos do Windows, primeiro uso, atualizar, desinstalar, a quem pedir ajuda) e ligado ao README; versão publicada no GitHub. Falta **testar o roteiro** no Sandbox e o Smart App Control num PC real, e corrigir o guia conforme o resultado.
- **Sandbox, rodada 1 (2026-11-03, Windows 11 limpo, sem Claude Code, Git nem Node):** download do instalador do GitHub sem login (3 s); instalação silenciosa em pasta com espaços e acento (`Instalação do Termix\App`) com código 0 em 25 s; abre em ~15 s, 5 processos, 391 MB, janela "Termix" v0.3.4, tela inicial sem projetos correta ("Comece criando um projeto"). **Achado:** numa tela pequena (~1214×651) a janela passa da borda direita/inferior do monitor (texto e botões cortados); verificar tamanho mínimo e posição da janela no item B. Scripts do teste ficam no scratchpad (`sbx\teste.ps1`, `termix.wsb`); o Sandbox também exige espaço livre no C:.
- **Sandbox, rodada 2 (0.3.3):** o Windows do Sandbox **tem o Smart App Control ligado** e bloqueou o instalador da 0.3.3 ("Uma política de Controle de Aplicativo bloqueou este arquivo"), embora tenha deixado passar o da 0.3.4 na rodada 1. **Rodada 3 (0.3.4 de novo, Sandbox novo): também bloqueada**, então o veredito não é por versão: é imprevisível (reputação na nuvem) e, com o Smart App Control ligado, o instalador pode ser barrado sempre. Confirma o risco principal do item A; o `docs/INSTALACAO.md` foi atualizado com isso. **Decisão pendente do usuário:** a assinatura de código foi descartada (TASK-082), mas este resultado mostra que, para colegas com o Smart App Control ligado, a única saída hoje é desligá-lo (irreversível sem reinstalar o Windows) ou assinar; vale reavaliar antes de entregar para as 5 pessoas. Consequência: o teste da atualização 0.3.3 → 0.3.4 não pôde ser feito aí (o app antigo nem instala); a atualização real só dá para provar com um release novo (0.3.5) sobre a 0.3.4. O Sandbox também é instável ao reabrir logo após ser fechado (esperar ~25 s).
- **Confirmado pelo usuário no Sandbox (2026-11-03, duplo clique no Explorer):** janela com X vermelho e "Uma política de Controle de Aplicativo bloqueou este arquivo", só com OK (sem "executar assim mesmo"). É o que um colega com o Smart App Control ligado vê; o guia foi corrigido para citar esse texto (o Windows não escreve "Smart App Control").
- **Decisão do usuário (2026-11-03):** sem gasto mensal; a saída para o Smart App Control é **desligá-lo** nos PCs em que estiver Ativado. Documentado em `docs/INSTALACAO.md` (o que muda, o que continua protegendo, precauções) e em `docs/DECISOES.md`, sem afirmar risco zero. Falta confirmar no Sandbox que, com o Smart App Control **desligado**, o instalador passa, e conferir o estado do Smart App Control nos 5 PCs do time.
- **Tentativa de desligar o Smart App Control no Sandbox (2026-11-03):** o app Segurança do Windows não existe no Sandbox ("Não é possível abrir este link windowsdefender"); gravar `VerifiedAndReputablePolicyState = 0` no registro funcionou (valor 0), mas **não vale sem reiniciar e o Sandbox fecha ao reiniciar**, perdendo a mudança; o instalador continuou bloqueado. Conclusão: **não dá para provar no Sandbox o caminho com o Smart App Control desligado**; só num PC real (o de um colega, com ele ligado e depois desligado).
- **Item B iniciado:** ver TASK-093 (janela maior que a tela) e o percurso das telas principais, sem erros visíveis.
- **Falta no item A:** abrir uma aba do Claude Code sem ele instalado (mensagem "Claude Code não foi encontrado…"; dá para fazer instalando a 0.3.4 no Sandbox), atualização 0.3.4 → próxima versão, Smart App Control num PC real de colega e Windows 10.
- **Estado para retomar (2026-11-03):** decisão do usuário: o MVP só é declarado **depois de validar a instalação em outra máquina seguindo o `docs/INSTALACAO.md` do GitHub** (um colega com o Smart App Control ligado desliga e instala; depois a atualização 0.3.5 → próxima). Item A: guia e decisões prontos; faltam os dois testes em PC real. Item B: telas principais vistas sem erro (ver TASK-093); faltam aba Web, chat, modais, DPI alto e mais de um monitor. Itens C (performance com 10–15 abas) e D (segurança e privacidade) não iniciados. Entregável final: `docs/AUDITORIA_MVP.md`; versão 1.0 só com aprovação do usuário.
- **Próximo passo (anterior):** começar pelo item A no **Windows Sandbox** (instalação limpa sem Claude Code/Git, primeiro uso, atualização de versão antiga, pasta com espaços), depois B (percurso de UX), C e D. O que o Sandbox não prova (Smart App Control e antivírus de um PC real, Windows 10) o usuário testa no PC de um colega.

### TASK-072 — Auditoria completa de performance e UX do app (versão 0.3.0)

- **Responsável:** DEV1
- **Status:** AGUARDANDO VALIDAÇÃO DEV1 (publicada na 0.3.0)
- **Prioridade:** Alta — pedido do usuário em 2026-11-03: "rode uma task longa de auditoria de performance e UX, pelo app inteiro, um teste completo… para o 0.3.0"; a publicação da 0.3.0 espera o usuário confirmar a atualização 0.2.8 → 0.2.9 (teste da barrinha).
- **Origem adicional:** a atualização 0.2.6 → 0.2.8 (caminho antigo) levou **16 minutos** na máquina do usuário (a medição anterior dava ~1 min); investigar junto.
- **Plano:** (1) medir em instância isolada e com carga (vários projetos e abas): tempo de abertura, memória, CPU parada, trabalho de renderização, intervalos e leituras de disco periódicas; (2) revisão estática do processo principal e da interface atrás de gargalos e vazamentos; (3) percurso de UX por todas as telas (barra lateral, abas, chat, terminal, Web, Plugins/Skills/MCPs, Consumo, Configurações, atualização): textos, estados vazios e de erro, teclado, foco, contraste, tamanhos; (4) corrigir o que for seguro e de alto valor, registrar o resto no Backlog; (5) testar tudo por CDP; (6) versão 0.3.0, promoção e publicação.
- **Medido (instância isolada, sem carga e com 4 projetos × 2 abas reais do Claude Code):** abertura da janela em 1,4 s; vazio: 402 MB e ~3 % de CPU; com 8 abas: 573 MB e ~8 % de CPU (parado); troca de aba 35–78 ms; rajada de 20 mil linhas no terminal em ~100 ms sem tarefa longa. O app em si é leve; o peso está nos processos do Claude Code.
- **Achado importante (a "espera de 16 minutos"):** a janelinha "Atualizando…" do caminho antigo não sabia que o app já tinha voltado (dependia de achar a janela do Termix) e ficou na tela até o limite de tempo; era isso que parecia 16 minutos (a troca em si levou 5 s: `termix-apply-update.log`). **Corrigido:** o app grava uma marca ao terminar de abrir e o auxiliar fecha ao vê-la (testado: fecha em ~1 s); e a janelinha já não é lançada no fluxo novo (TASK-071).
- **Auditoria (2 revisões de código lendo todos os arquivos + medições):** ~60 achados. **Corrigidos nesta tarefa:** erro não capturado no processo principal vai para `erros.log` em vez de derrubar o app; escrever num terminal/chat que acabou de fechar não lança mais exceção; gravação atômica (arquivo temporário + rename) nos encaminhadores de métricas e de hooks, e o app só marca como lido depois de ler com sucesso (antes um arquivo gravado pela metade perdia a atualização, p. ex. o "terminou" de uma aba); limpeza ao abrir das métricas/hooks com mais de 7 dias; recarrega a interface se ela morrer; cache do caminho do Claude Code e do Node; salvar o estado sem indentação e sem falhar quando o antivírus segura o arquivo; cache por data/tamanho dos JSON e frontmatters da varredura de Plugins/Skills/MCPs e no máximo 3 `claude plugin details` ao mesmo tempo; o cabeçalho deixou de ser refeito a cada métrica (0 mutações em 10 s com 8 abas; antes engolia cliques e dicas, inclusive no "Reiniciar agora"); opacidade do terminal sem reaplicar o tema em todas as abas; ajuste do terminal em rajada limitado a ~6/s; Markdown do chat em andamento refeito no máximo a cada ~110 ms; modal com foco no botão principal, Escape, papel de diálogo e foco devolvido ao fechar; listener de "Sessões fechadas" não se acumula mais; dica da aba com nome e estado; erro do chat copiável; texto discreto (--text3) mais claro (contraste).
- **Testado:** `npm run check`; instância isolada com 8 abas reais (cabeçalho 0 mutações/10 s, modal com foco/Escape, troca de aba ~40 ms, `erros.log` vazio), varredura de recursos (9–16 ms), simulação da troca com o auxiliar (marca detectada em ~1 s). Não testado: Enter no botão do modal por CDP (a ferramenta não envia o caractere; no navegador o botão focado confirma com Enter).
- **O que ficou fora (virou Backlog, TASK-073 a 078):** acessibilidade e alvos de clique, chat com histórico longo, abertura mais rápida, hooks mais leves, varreduras de disco/IPC e polimento de UX. Atalhos de teclado, busca e links no terminal foram anexados à TASK-009.
- **Publicado:** usuário confirmou a 0.2.9 em 2026-11-03; versão 0.3.0, promoção dev1 → main e Release v0.3.0 (registro abaixo).
- **Próximo passo:** usuário atualiza 0.2.9 → 0.3.0 pelo fluxo novo (chip → Reiniciar agora), confere o cabeçalho "v0.3.0" e o uso do dia a dia; se aprovar, concluir a TASK-072 e escolher a próxima do Backlog (sugestão: TASK-009).

### TASK-068 — Publicar a versão 0.2.6

- **Responsável:** DEV1
- **Status:** EM ANDAMENTO
- **Prioridade:** Alta — pedido do usuário em 2026-11-02 ("suba a versão nova para eu atualizar o app")
- **Objetivo:** publicar a 0.2.6 com as TASK-066 (janelinha fora da árvore do Termix, trava contra reabrir no meio da instalação, ícones) e TASK-067 (dica da barra recolhida).
- **Passos:** versão 0.2.6; promoção dev1 → main; `npm run dist`; conferir o `latest.yml`; `gh release create v0.2.6`; o usuário atualiza (0.2.5 → 0.2.6).
- **Feito até agora:** versão 0.2.6; promoção dev1 → main (`a6dec9d`); `npm run check` ok; Release **v0.2.6** publicado (https://github.com/rocruzta50IND/termix/releases/tag/v0.2.6) com instalador (sha256 `3efe41c4…`), blockmap e `latest.yml` (versão, tamanho e sha512 conferidos; o feed já mostra a 0.2.6). Sem intercorrências. O app instalado do usuário está na **0.2.5**.
- **Próximo passo (usuário):** atualizar 0.2.5 → 0.2.6 e dizer o que o aviso verde mostrou; depois, uma 0.2.7 para ver a janelinha nova.

### TASK-065 — Publicar a versão 0.2.5

- **Responsável:** DEV1
- **Status:** EM ANDAMENTO
- **Prioridade:** Alta — pedido do usuário em 2026-11-02 ("pode publicar")
- **Objetivo:** publicar a 0.2.5, que leva: botão de copiar fixo no canto da caixa (correção da TASK-057), aviso "atualizado" que agora traz o tempo com o app fechado e as etapas (correção da corrida de tempo, TASK-061), sem o círculo de contexto na linha de baixo do chat (TASK-063) e Clear e avisos iguais no chat e no terminal (TASK-064).
- **Passos:** versão 0.2.5; promoção dev1 → main; `npm run dist`; conferir o `latest.yml`; `gh release create v0.2.5`; o usuário atualiza (0.2.4 → 0.2.5).
- **O que ver nesta atualização (0.2.4 → 0.2.5):** como o app instalado é a 0.2.4, que já tem a janelinha com as etapas do instalador, o aviso verde ao reabrir deve trazer a divisão da espera ("o app ficou fechado por X: A até o instalador começar, B instalando e C até a janela voltar"). É o que fecha a TASK-061.
- **Feito até agora:** versão 0.2.5 no `package.json`; promoção dev1 → main (`9bb44fe`); Release **v0.2.5** publicado (https://github.com/rocruzta50IND/termix/releases/tag/v0.2.5) com instalador (sha256 `770a0e1e…`, igual ao publicado), blockmap e `latest.yml` (versão, tamanho e sha512 conferidos antes de enviar; o `latest.yml` da tag e o feed já mostram a 0.2.5); conferido dentro do pacote que o círculo de contexto saiu e que o auxiliar traz as etapas do instalador. Feito com `npm run dist` + `gh release create`, sem intercorrências. O app instalado do usuário está na **0.2.4**.
- **Próximo passo (usuário):** fechar e abrir o app instalado, atualizar (0.2.4 → 0.2.5), olhar a janelinha com o tempo e ler o aviso verde: deve trazer a divisão ("o app ficou fechado por X: A até o instalador começar, B instalando e C até a janela voltar"); depois conferir o botão de copiar no canto da caixa, o Clear pulsando e sem o círculo na linha de baixo do chat. Com isso fecham a TASK-065 e a TASK-061.

### TASK-061 — Publicar a 0.2.4 e medir de onde vêm os ~3 minutos da atualização

- **Responsável:** DEV1
- **Status:** EM ANDAMENTO
- **Prioridade:** Alta — pedido do usuário em 2026-11-02 ("levou mais ou menos 3 minutos… podemos ir para a 0.2.4?")
- **Objetivo:** (1) publicar a 0.2.4, para o app instalado (0.2.3) ver **ao vivo** a janelinha "Atualizando…" da TASK-056 durante a espera; (2) descobrir **onde o tempo vai**: o auxiliar agora também mede as etapas, e o aviso verde ao reabrir mostra o resumo ("o app ficou fechado por X: A até o instalador começar, B instalando e C até a janela voltar").
- **Feito até agora:** `src/update-helper.ps1` acompanha os processos do instalador (`installer`, `Au_`, `Un_A`, `Uninstall Termix`) e grava início e fim no registro; `src/update-helper.js` calcula as etapas (`beforeMs`, `installerMs`, `afterMs`); `src/renderer/app.js` mostra o resumo no aviso verde; versão 0.2.4. Testado com um instalador de mentira (um `installer.exe` que roda 8 s entre o fechamento e a volta do app): etapas medidas com ~1 a 2 s de erro.
- **Hipóteses para a espera (a confirmar com a medição):** o instalador desinstala a versão antiga e instala a nova arquivo por arquivo (o app é empacotado **sem asar**, milhares de arquivos soltos, e o antivírus examina cada um); o instalador é grande (~125 MB, compressão padrão); depois a restauração das abas. Se a maior parte for "instalando", vale testar empacotar com asar (hoje desligado de propósito, ver DECISOES) ou outra compressão; se for "até a janela voltar", o problema é a abertura do app.
- **Publicado:** promoção dev1 → main (`8dd3e89`) e Release **v0.2.4** (https://github.com/rocruzta50IND/termix/releases/tag/v0.2.4) com instalador (sha256 `439d3a49…`, igual ao publicado), blockmap e `latest.yml` (versão, tamanho e sha512 conferidos antes de enviar), com `npm run dist` + `gh release create`, sem intercorrências. O app instalado do usuário está na **0.2.3** (`D:\Nova pasta\Termix`). **Falta o usuário atualizar (0.2.3 → 0.2.4)**, ver a janelinha e passar o resumo do aviso verde.
- **Resultado do teste real 0.2.3 → 0.2.4 (usuário, 2026-11-02, com captura):** o aviso verde apareceu ("Termix atualizado para a versão 0.2.4 … levou **1 min 01 s**"), bem abaixo dos ~3 min anteriores, **mas sem o trecho "o app ficou fechado por…"**. Causa (confirmada no código e na máquina: o app abriu às 22:04:43, o registro do auxiliar não existia ainda): **corrida de tempo**. O app novo lia o registro do auxiliar uma única vez, logo ao abrir, e o auxiliar só grava o registro depois que enxerga a janela do Termix já na tela, alguns instantes depois. **Corrigido:** `src/updater.js` agora espera o registro por até 4 s (`update:just` assíncrono). Testado reproduzindo a corrida (registro gravado 2,5 s depois de o app abrir): o aviso passou a trazer "o app ficou fechado por 59 s: 8 s até o instalador começar, 43 s instalando e 8 s até a janela voltar". Observação: como o auxiliar que rodou nessa atualização era o da 0.2.3 (sem as etapas do instalador), a divisão por etapas só poderá aparecer na atualização 0.2.4 → 0.2.5. **Falta o usuário dizer se viu a janelinha** durante a espera.
- **Situação (após a 0.2.5):** a janelinha e a medição por etapas foram publicadas na 0.2.4; a divisão da espera só aparece no aviso da atualização **0.2.4 → 0.2.5** (a 0.2.3 → 0.2.4 usou o auxiliar antigo). Fecha junto com a TASK-065. **Falta o usuário dizer se viu a janelinha** e passar o resumo.
- **Passos:** versão 0.2.4; promoção dev1 → main; `npm run dist`; conferir o `latest.yml`; `gh release create v0.2.4`; o usuário atualiza (0.2.3 → 0.2.4), vê a janelinha e me passa o resumo do aviso verde.

## Aguardando validação DEV1

### TASK-119 — Modal "Novo projeto" maior, com modo de trabalho e permissão

- **Responsável:** DEV1
- **Status:** AGUARDANDO VALIDAÇÃO DO USUÁRIO (2026-11-09)
- **Pedido:** modais mais bonitos; o de criação ganha escolha entre Chat e Workflow (função futura) e a permissão já na criação.
- **Feito:** modal mais largo (660 px) com cartões de modo (Chat; Workflow "Em breve", desabilitado) e cartões visuais de permissão (Perguntar, com escudo; Automático, com raio e destaque laranja). A primeira aba do projeto novo é sempre um Chat com a permissão escolhida (terminal continua pelo "+" da barra). Ajuste pedido pelo usuário: só Chat/Workflow no modo. Também refeito o modal do botão direito no projeto: caminho, etiqueta de origem e ações em linhas com ícone e descrição (Abrir pasta, Renomear, Arquivar; Remover do app e Excluir pasta em vermelho).
- **Arquivos:** `src/renderer/app.js` (`newProjectFlow`, `addProject`, ícone `workflow`), `src/renderer/styles.css`.
- **Como validar:** + Novo projeto → escolher Chat/Terminal e a permissão → Criar; a primeira aba segue a escolha. Workflow aparece desabilitado.
- **Próximo passo:** o usuário aprova; depois, melhorar os outros modais (pedido: "melhorar os modais do app") e implementar o Workflow.

### TASK-105 — Chat: caixa de permissão (Permitir/Negar) não aparece; tudo que pede aprovação é negado

- **Responsável:** DEV1
- **Status:** AGUARDANDO VALIDAÇÃO DO USUÁRIO (implementada e testada em 2026-11-05; falta o teste do usuário no uso real; não publicada em versão)
- **Prioridade:** Alta — relatada pelo usuário em 2026-11-05: num projeto pediu ao chat para testar coisas, e o Claude respondeu que a sessão está em "modo não interativo", que não há onde exibir o prompt "Permitir?" e que tudo que pede aprovação é negado (exemplo: `claude mcp add playwright ...`). O usuário diz que no modo terminal também não funcionou (ver "Terminal" abaixo).
- **Causa (reproduzida em 2026-11-05 com o Claude Code 2.1.318):** `src/chat.js` sobe `claude -p --input-format stream-json` com `--permission-mode acceptEdits` (aba "Perguntar") ou `--dangerously-skip-permissions` (aba "Automático"). No modo `-p` não há tela para perguntar, e o app não passa `--permission-prompt-tool stdio`, então o Claude Code nega em silêncio tudo que exigiria aprovação (Bash fora da lista segura, `mcp add`, escrita fora do projeto etc.). O app só mostra o aviso "Negado: …" depois do fato (`src/renderer/chat.js:578`). Ou seja, o modo "Perguntar" hoje é "aceita edições e nega o resto", como a configuração descreve; a caixa de diálogo nunca foi implementada.
- **Teste que prova o caminho da correção:** com `--permission-prompt-tool stdio`, o Claude Code emite no stdout um evento `{"type":"control_request","request_id":…,"request":{"subtype":"can_use_tool","tool_name":"Bash","input":{…},"permission_suggestions":[…]}}` e **espera** a resposta no stdin: `{"type":"control_response","response":{"subtype":"success","request_id":…,"response":{"behavior":"allow","updatedInput":<input>}}}` (ou `behavior:"deny"` com `message`). Respondendo `allow`, o comando rodou e o resultado veio com 0 negações. Sem a flag, o mesmo pedido foi negado. (A flag não aparece no `--help`; vem do protocolo do SDK, então fixar a versão testada e tratar mudança futura.)
- **Correção (feita):** (1) `src/chat.js`: passar `--permission-prompt-tool stdio` nas abas "Perguntar"; repassar os `control_request` à tela e expor `respondPermission(tabId, requestId, decision)` que escreve o `control_response`. (2) Interface do chat: cartão na conversa com a ferramenta e o argumento (comando, arquivo, servidor MCP), botões **Permitir uma vez**, **Permitir sempre neste projeto** (usa `permission_suggestions`) e **Negar**; a aba fica em "Aguardando você" (já existe) e dispara a notificação "Precisa de você". (3) Tratar `can_use_tool` pendente quando a aba fecha, o processo cai ou o usuário dá Clear (responder deny e limpar o cartão). (4) Tratar o `control_cancel_request` e o tempo sem resposta. (5) Manter "Automático" como está (bypass) e deixar claro na interface qual modo a aba usa; atualizar `docs/DECISOES.md` (Permissões) e a descrição em Configurações > Chat.
- **Riscos:** o formato do `control_request` é do SDK e pode mudar entre versões do Claude Code; permissões "sempre" gravam regra em `.claude/settings.local.json` do projeto (confirmar com o usuário); vários pedidos simultâneos (fila); texto longo do comando no cartão (truncar com "ver tudo").
- **Terminal (a investigar, não confirmado):** a aba de terminal roda o Claude Code interativo, que tem o prompt próprio (`src/renderer/app.js:255` só acrescenta `--dangerously-skip-permissions` em abas "Dangerously"). Por isso a falha relatada no terminal **não tem causa conhecida ainda**. Perguntar ao usuário: qual projeto/aba, se a aba era Normal ou Dangerously (selo no rodapé), o que apareceu no lugar do prompt, e se a sessão tinha sido aberta como chat e depois alternada para terminal (mesma conversa). Só abrir correção separada com a causa reproduzida.
- **Como validar:** aba de chat em "Perguntar": pedir um comando que exige aprovação (ex.: `node -e` que grava um arquivo); o cartão aparece, **Permitir uma vez** executa, **Negar** devolve a negativa ao Claude, **Permitir sempre** não pergunta de novo no projeto; fechar a aba com pedido pendente não deixa processo preso; a notificação "Precisa de você" chega com o app em segundo plano.
- **Feito:** `src/chat.js` passa `--permission-prompt-tool stdio` nas abas "Perguntar" e ganhou `permit()` (escreve o `control_response`); IPC `chat:permit` (`main.js`, `preload.js`); `src/renderer/chat.js`: cartão (`k: 'perm'`) com **Permitir uma vez**, **Permitir sempre neste projeto** (ou "nesta sessão"/"todos os projetos", conforme o destino sugerido) e **Negar**; aba em "Aguardando você" com notificação "Precisa de você"; linha de status "Aguardando a sua permissão"; `control_cancel_request` e interrupção/reinício/queda do processo fecham o cartão como "Encerrado sem resposta"; `AskUserQuestion` é devolvido com a negativa para o Claude perguntar em texto; negações do cartão não geram aviso duplicado (só negação por regra); textos de Configurações > Chat, README e `docs/DECISOES.md` atualizados; CSS do cartão em `styles.css`.
- **Decisões:** o modo "Automático" não muda (bypass, sem cartões). O texto antigo "crie a aba em Automático" foi removido. "Permitir sempre" grava em `.claude/settings.local.json` do projeto (destino que o próprio Claude Code sugere), sem confirmação extra do app.
- **Arquivos tocados:** `src/chat.js`, `src/main.js`, `src/preload.js`, `src/renderer/chat.js`, `src/renderer/app.js` (texto), `src/renderer/styles.css`, `README.md`, `docs/DECISOES.md`, `docs/TASKS.md`, `docs/CHANGELOG_DEV.md`.
- **Testado (instância isolada por CDP, Claude Code real 2.1.318, 2026-11-05):** `npm run check`; pedir um `node -e` que grava arquivo: o cartão aparece com o comando, a descrição e os 3 botões; **Permitir uma vez** executa (x.txt criado, cartão "Permitido"); **Negar** impede (y.txt não criado, o Claude explica e não insiste, sem aviso duplicado); **Permitir sempre** grava a regra em `.claude/settings.local.json` e o mesmo comando não pergunta de novo; **Parar** com pedido pendente fecha o cartão ("Encerrado sem resposta") sem deixar nada pendente; selo na aba, toast e sino com o pedido. Não testado: vários pedidos ao mesmo tempo, comando muito longo, ferramentas MCP, `control_cancel_request` real, mudança do formato em outra versão do Claude Code.
- **Pendências:** (a) a falha **no terminal** segue sem causa conhecida; precisamos das respostas do usuário (aba Normal ou Dangerously, o que apareceu no lugar do prompt, se a conversa veio de um chat); (b) o chat ainda não mostra as perguntas com opções do Claude (`AskUserQuestion`): hoje ele volta a perguntar em texto; (c) o formato `control_request` é do protocolo do SDK e pode mudar em versões futuras do Claude Code.
- **Próximo passo:** o usuário testa no uso real (aba de chat em "Perguntar"); com a aprovação, fechar a tarefa e (se quiser) incluir na próxima versão publicada.

### TASK-089 — Publicar a versão 0.3.4

- **Responsável:** DEV1
- **Status:** AGUARDANDO VALIDAÇÃO DEV1 (Release publicado; falta o usuário atualizar 0.3.3 → 0.3.4)
- **Prioridade:** Alta — pedido do usuário em 2026-11-03: "suba a nova versão pro git" depois dos commits da TASK-084 (tela Consumo), TASK-080 (barra lateral), TASK-086 (nome gigante) e TASK-088 (modais). Pedido explícito, então vale como a confirmação de promover para a `main` e publicar.
- **Passos:** versão 0.3.4; promoção dev1 → main (fast-forward); `npm run dist`; conferir o `latest.yml`; `gh release create v0.3.4`; o usuário atualiza (0.3.3 → 0.3.4).
- **Entra nesta versão:** tela Consumo com tokens e custo reais (TASK-084), barra lateral com rolagem só nos projetos, avatares e "Novo projeto" fixo (TASK-080), limite de 60 caracteres no nome do projeto e modais que não estouram (TASK-086), modais fecham só por X ou Esc (TASK-088).
- **Feito até agora:** versão 0.3.4 no `package.json`; promoção dev1 → main (`d7bc79b`, fast-forward); instalador gerado (125.192.429 bytes, sha512 conferido com o `latest.yml`); Release **v0.3.4** publicado (https://github.com/rocruzta50IND/termix/releases/tag/v0.3.4) com o instalador, o `.blockmap` e o `latest.yml`.
- **Próximo passo:** o usuário atualiza o app instalado (0.3.3 → 0.3.4) e confirma; só então a tarefa fecha. Depois, discutir o pós-MVP (TASK-085 Workflow, TASK-087 modais, TASK-083 auditoria do MVP).
### TASK-081 — App atualizou mas o Windows bloqueou o Termix.exe (Smart App Control)

- **Responsável:** DEV1
- **Status:** AGUARDANDO VALIDAÇÃO DEV1
- **Prioridade:** Crítica — relato do usuário em 2026-11-03 (0.3.0 → 0.3.1): "o app atualizou mas não abriu, e quando eu abri o app foi bloqueado pelo Windows".
- **Causa (confirmada no log do Windows):** Smart App Control ativo (`VerifiedAndReputablePolicyState = 1`); o Code Integrity bloqueou o `Termix.exe` da 0.3.1 (eventos 3033/3077 às 08:48, 08:50 e 08:52, tanto pelo script de troca quanto pelo Explorer): "não atendeu aos requisitos de nível de assinatura". A troca em si funcionou (versão 0.3.1 instalada); o exe novo é que foi barrado. As versões anteriores passaram só depois de uma verificação na nuvem de 8–19 s (a "demora" da TASK-079).
- **Reparo imediato:** o `Termix.exe` da 0.3.0 (que o Windows já tinha liberado) foi colocado no lugar do bloqueado (o bloqueado ficou como `Termix.exe.bloqueado-0.3.1` na pasta instalada, pode ser apagado); o app 0.3.1 abre com ele.
- **Correção definitiva (0.3.2):** ver `docs/DECISOES.md` (TASK-081): exe fixo entre versões (`tools/after-pack.js` + `build-cache/Termix-shell.exe`) e o atualizador não troca o exe quando o motor é o mesmo (`KeepExe`).
- **Testado:** troca com `KeepExe` (o exe antigo permanece, o resto atualiza, o desinstalador fica); `npm run check`. Não testado: a atualização real 0.3.1 → 0.3.2 (a executa o app 0.3.1, que ainda não tem o `KeepExe`: ela troca o exe pelo casco fixo, que tem o mesmo conteúdo do exe que o Windows liberou).
- **Pendências:** assinatura de código (certificado) para o Windows de qualquer pessoa confiar no instalador e no exe; sem ela, um PC novo com Smart App Control pode bloquear o instalador.
()=>'- **Confirmado pelo usuário (2026-11-03):** o app abriu depois do reparo do exe. Publicada a 0.3.3 (sem mudança de código, só a versão) para o teste real do reinício rápido: como o app do usuário está na 0.3.1, a atualização vai direto 0.3.1 → 0.3.3 (executada pelo app antigo); o teste do reinício instantâneo de fato é 0.3.3 → 0.3.4.\n- **Próximo passo:** usuário atualiza e confirma que abre; depois publico a 0.3.4 para medir o reinício rápido.'


### TASK-079 — Reinício instantâneo ao clicar em Reiniciar agora (versão 0.3.1)

- **Responsável:** DEV1
- **Status:** AGUARDANDO VALIDAÇÃO DEV1
- **Prioridade:** Alta — pedido do usuário em 2026-11-03: "a intenção seria que ao clicar ele quase que instantaneamente reinicia o app… o máximo de UX e performance, sem exceção".
- **Medição (máquina do usuário, 0.2.9 → 0.3.0):** o script de troca terminou em 5 s, mas o `Termix.exe` só nasceu **19 s depois** do `Start-Process`. Reproduzido aqui: a primeira execução de um `.exe` recém-gravado leva ~8–9 s no Windows (verificação de segurança); depois de liberado, o app abre em 0,5–0,7 s, **mesmo depois de renomear a pasta** (a liberação segue a identidade do arquivo, não o caminho). `Termix.exe` muda a cada versão (recurso de versão), então a cópia sempre disparava a verificação.
- **Feito:** `src/updater.js` (pasta de preparo dentro da pasta instalada, `.update\<versão>`; depois de extrair, "aquece" o `Termix.exe` com `--version` em segundo plano, 0–85 % extraindo, 90 % aquecendo; marca `<versão>.primed`; clique em Reiniciar fecha o app em 350 ms; sem janelinha nem aviso do Windows nesse fluxo), `src/apply-update.ps1` (troca por renomeação com desfazer e cópia como reserva; sem esperas fixas; limpeza só depois de abrir o app). Versão 0.3.1. Decisão em `docs/DECISOES.md`.
- **Testado:** aquecimento + renomeação + abertura (0,6 s) numa cópia do app; script de troca ponta a ponta numa cópia da pasta instalada com a versão nova preparada: **encerramento → troca em ~0,5 s → `Start-Process` em 70 ms** (a versão da pasta mudou); `npm run check`. Não testado: a atualização real (ver abaixo).
- **Como validar:** o reinício mais rápido só vale quando o app **que está rodando** já tem este código: a 0.3.0 → 0.3.1 ainda usa o preparo antigo (cópia em `LOCALAPPDATA`, sem aquecimento); a **0.3.1 → 0.3.2** será o teste real (eu publico a 0.3.2 quando você estiver na 0.3.1). Esperado: clicar em Reiniciar agora e o app voltar em ~2–3 s.
- **Pendências:** a pasta `.update` (e `.old` por instantes) fica dentro da pasta instalada; uma desinstalação pode deixá-la para trás (inofensivo).

### TASK-071 — Sem a janelinha "Atualizando…" quando a troca leva segundos (versão 0.2.9)

- **Responsável:** DEV1
- **Status:** AGUARDANDO VALIDAÇÃO DEV1
- **Prioridade:** Média — pedido do usuário em 2026-11-02, com captura: a janelinha "Atualizando… em alguns minutos" ficava no canto até o fim.
- **Feito:** `src/updater.js`: no modo `swap` (TASK-069) o auxiliar da janelinha não é mais lançado ao clicar em Reiniciar agora; fica só o aviso "Reiniciando…" dentro do app antes de ele fechar. A janelinha continua no caminho antigo (instalador). Versão 0.2.9.
- **Importante para o teste:** o código que decide isso é o do app **que está rodando**; então a atualização 0.2.8 → 0.2.9 ainda lança a janelinha (por poucos segundos) e valida o chip e a troca; **só a 0.2.9 → 0.2.10 chega sem a janelinha**.
- **Publicado:** promoção dev1 → main; Release **v0.2.9** (https://github.com/rocruzta50IND/termix/releases/tag/v0.2.9), `latest.yml` conferido.
- **Testado:** `npm run check`. Sem teste real ainda.

### TASK-070 — Versão do app visível ao lado do nome, no cabeçalho (versão 0.2.8)

- **Responsável:** DEV1
- **Status:** AGUARDANDO VALIDAÇÃO DEV1
- **Prioridade:** Média — pedido do usuário em 2026-11-02: "colocar visível no app a versão dele… no top ao lado do título Termix".
- **Feito:** pílula pequena "v0.2.8" (fonte mono, cor discreta) ao lado de "Termix" no cabeçalho; a versão vem do processo principal (`app:version`, `app.getVersion()`), então sempre é a instalada. Arquivos: `src/main.js`, `src/preload.js`, `src/renderer/app.js`, `src/renderer/styles.css`. Versão 0.2.8, que também é a **primeira versão para testar o fluxo novo de atualização da TASK-069** (0.2.7 → 0.2.8).
- **Testado:** captura da instância isolada com "v0.2.7" ao lado do nome; `npm run check`.
- **Publicado:** promoção dev1 → main (`a6bed4b`); Release **v0.2.8** (https://github.com/rocruzta50IND/termix/releases/tag/v0.2.8), `latest.yml` conferido.
- **Como validar:** na 0.2.7 aparece o chip de atualização (Baixando → Preparando → Reiniciar agora); depois de reiniciar o cabeçalho mostra v0.2.8.

### TASK-069 — Atualização sem sair do app (barrinha no cabeçalho, preparar em segundo plano e reiniciar)

- **Responsável:** DEV1
- **Status:** AGUARDANDO VALIDAÇÃO DEV1
- **Prioridade:** Alta — pedido do usuário em 2026-11-02 (protótipo aprovado): "a atualização deve ocorrer na tela ainda do Termix… com animação de progresso… mostra uma mensagem para fechar e abrir de novo… enquanto o usuário ainda mexe".
- **Objetivo:** tirar a espera de ~1 min com o app fechado: a versão nova é baixada e **preparada com o app aberto**; no fim, o usuário reinicia quando quiser e a troca leva segundos.
- **Feito:** `src/updater.js` (estado `preparing`; extrai o instalador com o `7za`; modo `swap` ou, se falhar, `installer` como antes; `applyStaged`/`applyStagedOnQuit`), `src/apply-update.ps1` (espera o app sair, copia por cima com robocopy sem apagar nada, reabre se pedido), `src/update-helper.js` (`runDetachedScript`, com `spawnSync` do cmd intermediário para o script sobreviver ao app saindo no mesmo instante), `src/main.js` (gancho no fechamento e `quit` do app), `src/renderer/app.js` e `styles.css` (chip no cabeçalho com barrinha que atualiza no lugar, cartão e aviso de "Reiniciando…" por modo), `assets/7za.exe` (+ licença, via `extraResources`), `package.json`. Versão 0.2.7. Decisão registrada em `docs/DECISOES.md`.
- **Testado:** extração real do instalador 0.2.6 com o `7za` (3,4 s, 370 MB, versão conferida); script de troca com os 561 arquivos reais, pasta com espaços e o app saindo no mesmo instante (log "troca concluída", nada apagado); chip e cartão em instância isolada com `TERMIX_FAKE_UPDATE=1` (capturas de "Preparando" e "pronto"); `npm run check`. **Não testado ainda:** o fluxo inteiro numa atualização real (só dá para ver numa atualização **a partir da 0.2.7**, ou seja, 0.2.7 → 0.2.8; a 0.2.6 → 0.2.7 ainda usa o caminho antigo).
- **Como validar:** instalar a 0.2.7 (pelo caminho antigo); eu publico a 0.2.8 e o app aberto deve mostrar o chip (Baixando → Preparando → verde "Reiniciar agora") sem fechar; clicar em Reiniciar e ver o tempo do aviso "atualizado"; repetir fechando o app à mão para ver a troca sem reabrir.
- **Pendências:** a janelinha "Atualizando…" ainda aparece no Reiniciar (agora por poucos segundos); o registro do Windows continua com a versão da instalação original.
- **Publicado:** promoção dev1 → main (`874e6f2`); Release **v0.2.7** (https://github.com/rocruzta50IND/termix/releases/tag/v0.2.7), instalador sha256 `c2e091f6…`, `latest.yml` conferido; conferido dentro do pacote que o `7za.exe` e o `apply-update.ps1` vão junto e que o `7za` empacotado extrai o instalador.
- **Próximo passo:** usuário atualiza 0.2.6 → 0.2.7 (caminho antigo); depois eu publico a 0.2.8 (só uma versão nova qualquer) para o teste real do fluxo novo.


## Validadas em DEV1

### TASK-067 — Dica de nome dos ícones da barra lateral recolhida (aparecia cortada)

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 (aprovada pelo usuário; validada em: 2026-11-02)
- **Prioridade:** Média (visual) — pedido do usuário em 2026-11-02, com captura: "tire esse indicador ou melhore ele para ficar condizente e alinhado com o app; ele dá a sensação dos ícones do app shell estarem desalinhados (apenas o que fica lá embaixo em Geral)".
- **Causa:** a dica de nome (`::after` do `[data-tip]`) nascia **dentro** da barra lateral, que tem `overflow: hidden`: só aparecia uma lasca escura ao lado do ícone (o "indicador" da captura), que parecia uma peça solta e fazia os ícones parecerem fora de linha.
- **Feito:** `src/renderer/app.js` (`showSideTip`/`hideSideTip`) e `src/renderer/styles.css` (`#sidetip`): a dica agora é um elemento fixo **fora da barra** (nunca cortado), no estilo do app (fundo escuro, borda, cantos de 11 px, sombra suave), 10 px à direita do ícone e **centrada na linha dele**, com entrada curta (sem animação com "reduzir movimento"); some ao tirar o mouse, ao clicar, ao rolar e quando a barra é redesenhada. Valeu para todos os ícones da barra recolhida (projetos, Terminais/Plugins/Skills/MCPs, Novo projeto e Geral); a regra antiga em `::after` saiu.
- **Testado (CDP, mouse real, instância isolada):** os 10 ícones da barra recolhida: dica visível, texto correto, diferença de centro vertical 0,0 px em todos e sem ultrapassar a janela; some ao tirar o mouse; capturas de "Consumo" e "Configurações" conferidas. Não testado: barra recolhida com muitos projetos e rolagem.

### TASK-066 — Atualização que "não abriu mais", janelinha que sumia e ícones da barra lateral

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 (aprovada pelo usuário; validada em: 2026-11-02)
- **Prioridade:** Alta — relato do usuário em 2026-11-02 na atualização 0.2.4 → 0.2.5: "cliquei para atualizar, o app fechou e não abriu mais; abri e está na versão antiga, e a atualização está ali"; e, na mesma conversa, "os ícones não estão alinhados" (captura da barra lateral recolhida: velocímetro, link e engrenagem).
- **Investigação (com monitor de processos rodando durante a segunda tentativa do usuário):** a primeira tentativa falhou porque o app foi reaberto 2 min 18 s depois do clique, **no meio da instalação** (instalar levou 36 s; o total, 46 s): abrir o app durante a instalação a interrompe sem avisar e fica a versão antiga (a instalação antiga ficou **intacta**, todos os arquivos de 20:39). A segunda tentativa funcionou: clique 22:44:36, instalador `Termix-Setup-0.2.5.exe --updated /S --force-run` de 22:44:46 a 22:45:22, app novo às 22:45:21. E o monitor revelou o defeito que **escondia a janelinha**: o auxiliar existia às 22:44:36 e **sumia no mesmo instante em que o Termix fechava** (22:44:46): o instalador encerra o `Termix.exe` com `taskkill /T`, que leva embora todos os processos filhos, e o auxiliar era filho do Termix.
- **Corrigido:** (1) `src/update-helper.js`: o auxiliar agora é lançado por um `cmd.exe` intermediário (`start`) que sai logo em seguida, deixando o auxiliar órfão, fora da árvore do Termix; provado com um teste de controle (`taskkill /im ... /f /t`): lançamento antigo, auxiliar morre; lançamento novo, sobrevive. (2) `src/update-helper.ps1`: o texto da janelinha agora diz "Não abra o Termix de novo agora: isso interrompe a instalação" (e a janela ganhou altura). (3) **Trava na abertura**: `src/updater.js` (`holdForRunningInstaller`) e `src/main.js`: se há atualização pendente e o instalador (`Termix-Setup-*.exe`) ainda está rodando, o app abre uma caixa "O Termix está se atualizando… aguarde" com "Aguardar (fechar agora)" ou "Abrir mesmo assim", em vez de interromper a instalação; a detecção (`installerRunning`) foi testada com um processo de mentira. (4) **Ícones**: `src/renderer/app.js`: os três ícones de baixo da barra lateral (velocímetro, link e engrenagem) tinham desenhos de tamanhos diferentes (engrenagem ~15 px, link ~11,5 px); agora têm o mesmo peso visual (12,7 / 12,7 / 13 px) tanto na barra recolhida quanto na aberta. Todos os ícones já estavam no mesmo eixo (centro x igual; desvio do desenho < 0,5 px).
- **Observação sobre a aparência da janelinha em atualizações anteriores:** a janelinha nunca chegou a ser vista pelo usuário, por esse defeito. O aviso "atualizado" com as etapas da 0.2.5 também não pôde aparecer na 0.2.4 → 0.2.5 por ser o auxiliar antigo.
- **Testado:** controle do `taskkill /T` (antigo × novo), `installerRunning` ligado/desligado, janelinha com o texto novo (captura), `npm run check`, medição dos ícones antes e depois com capturas. **Não testado:** a caixa de "O Termix está se atualizando" numa atualização real (é diálogo nativo do sistema), e o efeito na atualização real: só dá para ver numa atualização **a partir de uma versão que já traga estas correções**.
- **Como validar:** publicada na 0.2.6 (TASK-068); atualizar 0.2.5 → 0.2.6 (ainda com o auxiliar antigo, que some) e, na próxima versão, ver a janelinha de verdade e o aviso com as etapas.
- **Pendências:** efeito real da janelinha só numa atualização a partir da 0.2.6. **Próximo passo:** TASK-068.

## Prontas

## Backlog

### TASK-115 — Integração com o Codex (OpenAI): avaliar e desenhar

- **Responsável:** A definir (DEV1 + usuário)
- **Status:** BACKLOG — tarefa de **conhecimento** (sem código); avaliação e desenho antes de qualquer construção.
- **Prioridade:** A definir (pós-MVP) — pedido do usuário em 2026-11-06. Verificado nesse dia que **não havia nenhuma tarefa** de Codex: só a decisão de produto "Claude Code primeiro; Codex e outras ferramentas depois" (`docs/DECISOES.md:7`), o item **Codex "Em breve"** desabilitado no menu do "+" (`src/renderer/app.js:1672`), o cartão "Planejado para uma próxima fase" em Configurações (`app.js:1495`) e a linha do README.
- **A avaliar (com testes reais, como nas TASK-105/109):**
  1. **Terminal:** como o Codex CLI sobe num PTY do Termix (instalação, caminho do executável, login, variáveis de ambiente, Windows nativo ou WSL), retomada de conversa pelo ID (o Termix retoma pelo ID do Claude Code) e onde ele grava as conversas.
  2. **Chat:** o Codex tem um modo programático parecido com o `claude -p --output-format stream-json` (eventos, entrada por stdin, interrupção)? Se não tiver, o chat do Codex pode ficar só em terminal no começo.
  3. **Permissões:** modos de aprovação e sandbox do Codex x o cartão Permitir/Negar do chat (TASK-105/109) e o selo de modo na aba.
  4. **Consumo e limites:** o Codex não manda a status line do Claude Code; de onde vêm contexto, limites e custo para o rail e a tela Consumo (ou o rail some/muda nas abas do Codex).
  5. **Projetos e abas:** como as abas de agentes diferentes convivem no mesmo projeto (ícone/selo por agente, notificações "terminou" e "precisa de você", Clear).
  6. **Plugins, skills e MCPs:** as telas hoje leem só o que o Claude Code enxerga (`docs/DECISOES.md`); o Codex tem os seus próprios (arquivos e CLI diferentes). Decidir se entram ou ficam fora.
  7. **Arquitetura:** hoje o código assume o Claude Code em vários pontos (`src/chat.js`, `findClaude`, wrappers de status line e hooks); avaliar uma camada de "agente" (um adaptador por ferramenta) antes de acrescentar a segunda.
- **Relacionada:** TASK-101 (Workflow ORQ e DEV: hoje só Claude; a pergunta aberta 3 trata de deixar espaço para Codex); TASK-111 (Hub: o Termix continua sendo o app dos agentes de programação).
- **Riscos:** o Codex muda rápido e o formato de saída pode não ser estável; custo e limites de outra conta/assinatura; dobra a superfície de teste do app; o time só usa Claude hoje, então validar se há demanda real antes de construir.
- **Próximo passo:** nenhum agora. Quando priorizada: instalar o Codex CLI, testar terminal e modo programático em instância isolada, e registrar o resultado antes de decidir a construção.

### TASK-114 — Chat: anexar arquivos arrastando (hoje só imagens entram)

- **Responsável:** A definir (DEV1 + usuário)
- **Status:** BACKLOG — para **avaliar depois**; falta reproduzir o relato com o usuário.
- **Prioridade:** Pós-MVP — pedido do usuário em 2026-11-06: ao arrastar um arquivo para o chat, ele não pega; hoje não dá para anexar arquivos no chat.
- **Causa provável (lida no código, não testada no app):** em `src/renderer/chat.js` (linhas 127–131) a colagem e o `drop` aceitam **só imagens** (`filter(f => /^image\//.test(f.type))`); qualquer outro arquivo é ignorado em silêncio, sem aviso. Não existe caminho para anexar arquivo que não seja imagem.
- **A avaliar:** (1) o que o usuário arrasta (`.md`, `.txt`, PDF, planilha, pasta?); (2) como entregar ao Claude Code no modo `-p` com `stream-json`: imagem vai como bloco da mensagem; para outros arquivos o caminho natural é **referenciar o caminho** no texto (o Claude lê com a ferramenta `Read`) e/ou copiar o arquivo para a pasta do projeto; (3) mostrar o anexo na caixa de mensagem (chip com nome e tamanho, remover) e na bolha enviada; (4) mínimo útil: **avisar** quando o arquivo solto não é aceito, em vez de ignorar; (5) segurança e custo: limite de tamanho, tipos, arquivo fora do projeto, executáveis, pastas; (6) se o arrastar também falha no modo terminal (não verificado).
- **Relacionada:** TASK-113 (botão que abre a pasta do projeto, onde também se poderia soltar arquivos).
- **Próximo passo:** nenhum agora; avaliar no pós-MVP, começando por reproduzir com o usuário e decidir o formato do anexo.

### TASK-113 — Botão no rail que abre a pasta do projeto (acesso rápido aos arquivos gerados)

- **Responsável:** A definir (DEV1 + usuário)
- **Status:** BACKLOG — escopo simplificado pelo usuário em 2026-11-06; ainda sem prioridade definida.
- **Contexto:** hoje não há atalho no app para achar o que o Claude gerou; o usuário vai à pasta do projeto pelo sistema. Foi avaliada uma lista própria dos arquivos gerados (fontes: conversas gravadas em `~/.claude/projects`, eventos do chat, vigilância de pasta; painel flutuante com pré-visualização só de leitura) e **descartada por ser complexa demais**.
- **Decisão do usuário (2026-11-06):** simples: **um botão no rail** que, ao clicar, **abre a pasta do projeto** (no Explorer do Windows); dali ele pega os arquivos e também pode **soltar arquivos** na pasta.
- **O que já existe:** a ação de abrir a pasta do projeto (`api.openFolder` → IPC `project:open` → `shell.openPath`, `src/main.js:414`, usada no menu do projeto em `src/renderer/app.js:1854`). A tarefa é só o botão no rail, para o projeto da aba em foco.
- **A definir no desenho:** onde fica o botão no rail e como convive com a cápsula de anéis e o esmaecimento (`docs/DESIGN.md`, Rail); ícone e dica ("Abrir a pasta do projeto"); aba de projeto sem pasta (mensagem em vez de falha silenciosa; `shell.openPath` devolve um texto de erro que hoje ninguém lê); se também deve existir no modo chat (o rail é igual nos dois modos, TASK-058).
- **Ideias que ficaram de fora (podem voltar):** lista dos arquivos gerados pelo Claude com pré-visualização; arquivos criados por comando; arrastar para fora do app.
- **Próximo passo:** priorizar com o usuário; é pequena (botão + ícone + documentação em `DESIGN.md`).

### TASK-112 — Automidia (app de redes sociais, Instagram primeiro): analisar o relatório dos testes do motor e validar a ideia do app

- **Responsável:** A definir (DEV1 + usuário)
- **Status:** BACKLOG — tarefa de **conhecimento** (sem código). Espera o usuário trazer o relatório.
- **Prioridade:** A definir — pedido do usuário em 2026-11-06. O usuário está montando um fluxo do **Claude com o Instagram** (o "motor") e quer, depois de validar que ele funciona, transformá-lo num app chamado **Automidia**: um controlador de redes sociais, só Instagram por enquanto. Ele ficaria num repositório próprio e, mais adiante, dentro do Rocruzta Hub (TASK-111).
- **O que fazer:** (1) o usuário traz o **relatório dos testes** do motor (como foi feito, o que abrangeu, o que funcionou e o que não); (2) analisar o relatório com ele: o que já está provado, o que falta provar, riscos (Graph API da Meta, conta Business/Creator, revisão do app pela Meta, tokens, limites de publicação, custo); (3) **validar com o usuário** se vale criar o app e qual é o recorte da primeira versão; (4) só então abrir as tarefas de construção (repositório próprio, `/fluxo:init`, stack, contrato com o hub).
- **Perguntas em aberto (levantadas em 2026-11-06):** o motor já existe e roda em que stack? O que ele faz hoje (gerar legenda/imagem, agendar, publicar, métricas)? Quem usa (só o usuário ou o time de 5)? O app será Electron como os outros ou web/local? O repositório pode ser privado (o hub precisaria de credencial para baixar) ou fica público? Segredos e tokens nunca vão para o repositório.
- **Não é:** desenvolvimento do app, nem mudança no Termix.
- **Próximo passo:** o usuário entrega o relatório; analisar e validar a ideia (esta tarefa) antes de qualquer construção.

### TASK-111 — Rocruzta Hub (app central que hospeda o Termix, o Automidia e outros): estruturar a ideia

- **Responsável:** A definir (DEV1 + usuário)
- **Status:** BACKLOG — tarefa de **conhecimento** (sem código). Ideia estruturada em 2026-11-06; a avaliação detalhada fica para depois da TASK-112.
- **Prioridade:** A definir — pedido do usuário em 2026-11-06: um app isolado, o **Rocruzta Hub**, com **repositório próprio**, que centraliza as ferramentas (Termix, Automidia e as futuras), cada uma também com **repositório próprio**, e permite alternar entre elas dentro do hub. **Todos do time baixam só o hub**; os apps ficam dentro dele.
- **Arquitetura proposta (a avaliar):** quatro peças, cada uma com repositório: (1) **Hub** — único instalador do time; barra lateral, **catálogo** de apps, instalador e atualizador dos apps (baixa o pacote do Release de cada repositório, confere o hash, guarda em `%APPDATA%\Rocruzta\apps\<app>\<versão>`), serviços compartilhados (notificações, configurações, login); (2) **Termix**, no repositório atual, vira app do catálogo; (3) **Automidia**; (4) **Contrato Hub ↔ App**, documento versionado no repositório do hub (manifesto do app, ciclo de vida, serviços do hub, versão do contrato) — a única coisa compartilhada entre os repositórios. Cada app publica o próprio Release; atualizar um app não exige novo hub.
- **Modelos de integração comparados:** A) lançador (apps em janelas próprias; barato, sem unidade visual); B) casca com apps hospedados (parece um app só, cada app com ciclo próprio; o Termix precisa aprender a rodar hospedado); C) plugins no mesmo processo (acopla os repositórios; descartado). **Recomendação:** começar pela **Fase 1** (hub instala, atualiza e abre cada app em janela própria, com aparência coordenada; o Termix entra sem mudança) já com o contrato desenhado para a **Fase 2** (modo hospedado: o `main.js` do Termix exporta um `start(host)` em vez de criar a janela; o hub fixa a versão do Electron e os módulos nativos como o `node-pty` precisam ser compilados para ela; cada app declara a versão do contrato que aceita). Embutir a janela de outro Electron dentro do hub não é suportado de forma limpa no Windows.
- **Fluxo de trabalho:** o mesmo em cada repositório (`/fluxo:init`, `WORKFLOW.md`, `TASKS.md`, IDs próprios; tarefa que cruza repositórios é citada como `hub#TASK-003`). O contrato tem dono: o hub. O hub precisa de "carregar app de uma pasta local" para desenvolver sem publicar Release. Uma sessão do Claude por repositório; o contexto compartilhado fica no contrato, não na conversa.
- **Riscos:** (1) repositório **público** (decisão atual do Termix, ver `docs/DECISOES.md`) x app do Automidia com regras e marketing da empresa — privado exige credencial no hub; (2) **Smart App Control**: os apps baixados pelo hub também são executáveis novos; testar cedo se o Windows bloqueia; (3) a Fase 2 mexe no Termix, que o time já usa: tarefa própria, com cuidado e modo opcional; (4) o hub não pode atrasar o pós-MVP do Termix.
- **Decisões que faltam (do usuário):** Fase 1 primeiro e Fase 2 depois? O hub tem interface própria (barra lateral, catálogo, configurações) ou é um menu fino? Aparência: glassmorphism do Termix ou design system da Rocruzta? O Termix continua com instalador próprio para quem não usa o hub? Privado ou público para o Automidia? Prioridade em relação ao pós-MVP do Termix.
- **Depende de:** TASK-112 (validar o motor e a ideia do Automidia antes de decidir a construção do hub).
- **Próximo passo:** nenhum agora. Retomar depois da TASK-112; então transformar em visão curta, rascunho do contrato e fases, e só aí abrir as tarefas de construção.

### TASK-110 — Termix não aparece no Snap Assist do Windows (encaixar ao lado de outra janela)

- **Responsável:** A definir (DEV1 + usuário)
- **Status:** BACKLOG — causa provável medida; correção ainda não feita.
- **Prioridade:** Baixa, pós-MVP — pedido do usuário em 2026-11-05, com um print: ao encaixar uma janela (Chrome) numa metade da tela, o Windows lista as outras janelas abertas para preencher a outra metade (Snap Assist), e o Termix não aparece na lista.
- **Medido (2026-11-05, janelas reais do Electron, estilos do Windows lidos com `GetWindowLongPtr`):** no modo **transparente** (padrão; é o do usuário, `bg: gradient`) a janela do Termix **não tem o estilo `WS_THICKFRAME`** (nem `WS_CAPTION`); no modo **Ofuscado** (`acrylic`) tem os dois. O Snap Assist e os atalhos de encaixe (Win+setas) dependem de a janela ser redimensionável pelo sistema, então a causa provável é essa. Não consegui observar o Snap Assist em si (é uma tela do sistema), então fica como **provável, não confirmada**.
- **Teste de correção simples (não resolve):** num app Electron isolado, janela `transparent: true, frame: false` com `thickFrame: true` e com `resizable: true` continuou **sem** `WS_THICKFRAME`; o Electron não entrega esse estilo a janelas transparentes no Windows.
- **Atalho hoje (a confirmar com o usuário):** trocar o fundo para **Ofuscado** em Configurações; a janela passa a ter `WS_THICKFRAME` e deve aparecer no encaixe. O visual muda (vidro fosco do Windows no lugar do degradê transparente) e a troca reabre o app.
- **Opções para o desenho:** (a) testar uma janela **sem** `transparent` e com `backgroundMaterial: 'none'`/cor sólida por trás do degradê (ganha `WS_THICKFRAME`; perde a transparência real do modo padrão); (b) adicionar `WS_THICKFRAME` por código nativo depois de criar a janela (exige um módulo nativo, como `koffi` ou um `.node`, e cuidado com o desenho da sombra/borda); (c) fazer o próprio app oferecer "Encaixar à esquerda/direita" (menu da barra de título) movendo e redimensionando a janela, sem depender do Snap do Windows (resolve o uso, não o Snap Assist); (d) aceitar a limitação e documentar o modo Ofuscado como o modo para encaixar.
- **Riscos:** mudar o tipo de janela mexe no visual central do app (glassmorphism), na sombra e nas bordas arredondadas; Win+setas e o botão de maximizar do Windows 11 (layouts de encaixe ao passar o mouse) devem ser testados junto; vale checar também com várias telas e escala de 125–150 %.
- **Como validar (depois):** encaixar o Chrome numa metade e ver o Termix na lista de sugestões; Win+seta esquerda/direita encaixa o Termix; maximizar, restaurar e arrastar continuam normais.
- **Próximo passo:** quando o usuário priorizar, confirmar se o Ofuscado serve de atalho e escolher entre (a), (b) e (c).

### TASK-108 — Pedido de permissão do chat pode passar despercebido (aviso fora da tela e notificação do Windows)

- **Responsável:** DEV1
- **Status:** BACKLOG — falha confirmada por teste; correção ainda não feita.
- **Prioridade:** Alta — levantada pelo usuário em 2026-11-05, depois da TASK-105: com o cartão de permissão, o pedido pode não aparecer para a pessoa (notificação do Windows ausente, resolução ou layout diferentes). Enquanto o pedido não é respondido, o agente fica parado.
- **Confirmado (instância isolada, Claude Code real, janela 900×480, foco emulado, 2026-11-05):** com o app em foco e a aba visível, se a pessoa rolou a conversa para cima enquanto o Claude trabalhava, o cartão nasce **fora da tela** (altura da conversa 958 px, janela de 238 px) e **não há nenhum aviso**: nem toast, nem som, nem notificação (0 eventos novos), e a linha "Aguardando a sua permissão" também fica fora da tela. O único sinal é o texto "Aguardando você" no canto da barra de abas. Causa no código: `chatScroll` só rola quando a pessoa está no fim (`c.stick`), e `notifyTab` (`src/renderer/app.js`) descarta o aviso quando o app tem foco e a aba está visível, mesmo com o cartão fora da vista.
- **Resolução pequena (confirmado):** a 760×520 o cartão cabe e os 3 botões ficam visíveis (quebram de linha); comando longo rola dentro do cartão (teto de 160 px). Sem problema de layout encontrado; falta testar telas muito baixas (altura < 450 px) e escala de 125–150 % do Windows.
- **Notificação do Windows (por leitura do código, `notify:show` em `src/main.js`):** só dispara com a janela **sem foco**; título até 80 e texto até 200 caracteres; **sem botões** (clicar só traz a janela e abre a aba; não leva até o cartão); depende de Configurações > Notificações (tipo "Precisa de você" e "Notificação do Windows" ligados) e do Windows aceitar o aviso: **Não incomodar / Assistente de foco**, notificações desligadas para o Termix ou o app sem identificação no menu Iniciar fazem o aviso sumir, e o app **não tem como detectar** isso. O que sobra nesse caso é o ícone piscando na barra de tarefas, o som, o selo no sino e o selo na aba. Não há lembrete: o pedido fica pendente para sempre.
- **Correção proposta:** (1) pedido novo **sempre** leva a conversa até o cartão (rola até ele mesmo com a pessoa no alto) ou, menos invasivo, mostra um botão fixo "Pedido de permissão ↓" sobre a caixa de mensagem; (2) `notifyTab` do tipo `perm` não é descartado quando o cartão não está visível (toast e som no app mesmo com foco); (3) clicar na notificação do Windows (e no toast/painel) abre a aba **e rola até o cartão**; (4) lembrete se o pedido continua sem resposta (ex.: após 2 min, depois a cada 5 min, enquanto o app estiver sem foco ou o cartão fora da vista), com contagem de pedidos pendentes na aba; (5) texto da notificação com o nome do projeto/aba e o comando (já tem a aba e ~100 caracteres do comando); (6) `docs/INSTALACAO.md`: seção curta para liberar as notificações do Termix e o Assistente de foco/Não incomodar; (7) **não** aprovar pela notificação do Windows (sem contexto e fácil de clicar sem querer): só avisar.
- **Perguntas abertas:** (1) rolar sozinho até o cartão ou só o botão fixo? (2) o lembrete repete até quando? (3) mostrar o pedido também no painel de notificações com "Ir para o pedido"?
- **Como validar (depois):** rolar a conversa para cima durante um pedido (o aviso aparece e leva ao cartão); app em segundo plano com a notificação ligada e depois com o Windows em Não incomodar (o ícone pisca e o lembrete chega); janela pequena e escala 150 %.
- **Próximo passo:** usuário aprova o desenho (perguntas 1 a 3) e DEV1 implementa.

### TASK-106 — Chat: permissões mais úteis (lista prévia por ferramenta/domínio e aviso ao trocar o modo) (avaliação e desenho)

- **Responsável:** A definir (DEV1 + usuário)
- **Status:** BACKLOG — só avaliação e desenho, **sem código** nesta tarefa.
- **Prioridade:** Média — vem do feedback de um chat do app, em 2026-11-05, depois da TASK-105. O cartão resolveu o "não pergunta"; sobraram dois pontos.
- **Ponto A — meio-termo entre "Perguntar" e "Automático" (lista prévia):** hoje o "Permitir sempre" cria a regra pedido a pedido, e o usuário precisa errar uma vez para liberar. Avaliar em Configurações > Chat (ou por projeto) uma lista de liberações definida antes: ferramentas de leitura (Read, Grep, Glob), `WebFetch`/`WebSearch` para domínios escolhidos, comandos de shell de leitura (`git status`, `node --version` etc.). Grava no mesmo `.claude/settings.local.json` ou em dado do app; cuidado para não virar um Dangerously disfarçado. Arquivos sensíveis (`.mcp.json`, `.claude/`) seguem só "uma vez", como o Claude Code decide.
- **Ponto B — a configuração só vale para chats novos:** quem troca Automático/Perguntar e continua na mesma aba acha que não funcionou (o texto pequeno em Configurações é o único aviso). Avaliar: aviso na hora da troca ("vale só para novos chats") e/ou botão "Aplicar a esta aba" (reinicia o processo do chat com o modo novo, retomando a conversa) e/ou seletor do modo no próprio rodapé da aba, junto do selo que já existe. Liga com o Backlog que já cogitou controles no rodapé (TASK-047 manteve só Chat/Terminal por decisão do usuário: reconfirmar).
- **Já tratado pela TASK-105 (não repetir):** cartão Permitir/Negar, mensagem de negação sem orientação enganosa, selo do modo no rodapé do chat (já existia).
- **Perguntas abertas:** (1) a lista prévia é global ou por projeto? (2) trocar o modo na aba atual reinicia o processo (perde o que está em andamento)? (3) o selo vira clicável para alternar?
- **Próximo passo:** quando o usuário priorizar, responder as perguntas e esboçar a tela.

### TASK-099 — Trazer o fluxo (tarefas, papéis, visão do time) para dentro do app: avaliação e desenho

- **Responsável:** A definir (DEV1 + usuário)
- **Status:** BACKLOG — só avaliação e desenho, **sem código** nesta tarefa.
- **Prioridade:** Média-alta — levantada pelo usuário em 2026-11-04.
- **Ideia central:** o fluxo-rocruzta existe para visualizar o que cada pessoa faz nos projetos. Manter essa ideia, mas nativa no Termix, como se o app controlasse: uma tela nova de gerência de projeto (quadro de tarefas por status, quem faz o quê, atividade das sessões, consumo por tarefa), com as tarefas controladas pelo app e não por arquivos Markdown lidos e reescritos pelo Claude.
- **Motivação:** suspeita do usuário de que o fluxo atual não atende bem o desenvolvimento e gasta mais tokens do que parece, às vezes criando tarefa sem necessidade.
- **Hipóteses de gasto a medir:** `/retomar` lê `CLAUDE.md`, `WORKFLOW.md`, `TASKS.md` (grande, com tarefas de 10+ linhas) e o changelog inteiros; cada tarefa reescreve vários campos, `TASKS.md`, `CHANGELOG_DEV.md` e commit; o hook de sessão injeta lista longa de tarefas; tarefas de "publicar versão" e similares viram entrada própria.
- **Direção a avaliar:** (1) tarefas em dado estruturado (JSON por projeto ou banco pequeno) em vez de Markdown longo; (2) o Claude recebe só um resumo curto da tarefa ativa e atualiza por comandos pequenos; (3) papéis e travas (ex.: DEV1 não consulta a dev2) passam a ser regra do app em vez de hooks de shell; (4) exportar para Markdown como visão legível/versionada no git.
- **Primeiros passos:** (a) **medir** o custo em tokens do fluxo atual (um `/retomar` e uma tarefa típica) antes de propor o desenho; (b) decidir as perguntas abertas abaixo; (c) esboçar o modelo de dados e a tela; (d) quebrar em tarefas de implementação.
- **Perguntas abertas:** (1) visibilidade entre pessoas: tempo real entre máquinas (precisa de sincronização: git, GitHub ou serviço) ou basta o estado por commit? (2) o fluxo continua como plugin para outros projetos da Rocruzta ou o app o substitui só dentro do Termix? (3) o que da regra atual do fluxo é essencial e o que é burocracia?
- **Próximo passo:** quando o usuário priorizar, começar pela medição de tokens.

### TASK-103 — Métrica de tokens como camada do app (avaliação e desenho)

- **Responsável:** A definir (DEV1 + usuário)
- **Status:** BACKLOG — só avaliação e desenho, **sem código** nesta tarefa.
- **Prioridade:** Alta — é o intuito central do app (controlar consumo); levantada pelo usuário em 2026-11-04. Camada **transversal**: TASK-102, 099 e 101 a consomem.
- **Ideia central:** em qualquer tela, mostrar quanto custa em tokens o que se está vendo ou fazendo (ex.: abrir o `TASKS.md` e ver quanto custaria o Claude lê-lo e relê-lo, considerando o cache). Hoje o controle de gasto é só histórico de contexto + Clear; estudar o que mais ganha ou acrescenta economia.
- **A avaliar:** (1) **estimativa, não medida exata**: regra aproximada (caracteres ÷ 3,5 a 4 em português), calibrada com o uso real que o Claude Code devolve por mensagem; (2) **efeito do cache**: primeira leitura / releitura com cache / escrita no cache, e quanto o item se repete por sessão e por semana (ex.: arquivo lido a cada `/retomar`); (3) **peso fixo no contexto**: o que fica no contexto durante a sessão pesa mais que a leitura pontual, então mostrar quanto do contexto atual está ocupado e por quê; (4) consumo **por tarefa**, por sessão e por projeto, com histórico.
- **Ideias de economia a estudar (além de histórico + Clear):** resumo curto da tarefa ativa no lugar do arquivo inteiro (liga com a TASK-099); carregar só o trecho relevante; escolher o modelo certo por tarefa (liga com a TASK-101); alerta antes do contexto ficar caro, sugerindo o Clear; histórico de consumo por tarefa para ver o que realmente custa.
- **Escopo de modelos:** por enquanto **só Claude e os modelos que ele fornece** (decisão do usuário em 2026-11-04).
- **Primeiros passos:** medir um caso real (`/retomar` + uma tarefa típica) comparando a estimativa com o uso devolvido pelo Claude Code; definir o que o app já recebe de uso por mensagem; esboçar onde a métrica aparece em cada tela.
- **Próximo passo:** quando o usuário priorizar, começar pela medição (a mesma da TASK-099).

### TASK-102 — Tela "Diff / Arquivos": árvore de arquivos, leitor e mudanças do Claude (avaliação e desenho)

- **Responsável:** A definir (DEV1 + usuário)
- **Status:** BACKLOG — só avaliação e desenho, **sem código** nesta tarefa.
- **Prioridade:** Média-alta — levantada pelo usuário em 2026-11-04. Parte visível da TASK-099 (o "fluxo app"); usa a métrica da TASK-103.
- **Ideia central:** tela que mostra a árvore de arquivos do projeto em que o Claude trabalha, com visualização ao lado e sub-abas: **Geral** (todos os arquivos), **Tasks** (arquivos de tarefas, renderizados de forma legível), **Changelog** (histórico do que foi feito, uma entrada por tarefa; responde "o que mudou e quando") e **Decisões** (por que é assim). Filtro para o que importa: o que o Claude está controlando e as decisões do que ele faz e como faz. No app nativo (TASK-099), essas abas seriam geradas dos dados estruturados do fluxo.
- **Nome:** "Diff" é diferente de navegador de arquivos. Proposta: uma tela só com duas visões, **Arquivos** (árvore, leitor, abas acima, Markdown bonito) e **Mudanças** (diff de verdade: o que o Claude alterou na sessão ou no commit, antes e depois). Considerar nome melhor ("Arquivos" ou "Código").
- **Métrica de tokens (TASK-103):** em algum canto, o custo para o Claude ler e reler o arquivo aberto, com cache e repetição por sessão.
- **A favor:** o app já conhece a pasta de cada projeto; o git dá os diffs (`git diff`, `git status`); o Markdown do chat já é renderizado; o app recebe os eventos de edição do Claude Code, então dá para filtrar "arquivos que o Claude tocou nesta sessão".
- **Riscos:** árvore grande (ler sob demanda; ignorar `node_modules`, `.git`, `dist`); atualização ao vivo com observador de arquivos só com a tela aberta; **somente leitura** no primeiro corte (editar pelo app conflita com o Claude escrevendo).
- **Perguntas abertas:** (1) juntar arquivos + mudanças na mesma tela e renomear? (2) filtro principal: "arquivos que o Claude tocou na sessão" ou "arquivos do fluxo" (recomendado: os dois, como abas)? (3) somente leitura no primeiro corte (recomendado)? (4) vale só para Projetos ou também para o Workflow (recomendado: os dois, com a aba "Fluxo" mais importante no Workflow)?
- **Próximo passo:** quando o usuário priorizar, responder as perguntas e desenhar a tela em `docs/DESIGN.md`.

### TASK-101 — Categoria "Workflow": projeto guiado com dois agentes fixos (ORQ e DEV) (avaliação e desenho)

- **Responsável:** A definir (DEV1 + usuário)
- **Status:** BACKLOG — só avaliação e desenho, **sem código** nesta tarefa.
- **Prioridade:** Média-alta — levantada pelo usuário em 2026-11-04. Ligada à TASK-099 (o app controlar o fluxo nativamente): as duas provavelmente viram um desenho único.
- **Ideia central:** nova categoria **Workflow** na barra lateral, ao lado de Projetos. O usuário cria um projeto nela e vê os plugins, skills e MCPs (com um conjunto padrão para o fluxo funcionar). Abre uma tela parecida com a atual, mas com **dois terminais/chat fixos, ORQ e DEV** (nomes editáveis), possivelmente com painéis de controle (fase, tarefas, consumo, o que cada agente faz). Ao entrar, o app pergunta o que vamos fazer; o brainstorm, as decisões e a arquitetura geram tudo o que o projeto precisa para seguir sozinho até o fim. O app controla contexto e tokens (Clear no momento certo, retomada com resumo curto) usando o que já existe: limites 5h/7d, Clear, retomada pelo ID, notificação de "terminou". Pode exigir mudar um pouco o layout do componente do appshell.
- **Vantagem esperada:** o **app** passa as mensagens entre os agentes (em vez de arquivos lidos pelo Claude), o que reduz o gasto de tokens suspeito na TASK-099.
- **Riscos a tratar no desenho:** (1) autonomia e custo: loop entre ORQ e DEV e consumo rápido do limite, então teto por ciclo, pausa acima de X% do limite, pontos de aprovação e botão de parar; (2) permissões do DEV (edita arquivos e roda comandos) sem virar um Dangerously solto; (3) o app precisa saber quando um agente terminou e o que entregou (formato de entrega que o app entenda; hoje só existe o "terminou" por hook); (4) controle de contexto: quando dar Clear e o que entra no resumo (resumo que perde decisão faz o projeto derivar); (5) escopo grande: é um produto dentro do produto.
- **Delegação por modelo (acrescentado em 2026-11-04):** o ORQ (modelo mais forte) delega a tarefa ao chat ao lado e define **qual modelo** ele usa conforme a tarefa (tarefa mecânica → modelo menor e mais barato; arquitetura e decisão → o maior). **Escopo: só Claude e os modelos que ele fornece**; outros fornecedores (Codex etc.) ficam fora por ora. Atenção: o ORQ classificar a tarefa já gasta tokens; avaliar **regras fixas aplicadas pelo app** (tarefa tipo X usa modelo Y) como começo e o ORQ decidindo depois. O ORQ gerir o próprio contexto (resumo e Clear) é arriscado: guardar as decisões em dado estruturado fora do contexto e o app conferir. Usa a métrica da TASK-103.
- **Faseamento sugerido:** (a) tela com ORQ/DEV fixos e mensagens manuais entre eles; (b) o app repassa as mensagens com aprovação a cada passo; (c) autonomia com freios.
- **Perguntas abertas:** (1) o brainstorm é conduzido pelo ORQ no chat (recomendado, com o app fornecendo modelos) ou por um assistente guiado do app (formulários)? (2) o usuário aprova a cada ciclo (ORQ planeja → aprova → DEV executa) ou o fluxo roda até um ponto de parada que ele define? (3) ORQ e DEV são sempre Claude Code ou o desenho já deixa aberto para Codex e outros? (4) papéis fixos em dois ou o Workflow pode crescer para mais agentes (ex.: revisor)?
- **Primeiros passos:** decidir as perguntas; juntar o desenho com o da TASK-099 (modelo de dados das tarefas e papéis); esboçar a tela e as fases em `docs/DESIGN.md`/`docs/DECISOES.md`; quebrar a fase (a) em tarefas de implementação.
- **Próximo passo:** quando o usuário priorizar, responder as perguntas abertas.

### TASK-100 — Tela "Hardware": consumo do computador e por aba/projeto (avaliação e desenho)

- **Responsável:** A definir (DEV1 + usuário)
- **Status:** BACKLOG — só avaliação e desenho, **sem código** nesta tarefa.
- **Prioridade:** Média — levantada pelo usuário em 2026-11-04.
- **Ideia central:** tela nova "Hardware" com as métricas de consumo do próprio computador da pessoa, trazendo os dados relevantes. Motivo concreto: vários agentes de IA rodando juntos pesam no PC (TASK-072 mediu o app em 402 MB vazio e 573 MB com 8 abas; o peso vem dos processos do Claude Code).
- **Dados candidatos:** CPU (total, por núcleo, histórico curto), memória (usada/livre, arquivo de paginação), disco (espaço livre por unidade, leitura/escrita; liga com a TASK-090), GPU (uso e memória, se a leitura for simples; NVIDIA via `nvidia-smi`), rede (envio/recebimento), bateria/energia em notebook. Temperatura fica fora do primeiro corte (no Windows costuma exigir programa de terceiros ou administrador).
- **Diferencial a avaliar:** consumo **por aba e por projeto** (o Termix sabe quais processos pertencem a cada aba), apontando qual agente está pesando; avisos quando a máquina estiver no limite. Sem isso a tela só repetiria o Gerenciador de Tarefas.
- **Custo e riscos:** ler o sistema só com a tela aberta e em intervalo de 2 a 3 s; módulos nativos do Node (`os`, `process`) dão CPU, memória, rede e bateria sem dependência; disco por unidade e GPU pedem PowerShell/CIM ou biblioteca (ex.: `systeminformation`), que aumenta o instalador, então medir antes de escolher.
- **Perguntas abertas:** (1) informativa ou também ativa (avisos como "memória acima de 90%", ligados às notificações existentes)? (2) a atribuição por aba/projeto entra no primeiro corte (recomendado: sim)? (3) visual igual ao da tela Consumo (anéis e gráficos em glassmorphism) ou painel mais técnico?
- **Primeiros passos:** decidir as perguntas; medir o custo de coleta (CPU/memória do próprio app lendo os dados) com as opções de fonte; esboçar a tela em `docs/DESIGN.md`; quebrar em tarefas de implementação.
- **Próximo passo:** quando o usuário priorizar, responder as perguntas abertas.

### TASK-095 — Teste de verdade: instalar em outro PC do time pelo guia do GitHub

- **Responsável:** A definir (usuário + um colega)
- **Status:** PARCIALMENTE FEITA (2026-11-04). **Provado num PC real (Windows 11, Smart App Control em Avaliação):** instalação pelo guia da 0.3.5 (SmartScreen com "Executar assim mesmo"), primeira abertura mais lenta e depois normal, e atualização automática 0.3.5 → 0.3.6 sem ajuda. **Ainda sem prova:** PC com Smart App Control **Ativado** (bloqueio e desligamento), Windows 10, mensagem "Claude Code não foi encontrado" e antivírus da empresa. Fica no Backlog para quando um colega nessa situação puder testar.
- **Prioridade:** Alta — é a única prova de que o guia funciona fora da máquina do desenvolvedor.
- **Como fazer:** o colega segue só o `docs/INSTALACAO.md` da `main` no GitHub: (1) vê o estado do Smart App Control; (2) se **Ativado**, desliga conforme o guia; (3) baixa o instalador do Release mais recente e instala; (4) abre, cria um projeto e abre um chat/terminal; (5) numa aba sem o Claude Code instalado, confere a mensagem "Claude Code não foi encontrado"; (6) na versão seguinte, confere a atualização pelo chip do cabeçalho.
- **Registrar:** versão testada, Windows (10/11), estado do Smart App Control antes/depois, antivírus, o que o colega estranhou no guia. Corrigir o guia com o resultado e tirar o aviso "ainda sem teste" do rodapé. Se algum PC **não** puder desligar o Smart App Control, reavaliar assinatura gratuita (p. ex. SignPath) em vez de pagar certificado.
- **Também pendente:** atualização 0.3.4 → 0.3.5 no app instalado do usuário (fecha a TASK-094/089); alternativa por PowerShell para desligar o Smart App Control só depois de um colega confirmar que funciona num PC real; nota no guia de que o instalador usa o C:.

### TASK-096 — Restante da auditoria do MVP (itens B, C e D) e relatório

- **Responsável:** A definir
- **Status:** BACKLOG (o que não foi feito da TASK-083)
- **Prioridade:** Média — fazer antes de qualquer 1.0.
- **B (UX):** aba Web, chat em estados de erro, modais, notificações com a janela estreita, DPI alto e mais de um monitor, teclado e foco, muitos projetos; achados menores já vistos: mapa de calor do Consumo cortado em 800 px de largura e bandeja de sub-abas mostrando 2 de 4 ícones em 500 px de altura; a TASK-093 numa tela física pequena.
- **C (performance):** 10 a 15 abas e uso por horas, medindo memória e CPU (reavaliar TASK-075, 076, 073, 077).
- **D (segurança e privacidade):** o que o app lê e grava (`%APPDATA%\Termix`, `~/.claude`), modo Dangerously, segredos no repositório público e no histórico, permissões do instalador.
- **Entregável:** `docs/AUDITORIA_MVP.md` com achados por gravidade.

### TASK-087 — Refatoração de design dos modais (pós-MVP)

- **Responsável:** A definir
- **Status:** BACKLOG (pós-MVP)
- **Prioridade:** Média-baixa — pedido do usuário em 2026-11-03: aprimorar o design do modal "Gerenciar projeto" para condizer com o app e **estender a refatoração a todos os modais com a mesma cara** (caixa escura com título, texto e fileira de botões em pílula).
- **Escopo:** inventariar todos os modais (`modal()` em `app.js` e `chat.js`: gerenciar/renomear/arquivar/remover projeto, novo projeto, importar conversas, Clear, Dangerously, confirmações, editor de skill, atualização etc.) e propor um desenho único no glassmorphism do app: cabeçalho com ícone/avatar do projeto, hierarquia de título e subtítulo, caminho em bloco copiável, ações **agrupadas por importância** (primária, secundárias e destrutivas separadas e com confirmação), em vez da fileira de pílulas que quebra em duas linhas; o foco inicial nunca em botão destrutivo (hoje o "Gerenciar projeto" abre com "Remover do app" focado); foco, teclado e "reduzir movimento"; tamanhos por tipo (confirmação curta, formulário, editor).
- **Já resolvido antes (TASK-086):** modais não estouram com texto longo e o nome do projeto tem limite de 60 caracteres. Aqui é só o **visual**.
- **Pronto quando:** protótipo aprovado pelo usuário, aplicado a todos os modais com capturas do conteúdo do app (CDP), `docs/DESIGN.md` atualizado.
### TASK-085 — Categoria "Workflow" na barra lateral (pós-MVP, validar a ideia)

- **Responsável:** A definir
- **Status:** BACKLOG (pós-MVP) — ideia a validar, não implementar ainda
- **Prioridade:** Baixa — pedido do usuário em 2026-11-03: "adicione uma categoria nova no appshell, Workflow, que iremos ver depois (task pós-MVP, validar a ideia desta função)".
- **O que é:** uma nova categoria na barra lateral (aberta e recolhida) chamada **Workflow**. O conteúdo ainda não está definido: a primeira etapa é **conversar e validar a ideia** (para que serve, quem usa, se é por projeto ou geral, se encaixa no fluxo DEV1/DEV2 e nos agentes) antes de qualquer desenho ou código.
- **Perguntas para a validação:** é uma tela por projeto (como Plugins/Skills/MCPs) ou geral (como Consumo)? Mostra o fluxo de tarefas (`docs/TASKS.md`), automações/rotinas, ou encadeia agentes? Precisa de dados novos ou só lê o que já existe? O que seria o MVP dela?
- **Lugar reservado:** a organização da barra da TASK-080 já separa cabeçalho / lista de projetos / rodapé "Geral"; o Workflow entra como item de projeto (junto das subtelas) ou do rodapé conforme a resposta acima.
- **Pronto quando:** a ideia estiver validada e registrada em `docs/DECISOES.md`, e então virar tarefa de implementação.
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

- **Acrescentado pela auditoria da TASK-072:** hoje só existem Ctrl+`, Ctrl+L (na Web) e Escape. Faltam próxima/anterior aba (Ctrl+Tab), Alt+1..9, nova aba e fechar aba (sem colidir com o shell dentro do xterm); busca (`@xterm/addon-search`) e links clicáveis (`@xterm/addon-web-links`) no terminal.
- **Responsável:** A definir
- **Status:** BACKLOG
- **Prioridade:** Média
- **Objetivo:** Ctrl+T/W/Tab/1..9, Ctrl+F no terminal, links clicáveis e paleta de comandos.

### TASK-011 — Consumo por sessão e alertas de limite

- **Responsável:** A definir
- **Status:** BACKLOG
- **Prioridade:** Média
- **Objetivo:** tokens/contexto/custo por sessão, histórico de 5h e 7d, alerta em 80%/90% e previsão de quando o limite zera.

### TASK-073 — Acessibilidade e alvos de clique (da auditoria da TASK-072)

- **Responsável:** A definir
- **Status:** BACKLOG
- **Prioridade:** Média
- **Objetivo:** alvos de 28–30 px nos controles mais usados (rodapé Terminais/Web/Clear/Reiniciar/engrenagem: 26 px; fechar aba: 22 px e invisível até o hover; cores da aba: 20 px); o fechar da aba virar `<button>` irmão focável por teclado, com `aria-label`; `.pm` do projeto visível com foco (`:focus-within`); estado da aba também em texto/`aria-label` (hoje só a cor do ponto); `title` do Clear desabilitado com o motivo.

### TASK-074 — Chat: histórico longo, imagens e feedback (da auditoria da TASK-072)

- **Responsável:** A definir
- **Status:** BACKLOG
- **Prioridade:** Média
- **Objetivo:** renderizar só os últimos 60–100 itens do histórico (botão "Mostrar anteriores") ou `content-visibility:auto`; liberar/reduzir imagens coladas depois do envio (hoje ficam na memória); estado "Carregando conversa…" e erro em `chat:history` (hoje mostra "Nova conversa" por engano); a mensagem aparecer e o "pensando" começar antes do spawn do processo (e devolver o texto à caixa se falhar); botão "ir para o fim" ao rolar para cima durante a resposta; avaliar renomear a permissão "Perguntar" (só aceita edições; o resto é negado) — decisão de produto.

### TASK-075 — Abertura mais rápida e restauração das abas (da auditoria da TASK-072)

- **Responsável:** A definir
- **Status:** BACKLOG
- **Prioridade:** Média
- **Objetivo:** liberar a interface assim que a aba ativa subir (as outras restauram por trás; hoje o splash espera todas, 4–8 s com 10+ abas; decisão de design a rever); criar o PTY já no tamanho real do terminal (hoje nasce em 80×24 e é redimensionado); `folderExists` em paralelo; carregar o `node-pty` e o dock da Web sob demanda; migração do Vitra copiar só `state.json`, o backup e `metrics` (hoje copia os caches do Chromium); reaproveitar a leitura do `state.json` do `createWindow`.

### TASK-076 — Hooks e status line mais leves (da auditoria da TASK-072)

- **Responsável:** A definir
- **Status:** BACKLOG
- **Prioridade:** Média (envolve decisão de produto)
- **Objetivo:** o hook `PostToolUse` é síncrono (o Claude Code espera) e interpreta o JSON inteiro da resposta da ferramenta, que pode ter MBs; sem Node no PATH cada chamada sobe um Electron inteiro (~150–400 ms). Opções: passar o evento como argumento e gravar só `{t,event}`, verificar `"async": true` nesse hook, ou tirar o `PostToolUse` se só serve para limpar "atenção"; guardar o comando original da status line por aba (em vez de ler 3 `settings.json` a cada atualização).

### TASK-077 — Varreduras de disco e IPC (da auditoria da TASK-072)

- **Responsável:** A definir
- **Status:** BACKLOG
- **Prioridade:** Baixa/Média
- **Objetivo:** trocar os 3 temporizadores (0,3 s, 0,3 s e 1,5 s) por um `fs.watch` da pasta de métricas; `sessions:scan` e `chat:history` assíncronos, com pré-filtro antes do `JSON.parse` e cache por data/tamanho (hoje até ~0,3–1 s de main travado com ~200 conversas); `git:branch` com cache de 5 s; no máximo 2–3 contextos WebGL (trocar de aba recria o contexto); `web:snapshot` em JPEG; `pty:data` com controle de fluxo; `claude mcp list` com `taskkill /T` no timeout (deixa processos órfãos); `claudeJsonEdit` com espera assíncrona.

### TASK-078 — Polimento de UX (da auditoria da TASK-072)

- **Responsável:** A definir
- **Status:** BACKLOG
- **Prioridade:** Baixa
- **Objetivo:** confirmar uma vez (com a contagem) em "Fechar outras guias/à direita" e "Restaurar padrões"; toast também para erros que não são de aba (hoje só o selo do sino); alternar "Sim/Não" das Configurações sem refazer a página (perde o foco); roxo remanescente (cursor e seleção do terminal, cor padrão de evento, palavras-chave do chat) contra a regra "sem roxo" do DESIGN; vocabulário único ("aba" × "guia" × "sessão"; traduzir "Rail" e "Dangerously"); "Nenhum(a) skill encontrado(a)"; esconder as colunas Tokens/Custo "indisponível" da página Consumo; `backdrop-filter` do modal sobre terminais.

## Concluídas

### TASK-118 — Publicar a versão 0.3.8 (Clear instantâneo com resumo nativo)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (validada pelo usuário no app instalado em 2026-11-09; Release v0.3.8 publicado em 2026-11-09: https://github.com/rocruzta50IND/termix/releases/tag/v0.3.8; instalador 125.196.500 bytes, sha512 conferido com o `latest.yml`; promoção dev1 → main `21adec6`; feed público já mostra 0.3.8). Pedido explícito do usuário: "pode subir a release", depois de validar a TASK-117 no uso real. Ficou bloqueada por algumas horas no instalador (ver "Problema"), resolvida com o usuário desligando o Smart App Control.
- **Prioridade:** Alta — leva o novo botão Clear ao time.
- **Entra nesta versão:** TASK-117 (Clear com resumo nativo, modelo do resumo editável em Configurações), TASK-116 (DEV2 no fluxo) e as tarefas de documentação do Backlog (111 a 115).
- **Passos:** versão 0.3.8 (`package.json` e `package-lock.json`); promoção dev1 → main (fast-forward); `npm run dist`; conferir o `latest.yml` (versão, tamanho, sha512); `gh release create v0.3.8`.
- **Problema:** `npm run dist` falha na etapa do NSIS (`computeScriptAndSignUninstaller`) com `spawn UNKNOWN`, e deixou um instalador de 356 KB (só o stub), sem `latest.yml` novo; os parciais foram apagados. É o mesmo erro (`UNKNOWN`) que, na mesma máquina e no mesmo dia, o Windows deu ao tentar rodar o Electron de `node_modules` ("uma política de Controle de Aplicativo bloqueou este arquivo"). A 0.3.7 foi gerada aqui em 2026-11-05, então a política mudou depois. **Causa confirmada** (registro de eventos Code Integrity, ids 3033/3077, às 11:48 e 11:52): o **Smart App Control está LIGADO** (`VerifiedAndReputablePolicyState = 1`; na TASK-081/097 estava em "Avaliação", então passou a bloquear depois dos testes de 05/11) e barra o `node.exe` ao carregar o instalador recém-gerado `dist\Termix-Setup-0.3.8.exe` (não assinado), que o electron-builder executa para montar o desinstalador. O mesmo bloqueio atinge o `electron.exe` de `node_modules`. O `npm run dist` rodado no terminal do usuário (pela sessão) deu o mesmo erro. Não foi feita nenhuma tentativa de contornar a política.
- **Solução (decisão do usuário, 2026-11-09):** entre as opções (GitHub Actions, outro PC, assinar o código, desligar), o usuário **desligou o Smart App Control** pelo Windows (irreversível sem reinstalar o Windows; confirmado: `VerifiedAndReputablePolicyState = 0`). Com isso `npm run dist` gerou o instalador (125.196.500 bytes, sha512 igual ao do `latest.yml`, pacote com `src/handoff.js`) e o Release saiu com instalador, `.blockmap` e `latest.yml`. **Fica no Backlog para pensar:** assinar o código (resolve também o bloqueio nos PCs do time, TASK-081) e/ou build por GitHub Actions.
- **Fechamento:** usuário validou ("tarefa validada pode finalizar"). Sem pendências.

### TASK-117 — Clear instantâneo com resumo nativo (Confirmar, limpa e volta com o contexto, sem reler o projeto)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (aprovada pelo usuário em 2026-11-09 depois do uso real: loop de tarefas, clicando em Clear ao fim de cada uma e perguntando "onde paramos"; o agente respondeu certo nas 3 tarefas; publicada na 0.3.8, TASK-118; promovida para a `main` em 2026-11-09 na versão 0.3.8)
- **Prioridade:** Alta — pedido do usuário: o Clear hoje manda um pedido de fechamento ao Claude, limpa e manda outro pedido de retomada (2 modais possíveis, 2 turnos do Claude). Ele quer clicar, confirmar, o chat limpar na hora e voltar ligeiro, sem o Claude reler o projeto.
- **Medido hoje (29 conversas do Termix, 2026-11-09):** `/retomar` mediana ~84 mil tokens de entrada nova (inclui o prompt-base de ~30 mil), 6 chamadas ao modelo, ~1,9 mil de saída (24 ocorrências); fechar a tarefa ~8 mil de entrada e ~4,9 mil de saída, 6 chamadas (só 5 ocorrências). A seção "Em andamento" do `TASKS.md` tem 15 tarefas (~12 mil tokens), então "ler só o ativo" não é enxuto.
- **Desenho (simples):** Clear = um modal com **Confirmar**. O app monta sozinho um resumo curto (último pedido do usuário, fim da última resposta, arquivos alterados na conversa, `git status` e últimos commits, tarefa ativa quando o projeto tem `TASKS.md`), limpa e entrega o resumo à conversa nova **sem turno do Claude**: chat por `--append-system-prompt`; terminal pelo hook de início de sessão após o `/clear`. O fluxo antigo ("Fechar a tarefa e limpar") foi **removido** por decisão do usuário (2026-11-09); o `/encerrar-tarefa` continua existindo para fechar a tarefa.
- **Controle que deve ser mantido:** só vale com o agente parado; pulsa ao atingir o limite de CTX; GERENTE (somente leitura) pode limpar; medição de custo da retomada visível; Configurações > Clear.
- **Fora de escopo (fica no Backlog se surgir):** registro contínuo durante o trabalho, memória de problemas/decisões, `PROJETO.md` na criação do projeto, tarefas em dado estruturado (TASK-099), GitHub no app.
- **Como validar (depois de construir):** mesma tarefa de teste em `claude -p` isolado, retomada de hoje × retomada nova, 5 a 8 repetições: tokens de entrada/saída, chamadas, releituras de arquivo, perguntas repetidas, resultado verificável.
- **Feito até agora (2026-11-09):** `src/handoff.js` (gera o resumo em ~80 ms, ~2,2 mil caracteres ≈ 650 tokens: últimos 3 pedidos, fim da última resposta, arquivos alterados dentro do projeto, `git status`/`log`, entrada da tarefa ativa só com Status/Pendências/Próximo passo); IPC `handoff:prepare` e `handoff:drop` (`main.js`, `preload.js`); chat: `--append-system-prompt-file` na subida do processo novo (`chat.js`); terminal: o `hook-wrapper.js` entrega o resumo no `SessionStart` com `source: clear` e apaga o arquivo; interface: modal "Limpar o contexto?" só com **Cancelar** e **Confirmar** no terminal e no chat, nota no chat e no sino com o tamanho do resumo. **Ajuste pedido pelo usuário (2026-11-09):** saiu "Fechar a tarefa e limpar" e todo o modelo antigo (pedidos de fechar/retomar, `TERMIX-CLEAR-OK`, medição da retomada, toggles de fluxo/commit); em Configurações > Botão Clear a tela mostra o **modelo completo do resumo** (marcadores `{{PROJETO}}`, `{{PEDIDOS}}`, `{{RESPOSTA}}`, `{{ARQUIVOS}}`, `{{GIT}}`, `{{TAREFA}}`), editável, com **Restaurar o padrão do Termix** (enquanto igual ao padrão, acompanha melhorias do app) e "apagar tudo = só limpar, sem resumo"; o padrão vem de `src/handoff.js` (`DEFAULT_TEMPLATE`, IPC `handoff:template`). Configurações antigas salvas são descartadas ao abrir (fica só o limite de pulso e o modelo).
- **Testado:** `npm run check`; gerador contra uma conversa real do projeto; chat (`claude -p` com o arquivo): o agente respondeu a chave que só existia no resumo; encaminhador de hook isolado (clear imprime e apaga; startup/Stop em silêncio); **terminal real** (Claude Code interativo via PTY, `/clear` e pergunta): o agente respondeu a chave do resumo entregue pelo hook. Armadilha achada: as barras invertidas das regex se perderam numa edição por script; corrigido (`[^\w-]`).
- **Arquivos tocados:** `src/handoff.js` (novo), `src/main.js`, `src/chat.js`, `src/hook-wrapper.js`, `src/preload.js`, `src/renderer/app.js`, `src/renderer/chat.js`, `package.json` (check), `docs/TASKS.md`.
- **Comparação de custo (2026-11-09, `claude -p` em Sonnet, só leitura, na pasta do projeto, sem gravar histórico; 1 aquecimento + 3 repetições, ordem intercalada; mediana):** retomada de hoje US$ 0,072, 6 chamadas ao modelo, 4 ferramentas (3 leituras do `TASKS.md`), 1,6 mil tokens de saída, contexto final 46,1 mil; sem retomada (controle) US$ 0,031, 2 chamadas; **resumo nativo na primeira mensagem US$ 0,008, 1 chamada, 0 ferramentas, 342 de saída, contexto final 36,6 mil**; resumo nativo no prompt de sistema (como o chat faz) US$ 0,007, igual. Ou seja, o nativo custou ~9 vezes menos que a retomada de hoje, e o resumo no prompt de sistema **não** perdeu cache a ponto de aparecer (rep. 1, a mais fria: US$ 0,083 × 0,076). Resumo do app: ~2,4 mil caracteres (~700 tokens).
- **Continuidade (leitura das respostas, não só da pontuação):** as 4 variantes acharam a tarefa e o próximo passo, **mas só porque eu tinha acabado de atualizar o `TASKS.md`** (até a variante sem retomada o leu). A diferença real: sem retomada e retomada de hoje responderam "nenhum arquivo alterado nesta conversa" (não conhecem a conversa); as duas nativas listaram os arquivos e o que foi feito. A pontuação automática de "arquivos" estava errada (contava nomes que aparecem no git status) e deve ser ignorada.
- **Limites desta medição:** só 3 repetições; cache quente na maior parte (com cache frio o prefixo-base de ~30 mil tokens pesa igual em todas, a diferença de chamadas e de contexto continua); um único cenário, e o resumo foi gerado de uma conversa que já conhecia a pergunta (favorece o nativo); não mede a qualidade em tarefas longas. Para fechar: usar no dia a dia e comparar.
- **Testado na interface (2026-11-09, cópia isolada do Termix instalado com o código novo, `--user-data-dir` próprio e CDP; o Electron de desenvolvimento está bloqueado pelo Controle de Aplicativo do Windows nesta máquina):** **chat** — Clear desabilitado durante a resposta e habilitado depois; modal com Cancelar / Fechar a tarefa e limpar / **Confirmar**; Confirmar troca o ID da conversa, mostra "Contexto limpo… resumo de 535 caracteres (~157 tokens)" e avisa no sino; depois do Clear o agente respondeu a palavra-chave dita antes (MARACUJA-7). **Terminal** — mesmo caminho: Confirmar, `/clear`, hook entrega o resumo, aviso no sino, fluxo encerrado, e o agente respondeu MARACUJA-7. **Configurações** — "Resumo nativo ao limpar" aparece. Captura do modal conferida. Não testado: projeto no fluxo com papel GERENTE, a opção desligada (modelo antigo, só o código existente), resumo com conversa muito longa (>4 MB de histórico).
- **Documentação:** `docs/DECISOES.md` (Botão Clear e chat) e README atualizados.
- **Testado depois do ajuste (mesma cópia isolada, CDP, Claude Code real):** Configurações: o modelo padrão aparece completo (352 caracteres), as linhas antigas sumiram, editar salva, **Restaurar o padrão** volta a `null` e ao texto padrão, modelo vazio avisa "sem resumo" no modal; modal só com Cancelar/Confirmar; **modelo personalizado** (texto próprio com uma palavra extra + `{{PEDIDOS}}` + `{{TAREFA}}`): chat e terminal responderam a palavra-chave da conversa **e** a palavra extra do modelo; captura da tela conferida. Não testado: o caminho "modelo vazio" até o fim (só o texto do modal), papel GERENTE, histórico acima de 4 MB.
- **Pendências:** nenhuma da tarefa. Fora de escopo (Backlog): medir o custo do fluxo (TASK-099), registro contínuo durante o trabalho, memória de problemas e decisões, `PROJETO.md` na criação do projeto.
- **Próximo passo:** nenhum. **Validada em:** 2026-11-09.


### TASK-104 — Terminal em modo administrador (avaliação e desenho)

- **Responsável:** A definir (DEV1 + usuário)
- **Status:** CANCELADA (decisão do usuário em 2026-11-05: "pode descartar essa tarefa, já que funciona"; reabrir só se surgir a necessidade de elevar uma aba só ou de o app controlar a elevação)
- **Prioridade:** Média — levantada pelo usuário em 2026-11-05: se o usuário precisar de um terminal com privilégios de administrador, o app atende?
- **Avaliação (verificada no código em 2026-11-05): não atende.** (1) O Termix roda como usuário comum: o instalador é por usuário (`perMachine: false`) e não há manifesto de elevação nem `requestedExecutionLevel`. (2) Cada aba é criada em `pty:spawn` (`src/main.js`) com `pty.spawn` do `@lydell/node-pty`, que herda o nível do próprio Termix; não existe elevação por aba. (3) Cada aba abre o **Claude Code**, não um shell avulso; "terminal administrativo" aqui significa o Claude Code (e os comandos que ele roda) com privilégios elevados. Consequência: tarefas como instalar serviço, mexer em HKLM, portas baixas, `netsh`, `sfc`, Hyper-V ou WSL com recursos do Windows falham com "acesso negado" e o usuário precisa sair do app e abrir um terminal elevado fora dele.
- **Opções a avaliar:** (A) **Termix inteiro elevado** (atalho "Executar como administrador" ou manifesto `requireAdministrator`): simples, mas **todas** as abas ficam elevadas (risco de segurança: o Claude Code com `--dangerously`/permissões soltas passa a ter poder total), pede UAC a cada abertura, e o Windows bloqueia arrastar arquivos do Explorer comum para a janela elevada (UIPI) e pode atrapalhar a instância única, a atualização automática e a abertura pelo atalho. (B) **Elevação por aba**: um processo auxiliar elevado (UAC só ao abrir a aba) que hospeda o PTY e conversa com o Termix por pipe nomeado com autenticação; é o desenho certo, mas dá mais trabalho e exige cuidado para outro processo local não usar o auxiliar para escalar privilégio. (C) **Abrir um PowerShell/cmd elevado externo** na pasta do projeto (`Start-Process -Verb RunAs`), fora do app: barato, resolve o caso de emergência, sem integração com as abas, status line e hooks.
- **Pontos a decidir:** quem pode abrir aba elevada (só com confirmação do usuário a cada vez); sinalizar a aba elevada de forma inconfundível (selo/cor "ADMIN" na aba e no cabeçalho); se o chat (modo SDK) também ganha o modo; como ficam hooks, status line e `%APPDATA%\Termix` com o processo elevado (mesmo usuário, mas conferir permissões dos arquivos criados); teste em PC com UAC no padrão e com Smart App Control.
- **Recomendação inicial:** começar pela (C) como solução rápida e desenhar a (B) como solução definitiva; evitar a (A) como padrão pelo risco de elevar tudo.
- **Avaliação da ideia do usuário (2026-11-05): "reabrir como administrador" sob demanda (opção D).** Com o Termix aberto como administrador, **todas** as abas (terminais e chats) sobem elevadas: os processos são filhos do app (`pty.spawn` e `spawn` em `src/main.js`/`src/chat.js` sem trocar de usuário), e no Windows o filho herda o nível do pai (comportamento conhecido; não testado aqui porque exige o UAC). Por isso não deve ser o padrão: Dangerously + administrador = o Claude com poder total sobre o PC em todas as abas. A saída boa é o app abrir **normal** e oferecer a elevação só quando o usuário pedir: botão **Reabrir como administrador** (menu e/ou chip "Precisa de administrador?"), com confirmação dizendo que **todas** as abas passam a ser administrativas.
  - **Viável com o que já existe:** o app já restaura as abas abertas e retoma as conversas pelo ID, tem `app:relaunch` e um auxiliar de troca (`update-helper`). Fluxo: salvar o estado → fechar tudo (`killAll`) → um auxiliar PowerShell espera o app sair (a instância única, `requestSingleInstanceLock`, impede duas ao mesmo tempo) e roda `Start-Process Termix.exe -Verb RunAs` → o UAC pergunta → o app abre elevado e reabre as abas. Se o usuário recusar o UAC, o auxiliar reabre o app normal. Voltar ao normal: fechar e reabrir sem elevação (por `explorer.exe Termix.exe`, que usa o nível normal do usuário).
  - **Custo:** é uma reabertura, então o agente que estiver trabalhando é interrompido (a conversa continua na próxima mensagem); deve acontecer numa pausa. Não dá para elevar uma aba só (isso é a opção B).
  - **Sinalização obrigatória:** detectar se o app está elevado (ex.: `fltmc` ou token) e mostrar selo **ADMIN** bem visível no cabeçalho e na aba; botão **Voltar ao normal** no mesmo lugar; a escolha **nunca vira padrão** das próximas aberturas sem o usuário pedir (mesma regra do Dangerously em `docs/DECISOES.md`). Sugestão: numa sessão elevada, abas novas nascem em "Perguntar", não em Automático.
  - **Quando oferecer:** (1) sempre disponível no menu; (2) opcional, um aviso no chat quando o resultado de uma ferramenta trouxer "Acesso negado"/"requires elevation"/"Access is denied" (heurística; pode errar, por isso só sugere).
  - **Ressalvas a testar:** (a) **só funciona direito se a conta do usuário é administradora** (UAC com "Sim/Não"); em PC de empresa com usuário comum o UAC pede a senha de **outro** administrador, e o app elevado roda como **outra conta** (outro `%APPDATA%`, outro login do Claude Code, sem os projetos): nesse caso a opção não serve; (b) arrastar arquivos do Explorer para a janela elevada é bloqueado pelo Windows (UIPI); (c) arquivos criados na sessão elevada (estado do app, logs) e a atualização automática rodando elevada; (d) o aviso do UAC para executável sem assinatura (publicador desconhecido); (e) abrir links e notificações a partir do app elevado.
  - **Decisão provisória:** seguir a opção **D** como a primeira entrega (botão manual + selo + voltar ao normal), a (C) como atalho de emergência e deixar a (B) para depois, se o uso mostrar que elevar tudo atrapalha.
- **Primeiros passos:** decidir entre A, B e C com o usuário; registrar a decisão em `docs/DECISOES.md`; se for B, prototipar o auxiliar elevado com um PTY e o pipe, sem mexer no fluxo normal.
- **Fechamento:** descartada. A avaliação fica registrada acima: abrir o Termix como administrador já eleva todas as abas (o filho herda o nível), e o usuário considerou isso suficiente.

### TASK-082 — Assinatura de código do instalador e do Termix.exe

- **Responsável:** A definir
- **Status:** CANCELADA (decisão do usuário em 2026-11-03: o app é de uso interno e não precisa de assinatura de código; reabrir só se deixar de ser interno)
- **Prioridade:** Alta antes de distribuir para outras pessoas — decorrente da TASK-081
- **Objetivo:** assinar `Termix.exe` e o instalador (certificado de assinatura de código, p. ex. Azure Trusted Signing ou um certificado OV/EV) para o Smart App Control e o SmartScreen aceitarem sem reputação; configurar o electron-builder para assinar e o atualizador para validar; depois disso o casco fixo do `Termix.exe` deixa de ser necessário.

### TASK-084 — Tela Consumo totalmente funcional (entra no MVP, antes da auditoria da TASK-083)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (promovida para a main em 2026-11-03, versão 0.3.4)
- **Prioridade:** Crítica — pedido do usuário em 2026-11-03, com captura da tela Geral › Consumo: "esta tela também entra no escopo MVP, precisamos deixá-la totalmente funcional; adicione antes da auditoria final". O usuário vai dar `/clear` e retomar em seguida para concluir esta tarefa.
- **O que a captura mostra (estado atual, v0.3.3):** cartões "Janela de 5 horas" (3 %, renova em 3h42m) e "Semana" (36 %, renova em 5d21h) com barra; cartão **"Origem dos dados" quase vazio** ("Status line do Claude Code · atualizado há 1 h"); tabela de sessões (Sessão, Projeto, Estado, Contexto, Tokens, Custo equivalente) em que **as colunas Tokens e Custo equivalente estão sempre "indisponível"**, o Contexto some em várias sessões encerradas e em chats ("indisponível"), há sessões "Encerrada" misturadas com ativas, sem ordenação/filtro/total, e a leitura dos limites fica velha (1 h) porque só atualiza quando alguma sessão responde.
- **Absorve** as tarefas de Backlog TASK-011 (consumo por sessão e alertas de limite) e TASK-026 (registro de consumo e alertas de ritmo): o que elas pedem e couber aqui entra; o resto fica registrado nelas.
- **Primeiro passo na retomada:** perguntar ao usuário, em poucas perguntas objetivas, o que "totalmente funcional" significa para ele nesta tela (o que quer enxergar e decidir a partir dela: custo por sessão/projeto/dia? alertas de limite 5 h/7 d? histórico? exportar?), porque os dados disponíveis são os da status line do Claude Code (`rate_limits`, `context_window`, `cost`) e os arquivos de conversa (`.jsonl` com o `usage` de cada resposta), e o que aparece como "indisponível" hoje pode passar a ter dado real.
- **Pontos técnicos já levantados:** o `statusline-wrapper.js` já grava `cost`, `context_window` e `rate_limits` por aba; o `chat` (claude -p em stream-json) recebe `usage` por resposta; os `.jsonl` em `~/.claude/projects` têm tokens (entrada, saída, cache) por mensagem, o que permite Tokens e custo equivalente por sessão mesmo para sessões encerradas; limites 5 h/7 d só atualizam quando uma sessão responde (decidir como indicar "dado velho" e se vale uma leitura periódica); "dado indisponível aparece como indisponível, nunca como zero" é regra de produto (`docs/DECISOES.md`).
- **Pronto quando:** nenhuma coluna fica "indisponível" por falta de implementação (só quando o dado realmente não existe, dito com o motivo), a tela responde às perguntas que o usuário definir, atualiza sozinha, aguenta muitos projetos/sessões, textos e estados vazios/erro revisados; testada com sessões reais (terminal e chat) e capturas do conteúdo do app; `docs/DECISOES.md` e `docs/DESIGN.md` atualizados.
- **Decisões do usuário (2026-11-03):** recortes **por sessão, por projeto e total geral**; **sem alertas** de limite (fica fora; TASK-026 segue no Backlog); **sem histórico persistido nem exportação** por ora; limites 5 h/7 d **só com atualização automática** (sem botão, sem aviso de dado velho). Referência visual enviada: a tela `/stats` do Claude Code (mapa de calor de atividade por dia, abas Visão geral/Modelos, filtros Todo o período / 7 dias / 30 dias, modelo favorito, total de tokens, sessões, dias ativos, dia mais ativo, maior sessão, sequências, quebra Input/Output/Cache read/Cache write). O mapa de calor e os totais saem da leitura dos `.jsonl` (datas e `usage` por mensagem), sem gravar histórico próprio.
- **Feito até agora (2026-11-03):** (1) `src/consumo.js` (novo): lê `~/.claude/projects/*/*.jsonl` em segundo plano, deduplica as respostas por `message.id`, soma por sessão / dia / modelo e calcula o custo equivalente pela tabela de preços; leitura incremental com cache em `%APPDATA%\Termix\consumo-cache.json` (1ª leitura ~2 s para 1,6 GB; seguintes ~14 ms). (2) IPC `consumo:get` + `api.consumo()`. (3) Tela reescrita (`consumoHTML` e auxiliares em `app.js`): cartões de limite, Visão geral (mapa de calor 53 semanas + estatísticas no estilo `/stats`) / Modelos, filtro Todo o período / 7 / 30 dias, Por projeto (com "Fora do Termix" e total), Por sessão; atualização automática a cada 15 s e cartões de limite a cada métrica (sem refazer a página). (4) CSS e `npm run check` incluem o `consumo.js`. (5) `docs/DECISOES.md` e `docs/DESIGN.md` atualizados.
- **Decisões técnicas:** o total geral é de tudo que o Claude Code gravou no computador (linha "Fora do Termix" fecha a soma); sessões de subagentes em subpastas ficam de fora; Haiku 5.5 usa cache lido 0,1x por suposição; contexto de sessão encerrada = "—".
- **Arquivos tocados:** `src/consumo.js` (novo), `src/main.js`, `src/preload.js`, `src/renderer/app.js`, `src/renderer/styles.css`, `package.json` (check), `docs/DECISOES.md`, `docs/DESIGN.md`, `docs/TASKS.md`.
- **Como validar:** `npm run check`; abrir o app > Geral > Consumo e conferir o mapa de calor, as abas Visão geral / Modelos, os filtros 7 e 30 dias, as tabelas e a soma (Por projeto fecha com o Total geral). Teste feito: instância isolada com `--user-data-dir` e CDP (capturas só do conteúdo do app); números conferidos por um script independente (7 dias: 727.002.193 tokens e US$ 230,04 iguais nos dois).
- **Pendências:** testar com muitas sessões abertas ao mesmo tempo e em janela estreita / DPI alto (entra na auditoria da TASK-083); confirmar a tabela de preços quando sair modelo novo; subagentes em subpastas (decidir se contam).
- **Próximo passo:** nenhum nesta tarefa. Segue a TASK-083 (auditoria do MVP). Backlog: TASK-011 e TASK-026 ficam só com o que não coube aqui (alertas de limite e ritmo, histórico gravado, exportação).


### TASK-080 — Barra lateral: rolar só os projetos e mesmo efeito aberta/recolhida

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (promovida para a main em 2026-11-03, versão 0.3.4)
- **Prioridade:** Média (visual/UX) — pedido do usuário em 2026-11-03, com duas capturas: (1) com muitos projetos a barra inteira rola e empurra o cabeçalho e o rodapé; (2) na barra recolhida as subtelas (Terminais, Plugins, Skills, MCPs) não escondem ao clicar no ícone do projeto, ao contrário da aberta; "o efeito tem que ser o mesmo para os dois". Pediu também uma forma melhor de organizar a barra sem quebrar o layout.
- **Feito até agora (2026-11-03):** (1) a barra virou **três faixas**: cabeçalho parado (alternar barra / "Projetos"), **lista de projetos com rolagem própria** (`.sscroll`; o "+ Novo projeto" fica fixo logo abaixo da lista) e rodapé "Geral" parado (Consumo, Integrações, Configurações); a rolagem não volta ao topo a cada redesenho, zera ao trocar de modo e o projeto atual é trazido para a vista quando muda. (2) **Mesmo estado e mesmo clique nas duas barras** (`p.open` + `projClick`): clicar em outro projeto vai até ele e abre as subtelas; clicar no projeto atual mostra/esconde as subtelas, com a **mesma animação** (grade 0fr→1fr, 0,2 s, desligada em "reduzir movimento"), trocando a classe no lugar. (3) Na recolhida, as subtelas de cada projeto aberto ficam numa **bandeja de vidro** logo abaixo do avatar (agrupa visualmente e deixa claro de quem são); antes só o projeto atual mostrava subtelas, soltas. (4) Corrigido de passagem: clicar num projeto fechado que não era o atual o fechava ao navegar.
- **Decisões:** o estado aberto/fechado vale por projeto e é o mesmo nas duas barras (projetos já salvos como abertos aparecem abertos também na recolhida; a lista rola, então não estoura); "+ Novo projeto" é fixo (pedido do usuário), sempre à mão com muitos projetos.
- **Arquivos tocados:** `src/renderer/app.js` (`renderSide`, `subsOf`, `projClick`, clique `data-ph`/`data-pt`), `src/renderer/styles.css`, `docs/DESIGN.md`, `docs/DECISOES.md`, `docs/TASKS.md`.
- **Como validar:** `npm run check`; no app, com vários projetos: rolar a lista (cabeçalho e Geral não se mexem), recolher/abrir a barra, clicar no projeto atual nas duas barras (esconde/mostra as subtelas igual) e em outro projeto (vai até ele). Teste feito em instância isolada com 17 projetos (CDP): rolagem só da lista, rodapé fixo, clique alternando 145 px ↔ 0 nas duas barras, avatar ativo com anel e brilho sem corte.
- **Pendências:** testar janela baixa e DPI alto (TASK-083, item B); reservar o lugar da categoria **Workflow** (TASK-085).
- **Ajuste pedido pelo usuário (2026-11-03, após ver o scroll):** botão "Novo projeto" mais sutil e ícones (avatar) dos projetos também na barra aberta. Feito e testado em instância isolada; aprovados pelo usuário e commitados.
- **Ajustes pedidos pelo usuário (2026-11-03, após ver o scroll):** botão "Novo projeto" mais sutil; ícones (avatar) dos projetos também na barra aberta; "Novo projeto" **fixo** (fora da rolagem, nos dois modos) e esmaecido nas bordas da lista. Feito e testado em instância isolada; aprovados pelo usuário e commitados.
- **Próximo passo:** o usuário confere no app; ajustes viram nova tarefa. Pendências de janela baixa e DPI alto seguem na TASK-083 (item B).

### TASK-086 — Nome de projeto gigante estoura o modal "Gerenciar projeto"

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (promovida para a main em 2026-11-03, versão 0.3.4)
- **Prioridade:** Média (defeito visual) — pedido do usuário em 2026-11-03, com duas capturas: com um nome de projeto enorme, o modal de gerenciar estoura (título e caminho passam da caixa e surge rolagem horizontal); na barra lateral o nome já aparecia truncado. Pediu avaliar o caso.
- **Causa:** o `.dlg` (caixa de todos os modais) não quebrava texto sem espaços, e o nome do projeto não tinha limite; a pasta criada pelo app usa o nome, então um nome de ~300 letras gerava uma pasta maior que o limite do Windows (255 por nome, 260 no caminho).
- **Feito (2026-11-03):** (1) **limite de 60 caracteres** no nome do projeto (campo de criar e de renomear com `maxlength`, e o nome é cortado ao criar, renomear e importar uma pasta); (2) a **pasta criada** pelo app usa no máximo 60 caracteres (`slug`); (3) **todos os modais** quebram texto longo (`overflow-wrap:anywhere`) e nunca rolam na horizontal; (4) no modal de gerenciar o título mostra **até 3 linhas com reticências** e o nome inteiro na dica; o caminho quebra em várias linhas. Nomes já salvos com mais de 60 letras continuam válidos e agora aparecem sem estourar.
- **Arquivos tocados:** `src/main.js` (`slug`), `src/renderer/app.js` (`PROJ_NAME_MAX`, `projNameClip`, `projectMenuFlow`, criar/renomear/importar), `src/renderer/styles.css` (`.dlg`, `.clamp3`), `docs/DECISOES.md`, `docs/DESIGN.md`, `docs/TASKS.md`.
- **Como validar:** `npm run check`; criar projeto e tentar digitar mais de 60 letras (o campo para em 60); abrir "Gerenciar projeto" de um projeto de nome muito longo. Teste feito em instância isolada com nome de 300 letras e caminho de 250: sem rolagem horizontal, título em 3 linhas com reticências, caminho quebrado, botões inteiros.
- **Pendências:** o redesenho visual dos modais é a TASK-087 (pós-MVP).
- **Próximo passo:** nenhum nesta tarefa.

### TASK-088 — Modais: fechar só pelo X ou Esc (clicar fora não fecha)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (promovida para a main em 2026-11-03, versão 0.3.4)
- **Prioridade:** Média (UX, MVP) — pedido do usuário em 2026-11-03: hoje clicar fora do modal o fecha; o ideal é fechar pelo X ou por Esc.
- **Feito (2026-11-03):** (1) todo modal (`modal()`) ganhou o **botão X** no canto do título (dica "Fechar (Esc)"); (2) **clicar fora não fecha mais** (perdia o que foi digitado e podia cancelar uma confirmação sem querer): o modal dá um balanço discreto (desligado em "reduzir movimento") para lembrar que espera X ou Esc; (3) **Esc continua fechando**. O aviso "Preparando o projeto limpo…" (sem botões, é progresso) segue sem poder ser fechado.
- **Arquivos tocados:** `src/renderer/app.js` (`modal`), `src/renderer/styles.css` (`.dh`, `.mclose`, `.nudge`), `docs/DESIGN.md`, `docs/DECISOES.md`, `docs/TASKS.md`.
- **Como validar:** `npm run check`; abrir qualquer modal (clique direito no projeto > gerenciar, Renomear, Novo projeto…): clicar fora não fecha, X fecha, Esc fecha, texto digitado sobrevive ao clique fora. Teste feito em instância isolada (CDP): cliques fora com o modal aberto e o balanço aplicado; X fechou; Esc fechou; "texto digitado" mantido no Renomear.
- **Pendências:** foco inicial do "Gerenciar projeto" cai em "Remover do app" (botão destrutivo; a confirmação seguinte protege): tratar na TASK-087.
- **Próximo passo:** nenhum nesta tarefa.

### TASK-063 — Tirar o círculo de contexto da linha de baixo do chat

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (aprovada pelo usuário em 2026-11-02; promovida para a `main` em 2026-11-02, versão 0.2.5)
- **Prioridade:** Baixa (visual) — pedido do usuário em 2026-11-02, com captura: "dessa parte vamos tirar o círculo dali" (o anel pequeno depois de "⚠ bypass").
- **Feito:** `src/renderer/chat.js` (sem o `.c-ring` no HTML, na ligação e na atualização) e `src/renderer/styles.css` (sem a regra). O contexto continua no anel CTX do rail, que agora é igual ao do terminal (TASK-058).
- **Testado:** `npm run check`; conferido por captura que a linha de baixo termina em "⚠ bypass", sem círculo, e que o chat segue sem erro no console.

### TASK-064 — Eventos e Clear iguais no chat e no terminal (paridade entre os modos)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (aprovada pelo usuário em 2026-11-02; promovida para a `main` em 2026-11-02, versão 0.2.5)
- **Prioridade:** Alta — pedido do usuário em 2026-11-02, com duas capturas: "no modo terminal o Clear fica piscando e no chat não; acho que tem uma tarefa assim para validar os eventos iguais independente do modo".
- **Auditoria (terminal × chat), o que foi conferido no código:**
  - **Clear pulsando:** o chat tinha `pulse: false` fixo. **Corrigido:** mesma regra do terminal (agente parado e anel CTX no limite de Configurações > Clear, 15% por padrão).
  - **Fluxo do Clear:** o terminal oferece "Só limpar" e "Fechar a tarefa e limpar"; o chat só tinha "nova conversa". **Corrigido:** o chat tem as duas opções, com o mesmo critério do terminal para continuar sozinho (o aviso final `TERMIX-CLEAR-OK` escrito pelo agente depois do pedido; sem ele, pergunta "A tarefa foi registrada?"), o botão fica "ocupado" durante o fluxo, e usa os mesmos pedidos de fechamento e retomada (inclusive os do fluxo Rocruzta).
  - **Aviso "Precisa de você":** no terminal vem do pedido de permissão; o chat só escrevia uma linha na conversa. **Corrigido:** se algo é negado (aba em "Perguntar"), o chat também avisa, com o mesmo tipo de notificação e as mesmas configurações.
  - **Já iguais (mesmas funções):** estados da aba (ponto e "Aguardando você"), aviso de "terminou" e de erro, selo de aba não vista, notificação do Windows e dica ao terminar; rail (TASK-058); aviso "cache esfriando" passa a valer para o chat porque agora ele tem os dados do cache (testado só pelo código: o aviso exige o processo do chat vivo).
  - **Ainda diferentes, de propósito ou sem equivalente:** o chat não mede "a retomada custou ~X tokens" depois do Clear; o terminal tem pedido de permissão interativo e o chat não tem cartão de aprovação (limite do `claude -p`, TASK-040); o spinner do Reiniciar não gira no chat.
- **Feito:** `src/renderer/app.js` (`clearDockState` do chat com pulso e estado ocupado) e `src/renderer/chat.js` (`chatClearFlow` completo, `c.flow` próprio do chat para não cruzar com o relógio do terminal, aviso "perm" quando há negações).
- **Testado (CDP, instância isolada, Claude Code real):** contexto real 2,8%: botão normal; contexto 20%: botão com a classe de pulso; agente trabalhando: sem pulso e desabilitado; fluxo completo sem o aviso final: abre "Limpar o contexto?" (Cancelar / Só limpar / Fechar a tarefa e limpar), o agente trabalha com o botão "ocupado", aparece "A tarefa foi registrada?" e "Não limpar" mantém tudo; fluxo completo com o aviso final: fecha, começa a conversa nova (ID da sessão mudou) e manda o pedido de retomada, ficando só as duas mensagens novas. Não testado: o fluxo num projeto do fluxo Rocruzta de verdade (pedidos longos) e o caso do aviso de permissão negada.
- **Como validar:** no chat, deixar o contexto passar de 15% e ver o Clear pulsar; clicar em Clear e conferir as duas opções; testar "Fechar a tarefa e limpar" num projeto seu.

### TASK-062 — Por que o contexto "explode" ao abrir qualquer chat (investigação nos projetos reais)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (confirmada pelo usuário em 2026-11-02: chat novo na 0.2.3 mostrou CTX 4% depois da primeira resposta; só documentação, sem código; segue para a `main` na próxima promoção)
- **Prioridade:** Alta ("a próxima urgente", pedido do usuário em 2026-11-02, depois da TASK-059).
- **Método:** `claude -p` em stream-json com a mesma configuração do app, **sem gravar sessão** (`--no-session-persistence`, para não poluir o histórico do usuário), mensagem "diga apenas: ok", dentro de cada projeto real; leitura só do tamanho em bytes dos documentos, nunca do conteúdo.
- **Medido (tokens da primeira mensagem, janela real de 1.000.000):** Pagina-Rocruzta **35.398** (3,5%); Termix **34.502** (3,5%); pasta de demonstração sem projeto **28.549** (2,9%). Diferença de ~6 mil entre projeto e pasta vazia: o projeto mostra 62 ferramentas (contra 32), mais CLAUDE.md (~1,3 mil tokens no Pagina-Rocruzta) e a saída do hook de início de sessão (~1,5 mil caracteres, ~450 tokens). O restante (~28 mil) é o núcleo do Claude Code, igual no terminal. A janela é de 1 M para o Sonnet 5.5.
- **O que o pedido inicial acrescenta (só bytes):** no Pagina-Rocruzta, `docs/TASKS.md` ~4,7 mil tokens, `docs/INTEGRACAO-MATERIAIS.md` ~10,8 mil, `WORKFLOW.md` ~4,1 mil. Mesmo lendo tudo isso, a conversa fica em torno de 55 a 70 mil tokens, ou **5 a 7%** de 1 M.
- **Conclusão:** o contexto **não explode**; o que explodia era o **número na tela**. Com a janela chutada em 200 mil, 70 mil tokens apareciam como ~36% (exatamente a captura do usuário) quando são ~7%. A correção foi publicada na **0.2.3** (TASK-058), e o app instalado do usuário já aprendeu a janela real (`ctxSizes` = 1 M para o Sonnet 5.5, conferido no estado salvo). O chat não carrega nada a mais que o terminal (a dica do `termix-open` é igual nos dois modos).
- **Resíduo a conferir pelo usuário:** abrir um chat novo na 0.2.3 e ver o CTX. Esperado ~3 a 4% na primeira resposta (e, **antes** da primeira resposta de um modelo ainda sem janela guardada, o número usa o palpite de 200 mil por alguns segundos; nos modelos já aprendidos isso não acontece). Se ainda parecer alto, mandar o número e a captura.
- **Ideias, não feitas:** (a) ensinar a janela de 1 M dos modelos 5.x de saída, para o primeiro chat do primeiro uso já abrir certo; (b) mostrar a "base" (~35 mil) na dica do anel de contexto, para a pessoa saber que não é conversa; (c) hoje 62 ferramentas aparecem nos projetos contra 32 na pasta de demonstração: descobrir quais plugins/servidores do projeto as acrescentam (~6 mil tokens) e se vale desligá-las pelo Conectores > Limpo.
- **Fechamento:** na captura do usuário o chat novo mostrava CTX 4%, 7D 24% e 5H "—" (a janela de 5 h provavelmente tinha acabado de renovar e ainda não havia uso nela; o terminal mostra o mesmo nesse caso). Os resíduos (ideias a, b e c) ficam como ideias, sem tarefa aberta.

### TASK-055 — Publicar a versão 0.2.2 e validar a atualização com o novo modelo (cartão Atualizando)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (confirmada pelo usuário em 2026-11-02; versões publicadas e promovidas para a `main`)
- **Prioridade:** Alta — pedido do usuário em 2026-11-02 ("publica a 0.2.2, que daí já validamos também o atualizar com o novo modelo de mostrar atualizando")
- **Objetivo:** publicar a 0.2.2 (leva a TASK-053, menu do projeto com o botão direito, e a TASK-054, botão de copiar a resposta) e, com o app instalado já na 0.2.1, ver **ao vivo** a atualização com o retorno da TASK-050: o cartão "Atualizando o Termix para a versão 0.2.2…", a notificação do Windows e, ao reabrir, o aviso "Termix atualizado para a versão 0.2.2 · levou N min".
- **Passos:** (1) `package.json` para 0.2.2 e commit; (2) promoção dev1 → main; (3) `npm run dist` e conferir o `latest.yml` (versão, tamanho, sha512); (4) `gh release create v0.2.2` com instalador, blockmap e `latest.yml`; (5) o usuário atualiza o app instalado (0.2.1 → 0.2.2) e relata o que viu.
- **O usuário precisa ver:** o cartão por cima da janela antes de fechar; a notificação do Windows durante a instalação; o aviso verde no canto inferior direito ao reabrir, com o tempo; e as abas voltando.
- **Feito até agora:** versão 0.2.2 no `package.json`; promoção dev1 → main (`4f0fa56`); Release **v0.2.2** publicado (https://github.com/rocruzta50IND/termix/releases/tag/v0.2.2) com instalador (sha256 `f8a33ca2…`, igual ao publicado), blockmap e `latest.yml` (versão, tamanho e sha512 conferidos antes de enviar; o `latest.yml` da tag e o feed já mostram a 0.2.2), feito com `npm run dist` + `gh release create`. Sem intercorrências desta vez.
- **Situação do teste:** o app instalado do usuário (`D:Nova pastaTermix`) está na **0.2.1** (em execução desde 19:15), que já tem o retorno da TASK-050. O atualizador consulta 15 s depois de abrir e a cada 4 h; para ver já, fechar e abrir o app instalado. **Falta o usuário atualizar (0.2.1 → 0.2.2) e relatar** o cartão "Atualizando…", a notificação do Windows e o aviso "atualizado" com o tempo.
- **Fechamento:** o usuário atualizou 0.2.1 → 0.2.2 e depois 0.2.2 → 0.2.3 (atualização com o novo modelo de "Atualizando…"); o app volta, com cerca de 3 minutos de espera. O que ainda não foi relatado: a notificação do Windows. A espera longa está na TASK-061.

### TASK-060 — Publicar a versão 0.2.3

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (confirmada pelo usuário em 2026-11-02; versões publicadas e promovidas para a `main`)
- **Prioridade:** Alta — pedido do usuário em 2026-11-02 ("pode seguir e publicar essa nova versão")
- **Objetivo:** publicar a 0.2.3, que leva a janelinha "Atualizando…" para quando o app está fechado (TASK-056), o botão de copiar dentro da caixa (057), o rail igual no chat e no terminal (058) e a investigação do contexto (059).
- **Passos:** `package.json` para 0.2.3; promoção dev1 → main; `npm run dist` e conferência do `latest.yml`; `gh release create v0.2.3`; o usuário atualiza o app instalado (0.2.2 → 0.2.3).
- **Atenção ao teste:** a 0.2.2 instalada **não** tem o auxiliar da TASK-056, então nesta atualização (0.2.2 → 0.2.3) o que se vê é o cartão "Atualizando…" e a notificação (TASK-050), mais o aviso verde ao reabrir. A janelinha com o tempo, durante o app fechado, só aparece na atualização seguinte (0.2.3 → 0.2.4).
- **Feito até agora:** versão 0.2.3 no `package.json`; promoção dev1 → main (`2c4aaa3`); Release **v0.2.3** publicado (https://github.com/rocruzta50IND/termix/releases/tag/v0.2.3) com instalador (sha256 `40e02f23…`, igual ao publicado), blockmap e `latest.yml` (versão, tamanho e sha512 conferidos antes de enviar; o `latest.yml` da tag e o feed já mostram a 0.2.3); os arquivos do auxiliar (`update-helper.ps1` e `.js`) conferidos dentro do pacote. Feito com `npm run dist` + `gh release create`, sem intercorrências.
- **Situação do teste:** o app instalado do usuário (`D:\Nova pasta\Termix`) está na **0.2.2**. Falta o usuário atualizar (0.2.2 → 0.2.3) e relatar o cartão "Atualizando…", a notificação do Windows e o aviso verde com o tempo. A janelinha da TASK-056 só aparece na atualização seguinte (0.2.3 → 0.2.4).
- **Fechamento:** o usuário atualizou o app instalado 0.2.2 → 0.2.3 e confirmou que funcionou; a espera entre o início do "Atualizando…" e o app reabrir foi de **cerca de 3 minutos** (virou a medição por etapas da TASK-061). Nada foi relatado sobre a notificação do Windows ou o aviso verde.

### TASK-056 — Indicativo na lacuna da atualização: do app fechar até ele abrir de novo

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (aprovada pelo usuário em 2026-11-02; promovida para a `main` em 2026-11-02, versão 0.2.3)
- **Prioridade:** Média — pedido do usuário em 2026-11-02, ao ver a 0.2.1 → 0.2.2 (o cartão "Atualizando…" da TASK-050 está "perfeito"): "ele fecha, leva um tempo, atualiza a área de trabalho, leva mais um tempo e aí sim abre o app novamente; isso demora e não tem indicativo de que o app será aberto de novo".
- **O problema:** depois que o app fecha, não há processo do Termix para mostrar nada. A instalação roda sem janela (`quitAndInstall(true, true)`), há uma pausa, a área de trabalho/atalhos são atualizados e só então o app reabre. Nesse intervalo (da ordem de minutos) a pessoa vê só a janela sumir. A notificação do Windows da TASK-050 ajuda mas some depressa.
- **Ideias a validar com o usuário:** (1) um **processo auxiliar separado** (que sobrevive ao fechamento do app, por exemplo um script/janelinha mínima sempre no topo) que mostra "Atualizando o Termix… ele abre sozinho" e **some quando o Termix.exe volta** (com um limite de tempo para nunca ficar preso); (2) instalar **sem o modo silencioso** só com a página de progresso do instalador (NSIS) visível, sem pedir cliques; (3) um ícone/aviso persistente na barra de tarefas ou na bandeja do sistema durante a espera; (4) **reduzir a espera**: medir cada etapa (clique → app fecha → instalador termina → atalhos/área de trabalho → app abre → abas restauradas) e ver o que dá para encurtar (por exemplo o que o instalador faz com os atalhos, antivírus, o tamanho do que é reescrito, a restauração das abas); (5) ao reabrir, manter o aviso verde "atualizado" (já existe, TASK-050).
- **Critérios de aceite (a refinar):** do instante em que o app fecha até a janela voltar há sempre um indicativo visível de que a atualização está em andamento e de que o app vai abrir sozinho; o indicativo some sozinho quando o app abre (ou após um limite de tempo, com um aviso se algo deu errado); medir e registrar o tempo de cada etapa; testado de ponta a ponta com duas versões publicadas; sem deixar processo órfão.
- **Cuidados:** o auxiliar não pode ser bloqueado pelo SmartScreen/antivírus nem exigir administrador; precisa funcionar com o app instalado por usuário e com o caminho que tiver (por exemplo `D:Nova pastaTermix`); se a atualização falhar, o app antigo precisa continuar abrindo.
- **Base existente:** `src/updater.js` (`beginInstall`, `INSTALL_DELAY_MS`, `update-pending.json`), `showUpdBusy` e `showUpdated` em `src/renderer/app.js`; `package.json` (`nsis`, `oneClick: false`); TASK-035 e TASK-050.
- **Decisão (usuário, 2026-11-02: "pode seguir… garantir que o usuário tenha uma experiência até mesmo na hora de atualizar"):** adotada a ideia 1 (auxiliar separado), com um limite de tempo para nunca ficar preso, e mais a medição do tempo (ideia 4, parcial).
- **Feito:** `src/update-helper.ps1` (janelinha pequena no canto inferior direito, sempre no topo, sem botão na barra de tarefas: "Atualizando o Termix para a versão X", o texto "abre sozinho… pode levar alguns minutos", barra animada em azul, "Decorrido: N min SS s" e um × para fechar; espera o app fechar antes de aparecer; detecta o Termix de volta por um processo novo com janela; troca para "Pronto! Abrindo o Termix…" com barra verde e se fecha 1,5 s depois; passados 10 min avisa "Está demorando mais que o normal… abra pelo atalho" e se fecha após mais 3 min), `src/update-helper.js` (`startUpdateHelper`: copia o script para `%TEMP%` com BOM, lança o PowerShell 5.1 escondido e sem `detached`; `readHelperTimeline`), `src/updater.js` (lança o auxiliar em `beginInstall` e junta o tempo em que o app ficou fechado ao aviso final), `src/renderer/app.js` (o aviso verde agora diz "o app ficou fechado por N min SS s"), `package.json` (`check` inclui o módulo novo).
- **Testado:** (1) o auxiliar sozinho, com um processo-pai de mentira que fecha e uma instância Electron isolada que "volta": a janelinha aparece só depois que o pai sai, mostra o tempo, detecta a volta, vira "Pronto!" e se encerra (nenhum processo sobra); gravou `closedMs` ≈ 4,7 s; (2) o estado "demorando mais que o normal" com limite curto; (3) o aviso verde com um registro simulado: "levou 3 min 36 s (o app ficou fechado por 3 min 08 s)"; capturas da própria janelinha conferidas (desenhada em memória, sem capturar a tela). **Defeito encontrado e corrigido no caminho:** com `detached: true` o PowerShell perdia o console e saía sem abrir a janela; sem `detached` funciona (no Windows o filho não morre com o pai).
- **Não testado:** uma atualização real com instalador (só é possível a partir de uma versão que já traga o auxiliar: publicando a 0.2.3 e atualizando para a 0.2.4); política de grupo que bloqueie scripts do PowerShell (nesse caso o auxiliar só não aparece, a atualização segue); janelas com várias telas/escala (usa a área útil da tela principal).
- **Como validar:** publicar a próxima versão (0.2.3, que já leva o auxiliar) e, depois, uma 0.2.4 para ver a janelinha na atualização real: do app fechar até abrir deve haver sempre a janelinha "Atualizando…" com o tempo, que some quando o Termix volta.

### TASK-057 — Botão de copiar fixo no canto de cima, dentro da caixa da resposta

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (aprovada pelo usuário em 2026-11-02; promovida para a `main` em 2026-11-02, versão 0.2.3)
- **Prioridade:** Média — pedido do usuário em 2026-11-02, com captura: o botão "Copiar" da TASK-054 ficava a cavalo na borda de cima, para fora do quadro da resposta; "ficaria melhor fixo no topo direito da caixa".
- **Correção (usuário, 2026-11-02, após a 0.2.3: "ao arrastar para baixo o botão vem junto, e ele tem que ficar lá fixo"):** eu tinha entendido "fixo" como grudado na tela (`sticky`); o pedido era fixo **no canto da caixa**. Agora o contêiner é estático e o botão é absoluto no canto de cima à direita da caixa (8 px das bordas), rolando junto com ela.
- **Feito:** `src/renderer/chat.js`: o botão vem antes do texto dentro de um contêiner `.c-cpw` de altura zero (não empurra o texto); agora é só o ícone de copiar (círculo de 26 px) e vira um "✓" verde por 1,4 s; `src/renderer/styles.css`: `.c-cpw`, `.c-copyall` dentro da caixa (canto de cima à direita) e o primeiro bloco ganha 30 px de margem à direita para o botão não cobrir o texto.
- **Testado (CDP, instância isolada):** bolha curta ("ok") sem espaço sobrando; resposta longa rolada 700 px com o botão continuando no topo visível, dentro da caixa; capturas conferidas. Não testado: bloco de código ou tabela como primeiro item da resposta.

### TASK-058 — Rail igual no chat e no terminal (contexto, 5 h, 7 d e cache)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (aprovada pelo usuário em 2026-11-02; promovida para a `main` em 2026-11-02, versão 0.2.3)
- **Prioridade:** Alta — pedido do usuário em 2026-11-02, com capturas dos dois modos: "os indicadores não ficam do mesmo jeito dependendo do modo… as funções do rail também não reagem da mesma forma; preciso que em ambos os jeitos tudo funcione da mesma forma".
- **Causa (medida com o Claude Code 2.1.316):** o terminal recebe os números da status line; o `claude -p` do chat não tem status line, e o chat só aproveitava uma parte do que o stream traz: (1) **contexto**: a janela era *adivinhada* pelo nome do modelo (200 mil, salvo "1m" no nome), mas o Claude Code usa 1 milhão (`result.modelUsage[...].contextWindow = 1000000`): o percentual saía ~5× inflado (14% em vez de 2,9% numa conversa nova) e o tooltip não dizia "29k de 1M tokens"; (2) **cache**: sempre "—" no chat; (3) **5 h e 7 d**: o chat ignorava o `rate_limit_event`, então só atualizavam se houvesse um terminal aberto, e ficavam "—" ao reabrir.
- **Feito:** `src/renderer/chat.js`: `chatMet` monta as métricas no mesmo formato do terminal; `chatCtxSize` usa a janela real (guardada por modelo em `S.settings.ctxSizes` e corrigida a cada resultado); `chatCtx` agora preenche `total_input_tokens` e, a cada chamada à API, renova o **cache** (`prompt_cache`: validade de 1 h ou 5 min pelo `cache_creation` do usage, ou pela origem da chave quando ainda não há pista; o anel faz a contagem regressiva e vira "frio" sozinho); novo tratamento do `rate_limit_event` (5 h e 7 d, só quando acabaram de chegar, para não sobrescrever dados mais novos de um terminal); os limites são guardados em `S.lastLimits`; `src/renderer/app.js` os restaura ao abrir.
- **Testado (CDP, instância isolada, Claude Code real):** chat após uma resposta: CTX 3%, tooltip "Contexto · 3% / 29k de 1M tokens", 5H e 7D com os valores da conta, CACHE 59 min em verde; janela real (1 M) guardada; reabrindo o app sem mandar mensagem os anéis 5H/7D já aparecem; geometria, classes e tooltip do rail iguais ao de uma aba de terminal ao lado. Não testado: o anel de cache esfriando até "frio" no chat (só pelo código) e o cache de uma conversa reaberta do histórico (fica "—" até a primeira resposta).

### TASK-059 — Por que o contexto parece alto: é o chat? (investigação)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (aprovada pelo usuário em 2026-11-02; promovida para a `main` em 2026-11-02, versão 0.2.3)
- **Prioridade:** Média — pergunta do usuário em 2026-11-02, com captura do chat em 36% de contexto após o pedido inicial e algumas leituras: "veja se não é por causa do modo chat ou se não tem relação".
- **Conclusão: não é o modo chat.** (1) O chat acrescenta ao prompt do sistema só a dica do `termix-open` (~380 caracteres, ~90 tokens), a mesma que o terminal já acrescenta (`src/main.js:249`). (2) A mensagem mais simples ("diga apenas: ok") custa **~28 mil tokens** no `claude -p` neste ambiente (32 ferramentas, 9 servidores MCP, 9 plugins, 50 skills, 86 comandos): ~26 mil são o núcleo do Claude Code (instruções do sistema e definições das ferramentas), ~2 mil são skills e comandos, e os **MCPs não pesam** (carregados sob demanda). O terminal carrega o mesmo. (3) O que fazia o chat *parecer* pior era o **percentual inflado ~5×** (janela chutada em 200 mil em vez de 1 milhão, TASK-058): 28 mil eram mostrados como ~14%, quando são 2,9%. (4) O que a pessoa lê ao longo da conversa pesa de verdade: cada leitura de arquivo grande (por exemplo o `docs/TASKS.md` inteiro, ~50 mil tokens) entra e fica; o pedido inicial da captura manda reler vários documentos.
- **Medição:** `claude -p` com stream-json, mesma configuração do app: padrão = 28.152 tokens; sem MCP = 28.152; sem MCP e sem skills/comandos = 26.032.
- **O que dá para fazer (não feito, ficam ideias):** (a) mostrar no chat o tamanho da "base" da conversa, como a retomada do terminal já faz; (b) a opção Conectores > Limpo do app já corta plugins e MCPs em projetos novos, mas o grosso é do núcleo; (c) cuidar das leituras grandes (ler por trecho, como o pedido do usuário já pede).

### TASK-053 — Menu do projeto com o botão direito (barra lateral recolhida e aberta)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (validada em DEV1 — aprovada pelo usuário em 2026-11-02; promovida para a `main` em 2026-11-02, versão 0.2.2)
- **Prioridade:** Média — pedido do usuário em 2026-11-02, com captura da barra recolhida (só os avatares N, P, T): com a barra recolhida não havia como renomear, arquivar, remover ou excluir um projeto, porque o menu só abria pelo botão "⋯" da barra aberta.
- **Objetivo:** clique direito no projeto abre o mesmo menu do "⋯" (Abrir pasta, Renomear, Arquivar, Remover do app e, só em pasta criada pelo app, Excluir pasta…), também com a barra recolhida.
- **Feito:** `src/renderer/app.js`: o ouvinte de `contextmenu` reconhece o avatar do projeto (`.av[data-go]`, barra recolhida) e o nome do projeto (`[data-ph]`, barra aberta), troca para esse projeto como o "⋯" já faz e chama `projectMenuFlow()`. O menu da aba (clique direito na aba) segue como estava.
- **Testado (CDP, cliques reais, instância isolada com 2 projetos):** barra recolhida: clique direito no avatar abre o menu do projeto certo (Beta e depois Alfa); clique esquerdo continua só navegando, sem abrir menu; barra aberta: clique direito no nome abre o menu; captura conferida. Não testado: confirmar Arquivar/Remover/Excluir a partir desse menu (usa o fluxo que já existia).
- **Como validar:** `npm start`, recolher a barra lateral e clicar com o botão direito num projeto; escolher Renomear.
- **Validada em:** 2026-11-02. Promovida para a `main` em 2026-11-02.

### TASK-054 — Botão de copiar a resposta inteira no chat

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (validada em DEV1 — aprovada pelo usuário em 2026-11-02; promovida para a `main` em 2026-11-02, versão 0.2.2)
- **Prioridade:** Média — pedido do usuário em 2026-11-02, com duas capturas (uma resposta longa e um bloco de código com o botão "Copiar" no cabeçalho): "qualquer resposta eu consiga copiar com um botão de copiar, mas manter quando é caixa assim".
- **Objetivo:** qualquer resposta do Claude pode ser copiada inteira com um botão; os blocos de código continuam com o "Copiar" no cabeçalho do bloco.
- **Feito:** `src/renderer/chat.js`: botão `.c-copyall` ("Copiar", ícone de cópia) em toda resposta pronta (não aparece durante o streaming nem em resposta vazia); copia o **texto original em Markdown** (títulos, listas e blocos de código intactos, e não só o que está desenhado) pela mesma ponte `api.clipWrite`; mostra "Copiado" por 1,4 s; ícones `copy` e `check` em `CHAT_ICON`. `src/renderer/styles.css`: pílula pequena que fica a cavalo na borda de cima da bolha, no canto direito, visível ao passar o mouse na resposta (ou com o foco do teclado).
- **Testado (CDP, cliques reais, instância isolada):** invisível sem o mouse e visível com o mouse; o clique copiou a resposta inteira (confirmado lendo a área de transferência do Windows, que foi restaurada depois); "Copiado" volta a "Copiar" sozinho; o botão do bloco de código continua separado. Não testado: respostas muito longas com rolagem e janela estreita. Perguntas do usuário ficaram sem o botão (fácil de incluir).
- **Como validar:** `npm start`, abrir um chat, passar o mouse numa resposta e clicar em Copiar; colar em outro lugar.
- **Validada em:** 2026-11-02. Promovida para a `main` em 2026-11-02.

### TASK-039 — Barra de abas com mais de ~25 abas (rolagem horizontal)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (marcada como finalizada pelo usuário em 2026-11-02)
- **Prioridade:** Baixa
- **Objetivo:** hoje as inativas encolhem até 34 px; acima de ~25 abas a barra estoura de novo. Avaliar rolagem horizontal mantendo o recorte (`fuseBar`) e o arrastar com rolagem automática.
- **Fechamento:** a pedido do usuário. **Registro fiel:** não há implementação desta tarefa no código da `dev1`/`main` (conferido em 2026-11-02); ela foi encerrada por decisão do usuário, não por entrega nesta linha de trabalho. Se for preciso, reabrir como nova tarefa.

### TASK-038 — Arrastar para reordenar as abas da Web

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (marcada como finalizada pelo usuário em 2026-11-02)
- **Prioridade:** Baixa
- **Objetivo:** as abas da Web (`#wtabs`, `src/renderer/web.js`) não têm arrastar; reutilizar a lógica das abas dos terminais (TASK-033).
- **Fechamento:** a pedido do usuário. **Registro fiel:** não há implementação desta tarefa no código da `dev1`/`main` (conferido em 2026-11-02); ela foi encerrada por decisão do usuário, não por entrega nesta linha de trabalho. Se for preciso, reabrir como nova tarefa.

### TASK-037 — Imagem lateral do instalador com a marca do Termix

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (marcada como finalizada pelo usuário em 2026-11-02)
- **Prioridade:** Baixa
- **Objetivo:** o assistente do instalador mostra a imagem lateral padrão do NSIS (laptop com seta e logo genérico). Trocar por uma com a marca do Termix (`installerSidebar`, 164×314 px). Ideia: avaliar assinatura de código para tirar o aviso do SmartScreen.
- **Fechamento:** a pedido do usuário. **Registro fiel:** não há implementação desta tarefa no código da `dev1`/`main` (conferido em 2026-11-02); ela foi encerrada por decisão do usuário, não por entrega nesta linha de trabalho. Se for preciso, reabrir como nova tarefa.

### TASK-049 — Publicar a versão 0.2.0 e validar a atualização do app instalado

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (marcada como pronta pelo usuário em 2026-11-02; versões 0.2.0 e 0.2.1 publicadas e promovidas para a `main`)
- **Prioridade:** Alta — pedido do usuário em 2026-11-02 ("considerar uma nova versão e subir")
- **Objetivo:** publicar a versão **0.2.0** (a dev1 tem 100+ commits desde a 0.1.1: modo Chat, rodapé, telas contínuas, ícones animados, README) e validar, no app **instalado** na máquina do usuário, que o aviso de atualização aparece ao abrir, que o download/instalação funciona e que as sessões dos terminais abertos voltam depois (a atualização fecha o app e a restauração automática retoma as conversas pelo ID; os processos em andamento são encerrados, com confirmação se houver agente trabalhando).
- **Decisões (usuário, 2026-11-02):** versão **0.2.0**; promover a dev1 para a main junto (para o README aparecer no GitHub). A 037 (imagem lateral do instalador) e a 038 (arrastar abas da Web) **não estão no código da dev1** e ficam no Backlog; o ícone novo da barra de tarefas é da TASK-034 (já validada). 009, 011 e 026 ficam para bem depois; 039 também.
- **Passos:** (1) `package.json` para 0.2.0, registro e commit na dev1; (2) `/fluxo:promover` (fast-forward da main); (3) `npm run release` (instalador, `latest.yml` e Release v0.2.0 no GitHub); (4) usuário abre o Termix instalado (0.1.1) e confere o aviso, atualiza e vê as abas voltarem.
- **Feito até agora:** versão 0.2.0 no `package.json`; **promoção dev1 → main feita** (main == dev1 em `1ff848e`); **Release v0.2.0 publicado** em https://github.com/rocruzta50IND/termix/releases/tag/v0.2.0 com `Termix-Setup-0.2.0.exe` (sha256 `f6f7da6e…`, igual ao arquivo local), `.blockmap` e `latest.yml` da 0.2.0 (conferido pelo link `releases/latest/download/latest.yml`).
- **Intercorrências:** (1) `npm run release` falhou com 422 (dois envios em paralelo tentando criar o mesmo Release); o Release saiu só com o `.blockmap`; o instalador e o `latest.yml` foram enviados depois com `gh release upload`. (2) Nesse reenvio subiu por engano o `latest.yml` antigo (0.1.1), porque o electron-builder não chegou a gerar o da 0.2.0; foi percebido na hora, o arquivo certo foi gerado do instalador (versão, sha512, tamanho) e substituído em cerca de um minuto, sem ninguém ter baixado. **Lição para as próximas versões:** conferir o `version:` do `latest.yml` antes de enviar e, se o `npm run release` falhar, gerar com `npm run dist` e publicar com `gh release create` enviando exe, blockmap e `latest.yml`.
- **Resultado do teste (usuário, 2026-11-02):** o app instalado (0.1.1, em `D:Nova pastaTermix`) mostrou o aviso e o botão **Atualizar** cerca de 20 s depois de abrir; ao clicar em **Atualizar agora** o app fechou, instalou e reabriu na **0.2.0** (processo novo às 18:49:53). O que ficou mal: durante a atualização não há nenhum indicativo na tela (virou a TASK-050). **Falta o usuário confirmar que as abas e as conversas voltaram certinho**; só então a TASK-049 vira concluída.
- **Segunda publicação (0.2.1, 2026-11-02):** promoção dev1 → main (`0f1c78e`) e Release **v0.2.1** (https://github.com/rocruzta50IND/termix/releases/tag/v0.2.1) com instalador (sha256 `f3617246…`, igual ao local), blockmap e `latest.yml` (versão, tamanho e sha512 conferidos antes de enviar), feito com `npm run dist` + `gh release create` (sem o `npm run release`, para evitar o 422). Intercorrência: logo depois de publicar, o link `releases/latest/download/latest.yml` ainda devolvia o arquivo da 0.2.0 (cache do GitHub); o feed (`releases.atom`) e o link da tag já mostravam a 0.2.1, que é o que o atualizador usa. Esta versão leva a TASK-050.
- **Fechamento:** o usuário marcou como pronta. A atualização do app instalado 0.1.1 → 0.2.0 foi vista funcionando (aviso, botão, instalação e reabertura na 0.2.0); a 0.2.1 foi publicada em seguida. Nenhum problema com as sessões foi relatado.

### TASK-050 — Indicativo de que o app está atualizando (do clique em Atualizar até o app reabrir)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (marcada como pronta pelo usuário em 2026-11-02; já está na `main`, na versão 0.2.1)
- **Prioridade:** Média — observado pelo usuário em 2026-11-02 no teste da 0.2.0: ao clicar em **Atualizar agora** a janela fecha e o app demora para reabrir (cerca de 4 minutos entre o clique e o processo novo, com a atualização em modo silencioso), **sem nenhum sinal na tela** de que está atualizando; a pessoa pode achar que o app travou ou fechou.
- **Objetivo:** dar retorno claro durante a atualização, sem a pessoa ter de adivinhar.
- **Ideias a validar com o usuário:** (1) antes de fechar, um cartão curto "Atualizando para a 0.2.0… o Termix reabre sozinho" com a janela ainda visível por 1 a 2 s; (2) uma janelinha de progresso pequena, separada do app, que fica na tela durante a instalação silenciosa e some quando o Termix reabre (o instalador roda com `quitAndInstall(true, true)`, sem assistente); (3) notificação do Windows "Termix atualizando… reabre em instantes" e outra quando voltar; (4) ao reabrir, um aviso "Termix atualizado para a 0.2.0" com um resumo do que mudou (a partir do CHANGELOG).
- **Critérios de aceite (a refinar):** do clique em Atualizar agora até o app reabrir há sempre algum indicativo na tela ou na barra de tarefas; ao reabrir, a pessoa vê que a versão mudou; não atrapalha a restauração das abas; testado de ponta a ponta com duas versões publicadas (como na TASK-020/049), medindo e registrando o tempo do clique até a janela voltar.
- **Base existente:** `src/updater.js` (`update:install` chama `autoUpdater.quitAndInstall(true, true)`), `applyUpdate`, `showUpdCard` e o botão `.updbtn` em `src/renderer/app.js`; `docs/DECISOES.md` ("Atualização do app").
- **Decisão (2026-11-02, o usuário pediu para seguir):** combinar três partes: (1) ao clicar em **Atualizar agora**, um cartão por cima da janela ("Atualizando o Termix para a versão X… pode levar alguns minutos… não abra o Termix de novo, ele volta sozinho"), e o app só fecha ~2,5 s depois; (2) uma **notificação do Windows** ("O Termix está atualizando… reabre em instantes") que continua na tela durante a instalação silenciosa; (3) ao abrir na versão nova, um aviso no canto inferior direito, "Termix atualizado para a versão X · levou N min S s" (tempo do clique até o app voltar, que também mede o problema).
- **Feito:** `src/updater.js` (`beginInstall`: grava `update-pending.json` com versão de origem, destino e hora; notificação; `INSTALL_DELAY_MS`; `update:just` entrega o resultado uma vez e apaga o arquivo), `src/preload.js` (`updateJust`), `src/renderer/app.js` (`showUpdBusy`, `showUpdated`, `fmtMs`, ícone `check`), `src/renderer/styles.css` (`#updbusy`, `#updok`); versão **0.2.1** no `package.json`.
- **Testado (CDP, instância isolada):** com `TERMIX_FAKE_UPDATE=1`: cartão "Atualizando…" aparece ao chamar `applyUpdate`; com um `update-pending.json` de 3 min 05 s: o aviso "atualizado para a 0.2.0 … 3 min 06 s" aparece ~1,5 s depois de abrir e o arquivo é apagado; capturas conferidas. **Não testado de verdade:** a notificação do Windows (só pelo código, sem erro) e o fluxo real com instalador.
- **Limite importante do teste real:** o cartão "Atualizando…" e a notificação rodam no app **antigo** (o que está instalado na hora do clique). Instalado o 0.2.0 → 0.2.1, só o aviso "atualizado" aparece (a 0.2.1 já o traz). Para ver o cartão e a notificação de verdade é preciso uma **segunda atualização**, 0.2.1 → 0.2.2.
- **Situação:** a 0.2.1 **já foi publicada** (ver TASK-049). Falta o usuário atualizar o app instalado (0.2.0 → 0.2.1) e ver o aviso "atualizado" com o tempo; depois publicar a 0.2.2 para ver o cartão e a notificação.
- **Como validar:** publicar a 0.2.1; no app instalado (0.2.0) clicar em Atualizar agora e, ao voltar, conferir o aviso "atualizado para a 0.2.1" com o tempo; depois publicar a 0.2.2 e repetir para ver o cartão e a notificação.
- **Fechamento:** o usuário marcou como pronta depois da publicação da 0.2.1. O que não foi visto ao vivo fica registrado: o cartão "Atualizando…" e a notificação do Windows só aparecem numa atualização feita **a partir da 0.2.1** (a 0.2.0 não os tem); eles foram testados só por simulação. Quando houver a próxima versão (0.2.2 ou maior), vale olhá-los na atualização real.

### TASK-052 — Alinhar as bolhas do chat (pergunta, resposta e ferramentas na mesma coluna)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (validada em DEV1 — vista e aprovada pelo usuário em 2026-11-02 numa instância limpa; promovida para a `main` em 2026-11-02)
- **Prioridade:** Média (visual) — pedido do usuário em 2026-11-02, com captura: a pergunta longa ia de ~158 a ~1058, enquanto a resposta e os cartões de ferramenta iam de ~208 a ~1110; as bordas não coincidiam.
- **Objetivo:** pergunta, resposta e cartões de ferramenta usam a **mesma faixa**, com as mesmas bordas esquerda e direita; os avatares ficam nas calhas laterais.
- **Feito:** `src/renderer/styles.css`: `.c-bub` e `.c-tool` com `max-width: calc(100% - 84px)` (calha de 42 px de cada lado: a do avatar da resposta à esquerda e a do avatar da pergunta à direita); comentário no CSS.
- **Testado (CDP, instância isolada, itens de exemplo):** medidas: pergunta longa 415–1095, resposta longa 415–1095 e cartões 415–1095 (iguais); bolhas curtas continuam encostadas na sua lateral; captura conferida. Não testado: janela estreita (980) e conversa com código largo/tabelas.
- **Como validar:** `npm start`, abrir um chat com perguntas e respostas longas e cartões de ferramenta: todas as bordas devem coincidir.
- **Validada em:** 2026-11-02. Promovida para a `main` em 2026-11-02.

### TASK-051 — Mostrar no chat o que o Claude está fazendo enquanto trabalha

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (validada em DEV1 — vista e aprovada pelo usuário em 2026-11-02 numa instância limpa; promovida para a `main` em 2026-11-02)
- **Prioridade:** Média — pedido do usuário em 2026-11-02, com duas capturas (o chat só com o símbolo girando e o terminal com "✻ Manifesting…" e uma linha embaixo): "fica muito vazio quando ele está fazendo algo e não mostra no chat o que está fazendo".
- **Objetivo:** abaixo da conversa, enquanto o agente trabalha, uma linha de estado como a do terminal: o símbolo animado, um verbo que muda ("Manifestando…", "Decifrando…"), o tempo decorrido e, embaixo, o que está acontecendo de verdade.
- **Feito:** `src/renderer/chat.js`: `CHAT_VERBS` (12 verbos, sorteado por mensagem e trocado a cada ~6 s), `CHAT_DOING` (nome da ferramenta em português), `chatStatus` (monta o verbo, o tempo e a linha de baixo) e um relógio de 1 s só para a aba que está trabalhando; a linha de baixo diz "Começando a pensar na sua mensagem", "Executando · <comando>" (ou Lendo, Editando, Buscando…; o argumento vem do stream mesmo antes de a entrada terminar), "Analisando o resultado de <ferramenta>" e "Pensando no próximo passo". Aparece quando o agente está trabalhando e ainda não há texto da resposta chegando (com texto, o próprio texto e o símbolo animado mostram o progresso). `src/renderer/styles.css`: `.c-st`, `.c-st1`, `.c-st2` (verbo no azul do app, tempo discreto, linha de baixo em monoespaçada com "└").
- **Testado (CDP, instância isolada, Claude Code real):** pedido com três leituras de arquivo e outro com um comando de 7 s: a linha mudou entre começar a pensar, executar (com o caminho ou o comando), analisar o resultado e pensar de novo; o verbo trocou sozinho; ao terminar, o indicador some; captura conferida. Não testado: muitas ferramentas em paralelo (subagentes) e janela estreita.
- **Ideias que ficaram de fora:** as dicas ("Tip: …") que o terminal mostra; contagem de tokens na linha.
- **Como validar:** `npm start`, abrir um chat e pedir algo que use ferramentas (por exemplo, ler arquivos e resumir): a linha deve acompanhar o que o Claude faz.
- **Validada em:** 2026-11-02. Promovida para a `main` em 2026-11-02.

### TASK-048 — Menu da aba aparece ao clicar com o botão direito em qualquer parte do chat (defeito)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (corrigida e testada em 2026-11-02; o usuário seguiu para a próxima tarefa sem objeção; promovida para a `main` em 2026-11-02)
- **Prioridade:** Alta (defeito visível, reportado pelo usuário em 2026-11-02 com captura) — pequeno, bom candidato a ser a próxima tarefa
- **Sintoma:** na aba de chat, o clique direito em qualquer ponto da conversa abre o menu da aba (cor da guia, renomear, duplicar, reiniciar, abrir como terminal, exportar, fechar guias…), que só deveria abrir no clique direito **na própria aba** da barra.
- **Causa provável (lida no código, ainda não corrigida):** o container de cada chat tem `root.dataset.tab = tab.id` (`chatView` em `src/renderer/chat.js`) e o ouvinte `contextmenu` de `src/renderer/app.js` usa `e.target.closest('[data-tab]')`, então qualquer clique dentro do chat casa com o container. O mesmo atributo pode afetar o duplo clique (`dblclick`, que também usa `[data-tab]`).
- **Correção prevista:** restringir os ouvintes de `contextmenu` e `dblclick` às abas da barra (por exemplo `.tab[data-tab]` ou `#tabsRow [data-tab]`) ou renomear o atributo do container do chat (`data-chat`) e ajustar o que o usa (`querySelector('[data-tab]')`, CSS). No clique direito em outra área, não abrir nenhum menu (ou, no campo de texto, deixar o menu padrão de recortar/copiar/colar).
- **Critérios de aceite:** clique direito na conversa, na caixa de texto, no rail e no rodapé não abre o menu da aba; clique direito na aba (terminal, chat e Web) continua abrindo; clique duplo na aba continua renomeando e clique duplo no chat não faz nada; testado por cliques reais (CDP).
- **Base existente:** `document.addEventListener('contextmenu'…)` e `'dblclick'` em `src/renderer/app.js`; `chatView` em `src/renderer/chat.js`.
- **Feito (2026-11-02):** `src/renderer/chat.js`: o container do chat deixou de usar `data-tab` e passou a `data-chat`, então os ouvintes de `contextmenu`, `dblclick` e clique do `app.js` só casam com as abas da barra (sem mexer no `app.js`).
- **Testado (CDP, cliques reais, instância isolada e zerada):** clique direito na conversa e na caixa de texto não abre menu; clique direito na aba abre; duplo clique na aba abre o renomear e no chat não faz nada; `npm run check` passou. Não testado: Web (usa a mesma barra, sem mudança).
- **Como validar:** `npm start`; num chat, clique direito em qualquer ponto da conversa (nada abre) e na aba (menu abre); duplo clique na aba renomeia.

### TASK-047 — Controles do chat (modo, estilo, permissão) à mão na tela e fim do texto "Aguardando você"

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (vista e aprovada pelo usuário em 2026-11-02 numa instância limpa; promovida para a `main` em 2026-11-02)
- **Prioridade:** Média — pedido do usuário em 2026-11-02, com captura do chat
- **Objetivo:** hoje, para trocar de Chat para Terminal, de Bolhas para Fluxo ou de Automático para Perguntar, é preciso ir a Configurações > Chat (e o modo da aba só pelo menu da aba, TASK-044). Colocar esses controles **em algum canto da própria tela do chat**, à mão.
- **Pedido adicional (mesma captura):** na barra de cima da aba, tirar o texto **"Aguardando você"** e manter só a **bolinha de estado** (a aba já mostra o mesmo estado com a bolinha); o texto pode virar dica ao passar o mouse.
- **Decisão do usuário (2026-11-02): papel de Configurações.** As opções de Chat/Terminal (e as demais de Configurações > Chat) são **de inicialização**: definem o que o app usa **ao abrir**, e o app mantém o configurado a cada abertura. O que a pessoa mudar nos controles da tela (Chat ↔ Terminal, Bolhas ↔ Fluxo, permissão) vale **só para o uso atual** e **não regrava** a configuração de Configurações. Ajustar o texto de Configurações > Chat ("Ao abrir o app…") e `docs/DECISOES.md`. A definir: se "o que fica na tela" (modo de cada aba) continua salvo com a aba ao reabrir o app ou volta ao padrão de Configurações.
- **A decidir com o usuário ao começar:** onde ficam os controles (menu na linha do modelo/permissão abaixo da caixa, no canto direito da barra de abas no lugar do texto de estado, ou na engrenagem do rodapé); quais entram (Chat ↔ Terminal da aba aberta, Bolhas ↔ Fluxo, Automático ↔ Perguntar da aba, talvez o modo das abas novas); se valem para a aba ou para todas.
- **Critérios de aceite (a refinar):** trocar modo/estilo/permissão sem abrir Configurações; o texto de estado some e a bolinha continua com a dica; vale para terminal e Web (o texto "Aguardando você" aparece nas duas barras); sem quebrar o layout em janela estreita; testado com o Claude Code real; documentar em `docs/DECISOES.md` e `docs/DESIGN.md`.
- **Base existente:** `switchMode` e `renderTabMenu` (`src/renderer/app.js`), `.state` na barra de abas (`renderTabs`), `chatCfg`/Configurações > Chat, `.c-perm` e `.c-mdl` em `src/renderer/chat.js`, `docs/DESIGN.md`.
- **Decisão (usuário, 2026-11-02):** os controles ficam no rodapé do app; depois de ver, **só a troca Chat/Terminal ficou** (botão com ícone, igual aos demais, sem pílula). Bolhas/Fluxo e Automático/Perguntar saíram do rodapé; o **Fluxo foi retirado do app** (só Bolhas) e a permissão fica só em Configurações > Chat. O "Aguardando você" da barra de abas foi mantido. Configurações > Chat é só o que o app usa ao abrir e nunca é regravada pelo controle do rodapé.
- **Feito:** `src/renderer/web.js` (`footChatCtl`, botão `swmode` que chama `switchMode`; ícone `chat`), `src/renderer/chat.js`, `src/renderer/app.js` (Configurações sem "Visual do chat"), `docs/DECISOES.md`.
- **Testado (CDP, instância isolada):** troca Chat↔Terminal mantendo a conversa e Configurações sem ser regravada; `npm run check` passou.
- **Validada em:** 2026-11-02.

### TASK-046 — Barra superior: sino centralizado e botões da janela mais elegantes

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (vista e aprovada pelo usuário em 2026-11-02 numa instância limpa; promovida para a `main` em 2026-11-02)
- **Prioridade:** Média (visual) — pedido do usuário em 2026-11-02, com duas capturas
- **Objetivo:** (1) o ícone do **sino** de notificações não está centralizado dentro do botão redondo (o desenho do sino fica deslocado em relação ao círculo); (2) os botões de **minimizar, maximizar e fechar** ficam com um **retângulo cheio** ao passar o mouse, e o de fechar mostra um **quadrado vermelho forte** de ponta a ponta da barra, que destoa do vidro do app.
- **Base existente:** `src/renderer/styles.css`: `.wc button` (50 px de largura, altura da barra), `.wc button:hover`, `.wc button.close:hover{background:#e5384a}` e `.wc button.close{border-top-right-radius}`; `.tbtn.round` (sino, 30 px) e o desenho do sino em `ICONS` (`src/renderer/app.js`, `data-togact`).
- **Ideias a validar com o usuário:** botões da janela com realce em **pílula ou círculo** menor (como o sino), com cantos arredondados e margem em volta, em vez do retângulo de ponta a ponta; fechar com um vermelho mais suave (translúcido, ou o vermelho só no ícone com um fundo discreto), mantendo o canto superior direito arredondado da janela; transição curta; foco por teclado visível. Centralizar o sino ajustando o `viewBox`/o caminho do SVG ou o alinhamento do botão (medir o centro real do desenho, não só o do quadro).
- **Critérios de aceite:** sino com o centro óptico no centro do círculo (conferido por captura ampliada); minimizar, maximizar e fechar sem retângulo cheio, com realce arredondado coerente com o resto do app; fechar continua óbvio e acessível; funciona maximizado, com a janela normal e no modo Ofuscado (cantos do Windows 11); capturas antes e depois; atualizar `docs/DESIGN.md`.
- **Feito:** o sino estava ~1 px fora do centro porque o `padding: 1px 6px` global dos botões deixava 16 px para o ícone de 18 px; `.tbtn` ficou sem padding. Minimizar, maximizar e fechar viraram pílulas 38×30 com realce discreto, foco por teclado visível e fechar com vermelho translúcido. **Ajuste final (usuário):** o sino ficou só o ícone, sem círculo; o círculo aparece no hover e com o painel aberto. `docs/DESIGN.md` atualizado.
- **Testado:** medidas e capturas ampliadas em instância isolada. Não testado: maximizada e modo Ofuscado.
- **Validada em:** 2026-11-02.

### TASK-043 — Ícone do Claude nas mensagens do chat

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (vista e aprovada pelo usuário em 2026-11-02 numa instância limpa; promovida para a `main` em 2026-11-02)
- **Prioridade:** Baixa (visual) — pedido do usuário em 2026-11-02, com captura do avatar atual
- **Objetivo:** o avatar da resposta no chat hoje é a marca do Termix (`>_` em quadrado azul). O usuário quer **o ícone do próprio Claude** nas mensagens (a pergunta continua com o ícone de pessoa).
- **A decidir ao começar:** qual ícone (o mascote pixelado laranja que o Claude Code mostra no terminal, ou o brilho/estrela do Claude) e como desenhar: um SVG simples próprio, em `src/renderer/chat.js` (`CHAT_MARK`) e `styles.css` (`.c-av`). Lembrar que é uma marca de terceiros; para uso pessoal tudo bem, mas não entra em material de divulgação (TASK-036) sem checar. No visual Fluxo os rótulos de texto continuam.
- **Critérios de aceite:** avatar da resposta com o ícone escolhido, nítido em 30 px; cor de fundo coerente com o tema; sem quebrar o visual Fluxo; captura antes e depois.
- **Decisão final (usuário, 2026-11-02):** o avatar da resposta virou só o símbolo, **sem fundo**, no **azul do app** (`--accent`, com brilho suave): o `>_` do Termix parado (silhueta na pergunta). Enquanto o Claude trabalha ("pensando" e resposta em andamento) o símbolo anima, **um por mensagem, em rodízio, entre 5**: brilho em raios (onda), órbita de pontos, ondas concêntricas, barras de áudio e o prompt `>_` com cursor piscando. Ao terminar, **a resposta guarda o símbolo que rodou, parado**; respostas do histórico usam o `>_`. "Reduzir movimento" desliga a animação. Saiu o ícone CHAT/TERM das abas. (O brilho laranja do Claude foi tentado e trocado pela identidade do app.)
- **Feito:** `src/renderer/chat.js` (`CHAT_MARK`, `CHAT_SPARK`, `CHAT_WORK`, `chatAvatar`, rodízio no envio, `.c-typing`), `src/renderer/styles.css` (animações por traço), `src/renderer/app.js`, `docs/DESIGN.md`.
- **Testado:** com o Claude Code real, 5 mensagens: cada resposta ficou com o seu símbolo, sem animação; capturas conferidas. Um defeito corrigido no caminho: a classe `.r` colidia com `.r{color:var(--bad)}` e deixava o símbolo vermelho (agora `.ray`).
- **Validada em:** 2026-11-02.

### TASK-042 — Refatoração de design: telas que não são terminais sem o fundo aparecendo nas bordas

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (vista e aprovada pelo usuário em 2026-11-02 numa instância limpa; promovida para a `main` em 2026-11-02)
- **Prioridade:** Média — pedido do usuário em 2026-11-02, com captura de Configurações
- **Objetivo:** hoje as telas Plugins, Skills, MCPs, Consumo, Integrações e Configurações são um painel arredondado, com borda e margem, flutuando dentro do vidro, e o fundo degradê aparece em volta. Pedido: **qualquer tela que não seja de terminal (nem o chat) deve ser uma coisa só com o app**, sem o fundo aparecendo nos arredores; o fundo/vidro com a moldura fica só para os terminais.
- **Base existente:** `#page` (`.stage.panel.glass`, `#page:not(.hide){margin:8px}` em `src/renderer/styles.css`), `renderPage` e `mode()` em `src/renderer/app.js`, a moldura em "U" (`framePath`/`layout`, `GEO`), `docs/DESIGN.md` (estrutura da janela e padrão dos controles).
- **Critérios de aceite (a refinar):** páginas ocupam a área do palco de ponta a ponta, contínuas com a barra lateral e o rodapé, sem margem de 8 px, sem borda dupla nem o degradê vazando nas laterais; o terminal e o chat continuam como estão (fundo de vidro); rolagem, cartões e controles seguem o padrão da TASK-031; funciona nas larguras 1600, 1180 e 980 e nos modos Degradê e Ofuscado; capturas antes e depois; atualizar `docs/DESIGN.md`.
- **Ideia a validar com o usuário:** como o rodapé de funções fica nessas telas (hoje some fora de terminal/Web) e se a barra lateral também perde o vidro ou só o palco muda.
- **Próximo passo:** auditar as telas atuais com capturas e propor 2 variações no HTML de protótipo antes de mexer no app.
- **Auditoria:** havia duas molduras (o recorte escuro do palco e, dentro dele, o `#page` como painel com borda e margem de 8 px). Testadas ao vivo A (página de ponta a ponta no recorte) e B (sem recorte, direto no vidro); a B venceu.
- **Feito:** `src/renderer/app.js` (`flatMode()`, `framePath(..., flat)`, `layout()` alterna `body.flatpage`, estende o palco à base e reajusta o terminal), `src/renderer/styles.css` (`body.flatpage`), `docs/DESIGN.md`.
- **Testado (CDP, instância isolada):** Plugins, Skills, MCPs e Configurações contínuos com o app; ida e volta ao chat com a altura certa. Não testado: Ofuscado, maximizada, larguras 1180/980.
- **Validada em:** 2026-11-02.

### TASK-036 — README profissional e página do projeto no GitHub

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (aprovada pelo usuário em 2026-11-02; instalador testado por ele e funcionando; promovida para a `main` em 2026-11-02)
- **Prioridade:** Alta (necessária antes de mandar o link para outras pessoas)
- **Objetivo:** o repositório não tem README. Criar um profissional: o que é o Termix, capturas de tela, como baixar (Releases) e instalar (inclusive o aviso do SmartScreen, pois o app não é assinado), requisito do Claude Code, como atualizar, limites conhecidos e como relatar problema. Depois de aprovado, promover a `dev1` para a `main` (só com pedido do usuário).
- **Feito:** `README.md` em português (o que é, recursos, instalação com o aviso do SmartScreen, atualização, desinstalação, primeiros passos, limites, como relatar problema, código) e `docs/img/chat.png` (captura só do conteúdo da janela, via CDP, numa instância zerada com projeto de demonstração, sem dados pessoais).
- **Decisões (usuário):** sem licença (o app não será comercializado; seção removida do README). Não há captura do terminal (o Claude Code mostra nome e e-mail).
- **Validada em:** 2026-11-02.

### TASK-044 — Trocar o modo de uma aba aberta (chat ↔ terminal) e o aviso de que a configuração só vale para abas novas

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (validada em DEV1 — Aprovada pelo usuário em 2026-11-02. Promovida para a `main` em 2026-11-02.; promovida para a `main` em 2026-11-02)
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
- **Status:** CONCLUÍDA (validada em DEV1 — Aprovada pelo usuário em 2026-11-02 (o ajuste da barra de rolagem do chat entrou junto). Promovida para a `main` em 2026-11-02.; promovida para a `main` em 2026-11-02)
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
- **Status:** CONCLUÍDA (validada em DEV1 — Aprovada pelo usuário em 2026-11-02 (layout do Claude Desktop, até 20 imagens). Promovida para a `main` em 2026-11-02.; promovida para a `main` em 2026-11-02)
- **Prioridade:** Alta — pedido do usuário em 2026-11-02, com wireframe e a captura do Claude como referência
- **Objetivo:** ao colar uma imagem (Ctrl+V) no campo de envio do chat, ela aparece como **miniatura dentro da caixa de prompt, acima do texto**, com contorno só em volta da imagem (como no Claude); a imagem segue junto com a mensagem. Wireframe do usuário: quadrado da miniatura em cima, à esquerda, e a barra de texto embaixo.
- **Critérios de aceite (a refinar ao começar):** colar imagem da área de transferência (print, cópia de imagem) mostra a miniatura com um "x" para remover; várias imagens lado a lado; arrastar arquivo de imagem para a caixa também funciona (se couber); enviar manda texto e imagens juntos e a bolha da pergunta mostra as miniaturas; o histórico reaberto (do `.jsonl`) também mostra as imagens; limite de tamanho/quantidade com aviso claro; sem quebrar a colagem de texto; testado com o Claude Code real (ele precisa "ver" a imagem e descrevê-la).
- **Notas técnicas:** o `stream-json` de entrada aceita `message.content` como lista de blocos, inclusive `{type:"image", source:{type:"base64", media_type, data}}`; hoje `chat:send` só manda texto (`src/chat.js`, `chatSendMsg` em `src/renderer/chat.js`). A colagem pode vir do evento `paste` do textarea (`clipboardData.items`) ou de um `clipboard.readImage()` no processo principal (hoje só existe `clip:read` de texto). Reduzir imagens grandes antes de enviar (custo em tokens). Atualizar o `history()` para devolver blocos de imagem.
- **Feito:** colar (Ctrl+V) ou arrastar imagem para a caixa mostra a miniatura (128×84 px, com "x") **dentro da caixa, acima do texto, como no Claude Desktop** (decisão do usuário em 2026-11-02, depois de testar duas variações com a miniatura saindo da barra, que não agradaram; não inventar layout novo); até 20 imagens (o mesmo limite do Claude Code), em uma fileira que rola na horizontal, com aviso rápido sobre a caixa ao passar do limite; a imagem é reduzida (lado maior 1568 px; PNG grande vira JPEG; recusa se passar de ~3,5 MB) antes de enviar; vai ao Claude como blocos `image` base64 junto do texto (pode enviar só a imagem); a bolha mostra as miniaturas e o histórico reaberto (`.jsonl`) também. Arquivos: `src/renderer/chat.js`, `src/chat.js`, `src/preload.js`, `src/renderer/styles.css`.
- **Testado (CDP, Claude Code real):** imagem 3000×2000 com a palavra ABACATE colada por evento de colagem: miniatura, envio, o Claude respondeu "ABACATE", e `chatHistory` devolveu a imagem; `npm run check` passou. Defeito achado e corrigido: a política de segurança da tela bloqueava `blob:` (trocado por `createImageBitmap`). Não exercitado: Ctrl+V com print real do Windows, arrastar arquivo, 5+ imagens, WebP/GIF.
- **Como validar:** `npm start`; num chat, copie um print (Win+Shift+S) e dê Ctrl+V na caixa; escreva "descreva a imagem" e envie.

### TASK-040 — Modo Chat por aba (conversa visual sobre o Claude Code)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (validada em DEV1 — testada pelo usuário na janela de demonstração e aprovada em 2026-11-02; ajustes de visual feitos durante a revisão; promovida para a `main` em 2026-11-02)
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
- **Validada em:** 2026-11-02. Promovida para a `main` em 2026-11-02. (e só com a versão consolidada e o instalador testado).

### TASK-033 — Arrastar e soltar das abas dos terminais não funciona direito (CRÍTICA)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (validada em DEV1 — aprovada pelo usuário em 2026-11-02; promovida para a `main` em 2026-11-02)
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
- **Validada em:** 2026-11-02. Promovida para a `main` em 2026-11-02.

### TASK-035 — Atualização do app com aviso no cabeçalho (MVP)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (validada em DEV1 — aprovada pelo usuário em 2026-11-02; o teste real com duas versões publicadas foi feito na TASK-020: Release v0.1.1, aviso, botão no cabeçalho, instalação e reabertura; promovida para a `main` em 2026-11-02)
- **Prioridade:** Alta (MVP) — pedido do usuário em 2026-11-02
- **Objetivo:** avisar quem tem o app instalado que há versão nova; ao clicar, atualiza e pede/faz o reinício; se a pessoa não quiser agora, o botão **Atualizar** fica no cabeçalho.
- **Decisões (usuário, 2026-11-02):** botão no cabeçalho do app quando a pessoa adia o aviso; hospedagem no **GitHub** com o repositório público (sem token no app).
- **Feito até agora:** `src/updater.js` (novo, `electron-updater`; consulta 15 s depois de abrir e a cada 4 h, baixa em segundo plano, instala ao fechar se ignorado; desligado em `npm start`; `TERMIX_FAKE_UPDATE=1` simula); `src/main.js` e `src/preload.js` (ponte `update:*`); `src/renderer/app.js` (aviso com Depois/Atualizar agora, botão no cabeçalho, confirmação se houver agente trabalhando) e `styles.css`; `package.json` (`publish` do GitHub, script `release`, dependência). Testado por CDP em instância isolada com a simulação: o aviso aparece, "Depois" o fecha e o botão fica no cabeçalho; capturas conferidas; `npm run check` passou.
- **Arquivos tocados:** `src/updater.js`, `src/main.js`, `src/preload.js`, `src/renderer/app.js`, `src/renderer/styles.css`, `package.json`, `package-lock.json`, `docs/DECISOES.md`, `docs/TASKS.md`, `docs/CHANGELOG_DEV.md`.
- **Como validar:** `TERMIX_FAKE_UPDATE=1 npm start` (aviso depois de ~6 s; Depois; botão no cabeçalho). Real: instalar a 0.1.0, publicar a 0.1.1 com `npm run release`, abrir a 0.1.0 e esperar o aviso.
- **Pendências:** nenhuma da atualização; sem assinatura de código (SmartScreen pode avisar).
- **Próximo passo:** próximos lançamentos usam versão 0.1.2 ou maior (`npm run release`).
- **Validada em:** 2026-11-02. Promovida para a `main` em 2026-11-02.

### TASK-020 — Testar o instalador em um Windows limpo (Sandbox)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (validada em DEV1 — testada no Sandbox pelo Claude e instalada pelo usuário na própria máquina em 2026-11-02; promovida para a `main` em 2026-11-02)
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
- **Validada em:** 2026-11-02. Promovida para a `main` em 2026-11-02.

### TASK-034 — Novo ícone do app: só o `>_` sobre degradê azul (MVP)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (validada em DEV1 — aprovada pelo usuário em 2026-11-02, com captura da barra de tarefas e do aviso; promovida para a `main` em 2026-11-02)
- **Prioridade:** Alta (MVP) — pedido do usuário em 2026-11-02, antes de validar o instalador
- **Objetivo:** o ícone da barra de tarefas e das notificações do Windows deve ser só o prompt `>_` sobre um quadrado em degradê, como os ícones do próprio Windows, e não o ícone padrão do Electron.
- **Feito até agora:** `assets/icon.svg` e `assets/icon-small.svg` redesenhados (degradê azul, `>_` branco, sombra suave; sem abas e sem janela desenhada); `assets/icon.ico` e `assets/icon.png` regerados (16 a 256 px). O `Termix.exe` empacotado (`npm run dist`) carrega o ícone novo.
- **Ajuste (usuário, 2026-11-02, "ainda está do mesmo jeito" no `npm start`):** em desenvolvimento o processo é o `electron.exe`, então o Windows mostrava o nome e o átomo do Electron. `src/main.js`: fora do app instalado, cria o atalho `Termix (dev)` no menu Iniciar com ID próprio (`com.termix.app.dev`) e o ícone novo; o instalado segue com `com.termix.app` e o atalho do instalador. Conferido: o atalho é criado com o alvo e o ícone certos; **o efeito na barra de tarefas e no aviso não pôde ser visto pelo Claude** (precisa reiniciar o app e ver).
- **Decisões:** o ícone do cabeçalho do app (`logo-mark.svg`) não foi alterado.
- **Arquivos tocados:** `src/main.js`, `assets/icon.svg`, `assets/icon-small.svg`, `assets/icon.ico`, `assets/icon.png`, `docs/DESIGN.md`, `docs/TASKS.md`, `docs/CHANGELOG_DEV.md`.
- **Como validar:** conferir o ícone no `Termix.exe` de `dist\win-unpacked` e, ao instalar (TASK-020), na barra de tarefas, no atalho e numa notificação (o nome deve ser "Termix").
- **Pendências:** o app instalado (nome "Termix", sem "(dev)") só será visto no teste do instalador (TASK-020).
- **Próximo passo:** TASK-033, depois TASK-020.
- **Validada em:** 2026-11-02. Promovida para a `main` em 2026-11-02.

### TASK-032 — Teste geral de plugins, MCPs e skills (feito pelo Claude)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (validada em DEV1 — aprovada pelo usuário em 2026-10-31; promovida para a `main` em 2026-11-02)
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
- **Validada em:** 2026-10-31. Promovida para a `main` em 2026-11-02.

### TASK-013 — Gerenciar plugins, skills e MCPs pelo app (MVP)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (validada em DEV1 — testada pelo Claude na TASK-032, por decisão do usuário; aprovada em 2026-10-31; promovida para a `main` em 2026-11-02)
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
- **Validada em:** 2026-10-31 (teste geral da TASK-032 aprovado pelo usuário; login com conta real segue nas Pendências). Promovida para a `main` em 2026-11-02.

### TASK-030 — Abas encaixadas na janela do terminal, como no Terminal do Windows (MVP)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (validada em DEV1 — aprovada pelo usuário em 2026-10-31; promovida para a `main` em 2026-11-02)
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
- **Validada em:** 2026-10-31 (o usuário aprovou). Promovida para a `main` em 2026-11-02.

### TASK-029 — Notificações bem encaixadas no app, com o cache como função principal (MVP)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (validada em DEV1 — aprovada pelo usuário em 2026-10-31 sem teste manual; testada só pelo Claude em instância isolada; promovida para a `main` em 2026-11-02)
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
- **Validada em:** 2026-10-31 (o usuário aprovou sem testar à mão, confiando no teste do Claude; o teste real de som, notificação do Windows e texto da dica com sessão real do Claude Code segue nas Pendências). Promovida para a `main` em 2026-11-02.

### TASK-031 — Auditoria de UI/UX e desempenho do app inteiro (MVP)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (validada em DEV1 — testada pelo Claude, por decisão do usuário em 2026-10-31; promovida para a `main` em 2026-11-02)
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
- **Validada em:** 2026-10-31 (testes e capturas feitos pelo Claude). Promovida para a `main` em 2026-11-02.

### TASK-028 — Medir o custo da retomada e novos gatilhos do botão Clear (só no app)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (validada em DEV1 — etapa 2; as candidatas seguem em aberto, sem data; promovida para a `main` em 2026-11-02)
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
- **Status:** CONCLUÍDA (validada em DEV1; promovida para a `main` em 2026-11-02)
- **Prioridade:** Alta (MVP)
- **Objetivo:** um botão **Clear** no alternador, ao lado de Terminais, que limpa o contexto do terminal ativo sem perder o fio: fecha a tarefa em arquivo, manda `/clear` e pede para retomar pelos arquivos do projeto (ideia do guia de economia de tokens do pacote `economia-tokens-pacote.zip`, que o app reproduz por dentro).
- **Decisões (usuário, 2026-10-30):** só o Clear por enquanto (Compact, Interromper e outras ações ficam fora; dificilmente serão usadas); o limite de contexto que faz o botão **pulsar** é configurável (exemplo dado: 15 %); o modelo é escolha da pessoa, o app não se envolve; as configurações ficam só dentro do app. Decisões minhas, sem objeção até aqui: um único botão que abre uma confirmação com duas saídas (**Só limpar** e **Fechar a tarefa e limpar**); o botão só vale com o agente aguardando; o rótulo "Clear" fica visível (a dica nativa não aparece na vista do alternador).
- **Feito até agora:** botão "Clear" na pílula do alternador (só na tela Terminais, junto de um separador), desabilitado sem terminal vivo e aguardando, com pulso âmbar quando o CTX do terminal ativo chega ao limite configurado; a largura do alternador cresce com o botão. Fluxo em `src/renderer/app.js` (`clearFlow`): confirmação → "Fechar a tarefa e limpar" envia o pedido de fechamento, espera o agente terminar (estado vindo dos hooks, conferido a cada 700 ms), confere se o terminal mostra o aviso final `TERMIX-CLEAR-OK` (senão pergunta se limpa mesmo assim) → envia `/clear` → ao chegar o hook `SessionStart` com `source: clear`, envia o pedido de retomada na conversa nova. "Só limpar" envia só o `/clear`. Travas: sem resposta do agente em 10 s o fluxo é cancelado; sem o `SessionStart` em 12 s também. Configurações > "Botão Clear": limite de contexto (0 desliga), texto do pedido de fechamento, texto do pedido de retomada e "Restaurar" (guardados em `settings.clear`). Os textos padrão são genéricos (procuram `docs/TASKS.md` ou `docs/HISTORICO-TAREFAS.md`, não fazem commit) e podem ser trocados por `/encerrar-tarefa` e `/retomar` neste projeto. Testado numa instância isolada: o app carrega, a página de Configurações e o botão (com pulso) aparecem certos; **o fluxo completo com um Claude Code de verdade ainda não foi exercitado**.
- **Ajustes após o 1º teste do usuário (2026-10-30):** o botão funcionou; (1) o alternador sumia ao abrir o menu da engrenagem do rail (agora só some com modal ou outros menus); (2) ícone do Clear trocado (círculo com X); (3) o `/clear` deixava o texto antigo na tela: ao chegar o `SessionStart` com `source: clear`, o app apaga a tela e o histórico visível e manda Ctrl+L para o Claude Code redesenhar; (4) Ctrl+C (copia com texto selecionado; sem seleção segue sendo o Ctrl+C do terminal) e Ctrl+V (cola; sem texto, como imagem, passa o Ctrl+V ao Claude Code) passaram a funcionar nos terminais, pela área de transferência do Electron (`clip:read`/`clip:write`).
- **Arquivos tocados:** `src/main.js`, `src/preload.js`, `src/renderer/app.js`, `src/renderer/web.js`, `src/renderer/styles.css`, `src/dock.js`, `src/dock.html`, `docs/DECISOES.md`, `docs/DESIGN.md`, `docs/TASKS.md`, `docs/CHANGELOG_DEV.md`.
- **Como validar:** `npm start`; abrir um terminal do Claude Code, mandar uma mensagem e esperar terminar. (1) O botão Clear fica habilitado; durante uma resposta, desabilitado. (2) Clicar: aparece a confirmação; "Só limpar" deve limpar a conversa; "Fechar a tarefa e limpar" deve registrar a tarefa, limpar e o agente retomar sozinho. (3) Em Configurações > Botão Clear, baixar o limite para 1: o botão pulsa quando o CTX passa disso; 0 desliga o pulso. (4) Trocar os textos por `/encerrar-tarefa` e `/retomar` e repetir (o app deve perguntar antes de limpar, pois o aviso final não aparece).
- **Pendências:** testar o fluxo completo com um Claude Code real (inclusive o `/clear` digitado pelo menu de comandos e o retomar na conversa nova); o aviso final `TERMIX-CLEAR-OK` depende de o agente obedecer; o botão age só na aba ativa do projeto atual; sem atalho de teclado (TASK-009).
- **Validada em:** 2026-10-30 (o usuário testou e aprovou: o botão funcionou, o /clear limpa a tela e o Ctrl+C/Ctrl+V funcionam). Promovida para a `main` em 2026-11-02.

### TASK-027 — Controle de contexto sob medida para o fluxo Rocruzta (só no app)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (validada em DEV1 — etapa 1; a etapa 2 e as candidatas seguem na TASK-028; promovida para a `main` em 2026-11-02)
- **Prioridade:** Alta (reflete direto no gasto de tokens)
- **Objetivo:** o fluxo Rocruzta é iniciado em todo projeto; o Termix deve fechar, limpar e retomar com o mínimo de tokens nesse fluxo, **só com configuração dentro do app**. O fluxo e o plugin não serão alterados (decisão do usuário; o dono já foi avisado).
- **Achados da análise (2026-10-30):** (1) o plugin `fluxo` não traz `/retomar` nem `/encerrar-tarefa` (são deste repositório); (2) o fluxo manda ler `CLAUDE.md`, `WORKFLOW.md` e `docs/TASKS.md` inteiros a cada tarefa; aqui o `TASKS.md` tem ~48 KB (≈ 14 mil tokens) e o `/retomar` custa ≈ 21 a 27 mil tokens antes de qualquer trabalho; (3) a retomada só precisa das seções *Em andamento* e *Aguardando* e da última entrada do changelog (≈ 4 mil tokens); (4) o hook `SessionStart` do plugin já injeta papel, branch, validação e nomes das tarefas ativas; (5) o app já recebe do Claude Code o contexto, o cache e o fim de cada resposta.
- **Etapa 1 — retomada enxuta (feita):** o app detecta o projeto no fluxo (`.claude/fluxo.json`) e lê o papel e a branch de `CLAUDE.local.md` (`flow:info` em `src/main.js`). Nesses projetos, o botão Clear usa pedidos próprios: **retomar** lê `CLAUDE.md` e `CLAUDE.local.md`, só as seções ativas do `TASKS.md` (busca por títulos + leitura com offset/limite), só a última entrada do changelog, `DECISOES`/`DESIGN` só se a tarefa pedir, `git status`/`log`, respeita a trava de contexto do DEV1 e, para devs auxiliares, confere se a dev1 tem novidades; **fechar** confirma aprovação, roda a validação do `fluxo.json`, edita só a entrada da tarefa ativa (status certo para o papel), acrescenta o changelog, registra o que ficou fora do escopo no Backlog, reescreve o HANDOFF (devs auxiliares), faz commit e push só na branch do papel (nunca promove) e termina com o aviso `TERMIX-CLEAR-OK`. GERENTE (somente leitura) só pode "Só limpar". Fora do fluxo, ou com a opção desligada, valem os textos genéricos. Em Configurações > Botão Clear: "Usar o fluxo Rocruzta nos projetos que o têm" (padrão Sim), "Commit e push ao fechar" (padrão Sim) e os dois textos, agora **vazios = automático** (o que a pessoa escrever vale sempre; textos genéricos salvos na versão anterior voltam a automático). Testado numa instância isolada: a detecção, o papel/branch/validação lidos e os textos gerados para o Termix e para uma pasta fora do fluxo; **o ciclo completo com um Claude Code real ainda não foi exercitado** (nem o ganho de tokens medido).
- **Arquivos tocados:** `src/main.js`, `src/preload.js`, `src/renderer/app.js`, `docs/DECISOES.md`, `docs/TASKS.md`, `docs/CHANGELOG_DEV.md`.
- **Como validar:** `npm start`; num terminal do Claude Code neste projeto (que está no fluxo), usar Clear > "Fechar a tarefa e limpar" depois de aprovar um trabalho pequeno: o agente deve validar, registrar só a tarefa ativa, fazer commit/push na `dev1` e escrever o aviso; o app limpa e o agente responde um resumo curto lendo só o necessário (conferir no CTX quanto a retomada custou). Num projeto fora do fluxo, o texto genérico. Em Configurações, desligar o fluxo e conferir que volta ao genérico.
- **Pendências:** o ganho de tokens ainda é estimado (a medição é a TASK-028); o modo GERENTE não foi exercitado.
- **Validada em:** 2026-10-30 (o usuário testou: "aparentemente funcionou perfeitamente"). Promovida para a `main` em 2026-11-02.

### TASK-022 — Rail flutuante com alternador Terminais / Web (MVP)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (validada em DEV1; promovida para a `main` em 2026-11-02)
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
- **Validada em:** 2026-10-30 (o usuário testou: o rail ficou como está e deve ser mantido; novas funções entram depois). Organização de páginas (grupos e atalhos) na TASK-023. Promovida para a `main` em 2026-11-02.

### TASK-021 — Informações do terminal no app (rail no lugar da status line do plugin) (MVP)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (validada em DEV1; promovida para a `main` em 2026-11-02)
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
- **Validada em:** 2026-10-30 (o usuário testou e aprovou). Promovida para a `main` em 2026-11-02.

### TASK-010 — Instalador, atalho e backup do estado (MVP)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (validada em DEV1; promovida para a `main` em 2026-11-02)
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
- **Validada em:** 2026-10-30. O usuário não tem como testar em outro PC agora e vai usar o app no dia a dia para dar feedback; aceitou o estado atual como MVP, com o teste em Windows limpo registrado na TASK-020. Promovida para a `main` em 2026-11-02.

### TASK-005 — Validar controles da janela e menus das abas

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (validada em DEV1; promovida para a `main` em 2026-11-02)
- **Prioridade:** Média (MVP)
- **Objetivo:** testar com cliques minimizar/maximizar/fechar, arrastar o header, e as ações duplicar, exportar texto e "fechar outras/à direita" do menu de botão direito.
- **Feito até agora:** testado por cliques reais (CDP + automação do Windows), sem encontrar defeito. Controles da janela: minimizar (janela iconificada e restaurada), maximizar e restaurar (ícone e dica alternam, tamanho muda), arrastar pelo espaço vazio do cabeçalho (a janela acompanhou o mouse) e fechar (com sessões ativas abre a confirmação: "Cancelar" mantém o app aberto, "Encerrar tudo e sair" fecha). Menu de botão direito da aba: Duplicar (cria "Aba B (2)" logo depois da original), Exportar texto (diálogo de salvar abre e grava o arquivo com o conteúdo do terminal), Fechar guias à direita e Fechar outras guias (fecham as abas certas; ficam desabilitados quando não há o que fechar).
- **Decisões:** teste visual via CDP (`--remote-debugging-port`) numa instância isolada (`--user-data-dir` próprio, estado semeado), para não mexer nas abas reais do usuário; nenhuma alteração de código foi necessária.
- **Arquivos tocados:** `docs/TASKS.md`, `docs/CHANGELOG_DEV.md` (nenhum arquivo de código).
- **Como validar:** `npm start`; clicar em minimizar/maximizar/restaurar/fechar, arrastar o cabeçalho, e no menu de botão direito de uma aba testar duplicar, exportar texto, fechar outras e fechar à direita.
- **Pendências:** nenhuma.
- **Validada em:** 2026-10-29 (o usuário aprovou). Promovida para a `main` em 2026-11-02.

### TASK-012 — Acompanhar a mudança do ID da sessão (/clear) para o Retomar não perder a conversa

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (validada em DEV1; promovida para a `main` em 2026-11-02)
- **Prioridade:** Média
- **Objetivo:** confirmar como `/clear` e compactação mudam o ID da conversa e garantir que o "Retomar" do Termix use sempre o ID atual.
- **Feito até agora:** verificado nos históricos reais (`~/.claude/projects`): `/clear` cria uma conversa nova (arquivo `.jsonl` novo, ID novo, hook `SessionStart:clear`); a compactação (`SessionStart:compact`) e o resume mantêm o ID. Antes da correção, a aba guardava o ID original e o Retomar voltava para a conversa de antes do `/clear`. Correção feita: o hook grava o `session_id` e o app atualiza o ID da aba quando ele muda.
- **Decisões:** o hook grava `session_id` em todo evento (não só no `SessionStart`), para cobrir o caso de um evento ser sobrescrito antes da leitura; o app atualiza `tab.sessionId` e marca a aba como iniciada.
- **Arquivos tocados:** `src/hook-wrapper.js`, `src/renderer/app.js`, `docs/TASKS.md`.
- **Como validar:** `npm start`; abrir uma aba, enviar uma mensagem, dar `/clear`, enviar outra; fechar o app e reabrir: a aba deve retomar a conversa posterior ao `/clear`.
- **Pendências:** nenhuma.
- **Validada em:** 2026-10-29 (o usuário testou: a aba voltou na conversa posterior ao `/clear`). Promovida para a `main` em 2026-11-02.

### TASK-018 — Animação de abertura do app (MVP)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (validada em DEV1; promovida para a `main` em 2026-11-02)
- **Prioridade:** Média (MVP)
- **Objetivo:** uma animação simples de abertura que cubra o tempo de carregar e reabrir os terminais, para a pessoa entrar já com tudo aberto, sem ver terminais vazios abrindo um a um.
- **Feito até agora:** tela de abertura (`#splash`) com a logo pulsando, mostrada desde o primeiro quadro e removida com fade quando `restoreOnOpen()` termina (mínimo ~900 ms, máximo 8 s). Sem abas para restaurar, some logo após o mínimo.
- **Decisões:** só anima `opacity`/`transform`; respeita "reduzir movimento" (sem pulso, só fade); o tempo máximo evita travar a entrada se uma aba demorar.
- **Arquivos tocados:** `src/renderer/index.html`, `src/renderer/styles.css`, `src/renderer/app.js`, `docs/DECISOES.md`, `docs/DESIGN.md`.
- **Como validar:** abrir 3 abas, fechar o app e reabrir: a logo aparece, some em fade e os terminais já estão abertos. Com nenhum terminal aberto, a abertura é rápida (~1 s).
- **Pendências:** nenhuma.
- **Validada em:** 2026-10-29 (o usuário testou e aprovou). Promovida para a `main` em 2026-11-02.

### TASK-004 — Notificações reais

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (validada em DEV1; promovida para a `main` em 2026-11-02)
- **Prioridade:** Alta
- **Objetivo:** painel lateral listando eventos (terminou, pediu permissão, erro), notificação do Windows e selo na aba quando a pessoa não está olhando para ela ou o app está em segundo plano.
- **Feito até agora:** `notifyTab()` em `app.js` centraliza os avisos (hooks Stop/Notification, heurística de reserva e falha ao iniciar): vão para o painel com o botão "Abrir", marcam a aba com um selo (verde = terminou, amarelo = precisa de você, vermelho = erro), destacam o projeto na barra lateral e, com o app sem foco, disparam notificação do Windows (`notify:show` no `main.js`) e piscam o ícone na barra de tarefas. Clicar na notificação traz a janela e abre a aba. O selo some quando a aba fica à vista com o app em foco.
- **Decisões:** aviso só quando a pessoa não está vendo a aba (aba oculta ou app sem foco); com o app em foco e a aba visível, nada é mostrado. Selo guarda o mais grave (erro > permissão > terminou).
- **Arquivos tocados:** `src/main.js`, `src/preload.js`, `src/renderer/app.js`, `src/renderer/styles.css`.
- **Como validar:** `npm start`; abrir duas abas, pedir algo longo na segunda e ir para a primeira: ao terminar, selo verde na aba, evento no painel e destaque no projeto; clicar em "Abrir" vai até a aba e o selo some. Com o app minimizado (ou outra janela em foco), terminar uma resposta ou pedir uma permissão: aparece a notificação do Windows e o ícone pisca; clicar nela abre o Termix na aba certa.
- **Pendências:** nenhuma.
- **Validada em:** 2026-10-29 (o usuário testou e aprovou). Promovida para a `main` em 2026-11-02.

### TASK-002 — Corrigir retomada de aba que nunca recebeu mensagem

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (validada em DEV1; promovida para a `main` em 2026-11-02)
- **Prioridade:** Alta
- **Objetivo:** a primeira aba mostrava "No conversation found with session ID …" ao reabrir o app, porque o Claude Code só grava o histórico depois da primeira mensagem e o app tentava `--resume` num ID sem histórico.
- **Feito até agora:** o app confere se o histórico da conversa existe (`session:exists`) antes de usar `--resume`; se não existir, abre a mesma conversa com `--session-id`.
- **Decisões:** não criar conversa nova com outro ID; reaproveitar o ID da aba, que ainda está vazio.
- **Arquivos tocados:** `src/main.js`, `src/preload.js`, `src/renderer/app.js`.
- **Como validar:** criar uma aba, fechar o app sem enviar nada, reabrir e restaurar a sessão: não deve aparecer o erro.
- **Pendências:** nenhuma.
- **Validada em:** 2026-10-29 (o usuário testou e aprovou). Promovida para a `main` em 2026-11-02.

### TASK-003 — Detecção confiável de "trabalhando / aguardando" com hooks do Claude Code

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (validada em DEV1; promovida para a `main` em 2026-11-02)
- **Prioridade:** Alta
- **Objetivo:** trocar a estimativa por tempo sem saída (2,5 s) pelos hooks do Claude Code, injetados por sessão como a status line. É a base do pulso da aba e das notificações.
- **Feito até agora:** `src/hook-wrapper.js` grava o último evento em `metrics/hook-<aba>.json`; `pty:spawn` injeta os hooks `SessionStart`, `UserPromptSubmit`, `PostToolUse`, `Notification` e `Stop` via `--settings` (somam-se aos hooks do usuário); o main lê a cada 300 ms e envia `hook:event`; `app.js` muda o estado: prompt enviado/ferramenta rodou = trabalhando; iniciou/terminou/pediu atenção = aguardando, com evento no painel quando a aba não está visível.
- **Decisões:** a heurística antiga continua como reserva (sem hooks, 2,5 s); com hooks ativos vira só proteção contra interrupção com Esc (que não dispara o Stop): 20 s de silêncio total. `PostToolUse` volta a aba para "trabalhando" depois que uma permissão é aprovada.
- **Arquivos tocados:** `src/hook-wrapper.js`, `src/main.js`, `src/preload.js`, `src/renderer/app.js`, `package.json`.
- **Como validar:** `npm start`; em uma aba, enviar um prompt: o ponto vira "Trabalhando" na hora e volta a "Aguardando você" quando a resposta termina (sem esperar 2,5 s). Pedir algo que exija permissão: deve ficar "Aguardando você"; aprovar: volta a "Trabalhando". Com outra aba em foco, o aviso "Terminou" aparece no painel. Apertar Esc no meio de uma resposta: volta a "Aguardando" em até ~20 s.
- **Pendências:** nenhuma.
- **Validada em:** 2026-10-29 (o usuário testou no app e aprovou). Promovida para a `main` em 2026-11-02.

### TASK-019 — Restaurar sozinho os terminais que estavam abertos ao reabrir o app

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (validada em DEV1; promovida para a `main` em 2026-11-02)
- **Prioridade:** Alta
- **Objetivo:** ao reabrir, as abas que estavam abertas quando o app foi fechado voltam sozinhas (conversa retomada pelo ID), sem o aviso "N sessões estavam ativas" e sem terminais vazios. As abas que o usuário fechou antes continuam fechadas.
- **Feito até agora:** aviso amarelo removido; `restoreOnOpen()` em `app.js` reabre as abas `live` + `open` uma de cada vez (intervalo de 400 ms), a ativa do projeto atual primeiro.
- **Decisões:** muda a decisão anterior "pergunta antes de restaurar" (`docs/DECISOES.md` atualizado); fila em vez de abrir tudo junto, para não pesar; falha numa aba mostra o estado de falha da própria aba, sem aviso global. A tela de "Continuar" proposta antes deixou de ser necessária. Animação de abertura fica na TASK-018.
- **Arquivos tocados:** `src/renderer/app.js`, `src/renderer/styles.css`, `src/renderer/index.html`, `docs/DECISOES.md`.
- **Como validar:** abrir 3 abas (uma delas sem nenhuma mensagem), fechar o app, reabrir: as 3 voltam sozinhas, sem aviso; uma aba fechada pelo X antes do fechamento do app não volta.
- **Pendências:** nenhuma.
- **Validada em:** 2026-10-29 (o usuário testou e aprovou). Promovida para a `main` em 2026-11-02.

### TASK-017 — Continuidade entre sessões: comandos e documentos de decisões

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (validada em DEV1; promovida para a `main` em 2026-11-02)
- **Prioridade:** Alta
- **Objetivo:** garantir que, depois de cada `/clear`, a sessão nova continue de onde a anterior parou, sem depender da conversa.
- **Feito até agora:** comandos `/retomar` e `/encerrar-tarefa` em `.claude/commands/`; `docs/DECISOES.md` (decisões de produto e motivos) e `docs/DESIGN.md` (aparência e regras de desempenho); `CLAUDE.md` aponta para eles.
- **Decisões:** os comandos ficam no repositório (versionados), não no plugin `fluxo`; não mudam `WORKFLOW.md` nem o bloco do fluxo no `CLAUDE.md`; `/encerrar-tarefa` nunca promove para a `main` nem consulta a `dev2`.
- **Arquivos tocados:** `.claude/commands/retomar.md`, `.claude/commands/encerrar-tarefa.md`, `docs/DECISOES.md`, `docs/DESIGN.md`, `CLAUDE.md`.
- **Como validar:** o usuário lê `docs/DECISOES.md` e confirma que está fiel; numa sessão nova (depois do `/clear`), rodar `/retomar` e conferir se o resumo bate com o `TASKS.md`.
- **Pendências:** os comandos só aparecem em sessões novas do Claude Code e ainda não foram executados; o primeiro teste real é o `/retomar` logo após o primeiro `/clear`.
- **Validada em:** 2026-10-29 (o usuário revisou as decisões do `docs/DECISOES.md` item por item e aprovou). Próximo passo: dar o primeiro `/clear`, rodar `/retomar` e começar a TASK-003. Promovida para a `main` em 2026-11-02.

### TASK-014 — Novo ícone do Termix (cabeçalho, janela e barra de tarefas)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (validada em DEV1; promovida para a `main` em 2026-11-02)
- **Prioridade:** Média
- **Objetivo:** ícone coerente que lembre um gerenciador de terminais, legível em todos os tamanhos e igual no cabeçalho do app, na janela e na barra de tarefas.
- **Feito até agora:** marca simplificada do cabeçalho (`assets/logo-mark.svg`); ícone detalhado do app (`assets/icon.svg`: fundo escuro com borda azul luminosa, barra com três abas coloridas e `>_` claro com brilho); versão de traço grosso para 16 e 32 px (`assets/icon-small.svg`); `tools/make-icon.js` gera `icon.png` e `icon.ico` usando cada versão no tamanho certo.
- **Decisões:** a logo do cabeçalho é só o prompt `>_` com brilho, sem caixa (escolha do usuário), o ícone "Terminais" da barra lateral usa janelas em cascata (para não ficar igual à logo); texto "Termix" alinhado ao prompt (altura e centro); o ícone do app e da barra de tarefas mantém o quadrado escuro. Duas artes (detalhada e pequena) porque os detalhes finos somem abaixo de 48 px. Gradiente do prompt em `userSpaceOnUse`, porque um gradiente por caixa de contorno não pinta o traço horizontal do `_`.
- **Arquivos tocados:** `assets/icon.svg`, `assets/icon-small.svg`, `assets/logo-mark.svg`, `assets/icon.png`, `assets/icon.ico`, `tools/make-icon.js`, `src/renderer/app.js`, `src/renderer/styles.css`.
- **Como validar:** abrir o Termix e conferir o ícone no cabeçalho, na barra de tarefas e no Alt+Tab.
- **Pendências:** nenhuma.

### TASK-015 — Botão de reiniciar discreto e barras de rolagem finas

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (validada em DEV1; promovida para a `main` em 2026-11-02)
- **Prioridade:** Média
- **Objetivo:** o botão Reiniciar/Retomar vira só um ícone sutil (com dica ao passar o mouse); as barras de rolagem de todo o app ficam finas, transparentes e recuadas das bordas arredondadas, sem passar da moldura.
- **Feito até agora:** botão `.btn.icon` (gira enquanto reinicia); barras do navegador estilizadas (trilho recuado 18 px, thumb de 4 px de borda) e barra do xterm colorida pelo tema (`scrollbarSlider*`) e estreita por CSS.
- **Decisões:** o texto do botão passa para o `title` e `aria-label`; o menu de botão direito da aba continua com "Reiniciar com a conversa atual".
- **Arquivos tocados:** `src/renderer/app.js`, `src/renderer/styles.css`.
- **Como validar:** abrir uma página longa (Configurações com janela pequena) e um terminal com histórico e ver se a barra fica dentro das bordas.
- **Pendências:** nenhuma.
- **Validada em:** 2026-10-29 (o usuário aprovou o resultado). Promovida para a `main` em 2026-11-02.

### TASK-016 — Tela "nenhum terminal aberto" com as abas fechadas do projeto

- **Responsável:** DEV1
- **Status:** CONCLUÍDA (validada em DEV1; promovida para a `main` em 2026-11-02)
- **Prioridade:** Média
- **Objetivo:** quando um projeto não tem terminal aberto (por exemplo, depois de fechar o app e encerrar as sessões), a tela lista as abas fechadas do projeto, a mais recente em destaque com "há X s/min/h", para continuar de onde parou.
- **Feito até agora:** `noTermHTML` em `app.js`: card "Continuar de onde parou" (mais recente) e lista "Outros terminais fechados"; tempo vem da data do histórico da conversa (`sessions:scan`), com `closedAt` como reserva; abas que nunca receberam mensagem viram um resumo com "Arquivar vazias"; botões Continuar/Reabrir/Arquivar e "Importar conversas da pasta…"; tempo relativo atualizado a cada 15 s; corrigido o centro da tela vazia que cortava listas longas.
- **Decisões:** a tela ficou só com "+ Terminal", o mais recente em destaque e uma lista dos terminais abertos antes neste projeto, sem rolagem (o número de linhas depende da altura; o resto vira "e mais N…", que abre a lista de sessões fechadas, onde ficam arquivar e importar). Tiramos da tela "Arquivar vazias" e "Importar conversas"; clicar numa linha reabre e retoma a conversa.
- **Arquivos tocados:** `src/renderer/app.js`, `src/renderer/styles.css`.
- **Como validar:** fechar todas as abas de um projeto com conversas e ver a tela; clicar em Continuar deve reabrir e retomar a conversa.
- **Pendências:** nenhuma.
- **Validada em:** 2026-10-29 (o usuário aprovou o resultado). Promovida para a `main` em 2026-11-02.

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
