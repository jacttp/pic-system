import api from '@/api/axios';
import type {
  SelloutApiResponse,
  SelloutContext,
  SelloutExportData,
  SelloutFilters,
  SelloutMatrix,
  SelloutMatrixRequest,
  SelloutSummary,
  SelloutSummaryRequest,
  SelloutStoreOptions,
} from '../types/selloutAnalytics';

const BASE_PATH = '/sellout-analytics';

export const selloutAnalyticsApi = {
  async getContext(): Promise<SelloutContext> {
    const { data } = await api.get<SelloutApiResponse<SelloutContext>>(`${BASE_PATH}/context`);
    return data.data;
  },

  async getSummary(payload: SelloutSummaryRequest): Promise<SelloutApiResponse<SelloutSummary>> {
    const { data } = await api.post<SelloutApiResponse<SelloutSummary>>(`${BASE_PATH}/summary`, payload);
    return data;
  },

  async getMatrix(payload: SelloutMatrixRequest): Promise<SelloutApiResponse<SelloutMatrix>> {
    const { data } = await api.post<SelloutApiResponse<SelloutMatrix>>(`${BASE_PATH}/matrix`, payload);
    return data;
  },

  async getStoreOptions(payload: {
    periods: SelloutSummaryRequest['periods'];
    filters: SelloutFilters;
    searchTerm?: string;
    page?: number;
    pageSize?: number;
  }): Promise<SelloutStoreOptions> {
    const { data } = await api.post<SelloutApiResponse<SelloutStoreOptions>>(
      `${BASE_PATH}/store-options`,
      payload,
    );
    return data.data;
  },

  async exportMatrix(payload: SelloutSummaryRequest): Promise<SelloutExportData> {
    const { data } = await api.post<SelloutApiResponse<SelloutExportData>>(
      `${BASE_PATH}/export`,
      payload,
    );
    return data.data;
  },
};
