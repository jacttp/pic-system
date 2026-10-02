<script setup lang="ts">
import { ref } from 'vue';
import StdButton from '@/modules/Shared/components/std/StdButton.vue';
import type { StudyCompetitor } from '../types/technicalStudy.types';
import type { FormDraft } from '../types/technicalStudy.ui';
import { catalogNameError, normalizeCompetitorName } from '../utils/formDraft';
const props = defineProps<{ draft: FormDraft; busy?: boolean; catalog: StudyCompetitor[] }>();
const emit = defineEmits<{ add: [name: string] }>();
const expanded = ref(false);
const name = ref('');
const error = ref('');
function add() {
   if (props.busy || props.draft.competitors.length >= 100 || !props.catalog.some(item => item.isOther)) return;
   const normalized = normalizeCompetitorName(name.value);
   error.value = catalogNameError(name.value, props.catalog);
   if (!error.value && props.draft.competitors.some(item => normalizeCompetitorName(item.name).toLocaleLowerCase('es-MX') === normalized.toLocaleLowerCase('es-MX'))) {
      error.value = 'Esta marca ya está en la ficha. Si está excluida, restáurala.';
   }
   if (error.value) return;
   emit('add', normalized); name.value = ''; expanded.value = false;
}
</script>
<template>
  <div class="ts-other-editor mt-6">
    <p class="ts-muted mb-3">¿Observaste una marca que no está en la lista? Puedes agregarla con su nombre.</p>
    <StdButton v-if="!expanded" class="ts-button-secondary" icon="fa-solid fa-plus" :disabled="busy || draft.competitors.length >= 100 || !catalog.some(item => item.isOther)" @click="expanded = true">Agregar otra marca</StdButton>
    <div v-else class="space-y-3">
      <label class="ts-label" for="competitor-other-name">Nombre de la otra marca
        <input id="competitor-other-name" v-model="name" class="ts-input" maxlength="100" :disabled="busy" :aria-invalid="!!error" aria-describedby="competitor-add-error" placeholder="Nombre observado en tienda" @keydown.enter.prevent="add">
      </label>
      <p id="competitor-add-error" class="ts-error" aria-live="polite">{{ error }}</p>
      <div class="flex flex-wrap gap-2"><StdButton class="ts-button-secondary" :disabled="busy" @click="add">Agregar y capturar</StdButton><StdButton class="ts-button-secondary" :disabled="busy" @click="expanded = false; name = ''; error = ''">Cancelar</StdButton></div>
    </div>
  </div>
</template>
