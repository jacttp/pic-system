<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSegmentationStore } from '../../stores/segmentationStore'
import { useFormatters } from '../../composables/useFormatters'
import { useSegmentColors } from '../../composables/useSegmentColors'

interface Emits {
  (e: 'view-segment', segmentId: string): void
}
const emit = defineEmits<Emits>()

const store = useSegmentationStore()
const { formatNumber, formatPercent } = useFormatters()
const { getSegmentColor } = useSegmentColors()

// ── Modo vista ────────────────────────────────────────────────
type ViewMode = 'table' | 'cards'
const viewMode = ref<ViewMode>('table')

// ── Fila activa ───────────────────────────────────────────────
const activeId = computed(() => store.activeSegmentId)

const handleView = (segmentId: string) => {
  store.setActiveSegment(segmentId)
  emit('view-segment', segmentId)
}

// ── Color helpers ─────────────────────────────────────────────
const segColor = (idx: number) =>
  getSegmentColor(idx, store.currentGroupType).hex

const volumeBadgeClass = (pct: number): string => {
  if (pct >= 30) return 'bg-green-100 text-green-700 border-green-200'
  if (pct >= 15) return 'bg-yellow-100 text-yellow-700 border-yellow-200'
  return 'bg-orange-100 text-orange-700 border-orange-200'
}

const accumBarColor = (pct: number): string => {
  if (pct < 40) return '#10b981'
  if (pct < 70) return '#fbbf24'
  return '#f87171'
}

// Skeleton rows para loading
const skeletonRows = Array.from({ length: 5 })
</script>

<template>
  <section aria-label="Tabla de segmentos">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center" aria-hidden="true">
          <i class="fa-solid fa-table text-slate-600"></i>
        </div>
        <div>
          <h3 class="font-bold text-slate-800">Detalle de Segmentos</h3>
          <p class="text-xs text-slate-500">
            {{ store.segments.length }} segmentos ·
            {{ store.currentGroupType }}
          </p>
        </div>
      </div>

      <!-- Toggle vista -->
      <div
        class="flex items-center bg-slate-100 rounded-lg p-1 gap-1"
        role="group"
        aria-label="Modo de visualización"
      >
        <button
          type="button"
          @click="viewMode = 'table'"
          :class="viewMode === 'table'
            ? 'bg-white shadow-sm text-slate-800'
            : 'text-slate-500 hover:text-slate-700'"
          class="p-1.5 rounded-md transition-all text-sm"
          :aria-pressed="viewMode === 'table'"
          title="Vista tabla"
        >
          <i class="fa-solid fa-table-cells-large" aria-hidden="true"></i>
          <span class="sr-only">Vista tabla</span>
        </button>
        <button
          type="button"
          @click="viewMode = 'cards'"
          :class="viewMode === 'cards'
            ? 'bg-white shadow-sm text-slate-800'
            : 'text-slate-500 hover:text-slate-700'"
          class="p-1.5 rounded-md transition-all text-sm"
          :aria-pressed="viewMode === 'cards'"
          title="Vista tarjetas"
        >
          <i class="fa-solid fa-grip" aria-hidden="true"></i>
          <span class="sr-only">Vista tarjetas</span>
        </button>
      </div>
    </div>

    <!-- ── VISTA TABLA (desktop) ────────────────────────────── -->
    <Transition name="fade" mode="out-in">
      <div
        v-if="viewMode === 'table'"
        key="table"
        class="bg-white rounded-xl border border-slate-200 overflow-hidden"
      >
        <div class="overflow-x-auto">
          <table
            class="w-full text-sm min-w-[900px]"
            role="table"
            :aria-label="`Segmentos de ${store.currentGroupType}`"
          >
            <thead class="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr role="row">
                <th scope="col" class="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  Segmento
                </th>
                <th scope="col" class="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  Rango
                </th>
                <th scope="col" class="px-4 py-3 text-right font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  Clientes
                </th>
                <th scope="col" class="px-4 py-3 text-right font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  % Clientes
                </th>
                <th scope="col" class="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider min-w-[120px]">
                  % Cli. Acum.
                </th>
                <th scope="col" class="px-4 py-3 text-right font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  Volumen
                </th>
                <th scope="col" class="px-4 py-3 text-center font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  % Vol.
                </th>
                <th scope="col" class="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider min-w-[120px]">
                  % Vol. Acum.
                </th>
                <th scope="col" class="px-4 py-3 text-right font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  Ticket Prom.
                </th>
                <th scope="col" class="px-4 py-3 text-center font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  Acción
                </th>
              </tr>
            </thead>

            <tbody class="divide-y divide-slate-100">
              <!-- Skeletons -->
              <tr
                v-if="store.isLoading"
                v-for="(_, i) in skeletonRows"
                :key="`sk-${i}`"
                class="animate-pulse"
                role="row"
                aria-busy="true"
              >
                <td class="px-4 py-3" colspan="10">
                  <div class="h-4 bg-slate-200 rounded w-full"></div>
                </td>
              </tr>

              <!-- Filas de segmentos -->
              <tr
                v-else
                v-for="(segment, idx) in store.segments"
                :key="segment.id"
                role="row"
                class="group transition-colors hover:bg-slate-50 cursor-pointer"
                :class="activeId === segment.id ? 'bg-brand-50 border-l-4 border-brand-500' : ''"
                @click="handleView(segment.id)"
                @keydown.enter="handleView(segment.id)"
                @keydown.space.prevent="handleView(segment.id)"
                tabindex="0"
                :aria-selected="activeId === segment.id"
              >
                <!-- Segmento -->
                <td class="px-4 py-3" role="cell">
                  <div class="flex items-center gap-2.5">
                    <div
                      class="w-3 h-3 rounded-full flex-shrink-0"
                      :style="{ backgroundColor: segColor(idx) }"
                      aria-hidden="true"
                    ></div>
                    <div>
                      <span class="font-bold text-slate-800">{{ segment.id }}</span>
                      <span class="text-slate-500 text-xs ml-1.5 hidden md:inline">{{ segment.label }}</span>
                    </div>
                  </div>
                </td>

                <!-- Rango -->
                <td class="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap" role="cell">
                  {{ formatNumber(segment.range.min, 0) }} –
                  {{ formatNumber(segment.range.max, 0) }}
                  <span class="text-slate-400 ml-1">{{ segment.range.unit }}</span>
                </td>

                <!-- Clientes -->
                <td class="px-4 py-3 text-right font-semibold text-slate-800 tabular-nums" role="cell">
                  {{ formatNumber(segment.clientCount, 0) }}
                </td>

                <!-- % Clientes -->
                <td class="px-4 py-3 text-right text-slate-600 tabular-nums" role="cell">
                  {{ formatPercent(segment.clientPercent) }}
                </td>

                <!-- % Cli Acum (barra) -->
                <td class="px-4 py-3" role="cell">
                  <div class="flex items-center gap-2">
                    <div class="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        class="h-full rounded-full bg-blue-500 transition-all duration-700"
                        :style="{ width: `${segment.clientPercentAccum}%` }"
                        role="progressbar"
                        :aria-valuenow="segment.clientPercentAccum"
                        aria-valuemin="0"
                        aria-valuemax="100"
                      ></div>
                    </div>
                    <span class="text-xs tabular-nums text-slate-500 w-9 text-right">
                      {{ formatPercent(segment.clientPercentAccum, 0) }}
                    </span>
                  </div>
                </td>

                <!-- Volumen -->
                <td class="px-4 py-3 text-right font-mono text-xs text-slate-700 tabular-nums" role="cell">
                  {{ formatNumber(segment.volume, 0) }}
                </td>

                <!-- % Volumen (badge) -->
                <td class="px-4 py-3 text-center" role="cell">
                  <span
                    class="inline-block px-2 py-0.5 rounded-full text-xs font-bold border tabular-nums"
                    :class="volumeBadgeClass(segment.volumePercent)"
                  >
                    {{ formatPercent(segment.volumePercent) }}
                  </span>
                </td>

                <!-- % Vol Acum (barra coloreada) -->
                <td class="px-4 py-3" role="cell">
                  <div class="flex items-center gap-2">
                    <div class="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        class="h-full rounded-full transition-all duration-700"
                        :style="{
                          width: `${segment.volumePercentAccum}%`,
                          backgroundColor: accumBarColor(segment.volumePercentAccum)
                        }"
                        role="progressbar"
                        :aria-valuenow="segment.volumePercentAccum"
                        aria-valuemin="0"
                        aria-valuemax="100"
                      ></div>
                    </div>
                    <span class="text-xs tabular-nums text-slate-500 w-9 text-right">
                      {{ formatPercent(segment.volumePercentAccum, 0) }}
                    </span>
                  </div>
                </td>

                <!-- Ticket Promedio -->
                <td class="px-4 py-3 text-right font-mono text-xs text-slate-700 tabular-nums" role="cell">
                  {{ formatNumber(segment.avgTicket, 0) }}
                  <span class="text-slate-400 ml-1">{{ segment.range.unit }}</span>
                </td>

                <!-- Acción -->
                <td class="px-4 py-3 text-center" role="cell">
                  <button
                    type="button"
                    @click.stop="handleView(segment.id)"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400"
                    :aria-label="`Ver clientes del segmento ${segment.id}`"
                  >
                    <i class="fa-solid fa-magnifying-glass text-[10px]" aria-hidden="true"></i>
                    Ver
                  </button>
                </td>
              </tr>

              <!-- Empty state -->
              <tr v-if="!store.isLoading && store.segments.length === 0" role="row">
                <td colspan="10" class="px-4 py-12 text-center" role="cell">
                  <i class="fa-solid fa-inbox text-4xl text-slate-300 mb-3 block" aria-hidden="true"></i>
                  <p class="text-slate-500">Ejecuta el análisis para ver los segmentos</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Leyenda de colores -->
        <div
          v-if="store.hasData"
          class="px-4 py-3 border-t border-slate-100 bg-slate-50 flex flex-wrap gap-4 text-xs text-slate-500"
          role="note"
          aria-label="Leyenda de concentración de volumen"
        >
          <span class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-full bg-green-400 inline-block" aria-hidden="true"></span>
            ≥30% concentración alta
          </span>
          <span class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-full bg-yellow-400 inline-block" aria-hidden="true"></span>
            15–30% concentración media
          </span>
          <span class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-full bg-orange-400 inline-block" aria-hidden="true"></span>
            &lt;15% concentración baja
          </span>
        </div>
      </div>

      <!-- ── VISTA CARDS (mobile-friendly) ───────────────────── -->
      <div
        v-else
        key="cards"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <!-- Skeleton cards -->
        <template v-if="store.isLoading">
          <div
            v-for="(_, i) in skeletonRows"
            :key="`sk-card-${i}`"
            class="bg-white rounded-xl border border-slate-200 p-5 animate-pulse space-y-3"
            aria-busy="true"
          >
            <div class="h-5 bg-slate-200 rounded w-1/3"></div>
            <div class="h-4 bg-slate-100 rounded w-2/3"></div>
            <div class="h-3 bg-slate-100 rounded w-full"></div>
            <div class="h-3 bg-slate-100 rounded w-3/4"></div>
          </div>
        </template>

        <!-- Cards de segmentos -->
        <button
          v-else
          v-for="(segment, idx) in store.segments"
          :key="segment.id"
          type="button"
          class="bg-white rounded-xl border p-5 text-left transition-all hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-brand-400"
          :class="activeId === segment.id
            ? 'border-brand-400 shadow-md ring-1 ring-brand-200'
            : 'border-slate-200'"
          @click="handleView(segment.id)"
          :aria-label="`Segmento ${segment.id}: ${segment.label}. Ver clientes.`"
        >
          <!-- Card header -->
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div
                class="w-4 h-4 rounded-full flex-shrink-0"
                :style="{ backgroundColor: segColor(idx) }"
                aria-hidden="true"
              ></div>
              <span class="font-bold text-slate-800">{{ segment.id }}</span>
            </div>
            <span
              class="text-xs px-2 py-0.5 rounded-full font-bold border"
              :class="volumeBadgeClass(segment.volumePercent)"
            >
              {{ formatPercent(segment.volumePercent) }} vol.
            </span>
          </div>

          <p class="text-sm text-slate-600 mb-4">{{ segment.label }}</p>

          <!-- Stats grid -->
          <div class="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p class="text-slate-400 mb-0.5">Clientes</p>
              <p class="font-semibold text-slate-800 tabular-nums">
                {{ formatNumber(segment.clientCount, 0) }}
                <span class="text-slate-400 font-normal">({{ formatPercent(segment.clientPercent) }})</span>
              </p>
            </div>
            <div>
              <p class="text-slate-400 mb-0.5">Ticket promedio</p>
              <p class="font-semibold text-slate-800 font-mono tabular-nums">
                {{ formatNumber(segment.avgTicket, 0) }}
                <span class="text-slate-400 font-normal">{{ segment.range.unit }}</span>
              </p>
            </div>
            <div>
              <p class="text-slate-400 mb-0.5">Rango</p>
              <p class="font-mono text-slate-700 tabular-nums">
                {{ formatNumber(segment.range.min, 0) }}–{{ formatNumber(segment.range.max, 0) }}
              </p>
            </div>
            <div>
              <p class="text-slate-400 mb-0.5">Vol. acumulado</p>
              <p class="font-semibold text-slate-800 tabular-nums">
                {{ formatPercent(segment.volumePercentAccum, 0) }}
              </p>
            </div>
          </div>

          <!-- CTA -->
          <div class="mt-4 flex items-center justify-end">
            <span class="text-xs text-brand-600 font-semibold flex items-center gap-1">
              Ver clientes
              <i class="fa-solid fa-arrow-right text-[10px]" aria-hidden="true"></i>
            </span>
          </div>
        </button>

        <!-- Empty -->
        <div
          v-if="!store.isLoading && store.segments.length === 0"
          class="col-span-full text-center py-12 text-slate-500"
          role="status"
        >
          <i class="fa-solid fa-inbox text-4xl text-slate-300 mb-3 block" aria-hidden="true"></i>
          <p>Ejecuta el análisis para ver los segmentos</p>
        </div>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>