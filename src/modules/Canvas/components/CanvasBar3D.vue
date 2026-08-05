<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts';
import 'echarts-gl';
import type { CanvasAnalysisResult, CanvasMetric } from '../types/canvasTypes';
import { CANVAS_DIMENSION_LABELS, CANVAS_METRIC_LABELS } from '../types/canvasTypes';
import { canvasDivergingBarValue, canvasVisualColorValue } from '../utils/canvasAnalytics';
import { escapeCanvasHtml, formatCanvasMetric } from '../utils/canvasFormatters';
import { canvasSignedChartColor, readCanvasChartPalette } from '../utils/canvasWebgl';

interface Props {
  analysis: CanvasAnalysisResult;
  metric: CanvasMetric;
  selectedKey?: string | null;
  fullscreen?: boolean;
  fillAvailable?: boolean;
}

interface ChartDatum {
  value: [number, number, number, number];
  canvasKey: string;
  cellIndex: number;
  itemStyle?: { color?: string; borderColor?: string; borderWidth?: number; opacity: number };
}

interface TooltipParams {
  data?: ChartDatum;
}

const props = withDefaults(defineProps<Props>(), {
  selectedKey: null,
  fullscreen: false,
  fillAvailable: false,
});
const emit = defineEmits<{
  (event: 'select', key: string): void;
  (event: 'webgl-error'): void;
}>();

const root = ref<HTMLDivElement | null>(null);
let chart: echarts.ECharts | null = null;
let resizeObserver: ResizeObserver | null = null;

const title = computed(() => `${CANVAS_METRIC_LABELS[props.metric]} por ${CANVAS_DIMENSION_LABELS[props.analysis.axis.x]} y ${CANVAS_DIMENSION_LABELS[props.analysis.axis.y]}`);

const option = computed(() => {
  const palette = readCanvasChartPalette();
  const cells = props.analysis.observedCells.filter((cell) => cell.metricValue !== null);
  const values = cells.map((cell) => canvasDivergingBarValue(cell, props.metric) as number);
  const colorValues = cells.map((cell) => canvasVisualColorValue(cell, props.metric) as number);
  const minValue = values.length ? Math.min(...values) : 0;
  const maxValue = values.length ? Math.max(...values) : 0;
  const signed = props.metric === 'netDifference' || props.metric === 'peerDeviation';
  const divergent = props.metric === 'netDifference' || props.metric === 'peerDeviation';
  const colorMin = colorValues.length ? Math.min(...colorValues) : 0;
  const colorMax = colorValues.length ? Math.max(...colorValues) : 0;
  const paddedMin = signed ? Math.min(0, minValue) : 0;
  const paddedMax = Math.max(0, maxValue);
  const stableMax = paddedMax === paddedMin ? paddedMin + 1 : paddedMax;
  const stableColorMax = colorMax === colorMin ? colorMin + 1 : colorMax;
  const maxSignedMagnitude = Math.max(Math.abs(colorMin), Math.abs(colorMax), 1);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const data: ChartDatum[] = cells.map((cell, index) => ({
    value: [
      props.analysis.xValues.indexOf(cell.x),
      props.analysis.yValues.indexOf(cell.y),
      canvasDivergingBarValue(cell, props.metric) as number,
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
      borderColor: cell.key === props.selectedKey ? palette.brand : undefined,
      borderWidth: cell.key === props.selectedKey ? 3 : undefined,
      opacity: 1,
    },
  }));

  return {
    animation: !reducedMotion,
    tooltip: {
      trigger: 'item',
      borderColor: palette.border,
      backgroundColor: palette.surface,
      textStyle: { color: palette.text, fontFamily: 'Inter' },
      formatter: (params: TooltipParams) => {
        const datum = params.data;
        const cell = datum ? cells[datum.cellIndex] : undefined;
        if (!cell) return '';
        const coverage = `${cell.observedCount}/${cell.expectedCount} ${CANVAS_DIMENSION_LABELS[props.analysis.axis.filter].toLocaleLowerCase('es-MX')}`;
        const peers = props.analysis.observedCells.filter((peer) => peer.y === cell.y).length;
        const benchmark = cell.peerMedian === null || cell.peerMad === null
          ? 'Benchmark: sin variación suficiente'
          : `Benchmark: mediana ${formatCanvasMetric(cell.peerMedian, 'netDifference')}; MAD ${formatCanvasMetric(cell.peerMad, 'netDifference')}; n=${peers}`;
        return [
          `<strong>${escapeCanvasHtml(cell.x)} · ${escapeCanvasHtml(cell.y)}</strong>`,
          `${CANVAS_METRIC_LABELS[props.metric]}: <strong>${formatCanvasMetric(cell.metricValue, props.metric)}</strong>`,
          props.metric === 'netDifference'
            ? `Posición visual: ${formatCanvasMetric(canvasDivergingBarValue(cell, props.metric), 'netDifference')} · ${cell.netDifference! < 0 ? 'sobre cero' : 'bajo cero'}`
            : '',
          `Diferencia neta: ${formatCanvasMetric(cell.netDifference, 'netDifference')}`,
          `Cobertura observada: ${coverage}`,
          cell.peerDeviation === null ? 'Desviación: sin variación suficiente' : `Desviación: ${formatCanvasMetric(cell.peerDeviation, 'peerDeviation')}`,
          benchmark,
        ].filter(Boolean).join('<br>');
      },
    },
    visualMap: props.metric === 'netDifference' ? undefined : {
      show: true,
      dimension: props.metric === 'netDifference' ? 3 : 2,
      min: divergent ? Math.min(0, colorMin) : 0,
      max: divergent ? Math.max(0.0001, stableColorMax) : stableMax,
      calculable: false,
      orient: 'horizontal',
      left: 'center',
      bottom: 4,
      text: props.metric === 'netDifference'
        ? ['Ganancia', 'Pérdida']
        : signed ? ['Mayor', 'Menor'] : ['Más', 'Menos'],
      textStyle: { color: palette.muted, fontSize: 10, fontFamily: 'Inter' },
      inRange: {
        color: divergent
          ? [palette.orange, '#f8fafc', palette.blue]
          : [palette.orangeSoft, palette.orange],
      },
    },
    xAxis3D: {
      type: 'category',
      name: CANVAS_DIMENSION_LABELS[props.analysis.axis.x],
      data: props.analysis.xValues,
      axisLabel: { color: palette.text, fontSize: 10, interval: 0 },
      axisLine: { lineStyle: { color: palette.border } },
      nameTextStyle: { color: palette.text, fontWeight: 'bold' },
    },
    yAxis3D: {
      type: 'category',
      name: CANVAS_DIMENSION_LABELS[props.analysis.axis.y],
      data: props.analysis.yValues,
      axisLabel: { color: palette.text, fontSize: 10, interval: 0 },
      axisLine: { lineStyle: { color: palette.border } },
      nameTextStyle: { color: palette.text, fontWeight: 'bold' },
    },
    zAxis3D: {
      type: 'value',
      name: props.metric === 'lossShare'
        ? '%'
        : props.metric === 'peerDeviation'
          ? 'score'
          : props.metric === 'netDifference' ? 'kg: pérdida (+) / ganancia (−)' : 'kg',
      min: paddedMin,
      max: stableMax,
      axisLabel: {
        color: palette.muted,
        fontSize: 10,
        formatter: (value: number) => props.metric === 'lossShare'
          ? `${Math.round(value * 100)}%`
          : new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 }).format(value),
      },
      axisLine: { lineStyle: { color: palette.border } },
      splitLine: { lineStyle: { color: palette.border, opacity: 0.65 } },
      nameTextStyle: { color: palette.text, fontWeight: 'bold' },
    },
    grid3D: {
      boxWidth: Math.max(110, props.analysis.xValues.length * 22),
      boxDepth: Math.max(80, props.analysis.yValues.length * 18),
      boxHeight: 120,
      environment: palette.surface,
      light: {
        main: { intensity: 1.1, shadow: false },
        ambient: { intensity: 0.55 },
      },
      viewControl: {
        projection: 'perspective',
        alpha: 24,
        beta: -38,
        distance: 190,
        minDistance: 90,
        maxDistance: 320,
        autoRotate: false,
      },
      postEffect: { enable: false },
    },
    series: [{
      type: 'bar3D',
      name: title.value,
      data,
      shading: 'lambert',
      bevelSize: 0.15,
      bevelSmoothness: 2,
      itemStyle: { opacity: 0.94 },
      emphasis: { itemStyle: { opacity: 1 } },
    }],
  };
});

const render = async () => {
  await nextTick();
  if (!root.value) return;

  try {
    if (!chart) {
      chart = echarts.init(root.value, undefined, { renderer: 'canvas' });
      chart.on('click', (params: unknown) => {
        const datum = (params as { data?: ChartDatum }).data;
        if (datum?.canvasKey) emit('select', datum.canvasKey);
      });
    }
    chart.setOption(option.value as unknown as echarts.EChartsOption, true);
  } catch (error) {
    console.error('[CanvasBar3D.render]', error);
    emit('webgl-error');
  }
};

const resetCamera = () => {
  chart?.setOption({
    grid3D: {
      viewControl: { alpha: 24, beta: -38, distance: 190 },
    },
  } as unknown as echarts.EChartsOption);
};

defineExpose({ resetCamera });

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
      : fullscreen ? 'h-[calc(100vh-18rem)] min-h-[32rem]' : 'min-h-[30rem] sm:min-h-[34rem] xl:min-h-[40rem]'"
  >
    <div v-if="metric === 'netDifference'" class="pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-3 rounded-lg border border-pic-border bg-pic-surface/95 px-3 py-2 text-[10px] font-black shadow-sm backdrop-blur">
      <span class="inline-flex items-center gap-1.5 text-pic-text-main"><span class="h-2.5 w-2.5 rounded-sm bg-[hsl(var(--pic-accent-orange))]"></span>Pérdida</span>
      <span class="inline-flex items-center gap-1.5 text-pic-text-main"><span class="h-2.5 w-2.5 rounded-sm bg-[hsl(var(--pic-accent-blue))]"></span>Ganancia</span>
    </div>
    <div ref="root" class="absolute inset-0" role="img" :aria-label="title"></div>
  </div>
</template>
