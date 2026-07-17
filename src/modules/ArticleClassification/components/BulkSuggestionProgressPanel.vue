<script setup lang="ts">
import { computed } from 'vue';
import type { BulkSuggestionProgress } from '../types/articleClassificationTypes';

interface Props {
  progress: BulkSuggestionProgress;
}

const props = defineProps<Props>();

const percentage = computed(() => (
  props.progress.total > 0 ? Math.round((props.progress.processed / props.progress.total) * 100) : 0
));
const statusLabel = computed(() => props.progress.running ? 'Generando propuestas' : 'Lote terminado');
</script>

<template>
  <section
    v-if="progress.total > 0"
    class="overflow-hidden rounded-xl border shadow-sm"
    :class="progress.failed ? 'border-[hsl(var(--pic-warning)/0.28)] bg-[hsl(var(--pic-warning)/0.08)]' : 'border-[hsl(var(--pic-success)/0.28)] bg-pic-surface'"
    aria-live="polite"
  >
    <div class="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex min-w-0 items-center gap-3">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pic-brand-soft text-sm text-pic-brand">
          <i :class="progress.running ? 'fa-solid fa-gears fa-beat-fade' : 'fa-solid fa-list-check'"></i>
        </span>
        <div class="min-w-0">
          <p class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{{ statusLabel }}</p>
          <p class="mt-0.5 text-xs font-bold text-slate-800">
            {{ progress.processed }} de {{ progress.total }} revisados
            <span v-if="progress.activeConceptIds.length" class="font-mono text-slate-500">
              · activos #{{ progress.activeConceptIds.join(', #') }}
            </span>
          </p>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-2 text-center">
        <div class="rounded-lg border border-[hsl(var(--pic-success)/0.28)] bg-[hsl(var(--pic-success)/0.08)] px-2.5 py-1.5"><p class="text-sm font-black text-pic-success">{{ progress.generated }}</p><p class="text-[8px] font-black uppercase text-pic-success">Nuevas</p></div>
        <div class="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5"><p class="text-sm font-black text-slate-700">{{ progress.alreadyPresent }}</p><p class="text-[8px] font-black uppercase text-slate-500">Existían</p></div>
        <div class="rounded-lg border border-[hsl(var(--pic-warning)/0.28)] bg-pic-surface px-2.5 py-1.5"><p class="text-sm font-black text-pic-warning">{{ progress.failed }}</p><p class="text-[8px] font-black uppercase text-pic-warning">Fallos</p></div>
      </div>
    </div>
    <div class="h-1.5 bg-slate-100">
      <div class="h-full bg-pic-brand transition-[width] duration-300" :style="{ width: `${percentage}%` }"></div>
    </div>
    <details v-if="progress.failures.length" class="border-t border-[hsl(var(--pic-warning)/0.28)] px-4 py-2.5">
      <summary class="cursor-pointer text-[10px] font-black uppercase tracking-wide text-pic-warning">Ver {{ progress.failures.length }} fallos</summary>
      <ul class="mt-2 space-y-2">
        <li v-for="failure in progress.failures" :key="failure.conceptId" class="rounded-lg border border-[hsl(var(--pic-warning)/0.28)] bg-pic-surface px-3 py-2 text-[10px] leading-4 text-pic-text-muted">
          <span class="font-mono font-black text-slate-800">#{{ failure.conceptId }}</span>
          <span class="ml-2 font-bold">{{ failure.message }}</span>
          <p class="mt-0.5 truncate text-slate-400">{{ failure.SKUMuliix }}</p>
        </li>
      </ul>
    </details>
  </section>
</template>
