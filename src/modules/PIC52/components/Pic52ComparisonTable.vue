<script setup lang="ts">
import { computed } from 'vue';
import type { Pic52Report } from '../types/pic52';
import {
  buildMetricTable,
  type Pic52Metric,
  type Pic52MetricRow,
} from '../utils/pic52Report';

interface Props {
  report: Pic52Report;
  metric: Pic52Metric;
  filterSummary?: string;
}

const props = defineProps<Props>();

const table = computed(() => buildMetricTable(props.report, props.metric));
const isKilograms = computed(() => props.metric === 'kg');
const title = computed(() => (
  `${props.report.transaction.value} ${props.report.weeks.length} semanas en ${isKilograms.value ? 'kilogramos' : 'pesos'}`
));
const metricLabel = computed(() => isKilograms.value ? 'KG' : 'MXN');
const tableMinWidth = computed(() => `${Math.max(760, 330 + (table.value.years.length * 132))}px`);
const comparisonLabel = computed(() => {
  if (table.value.referenceYear === null || table.value.previousYear === null) {
    return 'Sin año comparable';
  }
  return `${table.value.referenceYear} vs ${table.value.previousYear}`;
});
const observedWeeksByYear = computed(() => new Map(
  props.report.series.map(series => [series.year, series.totals.observedWeeks]),
));

const valueFormatter = new Intl.NumberFormat('es-MX', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const percentageFormatter = new Intl.NumberFormat('es-MX', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const formatValue = (value: number | null) => (
  value === null ? '—' : valueFormatter.format(value)
);
const formatDifference = (value: number | null) => {
  if (value === null) return '—';
  const formatted = valueFormatter.format(Math.abs(value));
  return value > 0 ? `+${formatted}` : value < 0 ? `−${formatted}` : formatted;
};
const formatPercentage = (value: number | null) => {
  if (value === null) return '—';
  const formatted = percentageFormatter.format(Math.abs(value));
  return value > 0 ? `+${formatted}%` : value < 0 ? `−${formatted}%` : `${formatted}%`;
};
const comparisonTone = (value: number | null) => {
  if (value === null || value === 0) return 'text-pic-text-muted';
  return value > 0 ? 'text-pic-success' : 'text-pic-danger';
};
const rowHasMissing = (row: Pic52MetricRow) => (
  table.value.years.some(year => row.values[year] === null)
);
</script>

<template>
  <article class="min-w-0 overflow-hidden rounded-xl border border-pic-border bg-pic-surface shadow-sm">
    <header class="flex flex-col gap-3 border-b border-pic-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex min-w-0 items-center gap-3">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-pic-brand-border bg-pic-brand-soft text-pic-brand">
          <i :class="isKilograms ? 'fa-solid fa-weight-hanging' : 'fa-solid fa-dollar-sign'"></i>
        </span>
        <div class="min-w-0">
          <p class="text-[9px] font-black uppercase tracking-[0.16em] text-pic-brand">
            Comparativo semanal · {{ metricLabel }}
          </p>
          <h3 class="mt-0.5 truncate text-sm font-black text-pic-text-main">{{ title }}</h3>
          <p
            v-if="filterSummary"
            class="mt-1 text-[10px] font-semibold leading-4 text-pic-text-muted"
            :title="filterSummary"
          >
            <i class="fa-solid fa-filter mr-1 text-pic-brand"></i>
            {{ filterSummary }}
          </p>
        </div>
      </div>
      <span class="inline-flex h-7 shrink-0 items-center rounded-lg border border-pic-border bg-pic-muted-surface px-2.5 font-mono text-[10px] font-bold text-pic-text-muted">
        {{ comparisonLabel }}
      </span>
    </header>

    <div class="border-b border-pic-border bg-pic-muted-surface px-4 py-2">
      <div class="flex flex-wrap gap-x-4 gap-y-1">
        <span
          v-for="year in table.years"
          :key="year"
          class="text-[10px] font-bold text-pic-text-muted"
        >
          <strong class="text-pic-text-main">{{ year }}</strong>
          · {{ observedWeeksByYear.get(year) ?? 0 }} observadas
        </span>
      </div>
    </div>

    <div class="pic52-table-scroll max-h-[680px] overflow-auto">
      <table
        class="w-full border-separate border-spacing-0 text-right text-[11px]"
        :style="{ minWidth: tableMinWidth }"
      >
        <caption class="sr-only">
          {{ title }}. Las celdas con guion no tienen registros en la semana correspondiente.
        </caption>
        <thead class="sticky top-0 z-20">
          <tr class="bg-slate-800 text-[9px] font-black uppercase tracking-[0.08em] text-white">
            <th
              scope="col"
              class="sticky left-0 z-30 w-24 border-b border-r border-slate-700 bg-slate-900 px-3 py-2.5 text-left"
            >
              Semana
            </th>
            <th
              v-for="year in table.years"
              :key="year"
              scope="col"
              class="min-w-[132px] border-b border-r border-slate-700 px-3 py-2.5"
            >
              {{ metricLabel }} {{ year }}
            </th>
            <th scope="col" class="min-w-[122px] border-b border-r border-slate-700 px-3 py-2.5">
              % {{ comparisonLabel }}
            </th>
            <th scope="col" class="min-w-[132px] border-b border-slate-700 px-3 py-2.5">
              Diferencia
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in table.rows"
            :key="row.week"
            class="group transition-colors hover:bg-pic-brand-soft"
            :class="index % 2 ? 'bg-pic-muted-surface/60' : 'bg-pic-surface'"
          >
            <th
              scope="row"
              class="sticky left-0 z-10 border-b border-r border-pic-border px-3 py-2 text-left font-mono text-[10px] font-black text-pic-text-main group-hover:bg-pic-brand-soft"
              :class="index % 2 ? 'bg-pic-muted-surface' : 'bg-pic-surface'"
            >
              SEM-{{ row.week }}
              <i
                v-if="rowHasMissing(row)"
                class="fa-solid fa-minus ml-1 text-[8px] text-pic-text-muted"
                title="Al menos un año no tiene registros en esta semana"
              ></i>
            </th>
            <td
              v-for="year in table.years"
              :key="year"
              class="border-b border-r border-pic-border px-3 py-2 font-semibold tabular-nums text-pic-text-main"
              :class="row.values[year] === null ? 'text-pic-text-muted' : ''"
              :title="row.values[year] === null ? `Sin registros en ${year}, semana ${row.week}` : undefined"
            >
              {{ formatValue(row.values[year]) }}
            </td>
            <td
              class="border-b border-r border-pic-border px-3 py-2 font-black tabular-nums"
              :class="comparisonTone(row.percentage)"
            >
              {{ formatPercentage(row.percentage) }}
            </td>
            <td
              class="border-b border-pic-border px-3 py-2 font-black tabular-nums"
              :class="comparisonTone(row.difference)"
            >
              {{ formatDifference(row.difference) }}
            </td>
          </tr>
        </tbody>
        <tfoot class="sticky bottom-0 z-20">
          <tr class="bg-slate-900 text-white shadow-[0_-1px_0_0_hsl(var(--pic-border))]">
            <th
              scope="row"
              class="sticky left-0 z-30 border-r border-slate-700 bg-slate-950 px-3 py-3 text-left text-[9px] font-black uppercase tracking-[0.12em]"
            >
              Total observado
            </th>
            <td
              v-for="year in table.years"
              :key="year"
              class="border-r border-slate-700 px-3 py-3 font-black tabular-nums"
            >
              {{ formatValue(table.totals.values[year]) }}
            </td>
            <td class="border-r border-slate-700 px-3 py-3 font-black tabular-nums">
              {{ formatPercentage(table.totals.percentage) }}
            </td>
            <td class="px-3 py-3 font-black tabular-nums">
              {{ formatDifference(table.totals.difference) }}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>

    <footer class="flex items-start gap-2 border-t border-pic-border bg-pic-muted-surface px-4 py-2 text-[10px] font-semibold leading-4 text-pic-text-muted">
      <i class="fa-solid fa-circle-info mt-0.5 text-pic-brand"></i>
      <span>
        “—” significa semana sin registros. Un cero observado se conserva en la tabla.
        Los totales excluyen ausencias; el porcentaje total suma las variaciones semanales
        mostradas en la tabla.
      </span>
    </footer>
  </article>
</template>

<style scoped>
.pic52-table-scroll {
  scrollbar-color: hsl(var(--pic-border)) hsl(var(--pic-muted-surface));
  scrollbar-width: thin;
}

.pic52-table-scroll::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.pic52-table-scroll::-webkit-scrollbar-track {
  background: hsl(var(--pic-muted-surface));
}

.pic52-table-scroll::-webkit-scrollbar-thumb {
  border: 2px solid hsl(var(--pic-muted-surface));
  border-radius: 6px;
  background: hsl(var(--pic-border));
}
</style>
