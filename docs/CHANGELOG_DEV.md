# CHANGELOG_DEV — Termix

Histórico legível do que foi desenvolvido, alterado ou corrigido. Uma entrada por tarefa, mais recente no topo, com data e papel.

> **BASELINE — 2026-10-29.** O código existente antes da adoção do fluxo é considerado baseline. O changelog detalhado começa nesta data.

---

## 2026-11-03

**Versão 0.3.5** (DEV1)

- A pedido do usuário, publica as TASK-090 (pasta dos projetos), 091 (anéis 5H/7D e barra recolhida), 092 (dica do sino) e 093 (janela em tela pequena), validadas por CDP por delegação do usuário, e o guia de instalação com o Smart App Control. O MVP só será declarado depois de validar a instalação em outra máquina pelo guia do GitHub.

**Smart App Control: guia de desligamento** (DEV1)

- Decisão do usuário (sem gasto mensal): quem tem o Smart App Control Ativado o desliga. `docs/INSTALACAO.md` ganhou a seção com o que muda, o que continua protegendo e as precauções; `docs/DECISOES.md` registra a decisão.

**TASK-093 — Janela não passa da tela pequena** (DEV1)

- O tamanho inicial e o mínimo da janela agora respeitam a área útil da tela (antes 1280×760 saía pela borda em telas de ~1200×650). Percurso visual das telas principais, sem erros; achados menores no `TASKS.md`. Arquivo: `main.js`. Falta validar.

**TASK-092 — Dica de notificação dentro do cabeçalho** (DEV1)

- A caixa que aparece ao lado do sino tinha 59 px e passava da borda do app; agora é uma pílula de uma linha (34 px), alinhada ao sino e dentro do cabeçalho, com a mensagem inteira na dica nativa. Arquivos: `renderer/styles.css`, `renderer/app.js`; `docs/DESIGN.md`. Falta validar.

**TASK-091 — Anéis 5H/7D certos no chat e sub-abas só do projeto em foco** (DEV1)

- Causa dos anéis diferentes do `/usage`: o chat gravava o horário da leitura em segundos e o terminal em milissegundos, então depois de uma leitura do terminal o chat nunca mais atualizava o 5H/7D (e o Clear no chat tinha o mesmo problema). Agora os dois usam milissegundos. Na barra recolhida, só o projeto em foco mostra as sub-abas. Arquivos: `renderer/chat.js`, `renderer/app.js`; docs. Falta validar no app.

**TASK-090 — Projetos novos no disco com mais espaço** (DEV1)

- Os projetos criados pelo app iam sempre para o C: (`Documentos\Termix`), que encheu. Agora vão para `X:\Termix`, no disco com mais espaço livre, e dá para escolher a pasta em Configurações (Alterar / Automática). Arquivos: `main.js`, `preload.js`, `renderer/app.js`; docs. Falta validar no app.

**Guia de instalação para o time** (DEV1)

- Novo `docs/INSTALACAO.md` (passo a passo curto: o que conferir antes, como saber se o Smart App Control pode bloquear, instalar, avisos do Windows, primeiro uso, atualizar, desinstalar e a quem pedir ajuda) e link no README. Parte do item A da TASK-083; o roteiro ainda será testado no Sandbox e em um PC real.

**Decisões de distribuição** (DEV1)

- Por pedido do usuário: o repositório fica **público para sempre** e o app **não terá assinatura de código** (uso interno). TASK-082 cancelada; TASK-083 atualizada (item A passa a ser testado no Windows Sandbox).

**Promoção dev1 → main** (DEV1)

- Promovidas a pedido do usuário ("suba a nova versão pro git"): TASK-084 (tela Consumo), TASK-080 (barra lateral), TASK-086 (nome de projeto e modais), TASK-088 (modais fecham só por X ou Esc) e a versão 0.3.4 (TASK-089). Fast-forward; validação `npm run check` ok.
**Versão 0.3.4** (DEV1)

- Release **v0.3.4** publicado no GitHub (instalador, blockmap e latest.yml; sha512 conferido) depois da promoção dev1 → main (`d7bc79b`). Aguardando o usuário atualizar 0.3.3 → 0.3.4.
- Publica a tela Consumo (TASK-084), os ajustes da barra lateral (TASK-080), o limite de nome de projeto e modais que não estouram (TASK-086) e o fechamento de modais só por X ou Esc (TASK-088).

**TASK-088 — Modais: fechar só pelo X ou Esc** (DEV1)

- Todo modal ganhou o botão X; clicar fora não fecha mais (perdia o que foi digitado); Esc continua fechando. Um balanço discreto lembra que o modal espera X ou Esc.
- Arquivos: `renderer/app.js` (`modal`), `renderer/styles.css`; docs.
**TASK-086 — Nome de projeto gigante estoura o modal "Gerenciar projeto"** (DEV1)

- Causa: a caixa dos modais não quebrava texto sem espaços e o nome do projeto não tinha limite (a pasta criada usa o nome e passava do limite do Windows). Agora o nome tem no máximo 60 caracteres (campo de criar e renomear, e ao importar pasta), a pasta criada também, e todos os modais quebram texto longo e nunca rolam na horizontal. O título do "Gerenciar projeto" mostra até 3 linhas com reticências.
- Arquivos: `main.js` (`slug`), `renderer/app.js`, `renderer/styles.css`; docs. Registrada a TASK-087 (refatoração visual dos modais, pós-MVP).
**TASK-080 — Barra lateral: rolar só os projetos e mesmo efeito aberta/recolhida** (DEV1)

- A barra virou três faixas: cabeçalho parado, lista de projetos com rolagem própria e rodapé "Geral" parado. Com muitos projetos, só a lista rola (antes a barra inteira rolava e empurrava o cabeçalho e o rodapé).
- Barra aberta e recolhida usam o mesmo estado (`open` por projeto) e o mesmo clique: no projeto atual mostra/esconde as subtelas (mesma animação); em outro projeto vai até ele e abre. Na recolhida as subtelas ficam numa bandeja de vidro sob o avatar. Corrigido: clicar num projeto fechado que não era o atual o fechava ao navegar.
- Testado em instância isolada com 17 projetos (CDP). Categoria Workflow registrada como ideia pós-MVP (TASK-085), sem código.
- Arquivos: `renderer/app.js`, `renderer/styles.css`; docs `DESIGN.md`, `DECISOES.md`, `TASKS.md`.
- Ajustes após a primeira versão: avatar colorido de cada projeto também na barra aberta (letra, degradê e ponto de estado); "Novo projeto" discreto e **fixo** (fora da rolagem, nos dois modos); lista esmaece nas bordas; botão "⋯" do projeto numa cor única clara, com o nome esmaecendo sob ele.
**TASK-084 — Tela Consumo totalmente funcional** (DEV1)

- Tokens e custo equivalente reais por sessão, por projeto e no total geral, lidos das conversas do Claude Code (`~/.claude/projects`), com leitura incremental em segundo plano e cache (1ª leitura ~2 s para 1,6 GB; as seguintes ~14 ms). Nada mais aparece como "indisponível" por falta de implementação.
- Tela no estilo do `/stats` do Claude Code: mapa de calor de 53 semanas, Visão geral / Modelos, filtro Todo o período / 7 / 30 dias, estatísticas (modelo favorito, sessões, dias ativos, sequências, maior sessão) e quebra entrada / saída / cache. Atualiza sozinha a cada 15 s; os cartões de limite 5 h / 7 d, a cada métrica.
- Custo equivalente pela tabela de preços da API (não é a cobrança da assinatura); modelo sem preço aparece como "sem preço". Conferido contra um cálculo independente (7 dias: 727.002.193 tokens e US$ 230,04 nos dois). Decidido com o usuário: sem alertas, sem histórico gravado e sem exportação por ora.
- Arquivos: `src/consumo.js` (novo), `main.js`, `preload.js`, `renderer/app.js`, `renderer/styles.css`, `package.json`; docs `DECISOES.md`, `DESIGN.md`, `TASKS.md`.
**Versão 0.3.3** (DEV1)

- Só a versão (sem mudança de código), a pedido do usuário, para continuar o teste da atualização com o Termix.exe fixo e do reinício instantâneo.

**TASK-081 — Windows bloqueou o Termix.exe da 0.3.1 (versão 0.3.2)** (DEV1)

- O Smart App Control bloqueou o executável novo (sem assinatura). Reparado na máquina do usuário com o exe anterior; a 0.3.2 fixa o Termix.exe entre versões e o atualizador deixa de trocá-lo quando o motor Electron não muda. Assinatura de código no Backlog (TASK-082).

**TASK-079 — Reinício instantâneo (versão 0.3.1)** (DEV1)

- O reinício levava ~19 s porque o Windows demora ~8 s para liberar a primeira execução de um .exe recém-gravado. Agora o app prepara a versão nova dentro da pasta instalada, "aquece" o Termix.exe em segundo plano e a troca é por renomeação (~0,5 s): o app volta em ~0,6 s. Vale a partir da atualização 0.3.1 → 0.3.2. Backlog: TASK-080 (barra lateral: rolar só os projetos).

**TASK-072 — Auditoria de performance e UX (versão 0.3.0)** (DEV1)

- Duas revisões completas do código e medições em instância isolada (abertura 1,4 s; 8 abas reais ~573 MB e ~8 % de CPU). Corrigidos: erros não capturados no processo principal, gravação atômica das métricas e hooks, limpeza de arquivos antigos, cabeçalho que era refeito a cada métrica, Markdown do chat refeito a cada quadro, cache da varredura de plugins/skills/MCPs, modal com foco e Escape, dica das abas, contraste. A "espera de 16 minutos" era a janelinha do caminho antigo presa (a troca levou 5 s): agora fecha pela marca que o app grava ao abrir. O restante virou Backlog (TASK-073 a 078).

## 2026-11-02

**TASK-071 — Sem a janelinha na troca rápida (versão 0.2.9)** (DEV1)

- Ao reiniciar pelo fluxo novo (TASK-069) a janelinha "Atualizando…" não é mais lançada; fica o aviso dentro do app. Vale a partir da atualização 0.2.9 → 0.2.10.

**TASK-070 — Versão do app no cabeçalho (versão 0.2.8)** (DEV1)

- Pílula "vX.Y.Z" ao lado do nome Termix. A 0.2.8 é a versão para o primeiro teste real da atualização sem sair do app (0.2.7 → 0.2.8).

**TASK-069 — Atualização sem sair do app (versão 0.2.7)** (DEV1)

- O Termix baixa e prepara a versão nova em segundo plano, com uma barrinha no cabeçalho (Baixando → Preparando → pronto) e o botão Reiniciar agora; a troca dos arquivos leva segundos. Se a preparação falhar, volta ao instalador de antes. O fluxo real só aparece na atualização 0.2.7 → 0.2.8.

**TASK-066 e TASK-067 validadas; versão 0.2.6** (DEV1)

- Aprovadas pelo usuário: janelinha da atualização fora da árvore do Termix, trava contra reabrir durante a instalação, ícones com o mesmo peso e dica de nome da barra recolhida inteira. Release v0.2.6 publicado (TASK-068); promoção dev1 → main feita.

**TASK-067 — Dica de nome da barra lateral recolhida** (DEV1)

- A dica aparecia cortada (uma lasca escura ao lado do ícone) e dava a impressão de ícones desalinhados; agora é uma pílula inteira, no estilo do app, centrada na linha do ícone. Testado com o mouse nos 10 ícones.

**TASK-066 — Janelinha da atualização sobrevive ao instalador, trava contra reabrir no meio da instalação e ícones da barra lateral** (DEV1)

- O instalador matava a janelinha "Atualizando…" (ela era filha do Termix e o instalador encerra o Termix com `taskkill /T`); agora ela é lançada fora da árvore do Termix. Também: texto da janelinha avisa para não abrir o app de novo, e o app não abre por cima de uma instalação em andamento sem avisar. Ícones da barra lateral (velocímetro, link e engrenagem) com o mesmo peso visual. Detalhes e a investigação da atualização que "não abriu" na TASK-066.

**Promoção dev1 → main (versão 0.2.5)** (DEV1)

- Promovidas as correções: botão de copiar fixo no canto da caixa (TASK-057), aviso "atualizado" com o tempo e as etapas (TASK-061), sem o círculo de contexto no chat (TASK-063) e Clear e avisos iguais nos dois modos (TASK-064). A TASK-065 (publicação) e a TASK-061 (validação das etapas ao vivo) seguem em andamento.

**TASK-064 — Clear e avisos iguais no chat e no terminal** (DEV1)

- O botão Clear do chat agora pulsa com o contexto alto, como o do terminal, e tem as duas opções ("Só limpar" e "Fechar a tarefa e limpar", com retomada automática); negações de permissão geram "Precisa de você". Auditoria completa na TASK-064. Testado com o Claude Code real.

**Correção: o aviso "atualizado" não trazia o tempo com o app fechado** (DEV1)

- O app novo lia o registro da janelinha antes de ela gravá-lo (corrida de tempo); agora espera por ele até 4 s. Medido no teste real 0.2.3 → 0.2.4: 1 min 01 s no total. Junto, o botão de copiar ficou fixo no canto da caixa (rola com ela). Vão na próxima versão (0.2.5).

**TASK-062 — Contexto "explodindo" no chat: investigado** (DEV1)

- Medido nos projetos reais: a primeira mensagem custa ~35 mil tokens (3,5% de 1 M), igual ao terminal; o "explodir" era o percentual inflado ~5× por uma janela chutada em 200 mil, já corrigido na 0.2.3. Sem alteração de código.

**Versão 0.2.4 — medição das etapas da atualização** (DEV1)

- A janelinha da atualização agora também mede as etapas (app fechado até o instalador começar, instalando, até a janela voltar) e o aviso "atualizado" mostra o resumo, para descobrir de onde vêm os ~3 minutos de espera. TASK-055 e TASK-060 concluídas (o usuário atualizou 0.2.1 → 0.2.2 → 0.2.3). TASK-061 em andamento.

**Promoção dev1 → main (versão 0.2.3)** (DEV1)

- Promovidas as TASK-056 (janelinha "Atualizando…" com o app fechado), 057 (copiar dentro da caixa), 058 (rail igual no chat e no terminal) e 059 (investigação do contexto). A TASK-060 (publicação) e a TASK-055 (validação da 0.2.2) seguem em andamento.

**TASK-057, TASK-058 e TASK-059 — Copiar dentro da caixa, rail igual nos dois modos e investigação do contexto** (DEV1)

- O botão de copiar ficou fixo no canto de cima, dentro da caixa da resposta. O rail do chat passou a ter contexto (com a janela real de 1 M, antes chutada em 200 mil e ~5× inflada), 5 h e 7 d (pelo `rate_limit_event`, guardados ao reabrir) e cache (contagem regressiva) como o do terminal. Investigado: o modo chat não carrega mais contexto que o terminal (base ~28 mil tokens, ~26 mil do núcleo do Claude Code).

**TASK-056 — Janelinha "Atualizando…" enquanto o app está fechado** (DEV1)

- Um auxiliar separado (PowerShell) mostra uma janelinha com o tempo decorrido do instante em que o Termix fecha até ele abrir de novo, e some sozinho; o aviso "atualizado" passou a informar também quanto tempo o app ficou fechado. Testado por simulação; o teste real exige duas versões seguidas com o auxiliar (0.2.3 → 0.2.4).

**Promoção dev1 → main (versão 0.2.2)** (DEV1)

- Promovidas as TASK-053 (menu do projeto com o botão direito) e TASK-054 (botão de copiar a resposta), mais os registros de encerramento das TASK-037, 038, 039, 049 e 050. Versão do app: 0.2.2. A TASK-055 (publicação e validação da atualização ao vivo) está em andamento.

**TASK-054 — Botão de copiar a resposta inteira** (DEV1, validada em DEV1 — aprovada pelo usuário)

- Toda resposta do chat ganhou um botão "Copiar" (ao passar o mouse) que copia o texto original em Markdown; o botão dos blocos de código continua no cabeçalho do bloco. Testado por clique real, lendo a área de transferência.

**TASK-053 — Menu do projeto com o botão direito** (DEV1, validada em DEV1 — aprovada pelo usuário)

- Com a barra lateral recolhida (só os avatares) agora dá para clicar com o botão direito no projeto e abrir o menu de renomear, arquivar, remover e excluir; o mesmo vale para o nome do projeto na barra aberta. Testado por cliques reais em instância isolada.

**TASK-037, TASK-038 e TASK-039 encerradas** (DEV1)

- Marcadas como finalizadas a pedido do usuário. Registro: não há implementação delas no código da `dev1`/`main`; foram encerradas por decisão, não por entrega.

**TASK-049 e TASK-050 concluídas** (DEV1)

- Marcadas como prontas pelo usuário depois da publicação das versões 0.2.0 e 0.2.1 (já na `main`). Cartão "Atualizando…" e notificação do Windows ainda não foram vistos numa atualização real (só aparecem a partir da 0.2.1).

**Promoção dev1 → main (versão 0.2.1)** (DEV1)

- Promovidas as TASK-051 e 052 (validadas) e as demais já listadas. A TASK-050 (retorno durante a atualização) foi junto a pedido do usuário, para ser testada na atualização real; segue **aguardando validação** (na dev1). A TASK-049 continua em andamento.

**TASK-050 — Retorno durante a atualização do app (versão 0.2.1)** (DEV1)

- Ao clicar em Atualizar agora aparece um cartão "Atualizando o Termix…" e uma notificação do Windows; ao reabrir na versão nova, o aviso "Termix atualizado para a X · levou N min" mede o tempo do clique até o app voltar. Versão do app: 0.2.1. Testado por CDP com simulação; o fluxo real exige duas atualizações seguidas.

**TASK-052 — Bolhas do chat alinhadas** (DEV1, validada em DEV1 — aprovada pelo usuário)

- Pergunta, resposta e cartões de ferramenta passaram a usar a mesma coluna (mesmas bordas esquerda e direita), com os avatares nas calhas laterais. Medido por CDP em instância isolada.

**TASK-051 — O chat mostra o que o Claude está fazendo** (DEV1, validada em DEV1 — aprovada pelo usuário)

- Enquanto o agente trabalha, o chat mostra o símbolo animado, um verbo que muda, o tempo e uma linha com a ação do momento (executando um comando, lendo um arquivo, analisando o resultado), como o "Manifesting…" do terminal. Testado com o Claude Code real.

**Promoção dev1 → main** (DEV1)

- Promovidas (fast-forward, 103 commits): TASK-002 a 005, 010 a 025, 027 a 036 e 040 a 048 (todas validadas em DEV1). Na mesma passada, o `TASKS.md` foi corrigido: um erro de edição tinha apagado do registro os fechamentos das TASK-036, 042, 043, 046 e 047; foram recompostos a partir do histórico do git. A TASK-049 (publicar a 0.2.0) segue em andamento até o usuário validar a atualização no app instalado.

**TASK-049 — Versão 0.2.0** (DEV1)

- Versão do app subiu de 0.1.1 para 0.2.0 (modo Chat com símbolos animados, rodapé com a troca Chat/Terminal, telas contínuas com o app, sino e botões da janela redesenhados, README). Publicação do Release e validação da atualização do app instalado em andamento.

**TASK-036 — README do projeto** (DEV1)

- Novo `README.md` em português (o que é, recursos, instalação com o aviso do SmartScreen, atualização, primeiros passos, limites conhecidos, como relatar problema e como rodar o código) e a captura `docs/img/chat.png`, feita numa instância zerada com um projeto de demonstração, sem dados pessoais. Sem seção de licença (o app não será comercializado). O instalador foi testado pelo usuário e funciona. Aprovada; a promoção para a `main` aguarda o pedido do usuário.

**TASK-042 — Telas que não são terminal viram parte do app** (DEV1)

- Plugins, Skills, MCPs, Consumo, Integrações, Configurações e a tela sem projeto perderam o recorte escuro do palco, a borda, o painel e a margem: ficam direto sobre o vidro do app, contínuas com a barra lateral, e rolam até a base da janela. Terminal, chat e Web mantêm o recorte, o rodapé e o rail. Testado por CDP em instância isolada; aprovada pelo usuário. Não testados: Ofuscado, maximizada e larguras 1180/980.

**TASK-043 — Avatar do chat: símbolo azul do app, animado quando trabalha** (DEV1)

- O avatar da resposta virou só o símbolo, sem fundo, no azul do app com brilho suave (`>_` parado; silhueta na pergunta). Enquanto o Claude pensa e responde, o símbolo anima, em rodízio entre 5 (brilho em raios, órbita de pontos, ondas, barras e prompt com cursor piscando); ao terminar a resposta guarda o símbolo que rodou, parado. Saiu o ícone Chat/Terminal das abas e o visual Fluxo já tinha saído. Testado com o Claude Code real. Aprovada pelo usuário.

**TASK-046 — Barra superior: sino centralizado e botões da janela** (DEV1)

- O sino ficava ~1 px fora do centro do círculo (padding global dos botões); corrigido. Minimizar, maximizar e fechar viraram pílulas com realce discreto; o fechar usa vermelho translúcido em vez do bloco vermelho de ponta a ponta; o sino ficou só o ícone, com o círculo no hover. Aprovada pelo usuário.

**TASK-048 — Menu da aba só na aba** (DEV1)

- Corrigido: o clique direito em qualquer parte do chat abria o menu da aba. O container do chat usava o mesmo atributo das abas; agora só a barra de abas abre o menu e o duplo clique que renomeia. Testado por cliques reais em instância isolada.

**TASK-047 — Troca Chat/Terminal no rodapé; Fluxo retirado** (DEV1)

- O rodapé ganhou um botão com ícone que abre a aba como Terminal ou como Chat (mesma conversa), valendo só para o uso atual; Configurações > Chat é só o que o app usa ao abrir. O visual do chat ficou só Bolhas (Fluxo retirado) e a permissão fica só em Configurações. O "Aguardando você" da barra de abas foi mantido. Visto pelo usuário numa instância limpa e aprovado.

Validadas em DEV1 (aprovadas pelo usuário): TASK-041 (imagens coladas no chat), TASK-044 (trocar o modo da aba) e TASK-045 (menu "/" no chat).

**TASK-041 — Imagens coladas no chat** (DEV1)

- Colar ou arrastar imagem mostra a miniatura na caixa (com "x"); vai junto da mensagem para o Claude; aparece na bolha e no histórico reaberto. Até 5 imagens, reduzidas antes de enviar.
- Testado com o Claude Code real: ele leu a palavra escrita na imagem.

**TASK-045 — Menu de comandos "/" no chat** (DEV1)

- Digitar "/" no início do campo abre a lista de skills e comandos (usuário, projeto e plugins) com descrição e origem; filtra ao digitar; setas, Enter/Tab e Esc; `/clear` abre a conversa nova.
- Testado com o Claude Code real: comando de projeto listado, escolhido e executado.

**TASK-044 — Trocar o modo de uma aba aberta (chat ↔ terminal)** (DEV1)

- Menu da aba ganhou "Abrir como terminal" / "Abrir como chat": mesma conversa (`--resume`), mesmo nome e cor; confirma se o agente está trabalhando. Configurações > Chat explica que o modo vale só para abas novas.
- Testado com o Claude Code real nos dois sentidos.

**TASK-040 — Modo Chat por aba e rodapé do app** (DEV1)

- Nova aba de chat: conversa em bolhas (ou fluxo) com Markdown, ferramentas em cartões, código com Copiar, parar a resposta e histórico ao reabrir, falando com o Claude Code por `claude -p` em stream-json (sem API externa; mesma sessão do Claude Code, retomada pelo ID). Terminais e chats convivem na mesma barra; Configurações > Chat define o modo das abas novas (o "+"), o visual e as permissões (Automático ou Perguntar).
- As funções Terminais · Web | Clear · Reiniciar saíram da janelinha flutuante e foram para um rodapé dentro da base de vidro do app (vale para terminais, Web e chat).
- Testado com o Claude Code real em instância isolada, inclusive o terminal de sempre. Limitações e candidatas na TASK-040 do TASKS.md.
- Ajustes depois da revisão do usuário: avatar do Claude com a marca do Termix, rail sem fundo (só os anéis) com cada anel configurável, engrenagem do rail no rodapé (e Configurações > Rail e rodapé), rodapé do chat alinhado à coluna da caixa de prompt. Aprovada em 2026-11-02. Novas tarefas no Backlog: 041 a 046.

**TASK-033 — Arrastar e soltar das abas** (DEV1)

- Corrigido: o recorte escuro da barra acompanha a aba ativa durante o arraste; redesenhos no meio do arraste não soltam mais a aba; aba arrastada opaca; última posição alcançável com abas de larguras diferentes. Com muitas abas a barra estourava (20 abas, 2041 px em 1000): inativas agora encolhem até mostrar só o ponto e a ativa fica com 120 px no mínimo. Testado por cliques reais (CDP) com 8 e 20 abas e janela 980×620. Abas da Web não têm arrastar (TASK-038) e acima de ~25 abas a barra estoura (TASK-039), ambas no Backlog. Aprovada pelo usuário em 2026-11-02.

**TASK-020 — Teste do instalador em Windows limpo (Sandbox) e da atualização real** (DEV1)

- Testado no Windows Sandbox (sem Node e sem Claude Code), com roteiros automáticos e capturas de tela: instalação silenciosa e pelo assistente com janelas (em português, com o ícone novo), pasta, `Termix.exe`, atalhos (área de trabalho e menu Iniciar), registro de desinstalação, abertura do app, aviso "Claude Code não foi encontrado" com "Tentar de novo", desinstalação que remove programa e atalhos e mantém os dados.
- Atualização real: publicado o Release **v0.1.1** no GitHub (público, `npm run release`; versão do `package.json` subiu para 0.1.1). Com a 0.1.0 instalada, o aviso "Nova versão 0.1.1 pronta" apareceu sozinho, "Depois" deixou o botão Atualizar no cabeçalho, "Atualizar" instalou a 0.1.1 e o app reabriu sozinho (~25 s).
- Limitações: Windows 10 e Claude Code instalado dentro do Sandbox não testados; app sem assinatura de código (o SmartScreen pode avisar).

**TASK-035 — Atualização do app com aviso e botão no cabeçalho** (DEV1)

- Novo `src/updater.js` com `electron-updater` e GitHub Releases: aviso com Depois / Atualizar agora e botão Atualizar no cabeçalho; instala ao fechar se ignorado; confirmação com agente trabalhando. Testado só em simulação (`TERMIX_FAKE_UPDATE=1`); falta teste real com duas versões publicadas.

**TASK-034 — Novo ícone do app: só o `>_` sobre degradê azul** (DEV1)

- Ícone redesenhado para a barra de tarefas, notificações do Windows e atalhos: quadrado em degradê azul (estilo Windows 11) com o prompt `>_` branco; sem abas coloridas nem janela desenhada. Versão de 16 e 32 px sem brilhos. Gerado com `tools/make-icon.js`; conferido o ícone embutido no `Termix.exe` empacotado.
- No `npm start` o Windows mostrava "Electron" (nome e átomo) porque o processo é o `electron.exe`. Em desenvolvimento o app agora cria o atalho `Termix (dev)` no menu Iniciar com ID próprio e o ícone novo; o instalado usa o atalho do instalador. Efeito visual a confirmar pelo usuário depois de reiniciar o app.

## 2026-11-01

**TASK-033 registrada (crítica) e TASK-030 — 4º ajuste: cor em degradê na aba inteira** (DEV1)

- Nova tarefa crítica: arrastar e soltar das abas não funciona direito (reproduzir e corrigir). Na TASK-030 saiu a linha colorida do topo; a cor da aba vale para a aba inteira, em degradê, e o estado "trabalhando" pulsa no ponto da aba ativa. `npm run check` passou.

## 2026-10-31

**TASK-030 — 3º ajuste: a primeira aba segue a curva do canto** (DEV1)

- A barra de abas encosta na lateral esquerda do container; a primeira aba e a linha de cor do topo seguem o canto arredondado. Pedido do usuário com captura. `npm run check` passou.

**TASK-030 — 2º ajuste: abas rentes ao container dos terminais** (DEV1)

- Removida a margem de fundo acima das abas (a barra agora toca o topo do container) e reduzida a da esquerda; faixa escura mais discreta. Valido para terminais e Web; pedido do usuário com captura. `npm run check` passou.

**TASK-030 — ajuste final das abas: fundidas ao terminal, com separação nítida** (DEV1)

- A barra de abas ficou mais escura que o terminal e a aba ativa, sem o fundo da barra atrás, só com a cor do terminal: o formato dela aparece e ela se funde ao terminal, como no Terminal do Windows; separador entre abas mais nítido; orelha esquerda corrigida nas abas que não são a primeira; vale também para a Web. Testado por CDP em instância isolada. Pedido do usuário, com capturas. `npm run check` passou.

**TASK-032 e TASK-013 — fechadas: VALIDADAS EM DEV1** (DEV1)

- Aprovadas pelo usuário em 2026-10-31. Segue em aberto o login de MCP/conector com conta real. Próxima: TASK-020 (instalador em Windows limpo).

**TASK-032 — teste geral de plugins, MCPs e skills feito** (DEV1)

- Teste completo numa pasta de usuário isolada, com a CLI real do Claude Code e o app Electron (cliques reais, 3 larguras, terminal vivo): plugins 33/33, skills 32/32, interface 68/68, mais MCPs, projeto limpo, erros (CLI ausente, sem rede, `.claude.json` ilegível, nomes inválidos) e desempenho com 752 skills. Arquivos do usuário conferidos intactos. **Dois defeitos achados e corrigidos:** (1) o login de MCP/conector nunca funcionaria (a CLI exige terminal; agora roda num PTY); (2) o cartão de MCP mostrava "Desligado" velho logo depois de ligar (agora os arquivos mandam). Relatório completo e limitações na TASK-032. Aguarda a aprovação do usuário para fechar esta e a TASK-013. `npm run check` passou.

**TASK-030 — fechada: VALIDADA EM DEV1** (DEV1)

- Aprovada pelo usuário em 2026-10-31. Próxima: TASK-032.

**TASK-030 — abas encaixadas na janela do terminal** (DEV1)

- Desenho aprovado em protótipo (`docs/prototipos/abas-encaixadas.html`) e aplicado: aba ativa fundida ao terminal (mesma cor, sem linha, orelhas curvas), linha de 2 px da cor da aba no topo (pulsa quando o agente trabalha), inativas discretas com separador fino; aba nova começa no azul do sistema. Testado por CDP em instância isolada; aguarda o teste do usuário.

**TASK-029 — fechada: VALIDADA EM DEV1** (DEV1)

- Aprovada pelo usuário em 2026-10-31 sem teste manual (confiou no teste do Claude em instância isolada). Segue em aberto o teste real do som, da notificação do Windows e do texto da dica com uma sessão real do Claude Code. `npm run check` passou. Próxima: TASK-030 (abas encaixadas), iniciada.

**TASK-029 — notificações bem encaixadas, com o cache como função principal** (DEV1)

- Selo do sino zera ao abrir e fechar o painel; terminal trabalhando não notifica; nova dica animada ao lado esquerdo do sino com o que aconteceu (última frase do agente, via hook Stop); novo aviso de cache esfriando (1 h: N min antes, padrão 10; 5 min: 1 min antes; um por resposta; some ao mandar mensagem); painel agrupado por aba com tipo, texto inteiro, excluir um/aba/tudo; Configurações > Notificações (tipos, minutos do cache, dica e tempo, som, notificação do Windows). Testado por CDP em instância isolada; aguarda o teste do usuário.

**TASK-031 — auditoria de UI/UX e desempenho feita** (DEV1)

- Roteiro automático abriu 20 telas e janelas em 3 larguras e varreu o DOM. Corrigido: duas regras de campo conflitantes (o campo minúsculo de "Novo projeto"), campo numérico, deslizante, seleções e caixas de marcar nativos, janela Adicionar MCP que estourava a altura em 980×620, alturas de controles diferentes, barra de ferramentas de Plugins/MCPs/Skills em três linhas, linhas das Configurações sem quebra em janela estreita, selo do sino cobrindo o ícone, falta de foco por teclado. Padrão único dos controles registrado em `docs/DESIGN.md`. Desempenho medido antes e depois (3 rodadas alternadas): sem regressão e sem desperdício relevante (abertura ~1,9 s, app parado ~2 % de um núcleo). Testado pelo Claude; validada em DEV1.

**TASK-031 e TASK-032 registradas; nova ordem** (DEV1)

- TASK-031 (PRONTA, Alta, próxima): auditoria de UI/UX e desempenho do app inteiro — campos fora de alinhamento, pequenos e com cara antiga (setinhas do campo numérico, campo estreito do Novo projeto), responsividade e medição de desempenho antes e depois. TASK-032 (BACKLOG, por último, antes do instalador): teste geral de plugins, MCPs e skills feito pelo Claude, que fecha a TASK-013. Ordem: 031, depois 029 e 030, depois 032, depois TASK-020 (instalador em Windows limpo) e a promoção. Sem código nesta etapa.

**TASK-013 iniciada — plugins, skills e MCPs pelo app (MVP)** (DEV1)

- **Etapa 1 (ver tudo) feita:** as telas Plugins, Skills e MCPs agora mostram o que o Claude Code enxerga no projeto, lido pela CLI (plugins com versão, escopo e custo em tokens; MCPs com o estado real, inclusive os 9 conectores da conta, que antes não apareciam) e pelos arquivos (skills e comandos de usuário, projeto e plugins). Busca, filtros por escopo e estado, "Atualizar" e atualização automática. Módulo novo `src/resources.js`. Só leitura; aguarda o teste do usuário antes da etapa 2.
- **Etapas 2 e 3 e Conectores feitas:** controle pela tela, sempre pela CLI do Claude Code: plugins (ligar/desligar aqui ou em todos, atualizar, remover, instalar com busca), MCPs (adicionar, remover, login, logout, ligar/desligar por projeto, em bloco) e skills/comandos de usuário e de projeto (criar, editar, excluir para a lixeira); aviso de reinício com botão. Única gravação direta: o campo `disabledMcpServers` do projeto no `.claude.json` (a CLI não tem esse comando), com escrita atômica e backup. Configurações > Conectores: projeto novo vem Automático (padrão) ou Limpo (plugins, MCPs e conectores desligados); medido em sessão real, o projeto limpo carrega 32 ferramentas contra 62. Dois defeitos achados nos testes e corrigidos (plugins desligados em paralelo se apagavam; cartão com estado antigo após a ação). 33 verificações ponta a ponta passaram; arquivos do usuário conferidos intactos. Aguarda a validação do usuário.
- Tarefa passou a EM ANDAMENTO, com análise e plano em 3 etapas (ver tudo; controlar plugins e MCPs; skills e conectores). Achado: a CLI do Claude Code (`claude mcp list`, `claude plugin list --json`) traz os conectores da conta e o estado real, que o app não mostrava. Toda mudança será feita pela CLI, sem gravar nos arquivos do Claude Code. Adendo: Configurações > "Conectores" para projetos novos virem com ou sem plugins, skills e MCPs automáticos (a viabilidade do "limpo" será testada antes). Sem código nesta etapa.

## 2026-10-30

**TASK-030 registrada — abas encaixadas no terminal (MVP)** (DEV1)

- Nova tarefa no Backlog (Alta, MVP): a aba ativa se funde com a janela do terminal, como no Terminal do Windows. Sem código nesta etapa.

**TASK-029 registrada — notificações no MVP** (DEV1)

- Nova tarefa no Backlog (Alta, MVP): refazer as notificações com o cache dos terminais como função principal (aviso aos 10 min), contador do sino que zera ao fechar a tela, tooltip animada ao lado do sino só para terminal que terminou, nada de terminal trabalhando e controle total (configurar e excluir). Sem código nesta etapa.

**TASK-028 etapa 2 — custo da retomada medido** (DEV1)

- Ao usar Clear com retomada, o app mede o contexto (em tokens) antes do `/clear`, a base da conversa nova e o fim da primeira resposta; mostra "A retomada custou ~X tokens" no painel de eventos e no tooltip do anel CTX.
- Botão de reiniciar o chat movido do cabeçalho para o alternador de baixo, ao lado do Clear, com ícone e texto "Reiniciar". O ⚠ de "dangerously" saiu da aba (a etiqueta "⚠ bypass" do rail já mostra).
- Estado: VALIDADA EM DEV1 (2026-10-30). Custo da retomada testado e aprovado; o botão de reiniciar no alternador foi aceito para fechar.
- Decisão de escopo: TASK-013 (plugins, skills e MCPs) entra no MVP e é o foco seguinte; TASK-010 é a última do MVP e a promoção para a `main` espera o instalador testado (TASK-010 + TASK-020).

**TASK-025 — botão Clear no alternador de baixo** (DEV1)

- Botão "Clear" ao lado de Terminais: limpa o contexto do terminal ativo. Confirmação com "Só limpar" ou "Fechar a tarefa e limpar" (registra a tarefa, manda `/clear` e pede para retomar pelos arquivos do projeto).
- Pulsa quando o CTX passa do limite configurado; limite e textos dos dois pedidos ficam em Configurações > Botão Clear (só no app).
- Registrada a TASK-026 (registro de consumo e alertas de ritmo), derivada do guia de economia de tokens.
- Ajustes pós-teste: alternador não some mais com o menu do rail; novo ícone; o /clear agora apaga também o texto antigo da tela; Ctrl+C/Ctrl+V funcionam nos terminais.
- Estado: VALIDADA EM DEV1 (2026-10-30, testada e aprovada pelo usuário).
- TASK-027 etapa 1 — retomada enxuta: nos projetos no fluxo Rocruzta o botão Clear usa pedidos de fechar e retomar que seguem o fluxo e leem só o necessário (papel/branch de CLAUDE.local.md, validação do fluxo.json, só as seções ativas do TASKS.md); opções "usar o fluxo" e "commit e push ao fechar" em Configurações; textos vazios = automático. Fluxo e plugin intactos. VALIDADA EM DEV1 (2026-10-30, testada e aprovada pelo usuário). Etapa 2 (medir o custo da retomada) e novos gatilhos viraram a TASK-028 (Backlog).

**TASK-025 registrada — ações rápidas no rail de baixo** (DEV1)

- A pedido do usuário: botões de ação ao lado de "Terminais" no alternador (primeiro exemplo: Clear no terminal ativo), dentro do MVP. Registrada com os pontos a decidir (o que "Clear" significa no Claude Code, quais ações entram). Nada implementado ainda.

**TASK-024 — Web só para testes locais, aberta a partir dos terminais** (DEV1, EM STANDBY: no teste real do usuário o Claude abriu no navegador normal e a Web mostrou só a listagem do servidor; vai para o backlog pós-MVP)

- Comando `termix-open` e `BROWSER` só nos terminais do Termix, instrução por sessão para o Claude Code usá-lo, detecção de servidores locais na saída (selo verde no botão Web e faixa de detectados) e Web restrita a endereços locais (externos abrem no navegador do sistema). A status line do `settings.json` do usuário não foi mexida. Detalhes em `docs/TASKS.md`.

**TASK-023 vai para o pós-MVP; TASK-024 registrada** (DEV1)

- A pedido do usuário: plataformas com login e grupos de atalhos ficam para depois (TASK-023, backlog). A Web fica só para testes de projetos locais, com abertura automática a partir dos terminais e aviso no ícone Web do rail (TASK-024, pronta, ainda não iniciada).

**TASK-023 registrada — atalhos e grupos de páginas no navegador do app** (DEV1)

- Etapa 1 (compatibilidade de login): user agent sem Electron/Termix e janelas de login como janela filha com o mesmo perfil, em `src/web.js`. **Login com Google é barrado** pelo Google no navegador embutido (visto pelo usuário e reproduzido em instância isolada, com e sem o ajuste dos client hints, que foi retirado). Plano: entrar nos serviços por GitHub ou e-mail; falta o teste do usuário em GitHub, Vercel e Supabase. Decisão: uso por grupo restrito; se o login falhar nos demais, a Web fica só para testes locais.
- A pedido do usuário: deixar à mão plataformas de uso constante (Vercel, GitHub, pesquisa etc.) em grupos globais e por projeto, com barra de atalhos e "salvar aba como atalho". Inclui um teste de compatibilidade de login antes de construir, porque serviços como o Google podem barrar navegadores embutidos (plano em `docs/TASKS.md`). Nada implementado ainda.

**TASK-022 — Alternador Terminais / Web com navegador embutido** (DEV1, VALIDADA EM DEV1: o usuário aprovou o rail e pediu para mantê-lo)

- Alternador em pílula (`Terminais` com selo de abas e atenção, `Web` com selo de abas) no centro da base, esmaecido quando parado; atalho Ctrl+`. Tela Web com abas de página, voltar/avançar/recarregar/parar, barra de endereço (localhost e porta viram `http://`, domínio vira `https://`, o resto vai para a busca), tamanho de dispositivo (Responsivo, Celular, Tablet) e DevTools. Web por projeto, com perfil persistente (`persist:termix-web`); a vista só é criada quando a aba é aberta. `target=_blank` abre nova aba web; só http/https; sem câmera, microfone, localização nem notificações.
- Como funciona: `src/web.js` (processo principal) cria uma `WebContentsView` por aba; o alternador é outra vista (`src/dock.html`, `dock.js`, `dock-preload.js`) logo acima, porque a vista nativa fica por cima do HTML; com menu, modal ou popover aberto a vista do navegador é trocada por uma imagem dela (`capturePage`). Interface em `src/renderer/web.js`.
- Testado numa instância isolada (CDP + captura só da janela do app): alternador por cima da página, página no retângulo certo, modal sobre a imagem, link em nova aba, tamanho Celular, restauração das abas ao reabrir sem criar vistas antes da hora.

**TASK-021 — Rail de informações do terminal** (DEV1)

- Cápsula vertical de anéis dentro do terminal, junto à borda direita, com contexto, 5h, 7d e cache do prompt (detalhe ao passar o mouse), menu de configuração próprio (mostrar, reservar espaço, esmaecer, etiqueta de modelo/branch/permissões; padrões: espaço desligado e esmaecer ligado) e dados vindos do encaminhador da status line (`prompt_cache`, pasta, últimos limites conhecidos) e do `git branch`. A cápsula 5h/7d do cabeçalho sai com o rail ligado. O plugin da status line foi retirado do terminal (e do `~/.claude/settings.json`, com backup). Atualização do rail sem recriar elementos, para o tooltip não piscar. Decisões em `docs/DECISOES.md`, visual em `docs/DESIGN.md`. VALIDADA EM DEV1: o usuário testou e aprovou.
- Registrada também a TASK-022 (alternador Terminais/Web com navegador embutido, só para visualizar), próxima da fila; demos em `docs/prototipos/`.


## 2026-10-29

**TASK-010 — Instalador e portabilidade** (DEV1)

- Instalador NSIS por usuário (`npm run dist`) com atalhos no menu Iniciar e na área de trabalho. O app funciona sem Node.js (os scripts de hooks/status line rodam pelo próprio Termix), acha o Claude Code em pastas conhecidas além do PATH, abre uma janela só e guarda backup do `state.json`. Testado instalando de verdade e abrindo o app instalado. VALIDADA EM DEV1 em 2026-10-30: o usuário aceitou o estado atual; o teste em Windows limpo ficou registrado como TASK-020 (backlog).

**TASK-005 — Controles da janela e menus das abas** (DEV1)

- Testados por cliques reais, sem defeitos e sem mudança de código: minimizar, maximizar/restaurar, arrastar o cabeçalho, fechar (com a confirmação de sessões ativas) e, no menu da aba, duplicar, exportar texto, fechar à direita e fechar outras. VALIDADA EM DEV1: o usuário aprovou.

**TASK-012 — ID da sessão após o /clear** (DEV1)

- Verificado nos históricos do Claude Code: `/clear` cria conversa nova com outro ID; compactação e resume mantêm o ID. O hook agora grava o `session_id` e o app atualiza o ID da aba quando ele muda, então o Retomar volta na conversa posterior ao `/clear`. VALIDADA EM DEV1: o usuário testou e aprovou.

**TASK-018 — Animação de abertura** (DEV1)

- Tela de abertura com a logo pulsando cobre o carregamento e some em fade quando os terminais terminam de reabrir (mínimo ~0,9 s, teto de 8 s; respeita "reduzir movimento"). Documentada em `docs/DECISOES.md` e `docs/DESIGN.md`. VALIDADA EM DEV1: o usuário testou e aprovou.

**TASK-004 — Notificações reais** (DEV1)

- Avisos de "terminou", "precisa de você" e erro vão para o painel (com botão "Abrir"), ganham selo colorido na aba e destaque no projeto, e com o app sem foco viram notificação do Windows (clique abre a aba) e piscam o ícone na barra de tarefas. VALIDADA EM DEV1: o usuário testou e aprovou.

**TASK-002 — Retomada de aba que nunca recebeu mensagem** (DEV1)

- VALIDADA EM DEV1: o usuário testou e aprovou (sem o erro "No conversation found" ao reabrir uma aba vazia).

**TASK-003 — Estado das abas pelos hooks do Claude Code** (DEV1)

- Trabalhando/aguardando agora vem dos hooks (SessionStart, UserPromptSubmit, PostToolUse, Notification, Stop), com a heurística de 2,5 s só como reserva. VALIDADA EM DEV1: o usuário testou e aprovou.

**TASK-019 — Restaurar sozinho os terminais abertos ao reabrir** (DEV1)

- Ao abrir, as abas que estavam abertas voltam sozinhas, uma de cada vez (a ativa primeiro), retomando a conversa. O aviso "N sessões estavam ativas" foi removido. Decisão atualizada em `docs/DECISOES.md`. VALIDADA EM DEV1: o usuário testou e aprovou.

**TASK-017 — Continuidade entre sessões** (DEV1)

- Comandos `/retomar` e `/encerrar-tarefa`, `docs/DECISOES.md` e `docs/DESIGN.md`; `CLAUDE.md` aponta para eles. VALIDADA EM DEV1: o usuário revisou as 18 decisões do `DECISOES.md` e aprovou. O primeiro teste real dos comandos é o `/retomar` após o primeiro `/clear`.

**Validação** (DEV1): o usuário aprovou o layout; TASK-014, TASK-015 e TASK-016 passam para VALIDADA EM DEV1 (promoção para a main só quando o usuário pedir). O backlog da TASK-003 à TASK-013 foi restaurado em docs/TASKS.md (a migração inicial não tinha sido gravada).

**TASK-016 — Tela "nenhum terminal aberto" com as abas fechadas** (DEV1)

- Mostra a conversa mais recente em destaque ("há X"), as outras abas fechadas do projeto e um resumo das abas vazias. Aguarda teste do usuário.

**TASK-015 — Botão de reiniciar discreto e barras de rolagem finas** (DEV1)

- Reiniciar/Retomar virou só um ícone; barras de rolagem finas e recuadas das bordas, inclusive a do terminal. Aguarda conferência do usuário.

**TASK-014 — Novo ícone do Termix** (DEV1)

- Marca simplificada no cabeçalho, ícone detalhado em tema escuro (borda azul luminosa, abas coloridas, `>_` com brilho) e versão de traço grosso para 16/32 px; `.ico` regenerado para a barra de tarefas.
- Em andamento, aguardando o usuário conferir na barra de tarefas.

**TASK-002 — Corrigir retomada de aba que nunca recebeu mensagem** (DEV1)

- O app confere se o histórico da conversa existe antes de usar `--resume`; sem histórico, abre a mesma conversa com `--session-id`. Aguarda teste do usuário.

**TASK-000 — Adotar o fluxo DEV2 → DEV1 → MAIN** (DEV1)

- Fluxo adotado via plugin `fluxo` v1: branches `main`/`dev1`/`dev2`, `WORKFLOW.md`, `docs/TASKS.md`, `docs/CHANGELOG_DEV.md` e `.claude/fluxo.json`.
