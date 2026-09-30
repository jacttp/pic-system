<script setup lang="ts">
defineProps<{ step: number; reached: number; busy?: boolean }>();
defineEmits<{ select: [step: number] }>();
const steps = ['Responsable', 'Competidores', 'Captura', 'Revisión'];
</script>
<template>
  <nav aria-label="Pasos de la ficha">
    <p class="mb-3 text-sm font-semibold md:hidden">Paso {{ step }} de 4 · {{ steps[step - 1] }}</p>
    <ol class="grid grid-cols-4 gap-2"><li v-for="(label, index) in steps" :key="label">
      <button type="button" class="w-full border-b-2 pb-3 text-left text-sm" :class="step === index + 1 ? 'border-pic-brand text-pic-brand' : 'border-pic-border text-pic-text-muted'" :disabled="busy || index + 1 > reached" :aria-current="step === index + 1 ? 'step' : undefined" :aria-label="`${index + 1}. ${label}`" @click="$emit('select', index + 1)"><span class="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full" :class="step === index + 1 ? 'bg-pic-brand-soft' : 'bg-pic-muted-surface'">{{ index + 1 }}</span><span class="hidden md:inline">{{ label }}</span></button>
    </li></ol>
  </nav>
</template>
