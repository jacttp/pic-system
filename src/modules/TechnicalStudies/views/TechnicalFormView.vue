<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import TechnicalFormFields from '../components/TechnicalFormFields.vue';
import { useTechnicalStudyStore } from '../stores/technicalStudyStore';
import type { SubmitFormPayload } from '../types/technicalStudy.types';
import StdAlert from '@/modules/Shared/components/std/StdAlert.vue';
import StdButton from '@/modules/Shared/components/std/StdButton.vue';
import StdPageHeader from '@/modules/Shared/components/std/StdPageHeader.vue';

const route = useRoute();
const router = useRouter();
const store = useTechnicalStudyStore();
const studyId = computed(() => Number(route.params.studyId));
const formId = computed(() => Number(route.params.formId));
const form = computed(() => store.selectedForm?.id === formId.value && store.selectedForm.studyId === studyId.value ? store.selectedForm : null);
const answer = ref<SubmitFormPayload>({
   responsableNombre: '',
   competitors: [{ name: '', estimatedMonthlyKg: null, sellerType: '', sellerCount: null }],
});
const submitting = ref(false);
const error = ref('');
const notice = ref('');

async function load() {
   error.value = '';
   notice.value = '';
   try {
      await store.loadForm(studyId.value, formId.value);
      if (form.value) answer.value = {
         responsableNombre: form.value.responsableNombre || '',
         competitors: form.value.competitors.length
           ? form.value.competitors.map(item => ({ ...item }))
           : [{ name: '', estimatedMonthlyKg: null, sellerType: '', sellerCount: null }],
      };
   } catch { error.value = store.error || 'No se pudo abrir la ficha.'; }
}

async function submit() {
   if (!form.value?.canSubmit || submitting.value) return;
   if (!answer.value.competitors.length) { error.value = 'Agrega al menos un competidor.'; return; }
   if (!window.confirm('¿Enviar esta ficha? El primer envío válido la cerrará para todos los usuarios elegibles.')) return;
   submitting.value = true;
   error.value = '';
   try {
      await store.submit(studyId.value, formId.value, answer.value);
      notice.value = 'Ficha enviada y cerrada correctamente.';
   } catch {
      error.value = store.error || 'No se pudo enviar la ficha.';
      if ((store.error || '').includes('ya fue enviada') || (store.error || '').includes('venció')) await load();
   } finally { submitting.value = false; }
}
watch([studyId, formId], load, { immediate: true });
</script>

<template>
  <div class="space-y-5">
    <StdPageHeader eyebrow="Fichas técnicas · tienda" :title="form?.store.name || 'Ficha técnica'" :description="form ? `${form.studyName} · ${form.store.clientId}` : 'Cargando ficha'" icon="fa-solid fa-clipboard">
      <template #actions><StdButton @click="router.push('/admin/technical-forms')">Volver a bandeja</StdButton></template>
    </StdPageHeader>
    <StdAlert v-if="error" tone="danger" title="No se pudo completar la operación" :description="error" />
    <StdAlert v-if="notice" tone="success" title="Envío confirmado" :description="notice" />
    <template v-if="form">
      <StdAlert v-if="form.status === 'SUBMITTED'" tone="success" title="Ficha cerrada" :description="`Enviada por ${form.elaborator?.nombre || 'otro usuario'}${form.elaborator?.noEmp ? ` · No. empleado ${form.elaborator.noEmp}` : ''}.`" />
      <StdAlert v-else-if="form.status === 'EXPIRED'" tone="warning" title="Plazo vencido" description="La ficha no admite envíos hasta que un administrador amplíe el plazo." />
      <div class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600">
        {{ form.store.chain || 'Sin cadena' }} · {{ form.store.management || 'Sin gerencia' }} · {{ form.store.leadership || 'Sin jefatura' }}
      </div>
      <form class="space-y-5" @submit.prevent="submit">
        <TechnicalFormFields v-model="answer" :readonly="!form.canSubmit" :current-elaborator="form.elaborator || form.currentElaborator" />
        <div v-if="form.canSubmit" class="flex justify-end rounded-xl border border-slate-200 bg-white p-4">
          <StdButton variant="primary" type="submit" icon="fa-solid fa-paper-plane" :disabled="submitting">{{ submitting ? 'Enviando…' : 'Enviar ficha' }}</StdButton>
        </div>
      </form>
    </template>
  </div>
</template>
