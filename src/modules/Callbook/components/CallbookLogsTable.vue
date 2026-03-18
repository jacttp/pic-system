<!-- src/modules/Callbook/components/CallbookLogsTable.vue -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCallbookStore } from '../stores/callbookStore'
import type { CallbookRawRecord } from '../types/callbook.types'

const store = useCallbookStore()

const PAGE_SIZE = 20
const currentPage = ref(1)

// Reset página al cambiar datos
watch(() => store.filteredData, () => { currentPage.value = 1 })

// ── Paginación sobre datos planos ─────────────────────────────────────────
const totalPages = computed(() => Math.ceil(store.filteredData.length / PAGE_SIZE))

const pagedRows = computed<CallbookRawRecord[]>(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return store.filteredData.slice(start, start + PAGE_SIZE)
})

// ── Agrupación por clientId sobre la página actual ────────────────────────
interface ClientGroup {
  clientId: string
  rows: CallbookRawRecord[]
}

const pagedGroups = computed<ClientGroup[]>(() => {
  const map = new Map<string, CallbookRawRecord[]>()
  for (const r of pagedRows.value) {
    if (!map.has(r.clientId)) map.set(r.clientId, [])
    map.get(r.clientId)!.push(r)
  }
  return [...map.entries()].map(([clientId, rows]) => ({ clientId, rows }))
})

// Conteo de clientes únicos sobre el total (para el header)
const uniqueClients = computed(() =>
  new Set(store.filteredData.map(r => r.clientId)).size
)

// ── Expansión ─────────────────────────────────────────────────────────────
const expandedMap = ref<Record<string, boolean>>({})

function toggle(clientId: string) {
  expandedMap.value[clientId] = !(expandedMap.value[clientId] ?? true)
}

function isExpanded(clientId: string) {
  return expandedMap.value[clientId] ?? true
}

// ── Paginador ─────────────────────────────────────────────────────────────
function goTo(page: number) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
}

const pageWindow = computed(() => {
  const total = totalPages.value
  const cur   = currentPage.value
  const range: number[] = []
  for (let i = Math.max(1, cur - 2); i <= Math.min(total, cur + 2); i++) {
    range.push(i)
  }
  return range
})

const isEmpty = computed(() => store.filteredData.length === 0)

function formatDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}
</script>

<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
      <h3 class="text-sm font-bold text-slate-700 flex items-center gap-2">
        <i class="fa-solid fa-clipboard-list text-brand-500"></i>
        Bitácora de Capturas
      </h3>
      <div class="flex items-center gap-3">
        <span v-if="store.loadingFiltered" class="text-xs text-slate-400 flex items-center gap-1.5">
          <i class="fa-solid fa-circle-notch fa-spin"></i> Cargando...
        </span>
        <span v-else-if="!isEmpty" class="text-xs text-slate-400">
          {{ store.filteredCount.toLocaleString('es-MX') }} registros
          · {{ uniqueClients }} clientes
        </span>
      </div>
    </div>

    <!-- Skeleton -->
    <div v-if="store.loadingFiltered" class="divide-y divide-slate-50">
      <div v-for="i in 5" :key="i" class="px-5 py-2.5 flex gap-4">
        <div class="h-3 w-20 bg-slate-100 rounded animate-pulse"></div>
        <div class="h-3 w-28 bg-slate-100 rounded animate-pulse"></div>
        <div class="h-3 w-16 bg-slate-100 rounded animate-pulse"></div>
        <div class="h-3 w-10 bg-slate-100 rounded animate-pulse ml-auto"></div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="isEmpty" class="flex flex-col items-center justify-center py-14 gap-2 text-slate-300">
      <i class="fa-solid fa-clipboard-list text-4xl"></i>
      <p class="text-sm text-slate-400">Sin registros para los filtros seleccionados</p>
    </div>

    <!-- Tabla agrupada -->
    <div v-else>
      <div class="divide-y divide-slate-100 max-h-[520px] overflow-y-auto custom-scrollbar">
        <div v-for="group in pagedGroups" :key="group.clientId">

          <!-- Cabecera de grupo -->
          <button
            class="w-full flex items-center justify-between px-5 py-2 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
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
              <span class="text-xs text-slate-400">({{ group.rows.length }} registros)</span>
            </div>
            <span class="text-[10px] text-slate-400 font-mono">
              {{ group.rows.length }} capturas
            </span>
          </button>

          <!-- Filas -->
          <Transition name="slide">
            <table v-if="isExpanded(group.clientId)" class="w-full text-xs">
              <thead>
                <tr class="text-[10px] uppercase tracking-wide text-slate-400 border-b border-slate-100 bg-white">
                  <th class="px-5 py-2 text-left">Call ID</th>
                  <th class="px-3 py-2 text-left">Fecha Captura</th>
                  <th class="px-3 py-2 text-left">SKU</th>
                  <th class="px-3 py-2 text-right">Piezas</th>
                  <th class="px-3 py-2 text-center">Semana</th>
                  <th class="px-3 py-2 text-center">Año</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                <tr
                  v-for="row in group.rows"
                  :key="row.callId"
                  class="hover:bg-slate-50 transition-colors"
                >
                  <td class="px-5 py-2 font-mono text-[11px] text-slate-400">{{ row.callId }}</td>
                  <td class="px-3 py-2 text-slate-500">{{ formatDate(row.captureDate) }}</td>
                  <td class="px-3 py-2 text-slate-700 font-medium">{{ row.sku }}</td>
                  <td class="px-3 py-2 text-right font-semibold text-slate-700">
                    {{ new Intl.NumberFormat('es-MX').format(row.pieces) }}
                  </td>
                  <td class="px-3 py-2 text-center">
                    <span class="px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-100 font-mono text-[10px]">
                      S{{ row.week }}
                    </span>
                  </td>
                  <td class="px-3 py-2 text-center text-slate-500">{{ row.year }}</td>
                </tr>
              </tbody>
            </table>
          </Transition>

        </div>
      </div>

      <!-- Paginador -->
      <div class="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
        <span class="text-xs text-slate-400">
          Página {{ currentPage }} de {{ totalPages }}
          · {{ pagedRows.length }} de {{ store.filteredData.length }} registros
        </span>
        <div class="flex items-center gap-1">
          <button
            @click="goTo(currentPage - 1)"
            :disabled="currentPage === 1"
            class="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500
                   hover:bg-white hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <i class="fa-solid fa-chevron-left text-[10px]"></i>
          </button>

          <button
            v-for="p in pageWindow"
            :key="p"
            @click="goTo(p)"
            class="h-7 min-w-[28px] px-1.5 flex items-center justify-center rounded-lg border text-xs font-medium transition-all"
            :class="p === currentPage
              ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
              : 'border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300'"
          >
            {{ p }}
          </button>

          <button
            @click="goTo(currentPage + 1)"
            :disabled="currentPage === totalPages"
            class="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500
                   hover:bg-white hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <i class="fa-solid fa-chevron-right text-[10px]"></i>
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.slide-enter-active, .slide-leave-active { transition: opacity 0.15s, transform 0.15s; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(-4px); }
</style>