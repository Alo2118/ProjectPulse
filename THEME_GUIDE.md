# 🎨 Guida Tema Professionale Light - ProjectPulse

## Overview
Tema professionale light design per l'app ProjectPulse. Basato su Tailwind CSS con colori custom Mikai e componenti Gaming standardizzati.

---

## 📐 Struttura Tema

### Colori Primari (Tailwind Config)
```javascript
// Primary: Blu Mikai (professionale, affidabile)
primary: {
  50: '#e3f2fd',
  100: '#bbdefb',
  200: '#90caf9',
  300: '#64b5f6',
  400: '#42a5f5',
  500: '#3296dc',
  600: '#1e88e5',  // Principale
  700: '#1976d2',
  800: '#1565c0',
  900: '#0d47a1',
}

// Secondary: Grigio freddo (neutro, supporto)
secondary: {
  600: '#546e7a',
  700: '#455a64',
}

// Success/Warning/Danger per status
success: { 600: '#16a34a', 700: '#15803d' }
warning: { 600: '#eab308' }
danger: { 600: '#dc2626', 700: '#b91c1c' }
```

### Palette Stato Task
- **Completato**: `emerald-600/700` (#16a34a)
- **In Progress**: `blue-600/700` (#1e88e5)
- **Bloccato**: `red-600/700` (#dc2626)
- **In Attesa**: `yellow-600/700` (#eab308)
- **Todo**: `slate-500/600` (#64748b)

---

## 🎯 Componenti Gaming Standardizzati

### 1. GamingLayout
**Uso**: Wrapper principale di ogni pagina
```jsx
<GamingLayout>
  {/* Contenuto pagina */}
</GamingLayout>
```

**Stile**:
- Background: `bg-gradient-to-br from-slate-50 via-white to-slate-50`
- Padding: `p-6`
- Max-width: `max-w-7xl mx-auto`

### 2. GamingHeader
**Uso**: Header pagina con titolo, subtitle, icona e azioni
```jsx
<GamingHeader
  title="Titolo Pagina"
  subtitle="Sottotitolo descrittivo"
  icon={IconName}
  actions={<Button>Azione</Button>}
/>
```

**Stile**:
- Titolo: `text-3xl font-bold text-slate-900`
- Icona: `w-8 h-8 text-primary-600`
- Subtitle: `text-base text-slate-600 font-medium`
- Gap: `gap-2` tra elementi

### 3. GamingCard
**Uso**: Container secondario per sezioni
```jsx
<GamingCard className="optional-extra-classes">
  {/* Contenuto */}
</GamingCard>
```

**Stile**:
- Background: `bg-white`
- Border: `border-2 border-slate-200`
- Padding: `p-6`
- Shadow: `shadow-md hover:shadow-xl transition-all`
- Radius: `rounded-lg`

### 4. GamingKPICard
**Uso**: Metric card per dashboard
```jsx
<GamingKPIGrid columns={4}>
  <GamingKPICard
    title="Titolo Metrica"
    value={123}
    icon={IconName}
    gradient="from-primary-600 to-primary-700"
    shadowColor="primary"
  />
</GamingKPIGrid>
```

**Stile**:
- Gradient background con tema colore
- Icona: `w-8 h-8`, white text
- Value: `text-2xl font-bold text-white`
- Title: `text-xs font-medium` con color tema
- Shadow: `shadow-xl shadow-[color]-600/50`

---

## 🎨 Regole Stilistiche

### Typography
| Elemento | Stile |
|----------|-------|
| Titoli pagina | `text-3xl font-bold text-slate-900` |
| Titoli sezione | `text-xl font-bold text-slate-900` |
| Sottotitoli | `text-base text-slate-600 font-medium` |
| Testo corpo | `text-sm text-slate-700` |
| Testo muted | `text-xs text-slate-600 font-medium` |

### Spacing
| Elemento | Valore |
|----------|--------|
| Gap tra KPI Cards | `gap-4` |
| Margin sezioni | `mb-6` |
| Padding card | `p-6` |
| Padding interno | `p-4` o `p-3` |

### Borders
| Elemento | Stile |
|----------|-------|
| Card principale | `border-2 border-slate-200` |
| Card secondaria | `border-2 border-slate-200` |
| Divider | `border-t-2 border-slate-200` |
| Focus input | `border-primary-500` |

### Shadows
| Elemento | Stile |
|----------|-------|
| Card default | `shadow-md` |
| Card hover | `hover:shadow-xl` |
| Button | `shadow-xl` |
| Button hover | `hover:shadow-2xl` |
| KPI Card | `shadow-xl shadow-[color]-600/50` |

---

## 🔘 Componenti Ricorrenti

### Buttons
```jsx
// Primary Button (Azione principale)
<button className="px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-lg font-bold shadow-xl hover:shadow-2xl transition-all">
  Azione Principale
</button>

// Secondary Button (Azione secondaria)
<button className="px-4 py-2 bg-white border-2 border-primary-300 hover:bg-primary-50 hover:border-primary-400 text-primary-700 rounded-lg font-bold transition-all shadow-sm hover:shadow-md">
  Azione Secondaria
</button>

// Neutral Button
<button className="px-4 py-2 bg-white border-2 border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-700 rounded-lg font-bold transition-all shadow-sm hover:shadow-md">
  Azione Neutra
</button>
```

### Progress Bar
```jsx
<div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden shadow-inner border-2 border-primary-300">
  <div
    className="bg-gradient-to-r from-primary-600 to-primary-500 h-4 rounded-full transition-all duration-1000 relative shadow-sm"
    style={{ width: `${percentage}%` }}
  >
    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
  </div>
</div>
```

### Status Badge
```jsx
// Completato
<span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 border-2 border-emerald-300 rounded-full text-xs font-bold">
  Completato
</span>

// In Progress
<span className="px-2 py-0.5 bg-blue-100 text-blue-700 border-2 border-blue-300 rounded-full text-xs font-bold">
  In Corso
</span>

// Bloccato
<span className="px-2 py-0.5 bg-red-100 text-red-700 border-2 border-red-300 rounded-full text-xs font-bold">
  Bloccato
</span>
```

### Info/Alert Box
```jsx
// Success
<div className="bg-emerald-50 border-2 border-emerald-300 rounded-lg p-4 flex items-start gap-3">
  <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
  <div>
    <p className="font-bold text-emerald-900">Titolo</p>
    <p className="text-sm text-emerald-700 font-medium mt-1">Messaggio</p>
  </div>
</div>

// Warning
<div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 flex items-start gap-3">
  {/* Simile a success con colori yellow */}
</div>

// Error
<div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 flex items-start gap-3">
  {/* Simile a success con colori red */}
</div>
```

---

## 📄 Pattern Pagine

### Layout Standard
```jsx
<GamingLayout>
  {/* Header con azioni */}
  <GamingHeader
    title="Titolo"
    subtitle="Sottotitolo"
    icon={IconName}
    actions={<Button>Azione</Button>}
  />

  {/* KPI Grid (se dashboard) */}
  <GamingKPIGrid columns={4} className="mb-6">
    <GamingKPICard ... />
    <GamingKPICard ... />
    <GamingKPICard ... />
    <GamingKPICard ... />
  </GamingKPIGrid>

  {/* Filtri (se necessari) */}
  <GamingCard className="mb-6">
    {/* Filtri */}
  </GamingCard>

  {/* Contenuto principale */}
  <GamingCard>
    {/* Contenuto */}
  </GamingCard>

  {/* Sezioni aggiuntive */}
  <div className="space-y-6">
    <GamingCard>
      <h2 className="text-xl font-bold text-slate-900 mb-4">Sezione</h2>
      {/* Contenuto */}
    </GamingCard>
  </div>

  {/* Modali/Dialoghi */}
  {showModal && <Modal ... />}
</GamingLayout>
```

---

## ✅ Checklist Implementazione

- [ ] Pagina usa `<GamingLayout>` come wrapper
- [ ] Header usa `<GamingHeader>` con icon, title, subtitle, actions
- [ ] KPI/Metrics usano `<GamingKPICard>` dentro `<GamingKPIGrid>`
- [ ] Card secondarie usano `<GamingCard>`
- [ ] Bottoni rispettano palette (primary/secondary/neutral)
- [ ] Status badge usano colori coerenti (emerald/blue/red/yellow)
- [ ] Tutti i testi seguono typography guide
- [ ] Spacing coerente (gap-4, mb-6, p-6, etc)
- [ ] Borders sono `border-2` con colori slate-200
- [ ] Shadows rispettano regole (shadow-md → shadow-xl)
- [ ] Input/form usano `border-2 border-slate-300`
- [ ] Hover effects sono smooth con `transition-all`

---

## 🎯 Pagine Completate
✅ ReportsPage
✅ DipendenteDashboard
✅ DirezioneDashboard
✅ ProjectsPage
✅ GanttPage
✅ GanttChart (component)
✅ ProjectDetailPage (parziale)

## 🔄 Pagine da Completare
⏳ CalendarPage
⏳ TimeTrackingPage
⏳ InboxPage
⏳ UserManagementPage
⏳ TemplateManagerPage
⏳ Login (refresh)

---

## 💡 Best Practices

1. **Usa il tema tailwind**: Non hardcodare colori, usa `primary-600`, `slate-200`, etc
2. **Riutilizza componenti Gaming**: Non creare div custom
3. **Mantieni coerenza**: Tutti i titoli same size, tutti i card same padding
4. **Border-2 sempre**: Non usare `border` singolo
5. **Font-bold per CTA**: Bottoni e titoli importanti
6. **Transition-all**: Su hover degli elementi interattivi
7. **Rispetta spacing**: Usa `gap-4`, `mb-6`, `p-6` standard

---

## 📝 Modello Pagina Completa

```jsx
import { useState, useEffect } from 'react';
import { IconName } from 'lucide-react';
import { GamingLayout, GamingHeader, GamingCard, GamingKPICard, GamingKPIGrid } from '../components/ui';

export default function PageName() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Load data
  };

  return (
    <GamingLayout>
      <GamingHeader
        title="Titolo Pagina"
        subtitle="Descrizione"
        icon={IconName}
        actions={<button className="...">Azione</button>}
      />

      {loading ? (
        <div>Caricamento...</div>
      ) : (
        <>
          <GamingKPIGrid columns={4} className="mb-6">
            <GamingKPICard title="..." value={...} icon={...} gradient="from-primary-600 to-primary-700" shadowColor="primary" />
          </GamingKPIGrid>

          <GamingCard>
            {/* Contenuto principale */}
          </GamingCard>
        </>
      )}
    </GamingLayout>
  );
}
```

---

**Versione**: 1.0
**Data**: Gennaio 2026
**Team**: ProjectPulse Design System
