<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue';
import Chart from 'chart.js/auto';
import { usePicChatStore } from '../../stores/picChatStore'; // <--- Importar Chat Store

const props = defineProps<{
    config: any; 
    title?: string;
    enableSwitch?: boolean;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;
const currentType = ref(props.config.type || 'bar');

// Acceso al store del chat para enviar el contexto
const chatStore = usePicChatStore();

const renderChart = () => {
    if (!canvasRef.value) return;
    if (chartInstance) {
        chartInstance.destroy();
    }
    const config = getFinalConfig();
    chartInstance = new Chart(canvasRef.value, config);
};

watch(() => props.config, (newConfig) => {
    currentType.value = newConfig.type || 'bar';
    renderChart();
}, { deep: true });

const getFinalConfig = () => {
    const finalConfig = JSON.parse(JSON.stringify(props.config));
    finalConfig.type = currentType.value;
    if (finalConfig.data.datasets.length > 0) {
        if (currentType.value === 'line') {
            finalConfig.data.datasets.forEach((ds: any) => ds.type = 'line');
        } else {
            finalConfig.data.datasets.forEach((ds: any) => {
                if (ds.label && ds.label.toString().startsWith('Venta')) {
                    delete ds.type; 
                }
            });
        }
    }
    return finalConfig;
};

watch(currentType, () => {
    renderChart();
});

onMounted(() => {
    renderChart();
});

onUnmounted(() => {
    if (chartInstance) chartInstance.destroy();
});

// ACCIÓN: Enviar datos al chat
const handleAnalyze = () => {
    if (!props.config || !props.config.data) return;
    
    // Simplificamos los datos para no saturar el prompt
    // Extraemos etiquetas y datasets
    const simplifiedData = {
        labels: props.config.data.labels,
        datasets: props.config.data.datasets.map((ds: any) => ({
            label: ds.label,
            data: ds.data
        }))
    };

    chatStore.setContext(props.title || 'Gráfico', simplifiedData, 'chart');
};
</script>

<template>
    <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col relative group transition-shadow hover:shadow-md">
        
        <div class="flex justify-between items-center mb-4">
            <div class="flex items-center gap-2">
                <h3 v-if="title" class="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <i class="fa-solid fa-chart-simple text-brand-500"></i>
                    {{ title }}
                </h3>
            </div>

            <div class="flex items-center gap-2">
                <button 
                    @click="handleAnalyze"
                    class="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all border border-transparent hover:border-brand-200"
                    title="Analizar este gráfico con IA"
                >
                    <i class="fa-solid fa-wand-magic-sparkles text-xs"></i>
                </button>

                <div v-if="enableSwitch" class="flex bg-slate-100 rounded-lg p-1 gap-1">
                    <button 
                        @click="currentType = 'bar'"
                        class="p-1.5 rounded transition-all text-xs flex items-center justify-center w-6 h-6"
                        :class="currentType === 'bar' ? 'bg-white text-brand-600 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-600'"
                        title="Ver como Barras"
                    >
                        <i class="fa-solid fa-chart-bar"></i>
                    </button>
                    <button 
                        @click="currentType = 'line'"
                        class="p-1.5 rounded transition-all text-xs flex items-center justify-center w-6 h-6"
                        :class="currentType === 'line' ? 'bg-white text-brand-600 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-600'"
                        title="Ver como Líneas"
                    >
                        <i class="fa-solid fa-chart-line"></i>
                    </button>
                </div>
            </div>
        </div>

        <div class="flex-1 relative min-h-[250px]">
            <canvas ref="canvasRef"></canvas>
        </div>
    </div>
</template>