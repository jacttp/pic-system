import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CANVAS_3D_LIGHT,
  CANVAS_3D_POST_EFFECT,
  CANVAS_PARTICIPATION_MATERIAL,
  canvas3DBarSize,
  canvasBreakdownColor,
  canvasHslTokenToHex,
  canvasSignedChartColor,
  createCanvasSignedHeatmapVisualMap,
  createCanvasOriginDeckSeries,
  createCanvasSelectionMarkerSeries,
  mixCanvasHexColor,
  supportsCanvasWebGL,
} from './canvasWebgl';

describe('canvasHslTokenToHex', () => {
  it('convierte los tokens HSL modernos a colores hexadecimales compatibles con ECharts GL', () => {
    expect(canvasHslTokenToHex('0 100% 50%', '#000000')).toBe('#ff0000');
    expect(canvasHslTokenToHex('120 100% 50%', '#000000')).toBe('#00ff00');
    expect(canvasHslTokenToHex('215 90% 52%', '#000000')).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('conserva el fallback si el token no tiene el contrato esperado', () => {
    expect(canvasHslTokenToHex('', '#2563eb')).toBe('#2563eb');
  });
});

describe('canvasBreakdownColor', () => {
  it('mantiene el color de cada valor aunque otros filtros se desactiven', () => {
    const domain = ['A', 'B', 'C'];
    expect(canvasBreakdownColor('B', domain)).toBe(canvasBreakdownColor('B', domain));
    expect(canvasBreakdownColor('A', domain)).not.toBe(canvasBreakdownColor('B', domain));
  });

  it('usa Lambert suave, opaco y sin bisel para separar caras sin fragmentar segmentos', () => {
    expect(CANVAS_PARTICIPATION_MATERIAL).toMatchObject({
      shading: 'lambert',
      bevelSize: 0,
      bevelSmoothness: 0,
      label: { show: false },
      itemStyle: { opacity: 1 },
    });
    expect(CANVAS_3D_LIGHT).toMatchObject({
      main: { intensity: 1.05, shadow: true, shadowQuality: 'medium' },
      ambient: { intensity: 0.3 },
    });
    expect(CANVAS_3D_POST_EFFECT).toMatchObject({
      enable: true,
      bloom: { enable: false },
      screenSpaceAmbientOcclusion: { enable: true, intensity: 1.25 },
      edge: { enable: true },
      FXAA: { enable: true },
    });
  });

  it('deja aire real entre columnas en lugar de depender de bordes no soportados', () => {
    expect(canvas3DBarSize(176, 80, 8, 2)).toEqual([13.64, 24.8]);
  });
});

describe('plano de origen 3D', () => {
  it('cubre todas las bandas categóricas con una base sólida cuyo borde superior es cero', () => {
    const deck = createCanvasOriginDeckSeries({
      xCount: 8,
      yCount: 2,
      boxWidth: 176,
      boxDepth: 80,
      thickness: 420,
      color: '#e8edf3',
    });
    expect(deck).toMatchObject({
      type: 'bar3D',
      barSize: [22, 40],
      silent: true,
      itemStyle: { color: '#e8edf3' },
    });
    expect(deck.itemStyle.opacity).toBeGreaterThan(0);
    expect(deck.itemStyle.opacity).toBeLessThanOrEqual(1);
    expect(deck.data).toHaveLength(16);
    expect(deck.data.every((point) => point[2] === -420)).toBe(true);
    expect(deck.data).toContainEqual([0, 0, -420]);
    expect(deck.data).toContainEqual([7, 1, -420]);
  });
});

describe('marcador de selección 3D', () => {
  it('señala una columna sin alterar su valor ni capturar clics', () => {
    const marker = createCanvasSelectionMarkerSeries({
      xIndex: 2,
      yIndex: 4,
      value: -12500,
      color: '#c8102e',
      surfaceColor: '#ffffff',
      textColor: '#0f172a',
    });
    expect(marker).toMatchObject({
      type: 'scatter3D',
      data: [[2, 4, -12500]],
      symbol: 'diamond',
      symbolSize: 18,
      silent: true,
      label: { show: true, formatter: 'Selección' },
      tooltip: { show: false },
    });
  });
});

describe('colores semánticos firmados', () => {
  const colors = {
    lossSoft: '#ffedd5',
    loss: '#f97316',
    gainSoft: '#dbeafe',
    gain: '#2563eb',
    neutral: '#cbd5e1',
  };

  it('mantiene pérdidas en naranja y ganancias en azul para cualquier magnitud', () => {
    expect(canvasSignedChartColor(-1, 100, colors)).toMatch(/^#f[0-9a-f]{5}$/);
    expect(canvasSignedChartColor(-100, 100, colors)).toBe('#f97316');
    expect(canvasSignedChartColor(100, 100, colors)).toBe('#2563eb');
    expect(canvasSignedChartColor(0, 100, colors)).toBe('#cbd5e1');
  });

  it('interpola colores hexadecimales sin salir del espacio sRGB', () => {
    expect(mixCanvasHexColor('#000000', '#ffffff', 0.5)).toBe('#808080');
  });

  it('crea una escala simétrica obligatoria para pintar el heatmap firmado', () => {
    expect(createCanvasSignedHeatmapVisualMap([-120, 30], {
      loss: '#f97316',
      neutral: '#f8fafc',
      gain: '#2563eb',
    })).toMatchObject({
      show: false,
      min: -120,
      max: 120,
      dimension: 3,
      inRange: { color: ['#f97316', '#f8fafc', '#2563eb'] },
    });
  });
});

describe('supportsCanvasWebGL', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('detecta WebGL disponible', () => {
    vi.stubGlobal('document', {
      createElement: () => ({ getContext: (type: string) => type === 'webgl' ? {} : null }),
    });
    expect(supportsCanvasWebGL()).toBe(true);
  });

  it('devuelve falso cuando no existe contexto y permite activar el fallback 2D', () => {
    vi.stubGlobal('document', {
      createElement: () => ({ getContext: () => null }),
    });
    expect(supportsCanvasWebGL()).toBe(false);
  });
});
