import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowDown, faArrowUp, faRotateLeft, faSave, faSliders } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import styles from './Settings.module.css';
import {
  DEFAULT_THEME_PREFERENCES,
  SIDEBAR_ITEM_LABELS,
  useThemePreferences,
} from '../../contexts/ThemePreferencesContext';
import type { SidebarItemKey, ThemePreferences } from '../../types';

const COLOR_FIELDS: Array<{ key: keyof Pick<ThemePreferences, 'primaryColor' | 'secondaryColor' | 'backgroundColor' | 'surfaceColor' | 'textColor'>; label: string }> = [
  { key: 'primaryColor', label: 'Primary actions' },
  { key: 'secondaryColor', label: 'Secondary accents' },
  { key: 'backgroundColor', label: 'Page background' },
  { key: 'surfaceColor', label: 'Surfaces' },
  { key: 'textColor', label: 'Main text' },
];

export default function Settings() {
  const { preferences, isSaving, previewPreferences, savePreferences } = useThemePreferences();
  const [draft, setDraft] = useState(preferences);

  useEffect(() => {
    setDraft(preferences);
  }, [preferences]);

  const updateColor = (key: typeof COLOR_FIELDS[number]['key'], value: string) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    previewPreferences(next);
  };

  const updateChartType = (key: keyof ThemePreferences['dashboardChartTypes'], value: string) => {
    const next = {
      ...draft,
      dashboardChartTypes: { ...draft.dashboardChartTypes, [key]: value },
    };
    setDraft(next);
    previewPreferences(next);
  };

  const updateDashboardColor = (index: number, value: string) => {
    const dashboardColors = [...draft.dashboardColors];
    dashboardColors[index] = value;
    const next = { ...draft, dashboardColors };
    setDraft(next);
    previewPreferences(next);
  };

  const moveSidebarItem = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= draft.sidebarOrder.length) return;

    const sidebarOrder = [...draft.sidebarOrder];
    [sidebarOrder[index], sidebarOrder[targetIndex]] = [sidebarOrder[targetIndex], sidebarOrder[index]];
    const next = { ...draft, sidebarOrder };
    setDraft(next);
    previewPreferences(next);
  };

  const handleReset = () => {
    const next = { ...DEFAULT_THEME_PREFERENCES, sidebarOrder: [...DEFAULT_THEME_PREFERENCES.sidebarOrder] };
    setDraft(next);
    previewPreferences(next);
  };

  const handleSave = async () => {
    try {
      await savePreferences(draft);
      toast.success('Appearance settings saved');
    } catch (error) {
      previewPreferences(preferences);
      toast.error(error instanceof Error ? error.message : 'Could not save appearance settings');
    }
  };

  return (
    <div className={styles.settingsPage}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>PERSONALIZE</span>
          <h1>Appearance</h1>
          <p>Set the colors and navigation order for your workspace.</p>
        </div>
        <FontAwesomeIcon icon={faSliders} className={styles.headerIcon} />
      </header>

      <div className={styles.settingsGrid}>
        <section className={styles.settingsSection} aria-labelledby="colors-heading">
          <div className={styles.sectionHeading}>
            <div>
              <h2 id="colors-heading">Colors</h2>
              <p>Changes preview immediately and are saved to your account.</p>
            </div>
          </div>
          <div className={styles.colorList}>
            {COLOR_FIELDS.map(({ key, label }) => (
              <label className={styles.colorRow} key={key}>
                <span>{label}</span>
                <span className={styles.colorControl}>
                  <input
                    type="color"
                    value={draft[key]}
                    onChange={(event) => updateColor(key, event.target.value)}
                    aria-label={label}
                  />
                  <code>{draft[key].toUpperCase()}</code>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className={styles.settingsSection} aria-labelledby="navigation-heading">
          <div className={styles.sectionHeading}>
            <div>
              <h2 id="navigation-heading">Sidebar order</h2>
              <p>Move items to change their order in the sidebar.</p>
            </div>
          </div>
          <ol className={styles.navigationList}>
            {draft.sidebarOrder.map((item: SidebarItemKey, index: number) => (
              <li className={styles.navigationItem} key={item}>
                <span className={styles.orderNumber}>{String(index + 1).padStart(2, '0')}</span>
                <span>{SIDEBAR_ITEM_LABELS[item]}</span>
                <div className={styles.orderControls}>
                  <button
                    type="button"
                    onClick={() => moveSidebarItem(index, -1)}
                    disabled={index === 0}
                    title={`Move ${SIDEBAR_ITEM_LABELS[item]} up`}
                    aria-label={`Move ${SIDEBAR_ITEM_LABELS[item]} up`}
                  >
                    <FontAwesomeIcon icon={faArrowUp} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSidebarItem(index, 1)}
                    disabled={index === draft.sidebarOrder.length - 1}
                    title={`Move ${SIDEBAR_ITEM_LABELS[item]} down`}
                    aria-label={`Move ${SIDEBAR_ITEM_LABELS[item]} down`}
                  >
                    <FontAwesomeIcon icon={faArrowDown} />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className={`${styles.settingsSection} ${styles.dashboardSettings}`} aria-labelledby="dashboard-heading">
          <div className={styles.sectionHeading}>
            <div>
              <h2 id="dashboard-heading">Dashboard charts</h2>
            </div>
          </div>
          <div className={styles.chartTypeList}>
            <label className={styles.chartTypeRow}>
              <span>Contacts by tags</span>
              <select value={draft.dashboardChartTypes.tags} onChange={(event) => updateChartType('tags', event.target.value)}>
                <option value="pie">Pie</option>
                <option value="donut">Donut</option>
              </select>
            </label>
            <label className={styles.chartTypeRow}>
              <span>Favorites vs regular</span>
              <select value={draft.dashboardChartTypes.favorites} onChange={(event) => updateChartType('favorites', event.target.value)}>
                <option value="bar">Bar</option>
                <option value="line">Line</option>
              </select>
            </label>
            <label className={styles.chartTypeRow}>
              <span>Groups vs tags</span>
              <select value={draft.dashboardChartTypes.groups} onChange={(event) => updateChartType('groups', event.target.value)}>
                <option value="mixed">Line + bar</option>
                <option value="line">Line</option>
                <option value="bar">Bar</option>
                <option value="area">Area</option>
              </select>
            </label>
          </div>
          <div className={styles.chartPalette}>
            <h3>Chart palette</h3>
            <div className={styles.paletteSwatches}>
              {draft.dashboardColors.map((color, index) => (
                <label className={styles.paletteColor} key={`dashboard-color-${index}`}>
                  <input
                    type="color"
                    value={color}
                    onChange={(event) => updateDashboardColor(index, event.target.value)}
                    aria-label={`Dashboard chart color ${index + 1}`}
                  />
                  <code>{color.toUpperCase()}</code>
                </label>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.resetButton} onClick={handleReset}>
          <FontAwesomeIcon icon={faRotateLeft} /> Reset defaults
        </button>
        <button type="button" className={styles.saveButton} onClick={handleSave} disabled={isSaving}>
          <FontAwesomeIcon icon={faSave} /> {isSaving ? 'Saving...' : 'Save appearance'}
        </button>
      </div>
    </div>
  );
}