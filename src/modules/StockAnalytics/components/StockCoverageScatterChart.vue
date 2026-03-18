<!-- src/modules/StockAnalytics/components/StockCoverageScatterChart.vue -->
<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick, computed } from 'vue';
import { useStockAnalyticsStore } from '../stores/stockAnalyticsStore';
import * as echarts from 'echarts/core';
import { ScatterChart } from 'echarts/charts';
import { TooltipComponent, GridComponent, MarkLineComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([ScatterChart, TooltipComponent, GridComponent, MarkLineComponent, CanvasRenderer]);

const store   = useStockAnalyticsStore();
const chartEl = ref<HTMLDivElement | null>(null);
let instance: echarts.ECharts | null = null;
let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

// ─── Filtros locales ──────────────────────────────────────────────────────────
const search      = ref('');
const speedMid    = ref(500);
const coverageMid = ref(4);

// ─── Datos derivados ─────────────────────────────────────────────────────────

const validPoints = computed(() =>
    store.coverage.filter(r => r.CoverageWeeks !== 999)
);

const stagnantCount = computed(() =>
    store.coverage.filter(r => r.CoverageWeeks === 999).length
);

const filteredPoints = computed(() => {
    const q = search.value.trim().toLowerCase();
    if (!q) return validPoints.value;
    return validPoints.value.filter(r =>
        r.SKU_NOMBRE.toLowerCase().includes(q) ||
        r.id_cliente.toLowerCase().includes(q)
    );
});

// ─── ECharts ─────────────────────────────────────────────────────────────────

function pointColor(speed: number, cov: number): string {
    if (speed >= speedMid.value && cov < coverageMid.value) return '#ef4444';  // Crítico
    if (speed <  speedMid.value && cov < coverageMid.value) return '#f59e0b';  // Bajo movimiento
    if (speed >= speedMid.value && cov >= coverageMid.value) return '#10b981'; // Óptimo
    return '#94a3b8';                                                           // Sobrestock lento
}

function buildOption() {
    const scatterData = filteredPoints.value.map(r => ({
        value: [r.AverageSalesKG, r.CoverageWeeks],
        name: `${r.id_cliente} | ${r.SKU_NOMBRE}`,
        extra: r,
    }));

    return {
        tooltip: {
            trigger: 'item',
            backgroundColor: '#1e293b',
            borderColor: '#334155',
            textStyle: { color: '#f1f5f9', fontSize: 11 },
            formatter: (p: { name: string; value: number[]; data: { extra: typeof store.coverage[0] } }) => {
                const r = p.data.extra;
                return [
                    `<b style="font-size:12px">${r.SKU_NOMBRE}</b>`,
                    `<span style="color:#94a3b8">${r.id_cliente}</span>`,
                    `<hr style="border:none;border-top:1px solid #334155;margin:5px 0"/>`,
                    `Vel. venta: <b>${r.AverageSalesKG.toFixed(1)} KG/sem</b>`,
                    `Inventario: <b>${r.CurrentStockKG.toFixed(1)} KG</b>`,
                    `Cobertura:  <b>${r.CoverageWeeks.toFixed(1)} sem</b>`,
                ].join('<br/>');
            },
        },
        grid: { left: 64, right: 24, top: 16, bottom: 48 },
        xAxis: {
            type: 'value', name: 'Velocidad venta (KG/sem)',
            nameLocation: 'middle', nameGap: 30,
            axisLabel: { fontSize: 10 },
            splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
        },
        yAxis: {
            type: 'value', name: 'Cobertura (sem)',
            nameLocation: 'middle', nameGap: 44,
            axisLabel: { fontSize: 10 },
            splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
        },
        series: [{
            type: 'scatter',
            data: scatterData,
            symbolSize: 9,
            itemStyle: {
                color: (p: { value: number[] }) => pointColor(p.value[0], p.value[1]),
                opacity: 0.80,
                borderColor: '#fff',
                borderWidth: 1,
            },
            markLine: {
                silent: true,
                lineStyle: { color: '#94a3b8', type: 'dashed', width: 1.5 },
                data: [
                    { xAxis: speedMid.value },
                    { yAxis: coverageMid.value },
                ],
                label: { show: false },
            },
        }],
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
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => instance?.resize(), 100);
});

onMounted(async () => {
    await nextTick();
    if (chartEl.value) ro.observe(chartEl.value);
    if (store.coverage.length) await renderChart();
});

onBeforeUnmount(() => {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    ro.disconnect();
    instance?.dispose();
    instance = null;
});

watch(
    [() => store.coverage.length, () => store.isLoadingData, filteredPoints, speedMid, coverageMid],
    async ([, loading]) => {
        if (!loading) await renderChart();
    }
);
</script>

<template>
    <div class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

        <!-- Header -->
        <div class="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3 flex-wrap">
            <h3 class="text-sm font-semibold text-slate-700 shrink-0">
                <i class="fa-solid fa-chart-scatter mr-2 text-rose-500"></i>
                Matriz de Riesgo de Cobertura
            </h3>

            <!-- Buscador local -->
            <input
                v-model="search"
                placeholder="Buscar SKU / cliente..."
                class="h-7 w-48 text-xs rounded-lg border border-slate-200 bg-white px-3
                       text-slate-700 placeholder:text-slate-300
                       focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 transition"
            />
        </div>

        <div class="px-4 pb-4 pt-3 space-y-3">

            <!-- Leyenda + estancados -->
            <div class="flex flex-wrap items-center gap-3">
                <span class="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span class="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Crítico
                </span>
                <span class="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Óptimo
                </span>
                <span class="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span class="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span> Bajo movimiento
                </span>
                <span class="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span class="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span> Sobrestock lento
                </span>
                <span
                    v-if="stagnantCount > 0"
                    class="ml-auto flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full
                           bg-purple-50 border border-purple-200 text-purple-700"
                >
                    <i class="fa-solid fa-triangle-exclamation text-[10px]"></i>
                    {{ stagnantCount }} estancado{{ stagnantCount !== 1 ? 's' : '' }} (excluidos)
                </span>
            </div>

            <!-- Sliders de umbral -->
            <div class="grid grid-cols-2 gap-x-8 gap-y-1 text-[11px] text-slate-500 pb-1 border-b border-slate-100">
                <div class="flex items-center gap-2">
                    <i class="fa-solid fa-bolt text-amber-400 w-3 text-center"></i>
                    <span class="shrink-0">Umbral velocidad</span>
                    <input
                        v-model.number="speedMid"
                        type="range" min="50" max="2000" step="50"
                        class="flex-1 accent-rose-500 cursor-pointer h-1"
                    />
                    <span class="w-16 text-right tabular-nums font-semibold text-slate-700">{{ speedMid }} KG</span>
                </div>
                <div class="flex items-center gap-2">
                    <i class="fa-solid fa-clock text-sky-400 w-3 text-center"></i>
                    <span class="shrink-0">Umbral cobertura</span>
                    <input
                        v-model.number="coverageMid"
                        type="range" min="1" max="16" step="0.5"
                        class="flex-1 accent-rose-500 cursor-pointer h-1"
                    />
                    <span class="w-16 text-right tabular-nums font-semibold text-slate-700">{{ coverageMid }} sem</span>
                </div>
            </div>

            <!-- Estado: cargando -->
            <div v-if="store.isLoadingData" class="h-64 flex items-center justify-center">
                <i class="fa-solid fa-circle-notch fa-spin text-2xl text-rose-400"></i>
            </div>
            <!-- Estado: sin datos -->
            <div v-else-if="!store.coverage.length" class="h-64 flex items-center justify-center text-sm text-slate-400">
                Sin datos de cobertura.
            </div>
            <!-- Estado: búsqueda sin resultados -->
            <div v-else-if="filteredPoints.length === 0" class="h-64 flex items-center justify-center text-sm text-slate-400">
                <i class="fa-solid fa-magnifying-glass mr-2 text-slate-300"></i>
                Sin resultados para "{{ search }}"
            </div>
            <!-- Gráfico -->
            <div
                ref="chartEl"
                class="w-full"
                :class="store.isLoadingData || !store.coverage.length || filteredPoints.length === 0 ? 'hidden' : 'h-64'"
            ></div>
        </div>
    </div>
</template>