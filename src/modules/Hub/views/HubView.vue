<!-- src/modules/Hub/views/HubView.vue -->
<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import { useSetupStore } from '@/modules/Setup/stores/setupStores';
import CacheProgress from '@/modules/Shared/components/CacheProgress.vue';

const auth = useAuthStore();
const setupStore = useSetupStore();

onMounted(async () => {
    if (setupStore.modules.length === 0) {
        await setupStore.fetchModules();
    }
    await setupStore.fetchHubConfig();
});

const dashboardModules = computed(() => {
    return setupStore.userMenu.filter(m => m.ModuleKey !== 'HUB');
});

const displayName = computed(() => auth.user?.username || 'Usuario');

const kpiCards = [
    {
        label: 'Ventas YTD',
        value: '$7.428M',
        delta: '+12.5% vs ano anterior',
        icon: 'fa-solid fa-chart-column',
        tone: 'rose',
        path: 'M2 34 L18 26 L30 19 L44 24 L58 18 L72 29 L88 36 L104 30 L118 24 L132 27 L148 18 L164 10'
    },
    {
        label: 'Clientes Activos',
        value: '3,205',
        delta: '+6.8% vs mes anterior',
        icon: 'fa-solid fa-chart-pie',
        tone: 'blue',
        path: 'M2 36 L18 30 L32 22 L48 29 L64 20 L80 14 L96 20 L112 23 L128 16 L144 6 L164 11'
    },
    {
        label: 'Fill Rate',
        value: '96.4%',
        delta: '+2.1 p.p. vs mes anterior',
        icon: 'fa-solid fa-bullseye',
        tone: 'amber',
        path: 'M2 34 L18 28 L34 18 L50 27 L66 33 L82 24 L98 12 L114 17 L130 10 L146 10 L164 5'
    },
    {
        label: 'Ordenes (Mes)',
        value: '1,842',
        delta: '+8.3% vs mes anterior',
        icon: 'fa-regular fa-calendar-check',
        tone: 'emerald',
        path: 'M2 35 L18 29 L34 27 L50 18 L66 24 L82 20 L98 12 L114 16 L130 13 L146 5 L164 8'
    }
];

const recentActivity = [
    { icon: 'fa-regular fa-file-lines', title: 'Carga de metas completada', detail: 'Archivo: Metas_Mayo_2024.xlsx', time: 'Hace 25 min' },
    { icon: 'fa-solid fa-user-check', title: 'Validacion de clientes', detail: '12 nuevos clientes validados', time: 'Hace 1 h' },
    { icon: 'fa-regular fa-file-pdf', title: 'Reporte PIC generado', detail: 'Ventas_Mensual_Abril_2024.pdf', time: 'Hace 2 h' },
    { icon: 'fa-solid fa-link', title: 'Cadenas CPFR actualizadas', detail: 'Total: 8 cadenas', time: 'Ayer' }
];

const quickActions = [
    { icon: 'fa-solid fa-file-arrow-up', label: 'Cargar archivo de metas', tone: 'rose' },
    { icon: 'fa-solid fa-chart-column', label: 'Generar Reporte PIC', tone: 'blue' },
    { icon: 'fa-solid fa-user-check', label: 'Validar nuevos clientes', tone: 'emerald' },
    { icon: 'fa-solid fa-store', label: 'Consultar sellout', tone: 'amber' }
];

// Mapeo de estilos visuales por Key del modulo
const MODULE_STYLES: Record<string, { color: string, bg: string, desc?: string }> = {
    'HUB': { color: 'text-brand-600', bg: 'bg-brand-50', desc: 'Panel central de bienvenida y accesos rapidos.' },
    'PIC': { color: 'text-brand-600', bg: 'bg-brand-50', desc: 'Dashboard analitico de ventas y metas.' },
    'PRODS': { color: 'text-orange-500', bg: 'bg-orange-50', desc: 'Alta, baja y modificacion de articulos y listas de precios.' },
    'CLI': { color: 'text-emerald-500', bg: 'bg-emerald-50', desc: 'Directorio comercial, segmentacion y datos de contacto.' },

    'USERS': { color: 'text-purple-500', bg: 'bg-purple-50', desc: 'Control de accesos, roles y administracion de personal del sistema.' },
    'SETUP': { color: 'text-brand-800', bg: 'bg-fuchsia-50', desc: 'Dashboard analitico de ventas, cumplimiento de metas y analisis por zona.' },
    'AUDIT': { color: 'text-indigo-500', bg: 'bg-slate-100', desc: 'Historial de movimientos y seguridad del sistema.' },
    'LOGISTICS': { color: 'text-lime-600', bg: 'bg-lime-50', desc: 'Gestion, edicion, alta y publicacion de rutas e itinerarios.' },

    'FORECAST': { color: 'text-violet-500', bg: 'bg-brand-50', desc: 'Dashboard analitico de Forecast, analisis y edicion de metas y proyecciones.' },
    'VAL_CLI': { color: 'text-pink-500', bg: 'bg-pink-50', desc: 'Validacion y aprobacion de nuevos clientes.' },
    'CANNIB': { color: 'text-purple-600', bg: 'bg-purple-50', desc: 'Segmentacion avanzada de clientes por volumen: cuartiles, quintiles, deciles y percentiles.' },
    'SEGMENT': { color: 'text-purple-600', bg: 'bg-purple-50', desc: 'Segmentacion avanzada de clientes por volumen: cuartiles, quintiles, deciles y percentiles.' },
    'COM_STRUCT': { color: 'text-teal-600', bg: 'bg-teal-50', desc: 'Gestion de la estructura territorial comercial: Gerencia, Zona, Jefatura y Ruta.' },
    'UPLOAD_METAS': { color: 'text-teal-700', bg: 'bg-teal-50', desc: 'Importa archivos Excel con las metas de ventas y visualiza el historico.' },
    'CHAIN_CONFIG': { color: 'text-sky-600', bg: 'bg-sky-50', desc: 'Asocia SKUs internos con cadenas, conversiones y parametros operativos CPFR.' },

    'DEFAULT': { color: 'text-slate-500', bg: 'bg-slate-50', desc: 'Modulo del sistema.' },
};

const getStyle = (mod: any) => {
    const key = mod.ModuleKey;
    const fallback = MODULE_STYLES[key] || MODULE_STYLES['DEFAULT']!;

    return {
        color: mod.IconColor || fallback.color,
        bg: mod.BgColor || fallback.bg,
        desc: mod.Description || fallback.desc || 'Descripcion no disponible.'
    };
};
</script>

<template>
    <main class="min-h-full bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div class="mx-auto max-w-[1540px]">
            <header class="mb-6 fade-in flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <p class="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-brand-600">Hub Central</p>
                    <h1 class="text-3xl font-extrabold tracking-tight text-slate-900">
                        Bienvenido, {{ displayName }}!
                    </h1>
                    <p class="mt-2 max-w-2xl text-sm text-slate-500">
                        Este es el resumen general de PIC System. Selecciona un modulo para comenzar.
                    </p>
                </div>

                <div class="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                    <div class="rounded-lg border border-emerald-100 bg-white px-4 py-3 shadow-sm">
                        <div class="flex items-center gap-3">
                            <span class="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                                <i class="fa-solid fa-check text-xs"></i>
                            </span>
                            <div>
                                <p class="text-xs font-bold text-slate-700">Actualizacion de datos</p>
                                <p class="text-[11px] font-medium text-slate-400">Hace 15 minutos</p>
                            </div>
                            <i class="fa-solid fa-rotate text-xs text-slate-300"></i>
                        </div>
                    </div>

                    <CacheProgress />
                </div>
            </header>

            <div
                class="grid grid-cols-1 gap-6"
                :class="setupStore.hubFeatureVisibility['hub.activity_panel'] ? 'xl:grid-cols-[minmax(0,1fr)_320px]' : ''"
            >
                <section class="min-w-0 space-y-6">
                    <div
                        v-if="setupStore.hubFeatureVisibility['hub.kpi_cards']"
                        class="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4"
                    >
                        <article
                            v-for="kpi in kpiCards"
                            :key="kpi.label"
                            class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                        >
                            <div class="flex items-start gap-4">
                                <div
                                    class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-xl"
                                    :class="{
                                        'bg-rose-50 text-brand-600': kpi.tone === 'rose',
                                        'bg-blue-50 text-blue-600': kpi.tone === 'blue',
                                        'bg-amber-50 text-amber-600': kpi.tone === 'amber',
                                        'bg-emerald-50 text-emerald-600': kpi.tone === 'emerald'
                                    }"
                                >
                                    <i :class="kpi.icon"></i>
                                </div>
                                <div class="min-w-0">
                                    <p class="text-sm font-medium text-slate-500">{{ kpi.label }}</p>
                                    <p class="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">{{ kpi.value }}</p>
                                    <p
                                        class="mt-2 text-xs font-semibold"
                                        :class="{
                                            'text-brand-500': kpi.tone === 'rose',
                                            'text-blue-500': kpi.tone === 'blue',
                                            'text-emerald-500': kpi.tone === 'emerald',
                                            'text-amber-500': kpi.tone === 'amber'
                                        }"
                                    >
                                        <i class="fa-solid fa-arrow-trend-up mr-1"></i>{{ kpi.delta }}
                                    </p>
                                </div>
                            </div>
                            <svg class="mt-4 h-12 w-full overflow-visible" viewBox="0 0 166 42" fill="none" aria-hidden="true">
                                <path
                                    :d="kpi.path"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    :class="{
                                        'text-brand-500': kpi.tone === 'rose',
                                        'text-blue-500': kpi.tone === 'blue',
                                        'text-amber-500': kpi.tone === 'amber',
                                        'text-emerald-500': kpi.tone === 'emerald'
                                    }"
                                />
                            </svg>
                        </article>
                    </div>

                    <section>
                        <div class="mb-4 flex items-center justify-between gap-3">
                            <h2 class="text-lg font-extrabold text-slate-900">Modulos principales</h2>
                            <span class="hidden rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200 sm:inline-flex">
                                {{ dashboardModules.length }} disponibles
                            </span>
                        </div>

                        <div v-if="setupStore.isLoading" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                            <div v-for="i in 8" :key="i" class="h-44 animate-pulse rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
                                <div class="mb-5 h-11 w-11 rounded-lg bg-slate-100"></div>
                                <div class="mb-3 h-5 w-2/3 rounded bg-slate-100"></div>
                                <div class="mb-2 h-3 w-full rounded bg-slate-100"></div>
                                <div class="h-3 w-4/5 rounded bg-slate-100"></div>
                            </div>
                        </div>

                        <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 fade-in" style="animation-delay: 0.1s;">
                            <router-link
                                v-for="mod in dashboardModules"
                                :key="mod.ModuleId"
                                :to="mod.Route"
                                class="group flex min-h-44 flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand-100 hover:shadow-md"
                            >
                                <div
                                    class="mb-4 flex h-11 w-11 items-center justify-center rounded-lg text-xl transition group-hover:scale-105"
                                    :class="[getStyle(mod).bg, getStyle(mod).color]"
                                >
                                    <i :class="mod.Icon"></i>
                                </div>
                                <h3 class="text-base font-extrabold text-slate-900 transition group-hover:text-brand-700">
                                    {{ mod.Label }}
                                </h3>
                                <p class="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
                                    {{ getStyle(mod).desc }}
                                </p>
                                <div class="mt-auto flex justify-end pt-4 text-slate-300 transition group-hover:text-brand-500">
                                    <i class="fa-solid fa-arrow-right"></i>
                                </div>
                            </router-link>

                            <div v-if="setupStore.userMenu.length === 0" class="col-span-full rounded-lg border border-dashed border-slate-200 bg-white py-12 text-center text-slate-400">
                                <i class="fa-regular fa-folder-open mb-4 text-4xl"></i>
                                <p>No tienes modulos asignados. Contacta al administrador.</p>
                            </div>
                        </div>
                    </section>
                </section>

                <aside v-if="setupStore.hubFeatureVisibility['hub.activity_panel']" class="space-y-6">
                    <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                        <div class="mb-5 flex items-center justify-between">
                            <h2 class="text-base font-extrabold text-slate-900">Actividad reciente</h2>
                            <i class="fa-regular fa-clock text-slate-300"></i>
                        </div>
                        <div class="space-y-5">
                            <article v-for="item in recentActivity" :key="item.title" class="flex gap-3">
                                <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                                    <i :class="item.icon" class="text-sm"></i>
                                </div>
                                <div class="min-w-0 flex-1">
                                    <p class="text-sm font-bold text-slate-700">{{ item.title }}</p>
                                    <p class="mt-0.5 truncate text-xs text-slate-500">{{ item.detail }}</p>
                                    <p class="mt-1 text-right text-[11px] font-semibold text-slate-400">{{ item.time }}</p>
                                </div>
                            </article>
                        </div>
                        <button class="mt-6 flex w-full items-center justify-between rounded-lg px-1 py-2 text-sm font-bold text-brand-600 transition hover:bg-brand-50 hover:px-3">
                            Ver historial completo
                            <i class="fa-solid fa-arrow-right"></i>
                        </button>
                    </section>

                    <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 class="mb-5 text-base font-extrabold text-slate-900">Acciones rapidas</h2>
                        <div class="space-y-3">
                            <button
                                v-for="action in quickActions"
                                :key="action.label"
                                class="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-left text-sm font-bold text-slate-700 shadow-sm transition hover:border-brand-100 hover:bg-slate-50"
                            >
                                <span
                                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                                    :class="{
                                        'bg-rose-50 text-brand-600': action.tone === 'rose',
                                        'bg-blue-50 text-blue-600': action.tone === 'blue',
                                        'bg-emerald-50 text-emerald-600': action.tone === 'emerald',
                                        'bg-amber-50 text-amber-600': action.tone === 'amber'
                                    }"
                                >
                                    <i :class="action.icon" class="text-sm"></i>
                                </span>
                                <span class="min-w-0 flex-1">{{ action.label }}</span>
                            </button>
                        </div>
                    </section>
                </aside>
            </div>
        </div>
    </main>
</template>

<style scoped>
.fade-in {
    animation: fadeIn 0.5s ease-out forwards;
    opacity: 0;
    transform: translateY(10px);
}

@keyframes fadeIn {
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
