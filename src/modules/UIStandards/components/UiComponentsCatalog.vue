<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import FilterDropdown from '@/modules/Shared/components/FilterDropdown.vue';
import {
  StdAlert,
  StdButton,
  StdDataTable,
  StdFilterGroup,
  StdFilterPanel,
  StdKpiCard,
  StdPageHeader,
  StdSection,
  StdSwitch,
} from '@/modules/Shared/components/std';
import { tableColumns, tableRows, uiCatalogEntries } from '../utils/uiStandardsCatalog';

const search = ref('');
const category = ref('Todos');
const scope = ref('Todos');
const selectedId = ref(uiCatalogEntries.find(entry => entry.scope === 'shared')?.id || uiCatalogEntries[0]?.id || '');
const copied = ref(false);
const demoSelection = ref<string[]>(['Centro']);
const demoSwitch = ref(true);
const demoCollapsed = ref(true);

const categories = ['Todos', ...new Set(uiCatalogEntries.map(entry => entry.category))];
const scopes = [
  { value: 'Todos', label: 'Todos los alcances' },
  { value: 'shared', label: 'Compartidos' },
  { value: 'pattern', label: 'Patrones' },
  { value: 'module-example', label: 'Ejemplos aplicados' },
];

const filteredEntries = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('es-MX');
  return uiCatalogEntries.filter(entry => {
    const matchesCategory = category.value === 'Todos' || entry.category === category.value;
    const matchesScope = scope.value === 'Todos' || entry.scope === scope.value;
    const haystack = `${entry.name} ${entry.description} ${entry.category}`.toLocaleLowerCase('es-MX');
    return matchesCategory && matchesScope && (!query || haystack.includes(query));
  });
});

const selectedEntry = computed(() => (
  uiCatalogEntries.find(entry => entry.id === selectedId.value) || filteredEntries.value[0] || null
));

const selectedCode = computed(() => selectedEntry.value?.examples.find(example => example.code)?.code || '');

const maturityMeta = {
  stable: { label: 'Estable', className: 'border-[hsl(var(--pic-success)/0.28)] bg-[hsl(var(--pic-success)/0.08)] text-pic-success' },
  candidate: { label: 'Candidato', className: 'border-[hsl(var(--pic-info)/0.28)] bg-[hsl(var(--pic-info)/0.08)] text-pic-info' },
  planned: { label: 'Planeado', className: 'border-pic-border bg-pic-muted-surface text-pic-text-muted' },
  deprecated: { label: 'Deprecated', className: 'border-[hsl(var(--pic-danger)/0.28)] bg-[hsl(var(--pic-danger)/0.08)] text-pic-danger' },
};

const scopeMeta = {
  shared: 'Compartido',
  pattern: 'Patrón',
  'module-example': 'Ejemplo aplicado',
};

watch(filteredEntries, entries => {
  if (entries.length > 0 && !entries.some(entry => entry.id === selectedId.value)) {
    selectedId.value = entries[0]!.id;
  }
});

const copyCode = async () => {
  if (!selectedCode.value) return;
  try {
    await navigator.clipboard.writeText(selectedCode.value);
    copied.value = true;
    window.setTimeout(() => { copied.value = false; }, 1600);
  } catch {
    copied.value = false;
  }
};
</script>

<template>
  <div class="space-y-4">
    <section class="rounded-xl border border-pic-border bg-pic-surface p-3 shadow-sm sm:p-4">
      <div class="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
        <label class="relative block">
          <span class="sr-only">Buscar componente</span>
          <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-pic-text-muted"></i>
          <input
            v-model="search"
            type="search"
            placeholder="Buscar por nombre, categoría o propósito..."
            class="h-10 w-full rounded-lg border border-pic-border bg-pic-surface pl-9 pr-3 text-sm font-medium text-pic-text-main outline-none transition hover:bg-pic-muted-surface focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-border"
          >
        </label>
        <label>
          <span class="sr-only">Categoría</span>
          <select v-model="category" class="h-10 w-full rounded-lg border border-pic-border bg-pic-surface px-3 text-sm font-semibold text-pic-text-main outline-none focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-border">
            <option v-for="item in categories" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>
        <label>
          <span class="sr-only">Alcance</span>
          <select v-model="scope" class="h-10 w-full rounded-lg border border-pic-border bg-pic-surface px-3 text-sm font-semibold text-pic-text-main outline-none focus:border-pic-brand focus:ring-2 focus:ring-pic-brand-border">
            <option v-for="item in scopes" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>
      </div>
    </section>

    <div class="grid grid-cols-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside class="max-h-[760px] space-y-2 overflow-y-auto pr-1">
        <button
          v-for="entry in filteredEntries"
          :key="entry.id"
          type="button"
          class="w-full rounded-xl border p-3 text-left transition"
          :class="selectedEntry?.id === entry.id
            ? 'border-pic-brand-border bg-pic-brand-soft shadow-[inset_4px_0_0_0_hsl(var(--pic-brand))]'
            : 'border-pic-border bg-pic-surface hover:border-pic-brand-border hover:bg-pic-muted-surface'"
          @click="selectedId = entry.id"
        >
          <div class="flex items-start justify-between gap-2">
            <span class="min-w-0">
              <span class="block truncate text-xs font-extrabold text-pic-text-main">{{ entry.name }}</span>
              <span class="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-pic-text-muted">{{ entry.category }}</span>
            </span>
            <span class="shrink-0 rounded-lg border px-2 py-0.5 text-[9px] font-bold uppercase" :class="maturityMeta[entry.maturity].className">
              {{ maturityMeta[entry.maturity].label }}
            </span>
          </div>
          <p class="mt-2 line-clamp-2 text-[11px] font-medium leading-4 text-pic-text-muted">{{ entry.description }}</p>
        </button>
        <div v-if="filteredEntries.length === 0" class="rounded-xl border border-dashed border-pic-border bg-pic-muted-surface p-6 text-center">
          <p class="text-xs font-bold text-pic-text-muted">No hay coincidencias.</p>
        </div>
      </aside>

      <section v-if="selectedEntry" class="min-w-0 space-y-4">
        <article class="rounded-xl border border-pic-border bg-pic-surface p-4 shadow-sm sm:p-5">
          <div class="flex flex-col gap-3 border-b border-pic-border pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-lg border border-pic-border bg-pic-muted-surface px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-pic-text-muted">
                  {{ scopeMeta[selectedEntry.scope] }}
                </span>
                <span class="rounded-lg border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em]" :class="maturityMeta[selectedEntry.maturity].className">
                  {{ maturityMeta[selectedEntry.maturity].label }}
                </span>
              </div>
              <h2 class="mt-3 text-xl font-extrabold tracking-tight text-pic-text-main">{{ selectedEntry.name }}</h2>
              <p class="mt-2 max-w-3xl text-sm font-medium leading-6 text-pic-text-muted">{{ selectedEntry.description }}</p>
            </div>
            <div class="shrink-0 text-left sm:text-right">
              <p class="text-[9px] font-bold uppercase tracking-[0.12em] text-pic-text-muted">Archivo</p>
              <p class="mt-1 max-w-sm break-all font-mono text-[10px] text-pic-brand">{{ selectedEntry.source }}</p>
            </div>
          </div>

          <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <h3 class="text-xs font-extrabold uppercase tracking-[0.12em] text-pic-text-muted">Úsalo cuando</h3>
              <ul class="mt-2 space-y-1.5">
                <li v-for="item in selectedEntry.useWhen" :key="item" class="flex items-start gap-2 text-xs font-medium leading-5 text-pic-text-muted">
                  <i class="fa-solid fa-check mt-1 text-[9px] text-pic-success"></i><span>{{ item }}</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 class="text-xs font-extrabold uppercase tracking-[0.12em] text-pic-text-muted">Evítalo cuando</h3>
              <ul class="mt-2 space-y-1.5">
                <li v-for="item in selectedEntry.avoidWhen" :key="item" class="flex items-start gap-2 text-xs font-medium leading-5 text-pic-text-muted">
                  <i class="fa-solid fa-xmark mt-1 text-[10px] text-pic-danger"></i><span>{{ item }}</span>
                </li>
              </ul>
            </div>
          </div>
        </article>

        <article v-if="selectedEntry.scope === 'shared'" class="rounded-xl border border-pic-border bg-pic-muted-surface p-3 shadow-sm sm:p-4">
          <div class="mb-3 flex items-center justify-between">
            <div>
              <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-pic-brand">Muestra real</p>
              <p class="mt-0.5 text-xs font-medium text-pic-text-muted">Interactúa con sus estados y variantes disponibles.</p>
            </div>
          </div>
          <div class="rounded-xl border border-pic-border bg-pic-background p-4">
            <div v-if="selectedEntry.id === 'std-button'" class="flex flex-wrap gap-2">
              <StdButton variant="primary" icon="fa-solid fa-check">Primario</StdButton>
              <StdButton icon="fa-solid fa-pen">Secundario</StdButton>
              <StdButton variant="danger" icon="fa-solid fa-trash">Eliminar</StdButton>
              <StdButton variant="ghost" icon="fa-solid fa-filter">Ghost</StdButton>
            </div>
            <div v-else-if="selectedEntry.id === 'std-alert'" class="grid gap-3 lg:grid-cols-2">
              <StdAlert title="Información disponible" description="Contexto adicional para completar la tarea." />
              <StdAlert tone="warning" title="Cambios pendientes" description="Aplica los filtros antes de interpretar el resultado." />
            </div>
            <StdKpiCard v-else-if="selectedEntry.id === 'std-kpi-card'" label="Venta neta" value="$24.5M" detail="+8.2% vs periodo anterior" trend="up" icon="fa-solid fa-chart-line" />
            <StdDataTable v-else-if="selectedEntry.id === 'std-data-table'" :columns="tableColumns" :rows="tableRows" :show-actions="false" />
            <FilterDropdown v-else-if="selectedEntry.id === 'filter-dropdown'" label="Gerencia" :options="['Centro', 'Norte', 'Sureste']" v-model="demoSelection" />
            <StdFilterPanel v-else-if="selectedEntry.id === 'std-filter-panel'" v-model:collapsed="demoCollapsed" :active-count="demoSelection.length" summary="2026 · Centro" status="dirty">
              <StdFilterGroup title="Comercial" icon="fa-solid fa-briefcase">
                <FilterDropdown density="compact" label="Gerencia" :options="['Centro', 'Norte', 'Sureste']" v-model="demoSelection" />
              </StdFilterGroup>
            </StdFilterPanel>
            <StdFilterGroup v-else-if="selectedEntry.id === 'std-filter-group'" title="Producto" icon="fa-solid fa-box-open">
              <FilterDropdown density="compact" label="Marca" :options="['Marca A', 'Marca B']" v-model="demoSelection" />
            </StdFilterGroup>
            <StdPageHeader v-else-if="selectedEntry.id === 'std-page-header'" eyebrow="Catálogo / Operación" title="Gestión de artículos" description="Consulta y administra la información disponible." icon="fa-solid fa-box" />
            <StdSection v-else-if="selectedEntry.id === 'std-section'" title="Resumen operativo" description="Agrupa contenido con una función concreta.">
              <p class="text-xs font-medium text-pic-text-muted">Contenido de ejemplo.</p>
            </StdSection>
            <StdSwitch v-else-if="selectedEntry.id === 'std-switch'" v-model="demoSwitch" label="Configuración activa" />
            <div v-else class="rounded-lg border border-dashed border-pic-border bg-pic-surface p-6 text-center text-xs font-medium text-pic-text-muted">
              Consulta las instrucciones y el archivo para revisar su composición completa.
            </div>
          </div>
        </article>

        <article v-if="selectedEntry.props?.length || selectedEntry.slots?.length || selectedEntry.events?.length" class="rounded-xl border border-pic-border bg-pic-surface p-4 shadow-sm sm:p-5">
          <h3 class="text-sm font-extrabold text-pic-text-main">API del componente</h3>
          <div class="mt-4 space-y-4">
            <div v-if="selectedEntry.props?.length">
              <p class="text-[10px] font-bold uppercase tracking-[0.12em] text-pic-brand">Props</p>
              <div class="mt-2 overflow-x-auto rounded-lg border border-pic-border">
                <table class="w-full min-w-[620px] text-left text-xs">
                  <tbody class="divide-y divide-pic-border">
                    <tr v-for="item in selectedEntry.props" :key="item.name">
                      <td class="w-36 bg-pic-muted-surface px-3 py-2 font-mono font-bold text-pic-text-main">{{ item.name }}</td>
                      <td class="w-52 px-3 py-2 font-mono text-[10px] text-pic-brand">{{ item.type }}</td>
                      <td class="px-3 py-2 font-medium text-pic-text-muted">{{ item.description }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div v-if="selectedEntry.slots?.length || selectedEntry.events?.length" class="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div v-if="selectedEntry.slots?.length">
                <p class="text-[10px] font-bold uppercase tracking-[0.12em] text-pic-brand">Slots</p>
                <div class="mt-2 space-y-2">
                  <div v-for="item in selectedEntry.slots" :key="item.name" class="rounded-lg border border-pic-border bg-pic-muted-surface p-2.5">
                    <p class="font-mono text-[10px] font-bold text-pic-text-main">{{ item.name }}</p>
                    <p class="mt-1 text-[11px] font-medium text-pic-text-muted">{{ item.description }}</p>
                  </div>
                </div>
              </div>
              <div v-if="selectedEntry.events?.length">
                <p class="text-[10px] font-bold uppercase tracking-[0.12em] text-pic-brand">Eventos</p>
                <div class="mt-2 space-y-2">
                  <div v-for="item in selectedEntry.events" :key="item.name" class="rounded-lg border border-pic-border bg-pic-muted-surface p-2.5">
                    <p class="font-mono text-[10px] font-bold text-pic-text-main">{{ item.name }}</p>
                    <p class="mt-1 text-[11px] font-medium text-pic-text-muted">{{ item.description }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>

        <article v-if="selectedCode" class="overflow-hidden rounded-xl border border-pic-border bg-pic-nav shadow-sm">
          <div class="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-pic-nav-text-muted">Snippet</p>
              <p class="mt-0.5 text-xs font-bold text-pic-nav-text">{{ selectedEntry.examples.find(example => example.code)?.title }}</p>
            </div>
            <button type="button" class="inline-flex h-8 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-[11px] font-bold text-pic-nav-text transition hover:bg-white/10" @click="copyCode">
              <i class="fa-solid" :class="copied ? 'fa-check text-pic-success' : 'fa-copy'"></i>
              {{ copied ? 'Copiado' : 'Copiar' }}
            </button>
          </div>
          <pre class="overflow-x-auto p-4 text-[11px] leading-5 text-pic-nav-text-muted"><code>{{ selectedCode }}</code></pre>
        </article>
      </section>
    </div>
  </div>
</template>
