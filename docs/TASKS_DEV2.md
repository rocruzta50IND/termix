# TASKS_DEV2 — Termix (frente da dev2)

Tarefas da **dev2**, separadas das do DEV1. Decisão do Ygor (2026-11-06):

- Numeração própria: **DEV2-001, DEV2-002...** A sequência TASK-xxx é do DEV1 e não é usada aqui.
- A dev2 trabalha só nas frentes **Vibe Coding** e **Mutirão** (desenho em `docs/VIBE_MUTIRAO.md`).
- Estas tarefas não vão para `docs/TASKS.md` nem para `docs/CHANGELOG_DEV.md`; o histórico fica em `docs/CHANGELOG_DEV2.md`.
- O DEV1 não é notificado até o MVP do Vibe/Mutirão; `docs/HANDOFF_DEV2.md` fica como "EXPERIMENTO (não entregar)".

---

## DEV2-002 — Tela de entrega do Vibe Coding (formulário engessado e .md modelo)

- **Status:** CONCLUÍDA NA DEV2 (aguardando revisão do Ygor)
- **Data:** 2026-11-06
- **Pedido:** (orquestrador, autorizado pelo Ygor) o botão Vibe Coding deixa de abrir o "Em construção" e abre a tela de entrega engessada, com o .md modelo para baixar; validar o botão de ponta a ponta em instância isolada. Não cria agentes (fica para a DEV2-003).
- **Feito:**
  - Tela de entrega num modal largo (760 px) com os 7 itens: projeto, objetivo final (até 300 caracteres), fluxo desenhado (.png/.jpg/.svg/.pdf/.drawio/.excalidraw/.md com Mermaid), estrutura .md com as 9 seções do modelo, critério de pronto, o que os agentes NÃO podem fazer (opcional) e acessos/dados a fornecer (lista ou "Nada a fornecer").
  - Quadro "Falta para iniciar" sempre visível, em linguagem clara; a estrutura lista as seções que faltam e as que estão sem conteúdo. "Iniciar Vibe Coding" fica desabilitado até tudo estar completo; clicado, grava e mostra "Entrega pronta. Os agentes chegam na próxima etapa (DEV2-003)".
  - "Baixar modelo (.md)": salva com diálogo o `src/vibe/modelo-entrega.md` (9 seções, dicas e exemplos para sócios não técnicos, dicas de Excalidraw, draw.io e Mermaid).
  - Rascunho por projeto, salvo a cada mudança; a tela reabre no último projeto usado.
  - Entrega em `%APPDATA%\Termix\vibe\<id-do-projeto>\` (`entrega.json` com status "pronta" e a data, mais as cópias `fluxo.<ext>` e `estrutura.md`). Já existindo, a tela avisa e só substitui com confirmação; a anterior vai para `historico\<data>\` (nada é apagado).
  - Canais ipc `vibe:*` registrados pelo próprio módulo, cada um com try/catch. O processo principal reconfere tudo antes de gravar.
  - Modo de teste só com `TERMIX_VIBE_TEST=1` (aceita caminho no lugar do diálogo nativo e expõe `window.vibeTest`); sem a variável, nada é exposto.
  - Mutirão continua "Em construção". O texto da chave em Configurações foi atualizado.
- **Decisões:**
  - Modal largo em vez de página: cabe bem em 760 px com rolagem e rodapé fixo, igual às outras janelas.
  - A confirmação de substituir aparece dentro da própria tela, porque o app só tem um modal por vez.
  - Seção do .md "com conteúdo" = pelo menos 3 caracteres úteis, sem contar as dicas `> ` e os comentários. Assim o modelo baixado e não preenchido não passa.
  - Depois de gravar, "Iniciar" só volta a habilitar quando algo muda (evita uma substituição por engano).
  - Preload: a ponte `vibeStatus` virou a ponte genérica `vibe(canal, ...)` (só canais `vibe:*`), para os próximos canais não precisarem mexer no núcleo.
- **Arquivos tocados:** `src/vibe/index.js`, `src/vibe/modelo-entrega.md` (novo), `src/renderer/vibe/vibe.js`, `src/renderer/vibe/vibe.css`, `src/main.js` (3 linhas viraram 2: comentário e `create({ ipcMain, dialog, app, getWin, logError })`; o handler `vibe:status` foi para o módulo), `src/preload.js` (1 linha trocada), `docs/VIBE_MUTIRAO.md`, `docs/DECISOES.md`, `docs/TASKS_DEV2.md`, `docs/CHANGELOG_DEV2.md`, `docs/HANDOFF_DEV2.md`. `index.html` e `app.js`: nada.
- **Como validar:** `npm run check`. `npm start` > Configurações > Experimental > "Sim" > "Vibe Coding": a tela lista o que falta e "Iniciar" fica desabilitado; "Baixar modelo (.md)" salva o modelo; um .md sem seções mostra quais faltam; com tudo completo, "Iniciar" grava em `%APPDATA%\Termix\vibe\<id>\`; ao fechar e reabrir, o rascunho e o aviso da entrega existente aparecem; desligar a chave some com os botões.
- **Validação feita:** `npm run check` passou. Teste de ponta a ponta por CDP numa instância isolada (`--user-data-dir` na pasta temporária, `TERMIX_VIBE_TEST=1`, porta 9334, dois projetos de teste em pastas temporárias): a) desligado sem botões; b) ligado com 2 botões; c) tela vazia com 6 pendências e "Iniciar" desabilitado; d) modelo criado com as 9 seções (todas "sem conteúdo" no modelo cru); e) .md parcial aponta 6 seções faltando e 1 sem conteúdo; f) completo: "Iniciar" habilita e grava `entrega.json` (status "pronta"), `fluxo.md` e `estrutura.md`; g) reaberto com o rascunho e o aviso da entrega; substituir pede confirmação e guarda a anterior em `historico`; h) desligado sem botões e o app normal. Pastas dos projetos de teste continuaram vazias, o `%APPDATA%\Termix\vibe` real não foi criado e não houve erro no console. Capturas fora do repositório, em `C:\Users\CRUUUU~1\AppData\Local\Temp\claude\c5001e4e31f92b1a\3067c43d-1147-4e7b-ac53-ac1300b9ca68\scratchpad\shots`.
- **Pendências:** nenhuma desta tarefa. Ainda não foi testado com o diálogo nativo de verdade (só pelo modo de teste); vale um clique manual em "Escolher arquivo…" e "Baixar modelo (.md)" na revisão.
- **Próximo passo:** DEV2-003, criar os dois agentes (orquestrador e dev) a partir da `entrega.json` e o ciclo autônomo.

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
