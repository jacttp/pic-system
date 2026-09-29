<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { technicalStudyApi } from '../services/technicalStudyApi';
import type { StoreSearchRow } from '../types/technicalStudy.types';
import StdAlert from '@/modules/Shared/components/std/StdAlert.vue';
import StdButton from '@/modules/Shared/components/std/StdButton.vue';
import StdDataTable from '@/modules/Shared/components/std/StdDataTable.vue';

const selected = defineModel<StoreSearchRow[]>({ default: () => [] });
const managements = ref<string[]>([]);
const leaderships = ref<string[]>([]);
const management = ref('');
const leadership = ref('');
const searchTerm = ref('');
const page = ref(1);
const pageSize = 15;
const rows = ref<StoreSearchRow[]>([]);
const totalPages = ref(0);
const total = ref(0);
const loading = ref(false);
const error = ref('');
const selectedIds = computed(() => selected.value.map(row => row.IDCLIENTE));
const columns = [
   { key: 'IDCLIENTE', label: 'ID tienda' },
   { key: 'NOM_CLIENTE', label: 'Tienda' },
   { key: 'Cadena', label: 'Cadena' },
];

async function search() {
   loading.value = true;
   error.value = '';
   try {
      const result = await technicalStudyApi.searchStores({
         searchTerm: searchTerm.value.trim(),
         filters: {
            canal: ['Autoservicio', 'Autoservicios', 'Club', 'Clubs'],
            Gerencia: management.value ? [management.value] : [],
            Jefatura: leadership.value ? [leadership.value] : [],
            Ruta: [],
         },
         page: page.value,
         pageSize,
      });
      rows.value = result.clients;
      totalPages.value = result.pagination.totalPages;
      total.value = result.pagination.totalFilteredRecords;
   } catch {
      error.value = 'No se pudieron buscar las tiendas.';
   } finally {
      loading.value = false;
   }
}

function toggle(key: string | number) {
   const id = String(key);
   if (selectedIds.value.includes(id)) {
      selected.value = selected.value.filter(row => row.IDCLIENTE !== id);
      return;
   }
   const row = rows.value.find(item => item.IDCLIENTE === id);
   if (row) selected.value = [...selected.value, row];
}

watch(management, async () => {
   leadership.value = '';
   try {
      leaderships.value = management.value ? await technicalStudyApi.getLeaderships([management.value]) : [];
   } catch {
      leaderships.value = [];
      error.value = 'No se pudieron cargar las jefaturas.';
      return;
   }
   page.value = 1;
   await search();
});
onMounted(async () => {
   try {
      managements.value = await technicalStudyApi.getManagements();
      await search();
   } catch {
      error.value = 'No se pudieron cargar los filtros de tiendas.';
   }
});
</script>

<template>
  <div class="space-y-4">
    <div class="grid gap-3 md:grid-cols-[1fr_1fr_2fr_auto]">
      <label class="text-xs font-bold text-slate-600">Gerencia
        <select v-model="management" class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          <option value="">Todas</option><option v-for="item in managements" :key="item" :value="item">{{ item }}</option>
        </select>
      </label>
      <label class="text-xs font-bold text-slate-600">Jefatura
        <select v-model="leadership" class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" @change="page = 1; search()">
          <option value="">Todas</option><option v-for="item in leaderships" :key="item" :value="item">{{ item }}</option>
        </select>
      </label>
      <label class="text-xs font-bold text-slate-600">Buscar tienda o ID
        <input v-model="searchTerm" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Nombre, cadena o ID" @keydown.enter.prevent="page = 1; search()">
      </label>
      <StdButton class="self-end" icon="fa-solid fa-magnifying-glass" @click="page = 1; search()">Buscar</StdButton>
    </div>
    <StdAlert v-if="error" tone="danger" title="Tiendas no disponibles" :description="error" />
    <StdDataTable :columns="columns" :rows="rows" :loading="loading" selectable :selected-keys="selectedIds" row-key="IDCLIENTE" :show-actions="false" @select-row="toggle" />
    <div class="flex items-center justify-between text-xs font-semibold text-slate-500">
      <span>{{ total }} resultados · {{ selected.length }} tiendas seleccionadas</span>
      <div class="flex items-center gap-2">
        <StdButton size="sm" :disabled="page <= 1" @click="page--; search()">Anterior</StdButton>
        <span>{{ page }} / {{ Math.max(totalPages, 1) }}</span>
        <StdButton size="sm" :disabled="page >= totalPages" @click="page++; search()">Siguiente</StdButton>
      </div>
    </div>
    <div v-if="selected.length" class="rounded-xl border border-pic-brand-border bg-pic-brand-soft p-3">
      <p class="mb-2 text-xs font-black uppercase text-pic-brand">Selección conservada entre páginas</p>
      <div class="flex flex-wrap gap-2">
        <button v-for="item in selected" :key="item.IDCLIENTE" type="button" class="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-slate-700" @click="toggle(item.IDCLIENTE)">
          {{ item.NOM_CLIENTE }} · {{ item.IDCLIENTE }} <i class="fa-solid fa-xmark ml-1"></i>
        </button>
      </div>
    </div>
  </div>
</template>
