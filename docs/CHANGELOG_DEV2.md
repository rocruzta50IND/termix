# CHANGELOG_DEV2 — Termix (frente da dev2)

Histórico da dev2 (tarefas DEV2-xxx, frentes Vibe Coding e Mutirão). Mais recente no topo. As tarefas do DEV1 ficam em `docs/CHANGELOG_DEV.md`.

---

## 2026-11-06

**DEV2-001 — Estrutura isolada do módulo Vibe Coding e Mutirão** (DEV2)

- Módulo novo em `src/vibe/` (processo principal) e `src/renderer/vibe/` (interface). O núcleo só ganhou ligações: `main.js` +3 linhas, `preload.js` +1, `index.html` +2, `app.js` nenhuma.
- Chave "Vibe Coding e Mutirão (experimental)" em Configurações, desligada por padrão. Ligada, os botões "Vibe Coding" e "Mutirão" aparecem no cabeçalho e abrem telas "Em construção". Sem comportamento real.
- Desenho e roteiro em `docs/VIBE_MUTIRAO.md`.
