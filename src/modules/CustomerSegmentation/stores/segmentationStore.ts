/* src/modules/CustomerSegmentation/stores/segmentationStore.ts */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { segmentationApi } from '../services/segmentationApi'
import type {
   SegmentationResponse,
   SegmentationFilters,
   GroupType,
   ChartType,
   ClientSegment,
   SegmentClientsResponse,
   SegmentationComparisonResponse
} from '../types/segmentation.types'

export const useSegmentationStore = defineStore('customerSegmentation', () => {
   // ============================================================
   // STATE
   // ============================================================

   // Datos principales
   const data = ref<SegmentationResponse | null>(null)
   const isLoading = ref(false)
   const error = ref<string | null>(null)

   // Configuración actual
   const currentGroupType = ref<GroupType>('quintiles')
   const currentFilters = ref<SegmentationFilters>({
      canal: [],
      gerencia: [],
      jefatura: [],
      ruta: [],
      marca: [],
      grupo: [],
      categoria: [],
      period: {
         type: 'annual',
         years: [],
         monthStart: 1,
         monthEnd: 12
      },
      metric: 'VENTA_KG'
   })

   // UI State
   const selectedChartType = ref<ChartType>('master')
   const activeSegmentId = ref<string | null>(null)

   // Datos de clientes de segmento
   const segmentClientsData = ref<SegmentClientsResponse | null>(null)
   const isLoadingClients = ref(false)
   const clientsError = ref<string | null>(null)

   // Datos de comparación temporal
   const comparisonData = ref<SegmentationComparisonResponse | null>(null)
   const isLoadingComparison = ref(false)
   const comparisonError = ref<string | null>(null)

   // ============================================================
   // COMPUTED
   // ============================================================

   const hasData = computed(() => data.value !== null)

   const totalClients = computed(() => data.value?.totalClients ?? 0)

   const totalVolume = computed(() => data.value?.totalVolume ?? 0)

   const segments = computed(() => data.value?.segments ?? [])

   const statistics = computed(() => data.value?.statistics)

   const pareto = computed(() => data.value?.pareto)

   const activeSegment = computed(() => {
      if (!activeSegmentId.value || !data.value) return null
      return data.value.segments.find(s => s.id === activeSegmentId.value) ?? null
   })

   const metricLabel = computed(() => {
      return currentFilters.value.metric === 'VENTA_KG' ? 'Volumen (KG)' : 'Ventas ($$)'
   })

   const metricUnit = computed(() => {
      return currentFilters.value.metric === 'VENTA_KG' ? 'KG' : '$$'
   })

   // ============================================================
   // ACTIONS
   // ============================================================

   /**
    * Analizar segmentación con los filtros actuales
    */
   async function analyze(groupType: GroupType, filters: SegmentationFilters) {
      isLoading.value = true
      error.value = null

      try {
         const response = await segmentationApi.analyze(groupType, filters)

         data.value = response
         currentGroupType.value = groupType
         currentFilters.value = filters
         activeSegmentId.value = null // Reset segment selection

      } catch (e: any) {
         error.value = e.response?.data?.error || 'Error al analizar segmentación'
         console.error('[SegmentationStore] Error analyzing:', e)
         data.value = null

      } finally {
         isLoading.value = false
      }
   }

   /**
    * Obtener clientes de un segmento específico
    */
   async function fetchSegmentClients(
      segment: ClientSegment,
      page: number = 1,
      pageSize: number = 50
   ) {
      if (!currentFilters.value) {
         clientsError.value = 'No hay filtros configurados'
         return
      }

      isLoadingClients.value = true
      clientsError.value = null

      try {
         const response = await segmentationApi.getSegmentClients(
            segment.id,
            segment.clientIds,
            currentFilters.value,
            page,
            pageSize
         )

         segmentClientsData.value = response
         activeSegmentId.value = segment.id

      } catch (e: any) {
         clientsError.value = e.response?.data?.error || 'Error al obtener clientes'
         console.error('[SegmentationStore] Error fetching clients:', e)
         segmentClientsData.value = null

      } finally {
         isLoadingClients.value = false
      }
   }

   /**
    * Exportar clientes de segmentos seleccionados
    */
   async function exportClients(segments: ClientSegment[]) {
      if (!currentFilters.value) {
         throw new Error('No hay filtros configurados')
      }

      try {
         const segmentsData = segments.map(s => ({
            id: s.id,
            label: s.label,
            clientIds: s.clientIds
         }))

         const response = await segmentationApi.exportSegmentClients(
            segmentsData,
            currentFilters.value
         )

         return response

      } catch (e: any) {
         console.error('[SegmentationStore] Error exporting:', e)
         throw e
      }
   }

   /**
    * Comparar segmentación entre dos períodos
    */
   async function compareSegmentation(
      groupType: GroupType,
      period1: { years: string[], monthStart: number, monthEnd: number },
      period2: { years: string[], monthStart: number, monthEnd: number }
   ) {
      if (!currentFilters.value) {
         comparisonError.value = 'No hay filtros configurados'
         return
      }

      isLoadingComparison.value = true
      comparisonError.value = null

      try {
         const { period, ...filtersWithoutPeriod } = currentFilters.value

         const response = await segmentationApi.compareSegmentation(
            groupType,
            period1,
            period2,
            filtersWithoutPeriod
         )

         comparisonData.value = response

      } catch (e: any) {
         comparisonError.value = e.response?.data?.error || 'Error al comparar períodos'
         console.error('[SegmentationStore] Error comparing:', e)
         comparisonData.value = null

      } finally {
         isLoadingComparison.value = false
      }
   }

   /**
    * Establecer tipo de gráfico activo
    */
   function setChartType(chartType: ChartType) {
      selectedChartType.value = chartType
   }

   /**
    * Establecer segmento activo
    */
   function setActiveSegment(segmentId: string | null) {
      activeSegmentId.value = segmentId
   }

   /**
    * Limpiar todos los datos
    */
   function clearData() {
      data.value = null
      segmentClientsData.value = null
      comparisonData.value = null
      error.value = null
      clientsError.value = null
      comparisonError.value = null
      activeSegmentId.value = null
   }

   /**
    * Resetear filtros a valores por defecto
    */
   function resetFilters() {
      currentFilters.value = {
         canal: [],
         gerencia: [],
         jefatura: [],
         ruta: [],
         marca: [],
         grupo: [],
         categoria: [],
         period: {
            type: 'annual',
            years: [],
            monthStart: 1,
            monthEnd: 12
         },
         metric: 'VENTA_KG'
      }
   }

   // ============================================================
   // RETURN
   // ============================================================

   return {
      // State
      data,
      isLoading,
      error,
      currentGroupType,
      currentFilters,
      selectedChartType,
      activeSegmentId,
      segmentClientsData,
      isLoadingClients,
      clientsError,
      comparisonData,
      isLoadingComparison,
      comparisonError,

      // Computed
      hasData,
      totalClients,
      totalVolume,
      segments,
      statistics,
      pareto,
      activeSegment,
      metricLabel,
      metricUnit,

      // Actions
      analyze,
      fetchSegmentClients,
      exportClients,
      compareSegmentation,
      setChartType,
      setActiveSegment,
      clearData,
      resetFilters
   }
})