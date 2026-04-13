<!-- src/modules/Hub/views/HubView.vue -->
<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import { useSetupStore } from '@/modules/Setup/stores/setupStores';
import ModuleCard from '../components/ModuleCard.vue';
import CacheProgress from '../components/CacheProgress.vue';

const auth = useAuthStore();
const setupStore = useSetupStore();

onMounted(async () => {
   if (setupStore.modules.length === 0) {
       await setupStore.fetchModules();
   }
});

const dashboardModules = computed(() => {
    return setupStore.userMenu.filter(m => m.ModuleKey !== 'HUB');
});

// Mapeo de estilos visuales por Key del módulo
const MODULE_STYLES: Record<string, { color: string, bg: string, desc?: string }> = {
    'HUB': { color: 'text-brand-600', bg: 'bg-brand-50', desc: 'Panel central de bienvenida y accesos rápidos.' },
    'PIC': { color: 'text-brand-600', bg: 'bg-brand-50', desc: 'Dashboard analítico de ventas y metas.' },
    'PRODS': { color: 'text-orange-500', bg: 'bg-orange-50', desc: 'Alta, baja y modificación de artículos y listas de precios.' },
    'CLI': { color: 'text-emerald-500', bg: 'bg-emerald-50', desc: 'Directorio comercial, segmentación y datos de contacto.' },
    
    'USERS': { color: 'text-purple-500', bg: 'bg-purple-50', desc: 'Control de accesos, roles y administración de personal del sistema.' },
    'SETUP': { color: 'text-rose-800', bg: 'bg-fuchsia-50', desc: 'Dashboard analítico de ventas, cumplimiento de metas y análisis por zona.' },
    'AUDIT': { color: 'text-indigo-500', bg: 'bg-slate-100', desc: 'Historial de movimientos y seguridad del sistema.' },
    'LOGISTICS': { color: 'text-lime-600', bg: 'bg-lime-50', desc: 'Gestion, Edición, Alta y Publicación de Rutas e Itinerarios.' },
    
    'FORECAST': { color: 'text-violet-500', bg: 'bg-rose-50', desc: 'Dashboard analítico de Forecast, análisis y edición de metas y proyecciones.' },
    'VAL_CLI': { color: 'text-pink-500', bg: 'bg-pink-50', desc: 'Validación y aprobación de nuevos clientes.' },
    'CANNIB': {color: 'text-purple-600', bg: 'bg-purple-50', desc: 'Segmentación avanzada de clientes por volumen: cuartiles, quintiles, deciles y percentiles.'},
    'SEGMENT': {color: 'text-purple-600', bg: 'bg-purple-50', desc: 'Segmentación avanzada de clientes por volumen: cuartiles, quintiles, deciles y percentiles.'},
    'COM_STRUCT':    { color: 'text-teal-600',  bg: 'bg-teal-50',  desc: 'Gestión de la estructura territorial comercial: Gerencia, Zona, Jefatura y Ruta.' },
    'UPLOAD_METAS':  { color: 'text-teal-700',  bg: 'bg-teal-50',  desc: 'Importa archivos Excel con las metas de ventas y visualiza el histórico.' },

    'DEFAULT': { color: 'text-slate-500', bg: 'bg-slate-50', desc: 'Módulo del sistema.' }, 
};

const getStyle = (mod: any) => {
    const key = mod.ModuleKey;
    const fallback = MODULE_STYLES[key] || MODULE_STYLES['DEFAULT']!;
    
    return {
        color: mod.IconColor || fallback.color,
        bg: mod.BgColor || fallback.bg,
        desc: mod.Description || fallback.desc || 'Descripción no disponible.'
    };
};

</script>

<template>
    <!-- Solo contenido — el sidebar lo provee AdminLayout -->
    <main class="flex-1 p-8 lg:p-12 overflow-y-auto">
        <header class="mb-10 fade-in flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 class="text-3xl font-bold text-slate-800 mb-2">Bienvenido a PIC System</h1>
                <p class="text-slate-500">Selecciona un módulo para comenzar a trabajar.</p>
            </div>
            
            <!-- Indicador de Caché -->
            <CacheProgress />
        </header>

        <!-- Skeleton Loading -->
        <div v-if="setupStore.isLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <div v-for="i in 4" :key="i" class="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 h-64 animate-pulse">
                <div class="w-14 h-14 bg-slate-100 rounded-2xl mb-6"></div>
                <div class="h-6 bg-slate-100 rounded w-3/4 mb-4"></div>
                <div class="h-4 bg-slate-100 rounded w-full mb-2"></div>
                <div class="h-4 bg-slate-100 rounded w-5/6"></div>
            </div>
        </div>

        <!-- GRID DE MÓDULOS -->
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 fade-in" style="animation-delay: 0.1s;">
            
            <ModuleCard 
                v-for="mod in dashboardModules"
                :key="mod.ModuleId"
                :title="mod.Label"
                :description="getStyle(mod).desc"
                :icon="mod.Icon"
                :to="mod.Route"
                :color-class="getStyle(mod).color"
                :bg-class="getStyle(mod).bg"
            />

            <div v-if="setupStore.userMenu.length === 0" class="col-span-full text-center py-10 text-slate-400">
                <i class="fa-solid fa-folder-open text-4xl mb-4"></i>
                <p>No tienes módulos asignados. Contacta al administrador.</p>
            </div>

        </div>
    </main>
</template>

<style scoped>
.fade-in {
    animation: fadeIn 0.5s ease-out forwards;
    opacity: 0;
    transform: translateY(10px);
}

@keyframes fadeIn {
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>