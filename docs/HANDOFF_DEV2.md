<!-- fluxo:v1 — escrito pelo DEV2, lido pelo DEV1. É a ÚNICA parte da dev2 que o DEV1 vê antes de o usuário aprovar a entrega. -->
# HANDOFF DEV2 → DEV1

Resumo da entrega atual da dev2. O DEV2 reescreve este arquivo a cada entrega (ou experimento) e o inclui no commit/push da dev2.

**Regras de escrita:** descreva *o quê* e *por quê*, em alto nível. **Não cole código, diffs nem trechos de arquivos.** O DEV1 só tem acesso a este resumo até o usuário aprovar; se a entrega for reprovada, ele não deve ficar com o conteúdo da dev2 no contexto.

- **Status:** EXPERIMENTO (não entregar)  <!-- AGUARDANDO DECISÃO | APROVADA | REPROVADA | EXPERIMENTO (não entregar) -->
- **Tarefas:** DEV2-001 a DEV2-016 e DEV2-018 (MVP do Vibe/Mutirão, a robustez do ciclo, o guia de validação, o fechamento das pendências, o importar projeto com várias pastas, a sincronização com a dev1 na versão 0.6.1, a prova do ciclo real no layout novo, a trava barrando a troca para a branch principal, a política de autonomia por projeto, na DEV2-018 ajustes da política e a proposta do botão "Delegar tarefa", na DEV2-015 a recuperação de erro do ciclo e, na DEV2-016, o deploy feito pelo Termix e o fim de ciclo dos devs auxiliares)
- **IDs de tarefa usados pela dev2:** DEV2-001, DEV2-002, DEV2-003, DEV2-004, DEV2-005, DEV2-006, DEV2-007, DEV2-008, DEV2-009, DEV2-010, DEV2-011, DEV2-012, DEV2-013, DEV2-014, DEV2-015, DEV2-016, DEV2-018 (a dev2 tem numeração própria DEV2-xxx e não usa TASK-xxx)
- **Data:** 2026-11-11

## Resumo do que mudou

Módulo separado "Vibe Coding e Mutirão", atrás de uma chave experimental em Configurações (desligada por padrão).

- **DEV2-001:** a casca do módulo, com dois botões no cabeçalho ("Vibe Coding" e "Mutirão").
- **DEV2-002:** a tela de entrega do projeto, um formulário engessado (objetivo, fluxo desenhado, um .md com a estrutura do projeto, critério de pronto, o que os agentes não podem fazer e os acessos), com um modelo .md para baixar.
- **DEV2-003:** com a entrega pronta, o Termix cria no projeto duas abas de Claude Code (um orquestrador e um dev), pede o plano e só as perguntas indispensáveis, mostra o andamento e guarda o estado sem recomeçar sozinho ao reabrir o app.
- **DEV2-004:** a execução autônoma do plano, com uma **trava em código**. No teste anterior o orquestrador planejou fazer commit na branch principal apesar da regra; como as abas do Vibe trabalham sem pedir aprovação, a regra passou a ser aplicada pelo próprio Termix:
  - as abas do Vibe (e só elas) abrem com uma configuração própria que verifica cada comando e cada gravação do agente e recusa, com o motivo, o que mexeria na branch principal, sairia da branch permitida, forçaria envio, descartaria trabalho, apagaria em massa ou fora do projeto, gravaria fora do projeto ou em arquivos de segredo;
  - o Termix cria ou confere a branch de trabalho (a do papel em projetos com o fluxo; uma branch própria nos outros), sem descartar nada;
  - o Termix marca a pasta do projeto como confiável no arquivo de configuração do Claude Code (decisão do Ygor), mexendo só nessa marca, com cópia de segurança;
  - "Executar plano" passa as tarefas ao dev uma a uma, com contexto limpo e pedidos curtos; o Termix confere o git depois de cada tarefa e o orquestrador revisa pelo resumo; até duas refações por tarefa;
  - pausas que retomam de onde pararam: limite de uso da janela de 5 horas (93 %, retoma sozinha), tarefa de publicação ou que precise do humano, erro ou agente sem resposta; painel com o andamento e notificação ao concluir;
  - correções da etapa anterior: o botão de iniciar não aparece como ação principal com um ciclo em andamento, e o aviso "Terminou" falso das abas do Vibe foi silenciado.
- **DEV2-005:** o Mutirão, para dividir um projeto entre sócios:
  - só o dono do projeto usa (com o fluxo, o DEV1; sem o fluxo, quem abrir, desde que o projeto tenha um remoto git); os outros veem só a explicação;
  - a tela é um painel ao lado do terminal; o chat com o orquestrador do dono é uma aba do próprio Termix, com a mesma trava do Vibe;
  - o dono informa os participantes e a branch de cada um; o orquestrador grava a divisão e a parte de cada sócio numa pasta própria do projeto; o Termix confere e recusa partes que compartilhem arquivos; publicar envia só essa pasta, só na branch do dono;
  - o sócio que abre o projeto na branch dele, depois de sincronizar, vê o aviso da parte e abre o Vibe Coding já preenchido por ela; ao concluir, o Termix grava a entrega e envia só a branch do sócio;
  - o dono vê um contador de entregas lido do remoto (sem custo de IA); com todas entregues aparece o botão da implementação automática, que fica para a próxima tarefa;
  - pequena correção: as cópias de segurança da configuração do Claude Code ficam limitadas às 10 mais recentes.
- **DEV2-006:** a implementação automática do Mutirão, última peça do MVP:
  - com todas as entregas, o dono aperta um botão e o próprio Termix (sem IA) confere que o projeto não tem mudanças pendentes e está na branch do dono, busca o remoto e junta a entrega de cada sócio na branch do dono, uma por vez; se uma entrega conflitar, o Termix cancela só aquela junção sem descartar nada, registra a branch e os arquivos, e as outras continuam entrando;
  - o Termix monta, a partir da divisão, das partes, das entregas e dos conflitos, uma entrega pronta para o Vibe Coding, e o orquestrador do dono planeja até o fim (primeiro os conflitos, depois ligar as partes, lacunas e validação final), com as perguntas só do indispensável;
  - sem perguntas e com o plano conferido, a execução segue sozinha no mesmo ciclo da etapa anterior, na branch do dono (a trava passa a permitir juntar branches nela e continua barrando a principal);
  - no fim, o Termix envia só a branch do dono e avisa que promover para a principal é com o humano;
  - a tela do Mutirão mostra as fases (juntando, conflitos, planejando, executando, concluído), o resultado de cada junção e um atalho para o painel do Vibe;
  - padronização: todo pedido do Termix aos agentes do Vibe passa a ir num arquivo, e só uma linha curta é digitada (como o Mutirão já fazia);
  - correções: o botão da parte do sócio sai na hora ao trocar para outro projeto; a lista de arquivos alterados lida do git perdia a primeira letra do primeiro arquivo; uma regra de bloqueio que o Claude Code acusava como inútil saiu (o bloqueio continua pelo verificador).
- **DEV2-007:** robustez do ciclo, para fechar o que ficou sem teste:
  - tarefa só de validação ou conferência: o plano a marca e o Termix aceita a tarefa sem commit novo quando o resumo do dev traz o resultado da validação (antes ela virava refação);
  - limite de tentativas: depois de duas refações o ciclo pausa, avisa e mostra o motivo; "Continuar" dá mais uma tentativa, não uma rodada inteira;
  - tempo limite: agente que não termina o turno em 30 minutos (ou fica 20 sem sinal) é interrompido, o ciclo pausa e avisa quem travou;
  - "Parar" no meio do turno não deixa o ciclo inconsistente: pedido ainda não enviado é desfeito (não conta como tentativa e a caixa de texto é limpa); turno interrompido é conferido e refeito de forma limpa ao continuar;
  - envio final do Mutirão com a branch do dono mais nova no remoto (outra máquina): o Termix busca o remoto e junta antes de enviar, sem reescrever histórico nem descartar; com conflito, cancela a junção, não envia nada e explica.
- **DEV2-008:** um guia de validação do MVP para o Ygor testar no Termix real, com caixas de marcar: preparação, custos esperados, o cuidado com o arquivo de configuração do Claude Code (o que muda, a cópia de segurança, como conferir e desfazer), um roteiro do Vibe Coding de ponta a ponta, um roteiro opcional do Mutirão com dono e sócias num único PC, o que observar, as limitações conhecidas e o modelo do veredito. Pequena correção de texto: o aviso de pausa não repete mais a instrução de continuar.
- **DEV2-009:** fechamento das pendências do MVP que não dependiam do Ygor:
  - numa rodada real de planejamento (projeto de brinquedo com publicação e um dado que só o cliente tem), o planejador marcou sozinho as tarefas de publicação, as que dependem do humano e a validação final; o pedido não precisou mudar;
  - correção de um alarme falso: uma linha do plano que **proibia** enviar para a branch principal era lida como ordem de enviar (no Mutirão, isso também impediria a execução automática);
  - nova conferência sem custo de IA: plano sem nenhuma tarefa de publicação marcada, mas com título que fala em publicar ou fazer deploy, mostra um aviso;
  - Mutirão: a entrega montada para o plano final traz o objetivo e o critério de pronto do projeto inteiro e os passos de publicação e do humano achados na divisão e nos documentos do projeto, e o pedido manda planejá-los com as marcas;
  - visto com um Claude Code real: parar o agente no meio do turno e limpar o contexto em seguida funciona (o comando chega inteiro);
  - a trava passa a permitir resolver um conflito escolhendo um lado, só com uma junção em andamento, na branch permitida e em arquivo ainda em conflito.
- **DEV2-010:** "Importar projeto (várias pastas)", atrás de uma chave experimental própria (desligada por padrão):
  - para projetos com mais de uma pasta (ex.: a do dev e a do orquestrador): o Termix analisa cada pasta só lendo, sem custo de IA (git, papel do fluxo, tarefas em andamento, handoff, último checkpoint e a lista de conversas do Claude Code), e mostra um mapa para confirmar o papel de cada pasta e a aba que será criada, com avisos quando algo é ambíguo e dicas de economia;
  - "Carregar" abre abas novas com o papel no nome; cada uma recebe um pedido curto, guardado em arquivo e anexado na linha digitada, para ler só o essencial e dizer onde paramos; retomar uma conversa antiga é opcional, por pasta, desmarcado;
  - "Organizar com IA" (opcional) lê um resumo montado pelo Termix e grava a organização na pasta de dados do app; sugestões que mexeriam em arquivos ficam só como proposta;
  - nada é movido, renomeado ou apagado nas pastas do usuário;
  - como o núcleo abre cada aba na pasta do projeto, cada pasta vira um projeto do Termix, agrupado pelo módulo.
- **DEV2-011:** a dev2 recebeu tudo o que a dev1 tem até a versão 0.6.1 (layout novo, telas Conectores e Código) e o módulo foi conferido nele:
  - Vibe Coding, Mutirão e as chaves em Configurações funcionam no layout novo;
  - como o diálogo "Novo projeto" deixou de existir, o botão "Importar projeto (várias pastas)" passou para a tela "Novo chat", ao lado de "Criar chat";
  - o painel do Mutirão foi ajustado para encostar no palco arredondado, sem borda dupla;
  - os testes do módulo sem custo de IA passaram.
- **DEV2-012:** prova técnica do ciclo do Vibe com agentes reais no layout novo, num projeto de brinquedo isolado (fora das pastas do Ygor, com a configuração do Claude Code de teste):
  - a chave ligada pela interface; o plano veio com três tarefas pequenas e a validação final, sem perguntas e sem publicação;
  - "Parar" no meio de uma tarefa, fechar e reabrir o app: o painel mostra onde parou e nada recomeça sozinho; "Continuar" leva até "Projeto concluído", com a notificação;
  - os commits ficaram só na branch de trabalho; a principal, local e no remoto, não mudou; um pedido proposital de commit na principal foi recusado pela trava, com o motivo na aba;
  - gasto de cerca de 7 pontos da janela de 5 horas (abaixo do teto combinado de 15);
  - nada quebrou no módulo e nenhuma linha mudou.
- **DEV2-013:** a trava passa a recusar, com o motivo, a troca de branch para a principal (main/master) nas abas do Vibe. Na DEV2-012 um agente conseguiu trocar para a principal; o commit seguinte foi recusado, mas ele ficou nela. Agora a troca é barrada em todas as formas comuns (direta, criando branch nova a partir da principal, destacada, pelo remoto, pela "branch anterior"). Trocar para a branch permitida ou para outras branches, criar branch a partir da permitida e só ler a principal continuam permitidos. As operações de git do próprio Termix (conferir a branch, o Mutirão juntar as entregas, a conferência depois de cada tarefa) não passam pela trava, então o Mutirão segue igual. Sem custo de IA: 34 casos novos no teste da trava, e os testes antigos do módulo continuam passando.
- **DEV2-014:** política de autonomia por projeto, escolhida antes de iniciar a produção autônoma (decisões do Ygor de 2026-11-11):
  - uma tela "Antes de iniciar", entre o plano pronto e a execução, com três modelos prontos (Supervisionado, Autônomo até a branch, que é o padrão, e Autônomo com deploy) e ajustes por cima: deploy na principal, os comandos de deploy, o comando de qualidade que precisa passar antes, o teto de uso (janelas de 5 h e de 7 d e, opcional, em dólares), o modelo de IA do orquestrador e do dev e quando chamar o humano;
  - só o responsável pelo projeto (papel DEV1 com o fluxo; o dono, sem o fluxo) vê e liga o deploy; para os outros papéis a opção não aparece e o fim do ciclo é enviar a própria branch e o resumo da entrega;
  - a política fica gravada por projeto, é relida ao reabrir o app e pode ser editada no meio do ciclo sem parar nada (vale a partir da próxima tarefa); o botão "Pausar deploy" fica sempre à vista no painel e corta na hora qualquer deploy automático, sem parar o resto;
  - o ciclo passa a ler a política: com deploy automático, a tarefa de publicação fica marcada como pendente e o ciclo segue (quem fará o deploy é o Termix, em código, na próxima etapa; nada é executado agora); sem ele, pausa como antes; o teto de uso, antes fixo, passa a ser o da política e, ao ser atingido, o ciclo pausa e avisa;
  - o modelo de IA por papel vai na configuração que o módulo já gera para as abas do Vibe, sem mudar o núcleo;
  - os agentes recebem só o trecho da política que importa ao planejador; os pedidos continuam curtos e em arquivo.
- **DEV2-018:** ajustes da política e uma proposta ao DEV1:
  - a tela "Antes de iniciar" agora rola inteira: os botões do rodapé do modal do Vibe ficam fora do conteúdo e não cobrem mais o fim do formulário ("Quando chamar você"); mudança só no estilo do módulo, sem tocar no modal do núcleo;
  - a interface deixou de mostrar números internos de tarefa: a tarefa de deploy aparece como "deploy pendente" e o texto do deploy diz que a execução ainda não está disponível nesta versão;
  - o arquivo da política entrou na checagem de sintaxe do projeto (a sugestão anterior ao DEV1 sobre isso foi resolvida);
  - decisões do orquestrador sobre a DEV2-014, mantidas como estavam: o teto de 7 dias pausa com padrão de 95 %, a pausa por teto avisa e "Decisões de produto" vale a partir do próximo plano; o envio automático da própria branch e do handoff no fim do ciclo de DEV2..DEV5 entra na DEV2-016;
  - documento novo de proposta ao DEV1 (só documento, nada implementado): o botão "Delegar tarefa" com perfil e PIN por sócio (veja "Sugestões ao DEV1").
- **DEV2-015:** recuperação de erro do ciclo (decisão do Ygor: erro simples não pode travar o projeto):
  - quando o Dev erra, estoura o tempo ou fica sem sinal, o Termix grava um diagnóstico (tela da aba, situação do git, motivo e o que já foi tentado) e pede ao orquestrador uma única ação de uma lista fechada: reenviar com explicação, recomeçar com o contexto limpo, reabrir a aba do Dev retomando a conversa, reiniciar o projeto (comando opcional da política), dividir a tarefa em duas ou pular;
  - até 3 voltas por tarefa (configurável de 0 a 5, contam no orçamento); depois, a tarefa vira pendência, o Termix avisa e o ciclo segue. Só pausa se a próxima tarefa depender dela, se a principal mudar ou se o teto for atingido; uma decisão ilegível também pausa;
  - se quem travou foi o orquestrador, o Termix reabre a aba dele uma vez e, travando de novo, pausa e avisa;
  - o comando de reiniciar o projeto roda só na pasta do projeto e passa antes pela trava; o limite de refações pela revisão não mudou;
  - o painel mostra "Recuperando (volta n/3)" e, no fim, a lista de pendências. Testado só com o agente falso, sem custo de IA.
- **DEV2-016:** deploy feito pelo Termix e fim de ciclo dos devs auxiliares (decisões do Ygor: o DEV1, ou o dono sem o fluxo, tem autorização total para deploy na main; o deploy é do Termix, nunca do agente; voltar versão só por revert):
  - numa tarefa de deploy permitida pela política, o próprio Termix, sem IA: confere a branch e a árvore, roda o portão de qualidade na branch de trabalho, leva a branch para a principal (com o fluxo, avanço direto como na promoção; sem avanço direto possível ou sem o fluxo, uma junção), envia a principal e uma marca de versão (tag) sem forçar, roda a receita de deploy com cada comando conferido pela trava, grava o log e volta para a branch de trabalho;
  - portão que falha, conflito na junção ou mudanças pendentes não publicam nada: vão para a recuperação da DEV2-015 (o Dev conserta na branch e o Termix tenta de novo); conflito é sempre cancelado sem perder nada;
  - receita que falha depois do envio: o Termix avisa que a principal já foi enviada e a publicação falhou, e oferece rodar a receita de novo, voltar versão ou seguir sem publicar; não desfaz nada sozinho;
  - "Pedir autorização": o sino e o painel mostram o resumo (commits que entram, portão, receita) com "Autorizar deploy" e "Negar"; negar vira pendência; o ponto de aprovação fica num arquivo, pronto para o Telegram responder pelo mesmo caminho;
  - "Pausar deploy" retém a tarefa; "Retomar deploy" publica os retidos (com um agente trabalhando, só ao fim da tarefa atual);
  - "Voltar versão": lista de deploys no painel, com confirmação explícita; desfaz por revert na principal e envia sem forçar; depois pergunta se roda a receita de novo;
  - DEV2..DEV5: nunca publicam na principal (recusado no processo principal, não só na tela); no fim do ciclo o orquestrador reescreve o handoff da dev em alto nível e o Termix faz o commit só dele e envia só a branch da dev;
  - ajustes da DEV2-015: o servidor deixado pelo "F5 do projeto" é encerrado (só ele, com os filhos) antes de um F5 novo e no fim do ciclo; durante a recuperação o painel mostra só "Volta n/N" e um link "Abrir diagnóstico".

## Áreas e arquivos afetados

- Módulo isolado: a pasta do processo principal ganhou o verificador da trava (DEV2-004) e a parte do Mutirão (DEV2-005); a pasta da interface ganhou o ciclo de execução, o painel do Vibe e o painel do Mutirão. Na DEV2-016, um arquivo novo do deploy no processo principal e a etapa de deploy no ciclo da interface.
- Núcleo: na DEV2-004, **uma linha do processo principal virou três**, no ponto em que o terminal é aberto: o núcleo pergunta ao módulo se a aba é do Vibe e, sendo, usa a configuração com a trava; as outras abas seguem iguais. Na DEV2-001, a **ponte ganhou uma linha** (o canal do módulo, só para os pedidos "vibe") e a **página principal ganhou duas linhas** (o estilo e o script do módulo). A checagem de sintaxe do projeto passou a incluir os arquivos do módulo. Da DEV2-005 à DEV2-011, nenhuma outra linha do núcleo (na DEV2-011, só a resolução dos conflitos da sincronização, mantendo a versão da dev1 e somando as linhas do módulo).
- Dados: na pasta de dados do app, por projeto (a política de autonomia desde a DEV2-014, entrega, plano, resultados e revisões de cada tarefa, configuração da trava, histórico) e uma pasta de cópias de segurança da configuração do Claude Code. Na pasta do projeto do usuário, só o que os agentes fazem na branch de trabalho, a troca de branch feita pelo Termix e, no Mutirão, a pasta da divisão, das partes e das entregas (enviadas só para a branch do dono ou do sócio). Na implementação automática, as junções e o trabalho dos agentes ficam na branch do dono, que o Termix envia ao remoto no fim. Na DEV2-016, uma pasta de deploys por projeto (registro, logs e o pedido de autorização).
- Documentação: desenho do módulo, tarefas e changelog próprios da dev2, uma linha nas decisões e, na DEV2-018, a proposta do botão "Delegar tarefa" ao DEV1. Na DEV2-018, a lista da checagem de sintaxe do projeto ganhou o arquivo da política do módulo.

## Impacto e riscos

- **Desligado por padrão:** sem ligar a chave, o app fica igual ao de hoje (a pergunta ao módulo ao abrir um terminal só responde "não é do Vibe").
- A trava cobre os caminhos comuns, mas **não é uma sandbox**: um script escrito e rodado pelo próprio agente poderia escapar. Por isso o Termix também confere o git depois de cada tarefa e pausa se a branch principal mudar.
- **Arquivo de configuração do Claude Code:** o Termix grava nele uma única marca por projeto do Vibe. Leitura e gravação cuidadosas (cópia de segurança, releitura, troca atômica, nada se o arquivo não for lido), mas as sessões abertas do Claude Code também escrevem nele. No teste foi usado um arquivo de teste; falta validar no real.
- Apagar de forma recursiva é recusado até dentro do projeto (escolha conservadora).
- Testados sem tokens (com um Claude Code falso no teste, DEV2-007): limite de tentativas, tempo limite, parar antes e durante o turno, tarefa sem commit e envio final com o remoto à frente. Com tokens: a resolução de um conflito pelo dev e pela revisão reais. Ainda não testados com tokens: entrega real do Vibe de um sócio e o plano final do Mutirão com os passos de publicação (validado pelo pedido gerado). A marcação de publicação/humano pelo planejador real foi vista na DEV2-009 (Vibe comum). Depois de parar um agente, o indicador da aba fica "trabalhando" até o próximo pedido (só visual).
- **Mutirão:** o Termix faz commit e envia ao remoto (só a pasta do Mutirão, só na branch do dono ou do sócio, nunca na principal). No teste, um pedido longo digitado na aba recém-aberta chegou cortado; por isso o pedido do Mutirão vai num arquivo e só uma linha é digitada. O Vibe do sócio não rodou até o fim no teste (a entrega foi simulada).
- **Implementação automática:** o Termix junta branches e envia a branch do dono ao remoto sem perguntar (só ela, nunca a principal; nada é descartado, e uma junção com conflito é cancelada e vira tarefa). Ela só começa com o projeto sem mudanças pendentes. No teste, as entregas dos sócios foram feitas por script, não pelo Vibe deles.
- **Recuperação (DEV2-015):** o ciclo segue sozinho em vez de pausar nos erros do Dev, então uma tarefa pode terminar como pendência sem o humano ver na hora (o sino avisa e a lista fica no painel). A reabertura da aba e a decisão do orquestrador ainda não foram vistas com um Claude Code real. Desde a DEV2-016 o servidor do F5 do projeto é encerrado antes de um F5 novo e no fim do ciclo (com o app fechado à força, só no próximo F5).
- **Deploy (DEV2-016):** é a primeira vez que o Termix (não a IA) escreve na branch principal e no remoto: junção, marca de versão e envio, sempre sem forçar, e reverts para voltar versão. Só para o DEV1 ou o dono. Testado só com repositórios locais de teste (o remoto de teste recusa reescrita e exclusão), nunca num projeto real. A receita roda comandos do projeto com a principal em checkout; cada comando passa pela trava, mas a trava não é uma sandbox. Depois de voltar versão num projeto com o fluxo, a dev1 não tem os reverts: o próximo deploy sai por junção (o revertido continua revertido).
- **Política (DEV2-014):** o teto de 7 dias passa a pausar (padrão 95 %) e a pausa por teto passa a avisar. Desde a DEV2-016, "Pedir autorização" pede a autorização no sino e no painel em vez de só pausar, e "Pausar deploy" também retém nesse modo.
- Sem dependências novas, sem mudança de versão, sem mexer em chat, Clear ou atualização.

## Sugestões ao DEV1

- **Botão "Delegar tarefa" (proposta, só documento):** ver `docs/PROPOSTA_DELEGAR_TAREFA.md`. Automatiza o que hoje é manual para passar uma tarefa a um segundo dev: criar e registrar a dev2, o orquestrador da dev1 escrever o pedido com o resultado esperado, o pedido chegar pelo git à pessoa nomeada, o aviso de entrega e a análise só pelo handoff, com integração só com a aprovação do DEV1. Inclui perfil por sócio com PIN (a conta GitHub é compartilhada), as opções de onde guardar o PIN, o que pode ser reaproveitado do plugin fluxo e do Mutirão, as fases sugeridas e as perguntas em aberto. A ressalva de segurança está explícita: organiza e evita conflito, mas não é proteção forte.
- **Conferência de conversa existente ignora `CLAUDE_CONFIG_DIR`:** a conferência "esta conversa existe?" olha só a pasta padrão do Claude Code no perfil do usuário. Com a variável apontando para outra pasta, ao reabrir o app a aba tenta abrir uma conversa nova com o mesmo identificador e aparece "Falha ao iniciar ou retomar a conversa". Sem a variável (uso normal) não acontece.
- **Aba "trabalhando" depois de um Esc:** interrompida com Esc, a aba fica "trabalhando" por até 20 segundos, porque o Claude Code não avisa o fim do turno nesse caso (só visual).
- **Configurações aninhadas:** "Notificações", "Conectores" e "Projetos arquivados" aparecem dentro do cartão do "Botão Clear", provavelmente por um bloco não fechado na montagem da página de Configurações.

## Como validar

- DEV2-016, sem custo de IA: o teste do módulo com remotos locais de teste (deploy com avanço direto e com junção, portão falhando, conflito cancelado, autorizar e negar, pausar e retomar, marco não atingido, receita falhando depois do envio, voltar versão nos dois casos, fim de ciclo da DEV2 enviando só a dev2, DEV2 sem publicar, F5 do projeto encerrando o anterior) e, numa instância isolada com o agente falso, o ciclo com deploy concluído, pedido de autorização no sino e no painel e a lista de versões com "Voltar para antes deste". Nunca testar num projeto real.
- DEV2-018, sem custo de IA: numa instância isolada sem abas de agente, abrir "Executar plano…" e rolar a tela "Antes de iniciar" até o fim (com e sem os campos de deploy, e numa janela baixa): "Quando chamar você" e os botões do formulário ficam inteiros acima do rodapé; nenhum número interno de tarefa aparece no modal. Ler `docs/PROPOSTA_DELEGAR_TAREFA.md`.
- Seguir o guia de validação do MVP (documento novo da DEV2-008), no Termix real rodando da dev2.
- Rodar a checagem de sintaxe do projeto.
- DEV2-014, sem custo de IA: o teste da política (o papel define as opções, modelos, deploy, teto, gravação e reabrir, "Pausar deploy", modelo de IA nas abas e pedidos) e, numa instância isolada sem abas de agente, a tela "Antes de iniciar", o painel e o projeto de outro papel sem a opção de deploy.
- DEV2-009, sem custo de IA: o verificador da trava com os casos de conflito (escolher um lado passa só com junção em andamento, na branch permitida, em arquivo em conflito) e o teste do módulo das conferências do plano e da entrega do Mutirão.
- Sem gastar tokens: rodar o verificador da trava direto com entradas simuladas (cada regra com um caso permitido e um bloqueado).
- Numa instância isolada, com um projeto pequeno e um plano de poucas tarefas: "Executar plano" leva cada tarefa pelo dev e pela revisão até "Projeto concluído"; os commits ficam só na branch de trabalho; a branch principal não muda; pedir de propósito a um agente um commit na branch principal é recusado (pedir a troca para a branch principal também é recusado (DEV2-013)); o limite injetado no modo de teste pausa e retoma; uma tarefa marcada como publicação pausa; "Parar" e reabrir o app mostram onde parou sem recomeçar.
- No real: conferir que a marca de pasta confiável apareceu só na entrada do projeto e que existe a cópia de segurança.
- Mutirão, sem custo de IA: o teste do módulo com um remoto local (dono e dois sócios) cobre papel, conferência (inclusive a recusa de arquivo em comum), publicação, parte do sócio, entrega e contador. Com IA, numa instância isolada: o dono gera a divisão com o orquestrador, publica; cada sócio sincroniza, vê a parte e abre o Vibe preenchido; o contador vai de 0 a N e mostra o botão da implementação automática.
- Implementação automática, sem custo de IA: o teste do módulo com um remoto local cobre projeto com mudanças pendentes (recusado), junção sem conflito, junção com conflito (cancelada sem perder nada, a outra entra), a entrega montada para o plano, os pedidos em arquivo, a trava (juntar na branch do dono pode, na principal não) e o envio só da branch do dono. Com IA, numa instância isolada: com duas entregas, o botão leva até "Concluído" e a branch do dono chega ao remoto com a principal intacta; com conflito, o plano começa pela tarefa do conflito.
- Robustez (sem custo de IA): o teste do módulo cobre a marca de tarefa sem commit e o envio final com o remoto à frente (sem conflito, com conflito, com mudança pendente, fora da branch do dono); numa instância isolada com um agente falso, o ciclo inteiro do Mutirão passa pelo limite de tentativas, parar antes e durante o turno, tempo limite do dev, silêncio da revisão, tarefa sem commit e envio final integrando o remoto.

## Decisão do DEV1 / usuário

(Preenchido depois. Por decisão do Ygor, o DEV1 só é avisado no MVP do Vibe/Mutirão.)
