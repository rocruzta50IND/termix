# Vibe Coding e Mutirão — desenho do módulo

Desenho aprovado pelo Ygor (2026-11-06). Frente exclusiva da dev2 (numeração DEV2-xxx). Estado atual: só a casca (DEV2-001), atrás da chave **Configurações > Experimental > Vibe Coding e Mutirão (experimental)**, desligada por padrão.

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
| Núcleo `src/main.js` | Um `require` do módulo e o canal `vibe:status`, protegidos por try/catch (erro no módulo é registrado em `erros.log` e o app segue). |
| Núcleo `src/preload.js` | A ponte `vibeStatus`. |
| Núcleo `src/renderer/index.html` | Um `<link>` para o CSS e um `<script>` depois do `app.js`. |
| Núcleo `src/renderer/app.js` | Nada. |
| Módulo `src/vibe/` (processo principal) | Fábrica com o estado e, no futuro, a criação dos agentes, a divisão por branch e o ciclo autônomo. |
| Módulo `src/renderer/vibe/` (interface) | Botões do cabeçalho, chave em Configurações e telas. Usa o que o `app.js` já expõe (estado `S`, `save`, `modal`) e se pendura no cabeçalho e na página Configurações observando o DOM. |

Desligado, o módulo só é carregado: não mostra botões nem executa nada.

## Roteiro

- **DEV2-001** — Casca isolada do módulo, chave em Configurações e duas telas "Em construção". *(feita)*
- **DEV2-002** — Tela de entrega do Vibe Coding (formulário engessado) e .md modelo para baixar.
- **DEV2-003** — Criação dos dois agentes (orquestrador e dev) e ciclo autônomo.
- **DEV2-004** — Tela do Mutirão: chat com o orquestrador, divisão por branch e contador de entregas.
- **DEV2-005** — "Implementação automática" ao chegar em N/N.
- **DEV2-006** — Aviso por WhatsApp quando precisar do humano.

## Perguntas em aberto

- **Limite da autonomia de commit/push dos agentes.** Recomendação: só a branch do papel, nunca a main, nada que apague dados.
- **Como cada sócio recebe a parte no Termix dele** (detecção da branch ao abrir o projeto, aviso, convite).
