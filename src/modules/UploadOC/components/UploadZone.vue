// src/modules/UploadOC/components/UploadZone.vue
<script setup lang="ts">
import { ref } from 'vue'
import { useUploadOcStore } from '../stores/uploadOcStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const store = useUploadOcStore()
const isDragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const selectedChain = ref('SORIANA') // Por defecto Soriana, preparado para dinámico

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
  <Card class="border-dashed border-2 transition-colors" :class="isDragging ? 'border-brand-500 bg-brand-50' : 'border-slate-300'">
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
      <div class="rounded-full bg-slate-100 p-4 mb-4">
        <i class="fa-solid fa-cloud-arrow-up text-2xl text-slate-500"></i>
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