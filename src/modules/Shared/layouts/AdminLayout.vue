<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import { useRouter, useRoute } from 'vue-router';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute(); 

const isCollapsed = ref(false); // Inicia expandido

const handleLogout = () => {
    auth.logout();
};

const isActive = (path: string) => {
    if (path === '/') return route.path === '/'; 
    return route.path.startsWith(path);
};

const toggleSidebar = () => {
    isCollapsed.value = !isCollapsed.value;
};
</script>

<template>
    <div class="flex h-screen bg-slate-50 overflow-hidden">
        
        <aside 
            class="bg-white border-r border-slate-200 hidden md:flex flex-col shrink-0 z-50 transition-all duration-300 ease-in-out relative"
            :class="isCollapsed ? 'w-20' : 'w-64'"
        >
            
            <div class="h-16 flex items-center border-b border-slate-100 transition-all duration-300 px-4"
                 :class="isCollapsed ? 'justify-center' : 'justify-between'">
                
                <router-link 
                    to="/" 
                    v-show="!isCollapsed"
                    class="flex items-center gap-3 text-brand-800 font-bold text-lg group overflow-hidden whitespace-nowrap transition-opacity duration-200"
                >
                    <div class="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                        <i class="fa-solid fa-layer-group"></i>
                    </div>
                    <span>PIC System</span>
                </router-link>

                <button 
                    @click="toggleSidebar"
                    class="text-slate-400 hover:text-brand-600 p-2 rounded-lg hover:bg-slate-50 transition-all focus:outline-none"
                    :title="isCollapsed ? 'Expandir menú' : 'Colapsar menú'"
                >
                    <i class="fa-solid text-lg" :class="isCollapsed ? 'fa-bars' : 'fa-indent'"></i>
                </button>

            </div>

            <nav class="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                
                <p v-if="!isCollapsed" class="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 mt-2 fade-in">
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
                >
                    <i class="fa-solid fa-chart-simple w-5 text-center text-lg"></i>
                    <span v-show="!isCollapsed" class="whitespace-nowrap">Hub Central</span>
                    <div v-if="isCollapsed" class="tooltip">Hub Central</div>
                </router-link>

                <router-link 
                    to="/admin/pic" 
                    class="flex items-center gap-3 py-2.5 rounded-lg transition-all font-medium group relative"
                    :class="[
                        isActive('/admin/pic') ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-600',
                        isCollapsed ? 'justify-center px-0' : 'px-4'
                    ]"
                >
                    <i class="fa-solid fa-chart-pie w-5 text-center text-lg"></i>
                    <span v-show="!isCollapsed" class="whitespace-nowrap">Reporte PIC</span>
                    <div v-if="isCollapsed" class="tooltip">Reporte PIC</div>
                </router-link>

                <router-link 
                    to="/admin/pic" 
                    class="flex items-center gap-3 py-2.5 rounded-lg transition-all font-medium group relative"
                    :class="[
                        isActive('/admin/pic-logistics') ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-600',
                        isCollapsed ? 'justify-center px-0' : 'px-4'
                    ]"
                >
                    <i class="fa-solid fa-route w-5 text-center text-lg"></i>
                    <span v-show="!isCollapsed" class="whitespace-nowrap">Logística</span>
                    <div v-if="isCollapsed" class="tooltip">Logística</div>
                </router-link>

                <router-link 
                    to="/admin/pic" 
                    class="flex items-center gap-3 py-2.5 rounded-lg transition-all font-medium group relative"
                    :class="[
                        isActive('/admin/pic-forecast') ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-600',
                        isCollapsed ? 'justify-center px-0' : 'px-4'
                    ]"
                >
                    <i class="fa-solid fa-arrow-tr w-5 text-center text-lg"></i>
                    <span v-show="!isCollapsed" class="whitespace-nowrap">Forecast</span>
                    <div v-if="isCollapsed" class="tooltip">Forecast</div>
                </router-link>

                <p v-if="!isCollapsed" class="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 mt-6 fade-in">
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
                    <div v-if="isCollapsed" class="tooltip">Usuarios</div>
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
                    <div v-if="isCollapsed" class="tooltip">Productos</div>
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
                    <div v-if="isCollapsed" class="tooltip">Clientes</div>
                </router-link>

                <router-link 
                    to="/admin/clients" 
                    class="flex items-center gap-3 py-2.5 rounded-lg transition-all font-medium group relative"
                    :class="[
                        isActive('/admin/clients-validation') ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-600',
                        isCollapsed ? 'justify-center px-0' : 'px-4'
                    ]"
                >
                    <i class="fa-solid fa-user-check w-5 text-center text-lg"></i>
                    <span v-show="!isCollapsed" class="whitespace-nowrap">Validación Clientes</span>
                    <div v-if="isCollapsed" class="tooltip">Validación Clientes</div>
                </router-link>

                <p v-if="!isCollapsed" class="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 mt-6 fade-in">
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
                    <div v-if="isCollapsed" class="tooltip">Auditoría</div>
                </router-link>

                <router-link 
                    to="/admin/audit" 
                    class="flex items-center gap-3 py-2.5 rounded-lg transition-all font-medium group relative"
                    :class="[
                        isActive('/admin/setup') ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-600',
                        isCollapsed ? 'justify-center px-0' : 'px-4'
                    ]"
                >
                    <i class="fa-solid fa-gear w-5 text-center text-lg"></i>
                    <span v-show="!isCollapsed" class="whitespace-nowrap">Setup</span>
                    <div v-if="isCollapsed" class="tooltip">Setup</div>
                </router-link>

            </nav>

            <div class="p-3 border-t border-slate-100 bg-slate-50/50">
                <div 
                    class="flex items-center gap-3 p-2 rounded-lg hover:bg-white transition-all group relative cursor-default"
                    :class="isCollapsed ? 'justify-center' : ''"
                >
                    <div class="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0">
                        {{ auth.user?.username.substring(0,2).toUpperCase() }}
                    </div>
                    
                    <div v-if="!isCollapsed" class="overflow-hidden transition-opacity duration-300">
                        <p class="text-xs font-bold text-slate-700 truncate w-32">{{ auth.user?.username }}</p>
                        <p class="text-[10px] uppercase font-bold text-slate-400 truncate tracking-wide">{{ auth.user?.role }}</p>
                    </div>
                    
                    <button 
                        @click="handleLogout" 
                        class="text-slate-400 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded-md" 
                        :class="isCollapsed ? 'absolute left-10 top-0 opacity-0 group-hover:opacity-100 bg-white shadow-lg border border-slate-100 z-50 ml-4' : 'ml-auto'"
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
/* Scrollbar fino */
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }

/* Animación suave para textos */
.fade-in {
    animation: fadeIn 0.3s ease-in;
}
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

/* Tooltip flotante reutilizable */
.tooltip {
    position: absolute;
    left: 100%;
    top: 50%;
    transform: translateY(-50%);
    margin-left: 10px;
    background-color: #1e293b; /* Slate-800 */
    color: white;
    font-size: 0.75rem; /* text-xs */
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s;
    white-space: nowrap;
    z-index: 100;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.group:hover .tooltip {
    opacity: 1;
}
</style>