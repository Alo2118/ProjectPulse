# Dark Theme Style Guide - Quick Reference

## Color Palette

### Backgrounds
```
Primary: bg-slate-950 (Almost black)
Secondary: bg-slate-900 (Dark slate)
Tertiary: bg-slate-800/50 (Semi-transparent dark slate)
```

### Text Colors
```
Primary Text: text-slate-200 (Light gray)
Secondary Text: text-slate-400 (Medium gray)
Accent Text: text-cyan-300 (Bright cyan)
Accent Secondary: text-cyan-400 (Lighter cyan)
Labels: text-cyan-400/70 (Dimmed cyan)
```

### Accents & Highlights
```
Primary Accent: text-cyan-400 or border-cyan-500
Secondary Accent: cyan-300 for titles
Glow: shadow-cyan-500/10 or shadow-cyan-500/20
```

### Interactive States
```
Hover: Increase shadow or text brightness
Focus: ring-cyan-500 or ring-offset-2
Active: bg-cyan-500/20 or border-cyan-500
Disabled: opacity-50 or text-slate-500
```

---

## Utility Classes (Most Common)

### Cards & Containers
```jsx
<div className="card">        // Compact card (p-4, rounded-lg)
<div className="card-lg">     // Large card (p-6, rounded-xl)
<h2 className="card-header">  // Card title (cyan-300, bold)
<div className="card-body">   // Card content (slate-200)
```

### Forms
```jsx
<input className="input-dark" />     // Dark input field
<textarea className="textarea-dark" />  // Dark textarea
<label className="text-label">       // Form label (cyan-400/70)
```

### Buttons
```jsx
<button className="btn-primary">    // Primary button
<button className="btn-secondary">  // Secondary button
<button className="btn-danger">     // Danger button
```

### Layout
```jsx
<div className="page-container">  // Full page wrapper
<div className="section">         // Section container
<div className="divider">         // Separator line
```

---

## Dark Theme Components

### Modal Example
```jsx
<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
  <div className="card-lg w-full max-w-lg">
    <div className="card-header flex items-center justify-between mb-4">
      <h2>Modal Title</h2>
      <button className="text-cyan-400/60 hover:text-cyan-300">
        <X className="w-6 h-6" />
      </button>
    </div>
    <form className="space-y-4">
      <div>
        <label className="text-label block mb-2">Field Name</label>
        <input type="text" className="input-dark w-full" />
      </div>
      <div className="flex gap-3 pt-4 border-t-2 border-cyan-500/20">
        <button type="submit" className="btn-primary flex-1">Save</button>
        <button type="button" className="btn-secondary">Cancel</button>
      </div>
    </form>
  </div>
</div>
```

### Card Example
```jsx
<div className="card-lg">
  <h3 className="card-header mb-3">Card Title</h3>
  <div className="card-body space-y-2">
    <p>Card content goes here</p>
  </div>
  <div className="card-footer mt-4">
    <button className="btn-primary">Action</button>
  </div>
</div>
```

### Form Group Example
```jsx
<div className="space-y-4">
  <div>
    <label className="text-label block mb-2">Name</label>
    <input type="text" className="input-dark w-full" />
  </div>
  <div>
    <label className="text-label block mb-2">Description</label>
    <textarea rows="3" className="textarea-dark w-full" />
  </div>
  <div>
    <label className="text-label block mb-2">Priority</label>
    <select className="input-dark w-full">
      <option>Low</option>
      <option>Medium</option>
      <option>High</option>
    </select>
  </div>
</div>
```

---

## Do's and Don'ts

### ✅ DO
- Use `.card` or `.card-lg` for container styling
- Use `.input-dark` for all form inputs
- Use `.text-label` for all form labels
- Use utility classes for consistent styling
- Add `w-full` to inputs for full width
- Use `space-y-4` for consistent spacing
- Use `gap-3` or `gap-4` for flex gaps

### ❌ DON'T
- Don't use `bg-white` (use `card-lg` instead)
- Don't use `border-slate-200` (use `border-cyan-500/20` instead)
- Don't use `text-gray-900` (use `text-slate-200` instead)
- Don't create custom inline classname strings (use utilities)
- Don't mix light and dark theme colors
- Don't use `text-gray-700` for labels (use `.text-label`)
- Don't use old `.input` class (use `.input-dark`)

---

## Accessibility Notes

### Contrast
- Cyan-300 on slate-900: ✅ High contrast (WCAG AA+)
- Slate-200 on slate-900: ✅ Excellent contrast
- Cyan-400/70 on slate-900: ✅ Adequate for labels

### Focus States
- All inputs have `focus:ring-2 focus:ring-cyan-500/50`
- All buttons support `:focus-visible`
- Tab order maintained throughout

### Motion
- Animations use standard Tailwind durations
- Transitions are smooth and not jarring
- Respects `prefers-reduced-motion` if configured

---

## Common Patterns

### Loading State in Modal
```jsx
{loading ? (
  <div className="text-center py-12 text-slate-400">
    Caricamento...
  </div>
) : (
  <div>Content</div>
)}
```

### Error Message
```jsx
<div className="bg-red-500/10 border-2 border-red-500/30 rounded-lg p-3 text-red-300">
  Error message
</div>
```

### Success Message
```jsx
<div className="bg-green-500/10 border-2 border-green-500/30 rounded-lg p-3 text-green-300">
  Success message
</div>
```

### Info Box
```jsx
<div className="bg-cyan-500/10 border-2 border-cyan-500/30 rounded-lg p-3 text-cyan-300">
  Information
</div>
```

---

## Migration Checklist (for new components)

- [ ] Use `.card-lg` or `.card` for main containers
- [ ] Use `.card-header` for section titles
- [ ] Use `.text-label` for all labels
- [ ] Use `.input-dark` for text inputs
- [ ] Use `.textarea-dark` for textareas
- [ ] Use `.btn-primary/secondary/danger` for buttons
- [ ] Use `text-cyan-300/400` for accents
- [ ] Use `border-cyan-500/20-30` for dividers
- [ ] Test dark mode appearance
- [ ] Check keyboard navigation
- [ ] Verify color contrast

---

## Questions?

Refer to these files for detailed information:
- `TAILWIND_UTILITIES.md` - Complete utility class reference
- `frontend/src/components/layouts/PageLayout.jsx` - Layout component examples
- `tailwind.config.js` - Utility definitions
