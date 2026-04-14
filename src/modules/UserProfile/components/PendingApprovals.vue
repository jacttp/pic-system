<!-- src/modules/UserProfile/components/PendingApprovals.vue -->
<script setup lang="ts">
/**
 * Widget de solicitudes pendientes que consume approvalsStore.
 * Rediseñado para interactividad y alta legibilidad.
 */
import { onMounted, computed, ref } from 'vue';
import { useApprovalsStore } from '@/modules/Approvals/stores/approvalsStore';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import { APPROVAL_STATUS_CONFIG } from '@/modules/Approvals/types/approval.types';
import type { Approval } from '@/modules/Approvals/types/approval.types';
import ApprovalDetailModal from '@/modules/Approvals/components/ApprovalDetailModal.vue';

const approvalsStore = useApprovalsStore();
const authStore = useAuthStore();

// Estado para el modal de detalle
const showDetailModal = ref(false);
const selectedApproval = ref<Approval | null>(null);

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

const handleViewDetail = (approval: Approval) => {
   selectedApproval.value = approval;
   showDetailModal.value = true;
};

const handleRefresh = () => {
   approvalsStore.fetchApprovals();
   approvalsStore.fetchAssignedApprovals();
};
</script>

<template>
   <div class="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50/50 to-white">
         <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
               <i class="fa-solid fa-clipboard-list text-amber-600 text-xs"></i>
            </div>
            <span class="text-sm font-black text-slate-800 uppercase tracking-widest">
               {{ isApprover ? 'Aprobaciones' : 'Mis Solicitudes' }}
            </span>
         </div>
         <div v-if="approvalsStore.pendingCount > 0"
              class="bg-amber-500 text-white text-[10px] font-black min-w-[22px] h-5.5 flex items-center justify-center rounded-lg px-2 shadow-lg shadow-amber-200/50">
            {{ approvalsStore.pendingCount }}
         </div>
      </div>

      <!-- Content Area -->
      <div class="flex-1 p-5 overflow-y-auto max-h-[400px]">
         <!-- Loading -->
         <div v-if="approvalsStore.isLoading" class="space-y-4">
            <div v-for="i in 3" :key="i" class="animate-pulse bg-slate-50 rounded-2xl p-4 border border-slate-100">
               <div class="h-4 bg-slate-200 rounded w-3/4 mb-3"></div>
               <div class="flex gap-2">
                  <div class="h-3 bg-slate-100 rounded w-20"></div>
                  <div class="h-3 bg-slate-100 rounded w-16"></div>
               </div>
            </div>
         </div>

         <!-- Empty -->
         <div v-else-if="recentApprovals.length === 0" class="py-12 flex flex-col items-center justify-center text-center">
            <div class="w-16 h-16 rounded-[2rem] bg-amber-50 flex items-center justify-center mb-4 border border-amber-100/50">
               <i class="fa-solid fa-inbox text-amber-200 text-2xl"></i>
            </div>
            <p class="text-[11px] font-black text-slate-400 uppercase tracking-widest">Sin solicitudes pendientes</p>
         </div>

         <!-- Interactive Cards List (Pure Vertical Stack) -->
         <div v-else class="grid grid-cols-1 gap-4">
            <button 
               v-for="approval in recentApprovals" 
               :key="approval.id"
               @click="handleViewDetail(approval)"
               class="w-full text-left p-4 rounded-2xl bg-white border border-slate-100 hover:border-amber-200 hover:shadow-md hover:shadow-amber-500/5 transition-all group relative overflow-hidden h-fit"
            >
               <!-- Subtle indicator bar -->
               <div class="absolute left-0 top-0 bottom-0 w-1 transition-colors"
                    :class="{
                       'bg-amber-400': approval.status === 'PENDING',
                       'bg-emerald-400': approval.status === 'APPROVED',
                       'bg-red-400': approval.status === 'REJECTED'
                    }"></div>

               <div class="flex flex-col gap-2">
                  <div class="flex items-start justify-between gap-3">
                     <p class="text-sm font-bold text-slate-800 leading-tight group-hover:text-amber-600 transition-colors line-clamp-2 min-h-[2.5rem]">
                        {{ approval.title }}
                     </p>
                     <i class="fa-solid fa-arrow-right text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all"></i>
                  </div>
                  
                  <!-- Metadata Highlights -->
                  <div class="flex flex-wrap items-center gap-2 mt-auto">
                     <span class="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                        <i class="fa-solid fa-user text-[8px] mr-1 opacity-50"></i>
                        {{ approval.requestedBy }}
                     </span>
                     
                     <span class="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter shadow-sm"
                           :class="{
                              'bg-amber-50 text-amber-600 border border-amber-100': approval.status === 'PENDING',
                              'bg-emerald-50 text-emerald-600 border border-emerald-100': approval.status === 'APPROVED',
                              'bg-red-50 text-red-600 border border-red-100': approval.status === 'REJECTED'
                           }">
                        {{ APPROVAL_STATUS_CONFIG[approval.status]?.label }}
                     </span>
                  </div>
               </div>
            </button>
         </div>
      </div>

      <!-- Footer link -->
      <div class="px-6 py-3 border-t border-slate-50 bg-slate-50/30">
         <router-link 
            to="/admin/approvals" 
            class="text-[10px] font-black text-amber-600 hover:text-amber-800 uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 group"
         >
            Ver panel de control
            <i class="fa-solid fa-chevron-right text-[8px] group-hover:translate-x-1 transition-transform"></i>
         </router-link>
      </div>

      <!-- Detail Modal Integration -->
      <ApprovalDetailModal
         v-model="showDetailModal"
         :approval="selectedApproval"
         :can-resolve="isApprover && selectedApproval?.status === 'PENDING'"
         @resolved="handleRefresh"
      />
   </div>
</template>
