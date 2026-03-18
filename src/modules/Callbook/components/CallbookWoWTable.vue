<!-- src/modules/Callbook/components/CallbookWoWTable.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCallbookStore } from '../stores/callbookStore'
import type { CallbookWoWRecord } from '../types/callbook.types'

const store = useCallbookStore()

interface MatrizGroup {
  clientId: string
  rows: CallbookWoWRecord[]
  totalVariation: number
}

const groups = computed<MatrizGroup[]>(() => {
  const map = new Map<string, CallbookWoWRecord[]>()
  for (const r of store.wowData) {
    if (!map.has(r.clientId)) map.set(r.clientId, [])
    map.get(r.clientId)!.push(r)
  }
  return [...map.entries()]
    .map(([clientId, rows]) => ({
      clientId,
      rows: [...rows].sort((a, b) => Math.abs(b.variation) - Math.abs(a.variation)),
      totalVariation: rows.reduce((s, r) => s + r.variation, 0),
    }))
    .sort((a, b) => Math.abs(b.totalVariation) - Math.abs(a.totalVariation))
})

const expandedMap = ref<Record<string, boolean>>({})

function toggle(clientId: string) {
  expandedMap.value[clientId] = !(expandedMap.value[clientId] ?? true)
}

function isExpanded(clientId: string) {
  return expandedMap.value[clientId] ?? true
}

const isEmpty = computed(() => store.wowData.length === 0)

function variationClass(v: number) {
  if (v > 0) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (v < 0) return 'bg-rose-50 text-rose-600 border-rose-200'
  return 'bg-slate-50 text-slate-500 border-slate-200'
}

function variationIcon(v: number) {
  if (v > 0) return 'fa-solid fa-arrow-trend-up'
  if (v < 0) return 'fa-solid fa-arrow-trend-down'
  return 'fa-solid fa-minus'
}

function fmt(n: number) {
  const sign = n > 0 ? '+' : ''
  return `${sign}${new Intl.NumberFormat('es-MX').format(n)}`
}

function fmtAbs(n: number) {
  return new Intl.NumberFormat('es-MX').format(n)
}
</script>

<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
      <h3 class="text-sm font-bold text-slate-700 flex items-center gap-2">
        <i class="fa-solid fa-arrow-right-arrow-left text-brand-500"></i>
        Comparativa Week-over-Week
        <span class="text-xs font-normal text-slate-400">
          Sem {{ store.filters.previousWeek }} → Sem {{ store.filters.currentWeek }}
        </span>
      </h3>
      <span v-if="store.loadingWow" class="text-xs text-slate-400 flex items-center gap-1.5">
        <i class="fa-solid fa-circle-notch fa-spin"></i> Cargando...
      </span>
      <span v-else-if="!isEmpty" class="text-xs text-slate-400">
        {{ groups.length }} clientes · {{ store.wowData.length }} SKUs
      </span>
    </div>

    <!-- Skeleton -->
    <div v-if="store.loadingWow" class="divide-y divide-slate-100">
      <div v-for="i in 3" :key="i" class="px-5 py-3 flex flex-col gap-2">
        <div class="h-3 w-32 bg-slate-100 rounded animate-pulse"></div>
        <div v-for="j in 3" :key="j" class="h-8 bg-slate-50 rounded animate-pulse"></div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="isEmpty" class="flex flex-col items-center justify-center py-16 gap-2">
      <i class="fa-solid fa-table text-4xl text-slate-200"></i>
      <p class="text-sm text-slate-400">Sin datos WoW para el período seleccionado</p>
    </div>

    <!-- Grupos por clientId -->
    <div v-else class="divide-y divide-slate-100 max-h-[520px] overflow-y-auto custom-scrollbar">
      <div v-for="group in groups" :key="group.clientId">

        <!-- Cabecera de grupo -->
        <button
          class="w-full flex items-center justify-between px-5 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
          @click="toggle(group.clientId)"
        >
          <div class="flex items-center gap-2">
            <i
              class="fa-solid fa-chevron-right text-[10px] text-slate-400 transition-transform duration-200"
              :class="{ 'rotate-90': isExpanded(group.clientId) }"
            ></i>
            <span class="text-xs font-bold text-slate-700 font-mono">
              {{ group.clientId }}
            </span>
            <span class="text-xs text-slate-400">({{ group.rows.length }} SKUs)</span>
          </div>
          <span
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold"
            :class="variationClass(group.totalVariation)"
          >
            <i :class="variationIcon(group.totalVariation)" class="text-[10px]"></i>
            {{ fmt(group.totalVariation) }} pz netas
          </span>
        </button>

        <!-- Filas de SKU -->
        <Transition name="slide">
          <table v-if="isExpanded(group.clientId)" class="w-full text-xs">
            <thead>
              <tr class="text-[10px] uppercase tracking-wide text-slate-400 bg-white border-b border-slate-100">
                <th class="px-5 py-2 text-left">SKU</th>
                <th class="px-3 py-2 text-right">Sem Ant.</th>
                <th class="px-3 py-2 text-right">Sem Act.</th>
                <th class="px-3 py-2 text-right">Variación</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              <tr
                v-for="row in group.rows"
                :key="`${row.clientId}-${row.sku}`"
                class="hover:bg-slate-50 transition-colors"
              >
                <td class="px-5 py-2 text-slate-700 font-medium">{{ row.sku }}</td>
                <td class="px-3 py-2 text-right text-slate-500">{{ fmtAbs(row.previousPieces) }}</td>
                <td class="px-3 py-2 text-right text-slate-700 font-medium">{{ fmtAbs(row.currentPieces) }}</td>
                <td class="px-3 py-2 text-right">
                  <span
                    class="inline-flex items-center justify-end gap-1 px-2 py-0.5 rounded-full border font-semibold"
                    :class="variationClass(row.variation)"
                  >
                    <i :class="variationIcon(row.variation)" class="text-[10px]"></i>
                    {{ fmt(row.variation) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </Transition>

      </div>
    </div>
  </div>
</template>

<style scoped>
.slide-enter-active, .slide-leave-active { transition: opacity 0.15s, transform 0.15s; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(-4px); }
</style>