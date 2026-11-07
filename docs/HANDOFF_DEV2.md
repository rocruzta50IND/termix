<!-- fluxo:v1 — escrito pelo DEV2, lido pelo DEV1. É a ÚNICA parte da dev2 que o DEV1 vê antes de o usuário aprovar a entrega. -->
# HANDOFF DEV2 → DEV1

Resumo da entrega atual da dev2. O DEV2 reescreve este arquivo a cada entrega (ou experimento) e o inclui no commit/push da dev2.

**Regras de escrita:** descreva *o quê* e *por quê*, em alto nível. **Não cole código, diffs nem trechos de arquivos.** O DEV1 só tem acesso a este resumo até o usuário aprovar; se a entrega for reprovada, ele não deve ficar com o conteúdo da dev2 no contexto.

- **Status:** EXPERIMENTO (não entregar)  <!-- AGUARDANDO DECISÃO | APROVADA | REPROVADA | EXPERIMENTO (não entregar) -->
- **Tarefas:** DEV2-001, DEV2-002, DEV2-003, DEV2-004
- **IDs de tarefa usados pela dev2:** DEV2-001, DEV2-002, DEV2-003, DEV2-004 (a dev2 tem numeração própria DEV2-xxx e não usa TASK-xxx)
- **Data:** 2026-11-06

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

## Áreas e arquivos afetados

- Módulo isolado: a pasta do processo principal ganhou o verificador da trava; a pasta da interface ganhou o ciclo de execução e o painel.
- Núcleo: na DEV2-004, **uma linha do processo principal virou três**, no ponto em que o terminal é aberto: o núcleo pergunta ao módulo se a aba é do Vibe e, sendo, usa a configuração com a trava; as outras abas seguem iguais. A checagem de sintaxe do projeto passou a incluir o arquivo novo. Interface principal e ponte: nada.
- Dados: na pasta de dados do app, por projeto (entrega, plano, resultados e revisões de cada tarefa, configuração da trava, histórico) e uma pasta de cópias de segurança da configuração do Claude Code. Na pasta do projeto do usuário, só o que os agentes fazem na branch de trabalho e a troca de branch feita pelo Termix.
- Documentação: desenho do módulo, tarefas e changelog próprios da dev2 e uma linha nas decisões.

## Impacto e riscos

- **Desligado por padrão:** sem ligar a chave, o app fica igual ao de hoje (a pergunta ao módulo ao abrir um terminal só responde "não é do Vibe").
- A trava cobre os caminhos comuns, mas **não é uma sandbox**: um script escrito e rodado pelo próprio agente poderia escapar. Por isso o Termix também confere o git depois de cada tarefa e pausa se a branch principal mudar.
- **Arquivo de configuração do Claude Code:** o Termix grava nele uma única marca por projeto do Vibe. Leitura e gravação cuidadosas (cópia de segurança, releitura, troca atômica, nada se o arquivo não for lido), mas as sessões abertas do Claude Code também escrevem nele. No teste foi usado um arquivo de teste; falta validar no real.
- Apagar de forma recursiva é recusado até dentro do projeto (escolha conservadora).
- Ainda não testados com tokens: refação pedida pela revisão, pausa depois de três tentativas, agente sem resposta e parar no meio de um turno.
- Sem dependências novas, sem mudança de versão, sem mexer em chat, Clear, atualização ou Mutirão.

## Como validar

- Rodar a checagem de sintaxe do projeto.
- Sem gastar tokens: rodar o verificador da trava direto com entradas simuladas (cada regra com um caso permitido e um bloqueado).
- Numa instância isolada, com um projeto pequeno e um plano de poucas tarefas: "Executar plano" leva cada tarefa pelo dev e pela revisão até "Projeto concluído"; os commits ficam só na branch de trabalho; a branch principal não muda; pedir de propósito a um agente um commit na branch principal é recusado; o limite injetado no modo de teste pausa e retoma; uma tarefa marcada como publicação pausa; "Parar" e reabrir o app mostram onde parou sem recomeçar.
- No real: conferir que a marca de pasta confiável apareceu só na entrada do projeto e que existe a cópia de segurança.

## Decisão do DEV1 / usuário

(Preenchido depois. Por decisão do Ygor, o DEV1 só é avisado no MVP do Vibe/Mutirão.)
