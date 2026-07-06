<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { usePicFilterStore } from '../../stores/picFilterStore';
import { picApi } from '../../services/picApi';
import ModalDialog from '@/modules/Shared/components/ModalDialog.vue'; 

const props = defineProps<{
    modelValue: boolean; 
}>();

const emit = defineEmits(['update:modelValue']);

const store = usePicFilterStore();

type SortKey = 'Matriz' | 'Cadena' | 'NOM_CLIENTE';
type SortDirection = 'asc' | 'desc';

// Estado Local
const searchTerm = ref('');
const currentPage = ref(1);
const totalPages = ref(1);
const isLoading = ref(false);
const clientsList = ref<any[]>([]);
const sortKey = ref<SortKey | null>(null);
const sortDirection = ref<SortDirection>('asc');
let debounceTimeout: any = null;

const close = () => {
    emit('update:modelValue', false);
    // No limpiamos searchTerm para que el usuario no pierda su búsqueda si cierra y abre rápido
};

const fetchClients = async () => {
    isLoading.value = true;
    try {
        const activeFilters = store.getFiltersForClientSearch();
        const response = await picApi.searchClients(
            searchTerm.value, 
            currentPage.value, 
            activeFilters
        );
        clientsList.value = response.clients || [];
        totalPages.value = response.totalPages || 1;
        
        if (currentPage.value > totalPages.value && totalPages.value > 0) {
            currentPage.value = 1;
        }
    } catch (error) {
        console.error("Error buscando clientes:", error);
        clientsList.value = [];
    } finally {
        isLoading.value = false;
    }
};

watch(searchTerm, () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        currentPage.value = 1; 
        fetchClients();
    }, 350); 
});

watch(() => props.modelValue, (isOpen) => {
    if (isOpen && clientsList.value.length === 0) {
        currentPage.value = 1;
        fetchClients();
    }
});

const changePage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages.value) {
        currentPage.value = newPage;
        fetchClients();
    }
};

const toggleSort = (key: SortKey) => {
    if (sortKey.value === key) {
        sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
        return;
    }

    sortKey.value = key;
    sortDirection.value = 'asc';
};

const sortIcon = (key: SortKey) => {
    if (sortKey.value !== key) return 'fa-solid fa-sort text-pic-text-muted/60';

    return sortDirection.value === 'asc'
        ? 'fa-solid fa-sort-up text-pic-brand'
        : 'fa-solid fa-sort-down text-pic-brand';
};

const sortedClientsList = computed(() => {
    const activeSortKey = sortKey.value;
    if (!activeSortKey) return clientsList.value;

    return [...clientsList.value].sort((a, b) => {
        const av = String(a[activeSortKey] ?? '').trim();
        const bv = String(b[activeSortKey] ?? '').trim();
        const cmp = av.localeCompare(bv, 'es-MX', {
            numeric: true,
            sensitivity: 'base'
        });

        return sortDirection.value === 'asc' ? cmp : -cmp;
    });
});

const toggleSelectAllPage = () => {
    const allSelected = sortedClientsList.value.every(c => store.selectedClients.has(c.IDCLIENTE));
    sortedClientsList.value.forEach(c => {
        if (allSelected) store.selectedClients.delete(c.IDCLIENTE);
        else store.selectedClients.set(c.IDCLIENTE, c.NOM_CLIENTE);
    });
};

const isPageFullySelected = computed(() => {
    return sortedClientsList.value.length > 0 && sortedClientsList.value.every(c => store.selectedClients.has(c.IDCLIENTE));
});
</script>

<template>
    <ModalDialog 
        :model-value="modelValue" 
        title="Búsqueda y Selección de Clientes" 
        size="4xl"
        @close="close"
    >
        <div class="flex h-[500px] flex-col"> 
            
            <div class="relative mb-4 shrink-0">
                <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-pic-text-muted"></i>
                <input 
                    v-model="searchTerm"
                    type="text" 
                    placeholder="Buscar por ID, Nombre, Cadena..." 
                    class="w-full rounded-lg border border-pic-border bg-pic-muted-surface py-2 pl-9 pr-4 text-xs text-pic-text-main outline-none transition-all placeholder:text-pic-text-muted focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-border"
                    autofocus
                >
            </div>

            <div class="relative flex-1 overflow-y-auto rounded-lg border border-pic-border">
                
                <div v-if="isLoading" class="absolute inset-0 z-20 flex items-center justify-center bg-pic-surface/80 backdrop-blur-sm">
                    <div class="flex flex-col items-center gap-2">
                        <i class="fa-solid fa-circle-notch fa-spin text-2xl text-pic-brand"></i>
                        <span class="text-xs font-medium text-pic-text-muted">Cargando clientes...</span>
                    </div>
                </div>

                <table class="w-full table-fixed border-collapse text-left text-xs">
                    <thead class="sticky top-0 z-10 border-b border-pic-brand-border bg-pic-brand-soft/70 font-bold uppercase text-pic-brand backdrop-blur-sm">
                        <tr>
                            <th class="px-2 py-3 w-10 text-center">
                                <input 
                                    type="checkbox" 
                                    class="cursor-pointer rounded border-pic-brand-border text-pic-brand focus:ring-pic-brand"
                                    :checked="isPageFullySelected"
                                    @change="toggleSelectAllPage"
                                >
                            </th>
                            <th class="px-2 py-3 w-20">ID</th>
                            <th class="px-2 py-3 w-24">
                                <button
                                    type="button"
                                    class="flex items-center gap-1.5 text-left transition-colors hover:text-pic-text-main"
                                    @click="toggleSort('Matriz')"
                                >
                                    Matriz <i :class="sortIcon('Matriz')"></i>
                                </button>
                            </th>
                            <th class="px-2 py-3 w-28">
                                <button
                                    type="button"
                                    class="flex items-center gap-1.5 text-left transition-colors hover:text-pic-text-main"
                                    @click="toggleSort('Cadena')"
                                >
                                    Cadena <i :class="sortIcon('Cadena')"></i>
                                </button>
                            </th>
                            <th class="px-2 py-3 w-64">
                                <button
                                    type="button"
                                    class="flex items-center gap-1.5 text-left transition-colors hover:text-pic-text-main"
                                    @click="toggleSort('NOM_CLIENTE')"
                                >
                                    Nombre <i :class="sortIcon('NOM_CLIENTE')"></i>
                                </button>
                            </th>
                            <th class="px-2 py-3 w-24">Formato</th>
                            <th class="px-2 py-3 w-16">Tipo</th>
                            <th class="px-2 py-3 w-20">Estrategia</th>
                        </tr>
                    </thead>
                    
                    <tbody class="divide-y divide-pic-border">
                        <tr 
                            v-for="client in sortedClientsList" 
                            :key="client.IDCLIENTE"
                            class="group cursor-pointer transition-colors hover:bg-pic-muted-surface"
                            :class="{'bg-pic-brand-soft/50': store.selectedClients.has(client.IDCLIENTE)}"
                            @click="store.toggleClientSelection(client.IDCLIENTE, client.NOM_CLIENTE)"
                        >
                            <td class="px-2 py-2 text-center" @click.stop>
                                <input 
                                    type="checkbox" 
                                    class="cursor-pointer rounded border-pic-border text-pic-brand focus:ring-pic-brand"
                                    :checked="store.selectedClients.has(client.IDCLIENTE)"
                                    @change="store.toggleClientSelection(client.IDCLIENTE, client.NOM_CLIENTE)"
                                >
                            </td>
                            
                            <td class="truncate px-2 py-2 font-mono text-pic-text-muted" :title="client.IDCLIENTE">
                                {{ client.IDCLIENTE }}
                            </td>
                            <td class="truncate px-2 py-2 text-pic-text-muted" :title="client.Matriz">
                                {{ client.Matriz || '-' }}
                            </td>
                            <td class="truncate px-2 py-2 text-pic-text-muted" :title="client.Cadena">
                                {{ client.Cadena || '-' }}
                            </td>
                            <td class="truncate px-2 py-2 font-semibold text-pic-text-main" :title="client.NOM_CLIENTE">
                                {{ client.NOM_CLIENTE }}
                            </td>
                            <td class="truncate px-2 py-2 text-pic-text-muted" :title="client.formatocte">
                                {{ client.formatocte || '-' }}
                            </td>
                            <td class="truncate px-2 py-2 text-pic-text-muted" :title="client.TipoCLI">
                                {{ client.TipoCLI || '-' }}
                            </td>
                            <td class="px-2 py-2">
                                <span class="block truncate text-pic-text-muted" :title="client.EST2017">
                                    {{ client.EST2017 || '-' }}
                                </span>
                            </td>
                        </tr>
                        
                        <tr v-if="sortedClientsList.length === 0 && !isLoading">
                            <td colspan="8" class="flex w-full flex-col items-center justify-center px-4 py-12 text-center text-pic-text-muted">
                                <i class="fa-regular fa-folder-open text-2xl mb-2 opacity-50"></i>
                                <span>No se encontraron resultados.</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="mt-4 flex shrink-0 items-center justify-between border-t border-pic-border pt-2">
                <div class="flex items-center gap-2 text-xs text-pic-text-muted">
                    <span class="text-sm font-bold text-pic-brand">{{ store.selectedClients.size }}</span> seleccionados
                    <button 
                        v-if="store.selectedClients.size > 0" 
                        @click="store.clearSelectedClients"
                        class="ml-2 font-medium text-pic-danger hover:underline"
                    >
                        Borrar todo
                    </button>
                </div>

                <div class="flex items-center gap-2">
                    <button 
                        @click="changePage(currentPage - 1)" 
                        :disabled="currentPage === 1"
                        class="rounded border border-pic-border px-3 py-1 text-xs text-pic-text-muted transition-colors hover:bg-pic-muted-surface disabled:opacity-50"
                    >
                        <i class="fa-solid fa-chevron-left mr-1"></i> Anterior
                    </button>
                    <span class="rounded bg-pic-muted-surface px-2 py-1 font-mono text-xs text-pic-text-main">
                        {{ currentPage }} / {{ totalPages }}
                    </span>
                    <button 
                        @click="changePage(currentPage + 1)" 
                        :disabled="currentPage === totalPages"
                        class="rounded border border-pic-border px-3 py-1 text-xs text-pic-text-muted transition-colors hover:bg-pic-muted-surface disabled:opacity-50"
                    >
                        Siguiente <i class="fa-solid fa-chevron-right ml-1"></i>
                    </button>
                </div>
            </div>
        </div>

        <template #footer>
            <button 
                @click="close"
                class="rounded-lg bg-pic-brand px-6 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-pic-brand/90"
            >
                Aplicar Selección
            </button>
        </template>
    </ModalDialog>
</template>
