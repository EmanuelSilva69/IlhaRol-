# Smoke tests de escrita/leitura. Tudo é revertido ao final.
param()

. "$PSScriptRoot\db-common.ps1"

$settings = Get-IlharoleDbSettings
Assert-IlharoleDbRunning $settings

Invoke-IlharoleDbFile -Settings $settings -ContainerPath (Get-IlharoleDbContainerPath "diagnostics/smoke.sql")
