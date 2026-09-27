// @ts-nocheck
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faSun } from '@fortawesome/free-solid-svg-icons';
import { useThemePreferences } from '../../contexts/ThemePreferencesContext';
import styles from './Header.module.css';

export default function Header() {
  const { preferences, savePreferences, isSaving } = useThemePreferences();

  const handleThemeModeChange = async (themeMode) => {
    if (themeMode === preferences.themeMode || isSaving) return;
    await savePreferences({ ...preferences, themeMode });
  };

  return (
    <div className={styles.container}>
      <div className={styles.brand}>
        <img src="/logo.png" alt="logo" className={styles.logo} />
        <h1 className={styles.title}>Contact Management System</h1>
      </div>

      <div className={styles.themeToggle} role="group" aria-label="Theme mode">
        <button
          type="button"
          className={preferences.themeMode === 'light' ? styles.themeButtonActive : ''}
          onClick={() => handleThemeModeChange('light')}
          disabled={isSaving}
          aria-label="Switch to light mode"
          title="Light mode"
        >
          <FontAwesomeIcon icon={faSun} />
          <span className={styles.themeLabel}>Light</span>
        </button>
        <button
          type="button"
          className={preferences.themeMode === 'dark' ? styles.themeButtonActive : ''}
          onClick={() => handleThemeModeChange('dark')}
          disabled={isSaving}
          aria-label="Switch to dark mode"
          title="Dark mode"
        >
          <FontAwesomeIcon icon={faMoon} />
          <span className={styles.themeLabel}>Dark</span>
        </button>
      </div>
    </div>
  );
}
