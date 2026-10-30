# CHANGELOG_DEV — Termix

Histórico legível do que foi desenvolvido, alterado ou corrigido. Uma entrada por tarefa, mais recente no topo, com data e papel.

> **BASELINE — 2026-10-29.** O código existente antes da adoção do fluxo é considerado baseline. O changelog detalhado começa nesta data.

---

## 2026-10-30

**TASK-021 — Rail de informações do terminal** (DEV1)

- Cápsula vertical de anéis dentro do terminal, junto à borda direita, com contexto, 5h, 7d e cache do prompt (detalhe ao passar o mouse), menu de configuração próprio (mostrar, reservar espaço, esmaecer, etiqueta de modelo/branch/permissões; padrões: espaço desligado e esmaecer ligado) e dados vindos do encaminhador da status line (`prompt_cache`, pasta, últimos limites conhecidos) e do `git branch`. A cápsula 5h/7d do cabeçalho sai com o rail ligado. O plugin da status line foi retirado do terminal (e do `~/.claude/settings.json`, com backup). Atualização do rail sem recriar elementos, para o tooltip não piscar. Decisões em `docs/DECISOES.md`, visual em `docs/DESIGN.md`. VALIDADA EM DEV1: o usuário testou e aprovou.
- Registrada também a TASK-022 (alternador Terminais/Web com navegador embutido, só para visualizar), próxima da fila; demos em `docs/prototipos/`.


## 2026-10-29

**TASK-010 — Instalador e portabilidade** (DEV1)

- Instalador NSIS por usuário (`npm run dist`) com atalhos no menu Iniciar e na área de trabalho. O app funciona sem Node.js (os scripts de hooks/status line rodam pelo próprio Termix), acha o Claude Code em pastas conhecidas além do PATH, abre uma janela só e guarda backup do `state.json`. Testado instalando de verdade e abrindo o app instalado. VALIDADA EM DEV1 em 2026-10-30: o usuário aceitou o estado atual; o teste em Windows limpo ficou registrado como TASK-020 (backlog).

**TASK-005 — Controles da janela e menus das abas** (DEV1)

- Testados por cliques reais, sem defeitos e sem mudança de código: minimizar, maximizar/restaurar, arrastar o cabeçalho, fechar (com a confirmação de sessões ativas) e, no menu da aba, duplicar, exportar texto, fechar à direita e fechar outras. VALIDADA EM DEV1: o usuário aprovou.

**TASK-012 — ID da sessão após o /clear** (DEV1)

- Verificado nos históricos do Claude Code: `/clear` cria conversa nova com outro ID; compactação e resume mantêm o ID. O hook agora grava o `session_id` e o app atualiza o ID da aba quando ele muda, então o Retomar volta na conversa posterior ao `/clear`. VALIDADA EM DEV1: o usuário testou e aprovou.

**TASK-018 — Animação de abertura** (DEV1)

- Tela de abertura com a logo pulsando cobre o carregamento e some em fade quando os terminais terminam de reabrir (mínimo ~0,9 s, teto de 8 s; respeita "reduzir movimento"). Documentada em `docs/DECISOES.md` e `docs/DESIGN.md`. VALIDADA EM DEV1: o usuário testou e aprovou.

**TASK-004 — Notificações reais** (DEV1)

- Avisos de "terminou", "precisa de você" e erro vão para o painel (com botão "Abrir"), ganham selo colorido na aba e destaque no projeto, e com o app sem foco viram notificação do Windows (clique abre a aba) e piscam o ícone na barra de tarefas. VALIDADA EM DEV1: o usuário testou e aprovou.

**TASK-002 — Retomada de aba que nunca recebeu mensagem** (DEV1)

- VALIDADA EM DEV1: o usuário testou e aprovou (sem o erro "No conversation found" ao reabrir uma aba vazia).

**TASK-003 — Estado das abas pelos hooks do Claude Code** (DEV1)

- Trabalhando/aguardando agora vem dos hooks (SessionStart, UserPromptSubmit, PostToolUse, Notification, Stop), com a heurística de 2,5 s só como reserva. VALIDADA EM DEV1: o usuário testou e aprovou.

**TASK-019 — Restaurar sozinho os terminais abertos ao reabrir** (DEV1)

- Ao abrir, as abas que estavam abertas voltam sozinhas, uma de cada vez (a ativa primeiro), retomando a conversa. O aviso "N sessões estavam ativas" foi removido. Decisão atualizada em `docs/DECISOES.md`. VALIDADA EM DEV1: o usuário testou e aprovou.

**TASK-017 — Continuidade entre sessões** (DEV1)

- Comandos `/retomar` e `/encerrar-tarefa`, `docs/DECISOES.md` e `docs/DESIGN.md`; `CLAUDE.md` aponta para eles. VALIDADA EM DEV1: o usuário revisou as 18 decisões do `DECISOES.md` e aprovou. O primeiro teste real dos comandos é o `/retomar` após o primeiro `/clear`.

**Validação** (DEV1): o usuário aprovou o layout; TASK-014, TASK-015 e TASK-016 passam para VALIDADA EM DEV1 (promoção para a main só quando o usuário pedir). O backlog da TASK-003 à TASK-013 foi restaurado em docs/TASKS.md (a migração inicial não tinha sido gravada).

**TASK-016 — Tela "nenhum terminal aberto" com as abas fechadas** (DEV1)

- Mostra a conversa mais recente em destaque ("há X"), as outras abas fechadas do projeto e um resumo das abas vazias. Aguarda teste do usuário.

**TASK-015 — Botão de reiniciar discreto e barras de rolagem finas** (DEV1)

- Reiniciar/Retomar virou só um ícone; barras de rolagem finas e recuadas das bordas, inclusive a do terminal. Aguarda conferência do usuário.

**TASK-014 — Novo ícone do Termix** (DEV1)

- Marca simplificada no cabeçalho, ícone detalhado em tema escuro (borda azul luminosa, abas coloridas, `>_` com brilho) e versão de traço grosso para 16/32 px; `.ico` regenerado para a barra de tarefas.
- Em andamento, aguardando o usuário conferir na barra de tarefas.

**TASK-002 — Corrigir retomada de aba que nunca recebeu mensagem** (DEV1)

- O app confere se o histórico da conversa existe antes de usar `--resume`; sem histórico, abre a mesma conversa com `--session-id`. Aguarda teste do usuário.

**TASK-000 — Adotar o fluxo DEV2 → DEV1 → MAIN** (DEV1)

- Fluxo adotado via plugin `fluxo` v1: branches `main`/`dev1`/`dev2`, `WORKFLOW.md`, `docs/TASKS.md`, `docs/CHANGELOG_DEV.md` e `.claude/fluxo.json`.
