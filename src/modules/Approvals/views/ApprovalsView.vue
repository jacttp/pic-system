<!-- src/modules/Approvals/views/ApprovalsView.vue -->
<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useApprovalsStore } from '../stores/approvalsStore';
import { useProfileStore } from '@/modules/UserProfile/stores/profileStore';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import type { Approval, ApprovalStatus, ApprovalType } from '../types/approval.types';
import { APPROVAL_STATUS_CONFIG, APPROVAL_TYPE_CONFIG } from '../types/approval.types';
import ApprovalDetailModal from '../components/ApprovalDetailModal.vue';
import ApprovalStatusSelector from '../components/ApprovalStatusSelector.vue';
import ManagementTray from '@/modules/Shared/components/ManagementTray.vue';
import StdButton from '@/modules/Shared/components/std/StdButton.vue';
import { toast } from '@/components/ui/toast/use-toast';

type SortField = 'embarque' | 'creation' | 'requester';
type SortDirection = 'asc' | 'desc';

interface FilterState {
   status?: ApprovalStatus
   type?: ApprovalType
   storeName: string
}

interface ApprovalRow {
   approval: Approval
   typeIcon: string
   statusLabel: string
   requestedDate: string
   requestedTime: string
   storeName: string
   orderLabel: string
   embarqueLabel: string
   embarqueTone: 'neutral' | 'warning' | 'danger'
   embarqueStatusLabel: string
   canResolve: boolean
}

interface TrayMetric {
   id?: string
   label: string
   value: string
   caption: string
   route?: string
   icon: string
   emphasis?: boolean
   active?: boolean
}

const approvalsStore = useApprovalsStore();
const profileStore = useProfileStore();
const authStore = useAuthStore();
const route = useRoute();

const sortField = ref<SortField>('creation');
const sortDirection = ref<SortDirection>('desc');
const currentPage = ref(1);
const pageSize = 8;

const filters = reactive<FilterState>({
   status: undefined,
   type: undefined,
   storeName: '',
});

const showDetailModal = ref(false);
const selectedApproval = ref<Approval | null>(null);
const cancellingApprovalId = ref<number | null>(null);
const isDetailOpen = computed(() => showDetailModal.value && selectedApproval.value !== null);
const isCompactFiltersOpen = ref(false);

const typeOptions: { value: ApprovalType | ''; label: string }[] = [
   { value: '', label: 'Todos los tipos' },
   { value: 'CPFR_ORDER', label: 'Pedido CPFR' },
   { value: 'PROMOTION', label: 'Promocion' },
   { value: 'USER_ROLE_CHANGE', label: 'Cambio de rol' },
   { value: 'REPORT_ACCESS', label: 'Acceso reporte' },
];

const sortOptions: { value: SortField; label: string; icon: string }[] = [
   { value: 'embarque', label: 'Fin de embarque', icon: 'fa-solid fa-truck-ramp-box' },
   { value: 'creation', label: 'Fecha de creación', icon: 'fa-solid fa-calendar-plus' },
   { value: 'requester', label: 'Solicitante', icon: 'fa-solid fa-user' },
];

const assignedIds = computed(() => new Set(approvalsStore.assignedApprovals.map(approval => approval.id)));

const isActiveLoading = computed(() =>
   approvalsStore.isLoadingAssigned || approvalsStore.isLoading
);

const isSuperAdmin = computed(() => authStore.userLevel >= 4);
const canResolveSelected = computed(() => {
   const approval = selectedApproval.value;
   return Boolean(approval?.status === 'PENDING' && (isSuperAdmin.value || assignedIds.value.has(approval.id)));
});

const unifiedApprovals = computed(() => {
   const byId = new Map<number, Approval>();

   approvalsStore.assignedApprovals.forEach(approval => byId.set(approval.id, approval));
   approvalsStore.approvals.forEach(approval => {
      if (!byId.has(approval.id)) byId.set(approval.id, approval);
   });

   return Array.from(byId.values());
});

const statusCounts = computed<Record<ApprovalStatus, number>>(() => ({
   PENDING: unifiedApprovals.value.filter(approval => approval.status === 'PENDING').length,
   APPROVED: unifiedApprovals.value.filter(approval => approval.status === 'APPROVED').length,
   REJECTED: unifiedApprovals.value.filter(approval => approval.status === 'REJECTED').length,
   CANCELLED: unifiedApprovals.value.filter(approval => approval.status === 'CANCELLED').length,
}));

const allCancelledCount = computed(() =>
   unifiedApprovals.value.filter(approval => approval.status === 'CANCELLED').length
);
const canBulkDeleteCancelled = computed(() => isSuperAdmin.value && allCancelledCount.value > 0);
const sortDirectionLabel = computed(() => {
   if (sortField.value === 'requester') return sortDirection.value === 'asc' ? 'Alfabético A–Z' : 'Alfabético Z–A';
   return sortDirection.value === 'desc' ? 'Más reciente' : 'Más antiguo';
});
const sortDirectionIcon = computed(() => {
   if (sortField.value === 'requester') {
      return sortDirection.value === 'asc' ? 'fa-solid fa-arrow-down-a-z' : 'fa-solid fa-arrow-up-a-z';
   }
   return sortDirection.value === 'desc' ? 'fa-solid fa-arrow-down-wide-short' : 'fa-solid fa-arrow-up-wide-short';
});

const managementTrayMetrics = computed<TrayMetric[]>(() => [
   {
      id: 'PENDING',
      label: 'Pendientes',
      value: String(statusCounts.value.PENDING),
      caption: 'Por atender',
      icon: 'fa-solid fa-truck-fast',
      emphasis: true,
      active: filters.status === 'PENDING',
   },
   {
      id: 'APPROVED',
      label: 'Aprobadas',
      value: String(statusCounts.value.APPROVED),
      caption: 'Resueltas',
      icon: 'fa-solid fa-circle-check',
      active: filters.status === 'APPROVED',
   },
   {
      id: 'REJECTED',
      label: 'Rechazadas',
      value: String(statusCounts.value.REJECTED),
      caption: 'Revisadas',
      icon: 'fa-solid fa-arrows-rotate',
      active: filters.status === 'REJECTED',
   },
   {
      id: 'CANCELLED',
      label: 'Canceladas',
      value: String(statusCounts.value.CANCELLED),
      caption: 'Archivables',
      icon: 'fa-solid fa-ban',
      active: filters.status === 'CANCELLED',
   },
]);

const emptyMessage = computed(() => 'No hay solicitudes con los filtros actuales.');

const listTitle = computed(() => {
   return `Solicitudes (${sortedRows.value.length})`;
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

const normalizedStoreSearch = computed(() => normalizeSearchText(filters.storeName));

const filteredApprovals = computed(() =>
   unifiedApprovals.value.filter(approval => {
      const matchesStatus = !filters.status || approval.status === filters.status;
      const matchesType = !filters.type || approval.type === filters.type;
      const matchesStoreName = !normalizedStoreSearch.value
         || normalizeSearchText(buildStoreName(approval)).includes(normalizedStoreSearch.value);

      return matchesStatus && matchesType && matchesStoreName;
   })
);

const activeFiltersCount = computed(() =>
   Number(Boolean(filters.status))
   + Number(Boolean(filters.type))
   + Number(Boolean(filters.storeName.trim()))
);
const compactFiltersLabel = computed(() => {
   if (isCompactFiltersOpen.value) return 'Ocultar filtros';
   if (activeFiltersCount.value === 0) return 'Mostrar filtros';
   return `${activeFiltersCount.value} filtro${activeFiltersCount.value === 1 ? '' : 's'} activo${activeFiltersCount.value === 1 ? '' : 's'}`;
});
const canCancelSelected = computed(() => Boolean(
   selectedApproval.value
   && ['PENDING', 'APPROVED'].includes(selectedApproval.value.status)
   && isSuperAdmin.value
));

const sortedRows = computed<ApprovalRow[]>(() => {
   const rows = filteredApprovals.value.map(toApprovalRow);

   return rows.sort((a, b) => {
      if (sortField.value === 'requester') {
         const requesterComparison = a.approval.requestedBy.localeCompare(b.approval.requestedBy, 'es-MX', { sensitivity: 'base' });
         return sortDirection.value === 'asc' ? requesterComparison : -requesterComparison;
      }

      const aDate = sortField.value === 'embarque'
         ? getEmbarqueDate(a.approval)
         : parseDateValue(a.approval.requestedAt);
      const bDate = sortField.value === 'embarque'
         ? getEmbarqueDate(b.approval)
         : parseDateValue(b.approval.requestedAt);

      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;

      const dateComparison = aDate.getTime() - bDate.getTime();
      return sortDirection.value === 'asc' ? dateComparison : -dateComparison;
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
   filters.storeName = '';
   applyFilters();
};

const selectStatusFilter = (status?: ApprovalStatus) => {
   filters.status = filters.status === status ? undefined : status;
   applyFilters();
};

const selectSortField = (field: SortField) => {
   if (sortField.value === field) return;
   sortField.value = field;
   sortDirection.value = field === 'requester' ? 'asc' : 'desc';
   currentPage.value = 1;
};

const toggleSortDirection = () => {
   sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
   currentPage.value = 1;
};

const handleTrayMetricClick = (metric: TrayMetric) => {
   const status = metric.id as ApprovalStatus | undefined;
   if (!status) return;

   selectStatusFilter(status);
};

const handleView = (id: number) => {
   selectedApproval.value = unifiedApprovals.value.find(approval => approval.id === id) || null;
   showDetailModal.value = true;
};

const handleResolved = () => {
   showDetailModal.value = false;
   selectedApproval.value = null;
   approvalsStore.fetchAssignedApprovals();
   approvalsStore.fetchApprovals();
   profileStore.fetchNotifications();
};

const canCancelApproval = (approval: Approval) =>
   isSuperAdmin.value && ['PENDING', 'APPROVED'].includes(approval.status);

const statusChangeOptions = (approval: Approval): ApprovalStatus[] =>
   canCancelApproval(approval) ? ['CANCELLED'] : [];

const handleStatusSelection = (approval: Approval, status: ApprovalStatus) => {
   if (status === 'CANCELLED') handleCancelApproval(approval);
};

const handleCancelApproval = async (approval: Approval, event?: Event) => {
   event?.stopPropagation();
   if (!canCancelApproval(approval) || cancellingApprovalId.value !== null) return;

   const currentStatus = APPROVAL_STATUS_CONFIG[approval.status]?.label || approval.status;
   const scope = approval.type === 'CPFR_ORDER'
      ? ' Las OC asociadas volverán a borrador en CPFR y a pendiente en la orden de compra.'
      : '';
   if (!confirm(
      `Se cambiará la solicitud "${approval.title}" de "${currentStatus}" a "Cancelada".${scope}\n\n¿Deseas continuar?`
   )) return;

   cancellingApprovalId.value = approval.id;
   try {
      await approvalsStore.cancelApproval(approval.id);
      await profileStore.fetchNotifications();
      toast({
         title: 'Solicitud cancelada',
         description: approval.type === 'CPFR_ORDER'
            ? 'Las OC asociadas regresaron al flujo inicial.'
            : 'La solicitud quedó cancelada.',
      });
   } catch (error: any) {
      toast({
         title: 'No se pudo cancelar',
         description: error.response?.data?.message || 'Intenta nuevamente.',
         variant: 'destructive',
      });
   } finally {
      cancellingApprovalId.value = null;
   }
};

const handleCancelled = (isCpfr: boolean) => {
   handleResolved();
   toast({
      title: 'Solicitud cancelada',
      description: isCpfr
         ? 'Las OC asociadas regresaron al flujo inicial.'
         : 'La solicitud quedó cancelada.',
   });
};

const canDeleteCancelled = (approval: Approval) =>
   approval.status === 'CANCELLED'
   && (isSuperAdmin.value || assignedIds.value.has(approval.id) || approval.requestedById === authStore.user?.id);

const handleDeleteCancelled = async (approval: Approval, event?: Event) => {
   event?.stopPropagation();
   if (!canDeleteCancelled(approval)) return;
   if (!confirm(`Borrar la solicitud cancelada "${approval.title}"?`)) return;

   await approvalsStore.deleteCancelledApproval(approval.id);
};

const handleDeleteAllCancelled = async () => {
   if (!canBulkDeleteCancelled.value) return;
   if (!confirm('Borrar todas las solicitudes canceladas? Esta accion no se puede deshacer.')) return;

   await approvalsStore.deleteAllCancelledApprovals();
};

const changePage = (page: number) => {
   currentPage.value = Math.min(Math.max(page, 1), totalPages.value);
};

const openApprovalFromRoute = async (approvalId: unknown) => {
   const id = Number(Array.isArray(approvalId) ? approvalId[0] : approvalId);
   if (!Number.isInteger(id) || id <= 0) return;

   let approval = unifiedApprovals.value.find(item => item.id === id) || null;

   if (!approval) {
      await approvalsStore.fetchApprovalById(id);
      approval = approvalsStore.selectedApproval;
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
   () => [filters.status, filters.type, filters.storeName],
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
      color: 'text-slate-600',
      icon: 'fa-solid fa-file',
   };
   const statusConfig = APPROVAL_STATUS_CONFIG[approval.status] || APPROVAL_STATUS_CONFIG.PENDING;
   const requestedAt = new Date(approval.requestedAt);
   const isAssigned = assignedIds.value.has(approval.id);
   const embarque = buildEmbarqueInfo(approval);

   return {
      approval,
      typeIcon: typeConfig.icon,
      statusLabel: statusConfig.label,
      requestedDate: formatDate(requestedAt),
      requestedTime: formatTime(requestedAt),
      storeName: buildStoreName(approval),
      orderLabel: buildOrderLabel(approval),
      embarqueLabel: embarque.label,
      embarqueTone: embarque.tone,
      embarqueStatusLabel: embarque.statusLabel,
      canResolve: approval.status === 'PENDING' && (isSuperAdmin.value || isAssigned),
   };
}

function buildStoreName(approval: Approval) {
   const payload = approval.payload || {};
   return readPayloadValue(payload, ['nombre_tienda', 'tienda', 'storeName', 'id_cliente']) || 'Sin tienda';
}

function normalizeSearchText(value: string): string {
   return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es-MX')
      .trim();
}

function buildOrderLabel(approval: Approval) {
   const payload = approval.payload || {};
   if (Array.isArray(payload.num_pedidos)) {
      return payload.num_pedidos.map(item => String(item)).join(', ');
   }
   return readPayloadValue(payload, ['num_pedido', 'pedido', 'orderId', 'id']) || 'Sin pedido';
}

function buildEmbarqueInfo(approval: Approval) {
   const date = getEmbarqueDate(approval);

   if (!date) {
      return {
         label: 'Sin fecha',
         statusLabel: 'No registrada',
         tone: 'neutral' as const,
      };
   }

   if (approval.status !== 'PENDING') {
      const statusLabels: Record<Exclude<ApprovalStatus, 'PENDING'>, string> = {
         APPROVED: 'Solicitud aprobada',
         REJECTED: 'Solicitud rechazada',
         CANCELLED: 'Solicitud cancelada',
      };

      return {
         label: formatFullDate(date),
         statusLabel: statusLabels[approval.status],
         tone: 'neutral' as const,
      };
   }

   const today = startOfDay(new Date());
   const target = startOfDay(date);
   const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);

   if (diffDays < 0) {
      return {
         label: formatFullDate(date),
         statusLabel: `Vencio hace ${Math.abs(diffDays)} dia${Math.abs(diffDays) === 1 ? '' : 's'}`,
         tone: 'danger' as const,
      };
   }

   if (diffDays === 0) {
      return {
         label: formatFullDate(date),
         statusLabel: 'Vence hoy',
         tone: 'danger' as const,
      };
   }

   return {
      label: formatFullDate(date),
      statusLabel: `Faltan ${diffDays} dia${diffDays === 1 ? '' : 's'}`,
      tone: diffDays <= 2 ? 'danger' as const : diffDays <= 7 ? 'warning' as const : 'neutral' as const,
   };
}

function getEmbarqueDate(approval: Approval) {
   const payload = approval.payload || {};
   const rawDate = readPayloadValue(payload, [
      'fec_fin_embarque',
      'fecha_fin_embarque',
      'fin_embarque',
      'endDate',
      'fecha_fin',
   ]);
   return parseDateValue(rawDate);
}

function embarqueToneClass(tone: ApprovalRow['embarqueTone']) {
   const classes = {
      neutral: 'bg-pic-muted-surface text-pic-text-muted',
      warning: 'bg-[hsl(var(--pic-warning)/0.12)] text-pic-warning',
      danger: 'bg-[hsl(var(--pic-danger)/0.12)] text-pic-danger',
   };

   return classes[tone];
}

function embarqueStatusClass(tone: ApprovalRow['embarqueTone']) {
   const classes = {
      neutral: 'text-pic-text-muted',
      warning: 'text-pic-warning',
      danger: 'text-pic-danger',
   };

   return classes[tone];
}

function readPayloadValue(payload: Record<string, unknown>, keys: string[]) {
   const key = keys.find(item => payload[item] !== undefined && payload[item] !== null && payload[item] !== '');
   return key ? String(payload[key]) : '';
}

function parseDateValue(value: string) {
   if (!value) return null;

   const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
   const date = dateOnlyMatch
      ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
      : new Date(value);

   return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date) {
   return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDate(date: Date) {
   return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
   }).format(date);
}

function formatFullDate(date: Date) {
   return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
   }).format(date);
}

function formatTime(date: Date) {
   return new Intl.DateTimeFormat('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
   }).format(date);
}

</script>

<template>
   <div class="min-h-full bg-pic-background px-3 py-4 sm:px-5 lg:px-8 lg:py-7">
      <div class="mx-auto max-w-[1360px] space-y-4 sm:space-y-5">
         <ManagementTray
            v-if="!isDetailOpen"
            eyebrow="Bandeja de gestion"
            title="Aprobaciones CPFR y solicitudes internas"
            subtitle="Accesos directos al panel de aprobaciones para revisar pendientes, seguimiento e historial."
            icon="fa-solid fa-clipboard-check"
            :metrics="managementTrayMetrics"
            :load-approvals="false"
            @metric-click="handleTrayMetricClick"
         />

         <template v-if="!isDetailOpen">
            <section class="rounded-xl border border-white/10 bg-pic-nav p-3 shadow-lg shadow-slate-300/20 sm:p-4">
               <div class="mb-2 flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.16em] text-pic-nav-text-muted">
                  <span class="flex items-center gap-2">
                     <i class="fa-solid fa-sliders text-[9px]"></i>
                     Filtros
                  </span>
                  <button
                     type="button"
                     class="inline-flex h-9 items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 text-[11px] font-bold normal-case tracking-normal text-pic-nav-text transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-pic-brand-border xl:hidden"
                     :aria-expanded="isCompactFiltersOpen"
                     aria-controls="approval-filters-panel"
                     @click="isCompactFiltersOpen = !isCompactFiltersOpen"
                  >
                     {{ compactFiltersLabel }}
                     <i class="fa-solid text-[10px]" :class="isCompactFiltersOpen ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                  </button>
               </div>
               <div
                  id="approval-filters-panel"
                  class="space-y-3"
                  :class="isCompactFiltersOpen ? 'block' : 'hidden xl:block'"
               >
                  <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(270px,1fr)_minmax(180px,220px)_auto]">
                     <div class="min-w-0 space-y-1.5 sm:col-span-2 xl:col-span-1">
                        <label for="approval-store-filter" class="block text-[10px] font-bold uppercase tracking-[0.14em] text-pic-nav-text-muted xl:hidden">Buscar tienda</label>
                        <div class="relative">
                           <i class="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-pic-nav-text-muted"></i>
                           <input
                              id="approval-store-filter"
                              v-model.trim="filters.storeName"
                              type="search"
                              autocomplete="off"
                              placeholder="Buscar por tienda..."
                              aria-label="Buscar solicitudes por nombre de tienda"
                              class="h-11 w-full min-w-0 rounded-lg border border-white/15 bg-white/10 py-0 pl-9 pr-9 text-sm font-bold text-pic-nav-text placeholder:text-pic-nav-text-muted outline-none transition hover:bg-white/15 focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-border"
                           >
                           <button
                              v-if="filters.storeName"
                              type="button"
                              class="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-pic-nav-text-muted transition hover:bg-white/15 hover:text-pic-nav-text focus:outline-none focus:ring-2 focus:ring-pic-brand-border"
                              aria-label="Limpiar búsqueda de tienda"
                              @click="filters.storeName = ''"
                           >
                              <i class="fa-solid fa-xmark text-xs"></i>
                           </button>
                        </div>
                     </div>

                     <div class="min-w-0 space-y-1.5">
                        <label for="approval-type-filter" class="block text-[10px] font-bold uppercase tracking-[0.14em] text-pic-nav-text-muted xl:hidden">Tipo de solicitud</label>
                        <select
                           id="approval-type-filter"
                           v-model="filters.type"
                           class="h-11 w-full min-w-0 rounded-lg border border-white/15 bg-white/10 px-3 text-sm font-bold text-pic-nav-text outline-none transition hover:bg-white/15 focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-border [&>option]:bg-pic-surface [&>option]:text-pic-text-main"
                           @change="applyFilters"
                        >
                           <option v-for="option in typeOptions" :key="option.value" :value="option.value || undefined">
                              {{ option.label }}
                           </option>
                        </select>
                     </div>

                     <div class="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:justify-end xl:col-span-1 xl:self-end">
                        <StdButton
                           variant="secondary"
                           class="w-full border-white/15 bg-white/10 text-pic-nav-text hover:border-pic-brand-border hover:bg-white/15 hover:text-pic-nav-text sm:w-auto"
                           icon="fa-solid fa-rotate-left"
                           @click="clearFilters"
                        >
                           Restablecer
                        </StdButton>

                        <StdButton
                           v-if="canBulkDeleteCancelled"
                           variant="danger"
                           class="w-full bg-pic-surface sm:w-auto"
                           icon="fa-solid fa-xmark"
                           @click="handleDeleteAllCancelled"
                        >
                           Canceladas ({{ allCancelledCount }})
                        </StdButton>
                     </div>
                  </div>

                  <div class="border-t border-white/10"></div>

                  <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                     <div>
                        <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-pic-nav-text-muted">Ordenar solicitudes</p>
                        <p class="mt-1 text-xs font-semibold text-pic-nav-text-muted">Elige el criterio y ajusta la dirección del listado.</p>
                     </div>

                     <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                        <div class="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center" role="group" aria-label="Ordenar por">
                           <span class="col-span-2 text-[10px] font-bold uppercase tracking-[0.14em] text-pic-nav-text-muted sm:mr-1 sm:col-auto">Ordenar por</span>
                           <button
                              v-for="option in sortOptions"
                              :key="option.value"
                              type="button"
                              class="inline-flex h-9 min-w-0 items-center justify-center gap-2 rounded-lg border px-2 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-pic-brand-border last:col-span-2 sm:w-auto sm:px-3"
                              :class="sortField === option.value
                                 ? 'border-pic-brand bg-pic-brand text-white shadow-sm shadow-pic-brand/30'
                                 : 'border-white/15 bg-white/10 text-pic-nav-text hover:border-pic-brand-border hover:bg-white/15'"
                              :aria-pressed="sortField === option.value"
                              :aria-label="`Ordenar por ${option.label}`"
                              :title="option.label"
                              @click="selectSortField(option.value)"
                           >
                              <i :class="option.icon" class="text-[10px]"></i>
                              <span class="truncate sm:hidden">{{ option.value === 'embarque' ? 'Embarque' : option.value === 'creation' ? 'Creación' : 'Solicitante' }}</span>
                              <span class="hidden sm:inline">{{ option.label }}</span>
                           </button>
                        </div>

                        <button
                           type="button"
                           class="inline-flex h-9 w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-pic-brand-border bg-pic-brand-soft px-3 text-xs font-black text-pic-brand transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-pic-brand-border sm:w-auto"
                           :title="`Cambiar orden: ${sortDirectionLabel}`"
                           @click="toggleSortDirection"
                        >
                           <i :class="sortDirectionIcon" class="text-[10px]"></i>
                           {{ sortDirectionLabel }}
                        </button>
                     </div>
                  </div>
               </div>
            </section>

            <section class="space-y-3 sm:space-y-4">
               <div class="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                     <h2 class="text-base font-black text-pic-text-main">{{ listTitle }}</h2>
                     <p class="mt-1 text-xs font-semibold text-pic-text-muted">{{ currentRangeLabel }}</p>
                  </div>
               </div>

               <div v-if="totalPages > 1" class="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2 rounded-xl border border-pic-border bg-pic-surface p-2 xl:hidden">
                  <button
                     type="button"
                     class="flex h-10 w-10 items-center justify-center rounded-lg border border-pic-border text-pic-text-main transition hover:border-pic-brand-border hover:bg-pic-brand-soft hover:text-pic-brand disabled:cursor-not-allowed disabled:opacity-40"
                     :disabled="currentPage === 1"
                     aria-label="Página anterior"
                     @click="changePage(currentPage - 1)"
                  >
                     <i class="fa-solid fa-chevron-left text-xs"></i>
                  </button>
                  <span class="truncate text-center text-xs font-bold text-pic-text-main">Página {{ currentPage }} de {{ totalPages }}</span>
                  <button
                     type="button"
                     class="flex h-10 w-10 items-center justify-center rounded-lg border border-pic-border text-pic-text-main transition hover:border-pic-brand-border hover:bg-pic-brand-soft hover:text-pic-brand disabled:cursor-not-allowed disabled:opacity-40"
                     :disabled="currentPage === totalPages"
                     aria-label="Página siguiente"
                     @click="changePage(currentPage + 1)"
                  >
                     <i class="fa-solid fa-chevron-right text-xs"></i>
                  </button>
               </div>

               <div v-if="isActiveLoading" class="grid gap-3">
                  <div v-for="index in 5" :key="index" class="rounded-xl border border-pic-border bg-pic-surface p-4 shadow-sm sm:p-5">
                     <div class="flex gap-3">
                        <div class="h-10 w-10 animate-pulse rounded-lg bg-slate-100"></div>
                        <div class="min-w-0 flex-1 space-y-3">
                           <div class="h-4 w-2/3 animate-pulse rounded bg-slate-100"></div>
                           <div class="h-3 w-full animate-pulse rounded bg-slate-100"></div>
                           <div class="h-3 w-1/2 animate-pulse rounded bg-slate-100"></div>
                        </div>
                     </div>
                  </div>
               </div>

               <div
                  v-else-if="approvalsStore.error"
                  class="rounded-xl border border-[hsl(var(--pic-danger)/0.28)] bg-[hsl(var(--pic-danger)/0.08)] p-8 text-center text-pic-danger shadow-sm"
               >
                  <i class="fa-solid fa-circle-exclamation text-2xl"></i>
                  <p class="mt-3 text-sm font-bold">{{ approvalsStore.error }}</p>
                  <button type="button" class="mt-4 text-sm font-black underline" @click="handleResolved">
                     Reintentar
                  </button>
               </div>

               <div
                  v-else-if="unifiedApprovals.length === 0 || sortedRows.length === 0"
                  class="rounded-xl border border-pic-border bg-pic-surface p-8 text-center shadow-sm sm:p-10"
               >
                  <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-pic-brand-soft text-pic-brand shadow-sm">
                     <i class="fa-solid fa-inbox text-2xl"></i>
                  </div>
                  <h3 class="mt-4 text-lg font-black text-pic-text-main">Sin solicitudes</h3>
                  <p class="mt-1 text-sm font-medium text-pic-text-muted">{{ emptyMessage }}</p>
               </div>

               <template v-else>
                  <div class="grid gap-3 sm:gap-4">
                     <article
                        v-for="row in tableRows"
                        :key="row.approval.id"
                        class="group rounded-xl border border-pic-border bg-pic-surface shadow-sm transition hover:border-pic-brand-border hover:shadow-md"
                     >
                        <div class="p-4 sm:p-5">
                           <div class="flex items-start justify-between gap-3">
                              <button
                                 type="button"
                                 class="flex min-w-0 flex-1 items-start gap-3 text-left outline-none"
                                 @click="handleView(row.approval.id)"
                              >
                                 <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pic-brand-soft text-pic-brand ring-1 ring-pic-brand-border transition-colors group-hover:bg-pic-brand group-hover:text-white">
                                    <i :class="row.typeIcon"></i>
                                 </span>
                                 <span class="min-w-0">
                                    <span class="block text-[10px] font-bold text-pic-text-muted">{{ row.approval.type === 'CPFR_ORDER' ? 'Pedido CPFR' : 'Solicitud' }}</span>
                                    <span class="mt-0.5 block text-base font-black leading-5 text-pic-text-main sm:text-lg">{{ row.storeName }}</span>
                                    <span class="mt-1 block break-words text-xs font-semibold leading-5 text-pic-text-muted">OC {{ row.orderLabel }}</span>
                                 </span>
                              </button>
                              <ApprovalStatusSelector
                                 :status="row.approval.status"
                                 :options="statusChangeOptions(row.approval)"
                                 :disabled="cancellingApprovalId !== null"
                                 @select="handleStatusSelection(row.approval, $event)"
                              />
                           </div>

                           <div class="mt-4 grid gap-2 border-t border-pic-border pt-3 sm:grid-cols-3 sm:gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_148px]">
                              <div class="flex min-w-0 items-center gap-2.5 rounded-lg bg-pic-muted-surface px-3 py-2.5">
                                 <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" :class="embarqueToneClass(row.embarqueTone)">
                                    <i class="fa-regular fa-calendar-check text-xs"></i>
                                 </span>
                                 <span class="min-w-0">
                                    <span class="block text-[10px] font-medium text-pic-text-muted">Embarque</span>
                                    <span class="block truncate text-xs font-bold text-pic-text-main">{{ row.embarqueLabel }}</span>
                                    <span class="block truncate text-[11px]" :class="embarqueStatusClass(row.embarqueTone)">{{ row.embarqueStatusLabel }}</span>
                                 </span>
                              </div>
                              <div class="min-w-0 rounded-lg bg-pic-muted-surface px-3 py-2.5">
                                 <span class="block text-[10px] font-medium text-pic-text-muted">Solicitante</span>
                                 <span class="mt-1 block truncate text-xs font-bold text-pic-text-main">{{ row.approval.requestedBy }}</span>
                              </div>
                              <div class="min-w-0 rounded-lg bg-pic-muted-surface px-3 py-2.5">
                                 <span class="block text-[10px] font-medium text-pic-text-muted">Creada</span>
                                 <span class="mt-1 block truncate text-xs font-bold text-pic-text-main">{{ row.requestedDate }}, {{ row.requestedTime }}</span>
                              </div>
                              <div class="flex items-center gap-2 sm:col-span-3 lg:col-span-1 lg:justify-end">
                                 <button
                                    type="button"
                                    class="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-pic-brand-border lg:flex-none lg:min-w-[132px]"
                                    :class="row.canResolve
                                       ? 'border-pic-brand bg-pic-brand text-white shadow-sm shadow-pic-brand/20 hover:brightness-95'
                                       : 'border-white/10 bg-pic-nav text-pic-nav-text shadow-sm hover:bg-pic-nav/90'"
                                    @click="handleView(row.approval.id)"
                                 >
                                    <i :class="row.canResolve ? 'fa-solid fa-check' : 'fa-regular fa-eye'" class="text-xs"></i>
                                    {{ row.canResolve ? 'Resolver' : 'Revisar' }}
                                 </button>
                                 <button
                                    v-if="canDeleteCancelled(row.approval)"
                                    type="button"
                                    class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[hsl(var(--pic-danger)/0.28)] bg-pic-surface text-pic-danger transition hover:border-[hsl(var(--pic-danger)/0.42)] hover:bg-[hsl(var(--pic-danger)/0.08)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--pic-danger)/0.22)]"
                                    title="Borrar solicitud cancelada"
                                    @click="handleDeleteCancelled(row.approval, $event)"
                                 >
                                    <i class="fa-solid fa-xmark"></i>
                                 </button>
                              </div>
                           </div>
                        </div>
                     </article>
                  </div>

                  <div v-if="totalPages > 1" class="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2 rounded-xl border border-pic-border bg-pic-surface p-2 xl:hidden">
                     <button
                        type="button"
                        class="flex h-10 w-10 items-center justify-center rounded-lg border border-pic-border text-pic-text-main transition hover:border-pic-brand-border hover:bg-pic-brand-soft hover:text-pic-brand disabled:cursor-not-allowed disabled:opacity-40"
                        :disabled="currentPage === 1"
                        aria-label="Página anterior"
                        @click="changePage(currentPage - 1)"
                     >
                        <i class="fa-solid fa-chevron-left text-xs"></i>
                     </button>
                     <span class="truncate text-center text-xs font-bold text-pic-text-main">Página {{ currentPage }} de {{ totalPages }}</span>
                     <button
                        type="button"
                        class="flex h-10 w-10 items-center justify-center rounded-lg border border-pic-border text-pic-text-main transition hover:border-pic-brand-border hover:bg-pic-brand-soft hover:text-pic-brand disabled:cursor-not-allowed disabled:opacity-40"
                        :disabled="currentPage === totalPages"
                        aria-label="Página siguiente"
                        @click="changePage(currentPage + 1)"
                     >
                        <i class="fa-solid fa-chevron-right text-xs"></i>
                     </button>
                  </div>

                  <footer class="hidden gap-3 pt-1 text-sm font-medium text-pic-text-muted xl:flex xl:flex-row xl:items-center xl:justify-between">
                     <p>{{ currentRangeLabel }}</p>

                     <div class="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                        <button
                           type="button"
                           class="h-10 shrink-0 rounded-lg border border-pic-border bg-pic-surface px-4 font-bold text-pic-text-main transition hover:border-pic-brand-border hover:bg-pic-brand-soft hover:text-pic-brand disabled:cursor-not-allowed disabled:opacity-50"
                           :disabled="currentPage === 1"
                           @click="changePage(currentPage - 1)"
                        >
                           Anterior
                        </button>
                        <button
                           v-for="page in visiblePages"
                           :key="page"
                           type="button"
                           class="h-10 min-w-10 shrink-0 rounded-lg border px-3 font-black transition focus:outline-none focus:ring-2 focus:ring-pic-brand-border"
                           :class="page === currentPage
                              ? 'border-pic-brand bg-pic-brand text-white'
                              : 'border-pic-border bg-pic-surface text-pic-text-main hover:border-pic-brand-border hover:bg-pic-brand-soft hover:text-pic-brand'"
                           @click="changePage(page)"
                        >
                           {{ page }}
                        </button>
                        <span v-if="totalPages > visiblePages[visiblePages.length - 1]" class="px-2 font-black text-pic-text-muted">
                           ...
                        </span>
                        <button
                           v-if="totalPages > visiblePages[visiblePages.length - 1]"
                           type="button"
                           class="h-10 min-w-10 shrink-0 rounded-lg border border-pic-border bg-pic-surface px-3 font-black text-pic-text-main transition hover:border-pic-brand-border hover:bg-pic-brand-soft hover:text-pic-brand"
                           @click="changePage(totalPages)"
                        >
                           {{ totalPages }}
                        </button>
                        <button
                           type="button"
                           class="h-10 shrink-0 rounded-lg border border-pic-border bg-pic-surface px-4 font-bold text-pic-text-main transition hover:border-pic-brand-border hover:bg-pic-brand-soft hover:text-pic-brand disabled:cursor-not-allowed disabled:opacity-50"
                           :disabled="currentPage === totalPages"
                           @click="changePage(currentPage + 1)"
                        >
                           Siguiente
                        </button>
                     </div>
                  </footer>
               </template>
            </section>
         </template>

         <section v-if="isDetailOpen" class="-mx-3 bg-white px-3 py-4 sm:mx-0 sm:rounded-lg sm:p-5 sm:shadow-sm">
            <ApprovalDetailModal
               v-model="showDetailModal"
               :approval="selectedApproval"
               :can-resolve="canResolveSelected"
               :can-cancel="canCancelSelected"
               @resolved="handleResolved"
               @cancelled="handleCancelled"
            />
         </section>
      </div>
   </div>
</template>
