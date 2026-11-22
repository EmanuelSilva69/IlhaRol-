# Recria os schemas app/audit/analytics, reaplica migrações e seed.
# Uso: .\devops\scripts\db-reset.ps1 -Force
param(
    [switch]$Force
)

. "$PSScriptRoot\db-common.ps1"

$settings = Get-IlharoleDbSettings
Assert-IlharoleDbRunning $settings

if (-not $Force) {
    $answer = Read-Host "Isso apaga app, audit e analytics (não apaga as extensões). Digite 'reset' para continuar"
    if ($answer -ne "reset") {
        Write-Host "Cancelado."
        exit 0
    }
}

Invoke-IlharoleDbSql -Settings $settings -SingleTransaction -Sql @"
DROP SCHEMA IF EXISTS analytics CASCADE;
DROP SCHEMA IF EXISTS audit CASCADE;
DROP SCHEMA IF EXISTS app CASCADE;
"@ | Out-Null

& (Join-Path $PSScriptRoot "db-migrate.ps1")
& (Join-Path $PSScriptRoot "db-seed.ps1")

Write-Host "Reset concluído."
