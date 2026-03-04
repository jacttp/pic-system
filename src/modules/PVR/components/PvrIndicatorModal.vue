<!-- src/modules/PVR/components/PvrIndicatorModal.vue -->
<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import * as echarts from 'echarts/core';
import { TitleComponent, TooltipComponent, GridComponent, LegendComponent } from 'echarts/components';
import { LineChart } from 'echarts/charts';
import { UniversalTransition } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';
import { MONTH_LABELS, fmtCurrency, fmtKg, fmtPct, fmtPrice } from '../utils/pvrFormatters';

echarts.use([TitleComponent, TooltipComponent, GridComponent, LegendComponent, LineChart, CanvasRenderer, UniversalTransition]);

interface Props {
  show: boolean;
  title: string;
  type: 'kg' | 'currency' | 'price' | 'pct';
  monthsObjArray: { 
    moderno: (number | null)[];
    tradicional: (number | null)[];
    total: (number | null)[];
  };
  visibleMonths: number[];
}

const props = defineProps<Props>();
const emit = defineEmits<{ (e: 'update:show', val: boolean): void }>();

const chartRef = ref<HTMLElement | null>(null);
let chartInstance: echarts.ECharts | null = null;

// Formateador para ECharts según el tipo de datos
function formatValue(value: number): string {
  switch (props.type) {
    case 'kg': return fmtKg(value);
    case 'price': return fmtPrice(value);
    case 'pct': return fmtPct(value);
    case 'currency':
    default: return fmtCurrency(value);
  }
}

function initChart() {
  if (!chartRef.value) return;
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value);
  }

  const { moderno, tradicional, total } = props.monthsObjArray;
  const xAxisData = props.visibleMonths.map(i => MONTH_LABELS[i]);

  // Filtrar los datos para coincidir con los meses visibles
  const mapData = (arr: (number | null)[]) => props.visibleMonths.map(i => arr[i] ?? 0);

  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(30, 41, 59, 0.95)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      textStyle: { color: '#f8fafc', fontSize: 12 },
      valueFormatter: (value: number) => formatValue(value),
    },
    legend: {
      data: ['Moderno', 'Tradicional', 'Total'],
      bottom: 0,
      textStyle: { color: '#64748b' },
      icon: 'circle'
    },
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xAxisData,
      axisLabel: { color: '#94a3b8' },
      axisLine: { lineStyle: { color: '#e2e8f0' } }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: '#94a3b8',
        formatter: (value: number) => {
          if (props.type === 'kg') return (value / 1000).toFixed(0) + 'k';
          if (props.type === 'currency' || props.type === 'price') return '$' + (value >= 1000 || value <= -1000 ? (value / 1000).toFixed(0) + 'k' : value);
          if (props.type === 'pct') return (value * 100).toFixed(0) + '%';
          return value;
        }
      },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } }
    },
    series: [
      {
        name: 'Moderno',
        type: 'line',
        data: mapData(moderno),
        itemStyle: { color: '#60a5fa' }, // blue-400
        lineStyle: { width: 3 },
        symbolSize: 8,
      },
      {
        name: 'Tradicional',
        type: 'line',
        data: mapData(tradicional),
        itemStyle: { color: '#34d399' }, // emerald-400
        lineStyle: { width: 3 },
        symbolSize: 8,
      },
      {
        name: 'Total',
        type: 'line',
        data: mapData(total),
        itemStyle: { color: '#94a3b8' }, // slate-400
        lineStyle: { width: 3, type: 'dashed' },
        symbolSize: 8,
      }
    ]
  };

  chartInstance.setOption(option);
}

function resizeChart() {
  chartInstance?.resize();
}

watch(() => props.show, async (newVal) => {
  if (newVal) {
    await nextTick();
    // Destruir la instancia anterior si existe porque el DOM node (v-if) se recorta y se vuelve a montar
    if (chartInstance) {
      chartInstance.dispose();
      chartInstance = null;
    }
    initChart();
    window.addEventListener('resize', resizeChart);
  } else {
    window.removeEventListener('resize', resizeChart);
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', resizeChart);
  chartInstance?.dispose();
});
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-300"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-200"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div 
        class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden transform transition-all flex flex-col"
        @click.stop
      >
        <!-- Header -->
        <div class="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
            <i class="fa-solid fa-chart-line text-brand-500"></i>
            Evolución: <span class="text-brand-700">{{ title }}</span>
          </h3>
          <button 
            @click="emit('update:show', false)"
            class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <i class="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <!-- Body -->
        <div class="p-6">
          <div ref="chartRef" class="w-full h-[400px]"></div>
        </div>
      </div>
    </div>
  </Transition>
</template>
