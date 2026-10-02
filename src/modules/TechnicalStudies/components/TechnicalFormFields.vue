<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { StudyCompetitor } from '../types/technicalStudy.types';
import { sellerTypes, type CompetitorDraft, type FieldErrors } from '../types/technicalStudy.ui';
import { competitorLogo } from '../utils/formDraft';
import StdButton from '@/modules/Shared/components/std/StdButton.vue';
import ModalDialog from '@/modules/Shared/components/ModalDialog.vue';
const props = defineProps<{ errors: FieldErrors; busy?: boolean; competitor?: StudyCompetitor }>();
const logoFailed = ref(false);
const expanded = ref(false);
const logo = computed(() => competitorLogo(props.competitor?.logo));
watch(logo, () => { logoFailed.value = false; expanded.value = false; });
const model = defineModel<CompetitorDraft>({ required: true });
</script>
<template>
  <div class="grid gap-5 sm:grid-cols-2">
    <div v-if="competitor && !competitor.isOther" class="min-w-0 space-y-3 sm:col-span-2">
      <p class="ts-reference-label">Referencia de marcas y productos de {{ competitor.name }}</p>
      <img v-if="logo && !logoFailed" :src="logo" :alt="`Marcas y productos de ${competitor.name}`" class="ts-brand-reference" @error="logoFailed = true; expanded = false">
      <p v-else class="rounded-lg bg-pic-muted-surface p-4 text-sm text-pic-text-muted">{{ competitor.name }} · Referencia visual no disponible. Puedes continuar la captura.</p>
      <StdButton v-if="logo && !logoFailed" class="ts-button-secondary" :disabled="busy" icon="fa-solid fa-expand" @click="expanded = true">Ampliar referencia</StdButton>
      <p v-if="competitor.description" class="whitespace-pre-line break-words text-sm text-pic-text-muted">{{ competitor.description }}</p>
    </div>
    <label v-if="model.otherName != null" class="ts-label sm:col-span-2" :for="`${model.key}-name`">Nombre de la otra marca
      <input :id="`${model.key}-name`" v-model="model.name" class="ts-input" maxlength="100" :disabled="busy" :aria-invalid="!!errors[`${model.key}-name`]" :aria-describedby="`${model.key}-name-error`">
      <span :id="`${model.key}-name-error`" class="ts-error block" aria-live="polite">{{ errors[`${model.key}-name`] }}</span>
    </label>
    <label class="ts-label sm:col-span-2" :for="`${model.key}-kg`">Venta mensual estimada
      <div class="relative"><input :id="`${model.key}-kg`" v-model="model.estimatedMonthlyKgInput" class="ts-input pr-12" type="text" inputmode="decimal" autocomplete="off" :disabled="busy" :aria-invalid="!!errors[`${model.key}-kg`]" :aria-describedby="`${model.key}-kg-help ${model.key}-kg-error`" placeholder="Ej. 850,50"><span class="absolute right-4 top-4 text-pic-text-muted" aria-hidden="true">kg</span></div>
      <span :id="`${model.key}-kg-help`" class="ts-muted mt-2 block">Estimación mensual en kilogramos. Cero indica una venta estimada de 0 kg.</span>
      <span :id="`${model.key}-kg-error`" class="ts-error block" aria-live="polite">{{ errors[`${model.key}-kg`] }}</span>
    </label>
    <label class="ts-label" :for="`${model.key}-type`">Tipo de vendedor
      <select :id="`${model.key}-type`" v-model="model.sellerType" class="ts-input" :disabled="busy" :aria-invalid="!!errors[`${model.key}-type`]" :aria-describedby="`${model.key}-type-error`"><option value="" disabled>Selecciona un tipo</option><option v-for="type in sellerTypes" :key="type.value" :value="type.value">{{ type.label }}</option></select>
      <span :id="`${model.key}-type-error`" class="ts-error block" aria-live="polite">{{ errors[`${model.key}-type`] }}</span>
    </label>
    <label class="ts-label" :for="`${model.key}-count`">Cantidad de vendedores
      <input :id="`${model.key}-count`" v-model="model.sellerCountInput" class="ts-input" type="text" inputmode="numeric" autocomplete="off" :disabled="busy" :aria-invalid="!!errors[`${model.key}-count`]" :aria-describedby="`${model.key}-count-error`" placeholder="Ej. 3">
      <span :id="`${model.key}-count-error`" class="ts-error block" aria-live="polite">{{ errors[`${model.key}-count`] }}</span>
    </label>
  </div>
  <ModalDialog v-model="expanded" :title="`Referencia de ${competitor?.name || model.name}`" size="4xl">
    <img v-if="logo && !logoFailed" :src="logo" :alt="`Marcas y productos de ${competitor?.name || model.name}`" class="ts-dialog-content ts-brand-reference ts-brand-reference-expanded" @error="logoFailed = true; expanded = false">
    <template #footer><StdButton class="ts-button-secondary" @click="expanded = false">Cerrar referencia</StdButton></template>
  </ModalDialog>
</template>
