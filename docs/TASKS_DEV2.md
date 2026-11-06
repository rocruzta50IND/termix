# TASKS_DEV2 — Termix (frente da dev2)

Tarefas da **dev2**, separadas das do DEV1. Decisão do Ygor (2026-11-06):

- Numeração própria: **DEV2-001, DEV2-002...** A sequência TASK-xxx é do DEV1 e não é usada aqui.
- A dev2 trabalha só nas frentes **Vibe Coding** e **Mutirão** (desenho em `docs/VIBE_MUTIRAO.md`).
- Estas tarefas não vão para `docs/TASKS.md` nem para `docs/CHANGELOG_DEV.md`; o histórico fica em `docs/CHANGELOG_DEV2.md`.
- O DEV1 não é notificado até o MVP do Vibe/Mutirão; `docs/HANDOFF_DEV2.md` fica como "EXPERIMENTO (não entregar)".

---

## DEV2-001 — Estrutura isolada do módulo Vibe Coding e Mutirão

- **Status:** CONCLUÍDA NA DEV2 (aguardando revisão do Ygor)
- **Data:** 2026-11-06
- **Pedido:** casca de um módulo separado do Termix com dois botões (Vibe Coding e Mutirão) que abrem telas próprias, ainda sem comportamento; o botão só chama a função, sem quebrar nada (pedido do Rodrigo).
- **Feito:**
  - Módulo do processo principal em `src/vibe/index.js` (fábrica no padrão do `chat.js`/`consumo.js`; devolve `{ vibe: 'idle', mutirao: 'idle' }`).
  - Ligações no núcleo: `main.js` +3 linhas (require e canal `vibe:status` com try/catch), `preload.js` +1 (`vibeStatus`), `index.html` +2 (CSS e script), `app.js` 0.
  - Interface em `src/renderer/vibe/vibe.js` e `vibe.css`: chave "Vibe Coding e Mutirão (experimental)" numa seção "Experimental" no fim de Configurações (desligada por padrão; grava `settings.vibe.on`); ligada, dois botões em pílula no cabeçalho, à esquerda do sino; cada um abre um modal do app com título, uma linha explicando a função e "Em construção".
  - `docs/VIBE_MUTIRAO.md` com o desenho aprovado, arquitetura, roteiro DEV2-002..006 e perguntas em aberto.
  - Os dois arquivos novos entraram no `npm run check`.
- **Decisões:** o `vibe.js` não altera o `app.js`: usa o que ele já expõe no escopo global (`S`, `save`, `modal`, `esc`) e repõe os botões quando o `app.js` redesenha o cabeçalho (MutationObserver no `#topbar`); a chave é anexada à página Configurações do mesmo jeito (observador no `#page`).
- **Arquivos tocados:** `src/vibe/index.js` (novo), `src/renderer/vibe/vibe.js` (novo), `src/renderer/vibe/vibe.css` (novo), `src/main.js`, `src/preload.js`, `src/renderer/index.html`, `package.json` (script check), `docs/VIBE_MUTIRAO.md`, `docs/TASKS_DEV2.md`, `docs/CHANGELOG_DEV2.md`, `docs/DECISOES.md`, `docs/HANDOFF_DEV2.md`.
- **Como validar:** `npm run check`. `npm start`: sem botões novos no cabeçalho. Configurações > Experimental > "Sim": aparecem "Vibe Coding" e "Mutirão" ao lado do sino; cada um abre a tela "Em construção" (fecha pelo X, Esc ou Fechar). "Não": somem.
- **Validação feita:** `npm run check` passou. Teste visual por CDP numa instância isolada (`--user-data-dir` na pasta temporária, sem tocar no `%APPDATA%\Termix`): desligado sem botões; ligado com 2 botões; os dois modais abrem; os botões voltam depois de um redesenho forçado do cabeçalho; desligar remove os botões. Capturas fora do repositório em `C:\Users\CRUUUU~1\AppData\Local\Temp\claude\c5001e4e31f92b1a\c7827fbc-286a-4c32-bf6f-40166b3f1a12\scratchpad\shots`.
- **Pendências:** nenhuma desta tarefa.
- **Próximo passo:** DEV2-002 — tela de entrega do Vibe Coding (formulário engessado) e .md modelo para baixar.
