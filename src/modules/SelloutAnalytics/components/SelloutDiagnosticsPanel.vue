<script setup lang="ts">
import { computed } from 'vue';
import type {
  SelloutDropRanking,
  SelloutMatrixLevel,
  SelloutPeriodKey,
  SelloutSummary,
} from '../types/selloutAnalytics';
import { calculateSelloutMetrics } from '../utils/selloutMetrics';

interface Props {
  periods: SelloutPeriodKey[];
  summary: SelloutSummary | null;
  ranking: SelloutDropRanking | null;
  rankingLevel: SelloutMatrixLevel;
  loadingRanking?: boolean;
  rankingError?: string;
}

const props = withDefaults(defineProps<Props>(), {
  loadingRanking: false,
  rankingError: '',
});
const emit = defineEmits<{
  (event: 'ranking-level', level: SelloutMatrixLevel): void;
}>();

const numberFormatter = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 3 });
const percentFormatter = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const formatKg = (value: number | null, signed = false) => {
  if (value === null) return '—';
  const label = numberFormatter.format(value);
  return `${signed && value > 0 ? '+' : ''}${label} kg`;
};
const formatPercent = (value: number | null) => (
  value === null ? '—' : `${value > 0 ? '+' : ''}${percentFormatter.format(value)}%`
);

const metrics = computed(() => calculateSelloutMetrics(
  props.periods,
  props.summary?.periods ?? [],
));
const metricCards = computed(() => [
  {
    label: 'Cambio semanal',
    value: formatKg(metrics.value.weeklyDeltaKg, true),
    detail: `${formatPercent(metrics.value.weeklyDeltaPct)} vs semana anterior`,
    icon: 'fa-solid fa-arrow-right-arrow-left',
    tone: metrics.value.weeklyDeltaKg === null || metrics.value.weeklyDeltaKg === 0
      ? 'neutral' : metrics.value.weeklyDeltaKg > 0 ? 'success' : 'danger',
  },
  {
    label: 'Promedio semanal',
    value: formatKg(metrics.value.averageKg),
    detail: `${metrics.value.observedWeeks} de ${metrics.value.requestedWeeks} semanas observadas`,
    icon: 'fa-solid fa-scale-balanced',
    tone: 'brand',
  },
  {
    label: 'Tendencia 4 × 4',
    value: formatKg(metrics.value.trendDeltaKg, true),
    detail: metrics.value.trendDeltaKg === null
      ? 'Requiere 8 semanas observadas'
      : `${formatPercent(metrics.value.trendDeltaPct)} entre promedios`,
    icon: 'fa-solid fa-chart-line',
    tone: metrics.value.trendDeltaKg === null || metrics.value.trendDeltaKg === 0
      ? 'neutral' : metrics.value.trendDeltaKg > 0 ? 'success' : 'danger',
  },
]);
const toneClasses: Record<string, string> = {
  brand: 'border-pic-brand-border bg-pic-brand-soft text-pic-brand',
  success: 'border-[hsl(var(--pic-success)/0.25)] bg-[hsl(var(--pic-success)/0.08)] text-pic-success',
  danger: 'border-[hsl(var(--pic-danger)/0.25)] bg-[hsl(var(--pic-danger)/0.08)] text-pic-danger',
  neutral: 'border-pic-border bg-pic-muted-surface text-pic-text-muted',
};
const rankingOptions: Array<{ value: SelloutMatrixLevel; label: string }> = [
  { value: 'chain', label: 'Cadena' },
  { value: 'store', label: 'Tienda' },
  { value: 'sku', label: 'SKU' },
];
const rankingRows = computed(() => (props.ranking?.items ?? []).map((item, index) => ({
  key: `${item.chain || ''}-${item.store || ''}-${item.sku || ''}`,
  position: index + 1,
  label: item.sku || item.store || item.chain || 'Sin identificador',
  secondary: item.sku ? item.brand || 'Sin marca' : item.store ? item.chain || 'Sin cadena' : 'Cadena',
  previous: formatKg(item.previousKg),
  current: formatKg(item.currentKg),
  delta: formatKg(item.deltaKg, true),
  percentage: formatPercent(item.deltaPct),
  tone: item.deltaKg < 0 ? 'text-pic-danger' : item.deltaKg > 0 ? 'text-pic-success' : 'text-pic-text-muted',
})));
const comparisonLabel = computed(() => {
  if (!props.ranking) return 'Últimas dos semanas seleccionadas';
  const previous = `${props.ranking.previousPeriod.year}-S${String(props.ranking.previousPeriod.week).padStart(2, '0')}`;
  const current = `${props.ranking.currentPeriod.year}-S${String(props.ranking.currentPeriod.week).padStart(2, '0')}`;
  return `${current} contra ${previous}`;
});
</script>

<template>
  <section class="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(34rem,1.05fr)]" aria-label="Diagnóstico semanal">
    <div class="rounded-xl border border-pic-border bg-pic-surface p-4 shadow-sm">
      <div class="mb-3">
        <p class="text-[10px] font-black uppercase tracking-[0.14em] text-pic-brand">Pulso del periodo</p>
        <h2 class="mt-1 text-sm font-black text-pic-text-main">Indicadores comparables</h2>
      </div>
      <div class="grid gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
        <article
          v-for="card in metricCards"
          :key="card.label"
          class="border-l-2 px-3 py-2.5"
          :class="toneClasses[card.tone]"
        >
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="text-[9px] font-black uppercase tracking-wide">{{ card.label }}</p>
              <p class="mt-1 font-mono text-lg font-black tabular-nums text-pic-text-main">{{ card.value }}</p>
              <p class="mt-1 text-[10px] font-semibold leading-4">{{ card.detail }}</p>
            </div>
            <i :class="card.icon" class="mt-0.5 text-xs"></i>
          </div>
        </article>
      </div>
      <p class="mt-3 text-[10px] font-semibold leading-4 text-pic-text-muted">
        El promedio usa únicamente semanas con registro. La tendencia compara el promedio de las últimas 4 semanas con las 4 anteriores y exige las 8 observadas.
      </p>
    </div>

    <div class="overflow-hidden rounded-xl border border-pic-border bg-pic-surface shadow-sm">
      <header class="flex flex-col gap-3 border-b border-pic-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-[10px] font-black uppercase tracking-[0.14em] text-pic-brand">Mayor caída en KG</p>
          <h2 class="mt-1 text-sm font-black text-pic-text-main">Contribución al cambio semanal</h2>
          <p class="mt-1 text-[10px] font-semibold text-pic-text-muted">{{ comparisonLabel }}</p>
        </div>
        <div class="inline-flex w-fit rounded-lg border border-pic-border bg-pic-muted-surface p-1">
          <button
            v-for="option in rankingOptions"
            :key="option.value"
            type="button"
            class="rounded-md px-2.5 py-1 text-[10px] font-black transition"
            :class="rankingLevel === option.value ? 'bg-pic-brand text-white' : 'text-pic-text-muted hover:text-pic-brand'"
            :aria-pressed="rankingLevel === option.value"
            @click="emit('ranking-level', option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </header>
      <div v-if="loadingRanking" class="flex min-h-40 items-center justify-center gap-2 text-xs font-bold text-pic-text-muted">
        <i class="fa-solid fa-circle-notch fa-spin text-pic-brand"></i>
        Calculando ranking
      </div>
      <div v-else-if="rankingError" class="px-4 py-6 text-center text-xs font-bold text-pic-danger">{{ rankingError }}</div>
      <div v-else-if="rankingRows.length === 0" class="px-4 py-8 text-center text-xs font-semibold text-pic-text-muted">
        No hay entidades observadas en ambas semanas para comparar.
      </div>
      <div v-else class="max-h-72 overflow-auto">
        <table class="min-w-full text-xs">
          <thead class="sticky top-0 bg-pic-muted-surface text-[9px] font-black uppercase text-pic-text-muted">
            <tr>
              <th class="px-3 py-2 text-left">Entidad</th>
              <th class="px-3 py-2 text-right">Anterior</th>
              <th class="px-3 py-2 text-right">Actual</th>
              <th class="px-3 py-2 text-right">Cambio</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rankingRows" :key="row.key" class="border-t border-pic-border">
              <th scope="row" class="px-3 py-2 text-left">
                <span class="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-md bg-pic-muted-surface font-mono text-[9px] text-pic-text-muted">{{ row.position }}</span>
                <span class="font-mono font-bold text-pic-text-main">{{ row.label }}</span>
                <span class="ml-2 text-[9px] font-semibold uppercase text-pic-text-muted">{{ row.secondary }}</span>
              </th>
              <td class="px-3 py-2 text-right font-mono text-pic-text-muted">{{ row.previous }}</td>
              <td class="px-3 py-2 text-right font-mono text-pic-text-main">{{ row.current }}</td>
              <td class="px-3 py-2 text-right font-mono font-bold" :class="row.tone">
                {{ row.delta }}
                <span class="block text-[9px]">{{ row.percentage }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
