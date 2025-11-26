<!-- src/modules/Shared/layouts/AdminLayout.vue -->
<script setup lang="ts">
// import { useAuthStore } from '@/modules/Auth/stores/authStore';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import { useRouter, useRoute } from 'vue-router';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute(); // Para saber qué link activar

const handleLogout = () => {
    auth.logout();
};

// Función simple para verificar ruta activa
const isActive = (path: string) => route.path.startsWith(path);
</script>

<template>
    <div class="flex h-screen bg-slate-50 overflow-hidden">
        
        <!-- SIDEBAR -->
        <aside class="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col shrink-0 z-20">
            <!-- Logo -->
            <div class="p-6 border-b border-slate-100 flex items-center gap-3 text-brand-800 font-bold text-xl">
                <div class="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                    <i class="fa-solid fa-layer-group"></i>
                </div>
                PIC Admin
            </div>

            <!-- Menú -->
            <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
                <p class="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-2">Principal</p>
                
                <router-link to="/" class="flex items-center gap-3 px-4 py-2.5 text-slate-600 hover:bg-slate-50 hover:text-brand-600 rounded-lg transition-colors">
                    <i class="fa-solid fa-grid-2 w-5"></i> Hub Central
                </router-link>

                <p class="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-6">Gestión</p>
                
                <router-link 
                    to="/admin/users" 
                    class="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors"
                    :class="isActive('/admin/users') ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-600'"
                >
                    <i class="fa-solid fa-users w-5"></i> Usuarios
                </router-link>

                <router-link 
                    to="/admin/products" 
                    class="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors"
                    :class="isActive('/admin/products') ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-600'"
                >
                    <i class="fa-solid fa-boxes-stacked w-5"></i> Productos
                </router-link>
            </nav>

            <!-- Perfil Usuario (Footer) -->
            <div class="p-4 border-t border-slate-100">
                <div class="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors group relative">
                    <div class="w-9 h-9 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold text-sm">
                        {{ auth.user?.username.substring(0,2).toUpperCase() }}
                    </div>
                    <div class="overflow-hidden">
                        <p class="text-sm font-bold text-slate-700 truncate">{{ auth.user?.username }}</p>
                        <p class="text-xs text-slate-500 truncate">{{ auth.user?.role }} - {{ auth.user?.zona }}</p>
                    </div>
                    
                    <!-- Botón de Salir (Tooltip simple) -->
                    <button @click="handleLogout" class="ml-auto text-slate-400 hover:text-red-500" title="Cerrar Sesión">
                        <i class="fa-solid fa-right-from-bracket"></i>
                    </button>
                </div>
            </div>
        </aside>

        <!-- CONTENIDO PRINCIPAL -->
        <main class="flex-1 flex flex-col min-w-0 overflow-hidden">
            <!-- El RouterView cargará aquí UserList o ProductList -->
            <router-view></router-view>
        </main>
    </div>
</template>