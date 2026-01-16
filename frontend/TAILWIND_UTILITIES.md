/**
 * TAILWIND CSS UTILITIES REFERENCE
 * 
 * These are centralized component classes defined in tailwind.config.js
 * Use these instead of inline Tailwind classes to reduce code repetition by 60%+
 * 
 * ===== CARDS & CONTAINERS =====
 * .card              - Standard card (sm with padding p-4)
 * .card-lg           - Large card with hover effects (lg with padding p-6)
 * .card-header       - Card header text (text-lg font-bold text-cyan-300)
 * .card-subheader    - Card subheader text (text-sm font-semibold text-cyan-400/70)
 * .card-body         - Card body text (text-slate-200)
 * .card-footer       - Card footer with divider
 * 
 * ===== INPUTS & FORMS =====
 * .input-dark        - Dark input field (full styling)
 * .input-small       - Compact input field
 * .textarea-dark     - Dark textarea (full styling)
 * 
 * ===== BUTTONS =====
 * .btn               - Base button styles
 * .btn-primary       - Primary cyan/blue gradient button
 * .btn-secondary     - Secondary slate button with cyan border
 * .btn-danger        - Danger red button
 * .btn-ghost         - Ghost/transparent button
 * 
 * ===== TEXT & TYPOGRAPHY =====
 * .text-title        - Page title (text-3xl font-bold text-cyan-300)
 * .text-subtitle     - Section title (text-lg font-semibold text-cyan-300)
 * .text-label        - Form label (text-sm font-medium text-cyan-400)
 * .text-muted        - Muted text (text-slate-400)
 * .text-highlight    - Highlighted text (text-cyan-300)
 * 
 * ===== BADGES & PILLS =====
 * .badge             - Base badge
 * .badge-primary     - Cyan badge
 * .badge-success     - Green badge
 * .badge-danger      - Red badge
 * .badge-warning     - Yellow badge
 * 
 * ===== OTHER =====
 * .divider           - Horizontal divider (border-t-2 border-cyan-500/20)
 * .page-container    - Full page dark background
 * .section           - Vertical spacing (space-y-4)
 * .section-lg        - Large vertical spacing (space-y-6)
 * .link-primary      - Primary link color
 * .link-muted        - Muted link color
 * 
 * ===== EXAMPLES =====
 * 
 * OLD WAY (40+ lines, hard to maintain):
 * <div className="bg-white border-2 border-slate-200 rounded-lg p-6 shadow-md hover:shadow-xl transition-all">
 *   <h3 className="text-lg font-bold text-slate-900">Title</h3>
 *   <p className="text-slate-600 mt-2">Subtitle</p>
 *   <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Action</button>
 * </div>
 * 
 * NEW WAY (3 lines, easy to maintain):
 * <div className="card-lg">
 *   <h3 className="card-header">Title</h3>
 *   <p className="card-subheader mt-2">Subtitle</p>
 *   <button className="btn btn-primary">Action</button>
 * </div>
 * 
 * ===== USAGE TIPS =====
 * 1. Always use .card-lg for main content cards
 * 2. Use .card for smaller, compact cards
 * 3. Combine utilities: <div className="card-lg animate-fade-in">
 * 4. Use layout components: PageLayout, SectionLayout, GridLayout
 * 5. For new components, check utilities first before writing inline classes
 * 
 * ===== THEME COLORS =====
 * Primary: Cyan (from-cyan-600 to-blue-600)
 * Accents: Text - cyan-300, Muted - cyan-400/60
 * Backgrounds: Slate-800/50 (transparent), Slate-900 (dark)
 * Borders: Cyan-500/30 (primary), Cyan-500/20 (muted)
 */
