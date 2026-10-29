# TASKS — Termix

Controle de tarefas do projeto. Ao receber um pedido, o Claude localiza a tarefa aqui (ou cria uma nova entrada) antes de desenvolver.

Formato do ID: `TASK-XXX` — numeração sequencial, sem reuso, livre em todas as branches. Status e responsabilidades em `WORKFLOW.md`.

---

## Em andamento

_Nenhuma no momento._

## Aguardando validação DEV1

_Nenhuma no momento._

## Validadas em DEV1

_Nenhuma no momento._

## Prontas

_Nenhuma no momento._

## Backlog

_Nenhuma no momento._

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
-->
