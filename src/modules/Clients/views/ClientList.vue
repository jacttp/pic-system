<!-- src/modules/Clients/views/ClientList.vue -->
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useClientStore } from '../stores/clientStore';
import type { Client } from '@/types/clients';
import BaseTable from '@/modules/Shared/components/BaseTable.vue';
import ClientForm from '../components/ClientForm.vue';

const store = useClientStore();
const showModal = ref(false);
const clientToEdit = ref<Client | null>(null);
const searchTerm = ref('');
const currentPage = ref(1);
const itemsPerPage = 10;

const columns = [
    { key: 'clienteid', label: 'ID', class: 'font-mono text-xs font-bold text-slate-500' },
    { key: 'Nombre', label: 'Cliente', class: 'font-medium' },
    { key: 'Canal', label: 'Canal' },
    { key: 'Gerencia', label: 'Gerencia' },
    { key: 'Ciudad', label: 'Ciudad' },
    { key: 'Estado', label: 'Estado' }
];

onMounted(() => loadData());

const loadData = () => {
    store.fetchClients(currentPage.value, itemsPerPage, searchTerm.value);
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

const openCreateModal = () => {
    clientToEdit.value = null;
    showModal.value = true;
};

const handleEdit = (item: Client) => {
    clientToEdit.value = item;
    showModal.value = true;
};

const handleDelete = async (item: Client) => {
    if (confirm(`¿Eliminar cliente "${item.Nombre}"?`)) {
        try {
            await store.deleteClient(item.Id);
            loadData();
        } catch (e) {
            alert('Error al eliminar');
        }
    }
};
</script>

<template>
    <div class="p-6 lg:p-8 max-w-7xl mx-auto">
        <div class="flex flex-col sm:flex-row justify-between items-end gap-4 mb-6">
            <div>
                <h1 class="text-2xl font-bold text-slate-800">Cartera de Clientes</h1>
                <p class="text-slate-500 text-sm mt-1">Directorio comercial y segmentación.</p>
            </div>
            <div class="flex gap-3 w-full sm:w-auto">
                <div class="relative flex-1 sm:w-64">
                    <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                    <input v-model="searchTerm" type="text" placeholder="Buscar cliente..." class="pl-9 pr-4 py-2 w-full rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500">
                </div>
                <button @click="openCreateModal" class="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 transition-colors whitespace-nowrap">
                    <i class="fa-solid fa-plus"></i> Nuevo
                </button>
            </div>
        </div>

        <BaseTable 
            :columns="columns" 
            :data="store.clients" 
            :loading="store.isLoading"
            :current-page="currentPage"
            :total-pages="Math.ceil(store.totalRecords / itemsPerPage)"
            :total-records="store.totalRecords"
            show-actions
            @page-change="handlePageChange"
            @edit="handleEdit"
            @delete="handleDelete"
        />

        <ClientForm v-model="showModal" :client-to-edit="clientToEdit" @saved="loadData" />
    </div>
</template>