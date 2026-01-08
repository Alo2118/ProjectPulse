# 🗄️ Gestione Database - ProjectPulse

Questa guida spiega come accedere e gestire il database SQLite dell'applicazione.

## 📍 Posizione Database

Il database SQLite si trova in:
```
/home/user/ProjectPulse/backend/database.db
```

## 🛠️ Strumenti Disponibili

Abbiamo creato 3 script Node.js per gestire il database senza bisogno di installare strumenti esterni.

### 1. **Ispezionare il Database** (`inspect-db`)

Mostra una panoramica completa del database con statistiche.

```bash
cd backend
npm run inspect-db
```

**Output esempio:**
```
📊 TABELLE NEL DATABASE:
  • users
  • projects
  • tasks
  • milestones
  • comments
  • time_entries

👥 TABELLA USERS:
Totale utenti: 2
  [1] Nicola Admin (nicola@admin.it)
      Ruolo: amministratore | Stato: ✅ Attivo
```

---

### 2. **Eseguire Query SQL** (`query-db`)

Esegui query SQL personalizzate sul database.

```bash
cd backend
npm run query-db "SELECT * FROM users"
```

**Esempi di query utili:**

```bash
# Tutti gli utenti
npm run query-db "SELECT id, email, first_name, last_name, role, active FROM users"

# Utenti in attesa di approvazione
npm run query-db "SELECT * FROM users WHERE active = 0"

# Tutti i progetti
npm run query-db "SELECT * FROM projects"

# Task di un progetto specifico
npm run query-db "SELECT * FROM tasks WHERE project_id = 1"

# Tempo registrato per utente
npm run query-db "SELECT u.email, SUM(te.duration)/3600 as ore FROM time_entries te JOIN users u ON te.user_id = u.id GROUP BY u.id"

# Commenti recenti
npm run query-db "SELECT c.message, u.email, c.created_at FROM comments c JOIN users u ON c.user_id = u.id ORDER BY c.created_at DESC LIMIT 10"
```

---

### 3. **Gestire Utenti** (`manage-db`)

Script per modificare utenti direttamente dal terminale.

```bash
cd backend
npm run manage-db
```

#### Comandi disponibili:

**Attivare un utente (approvare registrazione):**
```bash
npm run manage-db activate nicola@example.com
```

**Disattivare un utente:**
```bash
npm run manage-db deactivate nicola@example.com
```

**Cambiare password:**
```bash
npm run manage-db change-password nicola@admin.it nuovapassword123
```

**Cambiare ruolo:**
```bash
# Ruoli disponibili: dipendente, direzione, amministratore
npm run manage-db change-role nicola@example.com amministratore
```

**Eliminare utente (ATTENZIONE!):**
```bash
npm run manage-db delete nicola@example.com --confirm
```

---

## 🔍 Accesso al Database con Altri Strumenti

### Opzione 1: DB Browser for SQLite (GUI)

1. Scarica e installa: https://sqlitebrowser.org/
2. Apri il file: `/home/user/ProjectPulse/backend/database.db`
3. Naviga nelle tabelle visualmente

### Opzione 2: SQLite CLI (se installato)

```bash
sqlite3 /home/user/ProjectPulse/backend/database.db
```

Comandi utili dentro sqlite3:
```sql
.tables                    -- Lista tutte le tabelle
.schema users              -- Mostra struttura tabella users
SELECT * FROM users;       -- Query normale
.quit                      -- Esci
```

### Opzione 3: VS Code Extension

Installa l'estensione "SQLite" in VS Code:
1. Apri VS Code
2. Installa estensione "SQLite" di alexcvzz
3. Apri il database dal Explorer

---

## 📊 Struttura Database

### Tabella `users`
```sql
id              INTEGER PRIMARY KEY
email           TEXT UNIQUE NOT NULL
password        TEXT NOT NULL (hashed con bcrypt)
first_name      TEXT NOT NULL
last_name       TEXT NOT NULL
role            TEXT NOT NULL (dipendente|direzione|amministratore)
active          BOOLEAN DEFAULT 1
created_at      DATETIME
```

### Tabella `projects`
```sql
id              INTEGER PRIMARY KEY
name            TEXT NOT NULL
description     TEXT
status          TEXT (planning|active|on_hold|completed)
start_date      DATE
end_date        DATE
created_by      INTEGER (FK -> users.id)
created_at      DATETIME
```

### Tabella `tasks`
```sql
id              INTEGER PRIMARY KEY
title           TEXT NOT NULL
description     TEXT
status          TEXT (todo|in_progress|completed)
priority        TEXT
project_id      INTEGER (FK -> projects.id)
milestone_id    INTEGER (FK -> milestones.id)
assigned_to     INTEGER (FK -> users.id)
due_date        DATE
created_by      INTEGER (FK -> users.id)
created_at      DATETIME
completed_at    DATETIME
```

### Tabella `time_entries`
```sql
id              INTEGER PRIMARY KEY
task_id         INTEGER (FK -> tasks.id)
user_id         INTEGER (FK -> users.id)
started_at      DATETIME
ended_at        DATETIME
duration        INTEGER (secondi)
notes           TEXT
created_at      DATETIME
```

---

## 🚨 Situazioni Comuni

### Problema: Utente non riesce a loggarsi

1. Verifica se l'utente esiste:
```bash
npm run query-db "SELECT * FROM users WHERE email = 'email@example.com'"
```

2. Controlla se l'utente è attivo:
   - Se `active = 0` → Utente in attesa di approvazione
   - Attivalo: `npm run manage-db activate email@example.com`

3. Reset password se necessario:
```bash
npm run manage-db change-password email@example.com password123
```

### Problema: Password dimenticata admin

Reset password amministratore:
```bash
cd backend
npm run manage-db change-password nicola@admin.it password123
```

### Problema: Utente registrato ma non appare

Controlla utenti in attesa:
```bash
npm run query-db "SELECT * FROM users WHERE active = 0"
```

Approva l'utente:
```bash
npm run manage-db activate email@example.com
```

### Problema: Database corrotto o da resettare

1. Backup del database esistente:
```bash
cp backend/database.db backend/database.db.backup
```

2. Elimina e ricrea:
```bash
rm backend/database.db
cd backend
npm run init-db
npm run create-admin
```

---

## 💾 Backup del Database

### Backup Manuale

```bash
# Crea backup con timestamp
cp backend/database.db "backend/database_backup_$(date +%Y%m%d_%H%M%S).db"
```

### Restore da Backup

```bash
# Sostituisci database con backup
cp backend/database_backup_YYYYMMDD_HHMMSS.db backend/database.db
```

### Backup Automatico (Consigliato)

Aggiungi al crontab per backup giornaliero:
```bash
0 2 * * * cp /home/user/ProjectPulse/backend/database.db "/home/user/ProjectPulse/backend/backups/db_$(date +\%Y\%m\%d).db"
```

---

## 📝 Note Importanti

1. **Il database è SQLite** - È un singolo file, non un server
2. **Backup regolari** - Fai backup prima di operazioni critiche
3. **Password** - Sono hashate con bcrypt, non leggibili in chiaro
4. **Timezone** - Usa `datetime('now', '+1 hour')` per ora italiana (CET)
5. **Foreign Keys** - Sono abilitate, attenzione a eliminazioni in cascata

---

## 🆘 Supporto

Se hai problemi:
1. Controlla i log del server: `cd backend && npm run dev`
2. Ispeziona il database: `npm run inspect-db`
3. Verifica la struttura con query custom
4. Contatta l'amministratore di sistema

---

**Ultimo aggiornamento:** 2026-01-08
