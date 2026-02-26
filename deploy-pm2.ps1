# Script per deployment con PM2
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

# Installa dipendenze da root (gestisce tutti i workspace)
Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install

# Build del client
Write-Host "`nBuilding client..." -ForegroundColor Cyan
npm run build --workspace=client

# Build del server
Write-Host "`nBuilding server..." -ForegroundColor Cyan
npm run build --workspace=server

# Crea cartelle logs se non esistono
Write-Host "`nCreating log directories..." -ForegroundColor Cyan
if (-not (Test-Path "server\logs")) {
    New-Item -ItemType Directory -Path "server\logs" | Out-Null
}
if (-not (Test-Path "client\logs")) {
    New-Item -ItemType Directory -Path "client\logs" | Out-Null
}

# Restart PM2 apps
Write-Host "`nRestarting PM2 applications..." -ForegroundColor Cyan
pm2 delete all
pm2 start ecosystem.config.js

Write-Host "`nDeployment completed!" -ForegroundColor Green
Write-Host "Check status with: pm2 status" -ForegroundColor Yellow
Write-Host "View logs with: pm2 logs" -ForegroundColor Yellow
