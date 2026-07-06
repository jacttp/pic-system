<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, shallowRef } from 'vue';
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
    }
});

onUnmounted(() => {
    resizeObserver?.disconnect();
    chartInstance.value?.dispose();
    chartInstance.value = null;
});

// Enviar datos simplificados al chat de IA
const handleAnalyze = () => {
    if (!props.option) return;
    const simplified = {
        labels: props.option.xAxis?.data || [],
        datasets: (props.option.series || []).map((s: any) => ({
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
