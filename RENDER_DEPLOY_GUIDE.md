# 🚀 Guida Deploy Backend su Render

## ⚠️ Problema Rilevato

Il backend su Render potrebbe non avere applicato le ultime migrazioni per i campi Gantt:
- `start_date`
- `estimated_hours`
- `progress_percentage`

## ✅ Come Verificare e Risolvere

### Opzione 1: Forzare Redeploy (CONSIGLIATO)

1. Vai su **https://dashboard.render.com**
2. Seleziona il servizio **projectpulse-dsom** (backend)
3. Clicca su **Manual Deploy** → **Deploy latest commit**
4. Attendi il completamento (circa 2-5 minuti)

Il deploy automaticamente:
- ✅ Eseguirà `npm install`
- ✅ Avvierà il server con `npm start`
- ✅ Le migrazioni si applicano automaticamente all'avvio (file `database.js`)

### Opzione 2: Verificare i Log

1. Dashboard Render → Servizio **projectpulse-dsom**
2. Clicca su **Logs**
3. Cerca questi messaggi:
   ```
   ✅ Added start_date column to tasks table for Gantt chart planning
   ✅ Added estimated_hours column to tasks table for capacity planning
   ✅ Added progress_percentage column to tasks table for visual progress tracking
   ```

Se **NON** vedi questi messaggi → Le migrazioni NON sono state applicate → Fai Redeploy

### Opzione 3: Shell di Render (Avanzato)

1. Dashboard Render → Servizio **projectpulse-dsom**
2. Clicca su **Shell** (icona terminale in alto a destra)
3. Esegui:
   ```bash
   node backend/scripts/check-db.js
   ```

Dovresti vedere:
```
=== 📊 CONTENUTO DATABASE ===

👥 Utenti: 4
📁 Progetti: 7
📋 Task: 15
🎯 Milestone: 0
📝 Template: X

=== 🏗️  SCHEMA TABELLA TASKS ===

✅ Campi Gantt presenti (start_date, estimated_hours, progress_percentage)
```

Se vedi **❌ Campi Gantt MANCANTI** → Fai Redeploy

## 🔧 Commit Pronti per il Deploy

Gli ultimi commit pushati includono:

```
✅ a6055f8 - Add database inspection script
✅ a5778cb - Configure frontend to connect to Render backend
✅ d85c87e - Implement intelligent start_date auto-calculation
✅ ae95ba2 - Add Critical Path Method (CPM) to Gantt chart
✅ de0e366 - Enhance Gantt chart with comprehensive planning features
```

Tutti questi commit sono sul branch **claude/migrate-projectpluse-chat-l3WpI**.

## ⚡ Deploy Automatico

Render fa deploy automatico quando:
- Push su branch collegato (controlla quale branch è configurato)
- Se collegato a `main` → devi fare merge della PR prima

## 🎯 Dopo il Deploy

Una volta completato il redeploy:

1. **Testa Login**:
   ```bash
   curl -k https://projectpulse-dsom.onrender.com/api/auth/login \
     -X POST -H "Content-Type: application/json" \
     -d '{"email":"nicola@admin.it","password":"password123"}'
   ```

2. **Verifica Frontend**:
   - Apri l'app su Vercel (o localhost)
   - Crea un nuovo task
   - Imposta ore stimate e deadline
   - Verifica che la data inizio si calcoli automaticamente

3. **Verifica Gantt**:
   - Apri la vista Gantt
   - Dovresti vedere:
     - Task con progress bar (se progresso > 0%)
     - Ore stimate accanto ai task
     - Task critici con bordo arancione e icona ⚡

## 🆘 Troubleshooting

### Il deploy fallisce
- Controlla i log su Render per errori
- Verifica che `package.json` abbia tutti i dependencies

### Database vuoto dopo deploy
- Render potrebbe aver ricreato il database
- Esegui lo script di popolazione:
  ```bash
  node backend/src/scripts/populateData.js
  ```

### Campi Gantt ancora mancanti
- Verifica che il file `database.js` sia committato
- Controlla che le migrazioni siano nel codice (linee 194-217)

## 📞 Supporto

Se i problemi persistono:
1. Controlla i log di Render
2. Verifica la configurazione del servizio
3. Controlla che il branch giusto sia deployato
