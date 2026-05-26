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
    CpfrSkuUnit,
    CpfrSkuUnitPayload,
} from '../types/cpfrTypes'

import type {CpfrDashZ8Response } from '../types/cpfrZ8Types'
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

    /**
     * GET /api/cpfr/weeks
     * Devuelve la lista completa de semanas y años disponibles de las órdenes en CPFR_OrdenCompra.
     */
    async getWeeks(): Promise<Array<{ anio: number; semana: number; semana_ic: string; key: string }>> {
        const { data } = await api.get('/cpfr/weeks')
        return data.data
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
    async updateStatus(body: CpfrUpdateStatusBody): Promise<{ success: boolean; approval_id?: number | null }> {
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
     * GET /api/v2/cpfr/config
     */
    async getAllConfigs(): Promise<CpfrStoreConfig[]> {
        const { data } = await api.get('/v2/cpfr/config')
        return data.data
    },

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

    // ── SKU Unit Config (v1 analytics) ───────────────────────────────────────

    /**
     * GET /api/cpfr/units
     * Lista todos los SKUs con sus unidades de conversión desde skus_IC.
     */
    async getAllSkusConfig(): Promise<CpfrSkuUnit[]> {
        const { data } = await api.get('/cpfr/units')
        return data.data
    },

    /**
     * PATCH /api/cpfr/units/:sku
     * Actualización parcial de unidades de conversión de un SKU.
     */
    async updateSkuConfig(sku: string, payload: Partial<CpfrSkuUnitPayload>): Promise<{ success: boolean }> {
        const { data } = await api.patch(`/cpfr/units/${encodeURIComponent(sku)}`, payload)
        return data
    },


    /**
     * POST /api/cpfr/dash-orders/z8
     * Artículos Z8 ausentes en la semana actual.
     * Mismo body que loadDashboard.
     * Response: CpfrDashZ8Response (tiendas con ocs_z8 en lugar de skus directos)
     */
    async loadZ8Dashboard(body: DashOrdersBody): Promise<CpfrDashZ8Response> {
        const { data } = await api.post('/cpfr/dash-orders/z8', body)
        return data
    },

    /**
     * POST /api/cpfr/generate-z8
     * Genera manualmente los cascarones Z8 para la semana activa.
     * Devuelve { success, message, created }.
     */
    async generateZ8(body: DashOrdersBody): Promise<{ success: boolean; message: string; created: number }> {
        const { data } = await api.post('/cpfr/generate-z8', body)
        return data
    },

    // ── Sku Cadena Mappings (v2) ───────────────────────────────────────────────

    async getSkuCadenas(): Promise<import('../types/cpfrTypes').CpfrSkuCadena[]> {
        const { data } = await api.get('/v2/skuscadenas')
        return data.data
    },

    async createSkuCadena(payload: Partial<import('../types/cpfrTypes').CpfrSkuCadena>): Promise<{ success: boolean; message?: string }> {
        const { data } = await api.post('/v2/skuscadenas', payload)
        return data
    },

    async updateSkuCadena(id: number, payload: Partial<import('../types/cpfrTypes').CpfrSkuCadena>): Promise<{ success: boolean; message?: string }> {
        const { data } = await api.put(`/v2/skuscadenas/${id}`, payload)
        return data
    },

    async deleteSkuCadena(id: number): Promise<{ success: boolean; message?: string }> {
        const { data } = await api.delete(`/v2/skuscadenas/${id}`)
        return data
    },

    /**
     * DELETE /api/cpfr/z8/drafts
     * Elimina cascarones Z8 en estado borrador de un rango de fechas.
     * Limpia CPFR_ocz8 (fuente) y CPFR_PedidoGenerado (cálculo persistido).
     */
    async deleteZ8Drafts(body: {
        fec_inicio: string
        fec_fin: string
        nom_cadena: string
        id_cliente?: string
    }): Promise<{
        success: boolean
        deleted: number
        detail: { ocz8: number; pedido_generado: number }
        message: string
    }> {
        const { data } = await api.delete('/cpfr/z8/drafts', { data: body })
        return data
    },
    
}