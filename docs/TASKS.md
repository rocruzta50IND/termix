# TASKS — Termix

Controle de tarefas do projeto. Ao receber um pedido, o Claude localiza a tarefa aqui (ou cria uma nova entrada) antes de desenvolver.

Formato do ID: `TASK-XXX` — numeração sequencial, sem reuso, livre em todas as branches. Status e responsabilidades em `WORKFLOW.md`.

---

## Em andamento

### TASK-014 — Novo ícone do Termix (cabeçalho, janela e barra de tarefas)

- **Responsável:** DEV1
- **Status:** EM ANDAMENTO
- **Prioridade:** Média
- **Objetivo:** ícone coerente que lembre um gerenciador de terminais, legível em todos os tamanhos e igual no cabeçalho do app, na janela e na barra de tarefas.
- **Feito até agora:** marca simplificada do cabeçalho (`assets/logo-mark.svg`); ícone detalhado do app (`assets/icon.svg`: fundo escuro com borda azul luminosa, barra com três abas coloridas e `>_` claro com brilho); versão de traço grosso para 16 e 32 px (`assets/icon-small.svg`); `tools/make-icon.js` gera `icon.png` e `icon.ico` usando cada versão no tamanho certo.
- **Decisões:** duas artes (detalhada e pequena) porque os detalhes finos somem abaixo de 48 px. Gradiente do prompt em `userSpaceOnUse`, porque um gradiente por caixa de contorno não pinta o traço horizontal do `_`.
- **Arquivos tocados:** `assets/icon.svg`, `assets/icon-small.svg`, `assets/logo-mark.svg`, `assets/icon.png`, `assets/icon.ico`, `tools/make-icon.js`, `src/renderer/app.js`, `src/renderer/styles.css`.
- **Como validar:** abrir o Termix e conferir o ícone no cabeçalho, na barra de tarefas e no Alt+Tab.
- **Pendências:** aguardando o usuário olhar o ícone na barra de tarefas.
- **Próximo passo:** ajustes de cor ou forma que o usuário pedir; depois, texto "Termix" do cabeçalho mais leve (opcional).

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
