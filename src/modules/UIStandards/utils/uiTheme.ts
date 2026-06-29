export interface UiThemePreset {
  id: string;
  name: string;
  description: string;
  values: Record<string, string>;
}

export const UI_THEME_STORAGE_KEY = 'pic-system:ui-theme-preset';

export const uiThemePresets: UiThemePreset[] = [
  {
    id: 'pic-red',
    name: 'PIC Rojo',
    description: 'Paleta institucional actual.',
    values: {
      '--pic-brand': '357 84% 45%',
      '--pic-brand-soft': '0 86% 97%',
      '--pic-brand-border': '0 96% 89%',
      '--pic-info': '221 83% 53%',
      '--pic-chart-1': '357 84% 45%',
      '--pic-chart-2': '176 69% 30%',
      '--pic-chart-3': '221 83% 53%',
      '--pic-chart-4': '32 95% 44%',
      '--pic-chart-5': '215 16% 47%',
    },
  },
  {
    id: 'trade-blue',
    name: 'Trade Azul',
    description: 'Acento frio para vistas analiticas.',
    values: {
      '--pic-brand': '214 90% 45%',
      '--pic-brand-soft': '214 100% 97%',
      '--pic-brand-border': '213 94% 88%',
      '--pic-info': '199 89% 48%',
      '--pic-chart-1': '214 90% 45%',
      '--pic-chart-2': '160 84% 34%',
      '--pic-chart-3': '32 95% 44%',
      '--pic-chart-4': '262 83% 58%',
      '--pic-chart-5': '215 16% 47%',
    },
  },
  {
    id: 'ops-teal',
    name: 'Operativo Teal',
    description: 'Acento sobrio para gestion y control.',
    values: {
      '--pic-brand': '174 72% 32%',
      '--pic-brand-soft': '166 76% 97%',
      '--pic-brand-border': '170 76% 82%',
      '--pic-info': '199 89% 48%',
      '--pic-chart-1': '174 72% 32%',
      '--pic-chart-2': '221 83% 53%',
      '--pic-chart-3': '32 95% 44%',
      '--pic-chart-4': '357 84% 45%',
      '--pic-chart-5': '215 16% 47%',
    },
  },
];

export const applyUiThemePreset = (preset: UiThemePreset) => {
  Object.entries(preset.values).forEach(([token, value]) => {
    document.documentElement.style.setProperty(token, value);
  });
  window.localStorage.setItem(UI_THEME_STORAGE_KEY, preset.id);
};

export const getStoredUiThemePreset = () => {
  const storedPresetId = window.localStorage.getItem(UI_THEME_STORAGE_KEY);
  return uiThemePresets.find((preset) => preset.id === storedPresetId) || uiThemePresets[0]!;
};
