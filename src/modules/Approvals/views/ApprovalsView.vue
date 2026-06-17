<!-- src/modules/Approvals/views/ApprovalsView.vue -->
<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useApprovalsStore } from '../stores/approvalsStore';
import type { Approval, ApprovalStatus, ApprovalType } from '../types/approval.types';
import { APPROVAL_STATUS_CONFIG, APPROVAL_TYPE_CONFIG } from '../types/approval.types';
import ApprovalDetailModal from '../components/ApprovalDetailModal.vue';

type Tab = 'assigned' | 'mine';
type SortKey = 'recent' | 'oldest' | 'status';
type Density = 'table' | 'compact';

interface FilterState {
   status?: ApprovalStatus
   type?: ApprovalType
}

interface ApprovalRow {
   approval: Approval
   typeLabel: string
   typeIcon: string
   statusLabel: string
   statusIcon: string
   statusBadgeClass: string
   requestedDate: string
   requestedTime: string
   timeAgo: string
   initials: string
   priorityLabel: string
   priorityClass: string
   priorityDotClass: string
   meta: string
}

const approvalsStore = useApprovalsStore();
const route = useRoute();

const activeTab = ref<Tab>('assigned');
const sortKey = ref<SortKey>('recent');
const density = ref<Density>('table');
const currentPage = ref(1);
const pageSize = 10;

const filters = reactive<FilterState>({
   status: undefined,
   type: undefined,
});

const showDetailModal = ref(false);
const selectedApproval = ref<Approval | null>(null);
const isDetailOpen = computed(() => showDetailModal.value && selectedApproval.value !== null);

const statusOptions: { value: ApprovalStatus | ''; label: string }[] = [
   { value: '', label: 'Todos los estados' },
   { value: 'PENDING', label: 'Pendientes' },
   { value: 'APPROVED', label: 'Aprobadas' },
   { value: 'REJECTED', label: 'Rechazadas' },
   { value: 'CANCELLED', label: 'Canceladas' },
];

const typeOptions: { value: ApprovalType | ''; label: string }[] = [
   { value: '', label: 'Todos los tipos' },
   { value: 'CPFR_ORDER', label: 'Pedido CPFR' },
   { value: 'PROMOTION', label: 'Promocion' },
   { value: 'USER_ROLE_CHANGE', label: 'Cambio de rol' },
   { value: 'REPORT_ACCESS', label: 'Acceso reporte' },
];

const sortOptions: { value: SortKey; label: string }[] = [
   { value: 'recent', label: 'Mas recientes' },
   { value: 'oldest', label: 'Mas antiguos' },
   { value: 'status', label: 'Por estado' },
];

const typeLabels: Record<ApprovalType, string> = {
   CPFR_ORDER: 'Pedido CPFR',
   PROMOTION: 'Promocion',
   USER_ROLE_CHANGE: 'Cambio de rol',
   REPORT_ACCESS: 'Acceso reporte',
};

const activeList = computed(() =>
   activeTab.value === 'assigned'
      ? approvalsStore.assignedApprovals
      : approvalsStore.approvals
);

const isActiveLoading = computed(() =>
   activeTab.value === 'assigned'
      ? approvalsStore.isLoadingAssigned
      : approvalsStore.isLoading
);

const canResolveInTab = computed(() => activeTab.value === 'assigned');

const statusCounts = computed<Record<ApprovalStatus, number>>(() => ({
   PENDING: activeList.value.filter(approval => approval.status === 'PENDING').length,
   APPROVED: activeList.value.filter(approval => approval.status === 'APPROVED').length,
   REJECTED: activeList.value.filter(approval => approval.status === 'REJECTED').length,
   CANCELLED: activeList.value.filter(approval => approval.status === 'CANCELLED').length,
}));

const statCards = computed(() => [
   {
      status: 'PENDING' as ApprovalStatus,
      label: 'Pendientes',
      count: statusCounts.value.PENDING,
      icon: 'fa-solid fa-truck-fast',
      panelClass: 'border-slate-200 bg-white hover:border-brand-200 hover:bg-brand-50/20',
      iconClass: 'bg-brand-50 text-brand-600',
      textClass: 'text-slate-500',
   },
   {
      status: 'APPROVED' as ApprovalStatus,
      label: 'Aprobadas',
      count: statusCounts.value.APPROVED,
      icon: 'fa-solid fa-circle-check',
      panelClass: 'border-slate-200 bg-white hover:border-brand-200 hover:bg-brand-50/20',
      iconClass: 'bg-brand-50 text-brand-600',
      textClass: 'text-slate-500',
   },
   {
      status: 'REJECTED' as ApprovalStatus,
      label: 'Rechazadas',
      count: statusCounts.value.REJECTED,
      icon: 'fa-solid fa-arrows-rotate',
      panelClass: 'border-slate-200 bg-white hover:border-brand-200 hover:bg-brand-50/20',
      iconClass: 'bg-brand-50 text-brand-600',
      textClass: 'text-slate-500',
   },
   {
      status: 'CANCELLED' as ApprovalStatus,
      label: 'Canceladas',
      count: statusCounts.value.CANCELLED,
      icon: 'fa-solid fa-ban',
      panelClass: 'border-slate-200 bg-white hover:border-brand-200 hover:bg-brand-50/20',
      iconClass: 'bg-slate-100 text-slate-500',
      textClass: 'text-slate-500',
   },
]);

const emptyMessage = computed(() =>
   activeTab.value === 'assigned'
      ? 'No tienes solicitudes pendientes de resolver.'
      : 'No has enviado ninguna solicitud aun.'
);

const listTitle = computed(() => {
   const scope = activeTab.value === 'assigned' ? 'pendientes' : 'enviadas';
   return `Lista de solicitudes ${scope} (${sortedRows.value.length})`;
});

const currentRangeLabel = computed(() => {
   if (sortedRows.value.length === 0) return 'Mostrando 0 solicitudes';
   const start = (currentPage.value - 1) * pageSize + 1;
   const end = Math.min(currentPage.value * pageSize, sortedRows.value.length);
   return `Mostrando ${start} a ${end} de ${sortedRows.value.length} solicitudes`;
});

const totalPages = computed(() =>
   Math.max(1, Math.ceil(sortedRows.value.length / pageSize))
);

const visiblePages = computed(() => {
   const maxButtons = 5;
   const pageCount = totalPages.value;
   const first = Math.max(1, Math.min(currentPage.value - 2, pageCount - maxButtons + 1));
   const last = Math.min(pageCount, first + maxButtons - 1);

   return Array.from({ length: last - first + 1 }, (_, index) => first + index);
});

const tableRows = computed(() => {
   const start = (currentPage.value - 1) * pageSize;
   return sortedRows.value.slice(start, start + pageSize);
});

const filteredApprovals = computed(() =>
   activeList.value.filter(approval => {
      const matchesStatus = !filters.status || approval.status === filters.status;
      const matchesType = !filters.type || approval.type === filters.type;

      return matchesStatus && matchesType;
   })
);

const sortedRows = computed<ApprovalRow[]>(() => {
   const rows = filteredApprovals.value.map(toApprovalRow);

   return rows.sort((a, b) => {
      if (sortKey.value === 'oldest') {
         return new Date(a.approval.requestedAt).getTime() - new Date(b.approval.requestedAt).getTime();
      }

      if (sortKey.value === 'status') {
         return a.statusLabel.localeCompare(b.statusLabel);
      }

      return new Date(b.approval.requestedAt).getTime() - new Date(a.approval.requestedAt).getTime();
   });
});

onMounted(async () => {
   await Promise.all([
      approvalsStore.fetchAssignedApprovals(),
      approvalsStore.fetchApprovals(),
   ]);

   await openApprovalFromRoute(route.query.approvalId);
});

const applyFilters = () => {
   currentPage.value = 1;
};

const clearFilters = () => {
   filters.status = undefined;
   filters.type = undefined;
   applyFilters();
};

const selectStatusFilter = (status?: ApprovalStatus) => {
   filters.status = filters.status === status ? undefined : status;
   applyFilters();
};

const handleView = (id: number) => {
   selectedApproval.value = activeList.value.find(approval => approval.id === id) || null;
   showDetailModal.value = true;
};

const handleResolved = () => {
   showDetailModal.value = false;
   selectedApproval.value = null;
   approvalsStore.fetchAssignedApprovals();
   approvalsStore.fetchApprovals();
};

const changeTab = (tab: Tab) => {
   activeTab.value = tab;
   currentPage.value = 1;
};

const changePage = (page: number) => {
   currentPage.value = Math.min(Math.max(page, 1), totalPages.value);
};

const openApprovalFromRoute = async (approvalId: unknown) => {
   const id = Number(Array.isArray(approvalId) ? approvalId[0] : approvalId);
   if (!Number.isInteger(id) || id <= 0) return;

   let approval = approvalsStore.assignedApprovals.find(item => item.id === id) || null;
   if (approval) {
      activeTab.value = 'assigned';
   } else {
      approval = approvalsStore.approvals.find(item => item.id === id) || null;
      if (approval) {
         activeTab.value = 'mine';
      }
   }

   if (!approval) {
      await approvalsStore.fetchApprovalById(id);
      approval = approvalsStore.selectedApproval;
      activeTab.value = 'assigned';
   }

   if (approval) {
      selectedApproval.value = approval;
      showDetailModal.value = true;
   }
};

watch(
   () => route.query.approvalId,
   approvalId => {
      openApprovalFromRoute(approvalId);
   }
);

watch(
   () => [filters.status, filters.type],
   () => {
      currentPage.value = 1;
   }
);

watch(totalPages, pageCount => {
   if (currentPage.value > pageCount) {
      currentPage.value = pageCount;
   }
});

function toApprovalRow(approval: Approval): ApprovalRow {
   const typeConfig = APPROVAL_TYPE_CONFIG[approval.type] || {
      label: approval.type,
      color: 'text-slate-600',
      icon: 'fa-solid fa-file',
   };
   const statusConfig = APPROVAL_STATUS_CONFIG[approval.status] || APPROVAL_STATUS_CONFIG.PENDING;
   const requestedAt = new Date(approval.requestedAt);
   const priority = getPriority(approval, requestedAt);

   return {
      approval,
      typeLabel: typeLabels[approval.type] || typeConfig.label,
      typeIcon: typeConfig.icon,
      statusLabel: statusConfig.label,
      statusIcon: statusConfig.icon,
      statusBadgeClass: statusBadgeClass(approval.status),
      requestedDate: formatDate(requestedAt),
      requestedTime: formatTime(requestedAt),
      timeAgo: formatTimeAgo(requestedAt),
      initials: approval.requestedBy.substring(0, 2).toUpperCase(),
      priorityLabel: priority.label,
      priorityClass: priority.textClass,
      priorityDotClass: priority.dotClass,
      meta: buildMeta(approval),
   };
}

function buildMeta(approval: Approval) {
   const payload = approval.payload || {};
   const week = readPayloadValue(payload, ['semana_ic', 'semana', 'week']);
   const order = Array.isArray(payload.num_pedidos)
      ? payload.num_pedidos.map(item => String(item)).join(', ')
      : readPayloadValue(payload, ['num_pedido', 'pedido', 'orderId', 'id']);
   const skuCount = readPayloadValue(payload, ['sku_count', 'skus', 'totalSkus', 'total_skus']);
   const pieces = readPayloadValue(payload, ['piezas', 'totalPzas', 'pieces', 'total_pzas_sugeridas']);
   const segments = [
      week ? `Sem. ${week}` : '',
      order ? `Pedido #${order}` : '',
      skuCount ? `${skuCount} SKUs` : '',
      pieces ? `${pieces} Pzas` : '',
   ].filter(Boolean);

   return segments.length > 0 ? segments.join(' - ') : approval.description;
}

function readPayloadValue(payload: Record<string, unknown>, keys: string[]) {
   const key = keys.find(item => payload[item] !== undefined && payload[item] !== null && payload[item] !== '');
   return key ? String(payload[key]) : '';
}

function getPriority(approval: Approval, requestedAt: Date) {
   const ageHours = (Date.now() - requestedAt.getTime()) / 36e5;

   if (approval.status === 'PENDING' && ageHours >= 36) {
      return {
         label: 'Alta',
         textClass: 'text-red-700',
         dotClass: 'bg-red-500',
      };
   }

   if (approval.status === 'PENDING' && ageHours >= 12) {
      return {
         label: 'Media',
         textClass: 'text-amber-700',
         dotClass: 'bg-amber-500',
      };
   }

   return {
      label: 'Baja',
      textClass: 'text-emerald-700',
      dotClass: 'bg-emerald-500',
   };
}

function statusBadgeClass(status: ApprovalStatus) {
   const classes: Record<ApprovalStatus, string> = {
      PENDING: 'border-orange-200 bg-orange-50 text-red-700',
      APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      REJECTED: 'border-red-200 bg-red-50 text-red-700',
      CANCELLED: 'border-slate-200 bg-slate-50 text-slate-600',
   };

   return classes[status];
}

function formatDate(date: Date) {
   return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
   }).format(date);
}

function formatTime(date: Date) {
   return new Intl.DateTimeFormat('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
   }).format(date);
}

function formatTimeAgo(date: Date) {
   const diff = Date.now() - date.getTime();
   const mins = Math.max(0, Math.floor(diff / 60000));

   if (mins < 60) return `hace ${mins} min`;

   const hours = Math.floor(mins / 60);
   if (hours < 24) return `hace ${hours} h`;

   const days = Math.floor(hours / 24);
   return `hace ${days} dia${days === 1 ? '' : 's'}`;
}
</script>

<template>
   <div class="min-h-full bg-slate-50 px-3 py-4 sm:px-5 lg:px-8 lg:py-7">
      <div class="mx-auto max-w-[1500px] space-y-5">
         <header class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="flex min-w-0 items-start gap-4">
               <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                  <i class="fa-solid fa-list-check text-base"></i>
               </div>
               <div class="min-w-0">
                  <h1 class="text-2xl font-extrabold leading-tight text-slate-900 sm:text-3xl">
                     Solicitudes de Aprobacion
                  </h1>
                  <p class="mt-1 max-w-3xl text-sm leading-5 text-slate-500">
                     Gestiona las solicitudes asignadas a ti y el estado de las que enviaste.
                  </p>
               </div>
            </div>

            <div
               v-if="approvalsStore.totalPendingCount > 0"
               class="flex w-full items-center justify-between gap-4 rounded-lg border border-brand-200 bg-brand-50/40 px-4 py-3 text-brand-700 shadow-sm sm:w-auto sm:min-w-[150px] sm:justify-center"
            >
               <i class="fa-regular fa-clipboard text-lg"></i>
               <div class="text-right sm:text-center">
                  <p class="text-2xl font-black leading-none text-slate-950">{{ approvalsStore.totalPendingCount }}</p>
                  <p class="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Pendientes</p>
               </div>
            </div>
         </header>

         <section class="border-b border-slate-200">
            <div class="flex gap-2 overflow-x-auto">
               <button
                  type="button"
                  class="flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors"
                  :class="activeTab === 'assigned'
                     ? 'border-brand-600 text-brand-700'
                     : 'border-transparent text-slate-500 hover:text-brand-600'"
                  @click="changeTab('assigned')"
               >
                  <i class="fa-solid fa-list-check"></i>
                  Por resolver
                  <span class="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700 ring-1 ring-brand-100">
                     {{ approvalsStore.assignedPendingCount }}
                  </span>
               </button>

               <button
                  type="button"
                  class="flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors"
                  :class="activeTab === 'mine'
                     ? 'border-brand-600 text-brand-700'
                     : 'border-transparent text-slate-500 hover:text-brand-600'"
                  @click="changeTab('mine')"
               >
                  <i class="fa-regular fa-paper-plane"></i>
                  Mis solicitudes
                  <span class="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700">
                     {{ approvalsStore.pendingCount }}
                  </span>
               </button>
            </div>
         </section>

         <section v-if="!isDetailOpen" class="grid gap-3 md:grid-cols-[minmax(170px,1fr)_minmax(170px,1fr)_auto] xl:grid-cols-[190px_190px_auto_1fr]">
            <select
               v-model="filters.status"
               class="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-50"
               @change="applyFilters"
            >
               <option v-for="option in statusOptions" :key="option.value" :value="option.value || undefined">
                  {{ option.label }}
               </option>
            </select>

            <select
               v-model="filters.type"
               class="h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-50"
               @change="applyFilters"
            >
               <option v-for="option in typeOptions" :key="option.value" :value="option.value || undefined">
                  {{ option.label }}
               </option>
            </select>

            <button
               type="button"
               class="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-brand-200 hover:bg-brand-50/20 hover:text-brand-700"
               @click="clearFilters"
            >
               <i class="fa-solid fa-sliders"></i>
               Filtros
            </button>
         </section>

         <section v-if="!isDetailOpen" class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div class="grid grid-cols-1 gap-3 md:grid-cols-4">
               <button
                  v-for="card in statCards"
                  :key="card.status"
                  type="button"
                  class="group flex min-h-[86px] items-center gap-4 rounded-lg border px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm"
                  :class="[
                     card.panelClass,
                     filters.status === card.status ? 'border-brand-200 bg-brand-50/40 hover:border-brand-300' : '',
                  ]"
                  @click="selectStatusFilter(card.status)"
               >
                  <span
                     class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm"
                     :class="filters.status === card.status ? 'bg-white text-brand-600 ring-1 ring-brand-100' : card.iconClass"
                  >
                     <i :class="card.icon"></i>
                  </span>
                  <span class="min-w-0">
                     <span class="block text-2xl font-black leading-none text-slate-950">{{ card.count }}</span>
                     <span class="mt-1 block text-[10px] font-black uppercase tracking-[0.18em]" :class="card.textClass">{{ card.label }}</span>
                  </span>
               </button>
            </div>
         </section>

         <section v-if="!isDetailOpen" class="space-y-4">
            <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
               <h2 class="text-base font-extrabold text-slate-900">
                  {{ listTitle }}
               </h2>

               <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
                  <label class="flex items-center gap-2 text-sm font-medium text-slate-600">
                     Ordenar por:
                     <select
                        v-model="sortKey"
                        class="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-50"
                     >
                        <option v-for="option in sortOptions" :key="option.value" :value="option.value">
                           {{ option.label }}
                        </option>
                     </select>
                  </label>

                  <div class="hidden items-center gap-2 lg:flex">
                     <button
                        type="button"
                        class="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-brand-600"
                        :class="density === 'compact' ? 'border-brand-200 bg-brand-50 text-brand-700' : ''"
                        title="Vista compacta"
                        @click="density = 'compact'"
                     >
                        <i class="fa-solid fa-table-cells-large"></i>
                     </button>
                     <button
                        type="button"
                        class="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-brand-600"
                        :class="density === 'table' ? 'border-brand-200 bg-brand-50 text-brand-700' : ''"
                        title="Vista de tabla"
                        @click="density = 'table'"
                     >
                        <i class="fa-solid fa-list"></i>
                     </button>
                  </div>
               </div>
            </div>

            <div v-if="isActiveLoading" class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
               <div v-for="index in 8" :key="index" class="grid gap-4 border-b border-slate-100 p-4 lg:grid-cols-[2fr_0.7fr_0.7fr_0.55fr_0.55fr_0.55fr_0.45fr]">
                  <div class="h-5 animate-pulse rounded bg-slate-100"></div>
                  <div class="h-5 animate-pulse rounded bg-slate-100"></div>
                  <div class="h-5 animate-pulse rounded bg-slate-100"></div>
                  <div class="h-5 animate-pulse rounded bg-slate-100"></div>
                  <div class="h-5 animate-pulse rounded bg-slate-100"></div>
                  <div class="h-5 animate-pulse rounded bg-slate-100"></div>
                  <div class="h-5 animate-pulse rounded bg-slate-100"></div>
               </div>
            </div>

            <div
               v-else-if="approvalsStore.error"
               class="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-700 shadow-sm"
            >
               <i class="fa-solid fa-circle-exclamation text-2xl"></i>
               <p class="mt-3 text-sm font-bold">{{ approvalsStore.error }}</p>
               <button type="button" class="mt-4 text-sm font-black underline" @click="handleResolved">
                  Reintentar
               </button>
            </div>

            <div
               v-else-if="activeList.length === 0"
               class="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm"
            >
               <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-brand-50 text-brand-300">
                  <i class="fa-solid fa-inbox text-2xl"></i>
               </div>
               <h3 class="mt-4 text-lg font-black text-slate-800">Sin solicitudes</h3>
               <p class="mt-1 text-sm font-medium text-slate-500">{{ emptyMessage }}</p>
            </div>

            <template v-else>
               <div class="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:block">
                  <table class="w-full table-fixed border-collapse">
                     <thead>
                        <tr class="border-b border-slate-100 bg-white text-left text-[10px] font-black uppercase tracking-[0.18em] text-brand-500">
                           <th class="w-[36%] px-5 py-4">Solicitud</th>
                           <th class="w-[12%] px-4 py-4">Tipo</th>
                           <th class="w-[13%] px-4 py-4">Solicitante</th>
                           <th class="w-[11%] px-4 py-4">Fecha</th>
                           <th class="w-[9%] px-4 py-4">Prioridad</th>
                           <th class="w-[10%] px-4 py-4">Estado</th>
                           <th class="w-[9%] px-4 py-4 text-right">Accion</th>
                        </tr>
                     </thead>
                     <tbody class="divide-y divide-slate-200 text-sm">
                        <tr
                           v-for="row in tableRows"
                           :key="row.approval.id"
                           class="group transition hover:bg-brand-50/20"
                           :class="density === 'compact' ? 'text-xs' : ''"
                        >
                           <td class="px-5 py-4">
                              <div class="flex min-w-0 items-center gap-3">
                                 <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                                    <i :class="row.typeIcon"></i>
                                 </div>
                                 <div class="min-w-0">
                                    <p class="truncate font-extrabold text-slate-900 group-hover:text-brand-700">
                                       {{ row.approval.title }}
                                    </p>
                                    <p class="mt-1 truncate text-xs font-semibold text-slate-500">
                                       {{ row.meta }}
                                    </p>
                                 </div>
                              </div>
                           </td>
                           <td class="px-4 py-4">
                              <span class="inline-flex max-w-full items-center truncate rounded-lg bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
                                 {{ row.typeLabel }}
                              </span>
                           </td>
                           <td class="px-4 py-4">
                              <div class="flex min-w-0 items-center gap-2">
                                 <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-black text-slate-600">
                                    {{ row.initials }}
                                 </span>
                                 <span class="truncate font-bold text-slate-700">{{ row.approval.requestedBy }}</span>
                              </div>
                           </td>
                           <td class="px-4 py-4">
                              <p class="font-black text-slate-900">{{ row.requestedDate }}, {{ row.requestedTime }}</p>
                              <p class="mt-1 text-xs font-semibold text-slate-500">{{ row.timeAgo }}</p>
                           </td>
                           <td class="px-4 py-4">
                              <span class="inline-flex items-center gap-2 font-bold" :class="row.priorityClass">
                                 <span class="h-2 w-2 rounded-full" :class="row.priorityDotClass"></span>
                                 {{ row.priorityLabel }}
                              </span>
                           </td>
                           <td class="px-4 py-4">
                              <span class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-black" :class="row.statusBadgeClass">
                                 <i :class="row.statusIcon" class="text-[10px]"></i>
                                 {{ row.statusLabel }}
                              </span>
                           </td>
                           <td class="px-4 py-4">
                              <div class="flex items-center justify-end gap-2">
                                 <button
                                    type="button"
                                    class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-brand-200 hover:bg-brand-50/20 hover:text-brand-700"
                                    @click="handleView(row.approval.id)"
                                 >
                                    Revisar
                                 </button>
                                 <button
                                    type="button"
                                    class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                                    title="Mas acciones"
                                    @click="handleView(row.approval.id)"
                                 >
                                    <i class="fa-solid fa-ellipsis-vertical"></i>
                                 </button>
                              </div>
                           </td>
                        </tr>
                     </tbody>
                  </table>
               </div>

               <div class="grid gap-3 lg:hidden">
                  <button
                     v-for="row in tableRows"
                     :key="row.approval.id"
                     type="button"
                     class="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition active:scale-[0.99]"
                     @click="handleView(row.approval.id)"
                  >
                     <div class="flex items-start justify-between gap-3">
                        <div class="flex min-w-0 items-center gap-3">
                           <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                              <i :class="row.typeIcon"></i>
                           </div>
                           <div class="min-w-0">
                              <p class="truncate text-sm font-black text-slate-900">{{ row.approval.title }}</p>
                              <p class="mt-1 truncate text-xs font-semibold text-slate-500">{{ row.meta }}</p>
                           </div>
                        </div>
                        <span class="inline-flex items-center rounded-lg border px-2 py-1 text-[11px] font-black" :class="row.statusBadgeClass">
                           {{ row.statusLabel }}
                        </span>
                     </div>

                     <div class="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <div>
                           <p class="font-black uppercase tracking-wide text-slate-400">Solicitante</p>
                           <p class="mt-1 truncate font-bold text-slate-700">{{ row.approval.requestedBy }}</p>
                        </div>
                        <div>
                           <p class="font-black uppercase tracking-wide text-slate-400">Fecha</p>
                           <p class="mt-1 font-bold text-slate-700">{{ row.requestedDate }}, {{ row.requestedTime }}</p>
                        </div>
                        <div>
                           <p class="font-black uppercase tracking-wide text-slate-400">Tipo</p>
                           <p class="mt-1 font-bold text-brand-700">{{ row.typeLabel }}</p>
                        </div>
                        <div>
                           <p class="font-black uppercase tracking-wide text-slate-400">Prioridad</p>
                           <p class="mt-1 inline-flex items-center gap-2 font-bold" :class="row.priorityClass">
                              <span class="h-2 w-2 rounded-full" :class="row.priorityDotClass"></span>
                              {{ row.priorityLabel }}
                           </p>
                        </div>
                     </div>
                  </button>
               </div>

               <footer class="flex flex-col gap-3 text-sm font-medium text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                  <p>{{ currentRangeLabel }}</p>

                  <div class="flex items-center gap-2 overflow-x-auto">
                     <button
                        type="button"
                        class="h-10 rounded-lg border border-slate-200 bg-white px-4 font-bold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-50"
                        :disabled="currentPage === 1"
                        @click="changePage(currentPage - 1)"
                     >
                        Anterior
                     </button>
                     <button
                        v-for="page in visiblePages"
                        :key="page"
                        type="button"
                        class="h-10 min-w-10 rounded-lg border px-3 font-black transition"
                        :class="page === currentPage
                           ? 'border-brand-500 bg-white text-brand-700'
                           : 'border-slate-200 bg-white text-slate-700 hover:border-brand-200'"
                        @click="changePage(page)"
                     >
                        {{ page }}
                     </button>
                     <span v-if="totalPages > visiblePages[visiblePages.length - 1]" class="px-2 font-black text-slate-400">
                        ...
                     </span>
                     <button
                        v-if="totalPages > visiblePages[visiblePages.length - 1]"
                        type="button"
                        class="h-10 min-w-10 rounded-lg border border-slate-200 bg-white px-3 font-black text-slate-700 transition hover:border-brand-200"
                        @click="changePage(totalPages)"
                     >
                        {{ totalPages }}
                     </button>
                     <button
                        type="button"
                        class="h-10 rounded-lg border border-slate-200 bg-white px-4 font-bold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-50"
                        :disabled="currentPage === totalPages"
                        @click="changePage(currentPage + 1)"
                     >
                        Siguiente
                     </button>
                  </div>
               </footer>
            </template>
         </section>

         <section v-if="isDetailOpen" class="-mx-3 bg-white px-3 py-4 sm:mx-0 sm:rounded-lg sm:p-5 sm:shadow-sm">
            <ApprovalDetailModal
               v-model="showDetailModal"
               :approval="selectedApproval"
               :can-resolve="canResolveInTab && selectedApproval?.status === 'PENDING'"
               @resolved="handleResolved"
            />
         </section>
      </div>
   </div>
</template>
