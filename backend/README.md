# Back-end — IlhaRolê (protótipo)

Esqueleto da API em FastAPI. Este back-end é intencionalmente mínimo: serve para a equipe validar a stack e evoluir os endpoints de negócio.

## O que existe

| Rota | Descrição |
| --- | --- |
| `GET /` | Identifica a API como protótipo e aponta para a documentação |
| `GET /health` | Verifica a API e a conexão com o PostgreSQL |
| `GET /docs` | Swagger UI gerado pelo FastAPI |

Não há autenticação, CRUD de eventos, favoritos, avaliações ou feed. Esses fluxos ficam para as próximas etapas.

## Estrutura

```text
backend/
├── app/
│   ├── config.py      # configuração via variáveis de ambiente
│   ├── db.py          # engine e sessão assíncronos
│   ├── main.py        # aplicação, CORS e rota raiz
│   └── routers/
│       └── health.py  # verificação de saúde
├── tests/
├── pytest.ini
└── requirements.txt
```

O `Dockerfile` fica em `devops/docker/backend.Dockerfile`.

## Executar

A partir da raiz do repositório:

```bash
docker compose -f devops/docker-compose.yml up -d db api
curl http://localhost:8000/
curl http://localhost:8000/health
```

O código é montado como volume; alterações em `backend/` são recarregadas pelo Uvicorn.

## Testes

```bash
docker compose -f devops/docker-compose.yml run --rm api pytest -q
```

## Próximos passos

- Definir os modelos SQLAlchemy e as migrações do banco.
- Implementar autenticação e autorização.
- Criar os endpoints de eventos, feed, favoritos e avaliações.
- Adicionar testes de integração com o PostgreSQL real.
