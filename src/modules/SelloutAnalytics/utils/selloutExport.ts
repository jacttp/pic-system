import type {
  SelloutExportRow,
  SelloutFilters,
  SelloutPeriodKey,
} from '../types/selloutAnalytics';

export interface SelloutExportSheets {
  detail: Array<Array<string | number | null>>;
  subtotals: Array<Array<string | number | null>>;
  parameters: Array<Array<string | number>>;
}

const periodKey = (period: SelloutPeriodKey) => `${period.year}-S${String(period.week).padStart(2, '0')}`;

const sumCells = (target: Map<string, number>, row: SelloutExportRow) => {
  const key = periodKey(row);
  target.set(key, (target.get(key) ?? 0) + row.kg);
};

const valuesForPeriods = (values: Map<string, number>, periods: SelloutPeriodKey[]) => (
  periods.map(period => values.has(periodKey(period)) ? values.get(periodKey(period))! : null)
);

export const buildSelloutExportSheets = (
  sourceRows: SelloutExportRow[],
  periods: SelloutPeriodKey[],
  filters: SelloutFilters,
  generatedAt: Date,
): SelloutExportSheets => {
  const orderedPeriods = [...periods].sort((left, right) => left.year - right.year || left.week - right.week);
  const headers = orderedPeriods.map(periodKey);
  const details = new Map<string, {
    chain: string;
    store: string;
    sku: string;
    brand: string;
    values: Map<string, number>;
  }>();
  const chainTotals = new Map<string, Map<string, number>>();
  const storeTotals = new Map<string, { chain: string; store: string; values: Map<string, number> }>();

  sourceRows.forEach(row => {
    const detailKey = `${row.chain}\u001f${row.store}\u001f${row.sku}`;
    if (!details.has(detailKey)) {
      details.set(detailKey, {
        chain: row.chain,
        store: row.store,
        sku: row.sku,
        brand: row.brand,
        values: new Map(),
      });
    }
    sumCells(details.get(detailKey)!.values, row);

    if (!chainTotals.has(row.chain)) chainTotals.set(row.chain, new Map());
    sumCells(chainTotals.get(row.chain)!, row);

    const storeKey = `${row.chain}\u001f${row.store}`;
    if (!storeTotals.has(storeKey)) {
      storeTotals.set(storeKey, { chain: row.chain, store: row.store, values: new Map() });
    }
    sumCells(storeTotals.get(storeKey)!.values, row);
  });

  const detail = [
    ['Tipo', 'Cadena', 'Tienda', 'SKU', 'Marca', ...headers, 'Total KG'],
    ...[...details.values()].map(item => {
      const cells = valuesForPeriods(item.values, orderedPeriods);
      const total = cells.reduce<number>((sum, value) => sum + (value ?? 0), 0);
      return ['Detalle', item.chain, item.store, item.sku, item.brand, ...cells, total];
    }),
  ];

  const subtotals = [
    ['Tipo', 'Cadena', 'Tienda', ...headers, 'Total KG'],
    ...[...chainTotals.entries()].map(([chain, values]) => {
      const cells = valuesForPeriods(values, orderedPeriods);
      return ['Subtotal cadena', chain, '', ...cells, cells.reduce<number>((sum, value) => sum + (value ?? 0), 0)];
    }),
    ...[...storeTotals.values()].map(item => {
      const cells = valuesForPeriods(item.values, orderedPeriods);
      return ['Subtotal tienda', item.chain, item.store, ...cells, cells.reduce<number>((sum, value) => sum + (value ?? 0), 0)];
    }),
  ];

  const filterLabel = (values: string[]) => values.length > 0 ? values.join(', ') : 'Todos';
  const parameters: Array<Array<string | number>> = [
    ['Parámetro', 'Valor'],
    ['Fuente', 'dbo.sellout_ic'],
    ['Unidad', 'kg netos'],
    ['Generado', generatedAt.toISOString()],
    ['Periodos', headers.join(', ')],
    ['Cadenas', filterLabel(filters.chains)],
    ['Tiendas', filterLabel(filters.stores)],
    ['Marcas', filterLabel(filters.brands)],
    ['SKU', filterLabel(filters.skus)],
    ['Ausencias', 'Celdas vacías; no equivalen a cero'],
    ['Completitud', 'No confirmada'],
  ];

  return { detail, subtotals, parameters };
};

export const selloutExportPeriodKey = periodKey;
