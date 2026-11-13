<!-- fluxo:v1 — escrito pelo DEV2, lido pelo DEV1. É a ÚNICA parte da dev2 que o DEV1 vê antes de o usuário aprovar a entrega. -->
# HANDOFF DEV2 → DEV1

Resumo da entrega da dev2 para o DEV1. O DEV2 reescreve este arquivo a cada entrega e o inclui no commit/push da dev2.

**Regras de escrita:** alto nível, sem código, diffs ou trechos de arquivos. Podem aparecer nomes de arquivo, funções públicas e formatos de dados. O DEV1 só tem acesso a este resumo até o usuário aprovar; se a entrega for reprovada, ele não deve ficar com o conteúdo da dev2 no contexto.

- **Status:** AGUARDANDO DECISÃO  <!-- AGUARDANDO DECISÃO | APROVADA | REPROVADA | EXPERIMENTO (não entregar) -->
- **Tarefa:** DEV2-028 — corrigir os 3 itens QUEBRADOS do módulo Vibe na auditoria de 2026-11-13 (pedido do orquestrador, autorizado pelo Ygor)
- **Base:** dev2 = origin/dev1 em `bfa7e96` (0.7.2, TASK-140). Zero commits atrás da dev1.
- **Data:** 2026-11-13
- **Entregas anteriores:** DEV2-001 a DEV2-027 já foram aprovadas e integradas na dev1 (TASK-135).

---

## 1. O que mudou

1. **Pop-up "Retomar projeto"** (P1 da auditoria: sumia quando as Novidades abriam por cima e a vigia travava a sessão inteira).
   - **Espera as Novidades.** O pop-up só abre depois que o modal das Novidades da versão (ou qualquer outro pop-up) fecha.
   - **Não trava mais.** Se outro pop-up passar por cima dele, o pop-up é tratado como "não respondido". A vigia segue e o oferece de novo quando o outro fecha. Se a abertura do app falhar e o sinal das Novidades não chegar, a vigia segue sozinha depois de 30 s.
   - **1ª abertura do dia** de cada projeto (data local), no lugar de "1 vez a cada início do Termix". No mesmo dia, reabrir o app ou trocar de projeto não o abre de novo. O dia de cada projeto fica na pasta de dados do módulo (`<userData>\retomar\popup-dias.json`); o `state.json` do núcleo não muda. Responder com qualquer botão, com Esc ou com o X conta como "visto hoje". Entrar com um projeto pelo "Usar pasta existente" também conta.
   - **Modo chat também.** Os botões são os mesmos. O pop-up pula só projeto interno e projeto sem pasta (e, como antes, projeto sem nada a retomar). A regra 5.6 mudou em `docs/ORGANIZADOR.md` e `docs/DECISOES.md`.
2. **Organizador com várias pastas + "Organizar com IA"** (P1: criava só o projeto extra "Organizador · <nome>" e parava).
   - Não cria mais o projeto extra nem uma aba "Organizador". O Termix monta o dossiê das pastas (sem IA) e segue **o mesmo caminho do "Carregar"**: o projeto real (pasta principal) fica com **Orquestrador + Dev**.
   - O orquestrador recebe o pedido curto de retomada (roda `/retomar` se existir; senão lê o guia, as tarefas, o estado/handoff e um `git log` curto). Se faltar a estrutura, recebe o pedido de criá-la. O dossiê vai **dentro** do pedido (até 24 KB), então o orquestrador não lê nada fora da pasta.
   - No fim, o orquestrador **apresenta ao usuário** o resumo do projeto, as tarefas identificadas e o próximo passo. Isso vale também quando o projeto entra pelo "Novo projeto" ou pelo "Usar pasta existente" (o texto dos dois pedidos agora termina com essa apresentação).
3. **Regex da data do commit** (P2): a regex sem barras invertidas estava em dois lugares, `src/vibe/retomar.js` (`pastaPrincipal`) e `src/renderer/vibe/organizador.js` (`linhas`, a pasta principal marcada no mapa). Os dois foram corrigidos. A pasta principal agora é escolhida pela data do último commit (a do papel Dev continua tendo prioridade). Uma busca por regex sem barras no módulo e nos testes achou só mais uma, numa mensagem de diagnóstico do `run26` (também corrigida). **Causa provável:** edição por shell que engole as barras invertidas. Nesta tarefa o mesmo efeito aconteceu com um script de edição e foi pego na checagem de sintaxe.
4. **Testes.** O `run26` cobre os casos novos. O `ret26` cobre a data do commit, o dia do pop-up e o dossiê. A espera da T5 no `run15` subiu de 120 s para 240 s (detalhe na seção 3). O README dos testes ficou com os números novos (embed-delegar27 = 16).

## 2. Mudança mínima no `app.js` (núcleo)

**Uma linha**, no fim da abertura do app: a chamada que mostra as Novidades da versão agora guarda a promessa em `window.__termixNovidades`. O módulo espera essa promessa antes de abrir o pop-up. O comportamento das Novidades não muda. Sem o módulo, a linha não tem efeito. Nenhum outro arquivo do núcleo foi tocado: sem CSS, sem cores, sem tema e sem tela do núcleo.

Arquivos do módulo: `src/vibe/retomar.js`, `src/renderer/vibe/retomar.js`, `src/renderer/vibe/organizador.js`. Testes em `tools/vibe-testes/`: `run26.js`, `ret26.js`, `run15.js`, `rodar-sem-electron.js`, `README.md`. Docs: `docs/ORGANIZADOR.md`, o trecho da DEV2-026 em `docs/DECISOES.md`, `docs/TASKS_DEV2.md`, `docs/CHANGELOG_DEV2.md` e este arquivo.

## 3. Como testar em 5 minutos

Sempre numa instância isolada, nunca com `%APPDATA%\Termix`. Use `--user-data-dir` próprio, o agente falso e `TEMP`/`TMP` sem espaço.

1. `npm run check` e `npm run test:vibe`: os 13 testes devem dar "Todos como esperado" (ret26 = 46).
2. `node tools/vibe-testes/rodar-electron.js run26` deve dar **67 OK** (~2 min). Ele cobre:
   - modo chat com o pop-up e os mesmos botões;
   - outro pop-up por cima: o dia não é marcado e o pop-up volta;
   - mesmo dia sem pop-up, dia novo com pop-up;
   - Organizador com 2 pastas e "Organizar com IA": a pasta principal é a do commit mais novo, termina com Orquestrador + Dev, sem projeto extra, com o dossiê no pedido e a outra pasta intacta;
   - 2ª instância aberta como "depois de atualizar": as Novidades aparecem, o pop-up espera, abre ao fechar as Novidades e, reabrindo no mesmo dia, nada aparece.
3. À mão (opcional): abrir uma instância de teste com `lastSeenVersion` antigo no `state.json` e um projeto com estrutura. As Novidades aparecem primeiro; depois de "Entendi", vem o "Retomar projeto". Fechar e abrir de novo: nada aparece.
4. Os outros testes com Electron afetados: `run15` 29, `run24` 26 e `run23` 52 OK.

## 4. Achados para o DEV1 (não corrigidos pela dev2)

Achados da auditoria de 2026-11-13 que são do núcleo. A dev2 não mexeu neles, pela regra de escopo.

- `src/renderer/app.js` ~1717: em Configurações, o cartão "Pulsar/Botão Clear" não fecha e engloba Notificações, Conectores e Projetos arquivados.
- `src/renderer/app.js`:1012: a tela vazia ainda mostra "+ Chat / + Workflow / Importar pasta existente", contra a TASK-132.
- `src/renderer/app.js`:2225 e :2271: "Restaurar" (notificações) e "Restaurar o padrão do Termix" (resumo do Clear) apagam a personalização sem pedir confirmação.
- `src/main.js`:406 e :446: `session:exists` e `scanSessions` usam `~\.claude` e ignoram `CLAUDE_CONFIG_DIR`, então quem usa outra pasta de config perde o `--resume` e a importação.
- `src/renderer/embed.css`:29 e `src/renderer/styles.css`:11: no `--embed` com tema claro, o Termix só troca as cores de texto. Sem a paleta injetada pelo Hub, abas, terminal, rodapé e diálogos ficam escuros.
- Renderer: 601 cores fixas fora de `var(--...)` (styles.css 367, vibe.css 72, app.js 55, embed.css 47). Um tema novo precisa de sobrescritas uma a uma.
- `src/main.js`:52-55 (risco, achado da auditoria): a migração Vitra roda em qualquer `--user-data-dir` novo. Se existir `%APPDATA%\Vitra`, uma instância de teste copiaria os dados reais.

## 5. O que ficou de fora

- Nada de IA real: o pedido com o dossiê e a apresentação final foram conferidos com o agente falso (texto do pedido e abas). A resposta de um orquestrador real fica para a validação manual.
- O **Delegar** continua estacionado (`DELEGAR_ATIVO = false`).
- `orgLerOrganizacao` e a tela "Organização" continuam no módulo (gancho de teste), mas o "Organizar com IA" não as usa mais.
- Se a vigia estiver ocupada com um "Inicializar" longo (até a aba do orquestrador abrir), os outros projetos esperam a vez. Era assim antes e não trava a sessão.

## Decisão do DEV1 / usuário

*(preenchido pelo DEV1 / usuário)*
