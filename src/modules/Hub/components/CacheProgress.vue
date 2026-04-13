<!-- src/modules/Hub/components/CacheProgress.vue -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import api from '@/api/axios';

interface WarmupStatus {
    total: number;
    completed: number;
    failed: number;
    columnsDone: string[];
    inProgress: string | null;
    isComplete: boolean;
}

const status = ref<WarmupStatus | null>(null);
const timer = ref<any>(null);

const fetchStatus = async () => {
    try {
        const { data } = await api.get('/v2/setup/cache-status');
        status.value = data;
        
        // Si ya completó, podemos bajar la frecuencia de polling o detenerla
        if (data.isComplete && timer.value) {
            clearInterval(timer.value);
            timer.value = setInterval(fetchStatus, 30000); // Revisar cada 30s por si hubo reinicio
        }
    } catch (err) {
        console.error('Error fetching cache status:', err);
    }
};

onMounted(() => {
    fetchStatus();
    timer.value = setInterval(fetchStatus, 5000);
});

onUnmounted(() => {
    if (timer.value) clearInterval(timer.value);
});

const percentage = computed(() => {
    if (!status.value || status.value.total === 0) return 0;
    return Math.round((status.value.completed / status.value.total) * 100);
});

const statusColor = computed(() => {
    if (!status.value) return 'text-slate-400';
    if (status.value.isComplete) return 'text-emerald-500';
    return 'text-brand-600';
});
</script>

<template>
    <div v-if="status" class="flex items-center gap-3 px-4 py-2 bg-white rounded-xl border border-slate-100 shadow-sm transition-all duration-500">
        <!-- Icono con animación si está en progreso -->
        <div :class="statusColor">
            <i v-if="!status.isComplete" class="fa-solid fa-circle-notch fa-spin text-lg"></i>
            <i v-else class="fa-solid fa-circle-check text-lg"></i>
        </div>

        <div class="flex flex-col">
            <div class="flex items-center gap-2">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Optimización de Datos</span>
                <span v-if="!status.isComplete" class="text-xs font-mono bg-brand-50 text-brand-700 px-1.5 rounded">{{ percentage }}%</span>
            </div>
            
            <div class="text-[11px] leading-tight">
                <span v-if="!status.isComplete" class="text-slate-400 italic">
                    Procesando: <strong class="text-slate-600">{{ status.inProgress || 'Iniciando...' }}</strong>
                </span>
                <span v-else class="text-emerald-600 font-medium whitespace-nowrap">
                   Caché de filtros al día 
                   <span class="text-slate-400 font-normal ml-1">({{ status.total }}/{{ status.total }})</span>
                </span>
            </div>
        </div>

        <!-- Barra de progreso miniatura -->
        <div v-if="!status.isComplete" class="hidden sm:block w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden ml-2">
            <div 
                class="h-full bg-brand-500 transition-all duration-1000" 
                :style="{ width: `${percentage}%` }"
            ></div>
        </div>
    </div>
</template>
