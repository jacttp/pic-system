import type { CanvasMetric } from '../types/canvasTypes';

const kgFormatter = new Intl.NumberFormat('es-MX', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat('es-MX', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat('es-MX', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const scoreFormatter = new Intl.NumberFormat('es-MX', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
});

export const formatCanvasKg = (value: number | null) => value === null
  ? 'Sin dato'
  : `${kgFormatter.format(value)} kg`;

export const formatCanvasCompactKg = (value: number) => `${compactFormatter.format(value)} kg`;

export const formatCanvasMetric = (value: number | null, metric: CanvasMetric) => {
  if (value === null || !Number.isFinite(value)) return 'Sin variación suficiente';
  if (metric === 'lossShare') return percentFormatter.format(value);
  if (metric === 'peerDeviation') return scoreFormatter.format(value);
  return formatCanvasKg(value);
};

export const formatCanvasPercent = (value: number | null) => value === null
  ? '—'
  : percentFormatter.format(value);

export const formatCanvasScore = (value: number | null) => value === null
  ? '—'
  : scoreFormatter.format(value);

export const escapeCanvasHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

export const buildCanvasSparkline = (values: number[]) => {
  if (values.length < 2) return 'M2 17 L100 17';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values.map((value, index) => {
    const x = 2 + (98 * index) / (values.length - 1);
    const y = 30 - ((value - min) / span) * 24;
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
};
