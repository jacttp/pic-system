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

// Estado Local
const searchTerm = ref('');
const currentPage = ref(1);
const totalPages = ref(1);
const isLoading = ref(false);
const clientsList = ref<any[]>([]);
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

const toggleSelectAllPage = () => {
    const allSelected = clientsList.value.every(c => store.selectedClients.has(c.IDCLIENTE));
    clientsList.value.forEach(c => {
        if (allSelected) store.selectedClients.delete(c.IDCLIENTE);
        else store.selectedClients.set(c.IDCLIENTE, c.NOM_CLIENTE);
    });
};

const isPageFullySelected = computed(() => {
    return clientsList.value.length > 0 && clientsList.value.every(c => store.selectedClients.has(c.IDCLIENTE));
});
</script>

<template>
    <ModalDialog 
        :model-value="modelValue" 
        title="Búsqueda y Selección de Clientes" 
        size="4xl"
        @close="close"
    >
        <div class="flex flex-col h-[500px]"> 
            
            <div class="mb-4 relative shrink-0">
                <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                <input 
                    v-model="searchTerm"
                    type="text" 
                    placeholder="Buscar por ID, Nombre, Cadena..." 
                    class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-xs transition-all"
                    autofocus
                >
            </div>

            <div class="flex-1 overflow-y-auto border border-slate-200 rounded-lg relative">
                
                <div v-if="isLoading" class="absolute inset-0 bg-white/80 z-20 flex items-center justify-center backdrop-blur-sm">
                    <div class="flex flex-col items-center gap-2">
                        <i class="fa-solid fa-circle-notch fa-spin text-brand-600 text-2xl"></i>
                        <span class="text-xs text-slate-500 font-medium">Cargando clientes...</span>
                    </div>
                </div>

                <table class="w-full text-xs text-left border-collapse table-fixed">
                    <thead class="bg-brand-50/50 text-brand-600 uppercase font-bold sticky top-0 z-10 backdrop-blur-sm border-b border-brand-100">
                        <tr>
                            <th class="px-2 py-3 w-10 text-center">
                                <input 
                                    type="checkbox" 
                                    class="rounded border-brand-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                                    :checked="isPageFullySelected"
                                    @change="toggleSelectAllPage"
                                >
                            </th>
                            <th class="px-2 py-3 w-20">ID</th>
                            <th class="px-2 py-3 w-24">Matriz</th>
                            <th class="px-2 py-3 w-28">Cadena</th>
                            <th class="px-2 py-3 w-64">Nombre</th> <th class="px-2 py-3 w-24">Formato</th>
                            <th class="px-2 py-3 w-16">Tipo</th>
                            <th class="px-2 py-3 w-20">Estrategia</th>
                        </tr>
                    </thead>
                    
                    <tbody class="divide-y divide-slate-100">
                        <tr 
                            v-for="client in clientsList" 
                            :key="client.IDCLIENTE"
                            class="hover:bg-slate-50 transition-colors cursor-pointer group"
                            :class="{'bg-brand-50/40': store.selectedClients.has(client.IDCLIENTE)}"
                            @click="store.toggleClientSelection(client.IDCLIENTE, client.NOM_CLIENTE)"
                        >
                            <td class="px-2 py-2 text-center" @click.stop>
                                <input 
                                    type="checkbox" 
                                    class="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                                    :checked="store.selectedClients.has(client.IDCLIENTE)"
                                    @change="store.toggleClientSelection(client.IDCLIENTE, client.NOM_CLIENTE)"
                                >
                            </td>
                            
                            <td class="px-2 py-2 font-mono text-slate-500 truncate" :title="client.IDCLIENTE">
                                {{ client.IDCLIENTE }}
                            </td>
                            <td class="px-2 py-2 text-slate-600 truncate" :title="client.Matriz">
                                {{ client.Matriz || '-' }}
                            </td>
                            <td class="px-2 py-2 text-slate-600 truncate" :title="client.Cadena">
                                {{ client.Cadena || '-' }}
                            </td>
                            <td class="px-2 py-2 font-semibold text-slate-700 truncate" :title="client.NOM_CLIENTE">
                                {{ client.NOM_CLIENTE }}
                            </td>
                            <td class="px-2 py-2 text-slate-600 truncate" :title="client.formatocte">
                                {{ client.formatocte || '-' }}
                            </td>
                            <td class="px-2 py-2 text-slate-600 truncate" :title="client.TipoCLI">
                                {{ client.TipoCLI || '-' }}
                            </td>
                            <td class="px-2 py-2">
                                <span class="truncate block text-slate-500" :title="client.EST2017">
                                    {{ client.EST2017 || '-' }}
                                </span>
                            </td>
                        </tr>
                        
                        <tr v-if="clientsList.length === 0 && !isLoading">
                            <td colspan="8" class="px-4 py-12 text-center text-slate-400 flex flex-col items-center justify-center w-full">
                                <i class="fa-regular fa-folder-open text-2xl mb-2 opacity-50"></i>
                                <span>No se encontraron resultados.</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="mt-4 flex justify-between items-center pt-2 border-t border-slate-100 shrink-0">
                <div class="text-xs text-slate-500 flex items-center gap-2">
                    <span class="font-bold text-brand-600 text-sm">{{ store.selectedClients.size }}</span> seleccionados
                    <button 
                        v-if="store.selectedClients.size > 0" 
                        @click="store.clearSelectedClients"
                        class="text-red-500 hover:text-red-700 hover:underline ml-2 font-medium"
                    >
                        Borrar todo
                    </button>
                </div>

                <div class="flex items-center gap-2">
                    <button 
                        @click="changePage(currentPage - 1)" 
                        :disabled="currentPage === 1"
                        class="px-3 py-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs disabled:opacity-50 transition-colors"
                    >
                        <i class="fa-solid fa-chevron-left mr-1"></i> Anterior
                    </button>
                    <span class="text-xs text-slate-600 font-mono bg-slate-100 px-2 py-1 rounded">
                        {{ currentPage }} / {{ totalPages }}
                    </span>
                    <button 
                        @click="changePage(currentPage + 1)" 
                        :disabled="currentPage === totalPages"
                        class="px-3 py-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs disabled:opacity-50 transition-colors"
                    >
                        Siguiente <i class="fa-solid fa-chevron-right ml-1"></i>
                    </button>
                </div>
            </div>
        </div>

        <template #footer>
            <button 
                @click="close"
                class="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2 rounded-lg text-xs font-bold shadow-sm transition-colors uppercase tracking-wide"
            >
                Aplicar Selección
            </button>
        </template>
    </ModalDialog>
</template>