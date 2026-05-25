// src/modules/UploadOC/components/UploadZone.vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUploadOcStore } from '../stores/uploadOcStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

// Import logos from assets
import todasLogo from '@/assets/chains/todas.svg'
import sorianaLogo from '@/assets/chains/soriana.svg'
import walmartLogo from '@/assets/chains/walmart.svg'
import chedrauiLogo from '@/assets/chains/chedraui.svg'
import samsLogo from '@/assets/chains/sams.svg'

const store = useUploadOcStore()
const isDragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const selectedChain = ref('SORIANA') // Por defecto Soriana, preparado para dinámico

// Mapeo de logos
const logos: Record<string, string> = {
  TODAS: todasLogo,
  SORIANA: sorianaLogo,
  WALMART: walmartLogo,
  CHEDRAUI: chedrauiLogo,
  SAMS: samsLogo
}

// Determina si la cadena activa es de solo lectura en este módulo
const isReadOnlyChain = computed(() => {
  const activeChain = store.filters.cadenas[0]
  return !!activeChain && activeChain !== 'SORIANA'
})

// Logo de la cadena activa
const activeChainLogo = computed(() => {
  const activeChain = store.filters.cadenas[0] || 'TODAS'
  return logos[activeChain.toUpperCase()] || todasLogo
})

// Devuelve el nombre de la cadena formateado
const activeChainName = computed(() => {
  const activeChain = store.filters.cadenas[0]
  if (!activeChain) return ''
  // SAMS -> Sams, WALMART -> Walmart, CHEDRAUI -> Chedraui
  if (activeChain.toUpperCase() === 'SAMS') return "Sam's"
  return activeChain.charAt(0) + activeChain.slice(1).toLowerCase()
})

const emit = defineEmits<{
  (e: 'upload-success', message: string): void
  (e: 'upload-error', error: string): void
}>()

const handleDrop = async (event: DragEvent) => {
  isDragging.value = false
  const files = Array.from(event.dataTransfer?.files || [])
  await processFiles(files)
}

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  await processFiles(files)
  if (fileInput.value) fileInput.value.value = '' // Reset
}

const processFiles = async (files: File[]) => {
  const excelFiles = files.filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))
  if (excelFiles.length === 0) {
    emit('upload-error', 'Por favor, selecciona solo archivos Excel (.xlsx, .xls)')
    return
  }

  try {
    await store.uploadBatch(excelFiles, selectedChain.value)
    emit('upload-success', store.uploadStats.message)
  } catch (error: any) {
    emit('upload-error', error.message || 'Error al procesar los archivos.')
  }
}
</script>

<template>
  <Card 
    v-if="isReadOnlyChain" 
    class="border border-slate-200 bg-slate-50/50 shadow-sm transition-all overflow-hidden"
  >
    <CardContent class="flex flex-col items-center justify-center p-10 text-center">
      <!-- Logo Container -->
      <div class="relative w-20 h-20 rounded-2xl bg-white shadow-md border border-slate-100 flex items-center justify-center p-3 mb-6 group transition-all duration-300 hover:shadow-lg hover:border-slate-200">
        <img 
          :src="activeChainLogo" 
          :alt="activeChainName" 
          class="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110" 
        />
        <!-- Status indicator badge -->
        <span class="absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white text-[10px] shadow-sm border-2 border-white">
          <i class="fa-solid fa-link"></i>
        </span>
      </div>

      <h3 class="text-lg font-bold text-slate-800 mb-2">Órdenes de {{ activeChainName }}</h3>
      <p class="text-sm text-slate-500 leading-relaxed mb-6">
        Las órdenes de compra de esta cadena se sincronizan automáticamente en el sistema y son únicamente de visualización. No requiere carga manual de archivos.
      </p>
      <div class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50/80 rounded-full text-xs font-semibold text-blue-700 border border-blue-100">
        <span class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
        Sincronizado con base de datos
      </div>
    </CardContent>
  </Card>

  <Card v-else class="border-dashed border-2 transition-colors" :class="isDragging ? 'border-brand-500 bg-brand-50' : 'border-slate-300'">
    <CardContent 
      class="flex flex-col items-center justify-center p-10 text-center cursor-pointer"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
      @click="fileInput?.click()"
    >
      <input 
        type="file" 
        multiple 
        accept=".xlsx, .xls" 
        class="hidden" 
        ref="fileInput" 
        @change="handleFileSelect"
      />
      <!-- Soriana Logo Container -->
      <div class="relative w-20 h-20 rounded-2xl bg-white shadow-md border border-slate-100 flex items-center justify-center p-3 mb-6 group transition-all duration-300 hover:shadow-lg hover:border-slate-200" @click.stop>
        <img 
          :src="sorianaLogo" 
          alt="Soriana" 
          class="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110" 
        />
        <!-- Upload badge -->
        <span class="absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] shadow-sm border-2 border-white">
          <i class="fa-solid fa-arrow-up-from-bracket"></i>
        </span>
      </div>

      <h3 class="text-lg font-semibold text-slate-700">Arrastra tus archivos Excel aquí</h3>
      <p class="text-sm text-slate-500 mb-4">o haz clic para explorar en tu equipo</p>
      
      <div class="flex items-center gap-2 mt-2" @click.stop>
        <span class="text-xs text-slate-500 font-medium">Cadena destino:</span>
        <select v-model="selectedChain" class="text-sm border-slate-200 rounded p-1 text-slate-700">
          <option value="SORIANA">Soriana</option>
          </select>
      </div>

      <Button class="mt-4" :disabled="store.isUploading" variant="secondary">
        <span v-if="store.isUploading"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Procesando...</span>
        <span v-else>Seleccionar Archivos</span>
      </Button>
    </CardContent>
  </Card>
</template>