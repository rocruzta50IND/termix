<!-- fluxo:v1 — escrito pelo DEV2, lido pelo DEV1. É a ÚNICA parte da dev2 que o DEV1 vê antes de o usuário aprovar a entrega. -->
# HANDOFF DEV2 → DEV1

Resumo da entrega atual da dev2. O DEV2 reescreve este arquivo a cada entrega (ou experimento) e o inclui no commit/push da dev2.

**Regras de escrita:** descreva *o quê* e *por quê*, em alto nível. **Não cole código, diffs nem trechos de arquivos.** O DEV1 só tem acesso a este resumo até o usuário aprovar; se a entrega for reprovada, ele não deve ficar com o conteúdo da dev2 no contexto.

- **Status:** EXPERIMENTO (não entregar)  <!-- AGUARDANDO DECISÃO | APROVADA | REPROVADA | EXPERIMENTO (não entregar) -->
- **Tarefas:** DEV2-001, DEV2-002, DEV2-003
- **IDs de tarefa usados pela dev2:** DEV2-001, DEV2-002, DEV2-003 (a dev2 tem numeração própria DEV2-xxx e não usa TASK-xxx)
- **Data:** 2026-11-06

## Resumo do que mudou

Módulo separado "Vibe Coding e Mutirão", atrás de uma chave experimental em Configurações (desligada por padrão).

- **DEV2-001:** a casca do módulo, com dois botões no cabeçalho ("Vibe Coding" e "Mutirão").
- **DEV2-002:** a tela de entrega do projeto, um formulário engessado (objetivo, fluxo desenhado, um .md com a estrutura do projeto, critério de pronto, o que os agentes não podem fazer e os acessos), com um modelo .md para baixar.
- **DEV2-003:** com a entrega pronta, "Iniciar" cria no projeto duas abas de Claude Code do próprio app, um orquestrador e um dev. O Termix pede ao orquestrador, com um pedido curto, o plano do projeto até o fim e só as perguntas indispensáveis; percebe sozinho quando ele termina, mostra o andamento, as perguntas num formulário (com notificação) e o plano. Nesta etapa nenhum agente mexe no código do projeto e o dev fica parado. Há "Parar" e "Retomar", e o estado sobrevive a fechar o app sem recomeçar sozinho. A tela ganhou dicas curtas de economia de tokens e o recuo de uma lista da DEV2-002 foi corrigido.

Decisões novas do Ygor registradas no desenho do módulo: economia de tokens em todas as funções (o Termix espera e conduz, não a IA); agentes só fazem commit e push na branch do papel (ou numa branch própria em projeto sem o fluxo), nunca na main/master, e nada que apague dados; o humano só é chamado para deploy e o indispensável; roteiro renumerado até a DEV2-007 (celular sem prioridade; no MVP, o Remote Control do Claude Code).

## Áreas e arquivos afetados

- Módulo isolado: uma pasta no processo principal (com o modelo .md) e uma pasta na interface (script e estilos).
- Núcleo: na DEV2-003, **nenhuma linha**. O módulo reaproveita o que a interface principal já oferece (criar aba, escrever no terminal, eventos de hook, avisos). As ligações de antes continuam: uma linha que carrega o módulo no processo principal, uma ponte genérica para os canais do módulo e duas inclusões na página.
- Dados: tudo na pasta de dados do app, numa subpasta do módulo por projeto (entrega, estado do ciclo, plano, perguntas, respostas e histórico). Nada é escrito na pasta do projeto do usuário pelo Termix nesta etapa.
- Documentação: desenho do módulo, tarefas e changelog próprios da dev2 e uma linha nas decisões.

## Impacto e riscos

- **Desligado por padrão:** sem ligar a chave, o app fica igual ao de hoje.
- As duas abas do Vibe abrem no modo que dispensa aprovações (o mesmo "Dangerously" que já existe), para o ciclo ser autônomo. O pedido proíbe mexer no código nesta etapa, e no teste o orquestrador só leu e gravou na pasta do módulo.
- **O orquestrador ignorou a regra de branch no teste** (o plano dizia para fazer commit na branch principal). A tela agora alerta quando isso acontece, mas regra em texto não é trava: a próxima etapa, que executa o plano, precisa de uma trava em código.
- Numa pasta nova, o Claude Code pergunta se a pessoa confia na pasta antes de abrir; isso é do humano, e o Termix avisa se o orquestrador não abrir em 30 segundos.
- Um erro no módulo é registrado no log e não derruba o app; substituir uma entrega ou iniciar um ciclo novo nunca apaga o anterior (vai para um histórico).
- Modo de teste ligado só por variável de ambiente; sem ela, nada dele é exposto.
- Sem dependências novas, sem mudança de versão, sem mexer em chat, Clear, atualização ou Mutirão.

## Como validar

- Rodar a checagem de sintaxe do projeto.
- Abrir o app numa instância isolada, ligar a chave em Configurações > Experimental, preencher uma entrega pequena e completa e clicar em "Iniciar Vibe Coding": aparecem as abas do orquestrador e do dev, e o painel vai de "Preparando plano" para "Perguntas" ou "Plano pronto".
- Responder as perguntas (havendo): o plano é fechado e aparece na tela. "Parar" não fecha as abas nem apaga nada.
- Fechar e reabrir o app: a tela mostra onde parou e nada recomeça sozinho.
- Conferir que a pasta do projeto de teste não mudou e que não houve commit.

## Decisão do DEV1 / usuário

(Preenchido depois. Por decisão do Ygor, o DEV1 só é avisado no MVP do Vibe/Mutirão.)
