<script setup lang="ts">
// src/modules/CPFR/components/CpfrOrderTable.vue
// Tabla jerárquica: Día → Tienda (macro) → SKUs (detalle)
// Columnas: INV.ACTUAL | VENTA PROM.SEM | CRITERIO | SEM.ACTUALES | PEDIDO SUGERIDO | PEDIDO CADENA | FILL RATE | INSTOCK
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useCpfrStore } from '../stores/cpfrStore'
import type { CpfrSkuDash, CpfrStoreDash } from '../types/cpfrTypes'

const store = useCpfrStore()

const emit = defineEmits<{
    (e: 'open-config', id_cliente: string, nombre_tienda: string): void
}>()

// ── Inline edit ───────────────────────────────────────────────────────────────
const editingId = ref<string | null>(null)  // tracks sku_muliix
const editValue = ref<number>(0)
const saving    = ref(false)
const savedId   = ref<string | null>(null)

function startEdit(sku: CpfrSkuDash) {
    if (!sku.sku_muliix) return; // Prevent edits on SKUs without mapping
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
    
    // Aquí actualizo el valor en el UI temporalmente (se confirma luego en la DB)
    sku.pedido_sugerido_pz_red = finalValue;

    const newFillRate = calcularFillRateDinamico(sku);

    const ok = await store.adjustSku(
        id_cliente,
        sku.sku_muliix!,
        store.currentWeek!.anio,
        store.currentWeek!.semana_ic,
        {
            cantidad_final_pz: finalValue,
            fill_rate: newFillRate
        }
    )
    saving.value = false
    if (ok) { savedId.value = sku.sku_muliix; setTimeout(() => { savedId.value = null }, 1800) }
    editingId.value = null
}

// ── Sellout History Popover ───────────────────────────────────────────────────
const openSelloutId = ref<string | null>(null)

function closeSellout() {
    openSelloutId.value = null
}

function toggleSellout(id: string) {
    if (openSelloutId.value === id) {
        openSelloutId.value = null
    } else {
        openSelloutId.value = id
    }
}

onMounted(() => {
    document.addEventListener('click', closeSellout)
})

onBeforeUnmount(() => {
    document.removeEventListener('click', closeSellout)
})

// ── Agrupación por Orden de Compra (OC) ────────────────────────────────────────────────────────
export interface GroupedOC {
    group_id: string;
    num_pedido: string | null;
    fec_pedido_cadena: string | null;
    fec_fin_embarque: string | null;
    estado_oc: string | null;
    pedido_sugerido_pz_red_total: number;
    cant_pedida_total: number;
    skus: CpfrSkuDash[];
}

function groupOCs(skus: CpfrSkuDash[]): GroupedOC[] {
    const map = new Map<string, GroupedOC>()
    for (const sku of skus) {
        const key = sku.num_pedido || 'UNSAVED'
        if (!map.has(key)) {
            map.set(key, {
                group_id: key,
                num_pedido: sku.num_pedido,
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
    return Array.from(map.values())
}

const expandedOCGroups = ref<Record<string, boolean>>({})
function toggleOCGroup(storeId: string, groupId: string) {
    const key = `${storeId}_${groupId}`
    expandedOCGroups.value[key] = !expandedOCGroups.value[key]
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
    if (cob < crit) return 'text-rose-500 font-semibold'
    if (cob > crit + 1.0) return 'text-orange-500 font-semibold'
    return 'text-emerald-600 font-semibold'
}

function fillClass(fr: number | null) {
    if (fr === null) return 'text-slate-300'
    const pct = fr * 100
    if (pct >= 90)   return 'text-emerald-600 font-semibold'
    if (pct >= 70)   return 'text-amber-500 font-semibold'
    return 'text-rose-500 font-semibold'
}

function skuRowBgClass(sku: any): string {
    // Producto sin histórico de sellout → fondo amarillo
    if (esSinSellout(sku)) return 'bg-amber-50/70 hover:bg-amber-100/60'
    const fr = calcularFillRateDinamico(sku);
    if (fr === null) return 'bg-white/80 hover:bg-slate-50'
    if (fr === 0) return 'bg-orange-50/60 hover:bg-orange-100/50'
    if (fr > 1.001) return 'bg-sky-50/60 hover:bg-sky-100/50' // Sobre-pedido (tolerancia decimal)
    if (fr >= 1) return 'bg-emerald-50/50 hover:bg-emerald-100/50'
    return 'bg-white/80 hover:bg-slate-50'
}

/**
 * Filas de TIENDA: nivel 3 de la jerarquía, sobre el día oscuro.
 * Fondo claro-medio consistente, con separación visual del día.
 */
function storeRowBgClass(isExpanded: boolean): string {
    return isExpanded
        ? 'bg-slate-100 border-t-2 border-t-slate-300'
        : 'bg-slate-100 border-t-2 border-t-slate-300 hover:bg-slate-200/50'
}

/**
 * Lógica de instock_pct → badge
 * null → gris "—"
 * >= 100 → verde "INSTOCK"
 * >= 50  → amarillo "BAJO"
 * < 50   → rojo "CRÍTICO"
 */
function instockBadge(pct: number | null): { label: string; cls: string } {
    if (pct === null)  return { label: '—',        cls: 'bg-slate-100 text-slate-400' }
    if (pct >= 100)    return { label: 'INSTOCK',  cls: 'bg-emerald-100 text-emerald-700' }
    if (pct >= 50)     return { label: 'BAJO',     cls: 'bg-amber-100 text-amber-700' }
    return                    { label: 'CRÍTICO',  cls: 'bg-rose-100 text-rose-600' }
}

function escenarioCls(esc: 'A' | 'B' | null) {
    if (esc === 'A') return 'bg-sky-100 text-sky-700'
    if (esc === 'B') return 'bg-amber-100 text-amber-700'
    return 'bg-slate-100 text-slate-400'
}

function n(v: number | null | undefined, dec = 1): string {
    if (v == null) return '—'
    return v.toLocaleString('es-MX', { maximumFractionDigits: dec })
}

// Estado del pedido — badge
function estadoBadge(estado: string | null): { label: string; cls: string } {
    if (estado === 'pendiente') return { label: 'Pendiente', cls: 'bg-slate-100 text-slate-500' }
    if (estado === 'borrador')  return { label: 'Borrador',  cls: 'bg-amber-100 text-amber-700' }
    if (estado === 'revision')  return { label: 'Revisión',  cls: 'bg-indigo-100 text-indigo-700' }
    if (estado === 'aprobado')  return { label: 'Aprobado',  cls: 'bg-emerald-100 text-emerald-700' }
    if (estado === 'enviado')   return { label: 'Enviado',   cls: 'bg-blue-100 text-blue-700' }
    if (estado === 'cerrado')   return { label: 'Cerrado',   cls: 'bg-slate-200 text-slate-400' }
    if (estado === 'procesado') return { label: 'Procesado', cls: 'bg-sky-100 text-sky-700' }
    return { label: estado || 'Desconocido', cls: 'bg-slate-100 text-slate-500' }
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
    await store.updateStatus({
        num_pedido: num_pedido,
        year: store.currentWeek.anio,
        week: store.currentWeek.semana,
        estado: estado as any,
    })
}

// Exponer expandedOCGroups para que el padre controle expand/collapse masivo
defineExpose({ expandedOCGroups })

// ── Indicadores de salud por SKU ─────────────────────────────────────────────

/** Caso 1 – Sin histórico de sellout (producto nuevo o sin datos) */
function esSinSellout(sku: any): boolean {
    return !sku.promedio_sellout_kg || sku.promedio_sellout_kg <= 0;
}

/**
 * Caso 2 – Estado de cobertura proyectada:
 *   'ok'       → dentro de criterio ± 0.5
 *   'bajo'     → cobertura < criterio
 *   'sobre'    → cobertura > criterio + 0.5
 *   'sin_datos'→ no hay sellout
 */
function coberturaStatus(sku: any): 'ok' | 'bajo' | 'sobre' | 'sin_datos' {
    if (esSinSellout(sku)) return 'sin_datos';
    const cob = calcularCoberturaDinamica(sku);
    if (cob === null) return 'sin_datos';
    const crit = sku.semanas_objetivo || store.criterio_global || 2.5;
    if (cob < crit) return 'bajo';
    if (cob > crit + 0.5) return 'sobre';
    return 'ok';
}

function coberturaStatusIcon(status: ReturnType<typeof coberturaStatus>): string {
    if (status === 'bajo')     return 'fa-solid fa-triangle-exclamation text-rose-400'
    if (status === 'sobre')    return 'fa-solid fa-arrow-trend-up text-orange-400'
    if (status === 'sin_datos') return 'fa-solid fa-circle-question text-slate-300'
    return ''
}

function coberturaStatusTooltip(status: ReturnType<typeof coberturaStatus>, cob: number | null, crit: number): string {
    if (status === 'bajo')      return `Bajo stock: cobertura ${cob?.toFixed(2)} sem. — criterio: ${crit} sem.`
    if (status === 'sobre')     return `Sobrestock: cobertura ${cob?.toFixed(2)} sem. (umbral: ${(crit + 0.5).toFixed(1)} sem.)`
    if (status === 'sin_datos') return 'Sin histórico de venta promedio'
    return ''
}

/** Caso 3 – Fill Rate: clases de fondo + icono + tooltip */
function fillRateBadge(fr: number | null): { bg: string; text: string; icon: string; tip: string } {
    if (fr === null) return { bg: '', text: 'text-slate-400', icon: '', tip: 'Sin pedido cadena' }
    const pct = fr * 100
    if (pct === 0)    return { bg: 'bg-rose-50',    text: 'text-rose-600 font-bold',    icon: 'fa-solid fa-ban text-rose-400',              tip: 'Fill Rate 0% — el pedido sugerido es 0 frente a lo que pide la cadena' }
    if (pct < 80)     return { bg: 'bg-amber-50',   text: 'text-amber-700 font-semibold', icon: 'fa-solid fa-arrow-down text-amber-400',   tip: `Fill Rate bajo: ${pct.toFixed(1)}% — se cubre menos del 80% del pedido cadena` }
    if (pct <= 100)   return { bg: 'bg-emerald-50', text: 'text-emerald-700 font-semibold', icon: 'fa-solid fa-check text-emerald-400',    tip: `Fill Rate: ${pct.toFixed(1)}%` }
    // > 100%: sugerimos más que lo que pide la cadena
    return              { bg: 'bg-sky-50',     text: 'text-sky-700 font-semibold',    icon: 'fa-solid fa-arrow-up text-sky-400',          tip: `Sobre-pedido: ${pct.toFixed(1)}% del pedido cadena — el algoritmo sugiere más de lo solicitado` }
}
</script>

<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-auto">

    <!-- Sin datos -->
    <div
      v-if="!store.dias.length"
      class="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400 p-12"
    >
      <i class="fa-solid fa-box-open text-3xl"></i>
      <p class="text-sm font-medium">No hay pedidos para los filtros seleccionados.</p>
      <p class="text-xs text-slate-300">Ajusta los filtros o la semana actual.</p>
    </div>

    <!-- ── Tabla jerárquica ──────────────────────────────────────────────── -->
    <div v-else class="overflow-x-auto">
      <table class="w-full text-xs">

        <!-- Cabecera fija: NIVEL 1 — el más oscuro, ancla la tabla -->
        <thead class="sticky top-0 z-20">
          <tr class="text-[10px] uppercase tracking-wider text-slate-300 bg-slate-800 border-b border-slate-700">
            <th class="px-4 py-3 text-left font-black w-[240px]">Tienda / SKU</th>
            <th class="px-3 py-3 text-left font-black">UPC</th>
            <th class="px-3 py-3 text-left font-black">Jefatura</th>
            <th class="px-3 py-3 text-right font-black">Inv.<br>Actual (pz)</th>
            <th class="px-3 py-3 text-right font-black">Sellout Prom.<br>Semanal (pz)</th>
            <th class="px-3 py-3 text-right font-black">Criterio<br>(Sem.)</th>
            <th class="px-3 py-3 text-right font-black">Cobertura<br>(Sem.)</th>
            <th class="px-3 py-3 text-right font-black text-brand-300 bg-brand-900/40 border-x border-x-brand-700/50">Pedido<br>Sugerido</th>
            <th class="px-3 py-3 text-right font-black">Pedido<br>Cadena</th>
            <th class="px-3 py-3 text-left font-black">Detalle OC</th>
            <th class="px-3 py-3 text-right font-black">Fill Rate</th>
            <th class="px-3 py-3 text-center font-black">INSTOCK</th>
            <th class="px-2 py-3 text-center font-black w-10"></th>
          </tr>
        </thead>

        <tbody>

          <!-- ══ SECCIÓN POR DÍA ══ -->
          <template v-for="dia in store.dias" :key="dia.dia_num">

            <!-- NIVEL 2: DÍA — un paso más claro que el thead, mismo lenguaje oscuro -->
            <tr
              class="cursor-pointer select-none group border-b border-slate-500 bg-slate-600 hover:bg-slate-500 transition-colors"
              @click="toggleDay(dia.dia_num)"
            >
              <td colspan="13" class="px-4 py-2.5">
                <div class="flex items-center gap-3">
                  <i
                    class="fa-solid text-slate-400 text-[11px] transition-transform duration-200 group-hover:text-white"
                    :class="collapsedDays[dia.dia_num] ? 'fa-chevron-right' : 'fa-chevron-down'"
                  ></i>
                  <span class="text-xs font-black text-white uppercase tracking-widest">{{ dia.dia_nombre }}</span>
                  <span class="text-[10px] text-slate-400 font-medium ml-2 border-l border-slate-600 pl-3">
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

                <!-- NIVEL 3: TIENDA — claro-medio, separador fuerte desde el día oscuro -->
                <tr
                  class="cursor-pointer transition-colors border-b relative"
                  :class="[
                    store.expandedStores[tienda.id_cliente] ? 'border-slate-300' : 'border-slate-200',
                    storeRowBgClass(!!store.expandedStores[tienda.id_cliente])
                  ]"
                  @click="store.toggleStore(tienda.id_cliente)"
                >
                  <!-- Tienda -->
                  <td class="px-4 py-3" colspan="2">
                    <div class="flex items-start gap-2.5">
                      <i
                        class="fa-solid fa-chevron-right text-slate-300 text-[10px] transition-transform duration-200 shrink-0 mt-0.5"
                        :class="[store.expandedStores[tienda.id_cliente] ? 'rotate-90 text-brand-500' : 'group-hover:text-slate-400']"
                      ></i>
                      <div class="min-w-0">
                        <p class="font-bold text-slate-800 truncate leading-tight">{{ tienda.nombre_tienda }}</p>
                        <p class="text-[10px] text-slate-400 mt-0.5">
                          {{ tienda.total_skus }} SKUs
                          <span v-if="tienda.fec_envio">· Env. {{ tienda.fec_envio }}</span>
                        </p>
                      </div>
                    </div>
                  </td>

                  <!-- Jefatura -->
                  <td class="px-3 py-3 text-slate-500 max-w-[160px] truncate" :title="tienda.jefatura">
                    {{ tienda.jefatura }}
                  </td>

                  <!-- Inv. Actual (pz) -->
                  <td class="px-3 py-3 text-right text-slate-600 text-[11px] cursor-help"
                      :title="n(tienda.resumen.inv_actual_kg, 2) + ' kg totales'">
                    <span class="border-b border-dashed border-slate-300">{{ n(tienda.resumen.inv_actual_pz, 2) }}</span>
                  </td>

                  <!-- Vta. Prom. Semanal (pz) -->
                  <td class="px-3 py-3 text-right text-slate-600 text-[11px] cursor-help"
                      :title="n(tienda.resumen.promedio_sellout_kg, 2) + ' kg totales'">
                    <span class="border-b border-dashed border-slate-300">{{ n(tienda.resumen.promedio_sellout_pz, 2) }}</span>
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
                  <td class="px-3 py-3 text-right font-black text-brand-700 bg-brand-50 border-x border-brand-100 text-sm tracking-tight relative">
                    <!-- Sutil highlight a la celda -->
                    <div class="absolute inset-y-0 left-0 w-1 bg-brand-500/20"></div>
                    {{ tienda.resumen.pedido_sugerido_pz_red.toLocaleString('es-MX') }}
                  </td>

                  <!-- Pedido Cadena (cant_pedida de la OC) -->
                  <td class="px-3 py-2.5 text-right font-semibold text-slate-600">
                    {{ tienda.resumen.cant_pedida_total.toLocaleString('es-MX') }}
                  </td>

                  <!-- Detalle OC (Vacío en macro) -->
                  <td></td>

                  <!-- Fill Rate -->
                  <td class="px-3 py-2.5 text-right font-medium" :class="fillClass(tienda.resumen.fill_rate)">
                    {{ tienda.resumen.fill_rate != null ? (tienda.resumen.fill_rate * 100).toFixed(1) + '%' : '—' }}
                  </td>

                  <!-- INSTOCK -->
                  <td class="px-3 py-3 text-center">
                    <span
                      class="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full"
                      :class="instockBadge(tienda.resumen.instock).cls"
                    >
                      {{ instockBadge(tienda.resumen.instock).label }}
                    </span>
                  </td>

                  <!-- Acciones tienda -->
                  <td class="px-2 py-3" @click.stop>
                    <div class="flex items-center gap-1 justify-center">
                      <!-- Config -->
                      <button
                        class="text-slate-300 hover:text-brand-500 transition-colors p-1 rounded"
                        title="Configuración de tienda"
                        @click.stop="emit('open-config', tienda.id_cliente, tienda.nombre_tienda)"
                      >
                        <i class="fa-solid fa-gear text-[11px]"></i>
                      </button>
                    </div>
                  </td>
                </tr>

                <!-- ── Filas de SKUs ── -->
                <template v-if="store.expandedStores[tienda.id_cliente]">

                  <!-- Empty -->
                  <tr v-if="!tienda.skus.length">
                    <td colspan="13" class="px-8 py-4 bg-slate-50/60 text-slate-400 text-sm text-center border-b border-slate-100">
                      Sin SKUs registrados para esta tienda.
                    </td>
                  </tr>

                  <!-- OC Groups -->
                  <template v-else v-for="ocGroup in groupOCs(tienda.skus)" :key="ocGroup.group_id">
                    
                    <!-- NIVEL 4: OC — slate-50 con rail izquierdo oscuro. Abre visualmente el bloque. -->
                    <tr
                      class="cursor-pointer transition-colors text-[11px] border-b group/row"
                      :class="expandedOCGroups[`${tienda.id_cliente}_${ocGroup.group_id}`] !== false
                        ? 'bg-slate-50 border-b-slate-200 border-l-[4px] border-l-slate-500'
                        : 'bg-slate-50 hover:bg-slate-100 border-b-slate-100 border-l-[4px] border-l-slate-400'"
                      @click="toggleOCGroup(tienda.id_cliente, ocGroup.group_id)"
                    >
                      <!-- Etiqueta OC -->
                      <td colspan="7" class="pl-7 pr-3 py-2 text-slate-700 font-bold border-l border-slate-50">
                        <div class="flex items-center gap-1.5 min-w-0">
                          <i
                            class="fa-solid fa-chevron-right text-slate-300 text-[10px] transition-transform duration-200 shrink-0 mt-px mr-1"
                            :class="expandedOCGroups[`${tienda.id_cliente}_${ocGroup.group_id}`] !== false ? 'rotate-90 text-brand-500' : 'group-hover/row:text-slate-400'"
                          ></i>
                          <span class="truncate uppercase tracking-wide text-[10px] text-slate-500 mr-2">Orden de Compra:</span>
                          <!-- Número + fechas compactas en popover -->
                          <span class="relative group/ocnum">
                            <span class="text-[12px] font-black tracking-tight cursor-default" :class="ocGroup.num_pedido ? 'text-brand-600' : 'text-slate-400 italic'">
                              {{ ocGroup.num_pedido || 'Sin número' }}
                            </span>
                            <!-- Popover de fechas: aparece al hover sobre el número -->
                            <div
                              v-if="ocGroup.fec_pedido_cadena || ocGroup.fec_fin_embarque"
                              class="absolute left-0 top-full z-30 mt-1.5 hidden group-hover/ocnum:flex flex-col gap-1 bg-slate-800 text-white rounded-lg shadow-xl px-3 py-2.5 min-w-[180px] pointer-events-none"
                            >
                              <div v-if="ocGroup.fec_pedido_cadena" class="flex items-center gap-2 text-[10px]">
                                <i class="fa-regular fa-calendar-check text-slate-400"></i>
                                <span class="text-slate-400">Levantado:</span>
                                <span class="font-mono font-bold text-slate-100">{{ ocGroup.fec_pedido_cadena.slice(0, 10) }}</span>
                              </div>
                              <div v-if="ocGroup.fec_fin_embarque" class="flex items-center gap-2 text-[10px]">
                                <i class="fa-solid fa-triangle-exclamation text-amber-400"></i>
                                <span class="text-slate-400">Fin embarque:</span>
                                <span class="font-mono font-bold text-amber-300">{{ ocGroup.fec_fin_embarque.slice(0, 10) }}</span>
                              </div>
                              <!-- Puntero del popover -->
                              <div class="absolute -top-1 left-3 w-2 h-2 bg-slate-800 rotate-45"></div>
                            </div>
                          </span>
                          <!-- Indicador de fecha fin embarque urgente (siempre visible si existe) -->
                          <span
                            v-if="ocGroup.fec_fin_embarque"
                            class="ml-1 text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded cursor-help"
                            :title="`Fin embarque: ${ocGroup.fec_fin_embarque.slice(0, 10)}`"
                          >
                            <i class="fa-solid fa-calendar-xmark mr-0.5"></i>{{ ocGroup.fec_fin_embarque.slice(0, 10) }}
                          </span>
                          <div v-if="ocGroup.estado_oc" class="relative group/estado ml-1 flex">
                            <span
                              class="font-bold px-1.5 py-0.5 rounded text-[9px] border uppercase cursor-pointer transition-colors"
                              :class="estadoBadge(ocGroup.estado_oc).cls"
                              title="Cambiar estado"
                            >
                              {{ estadoBadge(ocGroup.estado_oc).label }}
                            </span>
                            <!-- Dropdown opciones -->
                            <div class="hidden group-hover/estado:flex absolute left-0 top-full z-20 mt-1 flex-col bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden text-[10px] font-semibold min-w-[90px]">
                              <button
                                v-if="ocGroup.estado_oc === 'pendiente'"
                                class="px-3 py-1.5 text-left hover:bg-amber-50 text-amber-600"
                                @click.stop="changeOCStatus(ocGroup.num_pedido, 'borrador')"
                              >Borrador</button>
                              <button
                                v-if="['pendiente', 'borrador'].includes(ocGroup.estado_oc)"
                                class="px-3 py-1.5 text-left hover:bg-indigo-50 text-indigo-600"
                                @click.stop="changeOCStatus(ocGroup.num_pedido, 'revision')"
                              >Revisión</button>
                            </div>
                          </div>
                          <span class="bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold px-1.5 py-0.5 rounded text-[9px] ml-1">{{ ocGroup.skus.length }} SKUs</span>
                        </div>
                      </td>

                      <!-- Pedido Sugerido SUM -->
                      <td class="px-3 py-2 text-right font-bold text-brand-700 bg-brand-50/70 border-x border-brand-100/70 text-sm tracking-tight relative">
                        {{ n(ocGroup.pedido_sugerido_pz_red_total, 0) }}
                      </td>

                      <!-- Pedido Cadena SUM -->
                      <td class="px-3 py-2 text-right font-bold text-slate-700 border-l border-slate-50">
                        {{ n(ocGroup.cant_pedida_total, 0) }}
                      </td>

                      <!-- Detalle Fechas: removido de la tabla, ahora en popover del número OC -->
                      <td class="px-3 py-2 text-center border-l border-slate-50" colspan="4">
                        <span class="text-[10px] text-slate-300 italic">ver OC</span>
                      </td>
                    </tr>

                    <!-- Children SKU Rows -->
                    <template v-if="expandedOCGroups[`${tienda.id_cliente}_${ocGroup.group_id}`] !== false">
                      <!-- NIVEL 5: SKU — riel continuo slate-300 que conecta visualmente con la OC padre -->
                      <tr
                        v-for="(sku, skuIdx) in ocGroup.skus"
                        :key="sku.sku_muliix ? sku.sku_muliix : (sku.oc_id + '_' + skuIdx)"
                        class="transition-colors text-[11px] group/row border-l-[4px] border-l-slate-300"
                        :class="[
                          skuRowBgClass(sku),
                          skuIdx === ocGroup.skus.length - 1
                            ? 'border-b-2 border-b-slate-300'
                            : 'border-b border-b-slate-100'
                        ]"
                      >
                        <!-- Nombre SKU -->
                        <td class="pl-12 pr-3 py-1.5 text-slate-700 font-medium border-l border-slate-50" :title="sku.sku_nombre">
                          <div class="flex items-center gap-1.5 min-w-0">
                            <div class="w-2 h-px bg-slate-300 mr-1 content-['']"></div>  
                            <span
                              class="shrink-0 inline-block text-[9px] font-bold px-1.5 py-0.5 rounded border"
                              :class="escenarioCls(sku.escenario)"
                              :title="sku.escenario === 'B' ? 'Pedido recalculado' : ''"
                            >{{ sku.escenario ?? '—' }}</span>
                            <span class="truncate max-w-[170px]">{{ sku.sku_nombre }}</span>
                          </div>
                        </td>

                        <!-- UPC -->
                        <td class="px-3 py-1.5 text-slate-500 text-[10px] font-mono border-l border-slate-50 bg-white">{{ sku.upc_cadena ?? '—' }}</td>

                        <!-- SKU ID (muliix) -->
                        <td class="px-3 py-1.5 text-slate-400 text-[10px] italic border-l border-slate-50 group-hover/row:text-slate-500">{{ sku.sku_muliix ?? '—' }}</td>

                        <!-- Inv. Actual (pz) -->
                        <td class="px-3 py-1.5 text-right text-slate-600 border-l border-slate-50 cursor-help"
                            :title="`${n(sku.inv_actual_kg, 2)} kg (Inv. uni. = ${sku.unidad_inventario} kg/pz)`">
                          <span class="border-b border-dashed border-slate-300">{{ n(sku.inv_actual_pz, 2) }}</span>
                        </td>

                        <!-- Vta. Prom. Semanal (pz) -->
                        <td class="px-3 py-1.5 text-right text-slate-600 border-l border-slate-50 relative cursor-pointer group/cell hover:bg-slate-50/80 transition-colors"
                            @click.stop="toggleSellout(tienda.id_cliente + '_' + sku.sku_cadena)">
                          
                          <div class="cursor-help" :title="`${n(sku.promedio_sellout_kg, 2)} kg (Inv. uni. = ${sku.unidad_inventario} kg/pz)`">
                            <span class="border-b border-dashed border-slate-300 group-hover/cell:text-brand-600 transition-colors">{{ n(sku.promedio_sellout_pz, 2) }}</span>
                          </div>

                          <!-- Popover Historial Sellout -->
                          <div v-if="openSelloutId === (tienda.id_cliente + '_' + sku.sku_cadena)"
                               class="absolute bottom-full right-0 mb-1.5 z-50 bg-white border border-slate-300 shadow-xl shadow-slate-200/50 rounded-lg p-3 w-[220px] cursor-default"
                               @click.stop>
                              <div class="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
                                  <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><i class="fa-solid fa-chart-line text-brand-500"></i> Histórico Sellout</span>
                                  <button @click.stop="closeSellout" class="text-slate-300 hover:text-rose-500 transition-colors p-1"><i class="fa-solid fa-xmark text-[11px]"></i></button>
                              </div>
                              <table class="w-full text-[10px] text-slate-600 leading-tight">
                                  <thead>
                                      <tr class="text-left text-slate-400 border-b border-slate-50">
                                          <th class="py-1 font-medium text-center">Semana</th>
                                          <th class="py-1 text-right font-medium">Peso (kg)</th>
                                          <th class="py-1 text-right font-bold text-brand-700">Cant. (pz)</th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      <tr v-for="s in (sku.sellout_semanas || [])" :key="s.semana" class="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                          <td class="py-1.5 font-semibold text-slate-700 text-center">S{{ s.semana }}</td>
                                          <td class="py-1.5 text-right">{{ n(s.kg, 2) }}</td>
                                          <td class="py-1.5 text-right text-brand-600 font-bold bg-brand-50/50">{{ n(s.kg / (sku.unidad_inventario || 1), 2) }}</td>
                                      </tr>
                                      <tr v-if="!(sku.sellout_semanas && sku.sellout_semanas.length)">
                                          <td colspan="3" class="py-4 text-center text-slate-400">Sin ventas en histórico</td>
                                      </tr>
                                  </tbody>
                                  <tfoot v-if="sku.sellout_semanas && sku.sellout_semanas.length">
                                      <tr class="bg-slate-50 border-t-2 border-slate-200">
                                          <td class="py-1.5 font-bold text-slate-800 text-center uppercase tracking-widest text-[9px]">Prom.</td>
                                          <td class="py-1.5 text-right font-bold text-slate-800">{{ n(sku.promedio_sellout_kg, 2) }}</td>
                                          <td class="py-1.5 text-right font-bold text-brand-700 bg-brand-100/50">{{ n(sku.promedio_sellout_pz, 2) }}</td>
                                      </tr>
                                  </tfoot>
                              </table>
                          </div>
                        </td>

                        <!-- Criterio (sem. objetivo) -->
                        <td class="px-3 py-1.5 text-right text-slate-500 border-l border-slate-50">
                          {{ sku.semanas_objetivo }}
                        </td>

                        <!-- Semanas Actuales (cobertura dinamica) -->
                        <td
                          class="px-3 py-1.5 text-right font-bold border-l border-slate-50 relative"
                          :class="cobClass(calcularCoberturaDinamica(sku))"
                          :title="coberturaStatusTooltip(coberturaStatus(sku), calcularCoberturaDinamica(sku), sku.semanas_objetivo || store.criterio_global || 2.5)"
                        >
                          <span class="flex items-center justify-end gap-1">
                            <i v-if="coberturaStatusIcon(coberturaStatus(sku))" :class="coberturaStatusIcon(coberturaStatus(sku))" class="text-[9px] flex-shrink-0"></i>
                            {{ calcularCoberturaDinamica(sku) != null ? calcularCoberturaDinamica(sku)!.toFixed(2) : '—' }}
                          </span>
                        </td>

                        <!-- Pedido Sugerido (editable Excel-style) -->
                        <td class="px-2 py-1.5 align-middle bg-brand-50 border-x border-brand-100 relative group/cell">
                          <div class="absolute inset-y-0 left-0 w-1 bg-brand-500/10"></div>
                          
                          <div v-if="editingId === sku.sku_muliix && sku.sku_muliix" class="flex items-center gap-1.5 justify-end h-full">
                            <input
                              v-model.number="editValue"
                              type="number" min="0" :step="sku.pzas_bolsa || 1"
                              class="w-full h-7 rounded-sm border-2 border-brand-500 px-1 text-xs text-right font-bold text-slate-800 shadow-inner focus:outline-none"
                              autofocus
                              @keyup.enter="confirmEdit(sku, tienda.id_cliente)"
                              @keyup.escape="cancelEdit()"
                            />
                            <div class="flex flex-col gap-0.5">
                              <button class="bg-emerald-500 text-white rounded w-5 h-5 flex items-center justify-center hover:bg-emerald-600 shadow-sm" @click="confirmEdit(sku, tienda.id_cliente)">
                                <i :class="saving ? 'fa-solid fa-circle-notch fa-spin text-[8px]' : 'fa-solid fa-check text-[10px]'"></i>
                              </button>
                            </div>
                          </div>
                          <button
                            v-else
                            class="w-full text-right bg-white border border-slate-300 hover:border-brand-500 hover:shadow-sm rounded shadow-sm px-2 py-1 flex items-center justify-between transition-all"
                            :class="{ 'ring-2 ring-emerald-400 border-transparent bg-emerald-50': savedId === sku.sku_muliix }"
                            :title="esSinSellout(sku)
                              ? '⚠️ Sin sellout promedio — producto nuevo o sin histórico. Se usa el pedido cadena como referencia.'
                              : 'Clic para editar cantidad'"
                            @click="startEdit(sku)"
                          >
                            <span class="flex items-center gap-1">
                              <i v-if="esSinSellout(sku)" class="fa-solid fa-seedling text-[9px] text-amber-400" title="Sin sellout promedio"></i>
                              <i v-else class="fa-solid fa-pen text-[9px] text-slate-300 group-hover/cell:text-brand-500 transition-colors"></i>
                            </span>
                            <span class="text-[12px] font-bold text-slate-700" :class="{ 'text-brand-700': sku.pedido_sugerido_pz_red > 0 }">{{ n(sku.pedido_sugerido_pz_red, 0) }}</span>
                          </button>
                        </td>

                        <!-- Pedido Cadena (cant_pedida) -->
                        <td class="px-3 py-1.5 text-right font-semibold text-slate-700 border-l border-slate-50 bg-white">
                          {{ n(sku.cant_pedida, 0) }}
                        </td>

                        <!-- Detalle OC (Ya definido en padre) -->
                        <td class="px-3 py-1.5 text-center text-slate-300 border-l border-slate-50 bg-slate-50/20 text-[10px] italic">
                          —
                        </td>

                        <!-- Fill Rate -->
                        <td
                          class="px-3 py-1.5 text-right font-medium border-l border-slate-50"
                          :class="[fillRateBadge(calcularFillRateDinamico(sku)).bg, fillRateBadge(calcularFillRateDinamico(sku)).text]"
                          :title="fillRateBadge(calcularFillRateDinamico(sku)).tip"
                        >
                          <span class="flex items-center justify-end gap-1">
                            <i v-if="fillRateBadge(calcularFillRateDinamico(sku)).icon" :class="fillRateBadge(calcularFillRateDinamico(sku)).icon" class="text-[9px] flex-shrink-0"></i>
                            {{ calcularFillRateDinamico(sku) != null ? (calcularFillRateDinamico(sku)! * 100).toFixed(1) + '%' : '—' }}
                          </span>
                        </td>

                        <!-- INSTOCK per SKU -->
                        <td class="px-3 py-1.5 text-center border-l border-slate-50 bg-white">
                          <span
                            class="inline-block text-[10px] font-bold px-2 py-0.5 rounded border block w-fit mx-auto"
                            :class="instockBadge(sku.instock).cls"
                          >
                            {{ instockBadge(sku.instock).label }}
                          </span>
                        </td>

                        <!-- vacío -->
                        <td class="border-l border-slate-50 bg-white"></td>
                      </tr>
                    </template>

                  </template>

                </template>

              </template>
            </template>

          </template>
        </tbody>
      </table>
    </div>

  </div>
</template>