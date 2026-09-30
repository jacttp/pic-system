<script setup lang="ts">
import { computed } from 'vue';
import StdButton from '@/modules/Shared/components/std/StdButton.vue';
import TechnicalTable from './TechnicalTable.vue';
import TechnicalStatus from './TechnicalStatus.vue';
import type { StudySummary } from '../types/technicalStudy.types';
import { formatDeadline, progress } from '../utils/technicalStudyUi';
const props = withDefaults(defineProps<{ studies: StudySummary[]; loading?: boolean; actionLabel?: string; emptyDescription?: string }>(), { actionLabel: 'Ver seguimiento', emptyDescription: 'Publica un estudio para comenzar.' });
defineEmits<{ open: [id: number] }>();
const columns = [ { key: 'name', label: 'Estudio' }, { key: 'deadline', label: 'Fecha límite' }, { key: 'advance', label: 'Avance' }, { key: 'pending', label: 'Pendientes', align: 'right' as const }, { key: 'expired', label: 'Vencidas', align: 'right' as const }, { key: 'status', label: 'Estado' }, { key: 'action', label: 'Acción' } ];
const rows = computed(() => props.studies.map(item => ({ id: item.id, name: item.name, deadline: formatDeadline(item.deadlineAt), status: item.status, pending: item.pendingForms, expired: item.expiredForms, submitted: item.submittedForms, total: item.totalForms, percentage: progress(item.submittedForms, item.totalForms) })));
</script>
<template>
  <TechnicalTable :columns="columns" :rows="rows" :loading="loading" empty-title="Sin estudios" :empty-description="emptyDescription">
    <template #cell-name="{ row }"><span class="ts-name">{{ row.name }}</span></template>
    <template #cell-status="{ row }"><TechnicalStatus :status="String(row.status)" study /></template>
    <template #cell-advance="{ row }"><div class="min-w-[110px]"><div class="mb-2 flex justify-between gap-3 text-sm tabular-nums"><span>{{ row.submitted }} / {{ row.total }}</span><span class="text-pic-text-muted">{{ row.percentage }}%</span></div><div class="ts-progress" :aria-label="`${row.submitted} de ${row.total} fichas enviadas`"><span :style="{ width: `${row.percentage}%` }"></span></div></div></template>
    <template #cell-action="{ row }"><StdButton class="ts-button-secondary" size="sm" @click="$emit('open', Number(row.id))">{{ actionLabel }}</StdButton></template>
    <template #mobile="{ row }"><div class="ts-actions"><h2 class="ts-name min-w-0 flex-1">{{ row.name }}</h2><TechnicalStatus :status="String(row.status)" study /></div><p class="ts-muted mt-2">Límite: {{ row.deadline }}</p><div class="mt-3 flex justify-between gap-3 text-sm tabular-nums"><span>{{ row.submitted }} / {{ row.total }} enviadas</span><span>{{ row.percentage }}%</span></div><div class="ts-progress mt-2"><span :style="{ width: `${row.percentage}%` }"></span></div><div class="ts-actions mt-4"><p class="ts-muted">{{ row.pending }} pendientes · {{ row.expired }} vencidas</p><StdButton class="ts-button-secondary" @click="$emit('open', Number(row.id))">{{ actionLabel }}</StdButton></div></template>
  </TechnicalTable>
</template>
