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
import { StdButton, StdSwitch } from '@/modules/Shared/components/std';
import type { Pic52Report, Pic52TrendData, Pic52TrendJob } from '../types/pic52';
import type { Pic52Metric } from '../utils/pic52Report';
import {
  buildTrendDisplaySeries,
  trendSeriesCount,
  type Pic52TrendMode,
} from '../utils/pic52Trend';

interface Props {
  report: Pic52Report;
  trendData?: Pic52TrendData | null;
  job?: Pic52TrendJob | null;
  loading?: boolean;
  error?: string;
}

const props = withDefaults(defineProps<Props>(), {
  trendData: null,
  job: null,
  loading: false,
  error: '',
});
const emit = defineEmits<{
  (event: 'generate'): void;
  (event: 'retry'): void;
  (event: 'cancel'): void;
}>();

const MAX_VISIBLE_SERIES = 8;
const chartRef = ref<HTMLDivElement | null>(null);
const chart = shallowRef<echarts.ECharts | null>(null);
const metric = ref<Pic52Metric>('kg');
const metricOptions: Array<{ value: Pic52Metric; label: string }> = [
  { value: 'kg', label: 'KG' },
  { value: 'pesos', label: 'Pesos' },
];
const splitProduct = ref(false);
const splitTransaction = ref(false);
const limitMessage = ref('');
const focusedIndex = ref<number | null>(null);
let resizeObserver: ResizeObserver | null = null;

const trend = computed(() => props.trendData);
const hasProductBreakdown = computed(() => (
  Boolean(trend.value?.productDimension) && (trend.value?.productValues.length ?? 0) >= 2
));
const hasTransactionBreakdown = computed(() => (
  (trend.value?.transactions.length ?? 0) >= 2
));
const canSplitProduct = computed(() => Boolean(
  trend.value
  && hasProductBreakdown.value
  && trendSeriesCount(trend.value, 'product') <= MAX_VISIBLE_SERIES
));
const canSplitTransaction = computed(() => Boolean(
  trend.value
  && hasTransactionBreakdown.value
  && trendSeriesCount(trend.value, 'transaction') <= MAX_VISIBLE_SERIES
));
const mode = computed<Pic52TrendMode>(() => {
  if (splitProduct.value && splitTransaction.value) return 'combined';
  if (splitProduct.value) return 'product';
  if (splitTransaction.value) return 'transaction';
  return 'total';
});
const displaySeries = computed(() => (
  trend.value ? buildTrendDisplaySeries(trend.value, mode.value, metric.value) : []
));
const productDimensionOrder = [
  'skus',
  'gruposComercialesB',
  'gruposComercialesA',
  'categorias',
  'gruposSku',
  'marcas',
] as const;
const selectedProductDimension = computed(() => productDimensionOrder.find(
  key => (props.report.filters[key]?.length ?? 0) >= 2,
) ?? null);
const oversizedProductDimension = computed(() => {
  const dimension = selectedProductDimension.value;
  return dimension && (props.report.filters[dimension]?.length ?? 0) > 8 ? dimension : null;
});
const productSelectionWarning = computed(() => (
  oversizedProductDimension.value
    ? 'El desglose por producto se omitió porque la selección supera 8 valores. Total y Transacción siguen disponibles.'
    : ''
));
const elapsedLabel = computed(() => {
  const totalSeconds = Math.max(0, Math.floor((props.job?.elapsedMs ?? 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
});
const jobStatusLabel = computed(() => {
  if (!props.job) return 'Preparando solicitud';
  return props.job.status === 'queued' ? 'En cola' : 'Generando tendencia';
});
const productDimensionLabels: Record<string, string> = {
  marcas: 'Marca',
  gruposSku: 'Grupo SKU',
  categorias: 'Categoría',
  gruposComercialesA: 'Grupo comercial A',
  gruposComercialesB: 'Grupo comercial B',
  skus: 'SKU',
};
const dimensionLabel = computed(() => (
  trend.value?.productDimension
    ? productDimensionLabels[trend.value.productDimension]
    : 'Sin desglose de producto'
));
const periodLabel = computed(() => {
  if (!trend.value) return '';
  const { start, end } = trend.value;
  return start.year === end.year
    ? start.year + ' · SEM-' + start.week + '–' + end.week
    : start.year + ' SEM-' + start.week + ' → ' + end.year + ' SEM-' + end.week;
});
const includesIntermediateYears = computed(() => {
  if (!trend.value) return false;
  return trend.value.end.year - trend.value.start.year + 1 > props.report.years.length;
});

const token = (name: string, fallback: string) => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value ? 'hsl(' + value + ')' : fallback;
};
const palette = () => [
  token('--pic-chart-1', '#d3121e'),
  token('--pic-chart-3', '#2563eb'),
  token('--pic-chart-2', '#0f766e'),
  token('--pic-chart-4', '#d97706'),
  token('--pic-chart-5', '#64748b'),
];
const numberFormatter = new Intl.NumberFormat('es-MX', {
  maximumFractionDigits: 2,
});
const compactFormatter = new Intl.NumberFormat('es-MX', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const formatValue = (value: number | null) => {
  if (value === null) return '—';
  return metric.value === 'kg'
    ? numberFormatter.format(value) + ' kg'
    : '$' + numberFormatter.format(value);
};
const escapeHtml = (value: string) => value.replace(
  /[&<>"']/g,
  character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character] ?? character,
);

const seriesColor = (productValue: string | null, transactionValue: string | null) => {
  const colors = palette();
  const products = trend.value?.productValues ?? [];
  const transactions = trend.value?.transactions.map(item => item.value) ?? [];
  const identityIndex = productValue
    ? products.indexOf(productValue)
    : transactions.indexOf(transactionValue ?? '');
  return colors[Math.max(0, identityIndex) % colors.length];
};
const tooltipFormatter = (rawParams: unknown) => {
  if (!trend.value) return '';
  const params = Array.isArray(rawParams) ? rawParams as Array<Record<string, unknown>> : [];
  const dataIndex = Number(params[0]?.dataIndex);
  const period = trend.value.timeline[dataIndex];
  if (!period) return '';

  const rows = displaySeries.value.map(series => {
    const color = seriesColor(series.productValue, series.transactionValue);
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:22px;margin-top:6px">'
      + '<span style="display:flex;min-width:0;align-items:center;gap:7px;color:'
      + token('--pic-text-muted', '#64748b') + '"><span style="width:8px;height:8px;border-radius:3px;background:'
      + color + '"></span><span style="max-width:220px;overflow:hidden;text-overflow:ellipsis">'
      + escapeHtml(series.label) + '</span></span><strong style="color:'
      + token('--pic-text-main', '#172033') + ';font-variant-numeric:tabular-nums">'
      + formatValue(series.values[dataIndex] ?? null) + '</strong></div>';
  }).join('');

  return '<div style="min-width:250px"><div style="font-size:11px;font-weight:800;color:'
    + token('--pic-text-main', '#172033') + '">' + escapeHtml(period.label) + ' · '
    + (metric.value === 'kg' ? 'Kilogramos' : 'Pesos') + '</div>' + rows + '</div>';
};

const buildOption = (): echarts.EChartsOption => {
  if (!trend.value) return {};
  const borderColor = token('--pic-border', '#e2e8f0');
  const textColor = token('--pic-text-muted', '#64748b');
  const timeline = trend.value.timeline;
  const yearMarkers = timeline
    .filter((period, index) => index > 0 && period.week === 1)
    .map(period => ({
      name: String(period.year),
      xAxis: period.key,
      lineStyle: { color: borderColor, type: 'dashed' as const, width: 1 },
      label: {
        show: true,
        formatter: String(period.year),
        color: textColor,
        fontSize: 9,
        fontWeight: 700,
      },
    }));

  return {
    animationDuration: 450,
    animationEasing: 'cubicOut',
    aria: {
      enabled: true,
      label: {
        description: 'Tendencia continua de ' + (metric.value === 'kg' ? 'kilogramos' : 'pesos')
          + ' desde ' + periodLabel.value + ' con ' + displaySeries.value.length + ' series.',
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
          name: 'PIC52-periodo-continuo-' + metric.value,
          pixelRatio: 2,
          backgroundColor: token('--pic-surface', '#ffffff'),
        },
      },
    },
    legend: {
      type: displaySeries.value.length > 3 ? 'scroll' : 'plain',
      top: 38,
      left: 'center',
      selectedMode: true,
      itemWidth: 18,
      itemHeight: 7,
      itemGap: 22,
      icon: 'roundRect',
      pageIconColor: token('--pic-brand', '#d3121e'),
      pageTextStyle: { color: textColor, fontSize: 9 },
      textStyle: { color: textColor, fontSize: 11, fontWeight: 700 },
      data: displaySeries.value.map(series => series.label),
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
      formatter: tooltipFormatter,
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
      data: timeline.map(period => period.key),
      axisLine: { lineStyle: { color: borderColor } },
      axisTick: { show: false },
      axisLabel: {
        color: textColor,
        fontSize: 9,
        margin: 12,
        formatter: (value: string, index: number) => {
          const period = timeline[index];
          if (!period) return '';
          if (index === 0 || period.week === 1) return period.year + '\nSEM-' + period.week;
          return period.week % 8 === 0 ? 'SEM-' + period.week : '';
        },
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
          metric.value === 'kg'
            ? compactFormatter.format(value)
            : '$' + compactFormatter.format(value)
        ),
      },
      splitLine: { lineStyle: { color: borderColor, type: 'dashed', opacity: 0.8 } },
    },
    dataZoom: [
      {
        id: 'pic52-continuous-inside-zoom',
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
        id: 'pic52-continuous-slider-zoom',
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
        showDetail: false,
        brushSelect: false,
        start: 0,
        end: 100,
      },
    ],
    series: displaySeries.value.map((series, index) => {
      const color = seriesColor(series.productValue, series.transactionValue);
      return {
        id: 'pic52-trend-' + series.key,
        name: series.label,
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
          width: index === 0 ? 2.8 : 2.2,
          color,
        },
        itemStyle: {
          color,
          borderColor: token('--pic-surface', '#ffffff'),
          borderWidth: 1,
        },
        areaStyle: {
          color,
          opacity: index === 0 ? 0.09 : 0.045,
        },
        data: series.values,
        markLine: index === 0 ? {
          silent: true,
          symbol: ['none', 'none'],
          data: yearMarkers,
        } : undefined,
      };
    }),
  };
};

const renderChart = () => {
  if (!chartRef.value || !trend.value) return;
  if (!chart.value) chart.value = echarts.init(chartRef.value, null, { renderer: 'canvas' });
  chart.value.setOption(buildOption(), { notMerge: true });
};

const initializeBreakdowns = () => {
  limitMessage.value = '';
  const canCombine = Boolean(
    trend.value
    && canSplitProduct.value
    && canSplitTransaction.value
    && trendSeriesCount(trend.value, 'combined') <= MAX_VISIBLE_SERIES,
  );
  splitProduct.value = canSplitProduct.value;
  splitTransaction.value = canSplitTransaction.value && (
    !canSplitProduct.value || canCombine
  );
  if (hasProductBreakdown.value && !canSplitProduct.value) {
    limitMessage.value = 'Producto supera 8 líneas. Reduce la selección para habilitar el desglose.';
    return;
  }
  if (hasProductBreakdown.value && hasTransactionBreakdown.value && !canCombine) {
    limitMessage.value = 'La combinación supera 8 líneas. Activa solo Producto o Transacción.';
  }
};

const setProductSplit = (value: boolean) => {
  if (!trend.value || !canSplitProduct.value) return;
  const nextMode: Pic52TrendMode = value && splitTransaction.value ? 'combined' : (
    value ? 'product' : (splitTransaction.value ? 'transaction' : 'total')
  );
  if (trendSeriesCount(trend.value, nextMode) > MAX_VISIBLE_SERIES) {
    limitMessage.value = 'La combinación supera el máximo de 8 líneas.';
    return;
  }
  limitMessage.value = '';
  splitProduct.value = value;
};

const setTransactionSplit = (value: boolean) => {
  if (!trend.value || !canSplitTransaction.value) return;
  const nextMode: Pic52TrendMode = value && splitProduct.value ? 'combined' : (
    value ? 'transaction' : (splitProduct.value ? 'product' : 'total')
  );
  if (trendSeriesCount(trend.value, nextMode) > MAX_VISIBLE_SERIES) {
    limitMessage.value = 'La combinación supera el máximo de 8 líneas.';
    return;
  }
  limitMessage.value = '';
  splitTransaction.value = value;
};

const handleKeyboard = (event: KeyboardEvent) => {
  const length = trend.value?.timeline.length ?? 0;
  if (length === 0) return;
  if (event.key === 'Escape') {
    focusedIndex.value = null;
    chart.value?.dispatchAction({ type: 'restore' });
    chart.value?.dispatchAction({ type: 'hideTip' });
    return;
  }
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  const direction = event.key === 'ArrowRight' ? 1 : -1;
  const start = focusedIndex.value ?? (direction > 0 ? -1 : length);
  focusedIndex.value = Math.min(Math.max(start + direction, 0), length - 1);
  chart.value?.dispatchAction({
    type: 'showTip',
    seriesIndex: 0,
    dataIndex: focusedIndex.value,
  });
};

onMounted(() => {
  initializeBreakdowns();
  nextTick(renderChart);
  resizeObserver = new ResizeObserver(() => chart.value?.resize());
  if (chartRef.value) resizeObserver.observe(chartRef.value);
});

watch(() => props.trendData, async () => {
  focusedIndex.value = null;
  initializeBreakdowns();
  if (!trend.value) {
    chart.value?.dispose();
    chart.value = null;
    resizeObserver?.disconnect();
    return;
  }
  await nextTick();
  resizeObserver?.disconnect();
  if (chartRef.value) resizeObserver?.observe(chartRef.value);
  renderChart();
}, { deep: false });

watch([metric, mode], async () => {
  focusedIndex.value = null;
  await nextTick();
  renderChart();
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  chart.value?.dispose();
  chart.value = null;
});
</script>

<template>
  <article class="overflow-hidden rounded-xl border border-pic-border bg-pic-surface font-sans shadow-sm">
    <header class="border-b border-pic-border px-4 py-3">
      <div class="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div class="flex min-w-0 items-start gap-3">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-pic-brand-border bg-pic-brand-soft text-pic-brand">
            <i class="fa-solid fa-timeline" aria-hidden="true"></i>
          </span>
          <div class="min-w-0">
            <p class="text-[9px] font-black uppercase tracking-[0.16em] text-pic-brand">
              Periodo continuo
            </p>
            <h3 class="mt-0.5 text-sm font-black text-pic-text-main">
              Tendencia multiserie
            </h3>
            <p class="mt-1 text-[10px] font-semibold leading-4 text-pic-text-muted">
              {{ periodLabel }} · {{ dimensionLabel }}
              <span v-if="includesIntermediateYears"> · incluye años intermedios</span>
            </p>
          </div>
        </div>

        <div
          v-if="trend"
          class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end"
        >
          <div
            class="inline-flex w-fit rounded-lg border border-pic-border bg-pic-muted-surface p-1"
            role="group"
            aria-label="Métrica de la tendencia continua"
          >
            <button
              v-for="option in metricOptions"
              :key="option.value"
              type="button"
              class="h-7 rounded-md px-3 text-[10px] font-black transition-colors"
              :class="metric === option.value
                ? 'bg-pic-brand text-white shadow-sm'
                : 'text-pic-text-muted hover:bg-pic-surface hover:text-pic-brand'"
              :aria-pressed="metric === option.value"
              @click="metric = option.value"
            >
              {{ option.label }}
            </button>
          </div>

          <div class="flex flex-col gap-2 rounded-lg border border-pic-border bg-pic-muted-surface px-3 py-2 sm:flex-row sm:items-center sm:gap-4">
            <StdSwitch
              :model-value="splitProduct"
              label="Separar por producto"
              :disabled="!canSplitProduct"
              @update:model-value="setProductSplit"
            />
            <StdSwitch
              :model-value="splitTransaction"
              label="Separar por transacción"
              :disabled="!canSplitTransaction"
              @update:model-value="setTransactionSplit"
            />
          </div>
        </div>
      </div>

      <p
        v-if="limitMessage || productSelectionWarning"
        class="mt-2 rounded-lg border border-[hsl(var(--pic-warning)/0.35)] bg-[hsl(var(--pic-warning)/0.08)] px-3 py-2 text-[10px] font-bold text-pic-warning"
        role="status"
      >
        <i class="fa-solid fa-triangle-exclamation mr-1" aria-hidden="true"></i>
        {{ limitMessage || productSelectionWarning }}
      </p>
    </header>

    <div
      v-if="loading"
      class="grid min-h-64 place-items-center bg-pic-muted-surface px-5 py-8 text-center"
      aria-busy="true"
      aria-label="Generando tendencia continua"
    >
      <div class="w-full max-w-md">
        <span class="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-pic-brand-border bg-pic-brand-soft text-pic-brand">
          <i class="fa-solid fa-spinner animate-spin" aria-hidden="true"></i>
        </span>
        <p class="mt-3 text-sm font-black text-pic-text-main">{{ jobStatusLabel }}</p>
        <p class="mt-1 text-xs font-semibold leading-5 text-pic-text-muted">
          La consulta se procesa aparte del reporte. Puedes cancelar o continuar trabajando.
        </p>
        <p class="mt-3 font-mono text-lg font-black tabular-nums text-pic-brand">
          {{ elapsedLabel }}
        </p>
        <div class="mx-auto mt-3 h-1.5 max-w-xs overflow-hidden rounded-full bg-pic-border" aria-hidden="true">
          <span class="block h-full w-1/3 animate-pulse rounded-full bg-pic-brand"></span>
        </div>
        <StdButton
          class="mt-5"
          size="sm"
          variant="secondary"
          icon="fa-solid fa-xmark"
          @click="emit('cancel')"
        >
          Cancelar generación
        </StdButton>
      </div>
    </div>
    <div
      v-else-if="job?.status === 'cancelled'"
      class="grid min-h-64 place-items-center bg-pic-muted-surface px-5 py-8 text-center"
    >
      <div class="max-w-lg">
        <i class="fa-regular fa-circle-stop text-2xl text-pic-text-muted" aria-hidden="true"></i>
        <p class="mt-2 text-sm font-black text-pic-text-main">Generación cancelada</p>
        <p class="mt-1 text-xs font-semibold leading-5 text-pic-text-muted">
          No se modificó el reporte actual. Puedes solicitar nuevamente la tendencia cuando la necesites.
        </p>
        <StdButton
          class="mt-4"
          size="sm"
          icon="fa-solid fa-rotate-right"
          @click="emit('generate')"
        >
          Generar nuevamente
        </StdButton>
      </div>
    </div>
    <div
      v-else-if="error"
      class="grid min-h-64 place-items-center bg-pic-muted-surface px-5 py-8 text-center"
    >
      <div class="max-w-lg">
        <i class="fa-solid fa-triangle-exclamation text-2xl text-pic-danger" aria-hidden="true"></i>
        <p class="mt-2 text-sm font-black text-pic-text-main">
          No fue posible generar la tendencia continua
        </p>
        <p class="mt-1 text-xs font-semibold leading-5 text-pic-text-muted">{{ error }}</p>
        <StdButton
          class="mt-4"
          size="sm"
          icon="fa-solid fa-rotate-right"
          @click="emit('retry')"
        >
          Reintentar tendencia
        </StdButton>
      </div>
    </div>
    <div
      v-else-if="trend && trend.timeline.length"
      ref="chartRef"
      class="pic52-continuous-chart h-[390px] w-full outline-none sm:h-[440px] xl:h-[480px]"
      tabindex="0"
      role="img"
      :aria-label="'Tendencia continua de ' + (metric === 'kg' ? 'kilogramos' : 'pesos') + '. Usa flechas para recorrer el periodo.'"
      @keydown="handleKeyboard"
    ></div>
    <div
      v-else-if="trend"
      class="grid min-h-56 place-items-center bg-pic-muted-surface px-5 py-8 text-center"
    >
      <div>
        <i class="fa-regular fa-chart-bar text-2xl text-pic-brand" aria-hidden="true"></i>
        <p class="mt-2 text-xs font-bold text-pic-text-muted">
          No hay datos suficientes para construir la tendencia continua.
        </p>
      </div>
    </div>
    <div
      v-else
      class="grid min-h-64 place-items-center bg-pic-muted-surface px-5 py-8 text-center"
    >
      <div class="max-w-xl">
        <span class="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-pic-brand-border bg-pic-brand-soft text-pic-brand">
          <i class="fa-solid fa-chart-line" aria-hidden="true"></i>
        </span>
        <p class="mt-3 text-sm font-black text-pic-text-main">Tendencia disponible bajo demanda</p>
        <p class="mt-1 text-xs font-semibold leading-5 text-pic-text-muted">
          Genera el rango continuo únicamente cuando necesites comparar productos o transacciones.
          Esta consulta es independiente del reporte principal.
        </p>
        <StdButton
          class="mt-4"
          size="sm"
          variant="primary"
          icon="fa-solid fa-bolt"
          @click="emit('generate')"
        >
          Generar tendencia continua
        </StdButton>
      </div>
    </div>
  </article>
</template>

<style scoped>
.pic52-continuous-chart:focus-visible {
  box-shadow: inset 0 0 0 2px hsl(var(--pic-brand-border));
}
</style>
