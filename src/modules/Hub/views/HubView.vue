<!-- src/modules/Hub/views/HubView.vue -->
<script setup lang="ts">
// import { useAuthStore } from '@/modules/Auth/stores/authStore';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import ModuleCard from '../components/ModuleCard.vue';

const auth = useAuthStore();

const handleLogout = () => {
    auth.logout();
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
                <h1 class="text-3xl font-bold text-slate-800 mb-2">Bienvenido al Portal Central</h1>
                <p class="text-slate-500">Selecciona un módulo para comenzar a trabajar.</p>
            </header>

            <!-- GRID DE MÓDULOS -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 fade-in" style="animation-delay: 0.1s;">
                
                <!-- 1. REPORTE PIC (LEGACY) -->
                <!-- IMPORTANTE: Cambia el href por la URL real de tu dashboard viejo -->
                <ModuleCard 
                    title="Reporte PIC"
                    description="Dashboard analítico de ventas, cumplimiento de metas y análisis por zona."
                    icon="fa-solid fa-chart-pie"
                    href="http://127.0.0.1:5500/index.html" 
                    color-class="text-brand-600"
                    bg-class="bg-brand-50"
                />

                <!-- 2. GESTIÓN DE USUARIOS (VUE) -->
                <ModuleCard 
                    title="Gestión de Usuarios"
                    description="Control de accesos, roles y administración de personal del sistema."
                    icon="fa-solid fa-users"
                    to="/admin/users"
                    color-class="text-purple-500"
                    bg-class="bg-purple-50"
                />

                <!-- 3. PRODUCTOS (VUE) -->
                <ModuleCard 
                    title="Catálogo Productos"
                    description="Alta, baja y modificación de artículos y listas de precios."
                    icon="fa-solid fa-boxes-stacked"
                    to="/admin/products"
                    color-class="text-orange-500"
                    bg-class="bg-orange-50"
                />

                <!-- 4. CLIENTES (Placeholder - Próximamente) -->
                <ModuleCard 
                    title="Cartera de Clientes"
                    description="Directorio comercial, segmentación y datos de contacto."
                    icon="fa-solid fa-store"
                    to="/admin/clients"
                    color-class="text-emerald-500"
                    bg-class="bg-emerald-50"
                />

                <!-- 5. AUDITORÍA (Placeholder) -->
                <ModuleCard 
                    title="Auditoría y Logs"
                    description="Historial de movimientos y seguridad del sistema."
                    icon="fa-solid fa-shield-cat"
                    to="/admin/audit"
                    color-class="text-slate-500"
                    bg-class="bg-slate-100"
                />

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