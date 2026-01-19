import React, { createContext, useState, useEffect } from 'react';

/**
 * Context per Theme (light/dark)
 * Gestisce solo lo stato del tema - il CSS è gestito da Tailwind dark:
 */
export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    // Controlla localStorage prima
    const saved = localStorage.getItem('app-theme');
    if (saved) return saved;

    // Controlla preferenze sistema
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  });

  // Salva in localStorage e applica classe al root quando cambia
  useEffect(() => {
    localStorage.setItem('app-theme', theme);
    
    // Applica classe 'dark' all'elemento HTML root
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const setTheme = (newTheme) => {
    if (newTheme === 'light' || newTheme === 'dark') {
      setThemeState(newTheme);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const value = {
    theme,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
