# Spec Delta

## Purpose

Fornece um ambiente local reproduzível que inicia banco de dados, API e interface web de forma coordenada, para que a equipe desenvolva e valide o IlhaRolê com a mesma configuração.

## ADDED Requirements

### Requirement: Ambiente local com um único comando
O projeto SHALL iniciar o banco de dados, a API e a interface web a partir de um único comando de orquestração, sem exigir instalação manual de cada serviço na máquina de desenvolvimento.

#### Scenario: Inicialização a partir de um checkout limpo
- **WHEN** um desenvolvedor copia o arquivo de exemplo de variáveis de ambiente e executa o comando documentado de inicialização
- **THEN** os três serviços são criados e a interface web e a API ficam acessíveis nas portas documentadas

#### Scenario: Inicialização com serviço indisponível
- **WHEN** um dos serviços não consegue iniciar
- **THEN** o comando reporta o serviço com falha e não indica o ambiente como pronto

### Requirement: Portas e acesso aos serviços
A interface web SHALL ser acessível na porta 5173 e a API SHALL ser acessível na porta 8000 do host. O banco de dados SHALL ser acessível pela API na rede interna do ambiente.

#### Scenario: Acesso à interface e à API
- **WHEN** o ambiente está em execução
- **THEN** uma requisição ao host na porta 5173 retorna a aplicação web e uma requisição ao host na porta 8000 retorna resposta da API

#### Scenario: Banco restrito à rede interna
- **WHEN** a API consulta o banco de dados
- **THEN** a conexão ocorre pelo nome do serviço de banco na rede interna, sem depender de endereço fixo do host

### Requirement: Conexão da API ao banco por variáveis de ambiente
A API SHALL obter host, porta, nome do banco, usuário e senha exclusivamente de variáveis de ambiente, sem credenciais ou endereços fixos no código.

#### Scenario: Alteração da configuração do banco
- **WHEN** os valores das variáveis de ambiente do banco são alterados e o ambiente é reiniciado
- **THEN** a API passa a usar os novos valores de conexão

#### Scenario: Banco indisponível na inicialização
- **WHEN** a API inicia e o banco de dados ainda não aceita conexões
- **THEN** a API permanece em execução e reporta a indisponibilidade na verificação de saúde, sem encerrar silenciosamente

### Requirement: Verificação de saúde dos serviços
A API SHALL expor uma verificação de saúde que informe se o serviço está operacional e se consegue acessar o banco de dados. O ambiente SHALL considerar os serviços prontos apenas quando essa verificação e a verificação do banco indicarem sucesso.

#### Scenario: Serviços saudáveis
- **WHEN** a API e o banco estão operacionais
- **THEN** a verificação de saúde da API retorna sucesso e indica conexão com o banco

#### Scenario: Banco inacessível
- **WHEN** a API está em execução mas não consegue acessar o banco
- **THEN** a verificação de saúde retorna estado de indisponibilidade e identifica o banco como não conectado

### Requirement: Persistência dos dados do banco
Os dados do PostgreSQL SHALL sobreviver à parada e à recriação dos contêineres do ambiente, sendo removidos apenas por uma ação explícita de descarte do volume de dados.

#### Scenario: Reinício do ambiente
- **WHEN** os serviços são parados e iniciados novamente sem descartar o volume de dados
- **THEN** os dados gravados antes da parada continuam disponíveis

#### Scenario: Descarte explícito dos dados
- **WHEN** o volume de dados é removido por uma ação explícita
- **THEN** o banco inicia vazio na próxima execução

### Requirement: Credenciais fora do versionamento
O projeto SHALL versionar apenas um arquivo de exemplo com valores genéricos de configuração. Credenciais reais e o arquivo de ambiente local SHALL ser ignorados pelo controle de versão.

#### Scenario: Repositório sem credenciais reais
- **WHEN** o repositório é inspecionado
- **THEN** ele contém apenas valores de exemplo e nenhuma senha real de banco ou chave de serviço

#### Scenario: Configuração local do desenvolvedor
- **WHEN** um desenvolvedor cria seu arquivo de ambiente local a partir do exemplo
- **THEN** esse arquivo não aparece como alteração a ser versionada
