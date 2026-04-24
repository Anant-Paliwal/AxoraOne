import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadSavedAccentColor, applyAccentColor } from '@/lib/theme';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Priority 1: Check localStorage
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      console.log('✅ Loading saved theme from localStorage:', savedTheme);
      return savedTheme;
    }
    
    // Priority 2: Check sessionStorage (backup)
    const sessionTheme = sessionStorage.getItem('theme') as Theme | null;
    if (sessionTheme) {
      console.log('✅ Loading theme from sessionStorage:', sessionTheme);
      localStorage.setItem('theme', sessionTheme); // Restore to localStorage
      return sessionTheme;
    }
    
    // Priority 3: Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      console.log('✅ Using system dark theme preference');
      return 'dark';
    }
    
    // Priority 4: Default to dark theme
    console.log('✅ Using default dark theme');
    return 'dark';
  });

  const [accentColor, setAccentColorState] = useState<string>(() => {
    // Load and apply saved accent color immediately
    const savedColor = loadSavedAccentColor();
    return savedColor || '#8B5CF6';
  });

  // Apply accent color on mount
  useEffect(() => {
    applyAccentColor(accentColor);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    
    // Save to localStorage
    localStorage.setItem('theme', theme);
    console.log('Theme saved to localStorage:', theme);
    
    // Also save to sessionStorage as backup
    sessionStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const setAccentColor = (color: string) => {
    setAccentColorState(color);
    applyAccentColor(color);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, accentColor, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
