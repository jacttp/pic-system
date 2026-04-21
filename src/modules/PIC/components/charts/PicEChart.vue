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
    <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col relative group transition-shadow hover:shadow-md">

        <div class="flex justify-between items-center mb-3">
            <h3 v-if="title" class="text-sm font-bold text-slate-700 flex items-center gap-2">
                <i class="fa-solid fa-chart-simple text-brand-500"></i>
                {{ title }}
            </h3>

            <div class="flex items-center gap-2 ml-auto">
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

        <!-- ECharts se monta aquí. flex-1 lo hace crecer para llenar el card -->
        <div ref="chartRef" class="flex-1 min-h-[250px] w-full"></div>
    </div>
</template>
