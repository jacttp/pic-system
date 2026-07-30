<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { StdAlert, StdButton, StdSection } from '@/modules/Shared/components/std';
import {
  hexToHslTriplet,
  hslTripletToHex,
  uiThemeTokenDefinitions,
  type UiThemeTokenDefinition,
} from '@/modules/Shared/design/uiTheme';
import { useUiThemeStore } from '@/modules/Shared/stores/uiThemeStore';

const themeStore = useUiThemeStore();
const {
  palettes,
  activePalette,
  activePaletteId,
  isLoading,
  isSaving,
  isDirty,
  isPersisted,
  isUsingFallback,
  lastError,
  updatedAt,
  updatedBy,
} = storeToRefs(themeStore);

const groupLabels: Record<UiThemeTokenDefinition['group'], string> = {
  base: 'Base operativa',
  navigation: 'Navegación',
  state: 'Estados',
  hub: 'Tarjeta Hub',
  module: 'Acentos de módulo',
  chart: 'Gráficas',
};

const tokenGroups = computed(() => Object.entries(groupLabels).map(([group, label]) => ({
  group,
  label,
  tokens: uiThemeTokenDefinitions.filter((definition) => definition.group === group),
})));

const statusLabel = computed(() => {
  if (lastError.value) return 'Error de persistencia';
  if (isSaving.value) return 'Guardando automáticamente';
  if (isLoading.value) return 'Cargando desde servidor';
  if (isDirty.value) return 'Pendiente de sincronizar';
  if (isUsingFallback.value || !isPersisted.value) return 'Configuración local';
  return 'Guardado en servidor';
});

const statusClasses = computed(() => {
  if (lastError.value) return 'border-[hsl(var(--pic-danger)/0.28)] bg-[hsl(var(--pic-danger)/0.08)] text-pic-danger';
  if (isLoading.value || isSaving.value) return 'border-pic-brand-border bg-pic-brand-soft text-pic-brand';
  if (isDirty.value) return 'border-[hsl(var(--pic-warning)/0.3)] bg-[hsl(var(--pic-warning)/0.1)] text-pic-warning';
  if (isUsingFallback.value || !isPersisted.value) return 'border-pic-border bg-pic-muted-surface text-pic-text-muted';
  return 'border-[hsl(var(--pic-success)/0.28)] bg-[hsl(var(--pic-success)/0.1)] text-pic-success';
});

const lastSaveLabel = computed(() => {
  if (!updatedAt.value) return '';
  const date = new Date(updatedAt.value);
  if (Number.isNaN(date.getTime())) return '';
  const formatted = new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
  return updatedBy.value ? `${formatted} · usuario #${updatedBy.value}` : formatted;
});

const isBusy = computed(() => isLoading.value || isSaving.value);

const tokenHex = (token: string) => hslTripletToHex(activePalette.value.tokens[token] || '0 0% 0%');

const updatePaletteName = (event: Event) => {
  themeStore.updatePalette(activePaletteId.value, {
    name: (event.target as HTMLInputElement).value,
  });
};

const updatePaletteDescription = (event: Event) => {
  themeStore.updatePalette(activePaletteId.value, {
    description: (event.target as HTMLTextAreaElement).value,
  });
};

const updateTokenFromColor = (token: string, event: Event) => {
  themeStore.updatePalette(activePaletteId.value, {
    tokens: { [token]: hexToHslTriplet((event.target as HTMLInputElement).value) },
  });
};

const updateTokenFromHex = (token: string, event: Event) => {
  const value = (event.target as HTMLInputElement).value.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) return;
  themeStore.updatePalette(activePaletteId.value, {
    tokens: { [token]: hexToHslTriplet(value) },
  });
};

onMounted(() => {
  void themeStore.loadThemeCatalog();
});
</script>

<template>
  <div class="space-y-4">
    <StdAlert variant="info" title="Usa el color con intención">
      Revisa el contraste y el significado de cada color antes de ajustar una paleta.
      Los estados y las acciones deben conservarse legibles en todas las superficies.
    </StdAlert>

    <StdSection
      title="Paletas del sistema"
      description="Selecciona una paleta, crea una variante o ajusta sus colores según el uso indicado para cada token."
      icon="fa-solid fa-palette"
    >
      <div class="grid gap-4 xl:grid-cols-[minmax(15rem,0.8fr)_minmax(0,2.2fr)]">
        <aside class="space-y-3 rounded-xl border border-pic-border bg-pic-muted-surface p-3">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-lg border px-2.5 py-1 text-xs font-black" :class="statusClasses">
              {{ statusLabel }}
            </span>
            <span v-if="lastSaveLabel" class="text-xs text-pic-text-muted">{{ lastSaveLabel }}</span>
          </div>

          <label class="block text-xs font-black uppercase tracking-wide text-pic-text-muted" for="ui-theme-palette">
            Paleta activa
          </label>
          <select
            id="ui-theme-palette"
            :value="activePaletteId"
            :disabled="isBusy"
            class="h-10 w-full rounded-xl border border-pic-border bg-pic-surface px-3 text-sm font-bold text-pic-text-main focus:border-pic-brand focus:outline-none focus:ring-2 focus:ring-pic-brand-border"
            @change="themeStore.setActivePalette(($event.target as HTMLSelectElement).value)"
          >
            <option v-for="palette in palettes" :key="palette.id" :value="palette.id">
              {{ palette.name }}{{ palette.isSystem ? ' · sistema' : '' }}
            </option>
          </select>

          <div class="grid grid-cols-2 gap-2">
            <StdButton size="sm" icon="fa-solid fa-plus" :disabled="isBusy" @click="themeStore.createPalette()">
              Nueva
            </StdButton>
            <StdButton size="sm" icon="fa-regular fa-copy" :disabled="isBusy" @click="themeStore.duplicatePalette(activePaletteId)">
              Duplicar
            </StdButton>
          </div>

          <StdButton
            v-if="!activePalette.isSystem"
            variant="danger"
            size="sm"
            icon="fa-solid fa-trash"
            :disabled="isBusy || palettes.length <= 1"
            @click="themeStore.deletePalette(activePaletteId)"
          >
            Eliminar paleta
          </StdButton>

          <div class="border-t border-pic-border pt-3">
            <label class="mb-1 block text-xs font-bold text-pic-text-muted" for="ui-theme-name">Nombre</label>
            <input
              id="ui-theme-name"
              :value="activePalette.name"
              class="h-9 w-full rounded-lg border border-pic-border bg-pic-surface px-3 text-sm text-pic-text-main focus:border-pic-brand focus:outline-none"
              @input="updatePaletteName"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-bold text-pic-text-muted" for="ui-theme-description">Descripción</label>
            <textarea
              id="ui-theme-description"
              :value="activePalette.description"
              rows="3"
              class="w-full rounded-lg border border-pic-border bg-pic-surface px-3 py-2 text-sm text-pic-text-main focus:border-pic-brand focus:outline-none"
              @input="updatePaletteDescription"
            ></textarea>
          </div>

          <div class="flex flex-wrap gap-2 border-t border-pic-border pt-3">
            <StdButton
              size="sm"
              icon="fa-solid fa-rotate-left"
              :disabled="isBusy || !isDirty"
              @click="themeStore.restoreThemeCatalog()"
            >
              Restaurar
            </StdButton>
            <StdButton
              variant="primary"
              size="sm"
              icon="fa-solid fa-floppy-disk"
              :disabled="isBusy || !isDirty"
              @click="themeStore.saveThemeCatalog()"
            >
              Guardar
            </StdButton>
          </div>
        </aside>

        <div class="space-y-4">
          <section
            v-for="group in tokenGroups"
            :key="group.group"
            class="overflow-hidden rounded-xl border border-pic-border bg-pic-surface"
          >
            <header class="border-b border-pic-border bg-pic-muted-surface px-4 py-3">
              <h3 class="text-sm font-black text-pic-text-main">{{ group.label }}</h3>
            </header>
            <div class="grid gap-px bg-pic-border sm:grid-cols-2 2xl:grid-cols-3">
              <article
                v-for="definition in group.tokens"
                :key="definition.token"
                class="min-w-0 bg-pic-surface p-3"
              >
                <div class="flex items-start gap-3">
                  <input
                    type="color"
                    :aria-label="`Editar ${definition.label}`"
                    :value="tokenHex(definition.token)"
                    class="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-pic-border bg-transparent p-1"
                    @input="updateTokenFromColor(definition.token, $event)"
                  />
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-black text-pic-text-main">{{ definition.label }}</p>
                    <code class="block truncate text-[11px] text-pic-brand">{{ definition.token }}</code>
                  </div>
                </div>
                <input
                  :value="tokenHex(definition.token)"
                  :aria-label="`Valor hexadecimal de ${definition.label}`"
                  class="mt-2 h-8 w-full rounded-lg border border-pic-border bg-pic-muted-surface px-2 font-mono text-xs uppercase text-pic-text-main focus:border-pic-brand focus:outline-none"
                  @change="updateTokenFromHex(definition.token, $event)"
                />
                <p class="mt-2 text-xs leading-5 text-pic-text-muted">{{ definition.usage }}</p>
              </article>
            </div>
          </section>
        </div>
      </div>
    </StdSection>
  </div>
</template>
