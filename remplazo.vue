<script setup lang="ts">
import { ref } from 'vue'; // <--- Importar ref
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import { useRouter, useRoute } from 'vue-router';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute(); 

// <--- NUEVO: Estado del sidebar
const isCollapsed = ref(false);

const handleLogout = () => {
    auth.logout();
};

const isActive = (path: string) => {
    if (path === '/') return route.path === '/'; 
    return route.path.startsWith(path);
};

// <--- NUEVO: Función para alternar
const toggleSidebar = () => {
    isCollapsed.value = !isCollapsed.value;
};
</script>

<template>
    <div class="flex h-screen bg-slate-50 overflow-hidden">
        
        <aside 
            class="bg-white border-r border-slate-200 hidden md:flex flex-col shrink-0 z-50 transition-all duration-300 ease-in-out"
            :class="isCollapsed ? 'w-20' : 'w-64'"
        >
            
            <div class="h-16 flex items-center border-b border-slate-100 transition-all duration-300"
                 :class="isCollapsed ? 'justify-center px-0' : 'justify-between px-6'">
                
                <router-link to="/" class="flex items-center gap-3 text-brand-800 font-bold text-xl group overflow-hidden whitespace-nowrap">
                    <div class="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0 transition-transform group-hover:scale-105">
                        <i class="fa-solid fa-layer-group"></i>
                    </div>
                    <span v-show="!isCollapsed" class="transition-opacity duration-300 delay-100">
                        PIC System
                    </span>
                </router-link>

            </div>

            <nav class="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                
                <p v-if="!isCollapsed" class="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 mt-2 transition-opacity duration-300">
                    Analítica
                </p>
                <div v-else class="h-px bg-slate-100 my-4 mx-2"></div>
                
                <router-link 
                    to="/" 
                    class="flex items-center gap-3 py-2.5 rounded-lg transition-all font-medium group relative"
                    :class="[
                        isActive('/') && route.path === '/' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-600',
                        isCollapsed ? 'justify-center px-0' : 'px-4'
                    ]"
                    title="Hub Central"
                >
                    <i class="fa-solid fa-grid-2 w-5 text-center text-lg"></i>
                    <span v-show="!isCollapsed" class="whitespace-nowrap">Hub Central</span>
                    
                    <div v-if="isCollapsed" class="absolute left-14 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                        Hub Central
                    </div>
                </router-link>

                <router-link 
                    to="/admin/pic" 
                    class="flex items-center gap-3 py-2.5 rounded-lg transition-all font-medium group relative"
                    :class="[
                        isActive('/admin/pic') ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-600',
                        isCollapsed ? 'justify-center px-0' : 'px-4'
                    ]"
                    title="Reporte PIC"
                >
                    <i class="fa-solid fa-chart-pie w-5 text-center text-lg"></i>
                    <span v-show="!isCollapsed" class="whitespace-nowrap">Reporte PIC</span>
                    
                    <div v-if="isCollapsed" class="absolute left-14 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                        Reporte PIC
                    </div>
                </router-link>

                <p v-if="!isCollapsed" class="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 mt-6 transition-opacity duration-300">
                    Gestión
                </p>
                <div v-else class="h-px bg-slate-100 my-4 mx-2"></div>
                
                <router-link 
                    to="/admin/users" 
                    class="flex items-center gap-3 py-2.5 rounded-lg transition-all font-medium group relative"
                    :class="[
                        isActive('/admin/users') ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-600',
                        isCollapsed ? 'justify-center px-0' : 'px-4'
                    ]"
                >
                    <i class="fa-solid fa-users w-5 text-center text-lg"></i>
                    <span v-show="!isCollapsed" class="whitespace-nowrap">Usuarios</span>
                    <div v-if="isCollapsed" class="absolute left-14 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">Usuarios</div>
                </router-link>

                <router-link 
                    to="/admin/products" 
                    class="flex items-center gap-3 py-2.5 rounded-lg transition-all font-medium group relative"
                    :class="[
                        isActive('/admin/products') ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-600',
                        isCollapsed ? 'justify-center px-0' : 'px-4'
                    ]"
                >
                    <i class="fa-solid fa-boxes-stacked w-5 text-center text-lg"></i>
                    <span v-show="!isCollapsed" class="whitespace-nowrap">Productos</span>
                    <div v-if="isCollapsed" class="absolute left-14 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">Productos</div>
                </router-link>

                <router-link 
                    to="/admin/clients" 
                    class="flex items-center gap-3 py-2.5 rounded-lg transition-all font-medium group relative"
                    :class="[
                        isActive('/admin/clients') ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-600',
                        isCollapsed ? 'justify-center px-0' : 'px-4'
                    ]"
                >
                    <i class="fa-solid fa-store w-5 text-center text-lg"></i>
                    <span v-show="!isCollapsed" class="whitespace-nowrap">Clientes</span>
                    <div v-if="isCollapsed" class="absolute left-14 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">Clientes</div>
                </router-link>

                <p v-if="!isCollapsed" class="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 mt-6 transition-opacity duration-300">
                    Sistema
                </p>
                <div v-else class="h-px bg-slate-100 my-4 mx-2"></div>

                <router-link 
                    to="/admin/audit" 
                    class="flex items-center gap-3 py-2.5 rounded-lg transition-all font-medium group relative"
                    :class="[
                        isActive('/admin/audit') ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-600',
                        isCollapsed ? 'justify-center px-0' : 'px-4'
                    ]"
                >
                    <i class="fa-solid fa-shield-cat w-5 text-center text-lg"></i>
                    <span v-show="!isCollapsed" class="whitespace-nowrap">Auditoría</span>
                    <div v-if="isCollapsed" class="absolute left-14 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">Auditoría</div>
                </router-link>

            </nav>

            <div class="p-3 border-t border-slate-100 bg-slate-50/50">
                
                <button 
                    @click="toggleSidebar"
                    class="w-full flex items-center justify-center text-slate-400 hover:text-brand-600 hover:bg-white p-2 rounded-lg mb-2 transition-all shadow-sm border border-transparent hover:border-slate-200"
                    :title="isCollapsed ? 'Expandir menú' : 'Colapsar menú'"
                >
                    <i class="fa-solid transition-transform duration-300" :class="isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'"></i>
                </button>

                <div 
                    class="flex items-center gap-3 p-2 rounded-lg hover:bg-white transition-all group relative cursor-default"
                    :class="isCollapsed ? 'justify-center' : ''"
                >
                    <div class="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-xs shadow-md shrink-0">
                        {{ auth.user?.username.substring(0,2).toUpperCase() }}
                    </div>
                    
                    <div v-if="!isCollapsed" class="overflow-hidden transition-opacity duration-300">
                        <p class="text-xs font-bold text-slate-700 truncate w-28">{{ auth.user?.username }}</p>
                        <p class="text-[10px] uppercase font-bold text-slate-400 truncate tracking-wide">{{ auth.user?.role }}</p>
                    </div>
                    
                    <button 
                        @click="handleLogout" 
                        class="text-slate-400 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded-md" 
                        :class="isCollapsed ? 'absolute -right-10 opacity-0 group-hover:opacity-100 group-hover:right-[-40px] bg-white shadow-md border border-slate-100' : 'ml-auto'"
                        title="Cerrar Sesión"
                    >
                        <i class="fa-solid fa-right-from-bracket"></i>
                    </button>
                </div>
            </div>
        </aside>

        <main class="flex-1 flex flex-col min-w-0 overflow-hidden relative">
            <router-view></router-view>
        </main>
    </div>
</template>

<style scoped>
/* Ocultar scrollbar pero permitir scroll */
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
</style>