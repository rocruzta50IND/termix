# Proposta ao DEV1: botão "Delegar tarefa" (com perfil e PIN por sócio)

- **Para:** Rodrigo (DEV1, responsável pelo Termix, com autorização na main)
- **De:** dev2 (DEV2-018), a pedido do Ygor
- **Data:** 2026-11-11
- **Natureza:** proposta de produto em alto nível, **sem código**. A dev2 não implementa nada disto: o botão, o perfil e o PIN são do núcleo do Termix e ficam com o DEV1, se ele aprovar.
- **Status (DEV2-025, 2026-11-12):** **implementada como experimento da dev2**, com as decisões do Ygor e do orquestrador por cima desta proposta (ver "Delegar tarefa" em `docs/VIBE_MUTIRAO.md`).
  - **Feito:** botão "Delegar tarefa" no cabeçalho (só o responsável: DEV1 com o fluxo); pedido escrito pelo orquestrador do responsável e revisado por ele; pedido e índice na dev1 (`.termix/delegar`), commit e push só da dev1; devN livre (dev2 a dev5, ocupada = pedido aberto) criada a partir da dev1 e registrada no `.claude/fluxo.json`; recebimento sem IA (a cada 5 min e no "Atualizar"), aviso no sino e no projeto, "Começar" explícito, marcador de estado na devN (respostas às perguntas 2 e 3: o Termix do responsável lê só o marcador; quem recebe grava o marcador na própria branch); "Entregar" com o handoff; "Analisar entrega" lendo só o handoff; aprovar/reprovar gravados no índice; painel com os estados.
  - **Ficou com o Rodrigo:** o **login do Hub e o PIN** (seção 3 e perguntas 1, 4 e 7: hoje a conta é um **mock** com 5 nomes, em `src/vibe/contas.js`, escolhida em Configurações, sem PIN); o lugar final do botão; a **integração** (`/fluxo:integrar`, que continua manual: o Termix não junta branches); o **Telegram** (DEV2-019); o mapa branch → pessoa no `fluxo.json` (a pessoa fica só no índice do pedido); "sair da lista" da devN sem pedidos abertos (a branch só fica livre para um novo pedido; o nome não é removido do `fluxo.json`).
  - **Diferenças em relação ao texto abaixo:** a branch é a próxima livre (pergunta 5: rotativa); o botão exige o fluxo (pergunta 6); o Vibe de tarefa abre por "Começar com Vibe de tarefa"/"Seguir com Vibe de tarefa" (pergunta 8: sem esperar nada, o pedido também abre numa aba de orquestrador); reprovada não volta a "aberta": o pedido fica reprovado e um novo pedido libera a branch.

---

## 1. Problema

Nas palavras do Ygor: hoje o Rodrigo precisou criar a dev2 à mão, explicar tudo ao orquestrador dele e só então o pedido chegou ao Ygor. O botão deve automatizar isso.

Os passos manuais de hoje, para passar uma tarefa a um segundo dev:

1. **Criar a branch e registrar o dev:** criar a `dev2` a partir da `dev1`, enviar ao remoto e acrescentar o dev em `.claude/fluxo.json` (pelo plugin fluxo ou à mão).
2. **Explicar ao orquestrador:** o DEV1 conta ao orquestrador dele o que quer, quem vai fazer e o que espera de volta.
3. **Fazer o pedido chegar à pessoa:** por mensagem, fora do Termix, sem registro no projeto. A pessoa precisa entender o pedido, configurar o papel na máquina dela e montar o próprio contexto.
4. **Saber que ela terminou:** só se ela avisar. Nada no Termix do DEV1 mostra que a entrega chegou.
5. **Analisar e integrar:** o DEV1 pede a consulta à dev2, o orquestrador lê o handoff, compara com o que foi pedido (de memória) e, com a aprovação, integra.

Cada passo depende de alguém lembrar e explicar de novo, e o pedido original fica espalhado em conversas.

## 2. A proposta: botão "Delegar tarefa"

### 2.1 Onde e para quem

- Dentro da produção de **qualquer projeto** do Termix que use o fluxo.
- Só aparece para o **DEV1 do projeto** (o responsável). Para os outros papéis, o botão não existe; quem recebeu um pedido vê só o aviso do pedido dele.
- Ativa **um** dev auxiliar: a `dev2`, mostrada com o nome da pessoa, por exemplo **"dev2 (Zanata)"**.
- Mais de um dev auxiliar ao mesmo tempo deixa de ser "Delegar tarefa" e passa a ser o **Mutirão** (divisão do projeto entre vários sócios). O botão pode sugerir o Mutirão quando o DEV1 tentar nomear uma segunda pessoa.

### 2.2 Ciclo de vida da dev2

- A dev2 fica **ativa enquanto houver tarefa para ela** ou até o projeto terminar.
- Sem pedido em aberto (tudo entregue e integrado, ou cancelado), ela **sai da lista de devs ativos** do projeto. O histórico do git fica: a branch, os commits e o arquivo de pedidos continuam no remoto.
- Delegar de novo depois disso reativa a dev2, para a mesma pessoa ou para outra.

### 2.3 O pedido

- O DEV1 descreve a tarefa ao **orquestrador da dev1**, que escreve o pedido completo: objetivo, contexto mínimo, o que não pode ser feito e o **resultado esperado** (o critério com que a entrega será comparada depois).
- O pedido vai **pelo git, sem servidor**: um arquivo de pedidos **na dev1**, endereçado à dev2 (por exemplo, uma pasta de pedidos com um arquivo por pedido e um estado: aberto, em andamento, entregue, aprovado, reprovado, cancelado).
- O Termix (código, não a IA) confere o pedido antes de publicar: destinatário existe, resultado esperado preenchido, nada de segredo. Depois faz commit **só desse arquivo** na dev1 e envia.
- Se a dev2 ainda não existe, o Termix a cria a partir da dev1, envia ao remoto e registra no `.claude/fluxo.json` quem é a pessoa (veja a seção 3).

### 2.4 Do lado de quem recebe

- O Termix da pessoa nomeada vê o pedido **ao sincronizar** (lê o arquivo de pedidos no remoto da dev1, sem custo de IA; mesmo mecanismo do contador do Mutirão).
- Avisa no sino ("Rodrigo delegou uma tarefa a você no projeto X") e oferece **abrir já como Vibe de tarefa** (o modo rápido para projeto em andamento, fila da dev2: DEV2-017), com o pedido como entrega pré-preenchida e o resultado esperado como critério de pronto.
- Antes de começar, o Termix garante que a máquina está no papel certo (DEV2, branch dev2) e que a dev2 está sincronizada com a dev1.

### 2.5 Ao terminar

- Quando o Vibe de tarefa chega ao fim, o Termix **grava o handoff** (`docs/HANDOFF_DEV2.md`, em alto nível, como o fluxo já exige), marca a entrega e **envia a dev2** (só ela). O envio automático da própria branch e do handoff no fim do ciclo é a DEV2-016 da fila da dev2.
- O Termix do DEV1 é **avisado**: primeiro pelo sino; depois também pelo Telegram (DEV2-019).
- O sinal de "entregue" precisa ser lido sem quebrar a trava de contexto (seção 2.6): a proposta é o Termix do DEV1 ler, em código, só um marcador mínimo (estado e data), sem levar conteúdo da dev2 para a IA. Veja as perguntas em aberto.

### 2.6 "Analisar entrega"

- Botão no Termix do DEV1, que aparece quando o pedido está "entregue".
- Clicar nele **é o pedido explícito do usuário** que o `WORKFLOW.md` exige para consultar a dev2. Deve passar pelo mesmo mecanismo que já libera a consulta (o guardrail da trava de contexto), e não contorná-lo.
- O orquestrador da dev1 lê **só o handoff** (nada de diff, log, código ou tarefas da dev2), compara com o **resultado esperado do pedido** e apresenta ao DEV1: o que foi atendido, o que falta, riscos.
- **Integra só com a aprovação do DEV1.** Aprovada: o fluxo de integração de sempre (`/fluxo:integrar`). Reprovada: o pedido volta a "aberto" com o motivo, e o orquestrador não guarda nem usa o conteúdo da entrega reprovada.

### 2.7 Visão geral

1. DEV1 clica em "Delegar tarefa" e escolhe a pessoa.
2. Orquestrador da dev1 escreve o pedido (com o resultado esperado); o Termix confere e publica na dev1.
3. Termix da pessoa sincroniza, avisa e abre o Vibe de tarefa.
4. A pessoa (com os agentes dela) faz o trabalho na dev2.
5. Termix dela grava o handoff, envia a dev2 e marca "entregue".
6. Termix do DEV1 avisa (sino; depois Telegram).
7. DEV1 clica em "Analisar entrega"; o orquestrador lê só o handoff e compara.
8. DEV1 aprova (integra) ou reprova (volta ao passo 3 com o motivo).
9. Sem pedidos em aberto, a dev2 sai da lista; o histórico fica no git.

## 3. Login: perfil por sócio com PIN

### 3.1 Por que é preciso

Os 5 sócios usam **a mesma conta GitHub** (e-mail da empresa). O GitHub, portanto, não identifica quem é quem: qualquer máquina com a conta pode empurrar qualquer branch. O Termix precisa saber **qual pessoa** está diante dele para mostrar os pedidos certos e para o histórico fazer sentido.

### 3.2 Perfil e PIN

- **Perfil por sócio** no Termix: nome e **PIN obrigatório**.
- Cada um tem a própria chave; ninguém entra com o nome de outro por engano ou por atalho.
- O perfil ativo aparece no cabeçalho; trocar de perfil pede o PIN.
- **Qualquer um dos 5 pode ser o DEV1 de um projeto.** O papel é por projeto, não pela pessoa.

### 3.3 Onde guardar o PIN

O PIN fica guardado **só como hash** (com sal próprio por pessoa e um algoritmo lento, próprio para senhas), num lugar compartilhado, para valer em qualquer PC. Opções:

| Opção | Prós | Contras |
|---|---|---|
| **A. Repositório privado só para os perfis da empresa** (sincronizado pelo Termix com git) | Sem servidor novo; um lugar para todos os projetos; histórico de quem mudou o quê; mesmo mecanismo de sincronização que o Termix já usa | Mais um repositório para clonar; quem tem a conta lê os hashes (um PIN curto pode ser descoberto por tentativa fora do Termix); sem limite real de tentativas |
| **B. Arquivo de perfis dentro de cada projeto** (ao lado do `.claude/fluxo.json`) | Zero infraestrutura; viaja com o projeto | Repetido em cada projeto; trocar o PIN exige atualizar todos; mesma fraqueza da opção A |
| **C. Pasta de nuvem compartilhada** (OneDrive/Google Drive da empresa) | Simples para quem já usa a nuvem | Depende de cliente de sincronização em cada PC; conflitos de cópia; fora do controle do git |
| **D. Serviço com banco gerenciado** (por exemplo, um backend pequeno) | Limite de tentativas real, bloqueio e revogação de verdade | Exige servidor, custo e manutenção; contradiz o "sem servidor" do resto da proposta |

**Sugestão da dev2:** opção A, com PIN de pelo menos 6 dígitos, algoritmo lento com sal por pessoa, cópia local para funcionar sem rede e bloqueio local depois de algumas tentativas erradas. Se um dia a segurança precisar ser forte, a opção D é o caminho, mas está fora do objetivo desta proposta.

### 3.4 Quem é cada dev no projeto

- O `.claude/fluxo.json` passa a guardar, além da lista de devs, **quem é a pessoa de cada branch** (por exemplo, dev1: Rodrigo, dev2: Zanata).
- Com isso, o Termix sabe sozinho o papel da máquina: perfil "Zanata" num projeto em que a dev2 é a Zanata = papel DEV2, branch dev2. O `CLAUDE.local.md` pode ser gerado a partir daí, pelo mesmo caminho do `/fluxo:papel`.
- Quando a dev2 sai da lista (seção 2.2), o nome sai do mapa; o git guarda o histórico.

### 3.5 Autor dos commits

- Em cada PC, `git config user.name` com **o nome do sócio** e **o mesmo e-mail** da empresa (o do GitHub compartilhado). O histórico passa a mostrar quem fez cada commit, sem mudar a conta.
- O Termix pode conferir isso ao entrar no perfil e oferecer o ajuste (só na configuração local do repositório).

### 3.6 Ressalva de segurança

**Com a conta GitHub compartilhada, o perfil e o PIN organizam o trabalho e evitam conflito e engano, mas não são proteção forte.** Qualquer pessoa com acesso à conta consegue ler os hashes, empurrar uma branch por fora do Termix ou trocar o `user.name`. A proteção real da main continua sendo o fluxo (DEV2..DEV5 → DEV1 → MAIN), as travas do guardrail e do Vibe e a aprovação humana na integração e na promoção. Se um dia for preciso identificar pessoas de verdade, o caminho é uma conta GitHub por sócio (com as regras de proteção de branch do próprio GitHub).

## 4. O que já existe e pode ser reaproveitado

- **Plugin fluxo:** já cria as branches de dev e registra o dev no `.claude/fluxo.json` (`/fluxo:init` para "adicionar mais um dev"), configura o papel da máquina (`/fluxo:papel`), sincroniza a branch com a dev1 (`/fluxo:sincronizar`) e integra com a trava de contexto (`/fluxo:integrar`, guardrail da consulta à dev2).
- **Mutirão (dev2, experimental):** já tem a troca de pedidos e entregas **pelo git, sem servidor** (o dono publica as partes numa pasta do projeto na branch dele; o sócio lê depois de sincronizar, abre o Vibe pré-preenchido e, ao concluir, o Termix grava a entrega e envia só a branch do sócio) e o **contador de entregas lido do remoto, sem custo de IA**. "Delegar tarefa" é o caso de uma pessoa só desse mesmo mecanismo.
- **Vibe Coding (dev2, experimental):** a entrega pré-preenchida, o ciclo com orquestrador e dev, a trava em código das abas e a política de autonomia por projeto (o fim do ciclo de DEV2..DEV5 já é "enviar a branch e o handoff").
- **Notificações do Termix:** o sino já existe e é o que o Vibe e o Mutirão usam para avisar.

## 5. Passo a passo sugerido de implementação

- **Fase 1 — Perfis.** Perfil por sócio com nome e PIN (hash), escolha do lugar compartilhado, troca de perfil, conferência do `user.name` do git. Sem mudar o fluxo ainda.
- **Fase 2 — Quem é quem no projeto.** O mapa branch → pessoa no `.claude/fluxo.json`; o Termix deduz o papel da máquina pelo perfil e oferece gerar o `CLAUDE.local.md`. Só o DEV1 vê as ações de responsável.
- **Fase 3 — Pedido.** Botão "Delegar tarefa" para o DEV1: escolher a pessoa, criar/reativar a dev2, o orquestrador escreve o pedido com o resultado esperado, o Termix confere e publica o arquivo de pedidos na dev1.
- **Fase 4 — Recebimento.** O Termix da pessoa nomeada lê o pedido ao sincronizar, avisa no sino e abre o Vibe de tarefa pré-preenchido (depende da DEV2-017 chegar à dev1).
- **Fase 5 — Entrega e aviso.** Fim do Vibe de tarefa grava o handoff, envia a dev2 e marca "entregue" (depende da DEV2-016); o Termix do DEV1 avisa no sino.
- **Fase 6 — "Analisar entrega".** Liberação da consulta pelo clique, leitura só do handoff, comparação com o resultado esperado, aprovar (integrar) ou reprovar (volta ao pedido com o motivo). Saída da dev2 da lista sem pedidos em aberto.
- **Fase 7 — Telegram.** O mesmo aviso também pelo Telegram (DEV2-019, junto com o Ygor).

As fases 1 e 2 já têm valor sozinhas (histórico com o autor certo, papel configurado sem erro). As fases 4 e 5 dependem de entregas da dev2 que ainda estão na fila.

## 6. Perguntas em aberto para o Rodrigo

1. **Lugar dos perfis:** concorda com o repositório privado só para perfis (opção A)? Ou prefere outra opção da tabela?
2. **Sinal de "entregue" e a trava de contexto:** o Termix do DEV1 pode ler, em código e sem IA, só um marcador mínimo da dev2 (estado e data) para avisar que a entrega chegou? Ou o aviso deve vir só do lado de quem entrega (por exemplo, atualizando o estado do pedido na dev1 por um caminho controlado)?
3. **Quem escreve no arquivo de pedidos:** só o DEV1 (na dev1), ou a pessoa da dev2 também pode marcar "em andamento" e "entregue"? Se puder, por qual caminho, já que ela não envia para a dev1?
4. **Formato do mapa no `.claude/fluxo.json`:** o plugin fluxo deve ganhar esse campo (versão nova do plugin) ou o Termix mantém um arquivo à parte?
5. **dev2 fixa ou rotativa:** "Delegar tarefa" usa sempre a `dev2`, ou a próxima branch livre (dev3, dev4) quando a dev2 já estiver ocupada com outra pessoa num Mutirão?
6. **Projeto sem fluxo:** o botão deve existir em projetos sem o fluxo (aplicando o fluxo antes, como o Mutirão exige um remoto), ou só em projetos que já usam o fluxo?
7. **PIN esquecido:** quem pode redefinir o PIN de outro sócio? Qualquer um dos 5, ou só com o PIN de um segundo sócio confirmando?
8. **Ordem de entrada na dev1:** o Vibe de tarefa (DEV2-017) e o envio automático da branch e do handoff (DEV2-016) precisam chegar à dev1 antes das fases 4 e 5. Prefere esperar essas entregas ou fazer uma versão mínima sem o Vibe (o pedido abre só como uma aba de Claude Code com o pedido anexado)?
