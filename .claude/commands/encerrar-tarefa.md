---
description: Fecha a tarefa atual (registro, validação, commit e push na dev1) e diz quando é seguro dar /clear
argument-hint: [TASK-XXX]
---

Feche a tarefa indicada em `$ARGUMENTS` (se vazio, a única tarefa de *Em andamento*; se houver mais de uma, pergunte qual) seguindo o fluxo do projeto. O objetivo é que, depois do `/clear`, a próxima sessão continue exatamente de onde esta parou.

1. **Aprovação.** Só feche se o usuário aprovou o resultado explicitamente nesta conversa. Se ainda não aprovou, resuma o que foi feito e como testar, peça a aprovação e pare aqui.
2. **Validação.** Rode os comandos de `validacao` em `.claude/fluxo.json` (hoje `npm run check`). Se falharem, corrija antes de continuar.
3. **Registro na tarefa** (`docs/TASKS.md`): preencha *Feito até agora*, *Decisões*, *Arquivos tocados*, *Como validar*, *Pendências* e *Próximo passo*; mude o status para VALIDADA EM DEV1, acrescente "Validada em: AAAA-MM-DD" e mova a tarefa para a seção *Validadas em DEV1*.
4. **Changelog** (`docs/CHANGELOG_DEV.md`): uma entrada com a data de hoje, no topo.
5. **O que surgiu fora do escopo** vira tarefa nova no *Backlog* (próximo número livre), com objetivo e prioridade. Se uma decisão de produto ou de design mudou, atualize `docs/DECISOES.md` ou `docs/DESIGN.md`.
6. **Commit e push:** `git add` dos arquivos da tarefa, commit `TASK-XXX: descrição curta no imperativo` na `dev1` e `git push origin dev1`. Revise `git status`/`git diff` antes. Nunca promova para a `main` (isso é só com `/fluxo:promover` e pedido explícito do usuário) e não consulte a `dev2`.
7. **Resposta final**, curta: ID e título da tarefa, hash do commit, o que ficou pendente e a sugestão da próxima tarefa. Termine dizendo claramente: **"Pode dar /clear."** Não peça o `/clear` antes de o commit e o push terem dado certo.
