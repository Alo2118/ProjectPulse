#!/bin/bash
# ============================================================
# Deploy script: Gap Analysis Migration
# Eseguire sul server backend (192.168.52.22)
# Da: C:\Apps\ProjectPulse\server
# ============================================================

set -e

echo "========================================="
echo "  ProjectPulse - Gap Analysis Deploy"
echo "========================================="
echo ""

# Step 1: Crea stub per la migrazione fantasma
echo "[1/5] Creazione stub per migrazione fantasma..."
PHANTOM_DIR="prisma/migrations/20260310150000_add_project_sort_order"
if [ ! -d "$PHANTOM_DIR" ]; then
  mkdir -p "$PHANTOM_DIR"
  echo "-- Already applied via previous deploy. Stub file for Prisma compatibility." > "$PHANTOM_DIR/migration.sql"
  echo "  -> Stub creato: $PHANTOM_DIR"
else
  echo "  -> Stub gia' presente, skip"
fi

# Step 2: Marca la migrazione fantasma come gia' applicata
echo ""
echo "[2/5] Risoluzione migrazione fantasma nel registro Prisma..."
npx prisma migrate resolve --applied 20260310150000_add_project_sort_order 2>/dev/null || echo "  -> Gia' risolta o non necessaria"

# Step 3: Verifica stato
echo ""
echo "[3/5] Verifica stato migrazioni..."
npx prisma migrate status

# Step 4: Applica nuove migrazioni
echo ""
echo "[4/5] Applicazione migrazione gap_analysis_schema..."
echo "  Questa migrazione:"
echo "    - Aggiunge User.hourlyRate (Decimal)"
echo "    - Crea tabella document_versions"
echo "    - Crea tabella risk_tasks"
echo "    - Converte Risk.probability/impact: String -> Int (low=1, medium=3, high=5)"
echo ""
npx prisma migrate deploy

# Step 5: Rigenera client Prisma
echo ""
echo "[5/5] Rigenerazione Prisma client..."
npx prisma generate

echo ""
echo "========================================="
echo "  Deploy completato!"
echo "========================================="
echo ""
echo "Verifica manuale consigliata:"
echo "  SELECT TOP 5 probability, impact FROM risks"
echo "  (devono essere numeri interi 1-5)"
echo ""
