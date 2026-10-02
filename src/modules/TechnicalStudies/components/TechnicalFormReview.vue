<script setup lang="ts">
import StdButton from '@/modules/Shared/components/std/StdButton.vue';
import TechnicalTable from './TechnicalTable.vue';
import type { FormDraft } from '../types/technicalStudy.ui';
import { sellerTypes } from '../types/technicalStudy.ui';
import type { PersonIdentity } from '../types/technicalStudy.types';
defineProps<{ draft: FormDraft; elaborator: PersonIdentity | null; editable?: boolean; busy?: boolean }>();
defineEmits<{ editResponsible: []; editCompetitor: [key: string]; restoreCompetitor: [key: string] }>();
const columns = [ { key: 'name', label: 'Marca' }, { key: 'kg', label: 'Venta estimada (kg/mes)', align: 'right' as const }, { key: 'type', label: 'Tipo de vendedor' }, { key: 'count', label: 'Cantidad', align: 'right' as const }, { key: 'edit', label: '' } ];
const rows = (draft: FormDraft) => draft.competitors.filter(item => !item.excluded).map(item => ({ id: item.key, name: item.name, kg: item.estimatedMonthlyKgInput || '—', type: sellerTypes.find(type => type.value === item.sellerType)?.label || '—', count: item.sellerCountInput || '—' }));
</script>
<template>
  <div>
    <div class="ts-review-identity ts-actions mb-5"><dl class="grid gap-4 sm:grid-cols-2"><div><dt class="ts-muted">Gerente o encargado de la tienda</dt><dd class="ts-name mt-1">{{ draft.responsableNombre || '—' }}</dd></div><div><dt class="ts-muted">Elaboró</dt><dd class="ts-name mt-1">{{ elaborator?.nombre || '—' }}<span v-if="elaborator?.noEmp" class="ts-code mt-1 block">No. empleado {{ elaborator.noEmp }}</span></dd></div></dl><StdButton v-if="editable" class="ts-button-secondary" :disabled="busy" @click="$emit('editResponsible')">Editar responsable</StdButton></div>
    <TechnicalTable :columns="columns" :rows="rows(draft)" empty-title="Sin información de competidores" empty-description="Esta ficha aún no tiene una respuesta enviada.">
      <template #cell-name="{ row }"><span class="ts-name">{{ row.name }}</span></template>
      <template #cell-edit="{ row }"><StdButton v-if="editable" class="ts-button-secondary" size="sm" :disabled="busy" :aria-label="`Editar ${row.name}`" @click="$emit('editCompetitor', String(row.id))">Editar</StdButton></template>
      <template #mobile="{ row }"><div class="ts-actions"><h3 class="ts-name">{{ row.name }}</h3><StdButton v-if="editable" class="ts-button-secondary" size="sm" :disabled="busy" :aria-label="`Editar ${row.name}`" @click="$emit('editCompetitor', String(row.id))">Editar</StdButton></div><dl class="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt class="ts-muted">Venta estimada</dt><dd>{{ row.kg }} kg/mes</dd></div><div><dt class="ts-muted">Personal</dt><dd>{{ row.type }} · {{ row.count }}</dd></div></dl></template>
    </TechnicalTable>
    <div v-if="editable && draft.competitors.some(item => item.excluded)" class="ts-excluded mt-5">
      <h3 class="font-semibold">No se venden en esta tienda</h3><p class="ts-muted mt-1">Estas marcas no se incluirán en el envío.</p>
      <ul class="mt-2"><li v-for="item in draft.competitors.filter(item => item.excluded)" :key="item.key" class="ts-actions border-b border-pic-border py-2"><span class="ts-name">{{ item.name }}</span><StdButton class="ts-button-secondary" :disabled="busy" :aria-label="`Restaurar ${item.name}`" @click="$emit('restoreCompetitor', item.key)">Restaurar</StdButton></li></ul>
    </div>
  </div>
</template>
