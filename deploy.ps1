# ============================================================
# ProjectPulse - Deploy Completo (Build + Sync + Restart)
# Esegui dalla macchina di sviluppo.
# Uso:  .\deploy.ps1                       (default)
#       .\deploy.ps1 -SkipBuild            (solo sync + restart)
#       .\deploy.ps1 -SkipMigrate          (no migration DB)
#       .\deploy.ps1 -RemoteOnly           (solo restart remoto, no build/sync)
# ============================================================

param(
    [string]$Server       = "192.168.52.22",
    [string]$RemoteDir    = "C:\Apps\ProjectPulse",
    [int]$ApiPort         = 3000,
    [int]$ClientPort      = 5173,
    [switch]$SkipBuild,
    [switch]$SkipMigrate,
    [switch]$RemoteOnly
)

$ErrorActionPreference = "Stop"
$LocalRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$UncPath   = "\\$Server\c$\Apps\ProjectPulse"
$Stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

# ---------- Helpers ----------
function Write-Step([string]$step, [string]$msg) {
    Write-Host "`n[$step] $msg" -ForegroundColor Yellow
}
function Write-Ok([string]$msg) {
    Write-Host "  $msg" -ForegroundColor Green
}
function Write-Err([string]$msg) {
    Write-Host "  ERRORE: $msg" -ForegroundColor Red
}
function Write-Info([string]$msg) {
    Write-Host "  $msg" -ForegroundColor Gray
}

# Helper: esegue un blocco sul server remoto, con fallback locale via UNC
function Invoke-Remote {
    param(
        [scriptblock]$ScriptBlock,
        [object[]]$ArgumentList,
        [string]$Description
    )
    try {
        return Invoke-Command -ComputerName $Server -ScriptBlock $ScriptBlock -ArgumentList $ArgumentList
    } catch {
        Write-Info "PS Remoting non disponibile per: $Description"
        Write-Info "Errore: $_"
        return $null
    }
}

# ---------- Banner ----------
Write-Host ""
Write-Host "  ================================================" -ForegroundColor Cyan
Write-Host "   ProjectPulse - Deploy Completo" -ForegroundColor Cyan
Write-Host "   Server: $Server  |  Path: $RemoteDir" -ForegroundColor Cyan
Write-Host "  ================================================" -ForegroundColor Cyan
Write-Host ""

$totalSteps = 7
$currentStep = 0

# =============================================================
# STEP 1: Build locale
# =============================================================
$currentStep++
if (-not $SkipBuild -and -not $RemoteOnly) {
    Write-Step "$currentStep/$totalSteps" "Build locale (client + server)..."

    Push-Location $LocalRoot

    Write-Info "npm install (workspace root)..."
    npm install --no-audit --no-fund 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Err "npm install fallito"; Pop-Location; exit 1 }

    Write-Info "Build client (vite + tsc)..."
    npm run build --workspace=client 2>&1
    if ($LASTEXITCODE -ne 0) { Write-Err "Build client fallito"; Pop-Location; exit 1 }
    Write-Ok "Client build completato"

    Write-Info "Build server (tsc)..."
    npm run build --workspace=server 2>&1
    if ($LASTEXITCODE -ne 0) { Write-Err "Build server fallito"; Pop-Location; exit 1 }
    Write-Ok "Server build completato"

    Pop-Location
} else {
    Write-Step "$currentStep/$totalSteps" "Build locale SKIPPATO"
}

# =============================================================
# STEP 2: Verifica connessione al server remoto
# =============================================================
$currentStep++
Write-Step "$currentStep/$totalSteps" "Verifica connessione a $Server..."

if (-not (Test-Connection -ComputerName $Server -Count 1 -Quiet)) {
    Write-Err "Server $Server non raggiungibile!"
    exit 1
}

if (-not $RemoteOnly) {
    if (-not (Test-Path $UncPath)) {
        Write-Err "Path UNC $UncPath non accessibile! Verifica permessi admin share."
        exit 1
    }
}
Write-Ok "Server raggiungibile"

# =============================================================
# STEP 3: Stop PM2 sul server (libera file lock)
# =============================================================
$currentStep++
Write-Step "$currentStep/$totalSteps" "Stop servizi PM2 sul server..."

$stopBlock = {
    param($AppDir)
    if ($null -ne (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue)) {
        $PSNativeCommandUseErrorActionPreference = $false
    }
    cmd /c "pm2 delete projectpulse-api 2>nul"
    cmd /c "pm2 delete projectpulse-client 2>nul"
    # Piccola attesa per rilascio file handle
    Start-Sleep -Seconds 2
    return "OK"
}

$stopResult = Invoke-Remote -ScriptBlock $stopBlock -ArgumentList $RemoteDir -Description "Stop PM2"
if ($stopResult) {
    Write-Ok "PM2 fermato"
} else {
    Write-Info "PM2 stop via remoting fallito, tentativo non bloccante — i file potrebbero essere ancora in uso"
}

# =============================================================
# STEP 4: Sync file al server (robocopy)
# =============================================================
$currentStep++
if (-not $RemoteOnly) {
    Write-Step "$currentStep/$totalSteps" "Sincronizzazione file al server..."

    # Crea cartella remota se non esiste
    if (-not (Test-Path $UncPath)) {
        New-Item -ItemType Directory -Path $UncPath -Force | Out-Null
        Write-Info "Cartella remota creata"
    }

    # Backup .env sul server (non sovrascriverli)
    $envBackups = @()
    $envFiles = @(
        "$UncPath\server\.env",
        "$UncPath\client\.env.local"
    )
    foreach ($envFile in $envFiles) {
        if (Test-Path $envFile) {
            $backupPath = "$envFile.deploy-backup"
            Copy-Item $envFile $backupPath -Force
            $envBackups += @{ Original = $envFile; Backup = $backupPath }
            Write-Info "Backup: $(Split-Path -Leaf $envFile)"
        }
    }

    # Robocopy: sync tutto escludendo node_modules, .git, logs, .env, file temporanei
    Write-Info "Robocopy in corso..."
    $robocopyArgs = @(
        $LocalRoot,
        $UncPath,
        "/E",                          # Ricorsivo con sottocartelle vuote
        "/PURGE",                      # Elimina file non presenti nel sorgente
        "/XD", "node_modules", ".git", ".claude", "logs", ".vscode", "coverage",  # Escludi cartelle
        "/XF", ".env", ".env.local", ".env.production", "*.log", "*.deploy-backup", "thumbs.db", "nul",  # Escludi file
        "/NFL", "/NDL", "/NJH",        # Riduci output verboso
        "/MT:8",                       # Multi-thread (8)
        "/R:3",                        # Retry 3 volte
        "/W:5"                         # Wait 5 sec tra retry
    )
    & robocopy @robocopyArgs 2>&1 | Out-Null

    # Robocopy exit codes: 0-7 = OK, >= 8 = errore
    if ($LASTEXITCODE -ge 8) {
        Write-Err "Robocopy fallito con codice $LASTEXITCODE"
        Write-Info "Possibili cause: file in uso, permessi, path troppo lunghi"
        Write-Info "Riprova con: .\deploy.ps1 -SkipBuild"
        exit 1
    }
    Write-Ok "File sincronizzati (robocopy exit code: $LASTEXITCODE)"

    # Ripristina .env dal backup
    foreach ($backup in $envBackups) {
        if (Test-Path $backup.Backup) {
            Copy-Item $backup.Backup $backup.Original -Force
            Remove-Item $backup.Backup -Force
            Write-Info "Ripristinato: $(Split-Path -Leaf $backup.Original)"
        }
    }
    Write-Ok "File .env preservati"

} else {
    Write-Step "$currentStep/$totalSteps" "Sync file SKIPPATO (RemoteOnly)"
}

# =============================================================
# STEP 5: Installa dipendenze sul server remoto
# =============================================================
$currentStep++
Write-Step "$currentStep/$totalSteps" "Installazione dipendenze sul server..."

$installBlock = {
    param($AppDir)
    $ErrorActionPreference = "Stop"
    if ($null -ne (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue)) {
        $PSNativeCommandUseErrorActionPreference = $false
    }
    Set-Location $AppDir

    # npm install (workspace)
    $output = cmd /c "npm install --workspaces --include=dev --no-audit --no-fund 2>&1"
    if ($LASTEXITCODE -ne 0) { throw "npm install fallito: $output" }

    # Prisma generate
    Set-Location "$AppDir\server"
    $output = cmd /c "npx prisma generate 2>&1"
    if ($LASTEXITCODE -ne 0) { throw "prisma generate fallito: $output" }

    return "OK"
}

try {
    Invoke-Command -ComputerName $Server -ScriptBlock $installBlock -ArgumentList $RemoteDir | Out-Null
    Write-Ok "Dipendenze installate e Prisma Client generato"
} catch {
    Write-Err "Installazione dipendenze fallita: $_"
    Write-Info "Fallback: tentativo via path UNC..."

    # Fallback: esegui direttamente nella cartella UNC
    try {
        Push-Location $UncPath
        cmd /c "npm install --workspaces --include=dev --no-audit --no-fund 2>&1" | Out-Null
        Push-Location "$UncPath\server"
        cmd /c "npx prisma generate 2>&1" | Out-Null
        Pop-Location
        Pop-Location
        Write-Ok "Dipendenze installate (fallback UNC)"
    } catch {
        Write-Err "Anche il fallback UNC e' fallito: $_"
        Write-Info "Esegui manualmente sul server: cd $RemoteDir && npm install --workspaces"
        exit 1
    }
}

# =============================================================
# STEP 6: Database migration
# =============================================================
$currentStep++
if (-not $SkipMigrate) {
    Write-Step "$currentStep/$totalSteps" "Applicazione migration database..."

    $migrateBlock = {
        param($AppDir)
        $ErrorActionPreference = "Stop"
        if ($null -ne (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue)) {
            $PSNativeCommandUseErrorActionPreference = $false
        }
        Set-Location "$AppDir\server"
        $output = cmd /c "npx prisma migrate deploy 2>&1"
        if ($LASTEXITCODE -ne 0) { throw "prisma migrate deploy fallito: $output" }
        return $output
    }

    try {
        $migrateResult = Invoke-Command -ComputerName $Server -ScriptBlock $migrateBlock -ArgumentList $RemoteDir
        Write-Ok "Migration applicate"
        if ($migrateResult) {
            $migrateResult -split "`n" | ForEach-Object {
                if ($_ -match "migration|applied|already") { Write-Info $_ }
            }
        }
    } catch {
        Write-Err "Migration fallita: $_"
        Write-Info "Esegui manualmente: cd $RemoteDir\server && npx prisma migrate deploy"
        Write-Host "  Continuare comunque? (S/n) " -ForegroundColor Yellow -NoNewline
        $confirm = Read-Host
        if ($confirm -eq 'n' -or $confirm -eq 'N') { exit 1 }
    }
} else {
    Write-Step "$currentStep/$totalSteps" "Migration database SKIPPATA"
}

# =============================================================
# STEP 7: Riavvio PM2 sul server
# =============================================================
$currentStep++
Write-Step "$currentStep/$totalSteps" "Avvio servizi PM2..."

$pm2Block = {
    param($AppDir, $ApiPort, $ClientPort)
    $ErrorActionPreference = "Stop"
    if ($null -ne (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue)) {
        $PSNativeCommandUseErrorActionPreference = $false
    }
    Set-Location $AppDir

    # Assicurati che PM2 sia pulito (in caso lo step 3 fosse fallito)
    cmd /c "pm2 delete projectpulse-api 2>nul"
    cmd /c "pm2 delete projectpulse-client 2>nul"

    # Crea cartelle log
    if (-not (Test-Path "$AppDir\server\logs")) { New-Item -ItemType Directory -Path "$AppDir\server\logs" -Force | Out-Null }
    if (-not (Test-Path "$AppDir\client\logs")) { New-Item -ItemType Directory -Path "$AppDir\client\logs" -Force | Out-Null }

    # Avvia backend
    Set-Location "$AppDir\server"
    $env:PORT = "$ApiPort"
    $env:NODE_ENV = "production"
    cmd /c "pm2 start dist/index.js --name projectpulse-api --update-env"
    if ($LASTEXITCODE -ne 0) { throw "Avvio PM2 backend fallito" }

    # Avvia frontend
    Set-Location "$AppDir\client"
    $env:PORT = "$ClientPort"
    cmd /c "pm2 start serve.js --name projectpulse-client --update-env"
    if ($LASTEXITCODE -ne 0) { throw "Avvio PM2 frontend fallito" }

    # Salva configurazione PM2
    cmd /c "pm2 save"

    # Attendi stabilizzazione
    Start-Sleep -Seconds 3

    # Verifica stato
    $status = cmd /c "pm2 jlist 2>&1"
    return $status
}

try {
    $pm2Result = Invoke-Command -ComputerName $Server -ScriptBlock $pm2Block -ArgumentList $RemoteDir, $ApiPort, $ClientPort
    Write-Ok "Servizi PM2 avviati"

    # Parse e mostra stato
    try {
        $apps = $pm2Result | ConvertFrom-Json
        Write-Host ""
        Write-Host "  Processo               Stato       PID     CPU     Memoria" -ForegroundColor White
        Write-Host "  ────────────────────── ─────────── ─────── ─────── ──────────" -ForegroundColor DarkGray
        foreach ($app in $apps) {
            $statusColor = if ($app.pm2_env.status -eq 'online') { 'Green' } else { 'Red' }
            $memMB = [math]::Round($app.monit.memory / 1MB, 1)
            Write-Host ("  {0,-22} " -f $app.name) -NoNewline -ForegroundColor White
            Write-Host ("{0,-11} " -f $app.pm2_env.status) -NoNewline -ForegroundColor $statusColor
            Write-Host ("{0,-7} {1,-7} {2} MB" -f $app.pid, "$($app.monit.cpu)%", $memMB) -ForegroundColor Gray
        }
    } catch {
        Write-Info "PM2 avviato (impossibile parsare stato dettagliato)"
    }
} catch {
    Write-Err "Riavvio PM2 fallito: $_"
    Write-Info "Esegui manualmente sul server: cd $RemoteDir && pm2 start ecosystem.config.js"
    exit 1
}

# =============================================================
# Health check
# =============================================================
Write-Host ""
Write-Host "  Verifica servizi..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

$apiUrl = "http://${Server}:${ApiPort}/api/health"
try {
    $response = Invoke-WebRequest -Uri $apiUrl -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Ok "API health check: OK (200)"
    } else {
        Write-Host "  API health check: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  API health check: non raggiungibile (potrebbe richiedere qualche secondo)" -ForegroundColor Yellow
}

$clientUrl = "http://${Server}:${ClientPort}"
try {
    $response = Invoke-WebRequest -Uri $clientUrl -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Ok "Client health check: OK (200)"
    } else {
        Write-Host "  Client health check: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  Client health check: non raggiungibile (potrebbe richiedere qualche secondo)" -ForegroundColor Yellow
}

# =============================================================
# RIEPILOGO
# =============================================================
$Stopwatch.Stop()
$elapsed = $Stopwatch.Elapsed

Write-Host ""
Write-Host "  ================================================" -ForegroundColor Cyan
Write-Host "   DEPLOY COMPLETATO!" -ForegroundColor Green
Write-Host "  ================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "   App:       http://${Server}:${ClientPort}" -ForegroundColor White
Write-Host "   API:       http://${Server}:${ApiPort}/api/health" -ForegroundColor White
Write-Host "   Durata:    $($elapsed.Minutes)m $($elapsed.Seconds)s" -ForegroundColor White
Write-Host ""
Write-Host "   Opzioni:" -ForegroundColor Gray
Write-Host "     .\deploy.ps1                   Deploy completo" -ForegroundColor Gray
Write-Host "     .\deploy.ps1 -SkipBuild        Solo sync + restart" -ForegroundColor Gray
Write-Host "     .\deploy.ps1 -SkipMigrate      Senza migration DB" -ForegroundColor Gray
Write-Host "     .\deploy.ps1 -RemoteOnly       Solo restart servizi" -ForegroundColor Gray
Write-Host ""
