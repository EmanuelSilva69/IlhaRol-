# Tasks

## 1. Reestruturar DevOps

- [x] 1.1 Criar `devops/docker/`, mover `backend/Dockerfile` para `devops/docker/backend.Dockerfile` e `frontend/Dockerfile` para `devops/docker/frontend.Dockerfile`; verificar que os arquivos originais não existem mais e que os novos mantêm o conteúdo.
- [x] 1.2 Mover `docker-compose.yml` para `devops/docker-compose.yml` e ajustar os `build.context`/`dockerfile` dos serviços `api` e `web`; verificar com `docker compose -f devops/docker-compose.yml config --quiet`.
- [x] 1.3 Mover `.env.example` para `devops/.env.example` e criar `devops/.env` a partir dele; verificar que o compose lê as variáveis e que `.env` continua ignorado pelo Git.
- [x] 1.4 Criar `devops/db/init/01-init.sql`, montar `./db/init` no serviço `db` e criar `devops/db/README.md` com conexão, reset e backup; verificar que o banco sobe e o script é executado em um volume novo.
- [x] 1.5 Criar `devops/scripts/db-shell.ps1`, `db-shell.sh`, `db-backup.ps1` e `db-backup.sh`; verificar que o shell abre o `psql` e que o backup gera um arquivo SQL não vazio.
- [x] 1.6 Criar `devops/README.md` com visão geral, comandos, portas, variáveis, banco e solução de problemas; verificar que os comandos documentados sobem a stack a partir da raiz.
- [x] 1.7 Atualizar o `README.md` raiz e `frontend/README.md` para os novos caminhos e comandos; verificar que não restam referências a `docker-compose.yml` na raiz.

## 2. Simplificar o front-end para wireframe

- [x] 2.1 Reescrever `frontend/src/App.tsx` como wireframe preto e branco com “HEADER AQUI”, filtros, feed de cards vazios, seção do mapa e rodapé placeholder; verificar que a página não usa cores fora de preto/cinza.
- [x] 2.2 Ajustar `frontend/src/index.css` e `EventMap.css` para o estilo de protótipo (bordas visíveis, sem sombra/arredondamento excessivo); verificar visualmente que o mapa continua funcional.
- [x] 2.3 Manter o `EventMap` e os marcadores como componente de protótipo e atualizar `frontend/README.md` para explicar que a tela é um mockup; verificar que os temas e marcadores continuam funcionando.
- [x] 2.4 Rodar `npm run build` e `npm test` no front-end; verificar que o build e os 12 testes passam.

## 3. Simplificar o back-end

- [x] 3.1 Atualizar a rota raiz de `backend/app/main.py` para declarar que a API é um protótipo e apontar para `/docs`; verificar com `curl http://localhost:8000/`.
- [x] 3.2 Atualizar a documentação do back-end para deixar claro que não há endpoints de negócio; verificar que `/health` continua retornando `200` conectado.
- [x] 3.3 Rodar `docker compose -f devops/docker-compose.yml run --rm api pytest -q`; verificar que os 2 testes passam.

## 4. Git e publicação no GitHub

- [x] 4.1 Copiar `documentos/` do repositório remoto para o projeto local e mover os PDFs locais para `documentos/DocuIniciais/`; verificar que nenhum documento existente foi perdido.
- [x] 4.2 Adicionar `.opencode/` ao `.gitignore`, inicializar o Git local, configurar `origin` e anexar o histórico de `origin/main`; verificar com `git log --oneline -3` e `git status`.
- [x] 4.3 Revisar o que será commitado (`git status`, `git diff --stat`), garantir que `.env`, `node_modules`, `dist` e `.opencode/` estão fora e criar um único commit com `devops/`, `backend/` e `frontend/`.
- [x] 4.4 Enviar o commit para `origin/main`; verificar com `git ls-remote origin refs/heads/main` e confirmar que o commit local está no remoto.

## Workflow follow-up

- Arquivar a mudança após a revisão e o push.
- Verificar no GitHub que `devops/`, `backend/`, `frontend/` e `documentos/` aparecem separados.
