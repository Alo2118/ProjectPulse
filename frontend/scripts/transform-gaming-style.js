#!/usr/bin/env node

/**
 * Batch transformation script per applicare stile gaming a tutte le pagine
 * Questo script definisce i pattern comuni di trasformazione
 */

const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '../src/pages');
const COMPONENTS_DIR = path.join(__dirname, '../src/components');

// Pattern comuni di trasformazione
const transformations = {
  // Layout wrapper
  wrapWithGamingLayout: (content) => {
    // Trova il return principale e sostituisci page-container con GamingLayout
    return content
      .replace(
        /<div className="page-container">\s*<div className="max-w-7xl mx-auto">/g,
        '<GamingLayout>'
      )
      .replace(
        /<\/div>\s*<\/div>\s*\);/g,
        '</GamingLayout>\n  );'
      );
  },

  // Header transformation
  transformHeader: (content) => {
    // Pattern per header standard
    const headerPattern = /<div className="flex items-center justify-between.*?">[\s\S]*?<h[12].*?>(.*?)<\/h[12]>[\s\S]*?<p.*?>(.*?)<\/p>[\s\S]*?<\/div>/;
    
    return content.replace(headerPattern, (match, title, subtitle) => {
      const cleanTitle = title.replace(/[🔬📊✨🎯]/g, '').trim();
      return `<GamingHeader
        title="${cleanTitle}"
        subtitle="${subtitle}"
        icon={Activity}
        actions={/* actions here */}
      />`;
    });
  },

  // Add imports
  addGamingImports: (content) => {
    if (content.includes('GamingLayout')) return content;
    
    const importLine = "import { GamingLayout, GamingHeader, GamingCard, GamingLoader, GamingKPICard, GamingKPIGrid } from '../components/ui';";
    
    // Trova l'ultima riga di import e aggiungi dopo
    const lastImport = content.lastIndexOf("from '");
    const endOfLine = content.indexOf(';', lastImport);
    
    return content.slice(0, endOfLine + 1) + '\n' + importLine + content.slice(endOfLine + 1);
  },

  // Transform stat cards
  transformStatCards: (content) => {
    // Trova pattern di stat cards e sostituisci con GamingKPICard
    const statsPattern = /<div className="stats-grid.*?">[\s\S]*?<\/div>/;
    
    return content.replace(statsPattern, () => {
      return `<GamingKPIGrid columns={4}>
        {/* Add GamingKPICard components here */}
      </GamingKPIGrid>`;
    });
  }
};

// Pages da trasformare
const pagesToTransform = [
  'ProjectDetailPage.jsx',
  'TimeTrackingPage.jsx', 
  'InboxPage.jsx',
  'CalendarPage.jsx',
  'GanttPage.jsx',
  'UserManagementPage.jsx',
  'TemplateManagerPage.jsx'
];

console.log('🎮 Gaming Style Transformation Script');
console.log('=====================================\n');
console.log('Questo script guida la trasformazione manuale delle pagine.');
console.log('Per ogni pagina, applica questi step:\n');
console.log('1. Aggiungi imports: GamingLayout, GamingHeader, GamingKPICard, etc.');
console.log('2. Sostituisci <div className="page-container"> con <GamingLayout>');
console.log('3. Sostituisci header con <GamingHeader title="..." subtitle="..." icon={...} />');
console.log('4. Sostituisci stat cards con <GamingKPICard> dentro <GamingKPIGrid>');
console.log('5. Usa <GamingCard> per card secondarie');
console.log('6. Chiudi con </GamingLayout>\n');

console.log('📄 Pagine da trasformare:');
pagesToTransform.forEach((page, i) => {
  console.log(`${i + 1}. ${page}`);
});

console.log('\n✅ Pattern disponibili in REFACTORING_SUMMARY.md');
