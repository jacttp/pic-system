<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useClientStore } from '../stores/clientStore';
import type { Client } from '@/types/clients';
import BaseTable from '@/modules/Shared/components/BaseTable.vue';
import StatusBadge from '@/modules/Shared/components/StatusBadge.vue';

const router = useRouter();
const store  = useClientStore();

const searchTerm   = ref('');
const currentPage  = ref(1);
const itemsPerPage = 20;

// Quick-filter state
const filterCanal    = ref('');
const filterGerencia = ref('');

const columns = [
    { key: 'clienteid', label: 'ID'       },
    { key: 'Nombre',    label: 'Cliente',  class: 'min-w-[280px] w-full' },
    { key: 'Canal',     label: 'Canal'    },
    { key: 'Gerencia',  label: 'Gerencia' },
    { key: 'Ciudad',    label: 'Ciudad'   },
    { key: 'Estado',    label: 'Estado'   },
];

onMounted(() => {
    store.fetchCanales();
    store.fetchGerencias();
    loadData();
});

const loadData = () => {
    const extraFilters: Record<string, string> = {};
    if (filterCanal.value)    extraFilters['canal']    = filterCanal.value;
    if (filterGerencia.value) extraFilters['gerencia'] = filterGerencia.value;
    store.fetchClients(currentPage.value, itemsPerPage, searchTerm.value, extraFilters);
};

let debounce: ReturnType<typeof setTimeout>;
watch(searchTerm, () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { currentPage.value = 1; loadData(); }, 400);
});
watch([filterCanal, filterGerencia], () => { currentPage.value = 1; loadData(); });

const handlePageChange = (page: number) => { currentPage.value = page; loadData(); };
const handleCreate     = () => router.push('/admin/clients/new');

const handleEdit = (item: Client) => {
    const id = item.Id || (item as any).id || (item as any).IdCliente || (item as any).clienteid;
    if (id) router.push(`/admin/clients/${id}`);
    else    console.error('Client ID missing:', item);
};

const handleDelete = async (item: Client) => {
    if (confirm(`¿Eliminar cliente "${item.Nombre}"?`)) {
        try   { await store.deleteClient(item.Id); loadData(); }
        catch { alert('Error al eliminar'); }
    }
};

// Avatar initials helper
const initials = (name: string) => {
    if (!name) return '?';
    return name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
};

// Avatar color palette — emerald-teal spectrum
const avatarColor = (name: string) => {
    const colors = [
        'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
        'bg-teal-100 text-teal-700 ring-1 ring-teal-200',
        'bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200',
        'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
    ];
    const idx = (name?.charCodeAt(0) ?? 0) % colors.length;
    return colors[idx];
};

const totalPages = computed(() => Math.ceil(store.totalRecords / itemsPerPage));

const filtersActive = computed(() => !!(filterCanal.value || filterGerencia.value || searchTerm.value));
const clearFilters  = () => { filterCanal.value = ''; filterGerencia.value = ''; searchTerm.value = ''; };
</script>

<template>
    <div class="min-h-full bg-slate-50/70">

        <!-- ── Module Page Header ── -->
        <div class="bg-white border-b border-slate-200">
            <div class="w-full px-4 sm:px-6 lg:px-10">
                <div class="py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                    <!-- Left: icon + title -->
                    <div class="flex items-center gap-4">
                        <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-200">
                            <i class="fa-solid fa-store text-white text-base"></i>
                        </div>
                        <div>
                            <h1 class="text-xl font-bold text-slate-900 tracking-tight leading-tight">Cartera de Clientes</h1>
                            <p class="text-xs text-slate-500 mt-0.5 font-medium">Directorio comercial · segmentación y clasificación</p>
                        </div>
                    </div>

                    <!-- Right: total pill + new button -->
                    <div class="flex items-center gap-3">
                        <div class="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full">
                            <span class="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                            <span v-if="!store.isLoading" class="tabular-nums">{{ store.totalRecords.toLocaleString() }} registros</span>
                            <span v-else>Cargando…</span>
                        </div>
                        <button
                            @click="handleCreate"
                            class="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm shadow-emerald-200 transition-all whitespace-nowrap"
                        >
                            <i class="fa-solid fa-plus text-xs"></i>
                            Nuevo Cliente
                        </button>
                    </div>
                </div>

                <!-- ── Toolbar: search + quick filters ── -->
                <div class="pb-4 flex flex-wrap gap-2.5 items-center">
                    <!-- Search -->
                    <div class="relative flex-1 min-w-[200px] max-w-sm">
                        <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <i class="fa-solid fa-magnifying-glass text-slate-400 text-sm"></i>
                        </div>
                        <input
                            v-model="searchTerm"
                            type="text"
                            placeholder="Buscar cliente, ID, ciudad…"
                            class="block w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                        />
                    </div>

                    <!-- Divider -->
                    <div class="hidden sm:block h-6 w-px bg-slate-200"></div>

                    <!-- Canal filter -->
                    <div class="relative">
                        <select
                            v-model="filterCanal"
                            class="appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-sm text-slate-700 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition cursor-pointer"
                        >
                            <option value="">Todos los canales</option>
                            <option v-for="c in store.canales" :key="c" :value="c">{{ c }}</option>
                        </select>
                        <i class="fa-solid fa-chevron-down pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                    </div>

                    <!-- Gerencia filter -->
                    <div class="relative">
                        <select
                            v-model="filterGerencia"
                            class="appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-sm text-slate-700 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition cursor-pointer"
                        >
                            <option value="">Todas las gerencias</option>
                            <option v-for="g in store.gerencias" :key="g" :value="g">{{ g }}</option>
                        </select>
                        <i class="fa-solid fa-chevron-down pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                    </div>

                    <!-- Clear filters -->
                    <transition name="fade">
                        <button
                            v-if="filtersActive"
                            @click="clearFilters"
                            class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 border border-dashed border-slate-300 hover:border-slate-400 bg-white rounded-lg px-3 py-2 transition"
                        >
                            <i class="fa-solid fa-xmark"></i>
                            Limpiar filtros
                        </button>
                    </transition>
                </div>
            </div>
        </div>

        <!-- ── Table Area ── -->
        <div class="w-full px-4 sm:px-6 lg:px-10 py-5">
            <BaseTable
                :columns="columns"
                :data="store.clients"
                :loading="store.isLoading"
                :current-page="currentPage"
                :total-pages="totalPages"
                :total-records="store.totalRecords"
                show-actions
                @page-change="handlePageChange"
                @edit="handleEdit"
                @delete="handleDelete"
            >
                <!-- Cliente cell: avatar + name -->
                <template #cell-Nombre="{ value }">
                    <div class="flex items-center gap-3">
                        <span
                            class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            :class="avatarColor(value)"
                        >
                            {{ initials(value) }}
                        </span>
                        <span class="font-semibold text-slate-800 break-words" :title="value">{{ value }}</span>
                    </div>
                </template>

                <!-- ID cell: monospace badge -->
                <template #cell-clienteid="{ value }">
                    <span class="font-mono text-xs font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md tracking-tight">{{ value }}</span>
                </template>

                <!-- Estado cell -->
                <template #cell-Estado="{ value }">
                    <StatusBadge :status="value ?? 'Sin estado'" />
                </template>

                <!-- Canal cell: colored pill -->
                <template #cell-Canal="{ value }">
                    <span v-if="value" class="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">{{ value }}</span>
                    <span v-else class="text-slate-300 text-xs">—</span>
                </template>

                <!-- Gerencia cell -->
                <template #cell-Gerencia="{ value }">
                    <span v-if="value" class="text-xs text-slate-600 font-medium">{{ value }}</span>
                    <span v-else class="text-slate-300 text-xs">—</span>
                </template>
            </BaseTable>
        </div>
    </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s, transform 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: scale(0.95); }
</style>