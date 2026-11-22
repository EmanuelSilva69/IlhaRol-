# Aplica migrações SQL versionadas em devops/db/migrations.
# - Controla versões/checksums em app.schema_migrations.
# - Impede alteração de migração já aplicada (drift de checksum).
# - Cada migração roda em uma transação única.
param(
    [switch]$DryRun
)

. "$PSScriptRoot\db-common.ps1"

$settings = Get-IlharoleDbSettings
Assert-IlharoleDbRunning $settings

$migrationsPath = Join-Path $script:IlharoleDevopsRoot "db\migrations"
$files = @(Get-ChildItem -Path $migrationsPath -Filter "*.sql" | Sort-Object Name)

if ($files.Count -eq 0) {
    throw "Nenhuma migração encontrada em $migrationsPath."
}

Invoke-IlharoleDbSql -Settings $settings -Sql @"
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS analytics;

CREATE TABLE IF NOT EXISTS app.schema_migrations (
    version text PRIMARY KEY,
    checksum text NOT NULL,
    applied_at timestamptz NOT NULL DEFAULT now()
);
"@ -SingleTransaction | Out-Null

$applied = @{}
$rows = Invoke-IlharoleDbPsql -Settings $settings -Capture -PsqlArgs @(
    "-c", "SELECT version || '|' || checksum FROM app.schema_migrations ORDER BY version;"
)

foreach ($row in @($rows)) {
    if ([string]::IsNullOrWhiteSpace($row)) { continue }
    $parts = $row.Split('|', 2)
    if ($parts.Count -eq 2) {
        $applied[$parts[0]] = $parts[1]
    }
}

$pending = @()
foreach ($file in $files) {
    $version = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
    if ($version -notmatch '^[A-Za-z0-9_.-]+$') {
        throw "Nome de migração inválido: $($file.Name)"
    }

    $checksum = (Get-FileHash -Path $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()

    if ($applied.ContainsKey($version)) {
        if ($applied[$version] -ne $checksum) {
            throw "Checksum divergente em $version. A migração já aplicada foi alterada; crie uma nova migração."
        }
        Write-Host "= $version (já aplicada)"
        continue
    }

    $pending += [pscustomobject]@{
        Version  = $version
        File     = $file
        Checksum = $checksum
    }
}

if ($pending.Count -eq 0) {
    if (-not $DryRun) {
        & (Join-Path $PSScriptRoot "db-roles.ps1")
    }
    Write-Host "Nenhuma migração pendente."
    return
}

if ($DryRun) {
    Write-Host "Migrações pendentes:"
    $pending | ForEach-Object { Write-Host "  - $($_.Version)" }
    return
}

# Garante papéis/default privileges antes de criar novas tabelas.
& (Join-Path $PSScriptRoot "db-roles.ps1")

foreach ($migration in $pending) {
    $containerPath = Get-IlharoleDbContainerPath "migrations/$($migration.File.Name)"
    $record = "INSERT INTO app.schema_migrations (version, checksum) VALUES ('$($migration.Version)', '$($migration.Checksum)');"

    Write-Host "+ $($migration.Version)"
    Invoke-IlharoleDbPsql -Settings $settings -SingleTransaction -PsqlArgs @(
        "-f", $containerPath,
        "-c", $record
    ) | Out-Null
}

# Reaplica grants/revokes nas tabelas criadas pelas migrações.
& (Join-Path $PSScriptRoot "db-roles.ps1")

Write-Host "Migrações aplicadas: $($pending.Count)."
