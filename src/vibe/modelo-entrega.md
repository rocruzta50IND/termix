# Estrutura do projeto — modelo de entrega do Vibe Coding (Termix)

> **Como usar este modelo**
> Este arquivo é a peça mais importante da entrega. Os agentes do Termix vão trabalhar sozinhos, do começo ao fim, só com o que estiver escrito aqui e no fluxo desenhado. O que não estiver escrito eles vão ter que adivinhar, e adivinhação vira retrabalho.
>
> - Preencha **todas as seções** abaixo. Não apague nem renomeie os títulos que começam com `##`: o Termix confere se cada um deles existe e tem conteúdo.
> - As linhas que começam com `>` (como esta) são dicas. Pode apagar ou deixar; o Termix ignora as dicas na conferência.
> - Escreva como se estivesse explicando para uma pessoa nova na empresa: frases simples, exemplos concretos, nada de "depois a gente vê".
> - Se algo ainda não foi decidido, escreva **"Decidir: ..."** e a dúvida. É melhor uma dúvida declarada do que um buraco.
> - Salve com a extensão `.md` (pode editar no Bloco de Notas, no VS Code ou em qualquer editor de texto).

## Objetivo

> O que o projeto resolve, em 3 a 5 frases. Para quem é e qual problema some quando ele existir.
> Exemplo: "Um site onde os clientes da loja agendam horário de corte sem precisar ligar. Hoje a recepção perde 2 horas por dia no telefone."

## Público e usuários

> Quem vai usar. Liste cada tipo de pessoa e o que ela faz no sistema.
> Exemplo:
> - Cliente: escolhe serviço, dia e horário; recebe confirmação.
> - Recepção: vê a agenda do dia, cancela e remarca.
> - Dono: vê relatório do mês.

## Funcionalidades

> Tudo o que o sistema precisa fazer, em lista. Uma linha por funcionalidade, começando por um verbo.
> Marque com **(essencial)** o que não pode faltar na primeira versão.
> Exemplo:
> - Cadastrar cliente com nome e telefone (essencial)
> - Agendar horário escolhendo serviço e profissional (essencial)
> - Enviar lembrete um dia antes

## Fora do escopo

> O que o projeto **não** vai fazer agora. Isto evita que os agentes inventem coisas.
> Exemplo: "Sem pagamento online. Sem aplicativo de celular, só site. Sem área de fidelidade."

## Telas e fluxos

> Liste as telas e o caminho que cada usuário percorre. O desenho do fluxo vai em arquivo separado na entrega; aqui você descreve em palavras.
> Exemplo:
> 1. Tela inicial → botão "Agendar"
> 2. Escolher serviço → escolher dia → escolher horário
> 3. Informar nome e telefone → confirmar
> 4. Tela "Agendado!" com o resumo
>
> **Dicas para desenhar o fluxo (arquivo da entrega):**
> - **Excalidraw** (excalidraw.com): desenho à mão livre, o mais fácil. Salve o arquivo `.excalidraw` ou exporte como `.png`/`.svg`.
> - **draw.io** (app.diagrams.net): caixas e setas. Salve o `.drawio` ou exporte como `.png`/`.pdf`.
> - **Mermaid**: fluxo escrito em texto dentro de um `.md`, num bloco que começa com ` ```mermaid `. Exemplo:
>
> ```mermaid
> flowchart LR
>   A[Tela inicial] --> B[Escolher serviço]
>   B --> C[Escolher horário]
>   C --> D[Confirmar]
> ```
>
> - Foto nítida de um desenho no papel (`.jpg`/`.png`) também vale.
> - O fluxo deve mostrar o **projeto inteiro**, do primeiro acesso até o fim de cada caminho, incluindo erros (ex.: "horário ocupado").

## Dados e regras de negócio

> Que informações o sistema guarda e quais regras ele precisa respeitar.
> Exemplo:
> - Cliente: nome, telefone, e-mail (opcional).
> - Agendamento: cliente, serviço, profissional, data e hora.
> - Regra: não pode haver dois agendamentos no mesmo horário para o mesmo profissional.
> - Regra: cancelamento só até 2 horas antes.

## Integrações e acessos

> Serviços de fora que o projeto usa (pagamento, e-mail, WhatsApp, planilha, login com Google...) e o que o humano vai precisar fornecer (contas, chaves, senhas de teste, domínio).
> **Não cole senhas aqui.** Só diga o que será necessário; o Termix pergunta na hora certa.
> Se não houver nenhuma, escreva "Nenhuma".

## Tecnologia

> Linguagem, framework, banco de dados e onde vai rodar (hospedagem). Se não souber, escreva "Sem preferência" e o orquestrador escolhe e explica a escolha.
> Exemplo: "Site em Next.js, banco Supabase, publicado na Vercel."

## Critério de pronto

> Como saber que o projeto acabou. Escreva testes que qualquer pessoa consiga fazer.
> Exemplo:
> - Um cliente consegue agendar do celular em menos de 1 minuto.
> - A recepção vê o agendamento na agenda do dia.
> - Tentar agendar um horário ocupado mostra um aviso e não grava.
