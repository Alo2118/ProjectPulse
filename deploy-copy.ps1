# ============================================================
# ProjectPulse - Copia file sul Server
# Eseguire dal TUO PC (non dal server)
# ============================================================

param(
    [string]$Server = "192.168.52.22",
    [string]$RemoteDir = "C$\Apps\ProjectPulse",
    [string]$LocalDir = "C:\Users\Nicola_MussolinAdmin\Documents\Mikai\ProjectPulse"
)

$Dest = "\\$Server\$RemoteDir"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ProjectPulse - Copia sul Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Da: $LocalDir" -ForegroundColor Gray
Write-Host "  A:  $Dest" -ForegroundColor Gray
Write-Host ""

# Verifica accesso al server
if (-not (Test-Connection $Server -Count 1 -Quiet)) {
    Write-Host "ERRORE: Server $Server non raggiungibile!" -ForegroundColor Red
    exit 1
}

Write-Host "[1/2] Copia file in corso..." -ForegroundColor Yellow
Write-Host "  (esclude: node_modules, .git, nul)" -ForegroundColor Gray

robocopy "$LocalDir" "$Dest" /E /XD node_modules .git .claude /XF nul "*.png" /NFL /NDL /NJH /NJS /NC /NS

if ($LASTEXITCODE -le 3) {
    Write-Host "  Copia completata!" -ForegroundColor Green
} else {
    Write-Host "  ERRORE durante la copia (codice: $LASTEXITCODE)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[2/2] Prossimo passo:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Collegati al server ed esegui:" -ForegroundColor White
Write-Host "  PowerShell (come Amministratore):" -ForegroundColor Gray
Write-Host ""
Write-Host "    cd C:\Apps\ProjectPulse" -ForegroundColor White
Write-Host "    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass" -ForegroundColor White
Write-Host "    .\deploy-server.ps1" -ForegroundColor White
Write-Host ""
