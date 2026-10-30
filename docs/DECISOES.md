# DECISOES — Termix

Decisões de produto tomadas com o usuário e o motivo delas. Esta é a fonte de verdade para o comportamento do app: se algo aqui mudar, atualize este arquivo na mesma tarefa. Nada aqui é regra de código; o código está em `src/`.

## Escopo
- Uso **pessoal**, no **Windows 11**. App desktop em Electron, numa **janela única** (a ideia de janelas soltas foi descartada).
- Claude Code primeiro. Codex e outras ferramentas depois; no menu do "+" o Codex aparece como "Em breve".
- MVP: construir, usar e corrigir os problemas que aparecerem. O que não é essencial vai para o backlog (`docs/TASKS.md`).

## Fechar o app e restaurar
- Fechar o app **encerra todos os processos**, com confirmação que mostra quantas sessões estão ativas e quantas estão trabalhando.
- Ao reabrir, o app **restaura sozinho** os terminais que estavam abertos ao fechar (retoma a conversa pelo ID), sem aviso. Só volta o que estava aberto: abas fechadas pelo X antes continuam fechadas. Abre uma aba de cada vez, a ativa do projeto atual primeiro, para não pesar. (Antes perguntava; mudou na TASK-019.)
- Uma **tela de abertura** (logo pulsando) cobre o carregamento: some em fade quando as abas terminam de reabrir, com mínimo de ~0,9 s e teto de 8 s para não travar a entrada (TASK-018).

## Abas e conversas
- O **X da aba só fecha a aba**. A conversa fica guardada e pode ser reaberta (menu "Sessões fechadas" e a tela "Nenhum terminal aberto").
- **Arquivar é uma ação explícita.** Nada é apagado sem ação deliberada do usuário.
- Abas fechadas ou arquivadas **continuam contando no Consumo**.
- Abas podem ser **arrastadas** para reordenar (dentro do mesmo projeto).
- A tela "Nenhum terminal aberto" mostra o **+ Terminal**, a conversa **mais recente** (com "há quanto tempo") e a lista dos terminais abertos antes no projeto, sem rolagem.

## Projetos
- **Criar:** o app cria a pasta a partir do nome em `Documentos\Termix`.
- **Importar:** registra a pasta **onde ela está**, sem copiar nem mover. Ao importar, o app lista as conversas do Claude Code que já existem naquela pasta e abre abas só para as que o usuário marcar (retoma pelo ID exato). Abrir a mesma conversa em dois terminais ao mesmo tempo mistura o histórico, então o app avisa quando ela parece estar em uso.
- **Arquivar** e **remover do app** não tocam nos arquivos. **Excluir a pasta** só manda para a Lixeira do Windows, exige digitar o nome do projeto e **não é oferecido para projetos importados**.
- **Renomear** não muda o caminho da pasta.
- Vários agentes na **mesma pasta**: sem proteção no MVP; só há o indicador "trabalhando / aguardando".

## Reiniciar e retomar
- Reiniciar **retoma a conversa exata pelo ID**: `--session-id` na criação e `--resume <id>` depois. O `/clear` dentro do terminal cria uma conversa nova com outro ID (compactação e resume mantêm o ID); o app acompanha o ID pelos hooks e atualiza a aba, para o Retomar voltar na conversa atual.
- A retomada só é confirmada com **evidência** (processo vivo por cerca de 4 s).
- Se falhar, a aba **continua** e o app oferece "Tentar de novo" ou "Nova conversa". **Nunca cria uma conversa nova em silêncio.**
- Se o agente está trabalhando: "Aguardar finalizar e reiniciar" ou "Interromper e reiniciar".
- Aba criada que **nunca recebeu mensagem** não tem histórico (o Claude Code só grava depois da primeira mensagem): o app abre a **mesma conversa vazia** com `--session-id`, em vez de dar "No conversation found".
- A aba mostra "Retomar" quando está encerrada e o botão é só um ícone discreto (reiniciar).

## Permissões
- Cada aba é **Normal** ou **Dangerously** (`--dangerously-skip-permissions`, sem isolamento do sistema).
- A escolha **nunca vira padrão das próximas sessões sem o usuário pedir**.
- Dangerously é indicado por um **⚠ na aba** (com explicação ao passar o mouse). Não há selo grande.

## Consumo e limites
- Mostra **5 h e 7 d** (plano Max), lidos da status line do Claude Code, em uma cápsula no cabeçalho.
- Dado indisponível aparece como **"indisponível"**, nunca como zero.
- As porcentagens da conta **não são somadas por terminal**.
- Contexto, tokens e custo da sessão são coisas distintas; **custo é só estimativa**.
- Captura: um encaminhador (`src/statusline-wrapper.js`) é injetado por sessão com `--settings`, grava os dados e repassa tudo para a status line original do usuário, sem mudar o que ele vê.

## Plugins, Skills e MCPs
- No MVP são **somente leitura**, a partir dos arquivos reais de configuração (escopos User, Project e Local).
- Gerenciá-los pelo app é uma ideia que o usuário quer, **pós-MVP** (TASK-013).

## Estado "trabalhando / aguardando"
- Vem dos **hooks do Claude Code** (TASK-003): prompt enviado = trabalhando; terminou ou pediu atenção = aguardando. Sem hooks, vale a estimativa antiga (sem saída por 2,5 s); com hooks, 20 s de silêncio cobrem a interrupção com Esc.

## Dados e ambiente
- Dados salvos em `%APPDATA%\Termix` (`state.json`, gravado de forma atômica, e `metrics\`). O app se chamava Vitra: na primeira abertura os dados da pasta antiga são copiados.
- As variáveis de ambiente herdadas de uma sessão do Claude Code (`CLAUDECODE`, `CLAUDE_CODE_CHILD_SESSION` etc.) são **removidas** ao abrir terminais; senão o Claude Code desliga a gravação do histórico ("Transcript saving is off").
- Os terminais usam `@lydell/node-pty` + xterm 6 (WebGL só na aba visível).
- `state.json` tem backup (`state.bak.json`, a versão anterior, no máximo 1 por hora); se o principal estiver ilegível, o app abre com o backup.
- Só uma janela do Termix por vez: abrir de novo traz a que já existe.

## Instalador e portabilidade (TASK-010)
- Instalador NSIS **por usuário** (não pede administrador), Windows 10/11 x64, gerado com `npm run dist` em `dist\Termix-Setup-<versão>.exe`. Cria atalhos no menu Iniciar e na área de trabalho; desinstalar **não** apaga os dados em `%APPDATA%\Termix`.
- O app instalado **não depende de Node.js**: com `node` no PATH os hooks/status line usam `node`; sem ele, o próprio Termix executa os scripts (`Termix.exe --termix-run <script>`).
- O Claude Code é procurado no PATH e nas pastas conhecidas (`~\.local\bin`, `%APPDATA%\npm`); se não achar, a aba mostra como resolver. O app **não instala** o Claude Code.
- Empacotado **sem `asar`** (módulo nativo do terminal e scripts chamados por fora ficam como arquivos normais; mais simples e seguro).
- O instalador **não é assinado**: o Windows SmartScreen avisa "editor desconhecido" (Mais informações → Executar assim mesmo). Assinatura exige certificado pago; fica para depois.

## Janela e fundo
- Dois modos: **Degradê** (janela transparente, o app é o degradê) e **Ofuscado** (o mesmo degradê, mais leve, sobre o vidro fosco do Windows 11).
- Trocar entre os dois **reabre o app**, porque o tipo da janela só é definido na criação e os terminais fecham (melhoria: TASK-008).
- Maximizado, o app ocupa a tela toda, sem margem nem cantos arredondados.

## Fluxo de trabalho do projeto
- Metodologia DEV2 → DEV1 → MAIN (`WORKFLOW.md`). Esta máquina é **DEV1**. A `dev2` não foi criada (trabalho individual).
- O `/clear` só é dado quando uma tarefa termina e o usuário aprova; o estado vive em `docs/TASKS.md` e `docs/CHANGELOG_DEV.md`. Comandos do projeto: `/retomar` e `/encerrar-tarefa`.
