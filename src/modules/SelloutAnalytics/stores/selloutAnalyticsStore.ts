import { computed, reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import axios from 'axios';
import { selloutAnalyticsApi } from '../services/selloutAnalyticsApi';
import type {
  SelloutContext,
  SelloutFilters,
  SelloutMatrix,
  SelloutMatrixEntity,
  SelloutPeriodKey,
  SelloutSummary,
  SelloutSummaryRequest,
} from '../types/selloutAnalytics';

const emptyFilters = (): SelloutFilters => ({ chains: [], stores: [], brands: [], skus: [] });
const errorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) return error.response?.data?.message || error.message || fallback;
  return error instanceof Error ? error.message : fallback;
};
const periodKey = (period: SelloutPeriodKey) => `${period.year}-${String(period.week).padStart(2, '0')}`;
const storeKey = (chain: string, store: string) => `${chain}\u001f${store}`;

export const useSelloutAnalyticsStore = defineStore('sellout-analytics', () => {
  const context = ref<SelloutContext | null>(null);
  const filters = reactive<SelloutFilters>(emptyFilters());
  const selectedStartKey = ref('');
  const selectedEndKey = ref('');
  const appliedPayload = ref<SelloutSummaryRequest | null>(null);
  const summary = ref<SelloutSummary | null>(null);
  const rootMatrix = ref<SelloutMatrix | null>(null);
  const storesByChain = reactive<Record<string, SelloutMatrix>>({});
  const skusByStore = reactive<Record<string, SelloutMatrix>>({});
  const expandedChains = ref<string[]>([]);
  const expandedStores = ref<string[]>([]);
  const loadingBranches = ref<string[]>([]);
  const storeOptions = ref<string[]>([]);
  const isInitializing = ref(false);
  const isLoadingReport = ref(false);
  const isLoadingStoreOptions = ref(false);
  const error = ref('');
  const branchError = ref('');
  const filtersDirty = ref(true);

  const isReady = computed(() => Boolean(context.value));
  const lastClosedPeriod = computed(() => context.value?.lastClosedPeriod ?? null);
  const closedPeriods = computed(() => context.value?.periods.filter(period => period.isClosed) ?? []);
  const periodOptions = computed(() => closedPeriods.value.map(period => ({
    value: periodKey(period),
    label: `${period.year} · S${String(period.week).padStart(2, '0')}`,
    period: { year: period.year, week: period.week },
  })));
  const selectedPeriods = computed<SelloutPeriodKey[]>(() => {
    const startIndex = periodOptions.value.findIndex(option => option.value === selectedStartKey.value);
    const endIndex = periodOptions.value.findIndex(option => option.value === selectedEndKey.value);
    if (startIndex < 0 || endIndex < 0) return [];
    const from = Math.min(startIndex, endIndex);
    const to = Math.max(startIndex, endIndex);
    return periodOptions.value.slice(from, to + 1).map(option => option.period);
  });
  const periodSelectionError = computed(() => selectedPeriods.value.length > 53
    ? 'La matriz admite un máximo de 53 semanas por consulta.'
    : '');
  const activeFilterCount = computed(() => (
    Object.values(filters).filter(values => values.length > 0).length + (selectedPeriods.value.length > 0 ? 1 : 0)
  ));
  const periodSummary = computed(() => {
    if (selectedPeriods.value.length === 0) return 'Sin periodo';
    const first = periodKey(selectedPeriods.value[0]);
    const last = periodKey(selectedPeriods.value.at(-1)!);
    return first === last ? first : `${first} a ${last}`;
  });
  const filterSummary = computed(() => {
    const parts = [periodSummary.value];
    if (filters.chains.length) parts.push(`${filters.chains.length} cadena(s)`);
    if (filters.stores.length) parts.push(`${filters.stores.length} tienda(s)`);
    if (filters.brands.length) parts.push(`${filters.brands.length} marca(s)`);
    if (filters.skus.length) parts.push(`${filters.skus.length} SKU`);
    return parts.join(' · ');
  });
  const totalKg = computed(() => summary.value?.periods.reduce((total, period) => total + period.kg, 0) ?? 0);
  const observedWeeks = computed(() => summary.value?.periods.length ?? 0);
  const negativeRows = computed(() => summary.value?.periods.reduce((total, period) => total + period.negativeRows, 0) ?? 0);

  const currentPayload = (): SelloutSummaryRequest => ({
    periods: [...selectedPeriods.value],
    filters: {
      chains: [...filters.chains],
      stores: [...filters.stores],
      brands: [...filters.brands],
      skus: [...filters.skus],
    },
  });

  const clearBranches = () => {
    Object.keys(storesByChain).forEach(key => delete storesByChain[key]);
    Object.keys(skusByStore).forEach(key => delete skusByStore[key]);
    expandedChains.value = [];
    expandedStores.value = [];
    loadingBranches.value = [];
    branchError.value = '';
  };

  const applyDefaultPeriods = () => {
    const defaults = context.value?.defaultPeriods ?? [];
    if (defaults.length === 0) return;
    selectedStartKey.value = periodKey(defaults[0]);
    selectedEndKey.value = periodKey(defaults.at(-1)!);
  };

  async function loadStoreOptions(searchTerm = '') {
    if (selectedPeriods.value.length === 0 || isLoadingStoreOptions.value) return;
    isLoadingStoreOptions.value = true;
    try {
      const payload = currentPayload();
      const data = await selloutAnalyticsApi.getStoreOptions({
        ...payload,
        filters: { ...payload.filters, stores: [] },
        searchTerm,
        page: 1,
        pageSize: 1000,
      });
      storeOptions.value = data.options;
    } catch (cause) {
      branchError.value = errorMessage(cause, 'No fue posible cargar las tiendas disponibles.');
    } finally {
      isLoadingStoreOptions.value = false;
    }
  }

  const applyFilters = async (page = 1) => {
    const payload = currentPayload();
    if (payload.periods.length === 0 || isLoadingReport.value) return;
    if (periodSelectionError.value) {
      error.value = periodSelectionError.value;
      return;
    }
    isLoadingReport.value = true;
    error.value = '';
    clearBranches();
    try {
      const [summaryResponse, matrixResponse] = await Promise.all([
        selloutAnalyticsApi.getSummary(payload),
        selloutAnalyticsApi.getMatrix({ ...payload, level: 'chain', page, pageSize: 20 }),
      ]);
      summary.value = summaryResponse.data;
      rootMatrix.value = matrixResponse.data;
      appliedPayload.value = payload;
      filtersDirty.value = false;
    } catch (cause) {
      error.value = errorMessage(cause, 'No fue posible generar la matriz de Sellout.');
    } finally {
      isLoadingReport.value = false;
    }
  };

  const loadRootPage = async (page: number) => {
    if (!appliedPayload.value || isLoadingReport.value) return;
    isLoadingReport.value = true;
    error.value = '';
    clearBranches();
    try {
      const response = await selloutAnalyticsApi.getMatrix({
        ...appliedPayload.value,
        level: 'chain',
        page,
        pageSize: 20,
      });
      rootMatrix.value = response.data;
    } catch (cause) {
      error.value = errorMessage(cause, 'No fue posible cambiar la página de cadenas.');
    } finally {
      isLoadingReport.value = false;
    }
  };

  const initialize = async (force = false) => {
    if (isInitializing.value || (context.value && !force)) return;
    isInitializing.value = true;
    error.value = '';
    try {
      context.value = await selloutAnalyticsApi.getContext();
      applyDefaultPeriods();
      filtersDirty.value = true;
      await loadStoreOptions();
      await applyFilters();
    } catch (cause) {
      error.value = errorMessage(cause, 'No fue posible cargar el contexto de Sellout.');
    } finally {
      isInitializing.value = false;
    }
  };

  const setBranchLoading = (key: string, value: boolean) => {
    loadingBranches.value = value
      ? [...new Set([...loadingBranches.value, key])]
      : loadingBranches.value.filter(item => item !== key);
  };

  const loadStores = async (chain: string, page = 1) => {
    if (!appliedPayload.value) return;
    const loadingKey = `chain:${chain}`;
    setBranchLoading(loadingKey, true);
    branchError.value = '';
    try {
      const response = await selloutAnalyticsApi.getMatrix({
        ...appliedPayload.value,
        level: 'store',
        parent: { chain },
        page,
        pageSize: 50,
      });
      storesByChain[chain] = response.data;
    } catch (cause) {
      branchError.value = errorMessage(cause, `No fue posible cargar las tiendas de ${chain}.`);
    } finally {
      setBranchLoading(loadingKey, false);
    }
  };

  const toggleChain = async (entity: SelloutMatrixEntity) => {
    const chain = entity.chain;
    if (expandedChains.value.includes(chain)) {
      expandedChains.value = expandedChains.value.filter(value => value !== chain);
      expandedStores.value = expandedStores.value.filter(value => !value.startsWith(`${chain}\u001f`));
      return;
    }
    expandedChains.value = [...expandedChains.value, chain];
    if (!storesByChain[chain]) await loadStores(chain);
  };

  const loadSkus = async (chain: string, store: string, page = 1) => {
    if (!appliedPayload.value) return;
    const key = storeKey(chain, store);
    const loadingKey = `store:${key}`;
    setBranchLoading(loadingKey, true);
    branchError.value = '';
    try {
      const response = await selloutAnalyticsApi.getMatrix({
        ...appliedPayload.value,
        level: 'sku',
        parent: { chain, store },
        page,
        pageSize: 50,
      });
      skusByStore[key] = response.data;
    } catch (cause) {
      branchError.value = errorMessage(cause, `No fue posible cargar los SKU de la tienda ${store}.`);
    } finally {
      setBranchLoading(loadingKey, false);
    }
  };

  const toggleStore = async (entity: SelloutMatrixEntity) => {
    if (!entity.store) return;
    const key = storeKey(entity.chain, entity.store);
    if (expandedStores.value.includes(key)) {
      expandedStores.value = expandedStores.value.filter(value => value !== key);
      return;
    }
    expandedStores.value = [...expandedStores.value, key];
    if (!skusByStore[key]) await loadSkus(entity.chain, entity.store);
  };

  const resetFilters = async () => {
    Object.assign(filters, emptyFilters());
    applyDefaultPeriods();
    filtersDirty.value = true;
    await loadStoreOptions();
  };

  return {
    context, filters, selectedStartKey, selectedEndKey, appliedPayload, summary, rootMatrix,
    storesByChain, skusByStore, expandedChains, expandedStores, loadingBranches, storeOptions,
    isInitializing, isLoadingReport, isLoadingStoreOptions, error, branchError, filtersDirty,
    isReady, lastClosedPeriod, periodOptions, selectedPeriods, periodSelectionError, activeFilterCount, filterSummary,
    totalKg, observedWeeks, negativeRows,
    initialize, markDirty: () => { filtersDirty.value = true; }, loadStoreOptions, applyFilters,
    loadRootPage, toggleChain, toggleStore, loadStores, loadSkus,
    resetFilters,
  };
});
