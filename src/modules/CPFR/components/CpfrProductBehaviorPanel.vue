<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { cpfrApi } from '../services/cpfrApi'
import type {
    CpfrSkuDash,
    CpfrStoreDash,
    CpfrYoySalesPoint,
} from '../types/cpfrTypes'

const props = defineProps<{
    tienda: CpfrStoreDash
    sku: CpfrSkuDash
    year: number
    week: number
    cadena?: string | null
}>()

const emit = defineEmits<{
    (e: 'close'): void
}>()

const yoySales = ref<CpfrYoySalesPoint[]>([])
const yoyLoading = ref(false)
const yoyError = ref<string | null>(null)

const currentMonth = new Date().getMonth() + 1

function n(value: number | null | undefined, dec = 0): string {
    if (value == null || Number.isNaN(value)) return '-'
    return value.toLocaleString('es-MX', { maximumFractionDigits: dec })
}

function kgToPz(kg: number | null | undefined): number | null {
    if (kg == null) return null
    const unit = props.sku.unidad_inventario || 0
    if (unit <= 0) return null
    return kg / unit
}

const inventoryWeeks = computed(() => {
    if (!props.sku.promedio_sellout_kg || props.sku.promedio_sellout_kg <= 0) return null
    return (props.sku.inv_actual_kg || 0) / props.sku.promedio_sellout_kg
})

const targetWeeks = computed(() => props.sku.semanas_objetivo || 0)

const coveragePct = computed(() => {
    if (inventoryWeeks.value == null || targetWeeks.value <= 0) return 0
    return Math.min(100, Math.max(0, (inventoryWeeks.value / targetWeeks.value) * 100))
})

const coverageStatus = computed(() => {
    if (inventoryWeeks.value == null) return { label: 'Sin sellout', cls: 'text-amber-700 bg-amber-50 border-amber-200' }
    if (inventoryWeeks.value < targetWeeks.value) return { label: 'Bajo objetivo', cls: 'text-rose-700 bg-rose-50 border-rose-200' }
    if (inventoryWeeks.value > targetWeeks.value + 0.75) return { label: 'Sobre objetivo', cls: 'text-sky-700 bg-sky-50 border-sky-200' }
    return { label: 'En rango', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
})

const selloutSeries = computed(() => {
    const rows = [...(props.sku.sellout_semanas || [])]
        .sort((a, b) => a.semana - b.semana)
        .slice(-6)

    return rows.map((row, idx) => ({
        label: `Sem. ${row.semana}`,
        week: row.semana,
        kg: Number(row.kg || 0),
        pz: kgToPz(Number(row.kg || 0)),
    }))
})

const chartPoints = computed(() => {
    const values = selloutSeries.value.map(row => row.pz || 0)
    const max = Math.max(...values, 1)
    const width = 360
    const height = 130
    const gap = values.length > 1 ? width / (values.length - 1) : width

    return values.map((value, index) => ({
        x: values.length > 1 ? index * gap : width / 2,
        y: height - (value / max) * 95 - 18,
        value,
    }))
})

const chartPath = computed(() => {
    if (!chartPoints.value.length) return ''
    return chartPoints.value.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
})

const yoyByYear = computed(() => {
    const map = new Map<string, CpfrYoySalesPoint>()
    for (const row of yoySales.value) map.set(String(row.anio), row)
    return {
        previous: map.get(String(props.year - 1)),
        current: map.get(String(props.year)),
    }
})

const yoyDeltaPct = computed(() => {
    const previous = yoyByYear.value.previous?.total_venta_kg || 0
    const current = yoyByYear.value.current?.total_venta_kg || 0
    if (previous <= 0) return null
    return ((current - previous) / previous) * 100
})

const yoyBars = computed(() => {
    const previous = yoyByYear.value.previous?.total_venta_kg || 0
    const current = yoyByYear.value.current?.total_venta_kg || 0
    const currentMeta = yoyByYear.value.current?.total_metas_kg || 0
    const rows = [
        { label: `Venta ${props.year - 1}`, value: previous, cls: 'bg-slate-400' },
        { label: `Venta ${props.year}`, value: current, cls: 'bg-brand-500' },
        { label: `Meta ${props.year}`, value: currentMeta, cls: 'bg-amber-400' },
    ].filter(row => row.value > 0 || row.label !== `Meta ${props.year}`)

    const max = Math.max(...rows.map(row => row.value), 1)
    return rows.map(row => ({
        ...row,
        height: Math.max(8, (row.value / max) * 92),
    }))
})

const projectionBars = computed(() => {
    const rows = [
        { label: 'Inventario actual', value: props.sku.inv_actual_pz || 0, cls: 'bg-slate-300' },
        { label: 'Venta promedio', value: props.sku.promedio_sellout_pz || 0, cls: 'bg-slate-500' },
        { label: 'Pedido sugerido', value: props.sku.pedido_sugerido_pz_red || 0, cls: 'bg-brand-500' },
    ]
    const max = Math.max(...rows.map(row => row.value), 1)
    return rows.map(row => ({ ...row, height: Math.max(10, (row.value / max) * 100) }))
})

const insightItems = computed(() => {
    const items: string[] = []
    if (!props.sku.promedio_sellout_kg || props.sku.promedio_sellout_kg <= 0) {
        items.push('Sin sellout promedio: el sugerido toma como referencia la necesidad de cadena.')
    } else if (inventoryWeeks.value != null && inventoryWeeks.value < targetWeeks.value) {
        items.push('La cobertura actual esta debajo del objetivo de la tienda.')
    } else {
        items.push('La cobertura actual esta alineada con el objetivo operativo.')
    }

    if (props.sku.pzas_bolsa && props.sku.pzas_bolsa > 1) {
        items.push(`El pedido se redondea en multiplos de ${props.sku.pzas_bolsa} pz.`)
    }

    if (props.sku.fill_rate != null) {
        items.push(`Fill rate actual: ${(props.sku.fill_rate * 100).toFixed(0)}%.`)
    }

    return items
})

async function loadYoySales() {
    if (!props.sku.sku_muliix) return
    yoyLoading.value = true
    yoyError.value = null
    try {
        yoySales.value = await cpfrApi.getProductYoySales({
            matriz: props.tienda.id_cliente,
            sku: props.sku.sku_muliix,
            cadena: props.cadena || null,
            year: props.year,
            month: currentMonth,
        })
    } catch (error) {
        yoyError.value = 'Sin comparativo YoY disponible.'
        yoySales.value = []
    } finally {
        yoyLoading.value = false
    }
}

function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') emit('close')
}

watch(
    () => [props.tienda.id_cliente, props.sku.sku_muliix, props.year, props.week],
    () => {
        loadYoySales()
    },
    { immediate: true }
)

onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
    document.body.style.overflow = 'hidden'
})

onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleKeydown)
    document.body.style.overflow = ''
})
</script>

<template>
    <div class="fixed inset-0 z-[1000] flex justify-end bg-slate-950/35 backdrop-blur-[2px]" @click.self="emit('close')">
        <aside class="h-full w-full max-w-[540px] overflow-y-auto bg-white shadow-2xl ring-1 ring-slate-200">
            <header class="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
                <div class="flex items-start justify-between gap-4">
                    <div class="min-w-0">
                        <h2 class="text-sm font-black leading-snug text-slate-950">
                            {{ sku.sku_nombre }}
                        </h2>
                        <div class="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-slate-500">
                            <span>{{ sku.sku_muliix || 'Sin SKU' }}</span>
                            <span class="text-slate-300">|</span>
                            <span>{{ tienda.nombre_tienda }}</span>
                            <span class="text-slate-300">|</span>
                            <span>{{ tienda.id_cliente }}</span>
                        </div>
                    </div>
                    <button
                        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        title="Cerrar"
                        @click="emit('close')"
                    >
                        <i class="fa-solid fa-xmark text-xs"></i>
                    </button>
                </div>
            </header>

            <div class="space-y-5 px-5 py-5">
                <section class="rounded-lg border border-slate-200 p-4">
                    <div class="mb-3 flex items-center justify-between gap-3">
                        <div>
                            <p class="text-[10px] font-black uppercase tracking-widest text-slate-500">Inventario vs objetivo</p>
                            <p class="mt-0.5 text-[11px] text-slate-400">Cobertura calculada con sellout promedio CPFR</p>
                        </div>
                        <span class="rounded-full border px-2 py-1 text-[10px] font-black uppercase" :class="coverageStatus.cls">
                            {{ coverageStatus.label }}
                        </span>
                    </div>
                    <div class="relative pt-5">
                        <div class="h-4 overflow-hidden rounded-full bg-slate-200">
                            <div
                                class="h-full rounded-full transition-all"
                                :class="inventoryWeeks != null && inventoryWeeks < targetWeeks ? 'bg-rose-500' : 'bg-emerald-500'"
                                :style="{ width: `${coveragePct}%` }"
                            ></div>
                        </div>
                        <div class="absolute top-2 h-8 w-px bg-slate-500/60" :style="{ left: '100%' }"></div>
                        <div class="mt-2 flex items-center justify-between text-[11px] font-bold">
                            <span class="text-slate-500">0</span>
                            <span class="text-rose-600">Actual: {{ inventoryWeeks != null ? n(inventoryWeeks, 1) : '-' }} sem</span>
                            <span class="text-slate-500">Obj: {{ n(targetWeeks, 1) }} sem</span>
                        </div>
                    </div>
                </section>

                <section>
                    <div class="mb-2 border-b border-slate-200 pb-1.5">
                        <h3 class="text-[11px] font-black uppercase tracking-widest text-slate-500">Comportamiento reciente</h3>
                    </div>
                    <div class="overflow-hidden rounded-lg border border-slate-200">
                        <table class="w-full text-[11px] leading-tight">
                            <thead class="bg-slate-100 text-[9px] uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th class="px-3 py-2 text-left font-black">Semana</th>
                                    <th class="px-3 py-2 text-right font-black">Peso (kg)</th>
                                    <th class="px-3 py-2 text-right font-black text-brand-700">Cant. (pz)</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                <tr v-for="row in selloutSeries" :key="row.week" class="transition-colors hover:bg-slate-50">
                                    <td class="px-3 py-2.5 font-black text-slate-800">Sem. {{ row.week }}</td>
                                    <td class="px-3 py-2.5 text-right font-mono text-slate-600">{{ n(row.kg, 1) }}</td>
                                    <td class="bg-brand-50/30 px-3 py-2.5 text-right font-black text-brand-700">{{ n(row.pz, 1) }}</td>
                                </tr>
                                <tr v-if="!selloutSeries.length">
                                    <td colspan="3" class="px-3 py-8 text-center">
                                        <i class="fa-solid fa-chart-line mb-2 block text-2xl text-slate-200"></i>
                                        <p class="font-bold text-slate-400">Sin datos historicos de sellout</p>
                                    </td>
                                </tr>
                            </tbody>
                            <tfoot v-if="selloutSeries.length">
                                <tr class="border-t-2 border-slate-200 bg-slate-50">
                                    <td class="px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-800">Promedio</td>
                                    <td class="px-3 py-2.5 text-right font-bold text-slate-800">{{ n(sku.promedio_sellout_kg, 1) }}</td>
                                    <td class="rounded-br-lg bg-brand-100/60 px-3 py-2.5 text-right font-black text-brand-700">{{ n(sku.promedio_sellout_pz, 1) }}</td>
                                </tr>
                            </tfoot>
                        </table>
                        <div class="border-t border-slate-100 px-3 py-2 text-[10px] font-semibold text-slate-400">
                            Ultimas {{ selloutSeries.length || 0 }} semanas disponibles en el calculo CPFR actual.
                        </div>
                    </div>
                </section>

                <section>
                    <div class="mb-2 border-b border-slate-200 pb-1.5">
                        <h3 class="text-[11px] font-black uppercase tracking-widest text-slate-500">Tendencia sellout y comparativo anual</h3>
                    </div>
                    <div class="rounded-lg border border-slate-200 p-4">
                        <p class="mb-3 text-[10px] font-semibold text-slate-400">
                            Sellout semanal reciente del response CPFR. Comparativo mensual contra el mismo mes del anio anterior.
                        </p>
                        <svg viewBox="0 0 360 150" class="h-[190px] w-full overflow-visible">
                            <line x1="0" y1="18" x2="360" y2="18" class="stroke-slate-100" />
                            <line x1="0" y1="65" x2="360" y2="65" class="stroke-slate-100" />
                            <line x1="0" y1="112" x2="360" y2="112" class="stroke-slate-100" />
                            <path v-if="chartPath" :d="chartPath" fill="none" class="stroke-brand-500" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                            <g v-for="(point, idx) in chartPoints" :key="idx">
                                <circle :cx="point.x" :cy="point.y" r="4" class="fill-slate-900" />
                                <text :x="point.x" :y="point.y - 9" text-anchor="middle" class="fill-slate-700 text-[10px] font-bold">{{ n(point.value, 0) }}</text>
                                <text :x="point.x" y="145" text-anchor="middle" class="fill-slate-400 text-[10px] font-bold">{{ selloutSeries[idx]?.label }}</text>
                            </g>
                        </svg>

                        <div class="mt-3 border-t border-slate-100 pt-4">
                            <div class="flex h-32 items-end justify-center gap-10 border-b border-slate-200">
                                <div v-for="bar in yoyBars" :key="bar.label" class="flex w-24 flex-col items-center justify-end">
                                    <span class="mb-2 text-[11px] font-black text-slate-800">{{ yoyLoading ? '...' : n(bar.value, 0) }}</span>
                                    <div class="w-12 rounded-t-sm" :class="bar.cls" :style="{ height: `${bar.height}px` }"></div>
                                </div>
                            </div>
                            <div class="mt-2 flex justify-center gap-4 text-center">
                                <span v-for="bar in yoyBars" :key="`label-${bar.label}`" class="w-24 text-[10px] font-bold text-slate-500">{{ bar.label }}</span>
                            </div>
                            <div class="mt-3 flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                                <span class="text-[10px] font-bold text-slate-500">YoY = diferencia contra el mismo mes del anio anterior</span>
                                <span class="text-xs font-black" :class="(yoyDeltaPct || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'">
                                    {{ yoyLoading ? '...' : (yoyDeltaPct != null ? `${yoyDeltaPct.toFixed(1)}%` : '-') }}
                                </span>
                            </div>
                        </div>
                        <p v-if="yoyError" class="mt-2 text-[10px] font-bold text-amber-600">{{ yoyError }}</p>
                    </div>
                </section>

                <section>
                    <div class="mb-2 border-b border-slate-200 pb-1.5">
                        <h3 class="text-[11px] font-black uppercase tracking-widest text-slate-500">Proyeccion actual</h3>
                    </div>
                    <div class="rounded-lg border border-slate-200 px-4 pb-4 pt-5">
                        <div class="flex h-36 items-end justify-center gap-12 border-b border-slate-200">
                            <div v-for="bar in projectionBars" :key="bar.label" class="flex w-20 flex-col items-center justify-end">
                                <span class="mb-2 text-xs font-black text-slate-800">{{ n(bar.value, 0) }}</span>
                                <div class="w-12 rounded-t-sm" :class="bar.cls" :style="{ height: `${bar.height}px` }"></div>
                            </div>
                        </div>
                        <div class="mt-2 flex justify-center gap-7 text-center">
                            <span v-for="bar in projectionBars" :key="`label-${bar.label}`" class="w-24 text-[10px] font-bold text-slate-500">{{ bar.label }}</span>
                        </div>
                    </div>
                </section>

                <section class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <h3 class="mb-2 text-[11px] font-black uppercase tracking-widest text-slate-500">Lectura operativa</h3>
                    <ul class="space-y-1.5 text-[11px] font-semibold text-slate-600">
                        <li v-for="item in insightItems" :key="item" class="flex gap-2">
                            <i class="fa-solid fa-circle-info mt-0.5 text-[10px] text-brand-500"></i>
                            <span>{{ item }}</span>
                        </li>
                    </ul>
                </section>
            </div>
        </aside>
    </div>
</template>
