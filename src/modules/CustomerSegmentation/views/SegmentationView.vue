<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSegmentationStore } from '../stores/segmentationStore'
import SegmentationFilters from '../components/filters/SegmentationFilters.vue'
import SegmentationKPIs from '../components/cards/SegmentationKpis.vue'
import SegmentationChart from '../components/charts/SegmentationChart.vue'
import SegmentationTable from '../components/tables/SegmentationTable.vue'
import SegmentDetailModal from '../components/modals/SegmentDetailModal.vue'
import ExportPanel from '../components/export/ExportPanel.vue'

const store = useSegmentationStore()

// ── Modal de detalle de segmento ──────────────────────────────
const showSegmentModal = ref(false)

const selectedSegmentForModal = computed(() =>
  store.activeSegmentId
    ? (store.segments.find(s => s.id === store.activeSegmentId) ?? null)
    : null
)

const handleViewSegment = (segmentId: string) => {
  if (store.segments.find(s => s.id === segmentId)) {
    store.setActiveSegment(segmentId)
    showSegmentModal.value = true
  }
}

// ── Panel de exportación (drawer lateral en desktop) ─────────
const showExportPanel = ref(false)
</script>

<template>
  <div class="h-full overflow-y-auto bg-slate-50">

    <!-- ── HEADER ──────────────────────────────────────────────── -->
    <div class="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div class="max-w-[1800px] mx-auto px-4 md:px-6 py-4">
        <div class="flex items-center justify-between gap-4">

          <!-- Título -->
          <div class="flex items-center gap-3 md:gap-4 min-w-0">
            <div class="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-500 to-brand-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <i class="fa-solid fa-chart-pie text-white text-lg md:text-xl"></i>
            </div>
            <div class="min-w-0">
              <h1 class="text-lg md:text-2xl font-bold text-slate-800 truncate">
                Segmentación de Clientes
              </h1>
              <p class="text-xs text-slate-500 hidden sm:block">
                Análisis avanzado de concentración y estrategias comerciales
              </p>
            </div>
          </div>

          <!-- Acciones -->
          <div class="flex items-center gap-2 flex-shrink-0">
            <!-- Badge de datos cargados -->
            <div
              v-if="store.hasData"
              class="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-xs font-medium text-green-700"
            >
              <i class="fa-solid fa-circle-check"></i>
              {{ store.totalClients.toLocaleString('es-MX') }} clientes ·
              {{ store.currentGroupType }}
            </div>

            <!-- Botón exportar -->
            <button
              type="button"
              @click="showExportPanel = !showExportPanel"
              :class="[
                'inline-flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg font-medium text-sm transition-all border',
                showExportPanel
                  ? 'bg-green-600 text-white border-green-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              ]"
            >
              <i class="fa-solid fa-download"></i>
              <span class="hidden sm:inline">Exportar</span>
            </button>

            <!-- Ayuda -->
            <button
              type="button"
              class="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Ayuda"
            >
              <i class="fa-solid fa-circle-question text-slate-400 text-xl"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── CUERPO PRINCIPAL ────────────────────────────────────── -->
    <div class="max-w-[1800px] mx-auto px-4 md:px-6 py-6">
      <div class="flex gap-6">

        <!-- Columna principal -->
        <div class="flex-1 min-w-0 space-y-6">

          <!-- Filtros -->
          <SegmentationFilters />

          <!-- Error global -->
          <Transition name="fade">
            <div
              v-if="store.error"
              class="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3"
            >
              <i class="fa-solid fa-exclamation-circle text-red-500 text-xl mt-0.5 flex-shrink-0"></i>
              <div class="flex-1">
                <h3 class="font-bold text-red-800 mb-1">Error al procesar</h3>
                <p class="text-sm text-red-700">{{ store.error }}</p>
              </div>
              <button
                type="button"
                @click="store.error = null"
                class="p-1 hover:bg-red-100 rounded transition-colors flex-shrink-0"
              >
                <i class="fa-solid fa-xmark text-red-500"></i>
              </button>
            </div>
          </Transition>

          <!-- Resultados -->
          <template v-if="store.hasData || store.isLoading">
            <SegmentationKPIs />
            <SegmentationChart @segment-click="handleViewSegment" />
            <SegmentationTable @view-segment="handleViewSegment" />
          </template>

          <!-- Estado vacío / bienvenida -->
          <Transition name="fade">
            <div
              v-if="!store.hasData && !store.isLoading"
              class="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-10 md:p-16"
            >
              <div class="max-w-2xl mx-auto text-center">
                <div class="inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-purple-100 to-brand-100 rounded-3xl mb-6">
                  <i class="fa-solid fa-chart-scatter text-4xl md:text-5xl text-purple-600"></i>
                </div>

                <h2 class="text-2xl md:text-3xl font-bold text-slate-800 mb-3">
                  Bienvenido al Análisis de Segmentación
                </h2>
                <p class="text-base md:text-lg text-slate-600 mb-8">
                  Descubre patrones ocultos en tu cartera de clientes y optimiza tus estrategias comerciales
                </p>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-8">
                  <div class="p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                    <i class="fa-solid fa-layer-group text-2xl md:text-3xl text-green-600 mb-3"></i>
                    <h3 class="font-bold text-slate-800 mb-1">Segmenta</h3>
                    <p class="text-sm text-slate-600">Agrupa clientes por cuartiles, quintiles, deciles o percentiles</p>
                  </div>
                  <div class="p-5 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                    <i class="fa-solid fa-chart-pie text-2xl md:text-3xl text-blue-600 mb-3"></i>
                    <h3 class="font-bold text-slate-800 mb-1">Visualiza</h3>
                    <p class="text-sm text-slate-600">6 tipos de gráficos interactivos para identificar concentración</p>
                  </div>
                  <div class="p-5 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                    <i class="fa-solid fa-bullseye text-2xl md:text-3xl text-purple-600 mb-3"></i>
                    <h3 class="font-bold text-slate-800 mb-1">Actúa</h3>
                    <p class="text-sm text-slate-600">Recomendaciones automáticas por segmento y exportación CSV</p>
                  </div>
                </div>

                <div class="inline-flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm">
                  <i class="fa-solid fa-arrow-up animate-bounce"></i>
                  <span>Configura los filtros y haz clic en <strong>"Analizar Segmentación"</strong></span>
                </div>
              </div>
            </div>
          </Transition>

        </div>

        <!-- ── Panel lateral de exportación ──────────────────── -->
        <Transition name="slide-panel">
          <div
            v-if="showExportPanel"
            class="hidden lg:block w-96 flex-shrink-0"
          >
            <div class="sticky top-24">
              <ExportPanel />
            </div>
          </div>
        </Transition>

      </div>
    </div>

    <!-- ── Export drawer en móvil (bottom sheet) ─────────────── -->
    <Teleport to="body">
      <Transition name="sheet">
        <div
          v-if="showExportPanel"
          class="lg:hidden fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-2xl shadow-2xl"
        >
          <!-- Handle -->
          <div
            class="bg-white sticky top-0 pt-3 pb-1 flex justify-center border-b border-slate-100"
            @click="showExportPanel = false"
          >
            <div class="w-10 h-1 bg-slate-300 rounded-full"></div>
          </div>
          <ExportPanel />
        </div>
      </Transition>
      <!-- Backdrop móvil -->
      <Transition name="fade">
        <div
          v-if="showExportPanel"
          class="lg:hidden fixed inset-0 z-40 bg-black/40"
          @click="showExportPanel = false"
        ></div>
      </Transition>
    </Teleport>

    <!-- ── Modal detalle segmento ─────────────────────────────── -->
    <SegmentDetailModal
      v-model="showSegmentModal"
      :segment="selectedSegmentForModal"
    />

  </div>
</template>

<style scoped>
/* Fade genérico */
.fade-enter-active,
.fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }

/* Panel lateral (slide desde la derecha) */
.slide-panel-enter-active,
.slide-panel-leave-active { transition: all 0.25s ease; }
.slide-panel-enter-from,
.slide-panel-leave-to { opacity: 0; transform: translateX(24px); }

/* Bottom sheet (slide desde abajo) */
.sheet-enter-active,
.sheet-leave-active { transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1); }
.sheet-enter-from,
.sheet-leave-to { transform: translateY(100%); }
</style>