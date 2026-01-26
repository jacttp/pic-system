<script setup lang="ts">
import { computed } from 'vue';
import BaseChart from '@/modules/Shared/components/charts/BaseChart.vue';
import type { ChartData } from 'chart.js';

// Recibimos los vectores puros (Arrays de 12 números) y los nombres
const props = defineProps<{
    victimName: string;
    victimVector: number[];
    cannibalName: string;
    cannibalVector: number[];
    splitMonth: number; // Para dibujar una línea vertical de corte
}>();

const chartData = computed<ChartData>(() => ({
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    datasets: [
        {
            label: `Víctima: ${props.victimName}`,
            data: props.victimVector,
            borderColor: '#ef4444', // Red-500
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: true,
            tension: 0.3
        },
        {
            label: `Caníbal: ${props.cannibalName}`,
            data: props.cannibalVector,
            borderColor: '#22c55e', // Green-500
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            fill: true,
            tension: 0.3
        }
    ]
}));

const chartOptions = computed(() => ({
    plugins: {
        annotation: { // Nota: Requiere plugin chartjs-plugin-annotation (Si no lo tienes, simplemente no se dibujará la línea, no rompe nada)
            annotations: {
                line1: {
                    type: 'line',
                    xMin: props.splitMonth - 1,
                    xMax: props.splitMonth - 1,
                    borderColor: 'gray',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    label: { content: 'Cambio de Estrategia', enabled: true }
                }
            }
        }
    }
}));
</script>

<template>
    <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-200 h-full">
        <h3 class="text-sm font-bold text-slate-700 mb-4">Dinámica de Sustitución Mensual</h3>
        <div class="h-[300px]">
            <BaseChart type="line" :data="chartData" :options="chartOptions" />
        </div>
    </div>
</template>