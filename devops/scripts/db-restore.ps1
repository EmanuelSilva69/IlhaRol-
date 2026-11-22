# Restaura um dump SQL gerado por db-backup.
# Atenção: por padrão recria os schemas app/audit/analytics antes de importar.
param(
    [Parameter(Position = 0)]
    [string]$InputFile = "ilharole-backup.sql",
    [switch]$Force
)

. "$PSScriptRoot\db-common.ps1"

$settings = Get-IlharoleDbSettings
Assert-IlharoleDbRunning $settings

if (-not (Test-Path $InputFile)) {
    throw "Arquivo não encontrado: $InputFile"
}

$fileInfo = Get-Item $InputFile
if ($fileInfo.Length -eq 0) {
    throw "O arquivo de backup está vazio: $InputFile"
}

if (-not $Force) {
    $answer = Read-Host "Isso substitui os dados atuais de app/audit/analytics. Digite 'restore' para continuar"
    if ($answer -ne "restore") {
        Write-Host "Cancelado."
        exit 0
    }
}

Invoke-IlharoleDbSql -Settings $settings -SingleTransaction -Sql @"
DROP SCHEMA IF EXISTS analytics CASCADE;
DROP SCHEMA IF EXISTS audit CASCADE;
DROP SCHEMA IF EXISTS app CASCADE;
"@ | Out-Null

$sql = Get-Content -Path $InputFile -Raw -Encoding UTF8
if ([string]::IsNullOrWhiteSpace($sql)) {
    throw "Não foi possível ler o conteúdo do backup."
}

$dockerArgs = @(
    "compose", "-f", $settings.Compose, "exec", "-T", "db",
    "psql", "-U", $settings.POSTGRES_USER, "-d", $settings.POSTGRES_DB,
    "-v", "ON_ERROR_STOP=1", "--quiet", "--single-transaction"
)

$sql | & docker @dockerArgs
if ($LASTEXITCODE -ne 0) {
    throw "Falha ao restaurar o backup (código $LASTEXITCODE)."
}

# Reaplica grants/default privileges; o dump pode ter vindo de outro volume.
& (Join-Path $PSScriptRoot "db-roles.ps1")

Write-Host "Backup restaurado a partir de $InputFile"
