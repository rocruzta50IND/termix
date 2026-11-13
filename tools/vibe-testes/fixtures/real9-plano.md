Branch de trabalho: vibe/cardapio

# Plano — Cardápio do Restaurante Sabor

Regras para todas as tarefas: trabalhar só na branch `vibe/cardapio` (criada a partir da atual pelo Termix, nunca commit/push em main/master); nada destrutivo (sem `reset --hard`, `clean -f`, force push, apagar pastas); só HTML e CSS puros, sem dependências nem build; prompts curtos apontando para `estrutura.md`/`fluxo.md`; `/clear` entre tarefas; o dev devolve um resumo curto (arquivos alterados + resultado da validação), não o diff.

Respostas do humano (rodada 1): o domínio do cliente (p1) e o repositório GitHub/acesso (p2) **ainda não foram informados**. Por isso T1–T3 seguem normalmente; T4, T5 e T6 dependem desses dados, estão marcadas [HUMANO] e só começam quando o humano informar o domínio e o repositório com acesso. Até lá, o projeto para ao fim da T3 (com commit na `vibe/cardapio`, sem push) e o Termix avisa o humano.

## T1 — Página do cardápio com 6 pratos e botão do WhatsApp
- **Objetivo:** Substituir o "Em breve" do `index.html` pela página única do Restaurante Sabor: cabeçalho com o nome, lista de 6 pratos de exemplo (nome, descrição, preço em reais no formato "R$ 00,00") fixos no HTML e o botão "Pedir pelo WhatsApp" com link `https://wa.me/5511999999999` (abre em nova aba, `rel="noopener"`).
- **Critério de pronto:** `index.html` válido, `lang="pt-BR"`, `meta charset` e `meta viewport` presentes; exatamente 6 pratos; botão com o link wa.me correto; liga `style.css` (pode estar vazio nesta tarefa).
- **Arquivos prováveis:** `index.html`, `style.css` (novo).
- **Validação:** contar os 6 itens de prato no HTML (ex.: `grep -c`); conferir o href do botão; abrir o arquivo localmente (`termix-open index.html` se existir).
- **Não fazer:** sem JavaScript, frameworks, backend, pagamento ou painel; não criar CNAME ainda; não mexer em main/master.

## T2 — Estilo mobile-first em style.css
- **Objetivo:** Criar o visual em `style.css` pensado para celular: coluna única, fonte legível (≥16px), espaçamento confortável, preço em destaque, botão do WhatsApp grande e fácil de tocar (≥44px de altura, fixo no rodapé ou bem visível), largura máxima centralizada em telas grandes.
- **Critério de pronto:** sem rolagem horizontal em 360px de largura; os 6 pratos e o botão visíveis e legíveis no celular; contraste adequado de texto.
- **Arquivos prováveis:** `style.css` (e ajustes mínimos de classes em `index.html`).
- **Validação:** abrir localmente e conferir em largura de celular (DevTools 360px); confirmar que não há CSS/fontes externas obrigatórias.
- **Não fazer:** sem frameworks CSS, sem build, sem imagens pesadas; não alterar o conteúdo dos pratos sem motivo.

## T3 — README com instruções de publicação
- **Objetivo:** Atualizar `README.md` com: o que é o site, como editar pratos/preços/número do WhatsApp no `index.html`, e o passo a passo do GitHub Pages com domínio próprio (Pages servindo a branch `vibe/cardapio`, pasta raiz; arquivo `CNAME`; registro DNS CNAME do subdomínio apontando para `<usuario>.github.io`, feito pelo cliente; marcar "Enforce HTTPS").
- **Critério de pronto:** README curto e claro em português, com as seções acima.
- **Arquivos prováveis:** `README.md`.
- **Validação:** leitura do README; conferir que não contém dados sensíveis.
- **Não fazer:** não inventar o domínio nem a URL do repositório do cliente (usar placeholders).

## T4 — [HUMANO] Arquivo CNAME com o domínio do cliente
- **Objetivo:** Criar o arquivo `CNAME` na raiz contendo apenas o domínio informado pelo cliente (ainda pendente: o humano informa antes desta tarefa começar), uma linha, sem `http://` nem barra.
- **Critério de pronto:** `CNAME` existe na raiz com exatamente o domínio informado.
- **Arquivos prováveis:** `CNAME` (novo), `README.md` (trocar placeholder do domínio, se houver).
- **Validação:** `cat CNAME` mostra só o domínio; sem espaços ou linhas extras.
- **Não fazer:** não usar domínio de exemplo/inventado; não configurar DNS (é do cliente).

## T5 — [DEPLOY] [HUMANO] Publicar no GitHub Pages do repositório do cliente
- **Objetivo:** Com a URL e o acesso ao repositório do cliente (ainda pendentes: o humano informa antes desta tarefa começar), adicionar o remote (sem remover remotes existentes), fazer push da branch `vibe/cardapio` e ligar o GitHub Pages servindo a branch `vibe/cardapio`, pasta raiz, com o domínio personalizado do `CNAME`. Avisar o humano antes do push/ativação e para ele (ou o cliente) configurar o DNS e marcar "Enforce HTTPS" quando o certificado sair.
- **Critério de pronto:** push da `vibe/cardapio` feito sem force; Pages ativo nessa branch com o domínio do cliente configurado.
- **Arquivos prováveis:** nenhum arquivo do site (só configuração de remote/Pages); commit apenas se algum ajuste for necessário.
- **Validação:** `git ls-remote` mostra a branch no remoto; configurações do Pages (ou `gh api repos/<dono>/<repo>/pages`) mostram source `vibe/cardapio` e o domínio do CNAME.
- **Não fazer:** nada de push em main/master, force push ou apagar branches/remotes; não alterar DNS do cliente; não expor tokens no repositório.

## T6 — [SEM COMMIT] [HUMANO] Validação final no celular e no domínio
- **Objetivo:** Conferir o critério de pronto: o site abre pelo domínio do cliente (HTTPS quando disponível) no celular, mostra os 6 pratos e o botão do WhatsApp funciona (abre wa.me/5511999999999).
- **Critério de pronto:** domínio responde com o cardápio; 6 pratos visíveis; botão leva ao WhatsApp; sem rolagem horizontal no celular.
- **Arquivos prováveis:** nenhum.
- **Validação:** `curl -sI https://<domínio>` (200) e `curl -s https://<domínio>` conferindo os 6 pratos; conferência visual no celular (ou DevTools) pelo humano se preciso.
- **Não fazer:** não alterar código; se algo falhar, registrar o problema em resumo curto para nova tarefa em vez de corrigir aqui.
