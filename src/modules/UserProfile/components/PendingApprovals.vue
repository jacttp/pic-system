<!-- src/modules/UserProfile/components/PendingApprovals.vue -->
<script setup lang="ts">
/**
 * Widget de solicitudes pendientes que consume approvalsStore.
 * Se muestra en el perfil del usuario.
 */
import { onMounted, computed } from 'vue';
import { useApprovalsStore } from '@/modules/Approvals/stores/approvalsStore';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import { APPROVAL_STATUS_CONFIG } from '@/modules/Approvals/types/approval.types';

const approvalsStore = useApprovalsStore();
const authStore = useAuthStore();

const isApprover = computed(() => (authStore.user?.accessLevel ?? 1) >= 3);

onMounted(() => {
   if (approvalsStore.approvals.length === 0) {
      approvalsStore.fetchApprovals();
   }
});

// Mostrar hasta 5 solicitudes relevantes
const recentApprovals = computed(() => {
   return approvalsStore.approvals.slice(0, 5);
});
</script>

<template>
   <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <!-- Header -->
      <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50 to-white">
         <div class="flex items-center gap-2">
            <i class="fa-solid fa-clipboard-list text-amber-500"></i>
            <span class="text-sm font-semibold text-slate-700">
               {{ isApprover ? 'Aprobaciones Pendientes' : 'Mis Solicitudes' }}
            </span>
         </div>
         <div v-if="approvalsStore.pendingCount > 0"
              class="bg-amber-500 text-white text-[10px] font-bold min-w-[20px] h-5 flex items-center justify-center rounded-full px-1.5">
            {{ approvalsStore.pendingCount }}
         </div>
      </div>

      <!-- Loading -->
      <div v-if="approvalsStore.isLoading" class="p-4 space-y-2">
         <div v-for="i in 3" :key="i" class="animate-pulse flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-slate-100"></div>
            <div class="h-3 bg-slate-100 rounded flex-1"></div>
         </div>
      </div>

      <!-- Empty -->
      <div v-else-if="recentApprovals.length === 0" class="p-6 flex flex-col items-center justify-center text-center">
         <div class="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mb-3">
            <i class="fa-solid fa-inbox text-amber-300 text-lg"></i>
         </div>
         <p class="text-sm text-slate-500">Sin solicitudes</p>
      </div>

      <!-- List -->
      <div v-else class="divide-y divide-slate-50 max-h-56 overflow-y-auto">
         <div 
            v-for="approval in recentApprovals" 
            :key="approval.id"
            class="px-4 py-2.5 flex items-center gap-2.5 hover:bg-slate-50/50 transition-colors"
         >
            <span class="w-2 h-2 rounded-full shrink-0"
                  :class="{
                     'bg-amber-400': approval.status === 'PENDING',
                     'bg-emerald-400': approval.status === 'APPROVED',
                     'bg-red-400': approval.status === 'REJECTED',
                     'bg-slate-300': approval.status === 'CANCELLED',
                  }"></span>
            <div class="flex-1 min-w-0">
               <p class="text-sm text-slate-700 truncate">{{ approval.title }}</p>
               <p class="text-[10px] text-slate-400">
                  {{ APPROVAL_STATUS_CONFIG[approval.status]?.label }} · {{ approval.requestedBy }}
               </p>
            </div>
         </div>
      </div>

      <!-- Footer link -->
      <div class="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
         <router-link 
            to="/admin/approvals" 
            class="text-xs text-amber-600 hover:text-amber-800 font-medium transition-colors flex items-center gap-1"
         >
            Ver todas las solicitudes
            <i class="fa-solid fa-arrow-right text-[9px]"></i>
         </router-link>
      </div>
   </div>
</template>
