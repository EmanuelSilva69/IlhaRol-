# Aplica o seed de demonstração (idempotente).
param()

. "$PSScriptRoot\db-common.ps1"

$settings = Get-IlharoleDbSettings
Assert-IlharoleDbRunning $settings

$hasEvents = Invoke-IlharoleDbPsql -Settings $settings -Capture -PsqlArgs @(
    "-c", "SELECT to_regclass('app.events') IS NOT NULL;"
)

if (@($hasEvents) -notcontains "t") {
    throw "As tabelas não existem. Rode primeiro: .\devops\scripts\db-migrate.ps1"
}

Invoke-IlharoleDbFile -Settings $settings -ContainerPath (Get-IlharoleDbContainerPath "seeds/0001_demo.sql") -SingleTransaction

# Atualiza a materialized view fora da transação do seed.
Invoke-IlharoleDbSql -Settings $settings -Sql "SELECT analytics.refresh_daily_event_stats();" | Out-Null

Write-Host "Seed de demonstração aplicado."
