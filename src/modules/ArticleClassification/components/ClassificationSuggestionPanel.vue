<script setup lang="ts">
import { computed } from 'vue';
import StdButton from '@/modules/Shared/components/std/StdButton.vue';
import type { ArticleSuggestion, ClassificationField, ClassificationValues } from '../types/articleClassificationTypes';

interface Props {
  suggestion: ArticleSuggestion | null;
  currentValues: ClassificationValues;
  loading?: boolean;
  error?: string | null;
  canDelete?: boolean;
}
const props = withDefaults(defineProps<Props>(), { loading: false, error: null, canDelete: false });
const emit = defineEmits<{
  (event: 'generate'): void;
  (event: 'apply-all'): void;
  (event: 'delete'): void;
}>();
const FIELDS = ['SkuReal', 'Marca', 'Grupo', 'Status', 'Nombre', 'Canibalizacion', 'EmpaqueA', 'Categorias', 'TipoCom', 'Id_SkuRetail', 'EmpaqueB', 'Peso', 'Contol', 'TipoEsqDis', 'GrupoOP'] as ClassificationField[];
const TYPE_LABELS = { PRODUCT: 'Producto', CHARGE: 'Cargo', RETURN: 'Devolución', SERVICE: 'Servicio', EQUIPMENT: 'Equipo', REBILLING: 'Refacturación', OTHER: 'Otro' };
const appliedCount = computed(() => props.suggestion ? FIELDS.filter(field => props.currentValues[field] === props.suggestion?.values[field]).length : 0);
</script>

<template>
  <section class="rounded-xl border border-pic-border bg-pic-surface p-3 shadow-sm sm:p-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <span class="flex h-7 w-7 items-center justify-center rounded-md bg-pic-brand-soft text-pic-brand"><i class="fa-solid fa-wand-magic-sparkles text-xs"></i></span>
          <h3 class="text-xs font-bold uppercase tracking-[0.12em] text-pic-text-main">Propuesta asistida</h3>
          <span v-if="suggestion" class="rounded-md border border-pic-border bg-pic-muted-surface px-2 py-1 text-[9px] font-bold uppercase text-pic-text-muted">
            {{ TYPE_LABELS[suggestion.result.conceptType] }} · {{ appliedCount }}/15 aplicados
          </span>
        </div>
        <p class="mt-1.5 text-[10px] font-semibold leading-4 text-pic-text-muted">
          Los valores sugeridos aparecen junto a cada campo y siguen siendo editables. Aplicarlos no guarda datos.
        </p>
      </div>
      <div class="flex shrink-0 gap-2">
        <StdButton
          v-if="suggestion && canDelete"
          size="icon"
          variant="ghost"
          icon="fa-regular fa-trash-can"
          :disabled="loading"
          aria-label="Borrar propuesta"
          title="Borrar propuesta"
          @click="emit('delete')"
        />
        <StdButton size="sm" :icon="loading ? 'fa-solid fa-circle-notch fa-spin' : suggestion ? 'fa-solid fa-arrows-rotate' : 'fa-solid fa-wand-magic-sparkles'" :disabled="loading" @click="emit('generate')">
          {{ suggestion ? 'Regenerar' : 'Crear propuesta' }}
        </StdButton>
        <StdButton v-if="suggestion" size="sm" variant="primary" icon="fa-solid fa-arrow-down" :disabled="loading || appliedCount === 15" @click="emit('apply-all')">
          Aplicar
        </StdButton>
      </div>
    </div>

    <p v-if="loading" class="mt-3 text-xs font-semibold text-pic-info" role="status"><i class="fa-solid fa-circle-notch fa-spin mr-1"></i>Analizando antecedentes con OpenAI…</p>
    <div v-else-if="error" class="mt-3 rounded-lg border border-[hsl(var(--pic-warning)/0.28)] bg-[hsl(var(--pic-warning)/0.08)] px-3 py-2 text-[10px] font-semibold text-pic-warning">
      <i class="fa-solid fa-triangle-exclamation mr-1"></i>{{ error }} El formulario manual sigue disponible.
    </div>
    <details v-if="suggestion && (suggestion.result.warnings.length || suggestion.result.requiresHumanAttention)" class="mt-3 rounded-lg border border-[hsl(var(--pic-warning)/0.24)] bg-[hsl(var(--pic-warning)/0.06)] px-3 py-2">
      <summary class="cursor-pointer text-[10px] font-bold uppercase tracking-wide text-pic-warning">Advertencias de la propuesta</summary>
      <ul class="mt-2 space-y-1 text-[10px] font-semibold leading-4 text-pic-text-muted">
        <li v-for="warning in suggestion.result.warnings" :key="warning">• {{ warning }}</li>
        <li v-if="!suggestion.result.warnings.length">La propuesta solicita revisión humana adicional.</li>
      </ul>
    </details>
  </section>
</template>
