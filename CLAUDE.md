# Termix

Aplicativo desktop (Electron, Windows 11) de uso pessoal para gerenciar vários terminais de agentes de programação (Claude Code primeiro; Codex e outros depois) numa janela única em glassmorphism. Projetos, abas de terminal, retomada de conversas pelo ID, limites de uso (5h/7d) vindos da status line do Claude Code.

- Rodar: `npm start` · Validar: `npm run check` (checagem de sintaxe dos arquivos JS)
- Estrutura: `src/main.js` (processo principal: janela, PTYs, estado), `src/preload.js` (ponte), `src/renderer/` (interface: `index.html`, `app.js`, `styles.css`), `src/statusline-wrapper.js` (captura os limites), `tools/make-icon.js` (gera o ícone)
- O app se chamava Vitra; os dados salvos são migrados da pasta `%APPDATA%\Vitra` para `%APPDATA%\Termix`.
- Não edite arquivos UTF-8 do código com `Get-Content`/`Set-Content` do PowerShell (corrompe acentos); use a ferramenta de edição ou Node.
- Testes visuais: abra o Electron com `--remote-debugging-port` e capture só o conteúdo do app (CDP). Não capture a tela inteira.

<!-- fluxo:inicio — seção mantida pelo plugin fluxo; atualize com /fluxo:init -->
## Fluxo de desenvolvimento (DEV2 → DEV1 → MAIN)

Este projeto segue o fluxo da Rocruzta, definido em `WORKFLOW.md`. Estas regras têm prioridade sobre o comportamento padrão.

- **Antes de qualquer tarefa**, leia `CLAUDE.local.md` (papel desta máquina: DEV1, DEV2 ou GERENTE). Se não existir, pare e peça ao usuário para rodar `/fluxo:papel`.
- Siga o **passo a passo de uma tarefa** do `WORKFLOW.md` mesmo quando o usuário pedir só a mudança: registrar a tarefa em `docs/TASKS.md`, validar, documentar em `docs/CHANGELOG_DEV.md`, commit `TASK-XXX: ...` e push somente para a branch do papel.
- Antes de cada tarefa: DEV2 confere se a `dev1` tem atualizações a sincronizar (havendo, avise e pergunte antes de seguir). **DEV1 não consulta a dev2 por conta própria.**
- **Trava de contexto (DEV1):** não consulte a dev2 (commits, contagem, resumo, branches, código) sem pedido explícito do usuário; o guardrail bloqueia. Com a consulta liberada pelo usuário, leia apenas `docs/HANDOFF_DEV2.md` até ele aprovar a entrega; não leia diff, log, código nem `TASKS.md` da dev2, e não proponha mudanças com base numa entrega reprovada. **DEV2:** reescreva `docs/HANDOFF_DEV2.md` a cada entrega ou experimento.
- GERENTE é somente leitura.
- Validação do projeto: comandos em `.claude/fluxo.json` (`validacao`).
- Comandos do plugin: `/fluxo:papel`, `/fluxo:status`, `/fluxo:integrar`, `/fluxo:promover`, `/fluxo:sincronizar`.
<!-- fluxo:fim -->

## Continuidade entre sessões (/clear)

O usuário só dá `/clear` quando uma tarefa termina e ele aprova. Por isso o estado do trabalho vive em `docs/TASKS.md` e `docs/CHANGELOG_DEV.md`, nunca só na conversa.

- **Ao iniciar uma sessão:** leia este arquivo, `WORKFLOW.md`, `docs/TASKS.md` (seções *Em andamento* e *Prontas*) e a última entrada de `docs/CHANGELOG_DEV.md`. Continue do "Próximo passo" da tarefa em andamento, sem pedir ao usuário para repetir o contexto.
- **Durante a tarefa:** ao concluir cada etapa relevante, atualize na própria tarefa os campos *Feito até agora*, *Decisões*, *Arquivos tocados*, *Como validar*, *Pendências* e *Próximo passo*.
- **Ao terminar:** avise que concluiu, resuma e espere a aprovação do usuário. Com a aprovação, registre o fechamento completo na tarefa e no CHANGELOG, faça o commit e só então diga que ele pode dar `/clear`. Não peça `/clear` antes disso.
- **Fora de escopo:** o que surgir e não fizer parte da tarefa vira uma tarefa no *Backlog*; não fica só na conversa.
