import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  canvasHslTokenToHex,
  canvasSignedChartColor,
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
