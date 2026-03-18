<script setup lang="ts">
// src/modules/SellOut/components/SellOutKpiCards.vue
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSellOutStore } from '../stores/selloutStore'

const store = useSellOutStore()
const { kpis, isLoadingDashboard } = storeToRefs(store)

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(v)

const fmtKg = (v: number) =>
  new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 }).format(v) + ' kg'

const fmtPct = (v: number) =>
  (v >= 0 ? '+' : '') + v.toFixed(1) + '%'

const fmtInt = (v: number) =>
  new Intl.NumberFormat('es-MX').format(v)

// ─── Cards config ─────────────────────────────────────────────────────────────

interface KpiCard {
  label: string
  value: string
  subvalue?: string
  subvaluePositive?: boolean
  icon: string
  iconColor: string
  iconBg: string
  hint?: string
}

const cards = computed<KpiCard[]>(() => {
  if (!kpis.value) return []
  const k = kpis.value

  return [
    {
      label: 'Sell Out $$',
      value: fmtCurrency(k.ventaMoney),
      subvalue: fmtPct(k.vsWeekMoney),
      subvaluePositive: k.vsWeekMoney >= 0,
      icon: 'fa-solid fa-sack-dollar',
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      hint: 'vs semana anterior',
    },
    {
      label: 'Sell Out (KG)',
      value: fmtKg(k.ventaKg),
      subvalue: fmtPct(k.vsWeekKg),
      subvaluePositive: k.vsWeekKg >= 0,
      icon: 'fa-solid fa-weight-hanging',
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      hint: 'vs semana anterior',
    },
    {
      label: 'Inventario (KG)',
      value: fmtKg(k.inventarioKg),
      icon: 'fa-solid fa-boxes-stacked',
      iconColor: 'text-violet-600',
      iconBg: 'bg-violet-50',
      hint: 'KG en sistema · fuente: basev52PicSO',
    },
    {
      label: 'Tiendas con venta',
      value: fmtInt(k.tiendasActivas),
      icon: 'fa-solid fa-store',
      iconColor: 'text-sky-600',
      iconBg: 'bg-sky-50',
      hint: 'vtaOut > 0 · fuente: basev52PicSO',
    },
    {
      label: 'Tiendas callbook',
      value: fmtInt((k as any).tiendasCapturadas ?? 0),
      icon: 'fa-solid fa-clipboard-list',
      iconColor: 'text-teal-600',
      iconBg: 'bg-teal-50',
      hint: 'Con captura de PZ · fuente: CALLBOOKIC',
    },
    {
      label: 'Cobertura',
      value: k.coberturaPct.toFixed(1) + '%',
      icon: 'fa-solid fa-chart-pie',
      iconColor: k.coberturaPct >= 80 ? 'text-emerald-600' : k.coberturaPct >= 60 ? 'text-amber-600' : 'text-rose-600',
      iconBg: k.coberturaPct >= 80 ? 'bg-emerald-50' : k.coberturaPct >= 60 ? 'bg-amber-50' : 'bg-rose-50',
      hint: 'Piezas capturadas en callbook',
    },
    {
      label: 'Quiebres',
      value: fmtInt(k.quiebres),
      icon: 'fa-solid fa-triangle-exclamation',
      iconColor: k.quiebres === 0 ? 'text-slate-400' : 'text-rose-600',
      iconBg: k.quiebres === 0 ? 'bg-slate-50' : 'bg-rose-50',
      hint: 'Sin piezas en callbook esa semana',
    },
    {
      label: 'Ticket promedio',
      value: fmtCurrency(k.ticketPromedio),
      icon: 'fa-solid fa-receipt',
      iconColor: 'text-orange-600',
      iconBg: 'bg-orange-50',
      hint: 'MXN por transacción vtaOut',
    },
  ]
})
</script>

<template>
  <!-- ── Skeleton ─────────────────────────────────────────────────────────── -->
  <div
    v-if="isLoadingDashboard"
    class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-3"
  >
    <div
      v-for="i in 7"
      :key="i"
      class="bg-white rounded-xl border border-slate-200 p-4 h-24 animate-pulse"
    >
      <div class="flex items-center gap-2 mb-3">
        <div class="w-7 h-7 rounded-lg bg-slate-100" />
        <div class="h-2.5 bg-slate-100 rounded w-2/3" />
      </div>
      <div class="h-5 bg-slate-100 rounded w-1/2" />
    </div>
  </div>

  <!-- ── Cards ────────────────────────────────────────────────────────────── -->
  <div
    v-else-if="cards.length"
    class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-3"
  >
    <div
      v-for="card in cards"
      :key="card.label"
      class="group bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200"
    >
      <!-- Header: icono + label -->
      <div class="flex items-center gap-2 mb-2.5">
        <div
          class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
          :class="card.iconBg"
        >
          <i :class="[card.icon, 'text-xs', card.iconColor]" />
        </div>
        <span class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-tight">
          {{ card.label }}
        </span>
      </div>

      <!-- Valor principal -->
      <p class="text-base font-bold text-slate-800 tabular-nums truncate">
        {{ card.value }}
      </p>

      <!-- Variación vs semana anterior -->
      <div v-if="card.subvalue" class="flex items-center gap-1 mt-1">
        <i
          class="text-[10px]"
          :class="card.subvaluePositive
            ? 'fa-solid fa-arrow-trend-up text-emerald-500'
            : 'fa-solid fa-arrow-trend-down text-rose-500'"
        />
        <span
          class="text-xs font-semibold tabular-nums"
          :class="card.subvaluePositive ? 'text-emerald-600' : 'text-rose-600'"
        >
          {{ card.subvalue }}
        </span>
        <span class="text-[10px] text-slate-400 truncate">{{ card.hint }}</span>
      </div>

      <!-- Hint sin variación -->
      <p v-else-if="card.hint" class="text-[10px] text-slate-400 mt-1 truncate">
        {{ card.hint }}
      </p>
    </div>
  </div>

  <!-- ── Empty state ───────────────────────────────────────────────────────── -->
  <div
    v-else
    class="flex items-center justify-center h-24 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm gap-2"
  >
    <i class="fa-solid fa-chart-bar" />
    <span>Selecciona un período para ver los indicadores</span>
  </div>
</template>