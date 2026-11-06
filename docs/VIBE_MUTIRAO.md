# Vibe Coding e Mutirão — desenho do módulo

Desenho aprovado pelo Ygor (2026-11-06). Frente exclusiva da dev2 (numeração DEV2-xxx). Estado atual: casca (DEV2-001) e tela de entrega do Vibe Coding (DEV2-002), atrás da chave **Configurações > Experimental > Vibe Coding e Mutirão (experimental)**, desligada por padrão.

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
- Quando precisar do humano: **notificação** do Termix agora; **WhatsApp** depois.

## Arquitetura

O módulo fica separado; o núcleo só faz as ligações. O botão só chama a função do módulo, sem quebrar nada.

| Onde | O que fica |
|---|---|
| Núcleo `src/main.js` | Uma linha: o `require` do módulo com `create({ ipcMain, dialog, app, getWin, logError })`, protegido por try/catch (erro no módulo é registrado em `erros.log` e o app segue). O próprio módulo registra os canais `vibe:*`, cada um com try/catch. |
| Núcleo `src/preload.js` | Uma ponte genérica `vibe(canal, ...)`, que só alcança canais `vibe:*`. |
| Núcleo `src/renderer/index.html` | Um `<link>` para o CSS e um `<script>` depois do `app.js`. |
| Núcleo `src/renderer/app.js` | Nada. |
| Módulo `src/vibe/` (processo principal) | `index.js`: fábrica com o estado, os canais `vibe:*`, a conferência dos arquivos e a gravação da entrega. `modelo-entrega.md`: o modelo que a tela oferece para baixar. No futuro, a criação dos agentes, a divisão por branch e o ciclo autônomo. |
| Módulo `src/renderer/vibe/` (interface) | Botões do cabeçalho, chave em Configurações e telas. Usa o que o `app.js` já expõe (estado `S`, `save`, `modal`) e se pendura no cabeçalho e na página Configurações observando o DOM. |

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
- **Iniciar Vibe Coding:** desabilitado até tudo estar completo. Clicado, o processo principal confere tudo de novo (a regra que vale é a dele), grava a entrega e mostra "Entrega pronta. Os agentes chegam na próxima etapa (DEV2-003)". Não inicia nada. Depois de gravar, o botão só volta a habilitar quando algo muda.
- **Entrega existente:** ao abrir, um aviso azul mostra a data da entrega pronta. Iniciar de novo pede confirmação dentro da própria tela ("Substituir entrega"). A anterior **não é apagada**: vai para `historico\<data>\`.
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

## Roteiro

- **DEV2-001** — Casca isolada do módulo, chave em Configurações e duas telas "Em construção". *(feita)*
- **DEV2-002** — Tela de entrega do Vibe Coding (formulário engessado) e .md modelo para baixar. *(feita)*
- **DEV2-003** — Criação dos dois agentes (orquestrador e dev) e ciclo autônomo.
- **DEV2-004** — Tela do Mutirão: chat com o orquestrador, divisão por branch e contador de entregas.
- **DEV2-005** — "Implementação automática" ao chegar em N/N.
- **DEV2-006** — Aviso por WhatsApp quando precisar do humano.

## Perguntas em aberto

- **Limite da autonomia de commit/push dos agentes.** Recomendação: só a branch do papel, nunca a main, nada que apague dados.
- **Como cada sócio recebe a parte no Termix dele** (detecção da branch ao abrir o projeto, aviso, convite).
