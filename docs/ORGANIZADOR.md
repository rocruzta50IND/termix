# Organizador — projeto com várias pastas (DEV2-010; no "Usar pasta existente" desde a DEV2-024)

Frente da dev2 aprovada pelo Ygor em 2026-11-07. Desde a DEV2-024 **não há chave**: a chave "Importar projeto com várias pastas (experimental)" saiu de Configurações de propósito (a dev2 não vai para a main; o Rodrigo implementa de forma nativa depois) e um `state.json` antigo com ela desligada é ignorado, sem apagar o valor. O botão separado "Importar projeto (várias pastas)" também saiu: a função passou para o **"Usar pasta existente"** das telas "Novo projeto" e "Novo mutirão".

## Problema

O Ygor costuma ter, para o mesmo projeto, uma pasta para o orquestrador e outra para o dev (ex.: `Termix` e `Termix-ORQ`). O "Importar pasta existente" aceita uma pasta só e não explica nada. Retomar conversas antigas e longas custa caro.

## Decisões do Ygor

- O padrão é **analisar, organizar e carregar certo**: abas **novas**, que ao abrir recebem um pedido curto (em arquivo) para ler o essencial e se localizar.
- **Retomar** a conversa antiga é uma **opção por pasta**. Desde a DEV2-024 (pedido do Rodrigo e do Ygor), a conversa de orquestrador e a de dev mais recentes vêm **marcadas como recomendação** ("recomendada"); o usuário troca ou desmarca.
- **Nada é movido, renomeado ou apagado** nas pastas do usuário. A análise só lê.
- Módulo separado. Sem chave desde a DEV2-024.

## Investigação: uma aba por pasta dentro de um projeto?

**Não dá sem mexer no núcleo.** O projeto guarda uma pasta só (`p.path`) e a aba não tem pasta própria: o `launch` do `app.js` abre todo terminal com `cwd: p.path`, e a retomada (`sessionExists`), a lista de conversas e os hooks também usam `p.path`. Desenho escolhido: **(b) N projetos agrupados sob um nome dentro do módulo**. Cada pasta vira um projeto do Termix (ou reaproveita o que já existe com a mesma pasta), com o nome `<Projeto> · <Papel>` (ou `<Projeto> · <pasta>` quando dois têm o mesmo papel), e o módulo guarda o grupo em `organizador\<grupo>\grupo.json` (pastas, papéis, projetos e abas).

## Onde fica

| Onde | O quê |
|---|---|
| `src/vibe/organizador.js` | Processo principal: análise, pedidos, dossiê, registro do grupo. Canais `vibe:org*`. |
| `src/vibe/index.js` | Duas linhas: cria o organizador e registra os canais (no próprio módulo). |
| `src/renderer/vibe/organizador.js` e `.css` | Interface: `window.TermixOrg` (`pick`, o diálogo com várias pastas, e `mapaDe`, a análise e o mapa) chamado pelo "Usar pasta existente" do núcleo, mapa com as recomendadas, carregar, Organizar com IA. O passo 1 (nome e pastas) ficou só para o gancho de teste. Carregados pelo `vibe.js`. (Até a DEV2-023: botão na tela Novo projeto e chave em Configurações.) |
| Núcleo (`app.js`, DEV2-024) | O `npPick` do "Usar pasta existente" usa `window.TermixOrg.pick` (sem o módulo, o seletor de uma pasta de sempre); com mais de uma pasta chama `window.TermixOrg.mapaDe` e, ao carregar, encerra a tela de origem. A nota do campo diz que dá para escolher várias. |
| Núcleo (`main.js`, `preload.js`, `index.html`) | **Nada.** Fica dentro de `src/vibe` porque é o único ponto que o núcleo já liga (o `require` no `main.js` e a ponte `vibe:*` no `preload.js`). Só o `package.json` ganhou os dois arquivos na checagem de sintaxe. |
| Dados | `%APPDATA%\Termix\organizador\<grupo>\` (`grupo.json`, `pedidos\*.md`) e `organizador\org-<projeto>\` (`dossie.md`, `pedido-organizar.md`, `organizacao.md`). |

## Fluxo

1. **Novo projeto (ou Novo mutirão) > Usar pasta existente > Escolher pasta…** (DEV2-024): o diálogo do Windows aceita várias pastas (Ctrl ou Shift). **Uma pasta:** nada muda (o projeto é criado como sempre). **Mais de uma:** o Termix analisa e abre o mapa direto, com o nome do projeto digitado na tela ou, vazio, o da primeira pasta sem o "-ORQ". Cancelar o mapa volta à tela sem pasta escolhida. (Até a DEV2-023: botão "Importar projeto (várias pastas)…" ao lado de "Criar chat" e um passo 1 com o nome e a lista de pastas.)
3. **Análise em código (zero token), por pasta:**
   - git: branch, remoto (sem usuário/token da URL), últimos 5 commits, arquivos não commitados, raiz (duas pastas no mesmo repositório = aviso);
   - `CLAUDE.local.md`: papel (DEV1..DEV5, GERENTE) e branch; "ORQ" no nome da pasta ou "orquestrador" no `CLAUDE.local.md` = Orquestrador;
   - `.claude/fluxo.json`, `CLAUDE.md`, `WORKFLOW.md`, `README.md`;
   - `TASKS*.md` (raiz, `docs\`, `.claude\`): só os títulos em andamento (dentro de uma seção "Em andamento" ou com "Status: EM ANDAMENTO" logo abaixo, como no `TASKS_DEV2.md`), até 6;
   - `HANDOFF*.md` (com o status) e arquivos de estado conhecidos (`CHECKPOINT`, `ESTADO`, `STATE`, `PROGRESS`, `RESUMO`, `CHANGELOG_DEV*`...): o mais recente vira o "último checkpoint";
   - conversas do Claude Code daquela pasta (`CLAUDE_CONFIG_DIR` ou `~\.claude\projects`): só a lista das 8 mais recentes, com data, tamanho e título ou primeiro pedido (lê 64 KB do começo e 16 KB do fim, nunca a conversa inteira).
   - Papel sugerido: Orquestrador > Gerente > Dev (DEVn) > par de um ORQ (`X` ao lado de `X-ORQ`) > Outro.
4. **Mapa** para confirmar: cada pasta com as etiquetas da análise, em andamento, último checkpoint e último commit; **papel** (Orquestrador, Dev, Gerente, Outro, editável, com o motivo da sugestão); **aba que será criada** (`<Papel> · <pasta>`, editável; trocar o papel renomeia se a aba não foi editada); **abrir** (marcado); **retomar uma conversa antiga** (com a lista das conversas; desde a DEV2-024, a conversa mais recente de **orquestrador** e a de **dev**, cada uma a mais nova entre as pastas daquele papel, vêm marcadas, com o selo "recomendada" e " · recomendada" na lista; trocar a conversa tira o selo; as outras pastas, inclusive as de papel Gerente ou Outro, seguem com a aba nova); permissão das abas novas (Normal por padrão).
   - Avisos: pasta não encontrada, sem git, mudanças não commitadas, papel não reconhecido, dois orquestradores ou gerentes, nenhum orquestrador, mesma raiz git, pasta já no Termix ("a aba nova entra nele"), conversa em uso (mexida há menos de 3 min) e conversa longa (mais de 2 MB).
   - Com algo ambíguo, uma faixa amarela no topo e o botão **Organizar com IA** destacado.
   - Dicas de economia na tela.
5. **Carregar:** para cada pasta marcada, acha ou cria o projeto e cria a aba com o papel no nome e a cor do papel. Abas novas: o Termix grava o pedido em `organizador\<grupo>\pedidos\` e, quando o Claude Code abre (hook SessionStart, até 5 min), digita **uma linha**: `Termix: siga o pedido @<arquivo> (anexado)`, repetindo o Enter até o hook do pedido enviado. Abas com "retomar" abrem a conversa escolhida (`--resume`) e não recebem pedido.
   - **Por que `@arquivo`:** o pedido fica fora da pasta da aba. Na 1ª rodada real, lido pela ferramenta Read, o Claude Code perguntou em cada aba "Allow this read outside the working directories?". Com a menção `@`, quem anexa o arquivo é o próprio Claude Code, sem perguntar (e foi mais rápido: 17 s contra 39 s). Caminho com espaço quebra a menção; nesse caso vai o caminho simples e a permissão é pedida uma vez.
   - O pedido manda ler só o essencial, na ordem: `CLAUDE.md` (o começo e as seções de fluxo), `CLAUDE.local.md`, a seção "Em andamento" de cada TASKS, o HANDOFF e a última entrada do checkpoint; só leitura, sem commit; responder em até 8 linhas (o que é a pasta, papel, tarefa, onde paramos, próximo passo) e aguardar o Ygor.
6. **Organizar com IA** (opcional): o Termix monta em código um **dossiê** (`dossie.md`, poucos KB: análise de cada pasta, o `CLAUDE.local.md` sem comentários, os títulos do `CLAUDE.md`, o começo do HANDOFF e do checkpoint) e abre a aba "Organizador" num projeto `Organizador · <nome>` cuja pasta é `organizador\org-<nome>\` (a pasta de dados do módulo). Lá ela lê o dossiê e grava `organizacao.md` (o que é cada pasta, onde paramos, próximo passo, ambiguidades e sugestões só como proposta) sem pedir permissão e sem tocar nas pastas do projeto. Quando a aba termina (hook Stop), o Termix mostra a organização e volta ao mapa. Um `organizacao.md` anterior é guardado com outro nome, não apagado.

## Testes (DEV2-010)

- Análise sem tokens (Node): 19/19 com pastas de teste (par `Loja` + `Loja-ORQ` com fluxo, TASKS, HANDOFF e checkpoint; `Rascunhos` sem padrão e com mudança pendente; `Planilhas` sem git; pasta inexistente) e conversas falsas numa config temporária. Também no formato real deste repositório (`docs/TASKS.md` e `docs/TASKS_DEV2.md`).
- App isolado por CDP sem tokens: 21/21 (chave desligada por padrão, chave em Configurações, botão no Novo projeto, passo 1, mapa com papéis, abas, avisos, retomar desmarcado, renomear pelo papel, conversa longa e em uso, dicas, dossiê, tela da organização simulada, pastas do usuário sem nenhuma mudança).
- Rodada real mínima: 2 abas novas (Dev e Orquestrador) se localizaram pelo pedido; depois, uma aba com a menção `@` (sem pedido de permissão). Total ≈ US$ 0,78.

## Testes (DEV2-024)

- `org24.js` (Node, sem IA e sem credencial): pastas de brinquedo (Loja, Loja-ORQ, Loja-dev3, Notas, Outra-ORQ) e conversas falsas com datas diferentes numa `CLAUDE_CONFIG_DIR` de teste; o `organizador.js` da interface roda num vm. 13/13: papéis, conversas lidas da pasta de teste, a recomendada de orquestrador (a mais nova entre as pastas Orquestrador) e a de dev (a mais nova entre as pastas Dev), Outro sem recomendação, pasta sem conversa sem marca, pastas sem mudança.
- `run24.js` (app isolado, agente falso, CDP, `state.json` com as chaves desligadas): 24/24. Configurações sem chaves e sem "Experimental", "Vibe Coding" no cabeçalho, uma pasta como antes, várias pastas com o mapa e as recomendadas, trocar e desmarcar, "Carregar" com um projeto por pasta e a aba do orquestrador retomando a recomendada, o "Novo mutirão" com várias pastas, pastas do usuário intactas, sem erro de JavaScript.

## Limitações e próximos passos

- A barra lateral mostra os projetos do grupo lado a lado e com o mesmo prefixo, mas sem um agrupamento visual (isso mexeria no núcleo). O `grupo.json` já guarda o vínculo para isso.
- O `sessions:scan` e o `sessionExists` do núcleo olham `~\.claude` e ignoram `CLAUDE_CONFIG_DIR`; a análise do organizador respeita a variável. No uso normal, sem a variável, é a mesma pasta.
- O "Organizar com IA" foi validado com a resposta simulada (dossiê e pedido reais; a aba real não rodou, para economizar).
- A retomada pela opção "retomar" usa o mesmo `launch(..., 'resume')` do núcleo, sem rodada real neste teste.
