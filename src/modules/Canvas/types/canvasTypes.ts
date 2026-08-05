export type CanvasSourceDimension = 'cadena' | 'linea' | 'familia';

export type CanvasDimension = CanvasSourceDimension | 'resultado';

export type CanvasMetric =
  | 'netDifference'
  | 'absoluteGap'
  | 'lossShare'
  | 'peerDeviation';

export type CanvasViewMode = 'bar3d' | 'heatmap';

export type CanvasBarMode = 'result' | 'participation';

export type CanvasSignOrientation = 'lossUp' | 'gainUp';

export type CanvasInspectorTab = 'priorities' | 'selection' | 'evidence';

export type CanvasSelectionSource = 'chart' | 'ranking';

export interface CanvasRow {
  id: string;
  sourceRow: number;
  cadena: string;
  linea: string;
  familia: string;
  diferencia: number;
}

export interface CanvasAxisConfig {
  x: CanvasDimension;
  y: CanvasDimension;
  filter: CanvasSourceDimension;
}

export type CanvasValidationCode =
  | 'FILE_TYPE'
  | 'FILE_SIZE'
  | 'WORKBOOK_READ'
  | 'SHEET_MISSING'
  | 'HEADERS_INVALID'
  | 'ROW_INCOMPLETE'
  | 'VALUE_INVALID'
  | 'DUPLICATE_KEY'
  | 'NO_DATA';

export interface CanvasValidationIssue {
  code: CanvasValidationCode;
  message: string;
  row?: number;
}

export interface CanvasParseResult {
  rows: CanvasRow[];
  issues: CanvasValidationIssue[];
}

export interface CanvasCell {
  key: string;
  x: string;
  y: string;
  sourceRows: CanvasRow[];
  observedCount: number;
  expectedCount: number;
  netDifference: number | null;
  absoluteGap: number | null;
  grossLoss: number | null;
  gains: number | null;
  lossShare: number | null;
  peerDeviation: number | null;
  peerMedian: number | null;
  peerMad: number | null;
  metricValue: number | null;
}

export interface CanvasBreakdownSegment {
  key: string;
  cellKey: string;
  x: string;
  y: string;
  filterValue: string;
  sourceRows: CanvasRow[];
  rawDifference: number;
  visualValue: number;
  magnitudeShare: number;
  cellNetDifference: number;
}

export interface CanvasBreakdownSeries {
  filterValue: string;
  segments: CanvasBreakdownSegment[];
}

export interface CanvasKpis {
  netDifference: number;
  grossLoss: number;
  gains: number;
  observedCombinations: number;
  expectedCombinations: number;
}

export interface CanvasAnalysisResult {
  axis: CanvasAxisConfig;
  metric: CanvasMetric;
  filterValues: string[];
  xValues: string[];
  yValues: string[];
  filteredRows: CanvasRow[];
  cells: CanvasCell[];
  observedCells: CanvasCell[];
  missingCells: CanvasCell[];
  kpis: CanvasKpis;
  metricMin: number;
  metricMax: number;
}

export interface CanvasTableRow extends Record<string, unknown> {
  id: string;
  cadena: string;
  linea: string;
  familia: string;
  diferencia: string;
  brecha: string;
  participacion: string;
  desviacion: string;
}

export const CANVAS_DIMENSION_LABELS: Record<CanvasDimension, string> = {
  cadena: 'Cadena',
  linea: 'Línea',
  familia: 'Familia',
  resultado: 'Rango de resultado',
};

export const CANVAS_METRIC_LABELS: Record<CanvasMetric, string> = {
  netDifference: 'Diferencia neta',
  absoluteGap: 'Brecha absoluta',
  lossShare: 'Participación en pérdidas',
  peerDeviation: 'Desviación frente a pares',
};
