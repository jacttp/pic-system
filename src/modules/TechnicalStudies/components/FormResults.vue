<script setup lang="ts">
import { computed, ref } from 'vue';
import StdButton from '@/modules/Shared/components/std/StdButton.vue';
import TechnicalTable from './TechnicalTable.vue';
import TechnicalStatus from './TechnicalStatus.vue';
import type { FormSummary } from '../types/technicalStudy.types';
import { formStatuses } from '../utils/technicalStudyUi';
const props = defineProps<{ forms: FormSummary[]; loading?: boolean; canDelete?: boolean; busy?: boolean }>();
defineEmits<{ open: [id: number]; remove: [id: number, storeName: string] }>();
const search = ref(''); const status = ref(''); const chain = ref('');
const chains = computed(() => [...new Set(props.forms.map(form => form.chain || 'Sin cadena'))].sort((a, b) => a.localeCompare(b, 'es-MX')));
const columns = [{ key: 'storeName', label: 'Tienda' }, { key: 'chain', label: 'Cadena' }, { key: 'status', label: 'Estado' }, { key: 'elaborator', label: 'Elaboró' }, { key: 'action', label: 'Acción' }];
const rows = computed(() => props.forms.filter(form => {
   const text = search.value.trim().toLocaleLowerCase('es-MX');
   return (!status.value || status.value === form.status) && (!chain.value || chain.value === (form.chain || 'Sin cadena')) && (!text || [form.storeName, form.clientId, form.chain].filter(Boolean).join(' ').toLocaleLowerCase('es-MX').includes(text));
}).map(form => ({ id: form.id, storeName: form.storeName, clientId: form.clientId, chain: form.chain || 'Sin cadena', status: form.status, elaborator: form.elaboratorName || '—' })));
</script>
<template>
  <div>
    <div class="ts-toolbar mb-5"><label class="ts-label ts-search">Buscar ficha<input v-model="search" class="ts-input" placeholder="Tienda, ID o cadena" type="search"></label><label class="ts-label">Estado<select v-model="status" class="ts-input"><option value="">Todos</option><option v-for="item in formStatuses" :key="item.value" :value="item.value">{{ item.label }}</option></select></label><label class="ts-label">Cadena<select v-model="chain" class="ts-input"><option value="">Todas</option><option v-for="item in chains" :key="item" :value="item">{{ item }}</option></select></label></div>
    <p class="ts-count mb-3" aria-live="polite">{{ rows.length }} de {{ forms.length }} fichas de este estudio</p>
    <TechnicalTable :columns="columns" :rows="rows" :loading="loading" empty-title="Sin fichas para esta selección" empty-description="Cambia la búsqueda o los filtros para consultar otras fichas del estudio.">
      <template #cell-storeName="{ row }"><p class="ts-name">{{ row.storeName }}</p><p class="ts-code mt-1">{{ row.clientId }}</p></template>
      <template #cell-status="{ row }"><TechnicalStatus :status="String(row.status)" /></template>
      <template #cell-action="{ row }"><div class="flex justify-end gap-2"><StdButton class="ts-button-secondary ts-button-action" size="sm" :disabled="busy" @click="$emit('open', Number(row.id))">{{ row.status === 'PENDING' ? 'Abrir ficha' : 'Ver ficha' }}</StdButton><StdButton v-if="canDelete" variant="danger" size="sm" :disabled="busy" :aria-label="`Eliminar ficha de ${row.storeName}`" @click="$emit('remove', Number(row.id), String(row.storeName))">Eliminar</StdButton></div></template>
      <template #mobile="{ row }"><div class="flex items-start justify-between gap-3"><div class="min-w-0"><h3 class="ts-name">{{ row.storeName }}</h3><p class="ts-code mt-1">{{ row.clientId }}</p></div><TechnicalStatus :status="String(row.status)" /></div><dl class="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt class="ts-muted">Cadena</dt><dd>{{ row.chain }}</dd></div><div><dt class="ts-muted">Elaboró</dt><dd>{{ row.elaborator }}</dd></div></dl><div class="mt-4 flex flex-wrap justify-end gap-2"><StdButton v-if="canDelete" variant="danger" :disabled="busy" @click="$emit('remove', Number(row.id), String(row.storeName))">Eliminar</StdButton><StdButton class="ts-button-secondary ts-button-action" :disabled="busy" @click="$emit('open', Number(row.id))">{{ row.status === 'PENDING' ? 'Abrir ficha' : 'Ver ficha' }}</StdButton></div></template>
    </TechnicalTable>
  </div>
</template>
