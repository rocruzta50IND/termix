<!-- fluxo:v1 — escrito pelo DEV2, lido pelo DEV1. É a ÚNICA parte da dev2 que o DEV1 vê antes de o usuário aprovar a entrega. -->
# HANDOFF DEV2 → DEV1

Manual de integração da dev2 para o Rodrigo (e para a IA dele). O DEV2 reescreve este arquivo a cada entrega e o inclui no commit/push da dev2.

**Regras de escrita:** alto nível, sem código, diffs ou trechos de arquivos. Podem aparecer nomes de arquivo, funções públicas e formatos de dados. O DEV1 só tem acesso a este resumo até o usuário aprovar; se a entrega for reprovada, ele não deve ficar com o conteúdo da dev2 no contexto.

- **Status:** AGUARDANDO DECISÃO  <!-- AGUARDANDO DECISÃO | APROVADA | REPROVADA | EXPERIMENTO (não entregar) -->
- **Tarefas:** DEV2-001 a DEV2-018 e DEV2-021 a DEV2-027
- **IDs de tarefa usados pela dev2:** DEV2-001, DEV2-002, DEV2-003, DEV2-004, DEV2-005, DEV2-006, DEV2-007, DEV2-008, DEV2-009, DEV2-010, DEV2-011, DEV2-012, DEV2-013, DEV2-014, DEV2-015, DEV2-016, DEV2-017, DEV2-018, DEV2-021, DEV2-022, DEV2-023, DEV2-024, DEV2-025, DEV2-026, DEV2-027 (numeração própria DEV2-xxx; a dev2 não usa TASK-xxx; os números 019 e 020 não foram usados nesta entrega)
- **Base:** a dev2 está sincronizada com a dev1 na **versão 0.7.0** (TASK-134, modo `--embed`). Zero commits atrás da dev1.
- **Data:** 2026-11-12

---

## 1. Resumo em 1 minuto

**O que é:** um módulo isolado, "Vibe Coding e Mutirão", que fica quase todo em `src/vibe/` (processo principal) e `src/renderer/vibe/` (interface). Ele pega um projeto, cria um **orquestrador** e um **dev** (duas abas de Claude Code), planeja, executa tarefa por tarefa com uma **trava em código** (a IA não mexe na main, não força push, não apaga em massa), faz o deploy pelo Termix e se recupera de erros sozinho. Inclui também o **Mutirão** (dividir um projeto entre sócios pelo git), o **Organizador** (projeto com várias pastas), o **"Retomar projeto"** (estrutura legível + chats antigos + pop-up) e a **política de autonomia por projeto**.

**O que entra:** tudo, funcionando sem chaves experimentais (desde a DEV2-024 não há chave em Configurações). Botões "Vibe Coding" (cabeçalho), Mutirão (painel lateral e pasta "Mutirão" da barra), pop-up "Retomar projeto" ao abrir um projeto, mapa do Organizador em "Usar pasta existente" com várias pastas.

**O que está ADIADO (a dev2 assume depois, ver seção 5):**
- **Delegar tarefa:** código pronto e testado, mas **estacionado** (fora da interface) até o Rodrigo fazer o login do Hub com PIN.
- **Telegram (DEV2-019):** não começou.
- **Mutirão com IA real** e as validações com Claude Code real (itens do backlog das DEV2-015, 016, 025 e 026).

**O que o RODRIGO decide (seção 6):** o lugar final dos botões no layout; o login do Hub com PIN (e religar o Delegar); as 3 sugestões da DEV2-026; e a integração, que continua **manual**.

---

## 2. Como integrar

A integração é manual, pelo fluxo (`/fluxo:integrar`). Nada deve ser feito pela dev2 na dev1 nem na main.

**Passos:**
1. Na dev1, com a árvore limpa, rodar `/fluxo:integrar` e pedir a dev2. Liberar a leitura da dev2 só depois de ler este handoff.
2. Integrar por **merge** (não rebase, sem force). A dev2 já contém a dev1 0.7.0, então deve ser um merge sem conflito nos arquivos da dev1; a versão do `package.json` é a da dev1 (0.7.0).
3. Rodar `npm run check` e os testes da seção 2.3.
4. Abrir o app e seguir a seção 3.
5. Commit do merge no padrão do fluxo (`TASK-XXX: integrar dev2 na dev1 (...)`), atualizar `docs/TASKS.md` e `docs/CHANGELOG_DEV.md` da dev1.

### 2.1 Arquivos de núcleo que o módulo toca (todo o resto é arquivo novo)

- **`src/main.js`:** (a) carrega o módulo com um `require('./vibe')` protegido por try/catch, passando ipcMain, dialog, app e a janela, para que um erro nele nunca derrube o app; (b) ao abrir um terminal, pergunta ao módulo se a aba é do Vibe e, sendo, usa os `--settings` com a **trava**; as outras abas seguem iguais; (c) no fechamento da janela, o aviso "há ciclo do Vibe ou Mutirão rodando" (diálogo nativo, só aparece com ciclo ativo).
- **`src/preload.js`:** uma linha, o método `vibe`, que só aceita canais `vibe:*`.
- **`src/renderer/index.html`:** duas linhas (o estilo e o script do módulo). O módulo carrega os próprios arquivos de interface por dentro.
- **`src/renderer/app.js`:** (a) a pasta "Mutirão" da barra lateral lista também os mutirões, com as entregas k/N; (b) "Novo mutirão" desenha a tela fornecida pelo módulo (o Workflow antigo deixa de ser criado; os existentes continuam abrindo); (c) a escolha de pasta do "Novo projeto" virou uma função reaproveitada (resolve criar, usar existente ou clonar) e o "Usar pasta existente" aceita várias pastas pelo Organizador; (d) uma chamada ao módulo ao adicionar um projeto existente (oferta da estrutura e dos chats antigos).
- **`package.json`:** a lista do `npm run check` ganhou os arquivos do módulo e a seção de scripts ganhou `test:vibe`. Nenhuma dependência nova, nenhuma mudança de versão.
- Estilos: o módulo traz o próprio CSS (`vibe.css`, `organizador.css`, `retomar.css`, `delegar.css`); o `styles.css` da dev1 só ganhou uma linha para o k/N do Mutirão na barra.

### 2.2 Pontos de risco no merge

- **`package.json`:** a linha do `check` é longa e muda dos dois lados; ao resolver, manter os arquivos da dev1 (inclusive `src/embed.js`) e os do módulo. Foi exatamente o único conflito na sincronização com a 0.7.0. **Aviso para bisect:** o commit `09884c6` da dev2 tem marcadores de conflito no `package.json` (saiu assim por engano), corrigidos no `3679197`; só importa se alguém fizer bisect pela dev2, o estado final está limpo.
- **`src/renderer/app.js`:** o ponto de maior risco; os trechos do módulo estão em funções do "Novo projeto" e da barra lateral (renderização das categorias). Se a dev1 mexer nelas, o merge precisa manter os dois lados.
- **`src/main.js`:** o trecho do `--settings` do Claude Code e o do evento de fechar a janela. Se a dev1 mudar como as abas de Claude Code são abertas, o ponto do módulo precisa acompanhar.
- **Modo `--embed` (`src/embed.js`):** o módulo usa só o `window.termix.vibe(...)` do preload, que o embed já repassa pelo WebSocket; nada do módulo precisou mudar no embed.

### 2.3 Testes a rodar depois da integração

Os testes estão no repositório, em **`tools/vibe-testes/`** (com um `README.md` com um comando por teste, o esperado e os avisos). **Não fazem parte do `npm run check`**, que continua o da dev1. **Nunca rodam em projeto real e nunca gastam IA**: usam repositórios de brinquedo, remotos locais, um Claude Code falso e uma configuração do Claude Code de teste; tudo fica na pasta temporária do sistema. Pré-requisito: `npm install`.
- `npm run check`: sem erro.
- **Sem Electron, tudo de uma vez:** `npm run test:vibe`. Esperado: "Todos como esperado" (dep16 68, rec15 36 [35 com 1 falha conhecida se o caminho temporário for longo], pol14 55, trava13 113, mod5 31, mod6 41, mod7 23, mod9 16, tar17 33, mut23 97, org26a 14, del25 77, ret26 38).
- **Com Electron e agente falso, um de cada vez:** `node tools/vibe-testes/rodar-electron.js <teste>` (sem argumento, lista). Esperado: run7 23, run15 29, run16 a 28, run16 b 9, run17 26, run22 10, run23 52, run24 26, run25 35, run26 44, embed-delegar27 15 (Delegar estacionado e modo `--embed`).
- **Resultados da dev2 na 0.7.0, rodados a partir de `tools/vibe-testes/`:** todos os acima como esperado (run26 44/44, run24 26/26, run7 23/23, run15 29/29, run16 28/28 e 9/9, run17 26/26, run22 10/10, run23 52/52, run25 35/35, embed-delegar27 15/15; sem Electron 13 de 13 como esperado).
- Rodar um por vez e sem outro Termix de teste aberto: com processos do Electron sobrando de uma rodada anterior, o run25 chegou a falhar por tempo e passou 35/35 ao ser repetido sozinho.


---

## 3. Como testar em 5 minutos no app real

Sem custo de IA, sem mexer em projeto real. Use uma pasta de brinquedo com `git init` e um commit.
1. Depois de integrar: `npm install` e `npm start` na dev1. Em "Novo projeto > Usar pasta existente", escolha a pasta de brinquedo: aparece a oferta "Criar estrutura do projeto" (escolha "Agora não"/sem coleta); o projeto abre.
2. Feche e reabra o app e abra o projeto: o pop-up **"Retomar projeto"** aparece (Inicializar orquestrador e dev, Retomar últimas conversas, Agora não). "Agora não" fecha sem efeito.
3. No cabeçalho, **"Vibe Coding"**: a escolha "Projeto novo" ou "Tarefa num projeto em andamento"; abra o formulário da tarefa e veja o resumo do projeto montado sem IA. Não precisa enviar.
4. Pasta "Mutirão" da barra lateral e "Novo mutirão": a tela de criação do módulo. Não precisa criar.
5. "Usar pasta existente" com **duas pastas**: abre o mapa do Organizador (pasta principal, um orquestrador e um dev), com os botões do rodapé fora da área que rola.
6. Confirmar que **não aparece** "Delegar tarefa" no cabeçalho nem "Conta neste PC" em Configurações (estacionado de propósito).
7. Opcional, no modo `--embed` do Hub: o botão "Vibe Coding" fica no cabeçalho do Termix, que o `--embed` esconde (ver seção 4.2); o resto funciona.

---

## 4. O QUE O RODRIGO PRECISA CRIAR para a nossa parte funcionar inteira

### 4.1 Login do Hub com PIN (para religar o "Delegar tarefa")

**Situação:** o Delegar está pronto e testado, mas as contas hoje são um **mock** (5 nomes fixos, sem PIN) e, por decisão do Ygor, o botão está **fora da interface** até o login existir. Nenhuma conta mock aparece em lugar nenhum, a vigia de 5 minutos não roda e o código inteiro continua no repositório.

**O que o módulo espera receber do login (contrato):**
- **Identidade da pessoa:** um nome único e estável (o mesmo que será gravado no pedido, no índice e no marcador); hoje é um dos cinco nomes. Se o Hub tiver um id interno, ele deve vir junto, mas o nome é o que é usado para endereçar pedidos.
- **A lista de pessoas** possíveis (para o campo "Para quem"); a conta ativa é excluída da lista de quem recebe.
- **A conta ativa neste PC:** quem está logado agora no Hub/Termix. Se ninguém estiver logado, o módulo trata como "sem conta" e não vigia nem envia.
- **A branch devN da pessoa** **não** vem do login: é escolhida no pedido (próxima devN livre entre dev2 e dev5). A relação pessoa-branch fica no índice do pedido; a proposta sugere (e o Rodrigo decide) guardar também no `.claude/fluxo.json` (ver 6).

**Onde ligar:** (1) trocar a fonte dos dados em `src/vibe/contas.js`: as funções `listarContas()` e `contaAtual()` (e `definirConta()`, que deixa de existir quando a conta vem do login) passam a ler do Hub; o resto do módulo (`src/vibe/delegar.js` e a interface) não muda; (2) mudar a constante `DELEGAR_ATIVO` para verdadeiro em `src/renderer/vibe/delegar.js`, que religa o botão no cabeçalho, o painel, a vigia de 5 minutos e os avisos; (3) tirar o campo "Conta neste PC (provisório)" de Configurações (ele só existe para o mock).

**O que usa a conta (para o Rodrigo não esquecer nada):**
- **Vigia (a cada 5 min e no "Atualizar"):** só roda com conta ativa; lê, sem IA, os pedidos para a conta em `.termix/delegar/` da dev1 (`git fetch` + `git show`) e, para o responsável, só o marcador de estado de cada devN.
- **Pedido:** arquivo por pedido e um `indice.json` em `.termix/delegar/` na **dev1**, com para quem (nome da conta), de quem, branch devN, datas e estado (enviado, em andamento, entregue, aprovado, reprovado).
- **Marcador na devN:** `estado-<pedido>.json` em `.termix/delegar/` na branch do dev, só com estado e datas, escrito quando a pessoa clica "Começar" e "Entregar".
- **Quem é responsável:** continua sendo o papel DEV1 do projeto com o fluxo (não vem da conta).

**Proposta completa (`docs/PROPOSTA_DELEGAR_TAREFA.md`, seções 3 a 5), em resumo:**
- **Seção 3 (login):** perfil por sócio com nome e PIN; o PIN guardado **só como hash**, com sal por pessoa e algoritmo lento, mínimo de 6 dígitos, bloqueio local depois de tentativas erradas e cópia local para funcionar sem rede. Opções de armazenamento: A) repositório privado de perfis da empresa sincronizado por git (sugerida), B) arquivo de perfis por projeto, C) pasta de nuvem compartilhada, D) serviço com banco (única com limite de tentativas e revogação reais). Autor dos commits: `user.name` com o nome do sócio e o e-mail compartilhado. **Ressalva:** com a conta GitHub compartilhada, perfil e PIN organizam o trabalho e evitam engano, **não são proteção forte**.
- **Seção 4 (reaproveitamento):** o plugin fluxo (branches, papel, sincronizar, integrar com a trava de contexto), o Mutirão (troca de pedidos e entregas pelo git) e o sino de notificações.
- **Seção 5 (fases):** 1 perfis com PIN; 2 quem é quem no projeto (mapa branch-pessoa no `fluxo.json`, papel da máquina deduzido, `CLAUDE.local.md` gerado); 3 pedido; 4 recebimento; 5 entrega e aviso; 6 "Analisar entrega"; 7 Telegram. **As fases 3 a 6 já estão implementadas pela dev2 (com o mock)**; faltam as fases 1 e 2, que são do Rodrigo, e a 7.

### 4.2 Lugar final dos botões Vibe Coding, Mutirão e Delegar

**Hoje:** o "Vibe Coding" fica no cabeçalho (barra de cima), em um grupo de botões do módulo; o "Delegar tarefa" ficaria ao lado dele (está estacionado); o Mutirão tem três pontos de entrada: a pasta "Mutirão" da barra lateral, a tela "Novo mutirão" e o painel ao lado do terminal, aberto a partir do projeto. O pop-up "Retomar projeto" aparece sozinho ao abrir um projeto e não depende de botão.

**No modo `--embed` do Hub:** o `--embed` esconde o cabeçalho do Termix (o Hub é a janela). Como os botões do módulo estão nesse cabeçalho, **no `--embed` o botão "Vibe Coding" e o "Delegar tarefa" não aparecem**; o Mutirão pela barra lateral e o pop-up "Retomar projeto" não dependem do cabeçalho. O Rodrigo precisa decidir um lugar que exista nos dois modos (por exemplo, na barra lateral, no rodapé ou no menu do projeto) ou um botão do Hub que chame o módulo. **Conferido (DEV2-027, Edge e CDP, só o conteúdo):** no `--embed` a interface carrega o módulo inteiro e o canal do módulo responde pelo WebSocket; o botão "Vibe Coding" **existe, mas fica invisível** (o cabeçalho é escondido), então não há clique possível para o usuário; o painel do Mutirão (aberto pela pasta "Mutirão" da barra) e o pop-up "Retomar projeto" aparecem e funcionam; clicar o botão escondido por script abre normalmente a escolha do Vibe. Nada do `--embed` foi alterado. **Pontos de entrada para o novo lugar dos botões:** o botão do cabeçalho (que dispara a tela do Vibe), a função que abre o painel do Mutirão de um projeto, a que abre o painel do Delegar (só com `DELEGAR_ATIVO`) e a ponte da interface que abre o Vibe de tarefa já preenchido. A lógica não depende de onde o botão fica.

### 4.3 Telegram (DEV2-019)

**O que já existe:** o ponto de aprovação do deploy é um **arquivo** por projeto (`autorizacao.json`, na pasta de deploys do módulo, com estado aguardando, autorizado, negado ou fechado, o resumo do deploy e a origem da decisão). A interface (sino e painel) e, no futuro, o Telegram gravam a decisão pelo **mesmo caminho** (ação "decidir" do módulo de deploy) e o ciclo apenas lê o arquivo. Ou seja, o ciclo já está pronto para uma decisão vinda de fora.

**O que falta:** o lado do bot (receber a decisão do chat), o aviso ao chat (pedido de autorização, ciclo concluído, entrega), e como o bot alcança o app do usuário. Se o Rodrigo quiser **centralizar no Hub**: o Hub recebe a mensagem do Telegram e chama o app pelo mesmo caminho que o clique do sino (gravar a decisão com origem "telegram"); o aviso sairia do mesmo evento que hoje vira notificação no sino. A DEV2-019 fica para depois, junto com o Ygor.

### 4.4 Outras dependências do núcleo

- **Claude Code instalado** e acessível (as abas são terminais de Claude Code); o módulo grava uma marca de pasta confiável no arquivo de configuração do Claude Code, com cópia de segurança.
- **git** no PATH; o remoto é necessário para Mutirão e Delegar.
- **Fluxo Rocruzta** (`.claude/fluxo.json` e papéis): o deploy, o Delegar e o fim de ciclo dos devs auxiliares dependem do papel do fluxo; sem o fluxo, o dono do projeto é quem manda.
- **Sem dependências npm novas.**
- **Testes:** em `tools/vibe-testes/` (README com os comandos); um atalho `npm run test:vibe` foi acrescentado à seção de scripts do `package.json`, sem tocar no `check`.
- **`npm install` depois do merge:** a dev1 0.7.0 trouxe a dependência `ws` (do `--embed`); sem ela o modo `--embed` não sobe.

---

## 5. PENDÊNCIAS DA DEV2 (adiadas; a dev2 assume depois)

- **DEV2-019 Telegram.** *Motivo:* decisão do Ygor (por último e junto com ele) e depende de onde fica o bot (talvez o Hub). *Pronto:* o arquivo de autorização do deploy, lido pelo ciclo, e o sino. *Falta:* o bot, o aviso e a decisão pelo chat.
- **Delegar religado depois do login.** *Motivo:* o login do Hub com PIN é do Rodrigo; o Ygor estacionou o botão até lá. *Pronto:* todo o fluxo (pedido, recebimento, entrega, análise só do handoff, aprovar e reprovar), com testes. *Falta:* trocar a fonte das contas, ligar `DELEGAR_ATIVO` e validar com contas reais, com um orquestrador real escrevendo a tarefa.
- **Mutirão com IA real.** *Motivo:* regra de não gastar IA real nesta entrega. *Pronto:* tudo testado com agente falso e remotos locais, e uma rodada real do Vibe comum. *Falta:* o dono gerar a divisão com o orquestrador real, o Vibe de um sócio de ponta a ponta e a implementação automática com IA.
- **Validações com Claude Code real (backlog das DEV2-015, 016, 025 e 026).** *Motivo:* mesmo, sem custo de IA agora. *Pronto:* testes com agente falso. *Falta:* o F5 da aba e a decisão do orquestrador na recuperação; o Dev consertando o portão do deploy e o handoff do fim do ciclo escrito pelo orquestrador; a tarefa escrita pelo orquestrador no Delegar; a coleta dos chats antigos e o "Continuar ciclo" do pop-up.
- **Clique no diálogo nativo do aviso ao fechar.** *Motivo:* o diálogo é nativo e o teste automático não o aciona. *Pronto:* o teste confirma que o app não fecha com ciclo rodando e que o processo principal recebe a lista de projetos. *Falta:* conferir à mão os dois botões ("Fechar e interromper" e "Cancelar").

---

## 6. Decisões do Rodrigo

1. **Sugestão 1 (da DEV2-026): retomada de conversa por ID como gargalo de tokens.** Hoje cada aba reabre a conversa pelo ID; depois de horas o cache do prompt expirou e a primeira mensagem reprocessa o histórico inteiro, com custo alto e sem aviso. *Proposta:* abrir com contexto limpo e o estado em arquivos (guia, tarefas, estado) como padrão, e deixar a retomada por ID como opção explícita com aviso de custo. O módulo já faz isso só no pop-up "Retomar projeto". A decisão sobre o núcleo é dele.
2. **Sugestão 2: padrão orquestrador + dev nos projetos de desenvolvimento.** Hoje o núcleo abre uma aba por conversa, sem papéis; os sócios acabam com 9 ou 10 chats sem papel. *Proposta:* todo projeto de desenvolvimento nasce com orquestrador (decide, mantém a estrutura) e dev (executa), com a estrutura mínima em arquivo. O dev aberto sem tarefa não gasta token.
3. **Sugestão 3: chat simples e temporário para o dia a dia.** Perguntas rápidas criam conversas permanentes que viram ruído na lista e na retomada; projetos em modo bolhas ficam sem pop-up e sem estrutura. *Proposta:* um chat simples e temporário, sem retomada automática e com arquivamento fácil.
4. **Lugar final dos botões** (seção 4.2), incluindo o comportamento no `--embed`.
5. **Login do Hub e PIN** (seção 4.1), incluindo a opção de armazenamento do PIN e se o mapa branch-pessoa entra no `fluxo.json`.
6. **Integração:** continua **manual**; o Termix não junta branches da dev2 nem do Delegar. Se a decisão for não integrar, a dev2 segue como experimento.
7. **O nome "Mutirão" em dois lugares:** desde a TASK-132 o núcleo chama de Mutirão o antigo Workflow, e o módulo tem a sua função "Mutirão" (dividir o projeto entre sócios). Não foi renomeado; o Rodrigo decide o nome.

---

## 7. Limitações conhecidas e detalhes por tarefa

### Limitações conhecidas

- A trava cobre os caminhos comuns, mas **não é uma sandbox**: um script escrito e rodado pelo próprio agente poderia escapar; por isso o Termix também confere o git depois de cada tarefa e pausa se a principal mudar. Apagar de forma recursiva é recusado até dentro do projeto.
- O arquivo de configuração do Claude Code recebe uma marca por projeto do Vibe, com cópia de segurança (10 mais recentes) e troca atômica; as sessões abertas do Claude Code também escrevem nele. Validado só com um arquivo de teste.
- **Deploy:** é a primeira vez que o Termix (não a IA) escreve na main e no remoto, sem forçar, só para o DEV1 ou o dono. Testado só com repositórios locais; a receita roda comandos do projeto com a principal em checkout.
- **Recuperação de erro:** o ciclo pode terminar uma tarefa como pendência sem o humano ver na hora (o sino avisa e a lista fica no painel).
- **Delegar:** estacionado; com a conta mock qualquer pessoa pode se passar por outra (organiza, não protege). A integração é manual.
- A conferência "esta conversa existe?" olha só a pasta padrão do Claude Code (ignora `CLAUDE_CONFIG_DIR`).
- Depois de um Esc, a aba fica "trabalhando" por até 20 segundos (só visual).
- Em Configurações, "Notificações", "Conectores" e "Projetos arquivados" aparecem dentro do cartão do "Botão Clear" (bloco provavelmente não fechado na dev1; não é do módulo).
- No modo `--embed` os botões do cabeçalho do módulo não aparecem (seção 4.2).

### Detalhes por tarefa (histórico enxuto)

- **001 a 003:** casca do módulo, tela de entrega do projeto (formulário engessado e modelo .md), as duas abas (orquestrador e dev), plano e perguntas indispensáveis.
- **004:** execução autônoma com a **trava em código**; Termix cria/confere a branch de trabalho, marca a pasta como confiável e passa as tarefas ao dev uma a uma, com conferência do git e até duas refações; pausas por limite de uso, publicação, humano ou erro.
- **005 e 006:** o Mutirão (dono e sócios, divisão publicada na branch do dono, parte do sócio, entrega, contador) e a implementação automática (juntar as entregas, conflitos primeiro, planejar e executar na branch do dono, enviar só ela).
- **007 e 009:** robustez do ciclo (tarefa só de validação, limite de tentativas, tempo limite, "Parar" consistente, envio final com remoto à frente; alarme falso do plano e conflito resolvido escolhendo um lado).
- **008 e 012:** guia de validação do MVP e prova técnica do ciclo com agentes reais num projeto de brinquedo (cerca de 7 pontos da janela de 5 horas).
- **010, 024 e 026:** Organizador (várias pastas; hoje um projeto único com pasta principal), fim das chaves experimentais, "Retomar projeto" (estrutura legível, chats antigos coletados em cópia e só leitura, pop-up, aviso ao fechar).
- **011, 022 e 027:** sincronizações com a dev1 (0.6.1, 0.6.4 e 0.7.0) e conferência do módulo em cada uma.
- **013:** a trava passa a recusar a troca para a branch principal.
- **014 e 018:** política de autonomia por projeto (modelos Supervisionado, Autônomo até a branch e Autônomo com deploy, teto de uso, "Pausar deploy") e ajustes; proposta do Delegar.
- **015:** recuperação de erro (diagnóstico, ação do orquestrador numa lista fechada, até 3 voltas, pendências).
- **016 e 021:** deploy pelo Termix (portão, avanço direto ou junção, tag, receita, voltar versão por revert, autorização), fim de ciclo dos devs auxiliares, portão obrigatório no deploy automático e junção da main na dev1 depois de voltar versão.
- **017:** Vibe de tarefa (modo rápido para projeto em andamento, com histórico de tarefas).
- **023:** Mutirão nativo (a página "Novo mutirão" passa a criar o Mutirão do módulo; modos de projeto novo, do estado atual e "delegar algumas tarefas").
- **025:** Delegar tarefa (pedido, recebimento, entrega, análise só do handoff, aprovar e reprovar) e rodapé do mapa do Organizador.
- **027:** sincronização com a dev1 0.7.0, verificação do `--embed`, testes do módulo levados para `tools/vibe-testes/`; o Delegar foi **estacionado** (constante única, código mantido, vigia e contas mock fora da interface); pendências movidas para o TASKS_DEV2.

### Como validar (resumo)

Ver as seções 2.3 e 3. Todos os testes são sem custo de IA, com repositórios, remotos e agentes de teste, numa instância isolada do Termix. Nunca testar num projeto real.

## Decisão do DEV1 / usuário

**APROVADA em 2026-11-12** e integrada na dev1 (TASK-135, merge de `origin/dev2` em `83b0f14`). Decisões do Rodrigo:

1. **Integração:** feita por merge, pelo fluxo. Ainda não promovida para a `main`.
2. **Lugar dos botões:** por enquanto no **rail inferior** (grupo da direita, antes dos ajustes), que existe também no `--embed`. O DEV1 já fez a mudança no módulo (`src/renderer/vibe/vibe.js`, `vibe.css`, `delegar.js`, `delegar.css`) e nos testes. O lugar definitivo será avaliado depois (TASK-137).
3. **Login do Hub com PIN e conexões:** pós-MVP, pelo Hub. O "Delegar tarefa" segue estacionado.
4. **As 3 sugestões da DEV2-026:** aprovadas como escopo pós-MVP, para avaliação posterior (TASK-136). Nada muda no núcleo agora.
5. **Nome "Mutirão":** mantido nos dois lugares.

Para a dev2: rodar `/fluxo:sincronizar` antes da próxima tarefa (a dev1 mudou arquivos do módulo e dos testes). O `del25` foi corrigido (identidade git no repositório "semfluxo"). Em máquina com espaço no caminho da pasta temporária, os testes com o agente falso precisam de `TEMP` sem espaço (anotado no README dos testes).
