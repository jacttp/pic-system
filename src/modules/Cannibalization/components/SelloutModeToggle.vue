<script setup lang="ts">
import type { SelloutMode } from '../types/cannibalizationTypes';

defineProps<{ modelValue: SelloutMode }>();
const emit = defineEmits<{ 'update:modelValue': [SelloutMode] }>();

const modes: { value: SelloutMode; label: string; icon: string; desc: string }[] = [
    { value: 'sell', label: 'Sell vs Venta', icon: 'fa-chart-bar',      desc: 'Compara Sellout contra Venta interna mensual' },
    { value: 'sku',  label: 'SKU Sellout',   icon: 'fa-box-open',       desc: 'Sellout puro por SKU (top 10)' },
    { value: 'yoy',  label: 'Año vs Año',    icon: 'fa-calendar-check', desc: 'Comparativo YoY del Sellout' },
];
</script>

<template>
    <div class="flex gap-1 bg-slate-100 p-1 rounded-lg" role="tablist">
        <button
            v-for="m in modes"
            :key="m.value"
            role="tab"
            :aria-selected="modelValue === m.value"
            :title="m.desc"
            @click="emit('update:modelValue', m.value)"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 select-none"
            :class="modelValue === m.value
                ? 'bg-white text-purple-700 shadow-sm ring-1 ring-purple-100'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'"
        >
            <i :class="`fa-solid ${m.icon} text-[10px]`" />
            {{ m.label }}
        </button>
    </div>
</template>