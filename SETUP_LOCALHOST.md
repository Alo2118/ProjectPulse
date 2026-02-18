# ProjectPulse - Localhost Setup Guide

## 🎯 Complete Setup Instructions

This guide will walk you through setting up ProjectPulse on your local Windows machine.

---

## ⚙️ Prerequisites

### Required Software

1. **Node.js 18+**
   - Download: https://nodejs.org/
   - Verify: `node --version` (should be v18.0.0 or higher)
   - Verify npm: `npm --version`

2. **SQL Server Express**
   - Download: https://www.microsoft.com/en-us/sql-server/sql-server-downloads (Express edition)
   - During installation:
     - Choose "Basic" installation
     - Note the instance name (default: SQLEXPRESS)
     - Default port: 1433
     - Install SQL Server Management Studio (SSMS) separately

3. **Git**
   - Download: https://git-scm.com/download/win
   - Verify: `git --version`

4. **Visual Studio Code**
   - Download: https://code.visualstudio.com/
   - Recommended extensions:
     - ESLint
     - Prettier
     - Prisma
     - TypeScript Vue Plugin (Volar)
     - Tailwind CSS IntelliSense

---

## 📦 Installation Steps

### Step 1: Verify SQL Server Express Installation

```bash
# Open Command Prompt or PowerShell

# Check if SQL Server is running
sqlcmd -S localhost\SQLEXPRESS -Q "SELECT @@VERSION"

# Should output SQL Server version info
```

If SQL Server is not running:
- Open Windows Services (`services.msc`)
- Find "SQL Server (SQLEXPRESS)"
- Right-click → Start

### Step 2: Create Database

```bash
# Connect to SQL Server
sqlcmd -S localhost\SQLEXPRESS
```

In the SQL Server prompt:
```sql
-- Create database
CREATE DATABASE projectpulse;
GO

-- Create login (optional, for better security)
CREATE LOGIN projectpulse_user WITH PASSWORD = 'your_secure_password';
GO

USE projectpulse;
GO

CREATE USER projectpulse_user FOR LOGIN projectpulse_user;
GO

ALTER ROLE db_owner ADD MEMBER projectpulse_user;
GO

-- Exit
EXIT
```

### Step 3: Clone Project (When Repository Exists)

```bash
# Navigate to your projects folder
cd C:\Users\YourName\Projects

# Clone repository
git clone <repository-url>
cd project-pulse
```

**OR** if starting fresh (with Claude Code):

```bash
# Create project folder
mkdir project-pulse
cd project-pulse

# Initialize git
git init
```

### Step 4: Install Dependencies

```bash
# Install root dependencies and all workspaces
npm run install:all

# This installs:
# - Root workspace (concurrently, prettier)
# - client/ (React, Vite, Tailwind, etc.)
# - server/ (Express, Prisma, bcrypt, etc.)
```

**Expected output:**
```
added 1523 packages in 2m
```

If you see errors, run individually:
```bash
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..
```

### Step 5: Configure Environment Variables

#### Server Environment (server/.env)

```bash
# Copy example file
cd server
copy .env.example .env

# Edit .env with your values
```

**server/.env** content:
```env
# Database (SQL Server Express)
DATABASE_URL="sqlserver://localhost:1433;database=projectpulse;user=sa;password=your_password;encrypt=true;trustServerCertificate=true"
# Or with Windows Authentication:
# DATABASE_URL="sqlserver://localhost\SQLEXPRESS;database=projectpulse;integratedSecurity=true;trustServerCertificate=true"

# JWT Secrets (generate random strings)
JWT_SECRET="your-very-secure-random-string-min-32-chars"
JWT_REFRESH_SECRET="another-very-secure-random-string-min-32-chars"

# JWT Expiry
JWT_EXPIRES_IN="8h"
JWT_REFRESH_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV="development"

# CORS
CORS_ORIGIN="http://localhost:5173"

# File Upload
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=10485760

# Email (optional - notifiche automatiche: scadenze, rischi critici, task bloccati)
SMTP_HOST=""          # es. smtp.gmail.com | smtp.office365.com
SMTP_PORT=""          # 587 (STARTTLS) | 465 (SSL)
SMTP_SECURE=""        # true se porta 465, altrimenti false/vuoto
SMTP_USER=""          # username SMTP
SMTP_PASS=""          # password SMTP (ex SMTP_PASSWORD)
SMTP_FROM=""          # es. "ProjectPulse <noreply@azienda.it>"
```

**Generate secure JWT secrets:**
```bash
# In Node.js REPL or online tool
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Client Environment (client/.env.local)

```bash
cd ../client
copy .env.example .env.local
```

**client/.env.local** content:
```env
# API Base URL
VITE_API_URL="http://localhost:3000/api"

# Socket.io URL
VITE_SOCKET_URL="http://localhost:3000"

# App Config
VITE_APP_NAME="ProjectPulse"
VITE_APP_VERSION="1.0.0"
```

### Step 6: Database Migration

```bash
# From project root
npm run db:migrate

# This will:
# 1. Generate Prisma Client
# 2. Create all tables in PostgreSQL
# 3. Apply schema from schema.prisma
```

**Expected output:**
```
Your database is now in sync with your schema.

✔ Generated Prisma Client
```

**Verify in SSMS:**
1. Open SQL Server Management Studio (SSMS)
2. Connect to localhost\SQLEXPRESS
3. Navigate to: Databases → projectpulse → Tables
4. You should see: users, projects, tasks, time_entries, etc.

### Step 7: Seed Initial Data

```bash
npm run db:seed

# This creates:
# - Admin user (admin@projectpulse.local / Admin123!)
# - Direzione user (direzione@projectpulse.local / Direzione123!)
# - Dipendente user (dipendente@projectpulse.local / Dipendente123!)
# - 2 sample projects
# - 5 sample tasks
```

**Expected output:**
```
🌱 Seeding database...
✅ Created 3 users
✅ Created 2 projects
✅ Created 5 tasks
🎉 Seed complete!
```

### Step 8: Start Development Servers

```bash
# From project root
npm run dev

# This starts:
# - Frontend (Vite): http://localhost:5173
# - Backend (Express): http://localhost:3000
```

**Expected output:**
```
[client] VITE v5.0.8  ready in 1234 ms
[client]   ➜  Local:   http://localhost:5173/
[server] Server running on http://localhost:3000
[server] Database connected ✅
```

### Step 9: Access Application

1. Open browser: http://localhost:5173
2. Login with:
   - **Admin**: admin@projectpulse.local / Admin123!
   - **Direzione**: direzione@projectpulse.local / Direzione123!
   - **Dipendente**: dipendente@projectpulse.local / Dipendente123!

---

## 🔧 Troubleshooting

### Issue: "Cannot connect to database"

**Solution:**
1. Check SQL Server is running:
   ```bash
   sqlcmd -S localhost\SQLEXPRESS -Q "SELECT 1"
   ```
2. Verify DATABASE_URL in server/.env
3. Test connection manually:
   ```bash
   sqlcmd -S localhost\SQLEXPRESS -d projectpulse
   ```

### Issue: "Port 3000 already in use"

**Solution:**
1. Find process using port:
   ```bash
   netstat -ano | findstr :3000
   ```
2. Kill process:
   ```bash
   taskkill /PID <process_id> /F
   ```
3. Or change PORT in server/.env to 3001

### Issue: "Port 5173 already in use"

**Solution:**
1. Change in client/vite.config.ts:
   ```typescript
   server: {
     port: 5174,  // Change to any available port
   }
   ```
2. Update CORS_ORIGIN in server/.env

### Issue: "Prisma Client not generated"

**Solution:**
```bash
cd server
npx prisma generate
```

### Issue: "Module not found"

**Solution:**
```bash
# Clean install
rm -rf node_modules package-lock.json
rm -rf client/node_modules client/package-lock.json
rm -rf server/node_modules server/package-lock.json

npm run install:all
```

### Issue: "Database migration failed"

**Solution:**
```bash
# Reset database (⚠️ deletes all data)
cd server
npx prisma migrate reset
npx prisma migrate dev
npm run seed
```

---

## 🛠️ Development Tools

### Prisma Studio (Database GUI)

```bash
npm run db:studio

# Opens browser at http://localhost:5555
# View and edit database records visually
```

### API Testing

Use **Thunder Client** (VS Code extension) or **Postman**:

1. Install Thunder Client in VS Code
2. Import collection (if available)
3. Test endpoints:
   ```
   POST http://localhost:3000/api/auth/login
   {
     "email": "admin@projectpulse.local",
     "password": "Admin123!"
   }
   ```

### Logs

**Server logs:**
```bash
# Real-time logs in terminal where npm run dev is running
# Or check server/logs/ folder
```

**Database logs:**
- Check SSMS → Management → SQL Server Logs

---

## 📊 Database Management

### View Tables

```bash
sqlcmd -S localhost\SQLEXPRESS -d projectpulse

# List tables
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES;
GO

# Describe table
EXEC sp_columns users;
GO

# Query
SELECT * FROM users;
GO

# Exit
EXIT
```

### Backup Database

```bash
# Backup (via sqlcmd)
sqlcmd -S localhost\SQLEXPRESS -Q "BACKUP DATABASE projectpulse TO DISK='C:\Backups\projectpulse_2026-01-21.bak'"

# Restore
sqlcmd -S localhost\SQLEXPRESS -Q "RESTORE DATABASE projectpulse FROM DISK='C:\Backups\projectpulse_2026-01-21.bak'"
```

### Reset Database

```bash
cd server
npx prisma migrate reset
# Confirms and drops all data
npm run seed
```

---

## 🚀 Production Build (Local)

### Build Both Client and Server

```bash
# Build everything
npm run build

# Expected output:
# - client/dist/ (static files)
# - server/dist/ (compiled JS)
```

### Run Production Build

```bash
npm run start:prod

# Serves:
# - Frontend from client/dist
# - Backend from server/dist
```

---

## 🔐 Security Checklist

- [ ] Changed default JWT secrets
- [ ] Changed default database password
- [ ] Installed all dependencies (no vulnerabilities)
- [ ] Firewall allows SQL Server (port 1433) only for localhost
- [ ] .env files added to .gitignore
- [ ] Strong passwords for all seed users (change in production!)

---

## 📂 Project Structure Quick Reference

```
project-pulse/
├── client/          # Frontend (React + Vite)
│   ├── src/
│   └── .env.local   # Frontend config
│
├── server/          # Backend (Express + Prisma)
│   ├── src/
│   ├── prisma/
│   └── .env         # Backend config ⚠️ NEVER COMMIT
│
└── package.json     # Root scripts
```

---

## 🎓 Next Steps

1. ✅ Verify all services running
2. ✅ Login with test users
3. ✅ Create a project
4. ✅ Add tasks
5. ✅ Start timer
6. ✅ Check Prisma Studio

**Ready to develop?** See **IMPLEMENTATION_GUIDE.md** for phase-by-phase development with Claude Code!

---

## 📞 Getting Help

### Common Commands Reference

```bash
# Install all
npm run install:all

# Start development
npm run dev

# Database migrations
npm run db:migrate

# Seed data
npm run db:seed

# Prisma Studio
npm run db:studio

# Build for production
npm run build

# Run production
npm run start:prod

# Lint code
npm run lint

# Format code
npm run format

# Run tests
npm run test
```

### VS Code Tasks (Optional)

Create `.vscode/tasks.json`:
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Dev Servers",
      "type": "shell",
      "command": "npm run dev",
      "problemMatcher": []
    },
    {
      "label": "Open Prisma Studio",
      "type": "shell",
      "command": "npm run db:studio",
      "problemMatcher": []
    }
  ]
}
```

Press `Ctrl+Shift+P` → "Tasks: Run Task" → Select task

---

## 🎉 Success Criteria

Your setup is complete when:

- ✅ `npm run dev` starts both servers without errors
- ✅ Frontend loads at http://localhost:5173
- ✅ Backend responds at http://localhost:3000/api/health (if health endpoint exists)
- ✅ Can login with seed users
- ✅ Prisma Studio opens and shows tables with data
- ✅ No console errors in browser or terminal

---

**Document Version**: 1.0  
**Last Updated**: January 2026  
**Author**: Nicola (with Claude)
