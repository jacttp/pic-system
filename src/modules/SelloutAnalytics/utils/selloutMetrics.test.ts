import { describe, expect, it } from 'vitest';
import { calculateHeatmapChanges, calculateSelloutMetrics } from './selloutMetrics';

const periods = Array.from({ length: 8 }, (_, index) => ({ year: 2026, week: index + 1 }));

describe('selloutMetrics', () => {
  it('calcula promedio observado, variación, tendencia 4 contra 4 y participación', () => {
    const values = periods.map((period, index) => ({ ...period, kg: (index + 1) * 10 }));
    const metrics = calculateSelloutMetrics(periods, values, 720);

    expect(metrics.averageKg).toBe(45);
    expect(metrics.weeklyDeltaKg).toBe(10);
    expect(metrics.weeklyDeltaPct).toBeCloseTo(14.285714);
    expect(metrics.trendPreviousAverageKg).toBe(25);
    expect(metrics.trendCurrentAverageKg).toBe(65);
    expect(metrics.trendDeltaKg).toBe(40);
    expect(metrics.trendDeltaPct).toBe(160);
    expect(metrics.participationPct).toBe(50);
  });

  it('no inventa porcentaje con base cero ni tendencia con ventanas incompletas', () => {
    const values = [
      { year: 2026, week: 1, kg: 5 },
      { year: 2026, week: 7, kg: 0 },
      { year: 2026, week: 8, kg: 10 },
    ];
    const metrics = calculateSelloutMetrics(periods, values, -5);

    expect(metrics.observedWeeks).toBe(3);
    expect(metrics.averageKg).toBe(5);
    expect(metrics.weeklyDeltaKg).toBe(10);
    expect(metrics.weeklyDeltaPct).toBeNull();
    expect(metrics.trendDeltaKg).toBeNull();
    expect(metrics.participationPct).toBeNull();
  });

  it('mantiene ausencias separadas de cero al calcular cambios del mapa', () => {
    const changes = calculateHeatmapChanges(periods.slice(0, 4), [
      { year: 2026, week: 1, kg: 0 },
      { year: 2026, week: 2, kg: 4 },
      { year: 2026, week: 4, kg: -2 },
    ]);

    expect(changes).toEqual([null, 4, null, null]);
  });
});
