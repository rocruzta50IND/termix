# DESIGN — Termix

Decisões de aparência tomadas com o usuário. Atualize este arquivo quando o visual mudar. Valores de geometria estão em `src/renderer/app.js` (objeto `FR`) e as cores em `src/renderer/styles.css` (`:root`).

## Estilo geral
- **Glassmorphism escuro**: preto e cinza com **azul bem sutil**. **Sem roxo.** Vidro forte, "de vídeo", com degradê premium.
- Fundo padrão: degradê quase preto com bolhas de cor estáticas (a animação foi retirada; TASK-007).
- Detalhes de acabamento: raio de 14 px nos recortes internos, raio de 22 px na moldura externa (8 px no modo Ofuscado), barras de rolagem **finas, transparentes e recuadas** das bordas arredondadas.

## Estrutura da janela
- **Moldura em "U" fechada**: cabeçalho fino (46 px) + barra lateral + braço direito de notificações formam **uma peça de vidro só**, recortada por `clip-path`; o terminal fica no recorte. A base é uma faixa fina arredondada.
- O sino abre e fecha o **braço direito** (notificações); a barra lateral recolhe para só ícones por um botão dentro dela.
- **Telas que não são terminal nem chat** (Plugins, Skills, MCPs, Consumo, Integrações, Configurações e a tela sem projeto) são **parte do app** (TASK-042): sem o recorte escuro do palco, sem painel com borda e sem margem de 8 px; o conteúdo fica direto sobre o vidro, contínuo com a barra lateral, e rola até a base da janela. O recorte com cantos arredondados, a moldura e o rodapé de funções valem só para terminal, chat e Web.
- Os botões da janela (minimizar, maximizar, fechar) são desenhados dentro do cabeçalho, em **pílulas** de 38×30 px (realce de 10 % de branco ao passar o mouse), com margem em volta; o de fechar fica com vermelho translúcido e ícone rosado (sem bloco vermelho de ponta a ponta). O sino é só o ícone, sem círculo de fundo (o círculo de 10 % de branco aparece ao passar o mouse e com o painel aberto), exatamente no centro (o `.tbtn` não tem padding, para o ícone de 18 px não ser empurrado).
- Cabeçalho: logo + nome à esquerda, cápsula de limites 5 h / 7 d no centro, sino e controles à direita.

## Terminal e abas
- Terminal **quadrado**, encaixado no recorte (cantos de baixo acompanhando os do recorte), com margem interna uniforme; o fundo do terminal vem só do contêiner.
- Abas **encaixadas** no terminal, estilo Windows Terminal (TASK-030): a barra de abas **encosta no topo e na lateral do container** dos terminais (sem margem; a primeira aba segue a curva do canto arredondado, que recorta a barra) e é um pouco **mais escura** que o terminal (`--bar-bg`) e a aba ativa fica **sem o fundo da barra** atrás dela, só com a **cor do terminal** (`--tab-bg`), então ela se funde ao terminal, sem linha nem vão, e o formato dela aparece; "orelhas" curvas (`radial-gradient`) na base. O fundo da barra é um `::before` com máscara; os furos (aba e orelhas) são medidos por `fuseBar` em `app.js` (`--tl/--tr` e `--al/--ar`) a cada desenho e a cada mudança de largura. A cor da aba vale para a **aba inteira, em degradê** (forte no canto de cima, some até a base; na ativa termina na cor do terminal, sem quebrar a fusão; nas inativas é bem leve); não há mais linha colorida no topo. O estado "trabalhando" aparece no ponto da aba ativa, que pulsa. Inativas transparentes, com **separador nítido** (1 px, 16 px de altura, 30 % de branco; some junto da ativa e no hover). Vale também para as abas da Web. Toda aba nova começa no azul do sistema (`#5B9DFF`; `DEFAULT_COLOR`); a cor ainda muda pelo menu. Menu de botão direito (cor, renomear, duplicar, reiniciar, exportar texto, fechar outras/à direita, fechar). "+" com seta para escolher a ferramenta. **Arrastar para reordenar (TASK-033):** a aba arrastada fica opaca e acompanha o mouse; as outras abrem espaço; o recorte da barra acompanha a aba ativa (colado ao mouse se for ela; deslizando junto se ela abre espaço); o redesenho das abas fica adiado até soltar. **Muitas abas:** as inativas encolhem até 34 px (só o ponto de estado) e a ativa tem no mínimo 120 px, para a barra nunca estourar (até ~25 abas).
- Enquanto o agente **trabalha**, **só a linha colorida** do topo da aba ativa pulsa (só opacidade, sutil).
- Botão de reiniciar: ícone **com o texto "Reiniciar"**, na pílula do alternador de baixo, depois do Clear (não fica mais no cabeçalho; gira ao reiniciar). Os botões do alternador mantêm o rótulo para não parecer vazio; reavaliar deixar só ícones no futuro. Dangerously: **não** tem aviso na aba (a etiqueta "⚠ bypass" do rail de baixo já mostra).

## Rail (informações da sessão)
- **Cápsula vertical dentro do terminal**, a 12 px da borda direita e centralizada na altura: 58 px de largura, vidro escuro com borda clara. Quatro **anéis de 44 px** (traço de 4 px) empilhados: `CTX`, `5H`, `7D`, `CACHE`, com o número no centro (sem o %) e o rótulo pequeno embaixo; engrenagem no rodapé.
- Cores do anel e do número: verde, amarelo a partir de 70 %, vermelho a partir de 90 %. O anel do cache mostra o **tempo que resta** (cheio = recém-escrito), amarelo com menos de 20 % da validade, vermelho "frio". Sem dado: anel vazio com "—".
- Ao passar o mouse num anel abre, à esquerda, um cartão com o título e o detalhe (ex.: "Limite de 5 horas · 15% — renova em 3h36m").
- Por padrão a cápsula **flutua sobre o texto** e fica **esmaecida (40 %)**, voltando ao normal ao passar o mouse; com "reservar espaço" o terminal ganha 82 px de margem à direita e o fundo vem da sessão. Menu da engrenagem abre ao lado da cápsula. Etiqueta opcional (modelo · projeto · branch · permissões) no canto inferior direito.
- Só aparece com terminal aberto; a cápsula 5 h / 7 d do cabeçalho sai enquanto o rail está ligado.

## Alternador Terminais / Web e navegador
- **Pílula** de 46 px de altura e 250 px de largura no centro da base do recorte, meio dentro da base de vidro (cobre pouco do terminal): botões **Terminais** (ícone de janelas + selo com o número de abas, amarelo quando alguma pede atenção) e **Web** (globo + selo), o ativo em azul. Esmaecida (45 %) quando parada, normal ao passar o mouse. É uma vista própria por cima (ver abaixo), não HTML da interface.
- **Tela Web:** abas de página no mesmo estilo das abas do terminal (cor azul), barra de navegação com voltar, avançar, recarregar/parar, endereço em cápsula, tamanho de dispositivo e DevTools, e a página embaixo. Aba sem endereço mostra uma tela inicial com atalhos de localhost.
- **Aviso de algo aberto na Web:** ponto verde pulsando no botão Web do alternador (TASK-024), quando um terminal abriu uma página local ou um servidor foi detectado; some ao abrir a Web. Servidores detectados aparecem como botões azuis na tela inicial da aba em branco e numa faixa fina sob a barra de endereço.
- **Regra técnica:** a vista nativa do navegador fica por cima de todo o HTML. Por isso o alternador é outra vista adicionada depois, e com menu, modal ou popover aberto a vista do navegador é trocada por uma imagem dela (`capturePage`) para o HTML ficar por cima. Em outras telas (Plugins, Consumo etc.) a vista é escondida.

- **Botão Clear:** na pílula do alternador, depois de um separador fino, com ícone de borracha e o rótulo "Clear" sempre visível (a dica nativa não aparece nessa vista). Desabilitado (opacidade baixa) sem terminal vivo e aguardando; com o contexto acima do limite configurado pulsa em âmbar (borda e brilho, só `box-shadow`/fundo; sem animação com "reduzir movimento"). Só aparece na tela Terminais.

## Rodapé do app e Chat (TASK-040)

- **Rail (ajuste de 2026-11-02):** sem cápsula nem fundo: só os anéis (contexto, 5 h, 7 d, cache) flutuando junto à borda direita, cada um com um disco escuro discreto atrás do número, para ler sobre qualquer texto. A engrenagem saiu do rail e foi para o fim do rodapé: ela abre o menu "Rail · anéis de métricas" (ligar cada anel, reservar espaço, esmaecer, etiqueta de modelo) e a opção do rodapé (esmaecer quando parado). Os mesmos ajustes estão em Configurações > Rail e rodapé. O rodapé não esmaece por padrão.
- **Rodapé no chat:** igual ao do terminal, centralizado na base de vidro, com a engrenagem logo depois de Reiniciar (decisão do usuário, 2026-11-02; o alinhamento à coluna da caixa de prompt foi desfeito).
- **Copiar a resposta (TASK-054):** pílula "Copiar" a cavalo na borda de cima da bolha da resposta, canto direito, só ao passar o mouse; copia o Markdown original; vira "Copiado" por 1,4 s. Os blocos de código mantêm o "Copiar" no cabeçalho.
- **Coluna do chat (TASK-052):** o avatar da resposta fica numa calha de 42 px à esquerda e o da pergunta numa calha de 42 px à direita; bolhas (pergunta e resposta) e cartões de ferramenta usam a mesma faixa entre as calhas, com as mesmas bordas esquerda e direita.
- **Estado do trabalho no chat (TASK-051):** enquanto o agente trabalha e ainda não há texto da resposta, abaixo da conversa fica o símbolo animado, um verbo que muda ("Manifestando…", em azul do app), o tempo decorrido (cinza) e, na linha de baixo em monoespaçada com "└", o que está acontecendo (Executando · comando, Lendo · arquivo, Analisando o resultado, Pensando no próximo passo). Some ao terminar.
- **Avatares do chat:** só o símbolo, **sem fundo**, no azul do app (`--accent`) com um brilho suave: a resposta usa o símbolo da sua vez (o `>_` do Termix quando não há); a pergunta usa a silhueta. Enquanto o Claude trabalha (indicador "pensando" e resposta em andamento) o `>_` vira um de 5 símbolos animados, em rodízio, um por mensagem: brilho em raios (onda), órbita de pontos, ondas concêntricas, barras de áudio e o prompt `>_` com o cursor piscando; ao terminar **a resposta fica com o símbolo que rodou nela, parado** (cada resposta guarda o seu; as do histórico reaberto, sem símbolo, usam o `>_`). Com "reduzir movimento" do Windows nada anima. As abas não têm ícone de modo (Chat/Terminal).

- **Rodapé:** a base de vidro da janela ficou mais alta (38 px) e guarda o antigo alternador flutuante: **Terminais (n) · Web | Clear · Reiniciar**, centralizado sob o palco, com o mesmo desenho de antes (cápsula azul no item ativo, selo de contagem, ponto verde de novidade na Web, Clear que pulsa com o contexto alto, Reiniciar que gira). Esmaece quando parado (a mesma opção do rail). A janelinha nativa de antes não aparece mais.
- **Aba:** quando o projeto tem chats, cada aba ganha um ícone pequeno (balão = chat, prompt = terminal); a palavra fica na dica.
- **Chat, estilo Bolhas:** pergunta à direita (azul), resposta à esquerda (vidro), avatar "EU"/"C"; ferramentas em cartões recolhíveis (nome, argumento, estado); código com cabeçalho e botão Copiar; tabelas, listas, citações e links (abrem no navegador). **Estilo Fluxo:** sem bolhas, rótulo VOCÊ (na cor da aba) e CLAUDE, régua de cor na lateral, texto na largura toda.
- **Campo de envio (no desenho do Claude):** barra bem arredondada com botão redondo (enviar; vira parar enquanto responde); embaixo, "Este computador", a pasta do projeto com a branch, e à direita modelo, permissão (⚠ bypass em amarelo) e um anel de contexto. Início da conversa: marca do Termix, "Nova conversa em <projeto>" e o caminho. O + de anexo e o microfone do Claude não foram copiados porque ainda não funcionam.
- Protótipos de apoio: `docs/prototipos/chat-layout.html` (aprovado), `chat-mode.html` (baias, descartado) e `layout-b.html` (app inteiro, descartado).


## Notificações (TASK-029)
- Dica ao lado esquerdo do sino: cartão escuro 94 %, borda fina, faixa vertical na cor da aba, no máximo 300 px e 2 linhas; entra deslizando da direita (opacity + transform, .28 s; só fade com "reduzir movimento"). Painel: grupos por aba (ponto da cor, nome, contagem, limpar), cartões com etiqueta do tipo (verde terminou, amarelo precisa de você, vermelho erro, azul cache) e × para excluir; "Limpar tudo" no cabeçalho.

## Marca e ícones
- **Logo do cabeçalho:** só o prompt `>_`, sem caixa, com brilho; alinhado à altura do nome "Termix".
- **Ícone do app / barra de tarefas:** quadrado em degradê azul (estilo Windows 11) com só o `>_` branco, sem abas nem janela desenhada (TASK-034); versão de traço grosso e sem brilhos para 16 e 32 px (`assets/icon.svg`, `assets/icon-small.svg`; gerar com `tools/make-icon.js`).
- **Ícone "Terminais" na barra lateral:** janelas em cascata (diferente da logo). Os demais ícones são de traço fino (1,7 px).
- Avatares dos projetos na barra recolhida: letra inicial em quadrado de cor.

## Abertura
- Tela de abertura (`#splash`): fundo escuro do app, logo `>_` com brilho pulsando devagar e o nome "Termix"; sai em fade (0,45 s). Só `opacity`/`transform`; com "reduzir movimento" não pulsa.

## Desempenho (regras para não regredir)
- Sem `backdrop-filter` nos painéis grandes (o fundo atrás é suave); WebGL só na aba visível; saída dos terminais agrupada em lotes de ~8 ms; ajuste de linhas do terminal agrupado e pausado durante animações; sombra pesada desligada durante animações.

## Pós-MVP de design
- Personalização de cores e tema claro/escuro (TASK-006); animação do fundo (TASK-007).

## Telas Plugins, Skills e MCPs (TASK-013)
- Cartões da grade padrão (`.cards`/`.card`), uma tela para as três. Acima da lista: busca (pílula), alternador de **escopo** e de **estado** (`.seg.sm`) e botão "Atualizar"; abaixo, uma linha miúda com a contagem e a origem do dado ("estado conferido há 10 s").
- Etiquetas: escopo (neutra), estado (verde = ok/ligado, amarelo = precisa de login/desligado/aviso, vermelho = falhou). Itens desligados ou com problema ficam esmaecidos (`.card.dim`). Descrição com no máximo 3 linhas (`.rdesc`).
- A busca e a atualização automática trocam só a lista (`#reslist`), sem recriar a tela, para o campo de busca não perder o foco.
- **Controles:** cada cartão tem uma ação principal pequena ("Desligar aqui"/"Ligar aqui", azul quando for para ligar) e "Gerenciar…" (janela com atualizar, remover, login etc.); linha extra de botões acima da lista ("+ Instalar plugin…", "Desligar/Ligar todos aqui"). Resultado da última ação numa faixa verde/vermelha; "Atualizando…" na linha miúda enquanto roda (novas ações esperam). Remoções sempre pedem confirmação em janela.
- **Aviso de reinício:** faixa âmbar (`.restartnote`) no topo da página, com "Reiniciar a aba ativa" e "Dispensar".
- **Janelas:** campos ocupam toda a largura (`.dlg .inp`); o editor de skill é mais largo (760 px) com fonte monoespaçada; o formulário de MCP mostra campos de web ou de comando conforme o tipo e, se o Claude Code recusar, reabre com o que foi digitado e o erro.
- **Configurações > Conectores:** uma linha com alternador Automático / Limpo e a nota dos limites logo abaixo.

## Padrão dos controles (TASK-031)
- **Alturas:** `--ctl-h` 36 px (botões, campos, alternadores `.seg`, campo numérico) e `--ctl-sm` 32 px (versão compacta `.btn.sm`, `.seg.sm`, busca `.resq`, barra de endereço). Raio dos campos 12 px (`--ctl-r`); botões e buscas em pílula. Nada de controle com aparência nativa do navegador: o app declara `color-scheme: dark`.
- **Uma só regra de campo:** `.inp` (texto, `select`, `textarea`) em `styles.css`, bloco "padrão único dos controles". Fundo `--field`, borda `--border2`, foco com borda azul e anel (`--ring`), sem contorno nativo. Não criar outra regra `.inp` em outro ponto do arquivo (duas regras conflitantes causaram o campo minúsculo de "Novo projeto").
- **Seleção (`select.inp`):** sem aparência nativa, seta própria à direita, lista escura.
- **Número:** campo `.numf` com botões − e + (e setas do teclado), unidade ao lado (`.unit`); nunca `input type=number` (as setinhas brancas nativas).
- **Deslizante:** trilho fino com preenchimento azul (`--pct`, atualizado ao arrastar) e botão redondo branco.
- **Caixa de marcar:** quadrado de 18 px arredondado, azul quando marcado.
- **Linhas das Configurações (`.row`):** rótulo à esquerda (flexível), controle à direita sem encolher; em tela estreita (menos de 560 px de conteúdo) o controle desce para baixo do texto; linhas com área de texto quebram antes (780 px) e a área ocupa a largura toda.
- **Janelas (`.dlg`):** largura `min(470px, 92vw)`, altura máxima da tela com rolagem e **rodapé fixo** (os botões não saem da tela em janela baixa); o editor de skill é mais largo.
- **Foco por teclado:** anel azul em todo botão e controle (`:focus-visible`). **Selo do sino:** no canto, com borda escura, sem cobrir o ícone.
