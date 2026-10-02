<script setup lang="ts">
import { computed, ref } from 'vue';
import StdButton from '@/modules/Shared/components/std/StdButton.vue';
import ModalDialog from '@/modules/Shared/components/ModalDialog.vue';
import type { Competitor, StudyCompetitor } from '../types/technicalStudy.types';
import type { CompetitorDraft, FieldErrors, FormDraft } from '../types/technicalStudy.ui';
import { catalogNameError, hasCapture, nameErrors, normalizeCompetitorName } from '../utils/formDraft';
const props = defineProps<{ errors: FieldErrors; busy?: boolean; catalog: StudyCompetitor[]; loading?: boolean; catalogError?: string }>();
const draft = defineModel<FormDraft>({ required: true });
const emit = defineEmits<{ add: [competitor: Competitor]; remove: [key: string]; retry: [] }>();
const search = ref(''); const selectedId = ref(''); const newName = ref('');
const addError = ref(''); const removing = ref<string | null>(null);
const selected = computed(() => props.catalog.find(item => item.id === Number(selectedId.value)));
const choices = computed(() => props.catalog.filter(item => item.isOther || item.name.toLocaleLowerCase('es-MX').includes(search.value.trim().toLocaleLowerCase('es-MX'))));
function add() {
   if (props.busy || props.loading || !selected.value) return;
   const entry = selected.value;
   const name = entry.isOther ? normalizeCompetitorName(newName.value) : entry.name;
   addError.value = entry.isOther ? catalogNameError(newName.value, props.catalog) : '';
   if (addError.value) return;
   const item: Competitor = { name, competitorId: entry.id, otherName: entry.isOther ? name : null,
      estimatedMonthlyKg: null, sellerType: 'BASE', sellerCount: null };
   const candidate = { ...draft.value, competitors: [...draft.value.competitors, { ...item, key: 'new-competitor', estimatedMonthlyKgInput: '', sellerCountInput: '' }] };
   const issues = nameErrors(candidate);
   addError.value = issues['new-competitor-name'] || issues.competitors || '';
   if (addError.value) return;
   emit('add', item); newName.value = ''; selectedId.value = ''; addError.value = '';
}
function change(item: CompetitorDraft, event: Event) {
   if (props.busy) return;
   const entry = props.catalog.find(row => row.id === Number((event.target as HTMLSelectElement).value));
   if (!entry) return;
   // Preserve stable identity and captured numbers when changing the selection.
   const previousName = item.name;
   item.competitorId = entry.id;
   item.otherName = entry.isOther ? previousName : null;
   item.name = entry.isOther ? previousName : entry.name;
}
function remove(key: string) {
   if (props.busy) return;
   const item = draft.value.competitors.find(item => item.key === key);
   if (item && hasCapture(item)) removing.value = key; else emit('remove', key);
}
function confirmRemove() { if (!props.busy && removing.value) emit('remove', removing.value); removing.value = null; }
</script>
<template>
  <div>
    <p class="ts-muted mb-4">Selecciona los competidores que observaste. Usa Otro para uno que no esté en la lista; su nombre no se dará de alta en el catálogo.</p>
    <p v-if="loading" class="ts-muted" role="status">Cargando competidores…</p>
    <div v-if="catalogError" class="mb-4" role="status"><p class="ts-error">{{ catalogError }}</p><StdButton class="ts-button-secondary mt-2" :disabled="busy || loading" @click="emit('retry')">Volver a cargar lista</StdButton></div>
    <div class="grid gap-3 sm:grid-cols-2">
      <label class="ts-label">Buscar en la lista<input v-model="search" class="ts-input" :disabled="busy || loading" placeholder="Nombre del competidor" @keydown.enter.prevent></label>
      <label class="ts-label">Competidor<select v-model="selectedId" class="ts-input" :disabled="busy || loading || !catalog.length" @change="addError = ''"><option value="" disabled>Selecciona un competidor</option><option v-for="entry in choices" :key="entry.id" :value="String(entry.id)">{{ entry.name }}</option></select></label>
      <label v-if="selected?.isOther" class="ts-label sm:col-span-2" for="competitor-other-name">Nombre del otro competidor<input id="competitor-other-name" v-model="newName" class="ts-input" maxlength="100" :disabled="busy" :aria-invalid="!!addError" aria-describedby="competitor-add-error" placeholder="Nombre observado en tienda" @keydown.enter.prevent="add"></label>
    </div>
    <StdButton class="ts-button-secondary mt-3" icon="fa-solid fa-plus" :disabled="busy || loading || !selected || draft.competitors.length >= 100" @click="add">Agregar competidor</StdButton>
    <p id="competitor-add-error" class="ts-error" aria-live="polite">{{ addError || errors.competitors }}</p>
    <p class="ts-muted mt-5 mb-2">{{ draft.competitors.length }} de 100 competidores</p>
    <div v-for="(item, index) in draft.competitors" :key="item.key" class="ts-mobile-row flex items-start gap-3">
      <span class="pt-5 text-sm text-pic-text-muted tabular-nums">{{ index + 1 }}</span>
      <div class="min-w-0 flex-1 space-y-2">
        <label class="ts-label" :for="`${item.key}-selection`">Competidor {{ index + 1 }}<select :id="`${item.key}-selection`" class="ts-input" :value="item.competitorId || ''" :disabled="busy || loading || !catalog.length" :aria-invalid="!!errors[`${item.key}-name`]" :aria-describedby="`${item.key}-name-error`" @change="change(item, $event)"><option v-if="!catalog.some(entry => entry.id === item.competitorId)" :value="item.competitorId || ''">{{ item.name }}</option><option v-for="entry in catalog" :key="entry.id" :value="entry.id">{{ entry.name }}</option></select></label>
        <label v-if="item.otherName != null || !item.competitorId" class="ts-label" :for="`${item.key}-name`">Nombre observado<input :id="`${item.key}-name`" v-model="item.name" class="ts-input" maxlength="100" :disabled="busy" :aria-invalid="!!errors[`${item.key}-name`]" :aria-describedby="`${item.key}-name-error`"></label>
        <span :id="`${item.key}-name-error`" class="ts-error block" aria-live="polite">{{ errors[`${item.key}-name`] }}</span>
      </div>
      <StdButton class="ts-button-secondary mt-6" :disabled="busy" :aria-label="`Quitar ${item.name || 'competidor'}`" @click="remove(item.key)">Quitar</StdButton>
    </div>
    <ModalDialog class="ts-dialog" :model-value="!!removing" title="Quitar competidor" @update:model-value="removing = null"><p>Se quitarán <strong>{{ draft.competitors.find(item => item.key === removing)?.name }}</strong> y sus datos capturados de esta ficha.</p><template #footer><StdButton variant="danger" :disabled="busy" @click="confirmRemove">Quitar competidor</StdButton><StdButton class="mr-2" :disabled="busy" @click="removing = null">Conservar</StdButton></template></ModalDialog>
  </div>
</template>
