<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { StdFilterPanelStatus } from '@/modules/Shared/components/std';
import {
  StdAlert,
  StdButton,
  StdFilterGroup,
  StdFilterPanel,
  StdPageHeader,
} from '@/modules/Shared/components/std';
import FilterDropdown from '@/modules/Shared/components/FilterDropdown.vue';
import SelloutMatrixTable from '../components/SelloutMatrixTable.vue';
import { useSelloutExport } from '../composables/useSelloutExport';
import { useSelloutAnalyticsStore } from '../stores/selloutAnalyticsStore';

const store = useSelloutAnalyticsStore();
const { isExporting, exportError, exportWorkbook } = useSelloutExport();
const kgFormatter = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 3 });
const filtersCollapsed = ref(false);

const filterStatus = computed<StdFilterPanelStatus>(() => {
  if (store.error) return 'error';
  if (store.isInitializing || store.isLoadingReport) return 'loading';
  if (store.filtersDirty) return 'dirty';
  return store.rootMatrix ? 'ready' : 'idle';
});
const reportPeriods = computed(() => store.appliedPayload?.periods ?? []);
const skuOptions = computed(() => store.context?.skus.map(option => option.value) ?? []);
const totalKgLabel = computed(() => `${kgFormatter.format(store.totalKg)} kg`);
const chainCountLabel = computed(() => String(store.rootMatrix?.pagination.totalEntities ?? 0));
const negativeLabel = computed(() => String(store.negativeRows));
const reportStats = computed(() => [
  {
    label: 'Volumen filtrado', value: totalKgLabel.value,
    detail: 'Suma neta del periodo', icon: 'fa-solid fa-weight-scale', tone: 'brand',
  },
  {
    label: 'Semanas observadas', value: String(store.observedWeeks),
    detail: `${reportPeriods.value.length} periodos solicitados`, icon: 'fa-solid fa-calendar-week', tone: 'blue',
  },
  {
    label: 'Cadenas en resultado', value: chainCountLabel.value,
    detail: 'Después de aplicar filtros', icon: 'fa-solid fa-store', tone: 'teal',
  },
  {
    label: 'Registros negativos', value: negativeLabel.value,
    detail: 'Se conservan como netos', icon: 'fa-solid fa-arrow-trend-down', tone: 'danger',
  },
]);

const statToneClasses: Record<string, string> = {
  brand: 'bg-pic-brand-soft text-pic-brand',
  blue: 'bg-[hsl(var(--pic-accent-blue-soft))] text-[hsl(var(--pic-accent-blue))]',
  teal: 'bg-[hsl(var(--pic-accent-teal-soft))] text-[hsl(var(--pic-accent-teal))]',
  danger: 'bg-[hsl(var(--pic-danger)/0.10)] text-pic-danger',
};

const handleFilterChange = () => store.markDirty();
const handleStoreOpen = (open: boolean) => {
  if (open) store.loadStoreOptions();
};
const handleApply = () => store.applyFilters(1);
const handleExport = () => {
  if (store.appliedPayload) exportWorkbook(store.appliedPayload);
};
const handleStorePage = (payload: { chain: string; page: number }) => store.loadStores(payload.chain, payload.page);
const handleSkuPage = (payload: { chain: string; store: string; page: number }) => (
  store.loadSkus(payload.chain, payload.store, payload.page)
);

onMounted(() => store.initialize());
</script>

<template>
  <main class="min-h-full bg-pic-background font-sans">
    <div class="mx-auto max-w-[1680px]">
      <div class="px-3 pt-4 sm:px-5 lg:px-7">
        <StdPageHeader
          eyebrow="Analitica / Sellout"
          title="Desplazamiento semanal"
          description="Explora kilogramos netos por cadena, tienda y SKU sobre semanas PIC cerradas."
          icon="fa-solid fa-chart-area"
          meta="Fase 2 · Matriz operativa"
        >
          <template #actions>
            <StdButton
              variant="secondary"
              size="sm"
              icon="fa-solid fa-file-excel"
              :disabled="!store.appliedPayload || isExporting || store.isLoadingReport"
              @click="handleExport"
            >
              {{ isExporting ? 'Exportando' : 'Exportar XLSX' }}
            </StdButton>
            <StdButton
              variant="secondary"
              size="sm"
              icon="fa-solid fa-rotate"
              :disabled="store.isInitializing"
              @click="store.initialize(true)"
            >
              Actualizar fuente
            </StdButton>
          </template>
        </StdPageHeader>
      </div>

      <div class="mt-4">
        <StdFilterPanel
          :collapsed="filtersCollapsed"
          :active-count="store.activeFilterCount"
          :summary="store.filterSummary"
          :status="filterStatus"
          :loading="store.isLoadingReport"
          title="Corte analítico"
          apply-label="Generar matriz"
          @update:collapsed="filtersCollapsed = $event"
          @apply="handleApply"
          @reset="store.resetFilters"
        >
          <StdFilterGroup title="Periodo PIC" icon="fa-solid fa-calendar-range" description="Solo semanas cerradas">
            <div class="grid grid-cols-2 gap-2">
              <label class="text-[9px] font-bold uppercase text-pic-text-muted">
                Desde
                <select
                  v-model="store.selectedStartKey"
                  class="mt-1 h-8 w-full rounded-lg border border-pic-border bg-pic-surface px-2 text-xs font-semibold text-pic-text-main focus:border-pic-brand focus:outline-none focus:ring-2 focus:ring-pic-brand-border"
                  @change="handleFilterChange"
                >
                  <option v-for="option in store.periodOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </label>
              <label class="text-[9px] font-bold uppercase text-pic-text-muted">
                Hasta
                <select
                  v-model="store.selectedEndKey"
                  class="mt-1 h-8 w-full rounded-lg border border-pic-border bg-pic-surface px-2 text-xs font-semibold text-pic-text-main focus:border-pic-brand focus:outline-none focus:ring-2 focus:ring-pic-brand-border"
                  @change="handleFilterChange"
                >
                  <option v-for="option in store.periodOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </label>
            </div>
          </StdFilterGroup>

          <StdFilterGroup title="Cadenas" icon="fa-solid fa-store" description="Una o varias cadenas">
            <FilterDropdown
              v-model="store.filters.chains"
              :options="store.context?.chains ?? []"
              density="compact"
              placeholder="Todas las cadenas"
              @change="handleFilterChange"
            />
          </StdFilterGroup>

          <StdFilterGroup title="Tiendas" icon="fa-solid fa-shop" description="Código de Matriz">
            <FilterDropdown
              v-model="store.filters.stores"
              :options="store.storeOptions"
              :loading="store.isLoadingStoreOptions"
              density="compact"
              placeholder="Todas las tiendas"
              @change="handleFilterChange"
              @open-change="handleStoreOpen"
            />
          </StdFilterGroup>

          <StdFilterGroup title="Marcas" icon="fa-solid fa-tag" description="Marca publicada del SKU">
            <FilterDropdown
              v-model="store.filters.brands"
              :options="store.context?.brands ?? []"
              density="compact"
              placeholder="Todas las marcas"
              @change="handleFilterChange"
            />
          </StdFilterGroup>

          <StdFilterGroup title="SKU" icon="fa-solid fa-boxes-stacked" description="Código Muliix normalizado">
            <FilterDropdown
              v-model="store.filters.skus"
              :options="skuOptions"
              density="compact"
              placeholder="Todos los SKU"
              @change="handleFilterChange"
            />
          </StdFilterGroup>
          <template #status-detail>
            <p v-if="store.periodSelectionError" class="mt-1 text-xs font-bold text-pic-danger">
              {{ store.periodSelectionError }}
            </p>
          </template>
        </StdFilterPanel>
      </div>

      <div class="space-y-4 px-3 py-4 sm:px-5 lg:px-7">
        <StdAlert
          v-if="store.error"
          title="No fue posible generar la matriz"
          :description="store.error"
          tone="danger"
        />
        <StdAlert
          v-else-if="store.isInitializing"
          title="Preparando el contexto de Sellout"
          description="Se están resolviendo periodos cerrados y catálogos disponibles."
          tone="info"
        />
        <StdAlert
          v-else
          title="Completitud de carga no confirmada"
          description="Una celda vacía significa que no existe registro publicado. No se transforma en cero."
          tone="warning"
        />
        <StdAlert
          v-if="store.branchError"
          title="No se pudo abrir un nivel de detalle"
          :description="store.branchError"
          tone="danger"
        />
        <StdAlert
          v-if="exportError"
          title="No fue posible exportar"
          :description="exportError"
          tone="danger"
        />

        <section v-if="store.rootMatrix" class="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Resumen filtrado">
          <article
            v-for="stat in reportStats"
            :key="stat.label"
            class="rounded-xl border border-pic-border bg-pic-surface p-3 shadow-sm sm:p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-[9px] font-black uppercase tracking-wide text-pic-text-muted sm:text-[10px]">{{ stat.label }}</p>
                <p class="mt-2 truncate font-mono text-lg font-black text-pic-text-main sm:text-xl">{{ stat.value }}</p>
                <p class="mt-1 text-[10px] font-semibold leading-4 text-pic-text-muted sm:text-xs">{{ stat.detail }}</p>
              </div>
              <span class="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:flex" :class="statToneClasses[stat.tone]">
                <i :class="stat.icon"></i>
              </span>
            </div>
          </article>
        </section>

        <SelloutMatrixTable
          :periods="reportPeriods"
          :root="store.rootMatrix"
          :stores-by-chain="store.storesByChain"
          :skus-by-store="store.skusByStore"
          :expanded-chains="store.expandedChains"
          :expanded-stores="store.expandedStores"
          :loading-branches="store.loadingBranches"
          :loading="store.isLoadingReport"
          @toggle-chain="store.toggleChain"
          @toggle-store="store.toggleStore"
          @root-page="store.loadRootPage"
          @store-page="handleStorePage"
          @sku-page="handleSkuPage"
        />
      </div>
    </div>
  </main>
</template>
