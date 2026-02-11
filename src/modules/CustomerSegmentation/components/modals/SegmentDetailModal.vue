<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSegmentationStore } from '../../stores/segmentationStore'
import { useFormatters } from '../../composables/useFormatters'
import { useSegmentColors } from '../../composables/useSegmentColors'
import type { ClientSegment } from '../../types/segmentation.types'

interface Props {
  modelValue: boolean
  segment: ClientSegment | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const store = useSegmentationStore()
const { formatNumber, formatVolume, formatPercent, getStrategyColor } = useFormatters()
const { getSegmentColor } = useSegmentColors()

const currentPage = ref(1)
const pageSize = ref(20)

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const segmentColor = computed(() => {
  if (!props.segment) return { hex: '#64748b' }
  const index = store.segments.findIndex(s => s.id === props.segment.id)
  return getSegmentColor(index, store.currentGroupType)
})

// Cargar clientes cuando se abre el modal
watch(() => props.modelValue, async (isOpen) => {
  if (isOpen && props.segment) {
    currentPage.value = 1
    await loadClients()
  }
})

const loadClients = async () => {
  if (!props.segment) return
  await store.fetchSegmentClients(props.segment, currentPage.value, pageSize.value)
}

const goToPage = async (page: number) => {
  currentPage.value = page
  await loadClients()
}

const close = () => {
  isOpen.value = false
}

const clients = computed(() => store.segmentClientsData?.clients ?? [])
const pagination = computed(() => store.segmentClientsData?.pagination)
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        @click.self="close"
      >
        <Transition
          enter-active-class="transition-all duration-200"
          leave-active-class="transition-all duration-200"
          enter-from-class="opacity-0 scale-95"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="isOpen && segment"
            class="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <!-- Header -->
            <div
              class="p-6 border-b border-slate-200"
              :style="{ borderLeftWidth: '6px', borderLeftColor: segmentColor.hex }"
            >
              <div class="flex items-start justify-between">
                <div class="flex items-start gap-4 flex-1">
                  <div
                    class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    :style="{ backgroundColor: segmentColor.hex + '20' }"
                  >
                    <i class="fa-solid fa-users text-xl" :style="{ color: segmentColor.hex }"></i>
                  </div>
                  
                  <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                      <h2 class="text-2xl font-bold text-slate-800">{{ segment.label }}</h2>
                      <span class="text-sm font-mono text-slate-500">{{ segment.id }}</span>
                    </div>
                    
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                      <div>
                        <div class="text-xs text-slate-500 mb-1">Clientes</div>
                        <div class="text-lg font-bold text-slate-800">
                          {{ formatNumber(segment.clientCount, 0) }}
                          <span class="text-sm text-slate-500 font-normal ml-1">
                            ({{ formatPercent(segment.clientPercent) }})
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <div class="text-xs text-slate-500 mb-1">Volumen</div>
                        <div class="text-lg font-bold text-slate-800">
                          {{ formatVolume(segment.volume) }}
                          <span class="text-sm text-slate-500 font-normal ml-1">
                            ({{ formatPercent(segment.volumePercent) }})
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <div class="text-xs text-slate-500 mb-1">Ticket Promedio</div>
                        <div class="text-lg font-bold text-slate-800">
                          {{ formatNumber(segment.avgTicket, 0) }} {{ segment.range.unit }}
                        </div>
                      </div>
                      
                      <div>
                        <div class="text-xs text-slate-500 mb-1">Rango</div>
                        <div class="text-sm font-mono text-slate-700">
                          {{ formatNumber(segment.range.min, 0) }} - {{ formatNumber(segment.range.max, 0) }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <button
                  @click="close"
                  class="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <i class="fa-solid fa-xmark text-slate-400 text-xl"></i>
                </button>
              </div>
              
              <!-- Recomendación -->
              <div
                v-if="segment.recommendation"
                class="mt-4 p-3 rounded-lg border"
                :class="getStrategyColor(segment.recommendation.strategy)"
              >
                <div class="flex items-start gap-2">
                  <i class="fa-solid fa-lightbulb mt-0.5"></i>
                  <div class="flex-1">
                    <div class="font-semibold text-xs uppercase tracking-wide mb-0.5">
                      Estrategia Sugerida
                    </div>
                    <div class="text-sm">{{ segment.recommendation.message }}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Top Productos -->
            <div
              v-if="segment.topProducts.length > 0"
              class="p-6 border-b border-slate-200 bg-slate-50"
            >
              <h3 class="text-sm font-bold text-slate-700 mb-3">
                <i class="fa-solid fa-star text-yellow-500 mr-2"></i>
                Top Productos del Segmento
              </h3>
              <div class="flex flex-wrap gap-2">
                <div
                  v-for="product in segment.topProducts"
                  :key="product.sku"
                  class="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg"
                >
                  <span class="text-sm font-medium text-slate-800">{{ product.sku }}</span>
                  <span class="text-xs text-slate-500">
                    {{ formatPercent(product.percent) }}
                  </span>
                </div>
              </div>
            </div>
            
            <!-- Lista de Clientes -->
            <div class="flex-1 overflow-auto p-6">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-bold text-slate-700">
                  Lista de Clientes ({{ pagination?.totalClients ?? 0 }})
                </h3>
              </div>
              
              <!-- Loading -->
              <div v-if="store.isLoadingClients" class="space-y-3">
                <div v-for="i in 5" :key="i" class="h-16 bg-slate-100 rounded-lg animate-pulse"></div>
              </div>
              
              <!-- Clientes -->
              <div v-else-if="clients.length > 0" class="space-y-2">
                <div
                  v-for="client in clients"
                  :key="client.clientId"
                  class="p-4 bg-slate-50 border border-slate-200 rounded-lg hover:shadow-sm transition-shadow"
                >
                  <div class="flex items-start justify-between gap-4">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="font-semibold text-slate-800">{{ client.clientName }}</span>
                        <span class="text-xs text-slate-500 font-mono">{{ client.clientId }}</span>
                      </div>
                      <div class="flex items-center gap-4 text-xs text-slate-600">
                        <span>
                          <i class="fa-solid fa-building mr-1 text-slate-400"></i>
                          {{ client.gerencia }}
                        </span>
                        <span>
                          <i class="fa-solid fa-map-marker-alt mr-1 text-slate-400"></i>
                          {{ client.ruta }}
                        </span>
                        <span>
                          <i class="fa-solid fa-calendar mr-1 text-slate-400"></i>
                          {{ client.activeMonths }} meses activos
                        </span>
                      </div>
                    </div>
                    
                    <div class="text-right">
                      <div class="text-lg font-bold text-slate-800">
                        {{ formatNumber(client.volume, 0) }}
                      </div>
                      <div class="text-xs text-slate-500">
                        Ranking #{{ client.volumeRank }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Empty -->
              <div v-else class="text-center py-12">
                <i class="fa-solid fa-users text-4xl text-slate-300 mb-3"></i>
                <p class="text-slate-600">No hay clientes para mostrar</p>
              </div>
            </div>
            
            <!-- Paginación -->
            <div
              v-if="pagination && pagination.totalPages > 1"
              class="p-4 border-t border-slate-200 bg-slate-50"
            >
              <div class="flex items-center justify-between">
                <div class="text-sm text-slate-600">
                  Página {{ pagination.page }} de {{ pagination.totalPages }}
                </div>
                
                <div class="flex gap-2">
                  <button
                    @click="goToPage(pagination.page - 1)"
                    :disabled="!pagination.hasPrevPage || store.isLoadingClients"
                    class="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <i class="fa-solid fa-chevron-left"></i>
                  </button>
                  
                  <button
                    @click="goToPage(pagination.page + 1)"
                    :disabled="!pagination.hasNextPage || store.isLoadingClients"
                    class="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <i class="fa-solid fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>