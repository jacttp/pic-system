<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue';
import Chart from 'chart.js/auto';

const props = defineProps<{
    config: any; // Configuración completa de Chart.js
    title?: string;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const renderChart = () => {
    if (!canvasRef.value) return;
    
    // Destruir anterior si existe
    if (chartInstance) {
        chartInstance.destroy();
    }

    // Crear nuevo
    chartInstance = new Chart(canvasRef.value, props.config);
};

// Reactividad: Si cambia la config, repintar
watch(() => props.config, () => {
    renderChart();
}, { deep: true });

onMounted(() => {
    renderChart();
});

onUnmounted(() => {
    if (chartInstance) chartInstance.destroy();
});
</script>

<template>
    <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
        <h3 v-if="title" class="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <i class="fa-solid fa-chart-simple text-brand-500"></i>
            {{ title }}
        </h3>
        <div class="flex-1 relative min-h-[250px]">
            <canvas ref="canvasRef"></canvas>
        </div>
    </div>
</template>