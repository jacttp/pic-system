<script setup lang="ts">
// src/modules/CPFR/components/CpfrStoreConfigModal.vue
// Modal de config por tienda — GET|PUT /api/v2/cpfr/config/:id_cliente
// + GET|PUT|DELETE /api/v2/cpfr/config/:id_cliente/skus/:sku_muliix
import { ref, reactive, watch, onMounted } from 'vue'
import { useCpfrStore } from '../stores/cpfrStore'
import type { CpfrStoreConfig } from '../types/cpfrTypes'

const props = defineProps<{
  idCliente: string
  nombreTienda?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const store = useCpfrStore()

// ── Form state ────────────────────────────────────────────────────────────────

const form = reactive<Omit<CpfrStoreConfig, 'id_cliente' | 'nombre_tienda' | 'factor_ajuste'>>({
  dia_cadena: 1,
  dia_ventas: 1,
  lead_time: 2,
  semanas_objetivo: 2.5,
  semanas_sellout: 6,
})

const saveSuccess = ref(false)

watch(() => store.storeConfig, (cfg) => {
  if (cfg) {
    form.dia_cadena      = cfg.dia_cadena
    form.dia_ventas      = cfg.dia_ventas
    form.lead_time       = cfg.lead_time
    form.semanas_objetivo = cfg.semanas_objetivo
    form.semanas_sellout = cfg.semanas_sellout
  }
}, { immediate: true })

onMounted(() => {
  store.fetchConfig(props.idCliente)
})

async function save() {
  const ok = await store.saveConfig(props.idCliente, { ...form })
  if (ok) {
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 2500)
  }
}

// ── SKU overrides ─────────────────────────────────────────────────────────────

const newSkuId  = ref('')
const newSkuSem = ref(2.5)
const addingSku = ref(false)
const skuError  = ref('')

async function addOverride() {
  if (!newSkuId.value.trim()) { skuError.value = 'Ingresa un SKU Muliix'; return }
  skuError.value = ''
  addingSku.value = true
  await store.upsertSkuOverride(props.idCliente, newSkuId.value.trim(), newSkuSem.value)
  addingSku.value = false
  newSkuId.value = ''
  newSkuSem.value = 2.5
}

async function deleteOverride(sku_muliix: string) {
  await store.deleteSkuOverride(props.idCliente, sku_muliix)
}

const DIA_LABELS: Record<number, string> = {
  1: 'Lunes', 2: 'Martes', 3: 'Miércoles',
  4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 7: 'Domingo',
}
</script>

<template>
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm"
    @click.self="emit('close')"
  >
    <!-- Modal card -->
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto flex flex-col">

      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
        <div class="flex items-center gap-2 min-w-0">
          <i class="fa-solid fa-gear text-indigo-500 shrink-0"></i>
          <div class="min-w-0">
            <h2 class="text-sm font-bold text-slate-800 truncate">Configuración de Tienda</h2>
            <p class="text-[11px] text-slate-400 truncate">{{ props.nombreTienda ?? props.idCliente }}</p>
          </div>
        </div>
        <button class="text-slate-300 hover:text-slate-500 transition-colors ml-3 shrink-0" @click="emit('close')">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 space-y-6">

        <!-- Loading config -->
        <div v-if="store.configLoading" class="flex justify-center py-8">
          <i class="fa-solid fa-circle-notch fa-spin text-indigo-400 text-2xl"></i>
        </div>

        <!-- Error config -->
        <div v-else-if="store.configError" class="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5">
          <i class="fa-solid fa-circle-exclamation text-rose-500"></i>
          <p class="text-xs text-rose-600">{{ store.configError }}</p>
        </div>

        <template v-else>

          <!-- ─ Configuración general ─ -->
          <section>
            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Configuración General</p>

            <div class="grid grid-cols-2 gap-3">

              <!-- Día cadena -->
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-slate-600">
                  Día Cadena
                  <span class="text-slate-300 font-normal ml-1">(día que envía la OC)</span>
                </label>
                <select
                  v-model.number="form.dia_cadena"
                  class="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option v-for="(label, num) in DIA_LABELS" :key="num" :value="Number(num)">{{ label }}</option>
                </select>
              </div>

              <!-- Día ventas -->
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-slate-600">
                  Día Ventas
                  <span class="text-slate-300 font-normal ml-1">(día de reparto)</span>
                </label>
                <select
                  v-model.number="form.dia_ventas"
                  class="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option v-for="(label, num) in DIA_LABELS" :key="num" :value="Number(num)">{{ label }}</option>
                </select>
              </div>

              <!-- Lead time -->
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-slate-600">Lead Time <span class="text-slate-300 font-normal">(días)</span></label>
                <input
                  v-model.number="form.lead_time"
                  type="number" min="0" max="14"
                  class="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <!-- Semanas objetivo -->
              <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-slate-600">Semanas Objetivo <span class="text-slate-300 font-normal">(Escenario B)</span></label>
                <input
                  v-model.number="form.semanas_objetivo"
                  type="number" min="0.5" max="12" step="0.5"
                  class="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <!-- Semanas sellout -->
              <div class="flex flex-col gap-1.5 col-span-2">
                <label class="text-xs font-semibold text-slate-600">Semanas Sellout <span class="text-slate-300 font-normal">(histórico para promedio)</span></label>
                <input
                  v-model.number="form.semanas_sellout"
                  type="number" min="1" max="52"
                  class="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

            </div>

            <!-- Factor ajuste (solo lectura) -->
            <div v-if="store.storeConfig?.factor_ajuste != null" class="mt-3 flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
              <i class="fa-solid fa-lock text-slate-300 text-xs"></i>
              <p class="text-xs text-slate-500">
                <span class="font-semibold">Factor Ajuste:</span>
                <span class="ml-1.5 font-mono text-slate-700">{{ store.storeConfig.factor_ajuste }}</span>
                <span class="ml-1.5 text-slate-300 text-[11px]">— Solo lectura (calculado por SQL Server)</span>
              </p>
            </div>

            <!-- Error guardar -->
            <div v-if="store.configError && !store.configLoading" class="mt-3 flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              <i class="fa-solid fa-circle-exclamation text-rose-500 text-xs"></i>
              <p class="text-xs text-rose-600">{{ store.configError }}</p>
            </div>

            <!-- Éxito guardar -->
            <div v-if="saveSuccess" class="mt-3 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <i class="fa-solid fa-circle-check text-emerald-500 text-xs"></i>
              <p class="text-xs text-emerald-600 font-semibold">Configuración guardada correctamente.</p>
            </div>

          </section>

          <!-- ─ Divider ─ -->
          <div class="h-px bg-slate-100"></div>

          <!-- ─ SKU Overrides ─ -->
          <section>
            <div class="flex items-center justify-between mb-3">
              <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Override por SKU</p>
              <span class="text-[10px] text-slate-300">Prioridad sobre el valor general</span>
            </div>

            <!-- Add form -->
            <div class="flex items-end gap-2 mb-3">
              <div class="flex-1 flex flex-col gap-1">
                <label class="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">SKU Muliix</label>
                <input
                  v-model="newSkuId"
                  type="text"
                  placeholder="7501182300375"
                  class="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div class="w-24 flex flex-col gap-1">
                <label class="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Sem. Obj.</label>
                <input
                  v-model.number="newSkuSem"
                  type="number" min="0.5" max="12" step="0.5"
                  class="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <button
                class="h-8 px-3 rounded-lg text-xs font-bold text-white transition-colors shrink-0 flex items-center gap-1"
                :class="addingSku ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'"
                :disabled="addingSku"
                @click="addOverride"
              >
                <i :class="addingSku ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-plus'" class="text-[10px]"></i>
                Add
              </button>
            </div>

            <p v-if="skuError" class="text-xs text-rose-500 mb-2">{{ skuError }}</p>

            <!-- Lista de overrides -->
            <div v-if="store.skuOverridesLoading" class="flex justify-center py-4">
              <i class="fa-solid fa-circle-notch fa-spin text-indigo-300"></i>
            </div>

            <div v-else-if="!store.skuOverrides.length" class="py-4 text-center text-slate-300 text-xs">
              <i class="fa-solid fa-list-check block text-xl mb-1.5"></i>
              Sin overrides. Todos los SKUs usan el valor general ({{ form.semanas_objetivo }} sem.)
            </div>

            <div v-else class="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
              <div
                v-for="ov in store.skuOverrides"
                :key="ov.sku_muliix"
                class="flex items-center gap-3 px-3.5 py-2.5 bg-white hover:bg-slate-50 transition-colors"
              >
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-mono text-slate-600 truncate">{{ ov.sku_muliix }}</p>
                  <p v-if="ov.sku_nombre" class="text-[10px] text-slate-400 truncate">{{ ov.sku_nombre }}</p>
                </div>
                <span class="shrink-0 text-sm font-bold text-indigo-600 w-10 text-right">{{ ov.semanas_objetivo }}</span>
                <span class="text-[10px] text-slate-400 shrink-0">sem.</span>
                <button
                  class="shrink-0 text-slate-300 hover:text-rose-400 transition-colors ml-1"
                  title="Eliminar override"
                  @click="deleteOverride(ov.sku_muliix)"
                >
                  <i class="fa-solid fa-trash text-[11px]"></i>
                </button>
              </div>
            </div>

          </section>

        </template>

      </div>

      <!-- Footer -->
      <div class="flex justify-end gap-2 px-6 py-4 bg-slate-50 border-t border-slate-100 sticky bottom-0">
        <button
          class="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
          @click="emit('close')"
        >
          Cerrar
        </button>
        <button
          v-if="!store.configLoading && !store.configError"
          class="px-5 py-2 rounded-lg text-xs font-bold text-white transition-colors flex items-center gap-2"
          :class="store.configSaving ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'"
          :disabled="store.configSaving"
          @click="save"
        >
          <i :class="store.configSaving ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-floppy-disk'"></i>
          {{ store.configSaving ? 'Guardando...' : 'Guardar Config' }}
        </button>
      </div>

    </div>
  </div>
</template>
