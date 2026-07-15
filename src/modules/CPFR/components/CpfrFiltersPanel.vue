<script setup lang="ts">
// src/modules/CPFR/components/CpfrFiltersPanel.vue
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useCpfrStore } from '../stores/cpfrStore'
import CpfrCriteriaPanel from './CpfrCriteriaPanel.vue'

const store = useCpfrStore()

const canRunCentralizedActions = computed(() => store.activeTab === 'centralizados')

const emit = defineEmits<{
    (e: 'open-export'): void
    (e: 'open-chain-config'): void
    (e: 'open-z8-manager'): void
}>()

watch(() => [store.filters.nombre_tienda, store.filters.id_cliente], ([nt, id]) => {
    if (!nt && !id) {
        // Sincronizado por el watcher local de searchText.
    }
})

const dTags = [
    { num: 1, label: 'L' },
    { num: 2, label: 'M' },
    { num: 3, label: 'X' },
    { num: 4, label: 'J' },
    { num: 5, label: 'V' },
    { num: 6, label: 'S' },
    { num: 7, label: 'D' },
]

function toggleDay(num: number) {
    if (store.filters.dia === num) {
        store.setFilter('dia', undefined)
    } else {
        store.setFilter('dia', num)
    }
    store.loadDashboard()
}

const showCriteria = ref(false)

function closeCriteria() {
    showCriteria.value = false
}

onMounted(() => {
    document.addEventListener('click', closeCriteria)
})
onBeforeUnmount(() => {
    document.removeEventListener('click', closeCriteria)
})

function toggleCriteria() {
    showCriteria.value = !showCriteria.value
}

const searchText = ref(store.filters.nombre_tienda || store.filters.id_cliente || '')
const searchType = ref<'nombre'|'id'>(store.filters.id_cliente ? 'id' : 'nombre')

function handleSearch() {
    const val = searchText.value.trim()
    if (!val) {
        store.setFilter('nombre_tienda', undefined)
        store.setFilter('id_cliente', undefined)
    } else if (searchType.value === 'id') {
        store.setFilter('id_cliente', val)
        store.setFilter('nombre_tienda', undefined)
    } else {
        store.setFilter('nombre_tienda', val)
        store.setFilter('id_cliente', undefined)
    }
    store.loadDashboard()
}

watch(searchType, () => {
    if (searchText.value.trim() !== '') handleSearch()
})

watch(() => [store.filters.nombre_tienda, store.filters.id_cliente], ([nt, id]) => {
    if (!nt && !id) searchText.value = ''
})

let searchTimeout: ReturnType<typeof setTimeout> | null = null
function onInputSearch() {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
        handleSearch()
    }, 400)
}

function onChangeJefatura(e: Event) {
    const val = (e.target as HTMLSelectElement).value
    store.setFilter('jefatura', val || undefined)
    store.loadDashboard()
}

function clearAll() {
    store.clearFilters()
    store.clearStatusFilters()
    store.loadDashboard()
}

function confirmRecalculate() {
    if (!canRunCentralizedActions.value) return
    if (confirm('Atencion: Recalcular la matematica sobrescribira todos los cambios manuales que hayas guardado hoy en el borrador.\n\nEstas seguro de que deseas forzar un recalculo desde cero con el inventario mas reciente?')) {
        store.recalculate()
    }
}

async function triggerGenerateZ8() {
    if (!canRunCentralizedActions.value) return
    await store.generateZ8()
}
</script>

<template>
  <div class="cpfr-filter-panel bg-white border-b border-slate-200 shadow-sm shrink-0 relative z-40 select-none">
    <div class="px-3 sm:px-4 xl:px-5 py-3">
      <div class="cpfr-filter-layout">
        <div class="cpfr-filter-main">
        <div class="flex items-center gap-2 pr-1">
          <div class="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 border border-brand-100">
            <i class="fa-solid fa-filter text-[11px]"></i>
          </div>
          <div class="leading-tight">
            <h3 class="text-[10px] font-black text-slate-700 uppercase tracking-wider">Filtros</h3>
            <p class="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
              {{ store.filters.dia ? `Dia ${store.filters.dia}` : 'Todos los dias' }} · {{ Object.values(store.statusFilters).filter(v => v).length }} activos
            </p>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200" title="Dia de envio">
          <button
            v-for="d in dTags"
            :key="d.num"
            class="w-[25px] h-[24px] rounded-md font-bold text-[10px] transition-all"
            :class="store.filters.dia === d.num ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-slate-700'"
            @click.stop="toggleDay(d.num)"
            :title="`Seleccionar dia ${d.num}`"
          >{{ d.label }}</button>
        </div>

        <div class="cpfr-status-strip flex max-w-full shrink-0 items-center gap-1.5 overflow-x-auto bg-slate-50 border border-slate-200 p-1 rounded-lg h-[34px]" title="Estados especiales">
          <button @click.stop="store.toggleStatusFilter('escenarioA')" class="w-[26px] h-[24px] flex items-center justify-center rounded transition-all text-[10px]" :class="store.statusFilters.escenarioA ? 'bg-sky-500 text-white shadow-sm' : 'text-sky-600 hover:bg-white'" title="Escenario A"><i class="fa-solid fa-font"></i></button>
          <button @click.stop="store.toggleStatusFilter('escenarioB')" class="w-[26px] h-[24px] flex items-center justify-center rounded transition-all text-[10px]" :class="store.statusFilters.escenarioB ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-600 hover:bg-white'" title="Escenario B"><i class="fa-solid fa-bold"></i></button>
          <span class="w-px h-4 bg-slate-200 mx-0.5"></span>
          <button @click.stop="store.toggleStatusFilter('sinSellout')" class="w-[26px] h-[24px] flex items-center justify-center rounded transition-all" :class="store.statusFilters.sinSellout ? 'bg-emerald-500 text-white shadow-sm' : 'text-emerald-500 hover:bg-emerald-50'" title="Sin Sellout"><i class="fa-solid fa-seedling text-[10px]"></i></button>
          <button @click.stop="store.toggleStatusFilter('desabasto')" class="w-[26px] h-[24px] flex items-center justify-center rounded transition-all" :class="store.statusFilters.desabasto ? 'bg-rose-500 text-white shadow-sm' : 'text-rose-500 hover:bg-rose-50'" title="Desabasto (Inv <= 0)"><i class="fa-solid fa-ban text-[10px]"></i></button>
          <button @click.stop="store.toggleStatusFilter('bajoStock')" class="w-[26px] h-[24px] flex items-center justify-center rounded transition-all" :class="store.statusFilters.bajoStock ? 'bg-rose-500 text-white shadow-sm' : 'text-rose-500 hover:bg-rose-50'" title="Bajo Stock"><i class="fa-solid fa-triangle-exclamation text-[10px]"></i></button>
          <button @click.stop="store.toggleStatusFilter('sobrestock')" class="w-[26px] h-[24px] flex items-center justify-center rounded transition-all" :class="store.statusFilters.sobrestock ? 'bg-orange-500 text-white shadow-sm' : 'text-orange-500 hover:bg-orange-50'" title="Sobrestock"><i class="fa-solid fa-arrow-trend-up text-[10px]"></i></button>
          <button @click.stop="store.toggleStatusFilter('fillrateBajo')" class="w-[26px] h-[24px] flex items-center justify-center rounded transition-all" :class="store.statusFilters.fillrateBajo ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-600 hover:bg-amber-50'" title="Fill Rate Bajo"><i class="fa-solid fa-arrow-down text-[10px]"></i></button>
          <button @click.stop="store.toggleStatusFilter('fillrate100')" class="w-[26px] h-[24px] flex items-center justify-center rounded transition-all" :class="store.statusFilters.fillrate100 ? 'bg-emerald-500 text-white shadow-sm' : 'text-emerald-600 hover:bg-emerald-50'" title="Fill Rate 100%"><i class="fa-solid fa-check text-[10px]"></i></button>
          <button @click.stop="store.toggleStatusFilter('sobrepedido')" class="w-[26px] h-[24px] flex items-center justify-center rounded transition-all" :class="store.statusFilters.sobrepedido ? 'bg-sky-500 text-white shadow-sm' : 'text-sky-600 hover:bg-sky-50'" title="Sobrepedido"><i class="fa-solid fa-arrow-up text-[10px]"></i></button>
          <button v-if="Object.values(store.statusFilters).some(v => v)" @click.stop="store.clearStatusFilters()" class="ml-1 px-2 h-full text-[9px] font-bold text-slate-400 hover:text-slate-600 uppercase border-l border-slate-200" title="Limpiar estados">Limpiar</button>
        </div>

        <div class="flex min-w-0 flex-wrap items-center gap-2">
          <label class="h-[34px] inline-flex items-center gap-2 px-2.5 rounded-lg border border-slate-200 bg-slate-50" title="Semanas usadas para calcular el Sellout Promedio">
            <i class="fa-solid fa-calendar-week text-[10px] text-slate-400"></i>
            <input type="number" min="1" max="24" class="w-10 bg-transparent text-center text-xs font-bold text-slate-700 outline-none" v-model.number="store.filters.semanas_sellout" @change="store.loadDashboard()" placeholder="Auto" />
            <span class="text-[9px] font-bold text-slate-400 uppercase">sem</span>
          </label>

          <div class="relative">
            <button @click.stop="toggleCriteria" class="h-[34px] border border-brand-200 bg-brand-50 rounded-lg px-3 inline-flex items-center gap-2 text-brand-700 hover:bg-brand-100 transition-colors" title="Criterio global">
              <i class="fa-solid fa-sliders text-[10px]"></i>
              <span class="font-black text-xs">{{ store.criterio_global.toFixed(1) }}</span>
              <i class="fa-solid fa-chevron-down text-[8px] opacity-70"></i>
            </button>
            <div v-if="showCriteria" class="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 bg-white border border-slate-200 shadow-xl rounded-xl p-4 w-[280px] cursor-default" @click.stop>
              <div class="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
                <h4 class="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1.5"><i class="fa-solid fa-gear text-brand-500"></i> Configuracion Global</h4>
                <button @click.stop="closeCriteria" class="text-slate-300 hover:text-rose-500 p-1"><i class="fa-solid fa-times text-[12px]"></i></button>
              </div>
              <CpfrCriteriaPanel />
            </div>
          </div>

          <button @click.stop="emit('open-chain-config')" class="h-[34px] w-[36px] flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 hover:text-brand-600 hover:bg-brand-50 hover:border-brand-200 transition-all" title="Abrir Catalogo de Configuracion de Cadena">
            <i class="fa-solid fa-gear text-[14px]"></i>
          </button>
          <button @click.stop="emit('open-z8-manager')" class="h-[34px] w-[36px] flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-400 hover:text-rose-600 hover:bg-rose-100 hover:border-rose-300 transition-all" title="Gestion de Borradores Z8 - Limpiar registros en borrador">
            <i class="fa-solid fa-trash-can-arrow-up text-[14px]"></i>
          </button>
        </div>
        </div>

        <div class="cpfr-filter-actions">
          <button @click.stop="clearAll" class="h-[34px] px-3 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-500 hover:text-brand-600 hover:border-brand-200 hover:bg-brand-50 transition-colors" title="Limpiar todos los filtros">
            <i class="fa-solid fa-rotate-left mr-1.5"></i>Limpiar
          </button>

          <div class="flex items-center gap-1 bg-white border border-slate-200 rounded-lg shadow-sm p-0.5">
            <div class="flex flex-col items-end gap-0.5 relative group/z8info">
              <button
                class="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 h-8 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                :class="store.z8Loading
                  ? 'bg-violet-100 text-violet-600 cursor-wait'
                  : 'bg-violet-50 text-violet-700 hover:bg-violet-100'"
                @click.stop="triggerGenerateZ8"
                :disabled="store.z8Loading || !canRunCentralizedActions"
                :title="canRunCentralizedActions ? 'Genera los cascarones Z8 para la semana activa' : 'Disponible solo en la vista Centralizados'"
              >
                <i class="fa-solid text-[10px]" :class="store.z8Loading ? 'fa-circle-notch fa-spin' : 'fa-bolt'"></i>
                <span class="cpfr-wide-label">{{ store.z8Loading ? 'Generando...' : 'Generar Z8' }}</span>
              </button>
              <span
                v-if="store.z8Result"
                class="absolute top-full mt-1 left-0 text-[8px] font-black px-1 truncate max-w-[100px] whitespace-nowrap bg-white/90 rounded"
                :class="store.z8Result.created > 0 ? 'text-violet-600' : 'text-slate-400'"
                :title="store.z8Result.message"
              >{{ store.z8Result.created > 0 ? `+${store.z8Result.created} Z8` : 'Sin cambios' }}</span>
            </div>

            <button
              class="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 h-8 rounded-md bg-brand-50 text-brand-700 hover:bg-brand-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              @click.stop="confirmRecalculate"
              :disabled="!canRunCentralizedActions"
              :title="canRunCentralizedActions ? 'Fuerza un recalculo basado en inventario' : 'Disponible solo en la vista Centralizados'"
            >
              <i class="fa-solid fa-rotate text-[10px]"></i>
              <span class="cpfr-wide-label">Recalcular</span>
            </button>
          </div>

          <button
            @click.stop="emit('open-export')"
            class="h-[34px] px-3 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-[11px] font-bold shadow-sm shadow-brand-500/25 transition-all"
            :title="canRunCentralizedActions ? 'Revisar pedidos centralizados seleccionados' : 'Generar exportación'"
          >
            <i class="fa-solid mr-1.5" :class="canRunCentralizedActions ? 'fa-clipboard-check' : 'fa-wand-magic-sparkles'"></i>
            {{ canRunCentralizedActions ? 'Revisar' : 'Generar' }}
          </button>
        </div>
      </div>

      <div class="cpfr-filter-search">
        <div class="relative flex items-center h-[32px] min-w-0">
          <i class="fa-solid fa-hashtag absolute left-3 text-slate-400 text-[10px]"></i>
          <input v-model="store.statusFilters.searchOC" type="text" placeholder="Orden de compra" class="pl-8 pr-8 h-full w-full bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-100 focus:bg-white focus:border-brand-500 transition-all placeholder:text-slate-400 placeholder:font-medium" />
          <button v-if="store.statusFilters.searchOC" @click.stop="store.statusFilters.searchOC = ''" class="absolute right-2 text-slate-300 hover:text-slate-500 transition-colors">
            <i class="fa-solid fa-circle-xmark text-[11px]"></i>
          </button>
        </div>

        <div class="relative flex items-center h-[32px] min-w-0">
          <i class="fa-solid fa-barcode absolute left-3 text-slate-400 text-[10px]"></i>
          <input v-model="store.statusFilters.searchSku" type="text" placeholder="SKU por nombre o codigo" class="pl-8 pr-8 h-full w-full bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-100 focus:bg-white focus:border-brand-500 transition-all placeholder:text-slate-400 placeholder:font-medium" />
          <button v-if="store.statusFilters.searchSku" @click.stop="store.statusFilters.searchSku = ''" class="absolute right-2 text-slate-300 hover:text-slate-500 transition-colors">
            <i class="fa-solid fa-circle-xmark text-[11px]"></i>
          </button>
        </div>

        <div class="relative flex items-center h-[32px] min-w-0">
          <input type="text" :placeholder="searchType === 'nombre' ? 'Tienda por nombre' : 'ID Cliente'" class="w-full text-xs font-semibold border border-slate-200 rounded-lg pl-8 pr-12 h-full bg-slate-50 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all placeholder:text-slate-400 placeholder:font-medium" v-model="searchText" @input="onInputSearch" />
          <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
          <button @click.stop="searchType = searchType === 'nombre' ? 'id' : 'nombre'" class="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-400 hover:text-brand-600 hover:border-brand-200 hover:bg-brand-50 transition-colors shadow-sm select-none" title="Alternar entre buscar por Nombre o por ID de Cliente">
            {{ searchType === 'nombre' ? 'NOM' : 'ID' }}
          </button>
        </div>

        <div class="relative h-[32px] min-w-0">
          <select class="w-full text-xs border border-slate-200 rounded-lg pl-3 pr-8 h-full bg-slate-50 focus:bg-white appearance-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none cursor-pointer hover:border-slate-300 transition-all truncate" :class="store.filters.jefatura ? 'text-slate-700 font-bold uppercase' : 'text-slate-400 font-medium'" :value="store.filters.jefatura ?? ''" @change="onChangeJefatura">
            <option value="" class="text-slate-400 font-medium">Todas las Jefaturas...</option>
            <option v-for="j in store.jefaturaOptions" :key="j" :value="j" class="text-slate-700 font-semibold uppercase">{{ j }}</option>
          </select>
          <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 pointer-events-none"></i>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cpfr-filter-panel {
  container-type: inline-size;
}

.cpfr-filter-layout {
  display: grid;
  gap: 0.625rem;
}

.cpfr-filter-main,
.cpfr-filter-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.cpfr-filter-main {
  min-width: 0;
  flex-wrap: wrap;
}

.cpfr-filter-actions {
  justify-content: flex-start;
  flex-wrap: wrap;
}

.cpfr-filter-search {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.5rem;
}

.cpfr-wide-label {
  display: none;
}

.cpfr-status-strip {
  scrollbar-width: none;
}

.cpfr-status-strip::-webkit-scrollbar {
  display: none;
}

@container (min-width: 760px) {
  .cpfr-filter-search {
    grid-template-columns: minmax(180px, 0.85fr) minmax(220px, 1.15fr);
  }
}

@container (min-width: 980px) {
  .cpfr-filter-layout {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      "main actions"
      "search search";
    align-items: start;
  }

  .cpfr-filter-main {
    grid-area: main;
  }

  .cpfr-filter-actions {
    grid-area: actions;
    justify-content: flex-end;
    flex-wrap: nowrap;
  }

  .cpfr-filter-search {
    grid-area: search;
    grid-template-columns:
      minmax(170px, 220px)
      minmax(220px, 1fr)
      minmax(250px, 1fr)
      minmax(190px, 260px);
  }
}

@container (min-width: 1240px) {
  .cpfr-filter-layout {
    grid-template-columns: minmax(0, 1fr) max-content;
  }

  .cpfr-filter-main {
    column-gap: 0.75rem;
  }
}

@container (min-width: 1500px) {
  .cpfr-wide-label {
    display: inline;
  }
}
</style>
