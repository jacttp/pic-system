import { describe, expect, it } from 'vitest';
import type { CanvasRow } from '../types/canvasTypes';
import {
  analyzeCanvasRows,
  canvasVisualColorValue,
  canvasDivergingBarValue,
  createCanvasAxisConfig,
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
    expect(canvasVisualColorValue(loss, 'netDifference')).toBe(-10);
    expect(canvasDivergingBarValue(gain, 'netDifference')).toBe(-30);
    expect(canvasVisualColorValue(gain, 'netDifference')).toBe(30);
  });
});
