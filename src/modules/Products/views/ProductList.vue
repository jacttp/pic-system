<!-- src/modules/Products/views/ProductList.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useProductStore } from '../stores/productStore';
import type { Product } from '@/types/products';
import BaseTable from '@/modules/Shared/components/BaseTable.vue';
import StatusBadge from '@/modules/Shared/components/StatusBadge.vue';
import ProductForm from '../components/ProductForm.vue';

const store = useProductStore();

const showModal     = ref(false);
const productToEdit = ref<Product | null>(null);
const searchTerm    = ref('');
const currentPage   = ref(1);
const itemsPerPage  = 10;

const columns = [
    { key: 'SkuReal',  label: 'SKU'             },
    { key: 'Nombre',   label: 'Producto', class: 'min-w-[240px] w-full' },
    { key: 'Marca',    label: 'Marca'            },
    { key: 'Grupo',    label: 'Grupo'            },
    { key: 'Peso',     label: 'Peso (Kg)'        },
    { key: 'Status',   label: 'Estado'           },
];

const totalPages = computed(() => Math.ceil(store.totalRecords / itemsPerPage));

onMounted(() => loadData());

const loadData = () => store.fetchProducts(currentPage.value, itemsPerPage, searchTerm.value);

let timeout: any;
watch(searchTerm, () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => { currentPage.value = 1; loadData(); }, 500);
});

const handlePageChange = (page: number) => { currentPage.value = page; loadData(); };
const openCreateModal  = () => { productToEdit.value = null; showModal.value = true; };
const handleEdit       = (item: Product) => { productToEdit.value = item; showModal.value = true; };

const handleDelete = async (item: Product) => {
    if (confirm(`¿Eliminar "${item.Nombre}"?`)) {
        try   { await store.deleteProduct(item.Id); loadData(); }
        catch { alert('Error al eliminar'); }
    }
};

const onSaved = () => loadData();

// Color por marca para las iniciales del avatar de producto
const skuColor = (sku: string) => {
    const colors = [
        'bg-orange-100 text-orange-700 ring-1 ring-orange-200',
        'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
        'bg-red-100 text-red-700 ring-1 ring-red-200',
        'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
    ];
    const idx = (sku?.charCodeAt(0) ?? 0) % colors.length;
    return colors[idx];
};

const productInitials = (name: string) => {
    if (!name) return '?';
    return name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
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
                        <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-orange-200">
                            <i class="fa-solid fa-boxes-stacked text-white text-base"></i>
                        </div>
                        <div>
                            <h1 class="text-xl font-bold text-slate-900 tracking-tight leading-tight">Catálogo de Productos</h1>
                            <p class="text-xs text-slate-500 mt-0.5 font-medium">Administración maestra de artículos · SKU, marca y clasificación</p>
                        </div>
                    </div>

                    <!-- Right: counter + new button -->
                    <div class="flex items-center gap-3">
                        <div class="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full">
                            <span class="w-2 h-2 rounded-full bg-orange-500 inline-block animate-pulse"></span>
                            <span v-if="!store.isLoading" class="tabular-nums">{{ store.totalRecords.toLocaleString() }} productos</span>
                            <span v-else>Cargando…</span>
                        </div>
                        <button
                            @click="openCreateModal"
                            class="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm shadow-orange-200 transition-all whitespace-nowrap"
                        >
                            <i class="fa-solid fa-plus text-xs"></i>
                            Nuevo Producto
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
                            placeholder="Buscar por SKU o nombre…"
                            class="block w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition"
                        />
                    </div>
                </div>
            </div>
        </div>

        <!-- ── Table Area ── -->
        <div class="w-full px-4 sm:px-6 lg:px-10 py-5">
            <BaseTable
                :columns="columns"
                :data="store.products"
                :loading="store.isLoading"
                :current-page="currentPage"
                :total-pages="totalPages"
                :total-records="store.totalRecords"
                show-actions
                @page-change="handlePageChange"
                @edit="handleEdit"
                @delete="handleDelete"
            >
                <!-- SKU cell: monospace badge -->
                <template #cell-SkuReal="{ value }">
                    <span class="font-mono text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md tracking-tight">
                        {{ value }}
                    </span>
                </template>

                <!-- Producto cell: avatar initial + name -->
                <template #cell-Nombre="{ value }">
                    <div class="flex items-center gap-3">
                        <span
                            class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                            :class="skuColor(value)"
                        >
                            {{ productInitials(value) }}
                        </span>
                        <span class="font-semibold text-slate-800 break-words" :title="value">{{ value }}</span>
                    </div>
                </template>

                <!-- Marca cell: colored pill -->
                <template #cell-Marca="{ value }">
                    <span v-if="value" class="inline-flex items-center text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                        {{ value }}
                    </span>
                    <span v-else class="text-slate-300 text-xs">—</span>
                </template>

                <!-- Grupo cell -->
                <template #cell-Grupo="{ value }">
                    <span v-if="value" class="text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">{{ value }}</span>
                    <span v-else class="text-slate-300 text-xs">—</span>
                </template>

                <!-- Peso cell: formatted number -->
                <template #cell-Peso="{ value }">
                    <span class="font-mono text-sm text-slate-600 tabular-nums">{{ Number(value).toFixed(3) }}</span>
                </template>

                <!-- Estado cell -->
                <template #cell-Status="{ value }">
                    <StatusBadge :status="value ? 'Activo' : 'Inactivo'" :type="value ? 'success' : 'neutral'" />
                </template>
            </BaseTable>
        </div>

        <!-- Modal crear / editar -->
        <ProductForm
            v-model="showModal"
            :product-to-edit="productToEdit"
            @saved="onSaved"
        />
    </div>
</template>