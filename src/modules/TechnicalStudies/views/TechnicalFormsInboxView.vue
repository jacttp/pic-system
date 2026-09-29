<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import { useTechnicalStudyStore } from '../stores/technicalStudyStore';
import StdAlert from '@/modules/Shared/components/std/StdAlert.vue';
import StdButton from '@/modules/Shared/components/std/StdButton.vue';
import StdDataTable from '@/modules/Shared/components/std/StdDataTable.vue';
import StdPageHeader from '@/modules/Shared/components/std/StdPageHeader.vue';

const router = useRouter();
const auth = useAuthStore();
const store = useTechnicalStudyStore();
const search = ref('');
const page = ref(1);
const activeStudyId = ref<number | null>(null);
const error = ref('');
const studyRows = computed(() => store.studies.data.map(item => ({
   id: item.id, name: item.name,
   status: item.status === 'PAUSED' ? 'Pausado' : 'Activo',
   deadline: new Date(new Date(item.deadlineAt).getTime() - 1000).toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' }),
   pending: item.pendingForms, submitted: item.submittedForms, expired: item.expiredForms,
})));
const formRows = computed(() => store.selectedStudy?.id === activeStudyId.value
   ? store.selectedStudy.forms.map(form => ({
      id: form.id, storeName: form.storeName, clientId: form.clientId,
      status: form.status === 'SUBMITTED' ? 'Enviada' : form.status === 'EXPIRED' ? 'Vencida' : form.status === 'PAUSED' ? 'Pausada' : 'Pendiente',
      elaborator: form.elaboratorName || '—',
   })) : []);
const studyColumns = [
   { key: 'name', label: 'Estudio' }, { key: 'deadline', label: 'Límite' },
   { key: 'status', label: 'Estado' },
   { key: 'pending', label: 'Pendientes' }, { key: 'submitted', label: 'Enviadas' }, { key: 'expired', label: 'Vencidas' },
];
const formColumns = [
   { key: 'storeName', label: 'Tienda' }, { key: 'clientId', label: 'ID' },
   { key: 'status', label: 'Estado' }, { key: 'elaborator', label: 'Elaboró' },
];
async function load() {
   error.value = '';
   try {
      await store.list({ page: page.value, limit: 20, search: search.value.trim() });
      if (activeStudyId.value && !store.studies.data.some(item => item.id === activeStudyId.value)) activeStudyId.value = null;
   } catch { error.value = store.error || 'No se pudo cargar la bandeja.'; }
}
async function openStudy(id: number) {
   activeStudyId.value = id;
   error.value = '';
   try { await store.loadStudy(id); } catch { error.value = store.error || 'No se pudieron cargar las fichas.'; }
}
onMounted(load);
</script>

<template>
  <div class="space-y-5">
    <StdPageHeader eyebrow="Fichas técnicas · estructura comercial" title="Bandeja de fichas" description="Fichas accesibles según tu asignación como jefe, gerente o superadmin. El primer envío válido cierra la ficha." icon="fa-solid fa-inbox">
      <template #actions><StdButton v-if="auth.isAdmin" @click="router.push('/admin/technical-studies')">Administrar estudios</StdButton></template>
    </StdPageHeader>
    <StdAlert v-if="error" tone="danger" title="Bandeja no disponible" :description="error" />
    <div class="flex gap-2 rounded-xl border border-slate-200 bg-white p-3">
      <input v-model="search" class="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Buscar estudio" @keydown.enter.prevent="page = 1; load()">
      <StdButton @click="page = 1; load()">Buscar</StdButton>
    </div>
    <StdDataTable :columns="studyColumns" :rows="studyRows" :loading="store.loading && !activeStudyId" :actions="['view']" empty-title="Sin estudios accesibles" empty-description="Aquí aparecerán los estudios con tiendas de tu estructura comercial." @row-action="(_action, row) => openStudy(Number(row.id))" />
    <div class="flex items-center justify-between text-xs font-semibold text-slate-500">
      <span>{{ store.studies.total }} estudios · página {{ page }}</span>
      <div class="flex gap-2"><StdButton size="sm" :disabled="page <= 1" @click="page--; load()">Anterior</StdButton><StdButton size="sm" :disabled="page * 20 >= store.studies.total" @click="page++; load()">Siguiente</StdButton></div>
    </div>
    <section v-if="activeStudyId" class="space-y-3">
      <h2 class="text-base font-black text-slate-900">{{ store.selectedStudy?.id === activeStudyId ? store.selectedStudy.name : 'Fichas del estudio' }}</h2>
      <StdDataTable :columns="formColumns" :rows="formRows" :loading="store.loading" :actions="['view']" empty-title="Sin fichas accesibles" @row-action="(_action, row) => router.push(`/admin/technical-forms/${activeStudyId}/${row.id}`)" />
    </section>
  </div>
</template>
