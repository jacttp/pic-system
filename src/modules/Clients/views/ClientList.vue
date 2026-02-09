<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useClientStore } from '../stores/clientStore';
import type { Client } from '@/types/clients';
import BaseTable from '@/modules/Shared/components/BaseTable.vue';

const router = useRouter();
const store = useClientStore();
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

const handleCreate = () => {
    router.push('/admin/clients/new');
};

const handleEdit = (item: Client) => {
      // MODIFICACIÓN: Agregamos (item as any).clienteid porque es la PK real en ClientesIC
      const clientId = item.Id || (item as any).id || (item as any).IdCliente || (item as any).clienteid;
      
      if (clientId) {
          router.push(`/admin/clients/${clientId}`);
      } else {
          console.error('Client ID is missing in handleEdit. Objeto recibido:', item);
          alert('Error: No se pudo identificar el ID del cliente.');
      }
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
                <button @click="handleCreate" class="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 transition-colors whitespace-nowrap">
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
    </div>
</template>