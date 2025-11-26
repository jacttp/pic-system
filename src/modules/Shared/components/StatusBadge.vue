<!-- src/modules/Shared/components/StatusBadge.vue -->
<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    status: string | boolean | number;
    type?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}>();

const colorClasses = computed(() => {
    // Si nos pasan un tipo explícito, lo usamos
    if (props.type) {
        switch (props.type) {
            case 'success': return 'bg-green-100 text-green-700 border-green-200';
            case 'warning': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'danger': return 'bg-red-100 text-red-700 border-red-200';
            case 'info': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    }

    // Lógica automática basada en el valor del status
    const s = String(props.status).toLowerCase();
    if (['activo', '1', 'true', 'completado', 'pagado'].includes(s)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (['inactivo', '0', 'false', 'cancelado', 'baja'].includes(s)) return 'bg-slate-100 text-slate-500 border-slate-200';
    if (['pendiente', 'en proceso', 'alerta'].includes(s)) return 'bg-amber-50 text-amber-700 border-amber-200';
    
    return 'bg-slate-100 text-slate-700 border-slate-200';
});

const label = computed(() => {
    if (props.status === true || props.status === 1) return 'Activo';
    if (props.status === false || props.status === 0) return 'Inactivo';
    return props.status;
});
</script>

<template>
    <span 
        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
        :class="colorClasses"
    >
        <span class="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-60"></span>
        {{ label }}
    </span>
</template>