# DESIGN — Termix

Decisões de aparência tomadas com o usuário. Atualize este arquivo quando o visual mudar. Valores de geometria estão em `src/renderer/app.js` (objeto `FR`) e as cores em `src/renderer/styles.css` (`:root`).

## Estilo geral
- **Glassmorphism escuro**: preto e cinza com **azul bem sutil**. **Sem roxo.** Vidro forte, "de vídeo", com degradê premium.
- Fundo padrão: degradê quase preto com bolhas de cor estáticas (a animação foi retirada; TASK-007).
- Detalhes de acabamento: raio de 14 px nos recortes internos, raio de 22 px na moldura externa (8 px no modo Ofuscado), barras de rolagem **finas, transparentes e recuadas** das bordas arredondadas.

## Estrutura da janela
- **Moldura em "U" fechada**: cabeçalho fino (46 px) + barra lateral + braço direito de notificações formam **uma peça de vidro só**, recortada por `clip-path`; o terminal fica no recorte. A base é uma faixa fina arredondada.
- O sino abre e fecha o **braço direito** (notificações); a barra lateral recolhe para só ícones por um botão dentro dela.
- Os botões da janela (minimizar, maximizar, fechar) são desenhados dentro do cabeçalho.
- Cabeçalho: logo + nome à esquerda, cápsula de limites 5 h / 7 d no centro, sino e controles à direita.

## Terminal e abas
- Terminal **quadrado**, encaixado no recorte (cantos de baixo acompanhando os do recorte), com margem interna uniforme; o fundo do terminal vem só do contêiner.
- Abas **coladas** no terminal, estilo Windows Terminal, cada uma com cor própria (a linha de cima do terminal usa a cor da aba ativa). Menu de botão direito (cor, renomear, duplicar, reiniciar, exportar texto, fechar outras/à direita, fechar). "+" com seta para escolher a ferramenta.
- Enquanto o agente **trabalha**, **só a linha colorida** sob as abas pulsa, na cor da aba (sutil).
- Botão de reiniciar: **só o ícone**, discreto. Dangerously: **⚠ na aba**.

## Rail (informações da sessão)
- **Cápsula vertical dentro do terminal**, a 12 px da borda direita e centralizada na altura: 58 px de largura, vidro escuro com borda clara. Quatro **anéis de 44 px** (traço de 4 px) empilhados: `CTX`, `5H`, `7D`, `CACHE`, com o número no centro (sem o %) e o rótulo pequeno embaixo; engrenagem no rodapé.
- Cores do anel e do número: verde, amarelo a partir de 70 %, vermelho a partir de 90 %. O anel do cache mostra o **tempo que resta** (cheio = recém-escrito), amarelo com menos de 20 % da validade, vermelho "frio". Sem dado: anel vazio com "—".
- Ao passar o mouse num anel abre, à esquerda, um cartão com o título e o detalhe (ex.: "Limite de 5 horas · 15% — renova em 3h36m").
- Por padrão a cápsula **flutua sobre o texto** e fica **esmaecida (40 %)**, voltando ao normal ao passar o mouse; com "reservar espaço" o terminal ganha 82 px de margem à direita e o fundo vem da sessão. Menu da engrenagem abre ao lado da cápsula. Etiqueta opcional (modelo · projeto · branch · permissões) no canto inferior direito.
- Só aparece com terminal aberto; a cápsula 5 h / 7 d do cabeçalho sai enquanto o rail está ligado.

## Marca e ícones
- **Logo do cabeçalho:** só o prompt `>_`, sem caixa, com brilho; alinhado à altura do nome "Termix".
- **Ícone do app / barra de tarefas:** quadrado escuro com borda azul luminosa, barra de abas coloridas e `>_` com brilho; versão de traço grosso para 16 e 32 px (`assets/icon.svg`, `assets/icon-small.svg`; gerar com `tools/make-icon.js`).
- **Ícone "Terminais" na barra lateral:** janelas em cascata (diferente da logo). Os demais ícones são de traço fino (1,7 px).
- Avatares dos projetos na barra recolhida: letra inicial em quadrado de cor.

## Abertura
- Tela de abertura (`#splash`): fundo escuro do app, logo `>_` com brilho pulsando devagar e o nome "Termix"; sai em fade (0,45 s). Só `opacity`/`transform`; com "reduzir movimento" não pulsa.

## Desempenho (regras para não regredir)
- Sem `backdrop-filter` nos painéis grandes (o fundo atrás é suave); WebGL só na aba visível; saída dos terminais agrupada em lotes de ~8 ms; ajuste de linhas do terminal agrupado e pausado durante animações; sombra pesada desligada durante animações.

## Pós-MVP de design
- Personalização de cores e tema claro/escuro (TASK-006); animação do fundo (TASK-007).
