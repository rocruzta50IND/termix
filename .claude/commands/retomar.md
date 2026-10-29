---
description: Retoma o trabalho do Termix depois de um /clear, lendo o contexto do repositório
---

Retome o trabalho deste projeto a partir do que está gravado no repositório. Não dependa de memória da conversa anterior: ela foi apagada.

1. Leia, nesta ordem: `CLAUDE.md`, `WORKFLOW.md`, `docs/TASKS.md` (seções *Em andamento*, *Aguardando validação DEV1*, *Validadas em DEV1* e *Prontas*) e a entrada mais recente de `docs/CHANGELOG_DEV.md`.
2. Se a tarefa mexer no comportamento do produto, leia `docs/DECISOES.md`. Se mexer na aparência, leia `docs/DESIGN.md`.
3. Confira o estado do git: `git status -sb` e `git log --oneline -5`. Não consulte a `dev2` (trava de contexto do fluxo).
4. Responda ao usuário, em português e em poucas linhas:
   - **Onde paramos:** a tarefa em andamento (ou a última concluída) e o que já foi feito.
   - **Pendente de você:** o que depende de aprovação ou de teste do usuário.
   - **Próximo passo:** o que eu faria agora, citando o ID da tarefa.
5. Não comece a desenvolver até o usuário confirmar o próximo passo, a menos que a tarefa em andamento já diga claramente o que fazer e ele peça para seguir.
