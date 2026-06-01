<!-- src/modules/UserProfile/components/PendingApprovals.vue -->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useApprovalsStore } from '@/modules/Approvals/stores/approvalsStore';
import {
   APPROVAL_STATUS_CONFIG,
   APPROVAL_TYPE_CONFIG,
   type Approval,
   type ApprovalStatus,
} from '@/modules/Approvals/types/approval.types';
import ApprovalDetailModal from '@/modules/Approvals/components/ApprovalDetailModal.vue';

type QueueTab = 'assigned' | 'sent';

const approvalsStore = useApprovalsStore();
const activeTab = ref<QueueTab>('assigned');
const showDetailModal = ref(false);
const selectedApproval = ref<Approval | null>(null);

onMounted(() => {
   if (approvalsStore.assignedApprovals.length === 0) {
      approvalsStore.fetchAssignedApprovals();
   }
   if (approvalsStore.approvals.length === 0) {
      approvalsStore.fetchApprovals();
   }
});

const assignedPending = computed(() =>
   approvalsStore.assignedApprovals.filter(approval => approval.status === 'PENDING')
);

const assignedHistory = computed(() =>
   approvalsStore.assignedApprovals.filter(approval => approval.status !== 'PENDING').slice(0, 4)
);

const sentRecent = computed(() => approvalsStore.approvals.slice(0, 6));

const activeList = computed(() =>
   activeTab.value === 'assigned' ? assignedPending.value : sentRecent.value
);

const isLoading = computed(() =>
   activeTab.value === 'assigned' ? approvalsStore.isLoadingAssigned : approvalsStore.isLoading
);

const canResolveSelected = computed(() =>
   activeTab.value === 'assigned' && selectedApproval.value?.status === 'PENDING'
);

const formatDate = (dateStr?: string) => {
   if (!dateStr) return 'Sin fecha';
   return new Date(dateStr).toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
   });
};

const statusClasses = (status: ApprovalStatus) => {
   const map: Record<ApprovalStatus, string> = {
      PENDING: 'border-amber-200 bg-amber-50 text-amber-700',
      APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      REJECTED: 'border-red-200 bg-red-50 text-red-700',
      CANCELLED: 'border-slate-200 bg-slate-50 text-slate-500',
   };
   return map[status];
};

const typeConfig = (approval: Approval) =>
   APPROVAL_TYPE_CONFIG[approval.type] || {
      label: approval.type,
      color: 'text-slate-500',
      icon: 'fa-solid fa-file',
   };

const handleViewDetail = (approval: Approval) => {
   selectedApproval.value = approval;
   showDetailModal.value = true;
};

const handleRefresh = () => {
   approvalsStore.fetchAssignedApprovals();
   approvalsStore.fetchApprovals();
};
</script>

<template>
   <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header class="border-b border-slate-200 bg-white px-5 py-5 sm:px-6">
         <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div class="min-w-0">
               <div class="flex flex-wrap items-center gap-2">
                  <span class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                     <i class="fa-solid fa-clipboard-list text-sm"></i>
                  </span>
                  <div>
                     <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Bandeja de gestion</p>
                     <h2 class="text-xl font-black tracking-tight text-slate-950">Aprobaciones CPFR y solicitudes internas</h2>
                  </div>
               </div>
               <p class="mt-3 max-w-2xl text-sm font-medium text-slate-500">
                  Las solicitudes asignadas aparecen primero para que puedas revisar, aprobar o rechazar sin entrar al modulo completo.
               </p>
            </div>

            <router-link
               to="/admin/approvals"
               class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-slate-800"
            >
               Panel completo
               <i class="fa-solid fa-arrow-right text-[10px]"></i>
            </router-link>
         </div>

         <div class="mt-5 grid gap-3 sm:grid-cols-3">
            <button
               @click="activeTab = 'assigned'"
               class="rounded-xl border px-4 py-3 text-left transition-all"
               :class="activeTab === 'assigned'
                  ? 'border-amber-300 bg-amber-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:bg-slate-50'"
            >
               <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">Por resolver</p>
               <div class="mt-2 flex items-end justify-between gap-3">
                  <span class="text-3xl font-black text-slate-950">{{ approvalsStore.assignedPendingCount }}</span>
                  <span class="text-[10px] font-black uppercase tracking-widest text-amber-700">Asignadas</span>
               </div>
            </button>

            <button
               @click="activeTab = 'sent'"
               class="rounded-xl border px-4 py-3 text-left transition-all"
               :class="activeTab === 'sent'
                  ? 'border-slate-400 bg-slate-100 shadow-sm'
                  : 'border-slate-200 bg-white hover:bg-slate-50'"
            >
               <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">Mis solicitudes</p>
               <div class="mt-2 flex items-end justify-between gap-3">
                  <span class="text-3xl font-black text-slate-950">{{ approvalsStore.pendingCount }}</span>
                  <span class="text-[10px] font-black uppercase tracking-widest text-slate-500">Pendientes</span>
               </div>
            </button>

            <div class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
               <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">Resueltas recientes</p>
               <div class="mt-2 flex items-end justify-between gap-3">
                  <span class="text-3xl font-black text-slate-950">{{ assignedHistory.length }}</span>
                  <span class="text-[10px] font-black uppercase tracking-widest text-slate-500">Historial</span>
               </div>
            </div>
         </div>
      </header>

      <div class="p-4 sm:p-6">
         <div v-if="isLoading" class="grid gap-3">
            <div v-for="i in 4" :key="i" class="animate-pulse rounded-xl border border-slate-100 bg-slate-50 p-4">
               <div class="mb-3 h-4 w-2/3 rounded bg-slate-200"></div>
               <div class="h-3 w-1/2 rounded bg-slate-200"></div>
            </div>
         </div>

         <div
            v-else-if="activeList.length === 0"
            class="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center"
         >
            <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-sm">
               <i class="fa-solid fa-inbox text-2xl"></i>
            </div>
            <h3 class="text-base font-black text-slate-800">
               {{ activeTab === 'assigned' ? 'No tienes aprobaciones por resolver' : 'No tienes solicitudes recientes' }}
            </h3>
            <p class="mt-1 max-w-md text-sm font-medium text-slate-500">
               {{ activeTab === 'assigned'
                  ? 'Cuando CPFR envie pedidos a revision, apareceran aqui como prioridad.'
                  : 'Aqui veras el seguimiento de las solicitudes que hayas enviado.' }}
            </p>
         </div>

         <div v-else class="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
            <button
               v-for="approval in activeList"
               :key="approval.id"
               @click="handleViewDetail(approval)"
               class="grid w-full gap-4 bg-white p-4 text-left transition-colors hover:bg-slate-50 lg:grid-cols-[minmax(0,1fr)_180px_130px_36px] lg:items-center"
            >
               <div class="min-w-0">
                  <div class="mb-2 flex flex-wrap items-center gap-2">
                     <span class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-black uppercase tracking-widest" :class="typeConfig(approval).color">
                        <i :class="typeConfig(approval).icon" class="text-[10px]"></i>
                        {{ typeConfig(approval).label }}
                     </span>
                     <span class="inline-flex items-center rounded-lg border px-2 py-1 text-[9px] font-black uppercase tracking-widest" :class="statusClasses(approval.status)">
                        {{ APPROVAL_STATUS_CONFIG[approval.status]?.label }}
                     </span>
                  </div>
                  <p class="truncate text-base font-black text-slate-900">{{ approval.title }}</p>
                  <p class="mt-1 line-clamp-2 text-sm font-medium leading-5 text-slate-500">{{ approval.description }}</p>
               </div>

               <div>
                  <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">Solicitante</p>
                  <p class="mt-1 truncate text-sm font-bold text-slate-700">{{ approval.requestedBy }}</p>
               </div>

               <div>
                  <p class="text-[9px] font-black uppercase tracking-widest text-slate-400">Fecha</p>
                  <p class="mt-1 text-sm font-bold text-slate-700">{{ formatDate(approval.requestedAt) }}</p>
               </div>

               <div class="hidden h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 lg:flex">
                  <i class="fa-solid fa-chevron-right text-[10px]"></i>
               </div>
            </button>
         </div>
      </div>

      <ApprovalDetailModal
         v-model="showDetailModal"
         :approval="selectedApproval"
         :can-resolve="canResolveSelected"
         @resolved="handleRefresh"
      />
   </section>
</template>
