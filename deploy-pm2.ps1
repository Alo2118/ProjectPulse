# Script per deployment con PM2

# Build del client
Write-Host "Building client..." -ForegroundColor Cyan
cd client
npm install
npm run build

# Build del server
Write-Host "`nBuilding server..." -ForegroundColor Cyan
cd ..\server
npm install
npm run build

# Crea cartelle logs se non esistono
Write-Host "`nCreating log directories..." -ForegroundColor Cyan
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs"
}
cd ..\client
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs"
}

# Restart PM2 apps
Write-Host "`nRestarting PM2 applications..." -ForegroundColor Cyan
cd ..
pm2 delete all
pm2 start ecosystem.config.js

Write-Host "`nDeployment completed!" -ForegroundColor Green
Write-Host "Check status with: pm2 status" -ForegroundColor Yellow
Write-Host "View logs with: pm2 logs" -ForegroundColor Yellow
