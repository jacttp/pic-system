<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
} from 'vue';
import * as echarts from 'echarts';
import type { Pic52Report } from '../types/pic52';
import { calculateComparison, type Pic52Metric } from '../utils/pic52Report';

interface Props {
  report: Pic52Report;
}

interface PinnedYearDetail {
  year: number;
  kg: string;
  pesos: string;
}

const props = defineProps<Props>();

const kgChartRef = ref<HTMLDivElement | null>(null);
const pesosChartRef = ref<HTMLDivElement | null>(null);
const kgChart = shallowRef<echarts.ECharts | null>(null);
const pesosChart = shallowRef<echarts.ECharts | null>(null);
const pinnedWeek = ref<number | null>(null);
const brushedRange = ref<[number, number] | null>(null);
const brushActive = ref(false);
const chartGroupId = `pic52-linked-${Math.random().toString(36).slice(2)}`;
let resizeObserver: ResizeObserver | null = null;
let syncingBrush = false;

const years = computed(() => [...props.report.years].sort((left, right) => right - left));
const weeks = computed(() => [...props.report.weeks].sort((left, right) => left - right));
const weekLabels = computed(() => weeks.value.map(week => `SEM-${week}`));

const numberFormatter = new Intl.NumberFormat('es-MX', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const compactFormatter = new Intl.NumberFormat('es-MX', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const percentageFormatter = new Intl.NumberFormat('es-MX', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const token = (name: string, fallback: string) => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value ? `hsl(${value})` : fallback;
};

const metricValue = (
  year: number,
  week: number,
  metric: Pic52Metric,
): number | null => {
  const point = props.report.series
    .find(series => series.year === year)
    ?.points.find(item => item.week === week);
  if (!point || point.dataState !== 'observed') return null;
  const value = point[metric];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const formatMetric = (value: number | null, metric: Pic52Metric) => {
  if (value === null) return '—';
  const formatted = numberFormatter.format(value);
  return metric === 'kg' ? `${formatted} kg` : `$${formatted}`;
};

const formatSignedMetric = (value: number | null, metric: Pic52Metric) => {
  if (value === null) return '—';
  const absolute = formatMetric(Math.abs(value), metric);
  return value > 0 ? `+${absolute}` : value < 0 ? `−${absolute}` : absolute;
};

const formatPercentage = (value: number | null) => {
  if (value === null) return '—';
  const absolute = percentageFormatter.format(Math.abs(value));
  return value > 0 ? `+${absolute}%` : value < 0 ? `−${absolute}%` : `${absolute}%`;
};

const currentIsoWeek = () => {
  const now = new Date();
  const utcDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const showCurrentWeek = computed(() => (
  years.value.includes(new Date().getFullYear())
  && weeks.value.includes(currentIsoWeek())
));

const pinnedSummary = computed<{
  week: number;
  years: PinnedYearDetail[];
  kgComparison: string;
  pesosComparison: string;
} | null>(() => {
  if (pinnedWeek.value === null) return null;
  const referenceYear = years.value[0];
  const previousYear = years.value[1];

  const details = years.value.map(year => ({
    year,
    kg: formatMetric(metricValue(year, pinnedWeek.value!, 'kg'), 'kg'),
    pesos: formatMetric(metricValue(year, pinnedWeek.value!, 'pesos'), 'pesos'),
  }));

  const comparisonLabel = (metric: Pic52Metric) => {
    if (referenceYear === undefined || previousYear === undefined) return 'Sin año comparable';
    const comparison = calculateComparison(
      metricValue(referenceYear, pinnedWeek.value!, metric),
      metricValue(previousYear, pinnedWeek.value!, metric),
    );
    return `${formatSignedMetric(comparison.difference, metric)} · ${formatPercentage(comparison.percentage)}`;
  };

  return {
    week: pinnedWeek.value,
    years: details,
    kgComparison: comparisonLabel('kg'),
    pesosComparison: comparisonLabel('pesos'),
  };
});

const brushedRangeLabel = computed(() => (
  brushedRange.value
    ? `SEM-${brushedRange.value[0]} → SEM-${brushedRange.value[1]}`
    : 'Sin rango seleccionado'
));

const seriesColors = () => [
  token('--pic-chart-1', '#d3121e'),
  token('--pic-chart-3', '#2563eb'),
  token('--pic-chart-2', '#0f766e'),
  token('--pic-chart-4', '#d97706'),
  token('--pic-chart-5', '#64748b'),
];

const markerData = () => {
  const markers: Array<Record<string, unknown>> = [];
  if (showCurrentWeek.value) {
    markers.push({
      name: 'Semana actual',
      xAxis: `SEM-${currentIsoWeek()}`,
      lineStyle: { type: 'dashed', color: token('--pic-warning', '#d97706'), width: 1.5 },
      label: {
        show: true,
        formatter: 'Semana actual',
        color: token('--pic-warning', '#d97706'),
        fontSize: 9,
        fontWeight: 700,
      },
    });
  }
  if (pinnedWeek.value !== null) {
    markers.push({
      name: 'Semana fijada',
      xAxis: `SEM-${pinnedWeek.value}`,
      lineStyle: { type: 'solid', color: token('--pic-text-main', '#172033'), width: 1.5 },
      label: {
        show: true,
        formatter: `SEM-${pinnedWeek.value}`,
        color: token('--pic-text-main', '#172033'),
        fontSize: 9,
        fontWeight: 800,
      },
    });
  }
  return markers;
};

const tooltipFormatter = (metric: Pic52Metric) => (rawParams: unknown) => {
  const params = Array.isArray(rawParams) ? rawParams as Array<Record<string, unknown>> : [];
  const axisValue = String(params[0]?.axisValue ?? '');
  const week = Number(axisValue.replace('SEM-', ''));
  if (!Number.isInteger(week)) return '';

  const colors = seriesColors();
  const yearRows = years.value.map((year, index) => {
    const value = metricValue(year, week, metric);
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:24px;margin-top:6px">
        <span style="display:flex;align-items:center;gap:7px;color:#64748b">
          <span style="width:8px;height:8px;border-radius:3px;background:${colors[index % colors.length]}"></span>
          ${year}
        </span>
        <strong style="color:#172033;font-variant-numeric:tabular-nums">${formatMetric(value, metric)}</strong>
      </div>`;
  }).join('');

  const referenceYear = years.value[0];
  const previousYear = years.value[1];
  const comparison = referenceYear !== undefined && previousYear !== undefined
    ? calculateComparison(
      metricValue(referenceYear, week, metric),
      metricValue(previousYear, week, metric),
    )
    : { difference: null, percentage: null };

  return `
    <div style="min-width:210px;font-family:inherit">
      <div style="font-size:11px;font-weight:800;color:#172033">SEM-${week} · ${metric === 'kg' ? 'Kilogramos' : 'Pesos'}</div>
      ${yearRows}
      <div style="height:1px;background:#e2e8f0;margin:9px 0 7px"></div>
      <div style="display:flex;justify-content:space-between;gap:18px;font-size:10px;color:#64748b">
        <span>Diferencia</span>
        <strong style="color:#172033">${formatSignedMetric(comparison.difference, metric)}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;gap:18px;margin-top:4px;font-size:10px;color:#64748b">
        <span>Variación</span>
        <strong style="color:#172033">${formatPercentage(comparison.percentage)}</strong>
      </div>
      <div style="margin-top:8px;font-size:9px;color:#94a3b8">Clic para fijar esta semana</div>
    </div>`;
};

const buildOption = (metric: Pic52Metric): echarts.EChartsOption => {
  const colors = seriesColors();
  const textColor = token('--pic-text-muted', '#64748b');
  const borderColor = token('--pic-border', '#e2e8f0');
  const referenceYear = years.value[0];

  return {
    animationDuration: 450,
    animationEasing: 'cubicOut',
    color: colors,
    aria: {
      enabled: true,
      decal: { show: false },
      label: {
        description: `Comparativo semanal de ${metric === 'kg' ? 'kilogramos' : 'pesos'} para ${years.value.join(', ')}.`,
      },
    },
    toolbox: {
      show: true,
      top: 4,
      right: 12,
      itemSize: 14,
      itemGap: 10,
      iconStyle: { borderColor: textColor },
      emphasis: { iconStyle: { borderColor: token('--pic-brand', '#d3121e') } },
      feature: {
        dataZoom: {
          yAxisIndex: 'none',
          title: { zoom: 'Acercar', back: 'Deshacer zoom' },
        },
        brush: {
          type: ['lineX', 'clear'],
          title: { lineX: 'Seleccionar semanas', clear: 'Limpiar selección' },
        },
        dataView: {
          readOnly: true,
          title: 'Ver datos',
          lang: ['Datos', 'Cerrar', 'Actualizar'],
        },
        magicType: {
          type: ['line', 'bar'],
          title: { line: 'Líneas', bar: 'Barras' },
        },
        restore: { title: 'Restaurar' },
        saveAsImage: {
          title: 'Descargar PNG',
          name: `PIC52-${metric}-${years.value.join('-')}`,
          pixelRatio: 2,
          backgroundColor: token('--pic-surface', '#ffffff'),
        },
      },
    },
    legend: {
      top: 38,
      left: 'center',
      selectedMode: true,
      itemWidth: 18,
      itemHeight: 7,
      itemGap: 22,
      icon: 'roundRect',
      textStyle: { color: textColor, fontSize: 11, fontWeight: 700 },
      data: years.value.map(String),
    },
    tooltip: {
      trigger: 'axis',
      confine: true,
      appendToBody: false,
      axisPointer: {
        type: 'cross',
        snap: true,
        lineStyle: { color: token('--pic-brand', '#d3121e'), width: 1 },
        crossStyle: { color: textColor },
        label: {
          color: token('--pic-surface', '#ffffff'),
          backgroundColor: token('--pic-text-main', '#172033'),
          fontSize: 9,
        },
      },
      borderColor,
      borderWidth: 1,
      backgroundColor: 'rgba(255,255,255,0.98)',
      padding: [10, 12],
      extraCssText: 'box-shadow:0 12px 30px rgba(15,23,42,.14);border-radius:10px;',
      formatter: tooltipFormatter(metric),
    },
    axisPointer: {
      link: [{ xAxisIndex: 'all' }],
    },
    grid: {
      top: 78,
      left: 20,
      right: 26,
      bottom: 76,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: weekLabels.value,
      triggerEvent: true,
      axisLine: { lineStyle: { color: borderColor } },
      axisTick: { show: false },
      axisLabel: {
        color: textColor,
        fontSize: 9,
        rotate: weeks.value.length > 30 ? 45 : 0,
        interval: weeks.value.length > 30 ? 3 : 0,
        margin: 12,
      },
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: textColor,
        fontSize: 9,
        formatter: (value: number) => (
          metric === 'kg'
            ? compactFormatter.format(value)
            : `$${compactFormatter.format(value)}`
        ),
      },
      splitLine: { lineStyle: { color: borderColor, type: 'dashed', opacity: 0.8 } },
    },
    dataZoom: [
      {
        id: 'pic52-inside-zoom',
        type: 'inside',
        xAxisIndex: 0,
        filterMode: 'none',
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
        moveOnMouseWheel: false,
        preventDefaultMouseMove: true,
        start: 0,
        end: 100,
      },
      {
        id: 'pic52-slider-zoom',
        type: 'slider',
        xAxisIndex: 0,
        filterMode: 'none',
        bottom: 16,
        height: 18,
        borderColor,
        backgroundColor: token('--pic-muted-surface', '#f1f5f9'),
        fillerColor: token('--pic-brand-border', '#fecdd3'),
        handleStyle: {
          color: token('--pic-surface', '#ffffff'),
          borderColor: token('--pic-brand', '#d3121e'),
        },
        moveHandleStyle: { color: token('--pic-brand', '#d3121e') },
        textStyle: { color: textColor, fontSize: 9 },
        brushSelect: true,
        showDetail: false,
        start: 0,
        end: 100,
      },
    ],
    brush: {
      xAxisIndex: 'all',
      brushMode: 'single',
      transformable: true,
      throttleType: 'debounce',
      throttleDelay: 120,
      inBrush: { opacity: 1 },
      outOfBrush: { opacity: 0.28 },
    },
    series: years.value.map((year, index) => ({
      id: `pic52-${metric}-${year}`,
      name: String(year),
      type: 'line',
      smooth: 0.28,
      connectNulls: false,
      showSymbol: true,
      symbol: 'circle',
      symbolSize: 4,
      emphasis: {
        focus: 'series',
        scale: 1.8,
        lineStyle: { width: 3 },
      },
      lineStyle: {
        width: year === referenceYear ? 2.8 : 2.2,
        color: colors[index % colors.length],
      },
      itemStyle: {
        color: colors[index % colors.length],
        borderColor: token('--pic-surface', '#ffffff'),
        borderWidth: 1,
      },
      areaStyle: {
        color: colors[index % colors.length],
        opacity: year === referenceYear ? 0.09 : 0.045,
      },
      data: weeks.value.map(week => metricValue(year, week, metric)),
      markLine: index === 0 ? {
        silent: true,
        symbol: ['none', 'none'],
        animation: false,
        data: markerData(),
      } : undefined,
    })),
  };
};

const updateMarkers = () => {
  const partialSeries = (metric: Pic52Metric) => years.value.map((year, index) => ({
    id: `pic52-${metric}-${year}`,
    markLine: index === 0 ? {
      silent: true,
      symbol: ['none', 'none'],
      animation: false,
      data: markerData(),
    } : undefined,
  }));

  kgChart.value?.setOption({ series: partialSeries('kg') } as echarts.EChartsOption);
  pesosChart.value?.setOption({ series: partialSeries('pesos') } as echarts.EChartsOption);
};

const revealPinnedWeek = () => {
  if (pinnedWeek.value === null) return;
  const dataIndex = weeks.value.indexOf(pinnedWeek.value);
  if (dataIndex < 0) return;

  [kgChart.value, pesosChart.value].forEach(chart => {
    chart?.dispatchAction({ type: 'downplay', seriesIndex: 'all' });
    chart?.dispatchAction({ type: 'highlight', seriesIndex: 'all', dataIndex });
    chart?.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex });
  });
};

const setPinnedWeek = (week: number) => {
  if (!weeks.value.includes(week)) return;
  pinnedWeek.value = week;
  nextTick(revealPinnedWeek);
};

const parseWeek = (value: unknown) => {
  const parsed = Number(String(value ?? '').replace('SEM-', ''));
  return Number.isInteger(parsed) ? parsed : null;
};

const handleChartClick = (params: Record<string, unknown>) => {
  if (typeof params.dataIndex === 'number') {
    const week = weeks.value[params.dataIndex];
    if (week !== undefined) setPinnedWeek(week);
    return;
  }
  const week = parseWeek(params.value ?? params.name);
  if (week !== null) setPinnedWeek(week);
};

const normalizeBrushBoundary = (value: unknown) => {
  if (typeof value === 'string') {
    const parsed = parseWeek(value);
    if (parsed !== null && weeks.value.includes(parsed)) return parsed;
  }
  const index = Number(value);
  return Number.isInteger(index) ? weeks.value[index] ?? null : null;
};

const syncBrush = (
  source: echarts.ECharts,
  target: echarts.ECharts | null,
  event: Record<string, unknown>,
) => {
  if (syncingBrush) return;
  const batch = Array.isArray(event.batch) ? event.batch as Array<Record<string, unknown>> : [];
  const areas = Array.isArray(batch[0]?.areas) ? batch[0].areas as Array<Record<string, unknown>> : [];
  const selected = Array.isArray(batch[0]?.selected)
    ? batch[0].selected as Array<Record<string, unknown>>
    : [];
  const selectedIndexes = selected
    .flatMap(item => Array.isArray(item.dataIndex) ? item.dataIndex : [])
    .map(Number)
    .filter(Number.isInteger);
  const coordRange = Array.isArray(areas[0]?.coordRange) ? areas[0].coordRange : [];
  const start = selectedIndexes.length
    ? weeks.value[Math.min(...selectedIndexes)] ?? null
    : normalizeBrushBoundary(coordRange[0]);
  const end = selectedIndexes.length
    ? weeks.value[Math.max(...selectedIndexes)] ?? null
    : normalizeBrushBoundary(coordRange[1]);
  brushedRange.value = start !== null && end !== null
    ? [Math.min(start, end), Math.max(start, end)]
    : null;

  if (areas.length > 0 && brushActive.value) {
    brushActive.value = false;
    [kgChart.value, pesosChart.value].forEach(chart => {
      chart?.dispatchAction({
        type: 'takeGlobalCursor',
        key: 'brush',
        brushOption: { brushType: false },
      });
    });
  }

  if (!target || source === target) return;
  syncingBrush = true;
  target.dispatchAction({ type: 'brush', areas });
  queueMicrotask(() => {
    syncingBrush = false;
  });
};

const registerChartEvents = (
  chart: echarts.ECharts,
  otherChart: () => echarts.ECharts | null,
) => {
  chart.on('click', (params) => handleChartClick(params as unknown as Record<string, unknown>));
  chart.on('brushSelected', (event) => {
    syncBrush(chart, otherChart(), event as unknown as Record<string, unknown>);
  });
};

const initCharts = () => {
  if (!kgChartRef.value || !pesosChartRef.value) return;

  kgChart.value?.dispose();
  pesosChart.value?.dispose();
  echarts.disconnect(chartGroupId);

  kgChart.value = echarts.init(kgChartRef.value, null, { renderer: 'canvas' });
  pesosChart.value = echarts.init(pesosChartRef.value, null, { renderer: 'canvas' });
  kgChart.value.group = chartGroupId;
  pesosChart.value.group = chartGroupId;

  kgChart.value.setOption(buildOption('kg'), { notMerge: true });
  pesosChart.value.setOption(buildOption('pesos'), { notMerge: true });
  registerChartEvents(kgChart.value, () => pesosChart.value);
  registerChartEvents(pesosChart.value, () => kgChart.value);
  echarts.connect(chartGroupId);
};

const resetView = () => {
  brushedRange.value = null;
  pinnedWeek.value = null;
  brushActive.value = false;
  [kgChart.value, pesosChart.value].forEach(chart => {
    chart?.dispatchAction({ type: 'restore' });
    chart?.dispatchAction({ type: 'brush', areas: [] });
    chart?.dispatchAction({ type: 'hideTip' });
  });
};

const toggleBrush = () => {
  brushActive.value = !brushActive.value;
  [kgChart.value, pesosChart.value].forEach(chart => {
    chart?.dispatchAction({
      type: 'takeGlobalCursor',
      key: 'brush',
      brushOption: {
        brushType: brushActive.value ? 'lineX' : false,
        brushMode: 'single',
      },
    });
  });
};

const movePinnedWeek = (direction: -1 | 1) => {
  const currentIndex = pinnedWeek.value === null
    ? (direction > 0 ? -1 : weeks.value.length)
    : weeks.value.indexOf(pinnedWeek.value);
  const nextIndex = Math.min(
    Math.max(currentIndex + direction, 0),
    Math.max(weeks.value.length - 1, 0),
  );
  const week = weeks.value[nextIndex];
  if (week !== undefined) setPinnedWeek(week);
};

const handleKeyboard = (event: KeyboardEvent) => {
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    movePinnedWeek(-1);
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    movePinnedWeek(1);
  }
  if (event.key === 'Escape') {
    event.preventDefault();
    resetView();
  }
};

onMounted(() => {
  initCharts();
  resizeObserver = new ResizeObserver(() => {
    kgChart.value?.resize();
    pesosChart.value?.resize();
  });
  if (kgChartRef.value) resizeObserver.observe(kgChartRef.value);
  if (pesosChartRef.value) resizeObserver.observe(pesosChartRef.value);
});

watch(() => props.report, async () => {
  pinnedWeek.value = null;
  brushedRange.value = null;
  brushActive.value = false;
  await nextTick();
  initCharts();
}, { deep: false });

watch(pinnedWeek, () => {
  updateMarkers();
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  echarts.disconnect(chartGroupId);
  kgChart.value?.dispose();
  pesosChart.value?.dispose();
  kgChart.value = null;
  pesosChart.value = null;
});
</script>

<template>
  <section
    id="pic52-charts"
    class="space-y-4"
    aria-labelledby="pic52-charts-title"
  >
    <div class="overflow-hidden rounded-xl border border-pic-brand-border bg-pic-surface shadow-sm">
      <div class="flex flex-col gap-3 bg-pic-brand-soft px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex min-w-0 items-center gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-pic-brand text-white shadow-sm">
            <i class="fa-solid fa-wave-square"></i>
          </span>
          <div class="min-w-0">
            <p class="text-[9px] font-black uppercase tracking-[0.18em] text-pic-brand">
              Exploración sincronizada
            </p>
            <h2 id="pic52-charts-title" class="mt-0.5 text-sm font-black text-pic-text-main">
              {{ report.transaction.label }} · {{ report.years.join(' · ') }}
            </h2>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[10px] font-black transition focus:outline-none focus:ring-2 focus:ring-pic-brand-border"
            :class="brushActive
              ? 'border-pic-brand bg-pic-brand text-white'
              : 'border-pic-brand-border bg-pic-surface text-pic-brand hover:bg-pic-brand hover:text-white'"
            :aria-pressed="brushActive"
            @click="toggleBrush"
          >
            <i class="fa-solid fa-paintbrush"></i>
            {{ brushActive ? 'Arrastra en la gráfica' : 'Seleccionar rango' }}
          </button>
          <span class="inline-flex h-8 items-center rounded-lg border border-pic-brand-border bg-pic-surface px-3 text-[10px] font-bold text-pic-text-muted">
            <i class="fa-solid fa-arrows-left-right mr-1.5 text-pic-brand"></i>
            {{ brushedRangeLabel }}
          </span>
          <button
            type="button"
            class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-pic-brand-border bg-pic-surface px-3 text-[10px] font-black text-pic-brand transition hover:bg-pic-brand hover:text-white focus:outline-none focus:ring-2 focus:ring-pic-brand-border"
            @click="resetView"
          >
            <i class="fa-solid fa-rotate-left"></i>
            Restaurar ambas
          </button>
        </div>
      </div>

      <div
        id="pic52-chart-keyboard-help"
        class="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-pic-brand-border px-4 py-2 text-[9px] font-semibold text-pic-text-muted"
      >
        <span><i class="fa-solid fa-computer-mouse mr-1 text-pic-brand"></i>Clic: fijar semana</span>
        <span><i class="fa-solid fa-left-right mr-1 text-pic-brand"></i>Rueda o slider: zoom</span>
        <span>
          <i class="fa-solid fa-paintbrush mr-1 text-pic-brand"></i>
          Pulsa “Seleccionar rango” y arrastra horizontalmente
        </span>
        <span><i class="fa-solid fa-keyboard mr-1 text-pic-brand"></i>← →: recorrer semanas · Esc: restaurar</span>
      </div>
    </div>

    <div
      v-if="pinnedSummary"
      class="grid grid-cols-1 overflow-hidden rounded-xl border border-pic-border bg-pic-surface shadow-sm lg:grid-cols-[126px_minmax(0,1fr)_260px]"
      aria-live="polite"
    >
      <div class="flex items-center gap-3 border-b border-pic-border bg-slate-900 px-4 py-3 text-white lg:flex-col lg:items-start lg:justify-center lg:border-b-0 lg:border-r">
        <span class="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Semana fijada</span>
        <strong class="font-mono text-lg">SEM-{{ pinnedSummary.week }}</strong>
      </div>
      <div class="overflow-x-auto">
        <div class="flex min-w-full divide-x divide-pic-border">
          <div
            v-for="item in pinnedSummary.years"
            :key="item.year"
            class="grid min-w-[180px] flex-1 grid-cols-[52px_minmax(0,1fr)] gap-3 px-4 py-3"
          >
            <strong class="font-mono text-xs text-pic-brand">{{ item.year }}</strong>
            <div class="space-y-1 text-right text-[10px] font-bold tabular-nums text-pic-text-main">
              <p>{{ item.kg }}</p>
              <p>{{ item.pesos }}</p>
            </div>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-px bg-pic-border lg:grid-cols-1">
        <div class="bg-pic-muted-surface px-3 py-2">
          <p class="text-[8px] font-black uppercase text-pic-text-muted">KG · diferencia y %</p>
          <p class="mt-1 text-[10px] font-black text-pic-text-main">{{ pinnedSummary.kgComparison }}</p>
        </div>
        <div class="bg-pic-muted-surface px-3 py-2">
          <p class="text-[8px] font-black uppercase text-pic-text-muted">MXN · diferencia y %</p>
          <p class="mt-1 text-[10px] font-black text-pic-text-main">{{ pinnedSummary.pesosComparison }}</p>
        </div>
      </div>
    </div>

    <article class="overflow-hidden rounded-xl border border-pic-border bg-pic-surface shadow-sm">
      <header class="flex items-center justify-between gap-3 border-b border-pic-border px-4 py-3">
        <div class="flex min-w-0 items-center gap-3">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-pic-brand-border bg-pic-brand-soft text-pic-brand">
            <i class="fa-solid fa-weight-hanging"></i>
          </span>
          <div>
            <p class="text-[9px] font-black uppercase tracking-[0.16em] text-pic-brand">Kilogramos</p>
            <h3 class="mt-0.5 text-sm font-black text-pic-text-main">Evolución semanal comparada</h3>
          </div>
        </div>
        <span class="hidden rounded-lg border border-pic-border bg-pic-muted-surface px-2.5 py-1 text-[9px] font-bold text-pic-text-muted sm:inline-flex">
          Zoom y puntero sincronizados
        </span>
      </header>
      <div
        ref="kgChartRef"
        class="pic52-chart-surface h-[360px] w-full outline-none sm:h-[420px] xl:h-[460px]"
        tabindex="0"
        role="img"
        aria-label="Gráfica comparativa de kilogramos por semana. Usa flechas izquierda y derecha para recorrer semanas."
        aria-describedby="pic52-chart-keyboard-help"
        @keydown="handleKeyboard"
      ></div>
    </article>

    <article class="overflow-hidden rounded-xl border border-pic-border bg-pic-surface shadow-sm">
      <header class="flex items-center justify-between gap-3 border-b border-pic-border px-4 py-3">
        <div class="flex min-w-0 items-center gap-3">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-pic-brand-border bg-pic-brand-soft text-pic-brand">
            <i class="fa-solid fa-dollar-sign"></i>
          </span>
          <div>
            <p class="text-[9px] font-black uppercase tracking-[0.16em] text-pic-brand">Pesos</p>
            <h3 class="mt-0.5 text-sm font-black text-pic-text-main">Evolución semanal comparada</h3>
          </div>
        </div>
        <span class="hidden rounded-lg border border-pic-border bg-pic-muted-surface px-2.5 py-1 text-[9px] font-bold text-pic-text-muted sm:inline-flex">
          Zoom y puntero sincronizados
        </span>
      </header>
      <div
        ref="pesosChartRef"
        class="pic52-chart-surface h-[360px] w-full outline-none sm:h-[420px] xl:h-[460px]"
        tabindex="0"
        role="img"
        aria-label="Gráfica comparativa de pesos por semana. Usa flechas izquierda y derecha para recorrer semanas."
        aria-describedby="pic52-chart-keyboard-help"
        @keydown="handleKeyboard"
      ></div>
    </article>
  </section>
</template>

<style scoped>
.pic52-chart-surface:focus-visible {
  box-shadow: inset 0 0 0 2px hsl(var(--pic-brand-border));
}
</style>
