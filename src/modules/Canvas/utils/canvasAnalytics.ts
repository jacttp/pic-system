import type {
  CanvasAnalysisResult,
  CanvasAxisConfig,
  CanvasBreakdownSeries,
  CanvasCell,
  CanvasDimension,
  CanvasMetric,
  CanvasRow,
  CanvasSignOrientation,
  CanvasSourceDimension,
} from '../types/canvasTypes';

const SOURCE_DIMENSIONS: CanvasSourceDimension[] = ['cadena', 'linea', 'familia'];

export const CANVAS_RESULT_RANGES = [
  'Pérdida crítica · > 50k kg',
  'Pérdida alta · 10k–50k kg',
  'Pérdida media · 1k–10k kg',
  'Pérdida baja · < 1k kg',
  'Sin cambio',
  'Ganancia baja · < 1k kg',
  'Ganancia media · 1k–10k kg',
  'Ganancia alta · > 10k kg',
] as const;

export type CanvasResultRange = typeof CANVAS_RESULT_RANGES[number];

export const getCanvasResultRange = (difference: number): CanvasResultRange => {
  if (difference < -50_000) return CANVAS_RESULT_RANGES[0];
  if (difference < -10_000) return CANVAS_RESULT_RANGES[1];
  if (difference < -1_000) return CANVAS_RESULT_RANGES[2];
  if (difference < 0) return CANVAS_RESULT_RANGES[3];
  if (difference === 0) return CANVAS_RESULT_RANGES[4];
  if (difference < 1_000) return CANVAS_RESULT_RANGES[5];
  if (difference < 10_000) return CANVAS_RESULT_RANGES[6];
  return CANVAS_RESULT_RANGES[7];
};

export const getCanvasDimensionValue = (row: CanvasRow, dimension: CanvasDimension) => (
  dimension === 'resultado' ? getCanvasResultRange(row.diferencia) : row[dimension]
);

export const uniqueInSourceOrder = (rows: CanvasRow[], dimension: CanvasDimension) => {
  if (dimension === 'resultado') return [...CANVAS_RESULT_RANGES];
  const seen = new Set<string>();
  return rows.reduce<string[]>((values, row) => {
    const value = getCanvasDimensionValue(row, dimension);
    if (!seen.has(value)) {
      seen.add(value);
      values.push(value);
    }
    return values;
  }, []);
};

export const resolveCanvasFilterDimension = (
  x: CanvasDimension,
  y: CanvasDimension,
): CanvasSourceDimension => SOURCE_DIMENSIONS.find((dimension) => dimension !== x && dimension !== y) || 'linea';

export const createCanvasAxisConfig = (
  x: CanvasDimension = 'cadena',
  y: CanvasDimension = 'familia',
): CanvasAxisConfig => ({ x, y, filter: resolveCanvasFilterDimension(x, y) });

const median = (values: number[]) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!;
};

const emptyResult = (
  axis: CanvasAxisConfig,
  metric: CanvasMetric,
  filterValues: string[],
): CanvasAnalysisResult => ({
  axis,
  metric,
  filterValues,
  xValues: [],
  yValues: [],
  filteredRows: [],
  cells: [],
  observedCells: [],
  missingCells: [],
  kpis: {
    netDifference: 0,
    grossLoss: 0,
    gains: 0,
    observedCombinations: 0,
    expectedCombinations: 0,
  },
  metricMin: 0,
  metricMax: 0,
});

const cellKey = (x: string, y: string) => `${x}\u241f${y}`;

export const analyzeCanvasRows = (
  rows: CanvasRow[],
  axis: CanvasAxisConfig,
  filterValues: string[],
  metric: CanvasMetric,
): CanvasAnalysisResult => {
  if (rows.length === 0) return emptyResult(axis, metric, filterValues);

  const xValues = uniqueInSourceOrder(rows, axis.x);
  const yValues = uniqueInSourceOrder(rows, axis.y);
  const allFilterValues = uniqueInSourceOrder(rows, axis.filter);
  const effectiveFilterValues = filterValues.length > 0 ? filterValues : allFilterValues;
  const filterSet = new Set(effectiveFilterValues);
  const filteredRows = rows.filter((row) => filterSet.has(getCanvasDimensionValue(row, axis.filter)));
  const grouped = new Map<string, CanvasRow[]>();
  const hasResultAxis = axis.x === 'resultado' || axis.y === 'resultado';

  filteredRows.forEach((row) => {
    const x = getCanvasDimensionValue(row, axis.x);
    const y = getCanvasDimensionValue(row, axis.y);
    const key = cellKey(x, y);
    const existing = grouped.get(key) || [];
    existing.push(row);
    grouped.set(key, existing);
  });

  const sourceAxes = new Set<CanvasSourceDimension>(
    [axis.x, axis.y].filter((dimension): dimension is CanvasSourceDimension => dimension !== 'resultado'),
  );
  const hiddenSourceDimensions = SOURCE_DIMENSIONS.filter((dimension) => !sourceAxes.has(dimension));
  const expectedCount = hiddenSourceDimensions.reduce((total, dimension) => {
    const values = dimension === axis.filter
      ? effectiveFilterValues
      : uniqueInSourceOrder(rows, dimension);
    return total * values.length;
  }, 1);
  const cells = yValues.flatMap((y) => xValues.map<CanvasCell>((x) => {
    const sourceRows = grouped.get(cellKey(x, y)) || [];
    const observed = sourceRows.length > 0;
    const netDifference = observed
      ? sourceRows.reduce((total, row) => total + row.diferencia, 0)
      : hasResultAxis ? 0 : null;
    const grossLoss = observed
      ? sourceRows.reduce((total, row) => total + (row.diferencia < 0 ? Math.abs(row.diferencia) : 0), 0)
      : hasResultAxis ? 0 : null;
    const gains = observed
      ? sourceRows.reduce((total, row) => total + (row.diferencia > 0 ? row.diferencia : 0), 0)
      : hasResultAxis ? 0 : null;

    return {
      key: cellKey(x, y),
      x,
      y,
      sourceRows,
      observedCount: sourceRows.length,
      expectedCount,
      netDifference,
      absoluteGap: netDifference === null ? null : Math.abs(netDifference),
      grossLoss,
      gains,
      lossShare: null,
      peerDeviation: null,
      peerMedian: null,
      peerMad: null,
      metricValue: null,
    };
  }));

  const grossLossTotal = filteredRows.reduce(
    (total, row) => total + (row.diferencia < 0 ? Math.abs(row.diferencia) : 0),
    0,
  );

  cells.forEach((cell) => {
    if (cell.netDifference !== null) {
      cell.lossShare = grossLossTotal > 0 ? (cell.grossLoss || 0) / grossLossTotal : 0;
    }
  });

  yValues.forEach((y) => {
    const peers = cells.filter((cell) => cell.y === y && cell.observedCount > 0);
    if (peers.length < 3) return;
    const values = peers.map((cell) => cell.netDifference as number);
    const peerMedian = median(values);
    if (peerMedian === null) return;
    const peerMad = median(values.map((value) => Math.abs(value - peerMedian)));

    peers.forEach((cell) => {
      cell.peerMedian = peerMedian;
      cell.peerMad = peerMad;
      cell.peerDeviation = peerMad && peerMad > 0
        ? 0.6745 * ((cell.netDifference as number) - peerMedian) / peerMad
        : null;
    });
  });

  cells.forEach((cell) => {
    cell.metricValue = ({
      netDifference: cell.netDifference,
      absoluteGap: cell.absoluteGap,
      lossShare: cell.lossShare,
      peerDeviation: cell.peerDeviation,
    })[metric];
  });

  const observedCells = cells.filter((cell) => cell.netDifference !== null);
  const missingCells = cells.filter((cell) => cell.netDifference === null);
  const metricValues = observedCells
    .map((cell) => cell.metricValue)
    .filter((value): value is number => value !== null && Number.isFinite(value));

  return {
    axis,
    metric,
    filterValues: effectiveFilterValues,
    xValues,
    yValues,
    filteredRows,
    cells,
    observedCells,
    missingCells,
    kpis: {
      netDifference: filteredRows.reduce((total, row) => total + row.diferencia, 0),
      grossLoss: grossLossTotal,
      gains: filteredRows.reduce(
        (total, row) => total + (row.diferencia > 0 ? row.diferencia : 0),
        0,
      ),
      observedCombinations: filteredRows.length,
      expectedCombinations: SOURCE_DIMENSIONS.reduce((total, dimension) => {
        const values = dimension === axis.filter
          ? effectiveFilterValues
          : uniqueInSourceOrder(rows, dimension);
        return total * values.length;
      }, 1),
    },
    metricMin: metricValues.length > 0 ? Math.min(...metricValues) : 0,
    metricMax: metricValues.length > 0 ? Math.max(...metricValues) : 0,
  };
};

export const canvasMetricValue = (cell: CanvasCell, metric: CanvasMetric) => ({
  netDifference: cell.netDifference,
  absoluteGap: cell.absoluteGap,
  lossShare: cell.lossShare,
  peerDeviation: cell.peerDeviation,
})[metric];

export const canvasDivergingBarValue = (
  cell: CanvasCell,
  metric: CanvasMetric,
  orientation: CanvasSignOrientation = 'lossUp',
) => {
  const value = canvasMetricValue(cell, metric);
  if (metric !== 'netDifference' || value === null) return value;
  return orientation === 'lossUp' ? -value : value;
};

export const canvasVisualColorValue = (cell: CanvasCell, metric: CanvasMetric) => (
  metric === 'netDifference' ? cell.netDifference : canvasMetricValue(cell, metric)
);

export const buildCanvasBreakdownSeries = (
  analysis: CanvasAnalysisResult,
  orientation: CanvasSignOrientation = 'lossUp',
): CanvasBreakdownSeries[] => {
  const rowsByCellAndFilter = new Map<string, CanvasRow[]>();

  analysis.filteredRows.forEach((row) => {
    const x = getCanvasDimensionValue(row, analysis.axis.x);
    const y = getCanvasDimensionValue(row, analysis.axis.y);
    const filterValue = row[analysis.axis.filter];
    const key = `${cellKey(x, y)}\u241f${filterValue}`;
    const grouped = rowsByCellAndFilter.get(key) || [];
    grouped.push(row);
    rowsByCellAndFilter.set(key, grouped);
  });

  const contributionsByCell = new Map<string, Map<string, number>>();
  analysis.cells.forEach((cell) => {
    const contributions = new Map<string, number>();
    analysis.filterValues.forEach((filterValue) => {
      const rows = rowsByCellAndFilter.get(`${cell.key}\u241f${filterValue}`) || [];
      contributions.set(filterValue, rows.reduce((total, row) => total + row.diferencia, 0));
    });
    contributionsByCell.set(cell.key, contributions);
  });

  return analysis.filterValues.map((filterValue) => ({
    filterValue,
    segments: analysis.cells.map((cell) => {
      const sourceRows = rowsByCellAndFilter.get(`${cell.key}\u241f${filterValue}`) || [];
      const contributions = contributionsByCell.get(cell.key) || new Map<string, number>();
      const rawDifference = contributions.get(filterValue) || 0;
      const magnitudeTotal = [...contributions.values()].reduce(
        (total, contribution) => total + Math.abs(contribution),
        0,
      );

      return {
        key: `${cell.key}\u241f${filterValue}`,
        cellKey: cell.key,
        x: cell.x,
        y: cell.y,
        filterValue,
        sourceRows,
        rawDifference,
        visualValue: orientation === 'lossUp' ? -rawDifference : rawDifference,
        magnitudeShare: magnitudeTotal > 0 ? Math.abs(rawDifference) / magnitudeTotal : 0,
        cellNetDifference: cell.netDifference || 0,
      };
    }),
  }));
};
