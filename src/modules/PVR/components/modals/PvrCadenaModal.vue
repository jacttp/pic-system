<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import ModalDialog from '@/modules/Shared/components/ModalDialog.vue'; 

const props = defineProps<{
    modelValue: boolean; 
    cadenasOptions: string[]; // Todas las cadenas disponibles
    selectedCadenas: string[]; // Las seleccionadas actualmente
}>();

const emit = defineEmits(['update:modelValue', 'update:selectedCadenas']);

// Estado Local
const searchTerm = ref('');
const localSelected = ref<Set<string>>(new Set());
const currentPage = ref(1);
const itemsPerPage = 50;

// Al abrir, copiar las seleccionadas a local
watch(() => props.modelValue, (isOpen) => {
    if (isOpen) {
        localSelected.value = new Set(props.selectedCadenas);
        searchTerm.value = '';
        currentPage.value = 1;
    }
});

const close = () => {
    emit('update:modelValue', false);
};

// Filtrar las opciones locales
const filteredCadenas = computed(() => {
    if (!searchTerm.value) return props.cadenasOptions;
    const term = searchTerm.value.toLowerCase();
    return props.cadenasOptions.filter(c => c.toLowerCase().includes(term));
});

// Paginación
const totalPages = computed(() => Math.ceil(filteredCadenas.value.length / itemsPerPage) || 1);

const paginatedCadenas = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage;
    return filteredCadenas.value.slice(start, start + itemsPerPage);
});

// Reiniciar página al buscar
watch(searchTerm, () => {
    currentPage.value = 1;
});

const changePage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages.value) {
        currentPage.value = newPage;
    }
};

const toggleSelection = (cadena: string) => {
    const newSet = new Set(localSelected.value);
    if (newSet.has(cadena)) {
        newSet.delete(cadena);
    } else {
        newSet.add(cadena);
    }
    localSelected.value = newSet;
};

const toggleSelectAllPage = () => {
    const allSelected = paginatedCadenas.value.every(c => localSelected.value.has(c));
    const newSet = new Set(localSelected.value);
    paginatedCadenas.value.forEach(c => {
        if (allSelected) {
            newSet.delete(c);
        } else {
            newSet.add(c);
        }
    });
    localSelected.value = newSet;
};

const isPageFullySelected = computed(() => {
    return paginatedCadenas.value.length > 0 && paginatedCadenas.value.every(c => localSelected.value.has(c));
});

const clearSelection = () => {
    localSelected.value = new Set();
}

const applySelection = () => {
    emit('update:selectedCadenas', Array.from(localSelected.value));
    close();
};
</script>

<template>
    <ModalDialog 
        :model-value="modelValue" 
        title="Búsqueda y Selección de Cadenas" 
        size="2xl"
        @close="close"
    >
        <div class="flex flex-col h-[500px]"> 
            
            <div class="mb-4 relative shrink-0">
                <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                <input 
                    v-model="searchTerm"
                    type="text" 
                    placeholder="Buscar cadena por nombre..." 
                    class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-xs transition-all"
                    autofocus
                >
            </div>

            <div class="flex-1 overflow-y-auto border border-slate-200 rounded-lg relative">
                <table class="w-full text-xs text-left border-collapse table-fixed">
                    <thead class="bg-brand-50/50 text-brand-600 uppercase font-bold sticky top-0 z-10 backdrop-blur-sm border-b border-brand-100">
                        <tr>
                            <th class="px-2 py-3 w-12 text-center">
                                <input 
                                    type="checkbox" 
                                    class="rounded border-brand-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                                    :checked="isPageFullySelected"
                                    @change="toggleSelectAllPage"
                                >
                            </th>
                            <th class="px-3 py-3 w-full">Nombre de la Cadena</th>
                        </tr>
                    </thead>
                    
                    <tbody class="divide-y divide-slate-100">
                        <tr 
                            v-for="cadena in paginatedCadenas" 
                            :key="cadena"
                            class="hover:bg-slate-50 transition-colors cursor-pointer group"
                            :class="{'bg-brand-50/40': localSelected.has(cadena)}"
                            @click="toggleSelection(cadena)"
                        >
                            <td class="px-2 py-2 text-center" @click.stop>
                                <input 
                                    type="checkbox" 
                                    class="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                                    :checked="localSelected.has(cadena)"
                                    @change="toggleSelection(cadena)"
                                >
                            </td>
                            <td class="px-3 py-2 font-semibold text-slate-700 truncate" :title="cadena">
                                {{ cadena }}
                            </td>
                        </tr>
                        
                        <tr v-if="paginatedCadenas.length === 0">
                            <td colspan="2" class="px-4 py-12 text-center text-slate-400 flex flex-col items-center justify-center w-full">
                                <i class="fa-regular fa-folder-open text-2xl mb-2 opacity-50"></i>
                                <span>No se encontraron cadenas.</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="mt-4 flex justify-between items-center pt-2 border-t border-slate-100 shrink-0">
                <div class="text-xs text-slate-500 flex items-center gap-2">
                    <span class="font-bold text-brand-600 text-sm">{{ localSelected.size }}</span> seleccionados
                    <button 
                        v-if="localSelected.size > 0" 
                        @click="clearSelection"
                        class="text-red-500 hover:text-red-700 hover:underline ml-2 font-medium"
                    >
                        Borrar todo
                    </button>
                    <span class="ml-4 text-slate-400">Total: {{ filteredCadenas.length }}</span>
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
            <div class="flex justify-end gap-3 w-full">
                <button 
                    @click="close"
                    class="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-6 py-2 rounded-lg text-xs font-bold shadow-sm transition-colors uppercase tracking-wide"
                >
                    Cancelar
                </button>
                <button 
                    @click="applySelection"
                    class="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2 rounded-lg text-xs font-bold shadow-sm transition-colors uppercase tracking-wide"
                >
                    Aplicar Selección
                </button>
            </div>
        </template>
    </ModalDialog>
</template>
