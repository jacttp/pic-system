<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
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
    { key: 'Ruta', label: 'Ruta', class: 'font-mono text-xs font-bold text-slate-500' },
    { key: 'Gerencia', label: 'Gerencia', class: 'font-medium' },
    { key: 'Zona', label: 'Zona' },
    { key: 'Jefatura', label: 'Jefatura' },
    { key: 'RutaM', label: 'Ruta M' },
    { key: 'Cedis', label: 'Cedis' },
    { key: 'CanalC', label: 'Canal C' }
];

onMounted(() => loadData());

const loadData = () => {
    store.fetchItems(currentPage.value, itemsPerPage, searchTerm.value);
};

let timeout: any;
watch(searchTerm, () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => { currentPage.value = 1; loadData(); }, 500);
});

const handlePageChange = (page: number) => {
    currentPage.value = page;
    loadData();
};

const handleCreate = () => {
    router.push('/admin/commercial-structure/new');
};

const handleEdit = (item: CommercialStructure) => {
    if (item.Ruta) {
        router.push(`/admin/commercial-structure/${encodeURIComponent(item.Ruta)}`);
    } else {
        console.error('Ruta is missing in handleEdit:', item);
        alert('Error: No se pudo identificar la Ruta del registro.');
    }
};

const handleDelete = async (item: CommercialStructure) => {
    if (confirm(`¿Eliminar la estructura de la ruta "${item.Ruta}"?`)) {
        const success = await store.deleteItem(item.Ruta);
        if (success) {
            loadData();
        } else {
            alert('Error al eliminar la estructura.');
        }
    }
};
</script>

<template>
    <div class="p-6 lg:p-8 max-w-7xl mx-auto">
        <div class="flex flex-col sm:flex-row justify-between items-end gap-4 mb-6">
            <div>
                <h1 class="text-2xl font-bold text-slate-800">Estructura Comercial</h1>
                <p class="text-slate-500 text-sm mt-1">Gestión de la estructura territorial: Gerencia → Zona → Jefatura → Ruta.</p>
            </div>
            <div class="flex gap-3 w-full sm:w-auto">
                <div class="relative flex-1 sm:w-64">
                    <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                    <input v-model="searchTerm" type="text" placeholder="Buscar por gerencia, zona, ruta..."
                        class="pl-9 pr-4 py-2 w-full rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500">
                </div>
                <button @click="handleCreate"
                    class="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 transition-colors whitespace-nowrap">
                    <i class="fa-solid fa-plus"></i> Nuevo
                </button>
            </div>
        </div>

        <BaseTable 
            :columns="columns" 
            :data="store.items" 
            :loading="store.isLoading"
            :current-page="currentPage"
            :total-pages="Math.ceil(store.totalRecords / itemsPerPage)"
            :total-records="store.totalRecords"
            show-actions
            @page-change="handlePageChange"
            @edit="handleEdit"
            @delete="handleDelete"
        />
    </div>
</template>
