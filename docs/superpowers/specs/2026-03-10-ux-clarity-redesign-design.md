# UX Clarity Redesign — Design Spec

> **Data**: 2026-03-10
> **Stato**: Approvato
> **Problema**: L'app mostra dati piatti (righe tabella senza contesto visivo), la navigazione è opaca (non sai dove ti porta un click), e le pagine sono isole scollegate tra loro.

---

## Obiettivo

Trasformare ProjectPulse da "raccolta di tabelle" a "cruscotto operativo connesso" dove:
1. Ogni pagina comunica stato, urgenza e problemi **a colpo d'occhio**
2. La navigazione è **prevedibile** — sai sempre dove sei, dove vai, e come tornare
3. Le pagine sono **connesse** — dal progetto ai task ai rischi alle ore, con flusso logico

---

## Sezione 1: HomePage — Cruscotto Operativo

La homepage diventa il centro di comando dell'utente.

### Layout: 3 fasce orizzontali

**Fascia 1 — KPI Strip (4 card + Timer)**

5 card compatte in riga orizzontale:

| Card | Contenuto | Dettagli |
|------|-----------|----------|
| Progetti Attivi | Conteggio + trend vs settimana precedente (▲▼) + mini progress bar | Click → `/projects` |
| Task Aperti | Conteggio + trend + mini progress bar | Click → `/tasks` |
| Ore Settimana | Totale + trend + mini progress bar | Click → `/time-tracking` |
| Rischi Aperti | Conteggio + indicatore critici (●●●○○) | Click → `/risks` |
| Timer | Se attivo: nome task troncato + tempo live + stop. Se inattivo: "Nessun timer" + play. Sotto: "Oggi: Xh Ym" (somma ore giornata) | Click nome task → dettaglio task |

**Fascia 2 — Attenzione Richiesta**

Lista di alert cliccabili, ordinati per urgenza:
- Task bloccati (con nome progetto)
- Scadenze entro 24h
- Rischi critici aperti
- Documenti in stato "review" da troppo

Ogni riga mostra: icona tipo + conteggio + descrizione + nome progetto → click naviga al dettaglio.

Se non c'è nulla: messaggio positivo "Tutto sotto controllo".

**Fascia 3 — Due colonne**

| Colonna sinistra: I Miei Task Oggi | Colonna destra: Attività Recente |
|-------------------------------------|----------------------------------|
| Task assegnati all'utente con scadenza oggi o in_progress | Ultimi 10 eventi (cambi stato, commenti, nuovi rischi) |
| Checkbox + nome + bottone timer inline | Timestamp relativo + descrizione + link |
| Click → dettaglio task | Click → dettaglio entità |

### Role-based

- **Dipendente**: vede solo i propri task/ore
- **Direzione/Admin**: vede tutto

### API necessarie

- `GET /api/dashboard/stats` — KPI aggregati con trend
- `GET /api/dashboard/attention` — entità che richiedono attenzione
- `GET /api/activities/recent` — feed attività (o da audit log)
- `GET /api/time-entries/today-total` — somma ore giornata

---

## Sezione 2: Liste — Card Ricche, Raggruppate per Stato

### Principio: "Scansione visiva in 2 secondi"

Ogni riga comunica 3 cose a colpo d'occhio:
1. **A che punto siamo** (progress)
2. **C'è un problema?** (indicatori di allarme)
3. **Quanto è urgente?** (scadenza + colore)

### Raggruppamento per stato

Le righe sono organizzate sotto header di gruppo. L'ordine segue la priorità di attenzione:

**Progetti**: Bloccato → In ritardo → In corso → In revisione → Non iniziato → Completato
**Task**: Bloccato → In corso → In revisione → Non iniziato → 🔄 Ricorrenti attive → Completato
**Rischi**: Critici (>15) → Alti (10-15) → Medi (5-9) → Bassi (<5) → Mitigati/Chiusi

Regole:
- Ogni header: status dot + label + conteggio
- "Completato", "Non iniziato", "Bassi/Mitigati" collassati di default
- Stato collapsed/expanded persistito in localStorage

### Riga Progetto

```
┌──────────────────────────────────────────────────────────────┐
│ ◐ 65%  Sistema Monitoraggio Biomedico   ⚠2 🔴1    15 Apr → │
│         Marco R. · Alta                  rischi bloccati ⏰3gg│
│         ████████████░░░░░░░░                                 │
└──────────────────────────────────────────────────────────────┘
```

Elementi:
- Progress ring a sinistra (verde >70%, amber 30-70%, rosso <30%)
- Contatori problemi: `⚠N` rischi, `🔴N` task bloccati (solo se >0)
- Scadenza con urgenza colore: verde >7gg, amber 3-7gg, rosso <3gg, rosso pulsante se scaduto
- Progress bar sotto il titolo
- Freccia → a destra (affordance cliccabile)
- **Niente codici** — solo nomi leggibili

### Riga Task (normale)

```
┌──────────────────────────────────────────────────────────────┐
│ ● In corso  Calibrazione sensori pressione  💬3 ✓2/5    → │
│             Sistema Monitoraggio · Sara B.          ⏰1gg   │
│             ████████░░░░░░░░░░  Alta · Subtask 2/5          │
└──────────────────────────────────────────────────────────────┘
```

Elementi:
- Status dot colorato grande
- Nome progetto padre in muted, cliccabile → naviga al progetto
- Indicatori inline: 💬 commenti, ✓ checklist progress
- Subtask progress con mini-bar
- Se bloccato: motivo blocco visibile direttamente in riga (3a linea) + `bg-destructive/5`

### Riga Task Ricorrente

```
┌──────────────────────────────────────────────────────────────┐
│ 🔄 Rilascio certificati                   2x/sett  💬1  → │
│    Nessun progetto · Sara B.               Ultima: 2gg fa  │
└──────────────────────────────────────────────────────────────┘
```

Task ricorrenti = attività operative di routine, spesso scollegate dai progetti (es. "rilascio certificati", "taratura strumenti"). Differenze:
- **Niente progress bar** — ciclica, non ha inizio/fine
- **Niente scadenza** — si ripete, non scade
- **Frequenza** al posto della scadenza: "2x/sett", "Mensile", "Ogni lunedì"
- **"Ultima: Xgg fa"** — quando è stata eseguita l'ultima volta
- Se "Ultima" è troppo vecchia rispetto alla frequenza → `text-warning`
- **Gruppo proprio** "🔄 Ricorrenti attive" dopo "In corso", prima di "Non iniziato"

### Riga Rischio

```
┌──────────────────────────────────────────────────────────────┐
│ 🔴 P4×I5  Ritardo fornitore sensori       Score 20      → │
│            Sistema Monitoraggio · Marco R.  Aperto          │
│            ██████████████████████  Supply chain              │
└──────────────────────────────────────────────────────────────┘
```

- Matrice P×I visiva con pallino colorato
- Score bar proporzionale (1-25)
- Progetto padre cliccabile

### Pattern comune tutte le liste

| Regola | Dettaglio |
|--------|-----------|
| Niente codici | Solo nomi leggibili, codici solo nel dettaglio |
| Raggruppamento | Per stato/severità, ordinato per priorità di attenzione |
| Gruppi collassabili | Completati/Non iniziati collassati di default |
| Contesto padre | Nome progetto cliccabile, mai codice |
| Affordance click | Hover `bg-accent/50` + freccia → su ogni riga |
| Scadenza urgenza | Verde >7gg, Amber 3-7gg, Rosso <3gg, Rosso pulsante scaduto |
| Filtro "Solo problematici" | Toggle in cima, filtra blocchi/scadenze/rischi critici |
| Mobile | Gruppi mantenuti, righe → card verticali |

### Componenti nuovi/modificati

- EntityList: nuova prop `groupBy: { field, order, collapsedByDefault }` — raggruppamento client-side
- `GroupHeader` — header sezione con dot, label, conteggio, toggle collapse
- `DeadlineCell` — data + badge urgenza colorato
- `ProblemIndicators` — contatori compatti (rischi, blocchi, commenti)
- `ParentLink` — nome progetto/task padre cliccabile con icona dominio
- `StatusDot` — pallino colorato grande per status
- `RecurrenceBadge` — badge frequenza per task ricorrenti
- Righe a 2-3 linee di altezza per contenere più info

---

## Sezione 3: Dettaglio — Navigazione Connessa

### Principio: "Zoom In / Zoom Out"

Ogni pagina dettaglio risponde a:
1. **Dove sono?** — breadcrumb gerarchico completo
2. **Cosa c'è intorno?** — entità collegate visibili e cliccabili
3. **Cosa devo fare dopo?** — suggerimento azione successiva

### Breadcrumb gerarchico completo

```
Home > Progetti > Sistema Monitoraggio > Calibrazione sensori
Home > Progetti > Validazione Q1 > Milestone Fase 1 > Verifica protocolli
Home > Rischi > Ritardo fornitore sensori (di: Sistema Monitoraggio)
Home > Task ricorrenti > Rilascio certificati
```

- Ogni livello cliccabile → zoom out
- Task: catena Progetto → Milestone (se c'è) → Task → Subtask
- Rischi/Documenti collegati a progetto: mostrano progetto nel breadcrumb
- Task ricorrenti senza progetto: `Home > Task ricorrenti > Nome`

### Sidebar — Pannello Entità Collegate

La sidebar si arricchisce con navigazione contestuale.

**Struttura sidebar progetto:**

1. **Sezione Stato** — status, priorità, progress ring, scadenza colorata, manager
2. **Sezione Struttura Progetto** (NUOVA) — mini-albero interattivo:
   ```
   ▼ 🏁 Fase 1 - Setup
     ├─ ● Installazione HW
     ├─ ● Configurazione SW
     └─ 🔴 Calibrazione
   ▶ 🏁 Fase 2 - Validazione (5 task · 2 completati)
   ▶ 🏁 Fase 3 - Rilascio (3 task · 0 completati)
   ── Task senza milestone ──
     ├─ ● Report settimanale
     └─ ● Formazione team
   [Vedi tutto →]
   ```
   - Mostra SOLO milestone/task/subtask con `projectId` del progetto corrente
   - Milestone collassabili, prima milestone con bloccati/in corso espansa di default
   - Sommario sotto collassata: "(N task · M completati)"
   - Task bloccati in `text-destructive`
   - Max ~15 nodi visibili, completate collassate in fondo
   - Ogni nodo cliccabile → dettaglio
3. **Sezione Entità Collegate** — contatori con breakdown stato:
   ```
   Task              12 (3 🔴)
   ├─ Bloccati        3    →    ← click → /tasks?projectId=X&status=blocked
   ├─ In corso        5    →
   └─ Completati      4
   Rischi              3 (1⚠)
   └─ Critici          1   →
   Documenti               4
   └─ In revisione     2   →
   Ore registrate      127h
   └─ Questa settimana 18h
   ```
   - Ogni riga con → è cliccabile → lista filtrata
   - Solo breakdown problemi (non tutti gli stati)
4. **Ultimo aggiornamento** — azione più recente con link

**Sidebar per dominio:**

| Pagina | Contenuto sidebar |
|--------|-------------------|
| Progetto | Stato + Albero struttura + Entità collegate + Ultimo aggiornamento |
| Task | Stato + Progetto padre (link) + Subtask + Commenti recenti + Ore loggate |
| Task ricorrente | Stato + Ultime 5 esecuzioni (data + chi) + Commenti |
| Rischio | Stato + Progetto padre (link) + Task collegati + Piano mitigazione |
| Documento | Stato + Progetto padre (link) + Versioni precedenti + Approvatore |
| Segnalazione | Stato + Creatore + Task/Progetto convertito (se c'è) + Note |

### Suggerimento Azione Successiva

Box in fondo alla sidebar (1 suggerimento alla volta, il più rilevante):

| Contesto | Condizione | Suggerimento |
|----------|-----------|--------------|
| Progetto | Ha task bloccati | "X task bloccati → Vai al più urgente" |
| Progetto | Scadenza vicina + progress basso | "Scadenza tra Xgg ma solo Y% completato" |
| Progetto | Tutti task completati | "Tutti i task completati → Chiudi progetto?" |
| Progetto | Rischio critico aperto | "Rischio critico: [nome] → Vedi dettaglio" |
| Task | Checklist incompleta | "Checklist X/Y → Completa per avanzare" |
| Task | Nessun ore loggato | "Nessuna ora registrata → Avvia timer" |
| Task | Subtask tutti completati | "Tutti completati → Segna come completato?" |
| Task ricorrente | Ultima esecuzione troppo vecchia | "Non eseguito da Xgg → Registra esecuzione" |
| Rischio | Senza piano mitigazione | "Nessun piano di mitigazione → Aggiungi" |
| Documento | In review da troppo | "In revisione da Xgg → Approva o richiedi modifiche" |

Regole:
- Sempre un'azione cliccabile
- Se nulla da suggerire → box non appare
- Priorità: blocchi > scadenze > completamento > informativo

### Cross-link nei tab

Ogni riferimento a un'altra entità nei tab del dettaglio è un link cliccabile con icona dominio:
```
● Bloccato  Calibrazione sensori       Sara B.  🔴
            Rischio collegato: ⚠ Ritardo fornitore →
```

### Toast con navigazione

Dopo ogni azione, il toast include un link alla destinazione:
```
✅ Stato aggiornato a "Completato"    [Vai al task →]
✅ Ore registrate: 2h 30m             [Vedi time tracking →]
```

---

## Sezione 4: Affordance Globali — Chiarezza su Ogni Interazione

### Principio: "Nessun click misterioso"

Ogni elemento cliccabile comunica: sono cliccabile, dove ti porto, che tipo di azione è.

### Righe lista

- `cursor-pointer` su tutta la riga
- Hover: `bg-accent/50` + `shadow-sm` + freccia `ChevronRight` appare a destra
- Transizione `150ms ease`

### Link cross-dominio

- Icona piccola (14px) del dominio destinazione in `text-muted-foreground`
- Colore icona = colore dominio (blu progetto, rosso rischio, etc.)
- Hover: `underline` + icona diventa `text-foreground`

### Bottoni — 3 tipi distinti

| Tipo | Stile | Segnale |
|------|-------|---------|
| Navigazione | `variant="ghost"` + freccia `→` | "Ti porta altrove" |
| Azione | `variant="default"` / `variant="outline"` | "Fa qualcosa qui" |
| Distruttiva | `variant="destructive"` | "Elimina/annulla" |

### Hover preview su link cross-dominio

Tooltip arricchito dopo 500ms di hover:
```
┌─────────────────────────────┐
│ 📁 Sistema Monitoraggio     │
│ ● In corso · Alta           │
│ ◐ 65% · 12 task · ⚠2 rischi│
│ Scadenza: 15 Apr            │
└─────────────────────────────┘
```

- Dati da cache TanStack Query (nessuna API call extra)
- Max 4 righe
- Su mobile: nessun hover preview

### Transizioni di pagina

- Lista → Dettaglio: slide da destra (x: 8→0, 200ms)
- Dettaglio → Lista: slide da sinistra (x: -8→0, 200ms)
- Stesso livello: fade (150ms)

### Mappa visiva stati (globale, coerente ovunque)

```
● Verde    = Completato / On track / Approvato
● Blu      = In corso / Attivo
● Amber    = In revisione / Attenzione / In ritardo
● Rosso    = Bloccato / Critico / Scaduto
● Grigio   = Non iniziato / Bozza / Inattivo
🔄         = Ricorrente
```

Definiti come mappa unica `STATUS_VISUAL` in `lib/constants.ts`.

### Tabella affordance complete

| Elemento | Segnale visivo | Hover | Click |
|----------|---------------|-------|-------|
| Riga lista | `cursor-pointer` | `bg-accent/50` + `→` appare | → dettaglio |
| Link cross-dominio | Icona dominio 14px | `underline` + tooltip preview | → dettaglio altra entità |
| Bottone navigazione | `ghost` + `→` | standard | → altra pagina |
| Bottone azione | `default`/`outline` | standard | esegue azione |
| Nodo albero sidebar | `cursor-pointer` | `bg-accent/30` | → dettaglio task/milestone |
| Gruppo collassabile | `▶`/`▼` + `cursor-pointer` | `text-foreground` | espande/collassa |

---

## Non in scope (per ora)

- Board/Gantt/Calendar view mode in TaskListPage (restano stub)
- Timesheet view in TimeTrackingPage (resta stub)
- PlanningWizardPage (resta stub)
- Redesign mobile completo (solo adattamento responsive delle nuove feature)
