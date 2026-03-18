// src/modules/Callbook/services/callbookApi.ts
import type { AxiosResponse } from 'axios'
import api from '@/api/axios'
import type {
  CallbookSummaryRequest,
  CallbookSummaryResponse,
  CallbookFilteredRequest,
  CallbookFilteredResponse,
  CallbookOutOfStockRequest,
  CallbookOutOfStockResponse,
  CallbookWoWRequest,
  CallbookWoWResponse,
  CallbookGlobalOverviewRequest,
  CallbookGlobalOverviewResponse,
  CallbookGlobalSummaryRequest,
  CallbookGlobalSummaryResponse,
  CallbookGlobalOutOfStockRequest,
  CallbookGlobalOutOfStockResponse,
  CallbookMatricesOverviewRequest,
  CallbookMatricesOverviewResponse,
} from '../types/callbook.types'

// v1 Analytics — sin VITE_API_V2_PATH, path directo igual que /stock, /segmentation, etc.
const BASE = '/callbook'

const callbookApi = {
  getWeeklySummary(
    payload: CallbookSummaryRequest
  ): Promise<AxiosResponse<CallbookSummaryResponse>> {
    return api.post(`${BASE}/summary`, payload)
  },

  getFilteredRawData(
    payload: CallbookFilteredRequest
  ): Promise<AxiosResponse<CallbookFilteredResponse>> {
    return api.post(`${BASE}/filtered`, payload)
  },

  getOutOfStock(
    payload: CallbookOutOfStockRequest
  ): Promise<AxiosResponse<CallbookOutOfStockResponse>> {
    return api.post(`${BASE}/out-of-stock`, payload)
  },

  getWoWVariation(
    payload: CallbookWoWRequest
  ): Promise<AxiosResponse<CallbookWoWResponse>> {
    return api.post(`${BASE}/wow-variation`, payload)
  },

  /*Vista unificada: totales + quiebres por SKU/semana.
    Soporta panorama general, filtro de semanas y drill-down por matriz.
  */

  getGlobalOverview(
    payload: CallbookGlobalOverviewRequest
  ): Promise<AxiosResponse<CallbookGlobalOverviewResponse>> {
    return api.post(`${BASE}/global-overview`, payload)
  },

  /**
   * Solo sumatorias de inventario — para widgets/KPIs ligeros.
   */
  getGlobalSummary(
    payload: CallbookGlobalSummaryRequest
  ): Promise<AxiosResponse<CallbookGlobalSummaryResponse>> {
    return api.post(`${BASE}/global-summary`, payload)
  },

  /**
   * Ranking de quiebres por SKU — para widget de alertas críticas.
   */
  getGlobalOutOfStock(
    payload: CallbookGlobalOutOfStockRequest
  ): Promise<AxiosResponse<CallbookGlobalOutOfStockResponse>> {
    return api.post(`${BASE}/global-out-of-stock`, payload)
  },

  getMatricesOverview(
    payload: CallbookMatricesOverviewRequest
  ): Promise<AxiosResponse<CallbookMatricesOverviewResponse>> {
    return api.post(`${BASE}/matrices-overview`, payload)
  },

  /**
   * POST /callbook/report
   * Reporte jerárquico Tienda → SKU × Semanas (tabla pivoteada).
   * El backend entrega la estructura lista para renderizar.
   */
  getReport(payload: {
    year: string
    weeks: number[]
    filters?: { clientId?: string[]; sku?: string[] }
  }): Promise<AxiosResponse<{
    success: boolean
    weeks: number[]
    totalGeneral: number
    count: number
    data: Array<{
      clientId: string
      totalGeneral: number
      weeks: Record<string, number>
      skus: Array<{
        sku: string
        UltimaFechaCaptura: string | null
        totalGeneral: number
        weeks: Record<string, number>
      }>
    }>
  }>> {
    return api.post(`${BASE}/report`, payload)
  },
}

export default callbookApi