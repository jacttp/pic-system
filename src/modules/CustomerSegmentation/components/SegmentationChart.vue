<script setup lang="ts">
import { onMounted, ref, watch, onUnmounted } from 'vue';
import * as echarts from 'echarts';
import { useSegmentationStore } from '../stores/segmentationStore';
import { storeToRefs } from 'pinia';

const store = useSegmentationStore();
const { chartOption, isLoading } = storeToRefs(store);

const chartRef = ref<HTMLElement | null>(null);
let myChart: echarts.ECharts | null = null;

// Inicializar ECharts
const initChart = () => {
  if (chartRef.value) {
    myChart = echarts.init(chartRef.value);
    if (chartOption.value) {
      myChart.setOption(chartOption.value);
    }
  }
};

// Reactividad: Actualizar gráfico cuando cambia la data en el Store
watch(chartOption, (newOption) => {
  if (myChart && newOption) {
    myChart.setOption(newOption, true); // true = merge nulo (limpia series viejas)
  }
});

// Manejo de Resize (Responsividad)
const handleResize = () => myChart?.resize();

onMounted(() => {
  initChart();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  myChart?.dispose();
});
</script>

<template>
  <div class="w-full bg-white rounded-lg shadow p-4">
    <div class="mb-4 flex justify-between items-center">
      <h3 class="text-lg font-semibold text-slate-700">Distribución de Volumen (Pareto)</h3>
      <div v-if="isLoading" class="text-sm text-blue-500 animate-pulse">
        Calculando segmentos...
      </div>
    </div>

    <div class="relative w-full h-[400px]">
      <div ref="chartRef" class="w-full h-full"></div>
      
      <div 
        v-if="isLoading" 
        class="absolute inset-0 bg-white/70 flex items-center justify-center z-10"
      >
        <span class="text-slate-500 font-medium">Cargando datos...</span>
      </div>
      
      <div 
        v-if="!isLoading && !chartOption" 
        class="absolute inset-0 flex items-center justify-center text-slate-400"
      >
        No hay datos para mostrar con los filtros actuales.
      </div>
    </div>
  </div>
</template>