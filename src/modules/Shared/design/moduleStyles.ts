export interface ModuleVisualStyle {
  color: string;
  bg: string;
  border: string;
  accent: string;
  desc: string;
}

export interface ModuleColorPreset {
  id: 'orange' | 'blue' | 'purple' | 'teal' | 'yellow';
  label: string;
  color: string;
  bg: string;
}

export const GLOBAL_MODULE_CARD_STYLE: Pick<ModuleVisualStyle, 'color' | 'bg' | 'accent'> = {
  color: 'text-pic-module',
  bg: 'bg-pic-module-bg',
  accent: 'bg-pic-module-soft',
};

export const MODULE_COLOR_PRESETS: ModuleColorPreset[] = [
  { id: 'orange', label: 'Naranja', color: 'text-pic-accent-orange', bg: 'bg-pic-accent-orange-soft' },
  { id: 'blue', label: 'Azul', color: 'text-pic-accent-blue', bg: 'bg-pic-accent-blue-soft' },
  { id: 'purple', label: 'Morado', color: 'text-pic-accent-purple', bg: 'bg-pic-accent-purple-soft' },
  { id: 'teal', label: 'Teal', color: 'text-pic-accent-teal', bg: 'bg-pic-accent-teal-soft' },
  { id: 'yellow', label: 'Amarillo', color: 'text-pic-accent-yellow', bg: 'bg-pic-accent-yellow-soft' },
];

// Compatibilidad para valores ya persistidos en SysModulesIC antes de usar el
// catalogo centralizado. Se conservan y se resuelven solo al activar override.
const LEGACY_ICON_COLOR_TOKENS: Record<string, string> = {
  'text-brand-600': 'text-pic-brand',
  'text-orange-500': 'text-pic-accent-orange',
  'text-emerald-500': 'text-pic-success',
  'text-purple-500': 'text-pic-accent-purple',
  'text-rose-800': 'text-pic-danger',
  'text-indigo-500': 'text-pic-info',
  'text-lime-600': 'text-pic-accent-yellow',
  'text-teal-600': 'text-pic-accent-teal',
  'text-pink-500': 'text-pic-accent-purple',
  'text-slate-500': 'text-pic-text-muted',
};

const LEGACY_BG_COLOR_TOKENS: Record<string, string> = {
  'bg-brand-50': 'bg-pic-brand-soft',
  'bg-orange-50': 'bg-pic-accent-orange-soft',
  'bg-emerald-50': 'bg-[hsl(var(--pic-success)/0.12)]',
  'bg-purple-50': 'bg-pic-accent-purple-soft',
  'bg-fuchsia-50': 'bg-pic-accent-purple-soft',
  'bg-slate-100': 'bg-pic-muted-surface',
  'bg-lime-50': 'bg-pic-accent-yellow-soft',
  'bg-teal-50': 'bg-pic-accent-teal-soft',
  'bg-pink-50': 'bg-pic-accent-purple-soft',
  'bg-slate-50': 'bg-pic-muted-surface',
};

const resolveModuleColor = (value?: string) => value ? LEGACY_ICON_COLOR_TOKENS[value] || value : undefined;
const resolveModuleBackground = (value?: string) => value ? LEGACY_BG_COLOR_TOKENS[value] || value : undefined;

export const getModuleColorPresetId = (mod: { IconColor?: string; BgColor?: string }): ModuleColorPreset['id'] | undefined => {
  const color = resolveModuleColor(mod.IconColor);
  const bg = resolveModuleBackground(mod.BgColor);
  return MODULE_COLOR_PRESETS.find(preset => preset.color === color && preset.bg === bg)?.id;
};

export const MODULE_VISUAL_STYLES: Record<string, ModuleVisualStyle> = {
  HUB: {
    color: 'text-pic-brand',
    bg: 'bg-pic-brand-soft',
    border: 'border-pic-brand',
    accent: 'bg-pic-brand',
    desc: 'Panel central de bienvenida y accesos rapidos.',
  },
  PIC: {
    color: 'text-pic-brand',
    bg: 'bg-pic-brand-soft',
    border: 'border-pic-brand',
    accent: 'bg-pic-brand',
    desc: 'Dashboard analitico de ventas y metas.',
  },
  PIC_RPT: {
    color: 'text-pic-brand',
    bg: 'bg-pic-brand-soft',
    border: 'border-pic-brand',
    accent: 'bg-pic-brand',
    desc: 'Dashboard analitico de ventas y metas.',
  },
  SEGMENT: {
    color: 'text-[hsl(var(--pic-accent-orange))]',
    bg: 'bg-[hsl(var(--pic-accent-orange-soft))]',
    border: 'border-[hsl(var(--pic-accent-orange))]',
    accent: 'bg-[hsl(var(--pic-accent-orange))]',
    desc: 'Segmentacion avanzada por volumen, cuartiles, quintiles y percentiles.',
  },
  CANNIB: {
    color: 'text-[hsl(var(--pic-accent-purple))]',
    bg: 'bg-[hsl(var(--pic-accent-purple-soft))]',
    border: 'border-[hsl(var(--pic-accent-purple))]',
    accent: 'bg-[hsl(var(--pic-accent-purple))]',
    desc: 'Analisis de canibalizacion de productos por volumen y clientes.',
  },
  LOGISTICS: {
    color: 'text-[hsl(var(--pic-accent-teal))]',
    bg: 'bg-[hsl(var(--pic-accent-teal-soft))]',
    border: 'border-[hsl(var(--pic-accent-teal))]',
    accent: 'bg-[hsl(var(--pic-accent-teal))]',
    desc: 'Gestion, edicion, alta y publicacion de rutas e itinerarios.',
  },
  PRODS: {
    color: 'text-[hsl(var(--pic-accent-blue))]',
    bg: 'bg-[hsl(var(--pic-accent-blue-soft))]',
    border: 'border-[hsl(var(--pic-accent-blue))]',
    accent: 'bg-[hsl(var(--pic-accent-blue))]',
    desc: 'Alta, baja y modificacion de articulos y listas de precios.',
  },
  PRODUCTS: {
    color: 'text-[hsl(var(--pic-accent-blue))]',
    bg: 'bg-[hsl(var(--pic-accent-blue-soft))]',
    border: 'border-[hsl(var(--pic-accent-blue))]',
    accent: 'bg-[hsl(var(--pic-accent-blue))]',
    desc: 'Alta, baja y modificacion de articulos y listas de precios.',
  },
  CLI: {
    color: 'text-pic-success',
    bg: 'bg-[hsl(var(--pic-success)/0.12)]',
    border: 'border-pic-success',
    accent: 'bg-pic-success',
    desc: 'Directorio comercial, segmentacion y datos de contacto.',
  },
  CLIENTS: {
    color: 'text-pic-success',
    bg: 'bg-[hsl(var(--pic-success)/0.12)]',
    border: 'border-pic-success',
    accent: 'bg-pic-success',
    desc: 'Directorio comercial, segmentacion y datos de contacto.',
  },
  COM_STRUCT: {
    color: 'text-pic-brand',
    bg: 'bg-pic-brand-soft',
    border: 'border-pic-brand',
    accent: 'bg-pic-brand',
    desc: 'Gestion de la estructura territorial comercial: gerencia, zona, jefatura y ruta.',
  },
  PVR: {
    color: 'text-[hsl(var(--pic-accent-orange))]',
    bg: 'bg-[hsl(var(--pic-accent-orange-soft))]',
    border: 'border-[hsl(var(--pic-accent-orange))]',
    accent: 'bg-[hsl(var(--pic-accent-orange))]',
    desc: 'Modulo del sistema.',
  },
  VAL_CLI: {
    color: 'text-[hsl(var(--pic-accent-purple))]',
    bg: 'bg-[hsl(var(--pic-accent-purple-soft))]',
    border: 'border-[hsl(var(--pic-accent-purple))]',
    accent: 'bg-[hsl(var(--pic-accent-purple))]',
    desc: 'Validacion y aprobacion de nuevos clientes.',
  },
  USERS: {
    color: 'text-[hsl(var(--pic-accent-blue))]',
    bg: 'bg-[hsl(var(--pic-accent-blue-soft))]',
    border: 'border-[hsl(var(--pic-accent-blue))]',
    accent: 'bg-[hsl(var(--pic-accent-blue))]',
    desc: 'Control de accesos, roles y administracion de personal del sistema.',
  },
  CPFR: {
    color: 'text-[hsl(var(--pic-accent-teal))]',
    bg: 'bg-[hsl(var(--pic-accent-teal-soft))]',
    border: 'border-[hsl(var(--pic-accent-teal))]',
    accent: 'bg-[hsl(var(--pic-accent-teal))]',
    desc: 'Modulo del sistema.',
  },
  CHAIN_CONFIG: {
    color: 'text-[hsl(var(--pic-accent-yellow))]',
    bg: 'bg-[hsl(var(--pic-accent-yellow-soft))]',
    border: 'border-[hsl(var(--pic-accent-yellow))]',
    accent: 'bg-[hsl(var(--pic-accent-yellow))]',
    desc: 'Asocia SKUs internos con cadenas, conversiones y parametros operativos CPFR.',
  },
  UPLOAD_OC: {
    color: 'text-[hsl(var(--pic-accent-orange))]',
    bg: 'bg-[hsl(var(--pic-accent-orange-soft))]',
    border: 'border-[hsl(var(--pic-accent-orange))]',
    accent: 'bg-[hsl(var(--pic-accent-orange))]',
    desc: 'Carga y seguimiento de ordenes de compra.',
  },
  UPLOAD_METAS: {
    color: 'text-[hsl(var(--pic-accent-yellow))]',
    bg: 'bg-[hsl(var(--pic-accent-yellow-soft))]',
    border: 'border-[hsl(var(--pic-accent-yellow))]',
    accent: 'bg-[hsl(var(--pic-accent-yellow))]',
    desc: 'Importa archivos Excel con metas de ventas y visualiza el historico.',
  },
  STOCK_ANALYTICS: {
    color: 'text-[hsl(var(--pic-accent-teal))]',
    bg: 'bg-[hsl(var(--pic-accent-teal-soft))]',
    border: 'border-[hsl(var(--pic-accent-teal))]',
    accent: 'bg-[hsl(var(--pic-accent-teal))]',
    desc: 'Analisis de inventario, cobertura y disponibilidad.',
  },
  CALBOOK: {
    color: 'text-[hsl(var(--pic-accent-blue))]',
    bg: 'bg-[hsl(var(--pic-accent-blue-soft))]',
    border: 'border-[hsl(var(--pic-accent-blue))]',
    accent: 'bg-[hsl(var(--pic-accent-blue))]',
    desc: 'Seguimiento operativo y ejecucion comercial.',
  },
  CALLBOOK: {
    color: 'text-[hsl(var(--pic-accent-blue))]',
    bg: 'bg-[hsl(var(--pic-accent-blue-soft))]',
    border: 'border-[hsl(var(--pic-accent-blue))]',
    accent: 'bg-[hsl(var(--pic-accent-blue))]',
    desc: 'Seguimiento operativo y ejecucion comercial.',
  },
  AUDIT: {
    color: 'text-[hsl(var(--pic-accent-purple))]',
    bg: 'bg-[hsl(var(--pic-accent-purple-soft))]',
    border: 'border-[hsl(var(--pic-accent-purple))]',
    accent: 'bg-[hsl(var(--pic-accent-purple))]',
    desc: 'Historial de movimientos y seguridad del sistema.',
  },
  DOCUMENTS: {
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    border: 'border-slate-400',
    accent: 'bg-slate-400',
    desc: 'Documentacion operativa del sistema.',
  },
  UI_STANDARDS: {
    color: 'text-pic-brand',
    bg: 'bg-pic-brand-soft',
    border: 'border-pic-brand',
    accent: 'bg-pic-brand',
    desc: 'Catalogo vivo de componentes STD, patrones visuales y tokens UI.',
  },
  SETUP: {
    color: 'text-slate-700',
    bg: 'bg-slate-100',
    border: 'border-slate-500',
    accent: 'bg-slate-500',
    desc: 'Configuracion de modulos, permisos y visibilidad del sistema.',
  },
  DEFAULT: {
    color: 'text-slate-500',
    bg: 'bg-slate-100',
    border: 'border-slate-300',
    accent: 'bg-slate-300',
    desc: 'Modulo del sistema.',
  },
};

export const getModuleVisualStyle = <T extends { ModuleKey?: string; IconColor?: string; BgColor?: string; Description?: string }>(mod: T, useCustomColors = false) => {
  const fallback = MODULE_VISUAL_STYLES[mod.ModuleKey || 'DEFAULT'] || MODULE_VISUAL_STYLES.DEFAULT;
  const color = useCustomColors ? resolveModuleColor(mod.IconColor) || GLOBAL_MODULE_CARD_STYLE.color : GLOBAL_MODULE_CARD_STYLE.color;
  const bg = useCustomColors ? resolveModuleBackground(mod.BgColor) || GLOBAL_MODULE_CARD_STYLE.bg : GLOBAL_MODULE_CARD_STYLE.bg;

  return {
    ...fallback,
    color,
    bg,
    accent: useCustomColors ? bg : GLOBAL_MODULE_CARD_STYLE.accent,
    desc: mod.Description || fallback.desc,
  };
};
