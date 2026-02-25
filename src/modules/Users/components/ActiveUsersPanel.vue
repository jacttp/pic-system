<!-- src/modules/Users/components/ActiveUsersPanel.vue -->
<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue';
import { useUserStore } from '../stores/userStore';
import UserStatusBadge from './UserStatusBadge.vue';

const userStore = useUserStore();
const isExpanded = ref(true);

let pollInterval: ReturnType<typeof setInterval> | null = null;

// Polling cada 60 segundos
onMounted(() => {
   userStore.fetchActiveUsers();
   pollInterval = setInterval(() => {
      userStore.fetchActiveUsers();
   }, 60_000);
});

onUnmounted(() => {
   if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
   }
});

const activeCount = computed(() => userStore.activeUsers.length);

const formatLastSeen = (dateStr: string | null) => {
   if (!dateStr) return 'Sin actividad';
   const d = new Date(dateStr);
   const now = new Date();
   const diffMs = now.getTime() - d.getTime();
   const diffMins = Math.floor(diffMs / 60000);
   
   if (diffMins < 1) return 'En línea';
   if (diffMins < 60) return `Hace ${diffMins}m`;
   const diffHours = Math.floor(diffMins / 60);
   if (diffHours < 24) return `Hace ${diffHours}h`;
   return `Hace ${Math.floor(diffHours / 24)}d`;
};
</script>

<template>
   <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <!-- Header -->
      <button 
         @click="isExpanded = !isExpanded"
         class="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-white border-b border-slate-100 hover:from-emerald-100 transition-colors"
      >
         <div class="flex items-center gap-2.5">
            <div class="relative">
               <i class="fa-solid fa-users text-emerald-600"></i>
               <span class="absolute -top-1 -right-1.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            </div>
            <span class="text-sm font-semibold text-slate-700">Usuarios Activos</span>
            <span class="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
               {{ activeCount }}
            </span>
         </div>
         <i 
            class="fa-solid fa-chevron-down text-xs text-slate-400 transition-transform duration-200"
            :class="{ 'rotate-180': !isExpanded }"
         ></i>
      </button>

      <!-- Lista -->
      <transition name="slide">
         <div v-if="isExpanded" class="max-h-72 overflow-y-auto">
            <div v-if="activeCount === 0" class="p-6 text-center text-slate-400 text-sm">
               <i class="fa-solid fa-user-clock text-2xl mb-2 block"></i>
               No hay usuarios activos
            </div>

            <div v-else class="divide-y divide-slate-50">
               <div 
                  v-for="user in userStore.activeUsers" 
                  :key="user.IdUser"
                  class="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
               >
                  <div class="flex items-center gap-2.5">
                     <div class="relative">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                           {{ user.Usuario.substring(0, 2).toUpperCase() }}
                        </div>
                        <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                     </div>
                     <div>
                        <p class="text-sm font-medium text-slate-700 leading-tight">{{ user.Usuario }}</p>
                        <p class="text-[11px] text-slate-400">{{ user.Zona }} · {{ user.TipoUser }}</p>
                     </div>
                  </div>
                  <span class="text-[11px] text-emerald-600 font-medium">
                     {{ formatLastSeen(user.LastActivity) }}
                  </span>
               </div>
            </div>
         </div>
      </transition>
   </div>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
   transition: all 0.2s ease;
}
.slide-enter-from,
.slide-leave-to {
   max-height: 0;
   opacity: 0;
}
</style>
