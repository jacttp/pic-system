<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
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
  componentExamples,
  dashboardPatterns,
  kpiExamples,
  tableColumns,
  tableRows,
} from '../utils/uiStandardsCatalog';
import {
  hslTripletToHex,
  hexToHslTriplet,
  uiThemeTokenDefinitions,
} from '@/modules/Shared/design/uiTheme';
import { useUiThemeStore } from '@/modules/Shared/stores/uiThemeStore';

const selectedRows = ref<Array<string | number>>([101]);
const sortKey = ref('id');
const sortDirection = ref<'asc' | 'desc'>('asc');
const switchEnabled = ref(true);
const activeSegment = ref('Mes');
const activeTab = ref('Catalogo');
const sliderValue = ref(60);
const stepperValue = ref(1);
const uiThemeStore = useUiThemeStore();
const {
  palettes,
  activePaletteId,
  activePalette,
  isLoading: isThemeLoading,
  isSaving: isThemeSaving,
  isDirty: isThemeDirty,
  isPersisted: isThemePersisted,
  isUsingFallback: isThemeFallback,
  lastError: themeError,
  updatedAt: themeUpdatedAt,
  updatedBy: themeUpdatedBy,
} = storeToRefs(uiThemeStore);

const segments = ['Dia', 'Semana', 'Mes', 'Ano'];
const tabs = ['Catalogo', 'Tokens', 'Patrones'];
const typographySpecimens = [
  {
    name: 'Inter',
    family: "'Inter', system-ui, sans-serif",
    role: 'Fuente activa',
    description: 'La referencia actual: compacta, neutra y legible en tablas, filtros y tarjetas operativas.',
    specimen: 'Bandeja de gestión',
    active: true,
  },
  {
    name: 'Manrope',
    family: "'Manrope', system-ui, sans-serif",
    role: 'Alternativa de interfaz',
    description: 'Más redondeada y abierta; conserva densidad, pero da mayor suavidad a títulos y navegación.',
    specimen: 'Módulos principales',
    active: false,
  },
  {
    name: 'DM Sans',
    family: "'DM Sans', system-ui, sans-serif",
    role: 'Alternativa editorial',
    description: 'Un poco más expresiva en encabezados, con buena lectura para texto de apoyo y metadatos.',
    specimen: 'Resumen operativo',
    active: false,
  },
];
const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const monthCalendarDays = [
  null,
  null,
  ...Array.from({ length: 31 }, (_, index) => index + 1),
  null,
  null,
] as Array<number | null>;
const timeRangeOptions = ['7D', '30D', '3M', '6M', '1A', 'Todo'];
const agendaItems = [
  { time: '10:00', title: 'Reunion de equipo' },
  { time: '11:30', title: 'Revision de metricas' },
  { time: '14:00', title: 'Presentacion clientes' },
  { time: '16:00', title: 'Analisis de datos' },
];
const chartExamples = [
  { type: 'line' as const, title: 'Lineas' },
  { type: 'bar' as const, title: 'Barras' },
  { type: 'stacked' as const, title: 'Apiladas' },
  { type: 'area' as const, title: 'Area' },
  { type: 'donut' as const, title: 'Dona' },
  { type: 'pie' as const, title: 'Pastel' },
  { type: 'scatter' as const, title: 'Dispersion' },
  { type: 'radar' as const, title: 'Radar' },
  { type: 'heatmap' as const, title: 'Heatmap' },
  { type: 'gauge' as const, title: 'Gauge' },
];

const standardCatalogGroups = [
  {
    key: 'structure',
    number: 1,
    title: 'Estructura general',
    description: 'Sidebar, topbar, header, breadcrumbs, content area con cards, footer y paginacion.',
    sectionId: 'layout',
    links: [
      { id: 'std-sidebar', title: 'Sidebar' },
      { id: 'std-topbar', title: 'Topbar / Header' },
      { id: 'std-breadcrumbs', title: 'Breadcrumbs' },
      { id: 'std-content-cards', title: 'Content Cards' },
      { id: 'std-pagination', title: 'Footer / Paginacion' },
    ],
  },
  {
    key: 'kpis',
    number: 2,
    title: 'KPIs y tarjetas',
    description: 'Indicadores, tarjetas de estado, resumenes y tarjetas con tendencia o sparkline.',
    sectionId: 'kpi',
    links: [
      { id: 'std-kpi-card', title: 'KPI Card' },
    ],
  },
  {
    key: 'tables',
    number: 3,
    title: 'Tablas',
    description: 'Tablas basicas, ordenables, seleccionables, compactas, con acciones y paginacion.',
    sectionId: 'tables',
    links: [
      { id: 'std-data-table', title: 'Data Table' },
    ],
  },
  {
    key: 'charts',
    number: 4,
    title: 'Graficos',
    description: 'Lineas, barras, areas, donas, radar, heatmaps, gauges y mapas simples.',
    sectionId: 'charts',
    links: [
      { id: 'std-chart-panel', title: 'ECharts Panel' },
    ],
  },
  {
    key: 'filters',
    number: 5,
    title: 'Filtros y seleccion',
    description: 'Selects, multi-selects, chips, busqueda, radio, checkbox y rangos de fecha.',
    sectionId: 'filters',
    links: [
      { id: 'std-filter-bar', title: 'Filter Bar' },
      { id: 'std-search-input', title: 'Search Input' },
    ],
  },
  {
    key: 'controls',
    number: 6,
    title: 'Controles',
    description: 'Botones, icon buttons, switches, toggles, tabs, sliders y steppers.',
    sectionId: 'controls',
    links: [
      { id: 'std-segmented-control', title: 'Segmented Control' },
      { id: 'std-switch', title: 'Switch' },
    ],
  },
  {
    key: 'time',
    number: 7,
    title: 'Calendarios y tiempo',
    description: 'Calendarios mensuales, date pickers, timelines, selectores temporales y agenda.',
    sectionId: 'calendar',
    links: [
      { id: 'std-calendar', title: 'Calendar / Date' },
    ],
  },
  {
    key: 'feedback',
    number: 8,
    title: 'Estados y feedback',
    description: 'Toasts, banners, empty states, skeletons, progress bars y badges de estado.',
    sectionId: 'feedback',
    links: [
      { id: 'std-alert', title: 'Alert' },
      { id: 'std-loading', title: 'Loading / Skeleton' },
      { id: 'std-progress', title: 'Progress / Badges' },
    ],
  },
  {
    key: 'overlays',
    number: 9,
    title: 'Ventanas y capas',
    description: 'Modales, drawers, dialogos de confirmacion, tooltips y popovers.',
    sectionId: 'overlays',
    links: [
      { id: 'std-overlays', title: 'Modal / Drawer' },
    ],
  },
  {
    key: 'dashboard-patterns',
    number: 10,
    title: 'Patrones de dashboard',
    description: 'Composiciones completas para dashboards desktop, mobile y vistas analiticas.',
    sectionId: 'dashboards',
    links: [{ id: 'dashboards', title: 'Composiciones de dashboard' }],
  },
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
      links: [
        { id: 'configuration', title: 'Configuracion UI' },
        { id: 'typography', title: 'Tipografia' },
      ],
    },
    {
      title: 'Catalogo',
      links: [
        ...standardCatalogGroups.map((group) => ({ id: group.sectionId, title: `${group.number}. ${group.title}` })),
      ],
    },
  ];

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
  { title: 'Base operativa', icon: 'fa-solid fa-swatchbook', tokens: uiThemeTokenDefinitions.filter((token) => token.group === 'base') },
  { title: 'Navegacion', icon: 'fa-solid fa-bars-staggered', tokens: uiThemeTokenDefinitions.filter((token) => token.group === 'navigation') },
  { title: 'Estados', icon: 'fa-solid fa-signal', tokens: uiThemeTokenDefinitions.filter((token) => token.group === 'state') },
  { title: 'Tarjeta Hub', icon: 'fa-solid fa-table-cells-large', tokens: uiThemeTokenDefinitions.filter((token) => token.group === 'hub') },
  { title: 'Acentos de modulo', icon: 'fa-solid fa-shapes', tokens: uiThemeTokenDefinitions.filter((token) => token.group === 'module') },
  { title: 'Graficas', icon: 'fa-solid fa-chart-simple', tokens: uiThemeTokenDefinitions.filter((token) => token.group === 'chart') },
]);
const activePaletteTokens = computed(() => activePalette.value.tokens);
const activePalettePreviewTokens = computed(() =>
  uiThemeTokenDefinitions.filter((token) =>
    ['--pic-brand', '--pic-nav', '--pic-module', '--pic-module-bg', '--pic-module-text', '--pic-accent-orange', '--pic-accent-blue', '--pic-accent-purple', '--pic-accent-teal'].includes(token.token)
  )
);
const activePaletteStatusLabel = computed(() => {
  if (themeError.value) return 'Error de persistencia';
  if (isThemeSaving.value) return 'Guardando automáticamente...';
  if (isThemeLoading.value) return 'Cargando servidor...';
  if (isThemeDirty.value) return 'Pendiente de sincronizar';
  if (isThemeFallback.value || !isThemePersisted.value) return 'Configuración predeterminada';
  return 'Guardado en servidor';
});
const activePaletteStatusClass = computed(() => {
  if (themeError.value) return 'border-[hsl(var(--pic-danger)/0.28)] bg-[hsl(var(--pic-danger)/0.08)] text-pic-danger';
  if (isThemeSaving.value || isThemeLoading.value) return 'border-pic-brand-border bg-pic-brand-soft text-pic-brand';
  if (isThemeDirty.value) return 'border-[hsl(var(--pic-warning)/0.30)] bg-[hsl(var(--pic-warning)/0.10)] text-pic-warning';
  if (isThemeFallback.value || !isThemePersisted.value) return 'border-pic-border bg-pic-muted-surface text-pic-text-muted';
  return 'border-[hsl(var(--pic-success)/0.28)] bg-[hsl(var(--pic-success)/0.10)] text-pic-success';
});
const lastThemeSaveLabel = computed(() => {
  if (!themeUpdatedAt.value) return null;
  const date = new Date(themeUpdatedAt.value);
  if (Number.isNaN(date.getTime())) return null;

  const formatted = new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
  return themeUpdatedBy.value ? `${formatted} · usuario #${themeUpdatedBy.value}` : formatted;
});
const isThemeBusy = computed(() => isThemeLoading.value || isThemeSaving.value);
const tableSelectionLabel = computed(() => `${selectedRows.value.length} seleccionados`);

const getComponent = (id: string) => componentExamples.find((item) => item.id === id)!;

onMounted(() => {
  uiThemeStore.loadThemeCatalog();
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

const getTokenHex = (token: string) => hslTripletToHex(activePaletteTokens.value[token] || '0 0% 0%');

const getTokenHsl = (token: string) => activePaletteTokens.value[token] || '0 0% 0%';

const handlePaletteNameInput = (event: Event) => {
  uiThemeStore.updatePalette(activePaletteId.value, { name: (event.target as HTMLInputElement).value });
};

const handlePaletteDescriptionInput = (event: Event) => {
  uiThemeStore.updatePalette(activePaletteId.value, { description: (event.target as HTMLTextAreaElement).value });
};

const handleTokenColorInput = (token: string, event: Event) => {
  uiThemeStore.updatePalette(activePaletteId.value, {
    tokens: {
      [token]: hexToHslTriplet((event.target as HTMLInputElement).value),
    },
  });
};

const handleTokenHexInput = (token: string, event: Event) => {
  const value = (event.target as HTMLInputElement).value.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) return;

  uiThemeStore.updatePalette(activePaletteId.value, {
    tokens: {
      [token]: hexToHslTriplet(value),
    },
  });
};

const handleCreatePalette = () => {
  uiThemeStore.createPalette();
};

const handleDuplicatePalette = () => {
  uiThemeStore.duplicatePalette(activePaletteId.value);
};

const handleDeletePalette = () => {
  uiThemeStore.deletePalette(activePaletteId.value);
};

</script>

<template>
  <main class="min-h-full bg-slate-100 px-4 py-5 sm:px-6 lg:px-8">
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
            description="Consola para crear, editar, aplicar y persistir paletas globales desde SysUIsettings. Hub, navegacion y modulos adoptan estos valores al usar tokens pic-*."
            icon="fa-solid fa-palette"
          >
            <div class="grid grid-cols-1 gap-4 2xl:grid-cols-[280px_minmax(0,1fr)]">
              <aside class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div class="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <p class="text-[10px] font-black uppercase text-slate-500">Paletas</p>
                    <p class="text-xs font-semibold text-slate-500">{{ palettes.length }} disponibles</p>
                  </div>
                  <button
                    type="button"
                    class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-pic-brand-border hover:bg-pic-brand-soft hover:text-pic-brand"
                    title="Crear paleta"
                    :disabled="isThemeBusy"
                    @click="handleCreatePalette"
                  >
                    <i class="fa-solid fa-plus text-xs"></i>
                  </button>
                </div>

                <div class="space-y-2">
                  <button
                    v-for="palette in palettes"
                    :key="palette.id"
                    type="button"
                    class="group w-full rounded-lg border px-3 py-3 text-left transition hover:bg-slate-50"
                    :class="palette.id === activePaletteId ? 'border-pic-brand-border bg-pic-brand-soft shadow-[inset_4px_0_0_0_hsl(var(--pic-brand))]' : 'border-slate-200 bg-white'"
                    :disabled="isThemeBusy"
                    @click="uiThemeStore.setActivePalette(palette.id)"
                  >
                    <div class="mb-2 flex items-center gap-1.5">
                      <span
                        v-for="token in activePalettePreviewTokens"
                        :key="`${palette.id}-${token.token}`"
                        class="h-4 w-4 rounded-full border border-white shadow-sm ring-1 ring-slate-200"
                        :style="{ backgroundColor: `hsl(${palette.tokens[token.token]})` }"
                      ></span>
                    </div>
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <p class="truncate text-xs font-black text-slate-900">{{ palette.name }}</p>
                        <p class="mt-0.5 truncate text-[11px] font-semibold text-slate-500">{{ palette.id }}</p>
                      </div>
                      <div class="flex shrink-0 flex-col items-end gap-1">
                        <span v-if="palette.id === activePaletteId" class="rounded-full border border-pic-brand-border bg-white px-2 py-0.5 text-[9px] font-black uppercase text-pic-brand">Activa</span>
                        <span v-if="palette.isSystem" class="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-black uppercase text-slate-500">Sistema</span>
                      </div>
                    </div>
                  </button>
                </div>
              </aside>

              <div class="min-w-0 space-y-4">
                <div class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
                  <div class="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]">
                    <label class="block min-w-0">
                      <span class="mb-1 block text-[10px] font-black uppercase text-slate-500">Nombre</span>
                      <input
                        :value="activePalette.name"
                        type="text"
                        :disabled="isThemeBusy"
                        class="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 outline-none transition hover:bg-slate-50 focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-border"
                        @input="handlePaletteNameInput"
                      />
                    </label>
                    <label class="block min-w-0">
                      <span class="mb-1 block text-[10px] font-black uppercase text-slate-500">Descripcion</span>
                      <textarea
                        :value="activePalette.description"
                        rows="2"
                        :disabled="isThemeBusy"
                        class="min-h-[72px] w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold leading-5 text-slate-600 outline-none transition hover:bg-slate-50 focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-border"
                        @input="handlePaletteDescriptionInput"
                      ></textarea>
                    </label>
                  </div>

                  <div class="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-3 xl:flex-row xl:items-center xl:justify-between">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="inline-flex h-7 items-center rounded-lg border px-2.5 text-[10px] font-black uppercase" :class="activePaletteStatusClass">
                        {{ activePaletteStatusLabel }}
                      </span>
                      <span v-if="themeError" class="inline-flex min-h-7 items-center rounded-lg border border-[hsl(var(--pic-danger)/0.28)] bg-[hsl(var(--pic-danger)/0.08)] px-2.5 py-1 text-[10px] font-black text-pic-danger">
                        {{ themeError }}
                      </span>
                      <span class="font-mono text-[10px] font-bold text-slate-400">{{ activePalette.id }}</span>
                      <span v-if="lastThemeSaveLabel && !isThemeDirty" class="text-[10px] font-semibold text-pic-text-muted">
                        {{ lastThemeSaveLabel }}
                      </span>
                      <span class="text-[10px] font-medium text-pic-text-muted">Guardado automático</span>
                    </div>

                    <div class="flex flex-wrap gap-2 xl:justify-end">
                      <StdButton size="sm" icon="fa-solid fa-copy" :disabled="isThemeBusy" @click="handleDuplicatePalette">Duplicar</StdButton>
                      <StdButton size="sm" icon="fa-solid fa-rotate-left" :disabled="isThemeLoading || isThemeSaving || !isThemeDirty" @click="uiThemeStore.restoreThemeCatalog()">Restaurar cambios</StdButton>
                      <StdButton size="sm" variant="danger" icon="fa-solid fa-trash" :disabled="isThemeBusy || activePalette.isSystem" @click="handleDeletePalette">Eliminar</StdButton>
                      <StdButton size="sm" variant="primary" icon="fa-solid fa-floppy-disk" :disabled="isThemeSaving || isThemeLoading || (!isThemeDirty && isThemePersisted)" @click="uiThemeStore.saveThemeCatalog()">
                        {{ isThemeSaving ? 'Guardando' : 'Guardar ahora' }}
                      </StdButton>
                    </div>
                  </div>
                </div>

                <div class="space-y-4">
                  <section
                    v-for="group in tokenGroups"
                    :key="group.title"
                    class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5"
                  >
                    <div class="mb-3 flex items-center justify-between gap-3">
                      <div class="flex items-center gap-2">
                        <span class="flex h-8 w-8 items-center justify-center rounded-lg border border-pic-brand-border bg-pic-brand-soft text-pic-brand">
                          <i :class="group.icon"></i>
                        </span>
                        <div>
                          <h3 class="text-xs font-black uppercase text-slate-500">{{ group.title }}</h3>
                          <p class="text-[11px] font-semibold text-slate-500">{{ group.tokens.length }} tokens editables</p>
                        </div>
                      </div>
                    </div>

                    <div class="grid grid-cols-1 gap-2 xl:grid-cols-2">
                      <article
                        v-for="token in group.tokens"
                        :key="token.token"
                        class="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 transition hover:bg-slate-50 lg:grid-cols-[minmax(0,1fr)_minmax(170px,210px)] lg:items-center"
                      >
                        <div class="flex min-w-0 items-center gap-3">
                          <input
                            type="color"
                            :disabled="isThemeBusy"
                            class="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-white p-1 shadow-sm transition hover:border-pic-brand-border focus:outline-none focus:ring-2 focus:ring-pic-brand-border"
                            :value="getTokenHex(token.token)"
                            :aria-label="`Cambiar ${token.label}`"
                            @input="handleTokenColorInput(token.token, $event)"
                          />
                          <div class="min-w-0">
                            <p class="truncate text-xs font-black text-slate-900">{{ token.label }}</p>
                            <p class="truncate text-[11px] font-semibold text-slate-500">{{ token.usage }}</p>
                          </div>
                        </div>

                        <div class="min-w-0">
                          <label class="sr-only" :for="`hex-${token.token}`">HEX {{ token.label }}</label>
                          <input
                            :id="`hex-${token.token}`"
                            type="text"
                            maxlength="7"
                            :disabled="isThemeBusy"
                            class="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-[11px] font-black uppercase text-slate-700 outline-none transition hover:bg-slate-50 focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-border"
                            :value="getTokenHex(token.token)"
                            @change="handleTokenHexInput(token.token, $event)"
                          />
                          <div class="mt-1 flex items-center justify-between gap-2">
                            <span class="truncate font-mono text-[9px] font-black text-slate-400">{{ token.token }}</span>
                            <span class="shrink-0 font-mono text-[9px] font-bold text-slate-400">{{ getTokenHsl(token.token) }}</span>
                          </div>
                        </div>
                      </article>
                    </div>
                  </section>
                </div>
              </div>

              <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md 2xl:col-span-2">
                <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p class="text-[10px] font-black uppercase text-pic-brand">Preview de impacto</p>
                    <h3 class="mt-1 text-sm font-black text-slate-900">Componentes con tokens de la paleta activa</h3>
                  </div>
                  <StdButton size="sm" variant="primary" icon="fa-solid fa-check">CTA</StdButton>
                </div>
                <div class="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(260px,360px)_minmax(0,1fr)_minmax(280px,380px)]">
                  <StdKpiCard
                    label="Ingresos activos"
                    value="$24.58M"
                    detail="+12.5% vs LY"
                    trend="up"
                    tone="brand"
                    icon="fa-solid fa-chart-line"
                    sparkline="M2 28 L14 22 L26 26 L38 14 L50 20 L62 12 L74 18 L86 8 L100 12"
                  />
                  <UiEChartPreview :key="`preview-${activePaletteId}`" type="area" title="Serie con paleta activa" />
                  <div class="self-start overflow-hidden rounded-lg border border-slate-200 text-xs shadow-sm">
                    <div class="grid grid-cols-3 bg-slate-800 font-semibold uppercase text-white">
                      <span class="px-3 py-2">ID</span>
                      <span class="px-3 py-2">Estado</span>
                      <span class="px-3 py-2 text-right">Valor</span>
                    </div>
                    <div class="grid grid-cols-3 border-t border-slate-100 font-semibold text-slate-600 transition hover:bg-pic-brand-soft">
                      <span class="px-3 py-2">101</span>
                      <span class="px-3 py-2 text-pic-brand">Activo</span>
                      <span class="px-3 py-2 text-right">$120.00</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </StdSection>

          <StdSection
            id="typography"
            title="Tipografia del producto"
            eyebrow="Sistema tipografico"
            description="Muestrario para decidir una sola familia de interfaz. Inter es la fuente activa; las alternativas se muestran para comparar antes de hacer una migracion global."
            icon="fa-solid fa-font"
          >
            <div class="rounded-xl border border-pic-border bg-pic-muted-surface p-4 sm:p-5">
              <div class="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div>
                  <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-pic-text-muted">Regla vigente</p>
                  <p class="mt-1 text-sm font-bold tracking-tight text-pic-text-main">Una fuente sans para interfaz; monoespaciada solo para datos técnicos.</p>
                </div>
                <p class="text-xs font-medium leading-5 text-pic-text-muted">
                  Usa <code class="font-mono text-[11px] font-semibold text-pic-text-main">font-sans</code> para contenido operativo y
                  <code class="font-mono text-[11px] font-semibold text-pic-text-main">font-mono</code> para IDs, códigos y cifras alineadas.
                  Las familias se concentran en <code class="font-mono text-[11px] font-semibold text-pic-text-main">style.css</code> y Tailwind.
                </p>
              </div>
            </div>

            <div class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
              <article
                v-for="typeface in typographySpecimens"
                :key="typeface.name"
                class="rounded-xl border bg-pic-surface p-4 shadow-sm transition hover:shadow-md sm:p-5"
                :class="typeface.active ? 'border-pic-brand-border shadow-[inset_3px_0_0_0_hsl(var(--pic-brand))]' : 'border-pic-border'"
                :style="{ fontFamily: typeface.family }"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-pic-text-muted">{{ typeface.role }}</p>
                    <h3 class="mt-1 text-xl font-bold tracking-tight text-pic-text-main">{{ typeface.name }}</h3>
                  </div>
                  <span v-if="typeface.active" class="rounded-full border border-pic-brand-border bg-pic-brand-soft px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-pic-brand">Activa</span>
                </div>
                <div class="mt-5 border-y border-pic-border py-4">
                  <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-pic-module">{{ typeface.specimen }}</p>
                  <p class="mt-1 text-2xl font-bold leading-none tracking-tight text-pic-text-main">42 pendientes</p>
                  <p class="mt-2 text-sm font-medium leading-5 text-pic-text-muted">Prioriza la lectura, el escaneo y la decisión sin añadir ruido visual.</p>
                </div>
                <p class="mt-4 text-xs font-medium leading-5 text-pic-text-muted">{{ typeface.description }}</p>
              </article>
            </div>
          </StdSection>

          <StdSection
            id="layout"
            title="1. Estructura general"
            eyebrow="Categoria 1"
            :description="getComponent('layout').description"
            icon="fa-solid fa-layer-group"
          >
            <div class="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
              <article class="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:bg-slate-50">
                <p class="text-[10px] font-black uppercase text-slate-500">Nombre para pedirlo</p>
                <p class="mt-1 text-sm font-black text-slate-900">{{ getComponent('layout').standardName }}</p>
              </article>
              <article class="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:bg-slate-50">
                <p class="text-[10px] font-black uppercase text-slate-500">Fuente</p>
                <p class="mt-1 font-mono text-xs font-semibold text-slate-600">{{ getComponent('layout').source }}</p>
              </article>
              <article class="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:bg-slate-50">
                <p class="text-[10px] font-black uppercase text-slate-500">Estado</p>
                <span class="mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black" :class="statusMeta[getComponent('layout').status].className">
                  {{ statusMeta[getComponent('layout').status].label }}
                </span>
              </article>
            </div>

            <div class="grid grid-cols-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div class="rounded-xl border border-slate-200 bg-slate-50/80 p-3 shadow-inner">
                <div class="mb-4 flex items-center gap-2">
                  <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-pic-brand ring-1 ring-slate-200">
                    <i class="fa-solid fa-cube"></i>
                  </span>
                  <span class="h-2 w-24 rounded bg-slate-200"></span>
                </div>
                <div class="space-y-2">
                  <span class="block h-9 rounded-lg bg-pic-brand-soft shadow-[inset_4px_0_0_0_hsl(var(--pic-brand))] ring-1 ring-pic-brand-border"></span>
                  <span class="block h-9 rounded-lg bg-white ring-1 ring-slate-200 transition hover:bg-slate-50"></span>
                  <span class="block h-9 rounded-lg bg-white ring-1 ring-slate-200 transition hover:bg-slate-50"></span>
                  <span class="block h-9 rounded-lg bg-white ring-1 ring-slate-200 transition hover:bg-slate-50"></span>
                </div>
              </div>

              <div class="space-y-3">
                <div class="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div class="flex min-w-0 items-center gap-2">
                    <StdButton size="icon" icon="fa-solid fa-bars" />
                    <div class="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-400 shadow-sm transition hover:bg-slate-50">
                      Buscar en modulo...
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <StdButton size="sm" icon="fa-solid fa-filter">Filtros</StdButton>
                    <StdButton size="sm" variant="primary" icon="fa-solid fa-plus">Nuevo</StdButton>
                  </div>
                </div>

                <div class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50 sm:px-5">
                  <div class="mb-3 flex items-center justify-between gap-3">
                    <h3 class="text-[10px] font-black uppercase tracking-wide text-slate-500">Breadcrumbs</h3>
                    <span class="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-black text-slate-400">
                      StdBreadcrumbs
                    </span>
                  </div>
                  <nav class="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-black text-slate-500">
                    <a href="#layout" class="transition hover:text-pic-brand">Inicio</a>
                    <i class="fa-solid fa-chevron-right text-[9px] text-slate-300"></i>
                    <a href="#layout" class="transition hover:text-pic-brand">Analitica</a>
                    <i class="fa-solid fa-chevron-right text-[9px] text-slate-300"></i>
                    <a href="#layout" class="transition hover:text-pic-brand">Ventas</a>
                    <i class="fa-solid fa-chevron-right text-[9px] text-slate-300"></i>
                    <span class="truncate text-slate-900">Resumen</span>
                  </nav>
                </div>

                <div class="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div>
                    <h3 class="mb-2 text-center text-[10px] font-black uppercase tracking-wide text-slate-500">Content area con cards</h3>
                    <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div class="group rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50 hover:shadow-md">
                        <div class="flex items-start gap-3">
                          <div class="flex h-10 w-12 items-center justify-center rounded-lg bg-slate-50 text-slate-300 ring-1 ring-slate-200 transition group-hover:bg-white group-hover:text-pic-brand">
                            <i class="fa-solid fa-chart-line"></i>
                          </div>
                          <div class="min-w-0 flex-1 space-y-2">
                            <div class="h-2.5 w-20 rounded bg-slate-200"></div>
                            <div class="h-2.5 w-14 rounded bg-slate-100"></div>
                          </div>
                        </div>
                        <svg viewBox="0 0 160 52" class="mt-4 h-12 w-full text-pic-brand" fill="none" aria-hidden="true">
                          <path d="M4 34 L18 28 L32 36 L46 22 L60 30 L74 18 L88 26 L102 14 L116 20 L130 10 L156 16" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                      </div>
                      <div class="group rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50 hover:shadow-md">
                        <div class="flex items-start gap-3">
                          <div class="flex h-10 w-12 items-center justify-center rounded-lg bg-slate-50 text-slate-300 ring-1 ring-slate-200 transition group-hover:bg-white group-hover:text-pic-brand">
                            <i class="fa-solid fa-chart-area"></i>
                          </div>
                          <div class="min-w-0 flex-1 space-y-2">
                            <div class="h-2.5 w-24 rounded bg-slate-200"></div>
                            <div class="h-2.5 w-16 rounded bg-slate-100"></div>
                          </div>
                        </div>
                        <svg viewBox="0 0 160 52" class="mt-4 h-12 w-full text-pic-brand" fill="none" aria-hidden="true">
                          <path d="M4 40 L20 32 L36 36 L52 24 L68 30 L84 20 L100 25 L116 14 L132 18 L156 8" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                          <path d="M4 52 L4 40 L20 32 L36 36 L52 24 L68 30 L84 20 L100 25 L116 14 L132 18 L156 8 L156 52 Z" fill="currentColor" opacity="0.12" />
                        </svg>
                      </div>
                      <div class="group rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50 hover:shadow-md">
                        <div class="flex items-start gap-3">
                          <div class="flex h-10 w-12 items-center justify-center rounded-lg bg-slate-50 text-slate-300 ring-1 ring-slate-200 transition group-hover:bg-white group-hover:text-pic-brand">
                            <i class="fa-solid fa-chart-pie"></i>
                          </div>
                          <div class="min-w-0 flex-1 space-y-2">
                            <div class="h-2.5 w-20 rounded bg-slate-200"></div>
                            <div class="h-2.5 w-12 rounded bg-slate-100"></div>
                            <div class="h-2.5 w-16 rounded bg-slate-100"></div>
                          </div>
                        </div>
                        <div class="mt-4 flex justify-end">
                          <div class="h-14 w-14 rounded-full border-[10px] border-slate-200 border-r-pic-brand"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 class="mb-2 text-center text-[10px] font-black uppercase tracking-wide text-slate-500">Footer / paginacion</h3>
                    <div class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50 sm:px-5">
                      <div class="mb-3 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <span class="text-[10px] font-black uppercase text-slate-400">Registros</span>
                        <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">1-10 de 48</span>
                      </div>
                      <div class="flex items-center justify-between gap-2">
                        <div class="flex items-center gap-1">
                          <button type="button" class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-pic-brand" title="Primera pagina">
                            <i class="fa-solid fa-angles-left text-[10px]"></i>
                          </button>
                          <button type="button" class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-pic-brand" title="Pagina anterior">
                            <i class="fa-solid fa-chevron-left text-[10px]"></i>
                          </button>
                        </div>
                        <div class="flex items-center gap-1">
                          <button v-for="page in [1, 2, 3, 4, 5]" :key="page" type="button" class="flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-black transition" :class="page === 2 ? 'border-pic-brand bg-pic-brand text-white shadow-sm shadow-pic-brand/20' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-pic-brand'">
                            {{ page }}
                          </button>
                        </div>
                        <div class="flex items-center gap-1">
                          <button type="button" class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-pic-brand" title="Pagina siguiente">
                            <i class="fa-solid fa-chevron-right text-[10px]"></i>
                          </button>
                          <button type="button" class="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-pic-brand" title="Ultima pagina">
                            <i class="fa-solid fa-angles-right text-[10px]"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </StdSection>

          <StdSection
            id="kpi"
            title="2. KPIs y tarjetas"
            eyebrow="Categoria 2"
            :description="getComponent('kpi').usage"
            icon="fa-solid fa-chart-line"
          >
            <div class="mb-4 flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs font-semibold text-slate-600 shadow-inner lg:flex-row lg:items-center lg:justify-between">
              <span><strong class="text-slate-900">Nombre:</strong> {{ getComponent('kpi').standardName }}</span>
              <span><strong class="text-slate-900">Fuente:</strong> {{ getComponent('kpi').source }}</span>
              <span class="rounded-full border px-2 py-0.5 text-[10px] font-black" :class="statusMeta[getComponent('kpi').status].className">
                {{ statusMeta[getComponent('kpi').status].label }}
              </span>
            </div>
            <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <article class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50 hover:shadow-md sm:px-5">
                <h3 class="mb-3 text-xs font-black uppercase text-slate-500">KPI con numero y sparkline</h3>
                <StdKpiCard
                  :label="kpiExamples[0].label"
                  :value="kpiExamples[0].value"
                  :detail="kpiExamples[0].detail"
                  :trend="kpiExamples[0].trend"
                  :tone="kpiExamples[0].tone"
                  :icon="kpiExamples[0].icon"
                  :sparkline="kpiExamples[0].sparkline"
                />
              </article>

              <article class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50 hover:shadow-md sm:px-5">
                <h3 class="mb-3 text-xs font-black uppercase text-slate-500">KPI con tendencia</h3>
                <div class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <div class="flex items-start justify-between gap-4">
                    <div class="min-w-0">
                      <p class="text-[10px] font-black uppercase text-slate-500">Usuarios activos</p>
                      <p class="mt-3 text-3xl font-black leading-none text-slate-900">12,540</p>
                    </div>
                    <div class="shrink-0 space-y-2 text-right">
                      <p class="flex items-center justify-end gap-1 text-sm font-black text-emerald-600">
                        <i class="fa-solid fa-caret-up"></i>
                        <span>12.5%</span>
                      </p>
                      <p class="flex items-center justify-end gap-1 text-sm font-black text-red-500">
                        <i class="fa-solid fa-caret-down"></i>
                        <span>4.1%</span>
                      </p>
                    </div>
                  </div>
                  <svg class="mt-5 h-12 w-full overflow-visible text-pic-brand" viewBox="0 0 220 52" fill="none" aria-hidden="true">
                    <path d="M4 38 L18 22 L32 34 L48 20 L64 32 L80 40 L96 26 L112 28 L128 12 L144 14 L160 6 L176 18 L192 30 L208 24 L216 16" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </div>
              </article>

              <article class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50 hover:shadow-md sm:px-5">
                <h3 class="mb-3 text-xs font-black uppercase text-slate-500">Tarjeta de estado</h3>
                <div class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
                  <p class="text-xs font-black uppercase text-slate-500">Estado del servicio</p>
                  <div class="mt-5 flex items-center justify-between gap-4">
                    <div class="flex min-w-0 items-center gap-3">
                      <span class="h-3 w-3 shrink-0 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/40"></span>
                      <span class="truncate text-xl font-black text-emerald-700">Operativo</span>
                    </div>
                    <span class="inline-flex h-9 shrink-0 items-center rounded-lg border border-pic-brand-border bg-pic-brand-soft px-3 text-xs font-black text-pic-brand">
                      OK
                    </span>
                  </div>
                </div>
              </article>

              <article class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50 hover:shadow-md sm:px-5">
                <h3 class="mb-3 text-xs font-black uppercase text-slate-500">Tarjeta resumen</h3>
                <div class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
                  <div class="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-4">
                    <div class="flex h-16 w-16 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400 shadow-inner">
                      <i class="fa-solid fa-hard-drive text-2xl"></i>
                    </div>
                    <div class="min-w-0">
                      <p class="truncate text-sm font-black text-slate-800">Almacenamiento</p>
                      <p class="mt-3 text-xl font-black text-slate-900">65%</p>
                      <div class="mt-2 h-3 overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                        <div class="h-full rounded-full bg-pic-brand" style="width: 65%;"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </StdSection>

          <StdSection
            id="tables"
            title="3. Tablas"
            eyebrow="Categoria 3"
            :description="getComponent('tables').usage"
            icon="fa-solid fa-table"
          >
            <div class="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 shadow-inner lg:flex-row lg:items-center lg:justify-between">
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

            <div class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <article class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50 hover:shadow-md sm:px-5">
                <h3 class="mb-3 text-xs font-black uppercase text-slate-500">Tabla basica</h3>
                <div class="overflow-hidden rounded-xl border border-slate-200 text-xs">
                  <div class="grid grid-cols-[52px_minmax(0,1fr)_90px_90px] bg-slate-800 font-semibold uppercase text-white">
                    <span class="border-r border-slate-700 px-3 py-2">ID</span>
                    <span class="border-r border-slate-700 px-3 py-2">Producto</span>
                    <span class="border-r border-slate-700 px-3 py-2">Estado</span>
                    <span class="px-3 py-2 text-right">Importe</span>
                  </div>
                  <div v-for="row in tableRows" :key="`basic-${row.id}`" class="grid grid-cols-[52px_minmax(0,1fr)_90px_90px] border-t border-slate-100 font-semibold text-slate-600 transition hover:bg-slate-50">
                    <span class="border-r border-slate-100 px-3 py-2.5">{{ row.id }}</span>
                    <span class="border-r border-slate-100 px-3 py-2.5">{{ row.product }}</span>
                    <span class="border-r border-slate-100 px-3 py-2.5">{{ row.status }}</span>
                    <span class="px-3 py-2.5 text-right">{{ row.amount }}</span>
                  </div>
                </div>
              </article>

              <article class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50 hover:shadow-md sm:px-5">
                <h3 class="mb-3 text-xs font-black uppercase text-slate-500">Tabla con ordenacion</h3>
                <div class="overflow-hidden rounded-xl border border-slate-200 text-xs">
                  <div class="grid grid-cols-[52px_minmax(0,1fr)_90px_90px] bg-slate-800 font-semibold uppercase text-white">
                    <button type="button" class="flex items-center gap-1 border-r border-slate-700 px-3 py-2 text-left transition hover:bg-slate-700" @click="handleSort('id')">
                      ID <i class="fa-solid fa-sort text-[9px] text-white/70"></i>
                    </button>
                    <button type="button" class="flex items-center gap-1 border-r border-slate-700 px-3 py-2 text-left transition hover:bg-slate-700" @click="handleSort('product')">
                      Producto <i class="fa-solid fa-sort text-[9px] text-white/70"></i>
                    </button>
                    <span class="border-r border-slate-700 px-3 py-2">Estado</span>
                    <button type="button" class="flex items-center justify-end gap-1 px-3 py-2 text-right transition hover:bg-slate-700" @click="handleSort('amount')">
                      Importe <i class="fa-solid fa-sort text-[9px] text-white/70"></i>
                    </button>
                  </div>
                  <div v-for="row in tableRows" :key="`sortable-${row.id}`" class="grid grid-cols-[52px_minmax(0,1fr)_90px_90px] border-t border-slate-100 font-semibold text-slate-600 transition hover:bg-slate-50">
                    <span class="border-r border-slate-100 px-3 py-2.5">{{ row.id }}</span>
                    <span class="border-r border-slate-100 px-3 py-2.5">{{ row.product }}</span>
                    <span class="border-r border-slate-100 px-3 py-2.5">{{ row.status }}</span>
                    <span class="px-3 py-2.5 text-right">{{ row.amount }}</span>
                  </div>
                </div>
              </article>

              <article class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50 hover:shadow-md sm:px-5">
                <h3 class="mb-3 text-xs font-black uppercase text-slate-500">Tabla con acciones por fila</h3>
                <div class="overflow-hidden rounded-xl border border-slate-200 text-xs">
                  <div class="grid grid-cols-[52px_minmax(0,1fr)_80px_82px_48px] bg-slate-800 font-semibold uppercase text-white">
                    <span class="border-r border-slate-700 px-3 py-2">ID</span>
                    <span class="border-r border-slate-700 px-3 py-2">Producto</span>
                    <span class="border-r border-slate-700 px-3 py-2">Estado</span>
                    <span class="border-r border-slate-700 px-3 py-2 text-right">Importe</span>
                    <span class="px-2 py-2 text-center">Accion</span>
                  </div>
                  <div v-for="row in tableRows" :key="`actions-${row.id}`" class="grid grid-cols-[52px_minmax(0,1fr)_80px_82px_48px] border-t border-slate-100 font-semibold text-slate-600 transition hover:bg-slate-50">
                    <span class="border-r border-slate-100 px-3 py-2.5">{{ row.id }}</span>
                    <span class="border-r border-slate-100 px-3 py-2.5">{{ row.product }}</span>
                    <span class="border-r border-slate-100 px-3 py-2.5">{{ row.status }}</span>
                    <span class="border-r border-slate-100 px-3 py-2.5 text-right">{{ row.amount }}</span>
                    <span class="flex items-center justify-center px-2 py-1.5">
                      <button type="button" class="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-pic-brand" title="Acciones">
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                      </button>
                    </span>
                  </div>
                </div>
              </article>

              <article class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50 hover:shadow-md sm:px-5">
                <h3 class="mb-3 text-xs font-black uppercase text-slate-500">Tabla con seleccion (checkboxes)</h3>
                <div class="overflow-hidden rounded-xl border border-slate-200 text-xs">
                  <div class="grid grid-cols-[44px_52px_minmax(0,1fr)_90px_90px] bg-slate-800 font-semibold uppercase text-white">
                    <span class="flex items-center justify-center border-r border-slate-700 px-2 py-2">
                      <input type="checkbox" class="h-4 w-4 rounded border-slate-300 accent-pic-brand" :checked="selectedRows.length === tableRows.length" aria-label="Seleccionar todos" />
                    </span>
                    <span class="border-r border-slate-700 px-3 py-2">ID</span>
                    <span class="border-r border-slate-700 px-3 py-2">Producto</span>
                    <span class="border-r border-slate-700 px-3 py-2">Estado</span>
                    <span class="px-3 py-2 text-right">Importe</span>
                  </div>
                  <div
                    v-for="row in tableRows"
                    :key="`selectable-${row.id}`"
                    class="grid grid-cols-[44px_52px_minmax(0,1fr)_90px_90px] border-t border-slate-100 font-semibold text-slate-600 transition hover:bg-slate-50"
                    :class="selectedRows.includes(row.id) ? 'bg-pic-brand-soft shadow-[inset_4px_0_0_0_hsl(var(--pic-brand))] hover:bg-pic-brand-soft' : ''"
                  >
                    <span class="flex items-center justify-center border-r border-slate-100 px-2 py-2.5">
                      <input
                        type="checkbox"
                        class="h-4 w-4 rounded border-slate-300 accent-pic-brand"
                        :checked="selectedRows.includes(row.id)"
                        :aria-label="`Seleccionar ${row.product}`"
                        @change="handleSelectRow(row.id)"
                      />
                    </span>
                    <span class="border-r border-slate-100 px-3 py-2.5">{{ row.id }}</span>
                    <span class="border-r border-slate-100 px-3 py-2.5">{{ row.product }}</span>
                    <span class="border-r border-slate-100 px-3 py-2.5">{{ row.status }}</span>
                    <span class="px-3 py-2.5 text-right">{{ row.amount }}</span>
                  </div>
                </div>
              </article>

              <article class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50 hover:shadow-md sm:px-5 xl:col-span-2">
                <h3 class="mb-3 text-xs font-black uppercase text-slate-500">Tabla compacta con paginacion</h3>
                <div class="overflow-hidden rounded-xl border border-slate-200 text-xs">
                  <div class="grid grid-cols-[52px_minmax(0,1fr)_100px_100px] bg-slate-800 font-semibold uppercase text-white">
                    <span class="border-r border-slate-700 px-3 py-2">ID</span>
                    <span class="border-r border-slate-700 px-3 py-2">Producto</span>
                    <span class="border-r border-slate-700 px-3 py-2">Estado</span>
                    <span class="px-3 py-2 text-right">Importe</span>
                  </div>
                  <div v-for="row in tableRows.slice(0, 2)" :key="`compact-${row.id}`" class="grid grid-cols-[52px_minmax(0,1fr)_100px_100px] border-t border-slate-100 font-semibold text-slate-600 transition hover:bg-slate-50">
                    <span class="border-r border-slate-100 px-3 py-2.5">{{ row.id }}</span>
                    <span class="border-r border-slate-100 px-3 py-2.5">{{ row.product }}</span>
                    <span class="border-r border-slate-100 px-3 py-2.5">{{ row.status }}</span>
                    <span class="px-3 py-2.5 text-right">{{ row.amount }}</span>
                  </div>
                  <div class="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-black text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                    <div class="flex items-center gap-1">
                      <button type="button" class="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-pic-brand-soft hover:text-pic-brand" title="Primera pagina">
                        <i class="fa-solid fa-angles-left"></i>
                      </button>
                      <button type="button" class="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-pic-brand-soft hover:text-pic-brand" title="Pagina anterior">
                        <i class="fa-solid fa-chevron-left"></i>
                      </button>
                      <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-pic-brand text-white">1</span>
                      <span class="flex h-7 w-7 items-center justify-center rounded-lg">2</span>
                      <span class="flex h-7 w-7 items-center justify-center rounded-lg">3</span>
                      <span class="px-1">...</span>
                      <span class="flex h-7 w-7 items-center justify-center rounded-lg">10</span>
                      <button type="button" class="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-pic-brand-soft hover:text-pic-brand" title="Pagina siguiente">
                        <i class="fa-solid fa-chevron-right"></i>
                      </button>
                      <button type="button" class="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-pic-brand-soft hover:text-pic-brand" title="Ultima pagina">
                        <i class="fa-solid fa-angles-right"></i>
                      </button>
                    </div>
                    <button type="button" class="inline-flex h-7 w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-black uppercase text-slate-500 transition hover:bg-white hover:text-pic-brand">
                      10 por pagina
                      <i class="fa-solid fa-chevron-down text-[9px]"></i>
                    </button>
                  </div>
                </div>
              </article>
            </div>
          </StdSection>

          <StdSection
            id="charts"
            title="4. Graficos"
            eyebrow="Categoria 4"
            :description="getComponent('charts').usage"
            icon="fa-solid fa-chart-area"
          >
            <div class="mb-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs font-semibold leading-5 text-slate-600 shadow-inner">
              <p><strong class="text-slate-900">Nombre:</strong> {{ getComponent('charts').standardName }}</p>
              <p><strong class="text-slate-900">Nota:</strong> {{ getComponent('charts').notes }}</p>
            </div>
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <UiEChartPreview
                v-for="chart in chartExamples"
                :key="`${chart.type}-${activePaletteId}`"
                :type="chart.type"
                :title="chart.title"
              />
            </div>
          </StdSection>

          <StdSection
            id="filters"
            title="5. Filtros y seleccion"
            eyebrow="Categoria 5"
            :description="getComponent('filters').usage"
            icon="fa-solid fa-filter"
          >
            <div class="mb-4 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs font-semibold leading-5 text-slate-600 shadow-inner">
              <p><strong class="text-slate-900">Nombre:</strong> {{ getComponent('filters').standardName }}</p>
              <p><strong class="text-slate-900">Nota:</strong> {{ getComponent('filters').notes }}</p>
            </div>

            <div class="space-y-4">
              <div class="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5 lg:grid-cols-[minmax(0,1fr)_220px_260px]">
                <label class="block">
                  <span class="mb-1 block text-[10px] font-black uppercase text-slate-500">Search input</span>
                  <div class="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-400 shadow-sm transition focus-within:border-pic-brand focus-within:ring-2 focus-within:ring-pic-brand-border hover:bg-slate-50">
                    <i class="fa-solid fa-magnifying-glass"></i>
                    <input class="min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none" placeholder="Buscar..." />
                  </div>
                </label>
                <label class="block">
                  <span class="mb-1 block text-[10px] font-black uppercase text-slate-500">Select</span>
                  <select class="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm outline-none transition hover:bg-slate-50 focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-border">
                    <option>Region Norte</option>
                    <option>Region Sur</option>
                  </select>
                </label>
                <label class="block">
                  <span class="mb-1 block text-[10px] font-black uppercase text-slate-500">Date range</span>
                  <div class="flex h-11 items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50">
                    <span>01/05/2024</span>
                    <span class="text-slate-300">-</span>
                    <span>31/05/2024</span>
                    <i class="fa-regular fa-calendar text-slate-400"></i>
                  </div>
                </label>
              </div>

              <div class="flex flex-wrap gap-2">
                <span class="rounded-lg border border-pic-brand-border bg-pic-brand-soft px-2.5 py-1 text-xs font-black text-pic-brand shadow-[inset_4px_0_0_0_hsl(var(--pic-brand))]">Estado: Activo <i class="fa-solid fa-xmark ml-1"></i></span>
                <span class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-600 transition hover:bg-slate-50">Pais: Espana <i class="fa-solid fa-xmark ml-1 text-slate-400"></i></span>
                <span class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-600 transition hover:bg-slate-50">Segmento: Todos</span>
                <button type="button" class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-pic-brand transition hover:bg-slate-50">+ Anadir filtro</button>
              </div>

              <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50 sm:px-5">
                  <p class="mb-3 text-[10px] font-black uppercase text-slate-500">Radio y checkbox</p>
                  <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <label v-for="option in ['Opcion A', 'Opcion B', 'Opcion C']" :key="option" class="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-white">
                      <input type="radio" name="std-radio" class="accent-pic-brand" :checked="option === 'Opcion B'" />
                      {{ option }}
                    </label>
                  </div>
                  <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <label v-for="option in ['Activo', 'Inactivo', 'Pendiente']" :key="option" class="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-white">
                      <input type="checkbox" class="accent-pic-brand" :checked="option !== 'Inactivo'" />
                      {{ option }}
                    </label>
                  </div>
                </div>

                <div class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50 sm:px-5">
                  <p class="mb-3 text-[10px] font-black uppercase text-slate-500">Segmented control</p>
                  <div class="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1 sm:grid-cols-4">
                    <button
                      v-for="segment in segments"
                      :key="segment"
                      type="button"
                      class="h-9 rounded-lg border text-xs font-black transition"
                      :class="activeSegment === segment ? 'border-pic-brand bg-pic-brand text-white shadow-sm shadow-pic-brand/20' : 'border-transparent bg-transparent text-slate-600 hover:bg-white hover:text-pic-brand'"
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
            title="6. Controles"
            eyebrow="Categoria 6"
            :description="getComponent('controls').usage"
            icon="fa-solid fa-sliders"
          >
            <div class="mb-4 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs font-semibold leading-5 text-slate-600 shadow-inner">
              <p><strong class="text-slate-900">Nombre:</strong> {{ getComponent('controls').standardName }}</p>
              <p><strong class="text-slate-900">Fuente:</strong> {{ getComponent('controls').source }}</p>
            </div>

            <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <article class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50 hover:shadow-md sm:px-5">
                <p class="mb-3 text-[10px] font-black uppercase text-slate-500">Botones</p>
                <div class="flex flex-wrap items-center gap-2">
                  <StdButton variant="primary" icon="fa-solid fa-check">Primario</StdButton>
                  <StdButton icon="fa-solid fa-pen">Secundario</StdButton>
                  <StdButton variant="danger" icon="fa-solid fa-trash">Eliminar</StdButton>
                  <StdButton size="icon" icon="fa-solid fa-plus" />
                  <StdButton size="icon" icon="fa-solid fa-pen" />
                </div>
              </article>

              <article class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50 hover:shadow-md sm:px-5">
                <p class="mb-3 text-[10px] font-black uppercase text-slate-500">Switch y tabs</p>
                <div class="flex flex-wrap items-center gap-4">
                  <StdSwitch v-model="switchEnabled" label="Switch activo" />
                  <div class="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                    <button
                      v-for="tab in tabs"
                      :key="tab"
                      type="button"
                      class="h-8 rounded-md px-3 text-xs font-black transition"
                      :class="activeTab === tab ? 'bg-pic-brand text-white shadow-sm shadow-pic-brand/20' : 'text-slate-600 hover:bg-white hover:text-pic-brand'"
                      @click="activeTab = tab"
                    >
                      {{ tab }}
                    </button>
                  </div>
                </div>
              </article>

              <article class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50 hover:shadow-md sm:px-5">
                <p class="mb-3 text-[10px] font-black uppercase text-slate-500">Slider</p>
                <div class="flex items-center gap-3">
                  <input v-model="sliderValue" type="range" min="0" max="100" class="min-w-0 flex-1 accent-pic-brand" />
                  <span class="inline-flex h-9 min-w-12 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-xs font-black text-slate-700 shadow-sm">{{ sliderValue }}</span>
                </div>
              </article>

              <article class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50 hover:shadow-md sm:px-5">
                <p class="mb-3 text-[10px] font-black uppercase text-slate-500">Stepper</p>
                <div class="inline-flex h-10 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  <button type="button" class="w-10 font-black text-slate-500 transition hover:bg-slate-50 hover:text-pic-brand" @click="incrementStepper(-1)">-</button>
                  <span class="flex w-12 items-center justify-center border-x border-slate-200 text-xs font-black text-slate-800">{{ stepperValue }}</span>
                  <button type="button" class="w-10 font-black text-slate-500 transition hover:bg-slate-50 hover:text-pic-brand" @click="incrementStepper(1)">+</button>
                </div>
              </article>
            </div>
          </StdSection>

          <StdSection
            id="calendar"
            title="7. Calendarios y tiempo"
            eyebrow="Categoria 7"
            :description="getComponent('calendar').usage"
            icon="fa-regular fa-calendar-days"
          >
            <div class="mb-4 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs font-semibold leading-5 text-slate-600 shadow-inner">
              <p><strong class="text-slate-900">Nombre:</strong> {{ getComponent('calendar').standardName }}</p>
              <p><strong class="text-slate-900">Criterio:</strong> {{ getComponent('calendar').notes }}</p>
            </div>

            <div class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div class="space-y-4">
                <article class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50 hover:shadow-md sm:px-5">
                  <h3 class="mb-3 text-xs font-black uppercase text-slate-500">Calendario (vista de mes)</h3>
                  <div class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                    <div class="mb-4 flex items-center justify-between">
                      <button type="button" class="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-50 hover:text-pic-brand" title="Mes anterior">
                        <i class="fa-solid fa-chevron-left"></i>
                      </button>
                      <p class="text-sm font-black text-slate-900">Mayo 2024</p>
                      <button type="button" class="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-50 hover:text-pic-brand" title="Mes siguiente">
                        <i class="fa-solid fa-chevron-right"></i>
                      </button>
                    </div>
                    <div class="grid grid-cols-7 gap-2 text-center text-[11px] font-black text-slate-500">
                      <span v-for="day in weekDays" :key="`month-head-${day}`" class="flex aspect-square items-center justify-center rounded-lg">
                        {{ day }}
                      </span>
                    </div>
                    <div class="mt-1 grid grid-cols-7 gap-2 text-center text-sm font-black text-slate-700">
                      <span
                        v-for="(day, index) in monthCalendarDays"
                        :key="`month-day-${index}`"
                        class="flex aspect-square min-w-0 items-center justify-center rounded-lg transition"
                        :class="!day ? 'pointer-events-none text-transparent' : day === 15 ? 'bg-pic-brand text-white shadow-sm shadow-pic-brand/30' : 'hover:bg-pic-brand-soft hover:text-pic-brand'"
                      >
                        {{ day }}
                      </span>
                    </div>
                  </div>
                </article>

                <article class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50 hover:shadow-md sm:px-5">
                  <h3 class="mb-3 text-xs font-black uppercase text-slate-500">Timeline / selector de serie temporal</h3>
                  <div class="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <svg viewBox="0 0 360 92" class="h-24 w-full text-pic-brand" fill="none" aria-hidden="true">
                      <path d="M22 62 L44 45 L66 52 L88 38 L110 48 L132 34 L154 50 L176 30 L198 42 L220 22 L242 34 L264 20 L286 38 L308 32 L334 48" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                      <path d="M22 76 L22 62 L44 45 L66 52 L88 38 L110 48 L132 34 L154 50 L176 30 L198 42 L220 22 L242 34 L264 20 L286 38 L308 32 L334 48 L334 76 Z" fill="currentColor" opacity="0.12" />
                      <line x1="26" y1="18" x2="26" y2="78" stroke="currentColor" stroke-width="3" />
                      <rect x="20" y="42" width="12" height="26" rx="3" fill="white" stroke="currentColor" stroke-width="3" />
                      <line x1="326" y1="18" x2="326" y2="78" stroke="currentColor" stroke-width="3" />
                      <rect x="320" y="42" width="12" height="26" rx="3" fill="white" stroke="currentColor" stroke-width="3" />
                      <line x1="22" y1="78" x2="344" y2="78" stroke="#CBD5E1" stroke-width="1" />
                      <line x1="22" y1="72" x2="22" y2="84" stroke="#CBD5E1" stroke-width="1" />
                      <line x1="180" y1="72" x2="180" y2="84" stroke="#CBD5E1" stroke-width="1" />
                      <line x1="344" y1="72" x2="344" y2="84" stroke="#CBD5E1" stroke-width="1" />
                    </svg>
                    <div class="mt-1 flex items-center justify-between text-xs font-black text-slate-500">
                      <span>Abr '24</span>
                      <span>May '24</span>
                      <span>Jun '24</span>
                    </div>
                  </div>
                  <div class="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1 sm:grid-cols-6">
                    <button
                      v-for="option in timeRangeOptions"
                      :key="option"
                      type="button"
                      class="h-9 rounded-lg text-xs font-black transition"
                      :class="option === '30D' ? 'bg-pic-brand text-white shadow-sm shadow-pic-brand/20' : 'text-slate-600 hover:bg-white hover:text-pic-brand'"
                    >
                      {{ option }}
                    </button>
                  </div>
                </article>
              </div>

              <div class="space-y-4">
                <article class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50 hover:shadow-md sm:px-5">
                  <h3 class="mb-3 text-xs font-black uppercase text-slate-500">Date picker pequeno</h3>
                  <div class="flex h-11 items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50">
                    <span>15/05/2024</span>
                    <i class="fa-regular fa-calendar text-slate-400"></i>
                  </div>
                  <div class="mt-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div class="mb-3 flex items-center justify-between">
                      <button type="button" class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-50 hover:text-pic-brand" title="Mes anterior">
                        <i class="fa-solid fa-chevron-left text-xs"></i>
                      </button>
                      <p class="text-sm font-black text-slate-900">Mayo 2024</p>
                      <button type="button" class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-50 hover:text-pic-brand" title="Mes siguiente">
                        <i class="fa-solid fa-chevron-right text-xs"></i>
                      </button>
                    </div>
                    <div class="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-500">
                      <span v-for="day in weekDays" :key="`picker-head-${day}`" class="flex aspect-square items-center justify-center rounded-md">
                        {{ day }}
                      </span>
                    </div>
                    <div class="mt-1 grid grid-cols-7 gap-1 text-center text-[11px] font-black text-slate-700">
                      <span
                        v-for="(day, index) in monthCalendarDays"
                        :key="`picker-day-${index}`"
                        class="flex aspect-square min-w-0 items-center justify-center rounded-md transition"
                        :class="!day ? 'pointer-events-none text-transparent' : day === 15 ? 'bg-pic-brand text-white shadow-sm shadow-pic-brand/30' : 'hover:bg-pic-brand-soft hover:text-pic-brand'"
                      >
                        {{ day }}
                      </span>
                    </div>
                  </div>
                </article>

                <article class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:shadow-md sm:px-5">
                  <h3 class="mb-3 text-xs font-black uppercase text-slate-500">Agenda (lista)</h3>
                  <div class="overflow-hidden rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600">
                    <div
                      v-for="item in agendaItems"
                      :key="item.time"
                      class="group grid grid-cols-[78px_minmax(0,1fr)] border-b border-slate-100 transition last:border-b-0 hover:bg-pic-brand-soft"
                    >
                      <span class="border-r border-slate-100 bg-slate-50 px-3 py-3 font-black text-slate-700 transition group-hover:border-pic-brand-border group-hover:bg-white group-hover:text-pic-brand">{{ item.time }}</span>
                      <span class="px-3 py-3 transition group-hover:text-slate-900">{{ item.title }}</span>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </StdSection>

          <StdSection
            id="feedback"
            title="8. Estados y feedback"
            eyebrow="Categoria 8"
            :description="getComponent('feedback').usage"
            icon="fa-solid fa-circle-info"
          >
            <div class="mb-4 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs font-semibold leading-5 text-slate-600 shadow-inner">
              <p><strong class="text-slate-900">Nombre:</strong> {{ getComponent('feedback').standardName }}</p>
              <p><strong class="text-slate-900">Fuente:</strong> {{ getComponent('feedback').source }}</p>
            </div>

            <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div class="space-y-3">
                <StdAlert title="Actualizacion disponible" description="Hay cambios pendientes de publicar para este modulo." tone="info" />
                <StdAlert title="Guardado correctamente" description="Los cambios quedaron registrados." tone="success" />
                <StdAlert title="Advertencia operativa" description="Revisa los datos antes de continuar." tone="warning" />
                <StdAlert title="Error de validacion" description="Faltan campos obligatorios para completar la accion." tone="danger" />
              </div>

              <div class="space-y-3">
                <div class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50 hover:shadow-md sm:px-5">
                  <div class="mb-3 flex items-center justify-between gap-3">
                    <p class="text-[10px] font-black uppercase text-slate-500">Loading skeleton</p>
                    <span class="inline-flex h-7 items-center rounded-lg border border-slate-200 bg-slate-50 px-2 text-[10px] font-black text-slate-500">
                      Cargando
                    </span>
                  </div>
                  <div class="grid grid-cols-[44px_minmax(0,1fr)_72px] gap-3 rounded-xl border border-slate-200 bg-white p-3">
                    <div class="h-11 w-11 rounded-xl bg-slate-100"></div>
                    <div class="min-w-0 space-y-2 py-1">
                      <div class="h-3 w-2/3 rounded bg-slate-200"></div>
                      <div class="h-3 w-full rounded bg-slate-100"></div>
                      <div class="h-3 w-4/5 rounded bg-slate-100"></div>
                    </div>
                    <div class="space-y-2 py-1">
                      <div class="ml-auto h-3 w-12 rounded bg-slate-100"></div>
                      <div class="ml-auto h-7 w-16 rounded-lg bg-slate-100"></div>
                    </div>
                  </div>
                </div>

                <div class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50 hover:shadow-md sm:px-5">
                  <div class="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p class="text-[10px] font-black uppercase text-slate-500">Progress y badges</p>
                      <p class="mt-1 text-xs font-semibold text-slate-500">Estados compactos para flujos operativos.</p>
                    </div>
                    <span class="inline-flex h-8 items-center rounded-lg border border-pic-brand-border bg-pic-brand-soft px-3 text-xs font-black text-pic-brand">
                      62%
                    </span>
                  </div>
                  <div class="rounded-full border border-slate-200 bg-white p-1 shadow-inner">
                    <div class="h-2.5 rounded-full bg-pic-brand shadow-sm shadow-pic-brand/20" style="width: 62%;"></div>
                  </div>
                  <div class="mt-3 flex flex-wrap gap-2">
                    <span class="inline-flex h-7 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-black text-slate-600">
                      <span class="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                      Nuevo
                    </span>
                    <span class="inline-flex h-7 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 text-[10px] font-black text-amber-700">
                      <span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                      En progreso
                    </span>
                    <span class="inline-flex h-7 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[10px] font-black text-emerald-700">
                      <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      Completado
                    </span>
                    <span class="inline-flex h-7 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 text-[10px] font-black text-red-700">
                      <span class="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                      Error
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </StdSection>

          <StdSection
            id="overlays"
            title="9. Ventanas y capas"
            eyebrow="Categoria 9"
            :description="getComponent('overlays').usage"
            icon="fa-regular fa-window-restore"
          >
            <div class="mb-4 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs font-semibold leading-5 text-slate-600 shadow-inner">
              <p><strong class="text-slate-900">Nombre:</strong> {{ getComponent('overlays').standardName }}</p>
              <p><strong class="text-slate-900">Nota:</strong> {{ getComponent('overlays').notes }}</p>
            </div>

            <div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <article class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50 hover:shadow-md sm:px-5">
                <div class="mb-3 flex items-center justify-between">
                  <p class="text-sm font-black text-slate-900">Modal de edicion</p>
                  <span class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-red-600">
                    <i class="fa-solid fa-xmark"></i>
                  </span>
                </div>
                <div class="space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div class="h-3 rounded bg-slate-200"></div>
                  <div class="h-3 w-3/4 rounded bg-slate-100"></div>
                  <div class="h-11 rounded-lg border border-slate-200 bg-white shadow-sm"></div>
                </div>
                <div class="mt-4 flex justify-end gap-2">
                  <StdButton size="sm">Cancelar</StdButton>
                  <StdButton size="sm" variant="primary">Aceptar</StdButton>
                </div>
              </article>

              <article class="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-4 shadow-inner">
                <div class="ml-auto max-w-[240px] rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <div class="mb-3 flex items-center justify-between">
                    <p class="text-sm font-black text-slate-900">Drawer</p>
                    <span class="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-red-600">
                      <i class="fa-solid fa-xmark"></i>
                    </span>
                  </div>
                  <div class="space-y-2">
                    <span class="block h-9 rounded-lg bg-pic-brand-soft shadow-[inset_4px_0_0_0_hsl(var(--pic-brand))] ring-1 ring-pic-brand-border"></span>
                    <span class="block h-9 rounded-lg bg-white ring-1 ring-slate-200"></span>
                    <span class="block h-9 rounded-lg bg-white ring-1 ring-slate-200"></span>
                  </div>
                  <StdButton class="mt-4" size="sm" variant="primary">Aplicar</StdButton>
                </div>
              </article>

              <article class="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50 hover:shadow-md sm:px-5">
                <p class="mb-3 text-sm font-black text-slate-900">Confirmacion</p>
                <p class="text-xs font-semibold leading-5 text-slate-500">Esta accion no se puede deshacer.</p>
                <div class="mt-4 flex justify-end gap-2">
                  <StdButton size="sm">Cancelar</StdButton>
                  <StdButton size="sm" variant="danger">Eliminar</StdButton>
                </div>
                <div class="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-3 text-xs font-semibold text-slate-500 shadow-sm">
                  <i class="fa-regular fa-circle-question mr-1 text-pic-brand"></i>
                  Tooltip/popover para ayuda contextual.
                </div>
              </article>
            </div>
          </StdSection>

          <StdSection
            id="dashboards"
            title="10. Patrones de dashboard"
            eyebrow="Categoria 10"
            :description="getComponent('dashboards').usage"
            icon="fa-solid fa-chart-pie"
          >
            <div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <article
                v-for="pattern in dashboardPatterns"
                :key="pattern.title"
                class="group rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50 hover:shadow-md sm:px-5"
              >
                <span class="flex h-10 w-10 items-center justify-center rounded-lg border border-pic-brand-border bg-pic-brand-soft text-pic-brand shadow-sm transition group-hover:bg-white">
                  <i :class="pattern.icon"></i>
                </span>
                <h3 class="mt-3 text-sm font-black text-slate-900">{{ pattern.title }}</h3>
                <p class="mt-1 text-xs font-semibold leading-5 text-slate-500">{{ pattern.description }}</p>
                <p class="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-[10px] text-slate-500 shadow-sm">
                  {{ pattern.layout }}
                </p>
              </article>
            </div>

            <div class="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
              <div class="grid grid-cols-1 gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
                <div class="rounded-xl border border-slate-200 bg-slate-50/80 p-3 shadow-inner">
                  <div class="mb-3 h-8 rounded bg-pic-brand-soft shadow-[inset_4px_0_0_0_hsl(var(--pic-brand))] ring-1 ring-pic-brand-border"></div>
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
                    <UiEChartPreview :key="`dashboard-${activePaletteId}`" type="line" title="Tendencia principal" />
                    <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      <div class="bg-slate-800 px-3 py-2 text-[10px] font-semibold uppercase text-white">Tabla resumen</div>
                      <div class="divide-y divide-slate-100">
                        <div v-for="row in 4" :key="`dashboard-summary-${row}`" class="grid h-9 grid-cols-[minmax(0,1fr)_72px] items-center gap-3 px-3 transition hover:bg-slate-50">
                          <span class="h-2.5 rounded bg-slate-100"></span>
                          <span class="h-2.5 rounded bg-slate-200"></span>
                        </div>
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
              <article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 class="text-sm font-black text-slate-900">Nuevos modulos</h3>
                <ul class="mt-3 space-y-2 text-xs font-semibold leading-5 text-slate-600">
                  <li>Usar <span class="font-mono text-pic-brand">StdPageHeader</span> para encabezados.</li>
                  <li>Usar <span class="font-mono text-pic-brand">StdSection</span> para paneles operativos.</li>
                  <li>Usar <span class="font-mono text-pic-brand">StdButton</span>, <span class="font-mono text-pic-brand">StdSwitch</span> y <span class="font-mono text-pic-brand">StdAlert</span> para controles comunes.</li>
                  <li>Usar <span class="font-mono text-pic-brand">StdKpiCard</span> y <span class="font-mono text-pic-brand">StdDataTable</span> en dashboards y listados.</li>
                </ul>
              </article>

              <article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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
              <article class="rounded-xl border border-pic-brand-border bg-pic-brand-soft p-4 shadow-sm">
                <p class="text-[10px] font-black uppercase text-pic-brand">Fase actual</p>
                <h3 class="mt-2 text-sm font-black text-slate-900">Referencia confiable</h3>
                <p class="mt-1 text-xs font-semibold leading-5 text-slate-600">Ordenar catalogo, nombres STD y muestras reales.</p>
              </article>
              <article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p class="text-[10px] font-black uppercase text-slate-500">Fase 2</p>
                <h3 class="mt-2 text-sm font-black text-slate-900">Persistencia Setup</h3>
                <p class="mt-1 text-xs font-semibold leading-5 text-slate-500">Guardar paleta y tokens desde backend en lugar de localStorage.</p>
              </article>
              <article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p class="text-[10px] font-black uppercase text-slate-500">Fase 3</p>
                <h3 class="mt-2 text-sm font-black text-slate-900">Adopcion gradual</h3>
                <p class="mt-1 text-xs font-semibold leading-5 text-slate-500">Migrar headers, botones, KPIs, tablas y filtros por prioridad.</p>
              </article>
              <article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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
