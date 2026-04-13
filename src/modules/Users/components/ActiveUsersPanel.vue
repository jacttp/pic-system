<!-- src/modules/Users/components/ActiveUsersPanel.vue -->
<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue';
import { useUserStore } from '../stores/userStore';

const props = defineProps<{
  isCompact?: boolean;
}>();

const userStore = useUserStore();

let pollInterval: ReturnType<typeof setInterval> | null = null;

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
   if (!dateStr) return 'Offline';
   const d = new Date(dateStr);
   const now = new Date();
   const diffMs = now.getTime() - d.getTime();
   const diffMins = Math.floor(diffMs / 60000);
   
   if (diffMins < 1) return 'Live';
   return `${diffMins}m`;
};
</script>

<template>
  <div 
    class="h-full bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md relative group"
  >
    <!-- Live Pulse Indicator Background -->
    <div class="absolute top-0 right-0 p-4">
      <span class="flex h-3 w-3">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
      </span>
    </div>

    <div class="p-4 flex-1 flex flex-col justify-between">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <i class="fa-solid fa-satellite-dish text-blue-600 text-[10px]"></i>
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Actividad en Vivo</span>
        </div>
        
        <div class="flex items-baseline gap-2">
          <p class="text-3xl font-black text-slate-900 tabular-nums leading-none">{{ activeCount }}</p>
          <span class="text-xs font-bold text-blue-500 uppercase tracking-tight">Usuarios Online</span>
        </div>
      </div>

      <!-- Avatar Stack -->
      <div class="mt-4 flex items-center justify-between">
        <div class="flex -space-x-2.5 overflow-hidden">
          <template v-for="(user, index) in userStore.activeUsers.slice(0, 5)" :key="user.IdUser">
            <div 
              class="inline-block h-8 w-8 rounded-xl ring-2 ring-white bg-gradient-to-br from-slate-700 to-slate-900 border border-slate-100 flex items-center justify-center text-[10px] font-bold text-white shadow-sm transition-transform hover:scale-110 hover:z-10 cursor-help"
              :title="`${user.Usuario} (${user.Zona}) - ${formatLastSeen(user.LastActivity)}`"
            >
              {{ user.Usuario.substring(0, 2).toUpperCase() }}
            </div>
          </template>
          <div 
            v-if="activeCount > 5"
            class="inline-block h-8 w-8 rounded-xl ring-2 ring-white bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200"
          >
            +{{ activeCount - 5 }}
          </div>
        </div>
        
        <div class="text-right">
          <p class="text-[9px] font-black text-slate-300 uppercase tracking-tighter">Sync cada 60s</p>
          <p class="text-[10px] font-bold text-emerald-500 flex items-center justify-end gap-1">
            <span class="w-1 h-1 rounded-full bg-emerald-500"></span>
            Sistema Estable
          </p>
        </div>
      </div>
    </div>
    
    <!-- Bottom line indicator -->
    <div class="h-1 w-full bg-gradient-to-r from-blue-500/20 via-blue-500 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
  </div>
</template>

