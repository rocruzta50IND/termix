<!-- fluxo:v1 — escrito pelo DEV2, lido pelo DEV1. É a ÚNICA parte da dev2 que o DEV1 vê antes de o usuário aprovar a entrega. -->
# HANDOFF DEV2 → DEV1

Resumo da entrega atual da dev2. O DEV2 reescreve este arquivo a cada entrega (ou experimento) e o inclui no commit/push da dev2.

**Regras de escrita:** descreva *o quê* e *por quê*, em alto nível. **Não cole código, diffs nem trechos de arquivos.** O DEV1 só tem acesso a este resumo até o usuário aprovar; se a entrega for reprovada, ele não deve ficar com o conteúdo da dev2 no contexto.

- **Status:** EXPERIMENTO (não entregar)  <!-- AGUARDANDO DECISÃO | APROVADA | REPROVADA | EXPERIMENTO (não entregar) -->
- **Tarefas:** DEV2-001, DEV2-002
- **IDs de tarefa usados pela dev2:** DEV2-001, DEV2-002 (a dev2 tem numeração própria DEV2-xxx e não usa TASK-xxx)
- **Data:** 2026-11-06

## Resumo do que mudou

Módulo separado "Vibe Coding e Mutirão", atrás de uma chave experimental em Configurações (desligada por padrão).

- **DEV2-001:** a casca do módulo, com dois botões no cabeçalho ("Vibe Coding" e "Mutirão").
- **DEV2-002:** o botão "Vibe Coding" agora abre a tela de entrega do projeto. É um formulário engessado, de propósito, para evitar retrabalho: projeto, objetivo final, fluxo desenhado, um .md com a estrutura do projeto (precisa ter as seções do modelo), critério de pronto, o que os agentes não podem fazer e os acessos que o humano vai fornecer. A tela mostra sempre o que falta, oferece um modelo .md para baixar e só libera "Iniciar" com tudo completo. "Iniciar" apenas guarda a entrega; os agentes chegam numa próxima etapa. O Mutirão continua "Em construção".

## Áreas e arquivos afetados

- Módulo isolado: uma pasta no processo principal (com o modelo .md) e uma pasta na interface.
- Núcleo: só ligações. No processo principal, a linha que carrega o módulo passou a entregar a ele o que ele precisa para registrar os próprios canais (a linha separada do canal de status saiu). Na ponte, a ligação específica de status virou uma ligação genérica que só alcança os canais do módulo. A página e a interface principal do app não foram alteradas.
- Dados: a entrega fica na pasta de dados do app, numa subpasta do módulo por projeto. Nada é escrito na pasta do projeto do usuário.
- Documentação: desenho do módulo, tarefas e changelog próprios da dev2 e uma linha nas decisões.

## Impacto e riscos

- **Desligado por padrão:** sem ligar a chave, o app fica igual ao de hoje.
- Um erro no módulo é registrado no log e não derruba o app; cada canal do módulo tem a própria proteção.
- Substituir uma entrega pede confirmação e nunca apaga a anterior (vai para um histórico).
- Existe um modo de teste, ligado só por variável de ambiente ao abrir o app, que dispensa o diálogo de arquivo para a automação. Sem a variável, nada dele é exposto.
- Sem dependências novas, sem mudança de versão, sem mexer em chat, Clear, abas ou atualização.
- Ainda não houve teste manual com o diálogo de arquivo nativo (a automação usou o modo de teste).

## Como validar

- Rodar a checagem de sintaxe do projeto.
- Abrir o app: o cabeçalho continua igual.
- Ligar a chave em Configurações > Experimental e clicar em "Vibe Coding": a tela lista o que falta e "Iniciar" fica desabilitado.
- Baixar o modelo, escolher um .md incompleto (a tela aponta as seções que faltam), completar tudo e iniciar: aparece "Entrega pronta" e a entrega fica na pasta de dados do app.
- Fechar e reabrir: o que foi preenchido e o aviso da entrega existente aparecem. Desligar a chave: os botões somem.

## Decisão do DEV1 / usuário

(Preenchido depois. Por decisão do Ygor, o DEV1 só é avisado no MVP do Vibe/Mutirão.)
