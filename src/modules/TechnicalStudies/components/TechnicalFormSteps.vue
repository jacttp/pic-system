<script setup lang="ts">
defineProps<{ step: number; reached: number; busy?: boolean }>();
defineEmits<{ select: [step: number] }>();
const steps = ['Responsable', 'Captura de marcas', 'Revisión'];
</script>
<template>
  <nav aria-label="Pasos de la ficha">
    <p class="mb-3 text-sm font-semibold md:hidden">Paso {{ step }} de 3 · {{ steps[step - 1] }}</p>
    <ol class="grid grid-cols-3 gap-2"><li v-for="(label, index) in steps" :key="label">
      <button type="button" class="ts-step-button w-full text-left text-sm" :disabled="busy || index + 1 > reached" :aria-current="step === index + 1 ? 'step' : undefined" :aria-label="`${index + 1}. ${label}`" @click="$emit('select', index + 1)"><span class="ts-step-number">{{ index + 1 }}</span><span class="hidden md:inline">{{ label }}</span></button>
    </li></ol>
  </nav>
</template>
