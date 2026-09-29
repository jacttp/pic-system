<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTechnicalStudyStore } from '../stores/technicalStudyStore';
import StdAlert from '@/modules/Shared/components/std/StdAlert.vue';
import StdButton from '@/modules/Shared/components/std/StdButton.vue';
import StdDataTable from '@/modules/Shared/components/std/StdDataTable.vue';
import StdPageHeader from '@/modules/Shared/components/std/StdPageHeader.vue';
import StdSection from '@/modules/Shared/components/std/StdSection.vue';

const route = useRoute();
const router = useRouter();
const store = useTechnicalStudyStore();
const id = Number(route.params.id);
const deadlineDate = ref('');
const extending = ref(false);
const notice = ref('');
const error = ref('');
const forms = computed(() => store.selectedStudy?.id === id ? store.selectedStudy.forms : []);
const rows = computed(() => forms.value.map(form => ({
   id: form.id, storeName: form.storeName, clientId: form.clientId, chain: form.chain || '—',
   status: form.status === 'SUBMITTED' ? 'Enviada' : form.status === 'EXPIRED' ? 'Vencida' : 'Pendiente',
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
      const result = await store.extend(id, deadlineDate.value);
      notice.value = `Plazo actualizado. Fichas reactivadas: ${result?.reactivatedForms ?? 0}.`;
      deadlineDate.value = '';
   } catch {
      error.value = store.error || 'No fue posible ampliar el plazo.';
   } finally {
      extending.value = false;
   }
}
onMounted(async () => { try { await store.loadStudy(id); } catch { /* El store presenta el error. */ } });
</script>

<template>
  <div class="space-y-5">
    <StdPageHeader eyebrow="Fichas técnicas · administración" :title="store.selectedStudy?.id === id ? store.selectedStudy.name : 'Estudio'" description="Seguimiento por tienda y elaborador." icon="fa-solid fa-clipboard-check">
      <template #actions><StdButton @click="router.push('/admin/technical-studies')">Volver a estudios</StdButton></template>
    </StdPageHeader>
    <StdAlert v-if="store.error || error" tone="danger" title="No se pudo completar la operación" :description="error || store.error || ''" />
    <StdAlert v-if="notice" tone="success" title="Plazo actualizado" :description="notice" />
    <StdSection v-if="store.selectedStudy?.id === id" title="Plazo y avance" icon="fa-solid fa-calendar-check">
      <div class="flex flex-wrap items-end gap-4">
        <p class="mr-auto text-sm font-semibold text-slate-700">Límite actual: <strong>{{ new Date(new Date(store.selectedStudy.deadlineAt).getTime() - 1000).toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' }) }}</strong><br>{{ forms.filter(f => f.status === 'SUBMITTED').length }} de {{ forms.length }} fichas enviadas</p>
        <label class="text-xs font-bold text-slate-600">Nueva fecha límite
          <input v-model="deadlineDate" type="date" class="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm">
        </label>
        <StdButton variant="primary" :disabled="!deadlineDate || extending" @click="extend">Ampliar plazo</StdButton>
      </div>
    </StdSection>
    <StdDataTable :columns="columns" :rows="rows" :loading="store.loading" :actions="['view']" empty-title="Sin fichas" @row-action="(_action, row) => router.push(`/admin/technical-forms/${id}/${row.id}`)" />
  </div>
</template>
