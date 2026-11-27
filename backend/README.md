# Back-end — IlhaRolê

API em FastAPI com autenticação JWT, Argon2 e persistência no PostgreSQL.
A camada de banco é versionada em `devops/db/migrations/` e o seed de
demonstração fica em `devops/db/seeds/`.

## Estrutura

```text
app/
├── routers/        HTTP: valida a entrada, chama o serviço e devolve o schema
├── services/       regras de negócio; lançam erros de app/exceptions.py
├── repositories/   consultas SQLAlchemy, sem regra de negócio
├── serializers.py  converte modelos em schemas (dados relacionados em lote)
├── schemas.py      contratos de entrada e saída (Pydantic)
├── models.py       mapeamento das tabelas app.* criadas pelas migrações
└── errors.py       respostas de erro padronizadas: {"detail": "..."}
```

Uma regra nova vai no serviço; uma consulta nova, no repositório. As rotas não
acessam o banco diretamente.

## Rotas

| Método | Rota | Autenticação | Descrição |
| --- | --- | --- | --- |
| `GET` | `/` | pública | Identifica a API |
| `GET` | `/health` | pública | Verifica a conexão com o banco |
| `GET` | `/docs` | pública | Swagger UI |
| `POST` | `/api/auth/register` | pública | Cria conta e retorna JWT |
| `POST` | `/api/auth/login` | pública | Autentica e retorna JWT |
| `GET` | `/api/auth/me` | JWT | Perfil do usuário autenticado |
| `POST` | `/api/auth/logout` | pública | Encerra a sessão no cliente |
| `POST` | `/api/auth/forgot-password` | pública | Gera token de recuperação |
| `POST` | `/api/auth/reset-password` | pública | Redefine a senha com token |
| `DELETE` | `/api/auth/account` | JWT | Desativa a própria conta |
| `GET` | `/api/categorias` | pública | Lista categorias |
| `GET` | `/api/bairros` | pública | Lista os bairros aceitos |
| `GET` | `/api/eventos` | opcional | Feed com busca, bairro, categoria e período |
| `GET` | `/api/eventos/{id}` | opcional | Detalhes do evento |
| `POST` | `/api/eventos` | produtor/admin | Publica evento |
| `PATCH` | `/api/eventos/{id}` | criador/admin | Edita evento e notifica favoritos |
| `POST` | `/api/eventos/{id}/cancelar` | criador/admin | Cancela e notifica favoritos |
| `POST` | `/api/eventos/{id}/favorito` | JWT | Adiciona à agenda |
| `DELETE` | `/api/eventos/{id}/favorito` | JWT | Remove da agenda |
| `GET` | `/api/eventos/{id}/avaliacoes` | pública | Lista avaliações |
| `POST` | `/api/eventos/{id}/avaliacoes` | JWT | Avalia evento realizado |
| `GET` | `/api/me/perfil` | JWT | Perfil, interesses e preferências |
| `PATCH` | `/api/me/perfil` | JWT | Atualiza dados do próprio perfil |
| `POST` | `/api/me/senha` | JWT | Altera a senha do usuário |
| `GET` | `/api/me/preferencias` | JWT | Preferências de alerta |
| `PUT` | `/api/me/preferencias` | JWT | Atualiza preferências de alerta |
| `GET` | `/api/me/agenda` | JWT | Eventos favoritados |
| `GET` | `/api/me/eventos` | JWT | Eventos publicados pelo usuário, em qualquer situação |
| `GET` | `/api/me/notificacoes` | JWT | Notificações do usuário |
| `POST` | `/api/me/notificacoes/lidas` | JWT | Marca notificações como lidas |
| `GET` | `/api/me/denuncias` | JWT | Denúncias do usuário |
| `POST` | `/api/denuncias` | JWT | Denuncia evento ou avaliação |

## Regras do feed e dos eventos

- `q` busca no título e na descrição sem diferenciar maiúsculas nem acentos.
- `periodo` aceita `PROXIMOS`, `FIM_DE_SEMANA` (sábado e domingo, horário de
  São Luís, ainda não encerrados) e `PASSADOS`; outro valor retorna 422.
- `status` é calculado: `CANCELADO` se cancelado, `REALIZADO` depois do
  término e `ATIVO` nos demais casos.
- Criação e edição exigem data de início futura, latitude e longitude juntas e
  bairro da lista de `GET /api/bairros`; evento gratuito não pode ter preço.

## Autenticação

- Senhas com Argon2 e salt individual.
- JWT HS256 assinado com `JWT_SECRET`; expiração em `JWT_EXPIRE_MINUTES`.
- Envie `Authorization: Bearer <token>` nas rotas protegidas.
- `GET /api/eventos` aceita token opcional para preencher `is_favorite`.

Conta de demonstração criada pelo seed:

```text
produtor@example.com / demo1234   (produtor)
ana@example.com      / demo1234   (espectadora)
```

## Executar

```bash
docker compose -f devops/docker-compose.yml up -d db api
curl http://localhost:8000/health
```

O código é montado como volume; alterações em `backend/` são recarregadas pelo
Uvicorn. Se `requirements.txt` mudar, reconstrua:

```bash
docker compose -f devops/docker-compose.yml up -d --build api
```

## Banco

O back-end usa as tabelas `app.*` criadas pelas migrações. Antes de usar a API
em um volume novo ou após um reset:

```bash
docker compose -f devops/docker-compose.yml up -d db
./devops/scripts/db-migrate.sh
./devops/scripts/db-seed.sh
```

## Testes

```bash
docker compose -f devops/docker-compose.yml run --rm api pytest -q
```

Sem banco, rodam só os testes unitários (health, contrato OpenAPI, Argon2, JWT
e helpers); os de integração são pulados.

Os testes de integração exercitam a API contra um PostgreSQL real. Eles usam um
banco separado, terminado em `_test`, que é recriado a cada execução com
`devops/db/init` e `devops/db/migrations`; o banco de desenvolvimento não é tocado.

```bash
docker compose -f devops/docker-compose.yml up -d db
docker compose -f devops/docker-compose.yml run --rm \
  -v "$(pwd)/devops/db:/devops/db:ro" \
  -e ILHAROLE_DB_DIR=/devops/db \
  -e TEST_DATABASE_URL="postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@db:5432/ilharole_test" \
  api pytest -q
```

O usuário de `TEST_DATABASE_URL` precisa poder criar bancos e extensões (o
`POSTGRES_USER` do compose pode).

## Teste de carga

Mede o p95 do feed, dos detalhes e da agenda com usuários simultâneos (meta:
abaixo de 500 ms). Os dados de carga são marcados e podem ser removidos sem
afetar o restante do banco.

```bash
# 1.000 eventos, usuários e avaliações de carga no banco configurado
docker compose -f devops/docker-compose.yml run --rm api python -m scripts.seed_load_data --events 1000

# 10 usuários simultâneos contra a API em execução
docker compose -f devops/docker-compose.yml exec api python -m scripts.load_test --base-url http://localhost:8000 --users 10

# remove os dados de carga
docker compose -f devops/docker-compose.yml run --rm api python -m scripts.seed_load_data --reset-only
```

O script sai com código 1 se alguma rota passar da meta. Ele mede o tempo do
servidor, sem simular a latência da rede móvel.
