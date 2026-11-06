# CHANGELOG_DEV2 — Termix (frente da dev2)

Histórico da dev2 (tarefas DEV2-xxx, frentes Vibe Coding e Mutirão). Mais recente no topo. As tarefas do DEV1 ficam em `docs/CHANGELOG_DEV.md`.

---

## 2026-11-06

**DEV2-003 — Vibe Coding cria orquestrador e dev, gera plano e perguntas** (DEV2)

- "Iniciar Vibe Coding" cria no projeto as abas "Vibe · Orquestrador" e "Vibe · Dev" (o Dev fica parado). O Termix pede o plano com um pedido curto que aponta para a entrega, percebe o fim do turno pelo hook Stop (zero token) e lê `plano.md` e `perguntas.json`.
- Painel de andamento (Preparando plano → Perguntas (N) → Plano pronto), formulário de perguntas com notificação, respostas em `respostas.json`, plano visível, "Parar" e "Retomar", estado em `estado.json` (reabrir o app não recomeça nada) e dicas de economia de tokens.
- Conferências do Termix: contagem de tarefas pelos IDs T1, T2…, alerta de commit/push na main/master no plano e aviso se o orquestrador não abrir em 30 s.
- Corrigido o recuo da lista de seções que faltam (DEV2-002).
- Núcleo: nenhuma linha. Decisões novas do Ygor e roteiro renumerado (até DEV2-007) em `docs/VIBE_MUTIRAO.md`.
- Testado com uma rodada real numa instância isolada; o orquestrador escreveu "Commit em master" no plano apesar da regra, por isso a trava em código fica para a DEV2-004.

**DEV2-002 — Tela de entrega do Vibe Coding com modelo .md** (DEV2)

- O botão "Vibe Coding" abre a tela de entrega engessada: projeto, objetivo final, fluxo desenhado, estrutura .md com as 9 seções do modelo, critério de pronto, o que os agentes não podem fazer (opcional) e acessos a fornecer (ou "Nada a fornecer").
- A tela mostra sempre o que falta. "Iniciar Vibe Coding" só habilita com tudo completo e apenas grava a entrega (os agentes chegam na DEV2-003).
- "Baixar modelo (.md)" com o passo a passo da melhor entrega, para sócios não técnicos.
- Rascunho salvo a cada mudança. Entrega em `%APPDATA%\Termix\vibe\<id-do-projeto>\`; substituir pede confirmação e guarda a anterior no histórico.
- Núcleo: `main.js` 3 linhas viraram 2, `preload.js` 1 linha trocada, `index.html` e `app.js` nada. Os canais `vibe:*` ficam no módulo.
- Validado de ponta a ponta por CDP numa instância isolada (passos a a h).

**DEV2-001 — Estrutura isolada do módulo Vibe Coding e Mutirão** (DEV2)

- Módulo novo em `src/vibe/` (processo principal) e `src/renderer/vibe/` (interface). O núcleo só ganhou ligações: `main.js` +3 linhas, `preload.js` +1, `index.html` +2, `app.js` nenhuma.
- Chave "Vibe Coding e Mutirão (experimental)" em Configurações, desligada por padrão. Ligada, os botões "Vibe Coding" e "Mutirão" aparecem no cabeçalho e abrem telas "Em construção". Sem comportamento real.
- Desenho e roteiro em `docs/VIBE_MUTIRAO.md`.
