# ProjectPulse — UX Redesign "JARVIS"

> Revisione radicale di UI/UX: semplificare leggibilità e reperibilità dei dati per tutti i profili, con estetica tech JARVIS.

**Data**: 2026-02-25
**Approccio**: Clean Workspace + Progressive Disclosure + JARVIS Potenziato

---

## 1. Principi guida

1. **3 secondi**: l'utente deve capire se c'è qualcosa che richiede attenzione in 3 secondi
2. **Nomi, mai codici**: ovunque si mostra un progetto, si usa il nome leggibile
3. **Progressive disclosure**: i dati essenziali sono visibili, quelli secondari a un click di distanza
4. **Consistenza**: tutte le liste, dettagli e form seguono lo stesso pattern
5. **JARVIS raffinato**: estetica tech/HUD con molte animazioni, senza sacrificare la leggibilità

---

## 2. Design System "JARVIS"

### 2.1 Palette colori

**Dark mode (default)**:

| Token | Valore | Uso |
|-------|--------|-----|
| `--bg-page` | `slate-950` (#020617) | Sfondo pagina |
| `--bg-card` | `slate-900/70` + `backdrop-blur-sm` | Card e pannelli |
| `--bg-card-hover` | `slate-800/60` | Card hover |
| `--bg-sidebar` | `slate-950/90` + `backdrop-blur-md` | Sidebar |
| `--bg-header` | `slate-950/80` + `backdrop-blur-md` | Header |
| `--primary` | `cyan-500` (#06b6d4) | Accento primario, link, azioni |
| `--primary-hover` | `cyan-400` (#22d3ee) | Hover su primario |
| `--secondary` | `indigo-500` (#6366f1) | Accento secondario, dati |
| `--text-primary` | `slate-100` (#f1f5f9) | Testo principale |
| `--text-secondary` | `cyan-300/60` | Testo secondario, label |
| `--text-muted` | `slate-400` (#94a3b8) | Testo terziario |
| `--border` | `cyan-500/10` | Bordi standard |
| `--border-hover` | `cyan-500/20` | Bordi hover |
| `--border-active` | `cyan-500/40` | Bordi focus/attivi |
| `--success` | `emerald-400` (#34d399) | OK, completato |
| `--warning` | `amber-400` (#fbbf24) | Attenzione, a rischio |
| `--danger` | `red-400` (#f87171) | Critico, errore |
| `--info` | `cyan-400` (#22d3ee) | Info, in corso |

**Light mode ("JARVIS diurno")**:

| Token | Valore | Uso |
|-------|--------|-----|
| `--bg-page` | `slate-50` (#f8fafc) | Sfondo |
| `--bg-card` | `white` | Card |
| `--primary` | `cyan-600` (#0891b2) | Accento (leggermente più scuro per contrasto) |
| `--border` | `slate-200` | Bordi |
| `--text-primary` | `slate-900` | Testo |
| Glow | Intensità dimezzata | Tutti gli effetti glow |

### 2.2 Tipografia

| Elemento | Font | Classe |
|----------|------|--------|
| UI generale | Inter | `font-sans` |
| Numeri, KPI, timer | JetBrains Mono | `font-mono` |
| Titolo pagina | Inter | `text-2xl font-semibold tracking-tight` |
| Sottotitolo | Inter | `text-base text-slate-400` |
| Body liste | Inter | `text-sm` |
| Body contenuti | Inter | `text-base` |
| Label metadati | Inter | `text-xs uppercase tracking-widest text-cyan-500/50 font-medium` |
| KPI numeri | JetBrains Mono | `font-mono text-3xl font-bold text-cyan-400` con text-shadow |
| Timer | JetBrains Mono | `font-mono text-2xl tabular-nums` |

### 2.3 Background pattern

```css
.bg-grid-pattern {
  background-image:
    linear-gradient(rgba(6,182,212,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(6,182,212,0.03) 1px, transparent 1px);
  background-size: 40px 40px;
}
```

Griglia tech quasi invisibile sullo sfondo pagina.

### 2.4 Glow effects

```css
.glow-cyan    { box-shadow: 0 0 30px rgba(6,182,212,0.15); }
.glow-cyan-lg { box-shadow: 0 0 40px rgba(6,182,212,0.2); }
.glow-red     { box-shadow: 0 0 20px rgba(239,68,68,0.3); }
.glow-text    { text-shadow: 0 0 20px rgba(6,182,212,0.4); }
.glow-btn     { box-shadow: 0 0 20px rgba(6,182,212,0.25); }
.glow-input   { box-shadow: 0 0 15px rgba(6,182,212,0.2); }
```

### 2.5 HUD corner decorations (solo card KPI e alert)

```css
.hud-corners::before,
.hud-corners::after {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  border-color: rgba(6,182,212,0.3);
}
.hud-corners::before {
  top: -1px; left: -1px;
  border-top: 2px solid;
  border-left: 2px solid;
}
.hud-corners::after {
  bottom: -1px; right: -1px;
  border-bottom: 2px solid;
  border-right: 2px solid;
}
```

### 2.6 Spacing

- Tra sezioni pagina: `space-y-6` (più respiro del `space-y-4` attuale)
- Tra righe lista: `space-y-1`
- Padding card: `p-5`
- Padding pagina: `p-6` (fornito da DashboardLayout, invariato)

---

## 3. Animazioni tech

### 3.1 Catalogo animazioni

| Nome | Keyframe | Durata | Uso |
|------|----------|--------|-----|
| `counter-up` | opacity 0→1, translateY 10→0, count 0→N | 600ms | KPI numeri al primo render |
| `scan-line` | translateY -100%→100%, opacity pulse | 1.5s loop | Skeleton loading |
| `fade-in-stagger` | opacity 0→1, translateY 8→0 | 200ms, delay 30ms/item | Righe lista |
| `glow-pulse` | box-shadow intensity oscillation | 2s loop | Timer attivo, status pulsanti |
| `border-trace` | border-color sweep around 4 sides | 1.5s | Card KPI al hover |
| `data-reveal` | width 0→N% | 800ms ease-out | Barre progresso al primo render |
| `page-enter` | opacity 0→1, translateX 20→0 | 150ms | Transizione tra pagine |
| `section-reveal` | opacity 0→1, translateY 12→0 | 250ms, stagger 100ms | Sezioni pagina |
| `card-power-on` | opacity 0→1, scale 0.95→1, glow 0→full | 300ms, stagger 100ms | Card KPI prima visita |
| `row-flash` | bg cyan/10 → transparent | 500ms | Nuova riga real-time (socket) |
| `status-morph` | color transition + scale pulse | 300ms | Cambio stato task |
| `timer-tick` | opacity pulse on ":" separator | 1s loop | Contatore timer |
| `badge-bounce` | scale 1→1.3→1, elastic | 400ms | Badge notifica incremento |
| `tooltip-origin` | scale 0.9→1, opacity 0→1, from origin point | 150ms | Dropdown/tooltip apertura |
| `breadcrumb-slide` | translateX slide-out/slide-in | 200ms | Navigazione breadcrumb |
| `skeleton-dissolve` | skeleton → real content crossfade | 300ms | Fine loading |
| `alert-border-pulse` | border-left-color intensity oscillation | 3s loop | Alert "Richiede attenzione" |
| `sidebar-glow` | border-left glow from center outward | 200ms | Sidebar item hover |
| `progress-update` | width old→new, ease-out | 500ms | Aggiornamento progresso |

### 3.2 Regole per le animazioni

- **Rispettare `prefers-reduced-motion`**: se attivo, tutte le animazioni → fade semplice 150ms
- **Solo al primo render**: counter-up, data-reveal, card-power-on non si ripetono a ogni scroll
- **No jank**: usare `transform` e `opacity` (GPU-accelerated), mai `width`/`height`/`top`/`left`
- **Durate brevi**: max 800ms per animazioni singole, loop solo per indicatori di stato

---

## 4. Navigazione

### 4.1 Sidebar ridisegnata

**Struttura** (larghezza 240px):

```
Logo "ProjectPulse" (testo cyan, icona geometrica)
──────────────────── border-b border-cyan-500/10
Search input (glow su focus)
────────────────────
La Mia Giornata        (Sun)
Dashboard              (LayoutDashboard)
Progetti               (FolderKanban)
Task                   (CheckSquare)
Calendario             (CalendarDays)
Tempo                  (Clock)       ← unifica registra + team
────────────────────
▸ Gestione             (collassabile)
  Segnalazioni         (MessageSquarePlus)
  Rischi               (AlertTriangle)
  Documenti            (FileText)
▸ Analisi              (collassabile)
  Pianificazione       (BrainCircuit)
  Analytics            (BarChart3)
  Report Settimanale   (ClipboardList)
▸ Amministrazione      (collassabile, admin only)
  Utenti, Reparti, Template, Campi Custom,
  Import/Export, Workflow, Automazioni, Audit
────────────────────
Notifiche          [3] (Bell + badge)
────────────────────
Avatar + Nome + Ruolo  (link a profilo)
```

**Voci rimosse dalla sidebar**:
- Kanban → diventa vista dentro pagina Task
- Gantt → diventa vista dentro pagina Task

**Comportamenti**:
- Sezioni collassabili ricordano lo stato in localStorage
- Voce attiva: `bg-cyan-500/10 border-l-2 border-cyan-500` + glow
- Hover: `bg-cyan-500/5` + animazione glow sidebar
- Mobile: drawer overlay con backdrop blur
- Badge notifiche con animazione bounce-in al cambiamento

### 4.2 Header minimale

```
[Breadcrumb: Progetti > Nome Progetto > Task]    [⏱ Timer]    [🌓 Tema]
```

- Sinistra: breadcrumb con nomi leggibili (animazione slide al cambio)
- Centro: timer in corso (se attivo) — compatto, pulsante rosso
- Destra: solo toggle dark/light
- Search, notifiche, profilo → in sidebar (non più nell'header)
- Sticky, `bg-slate-950/80 backdrop-blur-md border-b border-cyan-500/10`

---

## 5. Dashboard

### 5.1 Dashboard Direzione/Admin

Layout verticale, 3 zone:

**Zona 1 — Header + KPI (4 card in riga)**:
- Saluto: "Buongiorno, Marco." + data corrente
- 4 KPI card con animazione `card-power-on` stagger:
  - Progetti attivi (cyan) — conteggio `font-mono text-3xl`
  - A rischio (ambra) — clickabile per filtrare
  - Critici (rosso) — clickabile, glow rosso se > 0
  - Utilizzo team % (indigo)
- Ogni card: HUD corners, trend indicator (▲/▼ vs settimana scorsa)

**Zona 2 — "Richiede attenzione"** (auto-hide):
- Lista alert con `alert-border-pulse` sul bordo sinistro
- Ogni riga: icona stato + **nome progetto** + descrizione problema
- Click → naviga alla risorsa
- Max 5 visibili, "Mostra tutti (N)" se più
- Sparisce completamente se zero problemi

**Zona 3 — Tabella progetti**:
- Tabella compatta: Nome | Stato (semaforo) | Progresso (barra) | Scadenza
- Ordinata per urgenza
- Header tabella: `text-xs uppercase tracking-widest text-cyan-500/50`
- Righe alternate: `bg-slate-900` / `bg-slate-900/50`
- Animazione `fade-in-stagger` al primo load

**Rimossi**:
- DeliveryOutlookSection → spostato in Analytics
- TeamPerformanceSection → spostato in Analytics
- Widget customizer (DashboardCustomizer)
- Grafici chart nel dashboard

### 5.2 Dashboard Dipendente

Layout verticale, 4 zone:

**Zona 1 — Header contestuale**:
- Saluto + ore loggate oggi / obiettivo (inline)
- Animazione typing effect sul saluto (opzionale)

**Zona 2 — "Oggi"**:
- Task con scadenza oggi o in ritardo, ordinati per priorità
- Ogni riga: pallino priorità | nome task | nome progetto (grigio) | pulsante timer
- Task ricorrenti: icona 🔄 accanto al nome
- Animazione `fade-in-stagger`

**Zona 3 — "Prossimi giorni"**:
- Task nei prossimi 3-5 giorni
- Stessa struttura ma con data scadenza invece del timer
- Task ricorrenti con icona

**Zona 4 — Timer attivo** (se in corso):
- Card prominente: nome task + contatore `font-mono text-2xl` + pulsante stop
- Animazione `glow-pulse` cyan
- `timer-tick` sui separatori ":"
- Se nessun timer → zona nascosta

**Zona 5 — Riepilogo settimana** (compatto, 1 riga):
- Mini barre ore per giorno (Lun-Ven) + totale / obiettivo
- Animazione `data-reveal` sulle barre

**Rimossi**:
- AttentionSection separata (alert integrati nella lista task)
- Task "Senza scadenza" (lista completa in pagina Task)
- Widget customizer

---

## 6. Pagine Lista

### 6.1 Pattern comune

Tutte le pagine lista seguono la stessa struttura:

```
Titolo pagina                              [+ Nuovo X]
[🔍 Cerca...]  [Filtro 1 ▾]  [Filtro 2 ▾]  [▸ Più filtri]

Contenuto (tabella o lista raggruppata)

[Floating bar azioni bulk — se selezione attiva]
```

**Regole**:
- Header: titolo + pulsante azione primaria a destra
- Filtri: 1 riga, search + 2-3 dropdown essenziali, "Più filtri" per il resto
- Saved views: dropdown a destra della barra filtri (non barra dedicata)
- Contenuto: tabella compatta o lista raggruppata per stato
- **Nomi progetto** sempre, mai codici
- Hover rivela azioni contestuali (timer, checkbox, edit)
- Empty state: icona grande + titolo + CTA
- Animazione `fade-in-stagger` sulle righe
- Animazione `row-flash` per nuove righe real-time

### 6.2 Task List

**Filtri**: Search + Stato + Progetto + Assegnato a. "Più filtri": Priorità, Reparto, Advanced filter builder.

**View switcher** (sotto filtri):
- ☰ Lista (default) | ▦ Kanban | 📊 Gantt | 📅 Calendario | 🌲 Albero

Kanban e Gantt non sono più pagine separate nella sidebar — sono viste della stessa pagina Task.

**Vista Lista** (default):
- QuickAddTask in cima (inline, dashed border)
- Raggruppata per stato: Ricorrenti / In Corso / Da Fare / In Revisione / Bloccati / Completati (chiuso default)
- Header gruppo: dot colorato + label + conteggio
- Riga task: `[priorità] [🔄?] [nome task]   [nome progetto]  [avatar]  [scadenza]`
  - 🔄 = icona ricorrente se applicabile
  - Nome progetto in `text-slate-400`
  - Scadenza: rosso se scaduta, ambra se entro 3gg
  - Timer e checkbox appaiono al hover
  - Tutti i campi inline-editable

**Floating bar** bulk: conteggio selezione + cambia stato + cambia priorità + elimina

### 6.3 Progetto List

Da card grid a **tabella compatta**:
- Colonne: Nome (mai codice) | Stato (semaforo + testo) | Progresso (barra) | Scadenza
- Click riga → dettaglio
- Filtri: Search + Stato + Priorità

### 6.4 Altre liste (Rischi, Documenti, Segnalazioni)

Stesso pattern: header + filtri compatti + tabella.

---

## 7. Pagine Dettaglio

### 7.1 Pattern comune

Layout a **2 colonne**: contenuto (2/3) + metadati sidebar (1/3).

**Niente tab** — tutto scrollabile verticalmente o in sezioni collassabili.

Breadcrumb in alto con **nomi leggibili** (mai codici).

Mobile: sidebar si sposta sotto il contenuto.

### 7.2 Task Detail

**Colonna sinistra** (scrollabile):
1. Titolo + badge priorità (inline edit)
2. Workflow stepper (step orizzontale compatto)
3. Descrizione (espandibile)
4. Checklist (se presente) — progresso inline
5. Subtask — lista figli con stato
6. Commenti — thread cronologico + campo input

**Colonna destra** (metadati sidebar, tutti inline-editable):
- Stato (dropdown)
- Priorità (dropdown)
- Assegnato a (user select)
- Progetto (nome, mai codice)
- Scadenza (date picker)
- Ore loggate / stimate (barra progresso)
- Ricorrenza (🔄 icona + frequenza, se attiva)
- Tag
- Reparto
- Custom fields
- Pulsante timer (▶ Avvia / ■ Ferma)
- Allegati (conteggio, collassabile)
- Note (conteggio, collassabile)
- Attività recente (ultime 5 voci, collassabile)

### 7.3 Progetto Detail

**Colonna sinistra**:
1. Nome + descrizione
2. Riepilogo progresso (barra + conteggi inline: completati / in corso / bloccati)
3. TaskTreeView compatto (milestone → task → subtask)
4. Commenti

**Colonna destra**:
- Stato, Priorità, Owner
- Date (inizio → fine)
- Budget (speso / totale + barra)
- Membri (lista compatta + pulsante Invita)
- Allegati, Note (collassabili)
- Link rapidi (Rischi, Documenti, Tempo, Gantt)

### 7.4 Rischio Detail, Documento Detail

Stesso layout 2 colonne. Contenuto specifico a sinistra, metadati a destra.

---

## 8. Forms

### 8.1 Pattern

- Campi essenziali sempre visibili (Nome, Progetto, Tipo, Assegnato, Priorità, Scadenza, Ore, Descrizione)
- Campi secondari in **"Opzioni avanzate"** collassabile (Tag, Reparto, Task padre, Custom fields, Ricorrenza)
- Layout a 2 colonne per campi corti
- Dropdown progetto mostra **nomi** con search
- Validazione inline sotto ogni campo
- Input style: `bg-slate-800/50 border border-cyan-500/20`, focus: `border-cyan-500/40 glow-input`

### 8.2 Bottoni

- **Primario**: `bg-cyan-600 hover:bg-cyan-500 glow-btn`
- **Secondario**: `bg-transparent border border-cyan-500/30 hover:border-cyan-500/60`
- **Distruttivo**: `bg-red-600/80 hover:bg-red-500` con glow rosso
- **Icon button**: `hover:bg-cyan-500/10 rounded-lg`

---

## 9. Modali

- Overlay: `bg-black/60 backdrop-blur-sm`
- Panel: `bg-slate-900 border border-cyan-500/20 rounded-xl`
- Animazione: `tooltip-origin` (scale from trigger point, 150ms)
- Header: titolo + X chiusura
- Footer: bottoni allineati a destra
- Dimensioni: `max-w-md` (conferme), `max-w-lg` (form), `max-w-2xl` (complessi)
- Conferme eliminazione: nome elemento nel testo + menzione undo 5s

---

## 10. Toast

- Posizione: bottom-right
- Style: `bg-slate-800 border border-cyan-500/20 rounded-lg`
- Icona colorata + testo, niente bordi laterali colorati
- Toast undo: barra progresso lineare cyan in basso + "Annulla" cliccabile
- Max 3 visibili

---

## 11. Loading & Empty States

**Loading**: Skeleton con animazione `scan-line` (linea luminosa che scorre) → dissolve in dati reali con `skeleton-dissolve`

**Empty state**:
```
[Icona grande, opacità 30%]
Titolo (es. "Nessun task")
Sottotitolo (es. "Crea il primo task...")
[+ CTA button]
```

---

## 12. Componenti rimossi/spostati

| Componente | Azione |
|-----------|--------|
| KanbanBoardPage (pagina separata) | Diventa vista in TaskList |
| GanttPage (pagina separata) | Diventa vista in TaskList |
| DashboardCustomizer | Rimosso — layout fisso per ruolo |
| DeliveryOutlookSection | Spostato in AnalyticsPage |
| TeamPerformanceSection (da dashboard) | Spostato in AnalyticsPage |
| Stat pills (TaskList) | Rimossi — conteggi nei header gruppo |
| SavedViewsBar (barra dedicata) | Diventa dropdown |
| Glassmorphism classes (.card, .modal-panel) | Sostituiti con stile JARVIS solido/semi-trasparente |
| Tab nei dettaglio (TabSection) | Sostituiti con sezioni scrollabili/collassabili |

---

## 13. Vincoli non modificati

- Backend: nessuna modifica richiesta (tranne eventuale endpoint per "nomi progetto" nei breadcrumb)
- Routing: aggiungere `/tasks?view=kanban`, `/tasks?view=gantt`; rimuovere `/kanban`, `/gantt` come rotte separate (redirect)
- Store: nessuna modifica strutturale, solo adattamenti UI
- Logica business: invariata
- Auth/ruoli: invariati
- Socket.io: invariato (le animazioni real-time usano gli eventi esistenti)
