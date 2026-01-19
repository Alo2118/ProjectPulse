import { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';
import { designTokens } from '../config/designTokens';

/**
 * Hook per accedere al tema e ai design tokens
 * @returns {object} { theme, setTheme, toggleTheme, colors, spacing, layouts, components, gradients }
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      'useTheme deve essere usato dentro a <ThemeProvider>. Aggiungi ThemeProvider in App.jsx'
    );
  }

  const { theme, setTheme, toggleTheme } = context;

  return {
    theme,
    setTheme,
    toggleTheme,
    // Accesso diretto ai token (già includono dark: variant di Tailwind)
    colors: designTokens.colors,
    spacing: designTokens.spacing,
    layouts: designTokens.layouts,
    components: designTokens.components,
    gradients: designTokens.gradients,
  };
};
