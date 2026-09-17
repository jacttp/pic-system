import type {
  SelloutComparisonMeasure,
  SelloutComparisonMode,
  SelloutComparisonSeries,
  SelloutPeriodKey,
} from '../types/selloutAnalytics';

export interface SelloutChartSeries {
  id: string;
  name: string;
  values: Array<number | null>;
  rawKg: Array<number | null>;
  indexBaseValid: boolean;
}

export interface SelloutChartModel {
  categories: string[];
  series: SelloutChartSeries[];
  unavailableIndexSeries: string[];
}

const periodKey = (period: SelloutPeriodKey) => `${period.year}-${period.week}`;
const periodLabel = (period: SelloutPeriodKey, mode: SelloutComparisonMode) => (
  mode === 'yearOverYear'
    ? `S${String(period.week).padStart(2, '0')}`
    : `${period.year} · S${String(period.week).padStart(2, '0')}`
);

const indexedValues = (values: Array<number | null>, measure: SelloutComparisonMeasure) => {
  if (measure === 'kg') return { values, baseValid: true };
  const base = values[0];
  if (base === null || base <= 0) {
    return { values: values.map(() => null), baseValid: false };
  }
  return {
    values: values.map(value => value === null ? null : (value / base) * 100),
    baseValid: true,
  };
};

export const buildSelloutChartModel = (
  data: SelloutComparisonSeries | null,
  measure: SelloutComparisonMeasure,
): SelloutChartModel => {
  if (!data) return { categories: [], series: [], unavailableIndexSeries: [] };
  const periods = data.displayPeriods;
  const categories = periods.map(period => periodLabel(period, data.comparisonMode));
  const result: SelloutChartSeries[] = [];

  data.series.forEach(item => {
    const points = new Map(item.points.map(point => [periodKey(point), point.kg]));
    if (data.comparisonMode === 'timeline') {
      const rawKg = periods.map(period => points.get(periodKey(period)) ?? null);
      const indexed = indexedValues(rawKg, measure);
      result.push({
        id: item.entity,
        name: item.secondary ? `${item.entity} · ${item.secondary}` : item.entity,
        values: indexed.values,
        rawKg,
        indexBaseValid: indexed.baseValid,
      });
      return;
    }

    const currentYear = periods[0]?.year;
    if (!currentYear) return;
    [currentYear - 1, currentYear].forEach(year => {
      const rawKg = periods.map(period => points.get(`${year}-${period.week}`) ?? null);
      const indexed = indexedValues(rawKg, measure);
      result.push({
        id: `${item.entity}-${year}`,
        name: `${item.entity} · ${year}`,
        values: indexed.values,
        rawKg,
        indexBaseValid: indexed.baseValid,
      });
    });
  });

  return {
    categories,
    series: result,
    unavailableIndexSeries: result.filter(item => !item.indexBaseValid).map(item => item.name),
  };
};
