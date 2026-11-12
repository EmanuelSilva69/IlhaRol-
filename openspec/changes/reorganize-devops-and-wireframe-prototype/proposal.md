# Proposal

## Why

A base do IlhaRolê já funciona, mas os arquivos de infraestrutura estão espalhados na raiz e nos serviços, e a interface parece mais acabada do que o momento do projeto permite. A equipe de DB/DevOps precisa de um espaço próprio para trabalhar, e as demais equipes precisam de um protótipo claramente inacabado para evoluir sem confundir mockup com produto final.

## What Changes

- Criar `devops/` e concentrar ali o `docker-compose.yml`, os Dockerfiles, o `.env.example`, a inicialização do PostgreSQL, scripts de apoio e a documentação de infraestrutura.
- Atualizar os comandos documentados para usar `docker compose -f devops/docker-compose.yml`.
- Simplificar o front-end para um wireframe preto e branco, com textos como “HEADER AQUI” e “possível local de informação”, mantendo o `EventMap` apenas como componente de protótipo.
- Simplificar o back-end para um esqueleto declaradamente de protótipo, sem endpoints de negócio.
- Preservar os documentos já existentes no repositório remoto e publicar o projeto no GitHub em um commit com `devops/`, `backend/` e `frontend/` separados.

## Capabilities

### New Capabilities

Nenhuma. A mudança é de organização, apresentação e publicação; o comportamento dos serviços e do mapa permanece o mesmo.

### Modified Capabilities

Nenhuma.

## Impact

- **Arquivos movidos:** `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile` e `.env.example`.
- **Novos arquivos:** `devops/README.md`, `devops/db/`, `devops/scripts/`.
- **Front-end:** `App.tsx` e estilos passam a exibir um wireframe; `EventMap` continua funcional.
- **Back-end:** mensagem raiz passa a indicar protótipo; `/health` permanece igual.
- **Git:** repositório local inicializado sobre o histórico de `https://github.com/EmanuelSilva69/IlhaRol-`, com `documentos/` preservado.
- **Fora de escopo:** implementar telas finais, endpoints de negócio ou alterar o schema do banco.
