# 🔧 Troubleshooting - ProjectPulse

## ❌ PROBLEMA: "I dati non sono coerenti tra frontend e backend"

### 🎯 Causa Principale Identificata

Il **backend non era in esecuzione**! Il frontend stava cercando di connettersi a:
- **Development**: http://localhost:3001/api (backend locale)
- **Production**: https://projectpulse-backend.onrender.com/api (backend remoto)

Se il backend locale non è avviato, il frontend non può recuperare i dati.

---

## ✅ SOLUZIONE RAPIDA

### **Passo 1: Avvia Backend**
```bash
cd backend
npm run dev
```

**Output atteso:**
```
✅ Database tables created successfully
✅ Server running on port 3001
📊 API endpoints available at /api
🌍 Environment: development
```

### **Passo 2: Avvia Frontend**
```bash
cd frontend
npm run dev
```

**Output atteso:**
```
VITE v5.x.x  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### **Passo 3: Verifica Connessione**

Apri http://localhost:5173 nel browser e:
1. Apri DevTools (F12)
2. Vai su Network tab
3. Fai login con: `nicola@admin.it` / `password123`
4. Verifica che vedi richieste a `http://localhost:3001/api/...`

---

## 🔍 VERIFICA BACKEND IN ESECUZIONE

### Test 1: Backend risponde?
```bash
curl http://localhost:3001/api/auth/me
```

**✅ Risposta OK:**
```json
{"error":"Authentication required"}
```

**❌ Risposta ERRORE:**
```
curl: (7) Failed to connect to localhost port 3001
```
→ **Soluzione**: Avvia il backend con `npm run dev`

### Test 2: Login funziona?
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nicola@admin.it","password":"password123"}'
```

**✅ Risposta OK:**
```json
{
  "token": "eyJ...",
  "user": {
    "id": 2,
    "email": "nicola@admin.it",
    "first_name": "Nicola",
    "last_name": "Admin",
    "role": "amministratore"
  }
}
```

---

## 🌐 CONFIGURAZIONE URL API

### Development (Locale)
**File**: `frontend/.env.development`
```
VITE_API_URL=http://localhost:3001/api
```

### Production (Deploy)
**File**: `frontend/.env.production`
```
VITE_API_URL=https://projectpulse-backend.onrender.com/api
```

### Come funziona

Il file `frontend/src/services/api.js` usa:
```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
```

**Priorità**:
1. Se esiste `VITE_API_URL` → usa quello
2. Altrimenti → usa `http://localhost:3001/api` (fallback)

---

## 🚨 PROBLEMI COMUNI

### 1. "Cannot connect to API"

**Sintomi**: Frontend mostra errori di rete, nessun dato caricato

**Verifica:**
```bash
# Backend è in esecuzione?
curl http://localhost:3001/api/auth/me

# Frontend sta usando l'URL corretto?
# Apri DevTools → Network → Controlla gli URL delle richieste
```

**Soluzioni:**
- ✅ Avvia backend: `cd backend && npm run dev`
- ✅ Verifica porta: Backend deve essere su 3001
- ✅ Controlla .env files

---

### 2. "CORS Error"

**Sintomi**: Console mostra errori tipo:
```
Access to XMLHttpRequest blocked by CORS policy
```

**Verifica CORS nel backend** (`backend/src/server.js`):
```javascript
const allowedOrigins = [
  'http://localhost:5173',  // ← Frontend dev
  'http://localhost:3000',
  // ... altri domini
];
```

**Soluzione:**
- ✅ Assicurati che `http://localhost:5173` sia nella lista
- ✅ Riavvia backend dopo modifiche

---

### 3. "Dati vecchi / non aggiornati"

**Sintomi**: Frontend mostra dati che non corrispondono al database

**Cause possibili:**
1. **Cache del browser** - Svuota cache (Ctrl+Shift+Delete)
2. **Token JWT scaduto** - Fai logout e login di nuovo
3. **Backend punta a DB diverso** - Verifica `backend/database.db`
4. **Frontend in production mode** - Usa .env.development invece di .env.production

**Verifica quale DB sta usando il backend:**
```bash
cd backend
npm run inspect-db
```

---

### 4. "Utente non riesce a loggarsi"

**Sintomi**: Login restituisce "Credenziali non valide"

**Debug:**
```bash
# 1. Controlla se l'utente esiste
cd backend
npm run query-db "SELECT * FROM users WHERE email = 'email@example.com'"

# 2. Controlla se è attivo
npm run query-db "SELECT email, active FROM users WHERE email = 'email@example.com'"

# 3. Reset password se necessario
npm run manage-db change-password email@example.com nuovapassword
```

---

### 5. "Errore 403: Account in attesa di approvazione"

**Sintomi**: Login restituisce messaggio di approvazione in attesa

**Causa**: Utente registrato ma `active = 0`

**Soluzione:**
```bash
cd backend
npm run manage-db activate email@example.com
```

---

## 🔐 CREDENZIALI DEFAULT

### Admin Account
```
Email: nicola@admin.it
Password: password123
Ruolo: amministratore
```

### Reset Password Admin
```bash
cd backend
npm run manage-db change-password nicola@admin.it password123
```

---

## 📊 ISPEZIONARE DATABASE

### Vista Rapida
```bash
cd backend
npm run inspect-db
```

### Query Personalizzata
```bash
npm run query-db "SELECT * FROM users"
npm run query-db "SELECT * FROM projects"
npm run query-db "SELECT * FROM tasks WHERE status = 'in_progress'"
```

### Gestire Utenti
```bash
# Attivare utente
npm run manage-db activate email@example.com

# Cambiare ruolo
npm run manage-db change-role email@example.com amministratore

# Cambiare password
npm run manage-db change-password email@example.com nuovapass
```

Vedi `DATABASE_MANAGEMENT.md` per guida completa

---

## 🔄 RESTART COMPLETO

Se tutto sembra rotto, fai un restart completo:

```bash
# 1. Ferma tutti i processi
# Ctrl+C su terminal backend
# Ctrl+C su terminal frontend

# 2. Pulisci node_modules (opzionale)
cd backend && rm -rf node_modules && npm install
cd frontend && rm -rf node_modules && npm install

# 3. Verifica database
cd backend
npm run inspect-db

# 4. Riavvia backend
npm run dev

# 5. In nuovo terminal, riavvia frontend
cd frontend
npm run dev
```

---

## 🌍 ENVIRONMENT CHECK

### Verifica Setup Completo

```bash
# Backend
cd backend
cat .env                    # Deve contenere PORT, JWT_SECRET
node src/server.js         # Deve partire senza errori

# Frontend
cd frontend
cat .env.development       # Deve contenere VITE_API_URL=http://localhost:3001/api
npm run dev                # Deve partire su porta 5173

# Database
cd backend
npm run inspect-db         # Deve mostrare tabelle e utenti
```

---

## 📞 CHECKLIST RAPIDA

Prima di segnalare un problema, verifica:

- [ ] Backend è in esecuzione? (`curl http://localhost:3001/api/auth/me`)
- [ ] Frontend è in esecuzione? (http://localhost:5173 raggiungibile)
- [ ] .env.development esiste nel frontend?
- [ ] Database contiene utenti? (`npm run inspect-db`)
- [ ] DevTools Network mostra richieste a localhost:3001?
- [ ] Console browser mostra errori?
- [ ] Hai fatto logout/login dopo modifiche?

---

## 🆘 DEBUG AVANZATO

### Vedere richieste Backend in real-time

Nel terminal dove gira il backend, vedrai:
```
POST /api/auth/login 200 15ms
GET /api/users 200 5ms
GET /api/projects 200 8ms
```

### Vedere richieste Frontend

DevTools → Network → Filter: `localhost:3001`

### Verificare JWT Token

1. Fai login nel frontend
2. Apri DevTools → Application → Local Storage
3. Cerca `token`
4. Copia il valore
5. Vai su https://jwt.io e incolla per decodificare

---

## ✅ TUTTO FUNZIONA SE...

- ✅ Backend risponde su http://localhost:3001/api
- ✅ Frontend carica su http://localhost:5173
- ✅ Login restituisce token + dati utente
- ✅ DevTools Network mostra richieste a localhost:3001 con status 200
- ✅ Database contiene utenti attivi
- ✅ Nessun errore CORS nella console

**Se tutto questo è vero → Il sistema funziona correttamente!** 🎉

---

**Ultimo aggiornamento:** 2026-01-08
