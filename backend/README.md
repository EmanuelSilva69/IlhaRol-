# Back-end — IlhaRolê

API em FastAPI com autenticação JWT, Argon2 e persistência no PostgreSQL.
A camada de banco é versionada em `devops/db/migrations/` e o seed de
demonstração fica em `devops/db/seeds/`.

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
| `GET` | `/api/bairros` | pública | Lista bairros com locais cadastrados |
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
| `GET` | `/api/me/notificacoes` | JWT | Notificações do usuário |
| `POST` | `/api/me/notificacoes/lidas` | JWT | Marca notificações como lidas |
| `GET` | `/api/me/denuncias` | JWT | Denúncias do usuário |
| `POST` | `/api/denuncias` | JWT | Denuncia evento ou avaliação |

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
