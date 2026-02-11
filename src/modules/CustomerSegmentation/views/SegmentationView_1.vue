<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSegmentationStore } from '../stores/segmentationStore'
import SegmentationFilters from '../components/filters/SegmentationFilters.vue'
import SegmentationKPIs from '../components/cards/SegmentationKPIs.vue'
import SegmentationChart from '../components/charts/SegmentationChart.vue'
import SegmentationTable from '../components/tables/SegmentationTable.vue'
import SegmentDetailModal from '../components/modals/SegmentDetailModal.vue'

const store = useSegmentationStore()

const showSegmentModal = ref(false)
const selectedSegmentForModal = computed(() => {
  if (!store.activeSegmentId) return null
  return store.segments.find(s => s.id === store.activeSegmentId) ?? null
})

const handleViewSegment = (segmentId: string) => {
  const segment = store.segments.find(s => s.id === segmentId)
  if (segment) {
    store.setActiveSegment(segmentId)
    showSegmentModal.value = true
  }
}

const handleExport = async () => {
  if (!store.hasData) return
  
  try {
    const result = await store.exportClients(store.segments)
    
    // Crear archivo para descarga
    const jsonStr = JSON.stringify(result.clients, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `segmentacion_${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
    
  } catch (error) {
    console.error('Error al exportar:', error)
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <!-- Header -->
    <div class="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div class="max-w-[1800px] mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-brand-600 rounded-xl flex items-center justify-center shadow-lg">
              <i class="fa-solid fa-chart-pie text-white text-xl"></i>
            </div>
            <div>
              <h1 class="text-2xl font-bold text-slate-800">Segmentación de Clientes</h1>
              <p class="text-sm text-slate-500">Análisis avanzado de concentración y estrategias comerciales</p>
            </div>
          </div>
          
          <div class="flex items-center gap-3">
            <!-- Export Button -->
            <button
              v-if="store.hasData"
              @click="handleExport"
              type="button"
              class="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm"
            >
              <i class="fa-solid fa-download"></i>
              Exportar
            </button>
            
            <!-- Help Button -->
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
    
    <!-- Main Content -->
    <div class="max-w-[1800px] mx-auto px-6 py-6 space-y-6">
      
      <!-- Filters Panel -->
      <SegmentationFilters />
      
      <!-- Error Message -->
      <div
        v-if="store.error"
        class="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3"
      >
        <i class="fa-solid fa-exclamation-circle text-red-500 text-xl mt-0.5"></i>
        <div class="flex-1">
          <h3 class="font-bold text-red-800 mb-1">Error al procesar</h3>
          <p class="text-sm text-red-700">{{ store.error }}</p>
        </div>
        <button
          @click="store.error = null"
          class="p-1 hover:bg-red-100 rounded transition-colors"
        >
          <i class="fa-solid fa-xmark text-red-500"></i>
        </button>
      </div>
      
      <!-- Results Section (only show if data exists or loading) -->
      <template v-if="store.hasData || store.isLoading">
        
        <!-- KPIs -->
        <SegmentationKPIs />
        
        <!-- Visualization -->
        <SegmentationChart @segment-click="handleViewSegment" />
        
        <!-- Table -->
        <SegmentationTable @view-segment="handleViewSegment" />
        
      </template>
      
      <!-- Welcome/Empty State (only show if no data and not loading) -->
      <div
        v-if="!store.hasData && !store.isLoading"
        class="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-12"
      >
        <div class="max-w-2xl mx-auto text-center">
          <div class="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-100 to-brand-100 rounded-3xl mb-6">
            <i class="fa-solid fa-chart-scatter text-5xl text-purple-600"></i>
          </div>
          
          <h2 class="text-3xl font-bold text-slate-800 mb-3">
            Bienvenido al Análisis de Segmentación
          </h2>
          
          <p class="text-lg text-slate-600 mb-8">
            Descubre patrones ocultos en tu cartera de clientes y optimiza tus estrategias comerciales
          </p>
          
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <div class="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <i class="fa-solid fa-layer-group text-3xl text-green-600 mb-3"></i>
              <h3 class="font-bold text-slate-800 mb-1">Segmenta</h3>
              <p class="text-sm text-slate-600">Agrupa clientes por cuartiles, quintiles, deciles o percentiles</p>
            </div>
            
            <div class="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
              <i class="fa-solid fa-chart-pie text-3xl text-blue-600 mb-3"></i>
              <h3 class="font-bold text-slate-800 mb-1">Visualiza</h3>
              <p class="text-sm text-slate-600">Gráficos interactivos para identificar concentración</p>
            </div>
            
            <div class="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
              <i class="fa-solid fa-bullseye text-3xl text-purple-600 mb-3"></i>
              <h3 class="font-bold text-slate-800 mb-1">Actúa</h3>
              <p class="text-sm text-slate-600">Recibe recomendaciones automáticas por segmento</p>
            </div>
          </div>
          
          <div class="inline-flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm">
            <i class="fa-solid fa-arrow-up"></i>
            <span>Configura los filtros arriba y haz clic en <strong>"Analizar Segmentación"</strong></span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Segment Detail Modal -->
    <SegmentDetailModal
      v-model="showSegmentModal"
      :segment="selectedSegmentForModal"
    />
  </div>
</template>