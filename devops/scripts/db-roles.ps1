# Reaplica papéis, grants e default privileges do banco.
# Útil em volume antigo (criado antes do 02-roles.sh) ou após db-reset.
param()

. "$PSScriptRoot\db-common.ps1"

$settings = Get-IlharoleDbSettings
Assert-IlharoleDbRunning $settings

$dockerArgs = @(
    "compose", "-f", $settings.Compose, "exec", "-T",
    "-e", "ILHAROLE_APP_USER=$($settings.ILHAROLE_APP_USER)",
    "-e", "ILHAROLE_APP_PASSWORD=$($settings.ILHAROLE_APP_PASSWORD)",
    "-e", "ILHAROLE_READONLY_USER=$($settings.ILHAROLE_READONLY_USER)",
    "-e", "ILHAROLE_READONLY_PASSWORD=$($settings.ILHAROLE_READONLY_PASSWORD)",
    "db", "bash", "/opt/ilharole-db/init/02-roles.sh"
)

& docker @dockerArgs
if ($LASTEXITCODE -ne 0) {
    throw "Falha ao reaplicar papéis (código $LASTEXITCODE)."
}

Write-Host "Papéis, grants e default privileges reaplicados."
