<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/modules/Auth/views/stores/authStore';
import StdButton from '@/modules/Shared/components/std/StdButton.vue';
import StdPageHeader from '@/modules/Shared/components/std/StdPageHeader.vue';
import StdSection from '@/modules/Shared/components/std/StdSection.vue';
import ModalDialog from '@/modules/Shared/components/ModalDialog.vue';
import TechnicalPage from '../components/TechnicalPage.vue';
import TechnicalNotice from '../components/TechnicalNotice.vue';
import TechnicalStatus from '../components/TechnicalStatus.vue';
import FormResults from '../components/FormResults.vue';
import { useTechnicalStudyStore } from '../stores/technicalStudyStore';
import { errorMessage, formatDeadline, localDate, progress, validDeadline } from '../utils/technicalStudyUi';
const route = useRoute(); const router = useRouter(); const auth = useAuthStore(); const store = useTechnicalStudyStore();
const id = computed(() => Number(route.params.id));
const study = computed(() => store.selectedStudy?.id === id.value ? store.selectedStudy : null);
const isSuperAdmin = computed(() => auth.user?.role === 'SuperAdmin');
const forms = computed(() => study.value?.forms || []);
const submitted = computed(() => forms.value.filter(form => form.status === 'SUBMITTED').length);
const pending = computed(() => forms.value.filter(form => form.status === 'PENDING').length);
const expired = computed(() => forms.value.filter(form => form.status === 'EXPIRED').length);
const deadlineDate = ref(''); const extending = ref(false); const managing = ref(false);
const busy = computed(() => extending.value || managing.value);
const dateError = ref(''); const notice = ref(''); const error = ref('');
const deletion = ref<{ kind: 'study' | 'form'; id: number; name: string } | null>(null);
async function load() {
   notice.value = ''; error.value = ''; dateError.value = ''; deadlineDate.value = ''; deletion.value = null;
   try { await store.loadStudy(id.value); }
   catch (reason) { error.value = errorMessage(reason, 'No se pudo cargar el estudio.'); }
}
async function extend() {
   if (busy.value || !study.value) return;
   if (!validDeadline(deadlineDate.value, study.value.deadlineAt)) { dateError.value = 'Elige una fecha vigente y posterior al límite actual.'; return; }
   extending.value = true; error.value = ''; dateError.value = ''; notice.value = '';
   try {
      const result = await store.extend(id.value, deadlineDate.value);
      notice.value = `Plazo actualizado. Fichas reactivadas: ${result?.reactivatedForms ?? 0}.`;
      deadlineDate.value = '';
   } catch (reason) { error.value = errorMessage(reason, 'No se pudo ampliar el plazo.'); }
   finally { extending.value = false; }
}
async function changeStatus() {
   if (busy.value || !study.value || !isSuperAdmin.value) return;
   const status = study.value.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED';
   managing.value = true; error.value = ''; notice.value = '';
   try { await store.changeStatus(id.value, status); notice.value = status === 'PAUSED' ? 'Estudio pausado. Las fichas pendientes no admiten envíos.' : 'Estudio reanudado.'; }
   catch (reason) { error.value = errorMessage(reason, 'No se pudo cambiar el estado.'); }
   finally { managing.value = false; }
}
function requestDelete(formId?: number, name?: string) {
   if (busy.value || !isSuperAdmin.value || !study.value) return;
   if (formId) deletion.value = { kind: 'form', id: formId, name: name || 'tienda' };
   else if (!submitted.value) deletion.value = { kind: 'study', id: id.value, name: study.value.name };
}
function closeDelete() { if (!busy.value) deletion.value = null; }
async function confirmDelete() {
   const target = deletion.value;
   if (!target || busy.value || !isSuperAdmin.value || (target.kind === 'study' && submitted.value)) return;
   managing.value = true; error.value = ''; notice.value = '';
   try {
      if (target.kind === 'form') { await store.removeForm(id.value, target.id); notice.value = 'Ficha eliminada.'; }
      else { await store.removeStudy(target.id); managing.value = false; await router.push('/admin/technical-studies'); }
      deletion.value = null;
   } catch (reason) { error.value = errorMessage(reason, 'No se pudo eliminar.'); deletion.value = null; }
   finally { managing.value = false; }
}
function openForm(formId: number) { void router.push({ path: `/admin/technical-forms/${id.value}/${formId}` }); }
onBeforeRouteLeave(() => !busy.value); onBeforeRouteUpdate(() => !busy.value);
watch(id, load, { immediate: true });
</script>
<template>
  <TechnicalPage class="ts-study-admin">
    <StdPageHeader class="ts-header" eyebrow="Fichas técnicas · seguimiento" :title="study?.name || 'Estudio'" description="Consulta el avance y las respuestas por tienda." icon="fa-solid fa-clipboard-check"><template #actions><StdButton class="ts-button-secondary" :disabled="busy" @click="router.push('/admin/technical-studies')">Volver a estudios</StdButton></template></StdPageHeader>
    <TechnicalNotice v-if="error" tone="danger" title="No se pudo completar la operación" :description="error" />
    <TechnicalNotice v-if="notice" tone="success" title="Estudio actualizado" :description="notice" />
    <div v-if="store.loadingStudy" class="ts-empty" role="status">Cargando seguimiento…</div>
    <template v-else-if="study">
      <StdSection class="ts-section" title="Plazo y avance">
        <div class="ts-actions"><div><p class="ts-muted">Fecha límite · Ciudad de México</p><div class="mt-2 flex flex-wrap items-center gap-3"><strong class="text-2xl font-semibold tabular-nums">{{ formatDeadline(study.deadlineAt) }}</strong><TechnicalStatus :status="study.status" study /></div></div><div class="min-w-[200px] flex-1 sm:max-w-sm"><p class="mb-2 flex justify-between text-sm"><span>{{ submitted }} de {{ forms.length }} fichas enviadas</span><strong>{{ progress(submitted, forms.length) }}%</strong></p><div class="ts-progress"><span :style="{ width: `${progress(submitted, forms.length)}%` }"></span></div></div></div>
        <dl class="ts-summary ts-divider"><div class="ts-tone-info"><dt>Tiendas</dt><dd>{{ forms.length }}</dd></div><div class="ts-tone-success"><dt>Enviadas</dt><dd>{{ submitted }}</dd></div><div class="ts-tone-info"><dt>Pendientes</dt><dd>{{ pending }}</dd></div><div class="ts-tone-warning"><dt>Vencidas</dt><dd>{{ expired }}</dd></div></dl>
        <form class="ts-toolbar ts-divider" @submit.prevent="extend"><label class="ts-label" for="new-deadline">Nueva fecha límite<input id="new-deadline" v-model="deadlineDate" class="ts-input sm:max-w-xs" type="date" :min="localDate()" :disabled="busy" :aria-invalid="!!dateError" aria-describedby="deadline-error"><span id="deadline-error" class="ts-error block">{{ dateError }}</span></label><StdButton class="ts-button-secondary" type="submit" :disabled="busy || !deadlineDate">{{ extending ? 'Ampliando…' : 'Ampliar plazo' }}</StdButton></form>
        <div v-if="isSuperAdmin" class="ts-divider ts-actions"><div><StdButton class="ts-button-secondary" :disabled="busy" @click="changeStatus">{{ managing ? 'Actualizando…' : study.status === 'PAUSED' ? 'Reanudar estudio' : 'Pausar estudio' }}</StdButton><p class="ts-muted mt-2">Controla temporalmente la recepción de respuestas.</p></div><div class="sm:text-right"><StdButton variant="danger" :disabled="busy || submitted > 0" @click="requestDelete()">Eliminar estudio</StdButton><p v-if="submitted" class="ts-muted mt-2 max-w-sm">Para eliminar el estudio, elimina primero sus {{ submitted }} fichas enviadas.</p></div></div>
      </StdSection>
      <section><h2 class="ts-section-heading mb-4">Tiendas del estudio</h2><FormResults :key="id" :forms="forms" :can-delete="isSuperAdmin" :busy="busy" @open="openForm" @remove="requestDelete" /></section>
    </template>
    <StdButton v-else class="ts-button-secondary" @click="load">Volver a intentar</StdButton>
    <ModalDialog :model-value="!!deletion" :title="deletion?.kind === 'study' ? 'Eliminar estudio' : 'Eliminar ficha'" @update:model-value="closeDelete">
      <p class="ts-dialog-content">Se eliminará definitivamente <strong>{{ deletion?.name }}</strong>{{ deletion?.kind === 'study' ? ' y todas sus fichas pendientes.' : ' y todos los datos de su ficha.' }} Esta acción no se puede deshacer.</p>
      <template #footer><StdButton variant="danger" :disabled="busy" @click="confirmDelete">{{ managing ? 'Eliminando…' : 'Eliminar definitivamente' }}</StdButton><StdButton class="mr-2" :disabled="busy" @click="closeDelete">Cancelar</StdButton></template>
    </ModalDialog>
  </TechnicalPage>
</template>
