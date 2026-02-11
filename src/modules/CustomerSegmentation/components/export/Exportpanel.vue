<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useSegmentationStore } from '../../stores/segmentationStore'
import { useExport } from '../../composables/useExport'
import { useFormatters } from '../../composables/useFormatters'
import { useSegmentColors } from '../../composables/useSegmentColors'

const store = useSegmentationStore()
const { exportSegmentsSummaryCSV, exportStatisticsCSV, exportFullReportCSV, exportClientsCSV } = useExport()
const { formatNumber, formatPercent } = useFormatters()
const { getSegmentColor } = useSegmentColors()

// ── Selección de segmentos ────────────────────────────────────
const selectedIds = reactive(new Set<string>())

const allSelected = computed(
  () => store.segments.length > 0 && selectedIds.size === store.segments.length
)

const toggleSegment = (id: string) => {
  selectedIds.has(id) ? selectedIds.delete(id) : selectedIds.add(id)
}

const toggleAll = () => {
  if (allSelected.value) {
    selectedIds.clear()
  } else {
    store.segments.forEach(s => selectedIds.add(s.id))
  }
}

// ── Estado de carga de exportaciones ────────────────────────
const loadingClients = ref(false)
const errorMsg = ref<string | null>(null)

// ── Acciones de exportación rápida ──────────────────────────
const exportSummary = () => {
  if (!store.data) return
  exportSegmentsSummaryCSV(store.data)
}

const exportStats = () => {
  if (!store.data) return
  exportStatisticsCSV(store.data)
}

const exportFull = () => {
  if (!store.data) return
  exportFullReportCSV(store.data)
}

// ── Exportar clientes (llama al backend por segmento) ────────
const exportClients = async () => {
  if (!store.data || selectedIds.size === 0) return

  loadingClients.value = true
  errorMsg.value = null

  try {
    const selectedSegments = store.segments.filter(s => selectedIds.has(s.id))

    // Una sola llamada con todos los segmentos seleccionados
    const result = await store.exportClients(selectedSegments)

    // result.clients es un array plano con campo segmentId
    // Agrupar en Map<segmentId, clients[]> para el composable
    const clientsMap = new Map<string, typeof result.clients>()
    selectedSegments.forEach(s => clientsMap.set(s.id, []))
    result.clients.forEach((c: any) => {
      const arr = clientsMap.get(c.segmentId)
      if (arr) arr.push(c)
    })

    exportClientsCSV(selectedSegments, clientsMap, store.metricUnit)

  } catch (e: any) {
    errorMsg.value = e?.response?.data?.error ?? 'Error al obtener los clientes'
  } finally {
    loadingClients.value = false
  }
}

// ── Botones de acción rápida ──────────────────────────────────
const quickActions = [
  {
    label: 'Resumen Segmentos',
    description: 'KPIs de cada segmento',
    icon: 'fa-table',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    action: exportSummary
  },
  {
    label: 'Estadísticas',
    description: 'Media, Gini, outliers',
    icon: 'fa-chart-scatter',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    action: exportStats
  },
  {
    label: 'Reporte Completo',
    description: 'Todo en un archivo',
    icon: 'fa-file-csv',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    action: exportFull
  }
]
</script>

<template>
  <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">

    <!-- Header -->
    <div class="p-5 border-b border-slate-200 bg-slate-50">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
          <i class="fa-solid fa-download text-green-600"></i>
        </div>
        <div>
          <h3 class="font-bold text-slate-800">Exportar Datos</h3>
          <p class="text-xs text-slate-500">Descarga los resultados en CSV</p>
        </div>
      </div>
    </div>

    <div class="p-5 space-y-6">

      <!-- Acciones rápidas -->
      <div>
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Reportes Generales
        </p>

        <div class="space-y-2">
          <button
            v-for="action in quickActions"
            :key="action.label"
            type="button"
            @click="action.action"
            :disabled="!store.hasData"
            class="w-full flex items-center gap-3 p-3.5 bg-white border border-slate-200 rounded-xl hover:border-brand-300 hover:bg-brand-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-left group"
          >
            <div
              class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
              :class="action.iconBg"
            >
              <i class="fa-solid" :class="[action.icon, action.iconColor]"></i>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-sm text-slate-800 group-hover:text-brand-700 transition-colors">
                {{ action.label }}
              </p>
              <p class="text-xs text-slate-500">{{ action.description }}</p>
            </div>
            <i class="fa-solid fa-arrow-down text-slate-300 group-hover:text-brand-400 transition-colors text-xs"></i>
          </button>
        </div>
      </div>

      <!-- Separador -->
      <div class="border-t border-slate-200"></div>

      <!-- Exportar clientes por segmento -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Clientes por Segmento
          </p>
          <button
            v-if="store.segments.length > 0"
            type="button"
            @click="toggleAll"
            class="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
          >
            {{ allSelected ? 'Quitar todos' : 'Todos' }}
          </button>
        </div>

        <!-- Lista de segmentos -->
        <div v-if="store.segments.length > 0" class="space-y-1.5 mb-4">
          <label
            v-for="(segment, idx) in store.segments"
            :key="segment.id"
            class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all select-none"
            :class="selectedIds.has(segment.id)
              ? 'border-brand-300 bg-brand-50'
              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'"
          >
            <input
              type="checkbox"
              :checked="selectedIds.has(segment.id)"
              @change="toggleSegment(segment.id)"
              class="w-4 h-4 text-brand-600 rounded focus:ring-brand-500 flex-shrink-0"
            />

            <!-- Indicador de color del segmento -->
            <div
              class="w-2.5 h-2.5 rounded-full flex-shrink-0"
              :style="{ backgroundColor: getSegmentColor(idx, store.currentGroupType).hex }"
            ></div>

            <div class="flex-1 min-w-0">
              <span class="font-semibold text-sm text-slate-800">{{ segment.id }}</span>
              <span class="text-xs text-slate-500 ml-1.5 truncate">{{ segment.label }}</span>
            </div>

            <div class="text-right flex-shrink-0">
              <div class="text-xs font-semibold text-slate-700">
                {{ formatNumber(segment.clientCount, 0) }}
              </div>
              <div class="text-xs text-slate-400">
                {{ formatPercent(segment.volumePercent) }}
              </div>
            </div>
          </label>
        </div>

        <!-- Sin datos -->
        <div v-else class="text-center py-8 text-slate-400 text-sm">
          <i class="fa-solid fa-users text-3xl mb-2 block text-slate-300"></i>
          Ejecuta el análisis primero
        </div>

        <!-- Error -->
        <Transition name="fade">
          <div
            v-if="errorMsg"
            class="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2"
          >
            <i class="fa-solid fa-circle-exclamation text-red-500 mt-0.5 flex-shrink-0"></i>
            <p class="text-sm text-red-700">{{ errorMsg }}</p>
          </div>
        </Transition>

        <!-- Botón de exportar clientes -->
        <button
          type="button"
          @click="exportClients"
          :disabled="selectedIds.size === 0 || loadingClients || !store.hasData"
          class="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-sm transition-all"
          :class="selectedIds.size > 0 && store.hasData
            ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm'
            : 'bg-slate-100 text-slate-400 cursor-not-allowed'"
        >
          <i
            class="fa-solid"
            :class="loadingClients ? 'fa-circle-notch fa-spin' : 'fa-users'"
          ></i>
          <span>
            {{ loadingClients
              ? 'Descargando...'
              : selectedIds.size === 0
                ? 'Selecciona segmentos'
                : `Descargar clientes · ${selectedIds.size} segmento${selectedIds.size > 1 ? 's' : ''}` }}
          </span>
        </button>

        <!-- Nota informativa -->
        <p class="text-xs text-slate-400 mt-2 text-center">
          <i class="fa-solid fa-info-circle mr-1"></i>
          La descarga puede tardar unos segundos según el volumen de datos
        </p>
      </div>

    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>