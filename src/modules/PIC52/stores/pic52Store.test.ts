import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { pic52Api } from '../services/pic52Api';
import { usePic52Store } from './pic52Store';

vi.mock('../services/pic52Api', () => ({
  pic52Api: {
    getCatalogs: vi.fn(),
    getUserContext: vi.fn(),
    getCanales: vi.fn(),
    getGerencias: vi.fn(),
    getFormatos: vi.fn(),
    getJefaturas: vi.fn(),
    getRutas: vi.fn(),
    getProductOptions: vi.fn(),
  },
}));

const productResponse = {
  marcas: [],
  gruposSku: ['GRUPO 1'],
  categorias: ['CATEGORIA 1'],
  gruposComercialesA: ['COMERCIAL A'],
  gruposComercialesB: ['COMERCIAL B'],
  skus: ['SKU 1'],
};

describe('pic52Store product filters', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.mocked(pic52Api.getCatalogs).mockResolvedValue({
      years: [2026, 2025, 2024],
      defaultReferenceYear: 2026,
      defaultYears: [2026, 2025, 2024],
      productBrands: ['Corona', 'Ros', 'Wali'],
      transactions: [{
        value: 'Ventas',
        label: 'Ventas (Venta + NC)',
        sourceTransactions: ['Venta', 'NC'],
      }],
      weeksByYear: {
        2026: [1, 2, 3],
        2025: [1, 2, 3],
        2024: [1, 2, 3],
      },
      defaultWeeks: [1, 2, 3],
    });
    vi.mocked(pic52Api.getUserContext).mockResolvedValue({
      role: 'admin',
      gerencia: null,
      jefatura: null,
    });
    vi.mocked(pic52Api.getCanales).mockResolvedValue([]);
    vi.mocked(pic52Api.getGerencias).mockResolvedValue([]);
    vi.mocked(pic52Api.getFormatos).mockResolvedValue([]);
    vi.mocked(pic52Api.getProductOptions).mockResolvedValue(productResponse);
  });

  it('inicializa Marca sin consultar opciones de producto', async () => {
    const store = usePic52Store();

    await store.initialize();

    expect(store.productOptions.marcas).toEqual(['Corona', 'Ros', 'Wali']);
    expect(pic52Api.getProductOptions).not.toHaveBeenCalled();
  });

  it('consulta solo la dimensión cuyo selector abre el usuario', async () => {
    const store = usePic52Store();
    await store.initialize();

    await store.ensureProductOptions('skus');

    expect(pic52Api.getProductOptions).toHaveBeenCalledTimes(1);
    expect(vi.mocked(pic52Api.getProductOptions).mock.calls[0]?.[3]).toEqual(['skus']);
    expect(store.productOptions.skus).toEqual(['SKU 1']);
  });

  it('cambiar Marca invalida dependientes sin ejecutar otra consulta', async () => {
    const store = usePic52Store();
    await store.initialize();
    await store.ensureProductOptions('gruposSku');
    store.selected.marcas = ['Corona'];

    store.handleProductChange('marcas');

    expect(store.productOptions.gruposSku).toEqual([]);
    expect(store.selected.skus).toEqual([]);
    expect(pic52Api.getProductOptions).toHaveBeenCalledTimes(1);
  });
});
