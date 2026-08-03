import type { Pic52DataState, Pic52Report } from '../types/pic52';

export type Pic52Metric = 'kg' | 'pesos';

export interface Pic52Comparison {
  difference: number | null;
  percentage: number | null;
}

export interface Pic52MetricRow extends Pic52Comparison {
  week: number;
  values: Record<number, number | null>;
}

export interface Pic52MetricTable {
  years: number[];
  referenceYear: number | null;
  previousYear: number | null;
  rows: Pic52MetricRow[];
  totals: Pic52MetricRow;
}

const observedValue = (
  value: number | null,
  dataState: Pic52DataState,
): number | null => (
  dataState === 'observed' && typeof value === 'number' && Number.isFinite(value)
    ? value
    : null
);

export const calculateComparison = (
  referenceValue: number | null,
  previousValue: number | null,
): Pic52Comparison => {
  if (referenceValue === null || previousValue === null) {
    return { difference: null, percentage: null };
  }

  const difference = referenceValue - previousValue;
  return {
    difference,
    percentage: previousValue === 0 ? null : (difference / previousValue) * 100,
  };
};

export const sumComparablePercentages = (
  rows: Pick<Pic52MetricRow, 'percentage'>[],
): number | null => {
  const percentages = rows
    .map(row => row.percentage)
    .filter((value): value is number => value !== null)
    .map(value => Math.round(value * 10) / 10);

  return percentages.length
    ? percentages.reduce((total, value) => total + value, 0)
    : null;
};

export const buildMetricTable = (
  report: Pic52Report,
  metric: Pic52Metric,
): Pic52MetricTable => {
  const years = [...report.years].sort((left, right) => left - right);
  const referenceYear = years.length ? years[years.length - 1]! : null;
  const previousYear = years.length > 1 ? years[years.length - 2]! : null;
  const seriesByYear = new Map(report.series.map(series => [series.year, series]));

  const rows = [...report.weeks]
    .sort((left, right) => left - right)
    .map((week): Pic52MetricRow => {
      const values: Record<number, number | null> = {};

      years.forEach(year => {
        const point = seriesByYear.get(year)?.points.find(item => item.week === week);
        values[year] = point
          ? observedValue(point[metric], point.dataState)
          : null;
      });

      const comparison = calculateComparison(
        referenceYear === null ? null : values[referenceYear],
        previousYear === null ? null : values[previousYear],
      );

      return { week, values, ...comparison };
    });

  const totalValues: Record<number, number | null> = {};
  years.forEach(year => {
    const observed = rows
      .map(row => row.values[year])
      .filter((value): value is number => value !== null);
    totalValues[year] = observed.length
      ? observed.reduce((total, value) => total + value, 0)
      : null;
  });

  const totalComparison = calculateComparison(
    referenceYear === null ? null : totalValues[referenceYear],
    previousYear === null ? null : totalValues[previousYear],
  );
  const totalPercentage = sumComparablePercentages(rows);

  return {
    years,
    referenceYear,
    previousYear,
    rows,
    totals: {
      week: 0,
      values: totalValues,
      difference: totalComparison.difference,
      percentage: totalPercentage,
    },
  };
};
