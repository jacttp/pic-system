// src/modules/StockAnalytics/services/stockAnalyticsApi.ts

import api from '@/api/axios';
import type {
    WeeklySummaryRequest,
    WeeklySummaryResponse,
    AverageMetricRequest,
    AverageMetricResponse,
    CurrentInventoryRequest,
    CurrentInventoryResponse,
    CoverageRequest,
    CoverageResponse,
    StockoutsRequest,
    StockoutsResponse,
    FilterListResponse,
} from '../types/stockAnalytics.types';
import type { AxiosResponse } from 'axios';

// v1 Analytics — sin prefijo /v2
const BASE = '/stock';

export const stockAnalyticsApi = {

    getWeeklySummary(
        payload: WeeklySummaryRequest
    ): Promise<AxiosResponse<WeeklySummaryResponse>> {
        return api.post(`${BASE}/summary`, payload);
    },

    getAverageMetric(
        payload: AverageMetricRequest
    ): Promise<AxiosResponse<AverageMetricResponse>> {
        return api.post(`${BASE}/average`, payload);
    },

    getCurrentInventory(
        payload: CurrentInventoryRequest
    ): Promise<AxiosResponse<CurrentInventoryResponse>> {
        return api.post(`${BASE}/current-inventory`, payload);
    },

    getCoverage(
        payload: CoverageRequest
    ): Promise<AxiosResponse<CoverageResponse>> {
        return api.post(`${BASE}/coverage`, payload);
    },

    getStockouts(
        payload: StockoutsRequest
    ): Promise<AxiosResponse<StockoutsResponse>> {
        return api.post(`${BASE}/stockouts`, payload);
    },

    // ─── Filtros estáticos (GET) ──────────────────────────────────────────────
    getGerencias(): Promise<AxiosResponse<FilterListResponse>> {
        return api.get('/filters/gerencias');
    },

    getMarcas(): Promise<AxiosResponse<FilterListResponse>> {
        return api.get('/filters/marcas');
    },

    // ─── Filtros dependientes (POST) ─────────────────────────────────────────
    getSKUs(payload: { Marca?: string[]; grupo?: string[]; Categorias?: string[] }): Promise<AxiosResponse<FilterListResponse>> {
        return api.post('/filters/skus', payload);
    },

    searchClients(query: string): Promise<AxiosResponse<FilterListResponse>> {
        return api.post('/filters/search-clients', { query });
    },


};