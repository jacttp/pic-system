import api from '@/api/axios';

export type SharedFilterCatalogKey =
  | 'canales'
  | 'gerencias'
  | 'marcas'
  | 'anios'
  | 'transacciones'
  | 'formatosCliente'
  | 'estatusCliente'
  | 'cadenas';

export interface SharedFilterContext {
  role: string;
  gerencia: string | null;
  jefatura: string | null;
}

export interface SharedDependentFilters {
  Gerencia?: string[];
  Jefatura?: string[];
  Marca?: string[];
  grupo?: string[];
  Categorias?: string[];
}

const catalogPaths: Record<SharedFilterCatalogKey, string> = {
  canales: '/filters/canales',
  gerencias: '/filters/gerencias',
  marcas: '/filters/marcas',
  anios: '/filters/anios',
  transacciones: '/filters/transacciones',
  formatosCliente: '/filters/formato-cliente',
  estatusCliente: '/filters/status-cliente',
  cadenas: '/filters/cadenas',
};

const readStringList = async (path: string) => {
  const { data } = await api.get<string[]>(path);
  return Array.isArray(data) ? data : [];
};

const postStringList = async (path: string, filters: SharedDependentFilters) => {
  const { data } = await api.post<string[]>(path, filters);
  return Array.isArray(data) ? data : [];
};

export const filtersApi = {
  getCatalog(key: SharedFilterCatalogKey) {
    return readStringList(catalogPaths[key]);
  },

  async getCatalogs(keys: SharedFilterCatalogKey[]) {
    const entries = await Promise.all(
      keys.map(async key => [key, await readStringList(catalogPaths[key])] as const),
    );
    return Object.fromEntries(entries) as Partial<Record<SharedFilterCatalogKey, string[]>>;
  },

  async getUserContext(): Promise<SharedFilterContext> {
    const { data } = await api.get<SharedFilterContext>('/filters/my-context');
    return data;
  },

  getJefaturas(gerencias: string[]) {
    return postStringList('/filters/jefaturas', { Gerencia: gerencias });
  },

  getRutas(jefaturas: string[]) {
    return postStringList('/filters/rutas', { Jefatura: jefaturas });
  },

  getGrupos(marcas: string[]) {
    return postStringList('/filters/grupos', { Marca: marcas });
  },

  getCategorias(marcas: string[], grupos: string[]) {
    return postStringList('/filters/categorias', { Marca: marcas, grupo: grupos });
  },

  getSkus(filters: Pick<SharedDependentFilters, 'Marca' | 'grupo' | 'Categorias'>) {
    return postStringList('/filters/skus', filters);
  },
};

export default filtersApi;
