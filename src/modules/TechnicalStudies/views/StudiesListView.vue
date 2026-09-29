<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useTechnicalStudyStore } from '../stores/technicalStudyStore';
import StdAlert from '@/modules/Shared/components/std/StdAlert.vue';
import StdButton from '@/modules/Shared/components/std/StdButton.vue';
import StdDataTable from '@/modules/Shared/components/std/StdDataTable.vue';
import StdPageHeader from '@/modules/Shared/components/std/StdPageHeader.vue';

const router = useRouter();
const store = useTechnicalStudyStore();
const search = ref('');
const page = ref(1);
const columns = [
   { key: 'name', label: 'Estudio' }, { key: 'deadline', label: 'Límite' },
   { key: 'status', label: 'Estado' },
   { key: 'total', label: 'Tiendas' }, { key: 'submitted', label: 'Enviadas' },
   { key: 'pending', label: 'Pendientes' }, { key: 'expired', label: 'Vencidas' },
];
const rows = computed(() => store.studies.data.map(item => ({
   id: item.id,
   name: item.name,
   status: item.status === 'PAUSED' ? 'Pausado' : 'Activo',
   deadline: new Date(new Date(item.deadlineAt).getTime() - 1000).toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' }),
   total: item.totalForms,
   submitted: item.submittedForms,
   pending: item.pendingForms,
   expired: item.expiredForms,
})));
async function load() {
   try { await store.list({ page: page.value, limit: 20, search: search.value.trim() }); } catch { /* El store presenta el error. */ }
}
onMounted(load);
</script>

<template>
  <div class="space-y-5">
    <StdPageHeader eyebrow="Fichas técnicas · administración" title="Estudios" description="Publica estudios y da seguimiento a cada tienda." icon="fa-solid fa-clipboard-list">
      <template #actions>
        <StdButton variant="secondary" @click="router.push('/admin/technical-forms')">Bandeja de fichas</StdButton>
        <StdButton variant="primary" icon="fa-solid fa-plus" @click="router.push('/admin/technical-studies/new')">Crear estudio</StdButton>
      </template>
    </StdPageHeader>
    <StdAlert v-if="store.error" tone="danger" title="No se pudieron cargar los estudios" :description="store.error" />
    <div class="flex gap-2 rounded-xl border border-slate-200 bg-white p-3">
      <input v-model="search" class="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Buscar estudio" @keydown.enter.prevent="page = 1; load()">
      <StdButton @click="page = 1; load()">Buscar</StdButton>
    </div>
    <StdDataTable :columns="columns" :rows="rows" :loading="store.loading" :actions="['view']" empty-title="Sin estudios" empty-description="Publica un estudio para comenzar." @row-action="(_action, row) => router.push(`/admin/technical-studies/${row.id}`)" />
    <div class="flex items-center justify-between text-xs font-semibold text-slate-500">
      <span>{{ store.studies.total }} estudios · página {{ page }}</span>
      <div class="flex gap-2">
        <StdButton size="sm" :disabled="page <= 1" @click="page--; load()">Anterior</StdButton>
        <StdButton size="sm" :disabled="page * 20 >= store.studies.total" @click="page++; load()">Siguiente</StdButton>
      </div>
    </div>
  </div>
</template>
