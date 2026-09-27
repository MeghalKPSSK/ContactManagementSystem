import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import apiService from '../services/apiService';
import type { SidebarItemKey, ThemePreferences } from '../types';

export const DEFAULT_THEME_PREFERENCES: ThemePreferences = {
  primaryColor: '#138b7c',
  secondaryColor: '#087568',
  backgroundColor: '#f2f7f5',
  surfaceColor: '#ffffff',
  textColor: '#203a39',
  sidebarOrder: ['dragon', 'dashboard', 'contacts', 'notes', 'profile', 'groups', 'settings'],
};

const applyThemePreferences = (preferences: ThemePreferences) => {
  const root = document.documentElement;
  const secondaryText = `color-mix(in srgb, ${preferences.textColor} 64%, ${preferences.surfaceColor})`;
  const borderColor = `color-mix(in srgb, ${preferences.secondaryColor} 20%, ${preferences.surfaceColor})`;

  root.style.setProperty('--theme-primary', preferences.primaryColor);
  root.style.setProperty('--theme-secondary', preferences.secondaryColor);
  root.style.setProperty('--primary-bg', preferences.surfaceColor);
  root.style.setProperty('--accent-bg', preferences.backgroundColor);
  root.style.setProperty('--accent-bg-2', `color-mix(in srgb, ${preferences.secondaryColor} 7%, ${preferences.surfaceColor})`);
  root.style.setProperty('--primary-text', preferences.textColor);
  root.style.setProperty('--text-primary', preferences.textColor);
  root.style.setProperty('--text-secondary', secondaryText);
  root.style.setProperty('--secondary-text', secondaryText);
  root.style.setProperty('--unselected-text', secondaryText);
  root.style.setProperty('--secondary-bg', preferences.primaryColor);
  root.style.setProperty('--secondary-light', `color-mix(in srgb, ${preferences.primaryColor} 84%, white)`);
  root.style.setProperty('--secondary-dark', `color-mix(in srgb, ${preferences.primaryColor} 78%, #142b28)`);
  root.style.setProperty('--hover-text', preferences.secondaryColor);
  root.style.setProperty('--hover-bg', `color-mix(in srgb, ${preferences.secondaryColor} 12%, ${preferences.surfaceColor})`);
  root.style.setProperty('--accent-border', borderColor);
  root.style.setProperty('--highlight-border', borderColor);
  root.style.setProperty('--box-shadow', `color-mix(in srgb, ${preferences.textColor} 9%, transparent)`);
  root.style.setProperty('--box-shadow-color', `color-mix(in srgb, ${preferences.textColor} 9%, transparent)`);
  root.style.setProperty('--overlay-bg', `color-mix(in srgb, ${preferences.textColor} 58%, transparent)`);
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