import type {
  SelloutMatrixValue,
  SelloutPeriodKey,
} from '../types/selloutAnalytics';

export interface SelloutSeriesMetrics {
  totalKg: number;
  observedWeeks: number;
  requestedWeeks: number;
  averageKg: number | null;
  latestKg: number | null;
  previousKg: number | null;
  weeklyDeltaKg: number | null;
  weeklyDeltaPct: number | null;
  trendDeltaKg: number | null;
  trendDeltaPct: number | null;
  trendCurrentAverageKg: number | null;
  trendPreviousAverageKg: number | null;
  participationPct: number | null;
}

const periodKey = (period: SelloutPeriodKey) => `${period.year}-${period.week}`;

export const calculateSelloutMetrics = (
  periods: SelloutPeriodKey[],
  values: Array<Pick<SelloutMatrixValue, 'year' | 'week' | 'kg'>>,
  overallTotalKg?: number,
): SelloutSeriesMetrics => {
  const valueMap = new Map(values.map(value => [periodKey(value), Number(value.kg)]));
  const ordered = periods.map(period => valueMap.get(periodKey(period)) ?? null);
  const observed = ordered.filter((value): value is number => value !== null);
  const totalKg = observed.reduce((total, value) => total + value, 0);
  const latestKg = ordered.at(-1) ?? null;
  const previousKg = ordered.length > 1 ? ordered.at(-2) ?? null : null;
  const weeklyDeltaKg = latestKg === null || previousKg === null ? null : latestKg - previousKg;
  const weeklyDeltaPct = weeklyDeltaKg === null || previousKg === 0
    ? null
    : (weeklyDeltaKg / previousKg) * 100;

  const currentWindow = ordered.slice(-4);
  const previousWindow = ordered.slice(-8, -4);
  const completeTrend = currentWindow.length === 4
    && previousWindow.length === 4
    && [...currentWindow, ...previousWindow].every(value => value !== null);
  const currentAverage = completeTrend
    ? currentWindow.reduce<number>((total, value) => total + Number(value), 0) / 4
    : null;
  const previousAverage = completeTrend
    ? previousWindow.reduce<number>((total, value) => total + Number(value), 0) / 4
    : null;
  const trendDeltaKg = currentAverage === null || previousAverage === null
    ? null
    : currentAverage - previousAverage;
  const trendDeltaPct = trendDeltaKg === null || previousAverage === 0
    ? null
    : (trendDeltaKg / previousAverage) * 100;

  return {
    totalKg,
    observedWeeks: observed.length,
    requestedWeeks: periods.length,
    averageKg: observed.length ? totalKg / observed.length : null,
    latestKg,
    previousKg,
    weeklyDeltaKg,
    weeklyDeltaPct,
    trendDeltaKg,
    trendDeltaPct,
    trendCurrentAverageKg: currentAverage,
    trendPreviousAverageKg: previousAverage,
    participationPct: overallTotalKg !== undefined && overallTotalKg > 0
      ? (totalKg / overallTotalKg) * 100
      : null,
  };
};

export const calculateHeatmapChanges = (
  periods: SelloutPeriodKey[],
  values: Array<Pick<SelloutMatrixValue, 'year' | 'week' | 'kg'>>,
): Array<number | null> => {
  const valueMap = new Map(values.map(value => [periodKey(value), Number(value.kg)]));
  const ordered = periods.map(period => valueMap.get(periodKey(period)) ?? null);
  return ordered.map((value, index) => {
    if (index === 0 || value === null || ordered[index - 1] === null) return null;
    return value - Number(ordered[index - 1]);
  });
};
