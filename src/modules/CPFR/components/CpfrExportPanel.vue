<script setup lang="ts">
// src/modules/CPFR/components/CpfrExportPanel.vue
import { ref, computed, watch } from 'vue'
import { useCpfrStore } from '../stores/cpfrStore'
import { useCpfrExport, buildExportItems } from '../composables/useCpfrExport'
import type { ExportRow, ExportTiendaItem } from '../composables/useCpfrExport'
import type { CpfrDiaDash } from '../types/cpfrTypes'
import { buildVisibleCpfrDias, normalizeCpfrOrderState } from '../composables/useCpfrVisibility'
import { toast } from '@/components/ui/toast/use-toast'

const emit = defineEmits<{
    (e: 'close'): void
}>()

const props = defineProps<{
    tab?: string
}>()

const store = useCpfrStore()
const { generateExcel, generateStorePdfs } = useCpfrExport()
const panelTab = computed(() => props.tab || store.activeTab)

// ── Day Labels ────────────────────────────────────────────────────────────────
const DAY_LABELS: Record<number, string> = { 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S', 7: 'D' }
const DAY_NAMES: Record<number, string>  = { 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 7: 'Domingo' }
const DAY_CODES: Record<number, string>  = { 1: 'LU', 2: 'MA', 3: 'MI', 4: 'JU', 5: 'VI', 6: 'SA', 7: 'DO' }

// ── Multi-Day Selection ───────────────────────────────────────────────────────
const visibleDias = computed<CpfrDiaDash[]>(() => buildVisibleCpfrDias({
    activeTab: panelTab.value,
    dias: store.dias,
    historialDias: store.historialDias,
    statusFilters: store.statusFilters,
    criterioGlobal: store.criterio_global,
}))

const availableDays = computed(() => {
    const nums = [...new Set(visibleDias.value.map(d => d.dia_num))].sort()
    return nums.map(n => ({ num: n, label: DAY_LABELS[n] || String(n), name: DAY_NAMES[n] || `Día ${n}` }))
})

function getInitialSelectedDays(): number[] {
    if (store.filters.dia) return [store.filters.dia]
    const nums = availableDays.value.map(d => d.num)
    return nums.length ? nums : [1]
}

const selectedDays = ref<Set<number>>(new Set(getInitialSelectedDays()))

const groupByOC = computed({
    get: () => store.groupByOC,
    set: (val) => store.setGroupByOC(val)
})

watch(availableDays, days => {
    const nums = days.map(d => d.num)
    if (!nums.length) return

    const current = [...selectedDays.value].filter(num => nums.includes(num))
    if (current.length === selectedDays.value.size && current.length > 0) return

    if (store.filters.dia && nums.includes(store.filters.dia)) {
        selectedDays.value = new Set([store.filters.dia])
    } else {
        selectedDays.value = new Set(current.length ? current : nums)
    }
})

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
const allItems = computed<ExportTiendaItem[]>(() => buildExportItems(visibleDias.value))

// Items filtered by TAB, WEEK, DAY and SEARCH (candidate list)
const selectedWeeks = ref<Set<string>>(new Set())

const availableWeeks = computed(() => {
    const set = new Set<string>()
    allItems.value.forEach(i => {
        if (i.anio && i.semana_ic) set.add(`${i.anio}-${i.semana_ic}`)
    })
    // Sort reverse to show newest weeks on top
    return Array.from(set).sort((a, b) => b.localeCompare(a))
})

function toggleWeek(weekKey: string) {
    if (selectedWeeks.value.has(weekKey)) {
        selectedWeeks.value.delete(weekKey)
    } else {
        selectedWeeks.value.add(weekKey)
    }
    selectedWeeks.value = new Set(selectedWeeks.value)
}

const filteredItems = computed<ExportTiendaItem[]>(() => {
    const term = search.value.trim().toLowerCase()

    return allItems.value.map(i => {
        const rows = panelTab.value === 'aprobada'
            ? i.rows.filter(row => normalizeCpfrOrderState(row.estado_oc) === 'aprobado')
            : i.rows
        if (!rows.length) return null

        // Week Filter
        if (selectedWeeks.value.size > 0 && i.anio && i.semana_ic) {
            if (!selectedWeeks.value.has(`${i.anio}-${i.semana_ic}`)) return null
        }

        // Day Filter
        if (!selectedDays.value.has(i.dayNum)) return null

        // Search Filter
        if (term) {
            const matches = (
                i.nombre_tienda.toLowerCase().includes(term) ||
                (i.num_pedido ?? '').toLowerCase().includes(term) ||
                i.id_cliente.toLowerCase().includes(term)
            )
            if (!matches) return null
        }

        return {
            ...i,
            estado_oc: rows[0]?.estado_oc || i.estado_oc,
            rows
        }
    }).filter((i): i is ExportTiendaItem => i !== null)
})

// ── Exclusion logic ───────────────────────────────────────────────────────────
// We use exclusions because "Everything is included by default" is the requested UX
const excludedStores = ref<Set<string>>(new Set())
const excludedOCs     = ref<Set<string>>(new Set())
const excludedSKUs    = ref<Set<string>>(new Set())
const expandedOCs     = ref<Set<string>>(new Set())
const expandedStores  = ref<Set<string>>(new Set())

function itemKey(i: ExportTiendaItem) {
    return `${i.id_cliente}|${i.num_pedido}`
}

function skuKey(i: ExportTiendaItem, row: { sku_key?: string; upc: string; num_pedido?: string }) {
    const oc = row.num_pedido || i.num_pedido
    return `${i.id_cliente}|${oc}|${row.sku_key || row.upc}`
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
        
        // Restore all SKUs of this OC if re-included
        const prefix = k + '|'
        const toDelete = [...excludedSKUs.value].filter(sk => sk.startsWith(prefix))
        toDelete.forEach(sk => excludedSKUs.value.delete(sk))
    } else {
        excludedOCs.value.add(k)
    }
    excludedOCs.value     = new Set(excludedOCs.value)
    excludedStores.value  = new Set(excludedStores.value)
    excludedSKUs.value    = new Set(excludedSKUs.value)
}

function toggleSku(i: ExportTiendaItem, row: { sku_key?: string; upc: string }) {
    const k = skuKey(i, row)
    if (excludedSKUs.value.has(k)) {
        excludedSKUs.value.delete(k)
    } else {
        excludedSKUs.value.add(k)
    }
    excludedSKUs.value = new Set(excludedSKUs.value)
}

function toggleExpandOC(i: ExportTiendaItem) {
    const k = itemKey(i)
    if (expandedOCs.value.has(k)) expandedOCs.value.delete(k)
    else expandedOCs.value.add(k)
    expandedOCs.value = new Set(expandedOCs.value)
}

function toggleExpandStore(id_cliente: string) {
    if (expandedStores.value.has(id_cliente)) expandedStores.value.delete(id_cliente)
    else expandedStores.value.add(id_cliente)
    expandedStores.value = new Set(expandedStores.value)
}

// Reset exclusions when multi-filters change
watch([selectedDays, search, selectedWeeks, () => panelTab.value, () => JSON.stringify(store.statusFilters)], () => {
    excludedStores.value = new Set()
    excludedOCs.value     = new Set()
    excludedSKUs.value    = new Set()
})

// The actual final list for Preview & Export
const includedItems = computed(() => {
    return filteredItems.value.map(i => {
        // If store or OC is excluded, skip entire item
        if (excludedStores.value.has(i.id_cliente)) return null
        if (excludedOCs.value.has(itemKey(i))) return null

        // Filter SKU rows
        const filteredRows = i.rows.filter(r =>
            !excludedSKUs.value.has(skuKey(i, r))
            && (panelTab.value !== 'aprobada' || normalizeCpfrOrderState(r.estado_oc) === 'aprobado')
        )
        if (filteredRows.length === 0) return null

        return {
            ...i,
            rows: filteredRows
        }
    }).filter(i => i !== null) as ExportTiendaItem[]
})

const previewItems = computed(() => {
    if (store.groupByOC) {
        return includedItems.value
    } else {
        const map = new Map<string, ExportTiendaItem>()
        for (const item of includedItems.value) {
            if (!map.has(item.id_cliente)) {
                map.set(item.id_cliente, {
                    id_cliente: item.id_cliente,
                    nombre_tienda: item.nombre_tienda,
                    jefatura: item.jefatura,
                    num_pedido: 'DESAGRUPADO',
                    estado_oc: item.estado_oc,
                    dayNum: item.dayNum,
                    semana_ic: item.semana_ic,
                    anio: item.anio,
                    rows: []
                })
            }
            map.get(item.id_cliente)!.rows.push(...item.rows)
        }
        return Array.from(map.values())
    }
})

const totalRows     = computed(() => includedItems.value.reduce((a, i) => a + i.rows.length, 0))
const totalCantidad = computed(() => includedItems.value.reduce((a, i) => a + i.rows.reduce((b, r) => b + r.cant_pedida, 0), 0))
const totalKg       = computed(() => includedItems.value.reduce((a, i) => a + sumKg(i.rows), 0))

function sumPz(rows: ExportRow[]): number {
    return rows.reduce((total, row) => total + row.cant_pedida, 0)
}

function sumKg(rows: ExportRow[]): number {
    return rows.reduce((total, row) => total + row.pedido_kg, 0)
}

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
const pdfProcessing = ref(false)
const pdfOnlyTabs = computed(() => panelTab.value === 'sin_embarcar' || panelTab.value === 'historial')
const canApproveExport = computed(() => panelTab.value !== 'aprobada' && !pdfOnlyTabs.value)

async function handlePdfExport() {
    if (includedItems.value.length === 0) {
        toast({ title: 'Atencion', description: 'No hay pedidos incluidos para generar PDF.', variant: 'destructive' })
        return
    }

    pdfProcessing.value = true
    try {
        const result = await generateStorePdfs(includedItems.value, Array.from(selectedDays.value))
        toast({
            title: result.zipped ? 'ZIP generado' : 'PDF generado',
            description: result.zipped
                ? `${result.filename} contiene ${result.fileCount} PDF(s), uno por tienda.`
                : `${result.filename} descargado.`
        })
    } catch (e) {
        console.error('[CpfrExportPanel.PDF]', e)
        toast({ title: 'Error', description: 'No se pudieron generar los PDFs.', variant: 'destructive' })
    } finally {
        pdfProcessing.value = false
    }
}

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
        
        // 3. Close panel. The store was already updated locally by updateStatus.
        emit('close')

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
  <div 
    class="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-[2px] overflow-hidden transition-all duration-500"
    @click.self="emit('close')"
  >
    
    <!-- ═══ MAIN PANEL ═══ -->
    <div class="w-1/2 h-full bg-slate-50 shadow-[-20px_0_50px_-12px_rgba(0,0,0,0.2)] rounded-l-[3.5rem] border-l border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-right duration-500">
      
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
        
        <!-- ── COL IZQ: Preview (Wider) ── -->
        <div class="flex-1 flex flex-col bg-slate-100/40">
            <div class="px-4 py-3 border-b border-slate-200 bg-white/80 backdrop-blur flex items-center justify-between shrink-0">
                <h3 class="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <i class="fa-solid fa-receipt text-brand-500"></i> Vista Previa | Template OV
                </h3>
                <div class="text-[9px] font-bold text-slate-400">
                    <span class="text-brand-700">{{ includedItems.length }}</span> OCs
                    <span class="mx-1 text-slate-300">|</span>
                    <span class="text-brand-700">{{ totalRows }}</span> SKUs
                    <span class="mx-1 text-slate-300">|</span>
                    <span class="text-brand-700">{{ totalKg.toLocaleString('es-MX', { maximumFractionDigits: 1 }) }}</span> KG
                </div>
            </div>

            <div class="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth scrollbar-thin bg-slate-50/50">
                <div v-if="includedItems.length === 0" class="flex flex-col items-center justify-center h-full text-slate-400 gap-3 grayscale opacity-40">
                    <i class="fa-solid fa-file-circle-exclamation text-5xl"></i>
                    <p class="text-xs font-medium italic">No hay pedidos incluidos para mostrar.</p>
                </div>

                <!-- Tickets list -->
                <div
                    v-for="item in previewItems"
                    :key="item.id_cliente + '|' + item.num_pedido"
                    class="bg-white rounded-xl border border-sky-100 shadow-sm overflow-hidden"
                >
                    <!-- Header -->
                    <div class="bg-brand-600 px-4 py-2 flex items-center justify-between">
                        <div class="min-w-0">
                            <p class="font-black text-[11px] text-white leading-tight uppercase truncate">{{ item.nombre_tienda }}</p>
                            <p class="text-brand-200 text-[8px] font-mono mt-0.5 truncate">{{ item.id_cliente }} · {{ item.nombre_tienda }}</p>
                        </div>
                        <div class="text-right shrink-0">
                            <p class="text-brand-200 text-[8px] font-bold uppercase tracking-widest">
                                {{ item.rows.length }} SKU | {{ sumPz(item.rows).toLocaleString('es-MX') }} PZ | {{ sumKg(item.rows).toLocaleString('es-MX', { maximumFractionDigits: 1 }) }} KG
                            </p>
                            <p class="font-black text-white text-[10px] font-mono tracking-widest">{{ store.groupByOC ? item.num_pedido : 'DESAGRUPADO' }}</p>
                        </div>
                    </div>

                    <!-- Meta -->
                    <div class="flex items-center gap-3 px-4 py-1.5 bg-brand-50/50 border-b border-dashed border-brand-100 text-[9px] font-mono text-slate-500">
                        <span><b class="font-sans font-black text-slate-600">S</b> {{ item.rows[0]?.sucursal || '—' }}</span>
                        <span class="truncate pr-2"><b class="font-sans font-black text-slate-600">C</b> {{ item.id_cliente }} — {{ item.nombre_tienda }}</span>
                        <div class="ml-auto flex items-center gap-1">
                            <span v-if="item.semana_ic" class="px-1.5 py-0.5 rounded-md border font-bold font-sans text-[7px] uppercase bg-indigo-50 text-indigo-700 border-indigo-200">
                                SEM {{ item.semana_ic }}
                            </span>
                            <span class="px-1.5 py-0.5 rounded-md border font-bold font-sans text-[7px] uppercase bg-brand-100 text-brand-700 border-brand-200">
                                {{ DAY_CODES[item.dayNum] }}
                            </span>
                        </div>
                    </div>

                    <!-- Filas SKU (Súper condensadas) -->
                    <div class="divide-y divide-slate-50">
                        <div v-for="(row, idx) in item.rows" :key="idx" class="flex flex-col gap-0.5 px-4 py-1.5 text-[9px]" :class="idx % 2 === 1 ? 'bg-slate-50/30' : ''">
                            <div class="flex items-center justify-between">
                                <span class="text-slate-700 font-bold truncate pr-2 uppercase flex-1">{{ row.desc }}</span>
                                <span class="font-black text-brand-700 shrink-0">{{ row.cant_pedida }} pz</span>
                            </div>
                            <!-- Badge OC (solo si está desagrupado) -->
                            <div v-if="!store.groupByOC && row.num_pedido" class="flex items-center gap-1.5 mt-0.5">
                                <span class="px-1 py-0.5 rounded text-[8px] font-mono font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                    OC: {{ row.num_pedido }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ── COL DER: Config (Fixed Width) ── -->
        <div class="w-[350px] shrink-0 min-w-0 flex flex-col bg-white border-l border-slate-200">
            
            <!-- Filter Bar -->
            <div class="p-4 border-b border-slate-100 space-y-3 shrink-0">
                <div class="flex items-center justify-between">
                    <h3 class="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <i class="fa-solid fa-sliders text-brand-500"></i> Filtros
                    </h3>
                </div>

                <div class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div class="flex items-center gap-2 text-slate-500 min-w-0">
                        <i class="fa-solid fa-layer-group text-slate-400 text-[11px]"></i>
                        <div class="min-w-0">
                            <p class="text-[10px] font-black uppercase tracking-wider text-slate-600">Control de Vista</p>
                            <p class="text-[8px] font-bold text-slate-400 truncate">{{ groupByOC ? 'Agrupado por OC' : 'Desagrupado por tienda' }}</p>
                        </div>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer select-none shrink-0" title="Agrupar/Desagrupar por Orden de Compra">
                        <input type="checkbox" v-model="groupByOC" class="sr-only peer">
                        <div class="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-brand-500"></div>
                    </label>
                </div>

                <div class="flex items-center gap-2">
                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider w-10">Días:</span>
                    <div class="flex flex-wrap items-center gap-1 flex-1">
                        <button
                            v-for="d in availableDays" :key="d.num"
                            @click="toggleDay(d.num)"
                            class="px-2 h-6 rounded-lg font-black text-[10px] transition-all border shrink-0 flex items-center justify-center gap-1"
                            :class="selectedDays.has(d.num)
                                ? 'bg-brand-600 text-white border-brand-700 shadow-sm'
                                : 'bg-white text-brand-600 border-brand-200 hover:bg-brand-50'"
                        >
                            <i v-if="selectedDays.has(d.num)" class="fa-solid fa-check text-[7px]"></i>
                            {{ d.label === 'M' && d.num === 3 ? 'X' : d.label }}
                        </button>
                    </div>
                </div>

                <!-- Weeks filter (Contextual) -->
                <div v-if="availableWeeks.length > 1" class="flex items-center gap-2">
                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider w-10">Sem:</span>
                    <div class="flex flex-wrap items-center gap-1 flex-1">
                        <button
                            v-for="w in availableWeeks" :key="w"
                            @click="toggleWeek(w)"
                            class="px-2 h-6 rounded-lg font-black text-[10px] transition-all border shrink-0 flex items-center justify-center gap-1"
                            :class="selectedWeeks.has(w)
                                ? 'bg-brand-600 text-white border-brand-700 shadow-sm'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'"
                        >
                            <i v-if="selectedWeeks.has(w)" class="fa-solid fa-check text-[7px]"></i>
                            S{{ w.split('-')[1] }}
                        </button>
                    </div>
                </div>

                <!-- Search -->
                <div class="flex items-center gap-2">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-12">Buscar:</span>
                    <div class="relative flex-1">
                        <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                        <input
                            v-model="search"
                            type="text"
                            placeholder="Tienda, OC o ID..."
                            class="w-full pl-8 pr-4 h-8 text-[11px] font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200 focus:bg-white transition-all"
                        />
                    </div>
                </div>
            </div>

            <!-- Listado de Tiendas/OCs para exclusión -->
            <div class="flex-1 overflow-y-auto px-6 py-4 scrollbar-thin">
                <div class="space-y-6">
                    <div v-for="[id_cliente, group] in storesMap" :key="id_cliente" class="space-y-1.5">
                       <div class="flex items-center gap-2 group p-1.5 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer" @click="toggleExpandStore(id_cliente)">
                            <button
                                @click.stop="toggleStore(id_cliente)"
                                class="w-4 h-4 rounded border flex items-center justify-center transition-all"
                                :class="!excludedStores.has(id_cliente)
                                    ? 'bg-sky-700 border-sky-800 text-white shadow-sm'
                                    : 'bg-white border-slate-200 text-slate-300'"
                            >
                                <i v-if="!excludedStores.has(id_cliente)" class="fa-solid fa-check text-[9px]"></i>
                            </button>
                            <div class="flex-1 min-w-0">
                                <p class="text-[10px] font-black text-slate-700 truncate uppercase">{{ group.name }}</p>
                                <p class="text-[8px] text-slate-400 font-medium">{{ id_cliente }}</p>
                            </div>
                            <div class="shrink-0 flex items-center gap-2">
                                <span class="text-[8px] font-bold text-slate-400">{{ group.items.length }} OC</span>
                                <button class="w-5 h-5 rounded-md flex items-center justify-center bg-slate-100/50 text-slate-400 transition-colors">
                                    <i class="fa-solid text-[9px]" :class="expandedStores.has(id_cliente) ? 'fa-angle-up' : 'fa-angle-down'"></i>
                                </button>
                            </div>
                       </div>
                       
                       <!-- OCs list inside store -->
                       <div v-if="expandedStores.has(id_cliente)" class="ml-6 space-y-2 border-l border-slate-100 pl-3 animate-in fade-in slide-in-from-top-1 duration-200">
                           <!-- Si está agrupado en OC, muestra la lista de OCs -->
                           <template v-if="store.groupByOC">
                               <div v-for="oc in group.items" :key="itemKey(oc)" class="space-y-1.5">
                                    <div class="flex items-center gap-2 group/oc cursor-pointer" @click.stop="toggleOC(oc)">
                                        <button
                                            class="w-3.5 h-3.5 rounded border flex items-center justify-center transition-all"
                                            :class="!excludedOCs.has(itemKey(oc)) && !excludedStores.has(id_cliente)
                                                ? 'bg-sky-100 border-sky-300 text-sky-700'
                                                : 'bg-white border-slate-200 text-slate-300'"
                                        >
                                            <i v-if="!excludedOCs.has(itemKey(oc)) && !excludedStores.has(id_cliente)" class="fa-solid fa-check text-[8px]"></i>
                                        </button>
                                        <div class="flex-1 flex items-center justify-between gap-3 min-w-0">
                                            <span class="text-[9px] font-mono font-bold truncate" :class="!excludedOCs.has(itemKey(oc)) ? 'text-slate-600' : 'text-slate-300'">
                                                OC: {{ oc.num_pedido }}
                                            </span>
                                            <div class="flex items-center gap-1.5 shrink-0">
                                                <span class="text-[8px] font-black text-sky-600/70">{{ oc.rows.reduce((a,r) => a+r.cant_pedida, 0) }} pz</span>
                                                <button 
                                                    @click.stop="toggleExpandOC(oc)"
                                                    class="w-4 h-4 rounded-md flex items-center justify-center bg-slate-50 hover:bg-slate-200 text-slate-400 border border-slate-100 transition-colors shadow-sm"
                                                >
                                                    <i class="fa-solid text-[7px]" :class="expandedOCs.has(itemKey(oc)) ? 'fa-minus' : 'fa-plus'"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- SKUs List (Nested) -->
                                    <div v-if="expandedOCs.has(itemKey(oc))" class="ml-5 space-y-1 border-l border-slate-100 pl-3 py-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <div v-for="sku in oc.rows" :key="skuKey(oc, sku)" 
                                            class="flex items-center gap-2 group/sku cursor-pointer hover:bg-slate-50 rounded p-0.5 pr-2 transition-colors"
                                            @click.stop="toggleSku(oc, sku)"
                                        >
                                            <button
                                                class="w-3.5 h-3.5 rounded border flex items-center justify-center transition-all"
                                                :class="!excludedSKUs.has(skuKey(oc, sku)) && !excludedOCs.has(itemKey(oc)) && !excludedStores.has(id_cliente)
                                                    ? 'bg-emerald-500 border-emerald-600 text-white'
                                                    : 'bg-white border-slate-200 text-slate-300'"
                                            >
                                                <i v-if="!excludedSKUs.has(skuKey(oc, sku)) && !excludedOCs.has(itemKey(oc)) && !excludedStores.has(id_cliente)" class="fa-solid fa-check text-[6px]"></i>
                                            </button>
                                            <span class="text-[8px] font-medium truncate" :class="!excludedSKUs.has(skuKey(oc, sku)) ? 'text-slate-500' : 'text-slate-300'">
                                                {{ sku.desc }}
                                            </span>
                                            <span class="ml-auto text-[7px] font-bold text-brand-600/60">{{ sku.cant_pedida }} pz</span>
                                        </div>
                                    </div>
                               </div>
                           </template>
                           <!-- Si está desagrupado, muestra los SKUs directamente bajo la tienda -->
                           <template v-else>
                               <div v-for="sku in group.items.flatMap(i => i.rows.map(r => ({ ...r, itemRef: i })))" :key="skuKey(sku.itemRef, sku)" 
                                    class="flex items-center gap-2 group/sku cursor-pointer hover:bg-slate-50 rounded p-1 pr-2 transition-colors animate-in fade-in duration-200"
                                    @click.stop="toggleSku(sku.itemRef, sku)"
                               >
                                    <button
                                        class="w-3.5 h-3.5 rounded border flex items-center justify-center transition-all"
                                        :class="!excludedSKUs.has(skuKey(sku.itemRef, sku)) && !excludedStores.has(id_cliente)
                                            ? 'bg-emerald-500 border-emerald-600 text-white'
                                            : 'bg-white border-slate-200 text-slate-300'"
                                    >
                                        <i v-if="!excludedSKUs.has(skuKey(sku.itemRef, sku)) && !excludedStores.has(id_cliente)" class="fa-solid fa-check text-[6px]"></i>
                                    </button>
                                    <div class="flex-1 flex items-center justify-between gap-2 min-w-0">
                                        <span class="text-[9px] font-medium truncate" :class="!excludedSKUs.has(skuKey(sku.itemRef, sku)) ? 'text-slate-500' : 'text-slate-300'">
                                            {{ sku.desc }}
                                        </span>
                                        <span class="px-1 py-0.5 rounded text-[7px] font-mono font-bold bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                                            {{ sku.num_pedido || 'SIN FOLIO' }}
                                        </span>
                                    </div>
                                    <span class="ml-auto text-[7px] font-bold text-brand-600/60 shrink-0">{{ sku.cant_pedida }} pz</span>
                               </div>
                           </template>
                       </div>
                    </div>
                </div>
            </div>

            <!-- Footer con Acciones (Double buttons) -->
            <footer class="p-5 border-t border-slate-100 bg-slate-50 flex flex-col gap-3 shrink-0">
                <div class="space-y-1">
                    <div class="flex items-center justify-between text-[11px]">
                         <span class="font-black text-slate-700 uppercase tracking-tighter">{{ includedItems.length }} PEDIDOS</span>
                         <span class="font-black text-brand-700">
                            {{ totalCantidad.toLocaleString('es-MX') }} <small class="text-brand-500 font-bold">PZ</small>
                            <span class="mx-1 text-slate-300">|</span>
                            {{ totalKg.toLocaleString('es-MX', { maximumFractionDigits: 1 }) }} <small class="text-brand-500 font-bold">KG</small>
                         </span>
                    </div>
                    <p class="text-[9px] font-mono text-brand-600 font-bold truncate p-1.5 bg-brand-50 rounded-lg border border-brand-100 text-center">
                        {{ selectedDays.size > 1 ? 'MIX' : DAY_CODES[Array.from(selectedDays)[0]] }}_{{ new Date().toISOString().slice(0,10).replace(/-/g,'') }}.xlsx
                    </p>
                </div>

                <div class="space-y-2">
                    <!-- Botón 1: Solo descargar -->
                    <button
                        v-if="!pdfOnlyTabs"
                        @click="() => {
                            const filename = generateExcel(includedItems, Array.from(selectedDays))
                            toast({ title: '✅ Documento generado', description: filename })
                        }"
                        :disabled="processing || pdfProcessing || includedItems.length === 0"
                        class="w-full h-9 border-2 border-brand-600 text-brand-700 hover:bg-brand-50 disabled:bg-slate-50 disabled:text-slate-300 disabled:border-slate-200 rounded-xl font-black text-[11px] transition-all flex items-center justify-center gap-2 group"
                    >
                        <i class="fa-solid fa-file-excel transition-transform group-hover:scale-110"></i>
                        DESCARGAR EXCEL
                    </button>

                    <button
                        @click="handlePdfExport"
                        :disabled="processing || pdfProcessing || includedItems.length === 0"
                        class="w-full h-9 border-2 border-rose-600 text-rose-700 hover:bg-rose-50 disabled:bg-slate-50 disabled:text-slate-300 disabled:border-slate-200 rounded-xl font-black text-[11px] transition-all flex items-center justify-center gap-2 group"
                    >
                        <i v-if="pdfProcessing" class="fa-solid fa-circle-notch fa-spin"></i>
                        <i v-else class="fa-solid fa-file-pdf transition-transform group-hover:scale-110"></i>
                        DESCARGAR PDFS POR TIENDA
                    </button>

                    <!-- Botón 2: Descargar & Aprobar (Solo en tabs de gestión actual) -->
                    <button
                        v-if="canApproveExport"
                        @click="handleAprobarExportar"
                        :disabled="processing || pdfProcessing || includedItems.length === 0"
                        class="w-full h-11 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white rounded-xl shadow-lg shadow-brand-900/10 transition-all flex flex-col items-center justify-center group"
                    >
                        <div class="flex items-center gap-2 font-black text-[11px] tracking-tight">
                            <i v-if="processing" class="fa-solid fa-circle-notch fa-spin"></i>
                            <i v-else class="fa-solid fa-check-double scale-110"></i>
                            DESCARGAR & APROBAR OC
                        </div>
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
