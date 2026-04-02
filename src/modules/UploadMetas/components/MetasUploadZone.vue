<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUploadMetasStore } from '../stores/uploadMetasStore'
import { TARGET_LABELS } from '../types/uploadMetas'
import type { UploadTarget } from '../types/uploadMetas'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const store      = useUploadMetasStore()
const isDragging = ref(false)
const fileInput  = ref<HTMLInputElement | null>(null)

// Estado local del resultado de la última carga
const lastResult = ref<'success' | 'error' | null>(null)
const lastError  = ref('')

const emit = defineEmits<{
  (e: 'upload-success', message: string): void
  (e: 'upload-error',   error: string):   void
}>()

// ── Target checkboxes ─────────────────────────────────────────────────────────
const targets = (Object.keys(TARGET_LABELS) as UploadTarget[])

const toggleTarget = (t: UploadTarget) => {
  const idx = store.selectedTargets.indexOf(t)
  if (idx === -1) {
    store.selectedTargets.push(t)
  } else {
    if (store.selectedTargets.length > 1) store.selectedTargets.splice(idx, 1)
  }
}

// ── Progreso simulado ─────────────────────────────────────────────────────────
// Simula un avance fluido hasta 95% mientras el server procesa,
// luego salta a 100% al completarse.
const progress      = ref(0)
let   progressTimer: ReturnType<typeof setInterval> | null = null

const startProgress = () => {
  progress.value = 0
  progressTimer = setInterval(() => {
    if (progress.value < 90) {
      // Avanza rápido al inicio, más lento al acercarse al límite
      progress.value += Math.max(1, (90 - progress.value) * 0.08)
    }
  }, 120)
}

const finishProgress = () => {
  if (progressTimer) { clearInterval(progressTimer); progressTimer = null }
  progress.value = 100
  // Ocultar la barra después de un breve instante
  setTimeout(() => { progress.value = 0 }, 1800)
}

// ── Totales del último resultado ──────────────────────────────────────────────
const totalInsertados = computed(() =>
  Object.values(store.uploadStats.tablas).reduce((s, t) => s + t.registrosInsertados, 0)
)
const totalOmitidos = computed(() =>
  Object.values(store.uploadStats.tablas).reduce((s, t) => s + t.registrosDuplicadosOmitidos, 0)
)
const tablasUsadas = computed(() => Object.keys(store.uploadStats.tablas))

// ── File handling ─────────────────────────────────────────────────────────────
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
    lastResult.value = 'error'
    lastError.value  = 'Selecciona solo archivos Excel (.xlsx, .xls)'
    emit('upload-error', lastError.value)
    return
  }

  lastResult.value = null
  lastError.value  = ''
  startProgress()

  try {
    await store.uploadBatch(excelFiles)
    finishProgress()
    lastResult.value = 'success'
    emit('upload-success', store.uploadStats.message)
  } catch (error: any) {
    finishProgress()
    lastResult.value = 'error'
    lastError.value  = error.message || 'Error desconocido al procesar el archivo.'
    emit('upload-error', lastError.value)
  }
}
</script>

<template>
  <div class="flex flex-col gap-3">

    <!-- ── Zona de carga ───────────────────────────────────────────────────── -->
    <Card
      class="border-dashed border-2 transition-all duration-200"
      :class="isDragging ? 'border-teal-500 bg-teal-50 scale-[1.01]' : 'border-slate-300'"
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

        <!-- Selector de tablas destino -->
        <div class="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 text-left" @click.stop>
          <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            <i class="fa-solid fa-database mr-1"></i> Insertar en:
          </p>
          <div class="flex flex-col gap-2">
            <label v-for="t in targets" :key="t" class="flex items-center gap-2.5 cursor-pointer group">
              <div
                class="w-4 h-4 rounded border-2 flex items-center justify-center transition-all flex-shrink-0"
                :class="store.selectedTargets.includes(t)
                  ? 'bg-teal-600 border-teal-600'
                  : 'border-slate-300 bg-white group-hover:border-teal-400'"
                @click.prevent="toggleTarget(t)"
              >
                <i v-if="store.selectedTargets.includes(t)" class="fa-solid fa-check text-white text-[9px]"></i>
              </div>
              <span class="text-xs font-medium transition-colors" :class="store.selectedTargets.includes(t) ? 'text-teal-700' : 'text-slate-500'">
                <span
                  class="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono mr-1"
                  :class="t === 'test' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'"
                >{{ t === 'test' ? 'DEV' : 'PROD' }}</span>
                {{ TARGET_LABELS[t as keyof typeof TARGET_LABELS] }}
              </span>
            </label>
          </div>

          <!-- Warning prod -->
          <div
            v-if="store.selectedTargets.includes('prod')"
            class="mt-2.5 flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded p-2"
          >
            <i class="fa-solid fa-triangle-exclamation text-amber-500 text-xs mt-0.5"></i>
            <span class="text-[11px] text-amber-700 font-medium">
              Se insertará en producción (<strong>VentasIC</strong>). Verifica los datos antes de cargar.
            </span>
          </div>
        </div>

        <Button
          class="w-full bg-teal-600 hover:bg-teal-700 text-white shadow-md font-semibold transition-all"
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

    <!-- ── Barra de progreso ───────────────────────────────────────────────── -->
    <Transition name="slide-progress">
      <div v-if="store.isUploading || progress > 0" class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between text-xs font-medium text-slate-500">
          <span class="flex items-center gap-1.5">
            <i class="fa-solid fa-circle-notch fa-spin text-teal-500 text-[11px]"></i>
            {{ store.isUploading ? 'Cargando datos...' : 'Completado' }}
          </span>
          <span class="font-bold tabular-nums text-teal-700">{{ Math.round(progress) }}%</span>
        </div>
        <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
          <div
            class="h-full rounded-full transition-all duration-300 ease-out"
            :class="progress >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-teal-500 to-teal-400'"
            :style="{ width: `${Math.round(progress)}%` }"
          ></div>
        </div>
      </div>
    </Transition>

    <!-- ── Panel de resultado ─────────────────────────────────────────────── -->
    <Transition name="slide-fade">

      <!-- Error -->
      <div
        v-if="lastResult === 'error'"
        class="rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3 items-start"
      >
        <div class="rounded-full bg-red-100 p-2 flex-shrink-0">
          <i class="fa-solid fa-circle-xmark text-red-500 text-base"></i>
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="text-sm font-bold text-red-700 mb-1">Error en la carga</h4>
          <p class="text-xs text-red-600 break-words leading-relaxed">{{ lastError }}</p>
        </div>
        <button class="text-red-400 hover:text-red-600 transition-colors flex-shrink-0" @click="lastResult = null">
          <i class="fa-solid fa-xmark text-sm"></i>
        </button>
      </div>

      <!-- Success -->
      <div
        v-else-if="lastResult === 'success'"
        class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex flex-col gap-3"
      >
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="rounded-full bg-emerald-100 p-2">
              <i class="fa-solid fa-circle-check text-emerald-500 text-base"></i>
            </div>
            <h4 class="text-sm font-bold text-emerald-800">Carga completada</h4>
          </div>
          <button class="text-emerald-400 hover:text-emerald-600 transition-colors" @click="lastResult = null">
            <i class="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        <!-- Stat pills -->
        <div class="grid grid-cols-2 gap-2">
          <div class="bg-white rounded-lg border border-emerald-100 p-2.5 text-center">
            <div class="text-xl font-extrabold text-emerald-600 tabular-nums">{{ totalInsertados.toLocaleString('es-MX') }}</div>
            <div class="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mt-0.5">
              <i class="fa-solid fa-check mr-1 text-emerald-500"></i>Registros insertados
            </div>
          </div>
          <div class="bg-white rounded-lg border border-amber-100 p-2.5 text-center">
            <div class="text-xl font-extrabold text-amber-500 tabular-nums">{{ totalOmitidos.toLocaleString('es-MX') }}</div>
            <div class="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mt-0.5">
              <i class="fa-solid fa-clone mr-1 text-amber-400"></i>Duplicados omitidos
            </div>
          </div>
        </div>

        <!-- Detalle por tabla -->
        <div v-if="tablasUsadas.length > 0" class="flex flex-col gap-1">
          <div
            v-for="tabla in tablasUsadas"
            :key="tabla"
            class="flex items-center justify-between bg-white border border-emerald-100 rounded-lg px-3 py-2 text-xs"
          >
            <span class="font-mono text-slate-600 font-medium">{{ tabla }}</span>
            <div class="flex items-center gap-3">
              <span class="text-emerald-600 font-semibold">
                <i class="fa-solid fa-check mr-1 text-[10px]"></i>
                {{ store.uploadStats.tablas[tabla]?.registrosInsertados.toLocaleString('es-MX') ?? 0 }}
              </span>
              <span class="text-amber-500 font-semibold">
                <i class="fa-solid fa-clone mr-1 text-[10px]"></i>
                {{ store.uploadStats.tablas[tabla]?.registrosDuplicadosOmitidos.toLocaleString('es-MX') ?? 0 }}
              </span>
            </div>
          </div>
        </div>

        <p class="text-[11px] text-slate-500 flex items-center gap-1">
          <i class="fa-solid fa-circle-info text-slate-400"></i>
          Total enviado: <strong class="text-slate-600">{{ store.uploadStats.totalEnviados.toLocaleString('es-MX') }}</strong> registros
        </p>
      </div>

    </Transition>

  </div>
</template>

<style scoped>
/* Entrada de la barra de progreso */
.slide-progress-enter-active,
.slide-progress-leave-active {
  transition: all 0.3s ease;
}
.slide-progress-enter-from,
.slide-progress-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Entrada del panel de resultado */
.slide-fade-enter-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-fade-leave-active {
  transition: all 0.2s ease;
}
.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
