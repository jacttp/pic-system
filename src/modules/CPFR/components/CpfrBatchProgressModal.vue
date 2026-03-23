<script setup lang="ts">
// src/modules/CPFR/components/CpfrBatchProgressModal.vue
// Modal de progreso del batch — GET /api/cpfr/batch-status/:job_id (polling)
import { computed, onUnmounted } from 'vue'
import { useCpfrStore } from '../stores/cpfrStore'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const store = useCpfrStore()

const status = computed(() => store.batchStatus)
const isCompleted = computed(() => status.value?.status === 'completed')
const isFailed    = computed(() => status.value?.status === 'failed')

function handleClose() {
  store.clearBatch()
  emit('close')
}

// Limpiar polling si el componente se desmonta sin cerrar manualmente
onUnmounted(() => {
  // El clearBatch en el store ya detendrá el polling
})

const statusLabel = computed(() => {
  if (!status.value) return 'Iniciando...'
  if (isCompleted.value) return 'Completado'
  if (isFailed.value) return 'Fallido'
  return `Procesando ${status.value.processed ?? 0} / ${status.value.total_stores ?? '?'} tiendas`
})

const progressPct = computed(() => status.value?.progress_pct ?? 0)
</script>

<template>
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
    @click.self="isCompleted || isFailed ? handleClose() : undefined"
  >
    <!-- Modal card -->
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">

      <!-- Header -->
      <div
        class="px-6 py-4 border-b border-slate-100 flex items-center gap-3"
        :class="isCompleted ? 'bg-emerald-50' : isFailed ? 'bg-rose-50' : 'bg-indigo-50/50'"
      >
        <i
          class="text-lg"
          :class="isCompleted
            ? 'fa-solid fa-circle-check text-emerald-500'
            : isFailed
              ? 'fa-solid fa-circle-exclamation text-rose-500'
              : 'fa-solid fa-circle-notch fa-spin text-indigo-400'"
        ></i>
        <div>
          <p class="text-sm font-bold text-slate-800">Batch CPFR en curso</p>
          <p class="text-[11px] text-slate-400 font-medium mt-0.5">{{ statusLabel }}</p>
        </div>
      </div>

      <!-- Body -->
      <div class="p-6 space-y-5">

        <!-- Barra de progreso -->
        <div>
          <div class="flex justify-between items-center mb-1.5">
            <span class="text-[11px] text-slate-500 font-medium">Progreso</span>
            <span class="text-[11px] font-bold"
              :class="isCompleted ? 'text-emerald-600' : isFailed ? 'text-rose-500' : 'text-indigo-600'"
            >{{ progressPct.toFixed(0) }}%</span>
          </div>
          <div class="h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="isCompleted ? 'bg-emerald-400' : isFailed ? 'bg-rose-400' : 'bg-indigo-400'"
              :style="{ width: progressPct + '%' }"
            ></div>
          </div>
        </div>

        <!-- Stats -->
        <div v-if="status" class="grid grid-cols-3 gap-3 text-center">
          <div class="bg-slate-50 rounded-xl py-2.5 px-2">
            <p class="text-[10px] uppercase tracking-widest text-slate-400">Total</p>
            <p class="text-lg font-bold text-slate-700">{{ status.total_stores }}</p>
          </div>
          <div class="bg-emerald-50 rounded-xl py-2.5 px-2">
            <p class="text-[10px] uppercase tracking-widest text-emerald-500">OK</p>
            <p class="text-lg font-bold text-emerald-600">{{ status.processed }}</p>
          </div>
          <div class="rounded-xl py-2.5 px-2" :class="status.failed > 0 ? 'bg-rose-50' : 'bg-slate-50'">
            <p class="text-[10px] uppercase tracking-widest" :class="status.failed > 0 ? 'text-rose-500' : 'text-slate-400'">Errores</p>
            <p class="text-lg font-bold" :class="status.failed > 0 ? 'text-rose-600' : 'text-slate-400'">{{ status.failed }}</p>
          </div>
        </div>

        <!-- Job ID (referencia) -->
        <p v-if="store.activeJobId" class="text-[10px] text-slate-300 text-center font-mono break-all">
          {{ store.activeJobId }}
        </p>

        <!-- Errores por tienda -->
        <div v-if="status?.errors?.length" class="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-1.5 max-h-32 overflow-y-auto">
          <p class="text-[10px] font-bold uppercase tracking-wide text-rose-600 mb-1">Tiendas con error</p>
          <div v-for="err in status.errors" :key="err.id_cliente" class="text-[11px] text-rose-700 flex gap-1.5 items-start">
            <i class="fa-solid fa-minus text-[8px] text-rose-400 mt-0.5 shrink-0"></i>
            <span><strong>{{ err.id_cliente }}</strong>: {{ err.error }}</span>
          </div>
        </div>

        <!-- Nota servidor -->
        <div v-if="store.batchError" class="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
          <i class="fa-solid fa-triangle-exclamation text-amber-500 mt-0.5 shrink-0"></i>
          <p class="text-[11px] text-amber-700">{{ store.batchError }}</p>
        </div>

        <!-- Nota si server puede reiniciar -->
        <p v-if="!isCompleted && !isFailed" class="text-[10px] text-slate-300 text-center">
          <i class="fa-solid fa-circle-info mr-1"></i>
          Si el servidor reinicia, el proceso se perderá. Verifica los pedidos manualmente.
        </p>

        <!-- Mensaje completado -->
        <p v-if="isCompleted" class="text-xs text-emerald-600 text-center font-semibold">
          <i class="fa-solid fa-circle-check mr-1"></i>
          Batch completado. La lista de pedidos se ha actualizado.
        </p>

      </div>

      <!-- Footer -->
      <div class="flex justify-end px-6 py-3.5 bg-slate-50 border-t border-slate-100">
        <button
          v-if="isCompleted || isFailed || store.batchError"
          class="px-5 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          @click="handleClose"
        >
          Cerrar
        </button>
        <span v-else class="text-[11px] text-slate-400 italic self-center">Polling cada 4 seg...</span>
      </div>

    </div>
  </div>
</template>
