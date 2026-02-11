<!-- src/modules/Hub/views/HubView.vue -->
<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import { useSetupStore } from '@/modules/Setup/stores/setupStores';
import ModuleCard from '../components/ModuleCard.vue';

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

const handleLogout = () => {
    auth.logout();
};

// Mapeo de estilos visuales por Key del módulo
// Si se agregan nuevos módulos en BD, usarán el estilo 'DEFAULT' si no se configuran aquí.
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
    
    

    'DEFAULT': { color: 'text-slate-500', bg: 'bg-slate-50', desc: 'Módulo del sistema.' }, 
};

const getStyle = (key: string) => {
    return MODULE_STYLES[key] || MODULE_STYLES['DEFAULT']!;
};

</script>

<template>
    <div class="flex h-screen bg-slate-50 overflow-hidden font-sans">
        
        <!-- SIDEBAR FIJO (Estilo Hub) -->
        <aside class="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col z-20">
            <div class="p-6 border-b border-slate-100">
                <div class="flex items-center gap-3 text-brand-800 font-bold text-xl">
                    <div class="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                        <i class="fa-solid fa-layer-group"></i>
                    </div>
                    PIC System
                </div>
            </div>
            
            <nav class="flex-1 p-4 space-y-1">
                <a href="#" class="flex items-center gap-3 px-4 py-3 bg-brand-50 text-brand-700 rounded-xl font-medium shadow-sm border border-brand-100">
                    <i class="fa-solid fa-grid-2 w-5"></i> Inicio
                </a>
                <!-- Placeholder links -->
                <a href="#" class="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                    <i class="fa-regular fa-bell w-5"></i> Notificaciones
                </a>
            </nav>

            <div class="p-4 border-t border-slate-100">
                <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <div class="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold">
                        {{ auth.user?.username.substring(0,2).toUpperCase() }}
                    </div>
                    <div class="overflow-hidden flex-1">
                        <p class="text-sm font-bold text-slate-700 truncate">{{ auth.user?.username }}</p>
                        <p class="text-xs text-slate-500 truncate">{{ auth.user?.role }}</p>
                    </div>
                    <button @click="handleLogout" class="text-slate-400 hover:text-red-500 transition-colors" title="Salir">
                        <i class="fa-solid fa-right-from-bracket"></i>
                    </button>
                </div>
            </div>
        </aside>

        <!-- CONTENIDO PRINCIPAL -->
        <main class="flex-1 p-8 lg:p-12 overflow-y-auto">
            <header class="mb-10 fade-in">
                <h1 class="text-3xl font-bold text-slate-800 mb-2">Bienvenido a PIC System</h1>
                <p class="text-slate-500">Selecciona un módulo para comenzar a trabajar.</p>
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
                    :description="getStyle(mod.ModuleKey).desc || 'Descripción no disponible.'"
                    :icon="mod.Icon"
                    :to="mod.Route"
                    :color-class="getStyle(mod.ModuleKey).color"
                    :bg-class="getStyle(mod.ModuleKey).bg"
                />

                <div v-if="setupStore.userMenu.length === 0" class="col-span-full text-center py-10 text-slate-400">
                    <i class="fa-solid fa-folder-open text-4xl mb-4"></i>
                    <p>No tienes módulos asignados. Contacta al administrador.</p>
                </div>

            </div>
        </main>
    </div>
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