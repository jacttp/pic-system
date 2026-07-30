import { computed, reactive, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import axios from 'axios';
import { pic52Api } from '../services/pic52Api';
import type {
  Pic52Catalogs,
  Pic52Filters,
  Pic52ProductOptions,
  Pic52Report,
  Pic52ReportRequest,
  Pic52UserContext,
} from '../types/pic52';

export type Pic52ReportMode = 'table' | 'chart' | 'print';

const emptyFilters = (): Pic52Filters => ({
  canales: [],
  gerencias: [],
  jefaturas: [],
  rutas: [],
  matrices: [],
  formatos: [],
  marcas: [],
  gruposSku: [],
  categorias: [],
  gruposComercialesA: [],
  gruposComercialesB: [],
  skus: [],
});

const emptyProducts = (): Pic52ProductOptions => ({
  marcas: [],
  gruposSku: [],
  categorias: [],
  gruposComercialesA: [],
  gruposComercialesB: [],
  skus: [],
});

const errorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
};

const productOrder: Array<keyof Pic52ProductOptions> = [
  'marcas',
  'gruposSku',
  'categorias',
  'gruposComercialesA',
  'gruposComercialesB',
  'skus',
];

export const usePic52Store = defineStore('pic52', () => {
  const selected = reactive<Pic52Filters>(emptyFilters());
  const catalogs = ref<Pic52Catalogs | null>(null);
  const context = ref<Pic52UserContext | null>(null);
  const selectedYears = ref<number[]>([]);
  const transactionSelections = ref<string[]>(['Venta', 'NC']);
  const weeks = ref<number[]>(Array.from({ length: 52 }, (_, index) => index + 1));
  const options = reactive({
    canales: [] as string[],
    gerencias: [] as string[],
    jefaturas: [] as string[],
    rutas: [] as string[],
    formatos: [] as string[],
  });
  const productOptions = reactive<Pic52ProductOptions>(emptyProducts());
  const dependentLoading = reactive({ jefaturas: false, rutas: false, products: false });
  const isInitializing = ref(false);
  const isReady = ref(false);
  const initializationError = ref('');
  const dependentError = ref('');
  const filtersDirty = ref(true);
  const appliedPayload = ref<Pic52ReportRequest | null>(null);
  const appliedMode = ref<Pic52ReportMode | null>(null);
  const report = ref<Pic52Report | null>(null);
  const reportError = ref('');
  const isReportLoading = ref(false);
  const reportFromCache = ref(false);
  let productRequestId = 0;
  let reportRequestId = 0;

  const isGerenciaLocked = computed(() => Boolean(context.value?.gerencia));
  const isJefaturaLocked = computed(() => Boolean(context.value?.jefatura));
  const availableYears = computed(() => catalogs.value?.years ?? []);
  const transactionValues = computed(() => {
    const values = (catalogs.value?.transactions ?? [])
      .flatMap(option => option.sourceTransactions)
      .filter(value => value.toLocaleLowerCase('es-MX') !== 'ventas');
    return [...new Set(values)];
  });
  const transaction = computed(() => {
    const normalized = transactionSelections.value
      .map(value => value.toLocaleLowerCase('es-MX'))
      .sort();
    if (normalized.length === 2 && normalized[0] === 'nc' && normalized[1] === 'venta') {
      return 'Ventas';
    }
    return transactionSelections.value.length === 1 ? transactionSelections.value[0] : '';
  });
  const comparisonYears = computed(() => [...selectedYears.value].sort((left, right) => right - left));
  const weekValues = computed(() => {
    const hasWeek53 = selectedYears.value.some(
      year => catalogs.value?.weeksByYear[String(year)]?.includes(53),
    );
    return Array.from({ length: hasWeek53 ? 53 : 52 }, (_, index) => index + 1);
  });
  const hasRequiredSelection = computed(() =>
    selectedYears.value.length > 0 && Boolean(transaction.value) && weeks.value.length > 0,
  );
  const hasObservedReportData = computed(() => (
    report.value?.series.some(series => series.totals.observedWeeks > 0) ?? false
  ));

  const buildPayload = (): Pic52ReportRequest => ({
    years: [...selectedYears.value].sort((left, right) => right - left),
    weeks: [...weeks.value].sort((left, right) => left - right),
    transaction: transaction.value,
    filters: Object.fromEntries(
      Object.entries(selected).map(([key, values]) => [key, [...values]]),
    ) as unknown as Pic52Filters,
  });

  watch([selected, selectedYears, transactionSelections, weeks], () => {
    if (isReady.value) filtersDirty.value = true;
  }, { deep: true });

  const loadJefaturas = async () => {
    options.jefaturas = [];
    if (selected.gerencias.length === 0) return;
    dependentLoading.jefaturas = true;
    try {
      options.jefaturas = await pic52Api.getJefaturas(selected.gerencias);
    } catch (error) {
      dependentError.value = errorMessage(error, 'No fue posible cargar las jefaturas.');
    } finally {
      dependentLoading.jefaturas = false;
    }
  };

  const loadRutas = async () => {
    options.rutas = [];
    if (selected.jefaturas.length === 0) return;
    dependentLoading.rutas = true;
    try {
      options.rutas = await pic52Api.getRutas(selected.jefaturas);
    } catch (error) {
      dependentError.value = errorMessage(error, 'No fue posible cargar las rutas.');
    } finally {
      dependentLoading.rutas = false;
    }
  };

  const clearProductSelection = () => {
    productOrder.forEach(key => {
      selected[key] = [];
      productOptions[key] = [];
    });
  };

  const refreshProductOptions = async (updateFromIndex = 0) => {
    if (!catalogs.value || selectedYears.value.length === 0 || !transaction.value) return;
    const requestId = ++productRequestId;
    dependentLoading.products = true;
    dependentError.value = '';
    try {
      const data = await pic52Api.getProductOptions(
        [...selectedYears.value],
        transaction.value,
        {
          ...emptyFilters(),
          marcas: [...selected.marcas],
          gruposSku: [...selected.gruposSku],
          categorias: [...selected.categorias],
          gruposComercialesA: [...selected.gruposComercialesA],
          gruposComercialesB: [...selected.gruposComercialesB],
          skus: [...selected.skus],
        },
      );
      if (requestId === productRequestId) {
        productOrder.slice(updateFromIndex).forEach(key => {
          productOptions[key] = data[key];
        });
      }
    } catch (error) {
      if (requestId === productRequestId) {
        dependentError.value = errorMessage(error, 'No fue posible cargar la cascada de producto.');
      }
    } finally {
      if (requestId === productRequestId) dependentLoading.products = false;
    }
  };

  const applyContext = async () => {
    if (context.value?.gerencia) {
      selected.gerencias = [context.value.gerencia];
      if (!options.gerencias.includes(context.value.gerencia)) {
        options.gerencias = [context.value.gerencia, ...options.gerencias];
      }
      await loadJefaturas();
    }
    if (context.value?.jefatura) {
      selected.jefaturas = [context.value.jefatura];
      if (!options.jefaturas.includes(context.value.jefatura)) {
        options.jefaturas = [context.value.jefatura, ...options.jefaturas];
      }
      await loadRutas();
    }
  };

  const initialize = async (force = false) => {
    if (isInitializing.value || (isReady.value && !force)) return;
    isInitializing.value = true;
    initializationError.value = '';
    dependentError.value = '';
    try {
      const [catalogData, contextData, canales, gerencias, formatos] = await Promise.all([
        pic52Api.getCatalogs(),
        pic52Api.getUserContext(),
        pic52Api.getCanales(),
        pic52Api.getGerencias(),
        pic52Api.getFormatos(),
      ]);
      catalogs.value = catalogData;
      context.value = contextData;
      options.canales = canales;
      options.gerencias = gerencias;
      options.formatos = formatos;
      selectedYears.value = [
        ...(catalogData.defaultYears?.length
          ? catalogData.defaultYears
          : catalogData.years.slice(0, 3)),
      ];
      const defaultTransaction = catalogData.transactions.find(option => option.value === 'Ventas')
        ?? catalogData.transactions[0];
      transactionSelections.value = defaultTransaction
        ? [...defaultTransaction.sourceTransactions]
        : [];
      weeks.value = [...weekValues.value];
      await applyContext();
      isReady.value = true;
      await refreshProductOptions();
      filtersDirty.value = true;
    } catch (error) {
      isReady.value = false;
      initializationError.value = errorMessage(
        error,
        'No fue posible inicializar los filtros del Reporte PIC 52S.',
      );
    } finally {
      isInitializing.value = false;
    }
  };

  const handleGerenciasChange = async () => {
    if (isGerenciaLocked.value) return;
    selected.jefaturas = [];
    selected.rutas = [];
    options.rutas = [];
    await loadJefaturas();
  };

  const handleJefaturasChange = async () => {
    if (isJefaturaLocked.value) return;
    selected.rutas = [];
    await loadRutas();
  };

  const handleProductChange = async (key: keyof Pic52ProductOptions) => {
    const changedIndex = productOrder.indexOf(key);
    productOrder.slice(changedIndex + 1).forEach(downstreamKey => {
      selected[downstreamKey] = [];
      productOptions[downstreamKey] = [];
    });
    if (changedIndex < productOrder.length - 1) {
      await refreshProductOptions(changedIndex + 1);
    }
  };

  const handleConfigurationChange = async () => {
    const orderedWeeks = [...weeks.value].sort((left, right) => left - right);
    const previousEnd = orderedWeeks.at(-1) ?? 0;
    const wasFullYear = orderedWeeks[0] === 1
      && previousEnd >= 52
      && orderedWeeks.length === previousEnd;
    weeks.value = wasFullYear
      ? [...weekValues.value]
      : orderedWeeks.filter(week => weekValues.value.includes(week));
    if (weeks.value.length === 0) weeks.value = weekValues.value.filter(week => week <= 52);
    clearProductSelection();
    await refreshProductOptions();
  };

  const setTransactionSelections = (values: string[]) => {
    const uniqueValues = [...new Set(values)];
    const normalized = uniqueValues.map(value => value.toLocaleLowerCase('es-MX')).sort();
    const isSalesPair = normalized.length === 2
      && normalized[0] === 'nc'
      && normalized[1] === 'venta';

    if (uniqueValues.length <= 1 || isSalesPair) {
      transactionSelections.value = uniqueValues;
      return;
    }

    const newlyAdded = uniqueValues.find(value => !transactionSelections.value.includes(value));
    transactionSelections.value = newlyAdded ? [newlyAdded] : uniqueValues.slice(-1);
  };

  const loadReport = async (payload: Pic52ReportRequest) => {
    const requestId = ++reportRequestId;
    isReportLoading.value = true;
    reportError.value = '';
    reportFromCache.value = false;
    report.value = null;

    try {
      const response = await pic52Api.getReport(payload);
      if (requestId !== reportRequestId) return null;
      report.value = response.data;
      reportFromCache.value = Boolean(response.meta?.cached);
      return response.data;
    } catch (error) {
      if (requestId === reportRequestId) {
        reportError.value = errorMessage(error, 'No fue posible generar el Reporte PIC 52S.');
      }
      return null;
    } finally {
      if (requestId === reportRequestId) isReportLoading.value = false;
    }
  };

  const applyFilters = async (mode: Pic52ReportMode) => {
    if (!hasRequiredSelection.value || mode === 'print') return null;
    const payload = buildPayload();
    appliedPayload.value = payload;
    appliedMode.value = mode;
    filtersDirty.value = false;
    const result = await loadReport(payload);
    return result ? payload : null;
  };

  const retryReport = async () => {
    if (!appliedPayload.value) return null;
    return loadReport(appliedPayload.value);
  };

  const clearMatrices = () => {
    selected.matrices = [];
  };

  const resetFilters = async () => {
    if (!catalogs.value) return;

    const defaults = emptyFilters();
    (Object.keys(defaults) as Array<keyof Pic52Filters>).forEach(key => {
      selected[key] = [];
    });
    options.jefaturas = [];
    options.rutas = [];
    clearProductSelection();

    selectedYears.value = [
      ...(catalogs.value.defaultYears?.length
        ? catalogs.value.defaultYears
        : catalogs.value.years.slice(0, 3)),
    ];
    const defaultTransaction = catalogs.value.transactions.find(option => option.value === 'Ventas')
      ?? catalogs.value.transactions[0];
    transactionSelections.value = defaultTransaction
      ? [...defaultTransaction.sourceTransactions]
      : [];
    weeks.value = [...weekValues.value];

    dependentError.value = '';
    await applyContext();
    await refreshProductOptions();
    filtersDirty.value = true;
  };

  const retryDependentOptions = async () => {
    dependentError.value = '';
    if (selected.gerencias.length > 0) await loadJefaturas();
    if (selected.jefaturas.length > 0) await loadRutas();
  };

  return {
    selected,
    catalogs,
    context,
    selectedYears,
    transaction,
    transactionSelections,
    weeks,
    options,
    productOptions,
    dependentLoading,
    isInitializing,
    isReady,
    initializationError,
    dependentError,
    filtersDirty,
    appliedPayload,
    appliedMode,
    report,
    reportError,
    isReportLoading,
    reportFromCache,
    isGerenciaLocked,
    isJefaturaLocked,
    availableYears,
    transactionValues,
    comparisonYears,
    weekValues,
    hasRequiredSelection,
    hasObservedReportData,
    buildPayload,
    initialize,
    handleGerenciasChange,
    handleJefaturasChange,
    handleProductChange,
    handleConfigurationChange,
    setTransactionSelections,
    refreshProductOptions,
    clearProductSelection,
    retryDependentOptions,
    applyFilters,
    retryReport,
    clearMatrices,
    resetFilters,
  };
});
