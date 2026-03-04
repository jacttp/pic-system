<!-- src/modules/PVR/components/PvrFilterBar.vue -->
<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { PvrFilterOptions, PvrActiveFilters } from '../types/pvrTypes';
import PvrCadenaModal from './modals/PvrCadenaModal.vue';

interface Props {
  filterOptions: PvrFilterOptions;
  modelValue: PvrActiveFilters;
  isLoading: boolean;
}

const props  = defineProps<Props>();
const emit   = defineEmits<{
  (e: 'update:modelValue', filters: PvrActiveFilters): void;
  (e: 'apply'): void;
  (e: 'reset'): void;
}>();

// ── Estado del panel ────────────────────────────
const isCollapsed    = ref(true);
const overflowVisible = ref(false);

watch(isCollapsed, (collapsed) => {
  if (collapsed) {
    overflowVisible.value = false;
  } else {
    setTimeout(() => { overflowVisible.value = true; }, 320);
  }
});

// ── Copia local editada sin disparar requests ───
const local = ref<PvrActiveFilters>({ ...props.modelValue });

watch(() => props.modelValue, (v) => { local.value = { ...v }; }, { deep: true });

// ── Helpers ─────────────────────────────────────
function toggleItem(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}
function isSelected(list: string[], item: string): boolean {
  return list.includes(item);
}

const MES_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const CANALES = [
  { label: 'Todos',       value: '' },
  { label: 'Moderno',     value: 'Moderno' },
  { label: 'Tradicional', value: 'Tradicional' },
];

const showCadenaModal = ref(false);

const buttonTextCadena = computed(() => {
  const count = local.value.cadenas.length;
  if (count === 0) return 'Seleccionar Cadena...';
  if (count === 1) return local.value.cadenas[0];
  return `${count} cadenas`;
});

function apply(): void {
  emit('update:modelValue', { ...local.value });
  emit('apply');
  isCollapsed.value = true;
}

function reset(): void {
  emit('reset');
  isCollapsed.value = true;
}

// Chips de filtros activos para mostrar en la barra colapsada
function activeChips(): string[] {
  const chips: string[] = [];
  if (local.value.años.length)      chips.push(...local.value.años);
  if (local.value.canal)            chips.push(local.value.canal);
  if (local.value.gerencias.length) chips.push(`${local.value.gerencias.length} gerencia${local.value.gerencias.length > 1 ? 's' : ''}`);
  if (local.value.cadenas.length)   chips.push(`${local.value.cadenas.length} cadena${local.value.cadenas.length > 1 ? 's' : ''}`);
  if (local.value.meses.length)     chips.push(`${local.value.meses.length} mes${local.value.meses.length > 1 ? 'es' : ''}`);
  return chips;
}
</script>

<template>
  <!-- Wrapper relativo para el botón flotante -->
  <div class="relative z-40">

    <!-- ── Panel de filtros ──────────────────────── -->
    <div
      class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all duration-300 ease-in-out"
      :class="[
        isCollapsed ? 'max-h-0 opacity-0 border-transparent shadow-none -mb-2' : 'max-h-[600px] opacity-100',
        overflowVisible && !isCollapsed ? 'overflow-visible' : 'overflow-hidden',
      ]"
    >
      <div class="p-5">
        <!-- Header del panel -->
        <div class="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
          <h2 class="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
            <div class="p-1.5 bg-brand-50 rounded text-brand-600">
              <i class="fa-solid fa-sliders text-xs"></i>
            </div>
            Parámetros del Informe PVR
          </h2>
          <div class="flex gap-2">
            <button
              type="button"
              @click="reset"
              :disabled="isLoading"
              class="text-xs font-medium text-slate-500 hover:text-brand-600 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200 disabled:opacity-50"
            >
              <i class="fa-solid fa-rotate-left"></i> Limpiar
            </button>
            <button
              type="button"
              @click="apply"
              :disabled="isLoading"
              class="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-5 py-2 rounded-lg shadow-md shadow-brand-500/20 transition-all flex items-center gap-2 disabled:opacity-70 hover:-translate-y-0.5"
            >
              <i v-if="isLoading" class="fa-solid fa-circle-notch fa-spin"></i>
              <i v-else class="fa-solid fa-bolt"></i>
              APLICAR
            </button>
          </div>
        </div>

        <!-- Grid de filtros: 3 columnas -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">

          <!-- ── Columna 1: Periodo ──────────────── -->
          <div class="space-y-5">
            <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
              <i class="fa-regular fa-calendar mr-1"></i> Periodo
            </h3>

            <!-- Año -->
            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Año</label>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="año in filterOptions.años"
                  :key="año"
                  type="button"
                  @click="local.años = toggleItem(local.años, año)"
                  class="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
                  :class="isSelected(local.años, año)
                    ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-brand-400 hover:text-brand-600'"
                >
                  {{ año }}
                </button>
              </div>
            </div>

            <!-- Meses -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Meses</label>
                <button
                  v-if="local.meses.length > 0"
                  type="button"
                  @click="local.meses = []"
                  class="text-[10px] text-slate-400 hover:text-brand-500 transition-colors"
                >
                  limpiar
                </button>
              </div>
              <div class="grid grid-cols-6 gap-1">
                <button
                  v-for="(label, idx) in MES_LABELS"
                  :key="idx"
                  type="button"
                  @click="local.meses = toggleItem(local.meses, String(idx + 1))"
                  class="h-7 rounded text-[10px] font-semibold border transition-colors"
                  :class="isSelected(local.meses, String(idx + 1))
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-brand-300 hover:text-brand-600'"
                  :title="`Mes ${idx + 1}`"
                >
                  {{ label }}
                </button>
              </div>
              <p class="text-[10px] text-slate-400 mt-1.5">
                <i class="fa-solid fa-circle-info mr-1"></i>
                Vacío = todos los meses
              </p>
            </div>
          </div>

          <!-- ── Columna 2: Comercial ────────────── -->
          <div class="space-y-5">
            <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
              <i class="fa-solid fa-briefcase mr-1"></i> Comercial
            </h3>

            <!-- Gerencia -->
            <div v-if="filterOptions.gerencias.length > 0">
              <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Gerencia</label>
              <div class="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1 custom-scrollbar">
                <button
                  v-for="g in filterOptions.gerencias"
                  :key="g"
                  type="button"
                  @click="local.gerencias = toggleItem(local.gerencias, g)"
                  class="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors truncate max-w-[160px]"
                  :class="isSelected(local.gerencias, g)
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-300 hover:text-indigo-600'"
                  :title="g"
                >
                  {{ g }}
                </button>
              </div>
            </div>
            <div v-else class="text-xs text-slate-400 italic">
              Cargando gerencias...
            </div>

            <!-- Cadena -->
            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Cadena</label>
              
              <button 
                type="button"
                @click="showCadenaModal = true"
                class="w-full text-left bg-white border border-slate-200 rounded-lg px-3 h-[38px] flex justify-between items-center text-xs hover:border-teal-400 hover:shadow-sm group transition-all"
                :class="{'border-teal-500 ring-1 ring-teal-100': local.cadenas.length > 0}"
                :disabled="filterOptions.cadenas.length === 0"
              >
                  <span 
                      class="font-medium truncate mr-2" 
                      :class="local.cadenas.length > 0 ? 'text-teal-700' : 'text-slate-600 group-hover:text-teal-700'"
                  >
                      <i class="fa-solid fa-magnifying-glass mr-1.5 opacity-50"></i>
                      {{ buttonTextCadena }}
                  </span>
                  <i 
                      class="fa-solid text-[10px]"
                      :class="local.cadenas.length > 0 ? 'fa-check text-teal-600' : 'fa-arrow-up-right-from-square text-slate-300 group-hover:text-teal-500'"
                  ></i>
              </button>
              
              <p class="text-[10px] text-slate-400 mt-2">
                <i class="fa-solid fa-circle-info mr-1"></i>
                Vacío = todas las cadenas
              </p>
            </div>
          </div>

          <!-- ── Columna 3: Canal ───────────────── -->
          <div class="space-y-5">
            <h3 class="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
              <i class="fa-solid fa-network-wired mr-1"></i> Canal
            </h3>

            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Filtrar por canal</label>
              <div class="flex flex-col gap-2">
                <button
                  v-for="c in CANALES"
                  :key="c.value"
                  type="button"
                  @click="local.canal = c.value"
                  class="flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all text-left"
                  :class="local.canal === c.value
                    ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:bg-brand-50'"
                >
                  <span
                    class="w-2 h-2 rounded-full shrink-0"
                    :class="local.canal === c.value ? 'bg-white' : (
                      c.value === 'Moderno' ? 'bg-blue-400' :
                      c.value === 'Tradicional' ? 'bg-emerald-400' : 'bg-slate-300'
                    )"
                  ></span>
                  {{ c.label }}
                </button>
              </div>
              <p class="text-[10px] text-slate-400 mt-3 leading-relaxed">
                <i class="fa-solid fa-circle-info mr-1"></i>
                La tabla siempre muestra Moderno, Tradicional y Total. Este filtro limita los datos consultados.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- ── Botón flotante (toggle) ──────────────── -->
    <div class="flex justify-center" :class="isCollapsed ? '' : 'mt-0'">
      <button
        type="button"
        @click="isCollapsed = !isCollapsed"
        class="flex items-center gap-2 px-5 py-1.5 rounded-b-xl shadow-md border-x border-b transition-all duration-300 group text-xs font-bold tracking-wide uppercase"
        :class="isCollapsed
          ? 'bg-brand-600 border-brand-700 text-white hover:bg-brand-700 hover:pt-2.5'
          : 'bg-white border-slate-200 text-slate-400 hover:text-brand-600 hover:bg-slate-50'"
      >
        <i
          class="fa-solid transition-transform duration-300"
          :class="isCollapsed ? 'fa-filter' : 'fa-chevron-up group-hover:-translate-y-0.5'"
        ></i>
        <span v-if="isCollapsed">Filtros</span>
        <!-- Chips de filtros activos (solo cuando colapsado) -->
        <template v-if="isCollapsed">
          <span
            v-for="chip in activeChips()"
            :key="chip"
            class="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-semibold"
          >
            {{ chip }}
          </span>
        </template>
      </button>
    </div>

    <!-- Modal de Cadena -->
    <PvrCadenaModal 
      v-model="showCadenaModal" 
      :cadenas-options="filterOptions.cadenas" 
      v-model:selected-cadenas="local.cadenas"
    />
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar       { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
</style>