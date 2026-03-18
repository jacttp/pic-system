// src/modules/SellOut/stores/selloutStore.ts

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { selloutApi } from '../services/selloutApi'
import type {
    SellOutFilters,
    SellOutFilterOptions,
    SellOutKpis,
    SellOutTrendPoint,
} from '../types/sellout.types'

export const useSellOutStore = defineStore('sellout', () => {

    // ─── Estado de filtros ──────────────────────────────────────────────────────

    const filters = ref<SellOutFilters>({
        año: '',
        semana: '',
        gerencia: null,
        ruta: null,
        sku: null,
    })

    const filterOptions = ref<SellOutFilterOptions>({
        años: [],
        semanas: [],
        gerencias: [],
        rutas: [],
        skus: [],
    })

    // ─── Estado de datos ────────────────────────────────────────────────────────

    const kpis = ref<SellOutKpis | null>(null)
    const trend = ref<SellOutTrendPoint[]>([])

    // ─── Estado de UI ───────────────────────────────────────────────────────────

    const isLoadingFilters = ref(false)
    const isLoadingDashboard = ref(false)
    const error = ref<string | null>(null)

    // ─── Computed ───────────────────────────────────────────────────────────────

    const hasData = computed(() => kpis.value !== null)

    const filtersReady = computed(() =>
        filters.value.año !== '' && filters.value.semana !== ''
    )

    // ─── Acciones — Filtros ─────────────────────────────────────────────────────

    async function initFilters(): Promise<void> {
        isLoadingFilters.value = true
        error.value = null
        try {
            const [años, gerencias] = await Promise.all([
                selloutApi.getAños(),
                selloutApi.getGerencias(),
            ])
            const currentYear = new Date().getFullYear()
            filterOptions.value.años = años.filter(a => parseInt(a) <= currentYear).sort()
            filterOptions.value.gerencias = gerencias

            // Año por defecto: el más reciente válido (de la lista ya filtrada)
            if (filterOptions.value.años.length > 0) {
                filters.value.año = filterOptions.value.años.at(-1) ?? ''
                await fetchWeeks(filters.value.año)
            }
        } catch (e) {
            error.value = 'Error al cargar los filtros'
        } finally {
            isLoadingFilters.value = false
        }
    }

    async function fetchWeeks(año: string): Promise<void> {
        const res = await selloutApi.getWeeks(año)
        filterOptions.value.semanas = res.data

        // Semana por defecto: la más reciente del año
        if (res.data.length > 0) {
            const sorted = [...res.data].sort((a, b) =>
                Number(b.semana) - Number(a.semana)
            )
            filters.value.semana = sorted[0].semana
        }
    }

    async function onGerenciaChange(gerencia: string | null): Promise<void> {
        filters.value.gerencia = gerencia
        filters.value.ruta = null
        filterOptions.value.rutas = []
        filterOptions.value.skus = []

        if (gerencia) {
            const rutas = await selloutApi.getRutas(gerencia)
            filterOptions.value.rutas = rutas
        }
    }

    async function onRutaChange(ruta: string | null): Promise<void> {
        filters.value.ruta = ruta
        filters.value.sku = null
        filterOptions.value.skus = []

        const skus = await selloutApi.getSkus({
            gerencia: filters.value.gerencia,
            ruta,
        })
        filterOptions.value.skus = skus
    }

    // ─── Acciones — Dashboard ───────────────────────────────────────────────────

    async function fetchDashboard(): Promise<void> {
        if (!filtersReady.value) return

        isLoadingDashboard.value = true
        error.value = null
        try {
            const res = await selloutApi.getSummary(filters.value)
            kpis.value = res.kpis
            trend.value = res.trend
        } catch (e) {
            error.value = 'Error al cargar el dashboard'
            kpis.value = null
            trend.value = []
        } finally {
            isLoadingDashboard.value = false
        }
    }

    function resetFilters(): void {
        filters.value.gerencia = null
        filters.value.ruta = null
        filters.value.sku = null
        filterOptions.value.rutas = []
        filterOptions.value.skus = []
    }

    return {
        // Estado
        filters,
        filterOptions,
        kpis,
        trend,
        isLoadingFilters,
        isLoadingDashboard,
        error,

        // Computed
        hasData,
        filtersReady,

        // Acciones
        initFilters,
        fetchWeeks,
        onGerenciaChange,
        onRutaChange,
        fetchDashboard,
        resetFilters,
    }
})