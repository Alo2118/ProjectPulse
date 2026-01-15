# Design System - ProjectPulse

Sistema di design centralizzato con classi Tailwind riutilizzabili per garantire coerenza visiva in tutta l'app.

## 🎨 Palette Colori

### Principale (Mikai Blue)
- **primary-50 → primary-900**: Azzurro Mikai (#3296dc)
- Usare per: stati attivi, completamenti, successi

### Secondaria (Slate/Grey)
- **slate-50 → slate-900**: Grigio/Nero
- Usare per: stati neutri, testo, bordi, blocchi

## 📦 Classi CSS Centralizzate

### Cards
```jsx
// Card standard con animazione
<div className="card">...</div>

// Card compatta
<div className="card-compact">...</div>

// Card statistica con gradiente
<div className="card-stat from-primary-50 to-primary-100 border-primary-200">...</div>
<div className="card-stat from-slate-50 to-slate-100 border-slate-200">...</div>
```

### Buttons
```jsx
// Bottone primario
<button className="btn-primary">Salva</button>

// Bottone secondario
<button className="btn-secondary">Annulla</button>

// Bottone pericolo
<button className="btn-danger">Elimina</button>

// Bottone piccolo
<button className="btn-primary btn-sm">Azione</button>
```

### Badges
```jsx
// Badge primario
<span className="badge-primary">In Corso</span>

// Badge grigio
<span className="badge-slate">Bloccato</span>
```

### Tabs
```jsx
// Tab attivo
<button className={activeTab ? 'tab-active' : 'tab-inactive'}>
  Tab 1
</button>
```

### Layout Pagina
```jsx
// Container pagina con gradiente e padding responsive
<div className="page-container">
  {/* Header con animazione */}
  <div className="page-header">
    <h1 className="page-title">📊 Titolo Pagina</h1>
    <div>Azioni...</div>
  </div>
  
  {/* Stats grid */}
  <div className="stats-grid">
    <div className="card-stat">...</div>
  </div>
  
  {/* Contenuto */}
  <div className="card">...</div>
</div>
```

### Grids
```jsx
// Grid statistiche 6 colonne
<div className="stats-grid">...</div>

// Grid compatta 4 colonne
<div className="stats-grid-compact">...</div>
```

### Input Fields
```jsx
<label className="label">Nome Campo</label>
<input className="input" type="text" />
```

### Alerts
```jsx
// Alert informativo (blu)
<div className="alert-info">
  <span>ℹ️</span>
  <p>Messaggio informativo</p>
</div>

// Alert warning (arancione/ambra) - per attenzioni, scadenze imminenti
<div className="alert-warning">
  <span>⚠️</span>
  <p>Attenzione: scadenza tra 3 giorni</p>
</div>

// Alert critico (rosso) - per errori, ritardi, blocchi
<div className="alert-critical">
  <span>🚨</span>
  <p>Errore critico o attività in ritardo</p>
</div>

// Alert successo (verde)
<div className="alert-success">
  <span>✅</span>
  <p>Operazione completata con successo</p>
</div>
```

**Colori Alert:**
- **Blue (alert-info)**: Informazioni generali, tips
- **Amber (alert-warning)**: Avvisi, scadenze imminenti
- **Red (alert-critical)**: Errori, ritardi, task bloccati
- **Green (alert-success)**: Successi, conferme positive

## 🎭 Animazioni

Tutte le classi includono automaticamente animazioni:
- `animate-fade-in`: Fade in all'apparizione
- `animate-slide-up`: Slide up
- `animate-slide-right`: Slide da sinistra
- `hover-lift`: Lift su hover
- `stagger-animation`: Animazione sfalsata per liste

## ✅ Regole di Utilizzo

### ✓ DA FARE
- Usare sempre le classi centralizzate (`card`, `btn-primary`, ecc.)
- Applicare `page-container` a tutte le pagine
- Usare `card-stat` per le statistiche
- Applicare animazioni automatiche

### ✗ DA EVITARE
- ❌ `bg-white rounded-lg shadow-sm border border-slate-200 p-4` → Usa `card`
- ❌ `bg-primary-600 text-white hover:bg-primary-700 px-4 py-2` → Usa `btn-primary`
- ❌ `bg-gradient-to-br from-blue-50 to-blue-100` → Usa `card-stat from-primary-50 to-primary-100`
- ❌ Colori rosso/verde/giallo → Usa solo palette nero-azzurro

## 📄 Esempi Completi

### Dashboard Page
```jsx
export default function Dashboard() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">📊 Dashboard</h1>
        <button className="btn-primary">+ Nuovo</button>
      </div>

      <div className="stats-grid">
        <div className="card-stat from-primary-50 to-primary-100 border-primary-200">
          <div className="text-xs text-primary-700 mb-1">✅ Completati</div>
          <div className="text-2xl font-bold text-primary-900">24</div>
        </div>
        <div className="card-stat from-slate-50 to-slate-100 border-slate-200">
          <div className="text-xs text-slate-700 mb-1">🚫 Bloccati</div>
          <div className="text-2xl font-bold text-slate-900">3</div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-3">Contenuto</h2>
        <p>Testo...</p>
      </div>
    </div>
  );
}
```

### Modal con Form
```jsx
<Modal>
  <div className="space-y-4">
    <div>
      <label className="label">Nome</label>
      <input className="input" type="text" />
    </div>
    
    <div className="alert-info">
      Compila tutti i campi richiesti
    </div>
    
    <div className="flex gap-2 justify-end">
      <button className="btn-secondary">Annulla</button>
      <button className="btn-primary">Salva</button>
    </div>
  </div>
</Modal>
```

## 🔄 Migrazione

Per convertire una pagina esistente:

1. Sostituisci container pagina:
   ```jsx
   // Prima
   <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 lg:p-6">
   
   // Dopo
   <div className="page-container">
   ```

2. Sostituisci card:
   ```jsx
   // Prima
   <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
   
   // Dopo
   <div className="card">
   ```

3. Sostituisci bottoni:
   ```jsx
   // Prima
   <button className="bg-primary-600 text-white hover:bg-primary-700 px-4 py-2 rounded-lg">
   
   // Dopo
   <button className="btn-primary">
   ```

4. Sostituisci stats:
   ```jsx
   // Prima
   <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-3 border border-primary-200">
   
   // Dopo
   <div className="card-stat from-primary-50 to-primary-100 border-primary-200">
   ```

## 📝 Note

- Tutte le classi sono responsive di default
- Le animazioni si attivano automaticamente
- I colori seguono la palette Mikai (nero → azzurro)
- Hover effects inclusi automaticamente
- Shadow e bordi consistenti su tutti i componenti
