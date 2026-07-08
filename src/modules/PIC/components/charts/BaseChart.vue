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
    <div class="pic-chart-card group relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-pic-border bg-pic-surface p-5 shadow-sm transition-shadow hover:shadow-md md:rounded-xl lg:p-5">
        
        <div class="mb-4 flex items-center justify-between gap-3">
            <div class="flex min-w-0 items-center gap-2">
                <h3 v-if="title" class="flex min-w-0 items-center gap-2 text-base font-black text-pic-text-main md:text-[15px] md:font-bold">
                    <i class="fa-solid fa-chart-simple text-pic-brand"></i>
                    <span class="truncate">{{ title }}</span>
                </h3>
            </div>

            <div class="flex items-center gap-2">
                <button 
                    @click="handleAnalyze"
                    class="flex h-7 w-7 items-center justify-center rounded-lg border border-transparent text-pic-text-muted transition-all hover:border-pic-brand-border hover:bg-pic-brand-soft hover:text-pic-brand"
                    title="Analizar este gráfico con IA"
                >
                    <i class="fa-solid fa-wand-magic-sparkles text-xs"></i>
                </button>

                <div v-if="enableSwitch" class="flex gap-1 rounded-lg bg-pic-muted-surface p-1">
                    <button 
                        @click="currentType = 'bar'"
                        class="p-1.5 rounded transition-all text-xs flex items-center justify-center w-6 h-6"
                        :class="currentType === 'bar' ? 'bg-pic-surface text-pic-brand shadow-sm font-bold' : 'text-pic-text-muted hover:text-pic-text-main'"
                        title="Ver como Barras"
                    >
                        <i class="fa-solid fa-chart-bar"></i>
                    </button>
                    <button 
                        @click="currentType = 'line'"
                        class="p-1.5 rounded transition-all text-xs flex items-center justify-center w-6 h-6"
                        :class="currentType === 'line' ? 'bg-pic-surface text-pic-brand shadow-sm font-bold' : 'text-pic-text-muted hover:text-pic-text-main'"
                        title="Ver como Líneas"
                    >
                        <i class="fa-solid fa-chart-line"></i>
                    </button>
                </div>
            </div>
        </div>

        <div class="pic-chart-surface relative min-h-0 w-full min-w-0 flex-1">
            <canvas ref="canvasRef" class="!h-full !w-full"></canvas>
        </div>
    </div>
</template>
