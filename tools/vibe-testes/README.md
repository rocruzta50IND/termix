# Testes do módulo Vibe Coding e Mutirão (dev2)

Scripts de teste do módulo (`src/vibe/` e `src/renderer/vibe/`). **Não fazem parte do `npm run check`.**

**Avisos**
- **Nunca rodam em projeto real e nunca gastam IA.** Usam repositórios git de brinquedo, remotos locais, um Claude Code **falso** (`fake/` e `fakeret/`) e uma configuração do Claude Code de **teste** (`CLAUDE_CONFIG_DIR` e `TERMIX_VIBE_CLAUDE_JSON` apontam para a pasta temporária; o `~/.claude.json` de verdade não é tocado).
- Tudo que eles criam fica na pasta temporária do sistema, em `termix-vibe-testes` (no Windows, `%TEMP%\termix-vibe-testes`): projetos de teste, logs (`runNN.log`) e capturas (`shots*`). Pode apagar essa pasta quando quiser.
- Windows: os testes com Electron usam `electron.exe` e `claude.cmd`.
- Os agentes falsos são copiados para a pasta temporária a cada uso (com espaço no caminho do repositório, como em `DEV 2 Central`, o Termix não acha o `claude.cmd` falso no PATH).

- **Pasta temporária com espaço no caminho** (ex.: usuário do Windows `C:\Users\Nome Sobrenome`): os testes com Electron que usam o agente falso estouram o tempo, porque o `claude.cmd` falso não roda de um caminho com espaço. Rode com `TEMP` e `TMP` apontando para uma pasta sem espaço (ex.: `D:\termix-vibe-tmp`).
- **Botões do módulo (TASK-135):** ficam no rail inferior (`#fpill`), não mais no cabeçalho; os testes procuram ali.

**Pré-requisito:** `npm install` na raiz do repositório (a dev1 0.7.0 trouxe a dependência `ws`; os testes com Electron precisam do Electron instalado).

Os comandos abaixo valem a partir da raiz do repositório. A raiz é descoberta pelo próprio script; o argumento da raiz é opcional.

## Sem Electron (rápidos, segundos a poucos minutos)

Todos de uma vez: **`npm run test:vibe`** (ou `node tools/vibe-testes/rodar-sem-electron.js`). Imprime cada teste com o resultado e o esperado, e termina com "Todos como esperado". Um por um: `node tools/vibe-testes/<nome>.js`.

| Teste | O que cobre | Esperado |
|---|---|---|
| `dep16` | deploy feito pelo Termix (portão, tag, receita, voltar versão, autorização) com remotos locais | 68 OK |
| `rec15` | recuperação de erro do ciclo, diagnóstico e decisão | 36 OK (com caminho temporário longo, 35 OK e 1 falha conhecida: checagem de tamanho do pedido) |
| `pol14` | política de autonomia por projeto | 55 OK |
| `trava13` | verificador da trava (cada regra, permitido e bloqueado) | 113 OK |
| `mod5` | Mutirão: papel, conferência, publicação, parte do sócio, entrega, contador | 31 OK |
| `mod6` | implementação automática do Mutirão | 41 OK |
| `mod7` | robustez do ciclo (tarefa sem commit, envio final com remoto à frente) | 23 OK |
| `mod9` | conferências do plano e da entrega do Mutirão (usa `fixtures/real9-plano.md`) | 16 OK |
| `tar17` | Vibe de tarefa (resumo do projeto, entrega, histórico) | 33 OK |
| `mut23` | Mutirão nativo (modos, publicado, rascunho da tarefa) | 97 OK |
| `org26a` | Organizador (várias pastas, projeto único, recomendadas) | 14 OK |
| `del25` | Delegar tarefa (módulo, remoto bare e duas "máquinas") | 77 OK |
| `ret26` | Retomar projeto (estrutura, chats antigos, coleta em cópia) | 38 OK |

## Com Electron e agente falso (instância isolada, uma por vez; minutos cada)

Rode **um de cada vez**, sem outro Termix de teste aberto: `node tools/vibe-testes/rodar-electron.js <teste>` (sem argumento, lista os testes). Cada um abre o app com uma pasta de dados própria e uma porta de depuração, confere por CDP **só o conteúdo do app** (nunca a tela inteira) e termina com `N OK, M FALHOU`.

| Comando | O que cobre | Esperado |
|---|---|---|
| `... run7` | ciclo do Vibe de ponta a ponta com o agente falso | 23 OK |
| `... run15` | recuperação de erro e F5 no app | 29 OK |
| `... run16 a` e `... run16 b` | deploy e fim de ciclo dos devs auxiliares no app | 28 OK e 9 OK |
| `... run17` | Vibe de tarefa (escolha inicial, formulário, histórico) | 26 OK |
| `... run22` | módulo sobre o layout da dev1 | 10 OK |
| `... run23` | Mutirão nativo no app | 52 OK |
| `... run24` | Organizador (projeto único, mapa, oferta com os chats) | 26 OK |
| `... run25` | Delegar tarefa no app (duas instâncias; liga o Delegar só pelo modo de teste) | 35 OK |
| `... run26` | pop-up Retomar projeto, coleta, estrutura, aviso ao fechar | 44 OK |
| `... embed-delegar27` | Delegar estacionado no app normal e modo `--embed` (usa Edge ou Chrome sem janela) | 15 OK |

Observações:
- Se uma rodada anterior deixou processos do Electron abertos, feche-os antes: com eles sobrando, um teste pode estourar o tempo (o `run25` já falhou assim e passou ao ser repetido sozinho).
- O Delegar está **estacionado** (`DELEGAR_ATIVO = false` em `src/renderer/vibe/delegar.js`). O `run25` o liga com `TERMIX_VIBE_TEST=1` e `TERMIX_DELEGAR_TESTE=1`, sem mudar a constante.
- O `run10` (credencial real) e qualquer teste com Claude Code real **não existem aqui**: ficam para a validação manual.
- Arquivos de apoio: `lib.js` (raiz, pasta temporária e configuração de teste), `run6-montar.js` (usado pelo `run7`), `fake/` e `fakeret/` (Claude Code falsos), `fixtures/`.
