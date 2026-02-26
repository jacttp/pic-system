<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useCommercialStructureStore } from '../stores/commercialStructureStore';
import type { CommercialStructure } from '@/types/commercialStructure';
import BaseTable from '@/modules/Shared/components/BaseTable.vue';

const router = useRouter();
const store = useCommercialStructureStore();
const searchTerm = ref('');
const currentPage = ref(1);
const itemsPerPage = 20;

const columns = [
    { key: 'Ruta',     label: 'Ruta'     },
    { key: 'Gerencia', label: 'Gerencia', class: 'min-w-[160px]' },
    { key: 'Zona',     label: 'Zona'     },
    { key: 'Jefatura', label: 'Jefatura', class: 'min-w-[160px]' },
    { key: 'RutaM',    label: 'Ruta M'   },
    { key: 'Cedis',    label: 'Cedis'    },
    { key: 'CanalC',   label: 'Canal C'  },
];

const totalPages = computed(() => Math.ceil(store.totalRecords / itemsPerPage));

onMounted(() => loadData());

const loadData = () => {
    store.fetchItems(currentPage.value, itemsPerPage, searchTerm.value);
};

let timeout: any;
watch(searchTerm, () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => { currentPage.value = 1; loadData(); }, 500);
});

const handlePageChange = (page: number) => { currentPage.value = page; loadData(); };
const handleCreate = () => router.push('/admin/commercial-structure/new');

const handleEdit = (item: CommercialStructure) => {
    if (item.Ruta) {
        router.push(`/admin/commercial-structure/${encodeURIComponent(item.Ruta)}`);
    } else {
        console.error('Ruta is missing in handleEdit:', item);
    }
};

const handleDelete = async (item: CommercialStructure) => {
    if (confirm(`¿Eliminar la estructura de la ruta "${item.Ruta}"?`)) {
        const success = await store.deleteItem(item.Ruta);
        if (success) loadData();
        else alert('Error al eliminar la estructura.');
    }
};

// Color accent para la jerarquía territorial
const gerenciaColor = (name: string) => {
    const colors = [
        'bg-violet-100 text-violet-700',
        'bg-indigo-100 text-indigo-700',
        'bg-blue-100 text-blue-700',
        'bg-sky-100 text-sky-700',
    ];
    const idx = (name?.charCodeAt(0) ?? 0) % colors.length;
    return colors[idx];
};
</script>

<template>
    <div class="min-h-full bg-slate-50/70">

        <!-- ── Module Page Header ── -->
        <div class="bg-white border-b border-slate-200">
            <div class="w-full px-4 sm:px-6 lg:px-10">
                <div class="py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                    <!-- Left: icon + title -->
                    <div class="flex items-center gap-4">
                        <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-violet-200">
                            <i class="fa-solid fa-sitemap text-white text-base"></i>
                        </div>
                        <div>
                            <h1 class="text-xl font-bold text-slate-900 tracking-tight leading-tight">Estructura Comercial</h1>
                            <p class="text-xs text-slate-500 mt-0.5 font-medium">Jerarquía territorial · Gerencia → Zona → Jefatura → Ruta</p>
                        </div>
                    </div>

                    <!-- Right: total pill + new button -->
                    <div class="flex items-center gap-3">
                        <div class="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full">
                            <span class="w-2 h-2 rounded-full bg-violet-500 inline-block animate-pulse"></span>
                            <span v-if="!store.isLoading" class="tabular-nums">{{ store.totalRecords.toLocaleString() }} registros</span>
                            <span v-else>Cargando…</span>
                        </div>
                        <button
                            @click="handleCreate"
                            class="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm shadow-violet-200 transition-all whitespace-nowrap"
                        >
                            <i class="fa-solid fa-plus text-xs"></i>
                            Nueva Estructura
                        </button>
                    </div>
                </div>

                <!-- ── Toolbar ── -->
                <div class="pb-4 flex flex-wrap gap-2.5 items-center">
                    <div class="relative flex-1 min-w-[200px] max-w-sm">
                        <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <i class="fa-solid fa-magnifying-glass text-slate-400 text-sm"></i>
                        </div>
                        <input
                            v-model="searchTerm"
                            type="text"
                            placeholder="Buscar por gerencia, zona, ruta…"
                            class="block w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition"
                        />
                    </div>
                </div>
            </div>
        </div>

        <!-- ── Table Area ── -->
        <div class="w-full px-4 sm:px-6 lg:px-10 py-5">
            <BaseTable
                :columns="columns"
                :data="store.items"
                :loading="store.isLoading"
                :current-page="currentPage"
                :total-pages="totalPages"
                :total-records="store.totalRecords"
                show-actions
                @page-change="handlePageChange"
                @edit="handleEdit"
                @delete="handleDelete"
            >
                <!-- Ruta cell: monospace prominent badge -->
                <template #cell-Ruta="{ value }">
                    <span class="font-mono text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md tracking-tight">
                        {{ value }}
                    </span>
                </template>

                <!-- Gerencia cell: colored pill with initial -->
                <template #cell-Gerencia="{ value }">
                    <div v-if="value" class="flex items-center gap-2">
                        <span
                            class="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-extrabold flex-shrink-0"
                            :class="gerenciaColor(value)"
                        >
                            {{ value?.charAt(0)?.toUpperCase() }}
                        </span>
                        <span class="text-sm font-medium text-slate-700">{{ value }}</span>
                    </div>
                    <span v-else class="text-slate-300 text-xs">—</span>
                </template>

                <!-- RutaM cell: subtle tag -->
                <template #cell-RutaM="{ value }">
                    <span v-if="value" class="inline-flex items-center text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
                        {{ value }}
                    </span>
                    <span v-else class="text-slate-300 text-xs">—</span>
                </template>

                <!-- CanalC cell -->
                <template #cell-CanalC="{ value }">
                    <span v-if="value" class="text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">{{ value }}</span>
                    <span v-else class="text-slate-300 text-xs">—</span>
                </template>

                <!-- Generic text cells: Zona, Jefatura, Cedis -->
                <template #cell-Zona="{ value }">
                    <span class="text-sm text-slate-600 font-medium">{{ value || '—' }}</span>
                </template>
                <template #cell-Jefatura="{ value }">
                    <span class="text-sm text-slate-600 font-medium">{{ value || '—' }}</span>
                </template>
                <template #cell-Cedis="{ value }">
                    <span class="text-sm text-slate-500">{{ value || '—' }}</span>
                </template>
            </BaseTable>
        </div>
    </div>
</template>
