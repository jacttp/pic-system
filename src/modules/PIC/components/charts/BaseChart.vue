<script setup lang="ts">
import { ref, onMounted, watch, computed, onUnmounted } from 'vue';
import Chart from 'chart.js/auto';

const props = defineProps<{
    config: any; // Configuración base de Chart.js
    title?: string;
    enableSwitch?: boolean; // Nuevo: Activar selector
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const renderChart = () => {
    if (!canvasRef.value) return;
    
    if (chartInstance) {
        chartInstance.destroy();
    }

    const config = getFinalConfig();
    chartInstance = new Chart(canvasRef.value, config);
};
// Cuando cambia la config externa (ej: nuevos filtros), reseteamos el tipo
watch(() => props.config, (newConfig) => {
    currentType.value = newConfig.type || 'bar';
    renderChart();
}, { deep: true });

// Estado local del tipo de gráfico ('bar' por defecto si no viene en config)
const currentType = ref(props.config.type || 'bar');


// Lógica para transformar la configuración según el tipo seleccionado
const getFinalConfig = () => {
    // Clonamos para no mutar la prop original
    const finalConfig = JSON.parse(JSON.stringify(props.config));
    
    // 1. Asignar el tipo global
    finalConfig.type = currentType.value;

    // 2. Lógica especial para datasets mixtos (ej: Venta vs Meta)
    if (finalConfig.data.datasets.length > 0) {
        if (currentType.value === 'line') {
            // Si el usuario quiere LÍNEAS, forzamos todo a línea
            finalConfig.data.datasets.forEach((ds: any) => {
                ds.type = 'line';
            });
        } else {
            // Si el usuario quiere BARRAS (Default)
            finalConfig.data.datasets.forEach((ds: any) => {
                // Si es "Venta", quitamos el tipo explícito para que herede 'bar' del global
                if (ds.label && ds.label.toString().startsWith('Venta')) {
                    delete ds.type; 
                }
                // Si es "Meta" u otro que ya venía definido como línea, lo dejamos quieto (mixed chart)
            });
        }
    }
    
    return finalConfig;
};


// Observar cambios en el switch local para repintar
watch(currentType, () => {
    renderChart();
});

onMounted(() => {
    renderChart();
});

onUnmounted(() => {
    if (chartInstance) chartInstance.destroy();
});
</script>

<template>
    <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col relative group">
        
        <div class="flex justify-between items-center mb-4">
            <h3 v-if="title" class="text-sm font-bold text-slate-700 flex items-center gap-2">
                <i class="fa-solid fa-chart-simple text-brand-500"></i>
                {{ title }}
            </h3>

            <div v-if="enableSwitch" class="flex bg-slate-100 rounded-lg p-1 gap-1">
                <button 
                    @click="currentType = 'bar'"
                    class="p-1.5 rounded transition-all text-xs flex items-center justify-center w-7 h-7"
                    :class="currentType === 'bar' ? 'bg-white text-brand-600 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-600'"
                    title="Ver como Barras"
                >
                    <i class="fa-solid fa-chart-bar"></i>
                </button>
                <button 
                    @click="currentType = 'line'"
                    class="p-1.5 rounded transition-all text-xs flex items-center justify-center w-7 h-7"
                    :class="currentType === 'line' ? 'bg-white text-brand-600 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-600'"
                    title="Ver como Líneas"
                >
                    <i class="fa-solid fa-chart-line"></i>
                </button>
            </div>
        </div>

        <div class="flex-1 relative min-h-[250px]">
            <canvas ref="canvasRef"></canvas>
        </div>
    </div>
</template>