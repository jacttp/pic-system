<script setup lang="ts">
// src/modules/CPFR/components/CpfrOrderTable.vue
// Tabla jerárquica: Día → Tienda (macro) → SKUs (detalle)
// Columnas: INV.ACTUAL | VENTA PROM.SEM | CRITERIO | SEM.ACTUALES | PEDIDO SUGERIDO | PEDIDO CADENA | FILL RATE | INSTOCK
import { ref } from 'vue'
import { useCpfrStore } from '../stores/cpfrStore'
import type { CpfrSkuDash, CpfrStoreDash } from '../types/cpfrTypes'

const store = useCpfrStore()

const emit = defineEmits<{
    (e: 'open-config', id_cliente: string, nombre_tienda: string): void
}>()

// ── Inline edit ───────────────────────────────────────────────────────────────
const editingId = ref<number | null>(null)  // tracks oc_id
const editValue = ref<number>(0)
const saving    = ref(false)
const savedId   = ref<number | null>(null)

function startEdit(sku: CpfrSkuDash) {
    editingId.value = sku.oc_id
    editValue.value = sku.pedido_sugerido_pz
}
function cancelEdit() { editingId.value = null }

async function confirmEdit(sku: CpfrSkuDash, id_cliente: string) {
    if (editValue.value === sku.pedido_sugerido_pz) { cancelEdit(); return }
    saving.value = true
    const ok = await store.adjustSku(sku.oc_id, { cantidad_final_pz: editValue.value }, id_cliente)
    saving.value = false
    if (ok) { savedId.value = sku.oc_id; setTimeout(() => { savedId.value = null }, 1800) }
    editingId.value = null
}

// ── Secciones de días colapsadas ──────────────────────────────────────────────
const collapsedDays = ref<Record<number, boolean>>({})
function toggleDay(dia_num: number) {
    collapsedDays.value[dia_num] = !collapsedDays.value[dia_num]
}

// ── Utilities de estilo ───────────────────────────────────────────────────────

function cobClass(cob: number | null) {
    if (cob === null) return 'text-slate-400'
    if (cob < 2.0)   return 'text-rose-500 font-semibold'
    if (cob > 3.0)   return 'text-orange-500 font-semibold'
    return 'text-emerald-600 font-semibold'
}

function fillClass(fr: number | null) {
    if (fr === null) return 'text-slate-300'
    if (fr >= 90)   return 'text-emerald-600 font-semibold'
    if (fr >= 70)   return 'text-amber-500 font-semibold'
    return 'text-rose-500 font-semibold'
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
function estadoBadge(estado: CpfrStoreDash['estado_pedido']): { label: string; cls: string } {
    if (estado === 'procesado') return { label: 'Procesado', cls: 'bg-sky-100 text-sky-700' }
    if (estado === 'cerrado')   return { label: 'Cerrado',   cls: 'bg-slate-100 text-slate-500' }
    return { label: 'Pendiente', cls: 'bg-amber-100 text-amber-600' }
}

async function changeStatus(store_row: CpfrStoreDash, estado: CpfrStoreDash['estado_pedido']) {
    if (!store.currentWeek) return
    await store.updateStatus({
        id_cliente: store_row.id_cliente,
        year: store.currentWeek.anio,
        week: store.currentWeek.semana,
        estado,
    })
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

        <!-- Cabecera fija -->
        <thead class="sticky top-0 z-20 shadow-sm">
          <tr class="text-[10px] uppercase tracking-wider text-slate-600 bg-slate-100 border-b-2 border-slate-200 shadow-sm relative">
            <th class="px-4 py-3 text-left font-bold w-[240px] bg-slate-100">Tienda / SKU</th>
            <th class="px-3 py-3 text-left font-bold bg-slate-100">Jefatura</th>
            <th class="px-3 py-3 text-right font-bold bg-slate-100">Inv.<br>Actual (kg)</th>
            <th class="px-3 py-3 text-right font-bold bg-slate-100">Vta. Prom.<br>Semanal (kg)</th>
            <th class="px-3 py-3 text-right font-bold bg-slate-100">Criterio<br>(Sem.)</th>
            <th class="px-3 py-3 text-right font-bold bg-slate-100">Semanas<br>Actuales</th>
            <th class="px-3 py-3 text-right font-black text-brand-700 bg-brand-50 border-b-2 border-brand-200 shadow-sm border-x border-x-brand-100">Pedido<br>Sugerido</th>
            <th class="px-3 py-3 text-right font-bold bg-slate-100">Pedido<br>Cadena</th>
            <th class="px-3 py-3 text-right font-bold bg-slate-100">Fill Rate</th>
            <th class="px-3 py-3 text-center font-bold bg-slate-100">INSTOCK</th>
            <th class="px-2 py-3 text-center font-bold bg-slate-100 w-10"></th>
          </tr>
        </thead>

        <tbody>

          <!-- ══ SECCIÓN POR DÍA ══ -->
          <template v-for="dia in store.dias" :key="dia.dia_num">

            <!-- Separador de día colapsable -->
            <tr
              class="cursor-pointer select-none group border-b border-slate-700 bg-slate-800 hover:bg-slate-700 transition-colors"
              @click="toggleDay(dia.dia_num)"
            >
              <td colspan="11" class="px-4 py-2.5">
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

                <!-- ── Fila MACRO de tienda ── -->
                <tr
                  class="cursor-pointer transition-colors border-b hover:bg-slate-50 relative"
                  :class="store.expandedStores[tienda.id_cliente] ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100'"
                  @click="store.toggleStore(tienda.id_cliente)"
                >
                  <!-- Tienda -->
                  <td class="px-4 py-3">
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

                  <!-- Inv. Actual (kg) -->
                  <td class="px-3 py-3 text-right text-slate-600 text-[11px]">
                    {{ n(tienda.resumen.inv_actual_kg, 0) }}
                  </td>

                  <!-- Vta. Prom. Semanal (kg) -->
                  <td class="px-3 py-3 text-right text-slate-600 text-[11px]">
                    {{ n(tienda.resumen.venta_prom_semanal_kg, 1) }}
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
                    {{ tienda.resumen.pedido_sugerido_pz.toLocaleString('es-MX') }}
                  </td>

                  <!-- Pedido Cadena (cant_pedida de la OC) -->
                  <td class="px-3 py-2.5 text-right font-semibold text-slate-600">
                    {{ tienda.resumen.cant_pedida_total.toLocaleString('es-MX') }}
                  </td>

                  <!-- Fill Rate -->
                  <td class="px-3 py-2.5 text-right font-medium" :class="fillClass(tienda.resumen.fill_rate)">
                    {{ tienda.resumen.fill_rate != null ? tienda.resumen.fill_rate.toFixed(1) + '%' : '—' }}
                  </td>

                  <!-- INSTOCK -->
                  <td class="px-3 py-3 text-center">
                    <span
                      class="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full"
                      :class="instockBadge(tienda.resumen.instock_pct).cls"
                    >
                      {{ instockBadge(tienda.resumen.instock_pct).label }}
                    </span>
                  </td>

                  <!-- Acciones tienda -->
                  <td class="px-2 py-3" @click.stop>
                    <div class="flex items-center gap-1 justify-center">
                      <!-- Badge estado + dropdown -->
                      <div class="relative group/estado">
                        <span
                          class="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer"
                          :class="estadoBadge(tienda.estado_pedido).cls"
                          :title="'Cambiar estado'"
                        >{{ estadoBadge(tienda.estado_pedido).label }}</span>
                        <!-- Dropdown opciones -->
                        <div class="hidden group-hover/estado:flex absolute right-0 top-full z-20 mt-1 flex-col bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden text-[10px] font-semibold min-w-[90px]">
                          <button
                            v-if="tienda.estado_pedido !== 'pendiente'"
                            class="px-3 py-1.5 text-left hover:bg-amber-50 text-amber-600"
                            @click.stop="changeStatus(tienda, 'pendiente')"
                          >Pendiente</button>
                          <button
                            v-if="tienda.estado_pedido !== 'procesado'"
                            class="px-3 py-1.5 text-left hover:bg-sky-50 text-sky-600"
                            @click.stop="changeStatus(tienda, 'procesado')"
                          >Procesado</button>
                          <button
                            v-if="tienda.estado_pedido !== 'cerrado'"
                            class="px-3 py-1.5 text-left hover:bg-slate-50 text-slate-500"
                            @click.stop="changeStatus(tienda, 'cerrado')"
                          >Cerrado</button>
                        </div>
                      </div>
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
                    <td colspan="11" class="px-8 py-4 bg-slate-50/60 text-slate-400 text-sm text-center border-b border-slate-100">
                      Sin SKUs registrados para esta tienda.
                    </td>
                  </tr>

                  <!-- SKU rows -->
                  <tr
                    v-else
                    v-for="sku in tienda.skus"
                    :key="sku.oc_id"
                    class="bg-white hover:bg-slate-50 transition-colors text-[11px] border-b border-slate-100"
                  >
                    <!-- Nombre SKU -->
                    <td class="pl-10 pr-3 py-2 text-slate-700 font-medium" :title="sku.sku_nombre">
                      <div class="flex items-center gap-1.5 min-w-0">
                        <span
                          class="shrink-0 inline-block text-[9px] font-bold px-1.5 py-0.5 rounded"
                          :class="escenarioCls(sku.escenario)"
                          :title="sku.escenario === 'B' ? 'Pedido recalculado' : ''"
                        >{{ sku.escenario ?? '—' }}</span>
                        <span class="truncate max-w-[170px]">{{ sku.sku_nombre }}</span>
                      </div>
                      <p v-if="sku.upc_cadena" class="text-[9px] text-slate-300 font-mono mt-0.5 pl-5"
                         :title="`UPC: ${sku.upc_cadena}`">{{ sku.upc_cadena }}</p>
                    </td>

                    <!-- SKU ID (muliix) -->
                    <td class="px-3 py-2 text-slate-300 text-[10px] italic">{{ sku.sku_muliix ?? '—' }}</td>

                    <!-- Inv. Actual (kg) -->
                    <td class="px-3 py-2 text-right text-slate-600">
                      {{ n(sku.inv_actual_kg, 2) }}
                    </td>

                    <!-- Vta. Prom. Semanal (kg) -->
                    <td class="px-3 py-2 text-right text-slate-600">
                      {{ n(sku.venta_prom_semanal_kg, 2) }}
                    </td>

                    <!-- Criterio (sem. objetivo) -->
                    <td class="px-3 py-2 text-right text-slate-500">
                      {{ sku.semanas_objetivo }}
                    </td>

                    <!-- Semanas Actuales (cobertura_actual) -->
                    <td
                      class="px-3 py-2 text-right font-bold"
                      :class="cobClass(sku.cobertura_actual)"
                      :title="sku.cobertura_actual === null ? 'Sin datos de venta'
                             : sku.cobertura_actual < 2.0 ? 'Riesgo desabasto'
                             : sku.cobertura_actual > 3.0 ? 'Sobrestock' : 'Cobertura OK'"
                    >
                      {{ sku.cobertura_actual != null ? sku.cobertura_actual.toFixed(2) : '—' }}
                    </td>

                    <!-- Pedido Sugerido (editable Excel-style) -->
                    <td class="px-2 py-1.5 align-middle bg-brand-50 border-x border-brand-100 relative group/cell">
                      <!-- Resalte sutil vertical -->
                      <div class="absolute inset-y-0 left-0 w-1 bg-brand-500/10"></div>
                      
                      <div v-if="editingId === sku.oc_id" class="flex items-center gap-1.5 justify-end h-full">
                        <input
                          v-model.number="editValue"
                          type="number" min="0" step="1"
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
                        :class="{ 'ring-2 ring-emerald-400 border-transparent bg-emerald-50': savedId === sku.oc_id }"
                        title="Doble clic o clic para editar cantidad"
                        @click="startEdit(sku)"
                      >
                        <i class="fa-solid fa-pen text-[9px] text-slate-300 group-hover/cell:text-brand-500 transition-colors mr-2"></i>
                        <span class="text-[12px] font-bold text-slate-700" :class="{ 'text-brand-700': sku.pedido_sugerido_pz > 0 }">{{ n(sku.pedido_sugerido_pz, 0) }}</span>
                      </button>
                    </td>

                    <!-- Pedido Cadena (cant_pedida) -->
                    <td class="px-3 py-2 text-right font-semibold text-slate-700">
                      {{ n(sku.cant_pedida, 0) }}
                    </td>

                    <!-- Fill Rate (solo si no es null) -->
                    <td class="px-3 py-2 text-right" :class="fillClass(sku.fill_rate)">
                      {{ sku.fill_rate != null ? sku.fill_rate.toFixed(1) + '%' : '—' }}
                    </td>

                    <!-- INSTOCK per SKU -->
                    <td class="px-3 py-2 text-center">
                      <span
                        class="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full"
                        :class="instockBadge(sku.instock_pct).cls"
                      >
                        {{ instockBadge(sku.instock_pct).label }}
                      </span>
                    </td>

                    <!-- vacío -->
                    <td></td>
                  </tr>

                </template>

              </template>
            </template>

          </template>
        </tbody>
      </table>
    </div>

  </div>
</template>