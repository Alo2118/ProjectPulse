# 🏗️ Architettura ProjectPulse

## 📁 Struttura del Progetto

Il progetto è **completamente separato** in backend e frontend:

```
ProjectPulse/
├── backend/               # 🔴 API Server (Node.js + Express + SQLite)
│   ├── src/
│   │   ├── config/       # Configurazione database
│   │   ├── controllers/  # Logica business
│   │   ├── models/       # Modelli dati (SQLite queries)
│   │   ├── routes/       # Route API
│   │   ├── middleware/   # Auth, CORS, ecc.
│   │   ├── scripts/      # Script di utilità
│   │   └── server.js     # Entry point
│   ├── database.db       # Database SQLite
│   └── package.json
│
└── frontend/              # 🔵 UI (React + Vite + TailwindCSS)
    ├── src/
    │   ├── components/   # Componenti React
    │   ├── pages/        # Pagine applicazione
    │   ├── context/      # Context API (Auth, ecc.)
    │   ├── services/     # API calls
    │   └── App.jsx       # Entry point
    ├── dist/             # Build produzione
    └── package.json
```

## ✅ Separazione Verificata

### Backend (Port 3001)
- **Framework:** Express.js
- **Database:** SQLite (better-sqlite3)
- **Auth:** JWT (jsonwebtoken)
- **CORS:** Abilitato per frontend
- **Indirizzo:** http://localhost:3001/api

### Frontend (Port 5173 dev / Port 80 prod)
- **Framework:** React 18 + Vite
- **Styling:** TailwindCSS
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **State:** Context API + useState
- **Build:** Vite build → dist/

### Comunicazione
```
Frontend → HTTP Requests → Backend API
          (Axios)            (Express Routes)
                             ↓
                         SQLite Database
```

## 🔒 Autenticazione

1. **Login:** POST /api/auth/login
   - Invia: { email, password }
   - Riceve: { token, user }
   - Frontend salva token in localStorage

2. **Request Autenticate:**
   - Frontend aggiunge header: `Authorization: Bearer <token>`
   - Backend verifica JWT in middleware
   - Middleware popola `req.user` con dati utente

## 📡 API Endpoints

### Auth
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

### Users
- GET /api/users
- GET /api/users/:id
- POST /api/users
- PUT /api/users/:id
- DELETE /api/users/:id (soft delete)
- POST /api/users/:id/reactivate

### Projects
- GET /api/projects
- GET /api/projects/:id
- POST /api/projects
- PUT /api/projects/:id
- DELETE /api/projects/:id

### Tasks
- GET /api/tasks
- GET /api/tasks/:id
- POST /api/tasks
- PUT /api/tasks/:id
- DELETE /api/tasks/:id

### Time Tracking
- POST /api/time/start
- POST /api/time/stop/:id
- GET /api/time/entries
- POST /api/time/manual
- PUT /api/time/entries/:id
- DELETE /api/time/entries/:id
- GET /api/time/stats
- GET /api/time/daily-report

### Comments
- GET /api/comments/task/:taskId
- POST /api/comments
- DELETE /api/comments/:id

### Milestones
- GET /api/milestones
- GET /api/milestones/:id
- POST /api/milestones
- PUT /api/milestones/:id
- DELETE /api/milestones/:id

## 🚀 Deploy

### Sviluppo Locale
```bash
# Terminal 1 - Backend
cd backend
npm run dev     # → http://localhost:3001

# Terminal 2 - Frontend
cd frontend
npm run dev     # → http://localhost:5173
```

### Produzione
```bash
# Build frontend
cd frontend
npm run build   # → crea dist/

# Start backend
cd backend
npm start       # → Serve API + frontend statico
```

Il backend in produzione serve anche i file statici dal frontend build.

## 🔐 Sicurezza

- ✅ Password hashate con bcrypt (10 rounds)
- ✅ JWT con secret da .env
- ✅ CORS configurato correttamente
- ✅ SQL injection prevented (prepared statements)
- ✅ XSS protection (React escape automatico)
- ✅ Soft delete utenti (mantiene relazioni)
- ✅ Validazione input lato server

## 🗄️ Database

**Tipo:** SQLite (file-based, no server)
**Posizione:** backend/database.db
**Accesso:** Vedi DATABASE_MANAGEMENT.md

## ⚙️ Variabili Ambiente

### Backend (.env)
```
PORT=3001
JWT_SECRET=your-secret-key
NODE_ENV=development
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3001/api
```

## 📦 Dipendenze Principali

### Backend
- express (web server)
- better-sqlite3 (database)
- bcryptjs (hash password)
- jsonwebtoken (auth)
- cors (cross-origin)

### Frontend
- react + react-dom
- react-router-dom (routing)
- axios (HTTP)
- lucide-react (icons)
- tailwindcss (styling)

## ✅ Tutto è Separato!

- ❌ Nessun import tra backend e frontend
- ❌ Nessuna condivisione di codice
- ✅ Comunicazione solo via HTTP/REST
- ✅ Frontend può essere deployato separatamente
- ✅ Backend può servire più client (web, mobile, ecc.)
