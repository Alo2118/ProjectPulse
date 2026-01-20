# 🚀 Cyber Holographic Design System

Design system futuristico ispirato ai film di Iron Man con effetti olografici, glassmorphism e animazioni cyber.

## 🎨 Caratteristiche Principali

### Stile Visivo
- **Colori Cyber**: Cyan brillante (#00D9FF), Oro Arc Reactor (#FFD700)
- **Glassmorphism**: Effetti vetro opaco con backdrop blur
- **Effetti Glow**: Box-shadow luminosi multipli
- **Animazioni**: Hologram flicker, pulse effects, scanlines
- **Tipografia**: Font Orbitron e Rajdhani con letter-spacing espanso

### Palette Colori

```javascript
Cyan Principale: #00D9FF
Blu Elettrico: #00AAFF
Oro (Arc Reactor): #FFD700
Viola Accento: #AA00FF
Rosa Neon: #FF00FF
Background: #000000 con gradienti
```

## 📦 Utilizzo del Design System

### Import del Theme

```javascript
import { theme, cn } from '../styles/theme';
```

### Esempi di Utilizzo

#### Cards

```jsx
// Glass Card
<div className={cn(theme.card.glass, theme.card.padding.lg)}>
  <h3 className={theme.typography.h4}>Titolo</h3>
  <p className={theme.typography.body}>Contenuto</p>
</div>

// Solid Card
<div className={cn(theme.card.solid, theme.card.padding.md)}>
  Contenuto
</div>

// Animated Card (con glow pulse)
<div className={cn(theme.card.animated, theme.card.padding.lg)}>
  Contenuto
</div>

// Custom Cyber Card (con corner accent oro)
<div className="cyber-card">
  Contenuto
</div>
```

#### Buttons

```jsx
// Primary Button
<button className={cn(theme.button.base, theme.button.primary, theme.button.size.md)}>
  Click Me
</button>

// Gold Arc Reactor Button
<button className={cn(theme.button.base, theme.button.gold, theme.button.size.lg)}>
  Arc Reactor
</button>

// Custom Cyber Button
<button className="cyber-btn">
  Activate
</button>
```

#### Typography

```jsx
<h1 className={theme.typography.h1}>CYBER TITLE</h1>
<h2 className={theme.typography.h2}>Holographic Subtitle</h2>
<p className={theme.typography.body}>Body text</p>
<span className={theme.typography.mono}>Code: XY-123</span>

// Con effetto glow
<h1 className="text-glow">Glowing Title</h1>
<span className="text-glow-gold">Golden Glow</span>
```

#### Inputs

```jsx
<input
  type="text"
  placeholder="Enter data..."
  className={cn(theme.input.base, theme.input.size.md)}
/>

// Custom Cyber Input
<input
  type="text"
  className="cyber-input"
  placeholder="Cyber input..."
/>
```

#### Badges

```jsx
// Task Status
<span className={cn(theme.badge.base, theme.badge.status.in_progress)}>
  IN PROGRESS
</span>

// Priority
<span className={cn(theme.badge.base, theme.badge.priority.high)}>
  HIGH
</span>

// Cyber Badge
<span className={cn(theme.badge.base, theme.badge.cyber)}>
  CYBER
</span>
```

## ✨ Effetti Speciali

### Animazioni Disponibili

```jsx
// Hologram Flicker
<div className="animate-hologram">Contenuto</div>

// Glow Pulse (Arc Reactor style)
<div className="animate-glow-pulse">Contenuto</div>

// Text Glow
<h1 className="animate-text-glow">Glowing Text</h1>

// Scanlines
<div className="scanlines">Contenuto con scanlines</div>

// Data Stream
<div className="animate-data-stream">Streaming data</div>

// Glitch Effect
<div className="animate-glitch">Glitch</div>
```

### Background Patterns

```jsx
// Cyber Grid
<div className="cyber-grid-bg">
  Contenuto con griglia cyber
</div>

// Hexagon Pattern
<div className="hex-pattern">
  Contenuto con pattern esagonale
</div>

// Data Grid
<div className={theme.special.dataGrid}>
  Contenuto con data grid
</div>
```

### Effetti Glow

```jsx
// Glow Cyan
<div className="glow-cyan">Contenuto</div>

// Glow Gold
<div className="glow-gold">Contenuto</div>

// Hover Glow
<div className="hover-glow">Hover me</div>
```

## 🎯 Componenti Speciali

### Arc Reactor

```jsx
<div className="arc-reactor" />
```

Crea un cerchio animato stile Arc Reactor di Iron Man con:
- Glow pulse animato
- Bordi cyan e gold
- Effetti luminosi multipli

### Glass Panel

```jsx
<div className="glass-panel p-6">
  <h3>Pannello Vetro</h3>
  <p>Contenuto con glassmorphism</p>
</div>
```

### Data Display (HUD Style)

```jsx
<span className="data-display">STATUS: ONLINE</span>
<span className="data-display">TEMP: 42°C</span>
<span className="data-display">POWER: 98%</span>
```

### Holographic Border

```jsx
<div className="holo-border p-4">
  Contenuto con bordo olografico animato
</div>
```

## 🎬 Layout & Structure

### Page Layout

```jsx
<div className={theme.layout.page}>
  <div className={cn(theme.layout.container.xl, 'py-8')}>
    {/* Contenuto */}
  </div>
</div>
```

### Grid Layouts

```jsx
// 2 Colonne
<div className={theme.layout.grid.cols2}>
  <div>Card 1</div>
  <div>Card 2</div>
</div>

// 3 Colonne
<div className={theme.layout.grid.cols3}>
  <div>Card 1</div>
  <div>Card 2</div>
  <div>Card 3</div>
</div>
```

### Flex Layouts

```jsx
// Center
<div className={theme.layout.flex.center}>Centered</div>

// Between
<div className={theme.layout.flex.between}>
  <div>Left</div>
  <div>Right</div>
</div>
```

## 🔧 Utilities

### Dividers

```jsx
// Horizontal
<div className={theme.utils.divider.horizontal} />

// Vertical
<div className={theme.utils.divider.vertical} style={{ height: '100px' }} />

// Custom Cyber Divider
<div className="cyber-divider" />
```

### Transitions

```jsx
<div className={theme.utils.transition.default}>
  Transizione standard (300ms)
</div>

<div className={theme.utils.transition.fast}>
  Transizione veloce (150ms)
</div>
```

### Scrollbar

```jsx
<div className={cn(theme.utils.scrollbar, 'overflow-auto')}>
  Contenuto scrollabile con scrollbar cyber
</div>
```

## 🎨 Alerts

```jsx
<div className="alert alert-info">
  <strong>Info:</strong> Messaggio informativo
</div>

<div className="alert alert-success">
  <strong>Success:</strong> Operazione completata!
</div>

<div className="alert alert-warning">
  <strong>Warning:</strong> Attenzione!
</div>

<div className="alert alert-error">
  <strong>Error:</strong> Errore critico!
</div>
```

## 🚀 Demo Page

Per vedere tutti i componenti in azione, visita la pagina demo:

```jsx
import CyberDemo from './pages/CyberDemo';
```

Aggiungi la route:
```jsx
<Route path="/cyber-demo" element={<CyberDemo />} />
```

## 📁 File Structure

```
frontend/src/
├── styles/
│   ├── animations.css      # Animazioni cyber
│   ├── theme.js            # Design system tokens
│   └── index.css           # Stili base e utility classes
├── pages/
│   └── CyberDemo.jsx       # Pagina demo completa
└── tailwind.config.js      # Configurazione Tailwind
```

## 🎯 Best Practices

1. **Usa sempre il theme object**: Evita classi hardcoded, usa `theme.*`
2. **Combina con cn()**: Usa `cn()` per unire classi del theme
3. **Effetti con moderazione**: Non abusare delle animazioni
4. **Accessibilità**: Mantieni contrasto sufficiente per la leggibilità
5. **Performance**: Usa `backdrop-blur` con moderazione (può essere costoso)

## 🌟 Tips & Tricks

### Stagger Animation

Per animare elementi in sequenza:

```jsx
<div className="stagger-animation">
  <div>Item 1</div> {/* delay: 0.05s */}
  <div>Item 2</div> {/* delay: 0.1s */}
  <div>Item 3</div> {/* delay: 0.15s */}
</div>
```

### Custom Glow Colors

```jsx
// Box shadow glow
<div className="shadow-glow-cyan">Cyan glow</div>
<div className="shadow-glow-gold">Gold glow</div>

// Text shadow glow
<h1 className="drop-shadow-glow-cyan">Glowing text</h1>
```

### Responsive Design

Il theme include breakpoints responsive:

```jsx
<h1 className={theme.typography.h1}>
  {/* text-5xl su mobile, text-6xl su md+ */}
  RESPONSIVE TITLE
</h1>
```

---

**Made with ⚡ for ProjectPulse**
*Inspired by Iron Man's holographic interfaces*
