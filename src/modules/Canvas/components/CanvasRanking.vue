<script setup lang="ts">
import { computed, ref } from 'vue';
import type { CanvasCell } from '../types/canvasTypes';
import { formatCanvasKg, formatCanvasScore } from '../utils/canvasFormatters';

interface Props {
  cells: CanvasCell[];
  selectedKey?: string | null;
}

type RankingMode = 'losses' | 'gains' | 'anomalies';

interface RankingItem {
  key: string;
  label: string;
  value: number;
  display: string;
  width: number;
  tone: string;
}

const props = withDefaults(defineProps<Props>(), { selectedKey: null });
const emit = defineEmits<{
  (event: 'select', key: string): void;
}>();

const mode = ref<RankingMode>('losses');
const modes: Array<{ id: RankingMode; label: string }> = [
  { id: 'losses', label: 'Pérdidas' },
  { id: 'gains', label: 'Ganancias' },
  { id: 'anomalies', label: 'Atípicos' },
];

const ranking = computed<RankingItem[]>(() => {
  const candidates = props.cells
    .filter((cell) => {
      if (mode.value === 'losses') return (cell.netDifference || 0) < 0;
      if (mode.value === 'gains') return (cell.netDifference || 0) > 0;
      return cell.peerDeviation !== null;
    })
    .map((cell) => ({
      cell,
      value: mode.value === 'anomalies'
        ? Math.abs(cell.peerDeviation as number)
        : Math.abs(cell.netDifference as number),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  const max = candidates[0]?.value || 1;

  return candidates.map(({ cell, value }) => ({
    key: cell.key,
    label: `${cell.x} · ${cell.y}`,
    value,
    display: mode.value === 'anomalies'
      ? formatCanvasScore(cell.peerDeviation)
      : mode.value === 'losses'
        ? formatCanvasKg(value)
        : formatCanvasKg(cell.netDifference),
    width: Math.max(5, (value / max) * 100),
    tone: mode.value === 'gains'
      ? 'bg-[hsl(var(--pic-accent-blue))]'
      : 'bg-[hsl(var(--pic-accent-orange))]',
  }));
});
</script>

<template>
  <div>
    <div class="grid grid-cols-3 gap-1 rounded-lg bg-pic-muted-surface p-1" role="tablist" aria-label="Tipo de ranking">
      <button
        v-for="item in modes"
        :key="item.id"
        type="button"
        class="min-h-8 rounded-md px-2 text-[10px] font-black uppercase transition"
        :class="mode === item.id ? 'bg-pic-surface text-pic-brand shadow-sm' : 'text-pic-text-muted hover:text-pic-text-main'"
        :aria-selected="mode === item.id"
        @click="mode = item.id"
      >
        {{ item.label }}
      </button>
    </div>

    <div v-if="ranking.length" class="mt-4 space-y-3">
      <button
        v-for="item in ranking"
        :key="item.key"
        type="button"
        class="block w-full rounded-lg border px-3 py-2.5 text-left transition"
        :class="selectedKey === item.key
          ? 'border-pic-brand bg-pic-brand-soft'
          : 'border-transparent hover:border-pic-border hover:bg-pic-muted-surface'"
        @click="emit('select', item.key)"
      >
        <span class="flex items-start justify-between gap-3">
          <span class="min-w-0 truncate text-[11px] font-black text-pic-text-main">{{ item.label }}</span>
          <span class="shrink-0 font-mono text-[10px] font-bold text-pic-text-muted">{{ item.display }}</span>
        </span>
        <span class="mt-2 block h-1.5 overflow-hidden rounded bg-pic-muted-surface">
          <span class="block h-full rounded" :class="item.tone" :style="{ width: `${item.width}%` }"></span>
        </span>
      </button>
    </div>

    <div v-else class="mt-4 rounded-lg border border-dashed border-pic-border p-6 text-center">
      <i class="fa-solid fa-chart-simple text-pic-text-muted"></i>
      <p class="mt-2 text-xs font-bold text-pic-text-muted">No hay valores para este ranking.</p>
    </div>

    <p v-if="mode === 'anomalies'" class="mt-4 border-l-2 border-pic-brand-border pl-3 text-[10px] font-semibold leading-4 text-pic-text-muted">
      Score robusto descriptivo: 0.6745 × (valor − mediana) / MAD. No implica causalidad ni significancia estadística.
    </p>
  </div>
</template>
