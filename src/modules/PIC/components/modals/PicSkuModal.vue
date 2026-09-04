<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { usePicFilterStore } from '../../stores/picFilterStore';
import ModalDialog from '@/modules/Shared/components/ModalDialog.vue';

interface Props {
    modelValue: boolean;
    options: string[];
    loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    loading: false
});

const emit = defineEmits<{
    (event: 'update:modelValue', value: boolean): void;
}>();

const store = usePicFilterStore();
const searchTerm = ref('');
const currentPage = ref(1);
const pageSize = 10;

const filteredSkus = computed(() => {
    const query = searchTerm.value.trim().toLocaleLowerCase('es-MX');
    if (!query) return props.options;
    return props.options.filter(sku => sku.toLocaleLowerCase('es-MX').includes(query));
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredSkus.value.length / pageSize)));
const paginatedSkus = computed(() => {
    const start = (currentPage.value - 1) * pageSize;
    return filteredSkus.value.slice(start, start + pageSize);
});
const selectedCount = computed(() => store.selected.SKU.length);
const isPageFullySelected = computed(() => (
    paginatedSkus.value.length > 0
    && paginatedSkus.value.every(sku => store.selected.SKU.includes(sku))
));

watch(searchTerm, () => {
    currentPage.value = 1;
});

watch(() => props.modelValue, isOpen => {
    if (isOpen) currentPage.value = 1;
});

watch(totalPages, pages => {
    if (currentPage.value > pages) currentPage.value = pages;
});

const close = () => emit('update:modelValue', false);

const toggleSku = (sku: string) => {
    store.selected.SKU = store.selected.SKU.includes(sku)
        ? store.selected.SKU.filter(value => value !== sku)
        : [...store.selected.SKU, sku];
};

const toggleSelectAllPage = () => {
    const pageSkus = new Set(paginatedSkus.value);
    store.selected.SKU = isPageFullySelected.value
        ? store.selected.SKU.filter(sku => !pageSkus.has(sku))
        : [...new Set([...store.selected.SKU, ...paginatedSkus.value])];
};

const clearSelection = () => {
    store.selected.SKU = [];
};
</script>

<template>
    <ModalDialog
        :model-value="modelValue"
        title="Búsqueda y Selección de SKU"
        size="2xl"
        @close="close"
    >
        <div class="flex h-[390px] flex-col sm:h-[420px]">
            <div class="relative mb-4 shrink-0">
                <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-pic-text-muted"></i>
                <input
                    v-model="searchTerm"
                    type="search"
                    placeholder="Buscar SKU..."
                    class="w-full rounded-lg border border-pic-border bg-pic-muted-surface py-2 pl-9 pr-4 text-xs text-pic-text-main outline-none transition-all placeholder:text-pic-text-muted focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-border"
                    autofocus
                >
            </div>

            <div class="relative flex-1 overflow-y-auto rounded-lg border border-pic-border">
                <div v-if="loading" class="absolute inset-0 z-20 flex items-center justify-center bg-pic-surface/80 backdrop-blur-sm">
                    <div class="flex flex-col items-center gap-2">
                        <i class="fa-solid fa-circle-notch fa-spin text-2xl text-pic-brand"></i>
                        <span class="text-xs font-medium text-pic-text-muted">Cargando SKU...</span>
                    </div>
                </div>

                <table class="w-full table-fixed border-collapse text-left text-xs">
                    <thead class="sticky top-0 z-10 border-b border-pic-brand-border bg-pic-brand-soft/70 font-bold uppercase text-pic-brand backdrop-blur-sm">
                        <tr>
                            <th class="w-12 px-3 py-3 text-center">
                                <input
                                    type="checkbox"
                                    aria-label="Seleccionar todos los SKU de esta página"
                                    class="cursor-pointer rounded border-pic-brand-border text-pic-brand focus:ring-pic-brand"
                                    :checked="isPageFullySelected"
                                    :disabled="loading || paginatedSkus.length === 0"
                                    @change="toggleSelectAllPage"
                                >
                            </th>
                            <th class="px-3 py-3">SKU</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-pic-border">
                        <tr
                            v-for="sku in paginatedSkus"
                            :key="sku"
                            class="cursor-pointer transition-colors hover:bg-pic-muted-surface"
                            :class="{ 'bg-pic-brand-soft/50': store.selected.SKU.includes(sku) }"
                            @click="toggleSku(sku)"
                        >
                            <td class="px-3 py-2 text-center" @click.stop>
                                <input
                                    type="checkbox"
                                    :aria-label="`Seleccionar ${sku}`"
                                    class="cursor-pointer rounded border-pic-border text-pic-brand focus:ring-pic-brand"
                                    :checked="store.selected.SKU.includes(sku)"
                                    @change="toggleSku(sku)"
                                >
                            </td>
                            <td class="truncate px-3 py-2 font-mono text-pic-text-main" :title="sku">
                                {{ sku }}
                            </td>
                        </tr>
                        <tr v-if="filteredSkus.length === 0 && !loading">
                            <td colspan="2" class="px-4 py-12 text-center text-pic-text-muted">
                                <i class="fa-regular fa-folder-open mb-2 block text-2xl opacity-50"></i>
                                No se encontraron SKU.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="mt-4 flex shrink-0 items-center justify-between gap-3 border-t border-pic-border pt-2">
                <div class="flex items-center gap-2 text-xs text-pic-text-muted">
                    <span class="text-sm font-bold text-pic-brand">{{ selectedCount }}</span> seleccionados
                    <button
                        v-if="selectedCount > 0"
                        type="button"
                        class="ml-2 font-medium text-pic-danger hover:underline"
                        @click="clearSelection"
                    >
                        Borrar todo
                    </button>
                </div>
                <div class="flex shrink-0 items-center gap-2">
                    <span class="hidden text-xs text-pic-text-muted sm:inline">{{ filteredSkus.length }} resultados</span>
                    <button
                        type="button"
                        aria-label="Página anterior"
                        class="rounded border border-pic-border px-2.5 py-1 text-xs text-pic-text-muted transition-colors hover:bg-pic-muted-surface disabled:cursor-not-allowed disabled:opacity-50"
                        :disabled="currentPage === 1"
                        @click="currentPage--"
                    >
                        <i class="fa-solid fa-chevron-left"></i>
                    </button>
                    <span class="rounded bg-pic-muted-surface px-2 py-1 font-mono text-xs text-pic-text-main">
                        {{ currentPage }} / {{ totalPages }}
                    </span>
                    <button
                        type="button"
                        aria-label="Página siguiente"
                        class="rounded border border-pic-border px-2.5 py-1 text-xs text-pic-text-muted transition-colors hover:bg-pic-muted-surface disabled:cursor-not-allowed disabled:opacity-50"
                        :disabled="currentPage === totalPages"
                        @click="currentPage++"
                    >
                        <i class="fa-solid fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        </div>

        <template #footer>
            <button
                type="button"
                class="rounded-lg bg-pic-brand px-6 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-pic-brand/90"
                @click="close"
            >
                Aplicar selección
            </button>
        </template>
    </ModalDialog>
</template>
