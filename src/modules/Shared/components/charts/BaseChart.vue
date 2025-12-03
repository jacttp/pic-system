<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, type PropType } from 'vue';
import { Chart, type ChartConfiguration, type ChartType } from 'chart.js';

const props = defineProps({
    type: {
        type: String as PropType<ChartType>,
        default: 'bar'
    },
    data: {
        type: Object as PropType<ChartConfiguration['data']>,
        required: true
    },
    options: {
        type: Object as PropType<ChartConfiguration['options']>,
        default: () => ({})
    },
    title: {
        type: String,
        default: ''
    }
});

const canvasRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const renderChart = () => {
    if (!canvasRef.value) return;

    // Destruir instancia previa si existe
    if (chartInstance) {
        chartInstance.destroy();
    }

    // Crear nueva instancia
    chartInstance = new Chart(canvasRef.value, {
        type: props.type,
        data: props.data,
        options: {
            responsive: true,
            maintainAspectRatio: false, // Importante para contenedores flexibles
            plugins: {
                title: {
                    display: !!props.title,
                    text: props.title,
                    font: { size: 16, weight: 'bold' },
                    color: '#1e293b', // slate-800
                    align: 'start',
                    padding: { bottom: 20 }
                },
                legend: {
                    position: 'bottom',
                    labels: { usePointStyle: true, boxWidth: 8 }
                }
            },
            ...props.options
        }
    });
};

// --- Ciclo de Vida y Reactividad ---

onMounted(() => {
    renderChart();
});

// Si cambian los datos, actualizamos (sin destruir si es posible, para animaciones)
watch(() => props.data, (newData) => {
    if (chartInstance) {
        chartInstance.data = newData;
        chartInstance.update();
    } else {
        renderChart();
    }
}, { deep: true });

// Si cambia el tipo de gráfico, hay que destruir y recrear
watch(() => props.type, () => {
    renderChart();
});

onUnmounted(() => {
    if (chartInstance) {
        chartInstance.destroy();
    }
});
</script>

<template>
    <div class="w-full h-full min-h-[300px] relative">
        <canvas ref="canvasRef"></canvas>
    </div>
</template>