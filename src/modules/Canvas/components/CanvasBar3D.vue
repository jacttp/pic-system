<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts';
import 'echarts-gl';
import type {
  CanvasAnalysisResult,
  CanvasBarMode,
  CanvasMetric,
  CanvasSignOrientation,
} from '../types/canvasTypes';
import { CANVAS_DIMENSION_LABELS, CANVAS_METRIC_LABELS } from '../types/canvasTypes';
import {
  buildCanvasBreakdownSeries,
  canvasDivergingBarValue,
  canvasVisualColorValue,
} from '../utils/canvasAnalytics';
import { escapeCanvasHtml, formatCanvasMetric } from '../utils/canvasFormatters';
import {
  CANVAS_3D_LIGHT,
  CANVAS_3D_POST_EFFECT,
  CANVAS_PARTICIPATION_MATERIAL,
  canvas3DBarSize,
  canvasBreakdownColor,
  canvasSignedChartColor,
  createCanvasOriginDeckSeries,
  createCanvasSelectionMarkerSeries,
  mixCanvasHexColor,
  readCanvasChartPalette,
} from '../utils/canvasWebgl';

interface Props {
  analysis: CanvasAnalysisResult;
  metric: CanvasMetric;
  selectedKey?: string | null;
  fullscreen?: boolean;
  fillAvailable?: boolean;
  mode?: CanvasBarMode;
  signOrientation?: CanvasSignOrientation;
  filterDomain?: string[];
}

interface ChartDatum {
  value: [number, number, number, number];
  canvasKey: string;
  cellIndex: number;
  filterValue?: string;
  rawDifference?: number;
  magnitudeShare?: number;
  sourceCount?: number;
  itemStyle?: { color?: string; opacity: number };
}

interface TooltipParams {
  data?: ChartDatum;
}

const props = withDefaults(defineProps<Props>(), {
  selectedKey: null,
  fullscreen: false,
  fillAvailable: false,
  mode: 'result',
  signOrientation: 'lossUp',
  filterDomain: () => [],
});
const emit = defineEmits<{
  (event: 'select', key: string): void;
  (event: 'webgl-error'): void;
}>();

const root = ref<HTMLDivElement | null>(null);
let chart: echarts.ECharts | null = null;
let resizeObserver: ResizeObserver | null = null;

const title = computed(() => `${CANVAS_METRIC_LABELS[props.metric]} por ${CANVAS_DIMENSION_LABELS[props.analysis.axis.x]} y ${CANVAS_DIMENSION_LABELS[props.analysis.axis.y]}`);
const formatAxisLabel = (value: string) => value.replace(' · ', '\n');
const participationActive = computed(() => props.mode === 'participation' && props.metric === 'netDifference');

const option = computed(() => {
  const palette = readCanvasChartPalette();
  const cells = props.analysis.observedCells.filter((cell) => cell.metricValue !== null);
  const breakdown = participationActive.value
    ? buildCanvasBreakdownSeries(props.analysis, props.signOrientation)
    : [];
  const aggregateValues = cells.map((cell) => canvasDivergingBarValue(
    cell,
    props.metric,
    props.signOrientation,
  ) as number);
  const stackedPositiveValues = props.analysis.cells.map((_, cellIndex) => breakdown.reduce(
    (total, series) => total + Math.max(0, series.segments[cellIndex]?.visualValue || 0),
    0,
  ));
  const stackedNegativeValues = props.analysis.cells.map((_, cellIndex) => breakdown.reduce(
    (total, series) => total + Math.min(0, series.segments[cellIndex]?.visualValue || 0),
    0,
  ));
  const values = participationActive.value
    ? [...stackedPositiveValues, ...stackedNegativeValues]
    : aggregateValues;
  const colorValues = cells.map((cell) => canvasVisualColorValue(cell, props.metric) as number);
  const minValue = values.length ? Math.min(...values) : 0;
  const maxValue = values.length ? Math.max(...values) : 0;
  const signed = props.metric === 'netDifference' || props.metric === 'peerDeviation';
  const divergent = props.metric === 'netDifference' || props.metric === 'peerDeviation';
  const colorMin = colorValues.length ? Math.min(...colorValues) : 0;
  const colorMax = colorValues.length ? Math.max(...colorValues) : 0;
  const rawPaddedMin = signed ? Math.min(0, minValue) : 0;
  const paddedMax = Math.max(0, maxValue);
  const originDeckThickness = signed
    ? Math.max(1, paddedMax - rawPaddedMin) * 0.0035
    : 0;
  const paddedMin = signed
    ? Math.min(rawPaddedMin, -originDeckThickness)
    : rawPaddedMin;
  const stableMax = paddedMax === rawPaddedMin ? rawPaddedMin + 1 : paddedMax;
  const stableColorMax = colorMax === colorMin ? colorMin + 1 : colorMax;
  const maxSignedMagnitude = Math.max(Math.abs(colorMin), Math.abs(colorMax), 1);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const boxWidth = Math.max(110, props.analysis.xValues.length * 22);
  const boxDepth = Math.max(80, props.analysis.yValues.length * 18);
  const axisLineColor = mixCanvasHexColor(palette.border, palette.muted, 0.62);
  const gridLineColor = mixCanvasHexColor(palette.border, palette.muted, 0.34);
  const categoryAxisLabelStyle = {
    color: palette.text,
    fontSize: 12,
    fontWeight: 700,
  } as const;
  const axisNameStyle = {
    color: palette.text,
    fontSize: 16,
    fontWeight: 800,
  } as const;
  const axisReferenceStyle = {
    axisLine: { lineStyle: { color: axisLineColor, width: 1.4, opacity: 0.95 } },
    axisTick: { lineStyle: { color: axisLineColor, width: 1.2 } },
    splitLine: { lineStyle: { color: gridLineColor, width: 1, opacity: 0.78 } },
  } as const;
  const barSize = canvas3DBarSize(
    boxWidth,
    boxDepth,
    props.analysis.xValues.length,
    props.analysis.yValues.length,
  );

  const data: ChartDatum[] = cells.map((cell, index) => {
    const baseColor = props.metric === 'netDifference'
      ? canvasSignedChartColor(cell.netDifference || 0, maxSignedMagnitude, {
          lossSoft: palette.orangeSoft,
          loss: palette.orange,
          gainSoft: palette.blueSoft,
          gain: palette.blue,
          neutral: palette.missing,
        })
      : undefined;
    return {
      value: [
        props.analysis.xValues.indexOf(cell.x),
        props.analysis.yValues.indexOf(cell.y),
        canvasDivergingBarValue(cell, props.metric, props.signOrientation) as number,
        canvasVisualColorValue(cell, props.metric) as number,
      ],
      canvasKey: cell.key,
      cellIndex: index,
      itemStyle: {
        color: baseColor && cell.key === props.selectedKey
          ? mixCanvasHexColor(baseColor, palette.text, 0.4)
          : baseColor,
        opacity: 1,
      },
    };
  });

  const resultSeries = [{
    type: 'bar3D',
    name: title.value,
    data,
    shading: 'lambert',
    barSize,
    bevelSize: 0,
    bevelSmoothness: 0,
    itemStyle: { opacity: 1 },
    emphasis: { itemStyle: { opacity: 1 } },
  }];

  const participationSeries = breakdown.map((breakdownSeries) => ({
    type: 'bar3D',
    name: breakdownSeries.filterValue,
    stack: 'canvas-filter-participation',
    stackStrategy: 'samesign',
    barSize,
    data: breakdownSeries.segments.map<ChartDatum>((segment, cellIndex) => {
      const segmentColor = canvasBreakdownColor(segment.filterValue, props.filterDomain);
      return {
        value: [
          props.analysis.xValues.indexOf(segment.x),
          props.analysis.yValues.indexOf(segment.y),
          segment.visualValue,
          segment.rawDifference,
        ],
        canvasKey: segment.cellKey,
        cellIndex,
        filterValue: segment.filterValue,
        rawDifference: segment.rawDifference,
        magnitudeShare: segment.magnitudeShare,
        sourceCount: segment.sourceRows.length,
        itemStyle: {
          color: segment.cellKey === props.selectedKey
            ? mixCanvasHexColor(segmentColor, palette.text, 0.4)
            : segmentColor,
          opacity: segment.visualValue === 0 ? 0 : 1,
        },
      };
    }),
    ...CANVAS_PARTICIPATION_MATERIAL,
  }));

  const selectedCellIndex = props.analysis.cells.findIndex((cell) => cell.key === props.selectedKey);
  const selectedCell = selectedCellIndex >= 0 ? props.analysis.cells[selectedCellIndex] : undefined;
  const selectedEndpoint = selectedCell && selectedCell.metricValue !== null
    ? participationActive.value
      ? Math.abs(stackedPositiveValues[selectedCellIndex] || 0) >= Math.abs(stackedNegativeValues[selectedCellIndex] || 0)
        ? stackedPositiveValues[selectedCellIndex] || 0
        : stackedNegativeValues[selectedCellIndex] || 0
      : canvasDivergingBarValue(selectedCell, props.metric, props.signOrientation) as number
    : null;
  const selectionMarkerSeries = selectedCell && selectedEndpoint !== null
    ? [createCanvasSelectionMarkerSeries({
      xIndex: props.analysis.xValues.indexOf(selectedCell.x),
      yIndex: props.analysis.yValues.indexOf(selectedCell.y),
      value: selectedEndpoint,
      color: palette.brand,
      surfaceColor: palette.surface,
      textColor: palette.text,
    })]
    : [];

  return {
    animation: !reducedMotion,
    tooltip: {
      trigger: 'item',
      borderColor: palette.border,
      backgroundColor: palette.surface,
      textStyle: { color: palette.text, fontFamily: 'Inter' },
      formatter: (params: TooltipParams) => {
        const datum = params.data;
        const cell = datum
          ? participationActive.value
            ? props.analysis.cells[datum.cellIndex]
            : cells[datum.cellIndex]
          : undefined;
        if (!cell) return '';
        if (participationActive.value && datum?.filterValue && datum.rawDifference !== undefined) {
          const direction = datum.rawDifference < 0
            ? 'Pérdida'
            : datum.rawDifference > 0 ? 'Ganancia' : 'Sin movimiento';
          const share = new Intl.NumberFormat('es-MX', {
            style: 'percent',
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          }).format(datum.magnitudeShare || 0);
          return [
            `<strong>${escapeCanvasHtml(cell.x)} · ${escapeCanvasHtml(cell.y)}</strong>`,
            `${CANVAS_DIMENSION_LABELS[props.analysis.axis.filter]}: <strong>${escapeCanvasHtml(datum.filterValue)}</strong>`,
            `Aporte: <strong>${formatCanvasMetric(datum.rawDifference, 'netDifference')}</strong> · ${direction}`,
            `Participación en magnitud: ${share}`,
            `Total neto de la barra: ${formatCanvasMetric(cell.netDifference, 'netDifference')}`,
            `Filas fuente del segmento: ${datum.sourceCount || 0}`,
          ].join('<br>');
        }
        const hasResultAxis = props.analysis.axis.x === 'resultado' || props.analysis.axis.y === 'resultado';
        const coverage = hasResultAxis
          ? `Filas fuente en el rango: ${cell.observedCount}`
          : `Cobertura observada: ${cell.observedCount}/${cell.expectedCount} ${CANVAS_DIMENSION_LABELS[props.analysis.axis.filter].toLocaleLowerCase('es-MX')}`;
        const peers = props.analysis.observedCells.filter((peer) => peer.y === cell.y).length;
        const benchmark = cell.peerMedian === null || cell.peerMad === null
          ? 'Benchmark: sin variación suficiente'
          : `Benchmark: mediana ${formatCanvasMetric(cell.peerMedian, 'netDifference')}; MAD ${formatCanvasMetric(cell.peerMad, 'netDifference')}; n=${peers}`;
        const visualValue = canvasDivergingBarValue(cell, props.metric, props.signOrientation) as number;
        return [
          `<strong>${escapeCanvasHtml(cell.x)} · ${escapeCanvasHtml(cell.y)}</strong>`,
          `${CANVAS_METRIC_LABELS[props.metric]}: <strong>${formatCanvasMetric(cell.metricValue, props.metric)}</strong>`,
          props.metric === 'netDifference'
            ? `Posición visual: ${formatCanvasMetric(visualValue, 'netDifference')} · ${visualValue >= 0 ? 'sobre cero' : 'bajo cero'}`
            : '',
          `Diferencia neta: ${formatCanvasMetric(cell.netDifference, 'netDifference')}`,
          coverage,
          cell.peerDeviation === null ? 'Desviación: sin variación suficiente' : `Desviación: ${formatCanvasMetric(cell.peerDeviation, 'peerDeviation')}`,
          benchmark,
        ].filter(Boolean).join('<br>');
      },
    },
    visualMap: props.metric === 'netDifference' ? undefined : {
      show: true,
      dimension: props.metric === 'netDifference' ? 3 : 2,
      seriesIndex: signed ? [1] : [0],
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
      axisLabel: { ...categoryAxisLabelStyle, interval: 0, formatter: formatAxisLabel },
      nameTextStyle: axisNameStyle,
      ...axisReferenceStyle,
    },
    yAxis3D: {
      type: 'category',
      name: CANVAS_DIMENSION_LABELS[props.analysis.axis.y],
      data: props.analysis.yValues,
      axisLabel: { ...categoryAxisLabelStyle, interval: 0, formatter: formatAxisLabel },
      nameTextStyle: axisNameStyle,
      ...axisReferenceStyle,
    },
    zAxis3D: {
      type: 'value',
      name: props.metric === 'lossShare'
        ? '%'
        : props.metric === 'peerDeviation'
          ? 'score'
          : props.metric === 'netDifference'
            ? props.signOrientation === 'lossUp'
              ? 'kg: pérdida (+) / ganancia (−)'
              : 'kg: ganancia (+) / pérdida (−)'
            : 'kg',
      min: paddedMin,
      max: stableMax,
      axisLabel: {
        ...categoryAxisLabelStyle,
        formatter: (value: number) => props.metric === 'lossShare'
          ? `${Math.round(value * 100)}%`
          : new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 }).format(value),
      },
      nameTextStyle: axisNameStyle,
      ...axisReferenceStyle,
    },
    grid3D: {
      boxWidth,
      boxDepth,
      boxHeight: 120,
      environment: palette.surface,
      light: CANVAS_3D_LIGHT,
      viewControl: {
        projection: 'perspective',
        alpha: 24,
        beta: -38,
        distance: 190,
        minDistance: 90,
        maxDistance: 320,
        autoRotate: false,
      },
      postEffect: CANVAS_3D_POST_EFFECT,
      temporalSuperSampling: { enable: 'auto' },
    },
    series: [
      ...(signed ? [createCanvasOriginDeckSeries({
        xCount: props.analysis.xValues.length,
        yCount: props.analysis.yValues.length,
        boxWidth,
        boxDepth,
        thickness: originDeckThickness,
        color: mixCanvasHexColor(palette.surface, palette.border, 0.72),
      })] : []),
      ...(participationActive.value ? participationSeries : resultSeries),
      ...selectionMarkerSeries,
    ],
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
    <div v-if="metric === 'netDifference' && !participationActive" class="pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-3 rounded-lg border border-pic-border bg-pic-surface/95 px-3 py-2 text-[10px] font-black shadow-sm backdrop-blur">
      <span class="inline-flex items-center gap-1.5 text-pic-text-main"><span class="h-2.5 w-2.5 rounded-sm bg-[hsl(var(--pic-accent-orange))]"></span>Pérdida</span>
      <span class="inline-flex items-center gap-1.5 text-pic-text-main"><span class="h-2.5 w-2.5 rounded-sm bg-[hsl(var(--pic-accent-blue))]"></span>Ganancia</span>
    </div>
    <div v-else-if="participationActive" class="pointer-events-none absolute right-2 top-2 z-10 max-w-[65%] rounded-lg border border-pic-border bg-pic-surface/95 px-3 py-2 shadow-sm backdrop-blur">
      <p class="mb-1.5 text-right text-[8px] font-black uppercase tracking-wide text-pic-text-muted">Participación por {{ CANVAS_DIMENSION_LABELS[analysis.axis.filter] }}</p>
      <div class="flex flex-wrap justify-end gap-x-2.5 gap-y-1">
        <span v-for="value in analysis.filterValues" :key="value" class="inline-flex items-center gap-1 text-[9px] font-black text-pic-text-main">
          <span class="h-2.5 w-2.5 rounded-sm" :style="{ backgroundColor: canvasBreakdownColor(value, filterDomain) }"></span>
          {{ value }}
        </span>
      </div>
      <p class="mt-1.5 text-right text-[8px] font-bold text-pic-text-muted">
        {{ signOrientation === 'lossUp' ? 'Pérdida sobre cero · ganancia bajo cero' : 'Ganancia sobre cero · pérdida bajo cero' }}
      </p>
    </div>
    <div ref="root" class="absolute inset-0" role="img" :aria-label="title"></div>
  </div>
</template>
