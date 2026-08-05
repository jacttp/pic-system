import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import {
  CANVAS_MAX_FILE_SIZE,
  parseCanvasWorkbook,
  validateCanvasFile,
} from './canvasParser';

const workbookBuffer = (matrix: unknown[][], sheetName = 'Hoja3') => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(matrix), sheetName);
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
};

describe('parseCanvasWorkbook', () => {
  it('lee exclusivamente la plantilla esperada y conserva la precisión', () => {
    const buffer = workbookBuffer([
      ['formatocte', 'Linea', 'Categorias', 'Dif', 'Dato ignorado'],
      ['Cadena A', 'Granel', 'Familia 1', -123.456789, 999],
      [null, null, null, null, 'fuera del alcance'],
    ]);

    const result = parseCanvasWorkbook(buffer);

    expect(result.issues).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      cadena: 'Cadena A',
      linea: 'Granel',
      familia: 'Familia 1',
      diferencia: -123.456789,
      sourceRow: 2,
    });
  });

  it('rechaza una hoja ausente o encabezados distintos', () => {
    expect(parseCanvasWorkbook(workbookBuffer([
      ['formatocte', 'Linea', 'Categorias', 'Dif'],
    ], 'Hoja4')).issues[0]?.code).toBe('SHEET_MISSING');

    expect(parseCanvasWorkbook(workbookBuffer([
      ['Cadena', 'Linea', 'Categorias', 'Dif'],
      ['A', 'Granel', 'F1', 1],
    ])).issues[0]?.code).toBe('HEADERS_INVALID');
  });

  it('reporta filas parciales, diferencias no numéricas y claves duplicadas', () => {
    const result = parseCanvasWorkbook(workbookBuffer([
      ['formatocte', 'Linea', 'Categorias', 'Dif'],
      ['A', 'Granel', 'F1', -10],
      ['A', 'Granel', null, -20],
      ['A', 'Paquetería', 'F1', '15'],
      [' a ', 'GRANEL', 'f1', -30],
    ]));

    expect(result.rows).toHaveLength(1);
    expect(result.issues.map((issue) => issue.code)).toEqual([
      'ROW_INCOMPLETE',
      'VALUE_INVALID',
      'DUPLICATE_KEY',
    ]);
  });
});

describe('validateCanvasFile', () => {
  it('acepta Excel y rechaza extensión o tamaño fuera del contrato', () => {
    expect(validateCanvasFile({ name: 'datos.xlsx', size: CANVAS_MAX_FILE_SIZE })).toEqual([]);
    expect(validateCanvasFile({ name: 'datos.csv', size: 100 })[0]?.code).toBe('FILE_TYPE');
    expect(validateCanvasFile({ name: 'datos.xls', size: CANVAS_MAX_FILE_SIZE + 1 })[0]?.code).toBe('FILE_SIZE');
  });
});
