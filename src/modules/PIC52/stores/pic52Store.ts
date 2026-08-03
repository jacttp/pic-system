import { computed, reactive, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import axios from 'axios';
import { pic52Api } from '../services/pic52Api';
import type {
  Pic52Catalogs,
  Pic52Filters,
  Pic52ProductOptions,
  Pic52ProductDimension,
  Pic52Report,
  Pic52ReportRequest,
  Pic52TrendData,
  Pic52TrendJob,
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
  const transactionSelections = ref<string[]>(['Ventas']);
  const compareTransactions = ref(false);
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
  const trendData = ref<Pic52TrendData | null>(null);
  const trendJob = ref<Pic52TrendJob | null>(null);
  const trendError = ref('');
  const isTrendLoading = ref(false);
  const trendFromCache = ref(false);
  let productRequestId = 0;
  let reportRequestId = 0;
  let trendRequestId = 0;
  let productOptionsTransaction = '';

  const isGerenciaLocked = computed(() => Boolean(context.value?.gerencia));
  const isJefaturaLocked = computed(() => Boolean(context.value?.jefatura));
  const availableYears = computed(() => catalogs.value?.years ?? []);
  const transactionOptions = computed(() => (catalogs.value?.transactions ?? [])
    .filter(option => !['venta', 'nc'].includes(option.value.toLocaleLowerCase('es-MX'))));
  const transaction = computed(() => {
    const sales = transactionSelections.value.find(
      value => value.toLocaleLowerCase('es-MX') === 'ventas',
    );
    return sales ?? transactionSelections.value[0] ?? '';
  });
  const trendProductCandidate = computed<Pic52ProductDimension | null>(() => {
    const dimensions: Pic52ProductDimension[] = [
      'skus',
      'gruposComercialesB',
      'gruposComercialesA',
      'categorias',
      'gruposSku',
      'marcas',
    ];
    return dimensions.find(key => selected[key].length >= 2) ?? null;
  });
  const trendProductDimension = computed<Pic52ProductDimension | null>(() => {
    const dimension = trendProductCandidate.value;
    return dimension && selected[dimension].length <= 8 ? dimension : null;
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
    transactions: compareTransactions.value
      ? [...transactionSelections.value]
      : [transaction.value],
    trend: trendProductDimension.value
      ? { productDimension: trendProductDimension.value }
      : undefined,
    filters: Object.fromEntries(
      Object.entries(selected).map(([key, values]) => [key, [...values]]),
    ) as unknown as Pic52Filters,
  });

  const stopTrendTracking = (clearState = true) => {
    trendRequestId += 1;
    isTrendLoading.value = false;
    if (!clearState) return;
    trendJob.value = null;
    trendData.value = null;
    trendError.value = '';
    trendFromCache.value = false;
  };

  watch([selected, selectedYears, transactionSelections, weeks], () => {
    if (isReady.value) {
      filtersDirty.value = true;
      stopTrendTracking();
    }
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
        productOptionsTransaction = transaction.value;
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
        ? [defaultTransaction.value]
        : [];
      compareTransactions.value = false;
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

  const handleTransactionChange = async () => {
    if (transaction.value === productOptionsTransaction) return;
    clearProductSelection();
    await refreshProductOptions();
  };

  const setTransactionSelections = (values: string[]) => {
    const uniqueValues = [...new Set(values)].slice(0, 8);
    if (compareTransactions.value) {
      transactionSelections.value = uniqueValues;
      return;
    }

    const newlyAdded = uniqueValues.find(value => !transactionSelections.value.includes(value));
    transactionSelections.value = newlyAdded
      ? [newlyAdded]
      : uniqueValues.slice(-1);
  };

  const setCompareTransactions = (value: boolean) => {
    compareTransactions.value = value;
    if (!value && transaction.value) {
      transactionSelections.value = [transaction.value];
    }
  };

  const loadReport = async (payload: Pic52ReportRequest) => {
    const requestId = ++reportRequestId;
    stopTrendTracking();
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

  const loadTrend = async () => {
    if (!appliedPayload.value || isTrendLoading.value) return null;
    const requestId = ++trendRequestId;
    isTrendLoading.value = true;
    trendError.value = '';
    trendFromCache.value = false;
    trendData.value = null;
    trendJob.value = null;

    try {
      let response = await pic52Api.createTrendJob(appliedPayload.value);
      while (requestId === trendRequestId) {
        const job = response.data;
        trendJob.value = job;
        trendFromCache.value = Boolean(response.meta?.cached || job.cached);

        if (job.status === 'completed') {
          trendData.value = job.result ?? null;
          isTrendLoading.value = false;
          if (!job.result) {
            trendError.value = 'La tendencia termino sin un resultado disponible.';
          }
          return job.result ?? null;
        }
        if (job.status === 'failed') {
          trendError.value = job.message || 'No fue posible generar la tendencia continua.';
          isTrendLoading.value = false;
          return null;
        }
        if (job.status === 'cancelled') {
          isTrendLoading.value = false;
          return null;
        }

        await new Promise(resolve => window.setTimeout(resolve, 2000));
        if (requestId !== trendRequestId) return null;
        response = await pic52Api.getTrendJob(job.jobId);
      }
      return null;
    } catch (error) {
      if (requestId === trendRequestId) {
        trendError.value = errorMessage(
          error,
          'La generacion ya no esta disponible. Vuelve a generarla.',
        );
      }
      return null;
    } finally {
      if (requestId === trendRequestId) isTrendLoading.value = false;
    }
  };

  const retryTrend = async () => loadTrend();

  const cancelTrend = async () => {
    const jobId = trendJob.value?.jobId;
    if (!jobId || !isTrendLoading.value) return null;
    trendRequestId += 1;
    isTrendLoading.value = false;
    trendError.value = '';
    try {
      const response = await pic52Api.cancelTrendJob(jobId);
      trendJob.value = response.data;
      return response.data;
    } catch (error) {
      trendError.value = errorMessage(error, 'No fue posible cancelar la generacion.');
      return null;
    }
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
      ? [defaultTransaction.value]
      : [];
    compareTransactions.value = false;
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
    compareTransactions,
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
    trendData,
    trendJob,
    trendError,
    isTrendLoading,
    trendFromCache,
    isGerenciaLocked,
    isJefaturaLocked,
    availableYears,
    transactionOptions,
    trendProductDimension,
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
    handleTransactionChange,
    setTransactionSelections,
    setCompareTransactions,
    refreshProductOptions,
    clearProductSelection,
    retryDependentOptions,
    applyFilters,
    retryReport,
    loadTrend,
    retryTrend,
    cancelTrend,
    stopTrendTracking,
    clearMatrices,
    resetFilters,
  };
});
