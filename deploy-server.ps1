# ============================================================
# ProjectPulse - Script di Deploy per Server Windows
# Stack: Node.js + Express + Prisma ORM + SQL Server
# Eseguire come Amministratore sul server 192.168.52.22
# ============================================================

param(
    [string]$AppDir = "C:\Apps\ProjectPulse",
    [string]$IP = "192.168.52.22",
    [int]$ApiPort = 3000,
    [int]$ClientPort = 5173
)

$ErrorActionPreference = "Stop"
# Evita che output su stderr di comandi nativi (npm/npx/pm2) venga trattato come errore PowerShell.
if ($null -ne (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue)) {
    $PSNativeCommandUseErrorActionPreference = $false
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ProjectPulse - Deploy Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# --- 1. Verifica Node.js ---
Write-Host "[1/6] Verifica Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "  Node.js $nodeVersion trovato" -ForegroundColor Green
} catch {
    Write-Host "  ERRORE: Node.js non installato!" -ForegroundColor Red
    Write-Host "  Scarica da: https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# --- 2. Verifica cartella progetto ---
Write-Host "[2/6] Verifica cartella progetto..." -ForegroundColor Yellow
if (-not (Test-Path "$AppDir\server\dist\index.js")) {
    Write-Host "  ERRORE: $AppDir\server\dist\index.js non trovato!" -ForegroundColor Red
    Write-Host "  Assicurati di aver copiato i file con:" -ForegroundColor Red
    Write-Host "  robocopy ... /E /XD node_modules .git /XF nul" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path "$AppDir\client\dist\index.html")) {
    Write-Host "  ERRORE: $AppDir\client\dist\index.html non trovato!" -ForegroundColor Red
    exit 1
}
Write-Host "  File di build trovati" -ForegroundColor Green

# --- 3. Verifica PM2 ---
Write-Host "[3/6] Verifica PM2..." -ForegroundColor Yellow
try {
    $pm2Version = pm2 --version
    Write-Host "  PM2 $pm2Version trovato" -ForegroundColor Green
} catch {
    Write-Host "  PM2 non trovato, installazione globale in corso..." -ForegroundColor Yellow
    cmd /c "npm install -g pm2 --no-audit --no-fund"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERRORE: installazione PM2 fallita" -ForegroundColor Red
        exit 1
    }
    $pm2Version = pm2 --version
    Write-Host "  PM2 $pm2Version installato" -ForegroundColor Green
}

# --- 4. Installa dipendenze ---
Write-Host "[4/6] Installazione dipendenze..." -ForegroundColor Yellow

# Ferma processi PM2 prima di reinstallare dipendenze (evita file lock EPERM su Windows)
cmd /c "pm2 pid projectpulse-api >nul 2>nul"
if ($LASTEXITCODE -eq 0) {
    cmd /c "pm2 delete projectpulse-api >nul 2>nul"
}
cmd /c "pm2 pid projectpulse-client >nul 2>nul"
if ($LASTEXITCODE -eq 0) {
    cmd /c "pm2 delete projectpulse-client >nul 2>nul"
}

Write-Host "  Workspace (root/server/client)..." -ForegroundColor Gray
Push-Location "$AppDir"
cmd /c "npm install --workspaces --include=dev --no-audit --no-fund"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERRORE: installazione dipendenze workspace fallita" -ForegroundColor Red
    exit 1
}
Write-Host "  Dipendenze workspace installate" -ForegroundColor Green

Write-Host "  Prisma generate (ORM per SQL Server)..." -ForegroundColor Gray
# Eseguito tramite cmd per evitare NativeCommandError su output stderr informativo.
Push-Location "$AppDir\server"
cmd /c "npx prisma generate >nul 2>nul"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERRORE: prisma generate fallito" -ForegroundColor Red
    exit 1
}
Write-Host "  Prisma Client generato (connessione a SQL Server)" -ForegroundColor Green
Pop-Location
Pop-Location

# --- 5. Regole Firewall ---
Write-Host "[5/6] Configurazione Firewall..." -ForegroundColor Yellow

$ruleApi = Get-NetFirewallRule -DisplayName "ProjectPulse-API" -ErrorAction SilentlyContinue
if (-not $ruleApi) {
    New-NetFirewallRule -DisplayName "ProjectPulse-API" -Direction Inbound -Action Allow -Protocol TCP -LocalPort $ApiPort | Out-Null
    Write-Host "  Regola firewall porta $ApiPort creata" -ForegroundColor Green
} else {
    Write-Host "  Regola firewall porta $ApiPort gia' presente" -ForegroundColor Green
}

$ruleClient = Get-NetFirewallRule -DisplayName "ProjectPulse-Client" -ErrorAction SilentlyContinue
if (-not $ruleClient) {
    New-NetFirewallRule -DisplayName "ProjectPulse-Client" -Direction Inbound -Action Allow -Protocol TCP -LocalPort $ClientPort | Out-Null
    Write-Host "  Regola firewall porta $ClientPort creata" -ForegroundColor Green
} else {
    Write-Host "  Regola firewall porta $ClientPort gia' presente" -ForegroundColor Green
}

# --- 6. Avvio servizi con PM2 ---
Write-Host "[6/6] Avvio servizi con PM2..." -ForegroundColor Yellow

# Backend
Push-Location "$AppDir\server"
$env:PORT = "$ApiPort"
pm2 start npm --name projectpulse-api -- run start --update-env *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERRORE: avvio PM2 backend fallito" -ForegroundColor Red
    exit 1
}
Write-Host "  Backend PM2 avviato su porta $ApiPort" -ForegroundColor Green
Pop-Location

# Frontend (Vite preview)
Push-Location "$AppDir\client"
pm2 start npm --name projectpulse-client -- run preview -- --host 0.0.0.0 --port $ClientPort --strictPort *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERRORE: avvio PM2 frontend fallito" -ForegroundColor Red
    exit 1
}
Write-Host "  Frontend PM2 avviato su porta $ClientPort" -ForegroundColor Green
Pop-Location

# Persistenza PM2
pm2 save *> $null

# --- Riepilogo ---
Start-Sleep -Seconds 2
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOY COMPLETATO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  App:      http://${IP}:${ClientPort}" -ForegroundColor White
Write-Host "  API:      http://${IP}:${ApiPort}/api/health" -ForegroundColor White
Write-Host ""
Write-Host "  Stato PM2:" -ForegroundColor White
pm2 status

Write-Host ""
Write-Host "  Comandi utili PM2:" -ForegroundColor Gray
Write-Host "    Stato:           pm2 status" -ForegroundColor Gray
Write-Host "    Log API:         pm2 logs projectpulse-api" -ForegroundColor Gray
Write-Host "    Log Client:      pm2 logs projectpulse-client" -ForegroundColor Gray
Write-Host "    Riavvia API:     pm2 restart projectpulse-api" -ForegroundColor Gray
Write-Host "    Riavvia Client:  pm2 restart projectpulse-client" -ForegroundColor Gray
Write-Host "    Ferma API:       pm2 stop projectpulse-api" -ForegroundColor Gray
Write-Host "    Ferma Client:    pm2 stop projectpulse-client" -ForegroundColor Gray
Write-Host ""
