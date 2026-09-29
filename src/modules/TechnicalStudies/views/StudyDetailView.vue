<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import { useTechnicalStudyStore } from '../stores/technicalStudyStore';
import StdAlert from '@/modules/Shared/components/std/StdAlert.vue';
import StdButton from '@/modules/Shared/components/std/StdButton.vue';
import StdDataTable from '@/modules/Shared/components/std/StdDataTable.vue';
import StdPageHeader from '@/modules/Shared/components/std/StdPageHeader.vue';
import StdSection from '@/modules/Shared/components/std/StdSection.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const store = useTechnicalStudyStore();
const id = computed(() => Number(route.params.id));
const isSuperAdmin = computed(() => auth.user?.role === 'SuperAdmin');
const tableActions = computed<('view' | 'delete')[]>(() => isSuperAdmin.value ? ['view', 'delete'] : ['view']);
const deadlineDate = ref('');
const extending = ref(false);
const managing = ref(false);
const notice = ref('');
const error = ref('');
const forms = computed(() => store.selectedStudy?.id === id.value ? store.selectedStudy.forms : []);
const submittedCount = computed(() => forms.value.filter(form => form.status === 'SUBMITTED').length);
const rows = computed(() => forms.value.map(form => ({
   id: form.id, storeName: form.storeName, clientId: form.clientId, chain: form.chain || '—',
   status: form.status === 'SUBMITTED' ? 'Enviada' : form.status === 'EXPIRED' ? 'Vencida' : form.status === 'PAUSED' ? 'Pausada' : 'Pendiente',
   elaborator: form.elaboratorName || '—',
})));
const columns = [
   { key: 'storeName', label: 'Tienda' }, { key: 'clientId', label: 'ID' },
   { key: 'chain', label: 'Cadena' }, { key: 'status', label: 'Estado' },
   { key: 'elaborator', label: 'Elaboró' },
];
async function extend() {
   if (!deadlineDate.value) return;
   extending.value = true;
   notice.value = '';
   error.value = '';
   try {
      const result = await store.extend(id.value, deadlineDate.value);
      notice.value = `Plazo actualizado. Fichas reactivadas: ${result?.reactivatedForms ?? 0}.`;
      deadlineDate.value = '';
   } catch {
      error.value = store.error || 'No fue posible ampliar el plazo.';
   } finally {
      extending.value = false;
   }
}

async function changeStatus() {
   const status = store.selectedStudy?.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED';
   managing.value = true;
   notice.value = '';
   error.value = '';
   try {
      await store.changeStatus(id.value, status);
      notice.value = status === 'PAUSED' ? 'Estudio pausado. Las fichas pendientes no admiten envíos.' : 'Estudio reanudado.';
   } catch { error.value = store.error || 'No se pudo cambiar el estado.'; }
   finally { managing.value = false; }
}

async function deleteForm(formId: number, storeName: string) {
   if (!window.confirm(`¿Eliminar definitivamente la ficha de ${storeName} y sus datos?`)) return;
   managing.value = true;
   notice.value = '';
   error.value = '';
   try {
      await store.removeForm(id.value, formId);
      notice.value = 'Ficha eliminada.';
   } catch { error.value = store.error || 'No se pudo eliminar la ficha.'; }
   finally { managing.value = false; }
}

async function deleteStudy() {
   if (submittedCount.value > 0 || !window.confirm('¿Eliminar definitivamente el estudio y todas sus fichas pendientes?')) return;
   managing.value = true;
   error.value = '';
   try {
      await store.removeStudy(id.value);
      await router.push('/admin/technical-studies');
   } catch { error.value = store.error || 'No se pudo eliminar el estudio.'; }
   finally { managing.value = false; }
}

function handleFormAction(action: 'view' | 'edit' | 'delete', row: Record<string, unknown>) {
   if (action === 'delete') void deleteForm(Number(row.id), String(row.storeName));
   else void router.push(`/admin/technical-forms/${id.value}/${row.id}`);
}

watch(id, async () => {
   notice.value = '';
   error.value = '';
   try { await store.loadStudy(id.value); } catch { /* El store presenta el error. */ }
}, { immediate: true });
</script>

<template>
  <div class="space-y-5">
    <StdPageHeader eyebrow="Fichas técnicas · administración" :title="store.selectedStudy?.id === id ? store.selectedStudy.name : 'Estudio'" description="Seguimiento por tienda y elaborador." icon="fa-solid fa-clipboard-check">
      <template #actions><StdButton @click="router.push('/admin/technical-studies')">Volver a estudios</StdButton></template>
    </StdPageHeader>
    <StdAlert v-if="store.error || error" tone="danger" title="No se pudo completar la operación" :description="error || store.error || ''" />
    <StdAlert v-if="notice" tone="success" title="Estudio actualizado" :description="notice" />
    <StdSection v-if="store.selectedStudy?.id === id" title="Plazo y avance" icon="fa-solid fa-calendar-check">
      <div class="flex flex-wrap items-end gap-4">
        <p class="mr-auto text-sm font-semibold text-slate-700">Límite actual: <strong>{{ new Date(new Date(store.selectedStudy.deadlineAt).getTime() - 1000).toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' }) }}</strong><br>{{ submittedCount }} de {{ forms.length }} fichas enviadas · {{ store.selectedStudy.status === 'PAUSED' ? 'Pausado' : 'Activo' }}</p>
        <label class="text-xs font-bold text-slate-600">Nueva fecha límite
          <input v-model="deadlineDate" type="date" class="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm">
        </label>
        <StdButton variant="primary" :disabled="!deadlineDate || extending" @click="extend">Ampliar plazo</StdButton>
      </div>
      <div v-if="isSuperAdmin" class="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
        <StdButton :disabled="managing" @click="changeStatus">{{ store.selectedStudy.status === 'PAUSED' ? 'Reanudar estudio' : 'Pausar estudio' }}</StdButton>
        <StdButton variant="danger" :disabled="managing || submittedCount > 0" @click="deleteStudy">Eliminar estudio</StdButton>
        <p v-if="submittedCount > 0" class="text-xs font-semibold text-slate-600">Elimina individualmente las {{ submittedCount }} fichas enviadas antes de eliminar el estudio.</p>
      </div>
    </StdSection>
    <StdDataTable :columns="columns" :rows="rows" :loading="store.loading" :actions="tableActions" empty-title="Sin fichas" @row-action="handleFormAction" />
  </div>
</template>
