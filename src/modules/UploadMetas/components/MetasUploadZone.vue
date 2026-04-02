<script setup lang="ts">
import { ref } from 'vue'
import { useUploadMetasStore } from '../stores/uploadMetasStore'
import { TARGET_LABELS } from '../types/uploadMetas'
import type { UploadTarget } from '../types/uploadMetas'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const store      = useUploadMetasStore()
const isDragging = ref(false)
const fileInput  = ref<HTMLInputElement | null>(null)

const emit = defineEmits<{
  (e: 'upload-success', message: string): void
  (e: 'upload-error',   error: string):   void
}>()

// ── Target checkboxes ──────────────────────────────────────────────────────────

const targets = (Object.keys(TARGET_LABELS) as UploadTarget[])

const toggleTarget = (t: UploadTarget) => {
  const idx = store.selectedTargets.indexOf(t)
  if (idx === -1) {
    store.selectedTargets.push(t)
  } else {
    // Al menos uno debe quedar seleccionado
    if (store.selectedTargets.length > 1) {
      store.selectedTargets.splice(idx, 1)
    }
  }
}

// ── File handling ──────────────────────────────────────────────────────────────

const handleDrop = async (event: DragEvent) => {
  isDragging.value = false
  await processFiles(Array.from(event.dataTransfer?.files || []))
}

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  await processFiles(Array.from(target.files || []))
  if (fileInput.value) fileInput.value.value = ''
}

const processFiles = async (files: File[]) => {
  const excelFiles = files.filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))
  if (excelFiles.length === 0) {
    emit('upload-error', 'Por favor, selecciona solo archivos Excel (.xlsx, .xls)')
    return
  }
  try {
    await store.uploadBatch(excelFiles)
    emit('upload-success', store.uploadStats.message)
  } catch (error: any) {
    emit('upload-error', error.message || 'Error al procesar los archivos.')
  }
}
</script>

<template>
  <Card
    class="border-dashed border-2 transition-colors"
    :class="isDragging ? 'border-teal-500 bg-teal-50' : 'border-slate-300'"
  >
    <CardContent
      class="flex flex-col items-center justify-center p-8 text-center cursor-pointer"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
      @click="fileInput?.click()"
    >
      <input type="file" multiple accept=".xlsx,.xls" class="hidden" ref="fileInput" @change="handleFileSelect" />

      <!-- Icon -->
      <div
        class="rounded-full p-4 mb-3 transition-colors"
        :class="isDragging ? 'bg-teal-100' : 'bg-slate-100'"
      >
        <i
          class="fa-solid fa-file-excel text-2xl transition-colors"
          :class="isDragging ? 'text-teal-600' : 'text-slate-500'"
        ></i>
      </div>

      <h3 class="text-base font-semibold text-slate-700">Arrastra el archivo de Metas aquí</h3>
      <p class="text-xs text-slate-500 mb-4">o haz clic para explorar · (.xlsx, .xls)</p>

      <!-- ── Target selector ── -->
      <div
        class="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 text-left"
        @click.stop
      >
        <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
          <i class="fa-solid fa-database mr-1"></i> Insertar en:
        </p>
        <div class="flex flex-col gap-2">
          <label
            v-for="t in targets"
            :key="t"
            class="flex items-center gap-2.5 cursor-pointer group"
          >
            <div
              class="w-4 h-4 rounded border-2 flex items-center justify-center transition-all flex-shrink-0"
              :class="store.selectedTargets.includes(t)
                ? 'bg-teal-600 border-teal-600'
                : 'border-slate-300 bg-white group-hover:border-teal-400'"
              @click.prevent="toggleTarget(t)"
            >
              <i v-if="store.selectedTargets.includes(t)" class="fa-solid fa-check text-white text-[9px]"></i>
            </div>
            <span
              class="text-xs font-medium transition-colors"
              :class="store.selectedTargets.includes(t) ? 'text-teal-700' : 'text-slate-500'"
            >
              <span
                class="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono mr-1"
                :class="t === 'test' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'"
              >
                {{ t === 'test' ? 'DEV' : 'PROD' }}
              </span>
              {{ TARGET_LABELS[t as keyof typeof TARGET_LABELS] }}
            </span>
          </label>
        </div>

        <!-- Warning prod -->
        <div
          v-if="store.selectedTargets.includes('prod')"
          class="mt-2.5 flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded p-2 text-left"
        >
          <i class="fa-solid fa-triangle-exclamation text-amber-500 text-xs mt-0.5"></i>
          <span class="text-[11px] text-amber-700 font-medium">
            Se insertará en producción (<strong>VentasIC</strong>). Verifica los datos antes de cargar.
          </span>
        </div>
      </div>

      <Button
        class="w-full bg-teal-600 hover:bg-teal-700 text-white shadow-md font-semibold"
        :disabled="store.isUploading"
      >
        <span v-if="store.isUploading">
          <i class="fa-solid fa-spinner fa-spin mr-2"></i> Procesando...
        </span>
        <span v-else>
          <i class="fa-solid fa-cloud-arrow-up mr-2"></i> Seleccionar Archivo
        </span>
      </Button>
    </CardContent>
  </Card>
</template>
