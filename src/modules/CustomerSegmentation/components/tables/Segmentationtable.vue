<script setup lang="ts">
import { computed } from 'vue'
import { useSegmentationStore } from '../../stores/segmentationStore'
import { useFormatters } from '../../composables/useFormatters'
import { useSegmentColors } from '../../composables/useSegmentColors'

interface Emits {
  (e: 'view-segment', segmentId: string): void
}

const emit = defineEmits<Emits>()

const store = useSegmentationStore()
const { formatNumber, formatPercent, formatRange } = useFormatters()
const { getSegmentColor } = useSegmentColors()

const segments = computed(() => store.segments)

const getRowClasses = (segmentId: string) => {
  const isActive = store.activeSegmentId === segmentId
  const base = 'hover:bg-slate-50 cursor-pointer transition-colors'
  
  if (isActive) {
    return `${base} bg-brand-50 border-l-4 border-brand-500`
  }
  
  return base
}

const handleRowClick = (segmentId: string) => {
  store.setActiveSegment(segmentId)
  emit('view-segment', segmentId)
}

const getProgressBarColor = (volumePercent: number) => {
  if (volumePercent >= 50) return 'bg-green-500'
  if (volumePercent >= 30) return 'bg-yellow-500'
  if (volumePercent >= 15) return 'bg-orange-500'
  return 'bg-red-500'
}
</script>

<template>
  <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
    <!-- Header -->
    <div class="p-4 border-b border-slate-200 bg-slate-50">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center">
            <i class="fa-solid fa-table text-slate-600"></i>
          </div>
          <div>
            <h3 class="font-bold text-slate-800">Detalle de Segmentos</h3>
            <p class="text-xs text-slate-500">
              {{ segments.length }} segmentos • {{ store.totalClients }} clientes totales
            </p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 border-b border-slate-200 sticky top-0">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Segmento
            </th>
            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Rango
            </th>
            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Clientes
            </th>
            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
              % Clientes
            </th>
            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
              % Acum.
            </th>
            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Volumen
            </th>
            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
              % Volumen
            </th>
            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
              % Vol. Acum.
            </th>
            <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Ticket Prom.
            </th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Acción
            </th>
          </tr>
        </thead>
        
        <tbody class="divide-y divide-slate-200">
          <tr
            v-for="(segment, index) in segments"
            :key="segment.id"
            :class="getRowClasses(segment.id)"
            @click="handleRowClick(segment.id)"
          >
            <!-- Segmento -->
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div
                  class="w-3 h-3 rounded-full flex-shrink-0"
                  :style="{ backgroundColor: getSegmentColor(index, store.currentGroupType).hex }"
                ></div>
                <div>
                  <div class="font-semibold text-slate-800">{{ segment.id }}</div>
                  <div class="text-xs text-slate-500">{{ segment.label }}</div>
                </div>
              </div>
            </td>
            
            <!-- Rango -->
            <td class="px-4 py-3 text-right">
              <div class="text-slate-700 font-mono text-xs">
                {{ formatRange(segment.range.min, segment.range.max, segment.range.unit) }}
              </div>
            </td>
            
            <!-- Clientes -->
            <td class="px-4 py-3 text-right font-semibold text-slate-800">
              {{ formatNumber(segment.clientCount, 0) }}
            </td>
            
            <!-- % Clientes -->
            <td class="px-4 py-3 text-right">
              <span class="text-slate-700">{{ formatPercent(segment.clientPercent) }}</span>
            </td>
            
            <!-- % Clientes Acum. -->
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-2">
                <div class="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-blue-500 transition-all duration-300"
                    :style="{ width: `${segment.clientPercentAccum}%` }"
                  ></div>
                </div>
                <span class="text-slate-600 font-medium">{{ formatPercent(segment.clientPercentAccum) }}</span>
              </div>
            </td>
            
            <!-- Volumen -->
            <td class="px-4 py-3 text-right font-semibold text-slate-800">
              {{ formatNumber(segment.volume, 0) }}
            </td>
            
            <!-- % Volumen -->
            <td class="px-4 py-3 text-right">
              <span
                class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold"
                :class="segment.volumePercent >= 30 ? 'bg-green-100 text-green-700' : 
                        segment.volumePercent >= 15 ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-orange-100 text-orange-700'"
              >
                {{ formatPercent(segment.volumePercent) }}
              </span>
            </td>
            
            <!-- % Volumen Acum. -->
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-2">
                <div class="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    class="h-full transition-all duration-300"
                    :class="getProgressBarColor(segment.volumePercentAccum)"
                    :style="{ width: `${segment.volumePercentAccum}%` }"
                  ></div>
                </div>
                <span class="text-slate-600 font-medium">{{ formatPercent(segment.volumePercentAccum) }}</span>
              </div>
            </td>
            
            <!-- Ticket Promedio -->
            <td class="px-4 py-3 text-right text-slate-700 font-mono text-xs">
              {{ formatNumber(segment.avgTicket, 0) }}
            </td>
            
            <!-- Acción -->
            <td class="px-4 py-3 text-center">
              <button
                type="button"
                @click.stop="emit('view-segment', segment.id)"
                class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
              >
                <i class="fa-solid fa-eye"></i>
                Ver
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Empty State -->
    <div
      v-if="segments.length === 0"
      class="p-12 text-center"
    >
      <i class="fa-solid fa-table text-4xl text-slate-300 mb-3"></i>
      <p class="text-slate-600 font-medium">No hay segmentos para mostrar</p>
      <p class="text-sm text-slate-500 mt-1">
        Ejecuta el análisis de segmentación para ver los resultados
      </p>
    </div>
    
    <!-- Footer con Leyenda -->
    <div
      v-if="segments.length > 0"
      class="p-4 border-t border-slate-200 bg-slate-50"
    >
      <div class="flex flex-wrap items-center gap-4 text-xs text-slate-600">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 bg-green-500 rounded-full"></div>
          <span>Alta concentración (≥50%)</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <span>Media concentración (30-50%)</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 bg-orange-500 rounded-full"></div>
          <span>Baja concentración (<30%)</span>
        </div>
      </div>
    </div>
  </div>
</template>