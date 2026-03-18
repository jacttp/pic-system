<!-- src/modules/Callbook/components/CallbookOverviewTable.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCallbookStore } from '../stores/callbookStore'

const store = useCallbookStore()

// ── Búsqueda ──────────────────────────────────────────────────────────────
const search = ref('')

// ── Ordenamiento ──────────────────────────────────────────────────────────
type SortKey = 'clientId' | 'totalGeneral'
const sortKey = ref<SortKey>('totalGeneral')
const sortAsc  = ref(false)

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value
  } else {
    sortKey.value = key
    sortAsc.value = false
  }
}

function sortIcon(key: SortKey) {
  if (sortKey.value !== key) return 'fa-solid fa-sort text-slate-300'
  return sortAsc.value
    ? 'fa-solid fa-sort-up text-brand-500'
    : 'fa-solid fa-sort-down text-brand-500'
}

// ── Filas colapsables ─────────────────────────────────────────────────────
const expandedRows = ref<Set<string>>(new Set())

function toggleExpand(clientId: string) {
  if (expandedRows.value.has(clientId)) {
    expandedRows.value.delete(clientId)
  } else {
    expandedRows.value.add(clientId)
  }
  // mutar por referencia no dispara reactividad en Set; forzamos con reasignación
  expandedRows.value = new Set(expandedRows.value)
}

function isExpanded(clientId: string) {
  return expandedRows.value.has(clientId)
}

// ── Semanas del response (encabezados dinámicos) ──────────────────────────
// Llegan ordenadas DESC desde el backend (semana más reciente primero)
const weekCols = computed(() => [...store.reportWeeks].sort((a, b) => a - b).map(String))

// ── Datos filtrados + ordenados ───────────────────────────────────────────
const rows = computed(() => {
  let data = [...store.reportData]

  if (search.value.trim()) {
    const q = search.value.trim().toLowerCase()
    data = data.filter(r => r.clientId.toLowerCase().includes(q))
  }

  data.sort((a, b) => {
    const av = sortKey.value === 'clientId' ? a.clientId : a.totalGeneral
    const bv = sortKey.value === 'clientId' ? b.clientId : b.totalGeneral
    const cmp = av < bv ? -1 : av > bv ? 1 : 0
    return sortAsc.value ? cmp : -cmp
  })

  return data
})

const isEmpty = computed(() => store.reportData.length === 0)

// ── Paginación ────────────────────────────────────────────────────────────
const PAGE_SIZE = 9
const currentPage = ref(1)
const totalPages  = computed(() => Math.ceil(rows.value.length / PAGE_SIZE))

const pagedRows = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return rows.value.slice(start, start + PAGE_SIZE)
})

const pageWindow = computed(() => {
  const range: number[] = []
  for (
    let i = Math.max(1, currentPage.value - 2);
    i <= Math.min(totalPages.value, currentPage.value + 2);
    i++
  ) range.push(i)
  return range
})

function goTo(page: number) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  // colapsar todo al cambiar de página
  expandedRows.value = new Set()
}

// ── Helpers ───────────────────────────────────────────────────────────────
function fmtNum(n: number) {
  if (!n) return '—'
  return new Intl.NumberFormat('es-MX').format(n)
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short',
  })
}

function pzBarWidth(pz: number): string {
  const max = Math.max(...store.reportData.map(r => r.totalGeneral), 1)
  return `${Math.round((pz / max) * 100)}%`
}

function skuBarWidth(pz: number, clientTotal: number): string {
  if (!clientTotal) return '0%'
  return `${Math.round((pz / clientTotal) * 100)}%`
}
</script>

<template>
  <div class="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
      <h3 class="text-sm font-bold text-slate-700 flex items-center gap-2">
        <i class="fa-solid fa-store text-brand-500"></i>
        Inventario por Tienda
        <span
          v-if="!isEmpty"
          class="text-xs font-normal text-slate-400"
        >
          · {{ rows.length }} tiendas
        </span>
        <!-- semanas activas -->
        <template v-if="weekCols.length">
          <span
            v-for="wk in weekCols"
            :key="wk"
            class="px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-100 font-mono text-[10px]"
          >
            S{{ wk }}
          </span>
        </template>
      </h3>

      <!-- Buscador -->
      <div class="relative w-full sm:w-56">
        <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs pointer-events-none"></i>
        <input
          v-model="search"
          type="text"
          placeholder="Buscar tienda..."
          class="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700
                 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition
                 placeholder:text-slate-300"
        />
      </div>
    </div>

    <!-- Skeleton -->
    <div v-if="store.loadingReport" class="divide-y divide-slate-50 flex-1">
      <div v-for="i in 8" :key="i" class="px-5 py-3 flex items-center gap-4">
        <div class="h-3 w-4 bg-slate-100 rounded animate-pulse"></div>
        <div class="h-3 w-24 bg-slate-100 rounded animate-pulse"></div>
        <div class="h-3 w-20 bg-slate-100 rounded animate-pulse ml-auto"></div>
        <div class="h-3 w-14 bg-slate-100 rounded animate-pulse"></div>
      </div>
    </div>

    <!-- Empty -->
    <div
      v-else-if="isEmpty"
      class="flex flex-col items-center justify-center py-16 gap-2 text-slate-300 flex-1"
    >
      <i class="fa-solid fa-store text-4xl"></i>
      <p class="text-sm text-slate-400">Selecciona año y semana para ver el inventario</p>
    </div>

    <!-- Tabla -->
    <div v-else class="flex flex-col flex-1 justify-between">
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="text-[10px] uppercase tracking-wide text-slate-400 border-b border-slate-100 bg-slate-50/60">

              <!-- Expand toggle -->
              <th class="px-3 py-2.5 w-8"></th>

              <!-- Tienda -->
              <th class="px-2 py-2.5 text-left">
                <button
                  class="flex items-center gap-1.5 hover:text-slate-600 transition-colors"
                  @click="toggleSort('clientId')"
                >
                  Tienda <i :class="sortIcon('clientId')"></i>
                </button>
              </th>

              <!-- Columnas dinámicas de semana -->
              <th
                v-for="wk in weekCols"
                :key="wk"
                class="px-3 py-2.5 text-right"
              >
                S{{ wk }}
              </th>

              <!-- Total -->
              <th class="px-4 py-2.5 text-right">
                <button
                  class="flex items-center gap-1.5 hover:text-slate-600 transition-colors ml-auto"
                  @click="toggleSort('totalGeneral')"
                >
                  Total PZ <i :class="sortIcon('totalGeneral')"></i>
                </button>
              </th>

              <!-- Última Captura -->
              <th class="px-4 py-2.5 text-right">Captura</th>

            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <template v-for="row in pagedRows" :key="row.clientId">

              <!-- ── Fila Tienda ────────────────────────────────────────── -->
              <tr
                class="hover:bg-slate-50 transition-colors group"
                :class="{ 'bg-brand-50/30': isExpanded(row.clientId) }"
              >
                <!-- Toggle -->
                <td class="px-3 py-2.5 text-center">
                  <button
                    @click="toggleExpand(row.clientId)"
                    class="w-5 h-5 rounded flex items-center justify-center
                           text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all"
                    :title="isExpanded(row.clientId) ? 'Colapsar SKUs' : 'Ver SKUs'"
                  >
                    <i
                      class="fa-solid text-[9px] transition-transform duration-200"
                      :class="isExpanded(row.clientId) ? 'fa-chevron-down text-brand-500' : 'fa-chevron-right'"
                    ></i>
                  </button>
                </td>

                <!-- Nombre tienda -->
                <td class="px-2 py-2.5">
                  <span class="font-mono text-[11px] text-slate-700 font-semibold">
                    {{ row.clientId }}
                  </span>
                </td>

                <!-- PZ por semana -->
                <td
                  v-for="wk in weekCols"
                  :key="wk"
                  class="px-3 py-2.5 text-right tabular-nums text-slate-600 font-medium"
                >
                  {{ fmtNum(row.weeks[wk] ?? 0) }}
                </td>

                <!-- Total con barra -->
                <td class="px-4 py-2.5 text-right">
                  <div class="flex flex-col items-end gap-1">
                    <span class="font-semibold text-slate-700">{{ fmtNum(row.totalGeneral) }}</span>
                    <div class="h-1 rounded-full bg-slate-100 w-20">
                      <div
                        class="h-1 rounded-full bg-brand-400 transition-all"
                        :style="{ width: pzBarWidth(row.totalGeneral) }"
                      ></div>
                    </div>
                  </div>
                </td>

                <!-- Captura: vacío en nivel tienda -->
                <td class="px-4 py-2.5"></td>
              </tr>

              <!-- ── Filas SKU (colapsables) ────────────────────────────── -->
              <template v-if="isExpanded(row.clientId)">
                <tr
                  v-for="skuRow in row.skus"
                  :key="`${row.clientId}-${skuRow.sku}`"
                  class="bg-slate-50/60 border-l-2 border-brand-200 hover:bg-brand-50/20 transition-colors"
                >
                  <!-- Indent spacer -->
                  <td class="px-3 py-1.5 text-center">
                    <span class="text-slate-300 text-[9px]">└</span>
                  </td>

                  <!-- SKU -->
                  <td class="px-2 py-1.5">
                    <span class="font-mono text-[10px] text-slate-500 italic pl-3">
                      {{ skuRow.sku }}
                    </span>
                  </td>

                  <!-- PZ por semana -->
                  <td
                    v-for="wk in weekCols"
                    :key="wk"
                    class="px-3 py-1.5 text-right tabular-nums text-slate-500 text-[11px]"
                  >
                    <span v-if="skuRow.weeks[wk]" class="text-slate-600">
                      {{ fmtNum(skuRow.weeks[wk]) }}
                    </span>
                    <span v-else class="text-slate-300">—</span>
                  </td>

                  <!-- Total SKU con micro-barra -->
                  <td class="px-4 py-1.5 text-right">
                    <div class="flex flex-col items-end gap-1">
                      <span class="text-[11px] font-medium text-slate-600">{{ fmtNum(skuRow.totalGeneral) }}</span>
                      <div class="h-0.5 rounded-full bg-slate-200 w-16">
                        <div
                          class="h-0.5 rounded-full bg-brand-300 transition-all"
                          :style="{ width: skuBarWidth(skuRow.totalGeneral, row.totalGeneral) }"
                        ></div>
                      </div>
                    </div>
                  </td>

                  <!-- Última Captura SKU -->
                  <td class="px-4 py-1.5 text-right text-[10px] text-slate-400 whitespace-nowrap">
                    {{ formatDate(skuRow.UltimaFechaCaptura) }}
                  </td>
                </tr>

                <!-- Separador visual al colapsar grupo -->
                <tr class="h-px bg-brand-100"><td :colspan="3 + weekCols.length"></td></tr>
              </template>

            </template>
          </tbody>
        </table>
      </div>

      <!-- Paginador -->
      <div
        v-if="totalPages > 1"
        class="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50 mt-auto shrink-0"
      >
        <span class="text-xs text-slate-400">
          Página {{ currentPage }} de {{ totalPages }}
          · {{ pagedRows.length }} de {{ rows.length }} tiendas
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