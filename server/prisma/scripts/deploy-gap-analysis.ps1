# ============================================================
# Deploy script: Gap Analysis Migration
# Eseguire sul server backend (192.168.52.22)
# Da: C:\Apps\ProjectPulse\server
# ============================================================

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  ProjectPulse - Gap Analysis Deploy" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Crea stub per la migrazione fantasma
Write-Host "[1/5] Creazione stub per migrazione fantasma..." -ForegroundColor Yellow
$phantomDir = "prisma\migrations\20260310150000_add_project_sort_order"
if (-not (Test-Path $phantomDir)) {
    New-Item -ItemType Directory -Path $phantomDir -Force | Out-Null
    Set-Content -Path "$phantomDir\migration.sql" -Value "-- Already applied via previous deploy. Stub file for Prisma compatibility."
    Write-Host "  -> Stub creato: $phantomDir" -ForegroundColor Green
} else {
    Write-Host "  -> Stub gia' presente, skip" -ForegroundColor Gray
}

# Step 2: Marca la migrazione fantasma come gia' applicata
Write-Host ""
Write-Host "[2/5] Risoluzione migrazione fantasma nel registro Prisma..." -ForegroundColor Yellow
try {
    npx prisma migrate resolve --applied 20260310150000_add_project_sort_order 2>$null
    Write-Host "  -> Risolta" -ForegroundColor Green
} catch {
    Write-Host "  -> Gia' risolta o non necessaria" -ForegroundColor Gray
}

# Step 3: Verifica stato
Write-Host ""
Write-Host "[3/5] Verifica stato migrazioni..." -ForegroundColor Yellow
npx prisma migrate status

# Step 4: Applica nuove migrazioni
Write-Host ""
Write-Host "[4/5] Applicazione migrazione gap_analysis_schema..." -ForegroundColor Yellow
Write-Host "  Questa migrazione:" -ForegroundColor Gray
Write-Host "    - Aggiunge User.hourlyRate (Decimal)" -ForegroundColor Gray
Write-Host "    - Crea tabella document_versions" -ForegroundColor Gray
Write-Host "    - Crea tabella risk_tasks" -ForegroundColor Gray
Write-Host "    - Converte Risk.probability/impact: String -> Int (low=1, medium=3, high=5)" -ForegroundColor Gray
Write-Host ""
npx prisma migrate deploy

# Step 5: Rigenera client Prisma
Write-Host ""
Write-Host "[5/5] Rigenerazione Prisma client..." -ForegroundColor Yellow
npx prisma generate

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  Deploy completato!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Verifica manuale consigliata:" -ForegroundColor Cyan
Write-Host "  SELECT TOP 5 probability, impact FROM risks" -ForegroundColor White
Write-Host "  (devono essere numeri interi 1-5)" -ForegroundColor White
Write-Host ""
