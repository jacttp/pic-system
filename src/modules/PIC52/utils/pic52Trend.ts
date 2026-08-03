import type {
  Pic52TrendData,
  Pic52TrendSeries,
} from '../types/pic52';
import type { Pic52Metric } from './pic52Report';

export type Pic52TrendMode = 'total' | 'product' | 'transaction' | 'combined';

export interface Pic52TrendDisplaySeries {
  key: string;
  label: string;
  productValue: string | null;
  transactionValue: string | null;
  values: Array<number | null>;
}

const groupKey = (series: Pic52TrendSeries, mode: Pic52TrendMode) => {
  if (mode === 'product') return series.productValue ?? '__all__';
  if (mode === 'transaction') return series.transaction.value;
  if (mode === 'combined') return series.key;
  return '__total__';
};

const groupLabel = (series: Pic52TrendSeries, mode: Pic52TrendMode) => {
  if (mode === 'product') return series.productValue ?? 'Total seleccionado';
  if (mode === 'transaction') return series.transaction.label;
  if (mode === 'combined') return series.label;
  return 'Total seleccionado';
};

export const trendSeriesCount = (trend: Pic52TrendData, mode: Pic52TrendMode) => {
  if (mode === 'product') return trend.productValues.length;
  if (mode === 'transaction') return trend.transactions.length;
  if (mode === 'combined') {
    return Math.max(1, trend.productValues.length) * trend.transactions.length;
  }
  return 1;
};

export const buildTrendDisplaySeries = (
  trend: Pic52TrendData,
  mode: Pic52TrendMode,
  metric: Pic52Metric,
): Pic52TrendDisplaySeries[] => {
  const groups = new Map<string, {
    label: string;
    productValue: string | null;
    transactionValue: string | null;
    series: Pic52TrendSeries[];
  }>();

  trend.series.forEach(series => {
    const key = groupKey(series, mode);
    const current = groups.get(key);
    if (current) {
      current.series.push(series);
      return;
    }
    groups.set(key, {
      label: groupLabel(series, mode),
      productValue: mode === 'product' || mode === 'combined' ? series.productValue : null,
      transactionValue:
        mode === 'transaction' || mode === 'combined'
          ? series.transaction.value
          : null,
      series: [series],
    });
  });

  if (groups.size === 0 && mode === 'total') {
    groups.set('__total__', {
      label: 'Total seleccionado',
      productValue: null,
      transactionValue: null,
      series: [],
    });
  }

  return [...groups.entries()].map(([key, group]) => {
    const pointMaps = group.series.map(series => new Map(
      series.points.map(point => [point.year + ':' + point.week, point]),
    ));
    const values = trend.timeline.map(period => {
      let observed = false;
      let total = 0;
      pointMaps.forEach(pointMap => {
        const point = pointMap.get(period.key);
        const value = point?.[metric];
        if (point?.dataState === 'observed' && typeof value === 'number') {
          observed = true;
          total += value;
        }
      });
      return observed ? total : null;
    });

    return {
      key,
      label: group.label,
      productValue: group.productValue,
      transactionValue: group.transactionValue,
      values,
    };
  });
};
