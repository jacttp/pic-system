<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router';
import StdButton from '@/modules/Shared/components/std/StdButton.vue';
import StdPageHeader from '@/modules/Shared/components/std/StdPageHeader.vue';
import StdSection from '@/modules/Shared/components/std/StdSection.vue';
import ModalDialog from '@/modules/Shared/components/ModalDialog.vue';
import TechnicalPage from '../components/TechnicalPage.vue';
import TechnicalNotice from '../components/TechnicalNotice.vue';
import TechnicalStatus from '../components/TechnicalStatus.vue';
import TechnicalFormSteps from '../components/TechnicalFormSteps.vue';
import CompetitorNamesEditor from '../components/CompetitorNamesEditor.vue';
import TechnicalFormFields from '../components/TechnicalFormFields.vue';
import TechnicalFormReview from '../components/TechnicalFormReview.vue';
import { useTechnicalStudyStore } from '../stores/technicalStudyStore';
import { useTechnicalForm } from '../composables/useTechnicalForm';
import { hasCapture, makeDraft } from '../utils/formDraft';
import { errorMessage, formatDeadline, formatInstant } from '../utils/technicalStudyUi';

const route = useRoute(); const router = useRouter(); const store = useTechnicalStudyStore();
const flow = useTechnicalForm();
const { draft, step, reachedStep, active, activeIndex, included, excluded, catalogInitialized, errors, busy, dirty, completedCount, pendingCount, submissionError } = flow;
const studyId = computed(() => Number(route.params.studyId)); const formId = computed(() => Number(route.params.formId));
const form = computed(() => store.selectedForm?.id === formId.value && store.selectedForm.studyId === studyId.value ? store.selectedForm : null);
const error = ref(''); const notice = ref(''); const root = ref<HTMLElement | null>(null);
const excluding = ref<string | null>(null);
const activeCatalogEntry = computed(() => store.competitorCatalog.find(item => item.id === active.value?.competitorId));
const activeDraftIndex = computed(() => draft.value.competitors.findIndex(item => item.key === active.value?.key));
let loadedKey = '';
function syncCatalog() {
   flow.setCatalog(store.competitorCatalog);
   if (form.value?.canSubmit && loadedKey === `${studyId.value}/${formId.value}`) flow.initializeCatalog();
}
watch(() => store.competitorCatalog, syncCatalog, { immediate: true });
const readOnlyDraft = computed(() => makeDraft(form.value ? { responsableNombre: form.value.responsableNombre || '', competitors: form.value.competitors } : undefined));
const titles = ['Responsable en tienda', 'Captura de marcas', 'Revisa antes de enviar'];
const nextLabel = computed(() => step.value === 2 ? activeIndex.value < included.value.length - 1 ? 'Siguiente marca' : 'Revisar ficha' : 'Continuar');
async function focusStep() {
   await nextTick();
   const element = root.value?.querySelector<HTMLElement>('[aria-invalid="true"]') || root.value?.querySelector<HTMLElement>('[data-step-heading]');
   element?.focus(); element?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
}
async function load() {
   error.value = ''; notice.value = '';
   try {
      const result = await store.loadForm(studyId.value, formId.value);
      if (result && result.studyId === studyId.value && result.id === formId.value) {
         const key = `${result.studyId}/${result.id}`;
         // A retry for the same form must not overwrite an unsent in-memory answer.
         if (loadedKey !== key) flow.reset({ responsableNombre: result.responsableNombre || '', competitors: result.competitors });
         if (!result.canSubmit) flow.accept();
         loadedKey = key;
         syncCatalog();
         if (result.canSubmit && !store.competitorCatalog.length && !store.loadingCatalog) void store.loadCatalog();
      }
   } catch (reason) { error.value = errorMessage(reason, 'No se pudo abrir la ficha.'); }
}
async function submit() {
   if (!form.value?.canSubmit || busy.value || step.value !== 3) return;
   error.value = '';
   const sent = await flow.send(answer => store.submit(studyId.value, formId.value, answer), async () => {
      const current = await store.loadForm(studyId.value, formId.value);
      return !!current && !current.canSubmit;
   });
   if (sent) notice.value = 'Ficha enviada. La respuesta quedó registrada y la ficha está cerrada.';
   else await focusStep();
}
async function advance() { if (step.value === 3) await submit(); else { flow.next(); await focusStep(); } }
async function excludeActive() {
   const item = active.value;
   if (!item || busy.value || item.competitorId === 2) return;
   if (hasCapture(item)) excluding.value = item.key;
   else { flow.exclude(item.key); await focusStep(); }
}
async function confirmExclude() {
   if (busy.value || !excluding.value) return;
   flow.exclude(excluding.value); excluding.value = null; await focusStep();
}
async function addOther(name: string) { if (flow.add(name)) await focusStep(); }
async function restore(key: string) { flow.restore(key); await focusStep(); }
function guard() { return flow.mayLeave(() => window.confirm('La captura no se ha enviado. Si sales, perderás estos cambios. ¿Salir de la ficha?')); }
onBeforeRouteLeave(guard);
onBeforeRouteUpdate((to, from) => to.params.studyId === from.params.studyId && to.params.formId === from.params.formId ? true : guard());
function beforeUnload(event: BeforeUnloadEvent) { if (dirty.value || busy.value) { event.preventDefault(); event.returnValue = ''; } }
onMounted(() => window.addEventListener('beforeunload', beforeUnload));
onUnmounted(() => window.removeEventListener('beforeunload', beforeUnload));
watch([studyId, formId], load, { immediate: true });
</script>
<template>
  <TechnicalPage compact>
    <StdPageHeader class="ts-header" eyebrow="Fichas técnicas · tienda" :title="form?.store.name || 'Ficha técnica'" :description="form ? form.studyName : 'Consulta y respuesta de ficha'" icon="fa-solid fa-clipboard">
      <template #actions><StdButton class="ts-button-secondary" :disabled="busy" @click="router.push({ path: '/admin/technical-forms', query: { ...route.query, studyId: String(studyId) } })">Volver a bandeja</StdButton></template>
    </StdPageHeader>
    <TechnicalNotice v-if="error || submissionError" tone="danger" title="No se pudo completar la operación" :description="error || submissionError" />
    <TechnicalNotice v-if="notice" tone="success" title="Envío confirmado" :description="notice" />
    <div v-if="store.loadingForm" class="ts-empty" role="status">Cargando ficha…</div>
    <StdButton v-else-if="!form" class="ts-button-secondary" @click="load">Volver a intentar</StdButton>
    <template v-else>
      <div class="ts-form-meta flex flex-wrap items-center gap-x-4 gap-y-2 text-sm"><TechnicalStatus :status="form.status" /><span class="text-pic-text-muted">Límite: {{ formatDeadline(form.deadlineAt) }}</span><span class="ts-code">{{ form.store.clientId }}</span><span class="text-pic-text-muted">{{ [form.store.chain, form.store.management, form.store.leadership].filter(Boolean).join(' · ') }}</span></div>
      <template v-if="!form.canSubmit">
        <TechnicalNotice v-if="form.status === 'SUBMITTED'" tone="success" title="Ficha cerrada" :description="`Enviada por ${form.elaborator?.nombre || 'otro usuario'} · ${formatInstant(form.submittedAt)}.`" />
        <TechnicalNotice v-else-if="form.status === 'PAUSED'" tone="warning" title="Estudio pausado" description="La ficha no admite envíos hasta que el superadmin reanude el estudio." />
        <TechnicalNotice v-else-if="form.status === 'EXPIRED'" tone="warning" title="Plazo vencido" description="La ficha no admite envíos hasta que un administrador amplíe el plazo." />
        <TechnicalNotice v-else title="Ficha de consulta" description="Tu perfil puede consultar esta ficha, pero no enviar una respuesta." />
        <StdSection class="ts-section" title="Respuesta de la ficha"><TechnicalFormReview :draft="readOnlyDraft" :elaborator="form.elaborator || form.currentElaborator" /></StdSection>
      </template>
      <form v-else ref="root" novalidate class="space-y-6" @submit.prevent="advance">
        <TechnicalFormSteps :step="step" :reached="reachedStep" :busy="busy" @select="flow.go($event); focusStep()" />
        <section class="ts-form-panel rounded-xl border border-pic-border bg-pic-surface p-4 sm:p-6">
          <h2 data-step-heading tabindex="-1" class="mb-5 text-lg font-semibold outline-none">{{ titles[step - 1] }}</h2>
          <div v-if="step === 1" class="grid gap-5 sm:grid-cols-2">
            <div class="ts-identity"><p class="ts-muted">Elabora · usuario PIC</p><p class="mt-2 font-semibold">{{ form.currentElaborator?.nombre || '—' }}</p><p class="ts-code mt-1">No. empleado {{ form.currentElaborator?.noEmp || '—' }}</p></div>
            <label class="ts-label" for="responsable">Gerente o encargado de la tienda<input id="responsable" v-model="draft.responsableNombre" class="ts-input" maxlength="200" autocomplete="name" :disabled="busy" :aria-invalid="!!errors.responsable" aria-describedby="responsable-error" placeholder="Nombre de la persona en tienda"><span id="responsable-error" class="ts-error block" aria-live="polite">{{ errors.responsable }}</span></label>
          </div>
          <div v-else-if="step === 2">
            <p class="ts-capture-progress" aria-live="polite"><span class="ts-tone-success"><strong>{{ completedCount }}</strong> capturadas</span><span class="ts-tone-neutral"><strong>{{ excluded.length }}</strong> no vendidas</span><span class="ts-tone-info"><strong>{{ pendingCount }}</strong> pendientes</span></p>
            <div v-if="!catalogInitialized" class="space-y-3">
              <p v-if="store.loadingCatalog" role="status">Cargando todas las marcas…</p>
              <template v-else><TechnicalNotice tone="warning" title="La lista de marcas no está disponible" :description="store.catalogError || 'Se necesita el catálogo completo, incluida Corona, para continuar. Tu captura se conserva.'" /><StdButton class="ts-button-secondary" :disabled="busy" @click="store.loadCatalog">Volver a cargar marcas</StdButton></template>
            </div>
            <template v-else-if="active">
              <div class="ts-brand-heading ts-actions mb-5 items-start">
                <div class="min-w-0"><p class="ts-muted">Marca {{ activeIndex + 1 }} de {{ included.length }}</p><h3 class="ts-name mt-1 text-lg">{{ active.name }}</h3><p v-if="active.competitorId === 2" class="mt-1 text-sm text-pic-text-muted">Corona es obligatoria en esta ficha.</p></div>
                <StdButton v-if="active.competitorId !== 2" class="ts-button-secondary" :disabled="busy" @click="excludeActive">No se vende en esta tienda</StdButton>
              </div>
              <TechnicalFormFields :key="active.key" v-model="draft.competitors[activeDraftIndex]!" :errors="errors" :busy="busy" :competitor="activeCatalogEntry" />
              <CompetitorNamesEditor v-if="activeIndex === included.length - 1" :draft="draft" :busy="busy" :catalog="store.competitorCatalog" @add="addOther" />
            </template>
            <p v-if="errors.catalog || errors.competitors" class="ts-error mt-3" role="alert">{{ errors.catalog || errors.competitors }}</p>
            <details v-if="excluded.length" class="ts-excluded mt-6">
              <summary class="ts-excluded-summary">No se venden en esta tienda ({{ excluded.length }})</summary>
              <ul class="mt-2"><li v-for="item in excluded" :key="item.key" class="ts-actions border-b border-pic-border py-2"><span class="ts-name">{{ item.name }}</span><StdButton class="ts-button-secondary" :disabled="busy" :aria-label="`Restaurar ${item.name}`" @click="restore(item.key)">Restaurar</StdButton></li></ul>
            </details>
          </div>
          <template v-else><TechnicalFormReview :draft="draft" :elaborator="form.currentElaborator" editable :busy="busy" @edit-responsible="flow.go(1); focusStep()" @edit-competitor="flow.select($event); flow.go(2); focusStep()" @restore-competitor="restore" /><CompetitorNamesEditor :draft="draft" :busy="busy" :catalog="store.competitorCatalog" @add="addOther" /></template>
        </section>
        <div class="ts-sticky">
          <p v-if="step === 3" class="mb-3 text-sm">El primer envío válido cierra la ficha para todos los usuarios elegibles. Verifica los datos antes de enviar.</p>
          <div class="ts-actions"><p class="ts-muted">La captura aún no se ha enviado.</p><div class="flex gap-2"><StdButton v-if="step > 1" class="ts-button-secondary" :disabled="busy" @click="flow.previous(); focusStep()">Anterior</StdButton><StdButton variant="primary" type="submit" :disabled="busy || (step > 1 && !catalogInitialized)" :icon="step === 3 ? 'fa-solid fa-paper-plane' : 'fa-solid fa-arrow-right'">{{ busy ? 'Enviando…' : step === 3 ? 'Enviar ficha' : nextLabel }}</StdButton></div></div>
        </div>
      </form>
    </template>
    <ModalDialog :model-value="!!excluding" title="Marcar como no vendida" @update:model-value="excluding = null">
      <p class="ts-dialog-content"><strong>{{ draft.competitors.find(item => item.key === excluding)?.name }}</strong> tiene datos capturados. Al marcarla como no vendida, sus datos no se enviarán. Puedes restaurarlos mientras esta ficha permanezca abierta.</p>
      <template #footer><StdButton class="ts-button-secondary" :disabled="busy" @click="confirmExclude">No se vende</StdButton><StdButton class="ts-button-secondary mr-2" :disabled="busy" @click="excluding = null">Continuar captura</StdButton></template>
    </ModalDialog>
  </TechnicalPage>
</template>
