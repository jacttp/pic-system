<script setup lang="ts">
// src/modules/CPFR/components/CpfrChainConfigModal.vue
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { useCpfrStore } from '../stores/cpfrStore'
import type { CpfrStoreConfig, CpfrSkuUnit } from '../types/cpfrTypes'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const store = useCpfrStore()

// ── Tab System ───────────────────────────────────────────────────────────────
// 'stores' = configuración de tiendas (pestaña original)
// 'skus'   = configuración de unidades SKU (nueva pestaña)
const activeTab = ref<'stores' | 'skus'>('stores')

// ── Pestaña 1: Configuración de Tiendas ──────────────────────────────────────

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

const localConfigs = reactive<Record<string, CpfrStoreConfig>>({})
const modifiedIds = ref<Set<string>>(new Set())

onMounted(async () => {
  await store.fetchAllConfigs()
  store.allConfigs.forEach(c => {
    localConfigs[c.id_cliente] = { ...c }
  })
  // Cargar SKUs en paralelo (lazy: solo cuando se necesita)
})

watch(() => store.allConfigs, (newVal) => {
  newVal.forEach(c => {
    if (!modifiedIds.value.has(c.id_cliente)) {
      localConfigs[c.id_cliente] = { ...c }
    }
  })
}, { deep: true })

const filteredConfigs = computed(() => {
  let configs = Object.values(localConfigs)
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
  if (!confirm(`Se modificarán ${modifiedIds.value.size} registros. ¿Deseas continuar?`)) return
  isSaving.value = true
  saveMessage.value = 'Guardando cambios...'
  try {
    const promises = Array.from(modifiedIds.value).map(id => {
      const { id_cliente, nombre_tienda, factor_ajuste, ...payload } = localConfigs[id]
      return store.saveConfig(id, payload as any)
    })
    await Promise.all(promises)
    await store.fetchAllConfigs()
    await store.loadDashboard()
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

function calculateLiveFactor(cfg: CpfrStoreConfig) {
  const dc = cfg.dia_cadena || 1
  const dv = cfg.dia_ventas || dc
  const lt = cfg.lead_time || 0
  const diff = (((dv - dc) % 7 + 7) % 7)
  const factor = (diff + lt) / 7
  return factor.toFixed(4)
}

// ── Pestaña 2: Configuración de Unidades SKU ─────────────────────────────────

const skuSearch = ref('')
const localSkus = reactive<Record<string, CpfrSkuUnit>>({})
const modifiedSkus = ref<Set<string>>(new Set())
const skusLoaded = ref(false)

// Carga lazy de SKUs al activar la pestaña
watch(activeTab, async (tab) => {
  if (tab === 'skus' && !skusLoaded.value) {
    await store.fetchAllSkusConfig()
    store.allSkusConfig.forEach(s => {
      localSkus[s.sku_muliix] = { ...s }
    })
    skusLoaded.value = true
  }
})

// Sincronizar si el store se refresca externamente
watch(() => store.allSkusConfig, (newVal) => {
  newVal.forEach(s => {
    if (!modifiedSkus.value.has(s.sku_muliix)) {
      localSkus[s.sku_muliix] = { ...s }
    }
  })
}, { deep: true })

const filteredSkus = computed(() => {
  let list = Object.values(localSkus)
  if (!skuSearch.value) return list
  const q = skuSearch.value.toLowerCase()
  return list.filter(s =>
    s.sku_muliix.toLowerCase().includes(q) ||
    s.sku_nombre.toLowerCase().includes(q)
  )
})

const totalModifiedSkus = computed(() => modifiedSkus.value.size)

function onSkuFieldChange(sku: string) {
  modifiedSkus.value.add(sku)
}

function resetSku(sku: string) {
  const original = store.allSkusConfig.find(s => s.sku_muliix === sku)
  if (original) {
    localSkus[sku] = { ...original }
    modifiedSkus.value.delete(sku)
  }
}

const isSavingSkus = ref(false)
const saveSkuMessage = ref('')

async function saveAllSkuChanges() {
  if (modifiedSkus.value.size === 0) return
  if (!confirm(`Se modificarán ${modifiedSkus.value.size} SKU(s). ¿Deseas continuar?`)) return

  isSavingSkus.value = true
  saveSkuMessage.value = 'Guardando cambios...'
  try {
    const promises = Array.from(modifiedSkus.value).map(sku => {
      const { sku_muliix, sku_nombre, ...payload } = localSkus[sku]
      return store.saveSkuConfig(sku, payload)
    })
    await Promise.all(promises)

    // Refrescar SKUs y forzar recálculo matemático completo (igual que "Recalcular Matemática")
    // para que unidad_inventario y pzas_bolsa nuevos impacten pedido_sugerido
    await store.fetchAllSkusConfig()
    await store.recalculate()

    modifiedSkus.value.clear()
    saveSkuMessage.value = '¡Unidades actualizadas! Recálculo completo aplicado.'
    setTimeout(() => { saveSkuMessage.value = '' }, 3500)
  } catch (e) {
    console.error('Error saving sku configs:', e)
    saveSkuMessage.value = 'Error al guardar algunos cambios.'
  } finally {
    isSavingSkus.value = false
  }
}

// ── Computed para el footer (saber cuántos cambios hay en la pestaña activa) ──
const activeModifiedCount = computed(() =>
  activeTab.value === 'stores' ? totalModified.value : totalModifiedSkus.value
)
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
      <div class="relative w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full border-l border-sky-100">

        <!-- Header -->
        <header class="p-6 border-b border-sky-100 bg-sky-50 shrink-0">
          <div class="flex items-center justify-between mb-5">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center text-sky-600 shadow-sm">
                <i class="fa-solid fa-sliders text-sm"></i>
              </div>
              <div>
                <h2 class="text-sm font-black text-slate-800 uppercase tracking-tight">Configuración Cadena</h2>
                <p class="text-[10px] text-sky-600 font-medium">Parámetros logísticos por tienda</p>
              </div>
            </div>
            <button
              @click="emit('close')"
              class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sky-100 text-slate-400 hover:text-sky-700 transition-all"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <!-- Tab Switcher -->
          <div class="flex gap-1 bg-white p-1 rounded-2xl border border-sky-200 mb-5 shadow-sm">
            <button
              @click="activeTab = 'stores'"
              class="flex-1 h-9 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              :class="activeTab === 'stores'
                ? 'bg-sky-100 text-sky-700 shadow-sm border border-sky-200'
                : 'text-slate-400 hover:text-sky-600'"
            >
              <i class="fa-solid fa-store text-[10px]"></i>
              Config. Tiendas
            </button>
            <button
              @click="activeTab = 'skus'"
              class="flex-1 h-9 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              :class="activeTab === 'skus'
                ? 'bg-sky-100 text-sky-700 shadow-sm border border-sky-200'
                : 'text-slate-400 hover:text-sky-600'"
            >
              <i class="fa-solid fa-boxes-stacked text-[10px]"></i>
              Config. Unidades SKU
            </button>
          </div>

          <!-- ── TAB 1: Filtros de tiendas ── -->
          <div v-if="activeTab === 'stores'" class="flex items-center gap-4">
            <div class="relative group flex-1">
              <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] group-focus-within:text-sky-600 transition-colors"></i>
              <input
                v-model="search"
                type="text"
                placeholder="Buscar tienda, id o jefatura..."
                class="w-full h-11 pl-10 pr-4 bg-white border border-sky-200 rounded-2xl text-xs font-medium focus:bg-white focus:ring-4 focus:ring-sky-100 focus:border-sky-400 outline-none transition-all placeholder:text-slate-300"
              />
            </div>
            <div class="flex flex-col gap-1 shrink-0">
               <div class="flex gap-1 bg-white p-1 rounded-xl border border-sky-200 shadow-inner">
                  <button v-for="d in dTags" :key="d.num"
                    @click="toggleDay(d.num)"
                    class="w-[32px] h-[30px] rounded-lg font-black text-[10px] transition-all flex items-center justify-center"
                    :class="selectedDay === d.num ? 'bg-sky-100 text-sky-700 shadow-md scale-105 border border-sky-200' : 'bg-transparent text-slate-400 hover:bg-sky-50 hover:text-sky-600'"
                    :title="`Filtrar por día ${d.num}`"
                  >{{ d.label }}</button>
               </div>
            </div>
          </div>

          <!-- ── TAB 2: Filtros de SKUs ── -->
          <div v-else class="relative group">
            <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] group-focus-within:text-sky-600 transition-colors"></i>
            <input
              v-model="skuSearch"
              type="text"
              placeholder="Buscar por SKU o nombre de producto..."
              class="w-full h-11 pl-10 pr-4 bg-white border border-sky-200 rounded-2xl text-xs font-medium focus:bg-white focus:ring-4 focus:ring-sky-100 focus:border-sky-400 outline-none transition-all placeholder:text-slate-300"
            />
          </div>
        </header>

        <!-- ═══════════════ BODY ═══════════════ -->
        <div class="flex-1 overflow-y-auto p-5 space-y-4 bg-sky-50/40 min-h-0 custom-scrollbar">

          <!-- ── TAB 1: Lista de tiendas ─────────────────────────────────── -->
          <template v-if="activeTab === 'stores'">
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

            <!-- Empty State — Tiendas -->
            <div v-if="!store.allConfigsLoading && !filteredConfigs.length" class="text-center py-20 px-10">
              <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
                <i class="fa-solid fa-magnifying-glass text-2xl"></i>
              </div>
              <p class="text-xs font-bold text-slate-400">No se encontraron resultados</p>
              <button @click="search = ''" class="mt-2 text-[10px] text-indigo-500 font-bold hover:underline">Limpiar búsqueda</button>
            </div>
          </template>

          <!-- ── TAB 2: Lista de SKUs ────────────────────────────────────── -->
          <template v-else>
            <!-- Loading -->
            <div v-if="store.skusConfigLoading" class="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <i class="fa-solid fa-circle-notch fa-spin text-2xl text-indigo-400"></i>
              <span class="text-[10px] font-bold uppercase tracking-widest">Cargando SKUs...</span>
            </div>

            <template v-else>
              <div
                v-for="sku in filteredSkus"
                :key="sku.sku_muliix"
                class="group relative bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-300"
                :class="{ 'ring-2 ring-indigo-500 border-indigo-200': modifiedSkus.has(sku.sku_muliix) }"
              >
                <!-- Card Header -->
                <div class="flex items-start justify-between mb-4">
                  <div class="flex-1 min-w-0">
                    <div class="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-black shadow-sm mb-1.5 border border-indigo-100/50 max-w-full truncate">
                      {{ sku.sku_nombre }}
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                        {{ sku.sku_muliix }}
                      </span>
                    </div>
                  </div>
                  <button
                    v-if="modifiedSkus.has(sku.sku_muliix)"
                    @click="resetSku(sku.sku_muliix)"
                    class="text-[9px] font-bold text-indigo-500 hover:text-indigo-700 underline underline-offset-2 transition-colors shrink-0 ml-2"
                  >
                    Restaurar
                  </button>
                </div>

                <!-- Card Body: Unidades de Conversión -->
                <div class="space-y-3">
                  <!-- Fila 1: Unidades principales -->
                  <div class="grid grid-cols-2 gap-3">
                    <div class="flex flex-col gap-1.5">
                      <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Unid. Inventario</label>
                      <input
                        v-model.number="sku.unidad_inventario"
                        type="number" step="0.01"
                        @input="onSkuFieldChange(sku.sku_muliix)"
                        class="h-9 w-full text-center bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-indigo-600 focus:bg-white focus:border-indigo-200 outline-none transition-all"
                      />
                    </div>
                    <div class="flex flex-col gap-1.5">
                      <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Pzas / Bolsa</label>
                      <input
                        v-model.number="sku.pzas_bolsa"
                        type="number"
                        @input="onSkuFieldChange(sku.sku_muliix)"
                        class="h-9 w-full text-center bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-violet-600 focus:bg-white focus:border-indigo-200 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <!-- Fila 2: Métricas de caja -->
                  <div class="grid grid-cols-3 gap-2">
                    <div class="flex flex-col gap-1.5">
                      <label class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter text-center">Pzas/Caja</label>
                      <input
                        v-model.number="sku.pzas_caja"
                        type="number"
                        @input="onSkuFieldChange(sku.sku_muliix)"
                        class="h-9 w-full text-center bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-700 focus:bg-white focus:border-indigo-200 outline-none transition-all"
                      />
                    </div>
                    <div class="flex flex-col gap-1.5">
                      <label class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter text-center">Kg/Caja</label>
                      <input
                        v-model.number="sku.kg_caja"
                        type="number" step="0.01"
                        @input="onSkuFieldChange(sku.sku_muliix)"
                        class="h-9 w-full text-center bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-700 focus:bg-white focus:border-indigo-200 outline-none transition-all"
                      />
                    </div>
                    <div class="flex flex-col gap-1.5">
                      <label class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter text-center">U. VENTAU</label>
                      <input
                        v-model.number="sku.unidad_ventau"
                        type="number" step="0.01"
                        @input="onSkuFieldChange(sku.sku_muliix)"
                        class="h-9 w-full text-center bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-700 focus:bg-white focus:border-indigo-200 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <!-- Fila 3: Pallet -->
                  <div class="grid grid-cols-2 gap-3 pb-1">
                    <div class="flex flex-col gap-1.5">
                      <label class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter text-center">Cajas/Pallet</label>
                      <input
                        v-model.number="sku.cajas_pallet"
                        type="number"
                        @input="onSkuFieldChange(sku.sku_muliix)"
                        class="h-9 w-full text-center bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-700 focus:bg-white focus:border-indigo-200 outline-none transition-all"
                      />
                    </div>
                    <div class="flex flex-col gap-1.5">
                      <label class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter text-center">Pzas/Pallet</label>
                      <input
                        v-model.number="sku.pzas_pallet"
                        type="number"
                        @input="onSkuFieldChange(sku.sku_muliix)"
                        class="h-9 w-full text-center bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-700 focus:bg-white focus:border-indigo-200 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <!-- Footer indicador -->
                  <div v-if="modifiedSkus.has(sku.sku_muliix)" class="pt-2 border-t border-slate-50 flex items-center justify-end gap-2">
                    <span class="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">Modificado</span>
                    <i class="fa-solid fa-circle-check text-indigo-500 text-xs animate-bounce"></i>
                  </div>
                </div>
              </div>
            </template>

            <!-- Empty State — SKUs -->
            <div v-if="!store.skusConfigLoading && !filteredSkus.length" class="text-center py-20 px-10">
              <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
                <i class="fa-solid fa-boxes-stacked text-2xl"></i>
              </div>
              <p class="text-xs font-bold text-slate-400">No se encontraron productos</p>
              <button @click="skuSearch = ''" class="mt-2 text-[10px] text-indigo-500 font-bold hover:underline">Limpiar búsqueda</button>
            </div>
          </template>

        </div>

        <!-- Footer / Action Area -->
        <footer class="p-6 border-t border-sky-100 bg-sky-50 space-y-4 shrink-0 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.04)]">

          <!-- Indicador de cambios pendientes (estado activo) -->
          <div v-if="activeModifiedCount > 0" class="flex items-center gap-3 px-4 py-3 bg-sky-100/60 rounded-2xl border border-sky-200 border-dashed">
            <i class="fa-solid fa-circle-exclamation text-sky-600 text-sm"></i>
            <p class="text-[11px] text-sky-800 font-bold leading-tight">
              Se modificarán
              <span class="text-sky-900 border-b-2 border-sky-400">{{ activeModifiedCount }}</span>
              {{ activeTab === 'stores' ? 'registros de configuración' : 'SKU(s)' }}.
            </p>
          </div>

          <div class="flex items-center gap-3">
            <button
              @click="emit('close')"
              class="flex-1 h-12 rounded-2xl bg-white border border-sky-200 text-slate-600 text-xs font-black uppercase tracking-widest hover:bg-sky-100 hover:text-sky-700 hover:border-sky-300 transition-all active:scale-95"
            >
              Cerrar
            </button>

            <!-- Botón para la pestaña activa -->
            <button
              v-if="activeTab === 'stores'"
              @click="saveAllChanges"
              :disabled="totalModified === 0 || isSaving"
              class="flex-[1.5] h-12 rounded-2xl bg-sky-500 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-sky-200 disabled:opacity-30 disabled:shadow-none hover:bg-sky-600 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <i v-if="isSaving" class="fa-solid fa-circle-notch fa-spin"></i>
              <i v-else class="fa-solid fa-floppy-disk"></i>
              Guardar Cambios
            </button>

            <button
              v-else
              @click="saveAllSkuChanges"
              :disabled="totalModifiedSkus === 0 || isSavingSkus"
              class="flex-[1.5] h-12 rounded-2xl bg-sky-500 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-sky-200 disabled:opacity-30 disabled:shadow-none hover:bg-sky-600 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <i v-if="isSavingSkus" class="fa-solid fa-circle-notch fa-spin"></i>
              <i v-else class="fa-solid fa-floppy-disk"></i>
              Guardar Unidades
            </button>
          </div>

          <!-- Mensaje de estado -->
          <div v-if="saveMessage || saveSkuMessage" class="text-center">
            <p class="text-[10px] font-bold text-sky-600 animate-pulse">
              {{ activeTab === 'stores' ? saveMessage : saveSkuMessage }}
            </p>
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
