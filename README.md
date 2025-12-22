# ProjectPulse

App per la gestione di task e progetti con tracciamento tempo e comunicazione direzione-dipendenti.

## Funzionalità

- Gestione progetti e task
- Tracking tempo di lavoro
- Stati task: Todo, In Corso, Bloccato, Attesa Chiarimenti, Completato
- Dashboard dipendente e direzione
- Report giornaliero automatico
- Comunicazione tramite commenti sui task

## Setup

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Tecnologie

- **Backend**: Node.js, Express, SQLite, JWT
- **Frontend**: React, Vite, Tailwind CSS
- **Database**: SQLite (migrabile a PostgreSQL)

## Utenti di Default

- Direzione: `direzione@company.com` / `password123`
- Dipendente: `dipendente@company.com` / `password123`
