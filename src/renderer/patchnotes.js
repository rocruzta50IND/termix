// Novidades de cada versão, mostradas numa janela quando o Termix abre depois de atualizar (e ao clicar na versão no cabeçalho).
// Mais nova primeiro. Escreva para quem usa o app, em frases curtas: o que dá para fazer agora, o que ficou melhor, o que foi corrigido.
// Campos: v (versão), date, resumo (opcional), novo[], melhorado[], corrigido[].
const PATCH_NOTES = [
  {
    v: '0.4.2',
    date: '10/11/2026',
    resumo: 'Abertura bem mais rápida com muitos projetos.',
    melhorado: [
      'Ao abrir o Termix, todos os projetos e abas aparecem na hora. As conversas de cada projeto são retomadas quando você abre o projeto, e a do projeto que está na tela volta na hora.',
    ],
  },
  {
    v: '0.4.1',
    date: '10/11/2026',
    resumo: 'Ajustes depois do layout novo: ícone, barra lateral e novidades ao atualizar.',
    novo: [
      'Esta janela: a cada atualização o Termix mostra o que entrou de novo, o que melhorou e o que foi corrigido. Clique na versão, ao lado do nome, para ver de novo.',
    ],
    melhorado: [
      'O ícone novo do Termix também aparece nos atalhos (menu Iniciar e área de trabalho).',
      'Um clique no nome do projeto abre o projeto na hora; a setinha ao lado só abre e fecha as funções dele.',
      'Abrir e fechar a barra lateral ficou mais suave: só a largura anima, sem esmaecer.',
    ],
    corrigido: [
      'O ícone antigo continuava na barra de tarefas depois da atualização.',
      'A barra lateral podia ficar com o conteúdo deslocado para o lado depois de abrir.',
    ],
  },
  {
    v: '0.4.0',
    date: '10/11/2026',
    resumo: 'Layout novo, com a identidade visual do Rocruzta Hub.',
    novo: [
      'Barra lateral em pastas: Chats e Workflows, com os projetos dentro e as funções de cada projeto abaixo.',
      'Rodapé de ponta a ponta: modos à esquerda, ações no centro e ajustes no canto direito.',
      'Logo e ícone novos.',
      'Campo de envio do chat com o "+" (anexar) e o microfone (falar), que chegam em breve.',
    ],
    melhorado: [
      'Visual novo: painéis de vidro flutuantes, fonte Inter, abas com sublinhado e botões mais limpos.',
      'Um clique no nome do projeto abre ou fecha as funções dele, sem trocar de tela.',
      'Barra lateral recolhida mais estreita e com ícones novos.',
    ],
    corrigido: [],
  },
];
