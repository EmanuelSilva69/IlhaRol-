# Utilitários compartilhados pelos scripts de banco.
# Uso: . "$PSScriptRoot\db-common.ps1"

$ErrorActionPreference = "Stop"
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$script:IlharoleDevopsRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$script:IlharoleDbContainerRoot = "/opt/ilharole-db"

function Get-IlharoleDbSettings {
    $envFile = Join-Path $script:IlharoleDevopsRoot ".env"
    $settings = @{
        Compose          = (Join-Path $script:IlharoleDevopsRoot "docker-compose.yml")
        POSTGRES_USER    = "ilharole"
        POSTGRES_DB      = "ilharole"
        POSTGRES_PASSWORD = ""
        POSTGRES_HOST    = "db"
        POSTGRES_PORT    = "5432"
        ILHAROLE_APP_USER = "ilharole_app"
        ILHAROLE_APP_PASSWORD = "change-me-app"
        ILHAROLE_READONLY_USER = "ilharole_readonly"
        ILHAROLE_READONLY_PASSWORD = "change-me-readonly"
    }

    if (Test-Path $envFile) {
        Get-Content $envFile | ForEach-Object {
            if ($_ -match '^\s*([^#][^=]*)=(.*)$') {
                $settings[$matches[1].Trim()] = $matches[2].Trim()
            }
        }
    }

    return $settings
}

function Assert-IlharoleDbRunning {
    param([hashtable]$Settings)

    $containerId = & docker compose -f $Settings.Compose ps -q db 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $containerId) {
        throw "O serviço 'db' não está em execução. Suba com: docker compose -f devops/docker-compose.yml up -d db"
    }
}

function Invoke-IlharoleDbPsql {
    param(
        [hashtable]$Settings,
        [string[]]$PsqlArgs,
        [switch]$SingleTransaction,
        [switch]$Capture
    )

    $dockerArgs = @(
        "compose", "-f", $Settings.Compose, "exec", "-T", "db",
        "psql", "-U", $Settings.POSTGRES_USER, "-d", $Settings.POSTGRES_DB,
        "-v", "ON_ERROR_STOP=1", "--quiet"
    )

    if ($Capture) {
        $dockerArgs += @("-t", "-A", "-F", "|")
    }
    if ($SingleTransaction) {
        $dockerArgs += "--single-transaction"
    }
    $dockerArgs += $PsqlArgs

    $output = & docker @dockerArgs
    if ($LASTEXITCODE -ne 0) {
        throw "psql falhou com código $LASTEXITCODE."
    }

    return $output
}

function Invoke-IlharoleDbSql {
    param(
        [hashtable]$Settings,
        [string]$Sql,
        [switch]$SingleTransaction
    )

    Invoke-IlharoleDbPsql -Settings $Settings -PsqlArgs @("-c", $Sql) -SingleTransaction:$SingleTransaction
}

function Invoke-IlharoleDbFile {
    param(
        [hashtable]$Settings,
        [string]$ContainerPath,
        [switch]$SingleTransaction
    )

    Invoke-IlharoleDbPsql -Settings $Settings -PsqlArgs @("-f", $ContainerPath) -SingleTransaction:$SingleTransaction
}

function Get-IlharoleDbContainerPath {
    param([string]$RelativePath)

    $normalized = $RelativePath -replace '\\', '/'
    return "$script:IlharoleDbContainerRoot/$normalized"
}
