param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Command
)

$compose = Join-Path $PSScriptRoot "..\docker-compose.yml"
$envFile = Join-Path $PSScriptRoot "..\.env"
$settings = @{}

if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]*)=(.*)$') {
            $settings[$matches[1].Trim()] = $matches[2].Trim()
        }
    }
}

$dbUser = if ($settings.ContainsKey("POSTGRES_USER")) { $settings["POSTGRES_USER"] } else { "ilharole" }
$dbName = if ($settings.ContainsKey("POSTGRES_DB")) { $settings["POSTGRES_DB"] } else { "ilharole" }

if ($Command -and $Command.Count -gt 0) {
    docker compose -f $compose exec db psql -U $dbUser -d $dbName -c ($Command -join " ")
} else {
    docker compose -f $compose exec db psql -U $dbUser -d $dbName
}
