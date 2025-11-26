<!-- src/modules/Products/views/ProductList.vue -->
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useProductStore } from '../stores/productStore';
import type { Product } from '@/types/products';
import BaseTable from '@/modules/Shared/components/BaseTable.vue';
import StatusBadge from '@/modules/Shared/components/StatusBadge.vue';
import ProductForm from '../components/ProductForm.vue';

const store = useProductStore();

const showModal = ref(false);
const productToEdit = ref<Product | null>(null);
const searchTerm = ref('');
const currentPage = ref(1);
const itemsPerPage = 10;

// Columnas
const columns = [
    { key: 'SkuReal', label: 'SKU', class: 'font-mono text-xs font-bold text-slate-600' },
    { key: 'Nombre', label: 'Producto', class: 'font-medium' },
    { key: 'Marca', label: 'Marca' },
    { key: 'Peso', label: 'Peso (Kg)', class: 'text-right' },
    { key: 'Grupo', label: 'Grupo' },
    { key: 'Status', label: 'Estado', class: 'text-center' }
];

// Cargar datos iniciales
onMounted(() => {
    loadData();
});

const loadData = () => {
    store.fetchProducts(currentPage.value, itemsPerPage, searchTerm.value);
};

// Debounce simple para búsqueda
let timeout: any;
watch(searchTerm, () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        currentPage.value = 1; // Reset a página 1 al buscar
        loadData();
    }, 500);
});

const handlePageChange = (page: number) => {
    currentPage.value = page;
    loadData();
};

const openCreateModal = () => {
    productToEdit.value = null;
    showModal.value = true;
};

const handleEdit = (item: Product) => {
    productToEdit.value = item;
    showModal.value = true;
};

const handleDelete = async (item: Product) => {
    if (confirm(`¿Estás seguro de eliminar "${item.Nombre}"?`)) {
        try {
            await store.deleteProduct(item.Id);
            loadData(); // Recargar tabla
        } catch (e) {
            alert('Error al eliminar');
        }
    }
};

const onSaved = () => {
    loadData();
};
</script>

<template>
    <div class="p-6 lg:p-8 max-w-7xl mx-auto">
        
        <!-- Header y Toolbar -->
        <div class="flex flex-col sm:flex-row justify-between items-end gap-4 mb-6">
            <div>
                <h1 class="text-2xl font-bold text-slate-800">Catálogo de Productos</h1>
                <p class="text-slate-500 text-sm mt-1">Administración maestra de artículos.</p>
            </div>
            
            <div class="flex gap-3 w-full sm:w-auto">
                <!-- Buscador -->
                <div class="relative flex-1 sm:w-64">
                    <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                    <input 
                        v-model="searchTerm" 
                        type="text" 
                        placeholder="Buscar SKU o nombre..." 
                        class="pl-9 pr-4 py-2 w-full rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    >
                </div>
                
                <button 
                    @click="openCreateModal" 
                    class="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 transition-colors whitespace-nowrap"
                >
                    <i class="fa-solid fa-plus"></i> Nuevo
                </button>
            </div>
        </div>

        <!-- Tabla -->
        <BaseTable 
            :columns="columns" 
            :data="store.products" 
            :loading="store.isLoading"
            :current-page="currentPage"
            :total-pages="Math.ceil(store.totalRecords / itemsPerPage)"
            :total-records="store.totalRecords"
            show-actions
            @page-change="handlePageChange"
            @edit="handleEdit"
            @delete="handleDelete"
        >
            <!-- Slot para Peso (Formato número) -->
            <template #cell-Peso="{ value }">
                {{ Number(value).toFixed(3) }}
            </template>

            <!-- Slot para Marca (Badge) -->
            <template #cell-Marca="{ value }">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                    {{ value }}
                </span>
            </template>

            <!-- Slot para Status -->
            <template #cell-Status="{ value }">
                <StatusBadge :status="value ? 'Activo' : 'Inactivo'" :type="value ? 'success' : 'neutral'" />
            </template>
        </BaseTable>

        <!-- Modal (Reutilizado para crear y editar) -->
        <ProductForm 
            v-model="showModal" 
            :product-to-edit="productToEdit" 
            @saved="onSaved" 
        />
    </div>
</template>