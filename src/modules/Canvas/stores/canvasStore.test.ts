import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { CanvasRow } from '../types/canvasTypes';
import { useCanvasStore } from './canvasStore';

const rows: CanvasRow[] = [
  { id: '1', sourceRow: 2, cadena: 'A', linea: 'Granel', familia: 'F1', diferencia: -10 },
  { id: '2', sourceRow: 3, cadena: 'A', linea: 'Paquetería', familia: 'F1', diferencia: 5 },
  { id: '3', sourceRow: 4, cadena: 'B', linea: 'Granel', familia: 'F1', diferencia: 7 },
];

describe('useCanvasStore', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('intercambia ejes sin repetir dimensiones y recalcula la tercera como filtro', () => {
    const store = useCanvasStore();
    store.rows = [...rows];
    store.selectedFilterValues = ['Granel', 'Paquetería'];

    store.setAxisDimension('x', 'familia');
    expect(store.axis).toEqual({ x: 'familia', y: 'cadena', filter: 'linea' });

    store.setAxisDimension('y', 'linea');
    expect(store.axis).toEqual({ x: 'familia', y: 'linea', filter: 'cadena' });
    expect(store.selectedFilterValues).toEqual(['A', 'B']);
  });

  it('mantiene al menos un filtro, coordina métrica/selección y restablece la sesión', () => {
    const store = useCanvasStore();
    store.rows = [...rows];
    store.selectedFilterValues = ['Granel', 'Paquetería'];

    store.toggleFilterValue('Paquetería');
    expect(store.selectedFilterValues).toEqual(['Granel']);
    store.toggleFilterValue('Granel');
    expect(store.selectedFilterValues).toEqual(['Granel']);

    store.setMetric('lossShare');
    store.selectCell(store.analysis.observedCells[0]!.key);
    expect(store.metric).toBe('lossShare');
    expect(store.selectedCell).not.toBeNull();

    store.setViewMode('heatmap');
    store.reset();
    expect(store.rows).toEqual([]);
    expect(store.selectedCell).toBeNull();
    expect(store.metric).toBe('netDifference');
    expect(store.viewMode).toBe('bar3d');
  });
});
