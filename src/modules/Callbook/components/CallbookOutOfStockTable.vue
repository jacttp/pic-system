<!-- src/modules/Callbook/components/CallbookOutOfStockTable.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCallbookStore } from '../stores/callbookStore'
import type { CallbookSummaryRecord } from '../types/callbook.types'

const store = useCallbookStore()

interface ClientGroup {
  clientId: string
  rows: CallbookSummaryRecord[]
}

const groups = computed<ClientGroup[]>(() => {
  const map = new Map<string, CallbookSummaryRecord[]>()
  for (const r of store.outOfStockData) {
    if (!map.has(r.clientId)) map.set(r.clientId, [])
    map.get(r.clientId)!.push(r)
  }
  return [...map.entries()]
    .map(([clientId, rows]) => ({ clientId, rows }))
    .sort((a, b) => b.rows.length - a.rows.length)
})

const expandedMap = ref<Record<string, boolean>>({})

function toggle(clientId: string) {
  expandedMap.value[clientId] = !(expandedMap.value[clientId] ?? true)
}

function isExpanded(clientId: string) {
  return expandedMap.value[clientId] ?? true
}

const isEmpty = computed(() => store.outOfStockData.length === 0)

function formatDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}
</script>

<template>
  <div
    class="bg-white rounded-xl border shadow-sm overflow-hidden"
    :class="store.outOfStockCount > 0 ? 'border-destructive/30' : 'border-slate-200'"
  >
    <!-- Header -->
    <div
      class="flex items-center justify-between px-5 py-4 border-b"
      :class="store.outOfStockCount > 0 ? 'border-destructive/20 bg-red-50/40' : 'border-slate-100'"
    >
      <h3
        class="text-sm font-bold flex items-center gap-2"
        :class="store.outOfStockCount > 0 ? 'text-destructive' : 'text-slate-700'"
      >
        <i class="fa-solid fa-triangle-exclamation"></i>
        Alertas Críticas — Agotados
        <span class="text-xs font-normal text-slate-400">
          Sem {{ store.filters.currentWeek }}
        </span>
      </h3>
      <div class="flex items-center gap-2">
        <span v-if="store.loadingOutOfStock" class="text-xs text-slate-400 flex items-center gap-1.5">
          <i class="fa-solid fa-circle-notch fa-spin"></i>
        </span>
        <span
          v-else-if="store.outOfStockCount > 0"
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-destructive text-white text-xs font-bold"
        >
          <i class="fa-solid fa-circle-exclamation text-[10px]"></i>
          {{ store.outOfStockCount }} agotados
        </span>
        <span
          v-else-if="!isEmpty"
          class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200"
        >
          <i class="fa-solid fa-circle-check text-[10px]"></i>
          Sin alertas
        </span>
      </div>
    </div>

    <!-- Skeleton -->
    <div v-if="store.loadingOutOfStock" class="divide-y divide-slate-100">
      <div v-for="i in 2" :key="i" class="px-5 py-3 flex flex-col gap-2">
        <div class="h-3 w-28 bg-slate-100 rounded animate-pulse"></div>
        <div v-for="j in 3" :key="j" class="h-7 bg-slate-50 rounded animate-pulse"></div>
      </div>
    </div>

    <!-- Sin alertas -->
    <div v-else-if="isEmpty" class="flex flex-col items-center justify-center py-14 gap-2">
      <i class="fa-solid fa-circle-check text-3xl text-emerald-400"></i>
      <p class="text-sm text-slate-500 font-medium">Sin agotados detectados para esta semana</p>
    </div>

    <!-- Grupos por clientId -->
    <div v-else class="divide-y divide-slate-100 max-h-[480px] overflow-y-auto custom-scrollbar">
      <div v-for="group in groups" :key="group.clientId">

        <!-- Cabecera de grupo -->
        <button
          class="w-full flex items-center justify-between px-5 py-2.5 bg-red-50/30 hover:bg-red-50/60 transition-colors text-left"
          @click="toggle(group.clientId)"
        >
          <div class="flex items-center gap-2">
            <i
              class="fa-solid fa-chevron-right text-[10px] text-rose-300 transition-transform duration-200"
              :class="{ 'rotate-90': isExpanded(group.clientId) }"
            ></i>
            <span class="text-xs font-bold text-slate-700 font-mono">
              {{ group.clientId }}
            </span>
          </div>
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 text-xs font-semibold">
            <i class="fa-solid fa-triangle-exclamation text-[10px]"></i>
            {{ group.rows.length }} SKU{{ group.rows.length !== 1 ? 's' : '' }}
          </span>
        </button>

        <!-- Tabla de SKUs -->
        <Transition name="slide">
          <table v-if="isExpanded(group.clientId)" class="w-full text-xs">
            <thead>
              <tr class="text-[10px] uppercase tracking-wide text-slate-400 border-b border-slate-100 bg-white">
                <th class="px-5 py-2 text-left">SKU</th>
                <th class="px-3 py-2 text-left">Fecha Captura</th>
                <th class="px-3 py-2 text-left">Semana</th>
                <th class="px-3 py-2 text-center">Piezas</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              <tr
                v-for="row in group.rows"
                :key="`${row.clientId}-${row.sku}`"
                class="hover:bg-red-50/30 transition-colors"
              >
                <td class="px-5 py-2 text-slate-700 font-medium">{{ row.sku }}</td>
                <td class="px-3 py-2 text-slate-500">{{ formatDate(row.captureDate) }}</td>
                <td class="px-3 py-2 text-slate-500 font-mono">S{{ row.week }}</td>
                <td class="px-3 py-2 text-center">
                  <span class="inline-flex items-center justify-center px-2 py-0.5 rounded-md border bg-destructive/10 text-destructive border-destructive/20 font-bold text-[11px]">
                    0 PZ
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