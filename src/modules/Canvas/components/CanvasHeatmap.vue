<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts';
import type { CanvasAnalysisResult, CanvasMetric } from '../types/canvasTypes';
import { CANVAS_DIMENSION_LABELS, CANVAS_METRIC_LABELS } from '../types/canvasTypes';
import { canvasMetricValue, canvasVisualColorValue } from '../utils/canvasAnalytics';
import { escapeCanvasHtml, formatCanvasMetric } from '../utils/canvasFormatters';
import {
  canvasSignedChartColor,
  createCanvasSignedHeatmapVisualMap,
  readCanvasChartPalette,
} from '../utils/canvasWebgl';

interface Props {
  analysis: CanvasAnalysisResult;
  metric: CanvasMetric;
  selectedKey?: string | null;
  fullscreen?: boolean;
  fillAvailable?: boolean;
}

interface HeatmapDatum {
  value: [number, number, number, number];
  canvasKey: string;
  cellIndex: number;
  itemStyle?: { color?: string; borderColor: string; borderWidth: number };
}

interface MissingDatum {
  value: [number, number];
  canvasKey: string;
  cellIndex: number;
  itemStyle?: { borderColor: string; borderWidth: number };
}

const props = withDefaults(defineProps<Props>(), {
  selectedKey: null,
  fullscreen: false,
  fillAvailable: false,
});
const emit = defineEmits<{
  (event: 'select', key: string): void;
}>();

const root = ref<HTMLDivElement | null>(null);
let chart: echarts.ECharts | null = null;
let resizeObserver: ResizeObserver | null = null;

const title = computed(() => `${CANVAS_METRIC_LABELS[props.metric]} por ${CANVAS_DIMENSION_LABELS[props.analysis.axis.x]} y ${CANVAS_DIMENSION_LABELS[props.analysis.axis.y]}`);
const formatAxisLabel = (value: string) => value.replace(' · ', '\n');

const option = computed(() => {
  const palette = readCanvasChartPalette();
  const observed = props.analysis.observedCells.filter((cell) => cell.metricValue !== null);
  const missing = props.analysis.missingCells;
  const values = observed.map((cell) => canvasMetricValue(cell, props.metric) as number);
  const colorValues = observed.map((cell) => canvasVisualColorValue(cell, props.metric) as number);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const signed = props.metric === 'peerDeviation';
  const divergent = props.metric === 'netDifference' || props.metric === 'peerDeviation';
  const colorMin = colorValues.length ? Math.min(...colorValues) : 0;
  const colorMax = colorValues.length ? Math.max(...colorValues) : 1;
  const maxSignedMagnitude = Math.max(Math.abs(colorMin), Math.abs(colorMax), 1);

  const heatmapData: HeatmapDatum[] = observed.map((cell, index) => ({
    value: [
      props.analysis.xValues.indexOf(cell.x),
      props.analysis.yValues.indexOf(cell.y),
      canvasMetricValue(cell, props.metric) as number,
      canvasVisualColorValue(cell, props.metric) as number,
    ],
    canvasKey: cell.key,
    cellIndex: index,
    itemStyle: {
      color: props.metric === 'netDifference'
        ? canvasSignedChartColor(cell.netDifference || 0, maxSignedMagnitude, {
          lossSoft: palette.orangeSoft,
          loss: palette.orange,
          gainSoft: palette.blueSoft,
          gain: palette.blue,
          neutral: palette.missing,
        })
        : undefined,
      borderColor: cell.key === props.selectedKey ? palette.brand : palette.surface,
      borderWidth: cell.key === props.selectedKey ? 3 : 2,
    },
  }));
  const missingData: MissingDatum[] = missing.map((cell, index) => ({
    value: [
      props.analysis.xValues.indexOf(cell.x),
      props.analysis.yValues.indexOf(cell.y),
    ],
    canvasKey: cell.key,
    cellIndex: index,
    itemStyle: cell.key === props.selectedKey
      ? { borderColor: palette.brand, borderWidth: 3 }
      : undefined,
  }));

  return {
    animation: false,
    grid: { top: 28, left: 24, right: 28, bottom: 72, containLabel: true },
    tooltip: {
      trigger: 'item',
      borderColor: palette.border,
      backgroundColor: palette.surface,
      textStyle: { color: palette.text, fontFamily: 'Inter' },
      formatter: (params: unknown) => {
        const item = params as { seriesName?: string; data?: HeatmapDatum | MissingDatum };
        const datum = item.data;
        if (!datum) return '';
        if (item.seriesName === 'Sin dato') {
          const cell = missing[(datum as MissingDatum).cellIndex];
          return cell ? `<strong>${escapeCanvasHtml(cell.x)} · ${escapeCanvasHtml(cell.y)}</strong><br>Sin dato / no aplica` : '';
        }
        const cell = observed[(datum as HeatmapDatum).cellIndex];
        if (!cell) return '';
        const peers = props.analysis.observedCells.filter((peer) => peer.y === cell.y).length;
        const benchmark = cell.peerMedian === null || cell.peerMad === null
          ? 'Benchmark: sin variación suficiente'
          : `Benchmark: mediana ${formatCanvasMetric(cell.peerMedian, 'netDifference')}; MAD ${formatCanvasMetric(cell.peerMad, 'netDifference')}; n=${peers}`;
        return [
          `<strong>${escapeCanvasHtml(cell.x)} · ${escapeCanvasHtml(cell.y)}</strong>`,
          `${CANVAS_METRIC_LABELS[props.metric]}: <strong>${formatCanvasMetric(cell.metricValue, props.metric)}</strong>`,
          `Diferencia neta: ${formatCanvasMetric(cell.netDifference, 'netDifference')}`,
          props.analysis.axis.x === 'resultado' || props.analysis.axis.y === 'resultado'
            ? `Filas fuente en el rango: ${cell.observedCount}`
            : `Cobertura: ${cell.observedCount}/${cell.expectedCount}`,
          benchmark,
        ].filter(Boolean).join('<br>');
      },
    },
    xAxis: {
      type: 'category',
      name: CANVAS_DIMENSION_LABELS[props.analysis.axis.x],
      data: props.analysis.xValues,
      axisLabel: { color: palette.text, fontSize: 10, interval: 0, rotate: props.analysis.axis.x === 'resultado' ? 0 : props.analysis.xValues.some((value) => value.length > 12) ? 24 : 0, formatter: formatAxisLabel },
      axisLine: { lineStyle: { color: palette.border } },
      nameLocation: 'middle',
      nameGap: 54,
    },
    yAxis: {
      type: 'category',
      name: CANVAS_DIMENSION_LABELS[props.analysis.axis.y],
      data: props.analysis.yValues,
      axisLabel: { color: palette.text, fontSize: 10, formatter: formatAxisLabel },
      axisLine: { lineStyle: { color: palette.border } },
      nameLocation: 'middle',
      nameGap: 76,
    },
    visualMap: props.metric === 'netDifference'
      ? createCanvasSignedHeatmapVisualMap(colorValues, {
        loss: palette.orange,
        neutral: '#f8fafc',
        gain: palette.blue,
      })
      : {
      type: 'continuous',
      min: divergent ? Math.min(0, colorMin) : 0,
      max: divergent ? Math.max(0.0001, colorMax) : Math.max(0.0001, max),
      dimension: props.metric === 'netDifference' ? 3 : 2,
      orient: 'horizontal',
      left: 'center',
      bottom: 2,
      calculable: false,
      textStyle: { color: palette.muted, fontSize: 10 },
      inRange: {
        color: divergent
          ? [palette.orange, '#f8fafc', palette.blue]
          : [palette.orangeSoft, palette.orange],
      },
    },
    series: [
      {
        name: title.value,
        type: 'heatmap',
        data: heatmapData,
        label: {
          show: props.analysis.cells.length <= 42,
          fontSize: 9,
          color: palette.text,
          formatter: (params: unknown) => {
            const value = (params as { value?: [number, number, number, number] }).value?.[2];
            if (value === undefined) return '';
            return props.metric === 'lossShare'
              ? `${Math.round(value * 100)}%`
              : props.metric === 'peerDeviation'
                ? value.toFixed(1)
                : new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
          },
        },
        itemStyle: { borderColor: palette.surface, borderWidth: 2 },
        emphasis: { itemStyle: { borderColor: palette.text, borderWidth: 2 } },
      },
      {
        name: 'Sin dato',
        type: 'scatter',
        data: missingData,
        symbol: 'rect',
        symbolSize: [50, 22],
        itemStyle: { color: 'transparent', borderColor: palette.missing, borderWidth: 1.5 },
        label: { show: true, formatter: 'Sin dato', color: palette.muted, fontSize: 8 },
        tooltip: { show: true },
      },
    ],
  };
});

const render = async () => {
  await nextTick();
  if (!root.value) return;
  if (!chart) {
    chart = echarts.init(root.value, undefined, { renderer: 'canvas' });
    chart.on('click', (params: unknown) => {
      const datum = (params as { data?: { canvasKey?: string } }).data;
      if (datum?.canvasKey) emit('select', datum.canvasKey);
    });
  }
  chart.setOption(option.value, true);
};

watch(option, render, { deep: true });

onMounted(() => {
  render();
  if (root.value) {
    resizeObserver = new ResizeObserver(() => chart?.resize());
    resizeObserver.observe(root.value);
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  chart?.dispose();
  chart = null;
});
</script>

<template>
  <div
    class="relative w-full"
    :class="fillAvailable
      ? 'h-full min-h-0'
      : fullscreen ? 'h-[calc(100vh-18rem)] min-h-[30rem]' : 'min-h-[27rem] sm:min-h-[31rem] xl:min-h-[38rem]'"
  >
    <div v-if="metric === 'netDifference'" class="pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-3 rounded-lg border border-pic-border bg-pic-surface/95 px-3 py-2 text-[10px] font-black shadow-sm backdrop-blur">
      <span class="inline-flex items-center gap-1.5 text-pic-text-main"><span class="h-2.5 w-2.5 rounded-sm bg-[hsl(var(--pic-accent-orange))]"></span>Pérdida</span>
      <span class="inline-flex items-center gap-1.5 text-pic-text-main"><span class="h-2.5 w-2.5 rounded-sm bg-[hsl(var(--pic-accent-blue))]"></span>Ganancia</span>
    </div>
    <div ref="root" class="absolute inset-0" role="img" :aria-label="title"></div>
  </div>
</template>
