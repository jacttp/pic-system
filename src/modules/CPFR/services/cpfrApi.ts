// src/modules/CPFR/services/cpfrApi.ts
// ─────────────────────────────────────────────────────────────────────────────
// Capa de servicio. Actualmente usa mock; cuando el backend esté listo
// reemplazar el body de cada función con la llamada axios correspondiente.
// ─────────────────────────────────────────────────────────────────────────────

// import api from '@/api/axios'                          // descomentar cuando haya backend
import type { CpfrDataItem, CpfrFilterOptions } from '../types/cpfrTypes'
import { generateMockData, generateMockFilters } from './cpfrMock'

// const BASE = '/v2/cpfr'                                // descomentar cuando haya backend

export const cpfrApi = {

    /**
     * GET /api/v2/cpfr/filters
     * Devuelve opciones para poblar los selectores.
     */
    async getFilters(): Promise<CpfrFilterOptions> {
        // TODO: reemplazar con → const { data } = await api.get(`${BASE}/filters`)
        await new Promise(r => setTimeout(r, 300))           // simula latencia
        return generateMockFilters()
    },

    /**
     * GET /api/v2/cpfr/data?ano=&semana=
     * Devuelve inv. actual + venta prom. semanal por tienda × SKU.
     * El backend agrega InvSis y VtaOut de basev52PicSO y hace JOIN con pedidoCadena.
     */
    async getData(ano: number, semana: number): Promise<CpfrDataItem[]> {
        // TODO: reemplazar con → const { data } = await api.get(`${BASE}/data`, { params: { ano, semana } })
        await new Promise(r => setTimeout(r, 600))           // simula latencia
        return generateMockData(ano, semana)
    },
}