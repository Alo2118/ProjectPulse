# UI/UX Enhancement Plan - Stile "Gestionale Strategico"

> Obiettivo: trasformare l'interfaccia da "gestionale piatto" a esperienza visiva immediata, ispirata a videogiochi strategici/manageriali. Ogni dato deve comunicare visivamente senza dover leggere.

## Stato attuale UI

**Già buono**: glassmorphism, dark mode, animazioni base (fade-in, slide-up, pulse-dot), sparkline in dashboard, animated counter, kanban DnD, toast con glow, status dots pulsanti.

**Piatto/da migliorare**: liste task/progetti sono righe di testo + badge, analytics usa barre CSS base, empty state minimali, nessun tree view, nessuna emoji/icona semantica nelle liste, nessuna progress bar nei progetti.

## File chiave da modificare

### CSS/Config
- `client/src/styles/index.css` — animazioni custom, classi utility
- `client/tailwind.config.js` — eventuali nuove animazioni/keyframes

### Componenti UI (client/src/components/ui/)
- `AnimatedCounter.tsx` — già esiste
- `SparklineChart.tsx` — già esiste (Recharts)
- `Toast.tsx` — già esiste
- **DA CREARE**: `ProgressBar.tsx`, `StatusIcon.tsx`, `TreeView.tsx`, `Tooltip.tsx`

### Pagine da aggiornare
- `client/src/pages/dipendente/DashboardPage.tsx` — stat card con XP bar, migliorare KPI
- `client/src/pages/tasks/TaskListPage.tsx` — icone status/priorità, progress inline, glow su bloccati
- `client/src/pages/projects/ProjectListPage.tsx` — progress bar animate, health indicator
- `client/src/pages/analytics/AnalyticsPage.tsx` — grafici più ricchi
- `client/src/pages/kanban/KanbanBoardPage.tsx` — card più visive

### Componenti feature
- `client/src/components/features/tasks/` — task card enhanced
- `client/src/components/features/projects/` — project card enhanced

---

## Piano interventi (in ordine di implementazione)

### Batch 1: Componenti base riutilizzabili

#### 1.1 StatusIcon component
File: `client/src/components/ui/StatusIcon.tsx`

Mappa ogni status/priorità a icona + emoji + colore:
```
Task Status:
  todo       → 📋 (clipboard) grigio
  in_progress → ⚡ (lightning) blu
  review     → 👁️ (eye) viola
  blocked    → 🚫 (blocked) rosso pulsante
  done       → ✅ (check) verde
  cancelled  → ❌ (x) grigio scuro

Task Priority:
  low        → 🟢 verde
  medium     → 🟡 ambra
  high       → 🟠 arancio
  critical   → 🔴 rosso pulsante + glow

Project Status:
  planning     → 📐 blueprint
  design       → 🎨 palette
  verification → 🔍 magnifier
  validation   → ✅ check
  transfer     → 🚀 rocket
  maintenance  → 🔧 wrench
  completed    → 🏆 trophy
  on_hold      → ⏸️ pause
  cancelled    → ❌ x

Risk Level (probability × impact):
  low    → 🟢 shield verde
  medium → 🟡 shield ambra
  high   → 🔴 shield rosso pulsante
```

Usare sia emoji sia icone Lucide, con fallback. Il componente accetta `type` ("taskStatus" | "taskPriority" | "projectStatus" | "riskLevel") e `value`.

#### 1.2 ProgressBar component
File: `client/src/components/ui/ProgressBar.tsx`

Props: `value` (0-100), `size` ("sm" | "md" | "lg"), `color` (auto da valore: verde >66%, ambra 33-66%, rosso <33%), `animated` (boolean), `showLabel` (boolean), `glow` (boolean).

Stile: bordi arrotondati, gradient fill, transizione CSS `width` con ease-out. Opzionale: glow pulsante quando < 20% (pericolo).

#### 1.3 TreeView component
File: `client/src/components/ui/TreeView.tsx`

Per task con subtask. Struttura:
- Linea verticale connettore (border-left)
- Linea orizzontale per ogni figlio (border-top su pseudo-element)
- Icona expand/collapse con rotazione animata (chevron)
- Indent crescente per livelli
- Animazione height su expand/collapse (max-height transition)

### Batch 2: Applicazione alle pagine principali

#### 2.1 Task List enhanced
File: `client/src/pages/tasks/TaskListPage.tsx`

Modifiche:
- Sostituire badge testo status con `<StatusIcon type="taskStatus" />` + label
- Sostituire badge testo priorità con `<StatusIcon type="taskPriority" />`
- Task `blocked`: riga con `bg-red-500/5 dark:bg-red-500/10` e bordo sinistro rosso pulsante
- Task con scadenza vicina (< 2 giorni): bordo ambra pulsante
- Task `done`: leggera opacità (0.7) per de-enfatizzare
- Hover su riga: slide-in di azioni rapide (cambia status, assegna)

#### 2.2 Project List enhanced
File: `client/src/pages/projects/ProjectListPage.tsx`

Modifiche:
- Aggiungere `<ProgressBar>` dentro ogni card (% task completati)
- `<StatusIcon type="projectStatus">` nell'header della card
- "Health indicator": pallino (verde/ambra/rosso) basato su: task bloccati, scadenze superate, % completamento
- Counter animato per numero task/rischi dentro la card
- Glow sul bordo proporzionale alla priorità

#### 2.3 Dashboard enhanced
File: `client/src/pages/dipendente/DashboardPage.tsx`

Modifiche:
- Stat card con icone più grandi e colorate, glow shadow corrispondente
- "Project health" mini-cards con ProgressBar + status icon
- Sezione "Attenzione richiesta" con task bloccati/scaduti evidenziati con pulse rosso/ambra
- Counter animati già presenti — aggiungere anche ai numeri secondari

#### 2.4 Kanban enhanced
File: `client/src/pages/kanban/KanbanBoardPage.tsx`

Modifiche:
- StatusIcon nel titolo di ogni colonna
- Card con bordo glow per priorità critical/high
- Emoji priorità visibile sulla card
- Contatore animato nel badge colonna

### Batch 3: Dettagli e polish

#### 3.1 Animazioni aggiuntive in index.css
- `animate-glow-red`: glow rosso pulsante per blocked/critical
- `animate-glow-amber`: glow ambra per warning/scadenza
- `animate-progress-fill`: fill da 0 a valore con ease-out
- `animate-expand`: max-height da 0 a auto per tree expand

#### 3.2 Empty state migliorati
Sostituire icona grigia + testo con illustrazioni emoji + messaggio motivazionale:
- Task vuoti: "🎯 Nessun task trovato. Crea il primo!"
- Progetti vuoti: "🚀 Nessun progetto. Lancia il primo!"
- Notifiche vuote: "🔔 Tutto tranquillo. Nessuna notifica."

#### 3.3 Tooltip ricchi
Hover su task/progetto → mini-card popup con: status, assignee, progress, scadenza. Usa `position: absolute` + `pointer-events` pattern.

---

## Dipendenze

- **Nessuna nuova libreria richiesta** — tutto con Tailwind + Lucide icons + emoji + CSS animations
- Recharts già installato per sparkline (eventualmente usare per grafici più ricchi in analytics)

## Verifica

Dopo ogni batch:
1. `npx tsc --noEmit` (server e client)
2. Verificare visual su browser (light + dark mode)
3. Verificare responsive (mobile + desktop)
4. Verificare che animazioni non causino jank (performance)

## Ordine di esecuzione consigliato

1. **Batch 1** (componenti base) → StatusIcon, ProgressBar, TreeView
2. **Batch 2.1** → Task List enhanced (impatto visivo maggiore)
3. **Batch 2.2** → Project List enhanced
4. **Batch 2.3** → Dashboard enhanced
5. **Batch 2.4** → Kanban enhanced
6. **Batch 3** → Polish, empty state, tooltip
