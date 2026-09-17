import { describe, expect, it } from 'vitest';
import { buildSelloutChartModel } from './selloutComparison';
import type { SelloutComparisonSeries } from '../types/selloutAnalytics';

const timeline: SelloutComparisonSeries = {
  level: 'chain',
  comparisonMode: 'timeline',
  displayPeriods: [{ year: 2026, week: 1 }, { year: 2026, week: 2 }, { year: 2026, week: 3 }],
  series: [{
    entity: 'Walmart', secondary: null,
    points: [
      { year: 2026, week: 1, kg: 10, sourceRowCount: 2 },
      { year: 2026, week: 3, kg: 20, sourceRowCount: 2 },
    ],
  }],
};

describe('selloutComparison', () => {
  it('conserva huecos en la linea cronologica', () => {
    const model = buildSelloutChartModel(timeline, 'kg');
    expect(model.categories).toEqual(['2026 · S01', '2026 · S02', '2026 · S03']);
    expect(model.series[0]?.values).toEqual([10, null, 20]);
  });

  it('solo crea indice cuando la primera semana tiene base positiva', () => {
    const indexed = buildSelloutChartModel(timeline, 'index');
    expect(indexed.series[0]?.values).toEqual([100, null, 200]);

    const zeroBase = structuredClone(timeline);
    zeroBase.series[0]!.points[0]!.kg = 0;
    const unavailable = buildSelloutChartModel(zeroBase, 'index');
    expect(unavailable.series[0]?.values).toEqual([null, null, null]);
    expect(unavailable.unavailableIndexSeries).toEqual(['Walmart']);
  });

  it('alinea los anos por semana y deja hueco para semana 53 ausente', () => {
    const annual: SelloutComparisonSeries = {
      level: 'sku', comparisonMode: 'yearOverYear',
      displayPeriods: [{ year: 2026, week: 52 }, { year: 2026, week: 53 }],
      series: [{
        entity: 'SKU-1', secondary: 'Marca',
        points: [
          { year: 2025, week: 52, kg: 8, sourceRowCount: 1 },
          { year: 2026, week: 52, kg: 10, sourceRowCount: 1 },
          { year: 2026, week: 53, kg: 12, sourceRowCount: 1 },
        ],
      }],
    };
    const model = buildSelloutChartModel(annual, 'kg');
    expect(model.categories).toEqual(['S52', 'S53']);
    expect(model.series[0]?.rawKg).toEqual([8, null]);
    expect(model.series[1]?.rawKg).toEqual([10, 12]);
  });
});
