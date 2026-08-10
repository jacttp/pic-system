import api from '@/api/axios';
import type {
  Pic52ApiResponse,
  Pic52Catalogs,
  Pic52Filters,
  Pic52MatrixSearchResponse,
  Pic52ProductOptions,
  Pic52Report,
  Pic52ReportRequest,
  Pic52TrendJob,
  Pic52UserContext,
} from '../types/pic52';

const matrixFilters = (filters: Pic52Filters) => ({
  canales: filters.canales,
  gerencias: filters.gerencias,
  jefaturas: filters.jefaturas,
  rutas: filters.rutas,
  formatos: filters.formatos,
});

export const pic52Api = {
  async getCatalogs(): Promise<Pic52Catalogs> {
    const { data } = await api.get<Pic52ApiResponse<Pic52Catalogs>>('/pic-52s/catalogs');
    return data.data;
  },

  async getUserContext(): Promise<Pic52UserContext> {
    const { data } = await api.get<Pic52UserContext>('/filters/my-context');
    return data;
  },

  async getCanales(): Promise<string[]> {
    const { data } = await api.get<string[]>('/filters/canales');
    return data;
  },

  async getGerencias(): Promise<string[]> {
    const { data } = await api.get<string[]>('/filters/gerencias');
    return data;
  },

  async getFormatos(): Promise<string[]> {
    const { data } = await api.get<string[]>('/filters/formato-cliente');
    return data;
  },

  async getJefaturas(gerencias: string[]): Promise<string[]> {
    const { data } = await api.post<string[]>('/filters/jefaturas', { Gerencia: gerencias });
    return data;
  },

  async getRutas(jefaturas: string[]): Promise<string[]> {
    const { data } = await api.post<string[]>('/filters/rutas', { Jefatura: jefaturas });
    return data;
  },

  async getProductOptions(
    years: number[],
    transaction: string,
    filters: Pic52Filters,
    dimensions?: Array<keyof Pic52ProductOptions>,
  ): Promise<Pic52ProductOptions> {
    const { data } = await api.post<Pic52ApiResponse<Pic52ProductOptions>>(
      '/pic-52s/product-options',
      { years, transaction, filters, dimensions },
    );
    return data.data;
  },

  async searchMatrices(params: {
    searchTerm: string;
    filters: Pic52Filters;
    page: number;
    pageSize?: number;
  }): Promise<Pic52MatrixSearchResponse> {
    const { data } = await api.post<Pic52MatrixSearchResponse>(
      '/filters/search-matrices',
      {
        searchTerm: params.searchTerm,
        filters: matrixFilters(params.filters),
        page: params.page,
        pageSize: params.pageSize ?? 20,
      },
    );
    return data;
  },

  async getReport(payload: Pic52ReportRequest): Promise<Pic52ApiResponse<Pic52Report>> {
    const { years, weeks, transaction, filters } = payload;
    const { data } = await api.post<Pic52ApiResponse<Pic52Report>>('/pic-52s/report', {
      years,
      weeks,
      transaction,
      filters,
    });
    return data;
  },

  async createTrendJob(payload: Pic52ReportRequest): Promise<Pic52ApiResponse<Pic52TrendJob>> {
    const { data } = await api.post<Pic52ApiResponse<Pic52TrendJob>>('/pic-52s/trend', payload);
    return data;
  },

  async getTrendJob(jobId: string): Promise<Pic52ApiResponse<Pic52TrendJob>> {
    const { data } = await api.get<Pic52ApiResponse<Pic52TrendJob>>(
      `/pic-52s/trend/${encodeURIComponent(jobId)}`,
    );
    return data;
  },

  async cancelTrendJob(jobId: string): Promise<Pic52ApiResponse<Pic52TrendJob>> {
    const { data } = await api.delete<Pic52ApiResponse<Pic52TrendJob>>(
      `/pic-52s/trend/${encodeURIComponent(jobId)}`,
    );
    return data;
  },
};
