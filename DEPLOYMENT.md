# 🚀 Deployment Guide - ProjectPulse

## Architettura di Deploy Gratuito

**Frontend**: Vercel (già deployato ✅)
**Backend + Database**: Render.com (free tier)

---

## 📦 Step 1: Deploy Backend su Render

### 1.1 Crea account su Render
- Vai su [render.com](https://render.com)
- Registrati con GitHub (consigliato)

### 1.2 Deploy da GitHub
1. Clicca **"New +"** → **"Web Service"**
2. Connetti il repository GitHub: `Alo2118/ProjectPulse`
3. Seleziona il branch: `claude/task-management-app-XfDPH`
4. Render rileverà automaticamente `render.yaml` ✅

### 1.3 Configurazione Automatica
Il file `render.yaml` configurerà automaticamente:
- ✅ Root directory: `/backend`
- ✅ Build command: `npm install && npm run init-db`
- ✅ Start command: `npm start`
- ✅ Environment variables (JWT_SECRET auto-generato)

### 1.4 Deploy
- Clicca **"Create Web Service"**
- Attendi 3-5 minuti per il primo deploy
- Copia l'URL generato (es: `https://projectpulse-backend.onrender.com`)

---

## 🌐 Step 2: Aggiorna Frontend su Vercel

### 2.1 Aggiungi variabile d'ambiente su Vercel
1. Vai su [vercel.com/dashboard](https://vercel.com/dashboard)
2. Seleziona progetto `project-pulse`
3. Settings → Environment Variables
4. Aggiungi:
   ```
   Name: VITE_API_URL
   Value: https://projectpulse-backend.onrender.com/api
   ```
   (sostituisci con il tuo URL Render)

### 2.2 Redeploy Frontend
- Vercel farà automaticamente un redeploy
- Oppure: Settings → Deployments → Redeploy

---

## 🔧 Step 3: Aggiorna CORS Backend (Opzionale ma Consigliato)

Su Render, nella dashboard del tuo backend:

1. Environment → Aggiungi variabile:
   ```
   FRONTEND_URL = https://project-pulse-amber.vercel.app
   ```
   (sostituisci con il tuo dominio Vercel)

2. Salva → Il servizio farà restart automatico

---

## ✅ Step 4: Testa l'App

1. Apri il tuo URL Vercel: `https://project-pulse-amber.vercel.app`
2. Prova login con:
   - **Dipendente**: dipendente@company.com / password123
   - **Direzione**: direzione@company.com / password123

3. Verifica che tutto funzioni:
   - [ ] Login/logout
   - [ ] Creazione task
   - [ ] Timer start/stop
   - [ ] Commenti
   - [ ] Report giornaliero

---

## 🎯 URL Finali

- **Frontend**: https://project-pulse-amber.vercel.app
- **Backend API**: https://projectpulse-backend.onrender.com/api
- **Health Check**: https://projectpulse-backend.onrender.com/api/health

---

## ⚠️ Limitazioni Free Tier

### Render Free Tier:
- ✅ 750 ore/mese (sempre attivo se sotto il limite)
- ⚠️ Va in sleep dopo 15 minuti di inattività
- ⚠️ Prima richiesta dopo sleep: ~30 secondi di attesa
- ✅ Database SQLite persistente (si resetta ad ogni deploy)

### Vercel Free Tier:
- ✅ 100 GB bandwidth/mese
- ✅ Deploy illimitati
- ✅ Sempre attivo, zero latenza

---

## 🔄 Deploy Automatico

Ogni push sul branch `claude/task-management-app-XfDPH`:
- ✅ Vercel redeploy frontend automaticamente
- ✅ Render redeploy backend automaticamente

---

## 📝 Note Importanti

1. **Database**: SQLite viene reinizializzato ad ogni deploy backend. Per dati persistenti, considera upgrade a PostgreSQL su Render ($7/mese) o usa Supabase gratis.

2. **Sleep Mode**: Il backend Render va in sleep dopo 15 min inattività. La prima richiesta sarà lenta (~30s). Considera un servizio di "ping" per mantenerlo attivo (es: UptimeRobot).

3. **HTTPS**: Tutto automatico, certificati SSL inclusi gratis! 🔒

---

## 🆘 Troubleshooting

**Errore 404 su API:**
- Verifica VITE_API_URL su Vercel punti al backend Render
- Controlla che backend sia online: visita `/api/health`

**Backend non parte:**
- Controlla logs su Render dashboard
- Verifica che `render.yaml` sia nel root del repo

**CORS Error:**
- Aggiungi FRONTEND_URL nelle env vars Render
- Vercel domain deve matchare esattamente

---

## 🎉 Deploy Completato!

La tua app è ora live e accessibile da qualsiasi dispositivo! 🚀
