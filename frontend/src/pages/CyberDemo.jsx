import React from 'react';
import { theme, cn } from '../styles/theme';

/**
 * CYBER HOLOGRAPHIC DESIGN SYSTEM DEMO
 * Pagina demo per mostrare tutti i componenti del design system Iron Man
 */
export default function CyberDemo() {
  return (
    <div className={cn(theme.layout.page, 'cyber-grid-bg scanlines')}>
      {/* Scanline Effect Overlay */}
      <div className="scanline-overlay" />

      <div className={cn(theme.layout.container.xl, 'py-12 space-y-12')}>
        {/* HEADER */}
        <header className="text-center space-y-4 animate-slide-bottom">
          <h1 className={theme.typography.h1}>
            CYBER HOLOGRAPHIC UI
          </h1>
          <p className={cn(theme.typography.body, 'text-xl')}>
            Design System ispirato ai film di Iron Man
          </p>
          <div className="flex justify-center gap-4 mt-8">
            <div className="arc-reactor" />
          </div>
        </header>

        {/* DIVIDER */}
        <div className={theme.utils.divider.horizontal} />

        {/* TYPOGRAPHY SECTION */}
        <section className="stagger-animation space-y-6">
          <h2 className={theme.typography.h2}>TYPOGRAPHY</h2>

          <div className={cn(theme.card.glass, theme.card.padding.lg, 'space-y-4')}>
            <h1 className={theme.typography.h1}>Heading 1 - Cyber Glow</h1>
            <h2 className={theme.typography.h2}>Heading 2 - Holographic</h2>
            <h3 className={theme.typography.h3}>Heading 3 - Futuristic</h3>
            <h4 className={theme.typography.h4}>Heading 4 - Digital</h4>
            <h5 className={theme.typography.h5}>Heading 5 - Tech</h5>
            <h6 className={theme.typography.h6}>Heading 6 - Modern</h6>

            <div className={theme.utils.divider.horizontal} />

            <p className={theme.typography.body}>
              Body text - Lorem ipsum dolor sit amet, consectetur adipiscing elit.
              Interfaccia futuristica con effetti olografici avanzati.
            </p>
            <p className={theme.typography.bodySmall}>
              Small body text - Testo più piccolo per dettagli secondari.
            </p>
            <p className={theme.typography.caption}>
              Caption text - Informazioni aggiuntive e metadata.
            </p>

            <div className="flex gap-4">
              <span className={theme.typography.mono}>Monospace Text</span>
              <span className="text-glow">Glowing Text</span>
              <span className="text-glow-gold">Golden Glow</span>
            </div>
          </div>
        </section>

        {/* BUTTONS SECTION */}
        <section className="stagger-animation space-y-6">
          <h2 className={theme.typography.h2}>BUTTONS</h2>

          <div className={cn(theme.card.glass, theme.card.padding.lg, 'space-y-6')}>
            {/* Primary Buttons */}
            <div className="space-y-3">
              <h3 className={theme.typography.h5}>Primary</h3>
              <div className="flex flex-wrap gap-4">
                <button className={cn(theme.button.base, theme.button.primary, theme.button.size.sm)}>
                  Small
                </button>
                <button className={cn(theme.button.base, theme.button.primary, theme.button.size.md)}>
                  Medium
                </button>
                <button className={cn(theme.button.base, theme.button.primary, theme.button.size.lg)}>
                  Large
                </button>
                <button className={cn(theme.button.base, theme.button.primary, theme.button.size.xl)}>
                  Extra Large
                </button>
              </div>
            </div>

            {/* Secondary Buttons */}
            <div className="space-y-3">
              <h3 className={theme.typography.h5}>Secondary & Variants</h3>
              <div className="flex flex-wrap gap-4">
                <button className={cn(theme.button.base, theme.button.secondary, theme.button.size.md)}>
                  Secondary
                </button>
                <button className={cn(theme.button.base, theme.button.gold, theme.button.size.md)}>
                  Gold Arc
                </button>
                <button className={cn(theme.button.base, theme.button.success, theme.button.size.md)}>
                  Success
                </button>
                <button className={cn(theme.button.base, theme.button.danger, theme.button.size.md)}>
                  Danger
                </button>
                <button className={cn(theme.button.base, theme.button.ghost, theme.button.size.md)}>
                  Ghost
                </button>
              </div>
            </div>

            {/* Custom Cyber Button */}
            <div className="space-y-3">
              <h3 className={theme.typography.h5}>Custom Cyber Button</h3>
              <button className="cyber-btn">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Activate Systems
              </button>
            </div>
          </div>
        </section>

        {/* CARDS SECTION */}
        <section className="stagger-animation space-y-6">
          <h2 className={theme.typography.h2}>CARDS</h2>

          <div className={theme.layout.grid.cols3}>
            {/* Glass Card */}
            <div className={cn(theme.card.glass, theme.card.padding.lg)}>
              <h3 className={cn(theme.typography.h4, 'mb-4')}>Glass Card</h3>
              <p className={theme.typography.body}>
                Glassmorphism effect con backdrop blur e bordo cyber luminoso.
              </p>
            </div>

            {/* Solid Card */}
            <div className={cn(theme.card.solid, theme.card.padding.lg)}>
              <h3 className={cn(theme.typography.h4, 'mb-4')}>Solid Card</h3>
              <p className={theme.typography.body}>
                Card solida con effetto glow e bordi cyber.
              </p>
            </div>

            {/* Animated Card */}
            <div className={cn(theme.card.animated, theme.card.padding.lg)}>
              <h3 className={cn(theme.typography.h4, 'mb-4')}>Animated Card</h3>
              <p className={theme.typography.body}>
                Card con animazione glow pulse continua.
              </p>
            </div>
          </div>

          {/* Custom Cyber Card */}
          <div className="cyber-card">
            <h3 className={cn(theme.typography.h4, 'mb-4')}>Custom Cyber Card</h3>
            <p className={theme.typography.body}>
              Card personalizzata con corner accent dorato in stile Arc Reactor.
            </p>
          </div>
        </section>

        {/* INPUTS SECTION */}
        <section className="stagger-animation space-y-6">
          <h2 className={theme.typography.h2}>INPUTS</h2>

          <div className={cn(theme.card.glass, theme.card.padding.lg, 'space-y-6')}>
            <div className="space-y-2">
              <label className={theme.typography.label}>Username</label>
              <input
                type="text"
                placeholder="Enter username..."
                className={cn(theme.input.base, theme.input.size.md, 'w-full')}
              />
            </div>

            <div className="space-y-2">
              <label className={theme.typography.label}>Email</label>
              <input
                type="email"
                placeholder="user@example.com"
                className={cn(theme.input.base, theme.input.size.lg, 'w-full')}
              />
            </div>

            <div className="space-y-2">
              <label className={theme.typography.label}>Custom Cyber Input</label>
              <input
                type="text"
                placeholder="Type something cyber..."
                className="cyber-input w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={theme.typography.label}>Success State</label>
                <input
                  type="text"
                  value="Valid input"
                  className={cn(theme.input.base, theme.input.size.md, theme.input.success, 'w-full')}
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <label className={theme.typography.label}>Error State</label>
                <input
                  type="text"
                  value="Invalid input"
                  className={cn(theme.input.base, theme.input.size.md, theme.input.error, 'w-full')}
                  readOnly
                />
              </div>
            </div>
          </div>
        </section>

        {/* BADGES SECTION */}
        <section className="stagger-animation space-y-6">
          <h2 className={theme.typography.h2}>BADGES</h2>

          <div className={cn(theme.card.glass, theme.card.padding.lg, 'space-y-6')}>
            {/* Task Status */}
            <div className="space-y-3">
              <h3 className={theme.typography.h5}>Task Status</h3>
              <div className="flex flex-wrap gap-2">
                <span className={cn(theme.badge.base, theme.badge.status.todo)}>
                  TODO
                </span>
                <span className={cn(theme.badge.base, theme.badge.status.in_progress)}>
                  IN PROGRESS
                </span>
                <span className={cn(theme.badge.base, theme.badge.status.blocked)}>
                  BLOCKED
                </span>
                <span className={cn(theme.badge.base, theme.badge.status.waiting_clarification)}>
                  WAITING
                </span>
                <span className={cn(theme.badge.base, theme.badge.status.completed)}>
                  COMPLETED
                </span>
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-3">
              <h3 className={theme.typography.h5}>Priority</h3>
              <div className="flex flex-wrap gap-2">
                <span className={cn(theme.badge.base, theme.badge.priority.low)}>
                  LOW
                </span>
                <span className={cn(theme.badge.base, theme.badge.priority.medium)}>
                  MEDIUM
                </span>
                <span className={cn(theme.badge.base, theme.badge.priority.high)}>
                  HIGH
                </span>
              </div>
            </div>

            {/* Cyber Badges */}
            <div className="space-y-3">
              <h3 className={theme.typography.h5}>Cyber Badges</h3>
              <div className="flex flex-wrap gap-2">
                <span className={cn(theme.badge.base, theme.badge.cyber)}>
                  CYBER
                </span>
                <span className={cn(theme.badge.base, theme.badge.gold)}>
                  ARC REACTOR
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* EFFECTS SECTION */}
        <section className="stagger-animation space-y-6">
          <h2 className={theme.typography.h2}>SPECIAL EFFECTS</h2>

          <div className={theme.layout.grid.cols2}>
            {/* Hologram Effect */}
            <div className={cn(theme.card.glass, theme.card.padding.lg, 'animate-hologram')}>
              <h3 className={cn(theme.typography.h4, 'mb-4')}>Hologram Flicker</h3>
              <p className={theme.typography.body}>
                Effetto flickering olografico continuo
              </p>
            </div>

            {/* Glow Pulse */}
            <div className={cn(theme.card.solid, theme.card.padding.lg, 'animate-glow-pulse')}>
              <h3 className={cn(theme.typography.h4, 'mb-4')}>Glow Pulse</h3>
              <p className={theme.typography.body}>
                Pulsazione luminosa tipo Arc Reactor
              </p>
            </div>

            {/* Scanlines */}
            <div className={cn(theme.card.glass, theme.card.padding.lg, 'scanlines')}>
              <h3 className={cn(theme.typography.h4, 'mb-4')}>Scanlines</h3>
              <p className={theme.typography.body}>
                Effetto scanline CRT retro-futuristico
              </p>
            </div>

            {/* Data Grid */}
            <div className={cn(theme.card.glass, theme.card.padding.lg, theme.special.dataGrid)}>
              <h3 className={cn(theme.typography.h4, 'mb-4')}>Data Grid</h3>
              <p className={theme.typography.body}>
                Background con pattern griglia dati
              </p>
            </div>
          </div>
        </section>

        {/* ALERTS SECTION */}
        <section className="stagger-animation space-y-6">
          <h2 className={theme.typography.h2}>ALERTS</h2>

          <div className="space-y-4">
            <div className="alert alert-info">
              <strong>Info:</strong> Questo è un messaggio informativo con stile cyber.
            </div>
            <div className="alert alert-success">
              <strong>Success:</strong> Operazione completata con successo!
            </div>
            <div className="alert alert-warning">
              <strong>Warning:</strong> Attenzione, verifica i dati prima di procedere.
            </div>
            <div className="alert alert-error">
              <strong>Error:</strong> Si è verificato un errore critico del sistema.
            </div>
          </div>
        </section>

        {/* MISC SECTION */}
        <section className="stagger-animation space-y-6">
          <h2 className={theme.typography.h2}>MISC COMPONENTS</h2>

          <div className={cn(theme.card.glass, theme.card.padding.lg, 'space-y-6')}>
            {/* Loading Spinner */}
            <div className="flex items-center gap-4">
              <div className="cyber-spinner" />
              <span className={theme.typography.body}>Cyber Loading Spinner</span>
            </div>

            {/* Dividers */}
            <div className="space-y-4">
              <div className={theme.utils.divider.horizontal} />
              <div className="flex items-center gap-4">
                <div className={theme.utils.divider.vertical} style={{ height: '60px' }} />
                <span className={theme.typography.body}>Vertical Divider</span>
              </div>
            </div>

            {/* Data Display */}
            <div className="flex flex-wrap gap-4">
              <span className="data-display">SYS: ONLINE</span>
              <span className="data-display">TEMP: 42°C</span>
              <span className="data-display">POWER: 98%</span>
              <span className="data-display">STATUS: ACTIVE</span>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="text-center space-y-4 pt-12">
          <div className={theme.utils.divider.horizontal} />
          <p className={cn(theme.typography.body, 'opacity-70')}>
            Cyber Holographic Design System - Inspired by Iron Man
          </p>
          <p className={cn(theme.typography.caption, 'opacity-50')}>
            ProjectPulse © 2026
          </p>
        </footer>
      </div>
    </div>
  );
}
