# Vibe Coding e Mutirão — desenho do módulo

Desenho aprovado pelo Ygor (2026-11-06). Frente exclusiva da dev2 (numeração DEV2-xxx). Estado atual: casca (DEV2-001), tela de entrega do Vibe Coding (DEV2-002) e criação dos agentes com plano e perguntas (DEV2-003), atrás da chave **Configurações > Experimental > Vibe Coding e Mutirão (experimental)**, desligada por padrão.

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
| Núcleo `src/main.js` | Uma linha: o `require` do módulo com `create({ ipcMain, dialog, app, getWin, logError })`, protegido por try/catch (erro no módulo é registrado em `erros.log` e o app segue). O próprio módulo registra os canais `vibe:*`, cada um com try/catch. |
| Núcleo `src/preload.js` | Uma ponte genérica `vibe(canal, ...)`, que só alcança canais `vibe:*`. |
| Núcleo `src/renderer/index.html` | Um `<link>` para o CSS e um `<script>` depois do `app.js`. |
| Núcleo `src/renderer/app.js` | Nada. |
| Módulo `src/vibe/` (processo principal) | `index.js`: fábrica com o estado, os canais `vibe:*`, a conferência dos arquivos e a gravação da entrega. `modelo-entrega.md`: o modelo que a tela oferece para baixar. Desde a DEV2-003, também os arquivos do ciclo (estado, plano, perguntas, respostas) e o texto dos pedidos ao orquestrador. |
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
3. **Pedido do plano.** O Termix digita no terminal do orquestrador um pedido curto (uma linha) que aponta para os arquivos da entrega em `vibe\<id>\` e pede, na mesma pasta: `plano.md` (começa com "Branch de trabalho: …"; tarefas até o fim, na ordem, cada uma "## T1 — título" com Objetivo, Critério de pronto, Arquivos prováveis, Validação e Não fazer) e `perguntas.json` (`{"perguntas":[{"id","texto","porque","opcoes"}]}`, só o indispensável, gravado sempre, mesmo vazio). O pedido traz as regras de autonomia e de economia acima, proíbe mexer no código e escrever fora dessa pasta e manda encerrar o turno com "PLANO GRAVADO".
   - O texto longo chega ao Claude Code como colagem e um Enter imediato é engolido; por isso o Enter vai 1 s depois e, enquanto o hook de prompt enviado não chega, é repetido (até 4 vezes, a cada 3 s; com a caixa vazia o Enter não faz nada).
4. **Fim do turno.** Quem percebe é o Termix, pelo hook `Stop` que o app já recebe (zero token). Ele lê `plano.md` e `perguntas.json`. Sem `perguntas.json` mas com um plano gravado nesse turno, vale como "nenhuma pergunta". Sem plano: estado "erro", com aviso, notificação e "Retomar".
5. **Perguntas.** Havendo perguntas, a tela mostra um formulário (opções viram botões de escolha, com um comentário opcional; sem opções, texto livre) e o app notifica pelo mecanismo de avisos que já existe (sino, dica, som e Windows sem foco). "Enviar respostas" exige todas respondidas, grava `respostas.json` e digita um pedido curto para o orquestrador fechar o plano ("PLANO FECHADO"). Se ele voltar com perguntas novas, abre outra rodada.
6. **Plano pronto.** "Plano pronto, N tarefas. A execução automática chega na DEV2-004." O plano aparece na tela. N = quantidade de IDs T1, T2… distintos em títulos ou itens de lista; sem IDs, o número não aparece (não conta seções como tarefas).
7. **Conferência do plano (zero token).** Se o plano mandar fazer commit ou push na main/master, a tela mostra um alerta. No teste real o orquestrador escreveu "Commit em master" apesar da regra: **prompt não é trava**; a trava em código fica para a DEV2-004.

### Painel de andamento

Fica na tela do Vibe Coding, logo abaixo do projeto: **Preparando plano → Perguntas (N) → Plano pronto**, uma linha do que está acontecendo, avisos, o formulário de perguntas, o plano (recolhível) e uma dica curta de economia de tokens por etapa. Com um ciclo, a entrega (itens 2 a 7) fica recolhida; "Iniciar" fica bloqueado enquanto o ciclo está em andamento.

### Parar, retomar e reabrir o app

- **Parar Vibe Coding**: o Termix deixa de conduzir; se o orquestrador estiver no meio de um turno, manda Esc (interrompe). Não apaga nada e deixa as abas abertas.
- **Retomar**: primeiro lê os arquivos (zero token) e só pede algo ao orquestrador se faltar o plano ou se as respostas ainda não foram processadas.
- **Estado em `vibe\<id>\estado.json`** (fase, rodada, abas, datas, avisos). Ao reabrir o app, a tela mostra onde parou e **nada recomeça sozinho**: uma fase de espera vira "Pausado", com "Retomar". (O app continua restaurando as abas como sempre, sem mandar pedido.)
- **Novo ciclo**: os arquivos do ciclo anterior (`estado.json`, `plano.md`, `perguntas.json`, `respostas.json`) vão para `historico\ciclo-<data>\`; nada é apagado.

### Arquivos do ciclo em `%APPDATA%\Termix\vibe\<id-do-projeto>\`

`estado.json` (Termix), `plano.md` e `perguntas.json` (orquestrador), `respostas.json` (Termix, com as respostas do humano). No modo de teste (`TERMIX_VIBE_TEST=1`), `vibeTest` também injeta um `perguntas.json` de teste, responde, para e retoma.

## Roteiro

Renumerado pelo Ygor em 2026-11-06.

- **DEV2-001** — Casca isolada do módulo, chave em Configurações e duas telas "Em construção". *(feita)*
- **DEV2-002** — Tela de entrega do Vibe Coding (formulário engessado) e .md modelo para baixar. *(feita)*
- **DEV2-003** — Agentes (orquestrador e dev), plano e só as perguntas necessárias, sem executar o código do projeto. *(feita)*
- **DEV2-004** — Ciclo de execução autônomo, com travas em código (branch permitida, nada que apague dados).
- **DEV2-005** — Tela do Mutirão: chat com o orquestrador, divisão por branch e contador de entregas.
- **DEV2-006** — "Implementação automática" ao chegar em N/N.
- **DEV2-007** — Celular (Telegram ou app próprio), sem prioridade. No MVP, o celular usa o Remote Control do Claude Code.

## Perguntas em aberto

- **Como cada sócio recebe a parte no Termix dele** (detecção da branch ao abrir o projeto, aviso, convite).
- ~~Limite da autonomia de commit/push dos agentes~~: decidido (ver "Princípios e regras dos agentes").
