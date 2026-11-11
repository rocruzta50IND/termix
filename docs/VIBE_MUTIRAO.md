# Vibe Coding e Mutirão — desenho do módulo

Desenho aprovado pelo Ygor (2026-11-06). Frente exclusiva da dev2 (numeração DEV2-xxx). Estado atual: casca (DEV2-001), tela de entrega do Vibe Coding (DEV2-002) criação dos agentes com plano e perguntas (DEV2-003) execução autônoma do plano com trava em código (DEV2-004) a tela do Mutirão com divisão, parte do sócio e contador de entregas (DEV2-005) a implementação automática do Mutirão, com o pedido em arquivo como padrão (DEV2-006), a robustez do ciclo (DEV2-007) e o fechamento das pendências do MVP (DEV2-009: marcas do plano vistas numa rodada real, conferência de deploy sem marca, plano final do Mutirão com o projeto inteiro e conflito resolvido por lado), atrás da chave **Configurações > Experimental > Vibe Coding e Mutirão (experimental)**, desligada por padrão.

## Princípios e regras dos agentes (decisões do Ygor, 2026-11-06)

- **Economia de tokens em todas as funções do Termix**: orientando o usuário (dicas curtas na interface) e de forma automática nos botões Vibe e Mutirão. No Vibe, na prática:
  - quem espera e controla o ciclo é o **Termix** (código, zero token), não a IA;
  - pedidos **curtos** que apontam para arquivos em vez de colar o conteúdo;
  - **/clear entre tarefas**;
  - o orquestrador lê **resumos**, não diffs inteiros.
- **Autonomia dos agentes**: commit e push **só na branch do papel** (projeto com fluxo Rocruzta: a branch do `CLAUDE.local.md`; projeto sem fluxo: uma branch própria `vibe/<projeto>` criada a partir da atual); **nunca** na main/master; **nada que apague dados** (sem `reset --hard`, `clean -f`, force push, apagar pastas do usuário).
- **Notificação ao humano**: normalmente só para **deploy** e para o que for indispensável.
- **Celular**: no MVP, o acesso pelo celular é o **Remote Control do Claude Code**. Telegram ou app próprio ficam para a DEV2-007, sem prioridade.

## Usuários

- Os sócios da empresa, cada um usando o Termix como ferramenta de trabalho no próprio PC.
- O Vibe Coding vale para **qualquer projeto** aberto no Termix, não só para o próprio Termix.

## Mutirão

- **Só o DONO do projeto aperta** o botão.
- Abre uma tela com **chat com o orquestrador do dono**, para definirem juntos a divisão do projeto.
- Cada sócio recebe uma parte numa **branch própria** (dev2, dev3...), que aparece no Termix dele ao abrir o projeto.
- A tela mostra um **contador de entregas** (ex.: 3/5).
- Em **N/N**, libera o botão **"Implementação automática"**: o orquestrador do dono analisa todas as entregas e a versão mais atual do projeto, gera as tarefas até o fim e segue em Vibe Coding até concluir, de forma autônoma.

## Vibe Coding

- Tela de entrega **engessada** (formulário, não chat), que exige e recomenda sempre:
  1. o **fluxo desenhado** do projeto inteiro;
  2. um **.md bem explicado** com toda a estrutura pensada para o projeto.
- A mesma tela oferece para **baixar um .md modelo** com o passo a passo da melhor entrega possível.
- Com a entrega completa, o orquestrador pode fazer perguntas, mas **só o necessário**.
- Então o Termix cria **dois agentes** (sessões do Claude Code): um **orquestrador** e um **dev**, que trabalham sozinhos até o fim.
- Quando precisar do humano: **notificação** do Termix (só deploy e o indispensável). Celular: Remote Control do Claude Code no MVP; Telegram ou app próprio depois (DEV2-007).

## Arquitetura

O módulo fica separado; o núcleo só faz as ligações. O botão só chama a função do módulo, sem quebrar nada.

| Onde | O que fica |
|---|---|
| Núcleo `src/main.js` | Uma linha: o `require` do módulo com `create({ ipcMain, dialog, app, getWin, logError })`, protegido por try/catch (erro no módulo é registrado em `erros.log` e o app segue). O próprio módulo registra os canais `vibe:*`, cada um com try/catch. Desde a DEV2-004, no `pty:spawn`, a linha do `--settings` virou três: o núcleo monta os mesmos settings de sempre e pergunta ao módulo (`vibe.spawnSettings`, com try/catch) se a aba é do Vibe; sendo, passa o arquivo de settings com a trava; senão, segue igual. |
| Núcleo `src/preload.js` | Uma ponte genérica `vibe(canal, ...)`, que só alcança canais `vibe:*`. |
| Núcleo `src/renderer/index.html` | Um `<link>` para o CSS e um `<script>` depois do `app.js`. |
| Núcleo `src/renderer/app.js` | Nada. |
| Módulo `src/vibe/` (processo principal) | `index.js`: fábrica com o estado, os canais `vibe:*`, a conferência dos arquivos e a gravação da entrega. `modelo-entrega.md`: o modelo que a tela oferece para baixar. Desde a DEV2-003, também os arquivos do ciclo (estado, plano, perguntas, respostas) e o texto dos pedidos ao orquestrador. Desde a DEV2-004: `trava.js` (o hook PreToolUse, Node sem dependências), os settings das abas do Vibe, a pasta confiável, a branch permitida, a conferência do git e os pedidos da execução. Desde a DEV2-005: `mutirao.js` (quem é o dono, conferência da divisão, publicar, parte do sócio, entrega e contador; canais `vibe:mut*`). Desde a DEV2-006: a junção das entregas, a entrega sintética e o push final (canais `vibe:mutAuto*`) e os pedidos em arquivo (`vibe\<id>\pedidos\`). |
| Módulo `src/renderer/vibe/` (interface) | Botões do cabeçalho, chave em Configurações, telas e o condutor do ciclo. Usa o que o `app.js` já expõe no escopo global (`S`, `save`, `modal`, `esc`, `createTab`, `findTab`, `RT`, `stOf`, `UI`, `renderAll`, `addEvent`, `notifCfg`, `showToast`, `beep`, `api`) e ouve os hooks pelo próprio `window.termix.onHook`. Se pendura no cabeçalho e na página Configurações observando o DOM. |

Desligado, o módulo só é carregado: não mostra botões nem executa nada.

## Tela de entrega do Vibe Coding (DEV2-002)

O botão **Vibe Coding** abre um modal largo (760 px, no padrão das janelas do app) com o formulário engessado. A tela **não cria agentes**: só recebe, confere e guarda a entrega. O Mutirão continua com "Em construção".

### Campos

| # | Campo | Regra |
|---|---|---|
| 1 | Projeto | Obrigatório. Um dos projetos do Termix (não arquivados). Os outros campos só abrem depois dele. |
| 2 | Objetivo final do projeto | Obrigatório, texto curto (até 300 caracteres, com contador). |
| 3 | Fluxo desenhado do projeto inteiro | Arquivo obrigatório: .png, .jpg/.jpeg, .svg, .pdf, .drawio, .excalidraw ou .md com um bloco `mermaid`. Até 50 MB, não vazio. |
| 4 | Estrutura do projeto (.md) | Arquivo .md obrigatório com as 9 seções do modelo, cada uma com conteúdo. A tela lista as seções que faltam e as que estão sem conteúdo. |
| 5 | Critério de pronto | Obrigatório: como saber que o projeto acabou. |
| 6 | O que os agentes NÃO podem fazer | Opcional. |
| 7 | Acessos e dados que o humano precisa fornecer | Lista (um por linha) **ou** a caixa "Nada a fornecer" marcada; um dos dois é obrigatório. Senhas não vão aqui. |

- **O que falta:** um quadro amarelo, sempre visível, lista em linguagem clara cada item pendente, com o número do campo. Completo, ele fica verde ("Tudo pronto").
- **Iniciar Vibe Coding:** desabilitado até tudo estar completo. Clicado, o processo principal confere tudo de novo (a regra que vale é a dele), grava a entrega e, desde a DEV2-003, começa o ciclo (ver "Ciclo do Vibe Coding"). Depois de gravar, o botão só volta a habilitar quando algo muda, e fica bloqueado enquanto houver um ciclo em andamento.
- **Entrega existente:** ao abrir, um aviso azul mostra a data da entrega pronta. Iniciar de novo pede confirmação dentro da própria tela ("Gravar e iniciar"). A anterior **não é apagada**: vai para `historico\<data>\`.
- **Rascunho:** cada mudança é salva (300 ms depois de digitar; na hora ao escolher arquivo, marcar a caixa ou fechar). Fechar a tela não perde nada. Ao reabrir, volta no último projeto usado (`settings.vibe.last`).
- **Enter** nos campos não fecha o modal; ele fecha só pelo X ou por Esc (regra dos modais).

### Seções obrigatórias do .md (item 4)

Objetivo · Público e usuários · Funcionalidades · Fora do escopo · Telas e fluxos · Dados e regras de negócio · Integrações e acessos · Tecnologia · Critério de pronto.

A conferência lê os títulos `#` a `###` sem acento, sem diferença de maiúsculas e sem pontuação, e aceita nomes equivalentes (ex.: "Usuários", "Regras de negócio"). No conteúdo de cada seção não contam as linhas de dica (`> `), os comentários HTML nem as linhas vazias; é preciso pelo menos 3 caracteres úteis. Por isso o modelo baixado e não preenchido aparece com todas as seções "sem conteúdo".

### Modelo (.md) para baixar

O botão "Baixar modelo (.md)" salva, com diálogo, o `src/vibe/modelo-entrega.md` (nome sugerido `estrutura-do-projeto.md`, em Documentos). Ele traz as 9 seções com dicas e exemplos em linguagem simples, para sócios não técnicos, e, em "Telas e fluxos", como desenhar o fluxo no Excalidraw, no draw.io, em Mermaid ou com uma foto do papel.

### Onde a entrega fica

`%APPDATA%\Termix\vibe\<id-do-projeto>\` (a pasta de dados do app). Nesta etapa nada é escrito na pasta do projeto do usuário.

- `entrega.json`: versão, status "pronta", data, projeto (id, nome, pasta), objetivo, critério de pronto, o que os agentes não podem fazer, acessos (lista), "nada a fornecer", nomes das cópias e caminhos de origem;
- `fluxo.<ext>` e `estrutura.md`: cópias dos arquivos entregues;
- `rascunho.json`: o que está preenchido na tela;
- `historico\<data>\`: as entregas substituídas.

### Modo de teste

O diálogo nativo de arquivo não é automatizável por CDP. Com o app aberto com a variável de ambiente `TERMIX_VIBE_TEST=1`, o processo principal aceita um caminho vindo da interface no lugar do diálogo, e a interface expõe `window.vibeTest` (abrir a tela, escolher arquivo, baixar o modelo, iniciar, ler o estado). Sem a variável, o caminho é ignorado e nada é exposto: não existe atalho escondido para o usuário.

## Ciclo do Vibe Coding: agentes, plano e perguntas (DEV2-003)

Com a entrega pronta, "Iniciar Vibe Coding" grava a entrega e começa um ciclo. **Nesta etapa nenhum agente mexe no código do projeto**: o ciclo termina com o plano fechado.

### Desenho

1. **Abas.** O Termix cria no projeto duas abas de Claude Code do próprio app, pelo mesmo mecanismo do "+": **"Vibe · Orquestrador"** e **"Vibe · Dev"**, as duas em **Dangerously** (trabalham sem pedir aprovação; o ⚠ aparece na aba). O Dev só é criado e fica parado. O app passa a mostrar o projeto, com o orquestrador em foco.
2. **Abertura.** O Termix espera o hook `SessionStart` do orquestrador. Numa pasta nova, o Claude Code pergunta antes se a pessoa confia nela (o padrão é "No, exit"): isso é do humano. Se o orquestrador não abrir em 30 s, o painel explica e o Termix notifica; quando ele abre, o pedido sai sozinho (ou pelo botão "Enviar o pedido agora").
3. **Pedido do plano.** O Termix grava o pedido em `vibe\<id>\pedidos\plano.md` e digita no terminal do orquestrador só uma linha que aponta para ele (desde a DEV2-006; ver "Pedido em arquivo"). O pedido aponta para os arquivos da entrega em `vibe\<id>\` e pede, na mesma pasta: `plano.md` (começa com "Branch de trabalho: …"; tarefas até o fim, na ordem, cada uma "## T1 — título" com Objetivo, Critério de pronto, Arquivos prováveis, Validação e Não fazer) e `perguntas.json` (`{"perguntas":[{"id","texto","porque","opcoes"}]}`, só o indispensável, gravado sempre, mesmo vazio). O pedido traz as regras de autonomia e de economia acima, proíbe mexer no código e escrever fora dessa pasta e manda encerrar o turno com "PLANO GRAVADO".
   - O texto longo chega ao Claude Code como colagem e um Enter imediato é engolido; por isso o Enter vai 1 s depois e, enquanto o hook de prompt enviado não chega, é repetido (até 4 vezes, a cada 3 s; com a caixa vazia o Enter não faz nada).
4. **Fim do turno.** Quem percebe é o Termix, pelo hook `Stop` que o app já recebe (zero token). Ele lê `plano.md` e `perguntas.json`. Sem `perguntas.json` mas com um plano gravado nesse turno, vale como "nenhuma pergunta". Sem plano: estado "erro", com aviso, notificação e "Retomar".
5. **Perguntas.** Havendo perguntas, a tela mostra um formulário (opções viram botões de escolha, com um comentário opcional; sem opções, texto livre) e o app notifica pelo mecanismo de avisos que já existe (sino, dica, som e Windows sem foco). "Enviar respostas" exige todas respondidas, grava `respostas.json` e digita um pedido curto para o orquestrador fechar o plano ("PLANO FECHADO"). Se ele voltar com perguntas novas, abre outra rodada.
6. **Plano pronto.** "Plano pronto, N tarefas", com o botão "Executar plano" (DEV2-004). O plano aparece na tela. N = quantidade de IDs T1, T2… distintos em títulos ou itens de lista; sem IDs, o número não aparece (não conta seções como tarefas).
7. **Conferência do plano (zero token).** Se o plano mandar fazer commit ou push na main/master, a tela mostra um alerta. No teste real o orquestrador escreveu "Commit em master" apesar da regra: **prompt não é trava**; por isso a DEV2-004 trouxe a trava em código (abaixo).

### Painel de andamento

Fica na tela do Vibe Coding, logo abaixo do projeto: **Preparando plano → Perguntas (N) → Plano pronto**, uma linha do que está acontecendo, avisos, o formulário de perguntas, o plano (recolhível) e uma dica curta de economia de tokens por etapa. Com um ciclo, a entrega (itens 2 a 7) fica recolhida; "Iniciar" fica bloqueado enquanto o ciclo está em andamento.

### Parar, retomar e reabrir o app

- **Parar Vibe Coding**: o Termix deixa de conduzir; se o orquestrador estiver no meio de um turno, manda Esc (interrompe). Não apaga nada e deixa as abas abertas.
- **Retomar**: primeiro lê os arquivos (zero token) e só pede algo ao orquestrador se faltar o plano ou se as respostas ainda não foram processadas.
- **Estado em `vibe\<id>\estado.json`** (fase, rodada, abas, datas, avisos). Ao reabrir o app, a tela mostra onde parou e **nada recomeça sozinho**: uma fase de espera vira "Pausado", com "Retomar". (O app continua restaurando as abas como sempre, sem mandar pedido.)
- **Novo ciclo**: os arquivos do ciclo anterior (`estado.json`, `plano.md`, `perguntas.json`, `respostas.json`) vão para `historico\ciclo-<data>\`; nada é apagado.

### Arquivos do ciclo em `%APPDATA%\Termix\vibe\<id-do-projeto>\`

`estado.json` (Termix), `plano.md` e `perguntas.json` (orquestrador), `respostas.json` (Termix, com as respostas do humano). No modo de teste (`TERMIX_VIBE_TEST=1`), `vibeTest` também injeta um `perguntas.json` de teste, responde, para e retoma.

## Execução do plano e trava em código (DEV2-004)

### Trava em código (só nas abas do Vibe)

No teste da DEV2-003 o orquestrador planejou "commit em master" apesar da regra, e as abas do Vibe rodam em Dangerously. Por isso a regra deixou de depender do prompt.

- **Como:** ao abrir o terminal de uma aba do Vibe (registrada no ciclo, ou nova com o nome "Vibe · Orquestrador"/"Vibe · Dev" na pasta de uma entrega), o Termix grava em `vibe\<id>\trava\` o `trava.json` (pasta do projeto, pasta do Vibe, branch permitida) e um `settings.json` = os settings que o app já passa (status line e hooks) + um **hook PreToolUse** (`src/vibe/trava.js`, Node sem dependências) + regras **permissions.deny**, e abre o Claude Code com `--settings <esse arquivo>`. As outras abas do app não mudam. Nada vai para os arquivos `.claude` do projeto. Se o arquivo não puder ser gravado, a aba abre sem shell nem escrita (falha fechada).
- **O hook nega com o motivo** (o agente lê e segue pelo caminho permitido):
  - `git commit`, `merge`, `rebase`, `cherry-pick`, `revert`, `am` e `pull` com o HEAD em main/master, destacado ou fora da branch permitida (o hook confere a branch atual no git);
  - `git push` para main/master ou para branch diferente da permitida, com `--force`/`-f`/`--force-with-lease`, `+refspec`, `--delete`/`:branch`, `--mirror`/`--all`;
  - **trocar para main/master (DEV2-013):** `git checkout <prot>` e `git switch <prot>`, também com `-b`/`-c`/`--create`/`--detach`/`--track`, como ponto de partida (`checkout -b nova main`), pelo remoto (`origin/main`, `refs/remotes/...`, qualquer remoto do projeto), com `~`/`^`/`@{n}`, com `-`/`@{-N}` quando a branch anterior é a principal e sem diferenciar maiúsculas. Trocar para a branch permitida ou para outras branches, criar branch a partir da permitida e ler a principal (`git show`, `git log`, `git merge origin/<branch>` na permitida) continuam como antes. As trocas que o próprio Termix faz (conferir/criar a branch permitida, o Mutirão juntar entregas, a conferência do git) rodam no processo principal, fora do hook, e não passam pela trava;
  - `git reset --hard`, `git clean` (menos `-n`), `git checkout --`/em arquivos/forçado, `git restore` em arquivos (`--staged` sozinho pode; exceção da DEV2-009 logo abaixo), `git switch` forçado, `git branch -D`, `git stash drop/clear`, `update-ref` na main/master, `filter-branch`/`filter-repo`, `reflog expire`, `gh pr merge`;
  - apagar de forma recursiva (`rm -r`, `Remove-Item -Recurse`, `rd /s`, `del /s`, `find -delete`) em qualquer lugar, e apagar qualquer coisa fora da pasta do projeto e de `vibe\<id>` (e também a trava, o `.git` e a própria pasta do projeto);
  - `Write`/`Edit`/`MultiEdit`/`NotebookEdit` e redirecionamentos (`>`, `tee`, `Out-File`, `Set-Content`) fora da pasta do projeto e de `vibe\<id>`, na trava, no `.git` e nos `.claude/settings*.json` do projeto (que poderiam desligar a trava);
  - gravar em `.env` (menos os modelos `.env.example`/`.sample`/`.template`), chaves (`.pem`, `.key`, `.p12`, `id_rsa`…) e credenciais (`credentials*`, `.npmrc`, `.git-credentials`…). **Ler pode.**
  - **Exceção para resolver conflito (DEV2-009):** `git checkout --ours|--theirs [--] <arquivo>` e `git restore [--source=<ref>|-s <ref>] [--worktree] --ours|--theirs [--] <arquivo>` passam **só** com um merge em andamento (`MERGE_HEAD`), o HEAD na branch permitida e cada arquivo ainda em conflito (sem `.`, curinga, `-f`, `-p` ou `--staged`). Fora disso, continuam bloqueados.
  - Também confere comandos dentro de `bash -c`, `cmd /c`, `powershell -Command` e `Invoke-Expression`; PowerShell com comando codificado é negado.
- **Limite conhecido:** não é sandbox. Cobre os caminhos comuns (Bash, PowerShell e ferramentas de escrita); um script que o próprio agente escreva e rode poderia escapar. Por isso o Termix ainda **confere o git em código depois de cada tarefa** (main/master locais e do origin intactas).
- **Branch permitida:** projeto com fluxo Rocruzta (`.claude/fluxo.json` e `CLAUDE.local.md`): a branch do papel (se ela for main/master, não vale e o Termix para); sem fluxo: `vibe/<pasta-do-projeto>`. Antes de executar e a cada tarefa, **o Termix** (código, não a IA) confere ou cria essa branch (`git switch`, ou `git switch -c` a partir da atual), sem descartar nada; se o working tree impedir a troca, ou o projeto não tiver git, pausa e explica.
- **Testar sem tokens:** rodar `node src/vibe/trava.js <trava.json>` com a entrada do hook em JSON pelo stdin (código 2 = bloqueado, motivo no stderr). O teste da DEV2-004 cobre 62 casos (um permitido e um bloqueado para cada regra); a DEV2-009 somou 17 do conflito resolvido por lado (79); a DEV2-013 somou 34 da troca para main/master, bloqueadas e permitidas (113).

### Pasta confiável (decisão do Ygor: o Termix marca sozinho)

Antes de abrir as abas do Vibe (e ao executar), o Termix marca a pasta do projeto como confiável no `.claude.json` do Claude Code: **só** a chave `hasTrustDialogAccepted` da entrada daquela pasta (chave no formato `C:/caminho/da/pasta`; se já houver entrada, as outras chaves dela não mudam). Já confiável: não grava nada. Senão: backup com a data em `%APPDATA%\Termix\vibe\backup-claude-json\`, releitura imediatamente antes de gravar (as sessões abertas do Claude Code escrevem nesse arquivo), gravação atômica (temporário + rename) e conferência depois; JSON ilegível = não grava. Caminho: `CLAUDE_CONFIG_DIR\.claude.json` ou `~\.claude.json`; no modo de teste, `TERMIX_VIBE_CLAUDE_JSON` aponta para um arquivo de teste. Se não conseguir marcar, o painel avisa para escolher "Yes, I trust this folder" na aba.

**Validar no real:** com o Termix fechado, copie o `~\.claude.json`; abra o Vibe num projeto novo; confira que a entrada `"C:/…/projeto": { "hasTrustDialogAccepted": true }` apareceu, que o resto do arquivo é igual à cópia (a menos do que as sessões abertas do Claude Code gravarem no meio) e que há um backup em `vibe\backup-claude-json\`; as abas abrem sem a pergunta de confiança.

### Ciclo de execução (quem conduz é o Termix)

Com o "Plano pronto", o painel mostra **"Executar plano"**. O Termix lê as tarefas do `plano.md` (IDs T1..Tn, com as marcas `[DEPLOY]` e `[HUMANO]` no título, que o pedido de planejamento agora exige, junto com "cada tarefa cabe num turno e termina num commit") e, para cada tarefa:

1. confere a branch e fotografa o git (SHA da branch permitida e de main/master locais e do origin);
2. dá `/clear` na aba Dev (espera o `SessionStart` de origem "clear") e digita um pedido curto: ler a seção Tk do `plano.md`, implementar, validar, commit "Tk: …" na branch permitida, gravar `vibe\<id>\resultados\Tk.md` (o que fez, commit, validação, pendências) e encerrar o turno;
3. no hook `Stop` do Dev, confere **em código**: `Tk.md` gravado nesse turno, commit novo na branch permitida, HEAD ainda nela e main/master intactas (mudou = pausa de erro);
4. dá `/clear` no orquestrador e pede: ler `Tk.md` (e só o `git show --stat`, se precisar), gravar `revisoes\Tk.json` com `{"veredito":"aprovado"|"refazer","motivo","ajustes"}`;
5. aprovado: próxima tarefa. Refazer (ou o Dev não entregou `Tk.md`/commit): volta ao Dev com os ajustes, **até 2 refações** (3 tentativas); depois, pausa e pede ajuda ao humano; cada "Continuar" dá mais uma tentativa (DEV2-007). Tarefa `[SEM COMMIT]` não exige commit novo (ver "Robustez do ciclo").

**Pausas** (salvas no `estado.json`, retomam de onde pararam):

- **Limite:** antes de cada pedido, com a janela de 5 h em **93 %** ou mais (decisão do Ygor; desde a DEV2-014, o teto de 5 h, o de 7 d e o em US$ vêm da política do projeto, ver "Política de autonomia"). Com o app aberto, o Termix retoma sozinho quando a janela virar (a hora de renovação passou) ou o número cair abaixo do teto. O 7 d aparece na tela, mas não pausa por enquanto. No modo de teste, `vibeTest.limit(93)` injeta o número.
- **DEPLOY ou HUMANO:** antes da tarefa marcada; notifica. "Continuar" libera o Dev para executá-la; "Já fiz, pular" marca como feita pelo humano.
- **Erro ou sem resposta:** *(desde a DEV2-015, as falhas do Dev e do orquestrador vão primeiro para a recuperação; ver "Recuperação de erro")* branch que não pôde ser preparada, aba que não abriu em 60 s, `/clear` não confirmado, revisão não gravada, main/master alterada, aba fechada no meio do turno 20 min sem nenhum sinal do agente (hook ou saída no terminal) ou turno sem terminar em 30 min (DEV2-007: o Termix interrompe o agente); notifica.

**Painel:** etapas Preparando plano → Perguntas → Plano pronto → Execução (feitas/N) → Concluído; tarefa atual k/n, fase (Dev trabalhando, Revisão, Pausado: motivo), branch, último commit, tentativas, limites 5 h e 7 d e a lista de tarefas (feitas com o commit, etiquetas DEPLOY/HUMANO). "Parar" interrompe (Esc nas duas abas se estiverem trabalhando) sem apagar nada. No fim: "Projeto concluído", resumo e notificação.

**Reabrir o app:** a tela mostra onde parou e **não retoma sozinha** (nem a pausa por limite); só com "Continuar", que primeiro confere os arquivos e o git (zero token) e só pede de novo o que faltar.

**Correções da DEV2-003:** com um ciclo em andamento (inclusive "Plano pronto"), o "Iniciar" do rodapé some; com o ciclo parado, volta como ação secundária ("Iniciar de novo"); a ação principal fica no painel ("Executar plano"/"Continuar"). O aviso "Terminou" das abas do Vibe (inclusive o falso, ao abrir a aba Dev) não vai mais ao humano: quem avisa é o Vibe (perguntas, pausas, conclusão); erros das abas continuam passando.

**Arquivos novos do ciclo** em `vibe\<id>\`: `resultados\Tk.md` (Dev), `revisoes\Tk.json` (orquestrador), `trava\` (settings e configuração da trava, gravados pelo Termix), `abas.json` (abas do Vibe deste projeto). Um ciclo novo arquiva `resultados` e `revisoes` junto com o resto em `historico\ciclo-<data>\`.

## Mutirão: divisão, parte do sócio e contador (DEV2-005)

Quem divide é o orquestrador do dono; quem confere, publica, entrega e conta é o **Termix** (código, zero token).

### Quem usa

- **Projeto com fluxo Rocruzta** (`.claude/fluxo.json`): só o **DEV1** (papel no `CLAUDE.local.md`) é o dono; a branch do dono é a `branch_padrao` dele. Os outros papéis veem só a explicação.
- **Projeto sem fluxo**: qualquer um pode usar, com o aviso de que o Mutirão **exige um remoto git (origin)**. Branch do dono: a atual; se ela for main/master, a `dev1` (criada pelo Termix a partir da atual ao publicar, sem descartar nada).
- Sem git ou sem origin: a tela explica e os botões ficam desligados.

### Tela do dono

O botão **Mutirão** abre um **painel ao lado do terminal** (não um modal, para o chat continuar usável). O chat é o terminal da aba **"Mutirão · Orquestrador"** (Claude Code do próprio app, Dangerously, com a mesma trava do Vibe da DEV2-004; o Termix marca a pasta como confiável como no Vibe). O painel tem:

1. **Participantes**: nome e branch de cada sócio (dev2, dev3…). Não vale main/master, a branch do dono nem branch repetida.
2. **Divisão com o orquestrador**: "Abrir o chat" cria (ou retoma) a aba; **"Gerar divisão"** grava as instruções em `mutirao/PEDIDO.md` e digita só uma linha ("leia e siga mutirao/PEDIDO.md"). O orquestrador lê só os documentos e a estrutura e grava `mutirao/divisao.json` e `mutirao/partes/<branch>.md`. No fim de **cada** turno dessa aba (inclusive depois de um ajuste pedido no chat), o Termix confere sozinho e mostra o resumo; "Conferir" refaz à mão.
3. **Publicar**: commit só de `mutirao/divisao.json` e `mutirao/partes/` na branch do dono e push só dela. Nunca main/master; o que estiver fora disso no projeto não entra e não é descartado.
4. **Entregas** (depois de publicar): "Entregas: k/N", quem entregou e quando. Ao abrir a tela e no botão "Atualizar" (sem laço). Em N/N aparece **"Implementação automática"** (ver DEV2-006).

**Conferência do Termix** (recusa e explica): `divisao.json` ausente ou fora do formato; parte sem branch, repetida, de quem não é participante ou faltando; parte sem arquivos; `partes/<branch>.md` ausente ou sem as 9 seções do modelo com conteúdo; **arquivo em comum** entre partes (mesmo caminho, ou um dentro da pasta do outro; curinga vale como a pasta antes dele; "." ou caminho fora do projeto = projeto inteiro). Mudanças fora de `mutirao/` viram aviso.

> No teste real, um pedido longo digitado na aba recém-aberta chegou cortado (só ~100 caracteres finais, também com colagem delimitada). Por isso o pedido do Mutirão vai em arquivo (`mutirao/PEDIDO.md`, fora do commit) e o que se digita é uma linha curta.

### Lado do sócio

- Quando o projeto em foco no Termix está na branch `<b>` e existe `mutirao/partes/<b>.md` na pasta (depois de sincronizar a branch dele com a do dono), aparece **"Sua parte do Mutirão"** no cabeçalho e um aviso no sino (uma vez por sessão). Conferido ao trocar de projeto e no máximo a cada 15 s (o processo principal só lê a pasta e o HEAD).
- O painel mostra a parte e **"Abrir o Vibe Coding com a minha parte"**: o Termix registra a parte e pré-preenche a entrega do Vibe (objetivo e critério da parte, a estrutura = `partes/<b>.md`, e "não podem fazer" = não mexer fora dos arquivos da parte). O sócio completa o que faltar (o fluxo desenhado e os acessos) e inicia normalmente. A branch dos agentes do Vibe desse projeto passa a ser a da parte.
- Quando o Vibe chega a **"Projeto concluído"**, o Termix grava `mutirao/entregas/<b>.json` (data, commits do ciclo, tarefas, resumo), faz commit só desse arquivo e push só da branch `<b>`. Falhou: o painel mostra o motivo e "Enviar a entrega de novo".

### Arquivos e quem grava

| Arquivo | Onde | Quem grava |
|---|---|---|
| `mutirao/PEDIDO.md` | projeto do dono (fora do commit) | Termix |
| `mutirao/divisao.json` | projeto do dono, publicado na branch do dono | orquestrador do dono |
| `mutirao/partes/<branch>.md` | idem (as 9 seções do modelo) | orquestrador do dono |
| `mutirao/entregas/<branch>.json` | projeto do sócio, na branch dele | Termix, ao concluir o Vibe |
| `vibe\<id>\mutirao.json` | pasta de dados do app | Termix: `dono` (participantes, aba, conferência, publicação, contador) ou `socio` (branch, parte, entrega) |

**Contador:** `git fetch origin` e, para cada participante, `git show origin/<b>:mutirao/entregas/<b>.json` (zero token).

**Modo de teste:** `vibeTest.mut` (abrir, participantes, gerar, conferir, publicar, contar, abrir o Vibe da parte, conferir a parte) e `vibeTest.mutEntregar(id)` grava a entrega simulada do sócio sem rodar o Vibe.

**Correção da DEV2-004:** a pasta de backups do `.claude.json` guarda só os 10 mais recentes.

## Implementação automática do Mutirão (DEV2-006)

Em **N/N**, o botão **"Implementação automática"** junta as entregas na branch do dono e segue em Vibe Coding até concluir o projeto. Quem junta, confere, espera e envia é o **Termix** (código, zero token); a IA só planeja, implementa e revisa.

### 1. Junção (código, sem IA)

1. O Termix confere: Mutirão publicado, todas as entregas no remoto, nenhum merge em andamento e **working tree limpo** (só arquivos versionados; não versionados como o `mutirao/PEDIDO.md` não contam). Sujo: recusa e lista os arquivos ("Faça commit ou guarde (stash) antes"), sem mexer em nada.
2. HEAD na **branch do dono** (nunca main/master): se estiver em outra, `git switch` para ela, sem descartar nada.
3. `git fetch origin` e, para cada participante, na ordem: `git merge --no-ff origin/<branch>` com a mensagem "Mutirão: integrar `<branch>` (`<nome>`)". Já integrada: "já estava integrada", sem commit novo.
4. **Conflito**: nada é descartado. O Termix registra a branch e os arquivos (`git diff --diff-filter=U`) e para aquele merge com `git merge --abort`; as outras entregas continuam entrando. Se o `--abort` falhar, a junção para e pede ajuda ao humano.
5. O conflito vira a **primeira tarefa** do plano: o Dev refaz `git merge --no-ff origin/<branch>` na branch do dono e resolve editando os arquivos ou escolhendo um lado com `git checkout --ours/--theirs -- <arquivo>` (a trava libera merge e commit na branch do dono e continua bloqueando main/master; o `--ours/--theirs` só passa com o merge em andamento, DEV2-009).

### 2. Plano final

O Termix monta uma **entrega sintética** do Vibe em `vibe\<id>\` (a entrega anterior vai para o histórico, como sempre):

- `entrega.json`: objetivo e critério de pronto vindos da divisão (`divisao.json` agora pede `objetivo` e `criterio` do projeto inteiro; sem eles, o Termix compõe com os títulos e os critérios das partes), "nada a fornecer", o que não fazer (main/master, push, desfazer as partes) e o bloco `mutirao` (branch, junções, conflitos);
- `estrutura.md`: **objetivo e critério de pronto do projeto inteiro** em seções próprias (DEV2-009), a seção **"Publicação, deploy e passos do humano"** (linhas com deploy, publicar, produção, FTP, GitHub Pages, Vercel, Netlify, hospedagem, domínio, DNS, senha ou credencial achadas no objetivo e no critério da divisão, nas partes e no `README.md`, `ROADMAP.md`, `docs/ROADMAP.md`, `DEPLOY.md` e `docs/DEPLOY.md` do projeto; até 12), a divisão, cada parte (objetivo, arquivos, caminho do `.md`), cada entrega (resumo e tarefas), o resultado de cada junção, os conflitos e o critério de pronto (começando por "Projeto inteiro: ..."). Aponta para os arquivos em vez de colar o conteúdo;
- `fluxo.md`: o fluxo do Mutirão em Mermaid.

Depois, o mesmo ciclo do Vibe (DEV2-003): abas "Vibe · Orquestrador" e "Vibe · Dev" no projeto do dono, pedido do plano e só as perguntas indispensáveis. O pedido manda analisar as entregas e a versão atual da branch do dono e gravar `plano.md` até o fim: primeiro os conflitos ("## T1 — Resolver o conflito da `<branch>`"), depois ligar as partes, as lacunas contra o critério de pronto **do projeto inteiro**, a validação final `[SEM COMMIT]` e, sem deixar de fora, a publicação/deploy (`[DEPLOY]`, depois da validação final) e o que depende do humano (`[HUMANO]`) — DEV2-009: na rodada real da DEV2-007, o passo de publicação do roadmap tinha ficado fora do plano.

**Conferência do Termix (zero token):** com conflitos, as primeiras tarefas precisam citar as branches em conflito; se não citarem (ou se o plano citar commit na main/master), o ciclo para em "Plano pronto" com o aviso, e o humano decide se executa.

### 3. Execução

Sem perguntas e com o plano conferido, o Termix clica sozinho em "Executar plano": o mesmo ciclo da DEV2-004 (Dev → conferência em código → Revisão → próxima; pausas em 93 % da janela de 5 h, DEPLOY/HUMANO, erro), na branch do dono, que passa a ser a branch permitida da trava e da conferência (também em projetos sem fluxo).

### 4. Final

Em "Projeto concluído", **o Termix** (código) faz push só da branch do dono (`refs/heads/<branch>`, nunca main/master) e notifica: **"Mutirão concluído na `<branch>`. Promover para a main é com você."** Push que falhar: aviso, notificação e "Enviar a branch de novo". Promover para a main continua sendo do humano.

### 5. Tela do Mutirão

Abaixo do contador, um quadro "Implementação automática" com as fases **Juntando entregas (k/N) → Conflitos: X** (só se houver) **→ Planejando** (ou "Plano pronto") **→ Executando k/n → Concluído**, a lista das junções (integrada, já estava, conflito com os arquivos) e o link **"Ver no Vibe"**, que abre o painel de execução do Vibe. Com um ciclo em andamento, o botão some; parado, concluído ou com erro, volta como "Implementação automática de novo" (as junções já feitas viram "já estava integrada").

**Estado:** `mutirao.json` → `dono.auto` (fase, branch, junções, k/N, entrega, push). As fases de plano e execução vêm do `estado.json` do ciclo (marcado com `auto`).

**Modo de teste:** `vibeTest.mut.auto({ maxTarefas, executar })` (`maxTarefas` vai para o pedido do plano; `executar: false` para em "Plano pronto"), `vibeTest.mut.verVibe()` e `vibeTest.mut.autoPush()`.

## Pedido em arquivo (padrão do Vibe e do Mutirão, DEV2-006)

No teste da DEV2-005, um pedido longo digitado na aba chegou cortado. Desde a DEV2-006, **todo pedido do Termix aos agentes** (planejamento, fechar o plano, Dev, refação e revisão) é gravado em `vibe\<id>\pedidos\<nome>.md` (`plano`, `fechar`, `Tk-dev`, `Tk-refazer`, `Tk-revisao`) e o Termix digita só uma linha: **"Vibe do Termix: leia e siga `<caminho>`"** (menos de 200 caracteres). O Mutirão já fazia assim (`mutirao/PEDIDO.md`). Menos risco de corte e menos texto no terminal. Um ciclo novo arquiva a pasta `pedidos` no histórico com o resto.

## Robustez do ciclo (DEV2-007)

Pontos fracos achados nas rodadas das DEV2-004 a 006, corrigidos e testados (a maior parte sem tokens, com um Claude Code falso no PATH do teste).

- **Marca `[SEM COMMIT]`.** O pedido de planejamento pede `[SEM COMMIT]` no título da tarefa que só valida ou confere (no Mutirão, a validação final vem marcada). O Dev recebe "commit só se corrigir algo" e precisa gravar no `resultados\Tk.md` uma linha **"Validação: <comandos e resultado>"**. A conferência do Termix aceita a tarefa sem commit novo quando a marca existe e essa linha está lá; sem a linha (e sem commit), vira refação com o motivo. A revisão é avisada de que não há commit. Na tela, a etiqueta SEM COMMIT e "validada, sem commit" na lista.
- **Limite de tentativas.** *(DEV2-015: esgotadas pela conferência, vão para a recuperação; pela revisão, continua assim.)* 1 execução + 2 refações (pela conferência ou pela revisão). Na 3ª falha o ciclo pausa ("Pausado: precisa de você"), notifica e mostra o motivo (o que faltou ou o motivo da revisão). **"Continuar" dá mais UMA tentativa** (a refação com o mesmo motivo), não uma rodada nova; "Tentativas" mostra k de n.
- **Tempo limite do turno.** *(DEV2-015: em vez de pausar, o Dev vai para a recuperação e o orquestrador ganha um F5 da aba.)* Se o Dev ou o orquestrador não terminar o turno em **30 min** (desde o pedido), ou ficar **20 min sem nenhum sinal** (hook ou saída no terminal), o Termix interrompe o agente (Esc), pausa, notifica e diz quem travou. "Continuar" confere o que ficou pronto (Dev: arquivo e commit; sem isso, refação) ou pede a revisão de novo, uma vez. No modo de teste, `vibeTest.tempos({turno, semResposta})` encurta os tempos.
- **Parar no meio do turno.** O Termix guarda se o pedido chegou a ser enviado (hook de prompt enviado). Parado **antes** do envio: a tentativa é desfeita (não conta) e a caixa de texto da aba é limpa (Ctrl+U), para o próximo `/clear` não sair grudado no pedido antigo. Parado **durante** o turno: Esc ao agente; "Continuar" confere e segue pela refação (o que já ficou commitado vale). Revisão parada sem veredito: "Continuar" pede a revisão de novo.
- **Push final com o remoto à frente** (Mutirão). Antes do push da branch do dono, o Termix faz `git fetch`; se a `origin/<dono>` estiver à frente (outra máquina), faz `git merge --no-ff origin/<dono>` ("Mutirão: integrar origin/<dono> (remoto à frente)"), sem rebase e sem descartar. Sem conflito, envia; a tela diz que integrou. Com conflito: `git merge --abort`, nada é enviado nem descartado, a tela lista os arquivos e explica; depois de resolver, "Enviar a branch de novo". Com mudança sem commit ou fora da branch do dono, recusa e explica.

## Conferências do plano e pendências fechadas (DEV2-009)

- **Marcas vistas numa rodada real.** Vibe comum de brinquedo (cardápio publicado no GitHub Pages com o domínio do cliente, que só o cliente informa): o planejador real marcou `[HUMANO]` no CNAME com o domínio, `[DEPLOY] [HUMANO]` na publicação e `[HUMANO] [SEM COMMIT]` na validação final no domínio, e perguntou o domínio e o repositório (respondido "ainda não informado"). O pedido de planejamento não mudou.
- **Deploy sem marca (zero token).** Se o plano não tiver nenhuma tarefa `[DEPLOY]` mas algum título falar em deploy, publicar/publicação, produção, go-live, GitHub Pages, Vercel, Netlify, FTP ou hospedagem, o painel mostra um aviso ("sem a marca, o Termix não pausa antes dela") e, no Mutirão, a execução automática não começa sozinha. Com pelo menos uma tarefa `[DEPLOY]`, não avisa (evita alarme em "README com instruções de publicação").
- **Alarme falso de main/master corrigido.** A conferência de "commit/push na main/master" ignorava a negação só até 25 caracteres antes; a linha real "**Não fazer:** nada de push em main/master" virava alerta (e, no Mutirão, travaria a execução automática). Agora a negação (não, nunca, nada de, sem, jamais, evite, proibido, bloqueado, never, don't) vale em até 80 caracteres antes.
- **/clear depois de Esc num Claude Code real.** Na mesma rodada: "Parar" no meio do turno do planejamento → "Interrupted" na aba → o `/clear` do ciclo (com o Ctrl+U antes) chegou inteiro (SessionStart "clear"; nada de "clear" sem a barra virando pedido). Observação: depois do Esc, o indicador da aba continua "trabalhando" até o próximo turno, porque o Claude Code não dispara o hook Stop numa interrupção.
- **Modo de teste:** `vibeTest.clear('orq'|'dev')` chama o `/clear` do ciclo numa aba do Vibe (true = o SessionStart "clear" chegou).

## Política de autonomia (DEV2-014)

Decisões do Ygor (2026-11-11): o responsável pelo projeto fica na dev1 e tem autorização total para deploy na main. O deploy será feito **pelo Termix, em código** (DEV2-016), nunca pelo agente: a trava continua barrando a main para a IA. Voltar versão é por `git revert`. São 5 devs na empresa e esta é a ferramenta diária de todos: o usuário escolhe tudo antes de iniciar a produção autônoma, sem ficar engessado.

### Quem pode ligar o deploy

- Projeto com o fluxo Rocruzta (`.claude/fluxo.json`): só o papel **DEV1** do `CLAUDE.local.md`. Para DEV2..DEV5 (ou sem papel) a opção de deploy **não aparece** e o fim do ciclo é **enviar a própria branch e o handoff**.
- Projeto sem o fluxo: quem abre é o dono e pode ligar.
- A regra que vale é a do processo principal (`src/vibe/politica.js`): uma política gravada com deploy por quem não pode vira "Nunca".

### Tela "Antes de iniciar"

Fica entre "Plano pronto" e a execução: o botão do painel passa a ser **"Executar plano…"**, que abre a tela; **"Iniciar a produção autônoma"** grava a política e executa. "Voltar" fecha sem executar. Três modelos prontos, com ajustes finos por cima (mudando deploy ou humano, a tela marca **AJUSTADO**):

| Modelo | Deploy na main | Chamar o humano |
|---|---|---|
| Supervisionado | Pedir autorização | Também em decisões de produto |
| **Autônomo até a branch** (padrão) | Nunca | Só o indispensável |
| Autônomo com deploy (só DEV1 ou o dono) | Sempre automático | Só o indispensável |

Campos:

- **Deploy na main:** Nunca / Pedir autorização / Automático a partir de um marco (texto livre, ex.: "v1.0 estável", com a caixa "Marco atingido"; marco sem texto não é gravado) / Sempre automático.
- **Receita de deploy:** os comandos que o Termix vai rodar (um por linha). Desde a DEV2-016 o Termix roda a receita no deploy (seção "Deploy pelo Termix").
- **Portão de qualidade:** o comando que precisa passar antes de qualquer deploy; sugere o `validacao` do `.claude/fluxo.json` (os itens juntos com `&&`).
- **Orçamento:** teto em % da janela de 5 h (padrão 93, a decisão anterior, agora configurável) e da de 7 d (padrão 95) e, opcional, em US$ (custo equivalente do ciclo pela tabela da API, somado da status line das abas do Vibe: o maior valor visto por sessão). Ao atingir, o ciclo **pausa e avisa**; nas janelas, retoma sozinho quando ela virar ou quando o teto subir; no US$, só com "Continuar" depois de subir o teto.
- **Modelo por papel:** orquestrador e dev (Padrão do Claude Code / Opus / Sonnet / Haiku). Sem tocar no núcleo: vai na chave `model` do settings que o módulo já grava para a aba do Vibe (o mesmo da trava; agora um arquivo por papel, `trava\settings-orq.json` e `trava\settings-dev.json`). Vale quando a aba abre; no meio do ciclo, na próxima vez que a aba for aberta (o "F5" da aba é a DEV2-015).
- **Quando chamar o humano:** só o indispensável / também em decisões de produto / sempre (antes de cada tarefa).

### Gravação e edição no meio do ciclo

`%APPDATA%\Termix\vibe\<id>\politica.json`, por projeto, com o histórico das alterações (data, motivo e campos, até 30). Relida ao reabrir o app. No painel, uma linha "Política: ..." com **"Editar política"** (o mesmo formulário, "Salvar a política", sem parar nada: vale a partir da próxima tarefa, porque o ciclo lê a política no início de cada tarefa; o teto e "Pausar deploy" valem na hora) e, para quem pode fazer deploy, **"Pausar deploy"**, sempre à vista.

### Como o ciclo usa a política (zero token)

- Tarefa `[DEPLOY]` com "Nunca" ou marco ainda não atingido: pausa como antes (Continuar libera e o Dev executa a tarefa, "Já fiz, pular" marca como feita pelo humano). Com "Pedir autorização" (DEV2-016): o sino e o painel mostram "Autorizar deploy" e "Negar" (seção "Deploy pelo Termix").
- Deploy automático ("Sempre" ou marco atingido): a tarefa não vai ao Dev; desde a DEV2-016 **o Termix faz o deploy em código** (seção "Deploy pelo Termix"). Até a DEV2-015 ela só ficava marcada "deploy pendente".
- **"Pausar deploy"** ligado: corta na hora qualquer deploy (automático ou com autorização); a tarefa `[DEPLOY]` fica **"deploy retido (Pausar deploy)"** e o resto do ciclo continua. **"Retomar deploy"** executa os retidos (e os "pendentes" que ficaram da DEV2-014) num deploy só: na hora, se nenhum agente estiver trabalhando; senão, na fronteira da tarefa atual.
- `[HUMANO]` pausa sempre (o indispensável, como hoje). "Sempre" pausa antes de cada tarefa ("Continuar" libera; sem "Já fiz, pular").
- Projeto do Mutirão (o Termix clica sozinho em "Executar plano"): sem política gravada, vale e é gravada a padrão.

### O que os agentes recebem

Os pedidos continuam curtos e em arquivo. Só o planejador recebe um trecho da política, e só o que importa a ele: com "decisões de produto", perguntar também essas decisões e marcar `[HUMANO]`; com deploy automático ou por marco, que o deploy é do Termix; para DEV2..DEV5, não planejar deploy na main. Receita, portão, teto e modelos não vão aos agentes. O pedido do Dev e o da revisão não mudam.

## Recuperação de erro (DEV2-015)

Decisão do Ygor (2026-11-11): erro simples não pode travar o projeto. Até a DEV2-014, erro do Dev, tempo limite (30 min por turno, 20 min sem sinal) e as 2 refações pela conferência pausavam o ciclo. Agora o Termix tenta se recuperar sozinho, só no módulo (`src/vibe/recuperacao.js` no processo principal e o ciclo em `src/renderer/vibe/vibe.js`).

### Quando entra

- **Dev:** tentativas esgotadas pela conferência (1 execução + 2 refações sem `Tk.md` ou sem commit), tempo limite do turno, sem nenhum sinal, aba que fechou no meio do turno, aba que não abriu em 60 s, `/clear` não confirmado e o Dev terminando fora da branch permitida.
- **Orquestrador travado** (mudo, tempo limite, revisão ou decisão não gravada, aba que não abriu): o Termix dá **F5 na aba dele uma vez por tarefa** e pede de novo o que estava pendente. Se travar de novo, pausa e avisa (sino).
- **Não muda:** a revisão que pede "refazer" continua com 2 refações + "Continuar" (pausa "precisa de você"). As execuções pedidas pela recuperação não gastam essas tentativas (não contam em dobro). Pausas por teto, `[DEPLOY]`/`[HUMANO]`, main/master alterada e erro interno do Termix também continuam como antes.

### Cada volta

1. **Diagnóstico, em código e sem IA:** `vibe\<id>\diagnosticos\Tk-n.md` com as últimas ~60 linhas da tela da aba do Dev (o mesmo texto do "Exportar texto" do app), `git status --short --branch`, o último commit, a branch atual e a permitida, o erro ou motivo e o que já foi tentado (falhas e ações das voltas anteriores). Cada falha grava um diagnóstico novo (n = 1, 2, ...).
2. **Volta do orquestrador:** `/clear` no orquestrador e o pedido curto em arquivo (`pedidos\pedido-Tk-recuperacao-n.md`): ler o diagnóstico e a seção Tk do plano, não mexer no código, gravar `vibe\<id>\recuperacao\Tk-n.json` com UMA ação da lista fechada, `"motivo"` e `"bloqueia_proximas"`:
   - `reenviar`: a tarefa volta ao Dev com a explicação extra (`"explicacao"`) e o motivo da falha;
   - `clear_dev`: `/clear` no Dev e a tarefa recomeça com o pedido normal;
   - `f5_aba`: o Termix fecha e reabre a aba do Dev retomando a conversa (`--resume`), pelo caminho normal do app, então a **trava** e o **modelo atual da política** valem; o pedido de continuar vai na conversa retomada, **sem `/clear`**;
   - `f5_projeto`: roda o comando "reiniciar o projeto" da política (só aparece na lista se houver comando) e reenvia a tarefa;
   - `dividir`: Tk vira **Tk.a** e **Tk.b** no `plano.md` (inseridas depois da seção Tk, com título e critério de pronto; a Tk ganha a linha "Dividida pelo Termix..." e o plano anterior fica em `plano.antes-de-dividir-Tk.md`); o ciclo segue pela Tk.a;
   - `pular`: a tarefa vira pendência e o ciclo segue.
3. **O Termix executa em código** e confere o resultado como sempre (`Tk.md` novo, commit novo na branch permitida, main/master intactas, depois a revisão). O commit que o Dev já tiver feito na tarefa continua valendo na volta.

**JSON inválido**, ação fora da lista, `f5_projeto` sem comando na política, `dividir` sem as duas partes ou o arquivo não gravado no turno: pausa com o motivo. "Continuar" pede a decisão de novo (uma vez); se vier inválida de novo, pausa outra vez.

### Até N voltas e pendências

- **Voltas por tarefa:** da política (padrão **3**, de 0 a 5). Esgotadas, a tarefa vira **pendência**: o sino avisa com o resumo do diagnóstico e o ciclo segue para a próxima tarefa, em vez de parar tudo. Com 0 voltas, a falha vira pendência direto (com o diagnóstico).
- **Pausa total só se:** o orquestrador marcou `"bloqueia_proximas": true` na decisão da tarefa que virou pendência (a próxima depende dela; "Continuar" segue com a próxima depois que o humano resolver); a main/master mudar; ou o teto da política for atingido. **As voltas contam no orçamento:** o teto (5 h, 7 d, US$) é conferido antes de cada volta, e o custo do orquestrador entra no US$ do ciclo.
- **Painel:** a linha de fase mostra **"Recuperando (volta n/3): <ação>"** ("aguardando a decisão do orquestrador" enquanto ele decide), com o diagnóstico e o que já foi tentado; a lista marca as tarefas com a etiqueta PENDÊNCIA e as divididas; no fim do ciclo, **"Pendências do ciclo"** lista uma por tarefa pulada, com o motivo e o diagnóstico. A notificação do fim conta as pendências. Desde a DEV2-016, durante a recuperação a linha "Tentativas" dá lugar a **"Volta n/N"** e o caminho do diagnóstico virou o link **"Abrir diagnóstico"** (abre o arquivo no programa padrão; só arquivos da pasta do Vibe).

### F5 do projeto (política)

Na tela "Antes de iniciar" (e no "Editar política"): **"Comando para reiniciar o projeto (F5 do projeto)"**, opcional (ex.: subir de novo o servidor de desenvolvimento), e **"Voltas do orquestrador por tarefa"** (0 a 5). O comando:

- roda **só na pasta do projeto** (`cwd`) e só quando o orquestrador pedir `f5_projeto`;
- passa antes pelo **verificador da trava** (`decide` de `src/vibe/trava.js`, a mesma regra das abas): `git reset --hard`, push forçado, apagar recursivo, trocar para a main, gravar fora do projeto etc. são recusados com o motivo; trocar de pasta (`cd`, `pushd`, `Set-Location`) também;
- a saída vai para `vibe\<id>\recuperacao\f5-projeto.log`; terminou com código 0 = ok; ainda rodando depois de 15 s (servidor) = ok e fica rodando; outro código = a ação falhou e conta como volta.
- (DEV2-016) o processo que ficou rodando tem o PID guardado em `recuperacao\f5-projeto.pid.json`; antes de um F5 novo e no fim do ciclo o Termix encerra **só esse PID, com a árvore de processos** (`taskkill /T`), depois de conferir que ele ainda é o shell que o Termix abriu (PID reaproveitado por outro programa não é encerrado). Com o app fechado à força, o processo fica (não há quem encerre).

### Arquivos novos em `vibe\<id>\`

`diagnosticos\Tk-n.md` (Termix), `recuperacao\Tk-n.json` (orquestrador), `recuperacao\f5-projeto.log` (Termix), `pedidos\pedido-Tk-recuperacao-n.md` e, ao dividir, `plano.antes-de-dividir-Tk.md`. Nada é apagado.

**Testar sem tokens:** o teste do módulo (`rec15.js`: diagnóstico, pedido, leitura e validação da decisão, dividir, F5 do projeto inofensivo e barrado) e o do app com o Claude Code falso da DEV2-007 (`run15.js`: `"rec:Tk"` no roteiro do falso grava a decisão; `"acao:ms"` dá demora a uma ação). `vibeTest.f5Projeto()` roda o comando da política e `vibeTest.tela('dev')` mostra o texto que vai ao diagnóstico.

## Deploy pelo Termix (DEV2-016)

Decisões do Ygor (2026-11-11): o DEV1 é o responsável pelo projeto e tem autorização total para deploy na main; sem o fluxo, quem abre é o dono. **O deploy é feito pelo Termix, em código, nunca pelo agente**: a trava continua barrando a main para a IA. Voltar versão é por `git revert`, nunca reset nem force; nenhuma tag remota é apagada. Para DEV2..DEV5 o fim do ciclo é enviar a própria branch com o handoff. Código: `src/vibe/deploy.js` (processo principal) e a etapa `deploy` do ciclo em `src/renderer/vibe/vibe.js`.

### Quando o deploy sai

Tarefa `[DEPLOY]` com a política permitindo ("Sempre", ou "Automático a partir de um marco" com o marco atingido), ou autorizada ("Pedir autorização"). A tarefa não vai ao Dev: o ciclo entra na etapa **deploy**, sem gastar tokens. Marco não atingido, "Nunca" e papéis DEV2..DEV5: pausa como antes. O deploy só roda entre tarefas (nenhum agente trabalhando na pasta) e um por vez no app.

### Os passos (`deployExec`)

1. **Confere:** HEAD na branch de trabalho (a do papel com o fluxo; `vibe/<pasta>` sem ele), árvore limpa (arquivos versionados; não versionados não contam), remoto `origin` e `git fetch --tags`. Se a main já tem tudo da branch: "nada novo para publicar" (a tarefa fica feita, sem tag).
2. **Portão de qualidade** (o comando da política) **na branch de trabalho**, pelo verificador da trava. Falhou: nada é publicado e a falha vai para a **recuperação da DEV2-015** (diagnóstico, decisão do orquestrador). O Dev conserta na branch, a revisão aprova e o Termix tenta o deploy de novo; as voltas continuam contando (esgotadas, a tarefa vira pendência). Sem portão, só "Pedir autorização" publica (fica registrado no log): desde a DEV2-021, com "Sempre" ou "Marco" o portão é **obrigatório** (a tela "Antes de iniciar" e a edição da política avisam e não gravam; o processo principal também recusa o deploy, etapa `politica`, e o ciclo pausa).
3. **Leva a branch para a main** (a main local é antes alinhada com a do origin, só por fast-forward; divergência = pausa, nunca reset):
   - com o fluxo (DEV1): **fast-forward** da dev1 para a main, como o `/fluxo:promover`; sem fast-forward possível, **merge --no-ff**;
   - sem o fluxo: **merge --no-ff** da `vibe/<pasta>` na main;
   - conflito: `git merge --abort`, volta para a branch e trata como falha (vai para a recuperação: o Dev traz a main para a branch e resolve lá). Nada se perde.
4. **Envia a main** (`refs/heads/main`, sem força), cria a **tag anotada** e envia a tag: `deploy-AAAAMMDD-HHMM` (com `-2`, `-3` se já existir) ou `v<versão>` quando a versão do `package.json` da branch for diferente da main e a tag ainda não existir. Envio da main recusado: pausa ("Continuar" tenta de novo; a main local fica com a junção e o próximo envio a leva).
5. **Receita de deploy** com a **main em checkout**, na pasta do projeto, um comando por linha (linhas com `#` são ignoradas), cada um pelo **verificador da trava** (como o F5 do projeto: trocar de pasta é recusado), até 10 min por comando. Log em `vibe\<id>\deploys\<tag>.log` (git, portão e receita).
6. **Volta para a branch de trabalho** e o ciclo segue. O painel marca a tarefa "publicado pelo Termix (tag)" e o sino avisa.

### Receita que falha depois do envio

A main e a tag **já foram enviadas** e a publicação falhou. O ciclo pausa ("Deploy: a main foi enviada, a publicação falhou") com a mensagem clara e três opções: **"Rodar a receita de novo"** (main em checkout, receita, volta; deu certo, o ciclo segue), **"Voltar versão"** e **"Seguir sem publicar"** (a tarefa vira pendência). O Termix não tenta desfazer nada sozinho.

### Pedir autorização

O Termix monta o resumo (commits que entram, modo fast-forward ou merge, portão, receita), grava o pedido em `vibe\<id>\deploys\autorizacao.json` (status "aguardando") e pausa ("Aguardando autorização de deploy"). O **sino** e o **painel** mostram **"Autorizar deploy"** e **"Negar"** (sem "Continuar"). Autorizado: segue para os passos acima. Negado: a tarefa vira **pendência** ("deploy negado") e o ciclo segue.

**Ponto de aprovação preparado para o Telegram (DEV2-019):** a decisão é sempre gravada no arquivo de autorização (`deployAut(id, 'decidir', { decisao, origem })`), e o relógio do ciclo (5 s) lê o arquivo enquanto a pausa espera: uma decisão gravada por outro caminho (ex.: o Telegram, no processo principal) é aplicada igual à do painel, com a origem registrada.

### Voltar versão

No painel, **"Deploys (versões)"** lista os deploys enviados (tag, data, fast-forward ou merge, commits, status, REVERTIDO) com **"Voltar para antes deste"**, **"Abrir log"** e, se a receita falhou, **"Rodar a receita de novo"**. "Voltar para antes deste" pede **confirmação explícita** no próprio painel e então:

- desfaz, do mais novo até o escolhido, cada deploy ainda não revertido: **`git revert -m 1` do merge**, ou **`git revert` dos commits do intervalo** no fast-forward (se o intervalo tiver merges, por exemplo a main trazida para a dev1, um único commit de revert com a diferença líquida do intervalo, porque o `git revert` de um intervalo com merges não funciona);
- os reverts são feitos numa branch temporária `termix-volta-...` a partir da main; só se todos derem certo a main avança (fast-forward) e é **enviada sem força**; conflito = `git revert --abort`, a main não muda (nem a local nem a do origin) e a branch temporária fica com o que foi feito;
- depois, pergunta se roda a receita de novo ("Rodar a receita" / "Agora não").

Com um agente trabalhando, voltar versão e rodar a receita esperam (o painel avisa). Com o fluxo (DEV2-021), depois de voltar versão o Termix **junta a main na dev1** (`merge --no-ff`, sem força) e envia a dev1, para ela também ter o revert. Conflito: `merge --abort`, aviso no painel e nada descartado (junte à mão). Para trazer de volta o que foi revertido, é preciso **"reverter o revert"** (`git revert` do commit de revert); juntar a branch de novo não traz (o painel diz isso numa frase).

### Fim do ciclo de DEV2..DEV5

Projeto com o fluxo e papel DEV2..DEV5 (fora do Mutirão): ao terminar as tarefas, o Termix pede ao orquestrador, num pedido curto em arquivo (`pedidos\pedido-fim-handoff.md`), para reescrever o `docs/HANDOFF_DEVn.md` em alto nível (o que mudou, riscos, como validar, status; sem código, sem commit). Depois faz o commit **só desse arquivo** e envia **só a devN** (sem força; se a devN do remoto avançou, busca e junta antes, e com conflito cancela e avisa). O painel e a notificação dizem o resultado ("Enviar a branch e o handoff de novo" se falhar). O DEV1 é avisado pelo fluxo normal. **DEV2..DEV5 nunca publicam na main**: o deploy, a receita e o voltar versão são recusados no processo principal, não só escondidos na tela.

### Arquivos novos em `vibe\<id>\deploys\`

`deploys.json` (registro de cada deploy: tag, branch, tipo, SHA antes e depois, commits, portão, receita, status, revertido), `<tag>.log`, `<tag>-receita-<data>.log`, `<tag>-volta-<data>.log` e `autorizacao.json`. Nada é apagado.

**Testar sem tokens:** o teste do módulo com remotos bare locais (`dep16.js`: Sempre com fast-forward e com merge --no-ff, portão falhando, conflito cancelado, receita falhando depois do envio, voltar versão nos casos merge, fast-forward e intervalo com merge, autorização, pausar/retomar, marco, DEV2 recusado, fim do DEV2, F5 do projeto) e o do app com o Claude Code falso (`run16.js a|b`).

## Vibe de tarefa (DEV2-017)

Decisão do Ygor (2026-11-11): o formulário completo de entrega fica só para **projeto do zero**. Num **projeto em andamento**, o usuário descreve a tarefa e o Termix cria o mesmo painel com orquestrador e dev, com todas as funções (política, recuperação, deploy, Parar e Continuar). Código: `src/vibe/tarefa.js` (processo principal) e a tela em `src/renderer/vibe/vibe.js`.

### Escolha inicial

O botão **Vibe Coding** abre primeiro a escolha: **"Projeto novo (entrega completa)"** (o formulário de sempre, com o "Baixar modelo") ou **"Tarefa num projeto em andamento"**. Até escolher, o rodapé só tem "Fechar". Os dois formulários têm o link **"Trocar o tipo"**, que volta à escolha. Com um ciclo em andamento no projeto, a tela abre direto no tipo dele.

### Formulário da tarefa

1. Projeto (obrigatório); 2. **O que fazer** (obrigatório); 3. **Critério de pronto** (obrigatório); 4. **O que não pode** (opcional); 5. **Arquivos ou telas envolvidos** (opcional). O rascunho fica salvo junto do rascunho do projeto. O botão é **"Iniciar tarefa"**. Projeto sem git é recusado (o Vibe de tarefa é para projeto em andamento).

Abaixo do projeto, recolhível, o **resumo do projeto que vai para o orquestrador**, montado pelo Termix **sem IA**: branch atual e a de trabalho dos agentes, papel do fluxo, últimos commits, primeiras linhas úteis do `README` e do `CLAUDE.md` (sem comentários HTML) e a tarefa em andamento do `TASKS` (a seção "## Em andamento" do `docs/TASKS.md` ou `TASKS.md`; sem ela, as linhas com "EM ANDAMENTO" e o título da tarefa acima).

### Entrega sintética e plano

"Iniciar tarefa" grava em `vibe\<id>\` uma entrega `modo: "tarefa"` (como a do Mutirão): `entrega.json` (objetivo = primeira linha do "o que fazer", critério, o que não pode, sem acessos) e `estrutura.md` (a tarefa e o resumo do projeto). Nada é escrito na pasta do projeto. O pedido de planejamento é próprio, curto e em arquivo: é uma tarefa num projeto em andamento; ler o repositório só no necessário, começando pelos arquivos citados e usando grep, sem ler arquivos grandes inteiros, diffs nem o histórico todo; **poucas tarefas** (o normal é 1 a 3, no máximo 5), só o que cumpre o critério de pronto, sem refatorar o que não foi pedido; as mesmas marcas `[DEPLOY]`, `[HUMANO]` e `[SEM COMMIT]`; e só as perguntas indispensáveis (o normal é nenhuma). O trecho da política para o planejador vai igual ao do Vibe.

Daí em diante é **o mesmo ciclo do Vibe**: perguntas, "Plano pronto", "Antes de iniciar" (política), execução com a trava, recuperação, deploy pelo Termix e fim de ciclo de DEV2..DEV5. No fim, o painel e a notificação dizem **"Tarefa concluída"**.

### Histórico e abas reaproveitadas

- `vibe\<id>\tarefas.json`: uma linha por tarefa (n, o que fazer, critério, início, status, fim, branch, feitas com o commit, pendências com o motivo). Status: **andamento**, **concluida** (no fim do ciclo) ou **interrompida** (uma tarefa nova começou antes de a anterior terminar). Até 100 tarefas.
- **Uma tarefa nova não apaga a anterior:** a entrega anterior vai para `historico\<data>\` e o ciclo (estado, plano, resultados, revisões, pedidos) para `historico\ciclo-<data>\`, como sempre.
- O painel mostra **"Tarefa atual (n)"** e **"Tarefas anteriores"** (status, feitas, commits e pendências). Concluída a tarefa, o formulário volta em branco como **"Nova tarefa"**.
- **As abas do orquestrador e do Dev são reaproveitadas:** a tarefa nova usa as mesmas abas do ciclo anterior. O orquestrador recebe Ctrl+U e `/clear` e o `SessionStart` do clear dispara o pedido do plano; o Dev recebe o `/clear` antes de cada tarefa, como sempre. Aba parada (app reaberto) volta com uma conversa nova; sem as abas (fechadas), o Termix cria as duas como antes. O "Projeto novo" continua criando abas novas.

### Canais e testes

Canais `vibe:tarefaResumo`, `vibe:tarefaNova`, `vibe:tarefaFim` e `vibe:tarefaHist`. No modo de teste, `vibeTest.modo('projeto'|'tarefa'|'')` e `vibeTest.tarefa({ oQue, criterio, naoPode, arquivos })`. **Testar sem tokens:** `tar17.js` (módulo: resumo, conferência, entrega sintética, pedido do plano, histórico de 2 tarefas seguidas e a interrompida, trava na aba) e `run17.js` (app com o Claude Code falso: escolha inicial, formulário com o resumo, tarefa 1 até o fim do ciclo do DEV2, tarefa 2 nas mesmas abas com `/clear` e o painel com o histórico).

## Roteiro

Renumerado pelo Ygor em 2026-11-06.

- **DEV2-001** — Casca isolada do módulo, chave em Configurações e duas telas "Em construção". *(feita)*
- **DEV2-002** — Tela de entrega do Vibe Coding (formulário engessado) e .md modelo para baixar. *(feita)*
- **DEV2-003** — Agentes (orquestrador e dev), plano e só as perguntas necessárias, sem executar o código do projeto. *(feita)*
- **DEV2-004** — Ciclo de execução autônomo, com travas em código (branch permitida, nada que apague dados). *(feita)*
- **DEV2-005** — Tela do Mutirão: chat com o orquestrador, divisão por branch e contador de entregas. *(feita)*
- **DEV2-006** — "Implementação automática" ao chegar em N/N, e o pedido em arquivo como padrão do Vibe. *(feita)*
- **DEV2-007** — Robustez do ciclo: [SEM COMMIT], limite de tentativas, tempo limite, Parar no meio do turno e push com o remoto à frente. *(feita)*
- **DEV2-008** — Guia de validação do MVP do Vibe/Mutirão: `docs/VALIDACAO_MVP_VIBE.md`. *(feita)*
- **DEV2-009** — Pendências do MVP: marcas do plano numa rodada real, aviso de deploy sem marca, alarme falso de main/master, plano final do Mutirão com o projeto inteiro e a publicação, /clear depois de Esc real e `--ours/--theirs` só com merge em andamento. *(feita)*
- **DEV2-014** — Política de autonomia por projeto: tela "Antes de iniciar", edição no meio do ciclo e "Pausar deploy". *(feita)*
- **DEV2-015** — Recuperação de erro com diagnóstico, 3 voltas do orquestrador e "F5" da aba do Dev e do projeto. *(feita)*
- **DEV2-016** — Deploy feito pelo Termix, com tag, portão e voltar versão por revert. *(feita)*
- **DEV2-017** — Vibe de tarefa (modo rápido) para projeto em andamento, criando também o painel com orquestrador e dev, com todas as funções. *(feita; ver "Vibe de tarefa")*
- **DEV2-018** — Proposta ao Rodrigo do botão "Delegar tarefa" (só documento). *(feita)*
- **DEV2-019** — Telegram, por último e junto com o Ygor.
- O Mutirão fica para depois, até o Ygor aprovar o Vibe.
- Depois — Celular (Telegram ou app próprio), sem prioridade. No MVP, o celular usa o Remote Control do Claude Code.

## Perguntas em aberto

- ~~Como cada sócio recebe a parte no Termix dele~~: decidido na DEV2-005 (a branch do projeto aberto + `mutirao/partes/<branch>.md` depois de sincronizar com a do dono).
- ~~Limite da autonomia de commit/push dos agentes~~: decidido (ver "Princípios e regras dos agentes").
