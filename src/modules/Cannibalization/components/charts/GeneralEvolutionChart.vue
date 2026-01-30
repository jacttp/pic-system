<script setup lang="ts">
import { computed } from 'vue';
import { useCannibalizationStore } from '../../stores/cannibalizationStore';
import BaseChart from '@/modules/Shared/components/charts/BaseChart.vue';
import type { ChartData, ChartOptions } from 'chart.js';

const store = useCannibalizationStore();

// --- LÓGICA DE AGREGACIÓN ---
const aggregatedData = computed(() => {
    // 1. Inicializar acumuladores
    const sumVictimKg = new Array(12).fill(0);
    const sumCannibalKg = new Array(12).fill(0);
    
    // Sets para contar clientes únicos por rol (Víctima vs Caníbal)
    const countVictimClients = Array.from({ length: 12 }, () => new Set<string>());
    const countCannibalClients = Array.from({ length: 12 }, () => new Set<string>());

    // 2. Iterar sobre casos detectados
    store.detectedCases.forEach(c => {
        // Recuperar nodo cliente y familia
        const clientNode = store.rawData.find(cli => cli.name === c.clientName);
        if (!clientNode) return;
        
        const familyNode = clientNode.families.find(f => f.name === c.family);
        if (!familyNode) return;

        // Recuperar SKUs
        const victimSku = familyNode.skus.find(s => s.name === c.victimSku);
        const cannibalSku = familyNode.skus.find(s => s.name === c.cannibalSku);

        // 3. Procesar mes a mes
        for (let i = 0; i < 12; i++) {
            const vVal = victimSku?.salesVector[i] || 0;
            const cVal = cannibalSku?.salesVector[i] || 0;

            // Sumar Kilos
            sumVictimKg[i] += vVal;
            sumCannibalKg[i] += cVal;

            // Contar Cobertura (Si hubo venta > 0, el cliente "cubrió" ese SKU ese mes)
            if (vVal > 0) countVictimClients[i].add(clientNode.id);
            if (cVal > 0) countCannibalClients[i].add(clientNode.id);
        }
    });

    return {
        victimKg: sumVictimKg,
        cannibalKg: sumCannibalKg,
        victimClients: countVictimClients.map(s => s.size),
        cannibalClients: countCannibalClients.map(s => s.size)
    };
});

// --- CONFIGURACIÓN CHART.JS ---
const chartData = computed<ChartData>(() => ({
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
    datasets: [
        // --- EJE IZQUIERDO: VOLUMEN (Líneas Sólidas) ---
        {
            label: 'Vol. Víctima (Kg)',
            data: aggregatedData.value.victimKg,
            borderColor: '#ef4444', // Red-500
            backgroundColor: '#ef4444',
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 2,
            yAxisID: 'y'
        },
        {
            label: 'Vol. Caníbal (Kg)',
            data: aggregatedData.value.cannibalKg,
            borderColor: '#22c55e', // Green-500
            backgroundColor: '#22c55e',
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 2,
            yAxisID: 'y'
        },
        // --- EJE DERECHO: COBERTURA (Líneas Punteadas) ---
        {
            label: 'Clients Víctima',
            data: aggregatedData.value.victimClients,
            borderColor: '#fca5a5', // Red-300 (Más suave)
            backgroundColor: '#fca5a5',
            borderWidth: 2,
            borderDash: [5, 5], // Punteada
            tension: 0.3,
            pointStyle: 'rectRot',
            pointRadius: 4,
            yAxisID: 'y1'
        },
        {
            label: 'Clients Caníbal',
            data: aggregatedData.value.cannibalClients,
            borderColor: '#86efac', // Green-300 (Más suave)
            backgroundColor: '#86efac',
            borderWidth: 2,
            borderDash: [5, 5], // Punteada
            tension: 0.3,
            pointStyle: 'rectRot',
            pointRadius: 4,
            yAxisID: 'y1'
        }
    ]
}));

const chartOptions = computed<ChartOptions>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
        mode: 'index',
        intersect: false,
    },
    plugins: {
        legend: {
            position: 'bottom',
            labels: { usePointStyle: true, boxWidth: 8, font: { size: 10 } }
        },
        tooltip: {
            callbacks: {
                label: (context) => {
                    const label = context.dataset.label || '';
                    const val = context.parsed.y;
                    // Formato condicional según si es Kg o Clientes
                    if (label.includes('Kg')) return `${label}: ${new Intl.NumberFormat('es-MX').format(val)} kg`;
                    return `${label}: ${val} Ctes`;
                }
            }
        },
        annotation: {
            annotations: {
                line1: {
                    type: 'line',
                    xMin: store.rules.splitMonth - 1,
                    xMax: store.rules.splitMonth - 1,
                    borderColor: 'gray',
                    borderWidth: 1,
                    borderDash: [2, 2],
                    label: { 
                        display: true,
                        content: 'Estrategia',
                        position: 'start',
                        color: 'gray',
                        font: { size: 9 }
                    }
                }
            }
        }
    },
    scales: {
        x: {
            grid: { display: false }
        },
        y: { // Eje Volumen
            type: 'linear',
            display: true,
            position: 'left',
            title: { display: true, text: 'Volumen (Kg)', color: '#64748b', font: { size: 10 } },
            grid: { color: '#f1f5f9' }
        },
        y1: { // Eje Clientes
            type: 'linear',
            display: true,
            position: 'right',
            title: { display: true, text: 'Cobertura (Clientes)', color: '#64748b', font: { size: 10 } },
            grid: { display: false }, // Sin grid para no ensuciar
            beginAtZero: true
        }
    }
}));
</script>

<template>
    <div class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm h-full flex flex-col relative overflow-hidden w-full">
        <div class="flex justify-between items-start mb-2 shrink-0">
            <div>
                <h3 class="font-bold text-slate-700 text-sm flex items-center gap-2">
                    <i class="fa-solid fa-chart-line text-slate-400"></i>
                    Tendencia General y Cobertura
                </h3>
                <p class="text-[10px] text-slate-400">
                    Sólida: Volumen (Kg) • Punteada: Clientes Únicos
                </p>
            </div>
        </div>
        
        <div class="flex-1 min-h-0 relative w-full">
            <BaseChart type="line" :data="chartData" :options="chartOptions" />
        </div>
    </div>
</template>