<script setup lang="ts">
import { ref } from 'vue';
import StdButton from '@/modules/Shared/components/std/StdButton.vue';
import ModalDialog from '@/modules/Shared/components/ModalDialog.vue';
import type { FieldErrors, FormDraft } from '../types/technicalStudy.ui';
import { hasCapture } from '../utils/formDraft';
const props = defineProps<{ errors: FieldErrors; busy?: boolean }>();
const draft = defineModel<FormDraft>({ required: true });
const emit = defineEmits<{ add: [name: string]; remove: [key: string] }>();
const newName = ref(''); const addError = ref(''); const removing = ref<string | null>(null);
function add() {
   if (props.busy) return;
   const name = newName.value.trim();
   if (!name || name.length > 100) { addError.value = 'Escribe un nombre de 1 a 100 caracteres.'; return; }
   if (draft.value.competitors.some(item => item.name.trim().toLocaleLowerCase('es-MX') === name.toLocaleLowerCase('es-MX'))) { addError.value = 'Este competidor ya está en la ficha.'; return; }
   if (draft.value.competitors.length >= 100) { addError.value = 'La ficha admite hasta 100 competidores.'; return; }
   emit('add', name); newName.value = ''; addError.value = '';
}
function remove(key: string) {
   if (props.busy) return;
   const item = draft.value.competitors.find(item => item.key === key);
   if (item && hasCapture(item)) removing.value = key; else emit('remove', key);
}
function confirmRemove() { if (removing.value) emit('remove', removing.value); removing.value = null; }
</script>
<template>
  <div>
    <p class="ts-muted mb-4">Agrega las marcas o competidores que observaste. Puedes cambiar sus nombres antes de enviar.</p>
    <div class="ts-toolbar"><label class="ts-label ts-search">Nombre del competidor<input v-model="newName" class="ts-input" maxlength="100" :disabled="busy" :aria-invalid="!!(addError || errors.competitors)" aria-describedby="competitor-add-error" placeholder="Escribe una marca o competidor" @keydown.enter.prevent="add"></label><StdButton class="ts-button-secondary" icon="fa-solid fa-plus" :disabled="busy || draft.competitors.length >= 100" @click="add">Agregar competidor</StdButton></div>
    <p id="competitor-add-error" class="ts-error" aria-live="polite">{{ addError || errors.competitors }}</p>
    <p class="ts-muted mt-5 mb-2">{{ draft.competitors.length }} de 100 competidores</p>
    <div v-for="(item, index) in draft.competitors" :key="item.key" class="ts-mobile-row flex items-start gap-3">
      <span class="pt-5 text-sm text-pic-text-muted tabular-nums">{{ index + 1 }}</span>
      <label class="ts-label min-w-0 flex-1" :for="`${item.key}-name`"><span class="sr-only">Nombre del competidor {{ index + 1 }}</span><input :id="`${item.key}-name`" v-model="item.name" class="ts-input" maxlength="100" :disabled="busy" :aria-invalid="!!errors[`${item.key}-name`]" :aria-describedby="`${item.key}-name-error`"><span :id="`${item.key}-name-error`" class="ts-error block" aria-live="polite">{{ errors[`${item.key}-name`] }}</span></label>
      <StdButton class="ts-button-secondary mt-1" :disabled="busy" :aria-label="`Quitar ${item.name || 'competidor'}`" @click="remove(item.key)">Quitar</StdButton>
    </div>
    <ModalDialog class="ts-dialog" :model-value="!!removing" title="Quitar competidor" @update:model-value="removing = null"><p>Se quitarán <strong>{{ draft.competitors.find(item => item.key === removing)?.name }}</strong> y sus datos capturados de esta ficha.</p><template #footer><StdButton variant="danger" @click="confirmRemove">Quitar competidor</StdButton><StdButton class="mr-2" @click="removing = null">Conservar</StdButton></template></ModalDialog>
  </div>
</template>
