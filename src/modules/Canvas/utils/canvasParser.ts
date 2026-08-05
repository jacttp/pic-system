import * as XLSX from 'xlsx';
import type {
  CanvasParseResult,
  CanvasRow,
  CanvasValidationIssue,
} from '../types/canvasTypes';

export const CANVAS_MAX_FILE_SIZE = 10 * 1024 * 1024;
export const CANVAS_ALLOWED_FILE = /\.(xlsx|xls)$/i;
export const CANVAS_SHEET_NAME = 'Hoja3';

const EXPECTED_HEADERS = ['formatocte', 'linea', 'categorias', 'dif'];

const isBlank = (value: unknown) => value === null
  || value === undefined
  || (typeof value === 'string' && value.trim() === '');

export const normalizeCanvasText = (value: unknown) => String(value ?? '')
  .trim()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('es-MX');

const duplicateKey = (values: unknown[]) => values
  .map(normalizeCanvasText)
  .join('|');

export const validateCanvasFile = (file: Pick<File, 'name' | 'size'>): CanvasValidationIssue[] => {
  const issues: CanvasValidationIssue[] = [];

  if (!CANVAS_ALLOWED_FILE.test(file.name)) {
    issues.push({
      code: 'FILE_TYPE',
      message: 'Formato no permitido. Usa un archivo .xlsx o .xls.',
    });
  }

  if (file.size > CANVAS_MAX_FILE_SIZE) {
    issues.push({
      code: 'FILE_SIZE',
      message: 'El archivo supera el límite de 10 MB.',
    });
  }

  return issues;
};

export const parseCanvasWorkbook = (buffer: ArrayBuffer): CanvasParseResult => {
  let workbook: XLSX.WorkBook;

  try {
    workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  } catch (error) {
    return {
      rows: [],
      issues: [{
        code: 'WORKBOOK_READ',
        message: `No fue posible leer el Excel${error instanceof Error ? `: ${error.message}` : '.'}`,
      }],
    };
  }

  const sheet = workbook.Sheets[CANVAS_SHEET_NAME];
  if (!sheet) {
    return {
      rows: [],
      issues: [{
        code: 'SHEET_MISSING',
        message: `No existe la hoja obligatoria "${CANVAS_SHEET_NAME}".`,
      }],
    };
  }

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: false,
  });
  const headers = (matrix[0] || []).slice(0, 4).map(normalizeCanvasText);

  if (headers.length !== 4 || EXPECTED_HEADERS.some((header, index) => headers[index] !== header)) {
    return {
      rows: [],
      issues: [{
        code: 'HEADERS_INVALID',
        row: 1,
        message: 'Hoja3!A1:D1 debe contener exactamente: formatocte, Linea, Categorias, Dif.',
      }],
    };
  }

  const rows: CanvasRow[] = [];
  const issues: CanvasValidationIssue[] = [];
  const seenKeys = new Map<string, number>();

  matrix.slice(1).forEach((rawRow, index) => {
    const sourceRow = index + 2;
    const values = rawRow.slice(0, 4);
    while (values.length < 4) values.push(null);

    if (values.every(isBlank)) return;

    if (values.some(isBlank)) {
      issues.push({
        code: 'ROW_INCOMPLETE',
        row: sourceRow,
        message: `La fila ${sourceRow} tiene campos vacíos en A:D.`,
      });
      return;
    }

    const [cadenaValue, lineaValue, familiaValue, diferenciaValue] = values;
    if (typeof diferenciaValue !== 'number' || !Number.isFinite(diferenciaValue)) {
      issues.push({
        code: 'VALUE_INVALID',
        row: sourceRow,
        message: `La celda D${sourceRow} debe contener un número de Excel válido.`,
      });
      return;
    }

    const key = duplicateKey([cadenaValue, lineaValue, familiaValue]);
    const duplicateRow = seenKeys.get(key);
    if (duplicateRow) {
      issues.push({
        code: 'DUPLICATE_KEY',
        row: sourceRow,
        message: `La fila ${sourceRow} duplica la combinación de la fila ${duplicateRow}.`,
      });
      return;
    }

    seenKeys.set(key, sourceRow);
    rows.push({
      id: `excel-${sourceRow}`,
      sourceRow,
      cadena: String(cadenaValue).trim(),
      linea: String(lineaValue).trim(),
      familia: String(familiaValue).trim(),
      diferencia: diferenciaValue,
    });
  });

  if (rows.length === 0 && issues.length === 0) {
    issues.push({
      code: 'NO_DATA',
      message: 'Hoja3 no contiene registros debajo de los encabezados.',
    });
  }

  return { rows, issues };
};

export const readCanvasFile = async (file: File): Promise<CanvasParseResult> => {
  const fileIssues = validateCanvasFile(file);
  if (fileIssues.length > 0) return { rows: [], issues: fileIssues };

  try {
    const buffer = await file.arrayBuffer();
    return parseCanvasWorkbook(buffer);
  } catch (error) {
    return {
      rows: [],
      issues: [{
        code: 'WORKBOOK_READ',
        message: error instanceof Error ? error.message : 'No fue posible leer el archivo seleccionado.',
      }],
    };
  }
};
