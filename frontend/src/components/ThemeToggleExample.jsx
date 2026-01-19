/**
 * Esempio di componente che usa il nuovo Design System
 * Copia questo pattern per convertire altri componenti
 */

import { useTheme } from '../hooks/useTheme';

export const ThemeToggleExample = () => {
  const { theme, toggleTheme, colors, spacing, layouts } = useTheme();

  return (
    <div className={`${colors.bg.primary} ${colors.text.primary} ${spacing.cardP} rounded-lg`}>
      <h3 className="text-lg font-bold mb-3">Design System Example</h3>

      {/* Mostra tema attivo */}
      <p className={colors.text.secondary}>
        Tema attuale: <span className={colors.accent}>{theme}</span>
      </p>

      {/* Bottone per cambiare tema */}
      <button
        onClick={toggleTheme}
        className={`
          mt-4
          px-4 py-2
          rounded-lg
          font-semibold
          transition-all
          ${
            theme === 'light'
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-cyan-600 text-white hover:bg-cyan-700'
          }
        `}
      >
        Cambia a {theme === 'light' ? 'Dark' : 'Light'} Mode
      </button>

      {/* Debug: Mostra i colori disponibili */}
      <div className={`mt-6 p-3 rounded ${colors.bg.secondary} border ${colors.border}`}>
        <p className={`text-sm ${colors.text.tertiary}`}>
          Colori disponibili: {Object.keys(colors).join(', ')}
        </p>
      </div>
    </div>
  );
};

export default ThemeToggleExample;
