import type {
  CanvasAnalysisResult,
  CanvasAxisConfig,
  CanvasCell,
  CanvasDimension,
  CanvasMetric,
  CanvasRow,
} from '../types/canvasTypes';

const DIMENSIONS: CanvasDimension[] = ['cadena', 'linea', 'familia'];

export const getCanvasDimensionValue = (row: CanvasRow, dimension: CanvasDimension) => row[dimension];

export const uniqueInSourceOrder = (rows: CanvasRow[], dimension: CanvasDimension) => {
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
): CanvasDimension => DIMENSIONS.find((dimension) => dimension !== x && dimension !== y) || 'linea';

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

  filteredRows.forEach((row) => {
    const x = getCanvasDimensionValue(row, axis.x);
    const y = getCanvasDimensionValue(row, axis.y);
    const key = cellKey(x, y);
    const existing = grouped.get(key) || [];
    existing.push(row);
    grouped.set(key, existing);
  });

  const expectedCount = effectiveFilterValues.length;
  const cells = yValues.flatMap((y) => xValues.map<CanvasCell>((x) => {
    const sourceRows = grouped.get(cellKey(x, y)) || [];
    const observed = sourceRows.length > 0;
    const netDifference = observed
      ? sourceRows.reduce((total, row) => total + row.diferencia, 0)
      : null;
    const grossLoss = observed
      ? sourceRows.reduce((total, row) => total + (row.diferencia < 0 ? Math.abs(row.diferencia) : 0), 0)
      : null;
    const gains = observed
      ? sourceRows.reduce((total, row) => total + (row.diferencia > 0 ? row.diferencia : 0), 0)
      : null;

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
    const peers = cells.filter((cell) => cell.y === y && cell.netDifference !== null);
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
      expectedCombinations: xValues.length * yValues.length * effectiveFilterValues.length,
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

export const canvasDivergingBarValue = (cell: CanvasCell, metric: CanvasMetric) => {
  const value = canvasMetricValue(cell, metric);
  return metric === 'netDifference' && value !== null ? -value : value;
};

export const canvasVisualColorValue = (cell: CanvasCell, metric: CanvasMetric) => (
  metric === 'netDifference' ? cell.netDifference : canvasMetricValue(cell, metric)
);
