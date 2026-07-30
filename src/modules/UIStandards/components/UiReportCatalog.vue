<script setup lang="ts">
import { computed, ref } from 'vue';
import FilterDropdown from '@/modules/Shared/components/FilterDropdown.vue';
import {
  StdFilterGroup,
  StdFilterPanel,
  type StdFilterPanelStatus,
} from '@/modules/Shared/components/std';
import { reportAnatomy } from '../utils/uiStandardsCatalog';

const collapsed = ref(false);
const status = ref<StdFilterPanelStatus>('idle');
const selectedCanales = ref<string[]>([]);
const selectedGerencias = ref<string[]>(['Centro']);
const selectedJefaturas = ref<string[]>([]);
const selectedRutas = ref<string[]>([]);
const selectedMarcas = ref<string[]>([]);
const selectedGrupos = ref<string[]>([]);
const selectedCategorias = ref<string[]>([]);
const selectedYears = ref<string[]>(['2024', '2025', '2026']);
const selectedTransactions = ref<string[]>(['Venta']);
const selectedFormatos = ref<string[]>([]);
const lockedGerencia = ref(false);

const jefaturaOptions = ref<string[]>(['Jefatura Centro 1', 'Jefatura Centro 2']);
const rutaOptions = ref<string[]>([]);
const groupOptions = ref<string[]>([]);
const categoryOptions = ref<string[]>([]);

const activeCount = computed(() => [
  selectedCanales.value,
  selectedGerencias.value,
  selectedJefaturas.value,
  selectedRutas.value,
  selectedMarcas.value,
  selectedGrupos.value,
  selectedCategorias.value,
  selectedFormatos.value,
  selectedYears.value,
  selectedTransactions.value,
].filter(values => values.length > 0).length);

const summary = computed(() => {
  const years = selectedYears.value.length ? selectedYears.value.join(', ') : 'Sin años';
  const scope = selectedGerencias.value.length ? selectedGerencias.value.join(', ') : 'Alcance general';
  return `${years} · ${scope}`;
});

const markDirty = () => {
  if (status.value !== 'loading') status.value = 'dirty';
};

const handleGerenciaChange = () => {
  selectedJefaturas.value = [];
  selectedRutas.value = [];
  rutaOptions.value = [];
  jefaturaOptions.value = selectedGerencias.value.length ? ['Jefatura Centro 1', 'Jefatura Centro 2'] : [];
  markDirty();
};

const handleJefaturaChange = () => {
  selectedRutas.value = [];
  rutaOptions.value = selectedJefaturas.value.length ? ['Ruta 01', 'Ruta 02', 'Ruta 03'] : [];
  markDirty();
};

const handleMarcaChange = () => {
  selectedGrupos.value = [];
  selectedCategorias.value = [];
  categoryOptions.value = [];
  groupOptions.value = selectedMarcas.value.length ? ['Grupo Tradicional', 'Grupo Premium'] : [];
  markDirty();
};

const handleGroupChange = () => {
  selectedCategorias.value = [];
  categoryOptions.value = selectedGrupos.value.length ? ['Categoría A', 'Categoría B'] : [];
  markDirty();
};

const apply = () => {
  status.value = 'loading';
  window.setTimeout(() => {
    status.value = 'ready';
    collapsed.value = true;
  }, 650);
};

const reset = () => {
  selectedCanales.value = [];
  if (!lockedGerencia.value) selectedGerencias.value = [];
  selectedJefaturas.value = [];
  selectedRutas.value = [];
  selectedMarcas.value = [];
  selectedGrupos.value = [];
  selectedCategorias.value = [];
  selectedFormatos.value = [];
  selectedYears.value = ['2024', '2025', '2026'];
  selectedTransactions.value = ['Venta'];
  jefaturaOptions.value = lockedGerencia.value ? ['Jefatura Centro 1', 'Jefatura Centro 2'] : [];
  rutaOptions.value = [];
  groupOptions.value = [];
  categoryOptions.value = [];
  markDirty();
};

const toggleScopeLock = () => {
  lockedGerencia.value = !lockedGerencia.value;
  if (lockedGerencia.value) {
    selectedGerencias.value = ['Centro'];
    handleGerenciaChange();
  }
};
</script>

<template>
  <div class="space-y-5">
    <section class="rounded-xl border border-pic-border bg-pic-surface p-4 shadow-sm sm:p-5">
      <div class="flex flex-col gap-3 border-b border-pic-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-pic-brand">Recorrido recomendado</p>
          <h2 class="mt-1 text-xl font-extrabold tracking-tight text-pic-text-main">Anatomía de un reporte claro</h2>
          <p class="mt-2 max-w-3xl text-sm font-medium leading-6 text-pic-text-muted">
            La secuencia orienta la lectura. Cada módulo conserva libertad para omitir, extender o reorganizar bloques cuando su negocio lo exige.
          </p>
        </div>
        <span class="inline-flex w-fit items-center gap-2 rounded-lg border border-pic-brand-border bg-pic-brand-soft px-3 py-2 text-[11px] font-bold text-pic-brand">
          <i class="fa-solid fa-shuffle"></i>
          Composición adaptable
        </span>
      </div>

      <ol class="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        <li v-for="step in reportAnatomy" :key="step.number" class="group rounded-xl border border-pic-border bg-pic-surface p-3 transition hover:border-pic-brand-border hover:bg-pic-brand-soft">
          <div class="flex items-start gap-3">
            <span class="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-pic-brand px-2 text-xs font-extrabold text-white">{{ step.number }}</span>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-xs font-extrabold text-pic-text-main">{{ step.title }}</h3>
                <span v-if="!step.required" class="rounded-md border border-pic-border bg-pic-muted-surface px-1.5 py-0.5 text-[8px] font-bold uppercase text-pic-text-muted">Opcional</span>
              </div>
              <p class="mt-1 text-[11px] font-medium leading-4 text-pic-text-muted">{{ step.description }}</p>
            </div>
          </div>
        </li>
      </ol>
    </section>

    <section class="space-y-3">
      <div>
        <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-pic-brand">Muestra interactiva</p>
        <h2 class="mt-1 text-lg font-extrabold text-pic-text-main">Comportamiento estándar de filtros</h2>
        <p class="mt-1 text-xs font-medium leading-5 text-pic-text-muted">
          Prueba el colapso, las cascadas, las restricciones, el resumen y los estados del panel.
        </p>
      </div>

      <StdFilterPanel
        v-model:collapsed="collapsed"
        :active-count="activeCount"
        :summary="summary"
        :status="status"
        :loading="status === 'loading'"
        :can-reset="!lockedGerencia"
        @apply="apply"
        @reset="reset"
      >
        <StdFilterGroup title="Comercial" icon="fa-solid fa-briefcase">
          <FilterDropdown density="compact" label="Canal" :options="['Autoservicio', 'Mayoreo', 'Conveniencia']" v-model="selectedCanales" @change="markDirty" />
          <div>
            <FilterDropdown
              density="compact"
              label="Gerencia"
              :options="['Centro', 'Norte', 'Sureste']"
              v-model="selectedGerencias"
              :disabled="lockedGerencia"
              @change="handleGerenciaChange"
            />
            <p v-if="lockedGerencia" class="ml-1 mt-1 flex items-center gap-1 text-[10px] font-medium text-pic-brand">
              <i class="fa-solid fa-lock text-[9px]"></i> Restringida por perfil
            </p>
          </div>
          <FilterDropdown density="compact" label="Jefatura" :options="jefaturaOptions" v-model="selectedJefaturas" :disabled="jefaturaOptions.length === 0" @change="handleJefaturaChange" />
          <FilterDropdown density="compact" label="Ruta" :options="rutaOptions" v-model="selectedRutas" :disabled="rutaOptions.length === 0" @change="markDirty" />
        </StdFilterGroup>

        <StdFilterGroup title="Clientes" icon="fa-solid fa-users" :default-open="false">
          <FilterDropdown density="compact" label="Formato" :options="['Club', 'Bodega', 'Supermercado']" v-model="selectedFormatos" @change="markDirty" />
          <div class="rounded-lg border border-dashed border-pic-border bg-pic-surface p-3 text-center">
            <i class="fa-solid fa-magnifying-glass text-xs text-pic-brand"></i>
            <p class="mt-1 text-[10px] font-medium text-pic-text-muted">Búsqueda paginada puede permanecer específica.</p>
          </div>
        </StdFilterGroup>

        <StdFilterGroup title="Producto" icon="fa-solid fa-box-open" :default-open="false">
          <FilterDropdown density="compact" label="Marca" :options="['Marca A', 'Marca B']" v-model="selectedMarcas" @change="handleMarcaChange" />
          <FilterDropdown density="compact" label="Grupo" :options="groupOptions" v-model="selectedGrupos" :disabled="groupOptions.length === 0" @change="handleGroupChange" />
          <FilterDropdown density="compact" label="Categoría" :options="categoryOptions" v-model="selectedCategorias" :disabled="categoryOptions.length === 0" @change="markDirty" />
        </StdFilterGroup>

        <StdFilterGroup title="Configuración" icon="fa-solid fa-gears" :default-open="false">
          <FilterDropdown density="compact" label="Transacción" :options="['Venta', 'Metas', 'NC']" v-model="selectedTransactions" @change="markDirty" />
          <p class="rounded-lg border border-pic-border bg-pic-surface p-2 text-[10px] font-medium leading-4 text-pic-text-muted">
            Agrupa aquí las opciones particulares del reporte y conserva las mismas reglas visuales y de interacción.
          </p>
        </StdFilterGroup>

        <StdFilterGroup title="Periodo" icon="fa-regular fa-calendar" :default-open="false">
          <FilterDropdown density="compact" label="Año(s)" :options="['2023', '2024', '2025', '2026']" v-model="selectedYears" @change="markDirty" />
          <div class="grid grid-cols-2 gap-2">
            <label>
              <span class="mb-1 ml-1 block text-[9px] font-bold uppercase text-pic-text-muted">Mes ini</span>
              <select class="h-8 w-full rounded-lg border border-pic-border bg-pic-surface px-2 text-xs text-pic-text-main outline-none focus:border-pic-brand focus:ring-1 focus:ring-pic-brand-border" @change="markDirty">
                <option v-for="month in 12" :key="`start-${month}`">{{ month }}</option>
              </select>
            </label>
            <label>
              <span class="mb-1 ml-1 block text-[9px] font-bold uppercase text-pic-text-muted">Mes fin</span>
              <select class="h-8 w-full rounded-lg border border-pic-border bg-pic-surface px-2 text-xs text-pic-text-main outline-none focus:border-pic-brand focus:ring-1 focus:ring-pic-brand-border" @change="markDirty">
                <option v-for="month in 12" :key="`end-${month}`" :selected="month === 12">{{ month }}</option>
              </select>
            </label>
          </div>
        </StdFilterGroup>

        <template #actions-before>
          <button type="button" class="inline-flex h-8 items-center gap-2 rounded-lg border border-pic-border px-3 text-xs font-bold text-pic-text-muted transition hover:border-pic-brand-border hover:bg-pic-brand-soft hover:text-pic-brand" @click="toggleScopeLock">
            <i class="fa-solid" :class="lockedGerencia ? 'fa-lock-open' : 'fa-lock'"></i>
            {{ lockedGerencia ? 'Liberar demo' : 'Simular alcance' }}
          </button>
        </template>
      </StdFilterPanel>
    </section>

    <section class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <article class="rounded-xl border border-pic-border bg-pic-surface p-4 shadow-sm">
        <h3 class="text-sm font-extrabold text-pic-text-main">Comportamiento de cascadas</h3>
        <ul class="mt-3 space-y-2 text-xs font-medium leading-5 text-pic-text-muted">
          <li>• Cambiar el padre limpia selección y opciones descendientes.</li>
          <li>• Solo el campo dependiente muestra loading.</li>
          <li>• Sin opciones, el control queda deshabilitado y explicado.</li>
          <li>• Los valores bloqueados por perfil sobreviven al reset.</li>
        </ul>
      </article>
      <article class="rounded-xl border border-pic-border bg-pic-surface p-4 shadow-sm">
        <h3 class="text-sm font-extrabold text-pic-text-main">Reglas del panel</h3>
        <ul class="mt-3 space-y-2 text-xs font-medium leading-5 text-pic-text-muted">
          <li>• Mantén visible el resumen cuando el panel esté cerrado.</li>
          <li>• Expresa selección, carga y bloqueo en cada control.</li>
          <li>• Separa los filtros en grupos que tengan sentido para la tarea.</li>
          <li>• Conserva las restricciones de perfil al limpiar la selección.</li>
        </ul>
      </article>
    </section>
  </div>
</template>
