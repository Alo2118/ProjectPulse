# 🎮 Guida Rapida: Applicazione Stile Gaming

## Template Base per Ogni Pagina

### 1. Imports Standard
```jsx
// Aggiungi questi import a TUTTE le pagine
import { 
  GamingLayout, GamingHeader, GamingCard, GamingLoader,
  GamingKPICard, GamingKPIGrid, Button 
} from '../components/ui';

// Icone comuni per le pagine
import { Activity, Briefcase, Clock, Users, Calendar, etc } from 'lucide-react';
```

### 2. Struttura Pagina
```jsx
export default function YourPage() {
  // ... stato e logica ...
  
  if (loading) {
    return <GamingLoader message="Caricamento..." />;
  }
  
  return (
    <GamingLayout>
      <GamingHeader
        title="Titolo Pagina"
        subtitle="Descrizione pagina"
        icon={IconaRelevante}
        actions={
          <>
            <Button>Azione 1</Button>
            <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 ...">
              Azione Primaria
            </Button>
          </>
        }
      />
      
      {/* KPI Cards */}
      <GamingKPIGrid columns={4}>
        <GamingKPICard 
          title="Metrica 1" 
          value={value1} 
          icon={Icon1} 
          gradient="from-cyan-600 to-blue-700" 
          shadowColor="cyan" 
        />
        {/* ... altre KPI ... */}
      </GamingKPIGrid>
      
      {/* Contenuto principale */}
      <GamingCard>
        {/* Contenuto della card */}
      </GamingCard>
      
      {/* Altri contenuti ... */}
    </GamingLayout>
  );
}
```

### 3. Gradienti Standard per KPI

| Tipo Metrica | Gradient | Shadow |
|-------------|----------|--------|
| Primaria/Totale | `from-purple-600 to-pink-700` | `purple` |
| In Corso | `from-blue-600 to-cyan-700` | `blue` |
| Completato | `from-emerald-600 to-green-700` | `emerald` |
| Tempo/Performance | `from-orange-600 to-red-700` | `orange` |
| Utenti/Team | `from-indigo-600 to-violet-700` | `indigo` |
| Warning/Alert | `from-yellow-600 to-orange-700` | `yellow` |

### 4. Pulsanti Standard

```jsx
// Pulsante primario
<Button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/50 transition-all">
  <Icon className="w-4 h-4" />
  <span>Testo</span>
</Button>

// Pulsante secondario
<Button className="bg-slate-800 hover:bg-slate-700 text-white shadow-lg transition-all">
  <Icon className="w-4 h-4" />
  <span>Testo</span>
</Button>
```

### 5. Cards Secondarie

```jsx
<GamingCard>
  <div className="flex items-center gap-3 mb-4">
    <Icon className="w-6 h-6 text-cyan-400" />
    <h3 className="text-lg font-semibold text-white">Titolo Sezione</h3>
  </div>
  {/* Contenuto */}
</GamingCard>
```

## 📋 Checklist per Trasformazione Pagina

- [ ] Import `GamingLayout`, `GamingHeader`, `GamingCard`, `GamingKPICard`, `GamingKPIGrid`
- [ ] Import icone lucide-react pertinenti
- [ ] Sostituire loading screen con `<GamingLoader />`
- [ ] Wrappare tutto in `<GamingLayout>`
- [ ] Sostituire header con `<GamingHeader>`
- [ ] Convertire stat cards in `<GamingKPICard>` dentro `<GamingKPIGrid>`
- [ ] Sostituire card normali con `<GamingCard>` dove appropriato
- [ ] Applicare classi gradient ai pulsanti principali
- [ ] Verificare chiusura `</GamingLayout>`
- [ ] Test visivo della pagina

## 🎯 Pagine da Completare

### Alta Priorità (usate frequentemente)
1. ✅ ReportsPage.jsx
2. ✅ DipendenteDashboard.jsx  
3. ✅ DirezioneDashboard.jsx
4. ✅ ProjectsPage.jsx
5. ✅ Login.jsx
6. ⏳ TimeTrackingPage.jsx
7. ⏳ ProjectDetailPage.jsx
8. ⏳ InboxPage.jsx

### Media Priorità
9. ⏳ UserManagementPage.jsx
10. ⏳ CalendarPage.jsx
11. ⏳ GanttPage.jsx
12. ⏳ TemplateManagerPage.jsx

## 🔧 Trasformazione Modali

I modali mantengono la loro struttura ma aggiornano lo stile:

```jsx
// Header modale
<div className="bg-slate-900/70 backdrop-blur-xl border-b border-slate-700/50 px-6 py-4">
  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
    <Icon className="w-7 h-7 text-cyan-400" />
    Titolo Modale
  </h2>
</div>

// Body modale
<div className="bg-slate-900/50 backdrop-blur-xl p-6">
  {/* Contenuto */}
</div>

// Footer modale
<div className="bg-slate-900/70 backdrop-blur-xl border-t border-slate-700/50 px-6 py-4 flex justify-end gap-3">
  <Button className="bg-slate-800 hover:bg-slate-700 text-white">
    Annulla
  </Button>
  <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/50">
    Conferma
  </Button>
</div>
```

## 💡 Tips

1. **Consistenza**: Usa sempre gli stessi gradienti per lo stesso tipo di metrica
2. **Performance**: `GamingKPICard` è ottimizzato, usalo invece di codice custom
3. **Accessibilità**: Mantieni icone + testo per chiarezza
4. **Responsive**: I componenti gaming sono già responsive, non servono modifiche
5. **Animazioni**: Già incluse nei componenti, evita di aggiungerne altre

## 🚀 Workflow Suggerito

1. Apri una pagina
2. Copia il template base
3. Sposta la logica esistente nel template
4. Sostituisci le sezioni una alla volta
5. Testa visivamente
6. Passa alla prossima

**Tempo stimato per pagina**: 10-15 minuti
