<script setup lang="ts">
import { computed, ref, onMounted, watch, onUnmounted, shallowRef } from 'vue';
import * as echarts from 'echarts';
import { usePicChatStore } from '../../stores/picChatStore';

const props = defineProps<{
    option: any;
    title?: string;
    enableSwitch?: boolean;
}>();

const chartRef = ref<HTMLDivElement | null>(null);
const chartInstance = shallowRef<echarts.ECharts | null>(null);
const currentType = ref<'bar' | 'line'>('bar');
const chatStore = usePicChatStore();
const hasCartesianZoom = computed(() =>
    Array.isArray(props.option?.dataZoom) &&
    props.option.dataZoom.some((zoom: any) => zoom?.yAxisIndex !== undefined)
);

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const handleVerticalWheelZoom = (event: WheelEvent) => {
    if (!event.altKey || !chartInstance.value || !chartRef.value || !hasCartesianZoom.value) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const option = chartInstance.value.getOption();
    const dataZoom = Array.isArray(option.dataZoom) ? option.dataZoom : [];
    const verticalZoom = dataZoom.find((zoom: any) => zoom?.id === 'pic-y-axis-zoom') as any;
    if (!verticalZoom) return;

    const start = Number(verticalZoom.start ?? 0);
    const end = Number(verticalZoom.end ?? 100);
    const currentSpan = Math.max(end - start, 1);
    const zoomFactor = event.deltaY < 0 ? 0.82 : 1.22;
    const nextSpan = clamp(currentSpan * zoomFactor, 5, 100);
    const bounds = chartRef.value.getBoundingClientRect();
    const pointerPercent = clamp((1 - (event.clientY - bounds.top) / Math.max(bounds.height, 1)) * 100, 0, 100);
    const anchor = clamp((pointerPercent - start) / currentSpan, 0, 1);

    let nextStart = pointerPercent - anchor * nextSpan;
    let nextEnd = nextStart + nextSpan;

    if (nextStart < 0) {
        nextEnd -= nextStart;
        nextStart = 0;
    }
    if (nextEnd > 100) {
        nextStart -= nextEnd - 100;
        nextEnd = 100;
    }

    chartInstance.value.dispatchAction({
        type: 'dataZoom',
        dataZoomId: 'pic-y-axis-zoom',
        start: clamp(nextStart, 0, 100),
        end: clamp(nextEnd, 0, 100)
    });
};

// Aplica la opción al chart, respetando el tipo de vista actual (bar/line)
const applyOption = () => {
    if (!chartInstance.value || !props.option) return;

    let finalOption = props.option;

    if (currentType.value === 'line') {
        finalOption = {
            ...props.option,
            series: (props.option.series || []).map((s: any) => ({
                ...s,
                type: 'line',
                smooth: true,
                symbol: 'circle',
                symbolSize: 5,
                barMaxWidth: undefined,
                itemStyle: { ...s.itemStyle, borderRadius: 0 }
            }))
        };
    }

    chartInstance.value.setOption(finalOption, { notMerge: true, lazyUpdate: false });
};

const initChart = () => {
    if (!chartRef.value) return;
    chartInstance.value?.dispose();
    chartInstance.value = echarts.init(chartRef.value, null, { renderer: 'canvas' });
    applyOption();
};

// El option es un objeto computed → nueva referencia en cada cambio → watch shallow
watch(() => props.option, () => applyOption());
watch(currentType, () => applyOption());

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
    initChart();
    if (chartRef.value) {
        resizeObserver = new ResizeObserver(() => {
            chartInstance.value?.resize();
        });
        resizeObserver.observe(chartRef.value);
        chartRef.value.addEventListener('wheel', handleVerticalWheelZoom, { capture: true, passive: false });
    }
});

onUnmounted(() => {
    resizeObserver?.disconnect();
    chartRef.value?.removeEventListener('wheel', handleVerticalWheelZoom, true);
    chartInstance.value?.dispose();
    chartInstance.value = null;
});

// Enviar datos simplificados al chat de IA
const handleAnalyze = () => {
    if (!props.option) return;
    const firstSeries = props.option.series?.[0];
    const isPie = firstSeries?.type === 'pie';
    const pieData = Array.isArray(firstSeries?.data) ? firstSeries.data : [];

    const simplified = {
        labels: isPie ? pieData.map((d: any) => d.name) : props.option.xAxis?.data || [],
        datasets: isPie
            ? [{
                label: firstSeries.name,
                data: pieData.map((d: any) => d.value)
            }]
            : (props.option.series || []).map((s: any) => ({
                label: s.name,
                data: Array.isArray(s.data)
                    ? s.data.map((d: any) => (typeof d === 'object' && d !== null ? d.value : d))
                    : []
            }))
    };
    chatStore.setContext(props.title || 'Gráfico', simplified, 'chart');
};
</script>

<template>
    <div class="pic-chart-card group relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-pic-border bg-pic-surface p-5 shadow-sm transition-shadow hover:shadow-md md:rounded-xl lg:p-5">

        <div class="mb-3 flex items-center justify-between gap-3">
            <h3 v-if="title" class="flex min-w-0 items-center gap-2 text-base font-black text-pic-text-main md:text-[15px] md:font-bold">
                <i class="fa-solid fa-chart-simple text-pic-brand"></i>
                <span class="truncate">{{ title }}</span>
            </h3>

            <div class="ml-auto flex items-center gap-2">
                <span
                    v-if="hasCartesianZoom"
                    data-pic-print-control="true"
                    class="flex h-7 w-7 items-center justify-center rounded-lg text-pic-text-muted"
                    title="Escala Y automática. Rueda: recortar periodos. Alt + rueda: zoom vertical."
                    aria-label="Ayuda de escala y zoom del gráfico"
                >
                    <i class="fa-solid fa-magnifying-glass-chart text-xs"></i>
                </span>

                <button
                    data-pic-print-control="true"
                    @click="handleAnalyze"
                    class="flex h-7 w-7 items-center justify-center rounded-lg border border-transparent text-pic-text-muted transition-all hover:border-pic-brand-border hover:bg-pic-brand-soft hover:text-pic-brand"
                    title="Analizar este gráfico con IA"
                >
                    <i class="fa-solid fa-wand-magic-sparkles text-xs"></i>
                </button>

                <div v-if="enableSwitch" data-pic-print-control="true" class="flex gap-1 rounded-lg bg-pic-muted-surface p-1">
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

        <!-- ECharts se monta aquí. flex-1 lo hace crecer para llenar el card -->
        <div ref="chartRef" class="pic-chart-surface min-h-[300px] w-full min-w-0 flex-1 md:min-h-[320px] xl:min-h-[350px]"></div>
    </div>
</template>
