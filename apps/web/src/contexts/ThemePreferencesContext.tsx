import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import apiService from '../services/apiService';
import type { SidebarItemKey, ThemePreferences } from '../types';

export const DEFAULT_THEME_PREFERENCES: ThemePreferences = {
  themeMode: 'light',
  primaryColor: '#138b7c',
  secondaryColor: '#087568',
  backgroundColor: '#f2f7f5',
  surfaceColor: '#ffffff',
  textColor: '#203a39',
  sidebarOrder: ['dragon', 'dashboard', 'contacts', 'notes', 'profile', 'groups', 'settings'],
  dashboardChartTypes: { tags: 'donut', favorites: 'bar', groups: 'mixed' },
  dashboardColors: ['#138b7c', '#d78248', '#4a92a4', '#b85f69', '#809958', '#af85bc'],
};

const applyThemePreferences = (preferences: ThemePreferences) => {
  const root = document.documentElement;
  const isDark = preferences.themeMode === 'dark';

  const surfaceColor = isDark
    ? `color-mix(in srgb, ${preferences.surfaceColor} 7%, #0f1519)`
    : preferences.surfaceColor;
  const pageBackground = isDark
    ? `color-mix(in srgb, ${preferences.backgroundColor} 5%, #080d11)`
    : preferences.backgroundColor;
  const textColor = isDark
    ? `color-mix(in srgb, ${preferences.textColor} 10%, #f0f6f5)`
    : preferences.textColor;

  const secondaryText = isDark
    ? `color-mix(in srgb, ${textColor} 78%, ${surfaceColor})`
    : `color-mix(in srgb, ${textColor} 64%, ${surfaceColor})`;
  const borderColor = isDark
    ? `color-mix(in srgb, ${preferences.secondaryColor} 42%, ${surfaceColor})`
    : `color-mix(in srgb, ${preferences.secondaryColor} 20%, ${surfaceColor})`;

  root.dataset.themeMode = preferences.themeMode;
  root.style.colorScheme = preferences.themeMode;

  root.style.setProperty('--theme-primary', preferences.primaryColor);
  root.style.setProperty('--theme-secondary', preferences.secondaryColor);
  root.style.setProperty('--primary-bg', surfaceColor);
  root.style.setProperty('--accent-bg', pageBackground);
  root.style.setProperty('--accent-bg-2', isDark
    ? `color-mix(in srgb, ${preferences.secondaryColor} 10%, ${surfaceColor})`
    : `color-mix(in srgb, ${preferences.secondaryColor} 7%, ${surfaceColor})`);
  root.style.setProperty('--primary-text', textColor);
  root.style.setProperty('--text-primary', textColor);
  root.style.setProperty('--text-secondary', secondaryText);
  root.style.setProperty('--secondary-text', secondaryText);
  root.style.setProperty('--unselected-text', secondaryText);
  root.style.setProperty('--secondary-bg', preferences.primaryColor);
  root.style.setProperty('--secondary-light', isDark
    ? `color-mix(in srgb, ${preferences.primaryColor} 54%, white)`
    : `color-mix(in srgb, ${preferences.primaryColor} 84%, white)`);
  root.style.setProperty('--secondary-dark', isDark
    ? `color-mix(in srgb, ${preferences.primaryColor} 64%, #060d0d)`
    : `color-mix(in srgb, ${preferences.primaryColor} 78%, #142b28)`);
  root.style.setProperty('--hover-text', preferences.secondaryColor);
  root.style.setProperty('--hover-bg', isDark
    ? `color-mix(in srgb, ${preferences.secondaryColor} 20%, ${surfaceColor})`
    : `color-mix(in srgb, ${preferences.secondaryColor} 12%, ${surfaceColor})`);
  root.style.setProperty('--accent-border', borderColor);
  root.style.setProperty('--highlight-border', borderColor);
  root.style.setProperty('--box-shadow', isDark
    ? `color-mix(in srgb, #000000 62%, transparent)`
    : `color-mix(in srgb, ${textColor} 9%, transparent)`);
  root.style.setProperty('--box-shadow-color', isDark
    ? `color-mix(in srgb, #000000 56%, transparent)`
    : `color-mix(in srgb, ${textColor} 9%, transparent)`);
  root.style.setProperty('--overlay-bg', isDark
    ? 'rgba(3, 8, 12, 0.84)'
    : `color-mix(in srgb, ${textColor} 58%, transparent)`);
  root.style.setProperty('--error-color', isDark ? '#e27872' : '#c75b55');
  root.style.setProperty('--success-color', isDark ? '#20a286' : '#16836f');
  root.style.setProperty('--text-light', isDark ? '#edf6f4' : '#ffffff');
  root.style.setProperty('--text-disabled', isDark
    ? `color-mix(in srgb, ${textColor} 36%, ${surfaceColor})`
    : '#a0b2ae');
};

interface ThemePreferencesContextValue {
  preferences: ThemePreferences;
  isSaving: boolean;
  previewPreferences: (preferences: ThemePreferences) => void;
  savePreferences: (preferences: ThemePreferences) => Promise<void>;
}

const ThemePreferencesContext = createContext<ThemePreferencesContextValue | null>(null);

export function ThemePreferencesProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  const [preferences, setPreferences] = useState(DEFAULT_THEME_PREFERENCES);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let current = true;
    if (!userId) {
      setPreferences(DEFAULT_THEME_PREFERENCES);
      applyThemePreferences(DEFAULT_THEME_PREFERENCES);
      return () => { current = false; };
    }

    apiService.getUserPreferences(userId)
      .then((response) => {
        if (!current || !response.success) return;
        setPreferences(response.preferences);
        applyThemePreferences(response.preferences);
      })
      .catch((error) => console.error('Unable to load user preferences:', error));

    return () => { current = false; };
  }, [userId]);

  const previewPreferences = (nextPreferences: ThemePreferences) => {
    applyThemePreferences(nextPreferences);
  };

  const savePreferences = async (nextPreferences: ThemePreferences) => {
    if (!userId) throw new Error('You must be logged in to save preferences');
    setIsSaving(true);
    try {
      const response = await apiService.updateUserPreferences(userId, nextPreferences);
      setPreferences(response.preferences);
      applyThemePreferences(response.preferences);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ThemePreferencesContext.Provider value={{ preferences, isSaving, previewPreferences, savePreferences }}>
      {children}
    </ThemePreferencesContext.Provider>
  );
}

export const useThemePreferences = () => {
  const context = useContext(ThemePreferencesContext);
  if (!context) throw new Error('useThemePreferences must be used within ThemePreferencesProvider');
  return context;
};

export const SIDEBAR_ITEM_LABELS: Record<SidebarItemKey, string> = {
  dragon: 'Dragon',
  dashboard: 'Dashboard',
  contacts: 'Contacts',
  notes: 'Notes',
  profile: 'Profile',
  groups: 'Groups',
  settings: 'Settings',
};