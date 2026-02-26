<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import { useSetupStore } from '@/modules/Setup/stores/setupStores';
import { useProfileStore } from '@/modules/UserProfile/stores/profileStore';
import { useRouter, useRoute } from 'vue-router';
import NotificationCenter from '@/modules/UserProfile/components/NotificationCenter.vue';

const auth = useAuthStore();
const setupStore = useSetupStore();
const profileStore = useProfileStore();
const router = useRouter();
const route = useRoute(); 

const isCollapsed = ref(false);
const showNotifDropdown = ref(false);

let notifPoll: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
   await setupStore.fetchModules();
   // Cargar perfil (presencia) y notificaciones
   profileStore.fetchProfile();
   profileStore.fetchNotifications();
   notifPoll = setInterval(() => {
      profileStore.fetchNotifications();
   }, 120_000);
});

onUnmounted(() => {
   if (notifPoll) clearInterval(notifPoll);
});

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

const goToProfile = () => {
    router.push({ name: 'user-profile' });
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

                <div class="flex items-center gap-1">
                    <!-- Notification bell -->
                    <div class="relative">
                        <button 
                            @click="showNotifDropdown = !showNotifDropdown"
                            class="text-slate-400 hover:text-brand-600 p-2 rounded-lg hover:bg-slate-50 transition-all focus:outline-none relative"
                            title="Notificaciones"
                        >
                            <i class="fa-solid fa-bell text-lg"></i>
                            <span 
                                v-if="profileStore.unreadCount > 0"
                                class="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full px-1 shadow-sm"
                            >
                                {{ profileStore.unreadCount > 9 ? '9+' : profileStore.unreadCount }}
                            </span>
                        </button>

                        <!-- Dropdown -->
                        <transition name="dropdown-anim">
                            <div 
                                v-if="showNotifDropdown"
                                class="absolute left-full top-0 ml-2 w-80 z-[100] shadow-xl rounded-xl"
                            >
                                <NotificationCenter mode="dropdown" :max-items="8" />
                            </div>
                        </transition>
                        <div v-if="showNotifDropdown" @click="showNotifDropdown = false" class="fixed inset-0 z-[90]"></div>
                    </div>

                    <button 
                        @click="toggleSidebar"
                        v-show="!isCollapsed"
                        class="text-slate-400 hover:text-brand-600 p-2 rounded-lg hover:bg-slate-50 transition-all focus:outline-none"
                        :title="isCollapsed ? 'Expandir menú' : 'Colapsar menú'"
                    >
                        <i class="fa-solid text-lg" :class="isCollapsed ? 'fa-bars' : 'fa-indent'"></i>
                    </button>
                </div>

            </div>

            <!-- Collapsed: toggle btn at top of nav -->
            <button 
                v-if="isCollapsed"
                @click="toggleSidebar"
                class="mx-3 mt-3 mb-1 text-slate-400 hover:text-brand-600 p-2 rounded-lg hover:bg-slate-50 transition-all focus:outline-none"
                title="Expandir menú"
            >
                <i class="fa-solid fa-bars text-lg"></i>
            </button>

            <nav class="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                
                <!-- Skeleton Loading -->
                <div v-if="setupStore.isLoading" class="space-y-4 p-2">
                   <div v-for="i in 3" :key="i" class="animate-pulse">
                      <div class="h-3 bg-slate-100 rounded w-20 mb-2"></div>
                      <div class="h-10 bg-slate-100 rounded-lg"></div>
                      <div class="h-10 bg-slate-100 rounded-lg mt-1"></div>
                   </div>
                </div>

                <!-- Dynamic Menu -->
                <template v-else v-for="(modules, category) in setupStore.groupedMenu" :key="category">
                    
                   <!-- Category Header -->
                   <p v-if="!isCollapsed" class="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 mt-6 fade-in first:mt-2">
                       {{ category }}
                   </p>
                   <div v-else class="h-px bg-slate-100 my-4 mx-2"></div>

                   <!-- Modules Loop -->
                   <router-link 
                       v-for="mod in modules" 
                       :key="mod.ModuleId"
                       :to="mod.Route" 
                       class="flex items-center gap-3 py-2.5 rounded-lg transition-all font-medium group relative"
                       :class="[
                           isActive(mod.Route) ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-600',
                           isCollapsed ? 'justify-center px-0' : 'px-4'
                       ]"
                   >
                       <i :class="[mod.Icon, 'w-5 text-center text-lg']"></i>
                       <span v-show="!isCollapsed" class="whitespace-nowrap">{{ mod.Label }}</span>
                       <div v-if="isCollapsed" class="tooltip">{{ mod.Label }}</div>
                   </router-link>
                   
                </template>

            </nav>

            <!-- Footer: User info + Profile link -->
            <div class="p-3 border-t border-slate-100 bg-slate-50/50">
                <div 
                    @click="goToProfile"
                    class="flex items-center gap-3 p-2 rounded-lg hover:bg-white transition-all group relative cursor-pointer"
                    :class="isCollapsed ? 'justify-center' : ''"
                    title="Ver mi perfil"
                >
                    <div class="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0 relative">
                        {{ auth.user?.username.substring(0,2).toUpperCase() }}
                        <!-- Presence dot -->
                        <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                              :class="{
                                 'bg-emerald-500': profileStore.profile?.presenceStatus === 'online',
                                 'bg-amber-500': profileStore.profile?.presenceStatus === 'busy',
                                 'bg-slate-400': !profileStore.profile || profileStore.profile?.presenceStatus === 'offline'
                              }"></span>
                    </div>
                    
                    <div v-if="!isCollapsed" class="overflow-hidden transition-opacity duration-300 flex-1">
                        <p class="text-xs font-bold text-slate-700 truncate w-32">{{ auth.user?.username }}</p>
                        <p class="text-[10px] uppercase font-bold text-slate-400 truncate tracking-wide">{{ auth.user?.role }}</p>
                    </div>
                    
                    <button 
                        @click.stop="handleLogout" 
                        class="text-slate-400 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded-md" 
                        :class="isCollapsed ? 'absolute left-10 top-0 opacity-0 group-hover:opacity-100 bg-white shadow-lg border border-slate-100 z-50 ml-4' : 'ml-auto'"
                        title="Cerrar Sesión"
                    >
                        <i class="fa-solid fa-right-from-bracket"></i>
                    </button>
                </div>
            </div>
        </aside>

        <main class="flex-1 flex flex-col min-w-0 overflow-y-auto relative">
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
    background-color: #1e293b;
    color: white;
    font-size: 0.75rem;
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

/* Notification dropdown animation */
.dropdown-anim-enter-active,
.dropdown-anim-leave-active {
    transition: all 0.15s ease;
}
.dropdown-anim-enter-from,
.dropdown-anim-leave-to {
    opacity: 0;
    transform: translateX(-8px);
}
</style>