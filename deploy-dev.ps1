# ============================================================
# ProjectPulse - Deploy da PC Sviluppo
# Compila il progetto e sincronizza i file al server remoto.
# Dopo questo script, eseguire deploy-server.ps1 SUL SERVER.
#
# Uso:  .\deploy-dev.ps1                  (build + sync)
#       .\deploy-dev.ps1 -SkipBuild       (solo sync, senza ricompilare)
# ============================================================

param(
    [string]$Server   = "192.168.52.22",
    [switch]$SkipBuild
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

# ---------- Banner ----------
Write-Host ""
Write-Host "  ================================================" -ForegroundColor Cyan
Write-Host "   ProjectPulse - Deploy (PC Sviluppo)" -ForegroundColor Cyan
Write-Host "   Target: \\$Server\c$\Apps\ProjectPulse" -ForegroundColor Cyan
Write-Host "  ================================================" -ForegroundColor Cyan
Write-Host ""

$totalSteps = 3
$currentStep = 0

# =============================================================
# STEP 1: Build locale
# =============================================================
$currentStep++
if (-not $SkipBuild) {
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
    Write-Step "$currentStep/$totalSteps" "Build locale SKIPPATO (-SkipBuild)"
}

# =============================================================
# STEP 2: Verifica connessione al server
# =============================================================
$currentStep++
Write-Step "$currentStep/$totalSteps" "Verifica connessione a $Server..."

if (-not (Test-Connection -ComputerName $Server -Count 1 -Quiet)) {
    Write-Err "Server $Server non raggiungibile!"
    exit 1
}

if (-not (Test-Path $UncPath)) {
    Write-Err "Path UNC $UncPath non accessibile! Verifica permessi admin share."
    exit 1
}
Write-Ok "Server raggiungibile"

# =============================================================
# STEP 3: Sync file al server (robocopy)
# =============================================================
$currentStep++
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
$robocopyOutput = & robocopy $LocalRoot $UncPath /E /PURGE `
    /XD node_modules .git .claude logs .vscode coverage `
    /XF .env .env.local .env.production *.log *.deploy-backup thumbs.db nul `
    /MT:8 /R:2 /W:3 /NP 2>&1

$robocopyExit = $LASTEXITCODE

# Robocopy exit codes: 0-7 = OK, >= 8 = errore
if ($robocopyExit -ge 8) {
    Write-Err "Robocopy fallito con codice $robocopyExit"
    Write-Host ""
    # Mostra le righe con errori
    $robocopyOutput | ForEach-Object {
        $line = $_.ToString()
        if ($line -match "ERRORE|ERROR|Non riuscita|FAILED|riprova|retry") {
            Write-Host "  $line" -ForegroundColor Red
        }
    }
    Write-Host ""
    # Mostra riepilogo (ultime 15 righe)
    $robocopyOutput | Select-Object -Last 15 | ForEach-Object {
        Write-Host "  $_" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "  Continuare comunque? (S/n) " -ForegroundColor Yellow -NoNewline
    $confirm = Read-Host
    if ($confirm -eq 'n' -or $confirm -eq 'N') { exit 1 }
} else {
    Write-Ok "File sincronizzati (robocopy exit code: $robocopyExit)"
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

# =============================================================
# RIEPILOGO
# =============================================================
$Stopwatch.Stop()
$elapsed = $Stopwatch.Elapsed

Write-Host ""
Write-Host "  ================================================" -ForegroundColor Cyan
Write-Host "   SYNC COMPLETATO!" -ForegroundColor Green
Write-Host "  ================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "   File copiati in: $UncPath" -ForegroundColor White
Write-Host "   Durata: $($elapsed.Minutes)m $($elapsed.Seconds)s" -ForegroundColor White
Write-Host ""
Write-Host "   Prossimo passo:" -ForegroundColor Yellow
Write-Host "   Sul server ($Server), eseguire come Amministratore:" -ForegroundColor White
Write-Host "     cd C:\Apps\ProjectPulse" -ForegroundColor White
Write-Host "     .\deploy-server.ps1" -ForegroundColor White
Write-Host ""
