<script setup lang="ts">
// src/modules/CPFR/components/CpfrFiltersPanel.vue
// Panel superior estático (compacto) para Filtros y Criterio Global
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useCpfrStore } from '../stores/cpfrStore'
import CpfrCriteriaPanel from './CpfrCriteriaPanel.vue'

const store = useCpfrStore()

const emit = defineEmits<{
    (e: 'open-export'): void
    (e: 'open-chain-config'): void
}>()

// Sincronizar búsqueda si se limpia local o globalmente
watch(() => [store.filters.nombre_tienda, store.filters.id_cliente], ([nt, id]) => {
    if (!nt && !id) {
       // Si se limpia desde el store, avisar de alguna forma? 
       // No es necesario ya que se manejará en el padre.
    }
})

// ── Day Tags ─────────────────────────────────────────────────────────────────
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


// ── Criteria Popover ─────────────────────────────────────────────────────────
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

// ── Search & Filter Logic (Migrada de CPFRView) ─────────────────────────────
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

function confirmRecalculate() {
    if (confirm('Atención: Recalcular la matemática sobrescribirá todos los cambios manuales que hayas guardado hoy en el borrador.\n\n¿Estás seguro de que deseas forzar un recálculo desde cero con el inventario más reciente?')) {
        store.recalculate()
    }
}

async function triggerGenerateZ8() {
    await store.generateZ8()
}

// ── Collapse State ───────────────────────────────────────────────────────────
const isCollapsed = ref(true)

function toggleCollapse() {
    isCollapsed.value = !isCollapsed.value
}

// ── Global Actions ───────────────────────────────────────────────────────────
function clearAll() {
    store.clearFilters()
    store.loadDashboard()
}
</script>

<template>
  <div class="bg-white border-b border-slate-200 shadow-sm shrink-0 relative z-40 select-none transition-all duration-300">
    <!-- Contenedor de Contenido (Sin header toggle) -->
    <div 
      class="px-5 py-2 flex items-center justify-between border-b border-transparent"
      :class="{ 'border-slate-100': !isCollapsed }"
    >
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 shadow-sm border border-brand-100">
          <i class="fa-solid fa-filter text-xs"></i>
        </div>
        <div>
          <h3 class="text-xs font-black text-slate-700 uppercase tracking-wider">Filtros de Análisis</h3>
          <p v-if="isCollapsed" class="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
            {{ store.filters.dia ? `Día ${store.filters.dia}` : 'Todos los días' }} 
            · {{ Object.values(store.statusFilters).filter(v => v).length }} estados activos
            · Criterio: {{ store.criterio_global.toFixed(1) }} sem.
            <span v-if="store.filters.nombre_tienda || store.filters.id_cliente" class="text-brand-500 ml-1">
              · Filtro: {{ store.filters.nombre_tienda || store.filters.id_cliente }}
            </span>
          </p>
        </div>
      </div>
    </div>

    <!-- Collapsible Content -->
    <transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform -translate-y-2 opacity-0"
      enter-to-class="transform translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform translate-y-0 opacity-100"
      leave-to-class="transform -translate-y-2 opacity-0"
    >
      <div v-show="!isCollapsed" class="px-5 py-4 border-t border-slate-50 bg-white">
        
        <!-- Primera Fila: Filtros, Configuración y Acciones -->
        <div class="flex flex-wrap items-center gap-x-6 gap-y-4 mb-5 pb-5 border-b border-slate-100">
          
          <!-- Días (Tags) -->
          <div class="flex flex-col gap-1.5 shrink-0">
              <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1"><i class="fa-regular fa-calendar-check mr-0.5"></i> Día Envío</span>
              <div class="flex gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
                 <button v-for="d in dTags" :key="d.num"
                   class="w-[28px] h-[26px] rounded font-bold text-[11px] transition-all"
                   :class="store.filters.dia === d.num ? 'bg-brand-600 text-white shadow-sm' : 'bg-transparent text-slate-500 hover:bg-slate-200 hover:text-slate-700'"
                   @click.stop="toggleDay(d.num)"
                   :title="`Seleccionar día ${d.num}`"
                 >{{ d.label }}</button>
              </div>
          </div>

          <!-- Quick Status Filters -->
          <div class="flex flex-col gap-1.5 shrink-0">
              <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                  <i class="fa-solid fa-list-check mr-0.5"></i> Estados Especiales
              </span>
              <div class="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-lg shadow-inner h-[34px]">
                
                <div class="flex items-center gap-1 px-1 border-r border-slate-200">
                  <button 
                    @click.stop="store.toggleStatusFilter('escenarioA')"
                    class="w-[28px] h-[24px] flex items-center justify-center rounded transition-all text-[11px]"
                    :class="store.statusFilters.escenarioA ? 'bg-sky-500 text-white shadow-sm ring-2 ring-sky-200' : 'text-sky-600 hover:bg-white border border-transparent hover:border-sky-100'"
                    title="Escenario A"
                  ><i class="fa-solid fa-font"></i></button>
                  
                  <button 
                    @click.stop="store.toggleStatusFilter('escenarioB')"
                    class="w-[28px] h-[24px] flex items-center justify-center rounded transition-all text-[11px]"
                    :class="store.statusFilters.escenarioB ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-200' : 'text-amber-600 hover:bg-white border border-transparent hover:border-amber-100'"
                    title="Escenario B"
                  ><i class="fa-solid fa-bold"></i></button>
                </div>

                <div class="flex items-center gap-1">
                  <button 
                    @click.stop="store.toggleStatusFilter('sinSellout')"
                    class="w-[28px] h-[24px] flex items-center justify-center rounded transition-all"
                    :class="store.statusFilters.sinSellout ? 'bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-200' : 'text-emerald-500 hover:bg-emerald-50 border border-transparent hover:border-emerald-100'"
                    title="Sin Sellout"
                  ><i class="fa-solid fa-seedling text-[11px]"></i></button>

                  <button 
                    @click.stop="store.toggleStatusFilter('desabasto')"
                    class="w-[28px] h-[24px] flex items-center justify-center rounded transition-all"
                    :class="store.statusFilters.desabasto ? 'bg-rose-500 text-white shadow-sm ring-2 ring-rose-200' : 'text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100'"
                    title="Desabasto (Inv <= 0)"
                  ><i class="fa-solid fa-ban text-[11px]"></i></button>

                  <button 
                    @click.stop="store.toggleStatusFilter('bajoStock')"
                    class="w-[28px] h-[24px] flex items-center justify-center rounded transition-all"
                    :class="store.statusFilters.bajoStock ? 'bg-rose-500 text-white shadow-sm ring-2 ring-rose-200' : 'text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100'"
                    title="Bajo Stock"
                  ><i class="fa-solid fa-triangle-exclamation text-[11px]"></i></button>

                  <button 
                    @click.stop="store.toggleStatusFilter('sobrestock')"
                    class="w-[28px] h-[24px] flex items-center justify-center rounded transition-all"
                    :class="store.statusFilters.sobrestock ? 'bg-orange-500 text-white shadow-sm ring-2 ring-orange-200' : 'text-orange-500 hover:bg-orange-50 border border-transparent hover:border-orange-100'"
                    title="Sobrestock"
                  ><i class="fa-solid fa-arrow-trend-up text-[11px]"></i></button>

                  <button 
                    @click.stop="store.toggleStatusFilter('fillrateBajo')"
                    class="w-[28px] h-[24px] flex items-center justify-center rounded transition-all"
                    :class="store.statusFilters.fillrateBajo ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-200' : 'text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-100'"
                    title="Fill Rate Bajo"
                  ><i class="fa-solid fa-arrow-down text-[11px]"></i></button>

                  <button 
                    @click.stop="store.toggleStatusFilter('fillrate100')"
                    class="w-[28px] h-[24px] flex items-center justify-center rounded transition-all"
                    :class="store.statusFilters.fillrate100 ? 'bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-200' : 'text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-100'"
                    title="Fill Rate 100%"
                  ><i class="fa-solid fa-check text-[11px]"></i></button>

                  <button 
                    @click.stop="store.toggleStatusFilter('sobrepedido')"
                    class="w-[28px] h-[24px] flex items-center justify-center rounded transition-all"
                    :class="store.statusFilters.sobrepedido ? 'bg-sky-500 text-white shadow-sm ring-2 ring-sky-200' : 'text-sky-600 hover:bg-sky-50 border border-transparent hover:border-sky-100'"
                    title="Sobrepedido"
                  ><i class="fa-solid fa-arrow-up text-[11px]"></i></button>
                </div>

                <button 
                  v-if="Object.values(store.statusFilters).some(v => v)"
                  @click.stop="store.clearStatusFilters()"
                  class="ml-1 px-2 py-1 text-[9px] font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase border-l border-slate-200 h-full flex items-center"
                >Limpiar</button>
              </div>
          </div>


          <div class="w-px h-8 bg-slate-200 hidden lg:block self-end mb-1"></div>

          <!-- Semanas Sellout & Criterio Global -->
          <div class="flex gap-4 items-end shrink-0">
              <!-- Semanas Histórico -->
              <div class="flex flex-col gap-1.5 w-[75px]">
                 <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1" title="Semanas usadas para calcular el Sellout Promedio"><i class="fa-solid fa-calendar-week mr-0.5"></i>Semanas</span>
                 <input type="number" min="1" max="24" 
                   class="w-full text-xs font-bold border border-slate-200 rounded-lg text-center h-[34px] bg-slate-50 focus:bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-100 outline-none" 
                   v-model.number="store.filters.semanas_sellout" @change="store.loadDashboard()" placeholder="Auto" />
              </div>

              <!-- Criterio Global Popover -->
              <div class="relative flex flex-col gap-1.5">
                  <span class="text-[9px] font-bold text-brand-400 uppercase tracking-widest pl-1"><i class="fa-solid fa-sliders mr-0.5"></i> Criterio</span>
                  <button @click.stop="toggleCriteria" 
                    class="h-[34px] border border-brand-200 bg-brand-50 rounded-lg px-3 flex items-center justify-between min-w-[80px] text-brand-700 hover:bg-brand-100 transition-colors shadow-sm">
                      <span class="font-black text-xs mr-2">{{ store.criterio_global.toFixed(1) }}</span>
                      <i class="fa-solid fa-chevron-down text-[9px] opacity-70"></i>
                  </button>
                  
                  <!-- Popover Content -->
                  <div v-if="showCriteria" class="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 bg-white border border-slate-200 shadow-xl rounded-xl p-4 w-[280px] cursor-default" @click.stop>
                      <div class="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
                         <h4 class="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1.5"><i class="fa-solid fa-gear text-brand-500"></i> Configuración Global</h4>
                         <button @click.stop="closeCriteria" class="text-slate-300 hover:text-rose-500 p-1"><i class="fa-solid fa-times text-[12px]"></i></button>
                      </div>
                      <CpfrCriteriaPanel />
                  </div>
              </div>

              <!-- Botón Configuración Cadena (Gear Icon) -->
              <div class="flex flex-col gap-1.5">
                  <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1"><i class="fa-solid fa-toolbox mr-0.5"></i> Gestión</span>
                  <button 
                    @click.stop="emit('open-chain-config')"
                    class="h-[34px] w-[38px] flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 hover:text-brand-600 hover:bg-brand-50 hover:border-brand-200 transition-all shadow-sm"
                    title="Abrir Catálogo de Configuración de Cadena"
                  >
                    <i class="fa-solid fa-gear text-lg"></i>
                  </button>
              </div>
          </div>

          <!-- Actions & Motor (Right side) -->
          <div class="flex flex-1 items-end justify-end gap-3 shrink-0 ml-auto">
              <!-- Motor de Cálculo -->
              <div class="flex flex-col gap-1.5 mr-2">
                  <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1 text-right flex items-center justify-end gap-1.5">
                    <i class="fa-solid fa-circle-info text-rose-400 cursor-help" title="Atención: Recalcular sobrescribirá todos los cambios manuales guardados hoy en el borrador."></i>
                    Motor
                  </span>
                  <div class="flex items-center gap-2">
                    <button
                      class="inline-flex items-center gap-2 text-xs font-bold px-4 h-[34px] rounded-lg border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 transition-all shadow-sm"
                      @click.stop="confirmRecalculate"
                      title="Fuerza un recálculo basado en inventario"
                    >
                      <i class="fa-solid fa-rotate text-[11px]"></i>
                      <span class="hidden xl:inline">Recalcular</span>
                    </button>

                    <!-- Generar Z8 -->
                    <div class="flex flex-col items-end gap-0.5">
                      <button
                        class="inline-flex items-center gap-2 text-xs font-bold px-4 h-[34px] rounded-lg border transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        :class="store.z8Loading
                          ? 'border-violet-300 bg-violet-100 text-violet-600 cursor-wait'
                          : 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100'"
                        @click.stop="triggerGenerateZ8"
                        :disabled="store.z8Loading"
                        title="Genera los cascarones Z8 para la semana activa"
                      >
                        <i
                          class="fa-solid text-[11px]"
                          :class="store.z8Loading ? 'fa-circle-notch fa-spin' : 'fa-bolt'"
                        ></i>
                        <span class="hidden xl:inline">{{ store.z8Loading ? 'Generando…' : 'Generar Z8' }}</span>
                      </button>
                      <span
                        v-if="store.z8Result"
                        class="text-[9px] font-semibold px-1 truncate max-w-[140px]"
                        :class="store.z8Result.created > 0 ? 'text-violet-600' : 'text-slate-400'"
                        :title="store.z8Result.message"
                      >{{ store.z8Result.created > 0 ? `+${store.z8Result.created} Z8` : 'Sin cambios' }}</span>
                    </div>
                  </div>
              </div>

              <div class="w-px h-8 bg-slate-200 self-end mb-1 mx-1"></div>

              <button @click.stop="clearAll" class="text-xs font-bold text-slate-500 hover:text-brand-600 px-3 h-[34px] rounded-lg bg-slate-50 hover:bg-brand-50 transition-colors border border-slate-200 hover:border-brand-200 flex items-center gap-2 shadow-sm" title="Limpiar todos los filtros">
                 <i class="fa-solid fa-rotate-left"></i> <span class="hidden xl:inline">Limpiar</span>
              </button>
              
              <button @click.stop="emit('open-export')" class="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-4 h-[34px] rounded-lg shadow-sm shadow-brand-500/30 transition-all flex items-center gap-2 hover:-translate-y-px active:translate-y-0">
                 <i class="fa-solid fa-wand-magic-sparkles"></i> <span class="hidden xl:inline">Generar</span>
              </button>
          </div>
        </div>

        <!-- Segunda Fila: Buscadores (Orden solicitado: OC, Tienda, Jefatura) -->
        <div class="flex flex-wrap items-center gap-6">
           
           <!-- Grupo Buscador OC -->
           <div class="flex flex-col gap-1.5 shrink-0">
               <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                   <i class="fa-solid fa-hashtag mr-0.5"></i> Orden Compra
               </span>
               <div class="relative flex items-center h-[34px]">
                 <i class="fa-solid fa-magnifying-glass absolute left-3 text-slate-400 text-[10px]"></i>
                 <input 
                   v-model="store.statusFilters.searchOC"
                   type="text"
                   placeholder="Buscar OC..."
                   class="pl-8 pr-10 h-full w-44 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-100 focus:bg-white focus:border-brand-500 transition-all placeholder:text-slate-400 placeholder:font-medium"
                 />
                 <button 
                   v-if="store.statusFilters.searchOC"
                   @click.stop="store.statusFilters.searchOC = ''"
                   class="absolute right-2 text-slate-300 hover:text-slate-500 transition-colors"
                 >
                   <i class="fa-solid fa-circle-xmark text-[11px]"></i>
                 </button>
               </div>
           </div>

           <!-- Grupo Buscador Tienda -->
           <div class="flex flex-col gap-1.5 shrink-0">
               <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                   <i class="fa-solid fa-store mr-0.5"></i> Filtro de Tienda
               </span>
               <div class="relative flex items-center h-[34px]">
                  <input type="text" :placeholder="searchType === 'nombre' ? 'Buscar por nombre...' : 'ID Cliente...'" 
                    class="w-56 text-xs font-semibold border border-slate-200 rounded-lg pl-8 pr-12 h-full bg-slate-50 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all placeholder:text-slate-400 placeholder:font-medium" 
                    v-model="searchText" @input="onInputSearch" />
                  <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                  
                  <button @click.stop="searchType = searchType === 'nombre' ? 'id' : 'nombre'" 
                    class="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-400 hover:text-brand-600 hover:border-brand-200 hover:bg-brand-50 transition-colors shadow-sm select-none"
                    title="Alternar entre buscar por Nombre o por ID de Cliente">
                      {{ searchType === 'nombre' ? 'NOM' : 'ID' }}
                  </button>
               </div>
           </div>

           <!-- Grupo Select Jefatura -->
           <div class="flex flex-col gap-1.5 shrink-0">
               <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                   <i class="fa-solid fa-user-tie mr-0.5"></i> Jefatura
               </span>
               <div class="relative h-[34px]">
                   <select 
                     class="w-44 text-xs border border-slate-200 rounded-lg pl-3 pr-8 h-full bg-slate-50 focus:bg-white appearance-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none cursor-pointer group hover:border-slate-300 transition-all truncate" 
                     :class="store.filters.jefatura ? 'text-slate-700 font-bold uppercase' : 'text-slate-400 font-medium'"
                     :value="store.filters.jefatura ?? ''" 
                     @change="onChangeJefatura"
                   >
                       <option value="" class="text-slate-400 font-medium">Todas las Jefaturas...</option>
                       <option v-for="j in store.jefaturaOptions" :key="j" :value="j" class="text-slate-700 font-semibold uppercase">{{ j }}</option>
                   </select>
                   <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 pointer-events-none group-hover:text-brand-500"></i>
               </div>
           </div>

        </div>
      </div>
    </transition>

    <!-- Toggle Button en el Bottom Center -->
    <div class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full z-50">
        <button 
            @click="toggleCollapse"
            class="flex items-center gap-2 px-6 py-1.5 rounded-b-xl shadow-md border-x border-b border-t-0 transition-all duration-300 group"
            :class="[
                isCollapsed 
                    ? 'bg-brand-600 border-brand-700 text-white hover:bg-brand-700 hover:pt-3' 
                    : 'bg-white border-slate-200 text-slate-300 hover:text-brand-600 hover:bg-slate-50'
            ]"
            :title="isCollapsed ? 'Mostrar Filtros' : 'Ocultar Filtros'"
        >
            <i 
                class="fa-solid transition-transform duration-300"
                :class="isCollapsed ? 'fa-filter' : 'fa-chevron-up group-hover:-translate-y-0.5'"
            ></i>
            <span v-if="isCollapsed" class="text-xs font-bold tracking-wide uppercase">
                Filtros
            </span>
        </button>
    </div>
  </div>
</template>