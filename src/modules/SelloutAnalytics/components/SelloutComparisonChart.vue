<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  AriaComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import FilterDropdown from '@/modules/Shared/components/FilterDropdown.vue';
import type {
  SelloutComparisonMeasure,
  SelloutComparisonMode,
  SelloutComparisonOption,
  SelloutComparisonSeries,
  SelloutComparisonWindow,
  SelloutMatrixLevel,
} from '../types/selloutAnalytics';
import { buildSelloutChartModel } from '../utils/selloutComparison';

echarts.use([
  LineChart,
  AriaComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
]);

interface Props {
  level: SelloutMatrixLevel;
  mode: SelloutComparisonMode;
  measure: SelloutComparisonMeasure;
  visibleWeeks: SelloutComparisonWindow;
  options: SelloutComparisonOption[];
  selectedEntities: string[];
  data: SelloutComparisonSeries | null;
  loading?: boolean;
  error?: string;
}

const props = withDefaults(defineProps<Props>(), { loading: false, error: '' });
const emit = defineEmits<{
  (event: 'level-change', value: SelloutMatrixLevel): void;
  (event: 'mode-change', value: SelloutComparisonMode): void;
  (event: 'measure-change', value: SelloutComparisonMeasure): void;
  (event: 'window-change', value: SelloutComparisonWindow): void;
  (event: 'entities-change', value: string[]): void;
}>();

const chartRef = ref<HTMLDivElement | null>(null);
let chart: echarts.ECharts | null = null;
let resizeObserver: ResizeObserver | null = null;
const numberFormatter = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 3 });
const indexFormatter = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const levelOptions: Array<{ value: SelloutMatrixLevel; label: string }> = [
  { value: 'chain', label: 'Cadenas' },
  { value: 'store', label: 'Tiendas' },
  { value: 'sku', label: 'Productos' },
];
const modeOptions: Array<{ value: SelloutComparisonMode; label: string }> = [
  { value: 'timeline', label: 'Cronológico' },
  { value: 'yearOverYear', label: 'Año contra año' },
];
const measureOptions: Array<{ value: SelloutComparisonMeasure; label: string }> = [
  { value: 'kg', label: 'KG netos' },
  { value: 'index', label: 'Índice base 100' },
];
const visibleWeekOptions: Array<{ value: SelloutComparisonWindow; label: string }> = [
  { value: 8, label: '8' },
  { value: 13, label: '13' },
  { value: 26, label: '26' },
  { value: 52, label: '52' },
  { value: 'all', label: 'Todas' },
];
const optionValues = computed(() => props.options.map(option => option.value));
const selectedModel = computed({
  get: () => props.selectedEntities,
  set: (value: string[]) => emit('entities-change', value),
});
const selectedDetails = computed(() => {
  const options = new Map(props.options.map(option => [option.value, option]));
  return props.selectedEntities.map(value => options.get(value)).filter(Boolean) as SelloutComparisonOption[];
});
const model = computed(() => buildSelloutChartModel(props.data, props.measure));
const needsHorizontalZoom = computed(() => model.value.categories.length > 18);

const token = (name: string, fallback: string) => {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value ? `hsl(${value})` : fallback;
};
const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const chartOption = computed<echarts.EChartsOption>(() => {
  const colors = [
    token('--pic-chart-1', '#d3121e'),
    token('--pic-chart-2', '#0f766e'),
    token('--pic-chart-3', '#2563eb'),
    token('--pic-chart-4', '#d97706'),
    token('--pic-chart-5', '#64748b'),
    token('--pic-chart-6', '#7c3aed'),
  ];
  return {
    color: colors,
    animationDuration: 280,
    aria: {
      enabled: true,
      description: `Comparación de ${model.value.series.length} series de Sellout por semana PIC.`,
    },
    legend: {
      type: 'scroll',
      top: 4,
      left: 8,
      right: 8,
      textStyle: { color: token('--pic-text-muted', '#64748b'), fontSize: 10, fontFamily: 'Inter' },
    },
    tooltip: {
      trigger: 'axis',
      confine: true,
      formatter: (rawParams: unknown) => {
        const params = Array.isArray(rawParams) ? rawParams as Array<{ dataIndex?: number }> : [];
        const dataIndex = Number(params[0]?.dataIndex ?? 0);
        const period = model.value.categories[dataIndex] || '';
        const rows = model.value.series.map(item => {
          const kg = item.rawKg[dataIndex];
          const status = kg === null ? 'Sin registro' : kg < 0 ? 'Neto negativo' : kg === 0 ? 'Cero observado' : 'Observado';
          const index = props.measure === 'index' && item.values[dataIndex] !== null
            ? ` · Índice ${indexFormatter.format(Number(item.values[dataIndex]))}`
            : '';
          const kgLabel = kg === null ? '—' : `${numberFormatter.format(kg)} kg`;
          return `<div style="display:flex;justify-content:space-between;gap:18px"><span>${escapeHtml(item.name)}</span><b>${kgLabel}</b></div><div style="font-size:10px;color:#64748b">${status}${index}</div>`;
        }).join('<div style="height:1px;background:#e2e8f0;margin:6px 0"></div>');
        return `<div style="min-width:210px"><b>${escapeHtml(period)}</b><div style="margin-top:8px">${rows}</div></div>`;
      },
    },
    grid: { left: 18, right: 18, top: 54, bottom: needsHorizontalZoom.value ? 62 : 40, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: model.value.categories,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: token('--pic-border', '#cbd5e1') } },
      axisLabel: { color: token('--pic-text-muted', '#64748b'), fontSize: 10, hideOverlap: true },
    },
    yAxis: {
      type: 'value',
      name: props.measure === 'kg' ? 'KG netos' : 'Índice',
      nameTextStyle: { color: token('--pic-text-muted', '#64748b'), fontSize: 10 },
      axisLabel: {
        color: token('--pic-text-muted', '#64748b'),
        fontSize: 10,
        formatter: (value: number) => props.measure === 'kg' ? numberFormatter.format(value) : indexFormatter.format(value),
      },
      splitLine: { lineStyle: { color: token('--pic-border', '#e2e8f0'), opacity: 0.65 } },
    },
    dataZoom: needsHorizontalZoom.value ? [
      { type: 'inside', start: 0, end: 100, zoomOnMouseWheel: true },
      { type: 'slider', start: 0, end: 100, height: 16, bottom: 8, borderColor: 'transparent', fillerColor: token('--pic-brand-border', '#fecaca') },
    ] : [],
    series: model.value.series.map((item, index) => ({
      id: item.id,
      name: item.name,
      type: 'line',
      data: item.values,
      connectNulls: false,
      showSymbol: model.value.categories.length <= 20,
      symbol: index % 2 === 0 ? 'circle' : 'emptyCircle',
      symbolSize: 6,
      lineStyle: { width: 2, type: index >= 3 ? 'dashed' : 'solid' },
      emphasis: { focus: 'series' },
    })),
  };
});

const renderChart = () => {
  if (!chartRef.value) return;
  if (!chart) chart = echarts.init(chartRef.value, null, { renderer: 'canvas' });
  chart.setOption(chartOption.value, { notMerge: true });
};

watch(chartRef, element => {
  resizeObserver?.disconnect();
  chart?.dispose();
  chart = null;
  if (!element) return;
  renderChart();
  resizeObserver = new ResizeObserver(() => chart?.resize());
  resizeObserver.observe(element);
}, { flush: 'post' });
watch(chartOption, renderChart, { deep: true });
onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  chart?.dispose();
  chart = null;
});
</script>

<template>
  <section class="overflow-hidden rounded-xl border border-pic-border bg-pic-surface shadow-sm" aria-label="Comparación histórica">
    <header class="border-b border-pic-border px-4 py-3">
      <div class="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p class="text-[10px] font-black uppercase tracking-[0.14em] text-pic-brand">Evolución histórica</p>
          <h2 class="mt-1 text-sm font-black text-pic-text-main">Líneas comparativas</h2>
          <p class="mt-1 text-[10px] font-semibold text-pic-text-muted">
            Mismo periodo y medida · los huecos permanecen sin unir
          </p>
        </div>
        <div class="grid gap-2 sm:grid-cols-2 2xl:grid-cols-4">
          <div class="inline-flex rounded-lg border border-pic-border bg-pic-muted-surface p-1">
            <button
              v-for="option in levelOptions"
              :key="option.value"
              type="button"
              class="rounded-md px-2 py-1 text-[10px] font-black transition"
              :class="level === option.value ? 'bg-pic-brand text-white' : 'text-pic-text-muted hover:text-pic-brand'"
              :aria-pressed="level === option.value"
              @click="emit('level-change', option.value)"
            >{{ option.label }}</button>
          </div>
          <div class="inline-flex rounded-lg border border-pic-border bg-pic-muted-surface p-1" aria-label="Semanas visibles">
            <button
              v-for="option in visibleWeekOptions"
              :key="option.value"
              type="button"
              class="rounded-md px-2 py-1 text-[10px] font-black transition"
              :class="visibleWeeks === option.value ? 'bg-pic-brand text-white' : 'text-pic-text-muted hover:text-pic-brand'"
              :aria-pressed="visibleWeeks === option.value"
              :title="`${option.label} semanas visibles`"
              @click="emit('window-change', option.value)"
            >{{ option.label }}</button>
          </div>
          <div class="inline-flex rounded-lg border border-pic-border bg-pic-muted-surface p-1">
            <button
              v-for="option in modeOptions"
              :key="option.value"
              type="button"
              class="rounded-md px-2 py-1 text-[10px] font-black transition"
              :class="mode === option.value ? 'bg-pic-brand text-white' : 'text-pic-text-muted hover:text-pic-brand'"
              :aria-pressed="mode === option.value"
              @click="emit('mode-change', option.value)"
            >{{ option.label }}</button>
          </div>
          <div class="inline-flex rounded-lg border border-pic-border bg-pic-muted-surface p-1">
            <button
              v-for="option in measureOptions"
              :key="option.value"
              type="button"
              class="rounded-md px-2 py-1 text-[10px] font-black transition"
              :class="measure === option.value ? 'bg-pic-brand text-white' : 'text-pic-text-muted hover:text-pic-brand'"
              :aria-pressed="measure === option.value"
              @click="emit('measure-change', option.value)"
            >{{ option.label }}</button>
          </div>
        </div>
      </div>

      <div class="mt-3 grid gap-2 lg:grid-cols-[minmax(16rem,24rem)_minmax(0,1fr)] lg:items-start">
        <FilterDropdown
          v-model="selectedModel"
          :options="optionValues"
          :multiple="mode === 'timeline'"
          :show-select-all="false"
          :loading="loading"
          density="compact"
          :placeholder="mode === 'timeline' ? 'Selecciona hasta 6 series' : 'Selecciona una entidad'"
        />
        <div class="flex min-h-8 flex-wrap items-center gap-1.5">
          <span
            v-for="item in selectedDetails"
            :key="item.value"
            class="rounded-md border border-pic-brand-border bg-pic-brand-soft px-2 py-1 font-mono text-[10px] font-bold text-pic-brand"
          >
            {{ item.value }}<span v-if="item.secondary" class="font-sans font-semibold"> · {{ item.secondary }}</span>
          </span>
          <span class="ml-auto text-[10px] font-semibold text-pic-text-muted">
            {{ selectedEntities.length }}/{{ mode === 'timeline' ? 6 : 1 }} entidades
          </span>
        </div>
      </div>
    </header>

    <div class="relative">
      <div
        v-if="measure === 'index' && model.unavailableIndexSeries.length"
        class="border-b border-[hsl(var(--pic-warning)/0.28)] bg-[hsl(var(--pic-warning)/0.08)] px-4 py-2 text-[10px] font-semibold text-pic-warning"
      >
        Sin índice por base inicial ausente, cero o negativa: {{ model.unavailableIndexSeries.join(', ') }}.
      </div>
      <div ref="chartRef" class="h-[360px] w-full min-w-0 sm:h-[410px]"></div>
      <div
        v-if="error"
        class="absolute inset-0 flex items-center justify-center bg-pic-surface/95 px-4 text-center text-xs font-bold text-pic-danger"
      >
        {{ error }}
      </div>
      <div
        v-else-if="loading"
        class="absolute inset-0 flex items-center justify-center gap-2 bg-pic-surface/90 text-xs font-bold text-pic-text-muted"
      >
        <i class="fa-solid fa-circle-notch fa-spin text-pic-brand"></i>
        Cargando series comparables
      </div>
      <div
        v-else-if="model.series.length === 0"
        class="absolute inset-0 flex items-center justify-center bg-pic-surface px-4 text-center text-xs font-semibold text-pic-text-muted"
      >
        Selecciona al menos una entidad con datos en el periodo aplicado.
      </div>
      <footer class="flex flex-col gap-1 border-t border-pic-border px-4 py-2 text-[10px] font-semibold text-pic-text-muted sm:flex-row sm:justify-between">
        <span>Producto suma las tiendas del filtro; tienda suma sus SKU.</span>
        <span v-if="mode === 'yearOverYear'">Semanas PIC alineadas por número; S53 puede quedar sin par comparable.</span>
        <span v-else>Índice 100 = primera semana solicitada con base positiva.</span>
        <span>Ventana cargada: {{ visibleWeeks === 'all' ? 'todo el histórico' : `${visibleWeeks} semanas` }}; usa el control inferior cuando esté disponible.</span>
      </footer>
    </div>
  </section>
</template>
