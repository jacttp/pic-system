import { describe, expect, it } from 'vitest';
import type { CanvasRow } from '../types/canvasTypes';
import {
  analyzeCanvasRows,
  buildCanvasBreakdownSeries,
  CANVAS_RESULT_RANGES,
  canvasVisualColorValue,
  canvasDivergingBarValue,
  createCanvasAxisConfig,
  getCanvasResultRange,
  resolveCanvasFilterDimension,
} from './canvasAnalytics';

const row = (
  id: string,
  cadena: string,
  linea: string,
  familia: string,
  diferencia: number,
): CanvasRow => ({ id, sourceRow: Number(id), cadena, linea, familia, diferencia });

const rows = [
  row('2', 'A', 'Granel', 'F1', -10),
  row('3', 'A', 'Paquetería', 'F1', 5),
  row('4', 'B', 'Granel', 'F1', -20),
  row('5', 'B', 'Paquetería', 'F1', 10),
  row('6', 'C', 'Granel', 'F1', 30),
  row('7', 'A', 'Granel', 'F2', -2),
];

describe('analyzeCanvasRows', () => {
  it('agrega filtros múltiples, conserva cobertura y deja combinaciones ausentes nulas', () => {
    const result = analyzeCanvasRows(
      rows,
      createCanvasAxisConfig('cadena', 'familia'),
      ['Granel', 'Paquetería'],
      'netDifference',
    );

    const aF1 = result.cells.find((cell) => cell.x === 'A' && cell.y === 'F1');
    const cF2 = result.cells.find((cell) => cell.x === 'C' && cell.y === 'F2');

    expect(aF1).toMatchObject({ netDifference: -5, observedCount: 2, expectedCount: 2 });
    expect(cF2).toMatchObject({ netDifference: null, metricValue: null });
    expect(result.missingCells).toHaveLength(2);
    expect(result.kpis).toMatchObject({
      netDifference: 13,
      grossLoss: 32,
      gains: 45,
      observedCombinations: 6,
      expectedCombinations: 12,
    });
  });

  it('calcula participación sobre la pérdida bruta del filtro activo', () => {
    const result = analyzeCanvasRows(
      rows,
      createCanvasAxisConfig('cadena', 'familia'),
      ['Granel', 'Paquetería'],
      'lossShare',
    );

    const aF1 = result.cells.find((cell) => cell.x === 'A' && cell.y === 'F1');
    expect(aF1?.grossLoss).toBe(10);
    expect(aF1?.lossShare).toBeCloseTo(10 / 32, 10);
  });

  it('calcula score robusto entre pares y usa null si no hay muestra o MAD', () => {
    const result = analyzeCanvasRows(
      rows,
      createCanvasAxisConfig('cadena', 'familia'),
      ['Granel', 'Paquetería'],
      'peerDeviation',
    );

    const cF1 = result.cells.find((cell) => cell.x === 'C' && cell.y === 'F1');
    const aF2 = result.cells.find((cell) => cell.x === 'A' && cell.y === 'F2');
    expect(cF1?.peerMedian).toBe(-5);
    expect(cF1?.peerMad).toBe(5);
    expect(cF1?.peerDeviation).toBeCloseTo(4.7215, 4);
    expect(aF2?.peerDeviation).toBeNull();

    const flat = [
      row('8', 'A', 'Granel', 'F1', 2),
      row('9', 'B', 'Granel', 'F1', 2),
      row('10', 'C', 'Granel', 'F1', 2),
    ];
    expect(analyzeCanvasRows(
      flat,
      createCanvasAxisConfig('cadena', 'familia'),
      ['Granel'],
      'peerDeviation',
    ).observedCells.every((cell) => cell.peerDeviation === null)).toBe(true);
  });

  it('resuelve la tercera dimensión al intercambiar ejes', () => {
    expect(resolveCanvasFilterDimension('linea', 'familia')).toBe('cadena');
    expect(resolveCanvasFilterDimension('familia', 'cadena')).toBe('linea');
  });

  it('clasifica la diferencia en rangos fijos y permite usar el resultado como eje', () => {
    expect(getCanvasResultRange(-50_001)).toBe(CANVAS_RESULT_RANGES[0]);
    expect(getCanvasResultRange(-50_000)).toBe(CANVAS_RESULT_RANGES[1]);
    expect(getCanvasResultRange(-1_000)).toBe(CANVAS_RESULT_RANGES[3]);
    expect(getCanvasResultRange(0)).toBe(CANVAS_RESULT_RANGES[4]);
    expect(getCanvasResultRange(999)).toBe(CANVAS_RESULT_RANGES[5]);
    expect(getCanvasResultRange(10_000)).toBe(CANVAS_RESULT_RANGES[7]);

    const result = analyzeCanvasRows(
      rows,
      createCanvasAxisConfig('resultado', 'cadena'),
      ['Granel', 'Paquetería'],
      'netDifference',
    );
    const aLossLow = result.cells.find((cell) => cell.x === CANVAS_RESULT_RANGES[3] && cell.y === 'A');
    const aGainLow = result.cells.find((cell) => cell.x === CANVAS_RESULT_RANGES[5] && cell.y === 'A');
    const emptyCritical = result.cells.find((cell) => cell.x === CANVAS_RESULT_RANGES[0] && cell.y === 'A');

    expect(result.axis.filter).toBe('linea');
    expect(result.xValues).toEqual(CANVAS_RESULT_RANGES);
    expect(aLossLow).toMatchObject({ netDifference: -12, observedCount: 2, expectedCount: 4 });
    expect(aGainLow).toMatchObject({ netDifference: 5, observedCount: 1 });
    expect(emptyCritical).toMatchObject({ netDifference: 0, observedCount: 0 });
    expect(result.missingCells).toHaveLength(0);
    expect(result.kpis.expectedCombinations).toBe(12);
  });

  it('coloca pérdidas sobre cero y ganancias bajo cero sin alterar el signo original', () => {
    const result = analyzeCanvasRows(
      rows,
      createCanvasAxisConfig('cadena', 'familia'),
      ['Granel', 'Paquetería'],
      'netDifference',
    );
    const loss = result.cells.find((cell) => cell.x === 'B' && cell.y === 'F1')!;
    const gain = result.cells.find((cell) => cell.x === 'C' && cell.y === 'F1')!;

    expect(loss.netDifference).toBe(-10);
    expect(canvasDivergingBarValue(loss, 'netDifference')).toBe(10);
    expect(canvasDivergingBarValue(loss, 'netDifference', 'gainUp')).toBe(-10);
    expect(canvasVisualColorValue(loss, 'netDifference')).toBe(-10);
    expect(canvasDivergingBarValue(gain, 'netDifference')).toBe(-30);
    expect(canvasDivergingBarValue(gain, 'netDifference', 'gainUp')).toBe(30);
    expect(canvasVisualColorValue(gain, 'netDifference')).toBe(30);
  });

  it('descompone cada celda en aportaciones firmadas de la dimension filtro', () => {
    const result = analyzeCanvasRows(
      rows,
      createCanvasAxisConfig('cadena', 'familia'),
      ['Granel', 'Paquetería'],
      'netDifference',
    );
    const breakdown = buildCanvasBreakdownSeries(result);
    const granel = breakdown.find((series) => series.filterValue === 'Granel');
    const paqueteria = breakdown.find((series) => series.filterValue === 'Paquetería');
    const granelAF1 = granel?.segments.find((segment) => segment.x === 'A' && segment.y === 'F1');
    const paqueteriaAF1 = paqueteria?.segments.find((segment) => segment.x === 'A' && segment.y === 'F1');

    expect(granelAF1).toMatchObject({ rawDifference: -10, visualValue: 10, magnitudeShare: 2 / 3 });
    expect(paqueteriaAF1).toMatchObject({ rawDifference: 5, visualValue: -5, magnitudeShare: 1 / 3 });
    expect((granelAF1?.rawDifference || 0) + (paqueteriaAF1?.rawDifference || 0)).toBe(-5);

    const gainUpBreakdown = buildCanvasBreakdownSeries(result, 'gainUp');
    const gainUpGranelAF1 = gainUpBreakdown
      .find((series) => series.filterValue === 'Granel')
      ?.segments.find((segment) => segment.x === 'A' && segment.y === 'F1');
    const gainUpPaqueteriaAF1 = gainUpBreakdown
      .find((series) => series.filterValue === 'Paquetería')
      ?.segments.find((segment) => segment.x === 'A' && segment.y === 'F1');
    expect(gainUpGranelAF1).toMatchObject({ rawDifference: -10, visualValue: -10 });
    expect(gainUpPaqueteriaAF1).toMatchObject({ rawDifference: 5, visualValue: 5 });
  });
});
