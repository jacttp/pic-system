<!-- src/modules/PVR/components/PvrFilterBar.vue -->
<script setup lang="ts">
import { ref, watch } from 'vue';
import type { PvrFilterOptions, PvrActiveFilters, PvrCanal } from '../types/pvrTypes';

interface Props {
  filterOptions: PvrFilterOptions;
  modelValue: PvrActiveFilters;
  isLoading: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:modelValue', filters: PvrActiveFilters): void;
  (e: 'apply'): void;
  (e: 'reset'): void;
}>();

// Copia local para editar sin disparar requests inmediatamente
const local = ref<PvrActiveFilters>({ ...props.modelValue });

watch(
  () => props.modelValue,
  (v) => { local.value = { ...v }; },
  { deep: true },
);

// ── Helpers multi-select ─────────────────────
function toggleItem(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

function isSelected(list: string[], item: string): boolean {
  return list.includes(item);
}

// ── Toggle canal (single select, vacío = todos) ──
function setCanal(canal: PvrCanal | ''): void {
  local.value = { ...local.value, canal };
}

function apply(): void {
  emit('update:modelValue', { ...local.value });
  emit('apply');
}

function reset(): void {
  emit('reset');
}

const CANALES: Array<{ label: string; value: PvrCanal | '' }> = [
  { label: 'Todos', value: '' },
  { label: 'Moderno', value: 'Moderno' },
  { label: 'Tradicional', value: 'Tradicional' },
];
</script>

<template>
  <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
    <div class="flex flex-col lg:flex-row lg:items-end gap-4">

      <!-- ── Años ─────────────────────────────── -->
      <div class="flex-1 min-w-0">
        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          Año
        </label>
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

      <!-- ── Meses ──────────────────────────────── -->
      <div class="flex-1 min-w-0">
        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          Mes
        </label>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="mes in filterOptions.meses"
            :key="mes"
            type="button"
            @click="local.meses = toggleItem(local.meses, mes)"
            class="w-8 h-7 rounded text-xs font-medium border transition-colors"
            :class="isSelected(local.meses, mes)
              ? 'bg-brand-600 text-white border-brand-600'
              : 'bg-white text-slate-500 border-slate-200 hover:border-brand-300'"
          >
            {{ mes }}
          </button>
        </div>
      </div>

      <!-- ── Canal toggle ────────────────────── -->
      <div class="shrink-0">
        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          Canal
        </label>
        <div class="flex rounded-lg border border-slate-200 overflow-hidden">
          <button
            v-for="c in CANALES"
            :key="c.value"
            type="button"
            @click="setCanal(c.value)"
            class="px-3 py-1.5 text-xs font-medium transition-colors"
            :class="local.canal === c.value
              ? 'bg-brand-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-50'"
          >
            {{ c.label }}
          </button>
        </div>
      </div>

      <!-- ── Gerencia ────────────────────────── -->
      <div class="flex-1 min-w-0" v-if="filterOptions.gerencias.length > 0">
        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          Gerencia
        </label>
        <div class="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto custom-scrollbar">
          <button
            v-for="g in filterOptions.gerencias"
            :key="g"
            type="button"
            @click="local.gerencias = toggleItem(local.gerencias, g)"
            class="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors truncate max-w-[140px]"
            :class="isSelected(local.gerencias, g)
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-300'"
            :title="g"
          >
            {{ g }}
          </button>
        </div>
      </div>

      <!-- ── Cadena ─────────────────────────── -->
      <div class="flex-1 min-w-0" v-if="filterOptions.cadenas.length > 0">
        <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          Cadena
        </label>
        <div class="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto custom-scrollbar">
          <button
            v-for="c in filterOptions.cadenas"
            :key="c"
            type="button"
            @click="local.cadenas = toggleItem(local.cadenas, c)"
            class="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors truncate max-w-[140px]"
            :class="isSelected(local.cadenas, c)
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white text-slate-600 border-slate-300 hover:border-emerald-300'"
            :title="c"
          >
            {{ c }}
          </button>
        </div>
      </div>

      <!-- ── Acciones ───────────────────────── -->
      <div class="flex gap-2 shrink-0">
        <button
          type="button"
          @click="reset"
          :disabled="isLoading"
          class="px-3 py-2 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <i class="fa-solid fa-rotate-left mr-1"></i> Reset
        </button>
        <button
          type="button"
          @click="apply"
          :disabled="isLoading"
          class="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          <i v-if="isLoading" class="fa-solid fa-circle-notch fa-spin"></i>
          <i v-else class="fa-solid fa-magnifying-glass"></i>
          Aplicar
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
</style>