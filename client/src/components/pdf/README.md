# Sistema Export PDF con @react-pdf/renderer

Sistema completo di export PDF per i report settimanali di ProjectPulse, implementato con `@react-pdf/renderer`.

## 📦 Componenti Creati

### 1. Componenti PDF Base (`client/src/components/pdf/`)

#### `PDFCircularProgress.tsx`
Indicatore circolare di progresso con percentuale centrale.

**Props:**
- `percentage: number` - Valore percentuale (0-100)
- `size?: number` - Dimensione in pixel (default: 80)
- `strokeWidth?: number` - Spessore del bordo (default: 8)
- `color?: string` - Colore della barra di progresso (default: '#2563eb')
- `backgroundColor?: string` - Colore del background (default: '#e5e7eb')
- `showLabel?: boolean` - Mostra/nascondi label centrale (default: true)

**Implementazione:**
- Usa SVG Path invece di Circle con dashoffset (non supportato in React-PDF)
- Calcola l'arco in base alla percentuale
- Label sovrapposto con posizionamento assoluto

#### `PDFProgressBar.tsx`
Barra di progresso orizzontale con label e percentuale.

**Props:**
- `label: string` - Etichetta della barra
- `value: number` - Valore corrente
- `max: number` - Valore massimo
- `color?: string` - Colore della barra (default: '#2563eb')
- `backgroundColor?: string` - Colore del background (default: '#e5e7eb')
- `height?: number` - Altezza della barra (default: 8)
- `showPercentage?: boolean` - Mostra/nascondi percentuale (default: true)

**Layout:**
```
[Label]                    [50% (5/10)]
[████████████░░░░░░░░░░░░]
```

#### `PDFPieChart.tsx`
Grafico a torta/donut con legenda.

**Props:**
- `data: PieChartDataItem[]` - Array di { label, value, color }
- `size?: number` - Dimensione del grafico (default: 120)
- `innerRadius?: number` - Raggio interno per donut (default: 0)
- `showLegend?: boolean` - Mostra/nascondi legenda (default: true)
- `title?: string` - Titolo opzionale sopra il grafico

**Calcoli:**
- Converte valori in angoli e path SVG
- Determina flag "large arc" per archi > 180°
- Genera legend con colori e percentuali

#### `WeeklyReportPDF.tsx`
Componente principale del documento PDF completo.

**Struttura:**
1. **Cover Page**
   - Header blu con titolo e metadata
   - Performance Score circolare con badge
   - Grid 2x2 di KPI cards
   - Pie chart distribuzione task

2. **Detailed Statistics Page**
   - Grid statistiche principali (6 boxes)
   - Barre di progresso metriche (completamento, efficienza, produttività, consistenza)
   - Top 5 progetti con barre di progresso

3. **Task Details Page**
   - Task completati (max 15)
   - Task in corso (max 10)
   - Limitazione per evitare PDF troppo lunghi

4. **Blocked Tasks Page** (se presenti)
   - Task bloccati con highlight rosso
   - Ultimo commento come informazione aggiuntiva
   - Metadata progetto e assegnatario

5. **Time Tracking Details Page**
   - Breakdown ore per progetto
   - Task annidati sotto ogni progetto (max 8 per progetto)
   - Struttura gerarchica chiara

**Metriche Calcolate:**
```typescript
completionRate = (completedTasks / totalTasks) * 100
efficiency = min(100, (completedTasks / totalHours) * 10)
timeUtilization = min(100, (totalHours / 40) * 100)
productivity = completionRate * 0.6 + timeUtilization * 0.4
consistency = max(0, 100 - varianceOfDailyHours * 10)
overallScore = efficiency * 0.25 + completionRate * 0.30 + productivity * 0.25 + consistency * 0.20
```

**Badge Performance:**
- >= 85: ECCELLENTE (verde)
- >= 70: OTTIMO (blu)
- >= 55: BUONO (arancione)
- < 55: DA MIGLIORARE (rosso)

### 2. Utility Export (`client/src/utils/exportPDFReact.tsx`)

#### `exportWeeklyReportReactPDF(data, selectedUserId?)`
Genera e scarica il PDF del report settimanale.

**Parametri:**
- `data: WeeklyReportData` - Dati del report
- `selectedUserId?: string | null` - Filtro opzionale per utente specifico

**Ritorna:**
```typescript
{
  success: boolean
  filename?: string
  error?: string
}
```

**Processo:**
1. Crea componente React-PDF
2. Genera blob con `pdf().toBlob()`
3. Crea link temporaneo e triggera download
4. Cleanup automatico URL

**Nome file generato:**
```
Report_Settimana{weekNumber}_{year}_{userName}.pdf
```

#### `previewWeeklyReportPDF(data, selectedUserId?)`
Apre il PDF in una nuova tab del browser (utile per debugging).

**Uso:**
```typescript
// Download
await exportWeeklyReportReactPDF(reportData, userId)

// Preview
await previewWeeklyReportPDF(reportData, userId)
```

## 🎨 Design System

### Colori
```typescript
const colors = {
  primary: '#2563eb',       // Blu principale
  secondary: '#7c3aed',     // Viola
  success: '#16a34a',       // Verde
  warning: '#ea580c',       // Arancione
  danger: '#dc2626',        // Rosso
  info: '#0891b2',          // Ciano
  text: '#1f2937',          // Testo principale
  textLight: '#6b7280',     // Testo secondario
  border: '#e5e7eb',        // Bordi
  bgLight: '#f9fafb',       // Background chiaro
}
```

### Font Sizes
```typescript
TITLE: 18px        // Titoli principali
SUBTITLE: 14px     // Sottotitoli
HEADING: 12px      // Intestazioni sezioni
BODY: 10px         // Testo normale
SMALL: 8px         // Testo piccolo
```

### Layout
- Page: A4 (210mm x 297mm)
- Padding: 40px tutti i lati
- Margin tra sezioni: 20-25px
- Border radius: 6-8px per boxes
- Gap grid: 10-12px

## 🔧 Vincoli Tecnici React-PDF

### Supporto CSS Limitato
React-PDF supporta solo un subset di CSS via `StyleSheet.create()`:
- ✅ Flexbox (flexDirection, justifyContent, alignItems, gap)
- ✅ Box model (margin, padding, border, borderRadius)
- ✅ Colors (backgroundColor, color, borderColor)
- ✅ Typography (fontSize, fontWeight, fontFamily, textAlign)
- ❌ CSS Grid
- ❌ Animations/Transitions
- ❌ Transform (eccetto in SVG)
- ❌ Pseudo-elements/classes

### SVG
- Usa componenti `<Svg>`, `<Circle>`, `<Path>`, `<Line>`, etc.
- **NO** `strokeDashoffset` per Circle (usa Path invece)
- Tutti i valori numerici devono essere stringhe per alcuni props
- Transform supportato: `rotate`, `translate`, `scale`

### Fonts
- Font di sistema: Helvetica, Times, Courier
- Emoji supportati nativamente nei Text components
- Per font custom: registrare con `Font.register()`

### Layout
- Fixed layout (no responsive)
- Position absolute per overlay (label su grafici)
- No dynamic height calculation (specificare dimensioni)

### Performance
- Generazione blob è asincrona (~1-3 secondi per 5 pagine)
- Dimensione file tipica: 50-150KB
- Non blocca UI thread (usa async/await)

## 🔄 Integrazione con WeeklyReportPage

Il componente `WeeklyReportPage.tsx` importa e usa il nuovo export:

```typescript
import { exportWeeklyReportReactPDF } from '@/utils/exportPDFReact'

const handleExportPDF = async () => {
  if (!currentWeekPreview) return
  
  const result = await exportWeeklyReportReactPDF(
    currentWeekPreview, 
    selectedUserId
  )
  
  if (result.success) {
    addToast({ 
      type: 'success', 
      message: `PDF esportato: ${result.filename}` 
    })
  } else {
    addToast({ 
      type: 'error', 
      message: result.error 
    })
  }
}
```

## 🐛 Troubleshooting

### "Cannot find module @react-pdf/renderer"
```bash
cd client
npm install @react-pdf/renderer
```

### "JSX element implicitly has type 'any'"
Assicurati che il file sia `.tsx` non `.ts`.

### "Property strokeDashoffset does not exist"
React-PDF Circle non supporta strokeDashoffset. Usa Path per archi customizzati.

### "Failed to load PDF"
Controlla:
1. Tutti i campi required nei props sono forniti
2. Nessun valore `undefined` nei Text components (usa `|| 'N/A'`)
3. Nessun array vuoto mappato senza check

### PDF vuoto o parziale
- Verifica che `data` non sia undefined
- Controlla i conditional rendering (`data.length > 0`)
- Usa console.log pre-generazione per debuggare dati

## 📊 Confronto con sistema precedente (pdfExport.ts)

| Feature | pdfExport.ts (jsPDF + html2canvas) | exportPDFReact.tsx (@react-pdf/renderer) |
|---------|-----------------------------------|------------------------------------------|
| **Tecnologia** | Canvas rendering DOM | React components |
| **File size** | 500KB-2MB | 50-150KB |
| **Generazione** | ~5-10 secondi | ~1-3 secondi |
| **Qualità testo** | Bassa (rasterizzato) | Alta (vettoriale) |
| **Personalizzazione** | Difficile (coordinate manuali) | Facile (JSX/CSS-like) |
| **Emoji/Grafici** | ✅ Perfetti | ⚠️ Grafici custom necessari |
| **Manutenibilità** | ⭐⭐ | ⭐⭐⭐⭐ |
| **Performance** | ⭐⭐ | ⭐⭐⭐⭐ |

## 🚀 Estensioni Future

### Font Custom
```typescript
import { Font } from '@react-pdf/renderer'

Font.register({
  family: 'Roboto',
  src: 'https://fonts.gstatic.com/s/roboto/v30/...'
})

// Usa in StyleSheet
{ fontFamily: 'Roboto' }
```

### Grafici Più Complessi
Implementare componenti per:
- Bar charts (orizzontali/verticali)
- Line charts
- Stacked charts
- Heatmaps (grid colorata)

### Watermark
```typescript
<View style={{ position: 'absolute', opacity: 0.1, ... }}>
  <Text style={{ fontSize: 48, transform: 'rotate(-45deg)' }}>
    CONFIDENTIAL
  </Text>
</View>
```

### Table of Contents
Aggiungere pagina indice con link interni:
```typescript
<Link src="#section1">Go to Section 1</Link>
...
<View id="section1">...</View>
```

## 📝 Best Practices

1. **Limitare elementi per pagina** - Max 15-20 items per lista
2. **Usare pagination** - Spezzare dati su più pagine
3. **Evitare Text vuoti** - Sempre usare fallback (`|| 'N/A'`)
4. **Testare con dati reali** - Edge cases (liste vuote, nomi lunghi)
5. **Console log result** - Sempre loggare success/error
6. **Cleanup URLs** - Revocare object URLs dopo download
7. **Type safety** - Usare TypeScript strict mode
8. **Loading states** - Mostrare spinner durante generazione

## 📚 Risorse

- [React-PDF Documentation](https://react-pdf.org/)
- [SVG Path Tutorial](https://www.w3.org/TR/SVG/paths.html)
- [Flexbox Guide](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
- [PDF Specification](https://www.adobe.com/devnet/pdf/pdf_reference.html)
