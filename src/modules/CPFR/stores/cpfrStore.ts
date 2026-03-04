// src/modules/CPFR/stores/cpfrStore.ts

import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import { cpfrApi } from '../services/cpfrApi'
import { useCpfrCalculations } from '../composables/useCpfrCalculations'
import type { CpfrDataItem, CpfrFilterOptions, CpfrActiveFilters, CpfrStoreGroup } from '../types/cpfrTypes'

export const useCpfrStore = defineStore('cpfr', () => {

    // ── State ──────────────────────────────────────────────────────────────────

    const rawData = ref<CpfrDataItem[]>([])
    const filterOptions = ref<CpfrFilterOptions>({ anos: [], semanas: [], jefaturas: [], tiendas: [], dias: [] })
    const isLoading = ref(false)
    const error = ref<string | null>(null)

    const activeFilters = reactive<CpfrActiveFilters>({
        ano: null,
        semana: null,
        jefatura: '',
        tienda: '',
        dia: '',
    })

    // Criterio de semanas: global por SKU (default 2.5) y override por tienda
    const skuCriteria = reactive<Record<string, number>>({})
    const storeCriteria = reactive<Record<string, number>>({})

    // UI: qué grupos están expandidos
    const expandedGroups = reactive<Record<string, boolean>>({})

    // ── Init ───────────────────────────────────────────────────────────────────

    async function init() {
        isLoading.value = true
        error.value = null
        try {
            filterOptions.value = await cpfrApi.getFilters()

            // Defaults: última semana del ano más reciente
            const anos = filterOptions.value.anos
            const semanas = filterOptions.value.semanas
            if (anos.length) activeFilters.ano = anos[anos.length - 1]!
            if (semanas.length) activeFilters.semana = semanas[semanas.length - 1]!

            await fetchData()
        } catch (e) {
            error.value = 'Error al cargar el módulo CPFR.'
            console.error(e)
        } finally {
            isLoading.value = false
        }
    }

    // ── Fetch ──────────────────────────────────────────────────────────────────

    async function fetchData() {
        if (!activeFilters.ano || !activeFilters.semana) return
        isLoading.value = true
        error.value = null
        try {
            rawData.value = await cpfrApi.getData(activeFilters.ano, activeFilters.semana)
        } catch (e) {
            error.value = 'Error al obtener datos.'
            console.error(e)
        } finally {
            isLoading.value = false
        }
    }

    // ── Computed: filteredData ─────────────────────────────────────────────────

    const filteredData = computed<CpfrDataItem[]>(() => {
        return rawData.value.filter(item => {
            if (activeFilters.jefatura && item.jefatura !== activeFilters.jefatura) return false
            if (activeFilters.tienda && item.id_cliente !== activeFilters.tienda) return false
            if (activeFilters.dia && item.dia !== activeFilters.dia) return false
            return true
        })
    })

    // ── Computed: storeGroups (con cálculos) ───────────────────────────────────

    // Instanciar FUERA del computed — evita dependencia circular / stack overflow
    const { buildGroups } = useCpfrCalculations(skuCriteria, storeCriteria)

    const storeGroups = computed<CpfrStoreGroup[]>(() => {
        return buildGroups(filteredData.value)
    })

    // ── KPIs globales ──────────────────────────────────────────────────────────

    const globalKpis = computed(() => {
        const groups = storeGroups.value
        if (!groups.length) return null

        let totalSugerido = 0, totalCadena = 0, totalSkus = 0, instockSkus = 0

        for (const g of groups) {
            totalSugerido += g.macro.sumSugerido
            totalCadena += g.macro.sumCadena
            totalSkus += g.skus.length
            instockSkus += g.skus.filter(s => s.invActual > 0).length
        }

        const fillRate = totalSugerido > 0 ? Math.min(100, (totalCadena / totalSugerido) * 100) : 100
        const instockPct = totalSkus > 0 ? (instockSkus / totalSkus) * 100 : 0

        return { totalSugerido, totalCadena, fillRate, instockPct, totalTiendas: groups.length, totalSkus }
    })

    // ── Criterios ──────────────────────────────────────────────────────────────

    function setSkuCriteria(sku: string, value: number) {
        skuCriteria[sku] = value
    }

    function setStoreCriteria(id_cliente: string, value: number) {
        storeCriteria[id_cliente] = value
    }

    function resetCriteria() {
        Object.keys(skuCriteria).forEach(k => delete skuCriteria[k])
        Object.keys(storeCriteria).forEach(k => delete storeCriteria[k])
    }

    // ── Expand / Collapse ──────────────────────────────────────────────────────

    function toggleGroup(id: string) {
        expandedGroups[id] = !expandedGroups[id]
    }

    function expandAll() {
        storeGroups.value.forEach(g => { expandedGroups[g.id_cliente] = true })
    }

    function collapseAll() {
        Object.keys(expandedGroups).forEach(k => { expandedGroups[k] = false })
    }

    // ── SKUs únicos (para el panel de criterios) ───────────────────────────────

    const uniqueSkus = computed(() => {
        return [...new Set(rawData.value.map(r => r.SKU_NOMBRE))].sort()
    })

    const uniqueTiendas = computed(() => {
        const seen = new Map<string, string>()
        for (const item of filteredData.value) {
            if (!seen.has(item.id_cliente)) seen.set(item.id_cliente, item.formatocte)
        }
        return Array.from(seen.entries()).map(([id, nombre]) => ({ id, nombre }))
    })

    return {
        // state
        rawData, filterOptions, isLoading, error,
        activeFilters, skuCriteria, storeCriteria, expandedGroups,
        // computed
        filteredData, storeGroups, globalKpis, uniqueSkus, uniqueTiendas,
        // actions
        init, fetchData,
        setSkuCriteria, setStoreCriteria, resetCriteria,
        toggleGroup, expandAll, collapseAll,
    }
})