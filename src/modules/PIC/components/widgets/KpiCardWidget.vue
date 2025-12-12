<script setup lang="ts">
import { formatCurrency, formatNumber } from '../../utils/formatters';

const props = defineProps<{
    config: {
        value: number;
        label: string;
        subtext?: string;
    };
}>();

const formattedValue = () => {
    // Si la etiqueta sugiere dinero ($$), usamos moneda. Si no, número estándar.
    const isMoney = props.config.label.includes('$') || props.config.label.toLowerCase().includes('venta');
    return isMoney ? formatCurrency(props.config.value) : formatNumber(props.config.value);
};
</script>

<template>
    <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col items-center justify-center text-center relative overflow-hidden group">
        <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <i class="fa-solid fa-chart-line text-6xl text-brand-600"></i>
        </div>

        <h4 class="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 z-10">
            {{ config.label }}
        </h4>
        
        <div class="text-4xl md:text-5xl font-black text-slate-800 z-10 mb-2 tracking-tight">
            {{ formattedValue() }}
        </div>
        
        <p v-if="config.subtext" class="text-xs text-slate-500 z-10 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
            {{ config.subtext }}
        </p>
    </div>
</template>