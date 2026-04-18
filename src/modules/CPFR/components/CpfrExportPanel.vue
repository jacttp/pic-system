<script setup lang="ts">
// src/modules/CPFR/components/CpfrExportPanel.vue
import { ref, computed, watch } from 'vue'
import { useCpfrStore } from '../stores/cpfrStore'
import { useCpfrExport, buildExportItems } from '../composables/useCpfrExport'
import type { ExportTiendaItem } from '../composables/useCpfrExport'
import { toast } from '@/components/ui/toast/use-toast'

const emit = defineEmits<{
    (e: 'close'): void
}>()

const store = useCpfrStore()
const { generateExcel } = useCpfrExport()

// ── Day Labels ────────────────────────────────────────────────────────────────
const DAY_LABELS: Record<number, string> = { 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S', 7: 'D' }
const DAY_NAMES: Record<number, string>  = { 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 7: 'Domingo' }
const DAY_CODES: Record<number, string>  = { 1: 'LU', 2: 'MA', 3: 'MI', 4: 'JU', 5: 'VI', 6: 'SA', 7: 'DO' }

// ── Multi-Day Selection ───────────────────────────────────────────────────────
const availableDays = computed(() => {
    const nums = [...new Set(store.dias.map(d => d.dia_num))].sort()
    return nums.map(n => ({ num: n, label: DAY_LABELS[n] || String(n), name: DAY_NAMES[n] || `Día ${n}` }))
})

const selectedDays = ref<Set<number>>(new Set([store.filters.dia || (availableDays.value[0]?.num ?? 1)]))

function toggleDay(num: number) {
    if (selectedDays.value.has(num)) {
        if (selectedDays.value.size > 1) selectedDays.value.delete(num)
    } else {
        selectedDays.value.add(num)
    }
    selectedDays.value = new Set(selectedDays.value)
}

// ── Filters & Search ──────────────────────────────────────────────────────────
const search = ref('')

// All flat items
const allItems = computed<ExportTiendaItem[]>(() => buildExportItems(store.dias))

// Items filtered by DAY and SEARCH (candidate list)
const filteredItems = computed<ExportTiendaItem[]>(() => {
    const term = search.value.trim().toLowerCase()
    return allItems.value.filter(i => {
        if (!selectedDays.value.has(i.dayNum)) return false
        if (term) {
            return (
                i.nombre_tienda.toLowerCase().includes(term) ||
                (i.num_pedido ?? '').toLowerCase().includes(term) ||
                i.id_cliente.toLowerCase().includes(term)
            )
        }
        return true
    })
})

// ── Exclusion logic ───────────────────────────────────────────────────────────
// We use exclusions because "Everything is included by default" is the requested UX
const excludedStores = ref<Set<string>>(new Set())
const excludedOCs     = ref<Set<string>>(new Set())

function itemKey(i: ExportTiendaItem) {
    return `${i.id_cliente}|${i.num_pedido}`
}

function toggleStore(id_cliente: string) {
    if (excludedStores.value.has(id_cliente)) {
        excludedStores.value.delete(id_cliente)
        // Also ensure all its OCs are restored
        const keys = [...excludedOCs.value].filter(k => k.startsWith(id_cliente + '|'))
        keys.forEach(k => excludedOCs.value.delete(k))
    } else {
        excludedStores.value.add(id_cliente)
    }
    excludedStores.value = new Set(excludedStores.value)
    excludedOCs.value     = new Set(excludedOCs.value)
}

function toggleOC(i: ExportTiendaItem) {
    const k = itemKey(i)
    if (excludedOCs.value.has(k)) {
        excludedOCs.value.delete(k)
        // If the store was excluded, the individual toggle restores the store too
        excludedStores.value.delete(i.id_cliente)
    } else {
        excludedOCs.value.add(k)
    }
    excludedOCs.value     = new Set(excludedOCs.value)
    excludedStores.value = new Set(excludedStores.value)
}

// Reset exclusions when multi-filters change
watch([selectedDays, search], () => {
    excludedStores.value = new Set()
    excludedOCs.value     = new Set()
})

// The actual final list for Preview & Export
const includedItems = computed(() => {
    return filteredItems.value.filter(i => {
        if (excludedStores.value.has(i.id_cliente)) return false
        if (excludedOCs.value.has(itemKey(i))) return false
        return true
    })
})

const totalRows     = computed(() => includedItems.value.reduce((a, i) => a + i.rows.length, 0))
const totalCantidad = computed(() => includedItems.value.reduce((a, i) => a + i.rows.reduce((b, r) => b + r.cant_pedida, 0), 0))

// ── Right Sidebar Hierarchical List ───────────────────────────────────────────
const storesMap = computed(() => {
    const map = new Map<string, { name: string, items: ExportTiendaItem[] }>()
    for (const i of filteredItems.value) {
        if (!map.has(i.id_cliente)) {
            map.set(i.id_cliente, { name: i.nombre_tienda, items: [] })
        }
        map.get(i.id_cliente)!.items.push(i)
    }
    return map
})

// ── Main Combined Action ──────────────────────────────────────────────────────
const processing = ref(false)

async function handleAprobarExportar() {
    if (includedItems.value.length === 0) {
        toast({ title: 'Atención', description: 'No hay pedidos incluidos para exportar.', variant: 'destructive' })
        return
    }

    processing.value = true
    try {
        // 1. Export Excel
        const filename = generateExcel(includedItems.value, Array.from(selectedDays.value))
        toast({ title: '✅ Documento generado', description: filename })

        // 2. Update status in background
        await updateStatusesSilently()
        
        toast({ title: 'Proceso completado', description: 'Excel descargado y estados actualizados.' })
        
        // 3. Close and refresh dashboard
        emit('close')
        store.loadDashboard()

    } catch (e) {
        console.error('[CpfrExportPanel]', e)
        toast({ title: 'Error', description: 'Ocurrió un error en el proceso.', variant: 'destructive' })
    } finally {
        processing.value = false
    }
}

async function updateStatusesSilently() {
    if (!store.currentWeek) return
    for (const item of includedItems.value) {
        await store.updateStatus({
            num_pedido: item.num_pedido,
            year: store.currentWeek.anio,
            week: store.currentWeek.semana,
            estado: 'aprobado',
        })
    }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex flex-col bg-slate-900/60 backdrop-blur-sm p-4 lg:p-10 overflow-hidden">
    
    <!-- ═══ MAIN WORKSTATION ═══ -->
    <div class="w-full h-full max-w-[1400px] mx-auto bg-slate-50 shadow-2xl rounded-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      
      <!-- ═══ HEADER ═══ -->
      <header class="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-lg shadow-sky-600/20 shrink-0">
                <i class="fa-solid fa-file-invoice text-lg"></i>
            </div>
            <div>
                <h2 class="text-sm font-black text-slate-800 tracking-tight uppercase">Template OV & Aprobación</h2>
                <p class="text-[11px] text-slate-500 font-medium">Gestionar propuesta de exportación y actualización de estados masivos</p>
            </div>
        </div>
        
        <div class="flex items-center gap-3">
             <button
              @click="emit('close')"
              class="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all border border-transparent hover:border-rose-100"
            ><i class="fa-solid fa-xmark text-lg"></i></button>
        </div>
      </header>

      <!-- ═══ BODY (SplitContainer) ═══ -->
      <div class="flex-1 min-h-0 flex overflow-hidden">
        
        <!-- ── COL IZQ: Preview (50%) ── -->
        <div class="w-1/2 flex flex-col border-r border-slate-200 bg-slate-100/50">
            <div class="p-4 border-b border-slate-200 bg-white shadow-sm flex items-center justify-between shrink-0">
                <h3 class="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <i class="fa-solid fa-eye text-sky-500"></i> Vista Previa (Tickets)
                </h3>
                <div class="text-[10px] font-bold text-slate-400">
                    Incluidos: <span class="text-sky-700">{{ includedItems.length }}</span> OCs
                </div>
            </div>

            <div class="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth scrollbar-thin">
                <div v-if="includedItems.length === 0" class="flex flex-col items-center justify-center h-full text-slate-400 gap-3 grayscale opacity-40">
                    <i class="fa-solid fa-file-circle-exclamation text-5xl"></i>
                    <p class="text-xs font-medium italic">No hay pedidos incluidos para mostrar.</p>
                </div>

                <!-- Tickets list -->
                <div
                    v-for="item in includedItems"
                    :key="itemKey(item)"
                    class="bg-white rounded-xl border border-sky-100 shadow-sm overflow-hidden"
                >
                    <!-- Header -->
                    <div class="bg-sky-600 px-5 py-2.5 flex items-center justify-between">
                        <div>
                            <p class="font-black text-[13px] text-white leading-tight uppercase tracking-tight">{{ item.nombre_tienda }}</p>
                            <p class="text-sky-200 text-[10px] font-mono mt-0.5">{{ item.id_cliente }}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-sky-200 text-[8px] font-bold uppercase tracking-widest">Pedido No.</p>
                            <p class="font-black text-white text-[12px] font-mono tracking-widest">{{ item.num_pedido }}</p>
                        </div>
                    </div>

                    <!-- Meta -->
                    <div class="flex items-center gap-5 px-5 py-1.5 bg-sky-50/50 border-b border-dashed border-sky-100 text-[10px] font-mono text-slate-500">
                        <span><b class="font-sans font-black text-slate-600">SUC</b> {{ item.rows[0]?.sucursal || '—' }}</span>
                        <span><b class="font-sans font-black text-slate-600">CLI</b> {{ item.rows[0]?.cliente || '—' }}</span>
                        <span><b class="font-sans font-black text-slate-600">EMB</b> {{ item.rows[0]?.fec_fin_embarque || '—' }}</span>
                        <span class="ml-auto px-1.5 py-0.5 rounded-md border font-bold font-sans text-[8px] uppercase bg-sky-100 text-sky-700 border-sky-200">
                            {{ DAY_NAMES[item.dayNum] }}
                        </span>
                    </div>

                    <!-- Table Condensada -->
                    <div class="grid px-5 py-1.5 bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200" style="grid-template-columns: 2fr 3.5fr 1fr">
                        <span>UPC</span>
                        <span>Descripción</span>
                        <span class="text-right">Pzas.</span>
                    </div>

                    <div class="divide-y divide-slate-50">
                        <div v-for="(row, idx) in item.rows" :key="idx" class="grid items-center px-5 py-1.5 text-[10px]" :class="idx % 2 === 1 ? 'bg-slate-50/30' : ''" style="grid-template-columns: 2fr 3.5fr 1fr">
                            <span class="font-mono text-slate-400 truncate pr-2" :title="row.upc">{{ row.upc || '—' }}</span>
                            <span class="text-slate-800 font-semibold truncate pr-2 uppercase" :title="row.desc">{{ row.desc }}</span>
                            <span class="text-right font-black text-sky-700">{{ row.cant_pedida.toLocaleString('es-MX') }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ── COL DER: Config (50%) ── -->
        <div class="w-1/2 flex flex-col bg-white">
            
            <!-- Filter Bar -->
            <div class="p-6 border-b border-slate-100 space-y-4 shrink-0">
                <div class="flex items-center justify-between">
                    <h3 class="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <i class="fa-solid fa-sliders text-sky-500"></i> Configuración de Exportación
                    </h3>
                </div>

                <!-- Días Multi-Select -->
                <div class="flex items-center gap-3">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-16">Días:</span>
                    <div class="flex flex-wrap items-center gap-1.5 flex-1">
                        <button
                            v-for="d in availableDays" :key="d.num"
                            @click="toggleDay(d.num)"
                            class="px-3 h-8 rounded-xl font-black text-xs transition-all border shrink-0 flex items-center justify-center gap-2"
                            :class="selectedDays.has(d.num)
                                ? 'bg-sky-600 text-white border-sky-600 shadow-md shadow-sky-600/20'
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-sky-300 hover:text-sky-600'"
                        >
                            <i v-if="selectedDays.has(d.num)" class="fa-solid fa-check text-[10px]"></i>
                            {{ d.name }}
                        </button>
                    </div>
                </div>

                <!-- Search -->
                <div class="flex items-center gap-3">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-16">Buscar:</span>
                    <div class="relative flex-1">
                        <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                        <input
                            v-model="search"
                            type="text"
                            placeholder="Tienda, OC o ID..."
                            class="w-full pl-9 pr-4 h-10 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-200 focus:bg-white transition-all transition-duration-200"
                        />
                    </div>
                </div>
            </div>

            <!-- Listado de Tiendas/OCs para exclusión -->
            <div class="flex-1 overflow-y-auto px-6 py-4 scrollbar-thin">
                <div class="space-y-6">
                    <div v-for="[id_cliente, group] in storesMap" :key="id_cliente" class="space-y-2">
                       <div class="flex items-center gap-3 group">
                            <button
                                @click="toggleStore(id_cliente)"
                                class="w-5 h-5 rounded-md border flex items-center justify-center transition-all"
                                :class="!excludedStores.has(id_cliente)
                                    ? 'bg-sky-600 border-sky-600 text-white shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-300'"
                            >
                                <i v-if="!excludedStores.has(id_cliente)" class="fa-solid fa-check text-[10px]"></i>
                            </button>
                            <div class="flex-1">
                                <p class="text-[11px] font-black text-slate-700 truncate uppercase">{{ group.name }}</p>
                                <p class="text-[9px] text-slate-400 font-medium">{{ id_cliente }}</p>
                            </div>
                       </div>
                       
                       <!-- OCs list inside store -->
                       <div class="ml-8 space-y-1.5 border-l-2 border-slate-100 pl-4">
                           <div v-for="oc in group.items" :key="itemKey(oc)" class="flex items-center gap-3 group/oc">
                                <button
                                    @click="toggleOC(oc)"
                                    class="w-4 h-4 rounded border flex items-center justify-center transition-all"
                                    :class="!excludedOCs.has(itemKey(oc)) && !excludedStores.has(id_cliente)
                                        ? 'bg-sky-100 border-sky-300 text-sky-700'
                                        : 'bg-white border-slate-200 text-slate-300'"
                                >
                                    <i v-if="!excludedOCs.has(itemKey(oc)) && !excludedStores.has(id_cliente)" class="fa-solid fa-check text-[9px]"></i>
                                </button>
                                <div class="flex-1 flex items-center justify-between gap-4">
                                    <span class="text-[10px] font-mono font-bold" :class="!excludedOCs.has(itemKey(oc)) ? 'text-slate-600' : 'text-slate-300'">
                                        OC: {{ oc.num_pedido }}
                                    </span>
                                    <div class="flex items-center gap-3">
                                        <span class="text-[9px] text-slate-400">{{ oc.rows.length }} skus</span>
                                        <span class="text-[9px] font-black text-sky-600/70">{{ oc.rows.reduce((a,r) => a+r.cant_pedida, 0) }} pz</span>
                                    </div>
                                </div>
                           </div>
                       </div>
                    </div>
                </div>
            </div>

            <!-- Footer con Acciones -->
            <footer class="p-8 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-6 shrink-0">
                <div class="flex items-center justify-between">
                    <div class="space-y-1">
                        <p class="text-[9px] text-slate-400 font-black uppercase tracking-widest">Resumen de Exportación</p>
                        <div class="flex items-center gap-4 text-xs">
                             <span class="font-black text-slate-700">{{ includedItems.length }} <small class="text-slate-400">PEDIDOS</small></span>
                             <span class="font-black text-slate-700">{{ totalRows }} <small class="text-slate-400">SKUS</small></span>
                             <span class="font-black text-sky-700">{{ totalCantidad.toLocaleString('es-MX') }} <small class="text-sky-500">PIEZAS</small></span>
                        </div>
                    </div>
                    <div class="text-right">
                         <p class="text-[9px] text-slate-400 font-black uppercase tracking-widest">Archivo</p>
                         <p class="text-[10px] font-mono text-sky-600 font-bold">
                            CPFR_Soriana_{{ selectedDays.size > 1 ? 'MIX' : DAY_CODES[Array.from(selectedDays)[0]] }}_{{ new Date().toISOString().slice(0,10).replace(/-/g,'') }}.xlsx
                         </p>
                    </div>
                </div>

                <div class="flex gap-4">
                    <button
                        @click="handleAprobarExportar"
                        :disabled="processing || includedItems.length === 0"
                        class="flex-1 h-14 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white rounded-2xl shadow-xl shadow-sky-600/20 transition-all flex flex-col items-center justify-center group overflow-hidden"
                    >
                        <div class="flex items-center gap-3 font-black text-sm tracking-tight transition-transform group-hover:-translate-y-1 group-active:scale-95">
                            <i v-if="processing" class="fa-solid fa-circle-notch fa-spin"></i>
                            <i v-else class="fa-solid fa-cloud-arrow-down"></i>
                            GENERAR EXCEL & APROBAR PEDIDOS
                        </div>
                        <p class="text-[9px] font-bold text-sky-200 opacity-80 uppercase tracking-widest mt-1">
                             Esta acción descargará el archivo y actualizará los estados
                        </p>
                    </button>
                </div>
            </footer>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
  width: 5px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}
</style>
