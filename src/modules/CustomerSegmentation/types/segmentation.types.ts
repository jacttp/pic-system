/* src/modules/CustomerSegmentation/types/segmentation.types.ts */

// ============================================================
// TIPOS DE AGRUPACIÓN Y VISUALIZACIÓN
// ============================================================

export type GroupType = 'quartiles' | 'quintiles' | 'deciles' | 'percentiles'
export type ChartType = 'boxplot' | 'normal' | 'histogram' | 'stacked' | 'master' | 'pareto'
export type PeriodType = 'monthly' | 'annual'
export type MetricType = 'VENTA_KG' | 'VENTA_$$'

// ============================================================
// FILTROS
// ============================================================

export interface SegmentationPeriod {
   type: PeriodType
   years: string[]
   monthStart: number
   monthEnd: number
}

export interface SegmentationFilters {
   // Filtros organizacionales
   canal?: string[]
   gerencia?: string[]
   jefatura?: string[]
   ruta?: string[]

   // Filtros de producto
   marca?: string[]
   grupo?: string[]
   categoria?: string[]

   // Período y métrica
   period: SegmentationPeriod
   metric: MetricType
}

// ============================================================
// REQUEST/RESPONSE DE API
// ============================================================

export interface SegmentationRequest {
   groupType: GroupType
   filters: SegmentationFilters
   includeClientList?: boolean
}

export interface ClientSegment {
   id: string // 'Q1', 'Q2', 'D1', 'P95', etc.
   label: string // 'Quintiles 1: Alto Volumen'
   range: {
      min: number
      max: number
      unit: 'KG' | '$$'
   }

   // Métricas de clientes
   clientCount: number
   clientPercent: number
   clientPercentAccum: number

   // Métricas de volumen
   volume: number
   volumePercent: number
   volumePercentAccum: number

   // KPIs
   avgTicket: number

   // IDs para queries posteriores
   clientIds: string[]

   // Top productos
   topProducts: Array<{
      sku: string
      volume: number
      percent: number
   }>

   // Recomendación comercial
   recommendation?: {
      strategy: 'retain' | 'grow' | 'recover' | 'monitor'
      message: string
   }
}

export interface SegmentationStatistics {
   count: number
   sum: number
   mean: number
   median: number
   stdDev: number
   variance: number
   min: number
   max: number
   quartiles: [number, number, number] // Q1, Q2, Q3
   outliers: Array<{
      clientId: string
      clientName: string
      value: number
   }>
   unit: 'KG' | '$$'
}

export interface ParetoData {
   topClientsPercent: number
   topClientsCount: number
   topVolumePercent: number
   cutoffValue: number
   bottom80Clients: {
      count: number
      percent: number
      volumePercent: number
   }
   giniIndex: number
}

export interface SegmentationResponse {
   segments: ClientSegment[]
   statistics: SegmentationStatistics
   pareto: ParetoData
   filters: SegmentationFilters
   groupType: GroupType
   totalClients: number
   totalVolume: number
   generatedAt: string
}

// ============================================================
// CLIENTES DE SEGMENTO
// ============================================================

export interface ClientInSegment {
   clientId: string
   clientName: string
   gerencia: string
   jefatura: string
   ruta: string
   canal: string
   volume: number
   volumeRank: number
   activeMonths: number
   topProduct?: string
   frequency: number
}

export interface SegmentClientsPagination {
   page: number
   pageSize: number
   totalClients: number
   totalPages: number
   hasNextPage: boolean
   hasPrevPage: boolean
}

export interface SegmentClientsResponse {
   segmentId: string
   clients: ClientInSegment[]
   pagination: SegmentClientsPagination
   meta: {
      totalVolume: number
      avgVolume: number
   }
}

// ============================================================
// COMPARACIÓN TEMPORAL
// ============================================================

export interface PeriodComparison {
   label: string
   totalClients: number
   totalVolume: number
   avgVolume: number
}

export interface ClientVolumeChange {
   clientId: string
   clientName: string
   volumePeriod1: number
   volumePeriod2: number
   change: number
   changePercent: number
}

export interface SegmentationComparisonResponse {
   period1: PeriodComparison
   period2: PeriodComparison
   changes: {
      clientsChange: number
      clientsChangePercent: number
      volumeChange: number
      volumeChangePercent: number
   }
   migration: {
      sameSegment: number
      movedUp: number
      movedDown: number
      migrationMatrix: Record<string, number>
      retentionRate: number
   }
   topGrowers: ClientVolumeChange[]
   topDecliners: ClientVolumeChange[]
   newClients: number
   lostClients: number
}

// ============================================================
// ESTADO LOCAL DE UI
// ============================================================

export interface SegmentationUIState {
   selectedGroupType: GroupType
   selectedChartType: ChartType
   activeSegmentId: string | null
   isFiltersOpen: boolean
   isComparisonMode: boolean
}

