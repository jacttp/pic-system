<script setup lang="ts">
import { computed } from 'vue';
import { StdButton } from '@/modules/Shared/components/std';
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

const matchCountLabel = computed(() => {
  const count = props.result?.neighbors.length || 0;
  return `${count} ${count === 1 ? 'coincidencia' : 'coincidencias'}`;
});

const percentage = (value: number) => `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`;
const scoreBadgeClasses = (value: number) => value > 0.8
  ? 'bg-pic-success text-white'
  : 'bg-pic-brand text-white';
const valueText = (value: string | number | null) => value === null ? '—' : String(value);

const handleDimension = (event: Event) => {
  emit('dimensions', Number((event.target as HTMLSelectElement).value));
};
</script>

<template>
  <aside
    aria-label="Conceptos similares"
    class="overflow-hidden bg-pic-surface"
  >
    <div class="border-b border-pic-border bg-pic-muted-surface px-3 py-2.5">
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="truncate text-xs font-semibold text-pic-text-main">
            {{ loading ? 'Buscando coincidencias…' : matchCountLabel }}
          </p>
          <p class="mt-0.5 text-[10px] font-medium text-pic-text-muted">
            Semántica 80% · texto 20%
          </p>
        </div>

        <label class="shrink-0">
          <span class="sr-only">Dimensiones del vector</span>
          <select
            :value="dimensions"
            class="h-8 w-[112px] rounded-lg border border-pic-border bg-pic-surface px-2 text-[11px] font-semibold text-pic-text-main outline-none transition hover:bg-pic-brand-soft focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-border disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="loading"
            title="Dimensiones del vector"
            @change="handleDimension"
          >
            <option v-for="option in dimensionOptions" :key="option" :value="option">
              {{ option }} dim.
            </option>
          </select>
        </label>
      </div>
    </div>

    <div v-if="loading" class="space-y-2 p-3" role="status" aria-live="polite">
      <span class="sr-only">Cargando antecedentes similares</span>
      <div
        v-for="item in 3"
        :key="item"
        class="animate-pulse rounded-lg bg-pic-muted-surface p-3"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="h-3 w-3/4 rounded bg-[hsl(var(--pic-text-muted)/0.14)]"></div>
          <div class="h-6 w-11 rounded-md bg-[hsl(var(--pic-text-muted)/0.14)]"></div>
        </div>
        <div class="mt-3 h-8 rounded-md bg-[hsl(var(--pic-text-muted)/0.10)]"></div>
      </div>
    </div>

    <div v-else-if="error" class="p-3" role="alert">
      <div class="rounded-lg border border-[hsl(var(--pic-warning)/0.28)] bg-[hsl(var(--pic-warning)/0.08)] p-3">
        <div class="flex items-start gap-3">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pic-surface text-pic-warning">
            <i class="fa-solid fa-plug-circle-xmark" aria-hidden="true"></i>
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-bold text-pic-text-main">Retrieval no disponible</p>
            <p class="mt-1 break-words text-[11px] font-medium leading-4 text-pic-text-muted">{{ error }}</p>
          </div>
        </div>
        <StdButton class="mt-3 w-full" size="sm" icon="fa-solid fa-rotate-right" @click="emit('retry')">
          Intentar otra vez
        </StdButton>
      </div>
    </div>

    <div v-else-if="result?.status === 'NOT_EMBEDDED'" class="p-3" role="status">
      <div class="rounded-lg border border-[hsl(var(--pic-info)/0.28)] bg-[hsl(var(--pic-info)/0.08)] p-3">
        <div class="flex items-start gap-3">
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pic-surface text-pic-info">
            <i class="fa-solid fa-wave-square" aria-hidden="true"></i>
          </span>
          <div>
            <p class="text-xs font-bold text-pic-text-main">Concepto sin vector</p>
            <p class="mt-1 text-[11px] font-medium leading-4 text-pic-text-muted">
              El embedding seleccionado todavía no está disponible para este concepto.
            </p>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="result?.neighbors.length" class="divide-y divide-pic-border">
      <details
        v-for="neighbor in result.neighbors"
        :key="neighbor.rank"
        class="group overflow-hidden bg-pic-surface transition open:bg-pic-muted-surface open:shadow-[inset_3px_0_0_0_hsl(var(--pic-brand))]"
        :open="neighbor.rank === 1"
      >
        <summary class="cursor-pointer list-none p-3 transition hover:bg-pic-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pic-brand-border">
          <div class="flex items-start gap-2.5">
            <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-pic-brand-border bg-pic-surface text-[10px] font-semibold text-pic-brand transition-colors group-hover:border-pic-brand group-hover:bg-pic-brand group-hover:text-white">
              {{ neighbor.rank }}
            </span>

            <div class="min-w-0 flex-1">
              <p class="line-clamp-3 text-xs font-semibold leading-[1.4] text-pic-text-main">
                {{ neighbor.SKUMuliix }}
              </p>
            </div>

            <div class="flex shrink-0 items-center gap-1.5">
              <span
                class="rounded-md px-2 py-1 text-[10px] font-semibold"
                :class="scoreBadgeClasses(neighbor.score)"
              >
                {{ percentage(neighbor.score) }}
              </span>
              <i class="fa-solid fa-chevron-down text-[9px] text-pic-text-muted transition-transform group-open:rotate-180" aria-hidden="true"></i>
            </div>
          </div>

          <div class="mt-2.5 rounded-md bg-pic-brand-soft px-2.5 py-2 transition-colors group-hover:bg-pic-surface">
            <p class="text-[10px] font-medium text-pic-text-muted">SKU real clasificado</p>
            <p class="mt-0.5 line-clamp-2 text-[11px] font-semibold leading-4 text-pic-brand">
              {{ valueText(neighbor.values.SkuReal) }}
            </p>
          </div>
        </summary>

        <div class="bg-pic-muted-surface px-3 pb-3 pt-1">
          <div class="mb-2 flex items-center gap-2">
            <span class="h-3.5 w-0.5 rounded-full bg-pic-brand" aria-hidden="true"></span>
            <p class="text-[8px] font-semibold uppercase tracking-[0.12em] text-pic-text-muted">
              Clasificación histórica
            </p>
          </div>
          <dl
            class="grid gap-x-2 gap-y-2 rounded-lg bg-pic-surface px-2.5 py-2.5"
            style="grid-template-columns: 58px minmax(0, 1fr)"
          >
            <dt class="text-[9px] font-bold leading-[1.35] text-pic-text-main">Marca</dt>
            <dd class="min-w-0 break-words text-[10px] font-normal leading-[1.35] text-pic-text-main">{{ valueText(neighbor.values.Marca) }}</dd>

            <dt class="text-[9px] font-bold leading-[1.35] text-pic-text-main">Grupo</dt>
            <dd class="min-w-0 break-words text-[10px] font-normal leading-[1.35] text-pic-text-main">{{ valueText(neighbor.values.Grupo) }}</dd>

            <dt class="text-[9px] font-bold leading-[1.35] text-pic-text-main">Categoría</dt>
            <dd class="min-w-0 break-words text-[10px] font-normal leading-[1.35] text-pic-text-main">{{ valueText(neighbor.values.Categorias) }}</dd>

            <dt class="text-[9px] font-bold leading-[1.35] text-pic-text-main">Nombre</dt>
            <dd class="min-w-0 break-words text-[10px] font-normal leading-[1.35] text-pic-text-main">{{ valueText(neighbor.values.Nombre) }}</dd>
          </dl>

          <div class="mt-2.5 flex items-center justify-between gap-3 text-[10px] text-pic-text-muted">
            <span>Vector <strong class="font-semibold text-pic-text-main">{{ percentage(neighbor.vectorScore) }}</strong></span>
            <span class="h-3 w-px bg-pic-border" aria-hidden="true"></span>
            <span>Texto <strong class="font-semibold text-pic-text-main">{{ percentage(neighbor.lexicalScore) }}</strong></span>
          </div>
        </div>
      </details>
    </div>

    <div v-else class="px-4 py-6 text-center" role="status">
      <span class="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-pic-muted-surface text-pic-text-muted">
        <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
      </span>
      <p class="mt-2 text-xs font-semibold text-pic-text-main">Sin antecedentes similares</p>
      <p class="mt-1 text-[11px] font-medium text-pic-text-muted">No se encontraron referencias para esta dimensión.</p>
    </div>

    <details v-if="result?.status === 'READY'" class="border-t border-pic-border bg-pic-muted-surface">
      <summary class="cursor-pointer list-none px-3 py-2 text-[10px] font-medium text-pic-text-muted transition hover:bg-pic-brand-soft hover:text-pic-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pic-brand-border">
        <i class="fa-solid fa-circle-info mr-1" aria-hidden="true"></i>
        Detalles del índice
      </summary>
      <p class="px-3 pb-2.5 text-[10px] leading-4 text-pic-text-muted">
        {{ result.referenceCount || 0 }} referencias · {{ result.model }} · {{ result.dimensions }}d
      </p>
    </details>
  </aside>
</template>
