# CHANGELOG_DEV — Termix

Histórico legível do que foi desenvolvido, alterado ou corrigido. Uma entrada por tarefa, mais recente no topo, com data e papel.

> **BASELINE — 2026-10-29.** O código existente antes da adoção do fluxo é considerado baseline. O changelog detalhado começa nesta data.

---

## 2026-11-02

**TASK-034 — Novo ícone do app: só o `>_` sobre degradê azul** (DEV1)

- Ícone redesenhado para a barra de tarefas, notificações do Windows e atalhos: quadrado em degradê azul (estilo Windows 11) com o prompt `>_` branco; sem abas coloridas nem janela desenhada. Versão de 16 e 32 px sem brilhos. Gerado com `tools/make-icon.js`; conferido o ícone embutido no `Termix.exe` empacotado.
- No `npm start` o Windows mostrava "Electron" (nome e átomo) porque o processo é o `electron.exe`. Em desenvolvimento o app agora cria o atalho `Termix (dev)` no menu Iniciar com ID próprio e o ícone novo; o instalado usa o atalho do instalador. Efeito visual a confirmar pelo usuário depois de reiniciar o app.

## 2026-11-01

**TASK-033 registrada (crítica) e TASK-030 — 4º ajuste: cor em degradê na aba inteira** (DEV1)

- Nova tarefa crítica: arrastar e soltar das abas não funciona direito (reproduzir e corrigir). Na TASK-030 saiu a linha colorida do topo; a cor da aba vale para a aba inteira, em degradê, e o estado "trabalhando" pulsa no ponto da aba ativa. `npm run check` passou.

## 2026-10-31

**TASK-030 — 3º ajuste: a primeira aba segue a curva do canto** (DEV1)

- A barra de abas encosta na lateral esquerda do container; a primeira aba e a linha de cor do topo seguem o canto arredondado. Pedido do usuário com captura. `npm run check` passou.

**TASK-030 — 2º ajuste: abas rentes ao container dos terminais** (DEV1)

- Removida a margem de fundo acima das abas (a barra agora toca o topo do container) e reduzida a da esquerda; faixa escura mais discreta. Valido para terminais e Web; pedido do usuário com captura. `npm run check` passou.

**TASK-030 — ajuste final das abas: fundidas ao terminal, com separação nítida** (DEV1)

- A barra de abas ficou mais escura que o terminal e a aba ativa, sem o fundo da barra atrás, só com a cor do terminal: o formato dela aparece e ela se funde ao terminal, como no Terminal do Windows; separador entre abas mais nítido; orelha esquerda corrigida nas abas que não são a primeira; vale também para a Web. Testado por CDP em instância isolada. Pedido do usuário, com capturas. `npm run check` passou.

**TASK-032 e TASK-013 — fechadas: VALIDADAS EM DEV1** (DEV1)

- Aprovadas pelo usuário em 2026-10-31. Segue em aberto o login de MCP/conector com conta real. Próxima: TASK-020 (instalador em Windows limpo).

**TASK-032 — teste geral de plugins, MCPs e skills feito** (DEV1)

- Teste completo numa pasta de usuário isolada, com a CLI real do Claude Code e o app Electron (cliques reais, 3 larguras, terminal vivo): plugins 33/33, skills 32/32, interface 68/68, mais MCPs, projeto limpo, erros (CLI ausente, sem rede, `.claude.json` ilegível, nomes inválidos) e desempenho com 752 skills. Arquivos do usuário conferidos intactos. **Dois defeitos achados e corrigidos:** (1) o login de MCP/conector nunca funcionaria (a CLI exige terminal; agora roda num PTY); (2) o cartão de MCP mostrava "Desligado" velho logo depois de ligar (agora os arquivos mandam). Relatório completo e limitações na TASK-032. Aguarda a aprovação do usuário para fechar esta e a TASK-013. `npm run check` passou.

**TASK-030 — fechada: VALIDADA EM DEV1** (DEV1)

- Aprovada pelo usuário em 2026-10-31. Próxima: TASK-032.

**TASK-030 — abas encaixadas na janela do terminal** (DEV1)

- Desenho aprovado em protótipo (`docs/prototipos/abas-encaixadas.html`) e aplicado: aba ativa fundida ao terminal (mesma cor, sem linha, orelhas curvas), linha de 2 px da cor da aba no topo (pulsa quando o agente trabalha), inativas discretas com separador fino; aba nova começa no azul do sistema. Testado por CDP em instância isolada; aguarda o teste do usuário.

**TASK-029 — fechada: VALIDADA EM DEV1** (DEV1)

- Aprovada pelo usuário em 2026-10-31 sem teste manual (confiou no teste do Claude em instância isolada). Segue em aberto o teste real do som, da notificação do Windows e do texto da dica com uma sessão real do Claude Code. `npm run check` passou. Próxima: TASK-030 (abas encaixadas), iniciada.

**TASK-029 — notificações bem encaixadas, com o cache como função principal** (DEV1)

- Selo do sino zera ao abrir e fechar o painel; terminal trabalhando não notifica; nova dica animada ao lado esquerdo do sino com o que aconteceu (última frase do agente, via hook Stop); novo aviso de cache esfriando (1 h: N min antes, padrão 10; 5 min: 1 min antes; um por resposta; some ao mandar mensagem); painel agrupado por aba com tipo, texto inteiro, excluir um/aba/tudo; Configurações > Notificações (tipos, minutos do cache, dica e tempo, som, notificação do Windows). Testado por CDP em instância isolada; aguarda o teste do usuário.

**TASK-031 — auditoria de UI/UX e desempenho feita** (DEV1)

- Roteiro automático abriu 20 telas e janelas em 3 larguras e varreu o DOM. Corrigido: duas regras de campo conflitantes (o campo minúsculo de "Novo projeto"), campo numérico, deslizante, seleções e caixas de marcar nativos, janela Adicionar MCP que estourava a altura em 980×620, alturas de controles diferentes, barra de ferramentas de Plugins/MCPs/Skills em três linhas, linhas das Configurações sem quebra em janela estreita, selo do sino cobrindo o ícone, falta de foco por teclado. Padrão único dos controles registrado em `docs/DESIGN.md`. Desempenho medido antes e depois (3 rodadas alternadas): sem regressão e sem desperdício relevante (abertura ~1,9 s, app parado ~2 % de um núcleo). Testado pelo Claude; validada em DEV1.

**TASK-031 e TASK-032 registradas; nova ordem** (DEV1)

- TASK-031 (PRONTA, Alta, próxima): auditoria de UI/UX e desempenho do app inteiro — campos fora de alinhamento, pequenos e com cara antiga (setinhas do campo numérico, campo estreito do Novo projeto), responsividade e medição de desempenho antes e depois. TASK-032 (BACKLOG, por último, antes do instalador): teste geral de plugins, MCPs e skills feito pelo Claude, que fecha a TASK-013. Ordem: 031, depois 029 e 030, depois 032, depois TASK-020 (instalador em Windows limpo) e a promoção. Sem código nesta etapa.

**TASK-013 iniciada — plugins, skills e MCPs pelo app (MVP)** (DEV1)

- **Etapa 1 (ver tudo) feita:** as telas Plugins, Skills e MCPs agora mostram o que o Claude Code enxerga no projeto, lido pela CLI (plugins com versão, escopo e custo em tokens; MCPs com o estado real, inclusive os 9 conectores da conta, que antes não apareciam) e pelos arquivos (skills e comandos de usuário, projeto e plugins). Busca, filtros por escopo e estado, "Atualizar" e atualização automática. Módulo novo `src/resources.js`. Só leitura; aguarda o teste do usuário antes da etapa 2.
- **Etapas 2 e 3 e Conectores feitas:** controle pela tela, sempre pela CLI do Claude Code: plugins (ligar/desligar aqui ou em todos, atualizar, remover, instalar com busca), MCPs (adicionar, remover, login, logout, ligar/desligar por projeto, em bloco) e skills/comandos de usuário e de projeto (criar, editar, excluir para a lixeira); aviso de reinício com botão. Única gravação direta: o campo `disabledMcpServers` do projeto no `.claude.json` (a CLI não tem esse comando), com escrita atômica e backup. Configurações > Conectores: projeto novo vem Automático (padrão) ou Limpo (plugins, MCPs e conectores desligados); medido em sessão real, o projeto limpo carrega 32 ferramentas contra 62. Dois defeitos achados nos testes e corrigidos (plugins desligados em paralelo se apagavam; cartão com estado antigo após a ação). 33 verificações ponta a ponta passaram; arquivos do usuário conferidos intactos. Aguarda a validação do usuário.
- Tarefa passou a EM ANDAMENTO, com análise e plano em 3 etapas (ver tudo; controlar plugins e MCPs; skills e conectores). Achado: a CLI do Claude Code (`claude mcp list`, `claude plugin list --json`) traz os conectores da conta e o estado real, que o app não mostrava. Toda mudança será feita pela CLI, sem gravar nos arquivos do Claude Code. Adendo: Configurações > "Conectores" para projetos novos virem com ou sem plugins, skills e MCPs automáticos (a viabilidade do "limpo" será testada antes). Sem código nesta etapa.

## 2026-10-30

**TASK-030 registrada — abas encaixadas no terminal (MVP)** (DEV1)

- Nova tarefa no Backlog (Alta, MVP): a aba ativa se funde com a janela do terminal, como no Terminal do Windows. Sem código nesta etapa.

**TASK-029 registrada — notificações no MVP** (DEV1)

- Nova tarefa no Backlog (Alta, MVP): refazer as notificações com o cache dos terminais como função principal (aviso aos 10 min), contador do sino que zera ao fechar a tela, tooltip animada ao lado do sino só para terminal que terminou, nada de terminal trabalhando e controle total (configurar e excluir). Sem código nesta etapa.

**TASK-028 etapa 2 — custo da retomada medido** (DEV1)

- Ao usar Clear com retomada, o app mede o contexto (em tokens) antes do `/clear`, a base da conversa nova e o fim da primeira resposta; mostra "A retomada custou ~X tokens" no painel de eventos e no tooltip do anel CTX.
- Botão de reiniciar o chat movido do cabeçalho para o alternador de baixo, ao lado do Clear, com ícone e texto "Reiniciar". O ⚠ de "dangerously" saiu da aba (a etiqueta "⚠ bypass" do rail já mostra).
- Estado: VALIDADA EM DEV1 (2026-10-30). Custo da retomada testado e aprovado; o botão de reiniciar no alternador foi aceito para fechar.
- Decisão de escopo: TASK-013 (plugins, skills e MCPs) entra no MVP e é o foco seguinte; TASK-010 é a última do MVP e a promoção para a `main` espera o instalador testado (TASK-010 + TASK-020).

**TASK-025 — botão Clear no alternador de baixo** (DEV1)

- Botão "Clear" ao lado de Terminais: limpa o contexto do terminal ativo. Confirmação com "Só limpar" ou "Fechar a tarefa e limpar" (registra a tarefa, manda `/clear` e pede para retomar pelos arquivos do projeto).
- Pulsa quando o CTX passa do limite configurado; limite e textos dos dois pedidos ficam em Configurações > Botão Clear (só no app).
- Registrada a TASK-026 (registro de consumo e alertas de ritmo), derivada do guia de economia de tokens.
- Ajustes pós-teste: alternador não some mais com o menu do rail; novo ícone; o /clear agora apaga também o texto antigo da tela; Ctrl+C/Ctrl+V funcionam nos terminais.
- Estado: VALIDADA EM DEV1 (2026-10-30, testada e aprovada pelo usuário).
- TASK-027 etapa 1 — retomada enxuta: nos projetos no fluxo Rocruzta o botão Clear usa pedidos de fechar e retomar que seguem o fluxo e leem só o necessário (papel/branch de CLAUDE.local.md, validação do fluxo.json, só as seções ativas do TASKS.md); opções "usar o fluxo" e "commit e push ao fechar" em Configurações; textos vazios = automático. Fluxo e plugin intactos. VALIDADA EM DEV1 (2026-10-30, testada e aprovada pelo usuário). Etapa 2 (medir o custo da retomada) e novos gatilhos viraram a TASK-028 (Backlog).

**TASK-025 registrada — ações rápidas no rail de baixo** (DEV1)

- A pedido do usuário: botões de ação ao lado de "Terminais" no alternador (primeiro exemplo: Clear no terminal ativo), dentro do MVP. Registrada com os pontos a decidir (o que "Clear" significa no Claude Code, quais ações entram). Nada implementado ainda.

**TASK-024 — Web só para testes locais, aberta a partir dos terminais** (DEV1, EM STANDBY: no teste real do usuário o Claude abriu no navegador normal e a Web mostrou só a listagem do servidor; vai para o backlog pós-MVP)

- Comando `termix-open` e `BROWSER` só nos terminais do Termix, instrução por sessão para o Claude Code usá-lo, detecção de servidores locais na saída (selo verde no botão Web e faixa de detectados) e Web restrita a endereços locais (externos abrem no navegador do sistema). A status line do `settings.json` do usuário não foi mexida. Detalhes em `docs/TASKS.md`.

**TASK-023 vai para o pós-MVP; TASK-024 registrada** (DEV1)

- A pedido do usuário: plataformas com login e grupos de atalhos ficam para depois (TASK-023, backlog). A Web fica só para testes de projetos locais, com abertura automática a partir dos terminais e aviso no ícone Web do rail (TASK-024, pronta, ainda não iniciada).

**TASK-023 registrada — atalhos e grupos de páginas no navegador do app** (DEV1)

- Etapa 1 (compatibilidade de login): user agent sem Electron/Termix e janelas de login como janela filha com o mesmo perfil, em `src/web.js`. **Login com Google é barrado** pelo Google no navegador embutido (visto pelo usuário e reproduzido em instância isolada, com e sem o ajuste dos client hints, que foi retirado). Plano: entrar nos serviços por GitHub ou e-mail; falta o teste do usuário em GitHub, Vercel e Supabase. Decisão: uso por grupo restrito; se o login falhar nos demais, a Web fica só para testes locais.
- A pedido do usuário: deixar à mão plataformas de uso constante (Vercel, GitHub, pesquisa etc.) em grupos globais e por projeto, com barra de atalhos e "salvar aba como atalho". Inclui um teste de compatibilidade de login antes de construir, porque serviços como o Google podem barrar navegadores embutidos (plano em `docs/TASKS.md`). Nada implementado ainda.

**TASK-022 — Alternador Terminais / Web com navegador embutido** (DEV1, VALIDADA EM DEV1: o usuário aprovou o rail e pediu para mantê-lo)

- Alternador em pílula (`Terminais` com selo de abas e atenção, `Web` com selo de abas) no centro da base, esmaecido quando parado; atalho Ctrl+`. Tela Web com abas de página, voltar/avançar/recarregar/parar, barra de endereço (localhost e porta viram `http://`, domínio vira `https://`, o resto vai para a busca), tamanho de dispositivo (Responsivo, Celular, Tablet) e DevTools. Web por projeto, com perfil persistente (`persist:termix-web`); a vista só é criada quando a aba é aberta. `target=_blank` abre nova aba web; só http/https; sem câmera, microfone, localização nem notificações.
- Como funciona: `src/web.js` (processo principal) cria uma `WebContentsView` por aba; o alternador é outra vista (`src/dock.html`, `dock.js`, `dock-preload.js`) logo acima, porque a vista nativa fica por cima do HTML; com menu, modal ou popover aberto a vista do navegador é trocada por uma imagem dela (`capturePage`). Interface em `src/renderer/web.js`.
- Testado numa instância isolada (CDP + captura só da janela do app): alternador por cima da página, página no retângulo certo, modal sobre a imagem, link em nova aba, tamanho Celular, restauração das abas ao reabrir sem criar vistas antes da hora.

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
