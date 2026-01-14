# Deploy locale / server interno

## 1) Variabili d'ambiente
- Copia backend/.env.example in backend/.env
- Imposta JWT_SECRET e verifica ALLOWED_ORIGINS/FRONTEND_URL (di default http://projectpulse.local)
- Frontend: copia frontend/.env.example in frontend/.env (default http://projectpulse.local/api). Per sviluppo locale usa .env.development

## 2) Build frontend
```bash
cd frontend
npm ci
npm run build
```
I file saranno in frontend/dist.

## 3) Systemd (backend)
1. Copia deploy/projectpulse-backend.service.example in /etc/systemd/system/projectpulse-backend.service
2. Aggiorna WorkingDirectory, EnvironmentFile, User/Group se diverso
3. Ricarica e avvia:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now projectpulse-backend
sudo systemctl status projectpulse-backend
```

## 4) Nginx
1. Copia deploy/nginx-projectpulse.conf.example in /etc/nginx/sites-available/projectpulse.conf
2. Aggiorna server_name (default projectpulse.local), root (path di frontend/dist), proxy_pass se backend non è su 127.0.0.1:3001
3. Abilita e riavvia:
```bash
sudo ln -sf /etc/nginx/sites-available/projectpulse.conf /etc/nginx/sites-enabled/projectpulse.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 5) Test
- API: curl http://<host-backend>:3001/api/health
- Frontend: apri http://<host-frontend>/ e verifica richieste XHR verso /api con 200

Note: se usi porte diverse, allinea VITE_API_URL (frontend) e proxy_pass (nginx). Se vuoi HTTPS interno, termina TLS in nginx e proxy in HTTP verso il backend.
