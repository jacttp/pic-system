// src/modules/Callbook/stores/callbookStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import callbookApi from '../services/callbookApi'
import type {
    CallbookSummaryRecord,
    CallbookRawRecord,
    CallbookWoWRecord,
    CallbookStoreFilters,
    CallbookGlobalOverviewRecord,
    CallbookGlobalOutOfStockRecord,
    CallbookMatricesOverviewRecord,
} from '../types/callbook.types'

export const useCallbookStore = defineStore('callbook', () => {

    // ─── Filtros client-specific ──────────────────────────────────────────
    const filters = ref<CallbookStoreFilters>({
        clientId: '',
        year: '',
        currentWeek: '',
        previousWeek: '',
        skus: [],
    })

    // ─── Filtros globales ─────────────────────────────────────────────────
    const globalFilters = ref({
        anio: new Date().getFullYear().toString(),
        semana: '',
        semanas: [] as string[],
    })

    // ─── Data client-specific ─────────────────────────────────────────────
    const summaryData = ref<CallbookSummaryRecord[]>([])
    const filteredData = ref<CallbookRawRecord[]>([])
    const outOfStockData = ref<CallbookSummaryRecord[]>([])
    const wowData = ref<CallbookWoWRecord[]>([])

    const filteredCount = ref(0)
    const outOfStockCount = ref(0)
    const wowCount = ref(0)

    // ─── Data global ──────────────────────────────────────────────────────
    const overviewData = ref<CallbookGlobalOverviewRecord[]>([])
    const outOfStockGlobal = ref<CallbookGlobalOutOfStockRecord[]>([])
    const matricesData = ref<CallbookMatricesOverviewRecord[]>([])

    // ─── Data report (POST /callbook/report) ───────────────────────────────
    type ReportSkuRow = {
        sku: string
        UltimaFechaCaptura: string | null
        totalGeneral: number
        weeks: Record<string, number>
    }
    type ReportClientRow = {
        clientId: string
        totalGeneral: number
        weeks: Record<string, number>
        skus: ReportSkuRow[]
    }
    const reportData    = ref<ReportClientRow[]>([])
    const reportWeeks   = ref<number[]>([])
    const reportTotal   = ref(0)

    // ─── Loading ──────────────────────────────────────────────────────────
    const loadingSummary = ref(false)
    const loadingFiltered = ref(false)
    const loadingOutOfStock = ref(false)
    const loadingWow = ref(false)
    const loadingOverview = ref(false)
    const loadingOosGlobal = ref(false)
    const loadingMatrices = ref(false)
    const loadingReport  = ref(false)

    const error = ref<string | null>(null)

    // ─── Computed client-specific ─────────────────────────────────────────
    const totalWeeklyPieces = computed(() =>
        summaryData.value.reduce((acc, r) => acc + r.pieces, 0)
    )

    const netWoWVariation = computed(() =>
        wowData.value.reduce((acc, r) => acc + r.variation, 0)
    )

    const isAnyLoading = computed(() =>
        loadingSummary.value ||
        loadingFiltered.value ||
        loadingOutOfStock.value ||
        loadingWow.value
    )

    // ─── Computed global ──────────────────────────────────────────────────
    const matricesTotalPZ = computed(() =>
        matricesData.value.reduce((acc, r) => acc + r.TotalPZ_Tienda, 0)
    )

    const matricesTotalTiendas = computed(() =>
        new Set(matricesData.value.map(r => r.Matriz)).size
    )

    const matricesTotalSKUs = computed(() =>
        matricesData.value.reduce((acc, r) => acc + r.SKUsCapturados, 0)
    )

    const overviewTotalQuiebres = computed(() =>
        outOfStockGlobal.value.reduce((acc, r) => acc + r.TiendasEnQuiebre, 0)
    )

    const isAnyLoadingGlobal = computed(() =>
        loadingMatrices.value || loadingOosGlobal.value
    )

    // ─── Actions client-specific ──────────────────────────────────────────
    async function fetchSummary() {
        if (!filters.value.clientId || !filters.value.year) return
        loadingSummary.value = true
        error.value = null
        try {
            const { data } = await callbookApi.getWeeklySummary({
                clientId: filters.value.clientId,
                year: filters.value.year,
            })
            summaryData.value = data.data
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Error al cargar resumen semanal'
        } finally {
            loadingSummary.value = false
        }
    }

    async function fetchFiltered() {
        if (!filters.value.clientId) return
        loadingFiltered.value = true
        error.value = null
        try {
            const { data } = await callbookApi.getFilteredRawData({
                filters: {
                    clientId: [filters.value.clientId],
                    year: filters.value.year ? [filters.value.year] : undefined,
                    week: filters.value.currentWeek ? [filters.value.currentWeek] : undefined,
                    sku: filters.value.skus.length ? filters.value.skus : undefined,
                },
                limit: 500,
            })
            filteredData.value = data.data
            filteredCount.value = data.count
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Error al cargar bitácora'
        } finally {
            loadingFiltered.value = false
        }
    }

    async function fetchOutOfStock() {
        if (!filters.value.clientId || !filters.value.year || !filters.value.currentWeek) return
        loadingOutOfStock.value = true
        error.value = null
        try {
            const { data } = await callbookApi.getOutOfStock({
                clientId: filters.value.clientId,
                year: filters.value.year,
                week: filters.value.currentWeek,
            })
            outOfStockData.value = data.data
            outOfStockCount.value = data.count
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Error al cargar agotados'
        } finally {
            loadingOutOfStock.value = false
        }
    }

    async function fetchWoW() {
        if (
            !filters.value.clientId ||
            !filters.value.year ||
            !filters.value.currentWeek ||
            !filters.value.previousWeek
        ) return
        loadingWow.value = true
        error.value = null
        try {
            const { data } = await callbookApi.getWoWVariation({
                clientId: filters.value.clientId,
                year: filters.value.year,
                currentWeek: filters.value.currentWeek,
                previousWeek: filters.value.previousWeek,
            })
            wowData.value = data.data
            wowCount.value = data.count
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Error al cargar variación WoW'
        } finally {
            loadingWow.value = false
        }
    }

    async function fetchAll() {
        await Promise.allSettled([
            fetchSummary(),
            fetchFiltered(),
            fetchOutOfStock(),
            fetchWoW(),
        ])
    }

    function setFilters(partial: Partial<CallbookStoreFilters>) {
        filters.value = { ...filters.value, ...partial }
        fetchAll()
    }

    // ─── Actions globales ─────────────────────────────────────────────────
    async function fetchMatricesOverview(semanas?: string[]) {
        loadingMatrices.value = true
        error.value = null
        try {
            const { data } = await callbookApi.getMatricesOverview({
                anio: globalFilters.value.anio,
                ...(semanas?.length ? { semanas } : {}),
            })
            // wrapper: { success, count, data: [...] }
            matricesData.value = data.data
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Error al cargar panorama de matrices'
            matricesData.value = []
        } finally {
            loadingMatrices.value = false
        }
    }

    async function fetchOosGlobal(semana: string) {
        if (!semana) return
        loadingOosGlobal.value = true
        error.value = null
        try {
            const { data } = await callbookApi.getGlobalOutOfStock({
                anio: globalFilters.value.anio,
                semana,
            })
            // wrapper: { success, count, data: [...] }
            outOfStockGlobal.value = data.data
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Error al cargar quiebres globales'
            outOfStockGlobal.value = []
        } finally {
            loadingOosGlobal.value = false
        }
    }

    /**
     * Llama a POST /callbook/report.
     * @param semanas Array de números de semana (ej. [10]). Por defecto usa la semana activa del store.
     */
    async function fetchReport(semanas?: number[]) {
        const weekNumbers = semanas ?? (globalFilters.value.semana ? [Number(globalFilters.value.semana)] : [])
        if (!weekNumbers.length) return
        loadingReport.value = true
        error.value = null
        try {
            const { data } = await callbookApi.getReport({
                year: globalFilters.value.anio,
                weeks: weekNumbers,
            })
            reportData.value  = data.data
            reportWeeks.value = data.weeks
            reportTotal.value = data.totalGeneral
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Error al cargar el reporte'
            reportData.value  = []
            reportWeeks.value = []
            reportTotal.value = 0
        } finally {
            loadingReport.value = false
        }
    }

    async function fetchGlobalDashboard(semana?: string) {
        const target = semana ?? globalFilters.value.semana
        if (target) globalFilters.value.semana = target
        // Construir ventana de 4 semanas: [target-3, target-2, target-1, target]
        const targetNum = Number(target)
        const fourWeeks = targetNum
            ? [
                Math.max(1, targetNum - 3),
                Math.max(1, targetNum - 2),
                Math.max(1, targetNum - 1),
                targetNum,
              ].filter((v, i, arr) => arr.indexOf(v) === i) // deduplicar si target < 4
            : []
        await Promise.allSettled([
            fetchMatricesOverview(target ? [target] : undefined),
            fetchOosGlobal(target ?? ''),
            fetchReport(fourWeeks.length ? fourWeeks : undefined),
        ])
    }

    function setGlobalAnio(anio: string) {
        globalFilters.value.anio = anio
    }

    function setGlobalSemana(semana: string) {
        globalFilters.value.semana = semana
    }

    // ─── Reset ────────────────────────────────────────────────────────────
    function reset() {
        summaryData.value = []
        filteredData.value = []
        outOfStockData.value = []
        wowData.value = []
        overviewData.value = []
        outOfStockGlobal.value = []
        matricesData.value = []
        reportData.value  = []
        reportWeeks.value = []
        reportTotal.value = 0
        filteredCount.value = 0
        outOfStockCount.value = 0
        wowCount.value = 0
        error.value = null
    }

    return {
        // state
        filters,
        globalFilters,
        summaryData,
        filteredData,
        outOfStockData,
        wowData,
        filteredCount,
        outOfStockCount,
        wowCount,
        overviewData,
        outOfStockGlobal,
        matricesData,
        reportData,
        reportWeeks,
        reportTotal,
        // loading
        loadingSummary,
        loadingFiltered,
        loadingOutOfStock,
        loadingWow,
        loadingOverview,
        loadingOosGlobal,
        loadingMatrices,
        loadingReport,
        isAnyLoading,
        isAnyLoadingGlobal,
        error,
        // computed client-specific
        totalWeeklyPieces,
        netWoWVariation,
        // computed global
        matricesTotalPZ,
        matricesTotalTiendas,
        matricesTotalSKUs,
        overviewTotalQuiebres,
        // actions client-specific
        fetchAll,
        fetchSummary,
        fetchFiltered,
        fetchOutOfStock,
        fetchWoW,
        setFilters,
        // actions globales
        fetchMatricesOverview,
        fetchOosGlobal,
        fetchReport,
        fetchGlobalDashboard,
        setGlobalAnio,
        setGlobalSemana,
        reset,
    }
})