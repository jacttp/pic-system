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

// ── Filters ───────────────────────────────────────────────────────────────────
const availableDays = computed(() => {
    const nums = [...new Set(store.dias.map(d => d.dia_num))].sort()
    return nums.map(n => ({ num: n, label: DAY_LABELS[n] || String(n), name: DAY_NAMES[n] || `Día ${n}` }))
})

const selectedDay = ref<number | null>(store.filters.dia ?? (availableDays.value[0]?.num ?? null))
const search = ref('')

// ── Flat OC items (all days, all stores) ─────────────────────────────────────
const allItems = computed<ExportTiendaItem[]>(() => buildExportItems(store.dias))

// Filtered reactively by day + search
const filteredItems = computed<ExportTiendaItem[]>(() => {
    const term = search.value.trim().toLowerCase()
    return allItems.value.filter(i => {
        if (selectedDay.value !== null && i.dayNum !== selectedDay.value) return false
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

// ── Exclusion model ───────────────────────────────────────────────────────────
const excludedKeys = ref<Set<string>>(new Set())

function itemKey(i: ExportTiendaItem) {
    return `${i.id_cliente}|${i.num_pedido}`
}

// Reset exclusions when day or search changes so UX is intuitive
watch([selectedDay, search], () => { excludedKeys.value = new Set() })

function exclude(i: ExportTiendaItem) {
    excludedKeys.value = new Set([...excludedKeys.value, itemKey(i)])
}
function restore(i: ExportTiendaItem) {
    const s = new Set(excludedKeys.value)
    s.delete(itemKey(i))
    excludedKeys.value = s
}
function restoreAll() { excludedKeys.value = new Set() }

const includedItems = computed(() => filteredItems.value.filter(i => !excludedKeys.value.has(itemKey(i))))
const excludedItems = computed(() => filteredItems.value.filter(i => excludedKeys.value.has(itemKey(i))))

const totalRows     = computed(() => includedItems.value.reduce((a, i) => a + i.rows.length, 0))
const totalCantidad = computed(() => includedItems.value.reduce((a, i) => a + i.rows.reduce((b, r) => b + r.cant_pedida, 0), 0))

// ── Export action ─────────────────────────────────────────────────────────────
const exporting = ref(false)

async function handleExport() {
    if (includedItems.value.length === 0) {
        toast({ title: 'Atención', description: 'No hay OCs incluidas en la exportación.', variant: 'destructive' })
        return
    }
    exporting.value = true
    try {
        const filename = generateExcel(includedItems.value, selectedDay.value ?? store.filters.dia ?? 1)
        toast({ title: '✅ Template OV generado', description: filename })
        await new Promise(r => setTimeout(r, 500))
        if (window.confirm(`"${filename}" generado.\n\n¿Cambiar estado de las ${includedItems.value.length} OC(s) a "Aprobado"?`)) {
            await updateStatuses()
        }
    } catch (e) {
        console.error('[CpfrExportPanel]', e)
        toast({ title: 'Error', description: 'No se pudo generar el Excel.', variant: 'destructive' })
    } finally {
        exporting.value = false
    }
}

async function updateStatuses() {
    if (!store.currentWeek) return
    let ok = 0, fail = 0
    for (const item of includedItems.value) {
        const res = await store.updateStatus({
            num_pedido: item.num_pedido,
            year: store.currentWeek.anio,
            week: store.currentWeek.semana,
            estado: 'aprobado',
        })
        res.ok ? ok++ : fail++
    }
    toast({
        title: 'Proceso finalizado',
        description: `${ok} pedido(s) actualizados a "Aprobado".${fail ? ` (${fail} error${fail > 1 ? 'es' : ''})` : ''}`,
        variant: fail > 0 ? 'destructive' : 'default',
    })
    if (ok > 0) { emit('close'); store.loadDashboard() }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" @click="emit('close')"></div>

    <!-- Panel -->
    <div class="relative ml-auto w-full max-w-[560px] bg-slate-50 shadow-2xl flex flex-col h-full ring-1 ring-sky-200/60">

      <!-- ═══ HEADER ═══ -->
      <header class="bg-gradient-to-r from-sky-700 to-sky-600 px-5 py-3.5 flex items-center gap-3 shrink-0">
        <div class="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center shrink-0">
          <i class="fa-solid fa-file-excel text-[13px]"></i>
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="text-[13px] font-black text-white tracking-tight">Template OV — Exportación CPFR</h2>
          <p class="text-[10px] text-sky-200 font-medium mt-0.5">
            {{ includedItems.length }} OC(s) · {{ totalRows }} SKUs · {{ totalCantidad.toLocaleString('es-MX') }} pz
          </p>
        </div>
        <button
          @click="emit('close')"
          class="w-7 h-7 rounded-lg flex items-center justify-center text-white/60 hover:bg-white/20 hover:text-white transition-colors shrink-0"
        ><i class="fa-solid fa-times text-[12px]"></i></button>
      </header>

      <!-- ═══ BARRA DE CONTROLES ═══ -->
      <div class="bg-white border-b border-sky-100 px-4 py-2 flex items-center gap-2.5 shrink-0 flex-wrap shadow-sm">

        <!-- Días -->
        <div class="flex items-center gap-1 bg-sky-50 p-0.5 rounded-lg border border-sky-200">
          <button
            v-for="d in availableDays" :key="d.num"
            @click="selectedDay = selectedDay === d.num ? null : d.num"
            :title="d.name"
            class="w-6 h-5 rounded-md font-black text-[10px] transition-all"
            :class="selectedDay === d.num
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-sky-600 hover:bg-sky-100 hover:text-sky-800'"
          >{{ d.label }}</button>
          <button
            v-if="selectedDay !== null"
            @click="selectedDay = null"
            title="Mostrar todos"
            class="w-5 h-5 rounded-md text-sky-400 hover:text-rose-500 hover:bg-rose-50 transition-all text-[9px]"
          ><i class="fa-solid fa-xmark"></i></button>
        </div>

        <!-- Buscador -->
        <div class="relative flex-1 min-w-[140px]">
          <i class="fa-solid fa-magnifying-glass absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[9px] pointer-events-none"></i>
          <input
            v-model="search"
            type="text"
            placeholder="Tienda, OC o ID..."
            class="w-full pl-6 pr-3 h-[26px] text-[11px] font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200 focus:bg-white transition-all placeholder:text-slate-400"
          />
          <button
            v-if="search"
            @click="search = ''"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
          ><i class="fa-solid fa-circle-xmark text-[10px]"></i></button>
        </div>

        <!-- Excluidas badge -->
        <button
          v-if="excludedItems.length > 0"
          @click="restoreAll"
          class="flex items-center gap-1 h-[26px] pl-1.5 pr-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 font-bold text-[10px] hover:bg-rose-100 transition-colors shrink-0"
          title="Restaurar todas"
        >
          <span class="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[8px] font-black">{{ excludedItems.length }}</span>
          <span>restaurar</span>
        </button>
      </div>

      <!-- ═══ LISTADO PRINCIPAL ═══ -->
      <div class="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">

        <!-- Sin datos -->
        <div v-if="filteredItems.length === 0" class="flex flex-col items-center gap-2 py-16 text-slate-400">
          <i class="fa-solid fa-inbox text-3xl opacity-20"></i>
          <p class="text-xs font-medium">Sin OCs para los filtros activos.</p>
        </div>

        <!-- Excluidas (colapsadas, tenues) -->
        <template v-if="excludedItems.length > 0">
          <div
            v-for="item in excludedItems"
            :key="itemKey(item)"
            class="flex items-center gap-2.5 px-3 py-2 bg-white rounded-lg border border-slate-200/60 opacity-35 hover:opacity-60 transition-all"
          >
            <i class="fa-solid fa-circle-minus text-rose-300 text-[11px] shrink-0"></i>
            <div class="flex-1 min-w-0">
              <p class="text-[10px] font-bold text-slate-500 truncate">{{ item.nombre_tienda }}</p>
              <p class="text-[9px] text-slate-400 font-mono">{{ item.num_pedido }}</p>
            </div>
            <button
              @click="restore(item)"
              class="text-[9px] font-black text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2 py-0.5 rounded-md transition-all shrink-0"
            >Incluir</button>
          </div>

          <!-- Divisor visual -->
          <div class="flex items-center gap-2 py-1">
            <div class="flex-1 border-t border-dashed border-slate-200"></div>
            <span class="text-[9px] font-black text-slate-300 uppercase tracking-widest shrink-0">incluidas</span>
            <div class="flex-1 border-t border-dashed border-slate-200"></div>
          </div>
        </template>

        <!-- Incluidas vacías -->
        <div v-if="includedItems.length === 0 && filteredItems.length > 0" class="text-center py-6 text-[11px] text-slate-400">
          Todas excluidas.
          <button @click="restoreAll" class="text-sky-600 font-bold ml-1 hover:underline">Restaurar.</button>
        </div>

        <!-- ── Ticket por OC ── -->
        <div
          v-for="item in includedItems"
          :key="itemKey(item)"
          class="group bg-white rounded-xl border border-sky-100 shadow-sm overflow-hidden hover:border-sky-200 hover:shadow-md transition-all"
        >
          <!-- Cabecera del ticket -->
          <div class="relative flex items-center justify-between bg-sky-600 px-4 py-2">
            <div class="min-w-0">
              <p class="font-black text-[12px] text-white truncate leading-tight">{{ item.nombre_tienda }}</p>
              <p class="text-sky-300 text-[9px] font-mono mt-0.5">{{ item.id_cliente }}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <div class="text-right">
                <p class="text-sky-300 text-[8px] font-bold uppercase tracking-widest">OC</p>
                <p class="font-black text-white text-[11px] font-mono tracking-widest">{{ item.num_pedido }}</p>
              </div>
              <!-- Botón excluir — visible en hover -->
              <button
                @click="exclude(item)"
                class="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md bg-white/15 hover:bg-rose-500 text-white/70 hover:text-white flex items-center justify-center transition-all text-[10px]"
                title="Excluir del export"
              ><i class="fa-solid fa-xmark"></i></button>
            </div>
          </div>

          <!-- Meta row compacta -->
          <div class="flex items-center gap-4 px-4 py-1 bg-sky-50/60 border-b border-dashed border-sky-100 text-[9px] font-mono text-slate-500">
            <span><b class="font-sans font-black text-slate-600">Suc.</b> {{ item.rows[0]?.sucursal || '—' }}</span>
            <span><b class="font-sans font-black text-slate-600">Cli.</b> {{ item.rows[0]?.cliente || '—' }}</span>
            <span><b class="font-sans font-black text-slate-600">Emb.</b> {{ item.rows[0]?.fec_fin_embarque || '—' }}</span>
            <span
              class="ml-auto px-1.5 py-0.5 rounded-md border font-bold font-sans text-[8px] uppercase"
              :class="item.dayNum ? 'bg-sky-100 text-sky-700 border-sky-200' : 'bg-slate-100 text-slate-400 border-slate-200'"
            >{{ DAY_NAMES[item.dayNum] || '—' }}</span>
          </div>

          <!-- Encabezado de columnas -->
          <div class="grid px-4 py-1 bg-slate-100/80 border-b border-slate-200 text-[8px] font-black text-slate-400 uppercase tracking-widest"
               style="grid-template-columns: 2fr 3fr 1fr">
            <span>UPC</span>
            <span>Descripción</span>
            <span class="text-right">Pzs.</span>
          </div>

          <!-- Filas SKU condensadas -->
          <div class="divide-y divide-slate-50">
            <div
              v-for="(row, idx) in item.rows"
              :key="idx"
              class="grid items-center px-4 py-1 text-[10px]"
              :class="idx % 2 === 1 ? 'bg-slate-50/50' : ''"
              style="grid-template-columns: 2fr 3fr 1fr"
            >
              <span class="font-mono text-slate-400 truncate pr-2 text-[9px]" :title="row.upc">{{ row.upc || '—' }}</span>
              <span class="text-slate-700 font-semibold truncate pr-2" :title="row.desc">{{ row.desc }}</span>
              <span class="text-right font-black text-sky-700">{{ row.cant_pedida.toLocaleString('es-MX') }}</span>
            </div>
          </div>

          <!-- Footer total del ticket -->
          <div class="flex items-center justify-between px-4 py-1.5 border-t border-dashed border-sky-100 bg-sky-50/40 text-[10px]">
            <span class="text-slate-400">{{ item.rows.length }} producto(s)</span>
            <span class="font-black text-sky-700">
              {{ item.rows.reduce((a, r) => a + r.cant_pedida, 0).toLocaleString('es-MX') }} pz
            </span>
          </div>
        </div>

        <div class="h-2"></div>
      </div>

      <!-- ═══ FOOTER ═══ -->
      <footer class="bg-white border-t border-sky-100 px-5 py-3.5 shrink-0 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
        <!-- Filename preview -->
        <div class="flex items-center justify-between mb-2.5">
          <p class="font-mono text-[9px] text-slate-400 truncate">
            <i class="fa-regular fa-file-excel text-emerald-400 mr-1"></i>
            CPFR_Soriana_{{ selectedDay ? DAY_CODES[selectedDay] : 'XX' }}_{{ new Date().toISOString().slice(0,10).replace(/-/g,'') }}.xlsx
          </p>
          <div class="flex items-center gap-2 text-[10px] text-slate-500 shrink-0 ml-3">
            <span class="font-black text-slate-700">{{ includedItems.length }}</span> OCs
            <span class="text-slate-300">·</span>
            <span class="font-black text-sky-700">{{ totalCantidad.toLocaleString('es-MX') }}</span> pz
          </div>
        </div>
        <!-- Botones -->
        <div class="flex gap-2">
          <button
            @click="emit('close')"
            class="px-4 h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-[11px] transition-all shrink-0"
          >Cancelar</button>
          <button
            @click="handleExport"
            :disabled="exporting || includedItems.length === 0"
            class="flex-1 h-9 rounded-xl font-black text-[11px] text-white transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-px active:translate-y-0"
            :class="includedItems.length > 0 ? 'bg-sky-600 hover:bg-sky-700 shadow-lg shadow-sky-600/25' : 'bg-slate-400'"
          >
            <i v-if="exporting" class="fa-solid fa-circle-notch fa-spin"></i>
            <i v-else class="fa-solid fa-file-excel"></i>
            {{ exporting ? 'Generando…' : `Exportar Template OV — ${includedItems.length} OC(s)` }}
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>
