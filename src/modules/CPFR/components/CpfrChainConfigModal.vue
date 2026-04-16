<script setup lang="ts">
// src/modules/CPFR/components/CpfrChainConfigModal.vue
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { useCpfrStore } from '../stores/cpfrStore'
import type { CpfrStoreConfig } from '../types/cpfrTypes'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const store = useCpfrStore()
const search = ref('')
const selectedDay = ref<number | null>(null)

const dTags = [
  { num: 1, label: 'L' },
  { num: 2, label: 'M' },
  { num: 3, label: 'X' },
  { num: 4, label: 'J' },
  { num: 5, label: 'V' },
  { num: 6, label: 'S' },
  { num: 7, label: 'D' },
]

function toggleDay(num: number) {
  selectedDay.value = selectedDay.value === num ? null : num
}

// ── State for Local Changes ──────────────────────────────────────────────────
// Usamos un Map para rastrear cambios locales sin mutar el store directamente hasta guardar
const localConfigs = reactive<Record<string, CpfrStoreConfig>>({})
const modifiedIds = ref<Set<string>>(new Set())

// ── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(async () => {
  await store.fetchAllConfigs()
  // Inicializar copia local
  store.allConfigs.forEach(c => {
    localConfigs[c.id_cliente] = { ...c }
  })
})

// Sincronizar si el store cambia externamente
watch(() => store.allConfigs, (newVal) => {
  newVal.forEach(c => {
    if (!modifiedIds.value.has(c.id_cliente)) {
      localConfigs[c.id_cliente] = { ...c }
    }
  })
}, { deep: true })

// ── Computed ─────────────────────────────────────────────────────────────────
const filteredConfigs = computed(() => {
  let configs = Object.values(localConfigs)

  // Filtro por día (dia_ventas)
  if (selectedDay.value !== null) {
    configs = configs.filter(c => c.dia_ventas === selectedDay.value)
  }

  if (!search.value) return configs
  const s = search.value.toLowerCase()
  return configs.filter(c => 
    c.id_cliente.toLowerCase().includes(s) || 
    (c.nombre_tienda && c.nombre_tienda.toLowerCase().includes(s)) ||
    (c.jefatura && c.jefatura.toLowerCase().includes(s))
  )
})

const totalModified = computed(() => modifiedIds.value.size)

// ── Logic ────────────────────────────────────────────────────────────

function onFieldChange(id: string) {
  modifiedIds.value.add(id)
}

function resetConfig(id: string) {
  const original = store.allConfigs.find(c => c.id_cliente === id)
  if (original) {
    localConfigs[id] = { ...original }
    modifiedIds.value.delete(id)
  }
}

const isSaving = ref(false)
const saveMessage = ref('')

async function saveAllChanges() {
  if (modifiedIds.value.size === 0) return
  
  const confirmMsg = `Se modificarán ${modifiedIds.value.size} registros. ¿Deseas continuar?`
  if (!confirm(confirmMsg)) return

  isSaving.value = true
  saveMessage.value = 'Guardando cambios...'

  try {
    const promises = Array.from(modifiedIds.value).map(id => {
      const { id_cliente, nombre_tienda, factor_ajuste, ...payload } = localConfigs[id]
      return store.saveConfig(id, payload as any)
    })

    await Promise.all(promises)
    
    // Refrescar store y limpiar estado local
    await store.fetchAllConfigs()
    await store.loadDashboard() // <-- Recargar dashboard para aplicar cambios en la agrupación de días

    modifiedIds.value.clear()
    saveMessage.value = 'Cambios guardados con éxito.'
    setTimeout(() => { saveMessage.value = '' }, 3000)
  } catch (e) {
    console.error('Error saving configs:', e)
    saveMessage.value = 'Error al guardar algunos cambios.'
  } finally {
    isSaving.value = false
  }
}

// ── UI Helpers ───────────────────────────────────────────────────────────────
const DAY_OPTIONS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 7, label: 'Domingo' },
]

function getDayLabel(val: number) {
  return DAY_OPTIONS.find(d => d.value === val)?.label || val
}

/**
 * Cálculo del Factor de Ajuste (Espejo de SQL)
 * Fómula: ((((dia_ventas - dia_cadena) % 7 + 7) % 7) + lead_time) / 7.0
 */
function calculateLiveFactor(cfg: CpfrStoreConfig) {
  const dc = cfg.dia_cadena || 1
  const dv = cfg.dia_ventas || dc
  const lt = cfg.lead_time || 0
  
  const diff = (((dv - dc) % 7 + 7) % 7)
  const factor = (diff + lt) / 7
  return factor.toFixed(4)
}
</script>

<template>
  <div class="fixed inset-0 z-[100] flex justify-end overflow-hidden">
    <!-- Overlay/Backdrop -->
    <transition
      enter-active-class="transition-opacity ease-out duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div 
        class="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" 
        @click="emit('close')"
      ></div>
    </transition>

    <!-- Side Panel -->
    <transition
      enter-active-class="transform transition ease-in-out duration-500"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transform transition ease-in-out duration-500"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <div class="relative w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full border-l border-slate-100">
        
        <!-- Header -->
        <header class="p-6 border-b border-slate-50 shrink-0">
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm">
                <i class="fa-solid fa-sliders text-sm"></i>
              </div>
              <div>
                <h2 class="text-sm font-black text-slate-800 uppercase tracking-tight">Configuración Cadena</h2>
                <p class="text-[10px] text-slate-400 font-medium">Parámetros logísticos por tienda</p>
              </div>
            </div>
            <button 
              @click="emit('close')"
              class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-50 text-slate-300 hover:text-slate-500 transition-all"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <!-- Filters Row -->
          <div class="flex items-center gap-4">
            <!-- Search Bar -->
            <div class="relative group flex-1">
              <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] group-focus-within:text-indigo-500 transition-colors"></i>
              <input 
                v-model="search"
                type="text"
                placeholder="Buscar tienda, id o jefatura..."
                class="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 outline-none transition-all placeholder:text-slate-300"
              />
            </div>

            <!-- Day Tabs (Mirroring Dashboard) -->
            <div class="flex flex-col gap-1 shrink-0">
               <div class="flex gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100 shadow-inner">
                  <button v-for="d in dTags" :key="d.num"
                    @click="toggleDay(d.num)"
                    class="w-[32px] h-[30px] rounded-lg font-black text-[10px] transition-all flex items-center justify-center"
                    :class="selectedDay === d.num ? 'bg-indigo-600 text-white shadow-md scale-105' : 'bg-transparent text-slate-400 hover:bg-slate-200 hover:text-slate-600'"
                    :title="`Filtrar por día ${d.num}`"
                  >{{ d.label }}</button>
               </div>
            </div>
          </div>
        </header>

        <!-- Body / Card List -->
        <div class="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-100/60 min-h-0 custom-scrollbar">
          
          <div v-if="store.allConfigsLoading" class="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <i class="fa-solid fa-circle-notch fa-spin text-2xl text-indigo-400"></i>
            <span class="text-[10px] font-bold uppercase tracking-widest">Sincronizando...</span>
          </div>

          <template v-else>
            <div 
              v-for="cfg in filteredConfigs" 
              :key="cfg.id_cliente"
              class="group relative bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-300"
              :class="{ 'ring-2 ring-indigo-500 border-indigo-200': modifiedIds.has(cfg.id_cliente) }"
            >
              <!-- Card Header -->
              <div class="flex items-start justify-between mb-4">
                <div class="flex-1 min-w-0">
                  <div class="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-black shadow-sm mb-2 border border-indigo-100/50">
                    {{ cfg.nombre_tienda || 'Sin Nombre' }}
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-slate-400">{{ cfg.id_cliente }}</span>
                    <span class="w-1 h-1 rounded-full bg-slate-200"></span>
                    <span class="px-2 py-0.5 rounded-full bg-white text-[9px] font-bold text-slate-400 border border-slate-100 shadow-sm">
                      {{ cfg.Jefatura || cfg.jefatura || 'N/D' }}
                    </span>
                  </div>
                </div>
                
                <!-- Modified Indicator -->
                <button 
                  v-if="modifiedIds.has(cfg.id_cliente)"
                  @click="resetConfig(cfg.id_cliente)"
                  class="text-[9px] font-bold text-indigo-500 hover:text-indigo-700 underline underline-offset-2 transition-colors shrink-0"
                >
                  Restaurar
                </button>
              </div>

              <!-- Card Body (Inputs) -->
              <div class="space-y-4">
                
                <!-- Días Grid -->
                <div class="grid grid-cols-2 gap-3">
                  <div class="flex flex-col gap-1.5">
                    <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Emisión OC</label>
                    <select 
                      v-model="cfg.dia_cadena"
                      @change="onFieldChange(cfg.id_cliente)"
                      class="h-9 px-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-semibold text-slate-600 focus:bg-white focus:border-indigo-200 focus:ring-2 focus:ring-indigo-50 transition-all appearance-none cursor-pointer outline-none"
                    >
                      <option v-for="d in DAY_OPTIONS" :key="d.value" :value="d.value">{{ d.label }}</option>
                    </select>
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Reparto (Ventas)</label>
                    <select 
                      v-model="cfg.dia_ventas"
                      @change="onFieldChange(cfg.id_cliente)"
                      class="h-9 px-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-semibold text-slate-600 focus:bg-white focus:border-indigo-200 focus:ring-2 focus:ring-indigo-50 transition-all appearance-none cursor-pointer outline-none"
                    >
                      <option v-for="d in DAY_OPTIONS" :key="d.value" :value="d.value">{{ d.label }}</option>
                    </select>
                  </div>
                </div>

                <!-- Metrics Grid -->
                <div class="grid grid-cols-3 gap-2 pb-2">
                  <div class="flex flex-col gap-1.5">
                    <label class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter text-center">Lead Time</label>
                    <input 
                      v-model.number="cfg.lead_time"
                      type="number"
                      @input="onFieldChange(cfg.id_cliente)"
                      class="h-9 w-full text-center bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-700 focus:bg-white focus:border-indigo-200 outline-none transition-all"
                    />
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <label class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter text-center">Sem. Obj.</label>
                    <input 
                      v-model.number="cfg.semanas_objetivo"
                      type="number" step="0.5"
                      @input="onFieldChange(cfg.id_cliente)"
                      class="h-9 w-full text-center bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-indigo-600 focus:bg-white focus:border-indigo-200 outline-none transition-all"
                    />
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <label class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter text-center">Hist. S.O.</label>
                    <input 
                      v-model.number="cfg.semanas_sellout"
                      type="number"
                      @input="onFieldChange(cfg.id_cliente)"
                      class="h-9 w-full text-center bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-700 focus:bg-white focus:border-indigo-200 outline-none transition-all"
                    />
                  </div>
                </div>

                <!-- Factor (Footer of Card) -->
                <div class="pt-3 border-t border-slate-50 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-[9px] font-black uppercase tracking-widest text-slate-400">Factor Ajuste</span>
                    <div class="flex items-center gap-1.5">
                      <span class="text-xs font-mono font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-100 shadow-sm transition-all duration-300">
                        {{ calculateLiveFactor(cfg) }}
                      </span>
                      <span v-if="calculateLiveFactor(cfg) !== (cfg.factor_ajuste?.toFixed?.(4) || cfg.factor_ajuste)" 
                            class="text-[8px] font-bold text-amber-500 animate-pulse bg-amber-50 px-1 rounded border border-amber-100">
                        PREVIEW
                      </span>
                    </div>
                  </div>
                  <i v-if="modifiedIds.has(cfg.id_cliente)" class="fa-solid fa-circle-check text-indigo-500 text-xs animate-bounce"></i>
                </div>
              </div>

            </div>
          </template>

          <!-- Empty State -->
          <div v-if="!store.allConfigsLoading && !filteredConfigs.length" class="text-center py-20 px-10">
            <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
              <i class="fa-solid fa-magnifying-glass text-2xl"></i>
            </div>
            <p class="text-xs font-bold text-slate-400">No se encontraron resultados</p>
            <button @click="search = ''" class="mt-2 text-[10px] text-indigo-500 font-bold hover:underline">Limpiar búsqueda</button>
          </div>
        </div>

        <!-- Footer / Action Area -->
        <footer class="p-6 border-t border-slate-100 bg-white space-y-4 shrink-0 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.02)]">
          
          <div v-if="totalModified > 0" class="flex items-center gap-3 px-4 py-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 border-dashed">
            <i class="fa-solid fa-circle-exclamation text-indigo-500 text-sm"></i>
            <p class="text-[11px] text-indigo-700 font-bold leading-tight">
              Se modificarán <span class="text-indigo-900 border-b-2 border-indigo-200">{{ totalModified }}</span> registros de configuración.
            </p>
          </div>

          <div class="flex items-center gap-3">
             <button 
                @click="emit('close')"
                class="flex-1 h-12 rounded-2xl bg-slate-50 text-slate-500 text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95"
              >
                Cerrar
              </button>
              
              <button 
                @click="saveAllChanges"
                :disabled="totalModified === 0 || isSaving"
                class="flex-[1.5] h-12 rounded-2xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-200 disabled:opacity-30 disabled:shadow-none hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <i v-if="isSaving" class="fa-solid fa-circle-notch fa-spin"></i>
                <i v-else class="fa-solid fa-floppy-disk"></i>
                Guardar Cambios
              </button>
          </div>

          <div v-if="saveMessage" class="text-center">
            <p class="text-[10px] font-bold text-indigo-400 animate-pulse">{{ saveMessage }}</p>
          </div>
        </footer>

      </div>
    </transition>
  </div>
</template>

<style scoped>
/* Eliminar flechas de inputs number */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type=number] {
  -moz-appearance: textfield;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}

/* Transiciones de tarjetas */
.list-enter-active,
.list-leave-active {
  transition: all 0.4s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
