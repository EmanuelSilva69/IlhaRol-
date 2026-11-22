# Diagnóstico de tamanho, conexões, cache, índices e consultas lentas.
param()

. "$PSScriptRoot\db-common.ps1"

$settings = Get-IlharoleDbSettings
Assert-IlharoleDbRunning $settings

Invoke-IlharoleDbFile -Settings $settings -ContainerPath (Get-IlharoleDbContainerPath "diagnostics/stats.sql")
