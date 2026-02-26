# ============================================================
# ProjectPulse - Deploy sul Server di Produzione
# Eseguire come Amministratore direttamente sul server.
# Installa dipendenze, applica migration DB, avvia PM2.
#
# Uso:  .\deploy-server.ps1                     (completo)
#       .\deploy-server.ps1 -SkipMigrate        (senza migration DB)
#       .\deploy-server.ps1 -RestartOnly         (solo restart PM2)
# ============================================================

param(
    [string]$AppDir      = "C:\Apps\ProjectPulse",
    [string]$IP          = "192.168.52.22",
    [int]$ApiPort        = 3000,
    [int]$ClientPort     = 5173,
    [switch]$SkipMigrate,
    [switch]$RestartOnly
)

$ErrorActionPreference = "Stop"
# Evita che output su stderr di comandi nativi (npm/npx/pm2) venga trattato come errore PowerShell.
if ($null -ne (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue)) {
    $PSNativeCommandUseErrorActionPreference = $false
}

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
Write-Host "   ProjectPulse - Deploy Server" -ForegroundColor Cyan
Write-Host "   Path: $AppDir" -ForegroundColor Cyan
Write-Host "  ================================================" -ForegroundColor Cyan
Write-Host ""

$totalSteps = if ($RestartOnly) { 4 } else { 6 }
$currentStep = 0

# =============================================================
# STEP 1: Verifica prerequisiti
# =============================================================
$currentStep++
Write-Step "$currentStep/$totalSteps" "Verifica prerequisiti..."

# Node.js
try {
    $nodeVersion = node --version
    Write-Ok "Node.js $nodeVersion"
} catch {
    Write-Err "Node.js non installato! Scarica da https://nodejs.org/"
    exit 1
}

# Cartella progetto
if (-not (Test-Path "$AppDir\server\package.json")) {
    Write-Err "$AppDir\server\package.json non trovato!"
    Write-Info "Assicurati di aver eseguito deploy-dev.ps1 dal PC sviluppo."
    exit 1
}
if (-not (Test-Path "$AppDir\server\dist\index.js")) {
    Write-Err "$AppDir\server\dist\index.js non trovato! Build mancante."
    exit 1
}
if (-not (Test-Path "$AppDir\client\dist\index.html")) {
    Write-Err "$AppDir\client\dist\index.html non trovato! Build client mancante."
    exit 1
}
Write-Ok "File di build trovati"

# PM2
try {
    $pm2Version = pm2 --version
    Write-Ok "PM2 $pm2Version"
} catch {
    Write-Info "PM2 non trovato, installazione globale in corso..."
    cmd /c "npm install -g pm2 --no-audit --no-fund"
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Installazione PM2 fallita"
        exit 1
    }
    $pm2Version = pm2 --version
    Write-Ok "PM2 $pm2Version installato"
}

# =============================================================
# STEP 2: Stop PM2 (libera file lock)
# =============================================================
$currentStep++
Write-Step "$currentStep/$totalSteps" "Stop servizi PM2..."

cmd /c "pm2 delete projectpulse-api 2>nul"
cmd /c "pm2 delete projectpulse-client 2>nul"
Start-Sleep -Seconds 2
Write-Ok "PM2 fermato"

if ($RestartOnly) {
    # Salta direttamente al riavvio PM2
    $currentStep = $totalSteps - 1
} else {

    # =============================================================
    # STEP 3: Installa dipendenze
    # =============================================================
    $currentStep++
    Write-Step "$currentStep/$totalSteps" "Installazione dipendenze..."

    Push-Location "$AppDir"
    Write-Info "npm install (workspace root + server + client)..."
    cmd /c "npm install --workspaces --include=dev --no-audit --no-fund"
    if ($LASTEXITCODE -ne 0) {
        Write-Err "npm install fallito"
        Pop-Location
        exit 1
    }
    Write-Ok "Dipendenze installate"

    Write-Info "Prisma generate..."
    Push-Location "$AppDir\server"
    cmd /c "npx prisma generate 2>&1"
    if ($LASTEXITCODE -ne 0) {
        Write-Err "prisma generate fallito"
        Pop-Location; Pop-Location
        exit 1
    }
    Write-Ok "Prisma Client generato"
    Pop-Location
    Pop-Location

    # =============================================================
    # STEP 4: Database migration
    # =============================================================
    $currentStep++
    if (-not $SkipMigrate) {
        Write-Step "$currentStep/$totalSteps" "Applicazione migration database..."

        Push-Location "$AppDir\server"
        cmd /c "npx prisma migrate deploy 2>&1"
        if ($LASTEXITCODE -ne 0) {
            Write-Err "prisma migrate deploy fallito"
            Pop-Location
            Write-Host "  Continuare comunque? (S/n) " -ForegroundColor Yellow -NoNewline
            $confirm = Read-Host
            if ($confirm -eq 'n' -or $confirm -eq 'N') { exit 1 }
        } else {
            Write-Ok "Migration applicate"
        }
        Pop-Location
    } else {
        Write-Step "$currentStep/$totalSteps" "Migration database SKIPPATA (-SkipMigrate)"
    }
}

# =============================================================
# STEP 5: Regole Firewall
# =============================================================
$currentStep++
Write-Step "$currentStep/$totalSteps" "Configurazione Firewall..."

$ruleApi = Get-NetFirewallRule -DisplayName "ProjectPulse-API" -ErrorAction SilentlyContinue
if (-not $ruleApi) {
    New-NetFirewallRule -DisplayName "ProjectPulse-API" -Direction Inbound -Action Allow -Protocol TCP -LocalPort $ApiPort | Out-Null
    Write-Ok "Regola firewall porta $ApiPort creata"
} else {
    Write-Ok "Regola firewall porta $ApiPort gia' presente"
}

$ruleClient = Get-NetFirewallRule -DisplayName "ProjectPulse-Client" -ErrorAction SilentlyContinue
if (-not $ruleClient) {
    New-NetFirewallRule -DisplayName "ProjectPulse-Client" -Direction Inbound -Action Allow -Protocol TCP -LocalPort $ClientPort | Out-Null
    Write-Ok "Regola firewall porta $ClientPort creata"
} else {
    Write-Ok "Regola firewall porta $ClientPort gia' presente"
}

# =============================================================
# STEP 6: Avvio servizi PM2
# =============================================================
$currentStep++
Write-Step "$currentStep/$totalSteps" "Avvio servizi PM2..."

# Crea cartelle log
if (-not (Test-Path "$AppDir\server\logs")) { New-Item -ItemType Directory -Path "$AppDir\server\logs" -Force | Out-Null }
if (-not (Test-Path "$AppDir\client\logs")) { New-Item -ItemType Directory -Path "$AppDir\client\logs" -Force | Out-Null }

# Avvia backend
Push-Location "$AppDir\server"
$env:PORT = "$ApiPort"
$env:NODE_ENV = "production"
cmd /c "pm2 start dist/index.js --name projectpulse-api --update-env" *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Err "Avvio PM2 backend fallito"
    Pop-Location
    exit 1
}
Write-Ok "Backend PM2 avviato su porta $ApiPort"
Pop-Location

# Avvia frontend
Push-Location "$AppDir\client"
$env:PORT = "$ClientPort"
cmd /c "pm2 start serve.js --name projectpulse-client --update-env" *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Err "Avvio PM2 frontend fallito"
    Pop-Location
    exit 1
}
Write-Ok "Frontend PM2 avviato su porta $ClientPort"
Pop-Location

# Persistenza PM2
pm2 save *> $null

# =============================================================
# Health check
# =============================================================
Write-Host ""
Write-Info "Attesa stabilizzazione (3s)..."
Start-Sleep -Seconds 3

$apiUrl = "http://localhost:${ApiPort}/api/health"
try {
    $response = Invoke-WebRequest -Uri $apiUrl -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Ok "API health check: OK (200)"
    } else {
        Write-Host "  API health check: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  API health check: non raggiungibile (potrebbe servire qualche secondo)" -ForegroundColor Yellow
}

$clientUrl = "http://localhost:${ClientPort}"
try {
    $response = Invoke-WebRequest -Uri $clientUrl -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Ok "Client health check: OK (200)"
    } else {
        Write-Host "  Client health check: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  Client health check: non raggiungibile (potrebbe servire qualche secondo)" -ForegroundColor Yellow
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
Write-Host "   App:       http://${IP}:${ClientPort}" -ForegroundColor White
Write-Host "   API:       http://${IP}:${ApiPort}/api/health" -ForegroundColor White
Write-Host "   Durata:    $($elapsed.Minutes)m $($elapsed.Seconds)s" -ForegroundColor White
Write-Host ""

pm2 status

Write-Host ""
Write-Host "   Comandi utili:" -ForegroundColor Gray
Write-Host "     pm2 status                        Stato servizi" -ForegroundColor Gray
Write-Host "     pm2 logs projectpulse-api          Log backend" -ForegroundColor Gray
Write-Host "     pm2 logs projectpulse-client        Log frontend" -ForegroundColor Gray
Write-Host "     pm2 restart projectpulse-api        Riavvia backend" -ForegroundColor Gray
Write-Host "     .\deploy-server.ps1 -RestartOnly   Solo restart PM2" -ForegroundColor Gray
Write-Host ""
