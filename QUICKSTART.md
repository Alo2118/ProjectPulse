# 🚀 ProjectPulse - Guida Rapida

## Avvio Locale

### 1. Backend
```bash
cd backend
npm install  # se non già fatto
npm start    # avvia il server su http://localhost:3001
```

### 2. Frontend
```bash
cd frontend
npm install  # se non già fatto
npm run dev  # avvia l'app su http://localhost:3000
```

### 3. Accedi all'app

Apri il browser su **http://localhost:3000**

**Credenziali di test:**
- **Dipendente**: dipendente@company.com / password123
- **Direzione**: direzione@company.com / password123

---

## 📱 Funzionalità Principali

### Dashboard Dipendente
- ✅ Creazione task collegati a progetti
- ⏱️ Timer per tracciare tempo di lavoro
- 📊 Gestione stati: Todo → In Corso → Completato/Bloccato
- 💬 Comunicazione con direzione tramite commenti
- 📄 Report giornaliero esportabile

### Dashboard Direzione
- 👀 Vista completa di tutti i task e progetti
- 📈 Statistiche e metriche aggregate
- 🔍 Filtri per stato e progetto
- 💬 Commenti sui task dei dipendenti
- ⚠️ Visibilità immediata su blocchi e richieste di chiarimento

---

## 🗂️ Struttura Stati Task

1. **Da fare** - Task creato ma non iniziato
2. **In corso** - Timer attivo o lavoro in svolgimento
3. **Bloccato** - Impedimento tecnico/organizzativo (campo motivo obbligatorio)
4. **Attesa chiarimenti** - Serve input dalla direzione (campo richiesta obbligatorio)
5. **Completato** - Task terminato

---

## 🔧 Comandi Utili

### Backend
```bash
npm run dev       # modalità sviluppo con auto-reload
npm run init-db   # reset database con dati di esempio
```

### Frontend
```bash
npm run build     # build di produzione
npm run preview   # anteprima build
```

---

## 📦 Tecnologie Utilizzate

- **Backend**: Node.js, Express, SQLite, JWT
- **Frontend**: React, Vite, Tailwind CSS, React Router
- **Icone**: Lucide React

---

## 🎯 Prossimi Passi Suggeriti

1. Testare il flusso completo: crea task → avvia timer → cambia stato → aggiungi commenti
2. Verificare il report giornaliero funzioni correttamente
3. Testare su mobile/tablet per responsiveness
4. Personalizzare colori e branding (vedi `tailwind.config.js`)
5. Configurare deployment su un servizio cloud (Vercel, Railway, Render)

---

## 📝 Note

- Il database SQLite è locale (`backend/database.db`)
- Per deployment production, considera PostgreSQL
- JWT secret dovrebbe essere cambiato in `.env` per production
- I file `.env` sono gitignored per sicurezza
