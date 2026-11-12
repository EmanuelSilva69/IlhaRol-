# Spec Delta

## Purpose

Apresenta eventos culturais em um mapa interativo centrado em São Luís, com temas visuais e marcadores animados que identificam a categoria de cada evento.

## ADDED Requirements

### Requirement: Mapa interativo centrado em São Luís
O componente de mapa SHALL exibir um mapa interativo com visualização inicial centralizada em São Luís, Maranhão, permitindo ampliar, reduzir e deslocar a visualização.

#### Scenario: Abertura do mapa
- **WHEN** o componente de mapa é renderizado sem coordenadas específicas de evento
- **THEN** a visualização inicial mostra a região de São Luís em um nível de zoom que permite reconhecer a cidade

#### Scenario: Interação com o mapa
- **WHEN** o usuário arrasta ou aplica zoom no mapa
- **THEN** a visualização é atualizada sem recarregar a página

### Requirement: Base cartográfica gratuita com atribuição
O mapa SHALL usar dados cartográficos derivados do OpenStreetMap por meio de um provedor gratuito que não exija chave de API, e SHALL exibir a atribuição exigida pelo provedor.

#### Scenario: Carregamento sem chave de API
- **WHEN** o mapa é aberto em um ambiente sem chaves de serviços pagos
- **THEN** os tiles são carregados e o mapa é exibido normalmente

#### Scenario: Atribuição visível
- **WHEN** o mapa está visível
- **THEN** a atribuição ao OpenStreetMap e ao provedor de tiles é exibida no mapa

### Requirement: Temas visuais do mapa
O mapa SHALL oferecer os modos claro, escuro e temático, selecionáveis pela configuração do componente, alterando a aparência da base cartográfica sem recarregar a página.

#### Scenario: Alternância de tema
- **WHEN** o modo do mapa é alterado entre claro, escuro e temático
- **THEN** a aparência dos tiles e das cores do mapa é atualizada imediatamente

#### Scenario: Tema padrão
- **WHEN** o componente é renderizado sem um modo informado
- **THEN** o mapa é exibido no modo claro

### Requirement: Marcadores distintos por categoria
O mapa SHALL renderizar cada evento como um marcador posicionado em suas coordenadas, usando um marcador visual distinto para as categorias Música, Teatro e Gastronomia.

#### Scenario: Eventos de categorias diferentes
- **WHEN** o mapa recebe eventos das categorias Música, Teatro e Gastronomia
- **THEN** cada evento é exibido na sua coordenada com o marcador correspondente à sua categoria

#### Scenario: Categoria desconhecida ou ausente
- **WHEN** um evento possui categoria ausente ou não reconhecida
- **THEN** o evento é exibido com um marcador neutro e o restante do mapa permanece funcional

### Requirement: Marcadores animados e acessíveis
Os marcadores das três categorias SHALL conter animação visual própria e SHALL manter identificação da categoria quando a animação não estiver disponível. Quando o usuário preferir movimento reduzido, a animação SHALL ser desativada sem remover o marcador.

#### Scenario: Animação do marcador
- **WHEN** o mapa é exibido com a preferência de movimento padrão
- **THEN** os marcadores de Música, Teatro e Gastronomia apresentam suas animações características

#### Scenario: Preferência por movimento reduzido
- **WHEN** o usuário configurou o sistema para reduzir movimento
- **THEN** os marcadores são exibidos sem animação e continuam distinguíveis por categoria

#### Scenario: Identificação do evento no marcador
- **WHEN** um leitor de tela ou tecnologia assistiva acessa um marcador
- **THEN** o marcador expõe o título do evento e sua categoria como texto acessível
