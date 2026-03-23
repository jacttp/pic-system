<script setup lang="ts">
// src/modules/CPFR/components/CpfrPendingStoresPanel.vue
// Componente dual:
//   embedded=true  → vista embebida en tab (sin drawer/overlay)
//   embedded=false → drawer lateral con overlay (clásico)
import { ref, computed, onMounted, watch } from 'vue'
import { useCpfrStore } from '../stores/cpfrStore'

const props = withDefaults(defineProps<{
  embedded?: boolean
}>(), {
  embedded: false,
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'start-batch', dia_cadena: number): void
}>()

const store = useCpfrStore()

const selectedDia = ref<number | ''>('')

const DIA_LABELS: Record<number, string> = {
  1: 'Lunes', 2: 'Martes', 3: 'Miércoles',
  4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 7: 'Domingo',
}

const storesByDay = computed(() => {
  const map = new Map<number, typeof store.pendingStores>()
  for (const s of store.pendingStores) {
    const arr = map.get(s.dia_cadena) ?? []
    arr.push(s)
    map.set(s.dia_cadena, arr)
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0])
})

const filteredByDay = computed(() => {
  if (selectedDia.value === '') return store.pendingStores
  return store.pendingStores.filter(s => s.dia_cadena === selectedDia.value)
})

onMounted(() => store.fetchPendingStores())

watch(selectedDia, (dia) => {
  if (dia === '') store.fetchPendingStores()
  else store.fetchPendingStores(Number(dia))
})

function triggerBatch() {
  if (selectedDia.value === '') return
  emit('start-batch', Number(selectedDia.value))
}
</script>

<template>
  <!-- ═══════════════════════════════════════════════════════════════════════
       EMBEDDED MODE — se renderiza como contenido normal dentro de una tab
  ═══════════════════════════════════════════════════════════════════════════ -->
  <template v-if="embedded">
    <div class="flex flex-col h-full min-h-0">

      <!-- Filter bar -->
      <div class="px-6 pt-5 pb-4 border-b border-slate-100 bg-white shrink-0">
        <div class="flex items-end gap-4 flex-wrap">

          <!-- Selector día -->
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Filtrar por día</label>
            <div class="flex gap-1.5 flex-wrap">
              <button
                class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                :class="selectedDia === '' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'"
                @click="selectedDia = ''"
              >Todos</button>
              <button
                v-for="[dia] in storesByDay"
                :key="dia"
                class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                :class="selectedDia === dia ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'"
                @click="selectedDia = dia"
              >
                {{ DIA_LABELS[dia] ?? `Día ${dia}` }}
              </button>
            </div>
          </div>

          <!-- Spacer -->
          <div class="flex-1"></div>

          <!-- Refresh -->
          <button
            class="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-500 transition-colors px-2 py-1.5"
            :disabled="store.pendingLoading"
            @click="store.fetchPendingStores(selectedDia !== '' ? Number(selectedDia) : undefined)"
          >
            <i class="fa-solid fa-rotate-right" :class="{ 'fa-spin': store.pendingLoading }"></i>
            Actualizar
          </button>

          <!-- Batch button -->
          <button
            class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors shadow-sm"
            :class="selectedDia === '' || !filteredByDay.length
              ? 'bg-slate-300 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700'"
            :disabled="selectedDia === '' || !filteredByDay.length"
            @click="triggerBatch"
          >
            <i class="fa-solid fa-bolt"></i>
            Generar Batch
            <span v-if="selectedDia !== ''" class="opacity-75">— {{ DIA_LABELS[Number(selectedDia)] }}</span>
          </button>

        </div>

        <!-- Context info -->
        <p v-if="store.activeFilters.ano && store.activeFilters.semana" class="text-[11px] text-slate-400 mt-3">
          <i class="fa-regular fa-calendar mr-1 text-indigo-300"></i>
          Semana <strong class="text-slate-600">{{ store.activeFilters.semana }}</strong> ·
          Año <strong class="text-slate-600">{{ store.activeFilters.ano }}</strong>
          <span v-if="filteredByDay.length > 0" class="ml-3">
            <span class="text-amber-500 font-semibold">{{ filteredByDay.length }}</span>
            tienda{{ filteredByDay.length !== 1 ? 's' : '' }} pendiente{{ filteredByDay.length !== 1 ? 's' : '' }}
          </span>
        </p>
        <p v-else class="text-[11px] text-amber-400 mt-3">
          <i class="fa-solid fa-triangle-exclamation mr-1"></i>
          Selecciona año y semana en la pestaña "Pedidos" para filtrar pendientes.
        </p>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto">

        <!-- Loading -->
        <div v-if="store.pendingLoading" class="flex flex-col items-center justify-center gap-3 text-slate-400 py-24">
          <i class="fa-solid fa-circle-notch fa-spin text-indigo-400 text-2xl"></i>
          <p class="text-sm">Cargando tiendas pendientes...</p>
        </div>

        <!-- Error -->
        <div v-else-if="store.pendingError" class="flex flex-col items-center justify-center gap-2 py-24 text-rose-400">
          <i class="fa-solid fa-circle-exclamation text-2xl"></i>
          <p class="text-sm text-center max-w-xs">{{ store.pendingError }}</p>
        </div>

        <!-- All clear -->
        <div v-else-if="!filteredByDay.length" class="flex flex-col items-center justify-center gap-4 py-24 text-slate-300">
          <div class="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
            <i class="fa-solid fa-circle-check text-emerald-400 text-3xl"></i>
          </div>
          <div class="text-center">
            <p class="text-base font-semibold text-slate-400 mb-1">¡Sin pendientes!</p>
            <p class="text-sm text-slate-300">Todas las tiendas tienen pedido generado esta semana.</p>
          </div>
        </div>

        <!-- Grid de días -->
        <div v-else class="p-6 space-y-8">
          <template v-for="[dia, tiendas] in storesByDay" :key="dia">
            <div v-if="selectedDia === '' || selectedDia === dia">

              <!-- Día header -->
              <div class="flex items-center gap-3 mb-4">
                <div class="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                  <span class="text-indigo-600 font-bold text-sm">{{ dia }}</span>
                </div>
                <div>
                  <p class="text-sm font-bold text-slate-700">{{ DIA_LABELS[dia] ?? `Día ${dia}` }}</p>
                  <p class="text-[11px] text-slate-400">{{ tiendas.length }} tienda{{ tiendas.length !== 1 ? 's' : '' }} por procesar</p>
                </div>
                <!-- Batch rápido por día -->
                <button
                  class="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors"
                  @click="selectedDia = dia; $nextTick(() => triggerBatch())"
                >
                  <i class="fa-solid fa-bolt text-[10px]"></i>
                  Batch {{ DIA_LABELS[dia] }}
                </button>
              </div>

              <!-- Cards grid -->
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                <div
                  v-for="tienda in tiendas"
                  :key="tienda.id_cliente"
                  class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group"
                >
                  <!-- Store name -->
                  <div class="flex items-start gap-2 mb-3">
                    <div class="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                      <i class="fa-solid fa-store text-amber-500 text-[11px]"></i>
                    </div>
                    <div class="min-w-0">
                      <p class="text-sm font-bold text-slate-800 leading-tight">{{ tienda.nombre_tienda }}</p>
                      <p class="text-[10px] text-slate-400 truncate leading-tight mt-0.5">{{ tienda.Jefatura }}</p>
                    </div>
                  </div>

                  <!-- Stats -->
                  <div class="grid grid-cols-2 gap-2 text-[11px]">
                    <div class="bg-slate-50 rounded-lg px-2.5 py-2">
                      <p class="text-[9px] uppercase tracking-wide text-slate-400 font-bold">SKUs OC</p>
                      <p class="font-bold text-slate-700 text-base leading-tight mt-0.5">{{ tienda.total_oc_lines }}</p>
                    </div>
                    <div class="bg-slate-50 rounded-lg px-2.5 py-2">
                      <p class="text-[9px] uppercase tracking-wide text-slate-400 font-bold">Sem. Obj.</p>
                      <p class="font-bold text-slate-700 text-base leading-tight mt-0.5">{{ tienda.semanas_objetivo }}</p>
                    </div>
                  </div>

                  <!-- Entrega -->
                  <div class="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <i class="fa-regular fa-calendar text-slate-300 text-[10px]"></i>
                    Próx. entrega:
                    <strong class="text-slate-700">{{ tienda.proxima_entrega ?? '—' }}</strong>
                  </div>
                </div>
              </div>

            </div>
          </template>
        </div>

      </div>
    </div>
  </template>

  <!-- ═══════════════════════════════════════════════════════════════════════
       DRAWER MODE — overlay lateral (comportamiento original)
  ═══════════════════════════════════════════════════════════════════════════ -->
  <template v-else>
    <div
      class="fixed inset-0 z-40 flex items-start justify-end bg-slate-900/30 backdrop-blur-sm"
      @click.self="emit('close')"
    >
      <!-- Drawer card -->
      <div class="h-full w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden">

        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-indigo-50/60 shrink-0">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-clock text-indigo-500"></i>
            <div>
              <p class="text-sm font-bold text-slate-800">Tiendas Pendientes</p>
              <p class="text-[10px] text-slate-400">OC cargadas sin pedido esta semana</p>
            </div>
          </div>
          <button class="text-slate-300 hover:text-slate-500 transition-colors" @click="emit('close')">
            <i class="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <!-- Toolbar -->
        <div class="px-4 py-3 bg-white border-b border-slate-100 flex items-center gap-3 shrink-0">
          <div class="flex flex-col gap-1 flex-1">
            <label class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Día</label>
            <select
              v-model="selectedDia"
              class="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">Todos los días</option>
              <option v-for="[dia] in storesByDay" :key="dia" :value="dia">
                {{ DIA_LABELS[dia] ?? `Día ${dia}` }}
              </option>
            </select>
          </div>
          <div class="shrink-0 pt-3.5">
            <span class="text-[11px] font-bold px-2.5 py-1 rounded-full"
              :class="filteredByDay.length ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'"
            >
              {{ filteredByDay.length }} tienda{{ filteredByDay.length !== 1 ? 's' : '' }}
            </span>
          </div>
        </div>

        <!-- States -->
        <div v-if="store.pendingLoading" class="flex-1 flex items-center justify-center gap-3 text-slate-400">
          <i class="fa-solid fa-circle-notch fa-spin text-indigo-400 text-xl"></i>
          <p class="text-sm">Cargando...</p>
        </div>
        <div v-else-if="!filteredByDay.length" class="flex-1 flex flex-col items-center justify-center gap-3 text-slate-300 p-12">
          <i class="fa-solid fa-circle-check text-3xl text-emerald-300"></i>
          <p class="text-sm font-medium text-slate-400">Sin tiendas pendientes</p>
        </div>

        <!-- Lista -->
        <div v-else class="flex-1 overflow-y-auto p-4 space-y-4">
          <template v-for="[dia, tiendas] in storesByDay" :key="dia">
            <div v-if="selectedDia === '' || selectedDia === dia">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-[10px] font-bold uppercase tracking-widest text-indigo-500">{{ DIA_LABELS[dia] }}</span>
                <span class="text-[10px] text-slate-300">· {{ tiendas.length }}</span>
                <div class="flex-1 h-px bg-slate-100"></div>
              </div>
              <div class="space-y-2">
                <div v-for="t in tiendas" :key="t.id_cliente" class="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <p class="text-sm font-semibold text-slate-800 truncate">{{ t.nombre_tienda }}</p>
                      <p class="text-[11px] text-slate-400 truncate mt-0.5">{{ t.Jefatura }}</p>
                    </div>
                    <span class="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{{ t.total_oc_lines }} SKUs</span>
                  </div>
                  <div class="mt-2.5 grid grid-cols-2 gap-2 text-[11px]">
                    <div class="flex items-center gap-1.5 text-slate-500">
                      <i class="fa-regular fa-calendar text-slate-300"></i>
                      <span>Entrega: <strong class="text-slate-700">{{ t.proxima_entrega ?? '—' }}</strong></span>
                    </div>
                    <div class="flex items-center gap-1.5 text-slate-500">
                      <i class="fa-solid fa-bullseye text-slate-300"></i>
                      <span>Obj: <strong class="text-slate-700">{{ t.semanas_objetivo }} sem.</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- Footer -->
        <div class="px-5 py-4 bg-slate-50 border-t border-slate-100 shrink-0">
          <p class="text-[10px] text-slate-400 mb-3">
            <i class="fa-solid fa-circle-info mr-1 text-indigo-300"></i>
            Selecciona un día para generar por lote. Responde HTTP 202.
          </p>
          <button
            class="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-colors flex items-center justify-center gap-2"
            :class="selectedDia === '' || !filteredByDay.length
              ? 'bg-slate-300 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm'"
            :disabled="selectedDia === '' || !filteredByDay.length"
            @click="triggerBatch"
          >
            <i class="fa-solid fa-bolt"></i>
            Generar Batch — {{ selectedDia !== '' ? (DIA_LABELS[Number(selectedDia)] ?? '') : 'Día' }}
          </button>
        </div>

      </div>
    </div>
  </template>
</template>
