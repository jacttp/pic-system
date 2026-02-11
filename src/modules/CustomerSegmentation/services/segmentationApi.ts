/* src/modules/CustomerSegmentation/services/segmentationApi.ts */

import api from '@/api/axios'
import type {
   SegmentationRequest,
   SegmentationResponse,
   SegmentClientsResponse,
   SegmentationComparisonResponse,
   GroupType,
   SegmentationFilters
} from '../types/segmentation.types'

// Base path para endpoints de segmentación
const BASE = 'segmentation'

export const segmentationApi = {
   /**
    * Análisis principal de segmentación
    * POST segmentation/analyze
    */
   async analyze(
      groupType: GroupType,
      filters: SegmentationFilters
   ): Promise<SegmentationResponse> {
      const { data } = await api.post<SegmentationResponse>(
         `${BASE}/analyze`,
         {
            groupType,
            filters,
            includeClientList: false
         }
      )
      return data
   },

   /**
    * Obtener clientes de un segmento específico (paginado)
    * GET segmentation/clients/:segmentId
    */
   async getSegmentClients(
      segmentId: string,
      clientIds: string[],
      filters: SegmentationFilters,
      page: number = 1,
      pageSize: number = 50,
      sortBy: 'volume' | 'clientName' | 'activeMonths' = 'volume',
      sortOrder: 'asc' | 'desc' = 'desc'
   ): Promise<SegmentClientsResponse> {
      const { data } = await api.get<SegmentClientsResponse>(
         `${BASE}/clients/${segmentId}`,
         {
            params: {
               page,
               pageSize,
               sortBy,
               sortOrder,
               clientIds: JSON.stringify(clientIds),
               filters: JSON.stringify(filters),
               metric: filters.metric
            }
         }
      )
      return data
   },

   /**
    * Exportar clientes de múltiples segmentos
    * POST segmentation/clients/export
    */
   async exportSegmentClients(
      segments: Array<{
         id: string
         label: string
         clientIds: string[]
      }>,
      filters: SegmentationFilters
   ): Promise<{
      clients: any[]
      total: number
      exportedAt: string
   }> {
      const { data } = await api.post(
         `${BASE}/clients/export`,
         {
            segments,
            filters,
            metric: filters.metric
         }
      )
      return data
   },

   /**
    * Comparación temporal entre dos períodos
    * POST segmentation/comparison
    */
   async compareSegmentation(
      groupType: GroupType,
      period1: { years: string[], monthStart: number, monthEnd: number },
      period2: { years: string[], monthStart: number, monthEnd: number },
      filters: Omit<SegmentationFilters, 'period'>
   ): Promise<SegmentationComparisonResponse> {
      const { data } = await api.post<SegmentationComparisonResponse>(
         `${BASE}/comparison`,
         {
            groupType,
            period1,
            period2,
            filters,
            metric: filters.metric || 'VENTA_KG'
         }
      )
      return data
   }
}