# Entrega v2 — IlhaRolê

Arquivo de preservação da entrega v2 do projeto.

## Conteúdo

| Item | Descrição |
| --- | --- |
| `IlhaRole_entrega_v2.zip` | Pacote pronto para envio: `relatorio.pdf`, `codigo/` e `repositorio.txt` |
| `relatorio.pdf` | Relatório ampliado com 30 páginas e 18 capturas |
| `relatorio.html` | Fonte editável do relatório |
| `prints/` | 18 capturas individuais das telas e estados |
| `repositorio.txt` | Link do repositório público |

## Identificação

- **Projeto:** IlhaRolê — agenda cultural de São Luís (MA)
- **Versão:** v2
- **Data:** 22/11/2026
- **Repositório:** https://github.com/EmanuelSilva69/IlhaRol-.git

## Integrantes

- Emanuel Lopes Silva
- José Nunes de Sousa Neto
- Josuel Pinheiro Barros Junior
- Leonidas Ferreira da Silva Serra
- Marcos Vinicius Jansem Oliveira
- Thales Aymar Fortes de Souza

## Execução

```bash
cp devops/.env.example devops/.env
docker compose -f devops/docker-compose.yml up --build -d
./devops/scripts/db-migrate.sh
./devops/scripts/db-seed.sh
```

- Front-end: http://localhost:5173
- API: http://localhost:8000
- Swagger: http://localhost:8000/docs
- Conta demo: `produtor@example.com` / `demo1234`

## Observação

O código-fonte também está versionado na raiz do repositório. O ZIP mantém a
estrutura exigida pela entrega acadêmica, sem `node_modules`, `.git`, caches,
`dist` ou arquivos `.env` reais.
