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
const searchTerm = ref('');
const rows = ref<Pic52MatrixOption[]>([]);
const page = ref(1);
const totalPages = ref(1);
const totalRecords = ref(0);
const isLoading = ref(false);
const errorMessage = ref('');
const draftSelection = ref<string[]>([]);
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let searchRequestId = 0;

const selectedCount = computed(() => draftSelection.value.length);
const canSearch = computed(() => searchTerm.value.length === 0 || searchTerm.value.trim().length >= 2);

const close = () => emit('update:modelValue', false);

const fetchMatrices = async () => {
  if (!canSearch.value) {
    rows.value = [];
    totalPages.value = 1;
    totalRecords.value = 0;
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
    totalRecords.value = response.pagination.totalRecords;
  } catch (error) {
    if (requestId !== searchRequestId) return;
    errorMessage.value = axios.isAxiosError(error)
      ? error.response?.data?.message || error.message
      : 'No fue posible buscar matrices.';
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
  const pageValues = rows.value.map(row => row.matriz);
  const allSelected = pageValues.every(matriz => draftSelection.value.includes(matriz));
  draftSelection.value = allSelected
    ? draftSelection.value.filter(matriz => !pageValues.includes(matriz))
    : [...new Set([...draftSelection.value, ...pageValues])];
};

const applySelection = async () => {
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
    title="Seleccionar matrices"
    size="2xl"
    @update:model-value="emit('update:modelValue', $event)"
    @close="close"
  >
    <div class="flex min-h-[420px] flex-col font-sans">
      <div class="relative">
        <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-pic-text-muted"></i>
        <input
          v-model="searchTerm"
          type="search"
          placeholder="Buscar matriz (mínimo 2 caracteres)"
          class="h-10 w-full rounded-lg border border-pic-border bg-pic-muted-surface pl-9 pr-3 text-xs font-semibold text-pic-text-main outline-none transition focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-border"
        >
      </div>
      <p v-if="!canSearch" class="mt-1 text-[10px] font-semibold text-pic-warning">
        Escribe al menos dos caracteres para buscar.
      </p>

      <div class="mt-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-pic-text-muted">
        <span>{{ totalRecords }} matrices encontradas</span>
        <button
          v-if="selectedCount"
          type="button"
          class="text-pic-danger hover:underline"
          @click="draftSelection = []"
        >
          Limpiar {{ selectedCount }}
        </button>
      </div>

      <div class="relative mt-2 flex-1 overflow-hidden rounded-xl border border-pic-border">
        <div v-if="isLoading" class="absolute inset-0 z-10 flex items-center justify-center bg-pic-surface/85">
          <span class="flex items-center gap-2 text-xs font-bold text-pic-brand">
            <i class="fa-solid fa-circle-notch fa-spin"></i>Cargando matrices...
          </span>
        </div>

        <div v-if="errorMessage" class="flex h-full min-h-64 flex-col items-center justify-center gap-3 p-6 text-center">
          <i class="fa-solid fa-triangle-exclamation text-xl text-pic-danger"></i>
          <p class="text-xs font-semibold text-pic-text-muted">{{ errorMessage }}</p>
          <StdButton size="sm" icon="fa-solid fa-rotate-right" @click="fetchMatrices">Reintentar</StdButton>
        </div>

        <div v-else-if="rows.length" class="h-full max-h-[360px] overflow-y-auto">
          <div class="sticky top-0 z-[1] flex items-center gap-3 border-b border-pic-brand-border bg-pic-brand-soft px-3 py-2">
            <input
              type="checkbox"
              class="rounded border-pic-border text-pic-brand focus:ring-pic-brand"
              :checked="rows.every(row => draftSelection.includes(row.matriz))"
              aria-label="Seleccionar página"
              @change="togglePage"
            >
            <span class="text-[10px] font-black uppercase tracking-wide text-pic-brand">Matriz</span>
            <span class="ml-auto text-[10px] font-black uppercase tracking-wide text-pic-brand">Clientes</span>
          </div>
          <button
            v-for="row in rows"
            :key="row.matriz"
            type="button"
            class="flex w-full items-center gap-3 border-b border-pic-border px-3 py-2.5 text-left transition last:border-b-0 hover:bg-pic-muted-surface"
            :class="{ 'bg-pic-brand-soft/60': draftSelection.includes(row.matriz) }"
            @click="toggleMatrix(row.matriz)"
          >
            <span
              class="flex h-4 w-4 shrink-0 items-center justify-center rounded border"
              :class="draftSelection.includes(row.matriz) ? 'border-pic-brand bg-pic-brand text-white' : 'border-pic-border bg-pic-surface'"
            >
              <i v-if="draftSelection.includes(row.matriz)" class="fa-solid fa-check text-[8px]"></i>
            </span>
            <span class="min-w-0 truncate text-xs font-bold text-pic-text-main">{{ row.matriz }}</span>
            <span class="ml-auto rounded-md bg-pic-muted-surface px-2 py-1 font-mono text-[10px] font-bold text-pic-text-muted">
              {{ row.clientCount }}
            </span>
          </button>
        </div>

        <div v-else-if="!isLoading" class="flex min-h-64 flex-col items-center justify-center p-6 text-center text-pic-text-muted">
          <i class="fa-regular fa-folder-open text-2xl opacity-60"></i>
          <p class="mt-2 text-xs font-bold">No se encontraron matrices</p>
          <p class="mt-1 text-[10px] font-medium">Prueba otra búsqueda o revisa el alcance comercial.</p>
        </div>
      </div>

      <div class="mt-3 flex items-center justify-between gap-3">
        <span class="text-xs font-semibold text-pic-text-muted">Página {{ page }} de {{ totalPages }}</span>
        <div class="flex gap-2">
          <StdButton size="sm" icon="fa-solid fa-chevron-left" :disabled="page <= 1 || isLoading" @click="changePage(page - 1)">
            Anterior
          </StdButton>
          <StdButton size="sm" icon="fa-solid fa-chevron-right" :disabled="page >= totalPages || isLoading" @click="changePage(page + 1)">
            Siguiente
          </StdButton>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex w-full items-center justify-between gap-3">
        <span class="text-xs font-bold text-pic-text-muted">{{ selectedCount }} seleccionadas</span>
        <div class="flex gap-2">
          <StdButton size="sm" @click="close">Cancelar</StdButton>
          <StdButton size="sm" variant="primary" icon="fa-solid fa-check" @click="applySelection">
            Aplicar selección
          </StdButton>
        </div>
      </div>
    </template>
  </ModalDialog>
</template>
