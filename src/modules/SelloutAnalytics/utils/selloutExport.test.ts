import { describe, expect, it } from 'vitest';
import { buildSelloutExportSheets } from './selloutExport';

describe('buildSelloutExportSheets', () => {
  it('conserva ausencias vacias, ceros observados y subtotales separados', () => {
    const sheets = buildSelloutExportSheets([
      { chain: 'Sams', store: 'T1', sku: 'SKU1', brand: 'Corona', year: 2026, week: 36, kg: 10 },
      { chain: 'Sams', store: 'T1', sku: 'SKU1', brand: 'Corona', year: 2026, week: 37, kg: 0 },
      { chain: 'Sams', store: 'T1', sku: 'SKU2', brand: 'Corona', year: 2026, week: 37, kg: 5 },
    ], [
      { year: 2026, week: 36 },
      { year: 2026, week: 37 },
    ], {
      chains: ['Sams'], stores: [], brands: [], skus: [],
    }, new Date('2026-09-15T12:00:00.000Z'));

    expect(sheets.detail[1]).toEqual(['Detalle', 'Sams', 'T1', 'SKU1', 'Corona', 10, 0, 10]);
    expect(sheets.detail[2]).toEqual(['Detalle', 'Sams', 'T1', 'SKU2', 'Corona', null, 5, 5]);
    expect(sheets.subtotals).toContainEqual(['Subtotal cadena', 'Sams', '', 10, 5, 15]);
    expect(sheets.subtotals).toContainEqual(['Subtotal tienda', 'Sams', 'T1', 10, 5, 15]);
  });
});
