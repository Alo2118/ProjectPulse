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
| `--text-secondary` | `slate-400` (#94a3b8) | Testo secondario, label (NON cyan) |
| `--text-muted` | `slate-500` (#64748b) | Testo terziario |
| `--border` | `cyan-500/25` | Bordi standard (visibili) |
| `--border-hover` | `cyan-500/40` | Bordi hover |
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
| Label metadati | Inter | `text-xs uppercase tracking-widest text-slate-400 font-medium` (classe `.meta-row-label`) |
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

### 2.4 Neon Glow Effects (multi-layer, stile reference)

Glow potenziato a 3 strati per effetto neon realistico (ispirato alle reference HUD):

```css
/* Neon multi-layer — molto più visibile del glow singolo */
.neon-cyan {
  box-shadow:
    0 0 5px rgba(6,182,212,0.4),
    0 0 15px rgba(6,182,212,0.25),
    0 0 40px rgba(6,182,212,0.15),
    inset 0 0 15px rgba(6,182,212,0.05);
}
.neon-cyan-strong {
  box-shadow:
    0 0 5px rgba(6,182,212,0.5),
    0 0 20px rgba(6,182,212,0.35),
    0 0 60px rgba(6,182,212,0.2),
    inset 0 0 20px rgba(6,182,212,0.08);
}
.neon-red {
  box-shadow:
    0 0 5px rgba(239,68,68,0.4),
    0 0 15px rgba(239,68,68,0.25),
    0 0 40px rgba(239,68,68,0.15);
}
.neon-amber {
  box-shadow:
    0 0 5px rgba(251,191,36,0.4),
    0 0 15px rgba(251,191,36,0.25),
    0 0 40px rgba(251,191,36,0.15);
}
.neon-text {
  text-shadow:
    0 0 7px rgba(6,182,212,0.5),
    0 0 20px rgba(6,182,212,0.3),
    0 0 40px rgba(6,182,212,0.15);
}
.neon-btn {
  box-shadow:
    0 0 5px rgba(6,182,212,0.3),
    0 0 15px rgba(6,182,212,0.2),
    0 0 30px rgba(6,182,212,0.1);
}
.neon-input:focus {
  box-shadow:
    0 0 5px rgba(6,182,212,0.3),
    0 0 15px rgba(6,182,212,0.2),
    inset 0 0 10px rgba(6,182,212,0.05);
}
```

### 2.5 HUD Frame System

#### 2.5.1 Clip-path frames (angoli bevelati)

Card importanti usano angoli tagliati stile pannello HUD, non `rounded-xl`:

```css
/* Frame ottagonale — angoli tagliati a 45° */
.hud-frame {
  clip-path: polygon(
    12px 0, calc(100% - 12px) 0,
    100% 12px, 100% calc(100% - 12px),
    calc(100% - 12px) 100%, 12px 100%,
    0 calc(100% - 12px), 0 12px
  );
  position: relative;
}
/* Variante grande (per KPI cards) */
.hud-frame-lg {
  clip-path: polygon(
    16px 0, calc(100% - 16px) 0,
    100% 16px, 100% calc(100% - 16px),
    calc(100% - 16px) 100%, 16px 100%,
    0 calc(100% - 16px), 0 16px
  );
}
/* Inner border visibile (pseudo-element che replica il clip-path) */
.hud-frame::before {
  content: '';
  position: absolute;
  inset: 1px;
  clip-path: inherit;
  border: 1px solid rgba(6,182,212,0.3);
  pointer-events: none;
}
.hud-frame-accent::before {
  border-color: rgba(6,182,212,0.5);
}
```

Applicazione: KPI cards, panel principali, card progetto, alert. Le card secondarie (commenti, righe lista) restano `rounded-lg`.

#### 2.5.2 Corner brackets decorativi (4 angoli con tick marks)

```css
/* L-brackets su tutti e 4 gli angoli con tacche */
.hud-brackets {
  position: relative;
}
/* Top-left bracket */
.hud-brackets::before {
  content: '';
  position: absolute;
  top: -1px; left: -1px;
  width: 20px; height: 20px;
  border-top: 2px solid rgba(6,182,212,0.4);
  border-left: 2px solid rgba(6,182,212,0.4);
  pointer-events: none;
}
/* Bottom-right bracket */
.hud-brackets::after {
  content: '';
  position: absolute;
  bottom: -1px; right: -1px;
  width: 20px; height: 20px;
  border-bottom: 2px solid rgba(6,182,212,0.4);
  border-right: 2px solid rgba(6,182,212,0.4);
  pointer-events: none;
}
/* Inner wrapper for top-right + bottom-left brackets */
.hud-brackets > .hud-brackets-inner::before {
  content: '';
  position: absolute;
  top: -1px; right: -1px;
  width: 20px; height: 20px;
  border-top: 2px solid rgba(6,182,212,0.4);
  border-right: 2px solid rgba(6,182,212,0.4);
  pointer-events: none;
}
.hud-brackets > .hud-brackets-inner::after {
  content: '';
  position: absolute;
  bottom: -1px; left: -1px;
  width: 20px; height: 20px;
  border-bottom: 2px solid rgba(6,182,212,0.4);
  border-left: 2px solid rgba(6,182,212,0.4);
  pointer-events: none;
}
```

#### 2.5.3 Panel header angolare

```css
/* Header bar stile HUD con linee estese */
.hud-panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 8px;
  margin-bottom: 12px;
  border-bottom: 1px solid rgba(6,182,212,0.15);
  position: relative;
}
.hud-panel-header::before {
  content: '■';
  font-size: 6px;
  color: rgba(6,182,212,0.5);
}
.hud-panel-header::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, rgba(6,182,212,0.3), transparent);
}
.hud-panel-header span {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: rgba(6,182,212,0.6);
  white-space: nowrap;
}
```

Produce: `■ STATO PROGETTI ─────────────────────────`

#### 2.5.4 Separatori con tick marks

```css
.hud-divider {
  height: 1px;
  background: repeating-linear-gradient(
    90deg,
    rgba(6,182,212,0.3) 0px,
    rgba(6,182,212,0.3) 4px,
    transparent 4px,
    transparent 8px
  );
  margin: 12px 0;
}
/* Variante con label centrale */
.hud-divider-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.6rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: rgba(6,182,212,0.4);
}
.hud-divider-label::before,
.hud-divider-label::after {
  content: '';
  flex: 1;
  height: 1px;
  background: repeating-linear-gradient(
    90deg,
    rgba(6,182,212,0.2) 0px,
    rgba(6,182,212,0.2) 4px,
    transparent 4px,
    transparent 8px
  );
}
```

Produce: `──┤──┤──┤── SECTION ──┤──┤──┤──`

#### 2.5.5 Targeting overlay su hover

```css
.hud-target {
  position: relative;
}
.hud-target::before,
.hud-target::after {
  content: '';
  position: absolute;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}
/* Croce orizzontale */
.hud-target::before {
  top: 50%;
  left: 8px;
  right: 8px;
  height: 1px;
  background: rgba(6,182,212,0.1);
}
/* Croce verticale */
.hud-target::after {
  left: 50%;
  top: 8px;
  bottom: 8px;
  width: 1px;
  background: rgba(6,182,212,0.1);
}
.hud-target:hover::before,
.hud-target:hover::after {
  opacity: 1;
}
```

### 2.6 HUD Components (React/SVG)

#### 2.6.1 HudGauge — Indicatore circolare SVG

Componente per KPI percentuali (utilizzo team, progresso progetto):

```tsx
interface HudGaugeProps {
  value: number;        // 0-100
  size?: number;        // px, default 80
  strokeWidth?: number; // default 4
  color?: 'cyan' | 'amber' | 'red' | 'emerald';
  label?: string;
  showValue?: boolean;
}
```

SVG con:
- Cerchio sfondo: `stroke: rgba(6,182,212,0.1)`, `stroke-dasharray: 4 2` (tratteggiato)
- Arco valore: gradiente `cyan-400` → `indigo-400`, `stroke-dashoffset` animato
- Tick marks: 12 lineette radiali attorno al cerchio (come i minuti di un orologio)
- Glow: `filter: drop-shadow(0 0 6px rgba(6,182,212,0.4))`
- Numero al centro: `font-mono font-bold` con `neon-text`

Applicazione: KPI "Utilizzo team" nel dashboard, progresso nei dettagli progetto.

#### 2.6.2 HudProgressBar — Barra segmentata

```tsx
interface HudProgressBarProps {
  value: number;        // 0-100
  segments?: number;    // default 10
  color?: 'cyan' | 'amber' | 'red' | 'emerald';
  showLabel?: boolean;
  size?: 'sm' | 'md';  // sm=h-1.5, md=h-3
}
```

Rende N blocchi (segmenti), quelli attivi hanno glow:
```
█ █ █ █ █ █ ░ ░ ░ ░  65%
^--- glow cyan ----^  ^--- opaco ---^
```

Ogni segmento è un `<div>` con `rounded-sm`, gap `2px`. Segmenti attivi: `bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.4)]`. Segmenti inattivi: `bg-slate-700/30`.

Animazione `data-reveal`: segmenti si accendono uno a uno (stagger 50ms) al primo render.

#### 2.6.3 HudStatusRing — Anello pulsante SVG

```tsx
interface HudStatusRingProps {
  status: 'active' | 'warning' | 'danger' | 'idle';
  size?: number;  // default 12
  pulse?: boolean;
}
```

SVG con:
- Dot centrale colorato (4px)
- Anello esterno (8-12px) con `stroke-dasharray` parziale
- Animazione: anello ruota lentamente (8s loop) + pulsa in opacità (2s loop)
- Glow: `filter: drop-shadow` colorato per status

Sostituisce i semplici `.status-dot` per gli stati importanti.

#### 2.6.4 HudScanOverlay — Scan line ambientale

```css
.hud-scan {
  position: relative;
  overflow: hidden;
}
.hud-scan::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(6,182,212,0.02) 45%,
    rgba(6,182,212,0.05) 50%,
    rgba(6,182,212,0.02) 55%,
    transparent 100%
  );
  animation: scan-line 4s ease-in-out infinite;
  pointer-events: none;
}
```

Effetto sottile: una riga luminosa che scorre lentamente dall'alto in basso (4s). Applicazione: card KPI, panel sidebar, timer attivo.

### 2.7 Spacing

- Tra sezioni pagina: `space-y-6` (più respiro del `space-y-4` attuale)
- Tra righe lista: `space-y-1`
- Padding card: `p-5`
- Padding pagina: `p-6` (fornito da DashboardLayout, invariato)

### 2.8 Color Distribution Rules (CRITICO)

**Problema risolto**: troppo cyan ovunque rende l'interfaccia monotona e illeggibile.

**Regola fondamentale**: il cyan (`primary`) si usa SOLO per elementi interattivi e dati chiave, MAI per testo strutturale.

#### Dove usare cyan (primary)
- Pulsanti primari (`btn-primary`)
- Link e azioni cliccabili (hover state)
- Bordi card (sottile, `/25`)
- Bordi focus su input
- Glow effects (shadows)
- KPI numeri importanti (con `neon-text`)
- Dot indicatore sidebar attivo
- HUD decorative elements (brackets, dividers, scan)

#### Dove NON usare cyan
- Titoli pagina → `white` (dark) / `slate-900` (light)
- Nomi utente nel saluto → `white` (dark) / `slate-900` (light)
- Label metadati → `slate-400` (dark) / `slate-500` (light)
- Sottotitoli → `gray-400` (dark) / `gray-500` (light)
- Intestazioni sezione → `gray-300` (dark) / `gray-700` (light)
- Testo sidebar group labels → `slate-500`
- Testo sidebar item attivo → `white` (NON cyan)
- Panel header HUD span → `slate-400/80` (NON cyan)
- Logo sidebar → `white` (dark) / `slate-900` (light)

#### Colori per metriche (varietà)
- Ore/tempo → `amber-400` + `neon-text` (dark), `amber-600` (light)
- Progresso % → semantic (emerald >80%, amber 50-80%, red <50%)
- Conteggi task → `white font-mono` (dark)
- Utilizzo team → `blue-400` (distinto da cyan)
- Budget → `indigo-400`

#### Card borders e glow
- Border base: `border-cyan-500/25` (visibile, non `/10`)
- Shadow ambient: `shadow-[0_0_15px_rgba(6,182,212,0.08)]` (sempre visibile)
- Hover: `border-cyan-500/40` + `shadow-neon-cyan`
- Modal: `border-cyan-500/25` + `shadow-cyan-500/10`

### 2.9 CSS Classes centralizzate

Tutti gli stili ripetuti sono definiti come classi CSS in `index.css` e non hardcoded nelle pagine:

| Classe | Uso | Dark | Light |
|--------|-----|------|-------|
| `.card` | Card base | `bg-slate-900/70 border-cyan-500/25 shadow-ambient` | `bg-white border-slate-200` |
| `.nav-item` | Nav sidebar inattivo | `text-slate-400 hover:text-slate-200` | `text-slate-600 hover:text-slate-900` |
| `.nav-item-active` | Nav sidebar attivo | `text-white bg-cyan-500/10 border-l-cyan-500` | `text-cyan-700 bg-cyan-50` |
| `.nav-group-label` | Label gruppo sidebar | `text-slate-500` | `text-slate-400` |
| `.sidebar` | Container sidebar | `bg-slate-950/90 border-r-cyan-500/15` | `bg-white border-slate-200` |
| `.sidebar-border` | Separatori sidebar | `border-cyan-500/15` | `border-slate-200` |
| `.sidebar-search` | Search button sidebar | `bg-slate-800/50 border-cyan-500/15` | `bg-slate-100 border-slate-200` |
| `.sidebar-logo` | Logo testo | `text-white` | `text-slate-900` |
| `.page-title` | Titolo pagina | `text-white` | `text-gray-900` |
| `.page-subtitle` | Sottotitolo pagina | `text-gray-400` | `text-gray-500` |
| `.section-heading` | Heading card/sezione | `text-gray-300 uppercase tracking-wide` | `text-gray-700` |
| `.meta-row-label` | Label metadati | `text-slate-400` | `text-slate-500` |
| `.form-section-header` | Header sezione form | `text-slate-400` | `text-slate-500` |
| `.notification-badge` | Badge conteggio | `bg-cyan-500 text-white` | `bg-cyan-600 text-white` |
| `.modal-panel` | Pannello modale | `border-cyan-500/25 shadow-cyan-500/10` | `border-slate-200` |
| `.btn-primary` | Pulsante primario | `bg-cyan-600 shadow-neon-btn` | uguale |
| `.btn-secondary` | Pulsante secondario | `border-cyan-500/30 text-cyan-400` | `border-cyan-600/30 text-cyan-700` |
| `.input` | Campo input | `border-cyan-500/20 focus:shadow-neon-input` | `border-slate-300` |

**Regola per nuovi componenti**: NON hardcodare colori nelle pagine/componenti. Usare le classi CSS centralizzate. Se serve una variante nuova, aggiungerla a `index.css`.

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
- Voce attiva: classe `.nav-item-active` → testo **bianco** (NON cyan), `bg-cyan-500/10 border-l-2 border-cyan-500`
- Voce inattiva: classe `.nav-item` → `text-slate-400`, hover → `text-slate-200`
- Group labels: classe `.nav-group-label` → `text-slate-500` (NON cyan)
- Logo: classe `.sidebar-logo` → `text-white` (dark), `text-slate-900` (light)
- Mobile: drawer overlay con backdrop blur
- Badge notifiche: classe `.notification-badge` con animazione bounce-in
- Tutti gli stili centralizzati in `index.css`, NON hardcoded nel componente

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

## 13. Mappa HUD Elements → Oggetti di dominio

Ogni tipo di oggetto nell'app ha un **set specifico di elementi HUD** assegnati, creando un linguaggio visivo dove l'utente riconosce istantaneamente il tipo di dato che sta guardando:

| Oggetto | Frame | Progress | Status | Glow | Header | Extras |
|---------|-------|----------|--------|------|--------|--------|
| **KPI Card** | `hud-frame-lg` (clip-path) | `HudGauge` circolare | `HudStatusRing` | `neon-cyan-strong` | — | `hud-scan`, `hud-brackets`, `card-power-on` |
| **Progetto** | `hud-frame` (clip-path) | `HudProgressBar` segmentata | Semaforo (dot + testo) | `neon-cyan` | `hud-panel-header` | `hud-brackets`, `hud-divider` tra sezioni |
| **Task** | `rounded-lg` (standard) | Barra lineare semplice (ore) | Inline badge colorato | Glow solo su hover | — | `fade-in-stagger`, priorità come `border-left` |
| **Milestone** | `hud-frame` (clip-path) | `HudProgressBar` segmentata | `HudStatusRing` | `neon-cyan` | `hud-panel-header` | — |
| **Rischio** | `hud-frame` (clip-path) | — | `HudStatusRing` (warning/danger) | `neon-red` o `neon-amber` | `hud-panel-header` | `alert-border-pulse` |
| **Timer attivo** | `rounded-xl` con `neon-red` | Barra lineare (ore oggi) | `HudStatusRing` (active, pulse) | `neon-red` multi-layer | — | `hud-scan`, `timer-tick` |
| **Alert/Attenzione** | `rounded-lg` con border-left | — | Icona semantica | `neon-red`/`neon-amber` su hover | — | `alert-border-pulse` |
| **Dashboard Section** | Card con `hud-brackets` | Varia (gauge/barre) | — | Glow su hover | `hud-panel-header` | `section-reveal` stagger, `hud-divider` |
| **Tabella** | Nessun frame | — | — | — | `hud-panel-header` + colonne `uppercase tracking-widest` | `hud-divider` come separatore, `fade-in-stagger` righe |
| **Form/Input** | Nessun frame | — | — | `neon-input` su focus | — | `tooltip-origin` su dropdown |
| **Modale** | `hud-frame` (clip-path) | — | — | `neon-cyan` | `hud-panel-header` | `tooltip-origin`, `hud-divider` tra header/footer |
| **Sidebar** | Nessun frame | — | — | `sidebar-glow` su active | — | `hud-divider` tra gruppi |
| **Notifica/Toast** | `rounded-lg` | Barra countdown (undo) | Icona semantica | Flash `neon-cyan` su arrivo | — | `badge-bounce` |
| **Documento** | `hud-frame` | — | Badge stato (bozza/approvato) | `neon-cyan` | `hud-panel-header` | — |
| **Weekly Report** | `hud-frame-lg` | Gauge + barre per sezione | — | `neon-cyan-strong` | `hud-panel-header` | `hud-scan`, `hud-brackets` |

### Gerarchia visiva per intensità HUD

```
Più HUD ←──────────────────────────────────→ Meno HUD
KPI Card > Report > Progetto > Milestone > Rischio > Task > Form > Lista riga
```

- **Livello 1 (massimo HUD)**: KPI cards, Report, Timer — clip-path + gauge + neon-strong + scan + brackets
- **Livello 2 (HUD medio)**: Progetti, Milestone, Modali — clip-path + barre segmentate + neon + panel-header
- **Livello 3 (HUD leggero)**: Rischi, Documenti, Alert — clip-path + neon su hover + divider
- **Livello 4 (minimale)**: Task righe, Form, Sidebar — rounded standard + glow su focus/hover

---

## 14. Vincoli non modificati

- Backend: nessuna modifica richiesta (tranne eventuale endpoint per "nomi progetto" nei breadcrumb)
- Routing: aggiungere `/tasks?view=kanban`, `/tasks?view=gantt`; rimuovere `/kanban`, `/gantt` come rotte separate (redirect)
- Store: nessuna modifica strutturale, solo adattamenti UI
- Logica business: invariata
- Auth/ruoli: invariati
- Socket.io: invariato (le animazioni real-time usano gli eventi esistenti)
