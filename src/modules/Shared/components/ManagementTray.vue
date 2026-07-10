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

const metricTone = (index: number) => ['brand', 'orange', 'blue', 'purple'][index % 4];

const metricToneClass = (index: number) => ({
   brand: 'bg-pic-brand-soft text-pic-brand',
   orange: 'bg-[hsl(var(--pic-accent-orange-soft))] text-[hsl(var(--pic-accent-orange))]',
   blue: 'bg-[hsl(var(--pic-accent-blue-soft))] text-[hsl(var(--pic-accent-blue))]',
   purple: 'bg-[hsl(var(--pic-accent-purple-soft))] text-[hsl(var(--pic-accent-purple))]',
}[metricTone(index)] || 'bg-slate-100 text-slate-500');

const metricTextClass = (index: number) => ({
   brand: 'text-pic-brand',
   orange: 'text-[hsl(var(--pic-accent-orange))]',
   blue: 'text-[hsl(var(--pic-accent-blue))]',
   purple: 'text-[hsl(var(--pic-accent-purple))]',
}[metricTone(index)] || 'text-slate-500');

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
   <section class="overflow-hidden rounded-xl border border-pic-border bg-pic-surface shadow-sm shadow-slate-100">
      <div class="grid grid-cols-2 divide-x divide-y divide-pic-border lg:grid-cols-4 lg:divide-y-0">
            <router-link
               v-for="(metric, index) in trayMetrics.filter(item => item.route)"
               :key="metric.id || metric.label"
               :to="metric.route || fullPanelRoute"
               class="group grid min-h-[108px] grid-cols-[40px_minmax(0,1fr)] items-center gap-3 px-3 py-3 transition hover:bg-pic-muted-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pic-brand-border sm:min-h-[116px] sm:grid-cols-[68px_minmax(0,1fr)] sm:gap-4 sm:px-5 sm:py-4"
               :class="metric.active ? 'bg-pic-brand-soft shadow-[inset_3px_0_0_0_hsl(var(--pic-brand))]' : ''"
               @click="handleMetricClick(metric)"
            >
               <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg shadow-sm shadow-slate-200/70 sm:h-14 sm:w-14 sm:rounded-xl sm:text-2xl sm:shadow-lg" :class="metricToneClass(index)">
                  <i :class="metric.icon"></i>
               </span>
               <span class="min-w-0">
                  <span class="block text-[10px] font-bold uppercase tracking-[0.16em]" :class="metricTextClass(index)">{{ metric.label }}</span>
                  <span class="mt-1 block text-2xl font-black leading-none text-pic-text-main sm:text-3xl">{{ metric.value }}</span>
                  <span class="mt-1 block text-[11px] font-semibold leading-tight text-pic-text-muted sm:text-xs">{{ metric.caption }}</span>
               </span>
            </router-link>

            <button
               v-for="(metric, index) in trayMetrics.filter(item => !item.route)"
               :key="metric.id || metric.label"
               type="button"
               class="group grid min-h-[108px] grid-cols-[40px_minmax(0,1fr)] items-center gap-3 px-3 py-3 text-left transition hover:bg-pic-muted-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pic-brand-border sm:min-h-[116px] sm:grid-cols-[68px_minmax(0,1fr)] sm:gap-4 sm:px-5 sm:py-4"
               :class="metric.active ? 'bg-pic-brand-soft shadow-[inset_3px_0_0_0_hsl(var(--pic-brand))]' : ''"
               @click="handleMetricClick(metric)"
            >
               <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg shadow-sm shadow-slate-200/70 sm:h-14 sm:w-14 sm:rounded-xl sm:text-2xl sm:shadow-lg" :class="metricToneClass(index)">
                  <i :class="metric.icon"></i>
               </span>
               <span class="min-w-0">
                  <span class="block text-[10px] font-bold uppercase tracking-[0.16em]" :class="metricTextClass(index)">{{ metric.label }}</span>
                  <span class="mt-1 block text-2xl font-black leading-none text-pic-text-main sm:text-3xl">{{ metric.value }}</span>
                  <span class="mt-1 block text-[11px] font-semibold leading-tight text-pic-text-muted sm:text-xs">{{ metric.caption }}</span>
               </span>
            </button>
      </div>
   </section>
</template>
