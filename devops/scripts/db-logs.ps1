# Acompanha os logs do serviço db.
param(
    [int]$Tail = 200
)

. "$PSScriptRoot\db-common.ps1"

$settings = Get-IlharoleDbSettings
& docker compose -f $settings.Compose logs -f --tail $Tail db
