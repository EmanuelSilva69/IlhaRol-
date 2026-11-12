param(
    [string]$Output = "ilharole-backup.sql"
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

$sql = docker compose -f $compose exec -T db pg_dump -U $dbUser -d $dbName

if ($LASTEXITCODE -ne 0) {
    throw "Falha ao gerar o backup do banco."
}

if (-not $sql) {
    throw "O backup gerado está vazio."
}

$sql | Set-Content -Path $Output -Encoding utf8
Write-Host "Backup salvo em $Output"
