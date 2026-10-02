<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import StdButton from '@/modules/Shared/components/std/StdButton.vue';
import StdPageHeader from '@/modules/Shared/components/std/StdPageHeader.vue';
import StdSection from '@/modules/Shared/components/std/StdSection.vue';
import ModalDialog from '@/modules/Shared/components/ModalDialog.vue';
import TechnicalPage from '../components/TechnicalPage.vue';
import TechnicalNotice from '../components/TechnicalNotice.vue';
import StoreSelector from '../components/StoreSelector.vue';
import { useTechnicalStudyStore } from '../stores/technicalStudyStore';
import type { StoreSearchRow } from '../types/technicalStudy.types';
import { dateDeadline, errorMessage, formatDeadline, localDate, validDeadline } from '../utils/technicalStudyUi';
const router = useRouter(); const store = useTechnicalStudyStore();
const name = ref(''); const deadlineDate = ref(''); const selectedStores = ref<StoreSearchRow[]>([]);
const submitting = ref(false); const showConfirmation = ref(false); const error = ref('');
const errors = ref<Record<string, string>>({}); const invalidStoreIds = ref<string[]>([]);
const root = ref<HTMLElement | null>(null);
const formattedDate = computed(() => Number.isFinite(dateDeadline(deadlineDate.value)) ? formatDeadline(new Date(dateDeadline(deadlineDate.value)).toISOString()) : '—');
async function review() {
   if (submitting.value) return;
   errors.value = {};
   if (!name.value.trim() || name.value.trim().length > 200) errors.value.name = 'Escribe un nombre de 1 a 200 caracteres.';
   if (!validDeadline(deadlineDate.value)) errors.value.deadline = 'Elige una fecha límite vigente.';
   if (selectedStores.value.length < 1 || selectedStores.value.length > 200 || new Set(selectedStores.value.map(item => item.IDCLIENTE)).size !== selectedStores.value.length) errors.value.stores = 'Selecciona entre 1 y 200 tiendas distintas.';
   if (Object.keys(errors.value).length) { await nextTick(); (root.value?.querySelector<HTMLElement>('[aria-invalid="true"]') || root.value?.querySelector<HTMLElement>('[data-stores-error]'))?.focus(); return; }
   showConfirmation.value = true;
}
async function publish() {
   if (submitting.value || !showConfirmation.value) return;
   if (!validDeadline(deadlineDate.value)) { showConfirmation.value = false; await review(); return; }
   submitting.value = true; error.value = ''; invalidStoreIds.value = [];
   try {
      const created = await store.publish({ name: name.value.trim(), deadlineDate: deadlineDate.value, storeIds: selectedStores.value.map(item => item.IDCLIENTE) });
      if (created) { showConfirmation.value = false; submitting.value = false; await router.push(`/admin/technical-studies/${created.id}`); }
   } catch (reason) {
      showConfirmation.value = false;
      error.value = errorMessage(reason, 'No se pudo publicar el estudio. Tu selección se conserva.');
      invalidStoreIds.value = (reason as { response?: { data?: { details?: { storeIds?: string[] } } } })?.response?.data?.details?.storeIds || [];
   } finally { submitting.value = false; }
}
function closeConfirmation() { if (!submitting.value) showConfirmation.value = false; }
onBeforeRouteLeave(() => !submitting.value);
</script>
<template>
  <TechnicalPage class="ts-study-admin">
    <StdPageHeader class="ts-header" eyebrow="Fichas técnicas · administración" title="Crear estudio" description="Define el plazo y las tiendas que recibirán una ficha técnica." icon="fa-solid fa-file-circle-plus"><template #actions><StdButton class="ts-button-secondary" :disabled="submitting" @click="router.push('/admin/technical-studies')">Volver a estudios</StdButton></template></StdPageHeader>
    <TechnicalNotice v-if="error" tone="danger" title="No se publicó el estudio" :description="error" />
    <TechnicalNotice v-if="invalidStoreIds.length" tone="warning" title="Revisa las tiendas señaladas" :description="`No son válidas o no tienen un jefe elegible: ${invalidStoreIds.join(', ')}. Tu selección se conserva.`" />
    <form ref="root" novalidate class="space-y-6" @submit.prevent="review">
      <StdSection class="ts-section" title="1. Datos del estudio" description="La fecha límite incluye todo el día indicado, en horario de Ciudad de México.">
        <div class="grid gap-5 md:grid-cols-2"><label class="ts-label" for="study-name">Nombre del estudio<input id="study-name" v-model="name" class="ts-input" maxlength="200" :disabled="submitting" :aria-invalid="!!errors.name" aria-describedby="study-name-error" placeholder="Ej. Condiciones de tienda · octubre"><span id="study-name-error" class="ts-error block">{{ errors.name }}</span></label><label class="ts-label" for="study-deadline">Fecha límite<input id="study-deadline" v-model="deadlineDate" class="ts-input" type="date" :min="localDate()" :disabled="submitting" :aria-invalid="!!errors.deadline" aria-describedby="study-deadline-error"><span id="study-deadline-error" class="ts-error block">{{ errors.deadline }}</span></label></div>
      </StdSection>
      <StdSection class="ts-section" title="2. Tiendas de autoservicio" description="Selecciona hasta 200 tiendas. La selección se conserva al cambiar de página o filtros."><p v-if="errors.stores" data-stores-error tabindex="-1" class="ts-error mb-3" role="alert">{{ errors.stores }}</p><StoreSelector v-model="selectedStores" :disabled="submitting" :invalid-store-ids="invalidStoreIds" /></StdSection>
      <div class="ts-sticky ts-actions"><p class="ts-muted">Se crearán <strong class="text-pic-text-main">{{ selectedStores.length }} fichas</strong>, una por tienda, y se avisará a los jefes elegibles.</p><StdButton variant="primary" type="submit" icon="fa-solid fa-paper-plane" :disabled="submitting">Publicar estudio</StdButton></div>
    </form>
    <ModalDialog :model-value="showConfirmation" title="Confirmar publicación" @update:model-value="closeConfirmation"><p class="ts-dialog-content">Se publicará <strong>{{ name.trim() }}</strong> con límite el <strong>{{ formattedDate }}</strong> y <strong>{{ selectedStores.length }} fichas</strong>.</p><p class="mt-3 text-sm text-pic-text-muted">La publicación se realiza completa o no se realiza. Se avisará a los jefes elegibles.</p><template #footer><StdButton variant="primary" :disabled="submitting" @click="publish">{{ submitting ? 'Publicando…' : 'Confirmar publicación' }}</StdButton><StdButton class="mr-2" :disabled="submitting" @click="closeConfirmation">Revisar selección</StdButton></template></ModalDialog>
  </TechnicalPage>
</template>
