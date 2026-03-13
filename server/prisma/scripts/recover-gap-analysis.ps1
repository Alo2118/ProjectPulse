# ============================================================
# Recovery script: Gap Analysis Migration (FAILED state)
# Eseguire sul server backend (192.168.52.22)
# Da: C:\Apps\ProjectPulse\server
# ============================================================

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  ProjectPulse - Gap Analysis Recovery" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Pulisci DDL parzialmente applicato
Write-Host "[1/4] Pulizia DDL parziale via sqlcmd..." -ForegroundColor Yellow
Write-Host "  Rimuove colonne/tabelle create prima del fallimento" -ForegroundColor Gray

$cleanupSql = @"
-- Cleanup: rimuovi colonne temporanee se esistono
IF COL_LENGTH('risks', 'probability_new') IS NOT NULL
  ALTER TABLE [risks] DROP COLUMN [probability_new];

IF COL_LENGTH('risks', 'impact_new') IS NOT NULL
  ALTER TABLE [risks] DROP COLUMN [impact_new];

-- Cleanup: rimuovi hourly_rate se esiste (verra' ricreata dalla migrazione)
IF COL_LENGTH('users', 'hourly_rate') IS NOT NULL
  ALTER TABLE [users] DROP COLUMN [hourly_rate];

-- Cleanup: rimuovi tabelle se esistono (verranno ricreate dalla migrazione)
IF OBJECT_ID('risk_tasks', 'U') IS NOT NULL
  DROP TABLE [risk_tasks];

IF OBJECT_ID('document_versions', 'U') IS NOT NULL
  DROP TABLE [document_versions];

PRINT 'Cleanup completato.';
"@

# Leggi connection string da .env
$envFile = Get-Content .env -ErrorAction SilentlyContinue | Where-Object { $_ -match "^DATABASE_URL=" }
if (-not $envFile) {
    Write-Host "  ERRORE: DATABASE_URL non trovato in .env" -ForegroundColor Red
    exit 1
}
$connStr = ($envFile -replace '^DATABASE_URL="?', '') -replace '"?$', ''

# Estrai componenti dalla connection string
# Format: sqlserver://host[:port];database=db;user=usr;password=pwd;...
if ($connStr -match 'sqlserver://([^;:]+)(?::(\d+))?;database=([^;]+);user=([^;]+);password=([^;]+)') {
    $dbHost = $Matches[1]
    $dbPort = if ($Matches[2]) { $Matches[2] } else { "1433" }
    $dbName = $Matches[3]
    $dbUser = $Matches[4]
    # Password potrebbe contenere ; — prendi tutto fino al prossimo parametro noto
    $dbPass = $Matches[5] -replace ';$', ''
} else {
    Write-Host "  ERRORE: Formato DATABASE_URL non riconosciuto" -ForegroundColor Red
    Write-Host "  Valore: $($connStr -replace 'password=[^;]+', 'password=***')" -ForegroundColor Gray
    exit 1
}

Write-Host "  Server: $dbHost,$dbPort  Database: $dbName  User: $dbUser" -ForegroundColor Gray

# Esegui cleanup via sqlcmd
$cleanupSql | sqlcmd -S "$dbHost,$dbPort" -d $dbName -U $dbUser -P $dbPass -C -b
if ($LASTEXITCODE -ne 0) {
    Write-Host "  WARNING: sqlcmd cleanup ha avuto problemi (potrebbe essere OK se le colonne non esistevano)" -ForegroundColor Yellow
} else {
    Write-Host "  -> Cleanup completato" -ForegroundColor Green
}

# Step 2: Marca la migrazione fallita come rolled-back
Write-Host ""
Write-Host "[2/4] Risoluzione migrazione fallita nel registro Prisma..." -ForegroundColor Yellow
npx prisma migrate resolve --rolled-back 20260312000000_gap_analysis_schema
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERRORE: impossibile risolvere la migrazione" -ForegroundColor Red
    exit 1
}
Write-Host "  -> Migrazione marcata come rolled-back" -ForegroundColor Green

# Step 3: Verifica stato
Write-Host ""
Write-Host "[3/4] Verifica stato migrazioni..." -ForegroundColor Yellow
npx prisma migrate status

# Step 4: Ri-applica la migrazione (con SQL corretto)
Write-Host ""
Write-Host "[4/4] Ri-applicazione migrazione gap_analysis_schema (SQL corretto con EXEC wrappers)..." -ForegroundColor Yellow
Write-Host "  Questa migrazione:" -ForegroundColor Gray
Write-Host "    - Aggiunge User.hourlyRate (Decimal)" -ForegroundColor Gray
Write-Host "    - Crea tabella document_versions" -ForegroundColor Gray
Write-Host "    - Crea tabella risk_tasks" -ForegroundColor Gray
Write-Host "    - Converte Risk.probability/impact: String -> Int (low=1, medium=3, high=5)" -ForegroundColor Gray
Write-Host "    - Usa EXEC(N'...') per separare batch DDL/DML" -ForegroundColor Gray
Write-Host ""
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "  ERRORE: migrazione fallita di nuovo!" -ForegroundColor Red
    Write-Host "  Controlla l'output sopra per dettagli." -ForegroundColor Red
    exit 1
}

# Step 5: Rigenera client Prisma
Write-Host ""
Write-Host "[5/5] Rigenerazione Prisma client..." -ForegroundColor Yellow
npx prisma generate

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  Recovery completato!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Verifica manuale consigliata:" -ForegroundColor Cyan
Write-Host "  SELECT TOP 5 probability, impact FROM risks" -ForegroundColor White
Write-Host "  (devono essere numeri interi 1-5)" -ForegroundColor White
Write-Host ""
