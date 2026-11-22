# Verifica extensões, schemas, tabelas, views, funções e tamanho do banco.
param()

. "$PSScriptRoot\db-common.ps1"

$settings = Get-IlharoleDbSettings
Assert-IlharoleDbRunning $settings

Invoke-IlharoleDbFile -Settings $settings -ContainerPath (Get-IlharoleDbContainerPath "diagnostics/check.sql")

Write-Host "Banco consistente."
