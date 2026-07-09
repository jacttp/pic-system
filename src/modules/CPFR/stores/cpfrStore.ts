// src/modules/CPFR/stores/cpfrStore.ts

import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import { cpfrApi } from '../services/cpfrApi'
import { approvalsApi } from '@/modules/Approvals/services/approvalsApi'
import type { Approval, ApprovalStatus } from '@/modules/Approvals/types/approval.types'
import type {
    CpfrCurrentWeek,
    CpfrContext,
    CpfrDiaDash,
    CpfrFilters,
    CpfrOverride,
    CpfrAdjustSkuBody,
    CpfrUpdateStatusBody,
    CpfrBulkUpdateStatusBody,
    CpfrStoreConfig,
    CpfrSkuDash,
    CpfrSkuOverride,
    CpfrSkuUnit,
    CpfrSkuUnitPayload,
    CpfrHistorialPagination,
} from '../types/cpfrTypes'

export const useCpfrStore = defineStore('cpfr', () => {

    type HistorialWeek = { anio: number; semana: number; semana_ic: string; key: string }

    // ── State ─────────────────────────────────────────────────────────────────

    const currentWeek = ref<CpfrCurrentWeek | null>(null)
    const context = ref<CpfrContext | null>(null)
    const dias = ref<CpfrDiaDash[]>([])
    const loading = ref(false)
    const preview = ref(false)          // true cuando viene de /recalculate
    const error = ref<string | null>(null)
    const z8Loading = ref(false)
    const z8Result = ref<{ message: string; created: number } | null>(null)
    const allCpfrWeeks = ref<Array<{ anio: number; semana: number; semana_ic: string; key: string }>>([])
    const weeksLoading = ref(false)

    // Historial — datos cargados con estado='all' para mostrar OC de semanas pasadas sin importar estado
    const historialDias = ref<CpfrDiaDash[]>([])
    const historialLoading = ref(false)
    const historialLoaded = ref(false)
    const historialError = ref<string | null>(null)
    const historialSelectedWeeks = ref<HistorialWeek[]>([])
    const historialSearch = ref('')
    const historialPage = ref(1)
    const historialPageSize = ref(50)
    const historialPagination = ref<CpfrHistorialPagination | null>(null)
    const approvalIdsByOrder = reactive<Record<string, number>>({})
    const approvalLookupLoadedByStatus = reactive<Record<string, boolean>>({})
    const cpfrApprovalDetails = reactive<Record<number, any>>({})

    const criterio_global = ref<number>(2.5)
    const nom_cadena = ref<string>((localStorage.getItem('cpfr_nom_cadena') || 'SORIANA').toUpperCase())

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
        searchSku: '',
    })

    // UI — expand state local (no viene del backend)
    const expandedStores = reactive<Record<string, boolean>>({})

    // UI — vista actual (tabla o tarjetas) persistida
    const viewMode = ref<'table' | 'cards'>((localStorage.getItem('cpfr_view_mode') as any) || 'table')
    const activeTab = ref('centralizados')
    const groupByOC = ref(false)

    function setViewMode(mode: 'table' | 'cards') {
        viewMode.value = mode
        localStorage.setItem('cpfr_view_mode', mode)
    }

    function setActiveTab(tab: string) {
        activeTab.value = tab
        if (!currentWeek.value || tab === 'historial') return
        if (['centralizados', 'revision', 'aprobada', 'sin_embarcar'].includes(tab)) {
            loadDashboard()
        }
    }

    function setGroupByOC(val: boolean) {
        groupByOC.value = val
    }

    function setNomCadena(value: string) {
        const normalized = String(value || 'SORIANA').trim().toUpperCase()
        if (nom_cadena.value === normalized) return

        nom_cadena.value = normalized
        localStorage.setItem('cpfr_nom_cadena', normalized)
        resetHistorialState()
        activeTab.value = 'centralizados'
        loadDashboard()
    }

    // ── Helpers internos ──────────────────────────────────────────────────────

    function resetHistorialState() {
        historialDias.value = []
        historialLoaded.value = false
        historialError.value = null
        historialSelectedWeeks.value = []
        historialSearch.value = ''
        historialPage.value = 1
        historialPagination.value = null
    }

    function buildDashBody() {
        const estadoPedido =
            activeTab.value === 'revision' ? 'revision'
            : activeTab.value === 'aprobada' ? 'aprobado'
            : activeTab.value === 'sin_embarcar' ? 'cerrado'
            : 'pendiente'

        return {
            year: currentWeek.value!.anio,
            week: currentWeek.value!.semana,
            nom_cadena: nom_cadena.value.toUpperCase(),
            criterio_global: criterio_global.value,
            filters: { ...filters, estado_pedido: estadoPedido },
        }
    }

    function applyResponse(data: { context: CpfrContext; dias: CpfrDiaDash[]; preview?: boolean }) {
        context.value = data.context
        dias.value = data.dias
        preview.value = data.preview === true
        // Expand all stores by default
        expandAll()
    }

    function skuYear(sku: CpfrSkuDash): string {
        const dateYear = sku.fec_pedido_cadena ? String(sku.fec_pedido_cadena).slice(0, 4) : ''
        return /^\d{4}$/.test(dateYear) ? dateYear : String(currentWeek.value?.anio || '')
    }

    function skuWeek(sku: CpfrSkuDash): string {
        return String(sku.semana_ic || currentWeek.value?.semana_ic || '').padStart(2, '0')
    }

    function approvalOrderKey(idCliente: string, numPedido: string | null | undefined, anio: string | number, semanaIc: string | number): string {
        return [
            String(idCliente || '').trim().toLowerCase(),
            String(numPedido || '').trim().toLowerCase(),
            String(anio || '').trim(),
            String(semanaIc || '').padStart(2, '0'),
        ].join('|')
    }

    function normalizeApprovalOrderNumbers(value: unknown): string[] {
        const raw = Array.isArray(value) ? value : value == null ? [] : [value]
        return raw
            .flatMap(item => String(item || '').split(','))
            .map(item => item.trim())
            .filter(Boolean)
    }

    function indexApproval(approval: Approval) {
        const payload = approval.payload || {}
        const idCliente = String(payload.id_cliente || '').trim()
        const anio = String(payload.year || payload.anio || '').trim()
        const semanaIc = String(payload.semana_ic || payload.week || '').padStart(2, '0')
        const nums = normalizeApprovalOrderNumbers(payload.num_pedidos || payload.num_pedido || payload.num_pedido_ref)

        if (!idCliente || !anio || !semanaIc || !nums.length) return
        for (const num of nums) {
            approvalIdsByOrder[approvalOrderKey(idCliente, num, anio, semanaIc)] = approval.id
        }
    }

    async function ensureApprovalLookup(status: ApprovalStatus): Promise<void> {
        if (approvalLookupLoadedByStatus[status]) return

        const lists = await Promise.allSettled([
            approvalsApi.getApprovals({ status, type: 'CPFR_ORDER', role: 'assignee' }),
            approvalsApi.getApprovals({ status, type: 'CPFR_ORDER' }),
        ])

        for (const result of lists) {
            if (result.status !== 'fulfilled') continue
            for (const approval of result.value) indexApproval(approval)
        }

        approvalLookupLoadedByStatus[status] = true
    }

    async function resolveApprovalIdForSku(idCliente: string, sku: CpfrSkuDash, status: ApprovalStatus): Promise<number | null> {
        const key = approvalOrderKey(idCliente, sku.num_pedido, skuYear(sku), skuWeek(sku))
        if (approvalIdsByOrder[key]) return approvalIdsByOrder[key]

        await ensureApprovalLookup(status)
        return approvalIdsByOrder[key] || null
    }

    function getCachedApprovalIdForSku(idCliente: string, sku: CpfrSkuDash): number | null {
        const key = approvalOrderKey(idCliente, sku.num_pedido, skuYear(sku), skuWeek(sku))
        return approvalIdsByOrder[key] || null
    }

    function getSkuBaseQuantity(sku: CpfrSkuDash): number {
        if (sku.cantidad_base_uni !== undefined && sku.cantidad_base_uni !== null) {
            const base = Number(sku.cantidad_base_uni)
            return Number.isFinite(base) ? base : 0
        }
        return Number(sku.pedido_sugerido_pz_red || 0)
    }

    function getSkuAdjustment(sku: CpfrSkuDash): number {
        const adjustment = Number(sku.ajuste ?? 0)
        return Number.isFinite(adjustment) ? adjustment : 0
    }

    function updateLocalSkuAdjustment(
        idCliente: string,
        skuRef: CpfrSkuDash,
        payload: { cantidad_base_uni: number; ajuste: number; ajuste_mix?: number; cant_pedida: number }
    ) {
        for (const dia of dias.value) {
            const tiendaRow = dia.tiendas.find(t => t.id_cliente === idCliente)
            if (!tiendaRow) continue

            const sku = tiendaRow.skus.find(s =>
                s.sku_muliix === skuRef.sku_muliix &&
                s.num_pedido === skuRef.num_pedido &&
                s.fec_pedido_cadena === skuRef.fec_pedido_cadena
            )

            if (!sku) continue
            sku.cantidad_base_uni = Number(payload.cantidad_base_uni || 0)
            sku.ajuste = Number(payload.ajuste || 0)
            sku.ajuste_mix = Number(payload.ajuste_mix || 0)
            sku.pedido_sugerido_pz_red = Number(payload.cant_pedida || 0)
            sku.pedido_sugerido_kg = sku.pedido_sugerido_pz_red * Number(sku.unidad_inventario || 0)
            sku.fill_rate = sku.cant_pedida > 0 ? sku.pedido_sugerido_pz_red / sku.cant_pedida : null
            _recalcStoreResumen(tiendaRow)
            return
        }
    }

    function hydrateSkuAdjustmentsFromRows(idCliente: string, rows: any[]) {
        for (const dia of dias.value) {
            for (const tiendaRow of dia.tiendas) {
                if (tiendaRow.id_cliente !== idCliente) continue

                let changed = false
                for (const sku of tiendaRow.skus) {
                    const match = rows.find(row =>
                        String(row.id_cliente || idCliente) === idCliente &&
                        String(row.sku_muliix || '') === String(sku.sku_muliix || '') &&
                        String(row.num_pedido || '') === String(sku.num_pedido || '') &&
                        String(row.fec_pedido_cadena || '').slice(0, 10) === String(sku.fec_pedido_cadena || '').slice(0, 10)
                    )

                    if (!match) continue
                    const base = Number(match.cantidad_base_uni ?? sku.pedido_sugerido_pz_red ?? 0)
                    const adjustment = Number(match.ajuste ?? 0)
                    const mixAdjustment = Number(match.ajuste_mix ?? 0)
                    const total = base + adjustment + mixAdjustment
                    sku.cantidad_base_uni = base
                    sku.ajuste = adjustment
                    sku.ajuste_mix = mixAdjustment
                    sku.pedido_sugerido_pz_red = total
                    sku.pedido_sugerido_kg = total * Number(sku.unidad_inventario || 0)
                    sku.fill_rate = sku.cant_pedida > 0 ? total / sku.cant_pedida : null
                    changed = true
                }

                if (changed) _recalcStoreResumen(tiendaRow)
            }
        }
    }

    async function ensureApprovalDetail(approvalId: number): Promise<any | null> {
        if (cpfrApprovalDetails[approvalId]) return cpfrApprovalDetails[approvalId]
        try {
            const detail = await approvalsApi.getCpfrOrderDetail(approvalId)
            cpfrApprovalDetails[approvalId] = detail
            return detail
        } catch (e) {
            console.warn('[cpfrStore.ensureApprovalDetail]', e)
            return null
        }
    }

    async function hydrateApprovalAdjustmentsForCurrentTab(): Promise<void> {
        if (activeTab.value !== 'revision' && activeTab.value !== 'aprobada') return
        const status: ApprovalStatus = activeTab.value === 'revision' ? 'PENDING' : 'APPROVED'
        await ensureApprovalLookup(status)

        const approvalIds = new Set<number>()
        for (const dia of dias.value) {
            for (const tienda of dia.tiendas) {
                for (const sku of tienda.skus) {
                    const key = approvalOrderKey(tienda.id_cliente, sku.num_pedido, skuYear(sku), skuWeek(sku))
                    const approvalId = approvalIdsByOrder[key]
                    if (approvalId) approvalIds.add(approvalId)
                }
            }
        }

        for (const approvalId of approvalIds) {
            const detail = await ensureApprovalDetail(approvalId)
            const rows = Array.isArray(detail?.rows) ? detail.rows : Array.isArray(detail?.sku_rows) ? detail.sku_rows : []
            const idCliente = String(detail?.id_cliente || rows[0]?.id_cliente || '')
            if (idCliente && rows.length) hydrateSkuAdjustmentsFromRows(idCliente, rows)
        }
    }

    // ── Actions principales ───────────────────────────────────────────────────

    async function fetchCurrentWeek(): Promise<void> {
        const result = await cpfrApi.getCurrentWeek()
        currentWeek.value = result
    }

    async function fetchAllCpfrWeeks(): Promise<void> {
        weeksLoading.value = true
        try {
            allCpfrWeeks.value = await cpfrApi.getWeeks()
        } catch (e) {
            console.error('[cpfrStore.fetchAllCpfrWeeks]', e)
        } finally {
            weeksLoading.value = false
        }
    }

    async function loadHistorial(weeks = historialSelectedWeeks.value, page = 1): Promise<void> {
        if (!currentWeek.value) return
        const normalizedWeeks = weeks
            .map(w => ({
                anio: Number(w.anio),
                semana: Number(w.semana),
                semana_ic: String(w.semana_ic || w.semana).padStart(2, '0'),
                key: w.key || `${w.anio}-W${String(w.semana).padStart(2, '0')}`,
            }))
            .filter(w => Number.isInteger(w.anio) && Number.isInteger(w.semana) && w.semana >= 1 && w.semana <= 53)

        if (!normalizedWeeks.length) {
            historialDias.value = []
            historialLoaded.value = false
            historialError.value = 'Selecciona una o más semanas para cargar historial.'
            historialPage.value = 1
            historialPagination.value = null
            return
        }

        historialLoading.value = true
        historialError.value = null
        historialPage.value = page
        try {
            const body = {
                year: currentWeek.value!.anio,
                week: currentWeek.value!.semana,
                nom_cadena: nom_cadena.value.toUpperCase(),
                criterio_global: criterio_global.value,
                filters: {
                    ...filters,
                    estado_pedido: 'historial_finalizado' as const,
                    historial_weeks: normalizedWeeks.map(w => ({ anio: w.anio, semana: w.semana })),
                    historial_pagination: {
                        page,
                        page_size: historialPageSize.value,
                    },
                }
            }
            const res = await cpfrApi.loadDashboard(body)
            historialDias.value = res.dias
            historialPagination.value = res.context.historial_pagination ?? null
            historialLoaded.value = true
            historialSelectedWeeks.value = normalizedWeeks
            for (const dia of res.dias) {
                for (const tienda of dia.tiendas) {
                    expandedStores[tienda.id_cliente] = true
                }
            }
        } catch (e: any) {
            historialError.value = 'Error al cargar el historial CPFR.'
            console.error('[cpfrStore.loadHistorial]', e)
        } finally {
            historialLoading.value = false
        }
    }

    async function loadHistorialPage(page: number): Promise<void> {
        if (!historialSelectedWeeks.value.length) return
        const totalPages = historialPagination.value?.total_pages ?? page
        const nextPage = Math.min(Math.max(1, page), Math.max(1, totalPages))
        await loadHistorial(historialSelectedWeeks.value, nextPage)
    }

    async function setHistorialPageSize(size: number): Promise<void> {
        historialPageSize.value = Math.min(100, Math.max(25, Number(size) || 50))
        if (historialSelectedWeeks.value.length) {
            await loadHistorial(historialSelectedWeeks.value, 1)
        }
    }

    async function loadDashboard(): Promise<void> {
        if (!currentWeek.value) return
        loading.value = true
        error.value = null
        // Expand all stores by default on load
        Object.keys(expandedStores).forEach(k => { expandedStores[k] = true })
        try {
            const res = await cpfrApi.loadDashboard(buildDashBody())
            applyResponse(res)
            await hydrateApprovalAdjustmentsForCurrentTab()
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
        body: { cantidad_final_pz: number, fill_rate?: number | null, factor_ajuste?: number }
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

    async function adjustReviewSkuAdjustment(
        id_cliente: string,
        sku: CpfrSkuDash,
        direction: 1 | -1
    ): Promise<{ ok: boolean; message?: string }> {
        if (activeTab.value !== 'revision') return { ok: false, message: 'Solo se puede ajustar en revision.' }
        if (!sku.sku_muliix || !sku.num_pedido || !sku.fec_pedido_cadena) {
            return { ok: false, message: 'Faltan datos del SKU para ajustar.' }
        }

        const step = Number(sku.pzas_bolsa || 0)
        if (step <= 0) return { ok: false, message: 'Este SKU no tiene pzas_bolsa configurado.' }

        const base = getSkuBaseQuantity(sku)
        const currentAdjustment = getSkuAdjustment(sku)
        const nextAdjustment = currentAdjustment + (step * direction)
        const nextTotal = base + nextAdjustment

        if (nextTotal < 0) return { ok: false, message: 'El pedido no puede quedar en negativo.' }
        if (nextTotal > base) return { ok: false, message: 'El ajuste no puede superar el pedido base.' }

        const approvalId = await resolveApprovalIdForSku(id_cliente, sku, 'PENDING')
        if (!approvalId) {
            return { ok: false, message: 'No se encontro la solicitud de aprobacion pendiente para esta OC.' }
        }

        try {
            const data = await approvalsApi.updateCpfrOrderAdjustment(approvalId, {
                id_cliente,
                sku_muliix: sku.sku_muliix,
                num_pedido: sku.num_pedido,
                anio: skuYear(sku),
                semana_ic: skuWeek(sku),
                fec_pedido_cadena: String(sku.fec_pedido_cadena).slice(0, 10),
                ajuste: nextAdjustment,
            })

            cpfrApprovalDetails[approvalId] = null
            updateLocalSkuAdjustment(id_cliente, sku, {
                cantidad_base_uni: Number(data?.cantidad_base_uni ?? base),
                ajuste: Number(data?.ajuste ?? nextAdjustment),
                cant_pedida: Number(data?.cant_pedida ?? nextTotal),
            })
            return { ok: true }
        } catch (e: any) {
            console.error('[cpfrStore.adjustReviewSkuAdjustment]', e)
            return { ok: false, message: e?.response?.data?.message || 'No se pudo ajustar el pedido.' }
        }
    }

    async function updateStatus(body: CpfrUpdateStatusBody): Promise<{ ok: boolean; approvalId?: number }> {
        try {
            const res = await cpfrApi.updateStatus(body)
            const localEstado = body.estado === 'pendiente' ? 'borrador' : body.estado
            // Actualizar localmente sin re-fetch
            for (const dia of dias.value) {
                for (const store of dia.tiendas) {
                    for (const sku of store.skus) {
                        if (sku.num_pedido === body.num_pedido) {
                            sku.estado_oc = localEstado
                        }
                    }
                }
            }
            if (body.estado === 'revision' && body.num_pedido && res.approval_id) {
                approvalIdsByOrder[approvalOrderKey('', body.num_pedido, body.year, body.week)] = res.approval_id
                for (const dia of dias.value) {
                    for (const tienda of dia.tiendas) {
                        if (tienda.skus.some(s => s.num_pedido === body.num_pedido)) {
                            approvalIdsByOrder[approvalOrderKey(tienda.id_cliente, body.num_pedido, body.year, body.week)] = res.approval_id
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

    async function generateZ8(): Promise<void> {
        if (!currentWeek.value) return
        z8Loading.value = true
        z8Result.value = null
        try {
            const res = await cpfrApi.generateZ8(buildDashBody())
            z8Result.value = { message: res.message, created: res.created }
            // Recargar dashboard para reflejar los nuevos cascarones Z8
            await loadDashboard()
        } catch (e: any) {
            z8Result.value = { message: 'Error al generar Z8.', created: 0 }
            console.error('[cpfrStore.generateZ8]', e)
        } finally {
            z8Loading.value = false
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
            await Promise.all([
                loadDashboard(),
                fetchAllCpfrWeeks()
            ])
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
        const source = activeTab.value === 'historial' ? historialDias.value : dias.value
        for (const dia of source) {
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
        const source = activeTab.value === 'historial' ? historialDias.value : dias.value
        for (const dia of source) {
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
        const previousValue = filters[key]
        if (value == null || value === '') {
            delete (filters as Record<string, unknown>)[key]
        } else {
            (filters as Record<string, unknown>)[key] = value
        }

        if (key === 'dia' && previousValue !== value) {
            resetHistorialState()
        }
    }

    function clearFilters() {
        const hadDia = filters.dia != null
        delete filters.dia
        delete filters.jefatura
        delete filters.id_cliente
        delete filters.nombre_tienda
        filters.semanas_sellout = 6
        if (hadDia) resetHistorialState()
    }

    function toggleStatusFilter(key: keyof typeof statusFilters) {
        statusFilters[key] = !statusFilters[key]
    }

    function clearStatusFilters() {
        statusFilters.escenarioA = false
        statusFilters.escenarioB = false
        statusFilters.sinSellout = false
        statusFilters.desabasto = false
        statusFilters.bajoStock = false
        statusFilters.sobrestock = false
        statusFilters.fillrateBajo = false
        statusFilters.fillrate100 = false
        statusFilters.sobrepedido = false
        statusFilters.searchOC = ''
        statusFilters.searchSku = ''
    }

    async function updateStatusBulk(body: CpfrBulkUpdateStatusBody): Promise<{ ok: boolean; approvalId?: number; updatedOrders?: number }> {
        try {
            const res = await cpfrApi.updateStatusBulk(body)
            const nums = new Set(body.num_pedidos)
            const localEstado = body.estado === 'pendiente' ? 'borrador' : body.estado
            for (const dia of dias.value) {
                for (const store of dia.tiendas) {
                    for (const sku of store.skus) {
                        if (sku.num_pedido && nums.has(sku.num_pedido)) {
                            sku.estado_oc = localEstado
                        }
                    }
                }
            }
            if (body.estado === 'revision' && res.approval_id) {
                for (const dia of dias.value) {
                    for (const tienda of dia.tiendas) {
                        for (const sku of tienda.skus) {
                            if (!sku.num_pedido || !nums.has(sku.num_pedido)) continue
                            approvalIdsByOrder[approvalOrderKey(tienda.id_cliente, sku.num_pedido, body.year, sku.semana_ic || body.week)] = res.approval_id
                        }
                    }
                }
            }
            return { ok: true, approvalId: res.approval_id ?? undefined, updatedOrders: res.updated_orders ?? body.num_pedidos.length }
        } catch (e: any) {
            console.error('[cpfrStore.updateStatusBulk]', e)
            return { ok: false }
        }
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
        store.resumen.pedido_sugerido_pz_red = skus.reduce((a, s) => a + (s.pedido_sugerido_pz_red || 0), 0)
        store.resumen.pedido_sugerido_kg = skus.reduce((a, s) => a + ((s.pedido_sugerido_pz_red || 0) * (s.unidad_inventario || 0)), 0)
        store.resumen.cant_pedida_total = skus.reduce((a, s) => a + (s.cant_pedida ?? 0), 0)
        store.resumen.fill_rate = store.resumen.cant_pedida_total > 0
            ? store.resumen.pedido_sugerido_pz_red / store.resumen.cant_pedida_total
            : null

        const ventaPromKg = skus.reduce((a, s) => a + (s.promedio_sellout_kg || 0), 0)
        if (ventaPromKg > 0) {
            const invMasPedidoKg = skus.reduce((a, s) => {
                return a + (s.inv_actual_kg || 0) + ((s.pedido_sugerido_pz_red || 0) * (s.unidad_inventario || 0))
            }, 0)
            store.resumen.cobertura_actual = invMasPedidoKg / ventaPromKg
        }
    }

    // ── Config de tienda — conservado para CpfrStoreConfigModal ─────────────

    const storeConfig = ref<CpfrStoreConfig | null>(null)
    const configLoading = ref(false)
    const configSaving = ref(false)
    const configError = ref<string | null>(null)
    const skuOverrides = ref<CpfrSkuOverride[]>([])
    const skuOverridesLoading = ref(false)

    const allConfigs = ref<CpfrStoreConfig[]>([])
    const allConfigsLoading = ref(false)

    // ── Config de unidades SKU ────────────────────────────────────────────────
    const allSkusConfig = ref<CpfrSkuUnit[]>([])
    const skusConfigLoading = ref(false)

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

    async function fetchAllSkusConfig() {
        skusConfigLoading.value = true
        try {
            allSkusConfig.value = await cpfrApi.getAllSkusConfig()
        } catch (e) {
            console.error('[cpfrStore.fetchAllSkusConfig]', e)
        } finally {
            skusConfigLoading.value = false
        }
    }

    async function saveSkuConfig(sku: string, payload: Partial<CpfrSkuUnitPayload>): Promise<boolean> {
        try {
            await cpfrApi.updateSkuConfig(sku, payload)
            return true
        } catch (e) {
            console.error('[cpfrStore.saveSkuConfig]', e)
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

    // ── Configuración SKU Cadenas (skuscadenas_IC) ──────────────────────────
    const skusCadenas = ref<import('../types/cpfrTypes').CpfrSkuCadena[]>([])
    const skusCadenasLoading = ref(false)

    async function fetchSkusCadenas() {
        skusCadenasLoading.value = true
        try {
            skusCadenas.value = await cpfrApi.getSkuCadenas()
        } catch (e) {
            console.error('[cpfrStore.fetchSkusCadenas]', e)
        } finally {
            skusCadenasLoading.value = false
        }
    }

    async function addSkuCadena(payload: Partial<import('../types/cpfrTypes').CpfrSkuCadena>): Promise<boolean> {
        try {
            await cpfrApi.createSkuCadena(payload)
            await fetchSkusCadenas()
            return true
        } catch (e: any) {
            console.error('[cpfrStore.addSkuCadena]', e)
            throw new Error(e?.response?.data?.message || 'Error al añadir mapeo.')
        }
    }

    async function updateSkuCadena(id: number, payload: Partial<import('../types/cpfrTypes').CpfrSkuCadena>): Promise<boolean> {
        try {
            await cpfrApi.updateSkuCadena(id, payload)
            await fetchSkusCadenas()
            return true
        } catch (e: any) {
            console.error('[cpfrStore.updateSkuCadena]', e)
            throw new Error(e?.response?.data?.message || 'Error al actualizar mapeo.')
        }
    }

    async function removeSkuCadena(id: number): Promise<boolean> {
        try {
            await cpfrApi.deleteSkuCadena(id)
            skusCadenas.value = skusCadenas.value.filter(s => s.idskuscadenas !== id)
            return true
        } catch (e: any) {
            console.error('[cpfrStore.removeSkuCadena]', e)
            throw new Error(e?.response?.data?.message || 'Error al eliminar mapeo.')
        }
    }

    // ── Return ────────────────────────────────────────────────────────────────

    return {
        // State
        currentWeek, context, dias, loading, preview, error,
        z8Loading, z8Result, allCpfrWeeks, weeksLoading,
        historialDias, historialLoading, historialLoaded, historialError,
        historialSelectedWeeks, historialSearch, historialPage, historialPageSize, historialPagination,
        approvalIdsByOrder,
        criterio_global, nom_cadena, filters, overrides, expandedStores,
        statusFilters, viewMode, activeTab, groupByOC,
        // Actions
        init, fetchCurrentWeek, fetchAllCpfrWeeks, loadDashboard, loadHistorial, loadHistorialPage, setHistorialPageSize, recalculate, generateZ8,
        adjustSku, adjustReviewSkuAdjustment, resolveApprovalIdForSku, getCachedApprovalIdForSku, updateStatus, updateStatusBulk,
        toggleStore, expandAll, collapseAll, expandAllOCs, collapseAllOCs,
        setFilter, clearFilters,
        toggleStatusFilter, clearStatusFilters, setViewMode, setActiveTab, setGroupByOC, setNomCadena,
        // Computed
        diaOptions, jefaturaOptions, tiendaOptions,
        // Config de tienda (para CpfrStoreConfigModal)
        storeConfig, configLoading, configSaving, configError,
        skuOverrides, skuOverridesLoading,
        allConfigs, allConfigsLoading,
        fetchConfig, saveConfig,
        fetchSkuOverrides, upsertSkuOverride, deleteSkuOverride,
        fetchAllConfigs,
        // Config de unidades SKU (para CpfrChainConfigModal)
        allSkusConfig, skusConfigLoading,
        fetchAllSkusConfig, saveSkuConfig,
        // Config SKU Cadenas
        skusCadenas, skusCadenasLoading, fetchSkusCadenas,
        addSkuCadena, updateSkuCadena, removeSkuCadena
    }
})
