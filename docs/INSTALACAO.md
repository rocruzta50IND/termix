# Instalar o Termix (passo a passo para o time)

O Termix é de uso interno. Este guia leva uns 5 minutos. Se algo não sair como descrito, vá direto para [Se algo der errado](#se-algo-der-errado).

## 1. Antes de começar (2 minutos)

**Windows 11.** É onde o Termix é testado. O Windows 10 deve funcionar, mas ainda não foi testado.

**Claude Code instalado e com a sua conta conectada.** O Termix não instala o Claude Code. Para conferir, abra um terminal do Windows e digite `claude --version`: se aparecer um número de versão, está certo. No Windows, o Claude Code também precisa do Git for Windows; se o `claude` abre no seu terminal, você já tem o que precisa.

**Confira o Smart App Control** (é o único ponto que pode barrar a instalação):

1. Abra o menu Iniciar e procure por **Segurança do Windows**.
2. Vá em **Controle de aplicativos e navegador** e depois em **Configurações do Smart App Control**.
3. Veja qual opção está marcada:

| Está em… | O que significa | O que fazer |
|---|---|---|
| **Desativado** | O Windows não bloqueia programas sem assinatura. | Pode instalar. |
| **Avaliação** | O Windows está observando o seu uso e pode ligar sozinho. | Pode instalar agora. |
| **Ativado** | O Windows bloqueia programas sem assinatura que ele não conhece. | O Termix **pode ser bloqueado**. Veja [O Windows bloqueou](#o-windows-bloqueou-o-instalador-ou-o-app) antes de instalar e avise quem cuida do Termix. |

Se você não encontrar essa opção, o seu Windows não tem o Smart App Control (por exemplo, Windows 10). Pode instalar.

## 2. Baixar e instalar

1. Abra a página de [Releases](https://github.com/rocruzta50IND/termix/releases/latest) e baixe o arquivo `Termix-Setup-<versão>.exe`.
2. Execute o arquivo. **Não pede administrador**: ele instala só para o seu usuário.
3. No assistente, pode deixar a pasta sugerida (`%LOCALAPPDATA%\Programs\Termix`) e clicar em avançar até o fim. Ele cria atalhos na área de trabalho e no menu Iniciar.
4. Abra o **Termix** pelo atalho.

O instalador **não é assinado digitalmente** (o app é interno), por isso o Windows pode mostrar avisos. Veja a próxima seção.

### O Windows mostrou um aviso

- **"O Windows protegeu o computador" (SmartScreen).** É só um aviso. Clique em **Mais informações** e depois em **Executar assim mesmo**.
- **O antivírus da empresa bloqueou ou apagou o arquivo.** Não desative o antivírus. Peça ao responsável de TI para liberar o `Termix-Setup-<versão>.exe` e a pasta `%LOCALAPPDATA%\Programs\Termix`.

### O Windows bloqueou o instalador ou o app

Se aparecer uma mensagem dizendo que o **Smart App Control bloqueou** o programa, **não há botão "executar assim mesmo"**: é uma regra do Windows. Tire uma captura da mensagem e avise quem cuida do Termix (veja [Se algo der errado](#se-algo-der-errado)). As saídas, em ordem:

1. **Nada a fazer por enquanto**, até o responsável decidir. Não tente contornar.
2. **Desligar o Smart App Control** nesse PC, só se a empresa aceitar. Atenção: depois de desligado, **ele não volta a ligar sem reinstalar o Windows**. Fica em *Segurança do Windows → Controle de aplicativos e navegador → Configurações do Smart App Control → Desativado*.

## 3. Primeiro uso

1. Clique em **+ Novo projeto** (o Termix cria e organiza a pasta) ou importe uma pasta que já existe. O nome do projeto pode ter até 60 caracteres.
2. A primeira aba abre sozinha. Escolha **Chat** (conversa em bolhas) ou **Terminal**.
3. Se aparecer **"Claude Code não foi encontrado"**, o Claude Code não está instalado ou não está no PATH do Windows. Instale-o, **feche e abra o Termix** e tente de novo.

Os limites de 5 horas e de 7 dias aparecem na tela **Consumo** (e nos anéis ao lado do terminal) depois que uma sessão responde pela primeira vez.

## 4. Atualizar

O Termix confere sozinho se há versão nova (alguns segundos depois de abrir e a cada 4 horas). Quando houver, aparece um aviso no cabeçalho:

1. O app **baixa e prepara a versão nova em segundo plano**, sem você parar de trabalhar. O chip no cabeçalho mostra o andamento.
2. Quando o chip ficar verde, clique em **Reiniciar agora** (ou em **Depois**, e o botão **Atualizar** fica no cabeçalho).
3. O app reabre em poucos segundos e as abas voltam sozinhas.

A versão instalada aparece ao lado do nome **Termix**, no canto superior esquerdo (por exemplo, `v0.3.4`).

## 5. Desinstalar

Em **Configurações do Windows → Aplicativos → Aplicativos instalados → Termix → Desinstalar**. Seus projetos, abas e configurações ficam guardados em `%APPDATA%\Termix` e **não são apagados**. As conversas em si são do Claude Code (`%USERPROFILE%\.claude`).

## Se algo der errado

Avise quem cuida do Termix, ou abra uma [issue](https://github.com/rocruzta50IND/termix/issues). Para ajudar, diga:

- a **versão do Termix** (a do instalador, ou a que aparece ao lado do nome no app);
- o **que você fez** e o **que apareceu** (uma captura da janela ajuda muito);
- o resultado do **Smart App Control** (seção 1) se o problema foi na instalação.

Se o app abre mas algo falha, o arquivo `%APPDATA%\Termix\erros.log` (se existir) ajuda a achar a causa. **Nunca envie chaves, senhas ou conteúdo de conversa** em issues ou mensagens.

---

*Última revisão: versão 0.3.4. Testado em Windows 11 limpo (Windows Sandbox). Ainda sem teste: Windows 10 e PCs com Smart App Control **Ativado**; esta página será atualizada com o resultado.*
