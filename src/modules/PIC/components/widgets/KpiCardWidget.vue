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
    <div class="group relative flex h-full flex-col items-center justify-center overflow-hidden rounded-xl border border-pic-border bg-pic-surface p-6 text-center shadow-sm">
        <div class="absolute right-0 top-0 p-4 opacity-5 transition-opacity group-hover:opacity-10">
            <i class="fa-solid fa-chart-line text-6xl text-pic-brand"></i>
        </div>

        <h4 class="z-10 mb-2 text-sm font-bold uppercase tracking-wider text-pic-text-muted">
            {{ config.label }}
        </h4>
        
        <div class="z-10 mb-2 text-4xl font-black tracking-tight text-pic-text-main md:text-5xl">
            {{ formattedValue() }}
        </div>
        
        <p v-if="config.subtext" class="z-10 rounded-full border border-pic-border bg-pic-muted-surface px-2 py-1 text-xs text-pic-text-muted">
            {{ config.subtext }}
        </p>
    </div>
</template>
