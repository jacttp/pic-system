<script setup lang="ts">
import { computed } from 'vue';
import type { SimilarConceptsResult } from '../types/articleClassificationTypes';

interface Props {
  result: SimilarConceptsResult | null;
  dimensions: number;
  loading?: boolean;
  error?: string | null;
}

const props = withDefaults(defineProps<Props>(), { loading: false, error: null });
const emit = defineEmits<{
  (event: 'dimensions', value: number): void;
  (event: 'retry'): void;
}>();

const dimensionOptions = computed(() => {
  const available = props.result?.availableDimensions.map(item => item.dimensions) || [];
  return [...new Set([256, 512, 1536, ...available])].sort((a, b) => a - b);
});

const percentage = (value: number) => `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`;
const valueText = (value: string | number | null) => value === null ? '—' : String(value);

const handleDimension = (event: Event) => {
  emit('dimensions', Number((event.target as HTMLSelectElement).value));
};
</script>

<template>
  <aside class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <header class="relative overflow-hidden border-b border-slate-200 bg-slate-950 px-4 py-4 text-white">
      <div class="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full border border-white/10 bg-white/5"></div>
      <div class="relative flex items-start justify-between gap-3">
        <div>
          <p class="text-[9px] font-black uppercase tracking-[0.22em] text-pic-info">Retrieval híbrido</p>
          <h2 class="mt-1 text-sm font-black">Antecedentes similares</h2>
          <p class="mt-1 text-[10px] font-semibold text-slate-400">Vector 80% · texto 20%</p>
        </div>
        <span class="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-pic-info">
          <i class="fa-solid fa-diagram-project"></i>
        </span>
      </div>
      <label class="relative mt-3 block">
        <span class="sr-only">Dimensiones del embedding</span>
        <select
          :value="dimensions"
          class="h-8 w-full rounded-lg border border-white/10 bg-white/10 px-2.5 text-[10px] font-black uppercase tracking-wide text-white outline-none focus:border-pic-brand"
          :disabled="loading"
          @change="handleDimension"
        >
          <option v-for="option in dimensionOptions" :key="option" :value="option" class="text-slate-900">
            {{ option }} dimensiones
          </option>
        </select>
      </label>
    </header>

    <div v-if="loading" class="space-y-3 p-4">
      <div v-for="item in 3" :key="item" class="animate-pulse rounded-lg border border-slate-100 p-3">
        <div class="h-2 w-20 rounded bg-slate-100"></div>
        <div class="mt-3 h-3 w-full rounded bg-slate-100"></div>
        <div class="mt-2 h-3 w-3/4 rounded bg-slate-100"></div>
      </div>
    </div>

    <div v-else-if="error" class="p-4 text-center">
      <i class="fa-solid fa-plug-circle-xmark text-xl text-pic-warning"></i>
      <p class="mt-2 text-xs font-black text-slate-800">Retrieval no disponible</p>
      <p class="mt-1 text-[10px] font-semibold leading-4 text-slate-500">{{ error }}</p>
      <button type="button" class="mt-3 text-[10px] font-black uppercase tracking-wide text-pic-brand hover:underline" @click="emit('retry')">
        Intentar otra vez
      </button>
    </div>

    <div v-else-if="result?.status === 'NOT_EMBEDDED'" class="p-5 text-center">
      <span class="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400">
        <i class="fa-solid fa-wave-square"></i>
      </span>
      <p class="mt-3 text-xs font-black text-slate-800">Concepto sin vector</p>
      <p class="mt-1 text-[10px] font-semibold leading-4 text-slate-500">Ejecuta el backfill de esta dimensión para habilitar sus vecinos.</p>
    </div>

    <div v-else-if="result?.neighbors.length" class="divide-y divide-slate-100">
      <details v-for="neighbor in result.neighbors" :key="neighbor.rank" class="group px-4 py-3" :open="neighbor.rank === 1">
        <summary class="cursor-pointer list-none">
          <div class="flex items-center gap-2">
            <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-900 font-mono text-[9px] font-black text-white">{{ neighbor.rank }}</span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-2">
                <span class="truncate text-[10px] font-black uppercase tracking-wide text-pic-brand">{{ valueText(neighbor.values.SkuReal) }}</span>
                <span class="font-mono text-[10px] font-black text-slate-700">{{ percentage(neighbor.score) }}</span>
              </div>
              <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div class="h-full rounded-full bg-pic-brand" :style="{ width: percentage(neighbor.score) }"></div>
              </div>
            </div>
            <i class="fa-solid fa-chevron-down text-[9px] text-slate-400 transition group-open:rotate-180"></i>
          </div>
          <p class="mt-2 line-clamp-2 text-[11px] font-bold leading-4 text-slate-700">{{ neighbor.SKUMuliix }}</p>
        </summary>

        <div class="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
          <div class="grid grid-cols-2 gap-x-3 gap-y-2 text-[9px]">
            <div><p class="font-black uppercase text-slate-400">Marca</p><p class="mt-0.5 truncate font-bold text-slate-700">{{ valueText(neighbor.values.Marca) }}</p></div>
            <div><p class="font-black uppercase text-slate-400">Grupo</p><p class="mt-0.5 truncate font-bold text-slate-700">{{ valueText(neighbor.values.Grupo) }}</p></div>
            <div><p class="font-black uppercase text-slate-400">Categoría</p><p class="mt-0.5 truncate font-bold text-slate-700">{{ valueText(neighbor.values.Categorias) }}</p></div>
            <div><p class="font-black uppercase text-slate-400">Nombre</p><p class="mt-0.5 truncate font-bold text-slate-700">{{ valueText(neighbor.values.Nombre) }}</p></div>
          </div>
          <div class="mt-3 flex gap-2 border-t border-slate-200 pt-2 font-mono text-[8px] font-bold text-slate-500">
            <span>VECTOR {{ percentage(neighbor.vectorScore) }}</span>
            <span>·</span>
            <span>TEXTO {{ percentage(neighbor.lexicalScore) }}</span>
          </div>
        </div>
      </details>
    </div>

    <div v-else class="p-5 text-center text-[10px] font-semibold text-slate-500">No se encontraron antecedentes.</div>

    <footer v-if="result?.status === 'READY'" class="border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-[9px] font-bold text-slate-500">
      {{ result.referenceCount || 0 }} referencias · {{ result.model }} · {{ result.dimensions }}d
    </footer>
  </aside>
</template>
