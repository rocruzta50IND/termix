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
| **Ativado** | O Windows bloqueia programas sem assinatura que ele não conhece. | O instalador do Termix **provavelmente será bloqueado**. Leia [Desligar o Smart App Control](#desligar-o-smart-app-control-decisão-da-equipe) antes de instalar: é o caminho decidido pela equipe, e ele explica o que muda. |

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

Ao dar duplo clique no instalador, pode aparecer uma janelinha com um **X vermelho** e o texto **"Uma política de Controle de Aplicativo bloqueou este arquivo"**, só com o botão OK. Esse é o **Smart App Control** (o Windows não cita o nome dele). **Não há botão "executar assim mesmo"**: é uma regra do Windows, e o Termix não consegue mudar isso. Não confunda com o **SmartScreen** ("O Windows protegeu o computador"), que é outro recurso, tem o botão "Executar assim mesmo" e **não precisa ser desligado**.

**O resultado não é previsível**: no teste com o Smart App Control ligado (Windows Sandbox), o instalador da 0.3.4 passou numa tentativa e foi bloqueado em outra, e o da 0.3.3 foi bloqueado. O Windows decide pela reputação do arquivo na nuvem, que muda. Com o Smart App Control ligado, **conte com o bloqueio**.

### Desligar o Smart App Control (decisão da equipe)

O Termix não tem assinatura digital (é interno e a equipe decidiu não pagar certificado). Por isso, a saída adotada para quem tem o Smart App Control **Ativado** é **desligá-lo**. A decisão é de cada pessoa, sobre o próprio PC: só faça se concordar com o que está abaixo. Se o PC é da empresa e gerenciado pela TI, **peça autorização** antes.

**O que o Smart App Control faz.** Ele só existe no Windows 11 (a partir da versão 22H2) e, quando ligado, **bloqueia programas que não têm assinatura digital confiável e que a Microsoft ainda não conhece**. Ele é uma camada extra, **além** do antivírus.

**O que muda ao desligar:**

- Deixa de existir o bloqueio automático de programas **desconhecidos e sem assinatura**. Se você abrir, por engano, um programa malicioso sem assinatura, essa camada não vai barrá-lo.
- **Não é irreversível por culpa do Termix, mas é irreversível na prática:** a Microsoft informa que, depois de desligado, o Smart App Control **só volta a ser ligado reinstalando ou redefinindo o Windows**. Por isso, decida com calma.
- Seu PC passa a ter o **mesmo nível de proteção que o Windows 10 e as versões do Windows 11 anteriores a 2022 sempre tiveram** (eles nem têm esse recurso). Muitas pessoas e empresas usam o Windows assim todos os dias.

**O que NÃO muda (continua protegendo):**

- o **Antivírus do Microsoft Defender** (ou o antivírus da empresa), com proteção em tempo real, que continua analisando o que você baixa e executa;
- o **SmartScreen**, que continua avisando sobre downloads e programas suspeitos;
- o **Firewall**, o **Controle de Conta de Usuário (UAC)**, a **proteção contra ransomware** e as **atualizações do Windows**;
- seus arquivos, projetos e configurações: **nada é apagado ou alterado**.

**Não é risco zero**, só é pequeno quando você mantém o resto. Para manter o PC seguro depois de desligar:

1. Deixe o **antivírus em tempo real** e o **SmartScreen** ligados.
2. Baixe o Termix **somente** da página oficial de [Releases](https://github.com/rocruzta50IND/termix/releases/latest) do projeto.
3. Não execute arquivos de origem desconhecida (anexos de e-mail, links de mensagens, "cracks" e afins), como já vale para qualquer PC.
4. Mantenha o Windows atualizado.

**Como desligar:** *Segurança do Windows → Controle de aplicativos e navegador → Configurações do Smart App Control → Desativado*. Depois, execute o instalador de novo. Não é preciso reiniciar o PC.

Se, mesmo com o Smart App Control **Desativado**, algo ainda for bloqueado, o motivo pode ser o antivírus da empresa: veja a seção anterior e avise quem cuida do Termix.

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

*Última revisão: versão 0.3.6. Testado também num PC real com Windows 11 e Smart App Control em **Avaliação**: o instalador da 0.3.5 passou com o aviso do SmartScreen ("Executar assim mesmo") e o app abriu (a primeira abertura demora mais). Testado em Windows 11 limpo (Windows Sandbox). Com Smart App Control ligado (Sandbox), a 0.3.3 foi bloqueada e a 0.3.4 instalou numa tentativa e foi bloqueada em outra; a saída decidida é desligá-lo (ver seção acima). Ainda sem teste: instalar com o Smart App Control **desligado** (para confirmar que o instalador passa), Windows 10, atualização de uma versão antiga e PCs reais com antivírus da empresa; esta página será atualizada com o resultado.*
