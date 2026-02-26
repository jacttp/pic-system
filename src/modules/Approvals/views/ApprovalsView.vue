<!-- src/modules/Approvals/views/ApprovalsView.vue -->
<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useApprovalsStore } from '../stores/approvalsStore';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import type { Approval, ApprovalFilters } from '../types/approval.types';
import ApprovalCard from '../components/ApprovalCard.vue';
import ApprovalFiltersBar from '../components/ApprovalFilters.vue';
import ApprovalDetailModal from '../components/ApprovalDetailModal.vue';

const approvalsStore = useApprovalsStore();
const authStore = useAuthStore();

// AccessLevel >= 2 puede resolver
const isApprover = computed(() => (authStore.user?.accessLevel ?? 1) >= 3);

// Modal state
const showDetailModal = ref(false);
const selectedApproval = ref<Approval | null>(null);

onMounted(() => {
   approvalsStore.fetchApprovals();
});

const handleFilter = (filters: ApprovalFilters) => {
   approvalsStore.fetchApprovals(filters);
};

const handleView = (id: number) => {
   selectedApproval.value = approvalsStore.approvals.find(a => a.id === id) || null;
   showDetailModal.value = true;
};

const handleResolve = (id: number) => {
   selectedApproval.value = approvalsStore.approvals.find(a => a.id === id) || null;
   showDetailModal.value = true;
};

const handleResolved = () => {
   approvalsStore.fetchApprovals();
};

const handleCancel = async (id: number) => {
   if (!confirm('¿Cancelar esta solicitud?')) return;
   try {
      await approvalsStore.cancelApproval(id);
   } catch {
      // error manejado por store
   }
};
</script>

<template>
   <div class="p-6 lg:p-8 max-w-[1200px] mx-auto">

      <!-- Header -->
      <div class="mb-6 flex items-start justify-between">
         <div>
            <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
               <i class="fa-solid fa-clipboard-list text-amber-500"></i>
               {{ isApprover ? 'Bandeja de Aprobaciones' : 'Mis Solicitudes' }}
            </h1>
            <p class="text-slate-500 text-sm mt-1">
               {{ isApprover ? 'Gestiona solicitudes pendientes del sistema.' : 'Estado de tus solicitudes enviadas.' }}
            </p>
         </div>

         <!-- Contador pendientes -->
         <div v-if="approvalsStore.pendingCount > 0" class="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-center">
            <div class="text-2xl font-bold text-amber-600">{{ approvalsStore.pendingCount }}</div>
            <div class="text-xs text-amber-500 font-medium">Pendientes</div>
         </div>
      </div>

      <!-- Filtros (solo aprobadores) -->
      <div v-if="isApprover" class="mb-6">
         <ApprovalFiltersBar @filter="handleFilter" />
      </div>

      <!-- Loading -->
      <div v-if="approvalsStore.isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
         <div v-for="i in 6" :key="i" class="bg-white rounded-xl border border-slate-100 p-4 animate-pulse">
            <div class="flex items-center gap-2 mb-3">
               <div class="w-8 h-8 bg-slate-100 rounded-lg"></div>
               <div class="h-4 bg-slate-100 rounded w-20"></div>
            </div>
            <div class="h-4 bg-slate-100 rounded w-3/4 mb-2"></div>
            <div class="h-3 bg-slate-100 rounded w-full mb-4"></div>
            <div class="h-3 bg-slate-100 rounded w-1/2"></div>
         </div>
      </div>

      <!-- Error -->
      <div v-else-if="approvalsStore.error" class="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
         <i class="fa-solid fa-circle-exclamation text-red-400 text-2xl mb-2"></i>
         <p class="text-sm text-red-600">{{ approvalsStore.error }}</p>
         <button @click="approvalsStore.fetchApprovals()" class="mt-3 text-xs text-red-600 hover:underline">Reintentar</button>
      </div>

      <!-- Empty -->
      <div v-else-if="approvalsStore.approvals.length === 0" class="bg-white rounded-xl border border-slate-200 p-12 text-center">
         <div class="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <i class="fa-solid fa-inbox text-amber-300 text-2xl"></i>
         </div>
         <h3 class="text-lg font-semibold text-slate-700 mb-1">Sin solicitudes</h3>
         <p class="text-sm text-slate-400">
            {{ isApprover ? 'No hay solicitudes que requieran tu atención.' : 'No has enviado ninguna solicitud aún.' }}
         </p>
      </div>

      <!-- Grid de solicitudes -->
      <template v-else>
         <!-- Sección: Pendientes -->
         <div v-if="approvalsStore.pendingApprovals.length > 0" class="mb-8">
            <h2 class="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
               <span class="w-2 h-2 rounded-full bg-amber-400"></span>
               Pendientes ({{ approvalsStore.pendingApprovals.length }})
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               <ApprovalCard 
                  v-for="approval in approvalsStore.pendingApprovals"
                  :key="approval.id"
                  :approval="approval"
                  :can-resolve="isApprover"
                  @view="handleView"
                  @resolve="handleResolve"
               />
            </div>
         </div>

         <!-- Sección: Historial -->
         <div v-if="approvalsStore.resolvedApprovals.length > 0">
            <h2 class="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
               <span class="w-2 h-2 rounded-full bg-slate-300"></span>
               Historial ({{ approvalsStore.resolvedApprovals.length }})
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               <ApprovalCard 
                  v-for="approval in approvalsStore.resolvedApprovals"
                  :key="approval.id"
                  :approval="approval"
                  :can-resolve="false"
                  @view="handleView"
               />
            </div>
         </div>
      </template>

      <!-- Detail Modal -->
      <ApprovalDetailModal
         v-model="showDetailModal"
         :approval="selectedApproval"
         :can-resolve="isApprover"
         @resolved="handleResolved"
      />
   </div>
</template>
