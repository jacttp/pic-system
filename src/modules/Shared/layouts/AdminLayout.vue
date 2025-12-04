<script setup lang="ts">
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import { useRouter, useRoute } from 'vue-router';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute(); 

const handleLogout = () => {
    auth.logout();
};

// Función para determinar si el link está activo visualmente
// Compara si la ruta actual comienza con la ruta del link (para sub-rutas)
const isActive = (path: string) => {
    if (path === '/') return route.path === '/'; // Home exacto
    return route.path.startsWith(path);
};
</script>

<template>
    <div class="flex h-screen bg-slate-50 overflow-hidden">
        
        <aside class="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col shrink-0 z-50">
            
            <router-link to="/" class="p-6 border-b border-slate-100 flex items-center gap-3 text-brand-800 font-bold text-xl hover:bg-slate-50 transition-colors group">
                <div class="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
                    <i class="fa-solid fa-layer-group"></i>
                </div>
                PIC System
            </router-link>

            <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
                
                <p class="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-2">
                    Analítica
                </p>
                
                <router-link 
                    to="/" 
                    class="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors font-medium"
                    :class="isActive('/') && route.path === '/' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-600'"
                >
                    <i class="fa-solid fa-grid-2 w-5 text-center"></i> Hub Central
                </router-link>

                <router-link 
                    to="/admin/pic" 
                    class="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors font-medium"
                    :class="isActive('/admin/pic') ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-600'"
                >
                    <i class="fa-solid fa-chart-pie w-5 text-center"></i> Reporte PIC
                </router-link>

                <p class="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-6">
                    Gestión & Catálogos
                </p>
                
                <router-link 
                    to="/admin/users" 
                    class="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors font-medium"
                    :class="isActive('/admin/users') ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-600'"
                >
                    <i class="fa-solid fa-users w-5 text-center"></i> Usuarios
                </router-link>

                <router-link 
                    to="/admin/products" 
                    class="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors font-medium"
                    :class="isActive('/admin/products') ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-600'"
                >
                    <i class="fa-solid fa-boxes-stacked w-5 text-center"></i> Productos
                </router-link>

                <router-link 
                    to="/admin/clients" 
                    class="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors font-medium"
                    :class="isActive('/admin/clients') ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-600'"
                >
                    <i class="fa-solid fa-store w-5 text-center"></i> Clientes
                </router-link>

                <p class="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-6">
                    Sistema
                </p>

                <router-link 
                    to="/admin/audit" 
                    class="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors font-medium"
                    :class="isActive('/admin/audit') ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-600'"
                >
                    <i class="fa-solid fa-shield-cat w-5 text-center"></i> Auditoría
                </router-link>

            </nav>

            <div class="p-4 border-t border-slate-100 bg-slate-50/50">
                <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-white transition-all group relative cursor-default border border-transparent hover:border-slate-200 hover:shadow-sm">
                    <div class="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                        {{ auth.user?.username.substring(0,2).toUpperCase() }}
                    </div>
                    <div class="overflow-hidden">
                        <p class="text-sm font-bold text-slate-700 truncate">{{ auth.user?.username }}</p>
                        <p class="text-[10px] uppercase font-bold text-slate-400 truncate tracking-wide">{{ auth.user?.role }}</p>
                    </div>
                    
                    <button @click="handleLogout" class="ml-auto text-slate-400 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded-md" title="Cerrar Sesión">
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