// src/modules/SellOut/services/selloutApi.ts

import api from '@/api/axios'
import type {
    SellOutFilters,
    SellOutSummaryResponse,
    SellOutWeeksResponse,
    SellOutSku,
} from '../types/sellout.types'

const BASE = '/sellout'

export const selloutApi = {

    /**
     * KPIs + serie temporal en una sola llamada.
     * Backend filtra basev52PicSO + CALLBOOKIC con los parámetros recibidos.
     */
    async getSummary(filters: SellOutFilters): Promise<SellOutSummaryResponse> {
        const { data } = await api.post(`${BASE}/summary`, filters)
        return data
    },

    /**
     * Semanas disponibles por año — para poblar el selector de semana.
     * Query ligera sobre DISTINCT de ambas tablas.
     */
    async getWeeks(año: string): Promise<SellOutWeeksResponse> {
        const { data } = await api.get(`${BASE}/weeks`, { params: { anio: año } })
        return data
    },

    // ─── Filtros compartidos desde filterController ────────────────────────────

    async getAños(): Promise<string[]> {
        const { data } = await api.get('/filters/anios')
        return Array.isArray(data) ? data : data.data ?? []
    },

    async getGerencias(): Promise<string[]> {
        const { data } = await api.get('/filters/gerencias')
        return Array.isArray(data) ? data : data.data ?? []
    },

    async getRutas(gerencia: string | null): Promise<string[]> {
        const { data } = await api.post('/filters/rutas', { gerencia })
        return Array.isArray(data) ? data : data.data ?? []
    },

    async getSkus(filters: Partial<SellOutFilters>): Promise<SellOutSku[]> {
        const { data } = await api.post('/filters/skus', filters)
        const raw: string[] = Array.isArray(data) ? data : data.data ?? []
        // filterController devuelve strings — los normalizamos al tipo local
        return raw.map((nombre) => ({ sku: nombre, nombre }))
    },
}