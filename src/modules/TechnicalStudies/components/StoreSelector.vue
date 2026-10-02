<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import StdButton from '@/modules/Shared/components/std/StdButton.vue';
import TechnicalNotice from './TechnicalNotice.vue';
import TechnicalTable from './TechnicalTable.vue';
import TechnicalPagination from './TechnicalPagination.vue';
import { technicalStudyApi } from '../services/technicalStudyApi';
import type { StoreSearchRow } from '../types/technicalStudy.types';
import { selectStorePage } from '../utils/technicalStudyUi';
const props = withDefaults(defineProps<{ disabled?: boolean; invalidStoreIds?: string[] }>(), { invalidStoreIds: () => [] });
const selected = defineModel<StoreSearchRow[]>({ default: () => [] });
const managements = ref<string[]>([]); const leaderships = ref<string[]>([]);
const management = ref(''); const leadership = ref(''); const searchTerm = ref('');
const page = ref(1); const pageSize = 15; const rows = ref<StoreSearchRow[]>([]); const total = ref(0);
const loading = ref(false); const filtersLoading = ref(false); const error = ref(''); const limitNotice = ref(''); const selectionOpen = ref(false);
let searchRequest = 0; let filterRequest = 0;
const selectedIds = computed(() => new Set(selected.value.map(row => row.IDCLIENTE)));
const allSelected = computed(() => rows.value.length > 0 && rows.value.every(row => selectedIds.value.has(row.IDCLIENTE)));
const someSelected = computed(() => rows.value.some(row => selectedIds.value.has(row.IDCLIENTE)));
const disabledControls = computed(() => props.disabled || loading.value || filtersLoading.value);
const tableRows = computed(() => rows.value.map(row => ({ id: row.IDCLIENTE, name: row.NOM_CLIENTE, chain: row.Cadena || 'Sin cadena' })));
const columns = [{ key: 'select', label: 'Elegir' }, { key: 'name', label: 'Tienda' }, { key: 'id', label: 'ID tienda' }, { key: 'chain', label: 'Cadena' }];
async function search(target = page.value) {
   if (props.disabled) return;
   const request = ++searchRequest;
   page.value = target; loading.value = true; error.value = ''; rows.value = [];
   try {
      const result = await technicalStudyApi.searchStores({ searchTerm: searchTerm.value.trim(), filters: { canal: ['Autoservicio', 'Autoservicios', 'Club', 'Clubs'], Gerencia: management.value ? [management.value] : [], Jefatura: leadership.value ? [leadership.value] : [], Ruta: [] }, page: target, pageSize });
      if (request !== searchRequest) return;
      rows.value = result.clients; total.value = result.pagination.totalFilteredRecords;
   } catch { if (request === searchRequest) { error.value = 'No se pudieron buscar las tiendas. Vuelve a intentar.'; total.value = 0; } }
   finally { if (request === searchRequest) loading.value = false; }
}
function toggle(id: string) {
   if (props.disabled) return;
   if (selectedIds.value.has(id)) { selected.value = selected.value.filter(row => row.IDCLIENTE !== id); limitNotice.value = ''; return; }
   if (selected.value.length >= 200) { limitNotice.value = 'Ya seleccionaste 200 tiendas. Retira una para agregar otra.'; return; }
   const row = rows.value.find(item => item.IDCLIENTE === id);
   if (row) selected.value = [...selected.value, row];
}
function togglePage() {
   if (disabledControls.value) return;
   const remaining = rows.value.filter(row => !selectedIds.value.has(row.IDCLIENTE)).length;
   limitNotice.value = !allSelected.value && remaining > 200 - selected.value.length ? 'Se agregaron las tiendas disponibles hasta el límite de 200.' : '';
   selected.value = selectStorePage(selected.value, rows.value, !allSelected.value);
}
watch(management, async () => {
   const request = ++filterRequest; ++searchRequest;
   leadership.value = ''; leaderships.value = []; rows.value = []; total.value = 0; loading.value = false; filtersLoading.value = true; error.value = '';
   try {
      const result = management.value ? await technicalStudyApi.getLeaderships([management.value]) : [];
      if (request !== filterRequest) return;
      leaderships.value = result; await search(1);
   } catch { if (request === filterRequest) error.value = 'No se pudieron cargar las jefaturas. Vuelve a seleccionar la gerencia.'; }
   finally { if (request === filterRequest) filtersLoading.value = false; }
});
onMounted(async () => {
   filtersLoading.value = true;
   try { managements.value = await technicalStudyApi.getManagements(); await search(1); }
   catch { error.value = 'No se pudieron cargar las gerencias. Vuelve a intentar.'; }
   finally { filtersLoading.value = false; }
});
async function retry() {
   filtersLoading.value = true;
   try { managements.value = await technicalStudyApi.getManagements(); leaderships.value = management.value ? await technicalStudyApi.getLeaderships([management.value]) : []; await search(1); }
   catch { error.value = 'No se pudieron cargar los filtros. Vuelve a intentar.'; }
   finally { filtersLoading.value = false; }
}
</script>
<template>
  <div class="space-y-4">
    <div class="ts-toolbar"><label class="ts-label">Gerencia<select v-model="management" class="ts-input" :disabled="disabledControls"><option value="">Todas</option><option v-for="item in managements" :key="item" :value="item">{{ item }}</option></select></label><label class="ts-label">Jefatura<select v-model="leadership" class="ts-input" :disabled="disabledControls || !management" @change="search(1)"><option value="">Todas</option><option v-for="item in leaderships" :key="item" :value="item">{{ item }}</option></select></label><label class="ts-label ts-search">Buscar tienda o ID<input v-model="searchTerm" class="ts-input" placeholder="Nombre, cadena o ID" :disabled="disabledControls" @keydown.enter.prevent="search(1)"></label><StdButton class="ts-button-secondary" :disabled="disabledControls" icon="fa-solid fa-magnifying-glass" @click="search(1)">Buscar</StdButton></div>
    <TechnicalNotice v-if="error" tone="danger" title="Tiendas no disponibles" :description="error" />
    <StdButton v-if="error" class="ts-button-secondary" :disabled="disabledControls" @click="retry">Volver a intentar</StdButton>
    <div class="ts-actions"><label class="flex min-h-11 items-center gap-3 text-sm font-semibold"><input class="ts-check" type="checkbox" :checked="allSelected" :indeterminate="someSelected && !allSelected" :disabled="disabledControls || !rows.length" @change="togglePage">Seleccionar esta página ({{ rows.length }})</label><p class="ts-count tabular-nums" aria-live="polite">{{ selected.length }} / 200 tiendas seleccionadas</p></div>
    <p v-if="limitNotice" class="text-sm text-pic-warning" role="status">{{ limitNotice }}</p>
    <TechnicalTable :columns="columns" :rows="tableRows" :selected-keys="[...selectedIds]" :loading="loading || filtersLoading" empty-title="Sin tiendas" empty-description="Cambia los filtros o la búsqueda para encontrar tiendas.">
      <template #cell-select="{ row }"><label class="flex min-h-11 items-center justify-center"><input type="checkbox" class="ts-check" :checked="selectedIds.has(String(row.id))" :disabled="disabled" :aria-label="`Seleccionar ${row.name}`" @change="toggle(String(row.id))"></label></template>
      <template #cell-name="{ row }"><p class="ts-name" :class="selectedIds.has(String(row.id)) ? 'text-pic-brand' : ''">{{ row.name }}</p><p v-if="invalidStoreIds.includes(String(row.id))" class="ts-error">Tienda no válida o sin jefe elegible</p></template>
      <template #cell-id="{ row }"><span class="ts-code">{{ row.id }}</span></template>
      <template #mobile="{ row }"><label class="flex items-start gap-3"><input type="checkbox" class="ts-check mt-1 shrink-0" :checked="selectedIds.has(String(row.id))" :disabled="disabled" @change="toggle(String(row.id))"><span class="min-w-0 flex-1"><span class="ts-name block" :class="selectedIds.has(String(row.id)) ? 'text-pic-brand' : ''">{{ row.name }}</span><span class="ts-code mt-1 block">{{ row.id }}</span><span class="ts-muted mt-1 block">{{ row.chain }}</span><span v-if="invalidStoreIds.includes(String(row.id))" class="ts-error block">Tienda no válida o sin jefe elegible</span></span></label></template>
    </TechnicalTable>
    <TechnicalPagination v-if="!error" :page="page" :total="total" :limit="pageSize" :busy="disabledControls" @change="search" />
    <div v-if="selected.length" class="ts-selection-summary ts-divider">
      <button type="button" class="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-pic-brand" :aria-expanded="selectionOpen || invalidStoreIds.length > 0" aria-controls="selected-stores" @click="selectionOpen = !selectionOpen"><span>Revisar selección · {{ selected.length }} tiendas</span><i class="fa-solid" :class="selectionOpen || invalidStoreIds.length ? 'fa-chevron-up' : 'fa-chevron-down'" aria-hidden="true"></i></button>
      <ul v-if="selectionOpen || invalidStoreIds.length" id="selected-stores" class="mt-3 max-h-80 overflow-y-auto">
        <li v-for="item in selected" :key="item.IDCLIENTE" class="flex items-start justify-between gap-3 border-b border-pic-border py-3"><div class="min-w-0"><p class="ts-name">{{ item.NOM_CLIENTE }}</p><p class="ts-code mt-1">{{ item.IDCLIENTE }}</p><p v-if="invalidStoreIds.includes(item.IDCLIENTE)" class="ts-error">Tienda no válida o sin jefe elegible</p></div><StdButton class="ts-button-secondary" size="sm" :disabled="disabled" :aria-label="`Retirar ${item.NOM_CLIENTE}`" @click="toggle(item.IDCLIENTE)">Retirar</StdButton></li>
      </ul>
    </div>
  </div>
</template>
