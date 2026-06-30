<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts/core';
import { BarChart, GaugeChart, HeatmapChart, LineChart, PieChart, RadarChart, ScatterChart } from 'echarts/charts';
import { GridComponent, LegendComponent, RadarComponent, TooltipComponent, VisualMapComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  BarChart,
  GaugeChart,
  HeatmapChart,
  LineChart,
  PieChart,
  RadarChart,
  ScatterChart,
  GridComponent,
  LegendComponent,
  RadarComponent,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer,
]);

interface Props {
  type: 'line' | 'bar' | 'stacked' | 'area' | 'donut' | 'pie' | 'scatter' | 'radar' | 'heatmap' | 'gauge';
  title: string;
}

const props = defineProps<Props>();
const chartRef = ref<HTMLDivElement | null>(null);
let chart: echarts.ECharts | null = null;
const resizeChart = () => chart?.resize();

const token = (name: string, fallback: string) => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value ? `hsl(${value})` : fallback;
};

const palette = computed(() => [
  token('--pic-chart-1', '#d3121e'),
  token('--pic-chart-2', '#0f766e'),
  token('--pic-chart-3', '#2563eb'),
  token('--pic-chart-4', '#d97706'),
  token('--pic-chart-5', '#64748b'),
]);

const baseGrid = {
  left: 24,
  right: 18,
  top: 24,
  bottom: 24,
  containLabel: true,
};

const chartOption = computed<echarts.EChartsOption>(() => {
  const colors = palette.value;
  const common = {
    color: colors,
    tooltip: { show: true, trigger: 'axis' },
    grid: baseGrid,
    xAxis: { type: 'category', data: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'], axisTick: { show: false } },
    yAxis: { type: 'value', axisLine: { show: false }, splitLine: { lineStyle: { color: '#e2e8f0' } } },
  } satisfies echarts.EChartsOption;

  if (props.type === 'bar') {
    return { ...common, series: [{ type: 'bar', data: [12, 20, 18, 28, 36, 24], barWidth: 12, itemStyle: { borderRadius: 3 } }] };
  }

  if (props.type === 'stacked') {
    return {
      ...common,
      series: [
        { type: 'bar', stack: 'total', data: [10, 14, 18, 20, 22, 26], barWidth: 14 },
        { type: 'bar', stack: 'total', data: [8, 10, 9, 14, 16, 20] },
      ],
    };
  }

  if (props.type === 'area') {
    return {
      ...common,
      series: [{
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: [12, 18, 14, 20, 17, 28],
        areaStyle: { opacity: 0.2 },
      }],
    };
  }

  if (props.type === 'donut' || props.type === 'pie') {
    return {
      color: colors,
      tooltip: { show: true },
      series: [{
        type: 'pie',
        radius: props.type === 'donut' ? ['48%', '72%'] : '72%',
        center: ['50%', '52%'],
        label: { show: false },
        data: [{ value: 40 }, { value: 28 }, { value: 18 }, { value: 14 }],
      }],
    };
  }

  if (props.type === 'scatter') {
    return {
      color: colors,
      tooltip: { show: true },
      grid: baseGrid,
      xAxis: { axisLine: { show: false }, splitLine: { lineStyle: { color: '#e2e8f0' } } },
      yAxis: { axisLine: { show: false }, splitLine: { lineStyle: { color: '#e2e8f0' } } },
      series: [{ type: 'scatter', symbolSize: 8, data: [[1, 4], [2, 7], [3, 3], [4, 9], [5, 5], [6, 8], [7, 4]] }],
    };
  }

  if (props.type === 'radar') {
    return {
      color: colors,
      radar: {
        indicator: [{ max: 100 }, { max: 100 }, { max: 100 }, { max: 100 }, { max: 100 }],
        radius: 42,
        splitLine: { lineStyle: { color: '#e2e8f0' } },
        axisLine: { lineStyle: { color: '#cbd5e1' } },
      },
      series: [{ type: 'radar', data: [{ value: [70, 86, 64, 78, 55] }], areaStyle: { opacity: 0.16 } }],
    };
  }

  if (props.type === 'heatmap') {
    return {
      tooltip: { show: true },
      grid: { left: 20, right: 20, top: 20, bottom: 20 },
      xAxis: { type: 'category', show: false, data: ['1', '2', '3', '4', '5'] },
      yAxis: { type: 'category', show: false, data: ['A', 'B', 'C', 'D'] },
      visualMap: { show: false, min: 0, max: 10, inRange: { color: ['#eff6ff', colors[0]] } },
      series: [{ type: 'heatmap', data: [[0, 0, 2], [1, 0, 5], [2, 0, 8], [3, 0, 4], [4, 0, 9], [0, 1, 1], [1, 1, 6], [2, 1, 4], [3, 1, 8], [4, 1, 7], [0, 2, 3], [1, 2, 7], [2, 2, 2], [3, 2, 9], [4, 2, 5], [0, 3, 4], [1, 3, 2], [2, 3, 6], [3, 3, 10], [4, 3, 8]] }],
    };
  }

  if (props.type === 'gauge') {
    return {
      color: colors,
      series: [{
        type: 'gauge',
        radius: '90%',
        progress: { show: true, width: 8 },
        axisLine: { lineStyle: { width: 8 } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: { width: 3 },
        detail: { valueAnimation: true, fontSize: 14, fontWeight: 900, formatter: '{value}%' },
        data: [{ value: 75 }],
      }],
    };
  }

  return {
    ...common,
    series: [{
      type: 'line',
      smooth: true,
      data: [12, 20, 16, 28, 24, 35],
      symbolSize: 5,
    }],
  };
});

const renderChart = () => {
  if (!chartRef.value) return;
  if (!chart) chart = echarts.init(chartRef.value, null, { renderer: 'canvas' });
  chart.setOption(chartOption.value, { notMerge: true });
};

onMounted(() => {
  renderChart();
  window.addEventListener('resize', resizeChart);
});

watch(chartOption, renderChart, { deep: true });

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart);
  chart?.dispose();
  chart = null;
});
</script>

<template>
  <article class="pic-chart-card flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
    <div class="mb-3 flex items-center justify-between gap-3">
      <h3 class="flex items-center gap-2 text-sm font-bold text-slate-700">
        <i class="fa-solid fa-chart-simple text-pic-brand"></i>
        {{ title }}
      </h3>
      <button
        type="button"
        class="flex h-7 w-7 items-center justify-center rounded-lg border border-transparent text-slate-400 transition-all hover:border-pic-brand-border hover:bg-pic-brand-soft hover:text-pic-brand"
        title="Analizar este grafico con IA"
      >
        <i class="fa-solid fa-wand-magic-sparkles text-xs"></i>
      </button>
    </div>
    <div ref="chartRef" class="pic-chart-surface min-h-[250px] w-full min-w-0 flex-1"></div>
  </article>
</template>
