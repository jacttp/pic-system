<script setup lang="ts">
// src/modules/CPFR/components/CpfrOrderTable.vue
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

defineOptions({
  inheritAttrs: false
})
import { useCpfrStore } from '../stores/cpfrStore'
import { toast } from '@/components/ui/toast/use-toast'
import type { CpfrSkuDash, CpfrStoreDash } from '../types/cpfrTypes'
import CpfrZ8Panel from '../components/CpfrZ8Panel.vue'
import CpfrProductBehaviorPanel from '../components/CpfrProductBehaviorPanel.vue'

const showZ8Panel = ref(false)
const selectedProductContext = ref<{ tienda: CpfrStoreDash; sku: CpfrSkuDash } | null>(null)

const store = useCpfrStore()
const showZeroZ8 = ref(false)
const showExpiredCloseModal = ref(false)

const emit = defineEmits<{
    (e: 'open-config', id_cliente: string, nombre_tienda: string): void
}>()

// ── Tabs State ────────────────────────────────────────────────────────────────
const currentTab = computed({
  get: () => store.activeTab,
  set: (val) => store.setActiveTab(val)
})
const showAdjustmentColumn = computed(() => currentTab.value !== 'centralizados')
const tableColumnCount = computed(() => showAdjustmentColumn.value ? 10 : 9)

const tabs = [ 
    { id: 'centralizados', label: 'Centralizados' },
    { id: 'revision',       label: 'Revisión' },
    { id: 'aprobada',       label: 'Aprobados' },
    { id: 'sin_embarcar',   label: 'Sin Embarcar' },
    { id: 'historial',      label: 'Historial' },
]

const selectedFilterWeek = ref<string>('TODAS')

const availableWeeks = computed(() => {
  return store.allCpfrWeeks
})

const historyWeekPickerOpen = ref(false)
const historyWeekSearch = ref('')

const filteredHistoryWeeks = computed(() => {
    const term = historyWeekSearch.value.trim().toLowerCase()
    if (!term) return availableWeeks.value

    return availableWeeks.value.filter(w => {
        const label = `semana ${w.semana} ${w.anio} ${w.key}`.toLowerCase()
        return label.includes(term)
    })
})

function loadHistoryFromSelection() {
    store.loadHistorial(store.historialSelectedWeeks)
}

const selectedHistoryWeeksLabel = computed(() => {
    const selected = store.historialSelectedWeeks
    if (!selected.length) return 'Elegir semanas'
    if (selected.length === 1) {
        const week = selected[0]
        return `Semana ${week.semana} (${week.anio})`
    }
    return `${selected.length} semanas seleccionadas`
})

function isHistoryWeekSelected(key: string): boolean {
    return store.historialSelectedWeeks.some(w => w.key === key)
}

function toggleHistoryWeek(week: { anio: number; semana: number; semana_ic: string; key: string }) {
    if (isHistoryWeekSelected(week.key)) {
        store.historialSelectedWeeks = store.historialSelectedWeeks.filter(w => w.key !== week.key)
    } else {
        store.historialSelectedWeeks = [...store.historialSelectedWeeks, week]
    }
}

function clearHistoryWeeks() {
    store.historialSelectedWeeks = []
}

function selectRecentHistoryWeeks(count: number) {
    store.historialSelectedWeeks = availableWeeks.value.slice(0, count)
}

watch(currentTab, (newTab) => {
  if (newTab !== 'sin_embarcar' && newTab !== 'historial') {
    selectedFilterWeek.value = 'TODAS'
  }
})

// ── Inline edit ───────────────────────────────────────────────────────────────
const editingId = ref<string | null>(null)
const editValue = ref<number>(0)
const saving    = ref(false)
const savedId   = ref<string | null>(null)

// ── Estado de envío a revisión ────────────────────────────────────────────────
const submittingOC = ref<string | null>(null)
const adjustingSkuKey = ref<string | null>(null)

function startEdit(sku: CpfrSkuDash) {
    if (currentTab.value !== 'centralizados') return;
    if (!sku.sku_muliix) return;
    editingId.value = sku.sku_muliix
    editValue.value = sku.pedido_sugerido_pz_red
}
function cancelEdit() { editingId.value = null }

async function confirmEdit(sku: CpfrSkuDash, id_cliente: string) {
    const bolsa = sku.pzas_bolsa || 1;
    let finalValue = Math.round(editValue.value / bolsa) * bolsa;
    if (finalValue < 0) finalValue = 0;

    if (finalValue === sku.pedido_sugerido_pz_red) { cancelEdit(); return }
    
    saving.value = true;
    sku.pedido_sugerido_pz_red = finalValue;

    const newFillRate = calcularFillRateDinamico(sku);

    const ok = await store.adjustSku(
        id_cliente,
        sku.sku_muliix!,
        store.currentWeek!.anio,
        store.currentWeek!.semana_ic,
        sku.num_pedido,
        sku.fec_pedido_cadena,
        {
            cantidad_final_pz: finalValue,
            fill_rate: newFillRate,
            factor_ajuste: sku.factor_ajuste
        }
    )
    saving.value = false
    if (ok) { savedId.value = sku.sku_muliix; setTimeout(() => { savedId.value = null }, 1800) }
    editingId.value = null
}

function adjustmentKey(idCliente: string, sku: CpfrSkuDash): string {
    return `${idCliente}|${sku.num_pedido || ''}|${sku.sku_muliix || ''}|${sku.fec_pedido_cadena || ''}`
}

function skuBaseQuantity(sku: CpfrSkuDash): number {
    if (sku.cantidad_base_uni !== undefined && sku.cantidad_base_uni !== null) {
        const base = Number(sku.cantidad_base_uni)
        return Number.isFinite(base) ? base : 0
    }
    return Number(sku.pedido_sugerido_pz_red || 0)
}

function skuAdjustment(sku: CpfrSkuDash): number {
    const value = Number(sku.ajuste ?? 0)
    return Number.isFinite(value) ? value : 0
}

function formatAdjustment(sku: CpfrSkuDash): string {
    const value = skuAdjustment(sku)
    return `${value > 0 ? '+' : ''}${n(value, 0)}`
}

function canDecreaseAdjustment(sku: CpfrSkuDash): boolean {
    const step = Number(sku.pzas_bolsa || 0)
    return step > 0 && skuBaseQuantity(sku) + skuAdjustment(sku) - step >= 0
}

function adjustmentTooltip(idCliente: string, sku: CpfrSkuDash): string {
    if (currentTab.value === 'aprobada') return 'Ajuste aprobado de solo lectura'
    if (currentTab.value !== 'revision') return 'Ajuste disponible solo en revision'
    if (!sku.sku_muliix || !sku.num_pedido || !sku.fec_pedido_cadena) return 'Faltan datos para ajustar este SKU'
    if (!sku.pzas_bolsa || sku.pzas_bolsa <= 0) return 'Este SKU no tiene pzas_bolsa configurado'
    if (!store.getCachedApprovalIdForSku(idCliente, sku)) return 'No se encontro la solicitud de aprobacion pendiente'
    return `Ajuste por bolsa: ${n(sku.pzas_bolsa, 0)} pz`
}

async function adjustReviewSku(idCliente: string, sku: CpfrSkuDash, direction: 1 | -1) {
    const key = adjustmentKey(idCliente, sku)
    if (adjustingSkuKey.value) return
    adjustingSkuKey.value = key

    const result = await store.adjustReviewSkuAdjustment(idCliente, sku, direction)
    adjustingSkuKey.value = null

    if (!result.ok) {
        toast({
            title: 'No se pudo ajustar el pedido',
            description: result.message || 'Intenta de nuevo.',
            variant: 'destructive',
            duration: 4200,
        })
    }
}

// ── Popovers State (Sellout & Status) ──────────────────────────────────────────
const openSelloutId = ref<string | null>(null)
const openStatusOC  = ref<string | null>(null)

function closeAllPopovers() {
    openSelloutId.value = null
    openStatusOC.value  = null
    historyWeekPickerOpen.value = false
}

function closeSellout() {
    openSelloutId.value = null
}

function openProductPanel(tienda: CpfrStoreDash, sku: CpfrSkuDash) {
    selectedProductContext.value = { tienda, sku }
    closeAllPopovers()
}

function closeProductPanel() {
    selectedProductContext.value = null
}

function openHistorialProductPanel(tienda: HistorialStoreGroup, sku: CpfrSkuDash) {
    selectedProductContext.value = {
        tienda: {
            ...tienda.source,
            skus: tienda.skus,
            total_skus: tienda.skus.length,
        },
        sku,
    }
    closeAllPopovers()
}

function toggleSellout(id: string) {
    if (openSelloutId.value === id) {
        openSelloutId.value = null
    } else {
        openSelloutId.value = id
        openStatusOC.value  = null // Cerrar el otro si está abierto
    }
}

function toggleStatusOC(ocNum: string) {
    if (openStatusOC.value === ocNum) {
        openStatusOC.value = null
    } else {
        openStatusOC.value = ocNum
        openSelloutId.value = null // Cerrar el otro si está abierto
    }
}

onMounted(() => {
    document.addEventListener('click', closeAllPopovers)
})

onBeforeUnmount(() => {
    document.removeEventListener('click', closeAllPopovers)
})

// ── Agrupación por Orden de Compra (OC) ────────────────────────────────────────────────────────
export interface GroupedOC {
    group_id: string;
    num_pedido: string | null;
    semana_ic: string | null;
    fec_pedido_cadena: string | null;
    fec_fin_embarque: string | null;
    estado_oc: string | null;
    pedido_sugerido_pz_red_total: number;
    cant_pedida_total: number;
    skus: CpfrSkuDash[];
}

function isZ8(num: string | null): boolean {
    if (!num) return false
    const n = num.toLowerCase()
    return n.startsWith('z8')
}

function groupOCs(skus: CpfrSkuDash[]): GroupedOC[] {
    const map = new Map<string, GroupedOC>()
    for (const sku of skus) {
        // Regla de visibilidad: ocultar 0s solo si es Z8 y el toggle está desactivado
        if (sku.pedido_sugerido_pz_red === 0) {
            if (isZ8(sku.num_pedido) && !showZeroZ8.value) continue
        }
        const key = sku.num_pedido || 'UNSAVED'
        if (!map.has(key)) {
            map.set(key, {
                group_id: key,
                num_pedido: sku.num_pedido,
                semana_ic: sku.semana_ic,
                fec_pedido_cadena: sku.fec_pedido_cadena,
                fec_fin_embarque: sku.fec_fin_embarque,
                estado_oc: sku.estado_oc,
                pedido_sugerido_pz_red_total: 0,
                cant_pedida_total: 0,
                skus: []
            })
        }
        const oc = map.get(key)!
        oc.pedido_sugerido_pz_red_total += sku.pedido_sugerido_pz_red
        oc.cant_pedida_total += (sku.cant_pedida || 0)
        oc.skus.push(sku)
    }
    // Retornamos:
    // 1. Órdenes normales primero, Z8 al final
    // 2. Por fec_pedido_cadena descendente (más reciente primero)
    return Array.from(map.values()).filter(oc => oc.skus.length > 0).sort((a, b) => {
        const dateA = a.fec_pedido_cadena ? new Date(a.fec_pedido_cadena).getTime() : 0;
        const dateB = b.fec_pedido_cadena ? new Date(b.fec_pedido_cadena).getTime() : 0;
        
        if (dateB !== dateA) return dateB - dateA;

        // Si la fecha es igual, ponemos Z8 arriba
        const isZA = isZ8(a.num_pedido);
        const isZB = isZ8(b.num_pedido);
        if (isZA && !isZB) return -1;
        if (!isZA && isZB) return 1;

        return 0;
    })
}

function groupHistorialOCs(skus: CpfrSkuDash[]): GroupedOC[] {
    const map = new Map<string, GroupedOC>()
    for (const sku of skus) {
        const key = sku.num_pedido || 'UNSAVED'
        if (!map.has(key)) {
            map.set(key, {
                group_id: key,
                num_pedido: sku.num_pedido,
                semana_ic: sku.semana_ic,
                fec_pedido_cadena: sku.fec_pedido_cadena,
                fec_fin_embarque: sku.fec_fin_embarque,
                estado_oc: sku.estado_oc,
                pedido_sugerido_pz_red_total: 0,
                cant_pedida_total: 0,
                skus: []
            })
        }
        const oc = map.get(key)!
        oc.pedido_sugerido_pz_red_total += sku.pedido_sugerido_pz_red
        oc.cant_pedida_total += (sku.cant_pedida || 0)
        oc.skus.push(sku)
    }

    return Array.from(map.values()).sort((a, b) => {
        const dateA = a.fec_pedido_cadena ? new Date(a.fec_pedido_cadena).getTime() : 0
        const dateB = b.fec_pedido_cadena ? new Date(b.fec_pedido_cadena).getTime() : 0
        return dateB - dateA
    })
}

const groupByOC = computed({
    get: () => store.groupByOC,
    set: (val) => store.setGroupByOC(val)
})

function getFlatVisibleSkus(skus: CpfrSkuDash[]): CpfrSkuDash[] {
    return groupOCs(skus).flatMap(oc => oc.skus)
}

const expandedOCGroups = ref<Record<string, boolean>>({})

function toggleOCGroup(storeId: string, groupId: string) {
    const key = `${storeId}_${groupId}`
    expandedOCGroups.value[key] = !expandedOCGroups.value[key]
}

// Funciones locales para expandir/contraer las OCs usando el store
function expandAllOCsLocal() {
  store.expandAll()
    store.expandAllOCs(expandedOCGroups.value)

    
}

function collapseAllOCsLocal() {
    store.collapseAllOCs(expandedOCGroups.value)
}

// ── Secciones de días colapsadas ──────────────────────────────────────────────
const collapsedDays = ref<Record<number, boolean>>({})
function toggleDay(dia_num: number) {
    collapsedDays.value[dia_num] = !collapsedDays.value[dia_num]
}

// ── Motor de Cálculo y Generación ─────────────────────────────────────────────
// ── Utilities de estilo ───────────────────────────────────────────────────────

function cobClass(cob: number | null) {
    if (cob === null) return 'text-slate-400'
    const crit = store.criterio_global || 2.0
    if (cob < crit) return 'text-rose-600 font-semibold'
    if (cob > crit + 1.0) return 'text-orange-500 font-semibold'
    return 'text-emerald-600 font-semibold'
}

function fillClass(fr: number | null) {
    if (fr === null) return 'text-slate-300'
    const pct = fr * 100
    if (pct >= 90)   return 'text-emerald-600 font-semibold'
    if (pct >= 70)   return 'text-amber-500 font-semibold'
    return 'text-rose-600 font-semibold'
}

function skuRowBgClass(sku: any): string {
    if (esSinSellout(sku)) return 'bg-amber-50/60 hover:bg-amber-100/50'
    const fr = calcularFillRateDinamico(sku);
    if (fr === null) return 'bg-white hover:bg-slate-50'
    if (fr === 0) return 'bg-orange-50/50 hover:bg-orange-100/40'
    if (fr > 1.001) return 'bg-sky-50/50 hover:bg-sky-100/40' 
    if (fr >= 1) return 'bg-emerald-50/40 hover:bg-emerald-100/40'
    return 'bg-white hover:bg-slate-50'
}

// Helpers para z-index dinámico en Vista de Tarjetas
function isAnySelloutOpenInTienda(tiendaId: number) {
    if (!openSelloutId.value) return false;
    return openSelloutId.value.startsWith(tiendaId.toString() + '_');
}

function isAnySelloutOpenInOC(tiendaId: number, skus: any[]) {
    if (!openSelloutId.value) return false;
    const prefix = tiendaId.toString() + '_';
    return skus.some(s => openSelloutId.value === (prefix + s.sku_cadena));
}

function storeRowBgClass(isExpanded: boolean): string {
    return isExpanded
        ? 'bg-slate-50/80 border-l-[3px] border-l-brand-400 border-b border-slate-200'
        : 'bg-white border-l-[3px] border-l-transparent border-b border-slate-100 hover:bg-slate-50/80'
}

function escenarioCls(esc: 'A' | 'B' | null, numPedido?: string | null) {
    if (numPedido && isZ8(numPedido)) {
        return 'bg-purple-100 text-purple-700 border-purple-200 font-bold'
    }
    if (esc === 'A') return 'bg-sky-100 text-sky-700 border-sky-200'
    if (esc === 'B') return 'bg-amber-100 text-amber-700 border-amber-200'
    return 'bg-slate-100 text-slate-500 border-slate-200'
}

function escenarioText(esc: 'A' | 'B' | null, numPedido?: string | null) {
    if (numPedido && isZ8(numPedido)) {
        const num = numPedido.toLowerCase()
        if (num.includes('carne')) return 'Z8 Carnes'
        return 'Z8'
    }
    return esc ?? '—'
}

function n(v: number | null | undefined, dec = 1): string {
    if (v == null) return '—'
    return v.toLocaleString('es-MX', { maximumFractionDigits: dec })
}

function estadoBadge(estado: string | null): { label: string; cls: string; color: string } {
    if (estado === 'pendiente') return { label: 'Pendiente', cls: 'bg-slate-100 text-slate-600 border-slate-200', color: '#e2e8f0' }
    if (estado === 'borrador')  return { label: 'Borrador',  cls: 'bg-amber-100 text-amber-700 border-amber-200', color: '#fbbf24' }
    if (estado === 'revision')  return { label: 'Revisión',  cls: 'bg-indigo-100 text-indigo-700 border-indigo-200', color: '#818cf8' }
    if (estado === 'aprobado')  return { label: 'Aprobado',  cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', color: '#34d399' }
    if (estado === 'enviado')   return { label: 'Enviado',   cls: 'bg-blue-100 text-blue-700 border-blue-200', color: '#60a5fa' }
    if (estado === 'cerrado')   return { label: 'Cerrado',   cls: 'bg-slate-100 text-slate-400 border-slate-200', color: '#cbd5e1' }
    return { label: estado || 'Desconocido', cls: 'bg-slate-100 text-slate-500 border-slate-200', color: '#94a3b8' }
}

function storeStatusKey(idCliente: string): string {
    return `store:${idCliente}`
}

type CpfrOrderStatus = 'pendiente' | 'borrador' | 'revision' | 'aprobado' | 'cerrado' | 'reemplazado' | 'enviado'

const cardStatusOptions: Array<{
    estado: CpfrOrderStatus;
    label: string;
    description: string;
    icon: string;
    cls: string;
}> = [
    {
        estado: 'borrador',
        label: 'Borrador',
        description: 'Regresa la OC a edición operativa.',
        icon: 'fa-solid fa-file-pen',
        cls: 'text-amber-700 hover:bg-amber-50',
    },
    {
        estado: 'revision',
        label: 'Revisión',
        description: 'Envía la OC al flujo de aprobación.',
        icon: 'fa-solid fa-paper-plane',
        cls: 'text-indigo-700 hover:bg-indigo-50',
    },
    {
        estado: 'aprobado',
        label: 'Aprobado',
        description: 'Aprueba la OC directamente.',
        icon: 'fa-solid fa-circle-check',
        cls: 'text-emerald-700 hover:bg-emerald-50',
    },
    {
        estado: 'cerrado',
        label: 'Cerrado',
        description: 'Retira la OC del flujo operativo.',
        icon: 'fa-solid fa-lock',
        cls: 'text-slate-700 hover:bg-slate-100',
    },
]

function canUseCardDirectStatusMode(): boolean {
    return currentTab.value !== 'historial'
}

function getVisibleOCNumbers(skus: CpfrSkuDash[]): string[] {
    const nums = new Set<string>()
    for (const sku of getFlatVisibleSkus(skus)) {
        if (sku.num_pedido) nums.add(sku.num_pedido)
    }
    return [...nums]
}

function getVisibleEditableOCNumbers(skus: CpfrSkuDash[]): string[] {
    const nums = new Set<string>()
    for (const sku of getFlatVisibleSkus(skus)) {
        if (!sku.num_pedido) continue
        if (sku.estado_oc && !['pendiente', 'borrador'].includes(sku.estado_oc)) continue
        nums.add(sku.num_pedido)
    }
    return [...nums]
}

function storeVisibleStatusBadge(skus: CpfrSkuDash[]): { label: string; cls: string; color: string } | null {
    const visibleSkus = getFlatVisibleSkus(skus).filter(s => s.num_pedido)
    if (!visibleSkus.length) return null

    const states = new Set(visibleSkus.map(s => s.estado_oc || 'pendiente'))
    if (states.size === 1) return estadoBadge([...states][0])
    if ([...states].every(s => s === 'pendiente' || s === 'borrador')) {
        return {
            label: 'Pendiente / Borrador',
            cls: 'bg-amber-50 text-amber-700 border-amber-200',
            color: '#fbbf24',
        }
    }
    return {
        label: 'Mixto',
        cls: 'bg-slate-100 text-slate-600 border-slate-200',
        color: '#94a3b8',
    }
}

function calcularCoberturaDinamica(sku: any): number | null {
    if (!sku || !sku.promedio_sellout_kg || sku.promedio_sellout_kg <= 0) return null;
    const qtyPz = sku.pedido_sugerido_pz_red || 0;
    const invKg = sku.inv_actual_kg || 0;
    const unInv = sku.unidad_inventario || 0;
    const promKg = sku.promedio_sellout_kg;
    return ((qtyPz * unInv) + invKg) / promKg;
}

function calcularFillRateDinamico(sku: any): number | null {
    if (!sku || !sku.cant_pedida || sku.cant_pedida <= 0) return null;
    const sugerido = sku.pedido_sugerido_pz_red || 0;
    return sugerido / sku.cant_pedida;
}

async function changeOCStatus(num_pedido: string | null, estado: string) {
    if (!store.currentWeek || !num_pedido) return
    
    // Cerrar dropdown al elegir
    openStatusOC.value = null

    const isRevision = estado === 'revision'
    submittingOC.value = num_pedido

    const result = await store.updateStatus({
        num_pedido: num_pedido,
        year: store.currentWeek.anio,
        week: store.currentWeek.semana,
        estado: estado as any,
    })

    submittingOC.value = null

    if (isRevision) {
        if (result.ok) {
            toast({
                title: '\u2705 Pedido enviado a revisión',
                description: result.approvalId
                    ? `Solicitud de aprobación #${result.approvalId} creada. El aprobador ha sido notificado.`
                    : 'El pedido fue enviado a revisión. Pendiente de aprobación.',
                duration: 5000,
            })
        } else {
            toast({
                title: '\u274c Error al enviar a revisión',
                description: 'No se pudo crear la solicitud de aprobación. Intenta de nuevo.',
                variant: 'destructive',
                duration: 5000,
            })
        }
    } else {
        toast({
            title: result.ok ? 'Estado actualizado' : 'Error al cambiar estado',
            description: result.ok
                ? `La OC ${num_pedido} cambió a ${estadoBadge(estado).label}.`
                : `No se pudo cambiar la OC ${num_pedido}. Intenta de nuevo.`,
            variant: result.ok ? undefined : 'destructive',
            duration: 4200,
        })
    }
}

async function changeStoreVisibleOCStatus(tienda: CpfrStoreDash, estado: string, options: { includeAllVisible?: boolean; directMode?: boolean } = {}) {
    if (!store.currentWeek) return

    const ocNumbers = options.includeAllVisible ? getVisibleOCNumbers(tienda.skus) : getVisibleEditableOCNumbers(tienda.skus)
    if (!ocNumbers.length) return

    const submitKey = storeStatusKey(tienda.id_cliente)
    openStatusOC.value = null
    submittingOC.value = submitKey

    const result = await store.updateStatusBulk({
        num_pedidos: ocNumbers,
        year: store.currentWeek.anio,
        week: store.currentWeek.semana,
        estado: estado as any,
    })

    submittingOC.value = null

    if (estado === 'revision') {
        if (result.ok) {
            toast({
                title: '\u2705 OCs enviadas a revisi\u00f3n',
                description: result.approvalId
                    ? `${ocNumbers.length} OC visibles enviadas en la solicitud de aprobaci\u00f3n #${result.approvalId}.`
                    : `${ocNumbers.length} OC visibles enviadas a revisi\u00f3n.`,
                duration: 5000,
            })
        } else {
            toast({
                title: '\u274c Error al enviar a revisi\u00f3n',
                description: `No se pudieron actualizar las ${ocNumbers.length} OC visibles.`,
                variant: 'destructive',
                duration: 5000,
            })
        }
    } else {
        toast({
            title: result.ok ? 'Estado actualizado por tienda' : 'Error al cambiar estado',
            description: result.ok
                ? `${ocNumbers.length} OC visibles de ${tienda.nombre_tienda} cambiaron a ${estadoBadge(estado).label}${options.directMode ? ' desde la vista de tarjetas' : ''}.`
                : `No se pudieron actualizar las ${ocNumbers.length} OC visibles de ${tienda.nombre_tienda}.`,
            variant: result.ok ? undefined : 'destructive',
            duration: 5000,
        })
    }
}

defineExpose({ expandedOCGroups })

// ── Indicadores de salud por SKU ─────────────────────────────────────────────

function esSinSellout(sku: any): boolean {
    return !sku.promedio_sellout_kg || sku.promedio_sellout_kg <= 0;
}

function coberturaStatus(sku: any): 'ok' | 'bajo' | 'sobre' | 'sin_datos' {
    if (esSinSellout(sku)) return 'sin_datos';
    const cob = calcularCoberturaDinamica(sku);
    if (cob === null) return 'sin_datos';
    const crit = sku.semanas_objetivo || store.criterio_global || 2.5;
    if (cob < crit) return 'bajo';
    if (cob > crit + 0.5) return 'sobre';
    return 'ok';
}

function getSkuScenarioBadges(sku: any) {
    const badges = [];
    const fr = calcularFillRateDinamico(sku);
    const cob = calcularCoberturaDinamica(sku);
    const crit = sku.semanas_objetivo || store.criterio_global || 2.5;

    // 1. Sin Sellout
    if (esSinSellout(sku)) {
        badges.push({ label: 'Sin Sellout', emoji: '🌱', cls: 'bg-amber-100/50 text-amber-700 border-amber-200' });
    }
    
    // 2. Desabasto / Bajo Stock
    if (sku.inv_actual_pz <= 0) {
        badges.push({ label: 'Desabasto', emoji: '🚫', cls: 'bg-rose-100/50 text-rose-700 border-rose-200 font-black' });
    } else if (cob !== null && cob < crit) {
        badges.push({ label: 'Bajo Stock', emoji: '⚠️', cls: 'bg-orange-100/50 text-orange-700 border-orange-200 font-bold' });
    }

    // 3. Sobrestock
    if (cob !== null && cob > crit + 1.5) {
        badges.push({ label: 'Sobrestock', emoji: '📦', cls: 'bg-blue-100/60 text-blue-700 border-blue-200' });
    }

    // 4. Fillrate / Sobrepedido
    if (fr !== null) {
        if (fr < 0.999) {
            badges.push({ label: 'FR Bajo', emoji: '🔻', cls: 'bg-rose-50 text-rose-600 border-rose-100 font-bold' });
        } else if (fr >= 0.999 && fr <= 1.001) {
            badges.push({ label: 'FR 100%', emoji: '✅', cls: 'bg-emerald-50 text-emerald-600 border-emerald-100 font-bold' });
        } else if (fr > 1.001) {
            badges.push({ label: 'Sobrepedido', emoji: '🚀', cls: 'bg-purple-50 text-purple-600 border-purple-100 font-bold' });
        }
    }
    
    return badges;
}

function coberturaStatusIcon(status: ReturnType<typeof coberturaStatus>): string {
    if (status === 'bajo')     return 'fa-solid fa-triangle-exclamation text-rose-500'
    if (status === 'sobre')    return 'fa-solid fa-arrow-trend-up text-orange-500'
    if (status === 'sin_datos') return 'fa-solid fa-circle-question text-slate-300'
    return ''
}

function coberturaStatusTooltip(status: ReturnType<typeof coberturaStatus>, cob: number | null, crit: number): string {
    if (status === 'bajo')      return `Bajo stock: cobertura ${cob?.toFixed(2)} sem. — criterio: ${crit} sem.`
    if (status === 'sobre')     return `Sobrestock: cobertura ${cob?.toFixed(2)} sem. (umbral: ${(crit + 0.5).toFixed(1)} sem.)`
    if (status === 'sin_datos') return 'Sin histórico de venta promedio'
    return ''
}

function fillRateBadge(fr: number | null): { bg: string; text: string; icon: string; tip: string } {
    if (fr === null) return { bg: '', text: 'text-slate-400', icon: '', tip: 'Sin pedido cadena' }
    const pct = fr * 100
    if (pct === 0)    return { bg: 'bg-rose-50',    text: 'text-rose-600 font-bold',    icon: 'fa-solid fa-ban text-rose-400',              tip: 'Fill Rate 0% — sin cobertura' }
    if (pct <= 80)    return { bg: 'bg-orange-50',  text: 'text-orange-600 font-bold',  icon: 'fa-solid fa-arrow-down text-orange-400',   tip: `Fill Rate bajo: ${pct.toFixed(0)}% (Umbral 80%)` }
    if (Math.abs(pct - 100) < 0.1) return { bg: 'bg-emerald-50', text: 'text-emerald-600 font-bold', icon: 'fa-solid fa-check text-emerald-400', tip: 'Fill Rate: 100%' }
    if (pct > 100)    return { bg: 'bg-sky-50',     text: 'text-sky-600 font-bold',     icon: 'fa-solid fa-arrow-up text-sky-400',      tip: `Sobre-pedido: ${pct.toFixed(0)}%` }
    return              { bg: 'bg-amber-50',   text: 'text-amber-600 font-bold',   icon: 'fa-solid fa-triangle-exclamation text-amber-400', tip: `Incompleto: ${pct.toFixed(0)}%` }
}

function fillRateStatusDot(sku: any): { cls: string; label: string } {
    const fr = calcularFillRateDinamico(sku);
    if (fr === null) return { cls: 'bg-slate-200 border-slate-300', label: 'Fill Rate: N/A' };
    const pct = fr * 100;
    
    // Unificado con fillRateBadge
    if (pct === 0) return { cls: 'bg-rose-300 border-rose-400', label: 'Fill Rate: 0%' };
    if (pct <= 80) return { cls: 'bg-orange-300 border-orange-400', label: `Fill Rate Bajo: ${pct.toFixed(0)}%` };
    if (Math.abs(pct - 100) < 0.1) return { cls: 'bg-emerald-400 border-emerald-500', label: 'Fill Rate: 100%' };
    if (pct > 100) return { cls: 'bg-sky-400 border-sky-500', label: `Sobre-pedido: ${pct.toFixed(0)}%` };
    
    return { cls: 'bg-amber-300 border-amber-400', label: `Incompleto: ${pct.toFixed(0)}%` };
}

// ── Lógica de Filtrado Local ──────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000

function parseLocalDate(value: string | null | undefined): Date | null {
    if (!value) return null
    const [year, month, day] = value.slice(0, 10).split('-').map(Number)
    if (!year || !month || !day) return null
    return new Date(year, month - 1, day)
}

function startOfLocalDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number): Date {
    const next = new Date(date)
    next.setDate(next.getDate() + days)
    return next
}

function sameLocalDay(a: Date | null, b: Date | null): boolean {
    if (!a || !b) return false
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate()
}

function getISOContext(date: Date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    const week = Math.ceil((((d.getTime() - yearStart.getTime()) / DAY_MS) + 1) / 7)
    return { year: d.getUTCFullYear(), week }
}

function startOfISOWeek(date: Date): Date {
    const d = startOfLocalDay(date)
    const dayNum = d.getDay() || 7
    return addDays(d, 1 - dayNum)
}

function isSameISOWeek(date: Date | null, context: { year: number; week: number }): boolean {
    if (!date) return false
    const dateContext = getISOContext(date)
    return dateContext.year === context.year && dateContext.week === context.week
}

function canStillShipByLeadTime(sku: any, leadTime: number | null | undefined, today = new Date()): boolean {
    const finEmbarqueDate = parseLocalDate(sku.fec_fin_embarque)
    if (!finEmbarqueDate) return true

    const normalizedLeadTime = Math.max(0, Number(leadTime) || 0)
    const earliestShipDate = addDays(startOfLocalDay(today), normalizedLeadTime)
    return finEmbarqueDate.getTime() >= earliestShipDate.getTime()
}

const filteredDias = computed(() => {
    const sf = store.statusFilters;
    const hasStatusFilter = sf.escenarioA || sf.escenarioB || sf.sinSellout || sf.desabasto || 
                           sf.bajoStock || sf.sobrestock || sf.fillrateBajo || 
                           sf.fillrate100 || sf.sobrepedido;
    
    const today = new Date();
    const curr = getISOContext(today);
    const last = getISOContext(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000));
    const currentWeekStart = startOfISOWeek(today);
    const immediatePreviousSaturday = addDays(currentWeekStart, -2);
    const immediatePreviousSunday = addDays(currentWeekStart, -1);
    const rollingSevenDaysStart = addDays(startOfLocalDay(today), -7);

    const isCurrentWeek = (sku: any) => {
        const y = sku.fec_pedido_cadena ? parseInt(sku.fec_pedido_cadena.slice(0, 4)) : 0;
        const w = sku.semana_ic ? parseInt(sku.semana_ic) : 0;
        return y === curr.year && w === curr.week;
    };

    const isPreviousWeek = (sku: any) => {
        const y = sku.fec_pedido_cadena ? parseInt(sku.fec_pedido_cadena.slice(0, 4)) : 0;
        const w = sku.semana_ic ? parseInt(sku.semana_ic) : 0;
        return y === last.year && w === last.week;
    };

    const isOlderWeek = (sku: any) => {
        const y = sku.fec_pedido_cadena ? parseInt(sku.fec_pedido_cadena.slice(0, 4)) : 0;
        const w = sku.semana_ic ? parseInt(sku.semana_ic) : 0;
        return (y < last.year) || (y === last.year && w < last.week);
    };

    const isVisibleOrderWindow = (sku: any, leadTime: number | null | undefined) => {
        if (!canStillShipByLeadTime(sku, leadTime, today)) return false;

        const pedidoDate = parseLocalDate(sku.fec_pedido_cadena);
        const finEmbarqueDate = parseLocalDate(sku.fec_fin_embarque);

        if (isSameISOWeek(pedidoDate, curr)) return true;

        const isImmediatePreviousWeekend =
            sameLocalDay(pedidoDate, immediatePreviousSaturday)
            || sameLocalDay(pedidoDate, immediatePreviousSunday);

        if (isImmediatePreviousWeekend) return true;

        return isSameISOWeek(pedidoDate, last)
            && isSameISOWeek(finEmbarqueDate, curr)
            && !!pedidoDate
            && pedidoDate.getTime() >= rollingSevenDaysStart.getTime();
    };

    const isCentralizadosVisibleOC = (sku: any, leadTime: number | null | undefined) => {
        const state = sku.estado_oc;
        if (state === 'revision' || state === 'aprobado') return false;
        if (!(state === 'pendiente' || state === 'borrador' || !state)) return false;
        return isVisibleOrderWindow(sku, leadTime);
    };

    return (currentTab.value === 'historial' ? store.historialDias : store.dias).map(dia => {
        const filteredTiendas = dia.tiendas.map(tienda => {
            const filteredSkus = tienda.skus.filter(sku => {
                // 1. Filtro por Pestaña (Tab)
                const state = sku.estado_oc;
                if (currentTab.value === 'centralizados') {
                    if (!isCentralizadosVisibleOC(sku, tienda.resumen?.lead_time)) return false;
                } else if (currentTab.value === 'revision') {
                    if ((!isCurrentWeek(sku) && !isPreviousWeek(sku)) || state !== 'revision') return false;
                } else if (currentTab.value === 'aprobada') {
                    if (state !== 'aprobado' || !isVisibleOrderWindow(sku, tienda.resumen?.lead_time)) return false;
                } else if (currentTab.value === 'sin_embarcar') {
                    if (state !== 'cerrado') return false;
                    
                    if (selectedFilterWeek.value !== 'TODAS') {
                        const y = sku.fec_pedido_cadena ? parseInt(sku.fec_pedido_cadena.slice(0, 4)) : 0;
                        const w = sku.semana_ic ? parseInt(sku.semana_ic) : 0;
                        const key = `${y}-W${w.toString().padStart(2, '0')}`;
                        if (key !== selectedFilterWeek.value) return false;
                    }
                } else if (currentTab.value === 'historial') {
                    // Historial: mostrar OCs de semanas pasadas sin importar estado
                    // Solo excluir la semana actual y la anterior (que ya aparecen en otras pestañas)
                    const isCurrentOrPrev = isCurrentWeek(sku) || isPreviousWeek(sku);
                    if (isCurrentOrPrev) return false;

                    if (selectedFilterWeek.value !== 'TODAS') {
                        const y = sku.fec_pedido_cadena ? parseInt(sku.fec_pedido_cadena.slice(0, 4)) : 0;
                        const w = sku.semana_ic ? parseInt(sku.semana_ic) : 0;
                        const key = `${y}-W${w.toString().padStart(2, '0')}`;
                        if (key !== selectedFilterWeek.value) return false;
                    }
                }

                // 2. Filtro de Búsqueda
                if (sf.searchOC) {
                    const term = sf.searchOC.toLowerCase();
                    const num = (sku.num_pedido || '').toLowerCase();
                    if (!num.includes(term)) return false;
                }

                if (sf.searchSku) {
                    const term = sf.searchSku.toLowerCase();
                    const searchableSku = [
                        sku.sku_nombre,
                        sku.sku_muliix,
                        sku.sku_cadena,
                        sku.upc_cadena,
                        sku.desc_art,
                    ].filter(Boolean).join(' ').toLowerCase();
                    if (!searchableSku.includes(term)) return false;
                }

                // 3. Filtros de Estado dinámicos (OR)
                if (!hasStatusFilter) return true;

                const fr = calcularFillRateDinamico(sku);
                const cobStatus = coberturaStatus(sku);

                if (sf.escenarioA && sku.escenario === 'A') return true;
                if (sf.escenarioB && sku.escenario === 'B') return true;
                if (sf.sinSellout && esSinSellout(sku)) return true;
                if (sf.bajoStock && cobStatus === 'bajo') return true;
                if (sf.sobrestock && cobStatus === 'sobre') return true;
                
                if (sf.fillrateBajo && fr !== null && fr < 0.999) return true;
                if (sf.fillrate100 && fr !== null && Math.abs(fr - 1) < 0.001) return true;
                if (sf.sobrepedido && fr !== null && fr > 1.001) return true;
                
                if (sf.desabasto && sku.inv_actual_pz <= 0) return true;
                
                return false;
            });
            // Ordenar por fecha de pedido (más recientes arriba)
            filteredSkus.sort((a, b) => {
                const dateA = a.fec_pedido_cadena ? new Date(a.fec_pedido_cadena).getTime() : 0;
                const dateB = b.fec_pedido_cadena ? new Date(b.fec_pedido_cadena).getTime() : 0;
                return dateB - dateA;
            });

            return { ...tienda, skus: filteredSkus };
        }).filter(tienda => tienda.skus.length > 0);
        
        return { ...dia, tiendas: filteredTiendas };
    }).filter(dia => dia.tiendas.length > 0);
});

const expiredCentralizedOCs = computed(() => {
    const today = new Date()
    const curr = getISOContext(today)
    const last = getISOContext(addDays(today, -7))
    const currentWeekStart = startOfISOWeek(today)
    const immediatePreviousSaturday = addDays(currentWeekStart, -2)
    const immediatePreviousSunday = addDays(currentWeekStart, -1)
    const rollingSevenDaysStart = addDays(startOfLocalDay(today), -7)
    const map = new Map<string, {
        id_cliente: string
        nombre_tienda: string
        num_pedido: string
        fec_pedido_cadena: string | null
        fec_fin_embarque: string | null
        lead_time: number
        sku_count: number
    }>()

    const isCentralizadosDateEligible = (sku: any) => {
        const pedidoDate = parseLocalDate(sku.fec_pedido_cadena)
        const finEmbarqueDate = parseLocalDate(sku.fec_fin_embarque)

        if (isSameISOWeek(pedidoDate, curr)) return true
        if (sameLocalDay(pedidoDate, immediatePreviousSaturday) || sameLocalDay(pedidoDate, immediatePreviousSunday)) return true

        return isSameISOWeek(pedidoDate, last)
            && isSameISOWeek(finEmbarqueDate, curr)
            && !!pedidoDate
            && pedidoDate.getTime() >= rollingSevenDaysStart.getTime()
    }

    for (const dia of store.dias) {
        for (const tienda of dia.tiendas) {
            const leadTime = tienda.resumen?.lead_time ?? 0
            for (const sku of tienda.skus) {
                const state = sku.estado_oc
                if (!sku.num_pedido) continue
                if (state === 'revision' || state === 'aprobado' || state === 'cerrado') continue
                if (!(state === 'pendiente' || state === 'borrador' || !state)) continue
                if (!isCentralizadosDateEligible(sku)) continue
                if (canStillShipByLeadTime(sku, leadTime, today)) continue

                const key = `${tienda.id_cliente}|${sku.num_pedido}`
                if (!map.has(key)) {
                    map.set(key, {
                        id_cliente: tienda.id_cliente,
                        nombre_tienda: tienda.nombre_tienda,
                        num_pedido: sku.num_pedido,
                        fec_pedido_cadena: sku.fec_pedido_cadena,
                        fec_fin_embarque: sku.fec_fin_embarque,
                        lead_time: Number(leadTime) || 0,
                        sku_count: 1,
                    })
                } else {
                    map.get(key)!.sku_count += 1
                }
            }
        }
    }

    return [...map.values()]
})

const expiredCloseSummary = computed(() => ({
    ocs: expiredCentralizedOCs.value.length,
    stores: new Set(expiredCentralizedOCs.value.map(oc => oc.id_cliente)).size,
    skus: expiredCentralizedOCs.value.reduce((acc, oc) => acc + oc.sku_count, 0),
}))

async function closeExpiredCentralizedOCs() {
    if (!store.currentWeek || submittingOC.value === 'expired-centralized') return

    const expired = expiredCentralizedOCs.value
    if (!expired.length) return

    submittingOC.value = 'expired-centralized'
    const result = await store.updateStatusBulk({
        num_pedidos: expired.map(oc => oc.num_pedido),
        year: store.currentWeek.anio,
        week: store.currentWeek.semana,
        estado: 'cerrado',
    })
    submittingOC.value = null

    if (result.ok) {
        showExpiredCloseModal.value = false
        toast({
            title: 'OC caducadas cerradas',
            description: `${expired.length} OC actualizada(s) a cerrado.`,
            duration: 5000,
        })
    } else {
        toast({
            title: 'Error al cerrar OC',
            description: 'No se pudieron cerrar las OC caducadas. Intenta de nuevo.',
            variant: 'destructive',
            duration: 5000,
        })
    }
}

function openExpiredCloseModal() {
    if (!expiredCentralizedOCs.value.length) return
    showExpiredCloseModal.value = true
}

function closeExpiredCloseModal() {
    if (submittingOC.value === 'expired-centralized') return
    showExpiredCloseModal.value = false
}

function formatShortDate(value: string | null | undefined): string {
    if (!value) return '—'
    return value.slice(0, 10)
}

function skuWeekKey(sku: CpfrSkuDash): string {
    const anio = sku.fec_pedido_cadena ? parseInt(sku.fec_pedido_cadena.slice(0, 4)) : 0
    const semana = sku.semana_ic ? parseInt(sku.semana_ic) : 0
    return `${anio}-W${String(semana).padStart(2, '0')}`
}

function skuWeekLabel(sku: CpfrSkuDash): string {
    const anio = sku.fec_pedido_cadena ? parseInt(sku.fec_pedido_cadena.slice(0, 4)) : 0
    return `Semana ${sku.semana_ic || '—'} (${anio || '—'})`
}

type HistorialWeekGroup = {
    key: string
    label: string
    skus: CpfrSkuDash[]
    ocs: GroupedOC[]
}

type HistorialStoreGroup = {
    source: CpfrStoreDash
    id_cliente: string
    nombre_tienda: string
    jefatura: string
    skus: CpfrSkuDash[]
    weeks: HistorialWeekGroup[]
    ocCount: number
    states: string[]
}

const historialStoreGroups = computed<HistorialStoreGroup[]>(() => {
    const term = store.historialSearch.trim().toLowerCase()
    const map = new Map<string, HistorialStoreGroup>()

    for (const dia of store.historialDias) {
        for (const tienda of dia.tiendas) {
            for (const sku of tienda.skus) {
                const state = sku.estado_oc
                if (state !== 'aprobado' && state !== 'cerrado') continue

                const searchable = [
                    tienda.nombre_tienda,
                    tienda.id_cliente,
                    state,
                    estadoBadge(state).label,
                    sku.num_pedido,
                ].filter(Boolean).join(' ').toLowerCase()

                if (term && !searchable.includes(term)) continue

                if (!map.has(tienda.id_cliente)) {
                    map.set(tienda.id_cliente, {
                        source: tienda,
                        id_cliente: tienda.id_cliente,
                        nombre_tienda: tienda.nombre_tienda,
                        jefatura: tienda.jefatura,
                        skus: [],
                        weeks: [],
                        ocCount: 0,
                        states: [],
                    })
                }

                map.get(tienda.id_cliente)!.skus.push(sku)
            }
        }
    }

    for (const group of map.values()) {
        group.skus.sort((a, b) => {
            const dateA = a.fec_pedido_cadena ? new Date(a.fec_pedido_cadena).getTime() : 0
            const dateB = b.fec_pedido_cadena ? new Date(b.fec_pedido_cadena).getTime() : 0
            return dateB - dateA
        })

        const weekMap = new Map<string, HistorialWeekGroup>()
        for (const sku of group.skus) {
            const key = skuWeekKey(sku)
            if (!weekMap.has(key)) {
                weekMap.set(key, { key, label: skuWeekLabel(sku), skus: [], ocs: [] })
            }
            weekMap.get(key)!.skus.push(sku)
        }

        group.weeks = [...weekMap.values()].map(week => ({
            ...week,
            ocs: groupHistorialOCs(week.skus),
        }))
        group.ocCount = new Set(group.skus.map(s => s.num_pedido).filter(Boolean)).size
        group.states = [...new Set(group.skus.map(s => s.estado_oc).filter(Boolean) as string[])]
    }

    return [...map.values()].sort((a, b) => a.nombre_tienda.localeCompare(b.nombre_tienda))
})

const historialSummary = computed(() => {
    const ocSet = new Set<string>()
    let skus = 0

    for (const group of historialStoreGroups.value) {
        for (const sku of group.skus) {
            skus += 1
            if (sku.num_pedido) ocSet.add(`${group.id_cliente}|${sku.num_pedido}`)
        }
    }

    return {
        tiendas: historialStoreGroups.value.length,
        ocs: ocSet.size,
        skus,
    }
})

const showHistoryWeekGroups = computed(() => store.historialSelectedWeeks.length > 1)

const totalUniqueOCs = computed(() => {
    if (currentTab.value === 'historial') return historialSummary.value.ocs

    const ocSet = new Set<string>();
    filteredDias.value.forEach(dia => {
        dia.tiendas.forEach(tienda => {
            tienda.skus.forEach(sku => {
                if (sku.num_pedido) {
                    // Solo contamos la OC si tiene al menos un SKU visible según la lógica de groupOCs
                    const isVisible = sku.pedido_sugerido_pz_red !== 0 || !isZ8(sku.num_pedido) || showZeroZ8.value;
                    if (isVisible) {
                        ocSet.add(`${tienda.id_cliente}|${sku.num_pedido}`);
                    }
                }
            });
        });
    });
    return ocSet.size;
});
</script>

<template>
  <!-- Envoltura principal: Ahora incluye la Toolbar y la Tabla, con bordes redondeados y sombra sutil -->
  <div 
    v-bind="$attrs"
    class="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
  >

    <!-- Sin datos (solo para pestañas normales, no historial) -->
    <div
      v-if="!store.dias.length && currentTab !== 'historial'"
      class="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400 p-12 bg-slate-50/50"
    >
      <i class="fa-solid fa-box-open text-3xl text-slate-300"></i>
      <p class="text-sm font-medium">No hay pedidos para los filtros seleccionados.</p>
      <p class="text-xs text-slate-400">Ajusta los filtros o la semana actual.</p>
    </div>

    <!-- ── Tabla y Toolbar ──────────────────────────────────────────────── -->
    <template v-else-if="store.dias.length || currentTab === 'historial'">
      
      <!-- ── Toolbar de Control de Vistas ── -->
      <div class="shrink-0 px-4 py-2 border-b border-slate-200 bg-white/95 flex flex-wrap items-center justify-between gap-2">
        <div class="flex min-w-0 flex-wrap items-center gap-2 text-slate-500">
          <!-- Visibilidad de Z8 en cero -->
          <div class="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm p-0.5">
            <button
              class="inline-flex items-center justify-center w-8 h-8 rounded-md transition-all"
              :class="showZeroZ8 
                ? 'bg-violet-600 text-white' 
                : 'bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50'"
              @click.stop="showZeroZ8 = !showZeroZ8"
              :title="showZeroZ8 ? 'Ocultar sugeridos en 0 (Z8)' : 'Mostrar sugeridos en 0 (Z8)'"
            >
              <i class="fa-solid text-[11px]" :class="showZeroZ8 ? 'fa-eye' : 'fa-eye-slash'"></i>
            </button>
          </div>
          <!-- Switch Agrupar por OC -->
          <label class="relative h-8 inline-flex items-center gap-2 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer select-none" title="Agrupar/Desagrupar por Orden de Compra">
            <span>OC</span>
            <span class="relative inline-flex items-center">
              <input type="checkbox" v-model="groupByOC" class="sr-only peer">
              <span class="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-brand-500"></span>
            </span>
          </label>

          <!-- Contador de OCs -->
          <div v-if="totalUniqueOCs > 0" class="flex items-center gap-1.5 px-2.5 h-8 bg-brand-50 border border-brand-200 rounded-lg text-brand-700 font-bold text-[10px]">
            <i class="fa-solid fa-file-circle-check"></i>
            <span>{{ totalUniqueOCs }} OC</span>
          </div>

          <button
            v-if="currentTab === 'centralizados' && expiredCentralizedOCs.length > 0"
            class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-[10px] font-bold uppercase tracking-wider text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="submittingOC === 'expired-centralized'"
            title="Cerrar OC que ya no pueden enviarse por fecha fin embarque y lead time"
            @click.stop="openExpiredCloseModal"
          >
            <i v-if="submittingOC === 'expired-centralized'" class="fa-solid fa-circle-notch fa-spin"></i>
            <i v-else class="fa-solid fa-lock"></i>
            Cerrar caducadas
            <span class="rounded bg-white/70 px-1.5 py-0.5 text-[9px]">{{ expiredCentralizedOCs.length }}</span>
          </button>

          <!-- Pestañas (Tabs) -->
          <div class="flex min-w-0 items-center gap-1 bg-slate-100/50 p-0.5 rounded-lg border border-slate-200 shadow-inner">
            <button
               v-for="t in tabs" :key="t.id"
               class="px-2.5 h-7 rounded-md font-bold text-[10px] uppercase tracking-wider transition-all whitespace-nowrap"
               :class="currentTab === t.id ? 'bg-brand-600 text-white shadow-sm shadow-brand-200' : 'text-slate-500 hover:bg-white hover:text-slate-700'"
               @click="currentTab = t.id"
            >{{ t.label }}</button>
          </div>

          <!-- Selector de semanas anteriores para Sin Embarcar -->
          <div v-if="currentTab === 'sin_embarcar'" class="flex items-center animate-in fade-in slide-in-from-left-2 duration-200">
            <select
              v-model="selectedFilterWeek"
              class="h-8 bg-white border border-slate-200 text-slate-700 text-[10px] font-bold uppercase tracking-wider rounded-lg px-2.5 shadow-sm focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer hover:border-slate-300 transition-colors"
            >
              <option value="TODAS">Semana: Todas</option>
              <option v-for="w in availableWeeks" :key="w.key" :value="w.key">
                Semana {{ w.semana }} ({{ w.anio }})
              </option>
            </select>
          </div>

          <!-- Controles exclusivos de Historial -->
          <div v-if="currentTab === 'historial'" class="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
            <div class="relative" @click.stop>
              <button
                class="group inline-flex h-9 min-w-[220px] items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white pl-3 pr-2 text-left shadow-sm shadow-slate-100 transition hover:border-red-100 hover:bg-red-50/20 focus:outline-none focus:ring-2 focus:ring-red-100"
                :class="historyWeekPickerOpen ? 'border-red-200 ring-2 ring-red-100' : ''"
                title="Seleccionar semanas de historial"
                @click.stop="historyWeekPickerOpen = !historyWeekPickerOpen"
              >
                <span class="flex min-w-0 items-center gap-2">
                  <span class="inline-flex h-5 w-1 rounded-full bg-red-600"></span>
                  <span class="min-w-0">
                    <span class="block text-[9px] font-black uppercase leading-none text-red-600">Historial</span>
                    <span class="mt-0.5 block truncate text-[11px] font-black text-slate-900">{{ selectedHistoryWeeksLabel }}</span>
                  </span>
                </span>
                <span class="flex shrink-0 items-center gap-2">
                  <span
                    v-if="store.historialSelectedWeeks.length"
                    class="rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-black text-red-700"
                  >
                    {{ store.historialSelectedWeeks.length }}
                  </span>
                  <i class="fa-solid fa-chevron-down text-[10px] text-slate-400 transition-transform group-hover:text-red-600" :class="historyWeekPickerOpen ? 'rotate-180 text-red-600' : ''"></i>
                </span>
              </button>

              <div
                v-if="historyWeekPickerOpen"
                class="absolute left-0 top-full z-50 mt-2 w-[320px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60"
              >
                <div class="border-b border-slate-100 bg-slate-50/80 p-3">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <p class="text-[10px] font-black uppercase text-red-600">Semanas disponibles</p>
                      <p class="mt-0.5 text-xs font-semibold text-slate-500">Elige una o varias semanas para cargar.</p>
                    </div>
                    <button
                      class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-red-200 hover:bg-red-50/70 hover:text-red-700"
                      title="Cerrar selector"
                      @click.stop="historyWeekPickerOpen = false"
                    >
                      <i class="fa-solid fa-xmark text-[11px]"></i>
                    </button>
                  </div>

                  <div class="relative mt-3">
                    <i class="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-300"></i>
                    <input
                      v-model="historyWeekSearch"
                      type="text"
                      placeholder="Buscar semana o año"
                      class="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs font-semibold text-slate-700 outline-none transition hover:border-red-100 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    />
                  </div>

                  <div class="mt-2 flex items-center gap-2">
                    <button
                      class="h-7 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-black uppercase text-slate-600 transition hover:border-red-200 hover:bg-red-50/70 hover:text-red-700"
                      @click.stop="selectRecentHistoryWeeks(4)"
                    >
                      Últimas 4
                    </button>
                    <button
                      class="h-7 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-black uppercase text-slate-600 transition hover:border-red-200 hover:bg-red-50/70 hover:text-red-700"
                      @click.stop="clearHistoryWeeks"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                <div class="max-h-64 overflow-auto p-2 scrollbar-thin">
                  <button
                    v-for="w in filteredHistoryWeeks"
                    :key="w.key"
                    class="group/week flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition"
                    :class="isHistoryWeekSelected(w.key)
                      ? 'border-red-200 bg-red-50/80'
                      : 'border-transparent bg-white hover:border-red-100 hover:bg-red-50/30'"
                    @click.stop="toggleHistoryWeek(w)"
                  >
                    <span class="flex min-w-0 items-center gap-3">
                      <span
                        class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[10px] transition"
                        :class="isHistoryWeekSelected(w.key)
                          ? 'border-red-600 bg-red-600 text-white'
                          : 'border-slate-200 bg-white text-transparent group-hover/week:border-red-200'"
                      >
                        <i class="fa-solid fa-check"></i>
                      </span>
                      <span class="min-w-0">
                        <span class="block text-xs font-black text-slate-900">Semana {{ w.semana }}</span>
                        <span class="block text-[10px] font-semibold text-slate-500">{{ w.anio }} · {{ w.key }}</span>
                      </span>
                    </span>
                  </button>

                  <div v-if="!filteredHistoryWeeks.length" class="px-3 py-8 text-center">
                    <i class="fa-regular fa-calendar-xmark text-2xl text-slate-300"></i>
                    <p class="mt-2 text-xs font-semibold text-slate-500">Sin semanas para esa búsqueda.</p>
                  </div>
                </div>

                <div class="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-3 py-2">
                  <span class="text-[10px] font-black uppercase text-slate-500">{{ store.historialSelectedWeeks.length }} seleccionada{{ store.historialSelectedWeeks.length === 1 ? '' : 's' }}</span>
                  <button
                    class="inline-flex h-8 items-center gap-1.5 rounded-lg bg-red-600 px-3 text-[10px] font-black uppercase tracking-wider text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="store.historialLoading || !store.historialSelectedWeeks.length"
                    @click.stop="loadHistoryFromSelection(); historyWeekPickerOpen = false"
                  >
                    <i v-if="store.historialLoading" class="fa-solid fa-circle-notch fa-spin"></i>
                    <i v-else class="fa-solid fa-arrow-down-to-bracket"></i>
                    Cargar
                  </button>
                </div>
              </div>
            </div>
            <button
              class="inline-flex h-9 items-center gap-1.5 rounded-lg bg-red-600 px-3 text-[10px] font-black uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="store.historialLoading || !store.historialSelectedWeeks.length"
              @click.stop="loadHistoryFromSelection"
            >
              <i v-if="store.historialLoading" class="fa-solid fa-circle-notch fa-spin"></i>
              <i v-else class="fa-solid fa-clock-rotate-left"></i>
              Cargar historial
            </button>
            <div class="relative h-8 w-full max-w-[260px] sm:w-[240px]">
              <i class="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-300"></i>
              <input
                v-model="store.historialSearch"
                type="text"
                placeholder="Tienda, estado u OC"
                class="h-full w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-8 text-xs font-semibold text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
              />
              <button
                v-if="store.historialSearch"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 transition-colors hover:text-slate-500"
                @click.stop="store.historialSearch = ''"
              >
                <i class="fa-solid fa-xmark text-[11px]"></i>
              </button>
            </div>
          </div>
        </div>
        
        <div class="flex flex-wrap items-center justify-end gap-2">
          <!-- Controles Tiendas -->
          <div class="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm text-[10px] font-bold overflow-hidden">
              <span class="px-2.5 h-8 bg-slate-50 text-slate-500 border-r border-slate-200 flex items-center gap-1.5">
                  <i class="fa-solid fa-store text-slate-400"></i> Tiendas
              </span>
              <button @click="store.expandAll()" class="w-8 h-8 text-slate-500 hover:bg-brand-50 hover:text-brand-600 transition-colors border-r border-slate-200" title="Expandir todas las tiendas">
                  <i class="fa-solid fa-chevron-down"></i>
              </button>
              <button @click="store.collapseAll()" class="w-8 h-8 text-slate-500 hover:bg-slate-50 hover:text-rose-600 transition-colors" title="Contraer todas las tiendas">
                  <i class="fa-solid fa-chevron-up"></i>
              </button>
              
          </div>

          <!-- Controles OCs -->
          <div class="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm text-[10px] font-bold overflow-hidden">
              <span class="px-2.5 h-8 bg-slate-50 text-slate-500 border-r border-slate-200 flex items-center gap-1.5">
                  <i class="fa-solid fa-file-invoice text-slate-400"></i> OCs
              </span>
              <button @click="expandAllOCsLocal" class="w-8 h-8 text-slate-500 hover:bg-brand-50 hover:text-brand-600 transition-colors border-r border-slate-200" title="Expandir todas las OCs">
                  <i class="fa-solid fa-chevron-down"></i>
              </button>
              <button @click="collapseAllOCsLocal" class="w-8 h-8 text-slate-500 hover:bg-slate-50 hover:text-rose-600 transition-colors" title="Contraer todas las OCs">
                  <i class="fa-solid fa-chevron-up"></i>
              </button>
          </div>
        </div>
      </div>

      <!-- ── Contenedor desplazable ── -->
      <div class="flex-1 min-h-0 overflow-auto scrollbar-thin">

        <!-- ── Loading Historial ── -->
        <div
          v-if="currentTab === 'historial' && store.historialLoading"
          class="flex flex-col items-center justify-center gap-3 text-slate-400 py-16"
        >
          <i class="fa-solid fa-circle-notch fa-spin text-2xl text-brand-400"></i>
          <p class="text-sm font-medium">Cargando historial de órdenes…</p>
        </div>

        <!-- ── Historial sin carga inicial ── -->
        <div
          v-else-if="currentTab === 'historial' && !store.historialLoaded"
          class="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center text-slate-400"
        >
          <div class="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-300">
            <i class="fa-solid fa-clock-rotate-left text-xl"></i>
          </div>
          <p class="text-sm font-bold text-slate-600">Selecciona una o más semanas para cargar historial.</p>
          <p class="max-w-md text-xs font-medium text-slate-400">
            La pestaña no carga datos por defecto para evitar consultas pesadas. El historial sólo mostrará OC aprobadas o cerradas.
          </p>
          <p v-if="store.historialError" class="text-xs font-bold text-rose-500">{{ store.historialError }}</p>
        </div>

        <!-- ── Historial sin resultados ── -->
        <div
          v-else-if="currentTab === 'historial' && historialStoreGroups.length === 0"
          class="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center text-slate-400"
        >
          <i class="fa-solid fa-folder-open text-4xl text-slate-300"></i>
          <p class="text-sm font-bold text-slate-600">No hay órdenes históricas para la selección actual.</p>
          <p class="text-xs text-slate-400">Ajusta semanas o búsqueda. Sólo se consideran estados aprobado y cerrado.</p>
        </div>

        <!-- ── Vista dedicada Historial ── -->
        <div v-else-if="currentTab === 'historial'" class="min-h-full bg-slate-50/60 p-4">
          <div class="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div class="rounded-lg border border-brand-100 bg-white px-4 py-3 shadow-sm">
              <p class="text-[9px] font-black uppercase tracking-wider text-brand-500">Tiendas</p>
              <p class="mt-1 text-xl font-black text-slate-800">{{ historialSummary.tiendas }}</p>
            </div>
            <div class="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p class="text-[9px] font-black uppercase tracking-wider text-slate-500">OC</p>
              <p class="mt-1 text-xl font-black text-slate-800">{{ historialSummary.ocs }}</p>
            </div>
            <div class="rounded-lg border border-emerald-100 bg-white px-4 py-3 shadow-sm">
              <p class="text-[9px] font-black uppercase tracking-wider text-emerald-600">SKUs</p>
              <p class="mt-1 text-xl font-black text-slate-800">{{ historialSummary.skus }}</p>
            </div>
          </div>

          <div class="space-y-3">
            <section
              v-for="tienda in historialStoreGroups"
              :key="tienda.id_cliente"
              class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
            >
              <button
                class="flex w-full items-center justify-between gap-4 border-l-4 border-l-brand-600 bg-white px-4 py-3 text-left transition-colors hover:bg-slate-50"
                @click="store.toggleStore(tienda.id_cliente)"
              >
                <div class="flex min-w-0 items-center gap-3">
                  <i
                    class="fa-solid fa-chevron-right text-[11px] text-slate-300 transition-transform"
                    :class="store.expandedStores[tienda.id_cliente] ? 'rotate-90 text-brand-500' : ''"
                  ></i>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-black text-slate-800">{{ tienda.nombre_tienda }}</p>
                    <p class="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-600">{{ tienda.jefatura }}</p>
                  </div>
                </div>
                <div class="flex shrink-0 flex-wrap justify-end gap-2">
                  <span
                    v-for="state in tienda.states"
                    :key="state"
                    class="rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider"
                    :class="estadoBadge(state).cls"
                  >
                    {{ estadoBadge(state).label }}
                  </span>
                  <span class="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">{{ tienda.ocCount }} OC</span>
                  <span class="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">{{ tienda.skus.length }} SKU</span>
                </div>
              </button>

              <div v-if="store.expandedStores[tienda.id_cliente]" class="border-t border-slate-100 bg-slate-50/60 p-3">
                <div
                  v-for="week in tienda.weeks"
                  :key="week.key"
                  class="mb-3 overflow-hidden rounded-lg border border-slate-200 bg-white last:mb-0"
                >
                  <div
                    v-if="showHistoryWeekGroups"
                    class="flex items-center justify-between border-b border-slate-100 bg-slate-100/70 px-3 py-2"
                  >
                    <div class="flex items-center gap-2">
                      <i class="fa-regular fa-calendar text-slate-400 text-[11px]"></i>
                      <span class="text-[10px] font-black uppercase tracking-wider text-slate-700">{{ week.label }}</span>
                    </div>
                    <span class="text-[10px] font-bold text-slate-500">{{ week.skus.length }} SKU</span>
                  </div>

                  <div v-if="groupByOC" class="divide-y divide-slate-100">
                    <div v-for="oc in week.ocs" :key="oc.group_id" class="border-l-4" :class="isZ8(oc.num_pedido) ? 'border-l-purple-500 bg-purple-50/25' : 'border-l-slate-200 bg-white'">
                      <div class="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                        <div class="flex min-w-0 flex-wrap items-center gap-2">
                          <span class="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-700">
                            <i class="fa-solid fa-file-invoice text-slate-400"></i>
                            {{ oc.num_pedido || 'Sin número' }}
                          </span>
                          <span
                            class="rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider"
                            :class="estadoBadge(oc.estado_oc).cls"
                          >
                            {{ estadoBadge(oc.estado_oc).label }}
                          </span>
                          <span v-if="oc.fec_pedido_cadena" class="text-[10px] font-bold text-slate-400">{{ formatShortDate(oc.fec_pedido_cadena) }}</span>
                        </div>
                        <div class="flex shrink-0 gap-3 text-[10px] font-bold text-slate-500">
                          <span>{{ oc.skus.length }} SKU</span>
                          <span>Central {{ n(oc.cant_pedida_total, 0) }}</span>
                        </div>
                      </div>
                      <div class="divide-y divide-slate-100 border-t border-slate-100 bg-white">
                        <div
                          v-for="(sku, idx) in oc.skus"
                          :key="sku.sku_muliix ? `${oc.group_id}_${sku.sku_muliix}` : `${oc.group_id}_${idx}`"
                          class="grid grid-cols-1 gap-2 px-4 py-2 text-[11px] md:grid-cols-[minmax(0,1fr)_110px_90px_90px]"
                        >
                          <button class="min-w-0 text-left font-semibold text-slate-700 hover:text-brand-700" @click.stop="openHistorialProductPanel(tienda, sku)">
                            <span class="block truncate">{{ sku.sku_nombre }}</span>
                            <span class="mt-0.5 block truncate font-mono text-[9px] text-slate-400">{{ sku.sku_cadena || sku.upc_cadena || '—' }}</span>
                          </button>
                          <span class="font-mono text-slate-500">{{ sku.upc_cadena || '—' }}</span>
                          <span class="text-right font-black text-slate-700">Ped. {{ n(sku.cant_pedida, 0) }}</span>
                          <span class="text-right font-black" :class="fillClass(calcularFillRateDinamico(sku))">
                            {{ calcularFillRateDinamico(sku) != null ? (calcularFillRateDinamico(sku)! * 100).toFixed(0) + '%' : '—' }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-else class="divide-y divide-slate-100 bg-white">
                    <div
                      v-for="(sku, idx) in week.skus"
                      :key="sku.sku_muliix ? `${week.key}_${sku.sku_muliix}` : `${week.key}_${idx}`"
                      class="grid grid-cols-1 gap-2 border-l-4 px-3 py-2 text-[11px] md:grid-cols-[170px_minmax(0,1fr)_90px_90px]"
                      :class="isZ8(sku.num_pedido) ? 'border-l-purple-500 bg-purple-50/20' : 'border-l-slate-200'"
                    >
                      <div class="flex min-w-0 flex-wrap items-center gap-2">
                        <span class="rounded-md bg-slate-100 px-2 py-0.5 font-black text-slate-700">{{ sku.num_pedido || 'Sin OC' }}</span>
                        <span class="rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider" :class="estadoBadge(sku.estado_oc).cls">
                          {{ estadoBadge(sku.estado_oc).label }}
                        </span>
                      </div>
                      <button class="min-w-0 text-left font-semibold text-slate-700 hover:text-brand-700" @click.stop="openHistorialProductPanel(tienda, sku)">
                        <span class="block truncate">{{ sku.sku_nombre }}</span>
                        <span class="mt-0.5 block truncate font-mono text-[9px] text-slate-400">{{ sku.sku_cadena || sku.upc_cadena || '—' }}</span>
                      </button>
                      <span class="text-right font-black text-slate-700">Ped. {{ n(sku.cant_pedida, 0) }}</span>
                      <span class="text-right font-black" :class="fillClass(calcularFillRateDinamico(sku))">
                        {{ calcularFillRateDinamico(sku) != null ? (calcularFillRateDinamico(sku)! * 100).toFixed(0) + '%' : '—' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
        
        <!-- ── Vista de Tabla ── -->
        <table
          v-else-if="store.viewMode === 'table'"
          class="w-full text-left border-collapse table-fixed transition-all duration-300"
          :class="showAdjustmentColumn ? 'min-w-[1180px]' : 'min-w-[1080px]'"
        >
          <colgroup>
            <col style="width: 26%" />
            <col style="width: 8%" />
            <col style="width: 8%" />
            <col style="width: 9%" />
            <col style="width: 5%" />
            <col style="width: 6.5%" />
            <col style="width: 9%" />
            <col v-if="showAdjustmentColumn" style="width: 8.5%" />
            <col style="width: 8%" />
            <col style="width: 10.5%" />
          </colgroup>

          <!-- Cabecera fija: NIVEL 1 -->
          <thead class="sticky top-0 z-20 shadow-sm ring-1 ring-slate-200">
            <tr class="text-[9px] xl:text-[10px] uppercase tracking-wider text-slate-500 bg-slate-100/80 backdrop-blur-sm border-b border-slate-200 border-l-[6px] border-l-transparent">
              <th class="px-4 py-3 font-bold">Tienda / SKU</th>
              <th class="px-2.5 py-3 font-bold whitespace-nowrap">UPC</th>
              <th class="px-2.5 py-3 font-bold text-right whitespace-nowrap">Inv.<br>Act. (pz)</th>
              <th class="px-2.5 py-3 font-bold text-right whitespace-nowrap">Sellout Prom.<br>(pz)</th>
              <th class="px-2 py-3 font-bold text-right whitespace-nowrap">Crit.<br>(S.)</th>
              <th class="px-2 py-3 font-bold text-right whitespace-nowrap">Cob.<br>(S.)</th>
              <th class="px-2.5 py-3 font-bold text-right text-amber-700 bg-amber-50 border-x border-amber-100 whitespace-nowrap">Pedido<br>Sugerido</th>
              <th v-if="showAdjustmentColumn" class="px-2.5 py-3 font-bold text-center whitespace-nowrap">Ajuste</th>
              <th class="px-2.5 py-3 font-bold text-right whitespace-nowrap">Centralizado</th>
              <th class="px-2.5 py-3 font-bold text-right whitespace-nowrap">Fill Rate</th>
            </tr>
          </thead>

          <tbody class="text-[11px] xl:text-xs">

            <!-- ══ SECCIÓN POR DÍA ══ -->
            <template v-for="dia in filteredDias" :key="dia.dia_num">

              <!-- NIVEL 2: DÍA — Contenedor sutil pero distinguible -->
              <tr
                class="cursor-pointer select-none group bg-slate-100/70 border-y border-slate-200 hover:bg-slate-200/50 transition-colors"
                @click="toggleDay(dia.dia_num)"
              >
                <td :colspan="tableColumnCount" class="px-4 py-2.5">
                  <div class="flex items-center gap-3">
                    <i
                      class="fa-solid text-slate-400 text-[11px] transition-transform duration-200 group-hover:text-slate-600"
                      :class="collapsedDays[dia.dia_num] ? 'fa-chevron-right' : 'fa-chevron-down'"
                    ></i>
                    <span class="text-[11px] font-bold text-slate-700 uppercase tracking-widest">{{ dia.dia_nombre }}</span>
                    <span class="text-[10px] text-slate-500 font-medium ml-2 border-l border-slate-300 pl-3">
                      {{ dia.tiendas.length }} tienda{{ dia.tiendas.length !== 1 ? 's' : '' }}
                      ·
                      {{ dia.tiendas.reduce((a, t) => a + (t.skus || []).filter(s => s.pedido_sugerido_pz_red !== 0 || !isZ8(s.num_pedido) || showZeroZ8).length, 0) }} SKUs
                    </span>
                  </div>
                </td>
              </tr>

              <!-- Tiendas del día -->
              <template v-if="!collapsedDays[dia.dia_num]">
                <template v-for="tienda in dia.tiendas" :key="tienda.id_cliente">

                  <!-- NIVEL 3: TIENDA — Fondo blanco, separación clara -->
                  <tr
                    class="cursor-pointer transition-colors relative"
                    :class="storeRowBgClass(!!store.expandedStores[tienda.id_cliente])"
                    @click="store.toggleStore(tienda.id_cliente)"
                  >
                    <!-- Tienda -->
                    <td class="px-4 py-3 border-l-[6px] border-l-brand-600" colspan="2">
                      <div class="flex items-start gap-2.5 pl-1">
                        <i
                          class="fa-solid fa-chevron-right text-slate-300 text-[10px] transition-transform duration-200 shrink-0 mt-1"
                          :class="[store.expandedStores[tienda.id_cliente] ? 'rotate-90 text-brand-500' : 'group-hover:text-slate-400']"
                        ></i>
                        <div class="min-w-0">
                          <div class="flex items-center gap-2 min-w-0">
                            <p class="font-bold text-slate-800 truncate leading-tight">{{ tienda.nombre_tienda }}</p>
                            <div
                              v-if="currentTab === 'centralizados' && storeVisibleStatusBadge(tienda.skus) && getVisibleEditableOCNumbers(tienda.skus).length"
                              class="relative shrink-0"
                            >
                              <button
                                class="font-bold px-1.5 py-0.5 rounded-md text-[9px] border uppercase cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                :class="[
                                  storeVisibleStatusBadge(tienda.skus)!.cls,
                                  openStatusOC === storeStatusKey(tienda.id_cliente) ? 'ring-2 ring-brand-400 ring-offset-1' : ''
                                ]"
                                :disabled="submittingOC === storeStatusKey(tienda.id_cliente)"
                                title="Cambiar estado de las OC visibles de esta tienda"
                                @click.stop="toggleStatusOC(storeStatusKey(tienda.id_cliente))"
                              >
                                <i v-if="submittingOC === storeStatusKey(tienda.id_cliente)" class="fa-solid fa-circle-notch fa-spin mr-1"></i>
                                {{ storeVisibleStatusBadge(tienda.skus)!.label }}
                                <span class="ml-1 text-[8px] opacity-70">({{ getVisibleEditableOCNumbers(tienda.skus).length }} OC)</span>
                                <i class="fa-solid fa-chevron-down ml-1 text-[8px] opacity-70"></i>
                              </button>

                              <div
                                v-if="openStatusOC === storeStatusKey(tienda.id_cliente)"
                                class="absolute left-0 top-full z-50 mt-1 flex min-w-[180px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white text-[10px] font-semibold shadow-lg"
                                @click.stop
                              >
                                <button
                                  class="px-3 py-2 text-left text-amber-700 transition-colors hover:bg-amber-50 border-b border-slate-50"
                                  @click.stop="changeStoreVisibleOCStatus(tienda, 'borrador')"
                                >
                                  <i class="fa-solid fa-file-pen mr-2 opacity-70"></i>Marcar visibles como borrador
                                </button>
                                <button
                                  class="flex items-center gap-1.5 px-3 py-2 text-left text-indigo-700 transition-colors hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                  :disabled="submittingOC === storeStatusKey(tienda.id_cliente)"
                                  @click.stop="changeStoreVisibleOCStatus(tienda, 'revision')"
                                >
                                  <i v-if="submittingOC === storeStatusKey(tienda.id_cliente)" class="fa-solid fa-circle-notch fa-spin text-[10px]"></i>
                                  <i v-else class="fa-solid fa-paper-plane mr-1 opacity-70"></i>
                                  Enviar visibles a revision
                                </button>
                              </div>
                            </div>
                          </div>
                          <p class="text-[10px] text-brand-600 mt-0.5 font-bold uppercase tracking-wider">
                            {{ tienda.jefatura }}
                          </p>
                        </div>
                      </div>
                    </td>


                    <!-- Inv. Actual (pz) -->
                    <td class="px-2.5 py-3 text-right text-slate-700 text-[11px] cursor-help"
                        :title="n(tienda.resumen.inv_actual_kg, 2) + ' kg totales'">
                      <span class="border-b border-dashed border-slate-300 hover:border-slate-500 transition-colors">{{ n(tienda.resumen.inv_actual_pz, 2) }}</span>
                    </td>

                    <!-- Vta. Prom. Semanal (pz) -->
                    <td class="px-2.5 py-3 text-right text-slate-700 text-[11px] cursor-help"
                        :title="n(tienda.resumen.promedio_sellout_kg, 2) + ' kg totales'">
                      <span class="border-b border-dashed border-slate-300 hover:border-slate-500 transition-colors">{{ n(tienda.resumen.promedio_sellout_pz, 2) }}</span>
                    </td>

                    <!-- Criterio (sem. objetivo) -->
                    <td class="px-2 py-3 text-right text-slate-500 text-[11px]">
                      {{ n(tienda.resumen.semanas_objetivo, 1) }}
                    </td>

                    <!-- Semanas Actuales (cobertura_actual) -->
                    <td
                      class="px-2 py-3 text-right font-bold"
                      :class="cobClass(tienda.resumen.cobertura_actual)"
                    >
                      {{ n(tienda.resumen.cobertura_actual, 2) }}
                    </td>

                    <!-- Pedido Sugerido -->
                    <td class="px-2.5 py-3 text-right font-black text-amber-700 bg-amber-50/50 border-x border-amber-100 text-sm tracking-tight relative">
                      <div class="absolute inset-y-0 left-0 w-[4px] bg-amber-400/30"></div>
                      {{ tienda.resumen.pedido_sugerido_pz_red.toLocaleString('es-MX') }}
                    </td>

                    <!-- Ajuste -->
                    <td v-if="showAdjustmentColumn" class="px-2.5 py-3 text-center">
                      <span class="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-black text-slate-500">
                        Por SKU
                      </span>
                    </td>

                    <!-- Pedido Cadena (cant_pedida de la OC) -->
                    <td class="px-2.5 py-2.5 text-right font-semibold text-slate-700">
                      {{ tienda.resumen.cant_pedida_total.toLocaleString('es-MX') }}
                    </td>


                    <!-- Fill Rate -->
                    <td class="px-2.5 py-2.5 text-right font-semibold" :class="fillClass(tienda.resumen.fill_rate)">
                      {{ tienda.resumen.fill_rate != null ? (tienda.resumen.fill_rate * 100).toFixed(1) + '%' : '—' }}
                    </td>


                  </tr>

                  <!-- ── Filas de SKUs ── -->
                  <template v-if="store.expandedStores[tienda.id_cliente]">

                    <!-- Empty -->
                    <tr v-if="!tienda.skus.length">
                      <td :colspan="tableColumnCount" class="px-8 py-6 bg-slate-50/50 text-slate-500 text-sm text-center border-b border-slate-100">
                        Sin SKUs registrados para esta tienda.
                      </td>
                    </tr>

                    <!-- OC Groups -->
                    <template v-else-if="groupByOC" v-for="ocGroup in groupOCs(tienda.skus)" :key="ocGroup.group_id">
                      
                      <!-- NIVEL 4: OC — Indentado, gris muy sutil -->
                      <tr
                        class="cursor-pointer transition-colors text-[11px] border-b border-slate-200 group/row"
                        :class="[
                          expandedOCGroups[`${tienda.id_cliente}_${ocGroup.group_id}`] === true ? 'bg-slate-100/40' : 'bg-white hover:bg-slate-50/80',
                          isZ8(ocGroup.num_pedido) ? 'bg-purple-50/30' : ''
                        ]"
                        @click="toggleOCGroup(tienda.id_cliente, ocGroup.group_id)"
                      >
                        <!-- Etiqueta OC -->
                        <td colspan="6" class="pl-12 pr-2.5 py-2 text-slate-700 font-semibold border-l-[6px] border-t-[12px] border-t-white"
                            :class="isZ8(ocGroup.num_pedido) ? 'border-l-purple-500 bg-purple-50/20' : 'border-l-brand-300'">
                          <div class="flex items-center flex-wrap gap-2 min-w-0 max-w-4xl">
                            <i
                              class="fa-solid fa-chevron-right text-slate-300 text-[10px] transition-transform duration-200 shrink-0"
                              :class="expandedOCGroups[`${tienda.id_cliente}_${ocGroup.group_id}`] === true ? 'rotate-90 text-slate-500' : 'group-hover/row:text-slate-400'"
                            ></i>
                            <span class="truncate uppercase tracking-wider text-[10px] text-slate-500">Orden de Compra:</span>
                            
                            <!-- Número + fechas compactas en popover -->
                            <span class="relative group/ocnum flex items-center">
                              <span class="text-[12px] font-bold tracking-tight cursor-default" :class="ocGroup.num_pedido ? 'text-slate-800' : 'text-slate-400 italic'">
                                {{ ocGroup.num_pedido || 'Sin número' }}
                              </span>
                              
                              <span v-if="ocGroup.semana_ic" class="ml-1.5 px-1.5 py-0.5 bg-brand-50 text-brand-700 text-[10px] font-bold rounded border border-brand-200" title="Semana del pedido">
                                Sem. {{ ocGroup.semana_ic }}
                              </span>
                              <!-- Popover -->
                              <div
                                v-if="ocGroup.fec_pedido_cadena || ocGroup.fec_fin_embarque"
                                class="absolute left-0 top-full z-30 mt-1.5 hidden group-hover/ocnum:flex flex-col gap-1 bg-white border border-slate-200 text-slate-700 rounded-lg shadow-xl px-3 py-2.5 min-w-[180px] pointer-events-none"
                              >
                                <div v-if="ocGroup.fec_pedido_cadena" class="flex items-center gap-2 text-[10px]">
                                  <i class="fa-regular fa-calendar-check text-slate-400"></i>
                                  <span class="text-slate-500">Pedido Cadena:</span>
                                  <span class="font-mono font-bold text-slate-800">{{ ocGroup.fec_pedido_cadena.slice(0, 10) }}</span>
                                </div>
                                <div v-if="ocGroup.fec_fin_embarque" class="flex items-center gap-2 text-[10px]">
                                  <i class="fa-solid fa-triangle-exclamation text-amber-500"></i>
                                  <span class="text-slate-500">Fin embarque:</span>
                                  <span class="font-mono font-bold text-amber-600">{{ ocGroup.fec_fin_embarque.slice(0, 10) }}</span>
                                </div>
                              </div>
                            </span>

                            <div v-if="ocGroup.fec_pedido_cadena" class="ml-1 relative group/fecpedido">
                              <span
                                class="flex items-center gap-1.5 font-bold px-2 py-0.5 rounded-md text-[10px] bg-slate-100 text-slate-600 border border-slate-200"
                                title="Fecha de pedido oficial de la cadena"
                              >
                                <i class="fa-regular fa-calendar-check text-brand-300"></i>
                                {{ ocGroup.fec_pedido_cadena.slice(0, 10) }}
                              </span>
                            </div>

                            <div v-if="ocGroup.fec_fin_embarque" class="ml-1 relative">
                              <span
                                class="flex items-center gap-1.5 font-bold px-1.5 py-0.5 rounded-md text-[9px] bg-amber-50 text-amber-700 border border-amber-200 cursor-help opacity-80"
                                :title="`Fin embarque: ${ocGroup.fec_fin_embarque.slice(0, 10)}`"
                              >
                                <i class="fa-solid fa-calendar-xmark"></i>
                                {{ ocGroup.fec_fin_embarque.slice(0, 10) }}
                              </span>
                            </div>
                            
                            <span class="bg-slate-100 text-slate-600 border border-slate-200 font-bold px-1.5 py-0.5 rounded-md text-[9px] ml-1">{{ ocGroup.skus.length }} SKUs</span>
                          </div>
                        </td>

                          <!-- Pedido Sugerido SUM -->
                        <td class="px-2.5 py-2 text-right font-bold text-amber-700 bg-amber-50/50 border-x border-amber-100/70 border-t-[12px] border-t-white text-sm tracking-tight">
                          {{ n(ocGroup.pedido_sugerido_pz_red_total, 0) }}
                        </td>

                        <!-- Ajuste SUM -->
                        <td v-if="showAdjustmentColumn" class="px-2.5 py-2 text-center font-bold border-t-[12px] border-t-white">
                          <span class="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-black"
                                :class="ocGroup.skus.reduce((a, s) => a + skuAdjustment(s), 0) === 0 ? 'text-slate-400' : 'text-amber-700 border-amber-200 bg-amber-50'">
                            {{ ocGroup.skus.reduce((a, s) => a + skuAdjustment(s), 0) > 0 ? '+' : '' }}{{ n(ocGroup.skus.reduce((a, s) => a + skuAdjustment(s), 0), 0) }}
                          </span>
                        </td>

                        <!-- Pedido Cadena SUM -->
                        <td class="px-2.5 py-2 text-right font-bold text-slate-800 border-t-[12px] border-t-white">
                          {{ n(ocGroup.cant_pedida_total, 0) }}
                        </td>

                        <td class="px-2.5 py-2 text-center text-slate-400 border-t-[12px] border-t-white">
                          <span class="text-[10px] italic">Detalle en fila inferior</span>
                        </td>
                      </tr>

                      <!-- Children SKU Rows -->
                      <template v-if="expandedOCGroups[`${tienda.id_cliente}_${ocGroup.group_id}`] === true">
                        <!-- NIVEL 5: SKU — Indentación profunda, estilos condicionales mantenidos -->
                        <tr
                          v-for="(sku, skuIdx) in ocGroup.skus"
                          :key="sku.sku_muliix ? sku.sku_muliix : (sku.oc_id + '_' + skuIdx)"
                          class="transition-colors text-[11px] group/row border-l-[6px] border-l-slate-100"
                          :class="[
                            skuRowBgClass(sku),
                            skuIdx === ocGroup.skus.length - 1 ? 'border-b border-b-slate-200' : 'border-b border-b-slate-50'
                          ]"
                        >
                          <!-- Nombre SKU -->
                          <td class="pl-14 pr-2.5 py-2 text-slate-700 font-medium cursor-pointer hover:text-brand-700" :title="sku.sku_nombre" @click.stop="openProductPanel(tienda, sku)">
                            <div class="flex items-center gap-2 min-w-0">
                              <span
                                class="shrink-0 inline-flex text-[9px] font-bold px-1.5 py-0.5 rounded-md border"
                                :class="escenarioCls(sku.escenario, sku.num_pedido)"
                                :title="sku.escenario === 'B' ? 'Pedido recalculado' : ''"
                              >{{ escenarioText(sku.escenario, sku.num_pedido) }}</span>
                              <span class="truncate">{{ sku.sku_nombre }}</span>
                            </div>
                          </td>

                          <!-- UPC -->
                          <td class="px-2.5 py-2 text-slate-500 text-[10px] font-mono truncate">{{ sku.upc_cadena ?? '—' }}</td>

                          <!-- Inv. Actual (pz) -->
                          <td class="px-2.5 py-2 text-right text-slate-700 cursor-help"
                              :title="`${n(sku.inv_actual_kg, 2)} kg (Inv. uni. = ${sku.unidad_inventario} kg/pz)`">
                            <span class="border-b border-dashed border-slate-300">{{ n(sku.inv_actual_pz, 2) }}</span>
                          </td>

                          <!-- Vta. Prom. Semanal (pz) -->
                          <td class="px-2.5 py-2 text-right text-slate-700 relative cursor-pointer group/cell hover:bg-slate-100 transition-colors rounded-lg"
                              @click.stop="toggleSellout(tienda.id_cliente + '_' + sku.sku_cadena)">
                            
                            <div class="cursor-help" :title="`${n(sku.promedio_sellout_kg, 2)} kg (Inv. uni. = ${sku.unidad_inventario} kg/pz)`">
                              <span class="border-b border-dashed border-slate-300 group-hover/cell:text-brand-600 transition-colors">{{ n(sku.promedio_sellout_pz, 2) }}</span>
                            </div>

                            <!-- Popover Historial Sellout -->
                            <div v-if="openSelloutId === (tienda.id_cliente + '_' + sku.sku_cadena)"
                                 class="absolute bottom-full right-0 mb-1.5 z-50 bg-white border border-slate-200 shadow-xl rounded-xl p-3 w-[240px] cursor-default"
                                 @click.stop>
                                <div class="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
                                    <span class="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1.5"><i class="fa-solid fa-chart-line text-brand-500"></i> Histórico Sellout</span>
                                    <button @click.stop="closeSellout" class="text-slate-400 hover:text-rose-500 transition-colors p-1"><i class="fa-solid fa-xmark text-[11px]"></i></button>
                                </div>
                                <table class="w-full text-[10px] text-slate-600 leading-tight">
                                    <thead>
                                        <tr class="text-left text-slate-500 border-b border-slate-100">
                                            <th class="py-1 font-semibold text-center">Semana</th>
                                            <th class="py-1 text-right font-semibold">Peso (kg)</th>
                                            <th class="py-1 text-right font-bold text-brand-700">Cant. (pz)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="s in (sku.sellout_semanas || [])" :key="s.semana" class="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                            <td class="py-1.5 font-semibold text-slate-700 text-center">S{{ s.semana }}</td>
                                            <td class="py-1.5 text-right">{{ n(s.kg, 2) }}</td>
                                            <td class="py-1.5 text-right text-brand-700 font-bold bg-brand-50/50">{{ n(s.kg / (sku.unidad_inventario || 1), 2) }}</td>
                                        </tr>
                                        <tr v-if="!(sku.sellout_semanas && sku.sellout_semanas.length)">
                                            <td colspan="3" class="py-4 text-center text-slate-400">Sin ventas en histórico</td>
                                        </tr>
                                    </tbody>
                                    <tfoot v-if="sku.sellout_semanas && sku.sellout_semanas.length">
                                        <tr class="bg-slate-50 border-t-2 border-slate-200">
                                            <td class="py-2 font-bold text-slate-800 text-center uppercase tracking-widest text-[9px]">Prom.</td>
                                            <td class="py-2 text-right font-bold text-slate-800">{{ n(sku.promedio_sellout_kg, 2) }}</td>
                                            <td class="py-2 text-right font-bold text-brand-700 bg-brand-100/50 rounded-br-lg">{{ n(sku.promedio_sellout_pz, 2) }}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                          </td>

                          <!-- Criterio (sem. objetivo) -->
                          <td class="px-2 py-2 text-right text-slate-500">
                            {{ sku.semanas_objetivo }}
                          </td>

                          <!-- Semanas Actuales (cobertura dinamica) -->
                          <td
                            class="px-2 py-2 text-right font-bold relative"
                            :class="cobClass(calcularCoberturaDinamica(sku))"
                            :title="coberturaStatusTooltip(coberturaStatus(sku), calcularCoberturaDinamica(sku), sku.semanas_objetivo || store.criterio_global || 2.5)"
                          >
                            <span class="flex items-center justify-end gap-1.5">
                              <i v-if="coberturaStatusIcon(coberturaStatus(sku))" :class="coberturaStatusIcon(coberturaStatus(sku))" class="text-[10px] flex-shrink-0"></i>
                              {{ calcularCoberturaDinamica(sku) != null ? calcularCoberturaDinamica(sku)!.toFixed(2) : '—' }}
                            </span>
                          </td>

                          <!-- Pedido Sugerido (editable Excel-style) -->
                          <td class="px-2 py-2 align-middle bg-amber-50/50 border-x border-amber-100/50 relative group/cell">
                            <div class="absolute inset-y-0 left-0 w-[2px] bg-amber-400/20"></div>
                            
                            <div v-if="currentTab === 'centralizados' && editingId === sku.sku_muliix && sku.sku_muliix" class="flex items-center gap-1.5 justify-end h-full">
                              <input
                                v-model.number="editValue"
                                type="number" min="0" :step="sku.pzas_bolsa || 1"
                                class="w-full h-7 rounded-md border border-brand-300 px-2 text-xs text-right font-bold text-slate-800 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all bg-white"
                                autofocus
                                @keyup.enter="confirmEdit(sku, tienda.id_cliente)"
                                @keyup.escape="cancelEdit()"
                              />
                              <div class="flex flex-col gap-0.5">
                                <button class="bg-emerald-500 text-white rounded-md w-6 h-6 flex items-center justify-center hover:bg-emerald-600 shadow-sm transition-colors" @click="confirmEdit(sku, tienda.id_cliente)">
                                  <i :class="saving ? 'fa-solid fa-circle-notch fa-spin text-[10px]' : 'fa-solid fa-check text-[11px]'"></i>
                                </button>
                              </div>
                            </div>
                            <button
                              v-else-if="currentTab === 'centralizados'"
                              class="w-full text-right bg-white border border-slate-200 hover:border-brand-400 hover:shadow-sm rounded-md px-2 py-1 flex items-center justify-between transition-all"
                              :class="{ 'ring-2 ring-emerald-400 border-transparent bg-emerald-50': savedId === sku.sku_muliix }"
                              :title="esSinSellout(sku)
                                ? '⚠️ Sin sellout promedio — producto nuevo o sin histórico. Se usa el pedido cadena como referencia.'
                                : 'Clic para editar cantidad'"
                              @click="startEdit(sku)"
                            >
                              <span class="flex items-center gap-1">
                                <i v-if="esSinSellout(sku)" class="fa-solid fa-seedling text-[10px] text-amber-500" title="Sin sellout promedio"></i>
                                <i v-else class="fa-solid fa-pen text-[10px] text-slate-300 group-hover/cell:text-brand-500 transition-colors"></i>
                              </span>
                              <span class="text-[12px] font-bold text-slate-800" :class="{ 'text-brand-700': sku.pedido_sugerido_pz_red > 0 }">{{ n(sku.pedido_sugerido_pz_red, 0) }}</span>
                            </button>
                            <div v-else class="flex w-full items-center justify-end rounded-md border border-amber-100 bg-white/75 px-2 py-1">
                              <span class="text-[12px] font-black text-amber-700">{{ n(sku.pedido_sugerido_pz_red, 0) }}</span>
                            </div>
                          </td>

                          <!-- Ajuste -->
                          <td v-if="showAdjustmentColumn" class="px-2 py-2 text-center" :title="adjustmentTooltip(tienda.id_cliente, sku)">
                            <div
                              v-if="currentTab === 'revision'"
                              class="mx-auto flex h-8 w-[118px] items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
                            >
                              <button
                                type="button"
                                class="flex h-8 w-8 shrink-0 items-center justify-center text-slate-500 transition hover:bg-slate-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-35"
                                title="Disminuir ajuste"
                                :disabled="adjustingSkuKey === adjustmentKey(tienda.id_cliente, sku) || !canDecreaseAdjustment(sku) || !store.getCachedApprovalIdForSku(tienda.id_cliente, sku)"
                                @click.stop="adjustReviewSku(tienda.id_cliente, sku, -1)"
                              >
                                <i class="fa-solid fa-minus text-[10px]"></i>
                              </button>
                              <span
                                class="flex h-8 min-w-0 flex-1 items-center justify-center border-x border-slate-200 px-2 text-center text-[11px] font-black"
                                :class="skuAdjustment(sku) === 0 ? 'text-slate-400' : 'text-amber-700'"
                              >
                                <i v-if="adjustingSkuKey === adjustmentKey(tienda.id_cliente, sku)" class="fa-solid fa-circle-notch fa-spin text-[10px]"></i>
                                <span v-else>{{ formatAdjustment(sku) }}</span>
                              </span>
                              <button
                                type="button"
                                class="flex h-8 w-8 shrink-0 items-center justify-center text-slate-400 transition disabled:cursor-not-allowed disabled:opacity-35"
                                title="Incremento temporalmente deshabilitado"
                                :disabled="true"
                                @click.stop="adjustReviewSku(tienda.id_cliente, sku, 1)"
                              >
                                <i class="fa-solid fa-plus text-[10px]"></i>
                              </button>
                            </div>
                            <span
                              v-else
                              class="inline-flex min-w-[58px] items-center justify-center rounded-md border px-2 py-1 text-[11px] font-black"
                              :class="skuAdjustment(sku) === 0 ? 'border-slate-200 bg-white text-slate-400' : 'border-amber-200 bg-amber-50 text-amber-700'"
                            >
                              {{ formatAdjustment(sku) }}
                            </span>
                          </td>

                          <!-- Pedido Cadena (cant_pedida) -->
                          <td class="px-2.5 py-2 text-right font-semibold text-slate-800">
                            {{ n(sku.cant_pedida, 0) }}
                          </td>


                          <!-- Fill Rate -->
                          <td
                            class="px-2.5 py-2 text-right font-medium"
                            :class="[fillRateBadge(calcularFillRateDinamico(sku)).bg, fillRateBadge(calcularFillRateDinamico(sku)).text]"
                            :title="fillRateBadge(calcularFillRateDinamico(sku)).tip"
                          >
                            <span class="flex items-center justify-end gap-1.5">
                              <i v-if="fillRateBadge(calcularFillRateDinamico(sku)).icon" :class="fillRateBadge(calcularFillRateDinamico(sku)).icon" class="text-[10px] flex-shrink-0"></i>
                              {{ calcularFillRateDinamico(sku) != null ? (calcularFillRateDinamico(sku)! * 100).toFixed(1) + '%' : '—' }}
                            </span>
                          </td>


                        </tr>
                      </template>

                      <!-- Margin Bottom para el grupo de OC -->
                      <tr class="bg-white border-none"><td :colspan="tableColumnCount" class="py-2.5"></td></tr>

                    </template>

                    <!-- Desagrupado (Plano) -->
                    <template v-else>
                      <tr
                        v-for="(sku, skuIdx) in getFlatVisibleSkus(tienda.skus)"
                        :key="sku.sku_muliix ? sku.sku_muliix : (sku.oc_id + '_' + skuIdx)"
                        class="transition-colors text-[11px] group/row border-l-[6px] border-l-slate-100 border-b border-b-slate-200"
                        :class="[
                          skuRowBgClass(sku),
                          isZ8(sku.num_pedido) ? 'bg-purple-50/10' : ''
                        ]"
                      >
                        <!-- Nombre SKU + OC Badges -->
                          <td class="pl-5 pr-2.5 py-2 text-slate-700 font-medium cursor-pointer hover:text-brand-700" :title="sku.sku_nombre" @click.stop="openProductPanel(tienda, sku)">
                          <div class="flex flex-col gap-1.5 min-w-0">
                            <div class="flex items-center gap-2">
                              <span
                                class="shrink-0 inline-flex text-[9px] font-bold px-1.5 py-0.5 rounded-md border"
                                :class="escenarioCls(sku.escenario, sku.num_pedido)"
                                :title="sku.escenario === 'B' ? 'Pedido recalculado' : ''"
                              >{{ escenarioText(sku.escenario, sku.num_pedido) }}</span>
                              <span class="truncate">{{ sku.sku_nombre }}</span>
                            </div>
                            
                            <!-- Badges OC -->
                            <div class="flex items-center gap-1.5 pl-7 opacity-90">
                              <span 
                                class="flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold tracking-tight bg-slate-100 text-slate-600 border-slate-200"
                              >
                                <i class="fa-solid fa-file-invoice text-slate-400"></i>
                                {{ sku.num_pedido || 'Sin número' }}
                              </span>
                              <span 
                                v-if="sku.semana_ic" 
                                class="px-1.5 py-0.5 text-[9px] font-bold rounded border bg-brand-50 text-brand-700 border-brand-200"
                              >
                                Sem. {{ sku.semana_ic }}
                              </span>
                              <span 
                                v-if="sku.fec_pedido_cadena" 
                                class="flex items-center gap-1 font-bold px-1.5 py-0.5 rounded-md text-[9px] border bg-slate-50 text-slate-500 border-slate-200"
                              >
                                <i class="fa-regular fa-calendar-check text-brand-300"></i>
                                {{ sku.fec_pedido_cadena.slice(0, 10) }}
                              </span>
                            </div>
                          </div>
                        </td>

                        <!-- UPC -->
                        <td class="px-2.5 py-2 text-slate-500 text-[10px] font-mono truncate">{{ sku.upc_cadena ?? '—' }}</td>

                        <!-- Inv. Actual (pz) -->
                        <td class="px-2.5 py-2 text-right text-slate-700 cursor-help"
                            :title="`${n(sku.inv_actual_kg, 2)} kg (Inv. uni. = ${sku.unidad_inventario} kg/pz)`">
                          <span class="border-b border-dashed border-slate-300">{{ n(sku.inv_actual_pz, 2) }}</span>
                        </td>

                        <!-- Vta. Prom. Semanal (pz) -->
                        <td class="px-2.5 py-2 text-right text-slate-700 relative cursor-pointer group/cell hover:bg-slate-100 transition-colors rounded-lg"
                            @click.stop="toggleSellout(tienda.id_cliente + '_' + sku.sku_cadena)">
                          
                          <div class="cursor-help" :title="`${n(sku.promedio_sellout_kg, 2)} kg (Inv. uni. = ${sku.unidad_inventario} kg/pz)`">
                            <span class="border-b border-dashed border-slate-300 group-hover/cell:text-brand-600 transition-colors">{{ n(sku.promedio_sellout_pz, 2) }}</span>
                          </div>

                          <!-- Popover Historial Sellout -->
                          <div v-if="openSelloutId === (tienda.id_cliente + '_' + sku.sku_cadena)"
                               class="absolute bottom-full right-0 mb-1.5 z-50 bg-white border border-slate-200 shadow-xl rounded-xl p-3 w-[240px] cursor-default"
                               @click.stop>
                              <div class="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
                                  <span class="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1.5"><i class="fa-solid fa-chart-line text-brand-500"></i> Histórico Sellout</span>
                                  <button @click.stop="closeSellout" class="text-slate-400 hover:text-rose-500 transition-colors p-1"><i class="fa-solid fa-xmark text-[11px]"></i></button>
                              </div>
                              <table class="w-full text-[10px] text-slate-600 leading-tight">
                                  <thead>
                                      <tr class="text-left text-slate-500 border-b border-slate-100">
                                          <th class="py-1 font-semibold text-center">Semana</th>
                                          <th class="py-1 text-right font-semibold">Peso (kg)</th>
                                          <th class="py-1 text-right font-bold text-brand-700">Cant. (pz)</th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      <tr v-for="s in (sku.sellout_semanas || [])" :key="s.semana" class="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                          <td class="py-1.5 font-semibold text-slate-700 text-center">S{{ s.semana }}</td>
                                          <td class="py-1.5 text-right">{{ n(s.kg, 2) }}</td>
                                          <td class="py-1.5 text-right text-brand-700 font-bold bg-brand-50/50">{{ n(s.kg / (sku.unidad_inventario || 1), 2) }}</td>
                                      </tr>
                                      <tr v-if="!(sku.sellout_semanas && sku.sellout_semanas.length)">
                                          <td colspan="3" class="py-4 text-center text-slate-400">Sin ventas en histórico</td>
                                      </tr>
                                  </tbody>
                                  <tfoot v-if="sku.sellout_semanas && sku.sellout_semanas.length">
                                      <tr class="bg-slate-50 border-t-2 border-slate-200">
                                          <td class="py-2 font-bold text-slate-800 text-center uppercase tracking-widest text-[9px]">Prom.</td>
                                          <td class="py-2 text-right font-bold text-slate-800">{{ n(sku.promedio_sellout_kg, 2) }}</td>
                                          <td class="py-2 text-right font-bold text-brand-700 bg-brand-100/50 rounded-br-lg">{{ n(sku.promedio_sellout_pz, 2) }}</td>
                                      </tr>
                                  </tfoot>
                              </table>
                          </div>
                        </td>

                        <!-- Criterio (sem. objetivo) -->
                        <td class="px-2 py-2 text-right text-slate-500">
                          {{ sku.semanas_objetivo }}
                        </td>

                        <!-- Semanas Actuales (cobertura dinamica) -->
                        <td
                          class="px-2 py-2 text-right font-bold relative"
                          :class="cobClass(calcularCoberturaDinamica(sku))"
                          :title="coberturaStatusTooltip(coberturaStatus(sku), calcularCoberturaDinamica(sku), sku.semanas_objetivo || store.criterio_global || 2.5)"
                        >
                          <span class="flex items-center justify-end gap-1.5">
                            <i v-if="coberturaStatusIcon(coberturaStatus(sku))" :class="coberturaStatusIcon(coberturaStatus(sku))" class="text-[10px] flex-shrink-0"></i>
                            {{ calcularCoberturaDinamica(sku) != null ? calcularCoberturaDinamica(sku)!.toFixed(2) : '—' }}
                          </span>
                        </td>

                        <!-- Pedido Sugerido (editable Excel-style) -->
                        <td class="px-2 py-2 align-middle bg-amber-50/50 border-x border-amber-100/50 relative group/cell">
                          <div class="absolute inset-y-0 left-0 w-[2px] bg-amber-400/20"></div>
                          
                          <div v-if="currentTab === 'centralizados' && editingId === sku.sku_muliix && sku.sku_muliix" class="flex items-center gap-1.5 justify-end h-full">
                            <input
                              v-model.number="editValue"
                              type="number" min="0" :step="sku.pzas_bolsa || 1"
                              class="w-full h-7 rounded-md border border-brand-300 px-2 text-xs text-right font-bold text-slate-800 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all bg-white"
                              autofocus
                              @keyup.enter="confirmEdit(sku, tienda.id_cliente)"
                              @keyup.escape="cancelEdit()"
                            />
                            <div class="flex flex-col gap-0.5">
                              <button class="bg-emerald-500 text-white rounded-md w-6 h-6 flex items-center justify-center hover:bg-emerald-600 shadow-sm transition-colors" @click="confirmEdit(sku, tienda.id_cliente)">
                                <i :class="saving ? 'fa-solid fa-circle-notch fa-spin text-[10px]' : 'fa-solid fa-check text-[11px]'"></i>
                              </button>
                            </div>
                          </div>
                          <button
                            v-else-if="currentTab === 'centralizados'"
                            class="w-full text-right bg-white border border-slate-200 hover:border-brand-400 hover:shadow-sm rounded-md px-2 py-1 flex items-center justify-between transition-all"
                            :class="{ 'ring-2 ring-emerald-400 border-transparent bg-emerald-50': savedId === sku.sku_muliix }"
                            :title="esSinSellout(sku)
                              ? '⚠️ Sin sellout promedio — producto nuevo o sin histórico. Se usa el pedido cadena como referencia.'
                              : 'Clic para editar cantidad'"
                            @click="startEdit(sku)"
                          >
                            <span class="flex items-center gap-1">
                              <i v-if="esSinSellout(sku)" class="fa-solid fa-seedling text-[10px] text-amber-500" title="Sin sellout promedio"></i>
                              <i v-else class="fa-solid fa-pen text-[10px] text-slate-300 group-hover/cell:text-brand-500 transition-colors"></i>
                            </span>
                            <span class="text-[12px] font-bold text-slate-800" :class="{ 'text-brand-700': sku.pedido_sugerido_pz_red > 0 }">{{ n(sku.pedido_sugerido_pz_red, 0) }}</span>
                          </button>
                          <div v-else class="flex w-full items-center justify-end rounded-md border border-amber-100 bg-white/75 px-2 py-1">
                            <span class="text-[12px] font-black text-amber-700">{{ n(sku.pedido_sugerido_pz_red, 0) }}</span>
                          </div>
                        </td>

                        <!-- Ajuste -->
                        <td v-if="showAdjustmentColumn" class="px-2 py-2 text-center" :title="adjustmentTooltip(tienda.id_cliente, sku)">
                          <div
                            v-if="currentTab === 'revision'"
                            class="mx-auto flex h-8 w-[118px] items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
                          >
                            <button
                              type="button"
                              class="flex h-8 w-8 shrink-0 items-center justify-center text-slate-500 transition hover:bg-slate-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-35"
                              title="Disminuir ajuste"
                              :disabled="adjustingSkuKey === adjustmentKey(tienda.id_cliente, sku) || !canDecreaseAdjustment(sku) || !store.getCachedApprovalIdForSku(tienda.id_cliente, sku)"
                              @click.stop="adjustReviewSku(tienda.id_cliente, sku, -1)"
                            >
                              <i class="fa-solid fa-minus text-[10px]"></i>
                            </button>
                            <span
                              class="flex h-8 min-w-0 flex-1 items-center justify-center border-x border-slate-200 px-2 text-center text-[11px] font-black"
                              :class="skuAdjustment(sku) === 0 ? 'text-slate-400' : 'text-amber-700'"
                            >
                              <i v-if="adjustingSkuKey === adjustmentKey(tienda.id_cliente, sku)" class="fa-solid fa-circle-notch fa-spin text-[10px]"></i>
                              <span v-else>{{ formatAdjustment(sku) }}</span>
                            </span>
                            <button
                              type="button"
                              class="flex h-8 w-8 shrink-0 items-center justify-center text-slate-400 transition disabled:cursor-not-allowed disabled:opacity-35"
                              title="Incremento temporalmente deshabilitado"
                              :disabled="true"
                              @click.stop="adjustReviewSku(tienda.id_cliente, sku, 1)"
                            >
                              <i class="fa-solid fa-plus text-[10px]"></i>
                            </button>
                          </div>
                          <span
                            v-else
                            class="inline-flex min-w-[58px] items-center justify-center rounded-md border px-2 py-1 text-[11px] font-black"
                            :class="skuAdjustment(sku) === 0 ? 'border-slate-200 bg-white text-slate-400' : 'border-amber-200 bg-amber-50 text-amber-700'"
                          >
                            {{ formatAdjustment(sku) }}
                          </span>
                        </td>

                        <!-- Pedido Cadena (cant_pedida) -->
                        <td class="px-2.5 py-2 text-right font-semibold text-slate-800">
                          {{ n(sku.cant_pedida, 0) }}
                        </td>

                        <!-- Fill Rate -->
                        <td
                          class="px-2.5 py-2 text-right font-medium"
                          :class="[fillRateBadge(calcularFillRateDinamico(sku)).bg, fillRateBadge(calcularFillRateDinamico(sku)).text]"
                          :title="fillRateBadge(calcularFillRateDinamico(sku)).tip"
                        >
                          <span class="flex items-center justify-end gap-1.5">
                            <i v-if="fillRateBadge(calcularFillRateDinamico(sku)).icon" :class="fillRateBadge(calcularFillRateDinamico(sku)).icon" class="text-[10px] flex-shrink-0"></i>
                            {{ calcularFillRateDinamico(sku) != null ? (calcularFillRateDinamico(sku)! * 100).toFixed(1) + '%' : '—' }}
                          </span>
                        </td>
                      </tr>
                    </template>

                  </template>

                </template>
              </template>

            </template>
          </tbody>
        </table>

        <!-- ── Vista de Tarjetas ── -->
        <div v-else class="p-5 space-y-10 bg-slate-50/50 min-h-full">
            <div v-for="dia in filteredDias" :key="dia.dia_num" class="space-y-5">
                <!-- Título del día -->
                <div class="flex items-center gap-3 px-1 cursor-pointer select-none group/day" @click="toggleDay(dia.dia_num)">
                    <div class="flex items-center gap-2.5">
                        <i class="fa-solid text-slate-400 text-xs transition-transform duration-300" 
                           :class="collapsedDays[dia.dia_num] ? 'fa-chevron-right' : 'fa-chevron-down rotate-0'"></i>
                        <div class="flex flex-col">
                            <span class="text-[8px] font-black text-brand-500 uppercase tracking-[0.3em] mb-0.5">Calendario de Atención</span>
                            <h2 class="text-sm font-black text-slate-800 uppercase tracking-tight">{{ dia.dia_nombre }}</h2>
                        </div>
                    </div>
                    <div class="h-px flex-1 bg-gradient-to-r from-slate-300 to-transparent"></div>
                    <span class="text-[9px] text-slate-400 font-bold uppercase">{{ dia.tiendas.length }} Tienda{{ dia.tiendas.length !== 1 ? 's' : '' }}</span>
                </div>

                <!-- Listado de tarjetas (Una por fila) -->
                <div v-if="!collapsedDays[dia.dia_num]" class="flex flex-col gap-6 max-w-[1600px] mx-auto transition-all">
                    <div v-for="tienda in dia.tiendas" :key="tienda.id_cliente" 
                         class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-brand-200 transition-all duration-300 flex flex-col group/card relative overflow-hidden"
                         :class="{ 'z-50': isAnySelloutOpenInTienda(tienda.id_cliente) }"
                    >
                        <!-- Cabecera Tarjeta (Layout Horizontal) -->
                        <div class="p-5 border-b border-slate-100 bg-gradient-to-br from-white to-slate-50/50 flex flex-col lg:flex-row lg:items-center gap-6 rounded-t-2xl cursor-pointer"
                             @click="store.toggleStore(tienda.id_cliente)">
                            
                            <!-- Info Tienda -->
                            <div class="min-w-0 flex-1">
                                <div class="flex items-center gap-3 mb-1.5">
                                    <div class="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 shrink-0 shadow-sm border border-brand-100">
                                        <i class="fa-solid fa-store text-base"></i>
                                    </div>
                                    <div class="min-w-0">
                                        <h3 class="font-black text-slate-800 text-lg leading-tight truncate group-hover/card:text-brand-700 transition-colors">{{ tienda.nombre_tienda }}</h3>
                                        <p class="text-[10px] text-slate-500 font-bold flex items-center gap-1.5 mt-0.5 uppercase tracking-wide">
                                            <i class="fa-solid fa-location-dot text-slate-300"></i>
                                            {{ tienda.jefatura }}
                                        </p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200 uppercase">
                                       <i class="fa-solid fa-boxes-stacked mr-1 opacity-70"></i> {{ tienda.total_skus }} SKUs
                                    </span>
                                </div>
                            </div>

                            <!-- KPIs (Fila Horizontal) -->
                            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                                <div class="bg-white/80 border border-slate-100 rounded-xl p-2.5 shadow-sm min-w-[100px] hover:border-slate-200 transition-colors">
                                    <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Inv. Actual</p>
                                    <p class="text-[13px] font-black text-slate-700">{{ n(tienda.resumen.inv_actual_pz, 0) }} <span class="text-[9px] text-slate-400 font-medium">pz</span></p>
                                </div>
                                <div class="bg-white/80 border border-slate-100 rounded-xl p-2.5 shadow-sm min-w-[100px] hover:border-slate-200 transition-colors">
                                    <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Vta. Prom</p>
                                    <p class="text-[13px] font-black text-slate-700">{{ n(tienda.resumen.promedio_sellout_pz, 1) }} <span class="text-[9px] text-slate-400 font-medium">pz</span></p>
                                </div>
                                <div class="bg-amber-50/50 border border-amber-100 rounded-xl p-2.5 shadow-sm min-w-[100px] hover:bg-amber-50 transition-colors">
                                    <p class="text-[8px] font-black text-amber-400 uppercase tracking-widest mb-0.5">Sugerido</p>
                                    <p class="text-[13px] font-black text-amber-700">{{ tienda.resumen.pedido_sugerido_pz_red.toLocaleString('es-MX') }}</p>
                                </div>
                                <div class="bg-slate-50 border border-slate-200 rounded-xl p-2.5 shadow-sm min-w-[100px] hover:bg-slate-100 transition-colors">
                                    <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Cobertura</p>
                                    <p class="text-[13px] font-black" :class="cobClass(tienda.resumen.cobertura_actual)">{{ n(tienda.resumen.cobertura_actual, 1) }} <span class="text-[9px] font-medium opacity-60">sem</span></p>
                                </div>
                            </div>

                            <!-- Acciones Cabecera -->
                            <div class="flex items-center gap-2 lg:pl-5 lg:border-l lg:border-slate-100">
                                <div
                                  v-if="canUseCardDirectStatusMode() && getVisibleOCNumbers(tienda.skus).length"
                                  class="relative"
                                >
                                    <button
                                      class="h-8 rounded-lg border border-brand-200 bg-brand-50 px-2.5 text-[9px] font-black uppercase tracking-wider text-brand-700 shadow-sm transition-all hover:border-brand-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                                      :class="openStatusOC === storeStatusKey(tienda.id_cliente) ? 'ring-2 ring-brand-400 ring-offset-1' : ''"
                                      :disabled="submittingOC === storeStatusKey(tienda.id_cliente)"
                                      title="Cambiar estado de las OC visibles de esta tienda"
                                      @click.stop="toggleStatusOC(storeStatusKey(tienda.id_cliente))"
                                    >
                                        <i v-if="submittingOC === storeStatusKey(tienda.id_cliente)" class="fa-solid fa-circle-notch fa-spin mr-1"></i>
                                        <i v-else class="fa-solid fa-sliders mr-1"></i>
                                        Estado
                                        <span class="ml-1 opacity-70">({{ getVisibleOCNumbers(tienda.skus).length }})</span>
                                    </button>

                                    <div
                                      v-if="openStatusOC === storeStatusKey(tienda.id_cliente)"
                                      class="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-brand-100 bg-white text-[11px] shadow-2xl ring-1 ring-brand-900/5 animate-in fade-in zoom-in-95 duration-200"
                                      @click.stop
                                    >
                                        <div class="border-b border-brand-50 bg-brand-50/70 px-3 py-2.5">
                                            <p class="text-[9px] font-black uppercase tracking-[0.22em] text-brand-600">Cambio por tienda</p>
                                            <p class="mt-0.5 text-[10px] font-semibold leading-snug text-slate-500">
                                                Aplica a {{ getVisibleOCNumbers(tienda.skus).length }} OC visible{{ getVisibleOCNumbers(tienda.skus).length !== 1 ? 's' : '' }} de la tienda.
                                            </p>
                                        </div>
                                        <button
                                          v-for="option in cardStatusOptions"
                                          :key="option.estado"
                                          class="flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                          :class="option.cls"
                                          :disabled="submittingOC === storeStatusKey(tienda.id_cliente)"
                                          @click.stop="changeStoreVisibleOCStatus(tienda, option.estado, { includeAllVisible: true, directMode: true })"
                                        >
                                            <i :class="option.icon" class="mt-0.5 w-4 text-center text-[11px]"></i>
                                            <span class="min-w-0">
                                                <span class="block font-black">{{ option.label }}</span>
                                                <span class="block text-[9px] font-semibold leading-snug text-slate-400">{{ option.description }}</span>
                                            </span>
                                        </button>
                                    </div>
                                </div>
                                <div class="flex items-center justify-center w-7 h-7 rounded-full bg-slate-50 text-slate-300 group-hover/card:bg-brand-50 group-hover/card:text-brand-500 transition-all">
                                    <i class="fa-solid transition-transform duration-300 text-xs" :class="store.expandedStores[tienda.id_cliente] ? 'fa-chevron-up text-brand-500' : 'fa-chevron-down'"></i>
                                </div>
                            </div>
                        </div>

                        <!-- Grupos OC (Apiladas hacia abajo) con Transición -->
                        <div v-if="store.expandedStores[tienda.id_cliente]" class="flex-1 flex flex-col animate-in fade-in slide-in-from-top-4 duration-300">
                            <div class="p-8 space-y-4 bg-slate-50/30">
                            <div v-for="oc in groupOCs(tienda.skus)" :key="oc.group_id" 
                                 class="w-full flex flex-col border rounded-xl shadow-sm hover:shadow-md transition-all border-l-4 relative" 
                                  :class="[
                                    isAnySelloutOpenInOC(tienda.id_cliente, oc.skus) ? 'z-50' : '',
                                    isZ8(oc.num_pedido) ? 'bg-purple-50/30 border-purple-100 border-l-purple-500' : 'bg-white border-slate-100'
                                  ]" 
                                 
                                 :style="!isZ8(oc.num_pedido) ? `border-left-color: ${estadoBadge(oc.estado_oc).color || '#e2e8f0'}` : ''">
                                <!-- OC Header -->
                                <div class="px-3.5 py-2 border-b flex flex-wrap items-center justify-between gap-3 rounded-tr-xl cursor-pointer hover:bg-slate-100 transition-colors"
                                      :class="isZ8(oc.num_pedido) ? 'bg-purple-100/40 border-purple-100' : 'bg-slate-50 border-slate-100'"
                                     @click.stop="toggleOCGroup(tienda.id_cliente, oc.group_id)">
                                    <div class="flex flex-wrap items-center gap-2.5">
                                        <i class="fa-solid text-slate-300 text-[9px] transition-transform duration-300"
                                           :class="expandedOCGroups[tienda.id_cliente + '_' + oc.group_id] === true ? 'fa-chevron-down' : 'fa-chevron-right'"></i>
                                        <div class="flex items-center gap-1.5">
                                            <i class="fa-solid fa-file-invoice text-slate-400 text-[10px]"></i>
                                            <span class="text-[10px] font-black text-slate-700 tracking-tight">{{ oc.num_pedido || 'SIN FOLIO' }}</span>
                                        </div>
                                        <span v-if="oc.semana_ic" class="text-[8px] font-bold px-1.5 py-0.5 bg-brand-50 text-brand-700 rounded-md border border-brand-100">Sem. {{ oc.semana_ic }}</span>
                                        
                                        <!-- Badges de Fecha solicitados -->
                                        <div class="flex flex-wrap items-center gap-1.5">
                                            <div v-if="oc.fec_pedido_cadena" class="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md text-[8px] font-bold bg-slate-100 text-slate-600 border border-slate-200" title="Fecha Pedido Cadena">
                                                <i class="fa-regular fa-calendar-check text-brand-400"></i>
                                                {{ oc.fec_pedido_cadena.slice(0, 10) }}
                                            </div>
                                            <div v-if="oc.fec_fin_embarque" class="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md text-[8px] font-bold bg-amber-50 text-amber-700 border border-amber-100" title="Fin Embarque">
                                                <i class="fa-solid fa-triangle-exclamation text-amber-500"></i>
                                                {{ oc.fec_fin_embarque.slice(0, 10) }}
                                            </div>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <!-- Status Badge & Dropdown -->
                                        <div class="relative flex items-center gap-1.5">
                                            <button 
                                              @click.stop="toggleStatusOC(tienda.id_cliente + '_' + oc.group_id)"
                                              class="text-[9px] b-1 font-black px-1.5 py-0.5 rounded-lg border uppercase tracking-wider transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0" 
                                              :class="estadoBadge(oc.estado_oc).cls"
                                              :disabled="submittingOC === oc.num_pedido || !canUseCardDirectStatusMode()"
                                              :title="canUseCardDirectStatusMode() ? 'Cambiar estado de la OC' : 'Estado de la OC'"
                                            >
                                                <i v-if="submittingOC === oc.num_pedido" class="fa-solid fa-circle-notch fa-spin mr-1"></i>
                                                {{ estadoBadge(oc.estado_oc).label }}
                                            </button>

                                            <!-- Dropdown Cambio Estado -->
                                            <div v-if="openStatusOC === (tienda.id_cliente + '_' + oc.group_id) && canUseCardDirectStatusMode()" 
                                                 class="absolute right-0 top-full mt-2 z-50 bg-white border border-slate-200 shadow-2xl rounded-xl py-1.5 w-48 animate-in fade-in zoom-in-95 duration-200"
                                                 @click.stop>
                                                <div v-if="canUseCardDirectStatusMode()">
                                                    <p class="px-4 py-2 text-[10px] font-black text-brand-600 uppercase tracking-widest border-b border-brand-50 mb-1">Cambiar Estado</p>
                                                    <button
                                                      v-for="option in cardStatusOptions"
                                                      :key="option.estado"
                                                      class="flex w-full items-start gap-2 px-4 py-2.5 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                      :class="option.cls"
                                                      :disabled="submittingOC === oc.num_pedido"
                                                      @click.stop="changeOCStatus(oc.num_pedido, option.estado)"
                                                    >
                                                        <i :class="option.icon" class="mt-0.5 w-4 text-center text-[11px]"></i>
                                                        <span>
                                                            <span class="block text-[11px] font-black">{{ option.label }}</span>
                                                            <span class="block text-[9px] font-semibold leading-snug text-slate-400">{{ option.description }}</span>
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- SKU List -->
                                <div v-if="expandedOCGroups[tienda.id_cliente + '_' + oc.group_id] === true" class="divide-y divide-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div v-for="(sku, skuIdx) in oc.skus" :key="sku.sku_muliix" class="p-6 hover:bg-slate-50/80 transition-colors group/sku relative" :class="{ 'z-50': openSelloutId === (tienda.id_cliente + '_' + sku.sku_cadena) }">
                                        <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                                            
                                            <!-- Info Principal SKU (Nombre y detalles debajo) -->
                                            <div class="min-w-0 flex-1 cursor-pointer rounded-lg p-1 -m-1 transition-colors hover:bg-brand-50/60" @click.stop="openProductPanel(tienda, sku)">
                                                <h4 class="text-[12px] font-black text-slate-800 leading-tight truncate mb-1" :title="sku.sku_nombre">{{ sku.sku_nombre }}</h4>
                                                <div class="flex flex-wrap items-center gap-2.5">
                                                    <span class="text-[8px] font-black px-1 py-0.5 rounded border uppercase shadow-xs bg-white" :class="escenarioCls(sku.escenario)">
                                                        {{ sku.escenario || '—' }}
                                                    </span>
                                                    <div class="flex items-center gap-1 text-[9px] text-slate-400 font-mono bg-white px-1.5 py-0.5 rounded border border-slate-100">
                                                        <span class="font-bold text-slate-300">UPC:</span> {{ sku.upc_cadena }}
                                                    </div>
                                                    <div class="flex items-center gap-1 text-[9px] text-slate-400 font-mono bg-white px-1.5 py-0.5 rounded border border-slate-100">
                                                        <span class="font-bold text-slate-300">SKU:</span> {{ sku.sku_muliix }}
                                                    </div>
                                                </div>
                                            </div>

                                            <!-- Métricas Centrales -->
                                            <div class="grid grid-cols-3 gap-3 w-full lg:w-auto lg:px-5 lg:border-x lg:border-slate-100 shrink-0">
                                                <div class="text-center lg:text-right">
                                                    <p class="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Inv. Actual</p>
                                                    <div class="flex items-center justify-center lg:justify-end gap-1.5 text-[13px] font-black text-slate-700">
                                                        <i v-if="sku.inv_actual_pz <= 0" class="fa-solid fa-ban text-[9px] text-rose-500" title="Desabasto"></i>
                                                        {{ n(sku.inv_actual_pz, 0) }} <span class="text-[9px] text-slate-400 font-medium">pz</span>
                                                    </div>
                                                </div>
                                                <div class="text-center lg:text-right relative cursor-pointer group/cell hover:bg-slate-50 p-1.5 rounded-xl transition-all" @click.stop="toggleSellout(tienda.id_cliente + '_' + sku.sku_cadena)">
                                                    <p class="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-0.5 group-hover/cell:text-brand-600">Vta. Prom</p>
                                                    <p class="text-[13px] font-black text-slate-700 border-b border-dashed border-slate-200 group-hover/cell:border-brand-300 transition-all inline-block">
                                                        {{ n(sku.promedio_sellout_pz, 1) }} <span class="text-[9px] text-slate-400 font-medium">pz</span>
                                                    </p>
                                                    
                                                    <!-- Popover Historial Sellout: abre hacia arriba en el último SKU, hacia abajo en el resto -->
                                                    <div v-if="openSelloutId === (tienda.id_cliente + '_' + sku.sku_cadena)"
                                                         class="absolute right-0 z-[999] bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 w-[280px] cursor-default ring-1 ring-black/5"
                                                         :class="skuIdx < 2 ? 'top-full mt-2' : 'bottom-full mb-2'"
                                                         @click.stop>
                                                        <div class="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                                                            <div class="flex flex-col">
                                                                <span class="text-[9px] font-black text-brand-500 uppercase tracking-widest">Análisis de Venta</span>
                                                                <span class="text-[11px] font-bold text-slate-700 uppercase">Histórico Semanal</span>
                                                            </div>
                                                            <button @click.stop="closeSellout" class="w-6 h-6 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"><i class="fa-solid fa-xmark text-[10px]"></i></button>
                                                        </div>
                                                        <table class="w-full text-[11px] leading-tight">
                                                            <thead>
                                                                <tr class="text-slate-400 border-b border-slate-50 uppercase text-[9px] font-black">
                                                                    <th class="py-1.5 text-left">Semana</th>
                                                                    <th class="py-1.5 text-right">Peso (kg)</th>
                                                                    <th class="py-1.5 text-right text-brand-600">Cant. (pz)</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody class="text-slate-600">
                                                                <tr v-for="s in (sku.sellout_semanas || [])" :key="s.semana" class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                                    <td class="py-2.5 font-black text-slate-800">Sem. {{ s.semana }}</td>
                                                                    <td class="py-2.5 text-right font-mono">{{ n(s.kg, 1) }}</td>
                                                                    <td class="py-2.5 text-right font-black text-brand-700 bg-brand-50/30">{{ n(s.kg / (sku.unidad_inventario || 1), 1) }}</td>
                                                                </tr>
                                                                <tr v-if="!(sku.sellout_semanas && sku.sellout_semanas.length)">
                                                                    <td colspan="3" class="py-8 text-center">
                                                                        <i class="fa-solid fa-chart-line text-slate-200 text-2xl mb-2 block"></i>
                                                                        <p class="text-slate-400 font-medium">Sin datos históricos</p>
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                            <tfoot v-if="sku.sellout_semanas && sku.sellout_semanas.length">
                                                                <tr class="bg-slate-50/80">
                                                                    <td class="py-2.5 px-2 font-black text-slate-800 text-[9px] uppercase tracking-tighter">Promedio</td>
                                                                    <td class="py-2.5 text-right font-bold text-slate-800">{{ n(sku.promedio_sellout_kg, 1) }}</td>
                                                                    <td class="py-2.5 text-right font-black text-brand-700 bg-brand-100/50 rounded-br-xl">{{ n(sku.promedio_sellout_pz, 1) }}</td>
                                                                </tr>
                                                            </tfoot>
                                                        </table>
                                                        <div class="mt-3 pt-2 text-[9px] text-slate-400 border-t border-slate-100 italic">
                                                            * Factor conversión: {{ sku.unidad_inventario }} kg/pz
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="text-right">
                                                    <p class="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Criterio</p>
                                                    <p class="text-[13px] font-black text-slate-500">{{ sku.semanas_objetivo || '—' }} <span class="text-[9px] text-slate-400 font-medium">sem</span></p>
                                                </div>
                                            </div>


                                            <!-- Acciones y Resultados (Derecha) -->
                                            <div class="shrink-0 flex flex-wrap lg:flex-nowrap items-center gap-3 w-full lg:w-auto">
                                                <div class="flex items-center grow lg:grow-0 divide-x divide-slate-100 bg-slate-50 lg:bg-transparent rounded-xl lg:rounded-none overflow-hidden border lg:border-0 border-slate-100">
                                                    <!-- Cadena -->
                                                    <div class="flex flex-col items-center justify-center w-[65px] h-12 lg:h-auto">
                                                        <p class="text-[7px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Central</p>
                                                        <span class="text-[12px] font-black text-slate-800">{{ n(sku.cant_pedida, 0) }}</span>
                                                    </div>
    
                                                    <!-- Pedido Sugerido -->
                                                    <div class="flex flex-col items-center justify-center w-[110px] h-12 lg:h-auto bg-amber-50/50">
                                                        <p class="text-[7px] font-black text-amber-600 uppercase tracking-tighter mb-0.5">Sugerido</p>
                                                        <div class="flex items-center justify-center gap-1 w-full px-1">
                                                            <div v-if="currentTab === 'centralizados' && editingId === sku.sku_muliix" class="flex items-center justify-center gap-1">
                                                                <input 
                                                                    v-model.number="editValue" 
                                                                    type="number" min="0" :step="sku.pzas_bolsa || 1"
                                                                    class="w-12 h-6 text-[10px] font-black text-right border border-brand-400 rounded-md px-1 outline-none shadow-sm"
                                                                    autofocus
                                                                    @keyup.enter="confirmEdit(sku, tienda.id_cliente)"
                                                                    @keyup.escape="cancelEdit()"
                                                                />
                                                                <button class="bg-emerald-500 text-white rounded-md w-6 h-6 flex items-center justify-center hover:bg-emerald-600 shadow-sm transition-colors" @click="confirmEdit(sku, tienda.id_cliente)">
                                                                  <i :class="saving ? 'fa-solid fa-circle-notch fa-spin text-[10px]' : 'fa-solid fa-check text-[11px]'"></i>
                                                                </button>
                                                            </div>
                                                            <button v-else-if="currentTab === 'centralizados'" @click="startEdit(sku)" class="h-7 w-[70px] bg-white border border-slate-200 hover:border-brand-400 rounded-lg flex items-center justify-center gap-1 transition-all group/edit" :class="{ 'ring-2 ring-emerald-400 border-transparent bg-emerald-50': savedId === sku.sku_muliix }">
                                                                <i v-if="esSinSellout(sku)" class="fa-solid fa-seedling text-[8px] text-amber-500 shrink-0"></i>
                                                                <span class="text-[12px] font-black truncate" :class="sku.pedido_sugerido_pz_red > 0 ? 'text-brand-700' : 'text-slate-800'">{{ n(sku.pedido_sugerido_pz_red, 0) }}</span>
                                                            </button>
                                                            <span v-else class="h-7 w-[70px] rounded-lg border border-amber-100 bg-white px-2 text-center text-[12px] font-black leading-7 text-amber-700">
                                                                {{ n(sku.pedido_sugerido_pz_red, 0) }}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <!-- Ajuste -->
                                                    <div
                                                      v-if="showAdjustmentColumn"
                                                      class="flex flex-col items-center justify-center w-[118px] h-12 lg:h-auto"
                                                      :title="adjustmentTooltip(tienda.id_cliente, sku)"
                                                    >
                                                        <p class="text-[7px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Ajuste</p>
                                                        <div
                                                          v-if="currentTab === 'revision'"
                                                          class="flex h-7 w-[104px] items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white"
                                                        >
                                                            <button
                                                              type="button"
                                                              class="flex h-7 w-7 shrink-0 items-center justify-center text-slate-500 transition hover:bg-slate-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-35"
                                                              :disabled="adjustingSkuKey === adjustmentKey(tienda.id_cliente, sku) || !canDecreaseAdjustment(sku) || !store.getCachedApprovalIdForSku(tienda.id_cliente, sku)"
                                                              @click.stop="adjustReviewSku(tienda.id_cliente, sku, -1)"
                                                            >
                                                                <i class="fa-solid fa-minus text-[9px]"></i>
                                                            </button>
                                                            <span class="flex h-7 flex-1 items-center justify-center border-x border-slate-200 text-[10px] font-black" :class="skuAdjustment(sku) === 0 ? 'text-slate-400' : 'text-amber-700'">
                                                                <i v-if="adjustingSkuKey === adjustmentKey(tienda.id_cliente, sku)" class="fa-solid fa-circle-notch fa-spin text-[9px]"></i>
                                                                <span v-else>{{ formatAdjustment(sku) }}</span>
                                                            </span>
                                                            <button
                                                              type="button"
                                                              class="flex h-7 w-7 shrink-0 items-center justify-center text-slate-400 disabled:cursor-not-allowed disabled:opacity-35"
                                                              :disabled="true"
                                                              @click.stop="adjustReviewSku(tienda.id_cliente, sku, 1)"
                                                            >
                                                                <i class="fa-solid fa-plus text-[9px]"></i>
                                                            </button>
                                                        </div>
                                                        <span
                                                          v-else
                                                          class="inline-flex h-7 min-w-[64px] items-center justify-center rounded-lg border px-2 text-[11px] font-black"
                                                          :class="skuAdjustment(sku) === 0 ? 'border-slate-200 bg-white text-slate-400' : 'border-amber-200 bg-amber-50 text-amber-700'"
                                                        >
                                                            {{ formatAdjustment(sku) }}
                                                        </span>
                                                    </div>
    
                                                    <!-- Cobertura -->
                                                    <div class="flex flex-col items-center justify-center w-[70px] h-12 lg:h-auto">
                                                        <p class="text-[7px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Cob.</p>
                                                        <span class="flex items-center justify-center gap-1 text-[12px] font-black" :class="cobClass(calcularCoberturaDinamica(sku))">
                                                            <i v-if="coberturaStatusIcon(coberturaStatus(sku))" :class="coberturaStatusIcon(coberturaStatus(sku))" class="text-[8px] shrink-0"></i>
                                                            {{ calcularCoberturaDinamica(sku) != null ? calcularCoberturaDinamica(sku)!.toFixed(1) : '—' }}
                                                        </span>
                                                    </div>

                                                    <!-- Fill Rate -->
                                                    <div class="flex flex-col items-center justify-center w-[70px] h-12 lg:h-auto">
                                                        <p class="text-[7px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Fill</p>
                                                        <span class="flex items-center justify-center gap-1 text-[12px] font-black" :class="fillRateBadge(calcularFillRateDinamico(sku)).text">
                                                            {{ calcularFillRateDinamico(sku) != null ? (calcularFillRateDinamico(sku)! * 100).toFixed(0) + '%' : '—' }}
                                                        </span>
                                                    </div>
                                                </div>
 
                                                <!-- Status Fill Rate (Dot) -->
                                                <div class="hidden lg:flex border-l border-slate-100 h-8 items-center justify-center w-[30px]" :title="fillRateStatusDot(sku).label">
                                                    <span class="w-2.5 h-2.5 rounded-full block border shadow-inner transition-colors" :class="fillRateStatusDot(sku).cls"></span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                </div>
                            </div>

                            <!-- Footer Tarjeta con indicadores rápidos de la tienda -->
                            <div class="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between rounded-b-3xl">
                                <div class="flex items-center gap-2">
                                    <i class="fa-solid fa-boxes-stacked text-slate-300 text-[10px]"></i>
                                    <span class="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{{ tienda.total_skus }} SKUs registrados</span>
                                </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            <!-- Empty State dentro de tarjetas -->
            <div v-if="!filteredDias.length" class="flex flex-col items-center justify-center py-24 text-slate-400">
                <i class="fa-solid fa-folder-open text-5xl mb-4 opacity-20"></i>
                <p class="text-base font-bold">No se encontraron tiendas</p>
                <p class="text-sm">Ajusta los filtros para visualizar los resultados</p>
            </div>
        </div>
      </div>
    </template>
  </div>

  <Teleport to="body">
    <CpfrZ8Panel
        v-if="showZ8Panel"
        @close="showZ8Panel = false"
    />
  </Teleport>

  <Teleport to="body">
    <CpfrProductBehaviorPanel
        v-if="selectedProductContext && store.currentWeek"
        :tienda="selectedProductContext.tienda"
        :sku="selectedProductContext.sku"
        :year="store.currentWeek.anio"
        :week="store.currentWeek.semana"
        :cadena="store.nom_cadena"
        @close="closeProductPanel"
    />
  </Teleport>

  <Teleport to="body">
    <div
      v-if="showExpiredCloseModal"
      class="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-[2px]"
      @click.self="closeExpiredCloseModal"
    >
      <section class="flex max-h-[82vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-brand-200 bg-white shadow-2xl">
        <header class="shrink-0 border-b border-brand-100 bg-brand-50 px-5 py-4">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <div class="mb-1 flex items-center gap-2">
                <span class="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
                  <i class="fa-solid fa-lock text-[11px]"></i>
                </span>
                <h3 class="text-sm font-black uppercase tracking-wider text-slate-800">Cerrar OC caducadas</h3>
              </div>
              <p class="text-xs font-medium leading-relaxed text-slate-600">
                Estas OC ya no alcanzan fecha fin embarque considerando el lead time de la tienda.
              </p>
            </div>
            <button
              class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand-100 bg-white text-slate-400 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
              :disabled="submittingOC === 'expired-centralized'"
              title="Cerrar ventana"
              @click="closeExpiredCloseModal"
            >
              <i class="fa-solid fa-xmark text-[12px]"></i>
            </button>
          </div>
        </header>

        <div class="shrink-0 border-b border-slate-100 bg-white px-5 py-3">
          <div class="grid grid-cols-3 gap-2">
            <div class="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2">
              <p class="text-[9px] font-black uppercase tracking-wider text-brand-600">OC</p>
              <p class="mt-0.5 text-lg font-black text-brand-700">{{ expiredCloseSummary.ocs }}</p>
            </div>
            <div class="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p class="text-[9px] font-black uppercase tracking-wider text-slate-500">Tiendas</p>
              <p class="mt-0.5 text-lg font-black text-slate-800">{{ expiredCloseSummary.stores }}</p>
            </div>
            <div class="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
              <p class="text-[9px] font-black uppercase tracking-wider text-amber-700">SKUs</p>
              <p class="mt-0.5 text-lg font-black text-amber-800">{{ expiredCloseSummary.skus }}</p>
            </div>
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-auto">
          <table class="w-full text-left text-[11px]">
            <thead class="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 text-[9px] uppercase tracking-wider text-slate-500">
              <tr>
                <th class="px-4 py-2.5 font-black">OC</th>
                <th class="px-3 py-2.5 font-black">Tienda</th>
                <th class="px-3 py-2.5 text-center font-black">Pedido</th>
                <th class="px-3 py-2.5 text-center font-black">Fin embarque</th>
                <th class="px-3 py-2.5 text-center font-black">Lead</th>
                <th class="px-3 py-2.5 text-right font-black">SKUs</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="oc in expiredCentralizedOCs" :key="oc.id_cliente + '_' + oc.num_pedido" class="hover:bg-brand-50/30">
                <td class="px-4 py-3 font-black text-slate-800">{{ oc.num_pedido }}</td>
                <td class="max-w-[240px] px-3 py-3">
                  <p class="truncate font-bold text-slate-700" :title="oc.nombre_tienda">{{ oc.nombre_tienda }}</p>
                  <p class="mt-0.5 font-mono text-[9px] font-bold text-slate-400">{{ oc.id_cliente }}</p>
                </td>
                <td class="px-3 py-3 text-center font-mono font-bold text-slate-600">{{ formatShortDate(oc.fec_pedido_cadena) }}</td>
                <td class="px-3 py-3 text-center font-mono font-black text-rose-600">{{ formatShortDate(oc.fec_fin_embarque) }}</td>
                <td class="px-3 py-3 text-center">
                  <span class="inline-flex rounded-md bg-slate-100 px-2 py-0.5 font-black text-slate-600">{{ oc.lead_time }} d</span>
                </td>
                <td class="px-3 py-3 text-right font-black text-slate-700">{{ oc.sku_count }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer class="shrink-0 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-[11px] font-semibold text-slate-500">
              Al confirmar, el estado se cambiará a cerrado en PedidoGenerado y OrdenCompra.
            </p>
            <div class="flex justify-end gap-2">
              <button
                class="h-9 rounded-lg border border-slate-200 bg-white px-4 text-[11px] font-black uppercase tracking-wider text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-60"
                :disabled="submittingOC === 'expired-centralized'"
                @click="closeExpiredCloseModal"
              >
                Cancelar
              </button>
              <button
                class="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-600 px-4 text-[11px] font-black uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="submittingOC === 'expired-centralized'"
                @click="closeExpiredCentralizedOCs"
              >
                <i v-if="submittingOC === 'expired-centralized'" class="fa-solid fa-circle-notch fa-spin"></i>
                <i v-else class="fa-solid fa-lock"></i>
                Cerrar OC
              </button>
            </div>
          </div>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

