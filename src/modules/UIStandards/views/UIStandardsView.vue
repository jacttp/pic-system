<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  StdAlert,
  StdButton,
  StdDataTable,
  StdKpiCard,
  StdPageHeader,
  StdSection,
  StdSwitch,
} from '@/modules/Shared/components/std';
import UiEChartPreview from '../components/UiEChartPreview.vue';
import {
  chartTokens,
  colorTokens,
  componentExamples,
  dashboardPatterns,
  kpiExamples,
  tableColumns,
  tableRows,
} from '../utils/uiStandardsCatalog';
import { applyUiThemePreset, getStoredUiThemePreset, uiThemePresets } from '../utils/uiTheme';

const selectedRows = ref<Array<string | number>>([101]);
const sortKey = ref('id');
const sortDirection = ref<'asc' | 'desc'>('asc');
const switchEnabled = ref(true);
const activeSegment = ref('Mes');
const activeTab = ref('Catalogo');
const sliderValue = ref(60);
const stepperValue = ref(1);
const selectedThemeId = ref('pic-red');

const segments = ['Dia', 'Semana', 'Mes', 'Ano'];
const tabs = ['Catalogo', 'Tokens', 'Patrones'];
const calendarDays = Array.from({ length: 35 }, (_, index) => index + 1);
const chartExamples = [
  { type: 'line' as const, title: 'Lineas' },
  { type: 'bar' as const, title: 'Barras' },
  { type: 'stacked' as const, title: 'Apiladas' },
  { type: 'area' as const, title: 'Area' },
  { type: 'donut' as const, title: 'Dona' },
  { type: 'radar' as const, title: 'Radar' },
];

const statusMeta = {
  available: {
    label: 'Disponible',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  pattern: {
    label: 'Patron visual',
    className: 'border-pic-brand-border bg-pic-brand-soft text-pic-brand',
  },
  planned: {
    label: 'Pendiente',
    className: 'border-slate-200 bg-slate-50 text-slate-500',
  },
};

const navigationGroups = computed(() => {
  const groups = [
    {
      title: 'Configuracion',
      links: [{ id: 'configuration', title: 'Configuracion UI' }],
    },
  ];

  componentExamples.forEach((item) => {
    let group = groups.find((entry) => entry.title === item.group);
    if (!group) {
      group = { title: item.group, links: [] };
      groups.push(group);
    }
    group.links.push({ id: item.id, title: item.title });
  });

  groups.push({
    title: 'Adopcion',
    links: [
      { id: 'usage', title: 'Uso en modulos' },
      { id: 'roadmap', title: 'Camino a seguir' },
    ],
  });

  return groups;
});

const tokenGroups = computed(() => [
  { title: 'Paleta base', tokens: colorTokens },
  { title: 'Graficas', tokens: chartTokens },
]);

const selectedTheme = computed(() => uiThemePresets.find((preset) => preset.id === selectedThemeId.value) || uiThemePresets[0]!);
const tableSelectionLabel = computed(() => `${selectedRows.value.length} seleccionados`);

const getComponent = (id: string) => componentExamples.find((item) => item.id === id)!;

onMounted(() => {
  const storedPreset = getStoredUiThemePreset();
  selectedThemeId.value = storedPreset.id;
  applyUiThemePreset(storedPreset);
});

const handleSort = (key: string) => {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
    return;
  }

  sortKey.value = key;
  sortDirection.value = 'asc';
};

const handleSelectRow = (key: string | number) => {
  if (selectedRows.value.includes(key)) {
    selectedRows.value = selectedRows.value.filter((item) => item !== key);
    return;
  }

  selectedRows.value = [...selectedRows.value, key];
};

const incrementStepper = (amount: number) => {
  stepperValue.value = Math.max(0, stepperValue.value + amount);
};

const handleThemeChange = (themeId: string) => {
  const nextTheme = uiThemePresets.find((preset) => preset.id === themeId);
  if (!nextTheme) return;
  selectedThemeId.value = nextTheme.id;
  applyUiThemePreset(nextTheme);
};
</script>

<template>
  <main class="min-h-full bg-pic-background px-4 py-5 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-[1540px] space-y-5">
      <StdPageHeader
        eyebrow="Sistema / UI Standards"
        title="Configuracion UI y catalogo STD"
        description="Consola para definir la paleta activa, consultar componentes reutilizables y acordar patrones visuales para nuevos modulos PIC."
        icon="fa-solid fa-swatchbook"
        meta="v1 frontend tokens"
      />

      <div class="grid grid-cols-1 gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside class="xl:sticky xl:top-5 xl:self-start">
          <StdSection title="Indice del modulo" eyebrow="Navegacion" density="compact" icon="fa-solid fa-list">
            <nav class="space-y-4">
              <div v-for="group in navigationGroups" :key="group.title">
                <p class="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-400">
                  {{ group.title }}
                </p>
                <div class="space-y-1">
                  <a
                    v-for="link in group.links"
                    :key="link.id"
                    :href="`#${link.id}`"
                    class="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-xs font-black text-slate-600 transition hover:border-pic-brand-border hover:bg-pic-brand-soft hover:text-pic-brand"
                  >
                    <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-pic-brand"></span>
                    <span class="truncate">{{ link.title }}</span>
                  </a>
                </div>
              </div>
            </nav>
          </StdSection>
        </aside>

        <section class="min-w-0 space-y-5">
          <StdSection
            id="configuration"
            title="Configuracion UI"
            eyebrow="Paleta activa"
            description="La paleta se aplica a variables CSS --pic-* y hoy se persiste en localStorage. La siguiente fase es mover esta preferencia a Setup/backend."
            icon="fa-solid fa-palette"
          >
            <div class="grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1fr)_420px]">
              <div class="space-y-4">
                <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <button
                    v-for="preset in uiThemePresets"
                    :key="preset.id"
                    type="button"
                    class="rounded-lg border bg-white p-4 text-left transition"
                    :class="selectedThemeId === preset.id ? 'border-pic-brand bg-pic-brand-soft ring-2 ring-pic-brand-border' : 'border-slate-200 hover:border-pic-brand-border hover:bg-pic-brand-soft'"
                    @click="handleThemeChange(preset.id)"
                  >
                    <div class="mb-3 flex items-center gap-2">
                      <span
                        v-for="(value, tokenName) in preset.values"
                        :key="tokenName"
                        class="h-5 w-5 rounded-full border border-white shadow-sm ring-1 ring-slate-200"
                        :style="{ backgroundColor: `hsl(${value})` }"
                      ></span>
                    </div>
                    <p class="text-sm font-black text-slate-900">{{ preset.name }}</p>
                    <p class="mt-1 text-xs font-semibold leading-5 text-slate-500">{{ preset.description }}</p>
                  </button>
                </div>

                <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p class="text-[10px] font-black uppercase text-slate-500">Preset activo</p>
                      <p class="mt-1 text-sm font-black text-slate-900">{{ selectedTheme.name }}</p>
                      <p class="mt-1 text-xs font-semibold leading-5 text-slate-500">
                        Afecta acentos, foco, series de ECharts y componentes que usan tokens pic-*.
                      </p>
                    </div>
                    <span class="inline-flex h-8 items-center rounded-lg border border-pic-brand bg-pic-brand px-3 text-xs font-black text-white">
                      Aplicado localmente
                    </span>
                  </div>
                </div>

                <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div v-for="group in tokenGroups" :key="group.title">
                    <h3 class="mb-3 text-xs font-black uppercase text-slate-500">{{ group.title }}</h3>
                    <div class="space-y-2">
                      <article
                        v-for="token in group.tokens"
                        :key="token.name"
                        class="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3"
                      >
                        <span class="h-9 w-9 shrink-0 rounded-lg border border-slate-200" :class="token.className" :style="{ backgroundColor: token.className ? undefined : token.value }"></span>
                        <div class="min-w-0 flex-1">
                          <p class="text-xs font-black text-slate-900">{{ token.name }}</p>
                          <p class="truncate text-[11px] font-semibold text-slate-500">{{ token.usage }}</p>
                        </div>
                        <span class="font-mono text-[10px] font-bold text-slate-400">{{ token.value }}</span>
                      </article>
                    </div>
                  </div>
                </div>
              </div>

              <div class="rounded-lg border border-slate-200 bg-white p-4">
                <div class="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p class="text-[10px] font-black uppercase text-pic-brand">Preview de impacto</p>
                    <h3 class="mt-1 text-sm font-black text-slate-900">Componentes con tokens</h3>
                  </div>
                  <StdButton size="sm" variant="primary" icon="fa-solid fa-check">CTA</StdButton>
                </div>
                <div class="space-y-3">
                  <StdKpiCard
                    label="Ingresos activos"
                    value="$24.58M"
                    detail="+12.5% vs LY"
                    trend="up"
                    tone="brand"
                    icon="fa-solid fa-chart-line"
                    sparkline="M2 28 L14 22 L26 26 L38 14 L50 20 L62 12 L74 18 L86 8 L100 12"
                  />
                  <UiEChartPreview :key="`preview-${selectedThemeId}`" type="area" title="Serie con paleta activa" />
                  <div class="overflow-hidden rounded-lg border border-slate-200 text-xs">
                    <div class="grid grid-cols-3 bg-pic-brand-soft font-black text-pic-brand">
                      <span class="px-3 py-2">ID</span>
                      <span class="px-3 py-2">Estado</span>
                      <span class="px-3 py-2 text-right">Valor</span>
                    </div>
                    <div class="grid grid-cols-3 border-t border-slate-100 font-semibold text-slate-600">
                      <span class="px-3 py-2">101</span>
                      <span class="px-3 py-2">Activo</span>
                      <span class="px-3 py-2 text-right">$120.00</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </StdSection>

          <StdSection
            id="layout"
            title="Layout y navegacion"
            eyebrow="Componente STD"
            :description="getComponent('layout').description"
            icon="fa-solid fa-layer-group"
          >
            <div class="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
              <article class="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p class="text-[10px] font-black uppercase text-slate-500">Nombre para pedirlo</p>
                <p class="mt-1 text-sm font-black text-slate-900">{{ getComponent('layout').standardName }}</p>
              </article>
              <article class="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p class="text-[10px] font-black uppercase text-slate-500">Fuente</p>
                <p class="mt-1 font-mono text-xs font-semibold text-slate-600">{{ getComponent('layout').source }}</p>
              </article>
              <article class="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p class="text-[10px] font-black uppercase text-slate-500">Estado</p>
                <span class="mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black" :class="statusMeta[getComponent('layout').status].className">
                  {{ statusMeta[getComponent('layout').status].label }}
                </span>
              </article>
            </div>

            <div class="grid grid-cols-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div class="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <div class="mb-4 flex items-center gap-2">
                  <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-pic-brand ring-1 ring-slate-200">
                    <i class="fa-solid fa-cube"></i>
                  </span>
                  <span class="h-2 w-24 rounded bg-slate-200"></span>
                </div>
                <div class="space-y-2">
                  <span class="block h-9 rounded-lg bg-pic-brand-soft ring-1 ring-pic-brand-border"></span>
                  <span class="block h-9 rounded-lg bg-white ring-1 ring-slate-200"></span>
                  <span class="block h-9 rounded-lg bg-white ring-1 ring-slate-200"></span>
                  <span class="block h-9 rounded-lg bg-white ring-1 ring-slate-200"></span>
                </div>
              </div>

              <div class="space-y-3">
                <div class="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div class="flex min-w-0 items-center gap-2">
                    <StdButton size="icon" icon="fa-solid fa-bars" />
                    <div class="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-400">
                      Buscar en modulo...
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <StdButton size="sm" icon="fa-solid fa-filter">Filtros</StdButton>
                    <StdButton size="sm" variant="primary" icon="fa-solid fa-plus">Nuevo</StdButton>
                  </div>
                </div>

                <div class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-500">
                  Inicio <i class="fa-solid fa-chevron-right mx-2 text-[9px] text-slate-300"></i>
                  Analitica <i class="fa-solid fa-chevron-right mx-2 text-[9px] text-slate-300"></i>
                  Resumen
                </div>

                <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div class="rounded-lg border border-slate-200 bg-white p-4">
                    <div class="h-3 w-20 rounded bg-slate-200"></div>
                    <div class="mt-5 h-16 rounded bg-slate-50"></div>
                  </div>
                  <div class="rounded-lg border border-slate-200 bg-white p-4">
                    <div class="h-3 w-24 rounded bg-slate-200"></div>
                    <div class="mt-5 h-16 rounded bg-slate-50"></div>
                  </div>
                  <div class="rounded-lg border border-slate-200 bg-white p-4">
                    <div class="h-3 w-16 rounded bg-slate-200"></div>
                    <div class="mt-5 h-16 rounded bg-slate-50"></div>
                  </div>
                </div>
              </div>
            </div>
          </StdSection>

          <StdSection
            id="kpi"
            title="KPIs y tarjetas"
            eyebrow="Componente STD"
            :description="getComponent('kpi').usage"
            icon="fa-solid fa-chart-line"
          >
            <div class="mb-4 flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-600 lg:flex-row lg:items-center lg:justify-between">
              <span><strong class="text-slate-900">Nombre:</strong> {{ getComponent('kpi').standardName }}</span>
              <span><strong class="text-slate-900">Fuente:</strong> {{ getComponent('kpi').source }}</span>
              <span class="rounded-full border px-2 py-0.5 text-[10px] font-black" :class="statusMeta[getComponent('kpi').status].className">
                {{ statusMeta[getComponent('kpi').status].label }}
              </span>
            </div>
            <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
              <StdKpiCard
                v-for="kpi in kpiExamples"
                :key="kpi.label"
                :label="kpi.label"
                :value="kpi.value"
                :detail="kpi.detail"
                :trend="kpi.trend"
                :tone="kpi.tone"
                :icon="kpi.icon"
                :sparkline="kpi.sparkline"
              />
            </div>
          </StdSection>

          <StdSection
            id="tables"
            title="Tablas y datos"
            eyebrow="Componente STD"
            :description="getComponent('tables').usage"
            icon="fa-solid fa-table"
          >
            <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div class="text-xs font-semibold leading-5 text-slate-500">
                <p><strong class="text-slate-900">Nombre:</strong> {{ getComponent('tables').standardName }}</p>
                <p><strong class="text-slate-900">Uso:</strong> {{ getComponent('tables').notes }}</p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
                  {{ tableSelectionLabel }}
                </span>
                <StdButton size="sm" icon="fa-solid fa-filter">Filtrar</StdButton>
                <StdButton size="sm" variant="primary" icon="fa-solid fa-download">Exportar</StdButton>
              </div>
            </div>

            <StdDataTable
              :columns="tableColumns"
              :rows="tableRows"
              selectable
              :selected-keys="selectedRows"
              :sort-key="sortKey"
              :sort-direction="sortDirection"
              @sort="handleSort"
              @select-row="handleSelectRow"
            >
              <template #cell-status="{ row }">
                <span class="rounded-full border px-2 py-0.5 text-[10px] font-black" :class="row.statusClass">
                  {{ row.status }}
                </span>
              </template>
            </StdDataTable>

            <div class="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
              <article class="rounded-lg border border-slate-200 bg-white p-4">
                <h3 class="mb-3 text-xs font-black uppercase text-slate-500">Basica</h3>
                <div class="overflow-hidden rounded-lg border border-slate-200 text-xs">
                  <div class="grid grid-cols-3 bg-slate-50 font-black text-slate-600">
                    <span class="px-3 py-2">ID</span>
                    <span class="px-3 py-2">Producto</span>
                    <span class="px-3 py-2 text-right">Importe</span>
                  </div>
                  <div v-for="row in tableRows" :key="`basic-${row.id}`" class="grid grid-cols-3 border-t border-slate-100 font-semibold text-slate-600">
                    <span class="px-3 py-2">{{ row.id }}</span>
                    <span class="px-3 py-2">{{ row.product }}</span>
                    <span class="px-3 py-2 text-right">{{ row.amount }}</span>
                  </div>
                </div>
              </article>

              <article class="rounded-lg border border-slate-200 bg-white p-4">
                <h3 class="mb-3 text-xs font-black uppercase text-slate-500">Acciones por fila</h3>
                <div class="space-y-2">
                  <div v-for="row in tableRows" :key="`actions-${row.id}`" class="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs">
                    <div>
                      <p class="font-black text-slate-800">{{ row.product }}</p>
                      <p class="text-[11px] font-semibold text-slate-400">{{ row.amount }}</p>
                    </div>
                    <div class="flex items-center gap-1 text-slate-400">
                      <button type="button" class="h-8 w-8 rounded-lg hover:bg-pic-brand-soft hover:text-pic-brand"><i class="fa-regular fa-eye"></i></button>
                      <button type="button" class="h-8 w-8 rounded-lg hover:bg-pic-brand-soft hover:text-pic-brand"><i class="fa-solid fa-pen"></i></button>
                      <button type="button" class="h-8 w-8 rounded-lg hover:bg-pic-brand-soft hover:text-pic-brand"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                    </div>
                  </div>
                </div>
              </article>

              <article class="rounded-lg border border-slate-200 bg-white p-4">
                <h3 class="mb-3 text-xs font-black uppercase text-slate-500">Paginacion compacta</h3>
                <div class="rounded-lg border border-slate-200">
                  <div class="space-y-2 p-3">
                    <span class="block h-3 rounded bg-slate-100"></span>
                    <span class="block h-3 rounded bg-slate-100"></span>
                    <span class="block h-3 rounded bg-slate-100"></span>
                  </div>
                  <div class="flex items-center justify-between border-t border-slate-200 px-3 py-2 text-[10px] font-black text-slate-500">
                    <button type="button" class="h-7 w-7 rounded hover:bg-pic-brand-soft hover:text-pic-brand"><i class="fa-solid fa-chevron-left"></i></button>
                    <div class="flex items-center gap-1">
                      <span>1</span>
                      <span class="rounded bg-pic-brand px-2 py-1 text-white">2</span>
                      <span>3</span>
                    </div>
                    <span>10 por pagina</span>
                  </div>
                </div>
              </article>
            </div>
          </StdSection>

          <StdSection
            id="filters"
            title="Filtros y formularios"
            eyebrow="Patron visual"
            :description="getComponent('filters').usage"
            icon="fa-solid fa-filter"
          >
            <div class="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-600">
              <p><strong class="text-slate-900">Nombre:</strong> {{ getComponent('filters').standardName }}</p>
              <p><strong class="text-slate-900">Nota:</strong> {{ getComponent('filters').notes }}</p>
            </div>

            <div class="space-y-4">
              <div class="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px_260px]">
                <label class="block">
                  <span class="mb-1 block text-[10px] font-black uppercase text-slate-500">Search input</span>
                  <div class="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-400 focus-within:border-pic-brand focus-within:ring-2 focus-within:ring-pic-brand-border">
                    <i class="fa-solid fa-magnifying-glass"></i>
                    <input class="min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none" placeholder="Buscar..." />
                  </div>
                </label>
                <label class="block">
                  <span class="mb-1 block text-[10px] font-black uppercase text-slate-500">Select</span>
                  <select class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 outline-none transition hover:border-pic-brand-border focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-border">
                    <option>Region Norte</option>
                    <option>Region Sur</option>
                  </select>
                </label>
                <label class="block">
                  <span class="mb-1 block text-[10px] font-black uppercase text-slate-500">Date range</span>
                  <div class="flex h-10 items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700">
                    <span>01/05/2024</span>
                    <span class="text-slate-300">-</span>
                    <span>31/05/2024</span>
                    <i class="fa-regular fa-calendar text-slate-400"></i>
                  </div>
                </label>
              </div>

              <div class="flex flex-wrap gap-2">
                <span class="rounded-lg border border-pic-brand-border bg-pic-brand-soft px-2.5 py-1 text-xs font-black text-pic-brand">Estado: Activo <i class="fa-solid fa-xmark ml-1"></i></span>
                <span class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-600">Pais: Espana <i class="fa-solid fa-xmark ml-1 text-slate-400"></i></span>
                <span class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-600">Segmento: Todos</span>
                <button type="button" class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-pic-brand transition hover:bg-pic-brand-soft">+ Anadir filtro</button>
              </div>

              <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div class="rounded-lg border border-slate-200 bg-white p-4">
                  <p class="mb-3 text-[10px] font-black uppercase text-slate-500">Radio y checkbox</p>
                  <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <label v-for="option in ['Opcion A', 'Opcion B', 'Opcion C']" :key="option" class="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <input type="radio" name="std-radio" class="accent-pic-brand" :checked="option === 'Opcion B'" />
                      {{ option }}
                    </label>
                  </div>
                  <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <label v-for="option in ['Activo', 'Inactivo', 'Pendiente']" :key="option" class="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <input type="checkbox" class="accent-pic-brand" :checked="option !== 'Inactivo'" />
                      {{ option }}
                    </label>
                  </div>
                </div>

                <div class="rounded-lg border border-slate-200 bg-white p-4">
                  <p class="mb-3 text-[10px] font-black uppercase text-slate-500">Segmented control</p>
                  <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <button
                      v-for="segment in segments"
                      :key="segment"
                      type="button"
                      class="h-9 rounded-lg border text-xs font-black transition"
                      :class="activeSegment === segment ? 'border-pic-brand bg-pic-brand text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-pic-brand-border hover:bg-pic-brand-soft'"
                      @click="activeSegment = segment"
                    >
                      {{ segment }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </StdSection>

          <StdSection
            id="controls"
            title="Controles"
            eyebrow="Componentes y patrones"
            :description="getComponent('controls').usage"
            icon="fa-solid fa-sliders"
          >
            <div class="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-600">
              <p><strong class="text-slate-900">Nombre:</strong> {{ getComponent('controls').standardName }}</p>
              <p><strong class="text-slate-900">Fuente:</strong> {{ getComponent('controls').source }}</p>
            </div>

            <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <article class="rounded-lg border border-slate-200 bg-white p-4">
                <p class="mb-3 text-[10px] font-black uppercase text-slate-500">Botones</p>
                <div class="flex flex-wrap items-center gap-2">
                  <StdButton variant="primary" icon="fa-solid fa-check">Primario</StdButton>
                  <StdButton icon="fa-solid fa-pen">Secundario</StdButton>
                  <StdButton variant="danger" icon="fa-solid fa-trash">Eliminar</StdButton>
                  <StdButton size="icon" icon="fa-solid fa-plus" />
                  <StdButton size="icon" icon="fa-solid fa-pen" />
                </div>
              </article>

              <article class="rounded-lg border border-slate-200 bg-white p-4">
                <p class="mb-3 text-[10px] font-black uppercase text-slate-500">Switch y tabs</p>
                <div class="flex flex-wrap items-center gap-4">
                  <StdSwitch v-model="switchEnabled" label="Switch activo" />
                  <div class="inline-flex rounded-lg border border-slate-200 bg-white p-1">
                    <button
                      v-for="tab in tabs"
                      :key="tab"
                      type="button"
                      class="h-8 rounded-md px-3 text-xs font-black transition"
                      :class="activeTab === tab ? 'bg-pic-brand text-white' : 'text-slate-600 hover:bg-pic-brand-soft hover:text-pic-brand'"
                      @click="activeTab = tab"
                    >
                      {{ tab }}
                    </button>
                  </div>
                </div>
              </article>

              <article class="rounded-lg border border-slate-200 bg-white p-4">
                <p class="mb-3 text-[10px] font-black uppercase text-slate-500">Slider</p>
                <input v-model="sliderValue" type="range" min="0" max="100" class="w-full accent-pic-brand" />
                <span class="mt-2 inline-flex rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-black text-slate-600">{{ sliderValue }}</span>
              </article>

              <article class="rounded-lg border border-slate-200 bg-white p-4">
                <p class="mb-3 text-[10px] font-black uppercase text-slate-500">Stepper</p>
                <div class="inline-flex h-10 overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <button type="button" class="w-10 font-black text-slate-500 hover:bg-pic-brand-soft hover:text-pic-brand" @click="incrementStepper(-1)">-</button>
                  <span class="flex w-12 items-center justify-center border-x border-slate-200 text-xs font-black text-slate-800">{{ stepperValue }}</span>
                  <button type="button" class="w-10 font-black text-slate-500 hover:bg-pic-brand-soft hover:text-pic-brand" @click="incrementStepper(1)">+</button>
                </div>
              </article>
            </div>
          </StdSection>

          <StdSection
            id="charts"
            title="Graficos ECharts"
            eyebrow="Patron visual"
            :description="getComponent('charts').usage"
            icon="fa-solid fa-chart-area"
          >
            <div class="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-600">
              <p><strong class="text-slate-900">Nombre:</strong> {{ getComponent('charts').standardName }}</p>
              <p><strong class="text-slate-900">Nota:</strong> {{ getComponent('charts').notes }}</p>
            </div>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <UiEChartPreview
                v-for="chart in chartExamples"
                :key="`${chart.type}-${selectedThemeId}`"
                :type="chart.type"
                :title="chart.title"
              />
            </div>
          </StdSection>

          <StdSection
            id="calendar"
            title="Calendario y tiempo"
            eyebrow="Pendiente de componente"
            :description="getComponent('calendar').usage"
            icon="fa-regular fa-calendar-days"
          >
            <div class="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-600">
              <p><strong class="text-slate-900">Nombre:</strong> {{ getComponent('calendar').standardName }}</p>
              <p><strong class="text-slate-900">Criterio:</strong> {{ getComponent('calendar').notes }}</p>
            </div>

            <div class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <article class="rounded-lg border border-slate-200 bg-white p-4">
                <div class="mb-3 flex items-center justify-between">
                  <button type="button" class="h-8 w-8 rounded-lg text-slate-500 hover:bg-pic-brand-soft hover:text-pic-brand">
                    <i class="fa-solid fa-chevron-left"></i>
                  </button>
                  <p class="text-sm font-black text-slate-900">Mayo 2024</p>
                  <button type="button" class="h-8 w-8 rounded-lg text-slate-500 hover:bg-pic-brand-soft hover:text-pic-brand">
                    <i class="fa-solid fa-chevron-right"></i>
                  </button>
                </div>
                <div class="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-400">
                  <span v-for="day in ['L','M','X','J','V','S','D']" :key="day">{{ day }}</span>
                </div>
                <div class="mt-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-600">
                  <span
                    v-for="day in calendarDays"
                    :key="day"
                    class="flex h-9 items-center justify-center rounded-lg"
                    :class="day === 15 ? 'bg-pic-brand text-white font-black' : day > 31 ? 'text-slate-300' : 'hover:bg-pic-brand-soft hover:text-pic-brand'"
                  >
                    {{ day > 31 ? day - 31 : day }}
                  </span>
                </div>
              </article>

              <div class="space-y-4">
                <label class="block">
                  <span class="mb-1 block text-[10px] font-black uppercase text-slate-500">Date picker</span>
                  <div class="flex h-10 items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700">
                    <span>15/05/2024</span>
                    <i class="fa-regular fa-calendar text-slate-400"></i>
                  </div>
                </label>

                <article class="rounded-lg border border-slate-200 bg-white p-4">
                  <p class="mb-2 text-[10px] font-black uppercase text-slate-500">Timeline</p>
                  <svg viewBox="0 0 260 72" class="h-20 w-full text-pic-brand" fill="none" aria-hidden="true">
                    <path d="M4 48 L24 34 L44 42 L64 26 L84 38 L104 24 L124 36 L144 20 L164 30 L184 18 L204 34 L224 22 L256 28" stroke="currentColor" stroke-width="2" />
                    <path d="M4 64 L4 48 L24 34 L44 42 L64 26 L84 38 L104 24 L124 36 L144 20 L164 30 L184 18 L204 34 L224 22 L256 28 L256 64 Z" fill="currentColor" opacity="0.12" />
                    <line x1="18" y1="12" x2="18" y2="64" stroke="currentColor" stroke-width="2" />
                    <line x1="236" y1="12" x2="236" y2="64" stroke="currentColor" stroke-width="2" />
                  </svg>
                  <div class="mt-2 flex items-center justify-between text-[10px] font-black text-slate-500">
                    <span>Abr 24</span>
                    <span>May 24</span>
                    <span>Jun 24</span>
                  </div>
                </article>

                <article class="rounded-lg border border-slate-200 bg-white p-4">
                  <p class="mb-2 text-[10px] font-black uppercase text-slate-500">Agenda</p>
                  <div class="space-y-2">
                    <div v-for="item in ['10:00 Reunion de equipo', '11:30 Revision de metricas', '14:00 Presentacion clientes', '16:00 Analisis de datos']" :key="item" class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">
                      {{ item }}
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </StdSection>

          <StdSection
            id="feedback"
            title="Estados y feedback"
            eyebrow="Componentes y estados"
            :description="getComponent('feedback').usage"
            icon="fa-solid fa-circle-info"
          >
            <div class="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-600">
              <p><strong class="text-slate-900">Nombre:</strong> {{ getComponent('feedback').standardName }}</p>
              <p><strong class="text-slate-900">Fuente:</strong> {{ getComponent('feedback').source }}</p>
            </div>

            <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div class="space-y-3">
                <StdAlert title="Guardado correctamente" description="Los cambios quedaron registrados." tone="success" />
                <StdAlert title="Advertencia operativa" description="Revisa los datos antes de continuar." tone="warning" />
                <StdAlert title="Error de validacion" description="Faltan campos obligatorios para completar la accion." tone="danger" />
              </div>

              <div class="space-y-3">
                <div class="rounded-lg border border-slate-200 bg-white p-4">
                  <p class="mb-3 text-[10px] font-black uppercase text-slate-500">Loading skeleton</p>
                  <div class="mb-3 h-3 w-2/3 rounded bg-slate-100"></div>
                  <div class="mb-2 h-3 w-full rounded bg-slate-100"></div>
                  <div class="h-3 w-4/5 rounded bg-slate-100"></div>
                </div>
                <div class="rounded-lg border border-slate-200 bg-white p-4">
                  <p class="mb-3 text-[10px] font-black uppercase text-slate-500">Progress y badges</p>
                  <div class="rounded-full border border-slate-200 bg-white p-1">
                    <div class="h-2 rounded-full bg-pic-brand" style="width: 62%;"></div>
                  </div>
                  <div class="mt-3 flex flex-wrap gap-2">
                    <span class="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-600">Nuevo</span>
                    <span class="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">En progreso</span>
                    <span class="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">Completado</span>
                    <span class="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-black text-red-700">Error</span>
                  </div>
                </div>
              </div>
            </div>
          </StdSection>

          <StdSection
            id="overlays"
            title="Overlays"
            eyebrow="Patron visual"
            :description="getComponent('overlays').usage"
            icon="fa-regular fa-window-restore"
          >
            <div class="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-600">
              <p><strong class="text-slate-900">Nombre:</strong> {{ getComponent('overlays').standardName }}</p>
              <p><strong class="text-slate-900">Nota:</strong> {{ getComponent('overlays').notes }}</p>
            </div>

            <div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <article class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div class="mb-3 flex items-center justify-between">
                  <p class="text-sm font-black text-slate-900">Modal de edicion</p>
                  <i class="fa-solid fa-xmark text-slate-400"></i>
                </div>
                <div class="space-y-2">
                  <div class="h-3 rounded bg-slate-100"></div>
                  <div class="h-3 w-3/4 rounded bg-slate-100"></div>
                  <div class="h-10 rounded-lg border border-slate-200 bg-slate-50"></div>
                </div>
                <div class="mt-4 flex justify-end gap-2">
                  <StdButton size="sm">Cancelar</StdButton>
                  <StdButton size="sm" variant="primary">Aceptar</StdButton>
                </div>
              </article>

              <article class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div class="ml-auto max-w-[220px] rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div class="mb-3 flex items-center justify-between">
                    <p class="text-sm font-black text-slate-900">Drawer</p>
                    <i class="fa-solid fa-xmark text-slate-400"></i>
                  </div>
                  <div class="space-y-2">
                    <span class="block h-8 rounded-lg bg-slate-50 ring-1 ring-slate-200"></span>
                    <span class="block h-8 rounded-lg bg-slate-50 ring-1 ring-slate-200"></span>
                    <span class="block h-8 rounded-lg bg-slate-50 ring-1 ring-slate-200"></span>
                  </div>
                  <StdButton class="mt-4" size="sm" variant="primary">Aplicar</StdButton>
                </div>
              </article>

              <article class="rounded-lg border border-slate-200 bg-white p-4">
                <p class="mb-3 text-sm font-black text-slate-900">Confirmacion</p>
                <p class="text-xs font-semibold leading-5 text-slate-500">Esta accion no se puede deshacer.</p>
                <div class="mt-4 flex justify-end gap-2">
                  <StdButton size="sm">Cancelar</StdButton>
                  <StdButton size="sm" variant="danger">Eliminar</StdButton>
                </div>
                <div class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-500">
                  <i class="fa-regular fa-circle-question mr-1 text-pic-brand"></i>
                  Tooltip/popover para ayuda contextual.
                </div>
              </article>
            </div>
          </StdSection>

          <StdSection
            id="dashboards"
            title="Patrones de dashboard"
            eyebrow="Composicion"
            :description="getComponent('dashboards').usage"
            icon="fa-solid fa-chart-pie"
          >
            <div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <article
                v-for="pattern in dashboardPatterns"
                :key="pattern.title"
                class="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-pic-brand-border hover:bg-pic-brand-soft"
              >
                <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-pic-brand-soft text-pic-brand">
                  <i :class="pattern.icon"></i>
                </span>
                <h3 class="mt-3 text-sm font-black text-slate-900">{{ pattern.title }}</h3>
                <p class="mt-1 text-xs font-semibold leading-5 text-slate-500">{{ pattern.description }}</p>
                <p class="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[10px] text-slate-500">
                  {{ pattern.layout }}
                </p>
              </article>
            </div>

            <div class="mt-4 rounded-lg border border-slate-200 bg-white p-4">
              <div class="grid grid-cols-1 gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
                <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div class="mb-3 h-8 rounded bg-pic-brand-soft ring-1 ring-pic-brand-border"></div>
                  <div class="space-y-2">
                    <div class="h-8 rounded bg-white ring-1 ring-slate-200"></div>
                    <div class="h-8 rounded bg-white ring-1 ring-slate-200"></div>
                    <div class="h-8 rounded bg-white ring-1 ring-slate-200"></div>
                  </div>
                </div>
                <div class="space-y-3">
                  <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <StdKpiCard
                      v-for="kpi in kpiExamples"
                      :key="`pattern-${kpi.label}`"
                      :label="kpi.label"
                      :value="kpi.value"
                      :detail="kpi.detail"
                      :trend="kpi.trend"
                      :tone="kpi.tone"
                      :icon="kpi.icon"
                      :sparkline="kpi.sparkline"
                    />
                  </div>
                  <div class="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <UiEChartPreview :key="`dashboard-${selectedThemeId}`" type="line" title="Tendencia principal" />
                    <div class="rounded-lg border border-slate-200 bg-white p-3">
                      <div class="mb-2 h-3 w-24 rounded bg-slate-200"></div>
                      <div class="space-y-2">
                        <span class="block h-3 rounded bg-slate-100"></span>
                        <span class="block h-3 rounded bg-slate-100"></span>
                        <span class="block h-3 rounded bg-slate-100"></span>
                        <span class="block h-3 rounded bg-slate-100"></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </StdSection>

          <StdSection
            id="usage"
            title="Como usarlo en modulos existentes"
            eyebrow="Adopcion"
            description="Ruta recomendada para aplicar los estandares sin reescribir logica de negocio."
            icon="fa-solid fa-code-branch"
          >
            <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <article class="rounded-lg border border-slate-200 bg-white p-4">
                <h3 class="text-sm font-black text-slate-900">Nuevos modulos</h3>
                <ul class="mt-3 space-y-2 text-xs font-semibold leading-5 text-slate-600">
                  <li>Usar <span class="font-mono text-pic-brand">StdPageHeader</span> para encabezados.</li>
                  <li>Usar <span class="font-mono text-pic-brand">StdSection</span> para paneles operativos.</li>
                  <li>Usar <span class="font-mono text-pic-brand">StdButton</span>, <span class="font-mono text-pic-brand">StdSwitch</span> y <span class="font-mono text-pic-brand">StdAlert</span> para controles comunes.</li>
                  <li>Usar <span class="font-mono text-pic-brand">StdKpiCard</span> y <span class="font-mono text-pic-brand">StdDataTable</span> en dashboards y listados.</li>
                </ul>
              </article>

              <article class="rounded-lg border border-slate-200 bg-white p-4">
                <h3 class="text-sm font-black text-slate-900">Modulos ya hechos</h3>
                <ul class="mt-3 space-y-2 text-xs font-semibold leading-5 text-slate-600">
                  <li>Reemplazar primero headers, botones, alerts, badges y KPIs repetidos.</li>
                  <li>Cambiar colores hardcodeados por tokens <span class="font-mono text-pic-brand">pic-*</span> cuando deban responder a la paleta.</li>
                  <li>Mantener piezas especificas del negocio dentro de su modulo, apoyadas por tokens y componentes STD.</li>
                  <li>Extraer filtros, drawers o date range solo cuando se repitan en mas de un modulo.</li>
                </ul>
              </article>
            </div>
          </StdSection>

          <StdSection
            id="roadmap"
            title="Camino a seguir"
            eyebrow="Siguientes fases"
            description="Orden recomendado para que UI Standards pase de catalogo a sistema de configuracion real."
            icon="fa-solid fa-route"
          >
            <div class="grid grid-cols-1 gap-3 md:grid-cols-4">
              <article class="rounded-lg border border-pic-brand-border bg-pic-brand-soft p-4">
                <p class="text-[10px] font-black uppercase text-pic-brand">Fase actual</p>
                <h3 class="mt-2 text-sm font-black text-slate-900">Referencia confiable</h3>
                <p class="mt-1 text-xs font-semibold leading-5 text-slate-600">Ordenar catalogo, nombres STD y muestras reales.</p>
              </article>
              <article class="rounded-lg border border-slate-200 bg-white p-4">
                <p class="text-[10px] font-black uppercase text-slate-500">Fase 2</p>
                <h3 class="mt-2 text-sm font-black text-slate-900">Persistencia Setup</h3>
                <p class="mt-1 text-xs font-semibold leading-5 text-slate-500">Guardar paleta y tokens desde backend en lugar de localStorage.</p>
              </article>
              <article class="rounded-lg border border-slate-200 bg-white p-4">
                <p class="text-[10px] font-black uppercase text-slate-500">Fase 3</p>
                <h3 class="mt-2 text-sm font-black text-slate-900">Adopcion gradual</h3>
                <p class="mt-1 text-xs font-semibold leading-5 text-slate-500">Migrar headers, botones, KPIs, tablas y filtros por prioridad.</p>
              </article>
              <article class="rounded-lg border border-slate-200 bg-white p-4">
                <p class="text-[10px] font-black uppercase text-slate-500">Fase 4</p>
                <h3 class="mt-2 text-sm font-black text-slate-900">Snippets y guias</h3>
                <p class="mt-1 text-xs font-semibold leading-5 text-slate-500">Agregar ejemplos de uso por componente dentro del catalogo.</p>
              </article>
            </div>
          </StdSection>
        </section>
      </div>
    </div>
  </main>
</template>
