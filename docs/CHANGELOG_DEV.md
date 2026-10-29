# CHANGELOG_DEV — Termix

Histórico legível do que foi desenvolvido, alterado ou corrigido. Uma entrada por tarefa, mais recente no topo, com data e papel.

> **BASELINE — 2026-10-29.** O código existente antes da adoção do fluxo é considerado baseline. O changelog detalhado começa nesta data.

---

## 2026-10-29

**TASK-015 — Botão de reiniciar discreto e barras de rolagem finas** (DEV1)

- Reiniciar/Retomar virou só um ícone; barras de rolagem finas e recuadas das bordas, inclusive a do terminal. Aguarda conferência do usuário.

**TASK-014 — Novo ícone do Termix** (DEV1)

- Marca simplificada no cabeçalho, ícone detalhado em tema escuro (borda azul luminosa, abas coloridas, `>_` com brilho) e versão de traço grosso para 16/32 px; `.ico` regenerado para a barra de tarefas.
- Em andamento, aguardando o usuário conferir na barra de tarefas.

**TASK-002 — Corrigir retomada de aba que nunca recebeu mensagem** (DEV1)

- O app confere se o histórico da conversa existe antes de usar `--resume`; sem histórico, abre a mesma conversa com `--session-id`. Aguarda teste do usuário.

**TASK-000 — Adotar o fluxo DEV2 → DEV1 → MAIN** (DEV1)

- Fluxo adotado via plugin `fluxo` v1: branches `main`/`dev1`/`dev2`, `WORKFLOW.md`, `docs/TASKS.md`, `docs/CHANGELOG_DEV.md` e `.claude/fluxo.json`.
