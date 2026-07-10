<!-- src/modules/Hub/views/HubView.vue -->
<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import { useSetupStore } from '@/modules/Setup/stores/setupStores';
import { useProfileStore } from '@/modules/UserProfile/stores/profileStore';
import { useApprovalsStore } from '@/modules/Approvals/stores/approvalsStore';
import { getModuleVisualStyle } from '@/modules/Shared/design/moduleStyles';
import CacheProgress from '@/modules/Shared/components/CacheProgress.vue';
import NoticesPanel from '../components/NoticesPanel.vue';

interface HubMetric {
    label: string;
    value: string;
    caption: string;
    icon: string;
    tone: 'brand' | 'orange' | 'blue' | 'purple' | 'teal' | 'yellow';
    route?: string;
    actionLabel?: string;
}

interface HubKpiCard {
    label: string;
    value: string;
    caption: string;
    icon: string;
    tone: 'brand' | 'orange' | 'blue' | 'purple' | 'teal' | 'yellow';
    route?: string;
}

const auth = useAuthStore();
const setupStore = useSetupStore();
const profileStore = useProfileStore();
const approvalsStore = useApprovalsStore();

onMounted(async () => {
    if (setupStore.modules.length === 0) {
        await setupStore.fetchModules();
    }

    await setupStore.fetchHubConfig();
    approvalsStore.fetchAssignedApprovals();
    approvalsStore.fetchApprovals();
});

const dashboardModules = computed(() => setupStore.userMenu.filter(m => m.ModuleKey !== 'HUB'));
const displayName = computed(() => profileStore.profile?.nombre || auth.user?.nombre || auth.user?.username || 'Usuario');
const showManagementTray = computed(() => setupStore.hubFeatureVisibility['hub.management_tray']);
const showQuickActions = computed(() => setupStore.hubFeatureVisibility['hub.quick_actions']);
const showKpiCards = computed(() => setupStore.hubFeatureVisibility['hub.kpi_cards']);
const showNoticesPanel = computed(() => setupStore.hubFeatureVisibility['hub.notices_panel']);
const showActivityPanel = computed(() => setupStore.hubFeatureVisibility['hub.activity_panel']);
const showHubAside = computed(() => showNoticesPanel.value || showActivityPanel.value);

const formatCount = (value: number) => new Intl.NumberFormat('es-MX').format(value);

const myPendingCount = computed(() =>
    approvalsStore.approvals.filter(approval =>
        approval.status === 'PENDING' && approval.requestedById === auth.user?.id
    ).length
);

const resolvedRecentCount = computed(() =>
    approvalsStore.assignedApprovals.filter(approval => approval.status !== 'PENDING').length
);

const activeHubFeatureCount = computed(() =>
    Object.values(setupStore.hubFeatureVisibility).filter(Boolean).length
);

const scopeLabel = computed(() => {
    const scope = setupStore.hubConfig?.scope;
    if (scope?.gerencia && scope?.jefatura) return `${scope.gerencia} / ${scope.jefatura}`;
    if (scope?.gerencia) return scope.gerencia;
    if (auth.user?.role) return auth.user.role;
    return `Nivel ${auth.userLevel}`;
});

const hubKpiCards = computed<HubKpiCard[]>(() => [
    {
        label: 'Modulos activos',
        value: formatCount(dashboardModules.value.length),
        caption: 'Disponibles para tu perfil',
        icon: 'fa-solid fa-layer-group',
        tone: 'brand',
    },
    {
        label: 'Bloques del hub',
        value: `${activeHubFeatureCount.value}/5`,
        caption: 'Configuracion visible',
        icon: 'fa-solid fa-sliders',
        tone: 'blue',
        route: '/admin/setup',
    },
    {
        label: 'Pendientes',
        value: formatCount(approvalsStore.assignedPendingCount + myPendingCount.value),
        caption: 'Solicitudes activas',
        icon: 'fa-solid fa-inbox',
        tone: 'blue',
        route: '/admin/approvals',
    },
    {
        label: 'Alcance',
        value: scopeLabel.value,
        caption: 'Perfil operativo',
        icon: 'fa-solid fa-user-shield',
        tone: 'teal',
    },
]);

const hubMetrics = computed<HubMetric[]>(() => [
    {
        label: 'Mis solicitudes',
        value: formatCount(myPendingCount.value),
        caption: approvalsStore.isLoading ? 'Cargando' : 'Pendientes',
        icon: 'fa-solid fa-paper-plane',
        tone: 'blue',
    },
    {
        label: 'Por resolver',
        value: formatCount(approvalsStore.assignedPendingCount),
        caption: approvalsStore.isLoadingAssigned ? 'Cargando' : 'Asignadas',
        icon: 'fa-solid fa-clipboard-list',
        tone: 'danger',
    },    
    {
        label: 'Resueltas recientes',
        value: formatCount(resolvedRecentCount.value),
        caption: 'Ultimos 7 dias',
        icon: 'fa-solid fa-clock-rotate-left',
        tone: 'success',
    },
    {
        label: 'Historial',
        value: '',
        caption: '',
        actionLabel: 'Ver todo',
        icon: 'fa-solid fa-box-archive',
        tone: 'purple',
        route: '/admin/approvals',
    },
]);

const quickActions = [
    {
        label: 'Nueva solicitud',
        caption: 'Crear aprobacion',
        icon: 'fa-solid fa-square-plus',
        route: '/admin/approvals',
        color: 'text-white',
        bg: 'bg-gradient-to-br from-pic-brand to-red-500',
    },
    {
        label: 'Mis pendientes',
        caption: 'Ver mis tareas',
        icon: 'fa-solid fa-file-circle-check',
        route: '/admin/approvals',
        color: 'text-white',
        bg: 'bg-gradient-to-br from-[hsl(var(--pic-accent-orange))] to-amber-400',
    },
    {
        label: 'Consultas recientes',
        caption: 'Acceder al historial',
        icon: 'fa-solid fa-clock',
        route: '/admin/approvals',
        color: 'text-white',
        bg: 'bg-gradient-to-br from-[hsl(var(--pic-accent-blue))] to-sky-400',
    },
    {
        label: 'Reportes favoritos',
        caption: 'Ver guardados',
        icon: 'fa-regular fa-star',
        route: '/admin/pic',
        color: 'text-white',
        bg: 'bg-gradient-to-br from-[hsl(var(--pic-accent-purple))] to-fuchsia-400',
    },
];

const recentActivity = [
    { icon: 'fa-regular fa-file-lines', title: 'Carga de metas completada', detail: 'Archivo: Metas_Mayo_2024.xlsx', time: 'Hace 25 min' },
    { icon: 'fa-solid fa-user-check', title: 'Validacion de clientes', detail: '12 nuevos clientes validados', time: 'Hace 1 h' },
    { icon: 'fa-regular fa-file-pdf', title: 'Reporte PIC generado', detail: 'Ventas_Mensual_Abril_2024.pdf', time: 'Hace 2 h' },
];

const metricToneClass = (tone: string) => ({
    brand: 'bg-pic-brand-soft text-pic-brand',
    orange: 'bg-[hsl(var(--pic-accent-orange-soft))] text-[hsl(var(--pic-accent-orange))]',
    blue: 'bg-[hsl(var(--pic-accent-blue-soft))] text-[hsl(var(--pic-accent-blue))]',
    success: 'bg-[hsl(var(--pic-success)/0.12)] text-pic-success',
    danger: 'bg-[hsl(var(--pic-danger)/0.12)] text-pic-danger',
    purple: 'bg-[hsl(var(--pic-accent-purple-soft))] text-[hsl(var(--pic-accent-purple))]',
    teal: 'bg-[hsl(var(--pic-accent-teal-soft))] text-[hsl(var(--pic-accent-teal))]',
    yellow: 'bg-[hsl(var(--pic-accent-yellow-soft))] text-[hsl(var(--pic-accent-yellow))]',
}[tone] || 'bg-slate-100 text-slate-500');

const metricTextClass = (tone: string) => ({
    brand: 'text-pic-brand',
    orange: 'text-[hsl(var(--pic-accent-orange))]',
    blue: 'text-[hsl(var(--pic-accent-blue))]',
    success: 'text-pic-success',
    danger: 'text-pic-danger',
    purple: 'text-[hsl(var(--pic-accent-purple))]',
    teal: 'text-[hsl(var(--pic-accent-teal))]',
    yellow: 'text-[hsl(var(--pic-accent-yellow))]',
}[tone] || 'text-slate-500');

const metricAccentClass = (tone: string) => ({
    brand: 'bg-pic-brand',
    orange: 'bg-[hsl(var(--pic-accent-orange))]',
    blue: 'bg-[hsl(var(--pic-accent-blue))]',
    success: 'bg-pic-success',
    danger: 'bg-pic-danger',
    purple: 'bg-[hsl(var(--pic-accent-purple))]',
    teal: 'bg-[hsl(var(--pic-accent-teal))]',
    yellow: 'bg-[hsl(var(--pic-accent-yellow))]',
}[tone] || 'bg-slate-300');
</script>

<template>
    <main class="min-h-full bg-pic-background px-4 pb-6 pt-4 sm:px-5 sm:py-4 lg:px-7">
        <div class="mx-auto max-w-[1540px] space-y-4 sm:space-y-6">
            <section class="relative overflow-hidden px-0 pb-1 pt-3 sm:px-0 sm:py-5 lg:py-7">
                <div class="pointer-events-none absolute inset-x-0 bottom-0 hidden h-28 overflow-hidden sm:block">
                    <div class="hub-wave absolute left-[22%] top-4 h-36 w-[64rem] rounded-[50%] border border-pic-brand/15"></div>
                    <div class="hub-wave absolute left-[28%] top-8 h-28 w-[54rem] rounded-[50%] border border-pic-brand/10"></div>
                </div>
                <div class="pointer-events-none absolute -right-16 top-1 h-40 w-40 rotate-12 text-pic-brand/5 sm:hidden">
                    <i class="fa-solid fa-crown text-[10rem]"></i>
                </div>
                <div class="pointer-events-none absolute right-6 top-6 hidden items-end gap-3 lg:flex">
                    <span class="h-24 w-11 rounded-t-lg bg-gradient-to-b from-red-300 to-pic-brand shadow-lg shadow-pic-brand/20"></span>
                    <span class="h-14 w-11 rounded-t-lg bg-gradient-to-b from-red-200 to-red-400 shadow-lg shadow-pic-brand/10"></span>
                    <span class="h-20 w-11 rounded-t-lg bg-gradient-to-b from-red-200 to-red-500 shadow-lg shadow-pic-brand/10"></span>
                </div>

                <div class="relative grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
                    <div class="min-w-0">
                        <p class="hidden text-[10px] font-black uppercase tracking-[0.28em] text-pic-brand sm:block">Hub Central</p>
                        <h1 class="max-w-[14rem] text-[28px] font-black leading-[1.02] tracking-tight text-pic-text-main sm:mt-3 sm:max-w-none sm:text-3xl lg:text-4xl">
                            Bienvenido, {{ displayName }}!
                        </h1>
                        <p class="mt-2 max-w-[18rem] text-[12px] font-semibold leading-5 text-pic-text-muted sm:max-w-2xl sm:text-sm sm:leading-6">
                            Este es el resumen general de PIC System. Selecciona un modulo para comenzar.
                        </p>
                    </div>

                    <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-1">
                        <article class="group grid min-h-[58px] grid-cols-[42px_minmax(0,1fr)_20px] items-center gap-3 rounded-lg border border-pic-border bg-white px-3 py-2.5 shadow-sm sm:flex sm:min-h-0 sm:px-4 sm:py-3">
                            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--pic-success)/0.12)] text-pic-success sm:h-10 sm:w-10">
                                <i class="fa-solid fa-chart-pie text-sm"></i>
                            </span>
                            <div class="min-w-0">
                                <p class="truncate text-xs font-black text-pic-text-main">Actualizacion de datos</p>
                                <p class="text-[11px] font-semibold text-pic-text-muted">Hace 15 minutos</p>
                            </div>
                            <i class="fa-solid fa-chevron-right justify-self-end text-xs text-slate-400 sm:hidden"></i>
                            <div class="col-span-full h-1.5 overflow-hidden rounded-full bg-slate-100 sm:hidden">
                                <div class="h-full w-full rounded-full bg-gradient-to-r from-pic-brand via-red-400 to-pic-brand"></div>
                            </div>
                        </article>
                        <article class="mobile-cache-card overflow-hidden rounded-lg border border-pic-border bg-white shadow-sm sm:px-4 sm:py-3">
                            <CacheProgress />
                        </article>
                    </div>
                </div>
            </section>

            <section v-if="showKpiCards" class="hidden grid-cols-1 gap-3 sm:grid sm:grid-cols-2 xl:grid-cols-4">
                <component
                    :is="kpi.route ? 'router-link' : 'article'"
                    v-for="kpi in hubKpiCards"
                    :key="kpi.label"
                    :to="kpi.route"
                    class="group relative min-h-[118px] overflow-hidden rounded-xl border border-pic-border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-pic-brand-border hover:shadow-md sm:p-5"
                >
                    <span class="absolute inset-x-0 top-0 h-1" :class="metricAccentClass(kpi.tone)"></span>
                    <div class="flex items-start justify-between gap-4">
                        <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl shadow-sm" :class="metricToneClass(kpi.tone)">
                            <i :class="kpi.icon"></i>
                        </span>
                        <span v-if="kpi.route" class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-pic-border bg-pic-muted-surface text-slate-400 transition group-hover:border-pic-brand-border group-hover:text-pic-brand">
                            <i class="fa-solid fa-arrow-right text-xs"></i>
                        </span>
                    </div>
                    <div class="mt-4 min-w-0">
                        <p class="text-[10px] font-black uppercase tracking-[0.2em]" :class="metricTextClass(kpi.tone)">
                            {{ kpi.label }}
                        </p>
                        <p class="mt-1 truncate text-2xl font-black leading-tight text-pic-text-main">
                            {{ kpi.value }}
                        </p>
                        <p class="mt-1 text-xs font-semibold text-pic-text-muted">
                            {{ kpi.caption }}
                        </p>
                    </div>
                </component>
            </section>

            <section
                v-if="showManagementTray"
                class="overflow-hidden rounded-xl border border-pic-border bg-white shadow-sm"
            >
                <div class="grid grid-cols-4 divide-x divide-pic-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
                <router-link
                    v-for="metric in hubMetrics"
                    :key="metric.label"
                    :to="metric.route || '/admin/approvals'"
                    class="group flex min-h-[108px] flex-col items-start justify-between gap-2 px-3 py-3 transition hover:bg-pic-muted-surface sm:grid sm:min-h-[104px] sm:grid-cols-[68px_minmax(0,1fr)] sm:items-center sm:gap-4 sm:px-5 sm:py-4 lg:min-h-[116px]"
                >
                    <span class="flex h-8 w-8 items-center justify-center rounded-lg text-sm shadow-sm shadow-slate-200/70 sm:h-14 sm:w-14 sm:rounded-xl sm:text-2xl sm:shadow-lg" :class="metricToneClass(metric.tone)">
                        <i :class="metric.icon"></i>
                    </span>
                    <span class="min-w-0">
                        <span class="hidden text-[10px] font-black uppercase tracking-[0.2em] sm:block" :class="metricTextClass(metric.tone)">
                            {{ metric.label }}
                        </span>
                        <span v-if="metric.value" class="block text-xl font-black leading-none text-pic-text-main sm:mt-1 sm:text-3xl">
                            {{ metric.value }}
                        </span>
                        <span v-if="metric.value" class="mt-1 block text-[10px] font-bold leading-tight text-pic-text-muted sm:text-xs sm:font-semibold">
                            {{ metric.label }}
                        </span>
                        <span v-if="metric.caption" class="hidden text-xs font-semibold text-pic-text-muted sm:mt-1 sm:block">
                            {{ metric.caption }}
                        </span>
                        <span
                            v-if="!metric.value"
                            class="inline-flex h-7 items-center rounded-lg border border-pic-border bg-white px-2 text-[10px] font-black text-pic-text-main shadow-sm transition group-hover:border-pic-brand-border group-hover:text-pic-brand sm:mt-2 sm:h-8 sm:px-3 sm:text-xs"
                        >
                            {{ metric.actionLabel }}
                        </span>
                    </span>
                </router-link>
                </div>
            </section>

            <div class="grid grid-cols-1 gap-5 xl:items-start" :class="showHubAside ? 'xl:grid-cols-[minmax(0,1fr)_360px]' : ''">
                <section class="min-w-0 space-y-5 sm:space-y-6">
                    <section v-if="showQuickActions" class="overflow-hidden rounded-xl text-pic-text-main sm:bg-pic-nav sm:p-5 sm:text-white sm:shadow-xl sm:shadow-slate-300/30">
                        <div class="mb-2 flex items-center justify-between gap-3 sm:mb-4">
                            <h2 class="text-xs font-black uppercase tracking-wide sm:text-sm">Acceso rapido</h2>
                            <router-link
                                to="/admin/setup"
                                class="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-1 text-[11px] font-black text-pic-brand transition hover:bg-pic-brand-soft sm:h-9 sm:border sm:border-white/10 sm:bg-white/5 sm:px-3 sm:text-xs sm:text-white sm:hover:bg-white/10"
                            >
                                <i class="fa-solid fa-grip text-[10px]"></i>
                                Personalizar
                            </router-link>
                        </div>

                        <div class="grid grid-cols-2 gap-2 rounded-xl bg-pic-nav p-2 shadow-xl shadow-slate-300/30 sm:grid-cols-2 sm:gap-3 sm:rounded-none sm:bg-transparent sm:p-0 sm:shadow-none 2xl:grid-cols-4">
                            <router-link
                                v-for="action in quickActions"
                                :key="action.label"
                                :to="action.route"
                                class="group grid min-h-[58px] grid-cols-[32px_minmax(0,1fr)_24px] items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-2 py-2 transition hover:-translate-y-0.5 hover:bg-white/15 hover:shadow-lg hover:shadow-black/10 sm:min-h-[74px] sm:grid-cols-[44px_minmax(0,1fr)_32px] sm:gap-3 sm:px-3 sm:py-3"
                            >
                                <span class="flex h-8 w-8 items-center justify-center rounded-lg text-sm shadow-lg shadow-black/10 sm:h-10 sm:w-10 sm:text-base" :class="[action.bg, action.color]">
                                    <i :class="action.icon"></i>
                                </span>
                                <span class="min-w-0">
                                    <span class="block truncate text-[11px] font-black leading-tight text-white sm:text-sm">{{ action.label }}</span>
                                    <span class="mt-0.5 block truncate text-[10px] font-semibold leading-tight text-pic-nav-text-muted sm:text-xs">{{ action.caption }}</span>
                                </span>
                                <span class="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-pic-nav-text-muted transition group-hover:bg-white/20 group-hover:text-white sm:h-8 sm:w-8">
                                    <i class="fa-solid fa-arrow-right text-xs"></i>
                                </span>
                            </router-link>
                        </div>
                    </section>

                    <section>
                        <div class="mb-3 flex items-center justify-between gap-3 sm:mb-4">
                            <h2 class="text-xs font-black uppercase tracking-wide text-pic-text-main sm:text-base">Modulos principales</h2>
                            <span class="rounded-lg px-0 py-1.5 text-[10px] font-black text-pic-brand sm:border sm:border-pic-border sm:bg-white sm:px-3 sm:text-xs sm:font-bold sm:text-pic-text-muted sm:shadow-sm">
                                {{ dashboardModules.length }} modulos disponibles
                            </span>
                        </div>

                        <div v-if="setupStore.isLoading" class="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 2xl:grid-cols-4">
                            <div v-for="i in 8" :key="i" class="h-24 animate-pulse rounded-lg border border-pic-border bg-white p-3 shadow-sm sm:h-40 sm:p-5">
                                <div class="mb-5 h-11 w-11 rounded-lg bg-slate-100"></div>
                                <div class="mb-3 h-5 w-2/3 rounded bg-slate-100"></div>
                                <div class="mb-2 h-3 w-full rounded bg-slate-100"></div>
                                <div class="h-3 w-4/5 rounded bg-slate-100"></div>
                            </div>
                        </div>

                        <div v-else class="grid grid-cols-2 gap-2 fade-in sm:gap-3 lg:grid-cols-3 2xl:grid-cols-4">
                            <router-link
                                v-for="mod in dashboardModules"
                                :key="mod.ModuleId"
                                :to="mod.Route"
                                class="group relative min-h-[86px] overflow-hidden rounded-lg border border-pic-border bg-white p-2.5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-pic-brand-border hover:shadow-md sm:min-h-40 sm:p-5"
                            >
                                <span class="absolute inset-x-0 bottom-0 h-0.5 sm:h-1" :class="getModuleVisualStyle(mod).accent"></span>
                                <div class="grid grid-cols-[34px_minmax(0,1fr)] gap-2 pr-4 sm:grid-cols-[58px_minmax(0,1fr)] sm:gap-4 sm:pb-8 sm:pr-0">
                                    <div
                                        class="flex h-8 w-8 items-center justify-center rounded-lg text-sm transition group-hover:scale-105 sm:h-14 sm:w-14 sm:rounded-xl sm:text-2xl"
                                        :class="[getModuleVisualStyle(mod).bg, getModuleVisualStyle(mod).color]"
                                    >
                                        <i :class="mod.Icon"></i>
                                    </div>
                                    <div class="min-w-0">
                                        <h3 class="line-clamp-2 text-[11px] font-black leading-tight text-pic-text-main transition group-hover:text-pic-brand sm:truncate sm:text-base">
                                            {{ mod.Label }}
                                        </h3>
                                        <p class="mt-1 line-clamp-2 text-[10px] font-semibold leading-3 text-pic-text-muted sm:mt-2 sm:line-clamp-3 sm:text-sm sm:leading-5">
                                            {{ getModuleVisualStyle(mod).desc }}
                                        </p>
                                    </div>
                                </div>
                                <div class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-pic-brand sm:bottom-5 sm:right-5 sm:top-auto sm:translate-y-0">
                                    <i class="fa-solid fa-chevron-right text-xs sm:text-sm"></i>
                                </div>
                            </router-link>

                            <div v-if="setupStore.userMenu.length === 0" class="col-span-full rounded-lg border border-dashed border-pic-border bg-white py-12 text-center text-pic-text-muted">
                                <i class="fa-regular fa-folder-open mb-4 text-4xl"></i>
                                <p class="text-sm font-semibold">No tienes modulos asignados. Contacta al administrador.</p>
                            </div>
                        </div>
                    </section>
                </section>

                <aside v-if="showHubAside" class="min-w-0 space-y-4 xl:sticky xl:top-5">
                    <NoticesPanel v-if="showNoticesPanel" />

                    <section v-if="showActivityPanel" class="overflow-hidden rounded-xl border border-pic-border bg-white shadow-sm">
                        <div class="flex items-center justify-between gap-3 border-b border-pic-border px-4 py-4 sm:px-5">
                            <div class="flex min-w-0 items-center gap-3">
                                <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--pic-accent-blue-soft))] text-[hsl(var(--pic-accent-blue))] shadow-sm">
                                    <i class="fa-regular fa-clock text-sm"></i>
                                </span>
                                <div class="min-w-0">
                                    <p class="text-[10px] font-black uppercase tracking-[0.22em] text-[hsl(var(--pic-accent-blue))]">Actividad</p>
                                    <h2 class="truncate text-sm font-black text-pic-text-main">Actividad reciente</h2>
                                </div>
                            </div>
                            <span class="rounded-lg border border-pic-border bg-pic-muted-surface px-2.5 py-1 text-[10px] font-black uppercase text-pic-text-muted">
                                Ultimas
                            </span>
                        </div>
                        <div class="divide-y divide-pic-border">
                            <article v-for="item in recentActivity" :key="item.title" class="grid grid-cols-[40px_minmax(0,1fr)] gap-3 px-4 py-4 transition hover:bg-pic-muted-surface sm:px-5">
                                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--pic-success)/0.12)] text-pic-success shadow-sm">
                                    <i :class="item.icon" class="text-sm"></i>
                                </div>
                                <div class="min-w-0">
                                    <div class="flex items-start justify-between gap-2">
                                        <p class="min-w-0 truncate text-sm font-black text-pic-text-main">{{ item.title }}</p>
                                        <p class="shrink-0 pt-0.5 text-[11px] font-black text-pic-text-muted">{{ item.time }}</p>
                                    </div>
                                    <p class="mt-0.5 truncate text-xs font-semibold text-pic-text-muted">{{ item.detail }}</p>
                                </div>
                            </article>
                        </div>
                    </section>
                </aside>
            </div>
        </div>
    </main>
</template>

<style scoped>
.fade-in {
    animation: fadeIn 0.45s ease-out forwards;
    opacity: 0;
    transform: translateY(8px);
}

.hub-wave {
    transform: rotate(-7deg);
}

@media (max-width: 639px) {
    .mobile-cache-card :deep(.cache-progress-card) {
        width: 100%;
        border: 0;
        border-radius: 0.5rem;
        box-shadow: none;
        padding: 0.625rem 0.75rem;
    }
}

@keyframes fadeIn {
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
