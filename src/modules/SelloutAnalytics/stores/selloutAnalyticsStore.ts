import { computed, reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import axios from 'axios';
import { selloutAnalyticsApi } from '../services/selloutAnalyticsApi';
import type {
  SelloutContext,
  SelloutComparisonMeasure,
  SelloutComparisonMode,
  SelloutComparisonOption,
  SelloutComparisonSeries,
  SelloutComparisonWindow,
  SelloutDropRanking,
  SelloutFilters,
  SelloutMatrix,
  SelloutMatrixEntity,
  SelloutMatrixLevel,
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
  const dropRanking = ref<SelloutDropRanking | null>(null);
  const rankingLevel = ref<SelloutMatrixLevel>('store');
  const comparisonLevel = ref<SelloutMatrixLevel>('chain');
  const comparisonMode = ref<SelloutComparisonMode>('timeline');
  const comparisonMeasure = ref<SelloutComparisonMeasure>('kg');
  const comparisonWindow = ref<SelloutComparisonWindow>(13);
  const comparisonOptions = ref<SelloutComparisonOption[]>([]);
  const selectedComparisonEntities = ref<string[]>([]);
  const comparisonSeries = ref<SelloutComparisonSeries | null>(null);
  const isInitializing = ref(false);
  const isLoadingReport = ref(false);
  const isLoadingStoreOptions = ref(false);
  const isLoadingRanking = ref(false);
  const isLoadingComparison = ref(false);
  const error = ref('');
  const branchError = ref('');
  const rankingError = ref('');
  const comparisonError = ref('');
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

  const comparisonPeriods = computed<SelloutPeriodKey[]>(() => {
    const appliedPeriods = appliedPayload.value?.periods ?? [];
    const endPeriod = appliedPeriods.at(-1);
    if (!endPeriod) return [];
    const endKey = periodKey(endPeriod);
    const available = closedPeriods.value.filter(period => (
      period.year < endPeriod.year || (period.year === endPeriod.year && period.week <= endPeriod.week)
    ));
    const aligned = comparisonMode.value === 'yearOverYear'
      ? available.filter(period => period.year === endPeriod.year)
      : available;
    const endIndex = aligned.findIndex(period => periodKey(period) === endKey);
    const candidates = endIndex >= 0 ? aligned.slice(0, endIndex + 1) : aligned;
    const selected = comparisonWindow.value === 'all'
      ? candidates
      : candidates.slice(-comparisonWindow.value);
    return selected.map(period => ({ year: period.year, week: period.week }));
  });

  const currentComparisonPayload = (): SelloutSummaryRequest => ({
    periods: [...comparisonPeriods.value],
    filters: appliedPayload.value ? {
      chains: [...appliedPayload.value.filters.chains],
      stores: [...appliedPayload.value.filters.stores],
      brands: [...appliedPayload.value.filters.brands],
      skus: [...appliedPayload.value.filters.skus],
    } : emptyFilters(),
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
      await Promise.all([
        loadDropRanking(rankingLevel.value),
        loadComparisonOptions(comparisonLevel.value),
      ]);
    } catch (cause) {
      error.value = errorMessage(cause, 'No fue posible generar la matriz de Sellout.');
    } finally {
      isLoadingReport.value = false;
    }
  };

  const loadDropRanking = async (level: SelloutMatrixLevel = rankingLevel.value) => {
    if (!appliedPayload.value) return;
    rankingLevel.value = level;
    rankingError.value = '';
    if (appliedPayload.value.periods.length < 2) {
      dropRanking.value = null;
      return;
    }
    isLoadingRanking.value = true;
    try {
      dropRanking.value = await selloutAnalyticsApi.getDropRanking({
        ...appliedPayload.value,
        level,
        limit: 10,
      });
    } catch (cause) {
      dropRanking.value = null;
      rankingError.value = errorMessage(cause, 'No fue posible calcular el ranking de caídas.');
    } finally {
      isLoadingRanking.value = false;
    }
  };

  const loadComparisonSeries = async () => {
    if (!appliedPayload.value || selectedComparisonEntities.value.length === 0) {
      comparisonSeries.value = null;
      return;
    }
    isLoadingComparison.value = true;
    comparisonError.value = '';
    try {
      comparisonSeries.value = await selloutAnalyticsApi.getComparisonSeries({
        ...currentComparisonPayload(),
        level: comparisonLevel.value,
        entities: [...selectedComparisonEntities.value],
        comparisonMode: comparisonMode.value,
      });
    } catch (cause) {
      comparisonSeries.value = null;
      comparisonError.value = errorMessage(cause, 'No fue posible cargar las líneas comparativas.');
    } finally {
      isLoadingComparison.value = false;
    }
  };

  const loadComparisonOptions = async (level: SelloutMatrixLevel = comparisonLevel.value) => {
    if (!appliedPayload.value) return;
    comparisonLevel.value = level;
    if (
      comparisonMode.value === 'yearOverYear'
      && new Set(appliedPayload.value.periods.map(period => period.year)).size !== 1
    ) {
      comparisonMode.value = 'timeline';
    }
    isLoadingComparison.value = true;
    comparisonError.value = '';
    try {
      const data = await selloutAnalyticsApi.getComparisonOptions({
        ...currentComparisonPayload(),
        level,
      });
      comparisonOptions.value = data.options;
      const available = new Set(data.options.map(option => option.value));
      const limit = comparisonMode.value === 'yearOverYear' ? 1 : 6;
      const preserved = selectedComparisonEntities.value.filter(value => available.has(value)).slice(0, limit);
      selectedComparisonEntities.value = preserved.length
        ? preserved
        : data.options.slice(0, Math.min(3, limit)).map(option => option.value);
      await loadComparisonSeries();
    } catch (cause) {
      comparisonOptions.value = [];
      selectedComparisonEntities.value = [];
      comparisonSeries.value = null;
      comparisonError.value = errorMessage(cause, 'No fue posible cargar las entidades comparables.');
    } finally {
      isLoadingComparison.value = false;
    }
  };

  const toggleComparisonEntity = async (value: string) => {
    const selected = selectedComparisonEntities.value;
    if (selected.includes(value)) {
      selectedComparisonEntities.value = selected.filter(item => item !== value);
    } else {
      const limit = comparisonMode.value === 'yearOverYear' ? 1 : 6;
      selectedComparisonEntities.value = [...selected, value].slice(-limit);
    }
    await loadComparisonSeries();
  };

  const setComparisonEntities = async (values: string[]) => {
    const limit = comparisonMode.value === 'yearOverYear' ? 1 : 6;
    selectedComparisonEntities.value = [...new Set(values)].slice(-limit);
    await loadComparisonSeries();
  };

  const setComparisonMode = async (mode: SelloutComparisonMode) => {
    comparisonMode.value = mode;
    if (mode === 'yearOverYear') selectedComparisonEntities.value = selectedComparisonEntities.value.slice(0, 1);
    await loadComparisonSeries();
  };

  const setComparisonWindow = async (window: SelloutComparisonWindow) => {
    comparisonWindow.value = window;
    await loadComparisonSeries();
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
    dropRanking, rankingLevel, comparisonLevel, comparisonMode, comparisonMeasure, comparisonWindow,
    comparisonPeriods,
    comparisonOptions, selectedComparisonEntities, comparisonSeries,
    isInitializing, isLoadingReport, isLoadingStoreOptions, isLoadingRanking, isLoadingComparison,
    error, branchError, rankingError, comparisonError, filtersDirty,
    isReady, lastClosedPeriod, periodOptions, selectedPeriods, periodSelectionError, activeFilterCount, filterSummary,
    totalKg, observedWeeks, negativeRows,
    initialize, markDirty: () => { filtersDirty.value = true; }, loadStoreOptions, applyFilters,
    loadRootPage, toggleChain, toggleStore, loadStores, loadSkus, loadDropRanking,
    loadComparisonOptions, loadComparisonSeries, toggleComparisonEntity, setComparisonEntities,
    setComparisonMode, setComparisonWindow,
    resetFilters,
  };
});
