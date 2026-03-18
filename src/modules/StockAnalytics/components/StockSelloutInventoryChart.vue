<!-- src/modules/StockAnalytics/components/StockSelloutInventoryChart.vue -->
<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useStockAnalyticsStore } from '../stores/stockAnalyticsStore';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import {
    TooltipComponent, LegendComponent,
    GridComponent, DataZoomComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([BarChart, LineChart, TooltipComponent, LegendComponent, GridComponent, DataZoomComponent, CanvasRenderer]);

const store   = useStockAnalyticsStore();
const chartEl = ref<HTMLDivElement | null>(null);
let instance: echarts.ECharts | null = null;
let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

function buildOption() {
    const weeks = store.weekColumns;

    const selloutData = weeks.map(w =>
        +store.selloutSummary.reduce((acc, r) => acc + (Number(r[String(w)]) || 0), 0).toFixed(1)
    );
    const inventoryData = weeks.map(w =>
        +store.inventorySummary.reduce((acc, r) => acc + (Number(r[String(w)]) || 0), 0).toFixed(1)
    );

    return {
        tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
        legend: { data: ['Sellout (KG)', 'Inventario (KG)'], bottom: 0 },
        grid: { left: 60, right: 60, top: 16, bottom: 60 },
        dataZoom: [{ type: 'inside' }],
        xAxis: {
            type: 'category',
            data: weeks.map(w => `Sem ${w}`),
            axisLabel: { fontSize: 11 },
        },
        yAxis: [
            { type: 'value', name: 'Sellout KG',    nameTextStyle: { fontSize: 11 }, axisLabel: { fontSize: 10 } },
            { type: 'value', name: 'Inventario KG', nameTextStyle: { fontSize: 11 }, axisLabel: { fontSize: 10 }, splitLine: { show: false } },
        ],
        series: [
            {
                name: 'Sellout (KG)',
                type: 'bar',
                yAxisIndex: 0,
                data: selloutData,
                itemStyle: { color: '#7c3aed', borderRadius: [3, 3, 0, 0] },
                barMaxWidth: 32,
            },
            {
                name: 'Inventario (KG)',
                type: 'line',
                yAxisIndex: 1,
                data: inventoryData,
                smooth: true,
                symbol: 'circle',
                symbolSize: 5,
                lineStyle: { color: '#0ea5e9', width: 2 },
                itemStyle: { color: '#0ea5e9' },
                areaStyle: { color: 'rgba(14,165,233,0.08)' },
            },
        ],
    };
}

async function renderChart() {
    await nextTick();
    if (!chartEl.value) return;

    if (!instance) {
        instance = echarts.init(chartEl.value, null, { renderer: 'canvas' });
    }

    instance.setOption(buildOption(), { notMerge: true });
}

const ro = new ResizeObserver(() => {
    // Debounce para evitar resize durante inicialización
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => instance?.resize(), 100);
});

onMounted(async () => {
    await nextTick();
    if (chartEl.value) ro.observe(chartEl.value);
    // Solo renderizar si ya hay datos
    if (store.selloutSummary.length || store.inventorySummary.length) {
        await renderChart();
    }
});

onBeforeUnmount(() => {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    ro.disconnect();
    instance?.dispose();
    instance = null;
});

// Watch sobre la longitud, no sobre el contenido profundo
watch(
    [() => store.selloutSummary.length, () => store.inventorySummary.length, () => store.isLoadingData],
    async ([, , loading]) => {
        if (!loading) await renderChart();
    }
);
</script>

<template>
    <div class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div class="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <h3 class="text-sm font-semibold text-slate-700">
                <i class="fa-solid fa-chart-mixed mr-2 text-violet-500"></i>
                Evolución Sellout vs Inventario
            </h3>
        </div>
        <div class="px-4 pb-4 pt-3">
            <div v-if="store.isLoadingData" class="h-72 flex items-center justify-center">
                <i class="fa-solid fa-circle-notch fa-spin text-2xl text-violet-400"></i>
            </div>
            <div v-else-if="!store.selloutSummary.length" class="h-72 flex items-center justify-center text-sm text-slate-400">
                Sin datos para el rango seleccionado.
            </div>
            <!-- El div del chart SIEMPRE existe en el DOM para que ECharts tenga referencia -->
            <div
                ref="chartEl"
                class="w-full"
                :class="store.isLoadingData || !store.selloutSummary.length ? 'hidden' : 'h-72'"
            ></div>
        </div>
    </div>
</template>