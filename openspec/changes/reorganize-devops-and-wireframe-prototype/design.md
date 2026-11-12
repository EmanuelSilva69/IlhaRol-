# Design

## Context

Ver `proposal.md` — Why. A stack atual já sobe com PostgreSQL, FastAPI e Vite. O que muda é a organização dos arquivos e o nível de acabamento visual. O repositório remoto tem histórico próprio (`README.md` e `documentos/`) que precisa ser preservado.

## Goals / Non-Goals

**Goals:**

- Deixar `devops/` como ponto único de trabalho para Docker, banco, ambiente e scripts.
- Manter a stack funcionando com os mesmos serviços, portas e healthchecks.
- Fazer o front-end parecer um protótipo de baixa fidelidade, não um site final.
- Publicar o projeto no GitHub sem apagar o conteúdo existente.

**Non-Goals:**

- Criar schema de eventos, migrações ou endpoints de negócio.
- Redesenhar o mapa ou remover os marcadores.
- Configurar CI/CD, deploy ou backup automático.

## Decisions

### 1. Estrutura `devops/`

```text
devops/
├── README.md
├── .env.example
├── docker-compose.yml
├── docker/
│   ├── backend.Dockerfile
│   └── frontend.Dockerfile
├── db/
│   ├── README.md
│   └── init/
│       └── 01-init.sql
└── scripts/
    ├── db-shell.ps1
    ├── db-shell.sh
    ├── db-backup.ps1
    └── db-backup.sh
```

O compose usa contextos `../backend` e `../frontend` e aponta para os Dockerfiles em `devops/docker/`. Assim, cada aplicação mantém seu contexto de build enxuto e o DevOps fica centralizado.

**Alternativas:** manter Dockerfiles nas pastas das aplicações (menos centralizado); usar um único Dockerfile na raiz (perde a separação por serviço).

### 2. Ambiente e comandos

O `.env` passa a ficar em `devops/.env`, ao lado do compose. Os comandos documentados usam:

```bash
docker compose -f devops/docker-compose.yml up --build -d
```

O compose continua com o nome de projeto `ilharole`, o volume `ilharole_pgdata` e os mesmos healthchecks.

### 3. Banco de dados

O serviço `db` monta `devops/db/init` em `/docker-entrypoint-initdb.d` para scripts de inicialização. O script inicial apenas registra a inicialização; as tabelas e migrações ficam para a equipe de dados. `devops/db/README.md` documenta conexão, reset do volume e backup.

### 4. Front-end como wireframe

`App.tsx` passa a ser um layout de baixa fidelidade:

- cabeçalho com “HEADER AQUI” e navegação placeholder;
- coluna de filtros com blocos cinza e “possível local de informação”;
- feed com cards vazios;
- seção do mapa com o `EventMap` real, rotulada como protótipo;
- rodapé placeholder.

A paleta fica restrita a preto, branco e cinzas. O mapa mantém os temas e marcadores já implementados; ele é o único componente “real” da tela.

### 5. Back-end como esqueleto

A API continua com `/health` e a documentação OpenAPI. A rota raiz passa a declarar que é um protótipo. Nenhum endpoint de eventos, autenticação ou CRUD é criado.

### 6. Git e publicação

O repositório remoto já tem `README.md` e `documentos/`. O fluxo será:

1. copiar `documentos/` do remoto para o projeto local;
2. mover os PDFs locais para `documentos/DocuIniciais/`;
3. inicializar o Git local, buscar `origin/main` e anexar o histórico;
4. adicionar os arquivos, criar um commit e enviar para `main`.

O `.opencode/` e o `.env` não entram no commit.

## Risks / Trade-offs

- **Caminhos de Dockerfile fora do contexto** → validar com `docker compose config` e build real; se o Compose não resolver, mover o contexto para a raiz ou manter os Dockerfiles nas aplicações.
- **`.env` em `devops/`** → documentar o comando com `-f` e testar a leitura automática; se necessário, usar `--env-file devops/.env`.
- **Mapa colorido no wireframe** → aceitável como componente de protótipo; o restante da página permanece preto e branco.
- **Push no GitHub** → depende das credenciais locais do Git; se falhar, o commit fica pronto e o erro é reportado.
- **Documentos remotos** → copiar antes de qualquer `git add` para não removê-los.

## Migration Plan

1. Criar `devops/` e mover os arquivos.
2. Ajustar o compose e validar a stack.
3. Simplificar o front-end e o back-end.
4. Rodar testes e verificação visual.
5. Preservar documentos remotos, commitar e enviar.

Rollback: restaurar os arquivos para as posições anteriores e remover `devops/`; o volume do banco não é afetado.
