// src/modules/PVR/utils/pvrFormatters.ts

const mxCurrency = new Intl.NumberFormat('es-MX', {
   style: 'currency',
   currency: 'MXN',
   minimumFractionDigits: 0,
   maximumFractionDigits: 0,
});

const mxNumber = new Intl.NumberFormat('es-MX', {
   minimumFractionDigits: 0,
   maximumFractionDigits: 0,
});

const mxDecimal = new Intl.NumberFormat('es-MX', {
   minimumFractionDigits: 1,
   maximumFractionDigits: 1,
});

const mxRatio = new Intl.NumberFormat('es-MX', {
   minimumFractionDigits: 2,
   maximumFractionDigits: 2,
});

/** $1,250,000 — para montos grandes */
export const fmtCurrency = (v: number | null): string =>
   v === null || v === undefined ? '—' : mxCurrency.format(v);

/** 45,000 — para KG */
export const fmtKg = (v: number | null): string =>
   v === null || v === undefined ? '—' : mxNumber.format(v);

/** $98.50 — para precio $/kg */
export const fmtPrice = (v: number | null): string => {
   if (v === null || v === undefined) return '—';
   return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
   }).format(v);
};

/** -12.50% — para porcentajes con 2 decimales (multiplica x100 internamente) */
export const fmtPct = (v: number | null): string => {
   if (v === null || v === undefined) return '—';
   return mxRatio.format(v * 100) + '%';
};

/** Devuelve clase Tailwind de color según signo del valor */
export const colorClass = (
   v: number | null,
   positiveIsGood = true,
): string => {
   if (v === null || v === undefined || v === 0) return 'text-slate-500';
   if (positiveIsGood) return v > 0 ? 'text-emerald-600' : 'text-red-500';
   // Para rebajas: negativo es "normal", positivo es alarma
   return v < 0 ? 'text-slate-600' : 'text-red-500';
};

/** Nombres de mes por índice 0-based */
export const MONTH_LABELS = [
   'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
   'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];