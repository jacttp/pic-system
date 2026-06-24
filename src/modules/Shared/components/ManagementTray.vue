<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useApprovalsStore } from '@/modules/Approvals/stores/approvalsStore';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';

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

const props = withDefaults(defineProps<{
   eyebrow?: string
   title?: string
   subtitle?: string
   icon?: string
   fullPanelRoute?: string
   metrics?: TrayMetric[]
   loadApprovals?: boolean
}>(), {
   eyebrow: 'Bandeja de gestion',
   title: 'Aprobaciones CPFR y solicitudes internas',
   subtitle: 'Accesos directos al panel de aprobaciones para revisar pendientes, seguimiento e historial.',
   icon: 'fa-solid fa-clipboard-check',
   fullPanelRoute: '/admin/approvals',
   loadApprovals: true,
});

const emit = defineEmits<{
   metricClick: [metric: TrayMetric]
}>();

const approvalsStore = useApprovalsStore();
const authStore = useAuthStore();

const formatCount = (value: number) => new Intl.NumberFormat('es-MX').format(value);

const myPendingCount = computed(() =>
   approvalsStore.approvals.filter(approval =>
      approval.status === 'PENDING' && approval.requestedById === authStore.user?.id
   ).length
);

const resolvedRecentCount = computed(() =>
   approvalsStore.assignedApprovals.filter(approval => approval.status !== 'PENDING').length
);

const trayMetrics = computed<TrayMetric[]>(() => props.metrics || [
   {
      label: 'Por resolver',
      value: formatCount(approvalsStore.assignedPendingCount),
      caption: approvalsStore.isLoadingAssigned ? 'Cargando' : 'Asignadas',
      route: props.fullPanelRoute,
      icon: 'fa-solid fa-inbox',
      emphasis: true,
   },
   {
      label: 'Mis solicitudes',
      value: formatCount(myPendingCount.value),
      caption: approvalsStore.isLoading ? 'Cargando' : 'Pendientes',
      route: props.fullPanelRoute,
      icon: 'fa-solid fa-paper-plane',
   },
   {
      label: 'Resueltas recientes',
      value: formatCount(resolvedRecentCount.value),
      caption: 'Historial',
      route: props.fullPanelRoute,
      icon: 'fa-solid fa-clock-rotate-left',
   },
]);

const metricClass = (metric: TrayMetric) => [
   metric.emphasis
      ? 'border-brand-200 bg-brand-50/40 hover:border-brand-300'
      : 'border-slate-200 bg-white hover:border-brand-200 hover:bg-brand-50/20',
   metric.active ? 'border-brand-300 bg-brand-50/50 ring-1 ring-brand-100' : '',
];

const iconClass = (metric: TrayMetric) =>
   metric.emphasis || metric.active
      ? 'bg-white text-brand-600 ring-1 ring-brand-100'
      : 'bg-brand-50 text-brand-600';

const metricGridClass = computed(() =>
   trayMetrics.value.length >= 4 ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-3'
);

const handleMetricClick = (metric: TrayMetric) => {
   emit('metricClick', metric);
};

onMounted(() => {
   if (!props.loadApprovals) return;

   approvalsStore.fetchAssignedApprovals();
   approvalsStore.fetchApprovals();
});
</script>

<template>
   <section class="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div class="p-4 sm:p-5">
         <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="flex min-w-0 items-start gap-3">
               <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                  <i :class="[icon, 'text-sm']"></i>
               </span>
               <div class="min-w-0">
                  <p class="text-[10px] font-black uppercase tracking-[0.2em] text-brand-500">{{ eyebrow }}</p>
                  <h2 class="mt-0.5 text-base font-extrabold leading-tight text-slate-900 sm:text-lg">
                     {{ title }}
                  </h2>
                  <p class="mt-1 max-w-3xl text-sm leading-5 text-slate-500">
                     {{ subtitle }}
                  </p>
               </div>
            </div>
         </div>

         <div class="mt-4 grid grid-cols-1 gap-3" :class="metricGridClass">
            <router-link
               v-for="metric in trayMetrics.filter(item => item.route)"
               :key="metric.id || metric.label"
               :to="metric.route || fullPanelRoute"
               class="group rounded-lg border px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm"
               :class="metricClass(metric)"
               @click="handleMetricClick(metric)"
            >
               <div class="mb-3 flex items-center justify-between gap-3">
                  <span
                     class="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                     :class="iconClass(metric)"
                  >
                     <i :class="metric.icon"></i>
                  </span>
                  <i class="fa-solid fa-arrow-right text-xs text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500"></i>
               </div>
               <p class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{{ metric.label }}</p>
               <div class="mt-1 flex items-end justify-between gap-3">
                  <p class="text-2xl font-black leading-none text-slate-950">{{ metric.value }}</p>
                  <p class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{{ metric.caption }}</p>
               </div>
            </router-link>

            <button
               v-for="metric in trayMetrics.filter(item => !item.route)"
               :key="metric.id || metric.label"
               type="button"
               class="group rounded-lg border px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm"
               :class="metricClass(metric)"
               @click="handleMetricClick(metric)"
            >
               <div class="mb-3 flex items-center justify-between gap-3">
                  <span
                     class="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                     :class="iconClass(metric)"
                  >
                     <i :class="metric.icon"></i>
                  </span>
                  <i class="fa-solid fa-filter text-xs text-slate-300 transition group-hover:text-brand-500"></i>
               </div>
               <p class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{{ metric.label }}</p>
               <div class="mt-1 flex items-end justify-between gap-3">
                  <p class="text-2xl font-black leading-none text-slate-950">{{ metric.value }}</p>
                  <p class="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{{ metric.caption }}</p>
               </div>
            </button>
         </div>
      </div>
   </section>
</template>
