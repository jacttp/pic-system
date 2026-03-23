<script setup lang="ts">
// src/modules/CPFR/components/CpfrGenerateModal.vue
import { ref } from 'vue'
import { useCpfrStore } from '../stores/cpfrStore'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const store = useCpfrStore()

const selectedStore = ref('')
const selectedYear  = ref(new Date().getFullYear())
const selectedWeek  = ref(getCurrentISOWeek())
const loading       = ref(false)
const success       = ref(false)
const errorMsg      = ref('')

function getCurrentISOWeek() {
  const now    = new Date()
  const jan4   = new Date(now.getFullYear(), 0, 4)
  const startW = new Date(jan4)
  startW.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  return Math.ceil(((now.getTime() - startW.getTime()) / 86400000 + 1) / 7)
}

async function generate() {
  if (!selectedStore.value) { errorMsg.value = 'Selecciona una tienda.'; return }
  loading.value = true
  errorMsg.value = ''
  success.value = false
  const ok = await store.generateOrder(selectedStore.value, selectedYear.value, selectedWeek.value)
  loading.value = false
  if (ok) {
    success.value = true
    setTimeout(() => emit('close'), 1800)
  } else {
    errorMsg.value = store.generateError ?? 'Error desconocido al generar pedido.'
  }
}
</script>

<template>
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm"
    @click.self="emit('close')"
  >
    <!-- Modal card -->
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-truck-ramp-box text-indigo-500"></i>
          <h2 class="text-sm font-bold text-slate-800">Generar Pedido CPFR</h2>
        </div>
        <button
          class="text-slate-300 hover:text-slate-500 transition-colors"
          @click="emit('close')"
        >
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 space-y-4">

        <!-- Tienda -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-slate-600">Tienda</label>
          <select
            v-model="selectedStore"
            class="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">Seleccionar tienda...</option>
            <option
              v-for="t in store.filterOptions.tiendas"
              :key="t.id"
              :value="t.id"
            >
              {{ t.nombre }}
            </option>
          </select>
        </div>

        <!-- Año + Semana -->
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-slate-600">Año</label>
            <input
              v-model.number="selectedYear"
              type="number"
              min="2020"
              max="2030"
              class="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-slate-600">Semana</label>
            <input
              v-model.number="selectedWeek"
              type="number"
              min="1"
              max="53"
              class="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>

        <!-- Info note -->
        <p class="text-[11px] text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
          <i class="fa-solid fa-circle-info mr-1 text-indigo-300"></i>
          El motor CPFR calculará el pedido basado en inventario actual,
          sellout promedio y la configuración de la tienda.
        </p>

        <!-- Error -->
        <p v-if="errorMsg" class="text-xs text-rose-500 flex items-center gap-1.5">
          <i class="fa-solid fa-circle-exclamation"></i>
          {{ errorMsg }}
        </p>

        <!-- Success -->
        <p v-if="success" class="text-xs text-emerald-600 flex items-center gap-1.5 font-semibold">
          <i class="fa-solid fa-circle-check"></i>
          Pedido generado exitosamente
        </p>

      </div>

      <!-- Footer -->
      <div class="flex justify-end gap-2 px-6 py-4 bg-slate-50 border-t border-slate-100">
        <button
          class="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
          @click="emit('close')"
        >
          Cancelar
        </button>
        <button
          class="px-5 py-2 rounded-lg text-xs font-bold text-white transition-colors flex items-center gap-2"
          :class="loading || success ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'"
          :disabled="loading || success"
          @click="generate"
        >
          <i :class="loading ? 'fa-solid fa-circle-notch fa-spin' : success ? 'fa-solid fa-check' : 'fa-solid fa-bolt'"></i>
          {{ loading ? 'Generando...' : success ? 'Listo' : 'Generar Pedido' }}
        </button>
      </div>

    </div>
  </div>
</template>
