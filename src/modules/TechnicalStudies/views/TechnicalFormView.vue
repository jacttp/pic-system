<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router';
import StdButton from '@/modules/Shared/components/std/StdButton.vue';
import StdPageHeader from '@/modules/Shared/components/std/StdPageHeader.vue';
import StdSection from '@/modules/Shared/components/std/StdSection.vue';
import TechnicalPage from '../components/TechnicalPage.vue';
import TechnicalNotice from '../components/TechnicalNotice.vue';
import TechnicalStatus from '../components/TechnicalStatus.vue';
import TechnicalFormSteps from '../components/TechnicalFormSteps.vue';
import CompetitorNamesEditor from '../components/CompetitorNamesEditor.vue';
import TechnicalFormFields from '../components/TechnicalFormFields.vue';
import TechnicalFormReview from '../components/TechnicalFormReview.vue';
import { useTechnicalStudyStore } from '../stores/technicalStudyStore';
import { useTechnicalForm } from '../composables/useTechnicalForm';
import { competitorErrors, makeDraft, nameErrors } from '../utils/formDraft';
import { errorMessage, formatDeadline, formatInstant } from '../utils/technicalStudyUi';

const route = useRoute(); const router = useRouter(); const store = useTechnicalStudyStore();
const flow = useTechnicalForm();
const { draft, step, reachedStep, active, activeKey, activeIndex, errors, busy, dirty, completedCount, submissionError } = flow;
const studyId = computed(() => Number(route.params.studyId)); const formId = computed(() => Number(route.params.formId));
const form = computed(() => store.selectedForm?.id === formId.value && store.selectedForm.studyId === studyId.value ? store.selectedForm : null);
const error = ref(''); const notice = ref(''); const root = ref<HTMLElement | null>(null);
let loadedKey = '';
const readOnlyDraft = computed(() => makeDraft(form.value ? { responsableNombre: form.value.responsableNombre || '', competitors: form.value.competitors } : undefined));
const titles = ['Responsable en tienda', 'Competidores observados', 'Captura por competidor', 'Revisa antes de enviar'];
const nextLabel = computed(() => step.value === 3 ? activeIndex.value < draft.value.competitors.length - 1 ? 'Siguiente competidor' : 'Revisar ficha' : 'Continuar');
function complete(key: string) {
   const item = draft.value.competitors.find(item => item.key === key);
   return !!item && !nameErrors(draft.value)[`${key}-name`] && !Object.keys(competitorErrors(item)).length;
}
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
      }
   } catch (reason) { error.value = errorMessage(reason, 'No se pudo abrir la ficha.'); }
}
async function submit() {
   if (!form.value?.canSubmit || busy.value || step.value !== 4) return;
   error.value = '';
   const sent = await flow.send(answer => store.submit(studyId.value, formId.value, answer), async () => {
      const current = await store.loadForm(studyId.value, formId.value);
      return !!current && !current.canSubmit;
   });
   if (sent) notice.value = 'Ficha enviada. La respuesta quedó registrada y la ficha está cerrada.';
   else await focusStep();
}
async function advance() { if (step.value === 4) await submit(); else { flow.next(); await focusStep(); } }
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
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm"><TechnicalStatus :status="form.status" /><span class="text-pic-text-muted">Límite: {{ formatDeadline(form.deadlineAt) }}</span><span class="ts-code">{{ form.store.clientId }}</span><span class="text-pic-text-muted">{{ [form.store.chain, form.store.management, form.store.leadership].filter(Boolean).join(' · ') }}</span></div>
      <template v-if="!form.canSubmit">
        <TechnicalNotice v-if="form.status === 'SUBMITTED'" tone="success" title="Ficha cerrada" :description="`Enviada por ${form.elaborator?.nombre || 'otro usuario'} · ${formatInstant(form.submittedAt)}.`" />
        <TechnicalNotice v-else-if="form.status === 'PAUSED'" tone="warning" title="Estudio pausado" description="La ficha no admite envíos hasta que el superadmin reanude el estudio." />
        <TechnicalNotice v-else-if="form.status === 'EXPIRED'" tone="warning" title="Plazo vencido" description="La ficha no admite envíos hasta que un administrador amplíe el plazo." />
        <TechnicalNotice v-else title="Ficha de consulta" description="Tu perfil puede consultar esta ficha, pero no enviar una respuesta." />
        <StdSection class="ts-section" title="Respuesta de la ficha"><TechnicalFormReview :draft="readOnlyDraft" :elaborator="form.elaborator || form.currentElaborator" /></StdSection>
      </template>
      <form v-else ref="root" novalidate class="space-y-6" @submit.prevent="advance">
        <TechnicalFormSteps :step="step" :reached="reachedStep" :busy="busy" @select="flow.go($event); focusStep()" />
        <section class="rounded-xl border border-pic-border bg-pic-surface p-4 sm:p-6">
          <h2 data-step-heading tabindex="-1" class="mb-5 text-lg font-semibold outline-none">{{ titles[step - 1] }}</h2>
          <div v-if="step === 1" class="grid gap-5 sm:grid-cols-2">
            <div><p class="ts-muted">Elabora · usuario PIC</p><p class="mt-2 font-semibold">{{ form.currentElaborator?.nombre || '—' }}</p><p class="ts-code mt-1">No. empleado {{ form.currentElaborator?.noEmp || '—' }}</p></div>
            <label class="ts-label" for="responsable">Responsable del departamento en tienda<input id="responsable" v-model="draft.responsableNombre" class="ts-input" maxlength="200" autocomplete="name" :disabled="busy" :aria-invalid="!!errors.responsable" aria-describedby="responsable-error" placeholder="Nombre de la persona en tienda"><span id="responsable-error" class="ts-error block" aria-live="polite">{{ errors.responsable }}</span></label>
          </div>
          <CompetitorNamesEditor v-else-if="step === 2" v-model="draft" :errors="errors" :busy="busy" @add="flow.add" @remove="flow.remove" />
          <div v-else-if="step === 3">
            <p class="ts-muted mb-3">{{ completedCount }} de {{ draft.competitors.length }} competidores completos</p>
            <nav aria-label="Competidores" class="mb-5 flex gap-2 overflow-x-auto pb-2"><button v-for="(item, index) in draft.competitors" :key="item.key" type="button" class="shrink-0 rounded-lg border px-3 text-sm" :class="activeKey === item.key ? 'border-pic-brand bg-pic-brand-soft text-pic-brand' : 'border-pic-border'" :disabled="busy" :aria-current="activeKey === item.key ? 'true' : undefined" @click="flow.select(item.key)"><span class="mr-2">{{ complete(item.key) ? '✓' : index + 1 }}</span>{{ item.name }}<span class="sr-only">{{ complete(item.key) ? 'completo' : 'incompleto' }}</span></button></nav>
            <template v-if="active"><h3 class="mb-4 font-semibold">{{ active.name }}</h3><TechnicalFormFields :key="active.key" v-model="draft.competitors[activeIndex]!" :errors="errors" :busy="busy" /></template>
          </div>
          <TechnicalFormReview v-else :draft="draft" :elaborator="form.currentElaborator" editable :busy="busy" @edit-responsible="flow.go(1); focusStep()" @edit-competitor="flow.select($event); flow.go(3); focusStep()" />
        </section>
        <div class="ts-sticky">
          <p v-if="step === 4" class="mb-3 text-sm">El primer envío válido cierra la ficha para todos los usuarios elegibles. Verifica los datos antes de enviar.</p>
          <div class="ts-actions"><p class="ts-muted">La captura aún no se ha enviado.</p><div class="flex gap-2"><StdButton v-if="step > 1" class="ts-button-secondary" :disabled="busy" @click="flow.previous(); focusStep()">Anterior</StdButton><StdButton variant="primary" type="submit" :disabled="busy" :icon="step === 4 ? 'fa-solid fa-paper-plane' : 'fa-solid fa-arrow-right'">{{ busy ? 'Enviando…' : step === 4 ? 'Enviar ficha' : nextLabel }}</StdButton></div></div>
        </div>
      </form>
    </template>
  </TechnicalPage>
</template>
