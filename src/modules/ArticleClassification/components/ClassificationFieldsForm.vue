<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import ClassificationFieldInput from './ClassificationFieldInput.vue';
import ClassificationSuggestionPanel from './ClassificationSuggestionPanel.vue';
import StdAlert from '@/modules/Shared/components/std/StdAlert.vue';
import StdButton from '@/modules/Shared/components/std/StdButton.vue';
import ModalDialog from '@/modules/Shared/components/ModalDialog.vue';
import type {
  ClassificationCatalogs,
  ClassificationCatalogMetadata,
  ClassificationDetail,
  ClassificationField,
  ClassificationValues,
  ClassificationValue,
  ArticleSuggestion,
} from '../types/articleClassificationTypes';

interface Props {
  detail: ClassificationDetail;
  catalogs: ClassificationCatalogs;
  catalogMetadata: ClassificationCatalogMetadata;
  catalogsLoading?: boolean;
  catalogsError?: string | null;
  saving?: boolean;
  suggestion?: ArticleSuggestion | null;
  suggestionLoading?: boolean;
  suggestionError?: string | null;
}

interface FieldDefinition {
  key: ClassificationField;
  label: string;
  type?: 'text' | 'number';
  required?: boolean;
  hint?: string;
}

interface FieldGroup {
  key: string;
  title: string;
  eyebrow: string;
  icon: string;
  fields: FieldDefinition[];
}

const props = withDefaults(defineProps<Props>(), {
  saving: false,
  catalogsLoading: false,
  catalogsError: null,
  suggestion: null,
  suggestionLoading: false,
  suggestionError: null,
});
const emit = defineEmits<{
  (event: 'save', values: ClassificationValues): void;
  (event: 'skip', reason: string): void;
  (event: 'back'): void;
  (event: 'generate-suggestion'): void;
}>();

const FIELD_KEYS: ClassificationField[] = [
  'SkuReal', 'Marca', 'Grupo', 'Status', 'Nombre', 'Canibalizacion', 'EmpaqueA',
  'Categorias', 'TipoCom', 'Id_SkuRetail', 'EmpaqueB', 'Peso', 'Contol',
  'TipoEsqDis', 'GrupoOP',
];

const GROUPS: FieldGroup[] = [
  {
    key: 'identity', title: 'Identidad de negocio', eyebrow: '01', icon: 'fa-solid fa-fingerprint',
    fields: [
      { key: 'SkuReal', label: 'SKU Real', required: true, hint: 'Clasificacion principal' },
      { key: 'Nombre', label: 'Nombre', hint: 'Nombre agrupador' },
      { key: 'Marca', label: 'Marca' },
      { key: 'Grupo', label: 'Grupo' },
    ],
  },
  {
    key: 'commercial', title: 'Lectura comercial', eyebrow: '02', icon: 'fa-solid fa-chart-simple',
    fields: [
      { key: 'Status', label: 'Status', type: 'number' },
      { key: 'Categorias', label: 'Categorias' },
      { key: 'TipoCom', label: 'Tipo comercial' },
      { key: 'Id_SkuRetail', label: 'ID SKU Retail' },
      { key: 'TipoEsqDis', label: 'Tipo esquema distribucion' },
      { key: 'GrupoOP', label: 'Grupo OP' },
    ],
  },
  {
    key: 'operations', title: 'Empaque y control', eyebrow: '03', icon: 'fa-solid fa-boxes-stacked',
    fields: [
      { key: 'EmpaqueA', label: 'Empaque A' },
      { key: 'EmpaqueB', label: 'Empaque B' },
      { key: 'Peso', label: 'Peso', type: 'number' },
      { key: 'Contol', label: 'Control' },
      { key: 'Canibalizacion', label: 'Canibalizacion', type: 'number' },
    ],
  },
];

const form = reactive({} as ClassificationValues);
const original = ref<ClassificationValues>({} as ClassificationValues);
const showSkip = ref(false);
const skipReason = ref('');
const copied = ref(false);
const showApprovalConfirmation = ref(false);

const hydrate = () => {
  const next = {} as ClassificationValues;
  FIELD_KEYS.forEach(field => { next[field] = props.detail[field] ?? null; });
  Object.assign(form, next);
  original.value = { ...next };
  showSkip.value = false;
  skipReason.value = '';
};

watch(() => props.detail.ConceptId, hydrate, { immediate: true });

const groups = computed(() => GROUPS.map(group => ({
  ...group,
  fields: group.fields.map(field => {
    const metadata = props.catalogMetadata[field.key];
    return {
      ...field,
      type: metadata?.valueType || field.type || 'text',
      required: metadata?.required ?? field.required ?? false,
      maxLength: metadata?.maxLength ?? undefined,
      allowCustom: metadata?.allowCustom ?? true,
      searchable: metadata?.searchable ?? false,
      optionCount: metadata?.optionCount ?? 0,
      options: props.catalogs[field.key] || [],
    };
  }),
})));

const modifiedCount = computed(() => FIELD_KEYS.filter(field => form[field] !== original.value[field]).length);
const suggestedCount = computed(() => props.suggestion
  ? FIELD_KEYS.filter(field => form[field] === props.suggestion?.values[field]).length
  : 0);
const correctedCount = computed(() => FIELD_KEYS.filter(field => (
  form[field] !== original.value[field]
  && (!props.suggestion || form[field] !== props.suggestion.values[field])
)).length);
const emptyCount = computed(() => FIELD_KEYS.filter(field => form[field] === null || form[field] === '').length);
const canSave = computed(() => String(form.SkuReal ?? '').trim().length > 0 && !props.saving);
const sourceLengthWarning = computed(() => props.detail.SKUMuliix.length >= 254);

const updateField = (field: ClassificationField, value: ClassificationValue) => {
  form[field] = value;
};

const applySuggestionField = (field: ClassificationField) => {
  if (props.suggestion) form[field] = props.suggestion.values[field];
};

const applyAllSuggestions = () => {
  if (!props.suggestion) return;
  FIELD_KEYS.forEach(field => { form[field] = props.suggestion!.values[field]; });
};

const requestSave = () => { if (canSave.value) showApprovalConfirmation.value = true; };
const handleSave = () => {
  showApprovalConfirmation.value = false;
  emit('save', { ...form });
};

const handleSkip = () => {
  const reason = skipReason.value.trim();
  if (reason.length >= 3) emit('skip', reason);
};

const copySource = async () => {
  await navigator.clipboard.writeText(props.detail.SKUMuliix);
  copied.value = true;
  window.setTimeout(() => { copied.value = false; }, 1500);
};
</script>

<template>
  <section class="relative min-w-0 overflow-hidden rounded-xl border border-pic-border bg-pic-surface shadow-sm">
    <div class="absolute inset-y-0 left-0 w-1 bg-pic-brand"></div>

    <div class="border-b border-slate-200 px-4 pb-4 pt-5 sm:px-5">
      <div class="flex items-start gap-3">
        <button type="button" class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 lg:hidden" @click="emit('back')">
          <i class="fa-solid fa-arrow-left"></i>
        </button>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-md bg-slate-900 px-2 py-1 font-mono text-[10px] font-black text-white">CONCEPTO #{{ detail.ConceptId }}</span>
            <span class="inline-flex items-center gap-1.5 rounded-md border border-pic-brand-border bg-pic-brand-soft px-2 py-1 text-[10px] font-black uppercase text-pic-brand">
              <i class="fa-solid fa-lock text-[9px]"></i> Reservado para ti
            </span>
            <span v-if="modifiedCount" class="rounded-md border border-[hsl(var(--pic-warning)/0.28)] bg-[hsl(var(--pic-warning)/0.08)] px-2 py-1 text-[10px] font-bold uppercase text-pic-warning">
              {{ modifiedCount }} cambios
            </span>
          </div>
          <p class="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">SKUMuliix original · solo lectura</p>
          <div class="mt-1.5 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-950 px-3 py-3 shadow-inner">
            <p class="min-w-0 flex-1 whitespace-pre-wrap break-words font-mono text-xs font-bold leading-5 text-slate-100 sm:text-sm">{{ detail.SKUMuliix }}</p>
            <button type="button" class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/10 text-slate-300 transition hover:bg-white/20 hover:text-white" :title="copied ? 'Copiado' : 'Copiar'" @click="copySource">
              <i :class="copied ? 'fa-solid fa-check' : 'fa-regular fa-copy'"></i>
            </button>
          </div>
          <p v-if="sourceLengthWarning" class="mt-2 text-[10px] font-bold text-pic-warning">
            <i class="fa-solid fa-triangle-exclamation mr-1"></i>El texto ocupa el limite observado de la columna; se conserva sin cambios.
          </p>
        </div>
      </div>
    </div>

    <form class="bg-pic-background px-4 py-4 sm:px-5 sm:py-5" @submit.prevent="requestSave">
      <div class="space-y-4">
        <StdAlert
          v-if="catalogsError"
          tone="warning"
          title="Opciones historicas no disponibles"
          :description="catalogsError"
        />
        <p v-else-if="catalogsLoading" class="text-xs font-semibold text-pic-text-muted" role="status">
          <i class="fa-solid fa-circle-notch fa-spin mr-1 text-pic-brand"></i>
          Cargando opciones historicas; la captura manual permanece disponible.
        </p>

        <ClassificationSuggestionPanel
          :suggestion="suggestion"
          :current-values="form"
          :loading="suggestionLoading"
          :error="suggestionError"
          @generate="emit('generate-suggestion')"
          @apply-all="applyAllSuggestions"
          @apply-field="applySuggestionField"
        />

        <section v-for="group in groups" :key="group.key" class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <header class="flex items-center gap-3 border-b border-slate-100 bg-slate-50/90 px-4 py-3">
            <span class="font-mono text-[10px] font-black text-pic-brand">{{ group.eyebrow }}</span>
            <span class="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-xs text-slate-500 shadow-sm">
              <i :class="group.icon"></i>
            </span>
            <h3 class="text-xs font-black uppercase tracking-[0.12em] text-slate-700">{{ group.title }}</h3>
          </header>
          <div class="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
            <ClassificationFieldInput
              v-for="field in group.fields"
              :key="field.key"
              :field-key="field.key"
              :model-value="form[field.key]"
              :original-value="original[field.key]"
              :label="field.label"
              :type="field.type"
              :required="field.required"
              :hint="field.hint"
              :options="field.options"
              :max-length="field.maxLength"
              :allow-custom="field.allowCustom"
              :searchable="field.searchable"
              :option-count="field.optionCount"
              :suggestion="suggestion?.result.fields[field.key] || null"
              @update:model-value="updateField(field.key, $event)"
              @apply-suggestion="applySuggestionField(field.key)"
            />
          </div>
        </section>
      </div>

      <section v-if="showSkip" class="mt-4 rounded-xl border border-[hsl(var(--pic-warning)/0.28)] bg-[hsl(var(--pic-warning)/0.08)] p-4">
        <label for="classification-skip-reason" class="block text-xs font-bold uppercase tracking-wide text-pic-warning">Motivo para posponer</label>
        <textarea id="classification-skip-reason" v-model="skipReason" rows="3" maxlength="500" class="mt-2 w-full resize-none rounded-lg border border-pic-border bg-pic-surface px-3 py-2 text-sm font-semibold text-pic-text-main outline-none focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-border" placeholder="Ej. Falta confirmar el SKU real con Operaciones."></textarea>
        <div class="mt-3 flex justify-end gap-2">
          <StdButton size="sm" @click="showSkip = false">Cancelar</StdButton>
          <StdButton size="sm" variant="primary" icon="fa-solid fa-forward" :disabled="skipReason.trim().length < 3 || saving" @click="handleSkip">Confirmar</StdButton>
        </div>
      </section>

      <div class="sticky bottom-3 z-10 mt-5 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xl shadow-slate-300/40 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p class="text-[10px] font-bold leading-4 text-slate-500">
          <i class="fa-solid fa-shield-halved mr-1 text-pic-brand"></i>
          NULL y “NULL” se guardan como ausencia. “NO” se conserva como valor.
        </p>
        <div class="flex shrink-0 gap-2">
          <StdButton size="sm" icon="fa-solid fa-forward" :disabled="saving" @click="showSkip = true">Posponer</StdButton>
          <StdButton type="submit" size="sm" variant="primary" :icon="saving ? 'fa-solid fa-circle-notch fa-spin' : 'fa-solid fa-check'" :disabled="!canSave">
            Aprobar y guardar
          </StdButton>
        </div>
      </div>
    </form>

    <ModalDialog v-model="showApprovalConfirmation" title="Confirmar aprobación" size="lg">
      <div class="space-y-4">
        <div class="rounded-lg border border-pic-border bg-pic-muted-surface p-3">
          <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-pic-text-muted">Concepto que se registrará</p>
          <p class="mt-2 break-words font-mono text-xs font-bold leading-5 text-pic-text-main">{{ detail.SKUMuliix }}</p>
        </div>
        <p class="text-sm font-semibold leading-5 text-pic-text-main">
          Esta acción insertará una fila completa en <span class="font-mono">ArticulosIC</span>. El valor original de <span class="font-mono">SKUMuliix</span> se conservará sin cambios.
        </p>
        <dl class="grid grid-cols-3 gap-2">
          <div class="rounded-lg border border-pic-border p-3 text-center"><dt class="text-[9px] font-bold uppercase text-pic-text-muted">Sugeridos</dt><dd class="mt-1 text-lg font-bold text-pic-info">{{ suggestedCount }}</dd></div>
          <div class="rounded-lg border border-pic-border p-3 text-center"><dt class="text-[9px] font-bold uppercase text-pic-text-muted">Corregidos</dt><dd class="mt-1 text-lg font-bold text-pic-warning">{{ correctedCount }}</dd></div>
          <div class="rounded-lg border border-pic-border p-3 text-center"><dt class="text-[9px] font-bold uppercase text-pic-text-muted">Sin valor</dt><dd class="mt-1 text-lg font-bold text-pic-text-main">{{ emptyCount }}</dd></div>
        </dl>
        <div v-if="emptyCount" class="rounded-lg border border-[hsl(var(--pic-info)/0.24)] bg-[hsl(var(--pic-info)/0.07)] px-3 py-2 text-xs font-semibold text-pic-text-muted">
          Los campos sin valor se enviarán como ausencia. “NO” permanece como un valor válido.
        </div>
      </div>
      <template #footer>
        <div class="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <StdButton :disabled="saving" @click="showApprovalConfirmation = false">Seguir revisando</StdButton>
          <StdButton variant="primary" icon="fa-solid fa-check" :disabled="saving" @click="handleSave">Confirmar e insertar</StdButton>
        </div>
      </template>
    </ModalDialog>
  </section>
</template>
