<script setup lang="ts">
// src/modules/CPFR/components/CpfrOrderTable.vue
import { ref, computed, onMounted, onBeforeUnmount, defineOptions } from 'vue'

defineOptions({
  inheritAttrs: false
})
import { useCpfrStore } from '../stores/cpfrStore'
import { toast } from '@/components/ui/toast/use-toast'
import type { CpfrSkuDash, CpfrStoreDash } from '../types/cpfrTypes'
import CpfrZ8Panel from '../components/CpfrZ8Panel.vue'

const showZ8Panel = ref(false)

const store = useCpfrStore()

const emit = defineEmits<{
    (e: 'open-config', id_cliente: string, nombre_tienda: string): void
}>()

// ── Tabs State ────────────────────────────────────────────────────────────────
const currentTab = computed({
  get: () => store.activeTab,
  set: (val) => store.setActiveTab(val)
})
const tabs = [ 
    { id: 'centralizados', label: 'Centralizados' },
    { id: 'revision',       label: 'Revisión' },
    { id: 'aprobada',       label: 'Aprobada' },
    { id: 'sin_embarcar',   label: 'Sin Embarcar' },
    { id: 'historial',      label: 'Historial' },
]

// ── Inline edit ───────────────────────────────────────────────────────────────
const editingId = ref<string | null>(null)
const editValue = ref<number>(0)
const saving    = ref(false)
const savedId   = ref<string | null>(null)

// ── Estado de envío a revisión ────────────────────────────────────────────────
const submittingOC = ref<string | null>(null)

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

// ── Popovers State (Sellout & Status) ──────────────────────────────────────────
const openSelloutId = ref<string | null>(null)
const openStatusOC  = ref<string | null>(null)

function closeAllPopovers() {
    openSelloutId.value = null
    openStatusOC.value  = null
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
    return Array.from(map.values()).sort((a, b) => {
        const isZA = isZ8(a.num_pedido)
        const isZB = isZ8(b.num_pedido)
        if (isZA && !isZB) return 1
        if (!isZA && isZB) return -1

        const dateA = a.fec_pedido_cadena || ''
        const dateB = b.fec_pedido_cadena || ''
        return dateB.localeCompare(dateA)
    })
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

function instockBadge(pct: number | null): { label: string; cls: string } {
    if (pct === null)  return { label: '—',        cls: 'bg-slate-100 text-slate-500' }
    if (pct >= 100)    return { label: 'INSTOCK',  cls: 'bg-emerald-100 text-emerald-700' }
    if (pct >= 50)     return { label: 'BAJO',     cls: 'bg-amber-100 text-amber-700' }
    return                    { label: 'CRÍTICO',  cls: 'bg-rose-100 text-rose-700' }
}

function escenarioCls(esc: 'A' | 'B' | null) {
    if (esc === 'A') return 'bg-sky-100 text-sky-700 border-sky-200'
    if (esc === 'B') return 'bg-amber-100 text-amber-700 border-amber-200'
    return 'bg-slate-100 text-slate-500 border-slate-200'
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
    if (estado === 'procesado') return { label: 'Procesado', cls: 'bg-sky-100 text-sky-700 border-sky-200', color: '#38bdf8' }
    return { label: estado || 'Desconocido', cls: 'bg-slate-100 text-slate-500 border-slate-200', color: '#94a3b8' }
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
    if (isRevision) submittingOC.value = num_pedido

    const result = await store.updateStatus({
        num_pedido: num_pedido,
        year: store.currentWeek.anio,
        week: store.currentWeek.semana,
        estado: estado as any,
    })

    if (isRevision) {
        submittingOC.value = null
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

const filteredDias = computed(() => {
    const sf = store.statusFilters;
    const hasStatusFilter = sf.escenarioA || sf.escenarioB || sf.sinSellout || sf.desabasto || 
                           sf.bajoStock || sf.sobrestock || sf.fillrateBajo || 
                           sf.fillrate100 || sf.sobrepedido;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const curWeekIc = store.currentWeek?.semana_ic ? parseInt(store.currentWeek.semana_ic) : 0;
    const curYear = store.currentWeek?.anio || 0;

    const isCurrentWeek = (sku: any) => {
        const skuYear = sku.fec_pedido_cadena ? parseInt(sku.fec_pedido_cadena.slice(0, 4)) : 0;
        const skuWeek = sku.semana_ic ? parseInt(sku.semana_ic) : 0;
        return skuYear === curYear && skuWeek === curWeekIc;
    };

    const isPreviousWeek = (sku: any) => {
        const skuYear = sku.fec_pedido_cadena ? parseInt(sku.fec_pedido_cadena.slice(0, 4)) : 0;
        const skuWeek = sku.semana_ic ? parseInt(sku.semana_ic) : 0;
        return (skuYear < curYear) || (skuYear === curYear && skuWeek < curWeekIc);
    };

    return store.dias.map(dia => {
        const filteredTiendas = dia.tiendas.map(tienda => {
            const filteredSkus = tienda.skus.filter(sku => {
                // 1. Filtro por Pestaña (Tab)
                const state = sku.estado_oc;
                if (currentTab.value === 'centralizados') {
                    if (!isCurrentWeek(sku) || state === 'revision' || state === 'aprobado') return false;
                } else if (currentTab.value === 'revision') {
                    if (!isCurrentWeek(sku) || state !== 'revision') return false;
                } else if (currentTab.value === 'aprobada') {
                    if (!isCurrentWeek(sku) || state !== 'aprobado') return false;
                } else if (currentTab.value === 'sin_embarcar') {
                    const fecFin = sku.fec_fin_embarque ? sku.fec_fin_embarque.slice(0, 10) : null;
                    if (!fecFin || fecFin >= todayStr || state === 'aprobado') return false;
                } else if (currentTab.value === 'historial') {
                    if (!isPreviousWeek(sku)) return false;
                }

                // 2. Filtro de Búsqueda
                if (sf.searchOC) {
                    const term = sf.searchOC.toLowerCase();
                    const num = (sku.num_pedido || '').toLowerCase();
                    if (!num.includes(term)) return false;
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
            return { ...tienda, skus: filteredSkus };
        }).filter(tienda => tienda.skus.length > 0);
        
        return { ...dia, tiendas: filteredTiendas };
    }).filter(dia => dia.tiendas.length > 0);
});

const totalUniqueOCs = computed(() => {
    const ocSet = new Set<string>();
    filteredDias.value.forEach(dia => {
        dia.tiendas.forEach(tienda => {
            tienda.skus.forEach(sku => {
                if (sku.num_pedido) {
                    // Combinamos con id_cliente por seguridad
                    ocSet.add(`${tienda.id_cliente}|${sku.num_pedido}`);
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

    <!-- Sin datos -->
    <div
      v-if="!store.dias.length"
      class="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400 p-12 bg-slate-50/50"
    >
      <i class="fa-solid fa-box-open text-3xl text-slate-300"></i>
      <p class="text-sm font-medium">No hay pedidos para los filtros seleccionados.</p>
      <p class="text-xs text-slate-400">Ajusta los filtros o la semana actual.</p>
    </div>

    <!-- ── Tabla y Toolbar ──────────────────────────────────────────────── -->
    <template v-else>
      
      <!-- ── Toolbar de Control de Vistas ── -->
      <div class="shrink-0 px-5 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
        <div class="flex items-center gap-2 text-slate-500">
          <i class="fa-solid fa-layer-group text-slate-400"></i>
          <span class="text-[11px] font-bold uppercase tracking-wider">Control de Vista</span>
          
          <!-- Contador de OCs -->
          <div v-if="totalUniqueOCs > 0" class="ml-4 flex items-center gap-2 px-2.5 py-1 bg-brand-50 border border-brand-200 rounded-lg text-brand-700 font-bold text-[10px]">
            <i class="fa-solid fa-file-circle-check"></i>
            <span>{{ totalUniqueOCs }} OC</span>
          </div>

          <!-- Pestañas (Tabs) -->
          <div class="ml-4 flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl border border-slate-200 shadow-inner">
            <button
               v-for="t in tabs" :key="t.id"
               class="px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all"
               :class="currentTab === t.id ? 'bg-brand-600 text-white shadow-sm shadow-brand-200' : 'text-slate-500 hover:bg-white hover:text-slate-700'"
               @click="currentTab = t.id"
            >{{ t.label }}</button>
          </div>
        </div>
        
        <div class="flex items-center gap-4">
          <!-- Controles Tiendas -->
          <div class="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm text-[11px] font-semibold overflow-hidden">
              <span class="px-3 py-1.5 bg-slate-50 text-slate-500 border-r border-slate-200 flex items-center gap-1.5">
                  <i class="fa-solid fa-store text-slate-400"></i> Tiendas
              </span>
              <button @click="store.expandAll()" class="px-3 py-1.5 text-slate-500 hover:bg-brand-50 hover:text-brand-600 transition-colors border-r border-slate-200" title="Expandir todas las tiendas">
                  <i class="fa-solid fa-chevron-down"></i>
              </button>
              <button @click="store.collapseAll()" class="px-3 py-1.5 text-slate-500 hover:bg-slate-50 hover:text-rose-600 transition-colors" title="Contraer todas las tiendas">
                  <i class="fa-solid fa-chevron-up"></i>
              </button>
              
          </div>

          <!-- Controles OCs -->
          <div class="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm text-[11px] font-semibold overflow-hidden">
              <span class="px-3 py-1.5 bg-slate-50 text-slate-500 border-r border-slate-200 flex items-center gap-1.5">
                  <i class="fa-solid fa-file-invoice text-slate-400"></i> OCs
              </span>
              <button @click="expandAllOCsLocal" class="px-3 py-1.5 text-slate-500 hover:bg-brand-50 hover:text-brand-600 transition-colors border-r border-slate-200" title="Expandir todas las OCs">
                  <i class="fa-solid fa-chevron-down"></i>
              </button>
              <button @click="collapseAllOCsLocal" class="px-3 py-1.5 text-slate-500 hover:bg-slate-50 hover:text-rose-600 transition-colors" title="Contraer todas las OCs">
                  <i class="fa-solid fa-chevron-up"></i>
              </button>
          </div>
        </div>
      </div>

      <!-- ── Contenedor desplazable ── -->
      <div class="flex-1 min-h-0 overflow-auto scrollbar-thin">
        
        <!-- ── Vista de Tabla ── -->
        <table v-if="store.viewMode === 'table'" class="w-full min-w-[1400px] text-left border-collapse table-fixed transition-all duration-300">

          <!-- Cabecera fija: NIVEL 1 -->
          <thead class="sticky top-0 z-20 shadow-sm ring-1 ring-slate-200">
            <tr class="text-[9px] xl:text-[10px] uppercase tracking-wider text-slate-500 bg-slate-100/80 backdrop-blur-sm border-b border-slate-200 border-l-[6px] border-l-transparent">
              <th class="px-4 py-3 font-bold w-full min-w-[250px]">Tienda / SKU</th>
              <th class="px-3 py-3 font-bold w-28 whitespace-nowrap">UPC</th>
              <th class="px-3 py-3 font-bold text-right w-24 whitespace-nowrap">Inv.<br>Act. (pz)</th>
              <th class="px-3 py-3 font-bold text-right w-28 whitespace-nowrap">Sellout Prom.<br>(pz)</th>
              <th class="px-3 py-3 font-bold text-right w-16 whitespace-nowrap">Crit.<br>(S.)</th>
              <th class="px-3 py-3 font-bold text-right w-20 whitespace-nowrap">Cob.<br>(S.)</th>
              <th class="px-3 py-3 font-bold text-right text-amber-700 bg-amber-50 border-x border-amber-100 w-28 whitespace-nowrap">Pedido<br>Sugerido</th>
              <th class="px-3 py-3 font-bold text-right w-24 whitespace-nowrap">Centralizado</th>
              <th class="px-3 py-3 font-bold text-right w-28 whitespace-nowrap">Fill Rate</th>
              <th class="px-3 py-3 font-bold text-center w-20 whitespace-nowrap">INSTOCK</th>
              <th class="px-2 py-3 font-bold text-center w-10"></th>
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
                <td colspan="13" class="px-4 py-2.5">
                  <div class="flex items-center gap-3">
                    <i
                      class="fa-solid text-slate-400 text-[11px] transition-transform duration-200 group-hover:text-slate-600"
                      :class="collapsedDays[dia.dia_num] ? 'fa-chevron-right' : 'fa-chevron-down'"
                    ></i>
                    <span class="text-[11px] font-bold text-slate-700 uppercase tracking-widest">{{ dia.dia_nombre }}</span>
                    <span class="text-[10px] text-slate-500 font-medium ml-2 border-l border-slate-300 pl-3">
                      {{ dia.tiendas.length }} tienda{{ dia.tiendas.length !== 1 ? 's' : '' }}
                      ·
                      {{ dia.tiendas.reduce((a, t) => a + t.total_skus, 0) }} SKUs
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
                          <p class="font-bold text-slate-800 truncate leading-tight">{{ tienda.nombre_tienda }}</p>
                          <p class="text-[10px] text-brand-600 mt-0.5 font-bold uppercase tracking-wider">
                            {{ tienda.jefatura }}
                          </p>
                        </div>
                      </div>
                    </td>


                    <!-- Inv. Actual (pz) -->
                    <td class="px-3 py-3 text-right text-slate-700 text-[11px] cursor-help"
                        :title="n(tienda.resumen.inv_actual_kg, 2) + ' kg totales'">
                      <span class="border-b border-dashed border-slate-300 hover:border-slate-500 transition-colors">{{ n(tienda.resumen.inv_actual_pz, 2) }}</span>
                    </td>

                    <!-- Vta. Prom. Semanal (pz) -->
                    <td class="px-3 py-3 text-right text-slate-700 text-[11px] cursor-help"
                        :title="n(tienda.resumen.promedio_sellout_kg, 2) + ' kg totales'">
                      <span class="border-b border-dashed border-slate-300 hover:border-slate-500 transition-colors">{{ n(tienda.resumen.promedio_sellout_pz, 2) }}</span>
                    </td>

                    <!-- Criterio (sem. objetivo) -->
                    <td class="px-3 py-3 text-right text-slate-500 text-[11px]">
                      {{ n(tienda.resumen.semanas_objetivo, 1) }}
                    </td>

                    <!-- Semanas Actuales (cobertura_actual) -->
                    <td
                      class="px-3 py-3 text-right font-bold"
                      :class="cobClass(tienda.resumen.cobertura_actual)"
                    >
                      {{ n(tienda.resumen.cobertura_actual, 2) }}
                    </td>

                    <!-- Pedido Sugerido -->
                    <td class="px-3 py-3 text-right font-black text-amber-700 bg-amber-50/50 border-x border-amber-100 text-sm tracking-tight relative">
                      <div class="absolute inset-y-0 left-0 w-[4px] bg-amber-400/30"></div>
                      {{ tienda.resumen.pedido_sugerido_pz_red.toLocaleString('es-MX') }}
                    </td>

                    <!-- Pedido Cadena (cant_pedida de la OC) -->
                    <td class="px-3 py-2.5 text-right font-semibold text-slate-700">
                      {{ tienda.resumen.cant_pedida_total.toLocaleString('es-MX') }}
                    </td>


                    <!-- Fill Rate -->
                    <td class="px-3 py-2.5 text-right font-semibold" :class="fillClass(tienda.resumen.fill_rate)">
                      {{ tienda.resumen.fill_rate != null ? (tienda.resumen.fill_rate * 100).toFixed(1) + '%' : '—' }}
                    </td>

                    <!-- INSTOCK -->
                    <td class="px-3 py-3 text-center">
                      <span
                        class="inline-flex items-center justify-center text-[10px] font-bold px-2 py-0.5 rounded-md"
                        :class="instockBadge(tienda.resumen.instock).cls"
                      >
                        {{ instockBadge(tienda.resumen.instock).label }}
                      </span>
                    </td>

                    <!-- Acciones tienda -->
                    <td class="px-2 py-3" @click.stop>
                      <div class="flex items-center gap-1 justify-center">
                        <button
                          class="text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors p-1.5 rounded-lg"
                          title="Configuración de tienda"
                          @click.stop="emit('open-config', tienda.id_cliente, tienda.nombre_tienda)"
                        >
                          <i class="fa-solid fa-gear text-[12px]"></i>
                        </button>
                      </div>
                    </td>
                  </tr>

                  <!-- ── Filas de SKUs ── -->
                  <template v-if="store.expandedStores[tienda.id_cliente]">

                    <!-- Empty -->
                    <tr v-if="!tienda.skus.length">
                      <td colspan="13" class="px-8 py-6 bg-slate-50/50 text-slate-500 text-sm text-center border-b border-slate-100">
                        Sin SKUs registrados para esta tienda.
                      </td>
                    </tr>

                    <!-- OC Groups -->
                    <template v-else v-for="ocGroup in groupOCs(tienda.skus)" :key="ocGroup.group_id">
                      
                      <!-- NIVEL 4: OC — Indentado, gris muy sutil -->
                      <tr
                        class="cursor-pointer transition-colors text-[11px] border-b border-slate-200 group/row"
                        :class="[
                          expandedOCGroups[`${tienda.id_cliente}_${ocGroup.group_id}`] !== false ? 'bg-slate-100/40' : 'bg-white hover:bg-slate-50/80',
                          isZ8(ocGroup.num_pedido) ? 'bg-purple-50/30' : ''
                        ]"
                        @click="toggleOCGroup(tienda.id_cliente, ocGroup.group_id)"
                      >
                        <!-- Etiqueta OC -->
                        <td colspan="6" class="pl-10 pr-3 py-4 text-slate-700 font-semibold border-l-[6px]"
                            :class="isZ8(ocGroup.num_pedido) ? 'border-l-purple-500 bg-purple-50/20' : 'border-l-brand-300'">
                          <div class="flex items-center flex-wrap gap-2 min-w-0 max-w-4xl">
                            <i
                              class="fa-solid fa-chevron-right text-slate-300 text-[10px] transition-transform duration-200 shrink-0"
                              :class="expandedOCGroups[`${tienda.id_cliente}_${ocGroup.group_id}`] !== false ? 'rotate-90 text-slate-500' : 'group-hover/row:text-slate-400'"
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
                            
                            <div v-if="ocGroup.estado_oc" class="relative ml-1 flex">
                              <span
                                class="font-bold px-1.5 py-0.5 rounded-md text-[9px] border uppercase cursor-pointer transition-colors"
                                :class="[
                                  estadoBadge(ocGroup.estado_oc).cls,
                                  openStatusOC === ocGroup.num_pedido ? 'ring-2 ring-brand-400 ring-offset-1' : ''
                                ]"
                                title="Cambiar estado"
                                @click.stop="toggleStatusOC(ocGroup.num_pedido!)"
                              >
                                {{ estadoBadge(ocGroup.estado_oc).label }}
                                <i class="fa-solid fa-chevron-down ml-1 text-[8px] opacity-70"></i>
                              </span>
                              <!-- Dropdown opciones -->
                              <div
                                v-if="openStatusOC === ocGroup.num_pedido"
                                class="absolute left-0 top-full z-20 mt-1 flex flex-col bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden text-[10px] font-semibold min-w-[100px]"
                              >
                                <button
                                  v-if="ocGroup.estado_oc === 'pendiente'"
                                  class="px-3 py-2 text-left hover:bg-amber-50 text-amber-700 transition-colors border-b border-slate-50"
                                  @click.stop="changeOCStatus(ocGroup.num_pedido, 'borrador')"
                                >
                                  <i class="fa-solid fa-file-pen mr-2 opacity-70"></i>Borrador
                                </button>
                                <button
                                  v-if="['pendiente', 'borrador'].includes(ocGroup.estado_oc)"
                                  class="px-3 py-2 text-left hover:bg-indigo-50 text-indigo-700 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  :disabled="submittingOC === ocGroup.num_pedido"
                                  @click.stop="changeOCStatus(ocGroup.num_pedido, 'revision')"
                                >
                                  <i v-if="submittingOC === ocGroup.num_pedido" class="fa-solid fa-circle-notch fa-spin text-[10px]"></i>
                                  <i v-else class="fa-solid fa-paper-plane mr-1 opacity-70"></i>
                                  {{ submittingOC === ocGroup.num_pedido ? 'Enviando...' : 'Revisión' }}
                                </button>
                              </div>
                            </div>
                            <span class="bg-slate-100 text-slate-600 border border-slate-200 font-bold px-1.5 py-0.5 rounded-md text-[9px] ml-1">{{ ocGroup.skus.length }} SKUs</span>
                          </div>
                        </td>

                        <!-- Pedido Sugerido SUM -->
                        <td class="px-3 py-4 text-right font-bold text-amber-700 bg-amber-50/50 border-x border-amber-100/70 text-sm tracking-tight">
                          {{ n(ocGroup.pedido_sugerido_pz_red_total, 0) }}
                        </td>

                        <!-- Pedido Cadena SUM -->
                        <td class="px-3 py-4 text-right font-bold text-slate-800">
                          {{ n(ocGroup.cant_pedida_total, 0) }}
                        </td>

                        <td class="px-3 py-4 text-center text-slate-400" colspan="3">
                          <span class="text-[10px] italic">Detalle en fila inferior</span>
                        </td>
                      </tr>

                      <!-- Children SKU Rows -->
                      <template v-if="expandedOCGroups[`${tienda.id_cliente}_${ocGroup.group_id}`] !== false">
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
                          <td class="pl-14 pr-3 py-4 text-slate-700 font-medium" :title="sku.sku_nombre">
                            <div class="flex items-center gap-2 min-w-0">
                              <span
                                class="shrink-0 inline-flex text-[9px] font-bold px-1.5 py-0.5 rounded-md border"
                                :class="escenarioCls(sku.escenario)"
                                :title="sku.escenario === 'B' ? 'Pedido recalculado' : ''"
                              >{{ sku.escenario ?? '—' }}</span>
                              <span class="truncate">{{ sku.sku_nombre }}</span>
                            </div>
                          </td>

                          <!-- UPC -->
                          <td class="px-3 py-6 text-slate-500 text-[10px] font-mono">{{ sku.upc_cadena ?? '—' }}</td>

                          <!-- Inv. Actual (pz) -->
                          <td class="px-3 py-4 text-right text-slate-700 cursor-help"
                              :title="`${n(sku.inv_actual_kg, 2)} kg (Inv. uni. = ${sku.unidad_inventario} kg/pz)`">
                            <span class="border-b border-dashed border-slate-300">{{ n(sku.inv_actual_pz, 2) }}</span>
                          </td>

                          <!-- Vta. Prom. Semanal (pz) -->
                          <td class="px-3 py-4 text-right text-slate-700 relative cursor-pointer group/cell hover:bg-slate-100 transition-colors rounded-lg"
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
                          <td class="px-3 py-4 text-right text-slate-500">
                            {{ sku.semanas_objetivo }}
                          </td>

                          <!-- Semanas Actuales (cobertura dinamica) -->
                          <td
                            class="px-3 py-6 text-right font-bold relative"
                            :class="cobClass(calcularCoberturaDinamica(sku))"
                            :title="coberturaStatusTooltip(coberturaStatus(sku), calcularCoberturaDinamica(sku), sku.semanas_objetivo || store.criterio_global || 2.5)"
                          >
                            <span class="flex items-center justify-end gap-1.5">
                              <i v-if="coberturaStatusIcon(coberturaStatus(sku))" :class="coberturaStatusIcon(coberturaStatus(sku))" class="text-[10px] flex-shrink-0"></i>
                              {{ calcularCoberturaDinamica(sku) != null ? calcularCoberturaDinamica(sku)!.toFixed(2) : '—' }}
                            </span>
                          </td>

                          <!-- Pedido Sugerido (editable Excel-style) -->
                          <td class="px-2 py-4 align-middle bg-amber-50/50 border-x border-amber-100/50 relative group/cell">
                            <div class="absolute inset-y-0 left-0 w-[2px] bg-amber-400/20"></div>
                            
                            <div v-if="editingId === sku.sku_muliix && sku.sku_muliix" class="flex items-center gap-1.5 justify-end h-full">
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
                              v-else
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
                          </td>

                          <!-- Pedido Cadena (cant_pedida) -->
                          <td class="px-3 py-4 text-right font-semibold text-slate-800">
                            {{ n(sku.cant_pedida, 0) }}
                          </td>


                          <!-- Fill Rate -->
                          <td
                            class="px-3 py-4 text-right font-medium"
                            :class="[fillRateBadge(calcularFillRateDinamico(sku)).bg, fillRateBadge(calcularFillRateDinamico(sku)).text]"
                            :title="fillRateBadge(calcularFillRateDinamico(sku)).tip"
                          >
                            <span class="flex items-center justify-end gap-1.5">
                              <i v-if="fillRateBadge(calcularFillRateDinamico(sku)).icon" :class="fillRateBadge(calcularFillRateDinamico(sku)).icon" class="text-[10px] flex-shrink-0"></i>
                              {{ calcularFillRateDinamico(sku) != null ? (calcularFillRateDinamico(sku)! * 100).toFixed(1) + '%' : '—' }}
                            </span>
                          </td>

                          <!-- INSTOCK per SKU -->
                          <td class="px-3 py-4 text-center">
                            <span
                              class="inline-flex items-center justify-center text-[10px] font-bold px-2 py-0.5 rounded-md border w-fit mx-auto"
                              :class="instockBadge(sku.instock).cls"
                            >
                              {{ instockBadge(sku.instock).label }}
                            </span>
                          </td>

                          <!-- vacío -->
                          <td></td>
                        </tr>
                      </template>

                      <!-- Fila de respiro entre Grupos de OC -->
                      <tr class="h-12 bg-transparent"><td colspan="11"></td></tr>

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
                                    <span class="px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider" :class="instockBadge(tienda.resumen.instock).cls">
                                        {{ instockBadge(tienda.resumen.instock).label }}
                                    </span>
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
                            <div class="flex items-center gap-2 pl-5 border-l border-slate-100 hidden lg:flex">
                                <button
                                    class="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-brand-600 hover:bg-white hover:shadow-md border border-slate-100 hover:border-brand-200 transition-all rounded-xl"
                                    @click.stop="emit('open-config', tienda.id_cliente, tienda.nombre_tienda)"
                                >
                                    <i class="fa-solid fa-gear text-sm"></i>
                                </button>
                                <div class="flex items-center justify-center w-7 h-7 rounded-full bg-slate-50 text-slate-300 group-hover/card:bg-brand-50 group-hover/card:text-brand-500 transition-all">
                                    <i class="fa-solid transition-transform duration-300 text-xs" :class="store.expandedStores[tienda.id_cliente] ? 'fa-chevron-up text-brand-500' : 'fa-chevron-down'"></i>
                                </div>
                            </div>
                        </div>

                        <!-- Grupos OC (Apiladas hacia abajo) con Transición -->
                        <div v-if="store.expandedStores[tienda.id_cliente]" class="flex-1 flex flex-col animate-in fade-in slide-in-from-top-4 duration-300">
                            <div class="p-8 space-y-11 bg-slate-50/30">
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
                                           :class="expandedOCGroups[tienda.id_cliente + '_' + oc.group_id] !== false ? 'fa-chevron-down' : 'fa-chevron-right'"></i>
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
                                              :disabled="submittingOC === oc.num_pedido"
                                            >
                                                <i v-if="submittingOC === oc.num_pedido" class="fa-solid fa-circle-notch fa-spin mr-1"></i>
                                                {{ estadoBadge(oc.estado_oc).label }}
                                            </button>

                                            <!-- Dropdown Cambio Estado (Solo para Centralizados) -->
                                            <div v-if="openStatusOC === (tienda.id_cliente + '_' + oc.group_id) && currentTab === 'centralizados'" 
                                                 class="absolute right-0 top-full mt-2 z-50 bg-white border border-slate-200 shadow-2xl rounded-xl py-1.5 w-48 animate-in fade-in zoom-in-95 duration-200"
                                                 @click.stop>
                                                <p class="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">Cambiar Estado</p>
                                                <button @click="changeOCStatus(oc.num_pedido, 'borrador')" 
                                                   class="w-full text-left px-4 py-2.5 text-[11px] font-bold text-slate-600 hover:bg-amber-50 hover:text-amber-700 flex items-center gap-2 transition-colors">
                                                    <span class="w-2 h-2 rounded-full bg-amber-400"></span> Borrador
                                                </button>
                                                <button @click="changeOCStatus(oc.num_pedido, 'revision')" 
                                                   class="w-full text-left px-4 py-2.5 text-[11px] font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 transition-colors">
                                                    <span class="w-2 h-2 rounded-full bg-indigo-400"></span> Enviar a Revisión
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- SKU List -->
                                <div v-if="expandedOCGroups[tienda.id_cliente + '_' + oc.group_id] !== false" class="divide-y divide-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div v-for="(sku, skuIdx) in oc.skus" :key="sku.sku_muliix" class="p-6 hover:bg-slate-50/80 transition-colors group/sku relative" :class="{ 'z-50': openSelloutId === (tienda.id_cliente + '_' + sku.sku_cadena) }">
                                        <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                                            
                                            <!-- Info Principal SKU (Nombre y detalles debajo) -->
                                            <div class="min-w-0 flex-1">
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
                                                            <div v-if="editingId === sku.sku_muliix" class="flex items-center justify-center gap-1">
                                                                <input 
                                                                    v-model.number="editValue" 
                                                                    type="number" min="0" :step="sku.pzas_bolsa || 1"
                                                                    class="w-12 h-6 text-[10px] font-black text-right border border-brand-400 rounded-md px-1 outline-none shadow-sm"
                                                                    @keyup.enter="confirmEdit(sku, tienda.id_cliente)"
                                                                    @keyup.escape="cancelEdit()"
                                                                />
                                                            </div>
                                                            <button v-else @click="startEdit(sku)" class="h-7 w-[70px] bg-white border border-slate-200 hover:border-brand-400 rounded-lg flex items-center justify-center gap-1 transition-all group/edit">
                                                                <i v-if="esSinSellout(sku)" class="fa-solid fa-seedling text-[8px] text-amber-500 shrink-0"></i>
                                                                <span class="text-[12px] font-black truncate" :class="sku.pedido_sugerido_pz_red > 0 ? 'text-brand-700' : 'text-slate-800'">{{ n(sku.pedido_sugerido_pz_red, 0) }}</span>
                                                            </button>
                                                        </div>
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
</template>
