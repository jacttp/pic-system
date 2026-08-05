import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  analyzeCanvasRows,
  buildCanvasBreakdownSeries,
  CANVAS_RESULT_RANGES,
  createCanvasAxisConfig,
  uniqueInSourceOrder,
} from './canvasAnalytics';
import { parseCanvasWorkbook } from './canvasParser';

const fixture = process.env.CANVAS_FIXTURE;
const acceptance = fixture ? describe : describe.skip;

acceptance('archivo comparativo de aceptación', () => {
  it('reproduce los totales y el mayor hueco acordados', () => {
    const bytes = readFileSync(fixture!);
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const parsed = parseCanvasWorkbook(buffer);

    expect(parsed.issues).toEqual([]);
    expect(parsed.rows).toHaveLength(72);

    const result = analyzeCanvasRows(
      parsed.rows,
      createCanvasAxisConfig('cadena', 'familia'),
      uniqueInSourceOrder(parsed.rows, 'linea'),
      'netDifference',
    );

    expect(result.kpis.expectedCombinations - result.kpis.observedCombinations).toBe(12);
    expect(result.kpis.netDifference).toBeCloseTo(-624_022.58, 2);
    expect(result.kpis.grossLoss).toBeCloseTo(650_165.32, 2);
    expect(result.kpis.gains).toBeCloseTo(26_142.74, 2);

    const worst = [...parsed.rows].sort((a, b) => a.diferencia - b.diferencia)[0];
    expect(worst).toMatchObject({
      cadena: 'Walmart',
      linea: 'Paqueteria',
      familia: 'S. Ros',
    });
    expect(worst?.diferencia).toBeCloseTo(-120_233.23, 2);

    const ranged = analyzeCanvasRows(
      parsed.rows,
      createCanvasAxisConfig('resultado', 'cadena'),
      uniqueInSourceOrder(parsed.rows, 'linea'),
      'netDifference',
    );
    const walmartCritical = ranged.cells.find(
      (cell) => cell.x === CANVAS_RESULT_RANGES[0] && cell.y === 'Walmart',
    );

    expect(ranged.xValues).toEqual(CANVAS_RESULT_RANGES);
    expect(ranged.cells.reduce((total, cell) => total + cell.observedCount, 0)).toBe(72);
    expect(ranged.kpis.netDifference).toBeCloseTo(-624_022.58, 2);
    expect(walmartCritical?.sourceRows.some((row) => row.diferencia === worst?.diferencia)).toBe(true);

    const breakdown = buildCanvasBreakdownSeries(ranged);
    ranged.cells.forEach((cell, cellIndex) => {
      const segmentTotal = breakdown.reduce(
        (total, series) => total + (series.segments[cellIndex]?.rawDifference || 0),
        0,
      );
      expect(segmentTotal).toBeCloseTo(cell.netDifference || 0, 8);
    });
  });
});
