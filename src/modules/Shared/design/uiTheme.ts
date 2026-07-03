export interface UiThemePalette {
  id: string;
  name: string;
  description: string;
  isSystem?: boolean;
  tokens: Record<string, string>;
}

export interface UiThemeCatalog {
  activePaletteId: string;
  palettes: UiThemePalette[];
}

export interface UiThemeTokenDefinition {
  token: string;
  label: string;
  usage: string;
  group: 'base' | 'navigation' | 'state' | 'module' | 'chart';
}

export const UI_THEME_CATALOG_STORAGE_KEY = 'pic-system:ui-theme-catalog';
export const LEGACY_UI_THEME_STORAGE_KEY = 'pic-system:ui-theme-preset';

export const uiThemeTokenDefinitions: UiThemeTokenDefinition[] = [
  { token: '--pic-brand', label: 'Marca principal', usage: 'CTA, foco, activo y acento institucional', group: 'base' },
  { token: '--pic-brand-soft', label: 'Marca suave', usage: 'Hover suave, icon wells y fondos seleccionados', group: 'base' },
  { token: '--pic-brand-border', label: 'Borde de marca', usage: 'Contornos activos, focus ring y separadores destacados', group: 'base' },
  { token: '--pic-surface', label: 'Surface', usage: 'Paneles, cards y tablas', group: 'base' },
  { token: '--pic-background', label: 'Background', usage: 'Fondo operativo de modulos', group: 'base' },
  { token: '--pic-muted-surface', label: 'Muted surface', usage: 'Bloques internos, toolbars y zonas de apoyo', group: 'base' },
  { token: '--pic-text-main', label: 'Texto principal', usage: 'Titulos y valores clave', group: 'base' },
  { token: '--pic-text-muted', label: 'Texto secundario', usage: 'Descripciones y metadatos', group: 'base' },
  { token: '--pic-border', label: 'Borde neutral', usage: 'Separadores y contornos generales', group: 'base' },
  { token: '--pic-nav', label: 'Navegacion', usage: 'Sidebar y superficies oscuras de acceso rapido', group: 'navigation' },
  { token: '--pic-nav-muted', label: 'Navegacion secundaria', usage: 'Hover, bordes y paneles internos sobre sidebar oscuro', group: 'navigation' },
  { token: '--pic-nav-text', label: 'Texto navegacion', usage: 'Texto principal sobre navegacion oscura', group: 'navigation' },
  { token: '--pic-nav-text-muted', label: 'Texto navegacion suave', usage: 'Categorias, iconos inactivos y metadatos del sidebar', group: 'navigation' },
  { token: '--pic-success', label: 'Success', usage: 'Estados completados o positivos', group: 'state' },
  { token: '--pic-warning', label: 'Warning', usage: 'Advertencias operativas', group: 'state' },
  { token: '--pic-danger', label: 'Danger', usage: 'Errores y acciones destructivas', group: 'state' },
  { token: '--pic-info', label: 'Info', usage: 'Mensajes informativos y ayuda contextual', group: 'state' },
  { token: '--pic-accent-orange', label: 'Modulo naranja', usage: 'Segmentacion, cargas y acciones secundarias', group: 'module' },
  { token: '--pic-accent-orange-soft', label: 'Modulo naranja suave', usage: 'Fondos de icono y hover naranja', group: 'module' },
  { token: '--pic-accent-blue', label: 'Modulo azul', usage: 'Usuarios, productos y consultas', group: 'module' },
  { token: '--pic-accent-blue-soft', label: 'Modulo azul suave', usage: 'Fondos de icono y hover azul', group: 'module' },
  { token: '--pic-accent-purple', label: 'Modulo morado', usage: 'Historial, validaciones y analitica secundaria', group: 'module' },
  { token: '--pic-accent-purple-soft', label: 'Modulo morado suave', usage: 'Fondos de icono y hover morado', group: 'module' },
  { token: '--pic-accent-teal', label: 'Modulo teal', usage: 'Logistica, CPFR y operaciones', group: 'module' },
  { token: '--pic-accent-teal-soft', label: 'Modulo teal suave', usage: 'Fondos de icono y hover teal', group: 'module' },
  { token: '--pic-accent-yellow', label: 'Modulo amarillo', usage: 'Cadenas, avisos y estados de apoyo', group: 'module' },
  { token: '--pic-accent-yellow-soft', label: 'Modulo amarillo suave', usage: 'Fondos de icono y hover amarillo', group: 'module' },
  { token: '--pic-chart-1', label: 'Chart 1', usage: 'Serie principal', group: 'chart' },
  { token: '--pic-chart-2', label: 'Chart 2', usage: 'Serie comparativa', group: 'chart' },
  { token: '--pic-chart-3', label: 'Chart 3', usage: 'Serie informativa', group: 'chart' },
  { token: '--pic-chart-4', label: 'Chart 4', usage: 'Serie alerta', group: 'chart' },
  { token: '--pic-chart-5', label: 'Chart 5', usage: 'Serie neutral', group: 'chart' },
];

export const editableUiThemeTokens = uiThemeTokenDefinitions.map((item) => item.token);

export const defaultUiThemeCatalog: UiThemeCatalog = {
  activePaletteId: 'pic-red',
  palettes: [
    {
      id: 'pic-red',
      name: 'PIC Rojo',
      description: 'Paleta institucional mobile first con navegacion navy y acentos operativos.',
      isSystem: true,
      tokens: {
        '--pic-brand': '357 84% 45%',
        '--pic-brand-soft': '0 86% 97%',
        '--pic-brand-border': '0 96% 89%',
        '--pic-surface': '0 0% 100%',
        '--pic-background': '216 33% 97%',
        '--pic-muted-surface': '214 36% 96%',
        '--pic-text-main': '224 39% 12%',
        '--pic-text-muted': '218 18% 43%',
        '--pic-border': '216 28% 88%',
        '--pic-nav': '221 45% 10%',
        '--pic-nav-muted': '221 36% 18%',
        '--pic-nav-text': '210 40% 98%',
        '--pic-nav-text-muted': '216 18% 72%',
        '--pic-success': '160 84% 34%',
        '--pic-warning': '32 95% 44%',
        '--pic-danger': '0 72% 51%',
        '--pic-info': '221 83% 53%',
        '--pic-accent-orange': '25 95% 53%',
        '--pic-accent-orange-soft': '26 100% 94%',
        '--pic-accent-blue': '221 83% 58%',
        '--pic-accent-blue-soft': '220 100% 96%',
        '--pic-accent-purple': '268 77% 60%',
        '--pic-accent-purple-soft': '268 100% 96%',
        '--pic-accent-teal': '174 72% 32%',
        '--pic-accent-teal-soft': '174 58% 93%',
        '--pic-accent-yellow': '40 92% 52%',
        '--pic-accent-yellow-soft': '43 100% 93%',
        '--pic-chart-1': '357 84% 45%',
        '--pic-chart-2': '25 95% 53%',
        '--pic-chart-3': '221 83% 58%',
        '--pic-chart-4': '32 95% 44%',
        '--pic-chart-5': '268 77% 60%',
      },
    },
    {
      id: 'trade-blue',
      name: 'Trade Azul',
      description: 'Acento frio para vistas analiticas.',
      isSystem: true,
      tokens: {
        '--pic-brand': '214 90% 45%',
        '--pic-brand-soft': '214 100% 97%',
        '--pic-brand-border': '213 94% 88%',
        '--pic-surface': '0 0% 100%',
        '--pic-background': '210 40% 98%',
        '--pic-muted-surface': '210 40% 98%',
        '--pic-text-main': '222 47% 11%',
        '--pic-text-muted': '215 16% 47%',
        '--pic-border': '214 32% 91%',
        '--pic-nav': '221 45% 10%',
        '--pic-nav-muted': '221 36% 18%',
        '--pic-nav-text': '210 40% 98%',
        '--pic-nav-text-muted': '216 18% 72%',
        '--pic-success': '160 84% 34%',
        '--pic-warning': '32 95% 44%',
        '--pic-danger': '0 72% 51%',
        '--pic-info': '199 89% 48%',
        '--pic-accent-orange': '25 95% 53%',
        '--pic-accent-orange-soft': '26 100% 94%',
        '--pic-accent-blue': '221 83% 58%',
        '--pic-accent-blue-soft': '220 100% 96%',
        '--pic-accent-purple': '268 77% 60%',
        '--pic-accent-purple-soft': '268 100% 96%',
        '--pic-accent-teal': '174 72% 32%',
        '--pic-accent-teal-soft': '174 58% 93%',
        '--pic-accent-yellow': '40 92% 52%',
        '--pic-accent-yellow-soft': '43 100% 93%',
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
      isSystem: true,
      tokens: {
        '--pic-brand': '174 72% 32%',
        '--pic-brand-soft': '166 76% 97%',
        '--pic-brand-border': '170 76% 82%',
        '--pic-surface': '0 0% 100%',
        '--pic-background': '210 40% 98%',
        '--pic-muted-surface': '210 40% 98%',
        '--pic-text-main': '222 47% 11%',
        '--pic-text-muted': '215 16% 47%',
        '--pic-border': '214 32% 91%',
        '--pic-nav': '221 45% 10%',
        '--pic-nav-muted': '221 36% 18%',
        '--pic-nav-text': '210 40% 98%',
        '--pic-nav-text-muted': '216 18% 72%',
        '--pic-success': '160 84% 34%',
        '--pic-warning': '32 95% 44%',
        '--pic-danger': '0 72% 51%',
        '--pic-info': '199 89% 48%',
        '--pic-accent-orange': '25 95% 53%',
        '--pic-accent-orange-soft': '26 100% 94%',
        '--pic-accent-blue': '221 83% 58%',
        '--pic-accent-blue-soft': '220 100% 96%',
        '--pic-accent-purple': '268 77% 60%',
        '--pic-accent-purple-soft': '268 100% 96%',
        '--pic-accent-teal': '174 72% 32%',
        '--pic-accent-teal-soft': '174 58% 93%',
        '--pic-accent-yellow': '40 92% 52%',
        '--pic-accent-yellow-soft': '43 100% 93%',
        '--pic-chart-1': '174 72% 32%',
        '--pic-chart-2': '221 83% 53%',
        '--pic-chart-3': '32 95% 44%',
        '--pic-chart-4': '357 84% 45%',
        '--pic-chart-5': '215 16% 47%',
      },
    },
  ],
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const cloneUiThemeCatalog = (catalog: UiThemeCatalog = defaultUiThemeCatalog): UiThemeCatalog => ({
  activePaletteId: catalog.activePaletteId,
  palettes: catalog.palettes.map((palette) => ({
    ...palette,
      tokens: { ...defaultUiThemeCatalog.palettes[0]!.tokens, ...palette.tokens },
  })),
});

export const hslTripletToHex = (value: string) => {
  const [hue = '0', saturation = '0%', lightness = '0%'] = value.trim().split(/\s+/);
  const h = clamp(Number(hue), 0, 360) / 360;
  const s = clamp(Number(saturation.replace('%', '')), 0, 100) / 100;
  const l = clamp(Number(lightness.replace('%', '')), 0, 100) / 100;

  if (s === 0) {
    const gray = Math.round(l * 255).toString(16).padStart(2, '0');
    return `#${gray}${gray}${gray}`;
  }

  const hueToRgb = (p: number, q: number, tValue: number) => {
    let t = tValue;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = hueToRgb(p, q, h + 1 / 3);
  const g = hueToRgb(p, q, h);
  const b = hueToRgb(p, q, h - 1 / 3);

  return `#${[r, g, b].map((channel) => Math.round(channel * 255).toString(16).padStart(2, '0')).join('')}`;
};

export const hexToHslTriplet = (hex: string) => {
  const normalized = hex.replace('#', '');
  const fullHex = normalized.length === 3
    ? normalized.split('').map((char) => `${char}${char}`).join('')
    : normalized;

  const r = parseInt(fullHex.slice(0, 2), 16) / 255;
  const g = parseInt(fullHex.slice(2, 4), 16) / 255;
  const b = parseInt(fullHex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    if (max === g) h = (b - r) / d + 2;
    if (max === b) h = (r - g) / d + 4;
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

export const applyUiThemePalette = (palette: UiThemePalette) => {
  Object.entries(palette.tokens).forEach(([token, value]) => {
    if (editableUiThemeTokens.includes(token)) {
      document.documentElement.style.setProperty(token, value);
    }
  });
};

export const getActiveUiThemePalette = (catalog: UiThemeCatalog) => {
  return catalog.palettes.find((palette) => palette.id === catalog.activePaletteId) || catalog.palettes[0] || defaultUiThemeCatalog.palettes[0]!;
};

export const saveUiThemeCatalogCache = (catalog: UiThemeCatalog) => {
  window.localStorage.setItem(UI_THEME_CATALOG_STORAGE_KEY, JSON.stringify(catalog));
  window.localStorage.setItem(LEGACY_UI_THEME_STORAGE_KEY, catalog.activePaletteId);
};

export const getStoredUiThemeCatalog = () => {
  try {
    const stored = window.localStorage.getItem(UI_THEME_CATALOG_STORAGE_KEY);
    if (!stored) {
      const legacyActivePaletteId = window.localStorage.getItem(LEGACY_UI_THEME_STORAGE_KEY);
      const catalog = cloneUiThemeCatalog();
      if (legacyActivePaletteId && catalog.palettes.some((palette) => palette.id === legacyActivePaletteId)) {
        catalog.activePaletteId = legacyActivePaletteId;
      }
      return catalog;
    }
    const parsed = JSON.parse(stored) as UiThemeCatalog;
    if (!parsed?.activePaletteId || !Array.isArray(parsed.palettes)) return cloneUiThemeCatalog();
    return cloneUiThemeCatalog(parsed);
  } catch {
    return cloneUiThemeCatalog();
  }
};

export const applyCachedUiThemeCatalog = () => {
  const catalog = getStoredUiThemeCatalog();
  applyUiThemePalette(getActiveUiThemePalette(catalog));
  return catalog;
};
