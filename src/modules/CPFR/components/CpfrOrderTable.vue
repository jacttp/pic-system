<script setup lang="ts">
// src/modules/CPFR/components/CpfrOrderTable.vue
import { useCpfrStore } from '../stores/cpfrStore'

const store = useCpfrStore()

const estadoClass = (estado: 'INSTOCK' | 'BAJO' | 'AGOTADO') => {
  if (estado === 'INSTOCK') return 'bg-emerald-100 text-emerald-700'
  if (estado === 'BAJO')    return 'bg-amber-100 text-amber-700'
  return 'bg-rose-100 text-rose-600'
}

const fillRateClass = (fr: number) => {
  if (fr >= 90) return 'text-emerald-600 font-semibold'
  if (fr >= 70) return 'text-amber-500 font-semibold'
  return 'text-rose-500 font-semibold'
}
</script>

<template>
  <div class="flex-1 flex flex-col min-h-0 overflow-auto">

    <!-- Sin datos -->
    <div
      v-if="!store.storeGroups.length"
      class="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400 p-12"
    >
      <i class="fa-solid fa-box-open text-3xl"></i>
      <p class="text-sm font-medium">No hay datos para los filtros seleccionados.</p>
    </div>

    <!-- Lista de tiendas -->
    <div v-else class="space-y-4 p-4">
      <div
        v-for="group in store.storeGroups"
        :key="group.id_cliente"
        class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
      >

        <!-- ── Cabecera de tienda ───────────────────────────────────────────── -->
        <button
          class="w-full flex items-center justify-between px-5 py-3 bg-slate-50 hover:bg-slate-100 border-b border-slate-200 transition-colors text-left"
          @click="store.toggleGroup(group.id_cliente)"
        >
          <div class="flex items-center gap-3">
            <i class="fa-solid fa-store text-indigo-400 text-sm"></i>
            <div>
              <p class="text-sm font-bold text-slate-800">{{ group.formatocte }}</p>
              <p class="text-[10px] text-slate-400">
                {{ group.jefatura }} · <span class="text-indigo-400">{{ group.dia }}</span>
              </p>
            </div>
          </div>

          <!-- Macro KPIs -->
          <div class="flex items-center gap-5 mr-3">
            <div class="text-right hidden sm:block">
              <p class="text-[10px] uppercase tracking-widest text-slate-400">Sugerido</p>
              <p class="text-sm font-bold text-slate-700">
                {{ group.macro.sumSugerido.toLocaleString('es-MX') }}
              </p>
            </div>
            <div class="text-right hidden sm:block">
              <p class="text-[10px] uppercase tracking-widest text-slate-400">Cadena</p>
              <p class="text-sm font-bold text-indigo-600">
                {{ group.macro.sumCadena.toLocaleString('es-MX') }}
              </p>
            </div>
            <div class="text-right hidden sm:block">
              <p class="text-[10px] uppercase tracking-widest text-slate-400">Fill Rate</p>
              <p class="text-sm" :class="fillRateClass(group.macro.fillRate)">
                {{ group.macro.fillRate.toFixed(1) }}%
              </p>
            </div>
            <span
              class="text-[10px] font-bold px-2 py-0.5 rounded-full"
              :class="estadoClass(group.macro.estado)"
            >
              {{ group.macro.estado }}
            </span>
            <i
              class="fa-solid fa-chevron-down text-slate-400 text-xs transition-transform duration-200"
              :class="{ 'rotate-180': store.expandedGroups[group.id_cliente] }"
            ></i>
          </div>
        </button>

        <!-- ── Tabla de SKUs ───────────────────────────────────────────────── -->
        <div v-show="store.expandedGroups[group.id_cliente]" class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead>
              <tr class="text-[10px] uppercase tracking-widest text-slate-400 bg-slate-50/70 border-b border-slate-100">
                <th class="px-4 py-2 text-left font-semibold w-64">SKU</th>
                <th class="px-3 py-2 text-right font-semibold">Inv. Actual</th>
                <th class="px-3 py-2 text-right font-semibold">Vta. Prom.</th>
                <th class="px-3 py-2 text-right font-semibold">Sem. Act.</th>
                <th class="px-3 py-2 text-right font-semibold">Criterio</th>
                <th class="px-3 py-2 text-right font-semibold">Sugerido</th>
                <th class="px-3 py-2 text-right font-semibold">Cadena</th>
                <th class="px-3 py-2 text-right font-semibold">Fill Rate</th>
                <th class="px-3 py-2 text-center font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="sku in group.skus"
                :key="sku.SKU_NOMBRE"
                class="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
              >
                <td class="px-4 py-2.5 text-slate-700 font-medium truncate max-w-[16rem]" :title="sku.SKU_NOMBRE">
                  {{ sku.SKU_NOMBRE }}
                </td>
                <td class="px-3 py-2.5 text-right text-slate-600">
                  {{ sku.invActual.toLocaleString('es-MX', { maximumFractionDigits: 1 }) }}
                </td>
                <td class="px-3 py-2.5 text-right text-slate-600">
                  {{ sku.ventaPromSemanal.toLocaleString('es-MX', { maximumFractionDigits: 1 }) }}
                </td>
                <td class="px-3 py-2.5 text-right" :class="sku.semanasActuales < sku.criterioAplicado ? 'text-amber-500 font-semibold' : 'text-slate-600'">
                  {{ sku.semanasActuales.toFixed(2) }}
                </td>
                <td class="px-3 py-2.5 text-right text-slate-500">
                  {{ sku.criterioAplicado }}
                </td>
                <td class="px-3 py-2.5 text-right font-semibold text-indigo-600">
                  {{ sku.pedidoSugerido.toLocaleString('es-MX') }}
                </td>
                <td class="px-3 py-2.5 text-right text-slate-700">
                  {{ sku.pedidoCadena.toLocaleString('es-MX') }}
                </td>
                <td class="px-3 py-2.5 text-right" :class="fillRateClass(sku.fillRate)">
                  {{ sku.fillRate.toFixed(1) }}%
                </td>
                <td class="px-3 py-2.5 text-center">
                  <span
                    class="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full"
                    :class="estadoClass(sku.estado)"
                  >
                    {{ sku.estado }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>

  </div>
</template>