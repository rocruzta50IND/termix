<!-- fluxo:v1 — escrito pelo DEV2, lido pelo DEV1. É a ÚNICA parte da dev2 que o DEV1 vê antes de o usuário aprovar a entrega. -->
# HANDOFF DEV2 → DEV1

Resumo da entrega atual da dev2. O DEV2 reescreve este arquivo a cada entrega (ou experimento) e o inclui no commit/push da dev2.

**Regras de escrita:** descreva *o quê* e *por quê*, em alto nível. **Não cole código, diffs nem trechos de arquivos.** O DEV1 só tem acesso a este resumo até o usuário aprovar; se a entrega for reprovada, ele não deve ficar com o conteúdo da dev2 no contexto.

- **Status:** EXPERIMENTO (não entregar)  <!-- AGUARDANDO DECISÃO | APROVADA | REPROVADA | EXPERIMENTO (não entregar) -->
- **Tarefas:** DEV2-001
- **IDs de tarefa usados pela dev2:** DEV2-001 (a dev2 tem numeração própria DEV2-xxx e não usa TASK-xxx)
- **Data:** 2026-11-06

## Resumo do que mudou

Criada a base de um módulo separado, "Vibe Coding e Mutirão", que vai permitir entregar um projeto para agentes trabalharem sozinhos (Vibe Coding) e dividir um projeto entre os sócios (Mutirão). Por enquanto é só a casca: dois botões no cabeçalho que abrem telas "Em construção", atrás de uma chave experimental em Configurações. Nenhum comportamento real.

## Áreas e arquivos afetados

- Módulo novo, isolado: uma pasta no processo principal e uma pasta na interface.
- Núcleo: só ligações (carregar o módulo com proteção contra erro, uma ponte de status, um estilo e um script na página). A interface principal do app não foi alterada.
- Script de checagem de sintaxe passou a incluir os arquivos do módulo.
- Documentação: desenho do módulo, tarefas e changelog próprios da dev2 e uma seção curta nas decisões.

## Impacto e riscos

- **Desligado por padrão:** sem ligar a chave, o app fica igual ao de hoje.
- Um erro no módulo é registrado no log e não derruba o app.
- Sem dependências novas, sem mudança de versão, sem mexer em chat, Clear, abas ou atualização.

## Como validar

- Rodar a checagem de sintaxe do projeto.
- Abrir o app: o cabeçalho continua igual.
- Ligar a chave em Configurações > Experimental: aparecem os botões "Vibe Coding" e "Mutirão"; cada um abre uma tela "Em construção". Desligar: os botões somem.

## Decisão do DEV1 / usuário

(Preenchido depois. Por decisão do Ygor, o DEV1 só é avisado no MVP do Vibe/Mutirão.)
