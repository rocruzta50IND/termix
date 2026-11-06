# CHANGELOG_DEV2 — Termix (frente da dev2)

Histórico da dev2 (tarefas DEV2-xxx, frentes Vibe Coding e Mutirão). Mais recente no topo. As tarefas do DEV1 ficam em `docs/CHANGELOG_DEV.md`.

---

## 2026-11-06

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
