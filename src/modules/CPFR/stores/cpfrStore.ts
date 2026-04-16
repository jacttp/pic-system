// src/modules/CPFR/stores/cpfrStore.ts

import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import { cpfrApi } from '../services/cpfrApi'
import type {
    CpfrCurrentWeek,
    CpfrContext,
    CpfrDiaDash,
    CpfrFilters,
    CpfrOverride,
    CpfrAdjustSkuBody,
    CpfrUpdateStatusBody,
    CpfrStoreConfig,
    CpfrSkuOverride,
} from '../types/cpfrTypes'

export const useCpfrStore = defineStore('cpfr', () => {

    // ── State ─────────────────────────────────────────────────────────────────

    const currentWeek   = ref<CpfrCurrentWeek | null>(null)
    const context       = ref<CpfrContext | null>(null)
    const dias          = ref<CpfrDiaDash[]>([])
    const loading       = ref(false)
    const preview       = ref(false)          // true cuando viene de /recalculate
    const error         = ref<string | null>(null)

    const criterio_global = ref<number>(2.5)
    const nom_cadena      = ref<string>('soriana')

    // Filtros activos — se incluyen en el body del POST
    const filters = reactive<CpfrFilters>({
        semanas_sellout: 6
    })

    // Override de criterio por tienda (para recalculate)
    const overrides = ref<CpfrOverride[]>([])

    // Filtros de vista rápidos (Locales)
    const statusFilters = reactive({
        escenarioA: false,
        escenarioB: false,
        sinSellout: false,
        bajoStock: false,
        sobrestock: false,
        fillrateBajo: false,
        fillrate100: false,
        sobrepedido: false,
        desabasto: false,
        searchOC: '',
    })

    // UI — expand state local (no viene del backend)
    const expandedStores = reactive<Record<string, boolean>>({})

    // ── Helpers internos ──────────────────────────────────────────────────────

    function buildDashBody() {
        return {
            year: currentWeek.value!.anio,
            week: currentWeek.value!.semana,
            nom_cadena: nom_cadena.value,
            criterio_global: criterio_global.value,
            ...(Object.keys(filters).length > 0 ? { filters: { ...filters } } : {}),
        }
    }

    function applyResponse(data: { context: CpfrContext; dias: CpfrDiaDash[]; preview?: boolean }) {
        context.value = data.context
        dias.value    = data.dias
        preview.value = data.preview === true
    }

    // ── Actions principales ───────────────────────────────────────────────────

    async function fetchCurrentWeek(): Promise<void> {
        const result = await cpfrApi.getCurrentWeek()
        currentWeek.value = result
    }

    async function loadDashboard(): Promise<void> {
        if (!currentWeek.value) return
        loading.value = true
        error.value = null
        // Reset expand state on fresh load
        Object.keys(expandedStores).forEach(k => { expandedStores[k] = false })
        try {
            const res = await cpfrApi.loadDashboard(buildDashBody())
            applyResponse(res)
        } catch (e: any) {
            error.value = 'Error al cargar el dashboard CPFR.'
            console.error('[cpfrStore.loadDashboard]', e)
        } finally {
            loading.value = false
        }
    }

    async function recalculate(): Promise<void> {
        if (!currentWeek.value) return
        loading.value = true
        error.value = null
        try {
            const body = {
                ...buildDashBody(),
                ...(overrides.value.length > 0 ? { overrides: overrides.value } : {}),
            }
            const res = await cpfrApi.recalculate(body)
            applyResponse(res)
        } catch (e: any) {
            error.value = 'Error en el recálculo.'
            console.error('[cpfrStore.recalculate]', e)
        } finally {
            loading.value = false
        }
    }

    // NOTA: patch ahora usa negocio (cliente, sku, sem, anio, num_pedido, fec_oc) para máxima robustez
    async function adjustSku(
        id_cliente: string, sku_muliix: string, anio: number, semana_ic: string, 
        num_pedido: string | null, fec_pedido_cadena: string | null,
        body: CpfrAdjustSkuBody
    ): Promise<boolean> {
        try {
            await cpfrApi.adjustSku({ id_cliente, sku_muliix, anio, semana_ic, num_pedido, fec_pedido_cadena, ...body })
            // Actualizar localmente sin re-fetch completo
            for (const dia of dias.value) {
                const tiendaRow = dia.tiendas.find(t => t.id_cliente === id_cliente)
                if (tiendaRow) {
                    const sku = tiendaRow.skus.find(s => 
                        s.sku_muliix === sku_muliix && 
                        s.num_pedido === num_pedido && 
                        s.fec_pedido_cadena === fec_pedido_cadena
                    )
                    if (sku) {
                        sku.pedido_sugerido_pz_red = body.cantidad_final_pz
                        if (body.semanas_objetivo != null) sku.semanas_objetivo = body.semanas_objetivo
                        if (body.enviado_pz != null) sku.enviado_pz = body.enviado_pz
                        if (body.fill_rate !== undefined) sku.fill_rate = body.fill_rate
                        _recalcStoreResumen(tiendaRow)
                    }
                    break
                }
            }
            return true
        } catch (e: any) {
            console.error('[cpfrStore.adjustSku]', e)
            return false
        }
    }

    async function updateStatus(body: CpfrUpdateStatusBody): Promise<{ ok: boolean; approvalId?: number }> {
        try {
            const res = await cpfrApi.updateStatus(body)
            // Actualizar localmente sin re-fetch
            for (const dia of dias.value) {
                for (const store of dia.tiendas) {
                    for (const sku of store.skus) {
                        if (sku.num_pedido === body.num_pedido) {
                            sku.estado_oc = body.estado
                        }
                    }
                }
            }
            return { ok: true, approvalId: res.approval_id ?? undefined }
        } catch (e: any) {
            console.error('[cpfrStore.updateStatus]', e)
            return { ok: false }
        }
    }

    // ── Inicialización ───────────────────────────────────────────────────────

    async function init(): Promise<void> {
        loading.value = true
        error.value = null
        try {
            if (!filters.dia) {
                let num = new Date().getDay()
                num = num === 0 ? 7 : num // JS: 0 = domingo -> Convertimos a 7
                filters.dia = num
            }
            await fetchCurrentWeek()
            await loadDashboard()
        } catch (e: any) {
            error.value = 'Error al inicializar el módulo CPFR.'
            console.error('[cpfrStore.init]', e)
        } finally {
            loading.value = false
        }
    }

    // ── UI helpers ────────────────────────────────────────────────────────────

    function toggleStore(id_cliente: string) {
        expandedStores[id_cliente] = !expandedStores[id_cliente]
    }

    function expandAll() {
        for (const dia of dias.value) {
            for (const t of dia.tiendas) {
                expandedStores[t.id_cliente] = true
            }
        }
    }

    function collapseAll() {
        Object.keys(expandedStores).forEach(k => { expandedStores[k] = false })
    }

    // Agrupación local de OCs por tienda (espejo de groupOCs en el componente)
    function _getOCKey(id_cliente: string, num_pedido: string | null): string {
        return `${id_cliente}_${num_pedido || 'UNSAVED'}`
    }

    function expandAllOCs(ocGroupKeys: Record<string, boolean>) {
        for (const dia of dias.value) {
            for (const t of dia.tiendas) {
                const seen = new Set<string>()
                for (const sku of t.skus) {
                    const key = _getOCKey(t.id_cliente, sku.num_pedido)
                    if (!seen.has(key)) {
                        seen.add(key)
                        ocGroupKeys[key] = true
                    }
                }
            }
        }
    }

    function collapseAllOCs(ocGroupKeys: Record<string, boolean>) {
        Object.keys(ocGroupKeys).forEach(k => { ocGroupKeys[k] = false })
    }

    // ── Filtros ───────────────────────────────────────────────────────────────

    function setFilter(key: keyof CpfrFilters, value: number | string | undefined) {
        if (value == null || value === '') {
            delete (filters as Record<string, unknown>)[key]
        } else {
            (filters as Record<string, unknown>)[key] = value
        }
    }

    function clearFilters() {
        delete filters.dia
        delete filters.jefatura
        delete filters.id_cliente
        filters.semanas_sellout = 6
    }

    function toggleStatusFilter(key: keyof typeof statusFilters) {
        statusFilters[key] = !statusFilters[key]
    }

    function clearStatusFilters() {
        statusFilters.escenarioA = false
        statusFilters.escenarioB = false
        statusFilters.sinSellout  = false
        statusFilters.desabasto   = false
        statusFilters.bajoStock   = false
        statusFilters.sobrestock  = false
        statusFilters.fillrateBajo = false
        statusFilters.fillrate100  = false
        statusFilters.sobrepedido = false
        statusFilters.searchOC    = ''
    }

    // ── Computed ──────────────────────────────────────────────────────────────

    /** Opciones de día derivadas de los dias cargados */
    const diaOptions = computed(() =>
        dias.value.map(d => ({ num: d.dia_num, nombre: d.dia_nombre }))
    )

    /** Jefaturas únicas de todas las tiendas cargadas */
    const jefaturaOptions = computed(() => {
        const set = new Set<string>()
        for (const dia of dias.value)
            for (const t of dia.tiendas) set.add(t.jefatura)
        return [...set].sort()
    })

    /** Tiendas únicas de todas las secciones cargadas */
    const tiendaOptions = computed(() => {
        const map = new Map<string, string>()
        for (const dia of dias.value)
            for (const t of dia.tiendas) map.set(t.id_cliente, t.nombre_tienda)
        return [...map.entries()]
            .map(([id, nombre]) => ({ id, nombre }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre))
    })

    // ── Recalcula resumen de tienda a partir de sus SKUs ─────────────────────

    function _recalcStoreResumen(store: import('../types/cpfrTypes').CpfrStoreDash) {
        const skus = store.skus
        if (!skus.length) return
        store.resumen.pedido_sugerido_pz_red = skus.reduce((a, s) => a + s.pedido_sugerido_pz_red, 0)
        store.resumen.cant_pedida_total  = skus.reduce((a, s) => a + (s.cant_pedida ?? 0), 0)
    }

    // ── Config de tienda — conservado para CpfrStoreConfigModal ─────────────

    const storeConfig       = ref<CpfrStoreConfig | null>(null)
    const configLoading     = ref(false)
    const configSaving      = ref(false)
    const configError       = ref<string | null>(null)
    const skuOverrides      = ref<CpfrSkuOverride[]>([])
    const skuOverridesLoading = ref(false)

    const allConfigs = ref<CpfrStoreConfig[]>([])
    const allConfigsLoading = ref(false)

    async function fetchAllConfigs() {
        allConfigsLoading.value = true
        try {
            allConfigs.value = await cpfrApi.getAllConfigs()
        } catch (e: any) {
            console.error('[cpfrStore.fetchAllConfigs]', e)
        } finally {
            allConfigsLoading.value = false
        }
    }

    async function fetchConfig(id_cliente: string) {
        configLoading.value = true
        configError.value = null
        storeConfig.value = null
        try {
            storeConfig.value = await cpfrApi.getConfig(id_cliente)
            fetchSkuOverrides(id_cliente)
        } catch (e: any) {
            configError.value = 'No se pudo cargar la configuración.'
            console.error('[cpfrStore.fetchConfig]', e)
        } finally {
            configLoading.value = false
        }
    }

    async function saveConfig(
        id_cliente: string,
        payload: Omit<CpfrStoreConfig, 'id_cliente' | 'nombre_tienda' | 'factor_ajuste'>
    ): Promise<boolean> {
        configSaving.value = true
        configError.value = null
        try {
            await cpfrApi.updateConfig(id_cliente, payload)
            if (storeConfig.value) Object.assign(storeConfig.value, payload)
            return true
        } catch (e: any) {
            configError.value = e?.response?.data?.message ?? 'Error al guardar configuración.'
            console.error('[cpfrStore.saveConfig]', e)
            return false
        } finally {
            configSaving.value = false
        }
    }

    async function fetchSkuOverrides(id_cliente: string) {
        skuOverridesLoading.value = true
        try {
            const res = await cpfrApi.getSkuOverrides(id_cliente)
            skuOverrides.value = Array.isArray(res) ? res : []
        } catch (e) {
            skuOverrides.value = []
            console.error('[cpfrStore.fetchSkuOverrides]', e)
        } finally {
            skuOverridesLoading.value = false
        }
    }

    async function upsertSkuOverride(id_cliente: string, sku_muliix: string, semanas_objetivo: number): Promise<boolean> {
        try {
            await cpfrApi.upsertSkuOverride(id_cliente, sku_muliix, semanas_objetivo)
            const existing = skuOverrides.value.find(o => o.sku_muliix === sku_muliix)
            if (existing) existing.semanas_objetivo = semanas_objetivo
            else skuOverrides.value.push({ sku_muliix, semanas_objetivo })
            return true
        } catch (e) {
            console.error('[cpfrStore.upsertSkuOverride]', e)
            return false
        }
    }

    async function deleteSkuOverride(id_cliente: string, sku_muliix: string): Promise<boolean> {
        try {
            await cpfrApi.deleteSkuOverride(id_cliente, sku_muliix)
            skuOverrides.value = skuOverrides.value.filter(o => o.sku_muliix !== sku_muliix)
            return true
        } catch (e) {
            console.error('[cpfrStore.deleteSkuOverride]', e)
            return false
        }
    }

    // ── Return ────────────────────────────────────────────────────────────────

    return {
        // State
        currentWeek, context, dias, loading, preview, error,
        criterio_global, nom_cadena, filters, overrides, expandedStores,
        statusFilters,
        // Actions
        init, fetchCurrentWeek, loadDashboard, recalculate,
        adjustSku, updateStatus,
        toggleStore, expandAll, collapseAll, expandAllOCs, collapseAllOCs,
        setFilter, clearFilters,
        toggleStatusFilter, clearStatusFilters,
        // Computed
        diaOptions, jefaturaOptions, tiendaOptions,
        // Config de tienda (para CpfrStoreConfigModal)
        storeConfig, configLoading, configSaving, configError,
        skuOverrides, skuOverridesLoading,
        allConfigs, allConfigsLoading,
        fetchConfig, saveConfig,
        fetchSkuOverrides, upsertSkuOverride, deleteSkuOverride,
        fetchAllConfigs
    }
})