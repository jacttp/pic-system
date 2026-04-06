// src/modules/CPFR/services/cpfrApi.ts
// ─────────────────────────────────────────────────────────────────────────────
// Capa de servicio — endpoints nuevos de dash-orders + endpoints conservados
// Base path /api/  → endpoints analytics (cpfr/*)
// Base path /api/v2/ → endpoints config (v2/cpfr/*)
// ─────────────────────────────────────────────────────────────────────────────

import api from '@/api/axios'
import type {
    CpfrCurrentWeek,
    CpfrDashResponse,
    CpfrFilters,
    CpfrOverride,
    CpfrAdjustSkuBody,
    CpfrUpdateStatusBody,
    CpfrUploadOCResponse,
    CpfrStoreConfig,
    CpfrSkuOverride,
} from '../types/cpfrTypes'

// ── Body para dash-orders ────────────────────────────────────────────────────

interface DashOrdersBody {
    year: number
    week: number
    nom_cadena: string
    criterio_global?: number
    filters?: CpfrFilters
}

interface RecalculateBody extends DashOrdersBody {
    overrides?: CpfrOverride[]
}

export const cpfrApi = {

    // ── Contexto temporal ─────────────────────────────────────────────────────

    /**
     * GET /api/cpfr/current-week
     * Devuelve { anio, semana, semana_ic } más recientes.
     * Primera llamada que hace el store al montar el módulo.
     */
    async getCurrentWeek(): Promise<CpfrCurrentWeek> {
        const { data } = await api.get('/cpfr/current-week')
        return {
            anio: data.year,
            semana: data.week,
            semana_ic: String(data.week).padStart(2, '0')
        }
    },

    // ── Dashboard principal ───────────────────────────────────────────────────

    /**
     * POST /api/cpfr/dash-orders
     * Carga principal. Retorna días → tiendas → SKUs.
     * Persiste la vista (preview: false).
     */
    async loadDashboard(body: DashOrdersBody): Promise<CpfrDashResponse> {
        const { data } = await api.post('/cpfr/dash-orders', body)
        return data
    },

    /**
     * POST /api/cpfr/dash-orders/recalculate
     * Recálculo interactivo. NO persiste (preview: true).
     * Mismo shape de respuesta que loadDashboard.
     */
    async recalculate(body: RecalculateBody): Promise<CpfrDashResponse> {
        const { data } = await api.post('/cpfr/dash-orders/recalculate', body)
        return data
    },

    // ── Ajuste de SKU ─────────────────────────────────────────────────────────

    /**
     * PATCH /api/cpfr/order/adjust
     * Ajuste manual de un SKU.
     */
    async adjustSku(body: any): Promise<{ success: boolean; message: string }> {
        const { data } = await api.patch('/cpfr/order/adjust', body)
        return data
    },

    // ── Estado del pedido de tienda ───────────────────────────────────────────

    /**
     * PATCH /api/cpfr/orders/status
     * Cambia el estado del pedido de una tienda.
     * Estados: pendiente → procesado → cerrado
     */
    async updateStatus(body: CpfrUpdateStatusBody): Promise<{ success: boolean }> {
        const { data } = await api.patch('/cpfr/orders/status', body)
        return data
    },

    // ── Upload OC ─────────────────────────────────────────────────────────────

    /**
     * POST /api/cpfr/upload-oc  (multipart/form-data)
     * Subir OC desde archivo .xls de Soriana.
     */
    async uploadOC(file: File, nom_cadena = 'soriana'): Promise<CpfrUploadOCResponse> {
        const form = new FormData()
        form.append('file', file)
        form.append('nom_cadena', nom_cadena)
        const { data } = await api.post('/cpfr/upload-oc', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        return data
    },

    // ── Config de tienda (v2) — usado por CpfrStoreConfigModal ───────────────

    /**
     * GET /api/v2/cpfr/config/:id_cliente
     */
    async getConfig(id_cliente: string): Promise<CpfrStoreConfig> {
        const { data } = await api.get(`/v2/cpfr/config/${id_cliente}`)
        return data
    },

    /**
     * PUT /api/v2/cpfr/config/:id_cliente
     * factor_ajuste NUNCA debe enviarse.
     */
    async updateConfig(
        id_cliente: string,
        payload: Omit<CpfrStoreConfig, 'id_cliente' | 'nombre_tienda' | 'factor_ajuste'>
    ): Promise<{ success: boolean }> {
        const { data } = await api.put(`/v2/cpfr/config/${id_cliente}`, payload)
        return data
    },

    // ── SKU Overrides (v2) ────────────────────────────────────────────────────

    /**
     * GET /api/v2/cpfr/config/:id_cliente/skus
     */
    async getSkuOverrides(id_cliente: string): Promise<CpfrSkuOverride[]> {
        const { data } = await api.get(`/v2/cpfr/config/${id_cliente}/skus`)
        return data
    },

    /**
     * PUT /api/v2/cpfr/config/:id_cliente/skus/:sku_muliix
     */
    async upsertSkuOverride(id_cliente: string, sku_muliix: string, semanas_objetivo: number): Promise<{ success: boolean }> {
        const { data } = await api.put(`/v2/cpfr/config/${id_cliente}/skus/${sku_muliix}`, { semanas_objetivo })
        return data
    },

    /**
     * DELETE /api/v2/cpfr/config/:id_cliente/skus/:sku_muliix
     */
    async deleteSkuOverride(id_cliente: string, sku_muliix: string): Promise<{ success: boolean }> {
        const { data } = await api.delete(`/v2/cpfr/config/${id_cliente}/skus/${sku_muliix}`)
        return data
    },
}