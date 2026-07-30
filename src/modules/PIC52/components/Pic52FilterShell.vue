<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { storeToRefs } from 'pinia';
import FilterDropdown from '@/modules/Shared/components/FilterDropdown.vue';
import { StdButton } from '@/modules/Shared/components/std';
import Pic52WeekRangeSelector from './Pic52WeekRangeSelector.vue';
import { usePic52Store, type Pic52ReportMode } from '../stores/pic52Store';
import type { Pic52Filters, Pic52ProductOptions } from '../types/pic52';

type FilterKey = keyof Pic52Filters;
type MobileSection = 'commercial' | 'client' | 'product' | 'configuration' | 'period';

interface Props {
  matrixSelectorOpen?: boolean;
}

interface FilterDefinition {
  key: FilterKey;
  label: string;
  placeholder: string;
  productKey?: keyof Pic52ProductOptions;
}

interface FilterGroup {
  id: Extract<MobileSection, 'commercial' | 'client' | 'product'>;
  title: string;
  icon: string;
  filters: FilterDefinition[];
}

const props = withDefaults(defineProps<Props>(), {
  matrixSelectorOpen: false,
});

const emit = defineEmits<{
  (event: 'apply', mode: Pic52ReportMode): void;
  (event: 'open-matrix-selector'): void;
}>();

const store = usePic52Store();
const {
  selected,
  selectedYears,
  transactionSelections,
  weeks,
  options,
  productOptions,
  dependentLoading,
  isReportLoading,
  isInitializing,
  isReady,
  filtersDirty,
  appliedPayload,
  appliedMode,
  reportError,
  isGerenciaLocked,
  isJefaturaLocked,
  availableYears,
  transactionValues,
  comparisonYears,
  weekValues,
  hasRequiredSelection,
} = storeToRefs(store);

const filterPanel = ref<HTMLElement | null>(null);
const isCollapsed = ref(true);
const overflowVisible = ref(false);
const openDropdownCount = ref(0);
const isResetting = ref(false);
let overflowTimer: ReturnType<typeof setTimeout> | null = null;

const mobileSections = reactive<Record<MobileSection, boolean>>({
  commercial: true,
  client: false,
  product: false,
  configuration: false,
  period: false,
});

const yearModel = computed<string[]>({
  get: () => selectedYears.value.map(String),
  set: value => {
    selectedYears.value = value
      .map(Number)
      .filter(Number.isInteger)
      .sort((left, right) => right - left);
  },
});

const transactionModel = computed<string[]>({
  get: () => transactionSelections.value,
  set: value => {
    store.setTransactionSelections(value);
  },
});

const yearOptions = computed(() => availableYears.value.map(String));
const selectedMatrixText = computed(() => {
  if (selected.value.matrices.length === 0) return 'Todas las matrices';
  if (selected.value.matrices.length === 1) return selected.value.matrices[0];
  return `${selected.value.matrices.length} matrices seleccionadas`;
});
const activeFilterCount = computed(() => {
  const dimensionCount = Object.values(selected.value)
    .filter(values => Array.isArray(values) && values.length > 0)
    .length;
  const periodRestricted = weeks.value.length !== weekValues.value.length ? 1 : 0;
  return dimensionCount
    + (selectedYears.value.length > 0 ? 1 : 0)
    + (transactionSelections.value.length > 0 ? 1 : 0)
    + periodRestricted;
});
const weekEnd = computed(() => [...weeks.value].sort((left, right) => left - right).at(-1) ?? 1);
const periodSummary = computed(() => {
  const years = comparisonYears.value.length
    ? comparisonYears.value.join(', ')
    : 'Sin años';
  return `${years} · SEM-1–${weekEnd.value}`;
});
const panelStatus = computed(() => {
  if (isInitializing.value) return { text: 'Cargando filtros', tone: 'loading' };
  if (!isReady.value) return { text: 'Filtros no disponibles', tone: 'error' };
  if (isReportLoading.value) return { text: 'Consultando reporte', tone: 'loading' };
  if (filtersDirty.value) return { text: 'Cambios sin aplicar', tone: 'dirty' };
  if (reportError.value) return { text: 'Error al consultar', tone: 'error' };
  if (appliedPayload.value) return { text: 'Reporte actualizado', tone: 'ready' };
  return { text: 'Listo para consultar', tone: 'idle' };
});
const liveStatusText = computed(() => {
  if (isInitializing.value) return 'Cargando catálogos';
  if (isReportLoading.value) return 'Consultando reporte semanal';
  if (dependentLoading.value.jefaturas || dependentLoading.value.rutas) {
    return 'Actualizando estructura comercial';
  }
  if (dependentLoading.value.products) return 'Actualizando producto';
  return isReady.value ? 'Catálogos listos' : 'Sin conexión';
});
const actionsDisabled = computed(() => (
  !isReady.value
  || !hasRequiredSelection.value
  || isReportLoading.value
  || isResetting.value
));

const groups: FilterGroup[] = [
  {
    id: 'commercial',
    title: 'Comercial',
    icon: 'fa-solid fa-briefcase',
    filters: [
      { key: 'canales', label: 'Canal', placeholder: 'Todos los canales' },
      { key: 'gerencias', label: 'Gerencia', placeholder: 'Todas las gerencias' },
      { key: 'jefaturas', label: 'Jefatura', placeholder: 'Todas las jefaturas' },
      { key: 'rutas', label: 'Ruta', placeholder: 'Todas las rutas' },
    ],
  },
  {
    id: 'client',
    title: 'Clientes',
    icon: 'fa-solid fa-users',
    filters: [
      { key: 'formatos', label: 'Formato cliente', placeholder: 'Todos los formatos' },
    ],
  },
  {
    id: 'product',
    title: 'Producto',
    icon: 'fa-solid fa-box-open',
    filters: [
      { key: 'marcas', productKey: 'marcas', label: 'Marca', placeholder: 'Todas las marcas' },
      { key: 'gruposSku', productKey: 'gruposSku', label: 'Grupo SKU', placeholder: 'Todos los grupos' },
      { key: 'categorias', productKey: 'categorias', label: 'Categoría', placeholder: 'Todas las categorías' },
      { key: 'gruposComercialesA', productKey: 'gruposComercialesA', label: 'Grupo comercial A', placeholder: 'Todos' },
      { key: 'gruposComercialesB', productKey: 'gruposComercialesB', label: 'Grupo comercial B', placeholder: 'Todos' },
      { key: 'skus', productKey: 'skus', label: 'SKU', placeholder: 'Todos los SKU' },
    ],
  },
];

const filterOptions = (filter: FilterDefinition) => {
  if (filter.productKey) return productOptions.value[filter.productKey];
  if (filter.key === 'canales') return options.value.canales;
  if (filter.key === 'gerencias') return options.value.gerencias;
  if (filter.key === 'jefaturas') return options.value.jefaturas;
  if (filter.key === 'rutas') return options.value.rutas;
  if (filter.key === 'formatos') return options.value.formatos;
  return [];
};

const isFilterLoading = (filter: FilterDefinition) => {
  if (filter.productKey) return dependentLoading.value.products;
  if (filter.key === 'jefaturas') return dependentLoading.value.jefaturas;
  if (filter.key === 'rutas') return dependentLoading.value.rutas;
  return false;
};

const isFilterDisabled = (filter: FilterDefinition) => {
  if (!isReady.value) return true;
  if (filter.key === 'gerencias') return isGerenciaLocked.value;
  if (filter.key === 'jefaturas') {
    return isJefaturaLocked.value || selected.value.gerencias.length === 0;
  }
  if (filter.key === 'rutas') return selected.value.jefaturas.length === 0;
  return false;
};

const handleFilterChange = async (filter: FilterDefinition) => {
  if (filter.key === 'gerencias') return store.handleGerenciasChange();
  if (filter.key === 'jefaturas') return store.handleJefaturasChange();
  if (filter.productKey) return store.handleProductChange(filter.productKey);
};

const setCollapsed = (value: boolean) => {
  isCollapsed.value = value;
  if (overflowTimer) clearTimeout(overflowTimer);
  if (value) {
    overflowVisible.value = false;
    return;
  }
  overflowTimer = setTimeout(() => {
    overflowVisible.value = true;
  }, 220);
};

const toggleMobileSection = (section: MobileSection) => {
  mobileSections[section] = !mobileSections[section];
};

const handleDropdownOpen = (isOpen: boolean) => {
  openDropdownCount.value = Math.max(0, openDropdownCount.value + (isOpen ? 1 : -1));
};

const handleClickOutside = (event: MouseEvent) => {
  if (
    isCollapsed.value
    || props.matrixSelectorOpen
    || openDropdownCount.value > 0
    || filterPanel.value?.contains(event.target as Node)
  ) {
    return;
  }
  setCollapsed(true);
};

const handleApply = async (mode: Pic52ReportMode) => {
  const payload = await store.applyFilters(mode);
  if (!payload) {
    setCollapsed(false);
    return;
  }
  setCollapsed(true);
  emit('apply', mode);
};

const handleReset = async () => {
  isResetting.value = true;
  setCollapsed(false);
  try {
    await store.resetFilters();
  } finally {
    isResetting.value = false;
  }
};

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside);
  if (overflowTimer) clearTimeout(overflowTimer);
});
</script>

<template>
  <section
    ref="filterPanel"
    class="relative z-40 w-full border-b border-pic-border bg-pic-surface text-pic-text-main shadow-sm"
  >
    <div class="flex min-h-[56px] flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between md:px-4 lg:px-6">
      <button
        type="button"
        class="flex min-w-0 items-center gap-3 text-left"
        :title="isCollapsed ? 'Expandir filtros' : 'Contraer filtros'"
        @click="setCollapsed(!isCollapsed)"
      >
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pic-brand text-white shadow-sm shadow-pic-brand/20">
          <i class="fa-solid" :class="isCollapsed ? 'fa-filter' : 'fa-sliders'"></i>
        </span>
        <span class="min-w-0">
          <span class="flex items-center gap-2">
            <span class="text-sm font-extrabold uppercase tracking-wide">Filtros</span>
            <span class="rounded-md bg-pic-muted-surface px-2 py-0.5 text-[11px] font-bold text-pic-text-muted">
              {{ activeFilterCount }} activos
            </span>
          </span>
          <span class="mt-0.5 block truncate text-xs font-medium text-pic-text-muted">
            {{ periodSummary }}
          </span>
        </span>
      </button>

      <div class="flex min-w-0 flex-wrap items-center justify-end gap-2">
        <span
          class="inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-bold"
          :class="{
            'border-[hsl(var(--pic-warning)/0.36)] bg-[hsl(var(--pic-warning)/0.10)] text-pic-warning': panelStatus.tone === 'dirty',
            'border-pic-brand-border bg-pic-brand-soft text-pic-brand': panelStatus.tone === 'ready',
            'border-pic-border bg-pic-muted-surface text-pic-text-muted': panelStatus.tone === 'idle',
            'border-[hsl(var(--pic-info)/0.30)] bg-[hsl(var(--pic-info)/0.08)] text-pic-info': panelStatus.tone === 'loading',
            'border-[hsl(var(--pic-danger)/0.30)] bg-[hsl(var(--pic-danger)/0.08)] text-pic-danger': panelStatus.tone === 'error',
          }"
        >
          <i
            class="fa-solid text-[9px]"
            :class="{
              'fa-triangle-exclamation': panelStatus.tone === 'dirty' || panelStatus.tone === 'error',
              'fa-circle-check': panelStatus.tone === 'ready',
              'fa-circle-dot': panelStatus.tone === 'idle',
              'fa-circle-notch fa-spin': panelStatus.tone === 'loading',
            }"
          ></i>
          {{ panelStatus.text }}
        </span>

        <StdButton
          class="hidden lg:inline-flex"
          size="sm"
          variant="ghost"
          icon="fa-solid fa-trash-can"
          :disabled="!isReady || isReportLoading || isResetting"
          @click="handleReset"
        >
          Limpiar
        </StdButton>
        <StdButton
          size="sm"
          variant="primary"
          icon="fa-solid fa-eye"
          :disabled="actionsDisabled"
          @click="handleApply('table')"
        >
          {{ isReportLoading && appliedMode === 'table' ? 'Consultando' : 'Visualizar' }}
        </StdButton>
        <button
          type="button"
          class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-pic-brand-border bg-pic-brand-soft text-pic-brand shadow-sm transition hover:bg-pic-brand hover:text-white focus:outline-none focus:ring-2 focus:ring-pic-brand-border"
          :title="isCollapsed ? 'Expandir filtros' : 'Contraer filtros'"
          @click="setCollapsed(!isCollapsed)"
        >
          <i class="fa-solid" :class="isCollapsed ? 'fa-filter' : 'fa-sliders'"></i>
        </button>
      </div>
    </div>

    <div
      class="transition-all duration-300 ease-in-out"
      :class="[
        isCollapsed ? 'max-h-0 overflow-hidden opacity-0' : 'max-h-[78vh] opacity-100',
        overflowVisible && !isCollapsed ? 'overflow-visible' : 'overflow-hidden',
      ]"
    >
      <div class="max-h-[calc(78vh-56px)] overflow-y-auto px-3 py-3 md:px-4 lg:px-6 xl:max-h-none xl:overflow-visible">
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <section
            v-for="group in groups"
            :key="group.id"
            class="rounded-lg border border-pic-border bg-pic-muted-surface p-3"
          >
            <button
              type="button"
              class="mb-2 flex w-full items-center justify-between border-b border-pic-border pb-2 text-left md:pointer-events-none"
              @click="toggleMobileSection(group.id)"
            >
              <span class="text-[11px] font-bold uppercase tracking-widest text-pic-text-muted">
                <i :class="group.icon" class="mr-1.5 text-pic-brand"></i>
                {{ group.title }}
              </span>
              <i
                class="fa-solid fa-chevron-down text-[10px] text-pic-text-muted transition-transform md:hidden"
                :class="{ 'rotate-180': mobileSections[group.id] }"
              ></i>
            </button>

            <div
              class="space-y-2"
              :class="mobileSections[group.id] ? 'block' : 'hidden md:block'"
            >
              <div v-if="group.id === 'client'">
                <label class="mb-1 ml-1 block text-[9px] font-bold uppercase tracking-wider text-pic-text-muted">
                  Cliente · Matriz
                </label>
                <button
                  type="button"
                  class="flex h-8 w-full items-center justify-between rounded-lg border border-pic-border bg-pic-surface px-2.5 text-left text-xs shadow-sm transition hover:border-pic-brand-border focus:outline-none focus:ring-2 focus:ring-pic-brand-border disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="!isReady"
                  @click="emit('open-matrix-selector')"
                >
                  <span
                    class="truncate font-medium"
                    :class="selected.matrices.length ? 'text-pic-brand' : 'text-pic-text-muted'"
                  >
                    {{ selectedMatrixText }}
                  </span>
                  <i class="fa-solid fa-magnifying-glass text-[10px] text-pic-text-muted"></i>
                </button>
              </div>

              <div v-for="filter in group.filters" :key="filter.key">
                <FilterDropdown
                  v-model="selected[filter.key]"
                  density="compact"
                  :label="filter.label"
                  :options="filterOptions(filter)"
                  :placeholder="filter.placeholder"
                  :disabled="isFilterDisabled(filter)"
                  :loading="isFilterLoading(filter)"
                  @change="handleFilterChange(filter)"
                  @open-change="handleDropdownOpen"
                />
                <p
                  v-if="filter.key === 'gerencias' && isGerenciaLocked"
                  class="mt-1 px-1 text-[9px] font-semibold text-pic-brand"
                >
                  <i class="fa-solid fa-lock mr-1"></i>Asignada por tu perfil
                </p>
                <p
                  v-if="filter.key === 'jefaturas' && isJefaturaLocked"
                  class="mt-1 px-1 text-[9px] font-semibold text-pic-brand"
                >
                  <i class="fa-solid fa-lock mr-1"></i>Asignada por tu perfil
                </p>
              </div>
            </div>
          </section>

          <section class="rounded-lg border border-pic-border bg-pic-muted-surface p-3">
            <button
              type="button"
              class="mb-2 flex w-full items-center justify-between border-b border-pic-border pb-2 text-left md:pointer-events-none"
              @click="toggleMobileSection('configuration')"
            >
              <span class="text-[11px] font-bold uppercase tracking-widest text-pic-text-muted">
                <i class="fa-solid fa-gears mr-1.5 text-pic-brand"></i>
                Configuración
              </span>
              <i
                class="fa-solid fa-chevron-down text-[10px] text-pic-text-muted transition-transform md:hidden"
                :class="{ 'rotate-180': mobileSections.configuration }"
              ></i>
            </button>
            <div :class="mobileSections.configuration ? 'block' : 'hidden md:block'">
              <FilterDropdown
                v-model="transactionModel"
                density="compact"
                label="Transacción"
                :options="transactionValues"
                placeholder="Seleccione transacciones"
                :show-select-all="false"
                :disabled="!isReady"
                @change="store.handleConfigurationChange"
                @open-change="handleDropdownOpen"
              />
            </div>
          </section>

          <section class="rounded-lg border border-pic-border bg-pic-muted-surface p-3">
            <button
              type="button"
              class="mb-2 flex w-full items-center justify-between border-b border-pic-border pb-2 text-left md:pointer-events-none"
              @click="toggleMobileSection('period')"
            >
              <span class="text-[11px] font-bold uppercase tracking-widest text-pic-text-muted">
                <i class="fa-regular fa-calendar mr-1.5 text-pic-brand"></i>
                Periodo
              </span>
              <i
                class="fa-solid fa-chevron-down text-[10px] text-pic-text-muted transition-transform md:hidden"
                :class="{ 'rotate-180': mobileSections.period }"
              ></i>
            </button>
            <div
              class="space-y-3"
              :class="mobileSections.period ? 'block' : 'hidden md:block'"
            >
              <FilterDropdown
                v-model="yearModel"
                density="compact"
                label="Año(s)"
                :options="yearOptions"
                placeholder="Seleccione años"
                :disabled="!isReady"
                @change="store.handleConfigurationChange"
                @open-change="handleDropdownOpen"
              />
              <Pic52WeekRangeSelector
                v-model="weeks"
                :available-weeks="weekValues"
                :disabled="!isReady"
              />
            </div>
          </section>
        </div>

        <div class="sticky bottom-0 mt-3 flex flex-col gap-2 border-t border-pic-border bg-pic-surface/95 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p class="text-xs font-medium text-pic-text-muted">
            <span
              class="mr-2 inline-flex h-2 w-2 rounded-sm"
              :class="isReady ? 'bg-pic-success' : 'bg-pic-danger'"
            ></span>
            <span class="mr-2 font-bold text-pic-text-main">{{ liveStatusText }}</span>
            <span v-if="filtersDirty">Los cambios se aplican al consultar el reporte.</span>
            <span v-else>Selección aplicada para {{ appliedPayload?.weeks.length }} semanas.</span>
          </p>
          <div class="flex flex-wrap items-center justify-end gap-2">
            <StdButton
              size="sm"
              variant="ghost"
              icon="fa-solid fa-trash-can"
              :disabled="!isReady || isReportLoading || isResetting"
              @click="handleReset"
            >
              Limpiar filtros
            </StdButton>
            <StdButton
              size="sm"
              variant="primary"
              icon="fa-solid fa-eye"
              :disabled="actionsDisabled"
              @click="handleApply('table')"
            >
              {{ isReportLoading && appliedMode === 'table' ? 'Consultando' : 'Visualizar' }}
            </StdButton>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
