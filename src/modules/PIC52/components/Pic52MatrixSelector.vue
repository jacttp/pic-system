<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import axios from 'axios';
import ModalDialog from '@/modules/Shared/components/ModalDialog.vue';
import { StdButton } from '@/modules/Shared/components/std';
import { pic52Api } from '../services/pic52Api';
import { usePic52Store } from '../stores/pic52Store';
import type { Pic52MatrixOption } from '../types/pic52';

interface Props {
  modelValue: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void;
}>();

const store = usePic52Store();
type SortKey = 'matriz' | 'chain' | 'clientName';
type SortDirection = 'asc' | 'desc';

const searchTerm = ref('');
const rows = ref<Pic52MatrixOption[]>([]);
const page = ref(1);
const totalPages = ref(1);
const isLoading = ref(false);
const errorMessage = ref('');
const draftSelection = ref<string[]>([]);
const sortKey = ref<SortKey | null>(null);
const sortDirection = ref<SortDirection>('asc');
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let searchRequestId = 0;

const selectedCount = computed(() => draftSelection.value.length);
const selectedMatrices = computed(() => new Set(draftSelection.value));
const canSearch = computed(() => searchTerm.value.length === 0 || searchTerm.value.trim().length >= 2);
const sortedRows = computed(() => {
  const activeSortKey = sortKey.value;
  if (!activeSortKey) return rows.value;

  return [...rows.value].sort((left, right) => {
    const comparison = left[activeSortKey].localeCompare(right[activeSortKey], 'es-MX', {
      numeric: true,
      sensitivity: 'base',
    });
    return sortDirection.value === 'asc' ? comparison : -comparison;
  });
});
const isPageFullySelected = computed(() => (
  sortedRows.value.length > 0
  && sortedRows.value.every(row => selectedMatrices.value.has(row.matriz))
));
const matrixSortIcon = computed(() => {
  if (sortKey.value !== 'matriz') return 'fa-solid fa-sort text-pic-text-muted/60';
  return sortDirection.value === 'asc'
    ? 'fa-solid fa-sort-up text-pic-brand'
    : 'fa-solid fa-sort-down text-pic-brand';
});
const chainSortIcon = computed(() => {
  if (sortKey.value !== 'chain') return 'fa-solid fa-sort text-pic-text-muted/60';
  return sortDirection.value === 'asc'
    ? 'fa-solid fa-sort-up text-pic-brand'
    : 'fa-solid fa-sort-down text-pic-brand';
});
const clientNameSortIcon = computed(() => {
  if (sortKey.value !== 'clientName') return 'fa-solid fa-sort text-pic-text-muted/60';
  return sortDirection.value === 'asc'
    ? 'fa-solid fa-sort-up text-pic-brand'
    : 'fa-solid fa-sort-down text-pic-brand';
});

const close = () => {
  searchRequestId += 1;
  isLoading.value = false;
  emit('update:modelValue', false);
};

const fetchMatrices = async () => {
  if (!canSearch.value) {
    searchRequestId += 1;
    isLoading.value = false;
    errorMessage.value = '';
    rows.value = [];
    totalPages.value = 1;
    return;
  }

  const requestId = ++searchRequestId;
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const response = await pic52Api.searchMatrices({
      searchTerm: searchTerm.value.trim(),
      filters: store.selected,
      page: page.value,
    });
    if (requestId !== searchRequestId) return;
    rows.value = response.data;
    totalPages.value = Math.max(1, response.pagination.totalPages);
  } catch (error) {
    if (requestId !== searchRequestId) return;
    errorMessage.value = axios.isAxiosError(error)
      ? error.response?.data?.message || error.message
      : 'No fue posible buscar clientes.';
    rows.value = [];
  } finally {
    if (requestId === searchRequestId) isLoading.value = false;
  }
};

const toggleMatrix = (matriz: string) => {
  draftSelection.value = draftSelection.value.includes(matriz)
    ? draftSelection.value.filter(item => item !== matriz)
    : [...draftSelection.value, matriz];
};

const togglePage = () => {
  const pageValues = sortedRows.value.map(row => row.matriz);
  const allSelected = pageValues.every(matriz => draftSelection.value.includes(matriz));
  draftSelection.value = allSelected
    ? draftSelection.value.filter(matriz => !pageValues.includes(matriz))
    : [...new Set([...draftSelection.value, ...pageValues])];
};

const clearSelection = () => {
  draftSelection.value = [];
};

const toggleSort = (key: SortKey) => {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
    return;
  }
  sortKey.value = key;
  sortDirection.value = 'asc';
};

const applySelection = () => {
  store.selected.matrices = [...draftSelection.value];
  close();
};

const changePage = async (nextPage: number) => {
  if (nextPage < 1 || nextPage > totalPages.value || nextPage === page.value) return;
  page.value = nextPage;
  await fetchMatrices();
};

watch(() => props.modelValue, open => {
  if (!open) return;
  draftSelection.value = [...store.selected.matrices];
  page.value = 1;
  void fetchMatrices();
});

watch(searchTerm, () => {
  if (!props.modelValue) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    page.value = 1;
    void fetchMatrices();
  }, 350);
});

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
});
</script>

<template>
  <ModalDialog
    :model-value="modelValue"
    title="Búsqueda y Selección de Clientes"
    size="4xl"
    @close="close"
  >
    <div class="flex h-[500px] max-h-[65vh] min-h-0 flex-col font-sans">
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

      <p v-if="!canSearch" class="-mt-3 mb-2 shrink-0 text-[10px] font-semibold text-pic-warning">
        Escribe al menos dos caracteres para buscar.
      </p>

      <div class="relative min-h-0 flex-1 overflow-auto rounded-lg border border-pic-border">
        <div v-if="isLoading" class="absolute inset-0 z-20 flex items-center justify-center bg-pic-surface/80 backdrop-blur-sm">
          <div class="flex flex-col items-center gap-2">
            <i class="fa-solid fa-circle-notch fa-spin text-2xl text-pic-brand"></i>
            <span class="text-xs font-medium text-pic-text-muted">Cargando clientes...</span>
          </div>
        </div>

        <div v-if="errorMessage" class="flex h-full min-h-64 flex-col items-center justify-center gap-3 p-6 text-center">
          <i class="fa-solid fa-triangle-exclamation text-xl text-pic-danger"></i>
          <p class="text-xs font-semibold text-pic-text-muted">{{ errorMessage }}</p>
          <StdButton size="sm" icon="fa-solid fa-rotate-right" @click="fetchMatrices">Reintentar</StdButton>
        </div>

        <table v-else class="w-full min-w-[52rem] table-fixed border-collapse text-left text-xs">
          <thead class="sticky top-0 z-10 border-b border-pic-brand-border bg-pic-brand-soft/70 font-bold uppercase text-pic-brand backdrop-blur-sm">
            <tr>
              <th class="w-10 px-2 py-3 text-center">
                <input
                  type="checkbox"
                  class="cursor-pointer rounded border-pic-brand-border text-pic-brand focus:ring-pic-brand"
                  :checked="isPageFullySelected"
                  aria-label="Seleccionar todos los clientes de esta página"
                  @change="togglePage"
                >
              </th>
              <th class="w-20 px-2 py-3">ID</th>
              <th class="w-24 px-2 py-3">
                <button
                  type="button"
                  class="flex items-center gap-1.5 text-left transition-colors hover:text-pic-text-main"
                  @click="toggleSort('matriz')"
                >
                  Matriz <i :class="matrixSortIcon"></i>
                </button>
              </th>
              <th class="w-28 px-2 py-3">
                <button
                  type="button"
                  class="flex items-center gap-1.5 text-left transition-colors hover:text-pic-text-main"
                  @click="toggleSort('chain')"
                >
                  Cadena <i :class="chainSortIcon"></i>
                </button>
              </th>
              <th class="w-64 px-2 py-3">
                <button
                  type="button"
                  class="flex items-center gap-1.5 text-left transition-colors hover:text-pic-text-main"
                  @click="toggleSort('clientName')"
                >
                  Nombre <i :class="clientNameSortIcon"></i>
                </button>
              </th>
              <th class="w-24 px-2 py-3">Formato</th>
              <th class="w-16 px-2 py-3">Tipo</th>
              <th class="w-20 px-2 py-3">Estrategia</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-pic-border">
            <tr
              v-for="row in sortedRows"
              :key="row.matriz"
              class="group cursor-pointer transition-colors hover:bg-pic-muted-surface"
              :class="{ 'bg-pic-brand-soft/50': selectedMatrices.has(row.matriz) }"
              @click="toggleMatrix(row.matriz)"
            >
              <td class="px-2 py-2 text-center" @click.stop>
                <input
                  type="checkbox"
                  class="cursor-pointer rounded border-pic-border text-pic-brand focus:ring-pic-brand"
                  :checked="selectedMatrices.has(row.matriz)"
                  :aria-label="`Seleccionar cliente ${row.clientName || row.clientId}`"
                  @change="toggleMatrix(row.matriz)"
                >
              </td>
              <td class="truncate px-2 py-2 font-mono text-pic-text-muted" :title="row.clientId">
                {{ row.clientId }}
              </td>
              <td class="truncate px-2 py-2 text-pic-text-muted" :title="row.matriz">
                {{ row.matriz || '-' }}
              </td>
              <td class="truncate px-2 py-2 text-pic-text-muted" :title="row.chain">
                {{ row.chain || '-' }}
              </td>
              <td class="truncate px-2 py-2 font-semibold text-pic-text-main" :title="row.clientName">
                {{ row.clientName || '-' }}
              </td>
              <td class="truncate px-2 py-2 text-pic-text-muted" :title="row.format">
                {{ row.format || '-' }}
              </td>
              <td class="truncate px-2 py-2 text-pic-text-muted" :title="row.clientType">
                {{ row.clientType || '-' }}
              </td>
              <td class="truncate px-2 py-2 text-pic-text-muted" :title="row.strategy">
                {{ row.strategy || '-' }}
              </td>
            </tr>
            <tr v-if="sortedRows.length === 0 && !isLoading">
              <td colspan="8" class="px-4 py-12 text-center text-pic-text-muted">
                <i class="fa-regular fa-folder-open mb-2 block text-2xl opacity-50"></i>
                <span class="block text-xs font-semibold">No se encontraron resultados.</span>
                <span class="mt-1 block text-[10px]">Prueba otra búsqueda o revisa el alcance comercial.</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-4 flex shrink-0 flex-col gap-3 border-t border-pic-border pt-2 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-wrap items-center gap-2 text-xs text-pic-text-muted">
          <span><strong class="text-sm text-pic-brand">{{ selectedCount }}</strong> seleccionados</span>
          <button
            v-if="selectedCount > 0"
            type="button"
            class="font-medium text-pic-danger hover:underline"
            @click="clearSelection"
          >
            Borrar todo
          </button>
        </div>

        <div class="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            class="rounded border border-pic-border px-3 py-1 text-xs text-pic-text-muted transition-colors hover:bg-pic-muted-surface disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="page <= 1 || isLoading"
            @click="changePage(page - 1)"
          >
            <i class="fa-solid fa-chevron-left mr-1"></i> Anterior
          </button>
          <span class="rounded bg-pic-muted-surface px-2 py-1 font-mono text-xs text-pic-text-main">
            {{ page }} / {{ totalPages }}
          </span>
          <button
            type="button"
            class="rounded border border-pic-border px-3 py-1 text-xs text-pic-text-muted transition-colors hover:bg-pic-muted-surface disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="page >= totalPages || isLoading"
            @click="changePage(page + 1)"
          >
            Siguiente <i class="fa-solid fa-chevron-right ml-1"></i>
          </button>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <StdButton size="sm" class="w-full sm:w-auto" @click="close">Cancelar</StdButton>
        <StdButton size="sm" variant="primary" icon="fa-solid fa-check" class="w-full sm:w-auto" @click="applySelection">
          Aplicar selección
        </StdButton>
      </div>
    </template>
  </ModalDialog>
</template>
