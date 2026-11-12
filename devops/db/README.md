# Banco de dados — IlhaRolê

O PostgreSQL roda no serviço `db` do `devops/docker-compose.yml`.

## Conexão

| Item | Valor |
| --- | --- |
| Host (dentro dos contêineres) | `db` |
| Porta interna | `5432` |
| Banco | `POSTGRES_DB` (padrão `ilharole`) |
| Usuário | `POSTGRES_USER` (padrão `ilharole`) |
| Senha | `POSTGRES_PASSWORD` em `devops/.env` |

A porta do banco não é publicada no host. Para acessar pelo terminal:

```powershell
.\devops\scripts\db-shell.ps1
```

```bash
./devops/scripts/db-shell.sh
```

Ou diretamente:

```bash
docker compose -f devops/docker-compose.yml exec db \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

## Inicialização

Os scripts em `devops/db/init/` são executados **apenas quando o volume é criado pela primeira vez**. O arquivo `01-init.sql` é um ponto de partida para extensões e objetos base.

Para aplicar novos scripts de inicialização, é necessário recriar o volume:

```bash
docker compose -f devops/docker-compose.yml down -v
docker compose -f devops/docker-compose.yml up -d db
```

> Atenção: `down -v` apaga todos os dados do banco local.

## Backup e restauração

Gerar um dump SQL:

```powershell
.\devops\scripts\db-backup.ps1
```

```bash
./devops/scripts/db-backup.sh
```

O arquivo padrão é `ilharole-backup.sql`. Para restaurar:

```bash
docker compose -f devops/docker-compose.yml exec -T db \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < ilharole-backup.sql
```

## Próximos passos

- Definir o schema de usuários, eventos, categorias, favoritos e avaliações.
- Adicionar migrações versionadas (por exemplo, Alembic) em vez de alterar o banco manualmente.
- Configurar backup automático e retenção antes de qualquer ambiente de produção.
