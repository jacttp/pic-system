<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { StudyCompetitor } from '../types/technicalStudy.types';
import { sellerTypes, type CompetitorDraft, type FieldErrors } from '../types/technicalStudy.ui';
import { competitorLogo } from '../utils/formDraft';
const props = defineProps<{ errors: FieldErrors; busy?: boolean; competitor?: StudyCompetitor }>();
const logoFailed = ref(false);
const logo = computed(() => competitorLogo(props.competitor?.logo));
watch(logo, () => { logoFailed.value = false; });
const model = defineModel<CompetitorDraft>({ required: true });
</script>
<template>
  <div class="grid gap-5 sm:grid-cols-2">
    <div v-if="competitor" class="flex min-w-0 items-start gap-3 sm:col-span-2">
      <img v-if="logo && !logoFailed" :src="logo" :alt="competitor.name" class="h-14 w-14 shrink-0 rounded-lg border border-pic-border bg-pic-surface object-contain p-1" @error="logoFailed = true">
      <span v-else class="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-pic-muted-surface text-lg font-semibold" aria-hidden="true">{{ competitor.name.slice(0, 1) }}</span>
      <p class="min-w-0 whitespace-pre-line break-words text-sm text-pic-text-muted">{{ competitor.description || 'Captura la información observada en tienda.' }}</p>
    </div>
    <label class="ts-label sm:col-span-2" :for="`${model.key}-kg`">Venta mensual estimada
      <div class="relative"><input :id="`${model.key}-kg`" v-model="model.estimatedMonthlyKgInput" class="ts-input pr-12" type="text" inputmode="decimal" autocomplete="off" :disabled="busy" :aria-invalid="!!errors[`${model.key}-kg`]" :aria-describedby="`${model.key}-kg-help ${model.key}-kg-error`" placeholder="Ej. 850,50"><span class="absolute right-4 top-4 text-pic-text-muted" aria-hidden="true">kg</span></div>
      <span :id="`${model.key}-kg-help`" class="ts-muted mt-2 block">Estimación mensual en kilogramos. Usa 0 si no aplica.</span>
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
</template>
