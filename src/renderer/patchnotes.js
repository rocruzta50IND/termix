// Novidades de cada versão, mostradas numa janela quando o Termix abre depois de atualizar (e ao clicar na versão no cabeçalho).
// Mais nova primeiro. Escreva para quem usa o app, em frases curtas: o que dá para fazer agora, o que ficou melhor, o que foi corrigido.
// Campos: v (versão), date, resumo (opcional), novo[], melhorado[], corrigido[].
const PATCH_NOTES = [
  {
    v: '0.7.0',
    date: '12/11/2026',
    resumo: 'O Termix agora também roda dentro do Rocruzta Hub.',
    novo: [
      'Aberto pelo Rocruzta Hub, o Termix aparece dentro da janela do Hub, sem janela própria: o Hub mostra as notificações dele, acompanha o tema claro ou escuro e o atualiza.',
      'Aberto sozinho, pelo atalho de sempre, o Termix continua igual.',
    ],
  },
  {
    v: '0.6.4',
    date: '12/11/2026',
    resumo: 'Traga um projeto do GitHub só com o link.',
    novo: [
      'Em Novo projeto (e Novo mutirão) há a opção "Clonar do GitHub": cole o link do repositório e o Termix baixa e cria o projeto.',
      'Por enquanto só repositórios públicos. Repositório privado vai exigir uma conexão, que ficará no Rocruzta Hub.',
    ],
  },
  {
    v: '0.6.3',
    date: '11/11/2026',
    resumo: 'Novos nomes na barra lateral.',
    melhorado: [
      'Os botões agora se chamam "Novo projeto" e "Novo mutirão", e as pastas da barra lateral, "Projetos" e "Mutirão" (antes: chat e workflow).',
    ],
  },
  {
    v: '0.6.2',
    date: '11/11/2026',
    resumo: 'Acabamento da barra lateral.',
    melhorado: [
      'Ao recolher a barra lateral, a versão recolhida já aparece desde o começo e acompanha o encolhimento, em vez de surgir só no fim.',
      'Abrir e fechar as funções de um projeto ficou mais suave, com o conteúdo esmaecendo e deslizando.',
    ],
    corrigido: [
      'O botão com os três pontinhos do projeto não encosta mais na setinha e agora aparece só como os pontinhos, sem a caixa de destaque.',
    ],
  },
  {
    v: '0.6.1',
    date: '10/11/2026',
    resumo: 'Acabamento: todas as telas agora têm o canto arredondado.',
    corrigido: [
      'Novo chat, Novo workflow, Consumo, Integrações, Configurações, Conectores e a tela inicial vazia tinham a borda do palco quadrada. Agora seguem o mesmo canto arredondado do resto do app.',
    ],
  },
  {
    v: '0.6.0',
    date: '10/11/2026',
    resumo: 'Nova tela Código: veja os arquivos do projeto e o que mudou, com os terminais embaixo.',
    novo: [
      'Tela Código, abaixo de Conectores em cada projeto, no estilo do VS Code: explorador de arquivos, leitor com números de linha e cores, e a lista de Alterações do git (modificado, novo, apagado, com as linhas a mais e a menos).',
      'Ao clicar numa mudança, o diff abre em uma aba: o que saiu em vermelho e o que entrou em verde, com a numeração antes e depois. As mudanças se atualizam sozinhas enquanto a tela está aberta.',
      'Os terminais do projeto aparecem embaixo da tela Código, com as abas e a sessão ativa. O botão Terminal, na barra de baixo, mostra ou esconde, e a divisória pode ser arrastada para mudar a altura.',
    ],
    melhorado: [
      'A tela Código é somente leitura: quem escreve nos arquivos continua sendo o Claude.',
    ],
  },
  {
    v: '0.5.0',
    date: '10/11/2026',
    resumo: 'Plugins, Skills e MCPs agora vivem numa tela só: Conectores.',
    novo: [
      'Tela Conectores: no lugar de Plugins, Skills e MCPs, cada projeto tem uma só. Em Meus você vê tudo o que vale no projeto, agrupado por origem, com busca, filtros, ordenação e um interruptor para ligar ou desligar só naquele projeto.',
      'Aba Descobrir: encontre plugins do marketplace oficial e do diretório da Anthropic (os mais instalados primeiro) e servidores MCP do registro público, com busca e “Mostrar mais”. Um clique no “+” instala ou abre o formulário já preenchido.',
      'Menu “+ Adicionar”: conector personalizado (MCP por endereço ou comando), marketplace de plugins, instalar plugin e criar skill ou comando.',
    ],
    melhorado: [
      'As listas aparecem primeiro como um esqueleto de carregamento e viram o conteúdo quando os dados chegam.',
    ],
  },
  {
    v: '0.4.3',
    date: '10/11/2026',
    resumo: 'Ícone certo na barra de tarefas.',
    corrigido: [
      'O ícone antigo do Termix continuava na barra de tarefas logo depois de atualizar. Agora o ícone novo já aparece na primeira abertura.',
    ],
  },
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
