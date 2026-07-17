<script setup lang="ts">
import ModalDialog from '@/modules/Shared/components/ModalDialog.vue';
import StdButton from '@/modules/Shared/components/std/StdButton.vue';

interface Props { modelValue: boolean }
defineProps<Props>();
const emit = defineEmits<{ (event: 'update:modelValue', value: boolean): void }>();
</script>

<template>
  <ModalDialog :model-value="modelValue" title="Cómo clasificar un concepto" size="2xl" @update:model-value="emit('update:modelValue', $event)">
    <div class="space-y-5 text-sm text-pic-text-main">
      <ol class="grid gap-2 sm:grid-cols-2">
        <li v-for="(step, index) in ['Selecciona un concepto', 'Revisa o aplica la propuesta', 'Corrige los campos necesarios', 'Aprueba la creación del artículo']" :key="step" class="flex gap-3 rounded-lg border border-pic-border bg-pic-muted-surface p-3">
          <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-pic-brand text-[10px] font-bold text-white">{{ index + 1 }}</span>
          <span class="text-xs font-semibold leading-5">{{ step }}</span>
        </li>
      </ol>

      <section class="rounded-lg border border-[hsl(var(--pic-info)/0.24)] bg-[hsl(var(--pic-info)/0.07)] p-3">
        <h3 class="text-[10px] font-bold uppercase tracking-[0.14em] text-pic-info">Aplicar no es aprobar</h3>
        <p class="mt-1 text-xs font-semibold leading-5 text-pic-text-muted">
          <strong class="text-pic-text-main">Aplicar</strong> solo llena el formulario. Únicamente <strong class="text-pic-text-main">Crear artículo</strong> inserta la fila en ArticulosIC.
        </p>
      </section>

      <div class="grid gap-4 sm:grid-cols-2">
        <section>
          <h3 class="text-[10px] font-bold uppercase tracking-[0.14em] text-pic-text-muted">Valores y estados</h3>
          <ul class="mt-2 space-y-2 text-xs font-semibold leading-5 text-pic-text-muted">
            <li><i class="fa-solid fa-wand-magic-sparkles mr-2 w-3 text-pic-info"></i><strong>Sugerido:</strong> coincide con la propuesta.</li>
            <li><i class="fa-solid fa-pen mr-2 w-3 text-pic-warning"></i><strong>Modificado:</strong> fue corregido manualmente.</li>
            <li><i class="fa-solid fa-minus mr-2 w-3"></i><strong>Sin valor:</strong> se insertará como SQL NULL.</li>
            <li><i class="fa-solid fa-check mr-2 w-3 text-pic-success"></i><strong>“NO”:</strong> es un valor válido y se conserva.</li>
          </ul>
        </section>
        <section>
          <h3 class="text-[10px] font-bold uppercase tracking-[0.14em] text-pic-text-muted">Puntos importantes</h3>
          <ul class="mt-2 space-y-2 text-xs font-semibold leading-5 text-pic-text-muted">
            <li><i class="fa-solid fa-lock mr-2 w-3 text-pic-brand"></i>SKUMuliix nunca se modifica.</li>
            <li><i class="fa-solid fa-asterisk mr-2 w-3 text-pic-brand"></i>SkuReal es el único campo obligatorio.</li>
            <li><i class="fa-solid fa-coins mr-2 w-3 text-pic-warning"></i>Crear propuestas llama OpenAI y consume créditos.</li>
            <li><i class="fa-solid fa-clock mr-2 w-3 text-pic-info"></i>La reserva se renueva mientras revisas.</li>
          </ul>
        </section>
      </div>

      <p class="border-t border-pic-border pt-3 text-[10px] font-semibold leading-4 text-pic-text-muted">
        Si catálogos, antecedentes u OpenAI no están disponibles, puedes continuar manualmente. Más tarde solicita un motivo y no crea el artículo.
      </p>
    </div>
    <template #footer>
      <StdButton variant="primary" @click="emit('update:modelValue', false)">Entendido</StdButton>
    </template>
  </ModalDialog>
</template>
